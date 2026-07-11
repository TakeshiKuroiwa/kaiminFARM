import { ok } from "@/lib/api-response";

export async function POST() {
  return ok({ started: true });
}
