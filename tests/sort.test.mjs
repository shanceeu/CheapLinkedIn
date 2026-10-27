import test from "node:test";
import assert from "node:assert/strict";
import { sortGames } from "../public/sort.mjs";

const games = [
  { name: "Zeta", hours: 40, recentHours: 0, lastPlayed: 100 },
  { name: "alpha", hours: 2, recentHours: 2, lastPlayed: 300 },
  { name: "Beta", hours: 90, recentHours: 1, lastPlayed: 200 },
];

test("Steam sorting supports alphabet, lifetime time, and last played date", () => {
  assert.deepEqual(sortGames(games, "alphabetical").map(game => game.name), ["alpha", "Beta", "Zeta"]);
  assert.deepEqual(sortGames(games, "playtime").map(game => game.name), ["Beta", "Zeta", "alpha"]);
  assert.deepEqual(sortGames(games, "recent").map(game => game.name), ["alpha", "Beta", "Zeta"]);
  assert.equal(games[0].name, "Zeta");
  assert.deepEqual(sortGames([{ name: "Older", hours: 100, recentHours: 0 }, { name: "Active", hours: 2, recentHours: 1 }], "recent").map(game => game.name), ["Active", "Older"]);
});
