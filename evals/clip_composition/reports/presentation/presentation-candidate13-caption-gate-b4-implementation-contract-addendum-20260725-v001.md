# candidate 13 基本テロップ B4 実装契約追補v001

- 作成日: 2026-07-25
- 状態: **追補設計提示・承認待ち**
- 元設計: `presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md`
- 起草根拠: `presentation-candidate13-caption-gate-b4-implementation-contract-preflight-stop-20260725-v001.md`
- 実装: 0件
- testdata: 0件
- job: 0件
- 検査実行: 0件
- Gemini実走: 0件
- 正式成果物生成: 0件
- 人間作業: 承認判断1件。動画視聴、文字分割、時刻入力、時間計測はなし

## 改訂履歴

| 日付 | 承認根拠 | 改訂内容 |
|---|---|---|
| 2026-07-25 | `presentation-candidate13-caption-gate-b4-eight-failure-diagnosis-and-contract-resolution-addendum-20260725-v001.md`と`presentation-candidate13-caption-gate-b4-eight-failure-implementation-repair-design-20260725-v001.md`のkawafmm承認 | §7.1、§7.5、§10.3、§10.5、T060、T082、T083、T085のreport v001・違反所有記述を非互換改訂。69 codeの汎用所有表、code 60の段階別所有、report v002のpure builder/validator、全null失敗報告を新正本とする |

本改訂は本文の旧記録を削除しない。上表の対象箇所で矛盾がある場合は、承認済み`presentation-candidate13-caption-gate-b4-eight-failure-diagnosis-and-contract-resolution-addendum-20260725-v001.md`と`presentation-candidate13-caption-gate-b4-eight-failure-implementation-repair-design-20260725-v001.md`を正本とする。v001 reportの受理、変換、互換処理を行わない。

## 1. 結論

本追補は、元設計で確定したB4の責務、7成果物、69違反code、85検査、B4→B5→B6の順序を変えず、実装前監査で残った実装契約を一意化する。

固定するのは次の7領域である。

1. 実装、job、正式成果物のpath。
2. 上位IDの採番。
3. formal JSON、canonical JSON、SHA-256。
4. 69違反codeの担当check、発火条件、path、併発、抑制。
5. productionと検査が共有するpure入口。
6. 時刻写像、文字配置、事前配置確認の共有処理。
7. 85検査と既存回帰の一件表。

いずれも新しい方式を発明しない。採番・直列化はゲートA／B3、違反の固定順と全発火はB1／B2、pure入口はB1のゲートAレポート受け渡し入口、文字配置は既存レンダラーの文字配置処理を前例とする。

本追補の承認は、元設計§4.1、§8、§10、§11、§12.2、§13〜17、§19〜20のうち、本書が明示する実装詳細の改訂承認を兼ねる。元設計本文を黙って書き換えず、元設計と承認済み追補を一組の正本とする。

## 2. 変えない契約

次は元設計どおりであり、本追補で緩和しない。

- B4の機械合格を「読める」の人間合格へ昇格しない。
- B4が作る表示は基本テロップだけで、G4〜G7、素材、SEを生成しない。
- 一つのmeaning groupからcue、target、instructionを一件ずつ作る。
- source atom全件の欠落、重複、順序変更を許さない。
- cueの境界接触は許可し、正の時間交差だけを拒否する。
- source atomの正重なりは観測に残し、入力拒否や同時表示許可へ読み替えない。
- v002入口、v002 fallback、v002からv003への暗黙変換を作らない。
- candidate 13固有値はproduction coreへ焼き込まず、preflight jobだけへ固定する。
- B1 pure compiler、既存timeline写像、既存文字配置を複製しない。

## 3. 前例の対応表

| 今回固定すること | 参照する前例 | 適用内容 |
|---|---|---|
| formal JSON | `presentation_caption_semantic_source_package_v001.mjs`の`serializePresentationCaptionB1FormalJsonV001` | field挿入順、2空白indent、末尾LF、UTF-8、BOMなし |
| canonical JSON | 同fileの`canonicalizePresentationCaptionB1JsonV001` | object keyをUTF-16順で再帰sort、配列順維持、空白・末尾LFなし |
| SHA-256 | 同fileの`sha256PresentationCaptionB1BytesV001` | 実byteを直接hash |
| IDとpath | ゲートA追補§3、B1設計§6・§11・§12、B3正式job | job値のexact copyと固定suffixだけで派生 |
| code順・path・全発火 | B1設計§16、B2全件検査 | code固定順、ASCII JSONPath、`code + NUL + path`重複除去、export集合と観測集合の完全一致 |
| pure入口 | `presentation-candidate13-caption-gate-b1-gate-a-report-transfer-entrypoint-addendum-20260723-v001.md` | productionと検査が同じ公開pure関数を呼び、runner用の別ロジックを作らない |
| B1意味入力再構築 | `presentation_caption_semantic_output_v001.mjs` | 既存compiler・checker・report validatorをそのまま呼ぶ |
| source時刻写像 | `presentation_base_media_timeline_v002.mjs` | `validatePresentationBaseMediaTimelineV002`と`mapPresentationSourceIntervalV002`を共有 |
| 文字index・表示幅 | `presentation_renderer_text_layout_v001.mjs` | `indexExplicitLinesV001`、`validateIndexedLinesV001`、`codePointWeightV001`を共有 |
| 実配置の計算 | `inspect_presentation_preset_layout.ts`と`runner/src/telop/telop-render-model.ts` | 既存previewと同じ`buildTelopRenderModel`を使い、B4専用の配置式を作らない |
| TypeScript実行環境 | B1/B2の実行実体束縛と固定file set再読 | loader本体、package tree、esbuild本体、platform binaryをjob期待値と実測値で照合 |
| lock・work・原子的公開 | B1 production runner | `formalRoot + ".lock"`、`formalRoot + ".work"`、検査後のdirectory rename |

## 4. 正式path

### 4.1 実装と検査

| role | workspace相対path |
|---|---|
| `displayPairCore` | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` |
| `displayPairRunner` | `evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs` |
| `displayPairPreflightRunner` | `evals/clip_composition/run_presentation_caption_display_pair_static_preflight_v001.mjs` |
| 合成検査 | `evals/clip_composition/test_presentation_caption_display_pair_v003.mjs` |
| 合成testdata root | `evals/clip_composition/testdata/presentation-caption-display-pair-v003/` |

上記はB1の`core / formal runner / preflight runner / test / testdata`の分離をそのまま適用した名前である。別名のcore、runner、checkerを追加しない。

### 4.2 jobと成果物

| 用途 | 固定root |
|---|---|
| formal job | `evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/` |
| static preflight job | `evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/` |
| formal pairの親 | `evals/clip_composition/outputs/presentation/caption-display-pairs/` |

job pathは該当root直下の`<jobId>.json`だけを許す。`jobId`は`^[A-Za-z0-9][A-Za-z0-9._-]*$`を満たし、`.`、`..`、path separatorを拒否する。absolute path、root自身、subdirectory、symlink、hardlinkを許さない。

formal pathは次の式とbyte一致させる。

```text
formalOutputPath =
  "evals/clip_composition/outputs/presentation/caption-display-pairs/"
  + pairId
lockPath = formalOutputPath + ".lock"
workPath = formalOutputPath + ".work"
```

`pairId`をbasenameとして安全に使えない場合はjob不成立であり、別文字への置換やsanitizeをしない。

### 4.3 正式root内の固定順

正式rootは元設計どおり次の7ファイルだけである。

1. `display-plan.json`
2. `instruction-bundle.json`
3. `caption-check-report.json`
4. `layout-preflight.json`
5. `review-render-request.json`
6. `pair-generation-manifest.json`
7. `pair-validation-report.json`

この順序は、staging書込み、再読、manifest binding、公開後再読の共通順でもある。

## 5. 上位IDの採番

### 5.1 jobからexact copyする値

| 値 | 正本 |
|---|---|
| `artifactId` | `job.artifactId`のexact copy |
| `pairId` | `job.publication.pairId`のexact copy |

両方とも`^[A-Za-z0-9][A-Za-z0-9._-]*$`を満たし、`.`と`..`を拒否する。互いに同値である必要はない。manifestやbuilderが組み直さない。

### 5.2 pairIdから固定suffixで派生する値

| 値 | 式 |
|---|---|
| `displayPlanId` | `pairId + "-display-plan"` |
| `instructionSetId` | `pairId + "-instruction-set"` |
| `resolutionPackageId` | `pairId + "-resolution-package"` |
| `requestId` | `pairId + "-review-render-request"` |

派生後も同じID patternを満たすことを検査する。schema版をIDへ重ねて足さない。pairId自体がattemptと版を識別するため、builderが時刻、hash、乱数、件数をsuffixへ追加しない。

### 5.3 cue、target、instruction

元設計どおり、compiler入力のcontainer順、container内meaning group順を平坦化し、1始まり6桁ゼロ埋めを使う。

```text
caption-cue-000001
caption-target-000001
caption-instruction-000001
```

最大999999件を超えた場合は`CUE_ID_INVALID`、`TARGET_ID_INVALID`、`INSTRUCTION_ID_INVALID`のうち最初に該当する構築段階で停止し、桁数を増やさない。

## 6. JSON、canonical SHA-256、content set

### 6.1 共有する唯一の直列化入口

B4は次の既存exportを直接importする。

- `assertPresentationCaptionB1StrictValueV001`
- `decodePresentationCaptionB1StrictJsonV001`
- `serializePresentationCaptionB1FormalJsonV001`
- `canonicalizePresentationCaptionB1JsonV001`
- `sha256PresentationCaptionB1BytesV001`

同等serializer、canonicalizer、hash helperをB4 coreやrunnerへ作らない。

### 6.2 formal JSON

formal JSONは、元設計が宣言したfield順で組み立てたplain objectへ既存serializerを一度だけ適用したbyteである。

- UTF-8。
- BOMなし。
- `JSON.stringify(value, null, 2) + "\n"`。
- object field順はbuilderの挿入順。
- 配列順は契約の固定順。
- safe integerだけを許す。
- 小数、指数表記、negative zero、非有限値、lone surrogate、sparse array、accessor、symbol key、`toJSON`、非plain objectを拒否する。
- 入力JSONは既存strict decoderにより、重複key、code fence、trailing contentも拒否する。

人間認定済み外部表示台帳に実在する小数はB1の外部表示専用読取profileの責務であり、B4が作る正式7 JSONへ複写しない。

### 6.3 canonical JSON

canonical byteは既存canonicalizerの返値である。

- object keyはUTF-16 code unit順に再帰sort。
- array順は維持。
- 空白なし。
- 末尾LFなし。
- numberとstringは既存strict valueの表現だけ。

formal byte hashとcanonical hashを混同しない。file SHA-256はformal byte、canonical SHA-256はcanonical byteへ適用する。

### 6.4 `contentSetCanonicalSha256`

preimageは、固定5 content artifactをmanifest順に次のexact objectへ写した配列である。

```json
[
  {
    "role": "displayPlan",
    "fileName": "display-plan.json",
    "fileSha256": "<64 lowercase hex>",
    "canonicalSha256": "<64 lowercase hex>",
    "schemaVersion": "presentation-caption-display-plan-v001"
  }
]
```

5件のrole順は次である。

1. `displayPlan`
2. `instructionBundle`
3. `captionCheckReport`
4. `layoutPreflight`
5. `reviewRenderRequest`

manifest自身、validation report、path、mtime、inode、byte数をpreimageへ含めない。

### 6.5 hashの正本

| 値 | 正本byte |
|---|---|
| `sourceAtomsSha256` | `source-atoms.json`のformal file byte |
| `rawSourceAtomsCanonicalSha256` | strict decode済み`source-atoms.json`のcanonical byte |
| artifact `fileSha256` | 各formal file byte |
| artifact `canonicalSha256` | 各strict decode値のcanonical byte |
| compiler observed byte hash | 既存B1 compiler builderが返したformal byte |
| compiler canonical hash | 同compiler値のcanonical byte |
| `contentSetCanonicalSha256` | §6.4配列のcanonical byte |

## 7. pure入口とproductionの同一路

### 7.1 B4 coreの公開export

`presentation_caption_display_pair_v003.mjs`が公開してよいB4固有exportは次だけである。

1. `PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001`
2. `validatePresentationCaptionDisplayPairGenerationJobV001`
3. `validatePresentationCaptionDisplayPairStaticPreflightJobV001`
4. `buildPresentationCaptionDisplayPairV003`
5. `checkPresentationCaptionDisplayPairV003`
6. `validatePresentationCaptionDisplayPairValidationReportV001`
7. `buildPresentationCaptionDisplayPairStaticPreflightReportV001`

formal runner用の別builder、検査専用の同等checker、testだけが呼べる裏口を作らない。

### 7.2 `buildPresentationCaptionDisplayPairV003`

入力は次のexact objectである。

```text
{
  job,
  jobSnapshot,
  implementationInputs,
  sourcePackageInputs,
  semanticCheckInputs,
  retainedSourceInputs,
  baseMediaInputs,
  registryInputs,
  runtimeObservation,
  layoutInspection
}
```

固定順と件数:

| field | 件数・順序 |
|---|---|
| `implementationInputs` | jobの`files`順2件＋`dependencyFiles`順12件 |
| `sourcePackageInputs` | B3固定7ファイル順 |
| `semanticCheckInputs` | job、raw意味回答、validation report |
| `retainedSourceInputs` | generation manifest、source atoms、validation report |
| `baseMediaInputs` | generation manifest、timeline、validation report、base media |
| `registryInputs` | trusted bindings、preset registry、preset validation index、material validation index |

各入力要素は`{role, path, snapshot}`。JSON snapshotは`{bytes, fileSha256, statBefore, statAfter}`、binary snapshotは同shapeでdecode値を持たない。builderはrunnerからdecode済み値や「合格済み」というbooleanを受け取らず、B1 strict decoderと既存validatorで自ら導く。

返値:

```text
{
  status: "built" | "failed",
  artifacts,
  builds,
  compilerObservation,
  layoutObservation,
  failureStage
}
```

`status: "built"`の`artifacts`は固定7 roleのうち、自己参照を避けるため最初の5 content artifact値だけを持つ。manifestとvalidation reportはcheckerがcontent hashと検査結果を受けて構築する。`failed`では`artifacts: null`とし、部分artifactを正式byteへしない。

### 7.3 既存B1入口の呼出順

意味入力は次の順で再構築する。

1. `validatePresentationCaptionSemanticOutputValidationReportV001`
2. reportの`status === "passed"`とbinding一致
3. `buildPresentationCaptionSemanticCompilerInputV001`を同一入力へ二回
4. `serializePresentationCaptionB1FormalJsonV001`
5. `canonicalizePresentationCaptionB1JsonV001`
6. `sha256PresentationCaptionB1BytesV001`
7. 二回のbyte/hashとreport記録の二hashの完全一致

`checkPresentationCaptionSemanticOutputV001`をB4用に再実行して新しい意味採点を作らない。B4はB6で保存されたB1 validation reportを検証し、同じcompiler入力を再構築するだけである。

### 7.4 `checkPresentationCaptionDisplayPairV003`

入力は次のexact objectである。

```text
{
  contextPhase,
  jobObservation,
  implementationObservations,
  inputObservations,
  runtimeObservation,
  semanticObservation,
  sourceObservation,
  timelineObservation,
  buildObservation,
  publicationObservation
}
```

`contextPhase`は固定順の次だけである。

1. `pre-publication`
2. `publication-staging`
3. `publication-input-recheck`
4. `publication-pre-rename`
5. `publication-post-rename`
6. `report-finalization`

checkerは同じ入力をvalidation subjectへ一度だけmountし、17 check、違反、observed projection、review state、read-only observationを導く。runnerが判定済みsubject、違反code、statusを注入しない。

### 7.5 report validator

`validatePresentationCaptionDisplayPairValidationReportV001`の入力は次である。

```text
{
  report,
  checkerContext,
  artifactBytes,
  manifestBytes
}
```

同じcheckerを再実行し、reportのfield順、status、failureStage、binding、17 check、違反順、観測値、review state、scopeを完全一致させる。reportを作ったcheckerとvalidatorが別の判定規則を持たない。

### 7.6 static preflight入口

`buildPresentationCaptionDisplayPairStaticPreflightReportV001`は、formal builderと同じjob、実装、B3 package、残存source、timeline、registryの読取入口を使う。semantic check inputとpublication操作だけを持たない。

preflight runnerが独自に数えるのではなく、このpure入口の返値を既存formal serializerでstdoutへ一件だけ出す。

### 7.7 productionと検査の同一路

固定検査は次をsource-levelで確認する。

- formal runnerが`buildPresentationCaptionDisplayPairV003`と`checkPresentationCaptionDisplayPairV003`をimportして呼ぶ。
- preflight runnerが`buildPresentationCaptionDisplayPairStaticPreflightReportV001`をimportして呼ぶ。
- runner内にcue生成、target生成、instruction生成、caption検査、layout判定の複製がない。
- testが同じexportを直接呼ぶ。
- production CLIにfixture、stdin、環境変数、alternate coreの注入口がない。

## 8. timeline・文字配置・layout共有

### 8.1 source時刻

timeline検査は次の既存exportだけを使う。

- `validatePresentationBaseMediaTimelineV002`
- `mapPresentationSourceIntervalV002`

cueの`[sourceStartMs, sourceEndMs)`を`mapPresentationSourceIntervalV002`へ渡し、返値が`passed`かつ一つのtimeline segmentへ収まる場合だけ受理する。B4側でms→frame式、segment探索、丸めを再実装しない。

`TIMELINE_MAPPING_FAILED`は、この既存mapperが次の既存codeのいずれかを返した場合にだけ発火する。

- `INSTRUCTION_SOURCE_INTERVAL_UNMAPPED`
- `INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS`
- `INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED`
- `INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME`

詳細はB4 codeへ展開せず、`details.nestedViolationCodes`へ既存順で保存する。

### 8.2 本文と文字index

明示された1〜2行は`indexExplicitLinesV001`へそのまま渡し、`validateIndexedLinesV001`で全code pointの欠落、重複、置換、順序を検査する。表示幅は各line本文を`codePointWeightV001`で合算する。

B4専用の行分け、句点削除、前後空白除去、Unicode正規化、文字幅表を作らない。

### 8.3 実配置の共有

safe areaとlineの正交差は、既存previewで使った次の同一路を使う。

1. B4 coreが、cue本文と承認済み`caption-core-v001`を`inspect_presentation_preset_layout.ts`の既存入力shapeへ写す。
2. `inspect_presentation_preset_layout.ts`が`runner/src/telop/telop-render-model.ts`の`buildTelopRenderModel`を呼ぶ。
3. line rectangleは同inspectorの既存式で作る。
4. safe areaと正交差は同inspectorの既存判定を使う。
5. 返値をB4 coreが`layout-preflight.json`へ写す。

正式runnerと合成検査は、`inspect_presentation_preset_layout.ts`を別実装へ置換せず、同じ実ファイルを実行する。`runner/node_modules/.bin/tsx`はwrapperであり、同じ名前でも解決先を差し替えられるため正式入口にしない。job作成前preflightで`runner/node_modules/tsx`のrealpathを一度解決し、そのpackage内の`dist/cli.mjs`を実行入口として固定する。

実行argvは次の5要素だけである。

1. `runtimeBinding.resolvedNodePath`
2. `runtimeBinding.layoutExecutionBinding.tsxEntryRealPath`
3. workspace内の固定`inspect_presentation_preset_layout.ts`
4. runnerが作った入力JSONのabsolute path
5. runnerが読む出力JSONのabsolute path

shell文字列へ結合せず、環境変数、`NODE_OPTIONS`、`TSX_*`、`ESBUILD_*`、cwdによる別入口を許さない。cwdはworkspace rootへ固定する。

この工程で使用した次の実体を`implementationBinding`へ含める。

- `layoutPreflightCore`: `evals/clip_composition/inspect_presentation_preset_layout.ts`
- `rendererLayoutCore`: `runner/src/telop/telop-render-model.ts`

loaderは正式byteを左右するため、診断値だけに留めない。元設計の`runtimeBinding`へ次の第7 fieldを追加する。

```text
layoutExecutionBinding: {
  tsxEntryLogicalPath,
  tsxEntryRealPath,
  tsxEntryFileSha256,
  tsxPackageVersion,
  tsxPackageTreeCanonicalSha256,
  esbuildEntryRealPath,
  esbuildEntryFileSha256,
  esbuildPackageVersion,
  esbuildPackageTreeCanonicalSha256,
  esbuildBinaryRealPath,
  esbuildBinaryFileSha256
}
```

既存6 field
`resolvedNodePath / nodeBinarySha256 / nodeVersion / icuVersion / resolvedLocale / resolvedGranularity`
の後に置く。formal jobの`expectedRuntime`、pair manifest、pair validation report、static preflight reportは同じfield順を使う。

`tsxEntryLogicalPath`は
`runner/node_modules/tsx/dist/cli.mjs`
へ固定する。`tsxEntryRealPath`、`esbuildEntryRealPath`、`esbuildBinaryRealPath`は、論理pathから辿った最終実体で、通常file以外を拒否する。`esbuild`のentryはtsx packageからNodeのpackage解決規則で得た`esbuild/lib/main.js`、platform binaryはそのentryが実際に解決する実行fileである。別の探索順やfallbackは作らない。

package tree hashはB2の固定file set再読と同じ考え方で、各package real root配下を再帰走査し、通常fileだけを
`{relativePath, sizeBytes, fileSha256}`
へ写し、`relativePath`のUTF-16昇順で並べ、§6のcanonicalizerを適用したbyteのSHA-256とする。package root内のsymlink、socket、device、未知file kindを拒否する。tsxとesbuildのpackage treeを別々に束縛し、platform binaryはpackage tree外でも単体hashで束縛する。

job作成前preflightは上記11値を固定する。正式実行とreport直前に、同じ論理入口から実体解決、package tree列挙、file hashを再実測し、job期待値と一つでも違えば`RUNTIME_MISMATCH`とする。違反pathは
`$.runtime.layoutExecutionBinding.<field>`
の最小leafである。実行後の環境へ期待値を合わせず、loader、package、platform binaryのいずれかを変える場合は新attempt・別承認とする。

これにより、配置式のsourceだけでなく、そのsourceを実行したloaderと変換器も合否へ束縛する。B4専用の文字配置実装は作らない。

### 8.4 layout input

各cueを次へ写す。

```text
{
  layerId: cueId,
  stateId: "caption-core-v001",
  text: line本文をU+000Aで連結した値,
  maxLines: 2,
  props: 承認済みregistryから解決したcaption-core-v001の描画値
}
```

改行は表示行の境界をinspectorへ伝えるためだけに挿入する。元本文の正本はdisplay planのline列であり、改行をsource本文へ追加しない。inspectorの`resolvedText`をdisplay plan本文へ逆流させない。

### 8.5 `layout-preflight.json`のexact shape

root field順は元設計どおり。追加するnested shapeを次に固定する。

`inputBindings`:

1. `displayPlan`
2. `instructionBundle`
3. `trustedRegistryBindings`
4. `presetRegistry`
5. `presetValidationIndex`
6. `materialValidationIndex`

各要素は`{role, path, fileSha256, canonicalSha256}`。

`checks`は元設計の6件固定順で、各要素は
`{name, status, violationCodes}`。

statusは`passed`、`failed`、`not_run_with_upstream_failure`だけである。

`scopeExclusions`は次の固定順である。

1. `font_fallback_not_verified_before_render`
2. `alpha_bounds_not_verified_before_render`
3. `final_overlay_intersection_not_verified_before_render`
4. `final_overlay_safe_area_not_verified_before_render`
5. `caption_presence_in_video_not_verified_before_render`
6. `base_audio_preservation_not_verified_before_render`

この事前配置確認は既存文字配置モデルの予測であり、実PNG・実alpha・最終動画QCの代用ではない。

## 9. report残shapeとCLI

### 9.1 violation

正式violationは常に次のfield順である。

```json
{
  "code": "FIXED_CODE",
  "path": "$.subject.leaf",
  "details": {}
}
```

`details`はcode表で指定した追加情報がある場合だけそのexact objectを持ち、それ以外は空object。absolute filesystem path、Buffer、Error、stackを入れない。

同じ`code + U+0000 + path`だけを重複除去し、code固定順、path UTF-16順、details canonical byte順で並べる。

### 9.2 check

17 checkは元設計の固定順で、各要素は次である。

```text
{name, status, violationCodes}
```

`violationCodes`は、そのcheckへ帰属したcodeを全体固定順で重複なく並べる。statusが`passed`または`not_run_with_upstream_failure`なら空配列。上流失敗により走らないcheckを`passed`へしない。

### 9.3 observed projection

全件構造が成立した場合だけ実測値を載せる。どれか一件でも構造不成立なら、元設計に列挙した9 fieldすべてを`null`にする。部分値、0、既知の件数を混在させない。

### 9.4 review state

成功時だけ元設計§9.1のexact objectを載せる。失敗時は全fieldを推測せず`null`とする。

### 9.5 read-only observation

```text
{
  status: "passed" | "failed",
  beforeCanonicalSha256: string | null,
  afterCanonicalSha256: string | null,
  unchanged: boolean | null
}
```

開始観測と終了観測の両方が完全な場合だけ二hashとbooleanを載せる。どちらかが取れない場合はstatus `failed`、残り三fieldはnull。

### 9.6 fatal JSON

formal runner:

```json
{
  "schemaVersion": "presentation-caption-display-pair-cli-fatal-v001",
  "diagnostic": "CAPTION_B4_FORMAL_CLI_JOB_CONTEXT_UNAVAILABLE"
}
```

preflight runner:

```json
{
  "schemaVersion": "presentation-caption-display-pair-cli-fatal-v001",
  "diagnostic": "CAPTION_B4_PREFLIGHT_CLI_JOB_CONTEXT_UNAVAILABLE"
}
```

usage、job path、strict decode、job schema、Node実体、runner実体、report serializable性のいずれかが信頼できず、trusted failed reportを作れない場合だけexit 2でstdoutへformal JSON一件、stderr 0 byteとする。exit 0はtrusted成功report、exit 1はtrusted failed reportである。

## 10. 69違反codeの発火契約

### 10.1 validation subject

checker内部だけのsubjectは次のrootを固定順で持つ。

```text
{
  job,
  implementationBindings,
  inputBindings,
  runtime,
  semantic,
  sourceAtoms,
  timeline,
  builds,
  displayPlan,
  resolutionPackage,
  instructionBundle,
  captionCheckReport,
  layoutPreflight,
  reviewState,
  reviewRenderRequest,
  pairManifest,
  readOnly,
  publication,
  publishedPair
}
```

pathはこのsubjectをroot `$`とする。known propertyは`.name`、arrayは0始まり`[index]`。absolute pathやIDをpath fragmentへ埋め込まない。

### 10.2 担当check略号

| 略号 | check |
|---|---|
| J | `jobBinding` |
| I | `implementationBinding` |
| N | `inputBinding` |
| R | `runtimeBinding` |
| S | `semanticSeam` |
| A | `sourceAtoms` |
| T | `timeline` |
| D | `displayPlan` |
| P | `resolutionPackage` |
| X | `instructionBundle` |
| C | `captionG1G3` |
| L | `layoutPreflight` |
| V | `reviewState` |
| Q | `reviewRenderRequest` |
| E | `determinism` |
| O | `readOnlyCheck` |
| U | `publication` |

### 10.3 一件表

「併発」は同じ有効fixtureの別leafも同時に壊した場合に収集できるcodeを示す。「抑制」は先に不成立なら当該codeを推測しない上流を示す。code probeでは一つのleafだけを壊し、期待code一件だけを観測する。

| # / code | check | exact trigger | exact path | 併発・抑制 |
|---|---|---|---|---|
| 1 `CAPTION_B4_JOB_INVALID` | J | pure checkerへ渡したjob valueがformal/preflightいずれのexact schemaにも一致しない | `$.job.value`または最初の不正leaf | 他全codeを抑制 |
| 2 `JOB_FILE_MISMATCH` | J | jobの開始snapshotと公開前またはreport前snapshotのbyte/hash/statが不一致 | `$.job.prePublication`または`$.job.preReport` | 1合格後。3〜61と併発可 |
| 3 `IMPLEMENTATION_MISMATCH` | I | role、path、file set、実byte SHA、開始／再読snapshotの一つがjob bindingと不一致 | `$.implementationBindings[i]`の最小leaf | 1合格後。4〜8と併発可 |
| 4 `INPUT_PATH_UNSAFE` | N | role別許可root、直下名、realpath、symlink/hardlink禁止のいずれかに違反 | `$.inputBindings[i].path` | 同inputの5〜7を抑制 |
| 5 `INPUT_FILE_SET_INVALID` | N | 固定rootの欠落、余分、subdirectory、順序、file kind、nlinkが不成立 | `$.inputBindings[i].directoryEntries` | 4合格後。同inputの6〜7を抑制 |
| 6 `INPUT_HASH_MISMATCH` | N | jobのfile/canonical hashと安定読取実測が不一致 | `$.inputBindings[i].fileSha256`または`.canonicalSha256` | 4〜5合格後。同inputの7を抑制 |
| 7 `INPUT_SCHEMA_UNSUPPORTED` | N | strict decode後schemaVersionまたはexact shapeが固定版でない | `$.inputBindings[i].decodedValue` | 4〜6合格後 |
| 8 `RUNTIME_MISMATCH` | R | Node実体、Node SHA、version、ICU、locale、granularity、または§8.3のlayout実行実体11値の一つが期待値と不一致 | `$.runtime.<field>`または`$.runtime.layoutExecutionBinding.<field>` | 1合格後 |
| 9 `SEMANTIC_REPORT_NOT_PASSED` | S | B1 report validatorは成立したがroot statusが`passed`でない | `$.semantic.validationReport.status` | 10〜20と後続を抑制 |
| 10 `SEMANTIC_COMPILER_INPUT_NOT_AVAILABLE` | S | passed reportの固定入力一式からcompiler contextを作れない | `$.semantic.compilerInput` | 9合格後。11〜20を抑制 |
| 11 `SEMANTIC_BINDING_MISMATCH` | S | report、job、raw回答、source packageのpath/hash/package IDの一つが不一致 | `$.semantic.bindings.<field>` | 9〜10合格後。12〜20を抑制 |
| 12 `SEMANTIC_COMPILER_REBUILD_FAILED` | S | 全前提成立後に既存B1 compilerが例外または非builtを返す | `$.semantic.builds.compiler` | 9〜11合格後。13〜20を抑制 |
| 13 `SEMANTIC_COMPILER_HASH_MISMATCH` | S | 二回再構築byte/hashまたはreport記録hashが一致しない | `$.semantic.compilerInputHash.<field>` | 9〜12合格後。14〜20を抑制 |
| 14 `COMPILER_INPUT_SCHEMA_INVALID` | S | 再構築compiler入力のschemaVersion、root field、型が不成立 | `$.semantic.compilerInput`の最初の不正leaf | 15〜20と表示以降を抑制 |
| 15 `COMPILER_CONTAINER_SET_INVALID` | S | container ID、件数、順序、speech/timeline対応がsource packageと不一致 | `$.semantic.compilerInput.containers`または`[i]` | 14合格後。該当containerの16〜20を抑制 |
| 16 `COMPILER_MEANING_GROUP_INVALID` | S | group ordinal、1〜2行、候補参照、group順の一つが不成立 | `$.semantic.compilerInput.containers[i].meaningGroups[j]` | 14〜15合格後。該当groupの17〜20を抑制 |
| 17 `COMPILER_LINE_INVALID` | S | line ordinal、sourceAtomIds、text、anchor、logicalWidthのexact shapeが不成立 | `$.semantic.compilerInput.containers[i].meaningGroups[j].lines[k]` | 14〜16合格後。該当lineの18〜20を抑制 |
| 18 `COMPILER_ATOM_COVERAGE_INVALID` | S | compiler全lineのatom IDがsource package全atomをexactly onceで覆わない | `$.semantic.compilerInput.containers` | 14〜17合格後。19〜20と併発可 |
| 19 `COMPILER_TEXT_MISMATCH` | S | line textが参照atom本文の順序連結とbyte一致しない | `$.semantic.compilerInput.containers[i].meaningGroups[j].lines[k].text` | 14〜17合格後。18/20と併発可 |
| 20 `COMPILER_ANCHOR_MISMATCH` | S | lineの開始・終了anchorが先頭／末尾atomの文字境界と一致しない | `$.semantic.compilerInput.containers[i].meaningGroups[j].lines[k].startAnchor`または`.endAnchor` | 14〜17合格後。18/19と併発可 |
| 21 `SOURCE_PACKAGE_BINDING_MISMATCH` | A | compiler/source packageが束縛するsource atom集合と正式残存source成果物が不一致 | `$.sourceAtoms.binding` | 22〜27を抑制 |
| 22 `SOURCE_ATOM_SCHEMA_INVALID` | A | source atom rootまたはatom exact shape、schemaVersion、文字粒度が不成立 | `$.sourceAtoms.value`または`.atoms[i]` | 21合格後。該当atomの23〜27を抑制 |
| 23 `SOURCE_ATOM_ID_DUPLICATE` | A | 同じatomIdが2件以上ある | `$.sourceAtoms.atoms[i].atomId` | 21〜22合格後。重複2件目以降のleafごと |
| 24 `SOURCE_ATOM_TIME_INVALID` | A | start/endがsafe integerでない、負、または`startMs >= endMs` | `$.sourceAtoms.atoms[i].startMs`または`.endMs` | 21〜22合格後。25〜27と併発可 |
| 25 `SOURCE_ATOM_SPEAKER_INVALID` | A | 話者欄が承認済み話者契約v002に不一致 | `$.sourceAtoms.atoms[i].speaker` | 21〜22合格後。24/26/27と併発可 |
| 26 `SOURCE_ATOM_COVERAGE_INVALID` | A | compiler参照と正式source atom集合にmissing/extraがある | `$.sourceAtoms.coverage` | 21〜23合格後 |
| 27 `SOURCE_ATOM_ORDER_INVALID` | A | 正式atom順またはcompiler参照順が逆転する | `$.sourceAtoms.atoms[i].atomId`または`$.sourceAtoms.coverage.order` | 21〜23合格後 |
| 28 `TIMELINE_BINDING_MISMATCH` | T | timeline、manifest、validation report、base mediaのpath/hash/IDが不一致 | `$.timeline.binding.<field>` | 29〜30を抑制 |
| 29 `TIMELINE_SEGMENT_INVALID` | T | 既存timeline validatorがfailed | `$.timeline.validation` | 28合格後。30を抑制 |
| 30 `TIMELINE_MAPPING_FAILED` | T | §8.1の既存mapperがcue区間を一意な1 segmentへ写せない | `$.timeline.mappings[i]` | 28〜29合格後。detailsは`{nestedViolationCodes:[...]}` |
| 31 `CUE_ID_INVALID` | D | cue ID、global ordinal、6桁採番の一つが§5.3と不一致 | `$.displayPlan.containers[i].cues[j].cueId` | 14〜30合格後。該当cueの32〜40を抑制 |
| 32 `CUE_MAPPING_INVALID` | D | cueとcontainer/group/target/instructionの1対1対応が不成立 | `$.displayPlan.containers[i].cues[j]` | 31合格後。33〜40と併発可 |
| 33 `CUE_LINE_COUNT_INVALID` | D | cue lineが1件または2件でない | `$.displayPlan.containers[i].cues[j].lines` | 31合格後。該当cueの34〜36を抑制 |
| 34 `CUE_LINE_WIDTH_EXCEEDED` | D | 既存文字幅規則でline logicalWidthがregistry上限36を超える、または記録値と再計算値が不一致 | `$.displayPlan.containers[i].cues[j].lines[k].logicalWidth` | 31/33合格後。35/36と併発可 |
| 35 `CUE_TEXT_MISMATCH` | D | cue line本文がcompiler line本文とbyte一致しない | `$.displayPlan.containers[i].cues[j].lines[k].text` | 31/33合格後。34/36と併発可 |
| 36 `CUE_ANCHOR_MISMATCH` | D | line/cue anchorがcompilerとsource atom境界に一致しない | `$.displayPlan.containers[i].cues[j].startAnchor`、`.endAnchor`またはline leaf | 31/33合格後。34/35と併発可 |
| 37 `CUE_SOURCE_TIME_INVALID` | D | sourceStart/Endが先頭／末尾atom時刻と一致しない、または非正区間 | `$.displayPlan.containers[i].cues[j].sourceStartMs`または`.sourceEndMs` | 31合格後。38〜40を抑制 |
| 38 `CUE_TIMELINE_SEGMENT_CROSSED` | D | cue区間が複数timeline segmentへまたがる | `$.displayPlan.containers[i].cues[j].sourceEndMs` | 31/37合格後 |
| 39 `CUE_ORDER_REVERSED` | D | cueのsource順が前cueより前へ戻る | `$.displayPlan.containers[i].cues[j].sourceStartMs` | 31/37合格後 |
| 40 `CUE_UNDECLARED_OVERLAP` | D | 隣接cueの`min(end)-max(start) > 0` | `$.displayPlan.containers[i].cues[j].sourceStartMs` | 境界接触0msは発火しない |
| 41 `TARGET_ID_INVALID` | P | target IDまたは6桁採番が§5.3と不一致 | `$.resolutionPackage.targets[i].targetRefId` | display plan成立後。該当targetの42〜46を抑制 |
| 42 `TARGET_MAPPING_INVALID` | P | targetとcue/instruction/caption contractの1対1参照が不成立 | `$.resolutionPackage.targets[i]` | 41合格後。43〜46と併発可 |
| 43 `TARGET_ATOM_MISSING` | P | target sourceAtomIdsがcue必要atomを一つ以上欠く | `$.resolutionPackage.targets[i].sourceAtomIds` | 41〜42合格後。44/45と併発可 |
| 44 `TARGET_ATOM_DUPLICATED` | P | target sourceAtomIds内に同じIDが2回以上ある | `$.resolutionPackage.targets[i].sourceAtomIds[j]` | 41〜42合格後。重複2件目以降 |
| 45 `TARGET_ATOM_ORDER_REVERSED` | P | target sourceAtomIdsがsource正本順に一致しない | `$.resolutionPackage.targets[i].sourceAtomIds` | 41〜42合格後 |
| 46 `TARGET_OMISSION_NOT_EMPTY` | P | omission/deletion/cutを表す固定空配列が空でない | `$.resolutionPackage.targets[i].omittedSourceAtomIds` | 41〜42合格後 |
| 47 `INSTRUCTION_ID_INVALID` | X | instruction IDまたは6桁採番が§5.3と不一致 | `$.instructionBundle.instructionSet.instructions[i].instructionId` | resolution成立後。該当instructionの48〜52を抑制 |
| 48 `INSTRUCTION_MAPPING_INVALID` | X | instructionとtarget/cue/packageの1対1参照が不成立 | `$.instructionBundle.instructionSet.instructions[i]` | 47合格後。49〜52と併発可 |
| 49 `INSTRUCTION_KIND_INVALID` | X | kindが`speech-caption`以外 | `$.instructionBundle.instructionSet.instructions[i].kind` | 47合格後 |
| 50 `INSTRUCTION_PRESET_INVALID` | X | presetIdが固定`normal-landscape-readable-pop-v001`と不一致 | `$.instructionBundle.instructionSet.instructions[i].presetId` | 47合格後 |
| 51 `INSTRUCTION_MATERIAL_NOT_EMPTY` | X | materialRefsが空配列でない | `$.instructionBundle.instructionSet.instructions[i].materialRefs` | 47合格後 |
| 52 `INSTRUCTION_TRIGGER_MISMATCH` | X | triggerのstart/end anchorが対応cueと一致しない | `$.instructionBundle.instructionSet.instructions[i].trigger` | 47〜48合格後 |
| 53 `CAPTION_CONTRACT_SCHEMA_INVALID` | X | caption contract v003のexact shape、cue集合、本文、anchor、終了責任が不成立 | `$.resolutionPackage.captionContracts[0]` | 41〜52合格後 |
| 54 `G1_G3_CHECK_FAILED` | C | 既存G1〜G3 checkerへv003 exact projectionを渡した結果がfailed | `$.captionCheckReport.checks[i]` | instruction pair成立後 |
| 55 `G2_DECLARED_LIMIT_MISSING` | C | unverified固定3件、`passed_with_declared_limit`、character粒度宣言の一つが欠落 | `$.captionCheckReport.unverified`または`.status` | 54とは独立。自然さを採点しない |
| 56 `LAYOUT_PREFLIGHT_FAILED` | L | §8共有inspectorまたは6 layout checkの一つがfailed | `$.layoutPreflight.checks[i]` | caption成立後。detailsにnested codeを固定順で記録 |
| 57 `REVIEW_STATE_INVALID` | V | review stateが元設計§9.1 exact objectでない | `$.reviewState`または最初の不正leaf | 56合格後 |
| 58 `REVIEW_RENDER_REQUEST_INVALID` | Q | requestのschema、ID、binding、reviewOnly、publicationAllowed、required state、expected outputが不成立 | `$.reviewRenderRequest`の最初の不正leaf | 57合格後 |
| 59 `PAIR_BINDING_MISMATCH` | Q | 5 artifact、manifest、reportのpairId/artifactId/path/hash/相互参照が不一致 | `$.pairManifest`または不一致artifact binding | 58合格後 |
| 60 `BUILD_FAILED` | 発生stageのcheck | 全前提合格後にpure builder/serializer/layout adapterが例外または必要値なし | `$.builds.buildFailure` | detailsは`{stage:"<fixed-stage>"}`。先行違反時は抑制 |
| 61 `NONDETERMINISTIC` | E | 同一入力二回の5 artifact、manifest、reportのformal/canonical byteが一つでも不一致 | `$.builds.determinism.<role>` | 全build成立後 |
| 62 `READ_ONLY_CONTRACT_VIOLATED` | O | watched rootの許可外作成・変更・削除、前後投影不一致、job以外のexcluded path | `$.readOnly`の最小leaf | publication codeと併発可 |
| 63 `OUTPUT_ROOT_ALREADY_EXISTS` | U | formal root、lock、workの一つが開始時に存在 | `$.publication.initialPaths.<role>` | 64〜69を抑制 |
| 64 `PUBLICATION_LOCK_UNAVAILABLE` | U | lock排他作成EEXIST、作成直後またはrename前／解放前identity不一致 | `$.publication.lock`または`.preRename.lockIdentity` | 純I/O失敗は67 |
| 65 `PUBLICATION_STAGING_INVALID` | U | work内7 file集合、strict JSON、hash、binding、kind、nlinkの一つが不成立 | `$.publication.staging`の最小leaf | 63〜64合格後。renameを抑制 |
| 66 `PUBLICATION_INPUT_CHANGED` | U | 公開前再読でjob以外の実装・入力・runtime bindingが開始時と不一致 | `$.publication.inputRecheck[i]` | 65合格後。renameを抑制 |
| 67 `PUBLICATION_FAILED` | U | lock/work write・fsync・rename・directory sync・再読等の純I/O失敗 | `$.publication.<stage>.failurePoint` | 専用63〜66/68/69に該当しないI/Oだけ |
| 68 `PUBLISHED_PAIR_INVALID` | U | rename後rootの7 file、strict JSON、hash、binding、kind、nlink、observed setが不成立 | `$.publishedPair`の最小leaf | rename成功後 |
| 69 `PUBLICATION_PRE_RENAME_INVALID` | U | rename直前にformal root再出現、親非directory、親device不一致 | `$.publication.preRename.formalRoot`、`.sourceParentIdentity`、`.targetParentIdentity` | 63〜66合格後。renameを抑制 |

### 10.4 code 60の固定stage

`BUILD_FAILED.details.stage`は次だけである。

1. `semantic-compiler-rebuild`
2. `display-plan-build`
3. `resolution-package-build`
4. `instruction-bundle-build`
5. `caption-check-build`
6. `layout-inspection`
7. `review-request-build`
8. `pair-manifest-build`
9. `pair-report-build`

別文字列、例外message、stackを正式成果物へ入れない。

### 10.5 抑制の固定順

checkは17件の固定順で走る。あるcheckがfailedなら、構造上その出力を必要とする後続だけを`not_run_with_upstream_failure`にする。同階層の独立binding検査は可能な限り全件収集する。

- J failed: I以降を全抑制。
- I/N/Rの一つがfailed: S以降を全抑制。
- S failed: A以降を全抑制。
- A failed: T以降を全抑制。
- T failed: D以降を全抑制。
- D failed: P以降を全抑制。
- P failed: X以降を全抑制。
- X failed: C以降を全抑制。
- C failed: L以降を全抑制。
- L failed: V以降を全抑制。
- V/Q failed: E以降を全抑制。
- E/O failed: Uの公開操作を抑制する。

publicationのphase内抑制はcode表どおりである。先行失敗後に架空のoutputを組み立てて後続違反を増やさない。

## 11. 合成85件の一件表

### 11.1 code probe 69件

全probeは一つのvalid synthetic fixtureを複製し、表のmutation一件だけを加える。期待codeは一件、期待pathも一件である。別codeが出た場合は不合格で、期待codeを含むだけでは合格にしない。

| test | mutation | expected code / path |
|---|---|---|
| T001 | jobの未知fieldを1件追加 | `CAPTION_B4_JOB_INVALID` / `$.job.value` |
| T002 | 開始後のjob byteを1byte変更 | `JOB_FILE_MISMATCH` / `$.job.prePublication` |
| T003 | `displayPairCore`の実SHAを変更 | `IMPLEMENTATION_MISMATCH` / `$.implementationBindings[0].fileSha256` |
| T004 | source package manifest pathを許可root外へ変更 | `INPUT_PATH_UNSAFE` / `$.inputBindings[0].path` |
| T005 | source package rootへ未知fileを追加 | `INPUT_FILE_SET_INVALID` / `$.inputBindings[0].directoryEntries` |
| T006 | retained source atomsのjob file hashを変更 | `INPUT_HASH_MISMATCH` / `$.inputBindings[2].fileSha256` |
| T007 | timeline schemaVersionをv001へ変更 | `INPUT_SCHEMA_UNSUPPORTED` / `$.inputBindings[3].decodedValue` |
| T008 | Node version観測だけを変更 | `RUNTIME_MISMATCH` / `$.runtime.nodeVersion` |
| T009 | B1 validation report statusをfailedへ変更 | `SEMANTIC_REPORT_NOT_PASSED` / `$.semantic.validationReport.status` |
| T010 | passed reportからcompiler再構築contextを欠落 | `SEMANTIC_COMPILER_INPUT_NOT_AVAILABLE` / `$.semantic.compilerInput` |
| T011 | raw回答binding hashをreportと不一致にする | `SEMANTIC_BINDING_MISMATCH` / `$.semantic.bindings.rawSemanticOutput` |
| T012 | B1 compiler adapterを例外化 | `SEMANTIC_COMPILER_REBUILD_FAILED` / `$.semantic.builds.compiler` |
| T013 | report記録compiler canonical hashを変更 | `SEMANTIC_COMPILER_HASH_MISMATCH` / `$.semantic.compilerInputHash.canonicalSha256` |
| T014 | compiler input schemaVersionを変更 | `COMPILER_INPUT_SCHEMA_INVALID` / `$.semantic.compilerInput.schemaVersion` |
| T015 | container 1件を欠落 | `COMPILER_CONTAINER_SET_INVALID` / `$.semantic.compilerInput.containers` |
| T016 | meaningGroupOrdinalを重複 | `COMPILER_MEANING_GROUP_INVALID` / `$.semantic.compilerInput.containers[0].meaningGroups[1]` |
| T017 | lineOrdinalを0へ変更 | `COMPILER_LINE_INVALID` / `$.semantic.compilerInput.containers[0].meaningGroups[0].lines[0]` |
| T018 | compiler lineからatom IDを1件欠落 | `COMPILER_ATOM_COVERAGE_INVALID` / `$.semantic.compilerInput.containers` |
| T019 | compiler line textを1文字変更 | `COMPILER_TEXT_MISMATCH` / `$.semantic.compilerInput.containers[0].meaningGroups[0].lines[0].text` |
| T020 | compiler line endAnchorを隣atomへ変更 | `COMPILER_ANCHOR_MISMATCH` / `$.semantic.compilerInput.containers[0].meaningGroups[0].lines[0].endAnchor` |
| T021 | source packageのraw source canonical hashを変更 | `SOURCE_PACKAGE_BINDING_MISMATCH` / `$.sourceAtoms.binding.rawSourceAtomsCanonicalSha256` |
| T022 | source atomへ未知fieldを追加 | `SOURCE_ATOM_SCHEMA_INVALID` / `$.sourceAtoms.atoms[0]` |
| T023 | 2件目atomIdを1件目と同値にする | `SOURCE_ATOM_ID_DUPLICATE` / `$.sourceAtoms.atoms[1].atomId` |
| T024 | atom endMsをstartMsと同値にする | `SOURCE_ATOM_TIME_INVALID` / `$.sourceAtoms.atoms[0].endMs` |
| T025 | speakerへ未登録objectを入れる | `SOURCE_ATOM_SPEAKER_INVALID` / `$.sourceAtoms.atoms[0].speaker` |
| T026 | 正式source atomを1件追加してcompilerに含めない | `SOURCE_ATOM_COVERAGE_INVALID` / `$.sourceAtoms.coverage` |
| T027 | 正式source atom 2件を逆順にする | `SOURCE_ATOM_ORDER_INVALID` / `$.sourceAtoms.atoms[1].atomId` |
| T028 | timeline ID bindingをmanifestと不一致にする | `TIMELINE_BINDING_MISMATCH` / `$.timeline.binding.timelineId` |
| T029 | timeline segment outputを非連続にする | `TIMELINE_SEGMENT_INVALID` / `$.timeline.validation` |
| T030 | cue元区間をtimeline外へ移す | `TIMELINE_MAPPING_FAILED` / `$.timeline.mappings[0]` |
| T031 | cue IDを5桁にする | `CUE_ID_INVALID` / `$.displayPlan.containers[0].cues[0].cueId` |
| T032 | cueのinstructionIdを別序数へ変更 | `CUE_MAPPING_INVALID` / `$.displayPlan.containers[0].cues[0]` |
| T033 | cue linesを空配列にする | `CUE_LINE_COUNT_INVALID` / `$.displayPlan.containers[0].cues[0].lines` |
| T034 | lineを承認済み上限37へする | `CUE_LINE_WIDTH_EXCEEDED` / `$.displayPlan.containers[0].cues[0].lines[0].logicalWidth` |
| T035 | cue line textを1文字変更 | `CUE_TEXT_MISMATCH` / `$.displayPlan.containers[0].cues[0].lines[0].text` |
| T036 | cue endAnchorを1文字前へ変更 | `CUE_ANCHOR_MISMATCH` / `$.displayPlan.containers[0].cues[0].endAnchor` |
| T037 | cue sourceEndMsを末尾atomと不一致にする | `CUE_SOURCE_TIME_INVALID` / `$.displayPlan.containers[0].cues[0].sourceEndMs` |
| T038 | cue終端を次timeline segmentまで延長 | `CUE_TIMELINE_SEGMENT_CROSSED` / `$.displayPlan.containers[0].cues[0].sourceEndMs` |
| T039 | 2件目cue開始を1件目より前へ変更 | `CUE_ORDER_REVERSED` / `$.displayPlan.containers[0].cues[1].sourceStartMs` |
| T040 | 2件目cue開始を1ms早め正交差を作る | `CUE_UNDECLARED_OVERLAP` / `$.displayPlan.containers[0].cues[1].sourceStartMs` |
| T041 | target IDを5桁にする | `TARGET_ID_INVALID` / `$.resolutionPackage.targets[0].targetRefId` |
| T042 | target cueIdを別序数へ変更 | `TARGET_MAPPING_INVALID` / `$.resolutionPackage.targets[0]` |
| T043 | target atom列から1件欠落 | `TARGET_ATOM_MISSING` / `$.resolutionPackage.targets[0].sourceAtomIds` |
| T044 | target atom列の2件目を重複 | `TARGET_ATOM_DUPLICATED` / `$.resolutionPackage.targets[0].sourceAtomIds[1]` |
| T045 | target atom列2件を逆順 | `TARGET_ATOM_ORDER_REVERSED` / `$.resolutionPackage.targets[0].sourceAtomIds` |
| T046 | omittedSourceAtomIdsへ1件追加 | `TARGET_OMISSION_NOT_EMPTY` / `$.resolutionPackage.targets[0].omittedSourceAtomIds` |
| T047 | instruction IDを5桁にする | `INSTRUCTION_ID_INVALID` / `$.instructionBundle.instructionSet.instructions[0].instructionId` |
| T048 | instruction targetを別序数へ変更 | `INSTRUCTION_MAPPING_INVALID` / `$.instructionBundle.instructionSet.instructions[0]` |
| T049 | kindを`information-comment`へ変更 | `INSTRUCTION_KIND_INVALID` / `$.instructionBundle.instructionSet.instructions[0].kind` |
| T050 | presetIdを未知値へ変更 | `INSTRUCTION_PRESET_INVALID` / `$.instructionBundle.instructionSet.instructions[0].presetId` |
| T051 | materialRefsへ1件追加 | `INSTRUCTION_MATERIAL_NOT_EMPTY` / `$.instructionBundle.instructionSet.instructions[0].materialRefs` |
| T052 | trigger endAnchorを1文字前へ変更 | `INSTRUCTION_TRIGGER_MISMATCH` / `$.instructionBundle.instructionSet.instructions[0].trigger` |
| T053 | caption contract schemaVersionをv002へ変更 | `CAPTION_CONTRACT_SCHEMA_INVALID` / `$.resolutionPackage.captionContracts[0].schemaVersion` |
| T054 | G1 checker入力のatom列を重複 | `G1_G3_CHECK_FAILED` / `$.captionCheckReport.checks[0]` |
| T055 | G2 unverified固定3件から1件削除 | `G2_DECLARED_LIMIT_MISSING` / `$.captionCheckReport.unverified` |
| T056 | layout inspector返値にsafe area失敗を1件入れる | `LAYOUT_PREFLIGHT_FAILED` / `$.layoutPreflight.checks[3]` |
| T057 | review stateのpublicationAllowedをtrueへ変更 | `REVIEW_STATE_INVALID` / `$.reviewState.publicationAllowed` |
| T058 | review requestのrequiredInputStateを変更 | `REVIEW_RENDER_REQUEST_INVALID` / `$.reviewRenderRequest.requiredInputState` |
| T059 | manifestのdisplay plan hashを変更 | `PAIR_BINDING_MISMATCH` / `$.pairManifest.contentArtifacts[0].fileSha256` |
| T060 | 全前提合格後、display plan builderを例外化 | `BUILD_FAILED` / `$.builds.buildFailure` |
| T061 | 二回目builderのreview request field順だけ変更 | `NONDETERMINISTIC` / `$.builds.determinism.reviewRenderRequest` |
| T062 | watched rootへ許可外fileを1件追加 | `READ_ONLY_CONTRACT_VIOLATED` / `$.readOnly.changedEntries[0]` |
| T063 | formal rootを開始前に作成 | `OUTPUT_ROOT_ALREADY_EXISTS` / `$.publication.initialPaths.formalRoot` |
| T064 | lock作成をEEXISTにする | `PUBLICATION_LOCK_UNAVAILABLE` / `$.publication.lock` |
| T065 | workへ未知fileを追加 | `PUBLICATION_STAGING_INVALID` / `$.publication.staging.directoryEntries` |
| T066 | staging後にsource atom byteを変更 | `PUBLICATION_INPUT_CHANGED` / `$.publication.inputRecheck[0]` |
| T067 | work file fsyncだけをI/O失敗にする | `PUBLICATION_FAILED` / `$.publication.staging.failurePoint` |
| T068 | rename後にdisplay-plan byteを変更 | `PUBLISHED_PAIR_INVALID` / `$.publishedPair.files[0]` |
| T069 | rename直前にformal rootを出現させる | `PUBLICATION_PRE_RENAME_INVALID` / `$.publication.preRename.formalRoot` |

### 11.2 帰属・抑制10件

| test | 観測すること | 合格条件 |
|---|---|---|
| T070 | job不成立時の抑制 | Jだけfailed、I〜Uは`not_run_with_upstream_failure`、違反はcode 1だけ |
| T071 | semantic report failed時の抑制 | S failed、A〜U未実行、compiler builder呼出0 |
| T072 | compiler schema不成立時の抑制 | S failed、atom/cue/target/instruction推測0 |
| T073 | source atom schema不成立時の抑制 | A failed、timeline/layout呼出0 |
| T074 | display plan不成立時の抑制 | D failed、resolution/instruction/caption/layout生成0 |
| T075 | cue境界接触 | 前endと次startが同値なら合格、code 40なし、boundaryContacts 1件 |
| T076 | source atom正重なり | 入力は合格、観測1件、code 24/40なし |
| T077 | G2宣言限界 | status `passed_with_declared_limit`、unverified固定3件、code 55なし |
| T078 | v002拒否とfallback禁止 | v002 caption/bundleはcode 53または7で停止し、v002入口呼出0 |
| T079 | 公開失敗帰属 | input差は66、純I/Oは67、rename前構造は69、公開後不一致は68へ相互混同なし |

### 11.3 実経路6件

| test | 経路 | 合格条件 |
|---|---|---|
| T080 | valid pair build | 固定7値が成立、review state `review_input_ready`、pair status `passed_pending_human_review` |
| T081 | 二回決定性 | 5 content artifact、manifest、reportのformal byte/canonical byteが完全一致 |
| T082 | formal CLI success | 実process exit 0、stdout trusted report一件、stderr 0 byte |
| T083 | formal CLI contract failure | 実process exit 1、stdout trusted failed report一件、stderr 0 byte |
| T084 | formal CLI untrusted/usage | 実process exit 2、stdout fatal JSON一件、stderr 0 byte |
| T085 | productionとpure入口同一 | runnerが§7 exportを呼び、同等実装・fixture注入口がない |

### 11.4 85件の完全一致assert

- TAP top-level testはT001〜T085の85件ちょうど。
- skipped、todo、cancelledは0。
- T001〜T069で観測したcode集合と`PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001`が集合・順序とも完全一致。
- 各code probeは期待code/pathの完全一致であり、包含判定にしない。

## 12. 既存回帰の固定一覧

B4実装後に次の5 fileをこの順で全件実行する。

| 順 | test file | 実装前のtop-level件数 |
|---:|---|---:|
| 1 | `evals/clip_composition/presentation_caption_contract.test.mjs` | 24 |
| 2 | `evals/clip_composition/presentation_instruction_contract_v002.regression.mjs` | 27 |
| 3 | `evals/clip_composition/presentation_source_speaker_contract_v002.test.mjs` | 10 |
| 4 | `evals/clip_composition/presentation_base_media_timeline_v002.test.mjs` | 15 |
| 5 | `evals/clip_composition/presentation_renderer_v002.test.mjs` | 19 |
|  | **合計** | **95** |

件数は追補起草時のsource上のtop-level `test(...)`を実測した値である。実装時は各fileを`node --test`で実行し、TAP上も24/27/10/15/19、合計95、failed/skipped/todo/cancelled 0を必須とする。

以前のレンダラー完了報告にある83/83は当時の検査集合であり、その後の契約改訂で検査が追加されている。B4で古い83へ戻さず、現在の5 file・95件を正本にする。

## 13. candidate 13 static preflight

### 13.1 job path

```text
evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/
DmWu0jVQfTE-candidate-13-caption-display-pair-b4-v001.json
```

`jobId`:
`DmWu0jVQfTE-candidate-13-caption-display-pair-b4-preflight-v001`

`artifactId`:
`DmWu0jVQfTE-candidate-13-v001`

preflightはpairIdや正式出力pathを持たない。formal pairを作らないためである。

### 13.2 固定preflight 12 check

1. `jobBinding`
2. `implementationBinding`
3. `sourcePackageBinding`
4. `retainedSourceBinding`
5. `baseMediaBinding`
6. `registryBinding`
7. `runtimeBinding`
8. `sourceAtomProjection`
9. `containerProjection`
10. `boundaryCandidateProjection`
11. `timelineProjection`
12. `readOnlyCheck`

各要素は`{name, status, violationCodes}`。preflightで使用できるcodeは1〜8、21〜30、62だけで、semantic/cue/target/instruction/build/publication codeを仮発火させない。

`deferredUntilB6`は元設計の固定5文字列だけである。

### 13.3 固定値

元設計§16の次をjobへ事前固定する。

- source atom: 354
- container: 3
- boundary candidate: 205
- timeline segment: 2
- source atom正重なり: 0
- 隣接boundary candidate正重なり: 0
- B3 package、残存source、timeline、base media、registry bindingの既存SHA-256

preflightはstdoutへreport一件だけを出し、正式root、lock、work、report fileを作らない。監視root前後投影が不一致なら不合格である。

## 14. 完全性チェックが見逃した経路

### 14.1 原因

元設計§17は11カテゴリを「固定」と判定したが、確認粒度がカテゴリ単位だった。

具体的には次の乖離があった。

| 元設計の記載 | 実体に残った未固定 |
|---|---|
| 「成果物schema・field順を固定」 | nested shape、上位ID、formal pathが一意でなかった |
| 「違反code・順序・帰属を固定」 | code名と順序だけで、trigger/path/抑制の一件表がなかった |
| 「検査可能性を固定」 | pure関数の名前・入力shape・productionから同一入口を使う検査がなかった |
| 「工程間の受け渡しを固定」 | B1 compilerとlayout/timelineの具体export・呼出順がなかった |
| 「既存layout処理を共有」 | source fileは特定できたが、TypeScript loaderと変換器を診断値に留め、正式byteを左右する実行実体の合否束縛がなかった |
| 「85件を固定」 | 群の件数だけで、test名・mutation・期待code/pathの一件表がなかった |

つまりチェック項目の種類は不足していなかったが、「固定済み」という自己申告を、**具体的な値・path・export・一件表へ解決できるか**まで照合していなかった。設計書の表記と実装可能な実体が乖離したことが停止の原因である。

### 14.2 完全性チェックの改訂案

B4追補の承認と同時に、実装契約完全性チェックへ次の4項目を追加する。

1. **値レベル閉包**: 「固定」と記した全field、ID、path、status、診断について、exact valueまたは一意な導出式への参照がある。
2. **参照解決**: 再利用するroleは具体file pathとexport名まで解決され、productionと検査が同じ入口を使う証拠検査がある。
3. **件数閉包**: 固定件数を宣言した違反・検査・成果物・bindingは、一件表の行数と一致し、集合完全一致検査がある。
4. **byte閉包**: 正式byteへ影響する採番、field順、serializer、canonicalizer、hash preimage、末尾改行、外部loader・変換器の実行実体束縛が一意である。

B5・B6では、承認前にこの4項目を従来の
schema、違反code、終了code、環境、入出力、検査可能性、工程間受け渡し、観測取得可能性
へ重ねて自己適用する。「固定済み」という文章だけで合格にしない。

### 14.3 本追補への自己適用

| 確認 | 解決先 |
|---|---|
| 値レベル閉包 | §4〜10、§13 |
| 参照解決 | §3、§7、§8 |
| 件数閉包 | §10の69行、§11の85行、§12の95件 |
| byte閉包 | §5〜6 |
| 工程間受け渡し | §7.3、§8 |
| 観測取得可能性 | §7 context、§9、§13 |
| candidate固有値分離 | §13だけ |
| 後方互換なし | §2、T078 |

本追補から実装者判断なしにcode、runner、検査期待を作れない事項を新たに発見した場合は、承認後でも実装せず停止する。

## 15. 承認後に許可する範囲

本追補が承認された場合だけ、次を行ってよい。

1. §4のB4 core、formal runner、preflight runner、testdata、合成検査の実装。
2. T001〜T085の一括実行。
3. §12の既存回帰95件。
4. §13のcandidate 13読み取り専用preflight。
5. 完了報告または停止報告。

含まないもの:

- B5 prompt、payload、token・費用計測。
- B6 Gemini実走、raw回答保存。
- B7正式表示計画・v003対の生成。
- 描画、比較媒体、人間確認。
- 正式pair root、lock、workの生成。

事前固定条件の不成立、新しい設計判断、契約矛盾、実測前提不一致が一件でも出た場合は、修正・再実行せず停止する。

## 16. 承認依頼文

> candidate 13 基本テロップ B4実装契約追補v001を承認する。本承認は、元B4設計§4.1、§8、§10、§11、§12.2、§13〜17、§19〜20について、本追補の実装詳細を正本として追加する改訂承認と、実装契約完全性チェックへ「値レベル閉包・参照解決・件数閉包・byte閉包」を追加する承認を兼ねる。正式path、上位ID、B1共有直列化、69違反の発火・path・抑制、pure入口、既存timeline・文字配置・配置確認の共有経路とTypeScript loader・変換器の実体束縛、85検査一件表、既存回帰5file・95件、candidate 13 preflightを本書どおり固定し、B4実装・合成85件・既存回帰95件・読み取り専用preflightまで進めてよい。不成立が一件でもあれば同attemptで修正・再実行せず停止する。B5、B6、Gemini、正式pair生成、描画、人間確認は含めない。
