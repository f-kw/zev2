# 現行字幕登録・表示調整後の全尺Digest製造と引き渡し

記録：2026-10-05T12:47:25.229718+00:00。実装SHA `4c79ba87b275fbd8c10e93ef8f83a1b1ac4df6c5`。正式な結果再読は2026-10-05 12:37:16 UTC、引渡し束縛の再確認は12:43:27 UTC。今回の製造、既存技術QC、代表8場面の静止画確認、保存は完了。人間の品質採用は未評価。

## 完成動画と保存先

[このMacのChromeで完成動画を開く](http://127.0.0.1:63610/digest.mp4)。普通の動画操作で再生・停止・位置移動ができるMP4直結URL。完成動画一本だけを127.0.0.1で配信し、外部公開・再エンコード・比較UI追加はしていない。12:33:34 UTCにHEADと冒頭・途中・末尾各1024BのRange応答、完成ファイルとのbyte一致、対象外pathの404、範囲外416を確認した。実ブラウザでの全尺再生と音声聴取は未実施。サーバPID/PGID54217は本人への引き渡しのため意図的に保持。停止方法は `kill -TERM 54217`、記録は [配信記録](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/current-display-local-playback-v001/server.json)。

[完成MP4](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-current-display-v001/render/presentation-rendered-v002.mp4) は617,651,421B（約618MB）、SHA256 `5b9fa2f98579e08a130412d0f1f4ed28fd77b687f2fd239ab2720d49b7d0c7bc`。1920×1080、30fps、37,619frame、20分53.967秒。31区間・650字幕・1041行・5450atom・55,299,930sample、元音声を保持。今回の既承認216px、縁8/glow4、最大2行、Normal、順接続、identity cropの確認用一本で、縁の好みや品質本採用ではない。

途中の入力スナップショット、JSON、grid/PCM、背景、字幕PNG、QCと完成媒体を今回SSD領域へ保存して再読できた。guestは `/Volumes/ZEV-Digest-20261003-01`（APFS、device16777243）、hostは `/Volumes/KIOXIA`（ExFAT、device16777238）。Core ROOTを一般変更せず、現行入力JSON専用root/prefix、親TMP継承、正式stillの既存bundle-cache無効化を用いた。別承認済みの制御JSON4file/37,424Bだけ内蔵に残る。保存先対応と旧31回答の現行登録移行は実装4c79ba87に固定済み。前段保存先の2path修正は556dc168、現行移行は既存製品6path＋専用helper1/test1。広い保存契約・default/trustの変更、旧形式救済分岐は追加していない。

## 実装と技術検査

旧31回答の本文・ID・順序・時計・answer/判断理由と原所有者を保存し、実原本対応を必須proofで検査。通常runnerで新しい正式validateだけを一件完了し、現行準備と候補へ移行した。旧source/STT/plan/4要求/旧登録・旧失敗証拠は不変。新素材取得・STT・LLM再判断・有料APIは0。

準備12、Python27、移行18、job/保存先/偽装拒否23の専用検査が成功。10:24:19 UTCにrunner/Remotion型検査exit0、10:22:58 UTCに独立read review追加blocking0。10:28:39 UTCに正式入力・実device/容量の開始前検査成功。10:30:13 UTCの最初の呼出しはcaller PATHにdiskutilがなく製造前拒否、owner/output/mediaなし。PATHだけを補正した一回の正式製造が10:31:24 UTCに始まり、12:13:51 UTCにexit0で終了した。失敗記録は保持し、架空receiptやfallbackを使わなかった。

既存技術QCは全primaryの入力/alpha/画面内境界ルール、完成media、元AAC packet payload保持がpassed。650primary、代表8repeat、12line maskを検査した。代表確認後の正式登録は12:25:28.481 UTCにcompleted、12:25:54 UTCにfinalizer exit0。12:37:16 UTCの既存読み取り専用get-resultはcompleted/complete=true/passed-representative、remainingRunning=[]。原pending receiptを書き換えず、別のcompleted receiptを登録した。

[完成receipt](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-current-display-v001/record-finalization-v001/completed-receipt.json)（4,939,514B、SHA256 `9b6e2570ba5648d57ccb7a3770ce4b741bbec7b19e4375b0421bf590ed2d9e31`）、[正式再読](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/current-display-final-get-v001/stdout.json)、[引渡し要約](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/current-display-delivery-summary-v001.json)（7,959B、SHA256 `8e01d73cdb6fa9302b560f1a3c8d5de593188f589678095173a6206e1ce7bb6f`）に実job/auth/manifest/実装/output/owner/mediaを束縛している。新実装や再製造は追加していない。

## 実際に見た範囲と未評価

完成動画から一回のdecodeで代表8PNGを抽出し、PTS・元MP4不変・byte束縛を検査した。実装者が8枚すべてを実際に見た後、12:21:30.430538 UTCにstill-frame/text-clock-contextの範囲で記録。通常速度のvideo-playbackとしては登録していない。

|字幕ID|完成動画の表示区間（秒）|表示内容|長さ|
|---|---|---|---|
|464|832.767〜832.933|食い止め／なければ|5frame、0.167秒|
|465|832.933〜834.000|世界が終わる|32frame、1.067秒|
|466|834.000〜834.300|なんか|9frame、0.300秒|
|467|834.300〜835.200|いい雰囲気に／しないで!|27frame、0.900秒|
|468|835.200〜835.667|いい雰囲気に!|14frame、0.467秒|
|469|835.667〜837.567|全ての力を／合わせて|57frame、1.900秒|
|570|1084.833〜1085.900|何人いるの?お!|32frame、1.067秒|
|571|1085.900〜1091.000|早速鬼がいるん／じゃねえか!|153frame、5.100秒|

文字欠けや画面外へのはみ出しは8場面では見つからなかった。465は一行、570は質問と「お!」を一行にした既承認の表示変更と一致する。13:53.433付近と18:05.333付近を含め、大きい字幕は元のゲーム会話欄に重なり、一部では登場人物/アバターにも重なる。これは実際の静止画観察であり、人間が見やすいと採用したことを意味しない。周辺の5/9/14frame字幕は短いまま残る。

全尺を通常速度で続けて見た読みやすさ・構成/テンポ、音声の実聴取、厳密なSTT同期、人間品質/縁の好みは未評価。fullVisibility/counterfactual比較は未実施。未評価を合格へ変えず、本人に過去レビューや全字幕採点のやり直しを求めない。

## 制作時間・負担・資源

製造内の実測は初期準備20.317秒、base media21分18.972秒、描画/合成/QC1時間20分18.294秒、合計 **1時間42分23.820秒**。監督側の経過は1時間42分26.856秒。今回の現行登録移行/準備は09:45:19〜10:31:24 UTCの約46分で、続く製造・記録・引渡しを合わせた経過は2時間を超えたため親へ報告済み。これには計算と待機を含み、人間の手作業時間ではない。製造開始後に本人へ追加判断/操作/全字幕採点を要求していない。通常処理の4.7秒/準備0.75秒や旧3時間17分を今回の全工程保証として使わない。

監視で観測した親子RSS最大2,976,251,904B。最小空きはguest83,867,144,192B、host1,984,334,659,584B、内蔵16,393,023,488B。50GB開始/各disk12GBreserve/RSS16GiB/pressure1/設定1秒観測/next unit+reserve/ownPGID停止を維持し、容量は合算していない。採取間隔と観測ピークは連続保証・SSD持続速度の保証ではない。

## 後片付けと次状態

成功後不要なbase-media作業snapshot/PCM/途中transcodeは既存Coreが整理。完成記録固定後に今回製造・記録呼出しの不要なcompiled JS cache93file/3,970,838Bだけを追加整理し、output/tempは空。元素材、600.5MBのbase媒体一式、完成MP4、650primary PNG、代表8PNG、約6.84MBのrepeat/mask/layout検査証拠、入力・新旧receipt・失敗ログは後続参照のためKEEP。旧成果/他者file/他者processの削除・停止0。製造/抽出/finalizer/get-resultのown process残存0。本人へ渡す動画配信だけは明示指示に従い稼働を保持する。

12:43:27 UTCの空きはguest86,221,873,152B、host1,984,356,679,680B、内蔵16,482,254,848B。今回の実装と製造は終了し、次担当は親mona（完成URLと残る品質未評価を本人へ渡す）。人間品質待ちは異常や製造停止ではなく、追加製造を自動再開しない。正本/今回ログだけのcommit/pushと最終Git cleanを別に確認する。結果は [最終Git記録](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/current-display-final-git-v001.json) と最終報告に示す。
