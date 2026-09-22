/** Frontier presence and how it works for a Go Wild hop to Los Angeles.
 * Default planning window is forward (winter 2026–27 / spring 2027), not the 20 Sep 2026 snapshot.
 * Today's table changes. Routes end. Announced 2027 flying is in the model.
 */

export const LAX = { code: "LAX", name: "Los Angeles", lat: 33.9425, lng: -118.408 };
export const AS_OF = "2026-09-20";

/** Domestic Go Wild: inventory typically opens the day before departure (midnight local). */
export const GO_WILD = {
  domesticWindow: "Day before departure (often 12:00 a.m. local at the departure airport)",
  internationalWindow: "10 days before departure",
  fees: "Pass covers the fare. You still pay taxes/fees, and bags/seats are extra.",
  blackoutNote:
    "Standard Go Wild has blackout dates (Thanksgiving week, Christmas week, some holiday weekends). Last-minute LA trips fail if every remaining seat is a peak-day blackout.",
  lastMinute:
    "Last-minute LA only works if you live close to an airport with several Frontier banks to LAX. Connecting (two segments) means two independent day-before seat drops — a bad plan when you have to be in LA tomorrow.",
};

export const HORIZONS = [
  {
    id: "today",
    label: "Today · 20 Sep 2026",
    asOf: "2026-09-20",
    blurb:
      "Published snapshot only. LAS–BUR still selling through 12 Oct. DTW–LAX is announced, not flying. Do not plan a year from this table — it will be wrong.",
  },
  {
    id: "winter-26-27",
    label: "Winter 2026–27",
    asOf: "2027-01-15",
    blurb:
      "Planning window. BUR is gone. DTW–LAX is treated as daily last-minute LA (newsroom 14 Jul 2026 + fare pages into 2027). AeroRoutes first filed 20–30 Nov only — confirm continuation. Holiday-only IAH–SJU / LAX–GUA / DFW–SJO are not a parking plan.",
  },
  {
    id: "spring-27",
    label: "Spring / 2027",
    asOf: "2027-04-01",
    blurb:
      "Forward look, default. MCO–BOG goes daily 6 Mar 2027 (Colombia is not an LA hop). DTW–LAX stays the Midwest last-minute LA product if it still files. Frontier keeps announcing 2027 routes — this horizon is the planning stance, not a guarantee.",
  },
];

export const DEFAULT_HORIZON = "spring-27";

export function horizonById(id) {
  return HORIZONS.find((h) => h.id === id) ?? HORIZONS.find((h) => h.id === DEFAULT_HORIZON);
}

/**
 * LAX weekly banks from laxairportguide (medium confidence, drifts) as of 20 Sep 2026.
 * Forward adds from Frontier newsroom 14 Jul 2026, SimpleFlying 21 Aug 2026, AeroRoutes NW26,
 * DTW LGA 17 Sep 2026, Colombia 10 Sep 2026.
 */
export const ROUTE_NOTES = {
  bur:
    "LAS–BUR is a seasonal extra, not the LA plan. Published fares ran through 12 Oct 2026. After that, treat Vegas as LAX-only.",
  ord: "Chicago O'Hare is not on the Sep 2026 Frontier–LAX published table. Do not park in Chicago for last-minute LA unless a 2027 filing appears.",
  mco: "Orlando–LAX is selling into fall/winter 2026 on Frontier’s fare pages. Treat as a long one-ticket hop, not a daily bank like DEN/LAS/DFW.",
  dtw:
    "DTW–LAX: newsroom says daily from 20 Nov 2026. AeroRoutes initial NW26 filing was 20–30 Nov only. Fare pages have shown into Jan–Feb 2027. Default 2027 horizons treat it as last-minute LA with a confirm-the-filing watch-out.",
  nw26:
    "NW26/27 adds that are not an LA parking plan: LAS–BOI (10 Sep 2026, 4x/wk), BNA–TPA (9 Oct), DEN–FLL daily 20 Nov, MCI–MCO 4x/wk 20 Nov, ONT–OAK 21 Nov (skip — already in CA), IAH–SJU daily 17 Dec–4 Jan 2027 holiday only, LAX–GUA same window, DFW–SJO three Saturdays.",
  colombia:
    "MCO–MDE daily 10 Dec 2026, MCO–BOG 6x/wk 14 Dec then daily 6 Mar 2027, MCO–CTG weekly 19 Dec. Subject to government approval. International Go Wild is 10 days, not day-before. Not a last-minute LA product.",
  skipCa:
    "Skip SFO / SJC / SMF / OAK / ONT / SAN as bases for flying to LA. You are already in California.",
};

export const TRIPS = [
  {
    id: "dash",
    days: 4,
    headline: "Gone 2–4 days",
    go: "Dry storage is a job hop — days or a week, not a month. Pay the stall by the day (prorate a monthly quote if that is all they publish) plus one Uber round trip.",
    skip: "Airport parking. Checking out of a monthly just to ‘save’ two nights. Connecting cities.",
  },
  {
    id: "week",
    days: 7,
    headline: "Gone about a week",
    go: "Park the empty rig in dry storage for the week you are on the job in LA. Occupied monthly only if you are already living there. Confirm dump/battery/propane so you are not coming back to a dead house.",
    skip: "Parks that force checkout when you are not sleeping in the rig. Unattended trailers at tourist KOAs in peak week.",
  },
  {
    id: "monthly",
    days: 30,
    headline: "This is home base",
    go: "Pay occupied monthly at a park that lets the trailer sit while you Go Wild. Extra vehicle for the Tesla. Short Uber. Fat LAX bank.",
    skip: "Storage-only lots if you still need to live in the rig most nights. 55+ gates if you are not 55.",
  },
];

export const UBER_CITY_MUL = {
  DEN: 1.18,
  LAS: 0.92,
  PHX: 1.0,
  DFW: 0.95,
  ATL: 1.1,
  ORD: 1.22,
  MCO: 1.06,
  IAH: 0.96,
  SLC: 0.94,
  SEA: 1.2,
  PDX: 1.04,
  PHL: 1.14,
  CLE: 1.06,
  TPA: 1.0,
  MIA: 1.16,
  TTN: 1.12,
  DTW: 1.08,
  FLL: 1.12,
  MCI: 0.98,
  BNA: 1.02,
  STL: 1.0,
  IND: 1.0,
  CVG: 1.02,
  CMH: 1.0,
  MSY: 1.04,
  AUS: 1.08,
  SAT: 0.96,
  OKC: 0.92,
  TUL: 0.92,
  BWI: 1.14,
  RDU: 1.02,
  CLT: 1.04,
  MSP: 1.1,
  MKE: 1.06,
  BOI: 0.96,
  GEG: 0.96,
  LIT: 0.92,
  DSM: 0.94,
  OMA: 0.94,
  PIT: 1.04,
  JAX: 1.0,
  SDF: 1.0,
  MEM: 0.96,
  BHM: 0.96,
  BUF: 1.04,
  MDW: 1.22,
  RIC: 1.02,
  CHS: 1.02,
  BOS: 1.28,
  PWM: 1.08,
  BDL: 1.12,
  ALB: 1.06,
  GRR: 1.02,
  AVL: 1.0,
  SAV: 1.0,
  MYR: 0.98,
  ORF: 1.02,
  ELP: 0.9,
  ABQ: 0.94,
  COS: 1.02,
  RNO: 1.0,
  PNS: 0.96,
  TYS: 0.96,
  LEX: 0.98,
  ICT: 0.9,
  RAP: 0.94,
  FAR: 0.92,
  MSN: 1.04,
  CID: 0.92,
  HSV: 0.94,
  GPT: 0.94,
  SRQ: 1.04,
  GSP: 0.98,
  DAY: 0.98,
  BTV: 1.08,
  MHT: 1.1,
  PVD: 1.12,
  TUS: 0.96,
  SMF: 1.08,
};

export const HUBS = {
  DEN: {
    id: "DEN",
    code: "DEN",
    city: "Denver",
    state: "CO",
    airport: "Denver International",
    lat: 39.8561,
    lng: -104.6737,
    tier: "primary-hub",
    laxNonstop: true,
    burNonstop: false,
    laxWeekly: 30,
    flightHoursToLax: 2.5,
    goWildToLax: "excellent",
    bestSeasons: ["summer", "fall"],
    avoidSeasons: ["winter"],
    color: "#4f96a6",
    blurb: "Frontier’s home. ~30 weekly LAX banks. Best last-minute shot — occupied monthlies here are expensive, so winter storage + summer live-in is the move.",
    climate: "Live here June–September. Winter is freeze. You can still fly out of DEN year-round; the RV is the problem.",
  },
  LAS: {
    id: "LAS",
    code: "LAS",
    city: "Las Vegas",
    state: "NV",
    airport: "Harry Reid International",
    lat: 36.084,
    lng: -115.1537,
    tier: "focus",
    laxNonstop: true,
    burNonstop: false,
    burUntil: "2026-10-12",
    laxWeekly: 33,
    flightHoursToLax: 1.2,
    goWildToLax: "excellent",
    bestSeasons: ["winter", "spring", "fall"],
    avoidSeasons: ["summer"],
    color: "#c56b4a",
    blurb: "Thickest short hop to LAX (~33/wk). LAS–BUR is not the plan after 12 Oct 2026. Cheap storage lots sit six minutes from the terminals.",
    climate: "Best Nov–Apr. July is 110°F. The flight is still an hour if you can take the A/C.",
  },
  PHX: {
    id: "PHX",
    code: "PHX",
    city: "Phoenix",
    state: "AZ",
    airport: "Phoenix Sky Harbor",
    lat: 33.4373,
    lng: -112.0078,
    tier: "focus",
    laxNonstop: true,
    burNonstop: false,
    laxWeekly: 14,
    flightHoursToLax: 1.3,
    goWildToLax: "strong",
    bestSeasons: ["winter", "spring"],
    avoidSeasons: ["summer"],
    color: "#d4a056",
    blurb: "Short nonstop to LAX, huge snowbird inventory, and Apache Junction still has $399-class monthlies if you will sit 50+ minutes.",
    climate: "Oct–Apr is the window. Monsoon and extreme heat May–Sep.",
  },
  DFW: {
    id: "DFW",
    code: "DFW",
    city: "Dallas–Fort Worth",
    state: "TX",
    airport: "Dallas/Fort Worth International",
    lat: 32.8998,
    lng: -97.0403,
    tier: "focus",
    laxNonstop: true,
    burNonstop: false,
    laxWeekly: 34,
    flightHoursToLax: 3.3,
    goWildToLax: "excellent",
    bestSeasons: ["fall", "winter", "spring"],
    avoidSeasons: ["summer"],
    color: "#d7b07a",
    blurb: "Thickest Frontier–LAX schedule on the current table (~34/wk). Euless is the last-minute product; Fort Worth $600 monthlies are the deal if you accept a longer Uber.",
    climate: "Mild winters. Summers are a heat index. April–June is severe-storm season.",
  },
  IAH: {
    id: "IAH",
    code: "IAH",
    city: "Houston",
    state: "TX",
    airport: "George Bush Intercontinental",
    lat: 29.9902,
    lng: -95.3368,
    tier: "focus",
    laxNonstop: true,
    burNonstop: false,
    laxWeekly: 14,
    flightHoursToLax: 3.6,
    goWildToLax: "strong",
    bestSeasons: ["winter", "spring", "fall"],
    avoidSeasons: ["summer"],
    color: "#3d7f8c",
    blurb: "Daily LAX nonstop and the closest cheap full-hookup monthly in this file (Northlake from $623, under 5 miles). Humidity and hurricane calendar are the tax.",
    climate: "Winters are the play. Hurricane season 1 Jun–30 Nov.",
  },
  ATL: {
    id: "ATL",
    code: "ATL",
    city: "Atlanta",
    state: "GA",
    airport: "Hartsfield–Jackson",
    lat: 33.6407,
    lng: -84.4277,
    tier: "focus",
    laxNonstop: true,
    burNonstop: false,
    laxWeekly: 24,
    flightHoursToLax: 4.5,
    goWildToLax: "strong",
    bestSeasons: ["spring", "fall"],
    avoidSeasons: ["summer"],
    color: "#8faf78",
    blurb: "Busy LAX bank (~24/wk). Forest Park still advertises a $382 lot ten minutes from ATL — call, it is a classified not a resort.",
    climate: "Spring and October. Summer humidity.",
  },
  SLC: {
    id: "SLC",
    code: "SLC",
    city: "Salt Lake City",
    state: "UT",
    airport: "Salt Lake City International",
    lat: 40.7899,
    lng: -111.9791,
    tier: "spoke",
    laxNonstop: true,
    burNonstop: false,
    laxWeekly: 12,
    flightHoursToLax: 2.0,
    goWildToLax: "good",
    bestSeasons: ["summer", "fall", "spring"],
    avoidSeasons: ["winter"],
    color: "#8a7cb8",
    blurb: "Six-day LAX nonstop, two-hour hop, park minutes from the airport. A summer alternative if DEN monthlies feel insane.",
    climate: "Shoulder and summer. Inversion and freeze in winter.",
  },
  SEA: {
    id: "SEA",
    code: "SEA",
    city: "Seattle",
    state: "WA",
    airport: "Seattle–Tacoma",
    lat: 47.4502,
    lng: -122.3088,
    tier: "spoke",
    laxNonstop: true,
    burNonstop: false,
    laxWeekly: 12,
    flightHoursToLax: 2.5,
    goWildToLax: "good",
    bestSeasons: ["summer", "fall"],
    avoidSeasons: ["winter"],
    color: "#6b8f71",
    blurb: "Summer refuge with a real LAX nonstop. Kent/Sea-Tac KOA is the close-in live-in; do not use this as a January base.",
    climate: "May–September. Winters are dark and wet.",
  },
  PDX: {
    id: "PDX",
    code: "PDX",
    city: "Portland",
    state: "OR",
    airport: "Portland International",
    lat: 45.5898,
    lng: -122.5951,
    tier: "spoke",
    laxNonstop: true,
    burNonstop: false,
    laxWeekly: 6,
    flightHoursToLax: 2.3,
    goWildToLax: "good",
    bestSeasons: ["summer", "fall"],
    avoidSeasons: ["winter"],
    color: "#5aa778",
    blurb: "Only ~3× weekly to LAX — worse lottery than DEN/LAS, but Clark County Fairgrounds at $495 is the national cheap-summer live-in with a Portland airport.",
    climate: "The national summer refuge. Winters are wet, not usually frozen on the I-5 corridor.",
  },
  MCO: {
    id: "MCO",
    code: "MCO",
    city: "Orlando",
    state: "FL",
    airport: "Orlando International",
    lat: 28.4312,
    lng: -81.3081,
    tier: "focus",
    laxNonstop: true,
    burNonstop: false,
    laxWeekly: 13,
    flightHoursToLax: 5.5,
    goWildToLax: "good",
    bestSeasons: ["winter", "spring"],
    avoidSeasons: ["summer"],
    color: "#5aa7b8",
    blurb: "Long one-ticket hop. Kissimmee still publishes off-season $725 plus $125 outside storage — that storage line is the ‘gone for a week’ product.",
    climate: "Be here Nov–Apr. May–Oct is wet, hot, and stormy.",
  },
  ORD: {
    id: "ORD",
    code: "ORD",
    city: "Chicago",
    state: "IL",
    airport: "O'Hare",
    lat: 41.9742,
    lng: -87.9073,
    tier: "focus",
    laxNonstop: false,
    burNonstop: false,
    laxWeekly: 0,
    flightHoursToLax: 4.2,
    goWildToLax: "connect",
    bestSeasons: ["summer", "fall"],
    avoidSeasons: ["winter"],
    color: "#5b7fa6",
    blurb: "Frontier operating base, but O'Hare is not on the current Frontier–LAX table. Do not pick Chicago to dash to LA.",
    climate: "May–September for the rig. Winter is not an RV product.",
  },
  PHL: {
    id: "PHL",
    code: "PHL",
    city: "Philadelphia",
    state: "PA",
    airport: "Philadelphia International",
    lat: 39.8721,
    lng: -75.2411,
    tier: "focus",
    laxNonstop: false,
    burNonstop: false,
    laxWeekly: 0,
    flightHoursToLax: 7,
    goWildToLax: "connect",
    bestSeasons: ["spring", "fall"],
    avoidSeasons: ["winter"],
    color: "#9a7a6a",
    blurb: "Real Frontier base, weak last-minute LA. Expect a connect. Two Go Wild seats.",
    climate: "Shoulder seasons. Winter freeze.",
  },
  CLE: {
    id: "CLE",
    code: "CLE",
    city: "Cleveland",
    state: "OH",
    airport: "Cleveland Hopkins",
    lat: 41.4117,
    lng: -81.8498,
    tier: "focus",
    laxNonstop: false,
    burNonstop: false,
    laxWeekly: 0,
    flightHoursToLax: 7,
    goWildToLax: "connect",
    bestSeasons: ["summer", "fall"],
    avoidSeasons: ["winter"],
    color: "#6b8f71",
    blurb: "Frontier operating base. LA is usually a connect. Fine as a lake summer, poor as an LA shuttle.",
    climate: "June–September. Winter is lake-effect snow.",
  },
  TPA: {
    id: "TPA",
    code: "TPA",
    city: "Tampa",
    state: "FL",
    airport: "Tampa International",
    lat: 27.9755,
    lng: -82.5332,
    tier: "focus",
    laxNonstop: false,
    burNonstop: false,
    laxWeekly: 0,
    flightHoursToLax: 7,
    goWildToLax: "connect",
    bestSeasons: ["winter", "spring"],
    avoidSeasons: ["summer"],
    color: "#3d9f9c",
    blurb: "Gulf Frontier base. Prefer MCO if the point is a one-ticket LAX hop.",
    climate: "Nov–Apr. Hurricane season Jun–Nov.",
  },
  MIA: {
    id: "MIA",
    code: "MIA",
    city: "Miami",
    state: "FL",
    airport: "Miami International",
    lat: 25.7959,
    lng: -80.287,
    tier: "focus",
    laxNonstop: false,
    burNonstop: false,
    laxWeekly: 0,
    flightHoursToLax: 8,
    goWildToLax: "connect",
    bestSeasons: ["winter", "spring"],
    avoidSeasons: ["summer"],
    color: "#2f6573",
    blurb: "Caribbean gateway. Last-minute LA is a connect.",
    climate: "Dry season Nov–Apr.",
  },
  TTN: {
    id: "TTN",
    code: "TTN",
    city: "Trenton",
    state: "NJ",
    airport: "Trenton–Mercer",
    lat: 40.2767,
    lng: -74.8135,
    tier: "focus",
    laxNonstop: false,
    burNonstop: false,
    laxWeekly: 0,
    flightHoursToLax: 8,
    goWildToLax: "connect",
    bestSeasons: ["spring", "fall"],
    avoidSeasons: ["winter"],
    color: "#8a8078",
    blurb: "Tiny Frontier operating base. Almost no use for a same-week LA dash.",
    climate: "Shoulder only.",
  },
};

function spoke(p) {
  return {
    id: p.id,
    code: p.id,
    city: p.city,
    state: p.state,
    airport: p.airport,
    lat: p.lat,
    lng: p.lng,
    tier: p.tier ?? "spoke",
    laxNonstop: false,
    burNonstop: false,
    laxWeekly: 0,
    laxStart: p.laxStart ?? null,
    laxWeeklyAfter: p.laxWeeklyAfter ?? 0,
    flightHoursToLax: p.hrs ?? 6.5,
    goWildToLax: p.goWild ?? "connect",
    goWildAfter: p.goWildAfter ?? p.goWild ?? "connect",
    bestSeasons: p.best ?? ["summer", "fall"],
    avoidSeasons: p.avoid ?? ["winter"],
    color: p.color ?? "#8a8078",
    blurb: p.blurb,
    climate: p.climate,
    filingNote: p.filingNote ?? null,
  };
}

const EXTRA_HUBS = {
  DTW: spoke({
    id: "DTW",
    city: "Detroit",
    state: "MI",
    airport: "Detroit Metropolitan",
    lat: 42.2124,
    lng: -83.3534,
    tier: "focus",
    hrs: 4.6,
    color: "#5b7fa6",
    laxStart: "2026-11-20",
    laxWeeklyAfter: 7,
    goWild: "connect",
    goWildAfter: "strong",
    filingNote:
      "Newsroom 14 Jul 2026: daily DTW–LAX from 20 Nov 2026. AeroRoutes first filed 20–30 Nov only. Fare pages have shown into Jan–Feb 2027. Confirm winter continuation.",
    blurb:
      "The material 2026–27 last-minute LA add. Daily nonstop announced 20 Nov 2026. Park in Belleville (~15 min). Summer for the rig; the airport is the winter product once LAX is live.",
    climate: "May–September for the trailer. Winter freeze. Fly year-round once LAX is live.",
  }),
  FLL: spoke({
    id: "FLL",
    city: "Fort Lauderdale",
    state: "FL",
    airport: "Fort Lauderdale–Hollywood",
    lat: 26.0726,
    lng: -80.1527,
    tier: "focus",
    hrs: 5.8,
    best: ["winter", "spring"],
    avoid: ["summer"],
    color: "#3d9f9c",
    blurb: "DEN–FLL daily from 20 Nov 2026. Florida bank, not an LAX nonstop. Last-minute LA is a connect.",
    climate: "Nov–Apr. Hurricane season Jun–Nov.",
  }),
  MDW: spoke({
    id: "MDW",
    city: "Chicago Midway",
    state: "IL",
    airport: "Chicago Midway",
    lat: 41.7868,
    lng: -87.7522,
    tier: "focus",
    hrs: 4.2,
    color: "#5b7fa6",
    blurb: "Frontier at Midway too. Still not on the Sep 2026 LAX table. Do not park in Chicago for last-minute LA.",
    climate: "May–September for the rig.",
  }),
  MCI: spoke({
    id: "MCI",
    city: "Kansas City",
    state: "MO",
    airport: "Kansas City International",
    lat: 39.2976,
    lng: -94.7139,
    hrs: 3.8,
    best: ["spring", "fall"],
    avoid: ["winter", "summer"],
    blurb: "MCI–MCO 4x/week from 20 Nov 2026. Not LAX. Last-minute LA is a connect.",
    climate: "Shoulder. Tornado season Apr–Jun. Winter freeze.",
  }),
  BNA: spoke({
    id: "BNA",
    city: "Nashville",
    state: "TN",
    airport: "Nashville International",
    lat: 36.1263,
    lng: -86.6774,
    hrs: 4.2,
    best: ["spring", "fall"],
    avoid: ["summer"],
    color: "#8faf78",
    blurb: "BNA–TPA from 9 Oct 2026. Music Valley is ~20 min. LAX is typically a connect.",
    climate: "Shoulder. Summer humidity.",
  }),
  STL: spoke({ id: "STL", city: "St. Louis", state: "MO", airport: "St. Louis Lambert", lat: 38.7487, lng: -90.37, hrs: 4.0, blurb: "Frontier spoke. LAX connect.", climate: "Shoulder. Winter freeze. Summer humidity." }),
  IND: spoke({ id: "IND", city: "Indianapolis", state: "IN", airport: "Indianapolis International", lat: 39.7173, lng: -86.2944, hrs: 4.2, blurb: "Frontier spoke. LAX connect.", climate: "May–September." }),
  CVG: spoke({ id: "CVG", city: "Cincinnati", state: "OH", airport: "Cincinnati/Northern Kentucky", lat: 39.0488, lng: -84.6678, hrs: 4.5, blurb: "Frontier spoke. LAX connect.", climate: "May–September." }),
  CMH: spoke({ id: "CMH", city: "Columbus", state: "OH", airport: "John Glenn Columbus", lat: 39.998, lng: -82.8919, hrs: 4.6, blurb: "Frontier spoke. LAX connect.", climate: "May–September." }),
  MSY: spoke({
    id: "MSY",
    city: "New Orleans",
    state: "LA",
    airport: "Louis Armstrong",
    lat: 29.9934,
    lng: -90.258,
    hrs: 4.0,
    best: ["winter", "spring"],
    avoid: ["summer"],
    color: "#3d7f8c",
    blurb: "Frontier leisure spoke. LAX connect. Hurricane calendar is the tax.",
    climate: "Winter/shoulder. Hurricane season Jun–Nov.",
  }),
  AUS: spoke({ id: "AUS", city: "Austin", state: "TX", airport: "Austin–Bergstrom", lat: 30.1945, lng: -97.6699, hrs: 3.4, best: ["fall", "winter", "spring"], avoid: ["summer"], color: "#d7b07a", blurb: "Frontier DEN/LAS type. Confirm any 2027 LAX filing; treat as connect until one exists.", climate: "Mild winter. Summer heat." }),
  SAT: spoke({ id: "SAT", city: "San Antonio", state: "TX", airport: "San Antonio International", lat: 29.5337, lng: -98.4698, hrs: 3.3, best: ["fall", "winter", "spring"], avoid: ["summer"], color: "#d7b07a", blurb: "Frontier spoke. LAX typically a connect.", climate: "Mild winter. Summer heat." }),
  OKC: spoke({ id: "OKC", city: "Oklahoma City", state: "OK", airport: "Will Rogers World", lat: 35.3931, lng: -97.6007, hrs: 3.2, best: ["spring", "fall"], avoid: ["winter", "summer"], blurb: "Frontier spoke. LAX connect. Tornado alley.", climate: "Shoulder. Tornado peak Apr–Jun." }),
  TUL: spoke({ id: "TUL", city: "Tulsa", state: "OK", airport: "Tulsa International", lat: 36.1984, lng: -95.8881, hrs: 3.4, best: ["spring", "fall"], avoid: ["winter", "summer"], blurb: "Frontier spoke. LAX connect.", climate: "Shoulder. Tornado season." }),
  BWI: spoke({ id: "BWI", city: "Baltimore", state: "MD", airport: "Baltimore/Washington", lat: 39.1754, lng: -76.6682, hrs: 5.5, best: ["spring", "fall"], avoid: ["winter"], color: "#9a7a6a", blurb: "Frontier leisure. LAX connect. ~25 min from Capitol KOA.", climate: "Shoulder. Winter freeze." }),
  RDU: spoke({ id: "RDU", city: "Raleigh–Durham", state: "NC", airport: "Raleigh–Durham", lat: 35.8776, lng: -78.7875, hrs: 5.2, best: ["spring", "fall"], avoid: ["winter"], color: "#8faf78", blurb: "Frontier spoke. LAX connect. The KOA is a stretch past 45 min.", climate: "Shoulder. Summer humidity." }),
  CLT: spoke({ id: "CLT", city: "Charlotte", state: "NC", airport: "Charlotte Douglas", lat: 35.214, lng: -80.9431, hrs: 4.8, best: ["spring", "fall"], avoid: ["summer"], color: "#8faf78", blurb: "Frontier spoke. LAX connect. Fort Mill is ~30 min.", climate: "Shoulder. Summer humidity." }),
  MSP: spoke({ id: "MSP", city: "Minneapolis–St. Paul", state: "MN", airport: "Minneapolis–St. Paul", lat: 44.8848, lng: -93.2223, hrs: 4.0, color: "#5b7fa6", blurb: "Frontier spoke. LAX connect. Summer only for the rig.", climate: "May–September. Winter is not an RV season." }),
  MKE: spoke({ id: "MKE", city: "Milwaukee", state: "WI", airport: "Milwaukee Mitchell", lat: 42.9472, lng: -87.8966, hrs: 4.2, color: "#5b7fa6", blurb: "Frontier spoke. LAX connect.", climate: "May–September." }),
  BOI: spoke({
    id: "BOI",
    city: "Boise",
    state: "ID",
    airport: "Boise Airport",
    lat: 43.5644,
    lng: -116.2228,
    hrs: 2.2,
    color: "#8a7cb8",
    blurb: "LAS–BOI started 10 Sep 2026 (4x/week). Not LAX. Connect to LA via DEN or LAS.",
    climate: "Summer live-in. Winter freeze.",
  }),
  GEG: spoke({ id: "GEG", city: "Spokane", state: "WA", airport: "Spokane International", lat: 47.6199, lng: -117.5338, hrs: 2.5, color: "#6b8f71", blurb: "Frontier spoke. LAX connect. Inland Northwest summer.", climate: "May–September." }),
  LIT: spoke({ id: "LIT", city: "Little Rock", state: "AR", airport: "Clinton National", lat: 34.7294, lng: -92.2243, hrs: 3.6, best: ["spring", "fall"], avoid: ["summer"], blurb: "Frontier spoke. LAX connect.", climate: "Shoulder. Summer humidity." }),
  DSM: spoke({ id: "DSM", city: "Des Moines", state: "IA", airport: "Des Moines International", lat: 41.534, lng: -93.6631, hrs: 3.6, blurb: "Frontier spoke. LAX connect.", climate: "May–September. Tornado season." }),
  OMA: spoke({ id: "OMA", city: "Omaha", state: "NE", airport: "Eppley Airfield", lat: 41.3032, lng: -95.8941, hrs: 3.4, blurb: "Frontier spoke. LAX connect.", climate: "May–September. Tornado season." }),
  PIT: spoke({ id: "PIT", city: "Pittsburgh", state: "PA", airport: "Pittsburgh International", lat: 40.4915, lng: -80.2329, hrs: 5.0, color: "#9a7a6a", blurb: "Frontier spoke. LAX connect. The KOA is a stretch past 45 min.", climate: "May–September." }),
  JAX: spoke({ id: "JAX", city: "Jacksonville", state: "FL", airport: "Jacksonville International", lat: 30.4941, lng: -81.6879, hrs: 5.0, best: ["winter", "spring"], avoid: ["summer"], color: "#5aa7b8", blurb: "Frontier spoke. LAX connect. Hurricane coast.", climate: "Nov–Apr. Hurricane season Jun–Nov." }),
  SDF: spoke({ id: "SDF", city: "Louisville", state: "KY", airport: "Louisville Muhammad Ali", lat: 38.174, lng: -85.736, hrs: 4.4, blurb: "Frontier spoke. LAX connect. Clarksville IN side is ~20 min.", climate: "Shoulder and summer." }),
  MEM: spoke({ id: "MEM", city: "Memphis", state: "TN", airport: "Memphis International", lat: 35.0424, lng: -89.9767, hrs: 3.8, best: ["spring", "fall"], avoid: ["summer"], blurb: "Frontier spoke. LAX connect.", climate: "Shoulder. Summer humidity. Severe storms." }),
  BHM: spoke({ id: "BHM", city: "Birmingham", state: "AL", airport: "Birmingham–Shuttlesworth", lat: 33.5629, lng: -86.7535, hrs: 4.2, best: ["spring", "fall"], avoid: ["summer"], blurb: "Frontier spoke. LAX connect.", climate: "Shoulder. Summer humidity." }),
  BUF: spoke({ id: "BUF", city: "Buffalo", state: "NY", airport: "Buffalo Niagara", lat: 42.9405, lng: -78.7322, hrs: 5.2, color: "#5b7fa6", blurb: "Frontier spoke. LAX connect. Summer lake. Niagara traffic in peak.", climate: "June–September. Lake-effect winter." }),
  RIC: spoke({ id: "RIC", city: "Richmond", state: "VA", airport: "Richmond International", lat: 37.5052, lng: -77.3197, hrs: 5.2, best: ["spring", "fall"], avoid: ["winter"], color: "#9a7a6a", blurb: "Frontier spoke. LAX connect.", climate: "Shoulder." }),
  CHS: spoke({ id: "CHS", city: "Charleston", state: "SC", airport: "Charleston International", lat: 32.8986, lng: -80.0405, hrs: 5.0, best: ["winter", "spring"], avoid: ["summer"], color: "#8faf78", blurb: "Frontier spoke. LAX connect. Hurricane.", climate: "Winter/shoulder. Hurricane season." }),
  BOS: spoke({ id: "BOS", city: "Boston", state: "MA", airport: "Logan International", lat: 42.3656, lng: -71.0096, hrs: 6.2, color: "#c47b6a", blurb: "Real Frontier city. Cape Cod KOA is a 70 min stretch. LAX is a connect.", climate: "Summer/fall. Winter freeze." }),
  PWM: spoke({ id: "PWM", city: "Portland", state: "ME", airport: "Portland International Jetport", lat: 43.6462, lng: -70.3093, hrs: 6.4, color: "#c47b6a", blurb: "Frontier spoke. LAX connect. ~15 min from Portland West KOA.", climate: "Summer. Winter freeze." }),
  BDL: spoke({ id: "BDL", city: "Hartford", state: "CT", airport: "Bradley International", lat: 41.9389, lng: -72.6832, hrs: 5.8, color: "#c47b6a", blurb: "Frontier spoke. LAX connect. Strawberry Park is a stretch.", climate: "Summer/fall." }),
  ALB: spoke({ id: "ALB", city: "Albany", state: "NY", airport: "Albany International", lat: 42.7483, lng: -73.8017, hrs: 5.6, color: "#9a7a6a", blurb: "Frontier spoke. LAX connect.", climate: "Summer. Winter freeze." }),
  GRR: spoke({ id: "GRR", city: "Grand Rapids", state: "MI", airport: "Gerald R. Ford", lat: 42.8808, lng: -85.5228, hrs: 4.6, color: "#5b7fa6", blurb: "Frontier spoke. LAX connect.", climate: "May–September." }),
  AVL: spoke({ id: "AVL", city: "Asheville", state: "NC", airport: "Asheville Regional", lat: 35.4362, lng: -82.5418, hrs: 5.0, best: ["spring", "fall", "summer"], avoid: ["winter"], color: "#8faf78", blurb: "Frontier seasonal. LAX connect. Mama Gertie's is the mountain monthly.", climate: "Shoulder and summer." }),
  SAV: spoke({ id: "SAV", city: "Savannah", state: "GA", airport: "Savannah/Hilton Head", lat: 32.1276, lng: -81.2021, hrs: 4.8, best: ["winter", "spring"], avoid: ["summer"], color: "#8faf78", blurb: "Frontier spoke. LAX connect. Hurricane coast.", climate: "Winter/shoulder. Hurricane season." }),
  MYR: spoke({ id: "MYR", city: "Myrtle Beach", state: "SC", airport: "Myrtle Beach International", lat: 33.6797, lng: -78.9283, hrs: 5.0, best: ["winter", "spring"], avoid: ["summer"], color: "#8faf78", blurb: "Frontier leisure spoke. LAX connect. Hurricane.", climate: "Winter/shoulder. Hurricane season." }),
  ORF: spoke({ id: "ORF", city: "Norfolk", state: "VA", airport: "Norfolk International", lat: 36.8946, lng: -76.2012, hrs: 5.4, best: ["spring", "fall"], avoid: ["winter"], color: "#9a7a6a", blurb: "Frontier spoke. LAX connect.", climate: "Shoulder. Hurricane remnants." }),
  ELP: spoke({ id: "ELP", city: "El Paso", state: "TX", airport: "El Paso International", lat: 31.8073, lng: -106.3776, hrs: 2.4, best: ["winter", "spring", "fall"], avoid: ["summer"], color: "#c56b4a", blurb: "Cheap desert monthly. Frontier spoke. LAX typically a connect.", climate: "Winter is the window. Summer heat." }),
  ABQ: spoke({ id: "ABQ", city: "Albuquerque", state: "NM", airport: "Albuquerque International Sunport", lat: 35.0402, lng: -106.6092, hrs: 2.3, best: ["spring", "fall"], avoid: ["winter", "summer"], color: "#c56b4a", blurb: "Frontier DEN/PHX type. LAX connect.", climate: "Shoulder. High-desert winter nights." }),
  COS: spoke({ id: "COS", city: "Colorado Springs", state: "CO", airport: "Colorado Springs", lat: 38.8058, lng: -104.7008, hrs: 2.6, color: "#8a7cb8", blurb: "Cheaper Front Range live-in. DEN is still the LAX product. COS is a connect.", climate: "Summer. Winter freeze." }),
  RNO: spoke({ id: "RNO", city: "Reno", state: "NV", airport: "Reno–Tahoe", lat: 39.4991, lng: -119.7681, hrs: 1.4, best: ["summer", "fall", "spring"], avoid: ["winter"], color: "#c56b4a", blurb: "Frontier LAS type. LAX connect. High-desert summer alternative to Phoenix.", climate: "Summer. Winter freeze at 4,500 ft." }),
  PNS: spoke({ id: "PNS", city: "Pensacola", state: "FL", airport: "Pensacola International", lat: 30.4734, lng: -87.1866, hrs: 4.4, best: ["winter", "spring"], avoid: ["summer"], color: "#3d7f8c", blurb: "Frontier spoke. LAX connect. Hurricane.", climate: "Winter. Hurricane season." }),
  TYS: spoke({ id: "TYS", city: "Knoxville", state: "TN", airport: "McGhee Tyson", lat: 35.811, lng: -83.994, hrs: 4.6, best: ["spring", "fall"], avoid: ["winter"], color: "#8faf78", blurb: "Frontier spoke. LAX connect. Smokies side of Tennessee.", climate: "Shoulder and summer." }),
  LEX: spoke({ id: "LEX", city: "Lexington", state: "KY", airport: "Blue Grass", lat: 38.0365, lng: -84.6059, hrs: 4.6, blurb: "Frontier spoke. LAX connect. Horse Park is ~20 min.", climate: "Shoulder and summer. Derby weeks are a different animal." }),
  ICT: spoke({ id: "ICT", city: "Wichita", state: "KS", airport: "Wichita Dwight D. Eisenhower", lat: 37.6499, lng: -97.4331, hrs: 3.2, best: ["spring", "fall"], avoid: ["winter", "summer"], blurb: "Frontier spoke. LAX connect. Tornado alley.", climate: "Shoulder. Tornado peak Apr–Jun." }),
  RAP: spoke({ id: "RAP", city: "Rapid City", state: "SD", airport: "Rapid City Regional", lat: 44.0453, lng: -103.0574, hrs: 2.6, color: "#a09070", blurb: "Frontier seasonal. LAX connect. Summer only.", climate: "June–September." }),
  FAR: spoke({ id: "FAR", city: "Fargo", state: "ND", airport: "Hector International", lat: 46.9207, lng: -96.8158, hrs: 3.4, color: "#a09070", blurb: "Frontier seasonal. LAX connect. Summer only.", climate: "June–August. Winter is not an RV season." }),
  MSN: spoke({ id: "MSN", city: "Madison", state: "WI", airport: "Dane County Regional", lat: 43.1399, lng: -89.3375, hrs: 4.2, color: "#5b7fa6", blurb: "Frontier spoke. LAX connect.", climate: "May–September." }),
  CID: spoke({ id: "CID", city: "Cedar Rapids", state: "IA", airport: "The Eastern Iowa", lat: 41.8847, lng: -91.7108, hrs: 3.8, blurb: "Frontier spoke. LAX connect.", climate: "May–September." }),
  HSV: spoke({ id: "HSV", city: "Huntsville", state: "AL", airport: "Huntsville International", lat: 34.6372, lng: -86.7751, hrs: 4.2, best: ["spring", "fall"], avoid: ["summer"], blurb: "Frontier spoke. LAX connect.", climate: "Shoulder. Summer humidity." }),
  GPT: spoke({ id: "GPT", city: "Gulfport–Biloxi", state: "MS", airport: "Gulfport–Biloxi", lat: 30.4073, lng: -89.0701, hrs: 4.0, best: ["winter", "spring"], avoid: ["summer"], color: "#3d7f8c", blurb: "Frontier spoke. LAX connect. Hurricane coast.", climate: "Winter. Hurricane season." }),
  SRQ: spoke({ id: "SRQ", city: "Sarasota", state: "FL", airport: "Sarasota–Bradenton", lat: 27.3954, lng: -82.5544, hrs: 5.2, best: ["winter", "spring"], avoid: ["summer"], color: "#5aa7b8", blurb: "Frontier leisure. Prefer MCO if the point is a one-ticket LAX hop.", climate: "Nov–Apr. Hurricane season." }),
  GSP: spoke({ id: "GSP", city: "Greenville–Spartanburg", state: "SC", airport: "Greenville–Spartanburg", lat: 34.8957, lng: -82.2189, hrs: 4.8, best: ["spring", "fall"], avoid: ["summer"], color: "#8faf78", blurb: "Frontier spoke. LAX connect.", climate: "Shoulder. Summer humidity." }),
  DAY: spoke({ id: "DAY", city: "Dayton", state: "OH", airport: "Dayton International", lat: 39.9024, lng: -84.2194, hrs: 4.6, blurb: "Frontier spoke. LAX connect.", climate: "May–September." }),
  BTV: spoke({ id: "BTV", city: "Burlington", state: "VT", airport: "Burlington International", lat: 44.4719, lng: -73.1533, hrs: 6.0, color: "#c47b6a", blurb: "Frontier seasonal. LAX connect. Summer only.", climate: "June–September." }),
  MHT: spoke({ id: "MHT", city: "Manchester", state: "NH", airport: "Manchester–Boston Regional", lat: 42.9326, lng: -71.4357, hrs: 6.0, color: "#c47b6a", blurb: "Frontier spoke. LAX connect. Hampton Beach is a stay-cap stretch.", climate: "Summer. Winter freeze." }),
  PVD: spoke({ id: "PVD", city: "Providence", state: "RI", airport: "Rhode Island T.F. Green", lat: 41.724, lng: -71.4281, hrs: 6.0, color: "#c47b6a", blurb: "Frontier spoke. LAX connect. Mystic KOA is on the CT line.", climate: "Summer/fall." }),
  TUS: spoke({ id: "TUS", city: "Tucson", state: "AZ", airport: "Tucson International", lat: 32.1161, lng: -110.941, hrs: 1.6, best: ["winter", "spring"], avoid: ["summer"], color: "#c56b4a", blurb: "Cheaper desert live-in. PHX is the LAX nonstop; Tucson is a connect.", climate: "Oct–Apr. Extreme heat May–Sep." }),
  SMF: spoke({
    id: "SMF",
    city: "Sacramento",
    state: "CA",
    airport: "Sacramento International",
    lat: 38.6954,
    lng: -121.5908,
    hrs: 1.3,
    best: ["winter", "spring", "fall"],
    avoid: ["summer"],
    color: "#7a9e8c",
    blurb: "Do not park here to fly to LA — you are already in California. In the scan as Frontier presence only.",
    climate: "Valley heat in summer. Winter is the live-in window.",
  }),
};

Object.assign(HUBS, EXTRA_HUBS);

export function hubLaxAt(hubOrId, horizonId = DEFAULT_HORIZON) {
  const hub = typeof hubOrId === "string" ? HUBS[hubOrId] : hubOrId;
  if (!hub) {
    return {
      laxNonstop: false,
      laxWeekly: 0,
      goWildToLax: "unknown",
      status: "unknown",
      burLive: false,
    };
  }
  const hz = horizonById(horizonId);
  const asOf = hz.asOf;
  const burLive = !!(hub.burUntil && asOf < "2026-10-13");

  let laxWeekly = hub.laxWeekly ?? 0;
  let laxNonstop = !!hub.laxNonstop;
  let goWildToLax = hub.goWildToLax;
  let status = laxNonstop ? "live" : "connect";

  if (hub.laxStart) {
    if (asOf < hub.laxStart) {
      if (horizonId === "today") {
        laxNonstop = false;
        laxWeekly = 0;
        goWildToLax = "connect";
        status = "announced";
      } else {
        laxNonstop = true;
        laxWeekly = hub.laxWeeklyAfter || 7;
        goWildToLax = hub.goWildAfter || "strong";
        status = "launching";
      }
    } else {
      laxNonstop = true;
      laxWeekly = hub.laxWeeklyAfter || hub.laxWeekly || 7;
      goWildToLax = hub.goWildAfter || hub.goWildToLax;
      status = "live";
    }
  }

  if (hub.laxEnd && asOf > hub.laxEnd) {
    laxNonstop = false;
    laxWeekly = 0;
    goWildToLax = "connect";
    status = "ended";
  }

  return { ...hub, laxNonstop, laxWeekly, goWildToLax, status, burLive, asOf, horizonId };
}

export function hubOrderFor(horizonId = DEFAULT_HORIZON) {
  return Object.keys(HUBS).sort((a, b) => {
    const la = hubLaxAt(a, horizonId);
    const lb = hubLaxAt(b, horizonId);
    const score = (x) => (x.laxNonstop ? 200 : 0) + (x.status === "launching" ? 80 : 0) + (x.laxWeekly || 0);
    return score(lb) - score(la) || a.localeCompare(b);
  });
}

export const HUB_ORDER = hubOrderFor(DEFAULT_HORIZON);

export const FRONTIER_SEASON_GUIDES = [
  {
    id: "winter",
    headline: "Park in the desert, Houston, or Florida. Fly west to LA.",
    go: "Las Vegas first (short, fat LAX bank, cheap storage). Phoenix. Houston if you want a $623 monthly under 5 miles from a daily LAX. Dallas. On a 2027 horizon, Detroit is the new Midwest last-minute LA — live there in summer, fly from there in winter if the trailer can sit frozen. Orlando if you will sit 5.5 hours.",
    skip: "Denver, Salt Lake, Seattle, Portland, Chicago, Cleveland, Philly as live-in — the airport may still work; the RV does not. Do not count on LAS–BUR after 12 Oct 2026. Do not park at SMF/OAK to fly to LA.",
    why: "Go Wild to LAX is easiest from LAS and PHX in winter. IAH is the cheap live-in with a real nonstop. DTW is the announced 2026–27 add.",
  },
  {
    id: "spring",
    headline: "Leave Phoenix before it cooks. Point the rig at Denver — or keep Detroit if LAX is still daily.",
    go: "Las Vegas and Dallas in March–April. Houston until humidity wins. Start DEN/SLC by May. Atlanta shoulders. Detroit if DTW–LAX survived the winter filing.",
    skip: "Florida as it steams. Phoenix after May. Plains tornado weeks at DFW/MCI/OKC.",
    why: "Shoulder is when both weather and Frontier schedules are sane. 2027 still has to be confirmed, not assumed.",
  },
  {
    id: "summer",
    headline: "Live on DEN — or the $495 Portland-side fairgrounds if the Front Range monthly is too rich.",
    go: "Denver. Salt Lake (2-hour LAX). Fife for Sea-Tac (Kent KOA closed in 2021). Clark County Fairgrounds at $495 for Portland’s thinner LAX bank. Detroit if you want the new daily LAX and 70°F evenings.",
    skip: "Phoenix, inland Florida, Gulf, Vegas on the ground. Chicago is not an LA shuttle on the published table.",
    why: "Frontier’s home airport plus 70°F evenings is still the design center. Cheap summer is the Pacific Northwest, not a $1,400 Denver occupied site if you are mostly in LA.",
  },
  {
    id: "fall",
    headline: "Stay on DEN through foliage, then slide to PHX/LAS before the first hard freeze.",
    go: "Denver into October. Dallas. Then Phoenix and Vegas as nights cool. Houston. Orlando after hurricane peak. Watch for new 2027 LAX filings — they will show up as launching on this board.",
    skip: "LAS–BUR as a plan after 12 Oct 2026. High Rockies after the first snow. Gulf until named-storm season actually ends.",
    why: "Two-step: keep a fat LAX bank while it is pleasant, then trade snow for a short PHX or LAS hop.",
  },
];

export function hubById(id) {
  return HUBS[id];
}

export function goWildLabel(hub) {
  if (hub?.status === "launching") return "launching last-minute LA — confirm the filing";
  if (hub?.status === "announced") return "announced — not flying yet";
  if (hub?.status === "ended") return "ended — do not plan";
  switch (hub?.goWildToLax) {
    case "excellent":
      return "excellent last-minute LA";
    case "strong":
      return "strong last-minute LA";
    case "good":
      return "workable last-minute LA";
    case "connect":
      return "connect — weak last-minute LA";
    default:
      return "unknown";
  }
}

export function burIsLive(asOf = AS_OF) {
  return asOf < "2026-10-13";
}

export function laxStatusWord(hub) {
  if (!hub) return "unknown";
  if (hub.status === "launching") return "launching";
  if (hub.status === "announced") return "announced";
  if (hub.status === "ended") return "ended";
  if (hub.laxNonstop) return "nonstop";
  return "connect";
}

