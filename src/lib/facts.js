/**
 * A money or rule field is { value, sourceUrl, lastVerified, confidence, sourceNote }.
 * Scoring still sees plain numbers. materialize() copies value onto the keys it already uses.
 */

export const FACT_KEYS = [
  "monthlyFrom",
  "monthlyTo",
  "monthlyWinter",
  "monthlySummer",
  "nightlyFrom",
  "nightlyTo",
  "weeklyFrom",
  "stayCapNights",
  "stayCapWindowDays",
  "stayCapSummerNights",
  "stayCapPeakNights",
  "extraVehicle",
  "maxRvLengthFt",
  "electricExtra",
];

export function isFact(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && "value" in value && "sourceUrl" in value && "confidence" in value;
}

export function makeFact(value, sourceUrl, confidence, sourceNote, lastVerified = null) {
  return {
    value: value === undefined ? null : value,
    sourceUrl: sourceUrl || null,
    lastVerified: lastVerified || null,
    confidence: confidence || "low",
    sourceNote: sourceNote || "",
  };
}

export function snapshotFacts(park) {
  const out = {};
  for (const key of FACT_KEYS) {
    if (isFact(park[key])) out[key] = park[key];
  }
  return out;
}

function seasonEnds(fact) {
  const v = fact?.value;
  if (!v || typeof v !== "object") return { from: null, to: null };
  return { from: v.from ?? null, to: v.to ?? null };
}

/** Copy fact values onto the numeric keys scoring.js already reads. Bare numbers pass through. */
export function materialize(raw) {
  const out = { ...raw };
  const pull = (key) => {
    if (isFact(raw[key])) out[key] = raw[key].value;
  };
  for (const key of ["monthlyFrom", "monthlyTo", "nightlyFrom", "nightlyTo", "weeklyFrom", "maxRvLengthFt", "electricExtra", "extraVehicle"]) {
    pull(key);
  }
  if (isFact(raw.monthlyWinter)) {
    const season = seasonEnds(raw.monthlyWinter);
    out.monthlyWinterFrom = season.from;
    out.monthlyWinterTo = season.to;
  }
  if (isFact(raw.monthlySummer)) {
    const season = seasonEnds(raw.monthlySummer);
    out.monthlySummerFrom = season.from;
    out.monthlySummerTo = season.to;
  }
  if (isFact(raw.stayCapNights)) out.maxStayNights = raw.stayCapNights.value ?? null;
  if (isFact(raw.stayCapWindowDays)) out.maxStayWindowDays = raw.stayCapWindowDays.value ?? null;
  if (isFact(raw.stayCapSummerNights)) out.maxStaySummerNights = raw.stayCapSummerNights.value ?? null;
  if (isFact(raw.stayCapPeakNights)) out.maxStayPeakNights = raw.stayCapPeakNights.value ?? null;
  out.officialUrl = raw.officialUrl || raw.website || null;
  return out;
}

export function verifiedOn(park) {
  return /^\d{4}-\d{2}-\d{2}$/.test(park?.lastVerified || "") ? park.lastVerified : null;
}

export function isFresh(park, now = new Date()) {
  const day = verifiedOn(park);
  if (!day) return false;
  const then = new Date(`${day}T00:00:00`);
  const age = now.getTime() - then.getTime();
  return age >= -86400000 && age <= 30 * 86400000;
}

export function isBlockedStatus(park) {
  return park.verify?.status === "blocked";
}

export function isStale(park) {
  const status = park.verify?.status;
  if (status === "blocked") return false;
  if (status === "failed" || status === "stale") return true;
  return !isFresh(park);
}

export function needsCall(park) {
  return park.confidence === "low" || !!park.rateUnverified || (park.monthlyFrom == null && park.monthlyWinterFrom == null);
}

export function verifyMarks(park) {
  const marks = [];
  if (needsCall(park)) marks.push({ cls: "tag-call", text: "CALL TO CONFIRM" });
  if (isBlockedStatus(park)) marks.push({ cls: "tag-blocked", text: "BLOCKED" });
  else if (isStale(park)) marks.push({ cls: "tag-stale", text: "STALE" });
  else if (park.confidence === "high") marks.push({ cls: "tag-high", text: `HIGH ${park.lastVerified}` });
  else marks.push({ cls: "tag-mid", text: `${String(park.confidence || "medium").toUpperCase()} ${park.lastVerified}` });
  return marks;
}

export function oldestVerified(parks) {
  const dates = parks.map((park) => park.lastVerified).filter((day) => typeof day === "string" && day.length > 0);
  dates.sort();
  return dates[0] || "unknown";
}
