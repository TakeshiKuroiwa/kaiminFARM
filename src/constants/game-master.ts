import type { BuildingType, Resources } from "@/types/game";

export const SESSION_COOKIE_NAME = "kaimin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * 15;

export const INITIAL_RESOURCES: Resources = {
  wood: 120,
  food: 80,
  ore: 0,
  dreamCotton: 10
};

export const EMPTY_RESOURCES: Resources = {
  wood: 0,
  food: 0,
  ore: 0,
  dreamCotton: 0
};

export type BuildingMaster = {
  type: BuildingType;
  name: string;
  width: number;
  height: number;
  buildSeconds: number;
  cost: Partial<Resources>;
  productionPerSecond?: Partial<Resources>;
};

export const BUILDING_MASTER: Record<BuildingType, BuildingMaster> = {
  townHall: {
    type: "townHall",
    name: "町役場",
    width: 2,
    height: 2,
    buildSeconds: 0,
    cost: {}
  },
  house: {
    type: "house",
    name: "住宅",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 50 }
  },
  lumberYard: {
    type: "lumberYard",
    name: "伐採所",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 30 },
    productionPerSecond: { wood: 0.0333 }
  },
  farm: {
    type: "farm",
    name: "畑",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 30 },
    productionPerSecond: { food: 0.025 }
  },
  mine: {
    type: "mine",
    name: "採掘場",
    width: 1,
    height: 1,
    buildSeconds: 900,
    cost: { wood: 80, food: 20 },
    productionPerSecond: { ore: 0.0083 }
  },
  warehouse: {
    type: "warehouse",
    name: "倉庫",
    width: 1,
    height: 1,
    buildSeconds: 600,
    cost: { wood: 100, ore: 20 }
  },
  park: {
    type: "park",
    name: "公園",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 40, dreamCotton: 5 }
  },
  expeditionBase: {
    type: "expeditionBase",
    name: "探索隊本部",
    width: 2,
    height: 1,
    buildSeconds: 1200,
    cost: { wood: 150, ore: 40 }
  }
};
