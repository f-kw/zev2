# A-v002 exact実装閉包 v001

日付: 2026-08-09  
対象正本: `presentation-a-v002-partial-source-atom-caption-contract-design-20260809-v001.md`  
対象裁定: 案B「一つの意味atomを一度だけ保持し、採用された元時刻片を1件以上の配列として持たせ、ZEVOが出力上の連続表示へ写す」

## 1. 目的と上限

本書は、承認済み契約の実装者判断残件を実装前に機械的に閉じる。新しい契約判断は置かない。

- 変更するproduction/test pathはexact 24件。承認上限26件以内であり、25件目以降を予備枠として使わない。
- 版付きjob、TAP、正式成果物、QC、確認ページ、報告は実行成果物であり実装path数には含めない。ただし全てpathとSHAを完成報告へ列挙する。
- 既存計算の複製は禁止する。frame/sample写像、page/line物理選択、trim/concat、描画、QCは既存正本を呼ぶ。
- API通信0回、費用US$0。目視前のstable tagは発行しない。

## 2. 実現性調査の結論

| 必要能力 | 現物 | 適用 |
|---|---|---|
| 複数採用区間のframe/sample写像 | `presentation_output_base_timeline_v001.mjs`の既存mapper | 各spanを個別に写し、新計算を作らない |
| page/lineの物理選択 | `presentation_output_page_line_planner_v001.mjs`内の既存決定的DAG | 純粋入口としてexportし、v001自身も同入口を呼ぶ |
| render planから共通描画 | `presentation_output_render_plan_v001.mjs`の`buildPresentationOutputCommonCorePlanV001`、`render_presentation_v002.mjs`の`executeValidatedPresentationDrawAndQcV001` | v002から直接再利用 |
| 描画後QC | `presentation_renderer_qc_v002.mjs` | 横型は正式QC、縦型は字幕跨ぎ診断として適用可能範囲を記録 |
| 旧v3の三候補 | 保存済みpackage input、人間結果、現行transcript、元媒体 | 101/72/80 atomと本文byte一致を再検査してfixture化 |
| 縦型正式style | `speaker_only`だけ実在 | 旧v3はゲーム画面+話者なので正式styleを偽装せず、全画面fitの字幕診断に限定 |

既存の正式ZEVO runnerは候補59固有のformal jobを要求するため直接流用しない。一方、内部の共通plan・描画・QC入口は実在し、A-v002のproof runnerから正本として呼べる。新しい描画アルゴリズムは不要である。

## 3. exact実装path 24件

| # | path | 種別 | 役割 |
|---:|---|---|---|
| 1 | `evals/clip_composition/presentation_a_source_sequence_v002.mjs` | 新規production | 人間認定removeから採用元区間列をexact補集合として構築・検査 |
| 2 | `evals/clip_composition/presentation_a_source_sequence_v002.test.mjs` | 新規test | 採用区間列14証明 |
| 3 | `evals/clip_composition/run_presentation_a_source_sequence_job_v002.mjs` | 新規production | strict job、開始/公開前再読、no-replace、0/1/2終了 |
| 4 | `evals/clip_composition/presentation_a_meaning_information_package_v002.mjs` | 新規production | atom occurrence・複数retained span・caption全量閉包を構築・検査 |
| 5 | `evals/clip_composition/presentation_a_meaning_information_package_v002.test.mjs` | 新規test | 意味package16証明 |
| 6 | `evals/clip_composition/run_presentation_a_meaning_information_package_job_v002.mjs` | 新規production | package v002のstrict formal runner |
| 7 | `evals/clip_composition/presentation_output_piecewise_timeline_v002.mjs` | 新規production | span包絡を既存mapperで出力frameへ写し、切断時間を除外 |
| 8 | `evals/clip_composition/presentation_output_piecewise_timeline_v002.test.mjs` | 新規test | piecewise写像10証明 |
| 9 | `evals/clip_composition/presentation_output_page_line_planner_v002.mjs` | 新規production | occurrence境界だけで候補を作り、既存物理選択正本へ渡す |
| 10 | `evals/clip_composition/presentation_output_page_line_planner_v002.test.mjs` | 新規test | planner v2 12証明 |
| 11 | `evals/clip_composition/presentation_output_render_plan_v002.mjs` | 新規production | 本文一回・複数frame来歴を共通描画planへ投影 |
| 12 | `evals/clip_composition/presentation_output_render_plan_v002.test.mjs` | 新規test | render plan v2 8証明 |
| 13 | `evals/clip_composition/presentation_output_page_line_planner_v001.mjs` | 既存限定修正 | 現行DAG選択を純粋入口としてexportし、v001/v002で共有 |
| 14 | `evals/clip_composition/presentation_output_page_line_planner_v001.test.mjs` | 既存限定修正 | export後のv001結果byte不変と共有入口2証明 |
| 15 | `evals/clip_composition/presentation_a_v002_layer1_v3_fixture_v001.mjs` | 新規production | 保存済み旧v3 3候補を現行atomへbyte一致で正式化 |
| 16 | `evals/clip_composition/presentation_a_v002_layer1_v3_fixture_v001.test.mjs` | 新規test | fixture 8証明 |
| 17 | `evals/clip_composition/presentation_a_v002_vertical_caption_diagnostic_v001.mjs` | 新規production | 正式presetを名乗らない1080x1920全画面fit字幕診断入力 |
| 18 | `evals/clip_composition/presentation_a_v002_vertical_caption_diagnostic_v001.test.mjs` | 新規test | 縦型診断6証明 |
| 19 | `evals/clip_composition/run_presentation_a_v002_layer1_v3_proof_job_v001.ts` | 新規production | 3 fixture×横型/縦型診断を共通trim/concat・描画・QCへ接続 |
| 20 | `evals/clip_composition/run_presentation_a_v002_layer1_v3_proof_job_v001.test.mjs` | 新規test | formal proof runner 10証明 |
| 21 | `evals/clip_composition/presentation_a_v002_review_ui_v001.mjs` | 新規support | 6本を一画面で確認し、縦型は字幕診断と明示 |
| 22 | `evals/clip_composition/presentation_a_v002_review_ui_v001.test.mjs` | 新規test | review UI 4証明 |
| 23 | `evals/clip_composition/presentation_output_render_plan_v001.mjs` | 既存限定修正 | text/indexed lines/styleから共通描画elementを作る純粋入口をexportし、v001/v002で共有 |
| 24 | `evals/clip_composition/presentation_output_render_plan_v001.test.mjs` | 既存限定修正 | export後のv001 render projection byte不変と共有入口2証明 |

## 4. 共有bindingとformal jobのexact値

### 4.1 JSON binding

全JSON bindingは次のexact 4 fieldである。

```text
schemaVersion
path
fileSha256
canonicalSha256
```

実装bindingは次のexact 3 fieldである。

```text
path
fileSha256
role
```

SHAは64桁小文字hex、pathはrepo rootからの正規相対path、schemaVersionは各decoderが名指しする固定値とする。

### 4.2 採用元区間job

root exact field:

```text
schemaVersion
jobId
sequenceId
parentSemanticInputBinding
sourceMedia
outerRange
removalDecisions
outputDirectory
implementationBindings
```

`sourceMedia`は`sourceMediaId / sourceRef / mediaBinding / sourceAtomBinding`。`mediaBinding`は`path / fileSha256`、`sourceAtomBinding`は§4.1のJSON binding。`outerRange`は`sourceMediaId / sourceStartMs / sourceEndMs`。

各removal decisionは`decisionId / verdict / evidenceBinding / sourceMediaId / sourceStartMs / sourceEndMs`。実行可能な`verdict`は人間認定済みの`remove`だけで、evidenceは保存済み人間結果へ束縛する。VAD観測はevidenceとして受理しない。出力`removalDecisionBindings`は同じ6 fieldを保持する。

旧層1 v3の人間認定を実行用に正式化する成果物は、root exact 6 fieldとする。

```text
schemaVersion
approvalId
reviewedBy
sourceProposalBinding
sourceHumanResultBinding
decisions
```

各decisionは次のexact 7 fieldである。

```text
decisionId
candidateId
verdict
seamIssueReported
sourceMediaId
sourceStartMs
sourceEndMs
```

正式化処理は、保存済みproposalと人間結果のbyteを変更しない。proposalの全3 selectionについて、`sourceVideoId`をparentの`sourceRef`、`sourcePath`をparentの媒体pathへexact照合する。正式化後は`approvalId`がparentのvideo IDに対応し、全decisionの`sourceMediaId`がparentと一致する場合だけ実行可能とする。旧v3は単一sourceの保存記録であるため、その正式化処理だけは保存済みordinal ID `source-media-000001`を出し、parentが別IDなら流用として拒否する。

採用元区間出力の`provenance`は`formalJobBinding`だけのexact 1 field。実装bindingはformal jobの中だけに一度保持し、出力へ複製しない。formal job bindingは§4.1、jobのimplementation bindingsは次の固定順である。

```text
source-sequence       evals/clip_composition/presentation_a_source_sequence_v002.mjs
source-sequence-runner evals/clip_composition/run_presentation_a_source_sequence_job_v002.mjs
strict-json           evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs
fatal-observation     evals/clip_composition/presentation_fatal_observation_v002.mjs
```

出力先は`evals/clip_composition/outputs/presentation/a-v002/source-sequences/<sequenceId>/`だけを許し、固定filenameは`presentation-adopted-source-sequence-v002.json`とする。`<sequenceId>`はjob値とexact一致し、rootは実行前に未使用でなければならない。

### 4.3 旧v3 parent semantic input

保存物から作るproof inputのroot exact field:

```text
schemaVersion
proofInputId
sourceMedia
outerRange
caption
sourceAtoms
humanApprovalBinding
```

captionは`captionId / ordinal / text / sourceAtomIds`。atomは`sourceAtomId / ordinal / text / sourceStartMs / sourceEndMs`。保存済み発話本文と現行atom連結のbyte一致以外から本文を作らない。

現行fixture transcriptの生JSONは診断用の有限小数fieldを含み、整数契約用strict canonicalizerの対象外である。新しいcanonicalizerは作らない。proof formalizerは、生JSONのbyte SHAを`sourceTranscriptByteBinding`（exact `path / fileSha256`）として保持し、文字atomの整数fieldだけを次の版付きnormalized transcriptへ一度投影する。

```text
schemaVersion
transcriptId
sourceRef
sourceTranscriptByteBinding
atoms
```

normalized atomは`sourceAtomId / ordinal / text / sourceStartMs / sourceEndMs`のexact 5 fieldで、全1890 atomを元順序のまま保持する。この成果物は既存formal serializerでbyte/canonical SHAを束縛できる。proof inputの`sourceAtomTranscriptBinding`と採用区間jobの`sourceAtomBinding`は、生JSONでなくこのnormalized transcriptを指す。生JSON自体は変更・置換せず、四保存物SHA照合の一つとして保持する。

### 4.4 意味package job

root exact field:

```text
schemaVersion
jobId
packageId
parentSemanticInputBinding
adoptedSourceSequenceBinding
title
outputDirectory
implementationBindings
```

titleは初回実証で`text='' / inputMode='none'`のexact 2 field。parentとsequenceの開始時・公開直前再読に合格した場合だけv002 packageをno-replace公開する。

意味package jobのimplementation bindingsは次の固定順である。

```text
meaning-package       evals/clip_composition/presentation_a_meaning_information_package_v002.mjs
meaning-package-runner evals/clip_composition/run_presentation_a_meaning_information_package_job_v002.mjs
source-sequence       evals/clip_composition/presentation_a_source_sequence_v002.mjs
strict-json           evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs
fatal-observation     evals/clip_composition/presentation_fatal_observation_v002.mjs
```

出力先は`evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages/<packageId>/`だけを許し、固定filenameは`zev-meaning-information-package-v002.json`とする。`<packageId>`はjob値とexact一致し、rootは実行前に未使用でなければならない。

意味package v002の`sourceMedia`は、v001と同じ媒体・identity・atom来歴の意味をforward-onlyの次のexact 6 fieldで保持する。

```text
sourceMediaId
ordinal
sourceRef
mediaBinding
sourceIdentityBinding
sourceAtomTranscriptBinding
```

v001成果物に固有の三つ組を暗黙生成せず、v001 shapeも受理しない。旧v3 proofでは、元source identityが束縛するSTT transcriptと、今回atom正本に使う現行fixture transcriptが別byteである事実を隠さず、前者を`sourceIdentityBinding`、後者から§4.3で決定的に作るnormalized transcriptを`sourceAtomTranscriptBinding`へ別々に束縛する。両者を同一SHAと偽らず、caption本文とatom時刻の閉包は後者に対して検査する。

採用区間jobの`sourceAtomBinding`とpackageの`sourceAtomTranscriptBinding`は、同一の§4.1 JSON binding値をfield名だけ変えて保持する。SHA・path・schemaVersionを再導出・置換しない。

### 4.5 proof job

proof jobは3 fixtureを入力順で保持し、各itemへ横型style bindingと縦型診断style bindingを一件ずつ持つ。横型は正式`normal-landscape-readable-pop-v001`とidentity crop。縦型は`diagnostic-full-frame-contain-v001`という診断IDで、正式preset registryへ登録しない。source media、job、上流JSON、implementationは開始時と公開直前に再読する。

proof job自身は最終出力rootの外に置く。runnerは子工程開始前に最終版付きrootを排他的に一度だけ確保し、root identityを保持する。normalized transcript、人間認定、proof input、source/meaning formal jobはそのrootへno-replaceで公開し、source sequenceとmeaning packageはそれぞれの正式runnerを実行して契約固定rootへ版付き公開する。外側のatomic rename、staging rootへの偽装、子工程の計算複製は行わない。

公開直前は、rootのdevice/inode、その時点までに公開した全proof artifactのbyte SHA、開始時入力、実装、style支援物、固定tool実体を再読照合する。失敗時は部分rootを証拠として保持し、成功時だけscratchを削除し、run recordをcompletion markerとして最後にno-replace公開する。

## 5. 固定違反所有

### 5.1 採用区間列（順序どおり10 code）

```text
A_SOURCE_SEQUENCE_JOB_INVALID
A_PARENT_SEMANTIC_INPUT_INVALID
A_REMOVAL_DECISION_INVALID
A_REMOVAL_DECISION_NOT_APPROVED
A_REMOVAL_DECISION_OUTSIDE_RANGE
A_REMOVAL_DECISION_OVERLAP
A_ADOPTED_SEQUENCE_EMPTY
A_ADOPTED_SEQUENCE_INVALID
A_SOURCE_SEQUENCE_BINDING_MISMATCH
A_SOURCE_SEQUENCE_PUBLICATION_FAILED
```

### 5.2 意味package（順序どおり13 code）

```text
A_MEANING_JOB_INVALID
A_MEANING_PARENT_INVALID
A_MEANING_SEQUENCE_INVALID
A_SOURCE_ATOM_INVALID
A_SOURCE_ATOM_ORDER_INVALID
A_SOURCE_ATOM_SPAN_MISMATCH
A_SOURCE_ATOM_FULLY_REMOVED
A_SOURCE_ATOM_TEXT_MISMATCH
A_CAPTION_COVERAGE_MISMATCH
A_CAPTION_TEXT_MISMATCH
A_MEANING_BINDING_MISMATCH
A_MEANING_PACKAGE_BYTE_INVALID
A_MEANING_PUBLICATION_FAILED
```

### 5.3 ZEVO piecewise（順序どおり8 code）

```text
OUTPUT_V002_PIECEWISE_INPUT_INVALID
OUTPUT_V002_SPAN_UNMAPPED
OUTPUT_V002_SPAN_AMBIGUOUS
OUTPUT_V002_SPAN_ORDER_INVALID
OUTPUT_V002_FRAME_GAP
OUTPUT_V002_FRAME_OVERLAP
OUTPUT_V002_ZERO_FRAME
OUTPUT_V002_FRAME_MAPPING_INVALID
```

### 5.4 planner/render/proof（順序どおり8 code）

```text
OUTPUT_V002_PLANNER_INPUT_INVALID
OUTPUT_V002_TEXT_COVERAGE_MISMATCH
OUTPUT_V002_LAYOUT_UNRESOLVED
OUTPUT_V002_RENDER_PLAN_INVALID
OUTPUT_V002_RENDER_PROJECTION_MISMATCH
OUTPUT_V002_BASE_MEDIA_INVALID
OUTPUT_V002_PUBLICATION_FAILED
OUTPUT_V002_QC_FAILED
```

検査済み拒否は終了1、I/O・tool・資源・報告不能は違反0件のfatalで終了2、正常は終了0。内側fatalは既存fatal観測性v002語彙へ接続し、生message・stack・stderr・本文を保存しない。

## 6. 検査一件表（exact 92件）

| test file | ID | 件数 | 証明 |
|---|---|---:|---|
| path 2 | `ASQ001`〜`ASQ014` | 14 | strict job、補集合、順序、no-op、VAD単独拒否、境界・重複・逆順拒否、再読、no-replace |
| path 5 | `AMP001`〜`AMP016` | 16 | 1/2/3 span、exact交差、atom一回、完全消失拒否、caption全量・順序・本文、v001拒否、再読 |
| path 8 | `OPT001`〜`OPT010` | 10 | segment包絡、既存mapper、frame接触、gap/overlap/zero/ambiguous拒否、切断時間未写像 |
| path 10 | `OPLV2001`〜`OPLV2012` | 12 | occurrence境界、短い1行優先規則、幅、安全領域、本文全量、複数segment来歴、決定性 |
| path 12 | `ORPV2001`〜`ORPV2008` | 8 | 本文一回、frame来歴、横縦意味byte共用、base media/QC/publication帰属 |
| path 14 | `OPL028`〜`OPL029` | 2 | v001結果byte不変、v001/v002が同一物理選択入口を使用 |
| path 16 | `APF001`〜`APF008` | 8 | 4保存物SHA、101/72/80 atom、本文byte、3切断時刻、人間認定、candidate59机上表現可能性 |
| path 18 | `AVD001`〜`AVD006` | 6 | 診断ID、1080x1920、全画面contain、字幕本文、正式registry非混入、品質限界表示 |
| path 20 | `APJ001`〜`APJ010` | 10 | 3×2出力、共通core、trim/concat、開始/公開前再読、no-replace、QC、0通信 |
| path 22 | `ARU001`〜`ARU004` | 4 | 6 media、対表示、縦診断明示、欠落拒否 |
| path 24 | `ORP017`〜`ORP018` | 2 | v001 render projection byte不変、v001/v002が同一element投影入口を使用 |
| **合計** |  | **92** |  |

正式attemptでは92 ID全てのTAPを版付き保存する。一つでも不合格なら同attemptで直さない。

## 7. 検査前監査と回帰

正式attempt前に次を一件表で確認する。

1. 定義/import/exportの実在。
2. catchが検査済み拒否をfatalへ潰していないこと。
3. 子processの工程値と生出力非漏洩。
4. target fileは検証済みbindingと実読取証拠からだけ導くこと。
5. no-replace競合と保存先不正のowner分離。
6. 正常/rejected/fatal実経路。
7. 固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、ネイティブ環境、Chromium起動可能。
8. 24 path以外の変更0、既存成果物への書込0。

92/92後だけ次を実行する。

- green 287/287。
- baseline 86/203、合格86・不合格117のexact一致。
- 既存5 tree SHAの一致。
- v001 plannerの処理結果projection byte一致。path 13のSHA差は承認済み来歴として別層で記録する。

## 8. 実データ出力とQC

正式出力は未使用の版付きrootへno-replaceで作る。三候補それぞれについて、人間認定済み外側区間から認定済み一切断だけを除き、切断時刻を変えない。

- 横型3本: 正式横型style、identity crop、正式QC。
- 縦型3本: 全画面contain/padの字幕跨ぎ診断。字幕本文・切断をまたぐ表示継続・音声・終端・frame維持を検査するが、正式preset品質、crop品質、公開品質を主張しない。
- 6本とも、映像frame総数と音声sample総数を採用元区間列から既存正本が導いた値へ照合する。
- 確認ページに、元切断時刻、切断atom、retained spans、横型QC、縦型診断の保証限界を候補別に表示する。

## 9. 停止条件の再確認

承認済み§10を全て維持する。特に、VAD観測だけの`remove`確定、27 path目、計算複製、正式検査不合格、軽微修正3周目、既存成果物差、API通信、費用発生で停止する。人間目視前にstable tagを発行しない。A完了報告後のO1自動接続予約は維持するが、本実装と実証には混ぜない。

## 10. 閉包判定

- exact実装path: 24/26、残り2は未使用で固定。
- exact検査: 92件。
- 未定義のschema field、違反owner、描画計算、QC入口: 0件。
- 人間判断残件: 実装前0件。実装後は6本のまとめ目視1回だけ。

本書を機械閉包記録として実装を開始する。
