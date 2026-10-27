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

async function getSteamData(qs) {
  const accounts = (qs.accounts || "").split(",").filter(Boolean);
  const steamApiKey = process.env.STEAM_API_KEY;

  if (!steamApiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "STEAM_API_KEY missing" })
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
  let mainName = "Main account";

  for (const account of accounts) {
    const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${account}`;
    const profileRes = await fetch(profileUrl);
    const profileJson = await profileRes.json();
    const player = profileJson.response?.players?.[0];

    if (player && !mainName) {
      mainName = player.personaname || "Main account";
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
      statusCode: 500,
      body: JSON.stringify({ error: "Leetify response not JSON" })
    };
  }

  const stats = json.stats || json.data || json;

  return {
    statusCode: 200,
    body: JSON.stringify({
      stats: {
        kd: stats.kd ?? stats.kdRatio ?? "-",
        headshot: stats.headshot ?? stats.headshotPct ?? "-",
        winRate: stats.winRate ?? stats.winrate ?? "-",
        matches: stats.matches ?? stats.totalMatches ?? "-",
        rating: stats.rating ?? stats.elo ?? "-",
        rank: stats.rank ?? stats.division ?? "-"
      }
    })
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
  const rank = (html.match(/(Unranked|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)/i) || [])[1] || "Unranked";
  const lp = (html.match(/(\d+)\s*LP/i) || [])[1] || "-";
  const winRate = (html.match(/(\d+%)\s*win/i) || [])[1] || "-";
  const games = (html.match(/(\d+)\s*games/i) || [])[1] || "-";

  return {
    statusCode: 200,
    body: JSON.stringify({
      summary: {
        name,
        rank,
        lp,
        winRate,
        games,
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

  const rank = (html.match(/(Unranked|Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)/i) || [])[1] || "Unranked";
  const mmr = (html.match(/(\d{2,})\s*MMR/i) || [])[1] || "-";
  const wins = (html.match(/(\d+)\s*Wins/i) || [])[1] || "-";
  const goals = (html.match(/(\d+)\s*Goals/i) || [])[1] || "-";

  return {
    statusCode: 200,
    body: JSON.stringify({
      summary: {
        rank,
        mmr,
        wins,
        goals,
        season: "Current",
        platform: "Epic"
      }
    })
  };
}
