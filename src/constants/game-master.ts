import type {
  BuildingType,
  Expedition,
  KaiminOutfit,
  Resident,
  ResidentTalkEvent,
  ResourceId,
  Resources,
  SeasonalEvent,
  WorldEvent
} from "@/types/game";

export const SESSION_COOKIE_NAME = "kaimin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * 15;

export const INITIAL_RESOURCES: Resources = {
  wood: 120,
  food: 80,
  ore: 0,
  dreamCotton: 10
};

export const EMPTY_RESOURCES: Resources = {
  wood: 0,
  food: 0,
  ore: 0,
  dreamCotton: 0
};

export type BuildingMaster = {
  type: BuildingType;
  name: string;
  description: string;
  width: number;
  height: number;
  buildSeconds: number;
  cost: Partial<Resources>;
  productionPerSecond?: Partial<Resources>;
};

export const BUILDING_MASTER: Record<BuildingType, BuildingMaster> = {
  townHall: {
    type: "townHall",
    name: "町役場",
    description: "町の中心となる施設です。",
    width: 2,
    height: 2,
    buildSeconds: 0,
    cost: {}
  },
  house: {
    type: "house",
    name: "住宅",
    description: "住民が暮らす家です。町の人口を増やします。",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 50 }
  },
  lumberYard: {
    type: "lumberYard",
    name: "伐採所",
    description: "時間経過で木材を生産します。",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 30 },
    productionPerSecond: { wood: 0.0333 }
  },
  farm: {
    type: "farm",
    name: "畑",
    description: "時間経過で食料を生産します。",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 30 },
    productionPerSecond: { food: 0.025 }
  },
  mine: {
    type: "mine",
    name: "採掘場",
    description: "時間経過で鉱石を生産します。",
    width: 1,
    height: 1,
    buildSeconds: 900,
    cost: { wood: 80, food: 20 },
    productionPerSecond: { ore: 0.0083 }
  },
  warehouse: {
    type: "warehouse",
    name: "倉庫",
    description: "オフライン生産の上限時間を伸ばします。",
    width: 1,
    height: 1,
    buildSeconds: 600,
    cost: { wood: 100, ore: 20 }
  },
  park: {
    type: "park",
    name: "公園",
    description: "町のここちよさを上げます。",
    width: 1,
    height: 1,
    buildSeconds: 300,
    cost: { wood: 40, dreamCotton: 5 }
  },
  expeditionBase: {
    type: "expeditionBase",
    name: "探索隊本部",
    description: "周辺地域への探索を解放します。",
    width: 2,
    height: 1,
    buildSeconds: 1200,
    cost: { wood: 150, ore: 40 }
  }
};

export const BUILDABLE_BUILDING_TYPES: BuildingType[] = [
  "house",
  "lumberYard",
  "farm",
  "mine",
  "warehouse",
  "park",
  "expeditionBase"
];

export const MAP_WIDTH = 10;
export const MAP_HEIGHT = 10;
export const MAX_BUILDING_LEVEL = 3;

export type ResidentMaster = Omit<Resident, "residentId" | "friendship" | "status" | "x" | "y" | "lastTalkedAt" | "joinedAt"> & {
  unlockHouseCount: number;
  favoriteBuilding: BuildingType;
  talkLines: string[];
  talkEvents: ResidentTalkEvent[];
};

export const RESIDENT_MASTER: ResidentMaster[] = [
  {
    templateId: "moko",
    name: "モコ",
    species: "アルパカ",
    personality: "おっとり",
    skill: "crafting",
    unlockHouseCount: 1,
    favoriteBuilding: "park",
    talkLines: [
      "広場にベンチがあると、つい長く休んでしまいますね。",
      "町役場の掲示板に、今日もふしぎな夢メモが増えていました。",
      "この町の空気は、毛糸を干すのにちょうどいいです。",
      "公園の木陰で、お昼寝用の場所を探していました。",
      "倉庫のそばは風がやわらかくて、少し落ち着きます。",
      "畑の匂いがすると、おなかがゆっくり目を覚まします。",
      "住宅が増えると、夕方の灯りも増えてきれいですね。",
      "採掘場の音は遠くから聞くくらいがちょうどいいです。",
      "夢わたは、ふくらむ前の雲みたいで不思議です。",
      "今日は町の道を、いつもよりゆっくり歩いてみました。"
    ],
    talkEvents: [
      makeTalk("moko_01", "公園の木陰って、時間がゆっくりになる気がします。", "うん、少し休もう", "では一緒に深呼吸しましょう。肩の力が抜けました。", "まだ仕事があるかも", "がんばり屋さんですね。でも休む場所も町には必要です。"),
      makeTalk("moko_02", "新しい毛糸の色を考えていたら、夕方になっていました。", "その色、見てみたい", "ふふ、完成したら一番に見せますね。", "夢中になりすぎだね", "そうですね。好きなことは、つい時間を忘れてしまいます。"),
      makeTalk("moko_03", "町役場の前に、小さな掲示板飾りを置いたらかわいいと思うんです。", "それは似合いそう", "町の入口が少しやさしい顔になりますね。", "置きすぎは困るかも", "たしかに、通り道は広く残しておきたいです。"),
      makeTalk("moko_04", "今日は雲がふわふわで、夢わたみたいでした。", "一緒に眺めよう", "同じ空を見ていると、町が近く感じます。", "雨が降らないといいね", "それも大事ですね。洗濯物を守らなくちゃ。"),
      makeTalk("moko_05", "畑のそばを歩くと、食料を大切にしたくなります。", "収穫に感謝だね", "はい。作ってくれる人にも、土地にも感謝です。", "もっと増やしたいね", "少しずつ増えると、町も安心できますね。"),
      makeTalk("moko_06", "夜の住宅の灯りを見ると、帰る場所があるっていいなと思います。", "うちにも遊びに来て", "ありがとうございます。お茶を持っていきますね。", "きみの家に行きたいな", "では、片づけてから招待します。少し待ってくださいね。"),
      makeTalk("moko_07", "倉庫の整理って、心の整理にも似ていますね。", "一緒に片づけよう", "助かります。軽い箱から順番にいきましょう。", "あとでやろう", "はい。無理なく続けるほうが長持ちします。"),
      makeTalk("moko_08", "今日は町を歩いていたら、小さな花を見つけました。", "それはよかったね", "はい。誰にも踏まれない場所で咲いていました。", "どこにあったの？", "公園の端です。あとで案内しますね。"),
      makeTalk("moko_09", "採掘場の人たちにも、休める場所があるといいですね。", "公園を近くに増やそう", "きっと作業のあとにほっとできますね。", "少し離した方がいいかも", "音のことを考えると、それもやさしい配置です。"),
      makeTalk("moko_10", "町の声を日記に残したら、未来の町が喜ぶでしょうか。", "きっと喜ぶよ", "では今日のことも、やわらかく残しておきます。", "読まれると照れるね", "ふふ、照れるくらいが思い出らしいです。")
    ]
  },
  {
    templateId: "coro",
    name: "コロ",
    species: "犬",
    personality: "元気",
    skill: "exploration",
    unlockHouseCount: 2,
    favoriteBuilding: "expeditionBase",
    talkLines: [
      "近くの林なら、ぼくがすぐに道を覚えられそうです。",
      "道が増えると、町を走るのが楽しくなりますね。",
      "探索隊本部ができたら、いつでも声をかけてください。",
      "まどろみの森には、まだ知らない足あとがありそうです。",
      "地図を見ると、しっぽが勝手に動いてしまいます。",
      "帰り道の目印は、出発前に決めておくのが大事です。",
      "食料の準備ができると、遠くまで行く勇気が出ます。",
      "森の音は、静かなようでけっこうにぎやかです。",
      "探索から戻ったら、見つけたものを広場で見せたいです。",
      "町の外を知るほど、町のよさも見えてきます。"
    ],
    talkEvents: [
      makeTalk("coro_01", "近くの林の道、ぼくならすぐ覚えられそうです。", "頼りにしてるよ", "まかせてください。帰り道までしっかり覚えます。", "迷わないでね", "大丈夫です。目印を三つ決めてから進みます。"),
      makeTalk("coro_02", "探索の前は、なぜか足がそわそわします。", "わくわくするね", "はい。新しい匂いが待っている気がします。", "落ち着いて準備しよう", "そうですね。荷物の確認から始めます。"),
      makeTalk("coro_03", "まどろみの森には、光る木の実があるって聞きました。", "見つけたら教えて", "もちろんです。町のみんなで見たいですね。", "本当にあるのかな？", "わからないから、確かめに行く価値があります。"),
      makeTalk("coro_04", "地図の空白って、ぼくには招待状に見えます。", "かっこいい考え方だね", "えへへ。白いところを少しずつ町の知識にします。", "危ない場所かも", "だからこそ、準備と引き返す勇気も持っていきます。"),
      makeTalk("coro_05", "探索隊本部に旗を立てたら、帰ってくる場所がわかりやすそうです。", "いい目印だね", "遠くから見えたら、みんな安心できます。", "色も決めよう", "青がいいです。空と道の色です。"),
      makeTalk("coro_06", "食料の袋を見ると、遠出の実感がわきます。", "しっかり食べてね", "はい。元気がないと発見も逃げちゃいます。", "分け合って使おう", "それが探索隊らしいですね。"),
      makeTalk("coro_07", "帰ってきたら、町の入口でただいまって言いたいです。", "おかえりって言うよ", "その言葉があると、また出発できます。", "おみやげも期待してる", "ふふ、きれいな葉っぱなら見つけられるかも。"),
      makeTalk("coro_08", "森の奥で静かになる瞬間、町の音を思い出します。", "町が好きなんだね", "はい。外に出るほど、帰る場所が好きになります。", "少し寂しいね", "でも寂しさがあるから、帰り道を大切にできます。"),
      makeTalk("coro_09", "探索中に雨が降ったら、木の下で待つのがいいです。", "無理しないで", "はい。急がない探索も大事です。", "雨の匂いも楽しそう", "わかります。土の匂いで道が変わるんです。"),
      makeTalk("coro_10", "次の探索、誰と組むか考えるだけで楽しいです。", "いいチームにしよう", "はい。得意なことを合わせたら遠くまで行けます。", "ひとりも気楽だよ", "それもあります。でも発見は誰かと分けたいです。")
    ]
  },
  {
    templateId: "mint",
    name: "ミント",
    species: "ウサギ",
    personality: "まじめ",
    skill: "farming",
    unlockHouseCount: 3,
    favoriteBuilding: "farm",
    talkLines: [
      "畑の配置を少し整えるだけで、作業がずっと楽になります。",
      "食料の備蓄は、町が大きくなるほど大切になります。",
      "公園のそばに住宅があると、住民も落ち着いて暮らせます。",
      "収穫量は、毎日の小さな手入れで変わります。",
      "倉庫の備蓄表を見ていると、町の体調がわかります。",
      "採掘場の近くには、休憩場所も計画したいです。",
      "町の配置は、思いやりが形になったものだと思います。",
      "水やりの時間は、考えごとをするのに向いています。",
      "夢わたの使い道は、記録しておくと迷いにくいです。",
      "今日の小さな改善が、明日の安心につながります。"
    ],
    talkEvents: [
      makeTalk("mint_01", "畑の列をそろえると、収穫の手順が見えやすくなります。", "さすが、よく見てるね", "ありがとうございます。少しの整頓で、作業は軽くなります。", "そこまで変わる？", "はい。迷う時間が減ると、休む時間も作れます。"),
      makeTalk("mint_02", "食料の備蓄は、町の安心そのものです。", "多めに用意しよう", "良い判断です。急な探索にも対応できます。", "使いすぎに注意だね", "その通りです。増やすことと守ること、両方大切です。"),
      makeTalk("mint_03", "公園の近くに住宅があると、暮らしの表情がやわらぎます。", "住みやすそうだね", "はい。生活のそばに休める場所があるのは大切です。", "配置を考え直そう", "地図を見ながら、一緒に考えましょう。"),
      makeTalk("mint_04", "採掘場は便利ですが、音のことも計画に入れたいです。", "住宅から離そう", "それがよさそうです。働く場所と休む場所を分けましょう。", "公園で和らげられる？", "少しは。緑は町の緩衝材にもなります。"),
      makeTalk("mint_05", "倉庫の中身を記録すると、次に必要な建物が見えてきます。", "表を作ってみよう", "では資源ごとに欄を分けますね。", "感覚でもいけそう", "感覚も大事ですが、数字は迷った時に助けてくれます。"),
      makeTalk("mint_06", "水やりの時間は、町を観察する時間でもあります。", "一緒に回ろう", "はい。変化を見落とさないようにしましょう。", "毎日は大変そう", "だからこそ、無理のない仕組みにしたいです。"),
      makeTalk("mint_07", "夢わたを使う建物は、優先順位を決めたいですね。", "公園を優先したい", "ここちよさを上げるなら良い選択です。", "温存しておこう", "慎重ですね。必要な時に使える安心もあります。"),
      makeTalk("mint_08", "町の道は、住民の毎日を運ぶ線です。", "歩きやすくしたいね", "はい。遠回りが減ると、気持ちにも余裕ができます。", "見た目も大事だね", "もちろんです。使いやすく美しい配置が理想です。"),
      makeTalk("mint_09", "今日は収穫の音が、いつもより軽く聞こえました。", "それはよかったね", "はい。土の調子が良い証拠かもしれません。", "天気のおかげかな", "それもありそうです。自然はよく見ておきたいです。"),
      makeTalk("mint_10", "小さな改善を続ける町は、急に強くなります。", "毎日少しずつだね", "はい。積み重ねは裏切りません。", "一気に変えたい時もある", "その時は目的を決めて、影響を確認しながら進めましょう。")
    ]
  }
];

function makeTalk(
  eventId: string,
  prompt: string,
  aLabel: string,
  aResponse: string,
  bLabel: string,
  bResponse: string
): ResidentTalkEvent {
  return {
    eventId,
    prompt,
    choices: [
      { choiceId: "a", label: aLabel, response: aResponse, friendshipGained: 2 },
      { choiceId: "b", label: bLabel, response: bResponse, friendshipGained: 1 }
    ]
  };
}

export type ExpeditionAreaMaster = {
  areaId: Expedition["areaId"];
  name: string;
  durationSeconds: number;
  foodCost: number;
  rewards: Partial<Resources>;
};

export const EXPEDITION_AREAS: Record<Expedition["areaId"], ExpeditionAreaMaster> = {
  nearbyWoods: {
    areaId: "nearbyWoods",
    name: "近くの林",
    durationSeconds: 30 * 60,
    foodCost: 10,
    rewards: { wood: 80, food: 20 }
  },
  sleepyForest: {
    areaId: "sleepyForest",
    name: "まどろみの森",
    durationSeconds: 2 * 60 * 60,
    foodCost: 30,
    rewards: { wood: 180, dreamCotton: 6 }
  }
};

export const ACTIVE_WORLD_EVENT: Omit<WorldEvent, "currentAmount" | "startedAt" | "endsAt"> & {
  durationDays: number;
} = {
  eventId: "event_harvest_001",
  title: "ねむり丘収穫祭",
  description: "みんなで食料を持ち寄って、ねむり丘の広場をにぎやかにしましょう。",
  status: "active",
  resourceId: "food" satisfies ResourceId,
  goalAmount: 100000,
  durationDays: 14
};

export const KAIMIN_OUTFITS: Record<KaiminOutfit, { name: string; description: string }> = {
  default: {
    name: "いつものふわふわ",
    description: "過去バージョンとの互換用設定です。現在のUIでは使用しません。"
  },
  nightcap: {
    name: "おやすみナイトキャップ",
    description: "過去バージョンとの互換用設定です。現在のUIでは使用しません。"
  },
  festival: {
    name: "収穫祭のケープ",
    description: "過去バージョンとの互換用設定です。現在のUIでは使用しません。"
  }
};

export const ACTIVE_SEASONAL_EVENT: SeasonalEvent = {
  eventId: "season_sleepy_summer_001",
  title: "まどろみサマー",
  description: "町に涼しい木陰を増やす季節です。公園や住宅を整えて、住民が休みやすい町にしましょう。",
  rewardLabel: "限定フォトフレーム"
};

export const OPERATIONS_STATUS_MESSAGE = "現在、ねむり丘タウンは通常運営中です。";
