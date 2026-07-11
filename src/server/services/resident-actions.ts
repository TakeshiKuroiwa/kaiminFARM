import { RESIDENT_MASTER } from "@/constants/game-master";
import type { PlayerId } from "@/types/game";
import { getResidents, saveResidents } from "../repositories/game-repository";
import { getSettledGameState } from "./game-state";

export class ResidentActionError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export async function talkToResident(playerId: PlayerId, residentId: string) {
  await getSettledGameState(playerId);
  const residents = await getResidents(playerId);
  const resident = residents.find((item) => item.residentId === residentId);
  if (!resident) {
    throw new ResidentActionError("NOT_FOUND", "住民が見つかりません。", 404);
  }
  if (resident.status !== "idle") {
    throw new ResidentActionError("INVALID_RESIDENT_STATE", "この住民とは今は会話できません。", 400);
  }

  const master = RESIDENT_MASTER.find((item) => item.templateId === resident.templateId);
  const linePool = master?.talkLines ?? ["今日ものんびりした一日ですね。"];
  const line = linePool[(resident.friendship + new Date().getDate()) % linePool.length];
  const now = Date.now();
  const nextResident = {
    ...resident,
    friendship: Math.min(100, resident.friendship + 1),
    lastTalkedAt: now
  };
  const nextResidents = residents.map((item) => (item.residentId === residentId ? nextResident : item));
  await saveResidents(playerId, nextResidents);

  return {
    resident: nextResident,
    line,
    friendshipGained: 1
  };
}
