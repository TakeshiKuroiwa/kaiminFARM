import { z } from "zod";

export const expeditionStartSchema = z.object({
  requestId: z.string().trim().min(1).max(80),
  areaId: z.enum(["nearbyWoods", "sleepyForest"]),
  memberIds: z.array(z.string().trim().min(1)).min(1).max(3)
});

export const expeditionClaimSchema = z.object({
  requestId: z.string().trim().min(1).max(80),
  expeditionId: z.string().trim().min(1)
});
