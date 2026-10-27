const fetch = require("node-fetch");

exports.handler = async function (event) {
  const qs = event.queryStringParameters || {};
  const type = qs.type || "steam";

  try {
    if (type === "steam") return await getSteamData(qs);
    if (type === "leetify") return await getLeetifyData(qs);
    if (type === "lol") return await getLeagueData(qs);
    if (type === "rocket") return await getRocketData(qs);

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Unknown type" })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" })
    };
  }
};

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

function extractFromHtml(html, patterns, fallback = "-") {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return fallback;
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

async function getSteamData(qs) {
  const accounts = (qs.accounts || "76561199147369622,76561199113854269,76561199527518684").split(",").filter(Boolean);
  const steamApiKey = process.env.STEAM_API_KEY;

  if (!steamApiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        mainName: "Steam",
        recentCount: 0,
        totalHours: 0,
        games: []
      })
    };
  }

  if (!accounts.length) {
    return {
      statusCode: 200,
      body: JSON.stringify({ games: [], recentCount: 0, totalHours: 0 })
    };
  }

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

  const games = Array.from(seen.values());

  return {
    statusCode: 200,
    body: JSON.stringify({
      mainName,
      recentCount,
      totalHours: Math.round(totalHours),
      games
    })
  };
}

async function getLeetifyData(qs) {
  const steamId = qs.steamId || "76561199147369622";
  const url = `https://leetify.com/api/profile/${steamId}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const text = await res.text();
  let json;

  try {
    json = JSON.parse(text);
  } catch {
    return {
      statusCode: 200,
      body: JSON.stringify({
        stats: {
          kd: "-",
          headshot: "-",
          winRate: "-",
          matches: "-",
          rating: "-",
          rank: "-"
        }
      })
    };
  }

  const flat = flattenObject(json);
  const stats = {
    kd: normalizeMetric(pickFirstValue(flat, ["kd", "kdRatio", "killDeathRatio", "kdr"])) || "-",
    headshot: normalizeMetric(pickFirstValue(flat, ["headshot", "headshotPct", "headshot_pct", "headshotPercentage"])) || "-",
    winRate: normalizeMetric(pickFirstValue(flat, ["winRate", "winrate", "win_rate", "winRatePct"])) || "-",
    matches: normalizeMetric(pickFirstValue(flat, ["matches", "totalMatches", "matchCount", "gamesPlayed"])) || "-",
    rating: normalizeMetric(pickFirstValue(flat, ["rating", "elo", "mmr", "rankRating"])) || "-",
    rank: toSafeString(pickFirstValue(flat, ["rank", "division", "tier", "rankName"])) || "-"
  };

  return {
    statusCode: 200,
    body: JSON.stringify({ stats })
  };
}

async function getLeagueData(qs) {
  const username = qs.username || "Sm1ted%23Diff";
  const url = `https://tracker.gg/lol/profile/riot/${username}/overview`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const html = await res.text();

  const name = decodeURIComponent(username).replace(/%23/g, "#");
  const rank = extractFromHtml(html, [
    /(Unranked|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)/i,
    /"tier":"([A-Za-z]+)"/i,
    /"rank":"([A-Za-z\s]+)"/i,
    /\bRank\s*[:=]\s*([A-Za-z\s]+)/i
  ], "Unranked");
  const lp = extractFromHtml(html, [/\b(\d+)\s*LP\b/i, /\bLP\s*[:=]\s*(\d+)/i, /\b"lp"\s*:\s*(\d+)/i], "-");
  const winRate = extractFromHtml(html, [/\b(\d+(?:\.\d+)?)%\s*win\b/i, /winRate\D+(\d+(?:\.\d+)?)%/i, /\b"winRate"\s*:\s*"?(\d+(?:\.\d+)?)%?/i], "-");
  const games = extractFromHtml(html, [/\b(\d+)\s*games\b/i, /matches\D+(\d+)/i, /\b"matches"\s*:\s*(\d+)/i], "-");

  return {
    statusCode: 200,
    body: JSON.stringify({
      summary: {
        name,
        rank: toSafeString(rank),
        lp: toSafeString(lp),
        winRate: toSafeString(winRate),
        games: toSafeString(games),
        main: "Mid",
        champions: "Ahri / Akali"
      }
    })
  };
}

async function getRocketData(qs) {
  const player = qs.player || "Matees_czech";
  const url = `https://rocketleague.tracker.network/rocket-league/profile/epic/${player}/overview`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const html = await res.text();

  const rank = extractFromHtml(html, [
    /(Unranked|Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)/i,
    /"tier":"([A-Za-z ]+)"/i,
    /"rank":"([A-Za-z ]+)"/i,
    /\bRank\s*[:=]\s*([A-Za-z ]+)/i
  ], "Unranked");
  const mmr = extractFromHtml(html, [/\b(\d{2,})\s*MMR\b/i, /MMR\D+(\d{2,})/i, /\b"mmr"\s*:\s*"?(\d{2,})/i], "-");
  const wins = extractFromHtml(html, [/\b(\d+)\s*Wins\b/i, /wins\D+(\d+)/i, /\b"wins"\s*:\s*(\d+)/i], "-");
  const goals = extractFromHtml(html, [/\b(\d+)\s*Goals\b/i, /goals\D+(\d+)/i, /\b"goals"\s*:\s*(\d+)/i], "-");

  return {
    statusCode: 200,
    body: JSON.stringify({
      summary: {
        rank: toSafeString(rank),
        mmr: toSafeString(mmr),
        wins: toSafeString(wins),
        goals: toSafeString(goals),
        season: "Current",
        platform: "Epic"
      }
    })
  };
}
