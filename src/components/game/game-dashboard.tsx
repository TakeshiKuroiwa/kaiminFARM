"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BUILDABLE_BUILDING_TYPES,
  BUILDING_MASTER,
  EXPEDITION_AREAS,
  KAIMIN_OUTFITS,
  MAX_BUILDING_LEVEL
} from "@/constants/game-master";
import type {
  BuildingInstance,
  BuildingType,
  Expedition,
  GameState,
  KaiminOutfit,
  PublicTownSnapshot,
  Resident,
  Resources
} from "@/types/game";

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

const buildingLabels: Record<string, string> = {
  townHall: "町",
  house: "家",
  lumberYard: "木",
  farm: "畑",
  mine: "鉱",
  warehouse: "倉",
  park: "公",
  expeditionBase: "探"
};

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
          return;
        }
        setError(result.error.message);
      })
      .catch(() => setError("ゲーム状態を取得できませんでした。"));

    return () => {
      active = false;
    };
  }, []);

  const tiles = useMemo(() => {
    const cells = Array.from({ length: 100 }, (_, index) => ({
      x: index % 10,
      y: Math.floor(index / 10),
      label: "",
      status: ""
    }));

    for (const building of state?.buildings ?? []) {
      for (let dy = 0; dy < building.height; dy += 1) {
        for (let dx = 0; dx < building.width; dx += 1) {
          const x = building.x + dx;
          const y = building.y + dy;
          const cell = cells.find((tile) => tile.x === x && tile.y === y);
          if (cell) {
            cell.label = buildingLabels[building.type] ?? building.type;
            cell.status = building.status;
          }
        }
      }
    }

    for (const resident of state?.residents ?? []) {
      const cell = cells.find((tile) => tile.x === resident.x && tile.y === resident.y);
      if (cell && !cell.label) {
        cell.label = resident.name.slice(0, 1);
        cell.status = "resident";
      }
    }

    return cells;
  }, [state?.buildings, state?.residents]);

  const selectedBuilding = useMemo(() => {
    return state?.buildings.find((building) => building.instanceId === selectedBuildingId) ?? null;
  }, [selectedBuildingId, state?.buildings]);

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

  async function changeKaiminOutfit(outfit: KaiminOutfit) {
    setActionMessage("");
    const response = await fetch("/api/player/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kaiminOutfit: outfit })
    });
    const result = (await response.json()) as GameStateResult;
    if (!result.ok) {
      setActionMessage(result.error.message);
      return;
    }
    setState(result.data);
    setActionMessage("kaiminちゃんの衣装を変更しました。");
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
    <main className="page stack">
      <section className="panel stack">
        <div className="row space-between">
          <div>
            <h1>{state.profile.townName}</h1>
            <p className="muted">
              {state.profile.displayName} / {rankLabels[state.profile.townRank]}
            </p>
            <p className="muted small">公開町ID: {state.profile.playerId}</p>
          </div>
          <div className="row">
            <button className="secondary" onClick={refreshState}>
              更新
            </button>
            <button className="secondary" onClick={logout}>
              ログアウト
            </button>
          </div>
        </div>
        <div className="resource-grid">
          <div className="resource">木材 {state.resources.wood}</div>
          <div className="resource">食料 {state.resources.food}</div>
          <div className="resource">鉱石 {state.resources.ore}</div>
          <div className="resource">夢わた {state.resources.dreamCotton}</div>
        </div>
      </section>
      <section className="panel kaimin">
        <div className="kaimin-avatar" aria-hidden="true">
          羊
        </div>
        <div>
          <h2>kaiminちゃん</h2>
          <p className="muted">
            {state.offlineReport.calculatedSeconds > 0
              ? "留守のあいだの町の様子をまとめてくれました。"
              : "町役場のそばで、次の建設を待っています。"}
          </p>
          <label>
            衣装
            <select value={state.profile.kaiminOutfit} onChange={(event) => changeKaiminOutfit(event.target.value as KaiminOutfit)}>
              {Object.entries(KAIMIN_OUTFITS).map(([outfit, detail]) => (
                <option key={outfit} value={outfit}>
                  {detail.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="panel stack">
        <h2>季節イベント</h2>
        <strong>{state.seasonalEvent.title}</strong>
        <p className="muted">{state.seasonalEvent.description}</p>
        <p>報酬: {state.seasonalEvent.rewardLabel}</p>
      </section>
      <section className="panel stack">
        <h2>運営ステータス</h2>
        <p>{state.operationsStatus.message}</p>
      </section>
      <section className="panel stack">
        <h2>町の評価</h2>
        <div className="stat-grid">
          <div className="resource">人口 {state.townStats.population}</div>
          <div className="resource">生産力 {state.townStats.productionPower}</div>
          <div className="resource">ここちよさ {state.townStats.comfort}</div>
          <div className="resource">にぎわい {state.townStats.bustle}</div>
          <div className="resource">安心度 {state.townStats.safety}</div>
          <div className="resource">自然度 {state.townStats.nature}</div>
        </div>
      </section>
      {state.offlineReport.diary.length > 0 ? (
        <section className="panel stack">
          <h2>kaiminちゃんの留守番日記</h2>
          {state.offlineReport.diary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ) : null}
      <section className="panel stack">
        <h2>町のマップ</h2>
        <div className="map-grid">
          {tiles.map((tile) => (
            <div
              className={tile.label ? `tile occupied ${tile.status}` : "tile"}
              key={`${tile.x}:${tile.y}`}
              title={`${tile.x}:${tile.y}`}
            >
              {tile.label}
            </div>
          ))}
        </div>
      </section>
      <section className="panel stack">
        <h2>町訪問</h2>
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
          <article className="building-card">
            <strong>{visitedTown.townName}</strong>
            <p className="muted">
              {visitedTown.displayName} / {rankLabels[visitedTown.townRank]} / いい夢 {visitedTown.likes}
            </p>
            <p className="small">
              人口 {visitedTown.townStats.population} / ここちよさ {visitedTown.townStats.comfort} / 建物 {visitedTown.buildings.length}
            </p>
            <button className="secondary" type="button" onClick={sendGoodDream}>
              いい夢を送る
            </button>
          </article>
        ) : null}
      </section>
      <section className="panel stack">
        <h2>住民</h2>
        {state.residents.length === 0 ? (
          <p className="muted">住宅が完成すると、新しい住民が町へやってきます。</p>
        ) : (
          <div className="building-grid">
            {state.residents.map((resident) => (
              <article className="building-card" key={resident.residentId}>
                <div>
                  <strong>
                    {resident.name} / {resident.species}
                  </strong>
                  <p className="muted small">
                    {resident.personality} / なかよし度 {resident.friendship} / ({resident.x}, {resident.y})
                  </p>
                </div>
                <button className="secondary" disabled={resident.status !== "idle"} onClick={() => talkToResident(resident)}>
                  会話
                </button>
              </article>
            ))}
          </div>
        )}
        {dialogue ? <p className="dialogue">{dialogue}</p> : null}
      </section>
      <section className="panel stack">
        <h2>探索</h2>
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
          <button type="button" onClick={startExpedition}>
            探索開始
          </button>
        </div>
        <p className="muted small">
          {EXPEDITION_AREAS[expeditionAreaId].name} / 食料{EXPEDITION_AREAS[expeditionAreaId].foodCost} /{" "}
          {Math.floor(EXPEDITION_AREAS[expeditionAreaId].durationSeconds / 60)}分
        </p>
        <div className="building-grid">
          {state.expeditions.map((expedition) => (
            <article className="building-card" key={expedition.expeditionId}>
              <strong>{EXPEDITION_AREAS[expedition.areaId].name}</strong>
              <p className="muted small">
                {expedition.status === "running" ? "探索中" : expedition.status === "claimable" ? "報酬受取可" : "受取済み"} / 帰還{" "}
                {new Date(expedition.completeAt).toLocaleTimeString("ja-JP")}
              </p>
              <button className="secondary" disabled={expedition.status !== "claimable"} onClick={() => claimExpedition(expedition)}>
                報酬受取
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel stack">
        <h2>世界イベント</h2>
        <div>
          <strong>{state.worldEvent.event.title}</strong>
          <p className="muted">{state.worldEvent.event.description}</p>
          <p>
            進捗 {state.worldEvent.event.currentAmount} / {state.worldEvent.event.goalAmount}
          </p>
          <p className="muted">自分の貢献量 {state.worldEvent.personalContribution}</p>
        </div>
        <div className="compact-form">
          <label>
            納品量
            <input
              type="number"
              min={1}
              max={100000}
              value={eventAmount}
              onChange={(event) => setEventAmount(Number(event.target.value))}
            />
          </label>
          <button type="button" onClick={contributeToWorldEvent}>
            {resourceLabel(state.worldEvent.event.resourceId)}を納品
          </button>
        </div>
        <div className="building-grid">
          {state.worldEvent.ranking.map((entry, index) => (
            <div className="resource" key={entry.playerId}>
              {index + 1}. {entry.playerId.slice(0, 16)} / {entry.score}
            </div>
          ))}
        </div>
      </section>
      <section className="panel stack">
        <h2>建設</h2>
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
          <button type="button" onClick={buildSelectedBuilding}>
            建設
          </button>
        </div>
        <p className="muted small">
          {BUILDING_MASTER[buildType].description} 必要資源: {formatCost(BUILDING_MASTER[buildType].cost)}
        </p>
        {actionMessage ? <p className={actionMessage.includes("足り") || actionMessage.includes("でき") ? "error" : "success"}>{actionMessage}</p> : null}
      </section>
      <section className="panel stack">
        <h2>建物一覧</h2>
        <div className="building-grid">
          {state.buildings.map((building) => (
            <article className="building-card" key={building.instanceId}>
              <div>
                <strong>
                  {BUILDING_MASTER[building.type].name} Lv.{building.level}
                  {building.targetLevel ? ` → ${building.targetLevel}` : ""}
                </strong>
                <p className="muted small">
                  {statusLabels[building.status]} / ({building.x}, {building.y})
                </p>
              </div>
              <div className="row">
                <button
                  className="secondary"
                  disabled={building.status !== "active" || building.level >= MAX_BUILDING_LEVEL || building.type === "townHall"}
                  onClick={() => upgradeSelectedBuilding(building)}
                >
                  強化
                </button>
                <button
                  className="secondary"
                  disabled={building.status !== "active"}
                  onClick={() => {
                    setSelectedBuildingId(building.instanceId);
                    setMoveX(building.x);
                    setMoveY(building.y);
                  }}
                >
                  移動選択
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="compact-form">
          <label>
            移動先X
            <input type="number" min={0} max={9} value={moveX} onChange={(event) => setMoveX(Number(event.target.value))} />
          </label>
          <label>
            移動先Y
            <input type="number" min={0} max={9} value={moveY} onChange={(event) => setMoveY(Number(event.target.value))} />
          </label>
          <button type="button" onClick={moveSelectedBuilding}>
            選択中の建物を移動
          </button>
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
