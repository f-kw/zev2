# ZEVO字幕品質v002 F gate receipt経路 正式attempt-0002 起動前記録

日付: 2026-08-15

- gate: F（ZCQ042〜ZCQ044、3件を頭から実行）
- fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0002`
- receipt環境変数（exact 1件）: `ZEV_ZEVO_CAPTION_QUALITY_FIXTURE_RECEIPT_PATH`
- receipt環境変数値（workspace相対）: `evals/clip_composition/reports/presentation/test-fixtures/zevo-caption-quality-v002/zevo-caption-quality-v002-fu-formal-20260815-attempt-0002/fixture-admission-receipt-v001.json`
- receipt admission: F/Uともpassed
- artifact: 44/44 stable再読
- environment manifest: 600/600
- retention manifest: 26/26
- U参照: video 3、QC 3、旧render plan binding 6
- normal/negative proof job: 27件
- proof output/staging root: 27/27未使用
- 旧fixture供給入口: path #12/#14合計0件（`presentation-zevo-caption-quality-v002-fu-receipt-only-source-closure-20260815-v001.md`）
- 実行環境: native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、登録SHA一致
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、登録SHA一致
- `NODE_OPTIONS`: 不存在
- `PATH`先頭: 固定Node、`/opt/homebrew/bin`
- Chromium: native起動可能（Google Chrome for Testing 149.0.7790.0）、登録SHA一致
- FFmpeg/FFprobe: `/opt/homebrew/bin`実体、登録SHA一致
- command: `env -u NODE_OPTIONS PATH=<fixed> ZEV_ZEVO_CAPTION_QUALITY_FIXTURE_RECEIPT_PATH=<workspace-relative-receipt> <fixed-node> <fixed-tsx-cli> --test <F-test>`
- 証拠: TAP、stderr、終了code、signalを別fileへ保存
- API通信: 0回
- 費用: US$0
