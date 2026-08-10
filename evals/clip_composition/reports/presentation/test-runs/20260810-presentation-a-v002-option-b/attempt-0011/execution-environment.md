# A-v002 縦型common projection接続修正 正式attempt-0011 起動前記録

- 記録日時: 2026-08-10 11:34:23 JST
- 開始HEAD: `a64caf20f4e1e1acf6e5640ecca053f770d3f424`
- 実行環境: Darwin 25.5.0 / arm64 / native
- API通信: 0回
- 費用: US$0

## 固定実体

| 実体 | path / version | SHA-256 | 判定 |
|---|---|---|---|
| Node | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` / 20.19.6 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` | 一致 |
| TSX loader | `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs` | `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f` | 一致・絶対path |
| FFmpeg | `/opt/homebrew/bin/ffmpeg` → 登録実体 / 8.0.1 | `d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798` | 一致 |
| FFprobe | `/opt/homebrew/bin/ffprobe` → 登録実体 / 8.0.1 | `dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9` | 一致 |
| Chromium | `/Users/kawafmm/workspace/zev2/runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell` | `b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8` | native起動0、空HTML取得 |

正式PATHは固定Node、`/opt/homebrew/bin`、`/usr/local/bin`の順とする。`NODE_OPTIONS`は環境変数自体を不存在にする。

## 診断・修正閉包

| 項目 | 実測 |
|---|---|
| 診断JSON | `a-v002-vertical-render-plan-mismatch-20260810-v001.json` / SHA `4d1e61c602f812d1838387c3e3263c6e287a1b7061f7c9b7df8966f259cc4438` |
| 診断・修正設計 | `presentation-a-v002-vertical-render-plan-mismatch-diagnosis-and-repair-design-20260810-v001.md` / SHA `e586bb27887abe33e79c61b0d57dc501b580d4fadc56c3b45bf9ecc2d7360885` |
| production変更 | `presentation_output_render_plan_v001.mjs` / SHA `a333b9cca2e4c376be9022113f185b718218d339281c0c8dd4e67916390abb35` |
| v1検査変更 | `presentation_output_render_plan_v001.test.mjs` / SHA `a35fc4d811e8e4d9a602b495157cd40b097206c4131ffca15c14824b149a4378` |
| v2検査変更 | `presentation_output_render_plan_v002.test.mjs` / SHA `ca46aafc9392beb3fb319dc576b134c128060b39732889347027ae7745a4f842` |
| 対象path | production 1 + test 2。schema・job値・保存済み成果物は不変 |
| 開発時対象検査 | ORP017 / ORP018 / ORPV2005 = 3/3合格 |

## 正式開始条件

| 項目 | 判定 |
|---|---|
| attempt-0011 | 開始前に未使用を確認 |
| job v009 | 未発行 |
| proof root v007 | 未使用 |
| 使用済みv006 root | 不変保持 |
| 横型第1号 | SHA `b12ec0af708af0a5afa69488b72bf55a6300bbed162877c59cc9154f79f14fcf`、不変保持 |

正式92件を頭から一度実行し、92/92の場合だけ新版jobと未使用rootによるproofへ進む。不合格1件で同attempt内に直さず停止する。

## 正式preflight結果

| 項目 | 実測 |
|---|---|
| 正式検査 | 92/92合格、fail 0、skip 60 |
| 保存済みC工程oracle | 横型・縦型とも`captionDisplays` byte一致 |
| 新枝 | exact縦型診断styleがcommon coreまで合格 |
| v001不変 | 既存common plan SHA一致、v001正式経路は診断style拒否 |
| TAP | `formal-92-preflight.tap` / SHA `4fa728de384cbe309d322a53f70f9c3bf2669d5114780e1cb4546811dff47720` |
| stderr | 0 byte / SHA `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## 新版job

| 項目 | 実測 |
|---|---|
| v009 job | 7,260 byte / SHA `9628f013a766c30f0c19b76e132f485d1c6227fdaf356e9eff7b1c02811af2e8` |
| decoder / validator / serializer | 合格 / 合格 / byte一致 |
| v008との差 | job ID、出力root、render-plan-v001実装SHAの3値だけ |
| implementation binding | 20/20を現物再hash。変更は承認済みrender-plan-v001だけ |
| 新proof root | `a-v002-layer1-v3-option-b-proof-20260810-v007` / 未使用 |
