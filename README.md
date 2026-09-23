# FactClash

**No cap. Just facts.** The party game where the best answer wins.

Pick any topic, invite friends with a link, and everyone types the key facts. Questions climb from Warm-up to the Boss round. Every answer is checked point by point, players see exactly which parts were right or wrong, and the best answer takes the crown.

## Modes
- **Classic**: same question for everyone against the clock, 3-2-1 countdown, speed bonus.
- **Chill**: no clock. The round reveals once everyone has answered. Once half the room has answered, or once anyone has answered and the question has been open 90 seconds, the rest get a 30-second last call, so idle players never stall a game. The host can also tap Reveal.
- **Race**: everyone climbs at their own pace with live lanes.
- **Daily Clash**: one topic a day, same questions for everyone, global leaderboard, streaks and a spoiler-free share grid.
- **Challenge links**: anyone can replay a finished game's questions and land on its leaderboard.

## Scoring
Each question has 2 or 3 key facts. Each fact earns full credit (clearly hit), half credit (partly) or nothing, so a totally wrong answer scores exactly zero. Later rounds pay up to 2x, fast answers get up to +25%, great answers in a row build a streak bonus, one 2x boost per game, and a famous myth or a clear factual error halves the points.

## Architecture
- `public/`: the game client (`index.html`, `app.css`, `app.js`). Mobile first, one screen, keyboard aware, synthesised music and sound.
- `api/room/[action].js`: game actions (create, join, start, answer, ready, react, leave, kick, end, challenge, daily).
- `api/stream.js`: live room stream. Each player holds one streamed response; the server pushes state on every change through Redis pub/sub. Clients fall back to polling only if a network blocks streaming.
- `api/og.js` and `api/invite.js`: per-room, per-challenge and daily link previews for WhatsApp, iMessage and social apps.
- `lib/generate.js`: question ladders with GPT only (writer `gpt-6-luna`, reviewer `gpt-6-sol`; override with `OPENAI_MODEL`, `OPENAI_REVIEW_MODEL`, `OPENAI_REVIEW_EFFORT`, `PLAN_EFFORT`), JSON schema, safety rules. Grading uses the TypeSafe decision model only. `lib/grade.js`: key-fact grading with the TypeSafe decision model. `lib/game.js`: rooms, rounds, scoring. `lib/solo.js`: Daily and challenges. `lib/store.js`: Upstash Redis or in-memory store with pub/sub.

## Questions you can trust
The writer drafts about half again as many questions as the game needs. A stronger reviewer checks every draft for wrong or outdated facts, answer keys that would reject a valid answer, giveaways, duplicates and vague wording, and rates each one's difficulty. The game keeps the cleanest drafts spread from easiest to hardest and orders them by that rating; only when too few pass are fresh candidates written for the gaps and reviewed again. Drafts the reviewer could not reach are used only as a last resort. The lobby shows the real progress (writing, fact-checking, polishing), and each ladder logs one line with its timing and review results.

## Built for real phones and real networks
- Every screen fits one viewport. When content is taller than the phone, the screen tightens spacing, scales down slightly, then drops extras; only the tiniest screens scroll the middle.
- Requests time out instead of hanging, and safe-to-repeat actions (answer, ready, next, state) retry on their own. Start, next, rematch and join are idempotent, so a retry after a lost reply never skips a round, resets a game or creates a ghost player.
- Coming back from another app or a dropped connection refreshes the room at once.

## Analytics, journeys and the question bank (first party, no cookies)
- **Counts** (`lib/stats.js`): daily totals in Redis, such as visits by source (`?utm_source=`, `?utm_campaign=`, `?ref=`, referrer), invite links opened by people and by chat-app previews, joins by channel, shares by channel and screen, games, rematches, challenges, Daily starts with return visits and streaks, and question builds. Unique players are estimated with HyperLogLog over salted hashes.
- **Journeys** (`lib/journey.js`): each visit's steps (landed, hosted, joined, answered, finished, shared, came back after N days), linked by a one-way hash of the app's random device id. No names or answers. Kept 60 days.
- **Question bank** (`lib/bank.js`): every question written, with totals per question (asked, average points, zero rate, myths, skips, time) and up to 50 anonymous, PII-scrubbed answer samples (90 days).
- **Cost**: the page sends journey steps in batches (every 45 s at most, at 40 steps, at the end of a game and when the page is hidden). Visits and shares are counted from those batches, so there is no separate analytics request, and every server write is one pipelined Redis call.
- **Privacy**: nothing new is stored on the device and no cookies are used. Test traffic, players who turn off "Help improve FactClash" in their profile, and browsers sending Global Privacy Control are never counted, logged or sampled. Rate limits keep only a one-way hash of IP addresses, for an hour. Fonts and scripts are self-hosted, so the site makes no third-party requests.
- **Spend guard**: at most `GEN_DAILY_CAP` new question sets a day (default 2000, about $68); after that, hosts are told new games are taking a short break, while the Daily Clash keeps working.
- **Reading it** (local only, nothing is served publicly): `node --env-file=.env --env-file=.env.local tools/stats.mjs [days]`, `... tools/stats.mjs journeys [YYYY-MM-DD] [out.ndjson]`, `... tools/stats.mjs bank [topic]`, `... tools/stats.mjs bank-export bank.ndjson`.

## Legal pages
`/privacy`, `/terms` and `/cookies` (static pages in `public/`), linked from the intro, the hub, the host and join screens, and the profile sheet.

## Tools
- `tools/calibrate.mjs`: generates questions, simulates answer styles and prints a grading table per style.
- `tools/regrade.mjs`: replays a saved calibration set against the current grader, to check a grading change before shipping it.
- `tools/stats.mjs`: the local analytics, journey and question bank reports described above.

## Run locally
```
npm install
RATE_LIMIT_OFF=1 STORE=memory node --env-file=.env server.js
```
`.env` needs `JEV_API_KEY` and `OPEN_AI_KEY`. Without Upstash variables the store runs in memory.

## Deploy
Vercel with Upstash Redis (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) and the two keys above as environment variables. Never set `RATE_LIMIT_OFF` in production.
