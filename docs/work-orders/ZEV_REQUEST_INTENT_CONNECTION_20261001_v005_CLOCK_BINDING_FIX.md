# ID9 v005限定追補 — 時計結果のbyte参照修正と検証続行

発行日：2026-10-01（JST） / 発行者：ZEV Build Loop相談役
`decision: continue`

**kawafmm承認済みID9と、本人の「独断で決めれる程度なら自動で承認して」に基づく相談役の個別承認。** [AGENTS](../../AGENTS.md)の軽微な技術判断の自動承認を適用する。今回について追加の本人確認・転記は要求しない。

基準main／中断checkpoint：`b9bb6b40b26a454bb850b0967b457b7fedbfff4a`。
親指示：[v005](ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)、特に§8・§11・§12。
本書は同じv005内の一件の限定修正指示であり、新エピック・新しい試行錯誤枠の開始ではない。Codex2単独、同じセッションで続行。Codex1再起動は不要。

## 1. 判断と確認範囲

相談役は同SHAの[二path案](../reports/request-intent-connection-20261001/queue-clock-binding-followup-request.md)、[失敗証拠](../reports/request-intent-connection-20261001/queue-clock-binding-failure-attempt-004.json)、[停止後再読](../reports/request-intent-connection-20261001/queue-clock-stop-readback-attempt-004.json)、consumerと共有型／参照検査の現物を照合した。

時計結果の本文はstatus／violations／mappingsで、schemaVersionを持たない。consumerが全4出力に一律bindを使うため、時計の参照にundefinedの版情報が入り、formal(expected)で拒否される。提案の原因説明と実装は整合する。時計の計算式・結果本文や製品serializerの変更ではなく、生成済みの結果に適切な参照型を使うための限定実装欠陥修正と判定する。

局所attempt-004の内部5参照・拒否9件、通常source/STT・計画complete、登録計画24データの再構築は保存証拠として確認した。前の参照対応不整合を未修正へ戻さない。ただしvalidate complete、転送先からの消費、v005全体は未完了。Mac上の試験・動画・実bytesを相談役が直接再実行／再hashした監査ではない。

## 2. 許可する製品差分は二pathだけ

1. `runner/src/digest-plan-consumption-v001.ts`
   - expected.outputsのうち`clock-resolution.json`だけを、`{path, fileSha256}`のbyte参照で作る。
   - fileSha256は実際に保存する`formal(outputs[name])`と同一bytesから算出し、保存後・再読時の実SHA照合を維持する。
   - `machine-adoption.json`、`edit-plan.json`、`manufacturing-values.json`の版付きJSON参照は維持する。消費記録自体の版も維持する。
   - 時計結果本文、区間・断片・順序・frame/sample、既存job／時計validatorの呼出しとpassed条件、保存結果を再構築して比較する処理は変えない。
2. `packages/shared/src/digest-plan-artifacts-v001.ts`
   - `clockResolutionBinding`だけを`DigestByteBindingV001 | null`にする。
   - inspection提供時はconsumptionBinding／editPlanBinding／manufacturingInputBindingの3参照を従来どおり版付きJSONとして検査し、時計参照だけを既存byte参照検査で確認する。
   - 全必須field、path／SHA／参照先一式の検査、明示null、inspection未提供理由、admissionは維持する。inspection未提供なら時計を含む未生成参照はnullのまま。

[提案の分岐](../reports/request-intent-connection-20261001/queue-clock-binding-followup-request.md)を採用してよい。JSONかbyteかを広く自動推測するfallback、版番号の捏造、union／any／型assertionでの検査回避は追加しない。時計以外のJSON参照を一律byteへ落とさない。

この開発候補の時計参照型の訂正だけを許可する。一般利用の公開契約・本番適用を承認したものではない。旧の失敗記録・JSON・回答SHA・登録済みstateを修復上書きせず、移行／旧版救済分岐は作らない。

## 3. 修正枠と実施順

- 現在の実施履歴は製品4／設営6。今回の二pathに閉じる同一欠陥の修正を**製品限定修正の累積5回目**として相談役が例外承認する。一般の3回・5回枠、過去履歴、別の強制停止条件を変更／リセットしない。設営6回目の許可や前回の製品4回目を再承認待ちに戻さない。
- 他者変更を保持して最新main・本追補・AGENTSの自動承認節を確認し、同じCodex2で再開する。
- 二pathの出力参照について、4出力の実際のschemaVersion有無と保存byte列を実行前に照合する。対象を広げた全repo棚卸しや汎用参照システムの新設は不要。
- まず今回の境界の小さい試験を行う。時計byte参照が保存／再読できること、架空の版情報付き時計参照・欠損／改変／別参照を拒否すること、他の3JSON参照の版必須検査とinspection未提供のnull条件が維持されることを確認する。型検査だけで動作確認に代用しない。
- その後、新しい隔離attemptでv005の未完了検証へ続行する。旧attempt-004の4出力・失敗state・証拠は保持する。新しい依頼は実入力から要求SHAを作り、通信しないproviderの対応回答を使う。旧回答の要求SHAだけを付け替えない。
- 新attemptの製造入力・時計結果は、そのattemptの保存素材／採否・保持から既存validatorで再構築する。依頼IDやpathが違う旧attemptとの全ファイルbyte一致を一律に要求しない。同一入力・同一条件での時計結果不変と、保存・再読の一致を分けて検証する。

## 4. 続行する既承認の検証と終点

通常API・実claim/PUT/complete・実index/factoryを使い、source/STT登録→計画complete→validate_digest_planの実消費／complete→薄い検証成果物登録まで進む。source/STTは旧保存物の登録だけで、取得やSTT処理自体は行わない。

local/upload、worker/backend分離root、転送先だけを使う別process再読、MP4直接登録、inspection未提供、通常キューの否定試験とClip対象回帰をv005の完了条件に従って確認する。製品側の入力・登録・検査・消費を試験callbackへ差し替えず、固定回答を実AI品質とは扱わない。

修正した共有型に影響するshared build・backend・runner・client・Remotionの型検査を必要範囲で行う。今回無変更の旧111試験・全動画QC・人間レビューはやり直さない。今回の局所参照5件／拒否9件の成立を取り消さず、修正影響がない範囲の再実行を目的化しない。

完了時は、時計結果のbyte参照、他3JSON参照、正式JSON保存、実validate complete、転送先再読、inspection提供／未提供の分岐、拒否とClip回帰、旧証拠保全の実施／未実施を分けて報告する。通常complete成功だけを全体合格にはしない。

## 5. 維持する境界と記録

内容builder／内容validator、時計計算・serializer、認証／agent権限、PUT/GET endpoint・path安全条件、renderer/native QC、実業務state／稼働サービスは変更しない。外部推論・費用・新素材・STT／inspection実行・映像音声製造・新UI・本番切替・正式採用・公開は対象外。ID9-PD-01/02、字幕演出未接続、動画許可未承認、人間品質pendingは維持する。

新たな別不具合・対象外差分は証拠を保存してGPT_DECISIONへ返す。軽微な技術問題なら相談役がAGENTSの委任に従って個別判断し、回数超過だけを理由に本人確認へ戻さない。Codex自身による例外の自己承認・無制限再試行はしない。

結果は既存主report `docs/reports/request-intent-connection-20261001/README.md` と必要な限定試験・軽量証拠へ保存し、CURRENT_GOAL／HANDOVERの自分の現在地へ同期する。担当fileのみ明示stage、通常mainへcommit/push、同じZEV Build LoopへCodex2専用Edgeタブから直接報告する。受領記録だけの再commit・終了連絡・再起動・Codex1起動・人間転記は不要。

報告名：`Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 時計結果参照修正・通常キュー接続の再検証`。
指示発行時点では、今回修正の受領・適用・再稼働は未確認。今回の個別承認はv005全体の完成受理ではない。
