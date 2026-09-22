import { streamRoom } from "../lib/stream.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  await streamRoom(req, res, body, process.env.JEV_API_KEY);
}
