// Link-preview image (1200x630 PNG) for WhatsApp, Telegram, iMessage, X. Rendered with @vercel/og.
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getJson, hgetallJson } from "./store.js";
import { dailyTopic, todayIST } from "./solo.js";

let fontData = null;
const font = async () => (fontData ||= await readFile(path.join(process.cwd(), "assets", "ArchivoBlack-Regular.ttf")));
const h = (type, style, ...children) => ({ type, props: { style, children: children.length <= 1 ? children[0] : children } });
const COLORS = ["#FFC83D", "#4F8CFF", "#34E39A", "#FF5C7A", "#B77CFF", "#FF9A3D", "#3DE0FF", "#FF6FC4", "#A6E35A", "#FFE066", "#7B8CFF", "#FF7F9F"];
const CAP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M9 47 5 19l14 11L32 11l13 19 14-11-4 28z" fill="#FFC83D"/><rect x="9" y="49" width="46" height="8" rx="3" fill="#E0A400"/><circle cx="32" cy="36" r="5" fill="#FF6FC4"/><circle cx="5" cy="18" r="3.6" fill="#FFC83D"/><circle cx="32" cy="10" r="3.6" fill="#FFC83D"/><circle cx="59" cy="18" r="3.6" fill="#FFC83D"/></svg>`;
const capImg = (size) => ({ type: "img", props: { src: `data:image/svg+xml;base64,${Buffer.from(CAP).toString("base64")}`, width: size, height: size } });
const initials = (n) => { const w = String(n || "?").trim().split(/\s+/); return ((w[0]?.[0] || "") + (w[1]?.[0] || w[0]?.[1] || "")).toUpperCase(); };

async function content(q) {
  if (q.room) {
    const room = await getJson(`room:${String(q.room).toUpperCase()}`);
    if (room?.code) {
      const players = Object.values(await hgetallJson(`room:${room.code}:players`)).sort((a, b) => a.joinedAt - b.joinedAt);
      const host = players.find((p) => p.id === room.hostId)?.name || "A friend";
      return { kicker: `${host} challenged you`, title: room.topic, line: `Room ${room.code}  ·  ${players.length} in the lobby  ·  Tap to join`, players };
    }
  }
  if (q.challenge) {
    const ch = await getJson(`challenge:${q.challenge}`);
    if (ch) {
      const board = Object.values(await hgetallJson(`challenge:${q.challenge}:board`)).sort((a, b) => b.total - a.total);
      const top = board[0];
      return { kicker: `${ch.host} dares you to beat them`, title: ch.topic, line: top ? `Score to beat: ${top.total} by ${top.name}` : "Same questions. Can you top the board?", players: board.slice(0, 6) };
    }
  }
  if (q.daily) return { kicker: "Today's Daily Clash", title: dailyTopic(todayIST()), line: "One topic. Same questions for everyone. Keep your streak.", players: [] };
  return { kicker: "The party game where the best answer wins", title: "Pick any topic. Prove you know it.", line: "Free. No download. Play with friends in 30 seconds.", players: [] };
}

export async function renderOg(q) {
  const c = await content(q);
  const titleSize = c.title.length > 34 ? 60 : c.title.length > 20 ? 76 : 96;
  const el = h("div", {
    width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px",
    backgroundColor: "#120A2A", backgroundImage: "radial-gradient(ellipse 70% 60% at 50% -10%, rgba(255,200,61,0.35), rgba(18,10,42,0) 70%), linear-gradient(180deg, #1E1146 0%, #120A2A 100%)",
    color: "#F6F1FF", fontFamily: "Archivo Black",
  },
    h("div", { display: "flex", alignItems: "center", gap: 18 }, capImg(64), h("div", { fontSize: 46, color: "#FFC83D", letterSpacing: 2 }, "FACTCLASH")),
    h("div", { display: "flex", flexDirection: "column", gap: 10 },
      h("div", { fontSize: 32, color: "#C9B8FF" }, c.kicker),
      h("div", { fontSize: titleSize, lineHeight: 1.05, color: "#FFFFFF", maxWidth: 1060 }, c.title)),
    h("div", { display: "flex", alignItems: "center", justifyContent: "space-between" },
      h("div", { fontSize: 28, color: "#FFC83D" }, c.line),
      h("div", { display: "flex", gap: 0 }, ...(c.players.length ? c.players.slice(0, 6).map((p, i) => h("div", { width: 64, height: 64, borderRadius: 32, marginLeft: i ? -14 : 0, border: "4px solid #120A2A", backgroundColor: COLORS[(p.avatar ?? i) % 12], color: "#140A2E", fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }, initials(p.name))) : [h("div", { fontSize: 26, color: "#8F80C4" }, "No cap. Just facts.")]))),
  );
  const svg = await satori(el, { width: 1200, height: 630, fonts: [{ name: "Archivo Black", data: await font(), weight: 400, style: "normal" }] });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}
