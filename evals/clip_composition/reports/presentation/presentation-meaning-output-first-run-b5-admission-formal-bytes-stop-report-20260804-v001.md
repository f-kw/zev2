# 意味／表現分離 初回実データrun B5工程入場 formal byte不合格停止報告 v001

- 日付: 2026-08-04
- 対象run: `qdczJpv8RCc-candidate-59-meaning-output-first-run-v001`
- 停止段階: `03-b5-token-measurement` 工程入場
- API通信: 0回
- 費用: US$0

## 1. 結論

B3のjob配置訂正、工程入場attempt-0002、B3本体は合格した。続くB5工程入場は、工程入場jobのJSONが意味上は妥当でも正式serializerのexact byte表現ではなかったため、job本文を読む入口で終了1となった。B5本体、countTokens、B6、意味package、基礎映像、二形式描画には進んでいない。同attemptでjobを書き換えたり再実行したりしていない。

## 2. 事実

### 2.1 B3の完了

- 正規pathのB3 jobは不合格時jobとbyte同一だった。
- B3工程入場attempt-0002: 5/5合格。
- B3成果物: `evals/clip_composition/outputs/presentation/meaning-boundary-source-packages/qdczJpv8RCc-candidate-59-meaning-output-first-run-b3-v001/meaning-boundary-source-package.json`
- B3成果物SHA-256: `f1c08064f8307dd2da0967f7c9e6d74e8027de81c0bd4828db0c1cab1cbdad15`
- B3成果物canonical SHA-256: `8de6370af6dacdf651aae38a08dea9658b4490fc7b77e777c16e245b36be00cf`
- 投影: 281 atom occurrence、2 container、164 boundary candidate。
- B3本体: 終了0、stdoutと成果物byte一致、stderr 0 byte。

### 2.2 B5工程入場の停止

- 工程入場job: `evals/clip_composition/outputs/presentation/meaning-output-stage-admission-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/v002/03-b5-token-measurement-attempt-0001.json`
- 工程入場job SHA-256: `7265a3c1828ac5a9a2e7ca70fc92a08793eaa74365dacbe17d1c26ac0073e8b4`
- 通常のJSON parseと値validator: 合格。
- 正式有限数値JSON decoder: `non-formal-bytes`で拒否。
- 実行結果: 終了1。
- stdout: `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/b5-token-measurement-stage-admission-v002-attempt-0001.stdout.json`
- stdout SHA-256: `5b2602d91efa29946c5fc272ff465a1894a7734b3ee3e22066aba77ea9e03778`
- stdoutの所有違反: `RUN_INPUT_PUBLICATION_JOB_INVALID`、停止stage `job-validation`。
- stderr: 0 byte。
- stage 03 receipt: 未生成、root未使用。
- B5出力root: 未生成・未使用。

### 2.3 B5 target jobの静的確認

- B5 target job: `evals/clip_composition/outputs/presentation/meaning-boundary-b5-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-b5-v001.json`
- target job SHA-256: `132ee84f2d3c78c842f23cca4c77c1a6ee8e66e8a5dbb54ec58a19496e93e222`
- 通常のJSON parseとB5値validator: 合格。
- 正式有限数値JSON decoder: `non-formal-bytes`で拒否。
- B5 runnerは未起動であり、API keyの読取・countTokens通信は0回。

## 3. 帰属

- 事実: 両jobには一行に圧縮した入れ子object／arrayがあり、既存正式serializerが出す2-space・要素別改行のexact byteと一致しなかった。
- 帰属: 手作業でjobを組み立てた際の正式byte製造ミスである。
- productionの値検査、B3内容、公式snapshot、支出条件、Gemini APIの不合格ではない。
- B5工程入場は正式byteでないjobを実行前に拒否しており、検査は意図どおり働いた。

## 4. 未確認

- 正式serializer byteへ直したB5工程入場が合格するかは未確認。
- countTokens、費用上限判定、Gemini回答、意味package、横型／縦型完成物は未確認。

## 5. 再発防止を含む最小再開案（未実施）

1. 現在の非正式B5 target jobと工程入場jobを、各SHA付きの失敗証拠として版付きtest-run pathへbyte同一保存する。
2. B5 target jobの値は変えず、既存正式serializerが生成するbyteだけへ置換する。B5の固定job pathは契約上変更できないため、置換前byteを上記1で保持する。
3. stage 03工程入場jobは旧ファイルを保持し、別の版付きjob pathへ同じ値を正式serializer byteで固定する。receipt rootは未使用なので`attemptOrdinal: 1`を維持する。
4. 今後は全正式commandの起動前checklistへ、Node／TSX／`NODE_OPTIONS`に加えて、対象jobが正式decoderで受理され、値validatorにも合格することを必須記録する。
5. stage 03工程入場を新たに1回実行し、合格した場合だけB5本体へ進む。
6. 以後は既承認どおり、B5最大2回→上限判定→B6一回→意味package→基礎映像→crop→横型／縦型→QC→完成報告へ進む。

値、production code、B3、固定5項目、API request内容、出力root、支出上限は変更しない。

## 6. 承認依頼文案

相談役レビュー済み。kawafmm裁定: B5工程入場jobとB5 target jobが値validatorには合格したが正式serializerのexact byteではなく、通信前に拒否された停止を確認した。両jobの現byteをSHA付き失敗証拠として版付きtest-run pathへ保持し、値を一切変えず既存正式serializerのbyte表現へ直すことを承認する。B5 target jobは契約固定pathで置換し、旧byteを証拠保存する。stage 03工程入場は旧jobを保持した別の版付きjob pathから、未使用のattempt-0001 receipt rootへ新たに1回実行する。以後の全正式commandは固定Node・固定TSX loader・`NODE_OPTIONS`不存在に加え、対象jobの正式decoder受理と値validator合格を起動前checklistへ記録する。工程入場合格時だけB5最大2回へ進み、その後は既承認のB6一回→意味package→基礎映像→crop適用→横型・縦型描画→QC→完成報告へ連続してよい。不合格、通信失敗、回答不受理、物理検査不合格、QC不合格は保存して停止する。production code、固定5項目、B3、API requestの意味、支出上限を変更しない。
