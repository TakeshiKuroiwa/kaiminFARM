import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { buildingMoveSchema } from "@/lib/validation/buildings";
import { GameActionError, moveBuilding } from "@/server/services/building-actions";
import { requireSession } from "@/server/services/session-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = buildingMoveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
    }

    const gameState = await moveBuilding({
      playerId: session.playerId,
      requestId: parsed.data.requestId,
      instanceId: parsed.data.instanceId,
      x: parsed.data.x,
      y: parsed.data.y
    });
    return ok(gameState);
  } catch (error) {
    if (error instanceof GameActionError) {
      return fail(error.code, error.message, error.status);
    }
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
