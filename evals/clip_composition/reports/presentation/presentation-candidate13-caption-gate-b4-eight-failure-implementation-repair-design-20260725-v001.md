# candidate 13 字幕表示計画 B4 8不合格 実装修正設計 v001

- 日付: 2026-07-25
- 正本となる承認: `presentation-candidate13-caption-gate-b4-eight-failure-diagnosis-and-contract-resolution-addendum-20260725-v001.md`
- 状態: **実装修正設計の提示。実装・検査再実行は未承認**
- 人間作業: 0件

## 1. 目的と停止点

本設計は、正式合成検査85件中の不合格8件を、承認済み追補の契約どおりに修正するための実装範囲を一意に固定する。

目的は8件を表面上合格させることではない。次を同時に成立させることである。

1. 69違反codeすべてへ同じ所有者規則を適用する。
2. 壊れた子を親の比較材料へ使わないR2案Aを字幕表示計画にも適用する。
3. 空素材台帳の正本fieldだけを読む。
4. 構築失敗を成果物ゼロのまま信頼できる失敗報告として返せるよう、失敗報告をv002へ非互換改訂する。
5. 既存の合成85件、回帰95件、candidate 13読み取り専用preflightの意味を緩めない。

今回は設計提示で停止する。production code、検査、job、正式成果物、DECISIONS、HANDOVERは変更しない。

## 2. 変更対象と変更禁止

### 2.1 実装承認後の変更対象

| 種類 | path | 役割 |
|---|---|---|
| production core | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` | 所有者判定、三表現照合、子不正の除外、空素材field、失敗報告v002のpure builder/validator |
| production runner | `evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs` | v002報告入口の使用、構築失敗時の終了1、v001入口の撤去 |
| 合成検査 | `evals/clip_composition/test_presentation_caption_display_pair_v003.mjs` | 69所有者、8不合格、v002報告、production同一入口の検査 |
| candidate 13 preflight job | `evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/DmWu0jVQfTE-candidate-13-caption-display-pair-b4-v001.json` | 承認後実装commitと実byteへimplementation bindingを更新する |
| 承認済み設計文書 | §7.6の2文書 | v002非互換改訂の案内と改訂履歴だけを追記する |
| 節目記録 | `DECISIONS.md`、`HANDOVER.md` | 実装・検査が完了した事実だけを同期する |

candidate 13固有の354文字、3まとまり、205候補、2区間、既存hashはpreflight照合値にだけ置く。production coreへ焼き込まない。

### 2.2 変更禁止

- `presentation_caption_contract_v003.mjs`と`presentation_instruction_contract_v003.mjs`の契約を変えない。
- 69違反codeの名称、番号、固定順、正式な`{code,path,details}` shapeを変えない。
- T001〜T085のtop-level件数を変えない。
- 期待codeを実装へ合わせて変更しない。
- validation report v001を受理するshim、別名、暗黙変換を作らない。
- `materials`と`entries`の両方を受けるfallbackを作らない。
- 既存B3正式7ファイル、凍結済みfixture、expectedを変更しない。
- B5、B6、Gemini、正式表示計画、描画へ進まない。

## 3. 違反所有者の汎用規則

### 3.1 所有の単位

違反所有者は、検査関数を呼んだ場所や、先に配列へ追加されたcodeではなく、**不正になった正本上の事実を直接検査するcheck**で決める。

所有判定は次の順で行う。

1. 入力の各子成果物を、それ自身のschema・binding・内部不変条件で判定する。
2. 不正な子は、親の集合比較、本文比較、時刻比較、件数集計へ使わない。
3. 子を除外した事実は、子の所有codeとして必ず残す。親側の違反へ置換して隠さない。
4. 子が有効な場合だけ、工程間の対応、親の集合、相互bindingを判定する。
5. 一つの不正事実には一つの所有者だけを与える。同じ事実を別checkで重複所有しない。
6. 別々の正本事実が独立に壊れている場合だけ、複数違反を固定順で併記できる。
7. 所有判定後に、既存のcode順、path順、details canonical順で並べる。
8. 上流失敗後の下流は`not_run_with_upstream_failure`とし、推測違反を作らない。

これはR2案Aの「壊れた子は丸ごと除外し、除外は違反として可視化する」を69 codeへ一般化した規則である。

### 3.2 code 18〜20の三表現

一行の字幕候補は、次の三表現を持つ。

1. ID表現: `sourceAtomIds`
2. 本文表現: `text`
3. 範囲表現: `startAnchor`から`endAnchor`までの連続した元発話文字

比較は次で固定する。

| 一致状態 | 所有code |
|---|---|
| 本文と範囲が一致し、IDだけが違う | 18だけ |
| IDと範囲が一致し、本文だけが違う | 19だけ |
| IDと本文が一致し、範囲だけが違う | 20だけ |
| 三表現すべて一致 | 違反なし |
| 一致する二表現が無い | 独立した複数leaf不正として18、19、20を固定順で併記 |

正式元発話がbinding、schema、ID一意性、時刻、話者、順序のいずれかで不正なら、その元発話を三表現の照合に使わない。元発話自身のcode 21〜25または27だけを可視化する。

字幕候補の三表現が自己整合し、字幕候補全体と正式元発話の集合だけが違う場合はcode 26、集合が同じで順序だけが違う場合はcode 27が所有する。

### 3.3 code 60の段階別所有

現行実装はcode 60を番号範囲だけで常に`determinism`へ割り当てている。しかし承認済み一件表は「発生stageのcheck」が所有すると明記している。次の段階表を正本にし、番号範囲による静的割当を廃止する。

| `details.stage` | 所有check |
|---|---|
| `semantic-compiler-rebuild` | `semanticSeam` |
| `display-plan-build` | `displayPlan` |
| `resolution-package-build` | `resolutionPackage` |
| `instruction-bundle-build` | `instructionBundle` |
| `caption-check-build` | `captionG1G3` |
| `layout-inspection` | `layoutPreflight` |
| `review-request-build` | `reviewRenderRequest` |
| `pair-manifest-build` | `reviewRenderRequest` |
| `pair-report-build` | `reviewRenderRequest` |

pair manifestとreportは、code 59が所有するpair相互bindingと同じcheckへ置く。`determinism`はcode 61だけを所有する。

code 60は「有効な前提の後で構築処理そのものが失敗した」場合だけ使う。同じ失敗をcode 12、56、58、59等の専用codeで直接表現できる場合、code 60を重複発火させない。

## 4. 69 code再帰属表

「変更」は、承認済み一件表上の所有者ではなく、現行実装から修正が必要かを示す。

| # | code | 所有check | 再帰属結果 |
|---:|---|---|---|
| 1 | `CAPTION_B4_JOB_INVALID` | `jobBinding` | 不変 |
| 2 | `JOB_FILE_MISMATCH` | `jobBinding` | 不変 |
| 3 | `IMPLEMENTATION_MISMATCH` | `implementationBinding` | 不変 |
| 4 | `INPUT_PATH_UNSAFE` | `inputBinding` | 不変 |
| 5 | `INPUT_FILE_SET_INVALID` | `inputBinding` | 不変 |
| 6 | `INPUT_HASH_MISMATCH` | `inputBinding` | 不変 |
| 7 | `INPUT_SCHEMA_UNSUPPORTED` | `inputBinding` | 不変 |
| 8 | `RUNTIME_MISMATCH` | `runtimeBinding` | 不変 |
| 9 | `SEMANTIC_REPORT_NOT_PASSED` | `semanticSeam` | 不変 |
| 10 | `SEMANTIC_COMPILER_INPUT_NOT_AVAILABLE` | `semanticSeam` | 不変 |
| 11 | `SEMANTIC_BINDING_MISMATCH` | `semanticSeam` | 不変 |
| 12 | `SEMANTIC_COMPILER_REBUILD_FAILED` | `semanticSeam` | 不変 |
| 13 | `SEMANTIC_COMPILER_HASH_MISMATCH` | `semanticSeam` | 不変 |
| 14 | `COMPILER_INPUT_SCHEMA_INVALID` | `semanticSeam` | 不変 |
| 15 | `COMPILER_CONTAINER_SET_INVALID` | `semanticSeam` | 不変 |
| 16 | `COMPILER_MEANING_GROUP_INVALID` | `semanticSeam` | 不変 |
| 17 | `COMPILER_LINE_INVALID` | `semanticSeam` | 不変 |
| 18 | `COMPILER_ATOM_COVERAGE_INVALID` | `semanticSeam` | 所有checkは不変。同一leaf由来の19/20派生を抑制 |
| 19 | `COMPILER_TEXT_MISMATCH` | `semanticSeam` | 不変。独立本文不正だけを所有 |
| 20 | `COMPILER_ANCHOR_MISMATCH` | `semanticSeam` | 不変。独立範囲不正だけを所有 |
| 21 | `SOURCE_PACKAGE_BINDING_MISMATCH` | `sourceAtoms` | 不変 |
| 22 | `SOURCE_ATOM_SCHEMA_INVALID` | `sourceAtoms` | 不変 |
| 23 | `SOURCE_ATOM_ID_DUPLICATE` | `sourceAtoms` | 所有checkは不変。先行していた派生code 18を作らない |
| 24 | `SOURCE_ATOM_TIME_INVALID` | `sourceAtoms` | 不変 |
| 25 | `SOURCE_ATOM_SPEAKER_INVALID` | `sourceAtoms` | 不変 |
| 26 | `SOURCE_ATOM_COVERAGE_INVALID` | `sourceAtoms` | 所有checkは不変。source extra/missingをcode 18へ移さない |
| 27 | `SOURCE_ATOM_ORDER_INVALID` | `sourceAtoms` | 所有checkは不変。source順序不正をcode 18へ移さない |
| 28 | `TIMELINE_BINDING_MISMATCH` | `timeline` | 不変 |
| 29 | `TIMELINE_SEGMENT_INVALID` | `timeline` | 不変 |
| 30 | `TIMELINE_MAPPING_FAILED` | `timeline` | 不変 |
| 31 | `CUE_ID_INVALID` | `displayPlan` | 不変 |
| 32 | `CUE_MAPPING_INVALID` | `displayPlan` | 不変 |
| 33 | `CUE_LINE_COUNT_INVALID` | `displayPlan` | 不変 |
| 34 | `CUE_LINE_WIDTH_EXCEEDED` | `displayPlan` | 不変 |
| 35 | `CUE_TEXT_MISMATCH` | `displayPlan` | 不変 |
| 36 | `CUE_ANCHOR_MISMATCH` | `displayPlan` | 不変 |
| 37 | `CUE_SOURCE_TIME_INVALID` | `displayPlan` | 不変 |
| 38 | `CUE_TIMELINE_SEGMENT_CROSSED` | `displayPlan` | 不変 |
| 39 | `CUE_ORDER_REVERSED` | `displayPlan` | 不変 |
| 40 | `CUE_UNDECLARED_OVERLAP` | `displayPlan` | 不変 |
| 41 | `TARGET_ID_INVALID` | `resolutionPackage` | 不変 |
| 42 | `TARGET_MAPPING_INVALID` | `resolutionPackage` | 不変 |
| 43 | `TARGET_ATOM_MISSING` | `resolutionPackage` | 不変 |
| 44 | `TARGET_ATOM_DUPLICATED` | `resolutionPackage` | 不変 |
| 45 | `TARGET_ATOM_ORDER_REVERSED` | `resolutionPackage` | 不変 |
| 46 | `TARGET_OMISSION_NOT_EMPTY` | `resolutionPackage` | 不変 |
| 47 | `INSTRUCTION_ID_INVALID` | `instructionBundle` | 不変 |
| 48 | `INSTRUCTION_MAPPING_INVALID` | `instructionBundle` | 不変 |
| 49 | `INSTRUCTION_KIND_INVALID` | `instructionBundle` | 不変 |
| 50 | `INSTRUCTION_PRESET_INVALID` | `instructionBundle` | 不変 |
| 51 | `INSTRUCTION_MATERIAL_NOT_EMPTY` | `instructionBundle` | 不変 |
| 52 | `INSTRUCTION_TRIGGER_MISMATCH` | `instructionBundle` | 不変 |
| 53 | `CAPTION_CONTRACT_SCHEMA_INVALID` | `instructionBundle` | 不変 |
| 54 | `G1_G3_CHECK_FAILED` | `captionG1G3` | 不変 |
| 55 | `G2_DECLARED_LIMIT_MISSING` | `captionG1G3` | 不変 |
| 56 | `LAYOUT_PREFLIGHT_FAILED` | `layoutPreflight` | 不変 |
| 57 | `REVIEW_STATE_INVALID` | `reviewState` | 不変 |
| 58 | `REVIEW_RENDER_REQUEST_INVALID` | `reviewRenderRequest` | 不変 |
| 59 | `PAIR_BINDING_MISMATCH` | `reviewRenderRequest` | 不変 |
| 60 | `BUILD_FAILED` | §3.3の発生段階 | **現行の`determinism`固定割当を段階別所有へ修正** |
| 61 | `NONDETERMINISTIC` | `determinism` | 不変 |
| 62 | `READ_ONLY_CONTRACT_VIOLATED` | `readOnlyCheck` | 不変 |
| 63 | `OUTPUT_ROOT_ALREADY_EXISTS` | `publication` | 不変 |
| 64 | `PUBLICATION_LOCK_UNAVAILABLE` | `publication` | 不変 |
| 65 | `PUBLICATION_STAGING_INVALID` | `publication` | 不変 |
| 66 | `PUBLICATION_INPUT_CHANGED` | `publication` | 不変 |
| 67 | `PUBLICATION_FAILED` | `publication` | 不変 |
| 68 | `PUBLISHED_PAIR_INVALID` | `publication` | 不変 |
| 69 | `PUBLICATION_PRE_RENAME_INVALID` | `publication` | 不変 |

4不合格以外で現行実装から所有checkが変わるのはcode 60だけである。code 18、23、26、27は正式な所有check自体は変わらず、誤った派生違反とcutoffを除く。

## 5. 所有者判定の実装形

### 5.1 固定所有表

core内に69 codeを完全に覆う一つの所有表を置く。表の値は固定check名か、code 60だけ`build-stage-dependent`である。

検査で次を完全一致assertする。

1. 所有表のkey集合と`PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001`が集合・順序とも一致する。
2. 固定check名は17件の既存check名だけである。
3. code 60の9 stageが§3.3の全件・重複なしである。
4. 一つのcodeを二つのcheckが所有しない。

現在の`rangeByCheck`を所有判定には使わない。番号順は表示順のためだけに残す。

### 5.2 元発話の先行内部判定

正式なcheck表示順は変えず、内部計算だけを次の順にする。

1. 元発話のbinding・schema・ID・時刻・話者・順序を判定し、利用可能状態を作る。
2. compilerのschema・container・group・lineを判定する。
3. 元発話が利用可能な場合だけ、三表現と集合を判定する。
4. 元発話自身の違反を`sourceAtoms`へ、compiler自身の違反を`semanticSeam`へ置く。
5. 17 checkの固定表示順へ戻してcutoffを計算する。

内部判定順を変えても、正式reportのcheck順と違反code順は変わらない。

### 5.3 親への伝播禁止

元発話の不正状態はboolean一個へ潰さず、少なくとも次を内部で区別する。

- bindingが信頼できる
- exact shapeが信頼できる
- IDが一意である
- 時刻が正区間である
- 話者欄が契約内である
- 正本順が成立する

いずれかが不成立なら、元発話を使う三表現・集合比較を実行しない。部分的に使える文字だけで親違反を作らない。

## 6. field読み違いの水平確認

### 6.1 照合範囲

B4が扱う正式なroleを、schema定義、実JSONのroot key、productionの参照名で照合した。

| 群 | role数 | JSON | binary | 照合方法 |
|---|---:|---:|---:|---|
| B4 job | 1 | 1 | 0 | exact root keyとvalidator参照 |
| B3 source-only package | 7 | 7 | 0 | B3固定7 roleとB1 compilerへの受渡し |
| B1意味回答系 | 3 | 3 | 0 | job、raw回答、validation reportの契約shapeと参照 |
| 残存元発話 | 3 | 3 | 0 | generation manifest、source atoms、validation report |
| 基礎映像 | 4 | 3 | 1 | generation manifest、timeline、validation report、動画 |
| preset/material台帳 | 4 | 4 | 0 | trusted binding、preset、preset index、material index |
| B4出力 | 7 | 7 | 0 | builder、validator、runnerの相互参照 |
| 合計 | 29 | 28 | 1 | 28 JSON roleと1 binary role |

B1意味回答系はまだ正式実走前なので、承認済みB1 schemaとB2合成fixtureを照合源にした。他の正式入力はcandidate 13の固定済み実体も併用した。

### 6.2 結果

field名不一致は**1件**である。

| role | 正本field | 現行参照 | 件数 | 修正 |
|---|---|---|---:|---|
| material validation index | `materials` | `entries` | 1 | `materials`だけを参照 |

実体のrootは次で一致した。

```json
{
  "registryVersion": "presentation-material-registry-empty-v001",
  "materials": []
}
```

`entries`の受理、fallback、別名変換は行わない。

他の27 JSON roleについて、schema fieldと実装参照名の不一致は0件だった。特に次を確認した。

- 残存元発話: `rawSourceAtoms`、`sourceProvenance`、`atomGranularity`、`rawSourceAtomsCanonicalSha256`
- timeline: `segments`と既存mapper入力
- trusted registry: `presetRegistryVersion`、`presetValidationIndexSha256`、`materialRegistryVersion`、`materialValidationIndexSha256`
- preset registry: `presets`、`fontAssets`、`canvas`
- semantic validation report: `status`、`compilerInput.observedByteSha256`、`compilerInput.canonicalSha256`

filesystemのdirectory entryを表すrunner内のローカル変数`entries`は、JSON field参照ではないため不一致件数へ含めない。

## 7. validation report v002の非互換改訂

### 7.1 改訂履歴

| 日付 | 版 | 内容 | 根拠 |
|---|---|---|---|
| 2026-07-25 | v001 | 6 output bindingを常に非nullとする初版 | B4表示計画契約設計v001 §11 |
| 2026-07-25 | v002 | 構築失敗時だけ6 fieldを全nullにし、成果物ゼロのtrusted failed reportを成立させる非互換改訂 | 承認済み8不合格診断・契約確定追補v001 §6.3 |

新しいschema識別子は
`presentation-caption-display-pair-validation-report-v002`
、validator識別子は
`presentation-caption-display-pair-validator-v002`
とする。

実装後はv001を一切受理しない。v001 validator exportを残さず、v001からv002への変換器、dual decode、schema aliasを作らない。B4正式pairはまだ生成されていないため、移行対象となる正式成果物は0件である。

### 7.2 v002の固定shape

root fieldの15件と順序はv001から維持する。`schemaVersion`と`validatorVersion`だけをv002へ変え、`outputBindings`を次の二状態に限定する。

| 状態 | 6 output binding | `artifactBytes` | `manifestBytes` |
|---|---|---|---|
| builder成功後 | 全6件が非null | 5件のBuffer | manifestのBuffer |
| code 60を持つtrusted builder失敗 | 全6件がnull | 空配列 | null |

一件でも混在した場合は不正である。builder失敗時に部分成果物のhashを載せない。

builder失敗時は、承認済み追補どおり次を固定する。

- `status`: `failed`
- `failureStage`: code 60の`details.stage`
- `reviewState`: null
- `observedProjection`: 必要構造が揃わなければ全field null
- 正式rootへの公開: 0件
- stdout: trusted failed report一件
- stderr: 0 byte
- CLI: exit 1

code 60を信頼して作れない、またはv002 report自身の再検査に失敗した場合だけexit 2とする。

### 7.3 pure入口

coreへ次の二入口を置く。

1. `buildPresentationCaptionDisplayPairValidationReportV002`
2. `validatePresentationCaptionDisplayPairValidationReportV002`

builder入力は次のexact key順とする。

1. `jobPath`
2. `jobFileSha256`
3. `job`
4. `runtime`
5. `checked`
6. `compilerObservation`
7. `contentArtifacts`
8. `manifestArtifact`

`contentArtifacts`と`manifestArtifact`は、成功後の5件配列＋一件、またはcode 60構築失敗時の`null`＋`null`だけを許す。混在を許さない。

builderは正式report valueを返す。入力不成立時は`null`を返し、部分reportを返さない。

validator入力は次のexact key順とする。

1. `report`
2. `checkerContext`
3. `artifactBytes`
4. `manifestBytes`

validatorは同じcheckerを再実行し、reportの全fieldを完全一致させる。runner内に同等report組立処理を残さない。

### 7.4 runnerの分岐

1. 5成果物を構築できた場合、manifestを作り、v002 report builderへ非null一式を渡す。
2. 構築失敗でcheckerがcode 60を信頼して返した場合、manifestを作らず、v002 report builderへ`null`一式を渡す。
3. v002 validatorで再検査する。
4. 構築失敗のtrusted reportは公開処理へ進まずexit 1。
5. 構築成功後の契約違反は従来どおり非null binding付きfailed reportでexit 1。
6. 違反なしだけが7ファイル公開とexit 0へ進む。

### 7.5 影響する実装・検査・参照

| 種類 | 参照箇所 | 変更 |
|---|---|---|
| core export | v001 validator | v002 builder/validatorへ置換。v001 exportを削除 |
| runner import | v001 validator | v002 builder/validatorへ置換 |
| runner report組立 | private `makeReport` | 削除し、coreのpure builderだけを使用 |
| runner report schema | v001文字列 | v002 builderが生成 |
| report再検査 | 5 artifact＋manifest必須 | v002の二状態を検査 |
| T060 | code 60一件probe | 同じtop-level検査内で全null failed reportの組立・再検査まで確認 |
| T080 | pure builder正常構築 | `materials`修正後の5成果物成立を確認 |
| T081 | pure builder決定性 | `materials`修正後のbyte一致を確認 |
| T082 | formal CLI success | v002、6 binding非null、exit 0 |
| T083 | formal CLI contract failure | v002、6 binding非null、exit 1 |
| T084 | usage fatal | 変更なし。fatal schema v001はvalidation reportとは別契約 |
| T085 | production/pure同一入口 | v002二入口の直接使用、v001 export不在を確認 |
| static preflight | reportを生成しない | 実装bindingだけ更新。report schemaの影響なし |

T059のpair binding意味、69 code、report root field数、正式出力ファイル名7件は変えない。

### 7.6 承認済み文書の改訂手続き

実装承認時に、次の承認済み文書へ本文を書き換えず、改訂履歴行と正本案内を追記する。

| 文書 | 追記位置 | 上書きされる記述 |
|---|---|---|
| `presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md` | §11冒頭と改訂履歴 | report v001、outputBindings常時非null |
| `presentation-candidate13-caption-gate-b4-implementation-contract-addendum-20260725-v001.md` | export/validator/T060/T082〜T085の各節への案内と改訂履歴 | v001 validator入口、構築失敗報告未検査 |

案内は、承認済み8不合格診断追補§6.3と本設計§7を新正本として参照する。元文書を黙って書き換えない。

## 8. 実装単位

### 8.1 core

1. 69 code完全所有表とcode 60 stage所有表を追加する。
2. `rangeByCheck`による所有判定を廃止し、所有表からcheckとcutoffを作る。
3. 元発話の内部判定結果を先に作り、親比較の利用可否を固定する。
4. compiler lineへ三表現照合を実装する。
5. source extra/missing/orderをcode 26/27へ帰属する。
6. 空素材判定を`materialIndex.materials.length === 0`へ修正する。
7. v002 report builder/validatorを実装し、v001 validatorを削除する。

### 8.2 runner

1. v002 builder/validatorだけをimportする。
2. private report組立を削除する。
3. builder成功とcode 60失敗の二状態をv002 pure入口へ渡す。
4. 構築失敗時は成果物公開前にtrusted reportをstdoutへ出してexit 1。
5. v001 report文字列と入口を残さない。

### 8.3 検査

top-level 85件は維持し、既存検査内のassertを増やす。

| 検査 | 追加確認 |
|---|---|
| T001〜T069 | 各違反が§4の所有check一件だけへ入る |
| T018〜T020 | 三表現の単独不正と、同一leaf派生抑制 |
| T021〜T027 | 壊れた元発話を親比較へ使わない |
| T060 | 9 stage所有表、全null v002 failed report、validator合格 |
| T079 | 既存出版帰属に加え、69所有表の集合完全一致 |
| T080〜T081 | 正常構築と決定性 |
| T082〜T083 | v002 CLI成功・契約失敗 |
| T085 | runnerがv002 pure入口を直接使用し、v001入口が無い |

69 codeのexport集合とT001〜T069観測集合は引き続き完全一致させる。

## 9. 8不合格との対応表

| 不合格 | 修正単位 | 期待される解消 |
|---|---|---|
| T018 | 三表現照合 | IDだけの不正をcode 18一件へ帰属 |
| T023 | 元発話先行判定・親利用禁止 | code 23一件を可視化 |
| T026 | 集合差のsource所有 | code 26一件を可視化 |
| T027 | 順序差のsource所有 | code 27一件を可視化 |
| T080 | `materials`参照 | 5成果物を正常構築 |
| T081 | `materials`参照 | 同一入力のbyte一致まで到達 |
| T082 | `materials`参照＋v002入口 | exit 0、v002 trusted report |
| T083 | `materials`参照＋v002入口 | code 63、exit 1、v002 trusted failed report |

v002 failed reportの成果物ゼロ経路はT060で直接確認する。T082/T083の表面上の4件だけで失敗経路を未検査のままにしない。

## 10. 実装契約完全性チェック

| 項目 | 解決先 |
|---|---|
| 成果物schema・field順 | §7.2、§7.3 |
| 違反code・所有者・順序 | §3、§4 |
| 終了code | §7.4 |
| 環境固定 | 変更なし。既存B4 job正本 |
| 入出力範囲 | §2、§7.3 |
| 検査可能性 | §7.3、§8.3 |
| 工程間の受け渡し | §5.2、§7.4 |
| 観測データ取得可能性 | checker入力、builder結果、v002 report入力から取得 |
| 値レベル閉包 | §3.2、§3.3、§7.2、§7.3 |
| 参照解決 | §2.1、§7.5 |
| 件数閉包 | 69 code、85検査、95回帰を固定 |
| byte閉包 | 既存serializer/canonicalizer/hashを変更しない |
| 参照実体存在 | §2.1の3実装fileは現存確認済み |
| 承認済み文書hash | 実装前・正式検査前・完了報告前に既存標準照合 |
| candidate固有値分離 | preflight jobだけ |
| 後方互換なし | §2.2、§7.1 |

本設計から実装者判断なしに、所有者、field、v002 shape、入口、検査期待を導出できる。人間判断残件は0件である。実装時に本表から答えを導出できない事項が見つかった場合は、実装せず停止する。

## 11. 承認後の実行順

本設計が別途承認された場合だけ、次を行う。

1. §7.6の承認済み文書への改訂履歴・正本案内追記。
2. §8の3ファイル実装。
3. candidate 13 preflight jobのimplementation bindingを新実装commitへ固定。
4. 合成検査85件を先頭から一回。
5. 69違反code全発火、所有表、export集合の完全一致。
6. 回帰95件。
7. candidate 13読み取り専用preflight。
8. B4完了報告。

不合格一件でも同attemptで修正・再実行せず停止する。新しい契約矛盾、未定義判断、実測前提不一致が出た場合も停止する。

## 12. 完了条件

1. 合成85/85。
2. 69/69違反code発火。
3. 69/69所有表と検査観測の完全一致。
4. v001 reportのexport・受理・変換経路0件。
5. v002成功reportの6 binding全非null。
6. v002構築失敗reportの6 binding全null、公開0件、exit 1。
7. 回帰95/95。
8. candidate 13読み取り専用preflight全件合格。
9. 既存B3正式7ファイルと安定点`stable/b3-complete-20260725`不変。

3つの安定点条件を満たした場合だけ、既存運用どおりB4安定点tagとJOURNALを同一commitで記録する。

## 13. 承認依頼

次の一件を承認対象とする。

> candidate 13 字幕表示計画 B4 8不合格 実装修正設計v001を承認する。69違反codeへ汎用所有者規則を適用し、code 18〜20の三表現照合、壊れた元発話の親利用禁止、code 60の段階別所有、空素材台帳の`materials`参照、validation report v002への非互換改訂を本書どおり実装してよい。承認済み2文書には改訂履歴と新正本への案内だけを記録し、v001 reportのshim・暗黙変換は作らない。実装後は合成85件を先頭から一回、回帰95件、candidate 13読み取り専用preflightまで進み、不合格一件でも同attemptで直さず停止する。B5、B6、Gemini、正式表示計画、描画は含まない。
