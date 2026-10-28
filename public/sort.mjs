export function sortGames(games, mode) {
  const sorted = [...games];
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  if (mode === "alphabetical") return sorted.sort(byName);
  if (mode === "playtime") return sorted.sort((a, b) => b.hours - a.hours || byName(a, b));
  return sorted.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || b.recentHours - a.recentHours || b.hours - a.hours || byName(a, b));
}

export function selectGames(libraries, selected) {
  return libraries
    .filter(library => selected === "all" || library.id === selected)
    .flatMap(library => library.games.map(game => ({ ...game, profile: library.id, profileName: library.name })));
}
