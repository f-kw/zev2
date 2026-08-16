# ZEVO字幕品質v002 F override対象選択 preflight v002

日付: 2026-08-15

## 入力

- fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0003`
- 読取対象: `evals/clip_composition/reports/presentation/test-fixtures/zevo-caption-quality-v002/zevo-caption-quality-v002-fu-formal-20260815-attempt-0003/fixture-package-v001.json`
- 読取対象SHA-256: `b939c46bb77e6c40874f1b287d1a02316db0de4db93e7822c3130a7200c8fea1`
- 選択規則: `selectionReportOverrideBinding !== null`
- 判定対象: 正式製造済みfixture package byteをstrict JSON復号した`negativeFixtures`全26件

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

## admission・root

- package file: 48件
- F admission: artifact 44/44、environment 600/600、retention 26/26
- U admission: video 3、QC 3、旧render plan 6
- proof output parent: fixture製造が作成した空directory、子root 0件

## 結論

新しい正式fixture package byteに対して、binding object 2件と`null` 24件へexactに分類できた。F正式attempt前に対象選択とreceipt admissionを実測済みである。

