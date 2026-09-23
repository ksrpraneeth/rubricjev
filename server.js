// Local dev server, zero dependencies. Run with: node --env-file=.env server.js
// On Vercel the same logic runs from api/*.js.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { grade, validate, publicQuestions } from "./lib/grade.js";
import { runAction, errorStatus } from "./lib/actions.js";
import { renderOg } from "./lib/og.js";
import { renderInvite } from "./lib/invite.js";
import { SECURITY_HEADERS } from "./lib/headers.js";
import { streamRoom } from "./lib/stream.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.JEV_API_KEY;
if (!API_KEY) { console.error("JEV_API_KEY is missing. Run: node --env-file=.env server.js"); process.exit(1); }

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };
const PAGES = { "/privacy": "/privacy.html", "/terms": "/terms.html", "/cookies": "/cookies.html" };
const send = (res, status, payload, type = "application/json") => {
  res.writeHead(status, { "Content-Type": type, ...SECURITY_HEADERS, "Cache-Control": "no-cache" });
  res.end(type.startsWith("application/json") ? JSON.stringify(payload) : payload);
};
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 50_000) throw new Error("Body too large"); }
  return JSON.parse(raw || "{}");
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const origin = `http://${req.headers.host}`;
    const inv = url.pathname.match(/^\/(r|c)\/([A-Za-z0-9]+)$/);
    if (inv || url.pathname === "/daily") {
      const q = inv ? (inv[1] === "r" ? { room: inv[2] } : { challenge: inv[2] }) : { daily: 1 };
      return send(res, 200, await renderInvite({ ...q, v: url.searchParams.get("v") }, origin, { ua: req.headers["user-agent"] }), "text/html; charset=utf-8");
    }
    if (url.pathname === "/api/stream" && req.method === "POST") return streamRoom(req, res, await readJson(req), API_KEY);
    if (url.pathname === "/api/og") { res.writeHead(200, { "Content-Type": "image/png" }); return res.end(await renderOg(Object.fromEntries(url.searchParams))); }
    const m = url.pathname.match(/^\/api\/room\/([a-z]+)$/);
    if (m && req.method === "POST") {
      try { return send(res, 200, await runAction(m[1], await readJson(req), req.socket.remoteAddress, { gpc: req.headers["sec-gpc"] === "1" })); }
      catch (err) { if (errorStatus(err) >= 500) console.error(err); return send(res, errorStatus(err), { error: err.message }); }
    }
    if (req.method === "GET" && url.pathname === "/api/questions") return send(res, 200, publicQuestions(url.searchParams.get("set")));
    if (req.method === "POST" && url.pathname === "/api/grade") {
      const v = validate(await readJson(req));
      if (v.error) return send(res, v.status, { error: v.error });
      return send(res, 200, await grade(v.q, v.text, API_KEY));
    }
    let file = url.pathname === "/" ? "/index.html" : PAGES[url.pathname] || url.pathname;
    const full = path.join(__dirname, "public", path.normalize(file));
    if (!full.startsWith(path.join(__dirname, "public"))) return send(res, 403, "Forbidden", "text/plain");
    try { return send(res, 200, await readFile(full), MIME[path.extname(full)] || "application/octet-stream"); }
    catch { return send(res, 404, "Not found", "text/plain"); }
  } catch (err) { console.error(err); return send(res, 500, { error: err.message }); }
}).listen(PORT, () => console.log(`Rubric grader running at http://localhost:${PORT}`));
