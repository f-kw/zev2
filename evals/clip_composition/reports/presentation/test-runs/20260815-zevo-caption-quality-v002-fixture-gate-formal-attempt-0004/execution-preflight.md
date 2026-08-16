# F/U fixture工程 正式検査 attempt-0004 起動前記録

日付: 2026-08-15

- 修正対象: formal proof job 26件の保存basenameをjob IDへ一致させ、malformed一件を専用負例として明示除外する製造・admission処理
- fixtureSetId: `zevo-caption-quality-v002-fixture-selftest-20260815-attempt-0004`
- package root、proof output root、test-run root: 開始前に未使用を確認
- consumer入口閉包: F/U正式入口のpath・basename・環境規則を現物から逆引き済み
- basename静的preflight: formal 26/26一致、重複0、malformed除外1/1
- 実行環境: Darwin arm64 native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、登録SHA一致
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、登録SHA一致、絶対path起動
- `NODE_OPTIONS`: 不存在
- `PATH`: 固定Node先頭、`/opt/homebrew/bin`を`/usr/local/bin`より前に配置
- Chromium: 登録済み実体・SHA一致、headless `about:blank`起動終了0
- FFmpeg/FFprobe: `/opt/homebrew/bin`実体・登録SHA一致
- command: 固定Node → 固定TSX CLI → `--test` → fixture job test
- 証拠: TAP、stderr、終了code、signalを独立fileへ保存する
- API通信: 0回
- 費用: US$0
- 停止規律: 不合格一件で追加修正せず停止する

