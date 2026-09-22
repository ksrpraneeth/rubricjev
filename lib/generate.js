// Generates a ladder of N rubric-graded questions on a topic using OpenAI.
// Difficulty ramps from 1 (a child could answer) to N (expert-only).

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

export const LABELS = ["Warm-up", "Easy", "Getting there", "Solid", "Tricky", "Hard", "Expert", "Legendary"];
export const labelFor = (i, n) => LABELS[Math.min(LABELS.length - 1, Math.floor((i / Math.max(1, n - 1)) * (LABELS.length - 1)))];

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          prompt: { type: "string", description: "The question, one or two sentences, answerable in 2-5 sentences of free text." },
          points: { type: "array", items: { type: "string" }, description: "3 to 5 reference answer points a strong answer contains." },
          rubric: { type: "array", items: { type: "string" }, description: "3 to 4 checks, each a predicate completing 'The learner's answer ...', e.g. 'says that X' or 'names at least two Y'." },
          misconceptions: { type: "array", items: { type: "string" }, description: "0 to 2 common wrong beliefs, each completing 'The learner's answer ...', e.g. 'claims that X'." },
        },
        required: ["prompt", "points", "rubric", "misconceptions"],
      },
    },
  },
  required: ["questions"],
};

export async function generateQuestions(topic, n, apiKey) {
  const system = `You write short-answer quiz questions that are graded by rubric, for a fast multiplayer game.
Players answer in their own words in 2-5 sentences, typed on a phone, under time pressure.

Produce exactly ${n} questions about the topic, strictly ordered by difficulty:
- Question 1 is so easy a curious 10-year-old answers it.
- The middle is what an interested adult knows.
- Question ${n} is expert-only: subtle, specific, the kind only a specialist or obsessive fan gets right.
Ramp smoothly; every question must be clearly harder than the one before.
Difficulty must come from knowledge, never from vagueness: the top third must ask about specific named things, mechanisms, history, numbers, techniques, or causes with verifiable answers. Never ask opinion or "what makes it special" questions.

Rules:
- Each question must be answerable from general knowledge of the topic, no trick wording, no yes/no questions, no list-everything questions.
- Questions must be independent; do not reveal answers to earlier or later questions.
- "points" are the reference answer key: 3-5 concrete facts a strong answer contains.
- "rubric" are 3-4 checks phrased as predicates that complete the sentence "The learner's answer ..." (e.g. "says that the heart has four chambers", "names at least two causes such as X or Y"). Each must be checkable from the answer text alone. Do not start with "The learner".
- "misconceptions" are 0-2 popular wrong beliefs, phrased the same way (e.g. "claims that lightning never strikes the same place twice"). Empty array if none is common.
- Keep prompts under 30 words. Vary the question forms: why, how, what happens if, explain, compare.`;

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Topic: ${topic}\nNumber of questions: ${n}` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "question_ladder", strict: true, schema } },
  };
  if (/^gpt-5/.test(MODEL)) body.reasoning_effort = "low";

  const t0 = Date.now();
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  const qs = parsed.questions.slice(0, n).map((q, i) => ({
    id: `q${i + 1}`,
    index: i,
    difficulty: i + 1,
    label: labelFor(i, n),
    prompt: q.prompt,
    points: q.points,
    rubric: q.rubric.slice(0, 4),
    misconceptions: q.misconceptions.slice(0, 2),
  }));
  if (qs.length < n) throw new Error(`Model returned ${qs.length} questions, expected ${n}`);
  return { questions: qs, model: data.model, ms: Date.now() - t0, usage: data.usage };
}
