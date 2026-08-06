# 意味／表現分離 初回run入力・crop適用 実装明確化v001

- 日付: 2026-08-03
- 親設計: `presentation-meaning-output-run-input-and-crop-application-contract-design-20260803-v001.md`
- 状態: kawafmmが承認した12 file実装を、実装者判断なしで着手できる粒度へ明確化
- 意味変更: なし。工程入場receiptによる外部共束縛、v006原本不変、crop application、旧shape非受理を維持する

## 1. 共通byte規則

正式JSONはUTF-8、BOMなし、2 space、末尾LF一つとする。既存の厳密JSON decoder、formal serializer、canonical serializer、SHA-256入口を再利用する。整数fieldは整数profile、viewportを含むartifactは既存の有限数値profileを使う。未知key、欠落key、key順違い、疎なarray、duplicate key、CRLF、末尾空白を拒否する。

JSON bindingは`schemaVersion / path / fileSha256 / canonicalSha256`、media bindingは`path / fileSha256`の順とする。pathはworkspace-relative安全path、SHAは小文字64桁である。

## 2. run-input record core API

`presentation_meaning_output_run_input_record_v001.mjs`は次をexportする。

- schema定数: record、record publication job、stage admission job、receipt、failure report。
- 固定10 stageとordinal: `01 timeline-decision / 02 b3-source-package / 03 b5-token-measurement / 04 b6-generation / 05 b1-validation / 06 meaning-package / 07 base-media / 08 output-landscape / 09 crop-application / 10 output-vertical`。
- 固定違反code順: `RUN_INPUT_PUBLICATION_JOB_INVALID / RUN_INPUT_RECORD_INVALID / RUN_INPUT_REFERENCE_MISMATCH / RUN_INPUT_PUBLICATION_TARGET_INVALID / STAGE_ADMISSION_JOB_INVALID / STAGE_ADMISSION_RECORD_BINDING_MISMATCH / STAGE_ADMISSION_TARGET_JOB_BINDING_MISMATCH / STAGE_ADMISSION_UPSTREAM_BINDING_MISMATCH / STAGE_ADMISSION_PROJECTION_MISMATCH / RUN_INPUT_PUBLICATION_FAILED / STAGE_ADMISSION_PUBLICATION_FAILED`。
- `serializePresentationMeaningOutputRunInputFormalJsonV001`
- `canonicalSha256PresentationMeaningOutputRunInputJsonV001`
- `validatePresentationMeaningOutputRunInputRecordV001`
- `validatePresentationMeaningOutputRunInputPublicationJobV001`
- `validatePresentationMeaningOutputStageAdmissionJobV001`
- `derivePresentationMeaningOutputStageProjectionV001`
- `buildPresentationMeaningOutputStageAdmissionReceiptV001`
- `validatePresentationMeaningOutputStageAdmissionReceiptV001`

record publication jobはexact 7 keyである。

```text
schemaVersion / jobId / action / record / outputRoot /
implementationBindings / executionPolicy
```

`action=publish-run-input-record`。`outputRoot`は`meaning-output-run-input-records/<recordId>`。`executionPolicy`は`oneShot / allowOverwrite`のexact 2 keyで`true / false`。implementation bindingはcoreとrunnerの2件を`path / fileSha256 / role`で持つ。

stage admission jobはexact 10 keyである。

```text
schemaVersion / jobId / action / stage / runInputRecordBinding /
targetJobBinding / upstreamBindings / outputRoot /
implementationBindings / executionPolicy
```

`action=admit-stage`。`upstreamBindings`要素は`role / schemaVersion / path / fileSha256 / canonicalSha256`のexact 5 keyで、mediaだけ`schemaVersion`と`canonicalSha256`をnullにする。role順はstage定義で固定し、余剰・欠落・順序差を拒否する。`outputRoot`は`<record root>/admissions/<ordinal>-<stage>`。`executionPolicy`はrecord jobと同じである。

receiptのexact 8 root keyは親設計どおりとする。binding objectはrecordとtarget jobにexact 4 key、upstreamはadmission jobの配列をbyte値のまま再掲する。checkは`name / status / comparedPaths`、statusは`passed`だけである。`comparedPaths`は`record:<RFC6901>`、`job:<RFC6901>`、`upstream:<role>:<RFC6901>`の文字列を比較順に持つ。receipt IDは`<recordId>-<ordinal>-<stage>-admission`。

stage別の必須upstream roleと比較責務を次へ固定する。

| stage | upstream role（順序） | 比較責務 |
|---|---|---|
| timeline-decision | なし | sourceRef、唯一segmentの開始・終了ms、組立決定binding |
| b3-source-package | `timeline-decision` | jobのdecision binding、decisionのsourceRef・唯一segment |
| b5-token-measurement | `source-package` | source package binding、支出上限currency・maximumNanoUsd |
| b6-generation | `b5-manifest` | B5 binding、send authorizationのcurrency・maximumNanoUsd |
| b1-validation | `source-package`,`b6-manifest`,`provider-envelope` | jobの3 binding完全一致、B5まで辿ったsource package |
| meaning-package | `timeline-decision`,`semantic-validation`,`semantic-selection` | decision binding、空title、B1合格binding |
| base-media | `meaning-package` | meaning package bindingと、そのsourceRef・唯一segment |
| output-landscape | `output-request`,`meaning-package`,`base-media` | 横型format、preset、幅36、identity crop、package/base binding |
| crop-application | `reviewed-crop-decision`,`reviewed-crop-selection`,`reviewed-base-media`,`reviewed-timeline`,`reviewed-generation-manifest`,`reviewed-validation-report`,`target-base-media`,`target-timeline`,`target-generation-manifest`,`target-validation-receipt` | crop jobの入力10 binding、recordのv006 binding・layout ID、旧／新base bundle |
| output-vertical | `output-request`,`meaning-package`,`base-media`,`crop-application` | 縦型format、layout、preset、幅14、application binding、package/base binding |

各stageは上表の正式schema validatorを先に通し、次に比較する。binding一致だけで内容比較を省略しない。逆に、上表にない表示値、API server実体、人間品質をreceiptへ追加しない。

CLIはjob path一引数だけを受ける。正常はexit 0で生成したrecordまたはreceiptのformal bytesをstdoutへ一件、検査済み拒否はexit 1でfailure report bytes、I/O・報告不能はexit 2とする。stderrは0 byte。成功root、admission root、failure rootは既存のstaging→no-replace publish入口を使い、既存rootを上書きしない。開始時と公開直前にrecord、target job、upstream、implementationを安定再読する。

## 3. crop application exact schema

`presentation_output_crop_application_v001.mjs`は次をexportする。

- `PRESENTATION_OUTPUT_CROP_APPLICATION_SCHEMA_V001`
- `PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_SCHEMA_V001`
- 固定違反code順: `CROP_APPLICATION_JOB_INVALID / CROP_APPLICATION_RUN_INPUT_MISMATCH / CROP_APPLICATION_REVIEWED_BINDING_MISMATCH / CROP_APPLICATION_TARGET_BINDING_MISMATCH / CROP_APPLICATION_SOURCE_IDENTITY_MISMATCH / CROP_APPLICATION_TIMELINE_MISMATCH / CROP_APPLICATION_MEDIA_GEOMETRY_MISMATCH / CROP_APPLICATION_SELECTION_PROJECTION_MISMATCH / CROP_APPLICATION_PUBLICATION_TARGET_INVALID / CROP_APPLICATION_PUBLICATION_FAILED`。
- `inspectPresentationOutputCropApplicationEnvelopeV001`
- `derivePresentationOutputCropSelectionProjectionV001`
- `buildPresentationOutputCropApplicationV001`
- `validatePresentationOutputCropApplicationV001`
- formal serializer、canonical SHA、byte SHA入口。

application rootは親設計のexact 10 keyを維持する。nested shapeを次へ固定する。

`jobBinding`はcrop application jobのJSON binding。`runInputRecordBinding`はrun-input recordのJSON binding。

`reviewedCrop`はexact 3 key。

```text
decision / selectionPackageManifest / reviewedBaseMedia
```

先頭2件はv006 JSON binding。`reviewedBaseMedia`はexact 4 key `baseMedia / timeline / generationManifest / validationReport`。baseMediaはmedia binding、残りはそれぞれ旧正式artifactのJSON bindingである。

`targetBaseMedia`は現行output base-media requestと同じexact 4 key `baseMedia / timeline / generationManifest / validationReceipt`。baseMediaはmedia binding、残りは新forward-only schemaのJSON bindingである。`inspection`や`timelineManifest`という別名は作らない。

`sourceEquivalence`はexact 7 key。

```text
guarantee / sourceRef / sourceMedia / sourceFrameClock /
segments / outputGeometry / baseMediaByteRelation
```

- `guarantee=same-source-and-timeline-only`。
- `sourceMedia`は元配信の`path / fileSha256`。
- `sourceFrameClock`は旧timelineと新timelineで完全一致したobjectを一度だけ掲載する。
- `segments`はtimeline記載順の`sourceStartMs / sourceEndMs / sourceStartFrame30 / sourceEndFrame30 / outputStartFrame / outputEndFrame` exact 6 key列。
- `outputGeometry`は`width / height / frameRate / frameCount`。frameRateはtimelineの`30/1`等の文字列、他は正整数。旧・新base mediaを既存媒体検査入口で実測し、timeline値を含め完全一致させる。
- `baseMediaByteRelation`は実SHAの一致なら`same`、不一致なら`different`。

`selectionProjection`はexact 4 key `screenLayoutId / selectedCandidateId / viewports / canonicalSha256`。先頭3値だけのobjectを既存有限数値canonical入口へ渡したSHAを4値目とする。v006 decisionのselectedPlanからのみ導出し、candidate固有値をproductionへ置かない。

`checks`は次のexact 10 keyをこの順で持ち、全値`passed`とする。

```text
runInputBinding / reviewedCropBinding / reviewedBaseMediaHashGraph /
targetBaseMediaHashGraph / sourceIdentity / sourceTimeline /
mediaGeometry / selectionProjection / outputContractReadiness /
publicationHashGraph
```

crop application jobはexact 11 key。

```text
schemaVersion / jobId / applicationId / action / runInputRecordBinding /
reviewedCrop / targetBaseMedia / runtimeProfile / outputPath /
implementationBindings / executionPolicy
```

`action=apply-reviewed-crop`。`applicationId=<jobId>-application`、`outputPath=meaning-output-crop-applications/<applicationId>/crop-application.json`。runtimeProfileは`ffmpeg / ffprobe`のexact 2 keyで、各値は`path / version / fileSha256`。implementation bindingsはcrop coreとcrop runnerの2件。executionPolicyは`oneShot / allowOverwrite / allowCropRecalculation`のexact 3 keyで`true / false / false`。

このv001がbyte来歴として束縛する実行面は、上記の直接入口2件と媒体tool 2件までである。直接入口が読み込む推移module群、Node、TSXの全実体閉包は保証しない。したがって本bindingを「crop実行graph全体のbyte同一証明」とは呼ばず、推移moduleの挙動は同じ正式検査attemptと既存回帰で観測する。35件規模の推移graph束縛は、承認済み12 file最小案の範囲外であり本実装へ追加しない。

runnerはv006 decision、selection manifest、旧base bundle、新base bundleをjobのbindingから直接安定読取する。旧selection manifestのsourceMediaと旧base mediaを照合し、旧timelineと新timeline、旧generation manifestのsourceと新generation manifestのsourceMediaBindings、両媒体の実測寸法・frame数を完全一致させる。viewportを再計算せず、既存`validatePresentationVerticalCropDecisionV001`だけを再利用する。crop filterや`buildLayoutVideoFilter`はapplication生成時に呼ばない。

CLIはjob path一引数、0/1/2、stdout一成果物、stderr 0 byte、原子的no-replace公開、全入力の公開直前再読をrun-input runnerと同じ型で実装する。

## 4. output側の二段入口

出力側はcrop applicationを次の順で扱う。

1. `cropPolicy.application`を安定読取する。
2. `inspectPresentationOutputCropApplicationEnvelopeV001`でexact envelopeだけ検査し、`reviewedCrop.decision`と`reviewedCrop.selectionPackageManifest`のbindingを得る。
3. その2 artifactをbindingから安定読取する。
4. `validatePresentationOutputCropApplicationV001`へapplication、2 artifact、requestの4件base-media binding、screen layoutを渡す。
5. passed時に返る検証済みdecisionだけを既存`buildPresentationVerticalCropFilterV001`と実crop入口へ渡す。

完全validatorのpassed返値はexact 4 keyとする。

```text
status / cropDecision / selectionProjection / applicationBindingProjection
```

`status=passed`。`cropDecision`は読んだv006 decision objectそのもの、`selectionProjection`はapplicationと同値、`applicationBindingProjection`は`schemaVersion / applicationId / targetBaseMedia / runInputRecordBinding`のexact 4 keyである。rejected返値は`status / violations`だけである。

旧`decision / selectionPackageManifest`直結cropPolicy、v003等への変換、union、fallback、selection manifestのsourceMediaを新baseへ書き換えたfixtureは全て禁止する。crop filter計算は既存`buildPresentationVerticalCropFilterV001`から`buildLayoutVideoFilter`へ至る一経路だけを維持する。

## 5. 検査と停止

親設計§6の12項目を、record/receipt test、contract/style/planner/render-plan testへ分担する。違反code集合と所有順は固定し、§6の必須負例で実際に観測したcodeだけを実測済みとして報告する。親設計にない全code発火を新しい完了条件へ追加せず、未発火codeを推測で補わない。正式検査中は同じ監視領域へ別processを書き込ませない。検査不合格一件、13番目のimplementation file、crop計算複製、既存3本tree差、契約意味の追加が必要になった時点で同attemptの修正をせず停止する。
