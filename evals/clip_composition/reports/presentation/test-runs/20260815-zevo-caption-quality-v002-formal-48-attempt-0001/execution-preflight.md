# ZEVO字幕品質v002 正式48件 attempt-0001 起動前記録

日付: 2026-08-15

- 検査集合: 既存ZCQ001〜ZCQ046の46件＋fixture工程ZCQF001/ZCQF002の2件＝48件
- test file: source、B5/B6、selection、planner、render、F proof、U review、fixture manufacture/admissionの8 file
- fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0005`
- fixture receipt: F/U passed、artifact 44/44、environment 600/600、formal proof basename 26/26
- proof output parent: 子root 0件
- fixture selftest: `zevo-caption-quality-v002-fixture-selftest-20260815-attempt-0005` root未使用
- 局所結果: F 3/3・proof 83/83、U 2/2・proof 16/16。正式48件では局所結果を引き継がず全件を頭から再実行する
- test source 8件: 起動前SHAを実測保存済み
- 実行環境: Darwin arm64 native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、登録SHA一致
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、登録SHA一致、絶対path起動
- `NODE_OPTIONS`: 不存在
- `PATH`: 固定Node先頭、`/opt/homebrew/bin`を`/usr/local/bin`より前に配置
- Chromium: 登録済み実体・SHA一致、headless `about:blank`起動終了0
- FFmpeg/FFprobe: `/opt/homebrew/bin`実体・登録SHA一致
- receipt環境変数: `ZEV_ZEVO_CAPTION_QUALITY_FIXTURE_RECEIPT_PATH` exact 1件、workspace相対値
- command: `env -u NODE_OPTIONS PATH=<fixed> <receipt-env> <fixed-node> <fixed-tsx-cli> --test <8 test files>`
- 証拠: TAP、stderr、終了code、signalを独立保存する
- API通信: 0回
- 費用: US$0
- 停止規律: 不合格一件で追加修正せず停止する

