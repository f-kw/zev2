# Gemini visual check summary: r_ztjHaHmcg multicut candidate

## 入力

- 切り抜き: `r_ztjHaHmcg` / 同接100人いたら食べていけるの？
- 元動画候補: `-DwSCDMCWDQ`
- 音声/STT照合: `evals/clip_composition/outputs/audio-compare-chunks-r_ztjHaHmcg_youtube_auto_v001.json`
- 複数区間候補: `evals/clip_composition/outputs/multicut-expected-candidate-r_ztjHaHmcg-20260705-v001.json`
- 左右比較動画: `evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/`

## 実行内容

Web版Gemini Flashで、切り抜き側と元動画候補側を横並びにした4本の比較動画を確認した。プロンプトでは、切り抜き箇所を選ばせず、アップロードした左右比較動画だけを見て同じ元場面か判断させた。

Gemini Web UIでは温度などの詳細パラメータは表示されないため、モデル設定は `Gemini Web Flash` と `temperature: not exposed by Gemini Web UI` として記録した。

## 結果

| チャンク | 切り抜き側 | 元動画側 | Gemini判定 | 備考 |
| --- | ---: | ---: | --- | --- |
| 1 | 0:02.555-0:32.555 | 36:19.930-36:49.930 | confirmed | 同接100人とPUBG時期の話が一致 |
| 2 | 0:32.555-1:02.555 | 38:29.360-38:59.360 | confirmed | 応答の番号だけずれたが、時刻範囲は一致 |
| 3 | 1:02.555-1:32.555 | 39:21.159-39:51.159 | confirmed | 同接数、登録者数、収益の話が一致 |
| 4 | 1:32.555-2:01.147 | 40:04.730-40:33.322 | confirmed | YouTube収益単価の話が一致 |

## 判断

4チャンクすべてで、Geminiは切り抜き側と元動画候補側を同じ元場面として確認した。音声/STT照合の候補は、映像比較でも支持された。

ただし元動画側には、チャンク間に 99.430秒、21.799秒、13.571秒の空白がある。したがって、この切り抜きは元配信の単一連続区間ではなく、4つの区間を飛び飛びにつないだ複数区間候補として扱う。

## expectedCuts化

- 単一の連続区間としては固定しない。
- Gemini確認上は、4つの複数区間expected候補として扱える。
- ただし、初回正解データは人間の目視確認を1回挟む方針なので、まだexpectedCutsには固定しない。

人間が見るべき差分は、`evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/` 以下の4本の左右比較動画。ここで「確かに切り抜きの元ネタ」と確認できれば、複数区間expectedとして凍結できる。

## 本体影響

- `runtime/` への書き込みなし
- 本番UIへの変更なし
- 本番APIへの変更なし
- 本番キューへの接続なし
- DBへの保存なし
