import "../lib/quiet.js";
import { ensureDailies } from "../lib/solo.js";
// Vercel Cron calls this nightly with "Authorization: Bearer <CRON_SECRET>".
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "unauthorized" });
  res.status(200).json(await ensureDailies(process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY));
}
