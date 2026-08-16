# ZEVO字幕品質v002 P/R module surface監査 停止報告 v001

日付: 2026-08-12  
通信: 0回  
費用: US$0  
正式描画: 0回

## 1. 結論

Lは10/10、Pは10/10、Rは4/4まで合格した。しかし、F工程の実装前監査で、PとRのproduction moduleが承認済みのexact named export集合より多いことを実測した。P/Rの既存TAPは余分export 0件を検査していないため、P/Rを閉じたとは扱わず、Fへ進まず停止した。

同attempt内の修正、API通信、正式描画、F/U pathの作成は行っていない。

## 2. ここまでに成立した事実

| 工程 | 結果 | 証拠 |
|---|---:|---|
| L正常fixture preflight | 全cueがproduction時間写像で正frameを持つ | 3 cueが179 / 223 / 353 frame |
| L局所ゲート | 10/10 | `/private/tmp/zevo-caption-quality-v002-l-gate-attempt-0003/l-gate.tap` |
| P正常経路preflight | 合格 | production plannerで実データ由来cueを再構築 |
| P局所ゲート | 10/10 | `/private/tmp/zevo-caption-quality-v002-p-gate-attempt-0001/p-gate.tap` |
| R正常経路preflight | 合格 | production render-planと共通描画projectionを実行 |
| R局所ゲート | 4/4 | `/private/tmp/zevo-caption-quality-v002-r-gate-attempt-0001/r-gate.tap` |

P/Rの各TAP全文とstderrは版付きattempt directoryへ保存済みである。Rのstderrは0 byteである。

## 3. 検出した不一致

承認済み完全実装設計 §3.1 はmodule間のnamed exportをexact集合として固定し、同§3.1・§10は余分export 0件の検査をP/Rの所有検査へ割り当てている。

### 3.1 P production

契約上の入口は次の3件である。

1. page/line plan decoder
2. page/line plan validator
3. page/line plan builder

現物は上記に加え、schema定数とcode集合定数の2件をexportしている。実測exportは5件である。

### 3.2 R production

契約上の入口は次の6件である。

1. output request decoder
2. output request validator
3. render plan decoder
4. render plan validator
5. render plan builder
6. common-core plan builder

現物は上記に加え、output request schema、render plan schema、common-core schema、code集合の4定数をexportしている。実測exportは10件である。

### 3.3 検査不足

PのZCQ036とRのZCQ038は、値schemaや正常経路は検査したが、module namespaceのexact export集合を検査していなかった。このため余分exportがある状態で局所TAPが全合格した。定数は他production/testから参照されていないため、現在の余分exportはmodule外の必要機能ではない。

## 4. 三分法

| 帰属 | 判定 | 根拠 |
|---|---|---|
| production欠陥 | 該当 | P/Rが未契約のnamed exportを公開している |
| fixture・検査設営欠陥 | 該当 | ZCQ036/ZCQ038がexact namespace検査を欠き、欠陥を合格させた |
| 契約矛盾 | 非該当 | §3.1に許可exportが列挙され、余分export 0件も明記されている |

## 5. 実現性調査で事前検出できたか

できた。各production path完成直後に、文書byteから抽出したnamed export集合と実module namespaceを照合していれば、P正式attempt前に検出できた。値schemaの検査をmodule surfaceの閉包と誤認した実装・監査側の不足である。

## 6. 推奨する最小再開計画

1. P/R production内のschema/code定数をmodule-privateへ戻し、契約済み関数だけをexportする。
2. PのZCQ036、RのZCQ038へ、承認済み文書byteから得たexact named export集合と実module namespaceの一致検査を追加する。
3. P/Rそれぞれで、直接import時のI/O・process起動・stdout/stderr 0件も同じ検査で再確認する。
4. P 10件とR 4件を新しいattemptとして頭から実行し、TAP全文を別の版付きpathへ保存する。
5. 両方合格した場合だけFから再開する。

変更候補は既存4 path（P production/test、R production/test）内に閉じ、新path・schema・code・検査ID・proof総数を増やさない。これは契約緩和ではなく、productionと検査を既存exact surfaceへ戻す修正である。

## 7. 未実施

- F production/testの作成
- U production/testの作成
- 正式46件
- 直接影響回帰、green 287、baseline 86/203、tree照合
- API通信、countTokens、generateContent、費用支出
- 正式描画、stable tag

## 8. 停止

P/Rのmodule surface修正と新attemptは別裁定を待つ。現在のP/R production、test、TAP、preflight記録は証拠として保持し、黙って修正しない。
