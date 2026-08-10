# A-v002 縦型専用配置検査接続 最終正式attempt-0012 起動前記録

- 記録日時: 2026-08-10 12:08:10 JST
- 開始HEAD: `a64caf20f4e1e1acf6e5640ecca053f770d3f424`
- 実行環境: Darwin 25.5.0 / arm64 / native
- 周回: checkpoint装備後 2/2（最終周回）
- API通信: 0回
- 費用: US$0

## 固定実体

| 実体 | path | SHA-256 | 判定 |
|---|---|---|---|
| Node | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` | 一致・PATH先頭 |
| TSX loader | `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs` | `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f` | 一致・絶対path |
| FFmpeg | `/opt/homebrew/bin/ffmpeg` | `d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798` | 一致 |
| FFprobe | `/opt/homebrew/bin/ffprobe` | `dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9` | 一致 |
| Chromium | `/Users/kawafmm/workspace/zev2/runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell` | `b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8` | native起動0・空HTML取得 |

正式PATHは固定Node、`/opt/homebrew/bin`、`/usr/local/bin`の順とする。全正式commandは`env -u NODE_OPTIONS`で起動し、`NODE_OPTIONS`を環境変数として持たせない。

## 診断

| 項目 | 実測 |
|---|---|
| 保存済み縦型配置入力 | 6,152 byte / SHA `3b0b0d2bc26858f2daa950ae188f4c8b3ba4fd700b8140273b5c066591f4e6b3` |
| 横型用検査器 | `renderer overlay props schema mismatch`を再現 |
| 縦型専用検査器 | 8/8合格、違反0 |
| 帰属 | proof runnerの接続漏れ。fixture・契約矛盾ではない |
| 診断JSON | `a-v002-vertical-layout-preflight-20260810-v001.json` / SHA `19e288dcf9c229f1d1e48440394e3aa4ad71c237aa896ffd16b7e10f08c56357` |
| 診断・修正設計 | `presentation-a-v002-vertical-layout-preflight-diagnosis-and-final-round-repair-design-20260810-v001.md` / SHA `14d81ada92e8b534957b8bea1a7cb2b14122709e126c41cba242434b45eae73a` |

## 限定修正

| path | SHA-256 | 意味 |
|---|---|---|
| `run_presentation_a_v002_layer1_v3_proof_job_v001.ts` | `ab50c945fa354399d72630fc679e9543f29b6846ac6fa607e22d84fb0262c8f1` | 正式縦型経路と同じ専用配置検査を呼び、その合格結果を共通描画へ渡す |
| `run_presentation_a_v002_layer1_v3_proof_job_v001.test.mjs` | `adb99a2fcb3b1d96b6a5f5f77803ac4e733105d5ab7595e46c0cce52aef65770` | 縦型だけが専用結果を渡し、汎用検査の受理拡張・偽装をしない接続を固定 |

横型経路、契約、schema、違反code、字幕、style、切断時刻、既存成果物は変更しない。

## 正式開始条件

- `attempt-0012`は本記録作成前に未使用。
- 正式92件を頭から一度だけ実行する。
- 92/92の場合だけ、runner SHAだけを更新した新版jobと未使用rootを発行してproofを一度だけ実行する。
- 以後にfatal、検査済み拒否、QC不合格が1件でも出た場合、3周目は行わず停止する。
- v007 root、v009 job、attempt-0011、横型第1号SHA `b12ec0af708af0a5afa69488b72bf55a6300bbed162877c59cc9154f79f14fcf`を不変保持する。

## 正式92件の結果

- 92/92合格、fail 0、skip 60。
- TAP: `formal-92-preflight.tap`、31,821 byte、SHA-256 `c40f8eb65571d7183edd957ee403875d7991d10de3bf8675f8e102273f806c8c`。
- test runner終了code: 0。
- 同attempt内の修正・再実行: 0回。

## 最終proof job

- job: `a-v002-layer1-v3-option-b-proof-20260810-v010.json`
- job ID: `a-v002-layer1-v3-option-b-proof-20260810-v008`
- 7,260 byte、SHA-256 `ac825d9ca331a14687f0f1c331fd18f5a5638e0068c08795d55e7d4fae146f2e`
- exact validator合格、正式serializer byte一致。
- v009との差はjob ID、未使用出力root、proof runner SHAの3値だけ。
- proof root v008とhidden renderer work v008は発行前に未使用を確認した。

## 最終proof結果

- 実行結果: `passed`、終了code 0、違反0、実行6件。
- 内訳: 旧v3人間合格済み3候補 × 横型正式style 1本 + 縦型字幕跨ぎ診断 1本。
- QC: 6/6合格。
- stdout: `formal-proof.stdout.json`、17,819 byte、SHA-256 `594a164f9e154b15e3e00f01018c8cccd160e77afbbb04e00abc88e52f7adb11`。
- stderr: 0 byte（terminal観測）。
- API通信: 0回。費用: US$0。
- 同attempt内の修正・再実行: 0回。
