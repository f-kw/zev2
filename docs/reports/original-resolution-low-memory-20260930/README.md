# 同一Digest原寸全編・低メモリ本体合成：短区間実証

## 目的と到達点

OSメモリ圧迫で止まった旧全編本体方式を再実行せず、全307状態PNGを同時に開かない逐次合成経路を `tools/digest-quality` に追加した。保存済み全編背景・AAC・307状態PNGを再生成していない。全編17,613フレームの本体、replay、native QCは今回開始していない。A=8/4は技術入力、`outlineChoice=null`、人間品質未確認。

開始時の `main`、local HEAD、`origin/main` はいずれも `755e93d833ccb1d319ecda05b7275280ce0a67ad`、Git変更0件。前回全編処理の残存processは0。Mac再起動後に取り直したOS memory pressureは正常値1、実空きは55,695,925,248 bytesだった。終了後もpressure 1、実空き55,626,108,928 bytes、関連process残存0を確認した。

保存済み全編背景は10,529,007,182 bytes、実SHA-256 `a305dd91e263abe501d85000744b9737d01fba340ae801ba85723a1d3f3618db`。参照AACは14,513,563 bytes、実SHA-256 `75fa835ad15cc4c5800def26c111241c459a78e5f94410f5304bd16812bced55`。前回の48 bytesの `normal.mp4` は未完成証拠としてそのまま保持した。

## 合成方法

全編の表示フレーム `[0,17613)` を表示時計の整数フレームで84区間に分ける。最大区間長210フレームは既存7秒試験の長さで、最後は183フレーム。各区間の末尾が次区間の先頭と一致し、総和は17,613フレームである。字幕がない区間でも背景フレームを出す。

各区間について既存 `buildPresentationCompositeArgumentsV001` が生成するoverlay graphを使い、当該区間で参照されるPNG入力だけ残してinput番号を詰める。字幕順は元の計画列の順序のまま。fade、Bounce、Shakeの位相と有限状態区間は既存rendererが絶対表示フレームから作る。Panel、部分Color、Scale、位置、alpha式、overlay順は変更しない。今回の固定入力では同一フレームに複数字幕が重なる箇所は0であり、重複時の順序は元の列を並べ替えない構造で保つ。

producerは保存済み背景から当該フレームをseekし、YUV420pをpipeに逐次出す。producerは常に1件だけ起動する。一本のFFmpeg encoderがpipeの全フレームを連続して受け、`libx264`、`preset fast`、`crf 20`、30fps、`yuv420p`、`movie_timescale 30`、参照AAC copyでMP4を作る。旧rendererの1:1画素縦横比もencoderへ渡す。全編rawファイルは作らず、rawを全編分RAMへ集めない。区間MP4の連結も行わない。

全編静的planでは84区間中の最大は**区間内字幕8件・PNG状態21件・producerのFFmpeg input 22件**（背景1＋PNG21）。旧方式は背景1＋PNG307＋AAC1の309 inputを一つのFFmpegで開く。新方式の最終encoderはraw pipeとAACの2 inputである。区間producerとencoderの同時起動は最大2子process、Node親を含め最大3 process。静的planに含むPNGの和集合は保存済み307状態と一致する。これは全編のRSS保証ではなく、開く状態数の上限をコードから確定した結果である。

## 短区間の現物比較

保存済み7秒と7代表区間を対象に、各区間の本体とreplayを新方式で作った。7秒は保存済み**全編背景**から直接seekしており、82フレーム局所アップ全体を含む。別途、14フレームのblack separatorを1フレームずつ分け、うち12区間が字幕PNG入力0であることを実走した。保存済みの既存短媒体を対照にし、旧rendererを直接raw出力した全YUV byte列、両MP4から復号した全YUV byte列、AAC packet列、PCM全byte列、参照AACとの対応、フレーム数、30fps、音声sample時計、MP4全byteを独立比較した。各runは監視v002の群観測・群停止処理を使い、区間producerを並列にしていない。

| 試験 | フレーム | 主な能力 | 圧縮前YUV / AAC・PCM / 旧MP4 |
|---|---:|---|---|
| 7秒・全編背景から直接seek | 210 | Normal、Panel、Scale、fade、82フレーム局所アップ、字幕をまたぐ区間境界 | 本体・replayとも全byte一致 |
| 代表01 | 2 | normal-cut | 同上 |
| 代表02 | 24 | soft separator、字幕なし時間 | 同上 |
| 代表03 | 36 | Bounceの保存済み6状態、3区間 | 同上 |
| 代表04 | 36 | Shakeの保存済み7状態、3区間 | 同上 |
| 代表05 | 14 | black separator、字幕なし時間 | 同上 |
| 代表06 | 24 | Yellow部分Color | 同上 |
| 代表07 | 121 | LightSkyBlue部分Color、3区間 | 同上 |
| 代表05の1フレーム分割 | 14 | 字幕入力0の12区間 | 同上 |

合計9 scope・18媒体の比較で、圧縮前YUV、復号YUV、AAC、PCM、30fps、frame数、音声sample数、本体/replay、既存MP4が全て一致した。7秒の例ではYUV 653,184,000 bytes のSHA-256は旧新とも `7ddcff5a6575f7d205e8122c9fa08f3e918e37c403a85231789b0b32ef24a907`、旧新MP4のSHA-256はともに `0b7c0dbcc595e3c1bbd96e342ffb062797fc08cd05248db8249c743ad956585e`。

初回の7秒試行では圧縮前YUV・復号YUV・AAC・PCMは一致したが、MP4は17 bytes異なり、H.264 extradataが旧48 bytes／新47 bytesだった。raw pipeからの入力に旧背景の画素縦横比1:1が伝わっていなかったため、encoderへ明示して再試験した。最終試験ではMP4も全byte一致した。初回の不一致を合格には数えていない。

新規unit 3/3、既存監視v002故障試験8/8、旧全編入口・再開入口回帰10/10に合格。旧凍結module・旧launcher・旧監視・旧停止記録はGit差分0で、回帰試験も旧受理commitとのbyte同一性を確認した。詳細な各scopeのreceipt SHA、全比較、時計、資源標本、旧ファイルSHAは [results.json](results.json) に保存した。大きな新規短媒体と監視logは `runtime/artifacts/original-resolution-execution-20260930-v001/` に保持し、旧成果物は削除していない。

比較器の子process終了待ちを最終版で堅牢化し、全編背景からの7秒比較を再実行した。18比較値のうち当該2媒体の全結果は前回と完全に同じで、監視群の残存も0だった。

## 資源と安全条件

短区間の実測では、同時字幕最大4件、同時PNG状態最大6件、producer input最大7件（別の7秒試験は5件）だった。処理群の同時ピーク標本は、親RSS 483,262,464 bytes、子2件合計1,501,773,824 bytes、**親子合計1,985,036,288 bytes**。親単体の全標本最大553,926,656 bytesは別時刻なのでピーク親子値へ足していない。最大同時processは親1＋FFmpeg 2の3件。全試験標本のOS pressureは1、短区間合成試験中の実空き最小55,631,106,048 bytes。全runで専用process群の生存残存は0。標本間隔は1秒で、瞬間最大や全編RSSの保証ではない。

監視v002由来の停止条件は、実空き12,000,000,000 bytes以下、親子RSS合計17,179,869,184 bytes以上、OS memory pressureがwarning／critical／unknown、観測不能で中断。今回の試験のために閾値を緩めていない。大きな圧迫を起こす故障試験も行っていない。

## 全編再開に残ること

低メモリcompositorと全編84区間の計画、短区間での現物等価性は確認した。既存全編resume入口は旧方式のまま凍結しており、今回その入口を実行していない。相談役の監査後に、保存済み背景・AAC・307状態PNGを使う本体段階へこの新経路を接続し、監視v002の段階前資源照合・群後始末と既存replay／全編native QC／共有保存／別process再読を維持して全編実走する必要がある。短区間のRSS・圧縮サイズから全編の安全性や品質採用を推定しない。

B保証修正、Codex1副線、OpenAI Decisions、新規API・費用、新素材・STT・AI再判断、production default／trust／registry、正式採用・公開には触れていない。
