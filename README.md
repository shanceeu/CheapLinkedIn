# Matěj Pertl — student, coder & gamer

A redesigned portfolio with selected GitHub repositories, Discord contact, three Steam profiles, and game stats for CS2, League of Legends, and Rocket League. It deploys as a static site with Netlify Functions. API keys remain server-side.

The interface uses a dark `#58181F` palette, open list layouts, and scroll-aware progress and navigation. The hero uses a local layered SVG/CSS model of a Gigabyte WINDFORCE card that turns gently on its own, without an embedded viewer or its controls. The PC specs panel opens on hover, focus, or click and includes the confirmed GPU, monitor, mouse, and keyboard. Reduced-motion visitors see a still card. The Steam selector and settings fields share the same rounded control style. Steam account names appear without ID suffixes in the selector; the full ID remains visible beside the profile link.

An original canvas atmosphere adds a slow crimson vortex and flock silhouettes behind the page. It pauses when the tab is hidden and becomes static when reduced motion is requested. Game panels use softer rounded surfaces.

The Settings sidebar holds English/Czech language, wine/ruby/Indanthrene Blue page colors, Crowstorm/number rain/still backgrounds, system/halo/crosshair cursors, a timezone clock with seconds, and a decimal/hexadecimal/binary/octal integer converter. Appearance choices are saved in the browser. Crosshair uses a native browser cursor with a fixed center hotspot; the optional halo uses a page overlay. The displayed name stays Matěj Pertl. The hero types its slogan on load, and a chapter rail tracks the current section during scrolling. The page also includes the supplied Haxagon and competition results, student quotes, Instagram, and a link to Vítkova procvičovna. Reduced motion stops ambient animation and type-out.

GitHub, Discord, Instagram, Steam, and League of Legends icons are from [Simple Icons](https://simpleicons.org/) (CC0 1.0). The Rocket League mark is an original site illustration.

## Features carried over from the original site

- Matěj's profile, GitHub link, working languages and project links.
- The three-account Steam selector, combined all-profiles view, and direct profile links. With a Steam API key, it shows actual persona status and searchable visible game libraries.
- League of Legends profile and ranked data for `Sm1ted#Diff` on EUNE, recent champions, an OP.GG shortcut, and automatic five-minute refresh.
- Selectable League overview, combat, farming, and champion views. Recent KDA, damage, kill participation, CS, gold, and vision rates are calculated from up to five fetched matches and labeled separately from season rank.
- The Discord username copy button.
- Leetify views for overview, aim, utility, and duels, using fields from the public profile API.
- Steam library search and sorting by last played date, total playtime, or name. Games without a last played date fall back to two-week activity, then lifetime hours.

The previous `api.js` returned fallback values for several stats, scraped third-party HTML, and its League route did not match the page's request. The new functions use Leetify's public API, Riot's current Riot ID/PUUID routes, ballchasing replay data, and Steam's Web API. CS2 and Rocket League now have their own visible tracker panels.

## Deploy on Netlify

1. Import this repository into Netlify. `netlify.toml` publishes `public/` and maps `/api/*` to the server functions.
2. Add the API keys below in **Site configuration → Environment variables**. Copy account IDs from `.env.example` if you want to override the defaults. Never commit real keys.
3. Deploy. Leetify works without a key. Other sections explain any missing setup on the page.

| Variable | Used for |
| --- | --- |
| `STEAM_API_KEY` | Steam profile status and visible owned games for the three supplied Steam IDs. |
| `RIOT_API_KEY` | EUNE solo queue rank and five recent League matches. Use an appropriate key for a public site; Riot development keys expire after 24 hours. |
| `LEETIFY_API_KEY` | Optional; unauthenticated profile requests work with tighter rate limits. |
| `BALLCHASING_API_KEY` | Optional; enables recent public uploaded Rocket League replay stats. |
| `BALLCHASING_PLAYER_ID` | Optional stable `platform:id` for an exact replay match. Otherwise the site searches for `Matees_czech` by name. |

Rocket League's live Tracker Network profile is linked, but its public API is not available for this use. The in-page ballchasing figures cover uploaded public replays only, not all games or live rank. Steam libraries must have public game details, and Leetify respects the player's privacy settings.

## Local development

Use Node 20 or later and the [Netlify CLI](https://docs.netlify.com/cli/get-started/). Run `netlify dev` at the repository root. Run `npm test` for data-shaping tests. No frontend build or package installation is needed for the deployed page.

## Data provider references

- [Leetify public API](https://api-public-docs.cs-prod.leetify.com/)
- [Riot API routing](https://developer.riotgames.com/docs/lol)
- [ballchasing API](https://ballchasing.com/doc/api)
- [Steam GetOwnedGames](https://partner.steamgames.com/doc/webapi/iplayerservice) and [GetPlayerSummaries](https://partner.steamgames.com/doc/webapi/isteamuser)
