// Solo ladders: the Daily Clash (same questions for everyone, one per day) and challenge links
// (replay a finished room's questions and land on the same leaderboard).
import { randomBytes } from "node:crypto";
import { store, getJson, setJson, hsetJson, hgetJson, hgetallJson } from "./store.js";
import { generateQuestions } from "./generate.js";
import { grade } from "./grade.js";
import { scoreAnswer, GameError, ANSWER_MAX } from "./game.js";
import { isBlocked, sanitizeLine } from "./moderate.js";

const DAY_TTL = 4 * 86400, CH_TTL = 30 * 86400;
const DAILY_N = 8;
const SOLO_LIMIT_MS = 60000;
const LAUNCH = Date.UTC(2026, 8, 23); // Daily #1 = 2026-09-23 (IST)
const IST_MS = 5.5 * 3600000;

// Broad, fun topics most people can play. Rotates daily.
export const DAILY_TOPICS = [
  "Space", "Dinosaurs", "Football", "Chocolate", "Harry Potter", "The human body", "Cricket", "Marvel movies", "The ocean",
  "Pizza", "Ancient Egypt", "Video games", "The Olympics", "Weather", "Disney and Pixar", "Coffee and tea", "Sharks",
  "Inventions", "Bollywood", "The Premier League", "Basketball", "Volcanoes", "Star Wars", "Music legends", "Pokemon",
  "World capitals", "Sleep", "Cars", "The Moon", "Mythology", "Famous paintings", "Smartphones", "Festivals around the world",
  "Insects", "Formula 1", "Wonders of the world", "Birds", "Superheroes", "Ancient Rome", "Ice cream", "Rainforests",
  "The Beatles", "Airplanes", "Tennis", "Robots", "Honey bees", "Board games", "The brain", "Deserts", "Magic tricks",
];

const now = () => Date.now();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const todayIST = () => new Date(now() + IST_MS).toISOString().slice(0, 10);
const dayNumber = (date) => Math.floor((Date.parse(date + "T00:00:00Z") - LAUNCH) / 86400000) + 1;
export const dailyTopic = (date) => DAILY_TOPICS[((dayNumber(date) - 1) % DAILY_TOPICS.length + DAILY_TOPICS.length) % DAILY_TOPICS.length];

const K = {
  ladder: (kind, ref) => `${kind}:${ref}`,
  lock: (kind, ref) => `${kind}:${ref}:genlock`,
  board: (kind, ref) => `${kind}:${ref}:board`,
  player: (kind, ref, dev) => `${kind}:${ref}:p:${dev}`,
};
const ttlFor = (kind) => (kind === "daily" ? DAY_TTL : CH_TTL);
const cleanName = (n) => sanitizeLine(n, 20);
const cleanDevice = (d) => String(d || "").replace(/[^a-z0-9]/gi, "").slice(0, 32);

function resolveRef(kind, ref) {
  if (kind === "daily") return /^\d{4}-\d{2}-\d{2}$/.test(ref || "") && ref <= todayIST() ? ref : todayIST();
  if (kind === "challenge" && /^[a-z0-9]{6,12}$/i.test(ref || "")) return ref;
  throw new GameError("That challenge link is not valid.", 404);
}

async function loadLadder(kind, ref, openaiKey) {
  const L = await getJson(K.ladder(kind, ref));
  if (L) return L;
  if (kind !== "daily") throw new GameError("This challenge has expired or never existed.", 404);
  const got = await store.set(K.lock(kind, ref), "1", { nx: true, ex: 90 });
  if (!got) return { status: "generating" };
  const topic = dailyTopic(ref);
  try {
    const { questions } = await generateQuestions(topic, DAILY_N, openaiKey);
    const ladder = { kind, ref, topic, questions, number: dayNumber(ref), createdAt: now() };
    await setJson(K.ladder(kind, ref), ladder, { ex: DAY_TTL });
    return ladder;
  } catch (err) {
    console.error("daily generate", err);
    await store.del(K.lock(kind, ref));
    throw new GameError("Today's questions are not ready yet. Try again in a moment.", 503);
  }
}

// Nightly job: make sure today's and tomorrow's Daily ladders exist so nobody waits for them.
export async function ensureDailies(openaiKey) {
  const today = todayIST();
  const tomorrow = new Date(Date.parse(today + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
  const out = {};
  for (const d of [today, tomorrow]) {
    try { const L = await loadLadder("daily", d, openaiKey); out[d] = L.status === "generating" ? "generating" : `${L.topic}: ${L.questions.length} questions`; }
    catch (e) { out[d] = "error: " + e.message; }
  }
  return out;
}

// Called by the room engine when a game finishes and someone asks for a challenge link.
export async function createChallenge(room, players, scores) {
  const idx = room.games || 0;
  room.challenges = room.challenges || {};
  if (room.challenges[idx]) return room.challenges[idx];
  const id = randomBytes(5).toString("hex");
  const host = players[room.hostId]?.name || Object.values(players)[0]?.name || "A friend";
  const ladder = { kind: "challenge", ref: id, topic: room.topic, questions: room.questions, host, room: room.code, createdAt: now() };
  await setJson(K.ladder("challenge", id), ladder, { ex: CH_TTL });
  await Promise.all(Object.values(players).map((p) => hsetJson(K.board("challenge", id), `r:${p.id}`, {
    name: p.name, level: p.level || 1, avatar: p.avatar, total: Number(scores[p.id] || 0), done: room.questions.length, finished: true, original: true,
  })));
  await store.expire(K.board("challenge", id), CH_TTL);
  room.challenges[idx] = id;
  return id;
}

function publicSoloAnswer(a) {
  if (!a) return null;
  return { flag: a.flag || null, hits: a.hits ?? null, wrong: !!a.wrong, points: a.points, coverage: a.coverage, flawless: a.flawless, misFired: a.misFired, double: !!a.double, ms: a.ms, text: a.text, breakdown: a.breakdown, streakAfter: a.streakAfter, criteria: a.result?.criteria || null, misconceptions: a.result?.misconceptions || null, error: a.result?.error || null, parts: a.result?.parts || null };
}

async function boardView(kind, ref, device) {
  const h = await hgetallJson(K.board(kind, ref));
  const rows = Object.entries(h).map(([key, v]) => ({ ...v, key, isMe: key === device }))
    .sort((a, b) => b.total - a.total || (b.finished ? 1 : 0) - (a.finished ? 1 : 0) || a.name.localeCompare(b.name));
  rows.forEach((r, i) => (r.rank = i + 1));
  const me = rows.find((r) => r.isMe) || null;
  return { count: rows.length, top: rows.slice(0, 50).map(({ key, ...r }) => r), me: me ? { rank: me.rank, total: me.total } : null };
}

// State for the solo player. Creates the player on first call. `begin` starts the clock for the current question.
export async function soloState({ kind, ref, device, token, name, level, begin, peek }, openaiKey) {
  ref = resolveRef(kind, ref);
  const ladder = await loadLadder(kind, ref, openaiKey);
  if (ladder.status === "generating") return { kind, ref, status: "generating", topic: kind === "daily" ? dailyTopic(ref) : null, number: kind === "daily" ? dayNumber(ref) : null };
  const n = ladder.questions.length;
  device = cleanDevice(device);
  const base = { kind, ref, status: "ready", topic: ladder.topic, number: ladder.number || null, host: ladder.host || null, total: n, limitMs: SOLO_LIMIT_MS, serverTime: now() };
  if (peek || !device) return { ...base, board: await boardView(kind, ref, device) };

  const key = K.player(kind, ref, device);
  let p = await getJson(key), newToken = null;
  if (!p) {
    name = cleanName(name);
    if (!name) throw new GameError("Enter your name first.");
    if (isBlocked(name)) throw new GameError("Pick a friendlier name.");
    newToken = randomBytes(16).toString("hex");
    p = { device, token: newToken, name, level: clamp(Number(level) || 1, 1, 999), cur: 0, curStartedAt: null, answers: [], total: 0, doubleUsed: false, startedAt: now(), finishedAt: null };
    await setJson(key, p, { ex: ttlFor(kind) });
  } else if (p.token !== token) throw new GameError("This device is already playing this ladder in another browser.", 403);

  if (begin && p.cur < n && !p.curStartedAt) { p.curStartedAt = now(); await setJson(key, p, { ex: ttlFor(kind) }); }
  const q = ladder.questions[p.cur];
  const out = {
    ...base, token: newToken || undefined,
    me: { name: p.name, cur: p.cur, total: p.total, doubleUsed: p.doubleUsed, finished: p.cur >= n, answers: p.answers.map(publicSoloAnswer) },
    question: q ? { index: q.index, label: q.label, difficulty: q.difficulty, prompt: q.prompt, total: n, keys: q.rubric.length, startedAt: p.curStartedAt } : null,
    board: await boardView(kind, ref, device),
  };
  if (p.cur >= n) out.review = ladder.questions.map((qq, i) => ({ index: i, label: qq.label, prompt: qq.prompt, rubric: qq.rubric, points: qq.points, mine: publicSoloAnswer(p.answers[i]) }));
  return out;
}

export async function soloAnswer({ kind, ref, device, token, q, text, double }, jevKey, ip = "unknown") {
  ref = resolveRef(kind, ref);
  device = cleanDevice(device);
  const hour = Math.floor(now() / 3600000);
  const n0 = await store.hincrby(`rate:solo:${hour}`, ip, 1);
  await store.expire(`rate:solo:${hour}`, 3600);
  if (n0 > 1000 && !process.env.RATE_LIMIT_OFF && ip !== "test-runner") throw new GameError("Too many answers from this network. Take a break and come back soon.", 429);

  const ladder = await getJson(K.ladder(kind, ref));
  if (!ladder) throw new GameError("This ladder is not available.", 404);
  const key = K.player(kind, ref, device);
  const p = await getJson(key);
  if (!p || p.token !== token) throw new GameError("Start the game first.", 403);
  const n = ladder.questions.length;
  q = Number(q);
  if (p.cur >= n) throw new GameError("You already finished this one.");
  if (q !== p.cur) throw new GameError("Answer the current question.");
  text = String(text || "").replace(/\s+/g, " ").trim().slice(0, ANSWER_MAX);
  if (!text) throw new GameError("Type your answer first.");
  if (double && p.doubleUsed) throw new GameError("You already used your 2× boost.");

  const question = ladder.questions[q];
  const ms = p.curStartedAt ? now() - p.curStartedAt : SOLO_LIMIT_MS;
  let streak = 0; for (let i = p.answers.length - 1; i >= 0 && p.answers[i]?.good; i--) streak++;
  let result;
  try { result = await grade(question, text, jevKey); }
  catch (err) { result = { error: err.message, criteria: question.rubric.map((t) => ({ text: t, p: 0 })), misconceptions: [], overall: {} }; }
  const s = scoreAnswer({ result, question, numQuestions: n, elapsedMs: ms, limitMs: SOLO_LIMIT_MS, streak, double: !!double });
  const ans = { text, ms, double: !!double, result, ...s, streakAfter: s.good ? streak + 1 : 0 };
  p.answers[q] = ans; p.total += s.points; p.cur = q + 1; p.curStartedAt = null;
  if (double) p.doubleUsed = true;
  if (p.cur >= n) p.finishedAt = now();
  await setJson(key, p, { ex: ttlFor(kind) });
  await hsetJson(K.board(kind, ref), device, { name: p.name, level: p.level, total: p.total, done: p.cur, finished: p.cur >= n, grid: p.answers.map((a) => (a.good ? 2 : a.points > 0 ? 1 : 0)) });
  await store.expire(K.board(kind, ref), ttlFor(kind));
  return { ok: true, graded: publicSoloAnswer(ans), cur: p.cur, total: p.total, finished: p.cur >= n, rubric: question.rubric, points: question.points };
}
