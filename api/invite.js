import "../lib/quiet.js";
import { renderInvite } from "../lib/invite.js";
import { SECURITY_HEADERS } from "../lib/headers.js";
import { statsScope } from "../lib/stats.js";
export default async function handler(req, res) {
  const origin = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const test = !!process.env.TEST_KEY && String(req.headers.cookie || "").includes(`fc_test=${process.env.TEST_KEY}`);
  const off = test || req.headers["sec-gpc"] === "1";
  const html = await statsScope.run({ off, test }, () => renderInvite(req.query || {}, origin, { ua: req.headers["user-agent"] }));
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.status(200).end(html);
}
