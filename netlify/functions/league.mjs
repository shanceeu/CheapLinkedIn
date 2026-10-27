import { failure, getJson, json, number } from "./lib/shared.mjs";

const REGIONS = {
  br1: "americas", la1: "americas", la2: "americas", na1: "americas",
  eun1: "europe", euw1: "europe", tr1: "europe", ru: "europe",
  jp1: "asia", kr: "asia",
  oc1: "sea", ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};

export function shapeLeague(entries, matches, puuid, name, tag) {
  const ranked = entries.find(entry => entry.queueType === "RANKED_SOLO_5x5");
  const recent = matches.map(match => {
    const player = match?.info?.participants?.find(participant => participant.puuid === puuid);
    if (!player) return null;
    return {
      champion: player.championName || "Champion",
      result: player.win ? "Win" : "Loss",
      kills: number(player.kills) ?? 0,
      deaths: number(player.deaths) ?? 0,
      assists: number(player.assists) ?? 0,
      date: match.info.gameEndTimestamp || match.info.gameCreation || null,
    };
  }).filter(Boolean);
  const championCounts = new Map();
  for (const match of recent) championCounts.set(match.champion, (championCounts.get(match.champion) || 0) + 1);
  const recentChampions = [...championCounts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([champion]) => champion);
  return {
    state: "ready", name: `${name}#${tag}`,
    rank: ranked ? `${ranked.tier} ${ranked.rank}` : "Unranked",
    lp: number(ranked?.leaguePoints),
    wins: number(ranked?.wins), losses: number(ranked?.losses),
    recent, recentChampions,
    source: `https://tracker.gg/lol/profile/riot/${encodeURIComponent(`${name}#${tag}`)}/overview`,
  };
}

export async function handler() {
  const name = process.env.RIOT_GAME_NAME || "Sm1ted";
  const tag = process.env.RIOT_TAGLINE || "Diff";
  const key = process.env.RIOT_API_KEY;
  const platform = (process.env.RIOT_PLATFORM || "eun1").toLowerCase();
  const region = REGIONS[platform];
  if (!name || !tag || !key) return json(200, { state: "setup", message: "Add your Riot ID and RIOT_API_KEY to Netlify." });
  if (!region) return json(200, { state: "setup", message: "RIOT_PLATFORM is not a supported Riot server." });
  const headers = { "X-Riot-Token": key };
  const regional = `https://${region}.api.riotgames.com`;
  try {
    const account = await getJson(`${regional}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, headers);
    const puuid = account.puuid;
    const [entries, ids] = await Promise.all([
      getJson(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`, headers),
      getJson(`${regional}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=5`, headers),
    ]);
    const matches = await Promise.all(ids.slice(0, 5).map(id =>
      getJson(`${regional}/lol/match/v5/matches/${encodeURIComponent(id)}`, headers)));
    return json(200, shapeLeague(entries, matches, puuid, name, tag));
  } catch (error) { return failure(error); }
}
