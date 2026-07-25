# 次のJOURNAL安定点 根拠索引 v001

- 日付: 2026-07-26
- 区分: 人間待ち充填方式の副線
- 対象候補: `stable/b4-complete-*`
- 人間作業: 0件

## 1. 現在はタグを切れない

B4は数値検査12/12まで合格したが、表示計画検査は85/87で停止している。安定点の三条件のうち「全検査合格」が未成立なので、tagもJOURNAL追記も行わない。

最新の撤退点は`stable/b3-complete-20260725`である。

## 2. B4安定点に必要な根拠

| 条件 | 必要な記録 |
|---|---|
| 全検査合格 | 修正後の正式88件、意味回答133件、回帰95件、preflight v002のTAPとhash |
| 正式成果物hash一致 | B3 7ファイル、残存発話、基礎映像、timeline、registry、承認済み文書bindingの再照合 |
| 共有文書同期 | `DECISIONS.md`と`docs/HANDOVER.md`にB4完了・未実施範囲・次のB5を同じ意味で記録 |
| 来歴 | 実装commit、検査実体hash、Node・TSX・esbuild実体、実行環境 |
| 停止履歴 | B4中の安全停止を結果の緩和なしで越えた経緯へのリンク |

## 3. 既に使える根拠

- B3正式package: `presentation-candidate13-caption-gate-b3-formal-package-generation-completion-report-20260725-v001.md`
- B4処理結果／来歴比較:
  `evals/clip_composition/outputs/presentation/caption-b4-number-token-invariance-v002/result-provenance-comparison-v001.json`
- B4現停止: `presentation-candidate13-caption-gate-b4-final-test-stop-report-20260726-v001.md`
- T082/T083診断・修正設計: `presentation-candidate13-caption-gate-b4-t082-t083-timeline-mapping-diagnosis-and-repair-design-20260726-v001.md`
- T082/T083正式出力観測:
  `outputs/presentation/test-runs/20260726-caption-b4-t082-t083-diagnosis-v001/observations.json`
- 205候補の時間対応全走査:
  `outputs/presentation/test-runs/20260726-caption-b4-t082-t083-diagnosis-v001/timeline-mapping-inspection.json`

## 4. B4完了時のJOURNAL本文に書けること

平易な言葉では次の範囲までである。

1. Geminiが選んだ改行位置を、元の文字・時刻・順番を変えず字幕指示へ戻す機械ができた。
2. 文字欠落、重複、順序変更、画面外、重なりを描画前に検査できる。
3. 機械検査合格は「読みやすい」の証明ではなく、初描画の人間確認待ちである。
4. 20msの一文字を独立表示できない事例を、時間の水増しで隠さず検査fixtureの意味分割へ戻した。
5. 内側の停止理由を上位報告へ残し、次の診断で空理由にしない。

B4時点でGemini実走、正式表示計画、描画ができたとは書かない。

## 5. 撤退時に失う範囲

`stable/b4-complete-*`から将来撤退する場合に失うのは、その後の

- B5 prompt・API payload・token・費用上限。
- B6 Gemini API回答。
- B7正式表示計画・指示書・解決package。
- candidate 13描画と人間確認。

である。

一方、B4安定点にはB3正式source-only package、基礎映像、残存354文字、205境界候補が引き続き含まれる。

## 6. 発行手順

1. 三条件を同一HEADで再確認。
2. B4完了報告を作成。
3. `DECISIONS.md`・`docs/HANDOVER.md`・`JOURNAL.md`を同一commitへ含める。
4. そのcommitへ一つだけ`stable/b4-complete-YYYYMMDD`を付ける。
5. 完了報告へtag名と、そこから撤退した時に失う範囲を書く。

条件未達ならtagもJOURNALも作らない。
