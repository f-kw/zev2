# 縦型正式経路 5領域統合契約設計 v001

状態: **設計提示・人間承認待ち**

作成日: 2026-07-29

基準commit: `382670466eb7cd4ae39b40005cb2cd7ffbcc9203`

対象: 縦型preset台帳、字幕幅入力、表示計画、縦型renderer入力、費用上限

今回の実行: 設計と承認記録のみ。実装、API通信、正式台帳登録、正式成果物生成、描画は0件。

## 1. 結論

縦型の正式経路は、次の一本の配線にする。

```text
画面型とcrop decision
  → その型に対応する正式presetを台帳から1件選ぶ
  → job入力の行幅をGemini入力へ束縛し、preset安全上限以内か検査する
  → 同じ束縛値でGemini回答と表示計画を検査する
  → crop decisionを共通crop計算へ渡して1080×1920化する
  → 共通の文字描画・実画素検査・QCで字幕を焼き込む
```

画面型とpresetを工程ごとに書き直さない。**実際に使う行幅は素材・フォーマットごとの版付きjob入力を唯一の正本**とし、正式preset台帳はその文字造形で安全に描ける上限を持つ。各工程はjob由来の同じ行幅を受け渡し、presetの安全上限以内かを検査する。

v001で正式登録する画面型は`speaker_only`だけである。許可語彙には`speaker_only`、`screen_speaker`、`speaker_pair`の3型を持つが、後ろ2型は未登録として明示的に停止する。横型へ戻すfallbackは作らない。

費用は、B5で実測した入力tokenと実行日の公式Standard単価から、US$0.50以内に収まる送信上限を整数演算で決める。ただし、countTokens無課金、countTokens値が生成時prompt課金tokenの上界、送信上限がcandidate+thinking課金tokenの上界、の3点を公式確認できない場合は最初のAPI通信前で停止する。現時点の公式例ではprompt上界を保証できないため、通信可能だとはまだ記録しない。

## 2. 本来の目的との照合

目的は、candidate 59だけを縦長へ変換することではない。毎配信で、動画の種類に合う画面型とpresetを入力で選び、数分の人間確認でショートを出せる経路を作ることである。

今回の設計は、その目的へ次の点で直接つながる。

- crop、字幕幅、表示計画、描画を同じ画面型へ束縛する。
- candidate固有値を共通コードへ入れない。
- 次に`screen_speaker`と`speaker_pair`を追加するとき、台帳へ型別presetを追加できる。
- 大量の照合と費用計算は機械が行い、人間には完成動画の見た目だけを聞く。

## 3. 設計の根拠

### 3.1 人間認定済みの縦型値

認定媒体:

- `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/vertical-fullwidth-caption-review-v008.mp4`
- SHA-256: `24a632ff99acadf97c2a18762420a7db4ecbc4b4b374b9bcae3d0d41bd3fe650`
- 認定者: kawafmm
- 認定日: 2026-07-29

正式化する値:

| 項目 | 値 |
|---|---:|
| format | `vertical-short-1080x1920` |
| screen layout | `speaker_only` |
| canvas | 1080×1920、30fps |
| 安全領域 | 上38 / 右43 / 下38 / 左43 px |
| preset ID | `vertical-short-speaker-only-readable-pop-v001` |
| state ID | `caption-core-vertical-speaker-only-v001` |
| font | LINE Seed JP ExtraBold |
| font file SHA-256 | `4f20353d5ba41012fb8eaaa653d2ac46f80d63880301a6590765897bbdfedbfb` |
| 文字サイズ | 134px |
| 文字色 | `#FFFDF8` |
| 縁 | `#111827`、11px |
| 光彩 | `#000000`、17px、82% |
| 行間 | 150% |
| 位置 | bottom-center、X 0%、Y -6% |
| 最大論理幅 | 14（全角中心なら7文字） |
| 最大行数 | 2 |
| transition | `quick-fade-4f-v001` |
| 外部素材 | なし |

135pxは、同じ7文字probeの実PNG右端が1041pxとなり、安全領域右端1037pxを越えたため採用しない。134pxは実PNG右端1034pxで合格している。

### 3.2 cropの正本

入力にするcrop decision:

- `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006/crop-decision-v006.json`
- file SHA-256: `4fba3f371412310fc5122ccfb58634e390a5725aec185172bcf041dd0152a4ed`
- 選択型: `speaker_only`
- 選択候補: `speaker_only_body`

cropの計算正本は、`runner/src/screen-layout.ts`の`buildLayoutVideoFilter`だけとする。preview scriptのcrop処理を正式経路へコピーしない。callerが任意のFFmpeg filter文字列を直接渡すことも禁止する。

### 3.3 現行横型に残る固定

現行のB3、B1、B4、指示書契約には、横型presetと論理幅36の固定が残っている。B5のprompt本文はすでに入力の幅を参照しており、ここへ数値14を足す必要はない。

現行renderer requestはcrop decisionと画面型を受け取らない。したがって、任意fieldを足すだけでは正式な縦型経路にならない。

### 3.4 費用の現状

candidate 59横型の保存済み実測:

- 入力: 7,474 token
- visible output: 829 token
- thinking: 3,203 token
- 公式単価換算: US$0.041451

現行の出力上限65,536 tokenをそのまま使うと、公式Standard単価による理論上限はUS$0.502731であり、US$0.50保証は成立しない。

公式参照先（参照日2026-07-29）:

- 価格: <https://ai.google.dev/gemini-api/docs/pricing>
- token計測とmodel上限: <https://ai.google.dev/gemini-api/docs/tokens>
- countTokens APIと事前/生成時token例: <https://ai.google.dev/api/tokens>
- 課金FAQ: <https://ai.google.dev/gemini-api/docs/billing>
- thinkingの課金・制御: <https://ai.google.dev/gemini-api/docs/generate-content/thinking>
- Gemini 3.6 Flashのmodel IDと既定thinking level: <https://ai.google.dev/gemini-api/docs/latest-model>

## 4. 共通の表示方針binding

B3の新しい縦型job schemaは`presentation-caption-semantic-source-package-job-v002`とする。top-levelのexact keyは次の13件だけである。

```text
schemaVersion
jobId
artifactId
mode
gateA
implementationBinding
widthPolicyBindings
formatSelection
displayConstraintInput
expectedRuntime
expectedProjection
publication
readOnlyGuard
```

既存11 keyのnested shapeはv001と同一とし、値の変換や別名を作らない。追加2 objectのexact keyは次のとおり。

```text
formatSelection:
  format
  screenLayoutId
  presetId
  visualStateId

displayConstraintInput:
  maxLogicalWidthPerLine
  maxLinesPerMeaningGroup
  characterWidthRule
```

縦型B3 jobの`implementationBinding`は現行shape `gitCommit / files / dependencyFiles`を維持するが、値は次の固定列とする。各entryは`role / path / fileSha256`のexact 3 keyである。`gitCommit`とfile SHAは正式job作成時の実体から記録し、開始時と公開直前に再読する。

| 区分 | role | path |
|---|---|---|
| files | `packageCore` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |
| files | `packageRunner` | `evals/clip_composition/run_presentation_caption_semantic_source_package_job_v002.mjs` |
| files | `rendererTrustImplementation` | `evals/clip_composition/presentation_renderer_plan_v002.mjs` |
| dependencyFiles | `textLayoutImplementation` | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` |
| dependencyFiles | `gateACore` | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` |
| dependencyFiles | `gateARetainedSourceAtomsCore` | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` |
| dependencyFiles | `gateARunner` | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` |

横型v001 jobの`packageRunner`は引き続きv001 runnerを指し、縦型jobへ流用しない。

candidate 59の縦型jobでは、入力値を次に固定する。

```text
format = vertical-short-1080x1920
screenLayoutId = speaker_only
presetId = vertical-short-speaker-only-readable-pop-v001
visualStateId = caption-core-vertical-speaker-only-v001
maxLogicalWidthPerLine = 14
maxLinesPerMeaningGroup = 2
characterWidthRule = U+0000..U+00FF=1; other Unicode code point=2
```

別素材では`maxLogicalWidthPerLine`をjob入力で変えられる。ただし、選択presetの`maxSupportedLogicalWidthPerLine`以下でなければB3で停止する。preset版を改訂しないと幅を変えられない構造にはしない。

B3はjobの表示制約を、次の既存成果物へ同じ値で記録する。

- Geminiへ渡す意味入力の表示制約
- 候補と元文字の展開写像にある幅方針binding

B1とB4は、この2成果物がjob入力と一致し、選択presetの安全上限以内であることを確認する。compiler出力へ幅をもう一度複製しない。crop decisionはB3へ混ぜず、B4 jobが実行素材ごとに別途SHA束縛する。

縦型package manifestは`presentation-caption-semantic-source-package-manifest-v002`とする。top-level exact keyは、既存v001の12件に`formatSelection`と`displayConstraintInput`を加えた次の14件だけである。

```text
schemaVersion
packageId
artifactId
formalOutputPath
packageJobBinding
sourceGateBinding
implementationBinding
runtimeBinding
externalInputBindings
formatSelection
displayConstraintInput
contentArtifacts
contentSetCanonicalSha256
validationReportDeclaration
```

追加2 objectのshapeはjobと同じであり、package生成時にjobからbyte同一の値を写す。上記14 keyの列挙順をv002のcanonical JSON順とし、v001の既存順を暗黙に流用しない。

意味入力と展開写像は、top-level exact keyを変えず、schema versionだけをそれぞれ`presentation-caption-semantic-source-input-v002`と`presentation-caption-semantic-expansion-map-v002`へ上げる。各fieldの所有者を次に固定する。

| 値 | 唯一の入力正本 | 保存先・照合先 |
|---|---|---|
| format / screen layout / preset / state | B3 job `formatSelection` | package manifest v002だけに保存。B5/B1/B4はmanifestから読む |
| job幅 / 最大行数 / 文字幅規則 | B3 job `displayConstraintInput` | manifest v002、意味入力`displayConstraints`、展開写像`widthPolicyBinding`へ同値保存 |
| preset安全上限 | preset台帳のvisual state | job幅の上限検査にだけ使用。実際のjob幅へ上書きしない |
| crop | B4 jobが束縛するcrop decision | B3・意味入力・展開写像へ複写しない |

意味入力v002のtop-level exact keyは`schemaVersion / taskDescription / displayConstraints / containers`である。`displayConstraints`は`maxLogicalWidthPerLine / maxLinesPerMeaningGroup`のexact 2 keyで、format、preset、stateを持たない。

展開写像v002のtop-level exact keyは`schemaVersion / artifactId / sourceBindings / widthPolicyBinding / modelInputBinding / containers`である。`widthPolicyBinding`は現行のexact 12 key（`presetRegistry / presetValidationIndex / materialValidationIndex / registryBinding / rendererTrust / rendererTrustImplementation / textLayoutImplementation / presetId / visualStateId / maxLogicalWidthPerLine / maxLinesPerMeaningGroup / characterWidthRule`）を維持し、末尾5値をjob由来値へ差し替える。formatとscreen layoutは持たない。package内の残り3 content artifactは現行schemaと計算を維持する。

package validation report v002のtop-level exact keyは現行と同じ`schemaVersion / status / failureStage / jobBinding / package / manifestBinding / checks / violations / validatedContentArtifacts / observedProjection / scope`である。`observedProjection`は現行5 keyに`formatSelection / displayConstraintInput`を末尾追加し、job・manifestとの一致を記録する。v001 reportへこの2 keyを追加しない。

縦型B1 v002、B5 v002、B4 v004はmanifest v002だけを受理する。横型v001入口はmanifest v001だけを受理する。相互変換、旧版の暗黙受理、欠落fieldの補完は作らない。

数値区分:

- jobの最大論理幅: 正のsafe integer。小数点表記、指数表記、0、負数を拒否する。選択presetの安全上限以下でなければ停止する。
- 最大行数: 整数2だけ。3行は別の契約改訂を要する。
- 行の論理幅: 既存の文字幅計算による非負safe integer。
- crop座標: 既存crop decision schemaが許す有限小数。
- 時刻: 従来どおり整数ms、描画段では整数frame/sample。

5領域で新設・改訂するJSONの数値tokenは既存の単一parserで読む。JSON parse後の値だけでなく元token表記も検査する。下表の`[*]`は配列index 1 segmentだけを表し、prefix、glob、正規表現として解釈しない。記載したartifact名はparser profileの固定root IDであり、入力file名から推測しない。既存v001成果物とcrop decision v006全体は各承認済みversionの数値profileを維持し、この表を理由に受理範囲を変えない。

| profile | exact JSONPath pattern |
|---|---|
| 正整数・小数点/指数表記禁止 | `preset-registry.canvas.width`、`.height`、`.fps`、`.safeAreaPx.top/right/bottom/left`、`preset-registry.transitions[*].entry.frames`、`.exit.frames`、`preset-registry.presets[*].visualStates[*].textStyle.fontSizePx/borderWidthPx/lineSpacingPercent/glowWidthPx/glowOpacityPercent`、`.layout.maxSupportedLogicalWidthPerLine/maxLines` |
| 正整数・小数点/指数表記禁止 | `renderer-trust.layoutRules.maxSupportedLogicalWidthPerLine/maxLines`、`.canvas.width/height/fps`、`.safeAreaPx.top/right/bottom/left` |
| 正整数・小数点/指数表記禁止 | `source-package-job.displayConstraintInput.maxLogicalWidthPerLine/maxLinesPerMeaningGroup`、`source-package-manifest.displayConstraintInput.maxLogicalWidthPerLine/maxLinesPerMeaningGroup`、`semantic-source-input.displayConstraints.maxLogicalWidthPerLine/maxLinesPerMeaningGroup`、`expansion-map.widthPolicyBinding.maxLogicalWidthPerLine/maxLinesPerMeaningGroup` |
| 正整数・小数点/指数表記禁止 | `display-plan.displayConstraints.maxLogicalWidthPerLine/maxLinesPerMeaningGroup`、`instruction-set.displayConstraintBinding.maxLogicalWidthPerLine/maxLinesPerMeaningGroup`、`layout-preflight.displayConstraintBinding.maxLogicalWidthPerLine/maxLinesPerMeaningGroup`、`pair-validation-report.observedProjection.displayConstraintInput.maxLogicalWidthPerLine/maxLinesPerMeaningGroup` |
| 正整数・小数点/指数表記禁止 | `b5-job.sourceBinding.characterCount/containerCount/boundaryCandidateCount`、`b5-manifest.sourceBinding.characterCount/containerCount/boundaryCandidateCount`、`b5-job.officialVerification.inputLimit/outputLimit/inputPriceNanoUsdPerToken/outputPriceNanoUsdPerToken`、`b5-job.budgetPolicy.maximumNanoUsd/countTokensCalls/generateContentCalls/timeoutMilliseconds` |
| 整数tokenの0だけ | `b5-job.budgetPolicy.automaticRetries` |
| 正整数・小数点/指数表記禁止 | `provisional-request.generationConfig.maxOutputTokens`、`final-request.generationConfig.maxOutputTokens`、`provisional-request.generationConfig.candidateCount`、`final-request.generationConfig.candidateCount`。candidate countの値は1だけ |
| 正整数・小数点/指数表記禁止 | `count-tokens-response.totalTokens`、`count-tokens-response.promptTokensDetails[*].tokenCount`。detailはexact 1件で両値一致 |
| 正整数・小数点/指数表記禁止 | `b5-manifest.tokenDiagnosis.probeInputTokens/finalInputTokens/maximumResponseStructureByteLength`、`b5-manifest.budgetGuarantee.maximumNanoUsd/inputPriceNanoUsdPerToken/outputPriceNanoUsdPerToken/finalInputTokens/maxOutputTokens/worstCaseNanoUsd`、`b5-manifest.transport.clientTimeoutMilliseconds/countTokensCalls`、`b5-manifest.cost.maximumNanoUsd/inputPriceNanoUsdPerToken/outputPriceNanoUsdPerToken/worstCaseNanoUsd`、`b5-manifest.artifacts[*].byteLength`、`b5-stop-report.artifacts[*].byteLength`、`b5-measurement-stop-report.artifacts[*].byteLength` |
| nullable符号付き整数・小数点/指数表記禁止 | `b5-measurement-stop-report.tokenObservation.probeInputTokens/finalInputTokens/derivedMaxOutputTokens/worstCaseNanoUsd`。stage別nullabilityは§9.3一件表、観測済みtokenとworstCaseは正整数、derivedだけ0以下を許す |
| 非負整数・小数点/指数表記禁止 | `b5-measurement-stop-report.transportObservation.countTokensCalls/generateContentCalls/automaticRetries`。countTokensCallsはstage別0/1/2、他2値は0だけ |
| 整数tokenの0だけ | `b5-manifest.budgetGuarantee.countTokensChargeNanoUsd`、`b5-manifest.transport.automaticRetries/generateContentCalls`、`b5-manifest.cost.countTokensChargeNanoUsd`、`b5-stop-report.transportObservation.countTokensCalls/generateContentCalls` |
| 正整数・小数点/指数表記禁止 | `b6-manifest.response.httpStatus`、`b6-manifest.response.usageMetadata.promptTokenCount/totalTokenCount`、`b6-manifest.transport.clientTimeoutMilliseconds/generateContentCalls`、`b6-manifest.cost.inputPriceNanoUsdPerToken/outputPriceNanoUsdPerToken/promptCostNanoUsd/totalUsageCostNanoUsd`、`b6-manifest.budgetGuarantee.finalInputTokens/maxOutputTokens/maximumNanoUsd/preSendWorstCaseNanoUsd/observedPromptTokens/observedTotalTokens/observedUsageCostNanoUsd`、`b6-manifest.fixedRequestBinding.byteLength`、`b6-manifest.response.rawBinding.byteLength`、`b6-manifest.semanticOutputBinding.byteLength`、`b6-manifest.b1.jobBinding.byteLength/validationReportBinding.byteLength`、`b6-manifest.b4.jobBinding.byteLength/validationReportBinding.byteLength`、`b6-stop-report.fixedRequestBinding.byteLength`、`b6-stop-report.transport.clientTimeoutMilliseconds`、`b6-stop-report.responseBinding.httpStatus` |
| 非負整数・小数点/指数表記禁止 | `b6-stop-report.childObservation.exitCode/stdoutByteLength/stderrByteLength`。`exitCode`は0/1/2、byte長は0以上だけ |
| 整数tokenの0だけ | `b6-manifest.transport.automaticRetries`、`b6-stop-report.transport.automaticRetries` |
| 非負整数・小数点/指数表記禁止 | `b6-manifest.response.candidateCount`、`b6-manifest.response.usageMetadata.candidatesTokenCount/thoughtsTokenCount`、`b6-manifest.cost.outputCostNanoUsd`、`b6-manifest.budgetGuarantee.observedCandidateTokens/observedThinkingTokens`、`b6-manifest.b1.exitCode`、`b6-manifest.b4.exitCode`、`b6-stop-report.transport.generateContentCalls`、`b6-stop-report.responseBinding.byteLength`、`b6-stop-report.artifacts[*].byteLength`。candidate countは合格時1だけ、exit codeは0/1/2だけ、stop reportのgenerateContentCallsは`stage=pre-send`で0、`stage=transport/response-envelope/downstream`で1だけ |
| 正整数・小数点/指数表記禁止 | `vertical-render-manifest.cropResult.sourceWidth/sourceHeight/outputWidth/outputHeight/fps/frameCount`、`vertical-render-manifest.textLayout.instructionCount/lineCount/maximumObservedLogicalWidth/maximumAllowedLogicalWidth/maximumLinesPerMeaningGroup`、`vertical-render-manifest.output.durationMs/frameCount` |
| 正整数・小数点/指数表記禁止 | `pixel-equivalence-probe-input.presetProjection.canvas.width/height/fps`、`.canvas.safeAreaPx.top/right/bottom/left`、`.layout.maxSupportedLogicalWidthPerLine/maxLines`、`.textStyle.fontSizePx/borderWidthPx/lineSpacingPercent/glowWidthPx/glowOpacityPercent`、`.transition.entry.frames/exit.frames` |
| 非負整数・小数点/指数表記禁止 | `pixel-equivalence-probe-input.sourceBinding.sourceIndex` |
| nullable正整数・小数点/指数表記禁止 | `pixel-equivalence-probe-input.fontSizeOverridePx`。4 probeはnull、`width-probe-135`だけ135 |
| 正整数・小数点/指数表記禁止 | `vertical-render-failure.observedProjection.metrics.requiredInputBindingCount/requiredImplementationBindingCount/requiredRuntimeToolCount/sourceWidth/sourceHeight/sourceFrameCount/outputWidth/outputHeight/outputFpsDenominator/instructionCount/lineCount/expectedOverlayCount/expectedFrameCount/requiredQcCount` |
| 非負整数・小数点/指数表記禁止 | `vertical-render-failure.observedProjection.metrics.verifiedInputBindingCount/verifiedImplementationBindingCount/verifiedRuntimeToolCount/outputFpsNumerator/outputFrameCount/passedQcCount` |
| 正整数・小数点/指数表記禁止 | `b5-job.officialVerification.claims[*].evidence[*].utf8ByteLength`、`b5-manifest.officialVerification.claims[*].evidence[*].utf8ByteLength`、`b5-stop-report.officialVerification.claims[*].evidence[*].utf8ByteLength`、`b5-measurement-stop-report.officialVerification.claims[*].evidence[*].utf8ByteLength`。0 byte evidenceを拒否する |
| 正整数・小数点/指数表記禁止 | `b5-job.officialVerification.sources[*].snapshotByteLength`、`b5-manifest.officialVerification.sources[*].snapshotByteLength`、`b5-stop-report.officialVerification.sources[*].snapshotByteLength`、`b5-measurement-stop-report.officialVerification.sources[*].snapshotByteLength`。0 byte snapshotを拒否する |
| 非負整数・小数点/指数表記禁止 | `b5-job.officialVerification.claims[*].evidence[*].utf8ByteOffset`、`b5-manifest.officialVerification.claims[*].evidence[*].utf8ByteOffset`、`b5-stop-report.officialVerification.claims[*].evidence[*].utf8ByteOffset`、`b5-measurement-stop-report.officialVerification.claims[*].evidence[*].utf8ByteOffset`、既存cue/atomのindex、整数ms、整数frame/sample。後者は既存v001 profileのexact path集合をそのまま参照し、この設計で追加・削除しない |
| 符号付き整数・小数点/指数表記禁止 | `preset-registry.presets[*].visualStates[*].position.offsetXPercent/offsetYPercent`。認定値0/-6だけ、`-0`は拒否 |
| 符号付き整数・小数点/指数表記禁止 | `pixel-equivalence-probe-input.presetProjection.position.offsetXPercent/offsetYPercent`。認定値0/-6だけ、`-0`は拒否 |
| 有限小数・指数表記を許可 | `crop-decision.selectedPlan.viewports.<許可された型別key>[*]`、`crop-decision.selectedPlan.candidateOptions[*].viewports.<許可された型別key>[*]`、`crop-selection-package.sourceMedia.previewSecond` |
| B4内部幾何専用 | 承認済み`b4-layout-number-token-policy-v001`の整数11 patternと有限幾何18 patternをbyte同一で再利用する。第二profile、追加pattern、時刻fieldへの適用を禁止する |
| 数値を許可しない | 新設・改訂artifact内で、上記patternとそのartifactが参照する既存v001 exact patternのどちらにも一致しない数値path |

slashで併記したfield名は、表中の同じ直前objectに対する有限個のliteral展開であり、実装時は1 fieldずつsegment列へ展開して固定する。`crop-decision`と`crop-selection-package`の行は、既存v006検査を通過した値を新renderer入口で再照合するinterface profileであり、v006全体を再復号する第二schemaではない。`characterWidthRule`、SHA、ID、status等の文字列fieldは数値profileへ入れず、各成果物のexact schemaで検査する。整数時刻へ有限小数profileを適用しない。既存の認定済み表示係数とB4内部幾何の扱いは変えない。

## 5. 領域1 — 縦型preset台帳

### 5.1 台帳schema

新しい台帳は`presentation-preset-registry-v002`とする。

top-level exact keyは次の11件である。

```text
schemaVersion
registryVersion
format
screenLayoutVocabularyVersion
screenLayoutVocabulary
canvas
fontAssets
componentProvenance
transitions
endPolicies
presets
```

固定値:

```text
schemaVersion = presentation-preset-registry-v002
registryVersion = vertical-short-preset-registry-v001
format = vertical-short-1080x1920
screenLayoutVocabularyVersion = shorts-screen-layout-v001
screenLayoutVocabulary =
  speaker_only
  screen_speaker
  speaker_pair
canvas = 1080×1920 / 30fps / safe top38 right43 bottom38 left43
```

`fontAssets`は1件で、exact keyは`fontAssetId / fileName / path / sha256 / licensePath`。値は次の1件だけを登録する。

```text
fontAssetId = line-seed-jp-extra-bold-v001
fileName = LINESeedJP_A_OTF_Eb.otf
path = runner/public/font/LINESeedJP_A_OTF_Eb.otf
sha256 = 4f20353d5ba41012fb8eaaa653d2ac46f80d63880301a6590765897bbdfedbfb
licensePath = runner/public/font/OFL_LINESeedJP.txt
```

`canvas`は`width / height / fps / safeAreaPx`のexact 4 key、`safeAreaPx`は`top / right / bottom / left`のexact 4 keyである。

`componentProvenance`は次の15 pathだけを、次に示す**固定順**で持つ。正式経路で実際に呼ぶ縦型adapter、共通crop、文字model、文字PNG描画、文字CSS、行別mask描画、合成、実画素検査、QCを閉じた一件表にし、preview scriptは含めない。件数`15`と各literalを同時に検査し、記載外pathの追加、欠落、順序変更を拒否する。

```text
evals/clip_composition/render_presentation_vertical_review_v001.ts
evals/clip_composition/presentation_renderer_qc_v002.mjs
evals/clip_composition/render_presentation_v002.mjs
runner/src/remotion/Root.tsx
runner/src/remotion/components/TelopText.tsx
runner/src/remotion/index.ts
runner/src/remotion/renderer/TelopRenderer.tsx
runner/src/remotion/styles/telop.css
runner/src/remotion/utils/telop-font.ts
runner/src/screen-layout.ts
runner/src/shared/telop-glow.ts
runner/src/telop-remotion.ts
runner/src/telop/telop-line-break.ts
runner/src/telop/telop-render-model.ts
runner/src/telop/text-metrics.ts
```

各`componentProvenance` itemは`role / path / fileSha256`のexact 3 keyである。roleはpath順に`vertical-renderer / renderer-qc / renderer-core / remotion-root / telop-text / remotion-entry / telop-renderer / telop-css / telop-font / screen-layout / telop-glow / telop-remotion / telop-line-break / telop-render-model / text-metrics`を一対一で割り当てる。file SHAは台帳正式化時の各path実体から得るlowercase SHA-256で、後述のrenderer trust `rendererDependencies` 15件とkey順・値ともbyte同一でなければならない。文字列path配列、SHAなしentry、別role表を許さない。

`transitions`のentryは`transitionId / entry / exit`のexact 3 key、entry/exitは`type / frames`のexact 2 keyである。`quick-fade-4f-v001`の1件だけで、entry/exitとも`alpha-fade`・4 frameとする。`endPolicies`は`endPolicyId / rule / inventedDuration`のexact 3 keyで、次の1件だけとする。

```text
endPolicyId = resolved-target-final-atom-v001
rule = 解決済み対象に含まれる最後のsource atomのendMsで表示を終了する
inventedDuration = false
```

`presets`は1件で、exact keyは`presetId / format / screenLayoutId / styleFamily / visualStates / kindPolicies`。top-level値は`presetId = vertical-short-speaker-only-readable-pop-v001`、`format = vertical-short-1080x1920`、`screenLayoutId = speaker_only`、`styleFamily = readable-pop`だけを許す。

visual stateは1件で、exact keyは`stateId / textStyle / position / background / layout / transitionId`、`stateId = caption-core-vertical-speaker-only-v001`だけを許す。nested objectを次に固定し、列挙順をcanonical JSON順とする。

```text
textStyle:
  fontAssetId
  fontSizePx
  fontColor
  borderColor
  borderWidthPx
  lineSpacingPercent
  glowColor
  glowWidthPx
  glowOpacityPercent

position:
  preset
  alignment
  offsetXPercent
  offsetYPercent

layout:
  maxSupportedLogicalWidthPerLine
  maxLines
  singleLine
  characterWidthRule
```

`textStyle`と`position`は次のliteralだけを許し、`background`は`null`、`transitionId = quick-fade-4f-v001`とする。

```text
textStyle.fontAssetId = line-seed-jp-extra-bold-v001
textStyle.fontSizePx = 134
textStyle.fontColor = #FFFDF8
textStyle.borderColor = #111827
textStyle.borderWidthPx = 11
textStyle.lineSpacingPercent = 150
textStyle.glowColor = #000000
textStyle.glowWidthPx = 17
textStyle.glowOpacityPercent = 82
position.preset = bottom-center
position.alignment = center
position.offsetXPercent = 0
position.offsetYPercent = -6
```

`layout`の値は次のとおり。

```text
maxSupportedLogicalWidthPerLine = 14
maxLines = 2
singleLine = false
characterWidthRule = U+0000..U+00FF=1; other Unicode code point=2
```

実際に使う幅はjob入力であり、この14は人間認定済み文字造形の**安全上限**である。

`kindPolicies`はspeech-captionの1件だけで、exact keyは`kind / stateId / endResponsibility / allowedMaterialRoles / requiredMaterialRoles`。値は`kind = speech-caption`、`stateId = caption-core-vertical-speaker-only-v001`、`endResponsibility = target-anchor`、素材roleは両方とも空配列とする。

`endPolicies`は、将来preset方針で終端を決める種類を追加するための固定語彙として保持する。v001のspeech-captionはこれを参照せず、対象anchorの終端だけを正本とする。未参照のend policyをfallbackとして適用しない。

台帳に付随する3成果物もexact schemaを固定する。

| 成果物 | top-level exact key |
|---|---|
| preset validation index | `registryVersion / registeredScreenLayoutIds / presets` |
| material validation index | `registryVersion / materials` |
| trusted registry bindings v002 | `schemaVersion / presetRegistryVersion / presetValidationIndexSha256 / materialRegistryVersion / materialValidationIndexSha256 / screenLayoutVocabularyVersion` |

validation indexの`presets[]`は`presetId / format / screenLayoutId / kindPolicies`、その`kindPolicies[]`は`kind / endResponsibility / allowedMaterialRoles / requiredMaterialRoles`、speech-captionでは`endPolicyId`を持たない。material indexは空配列だけを許す。registered screen layoutは台帳のpreset列から導出する。

付随成果物の値も次に固定する。

```text
preset-validation-index.registryVersion
  = vertical-short-preset-registry-v001
material-validation-index.registryVersion
  = presentation-material-registry-empty-v001
material-validation-index.materials
  = []
trusted-registry-bindings.schemaVersion
  = presentation-registry-trust-v002
trusted-registry-bindings.presetRegistryVersion
  = vertical-short-preset-registry-v001
trusted-registry-bindings.materialRegistryVersion
  = presentation-material-registry-empty-v001
trusted-registry-bindings.screenLayoutVocabularyVersion
  = shorts-screen-layout-v001
```

### 5.2 3型の扱い

- 3型は入力語彙として認める。
- v001台帳で解決できるのは`speaker_only`だけ。
- `screen_speaker`または`speaker_pair`が来た場合、「未知語」ではなく「許可語彙だがpreset未登録」として停止する。
- 空の仮preset、横型presetへのfallback、`speaker_only`の代用は作らない。
- 将来は台帳の新versionで型別presetを追加する。既存v001を黙って編集しない。

登録済み型IDを別fieldで手入力しない。`presets[].screenLayoutId`のunique集合をpreset validation indexが決定的に導出し、v001では`["speaker_only"]`になることを検査する。これにより語彙とpreset以外の第二正本を作らない。

### 5.3 信頼binding

台帳の4成果物に加え、縦型renderer用trustを1件作る。top-level exact keyは`schemaVersion / trustVersion / rendererContractVersion / presetRegistry / registryBinding / approvedPreview / rendererDependencies / fontAssets / layoutRules / toolVersions`である。

固定version値:

```text
schemaVersion = presentation-vertical-renderer-trust-v001
trustVersion = presentation-vertical-renderer-trust-v001
rendererContractVersion = zev-renderer-boundary-v004-review
layoutRuleVersion = vertical-short-speaker-only-layout-v001
humanReapprovalRule = any-layout-value-change-requires-new-preview-and-kawafmm-approval
```

`approvedPreview`の識別値と正本pathも次に固定する。

```text
approvedPreview.previewId
  = qdczJpv8RCc-candidate-59-vertical-fullwidth-caption-preview-v008
approvedPreview.manifestPath
  = evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/preview-manifest.json
approvedPreview.manifestFileSha256
  = ecef15111403e6091d7df03c30d4542e84e1f549d142f882f0725a849f09c634
approvedPreview.mediaPath
  = evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/vertical-fullwidth-caption-review-v008.mp4
approvedPreview.mediaFileSha256
  = 24a632ff99acadf97c2a18762420a7db4ecbc4b4b374b9bcae3d0d41bd3fe650
```

上記manifestを安定読取し、`artifacts[]`がmanifest記載の10件（media、review HTML、preflight、QA frame、caption 3件、width probe 3件）と完全一致することを先に検査する。review HTMLは描画来歴へ使わず、残る9件を固定roleへ写し、manifest自身の独立binding 1件を先頭へ加えて`componentProvenance` 10件を作る。manifestにないpathを推測で補わない。

- `presetRegistry`は`registryVersion / path / fileSha256 / canonicalSha256`。
- `registryBinding`は`schemaVersion / path / fileSha256 / canonicalSha256`。
- `approvedPreview`は`previewId / manifestPath / manifestFileSha256 / mediaPath / mediaFileSha256 / componentProvenance / pixelEquivalence`。
- `approvedPreview.componentProvenance[]`は`role / path / fileSha256`で、preview v008 manifestが列挙する実体から`preview-manifest / preview-media / preview-preflight / preview-qa-frame / caption-overlay-01 / caption-overlay-02 / caption-overlay-03 / width-probe-133 / width-probe-134 / width-probe-135`の10件をこの固定順で持つ。review HTMLは見た目正本でないため含めない。
- `approvedPreview.pixelEquivalence[]`は`probeId / approvedPath / approvedFileSha256 / approvedRgbaSha256 / regeneratedRgbaSha256 / status`で、caption 3件と幅probe 134/135pxの5件を固定順で持つ。正式共通renderer、正式写像、同じfontで一時再描画し、PNG containerではなく下記の単一decoderで得た1080×1920 RGBA8 byteのSHAが一致した場合だけ`passed`にする。一時PNGはtrust生成後に消し、正式成果物へしない。

5 probeの再生成入力は、`preview-preflight` roleが指す
`evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/preflight.json`（SHA-256 `9f97665bf0010bdd3967a0b942b41f5bb09d320275aa7edc091d044f93305f1a`）から次の固定表だけで導出する。全件のcanvasは1080×1920、最大論理幅14、位置は`bottom-center / center / X 0 / Y -6`、font/色/縁/glow/行間は§3.1の正式preset値を使う。表のfont override以外をprobe専用値へ差し替えない。

| probeId | preflight source | 明示行 | font px | glow seed literal | approved component role / path / file SHA |
|---|---|---|---:|---|---|
| `caption-overlay-01` | `scenes[sceneId=fullwidth-caption-01]` | `["これやばいよね"]` | 134 | `vertical-fullwidth-caption-cue-000003` | `caption-overlay-01` / `preview-v008/overlays/caption-01-caption-cue-000003.png` / `129524f3c7f511238fd0f837223d48a98515f379fc3c3bc78c68b7a08d07b9ce` |
| `caption-overlay-02` | `scenes[sceneId=fullwidth-caption-02]` | `["やり始めるから","あっちこっちで"]` | 134 | `vertical-fullwidth-caption-cue-000006` | `caption-overlay-02` / `preview-v008/overlays/caption-02-caption-cue-000006.png` / `323c33457d40301c0f9e4c840b41111e6ab3cee64c2869f734dbabb5606f2c2c` |
| `caption-overlay-03` | `scenes[sceneId=fullwidth-caption-03]` | `["困ったもんです"]` | 134 | `vertical-fullwidth-caption-cue-000014` | `caption-overlay-03` / `preview-v008/overlays/caption-03-caption-cue-000014.png` / `d5fc8b473f1a1bb2a60fe2b994aa78572b93080751183897ae9de9e712df37b8` |
| `width-probe-134` | `typography.widthProbeText / renderedPixelSearch[fontSizePx=134]` | `["これやばいよね"]` | 134 | `vertical-fullwidth-probe-134` | `width-probe-134` / `preview-v008/overlays/qa-width-search-134px.png` / `129524f3c7f511238fd0f837223d48a98515f379fc3c3bc78c68b7a08d07b9ce` |
| `width-probe-135` | `typography.widthProbeText / renderedPixelSearch[fontSizePx=135]` | `["これやばいよね"]` | 135 | `vertical-fullwidth-probe-135` | `width-probe-135` / `preview-v008/overlays/qa-width-search-135px.png` / `5fb3eb268275ff62015b0ddd5f3da4d14b76e3a92ea5608aef0b2749bc367048` |

各sourceのscene ID、cue ID、text、lines、logicalWidth、overlay path/SHA、134/135のalpha boundsをpreflight実体と照合し、表と1 byteでも違えば再生成しない。135pxだけはfontSizeを135へ上書きするが、previewと同じ整数比の結果である縁11px・glow17pxを明示し、他の正式preset値を動かさない。glow seedは現行固定glowで画素を変えないが、preview入力の再現性のため表のliteralをそのまま渡す。probe用のscene時刻、base media、candidate 59 cropはRGBA字幕画素の入力に使わない。

表中の`preview-v008/...`は表示上の短縮である。機械入力へ保存するときは、末尾slashを持たない固定root
`evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate`
と表のsuffixを`/` 1 byteで連結したrepo相対POSIX pathへ展開する。連結前にsuffixが文字列`preview-v008/`で始まること、空segment・`.`・`..`・`\`・NULを含まないことを検査し、連結後のrealpathが固定root内のregular fileであることを確認する。manifestのrepo相対pathと展開結果がbyte同一でなければ拒否する。短縮pathを成果物へ保存しない。

各probeの`probe-input.json`はtop-level exact keyを次の固定順で持つ。

```text
schemaVersion
probeId
sourceBinding
presetProjection
lines
glowSeed
fontSizeOverridePx
runtimeProfile
```

- `schemaVersion`は`presentation-vertical-preset-pixel-equivalence-probe-input-v001`。
- `probeId`は上表の5値だけ。
- `sourceBinding`は`preflightPath / preflightFileSha256 / preflightCanonicalSha256 / sourceKind / sourceIndex / sourceIdentity / approvedPath / approvedFileSha256`のexact 8 key。`preflightPath`は本節の完全path、file SHAは本節の固定値、canonical SHAはその実体から決定的に導出する。caption 3件は`sourceKind=scene`、`sourceIndex=0/1/2`、`sourceIdentity=fullwidth-caption-01/02/03`。幅probe 2件は`sourceKind=rendered-pixel-search`、`sourceIndex=1/2`、`sourceIdentity=font-size-134/font-size-135`。`approvedPath`は上記規則で完全pathへ展開した値、SHAは表の値である。
- `presetProjection`は`presetId / stateId / format / screenLayoutId / canvas / textStyle / position / layout / transition`のexact 9 keyを持つ。`presetId / format / screenLayoutId`は台帳preset、`stateId / textStyle / position / layout`はその唯一のvisual state、`canvas`は台帳top-level、`transition`はvisual stateの`transitionId`で解決した台帳transition 1件から写す。各nested key・型・順序は§5.1の台帳schemaとbyte同一であり、`canvas.safeAreaPx`を別objectへ複写したり、probe用の別schemaを作らない。
- `lines`は上表の明示行とbyte同一の1件または2件の非空文字列配列。
- `glowSeed`は上表のliteralとbyte同一の文字列。
- `fontSizeOverridePx`は134pxの4件ではexact `null`、135pxの1件だけ整数135。overrideが`null`なら`presetProjection.textStyle.fontSizePx`を使い、135ならfontSizeだけを置換する。縁・glow・行間等の派生再計算は行わない。
- `runtimeProfile`は`node / tsx / remotion / browser`のexact 4 keyをこの順で持ち、各値はjob `runtimeProfile`の同名`path / version / fileSha256` objectとbyte同一である。正式adapterはこれら4実体だけを子process起動に使い、PATH探索や環境変数による差し替えを行わない。ImageMagickはadapterへ渡さず、親finalizerがjob `runtimeProfile.imageMagick`を使って出力PNGを復号する。

正式adapterは、上記8 top-level key以外、nested keyの欠落・追加・順序違い、数値の小数点/指数表記、runtimeProfileとjobの1 byte差を拒否する。5件は`probeId`固定順で1件ずつ別の未使用work directoryへ書き、同じ入力fileを再利用・上書きしない。

- `rendererDependencies[]`は`role / path / fileSha256`。§5.1の15 pathと同じ順で、roleは`vertical-renderer / renderer-qc / renderer-core / remotion-root / telop-text / remotion-entry / telop-renderer / telop-css / telop-font / screen-layout / telop-glow / telop-remotion / telop-line-break / telop-render-model / text-metrics`。
- `fontAssets[]`は`fontAssetId / path / fileSha256 / licensePath / licenseFileSha256`。LINE Seed JP ExtraBoldの1件だけ。
- `layoutRules`は`layoutRuleVersion / maxSupportedLogicalWidthPerLine / maxLines / characterWidthRule / canvas / safeAreaPx / humanReapprovalRule`。
- `toolVersions`は`node / tsx / remotion / browser / ffmpeg / ffprobe / imageMagick`のexact 7 keyで、各値は`path / version / fileSha256`のexact 3 keyを持つ。7値は後述のpreset finalization job `runtimeProfile`とkey順・値ともbyte同一であり、versionだけを信頼根にしない。

`layoutRules.canvas`は`width / height / fps`のexact 3 key、`layoutRules.safeAreaPx`は`top / right / bottom / left`のexact 4 keyである。値はpreset registryの`canvas.width/height/fps`とその`canvas.safeAreaPx`からkey順を変えず写し、`1080 / 1920 / 30 / top38 / right43 / bottom38 / left43`だけを許す。幅14、最大2行、文字幅規則もpreset visual stateの`layout`とbyte同一であり、trust側で別値を選べない。

preset正式化は版付きjob `presentation-vertical-preset-finalization-job-v001`だけから行う。jobのtop-level exact keyは`schemaVersion / jobId / implementationBinding / inputBindings / runtimeProfile / publication`の6件である。

- `jobId`は正式runner共通のsafe ID規則に一致し、job pathは`evals/clip_composition/outputs/presentation/vertical-preset-finalization-jobs/<jobId>.json`だけを許す。
- `implementationBinding`は`entry / localImportClosure`のexact 2 key。`entry`は`path / fileSha256`で、pathは`evals/clip_composition/finalize_presentation_vertical_speaker_only_preset_v001.mjs`だけを許す。`localImportClosure[]`は`role / path / fileSha256`のexact 3 keyを持つ1件だけで、role=`canonical-json-core`、path=`evals/clip_composition/presentation_retained_source_atoms_v001.mjs`とする。finalizerはここから既存canonical JSON/SHA処理だけをimportし、ほかのrelative runtime importを持たない。Node builtinは集合外、dynamic import、`require`、`import.meta`由来の追加local読取を拒否する。
- `inputBindings`は`previewManifest / previewPreflight / approvedMedia / font / fontLicense`のexact 5 key。preview manifestとpreflightは`path / fileSha256 / canonicalSha256`、approved media、font、font licenseは`path / fileSha256`のexact 2 keyを使い、§5.3の固定実体へ一致させる。
- `runtimeProfile`はtrust `toolVersions`と同じ7 key・同じnested shapeを持つ。
- `publication`は`presetRegistryRoot / rendererTrustRoot / finalizationReportPath`のexact 3 keyで、§13の正式rootと固定report pathだけを許す。

job作成者は、7 toolについて次の固定commandをshellなしで各1回実行し、終了0・規定stdout・stderr 0 byteを確認してからpath/version/file SHAをjobへ束縛する。Nodeは`<node.path> --version`、TSXは`<node.path> <tsx.path> --version`、Remotionは`<node.path> <remotion.path> --version`、browserは`<browser.path> --version`、FFmpeg/FFprobe/ImageMagickは各pathへ`-version`を渡す。

versionの復号は全7 toolで同じ規則に固定する。stdoutをstrict UTF-8として読み、末尾にLF 1 byteが必須、直前のCR 1 byteだけはLFと組で除き、それ以外の先頭・末尾・内部byteは一切trimしない。除去後が空、NULを含む、UTF-8不正、末尾LFが0件または2件以上なら拒否する。内部改行を含むFFmpeg等は内部改行をそのままversion文字列へ保持する。job公開前、finalizer開始時、5 probe再描画直前、2-root公開直前に同じcommand結果と同一file byte SHAを再照合する。

5 probeの生成はこのjobのruntimeProfileだけを使う。finalizerはshellを介さず、`<node.path> <tsx.path> evals/clip_composition/render_presentation_vertical_review_v001.ts --mode pixel-equivalence-probe --input <work/probe-input.json> --output <work/probe-output.png>`の固定引数列だけを起動する。probe-inputは§5.3の5行表から作る1件分のexact JSONで、正式adapterは同じ`TelopStill`写像を呼び、動画合成・QC・正式publicationを行わない。outputは未使用work内regular fileだけを許し、RGBA照合後に削除する。このprobe modeとfull render modeが呼ぶ文字写像関数は同一exportで、probe専用の文字配置・折返し・CSS処理を作らない。

trustへ記録した7 toolは、後の正式renderer job runtimeProfileと全object byte同一でなければならない。これにより、認定画素を別のNode/Remotion/browser/ImageMagickで再現しておき、正式描画だけ同versionの別binaryへ差し替える経路を閉じる。

trustと正式renderer jobのtool照合は、7 roleについて`toolVersions.<role>`とrenderer job `runtimeProfile.<role>`の`path / version / fileSha256`をobject単位でbyte同一にする。preset finalizerとrendererの双方が、開始時と公開直前に全7実体を再読し、file SHAとversion commandの結果を照合する。version一致の別binary、pathだけ同じ差し替え、finalizerとrendererで異なる実体を許さない。

配列ごとの順序正本を次に一意化する。複数配列を連結した「全体順」は作らない。

- `approvedPreview.componentProvenance`: 本節で列挙した10 roleの固定順。
- `approvedPreview.pixelEquivalence`: `caption-overlay-01 / caption-overlay-02 / caption-overlay-03 / width-probe-134 / width-probe-135`の固定順。
- `rendererDependencies`: §5.1の15 pathと、本節で対応づけた15 roleの固定順。別の順序表を持たない。
- `fontAssets`: LINE Seed JP ExtraBoldの1件。

trust構築時には、Remotionの画素生成root（`remotion-root / telop-text / remotion-entry / telop-renderer / telop-font / telop-glow / telop-line-break / telop-render-model / text-metrics`）から辿れる相対runtime importを静的に列挙し、上の依存表だけで閉じることを検査する。型だけのimport、Node builtin、`react`・`remotion`等の外部packageはこのローカル依存集合へ数えない。特に`TelopRenderer.tsx`の`../styles/telop.css`が`telop-css`へ解決することを必須とし、相対runtime importの追加・削除・別path化はtrustの版改訂と新preview認定なしに受理しない。`renderer-core`と`renderer-qc`が読み込む契約検査moduleは画素生成rootの依存表へ混ぜず、正式jobの実装束縛・import graph検査で別に監視する。

RGBAの唯一の復号入口は、trustの`toolVersions.imageMagick.path`にSHA束縛した実体をshellを介さず、次の固定引数列で起動する純粋処理とする。

```text
<toolVersions.imageMagick.path>
<inputPngPath>
-alpha
on
-colorspace
sRGB
-depth
8
-define
quantum:format=unsigned
RGBA:-
```

終了0、stderr空、stdout長`1080 * 1920 * 4` byteだけを受理する。byte列は左上を先頭とするrow-major、各pixelはstraight（非premultiplied）の`R,G,B,A`各8 bit、色は上記decoderがsRGBへ変換した値と定義する。approved PNGと再描画PNGを同じprocess実体、同じ固定引数、同じ環境で順番に復号し、stdoutを無変換でSHA-256へ渡す。FFmpeg、ImageMagickの別command、PNG chunk、OS image APIを代替正本にしない。検査は、固定2×2 RGBA fixtureの期待16 byte、5 probeのapproved/regenerated一致、decoder path/version/SHAの差し替えを含む。

preview生成scriptは正式依存へ入れない。

認定previewと正式rendererの接続は、同じtrustへ別々のSHAを並べるだけでは成立したと扱わない。上記固定decoderによる5件のRGBA一致をpreset正式化時に必須とし、1件でも不一致なら台帳とtrustを公開せず停止して、新しい実描画previewとkawafmmの再認定へ戻す。

preview v008がcrop decision v006を使った事実は**preset認定来歴**にだけ残す。実行時crop decisionは素材ごとのB4 jobが別にSHA束縛する。renderer trustへcandidate 59のcrop SHAを固定しない。

## 6. 領域2 — 字幕幅入力とB1

### 6.1 B3

既存B3の文字保持、候補生成、hash計算を唯一の正本として残す。そこへ「job入力の表示方針」と「それを検証する台帳state」を引数で渡せる純粋入口を公開する。

- 横型v001入口は、現在と同じ横型台帳を渡す。
- 縦型v002入口は、§4のbindingから縦型台帳を解決して渡す。
- 文字、時刻、候補、まとまりの計算を複製しない。
- v001をv002へ変換するshimは作らない。

### 6.2 B5

promptは、意味入力にある`maxLogicalWidthPerLine`を参照する。system instructionへ14や7文字をハードコードしない。

B5送信前に次を検査する。

- formatとscreen layoutはpackage manifest v002から読む。
- presetとstateはpackage manifest v002と展開写像で一致する。
- 幅と最大行数はpackage manifest v002、意味入力、展開写像で一致する。
- 文字幅規則はpackage manifest v002、展開写像、正式台帳stateで一致する。
- presetとstateが正式台帳で一意に解決し、job入力の幅がそのstateの安全上限以下である。
- 値が整数token規則を満たす。
- 不一致ならcountTokensを呼ばず停止する。

### 6.3 B1

縦型B1 jobは`presentation-caption-semantic-output-check-job-v002`とし、top-level exact keyは現行と同じ次の10件である。

```text
schemaVersion
jobId
artifactId
mode
implementationBinding
sourcePackageBinding
semanticOutputBinding
expectedRuntime
expectedProjection
readOnlyGuard
```

違いは、`sourcePackageBinding`がmanifest v002と7成果物を束縛し、意味入力v002・展開写像v002だけを受理する点である。v001 jobを受理する互換処理は作らない。

B1 v002 jobの`implementationBinding`は現行shapeを維持し、次の固定列だけを許す。各entryは`role / path / fileSha256`で、job作成時、B1開始時、validation reportをstdoutへ返す直前に実体を照合する。

| 区分 | role | path |
|---|---|---|
| files | `packageCore` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |
| files | `semanticCore` | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` |
| files | `semanticRunner` | `evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs` |
| dependencyFiles | `textLayoutImplementation` | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` |
| dependencyFiles | `gateACore` | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` |
| dependencyFiles | `gateARetainedSourceAtomsCore` | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` |
| dependencyFiles | `gateARunner` | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` |

横型v001 jobの`semanticRunner`は引き続きv001 runnerを指す。縦型runnerへの置換、v001/v002の同一視、生成時SHAと現在SHAの同一要求の再導入はしない。現在jobが束縛したlive SHAと実file byteの一致は維持する。

B1 v002の検査内部値と正式reportも、現行fieldを変換せず版だけを分離する。

| 区分 | schema version | top-level exact key |
|---|---|---|
| work内だけの一時compiler input | `presentation-caption-semantic-output-compiler-input-v002` | `schemaVersion / artifactId / sourcePackageBinding / semanticOutputBinding / containers` |
| 唯一の正式成果物であるvalidation report | `presentation-caption-semantic-output-validation-report-v002` | `schemaVersion / status / failureStage / jobBinding / implementationBinding / runtimeBinding / inputBindings / checks / violations / observedProjection / compilerInput / readOnlyObservation / scope` |

v002 childはwork内でv002 compiler inputを構築し、v002 report 1件をstdoutへ返す。B6だけがその生byteをB6 jobの`publication.b1ReportPath`へ正式保存する。compiler input本文を別fileへ保存しない。reportの`compilerInput`へは`status / canonicalSha256 / observedByteSha256`だけを記録し、B4が同じsource packageとsemantic outputから一時再構成して照合する。v001 jobはv001だけを生成する。v1→v2変換、v2→v1変換、schema名だけを書き換える処理は作らない。job、compiler、reportのcanonical key順は上表の列挙順とする。

変更前:

```text
各行の論理幅 <= 36
```

変更後:

```text
package manifest v002のjob入力幅
  = 意味入力の幅
  = 展開写像の幅
かつ
その一致値 <= 正式台帳で選択したstateの安全上限
かつ
各行の論理幅 <= その一致値
```

行幅超過は既存の`SEMANTIC_LINE_WIDTH_EXCEEDED`が所有する。新しく設けるのは、jobを含む三成果物のbinding不一致、preset安全上限超過、数値表記不正だけである。

横型は既存v001入口の固定36を変更しない。共有した幅比較処理へ36を渡したとき、検査結果projectionが変更前とbyte同一であることを回帰で確認する。

## 7. 領域3 — B4表示計画

縦型は次の新しい外形を使う。

- generation job: `presentation-caption-display-pair-generation-job-v002`
- display plan: `presentation-caption-display-plan-v002`
- instruction set: `zev-presentation-instruction-v004`
- instruction bundle: `presentation-instruction-bundle-v004`
- caption check report: `presentation-caption-check-report-v004`
- layout preflight: `presentation-caption-layout-preflight-v002`
- review render request: `presentation-caption-review-render-request-v004`
- pair generation manifest: `presentation-resolution-instruction-pair-generation-manifest-v002`
- pair validation report: `presentation-caption-display-pair-validation-report-v003`

generation jobのtop-level exact keyは、現行v001の14件に`cropDecisionBinding`を加えた次の15件だけである。

```text
schemaVersion
jobId
artifactId
mode
implementationBinding
sourcePackageBinding
semanticCheckBinding
retainedSourceBinding
baseMediaBinding
registryBinding
cropDecisionBinding
expectedRuntime
expectedProjection
publication
readOnlyGuard
```

`cropDecisionBinding`のexact keyは`path / fileSha256`。format、画面型、preset、state、幅、最大行数はB3 package manifest v002から読む。B4 jobへ同じ値を複写して第二の入力正本を作らない。

display plan v002のtop-level exact keyは、現行v001の10件に`formatSelection`と`displayConstraints`を加えた12件とする。

```text
schemaVersion
displayPlanId
artifactId
formatSelection
displayConstraints
sourceProvenance
atomGranularity
semanticCompilerInputBinding
sourceAtomBinding
timelineBinding
presetBinding
containers
```

`formatSelection`はpackage manifest v002の同名objectと同じ`format / screenLayoutId / presetId / visualStateId`のexact 4 key、`displayConstraints`はpackage manifest v002の`displayConstraintInput`と同じ`maxLogicalWidthPerLine / maxLinesPerMeaningGroup / characterWidthRule`のexact 3 keyである。値とkey順を変更せず決定的に写し、意味入力の2 key shapeへ縮めない。

instruction set v004のtop-level exact keyは次の12件である。

```text
schemaVersion
instructionSetId
resolutionPackageId
resolutionPackageCanonicalSha256
sourceProvenance
format
screenLayoutId
rendererContractVersion
presetRegistryBinding
materialRegistryBinding
displayConstraintBinding
instructions
```

`displayConstraintBinding`は`maxLogicalWidthPerLine / maxLinesPerMeaningGroup / characterWidthRule / sourceManifestCanonicalSha256`のexact 4 key。先頭3値はdisplay planの`displayConstraints`とbyte同一、末尾はB3 package manifest v002の実体を既存canonical JSON処理で得たSHA-256である。各instructionは現行と同じ`instructionId / trigger / kind / target / presetId / materialRefs`のexact 6 keyである。formatは`vertical-short-1080x1920`、renderer contractは`zev-renderer-boundary-v004-review`、preset IDはmanifestで選んだ1件だけを使う。

instruction bundle v004は`schemaVersion / pairId / displayPlanBinding / instructionSet / resolutionPackage`のexact 5 keyである。`displayPlanBinding`は`path / fileSha256 / canonicalSha256 / displayPlanId`、instruction setは上記schema、resolution packageは既存解決パッケージschemaをそのまま束縛する。v003 bundleの4 keyへ偽装しない。

layout preflight v002は**論理計画だけ**を検査する。top-level exact keyは`schemaVersion / status / displayPlanBinding / displayConstraintBinding / checks / violations`である。`displayPlanBinding`は`path / fileSha256 / canonicalSha256 / displayPlanId`のexact 4 key、`displayConstraintBinding`はinstruction setの同名objectとkey順・値ともbyte同一のexact 4 key、checksは`textPreservation / logicalWidth / maximumLines / positiveCueOverlap`のexact 4 keyである。134pxの物理外枠や安全領域を推測せず、物理安全性と行交差はrendererが実PNG alphaで検査する。

review render request v004のtop-level exact keyは次の15件である。

```text
schemaVersion
requestId
purpose
reviewOnly
publicationAllowed
displayPlanBinding
instructionBundleBinding
captionCheckBinding
layoutPreflightBinding
baseMediaBinding
registryBindings
cropDecisionBinding
requiredInputState
rendererEntry
expectedOutput
```

`cropDecisionBinding`はjobと同じ実体SHAを持ち、`rendererEntry`は`presentation-vertical-review-renderer-v001`だけを許す。

v004の`registryBindings`は`trustedRegistryBindings / presetRegistry / presetValidationIndex / materialValidationIndex / rendererTrust`のexact 5 keyとする。各値はpath、file SHA、canonical SHAを持つ。renderer trustを実装内の固定pathから暗黙読取しない。

review requestのnested shapeを次に固定する。

- `displayPlanBinding / instructionBundleBinding / captionCheckBinding / layoutPreflightBinding / cropDecisionBinding`: `path / fileSha256 / canonicalSha256`。
- `baseMediaBinding`: `baseMedia / timeline / generationManifest / validationReport`。baseMediaは`path / fileSha256`、残り3件は`path / fileSha256 / canonicalSha256`。
- `registryBindings`の各値: `path / fileSha256 / canonicalSha256`。
- `expectedOutput`: `state / publicationAllowed / requiredQc`。stateは`awaiting_human_visual_review`、publicationAllowedは`false`、requiredQcは既存6項目の固定順配列。
- `requiredInputState`: `presentation_caption_display_pair_passed`だけ。

正式directoryに公開する7 fileを次の一件表に固定する。「6成果物+report」とは、content 5件、generation manifest 1件、validation report 1件の合計7件を指す。

| 固定順 | filename | schema | top-level exact key |
|---:|---|---|---|
| 1 | `display-plan.json` | `presentation-caption-display-plan-v002` | 本節で固定した12 key |
| 2 | `layout-preflight.json` | `presentation-caption-layout-preflight-v002` | `schemaVersion / status / displayPlanBinding / displayConstraintBinding / checks / violations` |
| 3 | `caption-check-report.json` | `presentation-caption-check-report-v004` | `schemaVersion / checkerVersion / inputBindings / overallStatus / contract / checks / observations / scopeExclusions` |
| 4 | `instruction-bundle.json` | `presentation-instruction-bundle-v004` | `schemaVersion / pairId / displayPlanBinding / instructionSet / resolutionPackage` |
| 5 | `review-render-request.json` | `presentation-caption-review-render-request-v004` | 本節で固定した15 key |
| 6 | `pair-generation-manifest.json` | `presentation-resolution-instruction-pair-generation-manifest-v002` | `schemaVersion / generatorVersion / pairId / artifactId / jobBinding / implementationBinding / inputBindings / runtimeBinding / contentArtifacts / contentSetCanonicalSha256 / reviewState / publication` |
| 7 | `pair-validation-report.json` | `presentation-caption-display-pair-validation-report-v003` | `schemaVersion / validatorVersion / status / failureStage / jobBinding / implementationBinding / runtimeBinding / inputBindings / outputBindings / checks / violations / observedProjection / reviewState / readOnlyObservation / scope` |

generation manifestの`contentArtifacts`は1〜5をこの順で持つ。validation reportの`outputBindings`は`displayPlan / instructionBundle / captionCheckReport / layoutPreflight / reviewRenderRequest / pairGenerationManifest`のexact 6 keyである。

v002 generation manifestの`inputBindings`は、現行5 keyの末尾へcropを追加した`sourcePackageBinding / semanticCheckBinding / retainedSourceBinding / baseMediaBinding / registryBinding / cropDecisionBinding`のexact 6 keyである。先頭5 keyのnested shape・値・順序は基準commit v001と同じ、`cropDecisionBinding`は`path / fileSha256 / canonicalSha256`のexact 3 keyとする。path/file SHAはB4 jobの同名2値とbyte同一、canonical SHAはその同じcrop decision実体から導出する。

v003 validation reportの`inputBindings`は、現行6 keyの末尾へcropを追加した`sourcePackageBinding / semanticCheckBinding / retainedSourceBinding / baseMediaBinding / registryBinding / compilerInput / cropDecisionBinding`のexact 7 keyである。`cropDecisionBinding`はgeneration manifestの同名objectとkey順・値ともbyte同一である。

v003 validation reportの`observedProjection`は現行9 keyの末尾へ、次の4 keyをこの順で追加したexact 13 keyとする。

```text
sourceAtomCount
containerCount
meaningGroupCount
cueCount
lineCount
timelineSegmentCount
maximumObservedLineLogicalWidth
positiveCueOverlapCount
sourceAtomPositiveOverlapObservationCount
formatSelection
displayConstraintInput
screenLayoutBinding
cropSourceMediaBinding
```

- `formatSelection`: display planの同名exact 4 keyとbyte同一。
- `displayConstraintInput`: display planの`displayConstraints`と同じexact 3 key・同じ値。
- `screenLayoutBinding`: `packageScreenLayoutId / cropScreenLayoutId / presetScreenLayoutId / status`のexact 4 key。先頭3値はそれぞれpackage manifest、crop decision、解決済みpreset台帳から写し、全て同じ場合だけ`status = matched`。
- `cropSourceMediaBinding`: `selectionPackageManifest / cropSourceMedia / baseMedia / status`のexact 4 key。manifestは`path / fileSha256 / canonicalSha256`、後2値は`path / fileSha256`のexact 2 key、statusは両媒体bindingがbyte同一の場合だけ`matched`。

上記以外の現行nested shapeは基準commitのexact shapeを維持する。cropを別名keyへ入れる、既存keyの途中へ挿入する、validationとgenerationで別実体を指すことを禁止する。

B4は次を相互照合する。

1. package manifest v002のformat、画面型、preset、state、job幅、最大行数、文字幅規則
2. 意味入力のjob幅と最大行数
3. 展開写像のpreset、state、job幅、最大行数、文字幅規則
4. 正式台帳で一意に解決したpreset、state、安全上限、最大行数、文字幅規則
5. crop decisionの`selectedPlan.screenLayoutId`
6. crop decisionが束縛するselection packageのsource mediaとreview requestの基礎映像由来
7. instruction set、display plan、review request

全てが一致し、job幅がpreset安全上限以下のときだけreview requestを出す。

既存v003の表示計画計算をformat中立な純粋処理として公開し、横型v003と縦型v004が同じ処理を呼ぶ。v004からv003への変換、v003入力の暗黙受理、横型fallbackは作らない。

B4 v002 jobを起動する版付きrunnerを新設する。B6 v002 jobはB3 manifest v002、crop decision binding、B4 static template v002を正式入力として持ち、受理回答からB4 v002 jobを決定的に作る。crop bindingを環境変数や暗黙固定pathから補わない。B6 v001とB4 v001/v003の横型経路は変更しない。

幅超過は既存の`CUE_LINE_WIDTH_EXCEEDED`が所有する。candidate 59のjob幅14では14が合格、15が違反になる。別jobでは、そのjobに束縛した値を境界にする。最大2行は維持し、3行を拒否する。

### 7.1 B4物理違反後の局所再選択との境界

DECISIONSにある「B4物理違反を構造化して返し、対象まとまりだけを局所再分割する汎用経路」は、将来設計候補のまま維持する。candidate 59で実施した局所再選択は、人間が選択境界を版付きデータとして認定した実例であり、AIによる汎用再選択処理の実装実績ではない。

本v001は、B4が物理違反を検出した場合にvalidation reportを返して停止するところまでを正式経路とする。次の処理を暗黙に行わない。

- 同じGemini応答を機械修復する。
- 追加のGemini通信を行う。
- 違反したまとまりだけを実装内の規則で別境界へ差し替える。
- candidate 59の認定済み境界を別素材へ転用する。
- 人間認定の無い局所再選択記録をB1/B4へ正式入力として渡す。

AIによる局所再選択を正式化する場合は、対象まとまり、許可境界、他まとまりの不変SHA、選定理由、API回数、初回実走費用を差し引いた残予算、人間の事後差し戻し記録を閉じた**別の版付き契約**を要する。本設計のB5/B6は`generateContent` 1回だけを予算対象として固定しているため、その契約を追加せず局所再選択を同じUS$0.50枠へ混ぜない。これは既存の将来方針を廃止する判断ではなく、本5領域v001の保証範囲を明示するものである。

## 8. 領域4 — 縦型renderer入力と描画

### 8.1 正式入力

新しい正式入口:

- job: `presentation-vertical-review-render-job-v001`
- renderer: `presentation-vertical-review-renderer-v001`
- review request: B4の`v004`
- manifest: `presentation-vertical-review-render-manifest-v001`
- QC: `presentation-vertical-review-renderer-qc-v001`

jobのtop-level exact keyは次の6件だけとする。

```text
schemaVersion
jobId
reviewRenderRequest
implementationBindings
runtimeProfile
outputDirectory
```

`jobId`は`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`に一致する安全なIDだけを許す。正式job pathは`evals/clip_composition/outputs/presentation/vertical-review-render-jobs/<jobId>.json`とし、job作成者がwrite-exclusive・fsync後に安定再読してSHA/canonical SHAを固定する。別root、時刻由来ID、環境変数由来pathを許さない。

`reviewRenderRequest`は`path / fileSha256 / canonicalSha256`を持つ。`implementationBindings[]`は`role / path / fileSha256`のexact 3 keyで、次のroleをこの固定順で持つ。

```text
vertical-review-renderer
instruction-contract-v004
display-pair-v004
instruction-contract-v003
display-pair-v003
semantic-source-package-v001
semantic-output-v001
segmenter-boundary-v001
segmenter-preflight-v001
retained-source-atoms-v001
renderer-core
layout-inspector-v001
presentation-renderer-entry-v001
screen-layout
shared-package-manifest
shared-runtime-index
shared-runtime-common
shared-runtime-activity
shared-runtime-web-gemini-review
telop-remotion
renderer-qc
caption-contract-v002
caption-contract-v003
instruction-contract-v002
base-media-timeline-v002
renderer-plan-v002
renderer-text-layout-v001
source-speaker-policy-v001
source-speaker-registry-v001
```

roleとpathの対応を次に固定する。

| role | path |
|---|---|
| `vertical-review-renderer` | `evals/clip_composition/render_presentation_vertical_review_v001.ts` |
| `instruction-contract-v004` | `evals/clip_composition/presentation_instruction_contract_v004.mjs` |
| `display-pair-v004` | `evals/clip_composition/presentation_caption_display_pair_v004.mjs` |
| `instruction-contract-v003` | `evals/clip_composition/presentation_instruction_contract_v003.mjs` |
| `display-pair-v003` | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` |
| `semantic-source-package-v001` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |
| `semantic-output-v001` | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` |
| `segmenter-boundary-v001` | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` |
| `segmenter-preflight-v001` | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` |
| `retained-source-atoms-v001` | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` |
| `renderer-core` | `evals/clip_composition/render_presentation_v002.mjs` |
| `layout-inspector-v001` | `evals/clip_composition/inspect_presentation_render_layout_v001.ts` |
| `presentation-renderer-entry-v001` | `evals/clip_composition/presentation_renderer_entry_v001.tsx` |
| `screen-layout` | `runner/src/screen-layout.ts` |
| `shared-package-manifest` | `packages/shared/package.json` |
| `shared-runtime-index` | `packages/shared/dist/index.js` |
| `shared-runtime-common` | `packages/shared/dist/common.js` |
| `shared-runtime-activity` | `packages/shared/dist/activity.js` |
| `shared-runtime-web-gemini-review` | `packages/shared/dist/web-gemini-review.js` |
| `telop-remotion` | `runner/src/telop-remotion.ts` |
| `renderer-qc` | `evals/clip_composition/presentation_renderer_qc_v002.mjs` |
| `caption-contract-v002` | `evals/clip_composition/presentation_caption_contract_v002.mjs` |
| `caption-contract-v003` | `evals/clip_composition/presentation_caption_contract_v003.mjs` |
| `instruction-contract-v002` | `evals/clip_composition/presentation_instruction_contract_v002.mjs` |
| `base-media-timeline-v002` | `evals/clip_composition/presentation_base_media_timeline_v002.mjs` |
| `renderer-plan-v002` | `evals/clip_composition/presentation_renderer_plan_v002.mjs` |
| `renderer-text-layout-v001` | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` |
| `source-speaker-policy-v001` | `evals/clip_composition/presentation_source_speaker_policy_v001.mjs` |
| `source-speaker-registry-v001` | `evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json` |

Node側の依存検査rootは`vertical-review-renderer`と`renderer-core`の2件である。`vertical-review-renderer`はreview request v004を`display-pair-v004`の公開済み読取専用検査入口で検査し、instruction bundle v004を`instruction-contract-v004`で検査する。両v004実体は既存v003の公開済みformat中立処理を呼ぶだけとし、renderer内へ同等schema検査を複製しない。

2 rootから辿れる静的な相対runtime import、source speaker policyがmodule評価時に読むregistry JSON、rendererが直接起動・読取するlocal pathを列挙し、上表29件と、次に名指すtrust所有pathへの2 edgeだけで閉じることを検査する。`renderer-core`が定数pathとして直接起動する`layout-inspector-v001`と、そのruntime import先`presentation-renderer-entry-v001`も、縦型分岐で実際に起動しないことを理由に除外せず、静的な到達集合としてjob側へ束縛する。

job graphからtrust graphへ移る許可edgeは、`presentation-renderer-entry-v001 -> telop-text`と`presentation-renderer-entry-v001 -> text-metrics`のexact 2件だけである。この2 target以降の相対runtime import閉包は§5.3のtrust 15件が所有し、job 29件へ二重転記しない。別のjob→trust edge、逆向きedge、または同じtargetへ別pathで入るedgeを検出した場合は開始前に停止する。

型だけのimportとNode builtinはlocal集合へ数えない。第三者packageはこのjobのlocal実装集合へ数えないが、repo内workspace packageは第三者packageとして除外しない。`screen-layout`の`@zev2/shared`は、開始時と公開直前に`runner/node_modules/@zev2/shared`を`lstat/readlink/realpath`し、symlink、link text exact `../../../packages/shared`、realpath exact `<repositoryRoot>/packages/shared`を必須とする。続けて`packages/shared/package.json`の`name = @zev2/shared`、`type = module`、`exports["."].import = ./dist/index.js`を検査し、実際に評価される`dist/index.js / common.js / activity.js / web-gemini-review.js`を上表のSHAと照合する。source mapと型宣言はruntimeで評価されないため集合外である。別local module、別registry、別workspace package、dynamic import、`require`、`import.meta`由来の未登録読取を検出した場合は開始前に停止する。上表から1件でも静的到達集合または直接local path集合に属さないpathがあれば、余分なbindingとして同じく停止する。

画素生成process側の縦型adapter、Remotion root、CSS、font、文字model、glow等は§5.3のrenderer trust 15件が所有する。job 29件とtrust 15件のうち、`vertical-review-renderer / renderer-core / renderer-qc / screen-layout / telop-remotion`の5 pathは意図して二重所有する。job側は制御・起動・local依存閉包、trust側は人間認定済み画素経路の来歴を証明し、両方の期待SHAが一致しなければ拒否する。残るjob 24件とtrust 10件は重複転記しない。正式runnerはjob 29件とtrust 15件をそれぞれ開始時・公開直前に照合する。

`runtimeProfile`は`node / tsx / remotion / browser / ffmpeg / ffprobe / imageMagick`のexact 7 keyで、各値は`path / version / fileSha256`のexact 3 keyを持つ。これはpreset finalization jobとtrustのtool順と同一である。`renderId`は`jobId + "-result"`で決定し、`outputDirectory`はexact `evals/clip_composition/outputs/presentation/vertical-review-renders/<renderId>`だけを許す。未使用のregular directory pathであり、symlinkを含まず、lock/work/publish-tmpを含めて既存pathが1件でもあれば開始前に拒否する。jobから別の出力先やrender IDを受け取らない。

review request v004を唯一の上流入口とし、そこから基礎映像、timeline、instruction、display plan、縦型台帳、trust、crop decisionを全てpathとSHA-256で解決する。jobへ同じ入力一覧を複写しない。

### 8.2 crop

rendererはcrop decisionを読み、`selectedPlan.screenLayoutId`と`selectedPlan.viewports`を検査した後、`buildLayoutVideoFilter`へ入力する。

- 受理するcrop decisionは`vertical-preset-type-crop-decision-v006`だけで、top-level exact keyは`schemaVersion / status / externalApiCallsByThisScript / classification / selection / selectedPlan / provenance`。
- `status`は`passed`、`selectedPlan`のexact keyは`screenLayoutId / classificationReason / detections / viewports / displaySummary / selectedCandidateId / candidateSummary / selectionReason / candidateOptions`。
- `classification`は`responsePath / responseFileSha256 / screenLayoutId / classificationReason / candidateSetCanonicalSha256`、`selection`は`responsePath / responseFileSha256 / selectedCandidateId / reason`のexact keyである。
- v001で正式使用する`speaker_only`の`detections`は`speaker`だけ、その値は`face / body`のexact keyで、各boxは整数4件。`candidateOptions[]`は`id / label / reason / viewports`のexact keyである。
- `provenance`は`classificationWebObservation / selectionWebObservation / selectionPackageManifest / canonicalSelector`のexact 4 key。前2者は`path / fileSha256 / observer / modelLabel / observedAt`、selection packageは`path / fileSha256`である。
- `classification.screenLayoutId`、`selectedPlan.screenLayoutId`、B3 manifestの型が一致しなければ停止する。`selection.selectedCandidateId`は`selectedPlan.selectedCandidateId`およびcandidate options内の1件と一致し、そのoptionのviewportsが`selectedPlan.viewports`と一致しなければ停止する。
- `provenance.selectionPackageManifest`をSHA照合して読み、その`sourceMedia.path / fileSha256`がreview requestの`baseMediaBinding.baseMedia`と一致しなければ停止する。v006には動画ID fieldがないため、存在しない値を要求しない。別素材用の有効crop decisionを流用できない。
- selection packageの相対pathはcrop decisionの親directoryを基準に解決し、realpathが同directory内でなければ拒否する。受理schemaは`vertical-preset-type-crop-selection-package-v006`、top-level exact keyは`schemaVersion / mode / externalApiCallsByThisScript / retryCount / classification / sourceMedia / requestPackage / selectionContract / prepareManifest`、`sourceMedia`は`path / fileSha256 / previewSecond`のexact 3 keyである。
- 許可するviewport keyは型ごとに厳密に固定する。
  - `speaker_only`: `speaker`
  - `screen_speaker`: `screen / speaker`
  - `speaker_pair`: `speaker1 / speaker2`
- 各viewportは`[left, top, right, bottom]`の有限数4件で、`0 <= left < right <= 1`かつ`0 <= top < bottom <= 1`を満たす。
- 欠落key、余分なkey、NaN、Infinity、範囲外、逆転を`buildLayoutVideoFilter`へ渡す前に拒否する。同関数内のclampを入力補正として利用しない。
- crop filterを別実装しない。
- preview scriptを呼ばない。
- callerがfilter文字列を指定できる入口を作らない。
- crop後の基礎映像は1080×1920、30fps、元と同frame数、同音声packetでなければ字幕描画へ進まない。

`buildLayoutVideoFilter`へ渡す6入力も次に固定する。

| 入力 | 決定規則 |
|---|---|
| inputLabel | `[0:v]` |
| outputLabel | `layoutv` |
| sourceWidth / sourceHeight | SHA照合済みbase mediaをFFprobeした正整数。manifest記録値とも一致必須 |
| durationSeconds | base mediaの整数frame数を30で割った値。msから再丸めしない |
| screenLayout.screenLayoutId | crop decisionの`selectedPlan.screenLayoutId` |
| screenLayout.viewports | 検査済み`selectedPlan.viewports` |

返されたfilter stringを無加工でFFmpegへ渡し、そのUTF-8 byte SHA-256をmanifestへ記録する。label、duration、filter文字列をjobから任意指定できる入口は作らない。

### 8.3 文字描画

現行横型formal入口は1920×1080前提の保守的外枠検査を内部で必ず実行し、認定済み134px縦型字幕を拒否する。一方、同入口の後半にはPNGの二回描画、行mask、FFmpeg合成、反実仮想の可視性検査、frame/音声検査、QC、原子的公開という共通処理がある。この後半を縦型側へ再実装してはならない。

`evals/clip_composition/render_presentation_v002.mjs`から、**検査済みの計画とoverlay adapterを受ける下位共通描画入口**を1件だけ抽出する。

- 下位入口は、出力予約、work/staging/scratch、overlay二回描画の決定性、行mask実画素検査、FFmpeg合成、反実仮想可視性、frame/音声、QCを一度だけ所有する。
- 原子的公開は同fileの既存`publishPresentationArtifactsV002`を共有し、新しい公開処理を作らない。
- 横型wrapperは従来の保守的layout inspectorを通した後、現行`PresentationOverlayV001` adapterで下位入口を呼ぶ。横型の入力、合否、結果projectionは不変である。
- 縦型wrapperはB4の明示行、縦型台帳、実PNG安全性を検査した後、人間認定previewと同じ`TelopStill` adapterで下位入口を呼ぶ。横型inspectorをskipするだけのbooleanは作らず、adapterと前段検査の組をschemaごとに分ける。
- adapterが許す操作は`buildProps / renderStill / renderLineMask`の3つだけである。合成、QC、公開をadapterへ持ち出さない。

台帳から`TelopStill`へ渡す写像を次の一件表に固定する。

| 台帳・job | `TelopStill`入力 |
|---|---|
| `fontAssets[].fileName` | `style.fontFamily` |
| `textStyle.fontSizePx` | `style.fontSize` |
| `textStyle.fontColor` | `style.fontColor` |
| `textStyle.borderColor` | `style.borderColor` |
| `textStyle.borderWidthPx` | `style.borderWidth` |
| `textStyle.lineSpacingPercent` | `style.lineSpacing` |
| `textStyle.glowColor` | `style.glowColor` |
| `textStyle.glowWidthPx` | `style.glowWidth` |
| `textStyle.glowOpacityPercent` | `style.glowOpacity` |
| `position.preset` | `position.preset` |
| `position.alignment` | `position.alignment` |
| `position.offsetXPercent` | `position.offsetX` |
| `position.offsetYPercent` | `position.offsetY` |
| `background = null` | `background = undefined` |
| jobの`maxLogicalWidthPerLine` | `maxCharsPerLine` |
| 台帳canvas | `width / height` |
| `instructionId` | `glowSeedHint`。現v001は固定glowなので見た目を変えない |

`style`の中に別の`position`を持たせない。`runner/src/telop-remotion.ts`の正式入力型を`style: Omit<TelopVisualStyle, "position">`と、`position: TelopPositionStyle & {offsetX?: number; offsetY?: number}`へ一意にし、`Root.tsx`もoffsetを正式propとして宣言する。これにより認定値Y -6%を型外の余分fieldとして通さない。

共通の行分割処理には末尾句点の最適化がある。本文不変を守るため、描画前にB4の明示行を改行で連結して文字モデルへ渡し、戻った行列がB4の行列とbyte・順序とも完全一致することを必須にする。1文字でも消える、増える、並び替わる、自動再折返しされる場合は描画しない。文字modelへ渡す幅はpreset安全上限14ではなく、そのjobに束縛された実使用幅である。

行別の正の交差を実画素で測るため、既存の`TelopStill`共通compositionへ任意の`inspectionLineIndex`を追加する。`null`では従来とbyte同一、整数indexでは同じ文字model・位置計算のうち指定行だけをalpha maskとして描く。`Root.tsx`、`TelopRenderer.tsx`、`telop-remotion.ts`の3実体で同じpropを受け渡し、別の行配置計算は作らない。

縦型正式経路はfont fallbackを許さない。一方、横型の異常時挙動は今回変更しない。共通`TelopStill`入力に必須enum `fontFailurePolicy`を追加し、値を`strict-cancel / preserve-existing-fallback`の2つだけに固定する。縦型adapterは`strict-cancel`を必須とし、`TelopRenderer.tsx`は`ensureTelopFontLoaded`成功後に`document.fonts.check`まで確認し、失敗またはfalseなら`cancelRender`して縦型正式PNGを0件にする。横型wrapperは`preserve-existing-fallback`を明示し、現在のconsole error後のfallback挙動を維持する。field省略時のdefault、入力schemaからの推測、縦型から横型方針へのfallbackは作らない。

横型回帰は正常fontのbyte不変だけでなく、既存のfont load失敗fixtureと`document.fonts.check=false` fixtureが変更前と同じstatus・観測値になることを含める。縦型の同じ2 fixtureだけが`FONT_LOAD_FAILED / FONT_FALLBACK_DETECTED`で正式PNG 0件になる。これにより、横型契約を黙って厳格化せず縦型正式入口だけを厳格化する。

正式経路は環境変数`ZEV2_REMOTION_COMMAND`を受理しない。jobのruntime profileでpath、version、SHAを確認したNode、Remotion CLI、browser実体だけを`telop-remotion.ts`の正式入口へ渡す。`pnpm exec`、PATH検索、browser自動解決を使わず、束縛Nodeで束縛Remotion CLIを起動し、束縛browser pathを`--browser-executable`へ必ず渡す。preview用wrapperと内部の引数構築・process待機処理だけを共有し、任意commandを正式経路へ注入しない。

同じ規則をFFmpeg、FFprobe、ImageMagickにも適用する。縦型wrapperはruntime profileの絶対pathを下位共通描画入口と版中立QCへ明示的に渡し、`render_presentation_v002.mjs`の縦型呼出しではそのpathだけをspawnする。`presentation_renderer_qc_v002.mjs`も縦型呼出しでは渡されたFFprobe/ImageMagick pathだけを使う。`ffmpeg`、`ffprobe`、`magick`というPATH名、環境変数、暗黙探索へ戻らない。横型wrapperは現行の起動方法と結果projectionを維持し、この改訂を理由に保存済み横型jobへruntime fieldを後付けしない。

正式化時には、§5.3の認定caption 3件と幅probe 134/135pxをこの正式adapterで一時再描画し、§5.3でSHA束縛した唯一のImageMagick実体・固定引数・RGBA8規約でapproved/re-generatedの双方を復号する。5件全てのdecoded RGBA SHAを完全一致させる。134pxは安全領域内、135pxは右外と再確認する。これが認定previewと正式rendererの接続証拠であり、単に両方のfile SHAをtrustへ並べるだけでは合格にしない。

安全領域は、人間認定previewと同じ実PNGのalpha境界で判定する。モデルの保守的wrapper外枠へ合否正本を戻さない。

### 8.4 QC

公開するQCは既存の6項目と意味を変えない。

1. 指定presetが実際に適用された
2. 字幕行同士の正の交差がない
3. 実画素が安全領域内
4. 字幕の欠落がない
5. frame数が維持された
6. 音声が維持された

crop decision、型ID、crop計算実体、1080×1920化の照合は、描画前契約検査として別に記録する。QCの意味を増減させない。

現行`evaluatePresentationReviewRendererQcV003`はv003のplan名を内部で固定している。既存QC file内にformat中立の純粋評価入口を1件だけ公開し、横型v003 wrapperと縦型v001 wrapperの双方がそれを呼ぶ。QC計算を複製せず、横型wrapperの出力projectionを変更しない。

縦型renderer manifest v001のtop-level exact keyは次の16件である。

```text
schemaVersion
status
renderId
reviewOnly
publicReleaseAllowed
state
jobBinding
formatSelection
inputBindings
implementationBindings
runtimeProfile
cropResult
textLayout
output
requiredReviewQc
git
```

- `jobBinding`: `path / fileSha256 / canonicalSha256`。pathは上記正式job pathとbyte同一で、開始時と公開直前に同じjob実体を安定再読して3値を照合する。
- `formatSelection`: `format / screenLayoutId / presetId / visualStateId`。
- `inputBindings`: `reviewRenderRequest / baseMedia / baseMediaGenerationManifest / baseMediaTimeline / baseMediaValidationReport / displayPlan / instructionBundle / captionCheck / layoutPreflight / cropDecision / presetRegistry / presetValidationIndex / materialValidationIndex / trustedRegistryBindings / rendererTrust`。各値は`path / fileSha256 / canonicalSha256`で、媒体fileだけcanonical SHAを省く。
- `implementationBindings`: jobの同名配列29件を順序・key・値ともbyte同一で写す。描画開始前と公開直前に全29 fileを再読し、job記録SHAと一致しなければ公開しない。
- `runtimeProfile`: jobの同名object 7件を順序・key・値ともbyte同一で写す。実際に起動したpath/version/file SHAと照合し、描画終了後・公開直前に再読する。
- `cropResult`: `sourceWidth / sourceHeight / outputWidth / outputHeight / fps / frameCount / audioPacketPayloadSha256 / filterCanonicalSha256`。
- `textLayout`: `instructionCount / lineCount / allLinesByteIdentical / maximumObservedLogicalWidth / maximumAllowedLogicalWidth / maximumLinesPerMeaningGroup`。
- `output`: `videoPath / videoFileSha256 / durationMs / frameCount / audioPacketPayloadSha256 / renderPlanPath / renderPlanFileSha256 / applicationResultsPath / applicationResultsFileSha256 / qcPath / qcFileSha256 / overlays / overlaySetCanonicalSha256`。`overlays[]`は`path / fileSha256`のexact 2 keyで、render plan順に1件ずつ持つ。`durationMs`は小数秒から作らず、`floor((frameCount * 1000 + floor(fps / 2)) / fps)`をBigIntで計算する最近接整数ミリ秒（正確に半分なら正方向）とする。fpsは台帳の正整数30、frameCountは同じoutputの正整数を使う。1547 frameなら51567ms、2535 frameなら84500msになり、浮動小数の丸めや媒体duration文字列を第二正本にしない。
- `requiredReviewQc`: `state / requiredQc`。
- `git`: `head / dirty`のexact 2 key。`head`は実行開始時HEADの小文字40 hex、`dirty`は同時点の観測booleanであり、実装・入力のSHA束縛を代替しない。

review requestが束縛したtrustを安定読取した後、正式runnerは開始時と原子的公開直前の2回、`rendererTrust.rendererDependencies`全15件、`fontAssets`のfont fileとlicense file、`toolVersions`全7件の現物を再読する。各path、version、file SHA、role、固定順がtrustとrenderer job runtime profileの両方に一致する場合だけ描画・公開できる。trust JSON自体のSHA一致だけで依存現物の照合を省略しない。開始後の差し替え、CSSだけの差し替え、fontまたはlicenseの差し替え、tool実体の差し替えは`VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH`で正式成果物0件にする。

縦型v001の成果物名を次の固定表にする。既存横型の名前は変更しない。

| role | `outputDirectory`直下の固定名 |
|---|---|
| video | `presentation-vertical-review-rendered-v001.mp4` |
| overlays | `overlays/` |
| render plan | `presentation-vertical-review-render-plan-v001.json` |
| application results | `presentation-vertical-review-render-application-results-v001.json` |
| manifest | `presentation-vertical-review-render-manifest-v001.json` |
| QC | `presentation-vertical-review-render-qc-v001.json` |
| failure（予約名） | `presentation-vertical-review-render-failure-v001.json` |

`output.videoPath / renderPlanPath / applicationResultsPath / qcPath`は、それぞれjobの`outputDirectory`と上表の固定basenameをPOSIX pathとして1回だけ連結したrepo相対pathでなければならない。manifest自身も上表の固定名だけで公開する。overlay名は既存下位共通処理の決定規則（render plan順の1始まりindexを最低2桁0埋めし、`instructionId`のUTF-8 SHA-256先頭12 hexを`-`で連結した`.png`）をそのまま使い、縦型側で第二の命名処理を作らない。overlay一覧の`path / fileSha256`とcanonical SHAをmanifestへ記録し、directory実体と完全一致させる。

failureは既存共通処理と同じく単一JSONをstdoutへ返すためのschema/予約名であり、失敗時に`outputDirectory`へfileを作らない。成功時はvideo、overlays、plan、application results、QC、manifestの6 roleだけを一つのdirectory renameで公開する。失敗時は6 role全て0件、予約failure fileも0件である。

top-level literalと導出規則も固定する。

```text
schemaVersion = presentation-vertical-review-render-manifest-v001
status = passed
renderId = jobId + "-result"
reviewOnly = true
publicReleaseAllowed = false
state = review_rendered
formatSelection =
  vertical-short-1080x1920
  speaker_only
  vertical-short-speaker-only-readable-pop-v001
  caption-core-vertical-speaker-only-v001
requiredReviewQc.state = passed
requiredReviewQc.requiredQc =
  presetApplication
  lineIntersection
  safeArea
  captionCompleteness
  framePreservation
  audioPreservation
```

`renderId`はUTF-8のjob IDへ上記ASCII suffixを1回だけ連結して導出し、jobから別値を受け取らない。`formatSelection`はreview request、package manifest、crop decision、台帳の一致を確認した後の値であり、rendererが選び直さない。上記literal以外、欠落key、余分なkey、key順変更を拒否する。

QC v001のtop-level exact keyは既存と同じ`schemaVersion / status / instructionCount / checks / instructionEvidence / mediaEvidence / violations`。`checks`は`instructionApplication / layoutAndVisibility / media`、各値は`status`だけを持つ。`instructionEvidence[]`は現行v003のexact 16 key、`mediaEvidence`は`expectedFrameCount / expectedAudio / observed`を維持し、schema名だけを偽装しない。manifest/QCの配列順とkey順は列挙順をcanonical順とする。

正式runnerの共通規律:

- 終了0: 全成果物を原子的に公開し全検査合格。
- 終了1: 検査済み契約違反。単一JSONをstdoutへ出し、正式成果物は0件。
- 終了2: 使い方、I/O、実行環境、報告不能。単一JSONをstdoutへ出し、正式成果物は0件。
- stderrへsecretや入力本文を出さない。
- lock、work、publish-tmpは所有者と未使用出力先を検査し、既存正式directoryを削除・上書きしない。

## 9. 領域5 — US$0.50費用上限

### 9.1 保証対象と、現時点の停止位置

保証対象は、**この縦型1本のB5 `countTokens`群とB6 `generateContent` 1回に発生するGemini Developer APIのtoken料金合計**である。税、為替、請求書単位の丸め、Google内部のmodel実体は保証対象外であり、API token料金と同じものだと主張しない。

送信構成は次に固定する。

- API: Gemini Developer API
- model: `gemini-3.6-flash`
- tier: requestの`serviceTier`を送らず、公式既定のPaid Standard
- thinking: `medium`
- `generationConfig.candidateCount`: 整数token表記の`1`を明示。省略、0、2以上、`1.0`、`1e0`を拒否
- 入力上限: 1,048,576 token
- model出力上限: 65,536 token
- grounding、tool、cache: なし
- timeout: 600秒
- `countTokens`: probe 1回、final request 1回
- `generateContent`: 1回
- 自動再試行、model切替、回答修復、fence除去、trim: 0回

API通信の前に、実行日の公式文書から次の3保証を全て確認する。

1. 上記の2回の`models.countTokens`が明示的に無課金である。
2. countTokens要求内の`generateContentRequest`が、REST resourceを表す`model` 1 keyを除いて生成時request bodyと同じ3 key・同じbyteへ再直列化でき、そのrequestを測った`countTokens.totalTokens`が生成時に課金される`usageMetadata.promptTokenCount`の上界になる。
3. `maxOutputTokens`が、課金される`candidatesTokenCount + thoughtsTokenCount`の上界になる。

どれか1件でも公式根拠が無ければ、最初の`countTokens`より前に停止する。現時点の公式例は同じtext promptについて`countTokens=10`、生成時`promptTokenCount=11`を示しているため、**2026-07-29時点では2を満たしたと扱えず、API通信へ進めない**。課金FAQは`GetTokens`を無課金と記すが、設計対象の`models.countTokens`との同一性を本文だけから確定できないため、1も満たしたと推測しない。保存済みZEV実走で値が一致した少数例は観測に留め、上界保証や独自補正へ使わない。

### 9.2 B5の二段計測

公式保証3件が将来そろった場合だけ、次を順に1回ずつ実行する。

1. B3 packageの`taskDescription`を唯一の仕事本文とし、model、system instruction、contents、response schema、`thinkingLevel: medium`、`candidateCount: 1`、`maxOutputTokens: 65536`を持つprovisional requestを構築する。
2. そのprovisional generate requestの3 key全体にREST resourceを表す`model` 1 keyだけを加え、`countTokens.generateContentRequest`へ下記の決定的wrapper規則で入れてprobe計測する。countTokens要求とraw応答を解析前に保存し、system instructionとcontentsだけの部分計測は認めない。
3. 予算500,000,000 nanoUSD、入力単価1,500 nanoUSD/token、出力単価7,500 nanoUSD/tokenを使い、次のBigInt式で送信上限を導く。

```text
derivedMaxOutputTokens =
  min(
    65536,
    floor((500000000 - probeInputTokens * 1500) / 7500)
  )
```

4. 0以下なら停止する。正なら、その値だけを`maxOutputTokens`へ入れたfinal requestを作る。
5. final requestの3-key objectにREST resourceを表す`model` 1 keyだけを先頭追加して4-key内側objectを作り、2回目の`countTokens.generateContentRequest`へ入れる。保存後に4-key内側objectから`model`だけを除いた3-key objectを正式serializerで再直列化し、そのbyteがfinal generate requestと完全一致することを確認する。要求とraw応答は解析前に保存する。
6. 最終計測値を使い、次を満たす場合だけfinal request byteとSHAを固定する。

```text
finalInputTokens * 1500
  + derivedMaxOutputTokens * 7500
  <= 500000000
```

probeとfinalのtoken数が違っても、final式が合格すればそのfinal値を正本にする。超過時は上限を再調整して3回目を呼ばず停止する。独自の余裕、期待thinking量、過去差分は使わない。

probe/finalのcountTokens要求bodyは同じ純粋処理で作る。top-level exact keyは`generateContentRequest` 1件だけである。内側objectのexact key順は`model / systemInstruction / contents / generationConfig`で、`model = models/gemini-3.6-flash`、残る3 keyはその段階のgenerate request全体である。probeには独立したgenerate-content request artifactを作らず、保存済みprobe-count-tokens requestの4-key内側objectを唯一の証拠にする。finalでは内側から`model`だけを除いた3-key objectを既存の単一formal serializerへ渡したbyteが、正式`generate-content-request` artifactと完全一致しなければならない。

countTokens要求body全体も既存`serializePresentationCaptionB1FormalJsonV001`だけでUTF-8へ直列化する。このserializerが固定する2-space indentationと末尾LF 1 byteを使用し、BOM、先頭空白、追加末尾LF、別serializer、文字列連結によるwrapper生成を禁止する。保存したrequestを同じstrict decoderで再読し、top-level 1 key、内側4 key、model、3 key投影を検査する。finalだけはその3-key投影の再直列化byteを正式generate requestと比較してから送信する。余分key、key順違い、BOM/改行違いも`API_COST_PROBE_INVALID`で停止する。

B1が許す最大外形の回答もローカルで決定的に作る。最大JSON overheadは「全boundary candidateを各1回選択し、1 candidate = 1 meaning group = 1 line」として作り、schema合格、byte長、SHAだけを参考診断へ保存する。入力tokenizerで出力tokenを推定せず、費用保証や送信合格には使わない。

2回の`countTokens`応答は、次の同じ受入契約で読む。

- 要求は固定HTTPS endpointへのPOST、headerは`content-type: application/json`とplaceholder化した`x-goog-api-key`だけ。queryにkeyを付けない。timeout 600秒、自動再試行0回。
- HTTP statusは整数200、Content-Typeはexact `application/json; charset=UTF-8`だけを受理する。
- bodyは解析前に対応する固定raw pathへwrite-exclusive・fsyncして再読し、そのbyteを唯一の入力にする。durable保存できないbodyをtoken値へ使わない。
- rawはUTF-8 strict JSON objectで、top-level key集合は`totalTokens / promptTokensDetails`のexact 2件。object key順はAPI rawのため合否に使わず、raw byte自体は変えない。
- `totalTokens`は正のsafe integerで、元token表記に小数点・指数・符号・先頭0を許さない。
- `promptTokensDetails`はexact 1件、entryのkey集合は`modality / tokenCount`、`modality = TEXT`、`tokenCount`は`totalTokens`と同じ整数token・同じ値だけを許す。
- 欠落、余分なfield、非200、Content-Type不一致、非UTF-8、strict JSON不成立、整数token不正、detail件数/値不一致を`API_COST_PROBE_INVALID`へ帰属し、次のAPI呼出しまたはB6へ進めない。

probe/finalのraw受入、token導出、予算計算は同じ純粋処理を呼び、response別のparserを作らない。raw保存後にだけ値を導出し、rawのtrim、fence除去、field補完、文字列から数値への変換をしない。

### 9.3 B5/B6成果物schema

B5 v002 jobのtop-level exact keyは次の8件である。

```text
schemaVersion
jobId
sourceBinding
requestBuilderBinding
upstreamProjection
outputDirectory
officialVerification
budgetPolicy
```

- `schemaVersion = presentation-caption-gate-b5-initial-job-v002`だけを許し、v001 jobを受理・変換しない。
- `sourceBinding`: `path / fileSha256 / canonicalSha256 / packageManifestPath / packageManifestFileSha256 / packageManifestCanonicalSha256 / characterCount / containerCount / boundaryCandidateCount`のexact 9 key。先頭3値はB3 package内の`semantic-source-input.json`、次の3値は同じB3 packageの`package-manifest.json`を指す。
- `requestBuilderBinding`: `entry / localImportClosure`のexact 2 key。`entry`は`path / fileSha256`で、pathは`evals/clip_composition/run_presentation_caption_gate_b5_initial_v002.mjs`だけ。`localImportClosure[]`は`role / path / fileSha256`のexact 3 keyで、次の固定順15件だけを持つ。

| role | path |
|---|---|
| `sharedBuilder` | `evals/clip_composition/run_presentation_caption_gate_b5_v004.mjs` |
| `sourcePackageCore` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |
| `textLayoutImplementation` | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` |
| `gateACore` | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` |
| `gateARetainedSourceAtomsCore` | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` |
| `gateARunner` | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` |
| `staticPreflightRunner` | `evals/clip_composition/run_presentation_caption_display_pair_static_preflight_v001.mjs` |
| `displayPairCoreV003` | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` |
| `semanticCore` | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` |
| `instructionCoreV003` | `evals/clip_composition/presentation_instruction_contract_v003.mjs` |
| `captionCoreV003` | `evals/clip_composition/presentation_caption_contract_v003.mjs` |
| `timelineV002` | `evals/clip_composition/presentation_base_media_timeline_v002.mjs` |
| `sourceSpeakerPolicy` | `evals/clip_composition/presentation_source_speaker_policy_v001.mjs` |
| `sourceSpeakerRegistry` | `evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json` |
| `apiCostGuard` | `evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs` |

開始時と正式公開直前にentryと15件を再読し、静的local importとmodule評価時の同期registry読取がこの集合で閉じることを検査する。複数moduleから同じpathへ到達してもbindingは1件だけ持つ。Node builtinは集合外、別local import・dynamic import・`require`・`import.meta`由来の未登録読取は拒否する。v002 runner自身を未束縛のwrapperにしない。二段計測のraw受入、BigInt上限導出、費用照合は`apiCostGuard`だけを正本にし、runner内へ複製しない。
- `upstreamProjection`: `sentinelPath / expectedCanonicalSha256`のexact 2 key。sentinelPathは`evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/`とjob IDと`.json`を1回ずつ連結した未使用path、expected値は承認済み`inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001`が同pathを除外して返す正式root projectionのcanonical SHAである。実行中に同pathを生成せず、開始時・公開直前のprojection一致を必須とする。
- `officialVerification`: `modelId / modelResource / observedAt / inputLimit / outputLimit / tier / inputPriceNanoUsdPerToken / outputPriceNanoUsdPerToken / sources / claims`。
- `sources[]`: `sourceId / url / observedAt / snapshotPath / snapshotFileSha256 / snapshotByteLength`のexact 6 key。保存した公式本文snapshot以外を根拠にせず、開始時にfile SHAと正整数byte長の両方をjob記録と照合する。
- `claims[]`: `claimId / verdict / evidence`。`evidence[]`は`sourceId / utf8ByteOffset / utf8ByteLength / excerptSha256 / locatorLabel`のexact 5 keyで、snapshotの生UTF-8 byte sliceを正規化せず照合する。
- claim IDは`model-exists / input-limit / output-limit / standard-input-price / standard-output-price / service-tier-omission-standard / count-tokens-unbilled / count-tokens-upper-bounds-prompt-billing / max-output-upper-bounds-candidate-plus-thinking`の9件をこの固定順で1回ずつ持つ。
- verdictは`verified / unverified / contradicted`だけである。`verified`と`contradicted`はevidence 1件以上を必須、`unverified`は0件を許す。source IDの未解決、重複claim、snapshot SHA、byte範囲、excerpt SHAの不一致を拒否する。
- `budgetPolicy`: `currency / maximumNanoUsd / chargeScope / countTokensCalls / generateContentCalls / automaticRetries / timeoutMilliseconds`。

`budgetPolicy`のliteralは`currency = USD`、`maximumNanoUsd = 500000000`、`chargeScope = one-vertical-caption-run-count-tokens-and-generate-content-token-fees`、`countTokensCalls = 2`、`generateContentCalls = 1`、`automaticRetries = 0`、`timeoutMilliseconds = 600000`だけを許す。ここでの生成1回はB5自身の実行回数ではなく、B5とB6を合わせた保証対象計画である。

`officialVerification`の値は`modelId = gemini-3.6-flash`、`modelResource = models/gemini-3.6-flash`、`inputLimit = 1048576`、`outputLimit = 65536`、`tier = PAID_STANDARD_DEFAULT_BY_OMISSION`、`inputPriceNanoUsdPerToken = 1500`、`outputPriceNanoUsdPerToken = 7500`へ固定する。`observedAt / sources / claims`は後述の保存snapshotと時刻契約から導出する。B5 ready manifestの同名objectは、各sourceの`snapshotPath`だけを§9.3の正式copy pathへ決定的に置き換え、残るtop-level値、各sourceの残る5値、claimsをjobから値不変で写す。object全体のbyte同一は要求しない。`budgetGuarantee`と`cost`の単価はこのobjectと一致し、`countTokensChargeNanoUsd = 0`、`worstCaseNanoUsd`は§9.2のBigInt式による同じ値でなければならない。

`jobId`は正規表現`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`に一致し、`outputDirectory`は`evals/clip_composition/outputs/presentation/caption-gate-b5/`とjob IDを1回だけ連結した未使用directoryでなければならない。別のattempt ID、環境変数、CLI引数、時刻から保存先を導出しない。

`sources[]`は`pricing / tokens-guide / count-tokens-api / billing / thinking / latest-model`の6 source IDをこの固定順で持ち、URLは§3.4の同じ順の6 URLへ一対一で固定する。追加source、URL redirect先への黙った置換、順序変更を拒否する。

公式snapshotはB5の**入力**と正式出力を同じpathにしない。jobの各`snapshotPath`は、次の入力rootと固定basenameだけから導出する。

```text
inputSnapshotRoot =
  evals/clip_composition/inputs/presentation/gemini-api-official-snapshots/<jobId>/
```

| source ID | 入力basename |
|---|---|
| `pricing` | `pricing.snapshot.html` |
| `tokens-guide` | `tokens-guide.snapshot.html` |
| `count-tokens-api` | `count-tokens-api.snapshot.html` |
| `billing` | `billing.snapshot.html` |
| `thinking` | `thinking.snapshot.html` |
| `latest-model` | `latest-model.snapshot.html` |

入力rootは既存の読み取り専用directoryで、B5の正式`outputDirectory`とは異なるrealpathでなければならない。B5開始時に6入力を同一file descriptorから安定読取し、job記録SHA・byte長と照合する。合格したbyteだけをwork directoryの`official/`固定basenameへ一度書き、fsync後に再読して入力byte SHAと完全一致させる。ready manifestまたはstop reportが成立する場合だけ、他の成果物と同じ一回のdirectory renameで正式`outputDirectory`へ公開する。入力snapshotを移動・削除・上書きせず、出力側から入力側を参照するsymlinkも禁止する。これにより、実行前未使用の出力先と、事前束縛済み公式資料を両立させる。

B5 jobの`sources[].snapshotPath`は読み取り専用入力rootを指す。B5 ready manifestと2種類のstop reportでは、各sourceの`sourceId / url / observedAt / snapshotFileSha256 / snapshotByteLength`とclaimsをjobから値不変で写す一方、`snapshotPath`だけを当該attemptの`outputDirectory/official/<固定basename>`へ決定的に置き換える。入力pathと正式copy pathは別物であり、object全体のbyte同一を要求しない。manifest/report公開直前に、6つの正式copyを入力snapshotとbyte完全一致させる。B6はB5 manifestが指す**正式copy 6件だけ**を開始時と送信直前に再読し、入力rootへ戻らない。公式保証stop/measurement stopの検査も同じ正式copyを指す。

evidenceの選択に実装者の意味判断を残さない。`verified`または`contradicted`のclaimは、下表で指定したsource snapshot全体をstrict UTF-8 byteとして1件だけ参照し、`utf8ByteOffset = 0`、`utf8ByteLength = snapshotのbyte長`、`excerptSha256 = snapshotFileSha256`、`locatorLabel = whole-snapshot:<sourceId>`とする。`unverified`のevidenceは空配列である。

| claim ID | evidence source |
|---|---|
| `model-exists` | `latest-model` |
| `input-limit` | `latest-model` |
| `output-limit` | `latest-model` |
| `standard-input-price` | `pricing` |
| `standard-output-price` | `pricing` |
| `service-tier-omission-standard` | `pricing` |
| `count-tokens-unbilled` | なし |
| `count-tokens-upper-bounds-prompt-billing` | `tokens-guide` |
| `max-output-upper-bounds-candidate-plus-thinking` | なし |

このwhole-snapshot bindingは、人間が固定したverdictの意味を機械が再判定するものではない。snapshotがstrict UTF-8でない、0 byte、またはSHA不一致ならverified/contradictedへ進めず停止する。

v001の9 claimは、設計時に確認した公式資料に基づき次へ固定し、実装やrunnerが変更してはならない。

```text
model-exists = verified
input-limit = verified
output-limit = verified
standard-input-price = verified
standard-output-price = verified
service-tier-omission-standard = verified
count-tokens-unbilled = unverified
count-tokens-upper-bounds-prompt-billing = contradicted
max-output-upper-bounds-candidate-plus-thinking = unverified
```

この3件が全て`verified`でないため、v001実装は決定的に最初の`countTokens`前で停止する。将来、公式資料が変わって送信可能にする場合は、新snapshotと人間認定したverdictを持つ新しい契約versionを承認する。実行時にAIが文言を意味判定してv001のverdictを変えない。

機械検査が証明するのは、人間認定されたverdictと保存snapshot/excerpt byteの同一性までである。公式文言の意味的真実やGoogle内部の課金実体を暗号学的に証明するものではない。

全ての`executionStartedAt`と`observedAt`は、正規表現`^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$`に一致し、実在するUTC日時へ厳密復号できるRFC 3339表記だけを許す。B5 runnerはfile読取・成果物作成・外部通信より前に時計を1回読み、その値をB5 manifestの`executionStartedAt`へ固定する。各sourceの`observedAt`はsnapshot取得時刻、`officialVerification.observedAt`は6 sourceの最大時刻とする。6 source、official verification、B5開始時刻を`Asia/Tokyo`へ変換した暦日が全て一致しなければ、最初の`countTokens`前で停止する。B6も開始時刻を同じ規則で1回だけ記録し、そのAsia/Tokyo暦日がB5開始日と6 sourceの暦日に一致しなければ送信前停止する。日跨ぎを暗黙許容しない。

B5 manifest v002は、公式保証3件が全て成立し、countTokens 2回と送信上限計算まで完了した`ready-for-b6`状態だけを表す。top-level exact keyは次の17件である。

```text
schemaVersion
status
stage
executionStartedAt
jobBinding
sourceBinding
requestBuilderBinding
upstreamProjection
officialVerification
requestBindings
tokenDiagnosis
budgetGuarantee
transport
cost
checks
artifacts
nextStage
```

- 固定literalは`schemaVersion = presentation-caption-gate-b5-manifest-v002`、`status = passed`、`stage = ready-for-b6`。
- `jobBinding`は`path / fileSha256 / canonicalSha256`、`sourceBinding`はB5 jobのexact 9 keyをkey順・値ともbyte同一で写す。`requestBuilderBinding`はB5 jobの`entry / localImportClosure`をkey順・値ともbyte同一で写す。各実装bindingはfile SHAだけを持ち、JSON canonical SHAを付けない。`upstreamProjection`はB5 jobの同名値をbyte同一で写す。
- `requestBindings`: `probeCountTokens / finalCountTokens / generateContent`。各値は`requestPath / requestFileSha256 / rawResponsePath / rawResponseFileSha256`のexact 4 key。前2件は4値全て非null、generateContentは要求2値を非null、raw 2値をexact `null`にする。
- `officialVerification`: §9.3のcopy規則どおり、sourcesの`snapshotPath`だけを正式copyへ置き換え、他のsource値とclaimsをjobから値不変で写す。6正式copyを公開直前に安定再読し、jobが束縛した入力snapshotのSHA・byte長と一致させる。
- `tokenDiagnosis`: `probeInputTokens / finalInputTokens / maximumResponseStructurePath / maximumResponseStructureFileSha256 / maximumResponseStructureByteLength`。
- `budgetGuarantee`: `currency / maximumNanoUsd / inputPriceNanoUsdPerToken / outputPriceNanoUsdPerToken / countTokensChargeNanoUsd / finalInputTokens / maxOutputTokens / worstCaseNanoUsd / claimsBindingCanonicalSha256 / status`。
- `transport`: `product / apiVersion / countTokensEndpoint / generateContentEndpoint / method / headers / serviceTierFieldOmitted / automaticRetries / clientTimeoutMilliseconds / countTokensCalls / generateContentCalls`。
- `cost`: `currency / maximumNanoUsd / inputPriceNanoUsdPerToken / outputPriceNanoUsdPerToken / countTokensChargeNanoUsd / worstCaseNanoUsd / actualBillingObservation`。`actualBillingObservation`は`count_tokens_officially_unbilled_generate_not_called`だけを許す。
- `checks`: `sourceBinding / officialEvidence / requestConstruction / candidateCount / tokenProbe / finalRequest / budget / transport / secret / artifacts`のexact 10 keyで、各値は`passed / failed / blocked`のいずれか。
- `artifacts[]`: `role / path / fileSha256 / byteLength`。
- `nextStage`: `status / blockingViolationCodes / generateContentAllowed`。値は`ready-for-b6 / [] / true`だけ。

`requestBindings`と`tokenDiagnosis`はartifactとは別の正本を作らない。次の対応をexact 1対1で固定し、対応する`artifacts[]` entryの`path / fileSha256`は参照fieldとbyte同一、`byteLength`はその同じ実fileから得た値でなければならない。

| 参照field | 対応artifact role |
|---|---|
| `requestBindings.probeCountTokens.requestPath/requestFileSha256` | `probe-count-tokens-request` |
| `requestBindings.probeCountTokens.rawResponsePath/rawResponseFileSha256` | `probe-count-tokens-response-raw` |
| `requestBindings.finalCountTokens.requestPath/requestFileSha256` | `final-count-tokens-request` |
| `requestBindings.finalCountTokens.rawResponsePath/rawResponseFileSha256` | `final-count-tokens-response-raw` |
| `requestBindings.generateContent.requestPath/requestFileSha256` | `generate-content-request` |
| `tokenDiagnosis.maximumResponseStructurePath/maximumResponseStructureFileSha256/maximumResponseStructureByteLength` | `maximum-response-structure` |

上表の参照fieldが指すpathを別fileへ向ける、同じroleを複数artifactへ置く、artifactだけ差し替える、または参照とartifactでSHA・byte長を分岐させる場合は`API_BUDGET_BINDING_INVALID`で拒否する。generateContentのraw response 2 fieldはB5ではnullのため対応artifactを作らない。

`claimsBindingCanonicalSha256`の対象は`officialVerification.claims`配列だけである。配列順と各claim/evidenceの値を保ち、既存`canonicalJson`共通処理でobject keyを再帰的に辞書順化したUTF-8 byteのSHA-256とする。`officialVerification`全体、sources、manifest binding objectのSHAではない。B5 jobのclaimsから計算した値をB5 manifestへ記録し、B6 manifestの同fieldと一致させる。

B5 ready manifestの値を次に固定する。

```text
budgetGuarantee.currency = USD
budgetGuarantee.maximumNanoUsd = 500000000
budgetGuarantee.inputPriceNanoUsdPerToken = 1500
budgetGuarantee.outputPriceNanoUsdPerToken = 7500
budgetGuarantee.countTokensChargeNanoUsd = 0
budgetGuarantee.status = passed
cost.currency = USD
cost.maximumNanoUsd = 500000000
cost.inputPriceNanoUsdPerToken = 1500
cost.outputPriceNanoUsdPerToken = 7500
cost.countTokensChargeNanoUsd = 0
transport.product = Gemini Developer API
transport.apiVersion = v1beta
transport.method = POST
transport.headers =
  content-type: application/json
  x-goog-api-key: <redacted>
transport.serviceTierFieldOmitted = true
transport.automaticRetries = 0
transport.clientTimeoutMilliseconds = 600000
transport.countTokensCalls = 2
transport.generateContentCalls = 0
checks = 全10 key passed
```

endpointは`models/gemini-3.6-flash:countTokens`と`models/gemini-3.6-flash:generateContent`の正式HTTPS URLだけを許し、queryにAPI keyを付けない。`artifacts`は次の12 roleを固定順で各1件持つ。

```text
official-snapshot-pricing
official-snapshot-tokens-guide
official-snapshot-count-tokens-api
official-snapshot-billing
official-snapshot-thinking
official-snapshot-latest-model
probe-count-tokens-request
probe-count-tokens-response-raw
final-count-tokens-request
final-count-tokens-response-raw
maximum-response-structure
generate-content-request
```

roleと`outputDirectory`からの固定相対pathを次に一意化する。

| role | 固定相対path |
|---|---|
| `official-snapshot-pricing` | `official/pricing.snapshot.html` |
| `official-snapshot-tokens-guide` | `official/tokens-guide.snapshot.html` |
| `official-snapshot-count-tokens-api` | `official/count-tokens-api.snapshot.html` |
| `official-snapshot-billing` | `official/billing.snapshot.html` |
| `official-snapshot-thinking` | `official/thinking.snapshot.html` |
| `official-snapshot-latest-model` | `official/latest-model.snapshot.html` |
| `probe-count-tokens-request` | `probe-count-tokens-request.json` |
| `probe-count-tokens-response-raw` | `probe-count-tokens-response.raw.json` |
| `final-count-tokens-request` | `final-count-tokens-request.json` |
| `final-count-tokens-response-raw` | `final-count-tokens-response.raw.json` |
| `maximum-response-structure` | `maximum-response-structure.json` |
| `generate-content-request` | `generate-content-request.json` |

B5 ready manifestの固定名は`b5-manifest-v002.json`、公式保証停止reportの固定名は`b5-cost-verification-stop-report-v001.json`、計測開始後の停止reportの固定名は`b5-measurement-stop-report-v001.json`とする。同じattemptではこの3件のうち1件だけを作る。各artifact pathは上表を`outputDirectory`へ1回だけ連結し、realpathが同directory内に留まらなければ拒否する。

公式保証を満たさない場合は、nullを詰めた偽manifestを作らず、`presentation-caption-api-cost-verification-stop-report-v001`をjobの未使用`outputDirectory`へ公式snapshot 6件と一緒に原子的公開して終了1にする。stop reportのtop-level exact keyは`schemaVersion / status / stage / executionStartedAt / jobBinding / officialVerification / checks / violations / transportObservation / artifacts / nextStage`の11件である。`schemaVersion = presentation-caption-api-cost-verification-stop-report-v001`、`status = blocked`、`stage = official-verification`、`jobBinding`は`path / fileSha256 / canonicalSha256`、`officialVerification`は§9.3の正式copy path置換規則に従い、`transportObservation = {countTokensCalls:0, generateContentCalls:0}`、`nextStage = {status:"blocked-before-api", generateContentAllowed:false}`に固定する。`checks`は上記10 keyを持ち、`sourceBinding`はpassed、`officialEvidence`はfailed、残り8件はblocked。`violations[]`は`code / relatedPaths`のexact 2 keyで、`relatedPaths`を空でない辞書順unique文字列配列とする。v001の固定verdictではcode 23、24、25をこの固定順で各1件持つ。`artifacts`は`role / path / fileSha256 / byteLength`を持つ公式snapshot 6 roleだけを上記固定順で持つ。v001はこのstop reportを出し、B5 manifestとAPI request/responseを0件にする。

公式保証が将来成立してcountTokensへ進んだ後の検査済み停止は、別の`presentation-caption-gate-b5-measurement-stop-report-v001`へ記録する。固定名は`b5-measurement-stop-report-v001.json`、top-level exact keyは`schemaVersion / status / stage / executionStartedAt / jobBinding / officialVerification / checks / violations / transportObservation / tokenObservation / artifacts / nextStage`の12件である。

```text
schemaVersion = presentation-caption-gate-b5-measurement-stop-report-v001
status = blocked
nextStage = {status:"blocked-before-b6", generateContentAllowed:false}
```

stageと値を次の一件表だけに固定する。`transportObservation`は`countTokensCalls / generateContentCalls / automaticRetries`のexact 3 keyで、generateContentCallsとautomaticRetriesは常に0である。`tokenObservation`は`probeInputTokens / finalInputTokens / derivedMaxOutputTokens / worstCaseNanoUsd`のexact 4 keyとし、未観測値はexact `null`、0や推定値へ補完しない。

| stage | 違反code | countTokensCalls | tokenObservation |
|---|---|---:|---|
| `pre-measurement` | 固定順で最初の`API_BUDGET_BINDING_INVALID / API_TRANSPORT_CONTRACT_VIOLATION / SECRET_LEAK_DETECTED` | 0 | 4値全て`null` |
| `probe-response` | `API_COST_PROBE_INVALID` | 1 | 4値全て`null` |
| `probe-budget` | `API_BUDGET_EXCEEDED_BEFORE_SEND` | 1 | probeとderivedは整数、finalとworstCaseは`null` |
| `final-response` | `API_COST_PROBE_INVALID` | 2 | probeとderivedは整数、finalとworstCaseは`null` |
| `final-budget` | `API_BUDGET_EXCEEDED_BEFORE_SEND` | 2 | 4値全て整数、worstCaseは500,000,000超過 |

`pre-measurement`は公式保証3件がverifiedになった後、最初のcountTokensより前に、job・幅・request builder・候補数1・最大回答構造・secret検査のいずれかが不成立な場合を所有する。probe requestをAPIへ送れる外形まで構築できなかった状態であり、countTokens request/raw artifactを作らない。これによりC05、C18、W09の通信前停止を公式保証stopへ誤分類せず、API 0回の検査済み停止として表現する。

`probe-budget`は`derivedMaxOutputTokens <= 0`、またはprobe入力料金だけで予算を使い切る場合を所有する。`final-budget`はfinal式が500,000,000 nanoUSDを1以上超える場合を所有する。算術不能、raw値不正、request/raw binding不一致はresponse stageの`API_COST_PROBE_INVALID`へ帰属する。1 reportに複数codeを詰めず、最初の固定検査順で所有者を決める。

`artifacts`はB5 ready manifestの12 roleから、実際にdurable保存できたものだけを同じ固定順で持つ。`pre-measurement`は公式snapshot 6件だけを必須とし、途中構築物を正式artifactへ昇格しない。残る4 stageは公式snapshot 6件、maximum response structure、probe requestを必須とする。probe rawは`probe-budget / final-response / final-budget`で必須、final requestとgenerate-content requestは`final-response / final-budget`で必須、final rawは`final-budget`で必須である。`probe-response / final-response`でHTTP bodyを取得したがraw保存不能なら、そのraw roleは存在しないものとして省き、メモリ上bodyのSHAを成果物として記録しない。reportの`checks`はB5 manifestと同じ10 keyを持ち、失敗位置より前をpassed、所有検査をfailed、後ろをblockedとする。ready manifest、公式保証stop report、measurement stop reportは同じattemptで排他的である。

measurement stop reportをwork directoryへ構築・fsyncできない場合、正式B5 outputは0件のまま共通fatal stdout `CAPTION_B5_V002_RUNNER_FATAL`で終了2にする。同じjob ID/outputDirectoryを再利用して再試行しない。

B6 v002 jobは現行のexact 10 key（`schemaVersion / jobId / mode / attemptId / runDirectoryId / implementationBinding / b5 / sourcePackage / b4StaticTemplate / publication`）を維持し、B5 manifest v002、package manifest v002、crop bindingを持つB4 static template v002だけを受理する。nested objectは次に固定する。

- `schemaVersion = presentation-caption-gate-b6-execution-job-v002`、`mode = formal-one-shot`だけを許し、v001 jobを受理・変換しない。
- `implementationBinding`: `entry / localImportClosure`のexact 2 key。`entry`は`path / fileSha256`で、pathは`evals/clip_composition/run_presentation_caption_gate_b6_job_v002.mjs`だけ。`localImportClosure[]`は`role / path / fileSha256`のexact 3 keyで、次の固定順15件だけを持つ。

| role | path |
|---|---|
| `b6Core` | `evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs` |
| `sourcePackageCore` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |
| `textLayoutImplementation` | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` |
| `gateACore` | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` |
| `gateARetainedSourceAtomsCore` | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` |
| `gateARunner` | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` |
| `semanticCore` | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` |
| `semanticRunnerV001` | `evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs` |
| `displayPairRunnerV001` | `evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs` |
| `displayPairCoreV003` | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` |
| `instructionCoreV003` | `evals/clip_composition/presentation_instruction_contract_v003.mjs` |
| `captionCoreV003` | `evals/clip_composition/presentation_caption_contract_v003.mjs` |
| `timelineV002` | `evals/clip_composition/presentation_base_media_timeline_v002.mjs` |
| `sourceSpeakerPolicy` | `evals/clip_composition/presentation_source_speaker_policy_v001.mjs` |
| `sourceSpeakerRegistry` | `evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json` |

v002 formal wrapperが使う新B1/B4 runnerは、それぞれB1/B4 jobのimplementationBindingで別に束縛する。ここではB6 coreのmodule評価時に必ず読み込まれるv001 module群も未使用exportとして除外せず監視する。開始時とB6 commit point直前にentryと15件を再読し、静的local importと同期registry読取がこの集合で閉じることを検査する。別local import、dynamic import、`require`、未登録`import.meta`読取を拒否する。
- `b5`: `initialManifest / fixedRequest`。各値は`path / fileSha256`。
- `sourcePackage`: `rootPath / manifest / validationReport`。後2件は`path / fileSha256 / canonicalSha256`。
- `b4StaticTemplate`: `path / fileSha256`。対象template v002は`schemaVersion = presentation-caption-display-pair-static-preflight-job-v002`、`mode = read-only-preflight`だけを許す。top-level exact keyは、現行12 keyに`cropDecisionBinding`を追加した`schemaVersion / jobId / artifactId / mode / implementationBinding / sourcePackageBinding / retainedSourceBinding / baseMediaBinding / registryBinding / cropDecisionBinding / expectedRuntime / expectedStaticProjection / readOnlyGuard`。`cropDecisionBinding`は`path / fileSha256 / canonicalSha256`のexact 3 key、残るfieldは基準commitのv001 static preflight jobと同じexact shape・順序・値規則を持つが、packageはv002だけを受理する。v001 templateの受理、v002への変換、crop bindingの補完をしない。template pathはjob IDから導出せず、B6 jobが束縛したroot内regular fileを正本とする。basenameは`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.json$`に一致し、symlinkでなく、realpathが固定root内に留まらなければ拒否する。
- `publication`: 現行exact 9 key（`outputRoot / semanticRawPath / b1JobPath / b1ReportPath / b4JobPath / b4PairId / b4OutputRoot / b4RunnerOutputPath / b4DisplayPlanPath`）をこの順で維持し、全pathを未使用のv002 rootへ向ける。

B3→B5→B6→B4の素材bindingは次の等式で閉じる。どれかを別素材・別attemptの実体へ組み替えることを`API_BUDGET_REQUEST_MISMATCH`で通信前に拒否する。

| 左辺 | 右辺 | 必須一致 |
|---|---|---|
| B5 job/manifest `sourceBinding.path / fileSha256 / canonicalSha256` | B3 package manifestの`semantic-source-input` content artifact | path・file SHA・canonical SHA |
| B5 job/manifest `sourceBinding.packageManifestPath / packageManifestFileSha256 / packageManifestCanonicalSha256` | B3 package manifest自身 | path・file SHA・canonical SHA |
| B6 job `sourcePackage.manifest` | B5 manifest `sourceBinding.packageManifestPath / packageManifestFileSha256 / packageManifestCanonicalSha256` | 3値 |
| B6 job `sourcePackage.rootPath` | B3 package manifestが属する正式package root | repo相対realpath |
| B6 job `sourcePackage.validationReport` | 同じB3 package manifestが束縛するvalidation report | path・file SHA・canonical SHA |
| B6 job `b5.initialManifest` | 実際に受理したB5 ready manifest | path・file SHA |
| B6 job `b5.fixedRequest` | 同B5 manifest `requestBindings.generateContent.requestPath / requestFileSha256` | path・file SHA |
| B4 static template `sourcePackageBinding` | B6 job `sourcePackage` | nested shape・全値 |

B5 job/manifestの3 count値は、上表で一意に結ばれたB3 package manifestのobserved projectionと一致させる。B6開始時と送信直前にB5 manifest、fixed request、B3 manifest、B3 validation reportを同一file descriptorから安定再読し、上表を再照合する。B6 manifestまたはstop reportに別の素材bindingを新設してこの等式を迂回しない。

B4 static template v002と、そこから作るB4 generation job v002の`implementationBinding`は、現行shape `gitCommit / files / dependencyFiles`を維持し、次のrole/path固定列だけを許す。各entryは`role / path / fileSha256`で、B6開始時、B4 child開始時、pair公開直前に実体を照合する。

| 区分 | role | path |
|---|---|---|
| files | `displayPairCore` | `evals/clip_composition/presentation_caption_display_pair_v004.mjs` |
| files | `displayPairRunner` | `evals/clip_composition/run_presentation_caption_display_pair_job_v002.mjs` |
| dependencyFiles | `displayPairCoreV003` | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` |
| dependencyFiles | `semanticCore` | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` |
| dependencyFiles | `semanticRunner` | `evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs` |
| dependencyFiles | `textLayoutImplementation` | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` |
| dependencyFiles | `captionCoreV003` | `evals/clip_composition/presentation_caption_contract_v003.mjs` |
| dependencyFiles | `instructionCoreV004` | `evals/clip_composition/presentation_instruction_contract_v004.mjs` |
| dependencyFiles | `instructionCoreV003` | `evals/clip_composition/presentation_instruction_contract_v003.mjs` |
| dependencyFiles | `sourceSpeakerPolicy` | `evals/clip_composition/presentation_source_speaker_policy_v001.mjs` |
| dependencyFiles | `sourceSpeakerRegistry` | `evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json` |
| dependencyFiles | `timelineV002` | `evals/clip_composition/presentation_base_media_timeline_v002.mjs` |
| dependencyFiles | `layoutPreflightCore` | `evals/clip_composition/inspect_presentation_preset_layout.ts` |
| dependencyFiles | `rendererLayoutCore` | `runner/src/telop/telop-render-model.ts` |
| dependencyFiles | `presetRegistry` | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json` |
| dependencyFiles | `presetValidationIndex` | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-validation-index.json` |
| dependencyFiles | `materialValidationIndex` | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/material-validation-index.json` |
| dependencyFiles | `trustedRegistryBindings` | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/trusted-registry-bindings.json` |
| dependencyFiles | `rendererTrust` | `evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001/trust.json` |
| dependencyFiles | `sharedJsonContractCore` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |
| dependencyFiles | `gateACore` | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` |
| dependencyFiles | `gateARetainedSourceAtomsCore` | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` |
| dependencyFiles | `gateARunner` | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` |

上表はfiles 2件、dependencyFiles 21件、計23件の固定列である。v004 coreが実行時に呼ぶv003 display coreと、その文字幅計算は`displayPairCoreV003 / textLayoutImplementation`として明示的に束縛する。`sourceSpeakerPolicy`がmodule評価時に読む非人物話者registryも`sourceSpeakerRegistry`として束縛し、開始時と公開直前に再読する。`sharedJsonContractCore`の静的import closureである`gateACore / gateARetainedSourceAtomsCore / gateARunner`も同じ開始時・公開直前照合へ含める。

`rendererLayoutCore`の相対runtime importである`telop-glow / telop-line-break / text-metrics`は、同じB4 jobが束縛する`rendererTrust`を安定読取し、trust内の同role/path/SHAと実体をB4開始時・pair公開直前に照合する。B4のimplementationBindingへ二重転記せず、静的import graphがこの3件以外へ変わった場合は`IMPLEMENTATION_MISMATCH`で拒否する。これによりB4 childのlive import closureもtrustの所有範囲として検査する。

v001 templateにある横型registry path、v001 semantic runner、v001 preflight runnerを縦型templateへ残さない。横型template自身は変更しない。

`publication`の値関係を次に一意化する。`attemptId`と`b4PairId`はbyte同一、`runDirectoryId`と`outputRoot`末尾directoryはbyte同一である。各`<attemptId>`と`<runDirectoryId>`を1回だけ連結し、正規化前後で同じrepo相対pathにならなければ拒否する。

```text
publication.outputRoot =
  evals/clip_composition/outputs/presentation/caption-gate-b6/<runDirectoryId>
publication.semanticRawPath =
  evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/<attemptId>.json
publication.b1JobPath =
  evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/<attemptId>.json
publication.b1ReportPath =
  <publication.outputRoot>/semantic-output-validation-report.json
publication.b4JobPath =
  evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/<attemptId>.json
publication.b4PairId = <attemptId>
publication.b4OutputRoot =
  evals/clip_composition/outputs/presentation/caption-display-pairs/<attemptId>
publication.b4RunnerOutputPath =
  <publication.outputRoot>/b4-runner-output.raw.json
publication.b4DisplayPlanPath =
  <publication.b4OutputRoot>/display-plan.json
```

`publication.outputRoot`から導出するB6自身の固定basenameを次に固定する。下表のpathは`outputRoot`とbasenameをPOSIX `/`で1回だけ連結し、realpathが同root内に留まるものだけを許す。`b4-runner-output-raw`だけは既存`publication.b4RunnerOutputPath`ともbyte同一でなければならない。`b1-runner-output-raw`とstop reportをpublicationへ新しいkeyとして足さず、この固定導出表を正本とする。

| role | `publication.outputRoot`直下の固定basename |
|---|---|
| `generate-content-response-raw` | `generate-content-response.raw.json` |
| `b1-runner-output-raw` | `b1-runner-output.raw` |
| `b4-runner-output-raw` | `b4-runner-output.raw.json` |
| B6 manifest | `b6-manifest-v002.json` |
| B6 stop report | `b6-stop-report-v001.json` |

同じattemptではB6 manifestとB6 stop reportのどちらか1件だけを公開する。送信前停止ではstop reportだけ、応答保存後の検査済み停止または成功ではB6 manifestだけ、transport/response-envelope/downstreamのfatalではraw証拠とstop reportだけを公開する。開始時には上表5 path、`publication.semanticRawPath / b1JobPath / b1ReportPath / b4JobPath / b4OutputRoot / b4DisplayPlanPath`、B4 lock/workの全てが未使用であることを確認する。

B6 manifest v002はHTTP応答の生byteを保存できたattemptだけを表す。送信前停止、timeout、接続・I/O失敗ではnull応答を持つ偽manifestを作らず、後述のstop reportを出す。manifestのtop-level exact keyは次の16件である。

```text
schemaVersion
status
stage
attemptId
executionStartedAt
jobBinding
implementationBinding
fixedRequestBinding
transport
response
cost
budgetGuarantee
semanticOutputBinding
b1
b4
stop
```

- 固定literalは`schemaVersion = presentation-caption-gate-b6-manifest-v002`。`status / stage`は`stopped-after-response / response-validation`または`passed-to-b4 / complete`の2組だけ。
- `executionStartedAt`: B6 runnerがfile読取・成果物作成・外部通信より前に1回だけ取得した、上記固定RFC 3339 UTC時刻。
- `jobBinding`: `path / fileSha256 / canonicalSha256`のexact 3 key。実行したB6 v002 jobの実体を指す。
- `implementationBinding`: B6 jobの`entry / localImportClosure`をkey順・値ともbyte同一で写す。B6開始時とmanifest commit point直前にjob実体、entry、15件のclosureを安定再読し、job内binding、manifest内binding、各実file SHAが全て一致する場合だけ公開する。stop reportにも同じ関係を適用する。
- `fixedRequestBinding`: `path / fileSha256 / byteLength`のexact 3 key。B5 generate-content requestとbyte同一である。
- `response`: `configuredModelId / responseModelVersion / httpStatus / contentType / rawBinding / usageMetadata / observedServiceTier / candidateCount`のexact 8 key。`configuredModelId`は`gemini-3.6-flash`、`httpStatus`は整数200、`contentType`は生headerのexact `application/json; charset=UTF-8`だけをmanifestの受理値とする。raw応答の`candidates`配列件数を記録し、整数1だけを合格にする。
- `rawBinding`: `path / fileSha256 / byteLength`のexact 3 key。解析・trim・fence除去より先に保存した生byteだけを指す。
- `usageMetadata`: `promptTokenCount / candidatesTokenCount / thoughtsTokenCount / totalTokenCount`。
- `transport`: `product / apiVersion / generateContentEndpoint / method / headers / serviceTierFieldOmitted / automaticRetries / clientTimeoutMilliseconds / generateContentCalls`のexact 9 key。countTokens endpoint/callsは持たない。
- `cost`: `currency / inputPriceNanoUsdPerToken / outputPriceNanoUsdPerToken / promptCostNanoUsd / outputCostNanoUsd / totalUsageCostNanoUsd / actualBillingObservation`。`actualBillingObservation`は`usage_metadata_list_price_estimate_invoice_not_observed`だけを許し、請求実額とは呼ばない。
- `budgetGuarantee`: `b5ManifestBinding / claimsBindingCanonicalSha256 / finalRequestBinding / finalInputTokens / maxOutputTokens / maximumNanoUsd / preSendWorstCaseNanoUsd / preSendStatus / observedPromptTokens / observedCandidateTokens / observedThinkingTokens / observedTotalTokens / observedUsageCostNanoUsd / postSendStatus`のexact 14 key。各bindingは`path / fileSha256 / canonicalSha256`、観測前の値を0へ補完しない。
- `semanticOutputBinding`: `null`または`path / fileSha256 / byteLength`。
- `b1`: `null`または`exitCode / status / jobBinding / validationReportBinding`。各bindingは`path / fileSha256 / byteLength / canonicalSha256`で、媒体でないJSONのcanonical SHAは必須。
- `b4`: `null`または`exitCode / status / jobBinding / outputRoot / validationReportBinding`。binding shapeはB1と同じ。`outputRoot`は成功時のrepo相対文字列または拒否時の`null`であり、空文字を代用しない。
- `stop`: `null`または`reason / violationCodes`。自由形式のfacts objectを入れない。

同じ実体を指す重複bindingは次の等式だけを許す。左辺と右辺のpath/file SHAはbyte同一、byteLengthとcanonical SHAはその同じ実fileから導出する。どれか1つを別fileへ向ける、またはmanifest側だけを差し替える場合は受理しない。

| B6 manifest側 | 一致させる正本 |
|---|---|
| `budgetGuarantee.b5ManifestBinding` | B6 job `b5.initialManifest`と同じpath/file SHA、およびそのB5 manifest実体 |
| top-level `fixedRequestBinding` | B6 job `b5.fixedRequest`、B5 manifest `requestBindings.generateContent`、B5 artifact role `generate-content-request`と同じpath/file SHA |
| `budgetGuarantee.finalRequestBinding` | top-level `fixedRequestBinding`と同じpath/file SHA。canonical SHAだけを同じrequest実体から追加導出 |
| `response.rawBinding` | `publication.outputRoot/generate-content-response.raw.json` |
| `semanticOutputBinding` | `publication.semanticRawPath` |
| `b1.jobBinding` | `publication.b1JobPath` |
| `b1.validationReportBinding` | `publication.b1ReportPath` |
| `b4.jobBinding` | `publication.b4JobPath` |
| passed時の`b4.outputRoot` | `publication.b4OutputRoot` |
| passed時の`b4.validationReportBinding` | `publication.b4OutputRoot/pair-validation-report.json` |
| rejected時の`b4.validationReportBinding` | `publication.b4RunnerOutputPath` |

`fixedRequestBinding.byteLength`はB5 artifactの同実体byte長、`budgetGuarantee.finalRequestBinding.canonicalSha256`は同実体をstrict decodeして既存canonical JSON処理で得た値である。B6 job、B5 manifest、B6 manifestの3つを独立したrequest正本にしない。

`responseModelVersion`はraw応答のtop-level `modelVersion`を正規化せず写し、欠落・空文字ならresponse-envelope、不一致ならresponse-validationで停止する。`observedServiceTier`はraw応答の`usageMetadata.serviceTier`が欠落している場合だけ`null`、存在する場合は正規表現`^[A-Za-z0-9._-]{1,64}$`に一致する生文字列を正規化せず写す。合格値は`null`またはexact `standard`だけで、regexに一致する別値はB6 manifestへ証拠として保持して`API_RESPONSE_TIER_MISMATCH`で停止する。regex外の値はB6 manifestへ写せないため、raw応答だけをresponse-envelope stop reportへ束縛し、`API_TRANSPORT_CONTRACT_VIOLATION`で停止する。HTTP 200または上記Content-Typeを満たさない応答もB6 manifestを作らず、生応答をB6 stop reportへ束縛する。

意味回答本文の唯一の抽出規則も固定する。raw応答は`candidates`がexact 1件で、その1件の`content`がobject、`content.role`がexact `model`、`content.parts`がexact 1件、唯一のpartがexact key `text`だけを持ち、その値が空でないstringでなければならない。JSON stringを通常のJSON規則で一度復号したUTF-8 byteを、trim、fence除去、連結、文字置換なしで`semanticOutputBinding`のfileへ保存する。part欠落、複数part、非文字列、空文字、余分なpart keyは`response-content-invalid`としてB1前で停止する。本文がstringとして抽出でき、その中身がB1のJSON契約へ不適合な場合だけ`semantic-output-rejected`とする。

B6 manifestの共通literalは次に固定する。

```text
currency = USD
transport.product = Gemini Developer API
transport.apiVersion = v1beta
transport.method = POST
transport.headers =
  content-type: application/json
  x-goog-api-key: <redacted>
transport.serviceTierFieldOmitted = true
transport.automaticRetries = 0
transport.clientTimeoutMilliseconds = 600000
transport.generateContentCalls = 1
cost.inputPriceNanoUsdPerToken = 1500
cost.outputPriceNanoUsdPerToken = 7500
budgetGuarantee.maximumNanoUsd = 500000000
budgetGuarantee.preSendStatus = passed
```

`passed-to-b4 / complete`では`postSendStatus = passed`、`semanticOutputBinding / b1 / b4`は全て非null、`stop = null`。`stopped-after-response / response-validation`では`postSendStatus = failed`、失敗位置以降のbindingをnull、`stop`を非nullにする。いずれもresponse、usage、costは非nullであり、0へ補完しない。

manifest内の`stop.reason`は`response-model-mismatch / response-tier-mismatch / candidate-count-invalid / usage-accounting-invalid / response-content-invalid / usage-budget-violation / semantic-output-rejected / semantic-output-abstained / display-plan-rejected`の9値だけ、`violationCodes`はunique配列で、§10の固定code順または参照したB1/B4 reportの既存固定順に並べる。`semantic-output-abstained`だけはexact空配列、それ以外は空でない配列とする。対応は次に固定する。

| reason | violationCodes |
|---|---|
| `response-model-mismatch` | `API_TRANSPORT_CONTRACT_VIOLATION` |
| `response-tier-mismatch` | `API_RESPONSE_TIER_MISMATCH` |
| `candidate-count-invalid` | `API_USAGE_ACCOUNTING_INVALID` |
| `usage-accounting-invalid` | `API_USAGE_ACCOUNTING_INVALID` |
| `response-content-invalid` | `API_TRANSPORT_CONTRACT_VIOLATION` |
| `usage-budget-violation` | `API_USAGE_BUDGET_VIOLATION` |
| `semantic-output-rejected` | B1 validation reportの非空violations code列とbyte同一 |
| `semantic-output-abstained` | `[]` |
| `display-plan-rejected` | B4 validation reportの非空violations code列とbyte同一 |

送信前停止、HTTP応答を保存できない失敗、保存済み応答からB6 manifestの必須envelopeを構成できない失敗、またはB1/B4 child processが終了2もしくはstdout/stderr観測契約に違反した失敗は`presentation-caption-gate-b6-stop-report-v001`へ記録する。top-level exact keyは`schemaVersion / status / stage / executionStartedAt / jobBinding / implementationBinding / fixedRequestBinding / transport / responseBinding / childObservation / violations / artifacts / nextStage`の13件。`schemaVersion = presentation-caption-gate-b6-stop-report-v001`、`status = blocked`、stageは`pre-send / transport / response-envelope / downstream`の4値、`jobBinding`は`path / fileSha256 / canonicalSha256`、`implementationBinding`はB6 jobの`entry / localImportClosure`とbyte同一、`fixedRequestBinding`は`path / fileSha256 / byteLength`、`transport`はB6 manifestと同じexact 9 keyを持つ。responseBindingは生応答をdurable保存できなければ`null`、保存できた場合だけ`path / fileSha256 / byteLength / httpStatus / contentType`を持つ。`contentType`だけはheader欠落時にexact `null`、存在時は正規化しない生文字列とし、空文字を補完しない。

`childObservation`は`pre-send / transport / response-envelope`でexact `null`、`downstream`だけ`child / exitCode / stdoutByteLength / stdoutSha256 / stderrByteLength / stderrSha256`のexact 6 keyを持つ。`child`は`b1 / b4`、`exitCode`は生の0/1/2、byte長は取得した生byteの0以上の長さ、SHAはその同じ生byteのlowercase SHA-256である。stderr生byteはsecret・入力本文を含み得るため正式artifactへ保存せず、メモリ上で長さとSHAだけを得てstop reportへ記録する。stdoutもsecret検査合格後にdurable保存できた場合だけartifactへ入れ、保存しない場合でも`childObservation`の長さとSHAを欠落させない。期待どおり空stderrなら`stderrByteLength = 0`、`stderrSha256 = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`である。

artifactsは`role / path / fileSha256 / byteLength`を持ち、stage別に次の固定列だけを許す。

| stage | artifacts |
|---|---|
| `pre-send` | `[]` |
| `transport` | body未取得、またはbody取得後のraw durable保存失敗なら`[]`。raw durable保存済みなら`generate-content-response-raw` 1件 |
| `response-envelope` | `generate-content-response-raw` 1件 |
| `downstream` | `generate-content-response-raw` 1件。失敗childのstdoutをdurable保存できた場合だけ、続けて`b1-runner-output-raw`または`b4-runner-output-raw`を加えた2件 |

stop reportの重複bindingは次の同一実体関係だけを許す。

- `jobBinding`は実行したB6 job、`implementationBinding`は同jobの`implementationBinding`と一致し、開始時とstop report公開直前の実体再読にも一致する。
- `fixedRequestBinding.path / fileSha256`はB6 job `b5.fixedRequest`、B5 ready manifest `requestBindings.generateContent`、同manifestの`generate-content-request` artifactと一致する。`byteLength`はその同じ実fileから導出する。
- nonnull `responseBinding.path`は`publication.outputRoot/generate-content-response.raw.json`だけであり、同bindingのpath/file SHA/byteLengthは`generate-content-response-raw` artifactと一致する。HTTP statusとContent-Typeは同じ保存処理で得た応答metadataであり、別通信の値を組み合わせない。
- downstreamでchild stdout artifactを持つ場合、そのartifact pathはchildに応じた固定basenameだけを許し、artifactのfile SHA/byteLengthを`childObservation.stdoutSha256 / stdoutByteLength`と一致させる。artifactを持たない場合も、`childObservation`は取得した生stdout byteの長さとSHAを記録し、空値で代用しない。
- stderrはartifactを持たず、`childObservation.stderrByteLength / stderrSha256`だけが同じ取得byteから導出される。

上記不一致は、API通信前なら`API_BUDGET_REQUEST_MISMATCH`、応答保存後なら該当stageの`API_TRANSPORT_CONTRACT_VIOLATION`、child観測なら`B6_DOWNSTREAM_EXECUTION_FAILED`へ帰属する。別file、別通信、別childの値を組み合わせたstop reportを公開しない。

nextStageは`{status:"stopped", b1Allowed:false, b4Allowed:false}`。`violations[]`はB5 stop reportと同じ`code / relatedPaths`のexact 2 keyで、1件以上、§10の固定code順、relatedPathsは辞書順unique・1件以上とする。stage別に許すcodeは、`pre-send = API_BUDGET_BINDING_INVALID / API_BUDGET_EXCEEDED_BEFORE_SEND / API_BUDGET_REQUEST_MISMATCH / SECRET_LEAK_DETECTED`、`transport = API_TRANSPORT_CONTRACT_VIOLATION`、`response-envelope = API_TRANSPORT_CONTRACT_VIOLATION / API_USAGE_ACCOUNTING_INVALID`、`downstream = SECRET_LEAK_DETECTED / B6_DOWNSTREAM_EXECUTION_FAILED`である。downstreamでchild stdout/stderrに生key byteが見つかった場合は固定code順が先の`SECRET_LEAK_DETECTED`だけが所有し、child rawをartifactへ保存しない。secretが無く、exit/stream契約だけが不正な場合に限り`B6_DOWNSTREAM_EXECUTION_FAILED` exact 1件を使う。同じchild失敗を2 codeへ重複帰属しない。

pre-sendではgenerateContentCalls 0、他3 stageでは1、automaticRetriesは常に0、clientTimeoutMillisecondsは600000である。`response-envelope`はHTTP非200、Content-Type不一致・欠落、JSON objectでない、`modelVersion`・`candidates`・usage 4 fieldの外形を構成できない、またはservice tierの生値が上記regex外の場合を所有する。HTTP/Content-Type/JSON/modelVersion/tier外形は`API_TRANSPORT_CONTRACT_VIOLATION`、candidate配列またはusage外形は`API_USAGE_ACCOUNTING_INVALID`へ帰属する。

`downstream`ではまずchild stdout/stderrのsecret検査を行い、上記の単一所有規則を適用する。secretが無い場合、B1またはB4の終了2、または終了0/1でもstdout/stderr観測契約に違反した状態を`B6_DOWNSTREAM_EXECUTION_FAILED`へ帰属する。B6が起動する新しいB1 v002・B4 v002 runnerは、終了0/1/2の全てでstdoutへexact 1件の版付きJSONを出し、stderrを0 byteにする。終了2、空stdout、JSON 1件でない、期待schemaでない、または非空stderrでは、`childObservation`を必ず作り、取得したstdout生byteを対応する固定basenameへdurable保存できた場合だけartifactsへ含める。保存不能ならraw応答1件だけをartifactsへ残し、`relatedPaths`へ`child.stdout / child.stderr / <固定child raw path>`の該当項目を記録する。生exit codeを2へ変換せず、stderr artifactまたは存在しないchild artifactを捏造しない。

transportでHTTP bodyを取得してもraw durable保存に失敗した場合、`responseBinding = null`、`artifacts = []`とし、メモリ上だけのbodyを取得済み成果物と主張しない。B6 manifestまたはB6 stop reportのdurable保存・原子的公開に失敗した場合は受理commit point 0件のまま、stdoutへexact 1件のJSONを出して終了2にする。そのtop-level exact keyは`schemaVersion / status / diagnosticCode`、literalは`schemaVersion = presentation-caption-gate-b6-publication-fatal-v001`、`status = fatal`、`diagnosticCode = B6_COMMIT_RECORD_PUBLICATION_FAILED`だけである。このstdoutは上位実行者の観測用で、stop reportやmanifestを名乗らない。raw byteを保持できた範囲だけ証拠として残し、欠落値を0や空文字で補わない。公開に失敗したmanifest/stop reportのwork fileを正式成果物として受理しない。

B6 jobをstrict decodeできない、job bindingを構成できない、implementation bindingを解決できない、またはfixed requestを安定読取できず`fixedRequestBinding.byteLength`を真実に構成できない場合は、B6 attempt context成立前のfatalである。この枝では欠落fieldを推測したstop reportを作らず、共通fatal `presentation-formal-runner-fatal-v001`、`runnerId = presentation-caption-gate-b6-execution-job-v002`、`diagnosticCode = CAPTION_B6_V002_RUNNER_FATAL`だけをstdoutへ返して終了2にする。正式B6成果物、API通信、manifest、stop reportは0件である。有効job、implementation binding、fixed request、未使用publication pathの全てが成立した後だけ、B6 stop reportの必須13 keyを使う。

B1/B4の正常・検査済み拒否をB6 manifestへ記録するnullabilityは次の一件表だけを許す。B1/B4の終了2はこの表へ入れず、上記downstream stop reportへ分離する。

| 状態 | `semanticOutputBinding` | `b1` | `b4` | `stop` |
|---|---|---|---|---|
| 本文抽出前の応答拒否 | `null` | `null` | `null` | response系reason |
| B1 rejected | nonnull | `exitCode=1`、`status=rejected`、job/report nonnull | `null` | `semantic-output-rejected` |
| B1 abstained | nonnull | `exitCode=1`、`status=abstained`、job/report nonnull | `null` | `semantic-output-abstained` |
| B1 passed・B4 rejected | nonnull | `exitCode=0`、`status=passed`、job/report nonnull | `exitCode=1`、`status=rejected`、job/report nonnull、outputRoot `null` | `display-plan-rejected` |
| B1/B4 passed | nonnull | `exitCode=0`、`status=passed`、job/report nonnull | `exitCode=0`、`status=passed`、job/report/outputRoot nonnull | `null` |

B1 v002 jobはreport保存先を持たず、B1 childもfilesystemへreportを書かない。B1 childは終了0/1でvalidation report JSONをstdoutへexact 1件だけ返す。B6はstdoutをcaptureしてschema・secret・job bindingを検査した後、その**同じ生byte**を`publication.b1ReportPath`へwrite-exclusive・fsync・安定再読し、実体からfile SHA、byte長、canonical SHAを得る。保存前のstdout、再直列化したJSON、またはchildが独自pathへ保存したfileを正式reportとして受理しない。

B4拒否時の`validationReportBinding`は、B4 runnerがstdoutへ返した版付きvalidation reportの生byteをB6が`publication.b4RunnerOutputPath`へ保存したものを指す。未公開のpair directoryを`outputRoot`へ記録しない。B1/B4のjob、report、compiler、output rootを空objectや空文字で代用しない。

B1 v002 validation reportの`compilerInput`は、既存shape `status / canonicalSha256 / observedByteSha256`を維持する。passedでは`generated`と2 SHA、rejected/abstainedでは`not_generated / null / null`である。B6はcompiler input本文を別成果物として保存・復元しない。B4 v002はB1 report、同じsource package、同じsemantic outputを入力に、既存B1純粋compilerを1回呼んで一時compiler inputを再構成し、reportの2 SHAと一致する場合だけ表示計画を作る。この一時値はB4 work内だけに置き、正式成果物を増やさない。

B4 passed時の`validationReportBinding.path`は`publication.b4OutputRoot + /pair-validation-report.json`だけを許し、正式pair directory内のreportを指す。B4 rejected時だけ`publication.b4RunnerOutputPath`を指し、両pathを取り違えない。いずれもfile SHA、byte長、canonical SHAを実体から照合する。

usage 4 fieldの欠落、null、文字列、小数、負数を0へ補完せず`API_USAGE_ACCOUNTING_INVALID`で拒否する。raw responseの`candidates`が0件または2件以上の場合も同codeでB1へ進めない。

B6の実測費用は次のBigInt式だけで導出する。

```text
promptCostNanoUsd = promptTokenCount * 1500n
outputCostNanoUsd =
  (candidatesTokenCount + thoughtsTokenCount) * 7500n
totalUsageCostNanoUsd =
  promptCostNanoUsd + outputCostNanoUsd
```

全JSONのcanonical key順は上記列挙順とする。raw API応答は一切正規化せず別fileへ保存する。API keyは環境変数からだけ読み、URL、header、log、manifest、stdout、stderrの全てでplaceholderへ置き換える。

### 9.4 B6直前と事後

B6直前に、公式証拠、B5 manifest、final request byte/SHA、最終入力token、単価、予算、導出上限を再読・再計算する。1つでも違えば通信しない。

B6は固定requestを1回だけ送る。raw応答を解析前に版付き保存し、次を全て確認する。

- response modelが固定modelと一致する。
- responseがservice tierを返した場合はStandardである。返さない場合は「応答上は未確認」と記録するが、request省略時Standardという公式証拠を維持する。
- `promptTokenCount <= finalInputTokens`。
- `candidatesTokenCount + thoughtsTokenCount <= maxOutputTokens`。
- toolを使わないため、`totalTokenCount = promptTokenCount + candidatesTokenCount + thoughtsTokenCount`。
- 実測nanoUSDが500,000,000以下。

検査順は、raw保存→HTTP/JSON envelope→model/tier/candidate/usage→費用と事前上界→candidate本文抽出→B1→B4で固定する。違反時はraw応答を証拠として保持し、失敗位置より後へ進めない。`countTokens`または出力上限の公式保証が実際のusageで破れた場合も、補正して再実走しない。

## 10. 違反の所有

新規違反は次の固定順とする。既存の違反集合と順序は変更しない。

| 順 | code | 所有する意味 |
|---:|---|---|
| 1 | `VERTICAL_PRESET_REGISTRY_INVALID` | 縦型台帳の外形・値が不正 |
| 2 | `VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID` | 3型語彙が不正 |
| 3 | `VERTICAL_SCREEN_LAYOUT_NOT_REGISTERED` | 許可語彙だがv001 preset未登録 |
| 4 | `VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH` | 人間認定previewとの束縛不一致 |
| 5 | `VERTICAL_PRESET_TRUST_BINDING_MISMATCH` | trust対象のpath・SHA不一致 |
| 6 | `DISPLAY_POLICY_BINDING_INVALID` | 表示方針の外形または数値tokenが不正 |
| 7 | `DISPLAY_POLICY_REGISTRY_MISMATCH` | preset解決不能またはjob幅がpreset安全上限を超過 |
| 8 | `DISPLAY_POLICY_WIDTH_MISMATCH` | package manifest・意味入力・展開写像のjob幅不一致 |
| 9 | `DISPLAY_FORMAT_BINDING_MISMATCH` | format不一致 |
| 10 | `DISPLAY_PRESET_BINDING_MISMATCH` | preset/state不一致 |
| 11 | `DISPLAY_SCREEN_LAYOUT_BINDING_MISMATCH` | B4・crop・台帳の型不一致 |
| 12 | `VERTICAL_LAYOUT_DECISION_INVALID` | crop decision外形・viewport不正 |
| 13 | `VERTICAL_LAYOUT_INPUT_HASH_MISMATCH` | crop decision実体の差し替え |
| 14 | `VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH` | 共通crop計算実体の差し替え |
| 15 | `VERTICAL_LAYOUT_FILTER_BUILD_FAILED` | 共通crop計算が構築不能 |
| 16 | `VERTICAL_BASE_FORMAT_MISMATCH` | crop後が1080×1920/30fpsでない |
| 17 | `VERTICAL_BASE_FRAME_COUNT_MISMATCH` | frame数が変わった |
| 18 | `VERTICAL_BASE_AUDIO_MISMATCH` | 音声packetが変わった |
| 19 | `VERTICAL_RENDER_TEXT_MODEL_MISMATCH` | B4明示行と描画文字モデルが不一致 |
| 20 | `VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH` | trustの描画依存・font・CSS・tool実体、またはNode・Remotion CLI・browser・FFmpeg・FFprobe・ImageMagickのSHAと起動経路がjob/trustと不一致 |
| 21 | `API_BUDGET_BINDING_INVALID` | 予算・価格・token計測の束縛不正 |
| 22 | `API_MODEL_OR_PRICE_UNVERIFIED` | 実行日の公式値を確認できない |
| 23 | `API_COUNT_TOKENS_BILLING_UNVERIFIED` | exact countTokens endpointの無課金を確認できない |
| 24 | `API_COUNT_TO_PROMPT_BOUND_UNVERIFIED` | countTokensが課金prompt tokenの上界になる保証がない |
| 25 | `API_MAX_OUTPUT_BILLING_BOUND_UNVERIFIED` | candidate+thinking込み上限の公式保証を確認できない |
| 26 | `API_COST_PROBE_INVALID` | probe要求・raw応答・token値の束縛不正 |
| 27 | `API_BUDGET_EXCEEDED_BEFORE_SEND` | 送信前の最大費用がUS$0.50超過 |
| 28 | `API_BUDGET_REQUEST_MISMATCH` | final計測requestとB6送信byteが不一致 |
| 29 | `API_TRANSPORT_CONTRACT_VIOLATION` | 回数・再試行・timeout、HTTP/Content-Type/JSON/model/tier、candidate本文外形、transport/I/O、raw先行保存のいずれかが契約外 |
| 30 | `API_USAGE_ACCOUNTING_INVALID` | 応答candidate件数、usageの算術または事前上界との関係が不正 |
| 31 | `API_RESPONSE_TIER_MISMATCH` | 応答がStandard以外を明示 |
| 32 | `SECRET_LEAK_DETECTED` | 生keyが保存物・出力へ残った |
| 33 | `API_USAGE_BUDGET_VIOLATION` | 応答usageの事後換算が上限超過 |
| 34 | `B6_DOWNSTREAM_EXECUTION_FAILED` | 生応答保存後のB1/B4 child processが終了2、または終了0/1でもstdout/stderrの観測契約に違反し、成功・検査済み拒否として安全に記録できない |

各新規codeは少なくとも1件の発火検査を持つ。exportしたcode集合と、検査で観測したcode集合の完全一致をassertする。

## 11. 検査契約

新規検査は90件に固定する。既存検査の期待値は変更しない。

| ID | 検査する事実 |
|---|---|
| R01 | v002台帳の正常例がspeaker_only preset 1件として解決する |
| R02 | 3型語彙の欠落を拒否する |
| R03 | 3型以外の語彙追加を拒否する |
| R04 | `screen_speaker`を「許可語彙・preset未登録」で拒否する |
| R05 | `speaker_pair`を「許可語彙・preset未登録」で拒否する |
| R06 | 5 probeのexact入力schema・完全path展開・source index・runtime 4実体、preview認定file SHA、固定decoderの2×2 RGBA fixture、またはapproved/regenerated RGBA SHAの不一致を拒否する |
| R07 | trust対象15 path、Remotion画素生成rootの相対runtime import graph、font/license、またはSHAの不一致を拒否する |
| R08 | canvas、safe area、font、134px、縁11px、光彩17px、最大2行、安全上限14のいずれかの改変を拒否する |
| R09 | 登録済み型集合がpreset列から`["speaker_only"]`へ決定的に導出され、preset finalizerの終了0/1/2が固定stdout schemaへ一致する。passed/rejected reportのjob・実装・runtime来歴、passedのdurable reportとstdoutのbyte一致、2-root公開のcommit record欠落を検査する |
| S01 | B3 v002の正常jobと固定7件のimplementation bindingを受理する |
| S02 | 同一入力からpackage 7成果物がbyte一致する |
| S03 | jobの欠落key・余分なkey・順序違いを拒否する |
| S04 | 縦型入口がv001 jobを拒否し、横型入口がv002 jobを拒否する |
| S05 | manifest v002がexact 14 keyを持つ |
| S06 | manifestのformat/表示制約がjob入力とbyte一致する |
| S07 | 幅の0・負数・小数点表記・指数表記・unsafe integerを拒否する |
| S08 | job幅がpreset安全上限を1超えた場合に拒否する |
| S09 | 共通B3処理へcandidate ID、素材SHA、14を埋め込んでいないことを静的検査する |
| S10 | B3 runnerの終了0/1/2が固定stdout schemaへ一致し、失敗時に正式成果物0件、既存出力変更0件である |
| W01 | B1 v002が固定7件のimplementation binding、job幅14、全行14以下の正常回答を受理する |
| W02 | B1 v002が同じjobで幅15の行を既存違反へ帰属する |
| W03 | manifestと意味入力の幅不一致を拒否する |
| W04 | 意味入力と展開写像の幅不一致を拒否する |
| W05 | manifestと台帳のpreset不一致を拒否する |
| W06 | manifestと台帳のstate不一致を拒否する |
| W07 | 1まとまり2行を受理する |
| W08 | 1まとまり3行を拒否し、B1 runnerの終了0/1/2が固定stdout schemaへ一致する |
| W09 | B5はshared builderとformal runnerの両方をSHA束縛し、幅binding不一致時にcountTokensを0回のまま固定stdout schemaで停止する |
| W10 | B5 instructionに14・36等の幅数値を埋め込まず入力fieldを参照する |
| W11 | B3の仕事本文が唯一の意味指示で、B5側の本文複製が0件である |
| D01 | B4 v004の正常入力と固定23件のimplementation binding、およびrenderer trustが所有する3件のlive importを照合し、表示計画v002とreview request v004を生成する |
| D02 | format不一致を拒否する |
| D03 | packageとcropの画面型不一致を拒否する |
| D04 | crop provenanceのsource mediaと基礎映像由来が違う場合を拒否する |
| D05 | packageとinstructionのpreset不一致を拒否する |
| D06 | packageとinstructionのstate不一致を拒否する |
| D07 | package・意味入力・展開写像・表示計画の幅不一致を拒否する |
| D08 | 最大行数または文字幅規則の不一致を拒否する |
| D09 | crop decisionのfile SHA差し替えを拒否する |
| D10 | v004入口が旧package v001と旧review request v003を拒否する |
| D11 | 同一入力から6成果物とreportがbyte一致し、B4 runnerの終了0/1/2が固定stdout schemaへ一致する |
| D12 | cue幅はjob入力値で判定され、14合格・15拒否になる |
| V01 | speaker_onlyの正常viewportだけを共通crop計算へ渡す |
| V02 | 必須viewport key欠落を拒否する |
| V03 | 余分なviewport keyを拒否する |
| V04 | 非有限値・範囲外・左右上下逆転をclamp前に拒否する |
| V05 | crop decisionの実体SHA不一致を拒否する |
| V06 | `buildLayoutVideoFilter`実体SHA不一致を拒否する |
| V07 | 共通crop filter構築失敗を専用違反へ帰属する |
| V08 | crop後が1080×1920・30fpsでない場合を拒否する |
| V09 | frame数変化を拒否する |
| V10 | 音声packetまたはsample写像の変化を拒否する |
| V11 | B4明示行と文字model戻り値の本文・改行・順序不一致を拒否する |
| V12 | 末尾句点を含む正常な明示行が1文字も変わらず描画modelを通る |
| V13 | 134pxの認定probeは実alpha安全領域内、135pxは領域外になる |
| V14 | 版中立QCが6項目を同じ計算で返し、いずれか不合格なら公開しない。rendererの終了0/1/2、code→stage/variant、stage別exact metricsは固定stdout schemaへ一致し、途中失敗を0/nullで補完せずfatalへ分離する |
| V15 | managed fontのload失敗を`FONT_LOAD_FAILED`へ帰属し、正式PNG 0件で停止する |
| V16 | 正式入口が環境command、PATH解決、browser自動解決を拒否し、SHA束縛済みNode・Remotion CLI・browser・FFmpeg・FFprobe・ImageMagickだけを起動する。開始時と公開直前にjobの29実装束縛、trustの15描画依存、font/license、tool実体を再読し、未登録local importまたは差し替えを拒否する |
| V17 | 縦型と横型が同じ下位描画・合成・QC・原子的公開入口を呼び、縦型側に同等処理の複製がない |
| V18 | managed fontのload後check falseを`FONT_FALLBACK_DETECTED`へ帰属し、正式PNG 0件で停止する |
| V19 | `@zev2/shared`を第三者packageとして除外せず、symlinkのlink text・realpath・package exportsとruntime 4 fileを照合する。別workspace package、別target、未登録runtime fileを拒否する |
| C01 | model、Standard単価、上限、tier省略の公式確認不能で外部通信前停止する |
| C02 | exact countTokens endpointの無課金を公式確認できない場合、API 0回で停止する |
| C03 | countTokensが課金promptの上界になる公式保証が無い場合、API 0回で停止する |
| C04 | maxOutputTokensがcandidate+thinkingの上界になる公式保証が無い場合、API 0回で停止する |
| C05 | 価格、token、予算、公式証拠、request SHAの外形・binding不正を、通信前のmeasurement stop reportへ帰属する。requestBindings/tokenDiagnosisとartifactの1対1対応違反も含む |
| C06 | countTokensのHTTP/Content-Type/strict JSON/整数token/detail契約、probe request/raw/token bindingの欠落・差し替え・算術不正を`API_COST_PROBE_INVALID`へ帰属し、probe/final各response stageのmeasurement stop reportを検査する |
| C07 | US$0.50ちょうど以下を受理し、1 nanoUSDまたは1 token超過を拒否する |
| C08 | 入力料金だけでUS$0.50以上、またはfinal式超過ならgenerateContent 0回で停止する |
| C09 | final requestへ`model` 1 keyだけを加えた4-key objectを2回目の`countTokens`へ渡し、保存後に`model`だけを除いた3-key投影の再直列化byteがB6送信byteと完全一致することを検査する。余分keyまたは1 byte差を拒否する |
| C10 | 最大有効回答JSONが1 candidate=1 meaning group=1 lineで決定的に作られ、費用保証へ使われない |
| C11 | B6 job、entry、固定15件のlocal import closureを開始時・commit point直前に照合し、manifest/stop reportへjobBindingとimplementationBindingを写したうえで、合格した固定requestだけをgenerateContentへ1回送る。job/fixed request未解決は欠落stop reportでなく通信0回の共通fatalへ分離する |
| C12 | timeoutが600秒でない、再試行/model切替が0でない、raw durable保存不能・raw保存前解析、HTTP/Content-Type/JSON/modelVersion/tier外形不正、応答model不一致、またはcandidate本文がexact 1 text partでない場合を`API_TRANSPORT_CONTRACT_VIOLATION`へ帰属する。raw未保存時は存在しないartifactを作らない |
| C13 | 生keyをrequest記録、URL、header、log、manifest、stdout、stderrのいずれかへ混入した負例を専用違反へ帰属し、正常例0件も確認する |
| C14 | candidate配列またはusage 4 fieldの外形、prompt/candidate/thinking/total算術の不一致を`API_USAGE_ACCOUNTING_INVALID`へ帰属する |
| C15 | 実測promptまたはcandidate+thinkingが事前上界を越えた場合、B1へ進めない |
| C16 | regexに適合する応答tierが`standard`以外なら、生値を保存して専用違反へ帰属する |
| C17 | 実測費用がUS$0.50超過なら専用違反へ帰属し、B1へ進めない |
| C18 | provisional/finalの`candidateCount`が整数token表記1である。欠落・0・2・`1.0`・`1e0`はAPI 0回の`pre-measurement` stop reportで拒否する |
| C19 | raw応答のcandidate配列がexact 1件である。欠落・0件・2件以上はB1へ進めず、外形欠落はstop report、件数違反はB6 manifestへ記録する |
| C20 | claim/source固定語彙・順序・verdict・入力snapshot→正式snapshotのbyte同一コピー・snapshot byte slice・excerpt SHA、RFC 3339 UTC時刻形式、B5/B6のAsia/Tokyo実行暦日との一致を検査し、入力/出力root同一、不正形式、日跨ぎ、自己申告boolean、根拠なしverified、古い証拠を拒否する |
| C21 | B1/B4 child processの終了2、または終了0/1での空stdout・複数JSON・schema違い・非空stderrをdownstream stop reportへ帰属し、生exit code、stdout/stderrのbyte長とSHAを記録する。raw応答とsecret検査後にdurable保存できたstdoutだけを固定順で保持し、stderr artifactや存在しないartifact、部分成功へ偽装しない |
| C22 | B1の`abstained`を検査済み停止としてB6 manifestへ記録し、compiler/B4を生成せず、空violationsを失敗や合格へ偽装しない |
| C23 | B6 manifest/stop report自身のdurable保存・公開失敗を、受理commit point 0件・固定fatal JSON・終了2として観測する。先行保存済み中間証拠は削除せずorphan evidenceとして隔離する |
| H01 | candidate 13/59の保存済み正式成果物tree SHAが作業前後で一致する |
| H02 | 横型B3の処理結果projectionが変更前後でbyte一致する |
| H03 | candidate 13 B6回帰9/9が維持される |
| H04 | 横型B4既存検査とrenderer v003 19/19が維持される |
| H05 | v002字幕24/24が維持される |
| H06 | 横型QC v003 wrapperの結果projectionがbyte一致し、変更可能なのは承認済み実装来歴SHAだけである |

34 codeの所有検査を次に固定する。複数の負例が同じcodeを観測してよいが、所有者codeを実装者が選び直してはならない。

| code順 | 所有検査 | code順 | 所有検査 |
|---:|---|---:|---|
| 1 | R08 | 18 | V10 |
| 2 | R02 | 19 | V11 |
| 3 | R04 | 20 | V16 |
| 4 | R06 | 21 | C05 |
| 5 | R07 | 22 | C01 |
| 6 | S07 | 23 | C02 |
| 7 | S08 | 24 | C03 |
| 8 | W03 | 25 | C04 |
| 9 | D02 | 26 | C06 |
| 10 | W05 | 27 | C08 |
| 11 | D03 | 28 | C09 |
| 12 | V02 | 29 | C12 |
| 13 | V05 | 30 | C14 |
| 14 | V06 | 31 | C16 |
| 15 | V07 | 32 | C13 |
| 16 | V08 | 33 | C17 |
| 17 | V09 | 34 | C21 |

V15とV18は既存rendererの`FONT_LOAD_FAILED`と`FONT_FALLBACK_DETECTED`を1 codeずつ観測し、新規34 code集合へ重複登録しない。C18、C19、C20の期待codeはそれぞれ新規code 29、30、21であり、既存所有検査C12、C14、C05と同じ所有規則を再確認する負例である。

export code集合と実測発火集合を完全一致assertする。合格数だけでなく、90件全てについてID、期待status、期待code（正常系、C22、C23のpublication fatal枝は`null`）、実測codeの一件表を保存する。1検査IDに複数の所有codeを詰め込まない。

横型回帰は二層比較にする。処理結果、字幕本文、時刻、行分割、合否、QCはbyte完全一致を必須とする。共有処理の抽出で正当に変わり得る実装来歴SHAは、承認された変更fileだけに限定し、新しい実file SHAとの一致を別に検査する。「来歴だから何でも変えてよい」とはしない。保存済みcandidate 13/59の正式成果物は一切書き換えない。fixture・期待値を変更して通すことは禁止する。

H01のbaselineは作業ツリーから採らない。candidate 13は`stable/first-clip-complete-20260727`（`cfa7811c917892fccd39edf9c85aa6e3af2dde97`）、candidate 59は`stable/second-clip-generality-20260728`（`09ce3c980e9607b6265b1062e05f3ef171f3c72c`）の各treeに存在する正式成果物path集合を辞書順で列挙し、`path + NUL + blob SHA`列のSHA-256を開始baselineにする。終了時はtag blobと現在filesystemの同pathを安定読取で比較し、欠落、追加、byte差を全て拒否する。

## 12. 横型との分離

- 横型の正式job、成果物、台帳、trust、renderer v003は変更しない。
- 横型が使う値は引き続き36・最大2行で、処理結果projection、字幕本文、時刻、行分割、合否、QCを維持する。共有実装を抽出したfileの来歴SHAだけは承認済み変更として別層で照合する。
- 共通化するのは、すでに存在する文字、hash、表示計画、crop、描画、QCの計算である。
- 新縦型入口は新schemaだけを受理する。旧版の暗黙変換、fallback、兼用fieldは作らない。
- 横型に新しい画面型fieldを後付けして保存済み成果物を書き換えない。

## 13. 実装ファイル数

実装上限を**40ファイル（新規24、既存限定変更16）**に固定する。41ファイル目が必要なら、実装せず停止して理由を申告する。

### 13.1 新規24

| # | path | 役割 |
|---:|---|---|
| 1 | `evals/clip_composition/finalize_presentation_vertical_speaker_only_preset_v001.mjs` | 認定済み値から縦型台帳4成果物とtrustを決定的に構築 |
| 2 | `evals/clip_composition/presentation_vertical_speaker_only_preset_finalization.test.mjs` | R01〜R09 |
| 3 | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json` | v002台帳、speaker_only preset 1件 |
| 4 | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-validation-index.json` | 台帳検査結果と登録済み型の導出値 |
| 5 | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/material-validation-index.json` | 空素材index |
| 6 | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/trusted-registry-bindings.json` | 3〜5のpath・SHA束縛 |
| 7 | `evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001/trust.json` | 共通crop・文字・QC実体と認定来歴の束縛 |
| 8 | `evals/clip_composition/run_presentation_caption_semantic_source_package_job_v002.mjs` | B3縦型jobだけを受ける正式runner |
| 9 | `evals/clip_composition/test_presentation_caption_semantic_source_package_v002.mjs` | S01〜S10 |
| 10 | `evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs` | package manifest v002とGemini回答をB1へ渡す正式runner |
| 11 | `evals/clip_composition/test_presentation_caption_semantic_output_v002.mjs` | W01〜W08と幅binding負例 |
| 12 | `evals/clip_composition/run_presentation_caption_gate_b5_initial_v002.mjs` | 縦型packageをB5共通処理へ渡す初回入口 |
| 13 | `evals/clip_composition/test_presentation_caption_gate_b5_initial_v002.mjs` | W09〜W11とcountTokens前停止 |
| 14 | `evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs` | 公式値と実測tokenから予算上限を整数計算 |
| 15 | `evals/clip_composition/test_presentation_caption_api_cost_guard_v001.mjs` | C01〜C10 |
| 16 | `evals/clip_composition/run_presentation_caption_gate_b6_job_v002.mjs` | B5 v002保証、package v002、crop付きB4 template v002だけを受けるB6入口 |
| 17 | `evals/clip_composition/test_presentation_caption_gate_b6_job_v002.mjs` | C11〜C23（B6 v002 schema、通信回数、secret、B4受け渡し、保存失敗） |
| 18 | `evals/clip_composition/presentation_instruction_contract_v004.mjs` | 縦型instruction外形を検査しv003共有処理を呼ぶ |
| 19 | `evals/clip_composition/presentation_caption_display_pair_v004.mjs` | B4縦型成果物と論理layout preflightを構築しv003共有処理を呼ぶ |
| 20 | `evals/clip_composition/test_presentation_caption_display_pair_v004.mjs` | D01〜D12 |
| 21 | `evals/clip_composition/run_presentation_caption_display_pair_job_v002.mjs` | B4 v002 jobを正式rootで1回実行 |
| 22 | `evals/clip_composition/render_presentation_vertical_review_v001.ts` | crop後の縦型基礎映像へ共通字幕描画を適用 |
| 23 | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs` | V01〜V19 |
| 24 | `evals/clip_composition/presentation_vertical_formal_path_integration_v001.test.mjs` | 5領域の受け渡しとH01〜H06 |
| **合計** |  | **24** |

### 13.2 既存限定変更16

| # | path | 変更の意味 |
|---:|---|---|
| 1 | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` | 既存計算へ表示方針を渡す純粋入口を公開。v001 wrapper不変 |
| 2 | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` | 固定36比較を引数化し、manifest v002用入口を公開 |
| 3 | `evals/clip_composition/test_presentation_caption_semantic_output_v001.mjs` | 横型の結果projection不変回帰を追加 |
| 4 | `evals/clip_composition/run_presentation_caption_gate_b5_v004.mjs` | package v002入力と導出済み出力上限を受ける共有入口 |
| 5 | `evals/clip_composition/test_presentation_caption_gate_b5_v004.mjs` | 横型B5不変と縦型入力の分離を検査 |
| 6 | `evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs` | v002 wrapperが呼ぶ共有送信・raw保存・usage検査入口を公開。v001 wrapper不変 |
| 7 | `evals/clip_composition/test_presentation_caption_gate_b6_v001.mjs` | 実測usage、通信規律、secret非保存、v001不変 |
| 8 | `evals/clip_composition/presentation_instruction_contract_v003.mjs` | format中立の共有検査を公開。v003 wrapper不変 |
| 9 | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` | format中立の共有B4計算を公開。v003 wrapper不変 |
| 10 | `evals/clip_composition/test_presentation_caption_display_pair_v003.mjs` | 横型B4の結果projection不変回帰を追加 |
| 11 | `evals/clip_composition/presentation_renderer_qc_v002.mjs` | 同じ6項目計算を呼ぶ版中立入口と、縦型jobの束縛済みFFprobe/ImageMagick pathを受ける入口を追加。PATH名を使う横型wrapperと結果projectionは不変 |
| 12 | `evals/clip_composition/render_presentation_v002.mjs` | 検査済みplan、overlay adapter、束縛済みFFmpeg/FFprobe/ImageMagick pathを受ける下位共通描画・合成・QC・公開入口を抽出。縦型はPATH検索せず、横型wrapper不変 |
| 13 | `runner/src/remotion/Root.tsx` | 共通TelopStillへoffsetと任意の行mask indexを正式propとして追加。既定時不変 |
| 14 | `runner/src/remotion/renderer/TelopRenderer.tsx` | 同じ文字model・配置で指定行だけを描き、font失敗をfallbackせず停止 |
| 15 | `runner/src/telop-remotion.ts` | 台帳→描画の型を一意化し、行maskと束縛済みNode/Remotion/browserを共通入口へ渡す。環境command・PATH・browser自動解決を正式入口から排除 |
| 16 | `runner/src/telop-style.ts` | `TelopPositionStyle`へ認定済みoffset X/Yを正式fieldとして追加 |
| **合計** |  | **16** |

正式job、countTokens生応答、Gemini生応答、表示計画、MP4などの実行成果物は、この実装ファイル数に含めない。各実走前に新規生成件数を別途申告する。

### 13.3 正式保存先とrunner共通契約

正式保存先のrootを次に固定する。`<id>`はjob内の安全なIDと一致し、既存pathや使用済みpathを受理しない。

| 工程 | root |
|---|---|
| 縦型preset台帳 | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/` |
| 縦型renderer trust | `evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001/` |
| preset finalization job | `evals/clip_composition/outputs/presentation/vertical-preset-finalization-jobs/<jobId>.json` |
| preset finalization report | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-finalization-report.json` |
| B3 job | `evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs/<jobId>.json` |
| B3 package | `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/<artifactId>/` |
| B1 job | `evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/<attemptId>.json` |
| B1 validation report | `evals/clip_composition/outputs/presentation/caption-gate-b6/<runDirectoryId>/semantic-output-validation-report.json` |
| B5 job | `evals/clip_composition/jobs/presentation/caption-gate-b5-initial/<jobId>.json` |
| B5 output | `evals/clip_composition/outputs/presentation/caption-gate-b5/<jobId>/` |
| B6 job | `evals/clip_composition/outputs/presentation/caption-gate-b6-jobs/<jobId>.json` |
| B6 output | `evals/clip_composition/outputs/presentation/caption-gate-b6/<runDirectoryId>/` |
| B6 semantic raw | `evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/<attemptId>.json` |
| B4 static template | `evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/<safeBasename>.json` |
| B4 job | `evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/<attemptId>.json` |
| B4 pair | `evals/clip_composition/outputs/presentation/caption-display-pairs/<pairId>/` |
| B4 passed validation report | `evals/clip_composition/outputs/presentation/caption-display-pairs/<pairId>/pair-validation-report.json` |
| 縦型renderer job | `evals/clip_composition/outputs/presentation/vertical-review-render-jobs/<jobId>.json` |
| 縦型renderer | `evals/clip_composition/outputs/presentation/vertical-review-renders/<jobId>-result/` |

`<safeBasename>`はB6 jobの`b4StaticTemplate.path`にあるbasenameであり、§9.3の正規表現、regular file、symlink禁止、root内realpath検査を満たす値だけを受理する。templateの`jobId`からfilenameを推測しない。B6/B4の`attemptId / pairId / publication path`は§9.3の対応式、縦型rendererの`jobId / renderId / outputDirectory`は§8.1の対応式を正本とする。

本設計で新設するrunnerは終了0/1/2、単一JSON stdout、stderr 0 byte、既存path上書き禁止を共通契約とする。既存横型v001 runnerのstream契約は変更せず、新しいB1/B4 v002 wrapperだけがこの共通契約へ揃える。job schemaが保存先を持たない工程へ環境変数やCLI引数で別pathを注入しない。testは検査所有の一時workspaceだけを使い、正式rootへ書かない。

runner別の終了codeとstdout schemaを次に固定する。表中のreport/manifestは、正式保存に成功したbyteとstdout byteが完全一致しなければならない。終了1の「検査済み拒否」はviolationsが空でないことを必須とし、`abstained`だけはB1既存契約どおり空violationsを許す。

| 実行入口 | 終了0 stdout | 終了1 stdout | 終了2 stdout |
|---|---|---|---|
| preset finalizer | `presentation-vertical-preset-finalization-report-v001`、`status=passed` | 同schema、`status=rejected` | 共通fatal、`diagnosticCode=VERTICAL_PRESET_FINALIZER_FATAL` |
| B3 v002 runner | package validation report v002、`status=passed` | 同report、`status=rejected` | 共通fatal、`diagnosticCode=CAPTION_B3_V002_RUNNER_FATAL` |
| B1 v002 runner | semantic validation report v002、`status=passed` | 同report、`status=rejected`または`abstained` | 共通fatal、`diagnosticCode=CAPTION_B1_V002_RUNNER_FATAL` |
| B5 v002 runner | B5 manifest v002、`status=passed` | cost verification stop report v001、またはmeasurement stop report v001の`status=blocked` | 共通fatal、`diagnosticCode=CAPTION_B5_V002_RUNNER_FATAL` |
| B6 v002 runner | B6 manifest v002、`status=passed-to-b4` | B6 manifest v002の検査済み停止、またはdurableなB6 stop report v001 | attempt context成立前は共通fatal `CAPTION_B6_V002_RUNNER_FATAL`。成立後はdurableなB6 stop report v001。manifest/stop reportのcommit recordを公開不能なら`presentation-caption-gate-b6-publication-fatal-v001` |
| B4 v002 runner | pair validation report v003、`status=passed_pending_human_review` | 同report、`status=rejected` | 共通fatal、`diagnosticCode=CAPTION_B4_V002_RUNNER_FATAL` |
| vertical renderer v001 | vertical render manifest v001、`status=passed` | `presentation-vertical-review-render-failure-v001`、`status=rejected` | 共通fatal、`diagnosticCode=VERTICAL_RENDER_V001_RUNNER_FATAL` |

共通fatalのtop-level exact keyは`schemaVersion / runnerId / status / diagnosticCode`である。`schemaVersion = presentation-formal-runner-fatal-v001`、`status = fatal`、`runnerId`は上表の実行入口に対応するschema ID、`diagnosticCode`は上表のliteralだけを許す。原因文、入力本文、path、secretを足さない。このstdoutは上位実行者の観測値であり、正式reportや部分合格を名乗らない。

preset finalization reportのtop-level exact keyは`schemaVersion / status / jobBinding / implementationBinding / runtimeProfile / violations / outputBindings`である。`schemaVersion = presentation-vertical-preset-finalization-report-v001`。`jobBinding`は`path / fileSha256 / canonicalSha256`のexact 3 keyで、開始時にstrict decodeした正式job実体を指す。`implementationBinding`と`runtimeProfile`は、同jobの同名objectをkey順・値ともbyte同一で写す。

passedではviolationsが空、outputBindingsが`presetRegistry / presetValidationIndex / materialValidationIndex / trustedRegistryBindings / rendererTrust`のexact 5 key、各値が`path / fileSha256 / canonicalSha256`である。passed reportは上表の固定pathへdurable保存し、stdoutへ返すbyteと完全一致させる。

rejectedではviolationsが1件以上、outputBindingsはexact `null`であり、台帳・trust成果物を0件にしてreportをstdoutだけへ返す。`violations[]`は`code / relatedPaths`のexact 2 key、codeは`VERTICAL_PRESET_REGISTRY_INVALID / VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID / VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH / VERTICAL_PRESET_TRUST_BINDING_MISMATCH / VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH`の固定5値だけを§10の全体順で許す。`relatedPaths`は空でない辞書順unique文字列配列とする。同じ不正を2 codeへ重複所有させず、外形・値はregistry、3型集合はvocabulary、人間認定preview/5 probe画素はapproval、台帳/trust/依存path-SHAはtrust、finalizer runtimeの7 tool path/version/SHAはruntimeがそれぞれ所有する。

finalizerは開始直後と各probe直前と2-root公開直前にjob、`implementationBinding`全実体、`runtimeProfile`全実体を再読する。開始後にこのいずれかが開始時byte/SHAと変わった場合、実行中process自身の信頼性または入力同一性が失われているため、成果物もrejected reportも公開せず共通fatal・終了2にする。開始時点から存在する台帳・preview・trust入力の不一致だけを、上記5 codeを持つrejected reportへ帰属する。jobが開始時にstrict decodeできず`jobBinding`を真実に構築できない場合、またはreportのdurable保存前にjobを再読できない場合も同じである。これにより、job/entry差し替えをtrust codeへ誤帰属しない。

vertical render failureのtop-level exact keyは`schemaVersion / status / failureStage / jobBinding / violations / observedProjection`である。`schemaVersion = presentation-vertical-review-render-failure-v001`、`status = rejected`、jobBindingは`path / fileSha256 / canonicalSha256`、violationsは非空である。failureはstdout専用で、予約filenameへ保存しない。

`failureStage`は`input-binding / implementation-binding / runtime-binding / crop / text-layout / overlay-render / composition / qc`の8値だけを許す。publicationのI/O失敗は検査済み違反ではなく共通fatal・終了2であり、rejected failureへ偽装しない。`violations[]`は`code / relatedPaths`のexact 2 keyで、codeは下表で当該stage・variantへ割り当てた固定値だけ、relatedPathsは空でない辞書順unique文字列配列とする。同じ原因を複数stageまたは複数codeへ帰属しない。

`observedProjection`は`stage / variant / metrics`のexact 3 keyで、stageはfailureStageとbyte同一である。variantとmetricsは次の一件表だけを許す。1件のfailureに含める違反は、同じvariantの単一検査passで同時に観測したものだけである。別variantまたは後段の違反を併合しない。

| stage | variant | 所有code | `metrics`のexact key |
|---|---|---|---|
| `input-binding` | `input-binding-summary` | `VERTICAL_LAYOUT_DECISION_INVALID / VERTICAL_LAYOUT_INPUT_HASH_MISMATCH` | `verifiedInputBindingCount / requiredInputBindingCount` |
| `implementation-binding` | `implementation-binding-summary` | `VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH` | `verifiedImplementationBindingCount / requiredImplementationBindingCount` |
| `runtime-binding` | `runtime-binding-summary` | `VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH` | `verifiedRuntimeToolCount / requiredRuntimeToolCount` |
| `crop` | `crop-filter-build` | `VERTICAL_LAYOUT_FILTER_BUILD_FAILED` | `sourceWidth / sourceHeight / sourceFrameCount / filterConstructed` |
| `crop` | `crop-output-format` | `VERTICAL_BASE_FORMAT_MISMATCH` | `sourceWidth / sourceHeight / outputWidth / outputHeight / outputFpsNumerator / outputFpsDenominator` |
| `text-layout` | `text-model` | `VERTICAL_RENDER_TEXT_MODEL_MISMATCH` | `instructionCount / lineCount / instructionTextSha256 / renderModelTextSha256` |
| `overlay-render` | `font-load` | 既存`FONT_LOAD_FAILED` | `expectedOverlayCount / fontLoaded` |
| `overlay-render` | `font-check` | 既存`FONT_FALLBACK_DETECTED` | `expectedOverlayCount / fontLoaded / fontCheckPassed` |
| `composition` | `frame-count` | `VERTICAL_BASE_FRAME_COUNT_MISMATCH` | `expectedFrameCount / outputFrameCount` |
| `composition` | `audio-payload` | `VERTICAL_BASE_AUDIO_MISMATCH` | `expectedAudioPacketPayloadSha256 / outputAudioPacketPayloadSha256` |
| `qc` | `qc-summary` | 既存QC moduleがexportする固定違反集合 | `passedQcCount / requiredQcCount` |

countは0以上のsafe integer、寸法・fps分母・expectedFrameCountは正整数、fps分子とoutputFrameCountは0以上のsafe integer、SHAはlowercase 64 hexである。`filterConstructed`は`crop-filter-build`ではexact `false`、`fontLoaded`は`font-load`ではexact `false`、`font-check`ではexact `true`、`fontCheckPassed`はexact `false`である。未取得値を0、空文字、null、推測値で補完しない。

上表のexact metricsを全て実測できた検査済み違反だけがrejected failureを使える。crop/composition/overlayの子process起動不能、出力をstrict decodeできない、SHAを取得できない等によりvariantの全metricsを構築できない場合は、部分metricsを保存せず共通fatal・終了2にする。入力job自体をstrict decodeできずjobBindingを真実に作れない場合も同じである。この分離により途中失敗を偽の0/nullで埋めず、codeからstage/variantを一意に決める。

単一rootで完結するB3 package、B5、B4 pair、rendererは既存のwork→fsync→directory renameをcommit pointとする。縦型presetだけは台帳rootとrenderer trust rootの2 rootを持つ。両方を未使用work rootへ構築・fsyncし、trust rootを先、passed finalization reportを含む台帳rootを最後にrenameする。台帳root内のdurable reportを受理commit recordとし、このreportが無いtrust rootを正式presetとして参照しない。trust公開後に台帳公開へ失敗した場合はtrust rootを削除・再利用せずorphan evidenceとして申告し、共通fatalと終了2で停止する。全5 output bindingのSHA一致を再確認したreportだけが2 rootの成立を表す。

B1 reportはB6が所有するattempt内の中間証拠である。B6が先にB1 jobをwrite-exclusiveで保存し、child stdoutから受け取ったreportの同一生byteを`publication.b1ReportPath`へdurable保存する。childはB6所有pathを知らず、report保存を行わない。

B6だけは、生応答を解析前に別rootへ保存する必要があり、semantic raw、B1 job/report、B4 job/pairも別rootに分かれるため、全rootの原子性を主張しない。B6 attemptの受理commit pointは、最後にdurable公開されたB6 manifestまたはB6 stop reportのどちらか1件である。それ以前に作られたfileはattempt IDに閉じた**中間証拠**であり、commit pointなしに成功成果物として参照しない。manifest/stop reportの公開に失敗した場合、中間証拠を削除・上書きせず隔離保持し、固定fatal stdoutと終了2で停止する。同じattempt ID、run directory ID、pair IDを再利用せず、新attemptは別の承認を要する。完了報告は残った中間証拠をorphan evidenceとしてpath/SHA付きで申告し、正式完了と書かない。この限定された多root部分公開はraw先行保存と両立させるための保証境界であり、横型成果物や既存正式rootを変更する理由にしない。

B6が起動するB1/B4 childについて、終了0/1なのにstdoutが空、JSON 1件でない、期待schemaでない、またはstderrが非空の場合、B6はchildの成功・検査済み拒否を受理せず、**下流実行を安全に観測不能**として`B6_DOWNSTREAM_EXECUTION_FAILED`へ帰属する。child exit codeを2へ書き換えず、stdoutはsecret検査後に安全かつdurable保存できる場合だけ中間証拠として保持し、stderrは生byteを保存せず長さとSHAだけを`childObservation`へ記録する。これにより、終了2だけでなく「0/1だが契約どおり観測できない」場合もdownstream stop reportで表現できる。

本書で「現行と同じ」としたnested shapeは、基準commitの該当v001/v003 schemaのexact key・型・順序を指す。新schemaは不明key、欠落key、型違い、canonical順違いを拒否する。実装時に任意fieldや`additionalProperties`で穴を開けない。

## 14. 実装契約完全性チェック

| 確認項目 | 判定 | 根拠 |
|---|---|---|
| 本来の目的 | 合格 | ショート公開経路へ直結し、文書防御の増築ではない |
| 値レベル閉包 | 合格 | 認定値、3型語彙、登録1型、job幅14、安全上限14、2行、canvas、安全領域、US$0.50、整数式を固定 |
| schema閉包 | 合格 | B3 job/manifest v002、B1 v002、instruction/B4 v004、renderer v001のexact keyを明示。暗黙変換なし |
| 参照実体 | 合格 | preview、crop decision、font、共通crop・文字描画・QCのpathを特定 |
| 参照実体の存在 | 合格 | 設計時に全既存参照pathを読取確認。新規入口は実装対象として40件表へ収録 |
| 検査可能性 | 合格 | 90件のID一件表、新規34 code全発火と所有検査、横型回帰を固定 |
| 工程間受け渡し | 合格 | job→manifest v002→意味入力/展開写像→B5/B1→B4 v004→rendererを同じ値で照合 |
| 数値区分 | 合格 | 幅/行数/token/時刻、crop有限小数、費用整数演算を分離 |
| 計算正本 | 合格 | crop、文字幅、B3、B4、文字描画、QCの複製禁止を明記 |
| 観測データ取得可能性 | 合格 | local file/SHA/QCは既存入口で取得可能。API usageはraw応答から取得 |
| 外部API保証境界 | 合格（現在は通信停止） | 3つの公式保証を事前条件化。現行公式例はprompt上界を満たさないためAPI 0回で停止 |
| secret | 合格 | 環境変数からのみ読み、生key保存0件 |
| 出力path | 合格 | §13.3でrootを固定。全て版付き新directory、横型・preview・停止証拠を上書きしない |
| CLI終了 | 合格 | runner別0/1/2→stdout schemaを一件表化。失敗時の受理commit pointは0件で、B6だけはraw先行保存由来の中間証拠を隔離保持 |
| 環境 | 合格 | Node/TSX/FFmpeg/FFprobe/ImageMagick/Remotion/browser実体をmanifestへ記録し、正式実行は同一環境 |
| 汎用性 | 合格 | candidate ID、素材SHA、job幅、crop座標は正式job/dataだけ。共通コードへ焼き込まない |
| 人間負荷 | 合格（停止を含め申告） | 実装中0件。今回を含め完成まで最低4判断で、うち1件は公式保証停止を解く将来契約 |

設計者判断を要する未固定値は0件である。

実装時に機械的に確定する値は、生成後file SHA、実行binary SHA、最終request SHA、countTokens実測値、公式再確認値、実費だけである。これらは結果を見て人間が選ぶ値ではなく、正本実体から決定的に記録する。

外部仕様として実行日に再確認するのは、countTokens無課金、countTokens値が課金promptの上界、maxOutputTokensがcandidate+thinkingの上界、の3件である。これは実装者が推測で埋める値ではない。1件でも確認できなければ最初のAPI通信前に停止するため、契約上の分岐は一意である。

## 15. 人間作業

| 段階 | 人間作業 | 目安 |
|---|---:|---:|
| この設計の承認 | 1判断 | 1〜2分 |
| 実装・合成検査・横型回帰 | 0件 | 0分 |
| 実装完了後、正式job・API・描画へ進む承認 | 1判断 | 1〜2分 |
| v001の公式保証停止を解く将来契約 | 最低1判断 | 1〜2分（解決方法は未確認） |
| B5 token計測・費用計算（送信可能な将来版） | 0件 | 0分 |
| 縦型Gemini回答の数え上げ | 0件 | 0分 |
| B4物理違反が出た場合の局所再選択契約 | 条件付き1判断以上 | 本v001の作業量外。違反が出なければ0件 |
| 完成51.6秒MP4の最終目視 | 1判断 | 再生込み1〜2分 |

134pxの見た目はすでに認定済みなので、実装が§3.1の値を変えない限りpreset再認定を求めない。描画結果が認定previewと合わない場合は自動調整せず停止する。

したがって、B4物理違反が出ない場合でも、現在の公式資料が変わらない前提では、この設計承認から縦型完成までに人間判断は最低4回（今回を含む）である。物理違反が出た場合の局所再選択は別契約の判断が追加になる。v001は費用保証を推測で通さないため、実装だけではAPI通信や完成MP4へ到達しない。この停止を隠して「完成まで人間1回」とは申告しない。

## 16. 事実・推測・未確認

### 事実

- speaker_onlyのcropと134px字幕は人間目視合格済み。
- B3、B1、B4に固定36または固定横型presetが残っている。
- B5 promptは入力の幅を参照できる。
- 現行65,536 token上限では、保存済み入力tokenを使った理論上限がUS$0.502731になる。
- cropの共通計算と3型語彙は既存コードにある。
- 公式countTokens例には、同じtext promptで事前10 token、生成時prompt 11 tokenの例がある。
- 保存済みZEV実走では事前・事後の入力tokenが一致しているが、少数観測であり保証ではない。

### 推測

- 実費は過去のUS$0.041451に近く、US$0.50を大きく下回る可能性が高い。
- 縦型幅14では横型より意味まとまりが増える可能性がある。

これらは契約値や合格根拠に使わない。

### 未確認

- 縦型final requestの入力token
- 公式仕様上、送信上限がthinking込み課金tokenを拘束するか
- exact `models.countTokens` endpointが明示的に無課金か
- byte同一requestのcountTokens値が生成時prompt課金tokenの上界か
- Geminiが返す意味まとまり数
- 完成51.6秒MP4の最終見た目・聴感

## 17. 停止条件

実装承認後も、次のどれかで停止する。

- 40ファイルを越える。
- 6つ目の領域または別の計算正本が必要になる。
- 横型のfixture、期待値、正式成果物を書き換える必要が出る。
- crop、文字幅、B3、B4、描画、QCの計算を複製する必要が出る。
- 人間認定済みの文字造形や安全領域を変える必要が出る。
- countTokens無課金・prompt上界・thinking込み上界のいずれかを公式確認できない、またはUS$0.50超過を検出する。
- candidate 13/59横型の結果projectionまたはtree SHAが変わる。
- 同じ実行点で人間判断を要する停止が2回に達する。

## 18. 承認依頼

承認を求めるのは、**本設計を正本として、40ファイル以内の実装・90件の新規検査・既存横型回帰・縦型正式preset登録まで進むこと**である。

承認に含めないもの:

- countTokens実走
- Gemini生成
- 正式B3/B5/B6/B4 jobの作成
- 正式縦型MP4の生成
- 完成動画の安定点化

これらは、実装と回帰の完了報告を見て別途判断する。
