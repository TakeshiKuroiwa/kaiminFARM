import {
  ACTIVE_SEASONAL_EVENT,
  BUILDING_MASTER,
  EMPTY_RESOURCES,
  EXPEDITION_AREAS,
  OPERATIONS_STATUS_MESSAGE
} from "@/constants/game-master";
import type { GameState, Resources } from "@/types/game";
import {
  getBuildings,
  getExpeditions,
  getProfile,
  getResources,
  getResidents,
  saveProfile,
  saveResources,
  saveBuildings,
  saveResidents,
  saveExpeditions
} from "../repositories/game-repository";
import {
  addResources,
  calculateGainedResources,
  calculateOfflineLimitSeconds,
  calculateProduction,
  calculateTownRank,
  calculateTownStats,
  completeTimedBuildings,
  syncResidentsWithTown
} from "./game-mechanics";
import { getWorldEventState } from "./world-event-service";
import { updatePublicTownSnapshot } from "./town-visit-service";

export async function getSettledGameState(playerId: string): Promise<GameState | null> {
  const now = Date.now();
  const [profile, resources, buildings, residents, expeditions] = await Promise.all([
    getProfile(playerId),
    getResources(playerId),
    getBuildings(playerId),
    getResidents(playerId),
    getExpeditions(playerId)
  ]);

  if (!profile || !resources) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - profile.lastCalculatedAt) / 1000));
  const calculatedSeconds = Math.min(elapsedSeconds, profile.offlineLimitSeconds);
  const completion = completeTimedBuildings(buildings, now);
  const nextExpeditions = expeditions.map((expedition) =>
    expedition.status === "running" && expedition.completeAt <= now ? { ...expedition, status: "claimable" as const } : expedition
  );
  const completedExpeditionNames = nextExpeditions
    .filter((expedition) => expedition.status === "claimable" && expeditions.find((item) => item.expeditionId === expedition.expeditionId)?.status === "running")
    .map((expedition) => EXPEDITION_AREAS[expedition.areaId].name);
  const stats = calculateTownStats(completion.buildings);
  const residentSync = syncResidentsWithTown(residents, completion.buildings, now);
  const gainedResources =
    calculatedSeconds > 0
      ? calculateGainedResources(calculateProduction(completion.buildings, profile), calculatedSeconds)
      : { ...EMPTY_RESOURCES };

  const nextResources = addResources(resources, gainedResources);
  const nextProfile = {
    ...profile,
    kaiminOutfit: profile.kaiminOutfit ?? "default",
    townRank: calculateTownRank(stats),
    offlineLimitSeconds: calculateOfflineLimitSeconds(completion.buildings),
    lastCalculatedAt: now,
    updatedAt: now
  };

  if (
    calculatedSeconds > 0 ||
    completion.completedNames.length > 0 ||
    completedExpeditionNames.length > 0 ||
    nextProfile.townRank !== profile.townRank ||
    residentSync.joinedNames.length > 0
  ) {
    await Promise.all([
      saveResources(playerId, nextResources),
      saveProfile(nextProfile),
      saveBuildings(playerId, completion.buildings),
      saveResidents(playerId, residentSync.residents),
      saveExpeditions(playerId, nextExpeditions)
    ]);
  }

  const diary = buildDiary(
    gainedResources,
    calculatedSeconds,
    completion.completedNames,
    completedExpeditionNames,
    residentSync.joinedNames,
    residentSync.residents.map((resident) => resident.name)
  );
  const worldEvent = await getWorldEventState(playerId);
  await updatePublicTownSnapshot(playerId, stats);

  return {
    serverTime: now,
    profile: nextProfile,
    resources: nextResources,
    buildings: completion.buildings,
    residents: residentSync.residents,
    expeditions: nextExpeditions,
    townStats: stats,
    worldEvent,
    seasonalEvent: ACTIVE_SEASONAL_EVENT,
    operationsStatus: {
      status: "normal",
      message: OPERATIONS_STATUS_MESSAGE,
      updatedAt: now
    },
    offlineReport: {
      elapsedSeconds,
      calculatedSeconds,
      gainedResources,
      diary
    }
  };
}

function buildDiary(
  gained: Resources,
  calculatedSeconds: number,
  completedNames: string[],
  completedExpeditionNames: string[],
  joinedNames: string[],
  residentNames: string[]
) {
  const diary: string[] = [];
  if (calculatedSeconds <= 0) {
    return [
      ...completedNames.map((name) => `${name}が完成しました。`),
      ...completedExpeditionNames.map((name) => `${name}の探索隊が戻ってきました。`),
      ...joinedNames.map((name) => `${name}が町に引っ越してきました。`)
    ].slice(0, 5);
  }
  if (gained.wood > 0) {
    diary.push(`伐採所で木材が${gained.wood}個集まりました。`);
  }
  if (gained.food > 0) {
    diary.push(`畑で食料が${gained.food}個収穫されました。`);
  }
  if (gained.ore > 0) {
    diary.push(`採掘場から鉱石が${gained.ore}個届きました。`);
  }
  for (const name of completedNames) {
    diary.push(`${name}が完成しました。`);
  }
  for (const name of completedExpeditionNames) {
    diary.push(`${name}の探索隊が戻ってきました。`);
  }
  for (const name of joinedNames) {
    diary.push(`${name}が町に引っ越してきました。`);
  }
  const activeProductionCount = Object.entries(gained).filter(([, amount]) => amount > 0).length;
  if (activeProductionCount === 0) {
    diary.push("町は静かに朝を迎えました。");
  }
  if (residentNames.length > 0) {
    const residentName = residentNames[Math.floor(Date.now() / 60000) % residentNames.length];
    diary.push(`${residentName}が広場を散歩していました。`);
  }
  diary.push(getKaiminDiaryNote(calculatedSeconds, gained, completedNames.length + completedExpeditionNames.length + joinedNames.length));
  if (completedNames.some((name) => name === BUILDING_MASTER.park.name)) {
    diary.push("新しい公園の木陰に、休憩中の住民の足あとが残っていました。");
  }
  return diary.slice(0, 5);
}

const KAIMIN_DIARY_NOTES = [
  "kaiminちゃんメモ: 町役場の前を三回見回ったけど、今日も平和だったmin♪",
  "kaiminちゃんメモ: 雲の形が夢わたに似ていて、少しだけ空を収穫したくなったmin♪",
  "kaiminちゃんメモ: 広場のすみで小さな足あとを見つけたmin♪ たぶん楽しい寄り道だmin♪",
  "kaiminちゃんメモ: 風がやさしかったから、掲示板の紙もごきげんに揺れていたmin♪",
  "kaiminちゃんメモ: 町の灯りを数えたら、途中で眠くなったmin♪",
  "kaiminちゃんメモ: 倉庫の前で背伸びをしたら、少しだけ管理上手になった気がするmin♪",
  "kaiminちゃんメモ: 公園の葉っぱが拍手みたいに鳴っていたmin♪",
  "kaiminちゃんメモ: 畑の匂いでおなかが返事をしたmin♪ これは内緒だmin♪",
  "kaiminちゃんメモ: 採掘場の方からきらっと音がしたmin♪ 音も光ることがあるmin♪",
  "kaiminちゃんメモ: 町の道をなぞっていたら、地図が少し仲良くなってくれたmin♪",
  "kaiminちゃんメモ: 留守番は静かだけど、町の小さな音がよく聞こえるmin♪",
  "kaiminちゃんメモ: 夢わたをひとつ見ていたら、ふたつぶん眠くなったmin♪",
  "kaiminちゃんメモ: 朝の空気を瓶に入れたいくらい、すっきりしていたmin♪",
  "kaiminちゃんメモ: 住宅の窓辺にやわらかい光があったmin♪ 帰る場所の色だmin♪",
  "kaiminちゃんメモ: 今日は掲示板に『よくできました』の気配を書いておいたmin♪",
  "kaiminちゃんメモ: 小さな草が伸びていたmin♪ 町も少しずつ伸びているmin♪",
  "kaiminちゃんメモ: 風向きを調べようとして、くるっと回りすぎたmin♪",
  "kaiminちゃんメモ: 町役場の屋根を見上げたら、なんだか頼もしかったmin♪",
  "kaiminちゃんメモ: 作業の音が遠くでぽこぽこして、町が起きている感じだったmin♪",
  "kaiminちゃんメモ: 今日の町は、昨日よりほんの少し胸を張っていたmin♪",
  "kaiminちゃんメモ: 道の端に落ちていた葉っぱを、きれいな方へ向けておいたmin♪",
  "kaiminちゃんメモ: 休憩中の空気を見つけたmin♪ 公園の近くに多めだったmin♪",
  "kaiminちゃんメモ: 町のにぎわいを数えようとしたけど、途中から楽しくなって忘れたmin♪",
  "kaiminちゃんメモ: 夕方の色がやわらかくて、町全体がふとんみたいだったmin♪",
  "kaiminちゃんメモ: 誰かのただいまを聞いた気がしたmin♪ いい音だったmin♪",
  "kaiminちゃんメモ: 今日は資源たちもきちんと並んでいて、えらかったmin♪",
  "kaiminちゃんメモ: 木材の香りをかいだら、建物の未来が少し見えたmin♪",
  "kaiminちゃんメモ: 食料のそばを通ったら、明日の元気が置いてあったmin♪",
  "kaiminちゃんメモ: 鉱石は無口だけど、光るときだけおしゃべりだmin♪",
  "kaiminちゃんメモ: 夢わたは軽いのに、町の気持ちをふくらませるmin♪",
  "kaiminちゃんメモ: 今日は何もない時間も、ちゃんと町の一部だったmin♪",
  "kaiminちゃんメモ: 探索隊の帰り道に、迷わないよう気持ちだけ旗を振ったmin♪",
  "kaiminちゃんメモ: 町のすみっこまで見たmin♪ すみっこも町の顔だったmin♪",
  "kaiminちゃんメモ: 足あとが交差していて、みんなの一日が編み物みたいだったmin♪",
  "kaiminちゃんメモ: 少し眠かったけど、留守番のまじめ顔は守ったmin♪",
  "kaiminちゃんメモ: 建設中の場所から、これから始まる音がしていたmin♪",
  "kaiminちゃんメモ: 強化中の建物を応援したmin♪ 声は小さめにしたmin♪",
  "kaiminちゃんメモ: 町の空気を整えておいたmin♪ たぶん少しふかふかだmin♪",
  "kaiminちゃんメモ: 今日の発見は、静かな町ほどよくしゃべるってことだmin♪",
  "kaiminちゃんメモ: おかえりの準備はできていたmin♪ 町も待っていたmin♪"
];

function getKaiminDiaryNote(calculatedSeconds: number, gained: Resources, eventCount: number) {
  const gainedTotal = gained.wood + gained.food + gained.ore + gained.dreamCotton;
  const seed = calculatedSeconds + gainedTotal * 7 + eventCount * 13 + Math.floor(Date.now() / 60000);
  return KAIMIN_DIARY_NOTES[Math.abs(seed) % KAIMIN_DIARY_NOTES.length];
}
