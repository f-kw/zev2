# ZEVO字幕品質v002 S/A/L/P/R module surface v010横断照合 v002

- 日付: 2026-08-12 JST
- 対象: S・A・L・P・R production module
- 方法: 承認済み契約が固定するnamed export集合と、固定Nodeのfresh processが読んだ実module namespaceを双方向照合した。import中のstdout/stderr byteも記録した。
- 結果: 5/5一致。不足0件、余分0件、import時stdout 0 byte、stderr 0 byte。

## 一件表

| 工程 | file type | expected | actual | 不足 | 余分 | import出力 |
|---|---|---:|---:|---:|---:|---|
| S source package | `.mjs` | 5 | 5 | 0 | 0 | stdout 0 / stderr 0 byte |
| A B5/B6 | `.mjs` | 7 | 7 | 0 | 0 | stdout 0 / stderr 0 byte |
| L selection | `.mjs` | 11 | 11 | 0 | 0 | stdout 0 / stderr 0 byte |
| P planner v003 | `.mjs` | 3 | 3 | 0 | 0 | stdout 0 / stderr 0 byte |
| R render plan v003 | `.mjs` | 6 | 6 | 0 | 0 | stdout 0 / stderr 0 byte |

## v010の遡及判定

S/A/L/P/Rの5 pathは全て`.mjs`であり、固定TSXが`.ts`へ付ける`default` wrapper規則の適用対象は0件だった。したがって5 pathはruntime namespace自体をsource authored named export集合とexact照合し、全件一致した。

Fだけが`.ts`であるため、F局所検査はsource authored 6 exportと、固定TSX環境で得る同一6参照の`default` wrapperを別層で検査する。

## 判定

v010追加に伴うS/A/L/P/Rのmodule surface波及はない。既合格ゲートの再実行は不要である。F/Uの正式合格は未確認であり、本記録はそれらを合格扱いしない。
