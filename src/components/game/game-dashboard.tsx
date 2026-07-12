"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PixiTownMap } from "@/components/game/pixi-town-map";
import {
  BUILDABLE_BUILDING_TYPES,
  BUILDING_MASTER,
  EXPEDITION_AREAS,
  MAX_BUILDING_LEVEL
} from "@/constants/game-master";
import type {
  BuildingInstance,
  BuildingType,
  Expedition,
  GameState,
  PublicTownSnapshot,
  Resident,
  ResourceId,
  Resources
} from "@/types/game";
import type { BuildingView, TileView } from "@/lib/game-view/map-view-model";

type GameStateResult =
  | {
      ok: true;
      data: GameState;
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

type TalkResult =
  | {
      ok: true;
      data: {
        resident: Resident;
        line: string;
        friendshipGained: number;
      };
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

type ClaimExpeditionResult =
  | {
      ok: true;
      data: {
        state: GameState | null;
        rewards: Resources;
      };
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

type WorldEventContributeResult =
  | {
      ok: true;
      data: {
        state: GameState | null;
      };
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

type TownVisitResult =
  | {
      ok: true;
      data: {
        town: PublicTownSnapshot;
      };
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

type ActionPanel = "build" | "buildings" | "residents" | "expeditions" | "event" | "visit";

const rankLabels = {
  smallSettlement: "小さな集落",
  slowVillage: "のんびり村",
  fluffyTown: "ふわふわ町"
};

const statusLabels = {
  building: "建設中",
  active: "稼働中",
  upgrading: "強化中"
};

const actionPanelLabels: Record<ActionPanel, string> = {
  build: "建設",
  buildings: "建物",
  residents: "住民",
  expeditions: "探索",
  event: "イベント",
  visit: "訪問"
};

export function GameDashboard() {
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [buildType, setBuildType] = useState<BuildingType>("lumberYard");
  const [buildX, setBuildX] = useState(0);
  const [buildY, setBuildY] = useState(0);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [moveX, setMoveX] = useState(0);
  const [moveY, setMoveY] = useState(0);
  const [dialogue, setDialogue] = useState("");
  const [expeditionAreaId, setExpeditionAreaId] = useState<Expedition["areaId"]>("nearbyWoods");
  const [selectedResidentIds, setSelectedResidentIds] = useState<string[]>([]);
  const [eventAmount, setEventAmount] = useState(10);
  const [visitTownId, setVisitTownId] = useState("");
  const [visitedTown, setVisitedTown] = useState<PublicTownSnapshot | null>(null);
  const [activePanel, setActivePanel] = useState<ActionPanel>("build");
  const [diaryOpen, setDiaryOpen] = useState(false);
  const previousResourcesRef = useRef<Resources | null>(null);
  const [resourceGains, setResourceGains] = useState<Partial<Resources>>({});

  useEffect(() => {
    let active = true;
    fetch("/api/game/state", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: GameStateResult) => {
        if (!active) {
          return;
        }
        if (result.ok) {
          setState(result.data);
          setDiaryOpen(result.data.offlineReport.diary.length > 0);
          return;
        }
        setError(result.error.message);
      })
      .catch(() => setError("ゲーム状態を取得できませんでした。"));

    return () => {
      active = false;
    };
  }, []);

  const selectedBuilding = useMemo(() => {
    return state?.buildings.find((building) => building.instanceId === selectedBuildingId) ?? null;
  }, [selectedBuildingId, state?.buildings]);

  const selectedResourceCost = BUILDING_MASTER[buildType].cost;

  const claimableExpeditions = useMemo(() => {
    return state?.expeditions.filter((expedition) => expedition.status === "claimable").length ?? 0;
  }, [state?.expeditions]);

  const worldEventProgress = useMemo(() => {
    if (!state) {
      return 0;
    }
    return Math.min(100, Math.round((state.worldEvent.event.currentAmount / state.worldEvent.event.goalAmount) * 100));
  }, [state]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const previousResources = previousResourcesRef.current;
    previousResourcesRef.current = state.resources;

    if (!previousResources) {
      return;
    }

    const gains: Partial<Resources> = {};
    for (const resourceId of Object.keys(state.resources) as ResourceId[]) {
      const difference = state.resources[resourceId] - previousResources[resourceId];
      if (difference > 0) {
        gains[resourceId] = difference;
      }
    }

    if (Object.keys(gains).length === 0) {
      return;
    }

    setResourceGains(gains);
    const timerId = window.setTimeout(() => setResourceGains({}), 1400);

    return () => window.clearTimeout(timerId);
  }, [state]);

  async function refreshState() {
    const response = await fetch("/api/game/state", { cache: "no-store" });
    const result = (await response.json()) as GameStateResult;
    if (result.ok) {
      setState(result.data);
      setError("");
      return;
    }
    setError(result.error.message);
  }

  async function postBuildingAction(path: string, payload: Record<string, unknown>, successMessage: string) {
    setActionMessage("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        ...payload
      })
    });
    const result = (await response.json()) as GameStateResult;
    if (!result.ok) {
      setActionMessage(result.error.message);
      return;
    }
    setState(result.data);
    setActionMessage(successMessage);
  }

  async function buildSelectedBuilding() {
    await postBuildingAction(
      "/api/buildings/build",
      { buildingType: buildType, x: buildX, y: buildY },
      "建設を開始しました。"
    );
  }

  async function upgradeSelectedBuilding(building: BuildingInstance) {
    await postBuildingAction(
      "/api/buildings/upgrade",
      { instanceId: building.instanceId },
      "強化を開始しました。"
    );
  }

  async function moveSelectedBuilding() {
    if (!selectedBuilding) {
      setActionMessage("移動する建物を選択してください。");
      return;
    }
    await postBuildingAction(
      "/api/buildings/move",
      { instanceId: selectedBuilding.instanceId, x: moveX, y: moveY },
      "建物を移動しました。"
    );
  }

  async function talkToResident(resident: Resident) {
    setDialogue("");
    const response = await fetch("/api/residents/talk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ residentId: resident.residentId })
    });
    const result = (await response.json()) as TalkResult;
    if (!result.ok) {
      setActionMessage(result.error.message);
      return;
    }

    setState((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        residents: current.residents.map((item) =>
          item.residentId === result.data.resident.residentId ? result.data.resident : item
        )
      };
    });
    setDialogue(`${result.data.resident.name}: ${result.data.line}`);
    setActionMessage(`${result.data.resident.name}となかよし度が${result.data.friendshipGained}上がりました。`);
  }

  async function startExpedition() {
    setActionMessage("");
    const response = await fetch("/api/expeditions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        areaId: expeditionAreaId,
        memberIds: selectedResidentIds
      })
    });
    const result = (await response.json()) as GameStateResult;
    if (!result.ok) {
      setActionMessage(result.error.message);
      return;
    }
    setState(result.data);
    setActionMessage("探索隊を派遣しました。");
  }

  async function claimExpedition(expedition: Expedition) {
    setActionMessage("");
    const response = await fetch("/api/expeditions/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        expeditionId: expedition.expeditionId
      })
    });
    const result = (await response.json()) as ClaimExpeditionResult;
    if (!result.ok) {
      setActionMessage(result.error.message);
      return;
    }
    if (result.data.state) {
      setState(result.data.state);
    }
    setActionMessage(`探索報酬を受け取りました。${formatReward(result.data.rewards)}`);
  }

  async function contributeToWorldEvent() {
    if (!state) {
      return;
    }
    setActionMessage("");
    const response = await fetch("/api/world-event/contribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        eventId: state.worldEvent.event.eventId,
        resourceId: state.worldEvent.event.resourceId,
        amount: eventAmount
      })
    });
    const result = (await response.json()) as WorldEventContributeResult;
    if (!result.ok) {
      setActionMessage(result.error.message);
      return;
    }
    if (result.data.state) {
      setState(result.data.state);
    }
    setActionMessage("世界イベントへ資源を納品しました。");
  }

  async function visitTown() {
    setActionMessage("");
    setVisitedTown(null);
    const response = await fetch(`/api/towns/${encodeURIComponent(visitTownId)}`, { cache: "no-store" });
    const result = (await response.json()) as TownVisitResult;
    if (!result.ok) {
      setActionMessage(result.error.message);
      return;
    }
    setVisitedTown(result.data.town);
  }

  async function sendGoodDream() {
    if (!visitedTown) {
      return;
    }
    const response = await fetch(`/api/towns/${encodeURIComponent(visitedTown.playerId)}/like`, { method: "POST" });
    const result = (await response.json()) as TownVisitResult;
    if (!result.ok) {
      setActionMessage(result.error.message);
      return;
    }
    setVisitedTown(result.data.town);
    setActionMessage("いい夢を送りました。");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function selectTile(tile: TileView) {
    if (tile.occupiedBy) {
      const building = state?.buildings.find((item) => item.instanceId === tile.occupiedBy);
      if (building) {
        selectBuilding(building);
      }
      return;
    }

    setBuildX(tile.x);
    setBuildY(tile.y);
    setMoveX(tile.x);
    setMoveY(tile.y);
    setActivePanel("build");
  }

  function selectBuilding(building: Pick<BuildingInstance, "instanceId" | "x" | "y">) {
    setSelectedBuildingId(building.instanceId);
    setMoveX(building.x);
    setMoveY(building.y);
    setActivePanel("buildings");
  }

  function selectResident() {
    setActivePanel("residents");
  }

  if (error) {
    return (
      <main className="page stack">
        <section className="panel stack">
          <p className="error">{error}</p>
          <button onClick={() => router.push("/login")}>ログインへ</button>
        </section>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="page">
        <section className="panel">読み込み中</section>
      </main>
    );
  }

  return (
    <main className="game-page">
      {diaryOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="offline-diary-title">
          <section className="modal-panel stack">
            <div className="diary-head">
              <div>
                <h2 id="offline-diary-title">kaiminちゃんの留守番日記</h2>
                <p className="muted">町役場に届いた、留守のあいだの町の記録です。</p>
              </div>
            </div>
            <div className="resource-grid">
              <div className="resource">木材 +{state.offlineReport.gainedResources.wood}</div>
              <div className="resource">食料 +{state.offlineReport.gainedResources.food}</div>
              <div className="resource">鉱石 +{state.offlineReport.gainedResources.ore}</div>
              <div className="resource">夢わた +{state.offlineReport.gainedResources.dreamCotton}</div>
            </div>
            <div className="diary-list">
              {state.offlineReport.diary.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <button type="button" onClick={() => setDiaryOpen(false)}>
              町へ行く
            </button>
          </section>
        </div>
      ) : null}

      <header className="game-hud">
        <div className="town-title">
          <h1>{state.profile.townName}</h1>
          <p className="muted">
            {state.profile.displayName} / {rankLabels[state.profile.townRank]}
          </p>
          <p className="muted small">公開町ID: {state.profile.playerId}</p>
        </div>
        <div className="hud-resources" aria-label="資源">
          <div className={resourceGains.wood ? "resource-chip gain" : "resource-chip"}>
            <span>木材</span>
            <strong>{state.resources.wood}</strong>
            {resourceGains.wood ? <em className="resource-delta">+{resourceGains.wood}</em> : null}
          </div>
          <div className={resourceGains.food ? "resource-chip gain" : "resource-chip"}>
            <span>食料</span>
            <strong>{state.resources.food}</strong>
            {resourceGains.food ? <em className="resource-delta">+{resourceGains.food}</em> : null}
          </div>
          <div className={resourceGains.ore ? "resource-chip gain" : "resource-chip"}>
            <span>鉱石</span>
            <strong>{state.resources.ore}</strong>
            {resourceGains.ore ? <em className="resource-delta">+{resourceGains.ore}</em> : null}
          </div>
          <div className={resourceGains.dreamCotton ? "resource-chip gain" : "resource-chip"}>
            <span>夢わた</span>
            <strong>{state.resources.dreamCotton}</strong>
            {resourceGains.dreamCotton ? <em className="resource-delta">+{resourceGains.dreamCotton}</em> : null}
          </div>
        </div>
        <div className="hud-actions">
          <button className="secondary" type="button" onClick={refreshState}>
            更新
          </button>
          <button className="secondary" type="button" onClick={logout}>
            ログアウト
          </button>
        </div>
      </header>

      <div className="game-shell">
        <nav className="action-rail" aria-label="ゲーム操作">
          {(Object.keys(actionPanelLabels) as ActionPanel[]).map((panel) => (
            <button
              className={panel === activePanel ? "rail-button active" : "rail-button"}
              key={panel}
              type="button"
              onClick={() => setActivePanel(panel)}
            >
              <span>{actionPanelLabels[panel]}</span>
              {panel === "expeditions" && claimableExpeditions > 0 ? <strong>{claimableExpeditions}</strong> : null}
            </button>
          ))}
        </nav>

        <section className="map-stage panel stack">
          <div className="map-header">
            <div className="map-title">
              <h2>ねむり丘マップ</h2>
              <p className="muted small">
                {state.offlineReport.calculatedSeconds > 0
                  ? "留守中の変化が反映されています。"
                  : "建物を選ぶと右側に詳細が出ます。"}
              </p>
            </div>
            <p className="map-note">町役場、住宅、畑、公園の配置で町の表情が変わります。</p>
          </div>
          <div className="map-board" aria-label="町のマップ">
            <PixiTownMap
              buildTarget={{ x: buildX, y: buildY, type: buildType }}
              eventProgress={worldEventProgress}
              mapSource={state}
              onBuildingSelect={(building: BuildingView) => selectBuilding(building)}
              onResidentSelect={selectResident}
              onTileSelect={selectTile}
              seasonalEventId={state.seasonalEvent.eventId}
              selectedBuildingId={selectedBuildingId}
            />
          </div>
        </section>

        <aside className="inspector panel stack">
          <div>
            <h2>{actionPanelLabels[activePanel]}</h2>
            <p className="muted small">{selectedBuilding ? `${BUILDING_MASTER[selectedBuilding.type].name}を選択中` : "マップまたは左の操作を選んでください。"}</p>
          </div>

          {activePanel === "build" ? (
            <>
              <div className="compact-form">
                <label>
                  建物
                  <select value={buildType} onChange={(event) => setBuildType(event.target.value as BuildingType)}>
                    {BUILDABLE_BUILDING_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {BUILDING_MASTER[type].name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  X
                  <input type="number" min={0} max={9} value={buildX} onChange={(event) => setBuildX(Number(event.target.value))} />
                </label>
                <label>
                  Y
                  <input type="number" min={0} max={9} value={buildY} onChange={(event) => setBuildY(Number(event.target.value))} />
                </label>
              </div>
              <article className="detail-card">
                <strong>{BUILDING_MASTER[buildType].name}</strong>
                <p className="muted">{BUILDING_MASTER[buildType].description}</p>
                <p className="small">必要資源: {formatCost(selectedResourceCost)}</p>
                <p className="small">サイズ: {BUILDING_MASTER[buildType].width}x{BUILDING_MASTER[buildType].height}</p>
              </article>
              <button type="button" onClick={buildSelectedBuilding}>
                建設
              </button>
            </>
          ) : null}

          {activePanel === "buildings" ? (
            <>
              {selectedBuilding ? (
                <article className="detail-card">
                  <strong>
                    {BUILDING_MASTER[selectedBuilding.type].name} Lv.{selectedBuilding.level}
                    {selectedBuilding.targetLevel ? ` -> ${selectedBuilding.targetLevel}` : ""}
                  </strong>
                  <p className="muted small">
                    {statusLabels[selectedBuilding.status]} / ({selectedBuilding.x}, {selectedBuilding.y})
                  </p>
                  <p>{BUILDING_MASTER[selectedBuilding.type].description}</p>
                  <div className="row">
                    <button
                      className="secondary"
                      disabled={selectedBuilding.status !== "active" || selectedBuilding.level >= MAX_BUILDING_LEVEL || selectedBuilding.type === "townHall"}
                      type="button"
                      onClick={() => upgradeSelectedBuilding(selectedBuilding)}
                    >
                      強化
                    </button>
                    <button
                      className="secondary"
                      disabled={selectedBuilding.status !== "active"}
                      type="button"
                      onClick={moveSelectedBuilding}
                    >
                      移動
                    </button>
                  </div>
                </article>
              ) : (
                <p className="muted">マップまたは一覧から建物を選択してください。</p>
              )}
              <div className="compact-form">
                <label>
                  移動先X
                  <input type="number" min={0} max={9} value={moveX} onChange={(event) => setMoveX(Number(event.target.value))} />
                </label>
                <label>
                  移動先Y
                  <input type="number" min={0} max={9} value={moveY} onChange={(event) => setMoveY(Number(event.target.value))} />
                </label>
              </div>
              <div className="scroll-list">
                {state.buildings.map((building) => (
                  <button
                    className={building.instanceId === selectedBuildingId ? "list-button selected" : "list-button"}
                    key={building.instanceId}
                    type="button"
                    onClick={() => {
                      setSelectedBuildingId(building.instanceId);
                      setMoveX(building.x);
                      setMoveY(building.y);
                    }}
                  >
                    <span>
                      {BUILDING_MASTER[building.type].name} Lv.{building.level}
                    </span>
                    <small>
                      {statusLabels[building.status]} ({building.x}, {building.y})
                    </small>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {activePanel === "residents" ? (
            <>
              {state.residents.length === 0 ? (
                <p className="muted">住宅が完成すると、新しい住民が町へやってきます。</p>
              ) : (
                <div className="scroll-list">
                  {state.residents.map((resident) => (
                    <article className="detail-card" key={resident.residentId}>
                      <strong>
                        {resident.name} / {resident.species}
                      </strong>
                      <p className="muted small">
                        {resident.personality} / なかよし度 {resident.friendship} / ({resident.x}, {resident.y})
                      </p>
                      <button className="secondary" disabled={resident.status !== "idle"} type="button" onClick={() => talkToResident(resident)}>
                        会話
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {activePanel === "expeditions" ? (
            <>
              <div className="compact-form">
                <label>
                  探索先
                  <select value={expeditionAreaId} onChange={(event) => setExpeditionAreaId(event.target.value as Expedition["areaId"])}>
                    {Object.values(EXPEDITION_AREAS).map((area) => (
                      <option key={area.areaId} value={area.areaId}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  派遣住民
                  <select
                    multiple
                    value={selectedResidentIds}
                    onChange={(event) => {
                      setSelectedResidentIds(Array.from(event.currentTarget.selectedOptions).map((option) => option.value));
                    }}
                  >
                    {state.residents.map((resident) => (
                      <option key={resident.residentId} value={resident.residentId} disabled={resident.status !== "idle"}>
                        {resident.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <article className="detail-card">
                <strong>{EXPEDITION_AREAS[expeditionAreaId].name}</strong>
                <p className="small">
                  食料{EXPEDITION_AREAS[expeditionAreaId].foodCost} / {Math.floor(EXPEDITION_AREAS[expeditionAreaId].durationSeconds / 60)}分
                </p>
              </article>
              <button type="button" onClick={startExpedition}>
                探索開始
              </button>
              <div className="scroll-list">
                {state.expeditions.map((expedition) => (
                  <article className="detail-card" key={expedition.expeditionId}>
                    <strong>{EXPEDITION_AREAS[expedition.areaId].name}</strong>
                    <p className="muted small">
                      {expedition.status === "running" ? "探索中" : expedition.status === "claimable" ? "報酬受取可" : "受取済み"} / 帰還{" "}
                      {new Date(expedition.completeAt).toLocaleTimeString("ja-JP")}
                    </p>
                    <button className="secondary" disabled={expedition.status !== "claimable"} type="button" onClick={() => claimExpedition(expedition)}>
                      報酬受取
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {activePanel === "event" ? (
            <>
              <article className="detail-card">
                <strong>{state.worldEvent.event.title}</strong>
                <p className="muted">{state.worldEvent.event.description}</p>
                <div className="progress-bar" aria-label={`世界イベント進捗 ${worldEventProgress}%`}>
                  <span style={{ width: `${worldEventProgress}%` }} />
                </div>
                <p className="small">
                  進捗 {state.worldEvent.event.currentAmount} / {state.worldEvent.event.goalAmount}
                </p>
                <p className="small">自分の貢献量 {state.worldEvent.personalContribution}</p>
              </article>
              <div className="compact-form">
                <label>
                  納品量
                  <input type="number" min={1} max={100000} value={eventAmount} onChange={(event) => setEventAmount(Number(event.target.value))} />
                </label>
                <button type="button" onClick={contributeToWorldEvent}>
                  {resourceLabel(state.worldEvent.event.resourceId)}を納品
                </button>
              </div>
              <div className="scroll-list">
                {state.worldEvent.ranking.map((entry, index) => (
                  <div className="resource" key={entry.playerId}>
                    {index + 1}. {entry.playerId.slice(0, 16)} / {entry.score}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {activePanel === "visit" ? (
            <>
              <div className="compact-form">
                <label>
                  公開町ID
                  <input value={visitTownId} onChange={(event) => setVisitTownId(event.target.value)} />
                </label>
                <button type="button" onClick={visitTown}>
                  訪問
                </button>
              </div>
              {visitedTown ? (
                <article className="detail-card visit-card">
                  <strong>{visitedTown.townName}</strong>
                  <p className="muted">
                    {visitedTown.displayName} / {rankLabels[visitedTown.townRank]} / いい夢 {visitedTown.likes}
                  </p>
                  <p className="small">
                    人口 {visitedTown.townStats.population} / ここちよさ {visitedTown.townStats.comfort} / 建物 {visitedTown.buildings.length}
                  </p>
                  <div className="visit-map-shell">
                    <PixiTownMap mapSource={visitedTown} readOnly seasonalEventId={state.seasonalEvent.eventId} />
                  </div>
                  <button className="secondary" type="button" onClick={sendGoodDream}>
                    いい夢を送る
                  </button>
                </article>
              ) : null}
            </>
          ) : null}

          {actionMessage ? <p className={actionMessage.includes("足り") || actionMessage.includes("でき") ? "error" : "success"}>{actionMessage}</p> : null}
        </aside>
      </div>

      <section className="bottom-log">
        <div className="log-card">
          <strong>町の評価</strong>
          <div className="stat-strip">
            <span>人口 {state.townStats.population}</span>
            <span>生産力 {state.townStats.productionPower}</span>
            <span>ここちよさ {state.townStats.comfort}</span>
            <span>にぎわい {state.townStats.bustle}</span>
            <span>安心度 {state.townStats.safety}</span>
            <span>自然度 {state.townStats.nature}</span>
          </div>
        </div>
        <div className="log-card">
          <strong>{state.seasonalEvent.title}</strong>
          <p className="muted small">{state.seasonalEvent.description}</p>
        </div>
        <div className="log-card">
          <strong>町の声</strong>
          <p className="muted small">{dialogue || state.operationsStatus.message}</p>
          {state.offlineReport.diary.length > 0 ? (
            <button className="text-button" type="button" onClick={() => setDiaryOpen(true)}>
              留守番日記を読む
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function formatCost(cost: Partial<Record<string, number>>) {
  const labels: Record<string, string> = {
    wood: "木材",
    food: "食料",
    ore: "鉱石",
    dreamCotton: "夢わた"
  };
  const entries = Object.entries(cost).filter(([, amount]) => amount && amount > 0);
  if (entries.length === 0) {
    return "なし";
  }
  return entries.map(([resourceId, amount]) => `${labels[resourceId]}${amount}`).join("、");
}

function resourceLabel(resourceId: string) {
  const labels: Record<string, string> = {
    wood: "木材",
    food: "食料",
    ore: "鉱石",
    dreamCotton: "夢わた"
  };
  return labels[resourceId] ?? resourceId;
}

function formatReward(resources: Resources) {
  const text = formatCost(resources);
  return text === "なし" ? "" : ` ${text}`;
}
