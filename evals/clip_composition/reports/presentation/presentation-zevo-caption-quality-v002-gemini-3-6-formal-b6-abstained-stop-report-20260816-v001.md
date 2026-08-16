# ZEVO字幕品質v002 Gemini 3.6正式B6 abstained停止報告 v001

## 1. 結論

Gemini 3.6 Flashへの正式回帰は、API互換性と安全性遮断の回避までは成立したが、provider回答が`{"status": "abstained"}`だったため、承認済み停止条件に従って停止した。

- B5 `countTokens`: 2回とも10,282 tokenで一致し、合格。
- 送信前最悪投影: US$0.2534715。上限US$1.00内。
- B6 `generateContent`: 1回、再試行0、HTTP 200。
- 実返却model: `gemini-3.6-flash`。
- safety block: なし。
- candidate: 1件、`STOP`、意味本文は`{"status": "abstained"}`。
- B6実測費用: US$0.021489。
- selection受入、既知6境界の非再選択検査、P/R/F、横型3本描画、QC、確認ページ: 0件。

3.7で発生した`PROHIBITED_CONTENT`は3.6では再現しなかった。一方、3.6は判断を完了せず棄権した。したがって、モデル回帰でAPI輸送問題は解消したが、字幕境界選択という目的は未達である。

## 2. 実行した工程

| 工程 | 結果 | 通信 | 意味 |
| --- | --- | ---: | --- |
| 3.7分離probe A | HTTP 200 | 1回 | Tier 1＋最大出力16では遮断なし |
| 3.7分離probe B | HTTP 200 | 1回 | Tier 3＋最大出力65,536でも遮断なし |
| 3.6 Tier 1互換probe | HTTP 200 | 1回 | 3.6がTier 1、structured output、medium thinkingを受理 |
| 3.6正式B5 | 合格 | countTokens 2回 | 入力tokenと費用上限を正式計測 |
| 3.6正式B6 | 輸送合格・回答棄権 | generateContent 1回 | 安全性遮断なし、候補選択は未成立 |

正式B6の回数規律は、送信1回・再試行0で満たした。raw responseは解析前に保存され、鍵の値は成果物・標準出力・標準エラーへ保存していない。

## 3. token・費用

### 3.6正式B5

- 入力: 10,282 token。
- 最大出力: 65,536 token。
- Standard導入価格: 入力US$0.75/1M、出力US$3.75/1M（thinking tokenを含む）。
- 送信前最悪投影: 253,471,500 nanoUSD = US$0.2534715。
- `countTokens`実行自体の課金: US$0。

### 3.6正式B6

- prompt: 10,282 token。
- candidate: 7 token。
- thinking: 3,667 token。
- total: 13,956 token。
- 入力費用: 7,711,500 nanoUSD。
- 出力費用: 13,777,500 nanoUSD。
- 合計: 21,489,000 nanoUSD = US$0.021489。

今回の裁定以後に実行した3.7分離probe、3.6互換probe、3.6正式B6の合計はUS$0.044259。保存済み先行API実測を含む字幕品質API検証累計はUS$0.08396625である。いずれも承認上限内。

## 4. 正式証拠

### B5

- job: `evals/clip_composition/jobs/presentation/output-caption-cue-b5-jobs/a-v002-caption-quality-first-api-b5-20260816-v004.json`
  - SHA-256: `14a3ff397a4739fdd32ddc169bd07bf78c6c0a56beeea59e770f15a415370b07`
- manifest: `evals/clip_composition/outputs/presentation/output-caption-cue-b5-attempts/a-v002-caption-quality-first-api-b5-20260816-v004/attempt-0001/b5-manifest.json`
  - SHA-256: `361ad5573f97d1dd5d90983204fe80c803b1ce3293b763955dc9758f5c4eb8ea`
- 実行記録: `evals/clip_composition/reports/presentation/test-runs/20260816-zevo-caption-quality-v002-gemini-3-6-b5-formal-attempt-0001/`
  - stdout SHA-256: `d4db190db48056e16e3ff457d9cbaf52cfc69e2e2b021950621b7576aa8df63f`
  - stderr: 0 byte。
  - 終了code: 0。

### B6

- job: `evals/clip_composition/jobs/presentation/output-caption-cue-b6-jobs/a-v002-caption-quality-first-api-b6-20260816-v004.json`
  - SHA-256: `595d43b53942ed2376c73cbe13d73ad740b40d27fbdf616a91e4141890bae030`
- Tier 1 request: `evals/clip_composition/outputs/presentation/output-caption-cue-b6-request-inputs/a-v002-caption-quality-first-api-b6-20260816-v004/attempt-0001/generate-content-request.json`
  - SHA-256: `3953d03a8f34cb715295dc9e1cdc87ace1272cda1e07f95c174449cc36338fc7`
- raw response: `evals/clip_composition/outputs/presentation/output-caption-cue-b6-attempts/a-v002-caption-quality-first-api-b6-20260816-v004/attempt-0001/generate-content-response.raw.json`
  - SHA-256: `57b6610e78545f15e6d3ca9f593af7939af6aa296941c161f7834fefb725a8db`
- provider envelope: `evals/clip_composition/outputs/presentation/output-caption-cue-b6-attempts/a-v002-caption-quality-first-api-b6-20260816-v004/attempt-0001/provider-response-envelope.json`
  - SHA-256: `b8eecaaa24dd0bde6526b30dc359756ac24b3ee8f8ba8ef26fd840695bb6f90c`
- B6 manifest: `evals/clip_composition/outputs/presentation/output-caption-cue-b6-attempts/a-v002-caption-quality-first-api-b6-20260816-v004/attempt-0001/b6-manifest.json`
  - SHA-256: `173801b7c85153939bae92d7c4da9d729fe11202c44e28d6f90b97338e534c7c`
- 実行記録: `evals/clip_composition/reports/presentation/test-runs/20260816-zevo-caption-quality-v002-gemini-3-6-b6-formal-attempt-0001/`
  - stdout SHA-256: `c7f81cfb432064802602f3db03f1a6f07455d19faab6f6e475ec9034db615edb`
  - preflight SHA-256: `10aa510408df9fce229bb0ecb018a2a72be20068054b1b3a190733b920dd9087`
  - stderr: 0 byte。
  - 終了code: 0。

## 5. 事前job拒否の記録

最初に発行したB5 v003 jobは、API通信前の正式decoderで、公式資料URL表記と工程別契約binding順の不一致により拒否された。無効jobとDECISIONS承認行は失敗証拠として保持し、API通信0回のままv004へ訂正した。この訂正はprompt、字幕本文、253境界、価格、model、支出上限を変更していない。

## 6. 三分法

- production・契約: API輸送、model照合、usage、費用、secret不保存、raw先行保存は正常に成立。
- fixture・実行設営: 正式3 caption・253 boundary、Tier 1 schema、固定Node・固定TSX・未使用rootで成立。
- provider結果: `abstained`。これは契約が許容する明示的な棄権結果であり、実装欠陥ではないが、目的である境界選択は未成立。

帰属は「providerが判断を完了しなかった正式観測」。入力やschemaを同attemptで変更して再送する根拠にはしない。

## 7. 人間確認対象

providerへ渡した3字幕本文と253境界の正本は、次のsource packageにある。

`evals/clip_composition/outputs/presentation/output-caption-cue-source-packages/a-v002-caption-quality-first-api-source-20260815-v001/source-package-v001.json`

次の判断は、同じ入力のまま第二provider評価を前倒しするか、棄権を招いた可能性がある指示・schemaの設計を別工事として診断するかである。今回はどちらも実施しない。
