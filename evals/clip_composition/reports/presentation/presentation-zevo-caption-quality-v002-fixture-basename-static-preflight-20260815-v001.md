# ZEVO字幕品質v002 fixture basename静的preflight v001

日付: 2026-08-15

## 1. 対象

- 新fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0004`
- 製造前に、保存済みattempt-0003 packageの正常1件・負例26件を現物byteから読み、現行製造式へfixtureSetIdとlabelを入れたときのjob ID／basename対応を照合した。
- job IDの形式は`zcq-<fixtureSetId>-<label>`のまま変更しない。

## 2. formal proof job 26件

| 区分 | label | 新basename |
|---|---|---|
| 正常 | `normal` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-normal.json` |
| 負例 | `completion-reread-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-completion-reread-failure.json` |
| 負例 | `completion-write-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-completion-write-failure.json` |
| 負例 | `fade-throw` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-fade-throw.json` |
| 負例 | `failure-report-reread-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-failure-report-reread-failure.json` |
| 負例 | `failure-report-write-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-failure-report-write-failure.json` |
| 負例 | `output-request-reread-io-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-output-request-reread-io-failure.json` |
| 負例 | `output-request-reread-mismatch` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-output-request-reread-mismatch.json` |
| 負例 | `owner-mismatch` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-owner-mismatch.json` |
| 負例 | `owner-missing` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-owner-missing.json` |
| 負例 | `owner-permission` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-owner-permission.json` |
| 負例 | `planner-rejected-first-case` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-planner-rejected-first-case.json` |
| 負例 | `publisher-helper-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-publisher-helper-failure.json` |
| 負例 | `publisher-late-collision` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-publisher-late-collision.json` |
| 負例 | `render-plan-reread-mismatch` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-render-plan-reread-mismatch.json` |
| 負例 | `render-plan-write-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-render-plan-write-failure.json` |
| 負例 | `render-rejected-first-case` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-render-rejected-first-case.json` |
| 負例 | `renderer-rejected-first-case` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-renderer-rejected-first-case.json` |
| 負例 | `renderer-rejected-second-case` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-renderer-rejected-second-case.json` |
| 負例 | `review-build-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-review-build-failure.json` |
| 負例 | `review-fade-mismatch` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-review-fade-mismatch.json` |
| 負例 | `review-id-mismatch` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-review-id-mismatch.json` |
| 負例 | `review-reread-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-review-reread-failure.json` |
| 負例 | `review-write-failure` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-review-write-failure.json` |
| 負例 | `root-reservation-collision` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-root-reservation-collision.json` |
| 負例 | `work-video-missing` | `zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0004-work-video-missing.json` |

照合結果:

- formal job数: 26
- job ID重複: 0
- basename重複: 0
- basename（拡張子除外）とjob IDの不一致: 0
- formal ID規則違反: 0
- 最大job ID長: 94文字（上限192文字以内）

## 3. malformed一件の明示除外

- label: `malformed-byte-envelope`
- basename: `malformed-byte-envelope.json`
- binding shape: byte binding（path・file SHAの2項目）
- production proof job decoder: rejectedが期待値
- job ID: なし
- formal 26件のbasename／job ID一致検査から除外するが、専用basename・byte binding・decode rejectedは別条件として必ず検査する。

結論: 新fixtureSetの製造ロジックは、formal 26件をconsumerの正式basename規則へ一致させ、malformed一件だけを契約上の理由付きで明示除外できる。

