import { fail, ok } from "@/lib/api-response";
import { getAuthUser, saveAuthUser } from "@/server/repositories/auth-repository";
import { logoutCurrentSession, requireSession } from "@/server/services/session-service";

export async function POST() {
  try {
    const { playerId } = await requireSession();
    const user = await getAuthUser(playerId);
    if (!user) {
      return fail("UNAUTHORIZED", "ログインが必要です。", 401);
    }
    await saveAuthUser({ ...user, sessionVersion: user.sessionVersion + 1 });
    await logoutCurrentSession();
    return ok({ loggedOut: true });
  } catch {
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
