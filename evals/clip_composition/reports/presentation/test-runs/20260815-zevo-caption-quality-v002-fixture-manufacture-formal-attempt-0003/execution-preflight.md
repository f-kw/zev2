# F/U fixture正式製造 attempt-0003 起動前記録

日付: 2026-08-15

- fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0003`
- fixture job: `evals/clip_composition/reports/presentation/test-fixture-jobs/zevo-caption-quality-v002-fu-formal-20260815-attempt-0003/fixture-job-v001.json`
- fixture job SHA-256: `392f922c2169d46a90dab7a5e1ac08d6e2d801bb0a771c8c896f9deb3a6a5968`
- strict decoder: `decoded`
- value validator: `passed`
- implementation binding: 52/52 SHA一致
- approved contract binding: 17/17 SHA一致
- package root・proof output parent: 2/2不存在
- 実行環境: Darwin arm64 native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、登録SHA一致
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、登録SHA一致
- `NODE_OPTIONS`: 不存在
- `PATH`: 固定Node先頭、`/opt/homebrew/bin`を`/usr/local/bin`より前に配置
- Chromium: 登録済み実体・SHA一致、headless `about:blank`起動終了0
- FFmpeg/FFprobe: `/opt/homebrew/bin`実体・登録SHA一致
- command: 固定Node → 固定TSX CLI → fixture runner → job path一引数
- 証拠: stdout、stderr、終了code、signalを独立保存
- API通信: 0回
- 費用: US$0

## serializer preflight訂正

最初の読み取りpreflightで、apply patchによる新jobの末尾がLF 2件となり`byte-envelope-invalid`を検出した。fixture runnerの正式attempt開始前で、job読取段階、出力root書込0件だった。旧正式jobと同じ末尾LF 1件へ訂正し、strict decoder・value validator・全69 binding・未使用rootを再照合して全項目合格後に正式attemptへ入る。

