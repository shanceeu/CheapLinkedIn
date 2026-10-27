import { failure, getJson, json, number } from "./lib/shared.mjs";

const profileUrl = "https://rocketleague.tracker.network/rocket-league/profile/epic/Matees_czech/overview";

export function shapeRocket(replays, identity) {
  const recent = replays.map(replay => {
    const teams = [replay.blue, replay.orange];
    const team = teams.find(side => side?.players?.some(player =>
      identity.id ? `${player.id?.platform}:${player.id?.id}`.toLowerCase() === identity.id.toLowerCase()
        : player.name?.toLowerCase() === identity.name.toLowerCase()));
    if (!team) return null;
    const player = team.players.find(item => identity.id
      ? `${item.id?.platform}:${item.id?.id}`.toLowerCase() === identity.id.toLowerCase()
      : item.name?.toLowerCase() === identity.name.toLowerCase());
    const other = team === replay.blue ? replay.orange : replay.blue;
    const goals = number(team.goals);
    const against = number(other?.goals);
    return {
      id: replay.id,
      date: replay.date || null,
      playlist: replay.playlist_name || "Match",
      result: goals === null || against === null ? null : goals > against ? "Win" : goals < against ? "Loss" : "Draw",
      goals: number(player?.stats?.core?.goals), assists: number(player?.stats?.core?.assists), saves: number(player?.stats?.core?.saves),
      score: number(player?.stats?.core?.score),
    };
  }).filter(Boolean);
  return {
    state: "ready", name: "Matees_czech", source: profileUrl,
    note: "Stats from public uploaded replays on ballchasing, not all matches or live rank.",
    sample: recent.length,
    wins: recent.filter(match => match.result === "Win").length,
    goals: recent.reduce((sum, match) => sum + (match.goals || 0), 0),
    assists: recent.reduce((sum, match) => sum + (match.assists || 0), 0),
    saves: recent.reduce((sum, match) => sum + (match.saves || 0), 0),
    recent,
  };
}

export async function handler() {
  const key = process.env.BALLCHASING_API_KEY;
  const identity = { id: process.env.BALLCHASING_PLAYER_ID, name: process.env.BALLCHASING_PLAYER_NAME || "Matees_czech" };
  if (!key) return json(200, {
    state: "setup", source: profileUrl,
    message: "Open the live Rocket League profile. Add a ballchasing API key to show uploaded replay stats here.",
  });
  try {
    const url = new URL("https://ballchasing.com/api/replays");
    url.searchParams.set(identity.id ? "player-id" : "player-name", identity.id || identity.name);
    url.searchParams.set("count", "5");
    url.searchParams.set("sort-by", "replay-date");
    url.searchParams.set("sort-dir", "desc");
    const headers = { Authorization: key };
    const list = await getJson(url, headers);
    const replays = [];
    for (const item of (list.list || []).slice(0, 5)) {
      replays.push(await getJson(`https://ballchasing.com/api/replays/${encodeURIComponent(item.id)}`, headers));
      if (replays.length < 5) await new Promise(resolve => setTimeout(resolve, 550));
    }
    return json(200, shapeRocket(replays, identity));
  } catch (error) { return failure(error); }
}
