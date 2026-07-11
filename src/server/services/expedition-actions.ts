import { EXPEDITION_AREAS } from "@/constants/game-master";
import { setJsonNx } from "@/lib/redis/kv";
import { newId, randomToken } from "@/lib/security/crypto";
import type { Expedition, PlayerId, Resources } from "@/types/game";
import {
  getBuildings,
  getExpeditions,
  getResources,
  getResidents,
  saveExpeditions,
  saveResources,
  saveResidents
} from "../repositories/game-repository";
import { keys } from "../repositories/keys";
import { getSettledGameState } from "./game-state";
import { addResources, hasEnoughResources, subtractResources } from "./game-mechanics";

export class ExpeditionActionError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export async function startExpedition(playerId: PlayerId, requestId: string, areaId: Expedition["areaId"], memberIds: string[]) {
  await reserveRequest(playerId, requestId);
  await getSettledGameState(playerId);

  const [buildings, residents, expeditions, resources] = await Promise.all([
    getBuildings(playerId),
    getResidents(playerId),
    getExpeditions(playerId),
    getResources(playerId)
  ]);
  if (!resources) {
    throw new ExpeditionActionError("NOT_FOUND", "ゲームデータが見つかりません。", 404);
  }
  if (!buildings.some((building) => building.type === "expeditionBase" && building.status === "active")) {
    throw new ExpeditionActionError("EXPEDITION_LOCKED", "探索隊本部が必要です。", 400);
  }

  const area = EXPEDITION_AREAS[areaId];
  if (!hasEnoughResources(resources, { food: area.foodCost })) {
    throw new ExpeditionActionError("INSUFFICIENT_RESOURCES", "探索に必要な食料が足りません。", 400);
  }

  const uniqueMemberIds = [...new Set(memberIds)];
  const members = uniqueMemberIds.map((memberId) => residents.find((resident) => resident.residentId === memberId));
  if (members.some((resident) => !resident || resident.status !== "idle")) {
    throw new ExpeditionActionError("INVALID_MEMBERS", "派遣できない住民が含まれています。", 400);
  }

  const now = Date.now();
  const expedition: Expedition = {
    expeditionId: newId("exp"),
    areaId,
    memberIds: uniqueMemberIds,
    startedAt: now,
    completeAt: now + area.durationSeconds * 1000,
    status: "running",
    rewardSeed: randomToken(12),
    claimedAt: null
  };
  const nextResidents = residents.map((resident) =>
    uniqueMemberIds.includes(resident.residentId) ? { ...resident, status: "expedition" as const } : resident
  );

  await Promise.all([
    saveResources(playerId, subtractResources(resources, { food: area.foodCost })),
    saveResidents(playerId, nextResidents),
    saveExpeditions(playerId, [...expeditions, expedition])
  ]);

  return getSettledGameState(playerId);
}

export async function claimExpedition(playerId: PlayerId, requestId: string, expeditionId: string) {
  await reserveRequest(playerId, requestId);
  await getSettledGameState(playerId);

  const [resources, residents, expeditions] = await Promise.all([getResources(playerId), getResidents(playerId), getExpeditions(playerId)]);
  if (!resources) {
    throw new ExpeditionActionError("NOT_FOUND", "ゲームデータが見つかりません。", 404);
  }
  const expedition = expeditions.find((item) => item.expeditionId === expeditionId);
  if (!expedition) {
    throw new ExpeditionActionError("NOT_FOUND", "探索が見つかりません。", 404);
  }
  if (expedition.status === "claimed") {
    throw new ExpeditionActionError("CONFLICT", "この探索報酬は受取済みです。", 409);
  }
  if (expedition.completeAt > Date.now()) {
    throw new ExpeditionActionError("EXPEDITION_RUNNING", "探索はまだ完了していません。", 400);
  }

  const rewards = calculateExpeditionReward(expedition);
  const nextExpeditions = expeditions.map((item) =>
    item.expeditionId === expeditionId ? { ...item, status: "claimed" as const, claimedAt: Date.now() } : item
  );
  const nextResidents = residents.map((resident) =>
    expedition.memberIds.includes(resident.residentId) ? { ...resident, status: "idle" as const } : resident
  );

  await Promise.all([
    saveResources(playerId, addResources(resources, rewards)),
    saveResidents(playerId, nextResidents),
    saveExpeditions(playerId, nextExpeditions)
  ]);

  return { state: await getSettledGameState(playerId), rewards };
}

export function calculateExpeditionReward(expedition: Expedition): Resources {
  const base = EXPEDITION_AREAS[expedition.areaId].rewards;
  const bonus = expedition.memberIds.length > 1 ? 1.15 : 1;
  return {
    wood: Math.floor((base.wood ?? 0) * bonus),
    food: Math.floor((base.food ?? 0) * bonus),
    ore: Math.floor((base.ore ?? 0) * bonus),
    dreamCotton: Math.floor((base.dreamCotton ?? 0) * bonus)
  };
}

async function reserveRequest(playerId: PlayerId, requestId: string) {
  const reserved = await setJsonNx(keys.idempotency(playerId, requestId), { createdAt: Date.now() }, 60 * 5);
  if (!reserved) {
    throw new ExpeditionActionError("CONFLICT", "同じ操作がすでに処理されています。", 409);
  }
}
