# 意味／表現境界 attempt v002 三点修正設計 v001

日付: 2026-08-03  
状態: kawafmm承認範囲内の実装前確定。契約改訂なし。  
外部通信: 0回  
費用: US$0

## 1. 目的

正式205件attempt v002で観測した6不合格と15検査ID欠落を、契約・productionの拒否意味・検査期待を変えずに解消する。修正後は205件を一度だけ頭から実行し、TAPへ205 ID全件の結果行が残ること自体を合格条件にする。

## 2. 診断結果

| 観測 | 三分法の帰属 | 根本原因 | 修正対象 |
|---|---|---|---|
| MIP030 | fixture／検査設営欠陥 | macOSで`os.tmpdir()`が論理`/var`を返す一方、productionはrootを`/private/var`へ実体解決するため、symlink親検査より前にworkspace外判定となった | M07 fixtureのみ |
| MIP033 | MIP030の派生 | MIP030のassert停止により、既存の違反code記録へ到達しなかった | 直接変更なし |
| OEE001/002/004/005 | production実装欠陥 | O07が、承認済み縦型runtime profileで正規に使うsymlink入口を、一般成果物用の「非symlink regular file」読取器へ誤って渡した | O07 runtime tool照合 |
| OEE006〜009、OPF001〜011のTAP欠落 | fixture／検査設営欠陥 | O13がprocess全体のstdout/stderr writerを一時差替えし、同じprocessでnode:testが出すTAPを正式CLI出力と一緒に吸収した | O07 CLI writer入口とO13捕捉 |

契約矛盾はない。OEE群が読むruntime profileは、既存縦型正式契約の`path / version / fileSha256`正本をそのまま使う。7 toolは全件で保存SHAと現物SHAが一致した。入口pathはNodeとbrowserの2件が実file直指定、TSX、Remotion、FFmpeg、FFprobe、ImageMagickの5件が承認済みsymlink入口だった。実行環境確認はNodeの次のTSXで最初に`unsafe-file`となり、4検査はいずれも本来の正常／拒否枝へ入る前に同じ前処理で停止した。

## 3. 修正A: MIP030 fixture

`presentation_meaning_information_package_v001.test.mjs`でMIP030専用一時rootを作る際だけ、`realpath(os.tmpdir())`を親に使う。

- productionの包含判定、symlink親拒否、拒否順、期待regexは変えない。
- root内symlink、target、cleanupは既存のまま。
- MIP033はMIP030完走後に既存code記録へ到達するため直接変更しない。

## 4. 修正B: runtime toolの正規入口照合

`run_presentation_output_job_v001.ts`に、runtime tool binding専用の安定SHA読取を置く。

1. jobが束縛したpathがabsoluteであることを維持する。
2. 束縛pathを実体pathへ解決する。
3. 実体が非symlink regular fileであることとSHAを既存streaming読取で検査する。
4. 読取前後で束縛pathの実体解決先が変化していないことを検査する。
5. 開始時、tool実行前後、公開前再読の全箇所でこの同じ処理を使う。

成果物、契約文書、media、implementation bindingの読取は従来の非symlink専用処理のままにする。runtime toolだけを追跡種別で明示し、一般成果物の安全条件を緩めない。

## 5. 修正C: CLI出力とTAPの分離

`runPresentationOutputJobCliV001`へ、同じ正式出力byteを受ける明示writerを任意注入できる入口を追加し、既定値は現在どおり`process.stdout`／`process.stderr`とする。productionの直接起動、終了code、stdout/stderr byteは変えない。

O13のCLI検査は同じexport・同じ正式処理へmemory writerを渡す。process全体のwriterは差し替えない。これによりnode:testのTAPはtest runnerのstdoutへ残り、正式CLI byteだけを検査用bufferへ捕捉できる。

- 別CLI実装、別計算、子process、mock、結果の後処理は作らない。
- OEEのstdout/stderr exact byte assertは維持する。
- OPF012の固定Node＋固定TSX loader入口も維持する。

## 6. 対応表

| 不成立 | 解消する修正 | 期待する観測 |
|---|---|---|
| MIP030 | A | `unsafe-publication-parent`へ到達 |
| MIP033 | Aの派生解消 | 30 code列の既存記録が完走 |
| OEE001 | B | 横型正常経路exit 0 |
| OEE002 | B | 縦型正常経路exit 0 |
| OEE004 | B | 意図した検査済み拒否exit 1 |
| OEE005 | B | common core違反のexit 1 |
| TAP欠落15 ID | C | 205 ID全件をTAPで一度ずつ観測 |

## 7. 変更範囲

変更する既存実装fileは、承認済み27 file集合内の次の3件だけである。

1. `evals/clip_composition/presentation_meaning_information_package_v001.test.mjs`
2. `evals/clip_composition/run_presentation_output_job_v001.ts`
3. `evals/clip_composition/presentation_output_render_plan_v001.test.mjs`

検査ID、205件総数、契約、schema、productionの拒否順、既存期待値は変更しない。

## 8. 実行と停止

1. 三点を限定修正する。
2. 正式205件を新attemptとして頭から1回実行し、TAP全文を版付き保存する。
3. Node集計205/205に加え、設計の205 IDがTAPへ各1回・missing 0・extra 0であることを独立照合する。
4. 1件でも不合格、ID欠落、余分ID、重複IDがあれば同attemptで直さず停止する。
5. 205/205時だけ既存合格gate 287/287、既知baseline 64/181不変、既存3本tree SHA不変を確認する。
6. 全条件成立時だけcommit Aと27 file SHA表を作る。

既存3本、stable tag、正式成果物は変更しない。API通信0回、費用US$0を維持する。
