// Local analytics report, read straight from the production store. Nothing is served publicly.
//   node --env-file=.env --env-file=.env.local tools/stats.mjs [days]            totals, funnels, breakdowns
//   node --env-file=.env --env-file=.env.local tools/stats.mjs journeys [day]    journey paths for a day (IST date)
//        add an output path to also save that day's raw events as NDJSON, e.g. ... journeys 2026-09-24 jl.ndjson
//   node --env-file=.env --env-file=.env.local tools/stats.mjs bank [topic]           question bank: topics, or one topic's questions
//   node --env-file=.env --env-file=.env.local tools/stats.mjs bank-export bank.ndjson  every question with its stats and answer samples
import { writeFileSync } from "node:fs";
import { readStats, statsDay } from "../lib/stats.js";
import { readJourneys } from "../lib/journey.js";
import { store } from "../lib/store.js";
import { topicKey } from "../lib/bank.js";

const COST_PER_LADDER = 0.034; // measured GPT cost of one 8-question set, in US dollars
const [mode, arg, out] = process.argv.slice(2);
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "-");
const bar = (n, max) => "#".repeat(max ? Math.max(n ? 1 : 0, Math.round((24 * n) / max)) : 0);

if (mode === "journeys") await journeys(arg || statsDay(), out);
else if (mode === "bank") await bank(arg);
else if (mode === "bank-export") await bankExport(arg || "bank.ndjson");
else await report(Number(mode) || 14);
process.exit(0);

async function report(days) {
  const rows = await readStats(days);
  const sum = {}; for (const r of rows) for (const [k, v] of Object.entries(r.counts)) sum[k] = (sum[k] || 0) + v;
  const g = (k) => sum[k] || 0;
  const dims = (event, dim) => Object.entries(sum).filter(([k]) => k.startsWith(`${event}|${dim}=`)).map(([k, v]) => [k.split("=")[1], v]).sort((a, b) => b[1] - a[1]);
  const avgUnique = (k) => Math.round(rows.reduce((a, r) => a + r.uniques[k], 0) / rows.length);

  console.log(`\nFactClash, last ${days} days (${rows[0].day} to ${rows.at(-1).day}, IST)\n`);
  console.log(`Visits ${g("visit")}   Unique players/day ${avgUnique("players")}   Hosts/day ${avgUnique("hosts")}   Daily players/day ${avgUnique("daily")}`);

  console.log(`\nHOST FUNNEL`);
  for (const [k, label] of [["visit", "visits"], ["room_created", "rooms created"], ["game_started", "games started"], ["game_finished", "games finished"], ["rematch", "rematches"]]) console.log(`  ${label.padEnd(18)} ${String(g(k)).padStart(6)}  ${pct(g(k), g("visit"))}`);
  console.log(`  players per game   ${(g("game_players") / (g("game_started") || 1)).toFixed(1)}`);

  console.log(`\nINVITES`);
  console.log(`  links posted in chats (previews) ${g("link_preview")}`);
  console.log(`  invite links opened              ${g("invite_open")}`);
  console.log(`  joins                            ${g("join")}   (rejoins ${g("rejoin")})   join rate ${pct(g("join"), g("invite_open"))}`);
  for (const [v, n] of dims("join", "via")) console.log(`    via ${v.padEnd(14)} ${String(n).padStart(5)} ${bar(n, g("join"))}`);

  console.log(`\nSHARES ${g("share")}`);
  for (const [v, n] of dims("share", "ch")) console.log(`  channel ${v.padEnd(10)} ${String(n).padStart(5)} ${bar(n, g("share"))}`);
  for (const [v, n] of dims("share", "ctx")) console.log(`  from ${v.padEnd(13)} ${String(n).padStart(5)} ${bar(n, g("share"))}`);
  console.log(`  invite opens by channel: ${dims("invite_open", "v").map(([v, n]) => `${v} ${n}`).join(", ") || "-"}`);

  console.log(`\nDAILY CLASH`);
  console.log(`  opened ${g("daily_open")}   started ${g("daily_start")}   finished ${g("daily_finish")} (${pct(g("daily_finish"), g("daily_start"))})`);
  for (const [v, n] of dims("daily_start", "ret")) console.log(`  ${v.padEnd(10)} ${String(n).padStart(5)}  ${pct(n, g("daily_start"))}`);
  console.log(`  streaks: ${dims("daily_start", "streak").map(([v, n]) => `${v} days ${n}`).join(", ") || "-"}`);

  console.log(`\nRETURN VISITS (from journey sessions)`);
  for (const [v, n] of dims("session", "returning")) console.log(`  ${v.padEnd(12)} ${String(n).padStart(5)}  ${pct(n, g("session"))}`);

  console.log(`\nSOURCES (visits)`);
  for (const [v, n] of dims("visit", "src").slice(0, 15)) console.log(`  ${v.padEnd(28)} ${String(n).padStart(5)} ${bar(n, g("visit"))}`);
  console.log(`  rooms created by source: ${dims("room_created", "src").slice(0, 8).map(([v, n]) => `${v} ${n}`).join(", ") || "-"}`);

  console.log(`\nGAMES: ${dims("game_started", "mode").map(([v, n]) => `${v} ${n}`).join(", ")} | sizes ${dims("game_started", "size").map(([v, n]) => `${v}p ${n}`).join(", ")} | started before questions were ready ${dims("game_started", "prep").find(([v]) => v === "waited")?.[1] || 0}`);
  console.log(`CHALLENGES: made ${g("challenge_created")}, opened ${g("challenge_open")}, played ${g("challenge_start")}, finished ${g("challenge_finish")}`);
  console.log(`QUESTIONS: built ${g("ladder_built")} (about $${(g("ladder_built") * COST_PER_LADDER).toFixed(2)})   failed ${g("ladder_failed")} ${dims("ladder_failed", "why").map(([v, n]) => `${v} ${n}`).join(", ")}`);
  const today = statsDay(), built = Number(await store.hget(`gen:${today}`, "n")) || 0, cap = Number(process.env.GEN_DAILY_CAP || 2000);
  console.log(`SPEND GUARD today: ${built} of ${cap} question sets (${pct(built, cap)})`);

  console.log(`\nDAY          visits  rooms  games  finished  joins  shares  daily  players`);
  for (const r of rows) { const c = r.counts; console.log(`${r.day}  ${[c.visit, c.room_created, c.game_started, c.game_finished, c.join, c.share, c.daily_start, r.uniques.players].map((x) => String(x || 0).padStart(6)).join("  ")}`); }
}

async function journeys(day, outPath) {
  const total = Number(await store.llen(`jl:${day}`)) || 0;
  const events = [];
  for (let start = 0; start < total; start += 5000) events.push(...(await readJourneys(day, start, 5000)));
  if (outPath) { writeFileSync(outPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n"); console.log(`saved ${events.length} events to ${outPath}`); }
  const sessions = new Map();
  for (const e of events) { if (!sessions.has(e.s)) sessions.set(e.s, []); sessions.get(e.s).push(e); }
  for (const list of sessions.values()) list.sort((a, b) => a.t - b.t);
  const players = new Set(events.map((e) => e.j).filter(Boolean));
  console.log(`\nJourneys on ${day}: ${events.length} steps, ${sessions.size} visits, ${players.size} players`);

  // Paths: the order of meaningful steps in each visit, repeats collapsed.
  const KEY = new Set(["land", "intro", "hub", "host_open", "create", "join_open", "join", "start", "finish", "share", "rematch", "leave", "daily_open", "daily_start", "daily_finish", "challenge_open", "kicked", "error"]);
  const paths = {};
  for (const list of sessions.values()) { const p = []; for (const e of list) if (KEY.has(e.e) && p.at(-1) !== e.e) p.push(e.e); const k = p.join(" > "); paths[k] = (paths[k] || 0) + 1; }
  console.log(`\nTOP PATHS`);
  for (const [k, n] of Object.entries(paths).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(4)}  ${k}`);

  // What people do right after finishing a game: the hook that brings the next game.
  const after = {};
  for (const list of sessions.values()) list.forEach((e, i) => { if (e.e === "finish") { const next = list.slice(i + 1).find((x) => !["reveal", "hidden"].includes(x.e)); const k = next ? next.e : "nothing (left)"; after[k] = (after[k] || 0) + 1; } });
  const fin = Object.values(after).reduce((a, b) => a + b, 0);
  console.log(`\nAFTER A GAME ENDS (${fin} finishes)`);
  for (const [k, n] of Object.entries(after).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${String(n).padStart(4)}  ${pct(n, fin)}`);

  // Time from landing to the first game starting or first Daily question.
  const ttf = [];
  for (const list of sessions.values()) { const land = list.find((e) => e.e === "land"), go = list.find((e) => ["start", "answer", "daily_start"].includes(e.e)); if (land && go) ttf.push((go.t - land.t) / 1000); }
  ttf.sort((a, b) => a - b);
  if (ttf.length) console.log(`\nTIME TO FIRST PLAY: median ${Math.round(ttf[Math.floor(ttf.length / 2)])}s, 90% under ${Math.round(ttf[Math.floor(ttf.length * 0.9)])}s (${ttf.length} visits)`);

  // Where answers score, by position in the game: a difficulty curve that is too steep loses people.
  const byQ = {};
  for (const e of events) if (e.e === "reveal" && e.p?.q != null) { const b = (byQ[e.p.q] ||= { n: 0, pts: 0, zero: 0 }); b.n++; b.pts += e.p.pts || 0; if (!e.p.pts) b.zero++; }
  if (Object.keys(byQ).length) { console.log(`\nSCORES BY QUESTION`); for (const [q, b] of Object.entries(byQ)) console.log(`  Q${Number(q) + 1}  avg ${Math.round(b.pts / b.n)} pts  zero ${pct(b.zero, b.n)}  (${b.n})`); }

  const gaps = events.filter((e) => e.e === "session" && e.p?.returning);
  if (gaps.length) console.log(`\nRETURNING VISITS: ${gaps.length}, gap in days: ${Object.entries(gaps.reduce((m, e) => ((m[e.p.gap] = (m[e.p.gap] || 0) + 1), m), {})).map(([g, n]) => `${g}d ${n}`).join(", ")}`);
  const errs = events.filter((e) => e.e === "error");
  if (errs.length) console.log(`\nERRORS PLAYERS SAW: ${Object.entries(errs.reduce((m, e) => { const k = `${e.p?.where}: ${e.p?.msg}`; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${n}x ${k}`).join(" | ")}`);
}

// ---- question bank ----
async function loadQuestion(id, withSamples = false) {
  const [q, st, samples] = await Promise.all([store.get(`qb:q:${id}`), store.hgetall(`qb:s:${id}`), withSamples ? store.lrange(`qb:a:${id}`, 0, -1) : []]);
  if (!q) return null;
  const n = {}; for (const [k, v] of Object.entries(st || {})) n[k] = Number(v) || 0;
  const a = n.answered || 0;
  return { ...JSON.parse(q), stats: { asked: a + (n.skipped || 0), answered: a, avgPts: a ? Math.round(n.pts / a) : null, avgCov: a ? Math.round(n.cov100 / a) : null, zero: a ? (n.zero || 0) / a : null, good: a ? (n.good || 0) / a : null, myth: a ? (n.myth || 0) / a : null, skipped: n.skipped || 0, avgSec: n.timed ? Math.round(n.ms / n.timed / 1000) : null }, samples: samples.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean) };
}
async function allIds(tk) { return Object.keys((await store.hgetall(`qb:t:${tk}`)) || {}); }
function fmtQ(q) { return `${(q.label || "").padEnd(8)} asked ${String(q.stats.asked).padStart(4)}  avg ${String(q.stats.avgPts ?? "-").padStart(4)} pts  zero ${q.stats.zero == null ? "  -" : pct(q.stats.zero * 100, 100).padStart(4)}  myth ${q.stats.myth == null ? "  -" : pct(q.stats.myth * 100, 100).padStart(4)}  skip ${String(q.stats.skipped).padStart(3)}  ${q.stats.avgSec != null ? q.stats.avgSec + "s" : ""}\n           ${q.prompt}`; }

async function bank(topic) {
  if (topic) {
    const ids = await allIds(topicKey(topic));
    const qs = (await Promise.all(ids.map((id) => loadQuestion(id, true)))).filter(Boolean).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
    console.log(`\n${qs.length} questions on "${topic}"\n`);
    for (const q of qs) {
      console.log(fmtQ(q));
      console.log(`           key: ${(q.points || []).join("; ")}`);
      for (const smp of q.samples.slice(-3)) console.log(`           > ${smp.pts} pts  "${smp.t}"`);
      console.log("");
    }
    return;
  }
  const topics = Object.entries((await store.hgetall("qb:topics")) || {}).map(([k, v]) => [k, Number(v)]).sort((a, b) => b[1] - a[1]);
  console.log(`\nQUESTION BANK: ${topics.length} topics, ${topics.reduce((a, [, v]) => a + v, 0)} questions written`);
  for (const [t, n] of topics.slice(0, 25)) console.log(`  ${String(n).padStart(5)}  ${t}`);
  // Questions that need attention: most players score zero, many fall for a myth, or many run out of time.
  const ids = (await Promise.all(topics.slice(0, 200).map(([t]) => allIds(t)))).flat();
  const qs = (await Promise.all(ids.map((id) => loadQuestion(id)))).filter((q) => q && q.stats.answered >= 5);
  const worst = qs.filter((q) => q.stats.zero >= 0.6 || q.stats.myth >= 0.3 || q.stats.skipped >= q.stats.answered).sort((a, b) => b.stats.zero - a.stats.zero).slice(0, 15);
  console.log(`\nNEEDS A LOOK (answered 5+ times; zero rate 60%+, myth 30%+, or skipped as often as answered): ${worst.length}`);
  for (const q of worst) console.log(`  [${q.topic}] ${fmtQ(q)}`);
  const best = qs.filter((q) => q.stats.good >= 0.3 && q.stats.zero <= 0.3).sort((a, b) => b.stats.asked - a.stats.asked).slice(0, 10);
  console.log(`\nWORKING WELL (most played, fair scoring): ${best.length}`);
  for (const q of best) console.log(`  [${q.topic}] ${fmtQ(q)}`);
}

async function bankExport(outPath) {
  const topics = Object.keys((await store.hgetall("qb:topics")) || {});
  const lines = [];
  for (const t of topics) for (const id of await allIds(t)) { const q = await loadQuestion(id, true); if (q) lines.push(JSON.stringify(q)); }
  writeFileSync(outPath, lines.join("\n") + (lines.length ? "\n" : ""));
  console.log(`saved ${lines.length} questions from ${topics.length} topics to ${outPath}`);
}
