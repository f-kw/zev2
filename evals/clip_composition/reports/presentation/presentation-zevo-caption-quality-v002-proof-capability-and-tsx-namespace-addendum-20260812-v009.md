# ZEVO字幕品質v002 proof capability・TSX namespace 追補 v009

- 日付: 2026-08-12
- 親契約: `presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md`
- 完全実装設計: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 累積追補: v002、v003、v004、v005、v006、v007、v008
- 変更対象: F proof入口と既存検査・全formal jobの契約来歴
- 通信・費用・正式描画: 0

## 1. 実現性調査

### 1.1 現物

F productionの正式入口は現在、`jobPath`と`atomicDirectoryPublisherLoader`のexact二key objectを受ける。正常経路は、入力再読、planner、render plan、媒体inspection、renderer/QC、review、completion、atomic root公開を一つのrunner内で順に実行する。

ZCQ044の現行35 proofを文書byteから再導出したところ、正式入口だけで決定的に初期状態を作れるのはjob不正、上流binding不正、開始時root/staging競合、publisher late collision、正常経路である。staging作成後の特定成果物だけのwrite/read失敗、後続caseだけのplanner/render/renderer/QC失敗、review/completion/failure reportだけの失敗は、現exact入力から決定的に作れない。

U review UIはpure三入口である。入力objectまたは入力byteをplain dataとして直接渡せるため、Uの負例は追加capabilityなしで全件到達可能である。

### 1.2 TSX namespace

path #11は`.ts`である。固定Node・固定TSX CLIから物理`.mjs` importerを使うと、source authored named export五件に加え、CommonJS相互運用の`default` wrapperがruntime namespaceへ一件現れる。wrapperのstring-key集合は同じ五件で、各値は対応するnamed exportと同一関数参照である。source上の余分exportは0件である。

### 1.3 結論

Fは既存atomic publisher loaderと同型の明示capability注入を一件追加すれば、test専用production分岐、watcher、polling、timer、並行書込みを使わず全負例へ到達できる。Uは変更不要である。TSX namespaceはsource authored named exportを正本とし、相互運用wrapperを別層でexact照合すればpath変更なしで閉じる。

## 2. F実行入口のexact引数

正式入口を次へ非互換改訂する。

`executePresentationZevoCaptionQualityV002ProofJobV001({jobPath,atomicDirectoryPublisherLoader,capabilities})`

top-level key順は上記exact三件である。missing、extra、順序差、`jobPath`型不正、loader非function、capability object不正は、file I/O・dynamic import・publisher load・renderer起動0件で`rejected / job-read / CUE_PROOF_JOB_INVALID`へ写す。新codeは作らない。

`capabilities`は次のexact 19-key objectで、各値はfunctionでなければならない。既定値、fallback、部分省略、job/envによる選択・構成を禁止する。

| 順 | key | exact一引数 | 正常return |
|---:|---|---|---|
| 1 | `ensurePathAbsent` | `{absolutePath}` | `Promise<boolean>` |
| 2 | `createDirectory` | `{absolutePath}` | `Promise<void>` |
| 3 | `readStableBytes` | `{absolutePath}` | `Promise<Buffer>` |
| 4 | `writeNoReplaceBytes` | `{absolutePath,bytes}` | `Promise<void>` |
| 5 | `copyNoReplaceBytes` | `{sourceAbsolutePath,targetAbsolutePath}` | `Promise<void>` |
| 6 | `verifyRuntimeBinding` | `{binding}` | `Promise<boolean>` |
| 7 | `rereadCaseInputs` | `{sourcePackage,verifiedDependencies}` | 既存selection readerのpassed/rejected/fatal union |
| 8 | `buildPageLinePlan` | `{sourcePackage,selection,selectionReport,selectionReportBinding,caseInputResult,caseId,proofJobId,projectionDependencies,plannerModule}` | planner v003 union |
| 9 | `buildRenderPlan` | `{outputRequest,outputRequestBinding,pageLinePlan,sourcePackage,selection,selectionReport,meaningPackage,proofJobId,verifiedDependencies,renderModule}` | render v003 union |
| 10 | `buildCommonRenderPlan` | `{renderPlan,layoutContext,verifiedDependencies,renderModule}` | common plan union |
| 11 | `hashStableMedia` | `{absolutePath,timelineModule}` | `Promise<SHA-256 string>` |
| 12 | `inspectBaseMedia` | `{absolutePath,ffmpegPath,ffprobePath,qcModule}` | 既存media inspection object |
| 13 | `executeRendererAndQc` | `{drawInput,rendererModule}` | 既存renderer/QC union |
| 14 | `resolveStyle` | `{styleInput,artifacts,baseMediaInput,baseMediaInspection,styleModule}` | 既存style resolution union |
| 15 | `deriveObservedFadeFrameCount` | `{resolvedTransition,rendererBinding}` | 既存fade pure union |
| 16 | `validateReviewInput` | `{reviewInput,reviewModule}` | review validation union |
| 17 | `decodeReviewInput` | `{bytes,reviewModule}` | review decode union |
| 18 | `buildReviewHtml` | `{reviewInput,reviewModule}` | review HTML union |
| 19 | `publishDirectory` | `{publisher,workspaceRoot,stagingRoot,outputRoot,verifiedImplementationBindings}` | atomic publisher union |

各capability自身も表の一引数objectをexact key順で検査し、不正なら副作用前に同期`TypeError`とする。runnerはraw message/stack/stderr/本文を保存せず、呼出し時点の既存stage/codeへ写す。

## 3. formal capability固定

F module内に上表19件のmodule-private production正本関数と、同じ関数参照だけを表順に持つfreeze済み`FORMAL_PROOF_CAPABILITIES_V001`を置く。formal CLIはjob pathと固定atomic loaderに加え、このobjectそのものを渡す。他のobjectを組み立てる分岐を持たない。

検査はF sourceをTypeScript ASTで読み、次を同時に証明する。

1. formal objectのkeyが§2の19件exactである。
2. 各property valueは同moduleの対応するmodule-private function identifierそのものである。
3. formal mainの実呼出しが`capabilities: FORMAL_PROOF_CAPABILITIES_V001`を一回だけ渡す。
4. job、環境変数、path文字列、case値からcapabilityを選ぶbranchが0件である。
5. testは同じexecute入口へplain capability objectを渡し、非故障keyはformal正本関数へ委譲する。productionにtest判定branchを置かない。

## 4. TSX namespaceの標準

source authored named exportを契約正本とする。path #11の正本集合は次の五件exactである。

1. `buildPresentationZevoCaptionQualityV002OutputRequestV001`
2. `decodePresentationZevoCaptionQualityV002ProofJobV001`
3. `derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001`
4. `executePresentationZevoCaptionQualityV002ProofJobV001`
5. `validatePresentationZevoCaptionQualityV002ProofJobV001`

`.ts`を固定TSXで読むruntime namespaceは、上記五named exportに`default`一件を加えた六key exactを許す。ただし次を全て要求する。

- `default`はobjectである。
- wrapperのstring-keyは正本五件exactである。
- `namespace.default[name] === namespace[name]`が五件全て成立する。
- symbol-key、getter、追加data、追加functionは0件である。

`.mjs` pathは従来どおりruntime namespace自体がsource authored named export集合とexact一致し、`default`を許さない。S/A/L/P/Rを現物照合し、`.ts` pathだけに本規則を適用した結果を版付き監査記録へ残す。path #11のpath/type変更とpackage境界変更は行わない。

## 5. 負例逆引き一件表

### 5.1 F / ZCQ044

| 現行proof | 最初に不成立にするpredicate | 状態供給者 | exact実行引数 | production実枝 | 保存成果物 |
|---|---|---|---|---|---|
| ZCQ044-P-01 | strict job decode | 正式job byte | `jobPath` | job-read rejected | CLIのみ |
| ZCQ044-P-02 | root/staging absent | `ensurePathAbsent` | `capabilities` | root-publication rejected/fatal | CLIまたはfailure root |
| ZCQ044-P-03 | case別planner/render/renderer成立 | 各case IDで一件だけ失敗するplain capability | `capabilities` | 該当case stage | rejection/fatal root |
| ZCQ044-P-04 | render plan write/stable reread | `writeNoReplaceBytes` / `readStableBytes` | `capabilities` | artifact-publication | fatal root |
| ZCQ044-P-05 | review validate/build/write/reread | review三capability+read/write | `capabilities` | review-publication | fatal root |
| ZCQ044-P-06 | completion write/reread | read/write | `capabilities` | completion-publication | fatal root |
| ZCQ044-P-07 | failure report write/reread | read/write | `capabilities` | artifact-publication | CLI、検査済みstaging |
| ZCQ044-P-08 | atomic publish success | `publishDirectory` | `capabilities` | root-publication | 正式rootまたはstaging |
| ZCQ044-P-09 | case ordinalごとの成功/失敗 | planner/render/renderer plain capability | `capabilities` | 後続case stage | 先行case evidence+failure report |
| ZCQ044-P-10 | owner file stable read/shape/binding | `readStableBytes` | `capabilities` | renderer-work | fatal root |
| ZCQ044-P-11 | work video stable read | `readStableBytes` | `capabilities` | renderer-work | fatal root |
| ZCQ044-P-12 | renderer evidence/warning union | `executeRendererAndQc` | `capabilities` | renderer-work | completion/rejection/fatal |
| ZCQ044-P-13 | ownerはreservation exact pathだけ | `executeRendererAndQc`+`readStableBytes` | `capabilities` | renderer-work | evidence path集合 |
| ZCQ044-P-14 | pathはbinding/reservationからだけ導出 | plain capability call record | `capabilities` | 各段 | call record+成果物binding |
| ZCQ044-P-15 | 自動削除0 | 実filesystem前後tree | `jobPath`+`capabilities` | 全枝 | tree record |
| ZCQ044-P-16 | 部分cleanup 0 | 実filesystem前後tree | 同上 | 全枝 | tree record |
| ZCQ044-P-17 | rejected後のvideo 0 | renderer前失敗capability | `capabilities` | planner/render/review | failure root tree |
| ZCQ044-P-18 | rejected後のQC 0 | 同上 | `capabilities` | 同上 | failure root tree |
| ZCQ044-P-19 | rejected/fatal後のcompletion 0 | 同上 | `capabilities` | 同上 | failure root tree |
| ZCQ044-P-20 | 既存tree byte不変 | 検査前後tree oracle | job外側fixture | 全枝 | tree record |
| ZCQ044-V1-01 | output request no-replace write | `writeNoReplaceBytes` | `capabilities` | output-request | staging binding |
| ZCQ044-V1-02 | output request stable read | `readStableBytes` | `capabilities` | output-request | fatal root |
| ZCQ044-V1-03 | reread byte一致 | `readStableBytes`の決定的別byte | `capabilities` | output-request | fatal root |
| ZCQ044-V1-04 | output request publication | read/write/publish | `capabilities` | artifact/root publication | failure root/staging |
| ZCQ044-V1-05 | output request成立前renderer 0 | renderer call counter | `capabilities` | output-request | call record |
| ZCQ044-V1-06 | output request失敗後段0 | 全capability call order | `capabilities` | output-request | call record |
| ZCQ044-V2-01 | completion/rejection ID exact | read/write+plain invalid result | `capabilities` | completion/rejection publication | report byte |
| ZCQ044-V2-02 | selection report stable reread | `readStableBytes` | `capabilities` | input-read | rejection/fatal root |
| ZCQ044-V2-03 | completion/rejection/fatal排他 | 各段plain failure | `capabilities` | failure publisher | 結果別root集合 |
| ZCQ044-V2-04 | review ID/fade exact | validateReviewInput/deriveFade | `capabilities` | review/style-resolution | failure root |
| ZCQ044-V2-05 | fade pure同期throw | `deriveObservedFadeFrameCount` | `capabilities` | renderer-work | fatal root |
| V4-ZCQ044-01 | commit時late collision | `publishDirectory`から同じ実publisherへ委譲前にtargetを一件作成 | `capabilities` | root-publication | staging+target |
| V4-ZCQ044-02 | helper classified failure | `publishDirectory` | `capabilities` | root-publication | staging |
| V4-ZCQ044-03 | target/staging不変 | 実publisher前後tree oracle | `capabilities` | root-publication | tree record |
| V4-ZCQ044-04 | 生文字列不保存 | helper失敗plain result+成果物走査 | `capabilities` | root-publication | failure report/CLI |

各plain capabilityは一つの指定段だけを失敗させ、他keyは`FORMAL_PROOF_CAPABILITIES_V001`の同一関数参照へ委譲する。case別故障はexact `caseId`引数だけで決定し、読取回数・登録順・時計・並行状態に依存しない。

### 5.2 U

| 負例 | 最初に不成立にするpredicate | 状態供給者 | exact引数 | 実枝 | 観測 |
|---|---|---|---|---|---|
| review input missing/extra/order | top-level exact key | plain object | validator一引数 | rejected | `CUE_REVIEW_INPUT_INVALID /` |
| schema/ID/fade/binding不正 | 各field validator | plain object | validator一引数 | rejected | field path |
| 5問の不足/余分/順序/文言差 | question set exact | plain array | validator一引数 | rejected | `/reviewQuestions` |
| 3 caseの不足/余分/順序/ID差 | item set exact | plain array | validator一引数 | rejected | `/items` |
| raw byte envelope/JSON/schema不正 | strict decoder | plain Buffer | decoder一引数 | rejected | closed reason |
| buildへ不正input | validator shared branch | plain object | builder一引数 | rejected | `CUE_REVIEW_INPUT_INVALID` |
| HTML特殊文字 | escape処理 | plain valid object | builder一引数 | passed | output byteにraw 0、escape有 |

Uにはfilesystem、process、環境依存の負例がなく、追加capabilityは不要である。

## 6. contract binding

本書を全formal jobへ一件加える。roleは`caption-quality-proof-capability-and-tsx-namespace-addendum`、pathは本書path、SHAは承認時実測値を使う。

| job | v008 | v009 | exact構成 |
|---|---:|---:|---|
| source | 7 | 8 | parent、complete design、v002、v004、v006、v007、v008、本書 |
| B5 | 7 | 8 | parent、complete design、v002、v004、v006、v007、v008、本書 |
| B6 | 8 | 9 | parent、complete design、v002、v004、v005、v006、v007、v008、本書 |
| selection | 9 | 10 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、本書 |
| proof | 9 | 10 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、本書 |

implementation bindingはsource/B5/B6/selection/proof=36/11/19/41/51件、code 49、検査ID46、proof総数489、全owner件数を不変とする。

## 7. proof itemのexact置換

次の42件を一対一で失効・置換する。表外proofを失効しない。

### 7.1 contract/入口の7件

| 失効ID | 置換ID |
|---|---|
| `V8-ZCQ001-01` | `V9-ZCQ001-01` |
| `V8-ZCQ007-01` | `V9-ZCQ007-01` |
| `V8-ZCQ018-01` | `V9-ZCQ018-01` |
| `V8-ZCQ018-02` | `V9-ZCQ018-02` |
| `V8-ZCQ027-01` | `V9-ZCQ027-01` |
| `V8-ZCQ042-01` | `V9-ZCQ042-01` |
| `V4-ZCQ042-02` | `V9-ZCQ042-02` |

### 7.2 ZCQ044の35件

現行ZCQ044 owner集合を列順に、`ZCQ044-P-01`〜`P-20`、`ZCQ044-V1-01`〜`V1-06`、`ZCQ044-V2-01`〜`V2-05`、`V4-ZCQ044-01`〜`04`から、`V9-ZCQ044-01`〜`35`へ一対一置換する。exact失効IDは§8の各行末へ旧IDとして併記し、抽出器はこの35件以外を除外してはならない。

### 7.3 会計

期待集合はexact `(v008適用後489件 − §7の42件) ∪ §8のV9 42件`とする。期待、test source宣言、TAP observed、TAP passedを489件へexact一致させる。owner件数はZCQ001=22、ZCQ007=17、ZCQ018=30、ZCQ027=34、ZCQ042=36、ZCQ044=35を含め全件不変である。

## 8. V9-PROOF-ITEMS-BEGIN

- V9-ZCQ001-01 | source implementation 36件とapproved contract 8件のexact role/path/SHA集合を検査し、approved contractが§6のsource構成へ一致する
- V9-ZCQ007-01 | B5/B6 implementation 11/19件を維持し、approved contractが§6の8/9件へexact一致する
- V9-ZCQ018-01 | selection implementation 41件とapproved contract 10件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V9-ZCQ018-02 | selection approved contract 10件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否する
- V9-ZCQ027-01 | selection approved contract 10件とatomic helper 3 implementation bindingを公開直前まで照合する
- V9-ZCQ042-01 | proof implementation 51件とapproved contract 10件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V9-ZCQ042-02 | proof入口がjobPath/atomicDirectoryPublisherLoader/capabilitiesのexact三keyと§2のcapability 19 keyを要求しmissing・extra・型不正をI/O前のjob-read/CUE_PROOF_JOB_INVALIDへ写す。formal CLIが§3の同一19 symbolだけを渡すこと、TSX namespaceが§4へexact一致すること、S/A/L/P/Rの遡及照合を実観測する
- V9-ZCQ044-01 | strict job byte不正をjob decode前のrejectedで実発火する（旧ZCQ044-P-01-856857e3f29e）
- V9-ZCQ044-02 | root/staging予約のchecked競合とI/OをensurePathAbsent capabilityから実発火する（旧ZCQ044-P-02-b4931a6bd37e）
- V9-ZCQ044-03 | 各case途中のplanner/render/renderer失敗をcaseId決定のplain capabilityから実発火する（旧ZCQ044-P-03-04bd780a7a0a）
- V9-ZCQ044-04 | render plan書込み・stable再読・byte差をread/write capabilityから実発火する（旧ZCQ044-P-04-7fde4f94b904）
- V9-ZCQ044-05 | review validate/build/write/reread失敗をreview/read/write capabilityから実発火する（旧ZCQ044-P-05-c97ace4c8fef）
- V9-ZCQ044-06 | completion write/reread失敗をread/write capabilityから実発火する（旧ZCQ044-P-06-21606b5837ee）
- V9-ZCQ044-07 | rejection/fatal observation write/reread失敗をread/write capabilityから実発火する（旧ZCQ044-P-07-87426c82cffa）
- V9-ZCQ044-08 | root rename失敗と内部stage→CLI exact写像をpublishDirectory capabilityから実発火する（旧ZCQ044-P-08-da4dceb08f41）
- V9-ZCQ044-09 | 先行case成功後の後続case rejected/fatalをcaseId決定capabilityから実発火する（旧ZCQ044-P-09-360ed62e792c）
- V9-ZCQ044-10 | owner missing/permission/byte mismatchをreadStableBytes capabilityから個別実発火する（旧ZCQ044-P-10-7282fba5870d）
- V9-ZCQ044-11 | work video再読失敗をreadStableBytes capabilityから実発火する（旧ZCQ044-P-11-d50726493a94）
- V9-ZCQ044-12 | rendererWorkEvidenceとretentionPathsの全unionをrenderer capabilityから網羅的・排他的に実観測する（旧ZCQ044-P-12-5ae193f9680d）
- V9-ZCQ044-13 | owner pathがreservation exact pathだけから得られowner scan 0件であることをcapability call recordで実観測する（旧ZCQ044-P-13-7ed512eefda0）
- V9-ZCQ044-14 | 対象pathが検証済みbinding/reservation exact引数だけから得られ再導出0件であることをcapability call recordで実観測する（旧ZCQ044-P-14-caeffb5e116f）
- V9-ZCQ044-15 | 全枝で自動削除0件を実filesystem前後treeで観測する（旧ZCQ044-P-15-4c4e13d8fc77）
- V9-ZCQ044-16 | 全枝で部分cleanup 0件を実filesystem前後treeで観測する（旧ZCQ044-P-16-98ea829d78bd）
- V9-ZCQ044-17 | rejected時の後段video 0件をfailure root treeで観測する（旧ZCQ044-P-17-e60dc895c532）
- V9-ZCQ044-18 | rejected時の後段QC 0件をfailure root treeで観測する（旧ZCQ044-P-18-065db44fc09e）
- V9-ZCQ044-19 | rejected/fatal時のcompletion 0件をfailure root treeで観測する（旧ZCQ044-P-19-dd7e5413e3ca）
- V9-ZCQ044-20 | 全枝で既存fixture/成果物tree byte不変を前後tree oracleで観測する（旧ZCQ044-P-20-f57436ceb69f）
- V9-ZCQ044-21 | output request no-replace書込みをwriteNoReplaceBytes capabilityで実観測する（旧ZCQ044-V1-01-131e15d1a561）
- V9-ZCQ044-22 | output request stable再読I/OをreadStableBytes capabilityから実発火する（旧ZCQ044-V1-02-d65e4643688c）
- V9-ZCQ044-23 | output request実体変化をreadStableBytesの決定的別byteから実発火する（旧ZCQ044-V1-03-1792ecd7a971）
- V9-ZCQ044-24 | output request公開失敗をread/write/publish capabilityからCUE_PROOF_PUBLICATION_FAILEDで実発火する（旧ZCQ044-V1-04-4a0878ed8ef9）
- V9-ZCQ044-25 | output request不成立時renderer call 0件をcapability call recordで観測する（旧ZCQ044-V1-05-6d32189a0b84）
- V9-ZCQ044-26 | output request不成立時後段capability call 0件をcall recordで観測する（旧ZCQ044-V1-06-d07782bcb056）
- V9-ZCQ044-27 | completion/rejection ID exactを各結果の正式report byteで実観測する（旧ZCQ044-V2-01-5de64dec7a37）
- V9-ZCQ044-28 | proof側selection report stable再読をreadStableBytes capabilityで実観測する（旧ZCQ044-V2-02-d8e690c30980）
- V9-ZCQ044-29 | completion/rejection/fatalとproof prefix公開失敗集合の排他を全結果rootで実観測する（旧ZCQ044-V2-03-8a6fce523db0）
- V9-ZCQ044-30 | review ID不一致とobservedFade不一致をreview/fade capabilityからCUE_PROOF_PUBLICATION_FAILEDで個別実発火する（旧ZCQ044-V2-04-9cf9522d6eef）
- V9-ZCQ044-31 | fade pure同期throwをderiveObservedFadeFrameCount capabilityからfatal/2/renderer-work/CUE_PROOF_EXECUTION_FAILEDで実発火する（旧ZCQ044-V2-05-08c6ece58f5b）
- V9-ZCQ044-32 | prepare後target作成をpublishDirectory capability内で行い同じ実publisher commitのlate collisionを実発火する（旧V4-ZCQ044-01）
- V9-ZCQ044-33 | pure-classified helper failureをpublishDirectory capabilityから既存proof publication codeへ写す（旧V4-ZCQ044-02）
- V9-ZCQ044-34 | late collision/helper失敗時のtarget不変と検査済みstaging保持を実再読する（旧V4-ZCQ044-03）
- V9-ZCQ044-35 | helper失敗時に生message・stderr・成果物本文が正式報告へ0件であることをbyte走査する（旧V4-ZCQ044-04）

## 9. V9-PROOF-ITEMS-END

## 10. 実装順

1. 本書と既存正本のSHAを照合し、本書SHAをDECISIONSへ記録する。
2. proof導出器をv009へ更新し、§7の42失効・§8の42追加・総数489・owner不変を検査する。
3. 全formal jobのcontract bindingを§6へ更新する。
4. F moduleへ§2〜§3を実装し、F testで§5.1の全枝を決定的に発火する。
5. U testで§5.2のplain data負例を全件実発火する。U production変更は行わない。
6. S/A/L/P/R namespaceを§4で遡及監査し、結果を版付き保存する。
7. F局所正式attempt、U局所正式attemptを頭から一回ずつ実行し、TAP全文を監視root外の版付きpathへ保存する。
8. 全合格・契約判断0件の場合だけ正式46件、直接影響回帰、green 287、baseline 86/203 exact、既存5 treeとA-v002記録対象tree照合へ進む。

## 11. 停止条件

- §2の19 keyで要求枝へ決定的に到達できない。
- 新code、新schema、新検査ID、proof/owner件数変更、18 path目が必要になる。
- job/envからcapabilityを選ぶ、fallback、test専用production分岐、watcher、polling、timer、並行書込みが必要になる。
- 既存成果物・stable tagに差が出る。
- 不合格一件。同attemptで直さない。
- 新たな契約判断が必要になる。

API通信、countTokens、generateContent、費用支出、正式描画、stable tagは範囲外である。
