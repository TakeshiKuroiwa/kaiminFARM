import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { expeditionClaimSchema } from "@/lib/validation/expeditions";
import { claimExpedition, ExpeditionActionError } from "@/server/services/expedition-actions";
import { requireSession } from "@/server/services/session-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = expeditionClaimSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
    }

    const result = await claimExpedition(session.playerId, parsed.data.requestId, parsed.data.expeditionId);
    return ok(result);
  } catch (error) {
    if (error instanceof ExpeditionActionError) {
      return fail(error.code, error.message, error.status);
    }
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
