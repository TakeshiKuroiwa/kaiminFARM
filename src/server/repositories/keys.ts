import type { PlayerId } from "@/types/game";

export const keys = {
  login: (normalizedLoginId: string) => `auth:login:${normalizedLoginId}`,
  user: (playerId: PlayerId) => `auth:user:${playerId}`,
  recovery: (recoveryCodeHash: string) => `auth:recovery:${recoveryCodeHash}`,
  session: (sessionTokenHash: string) => `session:${sessionTokenHash}`,
  profile: (playerId: PlayerId) => `player:${playerId}:profile`,
  resources: (playerId: PlayerId) => `player:${playerId}:resources`,
  buildings: (playerId: PlayerId) => `player:${playerId}:buildings`,
  residents: (playerId: PlayerId) => `player:${playerId}:residents`,
  expeditions: (playerId: PlayerId) => `player:${playerId}:expeditions`,
  publicTown: (playerId: PlayerId) => `town:public:${playerId}`,
  publicTownLikes: (playerId: PlayerId) => `town:public:${playerId}:likes`,
  publicTownLikeDaily: (targetPlayerId: PlayerId, viewerPlayerId: PlayerId, yyyymmdd: string) =>
    `town:like:${targetPlayerId}:${viewerPlayerId}:${yyyymmdd}`,
  worldEvent: (eventId: string) => `world:event:${eventId}`,
  worldEventContribution: (eventId: string, playerId: PlayerId) => `world:event:${eventId}:player:${playerId}`,
  worldEventRanking: (eventId: string) => `ranking:event:${eventId}`,
  idempotency: (playerId: PlayerId, requestId: string) => `idempotency:${playerId}:${requestId}`
};
