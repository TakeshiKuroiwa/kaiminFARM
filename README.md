# kaiminFARM

眠っている間にも町が育つ、羊のkaiminちゃんと作る放置型町づくりシミュレーションゲームです。

## 概要

`kaiminFARM` は、Webブラウザで遊べる放置型生活・町づくりゲーム『kaiminちゃんのねむり丘タウン』の実装プロジェクトです。

プレイヤーはログインIDとパスワードでアカウントを作成し、kaiminちゃんと一緒に小さな町を発展させます。ゲームを閉じている間の時間経過は、次回アクセス時にサーバー時刻を使って精算します。

## 現在の実装範囲

基本設計書の開発フェーズ2相当まで実装済みです。

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
- 初期ゲーム状態取得API
- タイトル画面
- 登録画面
- ログイン画面
- 最小のゲーム画面
- Redis接続抽象化
- Redis未設定時の開発用メモリストア
- サーバー時刻による時間経過精算
- 建設中/強化中建物の完了処理
- 建物建設API
- 建物強化API
- 建物移動API
- 建物マスターに基づく資源生産
- 倉庫によるオフライン生産上限の更新
- 町ランクと簡易町評価
- kaiminちゃん表示
- 留守番日記の生成
- ゲーム画面からの建設、強化、移動操作

## 技術構成

- Next.js App Router
- React
- TypeScript
- bcryptjs
- zod
- Vercel
- Redis

## Redis環境変数

Vercelに連携するRedisでは、以下の環境変数名を使用します。

```text
KV_REST_API_READ_ONLY_TOKEN
KV_REST_API_TOKEN
KV_REST_API_URL
KV_URL
REDIS_URL
```

現時点の実装では、`KV_REST_API_URL` と `KV_REST_API_TOKEN` が設定されている場合にRedis REST APIへ接続します。未設定の場合は、ローカル開発用のメモリストアで動作します。

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

## 主な画面

| パス | 内容 |
| --- | --- |
| `/` | タイトル画面 |
| `/register` | アカウント登録 |
| `/login` | ログイン |
| `/game` | ゲーム画面 |
| `/settings` | アカウント設定 |

## 主なAPI

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
| POST | `/api/buildings/build` | 建物建設 |
| POST | `/api/buildings/upgrade` | 建物強化 |
| POST | `/api/buildings/move` | 建物移動 |

## 設計書

- [GamePlan.md](./GamePlan.md)
- [基本設計書.md](./基本設計書.md)
- [詳細設計書.md](./詳細設計書.md)

## 補足

`npm audit --omit=dev` では、Next.js経由のPostCSS moderate警告が検出されています。`npm audit fix --force` はNext.jsを古いメジャーバージョンへ下げる破壊的提案になるため、現時点では適用していません。
