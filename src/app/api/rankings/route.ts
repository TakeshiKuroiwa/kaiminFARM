import { fail, ok } from "@/lib/api-response";
import { ACTIVE_WORLD_EVENT } from "@/constants/game-master";
import { getEventRanking } from "@/server/services/world-event-service";
import { requireSession } from "@/server/services/session-service";

export async function GET() {
  try {
    await requireSession();
    return ok({ eventRanking: await getEventRanking(ACTIVE_WORLD_EVENT.eventId) });
  } catch {
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
