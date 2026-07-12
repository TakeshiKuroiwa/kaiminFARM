"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BuildingType, GameState, PublicTownSnapshot } from "@/types/game";
import { BUILDING_MASTER } from "@/constants/game-master";
import { createMapViewModel, type BuildingView, type MapViewModel, type MapViewSource, type ResidentView, type TileView } from "@/lib/game-view/map-view-model";
import { getIsoSortKey, tileToIso } from "@/lib/game-view/iso-coordinate";

type PixiModule = typeof import("pixi.js");
type PixiApp = import("pixi.js").Application;
type PixiContainer = import("pixi.js").Container;
type AnimationTarget = {
  node: PixiContainer;
  baseX: number;
  baseY: number;
  phase: number;
  amplitude: number;
  speed: number;
};
type MapViewport = {
  x: number;
  y: number;
  scale: number;
};
type GroundKind = "grass" | "path" | "farm" | "mine" | "park" | "town" | "yard";
type TownSurfacePlan = {
  ground: Map<string, GroundKind>;
  roads: Set<string>;
};

type PixiTownMapProps = {
  mapSource: GameState | PublicTownSnapshot | MapViewSource;
  buildTarget?: {
    x: number;
    y: number;
    type: BuildingType;
  };
  eventProgress?: number;
  readOnly?: boolean;
  seasonalEventId?: string;
  selectedBuildingId?: string;
  onTileSelect?: (tile: TileView) => void;
  onBuildingSelect?: (building: BuildingView) => void;
  onResidentSelect?: (resident: ResidentView) => void;
};

const buildingColors: Record<BuildingType, number> = {
  townHall: 0xd7c6ff,
  house: 0xf1c9a5,
  lumberYard: 0xa97543,
  farm: 0xb9d76e,
  mine: 0xa9aeb8,
  warehouse: 0xd7b47a,
  park: 0x8fcf86,
  expeditionBase: 0x91b7d9
};

const statusColors = {
  active: 0x4f8f68,
  building: 0xb56b3a,
  upgrading: 0x5667a8
};

const mapAssets = {
  house: "/assets/kenney/objects/houseSmall1.png",
  houseTall: "/assets/kenney/objects/houseSmall2.png",
  tree: "/assets/kenney/objects/tree.png",
  pine: "/assets/kenney/objects/treePine.png",
  smallTree: "/assets/kenney/objects/treeSmall_green1.png",
  smallTreeLeafy: "/assets/kenney/objects/treeSmall_green2.png",
  smallTreeRound: "/assets/kenney/objects/treeSmall_green3.png",
  bush: "/assets/kenney/objects/bush1.png",
  bushSmall: "/assets/kenney/objects/bush2.png",
  bushRound: "/assets/kenney/objects/bush3.png",
  bushAlt: "/assets/kenney/objects/bushAlt1.png",
  fence: "/assets/kenney/objects/fence.png",
  roof: "/assets/kenney/isometric/roof_S.png",
  roofSingle: "/assets/kenney/isometric/roofSingle_S.png",
  roofCorner: "/assets/kenney/isometric/roofCorner_S.png",
  woodWall: "/assets/kenney/isometric/woodWallEmpty_S.png",
  woodDoor: "/assets/kenney/isometric/woodWallDoorClosed_S.png",
  woodWindow: "/assets/kenney/isometric/woodWallWindow_S.png",
  planks: "/assets/kenney/isometric/planksHighOld_S.png",
  ladder: "/assets/kenney/isometric/ladderStand_S.png",
  brokenLadder: "/assets/kenney/isometric/ladderStandBroken_S.png",
  dirt: "/assets/kenney/isometric/dirt_S.png",
  corn: "/assets/kenney/isometric/corn_S.png",
  cornYoung: "/assets/kenney/isometric/cornYoung_S.png",
  cornDouble: "/assets/kenney/isometric/cornDouble_S.png",
  fenceLow: "/assets/kenney/isometric/fenceLow_S.png",
  fenceLowBroken: "/assets/kenney/isometric/fenceLowBroken_S.png",
  hay: "/assets/kenney/isometric/hayBales_S.png",
  hayStack: "/assets/kenney/isometric/hayBalesStacked_S.png",
  chimney: "/assets/kenney/isometric/chimneyBase_S.png",
  sack: "/assets/kenney/isometric/sack_S.png",
  crate: "/assets/kenney/isometric/sacksCrate_S.png",
  smoke: "/assets/kenney/particles/smoke_04.png",
  dust: "/assets/kenney/particles/dirt_01.png",
  light: "/assets/kenney/particles/light_03.png",
  sparkle: "/assets/kenney/particles/star_03.png"
};
const mapAssetSources = Array.from(new Set(Object.values(mapAssets)));

const groundColors: Record<GroundKind, { fill: number; edge: number; accent: number }> = {
  grass: { fill: 0xcfe8b8, edge: 0x8fbd73, accent: 0xe4f3cf },
  path: { fill: 0xd9c193, edge: 0xb08b54, accent: 0xead8b2 },
  farm: { fill: 0xb98758, edge: 0x8f623c, accent: 0xd1a06d },
  mine: { fill: 0x9ea3aa, edge: 0x69717a, accent: 0xc2c6cc },
  park: { fill: 0x98d38a, edge: 0x5d9a59, accent: 0xc7edb9 },
  town: { fill: 0xd7c6ff, edge: 0x9a8bd6, accent: 0xf4f0ff },
  yard: { fill: 0xceb183, edge: 0x997544, accent: 0xe5cfaa }
};

export function PixiTownMap({
  mapSource,
  buildTarget,
  eventProgress = 0,
  readOnly = false,
  seasonalEventId = "",
  selectedBuildingId,
  onTileSelect,
  onBuildingSelect,
  onResidentSelect
}: PixiTownMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pixiRef = useRef<PixiModule | null>(null);
  const appRef = useRef<PixiApp | null>(null);
  const rootRef = useRef<PixiContainer | null>(null);
  const viewportRef = useRef<MapViewport | null>(null);
  const animationCleanupRef = useRef<(() => void) | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [viewportResetCount, setViewportResetCount] = useState(0);
  const viewModel = useMemo(() => createMapViewModel(mapSource), [mapSource]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let app: PixiApp | null = null;

    async function mountPixi() {
      const host = hostRef.current;
      if (!host) {
        return;
      }

      const pixi = await import("pixi.js");
      if (cancelled) {
        return;
      }

      app = new pixi.Application();
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        preference: "webgl"
      });

      if (cancelled) {
        app.destroy();
        return;
      }

      await pixi.Assets.load(mapAssetSources);
      if (cancelled) {
        app.destroy();
        return;
      }

      app.canvas.className = "pixi-town-canvas";
      host.appendChild(app.canvas);

      const root = new pixi.Container();
      app.stage.addChild(root);

      pixiRef.current = pixi;
      appRef.current = app;
      rootRef.current = root;
      setIsReady(true);
    }

    mountPixi();

    return () => {
      cancelled = true;
      setIsReady(false);
      animationCleanupRef.current?.();
      animationCleanupRef.current = null;
      rootRef.current = null;
      pixiRef.current = null;
      appRef.current = null;
      app?.destroy(true, { children: true });
    };
  }, []);

  useEffect(() => {
    const pixi = pixiRef.current;
    const app = appRef.current;
    const root = rootRef.current;
    if (!isReady || !pixi || !app || !root) {
      return;
    }

    animationCleanupRef.current?.();
    animationCleanupRef.current = drawTownMap({
      pixi,
      app,
      root,
      viewModel,
      buildTarget,
      eventProgress,
      readOnly,
      reducedMotion,
      seasonalEventId,
      selectedBuildingId: selectedBuildingId ?? "",
      onTileSelect,
      onBuildingSelect,
      onResidentSelect,
      viewport: viewportRef.current,
      onViewportChange: (viewport) => {
        viewportRef.current = viewport;
      }
    });
  }, [
    buildTarget,
    eventProgress,
    isReady,
    onBuildingSelect,
    onResidentSelect,
    onTileSelect,
    readOnly,
    reducedMotion,
    seasonalEventId,
    selectedBuildingId,
    viewportResetCount,
    viewModel
  ]);

  return (
    <div className={readOnly ? "pixi-town-map readonly" : "pixi-town-map"} ref={hostRef}>
      {!isReady ? <div className="pixi-loading">マップを準備中</div> : null}
      {!readOnly ? (
        <button
          className="map-reset-button"
          type="button"
          onClick={() => {
            viewportRef.current = null;
            setViewportResetCount((count) => count + 1);
          }}
        >
          全体
        </button>
      ) : null}
    </div>
  );
}

function drawTownMap({
  pixi,
  app,
  root,
  viewModel,
  buildTarget,
  eventProgress,
  readOnly,
  selectedBuildingId,
  reducedMotion,
  seasonalEventId,
  onTileSelect,
  onBuildingSelect,
  onResidentSelect,
  viewport,
  onViewportChange
}: {
  pixi: PixiModule;
  app: PixiApp;
  root: PixiContainer;
  viewModel: MapViewModel;
  buildTarget: PixiTownMapProps["buildTarget"];
  eventProgress: number;
  readOnly: boolean;
  selectedBuildingId: string;
  reducedMotion: boolean;
  seasonalEventId: string;
  onTileSelect?: PixiTownMapProps["onTileSelect"];
  onBuildingSelect?: PixiTownMapProps["onBuildingSelect"];
  onResidentSelect?: PixiTownMapProps["onResidentSelect"];
  viewport: MapViewport | null;
  onViewportChange: (viewport: MapViewport) => void;
}): () => void {
  root.removeChildren();
  const initialViewport = viewport ?? getDefaultViewport(app);
  root.x = initialViewport.x;
  root.y = initialViewport.y;
  root.scale.set(initialViewport.scale);
  const animationTargets: AnimationTarget[] = [];
  const pulseTargets: AnimationTarget[] = [];

  const environmentLayer = new pixi.Container();
  const groundLayer = new pixi.Container();
  const roadLayer = new pixi.Container();
  const objectLayer = new pixi.Container();
  const overlayLayer = new pixi.Container();
  objectLayer.sortableChildren = true;

  root.addChild(environmentLayer, groundLayer, roadLayer, objectLayer, overlayLayer);
  drawEnvironment(pixi, environmentLayer, animationTargets, seasonalEventId);
  const surfacePlan = createTownSurfacePlan(viewModel);
  drawTownIslandBase(pixi, groundLayer);

  for (const tile of viewModel.tiles) {
    const isTarget = !readOnly && buildTarget ? tile.x === buildTarget.x && tile.y === buildTarget.y : false;
    const groundKind = surfacePlan.ground.get(tileKey(tile.x, tile.y)) ?? "grass";
    const tileGraphic = drawGroundTile(pixi, groundLayer, tile.x, tile.y, groundKind, isTarget);

    if (!readOnly && onTileSelect) {
      tileGraphic.eventMode = "static";
      tileGraphic.cursor = "pointer";
      tileGraphic.on("pointertap", () => onTileSelect(tile));
    }
  }

  for (const roadKey of surfacePlan.roads) {
    const [x, y] = roadKey.split(":").map(Number);
    drawRoadTile(pixi, roadLayer, x, y, surfacePlan.roads);
  }

  drawWorldEventPlaza(pixi, objectLayer, eventProgress, seasonalEventId);
  drawTownScenery(pixi, objectLayer, viewModel, surfacePlan);

  if (!readOnly && buildTarget) {
    drawBuildPreview(pixi, overlayLayer, buildTarget);
  }

  for (const building of [...viewModel.buildings].sort((a, b) => a.sortKey - b.sortKey)) {
    const buildingContainer = new pixi.Container();
    buildingContainer.zIndex = building.sortKey;
    if (onBuildingSelect) {
      buildingContainer.eventMode = "static";
      buildingContainer.cursor = "pointer";
      buildingContainer.on("pointertap", () => onBuildingSelect(building));
    }

    const color = buildingColors[building.type];
    const isSelected = building.instanceId === selectedBuildingId;
    const footprint = new pixi.Graphics()
      .poly(getFootprintPolygon(building.x, building.y, building.width, building.height))
      .fill({ color, alpha: building.status === "building" ? 0.16 : 0.2 })
      .stroke({ color: isSelected ? 0x5667a8 : statusColors[building.status], width: isSelected ? 4 : 2 });

    const anchor = getFootprintCenter(building.x, building.y, building.width, building.height);
    const bodyWidth = Math.max(44, building.width * 42);
    const bodyHeight = building.type === "townHall" ? 62 : building.type === "expeditionBase" ? 46 : 38;
    const body = new pixi.Graphics()
      .roundRect(anchor.x - bodyWidth / 2, anchor.y - bodyHeight - 4, bodyWidth, bodyHeight, 7)
      .fill({ color: lightenColor(color), alpha: building.status === "building" ? 0.32 : 0.42 })
      .stroke({ color: 0x6f624d, width: 2 });

    const roof = new pixi.Graphics()
      .poly([
        anchor.x - bodyWidth / 2 - 8,
        anchor.y - bodyHeight - 2,
        anchor.x,
        anchor.y - bodyHeight - 24,
        anchor.x + bodyWidth / 2 + 8,
        anchor.y - bodyHeight - 2,
        anchor.x,
        anchor.y + 8
      ])
      .fill({ color, alpha: building.status === "building" ? 0.38 : 0.58 })
      .stroke({ color: 0x6f624d, width: 2 });

    const label = new pixi.Text({
      text: BUILDING_MASTER[building.type].name,
      style: {
        fill: 0x253025,
        fontFamily: "Arial, sans-serif",
        fontSize: 12,
        fontWeight: "700"
      }
    });
    label.anchor.set(0.5);
    label.x = anchor.x;
    label.y = anchor.y - bodyHeight / 2 - 8;

    const statusDot = new pixi.Graphics().circle(anchor.x + bodyWidth / 2 - 4, anchor.y - bodyHeight - 2, 6).fill({
      color: statusColors[building.status]
    });

    if (building.status !== "active") {
      drawStatusBadge(pixi, buildingContainer, building.status, anchor.x, anchor.y - bodyHeight - 38);
    }

    if (isSelected) {
      const selector = new pixi.Graphics()
        .poly(getFootprintPolygon(building.x, building.y, building.width, building.height))
        .stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
      buildingContainer.addChild(selector);
      pulseTargets.push({
        node: selector,
        baseX: selector.x,
        baseY: selector.y,
        phase: 0,
        amplitude: 0.18,
        speed: 2.6
      });
    }

    buildingContainer.addChild(footprint, body, roof);
    drawBuildingDetails(pixi, buildingContainer, building, anchor, bodyWidth, bodyHeight);
    buildingContainer.addChild(label, statusDot);
    objectLayer.addChild(buildingContainer);
  }

  for (const resident of [...viewModel.residents].sort((a, b) => a.sortKey - b.sortKey)) {
    const residentContainer = new pixi.Container();
    residentContainer.zIndex = resident.sortKey + 20;
    if (onResidentSelect) {
      residentContainer.eventMode = "static";
      residentContainer.cursor = "pointer";
      residentContainer.on("pointertap", () => onResidentSelect(resident));
    }

    const foot = tileToIso(resident.x, resident.y);
    const markerColor = resident.status === "expedition" ? 0xa9aeb8 : 0xf4f0ff;
    const post = new pixi.Graphics()
      .roundRect(foot.x - 14, foot.y - 30, 28, 20, 5)
      .fill({ color: markerColor, alpha: 0.94 })
      .stroke({ color: 0x9a8bd6, width: 2 });
    const tail = new pixi.Graphics()
      .poly([foot.x - 5, foot.y - 10, foot.x + 5, foot.y - 10, foot.x, foot.y - 2])
      .fill({ color: markerColor })
      .stroke({ color: 0x9a8bd6, width: 1 });
    const activity = new pixi.Text({
      text: resident.status === "expedition" ? "探" : "…",
      style: {
        fill: 0x253025,
        fontFamily: "Arial, sans-serif",
        fontSize: 12,
        fontWeight: "700"
      }
    });
    activity.anchor.set(0.5);
    activity.x = foot.x;
    activity.y = foot.y - 20;

    residentContainer.addChild(post, tail, activity);
    animationTargets.push({
      node: residentContainer,
      baseX: residentContainer.x,
      baseY: residentContainer.y,
      phase: resident.residentId.length,
      amplitude: resident.status === "expedition" ? 1.5 : 3,
      speed: resident.status === "expedition" ? 1.1 : 1.8
    });
    objectLayer.addChild(residentContainer);
  }

  const viewportCleanup = readOnly ? () => undefined : setupMapViewport(app, root, onViewportChange);

  if (reducedMotion) {
    return viewportCleanup;
  }

  const tick = () => {
    const time = performance.now() / 1000;
    for (const target of animationTargets) {
      target.node.x = target.baseX + Math.sin(time * target.speed + target.phase) * target.amplitude;
      target.node.y = target.baseY + Math.cos(time * target.speed + target.phase) * target.amplitude * 0.35;
    }
    for (const target of pulseTargets) {
      const scale = 1 + Math.sin(time * target.speed + target.phase) * target.amplitude;
      target.node.scale.set(scale);
      target.node.alpha = 0.68 + Math.sin(time * target.speed + target.phase) * 0.22;
    }
  };
  app.ticker.add(tick);

  return () => {
    app.ticker.remove(tick);
    viewportCleanup();
  };
}

function getDefaultViewport(app: PixiApp): MapViewport {
  const width = app.renderer.width;
  const height = app.renderer.height;
  const scale = Math.max(0.34, Math.min(1, Math.min((width - 32) / 980, (height - 32) / 620)));
  return {
    x: width / 2,
    y: Math.max(34, height * 0.08),
    scale
  };
}

function setupMapViewport(app: PixiApp, root: PixiContainer, onViewportChange: (viewport: MapViewport) => void) {
  const canvas = app.canvas;
  const pointers = new Map<number, { x: number; y: number }>();
  let lastPan: { x: number; y: number } | null = null;
  let lastPinchDistance = 0;
  const clampScale = (scale: number) => Math.max(0.32, Math.min(1.4, scale));
  const commit = () => onViewportChange({ x: root.x, y: root.y, scale: root.scale.x });

  const onPointerDown = (event: PointerEvent) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      lastPan = { x: event.clientX, y: event.clientY };
    }
    if (pointers.size === 2) {
      const [first, second] = Array.from(pointers.values());
      lastPinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
    }
    canvas.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) {
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const [first, second] = Array.from(pointers.values());
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (lastPinchDistance > 0) {
        root.scale.set(clampScale(root.scale.x * (distance / lastPinchDistance)));
        commit();
      }
      lastPinchDistance = distance;
      return;
    }

    if (lastPan) {
      root.x += event.clientX - lastPan.x;
      root.y += event.clientY - lastPan.y;
      lastPan = { x: event.clientX, y: event.clientY };
      commit();
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) {
      lastPan = null;
      lastPinchDistance = 0;
      return;
    }
    const [remaining] = Array.from(pointers.values());
    lastPan = remaining;
    lastPinchDistance = 0;
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    root.scale.set(clampScale(root.scale.x * (event.deltaY > 0 ? 0.92 : 1.08)));
    commit();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
  };
}

function drawBuildPreview(pixi: PixiModule, layer: PixiContainer, buildTarget: NonNullable<PixiTownMapProps["buildTarget"]>) {
  const master = BUILDING_MASTER[buildTarget.type];
  const preview = new pixi.Graphics()
    .poly(getFootprintPolygon(buildTarget.x, buildTarget.y, master.width, master.height))
    .fill({ color: 0xd9c8ff, alpha: 0.28 })
    .stroke({ color: 0x9a8bd6, width: 3, alpha: 0.9 });

  layer.addChild(preview);
}

function drawTownIslandBase(pixi: PixiModule, layer: PixiContainer) {
  const top = tileToIso(0, 0);
  const right = tileToIso(10, 0);
  const bottom = tileToIso(10, 10);
  const left = tileToIso(0, 10);
  const depth = 42;

  const shadow = new pixi.Graphics()
    .ellipse(0, bottom.y + depth + 14, 390, 46)
    .fill({ color: 0x354233, alpha: 0.16 });
  const rightFace = new pixi.Graphics()
    .poly([right.x, right.y, bottom.x, bottom.y, bottom.x, bottom.y + depth, right.x, right.y + depth])
    .fill({ color: 0x9d8055, alpha: 0.92 })
    .stroke({ color: 0x7a633f, width: 1, alpha: 0.7 });
  const leftFace = new pixi.Graphics()
    .poly([left.x, left.y, bottom.x, bottom.y, bottom.x, bottom.y + depth, left.x, left.y + depth])
    .fill({ color: 0x806d49, alpha: 0.94 })
    .stroke({ color: 0x6a5736, width: 1, alpha: 0.72 });
  const rim = new pixi.Graphics()
    .poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y])
    .fill({ color: 0xdaf0c9, alpha: 0.42 })
    .stroke({ color: 0x6fa65c, width: 5, alpha: 0.66 })
    .stroke({ color: 0xf6ffe6, width: 2, alpha: 0.62 });

  layer.addChild(shadow, rightFace, leftFace, rim);
}

function createTownSurfacePlan(viewModel: MapViewModel): TownSurfacePlan {
  const ground = new Map<string, GroundKind>();
  const roads = new Set<string>();
  const occupied = new Set<string>();

  for (const tile of viewModel.tiles) {
    ground.set(tileKey(tile.x, tile.y), "grass");
  }

  for (const building of viewModel.buildings) {
    for (let dy = 0; dy < building.height; dy += 1) {
      for (let dx = 0; dx < building.width; dx += 1) {
        occupied.add(tileKey(building.x + dx, building.y + dy));
      }
    }
  }

  const townHall = viewModel.buildings.find((building) => building.type === "townHall");
  const origin = townHall ? getBuildingApproachPoint(townHall, { x: 5, y: 5 }, occupied) : { x: 1, y: 1 };

  for (const building of viewModel.buildings) {
    const approach = getBuildingApproachPoint(building, origin, occupied);
    markRoad(roads, origin, approach, occupied);
  }

  for (const building of viewModel.buildings) {
    const kind = getGroundKindForBuilding(building.type);
    for (let dy = 0; dy < building.height; dy += 1) {
      for (let dx = 0; dx < building.width; dx += 1) {
        ground.set(tileKey(building.x + dx, building.y + dy), kind);
      }
    }
  }

  return { ground, roads };
}

function drawGroundTile(pixi: PixiModule, layer: PixiContainer, x: number, y: number, kind: GroundKind, isTarget: boolean) {
  const colors = groundColors[kind];
  const polygon = getTilePolygon(x, y);
  const tile = new pixi.Graphics()
    .poly(polygon)
    .fill({ color: isTarget ? 0xcfeee3 : colors.fill })
    .stroke({ color: isTarget ? 0x4f8f68 : colors.edge, width: isTarget ? 3 : 1 });

  layer.addChild(tile);

  const center = getTileCenter(x, y);
  if (kind === "path") {
    tile
      .moveTo(center.x - 30, center.y)
      .lineTo(center.x + 30, center.y)
      .stroke({ color: colors.accent, width: 5, alpha: 0.45 })
      .circle(center.x - 14, center.y + 3, 2)
      .fill({ color: 0xb08b54, alpha: 0.45 })
      .circle(center.x + 18, center.y - 2, 2)
      .fill({ color: 0xb08b54, alpha: 0.35 });
  } else if (kind === "farm") {
    for (let i = -2; i <= 2; i += 1) {
      tile
        .moveTo(center.x - 34 + i * 12, center.y - 1)
        .lineTo(center.x + i * 12, center.y + 17)
        .stroke({ color: colors.accent, width: 3, alpha: 0.48 });
    }
  } else if (kind === "mine") {
    tile
      .circle(center.x - 16, center.y + 2, 4)
      .fill({ color: 0x747b84, alpha: 0.55 })
      .circle(center.x + 14, center.y - 4, 3)
      .fill({ color: 0x747b84, alpha: 0.42 })
      .circle(center.x + 2, center.y + 10, 2)
      .fill({ color: 0xd9c8ff, alpha: 0.7 });
  } else if (kind === "park") {
    tile
      .circle(center.x - 20, center.y + 1, 3)
      .fill({ color: colors.accent, alpha: 0.72 })
      .circle(center.x + 20, center.y - 1, 3)
      .fill({ color: colors.accent, alpha: 0.58 })
      .ellipse(center.x, center.y + 8, 18, 4)
      .fill({ color: 0x6fb76a, alpha: 0.18 });
  } else if (kind === "town") {
    tile
      .moveTo(center.x - 28, center.y)
      .lineTo(center.x + 28, center.y)
      .stroke({ color: colors.accent, width: 4, alpha: 0.36 });
  } else if (kind === "yard") {
    tile
      .rect(center.x - 18, center.y - 2, 36, 5)
      .fill({ color: colors.accent, alpha: 0.28 });
  } else {
    tile
      .circle(center.x - 24, center.y + 4, 2)
      .fill({ color: colors.accent, alpha: 0.32 })
      .circle(center.x + 16, center.y - 7, 2)
      .fill({ color: colors.accent, alpha: 0.24 });
  }

  return tile;
}

function getGroundKindForBuilding(type: BuildingType): GroundKind {
  if (type === "farm") {
    return "farm";
  }
  if (type === "mine") {
    return "mine";
  }
  if (type === "park") {
    return "park";
  }
  if (type === "townHall" || type === "house") {
    return "town";
  }
  return "yard";
}

function drawRoadTile(pixi: PixiModule, layer: PixiContainer, x: number, y: number, roads: Set<string>) {
  const center = getTileCenter(x, y);
  const road = new pixi.Graphics();
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];
  const connectedDirections = directions.filter((direction) => roads.has(tileKey(x + direction.dx, y + direction.dy)));

  for (const direction of connectedDirections) {
    const neighbor = getTileCenter(x + direction.dx, y + direction.dy);
    const endX = (center.x + neighbor.x) / 2;
    const endY = (center.y + neighbor.y) / 2;
    road.moveTo(center.x, center.y).lineTo(endX, endY).stroke({ color: 0x8d6b3c, width: 18, alpha: 0.52 });
    road.moveTo(center.x, center.y).lineTo(endX, endY).stroke({ color: 0xe8d2a7, width: 12, alpha: 0.94 });
  }

  road
    .ellipse(center.x, center.y, connectedDirections.length >= 3 ? 18 : 15, 8)
    .fill({ color: 0xe8d2a7, alpha: 0.96 })
    .ellipse(center.x, center.y, connectedDirections.length >= 3 ? 21 : 17, 10)
    .stroke({ color: 0x8d6b3c, width: 2, alpha: 0.38 });

  const pebbleColor = 0xb08b54;
  road
    .circle(center.x - 8, center.y + 1, 1.8)
    .fill({ color: pebbleColor, alpha: 0.42 })
    .circle(center.x + 9, center.y - 2, 1.6)
    .fill({ color: pebbleColor, alpha: 0.34 });

  if (connectedDirections.length === 0) {
    road
      .circle(center.x, center.y, 5)
      .fill({ color: 0xf0dfbd, alpha: 0.9 })
      .circle(center.x - 9, center.y + 4, 2)
      .fill({ color: pebbleColor, alpha: 0.35 });
  }

  layer.addChild(road);
}

function markRoad(roads: Set<string>, from: { x: number; y: number }, to: { x: number; y: number }, occupied: Set<string>) {
  let x = from.x;
  let y = from.y;
  addRoadTile(roads, x, y, occupied);
  while (x !== to.x) {
    x += x < to.x ? 1 : -1;
    addRoadTile(roads, x, y, occupied);
  }
  while (y !== to.y) {
    y += y < to.y ? 1 : -1;
    addRoadTile(roads, x, y, occupied);
  }
}

function addRoadTile(roads: Set<string>, x: number, y: number, occupied: Set<string>) {
  if (!isInsideMap(x, y) || occupied.has(tileKey(x, y))) {
    return;
  }
  roads.add(tileKey(x, y));
}

function getBuildingApproachPoint(building: BuildingView, origin: { x: number; y: number }, occupied: Set<string>) {
  const candidates: { x: number; y: number }[] = [];

  for (let dx = 0; dx < building.width; dx += 1) {
    candidates.push({ x: building.x + dx, y: building.y - 1 });
    candidates.push({ x: building.x + dx, y: building.y + building.height });
  }

  for (let dy = 0; dy < building.height; dy += 1) {
    candidates.push({ x: building.x - 1, y: building.y + dy });
    candidates.push({ x: building.x + building.width, y: building.y + dy });
  }

  const validCandidates = candidates.filter((candidate) => isInsideMap(candidate.x, candidate.y) && !occupied.has(tileKey(candidate.x, candidate.y)));
  if (validCandidates.length === 0) {
    return getBuildingGridCenter(building);
  }

  return validCandidates.sort((a, b) => getManhattanDistance(a, origin) - getManhattanDistance(b, origin))[0];
}

function getManhattanDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isInsideMap(x: number, y: number) {
  return x >= 0 && x < 10 && y >= 0 && y < 10;
}

function getBuildingGridCenter(building: Pick<BuildingView, "x" | "y" | "width" | "height">) {
  return {
    x: Math.min(9, Math.max(0, building.x + Math.floor((building.width - 1) / 2))),
    y: Math.min(9, Math.max(0, building.y + Math.floor((building.height - 1) / 2)))
  };
}

function drawEnvironment(pixi: PixiModule, layer: PixiContainer, animationTargets: AnimationTarget[], seasonalEventId: string) {
  const cloudPositions = [
    { x: -280, y: 42, width: 86, phase: 0 },
    { x: 260, y: 88, width: 120, phase: 1.8 }
  ];

  for (const cloud of cloudPositions) {
    const cloudContainer = new pixi.Container();
    cloudContainer.x = cloud.x;
    cloudContainer.y = cloud.y;
    cloudContainer.alpha = 0.42;
    cloudContainer.addChild(
      new pixi.Graphics()
        .ellipse(0, 0, cloud.width / 2, 15)
        .fill({ color: 0xffffff })
        .ellipse(-cloud.width / 4, -8, cloud.width / 4, 13)
        .fill({ color: 0xffffff })
        .ellipse(cloud.width / 5, -10, cloud.width / 3, 16)
        .fill({ color: 0xffffff })
    );
    animationTargets.push({
      node: cloudContainer,
      baseX: cloudContainer.x,
      baseY: cloudContainer.y,
      phase: cloud.phase,
      amplitude: 8,
      speed: 0.22
    });
    layer.addChild(cloudContainer);
  }

  if (seasonalEventId.includes("summer")) {
    const sunbeam = new pixi.Graphics()
      .poly([-360, 0, -260, 0, -40, 430, -150, 430])
      .fill({ color: 0xfff4ba, alpha: 0.18 });
    layer.addChild(sunbeam);
  }
}

function drawTownScenery(
  pixi: PixiModule,
  layer: PixiContainer,
  viewModel: MapViewModel,
  surfacePlan: TownSurfacePlan
) {
  const occupied = getOccupiedTiles(viewModel);
  const edgeDecorations = [
    { src: mapAssets.pine, x: 0, y: 2, width: 42, height: 92, offsetX: -22, offsetY: 0 },
    { src: mapAssets.smallTreeLeafy, x: 0, y: 6, width: 30, height: 66, offsetX: -18, offsetY: 5 },
    { src: mapAssets.bushRound, x: 1, y: 8, width: 42, height: 30, offsetX: -18, offsetY: 8 },
    { src: mapAssets.tree, x: 7, y: 0, width: 48, height: 104, offsetX: 18, offsetY: 4 },
    { src: mapAssets.smallTreeRound, x: 9, y: 3, width: 28, height: 58, offsetX: 18, offsetY: 6 },
    { src: mapAssets.bushSmall, x: 8, y: 7, width: 36, height: 24, offsetX: 20, offsetY: 10 },
    { src: mapAssets.smallTree, x: 4, y: 9, width: 26, height: 56, offsetX: 12, offsetY: 12 }
  ];

  for (const decoration of edgeDecorations) {
    if (occupied.has(tileKey(decoration.x, decoration.y))) {
      continue;
    }
    addScenerySprite(
      pixi,
      layer,
      decoration.src,
      decoration.x,
      decoration.y,
      decoration.width,
      decoration.height,
      decoration.offsetX,
      decoration.offsetY,
      0.98
    );
  }

  drawTownGate(pixi, layer);
  drawRoadsideDetails(pixi, layer, surfacePlan.roads, occupied);
}

function drawTownGate(pixi: PixiModule, layer: PixiContainer) {
  const center = tileToIso(4.6, 10.1);
  const gate = new pixi.Container();
  gate.zIndex = 11020;

  const path = new pixi.Graphics()
    .ellipse(center.x, center.y - 2, 72, 16)
    .fill({ color: 0xe8d2a7, alpha: 0.86 })
    .stroke({ color: 0x8d6b3c, width: 2, alpha: 0.42 });
  const posts = new pixi.Graphics()
    .roundRect(center.x - 46, center.y - 56, 8, 48, 3)
    .fill({ color: 0x8a5f37 })
    .roundRect(center.x + 38, center.y - 56, 8, 48, 3)
    .fill({ color: 0x8a5f37 })
    .roundRect(center.x - 54, center.y - 60, 108, 24, 5)
    .fill({ color: 0xf2d7a3 })
    .stroke({ color: 0x7d5b36, width: 2 });
  const label = new pixi.Text({
    text: "ねむり丘",
    style: {
      fill: 0x3c3124,
      fontFamily: "Arial, sans-serif",
      fontSize: 13,
      fontWeight: "700"
    }
  });
  label.anchor.set(0.5);
  label.x = center.x;
  label.y = center.y - 48;

  gate.addChild(path, posts, label);
  addMapSprite(pixi, gate, mapAssets.sparkle, center.x - 58, center.y - 68, 22, 22, 0.42);
  addMapSprite(pixi, gate, mapAssets.light, center.x + 57, center.y - 64, 26, 26, 0.34);
  layer.addChild(gate);
}

function drawRoadsideDetails(pixi: PixiModule, layer: PixiContainer, roads: Set<string>, occupied: Set<string>) {
  const sortedRoads = Array.from(roads).sort();
  for (let index = 0; index < sortedRoads.length; index += 1) {
    if (index % 3 !== 1) {
      continue;
    }
    const [x, y] = sortedRoads[index].split(":").map(Number);
    const sideA = { x: x + 1, y };
    const sideB = { x, y: y + 1 };
    const side = isInsideMap(sideA.x, sideA.y) && !roads.has(tileKey(sideA.x, sideA.y)) && !occupied.has(tileKey(sideA.x, sideA.y)) ? sideA : sideB;
    if (!isInsideMap(side.x, side.y) || roads.has(tileKey(side.x, side.y)) || occupied.has(tileKey(side.x, side.y))) {
      continue;
    }

    const src = index % 2 === 0 ? mapAssets.bushSmall : mapAssets.bush;
    addScenerySprite(pixi, layer, src, side.x, side.y, index % 2 === 0 ? 24 : 30, index % 2 === 0 ? 18 : 22, 0, 8, 0.88);
  }
}

function getOccupiedTiles(viewModel: MapViewModel) {
  const occupied = new Set<string>();
  for (const building of viewModel.buildings) {
    for (let dy = 0; dy < building.height; dy += 1) {
      for (let dx = 0; dx < building.width; dx += 1) {
        occupied.add(tileKey(building.x + dx, building.y + dy));
      }
    }
  }
  return occupied;
}

function drawWorldEventPlaza(pixi: PixiModule, layer: PixiContainer, progress: number, seasonalEventId: string) {
  if (progress <= 0) {
    return;
  }

  const center = tileToIso(8, 7);
  const progressRatio = Math.max(0, Math.min(1, progress / 100));
  const plaza = new pixi.Container();
  plaza.zIndex = 7800;
  plaza.eventMode = "none";

  const base = new pixi.Graphics()
    .poly(getFootprintPolygon(7, 7, 2, 2))
    .fill({ color: 0xe2c18a, alpha: 0.82 })
    .stroke({ color: 0xb56b3a, width: 2 });
  plaza.addChild(base);

  const stallCount = progressRatio >= 0.66 ? 3 : progressRatio >= 0.33 ? 2 : 1;
  for (let i = 0; i < stallCount; i += 1) {
    const offsetX = -38 + i * 38;
    const stall = new pixi.Graphics()
      .roundRect(center.x + offsetX - 12, center.y - 38, 24, 26, 5)
      .fill({ color: i % 2 === 0 ? 0xf1c9a5 : 0xf4f0ff })
      .stroke({ color: 0x8a745b, width: 2 })
      .poly([center.x + offsetX - 16, center.y - 38, center.x + offsetX, center.y - 54, center.x + offsetX + 16, center.y - 38])
      .fill({ color: i % 2 === 0 ? 0xb56b3a : 0x9a8bd6 });
    plaza.addChild(stall);
  }

  const gauge = new pixi.Graphics()
    .roundRect(center.x - 44, center.y - 72, 88, 10, 5)
    .fill({ color: 0xfffdf7, alpha: 0.92 })
    .stroke({ color: 0x8a745b, width: 1 })
    .roundRect(center.x - 42, center.y - 70, 84 * progressRatio, 6, 3)
    .fill({ color: seasonalEventId.includes("summer") ? 0x4f8f68 : 0x9a8bd6 });
  plaza.addChild(gauge);

  const label = new pixi.Text({
    text: "収穫祭",
    style: {
      fill: 0x253025,
      fontFamily: "Arial, sans-serif",
      fontSize: 11,
      fontWeight: "700"
    }
  });
  label.anchor.set(0.5);
  label.x = center.x;
  label.y = center.y - 86;
  plaza.addChild(label);

  layer.addChild(plaza);
}

function drawBuildingDetails(
  pixi: PixiModule,
  container: PixiContainer,
  building: BuildingView,
  anchor: { x: number; y: number },
  bodyWidth: number,
  bodyHeight: number
) {
  const level = Math.max(1, building.level);

  if (building.type === "townHall") {
    addMapSprite(pixi, container, mapAssets.house, anchor.x - 22, anchor.y - 20, 66, 52);
    addMapSprite(pixi, container, level >= 2 ? mapAssets.houseTall : mapAssets.house, anchor.x + 22, anchor.y - 17, 58, 52);
    addMapSprite(pixi, container, mapAssets.bushAlt, anchor.x, anchor.y + 5, 58, 20);
    if (level >= 2) {
      addMapSprite(pixi, container, mapAssets.fenceLow, anchor.x - 36, anchor.y + 14, 48, 76);
      addMapSprite(pixi, container, mapAssets.chimney, anchor.x + 2, anchor.y - 43, 24, 54);
    }
    if (level >= 3) {
      addMapSprite(pixi, container, mapAssets.sparkle, anchor.x + 38, anchor.y - 54, 28, 28, 0.72);
      addMapSprite(pixi, container, mapAssets.bushRound, anchor.x + 44, anchor.y + 8, 34, 30);
    }
    container.addChild(
      new pixi.Graphics()
        .rect(anchor.x - 5, anchor.y - bodyHeight - 62, 10, 30)
        .fill({ color: 0x8a745b })
        .rect(anchor.x - 14, anchor.y - bodyHeight - 72, 28, 14)
        .fill({ color: 0xf4f0ff })
        .stroke({ color: 0x6f624d, width: 2 })
    );
    container.addChild(
      new pixi.Graphics()
        .poly([anchor.x + 5, anchor.y - bodyHeight - 66, anchor.x + 34, anchor.y - bodyHeight - 58, anchor.x + 5, anchor.y - bodyHeight - 50])
        .fill({ color: 0x9a8bd6 })
    );
    return;
  }

  if (building.type === "house") {
    addMapSprite(pixi, container, level >= 2 ? mapAssets.houseTall : mapAssets.house, anchor.x, anchor.y + 2, 78, level >= 2 ? 66 : 56);
    if (level >= 2) {
      addMapSprite(pixi, container, mapAssets.chimney, anchor.x + 16, anchor.y - 31, 18, 38);
      addMapSprite(pixi, container, mapAssets.fenceLow, anchor.x - 22, anchor.y + 15, 42, 62);
    }
    if (level >= 3) {
      addMapSprite(pixi, container, mapAssets.house, anchor.x + 28, anchor.y + 4, 42, 32);
      addMapSprite(pixi, container, mapAssets.sparkle, anchor.x - 8, anchor.y - 42, 24, 24, 0.52);
    }
    addMapSprite(pixi, container, mapAssets.smallTree, anchor.x - 28, anchor.y - 4, 24, 48);
    addMapSprite(pixi, container, level >= 3 ? mapAssets.bushRound : mapAssets.bush, anchor.x + 22, anchor.y + 4, 46, 26);
    return;
  }

  if (building.type === "farm") {
    addMapSprite(pixi, container, mapAssets.dirt, anchor.x, anchor.y + 4, 74, 98);
    addMapSprite(pixi, container, mapAssets.sack, anchor.x + 22, anchor.y + 3, 30, 48);
    addMapSprite(pixi, container, level >= 2 ? mapAssets.corn : mapAssets.cornYoung, anchor.x - 20, anchor.y + 5, 28, 68);
    addMapSprite(pixi, container, level >= 3 ? mapAssets.cornDouble : mapAssets.cornYoung, anchor.x + 3, anchor.y + 5, 30, 70);
    if (level >= 2) {
      addMapSprite(pixi, container, mapAssets.fenceLow, anchor.x - 34, anchor.y + 14, 44, 66);
    }
    if (level >= 3) {
      addMapSprite(pixi, container, mapAssets.hay, anchor.x + 35, anchor.y + 10, 36, 52);
      addMapSprite(pixi, container, mapAssets.sparkle, anchor.x + 18, anchor.y - 36, 22, 22, 0.56);
    }
    for (let i = 0; i < 3; i += 1) {
      container.addChild(
        new pixi.Graphics()
          .roundRect(anchor.x - bodyWidth / 2 + 10 + i * 18, anchor.y - 16, 10, 22, 3)
          .fill({ color: 0x74a95b, alpha: 0.9 })
      );
    }
    return;
  }

  if (building.type === "park") {
    addMapSprite(pixi, container, mapAssets.tree, anchor.x - 12, anchor.y + 2, 58, 118);
    addMapSprite(pixi, container, level >= 2 ? mapAssets.smallTreeRound : mapAssets.smallTree, anchor.x + 26, anchor.y + 4, 26, 54);
    addMapSprite(pixi, container, level >= 3 ? mapAssets.bushRound : mapAssets.bushAlt, anchor.x + 8, anchor.y + 8, 68, 28);
    addMapSprite(pixi, container, mapAssets.fence, anchor.x - 26, anchor.y + 12, 56, 42);
    if (level >= 2) {
      addMapSprite(pixi, container, mapAssets.fenceLow, anchor.x + 34, anchor.y + 15, 42, 58);
    }
    if (level >= 3) {
      addMapSprite(pixi, container, mapAssets.sparkle, anchor.x - 30, anchor.y - 58, 26, 26, 0.6);
      addMapSprite(pixi, container, mapAssets.sparkle, anchor.x + 28, anchor.y - 48, 20, 20, 0.5);
    }
    container.addChild(new pixi.Graphics().circle(anchor.x - 14, anchor.y - 28, 16).fill({ color: 0x6fb76a }).stroke({ color: 0x4f8f68, width: 2 }));
    container.addChild(new pixi.Graphics().rect(anchor.x - 18, anchor.y - 14, 8, 18).fill({ color: 0x9b6a3d }));
    return;
  }

  if (building.type === "mine") {
    addMapSprite(pixi, container, mapAssets.dirt, anchor.x, anchor.y + 8, 78, 108);
    addMapSprite(pixi, container, mapAssets.planks, anchor.x - 12, anchor.y + 6, 68, 112);
    addMapSprite(pixi, container, level >= 2 ? mapAssets.ladder : mapAssets.brokenLadder, anchor.x + 24, anchor.y - 2, 42, 92);
    if (level >= 2) {
      addMapSprite(pixi, container, mapAssets.crate, anchor.x + 36, anchor.y + 13, 36, 58);
      addMapSprite(pixi, container, mapAssets.fenceLowBroken, anchor.x - 39, anchor.y + 18, 38, 62);
    }
    if (level >= 3) {
      addMapSprite(pixi, container, mapAssets.smoke, anchor.x - 2, anchor.y - 52, 44, 44, 0.46);
      addMapSprite(pixi, container, mapAssets.sparkle, anchor.x + 26, anchor.y - 38, 30, 30, 0.82);
    }
    addMapSprite(pixi, container, mapAssets.dust, anchor.x - 24, anchor.y - 26, 42, 42, 0.5);
    addMapSprite(pixi, container, mapAssets.sparkle, anchor.x + 17, anchor.y - 30, 26, 26, 0.72);
    container.addChild(
      new pixi.Graphics()
        .poly([anchor.x - 22, anchor.y - 8, anchor.x - 8, anchor.y - 34, anchor.x + 12, anchor.y - 12])
        .fill({ color: 0x7f8792 })
        .stroke({ color: 0x565f68, width: 2 })
    );
    container.addChild(new pixi.Graphics().circle(anchor.x + 18, anchor.y - 28, 4).fill({ color: 0xd9c8ff, alpha: 0.9 }));
    return;
  }

  if (building.type === "lumberYard") {
    addMapSprite(pixi, container, mapAssets.pine, anchor.x - 24, anchor.y + 2, 52, 112);
    addMapSprite(pixi, container, level >= 2 ? mapAssets.tree : mapAssets.smallTreeRound, anchor.x + 22, anchor.y + 4, 44, 96);
    addMapSprite(pixi, container, mapAssets.planks, anchor.x, anchor.y + 10, 58, 94);
    if (level >= 2) {
      addMapSprite(pixi, container, mapAssets.crate, anchor.x + 34, anchor.y + 13, 34, 52);
    }
    if (level >= 3) {
      addMapSprite(pixi, container, mapAssets.house, anchor.x - 38, anchor.y + 10, 42, 30);
      addMapSprite(pixi, container, mapAssets.sparkle, anchor.x + 6, anchor.y - 44, 22, 22, 0.42);
    }
    for (let i = 0; i < 3; i += 1) {
      container.addChild(new pixi.Graphics().roundRect(anchor.x - 22 + i * 13, anchor.y - 12 + i * 3, 26, 8, 4).fill({ color: 0x9b6a3d }));
    }
    return;
  }

  if (building.type === "warehouse") {
    addMapSprite(pixi, container, mapAssets.crate, anchor.x - 12, anchor.y + 6, 60, 92);
    addMapSprite(pixi, container, mapAssets.sack, anchor.x + 24, anchor.y + 8, 34, 52);
    if (level >= 2) {
      addMapSprite(pixi, container, mapAssets.hayStack, anchor.x - 38, anchor.y + 10, 38, 58);
      addMapSprite(pixi, container, mapAssets.planks, anchor.x + 22, anchor.y + 8, 46, 76);
    }
    if (level >= 3) {
      addMapSprite(pixi, container, mapAssets.houseTall, anchor.x + 42, anchor.y + 10, 44, 42);
      addMapSprite(pixi, container, mapAssets.sparkle, anchor.x - 4, anchor.y - 46, 22, 22, 0.44);
    }
    container.addChild(new pixi.Graphics().rect(anchor.x - 20, anchor.y - 28, 14, 14).fill({ color: 0xc99961 }).stroke({ color: 0x8a745b, width: 1 }));
    container.addChild(new pixi.Graphics().rect(anchor.x - 4, anchor.y - 26, 14, 14).fill({ color: 0xe2c18a }).stroke({ color: 0x8a745b, width: 1 }));
    return;
  }

  if (building.type === "expeditionBase") {
    addMapSprite(pixi, container, mapAssets.ladder, anchor.x - 28, anchor.y + 4, 42, 92);
    addMapSprite(pixi, container, mapAssets.crate, anchor.x + 18, anchor.y + 8, 54, 84);
    addMapSprite(pixi, container, level >= 2 ? mapAssets.pine : mapAssets.smallTreeRound, anchor.x + 44, anchor.y + 4, 36, 82);
    if (level >= 2) {
      addMapSprite(pixi, container, mapAssets.fenceLow, anchor.x - 52, anchor.y + 17, 42, 64);
      addMapSprite(pixi, container, mapAssets.sack, anchor.x + 50, anchor.y + 14, 28, 42);
    }
    if (level >= 3) {
      addMapSprite(pixi, container, mapAssets.house, anchor.x - 4, anchor.y + 8, 52, 38);
      addMapSprite(pixi, container, mapAssets.sparkle, anchor.x + 34, anchor.y - 52, 26, 26, 0.62);
    }
    container.addChild(new pixi.Graphics().rect(anchor.x - 4, anchor.y - 56, 6, 32).fill({ color: 0x8a745b }));
    container.addChild(
      new pixi.Graphics()
        .poly([anchor.x + 2, anchor.y - 56, anchor.x + 30, anchor.y - 48, anchor.x + 2, anchor.y - 40])
        .fill({ color: 0x5667a8 })
    );
  }
}

function addMapSprite(
  pixi: PixiModule,
  container: PixiContainer,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1
) {
  const sprite = pixi.Sprite.from(src);
  sprite.anchor.set(0.5, 1);
  sprite.x = x;
  sprite.y = y;
  sprite.width = width;
  sprite.height = height;
  sprite.alpha = alpha;
  container.addChild(sprite);
}

function addScenerySprite(
  pixi: PixiModule,
  container: PixiContainer,
  src: string,
  tileX: number,
  tileY: number,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0,
  alpha = 1
) {
  const center = getTileCenter(tileX, tileY);
  const holder = new pixi.Container();
  holder.zIndex = getIsoSortKey(tileX, tileY, 1);
  const sprite = pixi.Sprite.from(src);
  sprite.anchor.set(0.5, 1);
  sprite.x = center.x + offsetX;
  sprite.y = center.y + offsetY;
  sprite.width = width;
  sprite.height = height;
  sprite.alpha = alpha;
  holder.addChild(sprite);
  container.addChild(holder);
}

function drawStatusBadge(pixi: PixiModule, container: PixiContainer, status: BuildingView["status"], x: number, y: number) {
  const label = status === "building" ? "建設中" : "強化中";
  const badge = new pixi.Graphics().roundRect(x - 28, y - 10, 56, 20, 6).fill({ color: statusColors[status], alpha: 0.94 });
  const text = new pixi.Text({
    text: label,
    style: {
      fill: 0xffffff,
      fontFamily: "Arial, sans-serif",
      fontSize: 10,
      fontWeight: "700"
    }
  });
  text.anchor.set(0.5);
  text.x = x;
  text.y = y;
  container.addChild(badge, text);
}

function getTilePolygon(x: number, y: number) {
  const top = tileToIso(x, y);
  const right = tileToIso(x + 1, y);
  const bottom = tileToIso(x + 1, y + 1);
  const left = tileToIso(x, y + 1);

  return [top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y];
}

function getFootprintPolygon(x: number, y: number, width: number, height: number) {
  const top = tileToIso(x, y);
  const right = tileToIso(x + width, y);
  const bottom = tileToIso(x + width, y + height);
  const left = tileToIso(x, y + height);

  return [top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y];
}

function getFootprintCenter(x: number, y: number, width: number, height: number) {
  const topLeft = tileToIso(x, y);
  const bottomRight = tileToIso(x + width, y + height);

  return {
    x: (topLeft.x + bottomRight.x) / 2,
    y: (topLeft.y + bottomRight.y) / 2
  };
}

function getTileCenter(x: number, y: number) {
  const top = tileToIso(x, y);
  const bottom = tileToIso(x + 1, y + 1);

  return {
    x: (top.x + bottom.x) / 2,
    y: (top.y + bottom.y) / 2
  };
}

function tileKey(x: number, y: number) {
  return `${x}:${y}`;
}

function lightenColor(color: number) {
  const r = Math.min(255, ((color >> 16) & 0xff) + 34);
  const g = Math.min(255, ((color >> 8) & 0xff) + 34);
  const b = Math.min(255, (color & 0xff) + 34);

  return (r << 16) + (g << 8) + b;
}
