// Shared grading logic used by both the local server and the Vercel functions.
import { SETS, setById, publicSets } from "../questions/index.js";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
export { publicSets };

// Questions for one set, without rubric or reference points.
export function publicQuestions(setId) {
  const set = setById.get(setId) || SETS[0];
  return {
    sets: publicSets(),
    set: { id: set.id, title: set.title, description: set.description },
    questions: set.questions.map(({ id, topic, prompt }) => ({ id, topic, prompt })),
  };
}

export function buildRequest(q, answer) {
  const questions = {};
  q.rubric.forEach((c, i) => {
    questions[`c${i}`] = {
      type: "noul",
      instructions: `The learner's answer ${c}.`,
      criteria: {
        yes: "The learner's answer clearly does this, even if worded differently from the reference.",
        no: "The learner's answer does not do this, or gets it wrong.",
      },
    };
  });
  q.misconceptions.forEach((m, i) => {
    questions[`m${i}`] = { type: "noul", instructions: `The learner's answer ${m}.` };
  });
  questions.overall = {
    type: "score",
    instructions: "How well does the learner's answer cover the reference points, judged on correctness and completeness?",
    criteria: [
      "Missing, off-topic, or mostly wrong",
      "Partial: some key points, with gaps or errors",
      "Good: most key points, minor gaps, no serious errors",
      "Excellent: all key points, accurate and clear",
    ],
  };
  return {
    model: "jev-latest",
    state: { question: q.prompt, reference_points: q.points, learner_answer: answer },
    questions,
  };
}

export async function grade(q, answer, apiKey) {
  const t0 = performance.now();
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildRequest(q, answer)),
  });
  const ms = Math.round(performance.now() - t0);
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const a = data.answers;
  return {
    model: data.model,
    latency_ms: ms,
    usage: data.usage,
    criteria: q.rubric.map((text, i) => ({ text, p: a[`c${i}`]?.noul ?? null })),
    misconceptions: q.misconceptions.map((text, i) => ({ text, p: a[`m${i}`]?.noul ?? null })),
    overall: {
      score: a.overall?.score ?? null,
      confidence: a.overall?.confidence ?? null,
      probabilities: a.overall?.probabilities ?? null,
      legend: a.overall?.legend ?? null,
    },
  };
}

// Validates a grade request body. Returns { q, text } or { error, status }.
export function validate(body) {
  const set = setById.get(body?.set);
  if (!set) return { error: "Unknown question set", status: 404 };
  const q = set.questions.find((x) => x.id === body?.id);
  if (!q) return { error: "Unknown question", status: 404 };
  const text = String(body?.answer || "").trim();
  if (text.length < 10) return { error: "Write at least a sentence before grading.", status: 400 };
  return { q, text: text.slice(0, 4000) };
}
