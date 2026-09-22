/* FactClash: no cap, just facts. */
"use strict";
(() => {
// =====================================================================
// utils
// =====================================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ini = (n) => { const w = String(n || "?").trim().split(/\s+/); return ((w[0]?.[0] || "") + (w[1]?.[0] || w[0]?.[1] || "")).toUpperCase(); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lvl = (p) => (p >= 0.7 ? "pass" : p >= 0.4 ? "part" : "miss");
const pct = (p) => Math.round((p || 0) * 100) + "%";
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const ORIGIN = location.origin;
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
const todayIST = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// =====================================================================
// icons (inline SVG, no emoji)
// =====================================================================
const I = {
  cap: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 47 5 19l14 11L32 11l13 19 14-11-4 28z" fill="currentColor"/><rect x="9" y="49" width="46" height="8" rx="3" fill="#E0A400"/><circle cx="32" cy="36" r="5" fill="#FF6FC4"/><circle cx="5" cy="18" r="3.6" fill="currentColor"/><circle cx="32" cy="10" r="3.6" fill="currentColor"/><circle cx="59" cy="18" r="3.6" fill="currentColor"/></svg>',
  capOnly: '<svg class="cap" viewBox="0 0 64 64" aria-hidden="true"><path d="M9 47 5 19l14 11L32 11l13 19 14-11-4 28z" fill="currentColor"/><rect x="9" y="49" width="46" height="8" rx="3" fill="#E0A400"/><circle cx="32" cy="36" r="5" fill="#FF6FC4"/><circle cx="5" cy="18" r="3.6" fill="currentColor"/><circle cx="32" cy="10" r="3.6" fill="currentColor"/><circle cx="59" cy="18" r="3.6" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  sfx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-5.9c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11 11 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.2-.2-.4-.3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
  crown: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><defs><linearGradient id="fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF4FA3"/><stop offset="1" stop-color="#FFC83D"/></linearGradient></defs><path fill="url(#fg)" d="M12 2c1 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.2 1.6 1 2.6 2 3 0-3.2-.6-6 .8-9.2z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5.1 4.8 1.3 7L12 17.8 5.8 21.2l1.3-7L2 9.4l7-.9z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5v-5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3 14.5a1.5 1.5 0 0 1 2.5-1.6L8 15"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></svg>',
  myth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/></svg>',
  smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5v.01M15 9.5v.01"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="16" cy="8" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="8" cy="16" r="1.4" fill="currentColor"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>',
  cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
};
const flame = (n) => (n >= 2 ? `<span class="flame">${I.flame}${n}</span>` : "");
const disc = (p, cls = "", ring = "") => `<span class="disc ${cls} ${p.away ? "away" : ""}" style="--c:var(--c${(p.avatar ?? 0) % 12})">${esc(ini(p.name))}${p.level > 1 && !cls.includes("sm") ? `<i class="lv">${p.level}</i>` : ""}${ring ? `<i class="ring ${ring}"></i>` : ""}</span>`;
const DIFF = { "Warm-up": "", Easy: "easy", Medium: "medium", Hard: "hard", Expert: "expert", Boss: "boss" };
const diffChip = (label) => `<span class="diff ${DIFF[label] ?? ""}">${label === "Boss" ? "Boss round" : esc(label)}</span>`;
const multOf = (d, n) => 1 + (d - 1) / Math.max(1, n - 1);

// =====================================================================
// profile, levels, sessions
// =====================================================================
const profile = Object.assign({ device: rid(), name: "", xp: 0, games: 0, wins: 0, bestStreak: 0, flawless: 0, dailyStreak: 0, lastDaily: null, seenIntro: false, awarded: [] }, LS.get("kc:profile", {}));
const saveProfile = () => LS.set("kc:profile", profile);
saveProfile();
const xpFor = (L) => 50 * L * (L - 1);
const levelOf = (xp) => { let L = 1; while (xpFor(L + 1) <= xp) L++; return L; };
const levelInfo = (xp) => { const L = levelOf(xp), a = xpFor(L), b = xpFor(L + 1); return { level: L, into: xp - a, need: b - a, frac: (xp - a) / (b - a) }; };
const myLevel = () => levelOf(profile.xp);
let session = LS.get("kc:session", null);
const saveSession = (s) => { session = s; s ? LS.set("kc:session", s) : LS.del("kc:session"); };

// =====================================================================
// network
// =====================================================================
async function api(action, body) {
  let r;
  try { r = await fetch(`/api/room/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }); }
  catch { const e = new Error("You look offline. Check your connection."); e.status = 0; throw e; }
  let d = {}; try { d = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(d.error || "Something went wrong. Try again."); e.status = r.status; throw e; }
  return d;
}
function loadScript(src) {
  return new Promise((res, rej) => { if ($(`script[src="${src}"]`)) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function qrSvg(text) {
  await loadScript("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js");
  const q = window.qrcode(0, "M"); q.addData(text); q.make();
  return { svg: q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }), q };
}

// =====================================================================
// audio: synthesised music + effects (no files)
// =====================================================================
const Sound = (() => {
  let ctx = null, master, sfxBus, musicBus, noise, timer = null, track = null, step = 0, nextT = 0, intensity = 0;
  let mode = LS.get("kc:audio", "all"); // all | sfx | off
  const MUSIC_LEVEL = 0.2;
  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createDynamicsCompressor(); master.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.connect(master);
        musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
        const b = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noise = b;
        applyMode();
      } catch { ctx = null; }
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function applyMode() {
    if (!ctx) return;
    const t = ctx.currentTime;
    sfxBus.gain.setTargetAtTime(mode === "off" ? 0 : 0.9, t, 0.02);
    musicBus.gain.setTargetAtTime(mode === "all" && track ? MUSIC_LEVEL : 0, t, 0.15);
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function tone(bus, type, f, t, dur, g, o = {}) {
    const osc = ctx.createOscillator(), amp = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    amp.gain.setValueAtTime(0.0001, t); amp.gain.linearRampToValueAtTime(g, t + (o.a ?? 0.005)); amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = o.lp; osc.connect(f2); node = f2; }
    node.connect(amp).connect(bus); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function hiss(bus, t, dur, g, type = "highpass", freq = 7000) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq;
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(a).connect(bus); s.start(t); s.stop(t + dur + 0.02);
  }
  // ---- music ----
  const TRACKS = {
    lobby: { bpm: 100, feel: "chill", prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] },
    play: { bpm: 122, feel: "drive", prog: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]] },
    win: { bpm: 118, feel: "party", prog: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]] },
  };
  const bpm = () => { const tr = TRACKS[track]; return tr.bpm * (track === "play" ? 1 + 0.28 * intensity : 1); };
  function stepAt(tr, s, t) {
    const b = musicBus, i = s % 16, bar = Math.floor(s / 16) % 4, ch = tr.prog[bar], six = 60 / bpm() / 4;
    const kick = (g) => tone(b, "sine", 150, t, 0.28, g, { to: 45 });
    const hat = (g) => hiss(b, t, 0.04, g);
    const clap = (g) => hiss(b, t, 0.14, g, "bandpass", 1600);
    if (tr.feel === "chill") { if (i === 0 || i === 10) kick(0.55); if (i % 4 === 2) hat(0.06); if (i === 4 || i === 12) clap(0.07); }
    else { if (i % 4 === 0) kick(0.62); if (i === 4 || i === 12) clap(tr.feel === "party" ? 0.2 : 0.15); hat(i % 2 ? 0.035 : 0.07); if (intensity > 0.65 && i % 2) hat(0.05); }
    const bassSteps = tr.feel === "chill" ? [0, 6, 8, 14] : [0, 2, 4, 6, 8, 10, 12, 14];
    if (bassSteps.includes(i)) tone(b, "triangle", mtof(ch[0] - 24), t, six * 1.7, 0.22, { lp: 600 });
    if (i === 0) ch.forEach((n, k) => tone(b, "sawtooth", mtof(n), t, six * 16, 0.028, { a: 0.25, lp: 1400 + intensity * 1600, detune: k * 4 - 4 }));
    const arpEvery = tr.feel === "chill" ? 2 : (intensity > 0.35 || tr.feel === "party" ? 1 : 2);
    if (i % arpEvery === 0) { const n = ch[(i / arpEvery) % 3] + (i % 8 >= 4 ? 24 : 12); tone(b, "square", mtof(n), t, six * 0.9, tr.feel === "chill" ? 0.028 : 0.034, { lp: 3200 }); }
  }
  function loop() {
    if (!ctx || !track) return;
    while (nextT < ctx.currentTime + 0.15) { stepAt(TRACKS[track], step, nextT); nextT += 60 / bpm() / 4; step++; }
  }
  return {
    unlock: ensure,
    get mode() { return mode; },
    cycle() { mode = mode === "all" ? "sfx" : mode === "sfx" ? "off" : "all"; LS.set("kc:audio", mode); ensure(); applyMode(); if (mode !== "off") this.click(); return mode; },
    music(name) {
      if (name === track) return;
      if (!ctx) { track = name; return; }
      track = name; step = 0; nextT = ctx.currentTime + 0.06; intensity = 0;
      clearInterval(timer); timer = name ? setInterval(loop, 30) : null;
      applyMode();
    },
    intensity(x) { intensity = clamp(x, 0, 1); },
    start() { ensure(); if (track && !timer && ctx) { nextT = ctx.currentTime + 0.06; timer = setInterval(loop, 30); applyMode(); } },
    // ---- effects ----
    click() { if (!ensure()) return; const t = ctx.currentTime; tone(sfxBus, "square", 620, t, 0.05, 0.07, { lp: 3000 }); tone(sfxBus, "square", 930, t + 0.035, 0.06, 0.05, { lp: 3000 }); },
    tick() { if (!ensure()) return; tone(sfxBus, "square", 1250, ctx.currentTime, 0.05, 0.06, { lp: 4000 }); },
    count() { if (!ensure()) return; tone(sfxBus, "triangle", 660, ctx.currentTime, 0.16, 0.2); },
    go() { if (!ensure()) return; const t = ctx.currentTime; [880, 1320, 1760].forEach((f, k) => tone(sfxBus, "triangle", f, t + k * 0.05, 0.3, 0.16)); },
    lock() { if (!ensure()) return; const t = ctx.currentTime; [440, 660, 990].forEach((f, k) => tone(sfxBus, "triangle", f, t + k * 0.06, 0.18, 0.16)); },
    boost() { if (!ensure()) return; const t = ctx.currentTime; tone(sfxBus, "sawtooth", 220, t, 0.35, 0.08, { to: 880, lp: 2400 }); },
    coin() { if (!ensure()) return; const t = ctx.currentTime; tone(sfxBus, "square", 988, t, 0.07, 0.06, { lp: 5000 }); tone(sfxBus, "square", 1319, t + 0.06, 0.16, 0.06, { lp: 5000 }); },
    reveal() { if (!ensure()) return; const t = ctx.currentTime; hiss(sfxBus, t, 0.5, 0.05, "bandpass", 900); [523, 659, 784, 1047].forEach((f, k) => tone(sfxBus, "triangle", f, t + 0.25 + k * 0.07, 0.3, 0.15)); },
    thud() { if (!ensure()) return; tone(sfxBus, "sine", 170, ctx.currentTime, 0.3, 0.3, { to: 55 }); },
    join() { if (!ensure()) return; const t = ctx.currentTime; tone(sfxBus, "sine", 700, t, 0.1, 0.12); tone(sfxBus, "sine", 1050, t + 0.07, 0.14, 0.1); },
    leave() { if (!ensure()) return; const t = ctx.currentTime; tone(sfxBus, "sine", 520, t, 0.12, 0.1); tone(sfxBus, "sine", 350, t + 0.08, 0.18, 0.08); },
    pop() { if (!ensure()) return; tone(sfxBus, "sine", 900, ctx.currentTime, 0.09, 0.13, { to: 1500 }); },
    timeup() { if (!ensure()) return; tone(sfxBus, "sawtooth", 320, ctx.currentTime, 0.4, 0.08, { to: 110, lp: 1800 }); },
    win() { if (!ensure()) return; const t = ctx.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, k) => tone(sfxBus, "triangle", f, t + k * 0.11, 0.32, 0.16)); hiss(sfxBus, t + 0.77, 0.9, 0.06, "highpass", 5000); },
    levelup() { if (!ensure()) return; const t = ctx.currentTime; [659, 784, 988, 1319].forEach((f, k) => tone(sfxBus, "square", f, t + k * 0.08, 0.2, 0.07, { lp: 4000 })); },
  };
})();
const unlockAudio = () => { Sound.unlock(); Sound.start(); };
document.addEventListener("pointerdown", unlockAudio, { passive: true });
document.addEventListener("keydown", unlockAudio);

// =====================================================================
// viewport + keyboard: keep the whole game inside the visible area
// =====================================================================
const vv = window.visualViewport;
let baseH = vv ? vv.height : window.innerHeight;
function syncViewport() {
  const h = vv ? vv.height : window.innerHeight;
  const top = vv ? vv.offsetTop : 0;
  const ae = document.activeElement;
  const typing = !!ae && (ae.tagName === "TEXTAREA" || (ae.tagName === "INPUT" && ae.type !== "range"));
  if (!typing) baseH = h;
  document.documentElement.style.setProperty("--app-h", Math.round(h) + "px");
  $("#app").style.transform = top > 0 ? `translateY(${Math.round(top)}px)` : "";
  document.body.classList.toggle("kb", typing && h < baseH - 140);
}
vv?.addEventListener("resize", syncViewport);
vv?.addEventListener("scroll", syncViewport);
window.addEventListener("resize", syncViewport);
document.addEventListener("focusin", () => { setTimeout(() => { if (vv && vv.offsetTop > 0) window.scrollTo(0, 0); syncViewport(); }, 60); setTimeout(syncViewport, 350); });
document.addEventListener("focusout", () => setTimeout(syncViewport, 80));
syncViewport();

// =====================================================================
// shell, sheets, toasts, fx
// =====================================================================
function hudHome() {
  const L = myLevel();
  return `<button class="logo" id="homebtn" aria-label="FactClash home">${I.cap}<b>FACTCLASH</b></button><span class="mid"></span>
    ${profile.name ? `<button class="chipl" id="profbtn" aria-label="Your profile">${disc({ name: profile.name, avatar: 0 }, "sm")}Lv ${L}</button>` : ""}
    <button class="ib" id="sndbtn" aria-label="Sound">${soundIcon()}</button>`;
}
function hudGame({ pill = "", mid = "", clock = null, menu = true } = {}) {
  return `${pill ? `<span class="pill">${pill}</span>` : ""}<span class="mid">${mid}</span>${clock != null ? `<span class="clock" id="clock">${clock}</span>` : ""}
    <button class="ib" id="sndbtn" aria-label="Sound">${soundIcon()}</button>${menu ? `<button class="ib" id="menubtn" aria-label="Menu">${I.menu}</button>` : ""}`;
}
const soundIcon = () => (Sound.mode === "all" ? I.sound : Sound.mode === "sfx" ? I.sfx : I.mute);
function shell({ hud, stage, side = null, dock = "", narrow = false, rail = "" }) {
  $("#hud").innerHTML = hud;
  $("#stage").innerHTML = `<div class="main enter ${narrow ? "narrow" : ""}" id="main">${rail}${stage}</div>${side != null ? `<div class="side" id="side">${side}</div>` : ""}`;
  $("#dock").innerHTML = dock;
  $("#sndbtn")?.addEventListener("click", () => { const m = Sound.cycle(); $("#sndbtn").innerHTML = soundIcon(); toast(m === "all" ? "Music and sound on" : m === "sfx" ? "Sound effects only" : "Muted"); });
  $("#homebtn")?.addEventListener("click", () => { Sound.click(); navigate("/"); });
  $("#profbtn")?.addEventListener("click", () => { Sound.click(); profileSheet(); });
  $("#menubtn")?.addEventListener("click", () => { Sound.click(); roomMenu(); });
  setFuse(0);
  $("#lights").classList.remove("party");
  syncViewport();
}
function setFuse(frac, hot) { const f = $("#fuse"); f.style.width = (clamp(frac, 0, 1) * 100).toFixed(1) + "%"; $("#fusewrap").classList.toggle("hot", !!hot); }
let sheetOnClose = null;
function openSheet(title, body, foot = "", onClose = null) {
  const sh = $("#sheet");
  sh.innerHTML = `<div class="grab"></div><div class="sh"><h2 class="h2" id="sheettitle">${title}</h2><button class="ib" id="sheetx" aria-label="Close">${I.close}</button></div><div class="sb">${body}</div>${foot ? `<div class="sf">${foot}</div>` : ""}`;
  sh.classList.add("on"); $("#sheetbg").classList.add("on");
  $("#sheetx").onclick = closeSheet; $("#sheetbg").onclick = closeSheet;
  sheetOnClose = onClose;
  return sh;
}
function closeSheet() { $("#sheet").classList.remove("on"); $("#sheetbg").classList.remove("on"); const f = sheetOnClose; sheetOnClose = null; f?.(); }
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeSheet(); closeTray(); } });
function toast(msg, kind = "") { const t = document.createElement("div"); t.className = `toast ${kind}`; t.textContent = msg; $("#toasts").appendChild(t); setTimeout(() => t.remove(), 2600); while ($("#toasts").children.length > 3) $("#toasts").firstChild.remove(); }
function popAt(el, text, zero) {
  const r = (el || $("#stage")).getBoundingClientRect();
  const p = document.createElement("div"); p.className = `pop ${zero ? "zero" : ""}`; p.textContent = text;
  p.style.left = r.left + r.width / 2 + "px"; p.style.top = r.top + Math.min(r.height / 2, 120) + "px";
  $("#fx").appendChild(p); setTimeout(() => p.remove(), 1300);
}
function bubble(name, avatar, text) {
  const b = document.createElement("div"); b.className = "bubble";
  b.innerHTML = `${disc({ name, avatar }, "sm")}${esc(text)}`;
  b.style.left = 8 + Math.random() * Math.max(10, window.innerWidth - 200) + "px";
  $("#fx").appendChild(b); setTimeout(() => b.remove(), 2700);
}
function confetti(n = 90) {
  const c = document.createElement("div"); c.className = "confetti";
  const cols = ["#FFC83D", "#FF4FA3", "#3DE0FF", "#35E39A", "#B77CFF", "#FF9A3D"];
  for (let i = 0; i < n; i++) { const e = document.createElement("i"); e.style.left = Math.random() * 100 + "vw"; e.style.background = cols[i % cols.length]; e.style.animationDuration = 2.2 + Math.random() * 2 + "s"; e.style.animationDelay = Math.random() * 0.9 + "s"; c.appendChild(e); }
  $("#fx").appendChild(c); setTimeout(() => c.remove(), 5500);
}
function countUp(el, to, ms = 700, from = 0, fmt = (v) => v) {
  if (!el) return;
  const t0 = performance.now();
  const step = (t) => { const k = clamp((t - t0) / ms, 0, 1); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
async function copyText(text, msg = "Copied") { try { await navigator.clipboard.writeText(text); toast(msg, "good"); } catch { openSheet("Copy this", `<div class="quote">${esc(text)}</div>`); } }
async function shareText(text, url, title = "FactClash") {
  if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { if (e.name === "AbortError") return; } }
  copyText(`${text} ${url}`.trim(), "Link copied. Paste it anywhere.");
}
const waLink = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

// ---- reactions tray ----
function closeTray() { $("#tray")?.remove(); }
function openTray(onPick) {
  closeTray();
  const t = document.createElement("div"); t.className = "tray"; t.id = "tray";
  t.innerHTML = ["Nice", "Genius", "Wow", "Close", "Robbed", "GG"].map((r) => `<button data-r="${r}">${r}</button>`).join("");
  $("#dock").appendChild(t);
  t.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; onPick(b.dataset.r); closeTray(); };
  setTimeout(() => document.addEventListener("pointerdown", function h(e) { if (!e.target.closest("#tray") && !e.target.closest("#reactbtn")) { closeTray(); document.removeEventListener("pointerdown", h); } }), 0);
}

// ---- FLIP animation for reordering rows ----
function flip(container, render) {
  if (!container) return render();
  const before = new Map($$("[data-k]", container).map((el) => [el.dataset.k, el.getBoundingClientRect().top]));
  render();
  $$("[data-k]", container).forEach((el) => { const b = before.get(el.dataset.k); if (b == null) return; const d = b - el.getBoundingClientRect().top; if (Math.abs(d) < 2) return; el.animate([{ transform: `translateY(${d}px)` }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" }); });
}

// =====================================================================
// router
// =====================================================================
let stopCurrent = () => {};
function route() {
  const p = location.pathname; let m;
  if ((m = p.match(/^\/r\/([A-Za-z0-9]{4})\/?$/))) return { kind: "room", code: m[1].toUpperCase() };
  if ((m = p.match(/^\/c\/([A-Za-z0-9]{6,12})\/?$/))) return { kind: "challenge", id: m[1] };
  if (/^\/daily\/?$/.test(p)) return { kind: "daily" };
  const q = new URLSearchParams(location.search).get("room");
  if (q && /^[A-Za-z0-9]{4}$/.test(q)) return { kind: "room", code: q.toUpperCase() };
  return { kind: "home" };
}
function navigate(path, replace = false) {
  stopCurrent(); stopCurrent = () => {};
  if (!/^\/r\//.test(path)) state = null;
  closeSheet(); closeTray(); $("#overlay").classList.remove("on");
  if (path !== location.pathname + location.search) history[replace ? "replaceState" : "pushState"](null, "", path);
  boot();
}
window.addEventListener("popstate", () => { stopCurrent(); stopCurrent = () => {}; closeSheet(); boot(); });
function boot() {
  const r = route();
  if (r.kind === "room") { if (session?.code === r.code) return startRoom(); return inviteFlow(r.code); }
  if (r.kind === "challenge") return soloIntro("challenge", r.id);
  if (r.kind === "daily") return soloIntro("daily", null);
  if (session) return startRoom();
  if (!profile.seenIntro) return intro();
  hub();
}

// =====================================================================
// intro, hub, host, join
// =====================================================================
const STEPS = [
  ["Pick any topic", "Cricket, biryani, space, your favourite show. Anything goes."],
  ["Answer in your own words", "Everyone gets the same question. Each round gets harder."],
  ["Best answer takes the crown", "Score for what you know, how fast you are, and streaks."],
];
function intro(invite = null) {
  Sound.music("lobby");
  shell({
    hud: hudHome(), narrow: true,
    stage: `<div class="hero"><div class="logo xl capdrop">${I.cap}<b>FACTCLASH</b></div><p class="tagline">No cap. Just facts.</p></div>
      ${invite ? inviteCard(invite) : ""}
      <div class="steps">${STEPS.map(([h, p], i) => `<div class="stepc"><span class="n">${i + 1}</span><div><p class="h3">${h}</p><p class="small muted">${p}</p></div></div>`).join("")}</div>`,
    dock: `<button class="btn wide" id="go">${invite ? `Join ${esc(invite.host)}'s game` : "Let's play"}</button>`,
  });
  $("#go").onclick = () => { Sound.go(); profile.seenIntro = true; saveProfile(); invite ? joinScreen(invite.code, invite) : hub(); };
}
const inviteCard = (inv) => `<div class="invite">${disc({ name: inv.host, avatar: inv.players?.[0]?.avatar ?? 0 }, "lg")}<div class="grow"><p class="small muted">${esc(inv.host)} invited you to play</p><p class="h2">${esc(inv.topic)}</p><p class="tiny muted">${plural(inv.players.length, "player")} in the room</p></div></div>`;
async function inviteFlow(code) {
  let inv = null;
  try { inv = await api("peek", { code }); } catch (e) { toast(e.message, "bad"); return navigate("/", true); }
  if (!profile.seenIntro) return intro(inv);
  joinScreen(code, inv);
}

// Example topics for the placeholder and the Surprise me button. Global, with a regional tilt.
const TOPICS = {
  global: ["Space", "Dinosaurs", "The human body", "Harry Potter", "Marvel movies", "Star Wars", "Disney and Pixar", "Pokemon", "Minecraft", "Video games", "The Olympics", "Football", "Chocolate", "Pizza", "Coffee", "Ancient Egypt", "Ancient Rome", "The ocean", "Sharks", "Volcanoes", "Inventions", "Famous paintings", "The Beatles", "Friends (TV show)", "Superheroes", "Cars", "Formula 1", "Tennis", "World capitals", "Wonders of the world", "Board games", "Music legends", "Smartphones", "Mythology", "Weather", "Animals"],
  US: ["NBA basketball", "The NFL", "Hollywood", "New York City", "US national parks", "Baseball", "Thanksgiving"],
  UK: ["The Premier League", "The Royal Family", "London", "British TV", "Doctor Who", "Cricket"],
  IN: ["Cricket", "Bollywood", "Indian food", "Indian festivals", "The IPL", "Indian history"],
};
const REGION = (() => { try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "", lang = navigator.language || ""; if (/Kolkata|Calcutta/.test(tz) || /-IN$/i.test(lang)) return "IN"; if (/London|Europe\/(Dublin|Belfast)/.test(tz) || /-GB$/i.test(lang)) return "UK"; if (/^America\//.test(tz) || /-US$/i.test(lang)) return "US"; } catch {} return null; })();
const topicPool = () => [...TOPICS.global, ...(REGION ? TOPICS[REGION].concat(TOPICS[REGION]) : [...TOPICS.US, ...TOPICS.UK, ...TOPICS.IN])];
const surprise = (not = "") => { const pool = topicPool().filter((t) => t !== not); return pool[Math.floor(Math.random() * pool.length)]; };
function rotatePlaceholder(input) {
  let alive = true; const tick = () => { if (!alive || !document.body.contains(input)) return; if (!input.value) input.placeholder = `Try: ${surprise(input.placeholder.slice(5))}`; setTimeout(tick, 2200); };
  input.placeholder = `Try: ${surprise()}`; setTimeout(tick, 2200); return () => (alive = false);
}
function bindDice(btn, input) { btn.onclick = () => { input.value = surprise(input.value); btn.classList.remove("roll"); void btn.offsetWidth; btn.classList.add("roll"); Sound.click(); input.dispatchEvent(new Event("input")); }; }

async function hub() {
  Sound.music("lobby");
  const info = levelInfo(profile.xp);
  shell({
    hud: hudHome(), narrow: true,
    stage: `${profile.name ? `<div class="card tight"><div class="rowf"><div class="grow"><p class="h3">Hey ${esc(profile.name)}</p><p class="tiny muted">Level ${info.level}  ·  ${info.into} / ${info.need} XP to level ${info.level + 1}</p></div>${profile.dailyStreak > 1 && profile.lastDaily >= yesterday() ? `<span class="flame">${I.flame}${profile.dailyStreak}</span>` : ""}</div><div class="xpbar" style="margin-top:10px"><i id="hubxp"></i></div></div>` : ""}
      <div class="daily" id="dailycard"><p class="num">Daily Clash</p><p class="topic" id="dtopic"><span class="spin"></span></p><p class="small muted" id="dmeta">Same 8 questions for everyone today.</p><button class="btn wide go" id="dgo">Play today's challenge</button></div>
      <div class="card hide-kb"><div class="rowf" style="margin-bottom:12px"><p class="h3 grow">How to play</p><button class="btn xs ghost" id="howbtn">Scoring</button></div>
        <div class="mini"><div class="li"><span class="ic">${I.pen}</span><span><b>Host a game</b> on any topic you like</span></div><div class="li"><span class="ic">${I.chat}</span><span><b>Invite friends</b> with one tap on WhatsApp</span></div><div class="li"><span class="ic">${I.crown}</span><span><b>Best answers win</b> and take the crown</span></div></div></div>`,
    dock: `<button class="btn violet flex1" id="joinbtn">Join a game</button><button class="btn flex1" id="hostbtn">Host a game</button>`,
  });
  requestAnimationFrame(() => { const x = $("#hubxp"); if (x) x.style.width = (info.frac * 100).toFixed(1) + "%"; });
  $("#hostbtn").onclick = () => { Sound.click(); hostScreen(); };
  $("#joinbtn").onclick = () => { Sound.click(); joinScreen(); };
  $("#howbtn").onclick = () => { Sound.click(); howSheet(); };
  $("#dgo").onclick = () => { Sound.go(); navigate("/daily"); };
  try {
    const d = await api("solostate", { kind: "daily", peek: true });
    if (!$("#dtopic")) return;
    $("#dtopic").textContent = d.topic || "Today's topic";
    const mine = LS.get(`kc:solo:daily:${d.ref}`, null);
    $("#dcard")?.remove();
    $("#dmeta").textContent = mine?.finished ? `You scored ${mine.total}. ${d.board ? `${plural(d.board.count, "player")} today.` : ""}` : `8 questions  ·  ${d.board?.count ? `${plural(d.board.count, "player")} so far` : "Be the first today"}`;
    if (mine?.finished) $("#dgo").textContent = "See today's leaderboard";
  } catch { if ($("#dtopic")) $("#dtopic").textContent = "Today's topic"; }
}
const yesterday = () => new Date(Date.now() + 5.5 * 3600000 - 86400000).toISOString().slice(0, 10);

function howSheet() {
  openSheet("How scoring works", `<div class="steps">
    <div class="stepc"><span class="n">1</span><div><p class="h3">Hit the key points</p><p class="small muted">Every question has 3 key points a great answer covers. You score for each one you hit, in any words.</p></div></div>
    <div class="stepc"><span class="n">2</span><div><p class="h3">Later rounds pay more</p><p class="small muted">Points grow each round, up to 2× on the Boss round.</p></div></div>
    <div class="stepc"><span class="n">3</span><div><p class="h3">Speed and streaks</p><p class="small muted">Lock in fast for up to 25% extra. Great answers in a row add a streak bonus.</p></div></div>
    <div class="stepc"><span class="n">4</span><div><p class="h3">One 2× boost per game</p><p class="small muted">Double one answer. Save it for a round you know cold.</p></div></div>
    <div class="stepc"><span class="n">5</span><div><p class="h3">Watch out for myths</p><p class="small muted">Falling for a famous myth halves your points.</p></div></div></div>`);
}

function nameField(id = "nm") { return `<label class="label" for="${id}">Your name</label><input class="field" id="${id}" maxlength="20" autocomplete="nickname" placeholder="Priya" value="${esc(profile.name)}" enterkeyhint="next">`; }
function takeName(id = "nm") { const v = ($("#" + id)?.value ?? profile.name).replace(/\s+/g, " ").trim().slice(0, 20); if (v) { profile.name = v; saveProfile(); } return v; }

function modeTiles(id, mode) {
  return `<div class="modes" id="${id}" role="radiogroup">${[["timed", "Classic", "Timer on", I.clock], ["untimed", "Chill", "No timer", I.cup], ["race", "Race", "Own pace", I.flag]].map(([v, t, d, ic]) => `<button class="mode ${mode === v ? "on" : ""}" data-v="${v}" role="radio" aria-checked="${mode === v}">${ic}<b>${t}</b><small>${d}</small></button>`).join("")}</div>`;
}
function hostScreen(prefill = "") {
  let mode = LS.get("kc:lastmode", "timed"), n = LS.get("kc:lastn", 8), sec = LS.get("kc:lastsec", 45);
  shell({
    hud: `<button class="ib" id="backbtn" aria-label="Back">${I.back}</button><span class="mid">Host a game</span><button class="ib" id="sndbtn" aria-label="Sound">${soundIcon()}</button>`,
    narrow: true,
    stage: `<div class="card"><div class="form">
      ${profile.name ? `<button class="asname hide-kb" id="asname">${disc({ name: profile.name, avatar: 0 }, "sm")}<span style="margin:0;color:inherit;font-weight:500">Playing as <b>${esc(profile.name)}</b></span><span>Change</span></button>` : `<section><p class="sec-t">What should we call you?</p><input class="field" id="nm" maxlength="20" autocomplete="nickname" placeholder="Your name" enterkeyhint="next"></section>`}
      <section><p class="sec-t">Pick a topic</p><div class="topicrow"><input class="field" id="topic" maxlength="60" value="${esc(prefill)}" enterkeyhint="done" autocomplete="off" aria-label="Topic"><button class="ib dice" id="dice" aria-label="Surprise me">${I.dice}</button></div>
        <p class="hint">Anything your group knows: a sport, a show, a city, a hobby.</p></section>
      <section class="hide-kb"><p class="sec-t">Game style</p>${modeTiles("mode", mode)}</section>
      <section class="grid2 hide-kb"><div><p class="sec-t">Questions</p><div class="stepper" id="nstep"><button data-d="-1" aria-label="Fewer questions">−</button><output id="nout">${n}</output><button data-d="1" aria-label="More questions">+</button></div></div>
        <div id="secwrap"><p class="sec-t">Seconds each</p><div class="stepper" id="sstep"><button data-d="-15" aria-label="Less time">−</button><output id="sout">${sec}</output><button data-d="15" aria-label="More time">+</button></div></div></section>
      </div><p class="err" id="herr" style="margin-top:12px"></p></div>`,
    dock: `<button class="btn wide" id="create">Create room</button>`,
  });
  const setMode = (m) => { mode = m; $$("#mode .mode").forEach((b) => { b.classList.toggle("on", b.dataset.v === m); b.setAttribute("aria-checked", b.dataset.v === m); }); $("#secwrap").style.visibility = m === "timed" ? "visible" : "hidden"; };
  setMode(mode);
  rotatePlaceholder($("#topic")); bindDice($("#dice"), $("#topic"));
  $("#backbtn").onclick = () => { Sound.click(); hub(); };
  $("#asname")?.addEventListener("click", () => profileSheet());
  $("#mode").onclick = (e) => { const b = e.target.closest(".mode"); if (b) { Sound.click(); setMode(b.dataset.v); } };
  $("#nstep").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; n = clamp(n + Number(b.dataset.d), 3, 20); $("#nout").textContent = n; Sound.click(); };
  $("#sstep").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; sec = clamp(sec + Number(b.dataset.d), 15, 120); $("#sout").textContent = sec; Sound.click(); };
  $("#topic").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#topic").blur(); } });
  $("#nm")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#topic").focus(); } });
  $("#create").onclick = async () => {
    const name = takeName(); const topic = $("#topic").value.trim();
    if (!name) { $("#herr").textContent = "Enter your name first."; return $("#nm")?.focus(); }
    if (topic.length < 2) { $("#herr").textContent = "Type a topic, or tap the dice for a surprise."; return $("#topic").focus(); }
    $("#create").disabled = true; $("#create").innerHTML = `<span class="spin"></span>Opening room`;
    try {
      LS.set("kc:lastmode", mode); LS.set("kc:lastn", n); LS.set("kc:lastsec", sec);
      const r = await api("create", { name, topic, mode, numQuestions: n, secondsPerQ: sec, level: myLevel() });
      saveSession(r); Sound.go(); navigate(`/r/${r.code}`);
    } catch (e) { $("#herr").textContent = e.message; $("#create").disabled = false; $("#create").textContent = "Create room"; }
  };
  (profile.name ? $("#topic") : $("#nm")).focus();
}

function joinScreen(code = "", invite = null) {
  shell({
    hud: `<button class="ib" id="backbtn" aria-label="Back">${I.back}</button><span class="mid">Join a game</span><button class="ib" id="sndbtn" aria-label="Sound">${soundIcon()}</button>`,
    narrow: true,
    stage: `${invite ? inviteCard(invite) : ""}<div class="card">${nameField()}
      <label class="label" for="code">Room code</label><input class="field codebox" id="code" maxlength="4" placeholder="ABCD" value="${esc(code)}" autocapitalize="characters" autocomplete="off" enterkeyhint="go">
      <p class="err" id="jerr" style="margin-top:10px"></p></div>`,
    dock: `<button class="btn wide" id="join">${invite ? `Join ${esc(invite.host)}'s game` : "Join room"}</button>`,
  });
  $("#backbtn").onclick = () => { Sound.click(); navigate("/"); };
  const go = async () => {
    const name = takeName(); const c = $("#code").value.trim().toUpperCase();
    if (!name) { $("#jerr").textContent = "Enter your name first."; return $("#nm").focus(); }
    if (!/^[A-Z0-9]{4}$/.test(c)) { $("#jerr").textContent = "Room codes are 4 letters."; return $("#code").focus(); }
    $("#join").disabled = true; $("#join").innerHTML = `<span class="spin"></span>Joining`;
    try { const r = await api("join", { name, code: c, level: myLevel() }); saveSession(r); Sound.go(); navigate(`/r/${r.code}`); }
    catch (e) { $("#jerr").textContent = e.message; $("#join").disabled = false; $("#join").textContent = "Join room"; }
  };
  $("#join").onclick = go;
  $("#code").addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (e.target.value.length === 4 && profile.name) go(); });
  $("#code").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  $("#nm").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); code ? go() : $("#code").focus(); } });
  (profile.name ? (code ? null : $("#code")) : $("#nm"))?.focus();
}

function profileSheet() {
  const info = levelInfo(profile.xp);
  openSheet("Your profile", `
    <div class="rowf" style="margin-bottom:14px">${disc({ name: profile.name || "?", avatar: 0, level: info.level }, "lg")}<div class="grow"><p class="h2">Level ${info.level}</p><p class="small muted">${info.into} / ${info.need} XP to level ${info.level + 1}</p><div class="xpbar" style="margin-top:8px"><i style="width:${(info.frac * 100).toFixed(1)}%"></i></div></div></div>
    <div class="stats" style="margin-bottom:14px"><div class="stat"><b>${profile.games}</b><span>Games</span></div><div class="stat"><b>${profile.wins}</b><span>Crowns won</span></div><div class="stat"><b>${profile.flawless}</b><span>Flawless</span></div></div>
    <div class="stats" style="margin-bottom:6px"><div class="stat"><b>${profile.bestStreak}</b><span>Best streak</span></div><div class="stat"><b>${profile.dailyStreak}</b><span>Daily streak</span></div><div class="stat"><b>${profile.xp}</b><span>Total XP</span></div></div>
    ${nameField("pname")}`, `<button class="btn ghost flex1" id="phow">Scoring</button><button class="btn flex1" id="psave">Save</button>`);
  $("#psave").onclick = () => { takeName("pname"); closeSheet(); toast("Saved", "good"); if (!session) hub(); };
  $("#phow").onclick = () => howSheet();
}

// =====================================================================
// room: polling + rendering
// =====================================================================
let state = null, pollTimer = null, timeOffset = 0, screenKey = "", roundKey = -1, lastRanks = {}, typingSent = 0, typingTrail = null, draft = "", boostArmed = false, raceShow = null, tickSec = -1, countShown = -1, pollBusy = false;
const serverNow = () => Date.now() + timeOffset;
// Live updates: one streamed response per player; the server pushes state the moment anything changes.
// Falls back to polling when a network or proxy will not stream.
let streaming = false, seenEv = new Set(), eventsPrimed = false, lastByteAt = 0, lastPollAt = 0;
// After your own action, confirm once even when streaming, so a stalled stream never hides your result.
const refresh = () => poll();
function startRoom() {
  stopCurrent();
  state = null; screenKey = ""; roundKey = -1; raceShow = null; boostArmed = false; seenEv = new Set(); eventsPrimed = false; streaming = false;
  let alive = true;
  const ctrl = new AbortController();
  let conn = null;
  // Health check: poll while the stream is down, and drop a stream that has gone silent (server heartbeats every 5s).
  const health = setInterval(() => {
    if (!alive) return;
    const now = Date.now();
    if (!streaming && now - lastPollAt > 1500) poll();
    if (streaming && now - lastByteAt > 9000) { streaming = false; conn?.abort(); poll(); }
  }, 1000);
  stopCurrent = () => { alive = false; streaming = false; clearTimeout(pollTimer); clearInterval(health); ctrl.abort(); };
  const pollLoop = async () => {
    if (!alive || streaming) return;
    await poll();
    if (!alive || streaming) return;
    const fast = state && ["playing", "generating", "reveal"].includes(state.status);
    pollTimer = setTimeout(pollLoop, fast ? 850 : 1400);
  };
  const streamLoop = async () => {
    let got = false, fails = 0;
    while (alive) {
      let firstTimer = null;
      try {
        conn = new AbortController();
        const onStop = () => conn.abort(); ctrl.signal.addEventListener("abort", onStop, { once: true });
        const res = await fetch("/api/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...session, level: myLevel() }), signal: conn.signal });
        if (!res.ok || !res.body) throw new Error("stream " + res.status);
        const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "";
        lastByteAt = Date.now();
        firstTimer = setTimeout(() => { if (!got) reader.cancel().catch(() => {}); }, 7000);
        while (alive) {
          const { value, done } = await reader.read(); if (done) break;
          lastByteAt = Date.now();
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
            if (onStreamChunk(chunk)) { got = true; fails = 0; if (!streaming) { streaming = true; clearTimeout(pollTimer); } }
          }
        }
      } catch (e) { if (!alive) return; }
      finally { clearTimeout(firstTimer); }
      streaming = false;
      if (!alive) return;
      fails++;
      if (!got && fails >= 2) return pollLoop();
      await sleep(fails > 3 ? 2000 : 150);
    }
  };
  shell({ hud: hudGame({ mid: "Joining room" }), stage: `<div class="genstage"><span class="spin"></span></div>` });
  streamLoop();
}
function onStreamChunk(chunk) {
  let event = "message", data = "";
  for (const line of chunk.split("\n")) { if (line.startsWith("event:")) event = line.slice(6).trim(); else if (line.startsWith("data:")) data += line.slice(5).trim(); }
  if (!data) return false;
  let d; try { d = JSON.parse(data); } catch { return false; }
  if (event === "message") { if (!session || d.code !== session.code) return false; timeOffset = d.serverTime - Date.now(); handleEvents(d); state = d; render(); return true; }
  if (event === "typing") { applyTyping(d); return true; }
  if (event === "ev") { applyEvent(d); return true; }
  if (event === "gone") { if (d.status === 403 || d.status === 404) { toast(d.error, "bad"); saveSession(null); navigate("/", true); } return true; }
  return event === "bye";
}
function applyTyping(d) {
  if (!state || !state.me || d.pid === state.me.id) return;
  const p = state.players.find((x) => x.id === d.pid); if (!p || p.submitted) return;
  p.typing = true; p.chars = d.len;
  clearTimeout(p._tt); p._tt = setTimeout(() => { p.typing = false; if (state && ["playing"].includes(state.status)) render(); }, 3500);
  if (state.status === "playing") render();
}
function applyEvent(ev) { if (!ev || !state || seenEv.has(ev.id)) return; seenEv.add(ev.id); showEvent(ev); }
async function poll() {
  if (!session || pollBusy) return;
  pollBusy = true; lastPollAt = Date.now();
  try {
    const asked = session;
    const s = await api("state", { ...session, level: myLevel() });
    if (session !== asked || !session) return;
    timeOffset = s.serverTime - Date.now();
    handleEvents(s); state = s; render();
  } catch (e) {
    if (e.status === 404 || e.status === 403) { toast(e.message, "bad"); saveSession(null); navigate("/", true); }
  } finally { pollBusy = false; }
}
function handleEvents(s) {
  const first = !eventsPrimed; eventsPrimed = true;
  for (const e of s.events || []) { if (seenEv.has(e.id)) continue; seenEv.add(e.id); if (!first) showEvent(e, s); }
}
function showEvent(e, s = state) {
  if (e.type === "react") { bubble(e.name, e.avatar, e.reaction); Sound.pop(); return; }
  if (!s?.me || e.playerId === s.me.id || e.type === "start" || e.type === "again") return;
  toast(e.text, e.type === "kick" || e.type === "end" ? "bad" : "");
  if (e.type === "join") Sound.join(); else if (e.type === "leave" || e.type === "kick") Sound.leave(); else Sound.click();
}
function render() {
  const s = state;
  if (!s || !session || s.code !== session.code) return; // left the room: ignore late timers and replies
  const key = `${s.status}:${s.mode}:${s.isHost ? "h" : "p"}:${s.games}`;
  if (key !== screenKey) { screenKey = key; roundKey = -1; closeTray(); if (!["reveal", "playing"].includes(s.status)) closeSheet(); }
  if (s.status === "lobby") return renderLobby();
  if (s.status === "generating") return renderGenerating();
  if (s.status === "finished") return renderFinished();
  if (s.mode === "race") return renderRace();
  if (s.status === "playing") return renderPlaying();
  if (s.status === "reveal") return renderReveal();
}
const roomLink = () => `${ORIGIN}/r/${state.code}`;
const inviteText = () => `${state.players.find((p) => p.isHost)?.name || "I"} challenged you on ${state.topic} in FactClash. No cap, just facts. Room ${state.code}:`;
function shareButtons(textFn, urlFn, id = "sh") {
  return `<div class="sharegrid" id="${id}"><a class="btn wa" data-a="wa" href="#" role="button">${I.chat}WhatsApp</a><button class="btn ghost" data-a="share">${I.share}Share</button><button class="btn ghost" data-a="copy">${I.copy}Copy</button><button class="btn ghost" data-a="qr">${I.qr}QR code</button></div>`;
}
function bindShare(id, textFn, urlFn) {
  const root = $("#" + id); if (!root) return;
  root.onclick = async (e) => {
    const b = e.target.closest("[data-a]"); if (!b) return; e.preventDefault(); Sound.click();
    const text = textFn(), url = urlFn();
    if (b.dataset.a === "wa") window.open(waLink(`${text} ${url}`), "_blank", "noopener");
    if (b.dataset.a === "share") shareText(text, url);
    if (b.dataset.a === "copy") copyText(`${text} ${url}`, "Invite copied. Paste it in your group.");
    if (b.dataset.a === "qr") { openSheet("Scan to join", `<div class="qr" id="qrbox"><span class="spin" style="color:#140A2E"></span></div><p class="center small muted">${esc(url)}</p>`); try { const { svg } = await qrSvg(url); $("#qrbox").innerHTML = svg; } catch { $("#qrbox").textContent = "QR unavailable offline"; } }
  };
}

// ---------- lobby ----------
function renderLobby() {
  const s = state;
  Sound.music("lobby");
  const slots = Math.max(0, Math.min(12, Math.max(4, s.players.length + 1)) - s.players.length);
  const cells = s.players.map((p) => `<div class="pcell pop" data-k="${p.id}">${disc(p, "lg")}<span class="nm ${p.isMe ? "me" : ""}">${esc(p.name)}</span><span class="st ${p.isHost ? "host" : ""}">${p.isHost ? "Host" : p.away ? "Away" : ""}</span></div>`).join("")
    + Array.from({ length: slots }, () => `<div class="pcell empty"><span class="disc lg">+</span><span class="nm">Invite</span><span class="st"></span></div>`).join("");
  const modeLine = `${{ timed: "Classic", untimed: "Chill", race: "Race" }[s.mode]}  ·  ${plural(s.numQuestions, "question")}${s.mode === "timed" ? `  ·  ${s.secondsPerQ}s each` : ""}`;
  if ($("#lobby")) {
    const grid = $("#pgrid");
    const known = new Set($$("[data-k]", grid).map((e) => e.dataset.k));
    grid.innerHTML = cells;
    $$("[data-k]", grid).forEach((e) => { if (known.has(e.dataset.k)) e.classList.remove("pop"); });
    $("#pcount").textContent = `${s.players.length} of 12`;
    $("#ltopic").textContent = s.topic; $("#lmode").textContent = modeLine;
    $("#lerr").textContent = s.error || "";
    if ($("#startbtn") && !$("#startbtn").disabled) $("#startbtn").textContent = s.players.length > 1 ? `Start with ${s.players.length} players` : "Start solo";
    prepNote(s);
    return;
  }
  shell({
    hud: hudGame({ mid: "Lobby" }), narrow: true,
    stage: `<div id="lobby" style="display:contents">
      <div class="card tight"><div class="bulbs chase"></div><p class="small muted center">Room code</p><button class="bigcode" id="codebtn" aria-label="Copy invite link">${s.code}</button>
        <p class="center small muted" style="margin:2px 0 10px">Send this to your friends. They join in seconds.</p>${shareButtons()}</div>
      <div class="card"><div class="rowf" style="margin-bottom:12px"><p class="h3 grow">Players</p><span class="small muted" id="pcount">${s.players.length} of 12</span></div><div class="pgrid" id="pgrid">${cells}</div></div>
      <div class="card tight hide-kb"><div class="mini"><div class="li"><span class="ic">${I.target}</span><span>Each question has <b>3 key points</b>. Hit them in your own words.</span></div><div class="li"><span class="ic">${I.bolt}</span><span><b>Faster</b> answers and <b>streaks</b> score more. One <b>2× boost</b> per game.</span></div></div></div>
      <div class="card tight"><div class="rowf"><div class="grow"><p class="h3" id="ltopic">${esc(s.topic)}</p><p class="small muted" id="lmode">${modeLine}</p></div>${s.isHost ? `<button class="btn xs ghost" id="editbtn">Change</button>` : ""}</div><p class="err" id="lerr">${esc(s.error || "")}</p>${s.isHost ? `<p class="tiny" id="prepnote" style="margin-top:4px"></p>` : ""}</div>
    </div>`,
    dock: `<button class="btn ghost sm" id="reactbtn" aria-label="React">${I.smile}</button>${s.isHost ? `<button class="btn flex1" id="startbtn">${s.players.length > 1 ? `Start with ${s.players.length} players` : "Start solo"}</button>` : `<p class="note">Waiting for ${esc(s.players.find((p) => p.isHost)?.name || "the host")} to start. Invite more friends while you wait.</p>`}`,
  });
  bindShare("sh", inviteText, roomLink);
  prepNote(s);
  if (s.isHost && !s.prep) prepareQuestions();
  $("#codebtn").onclick = () => copyText(`${inviteText()} ${roomLink()}`, "Invite copied. Paste it in your group.");
  $("#reactbtn").onclick = () => openTray((r) => { api("react", { ...session, text: r }).catch(() => {}); });
  if (s.isHost) {
    $("#editbtn").onclick = () => settingsSheet();
    $("#startbtn").onclick = async () => {
      $("#startbtn").disabled = true; $("#startbtn").innerHTML = `<span class="spin"></span>Setting the stage`; Sound.go();
      try { await api("start", session); refresh(); } catch (e) { $("#lerr").textContent = e.message; $("#startbtn").disabled = false; $("#startbtn").textContent = "Start game"; }
    };
  }
}
// The host's lobby asks the server to write questions in the background, so Start is instant.
let prepAsked = 0;
function prepareQuestions() { if (Date.now() - prepAsked < 3000) return; prepAsked = Date.now(); api("prepare", session).catch(() => {}); }
function prepNote(s) {
  const el = $("#prepnote"); if (!el || !s.isHost) return;
  el.textContent = s.prep === "ready" ? "Questions ready. Start whenever your crew is in." : s.prep === "pending" ? "Writing your questions in the background..." : s.prep === "rejected" ? "" : "";
  el.style.color = s.prep === "ready" ? "var(--green)" : "var(--muted)";
}
function settingsSheet() {
  const s = state; let mode = s.mode, n = s.numQuestions, sec = s.secondsPerQ;
  openSheet("Game settings", `<div class="form"><section><p class="sec-t">Topic</p><div class="topicrow"><input class="field" id="stopic" maxlength="60" value="${esc(s.topic)}" aria-label="Topic"><button class="ib dice" id="sdice" aria-label="Surprise me">${I.dice}</button></div></section>
    <section><p class="sec-t">Game style</p>${modeTiles("smode", mode)}</section>
    <section class="grid2"><div><p class="sec-t">Questions</p><div class="stepper" id="snstep"><button data-d="-1" aria-label="Fewer">−</button><output id="snout">${n}</output><button data-d="1" aria-label="More">+</button></div></div>
    <div id="ssecwrap"><p class="sec-t">Seconds each</p><div class="stepper" id="ssstep"><button data-d="-15" aria-label="Less time">−</button><output id="ssout">${sec}</output><button data-d="15" aria-label="More time">+</button></div></div></section></div><p class="err" id="serr" style="margin-top:10px"></p>`,
    `<button class="btn wide" id="ssave">Save settings</button>`);
  const setMode = (m) => { mode = m; $$("#smode .mode").forEach((b) => b.classList.toggle("on", b.dataset.v === m)); $("#ssecwrap").style.visibility = m === "timed" ? "visible" : "hidden"; };
  setMode(mode); bindDice($("#sdice"), $("#stopic"));
  $("#smode").onclick = (e) => { const b = e.target.closest(".mode"); if (b) setMode(b.dataset.v); };
  $("#snstep").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; n = clamp(n + Number(b.dataset.d), 3, 20); $("#snout").textContent = n; };
  $("#ssstep").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; sec = clamp(sec + Number(b.dataset.d), 15, 120); $("#ssout").textContent = sec; };
  $("#ssave").onclick = async () => {
    try { await api("settings", { ...session, topic: $("#stopic").value, mode, numQuestions: n, secondsPerQ: sec }); closeSheet(); refresh(); toast("Settings saved", "good"); prepAsked = 0; prepareQuestions(); }
    catch (e) { $("#serr").textContent = e.message; }
  };
}

// ---------- generating ----------
const TIPS = ["Save your 2× boost for a round you know cold.", "Lock in fast. Speed adds up to 25% extra.", "Great answers in a row start a streak bonus.", "Facts score, fancy words do not. Hit the key points.", "The last question is the Boss round. Worth up to 2×.", "Falling for a famous myth halves your points."];
function renderGenerating() {
  const s = state;
  Sound.music("play"); Sound.intensity(0);
  if ($("#gen")) return;
  shell({ hud: hudGame({ mid: esc(s.topic) }), stage: `<div class="genstage" id="gen"><div class="logo xl capdrop">${I.cap}</div><p class="h1">Setting the stage</p><p class="muted">${plural(s.numQuestions, "question")} on <b style="color:var(--ink)">${esc(s.topic)}</b></p><div class="gensteps">${Array.from({ length: Math.min(12, s.numQuestions) }, (_, i) => `<i style="animation-delay:${i * 90}ms"></i>`).join("")}</div><p class="small muted" id="tip">${TIPS[0]}</p></div>`, dock: `<p class="note center">Get your thumbs ready.</p>` });
  let k = 0; const t = setInterval(() => { if (!$("#tip")) return clearInterval(t); k = (k + 1) % TIPS.length; $("#tip").textContent = TIPS[k]; }, 2600);
}

// ---------- shared: question card & players strip ----------
const meter = (i, n, done = i) => `<div class="rounds" aria-label="Question ${Math.min(i + 1, n)} of ${n}">${Array.from({ length: n }, (_, k) => `<i class="${k < done ? "done" : k === i ? "cur" : ""} ${k === n - 1 ? "boss" : ""}"></i>`).join("")}</div>`;
const qcard = (q, n) => `<div class="qcard slam" id="qcard"><div class="bulbs"></div><div class="qmeta">${diffChip(q.label)}<span class="mult">×${multOf(q.difficulty, n).toFixed(1)} points</span></div><p class="qtext">${esc(q.prompt)}</p><p class="keys">${Array.from({ length: q.keys || 3 }, () => "<i></i>").join("")}Hit ${q.keys || 3} key facts. Short is fine.</p></div>`;
const ANSWER_MAX = 400;
const ansbox = () => `<div class="ansbox" id="ansbox"><textarea id="ans" maxlength="${ANSWER_MAX}" placeholder="Type the key facts. Keywords are fine." aria-label="Your answer" enterkeyhint="send"></textarea><span class="cnt" id="cnt">0 / ${ANSWER_MAX}</span></div>`;
function bindAnswer(qIndex, submit) {
  const ta = $("#ans"); if (!ta) return;
  ta.value = draft;
  const upd = () => { const n = ta.value.length; $("#cnt").textContent = `${n} / ${ANSWER_MAX}`; $("#cnt").classList.toggle("near", n > ANSWER_MAX - 60); };
  upd();
  ta.addEventListener("input", () => {
    draft = ta.value; upd();
    const send = () => { typingSent = Date.now(); if (session) api("typing", { ...session, q: qIndex, len: ta.value.length }).catch(() => {}); };
    clearTimeout(typingTrail);
    if (Date.now() - typingSent > 900) send(); else typingTrail = setTimeout(send, 900);
  });
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey || window.innerWidth > 700)) { e.preventDefault(); submit(); } });
}
function boostBtn(available) { return `<button class="btn boost ${available ? (boostArmed ? "on" : "off") : "off used"}" id="boostbtn" ${available ? "" : "disabled"} aria-pressed="${boostArmed}" aria-label="2× boost">${I.bolt}2×</button>`; }
function bindBoost(available) {
  const b = $("#boostbtn"); if (!b || !available) return;
  b.onclick = () => { boostArmed = !boostArmed; b.classList.toggle("on", boostArmed); b.classList.toggle("off", !boostArmed); b.setAttribute("aria-pressed", boostArmed); $("#ansbox")?.classList.toggle("boosted", boostArmed); if (boostArmed) { Sound.boost(); toast("2× boost armed for this answer"); } else Sound.click(); };
}
function stripCells(players) {
  return players.map((p) => { const ring = p.submitted ? "done" : p.typing ? "typing" : ""; const st = p.submitted ? "Locked" : p.typing ? `Typing ${p.chars}` : p.chars ? `${p.chars} chars` : p.away ? "Away" : ""; return `<div class="pcell">${disc(p, "", ring)}<span class="nm ${p.isMe ? "me" : ""}">${esc(p.name)}</span><span class="st ${p.submitted ? "done" : p.typing ? "typing" : ""}">${st}</span></div>`; }).join("");
}
function liveLine(players) {
  const others = players.filter((p) => !p.isMe);
  const typing = others.filter((p) => p.typing).map((p) => `${p.name} typing (${p.chars})`);
  const done = others.filter((p) => p.submitted).map((p) => p.name);
  return [...typing, done.length ? `${done.join(", ")} locked in` : ""].filter(Boolean).join("  ·  ");
}
function standingsRows(players, delta) {
  return players.map((p) => {
    const prev = lastRanks[p.id]; const d = delta && prev && prev !== p.rank ? `<span class="delta ${prev > p.rank ? "up" : "down"}">${prev > p.rank ? "+" : "−"}${Math.abs(prev - p.rank)}</span>` : "";
    return `<div class="row ${p.isMe ? "me" : ""} ${p.rank === 1 && p.score > 0 ? "win" : ""}" data-k="${p.id}"><span class="rk">${p.rank === 1 && p.score > 0 ? I.crown : p.rank}</span>${disc(p, "sm")}<span class="nm">${esc(p.name)}${p.away ? "<small>Away</small>" : ""}</span>${flame(p.streak)}${d}<span class="pts ${p.score ? "" : "zero"}">${p.score}</span></div>`;
  }).join("");
}
function sideStandings(s, delta) { return `<div class="card fill"><div class="rowf" style="margin-bottom:10px"><p class="h3 grow">Standings</p><span class="small muted">${esc(s.topic)}</span></div><div class="list" id="lb">${standingsRows(s.players, delta)}</div></div>`; }

// ---------- playing (classic / chill) ----------
function renderPlaying() {
  const s = state, q = s.question, n = q.total, me = s.players.find((p) => p.isMe);
  Sound.music("play");
  if (roundKey !== q.index) {
    const inCount = s.mode === "timed" && serverNow() < s.round.startedAt + s.countdownMs;
    roundKey = q.index; draft = ""; boostArmed = false; tickSec = -1; countShown = -1;
    shell({
      hud: hudGame({ pill: `Q ${q.index + 1}/${n}`, mid: esc(s.topic), clock: s.mode === "timed" ? "" : null }),
      rail: meter(q.index, n),
      stage: `${qcard(q, n)}${ansbox()}<div class="locked hidden" id="lockedbox"></div><p class="live" id="live"></p><div class="strip" id="strip"></div>`,
      side: sideStandings(s, false),
      dock: `${boostBtn(me.doubleLeft)}<button class="btn flex1" id="lockbtn" ${inCount ? "disabled" : ""}>Lock in</button>${s.mode === "untimed" && s.isHost ? `<button class="btn ghost sm" id="forcebtn">Reveal</button>` : ""}`,
    });
    if (inCount) $("#ans")?.setAttribute("disabled", "");
    const submit = async () => {
      const text = ($("#ans")?.value || "").trim();
      if (text.length < 3) { toast("Type your answer first", "bad"); return $("#ans")?.focus(); }
      const btn = $("#lockbtn"); btn.disabled = true;
      showLocked(text, boostArmed); Sound.lock(); if (boostArmed) popAt($("#lockedbox"), "2×");
      document.activeElement?.blur();
      try { await api("answer", { ...session, q: q.index, text, double: boostArmed }); refresh(); }
      catch (e) { toast(e.message, "bad"); if (!/already/i.test(e.message)) { $("#lockedbox").classList.add("hidden"); $("#ansbox").classList.remove("hidden"); btn.disabled = false; btn.classList.remove("hidden"); $("#boostbtn")?.classList.remove("hidden"); } }
    };
    bindAnswer(q.index, submit); bindBoost(me.doubleLeft);
    $("#lockbtn").onclick = submit;
    $("#forcebtn")?.addEventListener("click", () => api("next", session).then(refresh).catch((e) => toast(e.message, "bad")));
    if (s.mode !== "timed") setTimeout(() => $("#ans")?.focus(), 250);
  }
  if (s.myAnswer && !$("#lockedbox").classList.contains("shown")) showLocked(s.myAnswer.text, s.myAnswer.double);
  $("#strip").innerHTML = stripCells(s.players);
  $("#live").textContent = liveLine(s.players);
  if ($("#lb")) flip($("#lb"), () => ($("#lb").innerHTML = standingsRows(s.players, false)));
  if (s.myAnswer) { const w = s.players.filter((p) => !p.submitted && !p.away).length; $("#dock .note")?.remove(); if (!$("#waitnote")) $("#dock").insertAdjacentHTML("afterbegin", `<p class="note" id="waitnote"></p>`); $("#waitnote").textContent = w ? `Waiting for ${plural(w, "player")}. Reveal comes the moment everyone is in.` : "Checking answers"; }
  if (s.mode === "untimed" && s.round.endsAt && !$("#clock")) {
    $("#sndbtn")?.insertAdjacentHTML("beforebegin", `<span class="clock" id="clock"></span>`);
    if (!s.myAnswer) { toast("Last call: 30 seconds to lock in"); Sound.timeup(); }
  }
  if (s.round.endsAt) timerLoop();
}
function showLocked(text, doubled) {
  const box = $("#lockedbox"); if (!box) return;
  $("#ansbox")?.classList.add("hidden"); $("#lockbtn")?.classList.add("hidden"); $("#boostbtn")?.classList.add("hidden"); $("#forcebtn")?.classList.add("hidden");
  box.classList.remove("hidden"); box.classList.add("shown");
  box.innerHTML = `<p class="t">${I.check}Locked in${doubled ? `<span class="tag pink">2× boost</span>` : ""}</p><p class="txt">${esc(text)}</p>`;
}
let timerRAF = null;
function timerLoop() {
  cancelAnimationFrame(timerRAF);
  const tick = () => {
    const s = state; if (!s || s.status !== "playing" || s.mode === "race" || !s.round?.endsAt) return;
    const timed = s.mode === "timed";
    const now = serverNow(), start = timed ? s.round.startedAt + s.countdownMs : s.round.endsAt - s.round.lastCallMs, total = timed ? s.secondsPerQ * 1000 : s.round.lastCallMs;
    const ov = $("#overlay");
    if (timed && now < start) {
      const left = Math.ceil((start - now) / 1000);
      if (countShown !== left) { countShown = left; ov.classList.add("on"); ov.innerHTML = `<div><div class="big">${left}</div><p class="sub">Question ${s.question.index + 1} of ${s.question.total}  ·  ${esc(s.question.label === "Boss" ? "Boss round" : s.question.label)}</p></div>`; Sound.count(); }
      $("#ans")?.setAttribute("disabled", ""); $("#lockbtn")?.setAttribute("disabled", "");
      setFuse(1); if ($("#clock")) $("#clock").textContent = s.secondsPerQ;
      timerRAF = requestAnimationFrame(tick); return;
    }
    if (timed && countShown !== 0) {
      countShown = 0; ov.innerHTML = `<div class="big go">GO</div>`; Sound.go(); setTimeout(() => ov.classList.remove("on"), 420);
      $("#ans")?.removeAttribute("disabled"); if (!s.myAnswer) { $("#lockbtn")?.removeAttribute("disabled"); $("#ans")?.focus(); }
    }
    const left = Math.max(0, s.round.endsAt - now), secs = Math.ceil(left / 1000), frac = left / total;
    const c = $("#clock"); if (c) { c.textContent = secs; c.classList.toggle("hot", left < 10000); }
    setFuse(frac, left < 10000);
    Sound.intensity(1 - frac);
    if (left <= 5000 && left > 0 && secs !== tickSec && !s.myAnswer) { tickSec = secs; Sound.tick(); }
    if (left <= 0) { if (!s.myAnswer && $("#lockbtn") && !$("#lockbtn").disabled) { $("#lockbtn").disabled = true; $("#lockbtn").textContent = "Time's up"; Sound.timeup(); } return; }
    timerRAF = requestAnimationFrame(tick);
  };
  timerRAF = requestAnimationFrame(tick);
}

// ---------- reveal ----------
function answerTags(a, i, all) {
  const tags = [];
  if (a.flag === "abuse") tags.push(`<span class="tag red">Hidden</span>`);
  if (a.flag === "injection") tags.push(`<span class="tag red">Not an answer</span>`);
  if (a.double) tags.push(`<span class="tag pink">2×</span>`);
  if (a.flawless) tags.push(`<span class="tag gold">Flawless</span>`);
  const fast = all.filter((x) => !x.skipped && (x.coverage || 0) >= 0.5 && x.ms != null).sort((x, y) => x.ms - y.ms)[0];
  if (fast && fast.playerId === a.playerId && all.length > 1) tags.push(`<span class="tag cyan">Fastest</span>`);
  if (a.streakAfter >= 2) tags.push(`<span class="tag gold">Streak ${a.streakAfter}</span>`);
  if (a.misFired) tags.push(`<span class="tag red">Myth</span>`);
  return tags.join("");
}
function answerRow(a, i, all, opts = {}) {
  const top = i === 0 && a.points > 0;
  const c = a.coverage || 0;
  const nk = (a.criteria || []).length || 3;
  const sub = a.skipped ? "No answer" : a.flag ? "0 points" : a.wrong ? "Not quite right" : `${keyHits(a)} of ${nk} key points`;
  return `<div class="row tap rin ${a.playerId === state?.me?.id || opts.me ? "me" : ""} ${top ? "win" : ""}" data-i="${i}" style="animation-delay:${opts.stagger ? (all.length - 1 - i) * 110 : 0}ms"><span class="rk">${top ? I.crown : i + 1}</span>${disc(a, "sm")}<span class="nm">${esc(a.name)}<small>${sub}</small><span class="tagrow">${answerTags(a, i, all)}</span></span><span class="bar"><i class="${lvl(c)}" data-w="${pct(c)}"></i></span><span class="pts ${a.points ? "" : "zero"}" data-p="${a.points || 0}">${a.skipped ? "0" : "+0"}</span></div>`;
}
// The player's own answer, marked green where it is right and red where it is wrong.
function markAnswer(a) {
  if (!a.parts?.length) return esc(a.text);
  return a.parts.map((x) => { const cls = x.bad >= 0.6 ? "bad" : x.ok >= 0.6 ? "good" : ""; return cls ? `<span class="mk ${cls}">${esc(x.t)}</span>` : esc(x.t); }).join("");
}
const hasMarks = (a) => a.parts?.some((x) => x.bad >= 0.6 || x.ok >= 0.6);
const legend = `<p class="legend"><span><i class="g"></i>Right</span><span><i class="b"></i>Wrong</span></p>`;
const keyHits = (a) => { if (a.hits != null) return a.hits; return (a.criteria || []).filter((c) => (c.p || 0) >= 0.7).length; };
const niceCrit = (t) => String(t).replace(/^(the\s+)?(learner|player)(['’]s)?\s+answer\s+/i, "").replace(/^(says|mentions|names|explains|gives|describes|identifies|states)( that)? /i, (m) => m[0].toUpperCase() + m.slice(1));
function answerDetail(a, rubric, keyPoints) {
  const crit = (a.criteria || rubric.map((text) => ({ text, p: 0 }))).map((c) => `<div class="tick ${lvl(c.p)}"><b>${lvl(c.p) === "pass" ? "✓" : lvl(c.p) === "part" ? "~" : "✕"}</b><span class="grow">${esc(c.text.replace(/^(says|mentions|names|explains|gives|describes|identifies|states)( that)? /i, (m) => m[0].toUpperCase() + m.slice(1)))}</span></div>`).join("");
  const mis = (a.misconceptions || []).filter((m) => m.p >= 0.5).map((m) => `<div class="tick miss"><b>!</b><span class="grow">Myth: ${esc(m.text)}</span></div>`).join("");
  const b = a.breakdown || {};
  const parts = a.skipped ? "" : `<div class="tagrow" style="margin:10px 0 4px">${b.base != null ? `<span class="tag">${b.base} base</span>` : ""}${b.mult ? `<span class="tag">×${b.mult} round</span>` : ""}${b.speed ? `<span class="tag cyan">+${b.speed} speed</span>` : ""}${b.streak ? `<span class="tag gold">+${b.streak} streak</span>` : ""}${b.double ? `<span class="tag pink">2× boost</span>` : ""}${a.ms != null ? `<span class="tag">${(a.ms / 1000).toFixed(1)}s</span>` : ""}</div>`;
  const flagNote = a.flag === "abuse" ? `<p class="small muted" style="margin-bottom:8px">This answer was hidden from other players for its language.</p>` : a.flag === "injection" ? `<p class="small muted" style="margin-bottom:8px">This answer talked to the scorer instead of answering, so it scored 0.</p>` : "";
  return `${flagNote}<div class="quote ${a.skipped || a.hidden ? "muted" : ""}">${a.skipped ? "No answer this round." : a.hidden ? "Hidden" : markAnswer(a)}</div>${!a.skipped && !a.hidden && hasMarks(a) ? legend : ""}${a.skipped || a.flag ? "" : `<p class="label">Key facts</p>${crit}${mis}`}${parts}
    ${keyPoints ? `<p class="label" style="margin-top:14px">A great answer covers</p><ul class="keylist">${keyPoints.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}`;
}
function animateRows(root) {
  $$(".row", root).forEach((row) => {
    const delay = parseFloat(row.style.animationDelay) || 0;
    setTimeout(() => { const bar = $(".bar i", row); if (bar) bar.style.width = bar.dataset.w; const p = $(".pts", row); const v = Number(p.dataset.p); if (v > 0) { countUp(p, v, 650, 0, (x) => "+" + x); } }, delay + 120);
  });
}
function renderReveal() {
  const s = state, q = s.question, r = s.reveal;
  Sound.music("lobby");
  const me = s.players.find((p) => p.isMe);
  const readyN = s.players.filter((p) => p.ready || p.away).length;
  if (roundKey === q.index + 1000) {
    if ($("#lb")) flip($("#lb"), () => ($("#lb").innerHTML = standingsRows(s.players, true)));
    updateReadyBtn(s, me, readyN); revealNote(); return;
  }
  roundKey = q.index + 1000;
  $("#overlay").classList.remove("on"); cancelAnimationFrame(timerRAF);
  const mine = r.answers.find((a) => a.playerId === s.me.id);
  const winner = r.answers[0]?.points > 0 ? r.answers[0] : null;
  const last = q.index + 1 >= q.total;
  shell({
    hud: hudGame({ pill: `Q ${q.index + 1}/${q.total}`, mid: esc(s.topic) }),
    rail: meter(q.index + 1, q.total, q.index + 1),
    stage: `${winner ? `<div class="banner">${I.crown}<div class="grow"><p class="t">${winner.playerId === s.me.id ? "You win this round" : `${esc(winner.name)} wins this round`}</p><p class="small muted">${esc(q.prompt)}</p></div></div>` : `<div class="banner cold"><div class="grow"><p class="t">Nobody scored. Tough one.</p><p class="small muted">${esc(q.prompt)}</p></div></div>`}
      <div class="list" id="answers">${r.answers.map((a, i) => answerRow(a, i, r.answers, { stagger: true })).join("")}</div>
      ${mine && !mine.skipped && !mine.flag ? `<div class="card tight mine-card hide-kb" id="minecard"><p class="small muted" style="margin-bottom:6px">Your answer</p><p style="line-height:1.55;margin-bottom:6px">${markAnswer(mine)}</p>${(mine.criteria || []).map((c) => `<div class="tick ${lvl(c.p)}"><b>${lvl(c.p) === "pass" ? "✓" : lvl(c.p) === "part" ? "~" : "✕"}</b><span class="grow">${esc(niceCrit(c.text))}</span></div>`).join("")}</div>` : ""}
      <p class="tiny muted center hide-kb">Tap any answer to see what it hit.</p>`,
    side: sideStandings(s, true),
    dock: `<button class="btn ghost sm" id="reactbtn" aria-label="React">${I.smile}</button><button class="btn ghost sm" id="standbtn">Standings</button><button class="btn flex1" id="readybtn">${s.isHost ? (last ? "Final results" : "Next round") : "Ready"}</button>`,
  });
  animateRows($("#answers"));
  const total = (r.answers.length - 1) * 110 + 500;
  setTimeout(() => {
    if (!mine) return;
    if (mine.points > 0) { Sound.coin(); popAt($(`#answers .row.me`) || $("#answers"), `+${mine.points}`); } else Sound.thud();
    if (winner && winner.playerId === s.me.id) confetti(40);
  }, total);
  Sound.reveal();
  lastRanks = Object.fromEntries(s.players.map((p) => [p.id, p.rank]));
  $("#answers").onclick = (e) => { const row = e.target.closest(".row"); if (!row) return; const a = r.answers[Number(row.dataset.i)]; Sound.click(); openSheet(`${esc(a.name)}  ·  ${a.skipped ? "0" : "+" + a.points}`, answerDetail(a, r.rubric, r.points)); };
  $("#standbtn").onclick = () => openSheet("Standings", `<div class="list">${standingsRows(s.players, true)}</div>`);
  $("#reactbtn").onclick = () => openTray((x) => { api("react", { ...session, text: x }).catch(() => {}); });
  $("#readybtn").onclick = async () => {
    Sound.click(); $("#readybtn").disabled = true;
    try { await api(s.isHost ? "next" : "ready", { ...session, q: q.index }); if (!s.isHost) $("#readybtn").textContent = "Ready"; refresh(); }
    catch (e) { toast(e.message, "bad"); $("#readybtn").disabled = false; }
  };
  updateReadyBtn(s, me, readyN); revealNote();
}
function updateReadyBtn(s, me, readyN) {
  const b = $("#readybtn"); if (!b || s.isHost) return;
  if (me.ready) { b.disabled = true; b.textContent = `Ready ${readyN}/${s.players.length}`; }
}
function revealNote() {
  const s = state; if (!s || s.status !== "reveal" || !s.revealAutoMs || !s.round?.revealedAt) return;
  const left = Math.max(0, Math.ceil((s.round.revealedAt + s.revealAutoMs - serverNow()) / 1000));
  setFuse(left / (s.revealAutoMs / 1000));
  clearTimeout(revealNote.t); if (left > 0) revealNote.t = setTimeout(revealNote, 250);
}

// ---------- race ----------
let raceTick = null;
function raceClock() {
  clearTimeout(raceTick);
  const s = state; if (!s || s.mode !== "race" || s.status !== "playing" || !s.raceEndsAt) return;
  if (!$("#clock")) $("#sndbtn")?.insertAdjacentHTML("beforebegin", `<span class="clock" id="clock"></span>`);
  const left = Math.max(0, s.raceEndsAt - serverNow()), secs = Math.ceil(left / 1000);
  const c = $("#clock"); if (c) { c.textContent = secs; c.classList.toggle("hot", left < 10000); }
  setFuse(left / 60000, left < 10000);
  if (left > 0) raceTick = setTimeout(raceClock, 250);
}
function renderRace() {
  const s = state, n = s.totalQuestions, me = s.players.find((p) => p.isMe);
  setTimeout(raceClock, 0);
  Sound.music("play"); Sound.intensity(Math.min(1, (me?.progress || 0) / n));
  const lanes = `<div class="lanes" id="lanes">${s.players.map((p) => `<div class="lane">${disc(p, "sm", p.typing ? "typing" : "")}<span style="width:74px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span><span class="track"><i class="${p.isMe ? "me" : ""}" style="width:${Math.min(100, (p.progress / n) * 100)}%"></i></span><span class="tiny muted" style="width:34px;text-align:right">${Math.min(p.progress, n)}/${n}</span></div>`).join("")}</div>`;
  if (raceShow && Date.now() < raceShow.until) {
    if (roundKey !== "rs" + raceShow.q) {
      roundKey = "rs" + raceShow.q;
      const g = raceShow.graded;
      shell({
        hud: hudGame({ pill: `Q ${raceShow.q + 1}/${n}`, mid: esc(s.topic) }), rail: meter(raceShow.q + 1, n, raceShow.q + 1),
        stage: `<div class="banner ${g.points ? "" : "cold"}">${g.points ? I.star : ""}<div class="grow"><p class="t">${g.points ? `+${g.points} points` : "0 points this time"}</p><p class="small muted">${g.flawless ? "Flawless answer" : g.wrong ? "Not quite right this time" : `${keyHits(g)} of ${(g.criteria || []).length || 3} key points`}${g.double ? "  ·  2× boost" : ""}</p></div></div>
          <div class="card fill" style="overflow:auto">${answerDetail(g, raceShow.rubric || [], null)}</div>${lanes}`,
        side: sideStandings(s, false),
        dock: `<button class="btn wide" id="nextq">${me.progress >= n ? "See standings" : "Next question"}</button>`,
      });
      if (g.points) { Sound.coin(); popAt($(".banner"), `+${g.points}`); } else Sound.thud();
      $("#nextq").onclick = () => { raceShow = null; roundKey = -1; render(); };
    } else { const l = $("#lanes"); if (l) l.outerHTML = lanes; }
    return;
  }
  if (s.finishedMine) {
    if (roundKey !== "done") { roundKey = "done"; shell({ hud: hudGame({ mid: esc(s.topic) }), stage: `<div class="banner">${I.star}<div class="grow"><p class="t">You reached the top</p><p class="small muted">Waiting for the others to finish.</p></div></div>${lanes}<div class="card fill"><div class="list" id="lb">${standingsRows(s.players, false)}</div></div>`, dock: `<button class="btn ghost sm" id="reactbtn">${I.smile}</button><p class="note">Final results appear when everyone is done.</p>` }); $("#reactbtn").onclick = () => openTray((x) => api("react", { ...session, text: x }).catch(() => {})); }
    else { const l = $("#lanes"); if (l) l.outerHTML = lanes; const lb = $("#lb"); if (lb) flip(lb, () => (lb.innerHTML = standingsRows(s.players, false))); }
    return;
  }
  const q = s.question;
  if (roundKey !== q.index) {
    roundKey = q.index; draft = ""; boostArmed = false;
    shell({
      hud: hudGame({ pill: `Q ${q.index + 1}/${n}`, mid: esc(s.topic) }), rail: meter(q.index, n),
      stage: `${qcard(q, n)}${ansbox()}${lanes}`, side: sideStandings(s, false),
      dock: `${boostBtn(me.doubleLeft)}<button class="btn flex1" id="lockbtn">Lock in</button>`,
    });
    const submit = async () => {
      const text = ($("#ans")?.value || "").trim();
      if (text.length < 3) { toast("Type your answer first", "bad"); return $("#ans")?.focus(); }
      const btn = $("#lockbtn"); btn.disabled = true; btn.innerHTML = `<span class="spin"></span>Checking`; Sound.lock();
      document.activeElement?.blur();
      try {
        const r = await api("answer", { ...session, q: q.index, text, double: boostArmed });
        raceShow = { q: q.index, graded: r.graded, rubric: r.graded.criteria?.map((c) => c.text), until: Date.now() + 60000 };
        await refresh();
      } catch (e) { toast(e.message, "bad"); btn.disabled = false; btn.textContent = "Lock in"; }
    };
    bindAnswer(q.index, submit); bindBoost(me.doubleLeft);
    $("#lockbtn").onclick = submit;
    setTimeout(() => $("#ans")?.focus(), 250);
  } else {
    const l = $("#lanes"); if (l) l.outerHTML = lanes;
    if ($("#lb")) flip($("#lb"), () => ($("#lb").innerHTML = standingsRows(s.players, false)));
  }
}

// ---------- finished ----------
function computeAwards(s) {
  const sum = s.summary || [], n = sum.length; if (!n) return [];
  const st = {}; s.players.forEach((p) => (st[p.id] = { id: p.id, name: p.name, avatar: p.avatar, rank: p.rank, answered: 0, cov: 0, ms: [], best: 0, flawless: 0, late: 0, words: 0, won: 0, myth: 0 }));
  const cum = {}; s.players.forEach((p) => (cum[p.id] = 0)); const midRank = {};
  const lateFrom = Math.floor((n * 2) / 3);
  sum.forEach((r, i) => {
    r.answers.forEach((a) => {
      const x = st[a.playerId]; if (!x) return;
      if (!a.skipped && !a.flag) { x.answered++; x.cov += a.coverage || 0; if (a.ms != null && (a.coverage || 0) >= 0.5) x.ms.push(a.ms); x.words += String(a.text || "").trim().split(/\s+/).filter(Boolean).length; }
      x.best = Math.max(x.best, a.streakAfter || 0); if (a.flawless) x.flawless++; if (i >= lateFrom) x.late += a.points || 0; if (a.misFired) x.myth++; cum[a.playerId] += a.points || 0;
    });
    if (r.answers[0]?.points > 0 && st[r.answers[0].playerId]) st[r.answers[0].playerId].won++;
    if (i === Math.floor((n - 1) / 2)) Object.keys(cum).sort((a, b) => cum[b] - cum[a]).forEach((id, j) => (midRank[id] = j + 1));
  });
  const list = Object.values(st);
  const catalog = [
    { t: "Speed demon", ic: I.bolt, m: (x) => (x.ms.length ? -avg(x.ms) : null), d: (x) => `Answered in ${(avg(x.ms) / 1000).toFixed(1)}s on average` },
    { t: "Walking encyclopedia", ic: I.book, m: (x) => (x.answered ? x.cov / x.answered : null), min: 0.5, d: (x) => `Covered ${Math.round((100 * x.cov) / x.answered)}% of all key points` },
    { t: "On fire", ic: I.flame, m: (x) => x.best, min: 2, d: (x) => `${x.best} great answers in a row` },
    { t: "Flawless", ic: I.star, m: (x) => x.flawless, min: 1, d: (x) => `${plural(x.flawless, "perfect answer")}` },
    { t: "Clutch player", ic: I.target, m: (x) => x.late, min: 1, d: (x) => `${x.late} points in the final rounds` },
    { t: "Certified yapper", ic: I.pen, m: (x) => x.words, min: 25, d: (x) => `${x.words} words written` },
    { t: "Comeback kid", ic: I.up, m: (x) => (midRank[x.id] || x.rank) - x.rank, min: 1, d: (x) => `Climbed ${plural((midRank[x.id] || x.rank) - x.rank, "place")} after halftime` },
    { t: "Round stealer", ic: I.crown, m: (x) => x.won, min: 2, d: (x) => `Won ${x.won} rounds` },
    { t: "Confidently wrong", ic: I.myth, m: (x) => x.myth, min: 1, d: (x) => `Believed ${plural(x.myth, "famous myth")}` },
  ];
  const out = [];
  if (list.length > 1 || n > 0) {
    for (const c of catalog) {
      const cands = list.map((x) => ({ x, v: c.m(x) })).filter((o) => o.v != null && o.v >= (c.min ?? -Infinity));
      if (!cands.length) continue;
      cands.sort((a, b) => b.v - a.v || a.x.rank - b.x.rank);
      if (cands.length > 1 && cands[0].v === cands[1].v && c.t !== "Speed demon") continue; // ties are no fun
      out.push({ title: c.t, icon: c.ic, detail: c.d(cands[0].x), id: cands[0].x.id, name: cands[0].x.name, avatar: cands[0].x.avatar });
    }
  }
  const got = new Set(out.map((a) => a.id));
  list.filter((x) => !got.has(x.id) && x.answered > 0).forEach((x) => out.push({ title: "Good sport", icon: I.hand, detail: `Played ${plural(x.answered, "round")}`, id: x.id, name: x.name, avatar: x.avatar }));
  return out;
}
function applyXp(gameId, gained, extra = {}) {
  if (profile.awarded.includes(gameId)) return null;
  const before = profile.xp;
  profile.xp += gained; profile.games += 1;
  if (extra.win) profile.wins += 1;
  profile.flawless += extra.flawless || 0;
  profile.bestStreak = Math.max(profile.bestStreak, extra.streak || 0);
  profile.awarded = [...profile.awarded, gameId].slice(-60);
  saveProfile();
  return { before, after: profile.xp };
}
function xpCard(x) {
  const a = levelInfo(x.before), b = levelInfo(x.after);
  return `<div class="card tight" id="xpcard"><div class="rowf"><p class="h3 grow">+<span id="xpgain">0</span> XP</p><span class="small muted" id="xplv">Level ${a.level}</span></div><div class="xpbar" style="margin-top:8px"><i id="xpfill" style="width:${(a.frac * 100).toFixed(1)}%"></i></div></div>`;
}
function animateXp(x) {
  const a = levelInfo(x.before), b = levelInfo(x.after);
  countUp($("#xpgain"), x.after - x.before, 900);
  setTimeout(() => {
    const fill = $("#xpfill"); if (!fill) return;
    if (b.level > a.level) {
      fill.style.width = "100%";
      setTimeout(() => { fill.style.transition = "none"; fill.style.width = "0%"; requestAnimationFrame(() => { fill.style.transition = ""; fill.style.width = (b.frac * 100).toFixed(1) + "%"; }); $("#xplv").textContent = `Level up! Level ${b.level}`; $("#xplv").style.color = "var(--gold)"; Sound.levelup(); }, 1200);
    } else fill.style.width = (b.frac * 100).toFixed(1) + "%";
  }, 400);
}
function renderFinished() {
  const s = state;
  Sound.music("win");
  if (roundKey === "fin") { const b = $("#againbtn"); if (b) b.disabled = false; return; }
  roundKey = "fin"; cancelAnimationFrame(timerRAF); $("#overlay").classList.remove("on");
  const me = s.players.find((p) => p.isMe), top = s.players.slice(0, 3), champ = top[0];
  const flaw = (s.summary || []).reduce((k, r) => k + (r.answers.find((a) => a.playerId === s.me.id)?.flawless ? 1 : 0), 0);
  const streak = (s.summary || []).reduce((k, r) => Math.max(k, r.answers.find((a) => a.playerId === s.me.id)?.streakAfter || 0), 0);
  const gained = Math.round((me?.score || 0) / 5) + 25 + (s.players.length > 1 ? [0, 60, 35, 20][me.rank] || 0 : 0) + flaw * 10;
  const xp = applyXp(s.gameId || `${s.code}:${s.games}`, gained, { win: me.rank === 1 && s.players.length > 1, flawless: flaw, streak });
  const awards = computeAwards(s);
  const pod = (p, cls, place) => (p ? `<div class="pod ${cls}"><span class="pl">${place}</span><span class="capw">${cls === "p1" ? `<span class="capdrop" style="display:block">${I.capOnly}</span>` : ""}${disc(p, cls === "p1" ? "lg" : "")}</span><span class="nm">${esc(p.name)}</span><span class="sc" data-p="${p.score}">0</span></div>` : `<div class="pod ${cls} empty"><span class="pl">${place}</span></div>`);
  shell({
    hud: hudGame({ mid: esc(s.topic) }), narrow: true,
    stage: `<div class="center"><p class="h1">${!champ || champ.score === 0 ? "Nobody scored" : top[1] && top[1].score === champ.score ? "It's a tie" : champ.isMe ? "You take the crown" : `${esc(champ.name)} takes the crown`}</p><p class="small muted">${me ? `You finished ${me.rank === 1 ? "first" : "#" + me.rank} with ${me.score} points` : ""}</p></div>
      <div class="podium ${top.length === 1 ? "one" : top.length === 2 ? "two" : ""}">${top.length >= 2 ? pod(top[1], "p2", "2nd") : ""}${pod(top[0], "p1", "1st")}${top.length >= 3 ? pod(top[2], "p3", "3rd") : ""}</div>
      ${xp ? xpCard(xp) : ""}
      <div class="list" id="awards">${awards.map((a) => `<div class="award ${a.id === s.me.id ? "mine" : ""}"><span class="ic">${a.icon}</span><div class="grow"><p class="h3">${a.title}</p><p class="small muted">${esc(a.name)}  ·  ${esc(a.detail)}</p></div></div>`).join("")}</div>`,
    dock: `<button class="btn ghost icon" id="sharebtn" aria-label="Share your result card">${I.share}</button><button class="btn violet flex1" id="chalbtn">Challenge</button>${s.isHost ? `<button class="btn flex1" id="againbtn">Rematch</button>` : ""}`,
  });
  $("#lights").classList.add("party");
  setTimeout(() => { Sound.win(); confetti(); }, 350);
  $$(".pod .sc").forEach((e, i) => setTimeout(() => countUp(e, Number(e.dataset.p), 900), 300 + i * 120));
  if (xp) animateXp(xp);
  $("#sharebtn").onclick = () => shareRoomResult();
  $("#chalbtn").onclick = () => challengeFlow();
  if (s.isHost) $("#againbtn").onclick = () => rematchSheet();
}
async function getChallenge() {
  if (state._challenge) return state._challenge;
  const r = await api("challenge", session); state._challenge = r.id; return r.id;
}
async function challengeFlow() {
  Sound.click();
  openSheet("Challenge anyone", `<div class="genstage" style="min-height:120px"><span class="spin"></span></div>`);
  try {
    const id = await getChallenge(); const me = state.players.find((p) => p.isMe);
    const url = `${ORIGIN}/c/${id}`;
    const text = `I scored ${me.score} on ${state.topic} in FactClash (#${me.rank} of ${state.players.length}). Same questions. No cap, can you beat me?`;
    openSheet("Challenge anyone", `<p class="muted" style="margin-bottom:12px">Anyone with this link plays the exact same questions and lands on your leaderboard. Great for friends who missed the game.</p>${shareButtons(null, null, "chsh")}<div class="quote small" style="margin-top:12px">${esc(text)} ${esc(url)}</div>`);
    bindShare("chsh", () => text, () => url);
  } catch (e) { closeSheet(); toast(e.message, "bad"); }
}
function rematchSheet() {
  const s = state;
  openSheet("Rematch", `<p class="muted" style="margin-bottom:14px">Same players, fresh questions. Scores reset. Keep the topic or try a new one.</p><div class="topicrow"><input class="field" id="rtopic" maxlength="60" value="${esc(s.topic)}" aria-label="Topic"><button class="ib dice" id="rdice" aria-label="Surprise me">${I.dice}</button></div><p class="err" id="rerr" style="margin-top:8px"></p>`, `<button class="btn wide" id="rgo">Back to lobby</button>`);
  bindDice($("#rdice"), $("#rtopic"));
  $("#rgo").onclick = async () => { $("#rgo").disabled = true; try { await api("again", { ...session, topic: $("#rtopic").value }); lastRanks = {}; closeSheet(); refresh(); prepAsked = 0; prepareQuestions(); } catch (e) { $("#rerr").textContent = e.message; $("#rgo").disabled = false; } };
}
function reviewSheet(i = 0) {
  const s = state, r = s.summary[i];
  openSheet(`Question ${i + 1} of ${s.summary.length}`, `<p class="small muted">${esc(r.label)}</p><p class="h3" style="margin:4px 0 12px">${esc(r.prompt)}</p><div class="list" id="rv">${r.answers.map((a, k) => answerRow(a, k, r.answers)).join("")}</div>`,
    `<button class="btn ghost flex1" id="rvp" ${i === 0 ? "disabled" : ""}>Previous</button><button class="btn ghost flex1" id="rvn" ${i >= s.summary.length - 1 ? "disabled" : ""}>Next</button>`);
  animateRows($("#rv"));
  $("#rvp").onclick = () => reviewSheet(i - 1); $("#rvn").onclick = () => reviewSheet(i + 1);
  $("#rv").onclick = (e) => { const row = e.target.closest(".row"); if (!row) return; const a = r.answers[Number(row.dataset.i)]; openSheet(`${esc(a.name)}  ·  +${a.points || 0}`, answerDetail(a, r.rubric, r.points), `<button class="btn ghost wide" id="rvb">Back</button>`); $("#rvb").onclick = () => reviewSheet(i); };
}

// ---------- in-room menu ----------
function roomMenu() {
  const s = state; if (!s) return;
  openSheet(`Room ${s.code}`, `<p class="small muted" style="margin-bottom:12px">${esc(s.topic)}  ·  ${{ timed: "Classic", untimed: "Chill", race: "Race" }[s.mode]}  ·  ${plural(s.totalQuestions, "question")}</p>
    ${shareButtons(null, null, "msh")}
    <p class="label" style="margin-top:16px">Players</p><div class="list">${s.players.map((p) => `<div class="row">${disc(p, "sm")}<span class="nm">${esc(p.name)}${p.isMe ? " (you)" : ""}<small>${[p.isHost ? "Host" : "", p.away ? "Away" : "", `Level ${p.level}`].filter(Boolean).join("  ·  ")}</small></span>${s.isHost && !p.isMe ? `<button class="btn xs ghost" data-kick="${p.id}">Remove</button>` : ""}</div>`).join("")}</div>
    <p class="err" id="merr" style="margin-top:8px"></p>`,
    `${s.status === "finished" && s.summary?.length ? `<button class="btn ghost flex1" id="mreview">Review answers</button>` : ""}${s.isHost && ["playing", "reveal"].includes(s.status) ? `<button class="btn ghost flex1" id="mend">End game</button>` : ""}<button class="btn ghost flex1" id="mleave">Leave room</button>`);
  bindShare("msh", inviteText, roomLink);
  $("#mleave").onclick = async () => { try { await api("leave", session); } catch {} saveSession(null); navigate("/"); };
  $("#mend")?.addEventListener("click", async () => { try { await api("end", session); closeSheet(); refresh(); } catch (e) { $("#merr").textContent = e.message; } });
  $("#mreview")?.addEventListener("click", () => reviewSheet(0));
  $$("#sheet [data-kick]").forEach((b) => (b.onclick = async () => { try { await api("kick", { ...session, target: b.dataset.kick }); closeSheet(); refresh(); } catch (e) { $("#merr").textContent = e.message; } }));
}

// =====================================================================
// share cards (image for WhatsApp status and stories)
// =====================================================================
const COLORS = ["#FFC83D", "#4F8CFF", "#35E39A", "#FF5C7A", "#B77CFF", "#FF9A3D", "#3DE0FF", "#FF6FC4", "#A6E35A", "#FFE066", "#7B8CFF", "#FF7F9F"];
async function drawCard(o) {
  try { await document.fonts.load("900 80px Archivo"); await document.fonts.load("600 40px Figtree"); } catch {}
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  let bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#241360"); bg.addColorStop(0.55, "#150A33"); bg.addColorStop(1, "#0E0626"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  let sp = g.createRadialGradient(W / 2, -120, 40, W / 2, -120, 1100); sp.addColorStop(0, "rgba(255,200,61,0.42)"); sp.addColorStop(1, "rgba(255,200,61,0)"); g.fillStyle = sp; g.fillRect(0, 0, W, H);
  let pk = g.createRadialGradient(0, 0, 10, 0, 0, 700); pk.addColorStop(0, "rgba(255,79,163,0.28)"); pk.addColorStop(1, "rgba(255,79,163,0)"); g.fillStyle = pk; g.fillRect(0, 0, W, H);
  // marquee bulbs
  for (let x = 60; x < W - 40; x += 40) { g.beginPath(); g.arc(x, 70, 7, 0, Math.PI * 2); g.fillStyle = "#FFE7A3"; g.shadowColor = "#FFC83D"; g.shadowBlur = 18; g.fill(); g.beginPath(); g.arc(x, H - 70, 7, 0, Math.PI * 2); g.fill(); }
  g.shadowBlur = 0;
  // logo
  const cap = (x, y, s) => { g.save(); g.translate(x, y); g.scale(s / 64, s / 64); g.fillStyle = "#FFC83D"; g.beginPath(); g.moveTo(9, 47); g.lineTo(5, 19); g.lineTo(19, 30); g.lineTo(32, 11); g.lineTo(45, 30); g.lineTo(59, 19); g.lineTo(55, 47); g.closePath(); g.fill(); [[5, 18], [32, 10], [59, 18]].forEach(([cx, cy]) => { g.beginPath(); g.arc(cx, cy, 3.6, 0, Math.PI * 2); g.fill(); }); g.fillStyle = "#E0A400"; g.beginPath(); g.roundRect(9, 49, 46, 8, 3); g.fill(); g.fillStyle = "#FF6FC4"; g.beginPath(); g.arc(32, 36, 5, 0, Math.PI * 2); g.fill(); g.restore(); };
  cap(W / 2 - 60, 150, 120);
  g.textAlign = "center"; g.fillStyle = "#FFC83D"; g.font = "900 104px Archivo, sans-serif"; g.fillText("FACTCLASH", W / 2, 390);
  g.fillStyle = "#C9B8FF"; g.font = "600 44px Figtree, sans-serif"; g.fillText(o.kicker, W / 2, 480);
  // title (wrap)
  g.fillStyle = "#FFFFFF"; g.font = "900 84px Archivo, sans-serif";
  const words = String(o.title).split(" "); let line = "", y = 590; const lines = [];
  for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > W - 160 && line) { lines.push(line); line = w; } else line = t; }
  lines.push(line); lines.slice(0, 3).forEach((l) => { g.fillText(l, W / 2, y); y += 96; });
  y += 30;
  if (o.big != null) { g.fillStyle = "#FFC83D"; g.font = "900 240px Archivo, sans-serif"; g.shadowColor = "rgba(255,200,61,.5)"; g.shadowBlur = 40; g.fillText(String(o.big), W / 2, y + 200); g.shadowBlur = 0; y += 250; g.fillStyle = "#F8F4FF"; g.font = "700 50px Figtree, sans-serif"; g.fillText(o.bigSub || "", W / 2, y + 30); y += 90; }
  if (o.podium) {
    const two = !o.podium[2], one = !o.podium[1];
    const slots = one ? [[null], [o.podium[0], W / 2, 150], [null]] : two ? [[o.podium[1], W / 2 - 170, 110], [o.podium[0], W / 2 + 170, 150], [null]] : [[o.podium[1], W / 2 - 300, 110], [o.podium[0], W / 2, 150], [o.podium[2], W / 2 + 300, 110]];
    const baseY = y + 230;
    slots.forEach(([p, x, r], k) => { if (!p) return; g.fillStyle = COLORS[(p.avatar ?? 0) % 12]; g.beginPath(); g.arc(x, baseY - (k === 1 ? 40 : 0), r * 0.62, 0, Math.PI * 2); g.fill(); g.fillStyle = "#1A0B38"; g.font = `900 ${k === 1 ? 64 : 48}px Archivo, sans-serif`; g.fillText(ini(p.name), x, baseY - (k === 1 ? 40 : 0) + (k === 1 ? 22 : 17)); if (k === 1) cap(x - 45, baseY - 190, 90); g.fillStyle = "#FFFFFF"; g.font = "700 40px Figtree, sans-serif"; g.fillText(p.name.slice(0, 12), x, baseY + 100); g.fillStyle = "#FFC83D"; g.font = "900 52px Archivo, sans-serif"; g.fillText(String(p.score), x, baseY + 160); });
    y = baseY + 290;
  }
  if (o.grid) { const sz = 78, gap = 14, tw = o.grid.length * sz + (o.grid.length - 1) * gap; let x = W / 2 - tw / 2; o.grid.forEach((v) => { g.fillStyle = v === 2 ? "#35E39A" : v === 1 ? "#FFC83D" : "rgba(255,255,255,.16)"; g.beginPath(); g.roundRect(x, y, sz, sz, 18); g.fill(); x += sz + gap; }); y += sz + 60; }
  if (o.lines) { g.fillStyle = "#F8F4FF"; g.font = "700 46px Figtree, sans-serif"; o.lines.forEach((l) => { g.fillText(l, W / 2, y); y += 66; }); }
  // footer: call to action + QR
  const fy = H - 420;
  g.fillStyle = "rgba(255,255,255,.07)"; g.beginPath(); g.roundRect(70, fy, W - 140, 300, 40); g.fill();
  g.textAlign = "left"; g.fillStyle = "#FFFFFF"; g.font = "900 58px Archivo, sans-serif"; g.fillText(o.cta || "Your turn.", 120, fy + 110);
  g.fillStyle = "#C9B8FF"; g.font = "600 38px Figtree, sans-serif"; g.fillText("No cap. Just facts.", 120, fy + 170);
  g.fillStyle = "#FFC83D"; g.font = "700 34px Figtree, sans-serif"; g.fillText(o.url.replace(/^https?:\/\//, ""), 120, fy + 230);
  try {
    const { q } = await qrSvg(o.url); const m = q.getModuleCount(), size = 230, cell = size / m, qx = W - 120 - size, qy = fy + 35;
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.roundRect(qx - 14, qy - 14, size + 28, size + 28, 20); g.fill(); g.fillStyle = "#140A2E";
    for (let r = 0; r < m; r++) for (let k = 0; k < m; k++) if (q.isDark(r, k)) g.fillRect(qx + k * cell, qy + r * cell, Math.ceil(cell), Math.ceil(cell));
  } catch {}
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}
async function shareImage(blob, text, url) {
  const file = new File([blob], "factclash.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text: `${text} ${url}` }); return; } catch (e) { if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "factclash.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  copyText(`${text} ${url}`, "Image saved. Caption copied too.");
}
async function shareRoomResult() {
  Sound.click();
  openSheet("Share your result", `<div class="genstage" style="min-height:140px"><span class="spin"></span><p class="small muted">Making your card</p></div>`);
  try {
    const s = state, me = s.players.find((p) => p.isMe), id = await getChallenge(), url = `${ORIGIN}/c/${id}`;
    const champ = s.players[0];
    const blob = await drawCard({ kicker: champ.isMe ? "I took the crown on" : `${champ.name} took the crown on`, title: s.topic, podium: s.players.slice(0, 3), lines: [`I finished #${me.rank} with ${me.score} points`], cta: "Beat our scores", url });
    const text = `I scored ${me.score} on ${s.topic} in FactClash (#${me.rank} of ${s.players.length}). Same questions, can you beat me?`;
    const img = URL.createObjectURL(blob);
    openSheet("Share your result", `<img src="${img}" alt="Your result card" style="width:min(56vw,240px);display:block;margin:0 auto 14px;border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.5)">${shareButtons(null, null, "rsh")}`, `<button class="btn wide" id="imgshare">${I.share}Share image</button>`);
    bindShare("rsh", () => text, () => url);
    $("#imgshare").onclick = () => shareImage(blob, text, url);
  } catch (e) { closeSheet(); toast(e.message || "Could not make the card", "bad"); }
}

// =====================================================================
// solo: Daily Clash and challenge links
// =====================================================================
let solo = null; // { kind, ref, key, token, st }
const soloKey = (kind, ref) => `kc:solo:${kind}:${ref}`;
async function soloIntro(kind, ref) {
  stopCurrent(); state = null;
  Sound.music("lobby");
  shell({ hud: hudHome(), narrow: true, stage: `<div class="genstage"><span class="spin"></span><p class="muted">Loading</p></div>` });
  let d;
  try { d = await api("solostate", { kind, ref, peek: true }); }
  catch (e) { toast(e.message, "bad"); return navigate("/", true); }
  if (d.status === "generating") { $("#main").innerHTML = `<div class="genstage"><div class="logo xl capdrop">${I.cap}</div><p class="h1">Today's questions are warming up</p><p class="muted">Give it a few seconds.</p></div>`; await sleep(3000); return soloIntro(kind, ref); }
  const rec = LS.get(soloKey(kind, d.ref), null);
  const isDaily = kind === "daily";
  const top = d.board?.top || [];
  const beat = !isDaily ? top[0] : null;
  shell({
    hud: hudHome(), narrow: true,
    stage: `<div class="daily"><p class="num">${isDaily ? `Daily Clash #${d.number}` : `${esc(d.host)} dares you`}</p><p class="topic">${esc(d.topic)}</p><p class="small muted">${plural(d.total, "question")}  ·  60 seconds each  ·  one 2× boost</p>${beat ? `<p class="small" style="margin-top:8px">Score to beat: <b style="color:var(--gold)">${beat.total}</b> by ${esc(beat.name)}</p>` : ""}</div>
      ${!profile.name ? `<div class="card">${nameField()}</div>` : ""}
      <div class="card fill"><div class="rowf" style="margin-bottom:10px"><p class="h3 grow">${isDaily ? "Today's leaderboard" : "Leaderboard"}</p><span class="small muted">${plural(d.board?.count || 0, "player")}</span></div>
        <div class="list">${top.length ? top.slice(0, 20).map((r) => `<div class="row ${r.isMe ? "me" : ""} ${r.rank === 1 ? "win" : ""}"><span class="rk">${r.rank === 1 ? I.crown : r.rank}</span>${disc({ name: r.name, avatar: r.avatar ?? (r.rank % 12) }, "sm")}<span class="nm">${esc(r.name)}<small>${r.finished ? "Finished" : `${r.done}/${d.total} answered`}${r.original ? "  ·  played live" : ""}</small></span><span class="pts">${r.total}</span></div>`).join("") : `<p class="muted small">Nobody yet. Set the score to beat.</p>`}</div></div>`,
    dock: `<button class="btn ghost sm" id="backbtn">${I.back}</button><button class="btn flex1" id="sgo">${rec?.finished ? "See my results" : rec?.cur ? "Continue" : "Start"}</button>`,
  });
  $("#backbtn").onclick = () => navigate("/");
  $("#sgo").onclick = async () => {
    const name = takeName(); if (!name) { toast("Enter your name first", "bad"); return $("#nm")?.focus(); }
    Sound.go(); soloStart(kind, d.ref);
  };
}
async function soloFetch(begin) {
  const d = await api("solostate", { kind: solo.kind, ref: solo.ref, device: profile.device, token: solo.token, name: profile.name, level: myLevel(), begin });
  if (d.token) { solo.token = d.token; }
  solo.st = d; timeOffset = d.serverTime - Date.now();
  LS.set(solo.key, { token: solo.token, cur: d.me.cur, total: d.me.total, finished: d.me.finished, rank: d.board?.me?.rank || null });
  return d;
}
async function soloStart(kind, ref) {
  stopCurrent();
  const key = soloKey(kind, ref), rec = LS.get(key, {});
  solo = { kind, ref, key, token: rec.token || null, st: null };
  let alive = true; stopCurrent = () => { alive = false; cancelAnimationFrame(timerRAF); };
  try { const d = await soloFetch(true); if (!alive) return; d.me.finished ? soloEnd() : soloQuestion(); }
  catch (e) { toast(e.message, "bad"); navigate("/", true); }
}
function soloQuestion() {
  const d = solo.st, q = d.question, n = d.total;
  Sound.music("play"); draft = ""; boostArmed = false; tickSec = -1;
  shell({
    hud: hudGame({ pill: `Q ${q.index + 1}/${n}`, mid: `${d.me.total} pts`, clock: "", menu: false }), rail: meter(q.index, n),
    stage: `${qcard(q, n)}${ansbox()}`,
    dock: `${boostBtn(!d.me.doubleUsed)}<button class="btn flex1" id="lockbtn">Lock in</button>`,
  });
  const submit = async () => {
    const text = ($("#ans")?.value || "").trim();
    if (text.length < 3) { toast("Type your answer first", "bad"); return $("#ans")?.focus(); }
    const btn = $("#lockbtn"); btn.disabled = true; btn.innerHTML = `<span class="spin"></span>Checking`; Sound.lock();
    document.activeElement?.blur(); cancelAnimationFrame(timerRAF);
    try {
      const r = await api("soloanswer", { kind: solo.kind, ref: solo.ref, device: profile.device, token: solo.token, q: q.index, text, double: boostArmed });
      soloResult(r, q);
    } catch (e) { toast(e.message, "bad"); btn.disabled = false; btn.textContent = "Lock in"; }
  };
  bindAnswer(q.index, submit); bindBoost(!d.me.doubleUsed);
  $("#lockbtn").onclick = submit;
  setTimeout(() => $("#ans")?.focus(), 250);
  const start = q.startedAt || serverNow(), total = d.limitMs;
  cancelAnimationFrame(timerRAF);
  const tick = () => {
    const left = Math.max(0, start + total - serverNow()), secs = Math.ceil(left / 1000);
    const c = $("#clock"); if (!c) return;
    c.textContent = secs; c.classList.toggle("hot", left < 10000); setFuse(left / total, left < 10000); Sound.intensity(1 - left / total);
    if (left <= 5000 && left > 0 && secs !== tickSec) { tickSec = secs; Sound.tick(); }
    if (left > 0) timerRAF = requestAnimationFrame(tick); else { c.textContent = "0"; $("#live")?.remove(); toast("Time's up. Lock in to keep going. No speed bonus now."); }
  };
  timerRAF = requestAnimationFrame(tick);
}
function soloResult(r, q) {
  const g = r.graded, n = solo.st.total, done = r.finished;
  Sound.music("lobby");
  shell({
    hud: hudGame({ pill: `Q ${q.index + 1}/${n}`, mid: `${r.total} pts`, menu: false }), rail: meter(q.index + 1, n, q.index + 1),
    stage: `<div class="banner ${g.points ? "" : "cold"}">${g.points ? I.star : ""}<div class="grow"><p class="t" id="rpts">${g.points ? "+0 points" : "0 points"}</p><p class="small muted">${g.flag ? "That was not an answer to the question." : g.flawless ? "Flawless. Every key point." : g.wrong ? "Not quite right this time." : `${keyHits(g)} of ${(g.criteria || []).length || 3} key points`}${g.double ? "  ·  2× boost" : ""}${g.streakAfter >= 2 ? `  ·  streak ${g.streakAfter}` : ""}</p></div></div>
      <div class="card fill" style="overflow-y:auto"><p class="small muted" style="margin-bottom:8px">${esc(q.prompt)}</p>${answerDetail({ ...g, name: profile.name }, r.rubric, r.points)}</div>`,
    dock: `<button class="btn wide" id="nextq">${done ? "See my score" : "Next question"}</button>`,
  });
  if (g.points) { countUp($("#rpts"), g.points, 600, 0, (x) => `+${x} points`); Sound.coin(); popAt($(".banner"), `+${g.points}`); } else Sound.thud();
  $("#nextq").onclick = async () => { Sound.click(); $("#nextq").disabled = true; try { const d = await soloFetch(!done); d.me.finished ? soloEnd() : soloQuestion(); } catch (e) { toast(e.message, "bad"); $("#nextq").disabled = false; } };
}
function soloGrid(answers, n) { return Array.from({ length: n }, (_, i) => { const a = answers[i]; return a ? (a.coverage >= 0.67 && !a.misFired && !a.flag ? 2 : a.points > 0 ? 1 : 0) : -1; }); }
function soloEnd() {
  const d = solo.st, isDaily = d.kind === "daily", n = d.total, me = d.me;
  const grid = soloGrid(me.answers, n);
  const rank = d.board?.me?.rank, count = d.board?.count || 1;
  Sound.music("win");
  // XP and daily streak, once
  const flaw = me.answers.filter((a) => a?.flawless).length, streak = me.answers.reduce((k, a) => Math.max(k, a?.streakAfter || 0), 0);
  const xp = applyXp(`${d.kind}:${d.ref}`, Math.round(me.total / 5) + 25 + flaw * 10, { flawless: flaw, streak });
  if (isDaily && xp) { profile.dailyStreak = profile.lastDaily === yesterday() ? profile.dailyStreak + 1 : profile.lastDaily === d.ref ? profile.dailyStreak : 1; profile.lastDaily = d.ref; saveProfile(); }
  const sq = grid.map((v) => (v === 2 ? "🟩" : v === 1 ? "🟨" : "⬛")).join("");
  const url = isDaily ? `${ORIGIN}/daily` : `${ORIGIN}/c/${d.ref}`;
  const text = isDaily ? `FactClash Daily #${d.number}: ${d.topic}\n${sq}\n${me.total} pts${rank ? `, #${rank} of ${count}` : ""}${profile.dailyStreak > 1 ? `, ${profile.dailyStreak} day streak` : ""}\nNo cap, can you beat me?` : `I scored ${me.total} on ${d.topic} in FactClash${rank ? ` (#${rank} of ${count})` : ""}. Same questions, can you beat me?`;
  shell({
    hud: hudHome(), narrow: true,
    stage: `<div class="center"><p class="small muted">${isDaily ? `Daily Clash #${d.number}` : "Challenge"}  ·  ${esc(d.topic)}</p><p class="bigscore" id="bigscore">0</p><p class="h3">${rank ? `#${rank} of ${plural(count, "player")}` : "points"}</p></div>
      <div class="rowf" style="justify-content:center"><div class="gridsq">${grid.map((v) => `<i class="${v === 2 ? "g2" : v === 1 ? "g1" : v === 0 ? "" : "gx"}"></i>`).join("")}</div></div>
      ${xp ? xpCard(xp) : ""}
      <div class="stats"><div class="stat"><b>${flaw}</b><span>Flawless</span></div><div class="stat"><b>${streak}</b><span>Best streak</span></div><div class="stat"><b>${isDaily ? profile.dailyStreak : count}</b><span>${isDaily ? "Day streak" : "Players"}</span></div></div>
      <div class="card fill"><div class="list">${(d.board?.top || []).slice(0, 20).map((r) => `<div class="row ${r.isMe ? "me" : ""} ${r.rank === 1 ? "win" : ""}"><span class="rk">${r.rank === 1 ? I.crown : r.rank}</span>${disc({ name: r.name, avatar: r.avatar ?? (r.rank % 12) }, "sm")}<span class="nm">${esc(r.name)}</span><span class="pts">${r.total}</span></div>`).join("")}</div></div>`,
    dock: `<button class="btn ghost sm" id="revbtn">Review</button><button class="btn ghost sm" id="cardbtn">${I.share}Card</button><button class="btn wa flex1" id="sharebtn">${I.chat}Share</button>`,
  });
  $("#lights").classList.add("party");
  countUp($("#bigscore"), me.total, 1100); setTimeout(() => { Sound.win(); confetti(60); }, 300);
  if (xp) animateXp(xp);
  $("#sharebtn").onclick = () => { Sound.click(); navigator.share ? shareText(text, url) : window.open(waLink(`${text}\n${url}`), "_blank", "noopener"); };
  $("#cardbtn").onclick = async () => {
    Sound.click(); openSheet("Share card", `<div class="genstage" style="min-height:140px"><span class="spin"></span></div>`);
    const blob = await drawCard({ kicker: isDaily ? `FactClash Daily #${d.number}` : "I took the challenge", title: d.topic, big: me.total, bigSub: rank ? `#${rank} of ${plural(count, "player")}` : "points", grid: grid.map((v) => Math.max(0, v)), cta: "Can you beat me?", url });
    openSheet("Share card", `<img src="${URL.createObjectURL(blob)}" alt="Your score card" style="width:min(56vw,240px);display:block;margin:0 auto;border-radius:16px">`, `<button class="btn wide" id="imgshare">${I.share}Share image</button>`);
    $("#imgshare").onclick = () => shareImage(blob, text.replace(/\n/g, " "), url);
  };
  $("#revbtn").onclick = () => soloReview(0);
}
function soloReview(i) {
  const rv = solo.st.review; if (!rv) return; const r = rv[i];
  openSheet(`Question ${i + 1} of ${rv.length}`, `<p class="small muted">${esc(r.label)}</p><p class="h3" style="margin:4px 0 12px">${esc(r.prompt)}</p>${r.mine ? `<p class="h3" style="color:var(--gold);margin-bottom:8px">+${r.mine.points}</p>${answerDetail({ ...r.mine, name: profile.name }, r.rubric, r.points)}` : ""}`,
    `<button class="btn ghost flex1" id="svp" ${i === 0 ? "disabled" : ""}>Previous</button><button class="btn ghost flex1" id="svn" ${i >= rv.length - 1 ? "disabled" : ""}>Next</button>`);
  $("#svp").onclick = () => soloReview(i - 1); $("#svn").onclick = () => soloReview(i + 1);
}

// =====================================================================
// go
// =====================================================================
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  try { const u = new URLSearchParams(location.search); if (u.get("s")) { const s = JSON.parse(atob(u.get("s"))); saveSession(s); if (u.get("n")) { profile.name = u.get("n"); profile.seenIntro = true; saveProfile(); } history.replaceState(null, "", `/r/${s.code}`); } } catch {}
}
boot();
})();
