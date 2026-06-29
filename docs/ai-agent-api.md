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
- 現在のdry-runでは、承認APIがrunnerをバックグラウンド起動し、runnerが全工程をAPI経由で完了させる。
- 承認APIはrunner完了まで待たず、承認済み作業キュー作成後に応答する。
- `claim` していない作業を `complete` してはいけない。
- `complete` と `fail` は、`claim` したAIエージェントと同じ取得者だけが実行できる。
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
AIエージェントが POST /agent-requests/:id/complete で完了を報告する
失敗した場合は POST /agent-requests/:id/fail で失敗理由を報告する
次の作業がなくなるまで繰り返す
```

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
- backend はファイル本体を保存しない。
- `uri` はAIエージェントが後で参照できる場所を表す。
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
- APIキー、トークン、認証情報、個人情報を `meaning` や `fileRef.uri` に入れない。

## 現時点で未実装

- 認証
- 詳細ログAPI
- 成果物本体の保存API
