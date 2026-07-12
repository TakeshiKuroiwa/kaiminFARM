import { BUILDING_MASTER, MAX_BUILDING_LEVEL } from "@/constants/game-master";
import { newId } from "@/lib/security/crypto";
import { setJsonNx } from "@/lib/redis/kv";
import type { BuildingInstance, BuildingType, PlayerId } from "@/types/game";
import {
  getBuildings,
  getResources,
  saveBuildings,
  saveResources
} from "../repositories/game-repository";
import { keys } from "../repositories/keys";
import { getSettledGameState } from "./game-state";
import {
  canPlaceBuilding,
  canUpgrade,
  getMissingResources,
  getUpgradeCost,
  getUpgradeSeconds,
  hasEnoughResources,
  subtractResources
} from "./game-mechanics";

type BuildInput = {
  playerId: PlayerId;
  requestId: string;
  buildingType: BuildingType;
  x: number;
  y: number;
};

type UpgradeInput = {
  playerId: PlayerId;
  requestId: string;
  instanceId: string;
};

type MoveInput = {
  playerId: PlayerId;
  requestId: string;
  instanceId: string;
  x: number;
  y: number;
};

export class GameActionError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown
  ) {
    super(message);
  }
}

export async function buildBuilding({ playerId, requestId, buildingType, x, y }: BuildInput) {
  await reserveRequest(playerId, requestId);
  await getSettledGameState(playerId);

  const [resources, buildings] = await Promise.all([getResources(playerId), getBuildings(playerId)]);
  if (!resources) {
    throw new GameActionError("NOT_FOUND", "ゲームデータが見つかりません。", 404);
  }

  const master = BUILDING_MASTER[buildingType];
  if (!hasEnoughResources(resources, master.cost)) {
    throw new GameActionError("INSUFFICIENT_RESOURCES", "建設に必要な資源が足りません。", 400, {
      cost: master.cost,
      missingResources: getMissingResources(resources, master.cost)
    });
  }

  const now = Date.now();
  const building: BuildingInstance = {
    instanceId: newId("bld"),
    type: buildingType,
    level: 1,
    x,
    y,
    width: master.width,
    height: master.height,
    status: master.buildSeconds > 0 ? "building" : "active",
    startedAt: now,
    completeAt: master.buildSeconds > 0 ? now + master.buildSeconds * 1000 : null
  };

  if (!canPlaceBuilding(buildings, building)) {
    throw new GameActionError("INVALID_PLACEMENT", "その場所には建設できません。", 400);
  }

  await Promise.all([
    saveResources(playerId, subtractResources(resources, master.cost)),
    saveBuildings(playerId, [...buildings, building])
  ]);

  return getSettledGameState(playerId);
}

export async function upgradeBuilding({ playerId, requestId, instanceId }: UpgradeInput) {
  await reserveRequest(playerId, requestId);
  await getSettledGameState(playerId);

  const [resources, buildings] = await Promise.all([getResources(playerId), getBuildings(playerId)]);
  if (!resources) {
    throw new GameActionError("NOT_FOUND", "ゲームデータが見つかりません。", 404);
  }

  const building = buildings.find((item) => item.instanceId === instanceId);
  if (!building) {
    throw new GameActionError("NOT_FOUND", "建物が見つかりません。", 404);
  }
  if (!canUpgrade(building)) {
    throw new GameActionError("INVALID_BUILDING_STATE", "この建物は強化できません。", 400);
  }

  const cost = getUpgradeCost(building);
  if (!hasEnoughResources(resources, cost)) {
    throw new GameActionError("INSUFFICIENT_RESOURCES", "強化に必要な資源が足りません。", 400, {
      cost,
      missingResources: getMissingResources(resources, cost)
    });
  }

  const now = Date.now();
  const nextBuildings = buildings.map((item) =>
    item.instanceId === instanceId
      ? {
          ...item,
          status: "upgrading" as const,
          targetLevel: Math.min(MAX_BUILDING_LEVEL, item.level + 1),
          startedAt: now,
          completeAt: now + getUpgradeSeconds(item) * 1000
        }
      : item
  );

  await Promise.all([saveResources(playerId, subtractResources(resources, cost)), saveBuildings(playerId, nextBuildings)]);
  return getSettledGameState(playerId);
}

export async function moveBuilding({ playerId, requestId, instanceId, x, y }: MoveInput) {
  await reserveRequest(playerId, requestId);
  await getSettledGameState(playerId);

  const buildings = await getBuildings(playerId);
  const building = buildings.find((item) => item.instanceId === instanceId);
  if (!building) {
    throw new GameActionError("NOT_FOUND", "建物が見つかりません。", 404);
  }
  if (building.status !== "active") {
    throw new GameActionError("INVALID_BUILDING_STATE", "建設中または強化中の建物は移動できません。", 400);
  }

  const candidate = { ...building, x, y };
  if (!canPlaceBuilding(buildings, candidate)) {
    throw new GameActionError("INVALID_PLACEMENT", "その場所には移動できません。", 400);
  }

  const nextBuildings = buildings.map((item) => (item.instanceId === instanceId ? candidate : item));
  await saveBuildings(playerId, nextBuildings);
  return getSettledGameState(playerId);
}

async function reserveRequest(playerId: PlayerId, requestId: string) {
  const reserved = await setJsonNx(keys.idempotency(playerId, requestId), { createdAt: Date.now() }, 60 * 5);
  if (!reserved) {
    throw new GameActionError("CONFLICT", "同じ操作がすでに処理されています。", 409);
  }
}
