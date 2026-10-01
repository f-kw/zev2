# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-01（JST）

## 1. 最初に読む

プロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADを取得し、同一SHAの [HANDOVER_INDEX.md](HANDOVER_INDEX.md) と指定資料から復元する。旧添付・Drive snapshot・会話要約・メモリだけで現在地を認定しない。

## 2. 現在の主作業・次の指示

**9. 明示Digestの通常キュー接続（v005）。検証用コピー8本の削除・容量回復を`78805d861a41955ccf3f3914d5946f0446e4178d`で相談役受理し、この整理は閉じる。次は、素材コピー不要の「通常入力拒否・Clip回帰」。同じCodex2で続行する。大容量copy／upload／MP4試験は再開しない。**

`decision: continue`。正本は [媒体なし回帰の限定指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_NO_MEDIA_REGRESSION.md)、指示保存`bf24872681eba292f2bb0211f162ea94db7f9e46`。先行[容量preflight](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md)で既に許可した低容量残検証を具体化する。新エピック・製品code変更・新しい人間確認の追加ではない。

次指示は発行済み、受領・新試験の実行・結果は未確認。Codex2の今回報告でGit操作終了を受領し、相談役の正本保存と直列化する。Codex1再起動、本人の視聴・採点・転記、受領記録だけの再commit・終了連絡は不要。

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

試験pathは既存queue-integration-test.mtsと必要なら新queue-no-media-regression-test.mts。最小の一経路を選び、引数なしrunが媒体経路へ進む現行入口は呼ばない。媒体なし入口の分離には先行指示で許可済みの設営7を使用してよい。適用時にだけ設営累積7、製品累積5は維持。今回不要な汎用preflight・storage基盤・監視装置・数値上限は作らない。

書込みは隔離state・小JSON・ログ・結果だけ。素材のread／hash／copy／PUT、削除33参照の復元、link／sparseによる代用、旧readerの欠損無視はしない。旧local成功を今回の試験結果に合算しない。

## 5. 未完了・承認境界

時計二path修正・15局所検査・関連型検査、attempt-005のlocal計画→検証complete・別process再読は`60b959d91d0885ac2bf9cf4aaae66eff93454bab`で限定受理済み。容量整理を理由に未修正へ戻さない。元source/STTは旧保存物の登録、判断は固定応答であり実AI品質とは別。

upload転送／worker-backend分離root／転送先のみの消費再読、MP4直接登録／inspection未提供の通常complete、目的2件の全3判断は未完了／未確認。通常否定・Clip回帰は今回実際に確認した項目だけ閉じ、残りはnot-runと理由を残す。v005全体を完成にしない。

[v005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)の開発候補はproductionType、共通queueのprepare_digest_plan／validate_digest_planと専用2kind。Clipは既存7工程・確認条件を維持、Digestの動画工程は追加しない。FileRef.ownerId＝OutputEntity ID、素材JSONと実動画SHA、要求／回答SHA・全断片被覆・参照検査は維持する。

ID9-PD-01（一般機械採否／保持委任・公開型の本適用）、ID9-PD-02（動画許可SHA／scope）、旧業務state移行・本番有効化は未承認。字幕演出未接続、動画許可未承認、人間品質pendingを維持する。

製品code・外部推論／費用・新素材／STT／inspection・動画・新UI・本番・正式採用・公開・追加削除・SSD探索／移行は今回の対象外。別の不具合は相談役へGPT_DECISION、軽微なら本人へ聞き直さず根拠に基づき判断する。一般上限・強制停止条件を無効化しない。

## 6. 完了済みを巻き戻さない

15分31.633秒初稿と9/28人間レビュー、9/29の144pxと条件付き分割肯定は保持。旧9:47案の1080p・低メモリ製造は`d7e46592`で受理。ID9の15:23.033案・9保持・局所5本・147字幕・111試験は`b69e168c`で受理、送信`68a32038`と終了受領済み。

Codex1の`bd0113c8`対象点検`9b72bc0f`、送信`b93870fc`は終了。心霊回帰会話の不採用理由補足は相談役受理、補足版・局所媒体をCodex1点検済みへ広げず再起動不要。

v002準備`11809f6f`、v003後段入力`7b600a64`、v004設計`d77f2a5d`は限定受理済み。一件変更・保存・Reset・内容修正は既存能力。済んだレビュー・媒体・全試験・削除を再実施しない。

## 7. 記録と継続

人間回答は[台帳](HUMAN_REVIEW_PENDING.md)、全体の残件・根拠は[インデックス](HANDOVER_INDEX.md)。縁A/B未選択・B領域不合格、字幕条件、色・強調、HUD、旧修正版未回答、通常適用・品質等を保持する。

今回結果はqueue-no-media-regression-evidence-v001.jsonと主reportへ保存する。API実測・制御関数単体・保存再読・未実施を分け、媒体作用0と小さい試験領域の増加量を記録。実質checkpointで現在地を同期し、通常main・担当fileのみ明示stage・直列commit/push・専用Edgeから直接報告する。

方針・指示・受理・中断は同じターンに正本へ反映し、会話上限を待たない。新指示の受領・稼働は未確認。受理記録だけの再commit・終了連絡・再起動を増やさない。上位はAGENTS・監査プロトコル・人間確認方針。更新前全文と削除時の詳細は[78805d86固定版](https://github.com/f-kw/zev2/blob/78805d861a41955ccf3f3914d5946f0446e4178d/docs/CURRENT_GOAL.md)に保持する。
