import { getJson, getString, incrBy, setJson, setStringNx } from "@/lib/redis/kv";
import type { PlayerId, PublicTownSnapshot, TownStats } from "@/types/game";
import { keys } from "../repositories/keys";
import { getBuildings, getProfile, getResidents } from "../repositories/game-repository";

export class TownVisitError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export async function updatePublicTownSnapshot(playerId: PlayerId, townStats: TownStats) {
  const [profile, buildings, residents, likesValue] = await Promise.all([
    getProfile(playerId),
    getBuildings(playerId),
    getResidents(playerId),
    getString(keys.publicTownLikes(playerId))
  ]);
  if (!profile || !profile.isTownPublic) {
    return null;
  }

  const snapshot: PublicTownSnapshot = {
    playerId,
    displayName: profile.displayName,
    townName: profile.townName,
    townRank: profile.townRank,
    townLevel: profile.townLevel,
    comfort: townStats.comfort,
    likes: Number(likesValue ?? 0),
    snapshotAt: Date.now(),
    buildings,
    residents,
    townStats
  };
  await setJson(keys.publicTown(playerId), snapshot);
  return snapshot;
}

export async function getPublicTownSnapshot(townId: PlayerId) {
  return getJson<PublicTownSnapshot>(keys.publicTown(townId));
}

export async function sendGoodDream(targetPlayerId: PlayerId, viewerPlayerId: PlayerId) {
  if (targetPlayerId === viewerPlayerId) {
    throw new TownVisitError("FORBIDDEN", "自分の町にはいい夢を送れません。", 403);
  }

  const town = await getPublicTownSnapshot(targetPlayerId);
  if (!town) {
    throw new TownVisitError("NOT_FOUND", "公開町が見つかりません。", 404);
  }

  const dayKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const reserved = await setStringNx(keys.publicTownLikeDaily(targetPlayerId, viewerPlayerId, dayKey), "1", 60 * 60 * 48);
  if (!reserved) {
    throw new TownVisitError("CONFLICT", "今日はすでにいい夢を送っています。", 409);
  }

  const likes = await incrBy(keys.publicTownLikes(targetPlayerId), 1);
  const nextTown = { ...town, likes, snapshotAt: Date.now() };
  await setJson(keys.publicTown(targetPlayerId), nextTown);
  return nextTown;
}
