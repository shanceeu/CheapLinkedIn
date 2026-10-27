import test from "node:test";
import assert from "node:assert/strict";
import { shapeLeetify } from "../netlify/functions/leetify.mjs";
import { shapeLeague } from "../netlify/functions/league.mjs";
import { shapeRocket } from "../netlify/functions/rocket.mjs";
import { shapeSteam } from "../netlify/functions/steam.mjs";

test("Leetify maps its current profile rating and recent outcomes", () => {
  const data = shapeLeetify({
    steam64_id: "76561199147369622", name: "Player", ranks: { premier: 9999, leetify: -2.39 },
    rating: { aim: 70.1944, positioning: 56.3, utility: 11.8 }, stats: { reaction_time_ms: 609, accuracy_head: 16.4 }, winrate: 0.4643, total_matches: 14,
    recent_matches: [{ map_name: "de_overpass", outcome: "tie", finished_at: "2026-10-24T16:21:29Z" }],
  });
  assert.equal(data.rating, -2.39);
  assert.equal(data.recent[0].result, "Draw");
  assert.equal(data.rank, 9999);
  assert.equal(data.performance.positioning, 56.3);
  assert.equal(data.performance.reactionTime, 609);
});

test("League selects solo queue and only the tracked participant", () => {
  const data = shapeLeague(
    [{ queueType: "RANKED_FLEX_SR", tier: "GOLD" }, { queueType: "RANKED_SOLO_5x5", tier: "PLATINUM", rank: "II", leaguePoints: 42, wins: 8, losses: 7 }],
    [{ info: { participants: [{ puuid: "other" }, { puuid: "mine", championName: "Ahri", win: true, kills: 5, deaths: 2, assists: 9 }] } }],
    "mine", "Sm1ted", "Diff",
  );
  assert.equal(data.rank, "PLATINUM II");
  assert.equal(data.recent[0].result, "Win");
  assert.equal(data.recent[0].champion, "Ahri");
  assert.deepEqual(data.recentChampions, ["Ahri"]);
});

test("Rocket stats only count the identified player in replay details", () => {
  const data = shapeRocket([{ id: "x", blue: { goals: 2, players: [{ name: "Matees_czech", stats: { core: { goals: 1, assists: 0, saves: 3 } } }] }, orange: { goals: 1, players: [{ name: "Other", stats: { core: { goals: 1 } } }] } }], { name: "Matees_czech" });
  assert.equal(data.sample, 1);
  assert.equal(data.wins, 1);
  assert.equal(data.saves, 3);
});

test("Steam preserves each game's profile, playtime, and last played date", () => {
  const data = shapeSteam("76561199147369622", { response: { game_count: 1, games: [{ appid: 730, name: "Counter-Strike 2", playtime_forever: 90, rtime_last_played: 1793090000 }] } }, { personaname: "Matees", personastate: 1 });
  assert.equal(data.count, 1);
  assert.equal(data.games[0].hours, 1.5);
  assert.match(data.profile, /76561199147369622/);
  assert.equal(data.status, "Online");
  assert.equal(data.games[0].lastPlayed, 1793090000);
});
