"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BuildingType, GameState, PublicTownSnapshot } from "@/types/game";
import { BUILDING_MASTER } from "@/constants/game-master";
import { createMapViewModel, type BuildingView, type MapViewModel, type MapViewSource, type ResidentView, type TileView } from "@/lib/game-view/map-view-model";
import { tileToIso } from "@/lib/game-view/iso-coordinate";

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
  tree: "/assets/kenney/objects/tree.png",
  pine: "/assets/kenney/objects/treePine.png",
  smallTree: "/assets/kenney/objects/treeSmall_green1.png",
  bush: "/assets/kenney/objects/bush1.png",
  bushAlt: "/assets/kenney/objects/bushAlt1.png",
  fence: "/assets/kenney/objects/fence.png",
  planks: "/assets/kenney/isometric/planksHighOld_S.png",
  ladder: "/assets/kenney/isometric/ladderStand_S.png",
  brokenLadder: "/assets/kenney/isometric/ladderStandBroken_S.png",
  dirt: "/assets/kenney/isometric/dirt_S.png",
  sack: "/assets/kenney/isometric/sack_S.png",
  crate: "/assets/kenney/isometric/sacksCrate_S.png",
  smoke: "/assets/kenney/particles/smoke_04.png",
  dust: "/assets/kenney/particles/dirt_01.png",
  sparkle: "/assets/kenney/particles/star_03.png"
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
  const objectLayer = new pixi.Container();
  const overlayLayer = new pixi.Container();
  objectLayer.sortableChildren = true;

  root.addChild(environmentLayer, groundLayer, objectLayer, overlayLayer);
  drawEnvironment(pixi, environmentLayer, animationTargets, seasonalEventId);

  for (const tile of viewModel.tiles) {
    const isTarget = !readOnly && buildTarget ? tile.x === buildTarget.x && tile.y === buildTarget.y : false;
    const tileGraphic = new pixi.Graphics()
      .poly(getTilePolygon(tile.x, tile.y))
      .fill({ color: isTarget ? 0xcfeee3 : getTileColor(tile.x, tile.y) })
      .stroke({ color: isTarget ? 0x4f8f68 : 0x8fbd73, width: isTarget ? 3 : 1 });

    if (!readOnly && onTileSelect) {
      tileGraphic.eventMode = "static";
      tileGraphic.cursor = "pointer";
      tileGraphic.on("pointertap", () => onTileSelect(tile));
    }
    groundLayer.addChild(tileGraphic);
  }

  drawWorldEventPlaza(pixi, objectLayer, eventProgress, seasonalEventId);

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
      .fill({ color, alpha: building.status === "building" ? 0.45 : 0.72 })
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
  if (building.type === "townHall") {
    addMapSprite(pixi, container, mapAssets.house, anchor.x - 22, anchor.y - 20, 66, 52);
    addMapSprite(pixi, container, mapAssets.house, anchor.x + 22, anchor.y - 17, 58, 44);
    addMapSprite(pixi, container, mapAssets.bushAlt, anchor.x, anchor.y + 5, 58, 20);
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
    addMapSprite(pixi, container, mapAssets.house, anchor.x, anchor.y + 2, 78, 56);
    addMapSprite(pixi, container, mapAssets.smallTree, anchor.x - 28, anchor.y - 4, 24, 48);
    addMapSprite(pixi, container, mapAssets.bush, anchor.x + 22, anchor.y + 4, 46, 22);
    return;
  }

  if (building.type === "farm") {
    addMapSprite(pixi, container, mapAssets.dirt, anchor.x, anchor.y + 4, 74, 98);
    addMapSprite(pixi, container, mapAssets.sack, anchor.x + 22, anchor.y + 3, 30, 48);
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
    addMapSprite(pixi, container, mapAssets.smallTree, anchor.x + 26, anchor.y + 4, 26, 54);
    addMapSprite(pixi, container, mapAssets.bushAlt, anchor.x + 8, anchor.y + 8, 68, 24);
    addMapSprite(pixi, container, mapAssets.fence, anchor.x - 26, anchor.y + 12, 56, 42);
    container.addChild(new pixi.Graphics().circle(anchor.x - 14, anchor.y - 28, 16).fill({ color: 0x6fb76a }).stroke({ color: 0x4f8f68, width: 2 }));
    container.addChild(new pixi.Graphics().rect(anchor.x - 18, anchor.y - 14, 8, 18).fill({ color: 0x9b6a3d }));
    return;
  }

  if (building.type === "mine") {
    addMapSprite(pixi, container, mapAssets.dirt, anchor.x, anchor.y + 8, 78, 108);
    addMapSprite(pixi, container, mapAssets.planks, anchor.x - 12, anchor.y + 6, 68, 112);
    addMapSprite(pixi, container, mapAssets.ladder, anchor.x + 24, anchor.y - 2, 42, 92);
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
    addMapSprite(pixi, container, mapAssets.tree, anchor.x + 22, anchor.y + 4, 44, 96);
    addMapSprite(pixi, container, mapAssets.planks, anchor.x, anchor.y + 10, 58, 94);
    for (let i = 0; i < 3; i += 1) {
      container.addChild(new pixi.Graphics().roundRect(anchor.x - 22 + i * 13, anchor.y - 12 + i * 3, 26, 8, 4).fill({ color: 0x9b6a3d }));
    }
    return;
  }

  if (building.type === "warehouse") {
    addMapSprite(pixi, container, mapAssets.crate, anchor.x - 12, anchor.y + 6, 60, 92);
    addMapSprite(pixi, container, mapAssets.sack, anchor.x + 24, anchor.y + 8, 34, 52);
    container.addChild(new pixi.Graphics().rect(anchor.x - 20, anchor.y - 28, 14, 14).fill({ color: 0xc99961 }).stroke({ color: 0x8a745b, width: 1 }));
    container.addChild(new pixi.Graphics().rect(anchor.x - 4, anchor.y - 26, 14, 14).fill({ color: 0xe2c18a }).stroke({ color: 0x8a745b, width: 1 }));
    return;
  }

  if (building.type === "expeditionBase") {
    addMapSprite(pixi, container, mapAssets.ladder, anchor.x - 28, anchor.y + 4, 42, 92);
    addMapSprite(pixi, container, mapAssets.crate, anchor.x + 18, anchor.y + 8, 54, 84);
    addMapSprite(pixi, container, mapAssets.pine, anchor.x + 44, anchor.y + 4, 36, 82);
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

function getTileColor(x: number, y: number) {
  if ((x + y) % 5 === 0) {
    return 0xaed986;
  }
  if ((x * 3 + y) % 7 === 0) {
    return 0xc2e29b;
  }
  return 0xb7de8a;
}

function lightenColor(color: number) {
  const r = Math.min(255, ((color >> 16) & 0xff) + 34);
  const g = Math.min(255, ((color >> 8) & 0xff) + 34);
  const b = Math.min(255, (color & 0xff) + 34);

  return (r << 16) + (g << 8) + b;
}
