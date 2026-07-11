import { fail, ok } from "@/lib/api-response";
import { getProfile } from "@/server/repositories/game-repository";
import { getCurrentSession } from "@/server/services/session-service";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }

  const profile = await getProfile(session.playerId);
  return ok({ authenticated: true, profile });
}
