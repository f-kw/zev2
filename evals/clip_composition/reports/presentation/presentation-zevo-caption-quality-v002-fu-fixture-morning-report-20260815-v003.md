# ZEVO字幕品質v002 F/U fixture進行報告 v003

## 結論

新fixtureSetの製造とreceipt admissionは成立したが、Fはproof jobのfile basenameとjob IDの不一致で0/3停止した。追加修正禁止に従い、U以降は未実施。

## ゲート別結果

| gate | 結果 |
|---|---:|
| override分類 preflight | 2件／24件、合格 |
| fixture job decode/validator | 合格 |
| binding | implementation 52/52、contract 17/17 |
| fixture正式製造 | passed、48 file |
| F/U admission | passed |
| F局所 | 0/3、job-read拒否 |
| U局所 | 未実施 |
| 正式48件・直接影響回帰 | 未実施 |
| green・baseline・tree | 未実施 |

## fixtureSetId履歴

| set | 状態 |
|---|---|
| selftest attempt-0001 | 公開前停止、証拠保持 |
| selftest attempt-0002 | 公開後admission停止、root保持 |
| selftest attempt-0003 | 新規2検査合格、root保持 |
| formal attempt-0001 | 48 file製造合格、旧環境hook停止、root保持 |
| formal attempt-0002 | 48 file製造合格、null扱いhook停止、root保持 |
| formal attempt-0003 | 48 file製造・admission合格、proof job basename不一致でF停止、root保持 |

削除・上書き・root再利用は0件。

## 修正権

- 当初の限定修正権: 2/2使用済み。
- 人間が個別承認したreceipt一本化: 実施済み。
- 人間が個別承認したoverride null対象選択訂正: 実施済み。
- 今回F停止後の修正: 0件。

## 要裁定

増加1件。fixture製造側でformal proof jobを`<jobId>.json`へ置き、admissionでconsumerのbasename/job ID規則を検査する修正の可否。

描画疎結合化、renderer表現力、provider再評価の要裁定は増減0で凍結を維持した。

## 外部作用

通信0回、費用US$0、正式描画0回、commit 0件、stable tag 0件。

