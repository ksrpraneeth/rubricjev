// Question bank: every question we write, how people did on it, and a few anonymous answer samples.
// Questions and totals hold no personal data. Answer samples are never linked to a nickname, device or room,
// are scrubbed of emails, phone numbers and links, capped at 50 per question and deleted after 90 days.
// Players who opt out of usage statistics (or send Global Privacy Control) are never sampled; tests are skipped.
import { createHash } from "node:crypto";
import { store } from "./store.js";
import { isTestTraffic } from "./stats.js";

const KEEP = 180 * 86400, SAMPLE_KEEP = 90 * 86400, SAMPLES = 50;
export const questionId = (prompt) => createHash("sha256").update(String(prompt).trim().toLowerCase()).digest("hex").slice(0, 16);
export const topicKey = (t) => String(t || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 60);

// Personal details sometimes end up in answers; keep the facts, drop the contact details.
export const scrub = (text) => String(text || "")
  .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
  .replace(/https?:\/\/\S+|www\.\S+/gi, "[link]")
  .replace(/\+?\d[\d\s().-]{6,}\d/g, "[number]")
  .replace(/@\w{2,}/g, "[handle]")
  .replace(/\s+/g, " ").trim().slice(0, 200);

// Called once per question set we build (rooms and the Daily Clash).
export async function bankAdd(topic, questions, source = "room") {
  if (isTestTraffic() || !questions?.length) return;
  try {
    const tk = topicKey(topic), now = Date.now(), ops = [];
    for (const q of questions) {
      const id = questionId(q.prompt);
      const rec = { id, topic, source, label: q.label, pos: q.index, of: questions.length, prompt: q.prompt, points: q.points, rubric: q.rubric, misconceptions: q.misconceptions, created: now };
      ops.push(["set", `qb:q:${id}`, JSON.stringify(rec), { nx: true, ex: KEEP }], ["hincrby", `qb:t:${tk}`, id, 1]);
    }
    ops.push(["expire", `qb:t:${tk}`, KEEP], ["hincrby", "qb:topics", tk, questions.length]);
    await store.batch(ops);
  } catch (e) { console.error("bankAdd", e?.message); }
}

// Called once per graded answer. `sample` is false for players who opted out.
export async function bankAnswer(q, graded, sample = true) {
  if (isTestTraffic() || !q?.prompt) return;
  try {
    const id = questionId(q.prompt), sk = `qb:s:${id}`, pts = Number(graded.points) || 0, cov = Number(graded.coverage) || 0;
    const ops = [["hincrby", sk, "answered", 1], ["hincrby", sk, "pts", Math.round(pts)], ["hincrby", sk, "cov100", Math.round(cov * 100)]];
    if (!pts) ops.push(["hincrby", sk, "zero", 1]);
    if (graded.good) ops.push(["hincrby", sk, "good", 1]);
    if (graded.misFired) ops.push(["hincrby", sk, "myth", 1]);
    if (graded.flag) ops.push(["hincrby", sk, "flagged", 1]);
    if (graded.ms != null) ops.push(["hincrby", sk, "ms", Math.round(graded.ms)], ["hincrby", sk, "timed", 1]);
    ops.push(["expire", sk, KEEP]);
    const text = sample && !graded.flag ? scrub(graded.text) : "";
    if (text) {
      const s = { t: text, pts, cov: Math.round(cov * 100) / 100, c: (graded.criteria || graded.result?.criteria || []).map((c) => Math.round((c.p ?? 0) * 100) / 100), at: Date.now() };
      ops.push(["rpush", `qb:a:${id}`, JSON.stringify(s)], ["ltrim", `qb:a:${id}`, -SAMPLES, -1], ["expire", `qb:a:${id}`, SAMPLE_KEEP]);
    }
    await store.batch(ops);
  } catch (e) { console.error("bankAnswer", e?.message); }
}

// A player was in the round but did not answer in time.
export async function bankSkip(q) {
  if (isTestTraffic() || !q?.prompt) return;
  try { const sk = `qb:s:${questionId(q.prompt)}`; await store.batch([["hincrby", sk, "skipped", 1], ["expire", sk, KEEP]]); }
  catch (e) { console.error("bankSkip", e?.message); }
}
