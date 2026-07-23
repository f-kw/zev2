# candidate 13 基本テロップ ゲートB2 先行検査不合格 停止報告 v001

- 報告日: 2026-07-23
- 開始時commit: `23a709a1b1ea7ccc02966702e1048add965725c0`
- 正本:
  - `presentation-candidate13-caption-gate-b1-implementation-contract-design-20260723-v001.md`
  - `presentation-candidate13-caption-gate-b1-gate-a-report-transfer-entrypoint-addendum-20260723-v001.md`
- 状態: **並列実装の完成前に新規package検査が先行実行され、固定合格条件の不成立を観測したため停止**
- 人間作業: 追加作業0件。次に必要な判断1件

## 1. 到達地点

1. 受け渡し入口追補の承認、B1契約の改訂案内、B2再開状態をcommit `23a709a1`で`DECISIONS.md`・`HANDOVER.md`・設計文書へ同期した。
2. B2の四つの処理部品を並列で実装中だった。
   - ゲートA証拠から意味分割用の入力一式を作り、契約を検査する処理。
   - 上記処理を読み取り専用または正式公開で動かす処理。
   - Geminiの意味分割回答を受け入れ、元の文字列へ決定的に戻す処理。
   - 上記回答検査を読み取り専用で動かす処理。
3. package側の検査は、公開入口とstrict JSONの初期部分だけを含む28件まで作成されていた。57違反コード、公開処理、全CLI、意味出力側を覆う完成版ではなかった。
4. 主担当が正式検査開始を宣言する前に、並列担当がこの未完成検査を1回実行した。28件中4件が不合格となった。
5. 夜間規律の「事前固定した合格条件のいずれかを満たさない結果が出たら、修正・再試行せず停止」に従い、結果受領時点で全担当を中断した。

## 2. 実行記録

実行は次の1回だけである。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs
```

| 項目 | 実測 |
|---|---:|
| 全検査 | 28 |
| 合格 | 24 |
| 不合格 | 4 |
| process終了コード | 1 |

不合格4件:

1. **package中核の公開入口集合が未完成**
   - 期待12入口に対して実体10入口。
   - package全体の検査入口と、最終実行報告の再検証入口が未実装だった。
2. **UTF-8 BOMを拒否できていない**
   - 期待: `bom-present`として拒否。
   - 実測: 空objectとして受理。
3. **通常のJSON objectを誤って「非列挙propertyあり」と拒否**
   - 期待: 正式値として受理。
   - 実測: `non-enumerable-property`。
4. **`toJSON`を持つ値の違反理由の優先順位が不一致**
   - 期待: `to-json`。
   - 実測: `unsupported-value`。

この実行は、正本§20の完成済みB2合成検査ではない。実行時点でpackage中核とrunnerが同時編集中で、意味出力側の正式検査fileも未作成だった。ただし、観測された4不成立はいずれも事前固定条件に含まれるため、「未完成時に走ったから無視する」とは扱わず停止条件として保存する。

## 3. 帰属

| 観測 | 帰属 | 理由 |
|---|---|---|
| 公開入口2件の欠落 | 実装未完了 | 実行時点で担当が後半の処理を実装中だった |
| BOM受理 | strict JSON処理の欠陥 | 入力byteの先頭判定が正本どおり働いていない |
| 通常objectの誤拒否 | メモリ内JSON値検査の欠陥 | 通常fieldまで非列挙propertyとして扱っている |
| `toJSON`理由不一致 | 違反優先順位の欠陥 | 正本で固定した優先順より一般的な型拒否が先に発火している |
| 完成前の検査実行 | 並列作業の実行順管理の欠陥 | 正式検査の実行責任者と「実装凍結後だけ実行」の条件を担当間で固定できていなかった |

被検査対象が完成していないため、今回の24/28をB2の部分合格、品質率、進捗率として使わない。

## 4. 停止時の作業ツリー

次は全て**未コミット・未検証の中断状態**であり、正式B2成果物ではない。

| 処理上の意味 | path | 停止時SHA-256 | 行数 | byte | 状態 |
|---|---|---|---:|---:|---|
| source-only package生成・検査の中核 | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` | `b8f2fe0d450f16c0746e82d54bebb322a9e30a098133827592c91f428f4efdc5` | 2,563 | 95,156 | 不合格実行後も別担当の並列編集が進んだため、実行時点とは異なる未検証状態 |
| package実行処理 | `evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs` | `b6b53b73867f15accf22be0dec2829505ff69aac22f9b805247f3a0b3b264b31` | 1,851 | 57,597 | 実装途中で中断 |
| 意味回答受入・決定展開の中核 | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` | `7506b195cba4deb52b9621b9bc22f689fce56d56684958438c3df2a8b935e51c` | 1,514 | 61,137 | 構文・import確認のみ。契約検査未実行 |
| 意味回答検査の実行処理 | `evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs` | `5af449f15043db6ac7e482e033937e067dd5387642e2842ca7e74e8911dab439` | 940 | 32,513 | 構文確認のみ。契約検査未実行 |
| package合成検査 | `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs` | `dbdf5eb1fdd9e2b7f0dc3fdc10012de2010ce4d99a88117b4486f5e27a9bfdca` | 228 | 8,366 | 28件だけの未完成版 |
| 意味回答合成検査 | `evals/clip_composition/test_presentation_caption_semantic_output_v001.mjs` | — | — | — | 未作成 |

不合格実行時に報告されたpackage中核は61,779 byte、package runnerは51,272 byteだった。停止時hash表の二fileは、実行と停止通知の間に並列担当の編集が進んだ後の値である。したがって、今回の不合格出力と停止時fileを同一実体として扱わない。再開時は、停止時fileを正本契約へ静的再照合してから修正範囲を固定する必要がある。

## 5. 未実行・未生成

| 段 | 状態 |
|---|---|
| 完成版package合成検査 | 未実行 |
| 意味回答側の合成検査 | 未作成・未実行 |
| 57違反コード全発火とcode×担当check全組合せ | 未実行 |
| CLI 0/1/2、決定性、実物と同一経路 | 未実行 |
| Gate A 21件回帰 | 未実行 |
| 残存source atom 50件回帰 | 未実行 |
| candidate 13読み取り専用preflight | job未作成・未実行 |
| 正式7ファイルpackage | 不存在 |
| raw意味回答 | 不存在 |
| prompt登録・Gemini実走・指示書・描画 | 未実行 |

次の不存在を停止時に実測確認した。

- candidate 13の正式package root。
- package preflight job root。
- raw意味回答root。

既存の正式基礎映像、時間対応表、残存source atom 354件、機械境界候補205件、ゲートA成果物は変更していない。

## 6. 次に必要な人間判断

必要な判断は一つである。

> 今回観測した4不成立を含め、停止時の未完成6資産を正本へ静的再照合して実装・検査を完成させた後、完成版package検査から新しい1回実行を開始してよいか。

承認される場合も、次を条件とする。

1. 先に静的な実装完成監査を行い、公開入口集合、strict JSONの優先順位、57違反コード、全担当check、CLI、同一路検査をtest file上で固定する。
2. 検査実行者を主担当一人へ固定し、他担当は合成検査を実行しない。
3. 完成版package検査を最初から一度実行する。不合格部分だけの再実行はしない。
4. 新たな不合格、契約曖昧さ、前提不一致が一件でも出たら、同じ夜間停止条件で修正せず停止する。
5. Gemini、正式package、意味回答、指示書、描画は引き続き開始しない。

人間作業は、この再開を承認または却下する**1判断**。動画視聴、文字分割、時刻入力、時間計測はない。

## 7. 工程教訓（追記候補）

共有正本への実追記は次の承認節目で行う。

> 並列実装では、合成検査の実行責任者を一人に固定し、全担当が「実装凍結・静的統合監査完了」を確認するまで、各担当が共有検査を先行実行しない。未完成時の検査も固定条件の不成立を観測した以上は停止対象だが、実行時fileと停止時fileのhashを分けて保存し、結果を後のfileへ遡及帰属しない。
