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
