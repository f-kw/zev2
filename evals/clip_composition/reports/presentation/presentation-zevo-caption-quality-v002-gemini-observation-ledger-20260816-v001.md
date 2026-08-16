# ZEVO字幕品質v002 Gemini観測台帳 v001

日付: 2026-08-16

## 1. 結論

本日のGemini実測は、同じ字幕境界選択を三つの異なる停止層へ分離した。

1. Gemini 3.7は、密な正式schemaをHTTP 400で拒否した。
2. 受理可能なTier 1へschemaを薄化するとHTTP 200になったが、正式入力では安全性遮断が発生した。
3. Gemini 3.6へ同じ入力とTier 1を渡すと安全性遮断は消えたが、回答は明示的な棄権だった。

よって現在の未達は通信形式の一問題ではない。schema受理、安全性判定、境界選択の完遂は別々に観測・判定する必要がある。

## 2. schema受理

### 2.1 最初の正式shape

- 最小request、medium thinking、小schemaはGemini 3.7でHTTP 200。
- 正式schemaはHTTP 400 `INVALID_ARGUMENT`。
- `propertyOrdering`だけの除去、253境界enumだけの除去でもHTTP 400。
- 400応答は課金0。

### 2.2 加算probe

root union、status判別、配列個数制約、深い閉object、property orderは、それぞれ単独ならHTTP 200だった。complete branchをまとめるとHTTP 400となり、境界enumを外した2,357 byte版でも変わらなかった。

観測上の原因は、単一の不許可語彙ではなくcomplete branch内の制約組合せである。provider内部機構は公開されていないため、それ以上は断定しない。

### 2.3 Tier 1

二状態、caption/cue/lineの骨格、required、caption ID 3件、boundary ID 253件のenumを維持し、ローカルstrict検査と重複する個数・深い閉object・順序指定をprovider schemaから除いたTier 1はHTTP 200で受理された。

ローカルselection validatorは不変であり、provider schemaから除いた制約をsilent受理する経路はない。

## 3. Gemini 3.7安全性観測

### 3.1 正式送信1回目

正式3字幕・253境界・Tier 1・最大出力65,536で、HTTP 200、candidate 0件、`PROHIBITED_CONTENT`。入力10,282 token、thinking 498 token、費用US$0.009579。

### 3.2 字幕分離と全量対照

Tier 3最小schema・最大出力16で、字幕1、字幕2、字幕3、3字幕全量対照の4回はすべてHTTP 200・非遮断だった。字幕本文単体へ原因を帰属できない。

4回合計はUS$0.016106250。

### 3.3 正式送信2回目

同じ3字幕・253境界・Tier 1で再度`PROHIBITED_CONTENT`。入力10,282、thinking 1,556、candidate 0、費用US$0.013546500。

この結果により、安全性遮断は専用の第一級結果として正式分類された。一方、block reasonより内側の理由はproviderが返していないため推測しない。

### 3.4 schema・出力予算分離

- Tier 1＋最大出力16: HTTP 200、非遮断、thinking 13。
- Tier 3＋最大出力65,536: HTTP 200、非遮断、thinking 1,920。

二つとも単独では遮断を再現しなかった。したがって、Tier 1単体または大きい出力予算単体を遮断原因とはできない。訂正後費用合計はUS$0.02271675。

## 4. Gemini 3.6

### 4.1 互換probe

Tier 1、structured output、medium thinkingはHTTP 200で受理された。入力6、thinking 13、費用US$0.00005325。

### 4.2 正式B5/B6

- B5 countTokensは2回とも10,282で一致。実行費用US$0。
- 送信前最悪投影US$0.2534715、承認上限US$1.00内。
- 正式B6はHTTP 200、candidate 1件、safety blockなし。
- 回答は`{"status": "abstained"}`。
- 入力10,282、candidate 7、thinking 3,667、合計13,956 token。
- 費用US$0.021489。

3.6はschema輸送と安全性遮断を通過したが、境界選択は完遂しなかった。これはproviderの明示的棄権という正式観測であり、入力・schema・実装の欠陥には帰属させない。

## 5. Gemini 3.6棄権診断

### 5.1 D1 — thinking high

正式入力・Tier 1・最大出力を不変とし、thinkingだけmediumからhighへ変えた。HTTP 200、candidate 1件、安全性遮断なしだったが、回答は再び`abstained`。入力10,282、candidate 6、thinking 2,004、費用US$0.015249。

### 5.2 D2 — 理由field付きschema

正式入力・medium thinkingを不変とし、abstained branchへ`reason:string`一件だけを追加した。モデルは3字幕分の選択（cue 13/8/6）を生成したが、statusを契約外の`success`とした。ローカル厳格受入では最初の応答schemaで確定不合格となるため、後段へ流用していない。入力10,282、candidate 1,797、thinking 4,427、費用US$0.0310515。

### 5.3 D3 — 自由記述

structured outputを外し、実行不能時の障害説明を一件追加した。回答は「JSON Schemaの詳細と、意味の小単位の客観的分割基準が不足」と説明した。これは診断時のprovider説明であり、正式promptの真因や内部機構とは断定しない。入力10,299、candidate 49、thinking 1,897、費用US$0.01502175。

thinking highだけでは棄権は解消しなかった。D2は内容生成自体が不可能ではない可能性を示す一方、正式受入可能な回答ではない。既承認分岐に従いD2/D3後に停止し、D4〜D6、v020、正式B6再送は行っていない。

## 6. 費用と未実施

棄権診断前の字幕品質API検証累計はUS$0.08396625。D1〜D3はUS$0.06132225。本日全API実測累計はUS$0.14528850。countTokensは無償。secret保存0件、正式再試行0件。

selection受入、既知6境界の非再選択、page/line plan、render plan、横型3本、QC、確認ページは未実施である。

現在は既承認分岐(c)のD2/D3理由観測後で停止している。診断回答は正式成果物へ流用していない。次の判断はprompt/task本文の改訂要否である。

## 7. 主要証拠

- schema診断: `diagnostics/presentation-zevo-caption-quality-v002-gemini-3-7-b6-request-probes-20260815-v001/`
- 加算probe: `diagnostics/presentation-zevo-caption-quality-v002-gemini-3-7-b6-additive-probes-20260815-v001/`
- Tier採用: `diagnostics/presentation-zevo-caption-quality-v002-gemini-3-7-schema-tier-probes-20260815-v001/`
- safety分離: `diagnostics/presentation-zevo-caption-quality-v002-provider-safety-split-probes-20260816-v001/`
- schema・出力予算分離: `diagnostics/presentation-zevo-caption-quality-v002-schema-budget-separation-probes-20260816-v001/`
- 3.6互換: `diagnostics/presentation-zevo-caption-quality-v002-gemini-3-6-tier1-compatibility-probe-20260816-v001/`
- 3.6正式停止報告: `presentation-zevo-caption-quality-v002-gemini-3-6-formal-b6-abstained-stop-report-20260816-v001.md`
- 3.6棄権診断: `diagnostics/presentation-zevo-caption-quality-v002-abstention-diagnosis-20260816-v001/`
- 棄権診断停止報告: `presentation-zevo-caption-quality-v002-abstention-diagnosis-stop-report-20260816-v001.md`

本台帳のAPI追加通信は0回。
