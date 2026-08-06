# 意味／表現分離 初回実データrun B3 job path不合格停止報告 v001

- 日付: 2026-08-04
- 対象: `qdczJpv8RCc-candidate-59-meaning-output-first-run-v001`
- 停止段階: `02-b3-source-package` 本体
- 外部通信: 0回
- 費用: US$0

## 1. 結論

固定TSX loaderを付けた工程入場v002の再実行とtimeline生成は合格した。その次のB3 source package工程は、正式jobの保存pathがrunnerの固定path契約と一致せず、終了1・`MEANING_BOUNDARY_JOB_INVALID`で停止した。同attemptでjobを移動・修正・再実行していない。B5、B6、意味package、基礎映像、crop、横型／縦型描画、QCへは進んでいない。

## 2. 事実

### 2.1 loader付き再入場とtimeline

- timeline工程入場receipt: `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/admissions-v002/01-timeline-decision/attempt-0001/stage-admission-receipt.json`
- timeline成果物: `evals/clip_composition/outputs/presentation/meaning-timeline-decisions/qdczJpv8RCc-candidate-59-meaning-output-first-run-timeline-v002/timeline-composition-decision.json`
- timeline成果物SHA-256: `3b240912c833f87019a987772da79cd5c6b5832c806312cf31cdca0949dee193`
- 両commandとも固定Node、固定TSX loader、`NODE_OPTIONS`不存在を起動前記録し、終了0・stderr 0 byteだった。

### 2.2 B3工程入場

- 工程入場job: `evals/clip_composition/outputs/presentation/meaning-output-stage-admission-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/v002/02-b3-source-package-attempt-0001.json`
- job SHA-256: `7a8f3f9e7ade5b14092b2b5b45d15cf5bbf709463188e42bbedb93015119ec11`
- receipt: `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/admissions-v002/02-b3-source-package/attempt-0001/stage-admission-receipt.json`
- receipt SHA-256: `b3fe3d87c0ac7cb8fc5a74e68883065f1514423c53f142980a6f8a0bb2ea8863`
- 工程入場は5検査すべて合格し、終了0・stderr 0 byteだった。

### 2.3 B3本体の不合格

- 起動したjob path: `evals/clip_composition/outputs/presentation/meaning-boundary-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-b3-v001.json`
- job SHA-256: `a9914c45106047040efcb9c2cde63a5cb054f7840d85ce683c919cc68d65375a`
- job本文のschema検査: 合格
- 正式runnerが要求するpath: `evals/clip_composition/outputs/presentation/meaning-boundary-jobs/<jobId>/source-package-job.json`
- 実行結果: 終了1
- stdout: `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/b3-source-package-v001.stdout.json`
- stdout SHA-256: `80068dd66333c89e474bd2d55bbe5271348ff5fb82d93ed569ec3ae237d330bf`
- stdout内容: `MEANING_BOUNDARY_JOB_INVALID`、path `/job`
- stderr: 0 byte
- B3正式成果物: 未生成
- B3正式成果物root: 未使用のまま

## 3. 帰属

- 事実: runnerはjob本文を読む前に、job pathが固定形であることを検査する。
- 事実: 今回のjob本文は単体schema検査には合格したが、保存pathが固定形ではなかった。
- 帰属: 実行用jobの配置誤り。productionの意味計算、上流281文字、timeline、正式媒体、契約内容の不合格ではない。
- 推測ではない補足: 工程入場側はtarget job本文とbindingを検査したが、B3 runner固有のjob path形までは検査していないため、工程入場合格後に本体が拒否した。

## 4. 未確認

- 正しいpathへbyte同一jobを置いた場合にB3本体が合格するかは未確認。再実行していない。
- B3以降のB5／B6回答、意味package、二形式の描画結果は未確認。

## 5. 再開の最小案（未実施）

1. 不合格jobと記録を保持する。
2. 同じjob本文を正規path `.../<jobId>/source-package-job.json`へbyte同一で配置する。
3. 既存attempt-0001 receiptを上書きせず、B3工程入場v002のattempt-0002を作り、attempt-0001 receiptをsupersedesReceiptとして束縛する。
4. attempt-0002の工程入場が合格した場合だけ、B3本体を新たに1回実行する。
5. B3合格時だけ、既承認のB5最大2回→B6一回→意味package→基礎映像→crop→横型／縦型描画→QCへ戻る。

変更対象はjob配置1件と工程入場job 1件であり、production code、入力5項目、timeline、B3出力先、API条件は変えない。

## 6. 承認依頼文案

相談役レビュー済み。kawafmm裁定: B3正式jobの保存path誤りによる停止を確認した。不合格job・receipt・実行記録を保持し、job本文をbyte同一のままrunner固定pathへ配置すること、およびB3工程入場v002をattempt-0002として1回実行することを承認する。attempt-0001 receiptは上書きせずsupersedesReceiptとして束縛する。工程入場合格時だけB3本体を新たに1回実行し、合格後は既承認のB5最大2回→B6一回→意味package→基礎映像→crop適用→横型・縦型描画→QC→完成報告へ連続してよい。不合格、通信失敗、回答不受理、物理検査不合格、QC不合格は保存して停止する。production code、固定5項目、timeline、B3出力先、支出上限を変更しない。全正式commandで固定Node・固定TSX loader・`NODE_OPTIONS`不存在を記録する。
