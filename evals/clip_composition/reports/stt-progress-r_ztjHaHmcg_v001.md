# STT進捗レポート r_ztjHaHmcg v001

- 対象切り抜き: `r_ztjHaHmcg`
- 元動画候補: `-DwSCDMCWDQ`
- 切り抜き動画: `evals/clip_composition/research/downloads/r_ztjHaHmcg/r_ztjHaHmcg.mp4`
- 元動画: `evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4`

## 現在できていること

- 切り抜き動画125.271655秒を保存した。
- 元動画4817.049252秒を保存した。
- STT対象定義を `stt-targets/r_ztjHaHmcg.json` に保存した。
- 切り抜き側STTを保存した。
  - `stt/r_ztjHaHmcg/clip/transcript.json`
  - `stt/r_ztjHaHmcg/clip/word-timestamps.json`
  - 発話単位: 686
  - 単語タイムスタンプ: あり
- 長尺元動画を分割してSTTできる `run_local_stt_chunked.ts` を追加した。

## 止まったところ

元動画側STTで、ローカルSTTサーバー `http://192.168.1.8:8000` がタイムアウトした。

最初に元動画全体を1本で送ったところ、接続が切れた。その後、分割STTへ切り替えたが、サーバー自体が `/` と `/docs` にも応答しない状態になっていた。

## STT停止中に進めた粗い候補探索

STTサーバー停止中に、切り抜き音声と元動画音声の音量包絡を比較する粗スキャンを行った。この結果は `expectedCuts` として固定しない。

- 音声粗スキャンJSON: `outputs/audio-scan-r_ztjHaHmcg_v001.json`
- 音声粗スキャンレポート: `reports/audio-scan-r_ztjHaHmcg_v001.md`
- 最上位候補: 元動画 `-DwSCDMCWDQ` の `11:37.000 - 13:35.500`
- 切り抜き全体に合わせた確認開始候補: `11:34.445`
- 確認動画: `outputs/visual-check/r_ztjHaHmcg/gemini_pair_audio_scan_v001_r_ztjHaHmcg_vs_-DwSCDMCWDQ_11m34s.mp4`

この確認動画は、Web版Geminiまたは人間が「切り抜きAと元動画候補Bが同じ場面か」を見るための素材として扱う。元動画側STTが完了するまでは、候補区間の確定には使わない。

## 2026-07-05 追記: 粗スキャン候補の否定と字幕ベース再探索

Web版Gemini Flashで、音声粗スキャン最上位の `11:34.445 - 13:39.717` を確認したところ、同一元ネタではないと判定された。

- Gemini確認結果: `outputs/r_ztjHaHmcg/visual_verification/20260705-gemini-web-flash-audio-scan-v001.json`
- 否定理由: 切り抜きは「同接100人」と「2018年のアナリティクス」の話題だが、11分台候補は引っ越し・回線・PC契約寄りの別話題だった。

その後、元動画 `-DwSCDMCWDQ` のYouTube自動字幕 `ja-orig` を保存し、評価環境用STT形式へ変換した。

- 自動字幕: `research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/subtitles/-DwSCDMCWDQ.ja-orig.json3`
- 変換後: `stt/r_ztjHaHmcg_-DwSCDMCWDQ_youtube_auto/source/word-timestamps.json`
- 変換スクリプト: `convert_youtube_json3_to_stt.ts`

30秒チャンク照合とチャンク音声比較の結果、元動画の `36:19` 付近から `40:33` 付近に対応する可能性が高い。

| 切り抜き範囲 | 字幕照合の元動画候補 | 音声が最も寄った元動画範囲 | テキスト一致 | 音量包絡相関 |
|---|---:|---:|---:|---:|
| 0:02.555 - 0:32.555 | 36:14.150 - 37:21.110 | 36:19.930 - 36:49.930 | 76.4% | 0.298622 |
| 0:32.555 - 1:02.555 | 37:44.980 - 39:01.049 | 38:29.360 - 38:59.360 | 56.4% | 0.612458 |
| 1:02.555 - 1:32.555 | 39:01.049 - 40:07.649 | 39:21.159 - 39:51.159 | 75.3% | 0.526415 |
| 1:32.555 - 2:01.147 | 40:02.850 - 40:38.059 | 40:04.730 - 40:33.322 | 81.6% | 0.593818 |

この切り抜きは、元動画の `36:19` から `40:33` をそのまま連続で抜いたものではなく、待ち時間や別コメントへの反応を詰めて編集している可能性が高い。単一区間の `expectedCuts` として固定すると、切り抜きに含まれない間の元動画部分が混ざるため、複数区間対応を持てない場合は2件目fixtureとして保留する。

詳細:

- `reports/r_ztjHaHmcg-youtube-auto-alignment-v001.md`
- `reports/alignment-r_ztjHaHmcg_youtube_auto_v001.md`
- `reports/audio-compare-chunks-r_ztjHaHmcg_youtube_auto_v001.md`

## 再開コマンド

STTサーバーが復帰したら、次のコマンドから再開する。

```bash
runner/node_modules/.bin/tsx evals/clip_composition/run_local_stt_chunked.ts \
  --input evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4 \
  --id r_ztjHaHmcg_-DwSCDMCWDQ \
  --role source \
  --server http://192.168.1.8:8000 \
  --chunkSec 600 \
  --timeoutMs 1800000
```

分割済みチャンクの応答がある場合は再利用する。未完了チャンクから続けられる。

## 次にやること

1. 元動画側STTを完了する。
2. `align_stt_chunks.ts` で切り抜きを約30秒単位に分け、元動画全域と照合する。
3. `compare_audio_candidates.ts` で切り抜き全体と発話部分を音声比較する。
4. 音声確認済み区間から固定テーマとexpected候補を作る。
5. Web版Geminiで元動画対応区間を確認してからfixtureへ固定する。
