# ZEVO字幕品質v002 人間合格後・tag前最終照合 起動前記録

- 日付: 2026-08-16
- 目的: stable tag発行前に、baseline 86/203、既存5 tree、A-v002記録対象2,887件の不変を新attemptで確認する。
- 実行環境: native Darwin arm64。
- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、SHA-256 `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`。
- 固定TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、SHA-256 `5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8`。
- `NODE_OPTIONS`: 不存在。
- `PATH`: 固定Node先頭、`/opt/homebrew/bin`が`/usr/local/bin`より前。
- baseline正本: 2026-08-09の正式203件TAP。終了code 1を既知117不合格として保持し、203件の順序・名称・合否を比較する。
- 既存5 tree: FOVT001〜FOVT005を各stable tagの登録tree・file集合・blobへ照合する。
- A-v002: 記録commit `542b35684a3ad67dbab042ca2bb3bff022e42023`所属2,887件の欠落・byte差0を照合する。記録commit外54件は既存台帳の別境界であり、本照合へ混ぜない。
- API通信: 0回。
- 費用: US$0。
- 正式成果物への書込み: 0件。
