import { failure, getJson, json, number } from "./lib/shared.mjs";

export function shapeLeetify(profile) {
  return {
    state: "ready",
    name: profile.name || "CS2 player",
    rank: number(profile.ranks?.premier),
    rating: number(profile.ranks?.leetify),
    aim: number(profile.rating?.aim),
    winRate: number(profile.winrate),
    matches: number(profile.total_matches),
    recent: (profile.recent_matches || []).slice(0, 5).map(match => ({
      map: match.map_name || match.map || "Match",
      date: match.finished_at || match.date || null,
      result: match.outcome === "win" ? "Win" : match.outcome === "loss" ? "Loss" : match.outcome === "tie" ? "Draw" : null,
    })),
    source: `https://leetify.com/app/profile/${profile.steam64_id || process.env.LEETIFY_STEAM64_ID}`,
  };
}

export async function handler() {
  const steamId = process.env.LEETIFY_STEAM64_ID || "76561199147369622";
  if (!steamId) return json(200, { state: "setup", message: "Add LEETIFY_STEAM64_ID to Netlify." });
  try {
    const url = new URL("https://api-public.cs-prod.leetify.com/v3/profile");
    url.searchParams.set("steam64_id", steamId);
    const headers = process.env.LEETIFY_API_KEY ? { Authorization: `Bearer ${process.env.LEETIFY_API_KEY}` } : {};
    return json(200, shapeLeetify(await getJson(url, headers)));
  } catch (error) { return failure(error); }
}
