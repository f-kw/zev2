# ZEVO字幕品質v002 baseline 203件 attempt-0001 起動前記録

日付: 2026-08-15

- 目的: 既知不合格を修正せず、203件のpass/failとID別結果がbaseline正本へexact一致することを確認する。
- baseline正本TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-presentation-a-v002-option-b/attempt-0002/baseline-203.tap`
- baseline正本TAP SHA-256: `bd5435ed70165512b736480f0808f3461eda64751935c169e9d616c6fbf2b086`
- 正本集計: tests 203 / pass 86 / fail 117 / cancelled 0 / skipped 0 / todo 0 / exit code 1。
- test source: 6 file。起動前SHAを現物照合済み。
- native: Darwin 25.5.0 arm64。
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、SHA-256 `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`。
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、SHA-256 `5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8`。
- `NODE_OPTIONS`: 不存在。
- `PATH`: 固定Node先頭、`/opt/homebrew/bin`が`/usr/local/bin`より前。
- Chromium: 同一turnのgreen起動前checkで登録SHA一致・native headless起動終了0。
- FFmpeg/FFprobe: 登録path・SHA一致。
- command: 固定Node → 固定TSX CLI絶対path → `--test --test-concurrency=1` → 6 file固定順。
- TAP、stderr、終了code、signalを独立保存する。
- API通信0回、費用US$0、描画0件。
- 判定: exit code 1自体を不合格にせず、正本とID別pass/fail、総数、全区分が一致する場合だけbaseline exact合格とする。
