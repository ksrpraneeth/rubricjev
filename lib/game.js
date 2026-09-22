// Multiplayer game engine. All state lives in the store so any serverless instance can serve any request.
import { randomBytes } from "node:crypto";
import { store, getJson, setJson, hsetJson, hgetJson, hgetallJson } from "./store.js";
import { generateQuestions } from "./generate.js";
import { grade } from "./grade.js";

const K = {
  room: (c) => `room:${c}`,
  players: (c) => `room:${c}:players`,
  answers: (c, q) => `room:${c}:answers:${q}`,
  typing: (c) => `room:${c}:typing`,
  scores: (c) => `room:${c}:scores`,
  streaks: (c) => `room:${c}:streaks`,
  progress: (c) => `room:${c}:progress`,
  lock: (c, q) => `room:${c}:lock:${q}`,
  seen: (c) => `room:${c}:seen`,
  events: (c) => `room:${c}:events`,
  rate: (bucket) => `rate:${bucket}`,
};
const COUNTDOWN_MS = 3000;   // get-ready countdown before a timed question
const AWAY_MS = 12000;       // no poll for this long = away
const HOST_AWAY_MS = 30000;  // away host loses the host role
const REVEAL_AUTO_MS = 30000; // timed mode auto-advances the reveal
const MODES = ["timed", "untimed", "race"];
const AVATARS = Array.from({ length: 12 }, (_, i) => i); // colour index, rendered as initials in the UI
const GRACE_MS = 2500;      // network grace after timer ends

export class GameError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

const code = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (const b of randomBytes(4)) s += a[b % a.length]; return s; };
const id = () => randomBytes(8).toString("hex");
const now = () => Date.now();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

async function loadRoom(c) {
  const room = await getJson(K.room(c));
  if (!room) throw new GameError("Room not found. Check the code.", 404);
  return room;
}
async function saveRoom(room) { await setJson(K.room(room.code), room); }
async function logEvent(c, type, text, extra = {}) {
  const ev = { id: id(), t: now(), type, text, ...extra };
  await hsetJson(K.events(c), ev.id, ev);
  return ev;
}
const seenMap = async (c) => { const h = await store.hgetall(K.seen(c)); const o = {}; for (const [k, v] of Object.entries(h)) o[k] = Number(v); return o; };
const isActive = (seen, pid, t) => (seen[pid] || 0) > t - AWAY_MS;
const roundEndsAt = (room, startedAt) => room.mode === "timed" ? startedAt + COUNTDOWN_MS + room.secondsPerQ * 1000 : null;

async function auth(c, playerId, token) {
  const p = await hgetJson(K.players(c), playerId);
  if (!p || p.token !== token) throw new GameError("Not a player in this room.", 403);
  return p;
}

export async function createRoom({ name, topic, mode, secondsPerQ, numQuestions }, ip = "unknown") {
  const hour = Math.floor(now() / 3600000);
  const n = await store.hincrby(K.rate(`create:${hour}`), ip, 1);
  await store.expire(K.rate(`create:${hour}`));
  if (n > 15) throw new GameError("Too many rooms created from this network. Try again in an hour.", 429);
  name = String(name || "").trim().slice(0, 20);
  topic = String(topic || "").trim().slice(0, 120);
  if (!name) throw new GameError("Pick a name.");
  if (topic.length < 2) throw new GameError("Give the room a topic.");
  if (!MODES.includes(mode)) mode = "timed";
  secondsPerQ = clamp(Number(secondsPerQ) || 60, 20, 180);
  numQuestions = clamp(Number(numQuestions) || 8, 3, 20);

  let c;
  for (let i = 0; i < 5; i++) { c = code(); if (await store.set(K.room(c), "{}", { nx: true })) break; c = null; }
  if (!c) throw new GameError("Could not allocate a room, try again.", 500);

  const hostId = id(), token = id();
  const room = { code: c, hostId, topic, mode, secondsPerQ, numQuestions, status: "lobby", questions: [], round: null, createdAt: now(), games: 0 };
  await saveRoom(room);
  await hsetJson(K.players(c), hostId, { id: hostId, name, avatar: 0, token, joinedAt: now() });
  await store.hset(K.seen(c), hostId, String(now()));
  return { code: c, playerId: hostId, token };
}

export async function joinRoom({ code: c, name }) {
  c = String(c || "").trim().toUpperCase();
  name = String(name || "").trim().slice(0, 20);
  if (!name) throw new GameError("Pick a name.");
  const room = await loadRoom(c);
  const players = await hgetallJson(K.players(c));
  if (Object.keys(players).length >= 12) throw new GameError("Room is full (12 players).");
  if (room.status === "generating") throw new GameError("The host is starting the game. Try again in a few seconds.");
  if (room.status === "finished") throw new GameError("This game has ended. Ask the host to play again, then join.");
  const taken = new Set(Object.values(players).map((p) => p.avatar));
  const avatar = AVATARS.find((a) => !taken.has(a)) ?? Object.keys(players).length % AVATARS.length;
  const pid = id(), token = id();
  await hsetJson(K.players(c), pid, { id: pid, name, avatar, token, joinedAt: now() });
  await store.hset(K.seen(c), pid, String(now()));
  await logEvent(c, "join", `${name} joined`, { playerId: pid });
  return { code: c, playerId: pid, token };
}

async function removePlayer(room, pid, reason) {
  const players = await hgetallJson(K.players(room.code));
  const p = players[pid]; if (!p) return;
  const c = room.code;
  // rebuild the hash without this player (no hdel in the store abstraction)
  await store.del(K.players(c));
  for (const [k, v] of Object.entries(players)) if (k !== pid) await hsetJson(K.players(c), k, v);
  await logEvent(c, reason, reason === "kick" ? `${p.name} was removed by the host` : `${p.name} left`, { playerId: pid });
  const remaining = Object.values(players).filter((x) => x.id !== pid).sort((a, b) => a.joinedAt - b.joinedAt);
  if (!remaining.length) { await store.del(K.room(c)); return; }
  if (room.hostId === pid) {
    room.hostId = remaining[0].id; await saveRoom(room);
    await logEvent(c, "host", `${remaining[0].name} is now the host`, { playerId: remaining[0].id });
  }
  // a round that was waiting only on this player can now resolve
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
  room.status = "finished"; await saveRoom(room);
  await logEvent(c, "end", "The host ended the game early");
  return { ok: true };
}

export async function updateSettings({ code: c, playerId, token, topic, mode, secondsPerQ, numQuestions }) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId) throw new GameError("Only the host can change settings.", 403);
  if (room.status !== "lobby") throw new GameError("Settings lock once the game starts.");
  if (topic != null) room.topic = String(topic).trim().slice(0, 120) || room.topic;
  if (MODES.includes(mode)) room.mode = mode;
  if (secondsPerQ != null) room.secondsPerQ = clamp(Number(secondsPerQ) || 60, 20, 180);
  if (numQuestions != null) room.numQuestions = clamp(Number(numQuestions) || 8, 3, 20);
  await saveRoom(room);
  return { ok: true };
}

export async function startRoom({ code: c, playerId, token }, openaiKey) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId) throw new GameError("Only the host can start.", 403);
  if (room.status !== "lobby") throw new GameError("Already started.");
  room.status = "generating"; room.generatingSince = now();
  await saveRoom(room);
  try {
    const { questions } = await generateQuestions(room.topic, room.numQuestions, openaiKey);
    const fresh = await loadRoom(c);
    fresh.questions = questions;
    fresh.status = "playing";
    const t0 = now();
    fresh.round = { index: 0, startedAt: t0, endsAt: roundEndsAt(fresh, t0) };
    fresh.games = (fresh.games || 0) + 1;
    await saveRoom(fresh);
    // clear per-game state
    await store.del(K.scores(c), K.streaks(c), K.progress(c), K.progress(c) + ":t", K.typing(c), ...Array.from({ length: 20 }, (_, i) => K.answers(c, i)), ...Array.from({ length: 20 }, (_, i) => K.lock(c, i)));
    await logEvent(c, "start", `Game started: ${fresh.questions.length} questions on ${fresh.topic}`);
    return { ok: true };
  } catch (err) {
    const fresh = await loadRoom(c);
    fresh.status = "lobby"; fresh.error = `Could not generate questions: ${err.message}`;
    await saveRoom(fresh);
    throw new GameError(fresh.error, 502);
  }
}

export async function typing({ code: c, playerId, token, q, len }) {
  await auth(c, playerId, token);
  await hsetJson(K.typing(c), playerId, { q: Number(q), at: now(), len: Math.max(0, Math.min(1500, Number(len) || 0)) });
  return { ok: true };
}

// ---------- Scoring ----------
export function scoreAnswer({ result, question, numQuestions, elapsedMs, limitMs, streak }) {
  const ps = result.criteria.map((x) => x.p ?? 0);
  const coverage = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0;
  const misFired = result.misconceptions.some((m) => (m.p ?? 0) >= 0.5);
  const mult = 1 + (question.difficulty - 1) / Math.max(1, numQuestions - 1); // 1x .. 2x
  let base = coverage * 100 * mult;
  if (misFired) base *= 0.5;
  const good = coverage >= 0.7 && !misFired;
  const speed = limitMs && coverage >= 0.5 ? base * 0.25 * clamp(1 - elapsedMs / limitMs, 0, 1) : 0;
  const streakBonus = good ? base * Math.min(0.5, 0.1 * streak) : 0;
  const flawless = ps.length > 0 && ps.every((p) => p >= 0.9) && !misFired;
  return {
    points: Math.round(base + speed + streakBonus),
    breakdown: { base: Math.round(base), speed: Math.round(speed), streak: Math.round(streakBonus), mult: Number(mult.toFixed(2)) },
    coverage: Number(coverage.toFixed(2)), misFired, good, flawless,
  };
}

async function gradeOne(room, qIndex, pid, ans, apiKey) {
  const q = room.questions[qIndex];
  const streak = Number(await store.hget(K.streaks(room.code), pid) || 0);
  let result;
  try { result = await grade(q, ans.text, apiKey); }
  catch (err) { result = { error: err.message, criteria: q.rubric.map((text) => ({ text, p: 0 })), misconceptions: [], overall: {} }; }
  const limitMs = room.mode === "timed" ? room.secondsPerQ * 1000 : (room.mode === "race" ? 120000 : 0);
  const s = scoreAnswer({ result, question: q, numQuestions: room.questions.length, elapsedMs: ans.ms, limitMs, streak });
  await store.hincrby(K.scores(room.code), pid, s.points);
  await store.hset(K.streaks(room.code), pid, String(s.good ? streak + 1 : 0));
  const graded = { ...ans, result, ...s, streakAfter: s.good ? streak + 1 : 0 };
  await hsetJson(K.answers(room.code, qIndex), pid, graded);
  return graded;
}

// Grade every submitted answer for a round; players who did not answer get zero and lose their streak.
async function gradeRound(room, qIndex, apiKey) {
  const got = await store.set(K.lock(room.code, qIndex), "1", { nx: true, ex: 120 });
  if (!got) return false;
  const players = await hgetallJson(K.players(room.code));
  const answers = await hgetallJson(K.answers(room.code, qIndex));
  await Promise.all(Object.keys(players).map(async (pid) => {
    const a = answers[pid];
    if (a && !a.result) return gradeOne(room, qIndex, pid, a, apiKey);
    if (!a) {
      await store.hset(K.streaks(room.code), pid, "0");
      await hsetJson(K.answers(room.code, qIndex), pid, { text: "", submittedAt: null, ms: null, skipped: true, points: 0, coverage: 0, result: null });
    }
  }));
  const fresh = await loadRoom(room.code);
  if (fresh.round && fresh.round.index === qIndex && fresh.status === "playing") {
    fresh.status = "reveal"; fresh.round.revealedAt = now();
    await saveRoom(fresh);
  }
  return true;
}

export async function submitAnswer({ code: c, playerId, token, q, text }, apiKey) {
  const room = await loadRoom(c); const me = await auth(c, playerId, token);
  q = Number(q);
  text = String(text || "").trim().slice(0, 1500);
  if (room.status !== "playing") throw new GameError("Round is not open.");
  const question = room.questions[q];
  if (!question) throw new GameError("Bad question index.");
  if (await hgetJson(K.answers(c, q), playerId)) throw new GameError("Already answered.");

  if (room.mode === "race") {
    const cur = Number(await store.hget(K.progress(c), playerId) || 0);
    if (q !== cur) throw new GameError("Answer your current question.");
    const startedAt = Number(await store.hget(K.progress(c) + ":t", playerId) || room.round.startedAt);
    const ans = { text, submittedAt: now(), ms: now() - startedAt };
    await hsetJson(K.answers(c, q), playerId, ans);
    const graded = await gradeOne(room, q, playerId, ans, apiKey);
    await store.hset(K.progress(c), playerId, String(q + 1));
    await store.hset(K.progress(c) + ":t", playerId, String(now()));
    // finished when everyone is past the last question
    const players = await hgetallJson(K.players(c));
    const prog = await store.hgetall(K.progress(c));
    const seenR = await seenMap(c); const tR = now();
    if (Object.keys(players).every((pid) => Number(prog[pid] || 0) >= room.questions.length || !isActive(seenR, pid, tR))) {
      const fresh = await loadRoom(c); fresh.status = "finished"; await saveRoom(fresh);
    }
    return { ok: true, graded: publicAnswer(graded, me) };
  }

  if (room.round.index !== q) throw new GameError("That round is over.");
  if (room.mode === "timed" && now() > room.round.endsAt + GRACE_MS) throw new GameError("Time is up for this question.");
  const ans = { text, submittedAt: now(), ms: Math.max(0, now() - room.round.startedAt - (room.mode === "timed" ? COUNTDOWN_MS : 0)) };
  await hsetJson(K.answers(c, q), playerId, ans);
  // grade early once every active player is in
  const players = await hgetallJson(K.players(c));
  const answers = await hgetallJson(K.answers(c, q));
  const seen = await seenMap(c); const t = now();
  if (Object.keys(players).every((pid) => answers[pid] || pid === playerId || !isActive(seen, pid, t))) await gradeRound(room, q, apiKey);
  return { ok: true };
}

export async function nextRound({ code: c, playerId, token }) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId) throw new GameError("Only the host can advance.", 403);
  if (room.status === "playing" && room.mode === "untimed") {
    // host forces reveal
    room.round.endsAt = now(); await saveRoom(room);
    return { ok: true, forced: true };
  }
  if (room.status !== "reveal") throw new GameError("Nothing to advance.");
  const nextIndex = room.round.index + 1;
  if (nextIndex >= room.questions.length) { room.status = "finished"; }
  else { const t0 = now(); room.status = "playing"; room.round = { index: nextIndex, startedAt: t0, endsAt: roundEndsAt(room, t0) }; }
  await saveRoom(room);
  return { ok: true };
}
async function autoAdvance(room) {
  const nextIndex = room.round.index + 1;
  if (nextIndex >= room.questions.length) room.status = "finished";
  else { const t0 = now(); room.status = "playing"; room.round = { index: nextIndex, startedAt: t0, endsAt: roundEndsAt(room, t0) }; }
  await saveRoom(room);
}

export async function playAgain({ code: c, playerId, token, topic, numQuestions, mode, secondsPerQ }) {
  const room = await loadRoom(c); await auth(c, playerId, token);
  if (room.hostId !== playerId) throw new GameError("Only the host can restart.", 403);
  room.status = "lobby"; room.questions = []; room.round = null; room.error = null;
  if (topic) room.topic = String(topic).trim().slice(0, 120);
  if (numQuestions) room.numQuestions = clamp(Number(numQuestions), 3, 20);
  if (MODES.includes(mode)) room.mode = mode;
  if (secondsPerQ) room.secondsPerQ = clamp(Number(secondsPerQ), 20, 180);
  await saveRoom(room);
  await logEvent(c, "again", "The host set up a new game");
  return { ok: true };
}

function publicAnswer(a, p) {
  if (!a) return null;
  return {
    playerId: p.id, name: p.name, avatar: p.avatar, text: a.text, skipped: !!a.skipped, ms: a.ms,
    points: a.points ?? null, coverage: a.coverage ?? null, flawless: !!a.flawless, misFired: !!a.misFired,
    breakdown: a.breakdown || null, streakAfter: a.streakAfter ?? 0,
    criteria: a.result?.criteria || null, misconceptions: a.result?.misconceptions || null, error: a.result?.error || null,
  };
}

// Full view for one player. Also drives time-based transitions (grading when the clock runs out).
export async function getState({ code: c, playerId, token }, apiKey) {
  let room = await loadRoom(c);
  const me = await auth(c, playerId, token);
  const t = now();
  await store.hset(K.seen(c), playerId, String(t));
  const seen = await seenMap(c); seen[playerId] = t;
  let players = await hgetallJson(K.players(c));

  // an away host loses the role to the longest-present active player
  if (room.hostId !== playerId && !isActive(seen, room.hostId, t - (HOST_AWAY_MS - AWAY_MS)) && players[room.hostId]) {
    const next = Object.values(players).filter((p) => isActive(seen, p.id, t)).sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next && next.id !== room.hostId) {
      room.hostId = next.id; await saveRoom(room);
      await logEvent(c, "host", `${next.name} is now the host (${players[room.hostId] ? "previous host is away" : "host left"})`, { playerId: next.id });
    }
  }
  // time-based transitions
  if (room.status === "playing" && room.mode !== "race" && room.round) {
    const timeUp = room.round.endsAt && t > room.round.endsAt + GRACE_MS;
    let allIn = false;
    if (!timeUp && room.mode === "untimed") {
      const answers = await hgetallJson(K.answers(c, room.round.index));
      const active = Object.keys(players).filter((pid) => isActive(seen, pid, t));
      allIn = active.length > 0 && active.every((pid) => answers[pid]) && Object.keys(answers).length > 0;
    }
    if (timeUp || allIn) { await gradeRound(room, room.round.index, apiKey); room = await loadRoom(c); }
  }
  if (room.status === "reveal" && room.mode === "timed" && room.round?.revealedAt && t > room.round.revealedAt + REVEAL_AUTO_MS) {
    await autoAdvance(room); room = await loadRoom(c);
  }
  const scores = await store.hgetall(K.scores(c));
  const streaks = await store.hgetall(K.streaks(c));
  const typingMap = await hgetallJson(K.typing(c));
  const eventsAll = Object.values(await hgetallJson(K.events(c))).sort((a, b) => a.t - b.t);
  const events = eventsAll.filter((e) => e.t > t - 60000).slice(-20);

  const qIndex = room.mode === "race" ? Number(await store.hget(K.progress(c), playerId) || 0) : room.round?.index ?? 0;
  const currentAnswers = room.status === "playing" || room.status === "reveal" ? await hgetallJson(K.answers(c, room.round?.index ?? 0)) : {};
  const prog = room.mode === "race" ? await store.hgetall(K.progress(c)) : {};

  const list = Object.values(players).map((p) => ({
    id: p.id, name: p.name, avatar: p.avatar, isHost: p.id === room.hostId, isMe: p.id === me.id,
    score: Number(scores[p.id] || 0), streak: Number(streaks[p.id] || 0),
    away: !isActive(seen, p.id, t),
    submitted: !!currentAnswers[p.id],
    typing: !currentAnswers[p.id] && typingMap[p.id] && t - typingMap[p.id].at < 4000 && typingMap[p.id].q === (room.mode === "race" ? Number(prog[p.id] || 0) : room.round?.index),
    chars: !currentAnswers[p.id] && typingMap[p.id] && typingMap[p.id].q === (room.mode === "race" ? Number(prog[p.id] || 0) : room.round?.index) ? typingMap[p.id].len || 0 : 0,
    progress: room.mode === "race" ? Number(prog[p.id] || 0) : null,
  })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  list.forEach((p, i) => (p.rank = i + 1));

  const n = room.questions.length || room.numQuestions;
  const out = {
    code: room.code, topic: room.topic, mode: room.mode, secondsPerQ: room.secondsPerQ, numQuestions: room.numQuestions,
    status: room.status, isHost: room.hostId === me.id, me: { id: me.id, name: me.name, avatar: me.avatar },
    players: list, serverTime: t, error: room.error || null, games: room.games || 0,
    totalQuestions: n, events, countdownMs: COUNTDOWN_MS, revealAutoMs: room.mode === "timed" ? REVEAL_AUTO_MS : 0,
  };

  if (room.status === "generating") out.generatingFor = t - (room.generatingSince || t);

  if ((room.status === "playing" || room.status === "reveal") && room.mode !== "race") {
    const q = room.questions[room.round.index];
    out.question = { index: q.index, difficulty: q.difficulty, label: q.label, prompt: q.prompt, total: n };
    out.round = { index: room.round.index, startedAt: room.round.startedAt, endsAt: room.round.endsAt, revealedAt: room.round.revealedAt || null };
    out.myAnswer = currentAnswers[me.id] ? publicAnswer(currentAnswers[me.id], me) : null;
    if (room.status === "reveal") {
      out.reveal = { rubric: q.rubric, points: q.points, answers: Object.values(players).map((p) => publicAnswer(currentAnswers[p.id], p)).filter(Boolean).sort((a, b) => (b.points || 0) - (a.points || 0)) };
    }
  }

  if (room.mode === "race" && (room.status === "playing" || room.status === "finished")) {
    const q = room.questions[qIndex];
    out.round = { index: qIndex, startedAt: Number(await store.hget(K.progress(c) + ":t", playerId) || room.round.startedAt), endsAt: null };
    if (q) out.question = { index: q.index, difficulty: q.difficulty, label: q.label, prompt: q.prompt, total: n };
    const last = qIndex > 0 ? await hgetJson(K.answers(c, qIndex - 1), playerId) : null;
    out.lastGraded = last ? { ...publicAnswer(last, me), prompt: room.questions[qIndex - 1].prompt, rubric: room.questions[qIndex - 1].rubric, points_ref: room.questions[qIndex - 1].points } : null;
    out.finishedMine = qIndex >= n;
  }

  if (room.status === "finished") {
    out.summary = await Promise.all(room.questions.map(async (q, i) => {
      const answers = await hgetallJson(K.answers(c, i));
      return { index: i, label: q.label, prompt: q.prompt, rubric: q.rubric, points: q.points, answers: Object.values(players).map((p) => publicAnswer(answers[p.id], p)).filter(Boolean).sort((a, b) => (b.points || 0) - (a.points || 0)) };
    }));
  }
  return out;
}
