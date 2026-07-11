import { fail, ok } from "@/lib/api-response";
import { sendGoodDream, TownVisitError } from "@/server/services/town-visit-service";
import { requireSession } from "@/server/services/session-service";

type RouteContext = {
  params: Promise<{
    townId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    const { townId } = await context.params;
    const town = await sendGoodDream(townId, session.playerId);
    return ok({ town });
  } catch (error) {
    if (error instanceof TownVisitError) {
      return fail(error.code, error.message, error.status);
    }
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
