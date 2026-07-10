# B素材 theme-llm-v002 正式採点準備監査

日付: 2026-07-10
対象: `nOEWCNc77MI` / `theme-llm-v002@gemini-web-flash`

## 結論

B素材fixture凍結後も、現在の採点処理をそのまま実行することはできない。範囲の重なり判定そのものは複数expectedに対応しているが、次の2点を採点前に直す必要がある。

1. B素材の保存済み実走bundleを明示して読めるようにする。
2. 各expectedを「今回のモデル入力に含まれていた区間」と「入力に含まれていなかった区間」に分け、通常のモデルmissと入力選定による不可視を別表示する。

これはプロンプトやexpectedの変更ではなく、測定対象を取り違えないための採点表示・入力指定の修正である。

## 既存採点処理でできること

`score_theme_generation_output.ts` は、候補の根拠範囲をfixtureの各expectedと突き合わせ、時刻範囲が重なったものを範囲hitとして扱える。複数expectedを順番に処理し、`usableForCompositionPromptEval=false` の区間を除外するため、17ブロックのうち人間が採用して凍結した複数区間との重なり計算自体に新しい係数や重みは不要である。

## そのまま動かない理由

既存採点処理は、テーマ生成出力を次の固定配置から読む。

```text
outputs/theme-generation/<fixtureId>/<generationSystem>/<outputId>/prompt-input.json
outputs/theme-generation/<fixtureId>/<generationSystem>/<outputId>/run-XX-gemini-output.json
```

B素材の保存済み実走は、まだfixtureではない入力集合IDの下にある。

- 発話量上位50:
  `outputs/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/`
- 先頭50:
  `outputs/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/`

既存成果物を移動・複製して由来を曖昧にせず、採点対象bundleのパスと生成系統を明示指定する方針が適切である。

## 入力外expectedの扱い

既存採点処理は、凍結済みexpectedをすべて分母に入れる。モデルへ渡した元配信区間を参照していないため、expectedが発話量上位50の入力区間外でも通常missになる。

正式採点では、保存済み `prompt-input.json` の元配信区間と各expectedを、同じ元配信ID上の厳密な時間範囲重なりだけで分類する。

- 入力内expected: モデルに見えていた区間。範囲hitまたはモデルmissとして表示する。
- 入力外expected: モデルに見えていなかった区間。入力選定による不可視として別表示する。
- 全expected: 凍結fixture全体に対する生の件数を、参考値として併記する。

独自の重み、補正係数、入力外区間への推定加点は使わない。入力内の正式分母と、全expectedの参考集計を混ぜない。

## 先頭50の位置づけ

記録には不一致がある。プロンプト台帳と方向確認レポートは先頭50を形式品質の方向確認として扱う一方、発話量上位50の結果レポートには凍結後に両方を採点する記述がある。

現時点の提案は次のとおり。

- 主結果: 発話量上位50の25候補。
- 参考結果: 先頭50の25候補。
- 両者を統合せず、同じ凍結expectedに対して別々に入力可視性と範囲hitを表示する。

正式な扱いは人間が決定し、決定後に `DECISIONS.md` とプロンプト台帳へ同時に記録する。決定前に先頭50を正式成績へ混ぜない。

## 次の実装順

1. B素材の人間確認結果と固定テーマを受け取る。
2. 汎用複数区間凍結経路でpost-human dry-runし、承認後にfixture/expectedを凍結する。
3. 保存済み実走bundleの明示指定と入力可視性の別表示を採点処理へ追加する。
4. 発話量上位50を主結果として正式採点し、先頭50は人間決定に従って別枠表示する。
