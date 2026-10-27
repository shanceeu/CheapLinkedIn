# Matěj Pertl — developer & gamer

A redesigned portfolio with selected GitHub repositories, Discord contact, three Steam profiles, and game stats for CS2, League of Legends, and Rocket League. It deploys as a static site with Netlify Functions. API keys remain server-side.

The interface uses a dark `#58181F` palette, open list layouts, and scroll-aware progress, navigation, and identity artwork. Motion is reduced when the visitor requests it. Steam account names appear without ID suffixes in the selector; the full ID remains visible beside the profile link.

An original canvas atmosphere adds a slow crimson vortex and flock silhouettes behind the page. It pauses when the tab is hidden and becomes static when reduced motion is requested. Game panels use softer rounded surfaces.

The Studio section lets visitors choose the displayed name (Matěj Pertl, Sm1ted, or Matees_czech), English or Czech, wine/ruby/Indanthrene Blue accents, Crowstorm/number rain/still backgrounds, and system/halo/crosshair cursors. Choices are saved in the browser. The hero types its slogan on load, and a chapter rail tracks the current section during scrolling. The page also includes a timezone clock with seconds, a decimal/hexadecimal/binary/octal integer converter, the supplied Haxagon and competition results, student quotes, Instagram, and a link to Vítkova procvičovna. Reduced motion stops ambient animation and type-out.

## Features carried over from the original site

- Matěj's profile, GitHub link, working languages and project links.
- The three-account Steam selector and direct profile links. With a Steam API key, it now shows actual persona status and searchable visible game libraries.
- League of Legends profile and ranked data for `Sm1ted#Diff` on EUNE, recent champions, an OP.GG shortcut, and automatic five-minute refresh.
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
