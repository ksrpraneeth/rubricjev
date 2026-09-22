import { renderInvite } from "../lib/invite.js";
import { SECURITY_HEADERS } from "../lib/headers.js";
export default async function handler(req, res) {
  const origin = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const html = await renderInvite(req.query || {}, origin);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.status(200).end(html);
}
