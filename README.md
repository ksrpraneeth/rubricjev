# Ladder — multiplayer rubric quiz on Jev

Pick any topic. OpenAI builds a ladder of questions from child-easy to expert-only. Players answer in their own words. Jev (TypeSafe AI) grades every rubric point in one call, and the best answers win.

## Modes
- **Timed**: everyone answers the same question against a clock. Speed bonus.
- **Untimed**: reveal when everyone has answered. Host can force it.
- **Race**: each player climbs at their own pace, graded instantly, live leaderboard.

## Scoring
- Coverage = average rubric probability from Jev, times a rung multiplier from 1× (first) to 2× (last).
- Speed bonus up to +25% in timed and race modes.
- Streak bonus +10% per consecutive good answer, up to +50%.
- A detected misconception halves the points. All rubric points above 90% with no misconception earns a flawless badge.

## Run locally
```
node --env-file=.env server.js
```
Needs Node 20+ and a `.env` with `JEV_API_KEY` and `OPEN_AI_KEY`. Without Upstash variables it uses an in-memory store, which is fine for one process.

## Deploy
Vercel serverless functions under `api/`, static UI under `public/`. Rooms live in Upstash Redis; set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or the `KV_REST_API_*` pair the Vercel marketplace creates). Optional `OPENAI_MODEL` (default `gpt-5.4-mini`).

## Layout
- `lib/generate.js` question ladder generation (OpenAI, JSON schema)
- `lib/grade.js` Jev grading of one answer against a rubric
- `lib/game.js` rooms, rounds, modes, scoring
- `lib/store.js` Upstash or in-memory store
- `api/room/[action].js` all game endpoints (`create, join, settings, start, state, typing, answer, next, again`)
- `public/index.html` the game; `public/practice.html` solo practice with fixed sets in `questions/`
