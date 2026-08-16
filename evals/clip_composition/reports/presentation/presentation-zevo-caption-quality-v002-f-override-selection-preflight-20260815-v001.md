# ZEVO字幕品質v002 F override対象選択 preflight v001

日付: 2026-08-15

## 入力

- 読取対象: `evals/clip_composition/reports/presentation/test-fixtures/zevo-caption-quality-v002/zevo-caption-quality-v002-fu-formal-20260815-attempt-0002/fixture-package-v001.json`
- 読取対象SHA-256: `7b4fcb787c6e270fffc598b668debf033840b6d3e45f338c6e68dda51d30c7de`
- 選択規則: `selectionReportOverrideBinding !== null`
- 判定対象: 保存済みfixture package byteをstrict JSON復号した`negativeFixtures`全26件

## 選択結果

- binding objectとして閉包assertの対象: 2件
  - `failure-report-reread-failure`
  - `failure-report-write-failure`
- `null`を「上書きなし」として対象外: 24件
  - `completion-reread-failure`
  - `completion-write-failure`
  - `fade-throw`
  - `malformed-byte-envelope`
  - `output-request-reread-io-failure`
  - `output-request-reread-mismatch`
  - `owner-mismatch`
  - `owner-missing`
  - `owner-permission`
  - `planner-rejected-first-case`
  - `publisher-helper-failure`
  - `publisher-late-collision`
  - `render-plan-reread-mismatch`
  - `render-plan-write-failure`
  - `render-rejected-first-case`
  - `renderer-rejected-first-case`
  - `renderer-rejected-second-case`
  - `review-build-failure`
  - `review-fade-mismatch`
  - `review-id-mismatch`
  - `review-reread-failure`
  - `review-write-failure`
  - `root-reservation-collision`
  - `work-video-missing`

## 結論

承認済みschemaの意味どおり、binding object 2件と`null` 24件へexactに分類できた。正式attempt内で同じ対象選択を初めて評価する状態ではない。

