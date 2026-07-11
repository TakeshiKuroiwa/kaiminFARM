import { z } from "zod";
import { BUILDABLE_BUILDING_TYPES, MAP_HEIGHT, MAP_WIDTH } from "@/constants/game-master";

export const buildingBuildSchema = z.object({
  requestId: z.string().trim().min(1).max(80),
  buildingType: z.enum(BUILDABLE_BUILDING_TYPES as [string, ...string[]]),
  x: z.number().int().min(0).max(MAP_WIDTH - 1),
  y: z.number().int().min(0).max(MAP_HEIGHT - 1)
});

export const buildingUpgradeSchema = z.object({
  requestId: z.string().trim().min(1).max(80),
  instanceId: z.string().trim().min(1)
});

export const buildingMoveSchema = z.object({
  requestId: z.string().trim().min(1).max(80),
  instanceId: z.string().trim().min(1),
  x: z.number().int().min(0).max(MAP_WIDTH - 1),
  y: z.number().int().min(0).max(MAP_HEIGHT - 1)
});
