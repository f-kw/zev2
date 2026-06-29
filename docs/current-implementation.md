# zev2 現在の実装

作成日: 2026-05-31
更新日: 2026-06-29

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
- runnerが文字起こしから、人間が面白そうか判断するための内容候補を作れる。
- 内容候補整理の後、UIで内容を選ぶまで使用素材構成へ進まない。
- 選ばれた内容に関係する複数の発話まとまりを集め、使用素材構成案を作れる。
- 使用素材構成案の後、UIで見つかった素材を確認するまで演出作成へ進まない。
- runnerが複数箇所の動画断片をGemini APIへ送り、演出案を作れる。
- 演出作成では、Gemini APIが動画断片を見て表示対象を検出し、runnerが「話者のみ」「画面と話者」「話者2人」の画面枠へ収まる表示範囲を計算する。話者のみは縦長1枠、2枠表示は上下の横長枠にする。
- 微調整の後、UIで確認用動画を作ってよいか判断するまで動画生成へ進まない。
- runnerが承認済み編集案から、断片ごとの画面枠を反映して複数箇所を連結したMP4を生成できる。
- 修正依頼では、人間が最後に承認したところ以降のAI作成部分を作り直せる。
- 完成動画に対して、Web Gemini演出レビューの準備、実行ログ保存、レビュー保存、レビュー反映による演出作成前からの作り直しができる。
- Web Geminiレビューの準備、実行中、保存済み、反映済み、失敗は作業履歴と現在状態サマリで確認できる。
- 実行前下書きを、理由つきで却下できる。却下した下書きはAI作業キューを作らない。
- AI作業中の中止APIがあり、確認待ちも中止操作による却下として閉じられる。
- 下書きごとの作業履歴APIで、AI判断、人間判断、外部レビュー、現在状態サマリを確認できる。
- 承認後にdry-run runnerを自動起動できる。
- AIエージェントはAPIで次の作業を取得できる。
- AIエージェントはAPIで作業を取得済みにできる。
- `ZEV2_AGENT_API_TOKEN` を設定すると、AIエージェント実行APIだけをBearerトークンで保護できる。
- AIエージェントは成果物本体を `PUT /api/artifacts/:draftId/:fileName` で保存できる。保存後に返されたURIを完了APIへ渡す。
- 作業取得時にAIエージェント取得者、取得時刻、最終更新時刻、任意の期限時刻を保存できる。
- 同じ作業の二重取得、取得者が違う完了報告、取得者が違う失敗報告を拒否できる。
- 期限切れした取得中作業は、状態確認または次作業取得時に復旧され、再取得可能になる。
- AIエージェントはAPIで作業の完了または失敗を報告できる。
- 依頼作成、承認、却下、作業作成、次作業返却、作業取得、完了、失敗、期限切れ復旧をAI操作ログとして保存できる。
- 下書きごとの作業履歴APIで、AI操作ログを短い説明と成果物参照IDとして確認できる。
- `next -> claim -> complete/fail` のAIエージェントAPI契約をシナリオテストで固定している。
- dry-run runnerで、承認済み作業をAPI経由で進め、人間確認が必要なところで止められる。
- 成果物本体ではなく、成果物参照を状態へ残せる。
- 成果物参照には、保存ファイル名、バイト数、SHA-256を残せる。
- シナリオテストで、成果物参照のメタデータが実体ファイルと一致し、JSON成果物本文が状態へ丸ごと入らないことを確認している。
- UI右HUDで、工程ごとの成果物参照、成果物種別、参照URI、保存時刻、工程完了時の意味を確認できる。
- client/backend共通の型と工程定義を `packages/shared` に置いている。
- パッケージ管理はpnpmに固定している。
- Electronは使っていない。

## 現在できないこと

- backend内でSTTを実行しない。
- backend内でLLMを実行しない。
- backend内で動画生成を実行しない。
- backend内でGemini APIによる演出作成や完成品レビューを実行しない。
- 人間UIのログイン認証はまだない。
- 投稿可能化、公開、最終完了の承認ゲートはまだない。
- Web Geminiへの実アップロードは外部送信を伴うため、準備確認とは分けて明示実行として扱う。
- Gemini API接続は `@google/genai` を使う。APIキー指定とVertex AI指定の両方を同じSDK経路で扱う。

## UI

UIは `client/src/App.vue` にある。

画面は大きく4つの意味に絞っている。

- 依頼: 人間がAIにやらせることを書く。
- 状態: 承認後にAPI実行対象になった作業の状態を見る。
- 確認: 内容選択、使用素材確認、動画生成前確認で人間が進行可否を判断する。
- 生成結果: 完成動画を確認し、必要なら作り直しを依頼する。

新規依頼の操作は「動画を作成」にまとめている。
内部状態としては、依頼作成と承認済み作業を分けている。
UIからAIエージェントの作業を1件ずつ進めるボタンは置いていない。
作業を進める主体はAIエージェントrunnerであり、UIは人間制御と状態確認のために使う。

## API

AIエージェント向けの主なAPIは次の通り。

```text
GET  /api/agent-requests/next
POST /api/agent-requests/:id/claim
PUT  /api/artifacts/:draftId/:fileName
POST /api/agent-requests/:id/complete
POST /api/agent-requests/:id/fail
```

人間の依頼作成と承認に使うAPIは次の通り。

```text
POST /api/request-drafts
POST /api/request-drafts/:id/approve
POST /api/request-drafts/:id/reject
```

承認APIは、承認済み作業キューを作った後にdry-run runnerをバックグラウンド起動し、runner完了までは待たずに応答する。

状態確認に使うAPIは次の通り。

```text
GET /api/health
GET /api/workflow
GET /api/state
GET /api/request-drafts/:id/activity
GET /api/request-drafts/:id/web-gemini-review
POST /api/request-drafts/:id/web-gemini-review/prepare
POST /api/request-drafts/:id/web-gemini-review
POST /api/request-drafts/:id/apply-web-gemini-review
POST /api/request-drafts/:id/cancel-agent-work
POST /api/agent-requests/:id/retry
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
- AI操作ログ

大きな解析結果、STT全文、LLM全文、動画本体は状態へ埋め込まない。
AI操作ログにも成果物本文は入れず、何をしたかの短い説明、作業ID、取得者、成果物参照ID、失敗理由だけを残す。

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
通常起動のSTT、内容候補整理、演出作成、微調整の切替や明示は `config/runtime.jsonc` で行う。
今は `stt.mode`、`contentDiscovery.mode`、`editPlan.mode`、`adjustment.mode` が `fixed` なので、固定済みの文字起こし、内容候補、演出案を使い、微調整は固定処理として演出案を動画生成へ渡す。
実STTを使う場合は `stt.mode` を `local` にし、`stt.localServerUrl` にローカルSTTサーバを指定する。
Gemini APIを使う本線は演出作成で動画断片を読む処理である。内容候補整理と使用素材構成は、文字起こしをもとに行い、Gemini APIである必然性を持たせない。
微調整工程は現時点では実質的な編集判断をしていない。不要と判断できたら工程から外す候補にする。
STTサーバのIPは変わる前提なので、コードには固定しない。
Gemini APIの標準モデルは `gemini-3.5-flash`。UIの使用モデルで、品質確認、軽い確認、疎通確認の用途から依頼ごとに切り替えられる。
runnerの標準モデルだけを変える場合は `ZEV2_GEMINI_MODEL` を使う。
接続確認やJSON応答確認だけのテストでは品質判断をしないため、UIまたは `ZEV2_GEMINI_MODEL` で `gemini-2.5-flash` または `gemini-3-flash-preview` を明示して使う。
Vertex AI経由でGeminiを使う場合、`GOOGLE_CLOUD_PROJECT` を設定する。`GOOGLE_CLOUD_LOCATION` は未指定なら `global` を使う。
AIエージェント実行APIを保護する場合は、backendとrunnerの両方に `ZEV2_AGENT_API_TOKEN` を設定する。トークンは設定ファイルや状態ファイルには保存しない。

## 確認

```bash
pnpm run type-check
```

直近では、型検査と隔離runtimeでの実行確認が成功している。
確認した流れは、動画参照、ZEVローカルSTT、固定データによる内容候補、使用素材構成、固定データまたはGemini APIによる演出案、MP4生成である。
AI操作ログについては、依頼作成、承認、却下、作業作成、次作業返却、claim、完了、失敗、期限切れ復旧が状態と作業履歴APIで追えることをシナリオテストで確認する。
生成されたMP4は映像と音声を含むことを確認した。
画面枠合成については、1断片と複数断片のローカルスモーク動画を生成し、1080x1920の映像と音声を含むことを確認した。

## レビュー確認項目

- UIが「人間が依頼し、AIエージェントがAPIで実行する」構造として十分に少ないか。
- AIエージェントAPIの流れを `next -> claim -> complete/fail` に分けた意味が伝わるか。
- backendで実STT、LLM、動画生成を実行せず、runner側が外部処理を行う境界が明確か。
- 候補決定を映像や音声の補助計測ではなく、文字起こしからの内容候補整理、内容選択、使用素材構成、使用素材確認として扱えているか。
- タスクの順番が、まず最後まで動かし、その後に排他制御、成果物保存、ログ、認証へ進む順序になっているか。
- API契約テストが、AIエージェントの基本操作を壊した時に検出できるか。

## 次に見る文書

- 7工程と作り直しの固定仕様: `docs/zev2-flow-contract.md`
- AIエージェントに渡す仕様: `docs/ai-agent-api.md`
- 残タスク一覧: `docs/order.md`
- dry-run runner: `docs/runner-dry-run.md`
