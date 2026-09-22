import { runAction, errorStatus } from "../../lib/actions.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(await runAction(req.query.action, req.body || {}));
  } catch (err) {
    if (errorStatus(err) >= 500) console.error(err);
    res.status(errorStatus(err)).json({ error: err.message });
  }
}
