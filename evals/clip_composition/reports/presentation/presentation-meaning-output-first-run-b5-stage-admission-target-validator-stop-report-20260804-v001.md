# B5工程入場 target validator不整合 停止報告 v001

日付: 2026-08-04  
対象: qdczJpv8RCc / candidate 59 / 意味・表現分離 初回実データrun  
状態: API通信前の安全停止

## 1. 到達地点

- B5工程入場jobとB5 target jobの旧byteは、SHA付き失敗証拠として版付きtest-run pathへ保持した。
- 両jobは値を変えず、既存の正式serializerが生成するexact byteへ直した。
- 修復後の両jobは、正式decoder、値validator、正式serializerとのbyte一致に合格した。
- 固定Node、固定TSX loader、`NODE_OPTIONS`不存在、receipt root未使用、並行writerなしを確認し、修復後のstage 03工程入場を1回実行した。
- 終了code 1、`STAGE_ADMISSION_PROJECTION_MISMATCH`、違反path `/job`で停止した。stderrは0 byteだった。
- receiptは公開されず、B5 countTokens、B6 generateContent、意味package、基礎映像、crop、横型・縦型描画には進んでいない。
- API通信0回、今回費用US$0。固定5項目、B3、API requestの意味、支出上限、production codeは変更していない。

## 2. 保存した証拠

| 種別 | path | SHA-256 |
|---|---|---|
| 旧B5 target job byte | `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/b5-target-job-non-formal-input-v001.json` | `132ee84f2d3c78c842f23cca4c77c1a6ee8e66e8a5dbb54ec58a19496e93e222` |
| 旧stage 03 job byte | `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/b5-stage-admission-job-non-formal-input-v001.json` | `7265a3c1828ac5a9a2e7ca70fc92a08793eaa74365dacbe17d1c26ac0073e8b4` |
| 修復後B5 target job | `evals/clip_composition/outputs/presentation/meaning-boundary-b5-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-b5-v001.json` | `daaab9eb08d865faf3552ce1190172d78d0aa2946b7f0fdbce6839ce2ed70df4` |
| 修復後stage 03 job | `evals/clip_composition/outputs/presentation/meaning-output-stage-admission-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/v002/03-b5-token-measurement-attempt-0001-formal-v001.json` | `e3710c04c84b240987f9aaec378932d1d38f9fe97771e410fbdf92359039b54e` |
| 実行前checklist | `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/formal-command-checks/08-b5-token-measurement-stage-admission-v002-attempt-0001-formal-repair-preflight.json` | `45e8995f1b064d12da7120a99342275cc11c97fdb2f6319241fe9ce890d4f5bc` |
| 不合格stdout | `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/b5-token-measurement-stage-admission-v002-attempt-0001-formal-repair.stdout.json` | `5c671f7994bc795d6865d53439b8a126be28b92ed46148a18b3e6f2ca88efad8` |
| stderr | `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/b5-token-measurement-stage-admission-v002-attempt-0001-formal-repair.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 読み取り診断 | `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/b5-stage-admission-target-validator-diagnostic-v001.json` | `d2b9f2b8d828eb8285386f4ce8406156049e5dadef691428c5a6d5cc1ca4c808` |

## 3. 原因

### 事実

- 実データを既存の純粋な工程投影処理へ渡すと、違反位置は`/targetJob`まで絞れた。
- B5 job validator自体は同じjobを正常として受理し、合格時に検査済みjob objectを返す。
- 工程入場側の共通受理処理は、validator返値が真偽値`true`または`status: passed`のときだけ合格とする。
- そのため、正常なjob object返値が不合格へ誤分類される。
- B6 job validatorも同じく、合格時にjob objectを返す。同じ共通受理処理を通るため、B5だけを個別に通してもstage 04で同型停止する構造がある。
- 既存の10工程投影testは、実際のB5/B6 validatorの代わりに常に`true`を返す検査用関数を渡しており、この返値形式の不整合を検出していなかった。

### 帰属

- productionの工程入場adapterと実物経路testの欠陥。
- B5 jobの値、正式byte、B3 source package、固定5項目、契約、Google API、Gemini回答の欠陥ではない。

### 未確認

- 修正後のstage 03工程入場、B5 countTokens、stage 04、B6以降は未実行。

## 4. 次の最小修正候補

推奨は、工程入場側でB5/B6の既存validatorが採る「不合格時throw、合格時job object返却」を正確に受けるadapterへ限定修正する案である。

- B5/B6 validator本体と契約は変えない。
- 他工程の真偽値validator、`status`付きvalidatorの判定規則を変えない。
- 実B5/B6 job validatorを工程投影へ直接渡す正常系と、不正jobを拒否する負例を追加する。
- stage 03とstage 04の双方を同時に塞ぎ、B5だけ直して次工程で同型停止する連鎖を避ける。
- 修正後は実装SHAを束縛し直した新しい版付きstage 03 jobを作り、未使用のreceipt rootへの1回実行から再開する。

これは未承認のproduction修正を含むため、本報告では実装・再実行を行わない。

## 5. 承認依頼文案

工程入場のB5/B6 target validator返値adapterの限定修正と、実validatorを通す回帰検査の追加を承認する。B5/B6 validator本体・契約・job値・固定5項目・B3・API requestの意味・支出上限は不変とする。修正後、実装SHAを束縛した版付きstage 03 jobを作り、receipt root未使用を確認して工程入場を新たに1回実行する。合格時だけ既承認のB5最大2回→B6一回→意味package→基礎映像→crop適用→横型・縦型描画→QC→完成報告へ連続する。不合格、通信失敗、回答不受理、物理検査不合格、QC不合格は保存して停止する。
