# zev2 現在の実装

作成日: 2026-05-31
更新日: 2026-06-21

## 目的

zev2 は、ZEV Step 1 の方針に合わせて、人間が依頼を作り、承認後にAIエージェントがAPIで作業を進めるための最小基盤です。

現時点の主目的は、backendに実処理を抱え込ませず、人間承認とAIエージェント実行の経路を固定しながら、runner側で実処理へ接続することです。

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
- UIで依頼ごとのGemini API使用モデルを選べる。
- UIで依頼を承認できる。
- 承認済み依頼から、AIエージェント用の作業キューを作成できる。
- YouTube URLまたはローカル動画を、AI処理用の入力として保存または参照できる。
- runnerが動画から音声を抽出し、ZEVローカルSTTサーバで文字起こしできる。
- runnerが文字起こしをGemini APIへ送り、人間が選ぶ切り抜きテーマ候補を作れる。
- 選ばれたテーマに関係する複数の発話まとまりを集め、構成案を作れる。
- runnerが複数箇所の動画断片をGemini APIへ送り、演出案を作れる。
- 演出作成では、Gemini APIが動画断片を見て表示対象を検出し、runnerが「話者のみ」「画面と話者」「話者2人」の画面枠へ収まる表示範囲を計算する。話者のみは縦長1枠、2枠表示は上下の横長枠にする。
- 複数箇所の構成と演出案を人間が確認し、承認後に動画生成工程を追加できる。
- runnerが承認済み編集案から、断片ごとの画面枠を反映して複数箇所を連結したMP4を生成できる。
- 修正依頼では、人間が最後に承認したところ以降のAI作成部分を作り直せる。
- 承認後にdry-run runnerを自動起動できる。
- AIエージェントはAPIで次の作業を取得できる。
- AIエージェントはAPIで作業を取得済みにできる。
- AIエージェントはAPIで作業の完了または失敗を報告できる。
- dry-run runnerで、承認済み作業をAPI経由で進め、人間確認が必要なところで止められる。
- 成果物本体ではなく、成果物参照を状態へ残せる。
- client/backend共通の型と工程定義を `packages/shared` に置いている。
- パッケージ管理はpnpmに固定している。
- Electronは使っていない。

## 現在できないこと

- backend内でSTTを実行しない。
- backend内でLLMを実行しない。
- backend内で動画生成を実行しない。
- backend内でGemini APIによる演出作成や完成品レビューを実行しない。
- 完成品レビュー用のWeb版Gemini接続はまだない。
- API契約テストはまだない。
- claimの強い排他制御はまだない。
- claimのタイムアウト復旧はまだない。
- キャンセルAPIはまだない。
- 認証と権限管理はまだない。
- 成果物本体の保存APIはまだない。
- 詳細な操作ログや監査履歴はまだない。
- Gemini API接続は `@google/genai` を使う。APIキー指定とVertex AI指定の両方を同じSDK経路で扱う。

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
通常起動のSTT、テーマ探索、演出作成の切替は `config/runtime.json` で行う。
今は `stt.mode`、`themeExploration.mode`、`editPlan.mode` が `fixed` なので、固定済みの文字起こし、テーマ候補、演出案を使う。
実STTを使う場合は `stt.mode` を `local` にし、`stt.localServerUrl` にローカルSTTサーバを指定する。
Gemini APIでテーマ探索と演出作成を行う場合は、`themeExploration.mode` と `editPlan.mode` を `gemini` にする。
STTサーバのIPは変わる前提なので、コードには固定しない。
Gemini APIの標準モデルは `gemini-3.5-flash`。UIの使用モデルで、品質確認、軽い確認、疎通確認の用途から依頼ごとに切り替えられる。
runnerの標準モデルだけを変える場合は `ZEV2_GEMINI_MODEL` を使う。
接続確認やJSON応答確認だけのテストでは品質判断をしないため、UIまたは `ZEV2_GEMINI_MODEL` で `gemini-2.5-flash` または `gemini-3-flash-preview` を明示して使う。
Vertex AI経由でGeminiを使う場合、`GOOGLE_CLOUD_PROJECT` を設定する。`GOOGLE_CLOUD_LOCATION` は未指定なら `global` を使う。

## 確認

```bash
pnpm run type-check
```

直近では、型検査と隔離runtimeでの実行確認が成功している。
確認した流れは、動画参照、ZEVローカルSTT、Gemini APIによるテーマ候補、テーマ選択、複数箇所構成、Gemini APIによる演出案、動画生成前承認、MP4生成である。
生成されたMP4は映像と音声を含むことを確認した。
画面枠合成については、1断片と複数断片のローカルスモーク動画を生成し、1080x1920の映像と音声を含むことを確認した。

## レビュー確認項目

- UIが「人間が依頼し、AIエージェントがAPIで実行する」構造として十分に少ないか。
- AIエージェントAPIの流れを `next -> claim -> complete/fail` に分けた意味が伝わるか。
- backendで実STT、LLM、動画生成を実行せず、runner側が外部処理を行う境界が明確か。
- 候補決定を映像や音声の補助計測ではなく、文字起こしからのテーマ選択と複数箇所構成として扱えているか。
- タスクの順番が、まず最後まで動かし、その後に契約テストと排他制御へ進む順序になっているか。
- `task-002` でAPI契約テストを固定できる状態になっているか。

## 次に見る文書

- 7工程と作り直しの固定仕様: `docs/zev2-flow-contract.md`
- AIエージェントに渡す仕様: `docs/ai-agent-api.md`
- 残タスク一覧: `docs/order.md`
- dry-run runner: `docs/runner-dry-run.md`
