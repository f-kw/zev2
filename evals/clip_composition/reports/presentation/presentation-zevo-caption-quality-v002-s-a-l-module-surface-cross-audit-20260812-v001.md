# ZEVO字幕品質v002 S/A/L module surface 横展開照合 v001

- 日付: 2026-08-12 JST
- 対象: S・A・L production module
- 方法: 承認済み文書byteからnamed export名を抽出し、固定Nodeのfresh processで得た実module namespaceと双方向照合した。processには対象module source以外のfilesystem読取、filesystem書込、子process起動を許可せず、module由来のstdout/stderrが0 byteであることも確認した。
- 結果: 3/3一致。契約外export 0件、契約export不足0件、import時のproduction I/O・process起動・stdout/stderr 0件。

## 一件表

| 工程 | 契約根拠 | expected件数 | actual件数 | 不足 | 余分 | direct import |
|---|---|---:|---:|---:|---:|---|
| S source package | 親設計 §3.1 + 追補v007 | 5 | 5 | 0 | 0 | passed |
| A B5/B6 | 親設計 §3.1 | 7 | 7 | 0 | 0 | passed |
| L selection | 親設計 §3.1 + 追補v002 + 追補v003 | 11 | 11 | 0 | 0 | passed |

## exact export集合

### S

- `buildPresentationOutputCaptionCueSourcePackageV001`
- `decodePresentationOutputCaptionCueSourceJobV001`
- `executePresentationOutputCaptionCueSourceJobV001`
- `validatePresentationOutputCaptionCueSourceJobV001`
- `validatePresentationOutputCaptionCueSourcePackageV001`

### A

- `decodePresentationOutputCaptionCueB5JobV001`
- `decodePresentationOutputCaptionCueB6JobV001`
- `executePresentationOutputCaptionCueB5V001`
- `executePresentationOutputCaptionCueB6V001`
- `performPresentationOutputCaptionCueCountTokensV001`
- `validatePresentationOutputCaptionCueB5JobV001`
- `validatePresentationOutputCaptionCueB6JobV001`

### L

- `admitPresentationOutputCaptionCueSelectionV001`
- `buildPresentationOutputCaptionCuePhysicalProjectionV001`
- `buildPresentationOutputCaptionCueProjectionSetV001`
- `buildPresentationOutputCaptionCueReconstructionProjectionV001`
- `buildPresentationOutputCaptionCueSourceClosureV001`
- `buildPresentationOutputCaptionCueTimelineProjectionV001`
- `decodePresentationOutputCaptionCueSelectionJobV001`
- `executePresentationOutputCaptionCueSelectionJobV001`
- `finalizePresentationOutputCaptionCueSelectionReportV001`
- `rereadPresentationOutputCaptionCueCaseInputsV001`
- `validatePresentationOutputCaptionCueSelectionJobV001`

## 判定

S/A/LにP/Rと同型のmodule surface欠陥はない。既合格gateの再実行は不要である。F/Uは未実装のため合格とは数えず、各production path完成直後に契約文書byte由来のexact namespace照合を局所閉包へ含める。
