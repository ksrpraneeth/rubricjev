// First-party, cookie-free usage statistics. Everything is an aggregate daily count in our own store:
// no cookies, no advertising ids, nothing new stored on the player's device, no third parties.
// Unique players are estimated with HyperLogLog sketches of salted hashes, so raw ids are never kept.
// Test traffic, players who opt out in the app, and browsers sending Global Privacy Control are not counted.
import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { store } from "./store.js";

const KEEP = 400 * 86400; // about 13 months
const IST_MS = 5.5 * 3600000;
export const statsDay = (t = Date.now()) => new Date(t + IST_MS).toISOString().slice(0, 10); // same calendar as the Daily Clash
const SALT = process.env.HASH_SALT || process.env.CRON_SECRET || "factclash-local";
export const hashId = (s) => createHash("sha256").update(`${SALT}:${s}`).digest("hex").slice(0, 20);

// Per-request switch: runAction and the page routes set { off: true } for tests and opted-out players.
export const statsScope = new AsyncLocalStorage();
const off = () => !!statsScope.getStore()?.off;
export const statsOff = off;
export const isTestTraffic = () => !!statsScope.getStore()?.test;

// Dimension values are short, lower-case and limited to a safe alphabet so nobody can flood the store.
const clean = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9_.:/-]/g, "").slice(0, 40) || "none";

// The hash fields one count touches: "share", "share|ch=wa", "share|ctx=lobby".
export const countFields = (event, dims = {}) => [event, ...Object.entries(dims).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${event}|${k}=${clean(v)}`)];
export const statsKey = () => `st:${statsDay()}`;
export const STATS_KEEP = KEEP;

// track("share", { ch: "wa", ctx: "lobby" }) adds n to each field for today, in one pipelined write.
export async function track(event, dims = {}, n = 1) {
  if (off()) return;
  try { const key = statsKey(); await store.batch([...countFields(event, dims).map((f) => ["hincrby", key, f, n]), ["expire", key, KEEP]]); }
  catch (e) { console.error("track", e?.message); }
}

// Unique players per day (estimated). `who` is the app's random device id, hashed before it is counted.
export async function unique(bucket, who) {
  if (off() || !who) return;
  try { const key = `stu:${statsDay()}:${bucket}`; await store.batch([["pfadd", key, hashId(who)], ["expire", key, KEEP]]); }
  catch (e) { console.error("unique", e?.message); }
}

// Link-preview fetchers from chat apps: counted as "previews" (a sign links were posted), never as visits.
export const BOT_UA = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|twitter|linkedin|embedly|skype|vkshare|pinterest|google-inspectiontool|headless/i;

// Dashboard read: one hash and three sketches per day.
export async function readStats(days = 30) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = statsDay(Date.now() - i * 86400000);
    const [counts, players, daily, hosts] = await Promise.all([
      store.hgetall(`st:${day}`),
      store.pfcount(`stu:${day}:players`), store.pfcount(`stu:${day}:daily`), store.pfcount(`stu:${day}:hosts`),
    ]);
    const c = {}; for (const [k, v] of Object.entries(counts || {})) c[k] = Number(v) || 0;
    out.push({ day, counts: c, uniques: { players: Number(players) || 0, daily: Number(daily) || 0, hosts: Number(hosts) || 0 } });
  }
  return out;
}
