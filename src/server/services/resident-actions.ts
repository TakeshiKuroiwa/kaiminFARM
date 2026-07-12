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

const TALK_COOLDOWN_MS = 5 * 60 * 1000;

export async function talkToResident(playerId: PlayerId, residentId: string, choiceId: "a" | "b", eventId?: string) {
  await getSettledGameState(playerId);
  const residents = await getResidents(playerId);
  const resident = residents.find((item) => item.residentId === residentId);
  if (!resident) {
    throw new ResidentActionError("NOT_FOUND", "住民が見つかりません。", 404);
  }
  if (resident.status !== "idle") {
    throw new ResidentActionError("INVALID_RESIDENT_STATE", "この住民とは今は会話できません。", 400);
  }

  const now = Date.now();
  if (resident.lastTalkedAt && now - resident.lastTalkedAt < TALK_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((TALK_COOLDOWN_MS - (now - resident.lastTalkedAt)) / 1000);
    throw new ResidentActionError("TALK_COOLDOWN", `少し前に話したばかりです。あと${Math.ceil(remainingSeconds / 60)}分ほど待ってください。`, 429);
  }

  const master = RESIDENT_MASTER.find((item) => item.templateId === resident.templateId);
  const talkEvents = master?.talkEvents ?? [];
  const event = talkEvents.find((item) => item.eventId === eventId) ?? talkEvents[(resident.friendship + new Date().getDate()) % talkEvents.length];
  const choice = event?.choices.find((item) => item.choiceId === choiceId);
  if (!event || !choice) {
    throw new ResidentActionError("BAD_REQUEST", "会話の選択肢を確認してください。", 400);
  }

  const nextResident = {
    ...resident,
    friendship: Math.min(100, resident.friendship + choice.friendshipGained),
    lastTalkedAt: now
  };
  const nextResidents = residents.map((item) => (item.residentId === residentId ? nextResident : item));
  await saveResidents(playerId, nextResidents);

  return {
    resident: nextResident,
    event,
    selectedChoice: choice,
    line: choice.response,
    friendshipGained: choice.friendshipGained,
    nextTalkAt: now + TALK_COOLDOWN_MS
  };
}
