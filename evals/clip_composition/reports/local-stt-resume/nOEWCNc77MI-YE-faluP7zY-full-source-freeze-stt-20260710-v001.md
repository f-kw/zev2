# B素材 凍結用全域STT再開記録 2026-07-10 v001

## 目的

B素材 `nOEWCNc77MI` を5件目fixture候補として凍結準備するため、元配信 `YE-faluP7zY` の全395チャンクを同一のローカルSTT条件で処理する。

発話量上位50はテーマ探索用であり、凍結用の全単語列の代わりにはしない。

## 現在状態

- 元配信長: 3:17:04
- 分割単位: 30秒
- 全チャンク: 395
- raw応答あり: 159
- 先頭から連続して完了: index 0-122、123件
- 先行処理済み範囲を含むraw: `0-122,125,128,132-136,144,161-165,171-175,180,182,194,207,216-218,224,229,279,323,325,330,362,366,375-376,379`
- 次の未処理: index 123
- 最終manifest: 未生成

## 再利用した結果

次の結果は、同じ30秒音声、同じSTTサーバー、同じ言語設定で作成済みだったため、全域STTのrawとして再利用した。

- 発話量上位50: `nOEWCNc77MI_YE-faluP7zY_rough_top50_speech_chars_local30_v001`
- 素材候補18チャンク: `nOEWCNc77MI_YE-faluP7zY_selected_windows_local30_v001`

再利用はLLM入力や字幕による置換ではない。同一音声ファイルへの既存ローカルSTT応答を重複送信せず使用したもの。

## 停止理由

index 123のSTT送信中に `fetch failed` が発生した。直後の `http://192.168.1.4:8000/health` も10秒でタイムアウトしたため、音声内容ではなくSTTサーバー停止として扱う。

代替字幕や別STTへ切り替えない。サーバー復旧後に同じ出力IDで再開する。

## 再開コマンド

```bash
runner/node_modules/.bin/tsx evals/clip_composition/run_local_stt_chunked.ts \
  --input evals/clip_composition/research/downloads/nOEWCNc77MI/sources/YE-faluP7zY/YE-faluP7zY.mp4 \
  --id nOEWCNc77MI_YE-faluP7zY_local30_v001 \
  --role source \
  --server http://192.168.1.4:8000 \
  --chunkSec 30 \
  --timeoutMs 1800000
```

既存rawがあるチャンクは再利用され、index 123から未処理分だけSTTへ送られる。

## 完了後

1. manifestの `processedChunkCount: 395`、`partial: false`、単語時刻ありを確認する。
2. 切り抜き側と元配信側の全単語列でDP照合する。
3. 素材ブロックを再構成する。
4. 少数の素材境界確認パッケージを作る。
5. 人間確認待ちで停止する。

## 制約

- 途中transcriptをDP照合、LLM入力、fixture凍結に使わない。
- runtime、本体UI/API/キュー/DBへ書き込まない。
- fixture/expectedは人間確認と固定テーマまで作成しない。
