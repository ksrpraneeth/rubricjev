import { grade, validate } from "../lib/grade.js";
import { store } from "../lib/store.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const ip = String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const slot = `rate:practice:${Math.floor(Date.now() / 3600000)}`;
  const n = await store.hincrby(slot, ip, 1);
  if (n === 1) await store.expire(slot, 3600);
  if (n > 300) return res.status(429).json({ error: "Slow down a little and try again soon." });
  const v = validate(req.body);
  if (v.error) return res.status(v.status).json({ error: v.error });
  try { res.status(200).json(await grade(v.q, v.text.slice(0, 1000), process.env.JEV_API_KEY)); }
  catch (err) { console.error(err); res.status(502).json({ error: "Grading is busy. Try again in a moment." }); }
}
