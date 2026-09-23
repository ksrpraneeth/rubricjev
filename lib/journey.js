// Player journey logs: the steps people take (landed, hosted, joined, finished, shared, came back) so we can
// see what brings them back. Pseudonymous: a journey id is a one-way hash of the app's random device id, and
// no names, answers or contact details are ever logged. Kept for 60 days. Opted-out players, Global Privacy
// Control and test traffic are never logged (the caller's stats scope decides).
import { store } from "./store.js";
import { statsDay, statsOff, hashId, countFields, STATS_KEEP } from "./stats.js";

const KEEP = 60 * 86400;
const DAILY_CAP = 400000; // events per day; beyond this new batches are dropped rather than growing the store
const MAX_BATCH = 50;

// Every step the page may log, with the properties it may carry. Anything else is dropped.
export const STEPS = {
  land: ["kind", "src", "newbie"], intro: ["step"], hub: [], host_open: [], join_open: ["via"],
  create: ["mode", "n", "sec"], join: ["via", "late"], lobby: ["size"], start: ["size", "mode", "waited"],
  answer: ["q", "label", "pts", "cov", "ms", "boost", "myth"], reveal: ["q", "rank", "pts"], finish: ["rank", "size", "score", "mode"],
  share: ["ch", "ctx"], rematch: ["topic"], leave: ["at"], kicked: [], challenge_open: [], challenge_make: [],
  daily_open: [], daily_start: [], daily_answer: ["q", "pts", "cov"], daily_finish: ["score", "rank", "streak"],
  card: ["ctx"], profile: [], settings: ["what"], error: ["where", "msg"], hidden: ["screen"], back: ["screen"],
};
const val = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : typeof v === "boolean" ? v : String(v ?? "").replace(/[^\w .:/-]/g, "").slice(0, 60));

// Steps that also feed the daily counters, so the page never needs a separate request to count them.
const COUNTED = { land: ["visit", ["kind", "src"]], share: ["share", ["ch", "ctx"]] };
let capped = { day: null, hit: false }; // remembered per server instance, so a capped day costs no extra reads

// One upload per batch of steps: at most one read (the first batch of a visit) and one pipelined write.
export async function logJourney({ sid, device, first, topic, events }) {
  if (statsOff() || !Array.isArray(events) || !events.length) return { ok: true, logged: 0 };
  const day = statsDay(), key = `jl:${day}`, skey = `st:${day}`;
  if (capped.day === day && capped.hit) return { ok: true, logged: 0, capped: true };
  const s = String(sid || "").replace(/[^a-z0-9]/gi, "").slice(0, 16) || "anon";
  const dev = String(device || "").replace(/[^a-z0-9]/gi, "").slice(0, 32);
  const j = dev.length >= 12 ? hashId(`journey:${dev}`) : null;
  const t0 = Date.now(), rows = [], counts = {};
  const count = (event, dims) => { for (const f of countFields(event, dims)) counts[f] = (counts[f] || 0) + 1; };
  const ops = [];
  // The first batch of a visit says how long it has been since this player was last here.
  if (first && j) {
    const last = await store.get(`jlast:${j}`);
    const gap = last ? Math.round((Date.parse(day) - Date.parse(last)) / 86400000) : null;
    rows.push({ t: t0, s, j, e: "session", p: { gap, returning: last != null } });
    ops.push(["set", `jlast:${j}`, day, { ex: 90 * 86400 }]);
    count("session", { returning: last == null ? "new" : gap === 0 ? "same-day" : gap === 1 ? "next-day" : gap <= 7 ? "within-week" : "later" });
  }
  for (const ev of events.slice(0, MAX_BATCH)) {
    const allowed = STEPS[ev?.e]; if (!allowed) continue;
    // Phone clocks can be off; a time more than a day away is replaced by the server's.
    let t = Number(ev.t); if (!(t > t0 - 86400000 && t < t0 + 86400000)) t = t0;
    const p = {}; for (const k of allowed) if (ev[k] != null) p[k] = val(ev[k]);
    if (topic && ["create", "start", "finish", "rematch"].includes(ev.e)) p.topic = val(topic);
    rows.push({ t, s, j, e: ev.e, p });
    const c = COUNTED[ev.e]; if (c) count(c[0], Object.fromEntries(c[1].map((d) => [d, p[d]])));
  }
  if (!rows.length) return { ok: true, logged: 0 };
  ops.push(["rpush", key, ...rows.map((r) => JSON.stringify(r))], ["expire", key, KEEP],
    ["hincrby", skey, "journey_events", rows.length], ...Object.entries(counts).map(([f, n]) => ["hincrby", skey, f, n]), ["expire", skey, STATS_KEEP]);
  const res = await store.batch(ops);
  const total = Number(res[ops.findIndex((o) => o[0] === "hincrby" && o[2] === "journey_events")]) || 0;
  capped = { day, hit: total >= DAILY_CAP };
  return { ok: true, logged: rows.length };
}

// Export for analysis (dashboard and offline): one day's events, oldest first, in pages.
export async function readJourneys(day, start = 0, count = 5000) {
  const rows = await store.lrange(`jl:${day}`, start, start + count - 1);
  return rows.map((r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } }).filter(Boolean);
}
