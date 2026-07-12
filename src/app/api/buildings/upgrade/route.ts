import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { buildingUpgradeSchema } from "@/lib/validation/buildings";
import { GameActionError, upgradeBuilding } from "@/server/services/building-actions";
import { requireSession } from "@/server/services/session-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = buildingUpgradeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
    }

    const gameState = await upgradeBuilding({
      playerId: session.playerId,
      requestId: parsed.data.requestId,
      instanceId: parsed.data.instanceId
    });
    return ok(gameState);
  } catch (error) {
    if (error instanceof GameActionError) {
      return fail(error.code, error.message, error.status, undefined, error.details);
    }
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
