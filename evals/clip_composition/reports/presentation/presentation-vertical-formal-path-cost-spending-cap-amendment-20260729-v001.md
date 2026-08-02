# 縦型正式経路 領域5「承認済み支出上限」改訂追補 v001

状態: **差分提示・kawafmm承認待ち**

作成日: 2026-07-29

親設計:
`presentation-vertical-formal-path-contract-design-20260729-v001.md`

親設計SHA-256:
`db62f752ce19c5a727de9890898885a4e1a68b65ed500da5842de34b12cd6e69`

今回の実行:
設計差分とDECISIONS記録だけ。実装、API通信、preset正式登録、描画は0件。

## 適用規則

親設計の領域1〜4は変更しない。領域5の§9・§10・§11・§15だけを本追補で改訂する。

親設計の冒頭要約にある領域5の旧停止説明は、本追補を正として読む。§3は本追補9.4で名指しする領域5のfield・数値pathだけを機械置換する。§14は「外部API保証境界」と「人間負荷」の2行だけを本追補へ読み替える。§17は本追補9.5で示す旧停止1項目だけを置き換える。具体的には、旧「3 claimを公式確認できなければ通信前停止」「保証」「最低4判断」、名指しした旧field・旧数値pathを失効させる。それ以外の領域1〜4、40ファイル上限、90検査、34違反code、横型回帰、§17の停止条件と同一点2停止規則は不変である。

## §9の差分

### 9.1 US$0.50の意味

US$0.50（500,000,000 nanoUSD）は、Google公式文書だけで証明された請求上限ではない。**kawafmmが、残余リスクを理解したうえで今回の1回実行に認めた支出上限**である。

次の6 claimは、実行日の公式snapshotで`verified`でなければ送信しない。

```text
model-exists
input-limit
output-limit
standard-input-price
standard-output-price
service-tier-omission-standard
```

次の3 claimは、verdict・snapshot・evidenceの検査を維持するが、`unverified / contradicted`でも正しい受容記録があれば送信できる。

```text
count-tokens-unbilled
count-tokens-upper-bounds-prompt-billing
max-output-upper-bounds-candidate-plus-thinking
```

これは次の3点を保証しない。

- 2回の`countTokens`が無課金であること。
- `countTokens`値が生成時の課金prompt tokenの上界であること。
- `maxOutputTokens`がcandidateとthinkingを合計した課金tokenの上界であること。

独自係数、期待thinking量、過去実績による補正は使わない。

### 9.2 受容記録

B5 job、B5 ready manifest、B6 manifestは、次の`residualRiskAcceptance` exact objectを1件ずつ持つ。B5 jobとB5 manifestでは`officialVerification`直後、B6 manifestでは`response`直後に置く。3件はkey順・値ともbyte同一でなければならない。

```text
schemaVersion
acceptanceId
acceptedBy
acceptedOn
maximumNanoUsd
officialClaimsCanonicalSha256
claimBindings
sendPermission
```

固定値は次のとおり。

```text
schemaVersion =
  presentation-caption-api-residual-risk-acceptance-v001
acceptanceId =
  kawafmm-vertical-caption-cost-risk-acceptance-20260729-v001
acceptedBy = kawafmm
acceptedOn = 2026-07-29
maximumNanoUsd = 500000000
sendPermission =
  allow-one-generate-content-after-official-facts-and-bigint-cap-pass
```

`officialClaimsCanonicalSha256`は、B5 jobとB5 ready manifestでは同じ成果物の`officialVerification.claims`固定9件を既存canonical JSON処理へ通したUTF-8 byteのSHA-256である。B6では、`spendingAuthorization.b5ManifestBinding`が束縛するB5 ready manifestのclaimsを唯一の正本とし、その値をbyte同一で写す。

`claimBindings[]`は`claimId / acceptedVerdict`のexact 2 keyを持ち、残余リスク3 claimを上記の固定順で1回ずつ持つ。B5 jobとB5 ready manifestでは、各`acceptedVerdict`を同じ成果物の`officialVerification.claims[]`にある実行日verdictと一致させる。B6 manifestでは、上記B5 ready manifestを正本としてobjectをbyte同一で写す。受容記録を成立させるためにverdictを改変せず、実行日の実値`verified / unverified / contradicted`をそのまま使う。

`residualRiskAcceptanceCanonicalSha256`は、このexact 8 key objectを既存canonical JSON処理へ通したUTF-8 byteのSHA-256である。B5 ready manifestとB6 manifestは、各々が持つ同じobject実体からこの値を導出し、byte同一にする。

これは「公式に安全が証明された」という記録ではない。kawafmmが2026-07-29に3つの未確認リスクを受容し、下記条件を満たす1回送信を許可した事実だけを表す。

### 9.3 送信前条件

親設計の公式snapshot 6件、`countTokens` 2回、request byte同一、候補数1、thinking `medium`、timeout 600秒、再試行0、raw先行保存、secret保存0は維持する。

`derivedMaxOutputTokens`と送信可否は次のBigInt式だけで求める。

```text
derivedMaxOutputTokens =
  min(
    65536,
    floor((500000000 - probeInputTokens * 1500) / 7500)
  )

finalInputTokens * 1500
  + derivedMaxOutputTokens * 7500
  <= 500000000
```

値関係は次に固定する。

```text
maxOutputTokens = derivedMaxOutputTokens
preSendEstimateNanoUsd =
  finalInputTokens * 1500
  + maxOutputTokens * 7500
```

B5の`spendingAuthorization.preSendEstimateNanoUsd`と`cost.preSendEstimateNanoUsd`はこの同じ値を持つ。

通信前の必須条件は次の全件である。

1. 必須6 claimが実行日snapshotで`verified`。
2. `residualRiskAcceptance`がexactで、9 claimのcanonical SHA、3 claim ID・verdict、上限、認定者、日付と一致。
3. `countTokens`がprobe/final各1回だけ成功し、request/raw/token束縛が合格。
4. 上記BigInt式が合格。
5. B5 fixed requestとB6送信byteが完全一致。
6. 自動再試行0、生成1回、secret保存0。

3つの残余risk claimが`unverified / contradicted`であること自体は停止理由にしない。`countTokens`の課金は未確認・受容済みであり、虚偽の0円値を記録せず、送信前算術にも加えない。

### 9.4 schema差分

後方互換処理は作らず、未実装の領域5 fieldを次へ非互換で改名する。

```text
budgetGuarantee -> spendingAuthorization
worstCaseNanoUsd -> preSendEstimateNanoUsd
preSendWorstCaseNanoUsd -> preSendEstimateNanoUsd
claimsBindingCanonicalSha256 -> officialClaimsCanonicalSha256
```

親設計§3の数値JSONPath表も、この置換後pathを指すものとして読む。`countTokensChargeNanoUsd`の2 pathは削除し、B5 job・B5 manifest・B6 manifestの`residualRiskAcceptance.maximumNanoUsd`を正整数pathへ加える。`estimateComparison`の3値はbooleanである。

top-level exact key数は次へ変わる。

| 成果物 | 親設計 | 改訂後 |
|---|---:|---:|
| B5 job | 8 | 9 |
| B5 ready manifest | 17 | 18 |
| B6 manifest | 16 | 17 |

B5の`spendingAuthorization`は次のexact 10 keyである。

```text
currency
maximumNanoUsd
inputPriceNanoUsdPerToken
outputPriceNanoUsdPerToken
finalInputTokens
maxOutputTokens
preSendEstimateNanoUsd
officialClaimsCanonicalSha256
residualRiskAcceptanceCanonicalSha256
status
```

`status = approved-for-single-send`だけを許す。B5 `cost`は次のexact 6 keyとする。

```text
currency
maximumNanoUsd
inputPriceNanoUsdPerToken
outputPriceNanoUsdPerToken
preSendEstimateNanoUsd
actualBillingObservation
```

`actualBillingObservation`は次のliteralだけを許す。

```text
count_tokens_billing_unverified_risk_accepted_generate_not_called
```

B5 measurement stop reportの`tokenObservation.worstCaseNanoUsd`も`preSendEstimateNanoUsd`へ改名する。ready manifest、2種類のB5 stop report、B6 manifest、B6 stop reportの排他公開、commit point、raw保持規則は変えない。

B6の`spendingAuthorization`は次のexact 16 keyである。

```text
b5ManifestBinding
officialClaimsCanonicalSha256
residualRiskAcceptanceCanonicalSha256
finalRequestBinding
finalInputTokens
maxOutputTokens
maximumNanoUsd
preSendEstimateNanoUsd
preSendStatus
observedPromptTokens
observedCandidateTokens
observedThinkingTokens
observedTotalTokens
observedUsageCostNanoUsd
estimateComparison
postSendStatus
```

`estimateComparison`は次のexact 3 booleanを持つ。

```text
promptTokensExceededFinalInputTokens
outputTokensExceededDerivedMaxOutputTokens
usageCostExceededPreSendEstimate
```

各値は次の式だけで導出する。

```text
promptTokensExceededFinalInputTokens =
  observedPromptTokens > finalInputTokens
outputTokensExceededDerivedMaxOutputTokens =
  observedCandidateTokens + observedThinkingTokens > maxOutputTokens
usageCostExceededPreSendEstimate =
  observedUsageCostNanoUsd > preSendEstimateNanoUsd
```

3値のどれかが`true`でも、事後換算が上限内なら事実を記録してB1へ進める。実測後に事前値を変更しない。

B5の公式確認stop report（exact 11 key）、B5 measurement stop report（exact 12 key）、B6 stop report（exact 13 key）へ、存在しない受容objectを補完しない。受容記録の欠落・不正は既存`violations[]`へcode 23〜25を記録する。B5 job側の受容不正は固定path `b5-cost-verification-stop-report-v001.json`、`stage = official-verification`、API 0回へ一意に帰属する。B6での再照合不正は固定path `b6-stop-report-v001.json`、`stage = pre-send`、`generateContentCalls = 0`へ一意に帰属する。B6 stop reportの`pre-send`許可codeへ22〜25を加え、その他のstage別code集合は変えない。

B5の公式確認stop reportでは、必須6 claimの不成立時は親設計どおり`sourceBinding = passed`、`officialEvidence = failed`、残る8 checkを`blocked`、code 22とする。受容記録だけの不成立時は、exact 10 keyを次へ固定し、該当するcode 23〜25を記録する。どちらもAPI呼出しは0回である。

```text
sourceBinding = passed
officialEvidence = passed
requestConstruction = blocked
candidateCount = blocked
tokenProbe = blocked
finalRequest = blocked
budget = failed
transport = blocked
secret = blocked
artifacts = blocked
```

### 9.5 事後検査

生応答を解析前に保存し、usageから次だけをBigIntで計算する。

```text
promptCostNanoUsd = promptTokenCount * 1500n
outputCostNanoUsd =
  (candidatesTokenCount + thoughtsTokenCount) * 7500n
observedUsageCostNanoUsd =
  promptCostNanoUsd + outputCostNanoUsd
```

`observedUsageCostNanoUsd <= 500000000`なら費用検査は合格する。超過時はrawとmanifestへ事実を保存し、B1へ進めず停止する。これはusageへPaid Standard公式単価を掛けたlist-price換算値であり、Googleの請求書額を観測したとは書かない。

事前見積り超過は`estimateComparison`へ記録する。US$0.50以内ならこの差だけで停止しない。超過時の再送信・上限再調整は行わない。

領域5について親設計§17の旧停止1項目は、次へ置き換える。

```text
停止:
  必須6 claimをverifiedにできない
  residualRiskAcceptanceが欠落・不一致
  countTokensまたはrequest束縛が不成立
  BigInt送信条件が上限超過
  事後usage換算が上限超過
```

## §10の差分

違反code総数34と固定順は変えない。順23〜25の名前と意味だけを次へ置き換える。

| 順 | 改訂後code | 所有する意味 |
|---:|---|---|
| 23 | `API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID` | `count-tokens-unbilled`の受容記録が欠落、外形・共通認定値が不正、またはverdict・段間bindingと不一致 |
| 24 | `API_PROMPT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID` | `count-tokens-upper-bounds-prompt-billing`の受容記録が欠落、またはverdict・段間bindingと不一致 |
| 25 | `API_OUTPUT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID` | `max-output-upper-bounds-candidate-plus-thinking`の受容記録が欠落、またはverdict・段間bindingと不一致 |

受容object全体の欠落・共通field不正は、固定順が最初のcode 23が所有する。順21は価格・token・`spendingAuthorization`の外形とSHA、順22は必須6 claimの公式確認不能、順27は送信前式の上限超過、順30はusage外形・算術不正、順33は事後上限超過を所有する。順30は事前値との大小逆転を違反として所有しない。

## §11の差分

検査総数90、検査ID、34 codeの所有順は変えない。該当検査の意味だけを次へ置き換える。

| ID | 改訂後に検査する事実 |
|---|---|
| C01 | 必須6 claimが実行日snapshotで`verified`でなければ通信前停止 |
| C02 | countTokens課金claimが`unverified/contradicted`でも正しい受容記録なら通し、欠落・改変・段間不一致をcode 23へ帰属 |
| C03 | prompt上界claimが`unverified/contradicted`でも正しい受容記録なら通し、欠落・改変・段間不一致をcode 24へ帰属 |
| C04 | output+thinking上界claimが`unverified/contradicted`でも正しい受容記録なら通し、欠落・改変・段間不一致をcode 25へ帰属 |
| C05 | `officialVerification / residualRiskAcceptance / spendingAuthorization`のexact schema、canonical SHA、B5 job→B5 manifest→B6 manifest写像を検査 |
| C07 | 送信前BigInt式が500,000,000 nanoUSDちょうどなら合格し、1 nanoUSD超過なら拒否 |
| C08 | 入力費用だけで上限以上、またはfinal式超過ならgenerateContent 0回で停止 |
| C15 | 事前値との大小を3 booleanへ正しく記録し、事後上限内なら大小逆転だけでB1を止めない |
| C17 | 事後usage換算が500,000,000 nanoUSDを超えた場合だけcode 33でB1前停止 |
| C20 | 9 claimの語彙・順序・verdict・snapshot/evidence束縛と、3 claimの受容ID・verdict・認定者・日付・段間byte同一を検査 |

C06、C09〜C14、C16、C18〜C23、領域1〜4、横型回帰の検査内容は変えない。export code集合と実測発火集合の34/34完全一致、90検査の一件表を維持する。

## §15の差分

旧「3保証の停止を解く将来契約」1判断を削除する。B4物理違反が無い場合、この追補提示から縦型完成までの必須人間作業は次の3判断である。

| 段階 | 人間作業 | 目安 |
|---|---:|---:|
| 本追補の承認 | 1判断 | 1〜2分 |
| 承認後の40ファイル実装・90検査・横型回帰・preset正式登録 | 0件 | 0分 |
| 実装完了後、正式job・API・描画へ進む承認 | 1判断 | 1〜2分 |
| B5 token計測・費用計算・Gemini回答の数え上げ | 0件 | 0分 |
| 完成51.6秒MP4の最終目視 | 1判断 | 再生込み1〜2分 |

B4物理違反時の局所再選択は、親設計どおり条件付きの別判断である。

本追補の承認後は、親設計の停止条件を維持したまま、40ファイル実装、90検査、横型回帰、`speaker_only` preset正式登録、完了報告まで進めて停止する。B5 `countTokens`、B6生成、正式縦型MP4は実装完了後の別承認である。
