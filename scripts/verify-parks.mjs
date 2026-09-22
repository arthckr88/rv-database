/**
 * Fetch each park's official page and compare money and stay rules.
 * A failed fetch or a weak parse leaves the stored number alone.
 * Does not read Campendium, iOverlander, AllStays, Google, or Yelp.
 *
 *   npm run verify:parks
 *   node scripts/verify-parks.mjs --check   # print only, do not write JSON
 */
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isFact, makeFact, materialize } from "../src/lib/facts.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const parksPath = join(root, "src/data/parks.json");
const logPath = join(root, "src/data/verifyLog.json");
const cacheDir = join(root, ".cache/verify");
const execFileAsync = promisify(execFile);
const checkOnly = process.argv.includes("--check");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const RATE_PAGE = {
  "hollywood-rv": "https://hollywoodrvpark.com/application/",
  "pacific-wilmington": "https://www.pacificrvpark.com/sites-rates/",
  "faria-beach": "https://parks.venturacounty.gov/county-parks/faria-beach-park/",
};

const EXTRA_PAGE = {
  "hollywood-rv": "https://hollywoodrvpark.com/",
  "newport-dunes": "https://www.newportdunes.com/rv-rates/",
  "canyon-rv": "https://canyonrvpark.com/reservations",
  "leo-carrillo": "https://reservecalifornia.com/park/665",
  "emma-wood": "https://reservecalifornia.com/park/642",
};

/** One official alternate when the first host returns 403 or 404. */
const ALTERNATE_PAGE = {
  "malibu-beach": "https://www.maliburv.com/",
  "evergreen-oxnard": "https://www.stayatevergreenrv.com/",
  "golden-village-palms": "https://www.goldenvillagepalms.com/faqs",
};

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function money(raw) {
  if (raw == null) return null;
  const n = Math.round(Number(String(raw).replace(/[$,\s]/g, "")));
  if (!Number.isFinite(n) || n < 20 || n > 20000) return null;
  return n;
}

function nights(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 400) return null;
  return n;
}

function feet(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 10 || n > 80) return null;
  return n;
}

function htmlToText(html) {
  let out = "";
  let i = 0;
  const lower = html.toLowerCase();
  while (i < html.length) {
    if (lower.startsWith("<script", i) || lower.startsWith("<style", i)) {
      const tag = lower.startsWith("<script", i) ? "script" : "style";
      const end = lower.indexOf(`</${tag}>`, i);
      i = end === -1 ? html.length : end + tag.length + 3;
      continue;
    }
    if (html[i] === "<") {
      const end = html.indexOf(">", i);
      i = end === -1 ? html.length : end + 1;
      out += " ";
      continue;
    }
    out += html[i];
    i += 1;
  }
  return out
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function isBlocked(html) {
  const head = html.slice(0, 2500).toLowerCase();
  return head.includes("just a moment") || head.includes("cf-browser-verification") || head.includes("attention required") || head.includes("verify you are human");
}

function field(name, value, confident, note, sourceUrl) {
  return {
    field: name,
    value: value === undefined ? null : value,
    confident: !!confident,
    note,
    sourceUrl,
  };
}

function equal(a, b) {
  if (a && typeof a === "object" && b && typeof b === "object" && "from" in a && "from" in b) {
    return (a.from ?? null) === (b.from ?? null) && (a.to ?? null) === (b.to ?? null);
  }
  return (a ?? null) === (b ?? null);
}

function show(value) {
  if (value == null) return "—";
  if (typeof value === "object" && "from" in value) return `${value.from ?? "—"}–${value.to ?? "—"}`;
  return String(value);
}

function walnut(text, url) {
  const monthly = money(text.match(/Monthly Rates \$([\d,]+)/i)?.[1]);
  const nightly = money(text.match(/Nightly rates starting at \$([\d,]+)/i)?.[1]);
  const premium = money(text.match(/Pull-through premium sites[^$]{0,40}\$([\d,]+)/i)?.[1]);
  const deposit = money(text.match(/\$([\d,]+) deposit for final electric charges/i)?.[1]);
  return [
    field("monthlyFrom", monthly, monthly != null, "Monthly Rates on walnutrvpark.com.", url),
    field("monthlyTo", monthly, monthly != null, "Single published monthly, not a range.", url),
    field("nightlyFrom", nightly, nightly != null, "Nightly starts at the basic site.", url),
    field("nightlyTo", premium, premium != null, "Pull-through premium nightly on the same card.", url),
    field(
      "electricExtra",
      deposit != null ? `metered; $${deposit} deposit for final electric charges` : null,
      deposit != null,
      "Deposit line next to the monthly rate.",
      url,
    ),
  ];
}

function hollywood(text, url, nightlyUrl) {
  const monthly = money(text.match(/Monthly Rates starting at\s*:?\s*\$([\d,]+)/i)?.[1]);
  const daily = money(text.match(/Daily Rates\s*:\s*\$([\d,]+(?:\.\d+)?)/i)?.[1]);
  const plus = /\+\s*electricity/i.test(text);
  return [
    field("monthlyFrom", monthly, monthly != null, "Application page: monthly starting at, plus electricity.", url),
    field("monthlyTo", null, monthly != null, "Starting at. No ceiling on the application page.", url),
    field("nightlyFrom", daily, daily != null, "Daily rate on the Hollywood homepage.", nightlyUrl || url),
    field("nightlyTo", daily, daily != null, "One published daily rate.", nightlyUrl || url),
    field(
      "electricExtra",
      plus && monthly != null ? `not included; application says $${monthly.toLocaleString("en-US")} plus electricity` : null,
      plus && monthly != null,
      "Application page adds electricity on top of the monthly.",
      url,
    ),
  ];
}

function silverland(text, url) {
  const monthly = money(text.match(/Monthly Rate:\s*\$([\d,]+(?:\.\d+)?)/i)?.[1]);
  const daily = money(text.match(/Daily Rate:\s*\$([\d,]+(?:\.\d+)?)/i)?.[1]);
  const included = /Sewer, Water, Electric, Wi-Fi, Tax, and Car or Truck INCLUDED/i.test(text);
  return [
    field("monthlyFrom", monthly, monthly != null, "Monthly rate on silverlandrv.com.", url),
    field("monthlyTo", monthly, monthly != null, "Single published monthly.", url),
    field("nightlyFrom", daily, daily != null, "Daily rate on silverlandrv.com.", url),
    field("nightlyTo", daily, daily != null, "Single published daily rate.", url),
    field("extraVehicle", "included", included, "Car or truck included in the published rate.", url),
    field(
      "electricExtra",
      included ? "included (site rate includes sewer, water, electric, Wi-Fi, tax)" : null,
      included,
      "Rate line includes electric.",
      url,
    ),
  ];
}

function dockweiler(text, url) {
  const back = money(text.match(/Back Row Full Hookup Space \$(\d+)/i)?.[1]);
  const front = money(text.match(/Front Row Full Hookup Space \$(\d+)/i)?.[1]);
  const stay = text.match(/Maximum stay is (\d+) nights within a (\d+)-day period/i);
  const cap = nights(stay?.[1]);
  const windowDays = nights(stay?.[2]);
  const length = feet(text.match(/Recreational Vehicle size limit is (\d+) feet/i)?.[1]);
  const sawDaily = back != null && front != null && cap != null;
  return [
    field("monthlyFrom", null, sawDaily, "County page publishes a daily fee and a night cap, not a monthly.", url),
    field("monthlyTo", null, sawDaily, "No monthly on the county page.", url),
    field("nightlyFrom", back, back != null, "Back-row full hookup per day.", url),
    field("nightlyTo", front, front != null, "Front-row full hookup per day.", url),
    field("stayCapNights", cap, cap != null, "Maximum stay on the county page.", url),
    field("stayCapWindowDays", windowDays, windowDays != null, "Stay window on the county page.", url),
    field("maxRvLengthFt", length, length != null, "Recreational vehicle size limit.", url),
  ];
}

function newport(text, url, nightlyUrl) {
  const small = text.match(/Small Standard Site \$([\d,.]+)\*?\s*\$([\d,.]+)/i);
  const deluxe = text.match(/Select Deluxe \$([\d,.]+)\*?\s*\$([\d,.]+)/i);
  const winterFrom = money(small?.[1]);
  const summerFrom = money(small?.[2]);
  const winterTo = money(deluxe?.[1]);
  const summerTo = money(deluxe?.[2]);
  const seasonOk = winterFrom != null && summerFrom != null && winterTo != null && summerTo != null && winterTo > winterFrom && summerTo > summerFrom;
  const stay = text.match(/(\d+) nights after (\d+) nights/i);
  const cap = nights(stay?.[2]);
  const capOk = cap != null && cap >= 28;
  const smallNight = [...text.matchAll(/Small Sites[\s\S]{0,90}?\$\s*([\d,.]+)[\s\S]{0,40}?\$\s*([\d,.]+)/gi)];
  const superNight = [...text.matchAll(/Supersites[\s\S]{0,90}?\$\s*([\d,.]+)[\s\S]{0,40}?\$\s*([\d,.]+)/gi)];
  const nightlyFrom = smallNight.length ? money(smallNight[0][1]) : null;
  const nightlyHighs = superNight.map((match) => money(match[2])).filter((n) => n != null);
  const nightlyTo = nightlyHighs.length ? Math.max(...nightlyHighs) : null;
  const nightlyOk = smallNight.length >= 1 && superNight.length >= 2 && nightlyFrom != null && nightlyTo != null && nightlyTo > nightlyFrom;
  return [
    field("monthlyFrom", winterFrom, seasonOk, "Winter small-standard monthly.", url),
    field("monthlyTo", winterTo, seasonOk, "Winter select-deluxe monthly.", url),
    field("monthlyWinter", seasonOk ? { from: winterFrom, to: winterTo } : null, seasonOk, "Winter column, small standard through select deluxe.", url),
    field("monthlySummer", seasonOk ? { from: summerFrom, to: summerTo } : null, seasonOk, "Summer column, small standard through select deluxe.", url),
    field("stayCapNights", cap, capOk, "Must leave for 7 nights after this many nights.", url),
    field("nightlyFrom", nightlyFrom, nightlyOk, "Winter small-site daily floor.", nightlyUrl || url),
    field("nightlyTo", nightlyTo, nightlyOk, "Highest daily ceiling on the rates page.", nightlyUrl || url),
  ];
}

function pacific(text, url) {
  const monthly = money(text.match(/Monthly:\s*Starting at \$([\d,]+)/i)?.[1]);
  const weekday = money(text.match(/Daily:\s*\$(\d+)\s*Weekdays/i)?.[1]);
  const weekend = money(text.match(/\$(\d+)\s*Fri/i)?.[1]);
  return [
    field("monthlyFrom", monthly, monthly != null, "Monthly starting at. Varies by length, occupants, and pets.", url),
    field("monthlyTo", null, monthly != null, "Starting at. No ceiling on the rates page.", url),
    field("nightlyFrom", weekday, weekday != null, "Weekday daily rate.", url),
    field("nightlyTo", weekend, weekend != null, "Friday–Saturday daily rate.", url),
  ];
}

function sanBernardino(text, url) {
  const monthly = money(text.match(/Monthly Rates Starting at \$(\d+)/i)?.[1]);
  const metered = /Metered 30- and 50-amp electricity/i.test(text);
  return [
    field("monthlyFrom", monthly, monthly != null, "Monthly rates starting at. Water and electric are extra.", url),
    field("monthlyTo", null, monthly != null, "Starting at. No ceiling on the page.", url),
    field(
      "electricExtra",
      monthly != null && metered ? `metered 30/50 amp; not included in the $${monthly}` : null,
      monthly != null && metered,
      "Page says water is a flat fee and electric is metered.",
      url,
    ),
  ];
}

function venturaOaks(text, url) {
  const range = text.match(/monthly rates ranging from \$(\d+) to \$(\d+)/i);
  const from = money(range?.[1]);
  const to = money(range?.[2]);
  const ok = from != null && to != null && to >= from;
  return [
    field("monthlyFrom", from, ok, "Long-term monthly floor on venturaoaks.com.", url),
    field("monthlyTo", to, ok, "Long-term monthly ceiling on venturaoaks.com.", url),
  ];
}

function ramona(text, url) {
  const monthly = money(text.match(/Monthly Starting at \$(\d+)/i)?.[1]);
  const nightly = money(text.match(/Back In Site[\s\S]{0,160}From \$(\d+)\/Night/i)?.[1]);
  return [
    field("monthlyFrom", monthly, monthly != null, "Monthly starting at, plus utilities.", url),
    field("monthlyTo", null, monthly != null, "Starting at. No ceiling on the rates page.", url),
    field("nightlyFrom", nightly, nightly != null, "Back-in full-hookup nightly floor.", url),
  ];
}

function goldenShore(text, url) {
  const weekday = money(text.match(/Sunday-Thursday \$([\d.]+) per night/i)?.[1]);
  const weekend = money(text.match(/required \$([\d.]+) per night/i)?.[1]);
  const weekly = money(text.match(/\$([\d.]+) Per Week/i)?.[1]);
  const summer = /Two Week Maximum Stay During the Summer Months/i.test(text);
  const sawCard = weekday != null && weekend != null;
  return [
    field("nightlyFrom", weekday, sawCard, "Sunday–Thursday nightly.", url),
    field("nightlyTo", weekend, sawCard, "Friday–Saturday nightly. Grand Prix weekend is excluded.", url),
    field("weeklyFrom", weekly, weekly != null, "Published weekly rate.", url),
    field("monthlyFrom", null, sawCard, "Rates page lists daily and weekly, not a monthly.", url),
    field("monthlyTo", null, sawCard, "No monthly ceiling.", url),
    field("stayCapSummerNights", summer ? 14 : null, summer, "Two-week maximum during summer months.", url),
  ];
}

function malibu(text, url) {
  const rows = [...text.matchAll(/(?<!Tent )(No View|VIP Ocean View)\s+\$([\d,]+)\s+\$([\d,]+)\s+\$([\d,]+)\s+\$([\d,]+)/gi)];
  const months = rows.map((row) => money(row[5])).filter((n) => n != null);
  const nights = rows.flatMap((row) => [money(row[2]), money(row[3])]).filter((n) => n != null);
  const ok = months.length >= 2 && nights.length >= 2;
  return [
    field("monthlyFrom", ok ? Math.min(...months) : null, ok, "Lowest RV monthly on the rate table.", url),
    field("monthlyTo", ok ? Math.max(...months) : null, ok, "Highest RV monthly on the rate table.", url),
    field("nightlyFrom", ok ? Math.min(...nights) : null, ok, "Lowest RV weekday or weekend nightly.", url),
    field("nightlyTo", ok ? Math.max(...nights) : null, ok, "Highest RV weekday or weekend nightly.", url),
  ];
}

function fairplex(text, url) {
  const nightly = money(text.match(/(?:per night|nightly)[^$]{0,40}\$([\d,]+)/i)?.[1]);
  const monthly = money(text.match(/monthly[^$]{0,40}\$([\d,]+)/i)?.[1]);
  return [
    field("nightlyFrom", nightly, nightly != null, "Nightly on the Fairplex RV page.", url),
    field("monthlyFrom", monthly, monthly != null, "Monthly on the Fairplex RV page.", url),
  ];
}

function canyon(text, url) {
  const card = text.match(/Daily \$(\d+)\s+Weekly \$(\d+)\s+Monthly Call for Pricing/i);
  const daily = money(card?.[1] || text.match(/\$(\d+) per night or \$(\d+) per week/i)?.[1]);
  const weekly = money(card?.[2] || text.match(/\$(\d+) per night or \$(\d+) per week/i)?.[2]);
  const call = /Monthly Call for Pricing/i.test(text);
  const ok = daily != null;
  return [
    field("nightlyFrom", daily, ok, "RV daily rate.", url),
    field("nightlyTo", daily, ok, "One published RV daily rate.", url),
    field("weeklyFrom", weekly, weekly != null, "RV weekly rate.", url),
    field("monthlyFrom", null, call, "Monthly says call for pricing. No dollar.", url),
    field("monthlyTo", null, call, "No monthly ceiling.", url),
  ];
}

function stateParkMissingCampingRate(text, url) {
  const cap = nights(text.match(/maximum stay of (\d+) nights/i)?.[1]);
  const camping = money(text.match(/Camping Fees[\s\S]{0,180}\$([\d.]+)\s*per night/i)?.[1]);
  return [
    field("nightlyFrom", camping, camping != null, "Camping fee per night on the state park page.", url),
    field("stayCapNights", cap, cap != null, "Maximum stay published on the state park page.", url),
  ];
}

function bolsa(text, url) {
  const front = money(text.match(/Front Row \(Beach Side\): \$([\d.]+) per night/i)?.[1]);
  const back = money(text.match(/Back Row \(Highway Side\): \$([\d.]+) per night/i)?.[1]);
  const length = feet(text.match(/Max trailer:\s*(\d+) feet/i)?.[1]);
  const ok = front != null && back != null;
  return [
    field("nightlyFrom", ok ? Math.min(front, back) : null, ok, "Lower of the two full-hookup rows.", url),
    field("nightlyTo", ok ? Math.max(front, back) : null, ok, "Higher of the two full-hookup rows.", url),
    field("maxRvLengthFt", length, length != null, "Max trailer length on the state park page.", url),
    field("monthlyFrom", null, ok, "State park page publishes a nightly camping fee, not a monthly.", url),
    field("monthlyTo", null, ok, "No monthly.", url),
  ];
}

function faria(text, url) {
  const hook = text.match(/(?<!Non-)Hook-up Sites \$([\d.]+) per day peak season, \$([\d.]+) per day off season[\s\S]{0,160}\$([\d.]+) per day peak season, \$([\d.]+) per day off season/i);
  const nums = hook ? hook.slice(1, 5).map(money).filter((n) => n != null) : [];
  const ok = nums.length === 4;
  const stay = /Length of Stay\s+7 days/i.test(text) ? 7 : null;
  return [
    field("nightlyFrom", ok ? Math.min(...nums) : null, ok, "Lowest hook-up daily rate on the county page.", url),
    field("nightlyTo", ok ? Math.max(...nums) : null, ok, "Highest hook-up daily rate on the county page.", url),
    field("monthlyFrom", null, ok, "County page publishes a daily fee, not a monthly.", url),
    field("monthlyTo", null, ok, "No monthly.", url),
    field("stayCapNights", stay, stay != null, "7 days across the three beach parks.", url),
  ];
}

function rincon(text, url) {
  const fee = text.match(/RV Fees \$([\d.]+) per day peak season, \$([\d.]+) per day off season/i);
  const peak = money(fee?.[1]);
  const off = money(fee?.[2]);
  const ok = peak != null && off != null;
  const stay = /Length of Stay\s+7 days/i.test(text) ? 7 : null;
  return [
    field("nightlyFrom", ok ? Math.min(peak, off) : null, ok, "Off-season RV daily rate.", url),
    field("nightlyTo", ok ? Math.max(peak, off) : null, ok, "Peak-season RV daily rate.", url),
    field("monthlyFrom", null, ok, "County page publishes a daily fee, not a monthly.", url),
    field("monthlyTo", null, ok, "No monthly.", url),
    field("stayCapNights", stay, stay != null, "7 days across the three beach parks.", url),
  ];
}

function venturaBeach(text, url) {
  const start = text.indexOf("RV SITES");
  const end = text.indexOf("Added Tent");
  const slice = start >= 0 && end > start ? text.slice(start, end) : "";
  const nums = [...slice.matchAll(/\$([\d,]+\.\d{2})/g)].map((match) => money(match[1])).filter((n) => n != null);
  const ok = nums.length >= 2;
  return [
    field("nightlyFrom", ok ? Math.min(...nums) : null, ok, "Lowest daily RV rate on the rate card, with tax.", url),
    field("nightlyTo", ok ? Math.max(...nums) : null, ok, "Highest RV rate on the card, including holiday, with tax.", url),
    field("monthlyFrom", null, ok, "Rate card is daily and holiday, not a monthly.", url),
    field("monthlyTo", null, ok, "No monthly.", url),
  ];
}

function pismo(text, url) {
  const nonPrime = money(text.match(/Non-Prime[\s\S]{0,100}\$\s*(\d+)\s*00/i)?.[1]);
  const prime = money(text.match(/2026 Prime Time[\s\S]{0,100}\$\s*(\d+)\s*00/i)?.[1]);
  const stay = nights(text.match(/Maximum stay is (\d+) consecutive nights/i)?.[1]);
  const ok = nonPrime != null && prime != null;
  return [
    field("nightlyFrom", ok ? Math.min(nonPrime, prime) : null, ok, "Non-prime starting nightly, before tax.", url),
    field("nightlyTo", ok ? Math.max(nonPrime, prime) : null, ok, "Prime starting nightly, before tax.", url),
    field("monthlyFrom", null, ok, "Rate page publishes a nightly start, not a monthly.", url),
    field("monthlyTo", null, ok, "No monthly.", url),
    field("stayCapNights", stay, stay != null, "Maximum consecutive nights.", url),
  ];
}

function evergreen(text, url) {
  const monthly = money(text.match(/Monthly[^$]{0,40}\$([\d,]+)/i)?.[1]);
  return [field("monthlyFrom", monthly, monthly != null, "Monthly on the Evergreen rates page.", url)];
}

function goldenVillage(text, url) {
  const monthly = money(text.match(/monthly[^$]{0,40}\$([\d,]+)/i)?.[1]);
  const call = monthly == null && /monthly[^.]{0,80}call/i.test(text);
  return [
    field(
      "monthlyFrom",
      monthly,
      monthly != null || call,
      monthly != null ? "Monthly dollar on the resort site." : "Monthly section says to call. No dollar on the page.",
      url,
    ),
  ];
}

function valencia(text, url) {
  const noMonthly = /Monthly\s+Contact for Pricing/i.test(text);
  const daily = money(text.match(/\$(\d+)\/day \(October/i)?.[1]);
  const topped = /\$\s*85-105/.test(text);
  return [
    field("monthlyFrom", null, noMonthly, "Monthly section says contact for pricing. No monthly dollar.", url),
    field("monthlyTo", null, noMonthly, "No monthly ceiling published.", url),
    field("nightlyFrom", daily, daily != null, "October–May daily rate.", url),
    field("nightlyTo", topped ? 105 : null, topped, "Daily card is listed as $85–$105.", url),
  ];
}

const EXTRACTORS = {
  walnut,
  "hollywood-rv": hollywood,
  silverland,
  dockweiler,
  "newport-dunes": newport,
  "pacific-wilmington": pacific,
  "san-bernardino-rv": sanBernardino,
  "valencia-travel-village": valencia,
  "ventura-oaks": venturaOaks,
  "ramona-oaks": ramona,
  "golden-shore": goldenShore,
  "malibu-beach": malibu,
  fairplex,
  "canyon-rv": canyon,
  "leo-carrillo": stateParkMissingCampingRate,
  "emma-wood": stateParkMissingCampingRate,
  "bolsa-chica": bolsa,
  "faria-beach": faria,
  "rincon-parkway": rincon,
  "ventura-beach": venturaBeach,
  "pismo-coast-village": pismo,
  "evergreen-oxnard": evergreen,
  "golden-village-palms": goldenVillage,
};

function anchorOk(id, fields) {
  const by = Object.fromEntries(fields.map((row) => [row.field, row]));
  const yes = (name) => !!by[name]?.confident;
  if (id === "dockweiler") return yes("nightlyFrom") && yes("stayCapNights");
  if (id === "valencia-travel-village") return yes("monthlyFrom") && yes("nightlyFrom");
  if (id === "newport-dunes") return yes("monthlyWinter") && yes("monthlySummer");
  if (id === "ventura-oaks" || id === "ramona-oaks") return yes("monthlyFrom");
  if (
    id === "golden-shore" ||
    id === "canyon-rv" ||
    id === "bolsa-chica" ||
    id === "faria-beach" ||
    id === "rincon-parkway" ||
    id === "ventura-beach" ||
    id === "pismo-coast-village" ||
    id === "leo-carrillo" ||
    id === "emma-wood" ||
    id === "fairplex" ||
    id === "malibu-beach"
  ) {
    return yes("nightlyFrom");
  }
  if (id === "evergreen-oxnard" || id === "golden-village-palms") return yes("monthlyFrom");
  return yes("monthlyFrom");
}

function bare(park, key) {
  if (isFact(park[key])) return park[key].value;
  return park[key] === undefined ? null : park[key];
}

function seasonBare(park, factKey, fromKey, toKey) {
  if (isFact(park[factKey])) {
    const value = park[factKey].value;
    if (!value || typeof value !== "object") return { from: null, to: null };
    return { from: value.from ?? null, to: value.to ?? null };
  }
  return { from: park[fromKey] ?? null, to: park[toKey] ?? null };
}

function migratePark(park) {
  const before = {
    monthlyFrom: bare(park, "monthlyFrom"),
    monthlyTo: bare(park, "monthlyTo"),
    monthlyWinter: seasonBare(park, "monthlyWinter", "monthlyWinterFrom", "monthlyWinterTo"),
    monthlySummer: seasonBare(park, "monthlySummer", "monthlySummerFrom", "monthlySummerTo"),
    nightlyFrom: bare(park, "nightlyFrom"),
    nightlyTo: bare(park, "nightlyTo"),
    weeklyFrom: bare(park, "weeklyFrom"),
    stayCapNights: isFact(park.stayCapNights) ? park.stayCapNights.value : park.maxStayNights ?? null,
    stayCapWindowDays: isFact(park.stayCapWindowDays) ? park.stayCapWindowDays.value : park.maxStayWindowDays ?? null,
    stayCapSummerNights: isFact(park.stayCapSummerNights) ? park.stayCapSummerNights.value : park.maxStaySummerNights ?? null,
    stayCapPeakNights: isFact(park.stayCapPeakNights) ? park.stayCapPeakNights.value : park.maxStayPeakNights ?? null,
    extraVehicle: bare(park, "extraVehicle"),
    maxRvLengthFt: bare(park, "maxRvLengthFt"),
    electricExtra: bare(park, "electricExtra"),
  };
  const url = RATE_PAGE[park.id] || park.officialUrl || park.website || null;
  park.officialUrl = url;
  const confidence = park.confidence || "low";
  const pending = "On the park record. Not re-checked by this run yet.";
  const put = (key, value, sourceNote) => {
    if (isFact(park[key])) return;
    park[key] = makeFact(value, url, confidence, sourceNote, null);
  };
  put("monthlyFrom", before.monthlyFrom, "Monthly floor on the park record.");
  put("monthlyTo", before.monthlyTo, "Monthly ceiling on the park record.");
  if (!isFact(park.monthlyWinter)) {
    const season = before.monthlyWinter;
    const empty = season.from == null && season.to == null;
    park.monthlyWinter = makeFact(empty ? null : { from: season.from, to: season.to }, url, confidence, empty ? "No separate winter monthly on the record." : "Winter monthly range on the record.", null);
  }
  if (!isFact(park.monthlySummer)) {
    const season = before.monthlySummer;
    const empty = season.from == null && season.to == null;
    park.monthlySummer = makeFact(empty ? null : { from: season.from, to: season.to }, url, confidence, empty ? "No separate summer monthly on the record." : "Summer monthly range on the record.", null);
  }
  delete park.monthlyWinterFrom;
  delete park.monthlyWinterTo;
  delete park.monthlySummerFrom;
  delete park.monthlySummerTo;
  put("nightlyFrom", before.nightlyFrom, "Nightly floor on the park record.");
  put("nightlyTo", before.nightlyTo, "Nightly ceiling on the park record.");
  put("weeklyFrom", before.weeklyFrom, "Weekly rate on the park record.");
  put("stayCapNights", before.stayCapNights, "Stay cap on the park record.");
  put("stayCapWindowDays", before.stayCapWindowDays, "Stay window on the park record.");
  put("stayCapSummerNights", before.stayCapSummerNights, "Summer stay cap on the park record.");
  put("stayCapPeakNights", before.stayCapPeakNights, "Peak stay cap on the park record.");
  delete park.maxStayNights;
  delete park.maxStayWindowDays;
  delete park.maxStaySummerNights;
  delete park.maxStayPeakNights;
  put("extraVehicle", before.extraVehicle, "Extra-vehicle rule on the park record.");
  put("maxRvLengthFt", before.maxRvLengthFt, "Maximum length on the park record.");
  put("electricExtra", before.electricExtra, "Electric note on the park record.");
  return before;
}

function assertMigration(park, before) {
  const flat = materialize(park);
  const checks = [
    ["monthlyFrom", flat.monthlyFrom, before.monthlyFrom],
    ["monthlyTo", flat.monthlyTo, before.monthlyTo],
    ["nightlyFrom", flat.nightlyFrom, before.nightlyFrom],
    ["nightlyTo", flat.nightlyTo, before.nightlyTo],
    ["weeklyFrom", flat.weeklyFrom, before.weeklyFrom],
    ["maxStayNights", flat.maxStayNights, before.stayCapNights],
    ["maxStayWindowDays", flat.maxStayWindowDays, before.stayCapWindowDays],
    ["maxStaySummerNights", flat.maxStaySummerNights, before.stayCapSummerNights],
    ["maxStayPeakNights", flat.maxStayPeakNights, before.stayCapPeakNights],
    ["extraVehicle", flat.extraVehicle, before.extraVehicle],
    ["maxRvLengthFt", flat.maxRvLengthFt, before.maxRvLengthFt],
    ["monthlyWinterFrom", flat.monthlyWinterFrom ?? null, before.monthlyWinter.from],
    ["monthlyWinterTo", flat.monthlyWinterTo ?? null, before.monthlyWinter.to],
    ["monthlySummerFrom", flat.monthlySummerFrom ?? null, before.monthlySummer.from],
    ["monthlySummerTo", flat.monthlySummerTo ?? null, before.monthlySummer.to],
  ];
  for (const [label, got, expected] of checks) {
    if ((got ?? null) !== (expected ?? null)) {
      throw new Error(`Migration changed ${park.id} ${label}: ${expected} → ${got}`);
    }
  }
}

async function fetchPage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await res.text();
    if (!res.ok) return { ok: false, html, error: `HTTP ${res.status}` };
    if (isBlocked(html)) return { ok: false, html, error: "Blocked page, not a rate card" };
    return { ok: true, html, error: null };
  } catch (err) {
    const message = err.name === "AbortError" ? "Timeout" : err.cause?.code || err.message;
    return { ok: false, html: "", error: message };
  } finally {
    clearTimeout(timer);
  }
}

function syncNewportCopy(park, summer) {
  const from = summer.from.toLocaleString("en-US");
  const to = summer.to.toLocaleString("en-US");
  const range = `$${from}–$${to}`;
  if (typeof park.monthlyRankNote === "string") {
    park.monthlyRankNote = `$1,207 is the winter (Sep–May) small-standard site only. The winter card runs to select deluxe $2,536. Summer small-standard is $${from} and select deluxe is $${to}. Year-round rank uses the blend of the two season midpoints, not $1,207.`;
  }
  if (typeof park.taxesFeesNote === "string") {
    park.taxesFeesNote = park.taxesFeesNote.replace(/summer roughly doubles\.?/i, `summer small standard $${from} to select deluxe $${to}.`);
  }
  if (Array.isArray(park.watchOuts)) {
    park.watchOuts = park.watchOuts.map((line) => line.replace(/\$2\.1k–\$4\.5k/g, range).replace(/\$2,100–\$4,500/g, range));
  }
}

function applyFields(park, fields, today, rows) {
  let changed = false;
  for (const row of fields) {
    const fact = park[row.field];
    if (!isFact(fact)) continue;
    const old = fact.value ?? null;
    if (!row.confident) {
      rows.push({ parkId: park.id, field: row.field, old, new: null, status: "stale", timestamp: new Date().toISOString() });
      continue;
    }
    const same = equal(old, row.value);
    if (!same) {
      fact.value = row.value;
      changed = true;
      if (park.id === "newport-dunes" && row.field === "monthlySummer" && row.value) syncNewportCopy(park, row.value);
    }
    fact.sourceUrl = row.sourceUrl || park.officialUrl;
    fact.lastVerified = today;
    fact.confidence = "high";
    fact.sourceNote = row.note;
    rows.push({
      parkId: park.id,
      field: row.field,
      old,
      new: row.value,
      status: same ? "ok" : "changed",
      timestamp: new Date().toISOString(),
    });
  }
  return changed;
}

async function fetchWithCurl(url) {
  try {
    const { stdout } = await execFileAsync(
      "curl",
      ["-fsSL", "--max-time", "15", "-4", "-A", UA, "-H", "Accept: text/html,application/xhtml+xml", url],
      { maxBuffer: 8 * 1024 * 1024, timeout: 18000 },
    );
    const html = stdout.toString();
    if (isBlocked(html)) return { ok: false, html, error: "Blocked page, not a rate card" };
    return { ok: true, html, error: null };
  } catch (err) {
    const detail = `${err.code || ""} ${err.stderr?.toString?.() || err.message || ""}`.trim().slice(0, 160);
    return { ok: false, html: "", error: detail || "curl failed" };
  }
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function printTable(rows) {
  const header = ["park", "field", "old", "new", "status"];
  const body = rows.map((row) => [row.parkId, row.field, show(row.old), show(row.new), row.status]);
  const widths = header.map((label, index) => Math.max(label.length, ...body.map((line) => line[index].length)));
  const line = (cells) => cells.map((cell, index) => cell.padEnd(widths[index])).join("  ");
  console.log(line(header));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const cells of body) console.log(line(cells));
  const counts = { ok: 0, changed: 0, failed: 0, stale: 0, blocked: 0 };
  for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;
  console.log(`\n${counts.ok} ok, ${counts.changed} changed, ${counts.failed} failed, ${counts.stale} stale, ${counts.blocked} blocked`);
  console.log("A failed fetch, a stale parse, or a blocked page did not replace a stored rate.");
}

const parks = JSON.parse(readFileSync(parksPath, "utf8"));
for (const park of parks) assertMigration(park, migratePark(park));

mkdirSync(cacheDir, { recursive: true });
const today = todayISO();
const rows = [];

function isHttpBlocked(result) {
  return /\b(403|404)\b/.test(result?.error || "");
}

async function loadOfficial(url) {
  let result = await fetchPage(url);
  if (!result.ok) result = await fetchWithCurl(url);
  return result;
}

await pool(parks, 4, async (park) => {
  const url = park.officialUrl || park.website;
  const checkedAt = new Date().toISOString();
  if (!url) {
    park.verify = { status: "failed", checkedAt, error: "No officialUrl" };
    rows.push({ parkId: park.id, field: "fetch", old: null, new: null, status: "failed", timestamp: checkedAt });
    return;
  }
  let primary = await loadOfficial(url);
  let usedUrl = url;
  const alternate = ALTERNATE_PAGE[park.id];
  if (!primary.ok && isHttpBlocked(primary) && alternate && alternate !== url) {
    const alt = await loadOfficial(alternate);
    if (alt.ok) {
      primary = alt;
      usedUrl = alternate;
      park.officialUrl = alternate;
    } else if (isHttpBlocked(alt)) {
      writeFileSync(join(cacheDir, `${park.id}.html`), `${primary.html || ""}\n<!-- alternate: ${alternate} -->\n${alt.html || ""}`);
      park.verify = { status: "blocked", checkedAt, error: `Blocked. Tried ${url} and ${alternate}. Old number kept.` };
      rows.push({ parkId: park.id, field: "fetch", old: null, new: null, status: "blocked", timestamp: checkedAt });
      return;
    }
  }
  let html = primary.html || "";
  const extraUrl = EXTRA_PAGE[park.id];
  if (primary.ok && extraUrl) {
    const extra = await loadOfficial(extraUrl);
    if (extra.html) html += `\n<!-- extra: ${extraUrl} -->\n${extra.html}`;
  }
  writeFileSync(join(cacheDir, `${park.id}.html`), html);
  if (!primary.ok) {
    const status = isHttpBlocked(primary) ? "blocked" : "failed";
    park.verify = { status, checkedAt, error: primary.error };
    rows.push({ parkId: park.id, field: "fetch", old: null, new: null, status, timestamp: checkedAt });
    return;
  }
  const extract = EXTRACTORS[park.id];
  if (!extract) {
    park.verify = { status: "stale", checkedAt, error: "No park-specific pattern. Number left as recorded." };
    rows.push({ parkId: park.id, field: "rates", old: null, new: null, status: "stale", timestamp: checkedAt });
    return;
  }
  const text = htmlToText(html);
  const fields = extract(text, usedUrl, extraUrl);
  if (!anchorOk(park.id, fields)) {
    park.verify = { status: "stale", checkedAt, error: "Page fetched. Parse was not confident. Number left as recorded." };
    for (const row of fields) {
      rows.push({ parkId: park.id, field: row.field, old: park[row.field]?.value ?? null, new: null, status: "stale", timestamp: checkedAt });
    }
    return;
  }
  const changed = applyFields(park, fields, today, rows);
  park.lastVerified = today;
  park.verify = { status: changed ? "changed" : "ok", checkedAt, error: null };
});

rows.sort((a, b) => a.parkId.localeCompare(b.parkId) || a.field.localeCompare(b.field));
printTable(rows);
const held = parks.filter((park) => park.verify?.status === "failed" || park.verify?.status === "blocked");
if (held.length) {
  console.log("\nStored rates left in place:");
  for (const park of held) console.log(`  ${park.id}: ${park.verify.status} — ${park.verify.error}`);
}

if (checkOnly) {
  console.log("\n--check: parks.json and verifyLog.json were not written.");
} else {
  writeFileSync(parksPath, `${JSON.stringify(parks, null, 2)}\n`);
  const prior = JSON.parse(readFileSync(logPath, "utf8"));
  const log = Array.isArray(prior) ? prior : [];
  writeFileSync(logPath, `${JSON.stringify(log.concat(rows), null, 2)}\n`);
  console.log(`\nWrote ${parksPath}`);
  console.log(`Appended ${rows.length} rows to ${logPath}`);
}
