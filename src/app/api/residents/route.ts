import { fail, ok } from "@/lib/api-response";
import { getSettledGameState } from "@/server/services/game-state";
import { requireSession } from "@/server/services/session-service";

export async function GET() {
  try {
    const { playerId } = await requireSession();
    const state = await getSettledGameState(playerId);
    return ok({ residents: state?.residents ?? [] });
  } catch {
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
