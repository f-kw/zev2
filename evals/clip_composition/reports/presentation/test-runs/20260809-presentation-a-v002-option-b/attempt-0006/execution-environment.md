# A-v002案B 基礎映像path限定修正 正式attempt-0006 実行前記録

- 記録時刻: 2026-08-09T12:54:21Z
- 実行環境: native
- API通信: 0回
- 費用: US$0

## 正式command環境

| 項目 | 実測 | 判定 |
|---|---|---|
| Node | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` / `v20.19.6` / SHA-256 `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` | 登録一致 |
| TSX loader | `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs` / SHA-256 `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f` | 固定絶対path一致 |
| NODE_OPTIONS | 環境変数不存在 | 合格 |
| PATH | 固定Node→`/opt/homebrew/bin`→`/usr/local/bin`→OS標準 | 合格 |
| FFmpeg | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg` / SHA-256 `d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798` | 登録一致 |
| FFprobe | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffprobe` / SHA-256 `dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9` | 登録一致 |
| Chromium | 固定Chrome Headless Shellをnative起動、終了0、DOM取得成功 | 合格 |
| 競合proof process | 照合command自身を除き0件 | 合格 |

## jobと出力先

| 項目 | 実測 | 判定 |
|---|---|---|
| proof runner | SHA-256 `37e9eedc208cb17c81a85297d81efd1d0cabdfbe1c72c14cf3523a0cb05a4e2c` | job束縛一致 |
| v004 job | 7,260 byte / SHA-256 `e5aacdbd51c9ec30aee8a9ef847386a8e641dd723a2aca099229ae0fe4c7104b` | validator合格・正式serializer byte一致 |
| job値差 | job ID、対応する出力root、proof runner SHAの3件だけ | 合格 |
| 新proof root | `a-v002-layer1-v3-option-b-proof-20260809-v002` | 未使用 |
| renderer work root | 同job ID用の隠しwork root | 未使用 |
| 派生source/meaning root | 3候補×2工程=6 root | 全て未使用 |

使用済みv001 proof root、attempt-0005、その子成果物、一時作業物は不変保持する。
