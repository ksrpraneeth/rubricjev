// Local dev server, zero dependencies. Run with: node --env-file=.env server.js
// On Vercel the same logic runs from api/*.js.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { grade, validate, publicQuestions } from "./lib/grade.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.JEV_API_KEY;
if (!API_KEY) { console.error("JEV_API_KEY is missing. Run: node --env-file=.env server.js"); process.exit(1); }

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const send = (res, status, payload, type = "application/json") => {
  res.writeHead(status, { "Content-Type": type });
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
    if (req.method === "GET" && url.pathname === "/api/questions") return send(res, 200, publicQuestions(url.searchParams.get("set")));
    if (req.method === "POST" && url.pathname === "/api/grade") {
      const v = validate(await readJson(req));
      if (v.error) return send(res, v.status, { error: v.error });
      return send(res, 200, await grade(v.q, v.text, API_KEY));
    }
    let file = url.pathname === "/" ? "/index.html" : url.pathname;
    const full = path.join(__dirname, "public", path.normalize(file));
    if (!full.startsWith(path.join(__dirname, "public"))) return send(res, 403, "Forbidden", "text/plain");
    try { return send(res, 200, await readFile(full), MIME[path.extname(full)] || "application/octet-stream"); }
    catch { return send(res, 404, "Not found", "text/plain"); }
  } catch (err) { console.error(err); return send(res, 500, { error: err.message }); }
}).listen(PORT, () => console.log(`Rubric grader running at http://localhost:${PORT}`));
