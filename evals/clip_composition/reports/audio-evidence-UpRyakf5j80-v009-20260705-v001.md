# UpRyakf5j80 v009 音声比較確認

- 入力fixture: UpRyakf5j80_clip_audio_v001
- 使用プロンプト版数: clip_composition_prompt_v009
- 使用モデル名: gemini-web-flash
- 結果JSON: `evals/clip_composition/outputs/audio-evidence-UpRyakf5j80-v009-20260705-v001.json`

## 結論

比較まではできている。音声比較上、この切り抜きの元ネタは `kNX-wQTvsws` の `11364500ms - 11407178ms` と見てよい。

v009が選んだ区間は `11364140ms - 11409170ms` なので、音声確認済みの元ネタ区間を含んでいる。ただし終了が `1992ms` 後ろへ長い。つまり「別の箇所を選んだ」失敗ではなく、「同じ切り抜き箇所の終端を後ろへ取りすぎた」失敗として扱う。

## 音声比較で見ていること

- 切り抜き音声: `evals/clip_composition/research/downloads/UpRyakf5j80/UpRyakf5j80.m4a`
- 元動画候補音声: `evals/clip_composition/research/downloads/UpRyakf5j80/sources/kNX-wQTvsws/kNX-wQTvsws_3h09m17s_55s_audio.m4a`
- 比較範囲: 元動画側55秒候補
- 比較方法: 切り抜き全体の音量包絡を、元動画候補範囲の中で走査
- 音声が最も寄った範囲: `11364500ms - 11407178ms`
- 音量包絡相関: `0.974592`
- 既存レポート: `evals/clip_composition/reports/audio-compare-chunks-UpRyakf5j80_youtube_auto_source_slice_full_window_v001.md`

生波形の直接相関は `-0.259884` だが、BGM、圧縮、切り抜き編集差分の影響を受けるため、この確認では音量包絡とWeb版Geminiの映像確認を優先している。

## v009との差分

- v009の選択: `11364140ms - 11409170ms`
- 音声確認済み区間: `11364500ms - 11407178ms`
- 開始位置の差: `-360ms`
- 終了位置の差: `+1992ms`
- 長さの差: `+2352ms`

開始はほぼ同じ。問題は終端で、v009は「うん」の終わりまで含めている。一方、音声確認済みの切り抜き終端は、その次の字幕開始に近い位置で止まっている。

## STTサーバ確認

ローカルSTTサーバ `http://192.168.1.8:8000` への確認は実行したが、このCodex環境からは到達できなかった。

- `GET /openapi.json`: 10秒でタイムアウト
- `GET /`: `Host is down`
- `GET /docs`: `Host is down`
- 音声送信: 未実行

そのため、このレポートは新規STTではなく、保存済みの音声比較結果とv009採点結果の突き合わせで作っている。

## 暫定判定

- theme側の問題: 低い。正解区間は固定テーマの候補範囲に入っている。
- composition側の問題: 高い。候補範囲から最終区間を選ぶとき、終端を音声確認済みの切り抜き終端より後ろへ伸ばしている。

次に触るなら、themesではなくcomposition。追加fixtureがない状態でv010へ進めるより、同じ「同一箇所だが終端がずれる」型の2件目を作ってから、終端規則を直すほうが安全。
