// Registry of question sets. Add a file under questions/ and list it here.
import everyday from "./everyday.js";
import nnLlm from "./nn-llm.js";

export const SETS = [everyday, nnLlm]; // first entry is the default in the UI

export const setById = new Map(SETS.map((s) => [s.id, s]));
export const publicSets = () => SETS.map(({ id, title, description, questions }) => ({ id, title, description, count: questions.length }));
