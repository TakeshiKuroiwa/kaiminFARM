import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { sha256 } from "@/lib/security/crypto";
import { hashPassword } from "@/lib/security/password";
import { passwordRecoverSchema } from "@/lib/validation/auth";
import {
  deleteRecoveryCodeHash,
  findPlayerIdByLoginId,
  findPlayerIdByRecoveryCodeHash,
  getAuthUser,
  saveAuthUser
} from "@/server/repositories/auth-repository";

export async function POST(request: NextRequest) {
  const parsed = passwordRecoverSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
  }

  const { loginId, recoveryCode, newPassword } = parsed.data;
  const playerIdByLogin = await findPlayerIdByLoginId(loginId);
  const recoveryHash = sha256(recoveryCode.trim());
  const playerIdByRecovery = await findPlayerIdByRecoveryCodeHash(recoveryHash);
  if (!playerIdByLogin || playerIdByLogin !== playerIdByRecovery) {
    return fail("UNAUTHORIZED", "ログインIDまたは復旧コードが正しくありません。", 401);
  }

  const user = await getAuthUser(playerIdByLogin);
  if (!user || user.status !== "active") {
    return fail("UNAUTHORIZED", "ログインIDまたは復旧コードが正しくありません。", 401);
  }

  await saveAuthUser({
    ...user,
    passwordHash: await hashPassword(newPassword),
    passwordUpdatedAt: Date.now(),
    sessionVersion: user.sessionVersion + 1
  });
  await deleteRecoveryCodeHash(recoveryHash);

  return ok({ recovered: true });
}
