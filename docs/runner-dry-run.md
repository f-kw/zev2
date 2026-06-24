# dry-run runner

作成日: 2026-05-31
更新日: 2026-06-21

## 目的

dry-run runner は、AIエージェントがbackend APIだけで作業を最後まで進められることを確認するためのrunnerです。

現在は名前にdry-runが残っていますが、runner側では実STT、Gemini APIによるテーマ候補、Gemini APIによる演出案、ffmpegによるMP4生成まで実行できます。
backendは外部処理を直接実行せず、runnerから成果物参照と完了報告だけを受け取ります。
7工程、作り直し、ゲート、UI導線、runner実行条件の正本は [zev2-flow-contract.md](./zev2-flow-contract.md) です。

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

実STTを使う場合:

```bash
ZEV2_STT_SERVER_URL=http://192.168.1.7:8000 pnpm run runner:dry-run
```

STTサーバのIPは変わる前提なので、`ZEV2_STT_SERVER_URL` または `ZEV_STT_SERVER_URL` で指定します。
動画生成やGemini演出で使う外部コマンドも、`ZEV2_FFMPEG_BIN`、`ZEV2_FFPROBE_BIN`、`ZEV2_YTDLP_BIN` で差し替えられます。
Gemini APIの標準モデルは `gemini-3.5-flash` です。UIの使用モデルで、品質確認、軽い確認、疎通確認の用途から依頼ごとに切り替えられます。
runnerの標準モデルだけを変える場合は `ZEV2_GEMINI_MODEL` を使います。
接続確認やJSON応答確認だけのテストでは品質判断をしないため、UIまたは `ZEV2_GEMINI_MODEL` で `gemini-2.5-flash` または `gemini-3-flash-preview` を明示して使います。
Vertex AI経由でGeminiを使う場合、`GOOGLE_CLOUD_PROJECT` を設定します。`GOOGLE_CLOUD_LOCATION` は未指定なら `global` を使います。

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
- runner は動画から音声を抽出し、ZEVローカルSTTで文字起こしする。
- runner は文字起こしをGemini APIへ送り、テーマ候補を作る。
- 人間がテーマを選ぶまで、後続作業は止まる。
- runner は選ばれたテーマに関係する複数の発話箇所を集めて構成案を作る。
- runner は構成案の複数動画箇所をGemini APIへ送り、テロップと画面の見せ方を含む演出案を作る。
- 画面の見せ方は、話者のみ、画面と話者、話者2人の3種類に絞る。話者のみは縦長1枠、2枠表示は上下の横長枠にする。
- runner は動画生成前確認の承認後、断片ごとの画面枠を反映して複数箇所を連結したMP4を作る。
- runner は工程ごとの成果物参照を作る。
- runner は `POST /api/agent-requests/:id/complete` で完了を報告する。
- 全作業が完了すると `GET /api/agent-requests/next` は `null` を返す。

## 成果物参照

成果物参照は `/api/artifacts/...` の形式で作成します。
大きなJSONや動画本体は状態ファイルへ埋め込まず、ファイル参照として保存します。

## 失敗時

処理中に失敗した場合、runner は `POST /api/agent-requests/:id/fail` で失敗理由を返します。

## 実処理との差し替え

後続タスクでは、API契約テスト、排他制御、復旧、完成品レビューを追加します。
ただし、backendが直接STT、LLM、Gemini API、動画生成、完成品レビューを実行する方針にはしません。
