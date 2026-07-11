import { EMPTY_RESOURCES } from "@/constants/game-master";
import type { GameState, Resources } from "@/types/game";
import {
  getBuildings,
  getExpeditions,
  getProfile,
  getResources,
  getResidents,
  saveProfile,
  saveResources
} from "../repositories/game-repository";

function addResources(left: Resources, right: Resources): Resources {
  return {
    wood: left.wood + right.wood,
    food: left.food + right.food,
    ore: left.ore + right.ore,
    dreamCotton: left.dreamCotton + right.dreamCotton
  };
}

export async function getSettledGameState(playerId: string): Promise<GameState | null> {
  const now = Date.now();
  const [profile, resources, buildings, residents, expeditions] = await Promise.all([
    getProfile(playerId),
    getResources(playerId),
    getBuildings(playerId),
    getResidents(playerId),
    getExpeditions(playerId)
  ]);

  if (!profile || !resources) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - profile.lastCalculatedAt) / 1000));
  const calculatedSeconds = Math.min(elapsedSeconds, profile.offlineLimitSeconds);
  const gainedResources: Resources = { ...EMPTY_RESOURCES };

  for (const building of buildings) {
    if (building.status !== "active") {
      continue;
    }
    if (building.type === "lumberYard") {
      gainedResources.wood += Math.floor(0.0333 * calculatedSeconds);
    }
    if (building.type === "farm") {
      gainedResources.food += Math.floor(0.025 * calculatedSeconds);
    }
    if (building.type === "mine") {
      gainedResources.ore += Math.floor(0.0083 * calculatedSeconds);
    }
  }

  const nextResources = addResources(resources, gainedResources);
  const nextProfile = {
    ...profile,
    lastCalculatedAt: now,
    updatedAt: now
  };

  if (calculatedSeconds > 0) {
    await Promise.all([saveResources(playerId, nextResources), saveProfile(nextProfile)]);
  }

  const diary = buildDiary(gainedResources, calculatedSeconds);

  return {
    serverTime: now,
    profile: nextProfile,
    resources: nextResources,
    buildings,
    residents,
    expeditions,
    offlineReport: {
      elapsedSeconds,
      calculatedSeconds,
      gainedResources,
      diary
    }
  };
}

function buildDiary(gained: Resources, calculatedSeconds: number) {
  const diary: string[] = [];
  if (calculatedSeconds <= 0) {
    return diary;
  }
  if (gained.wood > 0) {
    diary.push(`伐採所で木材が${gained.wood}個集まりました。`);
  }
  if (gained.food > 0) {
    diary.push(`畑で食料が${gained.food}個収穫されました。`);
  }
  if (gained.ore > 0) {
    diary.push(`採掘場から鉱石が${gained.ore}個届きました。`);
  }
  diary.push("kaiminちゃんが町役場の前で手を振っていました。");
  return diary.slice(0, 5);
}
