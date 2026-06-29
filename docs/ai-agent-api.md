# AIエージェント向けAPI仕様

この文書は、zev2 のAIエージェントが backend API を使って作業を進めるための仕様です。
UIは人間が依頼を作成し、実行前に承認するための画面です。
AIエージェントは承認後の作業だけをAPIで取得し、外部処理の結果をAPIへ返します。

7工程、作り直し、人間確認工程、UI導線、runner実行条件の正本は [zev2-flow-contract.md](./zev2-flow-contract.md) です。

## 前提

- Base URL は開発環境では `http://localhost:8080/api`。
- backend は STT、LLM、Gemini API、動画生成、完成品レビューを実行しない。
- AIエージェントまたはCodex側の処理が、実際のSTT、LLM、Gemini APIによる演出作成、動画生成、完成品レビュー、ファイル処理を行う。
- backend は依頼、承認状態、作業状態、成果物参照だけを管理する。
- backend はAI操作ログを保存する。ただし保存するのは短い説明、作業ID、取得者、成果物参照ID、失敗理由であり、成果物本文は保存しない。
- 現在のdry-runでは、承認APIがrunnerをバックグラウンド起動し、runnerが全工程をAPI経由で完了させる。
- 承認APIはrunner完了まで待たず、承認済み作業キュー作成後に応答する。
- `claim` していない作業を `complete` してはいけない。
- `complete` と `fail` は、`claim` したAIエージェントと同じ取得者だけが実行できる。
- 成果物本体をbackendへ渡す場合は、先に `PUT /api/artifacts/:draftId/:fileName` で保存し、返されたURIを `complete` に渡す。
- runnerは、backendと同じ作業フォルダへ直接保存する方式と、成果物アップロードAPIを使う方式を設定で切り替えられる。
- アップロード方式では、後続工程のrunnerが必要な前工程成果物をbackendから取得してから処理する。
- 前工程が完了していない作業は取得できない。
- 内容選択、使用素材確認、動画生成前確認が必要な作業は、人間確認が承認されるまで取得できない。

## 基本フロー

```text
人間がUIで依頼を作る
人間がUIで承認する
backendが承認済み作業キューを作る
backendがdry-run runnerをバックグラウンド起動する
承認APIは応答し、UIは状態APIで進捗を確認する
AIエージェントが GET /agent-requests/next で次の作業を取得する
AIエージェントが POST /agent-requests/:id/claim で着手する
AIエージェントが外部で必要な処理を実行する
必要なら AIエージェントが PUT /artifacts/:draftId/:fileName で成果物本体を保存する
AIエージェントが POST /agent-requests/:id/complete で完了を報告する
失敗した場合は POST /agent-requests/:id/fail で失敗理由を報告する
次の作業がなくなるまで繰り返す
```

## 人間制御API

AIエージェントではなく、人間の判断を保存するAPIです。

```text
POST /api/request-drafts/:id/reject
POST /api/control-reviews/:id/approve
POST /api/control-reviews/:id/reject
POST /api/control-reviews/:id/request-changes
POST /api/request-drafts/:id/final-review
POST /api/request-drafts/:id/cancel-agent-work
POST /api/agent-requests/:id/retry
```

意味:

- 実行前下書きを理由つきで却下する。却下した下書きからAI作業キューは作らない。
- 内容選択、使用素材確認、動画生成前確認で、承認、却下、作り直し理由を保存する。
- 完成動画を人間が確認し、投稿可能または最終完了として記録する。動画生成完了とは別の人間判断として扱う。
- 最終完了として記録した完成動画は、同じ下書き上でWeb Geminiレビュー準備、レビュー保存、レビュー反映、生成済み動画からの作り直しを拒否する。
- 実行中または待機中のAI作業を中止する。
- 失敗したAI工程から新しい編集コピーを作り、失敗工程以降を再実行できる状態にする。
- UIはこれらの人間制御と状態確認に使い、AI工程を1件ずつ進める主導線にはしない。

## AIエージェントAPI認証

AIエージェントが実行を進めるAPIだけ、任意のBearerトークンで保護できます。

対象API:

```text
GET  /api/agent-requests/next
POST /api/agent-requests/:id/claim
PUT  /api/artifacts/:draftId/:fileName
GET  /api/agent-artifacts/:draftId/:fileName
POST /api/agent-requests/:id/complete
POST /api/agent-requests/:id/fail
```

設定:

- backendとrunnerの両方に `ZEV2_AGENT_API_TOKEN` を環境変数で設定する。
- runnerまたはAIエージェントは設定されたトークンを `Authorization: Bearer ...` として送る。
- `ZEV2_AGENT_API_TOKEN` が未設定の場合、ローカル開発用に認証なしで動く。
- トークンは `config/runtime.jsonc`、状態ファイル、成果物参照、ログ、APIレスポンスへ保存しない。

認証対象外:

- UIが使う状態確認、依頼作成、依頼却下、人間確認、完成動画の最終判断、中止、再実行、Web Geminiレビュー準備。
- これらは人間制御APIであり、AIエージェントが自動で進めるAPIとは分ける。

## 人間UI認証

人間UIの状態確認、人間制御API、成果物配信は、任意の人間UIトークンで保護できます。

対象:

- 状態確認API。
- 依頼作成、依頼承認、却下、人間確認、完成動画の最終判断、中止、再実行。
- Web Geminiレビュー準備、保存、反映。
- `/api/artifacts/...` の成果物配信。

設定:

- backendに `ZEV2_HUMAN_API_TOKEN` を環境変数で設定する。
- 未設定の場合、ローカル開発用に人間UI認証なしで動く。
- 設定した場合、UIは `POST /api/human-auth/login` でログインし、同一オリジンCookieでAPIと動画配信を読む。
- APIクライアントは `Authorization: Bearer ...` でも同じ人間UIトークンを送れる。
- `ZEV2_HUMAN_API_TOKEN` は状態、ログ、成果物参照、APIレスポンスへ保存しない。

認証状態:

```text
GET  /api/human-auth/status
POST /api/human-auth/login
POST /api/human-auth/logout
```

AIエージェント実行APIの `next`、`claim`、`complete`、`fail` は、人間UI認証ではなくAIエージェントAPI認証で扱います。

## 作業種別

| 作業種別 | 意味 | 成果物種別 |
| --- | --- | --- |
| `prepare_video` | 対象動画をAIが扱える入力として登録する | `source_video` |
| `run_stt` | 音声を書き起こす | `transcript_json` |
| `propose_clip_themes` | 文字起こし内に何があるかを内容候補として整理する | `theme_json` |
| `build_clip_composition` | 選ばれた内容に関係する複数箇所を集めて使用素材構成案を作る | `composition_json` |
| `create_edit_plan` | 複数箇所の動画参照をGemini APIへ渡す前提で演出案を作る | `edit_plan_json` |
| `apply_adjustment` | 人間またはAIの修正を反映する | `patch_json` |
| `render_video` | 承認済み編集案から動画を出力する | `output_video` |

この表はキュー上の作業意味を示すだけです。
backend 内でこれらの処理は実行しません。

## 状態

| 状態 | 意味 |
| --- | --- |
| `queued` | AIエージェントが取得できる可能性がある |
| `waiting` | 前工程の完了待ち |
| `running` | AIエージェントが取得済み |
| `succeeded` | AIエージェントが完了を報告済み |
| `failed` | AIエージェントが失敗を報告済み |

## 次の作業を取得する

```http
GET /api/agent-requests/next
```

レスポンス:

```json
{
  "request": {
    "id": "agent_xxx",
    "requestDraftId": "draft_xxx",
    "type": "prepare_video",
    "label": "動画取り込み",
    "target": {
      "sourceUri": "https://example.com/video"
    },
    "input": {
      "purpose": "この配信から面白そうな内容を選び、AIが見つけた使用素材でショート案を作る",
      "settings": {
        "durationLabel": "60秒以内",
        "themeCountLabel": "3候補",
        "preset": "shorts_default"
      }
    },
    "constraints": {
      "durationLabel": "60秒以内",
      "themeCountLabel": "3候補",
      "preset": "shorts_default"
    },
    "status": "queued",
    "fileRefIds": []
  }
}
```

作業がない場合:

```json
{
  "request": null
}
```

## 作業を取得済みにする

```http
POST /api/agent-requests/:id/claim
Content-Type: application/json
```

```json
{
  "ownerId": "zev2-runner:12345",
  "expiresAt": "2026-06-29T12:00:00.000Z"
}
```

意味:

- AIエージェントが対象作業を引き受ける。
- 状態は `running` になる。
- `ownerId` は取得したAIエージェントを表す。以後の `complete` と `fail` でも同じ値を渡す。
- `expiresAt` は任意。指定した時刻を過ぎた `running` 作業は、状態確認または次作業取得時に復旧される。
- 前工程が終わっていない場合は `409` になる。

レスポンス:

```json
{
  "request": {
    "id": "agent_xxx",
    "status": "running",
    "claimOwnerId": "zev2-runner:12345",
    "claimedAt": "2026-06-29T11:50:00.000Z",
    "claimUpdatedAt": "2026-06-29T11:50:00.000Z",
    "claimExpiresAt": "2026-06-29T12:00:00.000Z"
  },
  "state": {}
}
```

## 成果物本体を保存する

```http
PUT /api/artifacts/:draftId/:fileName
Content-Type: application/json
```

意味:

- AIエージェントが外部処理で作った成果物本体を、対象下書き配下へ保存する。
- URL上の下書きIDは、存在する実行前下書きIDでなければならない。
- ファイル名は単一ファイル名だけを受け付ける。ディレクトリ移動や別下書き配下への保存はできない。
- このAPIは状態を更新しない。保存しただけでは工程完了にならない。
- レスポンスの `uri` を `complete` の `fileRef.uri` に渡すと、完了APIが工程種別、実体ファイル、バイト数、SHA-256を確認して状態へ成果物参照を残す。
- `ZEV2_AGENT_API_TOKEN` が設定されている場合、このAPIもAIエージェント認証の対象になる。
- 同じ名前の成果物がすでにある場合は拒否する。完了後の成果物実体が後から上書きされ、状態に残した検証情報と食い違うことを避けるため。
- runnerの `artifactDelivery.mode` を `upload` にすると、runnerは一時置き場で作った成果物をこのAPIへ送り、返されたURIで完了報告する。
- 後続工程を別runnerが実行する場合、そのrunnerは保存済みURIをbackendから一時置き場へ取得してから処理する。

レスポンス:

```json
{
  "uri": "/api/artifacts/draft_xxx/transcript.json",
  "artifactFileName": "transcript.json",
  "byteSize": 12345,
  "sha256": "...",
  "mimeType": "application/json"
}
```

## 成果物本体をAIエージェントが取得する

```http
GET /api/agent-artifacts/:draftId/:fileName
```

意味:

- AIエージェントが後続工程で必要な保存済み成果物を取得する。
- `ZEV2_AGENT_API_TOKEN` が設定されている場合、このAPIもAIエージェント認証の対象になる。
- UIの動画表示や人間確認に使う `/api/artifacts/...` の静的配信とは分ける。
- runnerの `artifactDelivery.mode` が `upload` の場合、後続工程の開始前にこのAPIから前工程成果物を取得し、一時置き場へ保存してから処理する。

## 作業を完了する

```http
POST /api/agent-requests/:id/complete
Content-Type: application/json
```

成果物参照がある場合:

```json
{
  "ownerId": "zev2-runner:12345",
  "meaning": "書き起こしJSONを作成した",
  "fileRef": {
    "uri": "zev2://transcripts/transcript_001.json",
    "mimeType": "application/json",
    "access": "internal"
  }
}
```

意味:

- `running` の作業だけ完了できる。
- `claim` 時の取得者と `ownerId` が一致する場合だけ完了できる。
- `fileRef` を渡した場合、backend は成果物参照を保存する。
- 成果物参照がない完了報告は拒否する。
- `complete` はファイル本体を受け取らない。AIエージェントが先に保存した成果物、またはrunnerがローカルに作った成果物の参照を受け取る。
- `uri` はbackendが実体ファイルを確認できる `/api/artifacts/<下書きID>/...` 形式にする。
- backend は完了時に成果物実体を確認し、保存ファイル名、バイト数、SHA-256を `FileRef` に残す。
- 状態には成果物本文を入れず、参照と検証用メタデータだけを残す。

レスポンス内の `fileRef` 例:

```json
{
  "id": "fileref_xxx",
  "kind": "transcript_json",
  "uri": "/api/artifacts/draft_xxx/transcript.json",
  "mimeType": "application/json",
  "access": "internal",
  "ownerId": "run_stt_xxx",
  "artifactFileName": "transcript.json",
  "byteSize": 12345,
  "sha256": "..."
}
```

## 作業を失敗にする

```http
POST /api/agent-requests/:id/fail
Content-Type: application/json
```

```json
{
  "ownerId": "zev2-runner:12345",
  "message": "対象動画を取得できなかった"
}
```

意味:

- 状態は `failed` になる。
- `claim` 時の取得者と `ownerId` が一致する場合だけ失敗として記録できる。
- 失敗理由はUIと状態APIで確認できる。

## 状態確認

```http
GET /api/state
```

用途:

- UI表示
- AIエージェントの復旧
- 失敗後の状態確認

取得期限を過ぎた `running` 作業がある場合、状態確認または次作業取得のタイミングでその作業は `queued` または `waiting` に戻る。
復旧後の作業には、前回取得者を含む説明が `errorMessage` として残る。

状態には `agentOperationLogs` が含まれる。
ここには依頼作成、依頼承認、依頼却下、AI作業作成、次作業返却、claim、完了、失敗、claim期限切れ復旧が残る。
完了時は成果物参照IDと出力記録IDを残し、失敗時は失敗理由を残す。
ログは調査用の監査履歴であり、STT全文、LLM全文、Gemini応答全文、動画本体は入れない。

## 作業履歴確認

```http
GET /api/request-drafts/:id/activity
```

用途:

- 人間が下書き単位で現在状態を確認する。
- AI判断、人間判断、AI操作ログ、Web Geminiレビュー状態を同じ時系列で確認する。
- 失敗時に、どの工程が誰の取得後に止まったか確認する。

AI操作ログは `agent_operation_log` として返る。
ログの詳細は人間が読める短い説明に整形され、成果物本文ではなく成果物参照IDで追う。

## 作業履歴検索

```http
GET /api/activity-search?q=失敗理由&kind=agent_operation_log&requestDraftId=draft_xxx
```

用途:

- 全下書き横断で作業履歴を探す。
- 文字、実行者、履歴種別、下書きIDで絞り込む。
- 成果物本文ではなく、履歴のタイトル、説明、参照ID、下書き目的を検索対象にする。

クエリ:

- `q`: タイトル、説明、参照ID、下書き目的に含まれる文字。
- `actor`: `user`、`agent`、`runner`、`backend`、`system`。
- `kind`: `agent_operation_log`、`agent_decision`、`human_review_action` などの履歴種別。
- `requestDraftId`: 対象下書きID。
- `limit`: 返す件数。指定しない場合は条件に一致した履歴を返す。

## AIエージェントの実行ループ例

```text
loop:
  next = GET /api/agent-requests/next
  if next.request is null:
    stop

  ownerId = stable identifier for this agent process
  claim = POST /api/agent-requests/{next.request.id}/claim with ownerId
  if claim failed:
    inspect status and continue or stop

  try:
    result = execute outside backend according to next.request.type
    POST /api/agent-requests/{next.request.id}/complete with ownerId and result reference
  catch error:
    POST /api/agent-requests/{next.request.id}/fail with ownerId and reason
```

## 禁止事項

- backend にSTT、LLM、動画生成を直接実行させない。
- UIのボタンを自動操作してキューを進めない。
- `next` で取得しただけの作業を `complete` しない。
- 前工程の成果物を確認せずに後工程を実行しない。
- 成果物本体を `state` に巨大JSONとして埋め込まない。
- 完了済み成果物と同じ名前で再アップロードしない。
- APIキー、トークン、認証情報、個人情報を `meaning` や `fileRef.uri` に入れない。

## 現時点で未実装

- 詳細ログ検索API
