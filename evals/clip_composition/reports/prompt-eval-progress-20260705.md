# clip_composition 評価進捗 2026-07-05

## 現在できること

- 実在切り抜きから逆引きした期待区間を使って、compositionプロンプトの出力を採点できる。
- `UpRyakf5j80_clip_audio_v001` では、切り抜き音声42.678秒が元動画55秒スライス内の7.500秒位置に強く寄ることを音声比較で確認した。
- 元動画の絶対時刻では `3:09:24.500 - 3:10:07.178` が期待区間になる。
- 期待区間から逆算した固定テーマを使っているため、theme生成の失敗とcomposition選択の失敗を分けて見られる。

## 最新の音声比較

- 入力: `UpRyakf5j80` の切り抜き音声と、元動画 `kNX-wQTvsws` の `3:09:17` 付近から切り出した55秒音声
- 出力JSON: `evals/clip_composition/outputs/audio-compare-chunks-UpRyakf5j80_audio_confirmed_20260705_v002.json`
- 人間向けレポート: `evals/clip_composition/reports/audio-compare-chunks-UpRyakf5j80_audio_confirmed_20260705_v002.md`
- 音声が最も寄った範囲: 元動画スライス内 `0:07.500 - 0:50.178`
- 元動画絶対時刻: `3:09:24.500 - 3:10:07.178`
- 音量包絡の最大相関: `0.974592`
- 生波形の直接相関: `-0.259884`
- 判断: BGM、圧縮、字幕付き切り抜き編集の影響を受ける生波形一致ではなく、音量包絡、字幕照合、Web版Geminiの左右映像確認を合わせて、同一元ネタ区間として扱う。

しきい値による自動確定はしていない。結果は、候補区間を人間が確認するための比較材料として記録している。

## プロンプトv006の比較結果

| fixture | モデル | LLMが選んだ区間 | 期待区間 | 開始ずれ | 終了ずれ | 判定 |
| --- | --- | --- | --- | ---: | ---: | --- |
| `IMQYaT_RWRA_context_v001` | `gemini-web-flash` | `1997050 - 2015672` | `1997050 - 2015672` | `0ms` | `0ms` | 一致 |
| `UpRyakf5j80_clip_audio_v001` | `gemini-web-flash` | `11364140 - 11404850` | `11364500 - 11407178` | `-360ms` | `-2328ms` | 終端が短い |

`UpRyakf5j80_clip_audio_v001` では、theme側の候補範囲 `11362439 - 11409170` に期待区間が入っている。したがって、現時点の差分はtheme側で正解区間が候補に入っていない問題ではなく、composition側で最後の短い結論部分をどこまで含めるかの問題として読む。

## 実行したコマンド

```sh
runner/node_modules/.bin/tsx evals/clip_composition/compare_aligned_audio_chunks.ts \
  --alignment evals/clip_composition/outputs/alignment-UpRyakf5j80_youtube_auto_source_slice_full_window_v001.json \
  --clipVideo evals/clip_composition/research/downloads/UpRyakf5j80/UpRyakf5j80.m4a \
  --sourceVideo evals/clip_composition/research/downloads/UpRyakf5j80/sources/kNX-wQTvsws/kNX-wQTvsws_3h09m17s_55s_audio.m4a \
  --sourceId UpRyakf5j80_kNX-wQTvsws_youtube_auto \
  --outputId UpRyakf5j80_audio_confirmed_20260705_v002
```

出力:

```text
result: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/audio-compare-chunks-UpRyakf5j80_audio_confirmed_20260705_v002.json
report: /Users/kawafmm/workspace/zev2/evals/clip_composition/reports/audio-compare-chunks-UpRyakf5j80_audio_confirmed_20260705_v002.md
chunk 1: 0:07.500-0:50.178 text=0% envelope=0.974592 direct=-0.259884
```

## STTの状態

`http://192.168.1.8:8000/openapi.json` は、この実行では接続拒否だった。今回の確認ではローカルSTTを使わず、既存のYouTube自動字幕変換結果と保存済み音声を使った。

次にSTTサーバーへ接続できたら、同じ `UpRyakf5j80` の切り抜き側と元動画側をローカルSTTで置き換え、YouTube自動字幕由来の文字誤差を減らす。

## 次に触るべきところ

次はcompositionを触る。themeは期待区間から逆算した固定入力なので、今回のfixtureでは正解候補を外していない。v007では、最後の短い反復結論や相槌が切り抜き側の音声に残っている場合、単なる次トピック移行として落としすぎない指示を検証する。

## v007の追加確認

- 追加プロンプト: `evals/clip_composition/prompts/clip_composition_prompt_v007.md`
- `IMQYaT_RWRA_context_v001` 用のv007入力生成: 完了
- `UpRyakf5j80_clip_audio_v001` 用のv007入力生成: 完了
- Web版Gemini Flash実行: `UpRyakf5j80_clip_audio_v001` のみ完了
- Web版Gemini Flash出力: `evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v007/20260705-185128/gemini-web-flash-output.json`
- 採点結果JSON: `evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v007/20260705-203219/result.json`
- 採点summary: `evals/clip_composition/reports/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v007/20260705-203219/summary.md`

v007は `UpRyakf5j80_clip_audio_v001` で発話19まで含めた。選択区間は `11364140 - 11405460`、期待区間は `11364500 - 11407178`。開始は `-360ms`、終了は `-1718ms` ずれている。v006と比べると終端は `610ms` 後ろへ伸びたが、音声比較で確認した切り抜き末尾まではまだ届いていない。

`tsx` 実行はサンドボックス内の一時IPC作成で止まったが、Node標準のTypeScriptストリップ実行で `score_prompt_output.ts` を動かし、正式な `result.json` と `summary.md` を生成できた。

## v008の準備

- 追加プロンプト: `evals/clip_composition/prompts/clip_composition_prompt_v008.md`
- `IMQYaT_RWRA_context_v001` 用のv008入力生成: 完了
- `UpRyakf5j80_clip_audio_v001` 用のv008入力生成: 完了
- v008の狙い: 結論の言い直し直後に短い相づちだけが続き、新しい人物、質問、出来事、相談内容が出てこない場合は、切り抜き音声の自然な締めとして含める。
- Web版Gemini Flash実行: 2fixtureとも完了
- 比較レポート: `evals/clip_composition/reports/prompt-v006-v008-boundary-comparison-20260705.md`

v008は `IMQYaT_RWRA_context_v001` では期待区間と完全一致した。`UpRyakf5j80_clip_audio_v001` では発話20の短い相づちまで含め、期待区間を包含したが、終了位置が `+1992ms` 長くなった。これにより、次の問題は「短い相づちを含めるかどうか」ではなく、「発話20の途中にある音声上の終端を、文字起こし入力だけでどう扱うか」へ移った。

次はプロンプトへ秒数補正を入れず、ローカルSTTまたは音声比較で終端側の短い相づちをより細かい境界として入力に持たせる方がよい。

## 境界粒度の確認

- 境界粒度スクリプト: `evals/clip_composition/analyze_boundary_granularity.ts`
- 結果JSON: `evals/clip_composition/outputs/boundary-granularity-20260705-v001.json`
- レポート: `evals/clip_composition/reports/boundary-granularity-20260705-v001.md`
- STTサーバー疎通: `http://192.168.1.8:8000/openapi.json` は接続拒否。文字起こし実行はしていない。

`IMQYaT_RWRA_context_v001` は期待開始が発話1の開始、期待終了が発話32の終了と一致する。`UpRyakf5j80_clip_audio_v001` は期待開始と期待終了がどちらも発話途中にある。特に期待終了は発話20開始から `1718ms` 後、発話20終了の `1992ms` 前にある。したがって、v009でさらにプロンプトだけを調整する前に、ローカルSTTまたは音声境界で発話途中の境界を入力に持たせる必要がある。

## result.json 横断比較

- 比較スクリプト: `evals/clip_composition/compare_prompt_results.ts`
- 比較結果JSON: `evals/clip_composition/outputs/prompt-result-comparison-20260705-v006-v008.json`
- 比較レポート: `evals/clip_composition/reports/prompt-result-comparison-20260705-v006-v008.md`

指定した `result.json` だけを読む形にした。これにより、同じprompt版数の複数runが残っていても、どのrunを比較したかが固定される。自動の合成スコアは作らず、開始差分、終了差分、重なりの説明をそのまま並べる。

## 境界精度用STT作業リスト

- 作業リスト生成スクリプト: `evals/clip_composition/plan_boundary_stt_jobs.ts`
- 結果JSON: `evals/clip_composition/outputs/boundary-stt-jobs-20260705-v001.json`
- レポート: `evals/clip_composition/reports/boundary-stt-jobs-20260705-v001.md`

`UpRyakf5j80_clip_audio_v001` は、短い相づちの終端だけでなく開始側も発話途中にある。STT復旧後は、切り抜き音声 `UpRyakf5j80.m4a` と元動画55秒スライス `kNX-wQTvsws_3h09m17s_55s_audio.m4a` だけを最小STT対象として、単語境界または音声境界を得る。期待境界そのものはモデル入力へ直接渡さない。
