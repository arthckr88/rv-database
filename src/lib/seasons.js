/** Regional climate, storm windows, and which states move together. */

export const SEASONS = [
  { id: "winter", label: "Winter", months: "Nov–Mar" },
  { id: "spring", label: "Spring", months: "Mar–May" },
  { id: "summer", label: "Summer", months: "Jun–Aug" },
  { id: "fall", label: "Fall", months: "Sep–Nov" },
];

export const STATE_NAMES = {
  AK: "Alaska",
  AL: "Alabama",
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MS: "Mississippi",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  WY: "Wyoming",
};

export const REGIONS = {
  socal: {
    id: "socal",
    label: "SoCal coast",
    states: ["CA"],
    yearRound: true,
    bestSeasons: ["winter", "spring", "summer", "fall"],
    avoidSeasons: [],
    hazards: ["wildfire"],
    note: "Mediterranean marine layer. Mild winters, dry summers, wildfire smoke Aug–Oct inland and in the hills. One of the few true year-round coastal bases.",
    correlates: ["desert-sw", "ca-desert"],
  },
  "ca-inland": {
    id: "ca-inland",
    label: "SoCal inland / IE",
    states: ["CA"],
    yearRound: false,
    bestSeasons: ["winter", "spring", "fall"],
    avoidSeasons: ["summer"],
    hazards: ["heat", "wildfire"],
    note: "Cheaper monthly than the coast. Summers often 95–110°F. Fine as a winter/spring value base if you do not need ocean air.",
    correlates: ["socal", "ca-desert"],
  },
  "ca-desert": {
    id: "ca-desert",
    label: "California desert",
    states: ["CA"],
    yearRound: false,
    bestSeasons: ["winter", "spring", "fall"],
    avoidSeasons: ["summer"],
    hazards: ["heat"],
    note: "Palm Springs / Coachella snowbird circuit. Winters are the point. Summer monthlies drop because daytime highs routinely top 110°F.",
    correlates: ["desert-sw", "socal"],
  },
  "desert-sw": {
    id: "desert-sw",
    label: "Arizona / Nevada / New Mexico",
    states: ["AZ", "NV", "NM"],
    yearRound: false,
    bestSeasons: ["winter", "spring"],
    avoidSeasons: ["summer"],
    hazards: ["heat", "monsoon"],
    note: "Largest snowbird inventory in the U.S. Oct–Apr is the window. May–Sep is extreme heat; Jul–Sep monsoon storms. Quartzsite and Yuma are the budget end; Mesa/Tucson the amenity end.",
    correlates: ["ca-desert", "texas-rgv"],
  },
  "texas-rgv": {
    id: "texas-rgv",
    label: "South Texas / Rio Grande Valley",
    states: ["TX"],
    yearRound: false,
    bestSeasons: ["winter", "spring", "fall"],
    avoidSeasons: ["summer"],
    hazards: ["heat", "humidity"],
    note: "Winter Texan country — usually the cheapest warm monthly in the country. Mild winters, humid summers, easy Mexico day trips. Not a hurricane bullseye like the Gulf Bend.",
    correlates: ["desert-sw", "florida", "texas-hill"],
  },
  "texas-hill": {
    id: "texas-hill",
    label: "Texas Hill Country / Austin",
    states: ["TX"],
    yearRound: false,
    bestSeasons: ["fall", "spring", "winter"],
    avoidSeasons: ["summer"],
    hazards: ["heat", "tornado"],
    note: "Wildflowers in spring, milder winters than Houston. Summers are brutal. Severe storms more likely in spring than on the Valley floor.",
    correlates: ["texas-rgv", "plains"],
  },
  florida: {
    id: "florida",
    label: "Florida",
    states: ["FL"],
    yearRound: false,
    bestSeasons: ["winter", "spring"],
    avoidSeasons: ["summer"],
    hazards: ["hurricane", "heat", "humidity"],
    note: "Dry, pleasant Nov–Apr — that is when you should be here. May–Oct is wet, hot, and hurricane season (peak Aug–Oct). Inland Ocala/Heartland is cheaper than the Gulf or Keys. Summer monthlies look like a deal; the weather is the catch.",
    correlates: ["gulf", "southeast", "texas-rgv"],
  },
  gulf: {
    id: "gulf",
    label: "Gulf Coast",
    states: ["AL", "MS", "LA", "FL"],
    yearRound: false,
    bestSeasons: ["winter", "spring", "fall"],
    avoidSeasons: ["summer"],
    hazards: ["hurricane", "humidity"],
    note: "Shoulder seasons are the play. Hurricane season 1 Jun–30 Nov, statistically worst mid-Aug to mid-Oct. Winters are mild compared with the Midwest.",
    correlates: ["florida", "southeast"],
  },
  southeast: {
    id: "southeast",
    label: "Southeast / Appalachians",
    states: ["GA", "SC", "NC", "TN"],
    yearRound: false,
    bestSeasons: ["spring", "fall"],
    avoidSeasons: ["summer"],
    hazards: ["hurricane", "humidity"],
    note: "Spring bloom and October color are the prizes. Coastal SC/GA share Florida's hurricane calendar. Asheville and the Smokies are summer-cooler than the Piedmont but still humid.",
    correlates: ["florida", "gulf", "mid-atlantic"],
  },
  "pacific-nw": {
    id: "pacific-nw",
    label: "Pacific Northwest",
    states: ["OR", "WA"],
    yearRound: false,
    bestSeasons: ["summer", "fall"],
    avoidSeasons: ["winter"],
    hazards: ["rain"],
    note: "The national summer refuge: dry, 70s, long daylight. Winters are dark and wet, not usually frozen on the I-5 corridor. Bend is colder and sunnier than Portland.",
    correlates: ["rockies", "great-lakes"],
  },
  rockies: {
    id: "rockies",
    label: "Rockies / high West",
    states: ["CO", "UT", "ID", "MT", "WY"],
    yearRound: false,
    bestSeasons: ["summer", "fall"],
    avoidSeasons: ["winter"],
    hazards: ["snow", "altitude"],
    note: "Go June–September. Shoulder snow happens in May and October. St. George, UT is the exception — a desert winter alternative closer to Zion than to Denver.",
    correlates: ["pacific-nw", "desert-sw"],
  },
  "great-lakes": {
    id: "great-lakes",
    label: "Great Lakes",
    states: ["MI", "WI", "MN"],
    yearRound: false,
    bestSeasons: ["summer", "fall"],
    avoidSeasons: ["winter"],
    hazards: ["snow"],
    note: "Summer water and September color. Winters are not an RV season unless the rig is built for it. Cherry season and lake-effect snow both run on a calendar.",
    correlates: ["new-england", "pacific-nw"],
  },
  hawaii: {
    id: "hawaii",
    label: "Hawaii",
    states: ["HI"],
    yearRound: true,
    bestSeasons: ["winter", "spring", "summer", "fall"],
    avoidSeasons: [],
    hazards: ["hurricane"],
    note: "True tropical year-round, but this is not a mainland monthly market. County parks cap stays. Interisland hops and shipping the rig are the tax. Hurricane season is June–November.",
    correlates: ["socal"],
  },
  alaska: {
    id: "alaska",
    label: "Alaska",
    states: ["AK"],
    yearRound: false,
    bestSeasons: ["summer"],
    avoidSeasons: ["winter", "spring", "fall"],
    hazards: ["snow"],
    note: "May–August only for most rigs. Anchorage and the Kenai are the live-in window. Winter is dark and frozen. Do not treat an Anchorage monthly as a year-round product.",
    correlates: ["pacific-nw", "rockies"],
  },
  "new-england": {
    id: "new-england",
    label: "New England",
    states: ["ME", "NH", "VT", "MA", "RI", "CT"],
    yearRound: false,
    bestSeasons: ["summer", "fall"],
    avoidSeasons: ["winter"],
    hazards: ["snow"],
    note: "June–August for weather; late Sep–mid Oct for foliage (north to south). Winter ice and closed water are real. Book Acadia and leaf-peeping weekends early.",
    correlates: ["great-lakes", "mid-atlantic"],
  },
  "mid-atlantic": {
    id: "mid-atlantic",
    label: "Mid-Atlantic",
    states: ["NY", "PA", "NJ", "MD", "VA", "DC", "DE", "WV"],
    yearRound: false,
    bestSeasons: ["spring", "fall"],
    avoidSeasons: ["winter"],
    hazards: ["snow", "hurricane"],
    note: "April–May and September–October. Summers humid. Late-season tropical remnants can still soak the coast. Winter is possible in VA Beach, grim in the Adirondacks.",
    correlates: ["new-england", "southeast"],
  },
  plains: {
    id: "plains",
    label: "Plains / Ozarks",
    states: ["OK", "KS", "MO", "AR", "NE", "SD", "ND", "IA"],
    yearRound: false,
    bestSeasons: ["fall", "spring"],
    avoidSeasons: ["winter"],
    hazards: ["tornado", "snow"],
    note: "September–October is the sane window. April–June is peak tornado season in OK/KS. Branson and Hot Springs work as shoulder-season value. South Dakota is a summer Black Hills play.",
    correlates: ["texas-hill", "rockies"],
  },
  midwest: {
    id: "midwest",
    label: "Lower Midwest",
    states: ["IN", "OH", "IL", "KY"],
    yearRound: false,
    bestSeasons: ["spring", "fall", "summer"],
    avoidSeasons: ["winter"],
    hazards: ["snow", "tornado"],
    note: "Workable May–September. Not a destination climate — useful as a cheap in-between on a loop, not as a winter base.",
    correlates: ["great-lakes", "plains"],
  },
};

export const SEASON_GUIDES = [
  {
    id: "winter",
    headline: "Go south. Stay dry.",
    go: "Florida, Rio Grande Valley, Arizona, SoCal / Coachella, southern Nevada.",
    skip: "Rockies, Great Lakes, New England, high plains. Tornado alley is quiet; hurricanes are over.",
    why: "This is snowbird season. Warmest: Florida and the Keys. Driest: Arizona. Cheapest warm: South Texas. SoCal coast is the rare place you can also stay all year without a furnace or a 16k A/C bill.",
  },
  {
    id: "spring",
    headline: "Leave Florida before it steams. Leave Arizona before it cooks.",
    go: "SoCal, Hill Country wildflowers, Southeast bloom, Mid-Atlantic, desert until May.",
    skip: "Plains tornado corridor (Apr–Jun). Gulf and Florida as humidity and early tropical weather ramp up.",
    why: "Best nationwide shoulder. Desert is gorgeous until heat arrives. Florida is still fine in March, crowded and sticky by May. Start pointing the rig north or west.",
  },
  {
    id: "summer",
    headline: "North and high. The South is a heat index.",
    go: "Pacific Northwest, Rockies, Great Lakes, New England, high Utah/Colorado.",
    skip: "Arizona, inland California, South Texas, Florida, Gulf. Hurricane season is open (1 Jun–30 Nov).",
    why: "Year-round weather does not exist in Phoenix in July. PNW and the lakes are the quality-of-life win. If you must stay south, you are paying for A/C and watching NHC outlooks.",
  },
  {
    id: "fall",
    headline: "Foliage north, then slide southwest before the first freeze.",
    go: "New England and Appalachians late Sep–mid Oct, then PNW, then desert and Texas as nights cool.",
    skip: "Florida and the Gulf until hurricane season actually ends (named storms into November happen). High Rockies after the first snow.",
    why: "Two-step season: color in the north, then snowbird opening in AZ/TX/FL. SoCal and St. George work as a bridge.",
  },
];

const INLAND_CA = new Set(["Hemet", "San Bernardino", "Pomona", "Walnut", "Ramona"]);

export function inferState(park) {
  if (park.state) return park.state;
  return "CA";
}

export function inferRegion(park) {
  if (park.region && REGIONS[park.region]) return park.region;
  const state = inferState(park);
  if (state === "CA") {
    if (INLAND_CA.has(park.city)) return "ca-inland";
    return "socal";
  }
  const match = Object.values(REGIONS).find((r) => r.states.includes(state) && r.id !== "socal");
  return match?.id ?? "socal";
}

export function hydratePark(park) {
  const state = inferState(park);
  const regionId = inferRegion({ ...park, state });
  const region = REGIONS[regionId];
  return {
    ...park,
    state,
    stateName: STATE_NAMES[state] ?? state,
    region: regionId,
    regionLabel: region?.label ?? regionId,
    yearRound: park.yearRound ?? region?.yearRound ?? false,
    bestSeasons: park.bestSeasons ?? region?.bestSeasons ?? ["spring", "fall"],
    avoidSeasons: park.avoidSeasons ?? region?.avoidSeasons ?? [],
    hazards: park.hazards ?? region?.hazards ?? [],
    climateNote: park.climateNote ?? region?.note ?? "",
    ageRestriction: park.ageRestriction ?? "all-ages",
    nearestAirport: park.nearestAirport ?? null,
    driveMinutesToAirport: park.driveMinutesToAirport ?? null,
    driveMilesToAirport: park.driveMilesToAirport ?? null,
    driveMilesToSantaMonica: park.driveMilesToSantaMonica ?? null,
    driveMinutesOffPeak: park.driveMinutesOffPeak ?? null,
    driveMinutesPeak: park.driveMinutesPeak ?? null,
    ring: park.ring ?? null,
  };
}

export function seasonalFit(park, season) {
  if (!season) {
    if (park.yearRound) return 8.6;
    const n = park.bestSeasons?.length ?? 0;
    if (n >= 3) return 7.8;
    if (n === 2) return 7.1;
    return 6.4;
  }
  if (park.bestSeasons?.includes(season)) return 9.5;
  if (park.avoidSeasons?.includes(season)) return 2.4;
  return 6.3;
}

export function seasonLabel(ids) {
  const map = Object.fromEntries(SEASONS.map((s) => [s.id, s.label]));
  return (ids || []).map((id) => map[id] ?? id).join(" · ") || "—";
}

export function regionColor(id) {
  return REGION_COLORS[id] ?? "#8a7a72";
}

export const REGION_COLORS = {
  socal: "#4f96a6",
  "ca-inland": "#7a9e8c",
  "ca-desert": "#d4a056",
  "desert-sw": "#c56b4a",
  "texas-rgv": "#d7b07a",
  "texas-hill": "#b8895a",
  florida: "#5aa7b8",
  gulf: "#3d7f8c",
  southeast: "#8faf78",
  "pacific-nw": "#6b8f71",
  rockies: "#8a7cb8",
  "great-lakes": "#5b7fa6",
  "new-england": "#c47b6a",
  "mid-atlantic": "#9a7a6a",
  plains: "#a09070",
  midwest: "#8a8078",
  hawaii: "#3d9f9c",
  alaska: "#7a8fa6",
};
