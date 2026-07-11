import { fail, ok } from "@/lib/api-response";
import { getSettledGameState } from "@/server/services/game-state";
import { requireSession } from "@/server/services/session-service";

export async function GET() {
  try {
    const { playerId } = await requireSession();
    const gameState = await getSettledGameState(playerId);
    if (!gameState) {
      return fail("NOT_FOUND", "ゲームデータが見つかりません。", 404);
    }
    return ok(gameState);
  } catch {
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
