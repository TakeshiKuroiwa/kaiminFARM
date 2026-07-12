export const ISO_TILE_WIDTH = 96;
export const ISO_TILE_HEIGHT = 48;

export type IsoPoint = {
  x: number;
  y: number;
};

export function tileToIso(x: number, y: number, tileWidth = ISO_TILE_WIDTH, tileHeight = ISO_TILE_HEIGHT): IsoPoint {
  return {
    x: ((x - y) * tileWidth) / 2,
    y: ((x + y) * tileHeight) / 2
  };
}

export function isoToTile(screenX: number, screenY: number, tileWidth = ISO_TILE_WIDTH, tileHeight = ISO_TILE_HEIGHT): IsoPoint {
  return {
    x: screenY / tileHeight + screenX / tileWidth,
    y: screenY / tileHeight - screenX / tileWidth
  };
}

export function getIsoSortKey(tileX: number, tileY: number, objectHeight = 0) {
  return tileY * 1000 + tileX * 10 + objectHeight;
}
