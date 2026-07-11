import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { buildingBuildSchema } from "@/lib/validation/buildings";
import { buildBuilding, GameActionError } from "@/server/services/building-actions";
import { requireSession } from "@/server/services/session-service";
import type { BuildingType } from "@/types/game";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = buildingBuildSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
    }

    const gameState = await buildBuilding({
      playerId: session.playerId,
      requestId: parsed.data.requestId,
      buildingType: parsed.data.buildingType as BuildingType,
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
