// Key-value store: Upstash Redis in production, in-memory for local dev.
// Values are always JSON strings so both backends behave identically.
import { Redis } from "@upstash/redis";

const TTL = 60 * 60 * 24; // rooms live 24h

function memoryStore() {
  const kv = new Map(), hashes = new Map();
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
    async expire() {},
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
    expire: (k) => redis.expire(k, TTL),
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
