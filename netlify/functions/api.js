const fetch = require("node-fetch");

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  };
}

function pickFirstValue(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
  }
  return undefined;
}

function normalizeMetric(value) {
  if (value === undefined || value === null || value === "") return "-";
  const str = String(value).trim();
  const cleaned = str.replace(/^[^\d]*/, "").replace(/[^\d.%]+$/, "");
  return cleaned || str;
}

function toSafeString(value) {
  if (value === undefined || value === null || value === "") return "-";
  return String(value).trim();
}

function flattenObject(value, result = {}) {
  if (!value || typeof value !== "object") return result;

  Object.keys(value).forEach((key) => {
    const item = value[key];
    if (item && typeof item === "object" && !Array.isArray(item)) {
      flattenObject(item, result);
    } else {
      result[key] = item;
    }
  });

  return result;
}

function getFallbackSteam() {
  return jsonResponse(200, {
    mainName: "Steam",
    recentCount: 0,
    totalHours: 0,
    games: []
  });
}

function getFallbackLeague(name) {
  return jsonResponse(200, {
    summary: {
      name: name || "League player",
      rank: "Add Riot API key",
      lp: "-",
      winRate: "-",
      games: "-",
      main: "-",
      champions: "-"
    }
  });
}

function getFallbackRocket(player) {
  return jsonResponse(200, {
    summary: {
      rank: "Add tracker parser fallback",
      mmr: "-",
      wins: "-",
      goals: "-",
      season: "Current",
      platform: player || "Epic"
    }
  });
}

function getFallbackLeetify() {
  return jsonResponse(200, {
    stats: {
      kd: "-",
      headshot: "-",
      winRate: "-",
      matches: "-",
      rating: "-",
      rank: "-"
    }
  });
}

function extractFromHtml(html, patterns, fallback = "-") {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return fallback;
}

function buildLeetifyFallbackFromHtml(html) {
  const kd = extractFromHtml(html, [
    /"kd"\s*:\s*"?([0-9]+\.?[0-9]?)"?/i,
    /KD\s*[:<]*\s*([0-9]+\.?[0-9]?)/i,
    /kdRatio\s*[:=]\s*"?([0-9]+\.?[0-9]?)"?/i
  ], "-");

  const headshot = extractFromHtml(html, [
    /"headshot"\s*:\s*"?([0-9]+\.?[0-9]?)%?"?/i,
    /Headshot\s*[:<]*\s*([0-9]+\.?[0-9]?)%?/i,
    /headshotPct\s*[:=]\s*"?([0-9]+\.?[0-9]?)%?"?/i
  ], "-");

  const winRate = extractFromHtml(html, [
    /"winRate"\s*:\s*"?([0-9]+\.?[0-9]?)%?"?/i,
    /Win Rate\s*[:<]*\s*([0-9]+\.?[0-9]?)%?/i,
    /win_rate\s*[:=]\s*"?([0-9]+\.?[0-9]?)%?"?/i
  ], "-");

  const matches = extractFromHtml(html, [
    /"matches"\s*:\s*"?([0-9,]+)"?/i,
    /Matches\s*[:<]*\s*([0-9,]+)/i,
    /totalMatches\s*[:=]\s*"?([0-9,]+)"?/i
  ], "-");

  const rating = extractFromHtml(html, [
    /"rating"\s*:\s*"?([0-9]+\.?[0-9]?)"?/i,
    /Rating\s*[:<]*\s*([0-9]+\.?[0-9]?)/i,
    /elo\s*[:=]\s*"?([0-9]+\.?[0-9]?)"?/i
  ], "-");

  const rank = extractFromHtml(html, [
    /"rank"\s*:\s*"?([^"\n<>]+)"?/i,
    /Rank\s*[:<]*\s*([^<\n]+?)(?:<|\s*\|)/i,
    /tier\s*[:=]\s*"?([^"\n<>]+)"?/i,
    /division\s*[:=]\s*"?([^"\n<>]+)"?/i
  ], "-");

  return {
    kd: kd === "-" ? "-" : kd,
    headshot: headshot === "-" ? "-" : `${headshot}${headshot.includes("%") ? "" : "%"}`,
    winRate: winRate === "-" ? "-" : `${winRate}${winRate.includes("%") ? "" : "%"}`,
    matches: matches === "-" ? "-" : matches,
    rating: rating === "-" ? "-" : rating,
    rank: rank === "-" ? "-" : rank
  };
}

function buildTrackerFallbackFromHtml(html, kind) {
  if (kind === "league") {
    const name = extractFromHtml(html, [
      /summoner\s*[:=]\s*"?([^"<,]+)"?/i,
      /profile-name[^>]*>([^<]+)</i,
      /player-name[^>]*>([^<]+)</i
    ], "League player");

    const rank = extractFromHtml(html, [
      /rank\s*[:=]\s*"?([^"<]+)"?/i,
      /"rank"\s*:\s*"?([^"\n]+)"?/i,
      /tier[^>]*>([^<]+)</i
    ], "Unranked");

    const lp = extractFromHtml(html, [
      /(\d+)\s*LP/i,
      /league points[^0-9]*(\d+)/i
    ], "-");

    const winRate = extractFromHtml(html, [
      /(\d+%?)\s*win/i,
      /win rate[^\d]*(\d+%)/i
    ], "-");

    const games = extractFromHtml(html, [
      /(\d+)\s*games?/i,
      /total games[^\d]*(\d+)/i
    ], "-");

    return {
      name,
      rank,
      lp,
      winRate,
      games,
      main: "Mid",
      champions: "Ahri / Akali"
    };
  }

  if (kind === "rocket") {
    const rank = extractFromHtml(html, [
      /(Unranked|Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)/i,
      /rank[^>]*>([^<]+)</i
    ], "Unranked");

    const mmr = extractFromHtml(html, [
      /(\d{2,})\s*MMR/i,
      /MMR[^0-9]*(\d{2,})/i
    ], "-");

    const wins = extractFromHtml(html, [
      /(\d+)\s*Wins/i,
      /wins[^0-9]*(\d+)/i
    ], "-");

    const goals = extractFromHtml(html, [
      /(\d+)\s*Goals/i,
      /goals[^0-9]*(\d+)/i
    ], "-");

    return {
      rank,
      mmr,
      wins,
      goals,
      season: "Current",
      platform: "Epic"
    };
  }

  return {};
}

exports.handler = async function (event) {
  const qs = event.queryStringParameters || {};
  const type = qs.type || "steam";

  try {
    if (type === "steam") return await getSteamData(qs);
    if (type === "leetify") return await getLeetifyData(qs);
    if (type === "lol") return await getLeagueData(qs);
    if (type === "rocket") return await getRocketData(qs);

    return jsonResponse(400, { error: "Unknown type" });
  } catch (err) {
    return jsonResponse(500, { error: err.message || "Server error" });
  }
};

async function getSteamData(qs) {
  const accounts = (qs.accounts || "76561199147369622,76561199113854269,76561199527518684").split(",").filter(Boolean);
  const steamApiKey = process.env.STEAM_API_KEY;

  if (!steamApiKey) return getFallbackSteam();
  if (!accounts.length) return jsonResponse(200, { games: [], recentCount: 0, totalHours: 0 });

  const seen = new Map();
  let recentCount = 0;
  let totalHours = 0;
  let mainName = "Steam";

  for (const account of accounts) {
    const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${account}`;
    const profileRes = await fetch(profileUrl);
    const profileJson = await profileRes.json();
    const player = profileJson.response?.players?.[0];

    if (player && mainName === "Steam") {
      mainName = player.personaname || "Steam";
    }

    const ownedUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${account}&include_appinfo=true&include_played_free_games=true`;
    const ownedRes = await fetch(ownedUrl);
    const ownedJson = await ownedRes.json();
    const ownedGames = ownedJson.response?.games || [];

    totalHours += ownedGames.reduce((sum, g) => sum + Number(g.playtime_forever || 0) / 60, 0);

    for (const game of ownedGames) {
      const key = String(game.appid);
      if (!seen.has(key)) {
        seen.set(key, {
          appid: game.appid,
          name: game.name || "Unknown Game",
          playtime_forever: Number(game.playtime_forever || 0),
          platform: "Steam",
          rtime: 0
        });
      }
    }

    const recentUrl = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${steamApiKey}&steamid=${account}&count=20`;
    const recentRes = await fetch(recentUrl);
    const recentJson = await recentRes.json();
    const recentGames = recentJson.response?.games || [];
    recentCount += recentGames.length;

    for (const game of recentGames) {
      const key = String(game.appid);
      if (seen.has(key)) {
        seen.get(key).rtime = Number(game.rtime_last_played || 0);
      } else {
        seen.set(key, {
          appid: game.appid,
          name: game.name || "Recent Game",
          playtime_forever: Number(game.playtime_forever || 0),
          platform: "Steam",
          rtime: Number(game.rtime_last_played || 0)
        });
      }
    }
  }

  return jsonResponse(200, {
    mainName,
    recentCount,
    totalHours: Math.round(totalHours),
    games: Array.from(seen.values())
  });
}

async function getLeetifyData(qs) {
  const steamId = qs.steamId || "76561199147369622";
  const apiKey = process.env.LEETIFY_API_KEY;

  const attempts = [];

  if (apiKey) {
    attempts.push({
      url: `https://leetify.com/api/profile/${steamId}`,
      headers: { "User-Agent": "Mozilla/5.0", Authorization: `Bearer ${apiKey}` }
    });
  }

  attempts.push({
    url: `https://leetify.com/app/profile/${steamId}`,
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  for (const candidate of attempts) {
    try {
      const res = await fetch(candidate.url, { headers: candidate.headers });
      const text = await res.text();
      if (!text || text.trim() === "") continue;

      try {
        const json = JSON.parse(text);
        const flat = flattenObject(json);
        const stats = {
          kd: normalizeMetric(pickFirstValue(flat, ["kd", "kdRatio", "killDeathRatio", "kdr"])) || "-",
          headshot: normalizeMetric(pickFirstValue(flat, ["headshot", "headshotPct", "headshot_pct", "headshotPercentage"])) || "-",
          winRate: normalizeMetric(pickFirstValue(flat, ["winRate", "winrate", "win_rate", "winRatePct"])) || "-",
          matches: normalizeMetric(pickFirstValue(flat, ["matches", "totalMatches", "matchCount", "gamesPlayed"])) || "-",
          rating: normalizeMetric(pickFirstValue(flat, ["rating", "elo", "mmr", "rankRating"])) || "-",
          rank: toSafeString(pickFirstValue(flat, ["rank", "division", "tier", "rankName"])) || "-"
        };

        if (stats.kd !== "-" || stats.rating !== "-" || stats.rank !== "-") {
          return jsonResponse(200, { stats });
        }
      } catch (err) {
        // continue with HTML fallback
      }

      const htmlStats = buildLeetifyFallbackFromHtml(text);
      if (htmlStats.kd !== "-" || htmlStats.rating !== "-" || htmlStats.rank !== "-") {
        return jsonResponse(200, { stats: htmlStats });
      }
    } catch (err) {
      // continue to next candidate
    }
  }

  return getFallbackLeetify();
}

async function getLeagueData(qs) {
  const username = qs.username || "Sm1ted#Diff";
  const displayName = decodeURIComponent(String(username)).replace(/%23/g, "#").replace(/#/g, "%23");
  const riotApiKey = process.env.RIOT_API_KEY;
  const region = qs.region || "na1";

  if (riotApiKey) {
    try {
      const summonerRes = await fetch(
        `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(displayName.replace(/%23/g, "#"))}`,
        { headers: { "X-Riot-Token": riotApiKey } }
      );

      if (summonerRes.ok) {
        const summoner = await summonerRes.json();
        const entriesRes = await fetch(
          `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
          { headers: { "X-Riot-Token": riotApiKey } }
        );

        if (entriesRes.ok) {
          const entries = await entriesRes.json();
          const rankedEntry = (entries || []).find((entry) => entry.queueType === "RANKED_SOLO_5x5") || entries[0] || {};
          const tier = rankedEntry.tier || "Unranked";
          const rank = rankedEntry.rank ? `${tier} ${rankedEntry.rank}` : tier;
          const lp = rankedEntry.leaguePoints ?? "-";
          const wins = Number(rankedEntry.wins || 0);
          const losses = Number(rankedEntry.losses || 0);
          const totalGames = wins + losses > 0 ? wins + losses : "-";

          return jsonResponse(200, {
            summary: {
              name: summoner.name || displayName,
              rank,
              lp: String(lp),
              winRate: totalGames === "-" ? "-" : `${Math.round((wins / totalGames) * 100)}%`,
              games: String(totalGames),
              main: "Mid",
              champions: "Ahri / Akali"
            }
          });
        }
      }
    } catch (err) {
      // fall through to tracker.gg fallback
    }
  }

  try {
    const trackerUsername = encodeURIComponent(String(username).replace(/#/g, "%23"));
    const trackerUrl = `https://tracker.gg/lol/profile/riot/${trackerUsername}/overview`;
    const res = await fetch(trackerUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    const summary = buildTrackerFallbackFromHtml(html, "league");

    return jsonResponse(200, {
      summary: {
        name: summary.name || displayName,
        rank: summary.rank || "Unranked",
        lp: summary.lp || "-",
        winRate: summary.winRate || "-",
        games: summary.games || "-",
        main: summary.main || "Mid",
        champions: summary.champions || "Ahri / Akali"
      }
    });
  } catch (err) {
    return getFallbackLeague(displayName);
  }
}

async function getRocketData(qs) {
  const player = qs.player || "matees_czech";
  const ballchasingApiKey = process.env.BALLCHASING_API_KEY;

  if (ballchasingApiKey) {
    try {
      const url = `https://ballchasing.com/api/replays?player-name=${encodeURIComponent(player)}&sort=-created&count=5`;
      const res = await fetch(url, {
        headers: {
          Authorization: ballchasingApiKey,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        const payload = await res.json();
        const replay = (payload.list || payload.replays || [])[0];

        if (replay) {
          const playerStats = replay.player_stats || {};
          return jsonResponse(200, {
            summary: {
              rank: replay.rank || "Unranked",
              mmr: String(playerStats.mmr ?? "-"),
              wins: String(playerStats.wins ?? "-"),
              goals: String(playerStats.goals ?? "-"),
              season: replay.playlist || "Current",
              platform: "Ballchasing"
            }
          });
        }
      }
    } catch (err) {
      // fallback to tracker page
    }
  }

  try {
    const trackerUrl = `https://rocketleague.tracker.network/rocket-league/profile/epic/${encodeURIComponent(player)}/overview`;
    const res = await fetch(trackerUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    const summary = buildTrackerFallbackFromHtml(html, "rocket");

    return jsonResponse(200, {
      summary: {
        rank: summary.rank || "Unranked",
        mmr: summary.mmr || "-",
        wins: summary.wins || "-",
        goals: summary.goals || "-",
        season: summary.season || "Current",
        platform: summary.platform || "Epic"
      }
    });
  } catch (err) {
    return getFallbackRocket(player);
  }
}
