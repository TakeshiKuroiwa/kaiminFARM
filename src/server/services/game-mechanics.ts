import {
  BUILDING_MASTER,
  EMPTY_RESOURCES,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_BUILDING_LEVEL,
  RESIDENT_MASTER
} from "@/constants/game-master";
import type {
  BuildingInstance,
  BuildingType,
  PlayerProfile,
  Resident,
  ResourceId,
  Resources,
  TownRank
} from "@/types/game";

export function addResources(left: Resources, right: Resources): Resources {
  return {
    wood: left.wood + right.wood,
    food: left.food + right.food,
    ore: left.ore + right.ore,
    dreamCotton: left.dreamCotton + right.dreamCotton
  };
}

export function subtractResources(left: Resources, right: Partial<Resources>): Resources {
  return {
    wood: left.wood - (right.wood ?? 0),
    food: left.food - (right.food ?? 0),
    ore: left.ore - (right.ore ?? 0),
    dreamCotton: left.dreamCotton - (right.dreamCotton ?? 0)
  };
}

export function hasEnoughResources(resources: Resources, cost: Partial<Resources>) {
  return (Object.keys(cost) as ResourceId[]).every((resourceId) => {
    return resources[resourceId] >= (cost[resourceId] ?? 0);
  });
}

export function getMissingResources(resources: Resources, cost: Partial<Resources>): Partial<Record<ResourceId, { required: number; current: number; missing: number }>> {
  const missing: Partial<Record<ResourceId, { required: number; current: number; missing: number }>> = {};
  for (const resourceId of Object.keys(cost) as ResourceId[]) {
    const required = cost[resourceId] ?? 0;
    const current = resources[resourceId];
    if (required > current) {
      missing[resourceId] = {
        required,
        current,
        missing: required - current
      };
    }
  }
  return missing;
}

export function multiplyCost(cost: Partial<Resources>, multiplier: number): Partial<Resources> {
  const nextCost: Partial<Resources> = {};
  for (const resourceId of Object.keys(cost) as ResourceId[]) {
    const amount = cost[resourceId] ?? 0;
    if (amount > 0) {
      nextCost[resourceId] = Math.ceil(amount * multiplier);
    }
  }
  return nextCost;
}

export function getUpgradeCost(building: BuildingInstance): Partial<Resources> {
  const master = BUILDING_MASTER[building.type];
  return multiplyCost(master.cost, 1 + building.level * 0.75);
}

export function getUpgradeSeconds(building: BuildingInstance) {
  const master = BUILDING_MASTER[building.type];
  return Math.max(60, Math.ceil(master.buildSeconds * (1 + building.level * 0.5)));
}

export function completeTimedBuildings(buildings: BuildingInstance[], now: number) {
  const completedNames: string[] = [];
  const nextBuildings = buildings.map((building) => {
    if (building.status === "active" || !building.completeAt || building.completeAt > now) {
      return building;
    }

    const nextLevel = building.status === "upgrading" ? building.targetLevel ?? building.level + 1 : building.level;
    completedNames.push(BUILDING_MASTER[building.type].name);
    return {
      ...building,
      level: nextLevel,
      targetLevel: undefined,
      status: "active" as const,
      completeAt: null
    };
  });

  return { buildings: nextBuildings, completedNames };
}

export function calculateProduction(buildings: BuildingInstance[], profile: PlayerProfile): Resources {
  const production: Resources = { ...EMPTY_RESOURCES };
  const townMultiplier = getTownProductionMultiplier(profile.townRank);

  for (const building of buildings) {
    if (building.status !== "active") {
      continue;
    }

    const master = BUILDING_MASTER[building.type];
    if (!master.productionPerSecond) {
      continue;
    }

    const levelMultiplier = getLevelMultiplier(building.level);
    for (const resourceId of Object.keys(master.productionPerSecond) as ResourceId[]) {
      production[resourceId] +=
        (master.productionPerSecond[resourceId] ?? 0) * levelMultiplier * townMultiplier;
    }
  }

  return production;
}

export function calculateGainedResources(productionPerSecond: Resources, calculatedSeconds: number): Resources {
  return {
    wood: Math.floor(productionPerSecond.wood * calculatedSeconds),
    food: Math.floor(productionPerSecond.food * calculatedSeconds),
    ore: Math.floor(productionPerSecond.ore * calculatedSeconds),
    dreamCotton: Math.floor(productionPerSecond.dreamCotton * calculatedSeconds)
  };
}

export function calculateOfflineLimitSeconds(buildings: BuildingInstance[]) {
  const activeWarehouseLevels = buildings
    .filter((building) => building.type === "warehouse" && building.status === "active")
    .map((building) => building.level);

  const maxWarehouseLevel = Math.max(0, ...activeWarehouseLevels);
  if (maxWarehouseLevel >= 3) {
    return 60 * 60 * 18;
  }
  if (maxWarehouseLevel >= 2) {
    return 60 * 60 * 12;
  }
  return 60 * 60 * 8;
}

export function calculateTownStats(buildings: BuildingInstance[]) {
  const activeBuildings = buildings.filter((building) => building.status === "active");
  const population = activeBuildings.filter((building) => building.type === "house").length;
  const production = calculateProduction(activeBuildings, {
    playerId: "",
    displayName: "",
    townName: "",
    townRank: "smallSettlement",
    townLevel: 1,
    lastCalculatedAt: 0,
    offlineLimitSeconds: 0,
    isTownPublic: true,
    kaiminOutfit: "default",
    createdAt: 0,
    updatedAt: 0
  });
  const productionPower = Math.floor((production.wood + production.food + production.ore + production.dreamCotton) * 1000);
  const parkCount = activeBuildings.filter((building) => building.type === "park").length;
  const townHallCount = activeBuildings.filter((building) => building.type === "townHall").length;
  const expeditionBaseCount = activeBuildings.filter((building) => building.type === "expeditionBase").length;
  const mineCount = activeBuildings.filter((building) => building.type === "mine").length;
  const houseNextToParkCount = activeBuildings.filter(
    (building) => building.type === "house" && hasAdjacentType(building, activeBuildings, "park")
  ).length;
  const houseNextToMineCount = activeBuildings.filter(
    (building) => building.type === "house" && hasAdjacentType(building, activeBuildings, "mine")
  ).length;
  const comfort = Math.max(0, parkCount * 5 + houseNextToParkCount * 3 - houseNextToMineCount * 4);
  const bustle = Math.max(0, population * 2 + expeditionBaseCount * 5);
  const safety = Math.max(0, townHallCount * 10 + population - mineCount * 2);
  const nature = Math.max(0, parkCount * 5 - mineCount * 3);

  return { population, productionPower, comfort, bustle, safety, nature };
}

export function calculateTownRank(stats: ReturnType<typeof calculateTownStats>): TownRank {
  if (stats.population >= 8 && stats.productionPower >= 50 && stats.comfort >= 30) {
    return "fluffyTown";
  }
  if (stats.population >= 3 && stats.comfort >= 10) {
    return "slowVillage";
  }
  return "smallSettlement";
}

export function canPlaceBuilding(
  buildings: BuildingInstance[],
  candidate: Pick<BuildingInstance, "instanceId" | "x" | "y" | "width" | "height">
) {
  if (candidate.x < 0 || candidate.y < 0) {
    return false;
  }
  if (candidate.x + candidate.width > MAP_WIDTH || candidate.y + candidate.height > MAP_HEIGHT) {
    return false;
  }

  return buildings.every((building) => {
    if (building.instanceId === candidate.instanceId) {
      return true;
    }
    return !rectsOverlap(candidate, building);
  });
}

function rectsOverlap(
  left: Pick<BuildingInstance, "x" | "y" | "width" | "height">,
  right: Pick<BuildingInstance, "x" | "y" | "width" | "height">
) {
  return (
    left.x <= right.x + right.width - 1 &&
    left.x + left.width - 1 >= right.x &&
    left.y <= right.y + right.height - 1 &&
    left.y + left.height - 1 >= right.y
  );
}

function hasAdjacentType(building: BuildingInstance, buildings: BuildingInstance[], type: BuildingType) {
  return buildings.some((other) => {
    if (other.instanceId === building.instanceId || other.type !== type) {
      return false;
    }
    const horizontallyAdjacent =
      building.y < other.y + other.height &&
      building.y + building.height > other.y &&
      (building.x + building.width === other.x || other.x + other.width === building.x);
    const verticallyAdjacent =
      building.x < other.x + other.width &&
      building.x + building.width > other.x &&
      (building.y + building.height === other.y || other.y + other.height === building.y);
    return horizontallyAdjacent || verticallyAdjacent;
  });
}

function getLevelMultiplier(level: number) {
  if (level >= 3) {
    return 1.5;
  }
  if (level === 2) {
    return 1.2;
  }
  return 1;
}

function getTownProductionMultiplier(rank: TownRank) {
  if (rank === "fluffyTown") {
    return 1.1;
  }
  if (rank === "slowVillage") {
    return 1.05;
  }
  return 1;
}

export function canUpgrade(building: BuildingInstance) {
  return building.status === "active" && building.type !== "townHall" && building.level < MAX_BUILDING_LEVEL;
}

export function syncResidentsWithTown(residents: Resident[], buildings: BuildingInstance[], now: number) {
  const activeHouseCount = buildings.filter((building) => building.type === "house" && building.status === "active").length;
  const nextResidents = [...residents];
  const joinedNames: string[] = [];

  for (const template of RESIDENT_MASTER) {
    const alreadyJoined = nextResidents.some((resident) => resident.templateId === template.templateId);
    if (alreadyJoined || activeHouseCount < template.unlockHouseCount) {
      continue;
    }

    const spot = findResidentSpot(nextResidents, buildings, template.unlockHouseCount);
    nextResidents.push({
      residentId: `resident_${template.templateId}`,
      templateId: template.templateId,
      name: template.name,
      species: template.species,
      personality: template.personality,
      friendship: 0,
      skill: template.skill,
      status: "idle",
      x: spot.x,
      y: spot.y,
      lastTalkedAt: null,
      joinedAt: now
    });
    joinedNames.push(template.name);
  }

  return { residents: moveIdleResidents(nextResidents, buildings, now), joinedNames };
}

export function moveIdleResidents(residents: Resident[], buildings: BuildingInstance[], now: number) {
  return residents.map((resident, index) => {
    if (resident.status !== "idle") {
      return resident;
    }
    const step = Math.floor(now / 60000) + index;
    const candidates = getWalkableSpots(buildings);
    const spot = candidates[step % candidates.length] ?? { x: resident.x, y: resident.y };
    return { ...resident, x: spot.x, y: spot.y };
  });
}

function findResidentSpot(residents: Resident[], buildings: BuildingInstance[], offset: number) {
  const candidates = getWalkableSpots(buildings);
  return candidates[(residents.length + offset) % candidates.length] ?? { x: 0, y: 1 };
}

function getWalkableSpots(buildings: BuildingInstance[]) {
  const spots: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const occupied = buildings.some((building) => {
        return x >= building.x && x < building.x + building.width && y >= building.y && y < building.y + building.height;
      });
      if (!occupied) {
        spots.push({ x, y });
      }
    }
  }
  return spots;
}
