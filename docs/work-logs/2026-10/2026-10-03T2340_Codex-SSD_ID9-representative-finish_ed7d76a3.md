# ID9 — 本人指定の代表確認方式で保存済み一本を仕上げ

session: Codex-SSD / task-3
epic: ID9 Digest正式接続・同一候補の仕上げ
startedAt: 2026-10-03 23:18 UTC（本人の再開指示）
closedAt: 2026-10-03T23:40:32.511061+00:00
baseHead: ed7d76a39babe4a763752bb063cb9d48fc75fb0a
finalHead: このログを含むローカル完了checkpoint。報告時の実SHAはworkspaceの216-representative-finish-closing-record.jsonで固定する。
status: complete（今回本人指定の代表確認方式・同一動画の受渡し準備。旧全件QC合格/公開/remote同期を意味しない）

本人22:20 UTC「数件確認して全体にはルールベース」、22:21 UTC「忘れない」、23:18 UTC「なぜ？再開して」が親相談役から届いた。同一216px/左右108px/372cue/9区間/15:23.033の保存済み動画を利用し、代表確認と全体の同一ルールを記録する範囲。旧4path QC-only案と全372encoded比較の再開は採らない。旧失敗を残し、成功へ書き換えない。GitHub pushは別のHOLDを維持する。

開始時main/ed7d76a3/clean、対象製造processなしを読取確認した。APFS guest7212F3BB、host ExFAT0E5DC84B、dev16777243/16777238、50GB開始/別々の12GBreserve/pressure1を確認。製品実装変更0、再描画0、再合成0、新素材/STT/API0。

23:27:41–23:27:52 UTC、完成MP4のmetadata、元baseと完成動画のAAC packet payload同一、MP4同一byte copyと再読を確認。12点を実decodeし、6代表中心と最短cue前後6フレームを原寸表示で観察した。全372設定/本文ID/3613atom/9区間/27691frameは保存記録で同一。結果と根拠は[代表確認report](../../reports/digest-caption-216px-reflow-20261003/representative-finish.md)、[確定result](../../reports/digest-caption-216px-reflow-20261003/representative-validation-result.json)。

代表の文字欠け/端切れは見つからなかった。最短0.4秒の通常速での読了性、全編視聴・テンポ・音声実聴取、人間の最終品質採用は未確認。旧全件比較QCは失敗を保持し、今回の合格待ちに戻していない。製品code不変のため新typecheck/全QC suiteは不要、既存結果を今回の新QC合格にしない。

成果: `/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/representative-finish-v001/ZEV_Digest_15m23s_216px_20261003.mp4`。598,323,447B、SHA9eea47be93c94cbe7c8b307642d0eb943fc2985445e607af65ff9133ab12ac56、1920×1080/30fps/15:23.033。コピーだけ444、旧fileの権限・byte不変。Mac上で開く/同一file copyにより受渡し可能。Library/添付/公開へのuploadは実施していない。

cleanup: 新tempの空directoryだけ整理、回収file0B、旧削除0。完成MP4と観察12枚はKEEP、旧V2/V3/base4/原本/全PNG/失敗/旧socket/imageは参照・監査のためKEEP。own worker残存0。最終空きguest97413664768B / host1989503090688B / 内蔵14445953024B（合算なし）。

今回コピー/最小確認/抽出は10.628秒。旧V2全体1時間3分39.837秒、字幕画像検査41分59.334秒、合成13分47.923秒を過去制作負担として区別。初回保存基盤準備・元素材検査・復旧と通常一本の処理を混ぜず、人間active時間は未測定。今回追加の本人採点・転記依頼0。

Git: main、自分の方針/確定report/このlog/現在地だけ明示stageしローカルcheckpointへ固定する。Git clean/untracked0と実SHAは報告時のclosing recordで確定。pushは以前の自動承認審査拒否後HOLD、再試行0/代行0。

次状態: 今回の動画仕上げは完了。親monaが成果と確認範囲を本人へ平易に伝える。新しい本人指示なしに再製造・全件QC・別epicを再開しない。未確認品質やpushHOLDを自動再開の理由にしない。
