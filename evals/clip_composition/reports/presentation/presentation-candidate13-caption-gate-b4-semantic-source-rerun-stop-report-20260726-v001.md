# candidate 13 B4 後続133件 新attempt停止報告 v001

- 日付: 2026-07-26
- 状態: 正式133件が126/133で不合格。承認済み停止条件に従い停止
- 人間作業: 0件
- コード、fixture、期待値、正式成果物の変更: なし
- 自動再試行: 0回

## 1. 結論

監視対象の外へTAPを保存する新attemptを1回だけ実行した。
結果は126件合格、7件不合格だった。

旧attemptの7不合格はTAPを監視対象内へ書いた交絡のため正式判定に使えなかったが、
今回その交絡を除いても同じ7検査が不合格になった。
したがって、保存先交絡だけでは7不合格は解消しなかったことが正式に確認された。

原因診断、コード修正、fixture修正、期待値変更、部分再実行は行っていない。
回帰95件とcandidate 13読み取り専用preflight v002にも進んでいない。

## 2. 承認前確認への回答と実行順

### 2.1 前段88件

修正と正式88件は完了済みである。

| 項目 | 記録 |
|---|---|
| commit | `19da1f6b149b9bfab3891f9dd1f7fdd6b564b57d` |
| TAP | `evals/clip_composition/outputs/presentation/test-runs/20260726-caption-b4-timeline-repair-v001/display-pair-v003-88.tap` |
| 結果 | 88/88 |

133件は88件完了後にだけ開始しており、承認済み順序を維持した。

### 2.2 旧TAP保存先の交絡

交絡は事前予防ではなく、旧133件の実行中にTAPを
`evals/clip_composition/outputs/presentation`配下へ書いたために生じた実測発見である。

停止報告
`evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-timeline-repair-downstream-stop-report-20260726-v001.md`
へ記録し、commit `4c64fff878ee1355edb9ffa3f29dbd149ea1cc8f`で正式判定から除外した。

## 3. 新attemptの事前固定

| 項目 | 固定内容 |
|---|---|
| 開始commit | `b550779aed3b10476b0984c5817dafdf82a1ba7c` |
| 監視対象の実体path | `/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation` |
| 証拠保存先の実体path | `/Users/kawafmm/workspace/zev2/evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-semantic-source-rerun-v001` |
| path検査 | 同一でなく、証拠保存先は監視対象の子孫でもない |
| Node | v20.19.6、既存束縛hash一致 |
| TSX | 4.22.3、既存束縛hash一致 |
| esbuild | 0.28.0、JavaScript実体・binaryとも既存束縛hash一致 |
| 実行回数 | 1回 |
| 自動再試行 | なし |

環境とpath検査の詳細は
`evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-semantic-source-rerun-v001/execution-environment.json`
に保存した。

## 4. 正式133件の結果

| 項目 | 結果 | 合格条件 |
|---|---:|---:|
| 検査総数 | 133 | 133 |
| 合格 | 126 | 133 |
| 不合格 | 7 | 0 |
| skip | 0 | 0 |
| todo | 0 | 0 |
| cancelled | 0 | 0 |
| process終了 | 1 | 0 |

TAP:
`evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-semantic-source-rerun-v001/semantic-source-package-133.tap`

TAP SHA-256:
`469c04a7cf98828bfd811ef77b101f7dc50956c77cfc953d404bd5d9b835f29c`

## 5. 不合格7件

| 番号 | 処理の意味 |
|---:|---|
| 44 | 検査用の監視投影とproduction開始時の監視投影が同じ非空入力を同一hashとして扱えること |
| 122 | 読み取り専用preflightで、復元済み入力を2回とも既存の組み立て処理へそのまま渡すこと |
| 123 | 各組み立て段階の失敗を所定の組み立て失敗へ帰属し、後段を呼ばないこと |
| 124 | 正式公開の各安全確認で停止した後に、後続の公開処理を行わないこと |
| 125 | 正式成果物の読取失敗と完全snapshot不一致を、定めた別々の失敗へ帰属すること |
| 126 | 公開失敗記録後に開始前報告を分類不能になった場合、部分報告を残さずfatal停止すること |
| 131 | production CLIの実process正常経路が終了0となり、成功と失敗の出力先を分離すること |

旧交絡attemptと不合格番号・検査名は一致した。
ただし、これだけから7件の共通原因や個別原因は確定しない。

## 6. 停止点

承認済み条件「133/133の場合だけ後続へ進む」を満たさなかったため、以下は未実施である。

- 回帰95件
- candidate 13読み取り専用preflight v002
- B4完了認定
- `stable/b4-complete-20260726`相当のtag
- JOURNALのB4完了entry
- B5承認依頼の正式起草

最新安定点は引き続き`stable/b3-complete-20260725`である。

## 7. 副線消化状況

今夜の待ち行列5件は、commit
`f282222000c6a36de0d0efc60a3dc8dc8fa422aa`
で既に人間作業0件の報告として全件作成済みである。
同じ内容の再作成や共有文書への転記は行っていない。

| 順 | 副線 | 状態 |
|---:|---|---|
| 1 | B5設計入力の差分棚卸し | 完了済み |
| 2 | B6受入要件棚卸し | 完了済み |
| 3 | ゲートC接続差分 | 完了済み |
| 4 | 残件整理 | 完了済み |
| 5 | JOURNAL証拠索引 | 完了済み |

## 8. 次の人間判断

次へ進む場合の最小の依頼は、**正式な7不合格を読み取り専用で原因診断し、
三分法（production実装、検査、契約）へ帰属する作業の承認**である。

この診断には人間の媒体視聴・時刻入力・候補判定は不要で、人間作業は承認1件だけである。
診断前に修正内容や再実行を承認する必要はない。
