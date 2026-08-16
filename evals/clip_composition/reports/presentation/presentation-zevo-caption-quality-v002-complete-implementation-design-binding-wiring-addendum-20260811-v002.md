# ZEVO字幕品質v002 完全実装設計 binding・ID・来歴・fade全件閉包追補 v002

- 日付: 2026-08-11
- 状態: 承認待ち・起草提示
- 開始HEAD: 542b35684a3ad67dbab042ca2bb3bff022e42023
- 親正本: presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md
- 親正本SHA-256: 44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4
- 承認済み追補v001: presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260810-v001.md
- 承認済み追補v001 SHA-256: 6de44032c8215253b1bb9e1b71b6ed33273d983d022d2f6737e3696c3609ce23
- 起草根拠: presentation-zevo-caption-quality-v002-implementation-resume-closure-stop-report-20260810-v001.md
- 起草根拠SHA-256: 7c20b6cb89d8a83327db887d200feb0552906577ffe5ef007d64877ced90ee7a
- 実装: 0 path
- 正式検査: 0件
- API通信: 0回
- 描画: 0件
- 費用: US$0

## 1. 位置づけ

本書は親正本を置換しない。親正本と本書を一組で読む。

本書は承認済み追補v001の内容を全て包含する累積追補である。v001は承認済み履歴としてbyte不変保持するが、新規formal jobのapprovedContractBindingsへv001とv002を重複登録しない。承認後の実装正本は次の3件とする。

「包含」はSHA参照だけを意味しない。v001固有のexact入口は§4.2〜4.3、staging/formal binding規則は§4.4、proof runner固定順は§4.5、owner表は§7.5、検査subcaseは§10へ規範的に再録する。これらを削ったv002実装は不成立である。

1. ZEVO字幕品質v002契約設計v001。
2. ZEVO字幕品質v002完全実装設計v001。
3. 本追補v002。

本追補v002のSHA-256は自己参照させず、提示時に実fileから算出した値を人間承認記録へ置く。formal jobは承認記録の値と実fileのstable再読SHAを照合する。

追補v001で固定したplanner v003とrender v003の配線、page/line plan bindingをrender schemaへ追加しない裁定、14 path・47 code・46検査IDの数量は全て維持する。本書はその規則をsource、B5、B6、selection、proof、reviewまで全件適用し、実装者判断を0件にする。

## 2. 実現性調査

### 2.1 現物と正本の照合

| 対象 | 現物 | SHAまたは位置 | 結論 |
|---|---|---|---|
| 親正本 | 上記path | 44fb6199...42d6e4 | byte一致 |
| 追補v001 | 上記path | 6de44032...9ce23 | byte一致・不変保持 |
| 停止報告 | 上記path | 7c20b6cb...0ee7a | byte一致 |
| source pure入口 | 親正本§3.1 | job, caseInputsの2 key | sourcePackageJobBindingの引数が不足 |
| selection admission入口 | 親正本§3.1 | 6 key | selectionJobBindingの引数が不足 |
| passed report | 親正本§5.6 | selectionBindingがnon-null必須 | selection正式保存後でないと成立しない |
| planner v003 | 追補v001 §3.1 | 8 key | 閉包済み |
| render v003 | 追補v001 §3.2 | 9 key | 閉包済み |
| preset台帳 | normal-landscape-preset-registry-v001/preset-registry.json | SHA 8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8、transition quick-fade-4f-v001 entry/exit各4 frame | 実在 |
| renderer | render_presentation_v002.mjs | SHA c90dc00456ade415e46cf8c692c49f3d08ae0ab21186b10227cdb5676f445292、808行のentry/exit除数4 | 実在 |
| 新規14 path | 親正本§3 | 14/14不存在 | forward-only追加可能 |

### 2.2 未閉包の全数

実装前に閉じる必要があるものは次の8群で尽きる。

1. source package job bindingの供給配線。
2. selection job bindingとB6/envelope/raw実byte三者一致bindingの供給配線。
3. passed selection reportのselection binding、およびselection保存失敗時のfatal reportだけを成立させる二段化。
4. top-level 8 IDのexact式。
5. common-core 2 IDの無変更転記元。
6. formal jobの承認契約binding集合。
7. preset側とrenderer側のfade値を独立取得する方法。
8. 14 path全成果物・job・raw・CLIの供給者から転記先、failure owner、旧証明oracleまでの全件表。

これ以外のschema必須field、成果物順、status、違反code、終了code、正式path、公開規則は親正本または追補v001で閉じている。新しいschema key、新code、新pathは不要である。

### 2.3 保証境界

本書が保証するのは、検証済み実byteとformal schemaの値が、明示引数を通って次工程と正式成果物へ届くことまでである。次は保証しない。

- 値からpathやSHAを再構成したものを実fileの証拠とみなすこと。
- provider内部、外部APIの決定性、未承認実体の真正性。
- UI表示からrenderer内部式を推測すること。
- 未承認の追補、旧追補v001の重複登録、暗黙の後方互換。

## 3. selection report二段化の比較と採用

### 3.1 比較

| 項目 | 案A: pure finalizer分離 | 案B: publisher capability注入 |
|---|---|---|
| selectionのno-replace保存 | runnerが所有 | admissionへ注入したcapabilityが所有 |
| stable再読とSHA | runnerの既存責務のまま | admission内からrunnerのI/Oを呼ぶ |
| reportの完成 | stable再読後にpure finalizer | capabilityの戻り値でadmission内完成 |
| rejected/abstained | 保存I/Oなしで同じfinalizer | capability未使用枝を別管理 |
| publication failure | runnerが既存ownerへ写す | admissionとrunnerのどちらがownerか増える |
| module評価・検査 | pure入口とrunnerを分離できる | I/O capabilityの型・一回性・失敗を追加検査 |
| 二重実装リスク | selection計算と保存を分離 | 保存規則をcapability側へ複製しやすい |
| 14 pathへの影響 | path #5と#6のexport/subcaseだけ | 同じpath内だがI/O contractが拡大 |

### 3.2 採用: 案A

案Aを採用する。理由は、正式fileの保存・stable再読・no-replace公開をrunnerの単一責務に保ち、admissionへI/Oを持ち込まないためである。案Bは正式publication failureのownerを二層へ分け、保存capabilityの検査を追加するが、本工事の目的であるbinding受け渡しに不要である。

### 3.3 exact module surface

selection admission入口を次へ置換する。named objectは8 key exactであり、欠落・余分を拒否する。

~~~text
admitPresentationOutputCaptionCueSelectionV001({
  job,
  selectionJobBinding,
  sourcePackage,
  b6Manifest,
  providerEnvelope,
  rawResponseBytes,
  rawResponseBinding,
  verifiedDependencies,
})
~~~

runnerはprovider envelopeとB6 manifestをstrict検証し、両者が宣言するraw response bindingをformal byteで一致させる。そのpathをstable再読し、実byteのpath・file SHAが両宣言とexact一致した後だけ、その**同じbyte object**を`rawResponseBytes`、同じbinding objectを`rawResponseBinding`として渡す。selection用`verifiedDependencies`は親正本の4 keyへ`hashRawResponseBytes`を末尾追加したexact 5 key `resolveStyle,validateResolvedStyle,buildPhysicalPageGraph,mapPiecewiseTimeline,hashRawResponseBytes`とする。formal runnerは固定literal import済みの既存export `presentation_caption_semantic_source_package_v001.mjs::sha256PresentationCaptionB1BytesV001`そのものだけを`hashRawResponseBytes`へ渡し、job・環境・別関数から選ばない。正常経路と決定性検査はこの実関数を使い、身代わり関数は拒否枝の単体検査に限る。admissionは次を全て行い、一件でも不一致なら既存`CUE_SELECTION_INPUT_BINDING_MISMATCH`の検査済み拒否にする。

1. `rawResponseBinding`がformal raw bindingのexact 2 key `path,fileSha256`である。
2. `rawResponseBinding`、`providerEnvelope.rawResponseBinding`、`b6Manifest.rawResponseBinding`がformal byteで一致する。
3. `hashRawResponseBytes(rawResponseBytes)`をexact一回呼び、戻り値がexact `status=hashed,sha256=<64 lowercase hex>`で、その`sha256`が`rawResponseBinding.fileSha256`と一致する。
4. raw本文からpathやSHAを作らない。

admissionは正式fileを書かない。module内だけで使う`reportCore`を返す。`reportCore.schemaVersion`はmodule-only literal `presentation-output-caption-cue-selection-report-core-v001`であり、formal serializer、formal decoder、formal validator、artifact bindingの受理対象にしない。exact keysは次の固定順である。

~~~text
schemaVersion
reportId
status
selectionJobBinding
sourcePackageBinding
b6ManifestBinding
providerEnvelopeBinding
rawResponseBinding
checks
violations
fatalObservation
selectionProjection
captionProjection
implementationBindings
~~~

selectionBindingがまだ存在しない点を除き、`reportCore`は親正本§5.6のformal reportに固定されたstatus別不変条件を全て満たす。passedは13 checks全passed・violations空・fatalObservation null・両projection non-null、rejectedは既存の最初の違反・blocked後段・非空violations、abstainedは既存のabstained projection、fatalはviolations空・fatalObservation non-nullを維持する。finalizerはこれらを再計算せず検証して転記する。

resultは次のexact unionとする。

| admission状態 | module間result | selection正式file |
|---|---|---|
| passed | `status=passed,value={selection,reportCore}` exact | runnerが次に保存する |
| rejected | `status=rejected,primaryCode,violations,value={reportCore}` exact | 作らない |
| abstained | `status=abstained,value={reportCore}` exact | 作らない |
| fatal | Promise rejection。exactな構造化fatalがreportCoreを保持する | 作らない |

fatalのPromise rejectionは親正本の意味を維持する。admissionは自身が所有する5段`provider-validation,case-context-reread,style-resolution,physical-layout,timeline-mapping`内で投げられたraw値だけを捕捉し、親正本の既存閉語彙へ一度写す。6段目`selection-publication`はadmission passed後のrunnerだけが所有し、下記`selectionPublicationFailure`で表す。写せない値は`UNCLASSIFIED`とし、生message、stack、stderr、provider raw、本文、secretを破棄する。reject objectはexact keys `schemaVersion,status,primaryCode,reportCore`、`schemaVersion=presentation-output-caption-cue-selection-admission-fatal-v001`、`status=fatal`である。jobまたは上流のread I/O、report自身のpublication failure、root rename failureなどreportCoreを正式公開できない枝は、親正本どおりCLI-onlyであり、このobjectを作らない。

同じpath #5へ次のpure exportを一件追加する。

~~~text
finalizePresentationOutputCaptionCueSelectionReportV001({
  reportCore,
  selectionBinding,
  selectionPublicationFailure,
})
~~~

named objectは3 key exactとする。finalizerはfile I/O、path合成、SHA計算を行わない。許可tupleと出力は次で尽きる。

| 入力tuple | formal出力 |
|---|---|
| `reportCore.status=passed`、valid formal `selectionBinding`、`selectionPublicationFailure=null` | `selectionBinding`を挿入したstatus=passed report |
| `reportCore.status=rejected`、`selectionBinding=null`、`selectionPublicationFailure=null` | `selectionBinding=null`のstatus=rejected report |
| `reportCore.status=abstained`、`selectionBinding=null`、`selectionPublicationFailure=null` | `selectionBinding=null`のstatus=abstained report |
| `reportCore.status=fatal`、`selectionBinding=null`、`selectionPublicationFailure=null` | `selectionBinding=null`のstatus=fatal report |
| `reportCore.status=passed`、`selectionBinding=null`、valid `selectionPublicationFailure` | 下記のstatus=fatal publication report |

`selectionPublicationFailure`はformal fatal observationと同じexact 7 keyで、`schemaVersion=presentation-output-caption-cue-selection-fatal-observation-v001`、`status=fatal`、`stage=selection-publication`、`innerCode`は`FILE_CHANGED_DURING_READ|OS_PERMISSION_DENIED|PUBLICATION_FAILED|UNCLASSIFIED`のexact一件、`targetFile`は実読取証拠由来の`path,fileSha256`または`null`、`toolExitCode=null`、`checkpoints`はそれ以前の正常checkpointに末尾`selection-publication/entered/inputCaptionId=null`を足した配列である。観測から`innerCode`への写像は次で尽き、最初に一致した一行だけを使う。

| selection publicationの観測 | innerCode |
|---|---|
| stable再読の前後で論理path・実体path・size・mtime・SHAのいずれかが変化 | `FILE_CHANGED_DURING_READ` |
| `EACCES`または`EPERM` | `OS_PERMISSION_DENIED` |
| no-replace書込み失敗、保存byteのstrict decode失敗、formal再serialize不一致、admission byteとの不一致 | `PUBLICATION_FAILED` |
| 上記へ写せないI/O・例外型 | `UNCLASSIFIED` |

各行をZCQ027で実発火し、raw error文字列は保存しない。

この第五tupleでは、finalizerは`reportCore`から次だけを決定的に置換する。

- `schemaVersion=presentation-output-caption-cue-selection-report-v001`
- `status=fatal`
- `selectionBinding=null`
- 13 checksは全て`passed`
- `violations=[]`
- `fatalObservation=selectionPublicationFailure`
- `selectionProjection=null`
- `captionProjection=[]`

`reportId`、job・上流・raw binding、implementation bindingsは変えない。runnerはpartial selectionを破棄し、このfatal report一件だけを失敗rootへ公開する。

最初の四tupleでは、finalizerは`reportCore.schemaVersion`をformal `presentation-output-caption-cue-selection-report-v001`へ置換し、全keyを固定順で無変更転記し、`selectionBinding`だけを所定位置へ挿入する。reportId、各binding、checks、projectionを作り直さない。返り値はformal selection report objectだけでwrapperを持たない。

上記以外のtuple、key不足・余分、型不正、reportCoreの不変条件違反ではfinalizerが同期throwする。runnerはraw errorを破棄し、formal report 0件、CLIだけ`fatal/2/artifact-publication/CUE_SELECTION_PUBLICATION_FAILED`へ固定し、検査済みstagingを保持する。別statusへの補正、fallback、部分report公開はしない。

### 3.4 runnerの固定順

1. selection jobを正式byteからstable再読し、strict decode・validateする。
2. 実job byteからformal JSON bindingを作り、job ID・basename・job SHAと照合する。
3. 全上流と実装を前読・後読し、verifiedDependenciesを得る。
4. admissionへ同じselectionJobBindingを明示引数で渡す。
5. passedならselectionをstagingへno-replace保存し、stable再読・strict decode・formal再serializeを行う。admissionの`selection` formal byte、保存実byte、再読valueのformal byte、file SHA、canonical SHAを全て一致させる。
6. 5が合格した場合だけ実fileからformal selectionBindingを作り、runnerが保持する同じ4-key objectを再構成せず`selectionPublicationFailure=null`でfinalizerへ渡す。保存実byteから得たbindingと渡すbindingのformal byteが違えばfinalizerを呼ばずpublication fatalとする。
7. selectionの書込み・stable再読・strict検証が失敗した場合はattempt所有のpartial selectionを破棄し、`lstat`で不在を確認する。不在確認が成立した場合だけ実観測から`selectionPublicationFailure`を作り、selectionBinding=nullでfinalizerを呼ぶ。不在を証明できなければformal report 0件・staging保持・CLI-onlyで停止する。
8. rejected/abstainedまたはadmission構造化fatalは、selectionBinding=null、selectionPublicationFailure=nullでfinalizerを呼ぶ。
9. reportをstagingへ保存し、stable再読・strict validateする。
10. selectionとreportの必要集合が揃った場合だけrootをatomic公開する。

passed selection保存後のreport完成・保存・再読失敗ではselectionを単独公開しない。formal root 0件、stagingを証拠保持し、CLI `fatal/2/artifact-publication/CUE_SELECTION_PUBLICATION_FAILED`で停止する。selection自身のpublication失敗だけは親正本どおりpartial selectionを破棄し、fatal report一件を公開する。rejected、abstained、admission fatalはselection 0件、report一件だけをatomic公開する。job decode前、上流read I/O、report書込み不能、rename失敗は親正本どおり正式root 0件でCLIだけを残す。

## 4. 他のexact入口

### 4.1 source builder

親正本のsource pure入口を次へ置換する。named objectは3 key exactである。

~~~text
buildPresentationOutputCaptionCueSourcePackageV001({
  job,
  sourcePackageJobBinding,
  caseInputs,
})
~~~

source runnerはjob pathのstable再読・strict decode・basename/jobId照合後、実byteからformal JSON bindingを一度だけ作る。builderはsourcePackageJobBindingがformal JSON binding exact 4 keyであることを検査し、provenance.sourcePackageJobBindingへbyteを変えず転記する。builderはjob path、file SHA、canonical SHAを作らない。job objectの再直列化をbinding証拠にしない。

### 4.2 planner v003

追補v001の8 key exact入口をそのまま維持する。

~~~text
buildPresentationOutputPageLinePlanV003({
  sourcePackage,
  selection,
  selectionReport,
  selectionReportBinding,
  meaningPackage,
  caseId,
  proofJobId,
  verifiedDependencies,
})
~~~

### 4.3 render v003

追補v001の9 key exact入口をそのまま維持する。

~~~text
buildPresentationOutputRenderPlanV003({
  outputRequest,
  outputRequestBinding,
  pageLinePlan,
  sourcePackage,
  selection,
  selectionReport,
  meaningPackage,
  proofJobId,
  verifiedDependencies,
})
~~~

plannerとrenderへpage/line plan bindingを追加しない。proof runnerがpage/line planをstable再読したvalueだけをrenderへ渡し、completionがpage/line plan bindingとrender plan bindingを対で束縛する追補v001の裁定を維持する。

### 4.4 追補v001のstaging/formal binding規則の累積包含

本節は承認済み追補v001 §2.3を規範的に再掲し、本書だけで実装できるようにする。

1. `binding.path`は検証済み`proofJob.outputRoot`と親正本§8の固定relative suffixから得る**公開後formal path**であり、staging pathをformal JSONへ保存しない。
2. file SHAとcanonical SHAは`<proofJob.outputRoot>.staging`配下の同じ固定relative suffixに実在する実byteをstable再読して得る。
3. publisherはstaging rootがformal rootのexact sibling、relative suffixが同一、両pathにsymlinkが無いことを検査する。
4. 全bindingはno-replace atomic rename前に固定する。rename成功時だけformal pathのbindingとして公開できる。
5. rename失敗は検査済みstagingを保持する公開失敗であり、rename後の再読を新しい合否条件にしない。
6. selection reportは既に別rootでformal公開済みなので、proof job記載のformal pathを直接stable再読し、兄弟pathから推測しない。

### 4.5 追補v001のproof runner 12段固定順の累積包含

caseごとの固定順は次であり、並替え・先行製造を禁止する。

1. proof jobをformal byteからstrict decode・validateする。
2. job path basenameと`proofJob.jobId`をexact照合する。
3. proof jobが宣言するselection report pathをstable再読する。
4. selection reportのfile SHA、strict decode後canonical SHA、schemaを`selectionReportBinding`へ照合する。
5. output requestを既存builderで製造し、固定case staging pathへformal serializerでno-replace保存する。
6. output requestをstable再読・strict decode・validateし、実byte SHAと§4.4のformal pathから`outputRequestBinding`を固定する。
7. plannerへ検証済みproof job ID、selection report value、selection report bindingを明示引数で渡す。
8. page/line planをformal保存・stable再読・strict検証し、§4.4のformal pathを持つbindingを固定する。
9. renderへ検証済みproof job ID、output request valueとbinding、page/line plan valueを明示引数で渡す。
10. render planをformal保存・stable再読・strict検証し、§4.4のformal pathを持つbindingを固定する。
11. 公開直前にselection report、output request、page/line plan、render planを全て再読照合する。
12. completionで同一caseのpage/line plan bindingとrender plan bindingを既存schemaどおり対で束縛する。

selection report宣言bindingと現物が違えばplannerを起動しない。output requestの保存・stable再読・strict検証が不成立ならrenderを起動しない。後段成果物の先行製造は0件である。

## 5. 正式IDのexact規則

全IDは検証済みjob IDまたは検証済み上流意味IDから作る。basename、近い兄弟ID、schemaVersionからsuffixを推測しない。以下のliteralをexactとする。

| 成果物/field | exact値 |
|---|---|
| B5 manifest / manifestId | <b5JobId>-b5-manifest |
| B5 failure report / reportId | <b5JobId>-b5-failure-report |
| provider response envelope / envelopeId | <b6JobId>-provider-response-envelope |
| B6 manifest / manifestId | <b6JobId>-b6-manifest |
| B6 failure report / reportId | <b6JobId>-b6-failure-report |
| selection report / reportId | <selectionJobId>-selection-report-v001 |
| proof completion report / reportId | <proofJobId>-completion-report-v001 |
| proof rejection report / reportId | <proofJobId>-rejection-report-v001 |
| common-core element / instructionId | そのelementを包む検証済みcue.cueIdを無変更転記 |
| targetProvenance / targetRefId | そのcueの親display.semanticCaptionIdを無変更転記 |

artifact-kindは表の右辺literalそのものであり、実装者がversion suffixを足し引きしない。provider envelopeだけは親正本の一般manifest/report規則外なので、本表の式を独立正本とする。

## 6. approvedContractBindingsのexact集合

source、B5、B6、selection、proofの全5 formal jobで、approvedContractBindingsは次の3件exact、role/path狭義昇順とする。

| role | path | SHAの検証元 |
|---|---|---|
| caption-quality-complete-implementation-design | evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md | 44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4 |
| caption-quality-complete-implementation-design-addendum | evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md | 本書提示後に実fileから算出し、人間承認記録へ置くSHA |
| caption-quality-parent-contract | evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md | 33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba |

追補v001は本追補が全内容を包含するため、formal jobへ4件目として重複登録しない。追補v001のpath・SHA・承認履歴は本書冒頭とDECISIONSに残り、監査履歴から消さない。

全5 runnerはjobを検証した後、3文書をimport前、固定literal import直後、正式root公開直前にstable再読し、jobのpath/role/SHAと一致させる。文書の値をcodeへ複製しない。3件未満、4件以上、role/path順違い、v001とv002の重複、およびimport前のSHA不一致はjob不正としてdynamic import以後0件にする。import直後の不一致は、外部通信・成果物製造前なので同じjob不正として処理本体以後0件にする。正式root公開直前の不一致は、それ以前の保存済み証拠を消さず、success root 0件、検査済みstaging保持へ固定する。sourceは`fatal/2/package-validation/CUE_SOURCE_PUBLICATION_FAILED`、B5/B6は`fatal/2/artifact-publication/CUE_API_PUBLICATION_FAILED`、selectionは`fatal/2/artifact-publication/CUE_SELECTION_PUBLICATION_FAILED`、proofは`fatal/2/artifact-publication/CUE_PROOF_PUBLICATION_FAILED`のexact一件である。ZCQ001/007/018/042は3時点を別subcaseで実発火し、通信・途中成果物の有無を時点どおり検査する。

## 7. fade値の取得と照合

新しいparser、source regex、UI定数、fallbackを作らない。次の二つを独立証拠とする。

### 7.1 preset側

- 正本path: evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json
- 現物SHA-256: 8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8
- 取得入口: 既存resolvePresentationOutputStyleV001が呼ぶ既存resolvePresentationLandscapePresetProjectionV001の検証済み戻り値。
- 要求: transitionId=quick-fade-4f-v001、entry.type=alpha-fade、entry.frames=4、exit.type=alpha-fade、exit.frames=4。

### 7.2 renderer側

- 正本path: evals/clip_composition/render_presentation_v002.mjs
- 現物SHA-256: c90dc00456ade415e46cf8c692c49f3d08ae0ab21186b10227cdb5676f445292
- 現物照合: 808行のalpha式はentryとexitの除数を共に4とする。
- 取得方式: 本追補が、上記path・SHAに対する検証済み事実 compositorFadeDivisor=4 を固定する。proof runnerは実renderer fileをstable再読し、proof jobのimplementation bindingと上記SHAを双方照合する。source本文をruntime regexで再解析しない。

### 7.3 review inputへの転記

fadeのformal計算はproof runner path #11が所有する。path #11へ次のpure exportを置き、formal proof runnerとZCQ040の双方が**同じexport**を呼ぶ。

~~~text
derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001({
  resolvedTransition,
  rendererBinding,
})
~~~

named objectは2 key exact。`resolvedTransition`は§7.1の既存resolver実戻り値、`rendererBinding`はproof jobの検証済みimplementation bindingと実renderer stable再読証拠が一致した同じobjectである。returnは次のmodule-only exact unionだけを許す。

| 観測 | exact return |
|---|---|
| renderer path/SHAが§7.2と一致し、transitionがquick-fade-4f-v001・entry 4・exit 4 | `status=passed,value={observedFadeFrameCount:4}` |
| renderer pathまたはSHAが§7.2と不一致 | `status=rejected,reason=renderer-binding-mismatch` |
| renderer一致後、transition ID/type/frameまたはpreset/renderer値が不一致 | `status=rejected,reason=transition-mismatch` |

各returnは表記したkeyだけを持つ。named argsの不足・余分・型不正、戻り値を作れない予期しない例外は同期throwとし、productionでは全入力を検証済みにしてから呼ぶため正常時に到達しない。runnerはraw errorを保存せず既存`fatal/2/renderer-work/CUE_PROOF_EXECUTION_FAILED`へ写し、review以後0件とする。このouter fatalは既存どおりZCQ044が実発火する。fallbackや値4の補正はしない。

- renderer pathまたはSHAが§7.2と不一致なら、proof job不正としてreport 0件、CLI `rejected/1/job-read/CUE_PROOF_JOB_INVALID`。import、planner、render、reviewは0件。
- renderer bindingが成立した後、resolved transitionが`quick-fade-4f-v001 / entry 4 / exit 4`でない、または固定renderer値4と一致しない場合は、rejection report `stage=style-resolution,primaryCode=CUE_PROOF_RENDER_FAILED`、CLI `rejected/1/style-resolution/CUE_PROOF_RENDER_FAILED`。review以後0件。
- success時だけproof runner自身が`reviewInput.observedFadeFrameCount=4`を組み立て、review inputを正式保存・stable再読してからreview UIへ渡す。

ZCQ040はpath #10からこのpath #11のpure exportをimportし、productionと同じresolver戻り値・renderer bindingを渡して、4/4/4の実経路と二つのmodule-only rejection branch/reasonを観測する。outer report/CLI ownerはrenderer binding不一致をZCQ042、transition不一致をZCQ043がそれぞれ一意に実発火し、ZCQ040はouter codeを所有しない。source regex、UI定数、別比較式、fallbackを作らない。renderer fileが承認済み変更で更新された場合は、本追補のrenderer側事実も別承認で更新する。

### 7.4 新規配線・ID不一致のowner一意表

新codeを作らず、次の一意な既存ownerだけを使う。「または既存owner」の選択肢を残さない。

| 観測 | formal結果 | CLI status/exit/stage/code | 後段 |
|---|---|---|---|
| source builderの`sourcePackageJobBinding` key不足・余分・型不正、またはjob実byteとの不一致 | source package 0件 | `rejected/1/input-reread/CUE_SOURCE_INPUT_BINDING_INVALID` | package build 0件 |
| selection runnerの`selectionJobBinding` key不足・余分・型不正、またはjob実byteとの不一致 | report 0件 | `rejected/1/job-read/CUE_SELECTION_JOB_INVALID` | admission 0件 |
| selection admissionのraw binding/byte不一致 | rejected report | `rejected/1/input-reread/CUE_SELECTION_INPUT_BINDING_MISMATCH` | selection 0件 |
| selection finalizerの3-key tuple不正、またはsaved selection実byteから得たbindingと渡すbindingの不一致 | report 0件、staging保持 | `fatal/2/artifact-publication/CUE_SELECTION_PUBLICATION_FAILED` | root公開0件 |
| B5 manifest ID不一致 | manifest 0件、正しいIDのfailure reportを作れる場合だけ一件 | `fatal/2/artifact-publication/CUE_API_PUBLICATION_FAILED` | success root 0件 |
| B5 failure report ID不一致 | failure report 0件、CLI-only | `fatal/2/artifact-publication/CUE_API_PUBLICATION_FAILED` | root公開0件 |
| provider envelope ID不一致 | raw保持、envelope 0件、status=rejected-provider-responseのB6 manifest | `rejected/1/envelope-validation/CUE_PROVIDER_ENVELOPE_INVALID` | selection以後0件 |
| B6 manifest ID不一致 | raw/envelope保持、正しいIDのfailure reportを作れる場合だけ一件 | `fatal/2/artifact-publication/CUE_API_PUBLICATION_FAILED` | success root 0件 |
| B6 failure report ID不一致 | failure report 0件、CLI-only | `fatal/2/artifact-publication/CUE_API_PUBLICATION_FAILED` | root公開0件 |
| selection ID不一致 | partial selection破棄、fatal selection reportを作れる場合だけ一件 | `fatal/2/artifact-publication/CUE_SELECTION_PUBLICATION_FAILED` | passed pair 0件 |
| selection report ID不一致 | finalizer不正 | `fatal/2/artifact-publication/CUE_SELECTION_PUBLICATION_FAILED` | root公開0件 |
| output request requestId/outputId不一致 | rejection report | `rejected/1/render-plan/CUE_RENDER_INPUT_INVALID` | plan以後0件 |
| page/line planId不一致 | rejection report | `rejected/1/page-line-planner/CUE_PLANNER_INPUT_INVALID` | render以後0件 |
| render planId不一致 | rejection report | `rejected/1/render-plan/CUE_RENDER_BINDING_MISMATCH` | common plan以後0件 |
| proof completion report ID不一致 | completion 0件、fatal observationが作れる場合だけ一件 | `fatal/2/completion-publication/CUE_PROOF_PUBLICATION_FAILED` | root成功公開0件 |
| proof rejection report ID不一致 | rejection 0件、fatal observationが作れる場合だけ一件 | `fatal/2/artifact-publication/CUE_PROOF_PUBLICATION_FAILED` | root成功公開0件 |
| review ID不一致 | review input 0件、fatal observationが作れる場合だけ一件 | `fatal/2/review-publication/CUE_PROOF_PUBLICATION_FAILED` | review HTML・completion 0件 |
| common core `instructionId`または`targetRefId`不一致 | rejection report | `rejected/1/render-plan/CUE_RENDER_PROJECTION_INVALID` | common plan・描画0件 |
| renderer implementation bindingのpath/SHA不一致 | report 0件 | `rejected/1/job-read/CUE_PROOF_JOB_INVALID` | import以後0件 |
| preset registry/style bindingのpath/SHA不一致 | rejection report | `rejected/1/input-reread/CUE_PROOF_JOB_INVALID` | style resolver以後0件 |
| binding成立後のtransition 4/4/4不一致 | rejection report | `rejected/1/style-resolution/CUE_PROOF_RENDER_FAILED` | review以後0件 |
| review inputのobservedFadeFrameCount不一致またはreview byte検査不成立 | fatal observationを作れる場合だけ一件 | `fatal/2/review-publication/CUE_PROOF_PUBLICATION_FAILED` | completion 0件 |
| approvedContractBindingsの3件集合・順・role/path/SHA不一致（import前または直後） | formal成果物0件 | 各jobの`rejected/1/job-read`。codeはsource=`CUE_SOURCE_JOB_INVALID`、B5=`CUE_B5_JOB_INVALID`、B6=`CUE_B6_JOB_INVALID`、selection=`CUE_SELECTION_JOB_INVALID`、proof=`CUE_PROOF_JOB_INVALID` | import前ならdynamic import以後0件、import直後なら処理本体以後0件 |
| approvedContractBindingsの公開直前SHA不一致 | success root 0件、検査済みstaging保持 | source=`fatal/2/package-validation/CUE_SOURCE_PUBLICATION_FAILED`、B5/B6=`fatal/2/artifact-publication/CUE_API_PUBLICATION_FAILED`、selection=`fatal/2/artifact-publication/CUE_SELECTION_PUBLICATION_FAILED`、proof=`fatal/2/artifact-publication/CUE_PROOF_PUBLICATION_FAILED` | それ以前の保存済み証拠は保持、root公開0件 |

proof completion/rejectionのreport publication失敗でfatal observation自身も保存不能なら、親正本どおりformal report 0件、同じCLIだけを残す。checked rejectionをfatalへ変換せず、formal report不能をpassedにしない。

### 7.5 追補v001 owner表の累積包含

承認済み追補v001 §5の既存ownerも次のまま維持する。本節と§7.4を合わせた集合がv002の全owner差分である。

| 観測 | status/owner | 後段 |
|---|---|---|
| formal proof job IDの欠落・余分・型不正 | report 0、CLI `job-read/CUE_PROOF_JOB_INVALID` | planner未起動 |
| planner named argsの欠落・余分・型不正 | rejected / `CUE_PLANNER_INPUT_INVALID` | page/line plan以後0件 |
| valid object間のreport内selection binding・入力selection・projection不一致 | rejected / `CUE_PLANNER_BINDING_MISMATCH` | page/line plan以後0件 |
| selection reportのread I/O・resource失敗 | fatal / `CUE_PROOF_EXECUTION_FAILED` | planner未起動 |
| proof job宣言bindingとselection report現物の不一致 | rejected / `CUE_PROOF_JOB_INVALID` | planner未起動 |
| render named argsの欠落・余分・型不正 | rejected / `CUE_RENDER_INPUT_INVALID` | render plan以後0件 |
| valid object間のproof job ID・request ID・request内容・plan/report/media来歴不一致 | rejected / `CUE_RENDER_BINDING_MISMATCH` | render plan以後0件 |
| output request再読byteのschema/value不成立 | rejected / `CUE_RENDER_INPUT_INVALID` | render未起動 |
| output requestの書込み・stable再読I/O・実体変化・公開失敗 | fatal / `CUE_PROOF_PUBLICATION_FAILED` | render未起動 |
| render planの書込み・公開前再読不成立 | fatal / `CUE_RENDER_PUBLICATION_FAILED` | 後段0件 |

既存rejected/fatal区分、CLI stage、終了code、正式prefix規則を変更しない。

## 8. 14 path全成果物の工程間閉包

### 8.1 適用規則

表の一行は、同じ供給者・検証時点・exact引数・consumer・転記先を持つfield群である。group化は証明の省略ではない。各fieldは親正本のexact key順を維持する。表にない必須fieldを実装者が追加・推測しない。

全formal JSONの`schemaVersion`は親正本で当該成果物に固定されたliteralだけを供給元とし、当該成果物の既存または本設計で指定済みstrict decoder/validatorが正式保存前とstable再読後にexact照合する。job/object/兄弟成果物からschemaVersionを導出せず、旧版受理・変換・fallbackを作らない。nested array/objectは親正本のexact key順・dense順序・null規則をそのまま使う。

### 8.2 formal artifact exact key inventory

本表は、本14 pathが新規製造するformal成果物と、本追補が値・来歴・受け渡しを変更するjob/入力のtop-level keyを一件ずつ固定する。意味情報パッケージ、base media、timeline、style台帳など読取専用の既存上流成果物は、親正本のschemaを変更せずbindingとして消費するため本表の再掲対象外である。nested schemaは親正本のexact key順を維持し、表中の供給区分は§8.3〜§8.10の受け渡し表へ対応する。表外keyは拒否する。

| 成果物 | exact top-level keys（固定順） |
|---|---|
| source job | `schemaVersion,jobId,packageId,meaningPackageBindings,styleLimits,caseContexts,outputPath,runtimeProfile,implementationBindings,runtimeDataBindings,approvedContractBindings` |
| source package | `schemaVersion,packageId,promptInput,reconstructionMap,provenance` |
| source `promptInput` | `schemaVersion,taskDescription,captions,styleLimits` |
| residual-risk acceptance | `schemaVersion,acceptanceId,acceptedBy,acceptedOn,sourcePackageBinding,claimVerdicts,maximumNanoUsd,scope,decisionLineBinding` |
| B5 job | `schemaVersion,jobId,attemptId,action,sourcePackageBinding,outputRoot,executionConfiguration,officialVerification,residualRiskAcceptanceBinding,spendingAuthorization,implementationBindings,approvedContractBindings` |
| B5 manifest | `schemaVersion,manifestId,status,b5JobBinding,sourcePackageBinding,generateRequestBinding,tokenCountBindings,officialSnapshot,residualRiskAcceptanceBinding,tokenProjection,costProjection,checks` |
| B5 failure report | `schemaVersion,reportId,status,b5JobBinding,stage,primaryCode,evidenceBindings,checks,implementationBindings` |
| B6 job | `schemaVersion,jobId,attemptId,action,b5ManifestBinding,generateRequestBinding,outputRoot,executionPolicy,sendAuthorization,implementationBindings,runtimeDataBindings,approvedContractBindings` |
| provider envelope | `schemaVersion,envelopeId,httpStatus,contentType,rawResponseBinding,responseModelVersion,observedServiceTier,usageMetadata,semanticText` |
| B6 manifest | `schemaVersion,manifestId,status,executedAt,b6JobBinding,b5ManifestBinding,generateRequestBinding,rawResponseBinding,providerEnvelopeBinding,transport,usageListPriceEstimate,checks,primaryRejectionCode,implementationBindings` |
| B6 failure report | `schemaVersion,reportId,status,executedAt,b6JobBinding,stage,innerCode,targetFile,evidenceBindings,checks,implementationBindings` |
| selection job | `schemaVersion,jobId,attemptId,sourcePackageBinding,b6ManifestBinding,providerEnvelopeBinding,outputRoot,runtimeProfile,implementationBindings,runtimeDataBindings,approvedContractBindings` |
| selection | `schemaVersion,selectionId,sourcePackageBinding,b6ManifestBinding,providerEnvelopeBinding,response` |
| selection report | `schemaVersion,reportId,status,selectionJobBinding,sourcePackageBinding,b6ManifestBinding,providerEnvelopeBinding,rawResponseBinding,selectionBinding,checks,violations,fatalObservation,selectionProjection,captionProjection,implementationBindings` |
| selection fatal observation（report内nested） | `schemaVersion,status,stage,innerCode,targetFile,toolExitCode,checkpoints` |
| page/line plan | `schemaVersion,planId,sourcePackageBinding,selectionBinding,selectionReportBinding,meaningPackageBinding,resolvedStyle,captionDisplays` |
| proof job | `schemaVersion,jobId,attemptId,sourcePackageBinding,selectionBinding,selectionReportBinding,cases,runtimeProfile,runtimeDataBindings,outputRoot,implementationBindings,approvedContractBindings` |
| output request | `schemaVersion,requestId,caseId,inputCaptionId,sourcePackageBinding,selectionBinding,selectionReportBinding,meaningPackageBinding,baseMediaInput,styleInput,publication` |
| render plan | `schemaVersion,planId,outputRequestBinding,sourcePackageBinding,selectionBinding,selectionReportBinding,meaningPackageBinding,baseMediaBinding,resolvedStyle,captionDisplays,titleDisplay,meaningProjection` |
| common core | `schemaVersion,format,canvas,layoutRules,elements` |
| common core element | `instructionId,kind,text,indexedLines,retainedSpans,sourceSpanEnvelopes,frameMappings,startFrame,endFrameExclusive,displayFrameCount,requestedPresetId,appliedPresetId,presetId,registryVersion,presetRegistryVersion,stateId,visualState,transition,targetProvenance,materialRefs` |
| review input | `schemaVersion,reviewId,observedFadeFrameCount,proofJobBinding,reviewQuestions,items` |
| completion report | `schemaVersion,reportId,status,proofJobBinding,sourcePackageBinding,selectionBinding,selectionReportBinding,items,reviewInputBinding,reviewHtmlBinding,checks,implementationBindings` |
| rejection report | `schemaVersion,reportId,status,proofJobBinding,stage,primaryCode,targetFile,evidenceBindings,checks,rendererWorkEvidence,retentionPaths,implementationBindings` |
| fatal observation | `schemaVersion,status,proofJobBinding,stage,innerCode,targetFile,toolExitCode,checkpoints,rendererWorkEvidence,retentionPaths` |
| renderer QC | `schemaVersion,status,instructionCount,checks,instructionEvidence,mediaEvidence,violations`。schemaVersionは`presentation-render-qc-v002`。正式filename `renderer-qc-v001.json`とschemaVersionを混同しない |
| renderer owner lock | `schemaVersion,ownerToken,processId,outputDirectory`。schemaVersionは`presentation-render-output-lock-v002`。formal proof root外の保安証拠 |
| rendered video | raw byte成果物。JSON keyを持たず、pathとfile SHAのexact 2-key byte bindingだけを持つ |

schemaVersion literalは次でexactである。

| 文書/成果物 | schemaVersion |
|---|---|
| source job | `presentation-output-caption-cue-source-package-job-v001` |
| source package | `presentation-output-caption-cue-source-package-v001` |
| source promptInput | `presentation-zevo-caption-selection-input-v001` |
| residual-risk acceptance | `presentation-output-caption-cue-residual-risk-acceptance-v001` |
| B5 job / manifest / failure | `presentation-output-caption-cue-b5-job-v001` / `presentation-output-caption-cue-b5-manifest-v001` / `presentation-output-caption-cue-b5-failure-report-v001` |
| B6 job / manifest / failure | `presentation-output-caption-cue-b6-job-v001` / `presentation-output-caption-cue-b6-manifest-v001` / `presentation-output-caption-cue-b6-failure-report-v001` |
| provider envelope | `presentation-output-caption-cue-provider-response-envelope-v001` |
| selection job / selection / report / nested fatal | `presentation-output-caption-cue-selection-job-v001` / `presentation-output-caption-cue-selection-v001` / `presentation-output-caption-cue-selection-report-v001` / `presentation-output-caption-cue-selection-fatal-observation-v001` |
| page/line plan | `presentation-output-page-line-plan-v003` |
| proof job / output request | `presentation-zevo-caption-quality-v002-proof-job-v001` / `presentation-zevo-caption-quality-v002-output-request-v001` |
| render plan / common core | `presentation-output-render-plan-v003` / `presentation-output-common-core-plan-v003` |
| renderer QC / owner lock | `presentation-render-qc-v002` / `presentation-render-output-lock-v002` |
| review input | `presentation-zevo-caption-quality-v002-review-input-v001` |
| completion / rejection / fatal | `presentation-zevo-caption-quality-v002-completion-report-v001` / `presentation-zevo-caption-quality-v002-rejection-report-v001` / `presentation-zevo-caption-quality-v002-fatal-observation-v001` |

共通coreのnested exact keysも省略しない。

- `indexedLines[]`: `lineIndex,characters,renderedText,text,codePointIndices,atomOccurrenceIds,logicalWidth`
- `characters[]`: `sourceIndex,character,codePoint,role`
- `targetProvenance`: `targetRefId,targetType,atomOccurrenceIds,lineAtomOccurrenceIds`
- `retainedSpans[]` / `sourceSpanEnvelopes[]`: `timelineSegmentId,sourceStartMs,sourceEndMs`
- `frameMappings[]`: `timelineSegmentId,sourceStartMs,sourceEndMs,sourceStartFrame30,sourceEndFrame30,startFrame,endFrameExclusive,displayFrameCount`

schemaVersionを持たない正式または外部JSON byteも次で閉じる。

- fixed generate request: `systemInstruction,contents,generationConfig`
- countTokens wrapper: exact一key `generateContentRequest`、内側は`model,systemInstruction,contents,generationConfig`
- maximum response structure / provider semantic object: abstained=`status`、complete=`status,captions`
- 公式snapshot 6件、countTokens raw 2件、B6 raw、video、review HTML: opaque raw byteでtop-level JSON key契約なし

binding shapeはformal JSON=`schemaVersion,path,fileSha256,canonicalSha256`、opaque byte=`path,fileSha256`、implementation/approved-contract/runtime-data=`role,path,fileSha256`の各exact集合である。

formal CLI結果のexact keyも固定する。

| CLI | schemaVersion | exact keys | action |
|---|---|---|---|
| source | `presentation-output-caption-cue-source-cli-result-v001` | `schemaVersion,status,jobId,packageId,outputPath,stage,primaryCode` | action fieldなし |
| B5 | `presentation-output-caption-cue-b5-b6-cli-result-v001` | `schemaVersion,status,action,jobId,attemptId,outputRoot,stage,primaryCode` | `measure-only` |
| B6 | `presentation-output-caption-cue-b5-b6-cli-result-v001` | `schemaVersion,status,action,jobId,attemptId,outputRoot,stage,primaryCode` | `generate-once` |
| selection | `presentation-zevo-caption-local-cli-result-v001` | `schemaVersion,status,action,jobId,attemptId,outputRoot,stage,primaryCode` | `selection-admission` |
| proof | `presentation-zevo-caption-local-cli-result-v001` | `schemaVersion,status,action,jobId,attemptId,outputRoot,stage,primaryCode` | `proof-run` |

### 8.3 source package

| 成果物/field群 | 供給者 | 検証済み時点 | exact引数 | consumer | 転記先 |
|---|---|---|---|---|---|
| source job全field | 正式job author | runnerがjobPathをstable再読しstrict decode、basename/jobId、code/data/contract SHAを照合後 | execute CLIのjobPathから得たjob | source runner | builderのjob |
| sourcePackageJobBinding | source runnerの実job再読 | 上記job検証完了時 | sourcePackageJobBinding | source builder | provenance.sourcePackageJobBinding |
| package schemaVersion / promptInput schemaVersion / taskDescription | 契約literal `presentation-output-caption-cue-source-package-v001` / `presentation-zevo-caption-selection-input-v001` / 親正本の仕事本文 | builder exact schema検査時 | job, caseInputs | source builder | package.schemaVersion / promptInput.schemaVersion / promptInput.taskDescription |
| packageId、styleLimits | 検証済みjob | jobとstyle resolver実戻り一致後 | job, caseInputs | source builder | packageId, promptInput.styleLimits |
| captions、boundaryCandidates | strict decode済みmeaning package atom列と§5.10 ID規則 | 全atom本文・順序・境界閉包後 | caseInputs | source builder | `promptInput.captions[]`と各`promptInput.captions[].boundaryCandidates[]` |
| reconstructionMap全field | job binding群、strict decode済みcaseInputs、resolver実戻り | meaning/style/base media/timelineのstable再読後 | job, caseInputs | source builder | reconstructionMap |
| implementationBindings、approvedContractBindings | 検証済みjob | code 33件と契約3件を前後再読後 | job | source builder | provenance同名field |

### 8.4 B5

| 成果物/field群 | 供給者 | 検証済み時点 | exact引数 | consumer | 転記先 |
|---|---|---|---|---|---|
| B5 job全field | 正式job author | job stable再読・strict validate・code/contract照合後 | execute B5 jobPath | B5 runner | 全後段制御 |
| official snapshot 6件 | jobが束縛する事前取得byte | source URL/path/SHA照合とcopy後byte一致後 | runner内の検証済みsnapshot binding | B5 runner | official snapshot files、manifest.officialSnapshot |
| residual risk acceptance | kawafmm承認済み版付きrecord | recordのstable再読、job binding、DECISIONS承認行照合後 | job.residualRiskAcceptanceBinding | B5 runner | manifest.residualRiskAcceptanceBinding |
| probe/final count request | source promptInput、固定system/schema、job executionConfiguration | source/official/risk検証後 | cost guard既存入口 | B5 runner | 正式request files |
| probe/final raw response | countTokens transport | rawResponseWriterが解析前no-replace保存・stable再読後 | rawResponseWriter(rawBytes) | B5 runner/cost guard | raw files、tokenCountBindings |
| maximum response structure | source package enum集合と親正本§5.5規則 | source strict検証後 | cost guard既存入口 | B5 runner | maximum-response-structure.json |
| generate request | final測定値、source prompt、固定system/schema、thinkingLevel | probe/final導出exact一致後 | cost guard既存入口 | B5 runner | generate-content-request.json |
| manifestId | 検証済みb5JobIdと§5 literal | manifest構築時 | job.jobId | B5 runner | manifest.manifestId |
| manifest schemaVersion/status/binding群 | 契約literal、実工程state、job・source・request・token成果物の実再読 | 各prefix完成時 | runner内のstable再読証拠 | B5 runner | schemaVersion,status,b5JobBinding,sourcePackageBinding,generateRequestBinding,tokenCountBindings |
| manifest token/cost/checks | 既存cost guard実戻りと実工程状態 | 二回計測・上限検査後 | cost guard result | B5 runner | tokenProjection,costProjection,checks |
| failure schemaVersion/reportId/status/b5JobBinding/stage/primaryCode | 契約literal、検証済みjob ID・実job binding・実停止state | staging開始後のfailure時 | runnerの固定stateと実job再読証拠 | B5 runner | failure report同名field |
| failure evidence/checks/implementation | 完了prefix実再読、固定stage到達表、job code binding | report公開直前 | stable再読証拠とrunner固定state | B5 runner | evidenceBindings、checks、implementationBindings |

### 8.5 B6

| 成果物/field群 | 供給者 | 検証済み時点 | exact引数 | consumer | 転記先 |
|---|---|---|---|---|---|
| B6 job全field | 正式job author | stable再読・strict validate・B5/request/code/contract照合後 | execute B6 jobPath | B6 runner | 全後段制御 |
| raw response | generateContent transportの一回戻り値 | raw writerの解析前保存・stable再読、transport rawBytesとSHA一致後 | transport exact 7 key | B6 runner | generate-content-response.raw.json |
| envelope schemaVersion/envelopeId | 契約literal、検証済みb6JobIdと§5 literal | envelope成立時 | job.jobId | B6 runner | envelope.schemaVersion,envelopeId |
| envelope観測field | transport実戻り | parser一回、model/tier/usage/schema検査後 | transport result | B6 runner | httpStatus,contentType,responseModelVersion,observedServiceTier,usageMetadata,semanticText |
| rawResponseBinding | raw実file stable再読 | transport後 | runner内binding | B6 runner | envelope.rawResponseBinding |
| manifestId | 検証済みb6JobIdと§5 literal | manifest構築時 | job.jobId | B6 runner | manifest.manifestId |
| manifest schema/status/executedAt | 契約literal、実到達status、実送信時刻 | 一回送信または停止時 | runner固定state | B6 runner | schemaVersion,status,executedAt |
| manifest transport/usage/cost/checks/rejection | 一回送信の実観測と既存cost guard | response/envelope/cost検査後 | transport/cost result | B6 runner | transport,usageListPriceEstimate,checks,primaryRejectionCode |
| manifest binding/implementation群 | job、B5、request、raw、envelope、codeの実再読 | 各段完了後 | stable再読証拠 | B6 runner | b6JobBinding,b5ManifestBinding,generateRequestBinding,rawResponseBinding,providerEnvelopeBinding,implementationBindings |
| failure schemaVersion/reportId/status/executedAt/b6JobBinding/stage/innerCode/targetFile | 契約literal、検証済みjob ID・実job binding・実送信時刻・実failure state | failure時。executedAtはHTTP request開始後ならmanifestと同じ送信直前時刻、通信前ならnull | runner固定stateと実job再読証拠 | B6 runner | failure report同名field |
| failure evidence/checks/implementation | 完了prefix、固定stage到達表、検証済みcode | report公開直前 | stable再読証拠とrunner固定state | B6 runner | evidenceBindings、checks、implementationBindings |

### 8.6 selection

| 成果物/field群 | 供給者 | 検証済み時点 | exact引数 | consumer | 転記先 |
|---|---|---|---|---|---|
| selection job全field | 正式job author | job stable再読・strict validate・上流/code/data/contract前後照合後 | execute selection jobPath | selection runner | admission制御 |
| selectionJobBinding | runnerのjob実byte再読 | job strict検証後 | selectionJobBinding | admission/finalizer | report.selectionJobBinding |
| selection schemaVersion/selectionId | 契約literal、jobId | admission検証時 | job | admission | selection同名field |
| source/B6/envelope bindings | job宣言と各現物stable再読 | input-reread完了後 | sourcePackage,b6Manifest,providerEnvelope | admission | selection/report同名field |
| rawResponseBinding | providerEnvelopeとB6 manifestが宣言する同じraw binding、およびraw実byte | 両宣言のbyte一致・stable再読後、固定既存`sha256PresentationCaptionB1BytesV001`実戻りSHA一致 | rawResponseBinding,rawResponseBytes,verifiedDependencies.hashRawResponseBytes | admission | reportCore.rawResponseBindingへ無変更転記 |
| response | providerEnvelope.semanticTextのstrict complete object | response schemaと全13検査後 | providerEnvelope,rawResponseBytes,rawResponseBinding | admission | selection.response |
| reportId | selectionJobIdと§5 literal | reportCore構築時 | job.jobId | admission | reportCore.reportId |
| report schemaVersion/status/checks/violations/fatalObservation/selectionProjection/captionProjection | 契約literalとadmission実検査 | 各段の到達状態確定後 | admission内部state | admission | reportCore同名field。§3.3のmodule-only literalとstatus別不変条件をexact適用し、finalizerだけがformal schemaVersionへ置換 |
| selectionBinding | runnerがpassed selectionを保存・stable再読 | selection strict再検証後 | selectionBinding | finalizer | report.selectionBinding |
| implementationBindings | 検証済みjob | code前後照合後 | job | admission/finalizer | report.implementationBindings |
| final report | reportCore、selectionBinding、selectionPublicationFailure | §3.3のtuple排他検査後 | finalizer exact 3 key | selection runner | selection-report-v001.json |

### 8.7 planner、render、common core

| 成果物/field群 | 供給者 | 検証済み時点 | exact引数 | consumer | 転記先 |
|---|---|---|---|---|---|
| planId | strict検証済みproofJobId、caseId | proof job ID/basename照合後 | proofJobId,caseId | planner | page/line plan.planId |
| source/selection/meaning bindings | proof jobとsource caseのformal bindings | proof input stable再読後 | sourcePackage,selection,meaningPackage | planner | page/line plan同名field |
| selectionReportBinding | proof job宣言とreport現物stable再読 | planner起動前 | selectionReportBinding | planner | 同名field無変更転記 |
| resolvedStyle、captionDisplays | resolver、selection、meaning、既存physical/timeline正本 | report projection SHA再構築一致後 | planner exact 8 key | planner | page/line plan同名field |
| output request全field | proof jobと検証済みcase context | request strict build後 | build output requestのproofJob,caseContext | proof runner | output-request-v001.json |
| outputRequestBinding | request staging実file | 保存・stable再読・strict validate後 | outputRequestBinding | render | render plan同名field |
| render planId | proofJobId、outputRequest.caseId | request ID照合後 | proofJobId | render | render plan.planId |
| render binding/style/caption fields | request、page plan、source、selection、report、meaningの検証済みvalue | cross-input照合後 | render exact 9 key | render | render plan同名field |
| common core schema/canvas/layout | 契約literal、render resolvedStyle、layoutContext | style resolver再実行一致後 | renderPlan,layoutContext,verifiedDependencies | common builder | common core同名field |
| element本文/frame/style | cueと既存common projection実戻り | projection一致後 | existing common projection input | common builder | elements |
| instructionId | enclosing cue.cueId | cueとelement一対一照合後 | cue.cueId | common builder | element.instructionId |
| targetRefId | parent display.semanticCaptionId | display/cue/element来歴照合後 | display.semanticCaptionId | common builder | targetProvenance.targetRefId |

### 8.8 proof、描画、review

| 成果物/field群 | 供給者 | 検証済み時点 | exact引数 | consumer | 転記先 |
|---|---|---|---|---|---|
| proof job全field | 正式job author | job stable再読・strict validate・3case/code/data/tool/contract照合後 | execute proof jobPath | proof runner | 全後段制御 |
| proofJobBinding | runnerの実job再読 | job strict検証後 | runner内binding | output/review/report builders | 各同名field |
| rendered video byte/binding | 共通描画の実戻りpath | streaming hash・媒体inspection後 | renderer result | proof runner | case video実file、completion item.videoBinding |
| renderer QC全field/binding | 既存共通QC正本の実戻り | QC 6項目完了、formal QC strict decode・stable再読後 | QC resultと実file binding | proof runner | renderer-qc-v001.json、completion item.qcBinding |
| renderer owner lock全field | 共通描画のno-replace予約実体 | ownerToken/processId/outputDirectory照合とstable再読後 | owner lock実読取証拠 | proof runner | formal root外owner lockとrendererWorkEvidence |
| renderer owner/work evidence | 共通描画の成功return `reservation,workDirectory,workVideo,cleanupWarnings`とowner lock実byte | owner lock strict decode、processId/ownerToken/outputDirectory照合、work video stable再読後 | rendererの実returnと実読取証拠 | proof runner | completion/rejection/fatalのrendererWorkEvidenceまたはretentionPaths（親正本の排他規則） |
| observedFadeFrameCount | §7のpreset実戻りとrenderer固定事実 | review input構築前 | path #11の2-key pure fade export | proof runner | proof runnerがreviewInput.observedFadeFrameCountへ転記 |
| review input schemaVersion/ID/questions/items | 契約literal、proofJobId、固定5問、3case成果物、旧plan fixture | 全case render/QCと旧6 plan stable再読後 | validated review input object | review UI | review-input-v001.json同名field |
| review HTML | strict検証済みreview input | HTML build後stable再読 | build review HTML(reviewInput) | review UI | review/review.html |
| completion schemaVersion/reportId/status | 契約literal、proofJobIdと§5 literal、全成功state | 全成功時 | proofJob.jobIdとrunner固定state | proof runner | completion report同名field |
| completion全binding/items/checks/implementation | proof/input/case/reviewの全実file再読と検証済みjob code | 公開直前 | stable再読証拠とjob implementation bindings | proof runner | proofJobBinding,sourcePackageBinding,selectionBinding,selectionReportBinding,items,reviewInputBinding,reviewHtmlBinding,checks,implementationBindings |
| rejection schemaVersion/reportId/status/stage/primaryCode | 契約literal、proofJobId、検査済み拒否state | rejection時 | runner固定state | proof runner | rejection report同名field |
| rejection target/evidence/checks/work/implementation | 完了prefix、renderer/QC実証拠、検証済みjob code | report公開直前 | stable再読証拠とrunner固定state | proof runner | proofJobBinding,targetFile,evidenceBindings,checks,rendererWorkEvidence,retentionPaths,implementationBindings |
| fatal observation全field | 契約literal、検証済みjob、閉語彙checkpoint、実tool観測、renderer work証拠 | fatal時 | runner構造化state | proof runner | fatal-observation-v001.jsonの全field |

### 8.9 test 7 pathとTAP

偶数番号の7 test pathはformal productを作らない。各test moduleのexport済み検査ID集合をNode test runnerが実行し、ID、passed/failed、durationを生TAPへ一度だけ保存する。供給者は各testの実発火branch、検証時点はNode test runnerの完了時、exact受け渡しはrunnerのTAP protocol、consumerは正式attempt記録、転記先は版付きTAP全文である。fixtureの期待値、静的存在、代表枝を実発火結果の代用にしない。

### 8.10 CLI結果と版付き実行記録

source、B5、B6、selection、proofのCLI結果も受け渡し対象である。各CLIは親正本で固定済みのschema、status、stage、primaryCode、ID/pathのnull規則を使い、canonical JSON+LFのstdout一件だけを返す。値の供給者は当該runnerの実到達state、検証時点は終了code確定直前、exact受け渡しはstdout byte、consumerは正式command実行器、転記先はartifact root外の版付き実行記録である。実行器はstdoutを再解釈してID、path、statusを作り直さず、保存byteと終了codeを並記する。job decode前、正式report不能、root公開不能のCLI-only枝も同じ経路で証拠化し、正式rootへ混ぜない。

## 9. 14 path差分表

| # | path | v002差分 | 数量影響 |
|---|---|---|---|
| 1 | evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs | sourcePackageJobBinding引数、契約3件照合 | path増減0 |
| 2 | evals/clip_composition/presentation_output_caption_cue_source_package_v001.test.mjs | 実job binding供給・改変拒否・契約3件subcase | ID増減0 |
| 3 | evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs | B5/B6/envelope ID literal、契約3件照合 | path増減0 |
| 4 | evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.test.mjs | ID exact、契約3件subcase | ID増減0 |
| 5 | evals/clip_composition/presentation_output_caption_cue_selection_v001.mjs | selection/raw binding引数、既存hash正本capabilityを含む5-key依存、reportCore、3-key pure finalizer、ID、契約3件 | export一件増、path増減0 |
| 6 | evals/clip_composition/presentation_output_caption_cue_selection_v001.test.mjs | 全status二段順、raw実byte hash、binding排他、publication failureの4-code写像、契約3件 | ID増減0 |
| 7 | evals/clip_composition/presentation_output_page_line_planner_v003.mjs | 追補v001の8 key入口を累積採用 | 変更内容の追加0 |
| 8 | evals/clip_composition/presentation_output_page_line_planner_v003.test.mjs | 追補v001 subcaseを累積採用 | ID増減0 |
| 9 | evals/clip_composition/presentation_output_render_plan_v003.mjs | 追補v001の9 key入口、common 2 ID転記 | path増減0 |
| 10 | evals/clip_composition/presentation_output_render_plan_v003.test.mjs | common 2 ID、path #11のfade pure exportのpassed/rejection reason 2枝実呼出しsubcase | ID増減0 |
| 11 | evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.ts | 全stable再読順、report ID、fade pure export exact unionと正式取得、契約3件 | export一件増、path増減0 |
| 12 | evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.test.mjs | report ID、fade、契約3件、全成果物closure | ID増減0 |
| 13 | evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.mjs | 検証済みobservedFadeFrameCountだけを表示 | schema/path増減0 |
| 14 | evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.test.mjs | fade証拠とHTML転記subcase | ID増減0 |

合計は新規14 path、既存path変更0のままである。production/support 7、test 7。15 path目は停止条件である。

## 10. 検査差分と証明消失0

### 10.1 数量

| 対象 | 親正本 | v001後 | v002後 |
|---|---:|---:|---:|
| formal schema | 不変 | 不変 | 不変 |
| 新規path | 14 | 14 | 14 |
| 既存path変更 | 0 | 0 | 0 |
| 違反code | 47 | 47 | 47 |
| 新規検査ID | 46 | 46 | 46 |
| API後検査ID | 4 | 4 | 4 |
| approved contract binding / job | 2 | 2 | 3 |
| selection production export | 親正本集合 | 同左 | pure finalizer一件追加 |
| proof production export | 親正本集合 | 同左 | fade照合pure export一件追加 |

### 10.2 既存IDへ追加するsubcase

| 検査ID | v002で追加する証明 | 既存証明の扱い |
|---|---|---|
| ZCQ001 | source job実byte bindingをbuilderへ渡す、契約3件exact、公開直前契約SHA差替えを`package-validation/CUE_SOURCE_PUBLICATION_FAILED`で実発火 | 全source schema/import/guard証明を保持 |
| ZCQ006 | 同一実job bindingからsource package byte決定性 | 既存決定性を保持 |
| ZCQ007 | B5/B6 ID literalと契約3件exact | job・transport・承認証明を保持 |
| ZCQ016 | B5/B6 manifest・failure・envelope ID exactと、各ID不一致時の異なる結果別成果物集合 | 全publication/費用/usage証明を保持 |
| ZCQ018 | selection job binding、raw response bindingのB6/envelope/実byte三者一致、selection用verifiedDependencies exact 5 keyと既存hash実関数、契約3件、3-key finalizer export | 全job/import/upstream証明を保持 |
| ZCQ020 | abstainedはnull bindingでreport一件 | 既存abstained停止証明を保持 |
| ZCQ026 | reportCoreからprojection決定性 | 物理・時間projection証明を保持 |
| ZCQ027 | 5 finalizer tuple、selection ID/report ID exact、selection保存/再読失敗からfatal report一件、partial不在証明不能、finalizer不成立、report保存不能、root予約/renameを個別実発火 | 既存10 failure枝を保持 |
| ZCQ028 | 追補v001のproofJobId/report binding引数とpage/line plan ID exact | 全再構築証明を保持 |
| ZCQ035 | 同一明示bindingから同一plan byte | 既存決定性を保持 |
| ZCQ036 | binding欠落・余分・改変拒否 | 既存7 planner code所有を保持 |
| ZCQ038 | render 9 key、output request ID、instructionId、targetRefId | schema/旧版拒否を保持 |
| ZCQ039 | render plan ID、output request/report/meaning binding無変更転記 | 既存来歴証明を保持 |
| ZCQ040 | path #11のproduction pure exportを実呼出しし、preset resolver実戻り4とrenderer binding固定事実4の成立、module-only rejection reason 2枝を観測。outer codeは所有しない | cue→element投影証明を保持 |
| ZCQ041 | 同一入力・ID転記から同一render byte | file I/O 0/旧tree不変を保持 |
| ZCQ042 | proof job契約3件、全ID、受け渡し順、renderer binding不一致を`CUE_PROOF_JOB_INVALID`で実発火 | import graph/3case/report schema証明を保持 |
| ZCQ043 | 実renderer経路でfade証拠を取得し、binding成立後のtransition不一致を`CUE_PROOF_RENDER_FAILED`で実発火 | renderer/QC/work証明を保持 |
| ZCQ044 | completion/rejection ID、proof側selection report stable再読、completion/rejection/fatalとproof prefix公開失敗集合、review ID不一致とreview input observedFade不一致を`CUE_PROOF_PUBLICATION_FAILED`で個別実発火、fade pure export同期throwを`fatal/2/renderer-work/CUE_PROOF_EXECUTION_FAILED`で実発火 | 全prefix/fatal/rejection証明を保持。selection成果物publicationはZCQ027だけが所有 |
| ZCQ045 | review ID exact、review inputへ検証済みfadeだけを渡す | 5問/3本/非循環を保持 |
| ZCQ046 | 正常review byteとobservedFadeFrameCountの一致だけを所有し、fatal codeを所有しない | HTML escape/completion照合を保持 |

### 10.3 証明消失0の機械assert

正式attempt開始前に次を一括assertする。

1. ZCQ001〜ZCQ046の定義集合、export集合、Node test runner観測集合が46/46 exact一致。
2. 親正本§10、追補v001 §7.3、本書§10.2から下記規則で導出する期待総集合`P ∪ V1 ∪ V2`と、TAP diagnosticから抽出したproof item集合がexact一致する。さらに`P ∪ V1`が期待総集合の真部分集合、`V2`が非空、三集合のproof item ID交差が全て空であることをassertする。
3. 47 codeのowner集合と実発火集合が47/47 exact一致し、代表枝や静的文字列で代用しない。
4. v001で影響したZCQ028、035、036、038、039、041、042、043、044の全subcaseがv002後も存在する。
5. 親契約§10の14要件のowner集合が変更前後でexact一致。
6. formal schema key/status/exit code/publication pathの差分0。
7. 旧6 plan、green 287/287、baseline 86/203 exact、既存5 tree、A-v002記録対象treeの比較条件を削除しない。

proof item集合の導出は次で一意にする。粗い一subcaseを一行へ割り当てて証明済みと申告することは禁止する。

1. SHA照合済みUTF-8文書を、次のexact見出し対の**間だけ**へ切り詰める。親正本は`## 10. 新規46検査の一件表`から次の`## 11.`見出し直前、v001は`### 7.3 検査ID差分`から`### 7.4 証明消失0のassert`直前、本書は`### 10.2 既存IDへ追加するsubcase`から`### 10.3 証明消失0の機械assert`直前である。開始・終了見出しが0件または複数なら不成立とする。その範囲内だけから行頭がexact `| ZCQ001 |`〜`| ZCQ046 |`である行を取る。親正本は46 ID各一件exact、v001と本書は記載IDだけが各一件で重複0件を要求する。親正本では最終cell、v001では「追加検査」cell、本書では「v002で追加する証明」cellだけを対象にする。本書後段の旧証明SHA oracle表は範囲外であり、proof item導出へ混ぜない。
2. Markdownのcell境界はbacktick外にあるexact byte列 ` | `だけをdelimiterとする。backtickは対でなければ文書不成立。cell先頭末尾のASCII spaceだけを除き、本文byteは正規化しない。
3. 対象cellを、backtick外の`。`、`、`、`；`、`・`で左から分割する。delimiterを除き、空片を捨て、各片の先頭末尾のASCII spaceだけを除く。`/`、括弧内、backtick内は分割しない。これにより、たとえばZCQ001の`schemaVersion・exact key・型・固定順`とZCQ045の固定5問は別proof itemになり、一assertで束ねられない。
4. 文書種別prefixを親=`P`、v001=`V1`、本書=`V2`とし、各ID・各文書内の1始まり出現順を2桁decimalにする。proof item IDはexact `<ZCQID>-<prefix>-<ordinal>-<segmentSha12>`。`segmentSha12`は分割後UTF-8 byteのSHA-256先頭12 lowercase hexである。
5. 各proof itemは、所有するZCQ top-level test内に専用assertを一件以上持つ。当該segmentが名指す対象から実行時に得た非literalの観測値を、segmentの要求値へ比較し、assert成功直後にTestContextのdiagnosticへexact `proof-item:<proofItemId>:passed`を一回だけ出す。proof itemはtest/subtestを新設せず、新規検査ID 46件の件数を増やさない。`assert(true)`、定数同士の比較、別proof itemの結果boolean転記、diagnosticだけの出力、skip/todo、代表assertへのalias、同じassert結果の無検証複製は禁止する。
6. cellに`実発火`、`実呼出し`、`実観測`、`実再読`、`実体再読`のいずれかを含むproof itemは、対象枝または正本関数を実行して得た値をassertする。source文字列・export名・fixture定数の静的存在だけでは合格にしない。47 codeの全発火はこの規則に加えて3項のowner集合で照合する。
7. TAP保存後、期待proof item集合、TAP diagnosticから抽出したobserved proof item集合、passed diagnostic集合を別々に作り、三集合のexact一致をassertする。同じproof item diagnosticが0件または複数なら不成立である。46 top-level IDが合っていても一proof itemの欠落・重複・failedがあれば正式attempt不成立とする。

旧証明の比較oracleは承認済み文書のMarkdown表行byteへ固定する。親正本SHA `44fb6199...42d6e4`のUTF-8本文から、行頭がexact `| ZCQ001 |`〜`| ZCQ046 |`である一行を各ID一件だけ抽出し、終端LF/CRを除いた**行全byte**のSHA-256を次と一致させる。0件、複数、順不同、親文書SHA不一致で正式attemptを開始しない。

| ID | 親正本§10行SHA-256 | 追補v001 §7.3行SHA-256（該当時） |
|---|---|---|
| ZCQ001 | `4faa0757b3144eef0774243df7c51cee9b0006d1ffb83ca93baf64215257d601` | — |
| ZCQ002 | `ae33ad0e950d734404d537ccc934860d0b03f9de113b9fcf98116b570df7f23f` | — |
| ZCQ003 | `c19cd0a7f4dac7f3fc27ab6a3447ef94c432f53473e1d4603222bf67f5b06a76` | — |
| ZCQ004 | `ac093fee52fce3a6dd4342e3a5122d4b6ee3cdb4c67a4d4a9cfb833aa2b9fd18` | — |
| ZCQ005 | `1cf74f2a4eda544a09f609c7a1ca0251011ac4f381b6a81b62adcc8d7d813e9f` | — |
| ZCQ006 | `db957d8a07238c2dcc640bd3169229622c10545cbb4cd2c6d989f0eed76928ed` | — |
| ZCQ007 | `abacf4452f7793003a08b065e6aac654ac4c758de542ecd3a1a7bb5e13b62619` | — |
| ZCQ008 | `16c72f6e503bdf295e9b2f237a247bb62e16392b27d34ef303fedbff328bac6f` | — |
| ZCQ009 | `dc6544611488c21dcbdf3723371d9f05f43258948dbeceba8151245a29648283` | — |
| ZCQ010 | `cffab634ad1438ec989f86b40e855f10cd24c76c35303d7e6ec631ec47a781e2` | — |
| ZCQ011 | `55240d21730039287fe26e234ced5fdffee4557417e26351cf84191b3e2f4754` | — |
| ZCQ012 | `9a07027635154cba94e98fcbcd8c163e80c743a2c241260526d80cd1d17a1614` | — |
| ZCQ013 | `f100c696ea598422ea635b3d40f83b683e58afa01c522b47b0d220686d9bc3f5` | — |
| ZCQ014 | `3c2a8c9fe995d442d42492889daaa36cd59067311d8c2dad2954eabbaab05ff3` | — |
| ZCQ015 | `303347c8bc73d7e5cefaef973d6fcf5dd7e5916bc41cad06abb8f8bc9cd79b86` | — |
| ZCQ016 | `342c6cb143656b782f429d52503ff482751c87bcfe80202750d3922ff677b6ff` | — |
| ZCQ017 | `9d679ddc73b6721df857f674772d06691a2481912be85999f1552b3684b90dce` | — |
| ZCQ018 | `dfe4b92e8c45a27e88919889ec206c5e9602da61e06d14fdff6528b4a822d0c9` | — |
| ZCQ019 | `897c11bc9aed8567e171c020dde680cb6dc0c6eca12d72704af8e77525eee33c` | — |
| ZCQ020 | `290a398b5203b9bb790918c65ec6586f67aa90f8f80d16a49581293a5a96e16f` | — |
| ZCQ021 | `844823391a9fa61292168311b749d781c2e8763e01881c6c22d425da4b5a99b1` | — |
| ZCQ022 | `f3c010b261ad4f00bda5c36af997fd004fd3a84d63b268a6a2d75088fe7cb045` | — |
| ZCQ023 | `666d73d6d072bb38c8b0e527955baf103b5c616f65e556ac01e956329c0b7133` | — |
| ZCQ024 | `b85ba9027b6ea70e0f5496cf78b33ce3f09fba3a9061c377d4dde37f3c7a5a82` | — |
| ZCQ025 | `83ee70fc87fe40d0718458fca34fa01ab36ca84f79f8db8cbcbbda6312f95418` | — |
| ZCQ026 | `56dad362e8bf17e797ae40d83b79c0d7a35acefa454c0c32206e8bc496359500` | — |
| ZCQ027 | `2e743303fa3e27596181b04b8cda3e1c3e65a38dbd06d9c2b7418e0bc5597ef2` | — |
| ZCQ028 | `317b082f0825808ab9be225c60ad717da2f1a8cfd51efffe4578e073f93eca69` | `0f54a51bff66285c4025ce86fc9c9a12e1a1f77281a0a3436a832a73a70fb23e` |
| ZCQ029 | `46f701e7d59bc5b25e0942e6ebf1bee1b6f4b86c2894ea3495f84062fd52a360` | — |
| ZCQ030 | `635e9de5888b88f448cd2bb0422c6ea2e509b37a20b38ce028364b08b64d43da` | — |
| ZCQ031 | `7346ea70940a5f07476e901f74647b61ea0de0db96dd34e647de8c0307f39f45` | — |
| ZCQ032 | `db6d132dc1649e9d241a8395ff4626fa20c755f935eff230d258707dd8883b52` | — |
| ZCQ033 | `c48380af0ec793e1afb25b8f0fa6dd07802dcb5168d98dd1c254d526f83c1d2f` | — |
| ZCQ034 | `3cfa1ee7da3951ddb2627657eeab19a4e867c7a8593901222e3a1d1ce40f145e` | — |
| ZCQ035 | `1f010288e931c0499ff920d98ec284d5236243a9db2e92ac794343750bb83d06` | `73e1f2f98b07d5a14f4715e3916ef2cb401fd67870f13dbc282b8d47cb2516c8` |
| ZCQ036 | `31229a9562cb86cc6f6491332ff6465e4893d482a4fa137b5c782cf1316a68dc` | `46829bb748e002041d91a2151df61a24db661397ce1ef02bcd7fd7a2f2b7f5fd` |
| ZCQ037 | `0b0fd76432b258275930fe26fa30713d8661f54aa33aa52e437f22c54d0cb0de` | — |
| ZCQ038 | `148fef6b220f262d5c0a6101590d2f52e397fc842ac1e98c1fe3cde8805875c5` | `8c59fad462fba7f8c1d0aff9ac9610c55bf5a41feace3372f3ee2f331ccf5b9f` |
| ZCQ039 | `c8c880b990a9824e2f7211c390f26d7ecc07d1162e299ee2c85c6c715b35d1e0` | `b0ca85f91b935e7c7cb736f3394455989dc335fdb2aa7983214411153909dcd2` |
| ZCQ040 | `b67fa9bf49b70bc01b319fea932a27df90acdcfbe823038135a5ab4cadc54263` | — |
| ZCQ041 | `809685b13bf29427a322b3a9c9b71785b64bfbc70d9fab2146bc714ca087da39` | `2a1ad2b17037dcd41cf3548ec330bbff9e1357260af184505faa8693b3acb343` |
| ZCQ042 | `dc62c2b10f1bd2a0663d25bfe21bdc954e1b7c27a392f8df99b74df76b6414e4` | `bcff2d4193f779f08fec68678aea9d8d1e07442dc3aa39b595c0d6d946f9d91c` |
| ZCQ043 | `ab6dcfe2e1dc9f449781fe15828e01f3ae1ff1e1bf22a7ca7a232b0aa93980e6` | `13c7335d7714c141ae35f6923d3869d9d2cf466cbefafe0459b50ce72f1ad3ab` |
| ZCQ044 | `a7ef773365f872651f69b757070bfc2d53c068faabaf88f4466ad5379d185a4c` | `81018dd2603f5c2f7bf63cff7b5c55d8995c10fc90feed7a0c34b6c1a7b00654` |
| ZCQ045 | `6830c6c6185cfcbc150e848ba1c20e4b1fe1bf4fc1b9a4c639bf1f9ec5828959` | — |
| ZCQ046 | `2b688eaac748fb1b4b3971909191b3685a1f9eb0f2712283dbce2ca31e0d34a5` | — |

追補v001列は承認済みv001 SHA `6de44032...9ce23`から、同じLFなし一行抽出規則で得る。v002 testは親行・該当v001行を**設計oracle**として保持し、上記proof item ID集合を機械導出してv002追加集合とunionする。文書行hash一致だけを機能検査の代用にはしない。

一件でも不足すれば、ID総数が46でも証明消失として正式attemptを開始しない。

## 11. 実装順と停止条件

承認後の実装順は次へ固定する。

1. 14 pathが全て未作成、親/v001/v002のSHA、既存成果物treeを再照合する。
2. source、B5/B6、selection、planner、render、proof、reviewの順に14 pathを実装する。
3. 14 path全成果物closure表を実装後に再監査する。
4. §10.3の証明消失0を実行する。
5. 新規46件を正式Node test runnerで一回実行し、TAP全文を版付き保存する。
6. 46/46の場合だけ直接影響回帰、green 287/287、baseline 86/203 exact、既存5 tree、A-v002記録対象treeを照合する。
7. 完了報告または停止報告を作り停止する。

次のいずれかで同attempt内に直さず停止する。

- 15 path目、既存path変更、新schema、新code、新検査IDが必要。
- selection finalizerだけでは閉じずpublisher capabilityまたは別I/O入口が必要。
- approvedContractBindingsを3件exactで表現できない。
- renderer SHAまたはpreset SHAが本書の現物値と異なる。
- binding推測、path合成、その場のSHA製造、自己認定、hidden metadata、global状態が必要。
- 47 codeの実発火不能、46 IDの証明消失、新たな現物差。
- 既存成果物、stable tag、green、baseline、treeに差が出る。
- 正式検査一件でも不合格。

API通信、countTokens、generateContent、費用支出、正式描画は本承認対象外であり、実装完了後も自動進行しない。

## 12. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 現物照合 | closed | §2.1で正本・入口・fade二供給元・14 path不存在を確認 |
| 値レベル閉包 | closed | §5で10 ID、§6で契約3件、§7でfade値をexact固定 |
| 工程間配線 | closed | §8で全formal artifactの供給者から転記先まで列挙 |
| selection循環 | closed | §3のpure finalizerで正式selection再読後だけpassed report完成 |
| path閉包 | closed | 14 path、15 path目なし |
| schema閉包 | closed | formal schema key追加0、module間reportCoreだけ追加 |
| code閉包 | closed | 47件不変、owner不変 |
| 検査閉包 | closed | 46 ID不変、subcaseと証明消失0を固定 |
| 来歴閉包 | closed | v002がv001を包含し、formal jobは親契約・親設計・v002の3件 |
| fade取得可能性 | closed | presetは既存resolver、rendererは束縛済みpath/SHAの固定事実 |
| 数値区分 | closed | fadeはframe整数、時刻・論理幅・token・費用と混同しない |
| 公開順 | closed | 保存→stable再読→binding→finalize→root atomic公開 |
| 自己申告禁止 | closed | runnerの実読取証拠だけをexplicit引数へ渡す |
| 既存成果物不変 | closed by stop | 実装・検査・通信・描画0件、承認後も回帰条件を維持 |
| 人間作業 | 1判断 | 本追補の承認/差戻しだけ。実装承認は別判断 |

未固定B分類は0件である。実測待ちC分類は、本書自身の提示後SHA一件だけであり、自己参照を避けるため人間承認時にDECISIONSへ記録する。実装者が値を選ぶ余地はない。

## 13. 差分要約

親正本+追補v001から変わるのは次だけである。

1. source builderへ検証済みjob bindingを渡す。
2. selection admissionへ検証済みjob bindingとB6/envelope/実byte三者一致済みraw bindingを渡す。
3. selection reportを3-key pure finalizerで完成し、正常passedだけでなくselection保存失敗時のfatal report一件まで閉じる。
4. 未固定だった正式ID 10件を固定する。
5. formal jobの契約来歴を2件から3件へ増やし、v002でv001を包含する。
6. fade 4frameの二供給元を既存resolverと束縛済みrenderer事実へ固定し、proof runnerの単一pure exportをformal経路とZCQ040で共用する。
7. 追補v001のstaging規則・12段順・owner表を累積包含する。
8. これらを14 path全成果物へ一括適用し、既存検査IDへsubcaseを追加する。

formal schema、14 path、47 code、46検査ID、status、終了code、正式成果物、既存tree、API契約、描画契約は変えない。

## 14. 停止点

本書の起草・提示で停止する。実装、正式検査、API通信、countTokens、generateContent、費用支出、正式描画は行わない。

## 15. 承認依頼文案

> 相談役レビュー済み。kawafmm裁定: ZEVO字幕品質v002 完全実装設計 binding・ID・来歴・fade全件閉包追補v002を、親正本SHA-256 44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4への累積追補として承認する。追補v001は承認済み履歴として不変保持し、v002が内容を包含するためformal jobでは重複束縛しない。selection report二段化はpure finalizer分離を採用し、runnerがselectionを正式保存・stable再読した後だけpassed reportへselection bindingを渡す。source/selectionのjob binding、正式ID 10件、承認契約3件、preset/renderer fade独立照合、14 path全成果物の供給者から転記先までの配線、証明消失0を提示どおり固定する。formal schema・新規14 path・既存変更0・47 code・46検査IDは維持する。承認後は14 path実装、実装後監査、新規46/46、直接影響回帰、green 287/287、baseline 86/203 exact、既存5 treeとA-v002記録対象tree不変照合、完了または停止報告まで進めてよい。API通信、countTokens、generateContent、費用支出、正式描画は含まない。既存停止条件と本追補§11を維持する。
