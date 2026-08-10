# A-v002 planner等価圧縮 正式attempt-0010 起動前記録

- 記録日: 2026-08-10 09:23:07 JST
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
| Chromium | `/Users/kawafmm/workspace/zev2/runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell` | `b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8` | 内容一致、正式proof前にnative起動を再確認 |

正式PATHは固定Node、`/opt/homebrew/bin`、`/usr/local/bin`の順に置く。`NODE_OPTIONS`は環境変数自体を不存在とする。FFmpeg/FFprobeは正式PATHから`/opt/homebrew/bin`へ解決した。

## 実装前監査

| 項目 | 実測 |
|---|---|
| 等価圧縮設計 | `presentation-a-v002-page-line-planner-equivalent-pruning-design-20260810-v001.md` / SHA-256 `6612b996f2eddcc6f1b1040eecb4e3129dcf66e66e5dd87ac23344bd0a0c3793` |
| planner v001 | `ebafe022060aaf9b98d9f7f27ae60af5e139295e0390ccca4db5caa99f590879` |
| planner v002 | `8c943d68e1d08aadd48ab80e100006e091d2163c8fcb88a005e9f07f050b7f83` |
| proof runner | `2a1cae13a53c73334d7078e426049dbc35cc39b8cadcabc2ead4a57bdc4889c2` |
| 静的レビュー | blocker 0件。状態支配・edge支配・frame分離・写像cache・checkpoint no-replace/再読・保存済みC工程oracleを照合済み |

正式92件と、同じ検査内の保存済み横型・縦型`captionDisplays` byte oracleが全て合格した場合だけ、新版jobと未使用rootによるproofへ進む。

## 正式preflight結果

| 項目 | 実測 |
|---|---|
| 正式検査 | 92/92合格、fail 0、skip 60 |
| 保存済みC工程oracle | 横型・縦型とも`captionDisplays` byte一致 |
| TAP | `formal-92-preflight.tap` / SHA-256 `b8cdd1aea21570626cb2cdaca0a63975fda2e728c0d9911b61e275a992864b54` |

## 新版jobと正式proof起動前checklist

| 項目 | 実測 |
|---|---|
| v008 job | 7,260 byte / SHA-256 `0c5fcf0320bfa72d60350182a40462ae700e4515e172ba7f6c4e3e608b183fcf` |
| decoder / validator / serializer | 合格 / 合格 / byte一致 |
| v007との差 | job ID、出力root、proof runner SHA、planner v001/v002 SHAの5値だけ |
| 新proof root | `a-v002-layer1-v3-option-b-proof-20260810-v006` / 未使用 |
| live binding | proof runner・planner v001・planner v002を現物SHAへ更新。他17件はv007と同値 |
| 並行process | proof runner・Remotion・専用Chromium・正式FFmpeg/FFprobe 0件 |
| Chromium | native起動終了0、空HTML取得 |

正式proofは固定Node先頭PATH、固定TSX絶対path、`NODE_OPTIONS`不存在、native、Chromium起動可能、FFmpeg/FFprobe登録実体一致の条件で1回だけ実行する。

## 正式proof結果

| 項目 | 実測 |
|---|---|
| 開始 | `2026-08-10T00:26:55.294Z` |
| 終了 | `2026-08-10T00:46:40.444Z` |
| 実行回数 | 1回 |
| 終了code / status | `1 / rejected` |
| 違反 | `OUTPUT_V002_RENDER_PROJECTION_MISMATCH` |
| path | `/renderPlan` |
| stdout | 187 byte / SHA-256 `58d255cf9c1b19d2f4626bbb893cd77023bc8f4780f54ebfacc294bce6d5430c` |
| stderr | 0 byte / SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| wrapper outcome | SHA-256 `1d034865ccef94a99711bfd226d3dace928e2fd1ecc5912b1269f24e472845ce` |

最初の候補の横型plannerは1,604ms、縦型plannerは1,648msで完了した。横型動画は描画・QCに合格した。縦型表示計画の照合で拒否されたため、同attemptで修正・再実行せず停止した。
