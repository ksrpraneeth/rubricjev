import { runAction, errorStatus } from "../../lib/actions.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const len = Number(req.headers["content-length"] || 0);
  if (len > 16000) return res.status(413).json({ error: "That was too long." });
  const key = process.env.TEST_KEY;
  const isTest = !!key && key.length >= 24 && req.headers["x-fc-test"] === key;
  const ip = isTest ? "test-runner" : String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    res.status(200).json(await runAction(String(req.query.action || ""), body, ip));
  } catch (err) {
    const status = errorStatus(err);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 && !err.status ? "Something went wrong. Try again." : err.message });
  }
}
