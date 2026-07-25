# candidate 13 基本テロップ B4 表示計画・v003対生成契約 設計v001

- 作成日: 2026-07-25
- 状態: **設計提示・承認待ち**
- 主線: B4（表示計画、v003解決パッケージ／指示書対、人間確認用描画入口のfield-level契約）
- 対象: `DmWu0jVQfTE` candidate 13「実家の母ちゃんから届いた謎の仕送り『月刊ムー』」
- 人間作業見積り: **承認判断1件、動画視聴0件、操作0件**

## 1. 結論

B4は、B6で機械検査を通った意味分割結果を、次の正式成果物へ**決定的に変換する契約**を先に固定する段階とする。

1. 文字IDへ戻した表示計画。
2. `presentation-resolution-package-v003`と指示書を含む`presentation-instruction-bundle-v003`。
3. G1〜G3の機械検査記録。
4. 固定プリセットによる配置事前検査。
5. 「描画確認待ち」であることを隠さないreview状態。
6. 人間確認用rendererへ渡す版付きrequest。

本設計ではコード、prompt、execution payload、Gemini実走、正式表示計画、描画媒体を作らない。承認後も、最初に許可を求めるのはB4実装・合成検査・読み取り専用preflightまでである。

正本の段階順は変更しない。

| 段階 | 内容 | この設計との関係 |
|---|---|---|
| B4 | 本文書の表示計画・v003対生成契約を固定 | **今回** |
| B5 | prompt、送信payload、モデル構成、token・費用、漏洩検査を固定 | 未着手 |
| B6 | Gemini run 1、raw出力保存、B1意味回答検査 | 未着手 |
| B7 | B4実装を正式回答へ適用し、v003対を生成して確認描画 | 未着手 |

この順序の目的は、Gemini回答を見てから通りやすい表示契約へ動かす過適合を防ぐことである。

## 2. 今回の本来の目的

初の一本は、G4〜G7、素材、SEを含まない基本テロップだけで配管を実証する。評価するのは次の三点に限る。

- 読める。
- 発話とズレない。
- 文字が欠けない。

地味であることは失敗ではない。一方、意味の自然な改行、実画面での読みやすさ、最終描画の美しさを機械合格と偽らない。

## 3. 契約正本と責務境界

### 3.1 入力側の正本

B4が受ける意味分割の唯一の正本は、B1の次の二つである。

1. `presentation-caption-semantic-output-validation-report-v001`
2. 同じB1 pure compilerを、同じsource packageと同じraw意味回答へ再適用して作る`presentation-caption-semantic-compiler-input-v001`

validation reportはcompiler入力の本文を保存せず、生成時のbyte SHA-256とcanonical SHA-256だけを保存する。B7は、reportの件数や要約からcompiler入力を推測しない。同じpure compilerで再生成し、二つのhashがreportと完全一致した場合だけB4 builderへ渡す。

### 3.2 B4が決めるもの

- 意味グループから正式cueへの一対一変換。
- cue、target、instructionの決定的ID。
- 文字、anchor、source時刻、timeline segmentの復元。
- source atom全件のexactly-once所属。
- v003解決パッケージと指示書の相互参照。
- G1〜G3、配置事前検査、review状態。
- 人間確認用rendererへ渡すrequestの形。

### 3.3 B4が決めないもの

- どこで意味を区切るか。
- 1行か2行か。
- Geminiのモデル版、prompt本文、実行面、費用。
- 自然な日本語の切れ目か。
- 人間が読みやすいと感じるか。
- G4〜G7、素材、SE、タイトル、サムネイル、冒頭のつかみ。
- 最終描画のfont fallback、画面外、重なり、音声保持。

### 3.4 v002との関係

v002の話者正規化、source時刻からframeへの写像、文字不変検査、描画中核、QCは低層の実績資産として参照する。ただし、v002成果物をv003へ読み替える変換、v002入口がv003を受理する分岐、v003不成立時のv002 fallbackは作らない。

v003は別schema・別正式入口とし、後方互換を持たない。

## 4. B4成果物

B7で正式生成する一対のrootには、次の**固定7ファイル**だけを置く。

1. `display-plan.json`
2. `instruction-bundle.json`
3. `caption-check-report.json`
4. `layout-preflight.json`
5. `review-render-request.json`
6. `pair-generation-manifest.json`
7. `pair-validation-report.json`

lock、work、temporary fileは正式rootへ残さない。未知ファイル、subdirectory、symlink、hardlinkを許可しない。

### 4.1 IDの決定規則

compiler入力のcontainer順、container内meaning group順を平坦化し、1始まり6桁ゼロ埋めで採番する。

| 種類 | 形式 |
|---|---|
| cue | `caption-cue-000001` |
| target | `caption-target-000001` |
| instruction | `caption-instruction-000001` |

一つのmeaning groupは、同じ序数を持つcue、target、instructionを一件ずつ作る。モデルが返した文字列をIDへ使わない。hashや時刻をIDへ埋め込まない。

全cueは一つのcaption contract `caption-contract-v003`へ入れる。

## 5. `display-plan.json`

schema:
`presentation-caption-display-plan-v001`

root field順:

1. `schemaVersion`
2. `displayPlanId`
3. `artifactId`
4. `sourceProvenance`
5. `atomGranularity`
6. `semanticCompilerInputBinding`
7. `sourceAtomBinding`
8. `timelineBinding`
9. `presetBinding`
10. `containers`

### 5.1 binding

`semanticCompilerInputBinding`:

1. `validationReport`: `{path, fileSha256, canonicalSha256}`
2. `rawSemanticOutput`: `{path, fileSha256, canonicalSha256}`
3. `compilerInputObservedByteSha256`
4. `compilerInputCanonicalSha256`

`sourceAtomBinding`:

1. `generationManifest`: `{path, fileSha256, canonicalSha256}`
2. `sourceAtoms`: `{path, fileSha256, canonicalSha256}`
3. `validationReport`: `{path, fileSha256, canonicalSha256}`
4. `rawSourceAtomsCanonicalSha256`

`timelineBinding`:

1. `generationManifest`: `{path, fileSha256, canonicalSha256}`
2. `timeline`: `{path, fileSha256, canonicalSha256}`
3. `validationReport`: `{path, fileSha256, canonicalSha256}`
4. `baseMedia`: `{path, fileSha256}`

`presetBinding`:

1. `trustedRegistryBindings`: `{path, fileSha256, canonicalSha256}`
2. `presetRegistry`: `{path, fileSha256, canonicalSha256}`
3. `presetValidationIndex`: `{path, fileSha256, canonicalSha256}`
4. `materialValidationIndex`: `{path, fileSha256, canonicalSha256}`
5. `presetId`

すべてのpathはworkspace相対の正規形を用い、`..`、絶対path、symlink、hardlinkを許可しない。

### 5.2 container

各containerのfield順:

1. `containerId`
2. `timelineSegmentId`
3. `speechId`
4. `cues`

containerはcompiler入力の元順を維持する。欠落、追加、重複、順序変更を許可しない。

### 5.3 cue

各cueのfield順:

1. `cueId`
2. `targetRefId`
3. `instructionId`
4. `globalCueOrdinal`
5. `meaningGroupOrdinal`
6. `lines`
7. `startAnchor`
8. `endAnchor`
9. `sourceStartMs`
10. `sourceEndMs`

`globalCueOrdinal`は全containerをまたぐ1始まり整数、`meaningGroupOrdinal`はcompiler入力のexact copyである。

各lineのfield順:

1. `lineOrdinal`
2. `sourceAtomIds`
3. `text`
4. `startAnchor`
5. `endAnchor`
6. `logicalWidth`

lineはcompiler入力のexact copyで、本文を整文しない。句読点付与、誤字修正、表記統一、空白削除、Unicode正規化を行わない。

cueのanchorと時刻:

- `startAnchor`: 最初のlineの`startAnchor`と完全一致。
- `endAnchor`: 最後のlineの`endAnchor`と完全一致。
- `sourceStartMs`: cue先頭atomの`startMs`。
- `sourceEndMs`: cue末尾atomの`endMs`。
- 区間は半開区間`[sourceStartMs, sourceEndMs)`。

一つのcueがtimeline segment境界をまたぐ場合は停止する。cue同士の境界接触、すなわち前cueの`sourceEndMs ===`次cueの`sourceStartMs`は違反にしない。交差長が正の場合だけ重なりである。

source atom同士の正の時刻重なりは、同時発話・STT揺れの観測として記録し、source入力拒否や同時表示許可へ使わない。時刻逆転、`startMs >= endMs`、atom順の逆転は拒否する。

## 6. `instruction-bundle.json`

schema:
`presentation-instruction-bundle-v003`

root field順:

1. `schemaVersion`
2. `pairId`
3. `displayPlanBinding`
4. `instructionSet`
5. `resolutionPackage`

`displayPlanBinding`:
`{displayPlanId, path, fileSha256, canonicalSha256}`

### 6.1 instruction set

schema:
`zev-presentation-instruction-v003`

field順:

1. `schemaVersion`
2. `instructionSetId`
3. `format`
4. `rendererContractVersion`
5. `sourceProvenance`
6. `resolutionPackageId`
7. `resolutionPackageCanonicalSha256`
8. `presetRegistryBinding`
9. `materialRegistryBinding`
10. `instructions`

固定値:

- `format`: `normal-landscape`
- `rendererContractVersion`: `zev-renderer-boundary-v003-review`
- preset registry: `normal-landscape-preset-registry-v001`
- material registry: `presentation-material-registry-empty-v001`

`presetRegistryBinding`:
`{registryVersion, presetValidationIndexSha256}`

`materialRegistryBinding`:
`{registryVersion, materialValidationIndexSha256}`

二つのSHA-256は承認済み`trusted-registry-bindings.json`の値と完全一致させる。instruction set内へregistry本文やfile pathを重複保存せず、pair manifestとjobが実ファイルbindingを保持する。

各instructionのfield順:

1. `instructionId`
2. `trigger`
3. `kind`
4. `target`
5. `presetId`
6. `materialRefs`

値:

- `trigger`: `{startAtomId}`。cueの最初のatom。
- `kind`: `speech-caption`だけ。
- `target`: `{targetType: "caption-target", targetRefIds: [<一件>]}`。
- `presetId`: `normal-landscape-readable-pop-v001`。
- `materialRefs`: 空配列。

初期版はcaptionと強調等の同時発火を作らない。複数指示の時間的衝突の適切さはG4〜G7／style課題であり、本B4合格は同時発火の適切さを意味しない。

### 6.2 resolution package

schema:
`presentation-resolution-package-v003`

field順:

1. `schemaVersion`
2. `resolutionPackageId`
3. `sourceProvenance`
4. `atomGranularity`
5. `sourceSpeakerNormalization`
6. `sourceAtomsSha256`
7. `sourceAtoms`
8. `targets`
9. `captionContracts`

`atomGranularity`は`character-timestamp`である。

`sourceSpeakerNormalization`のfield順:

1. `schemaVersion`
2. `normalizerVersion`
3. `registryVersion`
4. `registryCanonicalSha256`
5. `rawSourceAtomsCanonicalSha256`

正規化は既存`presentation_source_speaker_policy_v001.mjs`と同じpure処理を使う。

- `unknown`、`youtube-auto-caption`は版付き非人物台帳に従って`null`へ写す。
- `SPEAKER_00`等は人物名でない不透明な話者ラベルとして保持する。
- trim、文字列化、人物推測、多数決を行わない。

各source atomのfield順:

1. `atomId`
2. `speechId`
3. `speaker`
4. `text`
5. `startMs`
6. `endMs`

`sourceRef`はpackage rootの`sourceProvenance`へ一度だけ持ち上げ、atomへ重複保存しない。source atom列は正式な残存source atom 354件を元順に一度ずつ持つ。

`sourceAtomsSha256`は、正規化後の`sourceAtoms`配列だけをcanonical JSON化したSHA-256である。元ファイル全体のfile SHA、raw atom列のcanonical SHA、正規化後atom列のcanonical SHAを同じ意味として使い回さない。

各target:

1. `targetRefId`
2. `targetType`
3. `captionContractRefId`
4. `cueId`

固定値:

- `targetType`: `caption-target`
- `captionContractRefId`: `caption-contract-v003`

targetとcueは一対一である。

### 6.3 caption contract

caption contractのfield順:

1. `captionContractRefId`
2. `captionSchemaVersion`
3. `sourceDisplayPlanBinding`
4. `captionTargets`
5. `allowedSimultaneousGroups`
6. `captionPlan`

固定値:

- `captionSchemaVersion`: `presentation-caption-check-v003`
- `allowedSimultaneousGroups`: 空配列

`sourceDisplayPlanBinding`:
`{displayPlanId, fileSha256, canonicalSha256}`

各caption target:

1. `targetId`
2. `requiredAtomIds`
3. `allowedOmissionAtomIds`

`requiredAtomIds`は対応cueの全lineのatom列を平坦化したexact列、`allowedOmissionAtomIds`は空配列である。

`captionPlan`は`{cues}`だけを持つ。各cueのfield順:

1. `cueId`
2. `targetId`
3. `lines`
4. `startAnchor`
5. `endAnchor`
6. `startMs`
7. `endMs`

各lineは`{atomIds, renderedText}`。`renderedText`はatom本文の厳密連結で、display planのline本文とbyte単位で一致する。

全source atomはtarget群全体でexactly onceである。欠落、複数target所属、逆順、削除許可を一件でも検出したら停止する。

## 7. `caption-check-report.json`

schema:
`presentation-caption-check-report-v003`

field順:

1. `schemaVersion`
2. `checkerVersion`
3. `inputBindings`
4. `overallStatus`
5. `contract`
6. `checks`
7. `observations`
8. `scopeExclusions`

`checkerVersion`:
`presentation-caption-checker-v003`

`inputBindings`:

1. `displayPlan`: `{path, fileSha256, canonicalSha256}`
2. `instructionBundle`: `{path, fileSha256, canonicalSha256}`

status:

- `failed`
- `passed`
- `passed_with_declared_limit`

初回candidate 13は文字時刻入力なので、G1・G3がpassed、G2の機械的一致がpassedでも、`overallStatus`は`passed_with_declared_limit`とする。

`contract`:
`{status, violations, observations}`

`checks`のfield順:

1. `G1`
2. `G2`
3. `G3`

各check:
`{status, violations, unverified}`

G2の`unverified`は固定順で次の三件を持つ。

1. `linguistic_word_boundary`
2. `semantic_chunk_readability`
3. `on_screen_readability`

source atom正重なりは`observations`へ記録し、違反にしない。

`observations`のfield順:

1. `sourceAtomPositiveOverlaps`
2. `boundaryContacts`

各正重なり観測は`{leftAtomId, rightAtomId, overlapMs}`、境界接触は`{leftCueId, rightCueId, boundaryMs}`。該当なしは空配列で、件数だけに畳まない。

## 8. `layout-preflight.json`

schema:
`presentation-caption-layout-preflight-v001`

field順:

1. `schemaVersion`
2. `inspectorVersion`
3. `inputBindings`
4. `presetResolution`
5. `status`
6. `checks`
7. `observedProjection`
8. `scopeExclusions`

入力:

1. display plan。
2. instruction bundle。
3. trusted registry bindings。
4. preset registry。
5. preset validation index。
6. material validation index。

検査:

1. 1 cueは1行または2行。
2. 各lineの表示幅は正本本文から既存固定規則で再計算し36以下。
3. `caption-core-v001`、font、canvas、safe area、layout値が承認済みregistryと一致。
4. 事前幾何モデルでline同士が正に交差しない。
5. 事前幾何モデルでsafe area外へ出ない。
6. 実際に解決されたpreset IDと指定値が一致。
7. material参照が空で、空material indexと一致。

`presetResolution`のfield順:

1. `registryVersion`
2. `presetId`
3. `stateId`
4. `fontAssetId`
5. `transitionId`
6. `endResponsibility`
7. `canvas`
8. `safeAreaPx`
9. `layout`

固定値は承認済み台帳から解決し、jobへ複写した値を正本にしない。`stateId`は`caption-core-v001`、`endResponsibility`は`target-anchor`である。

`checks`は固定順で
`lineCount`, `logicalWidth`, `trustedPreset`, `safeArea`, `lineIntersection`, `materialRegistry`
の6件。各要素は`{name, status, violationCodes}`。

`observedProjection`:
`{cueCount, lineCount, maximumObservedLineLogicalWidth, safeAreaFailureCount, positiveLineIntersectionCount}`。

表示幅36、最大2行、文字幅規則、layout値は人間認定済み台帳の値であり、新しい係数ではない。

この検査は実フォントを載せた最終描画QCではない。font fallback、alpha bounds、実overlayの交差、画面外、最終動画の欠落、音声保持は`not_verified_before_render`として残す。

## 9. review状態と`review-render-request.json`

### 9.1 状態

対生成時のreview状態は次のexact objectである。

```json
{
  "stage": "review_input_ready",
  "reviewOnly": true,
  "publicationAllowed": false,
  "segmenterBoundaryEvidence": "passed",
  "semanticStructure": "passed",
  "naturalBoundary": "pending_human_review",
  "semanticReadability": "pending_human_review",
  "layoutPreflight": "passed",
  "renderedLayoutQc": "pending_render_qc",
  "humanAssessment": "not_requested"
}
```

B4/B7の対生成器が作れる状態は`review_input_ready`だけである。

将来の状態遷移:

1. `review_input_ready`
2. renderer/QC合格後の`review_rendered`
3. 別の人間結果による`human_approved`または`human_rejected`

対生成器、renderer、人間結果保存器の責務を混ぜない。`review_input_ready`、`review_rendered`を公開合格と呼ばない。

### 9.2 review request

schema:
`presentation-caption-review-render-request-v003`

field順:

1. `schemaVersion`
2. `requestId`
3. `purpose`
4. `reviewOnly`
5. `publicationAllowed`
6. `displayPlanBinding`
7. `instructionBundleBinding`
8. `captionCheckBinding`
9. `layoutPreflightBinding`
10. `baseMediaBinding`
11. `registryBindings`
12. `requiredInputState`
13. `rendererEntry`
14. `expectedOutput`

固定値:

- `purpose`: `caption-readability-alignment-completeness-review`
- `reviewOnly`: true
- `publicationAllowed`: false
- `requiredInputState`: `review_input_ready`
- `rendererEntry`: `presentation-review-renderer-v003`

`baseMediaBinding`:

1. `baseMedia`
2. `timeline`
3. `generationManifest`
4. `validationReport`

各値はpathと実byte SHA-256を持つ。timelineと三JSONはcanonical SHA-256も持つ。

`expectedOutput`:

```json
{
  "state": "review_rendered",
  "publicationAllowed": false,
  "requiredQc": [
    "preset_applied",
    "no_text_overlap",
    "inside_safe_area",
    "no_missing_caption",
    "base_frame_count_preserved",
    "base_audio_preserved"
  ]
}
```

`registryBindings`:

1. `trustedRegistryBindings`: `{path, fileSha256, canonicalSha256}`
2. `presetRegistry`: `{path, fileSha256, canonicalSha256}`
3. `presetValidationIndex`: `{path, fileSha256, canonicalSha256}`
4. `materialValidationIndex`: `{path, fileSha256, canonicalSha256}`

renderer v003のコードと実体binary束縛はB7の実装設計で固定する。B4では存在しないrendererを合格扱いにせず、入口schemaだけを固定する。

## 10. `pair-generation-manifest.json`

schema:
`presentation-resolution-instruction-pair-generation-manifest-v001`

field順:

1. `schemaVersion`
2. `generatorVersion`
3. `pairId`
4. `artifactId`
5. `jobBinding`
6. `implementationBinding`
7. `inputBindings`
8. `runtimeBinding`
9. `contentArtifacts`
10. `contentSetCanonicalSha256`
11. `reviewState`
12. `publication`

`generatorVersion`:
`presentation-caption-display-pair-generator-v001`

`contentArtifacts`は次の固定順:

1. `display-plan.json`
2. `instruction-bundle.json`
3. `caption-check-report.json`
4. `layout-preflight.json`
5. `review-render-request.json`

各要素:
`{role, fileName, fileSha256, canonicalSha256, schemaVersion}`

`publication`:
`{formalOutputPath, fileCount: 7, atomicRename: true, lockReleased: true, workPathRemoved: true}`

manifestは自分自身とpair validation reportをcontent setへ入れず、自己参照hashを作らない。validation reportはmanifestにある宣言と実ファイルを照合する。

manifestの`inputBindings`はjobの次の五groupをfield順も含めてexact copyする。

1. `sourcePackageBinding`
2. `semanticCheckBinding`
3. `retainedSourceBinding`
4. `baseMediaBinding`
5. `registryBinding`

`runtimeBinding`:
`{resolvedNodePath, nodeBinarySha256, nodeVersion, icuVersion, resolvedLocale, resolvedGranularity}`。

## 11. `pair-validation-report.json`

schema:
`presentation-caption-display-pair-validation-report-v001`

field順:

1. `schemaVersion`
2. `validatorVersion`
3. `status`
4. `failureStage`
5. `jobBinding`
6. `implementationBinding`
7. `runtimeBinding`
8. `inputBindings`
9. `outputBindings`
10. `checks`
11. `violations`
12. `observedProjection`
13. `reviewState`
14. `readOnlyObservation`
15. `scope`

status:

- `passed_pending_human_review`
- `failed`

`passed`だけの状態を作らない。人間未確認を明示する。

`checks`は次の固定順17件:

1. `jobBinding`
2. `implementationBinding`
3. `inputBinding`
4. `runtimeBinding`
5. `semanticSeam`
6. `sourceAtoms`
7. `timeline`
8. `displayPlan`
9. `resolutionPackage`
10. `instructionBundle`
11. `captionG1G3`
12. `layoutPreflight`
13. `reviewState`
14. `reviewRenderRequest`
15. `determinism`
16. `readOnlyCheck`
17. `publication`

各check:
`{name, status, violationCodes}`

status:

- `passed`
- `failed`
- `not_run_with_upstream_failure`

`observedProjection`:

1. `sourceAtomCount`
2. `containerCount`
3. `meaningGroupCount`
4. `cueCount`
5. `lineCount`
6. `timelineSegmentCount`
7. `maximumObservedLineLogicalWidth`
8. `positiveCueOverlapCount`
9. `sourceAtomPositiveOverlapObservationCount`

部分的に壊れた入力から件数を推測しない。全17 checkに必要な構造が成立した場合だけ実測値を載せ、それ以外は全fieldをnullにする。

`jobBinding`:
`{path, fileSha256}`

`implementationBinding`:
`{gitCommit, files, dependencyFiles}`。配列のrole順と各`{role, path, fileSha256}`はjobと同一。

`runtimeBinding`:
`{resolvedNodePath, nodeBinarySha256, nodeVersion, icuVersion, resolvedLocale, resolvedGranularity}`。常に実測値で、job期待値を実測値として複写しない。

`inputBindings`はmanifestと同じ五groupに、再構築したcompiler入力の
`{observedByteSha256, canonicalSha256}`
を6番目として追加する。

`outputBindings`のfield順:

1. `displayPlan`
2. `instructionBundle`
3. `captionCheckReport`
4. `layoutPreflight`
5. `reviewRenderRequest`
6. `pairGenerationManifest`

各値は`{path, fileSha256, canonicalSha256}`。validation report自身を自分のbindingへ入れない。

`readOnlyObservation`:
`{status, beforeCanonicalSha256, afterCanonicalSha256, unchanged}`。

`scope`:

```json
{
  "validatedState": "display-pair-ready-for-review-render",
  "semanticQualityVerified": false,
  "naturalBreakQualityVerified": false,
  "onScreenReadabilityVerified": false,
  "renderedLayoutQcVerified": false,
  "publicationQualityVerified": false
}
```

## 12. 生成jobと工程間の受け渡し

### 12.1 正式job

schema:
`presentation-caption-display-pair-generation-job-v001`

root field順:

1. `schemaVersion`
2. `jobId`
3. `artifactId`
4. `mode`
5. `implementationBinding`
6. `sourcePackageBinding`
7. `semanticCheckBinding`
8. `retainedSourceBinding`
9. `baseMediaBinding`
10. `registryBinding`
11. `expectedRuntime`
12. `expectedProjection`
13. `publication`
14. `readOnlyGuard`

`mode`は`formal-generation`だけ。合成fixture注入口、stdin、環境変数による入力差し替えを正式runnerへ作らない。

### 12.2 implementation binding

exact shape:
`{gitCommit, files, dependencyFiles}`

`files`のrole順:

1. `displayPairCore`
2. `displayPairRunner`

`dependencyFiles`のrole順:

1. `semanticCore`
2. `semanticRunner`
3. `captionCoreV003`
4. `instructionCoreV003`
5. `sourceSpeakerPolicy`
6. `timelineV002`
7. `layoutPreflightCore`
8. `rendererLayoutCore`
9. `presetRegistry`
10. `presetValidationIndex`
11. `materialValidationIndex`
12. `trustedRegistryBindings`

各要素:
`{role, path, fileSha256}`

`gitCommit`は来歴記録で、合否は各fileの実byte SHA-256へ置く。

### 12.3 source package binding

`sourcePackageBinding`:

1. `rootPath`
2. `manifest`
3. `validationReport`

manifest/report:
`{path, fileSha256, canonicalSha256}`

rootの固定7ファイルをB3 manifest順に全件再読し、未知ファイル、欠落、hash差、package validation不合格を拒否する。

### 12.4 semantic check binding

`semanticCheckBinding`のfield順:

1. `job`: `{path, fileSha256, canonicalSha256}`
2. `rawSemanticOutput`: `{path, fileSha256, canonicalSha256}`
3. `validationReport`: `{path, fileSha256, canonicalSha256}`
4. `expectedCompilerInputObservedByteSha256`
5. `expectedCompilerInputCanonicalSha256`

工程間受け渡し:

1. B1 semantic validation reportを既存report validatorで検査する。
2. `status === "passed"`を必須とする。`abstained`、`failed`をB4へ通さない。
3. reportが束縛するsource packageとraw回答がjobのbindingと一致する。
4. 同じB1 pure compilerへsource packageとraw回答を渡してcompiler入力を二度作る。
5. 二度のbyteとcanonical hashが一致する。
6. report記録の二hashと一致する。
7. 一致したcompiler入力一件だけをB4 builderへ渡す。

B4専用の同等compilerを複製しない。productionが呼ぶB1 pure compilerと、合成検査が呼ぶものは同一exportである。

### 12.5 retained source、base media、registry

各bindingは、生成manifest、正式成果物、validation reportをpath・file SHA・canonical SHAで固定する。base mediaだけはbinaryなのでcanonical SHAを持たない。

`retainedSourceBinding`のfield順:

1. `rootPath`
2. `generationManifest`
3. `sourceAtoms`
4. `validationReport`

`baseMediaBinding`のfield順:

1. `rootPath`
2. `generationManifest`
3. `timeline`
4. `validationReport`
5. `baseMedia`

`registryBinding`のfield順:

1. `rootPath`
2. `trustedRegistryBindings`
3. `presetRegistry`
4. `presetValidationIndex`
5. `materialValidationIndex`

JSON bindingは`{path, fileSha256, canonicalSha256}`、binary bindingは`{path, fileSha256}`。各rootPathは成果物を含む許可root一件で、子pathはその直下の固定名へ完全一致させる。

正式B4 runnerは、B3 package外のSTTや教師切り抜きを読まない。source atomは正式残存source成果物、時間写像は正式timeline、見た目は承認済みpreset/material台帳だけを読む。

### 12.6 expected projection

汎用schema:

1. `sourceAtomCount`
2. `containerCount`
3. `boundaryCandidateCount`
4. `meaningGroupCount`
5. `cueCount`
6. `lineCount`
7. `timelineSegmentCount`
8. `compilerInputObservedByteSha256`
9. `compilerInputCanonicalSha256`

固有値は、B6合格後にB1 reportの実測を読み、B7正式jobへ**実行前に固定**する。B4設計へcandidate 13のcue数やline数を焼き込まない。固定後に結果を見て変更しない。

### 12.7 runtime

`expectedRuntime`:

1. `nodeBinarySha256`
2. `nodeVersion`
3. `icuVersion`
4. `resolvedLocale`
5. `resolvedGranularity`

B1 compiler再生成を同じ環境で行うため、B1正式実行と同じ五値を使う。Node実体path・file identity・実byte hashもrunnerが実測する。期待値を実行後の環境へ合わせて変える場合は新attempt・別承認とする。

### 12.8 publication

`publication`:

1. `pairId`
2. `formalOutputPath`
3. `lockPath`
4. `workPath`

開始時に三pathのいずれかが存在すれば停止する。排他的lock、同一親directory上のwork、7ファイル検査、directory durability、原子的rename、公開後全7ファイル再読の順を固定する。

正式公開前にjob、実装、全入力を再読し、一件でも開始時hashと異なれば公開しない。

`readOnlyGuard`:

1. `watchedRoot`
2. `excludedPaths`
3. `allowedWritePaths`
4. `expectedBeforeCanonicalSha256`

`excludedPaths`はCLIへ渡した正規化済みjob path一件だけ。`allowedWritePaths`は`formalOutputPath`, `lockPath`, `workPath`の固定順三件だけである。監視root内で、それ以外の作成・変更・削除を一件でも検出したら停止する。許可write pathであっても、原子的公開契約にない操作はpublication検査で拒否する。

### 12.9 読み取り専用preflight job

schema:
`presentation-caption-display-pair-static-preflight-job-v001`

root field順:

1. `schemaVersion`
2. `jobId`
3. `artifactId`
4. `mode`
5. `implementationBinding`
6. `sourcePackageBinding`
7. `retainedSourceBinding`
8. `baseMediaBinding`
9. `registryBinding`
10. `expectedRuntime`
11. `expectedStaticProjection`
12. `readOnlyGuard`

`mode`は`read-only-preflight`だけ。

`implementationBinding.files`は
`displayPairCore`, `displayPairPreflightRunner`
の固定順。dependency filesは§12.2と同じ12件である。

`expectedStaticProjection`:

1. `sourceAtomCount`
2. `containerCount`
3. `boundaryCandidateCount`
4. `timelineSegmentCount`
5. `sourceAtomPositiveOverlapCount`
6. `adjacentBoundaryCandidatePositiveOverlapCount`

preflight report schema:
`presentation-caption-display-pair-static-preflight-report-v001`

field順:

1. `schemaVersion`
2. `status`
3. `jobBinding`
4. `implementationBinding`
5. `runtimeBinding`
6. `inputBindings`
7. `checks`
8. `violations`
9. `observedStaticProjection`
10. `deferredUntilB6`
11. `readOnlyObservation`

`deferredUntilB6`は固定順で
`semanticValidationReport`, `semanticCompilerInput`, `meaningGroupCount`, `cueCount`, `lineCount`
の五文字列を持つ。仮値をnull以外で埋めない。

preflightの`readOnlyGuard`は正式jobと同じfield順だが、`allowedWritePaths`は空配列、`excludedPaths`はpreflight job path一件だけである。preflight runnerはstdoutへreport一件だけを出し、正式root、lock、work、report fileを作らない。監視rootの前後canonical SHA-256が一致しなければ不合格である。

## 13. 違反コードと固定順

次の69 codeをこの順でexportする。

1. `CAPTION_B4_JOB_INVALID`
2. `JOB_FILE_MISMATCH`
3. `IMPLEMENTATION_MISMATCH`
4. `INPUT_PATH_UNSAFE`
5. `INPUT_FILE_SET_INVALID`
6. `INPUT_HASH_MISMATCH`
7. `INPUT_SCHEMA_UNSUPPORTED`
8. `RUNTIME_MISMATCH`
9. `SEMANTIC_REPORT_NOT_PASSED`
10. `SEMANTIC_COMPILER_INPUT_NOT_AVAILABLE`
11. `SEMANTIC_BINDING_MISMATCH`
12. `SEMANTIC_COMPILER_REBUILD_FAILED`
13. `SEMANTIC_COMPILER_HASH_MISMATCH`
14. `COMPILER_INPUT_SCHEMA_INVALID`
15. `COMPILER_CONTAINER_SET_INVALID`
16. `COMPILER_MEANING_GROUP_INVALID`
17. `COMPILER_LINE_INVALID`
18. `COMPILER_ATOM_COVERAGE_INVALID`
19. `COMPILER_TEXT_MISMATCH`
20. `COMPILER_ANCHOR_MISMATCH`
21. `SOURCE_PACKAGE_BINDING_MISMATCH`
22. `SOURCE_ATOM_SCHEMA_INVALID`
23. `SOURCE_ATOM_ID_DUPLICATE`
24. `SOURCE_ATOM_TIME_INVALID`
25. `SOURCE_ATOM_SPEAKER_INVALID`
26. `SOURCE_ATOM_COVERAGE_INVALID`
27. `SOURCE_ATOM_ORDER_INVALID`
28. `TIMELINE_BINDING_MISMATCH`
29. `TIMELINE_SEGMENT_INVALID`
30. `TIMELINE_MAPPING_FAILED`
31. `CUE_ID_INVALID`
32. `CUE_MAPPING_INVALID`
33. `CUE_LINE_COUNT_INVALID`
34. `CUE_LINE_WIDTH_EXCEEDED`
35. `CUE_TEXT_MISMATCH`
36. `CUE_ANCHOR_MISMATCH`
37. `CUE_SOURCE_TIME_INVALID`
38. `CUE_TIMELINE_SEGMENT_CROSSED`
39. `CUE_ORDER_REVERSED`
40. `CUE_UNDECLARED_OVERLAP`
41. `TARGET_ID_INVALID`
42. `TARGET_MAPPING_INVALID`
43. `TARGET_ATOM_MISSING`
44. `TARGET_ATOM_DUPLICATED`
45. `TARGET_ATOM_ORDER_REVERSED`
46. `TARGET_OMISSION_NOT_EMPTY`
47. `INSTRUCTION_ID_INVALID`
48. `INSTRUCTION_MAPPING_INVALID`
49. `INSTRUCTION_KIND_INVALID`
50. `INSTRUCTION_PRESET_INVALID`
51. `INSTRUCTION_MATERIAL_NOT_EMPTY`
52. `INSTRUCTION_TRIGGER_MISMATCH`
53. `CAPTION_CONTRACT_SCHEMA_INVALID`
54. `G1_G3_CHECK_FAILED`
55. `G2_DECLARED_LIMIT_MISSING`
56. `LAYOUT_PREFLIGHT_FAILED`
57. `REVIEW_STATE_INVALID`
58. `REVIEW_RENDER_REQUEST_INVALID`
59. `PAIR_BINDING_MISMATCH`
60. `BUILD_FAILED`
61. `NONDETERMINISTIC`
62. `READ_ONLY_CONTRACT_VIOLATED`
63. `OUTPUT_ROOT_ALREADY_EXISTS`
64. `PUBLICATION_LOCK_UNAVAILABLE`
65. `PUBLICATION_STAGING_INVALID`
66. `PUBLICATION_INPUT_CHANGED`
67. `PUBLICATION_FAILED`
68. `PUBLISHED_PAIR_INVALID`
69. `PUBLICATION_PRE_RENAME_INVALID`

違反は`{code, path, details}`。`details`は常にobject。pathはvalidation subjectをroot `$`とするASCII JSONPath subsetで、絶対filesystem pathを入れない。

同じ`code + NUL + path`だけを重複除去し、code順、path UTF-16順、details canonical順で並べる。

### 13.1 帰属・抑制

- jobをstrict decodeできなければ、jobから導けないinput検査を推測実行しない。
- B1 reportがpassedでなければcompiler再構築・表示計画生成を行わない。
- compiler入力schemaが不成立なら、atom coverage、cue、target、instructionを推測実行しない。
- source atom schemaが不成立なら、source時刻、話者、timeline写像を推測実行しない。
- display planが不成立なら、resolution、instruction、caption、layout、review requestを推測生成しない。
- caption checkerのG2制限はcode 55で「宣言欠落」だけを拒否する。自然な区切りを機械採点しない。
- 公開前入力差はcode 66、rename等の公開操作失敗は67、公開後実体不一致は68へ分離する。

## 14. CLI・検査入口・決定性

CLI終了コード:

- 0: 正式生成・全検査・公開後再読まで合格。
- 1: 契約違反を持つtrusted failed reportを作れた。
- 2: usage、I/O、runtime、report自体を信頼して作れない失敗。

stdout:

- 成功・契約不合格ではreport JSON一件だけ。
- usage/runtime failureでは固定shapeのfatal JSON一件だけ。

stderr:

- 0 byte。

production runnerはjob path一件だけを受ける。合成fixtureを渡す引数、stdin、環境変数、暗黙fallbackを作らない。

合成検査は、production runnerが実際に呼ぶpure builder・checkerを同じexportから呼ぶ。テスト用に同等ロジックを複製しない。production runnerが同一exportを呼ぶことを固定検査へ含める。

同じ入力からbuilderを二回呼び、5 content artifact、manifest、validation reportのbyteとcanonical hashが一致しなければcode 61で停止する。日時、乱数、filesystem列挙順、locale未固定値を正式byteへ入れない。

## 15. 合成検査

実装時の固定検査数は**85件**とする。

| 群 | 件数 | 内容 |
|---|---:|---|
| code発火 | 69 | 各違反codeを意図した一件で発火 |
| 帰属・抑制 | 10 | 上流不成立時の未実行、境界接触許可、source正重なり記録、G2制限、公開失敗帰属等 |
| 実経路 | 6 | valid生成、二回決定性、CLI 0/1/2、production runnerが同一pure exportを使用 |

完了条件:

1. exportした69 code集合とテストで実際に観測したcode集合が完全一致。
2. valid fixtureのreview状態は`review_input_ready`、pair statusは`passed_pending_human_review`。
3. G2を`passed`へ偽装しない。
4. cue境界接触は合格、正のcue交差は不合格。
5. source atom正重なりは観測、時刻逆転は不合格。
6. v002 schemaをv003入口へ渡すと拒否。
7. v003不成立時にv002へfallbackしない。
8. 既存G1〜G3、話者、timeline、rendererの全回帰を再実行し、既存合格を維持する。

## 16. candidate 13 読み取り専用preflight

B4実装後、Gemini実走前に読み取り専用で確認できる静的値は次である。

| 項目 | 固定前実測 |
|---|---:|
| 正式source atom | 354 |
| B3 container | 3 |
| B3 boundary candidate | 205 |
| timeline segment | 2 |
| source atom正重なり | 0 |
| 隣接boundary candidateの正重なり | 0 |

主要な現物binding:

| 成果物 | file SHA-256 |
|---|---|
| B3 package manifest | `da4ceb97487833bf50cbbb01252908b04d7e63230d667f625697557d6ae5ae96` |
| B3 validation report | `18e9b315bba962c16e7e60112c9f08156e4d7ad7b0babef3ec08c0bfebfa8661` |
| B3 semantic source input | `c350a402db15ff7a5405894f939f0a66522482d6d8c78584fe5b55d9dc489980` |
| B3 deterministic expansion map | `33c42a4c625452c6d120f59ccb5a8e78822f9008f5121a91a32e9d3be7133b3d` |
| retained source atoms | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |
| timeline v002 | `802f570dd4f8ea90ef63b0b9afb9a026abf0b18e43e51f2aab51bd62c2180fec` |
| base media | `c0677893902b5a1eaf79b2a3937d67a477f270810200f7c6c01457b42b803c48` |
| trusted registry bindings | `b26db5c57aac5dd290e084d953350778b527c6eb21f66f62dc7431bf24482fff` |

source atomのraw canonical SHA-256は
`cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3`
である。

意味group、cue、lineの件数とcompiler input hashはGemini回答前には存在しない。読み取り専用preflightで仮回答を作らず、`not_available_before_b6`として記録する。candidate 13固有の合成意味回答を作って正式preflight値にしない。

preflightは正式出力root、lock、workを作らない。監視rootの前後投影を比較し、不変であることを合格条件とする。

## 17. 実装契約完全性チェック

| 確認項目 | 結果 |
|---|---|
| 成果物schema・field順 | §4〜11で固定 |
| 違反code・順序・帰属 | §13で69件固定 |
| CLI終了・stdout/stderr | §14で固定 |
| 環境固定 | §12.7で固定 |
| 入力・出力範囲 | §4、§12で固定 |
| 検査可能性 | §14の同一pure exportと§15で固定 |
| 工程間の受け渡し | §12.3〜12.5で固定 |
| 観測データの取得可能性 | job、全入力、pure build、公開操作、公開後再読から取得。production内部debug値を要求しない |
| candidate固有値の分離 | §12.6、§16でpreflight/jobへ限定 |
| 後方互換・fallback | §3.4、§15で禁止 |
| 人間未確認の明示 | §7〜11で固定 |

未固定を残さない。実装時に本表から答えを導けない事項が見つかった場合は、実装者判断で埋めず、追補設計へ戻す。

## 18. B5・B6へ移す要件

前回「Gemini実走」にまとめて列挙された要件は、正本の段階へ次のとおり振り分ける。

| 要件 | 段階 |
|---|---|
| `gemini-3.6-flash`第一候補、実行構成パラメータ、同一attempt内の版変更禁止 | B5 |
| モデルID・実行日・API応答上のモデル表記をmanifestへ記録するshape | B5 |
| B3正式7ファイルだけから作るprompt/payloadとB4契約hashへの束縛 | B5 |
| 正解・教師・人間ラベルの漏洩検査 | B5 |
| 実測token、出力上限、費用見積り | B5 |
| 1回実行・自動再試行0 | B5で構成固定、B6で実行 |
| raw出力保存、B1受入検査、候補外位置・本文改変・順序変更の拒否 | B6 |
| 無効出力を修復せず停止 | B6 |
| 成功時にB7、失敗時に観測記録で停止 | B6 |

B4はモデル構成や費用を独自に推定しない。

## 19. 実装後の報告条件

B4実装が別途承認された場合、完了報告には次を含める。

1. 合成85件の内訳。
2. 69違反code全発火。
3. 全既存回帰の合格件数。
4. 二回生成のbyte/canonical決定性。
5. candidate 13静的preflightの件数・hash照合。
6. preflightで正式成果物が生成されていないこと。
7. B5へ進むために人間が判断する事項。

## 20. 今回の停止点と承認依頼

今回行ったのは設計だけである。

未実施:

- B4コード、testdata、job。
- B5 prompt、execution payload、token・費用計測。
- B6 Gemini実走、raw回答。
- B7正式表示計画、v003対、描画。
- 人間の動画確認。

承認依頼文案:

> candidate 13 基本テロップ B4 表示計画・v003対生成契約 設計v001を承認する。承認範囲は、B4のpure builder/checker、正式runner、合成85件、既存全回帰、candidate 13読み取り専用preflightの実装と実行まで。正式表示計画・v003対生成、prompt登録、execution payload、Gemini実走、描画、人間確認は含まない。実装前に未固定事項・契約矛盾・観測不能値が見つかった場合は追補設計へ戻り、独自判断で埋めない。
