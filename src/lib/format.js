export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function money(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function rangeMoney(from, to) {
  if (from == null && to == null) return "";
  if (from != null && to != null && to !== from) return `${money(from)}–${money(to)}`;
  return money(from ?? to);
}

function activeRate(park, rateMode) {
  return park.rates?.[rateMode === "winter" ? "winter" : "blended"] ?? null;
}

export function monthlyLabel(park, rateMode = "blended") {
  const rate = activeRate(park, rateMode);
  const estimated = rate ? rate.estimated : park.monthlyEstimated;
  const value = rate ? rate.value : park.effectiveMonthly;
  if (estimated) return value != null ? `${money(value)} est.` : "No monthly";
  const winter = rangeMoney(park.monthlyWinterFrom ?? null, park.monthlyWinterTo ?? null);
  const summer = rangeMoney(park.monthlySummerFrom ?? null, park.monthlySummerTo ?? null);
  if (winter && summer) return `Winter ${winter} · Summer ${summer}`;
  if (park.monthlyFloorOnly && park.monthlyFrom != null) return `Starting at ${money(park.monthlyFrom)}`;
  if (park.monthlyFrom != null || park.monthlyTo != null) return rangeMoney(park.monthlyFrom, park.monthlyTo);
  if (value != null) return money(value);
  return "No monthly";
}

function stayCapNights(park) {
  if ("stayCapNights" in park) return park.stayCapNights;
  const caps = [park.maxStayNights, park.maxStaySummerNights, park.maxStayPeakNights].filter((n) => n != null);
  return caps.length ? Math.min(...caps) : null;
}

export function stayLabel(park) {
  const cap = stayCapNights(park);
  const summer = park.maxStaySummerNights;
  const peak = park.maxStayPeakNights;
  if (summer != null && summer === cap && (park.maxStayNights == null || summer < park.maxStayNights)) {
    return `${summer} nights summer cap`;
  }
  if (peak != null && peak === cap && park.maxStayNights != null && peak < park.maxStayNights) {
    return `${peak} nights peak / ${park.maxStayNights} off-peak`;
  }
  if (cap == null) {
    return park.maxStayWindowDays ? `Month-to-month · ${park.maxStayWindowDays}-day window` : "Month-to-month";
  }
  if (park.maxStayWindowDays && park.maxStayNights != null) return `${park.maxStayNights} nights / ${park.maxStayWindowDays} days`;
  return `${cap} nights`;
}

function capBadge(park) {
  const cap = stayCapNights(park);
  const summer = park.maxStaySummerNights;
  const peak = park.maxStayPeakNights;
  if (summer != null && summer === cap && (park.maxStayNights == null || summer < park.maxStayNights)) return `${cap} summer`;
  if (peak != null && peak === cap && park.maxStayNights != null && peak < park.maxStayNights) return `${cap} peak`;
  if (park.maxStayNights != null && park.maxStayWindowDays && cap === park.maxStayNights) {
    return `${cap}/${park.maxStayWindowDays}`;
  }
  return String(cap);
}

export function parkBadges(park, rateMode = "blended") {
  const rate = activeRate(park, rateMode);
  const estimated = rate ? rate.estimated : !!park.monthlyEstimated;
  const value = rate ? rate.value : park.effectiveMonthly;
  const cap = stayCapNights(park);
  const badges = [];
  if (!estimated && value != null && (cap == null || cap >= 28)) badges.push("MONTHLY");
  if (cap != null && cap < 28) badges.push(`CAPPED (${capBadge(park)})`);
  if (estimated) badges.push("ESTIMATE");
  if (park.far) badges.push("FAR");
  return badges;
}

export function confidenceLabel(park) {
  return String(park.confidence || "low").toUpperCase();
}

export const PIER = { lat: 34.01, lng: -118.4963, name: "Santa Monica Pier" };

export const COST_LABEL = {
  free: "Free where legal",
  "low-permit": "Low permit or fee",
  ltva: "LTVA permit, not free",
  varies: "Cost varies",
};

export const ACCESS_LABEL = {
  paved: "Paved",
  "graded-gravel": "Graded gravel",
  "high-clearance": "High clearance",
  "4x4": "4x4",
  unknown: "Access unknown",
};
