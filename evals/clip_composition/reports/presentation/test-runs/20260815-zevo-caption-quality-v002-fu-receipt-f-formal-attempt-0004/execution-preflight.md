# ZEVO字幕品質v002 F gate receipt経路 正式attempt-0004 起動前記録

日付: 2026-08-15

- gate: F（ZCQ042〜ZCQ044、3件を頭から実行）
- fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0004`
- receipt環境変数（exact 1件）: `ZEV_ZEVO_CAPTION_QUALITY_FIXTURE_RECEIPT_PATH`
- receipt環境変数値（workspace相対）: `evals/clip_composition/reports/presentation/test-fixtures/zevo-caption-quality-v002/zevo-caption-quality-v002-fu-formal-20260815-attempt-0004/fixture-admission-receipt-v001.json`
- receipt admission: F/Uともpassed
- artifact: 44/44 stable再読
- environment manifest: 600/600
- retention manifest: 26/26
- formal proof job: strict decode可能26/26、basename／job ID一致26/26
- malformed proof byte: 専用basename・byte binding・decode rejected 1/1
- U参照: video 3、QC 3、旧render plan binding 6
- package: 48 file
- proof output parent: 空directory、子root 0件
- override対象選択: binding object 2件、`null` 24件
- 旧fixture供給入口: path #12/#14合計0件
- 実行環境: Darwin arm64 native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、登録SHA一致
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、登録SHA一致、絶対path起動
- `NODE_OPTIONS`: 不存在
- `PATH`: 固定Node先頭、`/opt/homebrew/bin`を`/usr/local/bin`より前に配置
- Chromium: 登録済み実体・SHA一致、headless `about:blank`起動終了0
- FFmpeg/FFprobe: `/opt/homebrew/bin`実体・登録SHA一致
- command: `env -u NODE_OPTIONS PATH=<fixed> ZEV_ZEVO_CAPTION_QUALITY_FIXTURE_RECEIPT_PATH=<workspace-relative-receipt> <fixed-node> <fixed-tsx-cli> --test <F-test>`
- 証拠: TAP、stderr、終了code、signalを独立保存する
- API通信: 0回
- 費用: US$0
- 停止規律: 不合格一件で追加修正せず停止する

