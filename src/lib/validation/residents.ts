import { z } from "zod";

export const residentTalkSchema = z.object({
  residentId: z.string().trim().min(1),
  eventId: z.string().trim().min(1).optional(),
  choiceId: z.enum(["a", "b"])
});
