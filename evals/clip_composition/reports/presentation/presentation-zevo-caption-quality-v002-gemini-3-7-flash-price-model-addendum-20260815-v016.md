# ZEVO字幕品質v002 Gemini 3.7 Flash・期間付き価格追補v016

## 1. 正本と目的

本書は、承認済みZEVO字幕品質v002のB5/B6初回実走に限り、送信modelとStandard価格を2026-08-15のGoogle公式現物へ一致させるforward-only追補である。字幕境界選択のschema、受入検査、raw先行保存、再試行0、支出上限US$1.00、P/R/Fの意味は変更しない。

3.6での実走実績は0件であり、本実走を3.7での初実走とする。

## 2. 実現性調査

### 2.1 現物入口

| 対象 | 実在path | 起草開始時SHA-256 | 実在処理 |
|---|---|---|---|
| 費用・公式値正本 | `evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs` | `29ac0e7e4d54400d8063bd35caab5272a64474b3c00a306d49b33aa0092db57b` | model、token上限、単価、公式値、事前・事後費用を検査する |
| B5/B6正式runner | `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs` | `633e486b824f4e8b588bf2c0b41988b15b7eed55e66c302eedda9c44805b3a55` | v1beta同期countTokens最大2回、generateContent一回、raw先行保存を実行する |
| B5/B6正式test | `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.test.mjs` | `5c6bfb55346baf2f07c08acc76d7d81244f8ec35a019ae6265f9e824238a6b64` | request byte、model、価格、usage、公開結果を実枝で検査する |

### 2.2 公式現物照合

版付き検証record `presentation-zevo-caption-quality-v002-gemini-3-7-flash-feature-verification-20260815-v001.json`の全項を現物照合済みとする。

- `gemini-3.7-flash`はGAで、入力上限1,048,576、出力上限65,536。
- structured outputsはSupported、thinkingはlow/medium/highをSupported。
- v1betaの同期`countTokens`と`generateContent`が公式例に実在する。
- 現行requestは`systemInstruction`、`contents`、`generationConfig`だけを持つ。`generationConfig`は`maxOutputTokens`、`thinkingConfig`、`responseMimeType`、`responseJsonSchema`だけで、`candidate_count`、`candidateCount`、`temperature`、`top_p`、`topP`、`top_k`、`topK`は0件。
- service tier fieldを送らずPaid Standard defaultを使う現行方式は変更しない。

### 2.3 価格現物

Google公式pricing snapshotは、Standard paid tierについて次を示す。

- 入力: US$0.75 / 1M token、2026-12-31まで。
- 出力: US$3.75 / 1M token、thinking tokenを含む、2026-12-31まで。
- 2027-01-01以降: 入力US$1.50 / 1M、出力US$7.50 / 1M。

## 3. model契約

B5/B6の送信model IDを`gemini-3.7-flash`、resourceを`models/gemini-3.7-flash`へ改訂する。endpointはGemini Developer API `v1beta`同期、methodは`countTokens`と`generateContent`のままとする。

providerの`modelVersion`はraw responseを正式保存した後に読み、正式jobの検証済みmodel IDとexact一致した場合だけ受理する。返却値を事前に別文字列として捏造しない。初回実応答が不一致ならrawを保持して不受理停止し、修復・別名許容・fallbackを行わない。合格時は実返却値そのものを正式provider envelopeへ保存する。

## 4. 版付きprice snapshot

B5 official verificationの内側に次のexact objectを一件持つ。

| field | exact value |
|---|---|
| `schemaVersion` | `presentation-caption-api-price-snapshot-v001` |
| `modelId` | `gemini-3.7-flash` |
| `tier` | `Standard` |
| `inputPriceNanoUsdPerToken` | `750` |
| `outputPriceNanoUsdPerToken` | `3750` |
| `outputIncludesThinkingTokens` | `true` |
| `effectiveThrough` | `2026-12-31` |
| `successorEffectiveFrom` | `2027-01-01` |
| `successorInputPriceNanoUsdPerToken` | `1500` |
| `successorOutputPriceNanoUsdPerToken` | `7500` |
| `sourceUrl` | `https://ai.google.dev/gemini-api/docs/pricing` |
| `observedAt` | pricing snapshotの取得日時 |

価格計算はこのobjectの導入価格だけを参照する。B5実行時のUTC calendar dateが`2026-12-31`以下であることを通信前に検査し、`2027-01-01`以降は後続価格へ黙って切替えず停止する。後続価格は記録事実であり、本実走の計算へ使わない。

## 5. request不変条件

1. `systemInstruction + contents`を維持する。
2. `responseMimeType=application/json`と`responseJsonSchema`を維持する。
3. `thinkingLevel=medium`を維持する。
4. service tier fieldを送らない。
5. 3.xで不許可のcandidate countおよびdeprecated sampling fieldを送らない。
6. providerへcaption本文、boundary ID、style上限、taskDescription以外の文脈を増やさない。

## 6. 変更pathとbinding

既存production 2 pathと既存test 1 pathだけを変更する。新production pathは0件で、既存19 production path集合を維持する。

| path | 変更 |
|---|---|
| `evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs` | 既存V001を変えず、3.7・期間付き価格を所有するV002 policy/validatorを共通検査器から公開 |
| `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs` | B5/B6をV002 policy、3.7 model、price snapshot、期間検査へ接続 |
| `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.test.mjs` | 3.7 request、禁止field 0件、期間内合格・期間外停止、価格・modelVersion実応答検査へ改訂 |

本書をB5/B6 formal jobだけへapproved contract bindingとして追加する。件数はB5 14→15、B6 15→16。source、selection、proofの契約件数は変えない。implementation bindingはB5 11、B6 19で増減0。違反code 49、正式検査ID 46、既存proof会計523は増減0で、既存証明の値だけをforward-only置換する。

## 7. 実行順と停止

1. 本書SHAと裁定をDECISIONSへ記録する。
2. 関連検査を新attemptで実行し、TAPを版付き保存する。
3. 正式B5 jobを発行し、countTokens最大2回を実行する。
4. 導入価格による事前費用投影がUS$1.00以下の場合だけB6 jobを発行する。
5. generateContentを一回・再試行0で実行し、rawを解析前に保存する。
6. provider envelope・usage・modelVersion・selection受入を検査する。
7. 全合格時だけP/R/Fを経て横型3本を描画し、QCと確認ページを作る。

機能差、期間外、費用超過、API失敗、abstained、回答不受理、既知6境界の再選択、描画/QC不合格のいずれか一件で、同attempt修正0件・再試行0のまま証拠保存して停止する。commit、stable tag、縦型描画、第二provider通信は行わない。

## 8. 完全性チェック

| 項目 | 判定 |
|---|---|
| 現物入口・export実在 | closed |
| 公式model/機能/価格 | closed |
| request exact shape | closed |
| modelVersionの実値取得 | raw先行保存後に観測。事前捏造0 |
| 期間外分岐 | closed。後続価格へのsilent switch 0 |
| 支出上限 | US$1.00不変 |
| API回数 | B5最大2、B6一回、retry 0 |
| 既存成果物・stable tag | 不変 |

