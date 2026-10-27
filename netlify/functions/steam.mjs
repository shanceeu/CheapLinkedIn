import { failure, getJson, json } from "./lib/shared.mjs";

const defaultIds = ["76561199147369622", "76561199113854269", "76561199527518684"];

const states = ["Offline", "Online", "Busy", "Away", "Snooze", "Looking to trade", "Looking to play"];

export function shapeSteam(id, data, profile = {}) {
  const response = data?.response || {};
  const games = Array.isArray(response.games) ? response.games : [];
  return {
    id,
    profile: `https://steamcommunity.com/profiles/${id}/`,
    name: profile.personaname || `Steam ${id.slice(-4)}`,
    status: states[profile.personastate] || "Status unavailable",
    count: response.game_count ?? games.length,
    games: games.map(game => ({
      id: game.appid,
      name: game.name || `App ${game.appid}`,
      hours: Math.round((game.playtime_forever || 0) / 60 * 10) / 10,
      recentHours: Math.round((game.playtime_2weeks || 0) / 60 * 10) / 10,
      icon: game.img_icon_url ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg` : null,
    })).sort((a, b) => b.recentHours - a.recentHours || b.hours - a.hours),
  };
}

export async function handler() {
  const ids = (process.env.STEAM_IDS || defaultIds.join(",")).split(",").map(id => id.trim()).filter(id => /^\d{17}$/.test(id));
  const key = process.env.STEAM_API_KEY;
  if (!key) return json(200, { state: "setup", ids, message: "Add STEAM_API_KEY to display the three Steam libraries." });
  try {
    const summaryUrl = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/");
    summaryUrl.searchParams.set("key", key);
    summaryUrl.searchParams.set("steamids", ids.join(","));
    const summaries = await getJson(summaryUrl).catch(() => ({ response: { players: [] } }));
    const profiles = new Map((summaries.response?.players || []).map(player => [player.steamid, player]));
    const libraries = await Promise.all(ids.map(async id => {
      const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
      url.searchParams.set("key", key);
      url.searchParams.set("steamid", id);
      url.searchParams.set("include_appinfo", "true");
      url.searchParams.set("include_played_free_games", "true");
      const data = await getJson(url);
      return shapeSteam(id, data, profiles.get(id));
    }));
    return json(200, { state: "ready", libraries });
  } catch (error) { return failure(error); }
}
