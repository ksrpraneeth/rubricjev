// Serves index.html with per-link Open Graph tags so shared links preview nicely in chat apps.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getJson, hgetallJson } from "./store.js";
import { dailyTopic, todayIST } from "./solo.js";
import { track, BOT_UA } from "./stats.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let cached = null;

// meta.ua: the requester's user agent. Chat apps fetch links to build previews: those count as "link_preview"
// (a sign the link was posted somewhere), people count as opens. q.v is the share channel tagged on the link.
export async function renderInvite(q, origin, meta = {}) {
  const kind = q.room ? "invite" : q.challenge ? "challenge" : q.daily ? "daily" : "home";
  const bot = BOT_UA.test(String(meta.ua || ""));
  await track(bot ? "link_preview" : `${kind}_open`, { kind: bot ? kind : undefined, v: q.v || "none" });
  const html = cached ||= await readFile(path.join(process.cwd(), "public", "index.html"), "utf8");
  let title = "FactClash: no cap, just facts", desc = "The party game where the best answer wins. Pick any topic, type the facts, and see who really knows it. Free, no download.", img = `${origin}/api/og`, url = origin;
  try {
    if (q.room) {
      const code = String(q.room).toUpperCase().slice(0, 4);
      const room = await getJson(`room:${code}`);
      if (room?.code) {
        const players = Object.values(await hgetallJson(`room:${code}:players`));
        const host = players.find((p) => p.id === room.hostId)?.name || "A friend";
        title = `${host} challenged you on ${room.topic}`;
        desc = `Join room ${code} on FactClash. ${players.length} in the lobby. No cap, just facts.`;
        img = `${origin}/api/og?room=${code}`; url = `${origin}/r/${code}`;
      }
    } else if (q.challenge) {
      const ch = await getJson(`challenge:${q.challenge}`);
      if (ch) {
        title = `${ch.host} dares you: ${ch.topic}`;
        desc = "Same questions they just played. Can you beat their score? No cap.";
        img = `${origin}/api/og?challenge=${encodeURIComponent(q.challenge)}`; url = `${origin}/c/${q.challenge}`;
      }
    } else if (q.daily) {
      title = `Daily Clash: ${dailyTopic(todayIST())}`;
      desc = "One topic a day, same questions for everyone. Keep your streak alive.";
      img = `${origin}/api/og?daily=1`; url = `${origin}/daily`;
    }
  } catch (e) { console.error("invite", e); }
  const tags = `<!--og-->
<meta property="og:type" content="website">
<meta property="og:site_name" content="FactClash">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<!--/og-->`;
  return html.replace(/<!--og-->[\s\S]*?<!--\/og-->/, tags);
}
