import "../lib/quiet.js";
import { renderOg } from "../lib/og.js";
export default async function handler(req, res) {
  try {
    const png = await renderOg(req.query || {});
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", req.query?.room ? "public, max-age=60" : "public, max-age=3600");
    res.status(200).end(png);
  } catch (err) { console.error(err); res.status(500).end("og error"); }
}
