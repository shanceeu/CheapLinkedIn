import { convertInteger } from "./converter.mjs";
import { language, locale, onLanguageChange, setLanguage, t, translateStatic } from "./i18n.mjs";

const $ = selector => document.querySelector(selector);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const preferences = {
  identity: ["real", "sm1ted", "matees"],
  accent: ["wine", "ruby", "blue"],
  effect: ["storm", "matrix", "still"],
  cursor: ["system", "halo", "crosshair"],
};
function saved(key, fallback) {
  const value = localStorage.getItem(`site-${key}`);
  return preferences[key]?.includes(value) ? value : fallback;
}

translateStatic();
$("#language-toggle").addEventListener("click", () => setLanguage(language() === "en" ? "cs" : "en"));
function syncLanguageToggle() {
  const button = $("#language-toggle");
  button.textContent = language() === "en" ? "CZ" : "EN";
  button.setAttribute("aria-label", language() === "en" ? "Switch to Czech" : "Přepnout do angličtiny");
  updateClock();
}
onLanguageChange(syncLanguageToggle);

const names = { real: "Matěj Pertl", sm1ted: "Sm1ted", matees: "Matees_czech" };
function bindChoice(id, key, fallback, apply) {
  const select = $(id);
  select.value = saved(key, fallback);
  apply(select.value);
  select.addEventListener("change", () => {
    localStorage.setItem(`site-${key}`, select.value);
    apply(select.value);
  });
}
const identitySelect = $("#identity-select");
const nameKeys = Object.keys(names);
let nameKey = saved("identity", "real");
let nameTimer;
let nameCycle;
identitySelect.value = nameKey;
function setDisplayedName(value) {
  $("#brand-name").textContent = value;
  $("#hero-name").textContent = value;
}
function showName(key, animate = true) {
  clearTimeout(nameTimer);
  nameKey = key;
  identitySelect.value = key;
  const name = names[key];
  if (!animate || reducedMotion.matches) {
    setDisplayedName(name);
    $(".identity-letter").textContent = name[0].toUpperCase();
    return;
  }
  let remaining = $("#brand-name").textContent.length;
  let written = 0;
  function step() {
    if (remaining > 0) {
      remaining--;
      setDisplayedName($("#brand-name").textContent.slice(0, remaining));
      nameTimer = setTimeout(step, 35);
    } else if (written < name.length) {
      written++;
      setDisplayedName(name.slice(0, written));
      nameTimer = setTimeout(step, 70);
    } else $(".identity-letter").textContent = name[0].toUpperCase();
  }
  step();
}
function scheduleName() {
  clearTimeout(nameCycle);
  if (reducedMotion.matches || document.hidden) return;
  nameCycle = setTimeout(() => {
    showName(nameKeys[(nameKeys.indexOf(nameKey) + 1) % nameKeys.length]);
    scheduleName();
  }, 5000);
}
showName(nameKey, false);
scheduleName();
identitySelect.addEventListener("change", () => {
  localStorage.setItem("site-identity", identitySelect.value);
  showName(identitySelect.value);
  scheduleName();
});
reducedMotion.addEventListener("change", () => { showName(nameKey, false); scheduleName(); });
document.addEventListener("visibilitychange", scheduleName);
bindChoice("#accent-select", "accent", "wine", value => {
  document.documentElement.dataset.accent = value;
  $("meta[name=theme-color]").content = { wine: "#58181F", ruby: "#E0115F", blue: "#0018A8" }[value];
});
bindChoice("#effect-select", "effect", "storm", value => {
  document.documentElement.dataset.effect = value;
  window.dispatchEvent(new CustomEvent("site-effect-change", { detail: value }));
});

const cursor = document.createElement("div");
cursor.id = "custom-cursor";
cursor.setAttribute("aria-hidden", "true");
document.body.append(cursor);
bindChoice("#cursor-select", "cursor", "system", value => {
  document.documentElement.dataset.cursor = value;
  if (value !== "halo") cursor.classList.remove("visible");
});
window.addEventListener("pointermove", event => {
  if (event.pointerType === "touch" || document.documentElement.dataset.cursor !== "halo") return;
  cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  cursor.classList.add("visible");
  cursor.classList.toggle("over-action", event.target instanceof Element && Boolean(event.target.closest("a, button, select, input")));
}, { passive: true });
document.addEventListener("pointerout", event => {
  if (!event.relatedTarget) cursor.classList.remove("visible");
});

const clock = $("#live-clock");
const timezone = $("#timezone-select");
const zones = [...timezone.options].map(option => option.value);
timezone.value = zones.includes(localStorage.getItem("site-timezone")) ? localStorage.getItem("site-timezone") : "Europe/Prague";
timezone.addEventListener("change", () => { localStorage.setItem("site-timezone", timezone.value); updateClock(); });
let clockTimer;
function updateClock() {
  if (!clock) return;
  const now = new Date();
  const common = { timeZone: timezone.value };
  clock.textContent = new Intl.DateTimeFormat(locale(), { ...common, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  clock.dateTime = now.toISOString();
  $("#clock-date").textContent = new Intl.DateTimeFormat(locale(), { ...common, weekday: "long", day: "numeric", month: "long", year: "numeric", timeZoneName: "short" }).format(now);
  clearTimeout(clockTimer);
  if (!document.hidden) clockTimer = setTimeout(updateClock, 1000 - Date.now() % 1000 + 8);
}
document.addEventListener("visibilitychange", updateClock);
updateClock();
syncLanguageToggle();

function updateConversion() {
  const error = $("#convert-error");
  try {
    const result = convertInteger($("#number-input").value, $("#number-base").value);
    for (const target of $("#conversion-results").querySelectorAll("[data-base]")) target.textContent = result[target.dataset.base];
    error.textContent = "";
  } catch (cause) {
    for (const target of $("#conversion-results").querySelectorAll("[data-base]")) target.textContent = "—";
    error.textContent = language() === "cs" ? (cause.message.includes("128") ? "Zadej celé číslo o nejvýše 128 číslicích." : `Použij pouze číslice soustavy se základem ${$("#number-base").value}.`) : cause.message;
  }
}
$("#number-input").addEventListener("input", updateConversion);
$("#number-base").addEventListener("change", updateConversion);
onLanguageChange(updateConversion);
updateConversion();

const drawer = $("#tool-drawer");
const toolsToggle = $("#tools-toggle");
toolsToggle.addEventListener("click", () => {
  drawer.showModal();
  toolsToggle.setAttribute("aria-expanded", "true");
  $("#number-input").focus();
});
$("#tools-close").addEventListener("click", () => drawer.close());
drawer.addEventListener("click", event => {
  const bounds = drawer.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) drawer.close();
});
drawer.addEventListener("close", () => {
  toolsToggle.setAttribute("aria-expanded", "false");
  toolsToggle.focus();
});

const typeout = $("#typeout");
let typeTimer;
function startTypeout() {
  clearTimeout(typeTimer);
  const phrase = language() === "cs" ? typeout.dataset.cs : typeout.dataset.en;
  typeout.setAttribute("aria-label", phrase);
  if (reducedMotion.matches) { typeout.textContent = phrase; return; }
  let index = 0;
  typeout.textContent = "";
  function step() {
    index = Math.min(phrase.length, index + 1);
    typeout.textContent = phrase.slice(0, index);
    if (index < phrase.length) typeTimer = setTimeout(step, 70);
  }
  typeTimer = setTimeout(step, 350);
}
onLanguageChange(startTypeout);
reducedMotion.addEventListener("change", startTypeout);
startTypeout();

const quotes = [
  { en: "“One more commit, then I’ll study for the exam.”", cs: "„Ještě jeden commit a pak se začnu učit na zkoušku.“" },
  { en: "“The deadline is tomorrow. The bug thinks it’s funny.”", cs: "„Termín je zítra. Ten bug si ze mě dělá legraci.“" },
  { en: "“Coffee, code, lecture notes. Pick two.”", cs: "„Káva, kód, poznámky z přednášky. Vyber si dvě.“" },
];
let quoteIndex = 0;
function showQuote() { $("#student-quote").textContent = quotes[quoteIndex][language()]; }
onLanguageChange(showQuote);
setInterval(() => {
  if (document.hidden || reducedMotion.matches) return;
  quoteIndex = (quoteIndex + 1) % quotes.length;
  showQuote();
}, 9000);

const rail = document.createElement("nav");
rail.className = "chapter-rail";
rail.setAttribute("aria-label", "Page sections");
for (const [id, label] of [["studio", "Studio"], ["work", "Work"], ["achievements", "Achievements"], ["games", "Games"], ["steam", "Steam"], ["contact", "Contact"]]) {
  const link = document.createElement("a");
  link.href = `#${id}`;
  link.textContent = label;
  rail.append(link);
}
document.body.append(rail);
function translateRail() {
  rail.setAttribute("aria-label", t("Page sections"));
  for (const link of rail.querySelectorAll("a")) {
    link.textContent = t(link.dataset.label);
    link.dataset.display = t(link.dataset.label);
  }
}
for (const link of rail.querySelectorAll("a")) link.dataset.label = link.textContent;
onLanguageChange(translateRail);
translateRail();
const railLinks = [...rail.querySelectorAll("a")];
const sectionElements = railLinks.map(link => document.querySelector(link.getAttribute("href")));
function updateRail() {
  let active = -1;
  for (let index = 0; index < sectionElements.length; index++) {
    if (sectionElements[index].getBoundingClientRect().top < innerHeight * .42) active = index;
  }
  railLinks.forEach((link, index) => {
    if (index === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  const current = sectionElements[Math.max(0, active)];
  const rect = current.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, (innerHeight * .42 - rect.top) / Math.max(1, rect.height)));
  rail.style.setProperty("--chapter-fill", `${progress * 100}%`);
}
let railFrame = 0;
window.addEventListener("scroll", () => {
  if (railFrame) return;
  railFrame = requestAnimationFrame(() => { railFrame = 0; updateRail(); });
}, { passive: true });
window.addEventListener("resize", updateRail);
updateRail();
