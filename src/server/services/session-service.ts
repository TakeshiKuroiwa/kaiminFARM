import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_REFRESH_THRESHOLD_SECONDS,
  SESSION_TTL_SECONDS
} from "@/constants/game-master";
import { randomToken, sha256 } from "@/lib/security/crypto";
import type { AuthSession } from "@/types/auth";
import type { PlayerId } from "@/types/game";
import {
  deleteSession,
  getAuthUser,
  getSession,
  saveSession
} from "../repositories/auth-repository";

export async function createSession(playerId: PlayerId, sessionVersion: number) {
  const now = Date.now();
  const token = randomToken(32);
  const tokenHash = sha256(token);
  const session = {
    playerId,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
    sessionVersion
  };

  await saveSession(tokenHash, session, SESSION_TTL_SECONDS);
  await setSessionCookie(token);
  return session;
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = sha256(token);
  const session = await getSession(tokenHash);
  if (!session || session.expiresAt <= Date.now()) {
    await clearSessionCookie();
    return null;
  }

  const user = await getAuthUser(session.playerId);
  if (!user || user.status !== "active" || user.sessionVersion !== session.sessionVersion) {
    await deleteSession(tokenHash);
    await clearSessionCookie();
    return null;
  }

  const secondsLeft = Math.floor((session.expiresAt - Date.now()) / 1000);
  if (secondsLeft < SESSION_REFRESH_THRESHOLD_SECONDS) {
    const refreshed = {
      ...session,
      lastUsedAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
    };
    await saveSession(tokenHash, refreshed, SESSION_TTL_SECONDS);
    await setSessionCookie(token);
    return { playerId: refreshed.playerId, tokenHash, session: refreshed };
  }

  return { playerId: session.playerId, tokenHash, session };
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function logoutCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteSession(sha256(token));
  }
  await clearSessionCookie();
}

async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}
