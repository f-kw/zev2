# AIエージェント向けAPI仕様

この文書は、zev2 のAIエージェントが backend API を使って作業を進めるための仕様です。
UIは人間が依頼を作成し、実行前に承認するための画面です。
AIエージェントは承認後の作業だけをAPIで取得し、外部処理の結果をAPIへ返します。

## 前提

- Base URL は開発環境では `http://localhost:8080/api`。
- backend は STT、LLM、Gemini API、動画生成、完成品レビューを実行しない。
- AIエージェントまたはCodex側の処理が、実際のSTT、LLM、Gemini APIによる演出作成、動画生成、完成品レビュー、ファイル処理を行う。
- backend は依頼、承認状態、作業状態、成果物参照だけを管理する。
- 現在のdry-runでは、承認APIがrunnerをバックグラウンド起動し、runnerが全工程をAPI経由で完了させる。
- 承認APIはrunner完了まで待たず、承認済み作業キュー作成後に応答する。
- `claim` していない作業を `complete` してはいけない。
- 前工程が完了していない作業は取得できない。

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
| `propose_clip_themes` | 文字起こしから人間が選ぶテーマ候補を出す | `theme_json` |
| `build_clip_composition` | 選ばれたテーマに関係する複数箇所を集めて構成案を作る | `composition_json` |
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
      "purpose": "この配信から切り抜きたいテーマを選び、複数箇所をつなぐショート案を作る",
      "settings": {
        "durationLabel": "60秒以内",
        "themeCountLabel": "3テーマ",
        "preset": "shorts_default"
      }
    },
    "constraints": {
      "durationLabel": "60秒以内",
      "themeCountLabel": "3テーマ",
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
```

意味:

- AIエージェントが対象作業を引き受ける。
- 状態は `running` になる。
- 前工程が終わっていない場合は `409` になる。

レスポンス:

```json
{
  "request": {
    "id": "agent_xxx",
    "status": "running"
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
  "meaning": "書き起こしJSONを作成した",
  "fileRef": {
    "uri": "zev2://transcripts/transcript_001.json",
    "mimeType": "application/json",
    "access": "internal"
  }
}
```

成果物参照がまだない場合:

```json
{
  "meaning": "外部処理の準備が完了した"
}
```

意味:

- `running` の作業だけ完了できる。
- `fileRef` を渡した場合、backend は成果物参照を保存する。
- backend はファイル本体を保存しない。
- `uri` はAIエージェントが後で参照できる場所を表す。

## 作業を失敗にする

```http
POST /api/agent-requests/:id/fail
Content-Type: application/json
```

```json
{
  "message": "対象動画を取得できなかった"
}
```

意味:

- 状態は `failed` になる。
- 失敗理由はUIと状態APIで確認できる。

## 状態確認

```http
GET /api/state
```

用途:

- UI表示
- AIエージェントの復旧
- 失敗後の状態確認

## AIエージェントの実行ループ例

```text
loop:
  next = GET /api/agent-requests/next
  if next.request is null:
    stop

  claim = POST /api/agent-requests/{next.request.id}/claim
  if claim failed:
    inspect status and continue or stop

  try:
    result = execute outside backend according to next.request.type
    POST /api/agent-requests/{next.request.id}/complete with result reference
  catch error:
    POST /api/agent-requests/{next.request.id}/fail with reason
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
- 同時実行時の強い排他制御
- claim のタイムアウト復旧
- 再実行API
- キャンセルAPI
- 詳細ログAPI
- 成果物本体の保存API
- STT、LLM、動画生成との接続
