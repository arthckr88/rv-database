export const US_CENTER = { lat: 39.5, lng: -98.35 };

export const MILES_TO_METERS = 1609.34;

export const RING_ORDER = ["0-20", "20-45", "45-80", "80-140"];

export const RINGS = [
  { id: "0-20", miles: 20, label: "0–20 mi", blurb: "Beach-close / Westside" },
  { id: "20-45", miles: 45, label: "20–45 mi", blurb: "Valley, Harbor, OC edge" },
  { id: "45-80", miles: 80, label: "45–80 mi", blurb: "Ventura, OC, Inland start" },
  { id: "80-140", miles: 140, label: "80–140 mi", blurb: "Value monthly / stretch" },
];

export const RING_COLORS = {
  "0-20": "#5aa7b8",
  "20-45": "#d4a056",
  "45-80": "#c56b4a",
  "80-140": "#6d7344",
};

export function ringLabel(id) {
  return RINGS.find((r) => r.id === id)?.label ?? id ?? "—";
}
