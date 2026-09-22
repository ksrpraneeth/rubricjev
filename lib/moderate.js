// Content safety for user-supplied text: room topics and player names.
// Uses the provider's free moderation endpoint, with a small local blocklist as a fallback.
const BLOCK = /\b(f+u+c+k+|sh[i1]t|b[i1]tch|c+u+n+t|n[i1]gg|f[a@]gg?ot|wh[o0]re|sl[u*]t|r[a@]pe|porn|nud(e|es)|s[e3]x|dick|pussy|chut|bhenchod|madarchod|chutiya|gandu|randi|behenchod|kamina|harami|terror|isis|nazi|hitler|suicide|kill yourself|kys)\b/i;

export function sanitizeLine(s, max) {
  return String(s ?? "").replace(/[\u0000-\u001f\u007f<>`{}\[\]\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

// Instant local check. Used on create/join so nobody waits.
export const isBlocked = (text) => BLOCK.test(String(text || ""));

// Deeper check. Run it in parallel with slow work (question generation) so it adds no delay.
export async function isUnsafe(text, apiKey) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (BLOCK.test(t)) return true;
  if (!apiKey) return false;
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST", signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: t }),
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const d = await res.json();
    return !!d.results?.[0]?.flagged;
  } catch { return false; } // fail open to the blocklist result on network trouble
}
