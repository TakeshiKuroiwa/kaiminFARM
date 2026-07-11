import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { expeditionStartSchema } from "@/lib/validation/expeditions";
import { ExpeditionActionError, startExpedition } from "@/server/services/expedition-actions";
import { requireSession } from "@/server/services/session-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = expeditionStartSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
    }

    const state = await startExpedition(session.playerId, parsed.data.requestId, parsed.data.areaId, parsed.data.memberIds);
    return ok(state);
  } catch (error) {
    if (error instanceof ExpeditionActionError) {
      return fail(error.code, error.message, error.status);
    }
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
