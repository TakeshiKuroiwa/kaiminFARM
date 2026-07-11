import { z } from "zod";

export const worldEventContributeSchema = z.object({
  requestId: z.string().trim().min(1).max(80),
  eventId: z.string().trim().min(1),
  resourceId: z.enum(["wood", "food", "ore", "dreamCotton"]),
  amount: z.number().int().positive().max(100000)
});
