# ZEVO字幕品質v002 F gate receipt経路 正式attempt-0001 起動前記録

日付: 2026-08-15

- gate: F（ZCQ042〜ZCQ044、3件を頭から実行）
- fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0001`
- receipt環境変数（exact 1件）: `ZEV_ZEVO_CAPTION_QUALITY_FIXTURE_RECEIPT_PATH`
- receipt環境変数値（workspace相対）: `evals/clip_composition/reports/presentation/test-fixtures/zevo-caption-quality-v002/zevo-caption-quality-v002-fu-formal-20260815-attempt-0001/fixture-admission-receipt-v001.json`
- receipt admission: 44 artifact、600環境行を再読してpassed
- normal/negative proof root: 26件全て開始前absent
- 実行環境: native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`
- `NODE_OPTIONS`: 不存在
- `PATH`先頭: 固定Node、`/opt/homebrew/bin`
- Chromium: native起動可能（Google Chrome for Testing 149.0.7790.0）
- FFmpeg/FFprobe: `/opt/homebrew/bin`実体を使用
- command: 固定Node → 固定TSX CLI → `--test` → F test
- commandに上記receipt環境変数名・値を明示
- 証拠: TAP、stderr、終了code、signalを別fileへ保存
- API通信: 0回
- 費用: US$0
