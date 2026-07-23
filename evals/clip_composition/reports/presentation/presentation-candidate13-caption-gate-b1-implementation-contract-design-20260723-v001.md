# candidate 13 基本テロップ ゲートB1完全実装契約設計 v001

- 作成日: 2026-07-23
- 状態: **2026-07-23 kawafmm承認済み。B2まで実行許可されたが、内包ゲートA検査結果の受け渡し入口不足を検出して合成検査前に停止。正式入力・prompt・Gemini・表示計画・描画は別承認**
- 対象: ゲートB1のsource-only入力package、意味分割出力の受入、決定的展開、compiler入力
- 非対象: prompt登録、Web版Gemini実走、正式cue・target・指示書、v003対生成、描画、人間の読みやすさ判定
- 人間作業: 本設計承認時は1件。現在は実装契約追補を起草してよいかの1判断。媒体視聴・時刻入力・文字分割・時間計測はなし

## 1. 目的

本来の目的は、candidate 13の実基礎映像へ、元発話から追跡できる基本テロップを載せ、初の実データ配管を一本通すことである。

ゲートAでは、正式に残った354文字から205件の**機械的な区切り候補**を欠落・重複・順序変更なしで作れることを確認した。ゲートB1は、その証拠を正本のまま封入したsource-only入力を作り、意味モデルへ次の二つだけを選ばせるための完全な実装契約を固定する。

1. どの機械境界候補で一行を終えるか。
2. 連続する一行または二行を、どの同一表示まとまりへ束ねるか。

モデルは本文、時刻、元文字ID、anchor、自由ID、理由、scoreを生成しない。モデルが返した行末候補IDから、機械が元の文字・本文・anchorを復元する。

ここで検査するのは、入力が正本だけから作られたこと、モデル回答が閉じた形式に適合すること、元文字へ決定的に戻せることである。**日本語として読めるか、見た目がよいかは採点しない。** それは初描画の人間確認に残す。

## 2. 権限と正本

### 2.1 承認済みの正本

次は意味を変えずに使う。

- `presentation-candidate13-caption-resolution-pair-generation-design-20260722-v001.md`
- `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`
- `presentation-candidate13-caption-gate-b-direction-approval-clarification-draft-20260723-v001.md`
- ゲートA正式job:
  `evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/DmWu0jVQfTE-candidate-13-v001.json`
- ゲートA実装commit:
  `051613f25d3259417e5a3522f98bc8946db22deb`
- ゲートA完了報告commit:
  `1bc403eadab7903cedd7bdaab079c5960b5dc98e`に含まれる
  `presentation-gate-a-implementation-completion-report-20260723-v001.md`
- 正式な残存source atom 354件と、その生成manifest・validation report
- 認定済みpreset台帳、renderer trust、文字幅処理

ゲートB方向設計と補足は、2026-07-23のkawafmm承認により一組の正本になった。これにより、承認済み元設計の次の二点が案内改訂された。

- 元設計§7.2: モデル可視の構造IDをtimeline segment ID・発話まとまりIDからcontainer IDへ集約する。内部の決定的対応は保持する。
- 元設計§10.2: 一枚の契約を、B1の入力・意味出力・compiler入力契約と、B4の正式表示計画・v003対生成契約へ分ける。

### 2.2 本設計が新しく固定するもの

- B1の実装fileと正本入口。
- 二つのjob schema。
- 正式packageの7 fileと全field。
- strict JSON、field順、実byte hash、canonical hash。
- source-only入力の唯一の仕事本文。
- 意味出力の完全形と`abstained`。
- 行末候補から元文字へ戻したcompiler入力。
- 違反コード57件、固定順、検査順、併発・抑制。
- CLI 0/1/2、stdout/stderr、run 1・自動再試行0。
- 安定読み取り、読み取り専用preflight、原子的公開、公開後検品。
- 実装契約完全性と検査可能性。

### 2.3 本設計から後段へ残すもの

- B5: prompt本文、prompt版台帳、execution payload。
- B6: 実行構成で指定したGemini、実際のモデル表記確認、raw回答取得、タブ終了。
- B4/B7: 正式cue・target・指示・解決package・v003状態・描画。
- 初描画後: 「読める・ズレない・欠けない」の人間確認。

意味出力の形式はB1で固定するが、実回答は作らない。B4の正式cue IDも作らない。

### 2.4 実走モデル構成の追加指定

2026-07-23のkawafmm承認で、将来のB5/B6へ次を追加した。本指定はB2でモデルを実走する許可ではない。

- 第一候補は`gemini-3.6-flash`。2026-07-21公開、入力1M tokenあたりUS$1.5・出力1M tokenあたりUS$7.5という値は、kawafmmが実走計画用に指定した時点情報として記録する。
- モデルIDをB1 core、prompt本文、検査器の定数へ焼き込まない。B5で固定する実行構成のパラメータとし、B6開始前に人間承認された一つの値だけを使う。
- B5/B6の成果物契約では、設定したモデルID、実行日、APIレスポンスが返したモデル表記を正式execution manifestへ必須記録する。exact schema・field名・API由来の取り出し規則はB5/B6設計で実走前に固定する。
- 一つの正式attemptの途中でモデル版を変えない。変更する場合は、旧attemptを保持したまま新attempt ID・新manifestとして別記録する。
- B6の承認依頼には、正式入力packageから機械計測した入力token数、想定する呼出回数と出力上限、上記単価に基づく入力・出力・合計の見積りを分けて示す。354文字・205候補という件数をtoken数へ独自係数で換算しない。

## 3. 段階と停止点

| 段階 | 成果物 | 停止点 |
|---|---|---|
| B1 | 本完全実装契約 | 本文書の提示で停止。コードなし |
| B2 | core、runner、合成検査、既存回帰、candidate 13読み取り専用preflight | 正式package・prompt・Geminiなし |
| B3 | 正式source-only package 1件 | prompt・Geminiなし |
| B4 | 正式表示計画・v003対・人間確認用描画入口の完全契約 | コード・Geminiなし |
| B5 | prompt登録、packageとB4契約へ束縛したexecution payload | Geminiなし |
| B6 | Web版Gemini run 1、raw出力保存、B1 checker適用 | v003対生成なし |
| B7 | 決定的compiler、v003対生成、人間確認用描画 | 実装と実行を別承認 |

今回の承認範囲はB1だけである。

## 4. 実装資産と正本入口

B2で初めて次を作る。B1承認では作らない。

| role | path | 責務 |
|---|---|---|
| package core | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` | strict JSON、Gate A内包証拠、モデル入力、対応表、漏洩検査、manifest、package検査 |
| package runner | `evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs` | package jobの唯一のproduction入口。preflightまたは正式生成 |
| semantic core | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` | raw意味出力のstrict受入、行末ID検査、決定的展開、compiler入力 |
| semantic runner | `evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs` | semantic check jobの唯一のproduction入口。読み取り専用 |
| package test | `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs` | package契約の合成検査 |
| semantic test | `evals/clip_composition/test_presentation_caption_semantic_output_v001.mjs` | 意味出力・展開契約の合成検査 |

原則:

1. production runnerと合成検査は、同じexport済みgenerator・checker・validatorを使う。
2. テスト用の同等ロジックを複製しない。
3. ゲートAのcore・runnerは変更しない。B1側から既存exportを使う。
4. package coreとsemantic coreは、同じB1 strict JSON判定を使う。semantic coreが別の緩いparseを持たない。
5. candidate 13固有の件数、hash、pathはjob・preflight期待値にだけ置く。coreへ焼き込まない。

### 4.1 production runnerと検査入口

B2では、§4のcore・runnerから次をexact nameでexportする。合成検査専用の同等ロジックは作らない。

package core:

- `PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001`
- `decodePresentationCaptionB1StrictJsonV001(bytes)`
- `assertPresentationCaptionB1StrictValueV001(value)`
- `serializePresentationCaptionB1FormalJsonV001(value)`
- `canonicalizePresentationCaptionB1JsonV001(value)`
- `sha256PresentationCaptionB1BytesV001(bytes)`
- `validatePresentationCaptionSemanticSourcePackageJobV001(value)`
- `buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001(context)`
- `buildPresentationCaptionSemanticSourcePackageV001(context)`
- `checkPresentationCaptionSemanticSourcePackageV001(context)`
- `validatePresentationCaptionSemanticSourcePackageRunReportV001(context)`

semantic core:

- `validatePresentationCaptionSemanticOutputCheckJobV001(value)`
- `checkPresentationCaptionSemanticOutputV001(context)`
- `buildPresentationCaptionSemanticCompilerInputV001(context)`
- `validatePresentationCaptionSemanticOutputValidationReportV001(context)`

B1共通のstrict JSON判定・正式直列化・canonical化・SHA-256・固定57違反code列は、package coreだけを所有者とする。semantic coreは
`./presentation_caption_semantic_source_package_v001.mjs`
から上記exact named exportを静的importし、同等関数・同等code列を複製しない。循環importを作らないため、package coreはsemantic coreをimportしない。

package runner:

- `createPresentationCaptionSemanticSourcePackageProductionFilesystemAdapterV001()`
- `runPresentationCaptionSemanticSourcePackageV001(jobPath, {filesystemAdapter, builderAdapter})`
- `runPresentationCaptionSemanticSourcePackageCliV001(argv, streams)`

semantic runner:

- `createPresentationCaptionSemanticOutputProductionFilesystemAdapterV001()`
- `runPresentationCaptionSemanticOutputCheckV001(jobPath, {filesystemAdapter, builderAdapter})`
- `runPresentationCaptionSemanticOutputCheckCliV001(argv, streams)`

CLIはproduction filesystem adapterとfile内private production builder adapterを無条件で作ってrunnerへ渡す。CLIにadapter、実装、root、期待値の注入口を置かない。合成検査はexport済みrunnerへ二adapterを明示して渡す。runnerが、合成検査と同じexport済みvalidator・builder・checkerを呼んでいることを静的検査と一件の動的検査で確認する。

上記は各fileの**必須かつ全public export集合**である。追加のpublic export、default export、test専用exportを作らない。file内private helperは許す。

exportの引数・返却・例外契約を次へ固定する。

| 種類 | exact入力 | exact返却 | 例外 |
|---|---|---|---|
| 固定code列 | なし | 57文字列を§16.1順に持つfrozen dense array | なし |
| strict decode | Node Buffer一件 | `{status:"decoded", value}`または`{status:"invalid", reason}` | throwしない |
| strict in-memory検査 | 任意のJS値一件 | `{status:"valid"}`または`{status:"invalid", reason}` | throwしない |
| 正式直列化/canonical化 | 任意のJS値一件 | `{status:"serialized", bytes}` / `{status:"canonicalized", bytes}`または`{status:"invalid", reason}` | throwしない |
| SHA-256 | 任意値一件 | Bufferなら`{status:"hashed", sha256}`、他は`{status:"invalid-argument"}` | throwしない |
| job validator | 任意のJS値一件 | `{status:"valid", value}`または`{status:"invalid", paths}`。pathsは最小leaf JSONPathをUTF-16順・重複なしで持つdense array | throwしない |
| package/semantic pure checker | §4.2のphase付きcontext一件 | `{status:"checked", checks, violations}`または`{status:"context-invalid"}` | throwしない |
| package/Gate A report/compiler builder | 各§で固定したcontext一件 | 各§のrequired object | 契約済み入力での例外・required object不成立はrunnerが`BUILD_FAILED`用の生事実として捕捉する。process外へ漏らさない |
| report validator | §4.5のcontext一件 | `{valid:true}`または`{valid:false}` | throwしない |
| filesystem factory | 引数なし | §4.3のfrozen adapter | 初期化不能はrunnerのuntrusted内部異常へ送る |
| production runner | `(jobPath, {filesystemAdapter, builderAdapter})`。jobPathはstring、第二引数と両adapterは§4.1/4.3のexact own field以外なし | Promiseで`{kind:"trusted-report", exitCode, report, reportBytes}`または`{kind:"untrusted", exitCode:2, diagnostic}` | reject/throwを外へ漏らさない |
| CLI | `(argv, streams)` | Promiseでexit code `0`, `1`, `2` | reject/throwを外へ漏らさない |

strict decodeの`reason`は
`invalid-utf8`, `bom-present`, `syntax-invalid`, `trailing-content`, `duplicate-key`, `number-invalid`, `surrogate-invalid`, `code-fence`
のいずれか。strict in-memory/serializer/canonicalizerの`reason`は
`unsupported-value`, `non-plain-object`, `sparse-array`, `extra-array-property`, `accessor`, `to-json`, `symbol-key`, `non-enumerable-property`, `number-invalid`, `surrogate-invalid`
のいずれかとする。複数原因ではこの列の先頭一件を返す。自由文を返さない。

builderのrequired objectは**運搬shapeだけ**を次へ一意化し、domain schemaを先取りしない。

- package builder adapterの`buildGateAEvidence`:
  §5.2を満たすstrict in-memory JSONのplain object一件。Gate A evidence schemaへの適合は既存Gate A checkerへ委ねる。
- `buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001`:
  §5.2を満たすstrict in-memory JSONのplain object一件。Gate A report schema・内部整合は既存Gate A report validatorへ委ねる。
- `buildPresentationCaptionSemanticSourcePackageV001`:
  exact root `{artifacts}`。`artifacts`は0件以上のdense arrayで、各要素は
  `{fileName, value, bytes, fileSha256, canonicalSha256}`の運搬shapeを満たす。固定7件・file名・各valueのdomain schema・相互binding・hash整合はcheckerがcode 13〜23として判定する。
- `buildPresentationCaptionSemanticCompilerInputV001`:
  §5.2を満たすstrict in-memory JSONのplain object一件。§14.1 schema・展開・bindingはcheckerがcode 37〜47として判定する。

runnerのrequired-object検査が`invalid-return`とするのは、上記運搬shapeを作れない値、strict in-memory JSONでない値、Buffer/hashの型不成立、または正式serialize不能だけである。domain schema不成立を`BUILD_FAILED`へ吸収しない。runnerはevidence/report/compilerの運搬値から正式byte・実byte hash・canonical hashを自分で作り、成功pass objectへ付ける。

builder adapterはrunner経路の防御copy・二pass・停止順を検査可能にするための正本入口であり、production CLIの外部注入口ではない。

- package builder adapterのexact field順:
  `{buildGateAEvidence, buildEmbeddedGateAReport, buildPackage}`。
- semantic builder adapterのexact field順:
  `{buildCompilerInput}`。
- 全fieldは同期function一件で、引数は各builderのexact context、返値は上記required objectである。
- private production package adapterは、`buildGateAEvidence`を`presentation_segmenter_boundary_evidence_v001.mjs`の既存export `buildPresentationSegmenterBoundaryEvidenceV001`、残る二fieldを上記B1 package coreのexact named exportそのものへ束縛する。private production semantic adapterはB1 semantic coreのexact named exportそのものへ束縛する。wrapperで返値を補正・catch・cloneしない。例外捕捉、防御Buffer copy、required objectの運搬shape検査、正式serialize/hash付与、二pass制御はrunnerの共通呼出経路だけが担う。
- 合成検査adapterだけが、各methodのpass ordinalごとに`normal`, `thrown`, `invalid-return`, `input-mutated`, `alternate-valid-output`を固定できる。これはtest file内で作るplain objectでありproduction fileへscenario field・環境変数・global hookを置かない。`input-mutated`は受け取った最初のBuffer leafの先頭byteを一度反転してrequired objectを返す。Buffer leafがない`gate-a-evidence`と`embedded-gate-a-report`ではこのscenarioの指定自体をtest不成立にし、`inputByteCopies: []`を確認する。Buffer leafを持つ`package`と`compiler`の両stage・両passだけで`input-mutated`を必須検査する。`alternate-valid-output`はpass 2だけ運搬shape上有効だがpass 1と正式byteが異なる固定fixtureを返す。
- runnerはadapter methodを各stage/passにつき一度だけ呼び、直接builder exportを迂回呼出ししない。合成検査はspy call列、pass専用copyの非共有、元snapshot不変、失敗後の未呼出を確認する。さらにproduction runner sourceのprivate adapter各fieldが上記exact export参照であることと、CLIがprivate production adapterだけを渡すことを構文検査する。
- runner APIへ任意functionを渡せるのは合成検査のprocess内呼出だけであり、CLI/job/envからbuilder adapterを指定・選択できない。production CLIのjob path単一、注入口なしという契約は維持する。

checkerの`checks`は§16.3の固定名・順序・statusを持つ
`{name, status, violationCodes}`列、`violations`は§16.2/16.5の
`{code, path, details:{}}`
列である。`context-invalid` branchにchecks/violationsを付けない。report validatorのfalse branchにも自由理由や修正版reportを付けない。

runnerのtrusted `exitCode`はreportがpassedなら0、failedまたはabstainedなら1。`reportBytes`はreportの正式JSON byteと完全一致する。untrustedの`diagnostic`は§17.3の当該runner固定ASCII tokenで、LFを含まない。CLIへ渡す`argv`は`process.argv.slice(2)`そのもの、`streams`は
`{stdout, stderr}`
だけを持つfrozen objectで、各streamは同期`write(string)`一つだけを持つ。CLIは正式JSON文字列一件とLFを該当streamへ一度だけ書き、`process.exit`を呼ばずexit codeを返す。entry pointだけが返値を`process.exitCode`へ設定する。

### 4.2 共通snapshotとpure checker context

pure checkerは、事前計算された違反code配列や`passed` booleanを受け取らない。runnerが安定読取した原資料と、I/Oの観測事実だけを受け、違反codeをchecker自身が導く。

共通`stableFileSnapshot`は次のexact in-memory shapeとする。

`{path, bytes, fileSha256, pathLstatBeforeOpen, fdStatAfterOpen, fdStatAfterRead, pathResolutionObservation}`

- `bytes`: Node `Buffer`
- 三つのstatは全て
  `{kind, dev, ino, size, mtimeNs, nlink}`。
  `kind`は`regular-file`, `directory`, `symlink`, `other`、残る値は10進文字列。
- `pathResolutionObservation`:
  `{workspaceRootRealPath, lexicalWorkspaceRelativePath, targetRealPath, ancestors}`。
- `ancestors`はworkspace rootから対象fileの直近親までを順に並べた
  `{workspaceRelativePath, lstatKind, realPath}`
  のdense array。`lstatKind`は`directory`, `symlink`, `other`。

runnerはopen前lstat・open直後fstat・読込後fstatを別々に保存し、省略または二時点へ畳まない。pure checkerが三時点のkind、dev、ino、size、mtimeNs、nlinkの一致、対象がregular fileで`nlink === "1"`であること、ancestorにsymlinkがないこと、lexical path・各realpath・role別許可rootの整合を生観測から導く。`ancestorsSafe`や`sameFile`のような判定済みbooleanをcontextへ渡さない。

workspace外にあるNode実体だけは`externalExecutableSnapshot`を使う。

`{path, bytes, fileSha256, pathLstatBeforeOpen, fdStatAfterOpen, fdStatAfterRead, externalPathResolutionObservation}`

- pathは`process.execPath`の絶対path。
- 三statは`stableFileSnapshot`と同じshape。
- `externalPathResolutionObservation`は
  `{inputAbsolutePath, targetRealPath, ancestors}`。
- ancestorsはfilesystem rootから対象直近親までを順に並べた
  `{absolutePath, lstatKind, realPath}`
  のdense array。kind enumは共通shapeと同じ。

`nodeBinaryInput`は
`{role: "nodeBinary", status: "read", snapshot: externalExecutableSnapshot}`、
`{role: "nodeBinary", status: "observed-unsafe", snapshot: null, pathLstatBeforeOpen, externalPathResolutionObservation}`、
`{role: "nodeBinary", status: "missing", snapshot: null}`
のexact unionである。workspace相対path規則をNodeへ誤適用しない。checkerは絶対path、realpath、ancestor、三時点identity、regular/nlink、実byte hashをcode 7のために再計算する。

checkerへ渡す非job入力は`inputFileObservation`とし、次のexact unionだけを許す。

- 安定読取成功:
  `{role, path, status: "read", snapshot}`
- I/O前にlexical path規則違反を観測:
  `{role, path, status: "lexically-rejected", snapshot: null}`
- lstat/realpathを取得できたが、対象が非regular、直接symlink、ancestor symlink、hardlink、またはrole別root外:
  `{role, path, status: "observed-unsafe", snapshot: null, pathLstatBeforeOpen, pathResolutionObservation}`
- lstatが`ENOENT`を返した:
  `{role, path, status: "missing", snapshot: null}`

`lexically-rejected`はpath文字列そのものから安全述語不成立をcheckerが再計算する。`observed-unsafe`はstat・ancestor・realpathの生観測からcheckerが再計算する。`missing`はbound fileが存在せず期待hashと照合不能であることを表す。permission、`EIO`、途中close失敗など、上記へ分類できずbyteの有無を信頼できないI/O失敗はchecker contextへ変換せずCLI exit 2とする。

このunionは運搬形であり、code所有者はrole群で排他的に固定する。

- CLI引数jobの開始後再読込:
  path・missing・非regular・hash・identity差をcode 2だけへ帰属。
- B1 package/semanticの実装file:
  path・missing・非regular・hash・role不一致をcode 3だけへ帰属。
- Node実体:
  path・missing・非regular・hashとruntime値不一致をcode 7だけへ帰属。
- Gate A job・Gate A実装・Gate A入力:
  code 8。Gate A完了報告のpath/hash/内容はcode 9。
- packageの通常source入力とwidth policy入力:
  unsafeをcode 4、missing/hashをcode 5、読めたJSONのschema不成立をcode 6。
- semantic raw出力:
  unsafeをcode 4、missing/hashをcode 5、内容のstrict/schemaはcode 24〜26。
- semantic source package:
  §4.2の専用`sourcePackageObservation`からcode 13〜17。

同じ観測を一般入力codeと実装/runtime/Gate A/package固有codeへ二重帰属しない。

package checker contextのroot field順:

1. `contextPhase`
2. `job`: `{value, initialSnapshot, prePublicationInput, preReportInput}`
3. `gateA`: `{jobValue, jobInput, completionReportInput, implementationInputs, sourceInputs, legacyRecheck, legacyReadOnlyObservation, evidencePasses, embeddedReportPasses}`
4. `implementationInputs`
5. `widthPolicyInputs`
6. `builderInvocationProvenance`
7. `runtimeObservation`
8. `packageBuildPasses`
9. `buildFailure`
10. `readOnlyProcessObservation`
11. `publicationProcessObservation`
12. `productionMode`

固定:

- `contextPhase`は
  `gate-a-context-gate`, `evidence-gate`, `embedded-report-gate`, `core-gate`,
  `publication-gate`, `publication-staging-gate`, `publication-input-gate`,
  `publication-pre-rename-gate`, `final-report`
  の九値。package runnerは最初の四phaseをこの順で同じexport済みcheckerへ渡し、preflightは続けて`final-report`、formalは残る四つのpublication gateを実処理の節目で通ってから`final-report`へ進む。各呼出しはその時点までに得た生観測を持つ新しいcontextを作り、前回のcheck列や違反列を次回contextへ入力しない。
- `gate-a-context-gate`は先頭5 checkまで、`evidence-gate`は先頭7 checkまで、`embedded-report-gate`は先頭9 checkまで、`core-gate`は先頭15 checkまでを実行し、phaseより後ろのcheckを内部専用status `not_evaluated_in_phase`とする。各phaseで、まだ到達していないbuilder passesは`[]`、`buildFailure`はnull、後置観測は未着手shapeでなければcontext不成立である。各返値は次stageへ進む内部ゲートだけに使い、正式reportへ保存しない。formalの`job.prePublicationInput`と全modeの`job.preReportInput`は`null`、formalのpublication観測は全fieldが未着手でなければcontext不成立である。
- `publication-gate`はformalだけに許し、先頭15 checkを同じ内部導出関数で再計算したうえで`jobPrePublication`までを実行し、残る三checkを`not_evaluated_in_phase`とする。`job.prePublicationInput`は必ず観測済みunion、`job.preReportInput`は`null`、publication観測は全field未着手でなければならない。先頭15または`jobPrePublication`がfailedなら公開へ進まない。このphaseも正式reportへ保存しない。
- `publication-staging-gate`は、initialPaths・lock作成・work書込・staging再読込までの生観測を必須とし、inputRecheck以降を未着手に固定する。code 51〜53と当該段階のcode 55が成立すれば`publication` checkをfailedにし、なければ同checkを`not_evaluated_in_phase`のままにする。runnerは先行checkが全てpassedかつpublicationが`not_evaluated_in_phase`の場合だけinput recheckへ進む。
- `publication-input-gate`は、上記にinputRecheckの完了観測を加え、preRename以降を未着手に固定する。code 54または当該段階のcode 55が成立すればpublicationをfailed、なければ`not_evaluated_in_phase`としてpreRenameへ進む。
- `publication-pre-rename-gate`は、preRenameの四観測または固定I/O failure branchと、中間lock state `pre-rename-owned`または該当失敗stateを必須とし、rename以降を未着手に固定する。code 52/55/57が成立すればpublicationをfailedにしてrenameを禁止し、なければ`not_evaluated_in_phase`としてrenameを一度だけ許す。失敗後の安全なlock cleanupは、この判定後に§18.3の規則で行う。
- `final-report`だけがreport validatorへ渡せる。preflightでは`job.prePublicationInput`は常に`null`、formalでは先頭15がcore-gateでfailedだった場合だけ`null`を許し、先頭15がpassedだった場合は観測済みunionを必須とする。`job.preReportInput`は両modeで観測済みunionを必須とする。分類不能I/Oでこれらを作れない場合はtrusted reportを作らずexit 2とする。
- 九phaseともchecker本体は同じprivate `derivePackageCoreChecks`と同じprivate publication違反導出を一度だけ所有し、phaseが許す観測prefixだけをそこから導く。runner内にstaging/input/preRenameの合否ロジックを複製しない。合成検査は、同じ完成済みprefix観測を持つ隣接phase間で、既に実行済みcheckのname/status/violationCodes/violations投影がbyte同一であることを確認する。publication中間gateでfailedになったcode/pathは、同じ生観測を持つ`final-report`でも完全一致しなければならない。
- snapshot配列は各schemaのrole順。
- `job.initialSnapshot`はCLI引数jobの開始時安定読込で、coreの`jobBinding`はこの値のstrict/schema/path/hashだけを検査する。`prePublicationInput`はformalだけがcore 15 check完了後・publication着手前に得る`inputFileObservation`でrole `job`・pathはCLI引数と完全一致し、preflightでは`null`。`preReportInput`は両modeがtrusted report構築直前に得る同じrole/pathの`inputFileObservation`。後二回でpermission・`EIO`等により観測自体を信頼できなければexit 2、missing・unsafe・read後のidentity/hash差はcode 2の生事実として保持する。formalの`jobPrePublication`はinitial対prePublication、両modeの`jobStability`はinitial対preReportをそれぞれ独立に検査し、同じ不一致を`jobBinding`へ帰属しない。
- 全`*Inputs`は§4.2の`inputFileObservation`列である。packageの`implementationInputs`は`packageCore`, `packageRunner`, `rendererTrustImplementation`の順、`widthPolicyInputs`は§6.1の六role順。Gate Aのimplementation/source列はGate A jobの既存固定role順。semanticの`implementationInputs`はdirect三件
  `packageCore`, `semanticCore`, `semanticRunner`
  にdependency四件
  `textLayoutImplementation`, `gateACore`, `gateARetainedSourceAtomsCore`, `gateARunner`
  を続けた七件の順とする。Gate A三件はpackage coreの推移importを実byte hashで束縛するためであり、semantic jobで再生成・再解釈しない。
- `gateA.jobValue`は`jobInput.status === "read"`かつstrict decode成立時だけその値、unsafe/missing/schema不成立時は`null`。null時は`gateAContext`のcode 8を出し、それ以降を`not_run_with_upstream_failure`とする。完了報告側の不成立は`gateAReport`のcode 9へ限定する。入力が読めないのに値を推測しない。
- `gateA.legacyRecheck`は
  `{jobInput, implementationInputs, sourceInputs}`
  のexact objectである。各値は初回読取とは別に、Gate A job、実装3件、入力3件の順で実施した二度目の`inputFileObservation`である。Gate A既存checkerへ必要な`secondFileSha256`を初回hashの複写で捏造しない。分類不能I/Oはexit 2、missing/unsafe/identity差/hash差はcode 8として停止する。
- `gateA.legacyReadOnlyObservation`は
  `{formalOutputPath, watchedAncestorPath, beforeFormalPathState, afterFormalPathState, beforeEntries, afterEntries}`
  のexact objectである。二stateは`absent`, `present`, `inspection_failed`、entriesはstateが`inspection_failed`ならnull、それ以外は既存Gate A規則の`{name, type}`列をUTF-16順に持つ。package runnerは初回Gate A入力読取後にbefore、legacy recheck後にafterを実測し、その後に初回`gate-a-context-gate`を呼ぶ。これにより、初回phaseからlegacy写像の全生観測が揃い、後phaseで既実行prefixの判定材料を差し替えない。
- buildと検査は次の固定順で交互に行う。`gate-a-context-gate`で`gateAContext`まで合格→`gate-a-evidence` pass 1→2→`evidence-gate`で`evidenceBuild`/`evidenceDeterminism`まで合格→`embedded-gate-a-report` pass 1→2→`embedded-report-gate`で`embeddedReportBuild`/`gateAReport`まで合格→`package` pass 1→2→`core-gate`で`packageBuild`以降を含む先頭15まで判定。各phaseで新たに実行したcheckがfailedなら、その後のbuilderを呼ばない。最初の例外またはrequired object不成立でも同stageの残りpassと後続stageを呼ばない。
- `gateAContext`までにfailedとなった場合だけ、三つのpasses列は全て空配列、`buildFailure`は`null`とする。後段stageでfailedとなった場合は、完了済みの先行passesを保持し、未到達の後続passesだけを空配列にする。空配列をbuild成功と扱わず、対応するbuild checkを`not_run_with_upstream_failure`とする。
- 各stageのpasses shapeは次へ固定する。未到達stageは`[]`。pass 1失敗は`[null, null]`、pass 2失敗は`[<pass 1成功object>, null]`、二度成功は成功object二件である。先行stage失敗後の後続stageは必ず`[]`とし、失敗後に検査材料を増やさない。
- `evidencePasses`の成功要素は
  `{value, bytes, fileSha256, canonicalSha256, inputByteCopies}`。
- `embeddedReportPasses`の成功要素も同じshapeだが、実byteは§5.3の一file例外serializerを使う。
- `packageBuildPasses`の成功要素は`{artifacts, inputByteCopies}`。
  `artifacts`は0件以上のdense arrayで、各要素は
  `{fileName, value, bytes, fileSha256, canonicalSha256}`。
  `fileName`はUnicode scalar value列のstring、`value`は§5.2を満たすstrict in-memory JSON値、`bytes`はBuffer、二hashは64桁lowercase hexとする。context validatorは件数・名前集合・順序を固定7件へ先に狭めない。pure checkerが欠落・追加・改名・重複・順序を固定7 file集合と照合し、code 13へ帰属する。
- buildが例外またはrequired objectを返せなかった場合だけ、該当passを`null`にして
  `buildFailure`を
  `{stage, passOrdinal, kind, inputByteCopies}`
  とする。`stage`は`gate-a-evidence`, `embedded-gate-a-report`, `package`、`passOrdinal`は1または2、`kind`は`input-mutated`, `thrown`, `invalid-return`。複数成立時の優先順もこの列順とする。
  それ以外は`buildFailure: null`。
- `evidenceDeterminism`がfailedなら`embeddedReportPasses`と`packageBuildPasses`は`[]`、`gateAReport`がfailedなら`packageBuildPasses`は`[]`に固定する。`gateAReport`は、embedded report二passの正式byte不一致をcode 49、pass 1を既存validatorが拒否した場合をcode 9、有効reportがpassedでない場合をcode 10へ順に帰属する。二pass一致後に使う正式値は、境界証拠・embedded report・package artifactsの全段で常にpass 1とし、結果を見てpass 2へ選び替えない。
- `runtimeObservation`:
  `{nodeBinaryInput, nodeVersion, icuVersion, resolvedLocale, resolvedGranularity, diagnostics}`。nodeBinaryInputは上記専用unionである。diagnosticsのexact shapeは
  `{resolvedNodePath, platform, arch, v8Version, unicodeVersion, cldrVersion}`
  で、全値は非空文字列、`resolvedNodePath`は`process.execPath`をrealpathした絶対pathでなければならない。この絶対pathはchecker/legacy Gate A context内だけに保持し、B1 manifest/reportへは§11のsafe projectionだけを出す。
- `productionMode`: `read-only-preflight`または`formal-generation`。

`builderInvocationProvenance`は
`{passes}`
である。`passes`はpackage builder未到達なら`[]`、package pass 1を試みた時点で一件、pass 2も試みた時点で二件となり、各要素は
`{passOrdinal, providedEntries, accessedEntries}`
をこの順で持つ。`passOrdinal`は配列位置と同じ1または2。各entryは
`{role, path}`
で、列は呼出順を保持する。roleはUnicode scalar value列、pathはworkspace相対pathまたは`null`。package pass 1失敗では一件、pass 2失敗または二度成功では二件とし、`packageBuildPasses`と`buildFailure`のstage/passOrdinalからattempted pass数を一意に再計算できなければcontext不成立でexit 2とする。

runnerはpackage builderへ渡す同一のexact contextを、passごとに新しいprovenance記録用read-only Proxyで包み、root field・配列要素role・binding pathの提供と実accessを記録する。builderへ生contextや別passのProxyを併渡ししない。二passの`providedEntries`は同一列でなければならず、二passとも返却まで到達した場合は`accessedEntries`も同一列でなければならない。pass 2を呼ばなかった場合にpass 2の空記録を捏造しない。

runtimeはworkspace file列と別扱いにする。root `runtimeObservation`の参照は`{role: "runtimeObservation", path: null}`、そのNode実体bindingの参照は`{role: "runtimeObservation.nodeBinary", path: null}`と記録する。外部Node絶対pathをprovenanceのpathへ複写せず、実path・hash・runtime値の照合は専用`runtimeObservation`とcode 7が担う。workspace内bindingだけがworkspace相対pathを持つ。

各passの`providedEntries`は、次の19件をこの順で必ず持つ。

1. `job`
2. `gateA.job`
3. `gateA.completionReport`
4. `gateA.evidence`
5. `gateA.embeddedReport`
6. `implementation.packageCore`
7. `implementation.packageRunner`
8. `implementation.rendererTrustImplementation`
9. `source.sourceAtoms`
10. `source.sourceGenerationManifest`
11. `source.sourceValidationReport`
12. `width.presetRegistry`
13. `width.presetValidationIndex`
14. `width.materialValidationIndex`
15. `width.registryBinding`
16. `width.rendererTrust`
17. `width.textLayoutImplementation`
18. `runtimeObservation`
19. `runtimeObservation.nodeBinary`

`job`、Gate A job/completion report、implementation、source、widthのpathは、対応する安定読込snapshotのworkspace相対pathをexact copyする。`gateA.evidence`と`gateA.embeddedReport`はメモリ内pass 1値なのでpathはnull。runtime二件もpathはnullである。この19件以外のrole、順序違い、重複、path差はcode 21とする。

Proxyの記録単位は上記19 branchである。rootの`job`配下、`gateA`の四branch、三つのsnapshot配列の各要素、runtimeの通常field群と`nodeBinaryInput`へ、作成時に一つのbranch tagを付ける。次のtrapがtag付きbranchの値を初めて成功裏に露出した時だけ、そのentryを`accessedEntries`末尾へ追加する。

- `get`
- `has`
- `ownKeys`
- `getOwnPropertyDescriptor`

同一entryの二回目以降のtrapは追記しない。順序は最初の成功trap順であり、後からprovided順へsortしない。配列・objectの`ownKeys`または列挙で複数の直下tagを同時に露出する場合は、上記provided順で未記録entryを連続追加する。rootからcomposite proxyを取得しただけでは子entryを記録せず、子のfield・index・列挙へ触れた時に記録する。`set`, `defineProperty`, `deleteProperty`, `setPrototypeOf`, `preventExtensions`は直ちにthrowし、build failureとして扱う。tagなしobject、生snapshot、開始snapshotが所有する生Bufferへの参照を別経路で渡さない。

Node `Buffer`はfreezeできず、通常のProxyではTypedArrayの内部slotを安全に隠せない。このため、`gate-a-evidence`, `embedded-gate-a-report`, `package`, `compiler`の**全builder attempt**について、runnerはcontext内の全Buffer leafをschema field順・配列順の深さ優先で列挙し、pass専用の`Buffer.from(originalBytes)`へ置換してからbuilderへ渡す。元Bufferをbuilderへ渡さず、pass間でcopyを共有しない。各attemptの`inputByteCopies`は同じ列順の
`{path, beforeSha256, afterSha256, unchanged}`
で、pathはbuilder contextをroot `$`とする実在Buffer leafのJSONPath、二hashはcopyの呼出直前・呼出終了またはthrow捕捉直後の実byteSHA-256、`unchanged`は二hash完全一致から再計算する。Buffer leafが0件なら空配列を許すが、実際のcontextと件数・pathが一致しなければcontext不成立でexit 2とする。一件でも変化したattemptは返値やthrowの有無にかかわらず`kind: "input-mutated"`のbuild failureとし、当該passを`null`、残るpassと後続stageを未実行にする。検査はpackage/semanticの両系統で、全stageのpass 1/pass 2に対する防御copy、pass間非共有、元snapshot不変、変異時停止を確認する。copyを一時的に変更して元へ戻すbuilder内部挙動までは動的に証明せず、固定実装hashと独立監査を信頼境界とする。

context validatorはpass数・ordinal・entry shapeだけを検査し、role allowlistへ先に狭めない。pure checkerが各passを個別に§4.5の許可field/role/path集合、実際のbuilder context、漏洩reportのsourceBindingsと照合する。許可外role、未記録access、記録と実contextの不一致、一方のpassだけの許可外access、成功二passのaccess列不一致はcode 21とする。この生観測により、allowlist外をcontext validatorで先に落としてcode 21を到達不能にしない。

このprovenanceが証明する範囲は、**runnerが注入したexact context経由の由来**に限る。security sandboxではない。builderまたはそのimport graphが`fs`、network、`process.env`、時刻、乱数、global経由で外部情報へ直接触れる悪意・実装bugは動的証明の対象外であり、source-onlyという語はsandbox隔離を意味しない。B1のdirect実装fileはjobの`implementationBinding.files`、実行する文字幅実装は`widthPolicyBindings`とsemantic jobの`dependencyFiles`で実byte hashを固定し、これらの変更はB1契約の再承認を要する。

- package core: `node:crypto`
- semantic core: builtin importなし
- package/semantic runner: `node:crypto`, `node:fs`, `node:fs/promises`, `node:path`, `node:url`, `node:process`
- text-layout: builtin importなし
- Gate A core: `node:crypto`, `node:path`, `node:url`
- Gate A retained source core: `node:crypto`
- Gate A runner: `node:crypto`, `node:fs`, `node:fs/promises`, `node:path`, `node:url`

local importの許可辺はB2で静的検査し、次のexact集合だけとする。

- `packageCore -> textLayoutImplementation`
- `packageCore -> gateA.implementation.core`（既存`checkPresentationSegmenterBoundaryPreflightV001`と`PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001`だけをnamed import）
- `packageCore -> gateA.implementation.runner`（既存`validatePresentationSegmenterBoundaryPreflightReportV001`だけをnamed import）
- `packageRunner -> packageCore`
- `packageRunner -> gateA.implementation.core`（既存`buildPresentationSegmenterBoundaryEvidenceV001`だけをnamed import）
- `gateA.implementation.runner -> gateA.implementation.core`
- `gateA.implementation.core -> gateA.implementation.retainedSourceAtomsCore`
- `semanticCore -> packageCore`
- `semanticRunner -> packageCore`
- `semanticRunner -> semanticCore`

静的検査はB1新規四実装fileと、実際にmodule評価される`textLayoutImplementation`・Gate A三fileの計八fileを再帰走査し、上記辺とbuiltin allowlistの完全一致を確認する。既存Gate A subgraphをB1新規fileだけの走査境界の外へ暗黙除外しない。semantic processは`semanticCore -> packageCore`によりGate A三fileもmodule評価するため、semantic jobのdependency四件へその実byte hashを固定する。

`rendererTrustImplementation`は人間認定済みtrustの来歴を束縛する**参照file**であり、B1 processではimport・dynamic import・実行を一切しない。B1に必要な値は、安定読取したtrust/registry/index/bindingのstrict JSONとhash鎖から検査し、幅計算だけを副作用のない`textLayoutImplementation`で行う。これにより、renderer trustの既存import graphがmodule評価時に話者台帳を読む副作用をB1へ持ち込まない。上記以外のlocal import、dynamic import、`require`、module-load時file読取を拒否する。Node builtinは上記allowlistだけを許す。これは列挙したimport graphとcode reviewを信頼根にするもので、任意のJavaScript実行を隔離したという主張ではない。


semantic checker contextのroot field順:

1. `contextPhase`
2. `job`: `{value, initialSnapshot, preReportInput}`
3. `implementationInputs`
4. `sourcePackageObservation`
5. `rawSemanticOutputInput`
6. `runtimeObservation`
7. `compilerBuildPasses`
8. `buildFailure`
9. `readOnlyProcessObservation`

固定:

- `contextPhase`は`semantic-output-gate`, `final-report`の二値。`semantic-output-gate`は先頭6 checkだけを実行し、compiler四checkとreadOnly/jobStabilityを内部専用status `not_evaluated_in_phase`にする。valid abstainedでもこの中間phaseでは四checkを適用なしへ先取りせず、final-reportでだけ`not_applicable_by_abstention`へ確定する。compiler passesは`[]`、buildFailureはnull、readOnly観測は未着手shapeでなければ中間context不成立である。runnerは先頭6がpassedかつcompleteの場合だけcompiler builderへ進み、invalid/abstainedでは呼ばない。`final-report`は全生観測を持ち、report validatorへ渡せる唯一のphaseである。二phaseは同じprivate導出関数を使い、先頭6の同等ロジックを複製しない。
- `job.preReportInput`はtrusted report直前に再取得したrole `job`の`inputFileObservation`。観測不能I/Oはexit 2、missing・unsafe・read後のidentity/hash差はcode 2へ帰属する。
- `sourcePackageObservation`は
  `{directoryEntries, artifactReads}`。
  `directoryEntries`はsource package root直下の全entryをnameのUTF-16順へ並べた0件以上の
  `{name, kind}`で、`kind`は`file`, `directory`, `symlink`, `other`。
  `artifactReads`は§7.1の固定7 file名・固定順に対する§4.4と同じraw read-result unionである。余分なfileはdirectoryEntries、欠落・非regular・hardlink・読取結果はartifactReadsからpure checkerが導く。context validatorは「ちょうど7件」を前提にしない。
  semantic runnerではdirectory列取得不能またはartifact readの`io-error`はtrusted reportへ変換せずexit 2、`missing`/`non-regular`とread snapshotの不一致はcode 13〜17へ帰属する。
- `compilerBuildPasses`は、valid completeでbuildを開始した場合、pass 1→2の固定順でfail-fast実行する。pass 1失敗は`[null, null]`、pass 2失敗は`[<pass 1成功object>, null]`、二度成功は
  `{value, bytes, fileSha256, canonicalSha256, inputByteCopies}`二件である。失敗後のpassを呼ばない。
- 二pass一致後の正式compiler inputは常にpass 1とし、結果を見てpass 2へ選び替えない。
- raw意味出力がvalid complete以外、すなわちvalid abstained、strict JSON不成立、schema不成立、候補外ID、順序違反等の場合は、compilerを呼ばず`compilerBuildPasses: []`, `buildFailure: null`とする。checkerがraw byteを判定し、abstainedならbuildを含む四checkを`not_applicable_by_abstention`、invalidならcompiler四checkを`not_run_with_upstream_failure`へ分ける。`readOnlyCheck`と`jobStability`はcompiler成否から独立し、固定入力role列を取得できる限り実行する。source package/raw出力をmissing/unsafeとして観測できてもrole列は完成したものとし、分類不能I/Oで列自体を作れない場合だけ`readOnlyCheck`を`not_run_with_upstream_failure`にする。
- completeでbuild例外、required object不成立、またはpass専用Buffer copy変異があった場合だけ、該当passを`null`にし、
  `buildFailure`を`{stage: "compiler", passOrdinal, kind, inputByteCopies}`とする。kindと優先順はpackage側と同じである。
- raw意味出力のstrict decode・schema・候補写像は、snapshotの`bytes`からsemantic checker自身が行う。

checker context validatorは、上記root field、配列順、snapshot shape、pass件数をexact検査する。context自体が不成立ならtrusted reportを作らずCLI exit 2とする。context値から導くcodeとcheckの対応は§16.2だけを正本とする。

`readOnlyProcessObservation`は次のexact unionである。

- package formal（全phase）:
  `{mode: "not-requested"}`
- package preflightの中間phase / semanticの`semantic-output-gate`:
  `{mode: "not-attempted"}`
- package preflight / semanticの`final-report`:
  `{mode: "observed", beforeEntries, afterEntries, inputReread, attemptedWriteCalls}`

`not-attempted`は中間phaseだけに許し、正式reportへ保存しない。runnerが開始時に取得済みの`beforeEntries`を隠して捨てる意味ではなく、前後一組が揃う前に未完成観測をcheckerへ部分入力しないためのbranchである。`final-report`では`observed`以外をcontext不成立とする。

`beforeEntries`, `afterEntries`は、§18.2の除外後treeをworkspace相対pathのUTF-16順へ並べた
`{path, kind, contentSha256}`
配列そのもの。directoryだけ`contentSha256: null`、file/symlinkは64桁lowercase hex。`attemptedWriteCalls`はadapter method名の配列で、正しい実行では空である。checkerは二配列からcanonical hashを自分で再計算し、jobの期待値、before/after一致、write call 0件を判定する。

`inputReread`は次のexact unionである。

- 全ての非job入力を二度安定読取できた場合:
  `{status: "completed", initialInputs, finalInputs}`
- 上流の入力集合不成立により固定列を完成できず、後段再読取を行わない場合:
  `{status: "not-run-with-upstream-failure", initialInputs: null, finalInputs: null}`

`initialInputs`, `finalInputs`は同じ固定role順の
`{role, observation}`
配列である。jobはrootの`job.initialSnapshot`と`job.preReportInput`で独立比較するため、この列へ重複掲載しない。`nodeBinary` roleだけobservationを`nodeBinaryInput`、他roleを`inputFileObservation`とする。初回のreadが最終時にmissing/unsafeへ変わった場合も`completed`のまま生事実を保存し、code 50へ帰属できる。分類不能I/Oだけはtrusted reportを作れずexit 2とする。

- package preflight:
  `gateAJob`, `gateACompletionReport`, Gate A実装3 role、Gate A入力3 role、B1実装3 role、width policy 6 role、`nodeBinary`
- semantic:
  B1 direct実装3 role・dependency 4 role、source package固定7 file role、`rawSemanticOutput`, `nodeBinary`

`completed`では二列のrole集合・件数・順序を完全一致させ、各observationのbranch、安全性、三時点stat・実byte hashをpure checkerが比較する。上流不成立前に読めたものだけを部分配列で渡すことは禁止する。`not-run-with-upstream-failure`は、job schema不成立等で固定role列自体を構成できない先行checkがfailedになった場合だけ許し、それ以外で使えばcontext不成立とする。

監視treeの開始前または終了後を完全に読み取れないI/O失敗では、このprocess observationを作れないためtrusted failed reportへ推測変換せずCLI exit 2とする。配列を完全取得でき、内容だけが違う場合は
`READ_ONLY_CONTRACT_VIOLATED`
のtrusted exit 1とする。run reportの`readOnlyObservation`は、before/after配列から再計算した
`{status, beforeCanonicalSha256, afterCanonicalSha256, unchanged}`
へ決定的に写す。`inputReread.completed`ならstatus `verified`、上流失敗branchならstatus `not-run-with-upstream-failure`とし、後者のunchangedはnullである。package formalはreport側も`null`。

### 4.3 filesystem adapterのexact契約

両production runnerはworkspace rootをcwd、環境変数、job、CLI引数から受け取らない。各runner自身の`import.meta.url`に対して
`fileURLToPath(new URL("../../", import.meta.url))`
を適用し、そのdirectoryをadapterの`realpath`で一度解決した値だけをworkspace rootとする。runner実装file自身のrealpathが、そのroot直下の§4固定pathと一致しなければuntrusted exit 2とする。CLIのjob pathと全artifact pathはPOSIX workspace相対文字列だけを許し、このrootへ結合してからopenする。process cwdは診断にも合否にも使わず、test adapterも同じworkspace相対pathを同じanchorへ解決する。別rootを渡す引数・環境変数・fallback探索を置かない。

package production adapterは、次のmethodだけを持つfrozen plain objectとする。

1. `openReadOnly(path)`:
   `O_RDONLY | O_NOFOLLOW`で開き、`statBigInt()`, `readAllBytes()`, `close()`を持つhandleを返す。
2. `openWriteExclusive(path)`:
   `O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW`, mode `0o600`で開き、`writeAllBytes(bytes)`, `sync()`, `statBigInt()`, `close()`を持つhandleを返す。
3. `openDirectoryReadOnly(path)`:
   `O_RDONLY | O_DIRECTORY | O_NOFOLLOW`で開き、`sync()`, `statBigInt()`, `close()`を持つhandleを返す。
4. `lstatBigInt(path)`
5. `realpath(path)`
6. `readdirWithTypes(path)`
7. `readlink(path)`
8. `mkdirExclusive(path)`:
   recursiveなしで一directoryを作る。既存なら失敗。
9. `mkdir(path)`:
   recursiveなしで一directoryを作る。既存なら失敗。
10. `rename(from, to)`
11. `removeEmptyDirectory(path)`

semantic production adapterは、上記のうち
`openReadOnly`, `lstatBigInt`, `realpath`, `readdirWithTypes`, `readlink`
だけを同じsignatureで持つ。

adapter methodが返すstatsはNodeのbigint Stats、directory entryは
`{name, kind}`
へrunnerが直ちに写し、`kind`を`file`, `directory`, `symlink`, `other`のいずれかへ固定する。test adapterも同じhandleと返却shapeを実装する。

正式packageを作るproduction runnerだけが書込みmethodを呼べる。preflightとsemantic runnerで書込みmethodが呼ばれたら、test adapterは直ちに例外にし、production側はそもそも当該methodを持たない。

package factoryは、jobを読む前にmodeが分からないため上記11 methodを持つraw adapterを一つ作る。package runnerはjob schema検査後、次のexact facadeを作って以後の処理へ渡す。

- `read-only-preflight`:
  raw adapterから
  `openReadOnly`, `lstatBigInt`, `realpath`, `readdirWithTypes`, `readlink`
  だけを同名で写したfrozen plain object。
- `formal-generation`:
  11 method全てを同名で写したfrozen plain object。

preflightのgenerator、checker、監視処理へraw adapter参照を渡さず、read-only facadeだけを渡す。production CLIにfacade種別を選ばせる引数は置かない。合成検査は、preflight実行中にwrite method lookupが`undefined`であることと、raw test adapterのwrite call logが空であることを両方確認する。

### 4.4 publication観測と決定的な失敗注入点

checker context内の`publicationProcessObservation`は次のexact unionである。§12.1のrun reportへ保存する要約field
`publicationObservation`
とは別物であり、同じobjectを流用しない。

- preflight:
  `{mode: "not-requested"}`
- formal:
  `{mode, initialPaths, lock, staging, inputRecheck, preRename, rename, parentDirectoryDurability, published}`

formalの各field:

- `mode`: `"formal"`
- `initialPaths`:
  `{status, entries, failurePoint}`のunion。
  - 上流15 checkまたは`jobPrePublication`不合格でpublication未着手: `{status: "not-attempted", entries: null, failurePoint: null}`。
  - 成功時: `{status: "observed", entries, failurePoint: null}`。entriesは`formalRoot`, `lockPath`, `workPath`順の`{role, path, state, identity}`。stateは`absent`または`present`、present時identityは`{kind, dev, ino}`、absent時null。`kind`は`regular-file`, `directory`, `symlink`, `other`、dev/inoは10進文字列。
  - I/O失敗時: `{status: "io-error", entries: null, failurePoint}`。
- `lock`:
  次の段階別exact discriminated unionだけを許す。identityは
  `{kind, dev, ino}`、kindは`directory`, `symlink`, `other`、dev/inoは10進文字列。
  - 未着手:
    `{state: "not-attempted", identityAfterCreate: null, identityAtLastOwnershipCheck: null, failurePoint: null}`
  - 排他作成時に既存:
    `{state: "create-exists", identityAfterCreate: null, identityAtLastOwnershipCheck: null, failurePoint: null}`
  - 排他作成I/O失敗:
    `{state: "create-io-error", identityAfterCreate: null, identityAtLastOwnershipCheck: null, failurePoint: "lock-create"}`
  - 作成直後stat I/O失敗:
    `{state: "post-create-stat-io-error", identityAfterCreate: null, identityAtLastOwnershipCheck: null, failurePoint: "lock-stat-after-create"}`
  - 作成直後にdirectoryでないidentityを観測:
    `{state: "post-create-identity-invalid", identityAfterCreate, identityAtLastOwnershipCheck: null, failurePoint: null}`。identityAfterCreate.kindは`symlink`または`other`。
  - 作成直後のvalidなdirectory identityを保持中（staging/input再照合までの中間phase専用）:
    `{state: "held", identityAfterCreate, identityAtLastOwnershipCheck: null, failurePoint: null}`。identityAfterCreate.kindは`directory`。
  - rename直前に同一identityを再確認済み（pre-rename中間phase専用）:
    `{state: "pre-rename-owned", identityAfterCreate, identityAtLastOwnershipCheck, failurePoint: null}`。二identityはともkind `directory`でdev/ino完全一致。
  - rename直前のlock statがI/O失敗:
    `{state: "pre-rename-stat-io-error", identityAfterCreate, identityAtLastOwnershipCheck: null, failurePoint: "pre-rename-lock-stat"}`。identityAfterCreate.kindは`directory`。所有継続を証明できないためcleanupしない。
  - rename直前のkind/dev/inoが作成直後と不一致:
    `{state: "pre-rename-identity-mismatch", identityAfterCreate, identityAtLastOwnershipCheck, failurePoint: null}`。identityAfterCreate.kindは`directory`で、二identityのkind/dev/inoは一つ以上異なる。このbranchではrenameもcleanupも試みない。
  - 削除直前stat I/O失敗:
    `{state: "pre-release-stat-io-error", identityAfterCreate, identityAtLastOwnershipCheck: null, failurePoint: "lock-stat-before-release"}`。identityAfterCreate.kindは`directory`。
  - 削除直前のkind/dev/ino不一致:
    `{state: "identity-mismatch", identityAfterCreate, identityAtLastOwnershipCheck, failurePoint: null}`。identityAfterCreate.kindは`directory`で、二identityのkind/dev/inoは一つ以上異なる。このbranchでは削除を試みない。
  - 同一identityを確認して削除成功:
    `{state: "released", identityAfterCreate, identityAtLastOwnershipCheck, failurePoint: null}`。二identityはともkind `directory`でdev/ino完全一致。
  - 同一identityを確認したが削除I/O失敗:
    `{state: "release-io-error", identityAfterCreate, identityAtLastOwnershipCheck, failurePoint: "lock-release"}`。二identityはともkind `directory`でdev/ino完全一致。
  `identityAtLastOwnershipCheck`は、`pre-rename-owned`と`pre-rename-identity-mismatch`ではrename直前、通常のfinal branchでは削除直前に最後に観測したidentityを指す。`held`と`pre-rename-owned`は該当する中間publication phaseだけに許し、`final-report`では拒否する。上記以外の組合せ、たとえば`create-exists`後のrelease、identity未取得でのrelease、identity不一致後の削除成功をcontext schemaが拒否する。checkerはbranchとraw identityを再照合し、排他失敗・identity異常をcode 52、純粋I/O失敗をcode 55へ帰属する。
- `staging`:
  `{status, directoryEntries, artifactReads, failurePoint}`のunion。
  - `not-attempted`: 残る三fieldはnull。
  - `observed`: `directoryEntries`はwork直下の全entryをnameのUTF-16順へ並べた`{name, kind}`、`artifactReads`は固定7 file順のraw read-result、failurePointはnull。
  - `io-error`: directoryEntriesとartifactReadsはnull、failurePointは固定操作名。
  missing、extra、subdirectory、symlink、hardlink、hash不一致は`observed`の生事実からcheckerが判定する。runnerが`valid` booleanを作らない。
- `inputRecheck`:
  `{status, observations, failurePoint}`のunion。
  - `not-attempted`: observations/failurePointはnull。
  - `observed`: observationsは§18.1の2〜8、すなわちB1 job以外を固定順に再読込した`{role, observation}`列、failurePointはnull。`nodeBinary`だけは`nodeBinaryInput`、他は`inputFileObservation`のexact unionを使う。初回後のmissing、symlink/非regular/hardlink化、root外化をsnapshot欠落やI/Oへ畳まず、このunionの生事実として保持する。
  - `io-error`: observationsはnull、failurePointは固定操作名。
  checkerが開始observation列と再読込列のpath、安全性、identity、実byte hashからsame/changedを導く。
- `preRename`:
  `{state, lockIdentity, formalRoot, sourceParentIdentity, targetParentIdentity, failurePoint}`のexact union。
  `lockIdentity`と二parent identityは`{kind, dev, ino}`、kindは`directory`, `symlink`, `other`、dev/inoは10進文字列。`formalRoot`は`{state, identity}`で、state `absent`ならidentityはnull、state `present`ならidentityは同じidentity shapeとする。
  - 未着手:
    `{state: "not-attempted", lockIdentity: null, formalRoot: null, sourceParentIdentity: null, targetParentIdentity: null, failurePoint: null}`。
  - lockだけを観測して停止:
    `{state: "lock-observed", lockIdentity, formalRoot: null, sourceParentIdentity: null, targetParentIdentity: null, failurePoint: null}`。lockIdentityが`lock.identityAfterCreate`とkind/dev/inoの一つ以上で不一致の場合だけ許す。
  - lock一致後、formal rootを観測して停止:
    `{state: "root-observed", lockIdentity, formalRoot, sourceParentIdentity: null, targetParentIdentity: null, failurePoint: null}`。formalRoot.stateは`present`だけを許す。
  - 四観測を完了:
    `{state: "parents-observed", lockIdentity, formalRoot, sourceParentIdentity, targetParentIdentity, failurePoint: null}`。formalRoot.stateは`absent`だけを許す。二parentのkind/devとlock一致はcheckerが生値から判定する。
  - I/O失敗:
    `{state: "io-error", lockIdentity, formalRoot, sourceParentIdentity, targetParentIdentity, failurePoint}`。
    failurePoint別のnull/non-nullは次へ固定する。
    - `pre-rename-lock-stat`: 残る四観測は全てnull。
    - `pre-rename-root-check`: lockIdentityだけ非null。
    - `pre-rename-source-parent-stat`: lockIdentityと`formalRoot: {state: "absent", identity: null}`だけ非null。
    - `pre-rename-target-parent-stat`: 上記にsourceParentIdentityを加え、targetParentIdentityだけnull。
  `lock-observed`は`lock.state: "pre-rename-identity-mismatch"`かつ同じlast identity、`io-error`の`pre-rename-lock-stat`は`lock.state: "pre-rename-stat-io-error"`と完全一致させる。`root-observed`、`parents-observed`、lock確認後のI/O失敗では、後続の安全なcleanup結果を最終`lock` branchへ残す。runnerが`preRename`をvalid booleanへ畳まず、checkerがraw identity・存在状態・deviceから合否を導く。
- `rename`:
  `{status, failurePoint}`。
  statusは`not-attempted`, `succeeded`, `io-error`。`succeeded`と`not-attempted`ではfailurePointはnull、`io-error`では`"rename"`。parent deviceは`preRename`の生観測だけを正本とし、rename結果へ重複転記しない。
- `parentDirectoryDurability`:
  `{open, sync, stat, close}`のexact object。各operationは固定順で次のshapeを持つ。
  - `open`, `sync`, `close`: `{status, failurePoint}`。statusは`not-attempted`, `succeeded`, `io-error`。成功・未着手ではfailurePointはnull、失敗時はそれぞれ`parent-directory-open`, `parent-directory-sync`, `parent-directory-close`。
  - `stat`: `{status, identity, failurePoint}`。statusは同じ三値。成功時identityは`{kind, dev, ino}`かつfailurePointはnull、未着手時identity/failurePointはnull、失敗時identityはnullかつfailurePointは`parent-directory-stat`。
  - rename未成功なら四operationは全て`not-attempted`。rename成功時はopenを試み、open失敗なら残る三つは未着手。open成功後はsync、sync成功後だけstatを試みる。openに成功した場合はsync/statの成否にかかわらず最後にcloseを一度試みる。sync失敗ならstatは未着手、closeは実行する。stat失敗でもcloseは実行する。closeを含む複数I/O失敗を一つへ隠さず、各operationの生statusへ残す。四つ全てがsucceededの場合だけpublished読取へ進む。
- `published`:
  stagingと同じ
  `{status, directoryEntries, artifactReads, failurePoint}`
  unionを使い、rootは公開後`R`とする。

`artifactReads`の各要素は
`{fileName, status, snapshot, observedKind, failurePoint}`
のexact unionで、fileNameは§7.1の固定名・固定順である。

- `read`:
  snapshotは§4.2の`stableFileSnapshot`、observedKindは`regular-file`、failurePointはnull。`nlink != 1`もこの形で保持し、checkerが53/56へ帰属する。
- `missing`:
  snapshot/observedKind/failurePointはnull。53/56へ帰属する。
- `non-regular`:
  snapshotはnull、observedKindは`directory`, `symlink`, `other`のいずれか、failurePointはnull。53/56へ帰属する。
- `io-error`:
  snapshot/observedKindはnull、failurePointは該当`artifact-NN-open`または`artifact-NN-read`。上記の欠落・型不正と区別し、`PUBLICATION_FAILED`へ帰属する。

directory entry集合自体を取得できない場合は、上位statusを`io-error`とする。required fileのmissing/non-regularをI/O失敗へ読み替えない。

`failurePoint`の許可値は
`initial-paths`, `lock-create`, `lock-stat-after-create`, `work-create`,
`artifact-01-open`から`artifact-07-read`までの各fileに対する`open/write/sync/stat/close/read`,
`work-directory-open`, `work-directory-sync`, `work-directory-stat`, `work-directory-close`,
`staging-read`, `input-recheck`, `pre-rename-lock-stat`, `pre-rename-root-check`,
`pre-rename-source-parent-stat`, `pre-rename-target-parent-stat`, `rename`,
`parent-directory-open`, `parent-directory-sync`, `parent-directory-stat`, `parent-directory-close`,
`published-read`, `lock-stat-before-release`, `lock-release`
だけとする。`artifact-NN-*`のNNは§7.1の固定順01〜07。自由文字列を許さない。

帰属を次へ固定する。

0. `initialPaths.status: "not-attempted"`は先行15 checkまたは`jobPrePublication`にfailedがある場合だけ許す。この場合、lock/staging/inputRecheck/preRename/rename/parentDirectoryDurability/publishedも全てnot-attemptedでなければならず、publication/publishedPackage checkは`not_run_with_upstream_failure`。先行16 checkがpassedなのに未着手へ逃がさない。
1. `initialPaths.status`がobservedで、formal root・lock・workのいずれかが`present`:
   `OUTPUT_ROOT_ALREADY_EXISTS`。
2. lock stateが`create-exists`, `post-create-identity-invalid`, `identity-mismatch`:
   `PUBLICATION_LOCK_UNAVAILABLE`。`create-io-error`, `post-create-stat-io-error`, `pre-release-stat-io-error`, `release-io-error`は純I/Oとして`PUBLICATION_FAILED`へだけ帰属し、code 52と併発させない。
3. `staging.status`がobservedで、workのdirectory entries、固定7 read結果、strict JSON、hash、binding、regular file、nlinkが不成立:
   `PUBLICATION_STAGING_INVALID`。
4. `inputRecheck.status`がobservedで、開始snapshotとの比較がchanged:
   `PUBLICATION_INPUT_CHANGED`。
5. `preRename.state: "lock-observed"`、または`preRename.lockIdentity`とlock作成直後identityの不一致:
   `PUBLICATION_LOCK_UNAVAILABLE`。同じ事実を`lock.state: "pre-rename-identity-mismatch"`へも保存するが、violationは`$.publication.preRename.lockIdentity`の一件だけとし、lock fieldから重複発火させない。
6. `preRename.state: "root-observed"`でformal rootが再出現、または`parents-observed`でsource/target parentの一方がdirectoryでない、もしくはdevが不一致:
   `PUBLICATION_PRE_RENAME_INVALID`。
7. `initialPaths`, lock, staging, inputRecheck, preRename, rename, parentDirectoryDurability, publishedの`io-error`で、上記専用codeへ帰属しないmkdir/write/sync/rename/post-rename directory sync/read I/O失敗:
   `PUBLICATION_FAILED`。
   violation pathは生観測の実在failure leafへ固定する。`initialPaths`, `lock`, `staging`, `inputRecheck`, `preRename`, `rename`, `published`はそれぞれの`.failurePoint`、artifact単位は`.artifactReads[i].failurePoint`、親directoryは
   `.parentDirectoryDurability.open|sync|stat|close.failurePoint`
   を使う。同一runのsync失敗とclose失敗は異なる二pathのまま保存し、`code + path`重複除去で一件へ潰さない。`preRename.failurePoint: "pre-rename-lock-stat"`はlock fieldにも同じ事実を残すが、violationは`$.publication.preRename.failurePoint`の一件だけとし重複発火させない。
8. `published.status`がobservedで、rename後rootのdirectory entries、固定7 read結果、hash・binding・identityが不成立:
   `PUBLISHED_PACKAGE_INVALID`。

run reportへの写像は次へ固定する。

- process観測が`{mode: "not-requested"}`なら、reportの`publicationObservation`は`null`、`publicationFailures`は空配列。
- formalでは、pure checkerが生観測から導いたcode 55 `PUBLICATION_FAILED` violationと一対一に、同じ固定処理順へ
  `{path, failurePoint}`
  として全件投影し、reportの`publicationFailures`へ保存する。pathは当該violationのpath、failurePointはそのpathが指す§4.4固定enumである。同じ生I/O失敗を複数fieldへ保持する`pre-rename-lock-stat`は、violationと同様に`$.publication.preRename.failurePoint`の一要素だけへ投影する。生snapshotのBuffer全体はreportへ複写しないが、異なるcode 55 violationを要約一件へ潰さない。
- formalでstaging検品とinputRecheckの少なくとも一方が完了・合格していなければreport stateは`not_started`。renameの成否では判定しない。`publishedRoot`はjobのformal path、三hashは`null`。
- formalでstagingのraw観測をcheckerが有効と判定し、inputRecheckもsameと判定したが、published検品が完了・合格していなければ、preRename、rename、またはparent directory永続化で停止した場合も`staging_validated`。manifest/report hashはstaging read snapshotsから機械取得し、file set hashは`null`。
- formalでpublishedのraw観測をcheckerが有効と判定したなら`published_validated`。manifest/report hashとobserved file set hashは公開後snapshotsから機械計算する。
- process観測と上記stateが両立しないreportをvalidatorが拒否する。失敗時に後段stateへ進めない。

合成検査filesystem adapterは自由なhookや任意callbackを受けず、`scenario`を次の20値から一つだけ受ける。

| scenario | exact効果 | 期待code |
|---|---|---|
| `none` | 基準treeを変更しない | なし |
| `job-pre-publication-changed` | formalの開始job読取後、publication直前の二回目job読取だけが、元byte末尾へASCII space一byteを付けた内容、sizeを+1した新しいino `9051`を返す。initialPaths以降を呼ばない | `JOB_FILE_MISMATCH`（`jobPrePublication`） |
| `initial-formal-root-present` | 最初の`lstatBigInt(R)`だけが、kind directory・dev `1`・ino `9001`の既存空directoryを返す | `OUTPUT_ROOT_ALREADY_EXISTS` |
| `lock-create-eexist` | 最初の`mkdirExclusive(lock)`だけがcode `EEXIST`のI/O errorをthrowする | `PUBLICATION_LOCK_UNAVAILABLE` |
| `staging-extra-file` | work directory sync後、最初の`readdirWithTypes(work)`だけが正常7件に`unexpected.json` kind fileを末尾追加し、UTF-16 sort済み配列を返す | `PUBLICATION_STAGING_INVALID` |
| `input-second-read-changed` | 開始snapshot完了後、公開前再読込の`gateA.job.path`に対する`openReadOnly`だけが、元byte末尾へASCII space一byteを付けた内容、sizeを+1した新しいino `9101`を返す | `PUBLICATION_INPUT_CHANGED` |
| `pre-rename-lock-stat-eio` | staging検品・入力再読込後、rename直前の`lstatBigInt(lock)`だけがcode `EIO`をthrowする。renameもcleanupも呼ばない | `PUBLICATION_FAILED` |
| `pre-rename-lock-mismatch` | rename直前の`lstatBigInt(lock)`だけがkind directory・dev `1`・作成直後と異なるino `9201`を返す。renameもcleanupも呼ばない | `PUBLICATION_LOCK_UNAVAILABLE` |
| `pre-rename-root-check-eio` | rename直前のlock一致後、`lstatBigInt(R)`だけがcode `EIO`をthrowする。所有lockは削除直前再確認を経てcleanupする | `PUBLICATION_FAILED` |
| `pre-rename-root-present` | rename直前のlock一致後、`lstatBigInt(R)`がkind directory・dev `1`・ino `9202`の再出現rootを返す。renameせず、所有lockは削除直前再確認を経てcleanupする | `PUBLICATION_PRE_RENAME_INVALID` |
| `pre-rename-source-parent-stat-eio` | rename直前のlock一致・R不存在確認後、work parentの`lstatBigInt`だけがcode `EIO`をthrowする。renameせず、所有lockをcleanupする | `PUBLICATION_FAILED` |
| `pre-rename-target-parent-stat-eio` | rename直前のlock一致・R不存在・work parent確認後、R parentの`lstatBigInt`だけがcode `EIO`をthrowする。renameせず、所有lockをcleanupする | `PUBLICATION_FAILED` |
| `pre-rename-parent-device-mismatch` | rename直前の二parent観測で、source parentはkind directory・dev `1`・ino `9203`、target parentはkind directory・dev `2`・ino `9204`を返す。renameせず、所有lockをcleanupする | `PUBLICATION_PRE_RENAME_INVALID` |
| `rename-eio` | 最初の`rename(work, R)`だけがcode `EIO`をthrowする | `PUBLICATION_FAILED` |
| `parent-directory-open-eio` | rename成功直後の`openDirectoryReadOnly(parent)`だけがcode `EIO`をthrowする。sync/stat/close/published readを呼ばず、所有lockをcleanupする | `PUBLICATION_FAILED` |
| `parent-directory-sync-eio` | parent open成功後のhandle `sync`だけがcode `EIO`をthrowする。statを呼ばずcloseを一度実行し、published readを呼ばず、所有lockをcleanupする | `PUBLICATION_FAILED` |
| `parent-directory-stat-eio` | parent open/sync成功後の`statBigInt`だけがcode `EIO`をthrowする。closeを一度実行し、published readを呼ばず、所有lockをcleanupする | `PUBLICATION_FAILED` |
| `parent-directory-close-eio` | parent open/sync/stat成功後の`close`だけがcode `EIO`をthrowする。published readを呼ばず、所有lockをcleanupする | `PUBLICATION_FAILED` |
| `published-extra-file` | rename成功後、最初の`readdirWithTypes(R)`だけが正常7件に`unexpected.json` kind fileを末尾追加し、UTF-16 sort済み配列を返す | `PUBLISHED_PACKAGE_INVALID` |
| `job-pre-report-changed` | formal publicationとcleanup完了後、report直前の三回目job読取だけが、元byte末尾へASCII space一byteを付けた内容、sizeを+1した新しいino `9301`を返す。公開済みrootは維持する | `JOB_FILE_MISMATCH`（`jobStability`） |

基準treeのdevは全て`1`、inodeはpathごとに固定・一意、mtimeNsは`1`、nlinkはregular file `1`、正常directory entry集合は§7.1の7件だけとする。scenarioの効果以外は全methodが基準treeどおり返り、複数scenarioの併用を拒否する。production adapterは`scenario` fieldもfactory引数も持たない。

検査では、四build stageのpass 1/2ごとに`thrown`, `invalid-return`を作って`BUILD_FAILED`を担当check別に発火させる。`input-mutated`は実在Buffer leafを持つ`package`と`compiler`のpass 1/2だけで発火させ、Buffer leaf 0件の`gate-a-evidence`と`embedded-gate-a-report`では`inputByteCopies: []`とscenario指定拒否を確認する。二つのbuild byteを変えてcode 11または`NONDETERMINISTIC`を担当check別に発火させる。publication 7 codeは上表のtest adapter経由runnerで各一度以上発火させる。rename直前の非I/O不成立3件はrunner経路で必須とし、4つのI/O failurePointも各scenarioでbranch・code 55・呼出順・cleanup有無を確認する。これにより、pure checkerだけを都合よく通す検査と、production経路だけにある未検査分岐の両方を防ぐ。

### 4.5 builderとreport validatorのexact引数

`buildPresentationCaptionSemanticSourcePackageV001(context)`のcontextは、次のroot fieldだけをこの順で持つ。

1. `job`: `{value, snapshot}`
2. `gateA`: `{jobValue, jobSnapshot, completionReportSnapshot, evidenceValue, evidenceBytes, embeddedReportValue, embeddedReportBytes}`
3. `implementationSnapshots`
4. `sourceSnapshots`
5. `widthPolicySnapshots`
6. `runtimeObservation`

`implementationSnapshots`は`packageCore`, `packageRunner`, `rendererTrustImplementation`順。`sourceSnapshots`は`sourceAtoms`, `sourceGenerationManifest`, `sourceValidationReport`順。`widthPolicySnapshots`は§6.1の六role順。全snapshotは§4.2のshapeである。builderへexpectedCuts、fixture、教師切り抜き、採点結果、テーマ、候補順位、人間判定、別transcript、自由prompt、現在時刻、乱数、環境変数を渡せない。builderはこのcontextと§8の固定仕事本文だけから固定7 artifactsを返す。

runnerは、package builderの各attemptについて、このexact contextを作った時点のprovided entry列と、read-only Proxy経由で実際に読んだaccess entry列を、passOrdinal付きで§4.2の`builderInvocationProvenance.passes`へ保存する。builderは当該passのProxyだけを受け、生context、別passのProxy、filesystem adapterを受け取らない。Node実体はroot `runtimeObservation`内の専用bindingとしてのみ参照し、provenanceへ外部絶対pathを複写しない。

`buildPresentationCaptionSemanticCompilerInputV001(context)`のcontextは、次のroot fieldだけをこの順で持つ。

1. `sourcePackageSnapshots`: 固定7 file順
2. `rawSemanticOutputSnapshot`

このbuilder contextは、semantic checkerが`sourcePackageObservation.directoryEntries`と`artifactReads`から固定7 file集合・regular・nlink・strict JSON・hash・bindingをpassedと判定し、raw意味出力もvalid completeと判定した後だけ組み立てる。各snapshotはartifactReadsの`read` branchから取り出す。missing/extra/改名/非regularをcontext validatorで先に隠してcompilerへ進めない。

compiler builderは外部source atom、registry、job、時刻、教師情報を再読込しない。正式package内の境界証拠・対応表と、raw回答の行末IDだけから§14のvalueを作る。

report validatorの引数shapeは次へ固定する。

- package:
  `{report, reportBytes, expectedExitCode, checkerContext}`
- semantic:
  `{report, reportBytes, expectedExitCode, checkerContext}`

`reportBytes`はNode Buffer、`expectedExitCode`は0または1だけ。`checkerContext.contextPhase`はpackage/semanticとも`final-report`だけを許し、中間ゲートcontextなら`{valid:false}`とする。validatorはreportBytesを§5のstrict入口でdecodeし、decode値と`report`のdeep exact一致、`report`を正式再直列化したbyteとの完全一致を先に検査する。その後`checkerContext`を同じexport済みpure checkerへ再投入し、§16.5のcheck列・root違反・status・failureStageを再導出する。さらに、builder入力snapshotからjob/input/runtime/publication要約を再計算し、reportの全field・field順を照合する。

再導出したstatusと`expectedExitCode`の対応も必須検査とする。packageは`passed -> 0`, `failed -> 1`、semanticは`passed -> 0`, `abstained -> 1`, `failed -> 1`だけを許し、不一致は`{valid:false}`。呼出側が渡したprecomputed check列、違反code、status、exit codeを根拠にしない。validatorが拒否したreportはtrusted reportではなくCLI exit 2である。§22のstdout検証も、捕捉した実byteをこの`reportBytes`へ渡す。

## 5. strict JSON v001

### 5.1 raw byteの受理

全job、正式package file、モデルraw出力、検査reportは、hash計算・正式直列化より前に同じstrict JSON入口を通す。

- UTF-8はfatal decoderで読む。不正byteをU+FFFDへ置換しない。
- UTF-8 BOMを拒否する。
- JSON whitespaceを除き、値は正確に一つだけとする。
- trailing text、複数JSON value、Markdown code fenceを拒否する。
- objectの重複keyを拒否する。後勝ちで上書きしない。
- JSON構文として読めても、非有限数になった巨大指数、`-0`、safe integer外、schemaが許さない小数を拒否する。
- stringはUnicode scalar value列とし、孤立high/low surrogateを拒否する。
- textはnormalize、trim、句読点追加、置換をしない。

### 5.2 メモリ内値の受理

正式JSONを作る前に、全値を再帰走査する。

- objectはprototypeが`Object.prototype`または`null`のplain objectだけ。
- arrayは0からlength-1まで全要素が存在するdense arrayだけ。
- `undefined`、function、symbol、BigInt、非有限数、`-0`を拒否する。
- accessor、`toJSON`、symbol-key、非列挙own property、array追加property、class instance、Date、Map、Setを拒否する。
- schemaに無いfieldを拒否する。
- numberはschemaが明記したsafe integerだけ。B1には小数fieldを置かない。

`JSON.stringify`によるfield省略、`null`化、0化をsanitizeとして使わない。

### 5.3 正式byteとhash

- 正式JSON byte:
  schemaに列挙したfield順でobjectを構築し、
  `JSON.stringify(value, null, 2) + "\n"`をUTF-8化する。
- 例外は`embedded-gate-a-validation-report.json`一件だけである。既存Gate A runnerの正式stdout byteを保存するため、strict検査済みvalueのobject keyをUTF-16 code unit順で再帰sortし、空白なし`JSON.stringify`とLFを付ける。value/schemaは既存
  `presentation-segmenter-boundary-preflight-report-v001`
  を維持し、byte serializerも既存runnerと同じものを使う。この例外を他fileへ広げない。
- 実byte SHA-256:
  上記の保存byteそのものをhashする。
- canonical SHA-256:
  strict検査済み値のobject keyをUTF-16 code unit順で再帰sortし、空白なしJSONへしてhashする。
- array順は変えない。
- 実byte一致と意味上のcanonical一致を別々に検査する。

正式fileをparseして同じobjectを得られても、実byte hashが違えばbyte同一とはしない。

### 5.4 schema記法の共通規則

本設計で`{a, b, c}`と記したobjectは、列挙したfieldが全て必須で、その順で正式byteを構築し、未知fieldを一件も許さない。配列のrole・file・checkを「固定順」と書いた箇所は、件数、role集合、順序の全てを固定する。`null`を明記していないfieldへnullを許さない。

全ID・path・hash・enumは、各節のpatternまたは固定値へ完全一致させる。未記載のdefault、暗黙補完、後方互換aliasを作らない。

scalarと集計には次の共通規則を適用する。

- SHA-256は64桁lowercase hexだけ。
- filesystem stat由来の`dev`, `ino`, `size`, `nlink`は、productionのnonnegative BigIntを`.toString(10)`したcanonical decimal stringだけを許し、patternは`0|[1-9][0-9]*`。空文字、`+`、負号、leading zeroを拒否する。
- `mtimeNs`はBigInt `.toString(10)`と一致するcanonical signed decimal stringだけを許し、patternは`0|-?[1-9][0-9]*`。`-0`、`+`、leading zeroを拒否する。
- `*Count`, `maximumObserved*`, `logicalWidth`は0以上のsafe integer。配列長、固定配列の実数、container別合計、全体合計と完全一致する。
- `*Ordinal`, `lineOrdinal`, `meaningGroupOrdinal`, `speechId`, `candidateId`は1以上のsafe integer。
- `startMs`, `endMs`は0以上のsafe integerで、元source契約が要求する箇所では`startMs < endMs`。B1が時刻を丸めたり作り直したりしない。
- source由来の`atomId`, `speechId`, `timelineSegmentId`, `sourceRef`, `speaker`, artifact IDは、対応する正式上流値の型と値をそのままexact copyする。同一scopeで一意であるべきIDは一意性を再検査し、文字列の数字部分から別値を推測しない。
- `containerId`と`boundaryCandidateId`は、Gate A境界証拠の正式配列に現れる値だけをexact copyする。配列順、件数、container所属を別fieldの申告値から補完しない。
- `maximumObservedCandidateLogicalWidth`, `maximumObservedLineLogicalWidth`は対象配列が非空なら実測最大値、対象が存在しないvalid abstained/不成立reportでは各節どおり`null`。便宜上0を入れない。

## 6. package job契約

### 6.1 schema

schema名:
`presentation-caption-semantic-source-package-job-v001`

root field順:

1. `schemaVersion`
2. `jobId`
3. `artifactId`
4. `mode`
5. `gateA`
6. `implementationBinding`
7. `widthPolicyBindings`
8. `expectedRuntime`
9. `expectedProjection`
10. `publication`
11. `readOnlyGuard`

許可値:

- `mode`: `read-only-preflight`または`formal-generation`
- `jobId`、`artifactId`: `[A-Za-z0-9][A-Za-z0-9._-]*`

`gateA`:

1. `job`: `{path, fileSha256}`
2. `completionReport`: `{path, fileSha256}`
3. `expectedEvidenceHashes`:
   `{boundaryCandidatesCanonicalSha256, sourceAtomMembershipCanonicalSha256, evidenceCanonicalSha256}`

`implementationBinding`:

1. `gitCommit`: 40桁lowercase hex。申告値でありHEAD一致を合格条件にしない。
2. `files`: role順`packageCore`, `packageRunner`, `rendererTrustImplementation`の3件。
3. `dependencyFiles`: 空配列。B1 package processが実行する文字幅dependencyは`widthPolicyBindings`、Gate A三実装は`gateA` jobのimplementation bindingへ一度だけ置く。同じfileをB1 `dependencyFiles`へ重複掲載しない。
4. 各file: `{role, path, fileSha256}`

`widthPolicyBindings`のrole順:

1. `presetRegistry`
2. `presetValidationIndex`
3. `materialValidationIndex`
4. `registryBinding`
5. `rendererTrust`
6. `textLayoutImplementation`

各binding:

- JSON artifact:
  `{role, path, fileSha256, canonicalSha256}`
- JavaScript実装:
  `{role, path, fileSha256, canonicalSha256: null}`

`expectedRuntime`はゲートA jobと同じ五つの合否値:

`{nodeBinarySha256, nodeVersion, icuVersion, resolvedLocale, resolvedGranularity}`

`expectedProjection`:

1. `sourceAtomCount`
2. `containerCount`
3. `boundaryCandidateCount`
4. `containers`

各container:
`{containerId, sourceAtomCount, boundaryCandidateCount}`

`publication`:

`{packageId, formalOutputPath, expectedState}`

- `packageId`: `[A-Za-z0-9][A-Za-z0-9._-]*`。jobの同値をmanifest、package validation report、run reportへ無変更でexact copyする。path名やartifact IDから再生成しない。
- `expectedState`は`absent`のみ。
- `formalOutputPath`は、参照するゲートA jobの`readOnlyGuard.formalOutputPath`と完全一致しなければならない。
- pathはworkspace相対、安全なPOSIX区切り、`..`・`\`・`//`なし。

`readOnlyGuard`:
`{watchedRoot, excludedPaths, expectedBeforeCanonicalSha256}`

- `watchedRoot`は
  `evals/clip_composition/outputs/presentation`
  と完全一致する。
- `excludedPaths`は、CLIへ渡された正規化済みpackage job path一件だけを持つ配列とする。他のpathを除外できない。
- `expectedBeforeCanonicalSha256`は§18.2の監視投影をjob作成時に計算した64桁lowercase hex。
- formal modeでもfieldは必須だが、正式生成の合否には使わず診断用に記録する。preflight modeだけが前後不変を合否にする。

package job pathの許可rootはmodeごとに固定する。

- preflight:
  `evals/clip_composition/outputs/presentation/caption-semantic-source-package-preflight-jobs/`
- formal:
  `evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs/`

いずれも指定root直下のregular `.json` fileだけを許す。symlink、hardlink、subdirectory経由を拒否する。`excludedPaths[0]`は、この許可root検査を通過したCLI引数のjob pathと完全一致させる。job自身を監視投影へ含めると、そのjob内に書く期待投影hashがjob自身のhashへ循環するため、除外はこの一件だけに固定する。job byteは監視から外しても、§18.1のopen前後・読込前後の安定読取と実byte hash照合で独立に固定する。

role別path契約:

- `gateA.job.path`: `evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/`直下のregular `.json`。
- `gateA.completionReport.path`: `evals/clip_composition/reports/presentation/`直下のregular `.md`。
- `implementationBinding.files`: `packageCore`, `packageRunner`は§4の二実装path、`rendererTrustImplementation`は`evals/clip_composition/presentation_renderer_plan_v002.mjs`と完全一致する。
- `implementationBinding.dependencyFiles`: 空配列と完全一致する。
- `presetRegistry`, `presetValidationIndex`, `materialValidationIndex`, `registryBinding`: `evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/`直下の、それぞれ`preset-registry.json`, `preset-validation-index.json`, `material-validation-index.json`, `trusted-registry-bindings.json`と完全一致する。
- `rendererTrust`: `evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json`と完全一致する。
- `textLayoutImplementation`: `evals/clip_composition/presentation_renderer_text_layout_v001.mjs`と完全一致する。
- Gate A jobが参照する入力・実装pathは、Gate A job自身の既存schemaとhash検査をそのまま適用する。B1が別の許可rootへ読み替えない。
- Node実体は`process.execPath`をrealpath解決したregular fileだけを使い、jobの`nodeBinarySha256`と照合する。jobからNode pathを受け取らない。

### 6.2 preflightと正式生成

- `read-only-preflight`:
  全packageをメモリ内で二度作り、検査reportをstdoutへ出す。formal root、lock、work、failure artifactを一切作らない。
- `formal-generation`:
  同じcoreでpackageを作り、§18の原子的公開を行う。

modeによってschemaや生成規則は変えない。違いは公開処理を行うかだけである。

## 7. 正式source-only package

### 7.1 formal rootと固定file集合

formal rootはpackage jobが参照するゲートA jobの`formalOutputPath`一箇所だけとする。candidate 13では次である。

`evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`

直下のfileは、次の7件だけをこの順でmanifest・検査へ扱う。

1. `segmenter-boundary-evidence.json`
2. `embedded-gate-a-validation-report.json`
3. `semantic-source-input.json`
4. `deterministic-expansion-map.json`
5. `source-only-leakage-report.json`
6. `package-manifest.json`
7. `package-validation-report.json`

subdirectory、symlink、hardlinkによる外部共有、追加fileを禁止する。境界証拠のmirrorを別rootへ作らない。

### 7.2 Gate A内包証拠

`segmenter-boundary-evidence.json`は、既存
`presentation-segmenter-boundary-evidence-v001`
のbyte shapeを変更せず保存する。

package runnerは次を行う。

1. 固定ゲートA job、入力3件、実装3件、Node実体、完了報告を安定読込する。
2. jobに記録された同じruntime、入力snapshot、既存export済みgeneratorで境界証拠を二度作る。
3. 既存checkerと既存report validatorを使い、ゲートA形の内包検査記録を作る。
4. 二つの証拠byteが一致することを確認する。
5. B1 jobへ実行前に固定した三つのevidence hashと一致することを確認する。
6. 二pass一致後、常にpass 1を正式証拠byteとする。結果を見てpass 2へ選び替えない。

`buildGateAEvidence`へ渡すexact contextは
`{artifactId, sourceArtifact, sourceArtifactSnapshot, runtimeBinding}`
のfield順とする。

- `artifactId`: Gate A jobの同値。
- `sourceArtifact`: 初回`sourceAtoms` snapshotのstrict decode値。
- `sourceArtifactSnapshot`: `{path, fileSha256}`。pathとhashは同じ初回snapshotの実測値。
- `runtimeBinding`: 下記legacy runtime bindingと同一object。

runnerは`gate-a-context-gate`がpassedした後だけこのcontextを作る。private production adapterは既存builder exact exportをそのまま参照し、contextを補正するwrapperを持たない。このcontextにはBuffer leafがないため、両passの`inputByteCopies`は空配列である。

既存Gate A checker/validatorを実際に呼べるよう、B1 package coreは`gateA`の生観測から次のlegacy contextを**pureに再導出**する。runnerがlegacy shapeや合否booleanを先に作って渡さない。

- `jobSnapshot`:
  `{path, firstFileSha256, secondFileSha256, issues}`。pathとfirstは初回`jobInput`、secondは`legacyRecheck.jobInput`の実byte hash。両readがsafe・同一identity・同一hashのときだけ`issues: []`で構築する。それ以外はlegacy contextを部分捏造せずcode 8。
- `observedImplementationBinding.files`:
  Gate A既存順の3件。各要素は
  `{role, path, firstFileSha256, secondFileSha256, loadedModuleUrl, issues}`。
  二hashは初回とlegacy recheckの実測値。`loadedModuleUrl`は、core/retainedを既存
  `PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001`
  の値、runnerをpackage coreの`import.meta.url`から固定相対pathで作るfile URLとする。三つとも実pathへ解決した結果がGate A jobのpathと一致するときだけ`issues: []`。
- `inputSnapshots`:
  Gate A既存順の3件。各要素は
  `{role, path, firstFileSha256, secondFileSha256, document, issues}`。
  documentは初回snapshotのstrict decode値、二hashは初回とlegacy recheckの実測値。同一性が成立するときだけ`issues: []`。
- `runtimeBinding`:
  `{nodeBinarySha256, nodeVersion, icuVersion, resolvedLocale, resolvedGranularity, diagnostics}`。
  binary hashはB1の`nodeBinaryInput` read snapshotの実byte hash、残りはB1実測値をexact copyする。Node読取がtrustedなread branchでない場合はlegacy contextを作らない。
- `evidencePasses`:
  B1 `evidencePasses`二件の`.value`だけを固定順に渡す。
- `buildFailure`:
  `null`。B1 builder failure時は既存checkerへ進まず、B1 code 48で停止する。
- `readOnlyGuard`:
  `legacyReadOnlyObservation`から
  `{formalOutputPath, watchedAncestorPath, before, after}`
  を作る。before/afterは
  `{formalPathState, entryCount, entriesCanonicalSha256}`で、件数・canonical hashは各生entry列から再計算する。
- `productionMode`:
  `true`。

このlegacy contextを既存
`checkPresentationSegmenterBoundaryPreflightV001`
へ一度渡し、その返却objectを内包report builderへ渡す。Gate A checkerが返したstatusやviolationsをB1用に補正しない。legacy contextを作れない場合はcode 8、作れたchecker結果を組み立てた有効reportがfailedならcode 10とし、両段を混ぜない。

`embedded-gate-a-validation-report.json`は既存
`presentation-segmenter-boundary-preflight-report-v001`
のvalue/schema shapeと、既存runnerのcanonical key-sort・空白なしJSON・LFという正式byte規則を維持する。これは§5.3の明記された一file例外であり、**ゲートA形の証拠検査だけ**の合格であってB1 package全体の合格ではない。

既存Gate A runnerのreport組立関数は非exportであるため、B1 package coreは、検査ロジックを複製せず**report objectの組立だけ**を行う
`buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001`
をexportする。入力は
`{jobValue, jobSnapshot, inputSnapshots, runtimeBinding, evidencePasses, readOnlyGuard, checkReport}`
のexact objectとし、出力field順と値の選択を次へ固定する。

1. root:
   `{schemaVersion, status, failureStage, job, inputs, runtimeBinding, observedProjection, evidence, readOnlyGuard, checkReport}`
2. `schemaVersion`:
   `presentation-segmenter-boundary-preflight-report-v001`
3. `status`:
   `checkReport.status`
4. `failureStage`:
   passedなら`null`、failedならcheck固定順で最初の`failed`の`name`
5. `job`:
   `{jobId, path, fileSha256}`。`jobId`はGate A jobの非空文字列、path/hashはGate A job snapshotの最初の安定読取値
6. `inputs`:
   `inputBinding` passed時だけ、Gate A入力固定順の`{role, path, fileSha256}`。それ以外は`null`
7. `runtimeBinding`:
   `runtimeBinding` checkが`not_run_with_upstream_failure`または実測値なしなら`null`、それ以外は実測値
8. `observedProjection`:
   `checkReport.observedProjection`
9. `evidence`:
   `segmentation` passed時だけ
   `{artifactId, canonicalSha256, boundaryCandidatesCanonicalSha256, sourceAtomMembershipCanonicalSha256}`。
   `canonicalSha256`は第一生成物全体のcanonical SHA-256。それ以外は`null`
10. `readOnlyGuard`:
    `readOnlyPreflight`が`not_run_with_upstream_failure`または実測値なしなら`null`、それ以外は実測値
11. `checkReport`:
    既存`checkPresentationSegmenterBoundaryPreflightV001`の返却objectそのもの

B1はこのobjectを、既存export
`validatePresentationSegmenterBoundaryPreflightReportV001`
へ、reportのstatusが`passed`なら`expectedExitCode: 0`、`failed`なら`expectedExitCode: 1`として、上記legacy写像の
`jobValue`, `jobSnapshot`, `inputSnapshots`, `runtimeBinding`, `evidencePasses`, `readOnlyGuard`
とともにexact inputで渡す。これで、まず既存Gate A reportとしてのshapeと内部整合を検査する。既存validatorが拒否した場合は`GATE_A_REPORT_INVALID`、validatorが受理した有効reportのstatusが`passed`でなければ、その次のB1固有判定で`GATE_A_NOT_PASSED`とする。両者を同じcodeへ畳まない。validator合格かつstatus passedになる前に内包reportを正式packageへ採用しない。B1のreport組立関数が既存Gate A runnerの同一入力に対して同一byteを作る合成検査を必須とし、Gate A checker・validator自体をB1用に複製・緩和しない。

内包report用のGate A `readOnlyGuard`は、既存runnerの規則を変えず次のexact shapeで作る。

- root:
  `{formalOutputPath, watchedAncestorPath, before, after}`
- `formalOutputPath`:
  Gate A jobの同field。
- `watchedAncestorPath`:
  formal pathの親方向へ辿って得た最深の既存directory。workspaceからそこまでの各directoryがsymlinkでなく、realpathが字面の絶対pathと一致すること。
- `before`, `after`:
  `{formalPathState, entryCount, entriesCanonicalSha256}`。
  formal pathは両方`absent`。`entryCount`とhashはwatched ancestor直下だけを`readdir({withFileTypes:true})`し、各entryを`{name, type}`へ写してnameのUTF-16順に並べた配列の件数とcanonical SHA-256。二値は前後完全一致。

このGuardは、B1 job自身を除外して全出力treeを監視する§18.2のB1 read-only guardとは別物である。前者は既存Gate A validatorへ渡す過去契約の再現、後者はB1 runner自体の書込0件を検査する。

Gate A完了報告はMarkdownであり、B1 coreが表を独自parseして期待値を抽出しない。B1 jobの
`expectedEvidenceHashes`
へ三値を事前固定し、完了報告はpathと実byte hashによる来歴証拠として束縛する。candidate 13では§19の三値を使う。別candidateでは、同じ手続きで人間承認済みjobへ固定するまでB2/B3へ進めない。

正式公開後はformal rootが存在するため、「出力先不存在」を現時点のfilesystemへ再評価して既存Gate A validatorを呼ばない。公開後検品は、保存済み内包report、当時のsnapshot・read-only観測、hash、schemaの自己整合をB1 validatorが再確認する。過去の「不存在」観測を現在の「存在」に置き換えない。

## 8. モデル可視入力

### 8.1 schemaとfield

file:
`semantic-source-input.json`

schema:
`presentation-caption-semantic-source-input-v001`

root field順:

1. `schemaVersion`
2. `taskDescription`
3. `displayConstraints`
4. `containers`

`taskDescription`の唯一の正本は、このfileに置く。値は次の一文と完全一致させる。

> 各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、本文を変更せず、各行のlogicalWidth合計がmaxLogicalWidthPerLine以下になる意味の読める短い行へ分ける。連続する1行または2行を1つのmeaningGroupとしてまとめ、行末はboundaryCandidateIdで示す。

B5のpromptは、このfieldを処理対象として参照し、同じ仕事本文を独立に複製しない。B5は出力形式や送信手順を固定できるが、仕事本文を別正本として書き換えない。

`displayConstraints`のfield順:

1. `maxLogicalWidthPerLine`: `36`
2. `maxLinesPerMeaningGroup`: `2`

この二値は認定済みpreset
`normal-landscape-readable-pop-v001`の
`caption-core-v001`から取得する。jobやモデルの回答で変更できない。

各containerのfield順:

1. `containerId`
2. `text`
3. `boundaryCandidates`

各候補のfield順:

1. `boundaryCandidateId`
2. `text`
3. `logicalWidth`

`logicalWidth`は、固定済み
`U+0000..U+00FF=1; other Unicode code point=2`
を候補本文へ適用したsafe integerである。モデルへ文字時刻、元文字ID、話者、timeline segment、speech ID、path、hashを見せない。

### 8.2 source-only検査

allowlist検査は、文字列中の単語を探す禁止語検査ではない。元発話に偶然「expected」等が現れても削除しない。次を由来照合する。

- root/container/candidateのfieldが§8.1の閉集合と完全一致する。
- task本文が固定文と完全一致する。
- container ID・順序・全文が境界証拠と正式source atom全件から一意に復元した値と一致する。
- 候補ID・順序・本文が境界証拠と一致する。
- 候補幅が固定文字幅処理の再計算と一致する。
- 単一候補の幅が`maxLogicalWidthPerLine`を超える場合、どの行末選択でも有効なcompleteを作れないため、`MODEL_INPUT_PROJECTION_MISMATCH`でGemini前に停止する。
- 表示制約がpreset/trustの固定値と一致する。
- 教師、expected、fixture、DP、人間評価、過去表示計画、raw時刻、ranking、G4〜G7、描画物を参照するfieldや外部bindingがない。

source-onlyは構造と由来で証明し、任意の意味スコアや独自係数を作らない。

### 8.3 表示幅の信頼鎖

jobへ六fileのhashを書いたことだけを、幅規則の信頼とは扱わない。package checkerは次の順で信頼鎖を検査する。

1. `rendererTrustImplementation`のpath・実byte hashがjobの固定bindingと一致することを確認する。このfileは認定previewの来歴参照としてだけ束縛し、import・実行しない。
2. `rendererTrust`をB1 strict JSONで検査し、schema/trust versionが`presentation-renderer-trust-v001`、renderer contract versionが`zev-renderer-boundary-v002`、実canonical SHA-256が人間認定時に固定済みの`9d5ffe631033dc594c917649e2529899e303f3cb8a7d7b1b65ea0d26b7c645f2`と完全一致することを確認する。このhashは独自係数ではなく認定済みtrust rootであり、変更には新preview・人間再認定・B1契約改訂を要する。
3. trust内`presetRegistry`と`registryBinding`のpath、実byte hash、canonical hashを、jobで固定した二snapshotへB1 checker自身が完全一致照合する。renderer moduleのvalidator出力を事前計算booleanとして受け取らない。
4. `trusted-registry-bindings.json`のexact schema
   `{schemaVersion, presetRegistryVersion, presetValidationIndexSha256, materialRegistryVersion, materialValidationIndexSha256}`
   を検査する。preset registryの`registryVersion`、preset validation indexの`registryVersion`を`presetRegistryVersion`へ、material validation indexの`registryVersion`を`materialRegistryVersion`へ一致させ、二indexの実byte SHA-256をbindingの二hashへ一致させる。
5. preset registry内の`normal-landscape-readable-pop-v001`が一件だけ、同preset内の`caption-core-v001`が一件だけ存在することを確認する。preset validation indexにも同preset policyが一件だけあることを確認する。
6. `caption-core-v001.layout`が
   `{maxCharsPerLine: 36, maxLines: 2, singleLine: false}`
   と完全一致することを確認する。trustの`layoutRules`は認定済みtrust schemaの全field・型・値をstrictに検査し、`characterWidthRule`を固定文字幅規則へ一致させる。B1は見た目の数値を再評価・補正しない。
7. trustの`rendererDependencies`から
   `evals/clip_composition/presentation_renderer_text_layout_v001.mjs`
   をpathで一意に引き、job固定snapshotの実byte hashへ一致させる。同moduleの
   `PRESENTATION_RENDERER_TEXT_LAYOUT_VERSION`
   と`PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001`
   が、固定版`presentation-renderer-text-layout-v001`とtrust内規則へ一致することを確認する。
8. 上記を全部通った値だけを§8.1の36/2と§9の幅bindingへ写す。job・model・B1 builderが別の幅値を指定できない。既存renderer trust実装を実行しないこと、package coreのlocal importが§4.1で固定した`textLayoutImplementation`・Gate A checker/validator三fileだけであることも静的検査する。

違反帰属:

- trust、registry、binding、indexのstrict schemaまたは必須field shapeが不成立:
  `INPUT_SCHEMA_UNSUPPORTED`。
- 実装、trust、registry、binding、indexのpath、実byte/canonical hash、registry versionの鎖が不一致:
  `INPUT_HASH_MISMATCH`。
- hash鎖は成立したが、preset/state/policyが欠落・重複、36/2/singleLine、character width export・layout ruleが不一致:
  `MODEL_INPUT_PROJECTION_MISMATCH`。

上流の既存validatorが返す固有codeをB1 reportへそのまま混ぜず、B1の上記三codeへだけ固定帰属する。ただしdetailsへ原因を転載せず空objectを維持する。

## 9. 決定的対応表

file:
`deterministic-expansion-map.json`

schema:
`presentation-caption-semantic-expansion-map-v001`

root field順:

1. `schemaVersion`
2. `artifactId`
3. `sourceBindings`
4. `widthPolicyBinding`
5. `modelInputBinding`
6. `containers`

`sourceBindings`:

1. `sourceAtoms`:
   `{path, fileSha256, canonicalSha256}`
2. `boundaryEvidence`:
   `{fileName, fileSha256, canonicalSha256, boundaryCandidatesCanonicalSha256, sourceAtomMembershipCanonicalSha256}`

`widthPolicyBinding`:

1. `presetRegistry`: `{path, fileSha256, canonicalSha256}`
2. `presetValidationIndex`: `{path, fileSha256, canonicalSha256}`
3. `materialValidationIndex`: `{path, fileSha256, canonicalSha256}`
4. `registryBinding`: `{path, fileSha256, canonicalSha256}`
5. `rendererTrust`: `{path, fileSha256, canonicalSha256}`
6. `rendererTrustImplementation`: `{path, fileSha256}`
7. `textLayoutImplementation`: `{path, fileSha256}`
8. `presetId`: `normal-landscape-readable-pop-v001`
9. `visualStateId`: `caption-core-v001`
10. `maxLogicalWidthPerLine`: `36`
11. `maxLinesPerMeaningGroup`: `2`
12. `characterWidthRule`:
   `U+0000..U+00FF=1; other Unicode code point=2`

`modelInputBinding`:
`{fileName, fileSha256, canonicalSha256}`

各container:

1. `containerId`
2. `timelineSegmentId`
3. `speechId`
4. `candidates`

各candidate:

1. `boundaryCandidateId`
2. `sourceAtomIds`
3. `startAnchor`
4. `endAnchor`
5. `logicalWidth`

anchorは`{atomId, edge}`で、edgeはstart側が`start`、end側が`end`。本文はモデル入力と境界証拠に既にあるため、対応表へ複製しない。

IDの数字部分を解釈して位置を推測しない。実際の固定配列から`boundaryCandidateId -> {container position, candidate position}`の一意表を作る。

## 10. 漏洩検査report

file:
`source-only-leakage-report.json`

schema:
`presentation-caption-source-only-leakage-report-v001`

root field順:

1. `schemaVersion`
2. `status`
3. `failureStage`
4. `modelInputBinding`
5. `sourceBindings`
6. `checks`
7. `violations`

formal rootへ保存するこのreportの`status`は`passed`だけ、`failureStage`は`null`だけを許す。不合格はformal packageを作らず、§12.1のrun reportへ記録する。

`modelInputBinding`:
`{packageFileName, fileSha256, canonicalSha256}`

`sourceBindings`:

1. `sourceAtomsCanonicalSha256`
2. `boundaryEvidenceCanonicalSha256`
3. `expansionMapCanonicalSha256`
4. `presetRegistryCanonicalSha256`
5. `presetValidationIndexCanonicalSha256`
6. `materialValidationIndexCanonicalSha256`
7. `registryBindingCanonicalSha256`
8. `rendererTrustCanonicalSha256`
9. `rendererTrustImplementationFileSha256`
10. `textLayoutImplementationFileSha256`

固定10件であり、11件目以降は存在しない。renderer trustの既存import graphはB1で実行しないため、その推移依存をsource-only由来へ偽装掲載しない。

各check:
`{name, status, violationCodes}`

check名と順序は次の5件で固定する。

1. `schemaAllowlist`
2. `taskDescriptionBinding`
3. `sourceProjection`
4. `widthPolicyBinding`
5. `forbiddenProvenanceAbsence`

formal fileの`checks`は上記を固定順で全件持ち、全て`passed`とする。`failureStage`は`null`、`violations`は空配列。途中のfailed/not-run状態はpackage run reportへだけ記録する。

各violation:
`{code, path, details}`

`details`はv001では常に空objectとする。人間向け推測説明を正式reportへ混ぜない。

## 11. package manifest

file:
`package-manifest.json`

schema:
`presentation-caption-semantic-source-package-manifest-v001`

root field順:

1. `schemaVersion`
2. `packageId`
3. `artifactId`
4. `formalOutputPath`
5. `packageJobBinding`
6. `sourceGateBinding`
7. `implementationBinding`
8. `runtimeBinding`
9. `externalInputBindings`
10. `contentArtifacts`
11. `validationReportDeclaration`
12. `contentSetCanonicalSha256`

`packageId`はpackage jobの`publication.packageId`をexact copyする。`artifactId`と`formalOutputPath`もjobの同値をexact copyし、manifest側で組み直さない。

`packageJobBinding`:
`{path, fileSha256}`

`sourceGateBinding`:

1. `gateAJob`: `{path, fileSha256}`
2. `gateACompletionReport`: `{path, fileSha256}`
3. `expectedEvidenceHashes`:
   `{boundaryCandidatesCanonicalSha256, sourceAtomMembershipCanonicalSha256, evidenceCanonicalSha256}`
4. `gateAImplementationFiles`:
   Gate A jobの`implementationBinding.files`三件を既存role順の
   `{role, path, fileSha256}`
   でexact copyする。semantic jobがpackage coreの推移dependencyを外部Gate A jobの再読込なしで束縛する正本である。
5. `embeddedReport`:
   `{fileName, fileSha256, canonicalSha256}`

`implementationBinding.files`はrole順
`packageCore`, `packageRunner`, `rendererTrustImplementation`。
各fileは`{role, path, fileSha256}`。
`implementationBinding.dependencyFiles`はrole順
0件の空配列とする。
commitは診断記録であり、manifestの合否fieldにはしない。
`implementationBinding`の許可fieldは`files`, `dependencyFiles`だけである。

`runtimeBinding`:

1. `nodeBinarySha256`
2. `nodeVersion`
3. `icuVersion`
4. `resolvedLocale`
5. `resolvedGranularity`
6. `diagnostics`

五つの合否値はGate A jobと一致させる。diagnosticsは
`{nodeExecutableFileName, platform, arch, v8Version, unicodeVersion, cldrVersion}`
を記録する。`nodeExecutableFileName`は実測`resolvedNodePath`へPOSIX basenameを一度適用した値で、絶対pathをpackage manifestやCLI reportへ複写しない。残る五値はruntime observationの診断値をexact copyするが、jobが合否値として固定していない値を事後の独自合否にしない。実絶対pathはchecker contextと既存Gate A validator互換contextだけに保持する。

`externalInputBindings`はrole順:

1. `sourceAtoms`
2. `sourceGenerationManifest`
3. `sourceValidationReport`
4. `presetRegistry`
5. `presetValidationIndex`
6. `materialValidationIndex`
7. `registryBinding`
8. `rendererTrust`
9. `textLayoutImplementation`

JSONは`{role, path, fileSha256, canonicalSha256}`、
実装fileはcanonicalを`null`とする。

`contentArtifacts`は次の5件だけを固定順で持つ。

1. `boundaryEvidence`
2. `embeddedGateAReport`
3. `semanticSourceInput`
4. `deterministicExpansionMap`
5. `sourceOnlyLeakageReport`

各要素:
`{role, fileName, fileSha256, canonicalSha256}`

`package-manifest.json`自身と`package-validation-report.json`はこの配列へ含めない。

`validationReportDeclaration`:

`{fileName, schemaVersion, selfHashPolicy}`

- `fileName`: `package-validation-report.json`
- `schemaVersion`:
  `presentation-caption-semantic-source-package-validation-report-v001`
- `selfHashPolicy`:
  `report-is-not-hashed-by-manifest-v001`

`contentSetCanonicalSha256`は、`contentArtifacts`の5要素について
`{role, fileName, fileSha256, canonicalSha256}`
だけを上記固定順で持つ配列そのものをstrict検査後にcanonical化したSHA-256である。manifest全体、manifest自身のhash、validation reportはpreimageへ含めない。

reportの循環hashを作らない。後段は、manifest実byte hashとvalidation report実byte hashの二本組を束縛する。

## 12. package validation report

file:
`package-validation-report.json`

schema:
`presentation-caption-semantic-source-package-validation-report-v001`

root field順:

1. `schemaVersion`
2. `status`
3. `failureStage`
4. `jobBinding`
5. `package`
6. `manifestBinding`
7. `checks`
8. `violations`
9. `validatedContentArtifacts`
10. `observedProjection`
11. `scope`

formal rootへ保存するこのreportの`status`は`passed`だけ、`failureStage`は`null`だけを許す。不合格はformal packageを作らず、§12.1のrun reportへ記録する。

`jobBinding`:
`{path, fileSha256}`

これは開始時job snapshotのpath・実bytehashだけを表す。publication直前・report直前の一致は、それぞれrun reportの`jobPrePublication`・`jobStability` checkで表し、このobjectを後読取値へ置き換えない。

`checks`は次の15件を固定順で全件持つ。

1. `jobBinding`
2. `implementationBinding`
3. `inputBinding`
4. `runtimeBinding`
5. `gateAContext`
6. `evidenceBuild`
7. `evidenceDeterminism`
8. `embeddedReportBuild`
9. `gateAReport`
10. `packageBuild`
11. `packageShape`
12. `modelInput`
13. `expansionMap`
14. `sourceOnlyLeakage`
15. `determinism`

各要素は
`{name, status, violationCodes}`
とし、formal fileでは全15件を`passed`、各`violationCodes`を空配列とする。`failureStage`は`null`、`violations`は空配列。途中のfailed/not-run状態はpackage run reportへだけ記録する。

`package`:
`{packageId, artifactId, formalOutputPath}`

三値はpackage jobの`publication.packageId`, `artifactId`, `publication.formalOutputPath`をexact copyする。

`manifestBinding`:
`{fileName, fileSha256, canonicalSha256}`

`validatedContentArtifacts`はmanifestの5件と同じrole順・同じshape。

`observedProjection`:

1. `sourceAtomCount`
2. `containerCount`
3. `boundaryCandidateCount`
4. `containers`
5. `maximumObservedCandidateLogicalWidth`

container:
`{containerId, sourceAtomCount, boundaryCandidateCount}`

`scope`:

1. `validatedState`: `source-package-only`
2. `postPublishValidationRequired`: `true`
3. `semanticQualityVerified`: `false`
4. `naturalBreakQualityVerified`: `false`
5. `nonCooperativePublicationRaceProtected`: `false`

formal rootへ保存されるreportは、work内で固定7 fileを検査した時点の内容であり、`postPublishValidationRequired`は常にtrueである。公開後にこのfileを書き換えない。先頭15 checkまたは公開前検品が不合格なら正式rootへ公開しない。一方、rename成功後の親directory sync、公開後検品、lock release、report直前job安定性で失敗した場合はrollback禁止のため、内部status `passed`のこのfileを含むrootが既に存在し得る。その状態を最終run reportの`status`, `publicationObservation`, `jobStability`で不合格として記録し、package内reportを後からfailedへ書き換えない。

package合格を「読める分割ができた」と報告しない。

### 12.1 package runner最終report

CLIが最終的にstdoutまたはstderrへ出すreportは、formal package内のreportと分ける。

schema:
`presentation-caption-semantic-source-package-run-report-v001`

root field順:

1. `schemaVersion`
2. `mode`
3. `status`
4. `failureStage`
5. `jobBinding`
6. `candidatePackage`
7. `checks`
8. `violations`
9. `readOnlyObservation`
10. `publicationObservation`
11. `publicationFailures`
12. `scope`

`status`: `passed`または`failed`。

各`checks`要素は`{name, status, violationCodes}`。statusは
`passed`, `failed`, `not_run_with_upstream_failure`
だけを許す。check名・件数・順序は§12とmode別追加を連結したものへ完全一致させる。`failureStage`はpassedなら`null`、failedなら固定順で最初の`failed` check名。`violations`は`{code, path, details}`で、detailsは常に空objectとする。

`jobBinding`:
`{path, fileSha256}`

これは開始時package job snapshotのbindingである。publication直前・report直前再読込は`jobPrePublication`・`jobStability`へ分離し、このhashを後読取値へ置き換えない。

`candidatePackage`:
`{packageId, formalOutputPath, manifestFileSha256, validationReportFileSha256, contentSetCanonicalSha256}`

`packageId`と`formalOutputPath`はpackage jobからexact copyする。

production runnerは、package jobのschema全体が成立し、`mode`, `publication`, `readOnlyGuard`を含むreport構築値を一意に固定できた後だけ、このrun reportを作る。strict JSONとして安定読取できてもjob schemaが不成立ならexit 2の
`CAPTION_B1_PACKAGE_CLI_JOB_CONTEXT_UNAVAILABLE`
とし、modeやpublicationを推測したfailed reportを作らない。したがってproduction reportの`candidatePackage`は常にobjectであり、全体を`null`にしない。job schema成立後の不合格で未生成package hashだけをnullにでき、そのexact shapeは
`{packageId, formalOutputPath, manifestFileSha256: null, validationReportFileSha256: null, contentSetCanonicalSha256: null}`
とする。

三hashの掲載条件はpackage checkerの先頭15 checkだけで決める。15 checkが全てpassedし、二度のpackage build byteが一致した場合だけ、package pass 1の固定artifact列から三hashを掲載する。一件でもfailedまたは`not_run_with_upstream_failure`なら三hashを全てnullにし、部分hashを載せない。publication/staging/published checkだけが後からfailedになった場合は、既に検査済みのin-memory candidateを表す三hashを保持する。publication側のhashは別の`publicationObservation`から導き、staging/publishedが有効な場合はcandidatePackageの対応hashと完全一致させる。

`CAPTION_B1_JOB_INVALID`はpackage/semanticのpure checker合成検査専用codeである。production runnerがschema不成立jobをexit 1へ変換するためには使わない。

preflight modeのcheck順:

1. §12の15件
2. `readOnlyPreflight`
3. `jobStability`

formal modeのcheck順:

1. §12の15件
2. `jobPrePublication`
3. `publication`
4. `publishedPackage`
5. `jobStability`

modeに存在しないcheckを配列へ入れない。`not_applicable_by_mode`という状態は作らない。

`jobPrePublication`はformalの先頭15 checkが全てpassedした場合だけ実行し、`job.prePublicationInput`を開始snapshotと比較する。failedならpublication/publishedPackageを未実行にする。`jobStability`はreport直前の`job.preReportInput`を開始snapshotと比較する独立した最終checkであり、初回jobの`jobBinding`が成立し、report前観測を取得できる限り、途中の品質checkやpublicationがfailedでも実行する。package preflightとsemanticには`jobPrePublication`を置かない。

`readOnlyObservation`:

- preflight:
  `{status, beforeCanonicalSha256, afterCanonicalSha256, unchanged}`
- formal:
  `null`

preflightのstatusは`verified`または`not-run-with-upstream-failure`。`verified`では三hash/booleanを非nullとし、`unchanged`は監視treeの期待・前後一致、job以外のinputReread一致、write call 0件が全て成立した場合だけtrue。`not-run-with-upstream-failure`はbefore/after hashを実測値のまま持ち、`unchanged: null`とする。上流失敗で再読取を省略した状態を「変更なし」と認定しない。

`publicationObservation`:

- preflight:
  `null`
- formal:
  `{state, publishedRoot, manifestFileSha256, validationReportFileSha256, observedFileSetCanonicalSha256}`

formalの`state`は、最後に完了した段階を表す
`not_started`, `staging_validated`, `published_validated`
の三つだけとする。失敗は`status`と`failureStage`で表し、stateへ`failed`を混ぜない。fieldの値は次へ固定する。

- `not_started`:
  `publishedRoot`はjobのformal path、残る三hashは`null`。
- `staging_validated`:
  `publishedRoot`はjobのformal path、manifest/report hashはwork内検査済み値、`observedFileSetCanonicalSha256`は`null`。
- `published_validated`:
  全field非null。passed reportではこのstateだけを許す。

`observedFileSetCanonicalSha256`は、公開root直下の固定7 fileを§7.1順に
`{fileName, fileSha256, canonicalSha256}`
へ写した7要素配列のcanonical SHA-256である。各JSONをstrict検査して得たcanonical hashを使い、directory名、mtime、inode、manifest外fieldをpreimageへ入れない。公開rootが未完成ならnullであり、推測値を入れない。

`publicationFailures`は0件以上の
`{path, failurePoint}`
dense arrayである。preflightは空配列。formalでは§4.4の生観測からpure checkerが導いたcode 55 violationと一対一に、同じ固定処理順で投影する。pathはそのviolation path、failurePointは同pathの生fieldにある固定enum。sync失敗後のclose失敗など、異なる二violationは二要素のまま残す。同一事実をlockとpreRenameへ重ねて保持する`pre-rename-lock-stat`は`$.publication.preRename.failurePoint`の一要素だけとする。validatorはchecker contextからcode 55 violationとこの列を再生成し、件数・順序・各fieldをbyte単位で一致させる。

`jobStability`が公開後にfailedになっても、既に公開済みのrootと`published_validated`観測を巻き戻さない。root statusはfailedとなり、code 2を`$.job.preReportInput`へ残す。公開状態とjob安定性を同じstateへ畳まない。

`scope`:

1. `validatedState`:
   preflightは`read-only-candidate-package`、formalは`published-source-package`
2. `semanticQualityVerified`: `false`
3. `naturalBreakQualityVerified`: `false`
4. `nonCooperativePublicationRaceProtected`: `false`

このrun reportはformal rootの7 fileに含めず、manifestからhash参照しない。公開後検品の合否はこのreportへ記録し、既に公開した`package-validation-report.json`を後書きしない。

## 13. Gemini意味出力の受入契約

### 13.1 exact union

モデルが返せるcomplete形は次だけである。

```json
{
  "status": "complete",
  "containers": [
    {
      "containerId": "segmenter-container-000001",
      "meaningGroups": [
        {
          "lineEndBoundaryCandidateIds": [
            "segmenter-boundary-000001"
          ]
        }
      ]
    }
  ]
}
```

rootの許可fieldは`status`, `containers`だけ。
containerの許可fieldは`containerId`, `meaningGroups`だけ。
meaning groupの許可fieldは`lineEndBoundaryCandidateIds`だけ。

raw意味出力は、object memberの順序も受入契約に含める。completeはrootを`status`, `containers`、containerを`containerId`, `meaningGroups`の順とし、meaning groupは単一fieldだけとする。abstainedは`status`一件だけ。順番が違えば、同じ値を持っていても`SEMANTIC_OUTPUT_SCHEMA_INVALID`で拒否し、受理後に並べ替えて救済しない。

`abstained`形は次だけである。

```json
{
  "status": "abstained"
}
```

schemaVersion、text、時刻、reason、score、自由ID、未知fieldを返せない。

### 13.2 completeの受理条件

1. packageにある全containerを元順に一度ずつ記載する。
2. 各`meaningGroups`は非空。
3. 一つのgroupは一行または二行で、ID配列lengthは1または2。
4. IDを文字列の数字部分で解釈せず、固定対応表へexact lookupする。
5. 全groupの行末IDをcontainer内で平坦化すると、固定候補順で厳密増加する。
6. 未知ID、別containerのID、重複ID、逆順を一件でも拒否する。
7. 最後の行末IDは、そのcontainerの最後の候補ID。
8. 直前の行末の次から今回の行末までを一行として展開する。
9. 展開後の各行の候補幅合計は36以下。
10. 全containerを展開すると、全候補と全source atomが欠落・重複・逆順なく一度ずつ現れる。
11. 展開本文、source atom、anchorは対応表・境界証拠・正式sourceから機械再計算し、モデル申告を使わない。

一部containerだけのpartial受理、未知IDの類推修正、並べ替え、最後のID補完、幅超過行の機械再分割を禁止する。

### 13.3 abstainedと無効出力

- `abstained`は契約上有効な「結果なし」であり、違反ではない。
- 自動試行回数は1回、再試行回数は0回。
- `abstained`、形式不成立、候補外ID、本文改変field、順序変更、漏洩不成立のいずれでも同じ版を自動再実行しない。
- 複数回答の結合、best-of、majority、部分救済をしない。
- 再実行が必要なら、理由を人間へ報告して停止し、新しい版と別承認を要する。

B1 checkerは、B6で抽出・固定された**一つのraw JSON byte列**だけを入力とする。Web画面からどの範囲をraw JSONとするか、code blockの抽出、モデル表示名の確認はB6契約で固定し、B1 checkerが自由文からJSONを探さない。

## 14. deterministic compiler入力

### 14.1 schema

schema:
`presentation-caption-semantic-compiler-input-v001`

これはB4の正式cueではない。意味出力を元文字へ戻した、機械検査済みの一時入力である。

root field順:

1. `schemaVersion`
2. `artifactId`
3. `sourcePackageBinding`
4. `semanticOutputBinding`
5. `containers`

`sourcePackageBinding`:

1. `manifest`: `{path, fileSha256, canonicalSha256}`
2. `validationReport`: `{path, fileSha256, canonicalSha256}`
3. `semanticSourceInput`: `{path, fileSha256, canonicalSha256}`
4. `deterministicExpansionMap`: `{path, fileSha256, canonicalSha256}`

`semanticOutputBinding`:
`{path, fileSha256, canonicalSha256}`

各container:

1. `containerId`
2. `timelineSegmentId`
3. `speechId`
4. `meaningGroups`

各meaning group:

1. `meaningGroupOrdinal`
2. `lines`

`meaningGroupOrdinal`はcontainer内1始まりのsafe integerで、機械が順番から付ける。B4の正式cue IDではない。

各line:

1. `lineOrdinal`
2. `startBoundaryCandidateId`
3. `endBoundaryCandidateId`
4. `boundaryCandidateIds`
5. `sourceAtomIds`
6. `text`
7. `startAnchor`
8. `endAnchor`
9. `logicalWidth`

`lineOrdinal`はmeaning group内1または2。候補ID、source atom、text、anchor、幅は固定対応表から作り、モデル出力から転記しない。

### 14.2 deterministic expansion

- 位置表は固定packageから毎回再構成する。
- container先頭または直前行末の次を開始候補とする。
- end IDまでの連続候補だけを展開する。
- source atom列は各候補の列を順番どおり連結する。
- textは、正式package内の`segmenter-boundary-evidence.json`に保存された候補本文を、候補順に無正規化で連結する。Gate A内包検査で候補本文と正式source atom本文の完全一致は既に証明され、expansion mapが同じ候補をsource atom IDへ結び付けるため、semantic runnerは外部source atomを再読込しない。
- start anchorは先頭候補、end anchorは末尾候補の値を使う。
- logical widthは各候補の固定幅の和と、本文からの再計算が一致しなければならない。
- 同じ入力から二度作った正式byteとcanonical hashが一致しなければならない。

compiler入力を作れたことは、自然な区切り・読みやすさ・表示時刻の人間認定を意味しない。

## 15. semantic check jobとreport

### 15.1 job schema

schema:
`presentation-caption-semantic-output-check-job-v001`

root field順:

1. `schemaVersion`
2. `jobId`
3. `artifactId`
4. `mode`
5. `implementationBinding`
6. `sourcePackageBinding`
7. `semanticOutputBinding`
8. `expectedRuntime`
9. `expectedProjection`
10. `readOnlyGuard`

- `mode`: `read-only-check`だけ。
- `jobId`、`artifactId`: `[A-Za-z0-9][A-Za-z0-9._-]*`。
- `implementationBinding.files` role順:
  `packageCore`, `semanticCore`, `semanticRunner`。
- `implementationBinding.dependencyFiles` role順:
  `textLayoutImplementation`, `gateACore`, `gateARetainedSourceAtomsCore`, `gateARunner`の四件。
  `implementationBinding`のexact field順は`{gitCommit, files, dependencyFiles}`。`gitCommit`は40桁lowercase hexの診断値でHEAD一致を合否にせず、各fileは`{role, path, fileSha256}`。direct fileは§4の三実装path、dependency fileは§6.1の文字幅実装pathとGate A jobで固定済みの三実装path/hashへ完全一致する。Gate A三件をsemantic jobの自由値にせず、source package manifestが記録するGate A bindingとも一致させる。
- `sourcePackageBinding`:
  `{rootPath, manifest, validationReport}`。
  manifest/reportはそれぞれ`{path, fileSha256, canonicalSha256}`。
- `semanticOutputBinding`:
  `{path, fileSha256}`。
- `expectedProjection`:
  `{sourceAtomCount, containerCount, boundaryCandidateCount}`。
- `readOnlyGuard`:
  `{watchedRoot, excludedPaths, expectedBeforeCanonicalSha256}`。

`expectedRuntime`はpackage jobと同じ
`{nodeBinarySha256, nodeVersion, icuVersion, resolvedLocale, resolvedGranularity}`
のexact shape。

path関係:

- semantic job自身:
  `evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/`
  直下のregular JSON file。
- `sourcePackageBinding.rootPath`:
  `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/`
  直下の一package directory。
- manifest/report path:
  上記rootPath直下の`package-manifest.json`と`package-validation-report.json`に完全一致する。
- raw意味出力:
  `evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/`
  直下のregular JSON file。
- `readOnlyGuard.watchedRoot`:
  `evals/clip_composition/outputs/presentation`
  と完全一致する。
- `readOnlyGuard.excludedPaths`:
  CLIへ渡された正規化済みsemantic job path一件だけを持ち、他のpathを除外できない。

semantic job自身の監視除外と独立安定読取は§6.1のpackage jobと同じ契約を使う。これにより、期待投影hashをjob自身へ書く自己参照を作らず、job byteの途中差し替えはopen前後・読込前後のfile identityと実byte hashで拒否する。

semantic runnerの安定読取順:

1. semantic job。
2. job記載の`implementationBinding.files`、続いて`dependencyFiles`の固定順。
3. source package rootのdirectory entry全件。
4. source packageの固定7 file順。
5. raw意味出力。
6. Node実体。

初回読取後、`contextPhase: "semantic-output-gate"`のsemantic checkerを一度呼ぶ。先頭6 checkが全てpassedかつraw出力がcompleteの場合だけcompiler builderを二度呼ぶ。valid abstainedまたは先頭6のfailedではcompilerを呼ばない。その後、監視後観測・全非job入力再読込・job report直前再読込を取得し、`contextPhase: "final-report"`の同じcheckerを一度呼ぶ。中間phaseのcheck列をfinal contextへ渡さず、最終checkerが先頭6も再導出する。

最初のsnapshotを作った後、reportを返す直前に同じ順で再読込する。file identity・実byte hashの不一致、監視投影の前後差は
`READ_ONLY_CONTRACT_VIOLATED`
とし、compiler入力を返さない。

固有件数はjobだけに置く。

semantic jobの`artifactId`、source package manifestの`artifactId`、package validation reportの`package.artifactId`は完全一致させる。jobの五つの`expectedRuntime`、package manifestのruntime合否五値、semantic runnerの実測五値も三者完全一致させる。package外の元source・registryを再読込せず、manifestに固定済みの外部bindingとpackage内7 fileの自己整合を公開後検品の保証境界とする。

### 15.2 semantic validation report

schema:
`presentation-caption-semantic-output-validation-report-v001`

root field順:

1. `schemaVersion`
2. `status`
3. `failureStage`
4. `jobBinding`
5. `implementationBinding`
6. `runtimeBinding`
7. `inputBindings`
8. `checks`
9. `violations`
10. `observedProjection`
11. `compilerInput`
12. `readOnlyObservation`
13. `scope`

`status`: `passed`, `abstained`, `failed`。

`jobBinding`:
`{path, fileSha256}`

これは開始時semantic job snapshotのbindingである。report直前再読込は`jobStability`へ分離し、このhashを後読取値へ置き換えない。

`implementationBinding`のexact field順は`{gitCommit, files, dependencyFiles}`。`gitCommit`はjobの同値をexact copyし、診断値のままでHEAD一致を合否へ追加しない。`files`はjobの
`packageCore`, `semanticCore`, `semanticRunner`、
`dependencyFiles`は
`textLayoutImplementation`, `gateACore`, `gateARetainedSourceAtomsCore`, `gateARunner`
と同じ固定順・同じ`{role, path, fileSha256}`。

`runtimeBinding`は§11と同じ五つの合否値とdiagnosticsを持ち、**常に実測`runtimeObservation`由来の値**を記録する。job期待値はjobだけに保持し、reportへ期待値を実測値として複写しない。実測runtime shapeを信頼して作れないI/O・Node観測失敗はexit 2、shapeを作れた不一致はcode 7のtrusted failed reportとする。passed/abstained時だけ五つの実測値とjob期待値の一致を要求する。

`inputBindings`:

1. `sourcePackageManifest`: `{path, fileSha256, canonicalSha256}`
2. `sourcePackageValidationReport`: `{path, fileSha256, canonicalSha256}`
3. `rawSemanticOutput`: `{path, observationStatus, fileSha256, canonicalSha256}`

`rawSemanticOutput.observationStatus`は
`read`, `missing`, `observed-unsafe`, `lexically-rejected`
のいずれかで、checker contextの生observation branchをexactに要約する。pathはjob bindingのexact copyである。`read`時だけ実byte `fileSha256`を必須とし、strict decode成立時だけ`canonicalSha256`を非nullにする。strict decode不成立では実byte hashを保持してcanonicalだけnull。残る三branchは二hashともnullとする。passed/abstainedは`read`を必須とする。

source package manifest/report自体を読めず二つのreport bindingを作れない場合だけexit 2とする。raw意味出力のmissing/unsafeはcode 4/5を保存できるtrusted failed reportとし、source package側と同じ扱いへ暗黙統一しない。

`checks`は§16.3のsemantic checker 12件を固定順で全件持ち、各要素は
`{name, status, violationCodes}`
とする。statusは
`passed`, `failed`, `not_run_with_upstream_failure`,
`not_applicable_by_abstention`
の四つ。`not_applicable_by_abstention`はvalidなabstainedに対する
`compilerBuild`, `compilerInput`, `deterministicExpansion`, `determinism`
だけに使える。

validなabstainedでは`jobBinding`, `implementationBinding`, `inputBinding`, `runtimeBinding`, `packageShape`, `semanticOutput`, `readOnlyCheck`, `jobStability`を`passed`とし、上記四件だけを`not_applicable_by_abstention`とする。compilerを呼んでいない`compilerBuild`をpassedと偽らず、同時にabstainedを`BUILD_FAILED`扱いにしない。

`failureStage`はpassedまたはabstainedなら`null`、failedなら固定順で最初にfailedとなったcheck名。
`violations`は`{code, path, details}`で、detailsは常に空object。

`observedProjection`:

1. `containerCount`
2. `meaningGroupCount`
3. `lineCount`
4. `boundaryCandidateCount`
5. `sourceAtomCount`
6. `maximumObservedLineLogicalWidth`

root `status`が`passed`で、raw意味出力がcompleteとして全12 checkを通過した場合だけ、全fieldを実測値で掲載する。valid abstained、rawがcomplete形でも未知ID・逆順・幅超過・展開失敗・read-only違反・job安定性違反等でrootがfailedになった場合は、部分件数を載せず全fieldを`null`とする。意味を持たない件数を0へ捏造しない。

`compilerInput`:

- complete合格:
  `{status: "generated", canonicalSha256: <64桁>, observedByteSha256: <64桁>}`
- abstainedまたはfailed:
  `{status: "not_generated", canonicalSha256: null, observedByteSha256: null}`

reportはcompiler入力の全内容を持たない。B7は同じpure functionで再生成し、二hashをreportと照合してから使う。

`readOnlyObservation`:
`{status, beforeCanonicalSha256, afterCanonicalSha256, unchanged}`

statusは`verified`または`not-run-with-upstream-failure`。`verified`では三hash/booleanを非nullとし、`unchanged`は監視tree・job以外のinputReread・write callの全てから導く。passedまたはabstainedでは`status: "verified", unchanged: true`だけを許す。上流のsource package集合不成立で固定再読取列を作れない場合は`status: "not-run-with-upstream-failure", unchanged: null`とし、before/after hashだけを実測値で残す。前後差があればfailed、信頼できるafter投影を作れなければexit 2。

`scope`:

1. `validatedState`: `semantic-boundary-selection-only`
2. `semanticQualityVerified`: `false`
3. `naturalBreakQualityVerified`: `false`
4. `renderReadabilityVerified`: `false`

## 16. 違反コードと検査順

### 16.1 固定57 code

次の順序をexportし、実装後に増減・並べ替えない。

1. `CAPTION_B1_JOB_INVALID`
2. `JOB_FILE_MISMATCH`
3. `IMPLEMENTATION_MISMATCH`
4. `INPUT_PATH_UNSAFE`
5. `INPUT_HASH_MISMATCH`
6. `INPUT_SCHEMA_UNSUPPORTED`
7. `RUNTIME_MISMATCH`
8. `GATE_A_CONTEXT_INVALID`
9. `GATE_A_REPORT_INVALID`
10. `GATE_A_NOT_PASSED`
11. `EVIDENCE_NONDETERMINISTIC`
12. `EVIDENCE_EXPECTED_HASH_MISMATCH`
13. `PACKAGE_FILE_SET_INVALID`
14. `PACKAGE_SCHEMA_INVALID`
15. `PACKAGE_STRICT_JSON_INVALID`
16. `PACKAGE_BINDING_MISMATCH`
17. `PACKAGE_HASH_MISMATCH`
18. `MODEL_INPUT_SCHEMA_INVALID`
19. `MODEL_INPUT_PROJECTION_MISMATCH`
20. `MODEL_INPUT_FORBIDDEN_FIELD`
21. `MODEL_INPUT_LEAKAGE_DETECTED`
22. `MAPPING_SCHEMA_INVALID`
23. `MAPPING_COVERAGE_INVALID`
24. `SEMANTIC_OUTPUT_BYTES_INVALID`
25. `SEMANTIC_OUTPUT_SCHEMA_INVALID`
26. `SEMANTIC_OUTPUT_FORBIDDEN_FIELD`
27. `SEMANTIC_CONTAINER_SET_INVALID`
28. `SEMANTIC_CONTAINER_ORDER_INVALID`
29. `SEMANTIC_GROUP_INVALID`
30. `SEMANTIC_LINE_COUNT_INVALID`
31. `SEMANTIC_BOUNDARY_ID_UNKNOWN`
32. `SEMANTIC_BOUNDARY_ID_CROSS_CONTAINER`
33. `SEMANTIC_BOUNDARY_ID_DUPLICATE`
34. `SEMANTIC_BOUNDARY_ORDER_INVALID`
35. `SEMANTIC_CONTAINER_END_MISSING`
36. `SEMANTIC_LINE_WIDTH_EXCEEDED`
37. `EXPANSION_CANDIDATE_MISSING`
38. `EXPANSION_CANDIDATE_DUPLICATED`
39. `EXPANSION_CANDIDATE_ORDER_REVERSED`
40. `EXPANSION_SOURCE_ATOM_MISSING`
41. `EXPANSION_SOURCE_ATOM_DUPLICATED`
42. `EXPANSION_SOURCE_ATOM_ORDER_REVERSED`
43. `EXPANSION_CONTAINER_CROSSED`
44. `EXPANSION_TEXT_MISMATCH`
45. `EXPANSION_ANCHOR_MISMATCH`
46. `COMPILER_INPUT_SCHEMA_INVALID`
47. `COMPILER_INPUT_BINDING_MISMATCH`
48. `BUILD_FAILED`
49. `NONDETERMINISTIC`
50. `READ_ONLY_CONTRACT_VIOLATED`
51. `OUTPUT_ROOT_ALREADY_EXISTS`
52. `PUBLICATION_LOCK_UNAVAILABLE`
53. `PUBLICATION_STAGING_INVALID`
54. `PUBLICATION_INPUT_CHANGED`
55. `PUBLICATION_FAILED`
56. `PUBLISHED_PACKAGE_INVALID`
57. `PUBLICATION_PRE_RENAME_INVALID`

### 16.2 code・担当check・発火条件・path

violationの`path`はchecker contextそのものではなく、checkerが生contextから決定的に作る**validation subject**をroot `$`とする。package subjectのroot field順は
`job`, `implementationBindings`, `inputBindings`, `runtime`, `gateA`, `builds`, `packageFiles`, `modelInput`, `expansionMap`, `sourceOnlyLeakage`, `readOnly`, `publication`, `publishedPackage`、
semantic subjectは
`job`, `implementationBindings`, `inputBindings`, `runtime`, `sourcePackage`, `rawSemanticOutput`, `builds`, `expanded`, `compilerInput`, `readOnly`
と固定する。`builds`は各passes、`buildFailure`、package provenanceを同名fieldで持つ。decoded artifactは上記の論理名へ一度だけmountし、同じ事実をcontext pathとdocument pathの二つへ出さない。このsubject組立もpure checker内で行い、runnerから判定済みsubjectを受け取らない。

各rootのmountを次へ固定する。値を得られない上流不成立では、対応checkを未実行にしたうえで`null`または空配列を下記どおり置き、推測値を入れない。

- 両subjectの`job`はchecker contextのjob objectをexact copyする。`implementationBindings`は`implementationInputs`を固定role順に並べたarray。`inputBindings`はpackageではGate A入力・通常source・width入力、semanticではsource package binding・raw意味出力を各節の固定順に並べた`{role, path, fileSha256, canonicalSha256, observation, decodedValue}`arrayである。pathと二hashは該当job bindingのexact copyで、schemaにcanonical hashがないbindingでは`canonicalSha256: null`。decodedValueはreadかつstrict decode成立時だけ値、それ以外はnull。
- `runtime`は`runtimeObservation`、`gateA`はpackage contextの同名object、`readOnly`は`readOnlyProcessObservation`、`publication`は`publicationProcessObservation`をexact copyする。`publishedPackage`はpublicationのpublished観測から作る`{directoryEntries, files}`で、未観測ならnull。
- packageの`builds`は`{evidencePasses, embeddedReportPasses, packageBuildPasses, buildFailure, packageProvenance}`。各値はcontextの同名事実を一度だけmountする。
- packageの`packageFiles`は、package build pass 1がrequired objectを返した場合だけ、その`artifacts`を順序も含めてexact copyしたarrayである。各要素のexact field順は`{fileName, value, bytes, fileSha256, canonicalSha256}`。未到達またはpass 1不成立なら空配列。file名をobject keyにせず、常にarray indexで参照する。
- packageの`modelInput`, `expansionMap`, `sourceOnlyLeakage`は`packageFiles`中で固定file名に一致する要素の`value`をそれぞれ一度だけmountし、該当fileが一意に存在してstrict decode済みの場合だけobject、そうでなければnullとする。
- semanticの`sourcePackage`は`{directoryEntries, files}`。`files`は固定7 file順の`{fileName, readResult, value}`arrayで、readResultは`sourcePackageObservation.artifactReads`の同位置をexact copyし、valueはreadかつstrict decode成立時だけ値、それ以外はnull。file名をobject keyへ変換しない。
- semanticの`rawSemanticOutput`はraw observationの`{observation, value}`で、valueはstrict decode成立時だけ値、それ以外はnull。`builds`は`{compilerBuildPasses, buildFailure}`。`compilerInput`はcompiler build pass 1の正式値を一度だけmountする。`expanded`は同compilerInputのcontainer/group/line順に全`boundaryCandidateIds`と`sourceAtomIds`をそれぞれ平坦化した`{candidateIds, sourceAtomIds}`である。未到達・abstained・pass 1不成立なら両方nullとする。

このvalidation subjectはpure checker内部だけの非直列化objectであり、snapshotとbuild passに含まれるBufferを保持してよい。正式run reportへsubjectや`publicationProcessObservation`を複写しない。正式reportへ出すpublication情報は§12.1の`publicationObservation`と`publicationFailures`というJSON-safeな機械投影だけで、validatorが内部subjectから再導出して照合する。

pathはobject fieldを`.fieldName`、array indexを`[0]`形式で表すASCII JSONPath subsetだけを許す。NUL、空path、wildcard、quoted key、絶対filesystem pathを許さない。filesystem objectを指すときも、validation subject内のbinding位置を指す。複数違反は該当する最小leafごとに出し、同一`code + NUL + path`だけを重複除去する。表中の`i`, `j`, `<field>`は実配列index・実field名へ置換する生成規則であり、文字として出力しない。

| # / code | 担当check | exact trigger | path anchor |
|---|---|---|---|
| 1 `CAPTION_B1_JOB_INVALID` | package/semantic `jobBinding` | strict JSONとして読める開始jobが、該当job schemaの必須field・field順・型・enum・ID pattern・modeのいずれかを満たさない | `$.job.value`またはその最初の不正leaf |
| 2 `JOB_FILE_MISMATCH` | package formal `jobPrePublication`、package preflight/formal・semantic `jobStability` | formalでは開始時対publication直前、全modeでは開始時対report直前について、path、安全branch、三時点file identity、実byte hashのいずれかが変わる。前者は`jobPrePublication`、後者は`jobStability`へ別々に帰属し、両方不一致なら異なる二pathを保持する | `$.job.prePublicationInput`または`$.job.preReportInput` |
| 3 `IMPLEMENTATION_MISMATCH` | package/semantic `implementationBinding` | B1実装・dependency roleの集合・順序・exact path・安全性・存在・regular/nlink・実byte hash、または許可local import graphのいずれかがjobと実測で不一致 | `$.implementationBindings[i]` |
| 4 `INPUT_PATH_UNSAFE` | package/semantic `inputBinding` | 通常source/width入力またはsemantic raw出力の`inputFileObservation`から、workspace相対path規則、role別許可root、直下file、realpath、symlink/hardlink禁止のいずれかに違反するとcheckerが導く | `$.inputBindings[i].path` |
| 5 `INPUT_HASH_MISMATCH` | package/semantic `inputBinding` | 通常source/width入力またはsemantic raw出力がmissing、または安定読取した実byte/strict値のcanonical SHA-256がbindingと不一致 | `$.inputBindings[i].fileSha256`または`$.inputBindings[i].canonicalSha256` |
| 6 `INPUT_SCHEMA_UNSUPPORTED` | package/semantic `inputBinding` | packageの通常source/width JSONのschemaVersionが固定値でない、またはそのschemaの必須shapeを満たさない | 対象bindingに対応する`$.inputBindings[i].decodedValue` |
| 7 `RUNTIME_MISMATCH` | package/semantic `runtimeBinding` | Node実体のpath・存在・regular/nlink・binary hash、またはNode、ICU、locale、granularityの五値の期待・package・実測の必要な二者/三者一致が崩れる | `$.runtime` |
| 8 `GATE_A_CONTEXT_INVALID` | package `gateAContext` | Gate A job・実装3件・入力3件のpath/存在/safety/hash/schema、runtime、read-only guardから、既存Gate A checkerのexact contextを構築できない | `$.gateA` |
| 9 `GATE_A_REPORT_INVALID` | package `gateAReport` | Gate A完了報告のpath・存在・safety・実byte hashがbindingと不一致、または§7.2の組立report pass 1を既存Gate A report validatorが拒否する | `$.gateA.completionReportInput`または`$.gateA.embeddedReportPasses[0].value` |
| 10 `GATE_A_NOT_PASSED` | package `gateAReport` | 有効な内包Gate A reportのstatusが`passed`でない | `$.gateA.embeddedReportPasses[0].value.status` |
| 11 `EVIDENCE_NONDETERMINISTIC` | package `evidenceDeterminism` | 同じ固定snapshotから二度生成した境界証拠の正式byteが不一致 | `$.builds.evidencePasses` |
| 12 `EVIDENCE_EXPECTED_HASH_MISMATCH` | package `evidenceDeterminism` | 境界候補、文字所属、証拠全体のいずれかのcanonical hashがB1 job期待値と不一致 | `$.job.value.gateA.expectedEvidenceHashes.<field>` |
| 13 `PACKAGE_FILE_SET_INVALID` | package/semantic `packageShape` | package build artifactsまたはsource package rootが、固定7 file以外、欠落、追加、subdirectory、symlink、`st_nlink != 1`、固定順不一致のいずれか | packageは`$.packageFiles`、semanticは`$.sourcePackage.directoryEntries`または`$.sourcePackage.files` |
| 14 `PACKAGE_SCHEMA_INVALID` | package/semantic `packageShape` | package生成側では`package-manifest.json`と`package-validation-report.json`のouter schemaが不成立。semantic入口では外部入力となった固定7 file全件のdomain schemaを再検査し、いずれかの必須field・field順・型・enum・固定配列順が不成立。package生成側のモデル入力・対応表・漏洩reportはcode 18/22/21が所有しcode14と重ねない | packageは該当`$.packageFiles[i].value`、semanticは該当`$.sourcePackage.files[i].value`の最初の不正leaf |
| 15 `PACKAGE_STRICT_JSON_INVALID` | package/semantic `packageShape` | 固定7 fileいずれかのUTF-8、BOM、単一値、重複key、数値、surrogate、正式byte規則のいずれかが不成立 | packageは固定file順index `i`の`$.packageFiles[i].bytes`、semanticは`$.sourcePackage.files[i].readResult` |
| 16 `PACKAGE_BINDING_MISMATCH` | package/semantic `packageShape` | manifest/report/内容fileのpath・role・artifactId・runtime・相互参照が互いに不一致 | packageは`$.packageFiles[i].value`、semanticは`$.sourcePackage.files[i].value`配下の最初の不一致binding leaf |
| 17 `PACKAGE_HASH_MISMATCH` | package/semantic `packageShape` | manifest/reportに記録した実byte、canonical、content set、7 file集合hashのいずれかが再計算値と不一致 | packageは`$.packageFiles[i]`、semanticは`$.sourcePackage.files[i]`配下の最初の不一致hash leaf |
| 18 `MODEL_INPUT_SCHEMA_INVALID` | package `modelInput` | `semantic-source-input.json`について未知fieldはないが、必須field欠落、field順・型・enum・固定task/constraint shapeが不成立 | `$.modelInput`の最初の不正leaf |
| 19 `MODEL_INPUT_PROJECTION_MISMATCH` | package `modelInput` | container・候補・本文・順序・幅・制約が独立再生成値と不一致、または単一候補幅が上限超過 | `$.modelInput.containers[i]`の該当leafまたは`$.modelInput.displayConstraints` |
| 20 `MODEL_INPUT_FORBIDDEN_FIELD` | package `modelInput` | root/container/candidateにallowlist外fieldが一件以上ある | `$.modelInput`配下でUTF-16順が最初の未知field |
| 21 `MODEL_INPUT_LEAKAGE_DETECTED` | package `sourceOnlyLeakage` | package provenanceのprovided/accessed entryに許可外role/path、未記録access、実contextとの不一致がある、または`source-only-leakage-report.json`のschema・5検査が許可由来だけを証明できない | `$.builds.packageProvenance`、`$.sourceOnlyLeakage`、または`$.inputBindings[i]` |
| 22 `MAPPING_SCHEMA_INVALID` | package `expansionMap` | `deterministic-expansion-map.json`の必須field・field順・型・固定binding shapeが不成立 | `$.expansionMap`の最初の不正leaf |
| 23 `MAPPING_COVERAGE_INVALID` | package `expansionMap` | 候補/atomの欠落・重複・逆順・container越え、未知ID、anchor・幅・モデル入力binding不一致 | `$.expansionMap.containers[i].candidates[j]` |
| 24 `SEMANTIC_OUTPUT_BYTES_INVALID` | semantic `semanticOutput` | raw出力がfatal UTF-8、BOMなし単一JSON valueとして読めない、重複key・code fence・trailing text等を含む | `$.rawSemanticOutput` |
| 25 `SEMANTIC_OUTPUT_SCHEMA_INVALID` | semantic `semanticOutput` | strict byteは成立し未知fieldもないが、complete/abstained root union、root field順・型・enum、container objectの必須field/順序/型、`meaningGroups`のarray型が不成立。個々のgroup shape・空group・行数はcode 29/30へ委ねる | `$.rawSemanticOutput.value`の最初の不正leaf |
| 26 `SEMANTIC_OUTPUT_FORBIDDEN_FIELD` | semantic `semanticOutput` | text、時刻、reason、score、自由IDその他allowlist外fieldを含む | `$.rawSemanticOutput.value`配下でUTF-16順が最初の未知field |
| 27 `SEMANTIC_CONTAINER_SET_INVALID` | semantic `semanticOutput` | completeのcontainer ID集合がpackageの集合と一致せず、欠落・追加・重複がある | `$.rawSemanticOutput.value.containers` |
| 28 `SEMANTIC_CONTAINER_ORDER_INVALID` | semantic `semanticOutput` | container集合は同じだがpackage順と不一致 | 最初に順序が違う`$.rawSemanticOutput.value.containers[i].containerId` |
| 29 `SEMANTIC_GROUP_INVALID` | semantic `semanticOutput` | meaningGroupsが空、groupがobjectでない、必須`lineEndBoundaryCandidateIds`が欠落・arrayでない、または未知field以外の理由でgroup exact shapeが不成立。未知fieldだけならcode 26へ帰属し本codeを重ねない | `$.rawSemanticOutput.value.containers[i].meaningGroups[j]` |
| 30 `SEMANTIC_LINE_COUNT_INVALID` | semantic `semanticOutput` | 一groupの行末ID配列lengthが1または2でない | `$.rawSemanticOutput.value.containers[i].meaningGroups[j].lineEndBoundaryCandidateIds` |
| 31 `SEMANTIC_BOUNDARY_ID_UNKNOWN` | semantic `semanticOutput` | IDがpackage全体のlookupに存在しない | `$.rawSemanticOutput.value.containers[i].meaningGroups[j].lineEndBoundaryCandidateIds[k]` |
| 32 `SEMANTIC_BOUNDARY_ID_CROSS_CONTAINER` | semantic `semanticOutput` | IDは存在するが現在のcontainer所属でない | `$.rawSemanticOutput.value.containers[i].meaningGroups[j].lineEndBoundaryCandidateIds[k]` |
| 33 `SEMANTIC_BOUNDARY_ID_DUPLICATE` | semantic `semanticOutput` | 同一container内で同じ行末IDを二度以上使う | 二回目以降の`$.rawSemanticOutput.value.containers[i].meaningGroups[j].lineEndBoundaryCandidateIds[k]` |
| 34 `SEMANTIC_BOUNDARY_ORDER_INVALID` | semantic `semanticOutput` | lookup位置が直前の行末位置以下となる | 最初の逆順`$.rawSemanticOutput.value.containers[i].meaningGroups[j].lineEndBoundaryCandidateIds[k]` |
| 35 `SEMANTIC_CONTAINER_END_MISSING` | semantic `semanticOutput` | 最後の行末IDがcontainer最後の候補IDでない | `$.rawSemanticOutput.value.containers[i].meaningGroups` |
| 36 `SEMANTIC_LINE_WIDTH_EXCEEDED` | semantic `semanticOutput` | 展開した一行の固定幅合計または本文再計算幅が36を超える | 該当する`$.rawSemanticOutput.value.containers[i].meaningGroups[j].lineEndBoundaryCandidateIds[k]` |
| 37 `EXPANSION_CANDIDATE_MISSING` | semantic `deterministicExpansion` | 展開後candidate列にpackage候補が一件以上現れない | `$.expanded.candidateIds` |
| 38 `EXPANSION_CANDIDATE_DUPLICATED` | semantic `deterministicExpansion` | package候補が展開後に二度以上現れる | 二回目以降の`$.expanded.candidateIds[i]` |
| 39 `EXPANSION_CANDIDATE_ORDER_REVERSED` | semantic `deterministicExpansion` | 展開候補のlookup位置が直前以下 | 最初の逆順`$.expanded.candidateIds[i]` |
| 40 `EXPANSION_SOURCE_ATOM_MISSING` | semantic `deterministicExpansion` | expansion map上のatomが展開後に現れない | `$.expanded.sourceAtomIds` |
| 41 `EXPANSION_SOURCE_ATOM_DUPLICATED` | semantic `deterministicExpansion` | atomが展開後に二度以上現れる | 二回目以降の`$.expanded.sourceAtomIds[i]` |
| 42 `EXPANSION_SOURCE_ATOM_ORDER_REVERSED` | semantic `deterministicExpansion` | atomの固定位置が直前以下 | 最初の逆順`$.expanded.sourceAtomIds[i]` |
| 43 `EXPANSION_CONTAINER_CROSSED` | semantic `deterministicExpansion` | 一行または一groupが複数containerの候補/atomを含む | `$.compilerInput.containers[i].meaningGroups[j]` |
| 44 `EXPANSION_TEXT_MISMATCH` | semantic `deterministicExpansion` | compiler本文が境界証拠の候補本文連結とbyte単位で不一致 | `$.compilerInput.containers[i].meaningGroups[j].lines[k].text` |
| 45 `EXPANSION_ANCHOR_MISMATCH` | semantic `deterministicExpansion` | compiler lineの開始/終了anchorが先頭/末尾候補の固定anchorと不一致 | `$.compilerInput.containers[i].meaningGroups[j].lines[k].startAnchor`または`$.compilerInput.containers[i].meaningGroups[j].lines[k].endAnchor` |
| 46 `COMPILER_INPUT_SCHEMA_INVALID` | semantic `compilerInput` | compiler入力の必須field・field順・型・ordinal・固定配列順が不成立 | `$.compilerInput`の最初の不正leaf |
| 47 `COMPILER_INPUT_BINDING_MISMATCH` | semantic `compilerInput` | package・raw意味出力のpath/実byte/canonical bindingが入力snapshotと不一致 | `$.compilerInput.sourcePackageBinding`または`$.compilerInput.semanticOutputBinding`配下の最初の不一致leaf |
| 48 `BUILD_FAILED` | package `evidenceBuild` / `embeddedReportBuild` / `packageBuild`、semantic `compilerBuild` | 当該stageの全前提checkがpassedなのにpure builderが例外を返す、required objectを返せない、またはpass専用Buffer copyを変更する。`buildFailure.stage`により一つの担当checkへだけ帰属する。valid abstainedは該当しない | `$.builds.buildFailure` |
| 49 `NONDETERMINISTIC` | package `gateAReport` / `determinism`、semantic `determinism` | 同一snapshotから二度作ったembedded Gate A report、package、またはcompiler入力の正式byteが不一致。embedded reportは`gateAReport`、残る二種は`determinism`へ帰属する | `$.builds.embeddedReportPasses`、`$.builds.packageBuildPasses`、または`$.builds.compilerBuildPasses` |
| 50 `READ_ONLY_CONTRACT_VIOLATED` | package `readOnlyPreflight` / semantic `readOnlyCheck` | job除外後の監視投影が期待/前後で不一致、job以外の実装・入力/package/raw出力・Nodeの初回/最終observationが不一致、またはpreflightで書込が観測される | `$.readOnly` |
| 51 `OUTPUT_ROOT_ALREADY_EXISTS` | package `publication` | formal root、work、lockのいずれかが開始時に存在する | `$.job.value.publication.formalOutputPath` |
| 52 `PUBLICATION_LOCK_UNAVAILABLE` | package `publication` | lock作成が`EEXIST`、作成直後identityがdirectoryでない、rename直前または削除直前のkind/dev/inoが作成直後と不一致。純I/O失敗は含めない | create/post-create/releaseは`$.publication.lock`、rename直前不一致は`$.publication.preRename.lockIdentity` |
| 53 `PUBLICATION_STAGING_INVALID` | package `publication` | work内固定7 fileの集合、strict JSON、hash、binding、regular file、`st_nlink == 1`のいずれかが不成立 | `$.publication.staging` |
| 54 `PUBLICATION_INPUT_CHANGED` | package `publication` | 公開直前のjob以外の全入力・実装・Node observationが開始時と不一致 | `$.publication.inputRecheck.observations` |
| 55 `PUBLICATION_FAILED` | package `publication` | lock create/stat/release、work作成・write・fsync、rename、親directory sync、staging/published読取など、上記専用codeに該当しない純I/O失敗でtrusted failed reportを作れる | §4.4で固定した該当`$.publication.<stage>...failurePoint` leaf。一run内の複数failure pointは別pathで全件保持 |
| 56 `PUBLISHED_PACKAGE_INVALID` | package `publishedPackage` | rename後rootの固定7 file集合、strict JSON、hash、binding、regular file、`st_nlink == 1`、observed file setのいずれかが不成立 | `$.publishedPackage` |
| 57 `PUBLICATION_PRE_RENAME_INVALID` | package `publication` | rename直前にformal rootが再出現した、source/target parentの一方がdirectoryでない、または二parentのdevが不一致。開始時存在・lock identity不一致・純I/O失敗は含めない | `$.publication.preRename.formalRoot`、`$.publication.preRename.sourceParentIdentity`、または`$.publication.preRename.targetParentIdentity` |

codeの担当checkは上表以外へ移さない。同じ事象が上流codeに該当する場合は、§16.4の抑制に従い下流codeを作らない。schema不成立と未知fieldが併存するときは未知fieldへ`*_FORBIDDEN_FIELD`、残る不足・型・順序へ`*_SCHEMA_INVALID`をそれぞれ出す。raw byte不成立時はschema/forbiddenを走らせない。

### 16.3 check順

package checker:

1. `jobBinding`
2. `implementationBinding`
3. `inputBinding`
4. `runtimeBinding`
5. `gateAContext`
6. `evidenceBuild`
7. `evidenceDeterminism`
8. `embeddedReportBuild`
9. `gateAReport`
10. `packageBuild`
11. `packageShape`
12. `modelInput`
13. `expansionMap`
14. `sourceOnlyLeakage`
15. `determinism`

package runnerは、この15件へmode別に次を足す。

- preflight: `readOnlyPreflight`, `jobStability`
- formal: `jobPrePublication`, `publication`, `publishedPackage`, `jobStability`

semantic checker:

1. `jobBinding`
2. `implementationBinding`
3. `inputBinding`
4. `runtimeBinding`
5. `packageShape`
6. `semanticOutput`
7. `compilerBuild`
8. `compilerInput`
9. `deterministicExpansion`
10. `determinism`
11. `readOnlyCheck`
12. `jobStability`

package側のcheck statusは
`passed`, `failed`, `not_run_with_upstream_failure`
の三つ。

semantic側は同三つに加え、§15.2で限定した
`not_applicable_by_abstention`
を許す。

上記は正式reportに保存できるstatus集合である。pure checkerの中間phase返値だけは追加で`not_evaluated_in_phase`を許し、phaseより後ろのcheckへ使う。violationCodesは必ず空で、正式run/validation report・package内report・report validator入力へ現れた場合は不成立とする。これは上流失敗を表す`not_run_with_upstream_failure`とは別の内部状態である。

### 16.4 併発・抑制

- jobのouter shapeが読めなければ、job依存の後続checkを`not_run_with_upstream_failure`にする。
- strict JSON byte不成立なら、そのdocumentのschema・binding・意味検査を走らせない。
- package生成側の固定7 file schema所有権は一意に分ける。`segmenter-boundary-evidence.json`と`embedded-gate-a-validation-report.json`はGate A既存checker/validatorとcode 16/17、`semantic-source-input.json`はcode 18〜20、`deterministic-expansion-map.json`はcode 22/23、`source-only-leakage-report.json`はcode 21、manifestとpackage validation reportだけはcode 14が担当する。同じ不正をcode 14と個別codeへ重ねない。semantic入口はpackage生成checkを再演せず、外部package七fileのdomain schema全体をcode14で再検査した後、code16/17で相互binding/hashを検査する。
- semantic rawの未知fieldはcode 26だけへ帰属する。未知fieldを除いてもroot/container scaffoldが不成立ならcode 25を併発できるが、groupの未知fieldだけを理由にcode 29を重ねない。code 25がcontainer/meaningGroupsのarray型まで作れない場合、code 27〜36は`semanticOutput` check内でも推測実行しない。
- `gateAContext`が不成立なら全buildと後続検査を走らせない。`evidenceBuild`または`evidenceDeterminism`が不成立ならembedded report build以降を走らせない。`embeddedReportBuild`または`gateAReport`が不成立ならpackage build以降を走らせない。`packageBuild`が不成立ならpackageShape以降を走らせない。
- package manifest/reportが不成立ならsemantic outputを展開しない。
- semantic rawが`abstained`なら違反0、compiler build・後続展開は`not_run_with_upstream_failure`ではなく「適用なし」としてreportの`compilerInput.status`を`not_generated`にする。
- semantic rawが`abstained`なら`compilerBuild`, `compilerInput`, `deterministicExpansion`, `determinism`のcheck statusを`not_applicable_by_abstention`にする。
- compiler builderが運搬shapeを返した後は、`compilerInput`で§14.1 schemaとbindingを先に検査する。ここがfailedなら`deterministicExpansion`と`determinism`を`not_run_with_upstream_failure`とし、欠落fieldから展開を推測しない。`compilerInput`がpassedした場合だけ展開完全性を検査する。
- semantic rawが不成立なら、可能な限り同じ階層の違反を全て収集するが、未知IDの先を推測して展開しない。
- `readOnlyPreflight`, `readOnlyCheck`, `jobStability`は、意味/build/publicationの品質検査とは独立した後置検査である。必要な生観測を取得できる限り、前のcheckがfailedでも実行し、結果を`passed`または`failed`で残す。固定role列自体を作れない上流不成立時だけ`not_run_with_upstream_failure`を許す。formalの`jobPrePublication`がfailedならpublication/publishedPackageだけを未実行にし、最後の`jobStability`はreport前観測を取得できる限り実行する。
- `publishedPackage`は公開後7 file観測が完成した場合、後続のlock releaseだけが失敗して`publication`がfailedでも実行する。rename前停止、rename I/O、親directory sync I/O、published read I/Oで固定7 file観測を完成できない場合は`not_run_with_upstream_failure`。これにより「公開内容はvalidだがcleanupがfailed」を両checkで分離して残す。
- violationはcode固定順、同code内はpathのUTF-16 code unit順。`code + NUL + path`で重複除去する。
- detailsは常に空object。原因推測は人間向け報告へ分離する。

### 16.5 check列とroot違反の一意な対応

全reportで、rootの`violations`を先に§16.1のcode順、同code内pathのUTF-16 code unit順へ並べる。各checkの`violationCodes`は、root `violations`のうち§16.2でそのreport種別・check名・必要な場合はpathへ割り当てられたcodeを一件以上持つものだけを、§16.1順へdistinct化した配列とする。code 2は`prePublicationInput`なら`jobPrePublication`、`preReportInput`なら`jobStability`へだけ入れる。同一runで両方が不一致ならroot violationsへ二pathを保存し、code配列上は二checkがそれぞれcode 2を一度持つ。code 48/49もstage/pass fieldから担当checkを一意に決める。空にする、重複させる、順序を変える、別checkのcodeを混ぜる自由を持たせない。

状態は次から機械的に決める。

- 中間phaseの、phaseより後ろにあるcheckは`not_evaluated_in_phase`かつviolationCodes空。中間checker返値のroot status/failureStageは、実行済みprefixだけから同じ規則で決める。この内部statusを正式reportへ写さない。
- 実行したcheckは、対応する`violationCodes`が空なら`passed`、一件以上なら`failed`。
- 上流不成立で実行しなかったcheckは`not_run_with_upstream_failure`で、`violationCodes`は空。
- valid abstainedで適用外になったsemantic四checkだけは`not_applicable_by_abstention`で、`violationCodes`は空。
- package rootは、全checkが`passed`なら`passed`、一件でも`failed`なら`failed`。
- semantic rootは、completeで全check passedなら`passed`、valid abstainedで§15.2の状態列に完全一致すれば`abstained`、一件でもfailedなら`failed`。
- `failureStage`はrootがfailedのときだけ、check固定順で最初の`failed`名。それ以外は`null`。
- `not_run_with_upstream_failure`があるのに、それより前に`failed`が一件もないreportは不成立。

formal package内の二reportは全check passed・root passedだけを保存する。run reportとsemantic validation reportのvalidatorは、上記対応をroot `violations`から再計算して実byteのcheck列と完全一致させる。

## 17. CLI契約

### 17.1 package runner

起動:

`node evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs <job-json-path>`

- 位置引数はjob path一つだけ。
- stdin、環境変数、cwdによる入力・出力・実装差し替えなし。
- job pathはworkspace内の許可rootとschemaで検査する。

### 17.2 semantic runner

起動:

`node evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs <job-json-path>`

同じくjob path一つだけ。raw output pathはjobからだけ読む。

### 17.3 exitとstream

| exit | 意味 | stdout | stderr |
|---:|---|---|---|
| 0 | trustedなpassed report | 正式report JSON 1件 | 空 |
| 1 | trustedなfailed report、またはvalidなabstained report | 空 | 正式report JSON 1件 |
| 2 | 使い方誤り、内部異常、trusted reportを作れないI/O失敗 | 空 | 固定診断1行 |

exit 2で部分reportを正式結果として出さない。stack trace、絶対path、秘密値を正式streamへ出さない。

exit 2のstderrは、次のASCII token一件とLFだけに固定する。

| runner | 条件 | stderr |
|---|---|---|
| package | 位置引数が一件でない | `CAPTION_B1_PACKAGE_CLI_USAGE_INVALID\n` |
| package | job pathが許可root外、jobを安定読取/strict decodeできない、またはjob schema全体が不成立 | `CAPTION_B1_PACKAGE_CLI_JOB_CONTEXT_UNAVAILABLE\n` |
| package | 予期しない例外、または作ったrun reportを自分のvalidatorが拒否 | `CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID\n` |
| semantic | 位置引数が一件でない | `CAPTION_B1_SEMANTIC_CLI_USAGE_INVALID\n` |
| semantic | job pathが許可root外、jobを安定読取/strict decodeできない、またはjob schema全体が不成立 | `CAPTION_B1_SEMANTIC_CLI_JOB_CONTEXT_UNAVAILABLE\n` |
| semantic | 予期しない例外、または作ったvalidation reportを自分のvalidatorが拒否 | `CAPTION_B1_SEMANTIC_CLI_INTERNAL_REPORT_INVALID\n` |

strict JSONとしてjob objectを安定読取できても、package/semanticともjob schema全体が不成立なら`*_JOB_CONTEXT_UNAVAILABLE`でexit 2とし、mode・binding・report形を推測しない。pure checkerの合成検査だけが不成立job valueへ`CAPTION_B1_JOB_INVALID`を発火させ、code集合の完全性を検査する。

## 18. 安定読み取りと公開

### 18.1 入力の固定順

package runnerは次の順で読む。

1. B1 package job。
2. Gate A job。
3. Gate A完了報告。
4. Gate A job記載の実装file順。
5. Gate A job記載の入力file順。
6. B1 job記載の実装file順。
7. width policy bindingの固定role順。
8. Node実体。

各fileは、symlinkを拒否し、`O_RDONLY | O_NOFOLLOW`で開き、open前lstat、open後fstat、読込後fstatを比較する。全時点でregular fileかつ`st_nlink === 1`を必須とし、device、inode、size、mtime nanosecond、link countが読込中に変われば拒否する。hashは開いたfile descriptorのbyteから計算する。

package preflightは、core検査後・trusted report直前に上記2〜8を同じrole順で再読込する。semanticは§15.1の固定順からjobを除いた実装・dependency 4件・source package 7件・raw意味出力・Node実体を同様に再読込する。両方とも、初回と最終の固定列を§4.2 `readOnlyProcessObservation.inputReread`へ生observationとして渡し、runnerが先にsame booleanへ畳まない。

formal modeは正式公開直前に上記2〜8（B1 package job以外）を同じ順で再読込し、最初のsnapshotとfile identity・byte hashが一致しなければ
`PUBLICATION_INPUT_CHANGED`
で停止する。結果を見てjob hashを更新しない。

formal packageはcore 15 checkの直後・publicationの`initialPaths`観測より前にもCLI引数jobを安定読込し、`jobPrePublication`で開始snapshotと比較する。同checkがfailedならpublicationへ入らない。さらにpackageの両modeとsemanticは、trusted reportを組み立てる直前にCLI引数jobを必ず安定読込し、`jobStability`で開始snapshotと比較する。各比較はpath、安全branch、三時点stat、ancestor/realpath観測、実byte hashの完全一致を要求し、不一致は
`JOB_FILE_MISMATCH`
とする。package preflightでは、監視投影からjob一件を除外したことを開始時・report直前の二時点比較で補う。formal modeは開始時・publication直前・report直前の三時点をそれぞれ保持し、後二回を同一観測として省略しない。公開前差し替えと公開処理後の差し替えを別check・別pathで検出する。job自身に自己hash fieldは追加しない。

codeの所有範囲は排他的にする。CLI引数jobの開始/publication直前差と開始/report直前差はcode 2だけを別pathへ出し、package preflight/semanticにおけるjob以外の入力再読込差・監視tree差・write観測はcode 50だけ、formal公開直前のjob以外の入力差はcode 54だけである。同じ差へ二codeを併発させない。

### 18.2 preflight

`read-only-preflight`は、監視rootの開始前一覧と実byte hash投影を作り、処理後に再取得する。packageをメモリ内で二度作るだけで、lock・work・tmp・formal output・failure artifactを作らない。不変でなければ
`READ_ONLY_CONTRACT_VIOLATED`
。

packageを二度組み立てた時点で`contextPhase: "core-gate"`のpackage checkerを一度呼び、先頭15 checkを判定する。その成否にかかわらず、固定role列を構成できる限り監視root後観測・非job入力再読込・job report直前再読込を行い、`contextPhase: "final-report"`の同じcheckerを一度呼んで正式run reportを作る。core-gate返値をfinal-report contextへ入れず、最終checkerが先頭15も再導出する。package preflightで`publication-gate`は呼ばない。

監視投影は、監視root直下とその既存の全子孫から`excludedPaths`の一fileだけを除き、workspace相対pathのUTF-16順で並べた
`{path, kind, contentSha256}`列のcanonical SHA-256とする。`kind`は`file`, `directory`, `symlink`だけを許す。directoryの`contentSha256`は`null`、regular fileは開いたfile descriptorの実byte SHA-256、symlinkは追跡せず`readlink`で得たlink textのUTF-8 byte SHA-256を持つ。socket、device、FIFO等は不成立とする。既存tree内のsymlinkを存在だけで不合格にせず、link自体の追加・削除・target文字列変更を検出する。開始前の値はjobの`readOnlyGuard.expectedBeforeCanonicalSha256`と一致させ、処理後も同じ値でなければならない。

### 18.3 formal publication

formal rootを`R`とすると、同じ親に次を使う。

- lock directory: `R + ".lock"`
- work directory: `R + ".work"`

手順:

1. B1 jobと全入力を§18.1順に安定読込し、`contextPhase: "core-gate"`のpackage checkerを一度呼ぶ。同checkerが§16.3の先頭15 checkをstage順で副作用なしに導出する。15 checkのいずれかがfailedなら、`jobPrePublication`とpublicationへ入らず、両checkとpublishedPackageを`not_run_with_upstream_failure`とする。
2. 15 checkが全てpassedした場合だけ、B1 jobを二度目に安定読込し、その生観測を入れた`contextPhase: "publication-gate"`の同じpackage checkerを一度呼ぶ。開始snapshotとの一致を`jobPrePublication`で検査し、failedなら`initialPaths`以降を全てnot-attemptedとし、publication/publishedPackageへ入らない。
3. `jobPrePublication`までpassedした場合だけ、`R`, lock, workが全て不存在であることを確認する。
4. lock directoryを排他的に作る。既存なら停止する。
5. lock作成直後のidentityを取得する。directoryでない、または取得不能なら公開処理へ進まない。
6. work directoryを新規作成し、固定7 fileだけを書く。
7. 各fileは§7.1順に、`openWriteExclusive`、`writeAllBytes`、file handle `sync`、`statBigInt`、`close`を完了してから次fileへ進む。並列書込みしない。
8. 7 file完了後、work directoryを`openDirectoryReadOnly`し、directory handle `sync`、`statBigInt`、`close`の順で永続化する。
9. work内を読み直し、directory entry全件と固定7 fileのraw read結果を保存する。`contextPhase: "publication-staging-gate"`の同じcheckerを呼び、先行checkが全てpassedかつ`publication`が`not_evaluated_in_phase`の場合だけ手順10へ進む。failedならrenameへ進まず安全なlock cleanupだけを手順14どおり実施する。
10. B1 job以外の全入力を§18.1の固定順で再読込して生観測を保存する。`contextPhase: "publication-input-gate"`の同じcheckerを呼び、先行checkが全てpassedかつ`publication`が`not_evaluated_in_phase`の場合だけ手順11へ進む。failedならrenameへ進まず安全なlock cleanupだけを行う。
11. rename直前観測を次の固定順で行う。(a) `lstatBigInt(lock)`で作成直後identityとのkind/dev/ino一致を確認する。不一致またはI/O失敗ならrenameもcleanupも行わない。(b) `lstatBigInt(R)`で`R`がなお不存在であることを確認する。再出現またはI/O失敗ならrenameせず、(a)で所有を再確認できたlockだけを手順14でcleanupする。(c) work parent、R parentの順に`lstatBigInt`し、両方がdirectoryで同一devであることを確認する。全生観測を§4.4 `preRename`へ残し、成功時のlock中間stateを`pre-rename-owned`とする。ここで`contextPhase: "publication-pre-rename-gate"`の同じcheckerを呼ぶ。先行checkが全てpassedかつ`publication`が`not_evaluated_in_phase`の場合だけwork directoryを同一filesystem内renameで`R`へ移す。failedならrenameを呼ばず、所有を再確認できたlockだけを手順14でcleanupする。copy publicationはしない。
12. rename直後に親directoryを`openDirectoryReadOnly`し、directory handle `sync`、`statBigInt`、`close`の順で永続化し、四operationの生結果を`parentDirectoryDurability`へ保存する。open失敗では後続を呼ばない。sync失敗ではstatを呼ばずcloseだけを一度試みる。stat失敗でもcloseを一度試みる。closeを含む一件以上のI/O失敗があればpublished読取へ進まず、各失敗を同fieldへ保持したtrusted failed reportを作る。
13. `R`を読み直し、directory entry全件と固定7 fileのraw read結果から、7 fileとhash・相互参照を検品する。
14. 成功・trusted失敗のどちらでも、lock作成直後にvalidなdirectory identityを取得済みで、かつrename直前確認でidentity不一致またはstat I/O失敗が起きていなければ、report構築前に削除直前identityを取得する。作成直後とkind/dev/inoが完全一致した場合だけ`removeEmptyDirectory`を一度呼ぶ。不一致なら削除しない。作成直後stat失敗、identity非directory、rename直前identity不一致・stat I/O失敗では安全な所有証拠がないためcleanupを試みず、§4.4の該当branchを残す。lock削除後に追加のdirectory syncは行わず、packageの合否をlock削除の永続性へ広げない。
15. 最後にB1 jobを三度目に安定読込し、全生観測を入れた`contextPhase: "final-report"`の同じpackage checkerを一度呼ぶ。開始snapshotとの一致を`jobStability`で検査してからreportを構築する。publication途中のtrusted失敗があっても、この観測を取得できる限り実行する。report直前観測が分類不能I/Oならexit 2、missing/unsafe/hash差ならcode 2を`$.job.preReportInput`へ残す。report validatorはこのfinal-report contextだけを再投入し、中間phaseの返値を信頼しない。

上記はadapter methodの唯一の呼出順である。合成test adapterの`invocationOrdinal`は、この逐次順を1始まりで数える。fileごとのwrite/sync/close、work directory sync、rename直前4確認、rename、親directoryのopen/sync/stat/close、lock releaseを並べ替えない。上流15 check不合格では手順2以降のpublication前再読込・公開処理を呼ばず、`jobPrePublication`不合格では手順3以降を呼ばない。どちらでもreport前の`jobStability`観測は取得できる限り行う。作成直後にvalidなlock identityを得た後でtrusted失敗になり、rename直前に所有不明へ転じていない場合だけ、手順14のlock確認・削除を必ず実行し、その結果を§4.4のlock unionへ残す。identityを確立できなかったbranch、rename直前lock mismatch、rename直前lock stat I/O失敗ではcleanupしない。workや公開rootを失敗時に削除・巻き戻ししない。

lock directory作成直後に、directoryかつsymlinkでないことを確認できたvalid identityの`dev`と`ino`だけをprocess内へ保持する。取得不能・非directory・symlinkだった場合は所有証拠がないためcleanupしない。valid identityを保持できた場合だけ、削除直前に同じ二値・directory・symlinkでないことを再確認する。不一致なら自分のlockではないため削除せず`PUBLICATION_LOCK_UNAVAILABLE`で停止する。workと公開rootの7 fileは全てregular fileかつ`st_nlink === 1`、directoryは`st_nlink`を合否に使わない。workと`R`の親directoryは同一`dev`でなければならず、rename前後で7 fileの`dev`・`ino`・実byte hashが変われば不成立とする。

このpublicationの競合保証は、同じB1 production runnerと同じlock契約に従う協調processに限定する。全協調processは、`R`またはworkへ触れる前に同じlockを排他的取得しなければならない。Node/macOSの通常directory renameにはno-replace flagがないため、lockを無視した別processが不存在再確認とrenameの間に空の`R`を作る非協調raceまでは防いだと主張しない。これは`nonCooperativePublicationRaceProtected: false`として両package reportへ明示する。非協調process・人手・攻撃者との排他が必要になった場合は、no-replace renameを持つ別の公開契約版を先に設計・承認し、v001を黙って強化・緩和しない。

禁止:

- 既存`R`の上書き、merge、削除。
- 既存lock/workの自動削除。
- tmp fileを`R`直下へ先に公開。
- 不合格時の期待値短縮、許容差化。

予期した契約不成立はexit 1のreportへ残す。信頼できるreportを作れないI/O異常はexit 2で停止する。再試行は人間承認なしに行わない。

## 19. candidate 13 preflight固定値

次はcoreでなくcandidate 13用preflight jobへ置く。

| 項目 | 固定値 |
|---|---:|
| source atom | 354 |
| container | 3 |
| boundary candidate | 205 |
| container別source atom | 126 / 122 / 106 |
| container別candidate | 60 / 78 / 67 |

Gate A固定hash:

| 対象 | SHA-256 |
|---|---|
| Gate A job実byte | `e72d2f3ae91ca337cceca0c2d4ba3e5954f02372eeca0a0d02f8eb324de54ee0` |
| Gate A完了報告実byte | `99a619fd2f729ef8596d0a1fff7b35d8e4bf112b959ce404143a407ca49eaefd` |
| source atoms実byte | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |
| source generation manifest実byte | `18094dd3729eead88c498f997e883253a1481ee8a33279882350aacfcf869cf1` |
| source validation report実byte | `be32244280a2564eda9a716a83d04da38f241120a6d2ba40e72e867072fc2ae6` |
| source artifact canonical | `0bf1e10ab94388ec9521cb2270e6c339e7c7b6d8317443b469606b6b353df43c` |
| raw source atoms canonical | `cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3` |
| boundary candidates canonical | `0f8e7b07c32befc4e4703e1945b61e7656a2e978a8ba959fd169a753efe454b6` |
| source membership canonical | `b2da8ee1b3fef9c23b5598d73713d77831f392471cf98a9723392ef115ea50fd` |
| evidence canonical | `be4344dd5d97596a815a92ae283d0da3c7353600b2983e93cf53b1947c5338eb` |

runtime:

- Node binary SHA:
  `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- Node: `v20.19.6`
- ICU: `77.1`
- locale: `ja`
- granularity: `word`

これらは実装後のpreflightで結果に合わせて変更しない。不一致なら停止する。

## 20. 合成検査と完了条件

### 20.1 strict JSON

- invalid UTF-8、BOM、重複key、trailing text、複数value、code fence。
- `undefined`、非有限数、巨大指数、`-0`、BigInt。
- sparse array、追加property、accessor、`toJSON`、非plain object、symbol-key、非列挙property。
- lone surrogate拒否。
- 引用符、backslash、改行、supplementary characterの適法escapeと無変更往復。

### 20.2 package

- job、実装、入力、runtime、Gate A report・hashの不一致。
- direct実装・文字幅実装のhash不一致、renderer trust参照fileの実行、許可外local import、dynamic import、`require`。
- Gate A証拠二度生成の不一致。
- 7 fileの欠落、余分、改名、順序、schema、相互hash不一致。
- package生成側とsemantic読込側の双方でcode 13〜15を別fixtureから発火させ、外部packageを受ける側だけschema検査が抜けないこと。
- モデル入力のfield混入、source text不一致、候補順変更、幅改変。
- expansion mapの欠落、重複、別container、anchor不一致。
- manifest/reportの循環なしと二本組binding。
- preflight書込0件。
- 既存root、他者lock、staging差し替え、入力差し替え、公開後改変。

### 20.3 意味出力と展開

- complete/abstainedのexact union。
- container欠落、重複、順序変更。
- group空、0行、3行、未知field。
- 候補外ID、別container、重複、逆順、末尾不足。
- text、時刻、reason、score、自由IDの拒否。
- 幅36超過。
- 候補・source atomの欠落、重複、逆順、container越え。
- 本文・anchor・binding不一致。
- abstainedで違反0、compiler入力なし、exit 1。
- 無効回答で自動修正・partial compiler生成なし。

### 20.4 検査可能性

- 57違反codeを各一度以上、意図した正本checkerで発火させる。
- 一つのcodeに複数の担当checkがある場合は、**code×担当checkの全組合せ**を別fixtureで発火させる。code 2は`jobPrePublication`とpackage/semantic各`jobStability`、code 48は`evidenceBuild`, `embeddedReportBuild`, `packageBuild`, `compilerBuild`、code 49は`gateAReport`, package `determinism`, semantic `determinism`を全て覆う。
- package formalの`publication-staging-gate`, `publication-input-gate`, `publication-pre-rename-gate`を各々runner経路で通し、各段階の不合格が後続I/Oを呼ばず停止すること、同じ生観測を持つ`final-report`でcode/pathが完全一致すること、正式reportにはBufferを含む生観測でなく`publicationObservation`と`publicationFailures`だけが載ることを確認する。
- 四build stageそれぞれについて、pass 1/2の`thrown`, `invalid-return`を別fixtureで検査する。`input-mutated`は`package`と`compiler`のpass 1/2だけを別fixtureで検査し、Gate A二stageは`inputByteCopies: []`とscenario指定拒否を検査する。pass 1失敗時`[null,null]`、pass 2失敗時`[pass1成功,null]`、後続stage空配列、Bufferがあるstageのpass専用copy非共有、全stageの元snapshot不変をassertする。
- `PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001`と、testで観測したcode集合を完全一致assertする。
- runnerが合成検査と同じexport済みvalidatorを呼ぶことを静的・動的に確認する。
- semanticの実装binding七件と、静的import graphを実際に評価する八fileを全てhash・許可辺・builtin allowlist検査へ通し、Gate A推移dependencyを検査境界の外へ落としていないことを確認する。
- production CLIがjob path一つだけで、注入口・env overrideを持たないことを確認する。
- 境界証拠、内包Gate A report、package、compiler入力を各二度作り、二pass成功時の実byte一致とpass 1固定採用を確認する。
- CLI 0/1/2とstdout/stderr排他を実processで確認する。

### 20.5 既存回帰

B2完了条件:

- Gate A検査21/21維持。
- retained source atom検査50/50維持。
- B1新規検査全件合格。
- candidate 13読み取り専用preflight全件合格。

合格件数を「まとめて合格」とせず、package、semantic、Gate A、retained sourceの系統別に報告する。

## 21. 実装契約完全性チェックの自己適用

| 標準項目 | 本設計での固定位置 | 結果 |
|---|---|---|
| 成果物schema | §6〜§15 | 固定 |
| 許可file集合 | §7.1 | 7件で固定 |
| 採番・anchor・相互参照 | §9、§13、§14 | 固定。ID文字列の数値推測なし |
| 違反コードと固定順 | §16 | 57件で固定 |
| CLI終了コード | §17 | 0/1/2で固定 |
| 環境固定 | §6、§11、§18、§19 | 合否5値と診断値を分離 |
| 入力範囲 | §6、§8、§9、§18 | 固定 |
| 出力範囲 | §7、§12、§14、§15 | 固定 |
| 停止点 | §3、§22 | 固定 |
| 検査可能性 | §4.1〜§4.4、§16、§20 | productionとtestの同一export、pure context、filesystem adapter、失敗注入点を固定 |
| public API | §4.1 | 全export集合、引数、返却union、例外、CLI argv/streamを固定 |
| 生I/O観測 | §4.2、§4.4、§18 | 三時点stat、ancestor/realpath、unsafe/missing、package formal三時点job読取、他mode二時点job読取、directory全entryをchecker入力に固定 |
| local import信頼根 | §4.1、§4.2、§6、§15 | direct実装・文字幅実装・Gate A推移dependency三件のpath/hash、renderer trust参照fileの非実行、許可import辺と八fileの走査範囲を固定 |
| Buffer不変性 | §4.2 | 全builder passで元Buffer非公開、pass専用copy、前後hash、変異時停止を固定 |
| B2固有入力 | §19、§22 | candidate固有値をpreflight job一件へ分離し、run reportはstdout検証のみ |
| 実装者判断の残存 | 下記確認 | B2実装に必要な値は残していない |

確認済み:

- 仕事本文の正本はB3 package内の`taskDescription`一箇所。
- prompt本文をB1で作らない。
- 205・354等をcoreへ焼き込まない。
- LLM出力を本文・時刻へ使わない。
- 「読みやすい」を独自点数で採点しない。
- Gate A合格をB1 package合格へ拡張しない。
- formal packageのreport循環hashを作らない。
- 公開後にGate Aの過去の出力不存在条件を現状態へ再評価しない。
- B1のmeaning groupをB4の正式cueと呼ばない。

## 22. 実装承認時の範囲

本設計が承認された場合でも、直ちに許可されるのはB2だけである。

- 4実装fileと2 test fileの作成。
- 合成検査。
- Gate A 21件とretained source 50件の回帰。
- candidate 13用preflight job一件
  `evals/clip_composition/outputs/presentation/caption-semantic-source-package-preflight-jobs/DmWu0jVQfTE-candidate-13-caption-b1-v001.json`
  の生成・保存と、そのjobによる読み取り専用preflight一回。
- B2完了報告。

このpreflight jobはB2の検査入力であり、B3の正式7-file packageではない。jobの固有件数・hashは§19だけから固定する。CLI run reportはtest harnessがstdout byteを一回だけ捕捉してvalidatorへ渡し、独立したJSON成果物として保存しない。B2完了報告にはstdout正式byteのSHA-256、exit、check結果を記録する。preflightの結果を見てjob期待値を書き換えて再実行しない。

許可されないもの:

- formal rootへの7 file生成。
- prompt台帳の変更。
- Web版Gemini・他LLM実走。
- raw意味出力の正式作成。
- compiler入力の正式保存。
- cue、target、指示書、解決package、v003対生成。
- 描画、人間確認。

B2が合格しても、B3正式package生成は別承認である。

## 23. 人間作業量

- 今回: 設計承認1件。媒体なし、時刻入力なし、時間計測なし。
- B2: 人間作業0件。
- B3: 生成承認1件。人間作業0件。
- B6: Gemini実走承認1件。人間作業0件。
- 初描画後: 動画1本に対する「読める・ズレない・欠けない」の3判断を1セッションで依頼する予定。実媒体ができてから視聴尺と操作回数を先に申告する。

## 24. 承認依頼文

> candidate 13 基本テロップ ゲートB1完全実装契約設計v001を承認する。機械は正式354文字、205境界候補、本文、時刻、anchor、表示幅の正本を保持し、意味モデルはcontainerごとの行末境界候補IDと1〜2行のmeaning groupだけを返す。モデル出力に本文・時刻・自由ID・理由・scoreを許さず、機械が固定対応表から元文字へ戻す。source-only packageは固定7 file、唯一のformal root、strict JSON、実byte/canonical hash分離、Gate A内包検査とB1固有検査の分離、原子的公開で契約化する。意味出力はrun 1・自動再試行0とし、abstained・無効出力・候補外ID・順序変更を自動修復しない。B1は形式と追跡性だけを検査し、日本語として読めるかの合否は初描画の人間確認へ残す。承認範囲はB2の実装・合成検査・既存回帰・candidate 13読み取り専用preflightまでで、正式package、prompt、Gemini、v003対生成、描画は別承認とする。

## 25. 承認・改訂履歴

- 2026-07-23 / kawafmm承認: §24の範囲どおりB1を承認。B2の実装・合成検査・既存回帰・candidate 13読み取り専用preflightまでを許可し、正式入力生成、prompt登録、Gemini実走、指示書、描画は含めない。
- 2026-07-23 / 同時追加指定: §2.4を承認内容として追加。`gemini-3.6-flash`を将来実走の第一候補とするが定数化せず、実行構成・execution manifest・attempt分離・実測tokenに基づく費用申告へ束縛した。B2ではモデル実走を行わない。
- 2026-07-23 / B2停止: §7.2が要求する既存ゲートA`checkReport`をrunnerへ渡すpublic入口が§4.1に無いことを、実装開始後・合成検査前の照合で検出。契約を無断改訂せず停止し、途中コードを削除した。詳細は`presentation-candidate13-caption-gate-b2-night-stop-report-20260723-v001.md`へ分離した。これはB1承認の取消しではなく、実装契約追補待ちの運用状態である。
