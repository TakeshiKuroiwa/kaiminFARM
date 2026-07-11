import { fail, ok } from "@/lib/api-response";
import { getWorldEventState } from "@/server/services/world-event-service";
import { requireSession } from "@/server/services/session-service";

export async function GET() {
  try {
    const session = await requireSession();
    return ok(await getWorldEventState(session.playerId));
  } catch {
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
