# Codex-UI｜No.68 共通検査・登録情報表示の限定接続

採用済みBの案内画面で、保存資料をrunnerと同じJSON検査へ通し、素材・発話・候補・長さの一致を確認するようにした。推薦IDと理由は登録資料に存在する場合だけ表示する。候補previewは明示的に結び付いた登録作業を読み、不明、未作成、実際の準備中、生成済み、失敗、中止を区別する。候補を見る操作から作業は作らない。

作成前には、入力の整合、音声保持の指定と元音声参照、実行条件を確認する。完成動画そのもののQCと人間の採用は、動画作成後の確認として分けた。現在のproducerは作成前の音声指定・参照を提供していないため、UIの動画作成は引き続き拒否する。完成動画のQC未実施を作成前の必要条件にしているわけではない。

**この限定接続の実装と隔離検査は済んだ。No.68全体は未完成・Doing rev3を維持する。** PDFやLibraryの再取得、本人へのレイアウト再承認、実素材処理、有料API送信、外部公開は行っていない。

## 指示と差分

親から、共通pure validatorの最小移設、登録データの資格照合、実在する推薦・preview metadataの表示、作成前と完成後の確認の分離、制作担当へ渡す不足入力の具体化を指示された。前工程と新素材境界は[接続報告](server-connections.md)にある。本報告はその後の差分であり、過去の検査18件や「validator未共有」の記録を当時の結果として残す。

source対象13path: backendのreaderと専用test各1、clientのApp/guideと専用test/mock計4、sharedのindex/UI型と新規artifact型/validator計4、runnerのartifact型/validator再exportとscreen-layout型参照計3。

- `packages/shared/src/workflow-artifact-validation.ts`へ既存pure JSON validatorを移した。`type JsonRecord`以降の全本文は前HEAD `fbb74599` とbyte一致し、body SHA256は `97ce57104cfdfca753812478465764ad2fdf6d67bbe417d226dcd86c1499ada4`。既存JSON型とそのlayout型だけをsharedへ移した。runnerは同じ関数・型を再exportする。計算処理、producer、正式製造契約、Digest gateは変更していない。
- backend readerはresult→Output→FileRef、通常ファイル、kind/MIME/path、実size/hashに続き、その同じvalidatorを実行する。sourceURI、STT ID/本文/clock/長さ、候補数とreview producer、構成/編集案の採用ID、patchの編集案参照を照合する。未知IDや古い確認、同IDの新hashは承認時に拒否する。
- 任意の推薦情報 `recommendation: {candidateId, reason}` が登録theme JSONにある場合だけ、実在候補と非空理由を照合して読む。これは消費側の任意読取形を隔離fixtureで検査したものであり、現producerが正式に出力しているという報告ではない。producerへの新しい生成指示や型の必須field追加はしていない。ない場合は推薦不明と表示する。
- previewは候補の既存evidenceが示す同依頼の `agent_request` または `file_ref` だけを読む。queued/waitingは未作成、実owner・取得時刻・有効期限を持つrunningだけを準備中とする。succeededは登録媒体の実hash確認後に生成済み、failed/cancelled等はその状態を表示する。後の失敗を古い成功previewへ差し替えない。全体完成動画を推測で候補へ割り当てない。
- UIは登録推薦を初期表示へ使い、本人が反映した採用案を再読込で置き換えない。review内容が変わると閲覧dialogを閉じ、古い確認を保持しない。選択の閲覧と採用保存は前工程の分離を維持する。

## 制作担当へ渡す入力境界

以下は**既存資料から必要な値を返してもらうための読取要求案**であり、新しい承認契約・成果物kind・permitの設置ではない。どの既存producer/artifact/review evidenceへ載せるかは親と制作担当が決める。値が未提供ならUIはunknown/提供待ちを維持する。

| 作成前に必要なもの | 具体的な値と照合先 | 現在地 |
| --- | --- | --- |
| 表示した依頼・資料の版 | requestDraftIdと全draftIdentity、review ID、source/transcript/themes/composition/edit/patchのproducer/output/FileRef ID・sha256。表示fingerprintを既存state排他内で再検査 | clip readerと承認境界は接続済み。Digest adapterは親/制作所有 |
| 実際の元動画参照 | 宣言sourceURIに加え、実動画の論理path・fileSha256・正のbyteSize、登録source producer/output/FileRefとの対応。JSON参照のhashを動画bytesのhashに代用しない | clipの登録readは済み。JSON参照先の正式媒体資格は未接続 |
| 音声保持の指定 | 承認済みstyle/編集入力のbyte bindingと既存指定値。Digestには `resolvedStyle.audioMode = preserve-source-only` の既存確認がある。同じ今回入力に属する指定を返す | clip PatchArtifactはrenderReadyのみ。今回の指定を推測で補わない |
| 元音声の参照・時計 | 同じ実動画hashを指すsourceInspectionBindingのpath/fileSha256、その既存inspectionの音声present・sampleRate・channels・channelLayout・presentationClockとaudioClock。構成の元区間/時計対応への既存clockResolutionBindingも必要。音声なしと未検査を分ける | 新素材の正式inspection未受領。sample rate・stream・末尾をUIが仮置きしない |
| 実行条件 | 確認した全runtimeIdentity、指定依頼のexecution scope、既存encoder/引数、provider/modelと適用する承認。実行直前・next/claim/loopで同じ値を再照合 | 前工程でscope照合済み。外部送信/料金承認資料不足は拒否を維持 |
| 入力検査 | 共通JSON validatorと登録bytes照合の結果に加え、上のsource/音声/時計に対する既存producer検査の結果と参照hash。未検査や失敗の理由を返す | 表示用JSONと相互関係のみverified。音声・媒体の正式資格までverifiedとはしない |

既存 `SourceVideoArtifact.sourceInspectionBinding` は任意byte binding、`DigestExecutionInputArtifactV001` はsourceInspection/clock/manufacturing等の参照を持つ。`runner/src/digest-approved-inputs-v001.ts` は原本宣言・実媒体hash・inspection hash・元URIの対応を検査し、別箇所で既存の音声指定を確認している。これらを利用する接続先を制作担当へ返し、今回その契約を改訂しない。現物の旧素材inspectionや品質結果を新素材へ転用しない。

完成後は、実際の最終render producer/output/FileRef ID・動画bytes hashに束縛したQC/元音声保持結果と、その動画に対する人間の採用を扱う。作成前入力のverifiedだけで完成品質を合格にせず、完成後のQC結果を先に要求して作成を循環的に止めることもしない。

料金接続では実送信payload、provider/model、見積basis、本人が承認した上限・対象を必要とする。今のRuntimeConfigには正式資格がなく、Gemini API拒否を維持した。金額・価格・上限・承認tokenを新設していない。

## 検証

- [backend unit](validator-evidence/backend-unit.txt): **28/28 pass**。実routerとstate排他、隔離runtime、auto-runner無効。異なるsourceURI、発話ID、2/4候補、24.2/620.75秒、後半600秒台のclockを保存値で表示。不一致、件数/時計/本文差替、同ID新hash、旧review版、他依頼/未登録preview、期限切れclaimを拒否。preview読取はstateを書き換えない。
- [client unit](validator-evidence/client-unit.txt): **19/19 pass**。前工程の保存/承認/重複/古い結果の検査に、登録推薦の限定選択とpreview状態を追加。
- [validator移設・compile記録](validator-evidence/validator-relocation.json)、[shared build](validator-evidence/shared-build.txt)、[client build](validator-evidence/client-build.txt): shared/backend/runner/Remotion/client型検査・build成功。clientの既存500kB超chunk警告は残る。[UI契約](validator-evidence/ui-contract.txt)成功。
- 専用Edge＋全API隔離mock: 登録推薦と理由、候補の不明/未作成/準備中、候補の開閉と再表示、作成前資料の再読み込みを確認。今回の閲覧操作POST0。mock表示は正式producer接続や媒体品質の証明ではない。[観測記録](validator-evidence/browser-observations.json)、[推薦](validator-evidence/recommendation.jpg)、[preview状態](validator-evidence/preview-status.jpg)、[作成前/完成後の区別](validator-evidence/precreation-vs-postcreation.jpg)。

初回sandbox検査はtsx IPCのlisten制限で開始前に失敗し、許可された隔離localhost環境で実行した。[開始失敗](validator-evidence/backend-sandbox.txt)を保持する。28件への追加時にはfixtureのevidenceRefs配列共有が1件の誤判定を生み、[27pass/1fail](validator-evidence/backend-unit-before-fixture-isolation.txt)を保存後、fixtureだけstructuredCloneして再検査した。共通validator接続に合わせたfixtureの無効なevidence種別修正も含め、今回の設営修正2件。前接続工程の採用review不足修正1件と合わせ、保存記録上の設営修正累計3件。一般上限は変更・リセットしていない。型移設のcompileで不足したprivate型参照は同じshared型のaliasへ修正した。

未確認: 実新素材の登録値/原本・音声資格、通常速動画再生、音声聴取、人間品質採用、正式推薦producer、preview生成producer、通常UIからのDigest製造、正式な外部送信/料金資格。有料API・実素材動画製造・外部公開は0。

## 保存と残状態

検証証拠を専用directoryへ固定し、mockサーバー2起動を終了、専用Edgeタブを閉じた。今回scratch画像3件217824bytesは証拠copyのhash一致を確認後に削除した。unitの隔離runtimeはafterで削除済み。空き容量は17452122112→17452326912bytes（共有disk観測値）。port5179のlistenerは0。[cleanup記録](validator-evidence/cleanup.json)。共有dist/node_modules、元PDF、素材、正式/旧成果、SSD担当物を削除しない。

制作担当の保存完了を親から受領し、main/remote `950cc642dad2146bec403ab78895dc156805f8cd` でGit枠を引き継いだ。自分のsource13pathと専用記録・証拠、前回の新素材境界補足だけを保存対象にした。CURRENT_GOAL/HANDOVER/統合scopeとSSD logの保存差分を取り込んだ実HEADを確認し、その内容には干渉していない。

実装・検査証拠26pathは `69ca1b4af49e69bc47a0eafe63899e0884af62db` へ保存済み。報告・補足・専用log4pathを記録commitへ保存し、同じmainへまとめてpushする。[session log](../../work-logs/2026-10/2026-10-11T0302_Codex-UI_No68-validator-precreation_69ca1b4a.md)。最終HEADとpush/clean/untrackedの実観測は親への完了報告に示す。
