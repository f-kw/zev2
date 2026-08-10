# A-v002案B runtime実体照合 正式attempt-0005 実行前記録

- 開始時刻（UTC）: `2026-08-09T12:15:31Z`
- 実行環境: native macOS 26.5.1 (25F80), Darwin arm64
- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- 固定Node SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- 固定TSX loader絶対path: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- 固定TSX loader SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`
- 正式PATH: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`
- `NODE_OPTIONS`: 変数自体が存在しないことを確認
- 固定Chromium: native headless起動に成功
- 並行process: 同じproof runnerを実行するprocess 0件
- 正式proof出力root: 未使用
- attempt-0005の正式stdout/stderr/実行記録path: 未使用

## runtime toolの起動前実体・SHA照合

本環境には`/opt/homebrew`と`/usr/local`の二系統のFFmpeg・FFprobeが同居する。正式PATHでは登録済みの`/opt/homebrew`側を固定Node直後へ置く。

| tool | PATH探索結果 | 実体path | 実測SHA-256 | 登録値との一致 |
|---|---|---|---|---|
| Node | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` | 同左 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` | 一致 |
| FFmpeg | `/opt/homebrew/bin/ffmpeg` | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg` | `d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798` | 一致 |
| FFprobe | `/opt/homebrew/bin/ffprobe` | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffprobe` | `dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9` | 一致 |

## コード・job・旧証拠の不変

- proof runner SHA-256: `684c9937db26ad32fc086bd3733e8b3de2aed425dd9d8a298e26123845aaa417`
- 同test SHA-256: `b3665dcc62d9ee0818dbde2f54e7f08e7151e5b9e318c8b133e8ec825c26eea2`
- 初回job v001 SHA-256: `a07944411b08b72702c1d60b3792ceed7387f61f40d099f7eb7909b812a00e86`
- 観測付き失敗job v002 SHA-256: `b5c6b148431724a898d06e09aebdd2dc985aced8fcdc9a838c5dfa15d6633eee`
- 実行対象job v003 SHA-256: `dd6d727bdc909b7f5139b6cb8b9b353ce0f60fc9d5f63f37314c3b2a830a0da1`
- attempt-0003 fatal stdout SHA-256: `019d518d68e1cbdfc695deed237a04890c35f9697da4c15f5b007609bce785d2`
- attempt-0004 rejected stdout SHA-256: `ea5c07fc3b336500e475bd614f9e1a59a70bd2b338a6aa6d0d0af4f5a7dd4d51`

コード・job・契約は変更せず、実行設営のPATHだけを訂正する。本attemptは1回のみ、API通信0回、費用US$0で行う。不合格・fatal時は同attemptで変更・再実行しない。
