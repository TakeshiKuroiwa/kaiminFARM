import type { BuildingType, Expedition, Resident, ResourceId, Resources, WorldEvent } from "@/types/game";

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
  description: string;
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
    description: "町の中心となる施設です。",
    width: 2,
    height: 2,
    buildSeconds: 0,
    cost: {}
  },
  house: {
    type: "house",
    name: "住宅",
    description: "住民が暮らす家です。町の人口を増やします。",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 50 }
  },
  lumberYard: {
    type: "lumberYard",
    name: "伐採所",
    description: "時間経過で木材を生産します。",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 30 },
    productionPerSecond: { wood: 0.0333 }
  },
  farm: {
    type: "farm",
    name: "畑",
    description: "時間経過で食料を生産します。",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 30 },
    productionPerSecond: { food: 0.025 }
  },
  mine: {
    type: "mine",
    name: "採掘場",
    description: "時間経過で鉱石を生産します。",
    width: 1,
    height: 1,
    buildSeconds: 900,
    cost: { wood: 80, food: 20 },
    productionPerSecond: { ore: 0.0083 }
  },
  warehouse: {
    type: "warehouse",
    name: "倉庫",
    description: "オフライン生産の上限時間を伸ばします。",
    width: 1,
    height: 1,
    buildSeconds: 600,
    cost: { wood: 100, ore: 20 }
  },
  park: {
    type: "park",
    name: "公園",
    description: "町のここちよさを上げます。",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 40, dreamCotton: 5 }
  },
  expeditionBase: {
    type: "expeditionBase",
    name: "探索隊本部",
    description: "周辺地域への探索を解放します。",
    width: 2,
    height: 1,
    buildSeconds: 1200,
    cost: { wood: 150, ore: 40 }
  }
};

export const BUILDABLE_BUILDING_TYPES: BuildingType[] = [
  "house",
  "lumberYard",
  "farm",
  "mine",
  "warehouse",
  "park",
  "expeditionBase"
];

export const MAP_WIDTH = 10;
export const MAP_HEIGHT = 10;
export const MAX_BUILDING_LEVEL = 3;

export type ResidentMaster = Omit<Resident, "residentId" | "friendship" | "status" | "x" | "y" | "lastTalkedAt" | "joinedAt"> & {
  unlockHouseCount: number;
  favoriteBuilding: BuildingType;
  talkLines: string[];
};

export const RESIDENT_MASTER: ResidentMaster[] = [
  {
    templateId: "moko",
    name: "モコ",
    species: "アルパカ",
    personality: "おっとり",
    skill: "crafting",
    unlockHouseCount: 1,
    favoriteBuilding: "park",
    talkLines: [
      "広場にベンチがあると、つい長く休んでしまいますね。",
      "kaiminちゃんは今日も町役場の前でうとうとしていました。",
      "この町の空気は、毛糸を干すのにちょうどいいです。"
    ]
  },
  {
    templateId: "coro",
    name: "コロ",
    species: "犬",
    personality: "元気",
    skill: "exploration",
    unlockHouseCount: 2,
    favoriteBuilding: "expeditionBase",
    talkLines: [
      "近くの林なら、ぼくがすぐに道を覚えられそうです。",
      "道が増えると、町を走るのが楽しくなりますね。",
      "探索隊本部ができたら、いつでも声をかけてください。"
    ]
  },
  {
    templateId: "mint",
    name: "ミント",
    species: "ウサギ",
    personality: "まじめ",
    skill: "farming",
    unlockHouseCount: 3,
    favoriteBuilding: "farm",
    talkLines: [
      "畑の配置を少し整えるだけで、作業がずっと楽になります。",
      "食料の備蓄は、町が大きくなるほど大切になります。",
      "公園のそばに住宅があると、住民も落ち着いて暮らせます。"
    ]
  }
];

export type ExpeditionAreaMaster = {
  areaId: Expedition["areaId"];
  name: string;
  durationSeconds: number;
  foodCost: number;
  rewards: Partial<Resources>;
};

export const EXPEDITION_AREAS: Record<Expedition["areaId"], ExpeditionAreaMaster> = {
  nearbyWoods: {
    areaId: "nearbyWoods",
    name: "近くの林",
    durationSeconds: 30 * 60,
    foodCost: 10,
    rewards: { wood: 80, food: 20 }
  },
  sleepyForest: {
    areaId: "sleepyForest",
    name: "まどろみの森",
    durationSeconds: 2 * 60 * 60,
    foodCost: 30,
    rewards: { wood: 180, dreamCotton: 6 }
  }
};

export const ACTIVE_WORLD_EVENT: Omit<WorldEvent, "currentAmount" | "startedAt" | "endsAt"> & {
  durationDays: number;
} = {
  eventId: "event_harvest_001",
  title: "ねむり丘収穫祭",
  description: "みんなで食料を持ち寄って、ねむり丘の広場をにぎやかにしましょう。",
  status: "active",
  resourceId: "food" satisfies ResourceId,
  goalAmount: 100000,
  durationDays: 14
};
