# dry-run runner

作成日: 2026-05-31

## 目的

dry-run runner は、AIエージェントがbackend APIだけで作業を最後まで進められることを確認するための最小runnerです。

実STT、実LLM、Gemini API、実動画生成、完成品レビューは実行しません。
各工程はdry-run成果物参照を返して完了します。

## 起動

通常は、UIで「承認してAIに渡す」を押した後、backendが自動で起動します。

開発中に残キューだけ処理したい場合は、backend を起動してから手動実行します。

```bash
pnpm run dev:backend
pnpm run runner:dry-run
```

API URL を変える場合:

```bash
pnpm run runner:dry-run -- --api=http://localhost:8080/api
```

最大処理件数を変える場合:

```bash
pnpm run runner:dry-run -- --max-steps=100
```

## 処理する工程

```text
prepare_video
run_stt
propose_clip_themes
build_clip_composition
create_edit_plan
apply_adjustment
render_video
```

初回承認で作られるキューは `apply_adjustment` までです。
`render_video` は、複数箇所の構成と演出案を人間が確認し、「確認用動画を作る」と承認した後に追加されます。

## 完了時の意味

- UIまたはAPIで依頼を承認すると、backendは承認済み作業キューを作ってすぐ応答する。
- backendはdry-run runnerをバックグラウンド起動する。
- UIは状態APIを更新しながら完了状態を確認する。
- runner は `GET /api/agent-requests/next` で次作業を取得する。
- runner は `POST /api/agent-requests/:id/claim` で作業を取得済みにする。
- runner は文字起こしからテーマ候補を作る。
- 人間がテーマを選ぶまで、後続作業は止まる。
- runner は選ばれたテーマに関係する複数の発話箇所を集めて構成案を作る。
- runner は工程ごとのdry-run成果物参照を作る。
- runner は `POST /api/agent-requests/:id/complete` で完了を報告する。
- 全作業が完了すると `GET /api/agent-requests/next` は `null` を返す。

## 成果物参照

成果物参照は `zev2://dry-run/...` の形式で作成します。
これは実ファイルではなく、工程が完了したことを示すdry-run参照です。

## 失敗時

処理中に失敗した場合、runner は `POST /api/agent-requests/:id/fail` で失敗理由を返します。

## 実処理との差し替え

後続タスクでは、各dry-run handlerを実処理へ差し替えます。
ただし、backendが直接STT、LLM、Gemini API、動画生成、完成品レビューを実行する方針にはしません。
