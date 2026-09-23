import "../../lib/quiet.js";
import { runAction, errorStatus } from "../../lib/actions.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const len = Number(req.headers["content-length"] || 0);
  if (len > 16000) return res.status(413).json({ error: "That was too long." });
  const key = process.env.TEST_KEY;
  // Test runs tag themselves with the secret test key, as a header (API bots) or a cookie (browser bots).
  const cookieKey = (String(req.headers.cookie || "").match(/(?:^|;\s*)fc_test=([^;]+)/) || [])[1];
  const isTest = !!key && key.length >= 24 && (req.headers["x-fc-test"] === key || cookieKey === key);
  const ip = isTest ? "test-runner" : String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  try {
    // Beacons arrive as text/plain JSON.
    let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== "object") body = {};
    res.status(200).json(await runAction(String(req.query.action || ""), body, ip, { gpc: req.headers["sec-gpc"] === "1" }));
  } catch (err) {
    const status = errorStatus(err);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 && !err.status ? "Something went wrong. Try again." : err.message });
  }
}
