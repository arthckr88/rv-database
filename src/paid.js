import L from "leaflet";
import Chart from "chart.js/auto";
import parksRaw from "./data/parks.json";
import { MILES_TO_METERS, RING_COLORS, RING_ORDER, RINGS, ringLabel } from "./lib/geo.js";
import { addDarkBasemap } from "./lib/basemap.js";
import { esc, money, monthlyLabel, stayLabel, parkBadges, PIER } from "./lib/format.js";
import { oldestVerified, verifyMarks } from "./lib/facts.js";
import {
  enrichPark,
  compareParks,
  rankValue,
  fitValue,
  isLongTerm,
  isBeachShortStay,
  rateBundle,
  QUALITY_WEIGHTS,
} from "./lib/scoring.js";

const parks = parksRaw.map(enrichPark);

const state = {
  rig: "classC",
  rateMode: "blended",
  sortKey: "rank",
  sortDir: "desc",
  selectedId: null,
  filters: {
    q: "",
    ring: "",
    longTerm: false,
    maxMonthly: "",
    monthly: "",
    hookups: "",
  },
};

let map;
let markerLayer;
let chart;
const markers = new Map();

function rateOf(park) {
  return rateBundle(park, state.rateMode);
}

function rigForKicker(kicker) {
  if (kicker.startsWith("Best Trailer")) return "trailer";
  if (kicker.startsWith("Best Class C")) return "classC";
  return state.rig;
}

function fitWord(park, rig = state.rig) {
  return rig === "trailer" ? park.fitTrailerTesla : park.fitClassC;
}

function rigName(rig) {
  return rig === "trailer" ? "Trailer + Tesla" : "Class C";
}

function monthlyHint(park) {
  const rate = rateOf(park);
  if (rate.value == null) return "unpublished";
  if (rate.estimated) return "nightly × 30";
  if (state.rateMode === "winter" && !park.hasSeasonSplit) {
    return rate.kind === "range" ? `midpoint ${money(rate.value)} · no separate winter rate` : "published · no separate winter rate";
  }
  if (rate.kind === "blended") return `blend ${money(rate.value)}`;
  if (rate.kind === "winter") return `winter mid ${money(rate.value)}`;
  if (rate.kind === "range") return `midpoint ${money(rate.value)}`;
  return "published";
}

function rankUsedLabel(rate, park) {
  if (rate.value == null) return "No monthly on the record";
  if (rate.estimated) return `${money(rate.value)} · nightly × 30`;
  if (rate.kind === "blended") return `${money(rate.value)} · year-round blend`;
  if (rate.kind === "winter") return `${money(rate.value)} · winter midpoint`;
  if (rate.kind === "range") return `${money(rate.value)} · midpoint of the published range`;
  if (state.rateMode === "winter" && !park.hasSeasonSplit) return `${money(rate.value)} · published · no separate winter rate`;
  return `${money(rate.value)} · published`;
}

function visible() {
  const f = state.filters;
  const q = f.q.trim().toLowerCase();
  return parks.filter((p) => {
    if (q && !`${p.name} ${p.city} ${p.address}`.toLowerCase().includes(q)) return false;
    if (f.ring && p.ring !== f.ring) return false;
    if (f.longTerm && !isLongTerm(p)) return false;
    const rate = rateOf(p);
    if (f.maxMonthly && (rate.value == null || rate.value > Number(f.maxMonthly))) return false;
    if (f.monthly === "yes" && (rate.estimated || rate.value == null)) return false;
    if (f.monthly === "no" && !rate.estimated && rate.value != null) return false;
    if (f.hookups === "yes" && !p.hookups?.fullHookups) return false;
    return true;
  });
}

function ranked() {
  const rows = visible()
    .slice()
    .sort((a, b) => compareParks(a, b, state.rig, state.sortKey, state.sortDir, state.rateMode));
  if (state.sortKey !== "rank" || state.sortDir !== "desc") return rows;
  const sink = (park) => park.far || (park.confidence === "low" && park.monthlyFrom == null && park.monthlyWinterFrom == null);
  const open = rows.filter((park) => !sink(park));
  const sunk = rows.filter(sink);
  const top = open.filter((park) => park.confidence === "high").slice(0, 3);
  const topIds = new Set(top.map((park) => park.id));
  return [...top, ...open.filter((park) => !topIds.has(park.id)), ...sunk];
}

function shortlistEligible(park) {
  return park.confidence === "high" || park.confidence === "medium";
}

function picks() {
  const long = parks.filter((park) => isLongTerm(park) && shortlistEligible(park));
  const byRank = (rig) => (a, b) => rankValue(b, rig, state.rateMode) - rankValue(a, rig, state.rateMode) || a.name.localeCompare(b.name);
  const bestC = long.slice().sort(byRank("classC"))[0];
  const trailerPool = long.filter((p) => p.leaveTrailerUnattended !== "risky" && p.unhitchFriendly !== "no");
  const bestT = trailerPool.slice().sort(byRank("trailer"))[0];
  const beach = parks
    .filter((park) => isBeachShortStay(park) && shortlistEligible(park))
    .slice()
    .sort((a, b) => b.qualityScore - a.qualityScore || (rateOf(a).value ?? 99999) - (rateOf(b).value ?? 99999))[0];
  const near = parks.filter((p) => {
    const rate = rateOf(p);
    return shortlistEligible(p) && !rate.estimated && rate.value != null && rate.value <= 1600 && (p.roadMiles ?? 999) <= 45;
  });
  const budget = near.slice().sort(byRank(state.rig))[0];
  return [
    { kicker: "Best Class C long-term", park: bestC, why: "Highest long-term rank for a rig you live in. Short stay caps are out." },
    { kicker: "Best Trailer + Tesla long-term", park: bestT, why: "Long stay, room to unhitch, and a trailer that can sit while the car leaves." },
    { kicker: "Best beach short stay", park: beach, why: "Highest quality among ocean parks with a stay cap of 30 nights or less." },
    { kicker: "Best under $1,600/mo near L.A.", park: budget, why: "Published monthly at or under $1,600, within 45 miles of the pier." },
  ];
}

function renderShortlist() {
  const root = document.querySelector("#shortlist");
  root.innerHTML = picks()
    .map(({ kicker, park, why }) => {
      if (!park) {
        return `<article class="pick"><p class="kicker">${esc(kicker)}</p><h3>None in this set</h3><p>${esc(why)}</p></article>`;
      }
      const rig = rigForKicker(kicker);
      return `<article class="pick">
        <p class="kicker">${esc(kicker)}</p>
        <h3><button type="button" data-open="${esc(park.id)}">${esc(park.name)}</button></h3>
        <p class="pick-meta">${esc(park.city)} · ${esc(ringLabel(park.ring))} · ${esc(monthlyLabel(park, state.rateMode))}</p>
        <p>${esc(why)}${park.confidence === "medium" ? " Confirm the monthly before you book." : ""}</p>
        <p class="score-line">${marksHtml(park)} · Rank ${rankValue(park, rig, state.rateMode).toFixed(1)} · quality ${park.qualityScore.toFixed(1)} · ${esc(fitWord(park, rig))} for ${esc(rigName(rig))}</p>
      </article>`;
    })
    .join("");
}

function renderTable() {
  const rows = ranked();
  const count = document.querySelector("#park-count");
  const rateLabel = state.rateMode === "winter" ? "winter-only rates" : "year-round blend";
  count.textContent = `${rows.length} of ${parks.length} parks · sorted for ${rigName(state.rig)} · ${rateLabel}`;
  const tbody = document.querySelector("#park-table tbody");
  document.querySelector("#park-empty").hidden = rows.length > 0;
  tbody.innerHTML = rows
    .map((p) => {
      const rate = rateOf(p);
      const badges = parkBadges(p, state.rateMode);
      const miles = p.roadMiles == null ? "—" : `${p.roadMiles} mi${p.milesEstimated ? " est." : ""}`;
      return `<tr data-open="${esc(p.id)}" class="${state.selectedId === p.id ? "is-selected" : ""}">
        <td>${rankValue(p, state.rig, state.rateMode).toFixed(1)}</td>
        <td><span class="park-name">${esc(p.name)}</span><span class="sub">${esc(p.city)} · ${marksHtml(p)}</span>${badges.length ? `<span class="sub">${esc(badges.join(" · "))}</span>` : ""}</td>
        <td>${esc(ringLabel(p.ring))}</td>
        <td>${p.driveMinutesOffPeak ?? "—"}<span class="sub">${esc(miles)}</span></td>
        <td>${linked(p, monthlyLabel(p, state.rateMode))}<span class="sub">${esc(monthlyHint(p))}</span></td>
        <td>${linked(p, stayLabel(p))}</td>
        <td>${p.qualityScore.toFixed(1)}</td>
        <td>${rate.priceScore.toFixed(1)}</td>
        <td>${fitValue(p, state.rig).toFixed(1)}<span class="sub">${esc(fitWord(p))}</span></td>
      </tr>`;
    })
    .join("");
  document.querySelectorAll("#park-table th").forEach((th) => {
    th.classList.toggle("is-sorted", th.dataset.sort === state.sortKey);
    th.setAttribute("aria-sort", th.dataset.sort === state.sortKey ? (state.sortDir === "asc" ? "ascending" : "descending") : "none");
  });
}

function renderMarkers() {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  markers.clear();
  ranked().forEach((p) => {
    const score = rankValue(p, state.rig);
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: state.selectedId === p.id ? 11 : 8,
      color: "#f4ece0",
      weight: state.selectedId === p.id ? 2 : 1,
      fillColor: RING_COLORS[p.ring] || "#8a6232",
      fillOpacity: 0.92,
    });
    marker.bindTooltip(`${p.name} · rank ${score.toFixed(1)}`, { direction: "top" });
    marker.on("click", () => openPark(p.id));
    marker.addTo(markerLayer);
    markers.set(p.id, marker);
  });
}

function renderChart() {
  const canvas = document.querySelector("#scatter");
  const rows = ranked().filter((p) => rateOf(p).value != null);
  const datasets = RING_ORDER.map((ring) => ({
    label: ringLabel(ring),
    data: rows
      .filter((p) => p.ring === ring)
      .map((p) => ({ x: rateOf(p).value, y: p.qualityScore, id: p.id, name: p.name })),
    backgroundColor: RING_COLORS[ring],
    pointRadius: 6,
    pointHoverRadius: 8,
  }));
  if (chart) chart.destroy();
  chart = new Chart(canvas, {
    type: "scatter",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_evt, elements) => {
        const hit = elements[0];
        if (!hit) return;
        const point = chart.data.datasets[hit.datasetIndex].data[hit.index];
        openPark(point.id);
      },
      plugins: {
        legend: { position: "bottom", labels: { color: "#f4ece0", boxWidth: 12, font: { family: "Outfit" } } },
        tooltip: {
          callbacks: {
            label(ctx) {
              const raw = ctx.raw;
              return `${raw.name}: ${money(raw.x)} · quality ${raw.y}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Monthly used for rank ($)", color: "#b7aa98" },
          ticks: { color: "#b7aa98" },
          grid: { color: "rgba(244,236,224,0.08)" },
        },
        y: {
          min: 0,
          max: 10,
          title: { display: true, text: "Quality", color: "#b7aa98" },
          ticks: { color: "#b7aa98" },
          grid: { color: "rgba(244,236,224,0.08)" },
        },
      },
    },
  });
}

function renderLegend() {
  document.querySelector("#park-legend").innerHTML = RINGS.map(
    (r) => `<li><i style="background:${RING_COLORS[r.id]}"></i>${esc(r.label)} <span>${esc(r.blurb)}</span></li>`,
  ).join("");
}

function trailerAnswer(park, which) {
  if (which === "extra") {
    if (park.extraVehicle === "included") return `yes. Included. ${park.extraVehicleFee || ""}`.trim();
    if (park.extraVehicle === "fee") return `yes. Fee. ${park.extraVehicleFee || ""}`.trim();
    if (park.extraVehicle === "limited") return `yes. Restricted. ${park.extraVehicleFee || ""}`.trim();
    return `unknown. ${park.extraVehicleFee || "Not published."}`.trim();
  }
  if (which === "unhitch") {
    const types = park.siteTypes || [];
    const pull = types.includes("pull-through");
    const back = types.includes("back-in") || types.includes("back-in only");
    const only = types.includes("back-in only");
    const layout = pull && back
      ? "pull-through and back-in"
      : pull
        ? "pull-through"
        : only
          ? "back-in only"
          : back
            ? "back-in"
            : "layout unknown";
    if (park.unhitchFriendly === "yes") return `yes. ${layout}`;
    if (park.unhitchFriendly === "tight") return `no. Tight. ${layout}`;
    if (park.unhitchFriendly === "no") return `no. ${layout}`;
    return `unknown. ${layout}`;
  }
  const leave =
    park.leaveTrailerUnattended === "good" || park.leaveTrailerUnattended === "ok"
      ? "yes"
      : park.leaveTrailerUnattended === "risky"
        ? "no"
        : "unknown";
  const staffed = /gated|gate|staff|24/.test((park.security || []).join(" ").toLowerCase()) ? "yes" : "unknown";
  return `${leave}. Gated or staffed: ${staffed}`;
}

function marksHtml(park) {
  return verifyMarks(park)
    .map((mark) => `<span class="${mark.cls}">${esc(mark.text)}</span>`)
    .join(" · ");
}

function linked(park, label) {
  const url = park.officialUrl || park.website;
  if (!url) return esc(label);
  return `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)}</a>`;
}

function renderBanner() {
  const el = document.querySelector("#rate-banner");
  if (!el) return;
  el.textContent = `Rates last checked ${oldestVerified(ranked())}. Yellow = confirm before you tow.`;
}

function fillDrawer(park) {
  const body = document.querySelector("#drawer-body");
  const sources = (park.sources || []).map((s) => `<li><a href="${esc(s)}" target="_blank" rel="noreferrer">${esc(s)}</a></li>`).join("");
  const rate = rateOf(park);
  const badges = parkBadges(park, state.rateMode);
  const miles = park.roadMiles == null ? "—" : `${park.roadMiles} mi${park.milesEstimated ? " straight-line estimate" : ""}`;
  body.innerHTML = `
    <p class="kicker">${esc(park.city)} · ${esc(ringLabel(park.ring))} · ${marksHtml(park)}${badges.length ? ` · ${esc(badges.join(" · "))}` : ""}</p>
    <h2 id="drawer-title">${esc(park.name)}</h2>
    <p>${esc(park.address)}</p>
    <p><a href="${esc(park.website)}" target="_blank" rel="noreferrer">Park site</a>${park.phone ? ` · ${esc(park.phone)}` : ""}</p>
    <dl class="facts">
      <div><dt>Off-peak to the pier</dt><dd>${park.driveMinutesOffPeak ?? "—"} min · peak ${park.driveMinutesPeak ?? "—"} · ${esc(miles)}</dd></div>
      <div><dt>Nightly</dt><dd>${park.nightlyFrom == null ? "Not published" : `${money(park.nightlyFrom)}${park.nightlyTo && park.nightlyTo !== park.nightlyFrom ? `–${money(park.nightlyTo)}` : ""}`}</dd></div>
      <div><dt>Weekly</dt><dd>${park.weeklyFrom == null ? "Not published" : money(park.weeklyFrom)}</dd></div>
      <div><dt>Monthly</dt><dd>${linked(park, monthlyLabel(park, state.rateMode))}</dd></div>
      <div><dt>Used for rank</dt><dd>${esc(rankUsedLabel(rate, park))}</dd></div>
      <div><dt>Stay</dt><dd>${linked(park, stayLabel(park))}</dd></div>
      <div><dt>Max length</dt><dd>${park.maxRvLengthFt ? `${park.maxRvLengthFt} ft` : "Not published"}</dd></div>
      <div><dt>Extra vehicle</dt><dd>${esc(trailerAnswer(park, "extra"))}</dd></div>
      <div><dt>Unhitch / site</dt><dd>${esc(trailerAnswer(park, "unhitch"))}</dd></div>
      <div><dt>Leave the trailer</dt><dd>${esc(trailerAnswer(park, "leave"))}</dd></div>
      <div><dt>Hookups</dt><dd>${park.hookups?.fullHookups ? "Full" : "Not full"}</dd></div>
      <div><dt>Wifi / noise</dt><dd>${esc(park.wifi)} · ${(park.noise || []).map(esc).join(", ") || "—"}</dd></div>
    </dl>
    ${park.monthlyFrom == null && park.monthlyWinterFrom == null ? `<p>Call for monthly.</p>` : ""}
    <p class="score-line">Quality ${park.qualityScore.toFixed(1)} · price ${rate.priceScore.toFixed(1)} · proximity ${park.proximityScore.toFixed(1)} · Class C fit ${park.fitClassCScore.toFixed(1)} (${esc(park.fitClassC)}) · Trailer fit ${park.fitTrailerScore.toFixed(1)} (${esc(park.fitTrailerTesla)})</p>
    <p class="score-line">Rank ${rate.rankClassC.toFixed(1)} Class C · ${rate.rankTrailer.toFixed(1)} Trailer + Tesla. Value index ${rate.valueIndex == null ? "—" : rate.valueIndex.toFixed(1)} (quality per $1,000 of the monthly used for rank).</p>
    ${park.monthlyRankNote ? `<p>${esc(park.monthlyRankNote)}</p>` : ""}
    ${park.taxesFeesNote ? `<p>${esc(park.taxesFeesNote)}</p>` : ""}
    <h3>Watch</h3>
    <ul>${(park.watchOuts || []).map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
    <p class="fine">Checked ${esc(park.lastVerified)}. ${esc(park.confidence)} confidence.</p>
    <h3>Sources</h3>
    <ul class="sources">${sources}</ul>
  `;
}

function openPark(id) {
  const park = parks.find((p) => p.id === id);
  if (!park) return;
  state.selectedId = id;
  renderTable();
  renderMarkers();
  document.querySelector("#drawer").hidden = false;
  fillDrawer(park);
  const marker = markers.get(id);
  if (marker && map) {
    map.panTo(marker.getLatLng());
  }
  document.querySelector("#drawer-close").focus();
}

function closeDrawer() {
  document.querySelector("#drawer").hidden = true;
  state.selectedId = null;
  renderTable();
  renderMarkers();
}

function paint() {
  renderBanner();
  renderShortlist();
  renderTable();
  renderMarkers();
  renderChart();
  const drawer = document.querySelector("#drawer");
  if (state.selectedId && drawer && !drawer.hidden) {
    const park = parks.find((p) => p.id === state.selectedId);
    if (park) fillDrawer(park);
  }
}

function bootMap() {
  if (map) {
    map.invalidateSize();
    return;
  }
  map = L.map("park-map", { scrollWheelZoom: false, maxZoom: 16 }).setView([PIER.lat, PIER.lng], 9);
  addDarkBasemap(map);
  RINGS.forEach((ring) => {
    L.circle([PIER.lat, PIER.lng], {
      radius: ring.miles * MILES_TO_METERS,
      color: RING_COLORS[ring.id],
      weight: 1,
      fill: false,
      dashArray: "5 7",
      interactive: false,
    }).addTo(map);
  });
  L.circleMarker([PIER.lat, PIER.lng], {
    radius: 6,
    color: "#f4ece0",
    weight: 2,
    fillColor: "#14110e",
    fillOpacity: 1,
  })
    .bindTooltip("Santa Monica Pier", { permanent: true, direction: "right", offset: [8, 0], className: "pier-tip" })
    .addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  const bounds = L.latLngBounds(parks.map((p) => [p.lat, p.lng]));
  bounds.extend([PIER.lat, PIER.lng]);
  map.fitBounds(bounds.pad(0.12));
  renderMarkers();
  map.on("click", () => map.scrollWheelZoom.enable());
  new ResizeObserver(() => map.invalidateSize()).observe(document.querySelector("#park-map"));
}

function fillRings() {
  const select = document.querySelector("#park-filters select[name=ring]");
  select.innerHTML = `<option value="">All rings</option>${RINGS.map((r) => `<option value="${r.id}">${esc(r.label)} — ${esc(r.blurb)}</option>`).join("")}`;
}

export function mountPaid() {
  fillRings();
  renderLegend();
  document.querySelector("#method-weights").innerHTML = QUALITY_WEIGHTS.map((w) => `<li>${esc(w.key)} ${w.pct}%</li>`).join("");
  document.querySelector("#park-filters").addEventListener("input", (event) => {
    const form = event.currentTarget;
    state.filters.q = form.q.value;
    state.filters.ring = form.ring.value;
    state.filters.longTerm = form.longTerm.checked;
    state.filters.maxMonthly = form.maxMonthly.value;
    state.filters.monthly = form.monthly.value;
    state.filters.hookups = form.hookups.value;
    state.rateMode = form.rates.value || "blended";
    paint();
  });
  document.querySelector("#reset-parks").addEventListener("click", () => {
    document.querySelector("#park-filters").reset();
    state.rateMode = "blended";
    state.filters = { q: "", ring: "", longTerm: false, maxMonthly: "", monthly: "", hookups: "" };
    paint();
  });
  document.querySelector("#park-table").addEventListener("click", (event) => {
    const th = event.target.closest("th");
    if (th?.dataset.sort) {
      const key = th.dataset.sort;
      if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      else {
        state.sortKey = key;
        state.sortDir = key === "name" || key === "city" || key === "ring" || key === "drive" || key === "stay" ? "asc" : "desc";
      }
      renderTable();
      return;
    }
    if (event.target.closest("a")) return;
    const row = event.target.closest("[data-open]");
    if (row) openPark(row.dataset.open);
  });
  document.querySelector("#shortlist").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-open]");
    if (btn) openPark(btn.dataset.open);
  });
  document.querySelector("#drawer-close").addEventListener("click", closeDrawer);
  document.querySelector("#drawer").addEventListener("click", (event) => {
    if (event.target.id === "drawer") closeDrawer();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.querySelector("#drawer").hidden) closeDrawer();
  });
  paint();
}

export function setPaidRig(rig) {
  state.rig = rig;
  if (document.querySelector("#panel-parks").hidden) return;
  paint();
}

export function showPaid() {
  bootMap();
  if (chart) chart.resize();
  paint();
}
