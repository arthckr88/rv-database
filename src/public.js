import L from "leaflet";
import areas from "./data/featuredAreas.json";
import hubs from "./data/hubs.json";
import seasons from "./data/seasons.json";
import usRules from "./data/usRules.json";
import canada from "./data/canadaRules.json";
import { esc, PIER, COST_LABEL, ACCESS_LABEL } from "./lib/format.js";
import { inMexico, inCanadaRough } from "./lib/scope.js";
import { addDarkBasemap } from "./lib/basemap.js";

const SERVICES = [
  {
    id: "blm",
    label: "BLM surface",
    url: "https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_BLM_Only/MapServer",
    mode: "tile",
    defaultOn: true,
    identify: true,
  },
  {
    id: "blm-pri",
    label: "BLM surface, including private and unknown",
    url: "https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_with_PriUnk/MapServer",
    mode: "tile",
    defaultOn: false,
    identify: true,
  },
  {
    id: "blm-rec",
    label: "BLM recreation sites",
    url: "https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recs_poly/MapServer",
    mode: "dynamic",
    layers: "show:0,1",
    defaultOn: false,
    identify: false,
  },
  {
    id: "padus",
    label: "PAD-US protected areas",
    url: "https://edits.nationalmap.gov/arcgis/rest/services/PAD-US/PAD_US/MapServer",
    mode: "dynamic",
    layers: "show:0",
    defaultOn: false,
    identify: true,
  },
];

const COST_COLOR = {
  free: "#2f6a56",
  "low-permit": "#8a6232",
  ltva: "#b85c38",
  varies: "#3d6f78",
};

const MANG = {
  BLM: "Bureau of Land Management",
  NPS: "National Park Service",
  USFS: "Forest Service",
  FWS: "U.S. Fish and Wildlife Service",
  DOD: "Department of Defense",
  USBR: "Bureau of Reclamation",
  USACE: "Army Corps of Engineers",
  SPR: "State park agency",
  SFW: "State fish and wildlife",
  PVT: "Private",
  TRIB: "Tribal land",
  CITY: "City",
  CNTY: "County",
  SLB: "State trust land",
  UNK: "Unknown",
};

export function createLand(root, options = {}) {
  const q = (sel) => root.querySelector(sel);
  const state = {
  rig: "classC",
  month: new Date().getMonth() + 1,
  filter: "season",
  q: "",
  osm: false,
};

let map;
let areaLayer;
let hubLayer;
let osmLayer;
let osmTimer;
const areaMarkers = new Map();
const failed = new Set();

function monthSpec() {
  return seasons.months.find((m) => m.n === state.month);
}

function styleFor(area) {
  const spec = monthSpec();
  const dim = spec.dimBands.includes(area.band) || (area.avoidMonths || []).includes(state.month);
  const warn = spec.warnBands.includes(area.band);
  const hidden = state.rig === "trailer" && (area.access === "4x4" || area.softSand);
  return { dim, warn, hidden, color: warn ? "#8c3d2a" : COST_COLOR[area.cost] || "#3d6f78" };
}

function passesFilter(area) {
  const look = styleFor(area);
  if (look.hidden) return false;
  if (state.q && !`${area.name} ${area.agency} ${area.notes}`.toLowerCase().includes(state.q)) return false;
  if (state.filter === "ltva") return area.cost === "ltva";
  if (state.filter === "free") return area.cost === "free";
  if (state.filter === "closest") return area.closestToLa;
  if (state.filter === "canada") return area.country === "CA";
  if (state.filter === "usfs") return area.agency.includes("USFS") || area.group === "usfs";
  if (state.filter === "season") return (area.bestMonths || []).includes(state.month) && !look.dim && !look.warn;
  return true;
}

function visibleAreas() {
  return areas.filter(passesFilter);
}

function implication(code, name) {
  const blob = `${code || ""} ${name || ""}`.toUpperCase();
  if (blob.includes("NPS") || blob.includes("NATIONAL PARK")) {
    return "National Park Service (or a national park unit). These are usually not free dispersed camping.";
  }
  if (blob.includes("USFS") || blob.includes("FOREST SERVICE")) {
    return "National Forest. Camp only on roads the forest MVUM marks open.";
  }
  if (blob.includes("BLM")) {
    return "BLM surface. Dispersed camping is often legal unless the area is posted closed. This polygon is not permission to camp and it is not a reserved site. Typical stay where it is open: 14 days in 28.";
  }
  if (blob.includes("FWS") || blob.includes("WILDLIFE")) {
    return "Wildlife refuge. Camping is usually closed or limited to named sites.";
  }
  if (blob.includes("DOD") || blob.includes("MILITARY")) return "Military land. Not a campsite.";
  if (blob.includes("TRIB")) return "Tribal land. Not public camping.";
  if (blob.includes("PVT") || blob.includes("PRIVATE")) return "Private land. Do not camp here.";
  if (blob.includes("SPR") || blob.includes("STATE PARK")) return "State park or state land. Expect a fee and a campground, not open dispersed camping.";
  return "Manager identified. That is not permission to camp.";
}

function hubById(id) {
  return hubs.find((h) => h.id === id);
}

function serviceWord(value) {
  if (value === "yes") return "yes";
  if (value === "no") return "no";
  return "confirm";
}

function renderTeach() {
  q("#teach").innerHTML = `
    <h2>${esc(usRules.headline)}</h2>
    <div class="teach-grid">
      ${usRules.points
        .map(
          (p) => `<article><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></article>`,
        )
        .join("")}
    </div>`;
}

function renderMonth() {
  const spec = monthSpec();
  q("#month-label").textContent = spec.name;
  q("#month-note").textContent = spec.note;
  q("#month").value = String(state.month);
}

function renderProvinceSelect() {
  const select = q("#province");
  select.innerHTML = `<option value="">Canada — pick a province</option>${canada.provinces
    .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
    .join("")}`;
}

function renderProvince(id) {
  const card = q("#province-card");
  const province = canada.provinces.find((p) => p.id === id);
  if (!province) {
    card.hidden = true;
    card.innerHTML = "";
    return;
  }
  card.hidden = false;
  card.innerHTML = `
    <h3>${esc(province.name)}</h3>
    <p>${esc(province.stay)}</p>
    <p>${esc(province.nonResident)}</p>
    <p><a href="${esc(province.atlas)}" target="_blank" rel="noreferrer">${esc(province.atlasLabel)}</a>
      · <a href="${esc(province.map)}" target="_blank" rel="noreferrer">Official map</a></p>
    <p class="fine">${esc(canada.note)}</p>`;
  if (map) map.setView(province.center, province.zoom);
}

function renderAreas() {
  const list = visibleAreas();
  q("#area-count").textContent = `${list.length} areas · ${state.rig === "trailer" ? "4x4 and soft sand hidden" : "Class C sees rough roads, labeled"}`;
  q("#area-list").innerHTML = list
    .map((area) => {
      const look = styleFor(area);
      const hub = hubById(area.nearestHub);
      return `<article class="area ${look.dim ? "is-dim" : ""} ${look.warn ? "is-warn" : ""}" data-area="${esc(area.id)}">
        <p class="kicker">${esc(COST_LABEL[area.cost] || area.cost)} · ${esc(area.agency)}</p>
        <h3>${esc(area.name)}</h3>
        <p>${esc(area.stayLimit)}</p>
        <p class="fine">${esc(ACCESS_LABEL[area.access])} · Class C ${esc(area.fitClassC)} · Trailer ${esc(area.fitTrailerTesla)} · ${hub ? esc(hub.name) : "No listed hub"} · ${esc(area.confidence)} confidence${area.lastChecked ? ` · checked ${esc(area.lastChecked)}` : ""}${look.warn ? " · heat warning" : ""}${look.dim ? " · poor month" : ""}</p>
      </article>`;
    })
    .join("");
  drawAreaMarkers(list);
}

function popupHtml(area) {
  const hub = hubById(area.nearestHub);
  return `<strong>${esc(area.name)}</strong><br>${esc(area.agency)} · ${esc(COST_LABEL[area.cost] || "")}<br>${esc(area.stayLimit)}<br><em>Not a reserved site.</em><br><a href="${esc(area.officialUrl)}" target="_blank" rel="noreferrer">Official page</a>${area.lastChecked ? `<br>Checked ${esc(area.lastChecked)}` : ""}${hub ? `<br>Nearest hub: ${esc(hub.name)}` : ""}`;
}

function drawAreaMarkers(list) {
  if (!areaLayer) return;
  areaLayer.clearLayers();
  areaMarkers.clear();
  list.forEach((area) => {
    const look = styleFor(area);
    const marker = L.circleMarker([area.lat, area.lng], {
      radius: area.cost === "ltva" ? 9 : 7,
      color: "#f4ece0",
      weight: 1,
      fillColor: look.color,
      fillOpacity: look.dim ? 0.35 : 0.9,
    });
    marker.bindPopup(popupHtml(area));
    marker.on("click", (event) => {
      L.DomEvent.stopPropagation(event);
      q(`[data-area="${area.id}"]`)?.scrollIntoView({ block: "nearest" });
    });
    marker.addTo(areaLayer);
    areaMarkers.set(area.id, marker);
  });
}

function drawHubs() {
  if (!hubLayer) return;
  hubLayer.clearLayers();
  hubs.forEach((hub) => {
    const marker = L.marker([hub.lat, hub.lng], {
      icon: L.divIcon({
        className: "hub-pin",
        html: `<span>${esc(hub.name)}</span>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
    });
    marker.bindPopup(
      `<strong>${esc(hub.name)}</strong> · ${esc(hub.region)}<br>Dump ${esc(serviceWord(hub.dump))}<br>Water ${esc(serviceWord(hub.water))}<br>Grocery ${esc(serviceWord(hub.grocery))}<br>Propane ${esc(serviceWord(hub.propane))}<br>${esc(hub.note)}`,
    );
    marker.on("click", (event) => L.DomEvent.stopPropagation(event));
    marker.addTo(hubLayer);
  });
}

function showBanner() {
  const banner = q("#layer-banner");
  if (!failed.size) {
    banner.hidden = true;
    banner.textContent = "";
    return;
  }
  banner.hidden = false;
  banner.textContent = `A map layer failed and is turned off: ${[...failed].join("; ")}. The rest of this tab still works. A failed layer is not a place to camp.`;
}

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${url}?f=json`, { signal: ctrl.signal });
    if (!res.ok) return false;
    const json = await res.json();
    return !json.error;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function tileLayer(url, label) {
  let errors = 0;
  const layer = L.tileLayer(`${url}/tile/{z}/{y}/{x}`, {
    maxZoom: 16,
    maxNativeZoom: 14,
    opacity: 0.62,
  });
  layer.on("tileerror", () => {
    errors += 1;
    if (errors === 6) {
      failed.add(`${label} tiles`);
      if (map.hasLayer(layer)) map.removeLayer(layer);
      showBanner();
    }
  });
  return layer;
}

function dynamicLayer(url, layers) {
  const Layer = L.GridLayer.extend({
    createTile(coords) {
      const img = document.createElement("img");
      img.alt = "";
      img.width = 256;
      img.height = 256;
      const host = this._map;
      if (!host) return img;
      const nw = host.unproject([coords.x * 256, coords.y * 256], coords.z);
      const se = host.unproject([(coords.x + 1) * 256, (coords.y + 1) * 256], coords.z);
      const params = new URLSearchParams({
        bbox: `${nw.lng},${se.lat},${se.lng},${nw.lat}`,
        bboxSR: "4326",
        imageSR: "3857",
        size: "256,256",
        format: "png32",
        transparent: "true",
        f: "image",
        layers,
      });
      img.src = `${url}/export?${params.toString()}`;
      return img;
    },
  });
  return new Layer({ opacity: 0.5 });
}

async function bootLayers() {
  const box = q("#layer-toggles");
  box.innerHTML = "";
  for (const svc of SERVICES) {
    const ok = await probe(svc.url);
    const label = document.createElement("label");
    label.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.disabled = !ok;
    if (!ok) {
      failed.add(svc.label);
      input.checked = false;
    } else {
      svc.layer = svc.mode === "tile" ? tileLayer(svc.url, svc.label) : dynamicLayer(svc.url, svc.layers);
      input.checked = svc.defaultOn;
      if (svc.defaultOn) svc.layer.addTo(map);
      input.addEventListener("change", () => {
        if (!svc.layer) return;
        if (input.checked) svc.layer.addTo(map);
        else map.removeLayer(svc.layer);
      });
    }
    label.append(input, document.createTextNode(ok ? svc.label : `${svc.label} (unavailable)`));
    box.append(label);
  }
  const osm = document.createElement("label");
  osm.className = "check";
  osm.innerHTML = `<input type="checkbox" id="osm-toggle"> Unofficial OSM camp hints`;
  box.append(osm);
  q("#osm-toggle").addEventListener("change", (event) => {
    state.osm = event.target.checked;
    if (!state.osm) {
      osmLayer.clearLayers();
      return;
    }
    loadOsm();
  });
  showBanner();
}

async function identify(url, lat, lng) {
  const bounds = map.getBounds();
  const size = map.getSize();
  const params = new URLSearchParams({
    f: "json",
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    sr: "4326",
    layers: "all",
    tolerance: "6",
    mapExtent: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
    imageDisplay: `${Math.max(1, Math.round(size.x))},${Math.max(1, Math.round(size.y))},96`,
    returnGeometry: "false",
  });
  const res = await fetch(`${url}/identify?${params}`);
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "identify failed");
  return json.results || [];
}

function describeResult(result) {
  const a = result.attributes || {};
  const code = a.ADMIN_AGENCY_CODE || a.Mang_Name || a.Own_Name || "";
  const unit = a.ADMIN_UNIT_NAME || a.Unit_Nm || a.Loc_Nm || result.value || "Unnamed unit";
  const des = a.Des_Tp || a.ADMIN_UNIT_TYPE || "";
  const access = a.Pub_Access || "";
  const stateName = a.ADMIN_ST || a.State_Nm || "";
  const manager = MANG[code] || code || result.layerName || "Manager";
  return { code, unit, des, access, stateName, manager, layer: result.layerName };
}

function renderIdentify(html) {
  q("#identify").innerHTML = html;
}

async function onMapClick(event) {
  const { lat, lng } = event.latlng;
  if (inMexico(lat, lng)) {
    renderIdentify(`<h3>Out of scope</h3><p>Mexico is outside this planner. United States and Canada only.</p>`);
    return;
  }
  renderIdentify(`<h3>Looking up the manager</h3><p>Asking BLM and PAD-US. If they fail, the answer is unknown — not a yes.</p>`);
  const blocks = [];
  let anySuccess = false;
  let anyHit = false;
  for (const svc of SERVICES.filter((s) => s.identify)) {
    try {
      const results = await identify(svc.url, lat, lng);
      anySuccess = true;
      if (!results.length) continue;
      anyHit = true;
      const seen = new Set();
      const lines = [];
      for (const result of results) {
        const d = describeResult(result);
        const key = `${d.manager}|${d.unit}|${d.des}|${d.stateName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push(
          `<li><strong>${esc(d.manager)}</strong> — ${esc(d.unit)}${d.des ? ` · ${esc(d.des)}` : ""}${d.stateName ? ` · ${esc(d.stateName)}` : ""}${d.access ? ` · public access code ${esc(d.access)}` : ""}<br><span class="fine">${esc(implication(d.code, d.manager))}</span></li>`,
        );
        if (lines.length >= 2) break;
      }
      blocks.push(
        `<h3>${esc(svc.label)}</h3><ul>${lines.join("")}</ul><p class="fine"><a href="${esc(svc.url)}" target="_blank" rel="noreferrer">${esc(svc.label)} source</a></p>`,
      );
    } catch {
      failed.add(`${svc.label} identify`);
      blocks.push(`<h3>${esc(svc.label)}</h3><p>Unknown. Verify with the field office.</p>`);
    }
  }
  showBanner();
  if (!anySuccess) {
    renderIdentify(`<h3>Unknown. Verify with the field office.</h3><p>The official queries failed. That is not permission to camp.</p>${blocks.join("")}`);
    return;
  }
  if (!anyHit) {
    const canadaNote = inCanadaRough(lat, lng)
      ? " This latitude is in the Canada range. U.S. BLM and PAD-US do not draw provincial Crown land. Use the province picker and the official atlas."
      : " If this is Canada south of the 49th parallel, the U.S. layers will be empty. Use the province picker.";
    renderIdentify(`<h3>Unknown. Verify with the field office.</h3><p>No BLM or PAD-US feature came back for this point.${esc(canadaNote)} A blank map is not a campsite.</p>`);
    return;
  }
  renderIdentify(`<p class="fine">This names a manager. It is not permission to camp. Posted signs win.</p>${blocks.join("")}`);
}

async function loadOsm() {
  if (!state.osm || !map) return;
  if (map.getZoom() < 8) {
    osmLayer.clearLayers();
    failed.add("OSM hints need a closer zoom");
    showBanner();
    return;
  }
  failed.delete("OSM hints need a closer zoom");
  const b = map.getBounds();
  const south = Math.max(b.getSouth(), 24.5);
  const query = `[out:json][timeout:20];node["tourism"="camp_site"](${south},${b.getWest()},${b.getNorth()},${b.getEast()});out 60;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      headers: { "Content-Type": "text/plain" },
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    osmLayer.clearLayers();
    (json.elements || []).forEach((node) => {
      if (node.type !== "node" || inMexico(node.lat, node.lon)) return;
      const name = node.tags?.name;
      if (!name) return;
      L.circleMarker([node.lat, node.lon], {
        radius: 4,
        color: "#d7b07a",
        weight: 1,
        fillColor: "#3a3228",
        fillOpacity: 0.9,
      })
        .bindTooltip(`Unofficial OSM: ${name}. Not a permit.`, { direction: "top" })
        .addTo(osmLayer);
    });
    failed.delete("Unofficial OSM hint layer");
    showBanner();
  } catch {
    failed.add("Unofficial OSM hint layer");
    showBanner();
  }
}

function bootMap() {
  if (map) {
    map.invalidateSize();
    return;
  }
  map = L.map(q("#land-map"), { scrollWheelZoom: false, maxZoom: 16 }).setView([34.4, -116.2], 6);
  addDarkBasemap(map);
  L.circleMarker([PIER.lat, PIER.lng], {
    radius: 5,
    color: "#f4ece0",
    weight: 2,
    fillColor: "#14110e",
    fillOpacity: 1,
  })
    .bindTooltip("Santa Monica — almost no free trailer camping here", { direction: "left" })
    .addTo(map);
  areaLayer = L.layerGroup().addTo(map);
  hubLayer = L.layerGroup().addTo(map);
  osmLayer = L.layerGroup().addTo(map);
  drawHubs();
  renderAreas();
  if (options.focus === "us") {
    map.setView([39.5, -98.35], 4);
  } else {
    const focus = areas.filter((a) => a.closestToLa || a.group === "ltva");
    map.fitBounds(L.latLngBounds(focus.map((a) => [a.lat, a.lng])).pad(0.15));
  }
  map.on("click", onMapClick);
  map.on("moveend", () => {
    if (!state.osm) return;
    clearTimeout(osmTimer);
    osmTimer = setTimeout(loadOsm, 700);
  });
  map.on("click", () => map.scrollWheelZoom.enable());
  new ResizeObserver(() => map.invalidateSize()).observe(q("#land-map"));
  bootLayers();
}

function mount() {
  renderTeach();
  renderMonth();
  renderProvinceSelect();
  q("#month").addEventListener("input", (event) => {
    state.month = Number(event.target.value);
    renderMonth();
    renderAreas();
  });
  q("#province").addEventListener("change", (event) => {
    renderProvince(event.target.value);
  });
  q("#area-filter").addEventListener("change", (event) => {
    state.filter = event.target.value;
    renderAreas();
  });
  q("#area-q").addEventListener("input", (event) => {
    state.q = event.target.value.trim().toLowerCase();
    renderAreas();
  });
  q("#area-list").addEventListener("click", (event) => {
    const card = event.target.closest("[data-area]");
    if (!card || !map) return;
    const marker = areaMarkers.get(card.dataset.area);
    if (!marker) return;
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 8));
    marker.openPopup();
  });
  const padus = q("#padus-link");
  if (padus) padus.href = "https://maps.usgs.gov/padusdataexplorer/";
}

function setRig(rig) {
  state.rig = rig;
  if (q("#panel-land").hidden) return;
  renderAreas();
}

function show() {
  bootMap();
  renderAreas();
}
  return { mount, setRig, show };
}
