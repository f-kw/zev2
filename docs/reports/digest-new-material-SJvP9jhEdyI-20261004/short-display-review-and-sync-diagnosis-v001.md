# 2箇所だけの局所確認HTMLと、序盤の字幕ずれの切り分け

記録：2026-10-05T13:57:11.320588+00:00。本人Sentinel_1f04f85b6fd48191a933079e73db275dを親mona経由で受領。本人投稿の正確な時刻は未提供。本人は序盤1分の実視聴で大きな字幕ずれを報告し、長尺レビュー要求をやめて、対象箇所をffmpegで短く切り出したHTMLを求めた。本人の同期不具合報告を受理し、技術QC/静止画合格で否定しない。

## すぐ使える局所確認

[このMacのChromeで2クリップを開く](http://127.0.0.1:49504/review.html)。対象文と見る点、再生/停止、通常video操作だけ。自動再生・採点/回答UI・旧HTML改修・全尺レビュー要求はない。同期不具合の原因調査を本人へ押し付けず、表示変更2箇所だけの局所画面としている。

|対象|完成動画からの切出し|長さ|クリップ内の対象|
|---|---|---|---|
|世界が終わる|frame[24928,25070)、13:50.933〜13:55.667|142frame、4.733秒|2.000〜3.067秒|
|何人いるの?お!|frame[32485,32637)、18:02.833〜18:07.900|152frame、5.067秒|2.000〜3.067秒|

[HTML](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/short-display-review-20261005-v001/review.html)、[世界クリップ](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/short-display-review-20261005-v001/world.mp4)（1,244,217B）、[お!クリップ](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/short-display-review-20261005-v001/oh.mp4)（867,634B）はSSD実ファイル。同じ完成MP4 SHA5b9fa2f98579e08a130412d0f1f4ed28fd77b687f2fd239ab2720d49b7d0c7bcから、前後約2秒の範囲を1280×720/30fps/AAC44.1k stereoに切出し。共通のaccurate input seekで映像音声を同じ起点にし、独立PTS reset/元時計補間はしていない。両streamは0開始、全142/152 video PTSはn/30に一致（表示decimal誤差最大0.333µs）。第二MP4末尾duration metadataだけ0.651ms短く、初回のmetadata完全一致guardが拒否したため、再encodeせず実frame PTS全件を検査して区別した。誤差を秒単位の同期問題と混同しない。[切出し記録](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/short-display-review-20261005-v001/build-record.json)。

2026-10-05 13:46:01 UTC、Microsoft Edge Chromiumの独立profileで実HTML表示・2本の実再生/停止/seek/短クリップ全再生・音声decodeを確認。autoplay=false、音声mute=false/volume1、初期停止、外部page request0/page error0、390px幅はみ出し0。実装者は両対象のbrowser screenshotも実際に見た。ブラウザ音声decodeは音声を実際に聴いて発話同期を判定したことではない。[実ブラウザ検証](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/short-display-review-20261005-v001/browser-check.json)。Range206/先頭byte一致、対象外JSONとtraversal404も確認した。

配信は127.0.0.1だけ、allowlistはreview.html/world.mp4/oh.mp4だけ。short server PID/PGID68661、停止はkill -TERM 68661。既存完成MP4 server PID54217/URL63610は保持。本人Chromeの既存profile/tabは操作0。全尺製造/新STT/有料API/外部公開/元媒体変更0。

## 序盤の不具合について確認できたこと

独立した読み取り担当が実入力とタイムラインを照合。全650 instructionのstart/endは、元atom spanを `outputStartFrame + round(sourceMs×30/1000) - sourceStartFrame30` で編集後へ変換した結果と一致し、不一致0。序盤1分の36字幕の全atomは元prepared meaningと同一。今回の表示調整は後半group28/31に限定され、序盤の時計変更は0。

元素材は60fps/PTS0、音声44100Hz/PTS0。baseは全体の偶数frameを30fpsとして選択後、sourceFrame30に沿って切り出し、音声は同じsourceFrame30×1470 sample。保存source offset0、秒単位の一定offset/倍速変換の構造的不一致は見つかっていない。元source SHAは907de6d045d4c94cec8798bd1a1d9411a90675c08a1c1f809db72e3b9fd5b4d1。診断開始時、補助担当の省略pathではファイルを解決できず音声処理開始前に拒否。実generation manifestのsourceUriから正確な既存pathへ解決して続行し、SSD全体を探索していない。

次の2代表で、元素材・base・完成の対応音声を8000Hz mono PCMとして数値比較した。新たな音声認識や発話時刻推定は行っていない。

|完成側|元素材側|元→完成、時刻差0での波形相関|base→完成|
|---|---|---|---|
|0.000〜3.700秒|2:58.900〜3:02.600|0.9999078|PCM byte完全一致|
|7.400〜12.400秒|3:09.166667〜3:14.166667|0.9996748|PCM byte完全一致|

±10msの比較でも最良lagは両方0sample。元→baseはAAC再符号化を挟むためbyte同一とはせず、圧縮後の波形相関を記録した。base→完成は既存の全AAC packet payload同SHA7cd5355fcd5dfd8eb8c64cef41eb3a20e78b0223ba62a2c40aad6c99c5941117に加え、今回2代表のdecoded PCMも完全一致。[短い実音声transport比較](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/short-display-review-20261005-v001/diagnosis-transport-v001/result.json)。これら2代表では、合成が音声を秒単位でずらした証拠はない。全域の発話同期の合格証明ではない。

## 強い原因候補と影響範囲

元GPU alignmentの最初の99文字（原2:58.894〜3:27.722）には文字時計の局所的な圧縮/伸長がある。

|本文|元時計の長さ|完成動画の字幕|
|---|---|---|
|あれしてたけど|0.240秒|1.400〜1.667秒|
|どんな話になってんだよ|0.360秒|2.067〜2.400秒|
|みたいな感じじゃない|18.525秒|7.433〜25.967秒|

「みたいな感じじゃない」では原文字ID94「感」へ10.243秒（189.557〜199.800秒）、ID96「じ」へ6.022秒（201.160〜207.182秒）を割り当て、scoreはそれぞれ.998/.997。別文字にはscore0/20msもある。高scoreだけで正しい時刻とは判定できない。下流はこの時計を忠実に字幕へ変換しているため、元文字時計の偏りが大きな字幕ずれの強い原因候補。

本人が見た最初1分の同期不具合は、今回の後半2表示修正で説明できない。少なくとも前半25.967秒までに上記の極端な配分がある。全650の変換一致は時計精度の合格ではなく、序盤以外の実発話同期への影響範囲と各発話の正解時刻は未確定。実装者は今回、人間として実音声を聴いて語の開始/終了を判定していない。一定offsetで直ることも確認していない。

修正対象として、元文字時計を生成/検証する側と、その時計からの字幕再導出を親へ提示する。元時計を保つ現在の移行契約のままでは時計訂正を含められず、具体的な訂正対象・正解時刻・上流変更の範囲は別途確定が必要。今回の指示は原因整理までで、時計補間、新STT反復、製品変更、全尺再製造は行っていない。本人へ全尺採点や発話時計の手動再提出を要求しない。

## 終了状態

局所HTML/クリップ提供と今回の原因切り分けは完了。同期修正は未実施、次担当は親mona（元文字時計の訂正/検証の具体範囲を整理）。本人実視聴の不具合を保持し、旧technical receiptを書き換えない。full-quality合格や正式な人間採用として扱わない。

ブラウザは13:46:01 UTC exit0で終了し、今回不要な51B一時fileだけを13:52:46 UTCに整理。元/途中/完成媒体、短クリップ/HTML、PCM比較の小証拠、ブラウザ/切出しlogと画像KEEP。13:52:46 UTCにshort/full serverは各127.0.0.1だけで待受、本人受渡しのため保持。元動画/旧成果/他者process削除停止0。

補助担当の追加監査JSON保存は自動承認reviewが担当の読み取り専用/変更0指定との矛盾として拒否し、コマンド未実行/ファイル作成0。再試行せず、返された読み取り結果を本報告へ記録した。これは局所HTML提供やrootの短い音声比較を止めるblockerではない。

Gitはmain、baseHead358dc88d。今回のreport/log/CURRENT/HANDOVER/前回報告への現在結果索引だけをcommit/pushし、最終実値は [Git終了記録](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/short-display-review-20261005-v001/final-git-record.json) と最終報告に示す。媒体をGitHubへ送らない。
