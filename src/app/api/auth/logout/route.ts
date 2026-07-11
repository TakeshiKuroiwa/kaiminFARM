import { ok } from "@/lib/api-response";
import { logoutCurrentSession } from "@/server/services/session-service";

export async function POST() {
  await logoutCurrentSession();
  return ok({ loggedOut: true });
}
