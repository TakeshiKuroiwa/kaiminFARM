# kaiminFARM

眠っている間にも町が育つ、町の造形を主役にした放置型町づくりシミュレーションゲームです。

## 概要

`kaiminFARM` は、Webブラウザで遊べる放置型生活・町づくりゲーム『kaiminちゃんのねむり丘タウン』の実装プロジェクトです。

プレイヤーはログインIDとパスワードでアカウントを作成し、小さな町を発展させます。ゲームを閉じている間の時間経過は、次回アクセス時にサーバー時刻を使って精算します。

現在のUI方針では、kaiminちゃんは画面上のキャラクタービジュアルとしては登場しません。留守番日記や町役場の記録など、テキスト上の語り手・案内役として扱い、ゲーム画面は村や町の建物、地形、施設、活動マーカーを中心に見せます。

## 実装状況

基本設計書の開発フェーズ1からフェーズ5までのMVP機能を実装済みです。

### アカウント・基盤

- Next.js / React / TypeScript のアプリ基盤
- アカウント登録
- ログイン
- ログアウト
- 全端末ログアウト
- 30日セッションCookie
- パスワードハッシュ化
- 復旧コード発行
- 復旧コードによるパスワード再設定API
- 初期ゲームデータ作成
- Redis接続抽象化
- Redis未設定時の開発用メモリストア

### コアゲーム

- サーバー時刻による時間経過精算
- 留守番日記
- 10×10マップ
- 建物建設
- 建物強化
- 建物移動
- 建設中/強化中建物の完了処理
- 建物マスターに基づく資源生産
- 倉庫によるオフライン生産上限の更新
- 町ランクと町評価
- 町マップ中心のゲーム画面
- PixiJSによる等角投影マップ描画
- 建物タイプ別の地面タイル、小道/道路レイヤー、レベル別の小物集合表現

### 生活要素

- 住宅数に応じた住民の移住
- 住民一覧
- 住民会話
- 会話によるなかよし度上昇
- 住民の簡易マップ移動
- 公園、住宅、採掘場の隣接効果
- 町評価表示

### 探索・イベント

- 探索先2種類
- 探索隊の派遣
- 探索完了状態の反映
- 探索報酬の受取
- 世界イベント1種類
- 世界イベントへの資源納品
- 個人貢献度
- イベント貢献ランキング
- 季節イベント表示

### 交流・運営

- 町の公開スナップショット
- 他プレイヤーの町訪問
- 「いい夢」リアクション
- 同一プレイヤーから同一町への1日1回制限
- 運営ステータス表示

## 技術構成

- Next.js App Router
- React
- TypeScript
- bcryptjs
- zod
- Vercel
- Redis

## 画像素材

ゲーム画面のUI、探索演出、世界イベント演出、資源アイコン、背景装飾にはKenneyのCC0素材を使用しています。

使用素材パック:

- Kenney Isometric Miniature Farm
- Kenney Pixel UI Pack
- Kenney Particle Pack
- Kenney Background Elements Remastered

リポジトリ直下に展開した `kenney*` 原本フォルダは `.gitignore` で除外しています。アプリで実際に参照する素材のみ `public/assets/kenney/` に配置しています。Kenney素材はCC0ですが、出典管理のため詳細は [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) に記載しています。

## Redis環境変数

Vercelに連携するRedisでは、以下の環境変数名を使用します。

```text
KV_REST_API_READ_ONLY_TOKEN
KV_REST_API_TOKEN
KV_REST_API_URL
KV_URL
REDIS_URL
```

現在の実装では、`KV_REST_API_URL` と `KV_REST_API_TOKEN` が設定されている場合にRedis REST APIへ接続します。未設定の場合は、ローカル開発用のメモリストアで動作します。

## セットアップ

```bash
npm install
```

## 開発サーバー

```bash
npm run dev
```

起動後、以下へアクセスします。

```text
http://localhost:3000
```

## 検証コマンド

```bash
npm run typecheck
npm run lint
npm run build
```

## 画面

| パス | 内容 |
| --- | --- |
| `/` | タイトル画面 |
| `/register` | アカウント登録 |
| `/login` | ログイン |
| `/terms` | 利用規約 |
| `/game` | ゲーム画面 |
| `/settings` | アカウント設定 |

## API

| メソッド | パス | 内容 |
| --- | --- | --- |
| POST | `/api/auth/register` | アカウント登録 |
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/logout` | ログアウト |
| POST | `/api/auth/logout-all` | 全端末ログアウト |
| GET | `/api/auth/session` | セッション確認 |
| POST | `/api/auth/password/change` | パスワード変更 |
| POST | `/api/auth/password/recover` | 復旧コードによるパスワード再設定 |
| GET | `/api/game/state` | ゲーム状態取得 |
| POST | `/api/game/start` | ゲーム開始 |
| POST | `/api/player/preferences` | プレイヤー表示設定更新。衣装設定は互換用に保持 |
| POST | `/api/buildings/build` | 建物建設 |
| POST | `/api/buildings/upgrade` | 建物強化 |
| POST | `/api/buildings/move` | 建物移動 |
| GET | `/api/residents` | 住民一覧 |
| POST | `/api/residents/talk` | 住民会話 |
| POST | `/api/expeditions/start` | 探索開始 |
| POST | `/api/expeditions/claim` | 探索報酬受取 |
| GET | `/api/world-event` | 世界イベント取得 |
| POST | `/api/world-event/contribute` | 世界イベント納品 |
| GET | `/api/rankings` | ランキング取得 |
| GET | `/api/towns/:townId` | 公開町取得 |
| POST | `/api/towns/:townId/like` | いい夢リアクション |

## 設計書

- [GamePlan.md](./GamePlan.md)
- [基本設計書.md](./基本設計書.md)
- [詳細設計書.md](./詳細設計書.md)
- [デザイン設計書.md](./デザイン設計書.md)
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)

## 補足

`npm audit --omit=dev` では、Next.js経由のPostCSS moderate警告が検出されています。`npm audit fix --force` はNext.jsを古いメジャーバージョンへ下げる破壊的提案になるため、現時点では適用していません。
