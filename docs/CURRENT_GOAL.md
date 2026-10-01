# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-01（JST）

## 1. 最初に読む

プロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADを取得し、同一SHAの [HANDOVER_INDEX.md](HANDOVER_INDEX.md) と指定資料から復元する。旧添付・Drive snapshot・会話要約・メモリだけで現在地を認定しない。

## 2. 現在の主作業・次の指示

**9. 明示Digestの通常キュー接続（v005）：相談役承認の設営11一行を適用し、attempt-006保存物だけの別process readerがexit0。5禁止pathの拒否、実通常store保存state・検証命令成功・receiver成果物SHA、実consumer再構築と保存artifact deepEqual、再構築中禁止read0がすべて成立。upload-json転送＋保存後receiver-only再構築は限定検証完了。製品5／設営11、一般上限・履歴不変。旧90runtime・旧669小証拠・旧転送／失敗3証拠・製品8path不変、新小proof1,162 bytesだけ。通常runnerや大容量転送の再実走なし。v005全体・実AI品質・人間採用は未完了／未承認。**

今回受領・適用した正本は [guard-probe追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_UPLOAD_READBACK_GUARD_FIX.md)、保存 `2530d96685b33d1317dd5b6750cf5939155e85ae`。許可差分は `assert.rejects` に渡すreadをasync callbackで包む一行だけ。attempt-006の既存保存物のみを別processで再読し、backend・通常runner・factory・upload・download・大容量copyは起動しない。

5cb6c94cの再開指示を受領・適用して媒体なしattempt-002を実行した。適用済みの履歴は製品5／設営8、追加修正0。一般上限・強制停止条件・履歴を変更しない。b47999f7の旧停止と失敗証拠を保持し、今回の実結果は別証拠へ保存した。Codex1再起動、本人の視聴・採点・転記、受領記録だけの再commit・終了連絡は不要。

## 3. 容量整理の受理と保留

削除前一覧・script保存は`04c21bfdeccde7210193d731bcf205f4ea19a03e`、実績は`78805d86`。相談役は主report、明示8pathの一回script、一覧／削除／別process確認記録、5file差分を照合した。Macでの直接削除・再hash・process観測ではない。

- 検証用コピー8本、論理削除38,427,302,616 bytes（35.79GiB）。削除時の同volume空き2,145,939,456→40,604,250,112 bytes（2.00→37.82GiB）、観測増加38,458,310,656 bytes。論理量と実空き差を区別し、現在の空き量を保証しない。
- 元素材・元STT／inspectionの保持、旧記録69件SHA不変、その他634file metadata不変、全8path不存在を保存結果として確認。partial指定先は元から不存在で削除件数に含めない。完成／確認用媒体・他領域・他担当・業務stateは削除対象外。
- 削除分はretired-by-user-approved-cleanup。33保存参照は元動画から再作成するまで旧runtimeの即時再読不可。過去の技術受理は維持するが、現在の再実行資格へ読み替えない。今回のために即時再コピーしない。
- SSDは本人の準備意向のみ受領。接続・保存先・利用開始・移行は未確認。空きが増えただけで大容量試験を再開しない。削除scriptの再実行・追加削除もしない。

根拠：[主report](reports/request-intent-connection-20261001/README.md)、[削除前一覧と実績](reports/request-intent-connection-20261001/queue-storage-cleanup-20261001-v001.json)、[本人の削除指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md)。

## 4. 媒体なし回帰の具体的範囲

既存control router／通常storeを新しい隔離runtimeで使用し、自動runnerを既存設定で無効にする。製品の入力・保存・検査を試験用実装へ置き換えない。

通常APIから、制作系統欠損／未知値・空目的の拒否、未承認で命令0／nextなし、正常承認のClip7工程／Digest4工程と依存順、目的全文・条件の全命令への対応、重複承認・未完了依存へのclaim拒否、別processの保存再読を確認する。source/STT completeや実runnerの起動はしない。

実shared関数で承認入力の不一致拒否とClipのテーマ／場面／生成前確認の回帰を確認する。ゲート単体の比較に必要な小さいメモリfixtureは単体試験として区別し、通常storeに成功工程・架空成果物・人間承認を注入してE2E成立にしない。依存不成立だけで人間確認ゲートを検証済みとしない。policy=falseで確認不要に変える修正は行わない。

媒体なし専用test一経路の分離は設営7として適用済み。今回修正するのは既存 `queue-no-media-regression-test.mts` の3fixtureの対象選択と、新attempt／証拠名・実行metadataだけ。対象命令のrequestDraftIdで一意の下書きを選び、未承認・重複・工程列変更をその下書きへ作用させる。配列順が変わっても選ぶIDが同じことを小さく確認する。製品関数・通常caller・認証・期待値は変更しない。今回不要な汎用preflight・storage基盤・監視装置・数値上限は作らない。

書込みは隔離state・小JSON・ログ・結果だけ。素材のread／hash／copy／PUT、削除33参照の復元、link／sparseによる代用、旧readerの欠損無視はしない。旧local成功を今回の試験結果に合算しない。

attempt-001の停止履歴：通常API／store28検査、入口拒否1、承認入力不一致の局所9検査は部分成立。未承認fixtureが配列先頭を変更し、検査対象Clipの承認元は変わらなかったため期待例外が出なかった。別processの原因照合ではstate26,434 bytes不変、対象IDでClipを変更すれば現行関数が拒否。相談役は試験コード・診断・最小案を照合し、この原因説明を妥当と判断した。Mac上の直接再実行・媒体なし全体の完成受理ではない。

[旧実結果・失敗と最小案](reports/request-intent-connection-20261001/queue-no-media-regression-evidence-v001.json)と旧attempt-001、失敗時code SHAは不変に保持する。新runtimeは `runtime/artifacts/request-intent-no-media-regression-20261001-v001-attempt-002`、新結果は同report directoryの `queue-no-media-regression-evidence-attempt-002.json`。親・backend・readerの参照先を同じ新runtimeへ合わせて明示no-media入口を実行する。

§6の再開指示は残る5承認入力否定、確認生成元3件、依存成立時の独立確認ゲート3件、完成時API応答と小stateの別process完全対照、旧証拠保全までを対象とした。今回この全項目は下記の新一系列で成立。旧38件・停止後診断の流用0、SSDは今回の開始条件ではない。

今回の実結果：[attempt-002証拠](reports/request-intent-connection-20261001/queue-no-media-regression-evidence-attempt-002.json)。52結果は新一系列（入口1・API28・対象選択1・制御関数20・保存2）。旧38件との合算0。完成時API応答と実通常storeの全stateが新processで一致、state26,434 bytes不変・新領域53,218 bytesの4小file。旧失敗state／証拠と旧report6件SHA不変、失敗時testは固定Git版に保持。製品変更0・媒体作用0・人間Pending追加0。前節の未実施履歴は今回の完了へ逆流させない。

次に相談役へ依頼する一件は、保留中の転送検証の実確認済み保存先・必要容量・再開条件の具体化。SSDや保存先を自己推測して操作・大容量再開しない。


## 4.1 媒体なし回帰の受理とupload-json単独再開

相談役は `f54cd09a` の52結果、新attemptのstate／reader proof、旧証拠保全と製品実装SHA不変を照合し、媒体なし回帰を限定技術受理する。製品5／設営8、追加修正0。人間品質・本適用・動画許可とは別。

次は既存upload-json scenarioだけ。試験側に明示scenario選択と作用なし容量preflightを最小追加し、設営9として適用する。local-jsonを再製造せず、local-mp4も今回は走らせない。preflight不通過なら大容量作用を起こさず停止する。

preflight通過後は新attemptで、通常source/STT登録、実index/factory、計画complete、worker→backendの実upload、別root receiverの転送先のみ再読、validate_digest_plan実消費／completeまで確認する。receiverではworker・元素材・保存STT・inspectionへの直接readを既存guardで禁止する。成功時もMP4／inspection未提供・目的2件の全3判断は残件。

## 5. 未完了・承認境界

時計二path修正・15局所検査・関連型検査、attempt-005のlocal計画→検証complete・別process再読は`60b959d91d0885ac2bf9cf4aaae66eff93454bab`で限定受理済み。容量整理を理由に未修正へ戻さない。元source/STTは旧保存物の登録、判断は固定応答であり実AI品質とは別。

upload転送／worker-backend分離root／転送先のみの消費再読、MP4直接登録／inspection未提供の通常complete、目的2件の全3判断は未完了／未確認。通常否定・Clip回帰と新しい小state再読は今回の限定範囲で検証完了、相談役の技術監査は別。v005全体を完成にしない。

[v005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)の開発候補はproductionType、共通queueのprepare_digest_plan／validate_digest_planと専用2kind。Clipは既存7工程・確認条件を維持、Digestの動画工程は追加しない。FileRef.ownerId＝OutputEntity ID、素材JSONと実動画SHA、要求／回答SHA・全断片被覆・参照検査は維持する。

ID9-PD-01（一般機械採否／保持委任・公開型の本適用）、ID9-PD-02（動画許可SHA／scope）、旧業務state移行・本番有効化は未承認。字幕演出未接続、動画許可未承認、人間品質pendingを維持する。

製品code・外部推論／費用・新素材／STT／inspection・動画・新UI・本番・正式採用・公開・追加削除・SSD探索／移行は今回の対象外。別の不具合は相談役へGPT_DECISION、軽微なら本人へ聞き直さず根拠に基づき判断する。一般上限・強制停止条件を無効化しない。

## 6. 完了済みを巻き戻さない

15分31.633秒初稿と9/28人間レビュー、9/29の144pxと条件付き分割肯定は保持。旧9:47案の1080p・低メモリ製造は`d7e46592`で受理。ID9の15:23.033案・9保持・局所5本・147字幕・111試験は`b69e168c`で受理、送信`68a32038`と終了受領済み。

Codex1の`bd0113c8`対象点検`9b72bc0f`、送信`b93870fc`は終了。心霊回帰会話の不採用理由補足は相談役受理、補足版・局所媒体をCodex1点検済みへ広げず再起動不要。

v002準備`11809f6f`、v003後段入力`7b600a64`、v004設計`d77f2a5d`は限定受理済み。一件変更・保存・Reset・内容修正は既存能力。済んだレビュー・媒体・全試験・削除を再実施しない。

## 7. 記録と継続

人間回答は[台帳](HUMAN_REVIEW_PENDING.md)、全体の残件・根拠は[インデックス](HANDOVER_INDEX.md)。縁A/B未選択・B領域不合格、字幕条件、色・強調、HUD、旧修正版未回答、通常適用・品質等を保持する。

旧結果queue-no-media-regression-evidence-v001.jsonは不変、新結果はqueue-no-media-regression-evidence-attempt-002.jsonと主reportへ保存する。API実測・制御関数単体・保存再読・未実施を分け、媒体作用0と小さい試験領域の増加量を記録。実質checkpointで現在地を同期し、通常main・担当fileのみ明示stage・直列commit/push・専用Edgeから直接報告する。

方針・指示・受理・中断は同じターンに正本へ反映し、会話上限を待たない。b47999f7の試験はexit1、自分の試験／backend残存なしという報告を受領。今回の設営8を適用・実行し、新attempt-002はexit0／52結果成立。自分の試験・backend残存0、次の大容量再開は未実施。受理記録だけの再commit・終了連絡・再起動を増やさない。上位はAGENTS・監査プロトコル・人間確認方針。更新前全文は[b47999f7固定版](https://github.com/f-kw/zev2/blob/b47999f7398118b1ef53b68b5b95a7ea922e7779/docs/CURRENT_GOAL.md)、削除時の詳細は[78805d86固定版](https://github.com/f-kw/zev2/blob/78805d861a41955ccf3f3914d5946f0446e4178d/docs/CURRENT_GOAL.md)に保持する。

## 8. upload単独attempt-006の実測checkpoint／停止

[転送証拠](reports/request-intent-connection-20261001/queue-upload-transfer-evidence-attempt-006.json)、[失敗と未適用最小案](reports/request-intent-connection-20261001/queue-upload-readback-setup-failure-attempt-006.json)、主reportに保存。直前空き40,661,536,768 bytesで相談役指定の必要19,213,651,308 bytesを満たし、3分離rootでsource-size新実体3本・14,410,238,481 bytesを確認。現在の空きは停止保存時26,188,337,152 bytes。新copyは保持し、SSD操作・追加削除は行わない。

通常source/STT登録、計画／検証の実complete、目的の3判断到達、24参照と時計・4区間・admissionが成立。prepareの予定max-steps停止exit1と実succeededを区別、receiver exit0。終了後の追加再読はstore snapshotのPromiseを待たず命令一覧を検索して失敗し、consumer呼出前。新state21,458 bytes不変、4成功命令。旧小証拠669件・製品8path SHA不変、削除済み8path不存在。製品変更・外部推論・費用・動画・品質採用0。

推奨はawait一行の設営10を相談役が個別判断し、保存されたattempt-006で追加receiver-only再読だけを行うこと。Codexは未適用・追加作用停止でGPT_DECISION。大容量系列の再実行は不要。MP4／inspection未提供・目的2件・本適用等の残件は維持する。

## 9. 設営10実行結果とguard-probe停止

[新失敗証拠・未適用一行案](reports/request-intent-connection-20261001/queue-upload-readback-setup010-failure-attempt-006.json)と主reportへ保存。正しいguard拒否が試験側の引数評価中に同期throwし、Promise拒否検査へ到達しない局所設営欠陥。guard条件・期待errorを変えないasync callback案は未適用。consumer／deepEqual／禁止read 0は未合格。修正累積は製品5／設営10、一般上限・履歴は不変、追加作用停止で相談役判断へ返す。

旧90fileの小SHAと全metadata、旧669小証拠・旧転送／旧失敗証拠2件・製品8path SHA不変、保存state21,458 bytes不変。大容量copy・backend／通常runner／factory／PUT／download再実行0、新runtime proof0。新3copy保持・旧削除8path不存在。必要な続行は保存物だけのreaderであり、人間確認・SSD・大容量再実走を必要条件にしない。

## 10. 設営11適用・保存後receiver-only再構築の限定検証完了

[新実証拠](reports/request-intent-connection-20261001/queue-upload-receiver-readback-evidence-attempt-006.json)、[主report](reports/request-intent-connection-20261001/README.md)。相談役保存bf8814a1の一行承認を受領・適用し、最終Edge指示と9225e894のCURRENT_GOAL更新も同期。実別process exit0、guard probe5／再構築中禁止read0、保存実行入力とのdeepEqual一致。新proof1,162 bytes、SHA0b61eef381f59fb14a1318a7e68caead3572606f9cf92c5dfce0d9409db49964。旧state／90runtime／669小証拠／旧転送と失敗3証拠／製品8path不変、既存3copy保持・削除8path不存在。

製品5／設営11、一般枠・過去履歴不変。backend／runner／factory／upload／download・再判断・登録・complete・state更新なし。MP4直接登録、inspection未提供、目的2件の全3判断、字幕演出・動画許可・人間品質等は残件／未承認。次は相談役の限定監査と残る通常登録枝の具体的指示へつなぎ、Codexは今回の承認外を起動しない。
