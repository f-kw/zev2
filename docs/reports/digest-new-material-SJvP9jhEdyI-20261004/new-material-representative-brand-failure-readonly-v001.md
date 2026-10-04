# 新素材v003：正式受け渡しで止まった原因の読み取り確認

確認時刻：2026-10-04T12:08:19.718053+00:00。対象は `/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-v003`。製品コード・Git・SSD・既存プロセスは変更していません。親が許可した小さいモジュール読込確認を一回だけ実施しました。

動画の合成は成功しています。その後、正式結果を受け渡す際の資格確認が別のモジュール実体を見てしまい、2026-10-04 11:54:57.305726+00:00 に終了コード1で停止しました。`remainingRunning=[]`。これは品質合格や正式完成ではありません。

## 原因と最小の通常接続修正案

代表確認モジュールの資格情報は、11行目のモジュール内 `WeakMap` に保存されます。rendererのnative ESM読込が付けた資格を、tsxのCJS変換を通したcallerのstatic importが別の実体で検査し、caller114行目→共通module171行目の `QUALIFIED_REPRESENTATIVE_COMPLETION_REQUIRED` で止まりました。返却中のverificationとstorageContextは同じ参照であり、この受渡しにJSONcloneはありません。

実Node20.19.6＋既存tsx loaderで同じ絶対pathをcreateRequireとfileURL dynamic importから読み、4関数すべてのidentityがfalseでした（exit0、媒体処理・private mint・cloneなし）。同一モジュールの別実体が実測されたため、今回の資格が伝わらない原因を裏付けます。

未適用の差分はcaller一箇所の4static importを固定fileURLのnative importへ統一します。資格確認・公開後再束縛・pending保存を同じモジュール実体にし、WeakMap/private資格、現在のjob/承認/settings/hash/context検査は維持します。一般loader・global資格・JSON合格化は追加しません。diffは提案だけで、型検査や正式実行はしていません。

## 保存済み処理の事実

- native字幕工程：2026-10-04T08:59:51.240Z→2026-10-04T11:29:25.819Z、8974.579秒。primary651 PNG、repeat651 PNG、行mask1042 PNG（scratch計1693）。child5730件は全部exit0。内訳：still1302、line-mask1042、line alpha1042、line bounds1042、final alpha651、final bounds651。これは各子処理の成功記録であり、保存されていない数値QCの代わりにはしません。
- 合成：11:29:27.473→11:51:28.032 UTC、**1320.550秒（22分00.550秒）**。180range全exit0、37619frameを連続一回被覆。以前の19分は旧動画からの換算であり、この実測とは別です。
- 既存合成receiptのMP4：617,257,203 bytes、SHA256 `6434a56b40e66212c5dd910638c33b73b53029d733592b0b77ca6aa03d4f18b8`。今回再hashせず、実statのサイズ一致と元receiptを確認しました。
- 合成後の3媒体検査childも全部exit0：ffprobe11:51:30.133→11:53:10.724（100.591秒）、audio payload11:53:11.782→11:53:11.940（0.157秒）、frame count11:53:12.968→11:54:53.008（100.039秒）。request/args/exit/timingは残存。stdoutおよびoutputMedia/音声hash/frame countの実数値resultは未保存なので、新たな数値を推定して合格としません。
- layout-outputはpassed、651items、違反0。実approval jobは31group/5450atom/651cue、settingsは216px/左右108px/15logical幅/2行。元本文・時計の再判断はしていません。

## 未保存・未完了

`renderer-result.json`、`result.json`、`representative-technical-evidence-v001.json`、正式 `render/` がありません。callerのcommit前に例外が出たため、MP4はwork内です。代表確認recordも未作成で、本来この時点の完了値は `confirmation-pending` / `complete:false` になる条件でした。

全件の反実仮想QCは代表方式では実行していません。実視聴と代表確認も未実施です。処理内の全ルール/媒体評価がcaller projectionまで届いたことはコード経路から読み取れますが、その具体数値・資格brandはメモリにしか残っていません。正式完成や品質合格に読み替えません。

## 保存済み動画を使うための条件

上の読込修正だけでは、終了したプロセスのWeakMap資格と未保存draw stateは復元できません。既存finalize/getは実pending result、technical evidence、正式公開媒体bindingを必要とするため、今の保存物へ直接使えません。現在の通常入口に、この失敗状態の正式resumeはありません。

一方、保存データがあるので再描画・再合成を不可避とも断定しません。再利用するなら、この一件の実失敗・旧job/承認/code/owner終了・保存MP4receipt・全PNG/mask・元plan/props/本文/ID/時計・SSDを束縛した限定入口が必要です。欠けたstateやalpha/media数値は、元保存物を既存検査で読み直して新しい検査として構成し、同じnative moduleで資格を新規付与してから、既存のatomic no-replace公開とpending保存につなぎます。これは**保存済み失敗状態を受け入れる正式入口という追加契約**であり、今回の読み取り権限では実装・実行しません。

責務候補はrendererのprivate finishへの限定saved-state入口、callerの同一module受渡し・既存公開、approved runnerの旧実失敗と新owner/receipt資格です。新しいlogical childが必要ならCoreのbindingも具体化が必要で、ファイル数だけでは成立を保証しません。既存reserveは残存lockを拒否し、commitはowner token/output/物理topologyを検査するため、旧lockの削除や旧reservationの捏造はできません。

元video・全native PNG/mask・source/base・入力・layout・owner/lock・receipt・logはKEEPとします。新shared trust、fallback、QC省略、元result偽造、partial-primary調査は行っていません。

関連実byte binding・最終3childのexact args・全観測集計は同名JSON、未適用のcaller差分は同名 `.diff` に記録しています。
