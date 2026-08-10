# A-v002 checkpoint限定修正 正式attempt-0009 起動前記録

- 記録日: 2026-08-10 JST
- 開始HEAD: `a64caf20f4e1e1acf6e5640ecca053f770d3f424`
- 実行環境: macOS 26.5.1 (25F80) / arm64 / native
- API通信: 0回
- 費用: US$0

## 固定実体

| 実体 | path / version | SHA-256 | 判定 |
|---|---|---|---|
| Node | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` / 20.19.6 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` | 一致 |
| TSX loader | `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs` | `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f` | 一致 |
| FFmpeg | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg` / 8.0.1 | `d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798` | 一致 |
| FFprobe | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffprobe` / 8.0.1 | `dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9` | 一致 |
| Chromium | `/Users/kawafmm/workspace/zev2/runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell` | `b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8` | native起動0、空HTML取得 |

正式PATHは固定Node、`/opt/homebrew/bin`、`/usr/local/bin`の順に置く。`NODE_OPTIONS`は環境変数自体を不存在とする。開始前にproof runner、Remotion、Chromium、FFmpeg、FFprobeの並行processが0件であることを確認した。

## 実装・診断・検査

| 項目 | 実測 |
|---|---|
| proof runner | `bc45b11a94432254ab8bb9e37da99f78922ad030481162b4f1151cb44945a398` |
| proof runner test | `100d8e3a6f1feb42bca92463204244b2b7a086a5eb08f8389df7b7944c73bbe3` |
| 正式92件preflight | 92/92、skip 60、fail 0 |
| TAP | `formal-92-preflight.tap` / SHA-256 `376f0ee31b057fece23e90f8e32ee5d5f84a16d7f92b815efe2806061c07ee5c` |

attempt-0008の段階別観測により、基礎映像inspectionで呼んだ関数の所有moduleが誤っていたことを現物で確定した。契約・入力・媒体・tool・環境の欠陥ではなく、proof runnerのimport所有だけの実装欠陥である。限定修正では既存の媒体QC moduleを読み込み、同じ既存inspection関数を呼ぶ。計算の複製、違反code、終了規約、正式成果物の変更はない。

横型/縦型style、page/line、render plan、共通描画plan、媒体inspection、renderer work取得、描画、QCを閉語彙で記録する。対象fileは検証済みbindingまたは実読取証拠が一意な場合だけ保存し、それ以外は`null`とする。個別toolの数値終了codeが構造化実体から得られない場合も`null`とし、生message・stack・stdout・stderrから推定しない。

## jobと未使用root

| 項目 | 実測 |
|---|---|
| v007 job | 7,260 byte / SHA-256 `a491a609bd7e359863c7004a350e514d4d631c0caed497cb2026cb9ff1246a21` |
| decoder / validator / serializer | 合格 / 合格 / byte一致 |
| implementation binding | 20/20 現物SHA一致 |
| v006との差 | job ID、出力root、proof runner SHAの3値だけ |
| 新proof root | `a-v002-layer1-v3-option-b-proof-20260810-v005` / 未使用 |
| renderer work root | `.a-v002-layer1-v3-option-b-proof-20260810-v005-renderer-work` / 未使用 |
| 派生source/meaning root | 3候補×2=6 root / 全て未使用 |

v001〜v006 job、既存proof root、attempt-0001〜0008の全fatal証拠は不変保持する。
