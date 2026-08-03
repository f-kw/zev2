# 意味／表現境界 正式205件 attempt v005 停止報告 v001

日付: 2026-08-03  
外部通信: 0回  
費用: US$0  
正式成果物の生成・変更: 0件  
commit A: 未作成

## 1. 結論

正式205件の新attemptは`200 passed / 5 failed`で停止した。TAPは205件を最後まで記録したが、完了条件の205/205には達していない。同attemptで修正せず、既存合格gate 287件、既知baseline 181件、回帰後の既存3本tree最終照合、commit A、27 file SHA表へ進んでいない。

一つ前のattempt v004で見つかった「意味パッケージ参照のobject表現不一致」は、契約を変えず既存の複製処理へ揃える限定修正で解消方向へ進んだ。v005では、故障注入前に止まっていた`OEE006`が合格し、`OEE007/008`も故障注入後の判定まで進んだ。一方、残る5件の内側原因は未診断であり、合格とは報告しない。

## 2. 保存証拠

| 成果物 | path | SHA-256 | byte |
|---|---|---:|---:|
| attempt v004 TAP | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v004.tap` | `fe414f1f1dd916ef4ed3008b24d69b22ce87eb6faffaf2bf907bf71055d2d428` | 47,594 |
| attempt v004 stderr | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v004.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |
| attempt v005 TAP | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v005.tap` | `e77b34c6daf762dc3114eb436f0aa9f1268efc651ed1dadedaa503c2b312176d` | 47,158 |
| attempt v005 stderr | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v005.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |

両attemptとも、固定Node、固定TSX loader、`--test-concurrency=1`、承認済み10 test fileの一commandで実行した。開始前に同じ監視領域へ書き込む並行processがないことを確認した。

## 3. attemptごとの到達

| attempt | 合格 | 不合格 | 主な変化 |
|---|---:|---:|---|
| v003 | 197 | 8 | TAP 205 ID保存を成立。writer、後段fatal、Buffer比較が残った |
| v004 | 199 | 6 | `OCT001`、`OEE004`、path無しQC写像の`OEE009`が合格 |
| v005 | 200 | 5 | 意味パッケージ参照のobject境界を修正し、`OEE006`が追加合格 |

同じattempt内の修正・再試行はいずれも0回である。

## 4. v004後の読み取り診断

### 4.1 事実

- v004の6件は、共通描画計画を正式JSONへ直列化する前段で同じ外側fatalへ帰属した。
- 内側停止位置は、共通描画計画の構築後、正式byteを作る直列化処理だった。
- 内側例外は`TypeError: output formal JSON value is invalid`だった。
- 描画計画内で正式JSON値として不成立だった箇所はJSON Pointer `/meaningPackageBinding`の1件だけだった。
- その値は厳密JSON読取器由来のnull-prototype objectで、意味内容と4 fieldは正しかった。
- 描画計画の正式直列化は通常のplain objectだけを受理する。ほかの外来objectは既に既存の`structuredClone`を通していたが、意味パッケージ参照だけが元objectを直接保持していた。

### 4.2 帰属

これは、意味パッケージ参照を出力計画へ移す実装が既存のobject境界処理に届いていないproduction実装欠陥である。契約矛盾、入力内容不正、fixture不備ではない。

修正は、当該参照だけを既存と同じ`structuredClone`へ通す1点に限定した。正式schema、意味内容、受入条件、終了code、strict serializerは変更していない。fixtureや期待値も変更していない。

## 5. v005の不合格5件

| ID | TAPで確定した事実 | 未確認事項 |
|---|---|---|
| `OEE001` | 横型正常経路が期待`passed`に対して`fatal` | 内側stage・値・path・tool挙動 |
| `OEE002` | 縦型正常経路が期待`passed`に対して`fatal` | 同上。OEE001との同根性 |
| `OEE005` | 検査済み拒否の期待exit 1に対してexit 2 | 外側fatalの内訳 |
| `OEE007` | 故障注入後の期待stage `staged-artifact-validation`に対して`execution` | 故障注入後にどこでstageが失われたか |
| `OEE008` | 公開故障注入後の期待stage `publication`に対して`execution` | 同上 |

`OEE006`はv004のtrigger 0からv005で合格へ変わった。`OEE007/008`もtrigger 0のassertではなく後段stageのassertまで進んだ。このため、v004で確認したobject境界欠陥は修正経路に反映されたと観測できる。ただし、残る5件が一つの原因か複数原因かは未確認である。

## 6. 今回成立した修正と未完了

### 事実

- 明示writerは省略時の従来stdoutと同じbyteを返し、formal jobの一引数production起動は維持された。`OCT001`は合格した。
- 検査側のBuffer／文字列比較を実byte比較へ揃え、`OEE004`は合格した。
- pathを持たない既知QC違反をroot `""`へ写し、未知code・重複を拒否する検査は合格した。
- 新経路の内部計画名を既存QCが読む横型・縦型名へ合わせた。
- v005内の`OPF006〜008`は3/3合格し、既存の横型2本・縦型1本は各stable treeと一致した。

### 未完了

- 正式205/205。
- 既存合格gate 287/287。
- 既知baseline 64/181のexact不変確認。
- 上記回帰後の既存3本tree最終再照合。
- commit Aと27 file SHA表。

v005内の3本tree照合は途中時点の保全確認であり、承認済み順序が要求する回帰後の最終照合の代用にはしない。

## 7. 事実・推測・未確認

### 事実

- v005は205件中200件合格、5件不合格。
- v004で診断したnull-prototype objectは、意味パッケージ参照の移送1か所に由来した。
- その限定修正後、OEE006は合格し、OEE007/008は一段後まで到達した。
- 外部通信、API費用、正式成果物変更、commitは0件。

### 推測

- OEE001/002/005/007/008は、共通経路のさらに後段にある同じfatal、または少数の積層原因へ収斂している可能性がある。

この推測は修正根拠に使っていない。

### 未確認

- 残る5件の内側原因と同根性。
- 修正が必要な側がproduction、fixture、検査、契約のどれか。
- 修正後に205/205、287/287、64/181、3本tree最終照合が成立するか。

## 8. 停止と次の判断

正式205件に不合格があるため、同attempt修正禁止に従って停止した。同じOEE地点で層状の停止が続いているため、追加patchを自動で積まない。

次はkawafmmが、次のどちらかを裁定する必要がある。

1. 保存済みattempt v005と既存実装だけを使い、残る5件の内側stage・値・path・tool挙動を読み取り診断する。変更・再実行・通信は行わず、三分法の帰属と計画差し戻し案を提示して停止する。
2. ZEV憲法の同地点2停止規律をここで適用し、個別patchを打ち切って、意味／表現境界の実装計画自体をkawafmmへ戻す。

どちらの場合も、既存3本とstable tagは不変のまま維持する。
