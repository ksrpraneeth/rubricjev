// Key-value store: Upstash Redis in production, in-memory for local dev.
// Values are always JSON strings so both backends behave identically.
import { Redis } from "@upstash/redis";
import { EventEmitter } from "node:events";

const TTL = 60 * 60 * 24; // rooms live 24h

function memoryStore() {
  const kv = new Map(), hashes = new Map(), sets = new Map(), lists = new Map(), bus = new EventEmitter();
  bus.setMaxListeners(0);
  console.warn("[store] No Upstash env vars found. Using in-memory store (single process only).");
  return {
    kind: "memory",
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async set(k, v, opts = {}) { if (opts.nx && kv.has(k)) return null; kv.set(k, v); return "OK"; },
    async del(...ks) { for (const k of ks) { kv.delete(k); hashes.delete(k); } },
    async hset(k, field, v) { if (!hashes.has(k)) hashes.set(k, new Map()); hashes.get(k).set(field, v); },
    async hget(k, field) { return hashes.get(k)?.get(field) ?? null; },
    async hgetall(k) { return Object.fromEntries(hashes.get(k) || []); },
    async hincrby(k, field, n) { if (!hashes.has(k)) hashes.set(k, new Map()); const h = hashes.get(k); const v = Number(h.get(field) || 0) + n; h.set(field, String(v)); return v; },
    async hdel(k, ...fields) { const h = hashes.get(k); if (h) for (const f of fields) h.delete(f); },
    async publish(ch, msg) { bus.emit(ch, msg); },
    async subscribe(ch, fn, onLive) { bus.on(ch, fn); setTimeout(() => onLive?.(), 0); return async () => bus.off(ch, fn); },
    async expire() {},
    async pfadd(k, ...els) { if (!sets.has(k)) sets.set(k, new Set()); for (const e of els) sets.get(k).add(e); return 1; },
    async pfcount(k) { return sets.get(k)?.size || 0; },
    async rpush(k, ...vals) { if (!lists.has(k)) lists.set(k, []); lists.get(k).push(...vals); return lists.get(k).length; },
    async lrange(k, a, b) { const l = lists.get(k) || []; return l.slice(a, b < 0 ? undefined : b + 1); },
    async llen(k) { return (lists.get(k) || []).length; },
    async ltrim(k, a, b) { const l = lists.get(k) || []; const n = l.length, i = a < 0 ? Math.max(0, n + a) : a, j = b < 0 ? n + b : b; lists.set(k, l.slice(i, j + 1)); },
    // Runs several commands in order; returns their results. Mirrors the Upstash pipeline below.
    async batch(ops) { const out = []; for (const [cmd, ...args] of ops) out.push(await this[cmd](...args)); return out; },
  };
}

function upstashStore() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
    automaticDeserialization: false,
  });
  return {
    kind: "upstash",
    get: (k) => redis.get(k),
    set: (k, v, opts = {}) => redis.set(k, v, { ...(opts.nx ? { nx: true } : {}), ex: opts.ex || TTL }),
    del: (...ks) => redis.del(...ks),
    hset: (k, field, v) => redis.hset(k, { [field]: v }),
    hget: (k, field) => redis.hget(k, field),
    // With automaticDeserialization off, hgetall returns a flat [field, value, ...] array.
    hgetall: async (k) => { const r = await redis.hgetall(k); if (!r) return {}; if (Array.isArray(r)) { const o = {}; for (let i = 0; i < r.length; i += 2) o[r[i]] = r[i + 1]; return o; } return r; },
    hincrby: (k, field, n) => redis.hincrby(k, field, n),
    hdel: (k, ...fields) => (fields.length ? redis.hdel(k, ...fields) : 0),
    publish: (ch, msg) => redis.publish(ch, msg),
    // Streams messages over Upstash's REST pub/sub. Resolves once the subscription is live.
    async subscribe(ch, fn, onLive) {
      const sub = redis.subscribe([ch]);
      sub.on("message", ({ message }) => fn(typeof message === "string" ? message : JSON.stringify(message)));
      sub.on("error", (e) => console.error("subscribe", e?.message));
      // resolve as soon as the subscription is confirmed (or after 1.5s); tell the caller when it is truly live
      await new Promise((res) => { let done = false; const ok = () => { if (!done) { done = true; res(); } }; sub.on("subscribe", () => { ok(); onLive?.(); }); setTimeout(ok, 1500); });
      return () => sub.unsubscribe().catch(() => {});
    },
    expire: (k, ttl) => redis.expire(k, ttl || TTL),
    pfadd: (k, ...els) => redis.pfadd(k, ...els),
    pfcount: (k) => redis.pfcount(k),
    rpush: (k, ...vals) => redis.rpush(k, ...vals),
    lrange: (k, a, b) => redis.lrange(k, a, b),
    llen: (k) => redis.llen(k),
    ltrim: (k, a, b) => redis.ltrim(k, a, b),
    // Several commands in one HTTP round trip (analytics writes use this to stay cheap).
    async batch(ops) { if (!ops.length) return []; const p = redis.pipeline(); for (const [cmd, ...args] of ops) p[cmd](...args); return p.exec(); },
  };
}

const hasUpstash = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) && (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);
export const store = hasUpstash && process.env.STORE !== "memory" ? upstashStore() : memoryStore();

// JSON helpers
export const getJson = async (k) => { const v = await store.get(k); return v == null ? null : JSON.parse(v); };
export const setJson = (k, obj, opts) => store.set(k, JSON.stringify(obj), opts);
export const hsetJson = (k, f, obj) => store.hset(k, f, JSON.stringify(obj));
export const hgetJson = async (k, f) => { const v = await store.hget(k, f); return v == null ? null : JSON.parse(v); };
export const hgetallJson = async (k) => { const h = await store.hgetall(k); const out = {}; for (const [f, v] of Object.entries(h)) out[f] = JSON.parse(v); return out; };
