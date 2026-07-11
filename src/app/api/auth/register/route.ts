import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { sha256, newId } from "@/lib/security/crypto";
import { hashPassword } from "@/lib/security/password";
import { generateRecoveryCode } from "@/lib/security/recovery-code";
import { registerSchema } from "@/lib/validation/auth";
import {
  reserveLoginId,
  saveAuthUser,
  saveRecoveryCodeHash
} from "@/server/repositories/auth-repository";
import { createInitialGameData } from "@/server/services/game-init";
import { createSession } from "@/server/services/session-service";
import type { AuthUser } from "@/types/auth";

export async function POST(request: NextRequest) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
  }

  const { loginId, password, displayName, townName } = parsed.data;
  const playerId = newId("player");
  const reserved = await reserveLoginId(loginId, playerId);
  if (!reserved) {
    return fail("CONFLICT", "このログインIDは使用できません。", 409);
  }

  const now = Date.now();
  const passwordHash = await hashPassword(password);
  const recoveryCode = generateRecoveryCode();
  const user: AuthUser = {
    playerId,
    passwordHash,
    createdAt: now,
    passwordUpdatedAt: now,
    status: "active",
    sessionVersion: 1
  };

  await saveAuthUser(user);
  await createInitialGameData({ playerId, displayName, townName, now });
  await saveRecoveryCodeHash(sha256(recoveryCode), playerId);
  await createSession(playerId, user.sessionVersion);

  return ok({
    player: { displayName, townName },
    recoveryCode
  });
}
