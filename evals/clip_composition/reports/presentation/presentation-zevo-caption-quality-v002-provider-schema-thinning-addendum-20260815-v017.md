# ZEVO字幕品質v002 provider schema薄化追補v017

## 1. 実現性調査

### 1.1 現物入口

| 対象 | 現物 | 調査結果 |
|---|---|---|
| provider schema製造 | `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs`のresponse schema製造入口 | 現行は二状態、3 caption、最大101 cue、最大2行、253 boundary ID、全階層の閉objectとproperty orderを重複してproviderへ渡す |
| ローカル受入 | `evals/clip_composition/presentation_output_caption_cue_selection_v001.mjs`のprovider回答復号・caption集合・境界・順序・source閉包・幅・物理配置・timeline検査 | provider schemaから除去する制約の実判定ownerが全件実在する |
| B5正式成果物 | `a-v002-caption-quality-first-api-b5-20260815-v002/attempt-0001` | 3 caption・253 boundary、prompt、system instruction、最大出力、費用投影を正式保存済み。既存byteは変更しない |
| B6正式入口 | 同B5/B6 runnerの一回送信入口 | B5成果物の再読後にrequest byteをexact照合し、raw先行保存・再試行0で送信する実枝がある |
| Tier受理実測 | `presentation-zevo-caption-quality-v002-gemini-3-7-schema-tier-probes-20260815-v001` | Tier 1が最初の一回でGemini 3.7実endpointからHTTP 200を得た |

現物照合の結論はclosedである。provider向け重複制約を外しても、回答の受入を所有するローカル検査は失われない。

### 1.2 B5とB6の配線

保存済みB5 requestは、当時の正式schemaとcountTokens結果を持つ不変証拠として保持する。v017の正式B6 jobは、同じB5 manifestを費用・prompt・来歴の正本として束縛しつつ、providerへ送るrequestだけをTier 1 schemaへ再符号化した新版byteへ束縛する。

B6は送信前に次を一度ずつ再読・照合する。

1. 保存済みB5 requestが旧正式schemaを含む当時の正式byteであること。
2. 新B6 requestの`systemInstruction`、`contents`、最大出力、thinking、MIMEが保存済みB5 requestとbyte同一であること。
3. 新B6 requestのschemaが本書の採用Tier exact値と一致すること。
4. 新B6 request全体が、検証済みsource packageから同じpure builderで再構築したbyteと一致すること。

旧requestをfallback送信する分岐、新旧schemaのunion、送信時のその場修復は作らない。v017 B6はTier 1だけを送るforward-only経路である。

## 2. 三段schemaと実測

三段を同じ3 caption・253 boundaryから決定的に作り、合成最小入力、最大出力16 token、raw先行保存、再試行0でTier 1から実測した。

| Tier | 保持 | 除去 | 結果 |
|---:|---|---|---|
| 1 | object/array/property名/type/required、二状態のstatus const、caption ID、253 boundary IDの二つのenum | 全min/max、深い階層の`additionalProperties:false`、全`propertyOrdering` | HTTP 200、採用 |
| 2 | Tier 1の構造とcaption ID | Tier 1除去分に加えboundary ID enum | Tier 1が200のため未送信 |
| 3 | 二状態statusと最上位captions array | 内側caption/cue/line構造と重複制約 | Tier 1が200のため未送信 |

probe費用はUS$0.00005325、上限US$0.10内である。

## 3. 採用Tierのexact schema

採用schemaは次の版付きbyteで固定する。

| 項目 | exact値 |
|---|---|
| schema source | `evals/clip_composition/reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-gemini-3-7-schema-tier-probes-20260815-v001/tier-01-structure-and-boundary-enums/request.json`の`/generationConfig/responseJsonSchema` |
| source request file SHA-256 | `610b8e1fe68de436ee2da9702da35739437ae34e677f38ee7b844abe14db4713` |
| schema canonical SHA-256 | `5a8239a32c9e27cf698b1a39d4bf674a87b6bdf2f0ce731331267f9d9fb200c0` |
| 2-space・末尾LF schema byte SHA-256 | `c3c8c97a85dd3d3d35d7fbcf5b46f56f494774a4e66b7892d722f3761fd7f71e` |
| schema byte長 | 31,639 byte |
| caption ID | source package由来3件、昇順、enum保持 |
| boundary ID | source package由来253件、昇順、cue終端と行末の双方でenum保持 |
| root | `anyOf`二branch |
| status | `const: abstained` / `const: complete` |

builderはsource packageからID集合を取得し、このexact構造だけを作る。ID値の埋込みはsource package由来であり、推測・独自生成を行わない。

## 4. 除去制約とローカルowner

| provider schemaから除去する制約 | 不変の契約値 | ローカルの実判定 | 拒否owner |
|---|---|---|---|
| captions `minItems=1` | completeはcaptionを持つ | 空配列をshape検査で拒否 | `CUE_PROVIDER_RESPONSE_INVALID` |
| captions `maxItems=3` | 本入力はexact 3 caption | source promptと件数・ID・順序・一意性を照合 | `CUE_CAPTION_SET_MISMATCH` |
| cues `minItems=1` | 各captionは1 cue以上 | 空配列をshape検査で拒否 | `CUE_PROVIDER_RESPONSE_INVALID` |
| cues `maxItems=101` | 各cue終端は101以下の境界を単調増加し最終境界で閉じる | 境界解決、単調増加、最終境界一致 | `CUE_BOUNDARY_ID_INVALID` / `CUE_ORDER_INVALID` |
| 行末 `minItems=1/maxItems=2` | 1〜2行 | shapeで件数、後段で境界と順序を照合 | `CUE_PROVIDER_RESPONSE_INVALID` / `CUE_LINE_END_INVALID` |
| caption/cue内側の`additionalProperties:false` | exact key集合 | 各objectのkey数・順序をexact照合 | `CUE_PROVIDER_RESPONSE_INVALID` |
| 全`propertyOrdering` | status、captions、captionId、cues、cueEnd、lineEndの正式順 | JSON復号後のobject key列をexact順で照合 | `CUE_PROVIDER_RESPONSE_INVALID` |

boundary ID enumはTier 1に残る。それとは独立して、ローカルも253件集合への所属を検査し、未知IDを`CUE_BOUNDARY_ID_INVALID`で拒否する。

この表の各ownerは既存production実体であり、selection validatorを変更しない。providerが薄いschemaの許容範囲を使って契約外回答を返した場合はrejectedとなり、silent受理・暗黙正規化・修復・fallbackは存在しない。

## 5. 不変byteと契約値

正式B6送信requestについて、保存済みB5 requestとの次の一致を必須とする。

| 対象 | SHA-256 / exact値 |
|---|---|
| system instruction JSON value | `c2951c0d86906fab29c4cfddd79d00528b859a48464e09168d9477993f23c648` |
| contents JSON value | `f98754990cb300f141e9f4f5e1f5e2d10ab1d6290939d607cb51c21caaecf6a7` |
| taskを含むuser text | `ea30d8af962d185adcc49641f6c3e17c04a58c9aec3e54c21e30ce7cd0e9e82b` |
| thinking | `medium` |
| response MIME | `application/json` |
| 最大出力 | 65,536 token |
| 意味契約値 | caption最大3、cue最大101、行末最大2、二状態、boundary ID全量253 |

schemaの薄化はprovider生成誘導だけを変える。prompt本文、system instruction、task、source package、ローカルselection validator、P/R/Fは変更しない。

## 6. 費用境界

保存済みB5の入力10,282 token・最大出力65,536 token・送信前最大US$0.2534715を支出認可の上限投影として維持する。v017 requestは意味入力を増やさず、旧schemaから重複制約を削除したものだけを送る。正式B6後はprovider usageをrawから取得し、実課金を現行Standard snapshotで計算する。実測がUS$1.00を超える場合は受理しない。

## 7. bindingと変更path

本書をB6 formal jobだけへapproved contract bindingとして追加する。

- source: 14件不変。
- B5: 15件不変。
- B6: 16件から17件。
- selection / proof: 不変。

変更する既存pathは二つである。

1. `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs`: Tier 1 pure builder、B6 requestの新旧分離再読、v017 binding。
2. `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.test.mjs`: Tier exact byte、削除制約のlocal owner、prompt不変、B6 17件、旧request不送信を検査。

新production path、schema version、違反code、検査ID、ローカル受入predicateは増減0である。

## 8. 実行順と停止

1. 本書SHAと承認裁定をDECISIONSへ記録する。
2. 関連検査でTier exact・local owner・B6配線を実発火する。
3. 新しい版付きB6 jobと未使用output rootを発行する。
4. generateContentを一回・再試行0で実行し、rawを解析前に保存する。
5. provider envelopeとローカルselection受入を実行する。
6. 全合格時だけP/R/Fで横型3本を正式描画し、QC・確認ページを作る。

正式B6が再度HTTP 400、abstained、受入不合格、既知6境界再選択、描画/QC不合格の一件で同attempt修正0件のまま停止する。400の場合はGemini 3.6 Flashへのmodel回帰を、2026-07の複雑schema受理実績とともに次の人間選択肢として整理する。secret、commit、stable tag、縦型、第二provider通信は範囲外である。

## 9. 完全性チェック

| 項目 | 判定 |
|---|---|
| 現物入口・consumer | closed |
| 採用Tier実endpoint受理 | HTTP 200実測済み |
| exact schema byte | path・JSON pointer・二種SHAで固定 |
| 除去制約のlocal owner | 全件closed |
| prompt/system/task不変 | 保存済みSHAと新requestを機械照合 |
| silent受理・修復・fallback | 0件 |
| B6回数・費用 | 一回・再試行0・上限US$1.00 |
| 既存成果物・stable tag | 不変 |
