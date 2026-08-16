# ZEVO字幕品質v002 v012 F局所正式attempt-0004 停止報告 v001

- 日付: 2026-08-13
- 判定: 停止
- API通信: 0回
- 費用: US$0
- 正式描画: 0回
- 同attempt内修正: 0件

## 1. 結論

F局所正式attempt-0004は0/3、終了code 1で停止した。3件とも外側は`fatal / input-reread / CUE_PROOF_EXECUTION_FAILED`、内側観測は`dependency-initialization / import-runtime-dependencies / targetPath=null / osCode=null`だった。

内側の停止段階と操作までは正式TAPから読めるようになった。一方、実際に失敗した依存moduleのpathが残らず、例外本文・stackも保存しない契約であるため、production欠陥か実行環境・検査設営欠陥かを一意に確定できない。推測で補わず、v012の成立条件未達を契約判断として停止する。

U局所、正式46件、直接影響回帰、green 287、baseline 86/203、tree照合は未実施である。

## 2. 実行前に合格した事実

- proof期待/一意: 489/489
- 重点owner: ZCQ001=22、ZCQ007=17、ZCQ018=30、ZCQ027=34、ZCQ042=36、ZCQ043=12、ZCQ044=35
- approved contract binding: source/B5/B6/selection/proof = 11/11/12/13/13
- implementation binding: source/B5/B6/selection/proof = 36/11/19/41/51
- 読み取り対象: 97/97
- runtime実体: 7/7、登録SHA一致
- directory前提: 5/5
- 正式output/staging未使用: 2/2
- 起動条件: Darwin arm64 native、固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、Chromium起動可能、FFmpeg/FFprobeの`/opt/homebrew`実体・SHA一致
- F moduleのsource authored named export: 6件exact
- 返却envelopeと三つの保存report schemaの分離: 実装・検査上は成立

したがって、前回原因だった親directory不足、runtime実体不一致、output root再利用では今回の停止を説明できない。

## 3. 正式attemptの実測

| 検査 | 結果 | 外側 | 内側観測 |
|---|---|---|---|
| ZCQ042 | 不合格 | fatal / input-reread / CUE_PROOF_EXECUTION_FAILED | dependency-initialization / import-runtime-dependencies / null / null |
| ZCQ043 | 不合格 | fatal / input-reread / CUE_PROOF_EXECUTION_FAILED | dependency-initialization / import-runtime-dependencies / null / null |
| ZCQ044 | 不合格 | fatal / input-reread / CUE_PROOF_EXECUTION_FAILED | dependency-initialization / import-runtime-dependencies / null / null |

3件は同じ複合import操作で止まった。しかし、この一致だけでは内部の同一module・同一例外を証明できないため、「同一原因」とは確定しない。

正式output rootとstaging rootは実行後も未作成である。fixtureとTAP等の失敗証拠は版付きpathへ保持した。

## 4. 三分法

### 事実

- F productionは20件のruntime依存を一つの`dynamicDependencies`処理内で順にimportする。
- 失敗はその複合処理の途中で発生した。
- v012実装は複合処理全体の`targetPath`を`null`として返した。
- TAPは内側4 fieldを保存したが、失敗moduleのpathと例外型を特定できない。

### 帰属

- production欠陥: 未確定
- fixture・検査設営／実行環境欠陥: 未確定
- 契約判断: 必要

必要な判断は、staging前の複数依存importについて、どの実moduleで失敗したかを生文字列なしで一意に残す契約をどう閉じるかである。現v012は`targetPath`をworkspace相対pathとして残す要求を、複合import失敗時に満たしていない。

### 推測

0件。module名、例外型、production／設営帰属を消去法で埋めない。

### 未確認

- 20依存のうち実際に失敗したmodule
- import失敗の例外型
- 3件が同じ内側原因か
- productionと実行環境・検査設営のどちらが原因か

## 5. 歯止めの適用

今回の帰属は検査設営起因と確定していないため、「検査設営3回目」のF/U fixture独立工程化歯止めは発動させない。代わりに、内側観測追加後も帰属不能だった場合の裁定どおり、追加診断・修正案・再attemptを行わず契約判断へ戻す。

## 6. 証拠

- v012追補: `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md`
  - SHA-256: `668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f`
- 実行前record: `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-v012-f-preflight-record-20260813-v001.md`
  - SHA-256: `c91e7257ff8d9b31fc8e3e4af0f6b865b9db2026214f92251c4fc7bc18dfd2ae`
- 環境preflight: `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-v012-f-u-environment-preflight-20260813-v004.json`
  - SHA-256: `675f1c9aaeb919415f3d330111c70ffafedb51f6839e1bd3115bea956d7c0946`
- TAP: `evals/clip_composition/reports/presentation/test-runs/20260813-zevo-caption-quality-v002-v012-f-formal-attempt-0004/tap.log`
  - SHA-256: `094ad68ce0b158fc3d59319b1f885a474972cd19bda9816340ab02567a528d28`
- stderr: `evals/clip_composition/reports/presentation/test-runs/20260813-zevo-caption-quality-v002-v012-f-formal-attempt-0004/stderr.log`
  - 0 byte
  - SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- 終了code: `evals/clip_composition/reports/presentation/test-runs/20260813-zevo-caption-quality-v002-v012-f-formal-attempt-0004/exit-code.txt`
  - 値: 1
  - SHA-256: `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865`

## 7. 停止位置

- 完了: v012起草、DECISIONS記録、実装、proof・binding・module surface・環境preflight、F正式attempt証拠保存
- 停止: F局所0/3
- 未実施: U局所、正式46件、直接影響回帰、green 287、baseline 86/203、既存5 treeとA-v002記録対象tree照合、commit、API通信、描画、stable tag
