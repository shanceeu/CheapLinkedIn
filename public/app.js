import { sortGames } from "./sort.mjs";
import { locale, language, onLanguageChange, t } from "./i18n.mjs";

const $ = selector => document.querySelector(selector);
const create = (tag, className = "", value) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined && value !== null) node.textContent = String(value);
  return node;
};
const fmt = value => value === null || value === undefined ? "—" : new Intl.NumberFormat(locale()).format(value);
const pct = value => value === null || value === undefined ? "—" : `${Math.round(value * 100)}%`;
const decimal = (value, digits = 1, suffix = "") => value === null || value === undefined ? "—" : `${value.toFixed(digits)}${suffix}`;
const shortDate = value => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short" }).format(parsed);
};

function metric(label, value) {
  const root = create("div", "metric");
  root.append(create("span", "metric-value", value), create("span", "metric-label", t(label)));
  return root;
}

function metrics(items) {
  const root = create("div", "metrics");
  for (const [label, value] of items) root.append(metric(label, value));
  return root;
}

function stateMessage(root, data) {
  const box = create("div", `message ${data.state === "error" ? "message-error" : ""}`);
  box.append(create("strong", "", t(data.state === "error" ? "Stats unavailable" : "Connect to see stats")));
  box.append(create("p", "", t(data.message || "No data available yet.")));
  if (data.source) {
    const link = create("a", "text-link", t("Open player profile ↗"));
    link.href = data.source;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    box.append(link);
  }
  root.replaceChildren(box);
}

function matchList(items, label) {
  const root = create("div", "match-list");
  const heading = create("div", "list-heading");
  heading.append(create("span", "", t("Recent matches")), create("span", "", language() === "cs" ? `${items.length} zobrazeno` : `${items.length} shown`));
  root.append(heading);
  if (!items.length) { root.append(create("p", "empty", t("No recent matches available."))); return root; }
  for (const item of items) {
    const row = create("div", "match-row");
    const main = create("div", "match-main");
    main.append(create("strong", "", label(item)), create("small", "", shortDate(item.date)));
    row.append(main);
    if (item.result) row.append(create("span", `result ${item.result.toLowerCase()}`, language() === "cs" ? ({ Win: "Výhra", Loss: "Prohra", Draw: "Remíza" }[item.result] || item.result) : item.result));
    root.append(row);
  }
  return root;
}

let leetifyView = "overview";
function renderLeetify(data) {
  const root = $('[data-content="leetify"]');
  if (data.state !== "ready") return stateMessage(root, data);
  const content = document.createDocumentFragment();
  content.append(create("p", "player-name", data.name));
  const switcher = create("div", "stat-switch");
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", t("Choose CS2 stats"));
  for (const [view, label] of [["overview", "Overview"], ["aim", "Aim"], ["utility", "Utility"], ["duels", "Duels"]]) {
    const button = create("button", "", t(label));
    button.type = "button";
    button.dataset.view = view;
    button.setAttribute("aria-pressed", String(leetifyView === view));
    button.addEventListener("click", () => {
      leetifyView = view;
      renderLeetify(data);
      root.querySelector(`.stat-switch [data-view="${view}"]`)?.focus();
    });
    switcher.append(button);
  }
  content.append(switcher);
  const p = data.performance || {};
  const detail = create("div", "detail-line");
  const addDetail = (label, value) => detail.append(create("span", "", t(label)), create("strong", "", value));
  if (leetifyView === "aim") {
    content.append(metrics([["Aim rating", decimal(data.aim)], ["Positioning", decimal(p.positioning)], ["Reaction time", decimal(p.reactionTime, 0, " ms")]]));
    addDetail("Head accuracy", decimal(p.headAccuracy, 1, "%"));
    addDetail("Spray accuracy", decimal(p.sprayAccuracy, 1, "%"));
    addDetail("Good counter-strafe shots", decimal(p.counterStrafing, 1, "%"));
    addDetail("Pre-aim", decimal(p.preaim));
  } else if (leetifyView === "utility") {
    content.append(metrics([["Utility rating", decimal(p.utility)], ["Enemies flashed / flash", decimal(p.enemiesFlashed, 2)], ["HE damage / grenade", decimal(p.heDamage)]]));
    addDetail("Enemy flash duration", decimal(p.flashDuration, 2, " s"));
    addDetail("Trade kill success", decimal(p.tradeSuccess, 1, "%"));
  } else if (leetifyView === "duels") {
    content.append(metrics([["Opening rating", decimal(p.opening, 2)], ["Clutch rating", decimal(p.clutch, 2)], ["Leetify rating", decimal(data.rating)]]));
    addDetail("CT opening duels won", decimal(p.ctOpeningDuel, 1, "%"));
    addDetail("T opening duels won", decimal(p.tOpeningDuel, 1, "%"));
  } else {
    content.append(metrics([["Premier rating", fmt(data.rank)], ["Win rate", pct(data.winRate)], ["Tracked matches", fmt(data.matches)]]));
    addDetail("Leetify rating", decimal(data.rating));
    addDetail("Aim rating", decimal(data.aim));
  }
  content.append(detail, matchList(data.recent, item => item.map));
  root.replaceChildren(content);
}

function renderLeague(data) {
  const root = $('[data-content="league"]');
  if (data.state !== "ready") return stateMessage(root, data);
  const content = document.createDocumentFragment();
  content.append(create("p", "player-name", data.name));
  content.append(metrics([["Solo queue", data.rank], ["League points", fmt(data.lp)], ["Ranked record", data.wins === null ? "—" : `${data.wins}W · ${data.losses ?? 0}L`]]));
  if (data.recentChampions?.length) {
    const champions = create("p", "source-note", language() === "cs" ? `Poslední šampioni (${data.recent.length} zápasů): ${data.recentChampions.join(" · ")}` : `Recent champions (${data.recent.length} matches): ${data.recentChampions.join(" · ")}`);
    content.append(champions);
  }
  content.append(matchList(data.recent, item => `${item.champion} · ${item.kills}/${item.deaths}/${item.assists}`));
  root.replaceChildren(content);
}

function renderRocket(data) {
  const root = $('[data-content="rocket"]');
  if (data.state !== "ready") return stateMessage(root, data);
  const content = document.createDocumentFragment();
  content.append(create("p", "player-name", data.name));
  if (data.sample) {
    content.append(metrics([["Replay wins", `${data.wins} / ${data.sample}`], ["Goals", fmt(data.goals)], ["Saves", fmt(data.saves)]]));
    content.append(matchList(data.recent, item => `${item.playlist} · ${item.goals ?? "—"}G ${item.assists ?? "—"}A ${item.saves ?? "—"}S`));
  } else content.append(create("p", "empty", t("No matching public uploaded replays found. Use the live profile link above.")));
  content.append(create("p", "source-note", t(data.note)));
  root.replaceChildren(content);
}

const accounts = ["76561199147369622", "76561199113854269", "76561199527518684"];
let libraries = [];
let steamReady = false;
let visibleGames = 12;

function updateSteamAccount() {
  const id = $("#steam-profile").value;
  const library = libraries.find(item => item.id === id);
  $("#steam-id").textContent = id;
  $("#steam-link").href = `https://steamcommunity.com/profiles/${id}/`;
  const status = $("#steam-status");
  status.textContent = t(library?.status || "Status requires Steam API key");
  status.classList.toggle("online", library?.status === "Online");
  $("#steam-count").textContent = library ? (language() === "cs" ? `${fmt(library.count)} veřejných her · ${library.name}` : `${fmt(library.count)} visible games · ${library.name}`) : (language() === "cs" ? `Knihovna: ${t($("#steam-profile").selectedOptions[0].textContent)}` : `${$("#steam-profile").selectedOptions[0].textContent} library`);
  visibleGames = 12;
  renderGames();
}

function renderGames() {
  if (!steamReady) return;
  const root = $("#steam-content");
  const library = libraries.find(item => item.id === $("#steam-profile").value);
  const query = $("#steam-search").value.trim().toLowerCase();
  const games = sortGames((library?.games || []).filter(game => game.name.toLowerCase().includes(query)), $("#steam-sort").value);
  if (!games.length) {
    root.replaceChildren(create("p", "empty", t(query ? "No games match that search." : "This profile has no visible game details.")));
    return;
  }
  const content = document.createDocumentFragment();
  const list = create("div", "games-list");
  for (const game of games.slice(0, visibleGames)) {
    const row = create("a", "game-row");
    row.href = `https://store.steampowered.com/app/${game.id}/`;
    row.target = "_blank";
    row.rel = "noopener noreferrer";
    if (game.icon) {
      const icon = create("img", "game-icon");
      icon.src = game.icon;
      icon.alt = "";
      icon.loading = "lazy";
      row.append(icon);
    } else row.append(create("span", "game-icon"));
    const name = create("span", "game-name");
    const playedDate = game.lastPlayed ? new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", year: "numeric" }).format(game.lastPlayed * 1000) : null;
    const activity = language() === "cs" ? (playedDate ? `Naposledy hráno ${playedDate} · ${fmt(game.recentHours)} h za 2 týdny` : `${fmt(game.recentHours)} h za 2 týdny`) : (playedDate ? `Last played ${playedDate} · ${fmt(game.recentHours)} h in last 2 weeks` : `${fmt(game.recentHours)} h in last 2 weeks`);
    name.append(create("strong", "", game.name), create("small", "", activity));
    row.append(name, create("span", "game-hours", `${fmt(game.hours)} h`));
    list.append(row);
  }
  content.append(list);
  if (games.length > visibleGames) {
    const more = create("button", "show-more", language() === "cs" ? `Zobrazit další · zbývá ${games.length - visibleGames}` : `Show more · ${games.length - visibleGames} remaining`);
    more.type = "button";
    more.addEventListener("click", () => { visibleGames += 24; renderGames(); });
    content.append(more);
  }
  root.replaceChildren(content);
}

function renderSteam(data) {
  const root = $("#steam-content");
  if (data.state !== "ready") {
    steamReady = false;
    libraries = [];
    $("#steam-search").disabled = true;
    $("#steam-sort").disabled = true;
    stateMessage(root, data);
    const links = create("div", "profile-links");
    for (const id of data.ids || accounts) {
      const account = [...$("#steam-profile").options].find(option => option.value === id);
      const link = create("a", "text-link", language() === "cs" ? `Hry – ${t(account?.textContent || "Steam account")}` : `${account?.textContent || "Steam account"} games`);
      link.href = `https://steamcommunity.com/profiles/${id}/games/`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      links.append(link);
    }
    root.append(links);
    updateSteamAccount();
    return;
  }
  libraries = data.libraries;
  steamReady = true;
  $("#steam-search").disabled = false;
  $("#steam-sort").disabled = false;
  for (const option of $("#steam-profile").options) {
    const library = libraries.find(item => item.id === option.value);
    if (library) option.textContent = library.name;
  }
  updateSteamAccount();
}

const latest = {};
let lastChecked = null;
function showChecked() {
  if (!lastChecked) return;
  const time = new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(lastChecked);
  $("#updated").textContent = language() === "cs" ? `Zkontrolováno ${time}` : `Checked ${time}`;
}
onLanguageChange(() => {
  for (const [key, render] of [["leetify", renderLeetify], ["league", renderLeague], ["rocket", renderRocket], ["steam", renderSteam]]) {
    if (latest[key]) render(latest[key]);
  }
  showChecked();
});

async function load(name, render) {
  try {
    const response = await fetch(`/api/${name}`, { cache: "no-store" });
    const data = await response.json();
    latest[name] = data;
    render(data);
  } catch {
    const data = { state: "error", message: "Could not reach this provider. Try refreshing the page." };
    latest[name] = data;
    render(data);
  }
}

async function refresh() {
  const button = $("#refresh");
  button.disabled = true;
  $("#updated").textContent = t("Checking providers…");
  await Promise.all([load("leetify", renderLeetify), load("league", renderLeague), load("rocket", renderRocket), load("steam", renderSteam)]);
  lastChecked = new Date();
  showChecked();
  button.disabled = false;
}

$("#refresh").addEventListener("click", refresh);
$("#steam-profile").addEventListener("change", updateSteamAccount);
$("#steam-search").addEventListener("input", () => { visibleGames = 12; renderGames(); });
$("#steam-sort").addEventListener("change", () => { visibleGames = 12; renderGames(); });
$("#copyDiscordTag").addEventListener("click", async () => {
  const status = $("#copy-status");
  try {
    await navigator.clipboard.writeText("m4t335_cz3ch");
    status.textContent = t("Copied");
  } catch {
    status.textContent = t("Copy failed");
  }
  setTimeout(() => { status.textContent = t("Copy"); }, 1800);
});
$("#year").textContent = new Date().getFullYear();

const navLinks = [...document.querySelectorAll('.site-header nav a')];
const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
const gamePanels = [...document.querySelectorAll('.game-panel')];
let scrollTicking = false;
function syncScroll() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  document.documentElement.style.setProperty('--scroll-progress', `${Math.min(100, window.scrollY / maxScroll * 100)}%`);
  document.documentElement.style.setProperty('--orbit-angle', `${Math.min(window.scrollY, window.innerHeight) * .2}deg`);
  document.body.classList.toggle('is-scrolled', window.scrollY > 36);
  let activeId = null;
  for (const section of sections) if (section.getBoundingClientRect().top <= window.innerHeight * .38) activeId = section.id;
  for (const link of navLinks) {
    if (link.getAttribute('href') === `#${activeId}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  for (const panel of gamePanels) {
    const rect = panel.getBoundingClientRect();
    panel.classList.toggle('is-current', rect.top < window.innerHeight * .68 && rect.bottom > window.innerHeight * .32);
  }
  scrollTicking = false;
}
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(syncScroll);
}, { passive: true });
window.addEventListener('resize', syncScroll);
syncScroll();
updateSteamAccount();
refresh();
setInterval(refresh, 300000);
