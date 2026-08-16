# ZEVO字幕品質v002 Gemini 3.6 Flash正式回帰追補v019

## 1. 目的と正本

本書は、入力を変えずにGemini 3.7 Flashの安全性遮断を切り分けるため、ZEVO字幕品質v002のB5/B6正式modelを`gemini-3.6-flash`へforward-onlyで回帰する最小追補である。v016〜v018と既存attemptは履歴証拠として不変保持する。字幕本文、3 caption、253 boundary、promptInput、system instruction、task本文、Tier 1 schema、ローカルstrict受入、safetySettings未指定、raw先行保存、再試行0、支出上限US$1.00は変更しない。

3.6正式B6は本書適用後の一回が初実走である。countTokensは既存B5来歴を3.6へ正しく束縛するための正式前段として最大2回を維持する。

## 2. 実現性調査

### 2.1 現物入口

| 対象 | 起草開始時SHA-256 | 現物結果 |
|---|---|---|
| 費用・公式値正本 | `a260592119e7fcaf32a02bb0893cd8e4411fa6f723ca283181006588221fbf67` | 旧3.6通常価格V001と3.7導入価格V002は実在する。3.6導入価格を履歴を壊さずV003として追加できる |
| B5/B6正式runner | `351c85945fc8476b1ffc2f09331ddb79049fc23e05361ebc9c18ca0fd8a6bef7` | model、resource、公式検証、countTokens requestを同じpolicyへ接続する実枝がある |
| B5/B6正式test | `7b39e4345fc099bfb55b0ab1d09a0ae88a5533b84d9f0261ad9672599f50c075` | model、endpoint、usage、契約集合、raw先行保存を実枝で照合する |

### 2.2 公式機能

2026-08-16にGoogle公式現物を照合した。

- model page: `https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash`
  - stable model IDは`gemini-3.6-flash`。
  - 入力上限1,048,576、出力上限65,536。
  - Structured outputsとThinkingをSupportedとする。
- thinking guide: `https://ai.google.dev/gemini-api/docs/generate-content/thinking`
  - Gemini 3.6 Flashは`thinkingLevel=medium`をSupportedかつDefaultとする。
- structured output guide: `https://ai.google.dev/gemini-api/docs/generate-content/structured-output`
  - Gemini 3.6 Flashのv1beta同期`generateContent`でJSON schemaを使う公式例が実在する。

現行requestは`systemInstruction`、`contents`、`generationConfig`だけを持ち、`generationConfig`は`maxOutputTokens`、`thinkingConfig`、`responseMimeType`、`responseJsonSchema`だけである。sampling field、candidate count、prefilled model turn、safetySettingsは0件である。

### 2.3 実endpoint照合

合成最小入力、採用済みTier 1 exact schema、`thinkingLevel=medium`、最大出力16で3.6へ一回送信し、HTTP 200、`modelVersion=gemini-3.6-flash`、safety blockなしを実測した。診断結果SHA-256は`2abea0cb31ae6751a0cf9d1a070ee309e7fe0ac960d700b781df6be226500980`である。したがって、正式送信前提のmodel、Tier 1 schema、structured output、medium thinkingは実endpointでもclosedである。

### 2.4 価格

Google公式pricing `https://ai.google.dev/gemini-api/docs/pricing`を2026-08-16に照合した。Gemini 3.6 FlashのPaid Standardは次である。

- 2026-12-31まで: 入力US$0.75/1M token、出力US$3.75/1M token。出力価格はthinking tokenを含む。
- 2027-01-01以降: 入力US$1.50/1M、出力US$7.50/1M。

## 3. model・価格契約

新しい費用policy V003を次で固定し、正式B5/B6だけをV003へ接続する。

| 項目 | exact値 |
|---|---|
| model ID | `gemini-3.6-flash` |
| model resource | `models/gemini-3.6-flash` |
| API | Gemini Developer API `v1beta` synchronous |
| countTokens | 最大2回 |
| generateContent | 一回 |
| automatic retry | 0 |
| input/output limit | `1048576` / `65536` |
| tier | fieldを省略しPaid Standard default |
| input price | `750 nanoUSD/token` |
| output price | `3750 nanoUSD/token`、thinkingを含む |
| maximum | `1000000000 nanoUSD` |

price snapshot schema、期間検査、2027年価格の記録、期間外停止はv016と同じで、`modelId`だけを3.6へ束縛する。providerの`modelVersion`はraw先行保存後の実返却値を読み、`gemini-3.6-flash`とのexact一致だけを受理する。alias、fallback、黙ったmodel切替は0件とする。

## 4. request・受入の不変

1. 保存済みsource packageのpromptInput、字幕本文、3 caption、253 boundaryをbyte不変で用いる。
2. Tier 1 schemaのexact byteと、schemaから除去した制約を所有するローカルstrict validatorを変えない。
3. `systemInstruction + contents`、`responseMimeType=application/json`、`thinkingLevel=medium`を変えない。
4. safetySettings、sampling、candidate count、prefilled turnを追加しない。
5. abstained、strict不受理、既知6境界再選択、安全性遮断、API失敗は一回で停止する。

## 5. binding・会計

本書をB5/B6 formal jobだけへapproved contract bindingとして一件追加する。

- source: 14件不変。
- B5: 15件から16件。
- B6: 18件から19件。
- selection/proof: 不変。
- implementation binding: B5 11件、B6 19件で不変。
- 所有code 50件、正式検査ID、proof 523件は増減0。

既存v016は3.7へ切り替えた歴史、v017はTier 1、v018は安全性遮断分類を所有する。本書は3.6回帰だけを所有し、v016を削除・上書きしない。

## 6. 変更path

既存3 pathだけを変更する。

1. 費用・公式値正本: 3.6導入価格V003 policy、公式検証、countTokens requestを追加する。
2. B5/B6 runner: V003、3.6 model/resource、本書bindingへ接続する。
3. B5/B6 test: 3.6 model/endpoint/usage、v019欠落拒否、契約件数を実枝で照合する。

新しいproduction path、schema、code、検査ID、計算複製は0件である。

## 7. 実行

1. 本書SHAと裁定をDECISIONSへ記録する。
2. 関連検査を新attemptとして実行し、TAP全文を保存する。
3. 新版B5 job・未使用rootでcountTokensを最大2回実行する。
4. 3.6価格による最悪費用投影がUS$1.00以下の場合だけ、新版B6 job・未使用rootでgenerateContentを一回送信する。
5. rawを先に保存し、model、usage、safety、strict selection、既知6境界を検査する。
6. 合格時だけP/R/Fを経て横型3本を正式描画し、QCと人間確認ページを作って停止する。

不合格一件で同attempt修正0件、再試行0のまま停止する。commit、stable tag、縦型、第二provider通信は行わない。

## 8. 完全性チェック

| 項目 | 判定 |
|---|---|
| 公式model・上限・structured output・thinking | 現物照合済み |
| Tier 1実endpoint受理 | HTTP 200で実測済み |
| 価格と期間 | 公式pricingで現物照合済み |
| actual値配線 | policy→job→countTokens/B6→raw modelVersionまでclosed |
| 意味入力・字幕本文 | 変更0 |
| ローカル受入強度 | 変更0 |
| API回数・費用 | B5最大2、B6一回、US$1.00 |
| stable成果物 | 不変 |
