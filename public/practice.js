const PASS = 0.7, PART = 0.4;
let questions = [], current = null, currentSet = null;
const store = {
  get() { try { return JSON.parse(localStorage.getItem("eib:" + currentSet) || "{}"); } catch { return {}; } },
  set(v) { try { localStorage.setItem("eib:" + currentSet, JSON.stringify(v)); } catch {} },
};
const $ = (id) => document.getElementById(id);
const level = (p) => p >= PASS ? "pass" : p >= PART ? "part" : "miss";
const pct = (p) => Math.round(p * 100) + "%";

function verdictOf(r) {
  const s = r.overall.score ?? 0;
  return s >= 2.5 ? ["pass", "Excellent"] : s >= 1.5 ? ["pass", "Good"] : s >= 0.75 ? ["part", "Partial"] : ["miss", "Missing"];
}

function renderNav() {
  const saved = store.get();
  const topics = [...new Set(questions.map((q) => q.topic))];
  $("nav").innerHTML = topics.map((t) => `<h2>${t}</h2>` + questions.filter((q) => q.topic === t).map((q) => {
    const r = saved[q.id]?.result;
    const cls = r ? verdictOf(r)[0] : "";
    return `<button data-id="${q.id}" class="${q.id === current?.id ? "active" : ""}"><span class="dot ${cls}"></span><span>${q.prompt}</span></button>`;
  }).join("")).join("");
  $("nav").querySelectorAll("button").forEach((b) => b.onclick = () => select(b.dataset.id));
  const graded = questions.filter((q) => saved[q.id]?.result).length;
  const good = questions.filter((q) => saved[q.id]?.result && verdictOf(saved[q.id].result)[0] === "pass").length;
  $("stats").textContent = `${graded}/${questions.length} graded · ${good} good or better`;
}

function select(id) {
  current = questions.find((q) => q.id === id);
  const saved = store.get()[id] || {};
  $("topic").textContent = current.topic;
  $("prompt").textContent = current.prompt;
  $("answer").value = saved.answer || "";
  $("err").textContent = "";
  saved.result ? renderResult(saved.result) : ($("result").innerHTML = '<p class="empty">Your rubric breakdown will appear here.</p>');
  renderNav();
  $("answer").focus();
}

function renderResult(r) {
  const [vcls, vtext] = verdictOf(r);
  const conf = r.overall.confidence != null ? ` · confidence ${pct(r.overall.confidence)}` : "";
  const crit = r.criteria.map((c) => {
    const l = level(c.p);
    const mark = l === "pass" ? "✓" : l === "part" ? "~" : "✗";
    return `<div class="crit"><span class="mark ${l}">${mark}</span><span>${c.text}</span><div class="bar ${l}"><i style="width:${pct(c.p)}"></i></div></div>`;
  }).join("");
  const mis = r.misconceptions.length ? r.misconceptions.map((m) => {
    const fired = m.p >= 0.5;
    return `<div class="crit"><span class="mark ${fired ? "miss" : "pass"}">${fired ? "!" : "✓"}</span><span>${fired ? "Detected: " : "Not present: "}${m.text}</span><div class="bar ${fired ? "miss" : "pass"}"><i style="width:${pct(m.p)}"></i></div></div>`;
  }).join("") : "";
  const probs = r.overall.probabilities ? `<div class="dist">${Object.entries(r.overall.probabilities).map(([k, v]) =>
    `<span><b><i style="width:${pct(v)}"></i></b>${["Missing", "Partial", "Good", "Excellent"][k]} ${pct(v)}</span>`).join("")}</div>` : "";
  $("result").innerHTML = `
    <div class="verdict"><span class="badge ${vcls}">${vtext}</span>
      <span class="meta">Overall ${r.overall.score?.toFixed(2)} / 3${conf} · graded in ${r.latency_ms} ms</span></div>
    ${probs}
    <h3>Rubric points</h3>${crit}
    ${mis ? `<h3>Misconception checks</h3>${mis}` : ""}
    <p class="hint">Bars show how clearly your answer covers each point. Green ≥ 70%, amber 40–70%, red below.</p>`;
}

async function gradeNow() {
  const answer = $("answer").value.trim();
  $("err").textContent = "";
  if (answer.length < 10) { $("err").textContent = "Write at least a sentence first."; return; }
  $("grade").disabled = true; $("grade").textContent = "Grading…";
  try {
    const res = await fetch("/api/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ set: currentSet, id: current.id, answer }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    const saved = store.get(); saved[current.id] = { answer, result: data }; store.set(saved);
    renderResult(data); renderNav();
  } catch (e) {
    $("err").textContent = e.message;
  } finally {
    $("grade").disabled = false; $("grade").textContent = "Grade my answer";
  }
}

$("grade").onclick = gradeNow;
$("next").onclick = () => { const i = questions.findIndex((q) => q.id === current.id); select(questions[(i + 1) % questions.length].id); };
$("answer").addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") gradeNow(); });
$("answer").addEventListener("input", () => { const s = store.get(); s[current.id] = { ...(s[current.id] || {}), answer: $("answer").value }; store.set(s); });

async function loadSet(setId) {
  const data = await fetch("/api/questions" + (setId ? "?set=" + encodeURIComponent(setId) : "")).then((r) => r.json());
  currentSet = data.set.id;
  questions = data.questions;
  $("setdesc").textContent = data.set.description;
  const sel = $("set");
  sel.innerHTML = data.sets.map((s) => `<option value="${s.id}" ${s.id === currentSet ? "selected" : ""}>${s.title} (${s.count})</option>`).join("");
  try { localStorage.setItem("eib:lastSet", currentSet); } catch {}
  select(questions[0].id);
}
$("set").onchange = (e) => loadSet(e.target.value);
let lastSet = null; try { lastSet = localStorage.getItem("eib:lastSet"); } catch {}
loadSet(new URLSearchParams(location.search).get("set") || lastSet);
