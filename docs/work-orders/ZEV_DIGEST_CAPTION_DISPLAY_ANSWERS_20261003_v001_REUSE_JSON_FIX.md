# 9の後続 — 再利用履歴JSONの整形修正と新試行先

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：decision: continue
承認根拠：kawafmm承認済みの保存9表示要求への実回答作業と、AGENTSの軽微技術判断の相談役委任に基づく個別承認。本人への再確認・視聴・採点・転記は不要。
監査対象：01b25053bce09484ecd3d6e1e0cf93ab1f36baac
親：[保存表示要求への実回答](ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)
内容訂正の正本：[LINE_END_FIX](ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_LINE_END_FIX.md)

## 1. 現物監査と現在地

同SHAのreport、evidenceのattempt003Failure/保全記録、run-display全文、LINE_END_FIXと0140357bからの5file差分を照合した。run-displayは第一result/trace/receipt保存後にreportのevidence.jsonを厳密JSONとして読む。記録によると、一時の履歴追従コマンドが末尾に改行ではなくliteral backslash+nの二文字を付け、この読取がSyntaxErrorでexit1となった。helperや製品reader/Skill/validatorの修正は不要である。

第一要求の同一回答再利用、実Skill/validator受理、SHA差替え拒否、新result/trace/receipt保存は部分成立。要求2〜9、既承認の一行末訂正、attempt-003最終manifest/再読は未実施。attempt-002の9回答/218表示単位/289行・技術run/readback exit0と行末一点未達は維持する。全体acceptではない。

破損reportはattempt-003/evidence-format-failure.txt（44,729bytes、SHA c4cafc67cee696b3ad274c4c4734aabd5cb5119ac14bb07e79fc5e179a11189f）へ保存された。reportのみ既知の余剰末尾を除いて有効JSONへ復旧・失敗履歴追記済みという事実を保持し、未実施扱いに戻さない。破損実体を削除・修正しない。

監査はGitHub上のコードと保存記録による。相談役はMacの一時コマンドの原実行やignored runtimeの実bytesを直接再実行・再hashしていない。失敗記録と現行読取コードの整合を確認したものである。

## 2. 設営24として個別承認する一件

同じ記録整形欠陥の修正と、失敗証拠を上書きせず再開する保存先対応を一件として承認する。製品6を維持し、適用時に設営23→24。設営21/22/23と過去の製品修正・新二path実装は別履歴として残す。一般上限・強制停止・自己承認権は変更しない。

### 2.1 補助の差分

対象：docs/reports/digest-caption-display-answers-20261003/run-display.mts

OUTだけを `${PARENT}/attempt-004` へ変更する。history/setup24Applied、実受領HEAD、再開先/時刻、再利用・訂正・失敗履歴の記録追従を許可する。実行版の補助SHAは新manifestへ束縛する。

PARENT、INPUT、MB、MEANING_SHA、SCOPE_PATH、回答schema、判定機能、stdin手順、既存reader/validator、例外処理、raw拒否期待値は変更しない。汎用resume、fallback、JSON自動修復機能を作らない。

新先：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-004/
親の実在と新attempt不存在を確認し、新規作成・排他保存を維持する。旧attemptを消さず、EEXISTを無視しない。

### 2.2 一時履歴書込みの差分

履歴を追記する一時コマンドは、更新objectを標準json.dumpでUTF-8 fileへ直接直列化する。JSON本文へ手書きのescaped末尾を連結しない。末尾改行は省略してよい。製品の正式JSON serializerやreaderは変更しない。

書込みを完了・closeした後、保存fileをjson.load/json.loadsで再読し、意図した更新objectと一致することを確認する。その成功後だけ対応responseのファイル名をstdinへ返す。

この記録更新はhelperが当該要求のstdin入力を待っている間に完結させる。stdin送信後にhelperと同じreportを並行更新しない。既存helperが保存する新result/trace/receipt/進捗を古いobjectで上書きしない。新しいlocking基盤は不要で、今回の手順の直列化だけでよい。

過去の破損を将来も自動除去して通す処理、例外無視、合格値の捏造は追加しない。一時コマンドの実行内容と読取一致結果は今回evidenceへ残し、独立した汎用scriptを増やさない。

## 3. 回答の再利用・訂正は既承認範囲を維持

再利用元は有効なattempt-002のまま。manifest SHA：996f506dedbd1c7fc512de9ff0f8ad5bd057d101410d842d54ac418f2c22816a。未完成attempt-003のmanifestを創作・代用しない。

要求1〜8がそれぞれ実提示された後、要求bytes/SHA、対応する旧responseの実size/SHAとrequestFileSha256を照合し、byte同一・排他作成でattempt-004へコピーして実Skill/validatorへ返す。内容の再判断・再整形・未来回答先送信・要求SHA付替えをしない。旧result/合格印のコピーで実検査を代替しない。同一性不成立なら流用しない。

要求9が提示された後、LINE_END_FIXで承認済みの answer.captions[0].cues[8].lineEndBoundaryIds[0] だけをlocal124→125（boundary-003513→003514）に訂正する。完全IDは実要求から取得する。

旧：まあマリンはこんなもん／にしようかなと思います?
新：まあマリンはこんなもんに／しようかなと思います?

cue終端local136、本文・疑問符・所属・順序、schemaVersion/requestFileSha256/judgmentNote、他のcue/行末は不変。一field差分を確認し、理由はreportへ別記する。要求9 SHAは51931ef75ed33d81f7845924b4b9d07258849f1746146ee2b89b5897659b3943、旧response9 SHAは7debdc87ea057f3ce36b4bcb4c81af9a7cbec0c271ec68809413dc1e1e0e7e7f。

## 4. 保全・scope・検証終点

旧attempt-001/002/003の全候補/部分成果/失敗log/record/破損report/manifest/readbackと固定Git版を保持する。attempt-001 exit1、attempt-002技術exit0＋内容一点未達、attempt-003記録整形exit1、新attempt-004の結果を区別する。旧成功再読を新候補へ付け替えない。

親scope実SHA 3f2982a5b55f27c29b62f83cbf2871b3339c3a8b62716fab637f533f9074767a とLINE_END_FIX実SHA bb21a7b12f06b974db53860a947a223af7c844a8805910cd674083b394135561、元purpose/承認/準備bundleは変更しない。本追補は独立した修正承認path/SHAとして記録する。

必要型検査・既存preflightを確認後、新attempt-004で1〜8再利用/9一field訂正→全9件の既存Skill/validator→新result/trace/receipt/manifest→別processの内容判断なし再読一回を実施する。既存helper内のSHA差替えclone一件は維持し、否定suiteを追加しない。

全3,613atomの本文/所属/順序/被覆、1〜8bytes一致、9の一field差分、全218表示単位/289行が変更なしであること、既存36論理幅/2行、全SHA/trace bytes一致、元21入力/実装と旧候補不変を確認する。数値は今回の照合値で恒久目標ではない。再利用待機/コピー/記録整形/再検査と一行末訂正時間を分け、初回の未計測時間を埋めない。

今回のJSON書込み確認は一時記録の直列化を正す確認だけ。準備接続、v005、通常4工程、旧suite/QC、人間レビューを再実行しない。新しい実質問題がなければ最終候補の保存・検査・通常commit/push・直接報告まで進める。

## 5. 変更しない境界と受渡し

製品code、新準備二path、Skill/validator/reader、通常factory/index/backend/shared、一般上限・過去履歴は不変。媒体read/hash/copy/PUT、通常HTTP、新API/provider/費用、取得/STT/inspection/ffprobe、演出/描画/動画、SSD、削除、本番/公開は0。今回許可の小回答JSONコピーを媒体作用へ拡張しない。

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持。v005、7bb5de02、4556e389、a98f569aのacceptは不変。人間品質を代行採用せず、今回の候補全体acceptもまだ未成立。

担当fileのみ明示stage、mainへ通常commit/push、他者変更保全、Git操作直列化、対象process終了を確認する。同じCodex2専用Edgeで本返信全文を受領し続行。本人への再手貼り・転記・視聴・採点、Codex1起動、受理だけの独立commitは不要。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・保存表示要求への実回答
発行時点：設営23適用とattempt-003の部分成立/exit1は報告・保存証拠として確認。本追補の受領・設営24適用・attempt-004実行・行末訂正完了は未確認。Macの現processは相談役が直接観測していない。
