import "leaflet/dist/leaflet.css";
import "./styles.css";
import "./nationwide-main.js";
import "./frontier-main.js";
import { mountPaid, setPaidRig, showPaid } from "./paid.js";
import { createLand } from "./public.js";

const lookupButtons = [...document.querySelectorAll("[data-lookup]")];
const rigButtons = [...document.querySelectorAll("[data-rig]")];
const panels = {
  nationwide: document.querySelector("#lookup-nationwide"),
  frontier: document.querySelector("#lookup-frontier"),
  "santa-monica": document.querySelector("#lookup-santa"),
};

const santaLand = createLand(panels["santa-monica"], { focus: "socal" });
const nationLand = createLand(panels.nationwide, { focus: "us" });
const frontierLand = createLand(panels.frontier, { focus: "us" });
const lands = {
  nationwide: nationLand,
  frontier: frontierLand,
  "santa-monica": santaLand,
};

let rig = localStorage.getItem("rv-rig") === "trailer" ? "trailer" : "classC";
let lookup = "nationwide";

function applyRig(next) {
  rig = next === "trailer" ? "trailer" : "classC";
  localStorage.setItem("rv-rig", rig);
  rigButtons.forEach((btn) => {
    const on = btn.dataset.rig === rig;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  setPaidRig(rig);
  santaLand.setRig(rig);
  nationLand.setRig(rig);
  frontierLand.setRig(rig);
  document.dispatchEvent(new CustomEvent("rv-rig", { detail: rig }));
}

function applySantaTab(next) {
  const root = panels["santa-monica"];
  root.querySelector("#panel-parks").hidden = next !== "parks";
  root.querySelector("#panel-land").hidden = next !== "land";
  root.querySelectorAll("[data-tab]").forEach((btn) => {
    const on = btn.dataset.tab === next;
    btn.classList.toggle("is-on", on);
    if (on) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  if (next === "parks") showPaid();
  else santaLand.show();
}

function applySide(panel, side) {
  panel.querySelectorAll("[data-side-panel]").forEach((el) => {
    el.hidden = el.dataset.sidePanel !== side;
  });
  panel.querySelectorAll("[data-side]").forEach((btn) => {
    const on = btn.dataset.side === side;
    btn.classList.toggle("is-on", on);
    if (on) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
}

function applyLookup(next, { writeHash = true } = {}) {
  lookup = panels[next] ? next : "nationwide";
  if (writeHash) {
    const hash = `#${lookup}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }
  for (const [id, panel] of Object.entries(panels)) {
    const on = id === lookup;
    panel.hidden = !on;
    if (on) panel.removeAttribute("hidden");
  }
  lookupButtons.forEach((btn) => {
    const on = btn.dataset.lookup === lookup;
    btn.classList.toggle("is-on", on);
    if (on) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  document.dispatchEvent(new CustomEvent("rv-show", { detail: lookup }));
  if (lookup === "santa-monica") {
    const landOn = !panels["santa-monica"].querySelector("#panel-land").hidden;
    if (landOn) santaLand.show();
    else showPaid();
  }
}

function hashLookup() {
  const hash = location.hash.replace("#", "");
  if (hash === "frontier" || hash === "santa-monica" || hash === "nationwide") return hash;
  if (hash === "land" || hash === "parks") return "santa-monica";
  return "nationwide";
}

santaLand.mount();
nationLand.mount();
frontierLand.mount();
mountPaid();
applyRig(rig);
applyLookup(hashLookup());

lookupButtons.forEach((btn) => btn.addEventListener("click", () => applyLookup(btn.dataset.lookup)));
rigButtons.forEach((btn) => btn.addEventListener("click", () => applyRig(btn.dataset.rig)));
panels["santa-monica"].querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => applySantaTab(btn.dataset.tab));
});
for (const panel of Object.values(panels)) {
  panel.querySelectorAll("[data-side]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applySide(panel, btn.dataset.side);
      const id = panel.dataset.lookupPanel;
      if (btn.dataset.side === "free") lands[id].show();
      document.dispatchEvent(new CustomEvent("rv-show", { detail: id }));
    });
  });
}
document.addEventListener("rv-rig-set", (event) => {
  if (event.detail !== rig) applyRig(event.detail);
});
window.addEventListener("hashchange", () => {
  const next = hashLookup();
  if (next !== lookup) applyLookup(next, { writeHash: false });
});
