# zev2 システム仕様と動作まとめ

作成者: Claude (Fable 5) / 作成日: 2026-07-02(同日のリファクタ反映済み)
対象コミット時点: main (ff13854)

## 目的

配信の切り抜きショート動画を、人間の制御権を保ったままAIエージェントに作らせる基盤。
完成UIや本物の動画処理より先に「人間の承認ゲート」と「AIの実行経路」を固定するのが現段階の狙い。
設計原理は「LLMは意味判断のみ、数値・配置はルールで決定的に。決定ログは最初から残す」。

## 構成(pnpm workspace)

| パッケージ | 役割 | 主なファイル |
|---|---|---|
| `packages/shared` | 型・工程定義・状態判定の共通ロジック | `src/index.ts`(688行) |
| `backend` | Express API。状態管理と人間制御の中心 | `src/routes/control.ts`(3,944行) |
| `client` | Vue3 + Pinia の人間制御UI | `src/App.vue`(3,734行), `stores/controlQueue.ts` |
| `runner` | APIを叩いて工程を実行するAIエージェント | `src/index.ts` + `src/steps/*`(STT/Gemini/ffmpeg) |
| `scripts` | 契約テスト・シナリオテスト・Web Geminiレビュー自動化 | `agent-scenario-test.mjs`(3,265行)ほか |
| `runtime` | 実行状態(`state.json`)と成果物(`artifacts/<draftId>/`) | コミット対象外 |

## ワークフロー(7工程)

`WORKFLOW_STEPS`(shared)が正典。各工程は `dependsOnAgentRequestId` で直列に連結される。

```
prepare_video → run_stt → propose_clip_themes → build_clip_composition
             → create_edit_plan → apply_adjustment → render_video
```

各工程の成果物種別(`FileRefKind`)とファイル名は `ARTIFACT_FILE_NAME_BY_KIND` で固定
(例: `theme_json`=themes.json, `output_video`=output.mp4)。

### 人間確認ゲート(3箇所)

工程完了時にAIが `decision` を提出すると `ControlReviewItem` が作られ、後続工程をブロックする。

| 完了した工程 | 作られる確認 | ブロックされる工程 |
|---|---|---|
| propose_clip_themes | theme_selection(テーマ選択) | build_clip_composition |
| build_clip_composition | material_confirmation(切り口確認) | create_edit_plan |
| apply_adjustment | render_readiness(動画生成前確認) | render_video |

人間の操作は approve / reject / request_changes。approve のみ後続が進む。

## 基本の実行フロー

1. UIで依頼(`RequestDraft`)を作成 → `POST /request-drafts`
2. 承認 `POST /request-drafts/:id/approve` → 7個の `AgentRequest` をキュー生成し、backendが runner プロセスを自動起動(`auto-runner.ts`)
3. runner はループで `GET /agent-requests/next` → `POST :id/claim`(ownerId + 任意のTTL) → 工程実行 → `POST :id/complete`(fileRef必須) or `:id/fail`
4. complete 時に backend が成果物ファイルを検証(パス・MIME・JSONのkind一致・MP4ヘッダ)し、`FileRef`/`OutputEntity` を保存。確認ゲート対象なら `ControlReviewItem` を発行
5. 人間がUIで確認 → approve なら runner 再起動で続行
6. render_video 完了で完成動画。人間は最終判断(`publish_ready` / `final_complete`)を記録できる。`final_complete` 後はその動画への変更操作が拒否される

### claim 排他と復旧

- claim には ownerId が必須。complete/fail は同じ ownerId でないと 409
- `claimExpiresAt` を過ぎた running は、状態読み込み時(`loadStateWithClaimRecovery`)に自動で queued/waiting へ戻し、監査ログを残す

### 作り直し(編集コピー)モデル

やり直しは既存データを書き換えず、新しい draft を複製して作る:

- 完了済み工程は成果物ファイルごとコピーして succeeded のまま引き継ぐ(`createCopiedEditRestart`)
- 承認済みの人間確認も参照IDを張り替えて引き継ぐ(再確認不要にする)
- 指定工程以降だけを queued で再作成
- 入口: 確認画面の request_changes(scope: edit_plan / theme_reselect / theme_options_regenerate / material_reselect / adjustment)、生成済み動画への修正依頼、失敗工程の retry、Web Geminiレビュー反映
- theme_reselect だけは編集コピーを作らず、同一draft内で既存テーマの選び直し確認を再発行し、以降の工程を superseded に置換する

## Web Gemini レビューループ

完成動画を外部のWeb Gemini(Edgeブラウザ自動操作)にレビューさせ、人間が採否を決めて再生成する仕組み。

1. `POST /request-drafts/:id/web-gemini-review/prepare` — 依頼文(prompt)と実行ログ(`web-gemini-review-run.json`, status=prepared)を作る
2. `scripts/web-gemini-review-edge.mjs --execute` — EdgeをCDP/AppleScriptで操作して動画を送信、レビュー本文を取得し `POST :id/web-gemini-review` で保存(status=saved)
3. 人間がUIでレビューを確認し、再生成方針(revision brief)を編集して `POST :id/apply-web-gemini-review` — 方針を保存し、create_edit_plan からの編集コピーを自動作成(status=applied)

レビュー本文・方針・実行ログは state.json ではなく `artifacts/<draftId>/` 配下のJSONファイルに保存され、
読み出しのたびに「現在の完成動画URIと一致するか」の整合チェックが行われる(不一致は取り直しを要求)。

## 状態管理

- 正本は `runtime/state.json` 1ファイル。9コレクション(requestDrafts / agentRequests / fileRefs / outputs / agentOperationLogs / decisionLogs / controlReviewItems / humanReviewActions / finalReviewActions)
- 保存は tmp書き込み→rename のアトミック置換(`json-store.ts`)
- 全ルートの read-modify-write はリクエスト単位で直列化される(`runExclusiveStateOperation` + control router のミドルウェア)。runner と人間操作が並走しても更新は消えない
- 読み込み時にスキーマ検証し、不正なら `state.json.broken-<ts>` に退避(console.errorで通知)して空状態から再開
- 監査は2系統: `agentOperationLogs`(API操作イベント)と `decisionLogs`(AIの判断+根拠参照)
- 未処理例外は最終段のエラーハンドラが `{ error }` のJSONで返す(`backend/src/index.ts`)

## API一覧(認証区分)

- 公開: `GET /health`, `GET/POST /human-auth/*`
- エージェント用(Bearer `ZEV2_AGENT_API_TOKEN`): `GET /agent-requests/next`, `POST /agent-requests/:id/{claim,complete,fail}`, `PUT /artifacts/:draftId/:fileName`(アップロード), `GET /agent-artifacts/:draftId/:fileName`
- 人間用(トークン `ZEV2_HUMAN_API_TOKEN` → sha256セッションCookie): 上記以外すべて
  - 参照: `GET /state`, `GET /workflow`, `GET /runtime-config`, `GET /request-drafts/:id/activity`(イベント時系列+現在地サマリ), `GET /activity-search`, `GET /request-drafts/:id/web-gemini-review`, 静的 `GET /api/artifacts/*`
  - 操作: draft作成/承認/却下、control-reviews approve/reject/request-changes、cancel-agent-work、resume、retry、request-generated-video-changes、final-review、web-gemini-review系
- トークン未設定なら認証はスキップされる(ローカル開発モード)

## 実行モード(config/runtime.jsonc)

各工程は「固定データ(fixed)」と「実処理」を設定で切り替える。実処理側:
STT=ローカルSTTサーバー、テーマ/切り口=transcript整理、演出=Gemini API(APIキー or Vertex)、
動画生成=ffmpeg(エンコーダ・追加引数指定可)、成果物=local直書き or upload(API経由)。
微調整(apply_adjustment)は現状 fixed のみ。
接続先URL・入力動画パスの正本は `config/runtime.jsonc` のみ(コード側の既定値は空。
stt.mode=local で localServerUrl 未指定は起動時エラーになる)。

## UI(client)

- 単一ページ2画面(workspace / request)。Pinia store が 2秒間隔で `/state` を、5秒間隔で Web Geminiレビューをポーリング
- 操作後は `refreshUntilAgentSettled`(300ms×最大30回)で「実行中→確認待ち/完了/失敗」への遷移を追う
- 表示の中心は `/request-drafts/:id/activity` のサマリ(現在地+次にやること)とイベント履歴

## テスト

`pnpm test` = ui-contract-test(UI文言とAPIの契約) + web-gemini-review-script-test + agent-scenario-test(APIシナリオ一式)。
型チェックは `pnpm run type-check`(shared build → backend/client/runner)。
