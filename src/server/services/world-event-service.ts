import { ACTIVE_WORLD_EVENT } from "@/constants/game-master";
import { getJson, setJson, zIncrBy, zRevRangeWithScores } from "@/lib/redis/kv";
import type { PlayerId, RankingEntry, ResourceId, WorldEvent } from "@/types/game";
import { keys } from "../repositories/keys";

export async function getActiveWorldEvent() {
  const key = keys.worldEvent(ACTIVE_WORLD_EVENT.eventId);
  const existing = await getJson<WorldEvent>(key);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const event: WorldEvent = {
    eventId: ACTIVE_WORLD_EVENT.eventId,
    title: ACTIVE_WORLD_EVENT.title,
    description: ACTIVE_WORLD_EVENT.description,
    status: ACTIVE_WORLD_EVENT.status,
    resourceId: ACTIVE_WORLD_EVENT.resourceId,
    goalAmount: ACTIVE_WORLD_EVENT.goalAmount,
    currentAmount: 0,
    startedAt: now,
    endsAt: now + ACTIVE_WORLD_EVENT.durationDays * 24 * 60 * 60 * 1000
  };
  await setJson(key, event);
  return event;
}

export async function addWorldEventContribution(playerId: PlayerId, resourceId: ResourceId, amount: number) {
  const event = await getActiveWorldEvent();
  if (event.status !== "active" || event.endsAt <= Date.now()) {
    throw new Error("EVENT_CLOSED");
  }
  if (resourceId !== event.resourceId) {
    throw new Error("INVALID_RESOURCE");
  }

  const nextEvent: WorldEvent = {
    ...event,
    currentAmount: Math.min(event.goalAmount, event.currentAmount + amount),
    status: event.currentAmount + amount >= event.goalAmount ? "finished" : event.status
  };
  await Promise.all([
    setJson(keys.worldEvent(event.eventId), nextEvent),
    setJson(keys.worldEventContribution(event.eventId, playerId), { amount: await getPersonalContribution(event.eventId, playerId) + amount }),
    zIncrBy(keys.worldEventRanking(event.eventId), amount, playerId)
  ]);

  return {
    event: nextEvent,
    personalContribution: await getPersonalContribution(event.eventId, playerId),
    ranking: await getEventRanking(event.eventId)
  };
}

export async function getWorldEventState(playerId: PlayerId) {
  const event = await getActiveWorldEvent();
  return {
    event,
    personalContribution: await getPersonalContribution(event.eventId, playerId),
    ranking: await getEventRanking(event.eventId)
  };
}

export async function getPersonalContribution(eventId: string, playerId: PlayerId) {
  const contribution = await getJson<{ amount: number }>(keys.worldEventContribution(eventId, playerId));
  return contribution?.amount ?? 0;
}

export async function getEventRanking(eventId: string): Promise<RankingEntry[]> {
  const entries = await zRevRangeWithScores(keys.worldEventRanking(eventId), 0, 9);
  return entries.map((entry) => ({ playerId: entry.member, score: entry.score }));
}
