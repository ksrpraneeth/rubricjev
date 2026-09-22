// Maps an action name + body to a game function. Shared by Vercel and the local server.
import * as game from "./game.js";

export async function runAction(action, body) {
  const openai = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
  const jev = process.env.JEV_API_KEY;
  switch (action) {
    case "create": return game.createRoom(body);
    case "join": return game.joinRoom(body);
    case "settings": return game.updateSettings(body);
    case "start": if (!openai) throw new game.GameError("OPEN_AI_KEY is not configured", 500); return game.startRoom(body, openai);
    case "state": return game.getState(body, jev);
    case "typing": return game.typing(body);
    case "answer": return game.submitAnswer(body, jev);
    case "next": return game.nextRound(body);
    case "again": return game.playAgain(body);
    default: throw new game.GameError("Unknown action", 404);
  }
}

export function errorStatus(err) { return err?.status || 500; }
