# clip_composition 評価環境 v001

このディレクトリは、切り抜き区間選択のプロンプト改善を小さく比較するための評価環境です。本番UI、API、キュー、DB、承認ゲートには接続しません。

## 現在の調査結果

- テーマ作成相当の現在の処理は、`runner/src/steps/theme-options.ts` のルール処理です。
- 編集元場面作成相当の現在の処理は、`runner/src/steps/composition.ts` のルール処理です。
- 現在の編集元場面作成処理はLLM APIを呼びません。
- fixtureの `themes.json` は過去実行のGemini応答から作られたデータですが、評価実行時は固定入力として扱います。
- そのため、この初期版では新規LLM呼び出しを実装していません。

## 入力と出力

入力は `fixtures/<fixtureId>/` の固定ファイルです。`runtime/artifacts/` は評価実行時に読みません。

- `fixture.json`: 評価対象の固定入力を説明するメタデータ
- `transcript.json`: 発話IDと時刻を持つ文字起こし
- `themes.json`: 固定済みテーマ候補
- `clip-composition.baseline.json`: 過去実行の編集元場面
- `expected/<fixtureId>.json`: 人間が妥当と判断した期待区間

出力は評価実行ごとに以下へ書きます。

- `outputs/<fixtureId>/<promptVersion>/<runId>/result.json`
- `reports/<fixtureId>/<promptVersion>/<runId>/summary.md`

## STT後のfixture化

バズった切り抜きから新しいfixtureを作る場合は、`STT_ALIGNMENT_PLAN.md` の手順に従います。

- 切り抜き側STTはBGM、SE、追加音声で認識率が落ちる前提で扱います。
- 元動画側STTは単語レベルのタイムスタンプ付きで出します。
- 照合は切り抜き全体ではなく、約30秒チャンク単位で行います。
- 照合前に、ひらがな化、数字表記統一、全角半角統一などの正規化を行います。
- 切り抜きが複数元動画をまたぐ可能性を正常系として扱います。
- STT照合候補に対して、切り抜き全体と発話部分を分けた音声比較を行います。
- `expectedCuts` は照合結果や発話一致区間だけで作らず、実在の切り抜き動画全体に対応する元動画区間を記録します。
- 発話一致区間は元ネタ照合の証拠としてメタデータに残し、期待区間そのものにはしません。
- 固定テーマは現行システムに生成させず、実在切り抜きの内容から人間が逆算して書きます。境界指定はテーマ文に混ぜません。

ローカルSTTの評価用保存スクリプト:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/run_local_stt.ts --input ../evals/clip_composition/research/downloads/IMQYaT_RWRA/IMQYaT_RWRA.mp4 --id IMQYaT_RWRA --role clip
```

実行前確認だけを行い、STTサーバーを呼ばない場合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/run_local_stt.ts --input ../evals/clip_composition/research/downloads/IMQYaT_RWRA/IMQYaT_RWRA.mp4 --id IMQYaT_RWRA --role clip --dry-run
```

このスクリプトは生のSTT応答、runner互換の発話単位文字起こし、単語タイムスタンプ抽出結果を `evals/clip_composition/stt/<id>/<role>/` に保存します。単語タイムスタンプがSTT応答に含まれない場合は、その事実をmanifestに記録します。

STTサーバー接続先は、優先順に `--server`、`ZEV2_STT_SERVER_URL`、`ZEV_STT_SERVER_URL`、`config/runtime.jsonc` の `stt.localServerUrl` を使います。

長尺元動画を1本でSTTサーバーへ送れない場合は、評価用の分割STTスクリプトを使います。

```bash
runner/node_modules/.bin/tsx evals/clip_composition/run_local_stt_chunked.ts \
  --input evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4 \
  --id r_ztjHaHmcg_-DwSCDMCWDQ \
  --role source \
  --server http://192.168.1.8:8000 \
  --chunkSec 600 \
  --timeoutMs 1800000
```

このスクリプトは、分割済みチャンクのSTT応答がある場合は再利用し、未完了チャンクから続けられるようにしています。

STT後のチャンク照合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/align_stt_chunks.ts \
  --clipId IMQYaT_RWRA \
  --sourceId IMQYaT_RWRA_8uuQldLptRE \
  --sourceId IMQYaT_RWRA_LBBRk8blLV0 \
  --sourceId IMQYaT_RWRA_Rfsj5uHy_Bs \
  --chunkSec 30 \
  --top 10 \
  --outputId IMQYaT_RWRA_v001
```

この照合は、切り抜き側を約30秒チャンクに分け、各チャンクを参照元候補それぞれの全域に対して探索します。結果は `outputs/alignment-<outputId>.json` と `reports/alignment-<outputId>.md` に保存します。

現時点の照合スクリプトは、全角半角統一、カタカナのひらがな化、Unicode正規化による数字表記統一、記号・空白・長音記号の除外を行います。漢字の読み変換は未実装です。

第一候補 `IMQYaT_RWRA` の実行済み出力:

- 照合JSON: `outputs/alignment-IMQYaT_RWRA_v001.json`
- 照合レポート: `reports/alignment-IMQYaT_RWRA_v001.md`
- 目視確認用クリップ:
  - `outputs/visual-check/IMQYaT_RWRA/source_8uuQldLptRE_33m12s_22s.mp4`
  - `outputs/visual-check/IMQYaT_RWRA/source_Rfsj5uHy_Bs_2m28s_22s.mp4`

照合結果だけでは `expectedCuts` として固定しません。音声比較で元動画候補との対応が強く出た発話区間は、期待区間を決める証拠として扱います。最終的な期待区間は、実在切り抜きの開始から終了までを元動画側へ対応させ、元動画の該当秒数を目視と聴取で確認してから記録します。

STT照合候補の音声比較:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/compare_audio_candidates.ts \
  --target ../evals/clip_composition/stt-targets/IMQYaT_RWRA.json \
  --alignment ../evals/clip_composition/outputs/alignment-IMQYaT_RWRA_v001.json \
  --outputId IMQYaT_RWRA_v001
```

この比較は、切り抜き全体と発話部分を分けて、STT候補区間の音声と比較します。直接波形はBGMやSEで崩れやすいため、RMS包絡の相関も併記します。しきい値で自動確定せず、候補同士の相対比較として読みます。

第一候補 `IMQYaT_RWRA` の音声比較済み出力:

- 音声比較JSON: `outputs/audio-compare-IMQYaT_RWRA_v001.json`
- 音声比較レポート: `reports/audio-compare-IMQYaT_RWRA_v001.md`
- 音声比較では、元配信候補 `8uuQldLptRE` の発話部分が最も強く一致しました。
- 切り抜き発話 `0:01.313 - 0:05.338` は、元配信候補 `33:22.113 - 33:26.138` 付近に対応する可能性が高いです。

第二候補 `r_ztjHaHmcg` の進捗:

- 切り抜き動画: `research/downloads/r_ztjHaHmcg/r_ztjHaHmcg.mp4`
- 元動画候補: `research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4`
- STT対象定義: `stt-targets/r_ztjHaHmcg.json`
- 切り抜き側STT: `stt/r_ztjHaHmcg/clip/transcript.json`
- 進捗レポート: `reports/stt-progress-r_ztjHaHmcg_v001.md`
- 音声粗スキャン: `reports/audio-scan-r_ztjHaHmcg_v001.md`
- 粗スキャン最上位: 元動画 `-DwSCDMCWDQ` の `11:37.000 - 13:35.500`
- 確認動画: `outputs/visual-check/r_ztjHaHmcg/gemini_pair_audio_scan_v001_r_ztjHaHmcg_vs_-DwSCDMCWDQ_11m34s.mp4`
- 現在の停止理由: ローカルSTTサーバー `http://192.168.1.8:8000` がタイムアウトしているため、元動画側STTは未完了です。

音声比較済み区間からfixture候補を凍結する:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/freeze_verified_fixture.ts \
  --fixture IMQYaT_RWRA_audio_v001 \
  --target ../evals/clip_composition/stt-targets/IMQYaT_RWRA.json \
  --sourceSttId IMQYaT_RWRA_8uuQldLptRE \
  --sourceStartMs 1998363 \
  --sourceEndMs 2006530
```

生成済みfixture候補:

- `fixtures/IMQYaT_RWRA_audio_v001/fixture.json`
- `fixtures/IMQYaT_RWRA_audio_v001/transcript.json`
- `fixtures/IMQYaT_RWRA_audio_v001/themes.json`
- `expected/IMQYaT_RWRA_audio_v001.json`

このfixtureは、音声比較で確認した元配信候補 `8uuQldLptRE` の `33:18.363 - 33:26.530` を発話一致区間として切り出した確認用fixtureです。切り抜き発話と最も強く合った音声の芯は `33:22.113 - 33:26.138` です。実在切り抜きへの一致を測る主評価では、この発話一致区間を期待値にせず、切り抜き動画全体に対応する区間を使います。

このfixtureで3回実行した評価結果:

- `outputs/IMQYaT_RWRA_audio_v001/clip_composition_prompt_v001/20260705-123725/result.json`
- `reports/IMQYaT_RWRA_audio_v001/clip_composition_prompt_v001/20260705-123725/summary.md`
- 現在のrule-based compositionでは、3回とも `1998363ms - 2006530ms` を選び、開始・終了の揺れは0msです。

候補窓付きfixtureを作る場合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/freeze_context_fixture.ts \
  --fixture IMQYaT_RWRA_context_v001 \
  --target ../evals/clip_composition/stt-targets/IMQYaT_RWRA.json \
  --sourceSttId IMQYaT_RWRA_8uuQldLptRE
```

このfixtureは、音声比較結果とWeb版Gemini確認で「切り抜き全体に対応する元配信側区間」と判定した範囲を期待区間にします。第一候補では、期待区間が `1997050ms - 2015672ms` です。切り抜き発話部分に対応する `1998363ms - 2006530ms` は、期待値ではなく元ネタ照合の証拠メタデータとして保持します。

このfixtureは、compositionが実在切り抜きの選択に近い区間を選べるかを見るためのものです。発話の芯だけを選べるかを見るためのfixtureではありません。

候補窓付きfixtureの評価結果:

- `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-124545/result.json`
- `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-124545/summary.md`
- 旧期待値では、現在のrule-based compositionが候補窓全体を選ぶため、発話一致区間に対して開始位置は `-1313ms`、終了位置は `+9142ms` ずれていました。
- 現在の正解定義では、候補窓全体が実在切り抜き全体に対応するため、このズレは評価目的の誤定義として扱います。

実際の切り抜き動画全体の対応区間を期待値にしたfixture:

- `fixtures/IMQYaT_RWRA_clip_audio_v001/fixture.json`
- `expected/IMQYaT_RWRA_clip_audio_v001.json`
- 期待区間: `1997050ms - 2015672ms`
- 確認状態: `audio_anchor_confirmed_visual_confirmed`

このfixtureでは、切り抜き発話部分と元配信候補区間の音量包絡比較で元配信候補を確認し、切り抜き全体18.622秒を発話開始位置へ合わせて元配信側の対応区間を置きます。BGMやSEが重なるため、切り抜き全体の波形相関だけで境界を確定しません。

同じ種類のfixtureを音声比較結果から生成する場合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/freeze_clip_audio_fixture.ts \
  --fixture IMQYaT_RWRA_clip_audio_v001 \
  --target ../evals/clip_composition/stt-targets/IMQYaT_RWRA.json \
  --sourceSttId IMQYaT_RWRA_8uuQldLptRE
```

書き込みなしで区間だけ確認する場合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/freeze_clip_audio_fixture.ts \
  --fixture IMQYaT_RWRA_clip_audio_v001_dry_run \
  --target ../evals/clip_composition/stt-targets/IMQYaT_RWRA.json \
  --sourceSttId IMQYaT_RWRA_8uuQldLptRE \
  --dry-run
```

目視・聴取またはWeb版Geminiで元配信箇所を確認した後、期待値へ確認結果を反映する場合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/apply_visual_verification.ts \
  --fixture IMQYaT_RWRA_clip_audio_v001 \
  --status confirmed \
  --checkedBy gemini-web \
  --reportPath evals/clip_composition/reports/gemini-visual-check-IMQYaT_RWRA_v001.md \
  --sourceStartMs 1997050 \
  --sourceEndMs 2015672 \
  --note "確認結果の要約をここに書く"
```

書き込みなしで反映内容だけ確認する場合は、同じコマンドに `--dry-run` を付けます。`confirmed` の場合、確認状態は `audio_anchor_confirmed_visual_pending` から `audio_anchor_confirmed_visual_confirmed` のように機械的に更新されます。

LLM呼び出しを入れずにプロンプト入力だけを生成する場合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/build_prompt_payload.ts \
  --fixture IMQYaT_RWRA_context_v001 \
  --promptVersion v001
```

生成済みプロンプト入力:

- `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-124629/prompt-input.json`
- `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-124629/prompt.md`
- `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-124629/prompt-input-summary.md`

このプロンプト入力は、期待区間、評価結果、代表発話本文、代表発話IDをモデル入力へ入れません。期待区間は採点用データとしてだけ分離して記録します。

外部LLMやWebで得た `selectedCuts` JSONを採点する場合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/score_prompt_output.ts \
  --fixture IMQYaT_RWRA_context_v001 \
  --promptVersion v001 \
  --input ../evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-124545/result.json \
  --model rule-output-smoke \
  --params '{"temperature":0,"source":"run_eval_result"}'
```

`--input` には、最低限次の形のJSONを渡します。

```json
{
  "selectedCuts": [
    {
      "sourceStartMs": 1997050,
      "sourceEndMs": 2015672,
      "reason": "選んだ理由"
    }
  ]
}
```

生成済み採点結果:

- `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-125215/result.json`
- `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-125215/summary.md`

この採点はLLM APIを呼ばず、保存済みJSONだけを読みます。モデル名とパラメータは結果に記録します。

Web版Geminiで同じプロンプトを実行し、返ってきた `selectedCuts` JSONを採点した結果:

- Gemini出力JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-125714/gemini-web-flash-output.json`
- 再採点結果JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-153614/result.json`
- 再採点サマリー: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-153614/summary.md`
- 結果: Geminiは実在切り抜き全体に対応する `1997050ms - 2015672ms` を選び、開始・終了ともに0ms差で一致しました。
- 暫定判定: 旧期待値では「候補窓全体を選びすぎ」と見えていましたが、実在切り抜き全体を正解に戻すと妥当な選択です。

compositionプロンプトv002で、冒頭の短い断片を外す指示を強めてWeb版Geminiで採点した結果:

- プロンプト本文: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v002/20260705-131730/prompt.md`
- Gemini出力JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v002/20260705-131730/gemini-web-flash-output.json`
- 再採点結果JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v002/20260705-153617/result.json`
- 再採点サマリー: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v002/20260705-153617/summary.md`
- 結果: Geminiは `1997803ms - 2015672ms` を選びました。開始位置は実在切り抜き全体に対して `+753ms`、終了位置は `0ms` です。
- 暫定判定: 終端の笑いと余韻は保持できています。開始側を削りすぎて、切り抜き師が残したフリの頭を一部落としています。

compositionプロンプトv003からv006で、笑い声と余韻の扱いを分けてWeb版Geminiで採点した結果:

- v003:
  - プロンプト本文: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v003/20260705-132659/prompt.md`
  - Gemini出力JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v003/20260705-132659/gemini-web-flash-output.json`
  - 再採点結果JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v003/20260705-153616/result.json`
  - 再採点サマリー: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v003/20260705-153616/summary.md`
  - 結果: Geminiは `1997050ms - 2015672ms` を選びました。開始・終了ともに0ms差で一致しました。
  - 読み取り: 笑い声と余韻を切り抜きの一部として扱った判断は、実在切り抜き全体の正解定義では妥当です。
- v004:
  - プロンプト本文: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v004/20260705-132945/prompt.md`
  - Gemini出力JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v004/20260705-132945/gemini-web-flash-output.json`
  - 再採点結果JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v004/20260705-153614/result.json`
  - 再採点サマリー: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v004/20260705-153614/summary.md`
  - 結果: Geminiは `1997050ms - 2006530ms` を選びました。開始位置は `0ms`、終了位置は `-9142ms` です。
  - 読み取り: 末尾の笑い声と余韻を削りすぎています。実在切り抜きへの一致評価では悪化です。
- v005:
  - プロンプト本文: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v005/20260705-133208/prompt.md`
  - Gemini出力JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v005/20260705-133208/gemini-web-flash-output.json`
  - 再採点結果JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v005/20260705-153614/result.json`
  - 再採点サマリー: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v005/20260705-153614/summary.md`
  - 結果: Geminiは `1999464ms - 2006530ms` を選びました。開始位置は `+2414ms`、終了位置は `-9142ms` です。
  - 読み取り: 開始側のフリと終端側の余韻を両方削りすぎています。発話の芯だけを正解に寄せる過補正でした。
- v006:
  - プロンプト本文: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v006/20260705-153350/prompt.md`
  - Gemini出力JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v006/20260705-153350/gemini-web-flash-output.json`
  - 採点結果JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v006/20260705-153541/result.json`
  - 採点サマリー: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v006/20260705-153541/summary.md`
  - 再確認採点結果JSON: `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v006/20260705-174546/result.json`
  - 再確認採点サマリー: `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v006/20260705-174546/summary.md`
  - 結果: Geminiは `1997050ms - 2015672ms` を選びました。開始・終了ともに0ms差で一致しました。
  - 読み取り: テーマを内容記述に戻し、プロンプト側で終端を反応の収束まで含める規則を明示したことで、実在切り抜き全体に一致しました。

この比較から、現在の課題は次のように整理します。

- 期待区間は、音声比較とWeb版Gemini確認済みの切り抜き全体対応区間 `1997050ms - 2015672ms` とします。
- 発話一致区間 `1998363ms - 2006530ms` は元ネタ照合の証拠であり、期待区間そのものではありません。
- テーマ文は「何の場面か」を示す内容記述に留め、境界判断はcompositionプロンプトと将来の非発話シグナル入力で扱います。

短期的には、プロンプトに「終端は発話終了ではなく、反応や余韻の収束まで含める」境界規則を入れます。中期的には、文字起こしへ笑い声、音量変化、無音、SEなどの非発話シグナルを注記として埋め込み、STTテキストだけでは見えない余韻判断を入力側で支えます。

同じGemini出力を、実際の切り抜き動画全体の対応区間fixtureで採点した結果:

- プロンプト入力: `outputs/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-130216/prompt-input.json`
- プロンプト本文: `reports/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-130216/prompt.md`
- 採点結果JSON: `outputs/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-130227/result.json`
- 採点サマリー: `reports/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-130227/summary.md`
- 結果: Geminiの選択区間は、音声アンカーで置いた切り抜き動画全体の期待区間と開始・終了ともに0ms差で一致しました。
- 暫定判定: 本当に切り抜き箇所かを見る評価では一致。発話の芯だけへ絞る評価とは別に扱います。

Web版Geminiで確認動画を見せて、切り抜き動画全体の元配信対応区間を目視確認した結果:

- 確認依頼: `reports/gemini-visual-check-IMQYaT_RWRA_clip_audio_v001.md`
- 確認動画: `outputs/visual-check/IMQYaT_RWRA/gemini_pair_clip_audio_v001_IMQYaT_RWRA_vs_8uuQldLptRE_33m17s_full.mp4`
- Gemini確認結果: `outputs/IMQYaT_RWRA_clip_audio_v001/visual_verification/20260705-131357-gemini-web-flash.json`
- expected反映先: `expected/IMQYaT_RWRA_clip_audio_v001.json`
- 確認状態: `audio_anchor_confirmed_visual_confirmed`
- 再採点結果JSON: `outputs/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-131440/result.json`
- 再採点サマリー: `reports/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-131440/summary.md`
- 結果: Web版Geminiは `33:17.050 - 33:35.672` をA全体の元ネタ区間として `confirmed` と判定し、保存済みGemini選択区間も開始・終了ともに0ms差で一致しました。

## 実行方法

指定されていた実行形:

```bash
pnpm tsx evals/clip_composition/run_eval.ts --fixture draft_w4Lp9IJC6pQl3FsRfFL9t --promptVersion v001
```

ただし、現状のワークスペースではrootに `tsx` 実行ファイルがないため、package.jsonを変更しない確認コマンドは runner パッケージの既存依存を使う形になります。

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/run_eval.ts --fixture draft_w4Lp9IJC6pQl3FsRfFL9t --promptVersion v001
```

同じ入力、同じ設定で3回実行して揺れ幅を見る場合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/run_eval.ts --fixture draft_w4Lp9IJC6pQl3FsRfFL9t --promptVersion v001 --runs 3
```

## 既存処理の隠れた依存

テーマ作成相当の処理:

- 入力: 文字起こし成果物、実行命令の動画参照、目的、テーマ候補数
- 設定: `ZEV2_CONTENT_DISCOVERY_MODE` 相当の `fixed` または `transcript`
- 固定入力: `fixed` の場合は `runtime/artifacts/draft_w4Lp9IJC6pQl3FsRfFL9t/themes.json` を読む構成
- 依存処理: 発話IDの正規化、発話本文の結合、発話範囲の取得、パス安全化
- API呼び出し: 現在のソースコード上はなし

編集元場面作成相当の処理:

- 入力: 固定済みテーマ候補、文字起こし成果物、選ばれたテーマID、編集元場面の探し直し指示
- 設定: 直接の外部設定はなし
- 依存処理: 承認済みテーマ選択の状態、発話ID検索、発話まとまり、発話本文の結合、発話時刻の取得
- API呼び出し: なし

`runner/src/steps/` の対象処理は、編集元場面作成の内部処理を export することで単体呼び出しできるようにしています。状態から選ばれたテーマを探す外側の関数は、承認履歴と人間の選択結果に依存します。
