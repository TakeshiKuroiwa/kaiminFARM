import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { residentTalkSchema } from "@/lib/validation/residents";
import { ResidentActionError, talkToResident } from "@/server/services/resident-actions";
import { requireSession } from "@/server/services/session-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = residentTalkSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
    }

    const result = await talkToResident(session.playerId, parsed.data.residentId);
    return ok(result);
  } catch (error) {
    if (error instanceof ResidentActionError) {
      return fail(error.code, error.message, error.status);
    }
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
