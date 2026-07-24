# candidate 13 caption Gate B2 4原因＋公開再照合 全件検査停止報告 v001

- 日付: 2026-07-24
- 状態: **package側全件検査で停止**
- 正本設計:
  `presentation-candidate13-caption-gate-b2-seven-failure-four-cause-repair-design-20260724-v001.md`
- 実装・証拠固定: 本報告と同じcommit
- 人間作業: 0件・0分

## 1. 結論

承認済みの4原因修正と、公開後の7ファイルを生成時の正本へ再照合する処理を、許可された2ファイルだけへ実装した。

ただし全件実行後の静的再監査で、公開読取snapshotのpathをstaging／publishedの正規rootへ束縛する承認済み要件が未実装と判明した。原因Bの新規対照にも、期待する違反pathだけが出たことを完全一致で確認しない検査不足がある。したがって本attemptは、検査不合格だけでなく**公開再照合Pの実装未完了**でも停止しており、「4原因＋公開再照合を完成した」とは扱わない。

package側132件を先頭から一度だけ実行した結果は、**127合格・5不合格**だった。部分合格とは扱わず、そのattempt内で修正・再実行せず停止した。

不合格は118、119、123、124、132。上流の独立停止は4件で、132は118が途中停止した派生である。

## 2. 実装した処理

### 2.1 担当の一意化

同じ違反名が複数工程で使われる場合でも、実際の読取時点、失敗段階、記録位置から担当工程を一つに決める。全候補工程へ同じ違反を複製しない。

### 2.2 hashと参照関係の分離

保存内容のhash不一致と、成果物ID・参照先等の関係不一致を別の失敗として検査する。

### 2.3 二種類の順序の分離

公開ディレクトリの一覧はUTF-16ファイル名順、7成果物を読む順序は固定製造順として別々に検査する。

### 2.4 子ファイルI/O失敗の保持

個別成果物の読取失敗を親全体の内容不正へ潰さず、どの子のどの読取位置で失敗したかを保持する。壊れた子は正常内容として利用しない。

### 2.5 公開後の再照合

stagingとpublishedの7成果物を、同じrunの第1生成結果へbyte、file hash、意味内容のhash、JSON内容で再照合する。別の自己整合packageへ丸ごと差し替えても合格させない。

実装後監査で、内容とfileNameは照合する一方、snapshotの実pathが各公開root配下の期待pathそのものかを照合していないことを確認した。安全な別pathから同じbyteを読んだ場合を拒否できないため、この処理は未完成である。修正・再実行は停止条件に従って行っていない。

## 3. 変更範囲

変更したコードは次の2ファイルだけ。

1. `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs`
2. `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs`

実装後SHA-256:

| 対象 | SHA-256 |
|---|---|
| package検査本体 | `c1a757141303b5328bc6d64473586f047625b5d1666dea5a8170f1939b7ae479` |
| package検査コード | `a598180612de5b7b80b14086965078b9217d814be6108449f52242327fc5b346` |

変更禁止対象の確認:

| 対象 | SHA-256 | 結果 |
|---|---|---|
| package正式実行処理 | `1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff` | 承認値と一致 |
| Gate A読み取り専用実行・検証処理 | `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352` | 承認値と一致 |

依存追加、違反語彙追加、schema変更、正式成果物変更はない。

## 4. 全件検査の実測

- コマンド:
  `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs`
- 実行回数: 1
- tests: 132
- pass: 127
- fail: 5
- cancelled / skipped / todo: 0 / 0 / 0
- Node報告時間: 159,800.832583 ms
- TAP:
  `test-runs/20260724-caption-b2-four-cause-publication-revalidation-v001/package.tap`
- TAP SHA-256:
  `b5d7e5b71af2597301adbb012d3b0de04b9e6f67d8fa1928b5312da2a9cb6350`
- stderr:
  `test-runs/20260724-caption-b2-four-cause-publication-revalidation-v001/package.stderr.txt`
- stderr: 0 byte
- stderr SHA-256:
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

## 5. 不合格の切り分け

| test | 実測した最初の停止 | 帰属 | 現時点の判断 |
|---:|---|---|---|
| 118 | 独立した`PACKAGE_HASH_MISMATCH`が2件なのに1件だけを期待 | 検査fixture／oracle | manifest自身の宣言hashとreport内のmanifest参照hashを同時に変えている。異なる2 pathの2件は契約どおり。原因Bの新しい対照はこの前に通過済み |
| 119 | 自己整合別packageの組立前に`invalid package job` | 検査fixture | 別package用の保存先が必須の`segmenter-boundary-evidence/`配下でなく、公開再照合へ到達する前に正しく拒否された |
| 123 | 一覧欠落1件の想定に、全7子のI/O失敗が併発 | 合成fixture／raw観測経路の第5原因 | fixtureが明示したのは一覧の1件除外だけ。全7子I/Oは設計から導出できない。期待を緩めず、raw `artifactReads`を保存する次attemptでfixtureと観測経路を分離する必要がある |
| 124 | `staging-read`注入後、失敗一覧に期待した`artifact-01-read`が無い | 合成fixture／raw観測経路の第5原因 | 注入、raw観測、失敗要約のどこで失われたかは現TAPだけで一意化できない。新しい診断証拠なしに本体・検査のどちらかへ決め打ちしない |
| 132 | `NONDETERMINISTIC / determinism`の動的観測が欠落 | 118の派生 | 118が先に停止し、後段の決定性負例が実行されなかった。手動seed・期待集合縮小をしない |

116と117は合格し、担当一意解決は既知の停止点を通過した。118も、新設した「内容hashだけの不一致」と「参照関係だけの不一致」の対照までは通過した。

127件の合格はB2完了を意味しない。特に、公開再照合の全負例は119の途中停止により完走していない。

### 5.1 全件実行後の静的監査で見つかった残件

| 対象 | 実測 | 帰属 |
|---|---|---|
| 公開読取元のpath束縛 | snapshot自体の安全性と自己整合、fileName、内容は検査するが、`staging／published root + 固定fileName`とのpath完全一致を検査していない | 承認済み公開再照合Pの実装残り |
| 原因Bの新規対照 | 期待する違反pathの存在は見るが、同じ違反名の余分なpathが無いことまで完全一致で固定していない | 検査の厳密性不足 |

どちらも検査実行後に発見したため、このattempt内では直していない。特にpath束縛は、132件の不合格を解消しても別途満たさなければB2完了にできない。

## 6. 実行しなかった後続

package側に1件でも不合格があれば止める契約に従い、次はすべて0回。

- 意味回答側の全件検査
- Gate A 21件の回帰
- 残存source atom 50件の回帰
- candidate 13読み取り専用preflight job作成・実行
- 正式7ファイルpackage生成
- prompt登録
- Gemini実走
- 正式表示計画・指示書・描画

## 7. 安定点とJOURNAL

安定点制度を`DECISIONS.md`へ追加し、`JOURNAL.md`の記録様式を新設した。ただし本attemptでは次が未成立。

| 条件 | 状態 |
|---|---|
| 事前登録した全検査の合格 | 127/132のため不成立 |
| 正式成果物のhash一致 | 後続preflightへ未到達 |
| DECISIONS / HANDOVER同期 | 本停止状態へ同期したが、他2条件が不成立 |

したがって`stable/b2-complete-20260724`は発行しない。JOURNALには安定点エントリを追加せず、規則の説明だけを置いた。

遡及監査ではcommit `23a709a1`がゲートA完了後の3条件を満たす最直近候補だった。しかし同commitにはJOURNALが存在せず、新しい「tag対象と実現記録を同一commitに置く」条件を履歴改変なしで満たせない。候補`stable/gate-a-complete-20260723`も発行しない。

## 8. 停止点

次は、118・119の検査fixture／oracle修正、123・124のraw観測を失敗時にも保存して原因を分離する方法、公開読取元pathの完全束縛、原因B対照の違反path完全一致を、**実装前の修正設計**として提示する必要がある。

その設計を人間が承認するまで、今回の2ファイルを追加修正せず、132件を再実行しない。
