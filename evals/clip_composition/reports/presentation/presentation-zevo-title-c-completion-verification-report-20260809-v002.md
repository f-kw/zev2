# C工程 タイトル再選定・別style確認版 完成物検証レポート v002

- 日付: 2026-08-09
- 対象: 元配信`qdczJpv8RCc`、candidate 59
- API通信: 0回
- 追加費用: US$0
- 人間認定状態: 文言・位置・表示時間は確定済み。新版styleの目視だけ未確認

## 1. 今回確定したこと

正式タイトルは`片付けの「やりかけ癖」を語るマリン船長`。

片付けは過去を振り返る話、服を脱いでいた件は現在の別話題であるため、後者をタイトルへ含めていない。初版で合格した上部表示と冒頭6秒は変更していない。

通常字幕と同じ見た目だった初版title styleは不採用とした。新しい確認版では、既に人間認定済みのナレーションカードの造形を引用し、明朝体・濃紺半透明背景のタイトル専用表示へ分離した。数値を新しく推測せず、位置と時刻だけ初版タイトルの合格値を維持した。

## 2. 実際にできるようになったこと

- タイトルが通常字幕とは明確に違う造形で表示される。
- 横型・縦型とも、本文を欠落させず次の自然な2行へ機械的に折れる。

```text
片付けの「やりかけ癖」
を語るマリン船長
```

- タイトルはframe 0〜179、30fpsで冒頭6秒だけ表示される。
- 元の字幕31件、全1,547 frame、音声packetは変更していない。

## 3. 確認動画

### 横型

- path: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v003-output/title-rendered-v001.mp4`
- SHA-256: `d7ffe856d8aeb6a1c1ac90cb506c08f1f6fa7f58e642f6fdfe3b44e4af968d82`
- 1920×1080 / 51.566016秒 / 1,547 frame
- QC: 6/6

### 縦型

- path: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v003-output/title-rendered-v001.mp4`
- SHA-256: `b918093b04837d45f36f1a988782d967689051f59930998f4b09685fb8727c62`
- 1080×1920 / 51.566016秒 / 1,547 frame
- QC: 6/6

## 4. 機械検証

| 検証 | 結果 |
|---|---:|
| タイトル契約・runner・選定文言の折り | 61/61 |
| 横型描画後QC | 6/6 |
| 縦型描画後QC | 6/6 |
| 既存green | 287/287 |
| 既知baseline | 86/203、不合格117件でexact不変 |
| 既存正式成果物tree | 5/5 |

描画後QCは、元動画束縛、タイトル本文、タイトル適用、配置と可視性、frame数、音声の6項目を検査した。

正式描画前の準備では、初回の検査commandに固定TSX loaderが無かったため1回停止し、固定loader付きの新attemptで61/61を得た。また、新jobの初回byte確認で末尾LFが1 byte余分だったため、正式serializerのbyteへ直して再照合した。どちらの停止でも動画は公開しておらず、productionの合格条件は変更していない。

## 5. 既存成果物への影響

- 初版title registry、初版title package、旧横型・縦型title job、旧横型・縦型動画は変更していない。
- 新版はregistry v002、意味package v002、job/output v003の新しいpathだけへ公開した。
- dual-path、fallback、旧版変換は作っていない。現在の正式runnerはforward-onlyで新版registryだけを受理する。
- C工程の安定tagはまだ発行していない。

## 6. 人間に確認してほしいこと

両動画の冒頭6秒だけを見ればよい。合計約12秒。

1. 通常字幕とは別の「タイトル」に見えるか。
2. 2行の読み方が自然で、文字が小さすぎないか。
3. 濃紺のカードが上部映像を隠しすぎていないか。

位置と表示時間は初版で合格済みなので、問題が再発していないことの確認だけでよい。

## 7. 事実・推測・未確認

### 事実

- 正式文言と「服を脱ぐ話を含めない」判断はkawafmmが確定した。
- 二形式ともQC 6/6、1,547 frame、音声packet SHA一致。
- API通信0回、費用US$0。

### 推測

- 明朝体と背景カードにより通常字幕との差は十分大きいと見込む。これは機械合格ではなく、目視で確定する。

### 未確認

- 新版styleの最終的な読みやすさと、映像を隠す量の人間合否。
- 人間合格後のC工程安定点化。

## 8. 証拠

- 正式検査TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v002/attempt-0002/title-targeted-61.tap`
- 描画検証: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v002/render-verification-v001.json`
- green TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v002/green-287-attempt-0001/green-287.tap`
- baseline TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v002/baseline-203-attempt-0001/baseline-203.tap`
- 5 tree TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v002/five-tree-attempt-0002/five-tree.tap`

## 9. 次の人間作業

横型・縦型の冒頭6秒を見て、上記3点をまとめて`問題なし`または修正内容で返す。人間作業は1判断、約15〜30秒。

