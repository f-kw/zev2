# zev2

ZEV Step 1 の方針に沿った、新規動画編集基盤の最小プロジェクトです。

この段階では完成UIや本物の動画処理を作り込まず、人間の制御権とAIエージェントの実行経路を先に固定します。

## 構成

```text
zev2/
├── client/           # Vue / Vite / Vuetify の人間制御UI
├── backend/          # Express / TypeScript のAPI
├── runner/           # API経由で作業を進めるdry-run AIエージェント
├── packages/shared/  # client/backend共通の型と工程定義
├── runtime/          # 開発用の実行状態保存先
└── package.json      # pnpm workspace の共通スクリプト
```

ZEVと同じく `client` と `backend` を分けます。パッケージ管理はpnpmに固定します。
Electronは初期構成に含めません。

## 起動

依存関係を入れた後、別々のターミナルで起動します。

```bash
pnpm install
pnpm run dev:backend
pnpm run dev:client
```

client は Vite、backend は Express API として動きます。
UIで「承認してAIに渡す」を押すと、backendが承認済み作業キューを作り、dry-run runnerをバックグラウンド起動します。
UIは状態APIを更新しながら、AI作業が最後まで進むことを確認します。

手動で残キューを処理したい場合だけ、次を実行します。

```bash
pnpm run runner:dry-run
```

## ドキュメント

- レビュー用の要点: `docs/review-brief.md`
- 現在の実装: `docs/current-implementation.md`
- AIエージェント向けAPI仕様: `docs/ai-agent-api.md`
- dry-run runner: `docs/runner-dry-run.md`
- 残タスク一覧: `docs/order.md`

## 確認

```bash
pnpm run type-check
```

## Step 1 API

- `GET /api/health`
- `GET /api/workflow`
- `GET /api/state`
- `POST /api/request-drafts`
- `POST /api/request-drafts/:id/approve`
- `GET /api/agent-requests/next`
- `POST /api/agent-requests/:id/claim`
- `POST /api/agent-requests/:id/complete`
- `POST /api/agent-requests/:id/fail`

AIエージェントは `next` で作業を取得し、`claim` で着手状態にし、外部処理の結果だけを `complete` または `fail` で返します。
この段階では backend 内で STT、LLM、動画生成、Gemini評価は実行しません。
backendが行うのは、承認後にdry-run runnerプロセスを起動してAPI実行を開始するところまでです。

AIエージェントに渡す実行仕様は `docs/ai-agent-api.md` にまとめています。

## データの考え方

第一ステップでは、巨大な解析結果を正本にしません。
保存するのは、人間の確認下書き、型付き実行命令、工程ごとの成果物参照です。

開発用の実行状態は `runtime/state.json` へ保存します。このファイルはコミット対象にしません。
