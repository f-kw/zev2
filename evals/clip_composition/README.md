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
