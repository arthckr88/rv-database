import { RING_ORDER } from "./geo.js";
import { seasonalFit as climateFit } from "./seasons.js";

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function effectiveMonthly(park) {
  if (park.monthlyFrom != null) {
    return { value: park.monthlyFrom, estimated: false };
  }
  if (park.nightlyFrom != null) {
    return { value: Math.round(park.nightlyFrom * 22), estimated: true };
  }
  return { value: null, estimated: true };
}

function reviewScore(park) {
  if (park.reviewGoogle == null) return 6;
  return (park.reviewGoogle / 5) * 10;
}

function amenityScore(park) {
  let s = 3.8;
  if (park.hookups?.fullHookups) s += 2.1;
  else {
    if (park.hookups?.water) s += 0.45;
    if (park.hookups?.sewer) s += 0.45;
    if (park.hookups?.amp30 || park.hookups?.amp50) s += 0.45;
  }
  if (park.hookups?.amp50) s += 0.35;
  s += Math.min(2.4, (park.amenities?.length || 0) * 0.2);
  if (park.siteTypes?.includes("oceanfront") || park.beachAccess === "on-sand") s += 0.55;
  if (park.siteTypes?.includes("pull-through")) s += 0.25;
  return clamp(s, 0, 10);
}

function noiseScore(park) {
  const n = park.noise || [];
  if (n.includes("quiet")) return 9.1;
  let s = 7.1;
  if (n.includes("freeway")) s -= 2.1;
  if (n.includes("airport")) s -= 2.5;
  if (n.includes("train")) s -= 1.2;
  if (n.includes("tourist")) s -= 0.9;
  if ((park.beachAccess === "on-sand" || park.beachAccess === "short-walk") && !n.includes("airport")) {
    s += 1.1;
  }
  return clamp(s, 0, 10);
}

function securityScore(park) {
  const sec = (park.security || []).join(" ").toLowerCase();
  let s = 3.8;
  if (sec.includes("gated")) s += 2.1;
  if (sec.includes("24")) s += 1.9;
  if (sec.includes("staff")) s += 1.4;
  if (sec.includes("camera")) s += 0.9;
  if (park.leaveTrailerUnattended === "good") s += 0.4;
  if (park.leaveTrailerUnattended === "risky") s -= 1.6;
  return clamp(s, 0, 10);
}

function climateScore(park) {
  let s = 5.2;
  if (park.yearRound) s += 2.4;
  const best = park.bestSeasons?.length ?? 0;
  if (best >= 3) s += 1.1;
  else if (best === 2) s += 0.45;
  if (park.hazards?.includes("hurricane")) s -= 0.55;
  if (park.hazards?.includes("tornado")) s -= 0.35;
  if (park.hazards?.includes("heat") && !park.yearRound) s -= 0.25;
  if (park.beachAccess === "on-sand") s += 0.35;
  return clamp(s, 0, 10);
}

function wifiScore(park) {
  switch (park.wifi) {
    case "good":
      return 8.8;
    case "ok":
      return 6.2;
    case "poor":
      return 3.1;
    default:
      return 5.2;
  }
}

export function qualityScore(park) {
  const q =
    0.25 * reviewScore(park) +
    0.2 * amenityScore(park) +
    0.15 * noiseScore(park) +
    0.15 * securityScore(park) +
    0.15 * climateScore(park) +
    0.1 * wifiScore(park);
  return round1(clamp(q, 0, 10));
}

export function priceScore(park) {
  const { value, estimated } = effectiveMonthly(park);
  if (value == null) return 5;
  let s = 9.0 - (value - 700) / 380;
  if (value >= 2000) s -= 1.2;
  if (value >= 3000) s -= 0.6;
  const cap = park.maxStayNights;
  if (cap != null) {
    if (cap <= 14) s -= 3.2;
    else if (cap <= 21) s -= 2.6;
    else if (cap <= 30) s -= 1.6;
    else if (cap <= 180) s -= 0.5;
  }
  if (estimated) s -= 0.25;
  return round1(clamp(s, 0, 10));
}

export function fitScoreClassC(park) {
  let s = 7.6;
  if (park.maxRvLengthFt != null && park.maxRvLengthFt < 28) s -= 2;
  if (park.unhitchFriendly === "tight") s -= 0.5;
  if (park.unhitchFriendly === "no") s -= 1.1;
  if (park.hookups?.fullHookups) s += 0.8;
  else s -= 1.5;
  const cap = park.maxStayNights;
  if (cap != null && cap <= 21) s -= 2.2;
  else if (cap != null && cap <= 30) s -= 1.2;
  else if (cap == null) s += 1.2;
  if (park.wifi === "good") s += 0.35;
  if (park.wifi === "poor") s -= 0.8;
  if (park.ageRestriction === "55+") s -= 0.15;
  return round1(clamp(s, 0, 10));
}

export function fitScoreTrailer(park) {
  let s = 5.4;
  if (park.extraVehicle === "included") s += 1.1;
  else if (park.extraVehicle === "fee") s += 0.25;
  else if (park.extraVehicle === "limited") s -= 1.3;
  if (park.unhitchFriendly === "yes") s += 0.8;
  else if (park.unhitchFriendly === "tight") s -= 1.1;
  else if (park.unhitchFriendly === "no") s -= 2.2;
  if (park.leaveTrailerUnattended === "good") s += 0.9;
  else if (park.leaveTrailerUnattended === "ok") s += 0.25;
  else if (park.leaveTrailerUnattended === "risky") s -= 2.1;
  const sec = (park.security || []).join(" ").toLowerCase();
  if (sec.includes("gated") || sec.includes("24")) s += 0.6;
  if (park.siteTypes?.includes("pull-through")) s += 0.35;
  const cap = park.maxStayNights;
  if (cap != null && cap <= 21) s -= 2.5;
  else if (cap != null && cap <= 30) s -= 1.5;
  else if (cap == null) s += 0.9;
  if (park.nightlyFrom != null && park.nightlyFrom >= 200) s -= 2;
  const { value } = effectiveMonthly(park);
  if (value != null && value >= 2400) s -= 0.8;
  if ((park.noise || []).includes("tourist")) s -= 0.8;
  if (!park.hookups?.fullHookups) s -= 1.4;
  return round1(clamp(s, 0, 10));
}

export function fitLabel(score) {
  if (score >= 8) return "excellent";
  if (score >= 6.5) return "good";
  if (score >= 4.5) return "fair";
  return "poor";
}

export function seasonalFit(park, season) {
  return climateFit(park, season);
}

export function rankScore(quality, price, fit, seasonal = 7) {
  return round1(0.38 * quality + 0.32 * price + 0.15 * fit + 0.15 * seasonal);
}

export function valueIndex(quality, monthly) {
  if (!monthly) return null;
  return round1(quality / (monthly / 1000));
}

export function seasonalValue(park, season) {
  if (park.valueIndex == null) return null;
  return round1(park.valueIndex * (seasonalFit(park, season) / 8));
}

export function enrichPark(park) {
  const quality = qualityScore(park);
  const price = priceScore(park);
  const fitC = fitScoreClassC(park);
  const fitT = fitScoreTrailer(park);
  const monthly = effectiveMonthly(park);
  const extraFeeDrag = park.extraVehicle === "fee" || park.extraVehicle === "limited" ? 0.4 : 0;
  const value = valueIndex(quality, monthly.value);
  return {
    ...park,
    qualityScore: quality,
    priceScore: price,
    valueScoreClassC: value == null ? null : round1(clamp(value, 0, 10)),
    valueScoreTrailer: value == null ? null : round1(clamp(value - extraFeeDrag, 0, 10)),
    fitClassCScore: fitC,
    fitTrailerScore: fitT,
    fitClassC: fitLabel(fitC),
    fitTrailerTesla: fitLabel(fitT),
    rankClassC: rankScore(quality, price, fitC, seasonalFit(park, "")),
    rankTrailer: rankScore(quality, price, fitT, seasonalFit(park, "")),
    effectiveMonthly: monthly.value,
    monthlyEstimated: monthly.estimated,
    valueIndex: value,
  };
}

export function rankValue(park, mode, season = "") {
  const fit = mode === "trailer" ? park.fitTrailerScore : park.fitClassCScore;
  return rankScore(park.qualityScore, park.priceScore, fit, seasonalFit(park, season));
}

export function compareParks(a, b, mode, sortKey, dir, season = "") {
  const mul = dir === "asc" ? 1 : -1;
  const val = (park) => {
    switch (sortKey) {
      case "rank":
        return rankValue(park, mode, season);
      case "name":
        return park.name.toLowerCase();
      case "state":
        return park.state;
      case "city":
        return park.city.toLowerCase();
      case "ring":
        return RING_ORDER.indexOf(park.ring);
      case "drive":
        return park.driveMinutesOffPeak ?? 9999;
      case "airport":
        return park.driveMinutesToAirport ?? 9999;
      case "nightly":
        return park.nightlyFrom ?? 9999;
      case "monthly":
        return park.effectiveMonthly ?? 99999;
      case "stay":
        return park.maxStayNights ?? 9999;
      case "quality":
        return park.qualityScore;
      case "value":
        return seasonalValue(park, season) ?? park.valueIndex ?? -1;
      case "season":
        return seasonalFit(park, season);
      case "fitC":
        return park.fitClassCScore;
      case "fitT":
        return park.fitTrailerScore;
      default:
        return rankValue(park, mode, season);
    }
  };
  const av = val(a);
  const bv = val(b);
  if (typeof av === "string") return av.localeCompare(bv) * (dir === "asc" ? 1 : -1);
  if (av === bv) return a.name.localeCompare(b.name);
  return (av < bv ? -1 : 1) * mul;
}

export const QUALITY_WEIGHTS = [
  { key: "Review rating", pct: 25 },
  { key: "Amenities / site quality", pct: 20 },
  { key: "Noise / setting", pct: 15 },
  { key: "Security", pct: 15 },
  { key: "Year-round climate / livability", pct: 15 },
  { key: "Wifi / livability", pct: 10 },
];
