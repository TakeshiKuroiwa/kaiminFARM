import type { PlayerId, UnixTimeMs } from "./game";

export type AuthUser = {
  playerId: PlayerId;
  passwordHash: string;
  createdAt: UnixTimeMs;
  passwordUpdatedAt: UnixTimeMs;
  status: "active" | "suspended" | "deleted";
  sessionVersion: number;
};

export type SessionRecord = {
  playerId: PlayerId;
  createdAt: UnixTimeMs;
  lastUsedAt: UnixTimeMs;
  expiresAt: UnixTimeMs;
  sessionVersion: number;
};

export type AuthSession = {
  playerId: PlayerId;
  tokenHash: string;
  session: SessionRecord;
};
