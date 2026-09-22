import "leaflet/dist/leaflet.css";
import "./styles.css";
import L from "leaflet";
import Chart from "chart.js/auto";
import parksSocal from "./data/parks.json";
import parksUs from "./data/us-parks.json";
import parksMarket from "./data/us-market.json";
import { US_CENTER } from "./lib/geo.js";
import { materialize } from "./lib/facts.js";
import { crossHtml, crossBrief, crossFilterMarkup, emptyCross, readCross, passesPlace } from "./lib/cross.js";
import { trustClause } from "./lib/format.js";
import {
  enrichPark,
  compareParks,
  rankValue,
  effectiveMonthly,
  seasonalFit,
  seasonalValue,
} from "./lib/nationwide-score.js";
import {
  hydratePark,
  REGIONS,
  SEASON_GUIDES,
  SEASONS,
  regionColor,
  seasonLabel,
} from "./lib/seasons.js";

const root = document.querySelector("#lookup-nationwide");
const q = (sel) => root.querySelector(sel);
const qa = (sel) => root.querySelectorAll(sel);


const parks = [...parksSocal.map((park) => materialize(park)), ...parksUs, ...parksMarket].map(hydratePark).map(enrichPark);

const state = {
  mode: "classC",
  selectedId: null,
  sortKey: "rank",
  sortDir: "desc",
  filters: {
    season: "",
    region: "",
    state: "",
    city: "",
    seasonFit: "hide",
    yearRound: "",
    skipHazard: "",
    maxMonthly: "",
    monthly: "",
    hookups: "",
    extraVehicle: "",
    minQuality: "",
    age: "",
    minValue: "",
    maxAirport: "",
  },
  cross: emptyCross(),
};

const els = {
  shortlist: q("#shortlist"),
  filters: q("#filters"),
  reset: q("#reset-filters"),
  table: q("#table"),
  tbody: q("#table tbody"),
  empty: q("#empty"),
  count: q("#result-count"),
  heading: q("#table-heading"),
  drawer: q("#drawer"),
  drawerBody: q("#drawer-body"),
  drawerClose: q("#drawer-close"),
  legend: q("#map-legend"),
  scatter: q("#scatter"),
  seasonCards: q("#season-cards"),
  correlates: q("#season-correlates"),
};

let map;
let markerLayer;
let chart;
const markersById = new Map();

function money(n) {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function stayCap(park) {
  if (park.maxStayNights == null) return "Month-to-month";
  if (park.maxStayWindowDays) return `${park.maxStayNights} / ${park.maxStayWindowDays}d`;
  return `${park.maxStayNights} nights`;
}

function rankColor(score) {
  if (score >= 7.4) return "#8faf78";
  if (score >= 6.2) return "#d7b07a";
  if (score >= 5) return "#d07152";
  return "#8a7a72";
}

function isClosed(park) {
  return (park.watchOuts || []).some((w) => w.toUpperCase().includes("CLOSED"));
}

function seasonNow() {
  return state.filters.season || "";
}

function valueNow(park) {
  return seasonalValue(park, seasonNow());
}

function visibleParks() {
  const f = state.filters;
  const season = f.season;
  return parks.filter((p) => {
    if (f.region && p.region !== f.region) return false;
    if (f.state && p.state !== f.state) return false;
    if (f.city && p.city !== f.city) return false;
    if (f.maxMonthly && (p.effectiveMonthly == null || p.effectiveMonthly > Number(f.maxMonthly))) return false;
    if (f.monthly === "yes" && p.monthlyFrom == null) return false;
    if (f.monthly === "no" && p.monthlyFrom != null) return false;
    if (f.hookups === "yes" && !p.hookups.fullHookups) return false;
    if (f.extraVehicle && p.extraVehicle !== f.extraVehicle) return false;
    if (f.minQuality && p.qualityScore < Number(f.minQuality)) return false;
    if (f.age === "all-ages" && p.ageRestriction === "55+") return false;
    if (f.yearRound === "yes" && !p.yearRound) return false;
    if (f.skipHazard && (p.hazards || []).includes(f.skipHazard)) return false;
    if (f.maxAirport && (p.driveMinutesToAirport == null || p.driveMinutesToAirport > Number(f.maxAirport))) {
      return false;
    }
    if (f.minValue) {
      const v = valueNow(p);
      if (v == null || v < Number(f.minValue)) return false;
    }
    if (season && f.seasonFit === "hide" && (p.avoidSeasons || []).includes(season)) return false;
    if (!passesPlace(p.lat, p.lng, state.cross)) return false;
    return true;
  });
}

function rankedParks() {
  return visibleParks()
    .slice()
    .sort((a, b) => compareParks(a, b, state.mode, state.sortKey, state.sortDir, seasonNow()));
}

function parkById(id) {
  return parks.find((p) => p.id === id);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, options, blankLabel) {
  const current = select.value;
  select.innerHTML = `<option value="">${blankLabel}</option>${options
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("")}`;
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

function populateFilterOptions() {
  const regionSel = els.filters.elements.region;
  const stateSel = els.filters.elements.state;
  const citySel = els.filters.elements.city;
  const regionId = els.filters.elements.region.value;
  const stateId = els.filters.elements.state.value;

  const regionOpts = Object.values(REGIONS)
    .filter((r) => parks.some((p) => p.region === r.id))
    .map((r) => [r.id, r.label]);
  fillSelect(regionSel, regionOpts, "All regions");

  let statePool = parks;
  if (regionId) statePool = statePool.filter((p) => p.region === regionId);
  const stateOpts = uniqueSorted(statePool.map((p) => p.state)).map((s) => {
    const name = parks.find((p) => p.state === s)?.stateName ?? s;
    return [s, `${s} · ${name}`];
  });
  fillSelect(stateSel, stateOpts, "All states");

  let cityPool = parks;
  if (regionId) cityPool = cityPool.filter((p) => p.region === regionId);
  if (stateId) cityPool = cityPool.filter((p) => p.state === stateId);
  const cityOpts = uniqueSorted(cityPool.map((p) => p.city)).map((c) => [c, c]);
  fillSelect(citySel, cityOpts, "All cities");
}

function shortlistParks() {
  const list = rankedParks().filter((p) => !isClosed(p));
  const longTerm = list.filter((p) => p.maxStayNights == null || p.maxStayNights >= 90);
  const published = longTerm.filter((p) => p.monthlyFrom != null);
  const bang = [...published].sort((a, b) => (valueNow(b) ?? -1) - (valueNow(a) ?? -1))[0];
  const yearRound = [...longTerm.filter((p) => p.yearRound)].sort((a, b) => {
    const score = (p) => (p.bestSeasons?.length ?? 0) + (p.region === "socal" ? 2 : 0) + p.qualityScore / 10;
    return score(b) - score(a);
  })[0];
  const under800 = [...published.filter((p) => p.effectiveMonthly <= 800)].sort(
    (a, b) => b.qualityScore - a.qualityScore,
  )[0];
  const classC = [...longTerm].sort((a, b) => b.fitClassCScore - a.fitClassCScore || rankValue(b, "classC", seasonNow()) - rankValue(a, "classC", seasonNow()))[0];
  const trailer = [...longTerm]
    .filter((p) => p.leaveTrailerUnattended !== "risky")
    .sort((a, b) => rankValue(b, "trailer", seasonNow()) - rankValue(a, "trailer", seasonNow()))[0];
  const seasonName = SEASONS.find((s) => s.id === seasonNow())?.label ?? "any season";
  return [
    {
      kicker: "Best bang for buck",
      park: bang,
      why: bang ? `${bang.state} · value ${valueNow(bang)?.toFixed(1)} · ${money(bang.effectiveMonthly)}` : "None in view",
    },
    {
      kicker: "Year-round weather",
      park: yearRound,
      why: yearRound ? `${yearRound.city}, ${yearRound.state} · ${yearRound.regionLabel}` : "None in view",
    },
    {
      kicker: `Best this ${seasonName}`,
      park: list[0],
      why: list[0] ? `${list[0].city}, ${list[0].state} · rank ${rankValue(list[0], state.mode, seasonNow()).toFixed(1)}` : "None",
    },
    {
      kicker: "Quality under $800",
      park: under800,
      why: under800 ? `Quality ${under800.qualityScore.toFixed(1)} · ${money(under800.effectiveMonthly)}` : "None published",
    },
    {
      kicker: state.mode === "trailer" ? "Best trailer drop" : "Best Class C long-term",
      park: state.mode === "trailer" ? trailer : classC,
      why: (state.mode === "trailer" ? trailer : classC)
        ? stayCap(state.mode === "trailer" ? trailer : classC)
        : "None",
    },
  ];
}

function renderShortlist() {
  els.shortlist.innerHTML = shortlistParks()
    .map((item) => {
      if (!item.park) {
        return `<article class="pick" tabindex="0"><div class="kicker">${item.kicker}</div><strong>None in dataset</strong><div class="why">${item.why}</div></article>`;
      }
      return `<button type="button" class="pick" data-id="${item.park.id}">
        <div class="kicker">${item.kicker}</div>
        <strong>${item.park.name}</strong>
        <div class="why">${item.why}</div>
      </button>`;
    })
    .join("");
}

function renderSeasonBoard() {
  const active = seasonNow();
  els.seasonCards.innerHTML = SEASON_GUIDES.map((g) => {
    const on = active === g.id;
    return `<button type="button" class="season-card ${on ? "is-active" : ""}" data-season="${g.id}">
      <div class="kicker">${SEASONS.find((s) => s.id === g.id)?.months}</div>
      <h3>${g.headline}</h3>
      <p><strong>Go</strong> ${g.go}</p>
      <p><strong>Skip</strong> ${g.skip}</p>
      <p class="why">${g.why}</p>
    </button>`;
  }).join("");

  if (!active) {
    els.correlates.textContent =
      "States that move together: AZ + southern NV + NM + Coachella in winter. OR + WA + Rockies + Great Lakes + New England in summer. FL + Gulf + South Texas in the snowbird window. SoCal coast is the year-round exception.";
    return;
  }
  const regions = Object.values(REGIONS).filter((r) => r.bestSeasons.includes(active));
  const skip = Object.values(REGIONS).filter((r) => r.avoidSeasons.includes(active));
  const states = uniqueSorted(regions.flatMap((r) => r.states));
  const skipStates = uniqueSorted(skip.flatMap((r) => r.states)).filter((s) => !states.includes(s));
  els.correlates.textContent = `${SEASONS.find((s) => s.id === active).label} cluster: ${states.join(", ")}. Usually skip: ${skipStates.join(", ") || "—"}.`;
}

function renderTable() {
  const list = rankedParks();
  const sortName = state.sortKey === "rank" ? "composite rank" : state.sortKey === "value" ? "bang for buck" : state.sortKey;
  const nStates = [...new Set(list.map((p) => p.state))].length;
  els.count.textContent = `${list.length} park${list.length === 1 ? "" : "s"} · ${nStates} state${nStates === 1 ? "" : "s"} · sorted by ${sortName}`;
  els.heading.textContent = state.mode === "trailer" ? "Comparison · Trailer + Tesla" : "Comparison · Class C";
  els.empty.hidden = list.length > 0;
  els.table.hidden = list.length === 0;

  qa(".grid th").forEach((th) => {
    const key = th.dataset.sort;
    th.setAttribute("aria-sort", key === state.sortKey ? (state.sortDir === "asc" ? "ascending" : "descending") : "none");
  });

  const ranks = new Map(
    [...list]
      .sort((a, b) => compareParks(a, b, state.mode, "rank", "desc", seasonNow()))
      .map((p, i) => [p.id, i + 1]),
  );
  els.tbody.innerHTML = list
    .map((p) => {
      const rank = ranks.get(p.id);
      const monthly =
        p.monthlyFrom != null
          ? money(p.monthlyFrom)
          : p.effectiveMonthly != null
            ? `<span class="est">${money(p.effectiveMonthly)} est.</span>`
            : "—";
      const fit = seasonalFit(p, seasonNow());
      const fitWord = fit >= 8.5 ? "in season" : fit <= 3.5 ? "off season" : "shoulder";
      return `<tr data-id="${p.id}" class="${p.id === state.selectedId ? "is-selected" : ""}">
        <td>${rank}</td>
        <td><div class="park-cell"><strong>${p.name}</strong><small>${p.regionLabel}${isClosed(p) ? " · closed" : ""}${p.ageRestriction === "55+" ? " · 55+" : ""}</small><small>${crossBrief(p.lat, p.lng, { hubId: state.cross.hub, lax: state.cross.lax })}</small></div></td>
        <td>${p.state}</td>
        <td>${p.city}</td>
        <td>${p.nearestAirport ? `${p.nearestAirport}${p.driveMinutesToAirport != null ? ` · ${p.driveMinutesToAirport}m` : ""}` : "—"}</td>
        <td>${monthly}</td>
        <td>${stayCap(p)}</td>
        <td>${p.qualityScore.toFixed(1)}</td>
        <td>${valueNow(p) == null ? "—" : valueNow(p).toFixed(1)}</td>
        <td><span class="fit ${fit >= 8.5 ? "excellent" : fit <= 3.5 ? "poor" : "fair"}">${fitWord}</span></td>
        <td><span class="fit ${p.fitClassC}">${p.fitClassC}</span></td>
        <td><span class="fit ${p.fitTrailerTesla}">${p.fitTrailerTesla}</span></td>
      </tr>`;
    })
    .join("");
}

function popupHtml(park) {
  const score = rankValue(park, state.mode, seasonNow());
  return `<strong>${park.name}</strong><br>${park.city}, ${park.state}<br>Rank ${score.toFixed(1)} · ${money(park.effectiveMonthly)}${park.monthlyEstimated ? " est." : ""}`;
}

function initMap() {
  const mapEl = q("#map");
  if (mapEl._leaflet_id) {
    mapEl._leaflet_id = null;
    mapEl.innerHTML = "";
  }
  map = L.map(mapEl, { scrollWheelZoom: true, zoomControl: true }).setView([US_CENTER.lat, US_CENTER.lng], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 19,
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  els.legend.innerHTML = `
    <li><i style="background:#8faf78"></i>Strong composite</li>
    <li><i style="background:#d7b07a"></i>Mid pack</li>
    <li><i style="background:#d07152"></i>Weak for this season / mode</li>
  `;
  const ro = new ResizeObserver(() => map.invalidateSize());
  ro.observe(mapEl);
  renderMarkers();
}

function renderMarkers() {
  markerLayer.clearLayers();
  markersById.clear();
  const list = rankedParks();
  list.forEach((park, i) => {
    const score = rankValue(park, state.mode, seasonNow());
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin" style="background:${rankColor(score)}"><span>${i + 1}</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [8, 26],
      popupAnchor: [6, -24],
    });
    const marker = L.marker([park.lat, park.lng], { icon, title: park.name }).addTo(markerLayer);
    marker.bindPopup(popupHtml(park));
    marker.on("click", () => selectPark(park.id, { fromMap: true }));
    markersById.set(park.id, marker);
  });
  if (list.length) {
    const bounds = L.latLngBounds(list.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: list.length === 1 ? 8 : 6 });
  } else {
    map.setView([US_CENTER.lat, US_CENTER.lng], 4);
  }
}

function renderChart() {
  const list = rankedParks();
  const points = list.filter((p) => p.effectiveMonthly != null);
  const data = {
    datasets: [
      {
        label: "Parks",
        data: points.map((p) => ({
          x: p.effectiveMonthly,
          y: p.qualityScore,
          r: Math.max(5, Math.min(18, Math.sqrt(p.reviewCountGoogle || 40) / 2.2)),
          id: p.id,
          name: p.name,
        })),
        backgroundColor: points.map((p) => regionColor(p.region)),
        borderColor: points.map((p) => (p.id === state.selectedId ? "#f4ece0" : "transparent")),
        borderWidth: 2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) {
            const p = points[ctx.dataIndex];
            const est = p.monthlyEstimated ? " (est.)" : "";
            return `${p.name} (${p.city}, ${p.state}): ${money(p.effectiveMonthly)}${est}, quality ${p.qualityScore}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Effective monthly ($)", color: "#b7aa98" },
        ticks: { color: "#b7aa98", callback: (v) => `$${v}` },
        grid: { color: "rgba(244,236,224,0.08)" },
      },
      y: {
        min: 3,
        max: 10,
        title: { display: true, text: "Quality", color: "#b7aa98" },
        ticks: { color: "#b7aa98" },
        grid: { color: "rgba(244,236,224,0.08)" },
      },
    },
    onClick: (_e, elsClick) => {
      if (!elsClick.length) return;
      const p = points[elsClick[0].index];
      selectPark(p.id, { fromChart: true });
    },
  };
  if (chart) {
    chart.data = data;
    chart.options = options;
    chart.update();
    return;
  }
  chart = new Chart(els.scatter, { type: "bubble", data, options });
}

function hookupLine(h) {
  if (h.fullHookups) return "Full hookups (W/S/E)";
  const bits = [];
  if (h.water) bits.push("water");
  if (h.sewer) bits.push("sewer");
  if (h.amp50) bits.push("50A");
  else if (h.amp30) bits.push("30A");
  return bits.length ? bits.join(" · ") : "Dry / none";
}

function placeLine(park) {
  const addr = park.address || "";
  if (!addr || addr === park.city) return `${park.city}, ${park.state}`;
  if (/\b[A-Z]{2}\b/.test(addr) && addr.includes(park.city)) return addr;
  return `${addr}, ${park.city}, ${park.state}`;
}

function drawerHtml(park) {
  const monthly = effectiveMonthly(park);
  const extra = park.extraVehicleFee ? `<p>${park.extraVehicleFee}</p>` : "";
  const sources = (park.sources || [])
    .map((s) => `<li><a href="${s}" target="_blank" rel="noreferrer">${s.replace(/^https?:\/\//, "")}</a></li>`)
    .join("");
  const drive =
    park.driveMilesToSantaMonica != null
      ? `<span class="chip">${park.driveMilesToSantaMonica} mi to Santa Monica · ${park.driveMinutesOffPeak}/${park.driveMinutesPeak} min</span>`
      : "";
  const correlates = (REGIONS[park.region]?.correlates || [])
    .map((id) => REGIONS[id]?.label)
    .filter(Boolean)
    .join(" · ");
  return `
    <p class="eyebrow">${park.operator} · ${park.stateName}${trustClause(park.confidence) ? ` · ${trustClause(park.confidence)}` : ""}</p>
    <h2 id="drawer-title">${park.name}</h2>
    <p>${placeLine(park)}</p>
    ${crossHtml(park.lat, park.lng, { hubId: state.cross.hub, lax: state.cross.lax })}
    <div class="meta-row">
      <span class="chip">${park.regionLabel}</span>
      <span class="chip">${hookupLine(park.hookups)}</span>
      <span class="chip">Extra vehicle: ${park.extraVehicle}</span>
      <span class="chip">Unhitch: ${park.unhitchFriendly}</span>
      <span class="chip">Trailer unattended: ${park.leaveTrailerUnattended}</span>
      ${park.ageRestriction === "55+" ? `<span class="chip">55+</span>` : ""}
      ${park.yearRound ? `<span class="chip">Year-round weather</span>` : ""}
      ${park.nearestAirport ? `<span class="chip">${park.nearestAirport}${park.driveMinutesToAirport != null ? ` · ${park.driveMinutesToAirport} min` : ""}</span>` : ""}
      ${drive}
    </div>
    <div class="stat-row">
      <div class="stat"><span>Quality</span><strong>${park.qualityScore.toFixed(1)}</strong></div>
      <div class="stat"><span>Class C rank</span><strong>${rankValue(park, "classC", seasonNow()).toFixed(1)}</strong></div>
      <div class="stat"><span>Trailer rank</span><strong>${rankValue(park, "trailer", seasonNow()).toFixed(1)}</strong></div>
      <div class="stat"><span>Value now</span><strong>${valueNow(park) == null ? "—" : valueNow(park).toFixed(1)}</strong></div>
    </div>
    <div class="stat-row">
      <div class="stat"><span>Nightly</span><strong>${money(park.nightlyFrom)}${park.nightlyTo && park.nightlyTo !== park.nightlyFrom ? `–${money(park.nightlyTo)}` : ""}</strong></div>
      <div class="stat"><span>Monthly</span><strong>${park.monthlyFrom != null ? money(park.monthlyFrom) : monthly.value != null ? money(monthly.value) + " est." : "—"}</strong></div>
      <div class="stat"><span>Stay cap</span><strong>${stayCap(park)}</strong></div>
      <div class="stat"><span>Max length</span><strong>${park.maxRvLengthFt ? park.maxRvLengthFt + " ft" : "—"}</strong></div>
    </div>
    <h3>Climate</h3>
    <p>${park.climateNote}</p>
    <p>Best: ${seasonLabel(park.bestSeasons)} · Avoid: ${seasonLabel(park.avoidSeasons) || "none listed"} · Hazards: ${(park.hazards || []).join(", ") || "—"}</p>
    ${correlates ? `<p>States/regions that pair with this: ${correlates}</p>` : ""}
    <p>${park.electricExtra}</p>
    <p>${park.taxesFeesNote}</p>
    ${extra}
    <h3>Best for</h3>
    <ul class="best">${park.bestFor.map((x) => `<li>${x}</li>`).join("")}</ul>
    <h3>Watch outs</h3>
    <ul class="watch">${park.watchOuts.map((x) => `<li>${x}</li>`).join("")}</ul>
    <h3>Amenities</h3>
    <div class="tag-row">${park.amenities.map((a) => `<span class="chip">${a}</span>`).join("")}</div>
    <p>Wifi ${park.wifi} · Pets ${park.pets} · Beach ${park.beachAccess} · Noise: ${(park.noise || []).join(", ") || "—"}</p>
    <p>Security: ${(park.security || []).join(", ") || "—"}</p>
    <p>Google ${park.reviewGoogle ?? "—"} (${park.reviewCountGoogle ?? 0} reviews)${park.reviewCampendium ? ` · Campendium ${park.reviewCampendium}` : ""}</p>
    <p>${park.phone ? `<a href="tel:${park.phone}">${park.phone}</a>` : ""} ${park.website ? `· <a href="${park.website}" target="_blank" rel="noreferrer">Official site</a>` : ""}</p>
    <h3>Sources</h3>
    <ul>${sources}</ul>
    <p class="why">Last verified ${park.lastVerified}. Fit: Class C <span class="fit ${park.fitClassC}">${park.fitClassC}</span> · Trailer <span class="fit ${park.fitTrailerTesla}">${park.fitTrailerTesla}</span></p>
  `;
}

function openDrawer(park) {
  els.drawerBody.innerHTML = drawerHtml(park);
  els.drawer.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  els.drawer.hidden = true;
  document.body.style.overflow = "";
}

function selectPark(id, opts = {}) {
  const park = parkById(id);
  if (!park) return;
  state.selectedId = id;
  renderTable();
  renderChart();
  openDrawer(park);
  const marker = markersById.get(id);
  if (marker) {
    marker.openPopup();
    if (!opts.fromMap) {
      map.flyTo([park.lat, park.lng], Math.max(map.getZoom(), 7), { duration: 0.6 });
    }
  }
}

function readFiltersFromForm() {
  const data = new FormData(els.filters);
  for (const key of Object.keys(state.filters)) {
    state.filters[key] = data.get(key) || "";
  }
  readCross(els.filters, state.cross);
}

function renderAll() {
  renderSeasonBoard();
  renderShortlist();
  renderTable();
  renderMarkers();
  renderChart();
  if (map) setTimeout(() => map.invalidateSize(), 50);
}

function setSeason(id) {
  els.filters.elements.season.value = id;
  if (id) els.filters.elements.seasonFit.value = "hide";
  readFiltersFromForm();
  renderAll();
}

function bind() {
  qa(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.mode = btn.dataset.mode;
      qa(".mode-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      if (state.sortKey !== "value") {
        state.sortKey = "rank";
        state.sortDir = "desc";
      }
      renderAll();
      document.dispatchEvent(new CustomEvent("rv-rig-set", { detail: state.mode }));
    });
  });

  qa(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.sortKey = btn.dataset.sortMode;
      state.sortDir = "desc";
      qa(".sort-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderAll();
    });
  });

  els.seasonCards.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-season]");
    if (!btn) return;
    const id = btn.dataset.season;
    setSeason(state.filters.season === id ? "" : id);
  });

  els.filters.addEventListener("change", (e) => {
    if (e.target.name === "region") {
      els.filters.elements.state.value = "";
      els.filters.elements.city.value = "";
    }
    if (e.target.name === "state") {
      els.filters.elements.city.value = "";
    }
    populateFilterOptions();
    readFiltersFromForm();
    if (e.target.name === "season") {
      qa(".sort-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.sortMode === state.sortKey));
    }
    renderAll();
  });

  els.reset.addEventListener("click", () => {
    els.filters.reset();
    els.filters.elements.seasonFit.value = "hide";
    populateFilterOptions();
    readFiltersFromForm();
    state.sortKey = "rank";
    state.sortDir = "desc";
    qa(".sort-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.sortMode === "rank"));
    renderAll();
  });

  els.table.querySelector("thead").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort]");
    if (!th) return;
    const key = th.dataset.sort;
    if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    else {
      state.sortKey = key;
      state.sortDir = key === "name" || key === "state" || key === "city" || key === "airport" ? "asc" : "desc";
    }
    qa(".sort-btn").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.sortMode === state.sortKey),
    );
    renderTable();
  });

  els.tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr) selectPark(tr.dataset.id);
  });

  els.shortlist.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-id]");
    if (btn) selectPark(btn.dataset.id);
  });

  els.drawerClose.addEventListener("click", closeDrawer);
  els.drawer.addEventListener("click", (e) => {
    if (e.target === els.drawer) closeDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
  document.addEventListener("rv-rig", (event) => {
    if (event.detail !== "classC" && event.detail !== "trailer") return;
    if (state.mode === event.detail) return;
    state.mode = event.detail;
    qa(".mode-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === state.mode));
    renderAll();
  });
  document.addEventListener("rv-show", (event) => {
    if (event.detail !== "nationwide") return;
    if (map) setTimeout(() => map.invalidateSize(), 60);
  });
}

function mountCrossFilters() {
  if (els.filters.querySelector("[data-cross=hub]")) return;
  els.filters.insertAdjacentHTML("beforeend", crossFilterMarkup({ includeLand: true }));
}

try {
  state.mode = localStorage.getItem("rv-rig") === "trailer" ? "trailer" : "classC";
  qa(".mode-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === state.mode));
  mountCrossFilters();
  populateFilterOptions();
  els.filters.elements.seasonFit.value = "hide";
  readFiltersFromForm();
  initMap();
  window.addEventListener("resize", () => {
    if (map) map.invalidateSize();
  });
  bind();
  renderAll();
} catch (err) {
  console.error(err);
  q(".lede").textContent = `App failed to start: ${err.message}`;
}
