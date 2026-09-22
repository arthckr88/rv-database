import L from "leaflet";

const BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

export function addDarkBasemap(map) {
  L.tileLayer(BASE, {
    maxZoom: 16,
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
  }).addTo(map);
  map.createPane("labels");
  const pane = map.getPane("labels");
  pane.style.zIndex = "450";
  pane.style.pointerEvents = "none";
  L.tileLayer(LABELS, { maxZoom: 16, pane: "labels" }).addTo(map);
}
