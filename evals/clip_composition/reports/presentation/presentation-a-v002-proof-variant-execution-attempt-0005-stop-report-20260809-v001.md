# A-v002 proof variant実行 正式attempt-0005 停止報告 v001

## 1. 結論

正式PATHを訂正し、登録済みNode・FFmpeg・FFprobeの実体pathと内容SHAを起動前に3/3照合した。同じv003 jobを1回だけ実行した結果、前回のruntime profile拒否は解消したが、最初の候補の基礎映像処理中に新しいfatalが発生した。

終了は`2 / fatal`。同attemptでの修正・再実行はしていない。六本の完成、QC、確認ページには到達していない。

現在のproof runner局所観測は、開始時再読の完了と`variant-execution / child-process`までは示すが、基礎映像処理内の具体的な子工程を残していない。保存済み証拠から原因を一意に決められないため、推測で補わず停止する。

## 2. 実行設営の訂正結果

正式PATHは次へ訂正した。

`/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`

| tool | PATH探索結果 | 実体path | 実測SHA-256 | 登録一致 |
|---|---|---|---|---|
| Node | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` | 同左 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` | 一致 |
| FFmpeg | `/opt/homebrew/bin/ffmpeg` | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg` | `d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798` | 一致 |
| FFprobe | `/opt/homebrew/bin/ffprobe` | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffprobe` | `dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9` | 一致 |

固定TSX loader絶対path、`NODE_OPTIONS`不存在、native実行、Chromium起動可能、競合proof process 0件、開始時のproof出力root未使用も確認した。コード・job・契約は変更していない。

`DECISIONS.md`には、二系統tool同居を既知リスクとし、FFmpeg・FFprobeのPATH探索結果・実体path・内容SHA照合を正式command起動前の恒久項目へ加えた。

## 3. 正式attemptの観測

| 項目 | 観測 |
|---|---|
| attempt | `attempt-0005` |
| job | v003 / SHA-256 `dd6d727bdc909b7f5139b6cb8b9b353ce0f60fc9d5f63f37314c3b2a830a0da1` |
| 実行回数 | 1回 |
| 実行時間 | 2026-08-09 12:16:09Z〜12:33:38Z |
| 終了code / status | `2 / fatal` |
| stdout | 680 byte / SHA-256 `2e53225cf506aa394f9538866c795cc4f2cb52f45fb385a819d1b11742402745` |
| stderr | 0 byte / SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 共通fatal観測 | `unknown / UNCLASSIFIED / target null` |
| proof呼出側段階 | `variant-execution` |
| proof例外型 | `child-process` |
| proof内側step / target | `null / null` |
| API通信・費用 | 0回 / US$0 |

完了checkpointは、依存初期化の入場・完了、開始時再読の入場・完了の4件である。これにより、前回修正したruntime tool読取と、今回訂正したPATHによるtool照合は通過した。

## 4. 到達済みの部分成果物

最初の候補・固定順の最初の`horizontal-formal`処理について、次の正式byteが生成された。失敗証拠として保持し、上書き・削除しない。

| 成果物 | SHA-256 |
|---|---|
| 人間承認の正規化記録 | `a731556d31a22a1b7f02533cf605ff3e80ad9ccc4123e9645acbaf64cfd0e7a0` |
| 全文字atom記録 | `9c95ab7e8428da7e84ae8b8dd20d8cfbfdf80498ce95c5893ba0e7ec4355cad7` |
| 最初の候補入力 | `a2cdc45222520091499fa344837148ced8ac18f632f1dc4c7677d21e1a1d49bc` |
| source sequence job | `0bd4ae7e93b60c9e2837dfe92824c115a0b2c6e97286a02e305c3b9b1e056696` |
| 採用元区間列 | `64827ff37abc100a57e247bf79f5829bc44de8bda84584492fcfc0fac3bf125c` |
| 意味package job | `ecaf9358751518e0b41b3f897afb234a9fc9983d9f62abfd888f2f4085863bc2` |
| 意味情報パッケージ | `605ddbcdf57d9187846d190468b4e0bc2f0de83a63ab90874879513e94254abe` |

したがって、source sequence runnerと意味package runnerは正常完了している。

基礎映像用の一時workには次が残った。

| 一時物 | size |
|---|---:|
| `source-grid.f32le` | 2,979,993,984 byte |
| `encode-input.f32le` | 9,664,000 byte |
| `video-only.mp4` | 12,995,758 byte |
| `base-media.mp4` | 13,624,452 byte |

一時work pathは`/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev2-a-v002-proof-base-5Tbeen/`。削除承認がないため保持する。

基礎映像timeline、生成manifest、検査receipt、表示計画、横型・縦型動画、QC、確認ページは未生成である。

## 5. 事実・推測・未確認

### 事実

- 登録済みruntime tool 3件のPATH探索結果・実体path・内容SHAは一致した。
- 開始時再読は完了した。
- 最初の`horizontal-formal`処理へ入り、source sequenceと意味情報パッケージは正式byteとして生成された。
- 基礎映像用の映像・音声中間物と`base-media.mp4`は一時workへ生成された。
- その後、`variant-execution`内でfatalとなった。
- proof局所観測はstepとtargetを`null`で返した。

### 推測

- なし。`base-media.mp4`の存在だけから、mux後検査・媒体QC・後続検査のどれが失敗したかを決めていない。

### 未確認

- 基礎映像処理の具体的な失敗入口、値、tool終了code。
- 一時`base-media.mp4`が全QC条件を満たすか。
- 残る2候補、横型3本、縦型字幕診断3本の結果。

## 6. 観測性の限界

今回追加済みのproof局所観測は、候補実行全体を`variant-execution / child-process`として一括捕捉する。source sequence、意味package、元配信走査、映像組立、音声組立、mux、基礎映像QCを個別の閉語彙stepへ分解していないため、保存済みfatalだけでは内側原因を一意に読めない。

これは新設runner観測性の標準装備に残る実例である。今回の承認範囲では観測schema・runner・jobを追加変更しない。

## 7. 停止

承認条件どおり、新たなfatalを観測記録付きで保存し停止する。同attemptでの診断用再実行、修正、出力root再利用、六本描画、QC、確認ページ生成は行わない。

人間目視前tag禁止、O1予約、通信0、費用US$0の規律は維持する。次の再開には、基礎映像内の失敗段階を読み取れる診断方針と、既に使用済みとなったproof出力root・子成果物rootの扱いを含む別裁定が必要である。
