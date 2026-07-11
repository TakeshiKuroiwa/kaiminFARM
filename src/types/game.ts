export type PlayerId = string;
export type UnixTimeMs = number;

export type ResourceId = "wood" | "food" | "ore" | "dreamCotton";

export type Resources = Record<ResourceId, number>;

export type TownRank = "smallSettlement" | "slowVillage" | "fluffyTown";

export type PlayerProfile = {
  playerId: PlayerId;
  displayName: string;
  townName: string;
  townRank: TownRank;
  townLevel: number;
  lastCalculatedAt: UnixTimeMs;
  offlineLimitSeconds: number;
  isTownPublic: boolean;
  createdAt: UnixTimeMs;
  updatedAt: UnixTimeMs;
};

export type BuildingType =
  | "townHall"
  | "house"
  | "lumberYard"
  | "farm"
  | "mine"
  | "warehouse"
  | "park"
  | "expeditionBase";

export type BuildingStatus = "building" | "active" | "upgrading";

export type BuildingInstance = {
  instanceId: string;
  type: BuildingType;
  level: number;
  targetLevel?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  status: BuildingStatus;
  startedAt: UnixTimeMs;
  completeAt: UnixTimeMs | null;
};

export type Resident = {
  residentId: string;
  name: string;
  species: string;
  personality: string;
  friendship: number;
  skill: "farming" | "exploration" | "crafting" | "mining";
  status: "idle" | "expedition";
  joinedAt: UnixTimeMs;
};

export type Expedition = {
  expeditionId: string;
  areaId: "nearbyWoods" | "sleepyForest";
  memberIds: string[];
  startedAt: UnixTimeMs;
  completeAt: UnixTimeMs;
  status: "running" | "claimable" | "claimed";
  rewardSeed: string;
  claimedAt: UnixTimeMs | null;
};

export type OfflineReport = {
  elapsedSeconds: number;
  calculatedSeconds: number;
  gainedResources: Resources;
  diary: string[];
};

export type GameState = {
  serverTime: UnixTimeMs;
  profile: PlayerProfile;
  resources: Resources;
  buildings: BuildingInstance[];
  residents: Resident[];
  expeditions: Expedition[];
  offlineReport: OfflineReport;
};
