# ZEVO字幕品質v002 F/U fixture製造契約設計 v001

日付: 2026-08-15
状態: **設計提示・未承認**。実装、検査実行、既存fixture変更、API通信、描画、commit、tagを含まない。

## 0. 結論

F/U fixture製造を、検査file内の開始前hookから独立した正式工程へ移す。

- 適用時期: スケルトン清書前
- 適用範囲: F/Uのみ
- 現在の17 pathに対する新規追加: **2 path**
- 改訂後の上限: **19 path**（production/support 11、test 8）
- 既存変更: path #11、#12、#14の3件
- 製造payload: **44成果物**
- F環境要求: **600行**を具体値で製造・照合
- Uの可変filesystem環境要求: 0行
- 既存ZEVO字幕品質code: 49件不変
- fixture工程固有code: 4件
- 検査ID: 46件から48件
- proof: 既存489件を不変保持し、fixture工程34件を加え、合計523件
- API通信、countTokens、generateContent、費用、描画: 0

単に旧fixtureを別fileへ移す案は採らない。独立工程は、入力成果物、正常fixture、26負例、U確認入力、全導出path、保持期待を一つの版付きpackageへ閉じ、F/U testはそのreceiptを受け入れ検査してから使う。

## 1. 実現性調査（現物照合済み）

### 1.1 調査正本

| 現物 | SHA-256 | 現物位置 | 確認事項 |
|---|---|---|---|
| F production runner | `04ace7753c77e716dd20d9ccfec8e4359db489558f12a930d18efe4e7387891b` | `run_presentation_zevo_caption_quality_v002_proof_job_v001.ts:1038-1210` | case別成果物、renderer作業root、正式renderer入口 |
| F test | `713cf57e4d0d8e8d40e5748a2a193472eb8048495a62e79caf0238d853a85e0a` | `run_presentation_zevo_caption_quality_v002_proof_job_v001.test.mjs:90-346,458-523,589-607,891-1140,1399-1710` | 3 case、5環境行、正常fixture、26負例、保持manifest |
| U support | `0624fdd54cc39d1899910e1386bd587a2218543183db6b884580d9bcec996888` | `presentation_zevo_caption_quality_v002_review_ui_v001.mjs:85-157` | review input validator/decoder/HTML builder |
| U test | `3358e6d53fd64c3f8ba29d3ae4a3cd473c27da7173fbc74ce187b5844dd6f534` | `presentation_zevo_caption_quality_v002_review_ui_v001.test.mjs:50-177` | 3 case、5問、6旧plan、3 video/QC合成binding |
| 共通renderer | `c90dc00456ade415e46cf8c692c49f3d08ae0ab21186b10227cdb5676f445292` | `render_presentation_v002.mjs:950-985,1384-1396` | 出力root、所有lock、ランダム作業prefixの実計算 |
| F attempt-0011停止報告 | `44b30d809833d8a7b4a1ffae606e7805995d23107024f26082b409d802517eda` | §2.3、§4、§6、§7 | renderer作業root閉包不足と完全停止 |
| path 17正本追補v004 | `39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade` | §3、§4 | 17 path、atomic no-replace正本 |
| 現行最終追補v015 | `42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275` | §4、§6 | contract 14/14/15/16/16、49 code、46 ID、489 proof |

調査は上記現物と保存済みattemptだけを読み、API通信・検査再実行・描画を行っていない。

### 1.2 現行17 path

| # | exact path | 種別 | 今回の扱い |
|---:|---|---|---|
| 1 | `evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` | production | 不変 |
| 2 | `evals/clip_composition/presentation_output_caption_cue_source_package_v001.test.mjs` | test | 不変 |
| 3 | `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs` | production | 不変 |
| 4 | `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.test.mjs` | test | 不変 |
| 5 | `evals/clip_composition/presentation_output_caption_cue_selection_v001.mjs` | production | 不変・fixture製造時に既存pure入口を使用 |
| 6 | `evals/clip_composition/presentation_output_caption_cue_selection_v001.test.mjs` | test | 不変 |
| 7 | `evals/clip_composition/presentation_output_page_line_planner_v003.mjs` | production | 不変 |
| 8 | `evals/clip_composition/presentation_output_page_line_planner_v003.test.mjs` | test | 不変 |
| 9 | `evals/clip_composition/presentation_output_render_plan_v003.mjs` | production | 不変 |
| 10 | `evals/clip_composition/presentation_output_render_plan_v003.test.mjs` | test | 不変 |
| 11 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.ts` | production | path導出pure入口を追加し、runner自身も同入口を使用 |
| 12 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.test.mjs` | test | in-test製造を廃止し、receipt必須へ置換 |
| 13 | `evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.mjs` | support | 不変 |
| 14 | `evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.test.mjs` | test | in-memory合成を廃止し、同じreceipt必須へ置換 |
| 15 | `evals/clip_composition/presentation_atomic_directory_publish_v001.mjs` | production共用 | 不変・新工程の唯一の公開入口として再利用 |
| 16 | `evals/clip_composition/presentation_atomic_directory_publish_v001.c` | native source | 不変 |
| 17 | `evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64` | native runtime | 不変 |

### 1.3 Fが現在製造・参照する全fixture

#### 1.3.1 上流参照

| 区分 | exact件数 | 現在の供給 |
|---|---:|---|
| 横型style request | 1 | candidate 59の既存正式output request |
| 旧横型output request | 3 | voice-013/067/190 |
| 旧横型render plan | 3 | 同上 |
| 旧縦型診断render plan | 3 | Uの観察fixture用 |
| 意味情報package | 3 | 各旧output requestのbindingから再読 |
| 基礎映像入力 | 3組 | 各組はbase media、timeline、generation manifest、validation receiptの4 binding |
| style台帳成果物 | 5 | trust、preset registry、preset validation、material validation、renderer trust |

製造jobはこれらを`sourceInputs`として全て明示する。output request内のbindingを読んで別値を推測せず、job側の明示bindingとexact一致させてから使う。

#### 1.3.2 現在のF fixtureと独立後のpayload

保存済みattempt-0009のfixture rootには33 fileがあり、そのうちproof job byteは27件（正常1+負例26）である。現在はB6 manifest、provider envelope、selection job、provider rawの4 bindingが実fileを持たない。独立工程ではdangling bindingを禁止し、次の37 F payloadを全て実file化する。

| F payload | 件数 |
|---|---:|
| source package | 1 |
| B6 manifest | 1 |
| provider envelope | 1 |
| selection job | 1 |
| provider raw byte | 1 |
| selection | 1 |
| passed selection report | 1 |
| 正常proof job | 1 |
| 負例proof job byte（malformed含む） | 26 |
| rejected selection report override | 2 |
| module import audit helper | 1 |
| **F小計** | **37** |

負例26件は次の閉集合であり、増減・改名・代表枝化をしない。

`malformed-byte-envelope`、`root-reservation-collision`、`planner-rejected-first-case`、`render-rejected-first-case`、`renderer-rejected-first-case`、`renderer-rejected-second-case`、`output-request-reread-mismatch`、`output-request-reread-io-failure`、`render-plan-write-failure`、`render-plan-reread-mismatch`、`owner-missing`、`owner-permission`、`owner-mismatch`、`work-video-missing`、`review-id-mismatch`、`review-fade-mismatch`、`review-build-failure`、`review-write-failure`、`review-reread-failure`、`completion-write-failure`、`completion-reread-failure`、`failure-report-write-failure`、`failure-report-reread-failure`、`fade-throw`、`publisher-helper-failure`、`publisher-late-collision`。

### 1.4 Uが現在製造・参照する全fixture

U testはfilesystemへ書かず、review inputをメモリ内で合成している。独立後は次の7 payloadを実file化する。

| U payload | 件数 | 現行との差 |
|---|---:|---|
| review input | 1 | メモリ合成から正式byteへ |
| video placeholder | 3 | 反復文字SHAの架空bindingを廃止し、実byte SHAへ |
| QC JSON | 3 | メモリ内bindingから正式byteへ |
| **U小計** | **7** | |

既存の横型・縦型旧render plan 6件はpayloadへ複製せず、packageの上流bindingとしてstable再読する。可変filesystem環境をU productionは作らないため、U固有environment rowは0件である。

F 37件とU 7件を合計し、payloadはexact **44件**である。environment manifest、retention manifest、package、receiptを加え、公開root直下・配下に存在する正式fileは**48件**になる。

### 1.5 productionが後段で導出する全path

F productionはproof jobごとに`outputRoot`と`${outputRoot}.staging`を使い、caseごとに次を導出する。

1. proof case成果物root
2. proof staging case root
3. proof review rootとproof staging review root
4. renderer実行scope root（proof job ID+attempt ID）
5. renderer case親directory
6. renderer出力root
7. renderer所有lock root
8. renderer一時作業prefix

負例26件のうちmalformed byteはjob valueを持たない。したがってpathを持つjobは、正常1件+残り負例25件=26件である。全jobは3 caseを宣言する。実行時にどこまで到達するかを予測して行を減らさず、全宣言caseを列挙する。

| 環境要求class | 計算 | exact行数 | 要求状態 |
|---|---:|---:|---|
| proof output共通親 | 1 | 1 | 実directory、非symlink、write+execute |
| renderer work共通親 | 1 | 1 | 実directory、非symlink、write+execute |
| proof output root | 26 job | 26 | absent |
| proof staging root | 26 job | 26 | absent |
| proof case成果物root | 26×3 | 78 | absent（output root absentの具体的子証拠も保持） |
| proof staging case root | 26×3 | 78 | absent（staging root absentの具体的子証拠も保持） |
| proof review root | 26 job | 26 | absent |
| proof staging review root | 26 job | 26 | absent |
| renderer実行scope root | 26 job | 26 | absent |
| renderer case親 | 26×3 | 78 | absent（scope absentの具体的子証拠も保持） |
| renderer出力root | 26×3 | 78 | absent |
| renderer所有lock root | 26×3 | 78 | absent |
| renderer一時作業prefix | 26×3 | 78 | 親内prefix一致entry 0件 |
| **F合計** |  | **600** | |

この600行は独自式で再計算しない。§5.2の共用path projectionを26 jobへ一回ずつ適用し、返却行をそのままenvironment manifestへ転記する。

### 1.6 工事下限

既存17 pathだけでは、製造job/receiptを正式入口として所有するpathも、その入口を検査するpathも存在しない。既存testへ埋め戻すと独立工程にならない。schemaだけを別pathへ分ける必要はなく、runner pathにpure decoder/validator/builder/admissionを同居させられる。atomic publisherはpath #15〜#17を共用できる。

よって新規下限は次の2 pathであり、**17+2=19**で閉じる。

## 2. 本来の目的との照合

本工事の目的は、F/Uの検査を通すためにrootを掃除することではない。fixtureの値、環境、production導出path、保持期待を正式成果物へ閉じ、検査開始前に再現可能な同一入力として受け渡すことである。

次は目的外である。

- 既使用renderer rootの削除
- proof job IDだけの場当たり的更新
- productionの既使用拒否の緩和
- S/A/L/P/R fixtureの作り直し
- 正式成果物、stable tag、A-v002 proof成果物の変更
- API通信、字幕境界選択、描画

## 3. 契約境界

fixture製造工程は「テスト用データを作る補助関数」ではなく、次を行う版付き正式工程とする。

1. 保存済み上流成果物をbindingでstable再読する。
2. 正常F fixture、26負例、U review fixtureを製造する。
3. proof jobの値から全production導出pathを共用入口で得る。
4. environment manifest 600行を製造し、現環境を照合する。
5. retention manifest 26行とartifact 44件を閉じる。
6. root全体を既存atomic publisherでno-replace公開する。
7. packageとreceiptをF/U testへ渡す。

F/U testは製造責務を持たず、receipt受入後の検査だけを所有する。receiptなし、未承認contract、SHA差、artifact欠落、環境差は開始前に拒否し、旧in-test製造へfallbackしない。

## 4. exact path計画

### 4.1 新規2 path

| # | exact path | 種別 | 責務 |
|---:|---|---|---|
| 18 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.mjs` | production/support runner | job/package/receiptのstrict schema、fixture製造、共用path projection使用、environment照合、atomic公開、admission |
| 19 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.test.mjs` | test | 製造正常/拒否、44 artifact、600環境行、26保持行、receipt、F/U admission、atomic競合 |

### 4.2 既存変更3 path

| path | 変更 |
|---|---|
| #11 F production | §5.2のpure path projectionをnamed exportし、既存runnerのcase/output/renderer pathも同じ返却値だけを使用する |
| #12 F test | 5行environment manifest、fixture書込、variant job書込を削除し、required receipt admissionで得た37 F payloadと600行を使う |
| #14 U test | メモリ内review input/video/QC binding製造を削除し、同receiptから7 U payloadを使う |

path #13、#15〜#17を含む他14 pathは変更しない。新規schema path、別publisher、pointer file、latest alias、fixture自動探索を作らない。

## 5. exact入口

### 5.1 path #18 module surface

source authored named exportは次の8件exactとする。

1. `decodePresentationZevoCaptionQualityV002FixtureJobV001(bytes)`
2. `validatePresentationZevoCaptionQualityV002FixtureJobV001(value)`
3. `decodePresentationZevoCaptionQualityV002FixturePackageV001(bytes)`
4. `validatePresentationZevoCaptionQualityV002FixturePackageV001(value)`
5. `decodePresentationZevoCaptionQualityV002FixtureReceiptV001(bytes)`
6. `validatePresentationZevoCaptionQualityV002FixtureReceiptV001(value)`
7. `admitPresentationZevoCaptionQualityV002FixtureV001({receiptPath,expectedGateId})`
8. `executePresentationZevoCaptionQualityV002FixtureJobV001(jobPath)`

import時のfile I/O、process起動、stdout/stderrは0件。直接起動guardだけがjob path一引数で8を呼ぶ。decoderはcanonical formal JSON（2-space+LF）だけを受け、暗黙trim・修復・fallbackを行わない。

### 5.2 path #11共用path projection

path #11へ次のnamed exportを一件追加する。

`derivePresentationZevoCaptionQualityV002ExecutionPathsV001({jobId,attemptId,proofOutputRoot,cases,rendererWorkParent})`

入力は上記5 key exact。`cases`は3件固定順で、各行は`caseId`一件だけである。出力はfreeze済みで次のexact shapeとする。

```text
{
  proofOutputRoot,
  proofStagingRoot,
  proofReviewRoot,
  proofStagingReviewRoot,
  rendererExecutionScopeRoot,
  cases: [{
    caseId,
    proofCaseRoot,
    proofStagingCaseRoot,
    rendererCaseParent,
    rendererOutputRoot,
    rendererLockRoot,
    rendererWorkPrefixParent,
    rendererWorkPrefix
  }]
}
```

proof runnerは、現在の文字列組立てをこの入口の返却値へ置換する。fixture runnerも同じ入口を26回呼ぶ。別のpath組立て、SHAからのpath推測、test側の式複製を禁止する。

## 6. fixture manufacture job schema

schemaVersionは`presentation-zevo-caption-quality-v002-fixture-job-v001`。

top-level exact key順:

1. `schemaVersion`
2. `jobId`
3. `attemptId`
4. `fixtureSetId`
5. `outputRoot`
6. `sourceInputs`
7. `proofExecutionRoots`
8. `implementationBindings`
9. `approvedContractBindings`

`sourceInputs` exact key順:

1. `landscapeStyleRequestBinding`
2. `cases`

case行 exact key順:

1. `caseId`
2. `inputCaptionId`
3. `candidateId`
4. `oldOutputRequestBinding`
5. `oldHorizontalRenderPlanBinding`
6. `oldVerticalRenderPlanBinding`
7. `meaningPackageBinding`
8. `baseMediaInput`
9. `styleArtifactBindings`

`baseMediaInput`は既存exact 4 binding（base media、timeline、generation manifest、validation receipt）。`styleArtifactBindings`は既存exact 5 binding。3 caseのcaseId/inputCaptionId/candidateIdは現行F/U固定値と一致させ、素材固有値を再解釈しない。

`proofExecutionRoots` exact key順:

1. `proofOutputParent`
2. `rendererWorkParent`

`outputRoot`は次とexact一致する。

`evals/clip_composition/reports/presentation/test-fixtures/zevo-caption-quality-v002/<fixtureSetId>`

`proofOutputParent`と`rendererWorkParent`はworkspace相対の固定許可root配下であり、job/envから別rootを選ばない。各proof job ID、attempt ID、output rootはfixtureSetIdと負例labelから一意に製造し、実行時に時刻・乱数を使わない。

## 7. fixture package schema

schemaVersionは`presentation-zevo-caption-quality-v002-fixture-package-v001`。

top-level exact key順:

1. `schemaVersion`
2. `fixtureSetId`
3. `manufactureJobBinding`
4. `sourceInputs`
5. `normalFixture`
6. `negativeFixtures`
7. `reviewFixture`
8. `environmentManifestBinding`
9. `retentionManifestBinding`
10. `artifactBindings`
11. `checks`

### 7.1 normalFixture

exact key順:

1. `sourcePackageBinding`
2. `b6ManifestBinding`
3. `providerEnvelopeBinding`
4. `selectionJobBinding`
5. `rawResponseBinding`
6. `selectionBinding`
7. `selectionReportBinding`
8. `proofJobBinding`
9. `caseRows`

全bindingは44 payload内の実fileを指す。provider rawは既存選択内容を復元できる固定fixture byteであり、API応答の偽装や新しい意味選択を行わない。

### 7.2 negativeFixtures

26件をlabel狭義昇順で保持する。各行 exact key順:

1. `label`
2. `proofJobBinding`
3. `selectionReportOverrideBinding`
4. `capabilityFault`
5. `expectedCli`
6. `outputRetention`
7. `stagingRetention`

malformed行のproofJobBindingはbyte binding、他はformal binding。override不要時はnull。`capabilityFault`は検査が同じformal capability objectから一件だけ置換する宣言であり、production分岐ではない。

### 7.3 reviewFixture

exact key順:

1. `reviewInputBinding`
2. `videoBindings`
3. `qcBindings`
4. `oldRenderPlanBindings`

videoBindings/qcBindingsは3件、oldRenderPlanBindingsは6件。review inputはこれらとproof jobをexact一対一で参照する。

### 7.4 environmentManifest

schemaVersionは`presentation-zevo-caption-quality-v002-fixture-environment-manifest-v001`。600件を`requirementId`狭義昇順で保持する。各行 exact key順:

1. `requirementId`
2. `owner`
3. `resourceKind`
4. `path`
5. `namePrefix`
6. `requiredState`
7. `permissions`
8. `derivation`

`owner`は`fixture-manufacture|F`。`resourceKind`は`directory|path|directory-entry-prefix`。`requiredState`は`real-directory|absent|zero-matches`。`permissions`は`real-directory`だけ`['write','execute']`、他は空配列。`namePrefix`はprefix行だけ非null。

`derivation`はnullまたはexact 4 key `kind,jobId,attemptId,caseId`。production由来行は§5.2の返却値から転記し、手書きpathを許さない。

### 7.5 retentionManifest

schemaVersionは`presentation-zevo-caption-quality-v002-fixture-retention-manifest-v001`。26件をlabel狭義昇順で保持する。各行は現行`F_NEGATIVE_EXPECTATIONS`の意味を変えず、exact key `label,cli,roots`を持つ。`roots`は`output,staging`、各rootは`state,mustExist,mustNotExist`。現行26/26をbyte oracleとして抽出し、代表化・一律集約をしない。

### 7.6 artifactBindingsとchecks

`artifactBindings`は44件をpath狭義昇順で保持し、不足・余分・重複を拒否する。

`checks` exact key順:

1. `sourceBindings`
2. `artifactClosure`
3. `normalFixture`
4. `negativeFixtureSet`
5. `reviewFixture`
6. `executionPathProjection`
7. `environmentManifest`
8. `retentionManifest`
9. `atomicPublication`

値は全て`passed`だけ。失敗packageを正式公開しない。

## 8. admission receiptと受入

receipt schemaVersionは`presentation-zevo-caption-quality-v002-fixture-admission-receipt-v001`。

top-level exact key順:

1. `schemaVersion`
2. `receiptId`
3. `status`
4. `manufactureJobBinding`
5. `fixturePackageBinding`
6. `artifactBindings`
7. `environmentManifestBinding`
8. `retentionManifestBinding`
9. `environmentObservations`
10. `checks`

`status`は`passed`だけを正式公開する。artifactBindingsはpackageの44件とbyte一致する。environment manifestとretention manifestはそれぞれ独立したformal JSONとして一度だけ保存し、packageとreceiptは値を複製せずbindingだけを持つ。したがって公開rootは、44 payload、environment manifest、retention manifest、package、receiptの**48 file**となる。

`checks` exact key順:

1. `jobBinding`
2. `sourceBindingSet`
3. `artifactBindingSet`
4. `packageBinding`
5. `environmentBinding`
6. `retentionBinding`
7. `environmentObservation`
8. `publicationReread`

F/U formal testの起動前に、外側commandは環境変数`ZEV_ZEVO_CAPTION_QUALITY_FIXTURE_RECEIPT_PATH`をexact一件設定する。値はworkspace相対receipt path。F/U testはpath #18のadmissionへ、`expectedGateId='F'`または`'U'`を渡す。

admissionは次を行う。

1. receipt、package、environment manifest、retention manifest、44 payloadをstable再読する。
2. 全bindingのfile/canonical SHAを照合する。
3. approved contractとimplementation bindingを再照合する。
4. Fでは600環境行を再観測する。Uでは可変行0件を確認する。
5. package内のF/U部分だけをfreeze済み結果として返す。

receipt missing、環境変数missing/extra path、root escape、schema不一致、SHA差、成果物欠落、環境差ではtest bodyを登録・実行しない。旧定数・旧hook・自動製造・fallbackは0件とする。

## 9. fixture runnerの結果・失敗

CLI result schemaVersionは`presentation-zevo-caption-quality-v002-fixture-cli-result-v001`。exact key順:

1. `schemaVersion`
2. `status`
3. `jobId`
4. `attemptId`
5. `fixtureSetId`
6. `outputRoot`
7. `stage`
8. `primaryCode`

stage閉語彙:

`job-read`、`source-reread`、`fixture-build`、`environment-preflight`、`root-publication`、`completed`。

fixture工程固有code閉集合:

1. `CUE_FIXTURE_JOB_INVALID`
2. `CUE_FIXTURE_SOURCE_INVALID`
3. `CUE_FIXTURE_ENVIRONMENT_INVALID`
4. `CUE_FIXTURE_PUBLICATION_FAILED`

既存ZEVO字幕品質49 codeへ混ぜず、fixture工程の4 codeとして別所有する。生message、stack、stderr、字幕本文、secretを正式failureへ保存しない。atomic publisherの内側結果は4へ写し、既存publisher codeの意味を変更しない。

## 10. 製造と受入の工程順

1. 固定Node、固定TSX絶対path、NODE_OPTIONS不存在、ネイティブ環境、tool実体をpreflightする。
2. jobをstrict decode/validateする。
3. 52 implementation bindingと17 approved contract bindingをstable再読する。
4. sourceInputs全件をstable再読し、job明示値と上流成果物内bindingをexact照合する。
5. 既存pure入口でsource/selection/projection/styleを製造・検査する。
6. 正常proof job、26負例job、2 rejected report、U review fixtureを製造する。
7. §5.2を26 jobへ一回ずつ適用し、environment manifest 600行を得る。
8. 44 payload、26 retention、U 7 payloadを全量検査する。
9. environment manifestを観測し、600/600合格を確認する。
10. staging rootへ48 fileを書き、全fileを再読する。
11. path #15〜#17でrootをatomic no-replace公開する。
12. 公開後48 fileを再読し、CLI passedを返す。
13. F/U formal attemptはreceipt admission合格後だけ開始する。

同一監視領域へ正式検査中に書かない規律を維持する。fixture製造を完了してからF/U testを別attemptとして開始する。

## 11. 既存成果物・凍結実装との関係

### 11.1 forward-only

新契約は承認後の新しいF/U正式attemptだけに適用する。既存attempt、保存済みfixture、failure evidence、A-v002成果物、既存5 tree、stable tagを変換・上書きしない。旧in-test fixture方式とのunion、fallback、併産を作らない。

### 11.2 再利用

| 現物 | 再利用方法 |
|---|---|
| F production | 凍結中の処理を維持。path導出だけをpure入口へ抽出し、同じ返却値を使う |
| U support | 変更せず、製造済みreview inputの正式validatorとして使う |
| 26 negative manifest | label、CLI期待、保持集合を一件ずつpackageへ移し、意味不変 |
| 5行environment manifest | 共通親・output/stagingという観測項目をseedとして保持。ただし600行の代用品にはしない |
| F/U test | proof本体は維持し、製造部分だけをreceipt受入へ置換 |
| atomic publisher | path #15〜#17を唯一の公開正本として共用 |

旧部分コードを新runnerへコピーしない。現行testの製造値をoracleとして読み、production pure入口へ接続して再実装する。

## 12. binding会計

### 12.1 implementation binding

| job | 現在 | 改訂後 | 差分 |
|---|---:|---:|---:|
| source | 36 | 36 | 0 |
| B5 | 11 | 11 | 0 |
| B6 | 19 | 19 | 0 |
| selection | 41 | 41 | 0 |
| proof | 51 | 51 | 0 |
| fixture manufacture | なし | **52** | 新設 |

fixture manufacture 52件は、proof jobの現行51 role/path集合をそのまま包含し、path #18自身を`caption-quality-fixture-manufacture-runner-v001`として一件追加する。別graphを手書きで再構成しない。path #19はtestでありjob bindingへ含めない。

### 12.2 approved contract binding

| job | 現在 | 改訂後 | 差分 |
|---|---:|---:|---:|
| source | 14 | 14 | 0 |
| B5 | 14 | 14 | 0 |
| B6 | 15 | 15 | 0 |
| selection | 16 | 16 | 0 |
| proof | 16 | **17** | +本契約1 |
| fixture manufacture | なし | **17** | 新設 |

proofはfixture package由来のjob/bindingを受けるため本契約を一件追加する。source/B5/B6/selectionの意味には本契約が影響しない。U review inputはformal jobではなくreceipt経由で束縛する。

## 13. proof owner・検査会計

既存46 ID・489 proofを削除・弱化しない。fixture工事は別ledgerで次を追加する。

| 新ID | owner | proof件数 | 所有内容 |
|---|---|---:|---|
| `ZCQF001` | fixture manufacture | 18 | job/schema、52実装、17契約、上流再読、44 artifact、26負例、U 7成果物、決定性、atomic公開 |
| `ZCQF002` | fixture admission | 16 | receipt、48 file、600環境行、F/U分離、missing/extra/SHA差/root escape/環境差拒否、fallback 0 |
| **追加** |  | **34** | |

改訂後:

- 検査ID: 48
- 既存proof: 489
- fixture proof: 34
- 合計proof: 523
- 既存owner件数: ZCQ001〜ZCQ046を全て不変
- fixture owner: ZCQF001=18、ZCQF002=16

proof jobのcontract 16→17をpinする既存proofは一件を一対一置換し、489件内で増減0とする。期待、test source宣言、TAP observed、TAP passedの四者を、既存489と新規34の両ledgerでexact一致させる。

fixture固有4 codeはZCQF001がjob/source、ZCQF002がenvironment/publicationを各実枝で最低一回観測する。静的文字列確認だけを実発火と数えない。

## 14. 必須検査一件表

| # | owner | 実測内容 |
|---:|---|---|
| 1 | ZCQF001 | job formal byte正例、空白/CRLF/末尾欠落/fence/extra key負例 |
| 2 | ZCQF001 | sourceInputs 3 case・5 style・4 base media bindingの全量stable再読 |
| 3 | ZCQF001 | proof 51集合+runner 1件=52 implementation exact |
| 4 | ZCQF001 | approved contract 17件exact |
| 5 | ZCQF001 | 37 F payload、7 U payload、合計44の不足/余分/重複0 |
| 6 | ZCQF001 | 正常proof job 1件と負例job byte 26件のID/root非重複 |
| 7 | ZCQF001 | negative label 26/26と現行oracleのCLI/保持意味一致 |
| 8 | ZCQF001 | dangling binding 0件 |
| 9 | ZCQF001 | U review inputの実video/QC bindingと6旧plan binding |
| 10 | ZCQF001 | 共用path projectionを26回呼び600行を得る |
| 11 | ZCQF001 | proof runnerも同じprojection返却値を使い、旧具体path byteと一致 |
| 12 | ZCQF001 | 同じjobからpackage/receipt byteが決定的 |
| 13 | ZCQF001 | 48 file staging全量再読 |
| 14 | ZCQF001 | atomic正常公開 |
| 15 | ZCQF001 | late collision実発火・既存target不変 |
| 16 | ZCQF001 | source invalid/code実発火 |
| 17 | ZCQF001 | job invalid/code実発火 |
| 18 | ZCQF001 | import時I/O/process/stdout/stderr 0 |
| 19 | ZCQF002 | receipt/package/environment 3 schemaのstrict decode |
| 20 | ZCQF002 | 公開後48 fileのbinding再照合 |
| 21 | ZCQF002 | F environment 600/600再観測 |
| 22 | ZCQF002 | U environment可変行0件 |
| 23 | ZCQF002 | F admissionは37 payloadだけを返す |
| 24 | ZCQF002 | U admissionは7 payload+6上流planだけを返す |
| 25 | ZCQF002 | receipt path missing拒否 |
| 26 | ZCQF002 | receipt path root escape拒否 |
| 27 | ZCQF002 | receipt extra key/順序差拒否 |
| 28 | ZCQF002 | package SHA差拒否 |
| 29 | ZCQF002 | payload 1件欠落拒否 |
| 30 | ZCQF002 | artifact byte差拒否 |
| 31 | ZCQF002 | 600行の一件差拒否 |
| 32 | ZCQF002 | renderer scope/target/lock/prefix各classの実差を一件ずつ拒否 |
| 33 | ZCQF002 | fixture環境失敗/code実発火 |
| 34 | ZCQF002 | atomic公開失敗/code実発火 |

正式実装時は、34 proofを上表の一件ずつへ割り当て、代表proofで複数行を済ませない。

## 15. 実装順と停止条件

承認後の実装順は次に固定する。

1. 実装開始時に凍結F/U 4 pathとattempt証拠のSHAを再照合する。
2. path #11へ共用projectionを追加し、旧具体pathとのbyte一致を検査する。
3. path #18を実装する。
4. path #19でZCQF001/ZCQF002を閉じる。
5. 新fixture jobを一回実行し、receiptを得る。
6. path #12をreceipt必須へ置換し、F局所3件を実行する。
7. path #14を同receipt必須へ置換し、U局所2件を実行する。
8. 正式48件、直接影響回帰、green 287、baseline 86/203 exact、既存5 treeとA-v002記録対象treeを照合する。

停止条件:

- 20 path目が必要
- #11/#12/#14以外の既存path変更が必要
- production path計算の複製が必要
- 26負例、3 case、44 payload、600環境行の固定値差
- source/B5/B6/selectionのcontract件数を変える必要
- 既存49 code・489 proof・46 IDの証明を削る必要
- 保存済みF/U attempt、既存成果物、stable tagに差が出る
- 不合格1件
- API通信、費用、描画が必要

同attempt内で期待を動かさない。軽微に見える差でも停止する。

## 16. 人間作業

本提示で必要な人間作業は、本設計の承認/差し戻し1件だけ。目安10〜15分。実装承認、API承認、描画承認は別である。

実装後もF/U機械gateに人間作業を追加しない。A-v002完成物の目視は既存計画どおり別段に残る。

## 17. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 現物入口実在 | closed | F/U/rendererの実path・SHA・行位置を§1.1で照合 |
| 全fixture列挙 | closed | F 37、U 7、合計44 |
| production導出path | closed | 26 job×3 caseを§5.2の共用入口で600行へ閉包 |
| 値レベルschema | closed | job/package/manifest/receipt/CLI/admissionのkey順を固定 |
| 工程間受け渡し | closed | manufacture job→package→receipt→F/U admissionのexact引数を固定 |
| 参照実体 | closed | 上流binding、48公開file、既存atomic publisherを実在確認 |
| 検査可能性 | closed | 2 ID・34 proofの実観測を一件表へ固定 |
| binding会計 | closed | implementation 36/11/19/41/51/52、contract 14/14/15/16/17/17 |
| 数値区分 | closed | 観測値と設計固定値を分け、係数・期待値を使用していない |
| 既存成果物不干渉 | closed | forward-only、変換/fallback/併産なし |
| 凍結範囲 | closed | F/U現物・attempt・stable tagを本設計中は変更していない |

## 18. 承認依頼

`要裁定`: 次の一件の承認または差し戻し。

> ZEVO字幕品質v002 F/U fixture製造契約設計v001を承認する。適用はスケルトン清書前、範囲はF/U限定とする。現行17 pathへfixture manufacture runner/testの2 pathを追加して19 pathへ改訂し、既存変更はF proof runner/testとU testの3 pathに限定する。fixture packageはF 37+U 7の44 payload、正常1+負例26、environment manifest 600行、retention manifest 26行を閉じ、既存atomic publisherで48 file rootをno-replace公開する。F/U testはreceipt必須のforward-only経路へ置換し、旧in-test製造、fallback、latest aliasを作らない。proof runnerとfixture runnerは同じpath projection pure入口を使い、renderer root計算を複製しない。implementation bindingは36/11/19/41/51/52、approved contract bindingは14/14/15/16/17/17、既存49 code・46 ID・489 proofを不変保持し、fixture固有4 code・2 ID・34 proofを別ledgerで追加する。実装、検査実行、API通信、費用、描画、commit、tagは別承認とする。

本書の提示で停止する。
