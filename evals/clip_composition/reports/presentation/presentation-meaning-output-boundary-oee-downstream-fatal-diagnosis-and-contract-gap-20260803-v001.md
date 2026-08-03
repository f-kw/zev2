# 意味／表現境界 OEE後段fatal診断・契約未閉包報告 v001

- 日付: 2026-08-03
- 対象: 正式205件 attempt v003 の `OCT001`、`OEE001`、`OEE002`、`OEE004`〜`OEE008`
- 入力証拠: `formal-205-attempt-v003.tap`（SHA-256 `cc43dae707e7623aa622904d199293949955317018a43133141cbe0afcab948c`）
- 変更: production code 0件、正式成果物0件、API通信0回、費用US$0
- 結論: 描画前QCの接続欠陥と検査fixture欠陥は確定した。一方、QCが返す場所情報なしの違反を正式JSON Pointerへ写す規則が未固定であるため、契約を仮置きせず実装前に停止する。

## 1. 事実

### 1.1 6件の共通停止点

`OEE001 / OEE002 / OEE005 / OEE006 / OEE007 / OEE008`は、描画本体の`overlay-preflight`へ進んだ時点で同じ不一致を持つ。

| 項目 | 実値 | 期待値 |
|---|---|---|
| 描画済み字幕が参照する計画名 | `__internal-native-plan-reference-never-published-v001.json` | 横型: `presentation-render-plan-v002.json`、縦型: `presentation-vertical-review-render-plan-v001.json` |
| 最初に抵触する字幕 | `display-page-000001-001` | 同じ字幕IDを参照できること |
| 内側の違反 | `INSTRUCTION_RENDER_MISSING` | 違反なし |

内部計画名は、承認済み完全実装設計§5.2が「非公開の内部参照名」として明示固定した値である。名前を横型・縦型の旧値へ戻すのではなく、既存の版中立QC入口へ内部参照名を渡すのが、正本に沿う修正方向である。

このQC違反は`code / relatedIds / details`を返し、`path`を持たない。正式失敗報告は`code / path / relatedIds`を必須にするため、現行の投影処理は違反を正式化できない。結果として外側は次へ丸められる。

- 外側stage: `execution`
- 外側diagnostic: `OUTPUT_RENDER_FAILURE_REPORT_INVALID`
- 終了code: `2`
- 正式failure report: 未公開

### 1.2 OEE006〜OEE008の故障注入

3件とも保存TAP上の注入回数は`0`である。検査fixtureは作業directoryの出現を`fs.watch`通知だけで待ち、初期走査と注入完了の待機を持たない。したがって、意図した描画中・staging・公開の故障枝へ入る前に、通常経路と同じ上記fatalへ進んでいた。

これはproductionの欠陥ではなく検査設営の欠陥である。修正時は、CLI実行と並行して検査所有directoryを走査し、作業directoryの出現またはCLI終了のどちらかまで待つ決定的handshakeへ置き換えられる。秒数による待ち時間や再試行係数は使わない。

### 1.3 OEE004

`OEE004`は意図した検査済み拒否まで成立している。

- 終了code: `1`
- 違反: `TITLE_STYLE_UNAVAILABLE`
- control成果物: 2件
- render成果物: 0件
- actual／expected: 各3,734 byte
- actual／expected SHA-256: ともに `bc1e79684afcb5b8fbfa057b3c5a1ad3ac4cc9da6ad813d28e6fee6701176b72`
- byte差: 0 byte

不合格理由は、CLI捕捉値が`Buffer`、検査側serializer返値が文字列だった型不一致だけである。期待値をUTF-8 `Buffer`へ明示変換すれば、契約・正式byteを変えず解消できる。同じ比較形は`OEE001 / OEE005 / OEE006 / OEE007 / OEE008`にもあり、同時に水平修正する。

### 1.4 明示writer

現行の正式CLI exportは、writerを省略した場合だけ`process.stdout / process.stderr`を使い、formal jobの直接起動は従来どおりjob path一引数である。writerは計算本体の呼出し後に返されたbyteの宛先だけを選び、job、検査結果、成果物、終了codeへ渡されない。

したがって、kawafmm裁定の4条件を満たす形で`OCT001`を次へ改訂できる。

1. productionの一引数直接起動が残ることを検査する。
2. writer省略時に標準出力へ出すことを検査する。
3. 明示writerが同じ正式CLI exportへだけ渡されることを検査する。
4. writer有無で検査結果・成果物byte・終了codeを変える分岐がないことを、動的結果とsourceの両方で検査する。

## 2. 帰属

| 原因 | 帰属 | 契約への影響 |
|---|---|---|
| 内部計画参照名と既存QC profile名の不一致 | productionの接続実装欠陥 | 既存の版中立QC入口を使えば契約変更なし |
| 場所情報なしQC違反から正式`path`を導けない | 実装契約の値レベル未閉包 | 最小追補が必要 |
| OEE006〜008の注入完了待ちなし | fixture設営欠陥 | 契約変更なし |
| OEE004等の文字列／Buffer比較 | 検査側の型不一致 | 契約変更なし |
| OCT001の旧一引数regex | 承認済みwriter方式を未反映した検査 | 今回の裁定どおり改訂可能 |

相反する二契約は見つかっていない。しかし、`path`を実装者判断なしで一意に導く表がないため、「契約解釈に触れない欠陥だけなら連続実装」の条件は満たさない。

## 3. 未確認

- attempt v003固有のPID入り一時path、overlay SHA、外部toolのstdout／stderrは、検査fixtureの後始末と最初のassert停止により保存されておらず復元不能である。
- 外部tool固有の失敗は確認していない。上記の計画参照名不一致はtool出力に依存せず、保存TAPと現行コードから必ず先に成立する論理不合格である。
- 正式205件の再実行、既存gate 287件、baseline 181件、既存3本tree最終照合は、この診断では実行していない。

## 4. 最小契約追補案

推奨は、場所情報を持たない既存QC違反だけを次の規則で正式化する案Aである。

| 案 | 規則 | 長所 | 短所 |
|---|---|---|---|
| **A（推奨）** | 既存QC違反code集合に属し、rawに`path`が無い一件は、正式`path`をroot pointer `""`とする。`relatedIds`は全件保持・辞書順unique、`details`は従来どおり正式reportへ出さない。同じcode＋rootが複数あれば、現行どおりreport不可信としてfatalにする | QCが報告していない詳細位置を捏造しない。現行の重複拒否を緩めない。変更が最小 | report単体の場所はrootまで。対象字幕は`relatedIds`で読む |
| B | `relatedIds`からnative pageのJSON Pointerを新たに組み立てる | path単体が細かい | page索引・複数ID・媒体違反の写像表が増え、今回の修正範囲を超える |

案Aの適用範囲は`PRESENTATION_RENDERER_QC_VIOLATION_CODES`に属する場所情報なし違反だけとする。既に`path`を持つ描画本体の違反は、現行の限定JSONPath→RFC 6901変換を変えない。未知code、未知shape、不正relatedIds、重複code＋pathは引き続き正式reportを出さずfatalにする。

## 5. 追補承認後の変更範囲

既存27 file集合内の4 fileだけで閉じる。

| file | 変更の意味 |
|---|---|
| `run_presentation_output_job_v001.ts` | 版中立QC入口へ内部計画参照名を渡す。判定計算は複製しない |
| `presentation_output_render_plan_v001.mjs` | 承認された場所情報なしQC違反の投影規則を追加する |
| `presentation_output_render_plan_v001.test.mjs` | 比較型をbyteへ統一し、故障注入を完了待ち付きfixtureへ直す |
| `presentation_output_contract_v001.test.mjs` | 一引数production起動とoptional writerの両条件を検査する |

この4 file以外、成果物schema、renderer、QC基準、planner、既存3本、正式成果物、検査期待の意味は変えない。

## 6. 停止点と承認依頼

契約未固定を検出したため、コード修正、新attempt、回帰、commit Aには進んでいない。

次の一判断を求める。

> 最小契約追補案Aを承認する。場所情報を持たない既存QC違反は、既存QC code集合に限り正式pathをroot pointer `""`へ写し、relatedIdsを保持する。同じcode＋rootの重複、未知code、未知shapeは従来どおり正式失敗報告を出さずfatalとする。承認後は、本文書§5の4 file限定修正、正式205件の新attempt（TAP全文版付き保存・全ID結果行必須）、205/205時だけ既存gate 287/287・既知baseline 64/181不変・既存3本tree最終照合、完了報告（commit A・27 file SHA表）まで、既存停止規律のまま再開してよい。
