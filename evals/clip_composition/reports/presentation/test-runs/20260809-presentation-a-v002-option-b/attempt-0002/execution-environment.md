# A-v002案B 正式92検査 attempt-0002 実行環境

- 開始時刻（UTC）: `2026-08-09T08:02:36Z`
- 修正周回: `1/2`
- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- 固定Node SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- 固定TSX絶対path: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- 固定TSX SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`
- PATH: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`
- `NODE_OPTIONS`: 変数自体が存在しないことを確認
- OS: `macOS 26.5.1 (25F80), Darwin arm64 25.5.0`
- test concurrency: `1`
- test name filter: `^(ASQ|AMP|OPT|OPLV2|ORPV2|OPL02[89]|APF|AVD|APJ|ARU|ORP01[78])`
- 変更したproduction: `run_presentation_a_v002_layer1_v3_proof_job_v001.ts` / SHA-256 `4c4bba6516f9bee6dbb329e7552c78e2ddd0e2ddcb5fd109eb36128f8572d49f`
- 変更したtest: `run_presentation_a_v002_layer1_v3_proof_job_v001.test.mjs` / SHA-256 `395525b436d8a547f2d800870c4bd9b5c48200072ed597d6917a6a249d2b3ac7`
- 変更範囲監査: exact 24 path中、上記2 pathだけがattempt-0001固定SHAから変化。残り22 pathは一致
- 独立検査前監査: APJ 10/10、source sequence差替え・meaning package差替えの実filesystem拒否を個別確認
- 正式TAP: `formal-92.tap`
- 不合格時: 同attemptで修正・再実行しない
