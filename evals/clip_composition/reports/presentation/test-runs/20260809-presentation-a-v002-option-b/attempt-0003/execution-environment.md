# A-v002案B proof観測装備 正式attempt-0003 実行前記録

- 開始時刻（UTC）: `2026-08-09T11:00:54Z`
- 実行環境: native macOS 26.5.1 (25F80), Darwin arm64
- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- 固定Node SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- 固定TSX loader絶対path: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- 固定TSX loader SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`
- PATH: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`
- `NODE_OPTIONS`: 変数自体が存在しないことを確認
- 固定Chromium: native headless起動に成功し、`about:blank`を正常終了0で読めた
- 並行process: 同じproof runner/jobを実行するprocess 0件（確認command自身を除く）
- 正式出力root: 未使用
- attempt-0003の正式stdout/stderr/実行記録path: 未使用

## 実装・検査

- proof runner SHA-256: `ee0110e0be61996ace7c59f119f16b4b3354cef0e297ed0ea251c8d0b821cb12`
- 同test SHA-256: `a944a91ee40d1f83ed643d27342377e189f50fb5b4c710eeffaca941633c76bb`
- proof観測装備検査: 10/10合格
- TAP SHA-256: `3a5dabf75cfbec7b930bd645f1980a74df03c7b628f21f65334106c7e52f5788`
- stderr: 0 byte / SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- 実装後監査: fatalだけに局所観測を追加し、正常・検査済み拒否の結果形、共通fatal schema、既存計算を不変と確認

## job・旧証拠の不可侵

- 旧job: `a-v002-layer1-v3-option-b-proof-20260809-v001.json`
- 旧job byte: 7,260 / SHA-256 `a07944411b08b72702c1d60b3792ceed7387f61f40d099f7eb7909b812a00e86`
- 初回fatal stdout SHA-256: `1b19a0d01ff0fcce576e13bdfd547e857d987a671103fcd523ea49f7f07c87ba`
- 初回実行記録 SHA-256: `184bdcdbb6c4dcc34ffcd0d9ada2427714883cff5727c86daa4fa847b0c85f6e`
- 新job: `a-v002-layer1-v3-option-b-proof-20260809-v002.json`
- 新job byte: 7,260 / SHA-256 `b5c6b148431724a898d06e09aebdd2dc985aced8fcdc9a838c5dfa15d6633eee`
- 新旧job差分: `proof-runner`の実装SHA 1欄のみ。入力、元媒体、出力root、他19実装束縛は同一
- 新job: 正式serializerとのbyte一致を確認

本attemptはAPI通信0回、費用US$0で行う。不合格時は同attemptで修正・再実行しない。
