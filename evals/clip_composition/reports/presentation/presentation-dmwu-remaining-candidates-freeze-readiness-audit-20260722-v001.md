# DmWu0jVQfTE 残り3公開候補 凍結準備監査 v001

- 作成日: 2026-07-22
- 区分: 人間待ち充填方式による副線・読み取り専用監査
- 対象: candidate 11・12・36
- 主線: candidate 13の残存source atom抽出工程の実装承認待ち
- 書き込み範囲: 本レポート1件だけ
- 人間作業: 0件、媒体視聴なし、時間計測なし

## 1. 結論

candidate 11・12・36について、候補選出、機械の外側境界、人間の採否、人間採用外側境界は全て現存し、Git管理下にある。

保全対象は一種類ではない。

1. テーマ候補を作った上流出力。
2. 52候補から上位5を選んだランキングの入力・実出力・確定結果・実行条件。
3. 人間確認画面へ出した機械の外側境界。
4. 人間が公開候補と認定した結果と、最終的に採用した外側境界。

candidate 11・12は、機械提示境界と人間採用境界が同じである。candidate 36だけは、開始は同じだが、人間が終了を17,570ms早めた。したがってcandidate 36では、機械提示と人間採用の二つを別の事実として保持し、一方で上書きしない。

現在のファイル群は、正式attempt v002実行前のcommit `3c2e0377`とbyte差分がない。attempt v002による改変は起きていない。

内部の間については事情が異なる。承認済み設計書にはcandidate 11=4件、12=4件、36=1件という機械提示可能数が残るが、candidate 13のような候補別manifestは作られていない。本監査で同じ固定済み400ms規則を読み取り専用で再計算し、9件の詳細を§3.4へ初めて列挙した。これは凍結前の棚卸し記録であり、当時の正式成果物が存在したという意味ではない。

また、3候補だけを独立して束縛する専用の凍結receiptはまだない。方針どおりcandidate 13完走後に、下記既存ファイルのhashと候補別事実を参照する凍結記録を作る余地が残る。本監査では、その凍結記録、組立決定、動画、指示書を先行生成しない。

## 2. 生成経路

| 工程 | 固定済み系統・条件 |
|---|---|
| 入力選定 | `input-selection-v004(chat-relative-velocity-top100)` |
| テーマ生成 | `theme-llm-v002@gemini-web-flash` |
| ランキング | `candidate-ranking-v002@gemini-web-flash`、run 1 |
| ランキング入力 | candidate ID・title・reasonだけ |
| リーク検査 | 52候補、禁止field 0件、合格 |
| 正解の可用性 | ランキング時点ではexpected・教師データなし |
| 人間確認 | `first-gate-unseen-hand-trim-formal-v002`、kawafmm、2026-07-17 |

ランキングは時刻、transcript本文、チャット本文、正解、人間ラベルを入力にしていない。機械提示境界は、ランキングモデルが新しく作った時刻ではなく、上流テーマ候補の根拠範囲を確認画面へ渡したものである。

## 3. 候補別の保存事実

### 3.1 candidate 11

| 項目 | 値 |
|---|---|
| ランク | 5 |
| title | ENメンバーにカレーを配るスバル |
| 上流根拠発話 | `74-78` |
| 機械提示外側境界 | 1,594,200–1,708,150ms |
| 人間判定 | 公開候補 |
| 人間採用外側境界 | 1,594,200–1,708,150ms |
| 境界差 | なし |
| 保存された内部編集方針 | 無音・フィラーを詰める。内部カットも望ましいという所見あり |

### 3.2 candidate 12

| 項目 | 値 |
|---|---|
| ランク | 2 |
| title | ポルカから送られてきた『ウマ娘』のキモい返信に共感してしまうスバル |
| 上流根拠発話 | `79-84` |
| 機械提示外側境界 | 1,710,502–1,866,338ms |
| 人間判定 | 公開候補 |
| 人間採用外側境界 | 1,710,502–1,866,338ms |
| 境界差 | なし |
| 保存された内部編集方針 | 無音・フィラーを詰める。具体的な内部カット指定は人間負荷が高いとの所見あり |

### 3.3 candidate 36

| 項目 | 値 |
|---|---|
| ランク | 4 |
| title | 監視カメラに見られていたら恥ずかしい！ダンス自主練習中の独り言オンパレード |
| 上流根拠発話 | `224-225` |
| 機械提示外側境界 | 5,068,074–5,126,562ms |
| 人間判定 | 公開候補 |
| 人間採用外側境界 | 5,068,074–5,108,992ms |
| 境界差 | 開始0ms、終了は人間採用が17,570ms早い |
| 保存された内部編集方針 | 無音・フィラーを詰める |

candidate 36の二つの終了時刻は矛盾ではない。前者は機械が人間へ提示した範囲、後者は人間が公開候補として採用した外側境界である。将来の凍結記録では、役割名を付けて両方を保存する。

さらに、人間採用終了5,108,992msは、文字時刻上では「思」の終了と「う」の開始に一致する。「思う」の途中に見えるため、実媒体化する場合はcandidate 13で確認した`STT構造終端≠音響終端`問題の再確認が必要である。これは既存の人間判定を変更する理由ではなく、凍結値を無確認で組立決定へ変換しないための注意である。

### 3.4 内部の機械提示候補

承認済み設計書は、層1の固定済み400ms規則を自動切断ではなく確認位置の提示器として使い、3候補に合計9件があることを記録していた。ただし詳細な時刻を持つ候補別manifestはcandidate 13にしかない。

本監査では、現在Git管理下にある次の実体を読み取り専用で用い、件数の再現と詳細の棚卸しだけを行った。

- `layer1_internal_trim.mjs` SHA-256 `eae552002480f93455bddf12f5913c21b292efb0feedd584d84422775e5ca38d`
- STT manifest SHA-256 `f7d2c04f8f9e67e27ff5b461236f01d3b68bb4f53ba448c0c4b5387c95a6d03b`
- 文字時刻列 SHA-256 `ebf0190c9ce0fd96b4e1faa18717f41d73126fc914172474ac791df7f17ad065`
- 読み込み診断: 25,899文字中25,899件をraw発話へ対応、未対応0件、発話まとまり306件
- 候補化: 400ms以上、前後120msという既存v001値。全9件が保護され、自動cut 0件

| candidate | 間 | 長さ | 前後文字ID | 保護理由 |
|---:|---:|---:|---|---|
| 11 | 1,620,142–1,620,918ms | 776ms | `5898`→`5899` | 発話まとまり境界 |
| 11 | 1,648,274–1,650,022ms | 1,748ms | `6008`→`6009` | 発話まとまり境界 |
| 11 | 1,677,762–1,678,920ms | 1,158ms | `6133`→`6134` | 発話まとまり境界 |
| 11 | 1,679,939–1,680,594ms | 655ms | `6142`→`6143` | 話者不明 |
| 12 | 1,738,162–1,739,646ms | 1,484ms | `6297`→`6298` | 発話まとまり境界 |
| 12 | 1,769,102–1,771,190ms | 2,088ms | `6412`→`6413` | 発話まとまり境界 |
| 12 | 1,798,122–1,804,906ms | 6,784ms | `6516`→`6517` | 話者不明 |
| 12 | 1,830,730–1,838,086ms | 7,356ms | `6638`→`6639` | 話者不明 |
| 36 | 5,097,574–5,098,026ms | 452ms | `17435`→`17436` | 発話まとまり境界 |

この再計算は、設計書の4+4+1件と一致する。だが実行request、実行環境、全raw chunk byteを束縛した正式manifestではない。candidate 13完走後の凍結時には、上記値を本レポートから無検査コピーせず、当時の実装・入力を版付きjobへ固定して再現または、履歴観測としてだけ凍結するかを先に決める必要がある。

## 4. 凍結根拠に使う既存ファイル

| 処理上の意味 | path | SHA-256 | 初回保存commit |
|---|---|---|---|
| テーマ生成の実出力 | `evals/clip_composition/outputs/theme-generation/DmWu0jVQfTE_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260716-first-gate-unseen-v001/run-01-gemini-output.json` | `634d870f86aec852f7422169ba8564f9dd40649dfad5249a8d76b2fb8d52fe20` | `09a16df9` |
| ランキング実行条件 | `evals/clip_composition/outputs/candidate-ranking/20260716-first-gate-unseen-run1-v002/run-manifest.json` | `0c6173c3de4172b0c6a641e745e9e7352726f0d21a24c5782e781a7fd8ef845e` | `09a16df9` |
| ランキング入力 | `evals/clip_composition/outputs/candidate-ranking/20260716-first-gate-unseen-run1-v002/DmWu0jVQfTE/prompt-input.json` | `f9eba33ad449dd99b916554ce64b6e0654f312bd9768c1e2d1113ffe417eca35` | `09a16df9` |
| 実際に送ったprompt | `evals/clip_composition/outputs/candidate-ranking/20260716-first-gate-unseen-run1-v002/DmWu0jVQfTE/prompt.txt` | `3461d028034c99e26cc24e4686da798095ba7f2b0ba706c4df332f4348eb4257` | `09a16df9` |
| リーク検査 | `evals/clip_composition/outputs/candidate-ranking/20260716-first-gate-unseen-run1-v002/DmWu0jVQfTE/leak-check.json` | `38f747545fa2b2ccf04e5e616254c4de601093d9e80a9262f0238a3a79381dcf` | `09a16df9` |
| Geminiのランキング生出力 | `evals/clip_composition/outputs/candidate-ranking/20260716-first-gate-unseen-run1-v002/DmWu0jVQfTE/run-01-gemini-output.json` | `a2efc14018d3ac5cb5f39504eaa979862133bf79bcd27012c2c0d56c63f2d20e` | `09a16df9` |
| ランク・理由・上流境界を統合した確定結果 | `evals/clip_composition/outputs/candidate-ranking/20260716-first-gate-unseen-run1-v002/result.json` | `30d4abb76064f5bb321769615d7aa9ad5fc756f79780ed87b62806f028ae8f19` | `09a16df9` |
| 人間へ提示した5候補と機械境界 | `evals/clip_composition/outputs/human-boundary-trim/20260717-first-gate-unseen-formal-v001/manifest.json` | `c26643ec7f0edbd1b3e3fdb78d5af07a2fc91c7731f73dc131980ecc840c8c9a` | `abcb1da6` |
| 人間の採否・外側境界・編集方針 | `evals/clip_composition/outputs/human-boundary-trim/20260717-first-gate-unseen-formal-v001/human-result.json` | `a257093e27585ae99a26fe41cacf73a8a3e60ced803eba8cc8b164fc1be95ce1` | `4a12f137` |
| 3候補の機械提示可能数を事前登録した設計 | `evals/clip_composition/reports/presentation/presentation-first-real-data-assembly-gate-design-20260721-v001.md` | `7c6d0debdfee19239b9b3a9418316c5b2296a1a43d56364f0834d41cdf20f7fd` | `4abb5cfa` |

`初回保存commit`は、その候補だけを独立保存したcommitではなく、表のファイルを最初に現行内容で保存したcommitである。3候補の専用凍結commitと読み替えない。

既存来歴の強さにも限界がある。ランキングmanifestの上流テーマ参照はpathだけでhashを持たず、人間結果も確認manifest・媒体hash・選択文字IDを直接束縛していない。時刻と発話全文は保存されているが、押した文字境界を厳密に復元できない。したがって上記は履歴凍結の根拠にはなるが、candidate 13で作った媒体対応証明やframe/sample照合票と同じ強さの実行契約ではない。

## 5. 現在の保全検査

次の5ファイルについて、正式attempt v002の実行前commit `3c2e0377`と現在のHEADを比較し、差分0件を確認した。

- ランキング実行条件。
- ランキング確定結果。
- Geminiランキング生出力。
- 人間確認manifest。
- 人間確認結果。

したがって、candidate 13の音声格子修正、正式基礎映像再生成、残存発話の準備監査は、残り3候補の機械提示・外側境界・人間判定を変更していない。

## 6. candidate 13完走後に必要な凍結の意味

完走後の凍結は、3候補を新しい処理へ流すことではない。次を保証する記録工程である。

1. candidate ID、title、rankを上記ランキング結果へ束縛する。
2. 機械提示境界を確認manifestへ束縛する。
3. 人間判定・人間採用境界・内部編集方針を人間結果へ束縛する。
4. candidate 36では機械提示終了と人間採用終了を別fieldで保持する。
5. 内部の機械提示9件は、当時の正式成果物ではなく後日の同規則再計算であることを明記する。
6. 上記元ファイルのpath、SHA-256、Git blob、保存commitを記録する。
7. 凍結後も、組立決定、基礎映像、テロップ指示書、描画jobを作らない。

凍結receiptのschema、出力path、違反コード、検査器はまだ承認されていないため、本監査では独自に決めない。

## 7. 本監査で行っていないこと

- candidate 11・12・36の組立決定作成。
- 内部カットの具体化。
- 基礎映像、解決パッケージ、演出指示書、描画。
- 人間への再確認。
- 既存成果物の移動、複製、書換え。
- 凍結receiptの生成。
- `DECISIONS.md`、`docs/HANDOVER.md`の変更。

## 8. 人間作業と主線

- 本監査: **0件。媒体視聴なし。時間計測なし。**
- 本副線から独立した承認依頼: **0件。**
- 主線で必要な既存判断: candidate 13残存source atom抽出工程の実装承認1件。
- 3候補の正式凍結: candidate 13完走後に、完走報告と同じ節目で扱う。
