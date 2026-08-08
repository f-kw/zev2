# fatal観測性 v002 契約設計 v001

- 起草日: 2026-08-06
- 状態: **設計提示。未承認・未実装**
- 外部通信: 0回
- 費用: US$0
- 対象: 意味／表現境界のforward-only経路で、終了code 2へ潰れていた内側停止情報
- 対象外: タイトル文字列欄、修復、再試行、根本原因の自動判定

## 1. 結論

現行の外側fatalと終了code 2は維持し、正式なv002失敗報告へ、次の3情報だけを持つ`fatalObservation`を追加する。

1. どの処理段階で捕捉したかを示す閉語彙
2. 直接対象になった、既にjobで束縛済みのfile。安全に特定できなければ`null`
3. 生の例外文ではなく、事前登録した閉語彙のinner code

生のmessage、stack、stdout、stderr、字幕本文、provider応答、OS log、API keyは正式失敗報告へ保存しない。v001を救済・変換せず、v002は新しい実行だけに適用する。

これにより、秘密や任意文字列を持ち出さず、「大容量媒体の読取」「意味再構築」「crop用frame検査」「Chromium描画」程度まで停止地点を絞れる。根本原因を自動証明する契約ではない。

## 2. 背景となる9実例

| # | 外側で失われたもの | 読み取り診断で確定した事実 | v002で残す観測 |
| ---: | --- | --- | --- |
| 1 | B4 T082/T083が同じ終了2に見えた | あるattemptはTSXのUnix socket作成が権限拒否、次のattemptは内部配置小数を整数読取器が拒否 | attemptごとに`runner-bootstrap / OS_PERMISSION_DENIED`、`layout-preflight / NUMERIC_TOKEN_INVALID`を別々に記録 |
| 2 | 意味回答検査131の子process理由 | 子processが`GATE_A_CONTEXT_INVALID`を返した | `semantic-rebuild / GATE_A_CONTEXT_INVALID` |
| 3 | candidate 59縦型B4の再構築理由 | 決定性確認用複製でbyte列型を失い、意味入力SHAの参照も誤っていた | 最初に捕捉した段階で`semantic-rebuild / FORMAL_JSON_VALUE_INVALID`または`BINDING_REFERENCE_MISMATCH`のうち実観測した一方だけ。memory上の値しか指せない場合、対象fileは`null` |
| 4 | 縦型描画器の内側停止 | crop用frame数処理のimport元が誤り、必要なexportが存在しなかった | `crop-frame-inspection / REQUIRED_EXPORT_MISSING`と束縛済み実装file |
| 5 | pathを持たない描画QC理由 | `INSTRUCTION_RENDER_MISSING`が正式報告への写像時に失われた | `post-render-qc / INSTRUCTION_RENDER_MISSING` |
| 6 | 意味package参照の値型 | null-prototype objectを正式JSON値として直列化できなかった | `formal-serialization / FORMAL_JSON_VALUE_INVALID / null`。memory上のfieldをpackage fileへ丸めない |
| 7 | timelineの媒体読取対象 | 3,288,164,785 byteの媒体を一括読取し`ERR_FS_FILE_TOO_LARGE` | `source-media-read / ERR_FS_FILE_TOO_LARGE`と元媒体binding |
| 8 | 意味情報packageのinput-read対象 | 同じ大容量媒体の一括読取が`ERR_FS_FILE_TOO_LARGE` | `source-media-read / ERR_FS_FILE_TOO_LARGE`と元媒体binding |
| 9 | 共通描画coreの子process内訳 | Chromiumが`SIGTRAP`で終了。別のOS記録でMach port権限拒否を確認 | 正式processが直接知る`overlay-render / CHILD_PROCESS_SIGNALLED / null`。runtime toolの絶対pathとOS log由来の推論は保存しない |

#3の二つの欠陥を一つのinner codeへ合成しない。実行時に最初に捕捉した、構造化して確認できる一件だけを記録する。別attemptで下層の原因が露出した場合は別の観測として残す。

## 3. 共通のexact schema

`fatalObservation`は次のexact 4 keyとし、key順も固定する。

```json
{
  "schemaVersion": "presentation-fatal-observation-v002",
  "innerStage": "source-media-read",
  "targetFile": {
    "path": "evals/clip_composition/research/downloads/example/source.mp4",
    "fileSha256": "0000000000000000000000000000000000000000000000000000000000000000"
  },
  "innerCode": "ERR_FS_FILE_TOO_LARGE"
}
```

### 3.1 `targetFile`

`targetFile`は`null`、または`path / fileSha256`のexact 2 key objectとする。

- 2値は、その実行jobが既に受理した、§3.2の許可fieldにある同一一件からだけ複写する。
- `path`はworkspace相対path、`fileSha256`はfatalより前にjobが束縛していた期待SHAである。
- 読取不能だったfileの実測SHAを得たとは主張しない。
- 例外message、stack、子process出力、OS logからpathを抽出しない。
- 一致する受理済みbindingを一意に選べない場合は`null`とする。推測で埋めない。
- 一時file、home directory、secret file、provider endpointは対象にしない。

### 3.2 境界別の参照元閉包

`targetFile`へ使える参照元を次に限定する。配列の要素は、親jobまたは先にschema・SHA検査へ合格した上流JSONのfieldだけを使う。表にないfield、runtime profileの絶対path、例外内のpathは対象外である。

| 境界 | 許可する参照元field |
| --- | --- |
| timeline composition | CLIで安定読取済みの正式job、`job.implementationBindings[*]`、`job.approvedContractBindings[*]`、`job.sourceMedia[*].sourceIdentityBinding`、`job.sourceMedia[*].mediaBinding`、`job.sourceMedia[*].retainedSourceAtomsBinding.{sourceAtoms,generationManifest,validationReport}` |
| 旧字幕分割受入（実害例1〜3のB1） | CLIで安定読取済みの正式job、`job.implementationBinding.files[*]`、`job.implementationBinding.dependencyFiles[*]`、`job.sourcePackageBinding.{manifest,validationReport}`、`job.semanticOutputBinding` |
| 新経路の意味終端選択 | CLIで安定読取済みの正式job、`job.implementationBindings[*]`、`job.approvedContractBindings[*]`、`job.sourcePackageBinding`、`job.b6ManifestBinding`、`job.providerEnvelopeBinding`。各上流成果物のschema・SHA検査後だけ、B6 manifestの`b5ManifestBinding / b6JobBinding / rawResponseBinding / generateRequestBinding`、provider envelopeの`rawResponseBinding`、B5 manifestの`generateRequestBinding` |
| 意味情報パッケージ | CLIで安定読取済みの正式job、`job.implementationBindings[*]`、`job.approvedContractBindings[*]`、`job.timelineCompositionDecisionBinding`、`job.semanticSelectionValidationBinding`、`job.semanticSelectionBinding`。timeline decision合格後だけ、その`sourceMedia[*].{sourceIdentityBinding,mediaBinding}`と`retainedSourceAtomsBinding.{sourceAtoms,generationManifest,validationReport}` |
| 出力runner／共通描画core | CLIで安定読取済みの正式job、`job.requestBinding`、`job.implementationBindings[*]`、`job.approvedContractBindings[*]`。request合格後だけ、`meaningInformationPackage`、`baseMediaInput.{baseMedia,timeline,generationManifest,validationReceipt}`、`styleInput.presetBinding.{trustedRegistryBindings,presetRegistry,presetValidationIndex,materialValidationIndex,rendererTrust}`、縦型の場合の`styleInput.cropPolicy.application` |

正式job自身は、読取に成功してbyte SHAを実測できた後だけ対象にできる。読取自体が失敗した場合は`targetFile:null`とする。Chromium、Node、TSX、FFmpeg等は絶対pathを持つruntime bindingなのでv002初版の`targetFile`へ入れず、stageとinner codeだけを残す。

## 4. `innerStage`の閉語彙

次の13値だけを許す。

| 順 | 値 | 意味 |
| ---: | --- | --- |
| 1 | `runner-bootstrap` | 固定runtime・必須export・子process入口を準備する段階 |
| 2 | `job-read` | 正式job byteを読む段階 |
| 3 | `source-media-read` | 元媒体を読む、または媒体SHAを再照合する段階 |
| 4 | `input-read` | 媒体以外の束縛済み入力を読む段階 |
| 5 | `semantic-rebuild` | 保存済み意味入力を再構築・照合する段階 |
| 6 | `formal-serialization` | 正式JSON byteへ直列化する段階 |
| 7 | `crop-frame-inspection` | crop前後のframe・音声を検査する段階 |
| 8 | `layout-preflight` | 行配置・座標・安全領域を検査する段階 |
| 9 | `overlay-render` | Remotion／Chromium等で字幕画像を描く段階 |
| 10 | `post-render-qc` | 合成後のQCを行う段階 |
| 11 | `publication` | 正式成果物をno-replace公開する段階 |
| 12 | `failure-report-publication` | 失敗報告自体を公開する段階 |
| 13 | `unknown` | 上記のどれかを安全に確定できなかった状態 |

段階は根本原因の場所ではなく、信頼済み処理が失敗を捕捉した境界を示す。

## 5. `innerCode`の閉語彙と所有段階

次の17値だけを許す。表にないstageとの組合せは拒否する。

| inner code | 許可stage |
| --- | --- |
| `ERR_FS_FILE_TOO_LARGE` | `job-read`、`source-media-read`、`input-read` |
| `FILE_CHANGED_DURING_READ` | `job-read`、`source-media-read`、`input-read` |
| `NUMERIC_TOKEN_INVALID` | `input-read`、`semantic-rebuild`、`layout-preflight` |
| `FORMAL_JSON_VALUE_INVALID` | `input-read`、`semantic-rebuild`、`formal-serialization`、`crop-frame-inspection`、`layout-preflight` |
| `BINDING_REFERENCE_MISMATCH` | `job-read`、`source-media-read`、`input-read`、`semantic-rebuild`、`layout-preflight` |
| `REQUIRED_EXPORT_MISSING` | `runner-bootstrap`、`crop-frame-inspection` |
| `GATE_A_CONTEXT_INVALID` | `semantic-rebuild` |
| `INSTRUCTION_RENDER_MISSING` | `post-render-qc` |
| `OS_PERMISSION_DENIED` | `runner-bootstrap`、`job-read`、`source-media-read`、`input-read`、`overlay-render`、`publication` |
| `CHILD_PROCESS_SPAWN_FAILED` | `runner-bootstrap`、`semantic-rebuild`、`crop-frame-inspection`、`layout-preflight`、`overlay-render`、`post-render-qc` |
| `CHILD_PROCESS_EXIT_NONZERO` | `runner-bootstrap`、`semantic-rebuild`、`crop-frame-inspection`、`layout-preflight`、`overlay-render`、`post-render-qc` |
| `CHILD_PROCESS_SIGNALLED` | `runner-bootstrap`、`semantic-rebuild`、`crop-frame-inspection`、`layout-preflight`、`overlay-render`、`post-render-qc` |
| `CHILD_PROCESS_TIMEOUT` | `runner-bootstrap`、`semantic-rebuild`、`crop-frame-inspection`、`layout-preflight`、`overlay-render`、`post-render-qc` |
| `PUBLICATION_FAILED` | `publication` |
| `REPORT_TARGET_INVALID` | `failure-report-publication` |
| `REPORT_PUBLICATION_FAILED` | `failure-report-publication` |
| `UNCLASSIFIED` | `unknown` |

追加規則:

- `GATE_A_CONTEXT_INVALID`と`INSTRUCTION_RENDER_MISSING`は、既存schemaに合格した内側の構造化reportからだけ写す。
- `OS_PERMISSION_DENIED`は、同じprocessが直接得た`EPERM`または`EACCES`だけを根拠にする。後から読んだOS logを根拠に格上げしない。
- 子processのsignal名、exit message、stderrは保存しない。観測できた種類だけを上表へ写す。
- どの値にも安全に写せない場合は`unknown / null / UNCLASSIFIED`とし、もっともらしい原因を作らない。

17値は、9実例で必要になった値に加え、対象5境界が既に持つstable-readの実体変化枝、子processのspawn／非0終了／signal／timeout枝、no-replace公開枝、失敗報告の保存先検査枝、失敗報告公開枝、分類不能枝を閉じたものである。完全実装設計では各値を所有する現行分岐をpath・検査ID単位で示す。所有分岐を一件でも示せなければ契約不成立として実装前に停止し、検査専用の偽分岐や未使用codeは作らない。

## 6. 所有・優先順

1. 現在の処理が、schema検査済みの内側failure reportを受け取った場合は、その許可済みcodeを一段だけ透過する。
2. それがない場合は、現在の処理が直接受け取ったNode error code、子process結果、直列化結果を閉語彙へ写す。
3. 複数の失敗を一つのreportへ合成せず、実行順で最初に処理を止めた一件だけを所有者とする。
4. failure reportの保存先が既に存在する、または安全な保存先として解決できない場合は、公開を試みず`failure-report-publication / null / REPORT_TARGET_INVALID`とする。出力runnerの既存外側codeは`OUTPUT_RENDER_FAILURE_TARGET_INVALID`のまま維持する。
5. 保存先検査を通った後、failure reportの公開自体が失敗した場合は、作れなかったreportを捏造しない。runner別の既存fatal streamへ共通fatalだけを出し、観測は`failure-report-publication / null / REPORT_PUBLICATION_FAILED`へ一意に固定する。内側の`EPERM`等へ再分類しない。
6. 外側のstatus、既存diagnostic code、終了code 0/1/2の意味は変えない。`fatalObservation`は終了2の内訳であり、新しい合否基準ではない。

## 7. 正式reportへの組込み

### 7.1 runner別fatal envelope

外側を無理に共通化せず、各runnerの現行外形をv002へ版上げして`fatalObservation`だけを追加する。key順は次で固定する。

| 境界 | schemaVersion | exact key順 | runnerId／外側code |
| --- | --- | --- | --- |
| timeline composition | `zev-timeline-composition-failure-v002` | `schemaVersion / status / violations / fatalObservation` | `status=fatal`。`violations`は現行の検査済み配列をそのまま維持し、分類不能時は空、既存の公開失敗時は既存1件を残す。新しい外側diagnostic codeは作らない |
| 旧字幕分割受入（実害例1〜3のB1） | `presentation-formal-runner-fatal-v002` | `schemaVersion / runnerId / status / diagnosticCode / fatalObservation` | runnerId=`presentation-caption-semantic-output-check-job-v002`、diagnosticCode=`CAPTION_B1_V002_RUNNER_FATAL` |
| 新経路の意味終端選択 | `presentation-caption-meaning-boundary-runner-fatal-v002` | `schemaVersion / status / violations / fatalObservation` | `status=fatal`、`violations=[]`。通常のpassed／rejected validation report v001は変更しない |
| 意味情報パッケージのcontext前／report公開不能 | `presentation-formal-runner-fatal-v002` | `schemaVersion / runnerId / status / diagnosticCode / fatalObservation` | runnerId=`zev-meaning-information-package-job-v001`、diagnosticCode=`MEANING_INFORMATION_RUNNER_FATAL` |
| 出力runnerのcontext前／report公開不能 | `presentation-output-runner-diagnostic-v002` | `schemaVersion / status / stage / diagnosticCode / fatalObservation` | stageは既存output stage、diagnosticCodeは下記の既存13値 |

出力runnerの外側diagnostic codeは、`OUTPUT_ACCEPTANCE_EXECUTION_FAILED / OUTPUT_ACCEPTANCE_INPUT_CHANGED / OUTPUT_ACCEPTANCE_PUBLICATION_FAILED / OUTPUT_ACCEPTANCE_REPORT_BUILD_FAILED / OUTPUT_FORMAL_JOB_INVALID / OUTPUT_PLANNER_RESOURCE_EXHAUSTED / OUTPUT_RENDER_CORE_CONTRACT_FAILED / OUTPUT_RENDER_CORE_PROCESS_FAILED / OUTPUT_RENDER_FAILURE_REPORT_INVALID / OUTPUT_RENDER_FAILURE_TARGET_INVALID / OUTPUT_RENDER_PUBLICATION_FAILED / OUTPUT_RENDER_SAFETY_ARTIFACT_INVALID / OUTPUT_RENDER_STAGED_ARTIFACT_INVALID`だけを許す。

timelineと意味情報パッケージで新しく版識別子または固定外側codeを加えることは、v002の非互換改訂として明示的に行う。status、既存violations、既存output diagnostic、終了codeの意味は変更しない。

### 7.2 runner別のstream・保存先

| 境界 | job context前／report公開不能 | context後の正式失敗 | durable保存先 |
| --- | --- | --- | --- |
| timeline composition | stdoutへtimeline fatal v002 | stdoutへtimeline fatal v002 | **新設しない**。現行どおりstdoutを呼出側の版付き実行記録が保存する |
| 旧字幕分割受入（実害例1〜3のB1） | stdoutへformal runner fatal v002 | stdoutへformal runner fatal v002 | **新設しない**。現行どおりstdoutを呼出側の版付き実行記録が保存する |
| 新経路の意味終端選択 | stdoutへmeaning-boundary runner fatal v002 | stdoutへmeaning-boundary runner fatal v002 | **新設しない**。正常／検査済み拒否時だけ既存validation rootを使い、fatalと混ぜない |
| 意味情報パッケージ | stdoutへformal runner fatal v002 | v002 failure reportをno-replace公開し、同じbyteをstdoutへ出す | `evals/clip_composition/outputs/presentation/meaning-information-failures/<jobId>/<jobFileSha256>/failure-report.json` |
| 出力runner／共通描画core | stderrへoutput runner diagnostic v002 | v002 failure reportをno-replace公開し、同じbyteをstdoutへ出す | `evals/clip_composition/outputs/presentation/meaning-output-render-failures/<outputId>/<formalJobFileSha256>/failure-report.json` |

streamはrunnerの現行責務を維持し、全runnerをstdoutまたはstderrの一方へ統一しない。timeline、旧字幕分割受入、新経路の意味終端選択に新しいfatal用失敗rootを設けない。意味情報と出力のroot・ID導出・no-replace規則はv001と同じで、leaf schemaだけをv002へ非互換改訂する。

意味情報と出力のdurable rootは、同じjob SHAに対して一度だけ公開できる。既存reportがある同一jobを再実行して第二reportを置くことは許さない。再実行が人間承認された場合は、既存作法どおり新attemptを表す新しい正式job byte・SHAを使う。同一jobのreport rootが既に存在する場合は、既存reportを上書きせず、runner streamへ`failure-report-publication / null / REPORT_TARGET_INVALID`を出して停止する。出力runnerでは既存の外側`OUTPUT_RENDER_FAILURE_TARGET_INVALID`を維持し、実際の公開試行後に失敗した場合だけ`REPORT_PUBLICATION_FAILED`を使う。

出力runnerが正式失敗reportとは別にstderrへ出している、保持したwork／lockの閉じた安全記録は現行どおり維持する。`fatalObservation`へ混ぜず、既存streamを削除しない。

### 7.3 durable failure reportのexact key順

- 意味情報パッケージは`zev-meaning-information-failure-report-v002`とし、exact順を`schemaVersion / failureId / status / stage / fatalObservation / jobFileObservation / violations / retainedPaths / environment`とする。
- 出力側は`presentation-output-render-failure-report-v002`とし、exact順を`schemaVersion / failureId / status / stage / formalOutputJobBinding / outputRequestBinding / acceptanceReportBinding / renderPlanBinding / failureObservation / fatalObservation / retainedSafetyArtifacts`とする。既存`failureObservation`の意味は変えない。
- timeline、旧字幕分割受入、新経路の意味終端選択のfatalは§7.1のrunner別fatal v002だけであり、durable reportを新設しない。
- `status=fatal`では`fatalObservation`を必須object、`status=rejected`ではexact `null`とする。検査済み拒否をfatalへ言い換えない。
- v002の正式JSONは既存の2-space・末尾LF serializerを使い、同じ入力からbyte同一にする。

## 8. forward-onlyと既存成果物

- v001とv002のunion、相互受理、converter、shim、fallback、同時出力を作らない。
- v002実装後の新attemptだけがv002を使う。
- 保存済みv001失敗報告は当時の証拠として不変保持する。
- candidate 13横型、candidate 59旧横型、candidate 59旧縦型、および今回安定点の横型・縦型を変更しない。
- 成功時の成果物byte、既存の検査済み違反code、終了code、QC基準は変更しない。

## 9. 保証すること・しないこと

### 保証すること

- 内側stageとinner codeは閉語彙である。
- 対象fileは受理済みbindingからだけ来る。分からなければ`null`である。
- 生の任意文字列とsecretを正式reportへ持ち込まない。
- 同じ観測入力から同じ正式byteを作る。
- どの境界で停止したかを、現行v001より一段具体的に絞れる。

### 保証しないこと

- 根本原因、責任主体、修正方法の自動確定。
- OS内部、provider内部、子process内部の完全な観測。
- bindingにないfileの特定。
- 複数の積層原因を一つのattemptで先読みすること。
- 自動修復、自動再試行、成功扱いへの変換。

## 10. 最小適用範囲

最初のv002実装対象は、実害が既に出た境界と、その役割をforward-only経路で引き継いだ次の5境界に限定する。

1. timeline composition
2. 旧字幕分割受入のB1（実害例を固定fixtureとして扱う）
3. 新経路の意味終端選択
4. 意味情報パッケージ
5. 出力runnerと共通描画core

B5/B6のprovider通信、工程入場receipt、基礎映像、crop適用、旧縦型専用経路へ予防的に広げない。旧字幕分割受入は実害の再現と同じ外側fatalの欠落を閉じる範囲だけに限定し、旧B3/B4生成経路の再開や凍結済み成果物の変更を意味しない。

実装前の完全設計では、共通schema・validator・serializerと検査、上記5境界のrunner／core／検査をpath単位へ閉じる。現時点の見込みは最大18 fileである。18 fileを超える、既存外側codeを変える、または生文字列保存が必要になる場合は実装前に停止する。

## 11. 必須検査

1. `fatalObservation`のexact key、key順、formal byteを検査する。
2. 13 stage、17 inner code、許可組合せ、`unknown / UNCLASSIFIED`の唯一性を検査する。
3. 未知stage、未知code、不正な組合せ、追加keyを全拒否する。
4. `targetFile`が受理済みbindingの同一一件であることを検査し、絶対path、workspace逸脱、SHA不一致、曖昧一致を拒否する。
5. `message`、`stack`、`stdout`、`stderr`、`text`、`apiKey`等の追加を拒否する。
6. 17 inner codeを少なくとも一回ずつ現行所有分岐から実発火し、export集合と観測集合を完全一致させる。所有分岐がない値を検査専用に捏造しない。
7. 9実例を固定fixture化し、積層原因を一件へ合成しないことを確認する。
8. Chromium例では、子process signalから`CHILD_PROCESS_SIGNALLED`は作れるが、外部OS logから`OS_PERMISSION_DENIED`を推測しないことを確認する。
9. runner別envelope・stream表を検査する。timeline・旧字幕分割受入・新経路の意味終端選択は常にfatal durable report 0件、意味情報はstdout、出力はstderrをcontext前fatal streamとし、meaning/outputのcontext後だけv002をno-replace公開する。同一job SHAの第二reportは`REPORT_TARGET_INVALID`で拒否して既存reportを不変保持し、公開試行後の`REPORT_PUBLICATION_FAILED`と区別する。
10. 同一入力でv002 byteが完全一致することを確認する。
11. v001拒否、converter・fallback・v001/v002併産0件を静的・動的に確認する。
12. 成功projection、検査済み拒否、終了code、既存正式成果物tree SHAが不変であることを確認する。

正式TAPは全IDを版付き保存する。不合格一件でも同attemptで直さず停止する。

## 12. 人間作業

- 本設計の採否: 1判断、目安3分。
- 実装時の動画目視: 0件。観測性だけの変更なので、人間へ映像品質判定を求めない。
- 実装承認は別工程。今回、code・検査・正式成果物は変更しない。

## 13. 事実・推測・未確認

### 事実

- 外側fatalだけでは停止箇所を確定できず、別の読み取り診断を要した実例が9件ある。
- 9件は媒体読取、意味再構築、直列化、crop検査、QC、描画環境にまたがる。
- 現行実装には、内側の生messageを上位で捨てている箇所がある。
- v002の設計起草だけが承認済みで、実装は未承認である。

### 推測

- この最小情報があれば、同型fatalの多くで追加のOS log調査やメモリ内診断を省ける可能性が高い。

### 未確認

- 最大18 fileという実装見込みのexact path一覧。
- 5境界で、17 codeの現行所有分岐をすべて正本計算の複製なしに検査入口へ出せるか。
- 実装後に人間判断停止が何件減るか。

## 14. 次の承認依頼

次に必要な判断は一つだけである。

> 本設計v001を契約の方向として承認し、5境界・最大18 fileをpath単位へ閉じた完全実装設計を起草してよいか。実装、API通信、描画、正式成果物変更はその次の別承認とする。

承認されるまで実装へ進まない。タイトル文字列欄にも着手しない。
