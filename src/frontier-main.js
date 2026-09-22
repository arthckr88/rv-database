import "leaflet/dist/leaflet.css";
import "./styles.css";
import "./frontier.css";
import L from "leaflet";
import Chart from "chart.js/auto";
import rawParks from "./data/frontier-parks.json";
import moreParks from "./data/frontier-more.json";
import scanParks from "./data/frontier-scan.json";
import { US_CENTER } from "./lib/geo.js";
import { hydratePark, SEASONS, seasonLabel } from "./lib/seasons.js";
import {
  HUBS,
  FRONTIER_SEASON_GUIDES,
  GO_WILD,
  TRIPS,
  ROUTE_NOTES,
  burIsLive,
  HORIZONS,
  DEFAULT_HORIZON,
  horizonById,
  hubLaxAt,
  hubOrderFor,
  laxStatusWord,
  goWildLabel,
} from "./lib/frontier.js";
import { crossHtml, crossBrief, placeContext } from "./lib/cross.js";
import { trustClause } from "./lib/format.js";
import {
  enrichFrontierPark,
  frontierRank,
  frontierValue,
  compareFrontier,
  tripCost,
  alreadyMonthlyTripCost,
  sitLabel,
  kindLabel,
} from "./lib/frontier-scoring.js";

const root = document.querySelector("#lookup-frontier");
const q = (sel) => root.querySelector(sel);
const qa = (sel) => root.querySelectorAll(sel);

const rawAll = [...rawParks, ...moreParks, ...scanParks];

let parks = [];

function rebuildParks() {
  parks = rawAll.map((raw) => {
    const hydrated = hydratePark(raw);
    return enrichFrontierPark(hydrated, state.horizon);
  });
}

const state = {
  mode: "classC",
  trip: "week",
  horizon: DEFAULT_HORIZON,
  selectedId: null,
  sortKey: "rank",
  sortDir: "desc",
  filters: {
    season: "",
    hub: "",
    state: "",
    city: "",
    lax: "nonstop",
    maxAirport: "45",
    kind: "",
    sit: "",
    seasonFit: "hide",
    skipHazard: "",
    maxCamp: "",
    maxStore: "",
    monthly: "",
    hookups: "",
    extraVehicle: "",
    minQuality: "",
    age: "",
    maxLand: "",
  },
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
  hubCards: q("#hub-cards"),
  tripCards: q("#trip-cards"),
  horizonCards: q("#horizon-cards"),
  warn: q("#bur-warn"),
};

let map;
let markerLayer;
let airportLayer;
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

function seasonNow() {
  return state.filters.season || "";
}

function tripNow() {
  return state.trip || "monthly";
}

function valueNow(park) {
  return frontierValue(park, seasonNow());
}

function rankNow(park) {
  return frontierRank(park, state.mode, seasonNow(), tripNow());
}

function tripNowCost(park) {
  return tripCost(park, tripNow());
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
  const hubSel = els.filters.elements.hub;
  const stateSel = els.filters.elements.state;
  const citySel = els.filters.elements.city;
  const hubId = els.filters.elements.hub.value;
  const stateId = els.filters.elements.state.value;

  const hubOpts = hubOrderFor(state.horizon)
    .filter((id) => parks.some((p) => p.hub === id && (!stateId || p.state === stateId)))
    .map((id) => {
      const h = hubLaxAt(id, state.horizon);
      const tag = h.laxNonstop ? (h.status === "launching" ? "launching LAX" : "LAX") : "connect";
      return [id, `${id} · ${h.city} · ${tag}`];
    });
  fillSelect(hubSel, hubOpts, "All hubs");

  let statePool = parks;
  if (hubId) statePool = statePool.filter((p) => p.hub === hubId);
  const stateOpts = uniqueSorted(statePool.map((p) => p.state)).map((s) => {
    const name = parks.find((p) => p.state === s)?.stateName ?? s;
    return [s, `${s} · ${name}`];
  });
  fillSelect(stateSel, stateOpts, "All states");

  let cityPool = parks;
  if (hubId) cityPool = cityPool.filter((p) => p.hub === hubId);
  if (stateId) cityPool = cityPool.filter((p) => p.state === stateId);
  fillSelect(citySel, uniqueSorted(cityPool.map((p) => p.city)).map((c) => [c, c]), "All cities");
}

function publishedMonthly(p) {
  return p.monthlyFrom != null || p.storageMonthlyFrom != null;
}

function visibleParks() {
  const f = state.filters;
  const season = f.season;
  return parks.filter((p) => {
    if (f.hub && p.hub !== f.hub) return false;
    if (f.state && p.state !== f.state) return false;
    if (f.city && p.city !== f.city) return false;
    if (f.lax === "nonstop" && !p.laxNonstop) return false;
    if (f.lax === "excellent" && p.hubMeta?.goWildToLax !== "excellent" && p.hubMeta?.goWildToLax !== "strong") return false;
    if (f.maxAirport && (p.driveMinutesToAirport == null || p.driveMinutesToAirport > Number(f.maxAirport))) {
      return false;
    }
    if (f.kind && p.kind !== f.kind) return false;
    if (f.sit === "will-sit" && (p.sitWhileGone === "no" || p.sitWhileGone === "call")) return false;
    if (f.sit === "keep-site" && p.sitWhileGone !== "keep-site") return false;
    if (
      f.sit === "storage" &&
      !["storage-lot", "storage-on-site", "nearby-storage"].includes(p.sitWhileGone)
    ) {
      return false;
    }
    if (f.maxCamp && (p.campMonthly == null || p.campMonthly > Number(f.maxCamp))) return false;
    if (f.maxStore) {
      const weekCost = p.storeWeekly ?? (p.storeMonthly != null ? Math.round((p.storeMonthly / 30) * 7) : null);
      if (weekCost == null || weekCost > Number(f.maxStore)) return false;
    }
    if (f.monthly === "yes" && !publishedMonthly(p)) return false;
    if (f.monthly === "no" && publishedMonthly(p)) return false;
    if (f.hookups === "yes" && !p.hookups.fullHookups) return false;
    if (f.extraVehicle && p.extraVehicle !== f.extraVehicle) return false;
    if (f.minQuality && p.qualityScore < Number(f.minQuality)) return false;
    if (f.age === "all-ages" && p.ageRestriction === "55+") return false;
    if (f.maxLand) {
      const land = placeContext(p.lat, p.lng, { hubId: p.hub }).land;
      if (!land || land.minutes > Number(f.maxLand)) return false;
    }
    if (f.skipHazard && (p.hazards || []).includes(f.skipHazard)) return false;
    if (season && f.seasonFit === "hide" && (p.avoidSeasons || []).includes(season)) return false;
    return true;
  });
}

function rankedParks() {
  return visibleParks()
    .slice()
    .sort((a, b) => compareFrontier(a, b, state.mode, state.sortKey, state.sortDir, seasonNow(), tripNow()));
}

function parkById(id) {
  return parks.find((p) => p.id === id);
}

function laxWord(park) {
  const status = park.laxStatus || park.hubMeta?.status;
  if (status === "launching") return "launching";
  if (status === "announced") return "fair";
  if (status === "ended") return "poor";
  if (!park.hubMeta) return "unknown";
  if (park.hubMeta.goWildToLax === "excellent") return "excellent";
  if (park.hubMeta.goWildToLax === "strong") return "good";
  if (park.hubMeta.goWildToLax === "good") return "fair";
  return "poor";
}

function campCell(p) {
  if (p.kind === "storage") return `<span class="muted">Can't camp</span>`;
  if (p.campMonthly == null) return "—";
  return `${money(p.campMonthly)}${p.monthlyFrom == null ? " est." : ""}`;
}

function storeCell(p) {
  if (p.sitWhileGone === "no" && !p.dryStorage) return `<span class="muted">Can't sit</span>`;
  if (p.dryStorage) {
    if (p.storeDaily == null) return "—";
    const est = p.storeDailyEstimated ? " est." : "";
    const min = p.jobHopMinDays > 7 ? ` · ${p.jobHopMinDays}-day min` : "";
    return `<div class="park-cell"><strong>${money(p.storeDaily)}/d${est}</strong><small>${money(p.storeWeekly)}/wk${min}</small></div>`;
  }
  if (p.storeMonthly == null) return "—";
  return `${money(p.storeMonthly)} site`;
}

function shortlistParks() {
  const list = rankedParks();
  const sitters = list.filter((p) => p.sitWhileGone !== "no" && p.sitWhileGone !== "call");
  const nonstop = list.filter((p) => p.laxNonstop);
  const lastMinute = [...nonstop].sort((a, b) => {
    const score = (p) => rankNow(p) + (p.driveMinutesToAirport <= 40 ? 0.4 : 0) + (p.sitScore || 0) * 0.05;
    return score(b) - score(a);
  })[0];
  const cheapestCamp = [...list]
    .filter((p) => p.campMonthly != null)
    .sort((a, b) => a.campMonthly - b.campMonthly || rankNow(b) - rankNow(a))[0];
  const cheapestStore = [...list]
    .filter((p) => p.storeWeekly != null || p.storeMonthly != null)
    .sort((a, b) => {
      const aw = a.storeWeekly ?? Math.round((a.storeMonthly / 30) * 7);
      const bw = b.storeWeekly ?? Math.round((b.storeMonthly / 30) * 7);
      return aw - bw || rankNow(b) - rankNow(a);
    })[0];
  const closestSit = [...sitters]
    .filter((p) => p.driveMinutesToAirport != null)
    .sort((a, b) => a.driveMinutesToAirport - b.driveMinutesToAirport || rankNow(b) - rankNow(a))[0];
  const lowUber = [...sitters]
    .filter((p) => p.uberRoundTripUsd != null)
    .sort((a, b) => a.uberRoundTripUsd - b.uberRoundTripUsd || rankNow(b) - rankNow(a))[0];
  return [
    {
      kicker: "Cheapest to camp",
      park: cheapestCamp,
      why: cheapestCamp
        ? `Hookups · ${money(cheapestCamp.campMonthly)}/mo · ${cheapestCamp.hub}`
        : "No occupied monthly in view",
    },
    {
      kicker: "Cheapest storage week",
      park: cheapestStore,
      why: cheapestStore
        ? cheapestStore.dryStorage
          ? `${money(cheapestStore.storeDaily)}/d · ${money(cheapestStore.storeWeekly)}/wk · ${cheapestStore.hub}`
          : `Keep site · ${money(cheapestStore.storeMonthly)}/mo · ${cheapestStore.hub}`
        : "No storage rate in view",
    },
    {
      kicker: "Last-minute LA",
      park: lastMinute,
      why: lastMinute
        ? `${lastMinute.hub} nonstop · ${lastMinute.driveMinutesToAirport} min · Uber RT ${money(lastMinute.uberRoundTripUsd)}`
        : "No nonstop in view",
    },
    {
      kicker: "Closest that will sit",
      park: closestSit,
      why: closestSit
        ? `${closestSit.driveMinutesToAirport} min · ${sitLabel(closestSit.sitWhileGone)}`
        : "None that will sit",
    },
    {
      kicker: "Lowest Uber round-trip",
      park: lowUber,
      why: lowUber ? `${money(lowUber.uberRoundTripUsd)} · ${lowUber.driveMinutesToAirport} min to ${lowUber.hub}` : "None",
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

function renderHorizonBoard() {
  if (!els.horizonCards) return;
  els.horizonCards.innerHTML = HORIZONS.map((h) => {
    const on = state.horizon === h.id;
    return `<button type="button" class="trip-card ${on ? "is-active" : ""}" data-horizon="${h.id}">
      <div class="kicker">${h.asOf}</div>
      <h3>${h.label}</h3>
      <p>${h.blurb}</p>
    </button>`;
  }).join("");
  const hz = horizonById(state.horizon);
  if (els.warn) {
    const dtw = hubLaxAt("DTW", state.horizon);
    const bur = burIsLive(hz.asOf);
    els.warn.innerHTML = `<p>
      <strong>Plan on ${hz.label}.</strong> ${hz.blurb}
      Sep 2026 published LAX banks (they drift): DFW 34, LAS 33, DEN 30, ATL 24, IAH 14, PHX 14, MCO 13, SLC 12, SEA 12, PDX 6.
      SFO is skipped — you are flying <em>to</em> LA.
      ${bur ? "LAS–BUR still selling through 12 Oct 2026 — not the year-round dump." : "LAS–BUR is over in this horizon. Vegas is LAX-only."}
      DTW–LAX is <strong>${laxStatusWord(dtw)}</strong>${dtw.laxNonstop ? ` · ~${dtw.laxWeekly}/wk` : ""}.
      ${ROUTE_NOTES.dtw}
      ${ROUTE_NOTES.nw26}
      ${ROUTE_NOTES.colombia}
    </p>`;
  }
}

function renderTripBoard() {
  els.tripCards.innerHTML = TRIPS.map((t) => {
    const on = state.trip === t.id;
    return `<button type="button" class="trip-card ${on ? "is-active" : ""}" data-trip="${t.id}">
      <div class="kicker">${t.days} days</div>
      <h3>${t.headline}</h3>
      <p><strong>Go</strong> ${t.go}</p>
      <p><strong>Skip</strong> ${t.skip}</p>
    </button>`;
  }).join("");
}

function renderSeasonBoard() {
  const active = seasonNow();
  els.seasonCards.innerHTML = FRONTIER_SEASON_GUIDES.map((g) => {
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
      "Circuit: LAS + PHX in winter (short nonstops, cheap storage). IAH if you want a $623 monthly under 5 miles from daily LAX. On a 2027 horizon, DTW is the Midwest last-minute LA add. DEN all summer, or Clark Fairgrounds at $495 if Denver occupied is too rich. DFW as a mild-winter backup with the thickest LAX bank. Skip living at DEN/SLC/SEA/PDX/ORD in winter — the airport may still work; the RV does not. " +
      ROUTE_NOTES.bur;
    return;
  }
  const catalogHubs = uniqueSorted(parks.map((p) => p.hub));
  const go = catalogHubs.filter((id) => HUBS[id]?.bestSeasons.includes(active)).map((id) => `${id} ${HUBS[id].city}`);
  const skip = catalogHubs.filter((id) => HUBS[id]?.avoidSeasons.includes(active)).map((id) => `${id} ${HUBS[id].city}`);
  els.correlates.textContent = `${SEASONS.find((s) => s.id === active).label} hubs: ${go.join(", ")}. Usually skip living at: ${skip.join(", ") || "—"}.`;
}

function renderHubBoard() {
  const active = state.filters.hub;
  const ids = hubOrderFor(state.horizon).filter((id) => parks.some((p) => p.hub === id));
  els.hubCards.innerHTML = ids
    .map((id) => {
      const h = hubLaxAt(id, state.horizon);
      const n = parks.filter((p) => p.hub === id).length;
      const status = laxStatusWord(h);
      const lax = h.laxNonstop
        ? `${status === "launching" ? "Launching " : ""}LAX ${status === "live" || status === "launching" ? "nonstop" : status} · ~${h.laxWeekly}/wk · ${h.flightHoursToLax}h`
        : status === "announced"
          ? "LAX announced — not flying yet"
          : "LAX typically a connect";
      const bur = h.burLive ? ` · BUR seasonal through ${h.burUntil}` : "";
      return `<button type="button" class="hub-card ${active === id ? "is-active" : ""}" data-hub="${id}">
      <div class="kicker" style="color:${h.color}">${h.tier === "primary-hub" ? "Primary hub" : h.tier === "spoke" ? "Spoke" : "Focus city"} · ${n} place${n === 1 ? "" : "s"}</div>
      <h3>${h.code} · ${h.city}</h3>
      <p>${goWildLabel(h)}</p>
      <p>${lax}${bur}</p>
    </button>`;
    })
    .join("");
}

function renderTable() {
  const list = rankedParks();
  const sortName =
    state.sortKey === "rank"
      ? "Frontier rank"
      : state.sortKey === "value"
        ? "bang for buck"
        : state.sortKey === "trip"
          ? "this trip $"
          : state.sortKey;
  const nHubs = [...new Set(list.map((p) => p.hub))].length;
  const trip = TRIPS.find((t) => t.id === tripNow());
  els.count.textContent = `${list.length} place${list.length === 1 ? "" : "s"} · ${nHubs} hub${nHubs === 1 ? "" : "s"} · ${trip?.headline ?? "monthly"} · sorted by ${sortName}`;
  els.heading.textContent = state.mode === "trailer" ? "Comparison · Trailer + Tesla" : "Comparison · Class C";
  els.empty.hidden = list.length > 0;
  els.table.hidden = list.length === 0;

  qa(".grid th").forEach((th) => {
    const key = th.dataset.sort;
    th.setAttribute("aria-sort", key === state.sortKey ? (state.sortDir === "asc" ? "ascending" : "descending") : "none");
  });

  const ranks = new Map(
    [...list]
      .sort((a, b) => compareFrontier(a, b, state.mode, "rank", "desc", seasonNow(), tripNow()))
      .map((p, i) => [p.id, i + 1]),
  );
  els.tbody.innerHTML = list
    .map((p) => {
      const rank = ranks.get(p.id);
      const tripC = tripNowCost(p);
      const word = laxWord(p);
      return `<tr data-id="${p.id}" class="${p.id === state.selectedId ? "is-selected" : ""}">
        <td>${rank}</td>
        <td><div class="park-cell"><strong>${p.name}</strong><small>${p.city}, ${p.state} · ${kindLabel(p.kind)}${p.ageRestriction === "55+" ? " · 55+" : ""}</small><small>${crossBrief(p.lat, p.lng, { hubId: p.hub })}</small></div></td>
        <td>${p.hub}</td>
        <td>${p.driveMinutesToAirport != null ? `${p.driveMinutesToAirport} min` : "—"}</td>
        <td>${money(p.uberRoundTripUsd)}</td>
        <td>${campCell(p)}</td>
        <td>${storeCell(p)}</td>
        <td>${tripC == null ? "—" : money(tripC)}</td>
        <td><span class="fit ${p.sitWhileGone === "no" || p.sitWhileGone === "call" ? "fair" : "good"}">${sitLabel(p.sitWhileGone)}</span></td>
        <td><span class="fit ${word}">${laxStatusWord(p.hubMeta)}</span></td>
        <td>${p.qualityScore.toFixed(1)}</td>
      </tr>`;
    })
    .join("");
}

function popupHtml(park) {
  const store =
    park.dryStorage && park.storeDaily != null
      ? `Store ${money(park.storeDaily)}/d · ${money(park.storeWeekly)}/wk`
      : `Store ${park.storeMonthly != null ? money(park.storeMonthly) + "/mo site" : "—"}`;
  const camp = park.kind === "storage" ? "Can't camp" : `Camp ${park.campMonthly != null ? money(park.campMonthly) + "/mo" : "—"}`;
  return `<strong>${park.name}</strong><br>${kindLabel(park.kind)} · ${park.hub}<br>${camp} · ${store}<br>${park.driveMinutesToAirport} min · Uber RT ${money(park.uberRoundTripUsd)}`;
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

  airportLayer = L.layerGroup().addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  els.legend.innerHTML = `
    <li><i style="background:#8faf78"></i>Strong Frontier rank</li>
    <li><i style="background:#d7b07a"></i>Mid pack</li>
    <li><i style="background:#d07152"></i>Weak last-minute LA / season</li>
    <li><i style="background:#f4ece0; border-radius:2px;"></i>Frontier airport</li>
    <li><i style="background:#8a7a72; border-radius:2px;"></i>Storage lot</li>
  `;
  const ro = new ResizeObserver(() => map.invalidateSize());
  ro.observe(mapEl);
  renderMarkers();
}

function renderMarkers() {
  markerLayer.clearLayers();
  airportLayer.clearLayers();
  markersById.clear();
  const list = rankedParks();
  const hubsInView = [...new Set(list.map((p) => p.hub))];
  hubsInView.forEach((id) => {
    const h = HUBS[id];
    if (!h) return;
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin airport" title="${h.code}"><span>${h.code.slice(0, 1)}</span></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([h.lat, h.lng], { icon, title: `${h.code} ${h.airport}`, zIndexOffset: 40 })
      .bindPopup(`<strong>${h.code}</strong> · ${h.city}<br>${h.blurb}`)
      .addTo(airportLayer);
  });
  list.forEach((park, i) => {
    const score = rankNow(park);
    const storage = park.kind === "storage";
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin${storage ? " storage" : ""}" style="background:${rankColor(score)}"><span>${i + 1}</span></div>`,
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
    const pts = [
      ...list.map((p) => [p.lat, p.lng]),
      ...hubsInView.map((id) => [HUBS[id].lat, HUBS[id].lng]),
    ];
    map.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: list.length === 1 ? 9 : 6 });
  } else {
    map.setView([US_CENTER.lat, US_CENTER.lng], 4);
  }
}

function renderChart() {
  const list = rankedParks();
  const campPts = list.filter((p) => p.campMonthly != null);
  const storePts = list.filter((p) => p.storeWeekly != null || p.storeMonthly != null);
  const bubble = (p, x) => ({
    x,
    y: p.qualityScore,
    r: Math.max(5, Math.min(16, 18 - (p.driveMinutesToAirport || 40) / 8)),
    id: p.id,
    name: p.name,
  });
  const data = {
    datasets: [
      {
        label: "Camp (hookups)",
        data: campPts.map((p) => bubble(p, p.campMonthly)),
        backgroundColor: campPts.map((p) => p.hubMeta?.color ?? "#8faf78"),
        borderColor: campPts.map((p) => (p.id === state.selectedId ? "#f4ece0" : "transparent")),
        borderWidth: 2,
      },
      {
        label: "Store (week, job hop)",
        data: storePts.map((p) => bubble(p, p.storeWeekly ?? Math.round((p.storeMonthly / 30) * 7))),
        backgroundColor: storePts.map((p) => `${p.hubMeta?.color ?? "#8a7a72"}cc`),
        borderColor: storePts.map((p) => (p.id === state.selectedId ? "#f4ece0" : "transparent")),
        borderWidth: 2,
        pointStyle: "rect",
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: "#b7aa98", usePointStyle: true, boxWidth: 10 },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const pool = ctx.datasetIndex === 0 ? campPts : storePts;
            const p = pool[ctx.dataIndex];
            if (!p) return "";
            const amt = ctx.datasetIndex === 0 ? p.campMonthly : p.storeWeekly ?? p.storeMonthly;
            const kind = ctx.datasetIndex === 0 ? "camp / mo" : "store / wk";
            const extra =
              ctx.datasetIndex === 1 && p.storeDaily != null ? `, ${money(p.storeDaily)}/d` : "";
            return `${p.name} (${p.hub}): ${kind} ${money(amt)}${extra}, Uber RT ${money(p.uberRoundTripUsd)}, ${p.driveMinutesToAirport} min`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Camp / mo or storage / week ($)", color: "#b7aa98" },
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
      const hit = elsClick[0];
      const pool = hit.datasetIndex === 0 ? campPts : storePts;
      const p = pool[hit.index];
      if (p) selectPark(p.id, { fromChart: true });
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
  return bits.length ? bits.join(" · ") : "Dry / storage — no living aboard";
}

function placeLine(park) {
  const addr = park.address || "";
  if (!addr || addr === park.city) return `${park.city}, ${park.state}`;
  if (/\b[A-Z]{2}\b/.test(addr) && addr.includes(park.city)) return addr;
  return `${addr}, ${park.city}, ${park.state}`;
}

function drawerHtml(park) {
  const extra = park.extraVehicleFee ? `<p>${park.extraVehicleFee}</p>` : "";
  const sources = (park.sources || [])
    .map((s) => `<li><a href="${s}" target="_blank" rel="noreferrer">${s.replace(/^https?:\/\//, "")}</a></li>`)
    .join("");
  const hub = park.hubMeta;
  const dash = tripCost(park, "dash");
  const week = tripCost(park, "week");
  const month = tripCost(park, "monthly");
  const already = alreadyMonthlyTripCost(park);
  const burChip =
    hub?.burLive
      ? `<span class="chip">BUR seasonal through ${hub.burUntil} — not the LA plan after that</span>`
      : hub?.burUntil && !hub.burLive
        ? `<span class="chip">LAS–BUR ended ${hub.burUntil} — LAX only</span>`
        : "";
  return `
    <p class="eyebrow">${park.operator} · ${park.stateName} · ${kindLabel(park.kind)}${trustClause(park.confidence) ? ` · ${trustClause(park.confidence)}` : ""}</p>
    <h2 id="drawer-title">${park.name}</h2>
    <p>${placeLine(park)}</p>
    ${crossHtml(park.lat, park.lng, { hubId: park.hub })}
    <div class="meta-row">
      <span class="chip">${park.hub} · ${hub?.airport ?? ""}</span>
      <span class="chip">${park.driveMinutesToAirport} min / ${park.driveMilesToAirport} mi to airport</span>
      <span class="chip">Uber ~${money(park.uberOneWayUsd)} one way / ${money(park.uberRoundTripUsd)} round-trip</span>
      <span class="chip">${park.laxNonstop ? `${laxStatusWord(park.hubMeta)} LAX · ~${hub?.laxWeekly}/wk · ${hub?.flightHoursToLax}h` : park.laxStatus === "announced" ? "LAX announced — not flying yet" : "LAX typically a connect"}</span>
      ${hub?.filingNote ? `<span class="chip">${hub.filingNote}</span>` : ""}
      ${burChip}
      <span class="chip">${park.goWildLabel}</span>
      <span class="chip">${sitLabel(park.sitWhileGone)}</span>
      <span class="chip">${hookupLine(park.hookups)}</span>
      <span class="chip">Extra vehicle: ${park.extraVehicle}</span>
      ${park.ageRestriction === "55+" ? `<span class="chip">55+</span>` : ""}
    </div>
    <div class="stat-row">
      <div class="stat"><span>Frontier rank</span><strong>${rankNow(park).toFixed(1)}</strong></div>
      <div class="stat"><span>Airport drive</span><strong>${park.airportScore.toFixed(1)}</strong></div>
      <div class="stat"><span>Sit while gone</span><strong>${park.sitScore.toFixed(1)}</strong></div>
      <div class="stat"><span>Value now</span><strong>${valueNow(park) == null ? "—" : valueNow(park).toFixed(1)}</strong></div>
    </div>
    <div class="stat-row">
      <div class="stat"><span>Camp / mo (hookups)</span><strong>${
        park.kind === "storage"
          ? "Can't camp"
          : park.campMonthly != null
            ? money(park.campMonthly) + (park.monthlyFrom == null ? " est." : "")
            : "—"
      }</strong></div>
      <div class="stat"><span>Store / day (job hop)</span><strong>${
        park.storeDaily != null
          ? money(park.storeDaily) + (park.storeDailyEstimated ? " est." : "")
          : park.sitWhileGone === "no"
            ? "Can't sit"
            : "—"
      }</strong></div>
      <div class="stat"><span>Store / week</span><strong>${
        park.storeWeekly != null ? money(park.storeWeekly) : "—"
      }</strong></div>
      <div class="stat"><span>Uber round-trip</span><strong>${money(park.uberRoundTripUsd)}</strong></div>
      <div class="stat"><span>Stay cap</span><strong>${stayCap(park)}</strong></div>
    </div>
    <h3>If you fly to LA</h3>
    <p>
      <strong>Camp</strong> (live here with hookups): ${
        park.kind === "storage" ? "this is storage-only — you cannot camp here." : park.campMonthly != null ? `${money(park.campMonthly)}/mo occupied` : "no occupied monthly published"
      }
      · <strong>Store</strong> (empty rig while you fly to a job): ${
        park.storeDaily != null
          ? `${money(park.storeDaily)}/day${park.storeDailyEstimated ? " (prorated from monthly quote)" : ""} · ${money(park.storeWeekly)}/week${
              park.jobHopMinDays > 1 ? ` · billed minimum ${park.jobHopMinDays} days` : ""
            }${park.storeMonthly != null ? ` · ${money(park.storeMonthly)}/mo only if you actually sit a month` : ""}`
          : park.storeMonthly != null
            ? `${money(park.storeMonthly)}/mo keep-site`
            : park.sitWhileGone === "no"
              ? "will not sit empty."
              : "no storage rate published"
      }.
    </p>
    <p>
      ${
        park.kind === "storage"
          ? `<strong>Dry storage — you cannot live here.</strong> A job hop of 2–4 days costs ${
              dash == null ? "—" : money(dash)
            } (stall for the days you are gone, plus Uber). Lots that only publish a monthly still prorate here. Do not use airport parking.`
          : `<strong>Already on a monthly that will sit the rig:</strong> a 2–4 day dash is about ${
              already == null
                ? "not allowed — you would have to store it elsewhere"
                : money(already) + " in Uber, because the site is already paid"
            }. Airport parking is the expensive wrong answer.`
      }
    </p>
    <p>
      <strong>Not on a monthly</strong> (you just need the rig to wait): dash ${dash == null ? "—" : money(dash)} ·
      week ${week == null ? "—" : money(week)} · month ${month == null ? "—" : money(month)}.
      ${park.storageMonthlyFrom != null ? `If you actually left it a month: ${money(park.storageMonthlyFrom)}/mo${park.storageDailyFrom != null ? ` · published ${money(park.storageDailyFrom)}/day` : " · daily shown above is prorated"}.` : ""}
      ${park.shortAbsence ? `Short-absence plan: ${park.shortAbsence}.` : ""}
    </p>
    <h3>Why this hub</h3>
    <p>${hub?.blurb ?? ""}</p>
    <p>${hub?.climate ?? ""}</p>
    <h3>Climate at the park</h3>
    <p>${park.climateNote}</p>
    <p>Best: ${seasonLabel(park.bestSeasons)} · Avoid: ${seasonLabel(park.avoidSeasons) || "none listed"} · Hazards: ${(park.hazards || []).join(", ") || "—"}</p>
    <p>${park.electricExtra || ""}</p>
    <p>${park.taxesFeesNote || ""}</p>
    ${extra}
    <h3>Go Wild</h3>
    <p>${GO_WILD.domesticWindow}. ${GO_WILD.fees} ${GO_WILD.lastMinute}</p>
    <h3>Best for</h3>
    <ul class="best">${(park.bestFor || []).map((x) => `<li>${x}</li>`).join("")}</ul>
    <h3>Watch outs</h3>
    <ul class="watch">${(park.watchOuts || []).map((x) => `<li>${x}</li>`).join("")}</ul>
    <h3>Amenities</h3>
    <div class="tag-row">${(park.amenities || []).map((a) => `<span class="chip">${a}</span>`).join("") || "—"}</div>
    <p>Wifi ${park.wifi} · Pets ${park.pets} · Noise: ${(park.noise || []).join(", ") || "—"}</p>
    <p>Security: ${(park.security || []).join(", ") || "—"} · Unhitch ${park.unhitchFriendly} · Trailer unattended ${park.leaveTrailerUnattended}</p>
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
      map.flyTo([park.lat, park.lng], Math.max(map.getZoom(), 8), { duration: 0.6 });
    }
  }
}

function readFiltersFromForm() {
  const data = new FormData(els.filters);
  for (const key of Object.keys(state.filters)) {
    state.filters[key] = data.get(key) || "";
  }
}

function renderAll() {
  renderHorizonBoard();
  renderTripBoard();
  renderSeasonBoard();
  renderHubBoard();
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

function setHub(id) {
  els.filters.elements.hub.value = id;
  els.filters.elements.city.value = "";
  const st = els.filters.elements.state.value;
  if (id && st && !parks.some((p) => p.hub === id && p.state === st)) {
    els.filters.elements.state.value = "";
  }
  populateFilterOptions();
  readFiltersFromForm();
  renderAll();
}

function setTrip(id) {
  state.trip = id;
  if (state.sortKey === "trip") state.sortDir = "asc";
  renderAll();
}

function setHorizon(id) {
  state.horizon = id;
  rebuildParks();
  populateFilterOptions();
  readFiltersFromForm();
  renderAll();
}

function bind() {
  qa(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.mode = btn.dataset.mode;
      qa(".mode-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      if (state.sortKey !== "value" && state.sortKey !== "trip") {
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
      state.sortDir = btn.dataset.sortMode === "trip" ? "asc" : "desc";
      qa(".sort-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderAll();
    });
  });

  els.tripCards.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-trip]");
    if (!btn) return;
    setTrip(btn.dataset.trip);
  });

  els.horizonCards?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-horizon]");
    if (!btn) return;
    setHorizon(btn.dataset.horizon);
  });

  els.seasonCards.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-season]");
    if (!btn) return;
    const id = btn.dataset.season;
    setSeason(state.filters.season === id ? "" : id);
  });

  els.hubCards.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-hub]");
    if (!btn) return;
    const id = btn.dataset.hub;
    setHub(state.filters.hub === id ? "" : id);
  });

  els.filters.addEventListener("change", (e) => {
    if (e.target.name === "hub") {
      els.filters.elements.city.value = "";
      const st = els.filters.elements.state.value;
      const hubId = e.target.value;
      if (hubId && st && !parks.some((p) => p.hub === hubId && p.state === st)) {
        els.filters.elements.state.value = "";
      }
    }
    if (e.target.name === "state") {
      els.filters.elements.city.value = "";
      const hubId = els.filters.elements.hub.value;
      const st = e.target.value;
      if (hubId && st && !parks.some((p) => p.hub === hubId && p.state === st)) {
        els.filters.elements.hub.value = "";
      }
    }
    populateFilterOptions();
    readFiltersFromForm();
    renderAll();
  });

  els.reset.addEventListener("click", () => {
    els.filters.reset();
    els.filters.elements.seasonFit.value = "hide";
    els.filters.elements.maxAirport.value = "45";
    els.filters.elements.lax.value = "nonstop";
    populateFilterOptions();
    readFiltersFromForm();
    state.sortKey = "rank";
    state.sortDir = "desc";
    state.trip = "week";
    state.horizon = DEFAULT_HORIZON;
    rebuildParks();
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
      state.sortDir = key === "name" || key === "hub" || key === "airport" || key === "uber" || key === "camp" || key === "store" || key === "monthly" || key === "trip" ? "asc" : "desc";
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
    if (event.detail !== "frontier") return;
    if (map) setTimeout(() => map.invalidateSize(), 60);
  });
}

try {
  state.mode = localStorage.getItem("rv-rig") === "trailer" ? "trailer" : "classC";
  qa(".mode-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === state.mode));
  rebuildParks();
  populateFilterOptions();
  els.filters.elements.seasonFit.value = "hide";
  els.filters.elements.maxAirport.value = "45";
  els.filters.elements.lax.value = "nonstop";
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
