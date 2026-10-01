# 9. 明示Digest依頼から通常登録・次工程消費まで — 隔離実装指示 v005

発行日：2026-10-01（JST） / 発行者：ZEV Build Loop相談役
`decision: continue`
着工根拠：kawafmm承認済みID9と本人の「終わったら次に進んで」に基づく、同じ主線の開発・隔離実装試験。以下の開発候補差分を具体的に指示する。**公開契約の正式適用、一般利用の機械判断委任、実業務への導入、動画実行許可方式の改訂について、新たな本人承認を受領したという意味ではない。** これらは§7の未承認事項として分離する。
監査基準main：`d77f2a5ddc48016e6e1c7f22bee454fc231ffda7`。
前指示：[v004](ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md)。設計成果：[一案](../reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)。v001〜v004と元証拠は保持する。
担当：Codex2単独、同じセッションで続行。Codex1再起動・人間転記・新しい視聴は不要。

**2026-10-01再開追記：本人の「良い。指示書作って」を受領。`debd5897`で停止した参照対応修正に限る追加1回と、その後の既承認検証を§11で明示許可する。一般の修正上限・履歴は変更しない。§11が今回の再開範囲、§1〜10はその基礎と履歴である。**

## 1. 監査結果と今回の終点

v004の設計・境界実測を受理する。相談役は一案・probe・保存結果・主report・6ファイル差分と、通常complete／所有者・共有命令生成・既存artifact PUT・stdin transportの現物を照合した。10件はkind／形状受理2と想定拒否8であり、Digest通常キュー完成や製造資格ではない。別processの26保護path確認は保存証拠・Codex報告に基づき、相談役がMacで再実行した判定ではない。

特に、通常completeはFileRef.ownerIdをOutputEntity IDにする一方、旧準備fixtureは依存命令IDを使っていた。旧準備・消費の限定受理を取り消さないが、次の試験ではこの差を実completeで解消する。source_videoのJSON参照と実動画のbytesも別に束縛する。

**終点：明示Digest依頼→通常approve→next/claim→実runner/factory→計画のupload/complete→次の通常命令がFileRefと参照先一式を再読→検証結果を通常completeする、一系列の隔離実装試験。** 今回は動画を作らない。試験専用queue、未接続helper、別保存adapterだけで終えず、現在の通常処理そのものを使う。製品利用開始・実AI品質の評価とは区別する。

## 2. 開発候補として実装する型・工程

- 新規依頼の `productionType: 'clip' | 'digest'` を必須とし、保存下書き・承認snapshot・命令へ維持する。欠損・未知値・不一致を拒否する。purposeの単語・preset・素材ID・ファイル存在から系統を推測しない。既存Clip送信callerは明示clipだけを送る。Digest選択画面は作らない。
- Clipは既存7工程と現在のテーマ／場面／生成前確認条件を維持する。Digestの開発候補工程列は `prepare_video → run_stt → prepare_digest_plan → validate_digest_plan` のみ。共通queue・claim・complete・FileRef／OutputEntityを使う。`render_digest_video` の型・命令・ready化・実行callerは追加しない。
- `prepare_digest_plan` の結果は `digest_plan_json / digest-plan-artifact-v001`、`validate_digest_plan` は `digest_execution_input_json / digest-execution-input-artifact-v001`。OutputEntityにも区別できる専用種別を追加する。旧Clipのtheme/composition/edit型へ偽装しない。
- 薄い成果物のfield案はv004提案を基本とするが、**consumptionBindingは計画成果物の必須fieldから外し、検証成果物側に置く。** 計画の完了登録に、次工程が行う消費・時計検査を先取りして要求しない。prepareが採否・保持の正本を保存し、validateが登録済み正本を再読・消費する責務を分ける。
- backendは新kindと対応schema/version・必須field・依頼ID等を確認し、runnerは実参照、承認版、入力・要求・回答、ID集合・被覆を厳密再検証する。kindだけの合格を詳細検査に代用しない。二つの薄い成果物へ採否本文を重複コピーしない。
- `admission`は計画整合、字幕／演出の接続、動画実行許可、人間品質を分ける。今回、字幕／演出は未接続、動画許可は未承認、人間品質はpendingを維持。検証工程の成功は「検証を完了して不足を記録した」であり、「動画実行可能」ではない。
- 保存source inspectionが正式に参照・SHA対応できる場合だけ既存時計consumerを使う。未提供は未提供と記録し、再inspectionや仮の時刻で埋めない。未提供を表す明示null／理由と、提供された参照の欠損・改変によるエラーを区別する。後者を単なるpendingへ丸めない。消費未実施ならconsumption／clock等も未生成とし、架空bindingを作らない。

## 3. 通常登録・素材・判断通信

1. source/STTの**実処理は起動せず**、承認済みの旧保存素材とSTTを、隔離backendの通常claim・必要なPUT・completeで登録する。stateへ成功命令・FileRefを直書きするfixtureで所有者問題を隠さない。未実施の取得／STTをE2E合格と称さない。
2. `request.result.outputId → OutputEntity.id → OutputEntity.fileRefId → FileRef.id` と `FileRef.ownerId === OutputEntity.id`、request.result.fileRefId／fileRefIds、種類・依頼・依存を対応付ける。最後の同種成功物ではなく当該命令の依存graphを辿る。旧fixtureのownerId=命令IDも受理する救済分岐は作らない。
3. source_videoがJSONなら、その登録JSONのSHAと、正規source resolverが解決する実動画のSHA・サイズ・由来を別に検査／保存する。MP4登録は実動画bytesとして扱う。JSONのSHAを実動画SHAへ流用せず、URI一致だけで同一素材にしない。承認済みpath境界・symlink等の安全検査は維持する。
4. 通常indexが明示系統から工程factoryと既存3Skillを呼ぶ。入力・承認・保存・登録・次工程消費は試験用に差し替えない。判断通信だけを通信しない応答fixtureへ置換する。
5. 既存 `judgeThroughStdinV001`（`evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts`）を必要な薄い接続で再利用してよい。新しい推論provider/API・固定回答の本番既定は追加しない。request SHAを持つ各要求に対応する一回答を順に扱い、EOF・欠損・別要求回答を拒否する。stdin接続だけで自律推論が備わったとしない。今回の試験は固定応答でありAI選定品質を認定しない。

## 4. local／uploadの参照一式

- 通常PUTは `/artifacts/:draftId/:fileName` の安全な単一fileNameを受け付ける。**nested pathを許す新endpointやpath検査緩和は不要。** 新版の保存物を生成する時点で、request ID等を含む一意な安全fileNameと同じdraft内の論理artifact参照へ束縛する。実装形の小さい分割はCodex判断でよい。
- 薄い成果物だけでなく、その消費に必要な計画・要求・回答・保持・素材参照・明示inspection等のデータ参照一式を列挙し、通常PUT／取得経路を使って必要な実bytesを移送・検証する。実装参照の履歴検証とデータ転送は分ける。任意のローカルファイル、他draft、外部URLを参照に混入して読取／転送しない。
- pathの違いで旧保存JSONを書き換え、新SHAを旧回答へ付け替えることは禁止。新版の参照解決を設計し、同一の論理参照・内容SHAを異なるartifact rootで解決できるようにする。旧保存物をこの新版へ自動移行しない。
- upload先の全必須データ確認後に工程completeへ進む。欠損・SHA違い・upload失敗ならcompleteしない。再送時は既存bytesの一致を確認して再利用し、同名別内容を上書きしない。kindだけ通るポインタで欠けた内容を隠さない。
- localとuploadを両方試験する。uploadはworkerとbackendのartifact rootを分離し、次processが転送元のローカルデータへ暗黙にアクセスせず、登録済み参照と転送先bytesだけで再読できることを示す。必要な旧動画bytesの独立copy／転送は可だが、映像・音声再製造、STT、inspection実行は不可。

## 5. 変更を許す開発候補path

必要な箇所だけ変更する。一覧すべてを変更する義務はない。これは新しい数値path上限の設置ではなく差分の対象指定。既存の上限・停止条件は維持する。

| path | 許可する差分 |
|---|---|
| `packages/shared/src/index.ts` | 明示系統、Digest2工程・2kind／出力種別、系統別の工程列・依存判定・入力整合 |
| `packages/shared/src/digest-plan-artifacts-v001.ts`（必要なら新規） | 新しい薄い成果物の共通型・閉じたfield/版検査のみ。汎用store・新承認制度は作らない |
| `client/src/App.vue` | 現行Clip送信へ明示clipを設定するだけ。画面・入力UI追加なし。既存表示名二項目の型追従は§10の限定追記に従う |
| `client/src/api.ts`、`client/src/stores/controlQueue.ts` | 必須型追加のcaller追従が必要な場合だけ。新変換・新機能なし |
| `backend/src/store/json-store.ts` | 新型保存・未知版拒否。旧state無改変、移行未承認の状態への作用拒否 |
| `backend/src/routes/control.ts` | 系統／命令／出力対応、新kind完了登録前検査。既存claim・所有者・一回完了を維持 |
| `backend/src/artifacts/validation.ts` | 新kind/schemaと参照の必須検査。旧Clipの検査を免除しない |
| `backend/src/domain/restart.ts`、`backend/src/domain/state-selectors.ts` | 明示系統と依存の整合。今回未対応のClip専用再編集操作はDigestに拒否し、旧承認を移さない |
| `runner/src/workflow-artifacts.ts`、`runner/src/workflow-artifact-validation.ts` | 専用成果物・詳細検査、Clip/Digest誤消費拒否 |
| `runner/src/workflow-step-builders.ts`、`runner/src/index.ts` | 通常dispatch・必要参照の保存転送と再読・stdin接続。試験だけの別runnerを作らない |
| `runner/src/digest-plan-preparation-v001.ts` | 明示系統／新工程、実登録所有者、素材JSONと実bytesの分離、新版binding。旧builder／内容validatorは変更しない |
| `runner/src/digest-plan-consumption-v001.ts` | 登録計画から次工程への読取・出力、準備新版の参照、admissionの区別。元時計処理は維持 |
| `runner/src/steps/source-video.ts` | 必要なら既存の副作用なし素材参照解決を共用exportするだけ。取得・変換方式変更なし |

対象試験は既存の `docs/reports/request-intent-connection-20261001/` に `queue-integration-test.mts` と必要な軽量証拠・旧版保全proofを置いてよい。関連の既存テストは期待値の意味を維持した型追従だけを許可する。無関係なテストの合格値を変更しない。source以外の新しい工程モジュールや表外の製品fileが必要なら、具体的に不足する一差分をGPT_DECISIONへ返す。

`backend/src/domain/control-review.ts`、既存assembly/Core/renderer/native QC・内容判断Skill/validator・AGENTSの権限・DECISIONSは変更しない。既存artifact PUT/GETは再利用し、認証・path制限の変更は許可しない。

## 6. 旧版・実業務・試験資格

v004の旧版保全案を今回の開発差分に適用する。旧16/5 live参照の不変を今後永久に要求して実装を凍結するのではない。

変更前に旧proof、binding、参照データと固定Git版 `11809f6f`／`7b600a64` の対応を保存する。変更後の現行readerは旧内部binding版を拒否してよい。旧回答・承認・proof・素材を改変せず、固定Git blobと旧proofの読取り専用来歴確認は履歴検査に限定する。旧readerの再実行や現行製造資格の検証と称さない。大量のreader複製、hash免除、旧動画の再製造は不要。

新規通常処理は明示系統と新しいbinding版だけを受理する。識別を持たない旧業務stateへclipを補完・filter削除・上書きしない。読取と作用を分け、移行が必要な旧状態の更新は明示拒否する。新しい隔離stateだけで実走し、実業務の既存サービス・監視対象を起動／再起動／停止／切替しない。実業務watcherが開発ファイル変更を自動適用する等、分離を維持できない場合は変更前にその事実を相談役へ返す。

旧27／20／111試験や全動画を一律再実行しない。今回の型と実経路に必要な試験、およびClip既存挙動の対象回帰に限定する。累積設営修正3・製品限定修正2、その他既存枠は継続し、本版でリセットしない。この数値は初回発行時点の履歴であり、現在の累積と本人承認済み例外は§11に従う。

## 7. 正式適用とは分けて残す本人判断

未承認の適用事項を本書・インデックスに保持する：

- `ID9-PD-01`：公開入力／工程契約を本適用し、通常Digest下書きの承認で品質pendingの機械採否・保持まで一般的に委任するか。推奨案はその範囲だけを明示し、人間品質採用とはしないこと。
- `ID9-PD-02`：動画実行許可を、どの具体的計画／基礎映像／最終出力のSHAとscopeへ結び付けるか。今回、その承認record・人間操作・動画ready判定を実装しない。
- 旧業務stateの移行・本番有効化は別。今回のcommit・試験合格だけでは実施しない。

上記は品質視聴Pendingとは別の適用判断である。今回の固定応答による隔離実装試験を本人の一般委任の実績と扱わない。この未回答を埋めるために架空承認や追加のテーマ選択作業を作らない。今すぐの人間視聴・採点・ラベル付けは不要。

## 8. 必要な証拠と完了条件

1. 異なる目的の明示Digest依頼2件を通常APIで作成・承認し、source JSON参照とSTTを実claim/complete登録する。次工程は正規OutputEntity所有者を持つ参照を読む。MP4直接登録分岐も対象検査する。取得・STT処理自体がfixtureである範囲を記録する。
2. 実index／factoryの通常dispatchから、新2工程の生成・処理・upload/complete・依存消費・次のcompleteまで行う。判断応答以外を試験専用に再実装せず、通常stateに成功値を直接注入しない。
3. local/upload、別artifact root・別process、複数候補・keep/drop/keepで、目的全文・出所・個々の区間／断片・順序・時計が維持される。完了保存の再読で不要な再判断がない。
4. 未承認、系統欠損／不一致、期限切れclaim、別draft／素材／依頼版、owner不一致、source JSONと実動画の混同、未知版／欠損／改変、未転送参照、Clip/Digestの誤消費を拒否する。転送不完了でcompleteしない。入力資格不成立時の作用が増えていないことを確認する。
5. Clipの明示入力は従来工程と確認条件を保つ。DigestにはClipの単一テーマ質問を追加せず、動画命令は存在しない。admissionの不足と技術検証結果、人間品質を混同しない。
6. 旧データ・proof・業務state不変、固定版の履歴確認と現行旧版拒否、shared/backend/runner/client/Remotionの影響範囲の型検査を記録する。実行した試験と静的確認・未実施を区別する。

## 9. 保存・監査・継続

主reportは既存 `docs/reports/request-intent-connection-20261001/README.md`。v004の設計受理とv005の開発候補実装を区別して記録する。今回の実質checkpointでCURRENT_GOALとHANDOVER_INDEXの担当行へ同期する。未承認適用事項を完了にしない。

通常main・明示stage・commit/push、他者変更保全、専用Edgeタブ、同じZEV Build Loopへの直接送信を維持。相談役の本指示保存後に同期し、同じセッションで続行する。新しいbranch/worktree・任意のfeature flag／上限／timerは作らない。

報告：`Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 明示Digestの通常キュー接続（隔離実装）`。実caller、実complete、local/upload、次工程の消費、旧版保全、admissionの不足、未承認適用範囲を示す。完成・不足を相談役が監査し、実施可能な主線の次指示を同じ返答で返す。外部推論・費用・新素材・STT・inspection・動画・公開は0のまま。受理記録だけの再commit・終了連絡・再起動・Codex1呼出しは不要。

## 10. 2026-10-01：client表示名二項目の限定型追従

`decision: continue`。kawafmm承認済みID9／v005の開発候補に伴う型追従として、§5のApp.vue許可差分に以下だけを追加する。一般委任・本適用・動画許可・新UIの承認ではない。

対象checkpoint：`c37ab096b716b9a3b017dd107fba03bc345c2816`。相談役は[判断依頼](../reports/request-intent-connection-20261001/queue-client-type-followup-request.md)と同SHAの `client/src/App.vue` を照合した。`fileRefKindText` は `Record<FileRef['kind'], string>` の全kind必須辞書で、新二kindの表示名がない。型検査の実行結果はCodex報告に基づき、相談役自身の再実行ではない。20ファイルの実装全体や接続完了を今回受理したものではない。

許可する変更は `fileRefKindText` の既存辞書への次の二項目だけ。既存 `output_video: '完成動画'` を含む七項目の文言・挙動は維持し、必要な区切りのカンマ以外を変更しない。

```ts
digest_plan_json: 'Digest計画',
digest_execution_input_json: 'Digest入力検証'
```

`Partial`、`any`、任意文字列index、型assertion、fallbackで網羅検査を弱めない。新画面・Digest選択UI・入力項目・操作・状態／承認判定・本番設定は追加しない。既存の明示clip送信は保持する。

適用後はclient型検査を実施し、結果を次の実質checkpointへ記録する。既に許可された隔離API／実runnerの接続試験は同じセッションで続行し、この表示名追加のために旧動画・全試験を再実行しない。累積設営3・製品限定修正2をリセットせず、既存枠の扱いは維持する。追加の人間作業、Codex1再起動、受理記録だけの再commit・終了連絡は不要。

保存時点：二表示名の適用・client型検査の再合格は未確認。接続試験は報告時点で未実行、実装全体は未完了。相談役はCodexのMac上のprocessを直接観測していない。

## 11. 2026-10-01：本人承認済みの参照対応修正1回と検証再開

`decision: continue`。**kawafmm承認済み。** 相談役が「今回の参照不整合の修正だけ追加1回（累積4回目）を許可し、その後に既承認の接続検証を再開する」と提示した件について、本人から「良い。指示書作って」と回答を受領した。この個別例外と再開を明示指示する。以前の `human_decision`／本人承認待ちはこの対象について解消した。指示発行はCodex2の受領・再開・修正完了の確認ではない。

### 11.1 基準と修正枠

- 中断した実装・証拠：`debd58971f543958df0022988e00bed9e20ddcbc`。直前の停止監査・本人判断待ちの保存HEAD：`ad180adce010bd3eb765f081f451a39b354b7d9f`。これらとattempt-001/002、旧96保護file・21固定Git blobの来歴を保持する。
- 中断時の累積は製品限定修正3、設営修正4。**今回の参照対応不整合を直す一連の最小差分だけ、追加1回＝製品限定修正の累積4回目を許可する。** 一般の3回上限やAGENTSは変更せず、別工事・別版として回数をリセットしない。複数の別不具合をこの1回へまとめない。
- stdoutの誤検出を除く設営修正は、適用した時点で設営5回目として記録する。既存の5回枠を増やさない。表示名二項目は§10で許可済みで、再承認待ちに戻さない。
- この修正の後、検証を実行すること自体に再承認は不要。別の製品修正、設営枠超過、その他の強制停止条件に達した場合は、追加作用を止め、証拠と必要な一点を相談役へ返す。新たな余剰枠・上限・timerは設置しない。

### 11.2 修正する不整合と対象

[不整合の一次証拠](../reports/request-intent-connection-20261001/queue-logical-reference-gap-evidence.json)：採否要求は `artifacts/<draft>/candidate-set.json` を宣言し、保存registryは `artifacts/<draft>/<request>--candidate-set.json` を指す。内容SHAは一致しても、宣言先は不存在。これを参照対応の欠陥として直す。内容判断や動画品質の修正ではない。

主対象は `packages/shared/src/digest-plan-artifacts-v001.ts` の論理参照resolverと、`runner/src/digest-plan-preparation-v001.ts` の論理outputRoot／file形成／registry照合。新規の論理参照を `artifacts/<draft>/<producer-request>/<file>` とし、既存PUT/GETが扱う安全な単一fileName `<producer-request>--<file>` へ決定的に解決する。builderがoutputRootにbasenameを足した参照と、保存・読取・転送の参照を同じ規則にそろえる。

同じ不整合の修正に不可欠な場合だけ、§5で許可済みの消費側・index／factory・新Digest成果物検査の参照形成や読取にもこの共通規則を適用してよい。独立した欠陥修正・新機能を追加せず、変更したcallsiteと本件との関係を記録する。表外の製品file、内容builder／内容validator、元時計処理、認証・PUT/GET endpoint・path安全条件は変更しない。

同一draft内でも任意requestの参照は受理しない。計画自身または正規の依存鎖に束縛された生成元requestを検証する。正当に参照するsource/STTの別工程requestを「計画と同じIDでない」という理由だけで拒否する規則にはしない。名前衝突・別draft・依存外request・path traversal・欠損・SHA不一致を拒否する。別名alias、同名コピー、fallback、旧JSON／要求／回答のSHA付替えで不整合を隠さない。

### 11.3 実施順と検証

1. 他者変更を保持して最新mainと本書を読み、今回の承認と再開を受領記録へ合わせる。実業務サービスと隔離できること、他担当のGit操作と競合しないことを既存手順で確認する。Codex1は起動しない。
2. 参照対応を最小修正する。まず小さい局所試験で、探索・採否・保持の**要求内部の参照**とregistry・実bytesが一致することを確かめる。上位manifestや列挙されたdataBindingsだけの確認にしない。登録前と次工程の読取で、未解決の内部参照がある計画を合格・completeにしない。既存閉包検査へ必要な最小確認を入れ、汎用保存基盤を新設しない。
3. `queue-integration-test.mts` のstdout本文中の「失敗」などを成否判定に使わず、実process exitと実queue／工程状態を確認する設営修正を行う。`--max-steps=1`の予定停止と命令失敗を分ける。exit成功だけで参照整合・消費成功を認定しない。§10の二表示名も適用し、client型検査を行う。
4. **新しい隔離attempt**へ適用して§8の未実施検証を続行する。旧attemptの計画・回答・state・証拠を修復上書きしない。新requestは実入力から要求SHAを作り、通信しないproviderの対応回答を使う。旧回答のSHAだけを新要求へ書換えない。
5. 通常source/STTの実claim/PUT/complete、計画complete、次のvalidate_digest_planの実消費／complete、local/upload・分離root・別process再読、MP4枝・inspection未提供枝、否定試験・Clip対象回帰と影響範囲の型検査まで進める。元動画取得・STT・inspection・動画製造は実行しない。修正で影響する接続は確認するが、済んだ全動画・旧111試験・人間レビューを再要求しない。

### 11.4 保存・終了条件・対象外

旧証拠は不変に保持し、修正後の証拠はattemptと実装SHAを区別する。論理参照→物理名→registry→実bytesの対応、内部参照の欠落拒否、転送先だけからの再読、各未実施検証の結果、実際の製品／設営累積を既存主reportに保存する。v005が未完了なら未完了と報告し、通常complete成功だけで全閉包・動画・品質を合格にしない。

旧成果・実業務state・既存稼働サービス・内容builder／validator・QC・人間回答を変更しない。ID9-PD-01/02、本適用、一般委任、動画実行許可、公開は未承認のまま。外部推論・費用・新素材・STT・inspection・映像音声製造・新UIは対象外。許可済み隔離backend通信・必要な旧bytesのcopy／転送は§3〜4の範囲を維持する。

担当fileだけを明示stageし、通常commit/push・Git状態の記録・同じZEV Build Loopへの直接報告まで行う。EdgeはCodex2自身の専用タブだけを使う。応答保存だけの独立commit・終了連絡・Codex1再起動は不要。人間の視聴・採点・転記を次作業にしない。

報告名：`Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 参照対応修正・通常キュー接続の再検証`。別不具合や枠超過で停止した場合は `GPT_DECISION` とし、未完了範囲・新しい原因を具体化する。完了後は相談役が監査と実施可能な次指示を同じ返答でつなぐ。今回の受領・再開は保存時点では未確認である。


## 12. 2026-10-01：軽微な設営判断の相談役自動承認と再開

`decision: continue`。**kawafmm承認済み。** 本人から「良い。これは重要な確認か？ 独断で決めれる程度なら自動で承認して。指示書を作って」と明示指示を受領した。相談役は、今回の4行修正は製品方針・品質・契約・費用・権限・本番挙動を決める事項ではなく、局所参照試験の組立てだけを直す軽微な設営判断と判定する。今後の同種事項は[AGENTS.md](../../AGENTS.md)「相談役による軽微な技術判断の自動承認」に従い、本人へ都度確認せず相談役が判断する。

### 12.1 今回の自動承認

- 対象checkpoint：`01ad1e54dbb95d10e6013a7076d274be2dfcf9fd`。
- [失敗証拠](../reports/request-intent-connection-20261001/queue-reference-setup-failure-attempt-003.json)と[未適用4行案](../reports/request-intent-connection-20261001/queue-reference-setup-followup-request.md)を根拠に、`queue-integration-test.mts` の references 枝だけを直す。
- 旧書き起こしは schemaVersion を持たないため、JSON版付きbindingに偽装せず、既存bytesをそのまま保存し、`path + fileSha256` のbyte参照としてregistryへ入れる。
- 具体案は保存済みの4行をそのまま適用してよい。製品serializer／validator、通常caller、provider、旧素材、旧回答、要求SHAの意味は変更しない。
- この修正を**設営修正の累積6回目**として例外承認する。一般の5回上限を恒久変更・リセットしたものではない。次の独立した設営不具合が出た場合も、Codexが自己承認せず相談役へGPT_DECISIONを返す。相談役は新しいAGENTS規則に従い、軽微なら本人確認なしで判断する。

### 12.2 再試験と続行

1. 失敗attempt-003は不変に保持し、新しい局所attemptで4行修正を検証する。
2. 局所参照が成立したら、§11で既に承認済みの通常接続検証へそのまま戻る。再承認待ちは不要。
3. 通常source/STT実claim/PUT/complete → 計画complete → validate_digest_plan実消費/complete → local/upload・分離root・転送先だけの別process再読 → MP4枝・inspection未提供枝 → 否定試験・Clip対象回帰 → 必要型検査まで進める。
4. 成功条件はprocess exitだけでなく、要求内部の参照、registry、実bytes、通常complete、次工程再読が対応していること。元発話本文やログ文字列で成否を推測しない。
5. 新しい**製品修正**が必要、費用/API/新素材/本番作用が必要、製品方針・承認意味が変わる、または強制停止条件へ到達した場合は停止し相談役へ返す。軽微な設営・技術判断は本人へ直接上げない。

### 12.3 変えない境界

ID9-PD-01/02、一般委任、本適用、旧業務state移行、動画実行許可、公開、人間品質は未承認／pendingのまま。外部推論・費用・新素材取得・STT実行・inspection実行・映像音声製造・新UIは今回の対象外。Codex1は起動せず、Codex2専用Edgeタブを維持する。

報告は従来どおり `Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 参照対応修正・通常キュー接続の再検証`。軽微な設営判断だけを理由にkawafmmへ転記・確認を要求しない。
