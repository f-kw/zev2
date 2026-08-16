# ZEVO字幕品質v002 最終tree照合停止報告 v001

## 1. 結論

改訂後の完了条件に従い、baselineと既存正式成果物の最終照合を行った。

- baselineは203件の順序・名称・合否まで保存済み正本と一致し、86合格・117不合格である。
- 既存5系統の正式成果物は、各stable tagの登録tree、file集合、各file byteに一致した。
- A-v002の記録commitに含まれる2,887 fileは、欠落0件・byte差0件で一致した。
- ただし、A-v002の物理rootには記録commitへ含まれない既存の描画作業fileが54件残っていた。物理root全量を比較対象にすると2,941対2,887で不一致となる。

tree不一致を重大停止条件とする裁定に従い、追加物を削除・移動せず、完了扱いにせず停止する。

## 2. baseline 86/203 exact

| 項目 | 結果 |
|---|---:|
| tests | 203 |
| pass | 86 |
| fail | 117 |
| cancelled / skipped / todo | 0 / 0 / 0 |
| 保存済み正本とのID別順序・名称・合否 | 203/203一致 |

- TAP: `test-runs/20260815-zevo-caption-quality-v002-baseline-203-attempt-0001/tap.txt`
- TAP SHA-256: `a774b31720e2202a9786048105a9ab6b80a337d044ab09de5aa8b0113a7acd61`
- ID別比較: `test-runs/20260815-zevo-caption-quality-v002-baseline-203-attempt-0001/id-status-comparison.json`
- ID別比較 SHA-256: `1f1b6dd7776bc42d75a819dec57c84c6e4562a8c798f2d7753f35fc76cb33e91`
- stderr: 0 byte、終了code: 1、signal: none。既知117不合格を含む正本と同じ終了状態である。

## 3. 既存5系統

| ID | 登録tree | file数 | 結果 |
|---|---|---:|---|
| FOVT001 | `27affa2cff1e099d263f5a00ed9c4558be1300bd` | 25 | 一致 |
| FOVT002 | `454fcf002ac90b0d6ce72f63f55476ed9f8ffc72` | 21 | 一致 |
| FOVT003 | `53076722863d2c36d470cc4ce9503739406ec03a` | 35 | 一致 |
| FOVT004 | `ce2f5807db5ff63b83e1200bcec9f40796210327` | 35 | 一致 |
| FOVT005 | `5e65c51ad30a65f43b087a71b50f6172162b2c49` | 42 | 一致 |

- 読み取り照合: 5合格・0不合格（同一検査file内の非対象35件はpattern skip）。
- TAP: `test-runs/20260815-zevo-caption-quality-v002-final-tree-verification-attempt-0001/five-tree.tap`
- TAP SHA-256: `c3ecc8a213e1474982f76b61ed736b48e4ee2524c0e3b08a45cd5cfd00521927`
- stderr: 0 byte、終了code: 0、signal: none。

## 4. A-v002の不一致

### 4.1 記録対象file

- 正本commit: `542b35684a3ad67dbab042ca2bb3bff022e42023`
- 登録tree: `2b683b0d82672789bccd1508bc2c7c914c196750`
- 記録file: 2,887件
- 欠落: 0件
- 記録fileのbyte差: 0件

従って、commitへ記録されたA-v002成果物を本工事が1 byteでも変えた事実はない。

### 4.2 物理rootの追加物

commit外の追加54件は、次の2つの隠し描画作業rootだけに閉じる。

| 作業root | file数 | 実byte | 作成・最終更新 |
|---|---:|---:|---|
| `.a-v002-layer1-v3-option-b-proof-20260810-v006-renderer-work` | 26 | 47,516,222 | 2026-08-10 09:44:49〜09:46:38 JST |
| `.a-v002-layer1-v3-option-b-proof-20260810-v007-renderer-work` | 28 | 47,522,788 | 2026-08-10 11:55:31〜11:57:31 JST |
| 合計 | 54 | 95,039,010 | — |

両rootはA-v002記録commitの作成時刻（2026-08-10 15:02:58 JST）より前に作られた未追跡作業領域であり、今回の字幕品質・fixture製造工事が生成したものではない。既存2,887件の変更・欠落はないが、物理root全量一致の定義では追加物として不一致になる。

- 全量比較記録: `test-runs/20260815-zevo-caption-quality-v002-final-tree-verification-attempt-0001/a-v002-tree-verification.json`
- SHA-256: `3493b62f996e201ffbbd805655268e6acac3a05374c4802d8790e4851f7fe665`

## 5. 三分法

| 帰属候補 | 判定 | 根拠 |
|---|---|---|
| production・本工事の実装欠陥 | 該当証拠なし | 記録済みA-v002 2,887件は欠落0・byte差0。既存5系統も全一致。追加54件は本工事開始前から存在する。 |
| 実行環境・保存状態 | 追加物の直接帰属 | 追加物はA-v002描画時の未追跡work/lock領域2件だけで、記録commitより前に生成済み。 |
| 契約・検証境界 | 人間裁定が必要 | 「A-v002記録対象tree」をcommitに属するfile全量と読む場合は一致する。一方、root配下の未追跡作業領域まで含む物理全量と読む場合は不一致になる。今回の重大停止条件により後者を自己判断で除外しない。 |

## 6. 未実施・不変

- ZEVO字幕品質v002＋F/U fixture製造の完了報告: 未作成（完了条件未達扱い）。
- 追加54件の削除・移動・再登録: 0件。
- green 12不合格への修正: 0件。
- API通信、countTokens、generateContent: 0回。
- 追加費用: US$0。
- 正式描画、commit、stable tag: 0件。

## 7. 裁定が必要な一点

A-v002の最終照合境界を、次のどちらとして確定するか。

1. 記録commitに属する2,887 fileの欠落・byte差0件をtree一致とする。
2. commit外の既存描画作業root 54 fileも物理root全量へ含め、不一致の解消方針を別途決める。

どちらを採る場合も、本停止時点では既存成果物や追加作業領域を変更しない。
