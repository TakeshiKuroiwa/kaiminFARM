import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { playerPreferencesSchema } from "@/lib/validation/player-preferences";
import { getProfile, saveProfile } from "@/server/repositories/game-repository";
import { getSettledGameState } from "@/server/services/game-state";
import { requireSession } from "@/server/services/session-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = playerPreferencesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("BAD_REQUEST", "入力内容を確認してください。", 400);
    }

    const profile = await getProfile(session.playerId);
    if (!profile) {
      return fail("NOT_FOUND", "プロフィールが見つかりません。", 404);
    }

    await saveProfile({
      ...profile,
      kaiminOutfit: parsed.data.kaiminOutfit,
      updatedAt: Date.now()
    });
    return ok(await getSettledGameState(session.playerId));
  } catch {
    return fail("UNAUTHORIZED", "ログインが必要です。", 401);
  }
}
