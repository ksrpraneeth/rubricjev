# Explain It Back — rubric grading with Jev

Pluggable sets of short-answer questions. Ships with **Everyday knowledge** (money, health, kitchen, safety, the world) and **Neural networks and LLMs**. The learner explains a concept in their own words and Jev (TypeSafe AI) grades every rubric point, checks for common misconceptions, and gives an overall level, all in one call.

## Run

```
node --env-file=.env server.js
```

Then open http://localhost:3000. Requires Node 20+ and a `JEV_API_KEY` in `.env`. No npm install needed.

## How grading works

For each question the server sends Jev:

- **state**: the question, the reference points, and the learner's answer
- one **noul** per rubric point ("The learner's answer states that…")
- one **noul** per misconception ("The learner's answer wrongly claims…")
- one **score** question, 0–3, for the overall level

Rubric points and reference answers never reach the browser.

## Adding a question set

1. Copy `questions/everyday.js` to `questions/<your-set>.js` and edit `id`, `title`, `description` and the questions.
2. Register it in `questions/index.js` by adding it to the `SETS` array. The first entry is the default.
3. Redeploy. The set appears in the picker at the top of the page, and can be linked directly with `?set=<id>`.

Each question needs `id`, `topic`, `prompt`, `points` (the answer key), `rubric` (3–4 checks phrased as "The learner's answer …"), and `misconceptions` (checks that should come back no; can be empty).
