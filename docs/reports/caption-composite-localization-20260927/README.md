# 14.9.1 字幕合成の局所化

担当: Codex2。着工時 main `c17c8de83f127d156c0d031d6866ba2024c7b490`、remote一致、clean / untracked 0。

**結果: 技術完了。フェード中以外の全画面画素計算を省く一案を、14.7の統合実走候補として残す。** 代表2区間で平均77.73%／84.20%短縮し、全1,019フレームの圧縮前画素・時計、音声、全4実行のMP4が区間ごとにbyte一致した。全編時間への外挿は行わない。

## 通常描画の実測

Apple M3 Max / 36GiB、Node 20.19.6、FFmpeg 8.0.1。同一の背景・保存PNG・音声sidecar、libx264 / fast / CRF20 / yuv420p / 1920×1080 / 30fps。速度測定は診断filterなし。完全な値・入力hash・command参照は [measurement.json](measurement.json)。

|区間|旧1 / 旧2|新1 / 新2|旧平均→新平均|短縮|短縮率|
|---|---:|---:|---:|---:|---:|
|A（17.5秒）|84.221 / 84.369秒|18.418 / 19.126秒|84.295→18.772秒|65.523秒|77.73%|
|B（16.467秒）|79.691 / 79.863秒|12.633 / 12.577秒|79.777→12.605秒|67.172秒|84.20%|

|区間|ffmpeg最大RSS 旧→新（2回中最大、GB=10^9 bytes）|PNG入力|overlay / 明示filter数|graph文字数 旧→新|出力byte（全4実行一致）|
|---|---:|---:|---:|---:|---:|
|A|4.096→4.071GB|30→30|13 / 146（不変）|5,795→6,132|12,489,213|
|B|2.421→2.375GB|12→12|7 / 68（不変）|2,666→2,849|12,069,582|

RSSはほぼ同程度であり、省メモリ化を今回の主な成果にはしない。CPU user/sys時間も各実行を記録し、平均使用core数は旧約1.34〜1.35、新約2.56〜3.31。実disk I/Oは未計測であり、削減量は主張しない。

完成済みの圧縮前フレームをlossless保存した別対照では、同じencoder・音声copy・muxでA 2.782秒、B 2.902秒。この対照MP4も通常描画とbyte一致した。FFV1 decodeを含むためencoder単独CPU時間ではないが、85分をencoderのせいとする根拠はなく、今回の主な無駄はフェード外の全画面画素式と切り分けられた。

## 目的と固定した比較範囲

同じ完成フレームを少ない計算で作れるかを短区間で測る。14.8.1/14.8.2は再開せず、全編再描画や14.7は行わない。
元の本体合成は5,116.859306958秒（85分16.859秒）。これをencoder単独時間とは扱わない。

|区間（30fps、終端exclusive）|尺|字幕数|含めた内容|
|---|---:|---:|---|
|A: [7347,7872)、244.900–262.400秒|17.500秒|13|Normal、Shake 92/99、Bounce 95、2/5フレームの短字幕、無字幕、PNGが同一で時計が異なる102/103|
|B: [10058,10552)、335.267–351.733秒|16.467秒|7|Normal、Panel 135、部分Color 137、Bounce 139、切替・無字幕|

一つの区間ではShakeとPanel/Colorを含めるため約106秒必要なため、2区間とした。全326字幕にはPulseや字幕の時間重複がない。Pulseと同時layerは小型fixtureで確認する。

## 調査と最初の一案

元commandは背景・378 PNG state・音声の380入力、326段overlay、326個の全画面alpha計算、92,781文字のgraph。PNG decoderとfilter graphは1thread。libx264 / fast / CRF20 / yuv420p / 30fps、音声copy。

表示期間は既にtrimされ、motionは有限stateの排他的な連結、Panel/Colorは保存PNGへ描画済み。同一motion stateの再使用には既にsplitがある。
現行処理を先に測定し、fade倍率が1の期間にも全画面のRGB・透明度式を評価する処理を改善対象とした。元の式は変えず、倍率1の内部期間だけ演算を省略する一案を実装した。cropや別cacheは実装していない。

比較は保存済み背景・字幕PNGを使用する。短区間の背景をFFV1でlossless切出し、同一のAAC packet-copy sidecarを両方式へ固定する。これは比較区間の準備であり、元Digestの音声や映像を変更しない。元の保存物は上書きしない。

## 改善方式と維持した契約

元の4フレームfadeは、字幕内の0始まりの位置が3以上かつ字幕長−4以下で倍率1になる。この期間だけ画素式を省略し、他の期間は元の式をそのまま評価する。途中からの描画でも元字幕からの位置を使い、motion stateを連結した後の通し時計を維持する。

保存時計と条件から算定した全画面式の対象はAで436→73フレーム、Bで413→42フレーム。これは実行条件からの算定であり、計測counterではない。完成映像の525/494フレーム、全字幕、全motion stateを維持する。

production codeの変更は既存合成関数の4行追加・2行置換だけ。PNG入力、全画面canvas、配置、fade式、状態順序、trim、PTS、overlay、encoder、音声copy、muxを維持する。新しい依存、保存schema、切替機能、後方互換分岐は追加しない。

### 新規保存・再読と過去証拠

新規本体合成と全編再現検査は同じ合成関数を使う。実行commandと実装hashは既存の保存形式で束縛される。新規実行からnative QC→全編再現QC→共有保存→別Node再読→最終判定の既存統合試験を通した。編集jobの保存・再起動・登録試験も合格した。

過去のcommand・証拠は当時のsource commitへ結び付いた記録として保持する。最新の合成関数で旧commandを同じものと認める処理は追加しない。旧証拠を最新codeで全面再検証したという報告でもない。14.8.1/14.8.2のQC条件や保存方式は変更していない。

## 同一性と試験

- 実素材2区間、計1,019フレーム：圧縮前yuv420pの全フレームSHA256、順序、PTS、time base、duration、画素byte数が一致。1frameあたり3,110,400 bytes、30fps。
- 完成MP4から取り出したAAC packetの内容・順序・整数時計が一致。Aは753 packet、Bは709 packet。映像尺は17.500000秒／16.466667秒。
- 比較音声は保存AACからpacket単位で一度だけ切出し、全実行へ同じsidecarを使う。音声尺は17.484626秒／16.462948秒。packet境界による映像尺との差は新旧共通で、今回の変更による差ではない。音声再encodeは0。
- 元初稿MP4のSHA256は `11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a` のまま。背景・計画・保存準備・tool・比較入力・対象PNGの計51参照もhash再照合済み。旧QC/14.8証拠は上書き・削除していない。
- 旧commitの合成処理を固定した小型試験で、Normal/部分Color/Panel、Pulse/Bounce/Shake、1〜9フレーム字幕、fade開始/終了、range切断、無字幕、半透明の複数layerを全実byteで比較した。fixtureは画素合成の試験であり、文字描画品質を代替するものではない。実際の保存PNGの比較で補完した。
- 位置ずれ、透明度のある端の欠損、motion最大領域不足、1フレーム時計ずれ、重なり順序反転、別PNGへの置換の6故障を検出。
- 関連9fileの105試験合格、command/resource条件の2試験合格。計107合格、失敗0。旧resource試験の重い900frame×6fixture再描画1件は対象外とした。repository全体のtest合格を主張しない。
- 既存command同一性の2試験は、字幕長から定まる今回の具体的な追加条件だけを検証して除去した後、残りを旧commandと完全比較する。期待値の丸ごと差替えやQC判定の緩和はない。

試験ログ: [関連105試験](regression-tests.log)、[command条件2試験](resource-command-tests.log)。Aの完成MP4 SHA256は `91535b8f6d5c1a937c8bd6ae8ead6e50590a5c1746bb08273b21fe1564333a88`、Bは `dd165886308ef1c3ade52b546c67655c9e5b7bebffbafd65e1fd85430bfb5a96`。圧縮前照合とMP4全byte一致の両方を確認しており、目視による同一性判断ではない。

## 計測の意味と限界

OS cache・他processの負荷は完全統制されていない。通常の速度測定は自分の実行を並列化せず、旧1→新1→新2→旧2の順で各2回行った。圧縮前照合や補助試験は別の検証であり、通常描画の時間には含めない。

診断は [profiling.json](profiling.json) を参照。背景decode単独対照はA 1.217秒、B 1.249秒。画素式を挟む診断区間の合計はA 94.810秒、B 79.498秒だが、初期化・自動format変換・待機・並列処理の重なりも含み、Aではprocess wallを超える。排他的なCPU内訳や占有率として足し上げない。

背景／PNG decoder／encoder／flushの呼出し区間値は生ログから分けて記録した。PNGのdisk読込みとdecode、overlay、graph制御を個別の排他的時間には分離できていない。未測定を推測で埋めない。最終的な原因判断は、画素式を省く変更一つによる通常描画の実時間差と、背景decode・圧縮済みでない完成フレームからのencode対照で行う。

RSSはmacOS `/usr/bin/time -l` のbyte値を採用し、ffmpeg全threadを含むprocessを対象とする。Node親のRSSや親子合算ピークはこの値に含めない。FFmpegログのRSS表示単位はこの環境で不整合があるため換算しない。実disk I/O bytesは未測定。正常描画には新しい中間ファイルや入力を追加していない。

全編は再描画していない。13/7字幕を含む代表区間の改善率を、326字幕の全編85分へ比例換算しない。14.7での全体時間、対象外の素材や環境、人間の品質採用は未確認。

## 再現と成果物

実行driver: `evals/clip_composition/verify_caption_composite_localization_20260927.mts`。
保存場所: `runtime/artifacts/caption-composite-localization-20260927-v001/`。比較媒体・lossless対照・command・stderr・framehash・packet hash・入力参照を保持する。新しい比較物だけを既存のignored成果物領域へ保存し、媒体本体をGitへ追加しない。

```sh
export NODE_PATH=./runner/node_modules
export ZEV_CAPTION_COMPOSITE_OUTPUT="$PWD/runtime/artifacts/caption-composite-localization-reproduction"
node20=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node
driver=evals/clip_composition/verify_caption_composite_localization_20260927.mts
"$node20" --import ./runner/node_modules/tsx/dist/loader.mjs "$driver" prepare
"$node20" --import ./runner/node_modules/tsx/dist/loader.mjs "$driver" profile
"$node20" --import ./runner/node_modules/tsx/dist/loader.mjs "$driver" encode baseline 1
"$node20" --import ./runner/node_modules/tsx/dist/loader.mjs "$driver" encode candidate 1
"$node20" --import ./runner/node_modules/tsx/dist/loader.mjs "$driver" verify
"$node20" --import ./runner/node_modules/tsx/dist/loader.mjs "$driver" encode candidate 2
"$node20" --import ./runner/node_modules/tsx/dist/loader.mjs "$driver" encode baseline 2
"$node20" --import ./runner/node_modules/tsx/dist/loader.mjs "$driver" encode-control
"$node20" --import ./runner/node_modules/tsx/dist/loader.mjs "$driver" summarize
```

macOSのresource counters取得はsandbox外で実行する必要がある。既存directoryの実測を上書きしない。baselineは着工commitの合成処理、candidateは本reportを含むcommitの処理を使用する。保存素材・許可済みtoolの既存pathが必要。

今回は全編再描画、保存字幕PNG再生成、STT、AI、有料API、新素材取得、codec変更を行っていない。追加のcropやPNG共有はNot now。14.7等へ自動着手しない。

## 完了条件とGit

指示書§4の8条件を確認した。代表区間の診断、無駄の特定、一案の最小実装、映像/音声/時計/境界の同一性、MP4 byte一致、実時間改善、採用候補の限定はすべて成立。MP4不一致時の原因調査条件は不一致がないため該当しない。§20の正常・故障条件と§21の既存保存/QC接続も確認済み。

未完了の限定実装・必要試験はない。未確認は全編時間と上記の個別未分離時間・I/O・Node親RSS・対象外環境であり、これらの改善を主張しない。
今回の変更だけをmainへcommit/pushし、clean / untracked 0を確認して、指示元のZEV Build Loopへこのreportを添えた最終監査報告を直接送る。具体的な最終commit SHAと送信確認は完了報告に記す。
