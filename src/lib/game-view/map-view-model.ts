import { BUILDING_MASTER, MAP_HEIGHT, MAP_WIDTH } from "@/constants/game-master";
import type { BuildingInstance, Resident } from "@/types/game";
import { getIsoSortKey, tileToIso } from "./iso-coordinate";

export type MapViewSource = {
  buildings: BuildingInstance[];
  residents: Resident[];
};

export type TileView = {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  occupiedBy?: string;
};

export type BuildingView = BuildingInstance & {
  name: string;
  screenX: number;
  screenY: number;
  sortKey: number;
};

export type ResidentView = Resident & {
  screenX: number;
  screenY: number;
  sortKey: number;
};

export type MapViewModel = {
  width: number;
  height: number;
  tiles: TileView[];
  buildings: BuildingView[];
  residents: ResidentView[];
};

export function createMapViewModel(source: MapViewSource): MapViewModel {
  const buildings = source.buildings.map((building) => {
    const anchorX = building.x + building.width - 1;
    const anchorY = building.y + building.height - 1;
    const position = tileToIso(building.x, building.y);

    return {
      ...building,
      name: BUILDING_MASTER[building.type].name,
      screenX: position.x,
      screenY: position.y,
      sortKey: getIsoSortKey(anchorX, anchorY, building.height)
    };
  });

  const occupied = new Map<string, string>();
  for (const building of source.buildings) {
    for (let dy = 0; dy < building.height; dy += 1) {
      for (let dx = 0; dx < building.width; dx += 1) {
        occupied.set(`${building.x + dx}:${building.y + dy}`, building.instanceId);
      }
    }
  }

  const tiles = Array.from({ length: MAP_WIDTH * MAP_HEIGHT }, (_, index) => {
    const x = index % MAP_WIDTH;
    const y = Math.floor(index / MAP_WIDTH);
    const position = tileToIso(x, y);

    return {
      x,
      y,
      screenX: position.x,
      screenY: position.y,
      occupiedBy: occupied.get(`${x}:${y}`)
    };
  });

  const residents = source.residents.map((resident) => {
    const position = tileToIso(resident.x, resident.y);

    return {
      ...resident,
      screenX: position.x,
      screenY: position.y,
      sortKey: getIsoSortKey(resident.x, resident.y, 1)
    };
  });

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tiles,
    buildings,
    residents
  };
}
