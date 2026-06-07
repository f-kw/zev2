# task-001 最小E2E dry-run実行

状態: 実装済み

作成日: 2026-05-31

## 目的

- UIで依頼を作り、AIエージェントrunnerがAPIだけで全工程を最後まで完了できる状態を作る。
- 実STT、実LLM、実動画生成、実Gemini評価はまだ動かさない。
- ただし各工程はdry-run成果物参照を返し、システム全体として「最後まで実行済み」になるようにする。

## 本来の目的確認

今回の目的は、AI処理の品質を上げることではない。
AIエージェントがAPIで作業を取得し、全工程を進め、成果物参照を返し、UIで完了状態を確認できることを優先する。

## 作業スコープ

今回やること:

- AIエージェントrunnerの起動コマンドを追加する。
- runnerが `GET /api/agent-requests/next` を呼び、作業がなくなるまで繰り返す。
- runnerが各作業を `claim` してから処理する。
- 承認後にbackendがrunnerを自動起動する。
- `prepare_video`、`gemini_video_review`、`run_stt`、`find_candidates`、`create_edit_plan`、`apply_adjustment`、`render_video` のdry-run handlerを用意する。
- 各handlerは実処理をせず、工程の意味に合うdry-run成果物参照を `complete` へ返す。
- 失敗した場合は `fail` へ失敗理由を返す。
- UIで全工程完了、進捗、最新成果物参照が確認できるようにする。
- 実行手順をREADMEまたはrunner用ドキュメントへ書く。

今回やらないこと:

- 実Gemini評価、実STT、実LLM、実動画生成を実行しない。
- UIを自動操作してキューを進めない。
- backend内で各工程の実処理をしない。
- 認証、強い排他制御、claimタイムアウト復旧、再実行、キャンセルはこのタスクでは作らない。
- 成果物本体の永続保存はこのタスクでは作らない。

## 完了条件

- 新規依頼をUIから作成し、承認済み作業キューが作られる。
- 承認するとrunnerが起動し、全作業をAPI経由で順番に処理できる。
- `gemini_video_review` もdry-run成果物として完了できる。
- すべての作業が `succeeded` になり、`GET /api/agent-requests/next` が `null` を返す。
- 成果物参照が工程ごとに作られる。
- UIで完了状態と成果物参照が確認できる。
- `pnpm run type-check` と最小確認が成功する。

## 実装メモ

- runnerは `runner/src/index.ts` に実装した。
- 承認後のrunner起動は `backend/src/runner/auto-runner.ts` に実装した。
- 手動確認用の起動コマンドは `pnpm run runner:dry-run`。
- dry-run成果物参照は `zev2://dry-run/...` 形式で返す。
- 実行仕様は `docs/runner-dry-run.md` に記録した。

## 検証結果

- `pnpm run type-check` 成功。
- APIでdry-run確認用の依頼を作成し、承認済み作業キューを作成した。
- `pnpm run runner:dry-run` 成功。
- 承認APIが正常応答し、dry-run runnerがバックグラウンドで全作業を完了することを確認した。
- `prepare_video`、`gemini_video_review`、`run_stt`、`find_candidates`、`create_edit_plan`、`apply_adjustment`、`render_video` のdry-run完了を確認した。
- `GET /api/agent-requests/next` が `{"request":null}` を返すことを確認した。
- UIで `完了`、APIキュー `0件`、成果物参照ありの状態を確認した。
