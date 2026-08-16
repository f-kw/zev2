# ZEVO字幕品質v002 v022 P/R/F正式attempt-0001 停止報告 v001

作成日: 2026-08-16  
対象: 既知6境界の独立照合合格後、P/R/F・横型3本描画へ入る正式proof

## 1. 結論

既知6境界の独立照合は、版付き人間観測fixtureの字幕IDとatom位置を正本として読み、6/6で非再選択を確認した。

続く正式proof attemptは、P/R/Fへ入る前のstaging root取得で停止した。新しく選んだ正式出力系列の親directoryが存在しない状態で、runnerがstaging root一件を非再帰作成しようとし、`ENOENT`となった。正式runnerは親directoryを暗黙補完しない現行動作を維持しており、原因はjob・実行設営側が新出力系列の親を準備しなかったことである。

不合格一件で同attemptを直さない規律に従い、再実行・親directory作成・新版job発行を行わず停止した。API再送、回答修復、P/R/F、描画、QC、確認ページは0件である。

## 2. 到達点

| 工程 | 結果 | 証拠 |
|---|---:|---|
| v022 strict selection受入 | 13項目全合格 | 保存済み正式selection report |
| 既知6境界の独立照合 | 6/6非再選択 | `test-runs/20260816-zevo-caption-quality-v002-v022-known-six-formal-attempt-0002/known-six-boundary-check-v001.json` |
| proof job製造 | strict decoder合格 | job file SHA-256 `f706f9633298c9d40293412cb9f4553d069ed7fcafc9ab8e27274be6464a4216` |
| 起動前checklist | 合格 | file/canonical束縛156件、固定runtime、native Chromium、全leaf root未使用 |
| 正式proof attempt | fatal | `input-reread / staging-root-acquisition / create-staging-root / ENOENT` |
| P/R/F | 0件 | staging成立前で停止 |
| 横型描画・QC・確認ページ | 0件 | 同上 |

既知6境界は次のexact位置で確認した。

| 字幕 | atom位置 | 旧不自然分割 | 正式selectionへの再選択 |
|---|---:|---|---:|
| `input-caption-000001` | 20 | `マリ/ン` | なし |
| `input-caption-000001` | 32 | `マリ/ン` | なし |
| `input-caption-000002` | 42 | `ス/イちゃん` | なし |
| `input-caption-000003` | 15 | `言ってほし/いみたいな` | なし |
| `input-caption-000003` | 32 | `じ/ゃ報告` | なし |
| `input-caption-000003` | 62 | `サク/サク` | なし |

## 3. 正式失敗観測

- CLI status: `fatal`
- stage: `input-reread`
- primary code: `CUE_PROOF_EXECUTION_FAILED`
- checkpoint: `staging-root-acquisition`
- operation: `create-staging-root`
- OS code: `ENOENT`
- stderr: 0 byte
- process終了code: 2
- signal: 0

対象staging rootの直接親である`output-caption-cue-proof-runs` directoryが実在しなかった。runnerの正式directory取得処理は対象一件だけを`recursive: false`で作るため、親を補わず失敗した。

## 4. 三分法

- production: 欠陥0件。正式runnerは出力親を暗黙補完せず、対象staging一件だけを取得する現行処理どおりに停止した。
- job・実行設営: 欠陥1件。新しい正式出力系列をjobへ指定したが、その親directoryの存在を準備・照合しなかった。
- 契約: 解釈不要。runner、schema、status、code、selection、描画規則の変更を要しない。

## 5. 事前検出可能性

事前検出できた。起動前checklistはproof output、staging、renderer workのleafが未使用であることを確認したが、それらの親directoryの存在・directory型・書込可能性を確認しなかった。F/U工程で確立済みの「正式fixtureが参照・作成する全pathの環境前提一件表」を、今回のreal-data proofへ適用していれば正式attempt前に検出できた。

起動前checklistの記録処理には、正式attempt前にruntime区分名を一件取り違えた不備もあった。これは記録処理内で訂正しchecklistを最初から再取得した。job・output rootは未使用で、正式attemptには数えていない。訂正前の例外は上書きせず端末観測として保持した。

## 6. 再開に必要な限定設営案

1. 新しい正式出力系列の親directoryを明示作成する。
2. 起動前checklistへ、proof output/staging、renderer workが必要とする全親directoryの存在・directory型・書込可能性を追加する。
3. 失敗済みjob・stdout・preflightを不変保持する。
4. job IDと出力rootを新版へ進めたproof jobを発行し、新しい未使用rootで正式attemptを一回実行する。
5. 合格時だけP/R/F、横型3本、QC、確認ページへ進む。

production、契約、source package、selection、API回答、字幕本文、253境界、preset registryは変更しない。API再送も不要である。

## 7. 証拠

- 既知6境界record SHA-256: `0d890fc37133c901699710178eb4578b01fab87bdc12eb91e0e3255df0413d0d`
- proof job SHA-256: `f706f9633298c9d40293412cb9f4553d069ed7fcafc9ab8e27274be6464a4216`
- preflight SHA-256: `dd4d50efe4cb880f5c131b3b23558bdea089d04ab5d8846ea015c9f03bd3706f`
- stdout SHA-256: `2210424d1b874cf89da53419f56429947c467eea18fe9f0fd77340667aad8a48`
- stderr SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

## 8. 外部作用

- この再開分のAPI通信: 0回
- この再開分の追加費用: US$0
- API再送・回答修復: 0件
- 描画: 0本
- commit / stable tag: 0件

## 9. 残作業

出力親directoryの設営を閉じた新版proof attempt、P/R/F、横型3本描画、QC、人間確認ページが未実施である。正式selectionと既知6境界6/6は成立済みであり、再実行対象ではない。
