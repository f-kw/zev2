# 実行入力記録・crop適用 正式検査attempt v002 停止報告

- 日付: 2026-08-03
- 状態: **不合格停止**
- 外部通信: 0回
- 費用: US$0
- API通信、正式生成、描画: 0回

## 1. 到達点

承認済みの二原因を、契約・schema・違反code・正式成果物を変えず、承認済み12 file内の4 fileで限定修正した。

1. 実行入力記録のfixtureは、crop成果物の有限小数を整数専用入口へ渡さず、出力側productionが既に使う有限数値対応の正規化入口を再利用するようにした。
2. crop適用処理は、基礎映像と実行入力の既存validatorを複製せず、必要時に同じ正本moduleから読み込むようにした。これに伴い、crop適用の構築結果を待ってから既存の判定・公開へ進むよう、正式runnerと承認済み検査の呼出しを揃えた。

production影響の確認では、修正前に正式出力runnerも検査と同じTSX変換エラーで起動不能だった。修正後は同じ固定Node・固定TSXでmodule loadを通過し、引数なし起動に対する契約済みfatal（終了code 2、job検査段階）まで到達した。

## 2. 正式228件の結果

正式検査は新attemptとして頭から一回だけ実行した。同じ正式検査やfixture生成を行う並行processがないこと、追加`NODE_OPTIONS`がないことを開始前に確認した。

| 項目 | 結果 |
|---|---:|
| 全件 | 228 |
| 合格 | 222 |
| 不合格 | 6 |
| skipped / cancelled / todo | 0 / 0 / 0 |
| 実行時間 | 39,980.022292 ms |

二原因に対する直接観測は次のとおり。

- 群A: 実v006参照3件を使う正式publication runner検査は、test 110として合格した。
- 群B: 前attemptでmodule load前に落ちた4検査fileは全て読み込まれ、228件全IDまで到達した。crop適用coreの正常・拒否経路であるOSR009も合格した。

一方、後段で次の6件が不合格となった。

| ID | 検査の意味 | TAPで確定した差 |
|---|---|---|
| OEE001 | 合成横型の意味packageから描画成果物までの一気通貫 | 期待`passed`、実測`fatal` |
| OEE002 | 合成縦型のcrop前提一気通貫 | 期待`passed`、実測`rejected` |
| OEE005 | 描画core／QC不合格の検査済み拒否への帰属 | 期待終了1、実測終了2 |
| OEE007 | staging不合格時に旧公開処理を呼ばないこと | 期待呼出1、実測0 |
| OEE008 | staging合格後だけ既存commit入口を呼ぶこと | 期待呼出1、実測0 |
| OSR010 | 実v006原本からのcrop適用runner一回公開 | 期待`passed`、実測`fatal` |

## 3. 保存証拠

| 証拠 | path | SHA-256 | byte |
|---|---|---|---:|
| TAP全文 | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-run-input-crop-v001/formal-228-attempt-v002.tap` | `d267f7371dc7e155e9698376eba91e85daead84574a006feefda6e96830c39c4` | 52,442 |
| stderr | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-run-input-crop-v001/formal-228-attempt-v002.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |
| 二原因診断・修正設計 | `evals/clip_composition/reports/presentation/presentation-meaning-output-run-input-crop-two-cause-diagnosis-and-repair-design-20260803-v001.md` | `ebb3f5cb43abd856a61212bfd9ca385a1edd5f722f75c2c873d67ba38b248f19` | - |

限定修正後の4 file SHA-256は次のとおり。

| file | SHA-256 |
|---|---|
| `presentation_meaning_output_run_input_record_v001.test.mjs` | `06cf286a2a39b96f916a186b756dd284bf143d96f998907c541a57e47fd6edc5` |
| `presentation_output_crop_application_v001.mjs` | `322fdc1e06a13600c522f577913336c6f042851305880e5053b8728f2d8640d3` |
| `run_presentation_output_crop_application_job_v001.mjs` | `7f14151dee5e64b8cc414bde37a1f62cff861682545613e58492951e944774d8` |
| `presentation_output_style_resolver_v001.test.mjs` | `e8cb161e7389f844c7019fd21ec630939bb457cddd14a4362330bd37d079560f` |

## 4. 事実・推測・未確認

### 事実

- 前attemptを止めた有限小数のfixture正規化失敗は解消し、対象の正式publication検査は合格した。
- 前attemptを止めたTSX module変換失敗は、正式production runnerと正式検査の双方で解消した。
- 新attemptは全228 IDを実行し、222件合格・6件不合格だった。
- 不合格後に修正、部分再実行、既存gate、baseline、既存3本tree照合、実行入力記録の固定へ進んでいない。

### 推測

- 6件は、前のmodule load停止を越えたことで初めて観測できた後段経路の問題である可能性が高い。ただし、同じ原因か複数原因かはまだ判定していない。

### 未確認

- 6件それぞれの内側停止段階、値、path、tool挙動。
- production欠陥、fixture／検査設営欠陥、契約矛盾の三分法による帰属。
- OEE001／002／005／007／008とOSR010の同根性。
- 既存合格gate 287/287、既知baseline 64/181、既存3本tree SHA不変。

## 5. 停止点

正式228件に不合格が1件以上あったため、承認条件どおり同attemptで直さず停止した。

未実施の後続は、既存gate、baseline、既存3本照合、実行入力記録の正式固定、固定5項目の実行前下書き、B5/B6、二形式描画である。再開には、保存済みattempt v002を使った6件の読み取り診断と、その結果に基づく次の人間裁定が必要である。
