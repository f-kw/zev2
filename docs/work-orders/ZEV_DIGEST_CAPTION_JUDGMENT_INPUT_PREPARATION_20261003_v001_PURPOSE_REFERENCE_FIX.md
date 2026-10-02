# 9の後続 — 承認・目的参照の限定修正と保存先分離

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：decision: continue
承認根拠：kawafmm承認済みの親作業と、AGENTS「相談役による軽微な技術判断の自動承認」に基づく個別承認。本人への再確認・転記は不要。
監査対象：f577bfbaedd1488b0e64c1f702002eb89a0fea68
親正本：[字幕判断入力の準備接続v001](ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md)

## 1. 現物監査と判定

同SHAの新runner、prepare-test.mts、evidence.jsonと親正本を照合した。新runnerのget(plan.approvedRequestBinding)はbinding-input.json（normal-request-digest-preparation-binding-v002）を取得する。現コードはその直下にproductionIntentがあると扱い、draft.purposeと比較している。保存されたCAPTION_PREPARATION_PURPOSE_CHANGED、本文位置identity.approvedDraft.purpose、別のproduction-intent.jsonという失敗記録と整合する。

新runnerは既にprepared identityのapprovedDraftと通常draftの全snapshot、canonical SHA、command、正規owner/依存/registry/各保存SHAを検査している。したがって承認保存物はその全snapshotへ照合し、制作目的本文はstage('production-intent.json')から照合する二行が適切である。目的検査を削除せず、承認記録と目的保存物の役割を分ける修正である。

今回の判定はGitHub上のコード・失敗記録に基づく。相談役がMac上のruntimeを直接再実行・再hashしたものではない。意味入力・9要求・manifest保存と別process再構築は未成立のまま。

## 2. 個別承認A：製品修正累積6

対象はrunner/src/digest-caption-input-preparation-v001.tsの一箇所だけ。

```diff
 const intent = get(plan.approvedRequestBinding);
-assert.equal(intent.productionIntent, draft.purpose, 'CAPTION_PREPARATION_PURPOSE_CHANGED');
+assert.deepEqual(record(intent.identity).approvedDraft, approved, 'CAPTION_PREPARATION_APPROVAL_CHANGED');
+assert.equal(stage('production-intent.json').productionIntent, draft.purpose, 'CAPTION_PREPARATION_PURPOSE_CHANGED');
```

適用時に製品修正累積5→6として記録する。新二pathの初回実装とは区別し、製品変更0とはしない。新純粋builder、既存builder/validator/resolver、owner、要求SHA、承認snapshot、原文、style、保持、時計は変更しない。3判断要求への目的全文照合も維持する。

binding-inputのidentity.approvedDraft.purposeをfallbackとして拾う分岐、alias、旧保存物の書換えやSHA付替えは追加しない。stageは既存の正規registryと版付きbinding検査を通すまま使用する。今回の目的は新要求の準備であり、元purposeの「今回は字幕・演出・動画を作らず」を変更しない。

## 3. 個別承認B：設営累積20

対象はdocs/reports/digest-caption-input-preparation-20261003/prepare-test.mtsの保存先追従一件だけ。現設営19から、適用時に20へ計上する。AとBは別々の承認・履歴として記録し、どちらかにまとめて隠さない。

旧runtime直下のparameters.json、old-inputs-before.json、failure.json、attempt-001-failure.logと旧attempt-001の関連証拠は不変保持する。新しい試験保存先を次に固定する。

- NEW：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002
- 準備bundle：同attempt-002/bundle/

NEW定数と次の四箇所を、同じbundleへ揃える。
1. PARAMS.outputRoot：path.join(ROOT, NEW, 'bundle')
2. currentPureParametersのmeaningPath：`${NEW}/bundle/meaning-input.json`
3. countが列挙する出力領域：`${NEW}/bundle`
4. 出力改変否定fixtureのoldPrefix：`${NEW}/bundle`

新parameters/保全一覧/否定fixture/manifest-binding/checkpoint/readbackはNEW配下へ保存する。元入力を指すOLD、state/style/plan/executionの期待SHA、preparationId、検査対象・期待値は変更しない。新attemptとbundleの不存在を確認し、EEXISTを握りつぶした再利用・削除・上書きはしない。

製品修正6、設営20、受領した本追補のpath/commit SHA、新attemptの実行metadata、失敗履歴への参照は、コード内集計とevidenceの記録追従として更新してよい。処理変更はAの二行とBの保存先対応だけ。別の不具合を今回の二件へ混ぜない。

## 4. SHAと失敗履歴の保持

親正本は編集しない。scopeBindingが束縛する親正本の実SHA c56aa5710696686778ac9cc5ab26787d35395b7c9d9b672db956f22ea09db209 は維持する。本追補は修正と再開の承認証拠として別に実path/SHAを記録し、親や旧入力のSHAを付け替えない。新準備manifestには修正後の新runner実装SHAを正しく束縛する。

初回コード・evidenceは固定Git版f577bfbaに保持される。現在のreport/evidenceを実質checkpointで更新する際も、初回exit1・到達範囲・未保存・旧正常比較の通過観測を区別した失敗履歴へ残し、新成功値で置換しない。既存runtime証拠は変更しない。

旧正常一区間658断片の純粋比較は、初回準備停止より前にassertionを通過した部分成立として保持する。これを今回未実行の準備・拒否・再構築の合格へ合算しない。旧正常比較だけを別ジョブでやり直す指示ではない。既存の小test一系列に含まれる比較が再評価された場合は新attemptの観測として区別する。既存全suiteや媒体を再実行せず、比較省略のための追加modeや仕組みも作らない。

## 5. 修正後に進める範囲

対象二pathと補助の必要な厳密型検査、export・入力SHA・親directory・新bundle不存在のpreflightを確認後、新attempt-002の準備へ進む。

- 正規保存入力→新runner→新純粋builder→既存assertCaptionDisplayInputV001→意味入力/9要求/manifest保存。
- 今回の3,613保持atom・9group・candidate-0006の非連続3group、本文/元ms/順序/styleを確認。drop3,460と区間間の空白は戻さない。
- 親§6で既に指定した最小拒否を実施。任意の例外で合格にせず、対象条件の拒否・保存物不増加を確認する。
- 別processの新readerで保存束縛から意味入力/9要求を再構築し、bytes/SHA一致、元state・旧小JSON・既存実装の不変、判断/登録/媒体作用0を確認する。

終点は親正本どおり判断入力の準備・保存・再構築のみ。今回は不具合修正と再走の個別承認であり、準備完了のacceptではない。失敗再現・追加の全否定suite・v005・通常4工程・旧動画QC・人間レビューを増やさない。

## 6. 境界と受渡し

一般上限・強制停止・過去累積・承認意味を変更しない。既存製造、v005準備/消費、Skill/validator、通常factory/index/backend/sharedは変更しない。媒体read/hash/copy/PUT、通常HTTP、外部推論/API費用、素材取得、STT/inspection/ffprobe、字幕回答・演出選択、画像/背景/音声/動画製造、SSD、削除、本番・公開は禁止のまま。

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持。v005・7bb5de02・4556e389のacceptは不変。

同じCodex2が専用Edgeでこの返信を全文受領して続行する。新しい実質問題がなければ、修正→限定実行→保存再構築→担当のみ通常commit/push→Git状態・対象process終了確認→直接報告まで進む。本人への再確認・転記、Codex1起動、受領だけの独立commitは不要。

報告名：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・字幕判断入力の準備接続

発行時点：初回実装・設営19適用・局所exit1は保存記録で確認。製品6/設営20の受領・適用、新attemptの実行・完成は未確認。相談役がMacの稼働を直接観測したとはしない。
