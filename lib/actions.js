// Maps an action name + body to an engine function. Shared by Vercel and the local server.
import * as game from "./game.js";
import * as solo from "./solo.js";

const MUTATING = new Set(["join", "settings", "answer", "next", "ready", "again", "leave", "kick", "end"]);
export async function runAction(action, body, ip) {
  const out = await run(action, body, ip);
  if (MUTATING.has(action)) await game.notify(String(out?.code || body?.code || "").toUpperCase());
  return out;
}
async function run(action, body, ip) {
  const openai = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
  const jev = process.env.JEV_API_KEY;
  switch (action) {
    case "create": return game.createRoom(body, ip);
    case "join": return game.joinRoom(body, ip);
    case "peek": return game.peekRoom(body, ip);
    case "settings": return game.updateSettings(body);
    case "start": return game.startRoom(body, openai, ip);
    case "prepare": return game.prepareRoom(body, openai, ip);
    case "state": return game.getState(body, jev);
    case "typing": return game.typing(body);
    case "answer": return game.submitAnswer(body, jev);
    case "next": return game.nextRound(body);
    case "ready": return game.markReady(body);
    case "react": return game.react(body);
    case "again": return game.playAgain(body);
    case "leave": return game.leaveRoom(body, jev);
    case "kick": return game.kickPlayer(body, jev);
    case "end": return game.endGame(body);
    case "challenge": {
      const { room, players, scores } = await game.loadFinished(body);
      const id = await solo.createChallenge(room, players, scores);
      await game.persistRoom(room);
      return { id };
    }
    case "solostate": return solo.soloState(body, openai);
    case "soloanswer": return solo.soloAnswer(body, jev, ip);
    default: throw new game.GameError("Unknown action", 404);
  }
}

export function errorStatus(err) { return err?.status || 500; }
