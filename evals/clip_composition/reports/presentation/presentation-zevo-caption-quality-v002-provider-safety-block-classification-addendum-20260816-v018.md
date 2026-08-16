# ZEVO字幕品質v002 provider安全性遮断分類追補v018

## 1. 実現性調査

### 1.1 現物入口

| 対象 | 現物照合 | 結論 |
|---|---|---|
| provider raw | v017正式B6 attempt-0001のrawにHTTP 200、`promptFeedback.blockReason=PROHIBITED_CONTENT`、candidate 0件、usage、model versionが実在する | safety遮断はHTTP・JSON・model不正とは別に判定可能 |
| provider観測入口 | `run_presentation_caption_gate_b6_v001.mjs`はrawを一回だけstrict JSON復号し、観測結果へprimary code・facts・usageを返す | 同じ一回復号の中でblockReasonとsafetyRatingsを取得できる |
| B6正式入口 | `run_presentation_output_caption_cue_b5_b6_v001.mjs`はraw先行保存後、観測結果をmanifestと成果物へ写す | 通信・raw保存・費用計算を変えず専用分類を追加できる |
| 成功consumer | selectionは`passed-transport`のB6 manifestとprovider envelopeだけを受理する | safety遮断成果物を追加しても成功経路schemaを変えずに分離できる |
| 費用正本 | 既存cost guardはprompt/candidate/thinking/totalの4整数からStandard list priceを計算する | candidate 0件の遮断では欠落candidate tokenを0として、rawの総数一致を確認した場合だけ既存正本を再利用できる |

調査結果はclosedである。新しい送信・safety閾値変更・prompt変更を分類実装へ混ぜず、保存済みrawも同じ規則で遡及分類できる。

### 1.2 実値配線

| 供給者 | 検証時点 | exact入力 | consumer | 転記先 |
|---|---|---|---|---|
| raw `promptFeedback.blockReason` | raw一回復号直後 | 非空文字列 | provider観測入口 | `primaryRejectionFacts.blockReason`、専用観測成果物 |
| raw `promptFeedback.safetyRatings` | raw一回復号直後 | JSON arrayまたは不存在 | provider観測入口 | `primaryRejectionFacts.safetyRatings`、専用観測成果物。不在は`null` |
| raw `usageMetadata` | block確定後 | prompt、total、thinking。candidate 0件時だけ欠落candidateを0へ明示 | 既存cost guard | 専用観測成果物とB6 manifest費用欄 |
| B5正式価格・上限 | B6送信前再読済み | 入力750 nanoUSD/token、出力3,750 nanoUSD/token、上限1,000,000,000 nanoUSD | 既存cost guard | 専用観測成果物とB6 manifest費用欄 |

blockReasonやsafetyRatingsをmessage、stack、HTTP本文から推測しない。値はrawの対応fieldだけから取得する。

## 2. 専用分類

provider観測入口へ次を追加する。

| 項目 | exact値 |
|---|---|
| provider内側code | `B6_V002_PROVIDER_SAFETY_BLOCKED` |
| B6所有code | `CUE_PROVIDER_SAFETY_BLOCKED` |
| B6 manifest status | `blocked-provider-safety` |
| CLI status | `rejected` |
| CLI stage | `provider-safety` |
| candidate | 0件。本文復号・selectionへ進めない |
| retry | 0 |

HTTP 200・JSON復号・model一致・usage正規化が成立し、`promptFeedback.blockReason`が非空の場合だけこの分類を使う。HTTP不正、JSON不正、model不一致、usage総数不整合をsafety遮断へ飲み込まない。

## 3. usageの遮断時正規化

candidate配列が不存在または0件で、rawに`candidatesTokenCount`が無い場合に限り0を補う。`thoughtsTokenCount`が無い場合は0を補う。次を全て満たさなければ専用分類ではなく既存usage不正とする。

1. prompt、candidate、thinking、totalが非負安全整数になる。
2. `total = prompt + candidate + thinking`がexactに成立する。
3. service tierは不存在または`standard`である。
4. model versionは正式jobのmodel IDと一致する。

これはprovider rawの課金内訳を4整数へ明示するだけで、暗黙修復ではない。candidateが存在する回答、総数が一致しない回答、任意の欠落usageへ一般化しない。

## 4. 正式観測成果物

遮断時だけ`provider-safety-block.json`をrawとmanifestと同じ正式rootへno-replace公開する。

### 4.1 exact schema

schema versionは`presentation-output-caption-cue-provider-safety-block-v001`とする。key順と意味は次で固定する。

1. `schemaVersion`
2. `observationId`: `<B6 job ID>-provider-safety-block`
3. `observedAt`: B6実行時刻
4. `b6JobBinding`
5. `rawResponseBinding`
6. `responseModelVersion`
7. `observedServiceTier`: `null`または`standard`
8. `blockReason`: rawのexact非空文字列
9. `safetyRatings`: rawのexact JSON array、または不在時`null`
10. `usageMetadata`: 正規化後の4整数
11. `usageListPriceEstimate`: 既存cost guardの入力費用・出力費用・合計・上限内判定・送信前投影超過判定

成果物全体を2-space・末尾LFで正式製造し、再読後のschema・byte・SHA一致を確認する。生message、stack、stderr、secret、推測理由を保存しない。

### 4.2 B6 manifest

既存`presentation-output-caption-cue-b6-manifest-v001`のkey集合は変えない。遮断時は次を固定する。

- status: `blocked-provider-safety`
- primary rejection code: `CUE_PROVIDER_SAFETY_BLOCKED`
- provider envelope binding: `null`
- HTTP、model、tier、usage、cost、raw-first、secret absence: passed
- candidate countとcandidate content: blocked
- billing observation: `provider-safety-usage-observed-standard-list-price`

専用成果物はmanifestと同じrootの固定basenameで所有し、job/raw bindingにより来歴を閉じる。selection consumerは`passed-transport`以外を従来どおり拒否する。

## 5. 保存済みattemptの遡及分類

v017正式B6 attempt-0001のraw、manifest、費用観測を不変保持する。v018実装後、保存済みrawを新観測入口へ読み取り適用し、別の版付きdiagnostic recordへ次を保存する。

- 旧分類: `CUE_PROVIDER_USAGE_INVALID`
- v018分類: `CUE_PROVIDER_SAFETY_BLOCKED`
- blockReason exact値
- safetyRatings exact値または`null`
- usageとlist price費用
- 元raw/manifest binding

旧成果物を上書きせず、forward-onlyの分類訂正として扱う。

## 6. probeと分岐

分類実装・回帰合格後、正式source package由来のpromptInputを本文変更なしで使う。Tier 3最小schema、最小maxOutputTokens、raw先行保存、再試行0で次の4回を上限とする。

1. caption 1件目のみ
2. caption 2件目のみ
3. caption 3件目のみ
4. 3件全量の対照

累計list price上限はUS$0.10。safetySettingsを送らず、閾値を変更しない。各probeはcaption ID、source package内の配列位置、request/raw binding、HTTP、blockReason、safetyRatings、usage、費用を版付き保存する。

- 対照が遮断されない場合は、新formal job・未使用rootでGemini 3.7正式B6を一回だけ再送できる。
- 特定captionで遮断が決定的に再現した場合は、そのcaption IDとsource package内位置を記録して停止する。
- 3 caption全ての単独probeが遮断された場合は、Tier採用schemaのGemini 3.6互換を一回確認後、Gemini 3.6正式B6を一回だけ送れる。3.6でも遮断なら停止する。

probe結果から字幕本文を削除・置換・書換えしない。

## 7. binding・会計・変更path

本書をB6 formal jobだけへapproved contract bindingとして追加する。

- source: 14件不変。
- B5: 15件不変。
- B6: 17件から18件。
- selection / proof: 不変。

変更する既存pathは二つである。

1. provider transport: safety遮断の一回復号・usage正規化・専用内側code。
2. B5/B6 runnerと同test: B6 owner code、専用成果物、manifest分類、費用、binding、実枝回帰。

provider transportの既存testに専用実枝を加える場合も新production pathは作らない。所有codeは49件から50件。既存検査ID数とproof総数は増減0とし、ZCQ016の既存結果別成果物証明内を置換して専用分類を実発火する。

## 8. 不変条件と停止

不変:

- promptInput byte、system instruction、task本文、字幕本文、boundary ID、Tier 1正式schema。
- ローカルselection validatorと既知6境界検査。
- safetySettings未指定、暗黙正規化・修復・fallback 0件。
- 正式B6は一attempt一回、再試行0、raw先行保存、secret不保存。
- 支出上限US$1.00。

probeまたは正式B6のAPI失敗、分類不能、費用超過、abstained、受入不合格、既知6境界再選択の一件で、同attempt修正0件のまま停止する。commit、stable tag、縦型、第二provider通信は範囲外である。

## 9. 完全性チェック

| 項目 | 判定 |
|---|---|
| raw→blockReason/safetyRatings | 現物照合済み |
| raw→usage→既存cost guard | 現物照合済み |
| 成功consumerへの波及 | status分離、成功schema不変 |
| first-class成果物 | exact schema・固定basename・job/raw binding |
| 旧attempt | 不変保持、別recordで遡及分類 |
| probe | 4回・US$0.10・本文変更0・raw先行保存 |
| safety回避 | settings変更0、本文変更0 |
