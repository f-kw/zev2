# A-v002案B 正式attempt-0001後監査 停止報告 v001

日付: 2026-08-09  
停止段階: 正式92検査完了後、既存回帰開始前  
通信: 0回  
費用: US$0

## 1. 結論

正式92検査は92/92に合格したが、その直後の独立再監査で、proof runnerの公開直前再読集合から、子runnerが生成したsource sequenceとmeaning packageが漏れていることを確定した。

正式検査合格をA-v002完了と扱わない。実装中の自己修復は承認済み上限の2周を使い切っており、この修正は3周目に当たる。そのため、コードを修正せず停止する。

## 2. 確定した事実

### 2.1 正式92検査

- 結果: 92合格・0不合格・60 skip（同じtest file内の対象外ID）
- TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-presentation-a-v002-option-b/attempt-0001/formal-92.tap`
- TAP SHA-256: `d42aec64b7985351401eed07ef9b39e3aa8640e5c1633a5bc207c76a9e54b5f6`
- 実行環境: 固定Node、固定TSX絶対path、固定Node先頭PATH、`NODE_OPTIONS`不存在、concurrency 1
- 実行後のproduction/test 24 path SHAは事前監査の固定値と一致し、検査実行中の変更0件。

### 2.2 成立している子工程の保護

- source sequence runnerは、親、人間認定、job、実装を開始時とその公開直前に再読し、no-replace公開する。
- meaning package runnerは、親、source sequence、job、実装を開始時とその公開直前に再読し、no-replace公開する。
- proof runnerは、両runnerが返したbindingのstrict byte、file SHA、canonical SHAを読み取り時に検査する。

### 2.3 残る差し替え窓

- proof runnerは、子runnerが公開したsource sequenceとmeaning packageを読み取った後、そのabsolute pathと検証済みSHAを外側の公開直前再読集合へ登録しない。
- `captureInputs(prepublication)`とcompletion marker前の再読は、proof root内の`state.proofArtifacts`だけを検査する。子runnerの出力は別の契約固定rootにあり、この集合に入っていない。
- 最終`render-plan-v002.json`はmeaning package bindingを参照する。meaning packageのprovenanceはsource sequence bindingを保持する。そのため、子runner返却後からproof completionまでの間に外部から書き換えられた場合、最終成果物が参照するbindingと現物が不一致のまま成功し得る。

## 3. 契約への照合

- 契約設計§4 provenanceは、各bindingを開始時と公開直前に再読する。
- 機械閉包§4.5は、source media、job、上流JSON、implementationの開始時・公開直前再読を要求する。
- したがって帰属は**実装が承認済み契約に届いていない**である。契約矛盾、検査期待の誤り、既存子runnerの欠陥ではない。

## 4. 検査が見逃した経路

- APJ005/APJ006は、依存を差し替えた合成`captureInputs`の開始・公開前差だけを確認した。
- APJ010は、実fixtureの正式化とrunner sourceの構造を確認したが、子runner出力の読取後変更を実filesystemで発生させなかった。
- そのため、39 codeの実発火と92/92合格は真だが、「全bindingのproof公開直前再読」を証明していない。
- 実現性調査で事前検出できた問題である。閉包書に入出力束縛は書いたが、生成された子成果物を外側の再読集合で一件ずつ追跡するところまで実行状態を展開しなかったことが原因である。

## 5. 次の修正の最小範囲（未実装）

| 対象 | 最小修正 | 契約影響 |
|---|---|---|
| proof runner（path 19） | 検証済みsource sequenceとmeaning packageのabsolute path・file SHAを外側再読集合へ登録し、`captureInputs(prepublication)`とcompletion marker書込み直前にstable read・SHA一致を要求する。既存strict decoderとSHA計算を使い、新計算を作らない。 | なし。承認済み再読要求へ到達する修正。 |
| proof runner test（path 20） | source sequenceまたはmeaning packageを読取後に変更したら、proof公開前に`OUTPUT_V002_RENDER_PROJECTION_MISMATCH`で拒否される実filesystem経路を既存APJ ID内で証明する。 | なし。不足した証明の追加。 |

新path、新schema、新違反code、計算複製は要らない見込みである。ただし、これは修正設計の提案であり、人間承認なしに実装しない。

## 6. 停止時の進捗

| 工程 | 状態 |
|---|---|
| exact 24 path実装 | 完了 |
| 事前一括検査 | 92/92 |
| 正式92検査 | 92/92、TAP保存済み |
| green回帰287 | 未実施 |
| baseline 86/203 | 未実施 |
| 既存5 tree照合 | 未実施 |
| 正式proof job | 未作成・未実行 |
| 横型3本 | 未生成 |
| 縦型字幕診断3本 | 未生成 |
| QC・確認ページ | 未実施 |
| 完了報告・O1 | 未実施 |
| commit・stable tag | 未実施 |

## 7. 停止判定

修正2 pathの新しい実装承認と、固定実体からの新しい正式attemptが必要である。承認までは、回帰、実データproof、描画、QC、O1に進まない。

