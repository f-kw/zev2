# 意味／表現境界 正式205件 attempt v003 停止報告 v001

日付: 2026-08-03  
実行回数: 1回  
再修正・再実行: 0回  
外部通信: 0回  
費用: US$0

## 1. 結論

正式205件は`197 passed / 8 failed`で不合格となった。承認済み停止規律に従い、同attemptで修正せず、既存gate 287件、既知baseline 181件、回帰後の既存3本tree最終再照合、commit A、27 file SHA表へ進んでいない。

一方、今回の主目的の一つだったTAP捕捉は成立した。TAPは205件の結果行を全て保持し、承認済みID集合との照合は`205 unique / missing 0 / duplicate 0 / extra 0`だった。

## 2. 保存証拠

| 成果物 | path | SHA-256 | byte |
|---|---|---:|---:|
| 正式TAP | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v003.tap` | `cc43dae707e7623aa622904d199293949955317018a43133141cbe0afcab948c` | 213,785 |
| test runner stderr | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v003.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |
| 三点修正設計 | `evals/clip_composition/reports/presentation/presentation-meaning-output-boundary-attempt-v002-three-part-repair-design-20260803-v001.md` | `9209c49fe570ec01c21067af68855f95e70a011668cabe0c8fbf6e8e0e477372` | — |

実行環境は承認済み固定Node、固定TSX loader、`--test-concurrency=1`、承認済み10 test fileの一commandである。実行前に、同じ検査を行う並行processがないことを確認した。

## 3. 事実

### 3.1 三点修正で成立したこと

- `MIP030`は合格した。macOSの`/var`と`/private/var`差をfixture側で解消し、productionの拒否順を変えずsymlink親拒否へ到達した。
- `MIP033`も合格した。MIP030の途中停止がなくなり、既存の違反code集合記録が完走した。
- attempt v002で最初に観測したruntime toolの`unsafe-file` stackは、attempt v003のTAPには現れなかった。
- `OEE004`は、正式runtime照合を通過して意図した`TITLE_STYLE_UNAVAILABLE`、exit 1、control 2件、render 0件まで成立した。
- TAPの15 ID欠落は解消し、OEE006〜009、OPF001〜011を含む205 IDが全て一度ずつ記録された。

### 3.2 不合格8件

| ID | 観測事実 | 現時点の位置づけ |
|---|---|---|
| `OCT001` | O13 sourceに対し、一引数の`runPresentationOutputJobCliV001([jobPath])`を要求する既存regexが、明示writerを持つ二引数呼出しを拒否した | 既存の「実CLI入口」検査とTAP分離方式の契約解釈が衝突。人間判断なしに期待を書き換えない |
| `OEE001` | 横型正常経路が`passed`でなく`fatal` | runtime symlink拒否より後段の内側原因はTAPに保存されず未確認 |
| `OEE002` | 縦型正常経路が`passed`でなく`fatal` | 同上。attempt v002のraw`unsafe-file`とは異なる次層まで進んだが、内側原因未確認 |
| `OEE004` | 機能上の拒否内容、exit、成果物集合は成立後、CLI stdoutのactual `Buffer`とserializerのexpected文字列が型不一致 | byte内容差ではなく比較型の不一致。帰属の正式診断前 |
| `OEE005` | 本来exit 1のcommon core違反がexit 2 | OEE001/002と同じ後段fatalの可能性はあるが未確認 |
| `OEE006` | interference trigger期待1に対し0 | 意図したwork段階より前で停止。内側原因未確認 |
| `OEE007` | interference trigger期待1に対し0 | 同上 |
| `OEE008` | interference trigger期待1に対し0 | 同上 |

`OEE009`と`OPF001〜012`は合格した。したがって正式205件内の`OPF006〜008`による既存3本stable tree照合は全件合格している。ただし205/205後に行う予定だった回帰後の最終再照合は実施していない。

## 4. 推測

- OEE001/002/005〜008は、runtime toolのsymlink入口を通過した後、共通描画またはその直前にある同一の次層fatalで止まった可能性が高い。正常横型・正常縦型・描画失敗負例・3 interference負例が同じ前処理を共有するためである。
- OEE004の不合格は、旧捕捉処理も文字列chunkをBufferへ変換していたため、今回のwriter追加が新しくbyteを変えたのではなく、前回は先行fatalで未到達だった潜在的な検査比較型不一致が露出した可能性が高い。

この二点は推測であり、合格・修正根拠には使わない。

## 5. 未確認

- OEE001/002/005〜008の内側fatalの具体的stage、値、path、tool挙動。
- OEE004のactual/expected byteが型以外にも異なるかどうか。
- 明示writerを同じ正式CLI exportの検査入口として認め、OCT001の一引数source regexを改訂してよいか。

## 6. 停止理由

今回の修正方式はTAP 205 ID保存という目的を達成したが、`OCT001`が「正式CLIは一引数で直接呼ぶ」という既存検査を不成立にした。これは検査期待を実装へ合わせて無断変更できる事柄ではなく、契約解釈を要する。したがって、承認条件どおり設計判断をkawafmmへ戻す。

また、正式205件に8不合格があるため、同attempt修正禁止に従い後続回帰を実行しない。

## 7. 次に必要な判断

1. TAP分離について、同じ正式CLI exportへ明示writerを渡す方式を正規の検査入口として認めるか。一引数呼出しを絶対条件とする場合は、別のTAP分離方式を契約から設計し直す必要がある。
2. OEE後段fatalを保存済みattempt v003と既存実装だけで読み取り診断するか。

いずれも本報告では着手しない。既存3本、stable tag、正式成果物は変更していない。
