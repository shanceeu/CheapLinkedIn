export function sortGames(games, mode) {
  const sorted = [...games];
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  if (mode === "alphabetical") return sorted.sort(byName);
  if (mode === "playtime") return sorted.sort((a, b) => b.hours - a.hours || byName(a, b));
  return sorted.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || b.recentHours - a.recentHours || b.hours - a.hours || byName(a, b));
}
