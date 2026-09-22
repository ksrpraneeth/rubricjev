# FactClash

**No cap. Just facts.** The party game where the best answer wins.

Pick any topic, invite friends with a link, and everyone types the key facts. Questions climb from Warm-up to the Boss round. Every answer is checked point by point, players see exactly which parts were right or wrong, and the best answer takes the crown.

## Modes
- **Classic**: same question for everyone against the clock, 3-2-1 countdown, speed bonus.
- **Chill**: no clock. The round reveals once everyone has answered. Once half the room has answered, or 90 seconds after the first answer lands, the rest get a 30-second last call, so idle players never stall a game. The host can also tap Reveal.
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

## Run locally
```
npm install
RATE_LIMIT_OFF=1 STORE=memory node --env-file=.env server.js
```
`.env` needs `JEV_API_KEY` and `OPEN_AI_KEY`. Without Upstash variables the store runs in memory.

## Deploy
Vercel with Upstash Redis (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) and the two keys above as environment variables. Never set `RATE_LIMIT_OFF` in production.
