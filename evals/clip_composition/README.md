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

## 測定対象の生成系統

区間を実際に生成した処理を、採点結果の `generationSystem` に必ず記録します。

- `baseline-rule`: 現行のルール処理が、固定済みテーマに対応する発話まとまりから区間を作った結果。プロンプト版数の概念はありません。
- `llm-vNNN`: Web Geminiに `clip_composition_prompt_vNNN` と固定入力を渡し、返ってきた区間を採点した結果。
- `other-*`: 過去の確認用外部JSON採点など、上記2系統ではない結果。正式なプロンプト比較基準にはしません。

プロンプト版ごとの目的、作成経緯、採点結果、状態は `prompts/README.md` に記録します。

過去の `result.json` には `generationSystem` が無いものがあります。その場合は、比較レポート側でモデル名、外部入力ファイル、LLM呼び出し有無の記録から推定し、`legacy inferred` と表示します。

今後の `result.json` は最低限、次の形で生成系統を持ちます。

```json
{
  "promptVersion": "baseline-rule",
  "generationSystem": {
    "id": "baseline-rule",
    "kind": "baseline-rule",
    "intervalGenerator": "runner.buildClipComposition",
    "promptVersion": null,
    "usesPromptVersionForGeneration": false
  }
}
```

LLM系では次の形です。

```json
{
  "promptVersion": "clip_composition_prompt_v006",
  "generationSystem": {
    "id": "llm-v006",
    "kind": "llm",
    "intervalGenerator": "web-gemini+prompt",
    "promptVersion": "clip_composition_prompt_v006",
    "usesPromptVersionForGeneration": true
  }
}
```

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

STT照合候補には、共通の時間軸整合検査として「単語タイムスタンプ対応が線形に続いた最長区間の長さ/対象区間の長さ」を記録します。テキスト一致度が高くても、この整合率が低い候補はexpectedCutsとして固定しません。

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
- チャンク照合: `outputs/alignment-r_ztjHaHmcg_youtube_auto_v001.json`
- チャンク音声比較: `outputs/audio-compare-chunks-r_ztjHaHmcg_youtube_auto_v001.json`
- 複数区間候補: `outputs/multicut-expected-candidate-r_ztjHaHmcg-20260705-v001.json`
- 左右比較動画一覧: `outputs/multicut-visual-checks-r_ztjHaHmcg-20260705-v001.json`
- Web版Gemini確認サマリー: `reports/gemini-visual-check-r_ztjHaHmcg-multicut-summary-v001.md`
- 人間確認パケット: `reports/multicut-expected-review-r_ztjHaHmcg-20260705-v001.md`
- 人間確認結果: `outputs/multicut-human-decision-r_ztjHaHmcg_multicut_review_v001-20260705-needs-cutpoint-v001.json`
- 静止画確認パッケージ: `reports/multicut-still-check-r_ztjHaHmcg-20260705-needs-cutpoint-v001.md`

この候補は、元動画側に `99.430秒`、`21.799秒`、`13.571秒` の空白があるため、単一の連続区間としては固定しません。Web版Geminiは4つのチャンクを同じ元場面として確認しましたが、人間の目視ではchunk2とchunk3が途中から一致し、chunk1も最初だけ一致する状態でした。固定幅30秒チャンクの時間軸整合率もchunk1からchunk3は約52-58%、chunk4は約98%で、固定幅30秒チャンクの途中に未検出の繋ぎ目がある可能性が高いため、この候補は `expected/` に固定せず、切り抜き側のカット点または音声不連続点を検出したうえで再照合します。

固定30秒チャンクを使わず、音声不連続候補と映像シーンチェンジ候補から切り抜き側を可変長セグメントに分けて再照合する場合:

```bash
runner/node_modules/.bin/tsx evals/clip_composition/realign_multicut_cutpoints.ts \
  --target evals/clip_composition/stt-targets/r_ztjHaHmcg.json \
  --clipId r_ztjHaHmcg \
  --sourceId r_ztjHaHmcg_-DwSCDMCWDQ_youtube_auto \
  --oldAlignment evals/clip_composition/outputs/alignment-r_ztjHaHmcg_youtube_auto_v001.json \
  --oldDecision evals/clip_composition/outputs/multicut-human-decision-r_ztjHaHmcg_multicut_review_v001-20260705-needs-cutpoint-v001.json \
  --outputId 20260706-cutpoint-v001 \
  --maxAudioCutpoints 12 \
  --maxVideoCutpoints 8 \
  --minSegmentMs 1500 \
  --top 3
```

この処理は、音声候補を先に採用し、映像候補を補助として追加します。指定する候補数や最短区間は人間確認用パッケージの大きさを抑えるための範囲指定であり、自動凍結の係数ではありません。各セグメントには、単語タイムスタンプの対応が線形に続いた長さをセグメント長で割った整合率を記録します。テキスト類似が高くても整合率が低い区間は、正解データとして固定しません。

第二候補 `r_ztjHaHmcg` のカット点ベース再照合済み出力:

- 再照合JSON: `outputs/cutpoint-realignment-r_ztjHaHmcg-20260706-cutpoint-v001.json`
- 再照合レポート: `reports/cutpoint-realignment-r_ztjHaHmcg-20260706-cutpoint-v001.md`
- 旧固定30秒方式アーカイブ: `outputs/archive/fixed30-alignment-r_ztjHaHmcg-20260706-cutpoint-v001.json`
- 静止画比較パッケージ: `outputs/visual-check/r_ztjHaHmcg/cutpoint-20260706-cutpoint-v001/`
- 生成された可変長セグメントは16件、静止画は頭・中間・末尾の3点確認で48枚です。
- 確認済み区間ペア `clip 1:32.555-2:01.147 / source 40:04.730-40:33.322` は、±500ms以内で一致する新セグメントがないため継承されていません。
- この出力は `readyForFreeze: false` のままです。人間が新しい静止画比較を確認するまで、fixtureとexpectedには固定しません。

複数区間候補とGemini確認結果から、人間確認用のexpected草案を作る場合:

```bash
runner/node_modules/.bin/tsx evals/clip_composition/prepare_multicut_expected_review.ts \
  --candidate evals/clip_composition/outputs/multicut-expected-candidate-r_ztjHaHmcg-20260705-v001.json \
  --visualSummary evals/clip_composition/outputs/r_ztjHaHmcg/visual_verification/20260705-gemini-web-flash-multicut-summary-v001.json \
  --outputId 20260705-v001
```

この処理は `outputs/` と `reports/` にだけ書き込み、`expected/` には書き込みません。人間確認が終わるまで、生成物は正解データではなく確認待ち草案として扱います。

人間確認後にfixtureへ固定する前のpreviewを作る場合:

```bash
runner/node_modules/.bin/tsx evals/clip_composition/freeze_multicut_review_fixture.ts \
  --review evals/clip_composition/outputs/multicut-expected-review-r_ztjHaHmcg-20260705-v001.json \
  --target evals/clip_composition/stt-targets/r_ztjHaHmcg.json \
  --sourceSttId r_ztjHaHmcg_-DwSCDMCWDQ_youtube_auto \
  --outputId 20260705-v001
```

このpreviewは `fixtures/` と `expected/` に書き込みません。人間確認と固定テーマが不足している場合は、何が足りないかを `reports/multicut-fixture-freeze-preview-*.md` に出します。

凍結previewが実際にfixtureとして成立する構造か検査する場合:

```bash
runner/node_modules/.bin/tsx evals/clip_composition/inspect_multicut_freeze_preview.ts \
  --preview evals/clip_composition/outputs/multicut-fixture-freeze-preview-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json \
  --outputId 20260705-v001
```

この検査では、書き込み予定先が評価環境内に閉じているか、凍結不可のpreviewで予定されたfixture/expectedファイルが実際に未作成か、文字起こしの発話IDが実在するか、各発話が対応するexpected区間内に収まっているか、expected草案と発話まとまりの件数が合うかを確認します。固定テーマが未入力の場合は警告として扱い、expectedは未固定のままにします。

人間確認結果をJSONとして残すためのテンプレートを作る場合:

```bash
runner/node_modules/.bin/tsx evals/clip_composition/prepare_multicut_human_decision_template.ts \
  --review evals/clip_composition/outputs/multicut-expected-review-r_ztjHaHmcg-20260705-v001.json \
  --preview evals/clip_composition/outputs/multicut-fixture-freeze-preview-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json \
  --inspection evals/clip_composition/outputs/multicut-freeze-preview-inspection-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json \
  --outputId 20260705-v001
```

テンプレートには、確認すべき4本の左右比較動画、`chunk.status`、`humanConfirmation.allChunksConfirmed`、人間が逆算して書く固定テーマ欄が入ります。未記入のテンプレートを `--decision` に渡しても、fixture固定は失敗します。

人間確認JSONがfixture固定に進める状態かだけを検査する場合:

```bash
runner/node_modules/.bin/tsx evals/clip_composition/inspect_multicut_human_decision.ts \
  --review evals/clip_composition/outputs/multicut-expected-review-r_ztjHaHmcg-20260705-v001.json \
  --decision evals/clip_composition/outputs/multicut-human-decision-template-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json \
  --outputId 20260705-v001
```

この検査は、全チャンクが人間確認済みか、確認者と確認日時が入力済みか、正解区間から逆算した固定テーマが入力済みか、確認JSONのチャンク番号と時刻がexpected草案に対応しているかを確認します。`outputs/` と `reports/` にだけ書き込み、`fixtures/`、`expected/`、`runtime/` には書き込みません。

人間が4本の左右比較動画を確認し、固定テーマを1行で逆算してからfixtureへ固定する場合:

```bash
runner/node_modules/.bin/tsx evals/clip_composition/freeze_multicut_review_fixture.ts \
  --review evals/clip_composition/outputs/multicut-expected-review-r_ztjHaHmcg-20260705-v001.json \
  --target evals/clip_composition/stt-targets/r_ztjHaHmcg.json \
  --sourceSttId r_ztjHaHmcg_-DwSCDMCWDQ_youtube_auto \
  --decision evals/clip_composition/outputs/multicut-human-decision-template-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json \
  --writeFixture true \
  --outputId 20260705-v001
```

`--writeFixture true` は、確認JSON内で全チャンクが `confirmed`、`humanConfirmation.allChunksConfirmed` が `true`、`fixedTheme.title` と `fixedTheme.summary` が入力済みで、さらに確認JSONのチャンク番号と件数がexpected草案と一致していないと失敗します。これはGemini確認だけで初回正解データを固定しないためのガードです。

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

`usedSpeechIds` は、数値の全列挙と、`"12-47"` のような連続範囲文字列をどちらも受け付けます。採点時には、範囲文字列を発話ID列へ展開して記録します。

採点結果は、先頭区間の `diff` に加えて、全区間の `cutDiffs` と `diffSummary` も記録します。複数区間expectedの場合は、期待区間と選択区間を同じ順番で比較し、完全一致件数、重なりあり件数、未選択の期待区間数、余分な選択区間数を表示します。ここでも自動の重み付けや合成スコアは作らず、人間が見る差分をそのまま出します。

採点済み `result.json` を横断比較する場合:

```bash
node evals/clip_composition/compare_prompt_results.ts \
  --results evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v008/20260705-204229/result.json,evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v008/20260705-203605/result.json \
  --outputId my-comparison
```

この比較は、指定した `result.json` だけを読みます。同じプロンプト版数のrunが複数残っていても、どのrunを比較したかを固定できます。自動の合成スコアは作らず、開始差分、終了差分、重なり説明、theme側とcomposition側の暫定判定を並べます。

比較レポートでは、`cuts` が「選択区間数/期待区間数」、`missing` が期待区間に対応する選択区間がない件数、`extra` が期待区間に対応しない選択区間の件数を表します。複数区間expectedの場合は、選択区間一覧、期待区間一覧、区間ごとの開始差分、終了差分、重なりも順番に表示します。

期待区間の境界が発話単位と一致しているか確認する場合:

```bash
node evals/clip_composition/analyze_boundary_granularity.ts \
  --fixtures IMQYaT_RWRA_context_v001,UpRyakf5j80_clip_audio_v001 \
  --outputId 20260705-v001
```

期待境界が発話途中にあるfixtureでは、プロンプトだけで正確な境界を選びにくい可能性があります。秒数補正をプロンプトへ入れず、先に単語境界または音声境界を入力として増やせるか確認します。

STT復旧後に、境界精度のために最小限どの音声をSTTすべきか確認する場合:

```bash
node evals/clip_composition/plan_boundary_stt_jobs.ts \
  --boundary evals/clip_composition/outputs/boundary-granularity-20260705-v001.json \
  --targets evals/clip_composition/stt-targets/UpRyakf5j80.json \
  --outputId 20260705-v001 \
  --server http://192.168.1.8:8000
```

このコマンドはSTTを実行しません。`reports/boundary-stt-jobs-<outputId>.md` に、STT復旧後に実行する候補コマンドを出します。

境界精度用STTの出力がそろったか確認する場合:

```bash
node evals/clip_composition/inspect_boundary_stt_readiness.ts \
  --jobs evals/clip_composition/outputs/boundary-stt-jobs-20260705-v002.json \
  --outputId 20260705-v002
```

このコマンドもSTTを実行しません。予定された単語時刻ファイルと発話ファイルがあるかを確認し、単語時刻が境界点を覆っている場合は該当単語と最寄り単語境界をレポートします。

compositionプロンプトへ渡した入力に、採点用の正解理由や検証メタ情報が混ざっていないか確認する場合:

```bash
node evals/clip_composition/inspect_prompt_payload_leakage.ts \
  --payloads evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v008/20260705-203250/prompt-input.json,evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v008/20260705-203250/prompt-input.json \
  --outputId 20260705-v008
```

このコマンドはSTTもLLMも実行しません。モデルへ渡す入力だけを読み、正解理由、照合確認メモ、正解側の検証メタ情報のキーが混ざっていないか確認します。期待時刻と同じ数値が文字起こし区間の境界として出る場合は、入力文字起こし由来の自然な一致として分けて報告します。

音声比較で確認した切り抜き全体の区間と、promptが選んだ区間の過不足を確認する場合:

```bash
node evals/clip_composition/inspect_prompt_audio_boundary.ts \
  --result evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v008/20260705-203605/result.json \
  --outputId UpRyakf5j80-v008-20260705
```

このコマンドはSTTもLLMも実行しません。採点済み `result.json` とfixture文字起こしを読み、expectedに保存した音声比較済み区間を基準に、promptの選択開始・終了が何ms前後へずれているか、文字起こし発話のどこに境界があるかを出します。

v009へ進む前に、入力へ足してよい境界情報と正解漏えいになる情報を確認する場合:

```bash
node evals/clip_composition/inspect_boundary_signal_policy.ts \
  --fixtures IMQYaT_RWRA_context_v001,UpRyakf5j80_clip_audio_v001 \
  --outputId 20260705-v001
```

このコマンドもSTTもLLMも実行しません。現在の文字起こし発話境界だけでexpectedを表現できるfixtureと、単語時刻または独立した音声境界候補が必要なfixtureを分けます。`expectedCuts` の時刻、音声比較で確定した区間、Web版Gemini確認結果は、評価用の正解または品質保証情報なのでcomposition入力へ入れてはいけないものとして報告します。

既存字幕から、v009入力候補として使う境界候補payloadを作る場合:

```bash
node evals/clip_composition/build_boundary_signal_payload.ts \
  --fixture UpRyakf5j80_clip_audio_v001 \
  --outputId UpRyakf5j80-v009-candidate-v001
```

このコマンドもSTTもLLMも実行しません。fixtureのコピー元になっている字幕時刻から、固定テーマの候補発話範囲と重なる単位と、その隣接遷移を抽出します。payload本体には `expectedCuts` の開始・終了時刻、音声比較で確定した正解時刻、Web版Gemini確認結果を入れず、`evaluationOnly` で漏えい確認だけを行います。

境界候補payloadをv009プロンプト入力へ合成する場合:

```bash
node evals/clip_composition/build_prompt_payload_with_boundary_signals.ts \
  --fixture UpRyakf5j80_clip_audio_v001 \
  --promptVersion v009 \
  --boundarySignals evals/clip_composition/outputs/boundary-signal-payload-UpRyakf5j80-v009-candidate-v001.json
```

このコマンドもSTTもLLMも実行しません。通常の固定テーマ、文字起こし入力に `boundarySignalInput` だけを追加し、境界候補payload側の `evaluationOnly` はモデル入力へ入れません。生成後は `inspect_prompt_payload_leakage.ts` でexpectedの混入を確認します。

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

## v009 Web Gemini実行結果

v009では、固定テーマと文字起こしに、expectedから独立した境界候補を足した。目的は、`UpRyakf5j80_clip_audio_v001` の終端が発話20「うん」の途中にある場合に、発話終端まで伸ばさずに切れるかを見ること。

- Web Gemini実行器: `run_web_gemini_prompt.ts`
- prompt本文: `reports/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-211733/prompt.md`
- Gemini出力JSON: `outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-211733/gemini-web-flash-output.json`
- 採点結果JSON: `outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-212949/result.json`
- 採点summary: `reports/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-212949/summary.md`
- v008/v009比較レポート: `reports/prompt-result-comparison-2026-07-05T12-29-59-119Z.md`
- 音声境界確認レポート: `reports/prompt-audio-boundary-2026-07-05T12-30-27-419Z.md`
- 境界候補照合レポート: `reports/boundary-signal-result-fit-20260705-UpRyakf5j80-v009.md`

結果は、v008と同じ `11364140ms - 11409170ms`。音声比較とWeb版Gemini確認で固定した期待区間 `11364500ms - 11407178ms` に対して、開始は `360ms` 前、終了は `1992ms` 後ろ。theme側は正解区間を候補範囲に含んでいるため、composition側が発話途中の終端を選べていない問題として扱う。

採点後の境界候補照合では、モデル終了位置は発話20「うん」の終了境界 `11409170ms` と一致した。期待終了に最も近い入力候補は、次字幕「えーっと」の開始 `11407260ms` で、期待終了との差は `+82ms`。この候補自体はexpected値ではなく、payloadの漏えい検査でもexpected時刻の混入は0件だった。

Web Geminiへテキストpromptを投げる場合:

```bash
node evals/clip_composition/run_web_gemini_prompt.ts \
  --prompt evals/clip_composition/reports/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-211733/prompt.md \
  --output evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-211733/gemini-web-flash-output.json \
  --model gemini-web-flash \
  --params '{"temperature":"web-default","source":"gemini-web","manualRun":false,"runner":"edge-cdp-text-prompt"}' \
  --cdpPort 9222
```

Web Geminiの回答が長いJSONの途中で切れた場合、実行器はGemini回答本文に実際に出ていた `selectedCuts` だけを部分抽出し、`extractionStatus.status` に `partial_selectedCuts_extracted_from_answer_text` を記録します。これは欠落した後方区間を補完せず、途中切れを観測として残すための扱いです。回答本文の後ろにプロンプト例が表示されている場合は、回答本文だけを抽出し、プロンプト例の架空区間を採点対象へ混ぜません。

採点済み結果と境界候補payloadの関係を見る場合:

```bash
node evals/clip_composition/inspect_boundary_signal_result_fit.ts \
  --result evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-212949/result.json \
  --boundaryPayload evals/clip_composition/outputs/boundary-signal-payload-UpRyakf5j80-v009-candidate-v001.json \
  --outputId 20260705-UpRyakf5j80-v009
```

現存fixtureとSTT targetが、次の境界遷移検証に使えるかを見る場合:

```bash
node evals/clip_composition/inspect_fixture_expansion_readiness.ts --outputId 20260705-v001
```

このreadinessでは、境界遷移を検証できるfixtureは `UpRyakf5j80_clip_audio_v001` の1件、境界一致の回帰確認用fixtureは `IMQYaT_RWRA_context_v001` と `IMQYaT_RWRA_audio_v001` の2件。`r_ztjHaHmcg` は切り抜き連続チャンクが元動画側の離れた範囲に対応しているため、単一区間expectedとしては凍結せず、複数区間expected対応か別の短尺連続候補を使う。

採点済み結果について、保存済みの音声比較根拠とLLMが選んだ区間を突き合わせる場合:

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/summarize_audio_evidence.ts \
  --scoreResult ../evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-212949/result.json \
  --outputId 20260705-v001
```

このコマンドはSTTも音声比較も実行しません。既に保存された音声比較結果、期待区間、LLM選択区間を読み、同じ切り抜き箇所か、開始と終端がどれだけずれているかを `outputs/` と `reports/` に出します。

単一区間では凍結できない切り貼り型候補について、複数区間expected候補と確認待ち作業を出す場合:

```bash
node --experimental-strip-types evals/clip_composition/plan_multicut_expected_candidate.ts \
  --target evals/clip_composition/stt-targets/r_ztjHaHmcg.json \
  --audioCompare evals/clip_composition/outputs/audio-compare-chunks-r_ztjHaHmcg_youtube_auto_v001.json \
  --outputId 20260705-v001
```

このコマンドもSTT、音声比較、LLM確認は実行しません。保存済みのチャンク音声比較を読み、元動画側の正のギャップがある場合は単一区間expectedとして凍結不可にし、各チャンクの目視確認待ち候補として出します。

複数区間候補からWeb Geminiまたは人間確認用の左右比較動画を作る場合:

```bash
node --experimental-strip-types evals/clip_composition/render_multicut_visual_checks.ts \
  --plan evals/clip_composition/outputs/multicut-expected-candidate-r_ztjHaHmcg-20260705-v001.json \
  --outputId 20260705-v001
```

このコマンドはローカルに保存済みの切り抜き動画と元動画だけを読み、`outputs/visual-check/<target>/` に確認動画を出します。Web Geminiへのアップロードや判定は実行しません。

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
