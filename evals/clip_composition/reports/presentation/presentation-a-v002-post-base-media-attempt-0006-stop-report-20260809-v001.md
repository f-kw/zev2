# A-v002 基礎映像後段 正式attempt-0006 停止報告 v001

## 1. 結論

保存済みattempt-0005から確定した一時path欠陥を限定修正し、新しいjob・新しい出力rootで正式attemptを1回実行した。基礎映像の生成・SHA計算・正式公開は合格し、前回の停止原因は解消した。

その後、同じ1件目候補の横型出力へ進む途中で別のfatalとなった。終了は`2 / fatal`。完成動画6本、QC、確認ページには未到達であり、同attemptでの修正・再実行は行っていない。

## 2. 今回の限定修正

macOSの一時領域に置く次の2媒体だけを、既存の実体解決付きstable streaming hash入口へ接続した。

- 横型候補の一時基礎映像
- 縦型字幕診断の一時基礎映像

実体解決の前後で読取対象が差し替わっていないことを確認し、内容SHAは既存の唯一の正本で計算する。workspace内の正式成果物・入力・renderer stagingには従来の厳格path規則を維持した。

契約、schema、媒体処理、QC基準、正式成果物、live束縛は変更していない。限定検査は10/10合格した。

## 3. 新jobと出力root

| 項目 | 値 |
|---|---|
| runner SHA-256 | `37e9eedc208cb17c81a85297d81efd1d0cabdfbe1c72c14cf3523a0cb05a4e2c` |
| test SHA-256 | `31f5c00e8d35429eadfc4368421b6dcf2b783fd695de2b5201d27564563e0990` |
| v004 job SHA-256 | `e5aacdbd51c9ec30aee8a9ef847386a8e641dd723a2aca099229ae0fe4c7104b` |
| 新job ID | `a-v002-layer1-v3-option-b-proof-20260809-v002` |
| 新proof root | `evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260809-v002` |

v003から変えたjob値は、job ID、対応する出力root、proof runner SHAの3件だけである。正式validator合格、正式serializerとのbyte一致、開始前の新proof root・renderer work root・派生6 root未使用を確認した。

使用済みv001 root、attempt-0005、子成果物、一時作業物は不変保持した。

## 4. 正式attemptの結果

| 項目 | 実測 |
|---|---|
| attempt | `attempt-0006` |
| 実行時間 | 2026-08-09T12:56:01Z〜13:13:46Z |
| 実行回数 | 1回 |
| 終了code / status | `2 / fatal` |
| stdout | 680 byte / SHA-256 `2e53225cf506aa394f9538866c795cc4f2cb52f45fb385a819d1b11742402745` |
| stderr | 0 byte / SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 共通fatal観測 | `unknown / UNCLASSIFIED / target null` |
| proof局所観測 | `variant-execution / child-process / step null / target null` |
| API通信・費用 | 0回 / US$0 |

起動前には固定Node先頭PATH、固定TSX絶対path、`NODE_OPTIONS`不存在、native、Chromium起動可能、FFmpeg・FFprobeの実体path/SHA一致、競合proof process 0件を記録した。

## 5. 前回原因の解消を示す実体

1件目候補について、次が新rootへ公開された。

| 成果物 | SHA-256 |
|---|---|
| 基礎映像 | `6fe8c8ac4b41379073b5f194c1a3e5977a64ed39434c8842fe7db03b40247f7e` |
| timeline | `3d368457d22e765abf08d0b41c30be5f825834a7481fb396a5be01d7d54f7803` |
| generation manifest | `4f07ae4a3fd369b9bd44e619ee509ee4e620ea0c20ee561f6ebde6f566ec3b0e` |
| validation receipt | `3c9d003f938b034daf7acc79dcb95c5e94ff299c7dff68ee4e1af2a01a61ef71` |

validation receiptは`passed`、期待frame数は755である。したがってattempt-0005で止まった「一時基礎映像のSHA計算」は通過し、基礎映像工程は正式公開まで閉じた。

## 6. 新しい停止の観測範囲

renderer work root、横型・縦型の動画、renderer QC、確認ページは0件である。このため停止範囲は「1件目基礎映像の正式公開後から、最初のrenderer work取得前」である。

保存済み基礎映像へ、後続で使う既存の媒体inspectionを読み取り専用で適用すると終了0で、1920x1080、30fps、755 frame、AAC音声を返した。ただし正式attempt内にこのinspectionの入場・完了checkpointがないため、元attemptが同じ呼出しを完了したとは断定しない。

現在のproof観測は、variant内の全例外へ一律に`child-process`を付ける。したがって保存済み結果だけでは、横型style解決、page/line plan、render plan、共通描画計画、媒体inspectionのどこで、どの値・tool終了codeにより止まったかを確定できない。

## 7. 事実・推測・未確認

### 事実

- 前回の一時path欠陥は解消し、基礎映像4成果物が新rootへ正式公開された。
- 新しいfatalは基礎映像公開後、最初のrenderer work取得前に発生した。
- 外部通信、追加費用、再試行、同attempt修正は0件である。

### 推測

- なし。`child-process`という観測名だけから外部tool原因と判定しない。

### 未確認

- 新しいfatalの具体的な内側工程、値、対象path、tool終了code。
- 残る2候補、横型3本、縦型字幕診断3本、QC、確認ページ。

## 8. 停止

新たなfatalを観測記録付きで保存し停止する。同attemptは変更・再実行しない。使用済み新rootと全fatal証拠も不変保持する。

次に必要なのは、基礎映像公開後からrenderer work取得前までの閉語彙checkpointをproof runnerへ追加するか、保存済み成果物と既存pure入口だけで各段を順に再現する読み取り診断の承認である。runnerを変更する場合はlive束縛を維持した新jobと、さらに新しい出力rootが必要になる。

人間目視前tag禁止、O1予約、通信0、費用US$0を維持する。
