# task-002 AIエージェントAPI契約テストと仕様固定

作成日: 2026-05-31

## 目的

- AIエージェントがUIを使わず、backend APIだけで承認済み作業を最後まで進められることを固定する。
- `next -> claim -> complete/fail` の状態遷移をテストし、runnerや実処理接続でAPI契約が崩れないようにする。
- backend内でSTT、LLM、動画生成、Gemini評価を実行しない境界を明確にする。

## 作業スコープ

今回やること:

- `POST /api/request-drafts` と `POST /api/request-drafts/:id/approve` で作業キューが作られることをテストする。
- `GET /api/agent-requests/next` が前工程完了済みの次作業だけを返すことをテストする。
- `POST /api/agent-requests/:id/claim` で作業が取得済みになることをテストする。
- `POST /api/agent-requests/:id/complete` で作業完了、成果物参照、次工程解放が行われることをテストする。
- `POST /api/agent-requests/:id/fail` で失敗理由が保存されることをテストする。
- `claim` 前の `complete`、前工程未完了の `claim`、存在しない作業IDへの操作が失敗することをテストする。
- `gemini_video_review` を含む作業種別がAPI上で扱えることを確認する。

今回やらないこと:

- 実Gemini評価、実STT、実LLM、動画生成、ファイル変換を実行しない。
- runnerの実処理アダプタを作り込まない。
- 認証、排他制御、claimタイムアウト、再実行、キャンセルはこのタスクでは実装しない。
- 巨大な成果物本文を状態へ保存しない。

## 完了条件

- API契約テストで、依頼作成、承認、取得、着手、完了、失敗の一連の流れが確認できる。
- 依存関係がある作業は、前工程完了前に取得できない。
- `complete` は取得済み作業にだけ許可される。
- 成果物参照を渡した場合だけ `FileRef` と出力記録が増える。
- `gemini_video_review` が作業キュー上で扱える。
- backend内でSTT、LLM、動画生成、Gemini評価を実行する処理が存在しないことを確認できる。
- `pnpm run type-check` と対象テストが成功する。
