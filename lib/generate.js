// Generates a ladder of N rubric-graded questions on a topic using OpenAI, in two stages:
//   1. plan: one small call lists N distinct angles ordered easy -> expert (fast, tiny output)
//   2. expand: parallel calls, each turning a chunk of angles into full questions with rubrics
// Latency stays around 8-12 s regardless of N.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const CHUNK = 5;

export const LABELS = ["Warm-up", "Easy", "Getting there", "Solid", "Tricky", "Hard", "Expert", "Legendary"];
export const labelFor = (i, n) => LABELS[Math.min(LABELS.length - 1, Math.floor((i / Math.max(1, n - 1)) * (LABELS.length - 1)))];

async function chat(messages, schemaName, schema, apiKey) {
  const body = { model: MODEL, messages, response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } } };
  if (/^gpt-5/.test(MODEL)) body.reasoning_effort = "low";
  const res = await fetch(OPENAI_URL, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return { parsed: JSON.parse(data.choices[0].message.content), usage: data.usage, model: data.model };
}

const planSchema = {
  type: "object", additionalProperties: false,
  properties: { angles: { type: "array", items: { type: "object", additionalProperties: false, properties: { angle: { type: "string" }, why_harder: { type: "string" } }, required: ["angle", "why_harder"] } } },
  required: ["angles"],
};
const expandSchema = {
  type: "object", additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          prompt: { type: "string" },
          points: { type: "array", items: { type: "string" } },
          rubric: { type: "array", items: { type: "string" } },
          misconceptions: { type: "array", items: { type: "string" } },
        },
        required: ["prompt", "points", "rubric", "misconceptions"],
      },
    },
  },
  required: ["questions"],
};

export async function generateQuestions(topic, n, apiKey) {
  const t0 = Date.now();
  // Stage 1: plan the ladder
  const plan = await chat([
    { role: "system", content: `You design a ${n}-rung question ladder for a quiz game about a topic. Output exactly ${n} distinct angles, strictly ordered by difficulty.
Rung 1: a curious 10-year-old can answer. Middle rungs: an interested adult knows. Rung ${n}: expert-only, specific and verifiable (named things, mechanisms, history, numbers, techniques, causes).
Each angle is one short line naming what the question will ask about. No two angles may overlap. Difficulty comes from knowledge required, never from vagueness or opinion. "why_harder" is a few words on what makes this rung harder than the previous.` },
    { role: "user", content: `Topic: ${topic}\nRungs: ${n}` },
  ], "ladder_plan", planSchema, apiKey);
  const angles = plan.parsed.angles.slice(0, n);
  while (angles.length < n) angles.push({ angle: `${topic}: harder detail ${angles.length + 1}`, why_harder: "more specific" });

  // Stage 2: expand chunks in parallel
  const chunks = [];
  for (let i = 0; i < n; i += CHUNK) chunks.push(angles.slice(i, i + CHUNK).map((a, k) => ({ ...a, rung: i + k + 1 })));
  const system = `You write short-answer quiz questions graded by rubric, for a fast multiplayer game. Players answer in their own words in 2-5 sentences, on a phone, under time pressure.
You are given rungs of a ${n}-rung difficulty ladder about a topic (1 = a child can answer, ${n} = expert-only). Write one question per rung, matching its angle and difficulty exactly, in the order given.
Rules:
- Answerable from general knowledge of the topic. No trick wording, no yes/no, no list-everything questions. Prompts under 30 words. Vary the forms: why, how, what happens if, explain, compare.
- "points": 3-5 concrete facts a strong answer contains (the answer key).
- "rubric": 3-4 checks, each a positive predicate completing the sentence "The learner's answer ..." (e.g. "says that the heart has four chambers", "names at least two causes such as X or Y"). Checkable from the answer text alone. Never phrase a check negatively ("does not say"). Do not start with "The learner".
- "misconceptions": 0-2 popular wrong beliefs phrased the same way (e.g. "claims that lightning never strikes the same place twice"). Empty array if none is common.`;
  const results = await Promise.all(chunks.map((chunk) => chat([
    { role: "system", content: system },
    { role: "user", content: `Topic: ${topic}\nRungs to write (${chunk.length}):\n${chunk.map((a) => `Rung ${a.rung}/${n}: ${a.angle} (harder because: ${a.why_harder})`).join("\n")}` },
  ], "ladder_chunk", expandSchema, apiKey)));

  const questions = [];
  results.forEach((r, ci) => {
    const chunk = chunks[ci];
    r.parsed.questions.slice(0, chunk.length).forEach((q, k) => {
      const i = chunk[k].rung - 1;
      questions[i] = { id: `q${i + 1}`, index: i, difficulty: i + 1, label: labelFor(i, n), prompt: q.prompt, points: q.points.slice(0, 5), rubric: q.rubric.slice(0, 4), misconceptions: q.misconceptions.slice(0, 2) };
    });
  });
  const missing = questions.findIndex((q) => !q);
  if (questions.length < n || missing >= 0) throw new Error(`Model returned an incomplete ladder (missing rung ${missing + 1 || n})`);
  const usage = [plan.usage, ...results.map((r) => r.usage)].reduce((a, u) => ({ total_tokens: (a.total_tokens || 0) + (u?.total_tokens || 0) }), {});
  return { questions, model: results[0]?.model || plan.model, ms: Date.now() - t0, usage };
}
