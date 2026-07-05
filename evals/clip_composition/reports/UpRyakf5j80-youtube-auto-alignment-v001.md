# UpRyakf5j80 YouTube自動字幕照合メモ v001

## 目的

`r_ztjHaHmcg` は元動画内の複数箇所を詰めた編集で、現行の単一区間評価にそのまま固定すると余白の多い正解データになる可能性が高かった。そのため、次の単一区間fixture候補として `UpRyakf5j80` を調べた。

このメモは `expectedCuts` の確定ではない。音声比較と目視確認の前段として、YouTube自動字幕で元動画内の候補区間を絞った結果を残す。

## 入力

- 切り抜き: `UpRyakf5j80`
- 切り抜きURL: https://www.youtube.com/watch?v=UpRyakf5j80
- 切り抜き尺: 43秒
- 切り抜きタイトル: 現役Vtuberで登録者数が世界2位になったことについて正直な感想を述べるマリン船長【ホロライブ切り抜き】
- 元動画候補: `kNX-wQTvsws`
- 元動画URL: https://www.youtube.com/watch?v=kNX-wQTvsws
- 元動画尺: 3時間49分48秒
- 元動画タイトル: 【地獄銭湯】怖くて風呂で目を瞑れないタイプのマリン銭湯【ホロライブ/宝鐘マリン】

## 保存したもの

- 切り抜きメタデータ: `evals/clip_composition/research/downloads/UpRyakf5j80/UpRyakf5j80.info.json`
- 切り抜き音声: `evals/clip_composition/research/downloads/UpRyakf5j80/UpRyakf5j80.m4a`
- 切り抜き自動字幕: `evals/clip_composition/research/downloads/UpRyakf5j80/subtitles/UpRyakf5j80.ja-orig.json3`
- 元動画メタデータ: `evals/clip_composition/research/downloads/UpRyakf5j80/sources/kNX-wQTvsws/kNX-wQTvsws.info.json`
- 元動画自動字幕: `evals/clip_composition/research/downloads/UpRyakf5j80/sources/kNX-wQTvsws/subtitles/kNX-wQTvsws.ja-orig.json3`
- 切り抜き字幕STT変換結果: `evals/clip_composition/stt/UpRyakf5j80_youtube_auto/clip/word-timestamps.json`
- 元動画字幕STT変換結果: `evals/clip_composition/stt/UpRyakf5j80_kNX-wQTvsws_youtube_auto/source/word-timestamps.json`
- チャンク照合JSON: `evals/clip_composition/outputs/alignment-UpRyakf5j80_youtube_auto_v001.json`
- チャンク照合詳細レポート: `evals/clip_composition/reports/alignment-UpRyakf5j80_youtube_auto_v001.md`
- STT対象定義: `evals/clip_composition/stt-targets/UpRyakf5j80.json`

## 照合結果

切り抜きを約30秒ごとに分けて、元動画全域の字幕STTへ照合した。

| 切り抜き範囲 | 元動画候補範囲 | 照合結果 |
| --- | --- | --- |
| 0:00.000 - 0:30.000 | 3:09:22.439 - 3:09:57.300 | 切り抜き側98.8%、元動画側98.8% |
| 0:30.000 - 0:44.390 | 3:09:51.899 - 3:10:05.460 | 切り抜き側95.0%、元動画側95.0% |

2つのチャンクが元動画の同じ連続範囲に重なっているため、字幕上の本命候補は `kNX-wQTvsws` の `3:09:22.439 - 3:10:05.460`。

## 現時点の判定

- 単一区間fixture候補としては `r_ztjHaHmcg` より扱いやすい。
- ただし、現時点ではYouTube自動字幕照合だけであり、ローカルSTT、音声比較、目視確認は未完了。
- `expectedCuts` にはまだ固定しない。
- 固定テーマはまだ作らない。正解区間が音声・目視で確認できた後、人間が「この切り抜き師はこういうテーマで切った」と逆算して書く。

## 未完了

- ローカルSTTサーバー `http://192.168.1.8:8000` は疎通確認時に接続拒否だった。
- 元動画の音声ダウンロードはHTTP 403とYouTube PO token制約で未完了。
- 切り抜き側は音声のみ保存済みで、動画ファイルは未取得。
- 音声比較はまだできていない。
- Web版Geminiまたは人間による目視確認はまだできていない。

## 次の作業

1. ローカルSTTサーバーが使える状態なら、切り抜きと元動画候補区間を単語タイムスタンプ付きでSTTする。
2. 元動画 `3:09:22.439 - 3:10:05.460` 付近の音声を切り出せる状態にして、切り抜き音声と比較する。
3. 音声比較で対応が確認できたら、Web版Geminiまたは人間確認で該当秒数を観る。
4. 確認済み区間をexpected候補にし、その区間から固定テーマを人間が逆算して書く。
