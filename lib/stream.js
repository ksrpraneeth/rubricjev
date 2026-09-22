// Live room stream (Server-Sent Events over a POST). Each player holds one open response;
// the server pushes a fresh state whenever anything in the room changes, plus typing and
// reaction events as they happen. Clients fall back to polling if the stream cannot connect.
import { getState, notify, channel, touchPresence } from "./game.js";
import { store } from "./store.js";

const LIFE_MS = (Number(process.env.STREAM_SECONDS) || 250) * 1000;

export async function streamRoom(req, res, body, jevKey) {
  const { code, playerId, token } = body || {};
  const level = body?.level;
  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.write("retry: 700\n: open\n\n");
  let closed = false, busy = false, again = false, deadline = null, debounce = null, unsub = null;
  const send = (event, data) => { if (!closed) res.write(`${event ? `event: ${event}\n` : ""}data: ${JSON.stringify(data)}\n\n`); };
  const plan = (s) => {
    clearTimeout(deadline); let at = null;
    if (s.status === "playing" && s.mode !== "race" && s.round?.endsAt) at = s.round.endsAt + 2100;
    else if (s.status === "reveal" && s.revealAutoMs && s.round?.revealedAt) at = s.round.revealedAt + s.revealAutoMs + 100;
    else if (s.status === "playing" && s.mode === "race" && s.raceEndsAt) at = s.raceEndsAt + 200;
    if (at) deadline = setTimeout(push, Math.max(60, at - Date.now()));
  };
  async function push() {
    if (closed) return;
    if (busy) { again = true; return; }
    busy = true;
    try { const s = await getState({ code, playerId, token, level }, jevKey); send(null, s); plan(s); }
    catch (e) { send("gone", { error: e.message, status: e.status || 500 }); if (e.status === 403 || e.status === 404) end(); }
    finally { busy = false; if (again) { again = false; push(); } }
  }
  const hb = setInterval(() => { if (!closed) { res.write(": hb\n\n"); touchPresence(code, playerId).catch(() => {}); } }, 5000);
  const safety = setInterval(push, 20000);
  const life = setTimeout(() => { send("bye", {}); end(); }, LIFE_MS);
  function end() {
    if (closed) return; closed = true;
    clearInterval(hb); clearInterval(safety); clearTimeout(life); clearTimeout(deadline); clearTimeout(debounce);
    Promise.resolve(unsub?.()).catch(() => {});
    try { res.end(); } catch {}
  }
  req.on("close", end);
  try {
    unsub = await store.subscribe(channel(String(code || "").toUpperCase()), (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.k === "t") return send("typing", m);
      if (m.k === "e") return send("ev", m.ev);
      clearTimeout(debounce); debounce = setTimeout(push, 20);
    });
  } catch (e) { console.error("stream subscribe", e); }
  await push();
  // The pub/sub subscription can take a moment to go live; re-send once so nothing that happened meanwhile is missed.
  setTimeout(push, 1800);
}
