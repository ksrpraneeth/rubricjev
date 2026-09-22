import { publicQuestions } from "../lib/grade.js";
export default function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json(publicQuestions(req.query?.set));
}
