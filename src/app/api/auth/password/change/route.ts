import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { passwordChangeSchema } from "@/lib/validation/auth";
import { getAuthUser, saveAuthUser } from "@/server/repositories/auth-repository";
import { logoutCurrentSession, requireSession } from "@/server/services/session-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
    }

    const user = await getAuthUser(session.playerId);
    if (!user) {
      return fail("UNAUTHORIZED", "ログインが必要です。", 401);
    }

    const validPassword = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!validPassword) {
      return fail("UNAUTHORIZED", "現在のパスワードが正しくありません。", 401);
    }

    await saveAuthUser({
      ...user,
      passwordHash: await hashPassword(parsed.data.newPassword),
      passwordUpdatedAt: Date.now(),
      sessionVersion: user.sessionVersion + 1
    });
    await logoutCurrentSession();

    return ok({ changed: true });
  } catch {
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
