# fatal観測性 v002 完全実装設計 draft v001

- 起草日: 2026-08-07
- 状態: **実装前完全性チェックで契約不成立を検出して停止。§5以降は最小追補案Aを採用した場合の完全設計**
- 承認済み方向設計: `evals/clip_composition/reports/presentation/presentation-fatal-observability-v002-contract-design-20260806-v001.md`
- 承認済み方向設計SHA-256: `dda58845ead84b599a8b3a466475d247084791092cf34e3ef269d7c35785071d`
- 外部通信: 0回
- 費用: US$0
- 実装、検査実行、正式成果物変更、commit、tag: 0件

## 1. 結論

5境界を18 implementation/test fileへ閉じるpath案は作れた。しかし、承認済み方向設計のままでは完全実装設計を成立と宣言できない。

理由は、方向設計が次の二条件を同時に要求しているためである。

1. `fatalObservation`の17 inner codeを、現行productionの所有分岐から全件実発火する。
2. 現行のpassed／rejected／fatalと終了codeの意味を変えない。

静的監査では、17値のうち3値がこの両条件を満たさず、さらに1値は現行productionに所有分岐がない。

- `CHILD_PROCESS_TIMEOUT`: 対象5境界にtimeout処理も所有分岐も存在しない。
- `GATE_A_CONTEXT_INVALID`: 現在は対象外のsource-package経路が持つ検査済み拒否で、対象の旧B1 checkerに所有分岐がない。
- `INSTRUCTION_RENDER_MISSING`: 現在は描画QCの検査済み拒否であり、`fatalObservation`を必須にするfatalではない。
- `REQUIRED_EXPORT_MISSING`: 出力runnerは共通描画coreをstatic named importしているため、export欠落時はrunnerのmodule評価前に停止し、現在のfatal catchへ到達しない。

検査専用の偽分岐を作る、拒否をfatalへ変更する、使っていないtimeout機構を観測性工事へ便乗して追加する、のいずれも承認済み方針に反する。したがって実装へ進まず停止する。

推奨は案Aである。`GATE_A_CONTEXT_INVALID`と`INSTRUCTION_RENDER_MISSING`は既存の拒否違反欄で保持し、`CHILD_PROCESS_TIMEOUT`は実際のtimeout機能を設計する将来契約まで予約語にしない。その上で、実害4を今後は直接観測できるよう、出力runnerへ**実運用で毎回通る必須export検査**を一つだけ設ける。static named importをnamespace importへ変え、共通描画coreの必須exportが関数として存在することをrunner-bootstrapで確認する。欠落時は`REQUIRED_EXPORT_MISSING`、正常時は従来と同じ関数を呼ぶ。検査専用分岐、fallback、動的import、別実装は作らない。

この一点は「現行所有分岐だけを使う」という承認済み方向設計への最小追補を要するため、実装へ進まず停止する。案Aが承認されれば、§5〜§13を14 code・18 file・新規81検査の完全実装設計として正本化できる。実装承認はその後の別判断である。

## 2. 本来の目的との照合

目的は、fatalを詳しく見せること自体ではない。外側の終了2だけでは原因が分からず、人間判断を挟んだ読み取り診断が9回必要になった構造を減らし、ZEVを毎配信・数分の手直しで動かせる状態へ近づけることである。

そのため、次を守る。

- 根本原因を推測せず、処理が直接確認できた段階・対象file・閉語彙codeだけを残す。
- 生message、stack、stdout、stderr、字幕本文、provider本文、secretを正式記録へ入れない。
- 検査済み拒否をfatalへ言い換えない。
- 観測のために新しい失敗動作を作らない。
- 既存5本の動画成果物と安定tagを一切変更しない。

## 3. 実装前監査で確定した事実

### 3.1 code所有の不成立

| 項目 | 現行実体 | 方向設計との衝突 |
| --- | --- | --- |
| `CHILD_PROCESS_TIMEOUT` | `render_presentation_v002.mjs`は子processを起動するが、timer、abort、timeout分岐がない | 現行所有分岐から実発火できない |
| `CHILD_PROCESS_SIGNALLED` | 子processの`close` callbackは現在codeだけを受け、signalを捨てる | 既存終了eventのsignal保持を追加すれば観測可能。新しい失敗動作は不要 |
| `GATE_A_CONTEXT_INVALID` | `run_presentation_caption_semantic_source_package_job_v002.mjs`の検査済み拒否。旧B1 checkerには分岐がない | 対象5境界の旧B1 fatal所有枝としては実発火できない |
| `INSTRUCTION_RENDER_MISSING` | `presentation_renderer_qc_v002.mjs`の検査済み拒否 | rejectedでは`fatalObservation=null`という承認済み規則と衝突する |
| `REQUIRED_EXPORT_MISSING` | `run_presentation_output_job_v001.ts`が`render_presentation_v002.mjs`をstatic named importする | export欠落時はmodule評価前に止まり、現行runnerのfatal catchから観測できない |

### 3.2 実害1〜3の元の所有者

方向設計は実害1〜3を「旧B1」とまとめていた。source監査で、実際の所有者は次のとおりと確定した。

- 実害1のTSX起動・配置数値: 凍結済み旧B4 display-pair経路。
- 実害2のGate A拒否: source-packageを別processで起動した検査fixture経路。
- 実害3のbyte列型喪失・SHA参照名不一致: 旧B4 display-pair経路。
- `run_presentation_caption_semantic_output_check_v002.mjs`自身には、TSX、layout、Gate A子processの分岐がない。

よって9例fixtureは「同じ原因型を安全な3欄へ写せる」ことの事前検証には使えるが、凍結済みの元経路がv002を出すとは主張できない。

### 3.3 statusを維持する境界

- 旧B1のsource package読取・decode失敗は現在`PACKAGE_SCHEMA_INVALID`、終了1である。
- 新しい意味終端選択の一部読取失敗は、入力観測`invalid`から検査済み拒否になる。
- これらを資源失敗の内訳取得だけを理由に終了2へ移すことは禁止する。
- v002は、現在すでにfatal／終了2である捕捉位置だけを詳しくする。

## 4. 契約修正案

| 案 | 内容 | 変更量 | 目的への効果 | 判定 |
| --- | --- | ---: | --- | --- |
| **A** | Gate A・描画指示欠落・timeoutをfatal専用語彙から外す。`REQUIRED_EXPORT_MISSING`だけは、出力runnerに実運用で毎回通るnamespace export guardを置いて所有させる | 18 file内 | 実害4を覆い、検査専用分岐やfallbackを作らない | **推奨** |
| B | `REQUIRED_EXPORT_MISSING`も外して13値・新規80件にする | より小 | 現行所有枝だけに閉じるが、実害4を今後も正式reportから読めない | 非推奨 |
| C | timeout処理や旧B4等の対象境界を追加し17値を維持する | 18 file超過またはstatus変更 | 観測性工事が実行制御・凍結経路へ拡大する | 不採用 |

### 4.1 案Aのfatal専用14 code

次の14値だけを`fatalObservation.innerCode`に許す。

1. `ERR_FS_FILE_TOO_LARGE`
2. `FILE_CHANGED_DURING_READ`
3. `NUMERIC_TOKEN_INVALID`
4. `FORMAL_JSON_VALUE_INVALID`
5. `BINDING_REFERENCE_MISMATCH`
6. `REQUIRED_EXPORT_MISSING`
7. `OS_PERMISSION_DENIED`
8. `CHILD_PROCESS_SPAWN_FAILED`
9. `CHILD_PROCESS_EXIT_NONZERO`
10. `CHILD_PROCESS_SIGNALLED`
11. `PUBLICATION_FAILED`
12. `REPORT_TARGET_INVALID`
13. `REPORT_PUBLICATION_FAILED`
14. `UNCLASSIFIED`

13 stage、`targetFile`の安全な参照元、runner別stream、durable保存先、no-replace、v001非受理、生文字列不保存は承認済み方向設計のまま変えない。

### 4.2 fatal専用語彙から外す3値

| 値 | 扱い |
| --- | --- |
| `GATE_A_CONTEXT_INVALID` | source-package validation reportの既存`violations[*].code`として保持する。fatalへ変換しない |
| `INSTRUCTION_RENDER_MISSING` | output failure reportの既存`failureObservation.violations[*].code`として保持する。`fatalObservation=null`を維持する |
| `CHILD_PROCESS_TIMEOUT` | 実際のtimeout機能と停止条件が別途承認されるまで語彙へ登録しない |

### 4.3 `REQUIRED_EXPORT_MISSING`の実owner化

現行のstatic named importでは、対象exportが欠けると`run_presentation_output_job_v001.ts`自身のmodule評価前にNodeが停止する。この状態を「現行所有枝あり」とは数えない。

案Aでは、次の限定変更を承認対象に含める。

1. `run_presentation_output_job_v001.ts`の共通描画core importだけをnamespace importへ変える。
2. runnerの通常起動時に、使用する必須exportが関数であることを一度確認する。
3. 欠落時は既存の外側`OUTPUT_RENDER_CORE_PROCESS_FAILED`・終了2を維持し、`runner-bootstrap / 束縛済みcommon-renderer file / REQUIRED_EXPORT_MISSING`を付ける。
4. 存在時は現在と同じexportをそのまま呼ぶ。代替関数、fallback、動的import、検査専用注入口は作らない。
5. FOVO006では、同じguardへ不足namespaceを渡す純粋検査と、正式runnerが実namespaceのguardを通って既存正常経路へ進む検査を一組で行う。

これは新しい失敗条件を作る変更ではなく、現在はNode loaderに露出している既存の起動失敗を、runnerが安全に報告できる位置へ移す変更である。ただし現行分岐の利用ではないため、人間承認なしには行わない。

## 5. 条件付き完全実装path 18件

本節以降は案A承認を条件とする。implementation/testの変更上限を18 fileとする。cleanup記録、承認済み方向設計、本書は版管理へ追加する記録物であり、18 implementation/test fileの上限には数えない。3文書の内容は実装時に編集しない。

| ID | path | 種別 | 開始SHA-256 | 許可する変更 | 禁止する変更 |
| --- | --- | --- | --- | --- | --- |
| F01 | `evals/clip_composition/presentation_fatal_observation_v002.mjs` | 新規production | 未存在 | 13 stage、14 code、許可行列、exact builder/validator、安全なtarget選択、閉語彙classifierの唯一正本 | report serializer複製、生文字列返却、推測分類 |
| F02 | `evals/clip_composition/presentation_fatal_observation_v002.test.mjs` | 新規test | 未存在 | 共通schemaと14 owner codeの41件 | production計算の複製 |
| F03 | `evals/clip_composition/presentation_fatal_observability_v002.integration.test.mjs` | 新規test | 未存在 | 9実例、5境界、forward-only、5 treeの40件 | 正式成果物への書込、検査専用production分岐 |
| F04 | `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` | 既存production | `eb8192206a95806a2ece137731293a737da277d62ef7f2dd53fb695e6cb63a52` | 現在fatalの捕捉情報をtimeline fatal v002へ渡し、新attemptの実装束縛末尾へF01を追加 | decision、9違反code、passed/rejected、終了code変更 |
| F05 | `evals/clip_composition/presentation_meaning_boundary_source_package_v001.test.mjs` | 既存test | `bcbf40370e58505b0c389956c0d9f39c98d6e51749af60928dc9e666b1c4fae7` | 既存13件内のtimeline fatal期待をv002へ更新 | test件数変更、source package契約変更 |
| F06 | `evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs` | 既存production | `5ca545fa9997045364ee93bc29c29b9d6ee6ddb4ad30b9a771888729386125c4` | 現在exit 2のcatchだけをformal runner fatal v002へ写し、fixture jobのdependency末尾へF01を追加 | package読取拒否のfatal化、旧B1/B4正式job生成の再開 |
| F07 | `evals/clip_composition/test_presentation_caption_semantic_output_v002.mjs` | 既存test | `b06293a8f8b2196c430cbd7b95f081c4e5f3a9f3e5d6e6755bc63d2ec2f9b74d` | W01〜W08内のfatal期待をv002へ更新 | 8件からの件数変更、期待緩和 |
| F08 | `evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs` | 既存production | `3ca051215d07c11d9d58ad49db1d785f34debb9a66686cddc75fbbdb6b363e69` | 現在fatalのcatchだけをmeaning-boundary fatal v002へ写し、新attemptの実装束縛末尾へF01を追加 | passed/rejected report v001、入力invalidのstatus変更 |
| F09 | `evals/clip_composition/presentation_meaning_boundary_selection_v001.test.mjs` | 既存test | `ab33ea30322de44ad392e83d4791eab6baeaa7bd40037e1f13bde4390fa271b8` | MSL既存21件内のfatal期待をv002へ更新 | 21件からの件数変更、正常成果物変更 |
| F10 | `evals/clip_composition/presentation_meaning_information_package_v001.mjs` | 既存production | `af781099cbd537ddd43bb38490cd8ba1585ec3ce32774d9a92c20a1d91fe5570` | failure report v002 schema、validator、builder、新attemptの実装束縛末尾へF01を追加 | 成功package、30違反code、serializer規律変更 |
| F11 | `evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs` | 既存production | `eddf9dbe2d7b5f919154b748363d66085e378499d0099e988a8473e577416233` | fatal捕捉、stdout、durable v002、target/report公開分類 | 成功経路、rejected、既存root、no-replace変更 |
| F12 | `evals/clip_composition/presentation_meaning_information_package_v001.test.mjs` | 既存test | `3c84cb8f33e827117bc88402a9f681a1fa786cbd2ad97d109415e11b44673312` | MIP001〜034内のfatal期待と公開検査をv002へ更新 | 34件からの件数変更、期待緩和 |
| F13 | `evals/clip_composition/presentation_output_contract_v001.mjs` | 既存production | `b74a8a00774eb87330d6e0c289f9dd02ef57086c5bf96758798f05c3b437617f` | 新attemptのformal implementation roleへF01を追加 | request、19違反code、16 check、既存job受理 |
| F14 | `evals/clip_composition/presentation_output_contract_v001.test.mjs` | 既存test | `8765b6d8db3ff6ef3265c4e9870f4ea597dc0f74c5f7cfc3baeddcb7851ed825` | OCT既存21件内のrole集合期待を更新 | 21件からの件数変更、合否変更 |
| F15 | `evals/clip_composition/presentation_output_render_plan_v001.mjs` | 既存production | `e2e5fb23562a50bc0560dad1f9d210ba8009548bdba05b7394ae4ed458783391` | output diagnostic/failure report v002、fatalObservation組込 | failureObservation、QC、成功manifest/report変更 |
| F16 | `evals/clip_composition/run_presentation_output_job_v001.ts` | 既存production | `4a0328299fe11498a684f8c2d9ba280252df6479f738179b88a2f80867bc1bd6` | 直接観測と信頼済み内側報告を閉語彙へ写す。共通描画coreだけをnamespace importへ変え、必須export guardを通常経路で実行する | 外側13 code、合否、描画、公開基準、fallback、動的import変更 |
| F17 | `evals/clip_composition/presentation_output_render_plan_v001.test.mjs` | 既存test | `b7ab0305970014e4567a5fdd607f1e90d4c12168cb6f292fe4ae2c691ecb02b2` | ORP001〜033内のv002 schema・runner期待を更新 | 33件からの件数変更、成功projection変更 |
| F18 | `evals/clip_composition/render_presentation_v002.mjs` | 既存production | `d02d603f3fc04f9ab58ce889644f5e63bf17d7ec5cb19019e09110c6167a720b` | 既存子process終了eventのcodeとsignalを構造化し、閉語彙だけを親へ返す | timeout新設、生stderr保存、描画・QC計算変更 |

新attemptだけがF01をlive implementation bindingへ含める。既存正式job、生成時SHA、既存成果物は変更しない。生成時SHAと現在実装SHAの同一要求も再導入しない。

### 5.1 5境界のF01束縛

| 境界 | 新attemptのordered implementation binding | 変更owner / 検査owner |
| --- | --- | --- |
| timeline | `timeline-decision / strict-json / fatal-observation` | F04 / F05 |
| 旧B1 fixture | 既存`files`は不変。`dependencyFiles`末尾に`fatal-observation` | F06 / F07 |
| 意味終端 | `meaning-selection / meaning-source-package / strict-json-codec / fatal-observation` | F08 / F09 |
| 意味package | `meaning-package / meaning-package-runner / retained-atoms / strict-json / fatal-observation` | F10 / F12 |
| 出力 | 既存11 roleの末尾に`fatal-observation` | F13 / F14 |

全境界がF01を直接importし、F01から境界側への逆importは0件とする。既存のbinding object shape、固定順、開始時SHA照合、公開直前再読は変えない。

18 fileで保証する旧B1は、承認済み方向設計§10どおり、実害fixtureと既存runnerのfatal envelope確認までである。旧B1/B4の正式job生成を再開しない。将来、旧B1 jobを正式生成する場合は、現generatorとその検査を含む少なくとも2 fileの別工事が必要であり、本設計はその保証をしない。

### 5.2 14 codeのownerと実発火

「catchがありそう」では所有成立としない。正式入口または既存のpure/test入口から、productionの停止枝を実際に通してFOVO IDが観測できることを条件にする。

| inner code | production owner path / 現在の停止枝 | stage | 実発火ID |
| --- | --- | --- | --- |
| `ERR_FS_FILE_TOO_LARGE` | F06の既存`reader`がjobまたは意味回答を全量読取し、Nodeの同codeを外側fatal catchへ渡す枝 | `input-read` | FOVO001 |
| `FILE_CHANGED_DURING_READ` | F08の公開直前再観測が開始時と異なるfile identityまたはbyteを検出し、既存fatalへ進む枝 | `input-read` | FOVO002 |
| `NUMERIC_TOKEN_INVALID` | F16が束縛済みoutput requestをstrict decodeし、`reason=number-invalid`で既存`OUTPUT_FORMAL_JOB_INVALID`・終了2へ進む枝 | `input-read` | FOVO003 |
| `FORMAL_JSON_VALUE_INVALID` | F16が束縛済みoutput requestをstrict decodeし、数値以外のformal JSON不成立で同じ既存終了2へ進む枝 | `input-read` | FOVO004 |
| `BINDING_REFERENCE_MISMATCH` | F16のoutput request file/canonical binding照合が不一致となり、既存`OUTPUT_FORMAL_JOB_INVALID`・終了2へ進む枝 | `input-read` | FOVO005 |
| `REQUIRED_EXPORT_MISSING` | **案A追補で新設するF16の通常bootstrap guard**。F18 namespaceの必須関数欠落だけを所有し、正常時は現行関数を呼ぶ | `runner-bootstrap` | FOVO006 |
| `OS_PERMISSION_DENIED` | F06の既存`reader`が直接受けた`EPERM/EACCES`を外側fatal catchへ渡す枝。例外messageは使わない | `input-read` | FOVO007 |
| `CHILD_PROCESS_SPAWN_FAILED` | F18の既存child `error` eventで、権限拒否以外のspawn失敗を受ける枝 | `overlay-render` | FOVO008 |
| `CHILD_PROCESS_EXIT_NONZERO` | F18の既存child `close` eventで非0 codeを受ける枝 | `overlay-render` | FOVO009 |
| `CHILD_PROCESS_SIGNALLED` | F18の既存child `close` event。現在捨てているsignal有無だけを保持する | `overlay-render` | FOVO010 |
| `PUBLICATION_FAILED` | F04の正式成果物をno-replace公開する既存catch | `publication` | FOVO011 |
| `REPORT_TARGET_INVALID` | F11またはF16の既存failure rootを公開前に拒否する枝 | `failure-report-publication` | FOVO012 |
| `REPORT_PUBLICATION_FAILED` | F11またはF16がtarget検査通過後にfailure reportの実公開に失敗する枝 | `failure-report-publication` | FOVO013 |
| `UNCLASSIFIED` | F06の既存外側fatal catchが、閉語彙へ安全に写せないcodeなしErrorを受ける枝 | `unknown` | FOVO014 |

FOVO001、007、014は、既存の`options.readFile`入口からproductionの同じcatchを通す。classifierだけを単体で呼んで「実発火」と数えない。FOVO008〜010は実child processを起動する。FOVO011〜013は検査所有の一時workspaceで実file operationを行う。

FOVO006だけは現行ownerではない。この行を含む14/14成立には§4.3の明示承認が必要であり、承認前の現状は13/14である。

## 6. 5境界の実装

| 境界 | v002化する現在fatal | 正式出力 | durable失敗報告 |
| --- | --- | --- | --- |
| timeline composition | job、媒体、入力再読、公開で現在終了2になるcatch | stdoutへ`zev-timeline-composition-failure-v002` | 新設0件 |
| 旧B1 semantic output check | job path不正、決定性不成立、outer catch等の現在終了2 | stdoutへ`presentation-formal-runner-fatal-v002` | 新設0件 |
| forward-only意味終端選択 | CLI usage、runner throw、公開前再読等の現在終了2 | stdoutへ`presentation-caption-meaning-boundary-runner-fatal-v002` | 新設0件 |
| 意味情報パッケージ | context前、input read、直列化、公開、failure report公開 | context前はstdout。context後は保存byteとstdoutを完全一致 | 既存rootのleafをv002へ非互換改訂 |
| 出力runner／共通描画 | context前、crop、layout、描画子process、QC、公開、failure report公開 | context前はstderr。context後は保存byteとstdoutを完全一致 | 既存rootのleafをv002へ非互換改訂 |

意味情報と出力は、同一job SHAの二回目を`REPORT_TARGET_INVALID`として公開前に止める。公開を実際に試した後の失敗だけを`REPORT_PUBLICATION_FAILED`とする。作れなかったreportを捏造しない。

## 7. 実害9例の事前対応表

| # | 事実上の元所有者 | v002導入後に読む欄 | coverageの限界 |
| ---: | --- | --- | --- |
| 1-a | 凍結済み旧B4のTSX起動 | fixtureでは`fatalObservation.innerStage=runner-bootstrap`、`targetFile=null`、`innerCode=OS_PERMISSION_DENIED` | 元の旧B4は対象外。現行5境界で直接EPERMを捕捉した場合の写像を証明する |
| 1-b | 凍結済み旧B4の配置数値読取 | fixtureでは`layout-preflight / null / NUMERIC_TOKEN_INVALID` | 元の旧B4は対象外。歴史fixtureによるschema事前検証である |
| 2 | source-package子process検査 | 既存source-package reportの`violations[*].code=GATE_A_CONTEXT_INVALID` | fatalObservation対象外。親TAP捕捉問題をv002が解決したとは主張しない |
| 3-a | 凍結済み旧B4の意味再構築 | fixtureでは`semantic-rebuild / null / FORMAL_JSON_VALUE_INVALID` | 元の旧B4は対象外 |
| 3-b | 凍結済み旧B4のSHA参照 | fixtureでは`semantic-rebuild / 一意なbindingまたはnull / BINDING_REFERENCE_MISMATCH` | 元の旧B4は対象外 |
| 4 | 縦型描画crop前export | `fatalObservation=runner-bootstrap / 束縛済みcommon-renderer file / REQUIRED_EXPORT_MISSING` | §4.3の通常bootstrap guardが承認された場合だけ直接検査できる。現行static importのままでは読めない |
| 5 | 描画QC | `failureObservation.violations[*].code=INSTRUCTION_RENDER_MISSING`、`fatalObservation=null` | 検査済み拒否のまま。fatalへ変えない |
| 6 | 出力計画の正式直列化 | `fatalObservation=formal-serialization / null / FORMAL_JSON_VALUE_INVALID` | memory上のfieldをfileへ偽装しない |
| 7 | timelineの元媒体読取 | `fatalObservation=source-media-read / 元媒体binding / ERR_FS_FILE_TOO_LARGE` | 読取不能fileの実測SHAとは主張しない |
| 8 | 意味情報packageの元媒体読取 | `fatalObservation=source-media-read / 元媒体binding / ERR_FS_FILE_TOO_LARGE` | 同上 |
| 9 | 共通描画のChromium終了 | `fatalObservation=overlay-render / null / CHILD_PROCESS_SIGNALLED` | `SIGTRAP`名、OS log、EPERM推測は保存しない |

この表は、実害2と5がfatal専用語彙ではなく既存の検査済み拒否欄で読めること、実害1〜3の凍結済み元経路は対象外であることを隠さない。

## 8. 新規検査一件表: 81件

案Aでは新規2 test fileを合計81件に固定する。既存green gateへ新IDを足さない。

### 8.1 共通schema・byte契約 `FOVC001〜027`（27件）

| ID | 検査 |
| --- | --- |
| FOVC001 | `targetFile=null`のbuilder結果 |
| FOVC002 | file対象のbuilder結果 |
| FOVC003 | 2 shapeのvalidator受理 |
| FOVC004 | fatalObservationのexact key順 |
| FOVC005 | targetFileのexact key順 |
| FOVC006 | 2-space・末尾LFの正式byte |
| FOVC007 | 同一入力のbyte決定性 |
| FOVC008 | 13 stage export完全一致 |
| FOVC009 | 14 inner code export完全一致 |
| FOVC010 | stage/code許可行列完全一致 |
| FOVC011 | `unknown/null/UNCLASSIFIED`の唯一性 |
| FOVC012 | 未知stage拒否 |
| FOVC013 | 未知code拒否 |
| FOVC014 | 不許可stage/code組合せ拒否 |
| FOVC015 | fatalObservation追加key拒否 |
| FOVC016 | targetFile追加key拒否 |
| FOVC017 | path欠落拒否 |
| FOVC018 | SHA欠落拒否 |
| FOVC019 | 絶対path拒否 |
| FOVC020 | workspace逸脱path拒否 |
| FOVC021 | 不正SHA拒否 |
| FOVC022 | 許可field外参照拒否 |
| FOVC023 | path不一致時null |
| FOVC024 | SHA不一致時null |
| FOVC025 | 複数一致時null |
| FOVC026 | jobを読めていない時null |
| FOVC027 | message・stack・stdout・stderr・text・apiKey等の追加拒否 |

### 8.2 現行fatal所有分岐 `FOVO001〜014`（14件）

| ID | 実発火するinner code |
| --- | --- |
| FOVO001 | `ERR_FS_FILE_TOO_LARGE` |
| FOVO002 | `FILE_CHANGED_DURING_READ` |
| FOVO003 | `NUMERIC_TOKEN_INVALID` |
| FOVO004 | `FORMAL_JSON_VALUE_INVALID` |
| FOVO005 | `BINDING_REFERENCE_MISMATCH` |
| FOVO006 | `REQUIRED_EXPORT_MISSING` |
| FOVO007 | `OS_PERMISSION_DENIED` |
| FOVO008 | `CHILD_PROCESS_SPAWN_FAILED` |
| FOVO009 | `CHILD_PROCESS_EXIT_NONZERO` |
| FOVO010 | `CHILD_PROCESS_SIGNALLED` |
| FOVO011 | `PUBLICATION_FAILED` |
| FOVO012 | `REPORT_TARGET_INVALID` |
| FOVO013 | `REPORT_PUBLICATION_FAILED` |
| FOVO014 | `UNCLASSIFIED` |

### 8.3 実害fixture `FOVI001〜009`（9件）

| ID | 検査 |
| --- | --- |
| FOVI001 | TSX権限拒否を生messageなしで写す |
| FOVI002 | 配置小数token拒否を別attemptとして写す |
| FOVI003 | Gate A拒否は既存violationsへ残しfatalへ変えない |
| FOVI004 | byte列型喪失をmemory target nullで写す |
| FOVI005 | SHA参照不一致は一意bindingだけを対象にする |
| FOVI006 | export欠落をcrop-frame-inspectionへ写す |
| FOVI007 | 指示画像欠落はrejected・fatalObservation nullを維持する |
| FOVI008 | timelineと意味packageの大容量媒体読取を別reportで写す |
| FOVI009 | signalを写すがOS log由来のEPERMを推測しない |

### 8.4 5境界・stream・保存 `FOVB001〜018`（18件）

| ID | 検査 |
| --- | --- |
| FOVB001 | timeline context前fatal v002 |
| FOVB002 | timeline context後fatal v002 |
| FOVB003 | timelineのF01 ordered bindingとpassed/rejected・stdout・durable 0件不変 |
| FOVB004 | 旧B1 context前fatal v002 |
| FOVB005 | 旧B1 context後fatal v002 |
| FOVB006 | 旧B1 fixtureのF01 dependency bindingとpassed/rejected/abstained・exit不変 |
| FOVB007 | 意味終端 context前fatal v002 |
| FOVB008 | 意味終端 context後fatal v002 |
| FOVB009 | 意味終端のF01 ordered bindingとpassed/rejected・durable 0件不変 |
| FOVB010 | 意味package context前はstdoutのみ |
| FOVB011 | 意味packageのF01 ordered binding、context後durable byteとstdout一致 |
| FOVB012 | 意味package同一job SHA二回目を保存前拒否 |
| FOVB013 | 意味package実公開失敗との分類分離 |
| FOVB014 | 出力context前はstderrのみ |
| FOVB015 | 出力のF01 ordered binding、context後durable byteとstdout一致 |
| FOVB016 | 出力同一job SHA二回目を保存前拒否 |
| FOVB017 | 出力実公開失敗との分類分離 |
| FOVB018 | output runner外側13 codeと安全記録stream不変 |

### 8.5 forward-only・不変・秘密 `FOVF001〜008`（8件）

| ID | 検査 |
| --- | --- |
| FOVF001 | v001 reportをv002入口で拒否 |
| FOVF002 | converter 0件 |
| FOVF003 | fallback 0件 |
| FOVF004 | v001/v002併産0件 |
| FOVF005 | 成功projection byte不変 |
| FOVF006 | 検査済み拒否と終了code不変 |
| FOVF007 | 既存違反code集合不変 |
| FOVF008 | 生文字列・secretの正式byte混入0件 |

### 8.6 正式5本のtree `FOVT001〜005`（5件）

| ID | 成果物root | 正本tag / tree OID / file数 |
| --- | --- | --- |
| FOVT001 | `evals/clip_composition/outputs/presentation/review-renders/DmWu0jVQfTE-candidate-13-caption-b6-v004-v002` | `stable/vertical-first-clip-20260802` / `27affa2cff1e099d263f5a00ed9c4558be1300bd` / 25 |
| FOVT002 | `evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001` | `stable/vertical-first-clip-20260802` / `454fcf002ac90b0d6ce72f63f55476ed9f8ffc72` / 21 |
| FOVT003 | `evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result` | `stable/vertical-first-clip-20260802` / `53076722863d2c36d470cc4ce9503739406ec03a` / 35 |
| FOVT004 | `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003-output` | `stable/meaning-output-first-real-run-20260806` / `ce2f5807db5ff63b83e1200bcec9f40796210327` / 35 |
| FOVT005 | `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002-output` | `stable/meaning-output-first-real-run-20260806` / `5e65c51ad30a65f43b087a71b50f6172162b2c49` / 42 |

各tree検査は、root tree OID、全path/blob OID、file数、欠落、byte差、sidecar追加0件を一つのIDで照合する。

## 9. 既存回帰

### 9.1 直接影響回帰 130/130

| path | 固定値 |
| --- | ---: |
| `presentation_meaning_boundary_source_package_v001.test.mjs` | 13/13 |
| `test_presentation_caption_semantic_output_v002.mjs` | 8/8 |
| `presentation_meaning_boundary_selection_v001.test.mjs` | 21/21 |
| `presentation_meaning_information_package_v001.test.mjs` | 34/34 |
| `presentation_output_contract_v001.test.mjs` | 21/21 |
| `presentation_output_render_plan_v001.test.mjs` | 33/33 |
| 合計 | 130/130 |

結果を見てこの130件を増減しない。

### 9.2 既存green gate 287/287

| path | 固定値 |
| --- | ---: |
| `presentation_retained_source_atoms_v001.test.mjs` | 50/50 |
| `presentation_segmenter_boundary_evidence_v001.test.mjs` | 21/21 |
| `test_presentation_caption_semantic_source_package_v002.mjs` | 10/10 |
| `test_presentation_caption_semantic_output_v001.mjs` | 161/161 |
| `test_presentation_caption_semantic_output_v002.mjs` | 8/8 |
| `presentation_base_media_timeline_v002.test.mjs` | 15/15 |
| `test_presentation_caption_layout_inspection_json_v001.mjs` | 12/12 |
| `test_presentation_caption_api_cost_guard_v001.mjs` | 10/10 |
| 合計 | 287/287 |

### 9.3 既知baseline 64/181

| path | 固定値 |
| --- | ---: |
| `test_presentation_caption_semantic_source_package_v001.mjs` | 43/133 |
| `presentation_base_media_build_v001.test.mjs` | 6/20 |
| `presentation_renderer_v002.test.mjs` | 12/19 |
| `presentation_vertical_review_renderer_v001.test.mjs` | 0/1 |
| `presentation_vertical_formal_path_integration_v001.test.mjs` | 3/6 |
| `presentation_base_media_renderer_v002.integration.test.mjs` | 0/2 |
| 合計 | 64/181 |

baselineはcommand終了0を要求しない。TAPを解析し、`tests=181 / pass=64 / fail=117 / cancelled=0 / skipped=0 / todo=0`の完全一致を合格条件にする。合格数が増えても減っても停止する。

## 10. 正式検査入口と保存

- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- TSX loader: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- `NODE_OPTIONS`: 不存在
- test concurrency: 1
- `npm exec`、`npx`、package導入を伴うcommand: 禁止
- 新規81件: 固定Node＋固定TSX loaderで2新規test fileを一括実行
- 直接影響130件、green 287件、baseline 181件: 各正本commandで実行
- TAP全文とstderrは`evals/clip_composition/reports/presentation/test-runs/20260807-fatal-observability-v002/attempt-0001/`へno-replace保存
- 不合格1件で停止し、同attemptで直さない

## 11. 既存成果物・tag・codeへの不干渉

- `stable/vertical-first-clip-20260802`と`stable/meaning-output-first-real-run-20260806`を移動・再発行しない。
- §8.6の5 rootへ書き込まない。
- 保存済みv001 failure reportを復元、変換、再公開しない。
- timeline 9 code、意味package 30 code、output acceptance 19 code、output外側13 diagnostic、renderer既存code集合を変更しない。
- v002の14 inner codeは既存違反code集合へ追加せず、終了2の安全な内訳として別集合にする。
- success、rejected、abstained、exit 0/1/2、QC基準、描画結果を変更しない。

### 11.1 次の実装commitへ同封する記録

| path | 現在SHA-256 | 扱い |
| --- | --- | --- |
| `evals/clip_composition/reports/presentation/presentation-meaning-output-first-real-run-qc-work-cleanup-20260806-v001.md` | `4792503a990a4733f700e1236f39d159effdb7ed838fdf7ff18293080878a759` | cleanup記録。byte不変で追加 |
| `evals/clip_composition/reports/presentation/presentation-fatal-observability-v002-contract-design-20260806-v001.md` | `dda58845ead84b599a8b3a466475d247084791092cf34e3ef269d7c35785071d` | 承認済み方向設計。byte不変で追加 |
| `evals/clip_composition/reports/presentation/presentation-fatal-observability-v002-complete-implementation-design-draft-20260807-v001.md` | 本書外で承認対象SHAを固定 | 案A承認後もbyte不変で追加 |

この3文書は18 implementation/test fileへ数えない。案Aが承認された場合も、本書を黙って書き換えず、承認記録が本書SHAと案A裁定を一組で正本化する。

## 12. 実装順序と停止条件

1. F01とF02を作り、共通41件を実行する。
2. timeline、旧B1、新意味終端をv002化する。
3. 意味packageのrunner envelopeとdurable reportをv002化する。
4. 出力report／runnerをv002化し、共通描画の既存終了eventからsignalを保持する。
5. 新規81/81を版付きTAP付きで実行する。
6. 直接影響130/130を確認する。
7. green 287/287を確認する。
8. baseline 64/181のexact集計不変を確認する。
9. 5 treeを最終再照合する。
10. 合格した18 fileのSHA-256をcommit Aから導出し、全18件表を完了報告へ載せる。
11. cleanup記録、承認済み方向設計、本書を内容不変で同じ実装commitへ入れる。

次のいずれかで即停止する。

- 19 file目が必要になる。
- 案A承認後の14 code ownerを1件でも実発火できない。
- status、終了code、既存違反codeを変える必要が出る。
- 生文字列、OS log、字幕本文、secretを保存しないと分類できない。
- production計算、serializer、target選択を検査側へ複製する必要が出る。
- 81件、130件、287件、baseline、5 treeのいずれかが固定値と異なる。
- 既存正式成果物、安定tag、保存済みv001 reportへ差が出る。

## 13. 完全性チェック

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| 本来の目的 | 合格 | 診断往復削減だけに限定 |
| path閉包 | 条件付き合格 | 案Aなら18/18。現契約17 codeのままでは不成立 |
| 参照実体 | 合格 | 既存15 fileの現物SHA照合済み。新規3 fileは役割とimport向きを固定 |
| schema・key順 | 合格 | 承認済み方向設計＋F01で一意 |
| code所有 | **不合格** | timeout所有枝0、Gate A／QC codeはrejected、必須export欠落はmodule評価前。案Aなら通常bootstrap guardを含め14/14へ閉じる |
| stream・保存先 | 合格 | 5境界ごとに固定、意味/outputのみdurable |
| 検査可能性 | 条件付き合格 | 案Aなら81件全IDを実枝から実行可能 |
| 工程間受け渡し | 条件付き合格 | 5境界のordered bindingを§5.1で固定。旧B1の正式job再生成は明示的に保証外 |
| 観測データ取得可能性 | 合格 | signalは既存close eventから保持。rawは保存しない |
| 数値区分 | 合格 | 既存整数／有限幾何契約を変更しない |
| 既存成果物 | 合格 | 5 treeのtag/OID/file数を固定 |
| 既存検査 | 合格 | 130、287、baselineを別表で固定 |
| 後方互換禁止 | 合格 | v001拒否、変換・fallback・併産なし |
| 人間作業 | 合格 | 次は案Aの採否1件。実装時の動画目視0件 |

現時点ではcode所有が不合格なので、本書を実装正本として扱ってはならない。

## 14. 事実・推測・未確認

### 事実

- 18 implementation/test pathは特定できた。
- `CHILD_PROCESS_TIMEOUT`の現行所有分岐は0件である。
- `GATE_A_CONTEXT_INVALID`と`INSTRUCTION_RENDER_MISSING`は現在rejected側のcodeである。
- `REQUIRED_EXPORT_MISSING`は現行static importのままではrunner内部から観測できない。
- 実害1〜3の元所有者は対象の旧B1 checkerではない。
- 5正式成果物rootのtag、tree OID、file数を固定できた。
- production、検査、正式成果物は変更していない。

### 推測

- 案Aの14 codeでも、現在追加診断を必要とするfatalの大半を一段で分類できる可能性が高い。

### 未確認

- 案Aが人間承認されるか。
- 実装後の81/81、130/130、287/287、baseline、5 tree。
- 観測性導入後に人間判断停止が何件減るか。

## 15. 人間作業と次の判断

- 今回必要な判断: 1件、目安2分。
- 実装時の動画目視: 0件。
- API通信・費用: 0回・US$0。

次の承認文案は、設計の正本化だけを行う。実装は含めない。

> fatal観測性v002完全実装設計draft v001の実装前停止を受理する。最小追補案Aを承認する。GATE_A_CONTEXT_INVALIDとINSTRUCTION_RENDER_MISSINGは既存の検査済み拒否欄で保持し、CHILD_PROCESS_TIMEOUTは実際のtimeout機能が別途設計されるまで登録しない。REQUIRED_EXPORT_MISSINGは、出力runnerの共通描画core importだけをnamespace importへ変え、実運用で毎回通る必須export guardが所有する。正常時は従来関数を呼び、fallback・動的import・別実装は作らない。この14 codeと、実害1〜3の凍結済み元経路へv002適用済みと主張しない保証限界、§5〜§13の18 file・新規81件設計を一組で完全実装設計v001として承認する。実装、検査実行、正式成果物変更、API通信は別承認とする。

承認されるまで実装へ進まない。
