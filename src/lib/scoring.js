import { RING_ORDER } from "./geo.js";
import { PIER } from "./format.js";
import { materialize, snapshotFacts } from "./facts.js";

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Long-term mode uses the stricter cap. A null result is month-to-month.
 * Summer and peak caps count even when the base stay field was left open.
 */
export function stricterStayNights(park) {
  const caps = [park.maxStayNights, park.maxStaySummerNights, park.maxStayPeakNights].filter((n) => n != null);
  if (!caps.length) return null;
  return Math.min(...caps);
}

/**
 * Stay-cap penalty multiplies priceScore. It does not subtract from rankScore.
 * A 14- or 21-night cap is not a monthly home, so a cheap nightly must not
 * survive as a long-term price.
 *   <=14 nights: severe ×0.25
 *   15–21:       heavy  ×0.45  (Dockweiler)
 *   22–27:       medium ×0.70
 *   28+ or month-to-month: ×1
 */
export function stayCapFactor(nights) {
  if (nights == null || nights >= 28) return 1;
  if (nights <= 14) return 0.25;
  if (nights <= 21) return 0.45;
  return 0.7;
}

function seasonMid(from, to) {
  if (from == null && to == null) return null;
  if (from != null && to != null && to !== from) return Math.round((from + to) / 2);
  return from ?? to;
}

function winterMid(park) {
  if (park.monthlyWinterFrom == null && park.monthlyWinterTo == null) return null;
  return seasonMid(park.monthlyWinterFrom, park.monthlyWinterTo);
}

function summerMid(park) {
  if (park.monthlySummerFrom == null && park.monthlySummerTo == null) return null;
  return seasonMid(park.monthlySummerFrom, park.monthlySummerTo);
}

function monthlyBounds(park) {
  const lows = [park.monthlyWinterFrom, park.monthlySummerFrom, park.monthlyFrom].filter((n) => n != null);
  const highs = [
    park.monthlyWinterTo,
    park.monthlySummerTo,
    park.monthlyTo,
    park.monthlyWinterFrom,
    park.monthlySummerFrom,
    park.monthlyFrom,
  ].filter((n) => n != null);
  if (!lows.length && !highs.length) return { best: null, worst: null };
  return {
    best: Math.min(...(lows.length ? lows : highs)),
    worst: Math.max(...(highs.length ? highs : lows)),
  };
}

/** A quoted monthly the rank is allowed to use. Null when the stay cap is under 28 nights. */
function monthlyQuote(park, rateMode) {
  const cap = stricterStayNights(park);
  if (cap != null && cap < 28) return null;
  const winter = winterMid(park);
  const summer = summerMid(park);
  const cardFrom = park.monthlyFrom;
  const cardTo = park.monthlyTo;
  const card = seasonMid(cardFrom, cardTo);
  const ranged = cardFrom != null && cardTo != null && cardTo !== cardFrom;

  if (rateMode === "winter" && winter != null) return { value: winter, kind: "winter" };
  if (winter != null && summer != null) return { value: Math.round(0.5 * winter + 0.5 * summer), kind: "blended" };
  if (card != null) return { value: card, kind: ranged ? "range" : "published" };
  if (winter != null || summer != null) return { value: winter ?? summer, kind: "published" };
  return null;
}

/**
 * Real monthly only when the stay is at least 28 nights or month-to-month.
 * A winter/summer split ranks on the 50/50 blend of the two season midpoints,
 * not the cheapest floor. Winter-only mode uses the winter midpoint.
 * Otherwise nightly × 30, flagged as an estimate. Never invent a monthly.
 */
export function effectiveMonthly(park, rateMode = "blended") {
  const cap = stricterStayNights(park);
  const capped = cap != null && cap < 28;
  const bounds = monthlyBounds(park);
  const quote = monthlyQuote(park, rateMode);
  if (quote) {
    return {
      value: quote.value,
      estimated: false,
      kind: quote.kind,
      capped: false,
      stayCapNights: cap,
      monthlyBestCase: bounds.best,
      monthlyWorstCase: bounds.worst,
    };
  }
  if (park.nightlyFrom != null) {
    return {
      value: Math.round(park.nightlyFrom * 30),
      estimated: true,
      kind: "estimate",
      capped,
      stayCapNights: cap,
      monthlyBestCase: bounds.best,
      monthlyWorstCase: bounds.worst,
    };
  }
  return {
    value: null,
    estimated: false,
    kind: "none",
    capped,
    stayCapNights: cap,
    monthlyBestCase: bounds.best,
    monthlyWorstCase: bounds.worst,
  };
}

function reviewScore(park) {
  if (park.reviewGoogle == null) return 6;
  return (park.reviewGoogle / 5) * 10;
}

function amenityScore(park) {
  let s = 3.6;
  if (park.hookups?.fullHookups) s += 2.2;
  else {
    if (park.hookups?.water) s += 0.4;
    if (park.hookups?.sewer) s += 0.5;
    if (park.hookups?.amp30 || park.hookups?.amp50) s += 0.45;
  }
  if (park.hookups?.amp50) s += 0.3;
  s += Math.min(2.2, (park.amenities?.length || 0) * 0.22);
  if (park.siteTypes?.includes("pull-through")) s += 0.3;
  if (park.beachAccess === "on-sand") s += 0.45;
  return clamp(s, 0, 10);
}

function noiseScore(park) {
  const n = park.noise || [];
  if (n.includes("quiet")) return 9;
  let s = 7.2;
  if (n.includes("freeway")) s -= 1.8;
  if (n.includes("airport")) s -= 2.6;
  if (n.includes("train")) s -= 1.1;
  if (n.includes("tourist")) s -= 0.8;
  return clamp(s, 0, 10);
}

function securityScore(park) {
  const sec = (park.security || []).join(" ").toLowerCase();
  let s = 4;
  if (sec.includes("gated")) s += 1.8;
  if (sec.includes("24")) s += 1.7;
  if (sec.includes("staff")) s += 1.3;
  if (sec.includes("camera")) s += 0.8;
  if (park.leaveTrailerUnattended === "good") s += 0.4;
  if (park.leaveTrailerUnattended === "risky") s -= 1.5;
  return clamp(s, 0, 10);
}

/** Kept for callers. Rank no longer folds drive time into quality; proximityScore owns distance. */
export function smUsefulness(park) {
  const min = park.driveMinutesOffPeak;
  if (min == null) return 5;
  if (min <= 25) return 9.5;
  if (min <= 40) return 8.2;
  if (min <= 55) return 6.6;
  if (min <= 75) return 5;
  if (min <= 100) return 3.5;
  return 2.1;
}

function wifiScore(park) {
  switch (park.wifi) {
    case "good":
      return 9;
    case "ok":
      return 6.4;
    case "poor":
      return 3;
    default:
      return 5;
  }
}

export function qualityScore(park) {
  // Drive time used to be 15% of quality and then distance was counted again.
  // These five are that old mix with usefulness removed, scaled back to 100%.
  const q =
    0.29 * reviewScore(park) +
    0.24 * amenityScore(park) +
    0.18 * noiseScore(park) +
    0.18 * securityScore(park) +
    0.11 * wifiScore(park);
  return round1(clamp(q, 0, 10));
}

function rawPrice(value) {
  if (value == null) return 4;
  let s = 10 - (value - 500) / 420;
  if (value >= 2500) s -= 0.9;
  if (value >= 4000) s -= 1;
  return clamp(s, 0, 10);
}

export function priceScore(park, rateMode = "blended") {
  const monthly = effectiveMonthly(park, rateMode);
  const base = rawPrice(monthly.value);
  return round1(clamp(base * stayCapFactor(monthly.stayCapNights), 0, 10));
}

export function fitScoreClassC(park) {
  let s = 7.4;
  if (park.maxRvLengthFt != null && park.maxRvLengthFt < 30) s -= 1.2;
  if (park.hookups?.fullHookups) s += 0.8;
  else s -= 1.6;
  const cap = stricterStayNights(park);
  if (cap != null && cap <= 14) s -= 2;
  else if (cap != null && cap <= 21) s -= 1.6;
  else if (cap != null && cap < 28) s -= 0.8;
  else if (cap == null) s += 0.4;
  if (park.wifi === "good") s += 0.35;
  if (park.wifi === "poor") s -= 0.7;
  if ((park.noise || []).includes("airport")) s -= 0.4;
  return round1(clamp(s, 0, 10));
}

function securityStaffed(park) {
  const sec = (park.security || []).join(" ").toLowerCase();
  return sec.includes("gated") || sec.includes("gate") || sec.includes("staff") || sec.includes("24");
}

/** Trailer + Tesla is not Class C with a different label. */
export function fitScoreTrailer(park) {
  let s = 5;
  if (park.extraVehicle === "included") s += 1.6;
  else if (park.extraVehicle === "fee") s -= 0.3;
  else if (park.extraVehicle === "limited") s -= 2.2;
  else s -= 1.4;

  const pull = park.siteTypes?.includes("pull-through");
  if (park.unhitchFriendly === "yes") s += 1.2;
  else if (park.unhitchFriendly === "tight") s -= pull ? 0.6 : 1.8;
  else if (park.unhitchFriendly === "no") s -= 2.8;
  if (pull) s += 0.8;

  if (securityStaffed(park)) s += 1.1;
  else s -= 1;
  if (park.leaveTrailerUnattended === "good") s += 0.8;
  else if (park.leaveTrailerUnattended === "risky") s -= 2.2;

  const cap = stricterStayNights(park);
  if (cap != null && cap <= 14) s -= 3.5;
  else if (cap != null && cap <= 21) s -= 2.8;
  else if (cap != null && cap < 28) s -= 1.6;

  const nightlyHigh = park.nightlyTo ?? park.nightlyFrom;
  if (nightlyHigh != null && nightlyHigh >= 200) s -= 2.6;

  if (monthlyQuote(park, "blended")) s += 1.2;

  let score = round1(clamp(s, 0, 10));
  // An unknown extra vehicle is not an excellent trailer base.
  if (park.extraVehicle !== "included" && park.extraVehicle !== "fee" && park.extraVehicle !== "limited") {
    score = Math.min(score, 7.9);
  }
  return score;
}

export function fitLabel(score) {
  if (score >= 8) return "excellent";
  if (score >= 6.5) return "good";
  if (score >= 4.5) return "fair";
  return "poor";
}

function crowMiles(park) {
  if (park.lat == null || park.lng == null) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(park.lat - PIER.lat);
  const dLng = toRad(park.lng - PIER.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(PIER.lat)) * Math.cos(toRad(park.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.min(1, Math.sqrt(a))));
}

/** Road miles on the record. If missing, straight-line miles from the Pier, marked estimate. */
export function roadMiles(park) {
  if (park.driveMilesToSantaMonica != null) return { miles: park.driveMilesToSantaMonica, estimated: false };
  const miles = crowMiles(park);
  return { miles, estimated: miles != null };
}

/**
 * 0–20 none, 20–45 small, 45–80 medium, 80–140 heavy, 140+ far (score 0).
 * 140 and above is also the FAR badge and sorts to the bottom of the default rank.
 */
export function proximityScore(miles) {
  if (miles == null) return 5;
  if (miles <= 20) return 10;
  if (miles <= 45) return 7.5;
  if (miles <= 80) return 5;
  if (miles < 140) return 2;
  return 0;
}

/** rankScore = 0.40×quality + 0.30×priceScore + 0.15×fitScore + 0.15×proximityScore */
export function rankScore(quality, price, fit, proximity) {
  return round1(0.4 * quality + 0.3 * price + 0.15 * fit + 0.15 * proximity);
}

export function valueIndex(quality, monthly) {
  if (!monthly) return null;
  return round1(quality / (monthly / 1000));
}

export function isLongTerm(park) {
  const cap = stricterStayNights(park);
  return cap == null || cap >= 28;
}

export function isBeachShortStay(park) {
  const beach = park.beachAccess === "on-sand" || park.beachAccess === "short-walk";
  const cap = stricterStayNights(park);
  return beach && cap != null && cap <= 30;
}

function scoreBundle(park, quality, fitC, fitT, proximity, rateMode) {
  const monthly = effectiveMonthly(park, rateMode);
  const price = round1(clamp(rawPrice(monthly.value) * stayCapFactor(monthly.stayCapNights), 0, 10));
  return {
    value: monthly.value,
    estimated: monthly.estimated,
    kind: monthly.kind,
    priceScore: price,
    rankClassC: rankScore(quality, price, fitC, proximity),
    rankTrailer: rankScore(quality, price, fitT, proximity),
    valueIndex: valueIndex(quality, monthly.value),
  };
}

export function enrichPark(raw) {
  const facts = snapshotFacts(raw);
  const park = materialize(raw);
  const quality = qualityScore(park);
  const fitC = fitScoreClassC(park);
  const fitT = fitScoreTrailer(park);
  const distance = roadMiles(park);
  const proximity = proximityScore(distance.miles);
  const blended = scoreBundle(park, quality, fitC, fitT, proximity, "blended");
  const winter = scoreBundle(park, quality, fitC, fitT, proximity, "winter");
  const bounds = monthlyBounds(park);
  const cap = stricterStayNights(park);
  return {
    ...park,
    qualityScore: quality,
    priceScore: blended.priceScore,
    valueScoreClassC: blended.valueIndex,
    valueScoreTrailer:
      blended.valueIndex == null ? null : round1(clamp(blended.valueIndex + (fitT - fitC) * 0.15, 0, 20)),
    fitClassCScore: fitC,
    fitTrailerScore: fitT,
    fitClassC: fitLabel(fitC),
    fitTrailerTesla: fitLabel(fitT),
    rankClassC: blended.rankClassC,
    rankTrailer: blended.rankTrailer,
    effectiveMonthly: blended.value,
    monthlyEstimated: blended.estimated,
    monthlyKind: blended.kind,
    monthlyBestCase: bounds.best,
    monthlyWorstCase: bounds.worst,
    hasSeasonSplit: winterMid(park) != null && summerMid(park) != null,
    stayCapNights: cap,
    roadMiles: distance.miles,
    milesEstimated: distance.estimated,
    proximityScore: proximity,
    far: distance.miles != null && distance.miles >= 140,
    valueIndex: blended.valueIndex,
    rates: { blended, winter },
    facts,
  };
}

export function rateBundle(park, rateMode = "blended") {
  if (!park.rates) return null;
  return rateMode === "winter" ? park.rates.winter : park.rates.blended;
}

export function rankValue(park, mode, rateMode = "blended") {
  const bundle = rateBundle(park, rateMode);
  if (bundle) return mode === "trailer" ? bundle.rankTrailer : bundle.rankClassC;
  return mode === "trailer" ? park.rankTrailer : park.rankClassC;
}

export function fitValue(park, mode) {
  return mode === "trailer" ? park.fitTrailerScore : park.fitClassCScore;
}

export function compareParks(a, b, mode, sortKey, dir, rateMode = "blended") {
  const key = sortKey || "rank";
  // Default near-Pier rank keeps 140+ mile parks at the bottom, in either direction.
  if (key === "rank" && !!a.far !== !!b.far) return a.far ? 1 : -1;
  const mul = dir === "asc" ? 1 : -1;
  const bundle = (park) => rateBundle(park, rateMode);
  const val = (park) => {
    switch (key) {
      case "name":
        return park.name.toLowerCase();
      case "city":
        return park.city.toLowerCase();
      case "ring":
        return RING_ORDER.indexOf(park.ring);
      case "drive":
        return park.roadMiles ?? 9999;
      case "monthly":
        return bundle(park)?.value ?? park.effectiveMonthly ?? 99999;
      case "stay":
        return park.stayCapNights ?? 9999;
      case "quality":
        return park.qualityScore;
      case "price":
        return bundle(park)?.priceScore ?? park.priceScore;
      case "fit":
        return fitValue(park, mode);
      case "rank":
      default:
        return rankValue(park, mode, rateMode);
    }
  };
  const av = val(a);
  const bv = val(b);
  if (typeof av === "string") return av.localeCompare(bv) * (dir === "asc" ? 1 : -1);
  if (av === bv) return a.name.localeCompare(b.name);
  return (av < bv ? -1 : 1) * mul;
}

export const QUALITY_WEIGHTS = [
  { key: "Reviews", pct: 29 },
  { key: "Amenities", pct: 24 },
  { key: "Noise", pct: 18 },
  { key: "Security", pct: 18 },
  { key: "Wifi", pct: 11 },
];
