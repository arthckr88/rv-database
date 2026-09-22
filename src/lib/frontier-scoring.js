import { enrichPark, seasonalFit, round1, clamp, effectiveMonthly } from "./scoring.js";
import { goWildLabel, UBER_CITY_MUL, TRIPS, hubLaxAt, DEFAULT_HORIZON } from "./frontier.js";

export function airportDriveScore(minutes) {
  if (minutes == null) return 3;
  if (minutes <= 20) return 9.8;
  if (minutes <= 30) return 9.2;
  if (minutes <= 45) return 8.2;
  if (minutes <= 55) return 6.6;
  if (minutes <= 75) return 4.6;
  if (minutes <= 95) return 3.0;
  return 1.4;
}

export function laxAccessScore(hub) {
  if (!hub) return 3;
  if (hub.laxNonstop && hub.laxWeekly >= 28) return 9.8;
  if (hub.laxNonstop && hub.laxWeekly >= 20) return 9.4;
  if (hub.laxNonstop && hub.laxWeekly >= 12) return 8.3;
  if (hub.laxNonstop && hub.laxWeekly >= 6) return 7.0;
  if (hub.laxNonstop) return 5.8;
  return 2.4;
}

export function hubWeight(hub) {
  if (!hub) return 4;
  if (hub.tier === "primary-hub") return 10;
  if (hub.tier === "focus") return 8.1;
  if (hub.tier === "spoke") return 6.4;
  return 5.4;
}

export function estimateUber(miles, minutes, hubId) {
  const m = miles ?? (minutes != null ? minutes * 0.65 : 18);
  const t = minutes ?? 22;
  const mul = UBER_CITY_MUL[hubId] ?? 1;
  const one = Math.round(((8.5 + 2.15 * m + 0.42 * t + 5.5) * mul) / 5) * 5;
  const clamped = Math.max(16, Math.min(95, one));
  return { oneWay: clamped, roundTrip: clamped * 2 };
}

export function inferKind(park) {
  return park.kind || (park.hookups?.fullHookups ? "live-in" : "storage");
}

export function inferSit(park) {
  if (park.sitWhileGone) return park.sitWhileGone;
  if (inferKind(park) === "storage") return "storage-lot";
  if (park.leaveTrailerUnattended === "good") return "keep-site";
  if (park.leaveTrailerUnattended === "ok") return "keep-site";
  if (park.leaveTrailerUnattended === "risky") return "no";
  return "call";
}

export function isDryStorage(park) {
  if (inferKind(park) === "storage") return true;
  const sit = inferSit(park);
  return sit === "storage-lot" || sit === "storage-on-site" || sit === "nearby-storage";
}

export function sitScore(park) {
  const sit = inferSit(park);
  if (park.storageDailyFrom != null) return 9.8;
  const storage = park.storageMonthlyFrom;
  if (sit === "storage-lot" && storage != null && storage <= 150) return 9.2;
  if (sit === "storage-lot" && storage != null && storage <= 250) return 8.8;
  if (sit === "storage-lot") return 8.4;
  if (sit === "storage-on-site") return 8.8;
  if (sit === "keep-site" && park.leaveTrailerUnattended === "good") return 8.6;
  if (sit === "keep-site") return 7.7;
  if (sit === "nearby-storage") return 8.0;
  if (sit === "call") return 5.2;
  return 2.0;
}

/** Occupied hookup monthly — what it costs to actually camp here. Null if storage-only. */
export function campMonthly(park) {
  const kind = inferKind(park);
  if (kind === "storage") return null;
  if (park.monthlyFrom != null) return park.monthlyFrom;
  return effectiveMonthly(park).value;
}

/** Empty-rig monthly — stall / on-site storage if published, else the occupied site if the park will sit it. */
export function storeMonthly(park) {
  if (park.storageMonthlyFrom != null) return park.storageMonthlyFrom;
  const kind = inferKind(park);
  if (kind === "storage") return park.monthlyFrom ?? null;
  if (inferSit(park) === "no") return null;
  if (park.monthlyFrom != null) return park.monthlyFrom;
  return effectiveMonthly(park).value;
}

export function storeKind(park) {
  if (park.storageMonthlyFrom != null && inferKind(park) === "storage") return "stall";
  if (park.storageMonthlyFrom != null && park.sitWhileGone === "storage-on-site") return "stall";
  if (park.storageMonthlyFrom != null && park.sitWhileGone === "storage-lot") return "stall";
  if (park.storageMonthlyFrom != null) return "stall";
  if (inferSit(park) === "no") return "no";
  if (inferKind(park) === "storage") return "stall";
  return "site";
}

export function leaveMonthly(park) {
  const kind = inferKind(park);
  if (kind === "storage") return storeMonthly(park);
  return campMonthly(park);
}

/** Daily stall for a job hop. Published $/day wins; otherwise monthly/30 and marked estimated. */
export function storeDaily(park) {
  if (park.storageDailyFrom != null) return { value: park.storageDailyFrom, estimated: false };
  if (!isDryStorage(park)) return { value: null, estimated: false };
  const mo = park.storageMonthlyFrom ?? (inferKind(park) === "storage" ? park.monthlyFrom ?? null : null);
  if (mo == null) return { value: null, estimated: false };
  return { value: Math.max(1, Math.round(mo / 30)), estimated: true };
}

/** Honor a published daily-product minimum (Sam’s 14 days). Monthly-quoted lots prorate from day 1. */
export function jobHopMinDays(park) {
  if (park.storageDailyFrom != null) return park.shortAbsenceMinDays ?? 1;
  if (isDryStorage(park)) return 1;
  return 1;
}

export function jobHopStoreCost(park, days) {
  const daily = storeDaily(park);
  if (daily.value == null) return null;
  return Math.round(daily.value * Math.max(days, jobHopMinDays(park)));
}

export function storeWeekly(park) {
  if (park.storageWeeklyFrom != null) return { value: park.storageWeeklyFrom, estimated: false };
  const cost = jobHopStoreCost(park, 7);
  if (cost == null) return { value: null, estimated: false };
  return { value: cost, estimated: storeDaily(park).estimated };
}

export function tripDays(tripId) {
  return TRIPS.find((t) => t.id === tripId)?.days ?? 30;
}

/**
 * Cost of a LA hop from this park.
 * Dry storage is a job hop: bill the days you are gone (plus a published daily min), not a forced month.
 * Keep-site live-ins still pay the occupied site unless they have a separate stall.
 */
export function tripCost(park, tripId = "monthly") {
  const days = tripDays(tripId);
  const uber = park.uberRoundTripUsd ?? 0;
  const sit = inferSit(park);
  const kind = inferKind(park);
  if (sit === "no" && kind !== "storage") return null;

  if (isDryStorage({ ...park, kind, sitWhileGone: sit })) {
    if (tripId === "monthly") {
      const mo = storeMonthly({ ...park, kind });
      if (mo != null) return mo + uber;
    }
    const slice = jobHopStoreCost({ ...park, kind, sitWhileGone: sit }, days);
    if (slice != null) return slice + uber;
  }

  if (tripId === "monthly") {
    const leave = storeMonthly({ ...park, kind }) ?? campMonthly({ ...park, kind });
    if (leave == null) return uber || null;
    return leave + uber;
  }

  const occ = park.effectiveMonthly ?? campMonthly({ ...park, kind });
  if (occ == null) return uber || null;
  return Math.round((occ / 30) * days) + uber;
}

/** If the monthly is already sunk and the park will sit the rig, a dash is just the Uber. */
export function alreadyMonthlyTripCost(park) {
  const sit = inferSit(park);
  if (sit === "no") return null;
  if (inferKind(park) === "storage") return tripCost(park, "dash");
  return park.uberRoundTripUsd ?? 0;
}

export function sitLabel(sit) {
  switch (sit) {
    case "keep-site":
      return "Keep the site";
    case "storage-lot":
      return "Storage lot";
    case "storage-on-site":
      return "On-site storage";
    case "nearby-storage":
      return "Nearby storage";
    case "call":
      return "Call first";
    case "no":
      return "Won't sit empty";
    default:
      return sit || "—";
  }
}

export function kindLabel(kind) {
  switch (kind) {
    case "storage":
      return "Storage only";
    case "hybrid":
      return "Live or store";
    default:
      return "Live-in";
  }
}

export function enrichFrontierPark(park, horizonId = DEFAULT_HORIZON) {
  const kind = inferKind(park);
  const sit = inferSit(park);
  const basePark =
    kind === "storage" && park.monthlyFrom == null && park.storageMonthlyFrom != null
      ? { ...park, monthlyFrom: park.storageMonthlyFrom, nightlyFrom: park.nightlyFrom ?? park.storageDailyFrom }
      : park;
  const base = enrichPark(basePark);
  const hub = hubLaxAt(park.hub, horizonId);
  const uber = estimateUber(park.driveMilesToAirport, park.driveMinutesToAirport, park.hub);
  const airport = airportDriveScore(park.driveMinutesToAirport);
  const lax = laxAccessScore(hub);
  const hw = hubWeight(hub);
  const sitSc = sitScore({ ...park, kind, sitWhileGone: sit });
  const merged = { ...base, ...park, kind, sitWhileGone: sit };
  const camp = campMonthly(merged);
  const store = storeMonthly(merged);
  const leave = leaveMonthly(merged);
  const daily = storeDaily(merged);
  const weekly = storeWeekly(merged);
  return {
    ...base,
    kind,
    sitWhileGone: sit,
    shortAbsence: park.shortAbsence || (kind === "storage" ? "storage-lot" : sit === "keep-site" ? "keep-paying-site" : "call"),
    hubMeta: hub,
    airportScore: airport,
    laxScore: lax,
    hubWeight: hw,
    sitScore: sitSc,
    goWildLabel: goWildLabel(hub),
    laxNonstop: !!hub?.laxNonstop,
    laxStatus: hub?.status ?? "unknown",
    uberOneWayUsd: park.uberOneWayUsd ?? uber.oneWay,
    uberRoundTripUsd: park.uberRoundTripUsd ?? uber.roundTrip,
    campMonthly: camp,
    storeMonthly: store,
    storeKind: storeKind(merged),
    leaveMonthly: leave,
    dryStorage: isDryStorage(merged),
    storeDaily: daily.value,
    storeDailyEstimated: daily.estimated,
    storeWeekly: weekly.value,
    jobHopMinDays: jobHopMinDays(merged),
    priceScore:
      kind === "storage" && park.storageMonthlyFrom != null
        ? round1(clamp(9.4 - (park.storageMonthlyFrom - 120) / 90, 0, 10))
        : base.priceScore,
  };
}

export function frontierRank(park, mode, season = "", tripId = "monthly") {
  const fit = mode === "trailer" ? park.fitTrailerScore : park.fitClassCScore;
  const tripBoost = tripId === "monthly" ? 0 : 0.04;
  return round1(
    (0.18 - tripBoost) * park.qualityScore +
      0.16 * park.priceScore +
      0.1 * fit +
      0.12 * seasonalFit(park, season) +
      0.16 * park.airportScore +
      0.12 * park.laxScore +
      (0.1 + tripBoost) * park.sitScore +
      0.06 * park.hubWeight,
  );
}

export function frontierValue(park, season = "") {
  const leave = park.leaveMonthly;
  if (leave == null || leave <= 0) return null;
  const quality = park.qualityScore || 6;
  const access = (park.airportScore + park.laxScore) / 20;
  const sit = park.sitScore / 10;
  return round1((quality / (leave / 1000)) * (seasonalFit(park, season) / 8) * (0.5 + access) * (0.7 + sit * 0.4));
}

export function compareFrontier(a, b, mode, sortKey, dir, season = "", tripId = "monthly") {
  if (sortKey === "rank" || sortKey === "value") {
    if (!!a.laxNonstop !== !!b.laxNonstop) {
      const nonstopFirst = a.laxNonstop ? -1 : 1;
      return dir === "desc" ? nonstopFirst : -nonstopFirst;
    }
  }
  const val = (park) => {
    switch (sortKey) {
      case "rank":
        return frontierRank(park, mode, season, tripId);
      case "name":
        return park.name.toLowerCase();
      case "hub":
        return park.hub;
      case "airport":
        return park.driveMinutesToAirport ?? 999;
      case "monthly":
      case "camp":
        return park.campMonthly ?? 99999;
      case "store":
        return park.storeWeekly ?? park.storeMonthly ?? 99999;
      case "quality":
        return park.qualityScore;
      case "value":
        return frontierValue(park, season) ?? -1;
      case "lax":
        return park.laxScore;
      case "uber":
        return park.uberRoundTripUsd ?? 999;
      case "sit":
        return park.sitScore;
      case "trip":
        return tripCost(park, tripId) ?? 99999;
      case "fitC":
        return park.fitClassCScore;
      case "fitT":
        return park.fitTrailerScore;
      default:
        return frontierRank(park, mode, season, tripId);
    }
  };
  const av = val(a);
  const bv = val(b);
  if (typeof av === "string") return av.localeCompare(bv) * (dir === "asc" ? 1 : -1);
  if (av === bv) return a.name.localeCompare(b.name);
  return (av < bv ? -1 : 1) * (dir === "asc" ? 1 : -1);
}

export { clamp, round1, effectiveMonthly, seasonalFit };
