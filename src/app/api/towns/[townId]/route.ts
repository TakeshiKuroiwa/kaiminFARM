import { fail, ok } from "@/lib/api-response";
import { getPublicTownSnapshot } from "@/server/services/town-visit-service";

type RouteContext = {
  params: Promise<{
    townId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { townId } = await context.params;
  const town = await getPublicTownSnapshot(townId);
  if (!town) {
    return fail("NOT_FOUND", "公開町が見つかりません。", 404);
  }
  return ok({ town });
}
