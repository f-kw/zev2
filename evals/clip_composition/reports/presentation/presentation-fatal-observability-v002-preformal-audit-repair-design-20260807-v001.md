# fatal観測性 v002 正式検査前監査 修正設計 v001

- 日付: 2026-08-07
- 親設計: `presentation-fatal-observability-v002-complete-implementation-design-draft-20260807-v001.md`
- 親設計SHA-256: `945b3337b90fde6969963a4dc051778b3aaf015be90e57193b97bd2d63dc7369`
- 入力停止報告: `presentation-fatal-observability-v002-preformal-audit-stop-report-20260807-v001.md`
- 対象: 群A〜Fと、正式81件の証明不足
- 結論: **契約解釈、既存status、既存違反code、終了codeを変更せず、承認済み18 path内で閉じる**

## 1. 実現性調査

本文を書く前に、停止報告が挙げた全呼出し、全catch、全child process、全`targetFile`選択、全公開分岐、正式81件の全IDを読み取りで再照合した。

### 1.1 現物で成立したこと

| 対象 | 現物根拠 | 判定 |
| --- | --- | --- |
| 単一file公開 | `run_presentation_meaning_information_package_job_v001.mjs`の開始commit版に、owned staging root作成→`wx`書込→no-replace公開のprivate処理が実在した。現在は呼出しだけ残り定義が脱落している | 既存処理の復元で閉じる |
| timeline拒否 | `presentation_timeline_composition_decision_v001.mjs`には、SHA、JSON、canonical、source identity、source mediaの既存エラー語彙から2種の既存違反へ戻す外側mappingが実在する | mappingの単一化でfatal化を防げる |
| renderer child | `render_presentation_v002.mjs`の全child呼出しと、成功時だけ必要なstdout/stderrの消費箇所を全数確認した | 失敗時だけ生出力を破棄できる |
| target field | 親契約§3.2に5境界の固定許可field表が実在する。現行selectorだけが呼出側自己申告表を使っている | 共通coreへ固定表を置けば閉じる |
| output export guard | 正式mainは実装fileをstable-readしSHA照合している。guardはその後に毎回通るが、guard単体はjob自己申告を信じている | 同じstable-read/hash処理をguardでも使える |
| failure report公開 | target構造不正の固定sentinelと、Node I/O・実公開失敗を現行owned-root処理から区別できる | 14 inner codeのままownerを分離できる |
| 検査総数 | F02 41件、F03 40件。重複するstable tree検査と、別IDが完全包含するsignal fixtureがある | 2 IDを置換し、総数81を維持できる |

### 1.2 新しい契約判断を行わない箇所

child processが`EPERM/EACCES`を返しても、現在の許可行列が`OS_PERMISSION_DENIED`を許さない`layout-preflight`または`post-render-qc`では、`unknown / null / UNCLASSIFIED`へ落とす。許可行列を広げない。`overlay-render`等、既に許可された段階だけが`OS_PERMISSION_DENIED`を保持する。

これは観測を強く見せるための行列改訂を避け、分類不能時は`unknown`とする親契約をそのまま適用する処理である。

## 2. 合格条件

本修正は次の5条件を全て満たした場合だけ正式attemptへ進める。

1. 正常経路、既存`passed / rejected / fatal`、既存違反code、終了code 0/1/2を変えない。
2. 生message、stack、stdout、stderr、字幕本文、API keyその他secretを親結果・正式report・CLI出力へ保存しない。
3. 13 stageと14 inner codeの全値について、builder/classifierだけの単体呼出しではなく、所有production入口または凍結済み実害を再現するproduction入口で観測する。
4. 承認済み18 pathを超えず、stable-read、hash、公開、描画、文字計算を複製しない。
5. 正式81件の各IDへ証明を割り当て、用途を置換するIDについて失われる証明が別IDに残ることを事前に固定する。

## 3. 群A: 意味情報packageの正常公開

### 3.1 修正

F11へ、開始commitに実在した単一file公開処理を復元する。処理は次の既存正本だけを呼ぶ。

1. `createPresentationMeaningOwnedStagingRootV001`
2. staging rootへの`writeFile(..., {flag: 'wx'})`
3. `publishPresentationMeaningOwnedStagingRootNoReplaceV001`

正常packageとfailure reportは同じprivate処理を共用する。別の公開計算を作らない。

### 3.2 不変条件

- 公開成功: `passed / exit 0`、正式package byte不変。
- target既存・構造不正: 正常packageでは既存`MEANING_PUBLICATION_TARGET_INVALID / rejected / exit 1`。
- target検査後のI/O・公開失敗: 既存`MEANING_PUBLICATION_FAILED / fatal / exit 2`。
- 30違反code、schema、serializer、出力pathは不変。

## 4. 群B: timelineの既存rejectedをfatal化しない

### 4.1 単一分類表

F04に、現行エラー語彙を既存違反へ戻すprivate分類関数を一つ置く。

| 現行エラー語彙 | 既存違反code |
| --- | --- |
| `source-media-binding`、`media-binding-sha` | `SOURCE_MEDIA_BINDING_MISMATCH` |
| `binding-file-sha`、`binding-canonical-sha`、`invalid-json`、`binding-content-invalid`、`source-identity`、`retained-source-ref`、`retained-atoms` | `SOURCE_IDENTITY_INVALID` |

pathは現行どおり`/timelineDecision/sourceMedia`とする。

### 4.2 catchの順序

source identity、媒体、残存発話の内側catchは、分類表にある既存検査済み拒否をそのまま外側へ通す。分類表にないNode I/O・resource失敗だけを`PresentationTimelineFatalError`へ包む。外側catchも同じ分類関数だけを使い、同じリストを二重に持たない。

これにより、SHA・JSON・canonical不成立は`rejected / exit 1`、実I/Oは`fatal / exit 2`のままになる。

## 5. 群C: 子processの生出力を親へ渡さない

### 5.1 失敗時に残す情報

F18のchild process処理は、失敗時に次だけを新しい固定文言Errorへ載せる。

- 非列挙・freeze済み`presentationFatalProcessEvidence.innerStage`
- 非列挙・freeze済み`presentationFatalProcessEvidence.innerCode`
- 既に契約化済みのfont違反に一致した場合だけ、閉じた`rendererViolationCode`

`processResult`、signal名、終了数値、生stdout/stderr Buffer、元Error、cause、command文字列は親へ渡さない。診断用に子出力をローカルで読む必要がある場合は、閉語彙へ分類した直後に捨てる。成功して許可終了codeだった場合だけ、既存内部parser用としてstdout/stderrを返す。

### 5.2 上位の固定文言

layout結果fileが無い場合、共通描画のprocess failure、job read、outer catch、CLI最上位catchは、生例外文言を連結せず固定文言を使う。外側schema、status、stage、exit codeは変えない。

## 6. 群D: renderer child processの段階帰属

F18内のchild callを次の表へ固定する。描画・QC計算は変えず、段階引数だけを渡す。

| 実処理 | inner stage |
| --- | --- |
| Git HEAD・作業木、tool version | `runner-bootstrap` |
| 入力基礎映像のframe数 | `input-read` |
| layout inspector | `layout-preflight` |
| Remotion still、初回合成 | `overlay-render` |
| 描画後frame数、透明画像生成、反実仮想合成、完成／省略frame抽出、画像差分 | `post-render-qc` |

`composite`は段階を引数に取り、初回と反実仮想を分ける。`inspectFrameCountWithToolV001`も段階を受け、F18内の全call siteは明示する。F18外の既存呼出しを変更するための追加pathは作らない。

## 7. 群E: targetFileの固定許可表

### 7.1 共通core

F01へ境界IDと許可fieldのexact表を置く。selectorは呼出側が渡す`allowedSourceFields`を受け付けない。入力は次へ固定する。

- `boundaryId`
- `sourceField`
- `path`
- `fileSha256`
- `verifiedTargetSources`
- `sourceRecordVerified`

境界IDとfieldが固定表にあり、source recordが読取・schema検査済みで、同じfield/path/SHAが`verifiedTargetSources`にexact 1件ある場合だけtargetを返す。未読、表外、0件、複数一致、path/SHA不一致は`null`とする。

### 7.2 固定表

親契約§3.2をそのまま値へ落とす。表にない`tracked-input`、`job.binding`、`accepted-input-observation`、`validated-graph-snapshot`を許可しない。

| 境界ID | 許可field |
| --- | --- |
| `timeline-composition` | `job`、`job.implementationBindings[*]`、`job.approvedContractBindings[*]`、`job.sourceMedia[*].sourceIdentityBinding`、`job.sourceMedia[*].mediaBinding`、`job.sourceMedia[*].retainedSourceAtomsBinding.sourceAtoms`、`.generationManifest`、`.validationReport` |
| `legacy-caption-b1` | `job`、`job.implementationBinding.files[*]`、`job.implementationBinding.dependencyFiles[*]`、`job.sourcePackageBinding.manifest`、`job.sourcePackageBinding.validationReport`、`job.semanticOutputBinding` |
| `meaning-boundary-selection` | `job`、`job.implementationBindings[*]`、`job.approvedContractBindings[*]`、`job.sourcePackageBinding`、`job.b6ManifestBinding`、`job.providerEnvelopeBinding`、`b6Manifest.b5ManifestBinding`、`b6Manifest.b6JobBinding`、`b6Manifest.rawResponseBinding`、`b6Manifest.generateRequestBinding`、`providerEnvelope.rawResponseBinding`、`b5Manifest.generateRequestBinding` |
| `meaning-information-package` | `job`、`job.implementationBindings[*]`、`job.approvedContractBindings[*]`、`job.timelineCompositionDecisionBinding`、`job.semanticSelectionValidationBinding`、`job.semanticSelectionBinding`、`timelineDecision.sourceMedia[*].sourceIdentityBinding`、`timelineDecision.sourceMedia[*].mediaBinding`、`timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.sourceAtoms`、`.generationManifest`、`.validationReport` |
| `output-runner` | `job`、`job.requestBinding`、`job.implementationBindings[*]`、`job.approvedContractBindings[*]`、`request.meaningInformationPackage`、`request.baseMediaInput.baseMedia`、`.timeline`、`.generationManifest`、`.validationReceipt`、`request.styleInput.presetBinding.trustedRegistryBindings[*]`、`.presetRegistry`、`.presetValidationIndex`、`.materialValidationIndex`、`.rendererTrust`、`request.styleInput.cropPolicy.application` |

許可表の省略表記`.name`は直前のobject prefixを共有する説明上の表記であり、実装exportは省略しない完全な文字列配列とする。

## 8. output必須export guardの実読取接続

F16のguardをasync化し、必須export欠落時だけ次を行う。

1. `role=common-renderer`をexact 1件選ぶ。
2. 既存`readStable`で実fileを読む。
3. 既存`hash`でjobのlive SHAと一致させる。
4. 合格した観測だけをF01の`output-runner`境界へ渡す。

読取不能、SHA不一致、role 0件／複数件は`targetFile:null`の`REQUIRED_EXPORT_MISSING`とする。正常namespaceは従来どおり即`passed`。正式mainは既存環境照合後に同guardを`await`する。stable-read/hashの新実装は作らない。

## 9. 群F: failure reportのowner分離

F11の共用one-file publisherは、claim段の次の固定sentinelだけを`target-invalid`として返す。

- `publication-target-exists`
- `publication-staging-exists`
- `unsafe-publication-path`
- `publication-roots-not-siblings`
- `unsafe-publication-parent`
- `unsafe-staging-root`

それ以外のNode I/O、resource失敗、write失敗、no-replace公開失敗はthrowする。failure-report wrapperは`target-invalid`だけを`REPORT_TARGET_INVALID`へ、それ以外を`REPORT_PUBLICATION_FAILED`へ写す。生error codeやmessageはreportへ保存しない。

## 10. 正式81件の事前固定

### 10.1 用途を置換する2 ID

| ID | 新しい証明 | 旧証明の残存先 | 証明損失 |
| --- | --- | --- | --- |
| `FOVF005` | 意味情報packageの正式runner→共用publisher→正式writerを通す正常公開。`passed / exit 0`、公開byte=runner byte、failure root追加0 | 旧stable rootの同一tag/root/OID/count検査は`FOVT004`が同じ`verifyStableRoot`で保持 | 0件 |
| `FOVI009` | `post-render-qc`の実child失敗と、生stdout/stderrの親非漏洩 | signal実発火は`FOVO010`、生値拒否は`FOVC027 / FOVF008`が保持 | 0件 |

### 10.2 同じID内で強化する検査

| ID | 追加・置換する証明 | 元証明 |
| --- | --- | --- |
| `FOVC022` | 5境界の固定許可表exact一致と、呼出側自己許可不能 | 表外field拒否を包含 |
| `FOVC026` | source record未検証時はnull | 未読時nullを包含 |
| `FOVO004` | input-readに加え、意味情報failure reportの正式直列化失敗実枝 | code所有を維持 |
| `FOVO006` | 実F18 fileをstable-read/SHA照合したtarget、偽SHA時null、正常namespace passed | export欠落code所有を包含 |
| `FOVO008〜010` | childのraw markerがError、親結果、正式byteへ0件。3 codeとoverlay段階は維持 | 元のspawn/nonzero/signal所有を包含 |
| `FOVO013` | target検査後失敗と、claim中のNode I/Oを`REPORT_PUBLICATION_FAILED`へ分離 | 実公開失敗を包含 |
| `FOVI002` | layout-preflightのproduction child失敗を実発火。既存数値token実害fixtureも保持 | stageの実害記録を維持 |
| `FOVI004 / FOVI005` | semantic-rebuild段階をproduction child失敗で実発火し、旧byte型／binding実害fixtureも保持 | 旧target null／一意target証明を維持 |
| `FOVI006` | crop-frame-inspection段階をproduction child失敗で実発火。export欠落は強化後FOVO006が保持 | 証明移管を明示 |
| `FOVI008` | timelineと意味packageのsource-media-readを既存実runnerで発火 | 2 report分離を包含 |
| `FOVB003 / FOVF006` | timelineのidentity file SHA、invalid JSON、canonical SHA、media SHAの4拒否が既存code・`rejected / exit 1`でfatal化しない | 既存passed/rejectedと静的非統合確認を包含 |
| `FOVF008` | 5境界の正式fatal byteとchild markerが生値0件 | 禁止key検査を包含 |

その他のIDは目的とassertを維持する。F02 41件、F03 40件、総数81件は不変。

## 11. 13 stage・14 codeの証明割当て

### 11.1 13 stage

| stage | 証明ID |
| --- | --- |
| `runner-bootstrap` | FOVO006 |
| `job-read` | FOVO001 |
| `source-media-read` | FOVI008 |
| `input-read` | FOVO002〜005 |
| `semantic-rebuild` | FOVI004・005 |
| `formal-serialization` | FOVO004の追加枝 |
| `crop-frame-inspection` | FOVI006 |
| `layout-preflight` | FOVI002 |
| `overlay-render` | FOVO008〜010 |
| `post-render-qc` | FOVI009 |
| `publication` | FOVO011 |
| `failure-report-publication` | FOVO012・013 |
| `unknown` | FOVO014 |

`semantic-rebuild`と`crop-frame-inspection`は親設計が明記した凍結済み実害の再現であり、forward-only新経路へ当該処理が既に接続済みとは主張しない。ただし単なるobservation builder呼出しではなく、閉じた段階値を受けるproduction child入口の失敗枝まで通す。

### 11.2 14 inner code

FOVO001〜014を番号順に14 codeの一対一ownerとして維持する。FOVIの段階検査はcode所有の代替にしない。

## 12. 正式attempt前の追加監査

次を固定表`項目 / 現物path:line / owner / 期待 / 観測 / 証明ID / verdict`で保存し、6/6 PASSでなければ81件を開始しない。

1. 追加・移動した全呼出しの定義、static import、exportが実在する。dynamic import、fallback、重複ownerは0件。
2. 変更した全catchで、既存rejected sentinelがgeneric fatalより先に既存mappingへ戻る。
3. F18の全child callに正しい段階があり、失敗時の生出力が親・正式byteへ0件。
4. 5境界の全target選択が固定許可表と検証済みsource recordへ接続し、呼出側自己許可が0件。
5. staging root作成、target既存、write、atomic publishのownerがtarget不正と公開失敗へ分離される。
6. 各境界の正常／rejected実経路の有無を明記し、未実行を証明済みと書かない。

構文検査は固定Node、TypeScriptのmodule解決は固定TSX loaderで行う。正式工程では`npm exec`等のpackage導入を伴うcommandを使わない。

## 13. path閉包

新しいpathは追加しない。修正対象は親設計の既存18 pathのうち次だけである。

- F01、F02、F03
- F04、F06、F08
- F11
- F16、F18

F05、F07、F09、F10、F12〜F15、F17は直接影響回帰または開始byte維持の対象とする。版付き設計・停止・監査・TAP・完了報告は実装path上限に数えない既存運用を維持する。

## 14. 実行順と停止

1. 本設計を版付き保存する。
2. 18 path内の限定修正を行う。
3. §12の追加監査を行う。
4. 正式81件を新attemptで頭から一度実行し、TAP全文とstderrを版付き保存する。
5. 81/81の場合だけ、直接影響130/130、green 287/287、baseline 64/181 exact不変、5 tree最終照合へ進む。
6. 全合格時だけcommit Aを作り、18 path SHA表付き完了報告を固定する。

新たな現物差、契約解釈、19 path目、実発火不能、status・既存違反code・終了code変更、生文字列必須化、計算複製、固定値差、既存成果物差、検査不合格1件のいずれかで停止する。正式attempt開始後は同attemptで直さない。

## 15. 事実・推測・未確認

### 事実

- 群A〜Fの変更先は承認済み18 path内にある。
- 既存schema・違反code・終了codeの改訂は不要である。
- 81件は2 IDの用途置換と既存IDの強化で維持でき、置換する旧証明は別IDが同じ処理で保持している。
- 外部通信は0回、費用はUS$0である。

### 推測

- 本修正により正式81件の前に判明した6群は解消する見込みである。

### 未確認

- 修正後81/81、直接影響130/130、green 287/287、baseline exact、5 tree不変。
- 正式attemptで初めて見える新しい不合格の有無。

