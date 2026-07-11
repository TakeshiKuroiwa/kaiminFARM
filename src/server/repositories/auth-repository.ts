import { deleteKeys, getJson, getString, setJson, setString, setStringNx } from "@/lib/redis/kv";
import type { AuthUser, SessionRecord } from "@/types/auth";
import type { PlayerId } from "@/types/game";
import { keys } from "./keys";

export async function findPlayerIdByLoginId(normalizedLoginId: string) {
  return getString(keys.login(normalizedLoginId));
}

export async function reserveLoginId(normalizedLoginId: string, playerId: PlayerId) {
  return setStringNx(keys.login(normalizedLoginId), playerId);
}

export async function saveAuthUser(user: AuthUser) {
  await setJson(keys.user(user.playerId), user);
}

export async function getAuthUser(playerId: PlayerId) {
  return getJson<AuthUser>(keys.user(playerId));
}

export async function saveRecoveryCodeHash(recoveryCodeHash: string, playerId: PlayerId) {
  await setString(keys.recovery(recoveryCodeHash), playerId);
}

export async function findPlayerIdByRecoveryCodeHash(recoveryCodeHash: string) {
  return getString(keys.recovery(recoveryCodeHash));
}

export async function deleteRecoveryCodeHash(recoveryCodeHash: string) {
  await deleteKeys(keys.recovery(recoveryCodeHash));
}

export async function saveSession(tokenHash: string, session: SessionRecord, ttlSeconds: number) {
  await setJson(keys.session(tokenHash), session, ttlSeconds);
}

export async function getSession(tokenHash: string) {
  return getJson<SessionRecord>(keys.session(tokenHash));
}

export async function deleteSession(tokenHash: string) {
  await deleteKeys(keys.session(tokenHash));
}
