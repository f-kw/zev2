# ZEVO字幕品質v002 provider安全性遮断v018・正式再送 停止報告v001

## 1. 結論

provider向けTier 1 schemaのHTTP 400問題は解消済みである。v018は、provider安全性遮断をusage不正・envelope不正から分離し、正式成果物として保存する機械検証に合格した。

保存済み正式入力を1字幕ずつに分けた3 probeと3字幕全量の対照probeでは、4回全てHTTP 200、`blockReason`なしだった。裁定の非再現分岐に従い、元の3字幕・253境界を一切変更しないGemini 3.7正式B6新版を一回送信したが、正式requestでは再び`PROHIBITED_CONTENT`として遮断された。

特定字幕に遮断原因を帰属できない。3字幕全てが単独で遮断される分岐でもないため、Gemini 3.6回帰へは進まない。正式B6の再送枠を使い切り、selection、既知6境界照合、page/line plan、render plan、横型描画、QCは0件のまま停止する。

## 2. v018実装結果

### 2.1 契約と正式分類

| 項目 | 結果 |
|---|---|
| 追補 | provider安全性遮断分類追補v018 |
| 追補SHA-256 | `6fb15bcb5d6aaec098857d03f064c7ad8f2591ab85225b8f3cbfcc2e0ad989ae` |
| B6 approved contract | 17件から18件 |
| provider内側code | `B6_V002_PROVIDER_SAFETY_BLOCKED` |
| B6 code | `CUE_PROVIDER_SAFETY_BLOCKED` |
| manifest status | `blocked-provider-safety` |
| CLI stage | `provider-safety` |
| 専用成果物 | `provider-safety-block.json` |
| 新所有code | 1件、全体49件から50件 |
| prompt・selection validator | 変更0件 |

安全性遮断時は、rawを一回だけ復号し、blockReason exact値、safetyRatingsまたは`null`、usage、Standard list price費用を保存する。生message、stack、stderr、secret、推測理由は保存しない。

### 2.2 局所検査

| attempt | 結果 | 意味 |
|---|---:|---|
| attempt-0001 | 検査本体0件 | Codex制限環境がTSXの一時IPC socketを`EPERM`で拒否。stderrと終了codeを保持 |
| attempt-0002 | 11/11、proof 116/116 | ネイティブ環境で頭から実行。v018分類・専用成果物・費用・v018欠落拒否を実発火 |

正式TAP SHA-256は`42b325a06c8fba5cfa62b1f3a211f7f12c0e3c62f7ee97c6125f7d1378ba4590`、stderr 0 byte、終了code 0である。

## 3. 保存済みattemptの遡及分類

v017正式B6 attempt-0001のrawとmanifestは変更していない。別の版付きrecordへ読み取り適用した。

| 項目 | 旧記録 | v018分類 |
|---|---|---|
| status | `rejected-provider-response` | `blocked-provider-safety` |
| code | `CUE_PROVIDER_USAGE_INVALID` | `CUE_PROVIDER_SAFETY_BLOCKED` |
| blockReason | manifestでは未所有 | `PROHIBITED_CONTENT` |
| safetyRatings | manifestでは未所有 | `null` |
| usage | 未成立扱い | input 10,282 / candidate 0 / thinking 498 / total 10,780 |
| 費用 | 別観測 | US$0.009579000 |

遡及分類record SHA-256は`fec07c0cae498dd3adb7550d628bff339d4e1441fa48ca65a917275ca0eba792`である。

## 4. 4 probeの結果

Tier 3最小schema、最大出力16 token、raw先行保存、再試行0、safetySettingsなしで実行した。各単独probeはsource packageの該当caption objectを値変更せず一件だけ使用し、全量対照は3件を元順序のまま使用した。

| probe | source位置 | HTTP | blockReason | input token | output token | 費用 |
|---|---|---:|---|---:|---:|---:|
| caption 1 | `/promptInput/captions/0` | 200 | なし | 4,292 | 12 | US$0.003264000 |
| caption 2 | `/promptInput/captions/1` | 200 | なし | 3,164 | 13 | US$0.002421750 |
| caption 3 | `/promptInput/captions/2` | 200 | なし | 3,482 | 13 | US$0.002660250 |
| 3件全量対照 | `/promptInput/captions` | 200 | なし | 10,282 | 13 | US$0.007760250 |

probe 4回の合計はUS$0.016106250で、上限US$0.10内である。

初版summaryは、HTTP 200応答で`candidatesTokenCount`が省略されたためstrict provider観測がusageを`null`とし、費用0と誤記した。rawと初版summaryは上書きせず保持し、`totalTokenCount - promptTokenCount`を同一単価のoutput tokenとして読み取る訂正版を追加した。追加通信0回であり、訂正版SHA-256は`f0504e85e35ca500d38fe2e86eed495f98b004835f3cdff336ee4bc94426eb9d`である。

## 5. 正式B6新版の結果

### 5.1 起動前照合

| 項目 | 結果 |
|---|---|
| 固定Node | SHA一致 |
| 固定TSX loader絶対path | SHA一致 |
| `NODE_OPTIONS` | 不存在 |
| native | Darwin arm64 |
| job decoder / value validator | 合格 |
| implementation binding | 19/19一致 |
| approved contract | 18/18一致 |
| runtime data | 1/1一致 |
| request | 保存済みTier 1正式byteとSHA一致 |
| safetySettings | 0件 |
| output root | 実行前未使用 |
| send | 1回、再試行0、raw先行保存 |

### 5.2 provider観測

| 項目 | 実測 |
|---|---|
| HTTP | 200 |
| model | `gemini-3.7-flash` |
| service tier | `standard` |
| blockReason | `PROHIBITED_CONTENT` |
| safetyRatings | `null` |
| candidate | 0件 |
| usage | input 10,282 / candidate 0 / thinking 1,556 / total 11,838 |
| list price | US$0.013546500 |
| 上限 | US$1.00内 |
| manifest | `blocked-provider-safety / CUE_PROVIDER_SAFETY_BLOCKED` |
| CLI | `rejected / provider-safety` |

raw SHA-256は`8b8a60fae9ca6801d5bf91c9e7773d7d3685c847c6e4f304daaed5d3464b59c2`、専用安全性観測成果物SHA-256は`1ab34473e200c9dd260e7d887123df07afde7cace9804c55d1a08d26dd23cbbc`、manifest SHA-256は`4520bdd82b13b0733ee25a7eeb10a80c501ad61f93779dad4380603959ec4efd`である。

## 6. 費用・外部作用

| 範囲 | API回数 | 費用 |
|---|---:|---:|
| v018切り分けprobe | 4 | US$0.016106250 |
| v018正式B6新版 | 1 | US$0.013546500 |
| 本裁定の合計 | 5 | US$0.029652750 |
| 先行schema診断・旧正式B6を含む累計 | 既存記録+5 | US$0.039707250 |

countTokens追加0回、正式B6再試行0回、secret保存0件、safetySettings変更0件、promptInput変更0件、字幕本文変更0件である。commit、stable tag、縦型描画、第二provider通信は0件。

## 7. 三分法と停止理由

| 帰属 | 判定 |
|---|---|
| production | v018専用分類は正式検査と実APIで成立。欠陥なし |
| fixture・実行設営 | 単独3件・対照1件は全てHTTP 200。特定caption遮断を再現せず |
| provider/input相互作用 | 同じ3 caption全量でも、Tier 3対照は非遮断、Tier 1正式requestは遮断。providerが返した事実だけを記録し、差の理由は推測しない |
| 契約 | 特定字幕の除外・本文変更・追加正式再送・provider変更は未承認。停止 |

正式再送枠を一回使用した。回答candidateがないため、selection受入、page/line plan、render plan、横型3本、QC、確認ページは未実施である。

## 8. kawafmm確認依頼

source packageの`promptInput`にある3字幕本文を目視確認してほしい。特定字幕へ機械帰属はできていないため、本文の削除・除外・書換えはまだ行っていない。

対象: `evals/clip_composition/outputs/presentation/output-caption-cue-source-packages/a-v002-caption-quality-first-api-source-20260815-v001/source-package-v001.json`

次の判断は、入力を不変のまま別model/providerで測るか、素材変更を人間判断として行うかである。
