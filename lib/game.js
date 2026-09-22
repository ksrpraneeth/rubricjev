// Multiplayer game engine. All state lives in the store so any serverless instance can serve any request.
import { randomBytes } from "node:crypto";
import { store, getJson, setJson, hsetJson, hgetJson, hgetallJson } from "./store.js";
import { generateQuestions, TopicRejected } from "./generate.js";
import { isUnsafe, isBlocked, sanitizeLine } from "./moderate.js";
import { grade } from "./grade.js";

const K = {
  room: (c) => `room:${c}`,
  players: (c) => `room:${c}:players`,
  answers: (c, q) => `room:${c}:answers:${q}`,
  live: (c) => `room:${c}:live`,    // s:<pid> last seen, t:<pid> typing, e:<id> events. One read per poll.
  stats: (c) => `room:${c}:stats`,  // pts:<pid>, stk:<pid>, dbl:<pid>. One read per poll.
  progress: (c) => `room:${c}:progress`,
  progressT: (c) => `room:${c}:progress:t`,
  lock: (c, q) => `room:${c}:lock:${q}`,
  ready: (c, q) => `room:${c}:ready:${q}`,
  prep: (c) => `room:${c}:prep`,   // questions written in the background while the lobby fills up
  rate: (bucket) => `rate:${bucket}`,
};
const COUNTDOWN_MS = 3000;     // get-ready countdown before a timed question
const AWAY_MS = 12000;         // no poll for this long = away
const HOST_AWAY_MS = 30000;    // away host loses the host role
const REVEAL_AUTO_MS = 12000;  // timed mode auto-advances the reveal
const REVEAL_AUTO_CHILL_MS = 25000; // chill mode reveals also move on, just slower
const LAST_CALL_MS = 30000;    // chill: once half the room has answered, the rest get 30s
const RACE_FINISH_MS = 60000;  // race: once someone finishes, everyone else has 60s
const GRACE_MS = 2000;         // network grace after the clock ends
const MODES = ["timed", "untimed", "race"];
const COLORS = 12;
export const REACTIONS = ["Nice", "Genius", "Wow", "Close", "Robbed", "GG"];

export class GameError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

const code = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (const b of randomBytes(4)) s += a[b % a.length]; return s; };
const id = () => randomBytes(8).toString("hex");
const secret = () => randomBytes(16).toString("hex");
const now = () => Date.now();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const cleanLevel = (l) => clamp(Math.floor(Number(l) || 1), 1, 999);
const cleanName = (n) => sanitizeLine(n, 20);
const cleanTopic = (t) => sanitizeLine(t, 60);
export const ANSWER_MAX = 400;
const OPENAI = () => process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
export const TEST_IP = "test-runner";
async function limit(bucket, ip, max, windowSec = 3600) {
  if (process.env.RATE_LIMIT_OFF || ip === TEST_IP) return;
  const slot = Math.floor(now() / (windowSec * 1000));
  const k = `rate:${bucket}:${slot}`;
  const n = await store.hincrby(k, ip, 1);
  if (n === 1) await store.expire(k, windowSec);
  if (n > max) throw new GameError("Slow down a little and try again soon.", 429);
}
// Instant checks only, so creating and joining never feel slow.
function checkName(name) {
  if (!name) throw new GameError("Enter your name.");
  if (isBlocked(name)) throw new GameError("Pick a friendlier name.");
}
function checkTopic(topic) {
  if (topic.length < 2 || !/\p{L}/u.test(topic)) throw new GameError("Pick a topic, like Cricket or Space.");
  if (isBlocked(topic)) throw new GameError("Let's keep it friendly. Pick a different topic.");
}

async function loadRoom(c) {
  const room = await getJson(K.room(c));
  if (!room) throw new GameError("Room not found. Check the code.", 404);
  return room;
}
const saveRoom = (room) => setJson(K.room(room.code), room);
// Pushes to everyone streaming this room. "s" = state changed, "t" = someone typing, "e" = an event (reaction, join...).
export const channel = (c) => `kc:${c}`;
export function notify(c, k = "s", data = {}) { return store.publish(channel(c), JSON.stringify({ k, ...data })).catch(() => {}); }
async function logEvent(c, type, text, extra = {}) {
  const ev = { id: id(), t: now(), type, text, ...extra };
  await hsetJson(K.live(c), `e:${ev.id}`, ev);
  notify(c, "e", { ev });
  return ev;
}
async function readLive(c) {
  const h = await store.hgetall(K.live(c)); const seen = {}, typing = {}, events = [];
  for (const [k, v] of Object.entries(h)) {
    if (k.startsWith("s:")) seen[k.slice(2)] = Number(v);
    else if (k.startsWith("t:")) { try { typing[k.slice(2)] = JSON.parse(v); } catch {} }
    else if (k.startsWith("e:")) { try { events.push(JSON.parse(v)); } catch {} }
  }
  return { seen, typing, events, keys: Object.keys(h) };
}
async function readStats(c) {
  const h = await store.hgetall(K.stats(c)); const scores = {}, streaks = {}, doubles = {};
  for (const [k, v] of Object.entries(h)) {
    if (k.startsWith("pts:")) scores[k.slice(4)] = Number(v);
    else if (k.startsWith("stk:")) streaks[k.slice(4)] = Number(v);
    else if (k.startsWith("dbl:")) doubles[k.slice(4)] = v;
  }
  return { scores, streaks, doubles };
}
const touch = (c, pid) => store.hset(K.live(c), `s:${pid}`, String(now()));
// Every room key expires 24h after its last write, so storage never grows without bound.
const DAY = 86400;
const expireAll = (...keys) => Promise.all(keys.map((k) => store.expire(k, DAY).catch(() => {})));
export const touchPresence = touch;
const seenOf = (c) => readLive(c).then((l) => l.seen);
const isActive = (seen, pid, t) => (seen[pid] || 0) > t - AWAY_MS;
const roundEndsAt = (room, startedAt) => room.mode === "timed" ? startedAt + COUNTDOWN_MS + room.secondsPerQ * 1000 : null;
const limitMsFor = (room) => room.mode === "timed" ? room.secondsPerQ * 1000 : room.mode === "race" ? 90000 : 0;

async function auth(c, playerId, token) {
  const p = await hgetJson(K.players(c), playerId);
  if (!p || p.token !== token) throw new GameError("You are no longer in this room.", 403);
  return p;
}

// ---------- lobby ----------
export async function createRoom({ name, topic, mode, secondsPerQ, numQuestions, level }, ip = "unknown") {
  await limit("create", ip, 40);
  name = cleanName(name);
  topic = cleanTopic(topic);
  checkName(name); checkTopic(topic);
  if (!MODES.includes(mode)) mode = "timed";
  secondsPerQ = clamp(Number(secondsPerQ) || 45, 15, 180);
  numQuestions = clamp(Number(numQuestions) || 8, 3, 20);

  let c;
  for (let i = 0; i < 5; i++) { c = code(); if (await store.set(K.room(c), "{}", { nx: true })) break; c = null; }
  if (!c) throw new GameError("Could not open a room. Try again.", 500);

  const hostId = id(), token = secret();
  const room = { code: c, hostId, topic, mode, secondsPerQ, numQuestions, status: "lobby", questions: [], round: null, createdAt: now(), games: 0 };
  await saveRoom(room);
  await hsetJson(K.players(c), hostId, { id: hostId, name, avatar: 0, level: cleanLevel(level), token, joinedAt: now() });
  await touch(c, hostId);
  await expireAll(K.players(c), K.live(c));
  return { code: c, playerId: hostId, token };
}

export async function joinRoom({ code: c, name, level }, ip = "unknown") {
  await limit("join", ip, 200);
  c = String(c || "").trim().toUpperCase();
  name = cleanName(name);
  if (!/^[A-Z0-9]{4}$/.test(c)) throw new GameError("Room codes are 4 letters.");
  checkName(name);
  const room = await loadRoom(c);
  const players = await hgetallJson(K.players(c));
  if (Object.keys(players).length >= 12) throw new GameError("That room is full.");
  if (room.status === "generating") throw new GameError("The host is starting. Try again in a few seconds.");
  if (room.status === "finished") throw new GameError("That game just ended. Ask the host for a rematch, then join.");
  if (Object.values(players).some((p) => p.name.toLowerCase() === name.toLowerCase())) name = `${name} ${Object.keys(players).length + 1}`.slice(0, 20);
  const taken = new Set(Object.values(players).map((p) => p.avatar));
  const avatar = [...Array(COLORS).keys()].find((a) => !taken.has(a)) ?? Object.keys(players).length % COLORS;
  const pid = id(), token = secret();
  await hsetJson(K.players(c), pid, { id: pid, name, avatar, level: cleanLevel(level), token, joinedAt: now() });
  await touch(c, pid);
  await expireAll(K.players(c), K.live(c));
  await logEvent(c, "join", `${name} joined`, { playerId: pid, name });
  return { code: c, playerId: pid, token };
}

async function removePlayer(room, pid, reason) {
  const c = room.code;
  const players = await hgetallJson(K.players(c));
  const p = players[pid]; if (!p) return;
  await store.hdel(K.players(c), pid);
  await logEvent(c, reason, reason === "kick" ? `${p.name} was removed` : `${p.name} left`, { playerId: pid });
  const remaining = Object.values(players).filter((x) => x.id !== pid).sort((a, b) => a.joinedAt - b.joinedAt);
  if (!remaining.length) { await store.del(K.room(c)); return; }
  if (room.hostId === pid) {
    room.hostId = remaining[0].id; await saveRoom(room);
    await logEvent(c, "host", `${remaining[0].name} is now the host`, { playerId: remaining[0].id });
  }
  if (room.status === "playing" && room.mode !== "race" && room.round) {
    const answers = await hgetallJson(K.answers(c, room.round.index));
    if (remaining.every((x) => answers[x.id])) room._resolve = true;
  }
}

export async function leaveRoom({ code: c, playerId, token }, apiKey) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  await removePlayer(room, playerId, "leave");
  if (room._resolve) await gradeRound(room, room.round.index, apiKey);
  return { ok: true };
}

export async function kickPlayer({ code: c, playerId, token, target }, apiKey) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId) throw new GameError("Only the host can remove players.", 403);
  if (target === playerId) throw new GameError("Use Leave to remove yourself.");
  await removePlayer(room, target, "kick");
  if (room._resolve) await gradeRound(room, room.round.index, apiKey);
  return { ok: true };
}

export async function endGame({ code: c, playerId, token }) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId) throw new GameError("Only the host can end the game.", 403);
  if (!["playing", "reveal"].includes(room.status)) throw new GameError("No game in progress.");
  room.status = "finished"; room.finishedAt = now(); await saveRoom(room);
  await logEvent(c, "end", "The host ended the game", { playerId });
  return { ok: true };
}

export async function updateSettings({ code: c, playerId, token, topic, mode, secondsPerQ, numQuestions }) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId) throw new GameError("Only the host can change settings.", 403);
  if (room.status !== "lobby") throw new GameError("Settings lock once the game starts.");
  if (topic != null && cleanTopic(topic) && cleanTopic(topic) !== room.topic) { const t = cleanTopic(topic); checkTopic(t); room.topic = t; }
  if (MODES.includes(mode)) room.mode = mode;
  if (secondsPerQ != null) room.secondsPerQ = clamp(Number(secondsPerQ) || 45, 15, 180);
  if (numQuestions != null) room.numQuestions = clamp(Number(numQuestions) || 8, 3, 20);
  await saveRoom(room);
  return { ok: true };
}

const REJECTED_MSG = "FactClash keeps it friendly and factual. Try a different topic.";
const prepSig = (room) => `${room.topic.toLowerCase()}|${room.numQuestions}`;
async function buildLadder(topic, n, openaiKey, avoid = []) {
  const [{ questions, ms, steps, rewritten }, unsafe] = await Promise.all([generateQuestions(topic, n, openaiKey, avoid), isUnsafe(topic, openaiKey)]);
  if (unsafe) throw new TopicRejected("moderation");
  // One line per ladder for the logs: speed, how many drafts the reviewer rejected, and the difficulty climb.
  console.log(JSON.stringify({ ladder: topic, n, ms, rewritten, ...steps }));
  return questions;
}
// Host's lobby calls this right away, so questions are usually ready before anyone taps Start.
export async function prepareRoom({ code: c, playerId, token }, openaiKey, ip = "unknown") {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId || room.status !== "lobby") return { ok: true, state: "skip" };
  await limit("prepare", ip, 120);
  const sig = prepSig(room);
  const cur = await getJson(K.prep(c));
  if (cur && cur.sig === sig && (cur.questions || cur.rejected || (cur.pending && now() - cur.at < 90000))) return { ok: true, state: cur.questions ? "ready" : cur.rejected ? "rejected" : "pending" };
  await setJson(K.prep(c), { sig, pending: true, at: now() }); notify(c);
  try {
    const questions = await buildLadder(room.topic, room.numQuestions, openaiKey, room.asked || []);
    const latest = await getJson(K.prep(c));
    if (latest?.sig !== sig) return { ok: true, state: "stale" };
    await setJson(K.prep(c), { sig, questions, at: now() }); notify(c);
    return { ok: true, state: "ready" };
  } catch (err) {
    const latest = await getJson(K.prep(c));
    if (latest?.sig !== sig) return { ok: true, state: "stale" };
    if (err instanceof TopicRejected) { await setJson(K.prep(c), { sig, rejected: true, at: now() }); notify(c); return { ok: true, state: "rejected" }; }
    console.error("prepare", err); await store.del(K.prep(c)); notify(c);
    return { ok: true, state: "failed" };
  }
}

export async function startRoom({ code: c, playerId, token }, openaiKey, ip = "unknown") {
  const room = await loadRoom(c); await auth(c, playerId, token);
  await limit("start", ip, 60);
  await limit("startroom", c, 20);
  if (room.hostId !== playerId) throw new GameError("Only the host can start.", 403);
  if (room.status !== "lobby") throw new GameError("Already started.");
  const sig = prepSig(room);
  let prep = await getJson(K.prep(c));
  if (prep?.sig === sig && prep.rejected) { room.error = REJECTED_MSG; await saveRoom(room); notify(c); throw new GameError(REJECTED_MSG, 400); }
  room.status = "generating"; room.generatingSince = now(); room.error = null;
  await saveRoom(room); notify(c);
  try {
    // Use the questions prepared in the lobby; wait briefly if they are still being written.
    for (let w = 0; prep?.sig === sig && prep.pending && w < 120; w++) { await new Promise((r) => setTimeout(r, 500)); prep = await getJson(K.prep(c)); }
    if (prep?.sig === sig && prep.rejected) throw new TopicRejected("prepared");
    const questions = prep?.sig === sig && prep.questions ? prep.questions : await buildLadder(room.topic, room.numQuestions, openaiKey, room.asked || []);
    await store.del(K.prep(c)); // a rematch always gets fresh questions
    const oldTyping = (await readLive(c)).keys.filter((k) => k.startsWith("t:"));
    if (oldTyping.length) await store.hdel(K.live(c), ...oldTyping);
    await store.del(K.stats(c), K.progress(c), K.progressT(c),
      ...Array.from({ length: 20 }, (_, i) => K.answers(c, i)), ...Array.from({ length: 20 }, (_, i) => K.lock(c, i)), ...Array.from({ length: 20 }, (_, i) => K.ready(c, i)));
    const fresh = await loadRoom(c);
    const t0 = now();
    fresh.asked = [...(fresh.asked || []), ...questions.map((q) => q.prompt)].slice(-60);
    Object.assign(fresh, { questions, status: "playing", round: { index: 0, startedAt: t0, endsAt: roundEndsAt(fresh, t0) }, games: (fresh.games || 0) + 1, startedAt: t0, finishedAt: null, raceEndsAt: null });
    await saveRoom(fresh);
    await logEvent(c, "start", `Game on: ${fresh.topic}`);
    notify(c);
    return { ok: true };
  } catch (err) {
    if (!(err instanceof TopicRejected)) console.error("generate", err);
    const fresh = await loadRoom(c);
    fresh.status = "lobby";
    fresh.error = err instanceof TopicRejected ? REJECTED_MSG : "Could not build questions for that topic. Try again, or try a different topic.";
    await saveRoom(fresh); notify(c);
    throw new GameError(fresh.error, 502);
  }
}

export async function typing({ code: c, playerId, token, q, len }) {
  await auth(c, playerId, token);
  const rec = { q: Number(q), at: now(), len: clamp(Number(len) || 0, 0, ANSWER_MAX) };
  await hsetJson(K.live(c), `t:${playerId}`, rec);
  notify(c, "t", { pid: playerId, ...rec });
  return { ok: true };
}

export async function react({ code: c, playerId, token, text }) {
  const p = await auth(c, playerId, token);
  if (!REACTIONS.includes(text)) throw new GameError("Unknown reaction.");
  if (!(await store.set(`room:${c}:rx:${playerId}`, "1", { nx: true, ex: 1 }))) return { ok: true, throttled: true };
  await logEvent(c, "react", `${p.name}: ${text}`, { playerId, name: p.name, avatar: p.avatar, reaction: text });
  return { ok: true };
}

// ---------- scoring ----------
// Each key point earns full credit (clearly hit), half credit (partly hit) or nothing.
// Low-confidence noise earns nothing, so a totally wrong answer scores exactly zero.
export const credit = (p) => (p >= 0.7 ? 1 : p >= 0.4 ? 0.5 : 0);
export function scoreAnswer({ result, question, numQuestions, elapsedMs, limitMs, streak, double }) {
  const ps = result.criteria.map((x) => x.p ?? 0);
  const mult = 1 + (question.difficulty - 1) / Math.max(1, numQuestions - 1); // 1x .. 2x
  const zero = (extra = {}) => ({ points: 0, breakdown: { base: 0, speed: 0, streak: 0, mult: Number(mult.toFixed(2)), double: !!double }, coverage: 0, hits: 0, misFired: false, good: false, flawless: false, ...extra });
  const flag = result.flags?.abuse ? "abuse" : result.flags?.injection ? "injection" : null;
  if (flag) return zero({ flag });
  let coverage = ps.length ? ps.reduce((a, p) => a + credit(p), 0) / ps.length : 0;
  const hits = ps.filter((p) => credit(p) === 1).length;
  // A "mostly wrong" verdict wins unless the answer clearly hit most key points.
  // A "mostly wrong" verdict only overrides answers that hit half the key facts or fewer, so the ticks a player sees always match the score.
  if (coverage === 0 || (result.flags?.wrong && coverage <= 0.5)) return zero({ wrong: true });
  const misFired = result.misconceptions.some((m) => (m.p ?? 0) >= 0.6) || !!result.flags?.error;
  let base = coverage * 100 * mult;
  if (misFired) base *= 0.5;
  const good = coverage >= 0.67 && !misFired;
  const speed = limitMs && coverage >= 0.5 ? base * 0.25 * clamp(1 - elapsedMs / limitMs, 0, 1) : 0;
  const streakBonus = good ? base * Math.min(0.5, 0.1 * streak) : 0;
  const flawless = ps.length > 0 && ps.every((p) => p >= 0.8) && !misFired;
  const subtotal = base + speed + streakBonus;
  return {
    points: Math.round(double ? subtotal * 2 : subtotal),
    breakdown: { base: Math.round(base), speed: Math.round(speed), streak: Math.round(streakBonus), mult: Number(mult.toFixed(2)), double: !!double },
    coverage: Number(coverage.toFixed(2)), hits, misFired, good, flawless,
  };
}

async function gradeOne(room, qIndex, pid, ans, apiKey) {
  const q = room.questions[qIndex];
  const streak = Number(await store.hget(K.stats(room.code), `stk:${pid}`) || 0);
  let result;
  try { result = await grade(q, ans.text, apiKey); }
  catch (err) { result = { error: err.message, criteria: q.rubric.map((text) => ({ text, p: 0 })), misconceptions: [], overall: {} }; }
  const s = scoreAnswer({ result, question: q, numQuestions: room.questions.length, elapsedMs: ans.ms, limitMs: limitMsFor(room), streak, double: ans.double });
  const streakAfter = s.good ? streak + 1 : 0;
  await Promise.all([store.hincrby(K.stats(room.code), `pts:${pid}`, s.points), store.hset(K.stats(room.code), `stk:${pid}`, String(streakAfter))]);
  const graded = { ...ans, result, ...s, streakAfter };
  await hsetJson(K.answers(room.code, qIndex), pid, graded);
  return graded;
}

async function gradeRound(room, qIndex, apiKey) {
  const got = await store.set(K.lock(room.code, qIndex), "1", { nx: true, ex: 120 });
  if (!got) return false;
  const [players, answers] = await Promise.all([hgetallJson(K.players(room.code)), hgetallJson(K.answers(room.code, qIndex))]);
  await Promise.all(Object.keys(players).map(async (pid) => {
    const a = answers[pid];
    if (a && !a.result) return gradeOne(room, qIndex, pid, a, apiKey);
    if (!a) {
      await store.hset(K.stats(room.code), `stk:${pid}`, "0");
      await hsetJson(K.answers(room.code, qIndex), pid, { text: "", submittedAt: null, ms: null, skipped: true, points: 0, coverage: 0, result: null });
    }
  }));
  const fresh = await loadRoom(room.code);
  if (fresh.round && fresh.round.index === qIndex && fresh.status === "playing") {
    fresh.status = "reveal"; fresh.round.revealedAt = now();
    await saveRoom(fresh);
  }
  await expireAll(K.answers(room.code, qIndex), K.lock(room.code, qIndex), K.stats(room.code), K.live(room.code), K.players(room.code));
  return true;
}

async function useDouble(c, playerId, q) {
  const used = await store.hget(K.stats(c), `dbl:${playerId}`);
  if (used != null) throw new GameError("You already used your 2× boost this game.");
  await store.hset(K.stats(c), `dbl:${playerId}`, String(q));
}

export async function submitAnswer({ code: c, playerId, token, q, text, double }, apiKey) {
  const room = await loadRoom(c); const me = await auth(c, playerId, token);
  q = Number(q);
  text = String(text || "").replace(/\s+/g, " ").trim().slice(0, ANSWER_MAX);
  if (!text) throw new GameError("Type your answer first.");
  if (room.status !== "playing") throw new GameError("This round has closed.");
  const question = room.questions[q];
  if (!question) throw new GameError("That question does not exist.");
  if (await hgetJson(K.answers(c, q), playerId)) throw new GameError("You already locked in.");

  if (room.mode === "race") {
    const cur = Number(await store.hget(K.progress(c), playerId) || 0);
    if (q !== cur) throw new GameError("Answer your current rung.");
    if (double) await useDouble(c, playerId, q);
    const startedAt = Number(await store.hget(K.progressT(c), playerId) || room.round.startedAt);
    const ans = { text, submittedAt: now(), ms: now() - startedAt, double: !!double };
    await hsetJson(K.answers(c, q), playerId, ans);
    const graded = await gradeOne(room, q, playerId, ans, apiKey);
    await Promise.all([store.hset(K.progress(c), playerId, String(q + 1)), store.hset(K.progressT(c), playerId, String(now()))]);
    await expireAll(K.answers(c, q), K.stats(c), K.progress(c), K.progressT(c));
    const [players, prog, seen] = await Promise.all([hgetallJson(K.players(c)), store.hgetall(K.progress(c)), seenOf(c)]);
    const t = now();
    if (Object.keys(players).every((pid) => Number(prog[pid] || 0) >= room.questions.length || !isActive(seen, pid, t))) {
      const fresh = await loadRoom(c); fresh.status = "finished"; fresh.finishedAt = t; await saveRoom(fresh);
    } else if (q + 1 >= room.questions.length) {
      const fresh = await loadRoom(c);
      if (fresh.status === "playing" && !fresh.raceEndsAt) { fresh.raceEndsAt = t + RACE_FINISH_MS; await saveRoom(fresh); await logEvent(c, "racefinish", `${me.name} finished. Everyone else has 60 seconds.`, { playerId }); }
    }
    return { ok: true, graded: publicAnswer(graded, me) };
  }

  if (room.round.index !== q) throw new GameError("That round is over.");
  if (room.mode === "timed" && now() > room.round.endsAt + GRACE_MS) throw new GameError("Time is up.");
  if (double) await useDouble(c, playerId, q);
  const ans = { text, submittedAt: now(), ms: Math.max(0, now() - room.round.startedAt - (room.mode === "timed" ? COUNTDOWN_MS : 0)), double: !!double };
  await hsetJson(K.answers(c, q), playerId, ans);
  const [players, answers, seen] = await Promise.all([hgetallJson(K.players(c)), hgetallJson(K.answers(c, q)), seenOf(c)]);
  const t = now();
  const active = Object.keys(players).filter((pid) => isActive(seen, pid, t) || pid === playerId);
  const answered = active.filter((pid) => answers[pid]).length;
  if (Object.keys(players).every((pid) => answers[pid] || !isActive(seen, pid, t))) await gradeRound(room, q, apiKey);
  else if (room.mode === "untimed" && !room.round.endsAt && answered >= Math.ceil(active.length / 2)) {
    const fresh = await loadRoom(c);
    if (fresh.status === "playing" && fresh.round.index === q && !fresh.round.endsAt) { fresh.round.endsAt = t + LAST_CALL_MS; fresh.round.lastCall = true; await saveRoom(fresh); }
  }
  return { ok: true };
}

async function advance(room) {
  const nextIndex = room.round.index + 1;
  if (nextIndex >= room.questions.length) { room.status = "finished"; room.finishedAt = now(); }
  else { const t0 = now(); room.status = "playing"; room.round = { index: nextIndex, startedAt: t0, endsAt: roundEndsAt(room, t0) }; }
  await saveRoom(room);
}

export async function nextRound({ code: c, playerId, token }) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId) throw new GameError("Only the host can advance.", 403);
  if (room.status === "playing" && room.mode === "untimed") { room.round.endsAt = now() - GRACE_MS - 1; await saveRoom(room); return { ok: true, forced: true }; }
  if (room.status !== "reveal") throw new GameError("Nothing to advance.");
  await advance(room);
  return { ok: true };
}

// Everyone taps Ready on the reveal; when all active players are ready the game moves on.
export async function markReady({ code: c, playerId, token, q }) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.status !== "reveal" || room.round.index !== Number(q)) return { ok: true };
  await store.hset(K.ready(c, room.round.index), playerId, "1");
  await expireAll(K.ready(c, room.round.index));
  const [players, ready, seen] = await Promise.all([hgetallJson(K.players(c)), store.hgetall(K.ready(c, room.round.index)), seenOf(c)]);
  const t = now();
  const active = Object.keys(players).filter((pid) => isActive(seen, pid, t) || pid === playerId);
  if (active.length && active.every((pid) => ready[pid])) {
    const fresh = await loadRoom(c);
    if (fresh.status === "reveal" && fresh.round.index === room.round.index) await advance(fresh);
  }
  return { ok: true };
}

export async function playAgain({ code: c, playerId, token, topic, numQuestions, mode, secondsPerQ }) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId) throw new GameError("Only the host can restart.", 403);
  Object.assign(room, { status: "lobby", questions: [], round: null, error: null, raceEndsAt: null });
  if (topic && cleanTopic(topic) !== room.topic) { const t = cleanTopic(topic); checkTopic(t); room.topic = t; }
  if (numQuestions) room.numQuestions = clamp(Number(numQuestions), 3, 20);
  if (MODES.includes(mode)) room.mode = mode;
  if (secondsPerQ) room.secondsPerQ = clamp(Number(secondsPerQ), 15, 180);
  await saveRoom(room);
  await logEvent(c, "again", `Rematch: ${room.topic}`);
  return { ok: true };
}

function publicAnswer(a, p, viewerId) {
  if (!a) return null;
  const hide = a.flag === "abuse" && viewerId !== p.id;
  return {
    playerId: p.id, name: p.name, avatar: p.avatar, level: p.level || 1, text: hide ? "" : a.text, hidden: hide, flag: a.flag || null, skipped: !!a.skipped, ms: a.ms,
    points: a.points ?? null, coverage: a.coverage ?? null, hits: a.hits ?? null, wrong: !!a.wrong, flawless: !!a.flawless, misFired: !!a.misFired, double: !!a.double,
    breakdown: a.breakdown || null, streakAfter: a.streakAfter ?? 0,
    criteria: a.result?.criteria || null, misconceptions: a.result?.misconceptions || null, error: a.result?.error || null,
    parts: hide ? null : a.result?.parts || null,
  };
}

// Public preview of a room for invite pages. No auth.
export async function peekRoom({ code: c }, ip = "unknown") {
  await limit("peek", ip, 240);
  c = String(c || "").trim().toUpperCase();
  const room = await getJson(K.room(c));
  if (!room || !room.code) throw new GameError("That room has closed. Ask your friend for a new link.", 404);
  const players = Object.values(await hgetallJson(K.players(c))).sort((a, b) => a.joinedAt - b.joinedAt);
  return { code: c, topic: room.topic, mode: room.mode, numQuestions: room.numQuestions, secondsPerQ: room.secondsPerQ, status: room.status,
    host: players.find((p) => p.id === room.hostId)?.name || players[0]?.name || "A friend", players: players.map((p) => ({ name: p.name, avatar: p.avatar, level: p.level || 1 })) };
}

// Used by the challenge-link builder once a game is over.
export async function loadFinished({ code: c, playerId, token }) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.status !== "finished" || !room.questions?.length) throw new GameError("Finish the game first.");
  const [players, { scores }] = await Promise.all([hgetallJson(K.players(c)), readStats(c)]);
  return { room, players, scores };
}
export const persistRoom = saveRoom;

// ---------- state ----------
export async function getState(body, apiKey) {
  const { code: c, playerId, token } = body;
  const t = now();
  const [room0, players, lv] = await Promise.all([getJson(K.room(c)), hgetallJson(K.players(c)), readLive(c), touch(c, playerId)]);
  if (!room0) throw new GameError("Room not found. Check the code.", 404);
  const me = players[playerId];
  if (!me || me.token !== token) throw new GameError("You are no longer in this room.", 403);
  let room = room0;
  const seen = lv.seen; seen[playerId] = t;

  if (body.level != null && cleanLevel(body.level) !== (me.level || 1)) { me.level = cleanLevel(body.level); hsetJson(K.players(c), playerId, me).catch(() => {}); }

  // an away host hands over to the longest-present active player
  if (room.hostId !== playerId && players[room.hostId] && !isActive(seen, room.hostId, t - (HOST_AWAY_MS - AWAY_MS))) {
    const next = Object.values(players).filter((p) => isActive(seen, p.id, t)).sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next && next.id !== room.hostId) {
      room.hostId = next.id; await saveRoom(room);
      await logEvent(c, "host", `${next.name} is now the host`, { playerId: next.id });
      notify(c);
    }
  }

  const roundIdx = room.round?.index ?? 0;
  const live = room.status === "playing" || room.status === "reveal";
  const typingMap = lv.typing;
  const [{ scores, streaks, doubles }, currentAnswers, readyH, prog, progT] = await Promise.all([
    readStats(c),
    live && room.mode !== "race" ? hgetallJson(K.answers(c, roundIdx)) : Promise.resolve({}),
    room.status === "reveal" ? store.hgetall(K.ready(c, roundIdx)) : Promise.resolve({}),
    room.mode === "race" ? store.hgetall(K.progress(c)) : Promise.resolve({}),
    room.mode === "race" ? store.hgetall(K.progressT(c)) : Promise.resolve({}),
  ]);

  // race deadline: once someone finished, the race ends 60s later for everyone
  if (!body._again && room.mode === "race" && room.status === "playing" && room.raceEndsAt && t > room.raceEndsAt) {
    const fresh = await loadRoom(c);
    if (fresh.status === "playing") { fresh.status = "finished"; fresh.finishedAt = t; await saveRoom(fresh); notify(c); return getState({ ...body, _again: true }, apiKey); }
  }
  // time and vote based transitions, then re-read once
  if (!body._again && room.mode !== "race") {
    let changed = false;
    if (room.status === "playing" && room.round) {
      const timeUp = room.round.endsAt && t > room.round.endsAt + GRACE_MS;
      const active = Object.keys(players).filter((pid) => isActive(seen, pid, t));
      const allIn = active.length > 0 && active.every((pid) => currentAnswers[pid]);
      if (timeUp || allIn) changed = await gradeRound(room, roundIdx, apiKey) || true;
    } else if (room.status === "reveal" && room.round?.revealedAt) {
      const active = Object.keys(players).filter((pid) => isActive(seen, pid, t));
      const allReady = active.length > 0 && active.every((pid) => readyH[pid]);
      const autoMs = room.mode === "timed" ? REVEAL_AUTO_MS : REVEAL_AUTO_CHILL_MS;
      if (t > room.round.revealedAt + autoMs || allReady) {
        const fresh = await loadRoom(c);
        if (fresh.status === "reveal" && fresh.round.index === roundIdx) { await advance(fresh); changed = true; }
      }
    }
    if (changed) { notify(c); return getState({ ...body, _again: true }, apiKey); }
  }

  // prune old events
  const allEvents = lv.events.sort((a, b) => a.t - b.t);
  const stale = allEvents.filter((e) => e.t < t - 120000).map((e) => `e:${e.id}`);
  if (stale.length) store.hdel(K.live(c), ...stale).catch(() => {});
  const events = allEvents.filter((e) => e.t > t - 60000).slice(-30);

  const curQ = (pid) => room.mode === "race" ? Number(prog[pid] || 0) : roundIdx;
  const list = Object.values(players).map((p) => {
    const ty = typingMap[p.id];
    const onThis = ty && ty.q === curQ(p.id) && !currentAnswers[p.id];
    return {
      id: p.id, name: p.name, avatar: p.avatar, level: p.level || 1, isHost: p.id === room.hostId, isMe: p.id === me.id,
      score: Number(scores[p.id] || 0), streak: Number(streaks[p.id] || 0), away: !isActive(seen, p.id, t),
      submitted: !!currentAnswers[p.id], ready: !!readyH[p.id], doubleLeft: doubles[p.id] == null,
      typing: !!(onThis && t - ty.at < 4000), chars: onThis ? ty.len || 0 : 0,
      progress: room.mode === "race" ? Number(prog[p.id] || 0) : null,
    };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  list.forEach((p, i) => (p.rank = i + 1));

  const n = room.questions.length || room.numQuestions;
  const out = {
    code: room.code, topic: room.topic, mode: room.mode, secondsPerQ: room.secondsPerQ, numQuestions: room.numQuestions,
    status: room.status, isHost: room.hostId === me.id, me: { id: me.id, name: me.name, avatar: me.avatar, level: me.level || 1 },
    players: list, serverTime: t, error: room.error || null, games: room.games || 0, totalQuestions: n, events,
    countdownMs: COUNTDOWN_MS, revealAutoMs: room.mode === "timed" ? REVEAL_AUTO_MS : room.mode === "untimed" ? REVEAL_AUTO_CHILL_MS : 0, reactions: REACTIONS,
    raceEndsAt: room.mode === "race" ? room.raceEndsAt || null : null,
  };
  if (room.status === "generating") out.generatingFor = t - (room.generatingSince || t);
  if (room.status === "lobby" && room.hostId === me.id) {
    const prep = await getJson(K.prep(c));
    out.prep = prep?.sig === prepSig(room) ? (prep.questions ? "ready" : prep.rejected ? "rejected" : "pending") : null;
    if (out.prep === "rejected") out.error = REJECTED_MSG;
  }

  if (live && room.mode !== "race") {
    const q = room.questions[roundIdx];
    out.question = { index: q.index, difficulty: q.difficulty, label: q.label, prompt: q.prompt, total: n, keys: q.rubric.length };
    out.round = { index: roundIdx, startedAt: room.round.startedAt, endsAt: room.round.endsAt, revealedAt: room.round.revealedAt || null, lastCall: !!room.round.lastCall, lastCallMs: LAST_CALL_MS };
    out.myAnswer = currentAnswers[me.id] ? publicAnswer(currentAnswers[me.id], me) : null;
    if (room.status === "reveal") {
      out.reveal = { rubric: q.rubric, points: q.points, answers: Object.values(players).map((p) => publicAnswer(currentAnswers[p.id], p, me.id)).filter(Boolean).sort((a, b) => (b.points || 0) - (a.points || 0)) };
    }
  }

  if (room.mode === "race" && (room.status === "playing" || room.status === "finished")) {
    const qIndex = Number(prog[playerId] || 0);
    const q = room.questions[qIndex];
    out.round = { index: qIndex, startedAt: Number(progT[playerId] || room.round.startedAt), endsAt: null };
    if (q) out.question = { index: q.index, difficulty: q.difficulty, label: q.label, prompt: q.prompt, total: n, keys: q.rubric.length };
    const last = qIndex > 0 ? await hgetJson(K.answers(c, qIndex - 1), playerId) : null;
    out.lastGraded = last ? { ...publicAnswer(last, me), prompt: room.questions[qIndex - 1].prompt, rubric: room.questions[qIndex - 1].rubric, points_ref: room.questions[qIndex - 1].points } : null;
    out.finishedMine = qIndex >= n;
  }

  if (room.status === "finished") {
    const all = await Promise.all(room.questions.map((_, i) => hgetallJson(K.answers(c, i))));
    out.summary = room.questions.map((q, i) => ({
      index: i, label: q.label, prompt: q.prompt, rubric: q.rubric, points: q.points,
      answers: Object.values(players).map((p) => publicAnswer(all[i][p.id], p, me.id)).filter(Boolean).sort((a, b) => (b.points || 0) - (a.points || 0)),
    }));
    out.gameId = `${room.code}:${room.games || 0}`;
  }
  return out;
}
