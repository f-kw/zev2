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
- `expectedCuts` は照合結果だけで作らず、音声比較で対応を確認した区間を記録します。
- 固定テーマは現行システムに生成させず、音声確認済みの正解候補区間から人間が逆算して書きます。

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

照合結果だけでは `expectedCuts` として固定しません。音声比較で元動画候補との対応が強く出た区間は、compositionプロンプト評価に使える音声確認済みfixtureとして扱います。最終データセットQAでは、元動画の該当秒数を目視と聴取で確認し、開始位置と終了位置の微調整を記録します。

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

このfixtureは、音声比較で確認した元配信候補 `8uuQldLptRE` の `33:18.363 - 33:26.530` を期待区間にしています。切り抜き発話と最も強く合った音声の芯は `33:22.113 - 33:26.138` です。`expectedCuts` には `audio_confirmed_visual_pending` として記録し、compositionプロンプト評価には使える状態にしています。

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

このfixtureは、音声比較結果の「切り抜き全体に対応する元配信側区間」を候補窓にし、「切り抜き発話部分に対応する元配信側区間」を期待区間にします。第一候補では、候補窓が `1997050ms - 2015672ms`、期待区間が `1998363ms - 2006530ms` です。

候補窓付きfixtureの評価結果:

- `outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-124545/result.json`
- `reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-124545/summary.md`
- 現在のrule-based compositionでは候補窓全体を選び、開始位置は `-1313ms`、終了位置は `+9142ms` ずれます。

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
