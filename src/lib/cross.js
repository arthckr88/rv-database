import areas from "../data/featuredAreas.json";
import rawParks from "../data/frontier-parks.json";
import moreParks from "../data/frontier-more.json";
import scanParks from "../data/frontier-scan.json";
import { HUBS, hubLaxAt, hubOrderFor, DEFAULT_HORIZON } from "./frontier.js";
import { esc, money } from "./format.js";

const pool = [...rawParks, ...moreParks, ...scanParks];
const storageOnly = pool.filter((park) => park.kind === "storage");
const hybridLots = pool.filter(
  (park) => park.kind !== "storage" && (park.kind === "hybrid" || park.storageMonthlyFrom != null || park.storageDailyFrom != null),
);

/** A same-day neighbor. Farther than this, the pin is named and marked too far. */
const USEFUL_MINUTES = 240;

const cache = new Map();

export function crowMiles(lat, lng, lat2, lng2) {
  const r = 3958.8;
  const dLat = ((lat2 - lat) * Math.PI) / 180;
  const dLng = ((lng2 - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(r * 2 * Math.asin(Math.min(1, Math.sqrt(a))));
}

/** Straight-line miles turned into a road-minute estimate. Not a published drive time. */
export function estMinutes(miles) {
  if (miles == null) return null;
  return Math.max(5, Math.round(miles * 1.45));
}

export function emptyCross() {
  return { hub: "", lax: "", max: "", storage: false, land: "" };
}

function hubsFor(horizon, hubId, lax) {
  return hubOrderFor(horizon)
    .map((id) => hubLaxAt(id, horizon))
    .filter((hub) => HUBS[hub.id] || hub.lat != null)
    .filter((hub) => !hubId || hub.id === hubId)
    .filter((hub) => lax !== "nonstop" || hub.laxNonstop);
}

function nearestLot(list, lat, lng, hub) {
  let storage = null;
  for (const park of list) {
    if (park.lat == null) continue;
    if (hub && park.hub !== hub.id) continue;
    const fromPin = crowMiles(lat, lng, park.lat, park.lng);
    if (fromPin <= 1) continue;
    if (!storage || fromPin < storage.milesFromPin) {
      storage = {
        park,
        milesFromPin: fromPin,
        minutesFromPin: estMinutes(fromPin),
        minutesFromAirport: park.driveMinutesToAirport ?? null,
      };
    }
  }
  return storage;
}

export function placeContext(lat, lng, opts = {}) {
  const horizon = opts.horizon || DEFAULT_HORIZON;
  const hubId = opts.hubId || "";
  const lax = opts.lax || "";
  const key = `${lat},${lng}|${horizon}|${hubId}|${lax}|${opts.excludeLandId || ""}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const candidates = hubsFor(horizon, hubId, lax);
  let hub = null;
  let miles = null;
  for (const candidate of candidates) {
    if (candidate.lat == null || candidate.lng == null) continue;
    const next = crowMiles(lat, lng, candidate.lat, candidate.lng);
    if (miles == null || next < miles) {
      miles = next;
      hub = candidate;
    }
  }
  const minutes = estMinutes(miles);
  const storage = nearestLot(storageOnly, lat, lng, hub) || nearestLot(hybridLots, lat, lng, hub);
  let land = null;
  for (const area of areas) {
    if (area.id === opts.excludeLandId || area.lat == null) continue;
    const fromPin = crowMiles(lat, lng, area.lat, area.lng);
    if (!land || fromPin < land.miles) {
      land = { area, miles: fromPin, minutes: estMinutes(fromPin) };
    }
  }
  const ctx = { hub, miles, minutes, storage, land };
  cache.set(key, ctx);
  return ctx;
}

function storagePrice(park) {
  if (park.storageDailyFrom != null) return `${money(park.storageDailyFrom)}/day`;
  if (park.storageMonthlyFrom != null) return `${money(park.storageMonthlyFrom)}/mo`;
  return "price unpublished";
}

function farSuffix(minutes) {
  return minutes != null && minutes > USEFUL_MINUTES ? " · too far to use with this pin" : "";
}

function capSuffix(minutes) {
  if (minutes == null) return "";
  return minutes <= 45 ? " · inside the 45-min airport cap" : " · outside the 45-min airport cap";
}

export function passesPlace(lat, lng, filters = {}, opts = {}) {
  const f = filters || {};
  if (!f.hub && !f.lax && !f.max && !f.storage && !f.land) return true;
  const ctx = placeContext(lat, lng, {
    ...opts,
    hubId: f.hub || opts.hubId || "",
    lax: f.lax || opts.lax || "",
  });
  if ((f.hub || f.lax) && !ctx.hub) return false;
  if (f.max && (ctx.minutes == null || ctx.minutes > Number(f.max))) return false;
  if (f.storage) {
    if (!ctx.storage) return false;
    if (f.max && ctx.storage.minutesFromPin > Number(f.max)) return false;
  }
  if (f.land && (!ctx.land || ctx.land.minutes > Number(f.land))) return false;
  return true;
}

export function crossBrief(lat, lng, opts = {}) {
  if (lat == null || lng == null) return "";
  const ctx = placeContext(lat, lng, opts);
  const hubLine = ctx.hub
    ? `Frontier ${esc(ctx.hub.code)} est. ${ctx.minutes} min${capSuffix(ctx.minutes)}`
    : "Frontier: no airport in this filter";
  const storeLine = ctx.storage
    ? `storage ${esc(ctx.storage.park.name)} est. ${ctx.storage.minutesFromPin} min${ctx.storage.minutesFromAirport != null ? ` · ${ctx.storage.minutesFromAirport} min published to ${esc(ctx.storage.park.hub)}` : ""}${farSuffix(ctx.storage.minutesFromPin)}`
    : "storage: none listed for that airport";
  if (opts.omitLand) return `${hubLine}. ${storeLine}.`;
  const landLine = ctx.land
    ? `free land ${esc(ctx.land.area.name)} est. ${ctx.land.minutes} min${farSuffix(ctx.land.minutes)}`
    : "free land: none listed";
  return `${hubLine}. ${storeLine}. ${landLine}.`;
}

export function crossHtml(lat, lng, opts = {}) {
  if (lat == null || lng == null) return "";
  const ctx = placeContext(lat, lng, opts);
  const hubLine = ctx.hub
    ? `${esc(ctx.hub.code)} · ${esc(ctx.hub.city)} · est. ${ctx.minutes} min / ${ctx.miles} mi · ${ctx.hub.laxNonstop ? "LAX nonstop" : "LAX connect"}${capSuffix(ctx.minutes)}`
    : "No Frontier airport matches this filter.";
  const storeLine = ctx.storage
    ? `${esc(ctx.storage.park.name)} · est. ${ctx.storage.minutesFromPin} min from this pin · ${ctx.storage.minutesFromAirport != null ? `${ctx.storage.minutesFromAirport} min published to ${esc(ctx.storage.park.hub)}` : "airport minutes unpublished"} · ${esc(storagePrice(ctx.storage.park))}${farSuffix(ctx.storage.minutesFromPin)}`
    : "No storage lot in the Frontier list for this airport.";
  const landLine = ctx.land
    ? `${esc(ctx.land.area.name)} · est. ${ctx.land.minutes} min / ${ctx.land.miles} mi${farSuffix(ctx.land.minutes)}`
    : "No featured public-land pin.";
  return `<p class="fine">Frontier airport: ${hubLine}. Storage: ${storeLine}. Free land: ${landLine}. Minutes to the airport, to storage, and to free land are straight-line estimates unless a published drive time is named.</p>`;
}

export function frontierHubOptions() {
  return hubOrderFor(DEFAULT_HORIZON).map((id) => {
    const hub = hubLaxAt(id, DEFAULT_HORIZON);
    const tag = hub.laxNonstop ? "LAX" : "connect";
    return [id, `${id} · ${hub.city} · ${tag}`];
  });
}

export function crossFilterMarkup({ includeLand = false } = {}) {
  const hubOptions = frontierHubOptions()
    .map(([id, label]) => `<option value="${esc(id)}">${esc(label)}</option>`)
    .join("");
  const land = includeLand
    ? `<label class="field"><span>Free land within</span><select data-cross="land"><option value="">Any</option><option value="45">≤ 45 min</option><option value="75">≤ 75 min</option><option value="120">≤ 2 hours</option><option value="240">≤ 4 hours</option></select></label>`
    : "";
  return `<label class="field"><span>Frontier airport</span><select data-cross="hub"><option value="">Nearest</option>${hubOptions}</select></label>
    <label class="field"><span>LAX from that airport</span><select data-cross="lax"><option value="">Any</option><option value="nonstop">Nonstop only</option></select></label>
    <label class="field"><span>Max est. minutes to airport</span><select data-cross="max"><option value="">Any</option><option value="45">≤ 45 min</option><option value="75">≤ 75 min</option><option value="120">≤ 2 hours</option><option value="240">≤ 4 hours</option></select></label>
    <label class="check"><input type="checkbox" data-cross="storage" /> Storage lot within that drive</label>
    ${land}`;
}

export function readCross(form, target) {
  const hub = form.querySelector("[data-cross=hub]");
  if (!hub) return;
  target.hub = hub.value;
  target.lax = form.querySelector("[data-cross=lax]").value;
  target.max = form.querySelector("[data-cross=max]").value;
  target.storage = form.querySelector("[data-cross=storage]").checked;
  const land = form.querySelector("[data-cross=land]");
  target.land = land ? land.value : "";
}
