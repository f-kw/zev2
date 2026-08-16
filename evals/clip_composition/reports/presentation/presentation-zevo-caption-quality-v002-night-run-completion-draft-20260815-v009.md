# ZEVO字幕品質v002 自走 完了報告草稿 v009

日付: 2026-08-15

状態: **未完了の完了報告草稿**。F/U fixture製造契約設計の提示停止までを反映する。

## 1. 現在地

- S 6/6、A 11/11、L 10/10、P 10/10、R 4/4は局所ゲート合格済み。
- Fの直近正式attempt-0011は1/3で完全停止した。
  - ZCQ042: 合格。
  - ZCQ043: renderer作業rootの既使用拒否。
  - ZCQ044: 同じroot衝突から派生した保持manifest不一致。
- productionの既使用拒否は契約どおり動作した。
- 帰属はfixture・検査設営欠陥。開始前hookが直接読む5 pathだけを環境manifestへ載せ、productionがjob ID・attempt ID・case IDから後段で導出するrenderer作業rootを閉包しなかった。
- 討ち止めが発効し、F/U fixture製造の独立工程化は採用済み。方式採否は再度問わない。
- kawafmm裁定により着工時期は「清書前」、範囲は「F/U限定」に確定した。

## 2. 今回到達した主線

現物調査から始め、F/U fixture製造契約設計v001を起草して提示停止した。

設計の固定値:

- 現行17 path→19 path（新規runner/test 2 path）
- 既存変更3 path（F proof runner/test、U test）
- F payload 37、U payload 7、合計44
- environment manifest 600行
- retention manifest 26行
- 公開rootの正式file 48件
- 既存49 code・46検査ID・489 proof不変
- fixture固有4 code・2検査ID・34 proof追加
- 合計48検査ID・523 proof
- implementation binding: 36/11/19/41/51/52
- approved contract binding: 14/14/15/16/17/17

設計は、proof runnerとfixture runnerが同じpath projection pure入口を使い、renderer root計算を複製しない。fixtureを正式packageとreceiptで渡し、F/U testはreceipt受入後だけ開始する。旧in-test製造、fallback、併産、latest aliasは作らない。

主線文書:

- `presentation-zevo-caption-quality-v002-fu-fixture-manufacturing-contract-design-20260815-v001.md`

現在は設計の承認/差し戻し待ちであり、実装・検査実行・API・描画は未承認である。

## 3. 凍結中の実装と証拠

次は変更・削除・commitしていない。

- F production / test
- U support / test
- 全F attempt証拠
- 保存済みfixture
- A-v002成果物
- 既存正式成果物とstable tag

直近F attempt-0011のTAP・stderr・終了code・signalは独立保存済みである。ZCQ043/044のproofは合格扱いにしていない。

## 4. 未実施

| 工程 | 状態 |
|---|---|
| F/U fixture契約設計 | 提示済み・未承認 |
| fixture runner/test実装 | 未実施 |
| fixture正式製造とreceipt | 未実施 |
| F局所3件 | 新経路では未実施 |
| U局所 | 未実施 |
| 正式48件 | 未実施 |
| 直接影響回帰 | 未実施 |
| green 287/287 | 未実施 |
| baseline 86/203 exact | 未実施 |
| 既存5 tree・A-v002記録対象tree照合 | 未実施 |
| API countTokens / generateContent | 未実施・別承認 |
| 横型3本再描画 | 未実施・別承認 |
| 人間目視 | 未実施 |
| commit / stable tag | 未実施・禁止範囲 |

## 5. 副線

主線の提示停止後、reports配下の新規文書だけで次を作成した。

### 5.1 描画疎結合化

`presentation-rendering-decoupling-feasibility-and-contract-materials-20260815-v001.md`

現caption v003、title C、旧演出指示契約、共通描画core、preset/QCを現物照合した。renderer非依存instruction artifactとrenderer admission receiptのschema骨格、pipeline出口/入口検査、工事下限、移行順、並列化/競合を整理した。契約は起草していない。

### 5.2 分離rendererの表現力

`presentation-separated-renderer-expressiveness-research-plan-draft-20260815-v001.md`

配置、font、色、サイズ、fade/animation、opening hook、G4〜G7画面化、QC/proof、人間A/Bの調査順を整理した。技術・styleは選定していない。

### 5.3 provider再評価

`presentation-caption-boundary-llm-provider-reevaluation-feasibility-draft-20260815-v003.md`

正式Gemini pair成立前であること、F/U fixture新経路が前提工程になったこと、第二providerの公式調査とAPI実走が別承認であることを現在地へ同期した。

## 6. 在庫

- S〜U全gateへのfixture製造統合（スケルトン清書時）
- 描画疎結合化の正式契約設計
- 分離rendererの表現力調査
- 字幕境界選択LLM provider再評価
- 契約件数pin proofの置換連鎖
- 新設runnerの観測性標準
- 観測契約・loader構造変更時のtoolchain変換範囲照合
- 出力側gate fixtureの独立製造を清書時の共通形へ昇格するか

## 7. 外部作用

- API通信: 0回
- countTokens: 0回
- generateContent: 0回
- 費用: US$0
- 正式描画: 0回
- production/test変更: 0件（主線設計・副線文書とDECISIONS記録のみ）
- commit: 0件
- stable tag: 0件

## 8. 次に必要な人間判断

主線で必要なのは、F/U fixture製造契約設計v001の承認または差し戻し1件である。副線の`要裁定`は主線の実装を妨げないため、同時に決める必要はない。

