import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { setJsonNx } from "@/lib/redis/kv";
import { worldEventContributeSchema } from "@/lib/validation/world-event";
import { getResources, saveResources } from "@/server/repositories/game-repository";
import { getSettledGameState } from "@/server/services/game-state";
import { hasEnoughResources, subtractResources } from "@/server/services/game-mechanics";
import { addWorldEventContribution } from "@/server/services/world-event-service";
import { requireSession } from "@/server/services/session-service";
import { keys } from "@/server/repositories/keys";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = worldEventContributeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
    }
    const reserved = await setJsonNx(keys.idempotency(session.playerId, parsed.data.requestId), { createdAt: Date.now() }, 60 * 5);
    if (!reserved) {
      return fail("CONFLICT", "同じ操作がすでに処理されています。", 409);
    }

    await getSettledGameState(session.playerId);
    const resources = await getResources(session.playerId);
    if (!resources) {
      return fail("NOT_FOUND", "ゲームデータが見つかりません。", 404);
    }
    const cost = { [parsed.data.resourceId]: parsed.data.amount };
    if (!hasEnoughResources(resources, cost)) {
      return fail("INSUFFICIENT_RESOURCES", "納品する資源が足りません。", 400);
    }

    let worldEvent;
    try {
      worldEvent = await addWorldEventContribution(session.playerId, parsed.data.resourceId, parsed.data.amount);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_RESOURCE") {
        return fail("INVALID_RESOURCE", "このイベントに納品できない資源です。", 400);
      }
      return fail("EVENT_CLOSED", "このイベントは終了しています。", 400);
    }
    await saveResources(session.playerId, subtractResources(resources, cost));

    return ok({ state: await getSettledGameState(session.playerId), worldEvent });
  } catch {
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
