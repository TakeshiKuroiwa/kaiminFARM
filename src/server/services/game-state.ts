import { BUILDING_MASTER, EMPTY_RESOURCES } from "@/constants/game-master";
import type { GameState, Resources } from "@/types/game";
import {
  getBuildings,
  getExpeditions,
  getProfile,
  getResources,
  getResidents,
  saveProfile,
  saveResources,
  saveBuildings
} from "../repositories/game-repository";
import {
  addResources,
  calculateGainedResources,
  calculateOfflineLimitSeconds,
  calculateProduction,
  calculateTownRank,
  calculateTownStats,
  completeTimedBuildings
} from "./game-mechanics";

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
  const completion = completeTimedBuildings(buildings, now);
  const stats = calculateTownStats(completion.buildings);
  const gainedResources =
    calculatedSeconds > 0
      ? calculateGainedResources(calculateProduction(completion.buildings, profile), calculatedSeconds)
      : { ...EMPTY_RESOURCES };

  const nextResources = addResources(resources, gainedResources);
  const nextProfile = {
    ...profile,
    townRank: calculateTownRank(stats),
    offlineLimitSeconds: calculateOfflineLimitSeconds(completion.buildings),
    lastCalculatedAt: now,
    updatedAt: now
  };

  if (calculatedSeconds > 0 || completion.completedNames.length > 0 || nextProfile.townRank !== profile.townRank) {
    await Promise.all([
      saveResources(playerId, nextResources),
      saveProfile(nextProfile),
      saveBuildings(playerId, completion.buildings)
    ]);
  }

  const diary = buildDiary(gainedResources, calculatedSeconds, completion.completedNames);

  return {
    serverTime: now,
    profile: nextProfile,
    resources: nextResources,
    buildings: completion.buildings,
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

function buildDiary(gained: Resources, calculatedSeconds: number, completedNames: string[]) {
  const diary: string[] = [];
  if (calculatedSeconds <= 0) {
    return completedNames.map((name) => `${name}が完成しました。`).slice(0, 5);
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
  for (const name of completedNames) {
    diary.push(`${name}が完成しました。`);
  }
  const activeProductionCount = Object.entries(gained).filter(([, amount]) => amount > 0).length;
  if (activeProductionCount === 0) {
    diary.push("町は静かに朝を迎えました。");
  }
  diary.push("kaiminちゃんが町役場の前で手を振っていました。");
  if (completedNames.some((name) => name === BUILDING_MASTER.park.name)) {
    diary.push("kaiminちゃんが新しい公園でうとうとしていました。");
  }
  return diary.slice(0, 5);
}
