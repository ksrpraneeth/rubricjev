import { grade, validate } from "../lib/grade.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const apiKey = process.env.JEV_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "JEV_API_KEY is not configured" });
  const v = validate(req.body);
  if (v.error) return res.status(v.status).json({ error: v.error });
  try {
    res.status(200).json(await grade(v.q, v.text, apiKey));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message });
  }
}
