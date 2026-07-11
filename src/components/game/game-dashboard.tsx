"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameState } from "@/types/game";

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

export function GameDashboard() {
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");

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
      label: ""
    }));

    for (const building of state?.buildings ?? []) {
      for (let dy = 0; dy < building.height; dy += 1) {
        for (let dx = 0; dx < building.width; dx += 1) {
          const x = building.x + dx;
          const y = building.y + dy;
          const cell = cells.find((tile) => tile.x === x && tile.y === y);
          if (cell) {
            cell.label = buildingLabels[building.type] ?? building.type;
          }
        }
      }
    }

    return cells;
  }, [state?.buildings]);

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
        <div className="row">
          <div>
            <h1>{state.profile.townName}</h1>
            <p className="muted">{state.profile.displayName} / 小さな集落</p>
          </div>
          <button className="secondary" onClick={logout}>
            ログアウト
          </button>
        </div>
        <div className="resource-grid">
          <div className="resource">木材 {state.resources.wood}</div>
          <div className="resource">食料 {state.resources.food}</div>
          <div className="resource">鉱石 {state.resources.ore}</div>
          <div className="resource">夢わた {state.resources.dreamCotton}</div>
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
            <div className={tile.label ? "tile occupied" : "tile"} key={`${tile.x}:${tile.y}`}>
              {tile.label}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
