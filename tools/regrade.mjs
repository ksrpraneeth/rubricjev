// Re-grades a saved calibration file with the current grader and compares scores per answer style.
// Usage: node --env-file=.env tools/regrade.mjs calib.json
import { readFileSync } from "node:fs";
import { grade } from "../lib/grade.js";
import { scoreAnswer } from "../lib/game.js";
const rows = JSON.parse(readFileSync(process.argv[2], "utf8")).filter((r) => r.q);
const n = Math.max(...rows.map((r) => r.qi)) + 1;
const out = await Promise.all(rows.map(async (r) => {
  let result; try { result = await grade(r.q, r.text, process.env.JEV_API_KEY); } catch (e) { return { ...r, now: null }; }
  const s = scoreAnswer({ result, question: r.q, numQuestions: n, elapsedMs: 20000, limitMs: 45000, streak: 0, double: false });
  return { ...r, now: s.points, nowGate: result.gates?.wrong };
}));
const by = {}; for (const r of out) (by[r.who] ||= []).push(r);
console.log("style       n   zero% before -> now   avg pts before -> now");
for (const [who, rs] of Object.entries(by)) {
  const k = rs.length, z0 = rs.filter((r) => !r.pts).length, z1 = rs.filter((r) => !r.now).length;
  console.log(`${who.padEnd(10)} ${String(k).padStart(3)}   ${String(Math.round((100 * z0) / k)).padStart(4)}% -> ${String(Math.round((100 * z1) / k)).padStart(3)}%    ${(rs.reduce((a, r) => a + r.pts, 0) / k).toFixed(0).padStart(4)} -> ${(rs.reduce((a, r) => a + (r.now || 0), 0) / k).toFixed(0)}`);
}
for (const r of out.filter((r) => (!r.pts) !== (!r.now))) console.log(`\n${r.who}: ${r.pts} -> ${r.now}  [${r.t}] ${r.prompt.slice(0, 100)}\n   A: ${r.text.slice(0, 140)}  (gate ${r.nowGate})`);
