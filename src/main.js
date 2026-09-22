import "leaflet/dist/leaflet.css";
import "./styles.css";
import { mountPaid, setPaidRig, showPaid } from "./paid.js";
import { mountPublic, setPublicRig, showPublic } from "./public.js";

const tabButtons = [...document.querySelectorAll("[data-tab]")];
const rigButtons = [...document.querySelectorAll("[data-rig]")];

let rig = localStorage.getItem("socal-rig") === "trailer" ? "trailer" : "classC";
let tab = location.hash === "#land" ? "land" : "parks";

function applyRig(next) {
  rig = next;
  localStorage.setItem("socal-rig", rig);
  rigButtons.forEach((btn) => {
    const on = btn.dataset.rig === rig;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  setPaidRig(rig);
  setPublicRig(rig);
}

function applyTab(next, { writeHash = true } = {}) {
  tab = next;
  if (writeHash) {
    const hash = next === "land" ? "#land" : "#parks";
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }
  document.querySelector("#panel-parks").hidden = next !== "parks";
  document.querySelector("#panel-land").hidden = next !== "land";
  tabButtons.forEach((btn) => {
    const on = btn.dataset.tab === next;
    btn.classList.toggle("is-on", on);
    if (on) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  if (next === "parks") showPaid();
  else showPublic();
}

mountPaid();
mountPublic();
applyRig(rig);
applyTab(tab);

tabButtons.forEach((btn) => btn.addEventListener("click", () => applyTab(btn.dataset.tab)));
rigButtons.forEach((btn) => btn.addEventListener("click", () => applyRig(btn.dataset.rig)));
window.addEventListener("hashchange", () => {
  const next = location.hash === "#land" ? "land" : "parks";
  if (next !== tab) applyTab(next, { writeHash: false });
});
