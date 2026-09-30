# 9. 通常キューへのDigest接続 — 最小仕様案 v001

2026-10-01 / Codex2 / 調査基準main `ee032be8b2f19a0dcb0f795a459725de125ff1f4`。v004の設計成果であり、製品契約・実装・承認方式の採用ではない。

## 推奨する一案

**依頼へ明示的な制作系統を加え、共通キューの中にDigest固有工程と参照だけの成果物を置く。内容の機械採否と人間品質を分け、特定計画の動画実行許可に到達するまで製造を閉じる。** Clipの既存7工程は維持する。Digestの採否・非連続保持を一テーマ型へ変換しない。別runner・別queue、追加の任意依存だけで別保存する構成は採らない。

次の着工は、この一案の**明示依頼→計画準備→通常完了登録→依存するDigest入力検証工程の再読**に限定することを推奨する。動画実行・ZEVOの不足接続・承認方式の改訂は、その具体的な入力と許可が閉じた後の差分とする。製造を未接続のまま「動画まで完成」と報告しない。

## 現行の実経路と不足

| 境界 | 現物の処理・保存先 | そのまま使える範囲／不足 |
|---|---|---|
| 入力 | `client/src/App.vue`の依頼送信→`client/src/stores/controlQueue.ts`→`client/src/api.ts:createDraft`→POST `/request-drafts` | 入力はpurpose等6項目。Digest/Clipの明示識別なし。初期文・presetはShort用だが識別の根拠にしない |
| 下書きと承認 | `packages/shared/src/index.ts:createRequestDraft`、`backend/src/routes/control.ts`のapprove→`createAgentRequestsFromDraft`→`backend/src/store/json-store.ts` | purpose・素材・条件・policyを保存し、承認後に7命令を作る。制作系統を保存する項目なし。下書き承認は特定編集計画や品質の承認ではない |
| next/claim | `isAgentRequestReady`→next→claim、所有者・期限・依存状態の検査 | 共通処理は再利用可能。テーマ・場面・生成前確認のblockingはrequestの工程種別に固定され、policyのfalseで消えない |
| 準備 | `runner/src/index.ts:STEP_ARTIFACT_BUILDERS`→`createStepArtifactBuilders`→`prepareDigestPlanV001` | 通常indexはDigest依存を渡していない。明示依存試験では3判断を実行するが、返す通常成果物はtheme_jsonのまま。Digest準備bindingはcomplete登録されない |
| 完了 | buildArtifact→upload→buildCompletion→POST complete→`validateCompletionFileRef`→`completeAgentRequest` | 一つのFileRefとOutputEntityを登録する。kindは工程から決まり、JSON本文の詳細構造は検査しない。登録対象だけuploadされ、未登録の18/4参照ファイルは他processへ自動転送されない |
| 依存の再読 | `requireWorkflowRequestOutputFileRef`→`readArtifactByUrl`→`assertJsonArtifactForKind` | 現在は同じdraftの最後の成功工程を探す。Digestでは依存命令・登録出力・所有者・版・SHAまで閉じた参照が必要。Clip詳細型は複数採否のDigest型を受けない |
| 消費 | `readPreparedDigestPlanV001`→`digest-plan-consumption-v001.ts`→既存job／時計validator | 保存採否・保持から4出力を復元できる。ただしsource/STT完了はfixture。通常FileRefのownerはOutputEntity ID、準備検査は依存命令IDを要求しており一致しない |
| 素材の実bytes | `runner/src/steps/source-video.ts:prepareSourceVideoArtifact` | YouTube時はMP4登録、local時はsource_video JSONを登録。準備処理はそのFileRefを動画bytesと扱うため、local参照のJSONを実動画SHAとして使わない修正が必要 |
| 製造 | 下記「製造入口」 | 通常Clip rendererとDigest共通Coreは別の詳細入力。v003編集JSONだけでは字幕・演出・製造許可が閉じない |

所有者の差は静的照合。`completeAgentRequest`は`request.result.outputId`と同じIDをFileRef.ownerIdへ保存する。v002準備の資格検査は`ownerId === dependency.id`を要求する。前試験の成功依存fixtureもこの後者の形であり、通常completeを通した素材/STT登録との成立を主張していない。次試験は実completeでJSONの素材参照と保存STTを登録し、この差を隠さず解消する必要がある。

## 保存実物の境界実測

[probe](queue-contract-probe.mts)／[保存結果](queue-contract-evidence.json)。保存v003第一計画の3出力と準備binding、JSON4件のみを隔離runtimeへbyte一致copy。実際のexported validatorへ渡した10結果は期待どおり。元state・準備18保存物・消費4保存物・binding・validator bytes不変。動画copy、provider、inspection、render、complete POSTは0。

| 実validator・投入物 | 実測 | 意味 |
|---|---|---|
| backend完了検査：Digest編集JSON→create_edit_plan | 受理 | kind=edit_plan_json、対象draft内URI、存在とJSON/MIME、metadataまで。詳細内容／承認は見ていない |
| 同編集JSON→別draft、および未copy path | 拒否2 | 参照pathの拒否 |
| 準備binding→テーマ工程、機械採否→構成工程 | 拒否2 | kindが一致しない。名前やpathを変えるだけでは通らない |
| runner詳細検査：Digest編集／準備／機械採否 | 拒否3 | 編集は作成方法の不一致、後二つは種類の不一致。Clipはさらに単一selectedThemeId・表示字幕・画面枠等を要求する |
| 保存製造job→build job validator | 受理 | 参照path/SHAの形状だけ。参照先を読まず、素材の存在・承認・製造実行を確認しない |
| 機械採否→assembly decision validator | 拒否 | 専用schema・decisionId・payload・human approvalを欠く。品質pendingの機械採否を人間組立承認へ読み替えない |

拒否を解消するために現行schema・validator・承認値を変更していない。上記以外の製造入口は静的確認であり、実走ではない。

## 追加する最小の依頼識別と工程

提案する新しい必須項目は `productionType: 'clip' | 'digest'`。`RequestDraftInput`、保存下書き、各命令の承認入力snapshotへそのまま写す。欠損・未知値・下書きと命令の不一致は拒否する。purposeの全文は制作意図として保持し、識別や実行許可をpurposeから推測しない。既存Clip画面の送信callerは明示的にclipを送るだけで、画面追加はしない。Digestは既存APIの明示入力で隔離検証する。本番UIからDigest依頼できたとは認定しない。

| Digest工程 | 生産するkind／schema | 次の実consumerと検査 |
|---|---|---|
| prepare_video | source_video（既存JSON参照またはMP4） | run_stt。Digest準備では登録参照と**実動画**のSHAを別々に保持する |
| run_stt | transcript_json（現行TranscriptArtifact） | prepare_digest_plan。共通発話を保存STTの実bytesから既存共通発話builderで生成／検査し、固定素材pathを使わない |
| **prepare_digest_plan** | **digest_plan_json / digest-plan-artifact-v001** | **validate_digest_plan**。通常FileRefとして完了登録し、登録された薄い計画成果物から採否・保持を実再読する |
| **validate_digest_plan** | **digest_execution_input_json / digest-execution-input-artifact-v001** | 将来のrender_digest_video入口。現在は入力構造・素材・保持時計・許可の充足状況を保存する工程。未完成の字幕／演出・実行承認をpassedにしない |
| render_digest_video（後続の別許可差分） | output_video / MP4、既存Digest製造・renderer結果への参照 | 許可済み採否・保持・ZEVO結果・元素材のSHA graphを検査してから既存Core／rendererを呼ぶ。Clip rendererへ渡さない |

この表は一案の全体。次の限定実装では**新規命令作成はvalidate_digest_planまで**、動画命令の型追加・キュー投入・製造caller有効化は行わない。最初の目的は新しい任意依存ではなく、通常indexから選ばれるDigest処理が完了登録した成果物を、次の通常命令が実際に読むこと。

新しい薄い計画成果物の厳密fields：`schemaVersion, kind, requestDraftId, requestId, approvedRequestBinding, sourceVideoBinding, transcriptBinding, utteranceBinding, preparationBinding, consumptionBinding, quality`。qualityは人間品質pendingを明示する。bindingはpath・版・bytes SHA・canonical SHA（JSONのみ）を持ち、bodyの採否や区間をコピーしない。承認依頼bindingはproductionType・purpose全文・素材・条件・policy・承認日時・工程列へ束縛する。登録元命令とresultのoutputId、FileRef、OutputEntityを1対1で確認する。

次の検証成果物の厳密fields：`schemaVersion, kind, requestDraftId, requestId, planFileRefBinding, sourceInspectionBinding, editPlanBinding, manufacturingInputBinding, clockResolutionBinding, admission`。admissionは`planIntegrity, presentation, executionPermission, humanQuality`を別々に保存する。planIntegrityだけpassedでもpresentation未接続／executionPermission未承認なら動画命令はreadyにしない。現存v003出力を参照し、偽の字幕・renderer入力を埋めない。

FileRef登録にschema/version項目が現存しないため、新規kindはbackendでkind **と**対応schemaを検査し、runner側はbinding graphと実値の厳密検査を担う。kindだけの合格を詳細検査に代用しない。JSON参照の転送は、薄い計画と受理済み参照閉包の各実bytesを通常のartifact PUTで保存する。upload失敗・欠損・他draft・別SHAならcompleteへ進まない。公開FileRefを無制限に増やさず、工程結果は一つの薄いFileRefとする。localとuploadの両経路で次processが読めることを試験する。外部推論APIではなく、隔離backendへの通常保存通信だけを用いる。

判断通信のcallerも明示する。通常indexが既存3Skillへ渡す判断関数を作り、既存のrequest SHA付きローカルstdin transport（`judgeThroughStdinV001`）を使用する案とする。新しいprovider/APIやfixed回答の本番既定を足さない。受理方式は現在の要求SHA付きenvelopeのまま。入力作成は通常の承認命令から行い、手書き検証スクリプトを制作依頼の正本にしない。試験はこの外部判断関数だけを固定非通信実装へ置換する。stdinが閉じた／異なる要求SHAの回答／回答欠損は拒否し、自動runnerに無人実推論が備わったとは認定しない。

## 必要な実装修正の具体的な対象

| 対象file | 許可後に変える処理／field | 区分 |
|---|---|---|
| `packages/shared/src/index.ts` | productionType、Digest2工程・2kind・2OutputEntity種別、系統ごとの工程列、依存準備判定。既存Clipの承認条件は維持 | 公開型・工程契約の判断が必要 |
| `client/src/App.vue` | 既存Clip依頼送信に明示clip値を設定するだけ | 必須型変更のcaller追従、新UIなし |
| `backend/src/store/json-store.ts` | 新種別・kindの保存と読取り検査。識別欠損の既存依頼を無言でclipへ補わない | 保存版移行の判断が必要 |
| `backend/src/routes/control.ts` | 新工程完了の出力登録、承認snapshot整合・詳細版検査を既存complete前に適用 | 最小接続修正 |
| `backend/src/artifacts/validation.ts` | 新kind/schemaの拒否検査。既存Clip schemaの免除なし | 最小接続修正 |
| `backend/src/domain/restart.ts`／`state-selectors.ts` | 明示系統・工程列から依存／無効範囲を決める。旧Clipのtheme_reselectをDigestへ適用しない | 変更・再開接続。初回では未対応操作を明示拒否してよい |
| `runner/src/workflow-artifacts.ts`／`workflow-artifact-validation.ts` | 上記の薄い計画・検証成果物の型と厳密binding検査 | 詳細契約の判断後、最小接続修正 |
| `runner/src/workflow-step-builders.ts` | prepare_digest_planとvalidate_digest_planを実dispatch。返却値を正式工程成果物にする。最後の同種成功物でなく対象依存graphの参照を要求 | 最小接続修正 |
| `runner/src/index.ts` | productionTypeから共通factoryを使用、依頼から実素材/STT/common utteranceを解決。参照閉包のupload/download。DigestへClip専用reviewを生成しない | 最小接続修正、既定provider追加なし |
| `runner/src/digest-plan-preparation-v001.ts` | 通常OutputEntity所有者を検証、source参照JSONと実動画を分離、明示系統・新工程の入力束縛。内部bindingは次版へ上げ、旧版を現行実行で受理しない | live-hash影響あり。既存モジュールを進化させ、旧readerコピーを増やさない |
| `runner/src/digest-plan-consumption-v001.ts` | 登録された計画の正規参照を再読し、保存採否・保持を次工程へ渡す。準備の新版と素材inspectionの対応を検査 | live-hash影響あり。時計validatorはそのまま |
| `backend/src/domain/control-review.ts` | 後続でDigest動画許可の対象SHAを既存render_readinessへ束縛する場合のみ変更 | **今回・最初の限定接続実装には含めない**。承認意味の別判断 |

共通FileRef・所有者・claim・単一完了登録・保存ロック／期限回復は再利用する。`client/src/api.ts`とstoreは入力をそのまま渡す現行処理であり、型追従以外の新規変換は不要。既存Core・renderer・native QC・Skillの内容判断validatorは今回の接続のために変更しない。

## 実際の人間確認と提案する帰属

現行runnerは、テーマ工程にtheme_selection、構成工程にmaterial_confirmation、微調整にrender_readinessを常に生成する。backendはこの3工程のcompleteに判断入力を必須とし、`validateAgentDecision`は人間確認trueを要求、`createControlReview`はreview_requiredを保存する。共有の準備判定は、それぞれ後続の構成／演出／renderを最新レビューapprovedまで止める。**humanApprovalRequiredBeforeRender=falseはこれらの条件では参照されておらず、免除も品質承認も表さない。** テーマ承認は単一selectedOptionIdを要求する。Digestの複数候補採否へ転用しない。

上位方針はPlannerの複数採否を要求。architecture §11は品質確認の集約目標を持つが、「この文書だけで現行workflowの人間確認数を削減・移動しない」と明記する。人間確認方針は技術成立と未回答を分け、依存しない技術作業を続ける。したがって新Digest工程にClip専用のテーマ／場面質問を追加せず、通常Clipの既存承認も今回削除しない。

| 判断 | 現在と提案 |
|---|---|
| 依頼実行 | 保存下書きの人間承認。制作系統・目的・条件・利用する能力と許可範囲を固定。自然文は権限でない |
| 内容採否・内部保持 | 許可された範囲でSkill＋決定的受理が機械採否を作る。人間品質pendingを維持。テーマの人間選択を捏造しない |
| 人間品質 | 台帳へ対象版を保存。技術接続のための新視聴・全採点を要求しない。完成動画の品質合格は別の対象SHA付き回答 |
| 特定計画の動画実行 | 既存render_readinessの人間操作を使う案。`ControlReviewItem.targetArtifact`と`HumanReviewAction.targetArtifact`にkind/schema/bytes SHA/canonical SHA、`scope: digest-video-execution`を束縛することを提案。これは機械採否を品質採用したという回答ではない。欠損・変更なら実行しない |
| 公開 | 現在のpublish_readyも実公開と別。新経路から公開処理を呼ばない。動画実行許可や品質合格だけで公開しない |

**別判断が必要な承認意味は一点**：通常Digestの下書き承認で、品質pendingの機械採否・保持まで任せる範囲を明示し、動画は計画SHAへ別に許可する方式にしてよいか。推奨回答は「機械判断の技術準備・計画登録は許可、人間品質pendingは保持、動画製造許可は別対象に束縛して未承認のまま止める」。これは新しい人間視聴を今要求するものではない。この方式の正式な契約化は第1層へ返す。相談役が既承認から判断できる限定技術接続と、本人判断が要る一般委任を分ける。

## 製造入口と未接続を隠さない条件

`executePresentationBaseMediaBuildV001`は専用assembly decisionとhuman approvalを実読してから素材・basis plan・区間・clock graphを検査し製造する。v003 jobの参照先はその専用判断ではないため使えない。

既存Digest経路では、`run_new_material_digest_20260926.mts`が保存制作要求のauthorizationを`received-instruction.json`とplan SHAへ結び、採否・保持を再構築して`buildAdoptedBaseMediaV001`へ渡す。この呼出は機械採否と固定planの事前許可を使い、個別候補の人間目視はnot-performedと保存する。旧候補Digestの`loadDigestContextV001`は特定の受領指示・scopeまで固定し、通常下書きに自動適用できない。v002のbinding-inputも品質／製造許可recordではない。

推奨案はこの**意味判断と共通製造の分離**を維持し、通常依頼へ旧指示の文面・recordIdを付け替えない。prepare_digest_planは構造と保持を確定・保存するだけ。validate_digest_planは受理済みsource inspectionをSHA対応で読める場合に既存時計validatorを使い、未登録inspectionは明示不足として止める。新しい再inspectionを隠して行わない。

後続の実行入力には、既存`buildAdoptedCaptionInputsV001`／`assembleAdoptedCaptionCoreV001`等が要求する字幕判断・timing・意味入力・cue/end投影、採用済みZEVO正本、renderer template/registry・instructionの正式bindingが必要。現在v003の4出力にはない。`runPresentationInstructionRendererJobFileV002`へ渡すにはrenderer jobの実詳細とadmissionも必要。通常Clipの縦型`renderVideoArtifact`にDigest編集JSONを渡す救済はしない。

基礎映像を作らないとZEVO判断を閉じられない現行能力もあるため、将来は「基礎映像準備許可」と「最終renderer実行許可」のscopeを具体的なjobへ束縛する必要がある。最初の限定接続では、その未接続をadmissionへ保存し、動画readyをfalseに保つ。字幕・演出を今回新生成して穴埋めする作業には広げない。

## 変更・再開・旧版保全

| 変更 | 無効になる範囲 |
|---|---|
| 制作系統／目的／条件／素材／承認依頼版 | 計画全体・採否・保持・検証・動画許可。既存下書き／回答を上書きせず新しい明示承認依頼として扱う |
| 採否・保持・断片列／順序／時刻 | 内容正本、時計解決、字幕・ZEVO入力、実行対象SHA。dropをmin/maxで復活させない |
| 字幕・演出・製造能力 | 対応するZEVOと実行封印／実行許可。内容が同じという理由だけで旧動画許可を移さない |
| claim期限・所有者 | 実行資格。期限回復は既存共通処理だけを使い、保存再読のために延長・移譲しない |

既存の再開処理は、成功成果物をcopyして新OutputEntity所有者へ結び直し、Clipの承認をcopyする能力を持つ。ただし本文内部の旧draft/path/SHAまで閉じたDigest binding閉包の移行ではない。通常Digestでそのcopyを無条件に使わない。初回限定接続では旧Clip用変更要求をDigestに明示拒否し、新依頼から再開する。変更機能を一から作るという意味ではなく、参照束縛されたDigestへ既存操作を無断適用しない境界である。

実業務stateに識別項目がない旧依頼を見つけた場合は、read/write filterで削除したりclipを補完したりしない。元stateを保持して読取り専用とし、その状態の更新は拒否する。最初の限定接続は明示系統を持つ新しい隔離stateだけに適用する。既存業務stateの一括移行・本番有効化は別判断である。

旧v002は16実装、旧v003は追加5実装のlive bytesへ束縛される。実際の変更影響は次のとおり。

| 変更file群 | v002準備reader | v003消費reader |
|---|---|---|
| shared index、runner index、workflow-step-builders、準備モジュール | identity実装SHA不一致で拒否 | まず旧準備readerを通すため同じ理由で拒否 |
| 消費モジュール、base build/timeline、caption contract v002/v003 | 直接の16参照にない（base build等はSkillの別参照も確認が必要） | 新5参照または再構築値不一致で拒否 |
| backend完了検査・通常保存、Clip画面、workflow-artifact詳細型 | 16参照に含まれない。ただし新しい依頼snapshot／所有者は旧recordと不一致 | 準備bindingと実値を再構築できなければ拒否 |
| 内容判断Skill・発話builder・採否／保持validator | 16参照に含まれ拒否 | 同上。次の最小接続では変更不要 |

既存provenanceには、入力／要求／回答のSHA、plan snapshot、implementationBindings、失敗原因が限定されたpriorCandidateJudgmentの再利用がある。これは特定の実行配線修正を再検証する仕組みで、通常queue版・承認snapshot・kindの汎用移行ではない。live参照を固定Git版へ自動解決する仕組みも現行runner/storeにはない。

**保全と移行案**：旧計画は現在の固定Git版11809f6f／7b600a64と既存proofへ束縛された履歴として保存する。実装変更前に旧proofが示すbinding・全保存物・実装bytesとGit blobが対応することを保存する。変更後の現行実行readerが旧版を拒否することも想定試験とする。旧records・回答SHA・承認は書き換えない。

新しい通常経路は新しい明示依頼snapshot／内部binding次版だけを受理する。旧v002/v003を新命令へ自動再登録・再採用せず、旧成果の再判断・動画再生成も行わない。履歴のbytes・出所確認は、**明示した旧Git commitのblob SHAと旧保存proofを検査する読取り専用の来歴検査**で行う。live SHA検査の免除ではなく「当時の実装との一致」を検査し、履歴確認結果から現行製造資格を発行しない。旧readerの大量複製や新branch/worktreeは不要。

歴史的な厳密reader自体の再実行が必要な場合は、その固定Git版・node依存・原本path・実素材参照を閉じた実行環境が別途必要であり、現行コードで読めたとは言わない。今回それを新設しない。旧計画の現行再実行・移行は未承認として明示的に残す。通常製品へ古い回答のSHAを付け替える互換経路を入れない。

## 次の限定接続の完了条件と判断依頼

1. APIの明示Digest入力→store→approve→通常命令→next/claim→実index/factory→3判断入力に全文が届く。providerだけ通信しない試験実装へ置換し、伝達・完了登録・消費処理は製品callerをそのまま使う。
2. source_video JSONと保存transcriptを**実complete**で登録し、OutputEntity所有者・各依存・実動画SHAを確認する。動画取得/STT/inspectionを実行せず保存素材を参照する。
3. Digest計画を新kind/schemaで通常complete登録し、次のvalidate_digest_planがFileRefと閉包を読み、非連続keep・断片・順序・clockを保持する。kind合格だけで進めない。
4. 異なる目的2件、local/upload保存、別process再読、未承認・期限切れ・別draft／素材／依頼版・欠損／改変・未知版・未登録closure・出力所有者不一致・Clip/Digest誤消費を検査する。通常Clipの本文・既存承認条件も保つ。
5. 旧binding/回答/proof/素材/業務state不変、live版変更後の旧reader拒否と固定Git出所の確認。人間品質pending、製造・公開0。

相談役への推奨決定は、**この一案の明示識別・固有工程／kind・通常出力登録・次の実消費までを、隔離実装試験の次差分として限定すること**。公開契約の正式改訂／一般の機械採否委任は別判断が必要。動画実行許可の正式方式・本番既定・実素材／費用・公開は次の接続試験へ含めない。正確なfile list、変更可能範囲、旧版履歴の扱いを次指示で固定してから着工する。
