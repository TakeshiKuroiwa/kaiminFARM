import { z } from "zod";

export const residentTalkSchema = z.object({
  residentId: z.string().trim().min(1)
});
