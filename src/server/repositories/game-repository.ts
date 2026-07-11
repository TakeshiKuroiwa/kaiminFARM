import { getJson, setJson } from "@/lib/redis/kv";
import type {
  BuildingInstance,
  Expedition,
  PlayerId,
  PlayerProfile,
  Resident,
  Resources
} from "@/types/game";
import { keys } from "./keys";

export async function saveProfile(profile: PlayerProfile) {
  await setJson(keys.profile(profile.playerId), profile);
}

export async function getProfile(playerId: PlayerId) {
  return getJson<PlayerProfile>(keys.profile(playerId));
}

export async function saveResources(playerId: PlayerId, resources: Resources) {
  await setJson(keys.resources(playerId), resources);
}

export async function getResources(playerId: PlayerId) {
  return getJson<Resources>(keys.resources(playerId));
}

export async function saveBuildings(playerId: PlayerId, buildings: BuildingInstance[]) {
  await setJson(keys.buildings(playerId), buildings);
}

export async function getBuildings(playerId: PlayerId) {
  return (await getJson<BuildingInstance[]>(keys.buildings(playerId))) ?? [];
}

export async function saveResidents(playerId: PlayerId, residents: Resident[]) {
  await setJson(keys.residents(playerId), residents);
}

export async function getResidents(playerId: PlayerId) {
  return (await getJson<Resident[]>(keys.residents(playerId))) ?? [];
}

export async function saveExpeditions(playerId: PlayerId, expeditions: Expedition[]) {
  await setJson(keys.expeditions(playerId), expeditions);
}

export async function getExpeditions(playerId: PlayerId) {
  return (await getJson<Expedition[]>(keys.expeditions(playerId))) ?? [];
}
