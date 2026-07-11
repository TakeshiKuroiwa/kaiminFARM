import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { verifyPassword } from "@/lib/security/password";
import { loginSchema } from "@/lib/validation/auth";
import {
  findPlayerIdByLoginId,
  getAuthUser
} from "@/server/repositories/auth-repository";
import { getProfile } from "@/server/repositories/game-repository";
import { createSession } from "@/server/services/session-service";

const LOGIN_ERROR = "IDまたはパスワードが正しくありません。";

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("BAD_REQUEST", LOGIN_ERROR, 400);
  }

  const { loginId, password } = parsed.data;
  const playerId = await findPlayerIdByLoginId(loginId);
  if (!playerId) {
    return fail("UNAUTHORIZED", LOGIN_ERROR, 401);
  }

  const user = await getAuthUser(playerId);
  if (!user || user.status !== "active") {
    return fail("UNAUTHORIZED", LOGIN_ERROR, 401);
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return fail("UNAUTHORIZED", LOGIN_ERROR, 401);
  }

  await createSession(playerId, user.sessionVersion);
  const profile = await getProfile(playerId);

  return ok({
    displayName: profile?.displayName ?? "",
    townName: profile?.townName ?? ""
  });
}
