# A-v002案B runtime実体照合 正式attempt-0004 実行前記録

- 開始時刻（UTC）: `2026-08-09T12:08:07Z`
- 実行環境: native macOS 26.5.1 (25F80), Darwin arm64
- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- 固定Node SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- 固定TSX loader絶対path: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- 固定TSX loader SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`
- PATH: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`
- `NODE_OPTIONS`: 変数自体が存在しないことを確認
- 固定Chromium: native headless起動に成功
- 並行process: 同じproof runner/jobを実行するprocess 0件（確認command自身を除く）
- 正式出力root: 未使用
- attempt-0004の正式stdout/stderr/実行記録path: 未使用

## 実装・検査

- proof runner SHA-256: `684c9937db26ad32fc086bd3733e8b3de2aed425dd9d8a298e26123845aaa417`
- 同test SHA-256: `b3665dcc62d9ee0818dbde2f54e7f08e7151e5b9e318c8b133e8ec825c26eea2`
- runtime実体照合検査: 10/10合格
- TAP SHA-256: `0efb1125b606a3c40b9ecb728e1ba32beb8e854424890c726817212bc7a762df`
- stderr: 0 byte / SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- 実装後監査: symlink親の正常受理、読取中の実体path差し替え拒否、既存streaming hashのみの使用、従来SHA意味の維持を確認

## job・失敗証拠の不可侵

- 初回job v001: SHA-256 `a07944411b08b72702c1d60b3792ceed7387f61f40d099f7eb7909b812a00e86`
- 観測付き失敗job v002: SHA-256 `b5c6b148431724a898d06e09aebdd2dc985aced8fcdc9a838c5dfa15d6633eee`
- attempt-0003 fatal stdout: SHA-256 `019d518d68e1cbdfc695deed237a04890c35f9697da4c15f5b007609bce785d2`
- 新job v003: SHA-256 `dd6d727bdc909b7f5139b6cb8b9b353ce0f60fc9d5f63f37314c3b2a830a0da1`
- v002→v003差分: `proof-runner`の実装SHA 1欄のみ。両方7,260 byteで、新jobは正式serializerとbyte一致

本attemptはAPI通信0回、費用US$0で行う。不合格時は同attemptで修正・再実行しない。
