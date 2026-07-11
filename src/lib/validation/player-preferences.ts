import { z } from "zod";

export const playerPreferencesSchema = z.object({
  kaiminOutfit: z.enum(["default", "nightcap", "festival"])
});
