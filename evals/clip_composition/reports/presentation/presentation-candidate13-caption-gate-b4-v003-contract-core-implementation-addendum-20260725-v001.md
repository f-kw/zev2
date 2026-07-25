# candidate 13 基本テロップ B4 v003検査実体 実装契約追補v001

- 作成日: 2026-07-25
- 状態: **設計提示・人間承認待ち**
- 基準commit: `c2303fff`
- 承認済み正本:
  - `presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md`
  - `presentation-candidate13-caption-gate-b4-implementation-contract-addendum-20260725-v001.md`
- 停止記録:
  - `presentation-candidate13-caption-gate-b4-v003-contract-core-preflight-stop-20260725-v001.md`
- この文書で許可を求めるもの: v003字幕検査、v003指示書検査、共有するG1〜G3計算の実装契約
- この文書だけでは行わないもの: コード変更、testdata、合成85件、回帰95件、preflight、B5、B6、Gemini、正式pair、描画
- 人間作業: 本追補の承認または却下1件。動画視聴、時刻入力、時間計測はない

## 1. 目的

B4の正本は、表示計画から次のv003成果物を作ることを既に確定している。

- `presentation-caption-check-v003`
- `zev-presentation-instruction-v003`
- `presentation-resolution-package-v003`

一方、実装束縛の`captionCoreV003`と`instructionCoreV003`には、実在するfile、公開入口、内部の責務が無かった。

本追補は、二つを別fileとして定義する。v002成果物をv003へ読み替える変換、v002正式入口でv003を受理する分岐、v003失敗時のv002 fallbackは作らない。

本来の目的は、Geminiが決めた表示区切りを、本文・時刻・対象の欠落や改変なしで描画工程へ渡せるようにすることである。新しい演出能力や読みやすさの採点を追加する仕事ではない。

## 2. 本追補が改訂する範囲

本追補が承認された場合、次を改訂承認したものとする。

1. 元B4設計§3.4、§6.1〜6.3、§7、§12.2〜13。
2. B4実装契約追補§3、§7、§10、§11、§12、§14〜16。
3. 実装契約追補の`dependencyFiles` 3・4番目を、本書§3の実在予定pathへ解決する。
4. 実装契約追補のT043〜T046、T052〜T055を、本書§9の実schemaに一致する検査へ明確化する。
5. 既存回帰95件の1番目を、同じ24件のv002字幕契約回帰へ差し替える。

違反code 69件、合成検査85件、既存回帰の総数95件、candidate 13固有値をpreflightへだけ固定する原則は変えない。

## 3. fileと公開入口

### 3.1 新設する二つのfile

| dependency role | workspace相対path |
|---|---|
| `captionCoreV003` | `evals/clip_composition/presentation_caption_contract_v003.mjs` |
| `instructionCoreV003` | `evals/clip_composition/presentation_instruction_contract_v003.mjs` |

別名のv003検査器、CLI、runner、fallback adapterを追加しない。二fileはpure処理だけを持ち、filesystem、環境変数、stdin、時刻、乱数を読まない。

### 3.2 字幕検査fileのexport

`presentation_caption_contract_v003.mjs`のexportは次の固定順だけとする。

1. `PRESENTATION_CAPTION_SCHEMA_VERSION_V003`
2. `PRESENTATION_CAPTION_CHECKER_VERSION_V003`
3. `PRESENTATION_CAPTION_SCOPE_EXCLUSIONS_V003`
4. `PRESENTATION_CAPTION_V003_OWNED_B4_VIOLATION_CODES`
5. `validatePresentationCaptionGrammarSharedV001`
6. `validatePresentationCaptionContractV003`

固定値:

- `PRESENTATION_CAPTION_SCHEMA_VERSION_V003`: `presentation-caption-check-v003`
- `PRESENTATION_CAPTION_CHECKER_VERSION_V003`: `presentation-caption-checker-v003`
- scope exclusion: `SOURCE_ATOM_SPEAKER_IDENTITY_CLASSIFICATION_OUTSIDE_REGISTRY_NOT_VERIFIED`一件
- owned code: `CAPTION_CONTRACT_SCHEMA_INVALID`一件

`validatePresentationCaptionGrammarSharedV001`はformal v002/v003入口ではない。版名、binding、未知fieldを受け付けず、source atom、target、同時表示group、cue、line、anchorからG1〜G3だけを計算する版中立のpure処理である。

### 3.3 指示書検査fileのexport

`presentation_instruction_contract_v003.mjs`のexportは次の固定順だけとする。

1. `PRESENTATION_INSTRUCTION_BUNDLE_SCHEMA_VERSION_V003`
2. `PRESENTATION_INSTRUCTION_SCHEMA_VERSION_V003`
3. `PRESENTATION_RESOLUTION_PACKAGE_SCHEMA_VERSION_V003`
4. `PRESENTATION_RENDERER_CONTRACT_VERSION_V003`
5. `PRESENTATION_INSTRUCTION_V003_OWNED_B4_VIOLATION_CODES`
6. `validatePresentationInstructionContractV003`

固定値:

- bundle: `presentation-instruction-bundle-v003`
- instruction: `zev-presentation-instruction-v003`
- resolution package: `presentation-resolution-package-v003`
- renderer contract: `zev-renderer-boundary-v003-review`

`PRESENTATION_INSTRUCTION_V003_OWNED_B4_VIOLATION_CODES`は、B4の固定69 codeから41〜52だけを同じ順で持つ。code 53はcaption v003が所有する。新しい外側違反語彙を作らない。

## 4. v002とv003の差分

### 4.1 字幕契約

| 観点 | v002 | v003 |
|---|---|---|
| formal入口 | `validatePresentationCaptionContract` | `validatePresentationCaptionContractV003` |
| schema | `presentation-caption-check-v002` | `presentation-caption-check-v003` |
| sourceの置き場所 | caption入力rootの`source` | resolution packageの単一sourceを別引数で渡す |
| display planとの束縛 | なし | `sourceDisplayPlanBinding`を必須にし、期待bindingと完全一致 |
| caption contractの形 | source、target、group、planを一つのrootで受ける | B4§6.3の埋め込みcontractを厳密に受ける |
| atom粒度 | wordまたはcharacter | B4初回はcharacterだけ |
| omission | 宣言された削除を表現可能 | `allowedOmissionAtomIds`は空だけ |
| 同時表示group | 上流宣言済みgroupを表現可能 | B4初回は空配列だけ |
| G1〜G3 | 既存規則 | **同一計算** |
| source正重なり | 観測、拒否しない | **同一計算** |
| 境界接触 | 許可 | **同一計算** |
| G2の限界 | characterなら固定3件を未検査 | **同一計算** |
| 未知field | v002正本の範囲 | v003の各objectでB4§6.3以外を拒否 |
| report | v002 report | B4がv003検査結果とbindingから`caption-check-report.json`を作る |

v003はv002と実質同一の複製ではない。違いは、sourceの搬送位置、display plan binding、削除禁止、初回の同時表示禁止、exact shapeである。G1〜G3の意味計算自体は同一であり、複製しない。

### 4.2 指示書・解決パッケージ契約

| 観点 | v002 | v003 |
|---|---|---|
| formal入口 | `validatePresentationInstructionContract` | `validatePresentationInstructionContractV003` |
| bundle | 検査用indexを内包する`presentation-instruction-check-v002` | display plan bindingを持つ正式`presentation-instruction-bundle-v003` |
| instruction kind | G4〜G7を含む閉語彙 | `speech-caption`だけ |
| preset | 台帳内の対応kindを照合 | `normal-landscape-readable-pop-v001`だけ |
| material | kindと台帳により可 | 空配列だけ |
| target | 複数種 | `caption-target`だけ |
| caption contract | 0または1件 | exactly 1件 |
| source atom | 利用対象を搬送 | 正式残存source atom全件を元順でexactly once |
| instructionとcue | 参照整合 | 同じ6桁序数で1対1 |
| trigger | target内の開始atom | 対応cue先頭atomの`startAtomId`だけ |
| hash | v002 package／registry契約 | v003のcanonical SHAとB4 binding |
| 外側違反 | v002の汎用違反集合 | instructionはB4 code 41〜52、caption schemaは53へ直接帰属 |

v003は、B4の保守的な基本テロップ1種類だけに範囲を狭めた契約である。v002の広い演出語彙をv003へ持ち込まない。

## 5. 共通計算の再利用

### 5.1 G1〜G3

現在の`presentation_caption_contract_v002.mjs`にあるG1〜G3計算を複製しない。

実装時は、次の順で一度だけ移す。

1. v002のsource atom、target、group、cue、line、anchorの意味計算を、動作を変えず`validatePresentationCaptionGrammarSharedV001`へ抽出する。
2. v002 formal入口は、v002固有schemaとenvelopeを検査した後、共有処理を一回呼ぶ。
3. v003 formal入口は、v003固有schemaとbindingを検査した後、同じ共有処理を一回呼ぶ。
4. B4からv002 formal入口を呼ばない。共有処理をv002成果物の読み替えやfallbackとして使わない。

共有処理は`presentation_caption_contract_v003.mjs`に置く。これによりB4 jobが束縛する`captionCoreV003`の実byte内に計算実体が入り、未束縛の第三fileを増やさない。

`presentation_caption_contract_v002.mjs`は共有処理をimportする薄いv002入口へ変更するが、schema名、report shape、違反code、path、並び、文言、status、scope exclusionを変えない。

### 5.2 hash・正規化

v003二fileは次の既存処理をimportして使う。

| 処理 | 再利用する既存export |
|---|---|
| JSON canonical化 | `presentation_source_speaker_policy_v001.mjs`の`canonicalJson` |
| canonical SHA-256 | 同fileの`canonicalSha256` |
| raw話者分類 | 同fileの`classifyRawSourceSpeaker` |
| 非人物値のnull写像 | 同fileの`normalizeSourceAtomSpeakerForPackage` |
| 非人物台帳判定 | 同fileの`isRegisteredNonIdentitySpeakerToken` |
| 文字順、target coverage、anchor、時刻重なり | 本書§5.1の共有G1〜G3処理 |

formal JSON、canonical JSON、実byte SHAはB4 display pair coreが既存B1 serializerを使って作る。v003検査file内に別serializerを実装しない。

文字indexと表示幅はB4 display pair coreが既存`presentation_renderer_text_layout_v001.mjs`を呼ぶ。v003検査fileへ再実装しない。

### 5.3 v002 instruction検査を呼ばない理由

v002 instruction formal入口は、複数kind、複数target種別、検査index内包、v002 schemaを前提とする。v003 artifactをv002形式へ写して呼ぶと、禁止済みの契約変換になる。

v003 instruction coreは、B4で新たに固定された狭いexact shapeと1対1対応だけを検査し、hash・話者・G1〜G3だけを既存pure処理へ委譲する。v002の広い意味検査をコピーしない。

## 6. v003字幕検査入口

`validatePresentationCaptionContractV003`の入力は次のexact objectである。

```text
{
  format,
  source,
  captionContract,
  expectedDisplayPlanBinding
}
```

- `format`: `normal-landscape`
- `source`: `{atomGranularity, atomProvenance, atoms}`
- `captionContract`: 元B4設計§6.3のexact object
- `expectedDisplayPlanBinding`: `{displayPlanId, fileSha256, canonicalSha256}`

未知fieldを拒否する。caption contractの`sourceDisplayPlanBinding`は期待bindingと三fieldとも一致させる。

返値は次のexact objectである。

```text
{
  status,
  schemaViolations,
  grammarReport
}
```

- `status`: `failed`、`passed`、`passed_with_declared_limit`
- `schemaViolations`: B4 code 53だけ。各要素は`{code, path, details}`
- `grammarReport`: schema成立時だけ共有G1〜G3 report。schema不成立時は`null`

schema violationの`details`は`{reason}`だけを持つ。reasonは次の固定順である。

1. `input-not-object`
2. `unknown-field`
3. `schema-version-unsupported`
4. `format-unsupported`
5. `display-plan-binding-invalid`
6. `source-invalid`
7. `target-invalid`
8. `omission-not-empty`
9. `simultaneous-group-not-empty`
10. `caption-plan-invalid`
11. `cue-invalid`
12. `line-invalid`
13. `anchor-invalid`

`schemaViolations`が一件でもあれば共有G1〜G3処理を呼ばない。壊れた形からG1〜G3を推測しない。

## 7. v003指示書検査入口

`validatePresentationInstructionContractV003`の入力は次のexact objectである。

```text
{
  instructionBundle,
  displayPlan,
  retainedSourceAtoms,
  trustedRegistryBindings,
  presetRegistry,
  presetValidationIndex,
  materialValidationIndex
}
```

入力は全てB4 display pair coreがstrict decodeし、bindingを検証した同一objectである。v003 instruction coreがfilesystemから再読しない。

返値は次のexact objectである。

```text
{
  status,
  violations,
  captionValidation
}
```

- `status`: `failed`、`passed`、`passed_with_declared_limit`
- `violations`: B4 code 41〜52だけをB4固定順で持つ
- `captionValidation`: §6の返値。caption schemaへ到達できない上流失敗時は`null`

責務:

1. bundle、instruction set、resolution packageのexact fieldと固定schemaを検査する。
2. retained source atom全件のID、順序、speaker正規化、canonical SHAを照合する。
3. target、cue、instructionを同じ6桁序数で1対1に照合する。
4. caption targetのrequired atom列がcueのline atom列とexact一致することを検査する。
5. omission、material、同時表示groupが空であることを検査する。
6. instruction kind、preset、triggerを固定値と照合する。
7. §6の字幕検査を一回だけ呼ぶ。

B4 display pair coreは41〜53を別実装しない。v003 instruction coreの`violations`と、内包するcaption v003の`schemaViolations`をB4全体reportへそのまま帰属させる。

## 8. 内部違反とB4 69 codeへの帰属

新しい外側違反codeを作らない。

| v003 core | 所有するB4 code |
|---|---|
| instruction v003 | 41〜52 |
| caption v003 schema | 53 |
| 共有G1〜G3 reportのfailedをB4が要約 | 54 |
| G2固定限界の宣言欠落をB4が検査 | 55 |

共有G1〜G3 report内の既存違反code、path、statusは変更しない。B4 code 54は、内側codeを別の意味へ変換せず、「G1〜G3のどの区画がfailedか」だけを外側へ示す。

instruction v003 core内のexact帰属:

| B4 code | v003 coreが検出する範囲 |
|---|---|
| 41 | top-level targetのID・6桁序数 |
| 42 | resolution package envelope、source binding、top-level targetとcaption cueの1対1対応 |
| 43〜46 | caption targetのrequired atom列・omission。pathは§9.1 |
| 47 | instruction ID・6桁序数 |
| 48 | bundle／instruction set envelope、instructionとtarget/cue/packageの1対1対応 |
| 49 | kindが`speech-caption`以外 |
| 50 | presetと承認済みbindingの不一致 |
| 51 | materialRefsが空でない |
| 52 | trigger.startAtomIdとcue先頭atomの不一致 |
| 53 | caption contractのschema、exact shape、display plan binding不一致 |

code 42と48がenvelope不成立も担当するのは、B4固定69 codeに別のresolution/instruction envelope codeが無いためである。code 42はresolution側、48はinstruction bundle側と境界を固定し、同じ不成立を双方へ重複帰属しない。

code 54のpath:

- contract: `$.captionCheckReport.contract`
- G1: `$.captionCheckReport.checks.G1`
- G2: `$.captionCheckReport.checks.G2`
- G3: `$.captionCheckReport.checks.G3`

code 55のpath:

- 固定3件の不足: `$.captionCheckReport.checks.G2.unverified`
- status不一致: `$.captionCheckReport.overallStatus`

## 9. 元追補のv003参照訂正

元追補の件数とcodeを変えず、実schemaに一致するよう次を上書きする。

### 9.1 code 43〜46

atom列はtop-level targetでなくcaption contract内のcaption targetが所有する。

| code | 正しい対象path |
|---|---|
| 43 `TARGET_ATOM_MISSING` | `$.resolutionPackage.captionContracts[0].captionTargets[i].requiredAtomIds` |
| 44 `TARGET_ATOM_DUPLICATED` | `$.resolutionPackage.captionContracts[0].captionTargets[i].requiredAtomIds[j]` |
| 45 `TARGET_ATOM_ORDER_REVERSED` | `$.resolutionPackage.captionContracts[0].captionTargets[i].requiredAtomIds` |
| 46 `TARGET_OMISSION_NOT_EMPTY` | `$.resolutionPackage.captionContracts[0].captionTargets[i].allowedOmissionAtomIds` |

top-level `resolutionPackage.targets[i]`へ`sourceAtomIds`や`omittedSourceAtomIds`を追加しない。

### 9.2 code 52

instruction triggerは`{startAtomId}`だけである。endAnchorを追加しない。

code 52は、`trigger.startAtomId`が対応cueの先頭atomと不一致の場合に
`$.instructionBundle.instructionSet.instructions[i].trigger.startAtomId`
へ発火する。

### 9.3 code 53〜55

- caption schema fieldは`schemaVersion`でなく`captionSchemaVersion`。
- caption checksは配列でなく`{G1,G2,G3}`のobject。
- G2の`unverified`は`checks.G2`内にある。

### 9.4 T043〜T055の置換

| test | 正しいmutation | 期待code / path |
|---|---|---|
| T043 | `captionTargets[0].requiredAtomIds`から1件欠落 | 43 / §9.1 |
| T044 | 同配列の2件目を重複 | 44 / §9.1 |
| T045 | 同配列の2件を逆順 | 45 / §9.1 |
| T046 | `allowedOmissionAtomIds`へ1件追加 | 46 / §9.1 |
| T052 | `trigger.startAtomId`を対応cue以外へ変更 | 52 / §9.2 |
| T053 | 13 reasonを各1回発火させるtable内で、代表として`captionSchemaVersion`をv002へ変更 | 53 / `$.resolutionPackage.captionContracts[0].captionSchemaVersion` |
| T054 | lineの`renderedText`をsource連結と不一致にする | 54 / `$.captionCheckReport.checks.G1` |
| T055 | G2の固定`unverified`から1件削除 | 55 / `$.captionCheckReport.checks.G2.unverified` |

T053はtop-level一件のまま、§6に固定した13 reasonを一件ずつ発火させ、reason集合・順序と期待集合の完全一致をassertする。検査件数85を増やさず、caption v003 schema分岐を未検査のまま残さない。

## 10. 回帰95件

共有G1〜G3計算をv2 fileから抽出するため、既存回帰95件の1番目だけを同件数のv002回帰へ差し替える。

| 順 | test file | 件数 |
|---:|---|---:|
| 1 | `evals/clip_composition/presentation_caption_contract_v002.regression.mjs` | 24 |
| 2 | `evals/clip_composition/presentation_instruction_contract_v002.regression.mjs` | 27 |
| 3 | `evals/clip_composition/presentation_source_speaker_contract_v002.test.mjs` | 10 |
| 4 | `evals/clip_composition/presentation_base_media_timeline_v002.test.mjs` | 15 |
| 5 | `evals/clip_composition/presentation_renderer_v002.test.mjs` | 19 |
|  | 合計 | **95** |

起草時のv002字幕回帰は24/24合格。基準file:

- `presentation_caption_contract_v002.mjs`
- SHA-256: `0fcb9f9c6b0ae2f50b4ca68ba1190c75dc0acfe9e7d27a3d504bd46a5d4ce789`

v002 testdata 3件をfile名順に検査・formal serializeし、
`file名 + NUL + report byte + NUL`
を連結した基準SHA-256は
`dd0fada3ba59572f80256a708eb10e0e117ea7c4515e59b792f3db571f14d234`
である。

実装後は24件のTAP合格だけでなく、この3件のaggregate SHA-256完全一致を必須にする。違えばG1〜G3共有化がv002挙動を変えたとして停止する。

元のv1字幕契約test 24件は今回変更しないため、B4回帰一覧から外しても削除・改変しない。

## 11. B4検査への接続

### 11.1 dependencyの実在確認

B4 job作成前に、二つのpathが次を満たすことを必須にする。

1. workspace内の通常fileである。
2. symlink、hardlink、directoryでない。
3. jobの`fileSha256`と実byteが一致する。
4. §3のexport名が全て存在し、関数はcallable、定数は固定値である。
5. B4 display pair coreがこの二入口を直接importする。
6. B4合成検査が同じ二入口を直接importし、同等ロジックを持たない。

### 11.2 T078の意味

T078を次のように明確化する。

- v002 schemaのcaption、instruction、resolution artifactをv003入口へ直接渡すと拒否する。
- B4からv002 formal validatorを呼ばない。
- v003 failure時にv002 validatorへfallbackしない。
- `validatePresentationCaptionGrammarSharedV001`の呼出しは共通計算であり、v002 formal入口の呼出しに数えない。
- valid v003 pair一件につき、共有G1〜G3処理はcaption v003入口から一回だけ呼ばれる。

## 12. 完全性チェックの再記録

前の追補は、`dependencyFiles`にrole名があり、§3の「前例の対応表」に既存資産名があることをもって「参照解決済み」と自己申告した。しかし、roleが指す実file、公開export、callableな処理の存在を現物で確認していなかった。

既存の「具体値・path・入口・一件表まで解決する」項目へ、次を追加する。

### 参照実体存在確認

設計が参照する各file・検査・関数について、承認前に次を分類する。

1. **既存再利用物**: fileが実在し、通常fileで、exact path、export名、型、利用箇所まで照合済み。
2. **新規実装物**: exact path、export集合、入力、返値、違反、呼出元、検査行が設計内で固定済み。実装前には不存在であることも記録する。
3. **文書上の名前だけ**: 不合格。既存にも新規定義にも属さない参照を残さない。

自己チェック表:

| 項目 | 解決先 |
|---|---|
| v003二fileのexact path | §3.1 |
| export集合・型 | §3.2〜3.3 |
| v002/v003差分 | §4 |
| 共通計算と非複製 | §5 |
| exact入力・返値 | §6〜7 |
| 内部違反の外側帰属 | §8 |
| schemaと検査行の一致 | §9 |
| 回帰件数と基準byte | §10 |
| production／検査の同一入口 | §11 |
| candidate 13固有値の非混入 | 本書全体。固有件数はpreflightだけ |

未固定なしと自己申告するが、承認後の実装前現物照合で新しい未定義・矛盾を一件でも見つけた場合は、実装せず停止する。

## 13. 承認後の範囲

本追補が承認された場合、既承認のB4範囲を次の順で再開する。

1. §3のv003二fileと、§5.1のv002字幕入口の共有化を実装。
2. B4 display pair core、runner、preflight runner、testdata、合成検査を実装。
3. 合成85件を先頭から一度実行し、69違反code全発火を確認。
4. §10の回帰95件を実行。
5. candidate 13読み取り専用preflightを実行。
6. B4完了報告。3条件成立時だけ安定点tagとJOURNALを同一commitで記録。
7. B5のprompt・費用固定承認依頼を起草し、停止。

含まないもの:

- B5の実装。
- B6、Gemini実走。
- 正式v003 pair生成。
- 描画、人間確認。

不合格、未定義、契約矛盾、実測前提不一致が一件でもあれば、同attemptで修正・再実行せず停止する。

## 14. 承認依頼文

> candidate 13 基本テロップ B4 v003検査実体 実装契約追補v001を承認する。本承認は、v003字幕検査とv003指示書検査を本書§3の別file・別formal入口として新設し、元B4設計と実装契約追補を本書§2・§9〜11の範囲で改訂する承認を兼ねる。v002成果物の暗黙変換、v002 formal入口でのv003受理、fallbackを作らない。G1〜G3は既存v002計算を§5の版中立pure処理へ一度だけ抽出し、v002/v003双方が同じ処理を使う。B4 code 41〜55の責務とT043〜T055のschema参照を本書どおり固定し、回帰はv002字幕24件を含む総数95件のままとする。実装契約完全性チェックへ「参照実体存在確認」を追加する。承認後はB4実装、合成85件、回帰95件、candidate 13読み取り専用preflight、完了報告、B5承認依頼起草まで進めてよい。不成立が一件でもあれば同attemptで直さず停止する。B5実装、B6、Gemini、正式pair、描画は含めない。
