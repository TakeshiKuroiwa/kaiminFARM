import { BUILDING_MASTER, INITIAL_RESOURCES } from "@/constants/game-master";
import { newId } from "@/lib/security/crypto";
import type { BuildingInstance, PlayerId, PlayerProfile } from "@/types/game";
import {
  saveBuildings,
  saveExpeditions,
  saveProfile,
  saveResidents,
  saveResources
} from "../repositories/game-repository";

type InitialGameInput = {
  playerId: PlayerId;
  displayName: string;
  townName: string;
  now: number;
};

export async function createInitialGameData({ playerId, displayName, townName, now }: InitialGameInput) {
  const townHallMaster = BUILDING_MASTER.townHall;
  const profile: PlayerProfile = {
    playerId,
    displayName,
    townName,
    townRank: "smallSettlement",
    townLevel: 1,
    lastCalculatedAt: now,
    offlineLimitSeconds: 60 * 60 * 8,
    isTownPublic: true,
    kaiminOutfit: "default",
    createdAt: now,
    updatedAt: now
  };

  const buildings: BuildingInstance[] = [
    {
      instanceId: newId("bld"),
      type: "townHall",
      level: 1,
      x: 4,
      y: 4,
      width: townHallMaster.width,
      height: townHallMaster.height,
      status: "active",
      startedAt: now,
      completeAt: null
    }
  ];

  await Promise.all([
    saveProfile(profile),
    saveResources(playerId, INITIAL_RESOURCES),
    saveBuildings(playerId, buildings),
    saveResidents(playerId, []),
    saveExpeditions(playerId, [])
  ]);

  return { profile, resources: INITIAL_RESOURCES, buildings };
}
