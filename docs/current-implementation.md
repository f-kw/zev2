# zev2 現在の実装

作成日: 2026-05-31

## 目的

zev2 は、ZEV Step 1 の方針に合わせて、人間が依頼を作り、承認後にAIエージェントがAPIで作業を進めるための最小基盤です。

現時点の主目的は、動画処理そのものではなく、次の実行経路を固定することです。

```text
人間が依頼を書く
人間が承認する
backend がAIエージェント用の作業キューを作る
backend がdry-run runnerをバックグラウンド起動する
UIが状態APIで進捗を確認する
AIエージェントがAPIで作業を取得する
AIエージェントが外部処理の結果をAPIへ返す
UIは依頼と状態を確認する
```

## 現在できること

- UIでAIエージェントへの依頼を作成できる。
- UIで依頼を承認できる。
- 承認済み依頼から、AIエージェント用の作業キューを作成できる。
- `gemini_video_review` を含む作業種別をキューに入れられる。
- 承認後にdry-run runnerを自動起動できる。
- AIエージェントはAPIで次の作業を取得できる。
- AIエージェントはAPIで作業を取得済みにできる。
- AIエージェントはAPIで作業の完了または失敗を報告できる。
- dry-run runnerで、承認済み作業をAPI経由で最後まで完了できる。
- 成果物本体ではなく、成果物参照を状態へ残せる。
- client/backend共通の型と工程定義を `packages/shared` に置いている。
- パッケージ管理はpnpmに固定している。
- Electronは使っていない。

## 現在できないこと

- backend内でSTTを実行しない。
- backend内でLLMを実行しない。
- backend内で動画生成を実行しない。
- backend内でGemini評価を実行しない。
- API契約テストはまだない。
- claimの強い排他制御はまだない。
- claimのタイムアウト復旧はまだない。
- 再実行API、キャンセルAPI、却下APIはまだない。
- 認証と権限管理はまだない。
- 成果物本体の保存APIはまだない。
- 詳細な操作ログや監査履歴はまだない。
- Gemini動画評価の作業種別はあるが、実評価処理はまだない。

## UI

UIは `client/src/App.vue` にある。

画面は大きく3つの意味だけに絞っている。

- 依頼: 人間がAIにやらせることを書く。
- 状態: 承認後にAPI実行対象になった作業の状態を見る。
- 成果物確認: 最新の成果物参照と件数を見る。

UI上の操作は「承認してAIに渡す」の1操作にまとめている。
内部状態としては、依頼作成と承認済み作業を分けている。
UIからAIエージェントの作業を1件ずつ進めるボタンは置いていない。
作業を進める主体はAIエージェントrunnerであり、UIは人間制御と状態確認のために使う。

## API

AIエージェント向けの主なAPIは次の通り。

```text
GET  /api/agent-requests/next
POST /api/agent-requests/:id/claim
POST /api/agent-requests/:id/complete
POST /api/agent-requests/:id/fail
```

人間の依頼作成と承認に使うAPIは次の通り。

```text
POST /api/request-drafts
POST /api/request-drafts/:id/approve
```

承認APIは、承認済み作業キューを作った後にdry-run runnerをバックグラウンド起動し、runner完了までは待たずに応答する。

状態確認に使うAPIは次の通り。

```text
GET /api/health
GET /api/workflow
GET /api/state
```

詳細は `docs/ai-agent-api.md` にまとめている。

## データの考え方

状態は開発用に `runtime/state.json` へ保存する。
このファイルは実行状態であり、コミット対象ではない。

保存する主な情報は次の通り。

- 人間が作成した依頼
- 承認済み依頼から作ったAIエージェント用作業
- 作業状態
- 成果物参照

大きな解析結果、STT全文、LLM全文、動画本体は状態へ埋め込まない。

## 主要ファイル

| ファイル | 意味 |
| --- | --- |
| `client/src/App.vue` | 人間用の依頼・状態確認UI |
| `client/src/api.ts` | clientからbackend APIを呼ぶ処理 |
| `client/src/stores/controlQueue.ts` | UI状態管理 |
| `backend/src/routes/control.ts` | 依頼、承認、AIエージェントAPI |
| `backend/src/runner/auto-runner.ts` | 承認後にdry-run runnerを起動する処理 |
| `backend/src/store/json-store.ts` | 開発用状態保存 |
| `runner/src/index.ts` | AIエージェントdry-run runner |
| `packages/shared/src/index.ts` | 共通型、工程定義、依頼生成 |
| `docs/ai-agent-api.md` | AIエージェント向けAPI仕様 |
| `docs/runner-dry-run.md` | dry-run runnerの実行仕様 |
| `docs/order.md` | 残タスク一覧 |

## 起動

```bash
pnpm install
pnpm run dev:backend
pnpm run dev:client
```

client は `http://localhost:5173/`。
backend は `http://localhost:8080/api`。
UIで承認するとrunnerは自動起動する。
UIは状態APIを更新しながら完了状態を確認する。
`pnpm run runner:dry-run` は、開発中に残キューだけ処理したい場合の手動実行用。

## 確認

```bash
pnpm run type-check
```

直近では、承認後のdry-run runnerバックグラウンド起動を含めて型検査は成功している。
承認APIが正常応答し、バックグラウンドrunnerで承認済み作業がすべて完了し、`GET /api/agent-requests/next` が `{"request":null}` を返すことを確認した。
UIでは `完了`、APIキュー `0件`、成果物参照ありの状態を確認した。

## レビュー確認項目

- UIが「人間が依頼し、AIエージェントがAPIで実行する」構造として十分に少ないか。
- AIエージェントAPIの流れを `next -> claim -> complete/fail` に分けた意味が伝わるか。
- backendで実STT、LLM、動画生成を実行しない境界が明確か。
- CodexからGeminiを使う動画評価を、最初から作業種別として扱えているか。
- タスクの順番が、まず最後まで動かし、その後に契約テストと排他制御へ進む順序になっているか。
- `task-002` でAPI契約テストを固定できる状態になっているか。

## 次に見る文書

- AIエージェントに渡す仕様: `docs/ai-agent-api.md`
- 残タスク一覧: `docs/order.md`
- dry-run runner: `docs/runner-dry-run.md`
