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
    const durationRaw = number(match.info.gameDuration);
    const durationMinutes = durationRaw && durationRaw > 0 ? (durationRaw > 86400 ? durationRaw / 60000 : durationRaw / 60) : null;
    const teamKills = player.teamId === undefined ? null : match.info.participants
      .filter(participant => participant.teamId === player.teamId)
      .reduce((sum, participant) => sum + (number(participant.kills) ?? 0), 0);
    const kills = number(player.kills);
    const deaths = number(player.deaths);
    const assists = number(player.assists);
    const minions = number(player.totalMinionsKilled);
    const monsters = number(player.neutralMinionsKilled);
    return {
      champion: player.championName || "Champion",
      result: player.win ? "Win" : "Loss",
      kills: kills ?? 0, deaths: deaths ?? 0, assists: assists ?? 0,
      cs: minions === null && monsters === null ? null : (minions ?? 0) + (monsters ?? 0),
      damage: number(player.totalDamageDealtToChampions),
      gold: number(player.goldEarned),
      vision: number(player.visionScore),
      killParticipation: teamKills && kills !== null && assists !== null ? (kills + assists) / teamKills : null,
      durationMinutes,
      date: match.info.gameEndTimestamp || match.info.gameCreation || null,
    };
  }).filter(Boolean);
  const championCounts = new Map();
  for (const match of recent) {
    const record = championCounts.get(match.champion) || { champion: match.champion, games: 0, wins: 0 };
    record.games++;
    if (match.result === "Win") record.wins++;
    championCounts.set(match.champion, record);
  }
  const champions = [...championCounts.values()].sort((a, b) => b.games - a.games || a.champion.localeCompare(b.champion));
  const recentChampions = champions.slice(0, 3).map(item => item.champion);
  const sum = field => recent.reduce((total, match) => total + (match[field] ?? 0), 0);
  const average = field => recent.length ? sum(field) / recent.length : null;
  const averageKnown = field => {
    const eligible = recent.filter(match => match[field] !== null);
    return eligible.length ? eligible.reduce((total, match) => total + match[field], 0) / eligible.length : null;
  };
  const perMinute = field => {
    const eligible = recent.filter(match => match[field] !== null && match.durationMinutes);
    const minutes = eligible.reduce((total, match) => total + match.durationMinutes, 0);
    return minutes ? eligible.reduce((total, match) => total + match[field], 0) / minutes : null;
  };
  const kpMatches = recent.filter(match => match.killParticipation !== null);
  const totalDeaths = sum("deaths");
  const recentStats = {
    sample: recent.length,
    winRate: recent.length ? recent.filter(match => match.result === "Win").length / recent.length : null,
    kda: recent.length ? (sum("kills") + sum("assists")) / Math.max(1, totalDeaths) : null,
    avgKills: average("kills"), avgDeaths: average("deaths"), avgAssists: average("assists"),
    avgDamage: averageKnown("damage"),
    killParticipation: kpMatches.length ? kpMatches.reduce((total, match) => total + match.killParticipation, 0) / kpMatches.length : null,
    csPerMinute: perMinute("cs"), goldPerMinute: perMinute("gold"), visionPerMinute: perMinute("vision"), damagePerMinute: perMinute("damage"),
  };
  return {
    state: "ready", name: `${name}#${tag}`,
    rank: ranked ? `${ranked.tier} ${ranked.rank}` : "Unranked",
    lp: number(ranked?.leaguePoints),
    wins: number(ranked?.wins), losses: number(ranked?.losses),
    recent, recentChampions, recentStats, champions,
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
