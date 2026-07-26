# candidate 13 基本テロップ B5 実装・API key未設定停止報告 v001

- 日付: 2026-07-27
- 状態: 実装とローカル検査は完了、正式token計測は通信前停止
- 停止理由: 実行環境に`GEMINI_API_KEY`が存在しない
- B6: 未着手
- 正本設計: `presentation-candidate13-caption-gate-b5-prompt-payload-token-cost-implementation-contract-design-20260726-v001.md`
- 正本設計SHA-256: `80bf9b1598744c97a205a96d7ddcde0bf930dccf81991a18c7885e553b856279`

## 結論

B5の送信内容を作り、二つの非生成token計測を各1回だけ実行する処理を、新規code・testの2 fileで実装した。既存codeは変更していない。

正式実行は、B3意味入力と上流の読み取り専用照合に合格した後、API keyが環境に無いことを検出して停止した。Googleへの送信、token計測、Gemini生成、正式成果物の作成、B6への進行はいずれも0件である。

## 事実

### 実装

| 項目 | 結果 |
|---|---|
| 新規code | `evals/clip_composition/run_presentation_caption_gate_b5_v001.mjs` 1件 |
| 新規test | `evals/clip_composition/test_presentation_caption_gate_b5_v001.mjs` 1件 |
| 既存code変更 | 0件 |
| 追加library | 0件 |
| API keyの読取元 | 実行時環境変数`GEMINI_API_KEY`だけ |
| `countTokens` | 成功経路で順番に2回、再試行処理なし |
| `generateContent` | 実装・呼出しとも0件 |
| B6自動進行 | なし |

API応答がAPI keyを本文へ反射した場合に、保存後ではなく保存前に停止する。反射したkeyを正式fileへ残さない負例を固定testへ入れた。

### ローカル検査

`node --check`はcode・testの両方で合格した。

`node --test evals/clip_composition/test_presentation_caption_gate_b5_v001.mjs`は6/6合格した。

1. B3本文を変えず、候補を一度ずつ最大構造へ写す。
2. API keyが無ければ、file作成・通信より前に停止する。
3. 未承認のモデル等を渡した場合、file作成・通信より前に停止する。
4. 応答にkeyが反射しても、応答fileを保存しない。
5. 1回目の通信が失敗した場合、再試行も2回目の通信も行わない。
6. 正常系では通信2回・正式6 file・B6未着手となり、送信byte、保存byte、5 payloadのSHA、secret 0件が一致する。

### 実行日の公式再照合

2026-07-27に公式文書を読み、次を再確認した。

| 項目 | 承認値 | 再照合 |
|---|---:|---|
| モデルID | `gemini-3.6-flash` | 一致 |
| 入力上限 | 1,048,576 token | 一致 |
| 出力上限 | 65,536 token | 一致 |
| Paid Standard入力単価 | US$1.50 / 100万token | 一致 |
| Paid Standard出力単価 | US$7.50 / 100万token | 一致 |
| tier | `SERVICE_TIER_STANDARD` | 公式API定義と一致 |
| token計測 | `countTokens` | 公式API定義と一致 |

参照:

- <https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash>
- <https://ai.google.dev/gemini-api/docs/pricing>
- <https://ai.google.dev/api/tokens>
- <https://ai.google.dev/api/generate-content>
- <https://ai.google.dev/gemini-api/docs/generate-content/thinking>
- <https://ai.google.dev/gemini-api/docs/latest-model>
- <https://ai.google.dev/gemini-api/docs/generate-content/flex-inference>

600秒の説明はFlex向け公式文書で確認した。Standardの`countTokens`にも同じ値が適用されるという独立記述までは確認できていないため、「公式に再確認済み」とは扱わず、承認済み設計の固定値として使用する。

### 正式実行の停止位置

| 項目 | 観測 |
|---|---|
| B3意味入力SHA-256 | `c350a402db15ff7a5405894f939f0a66522482d6d8c78584fe5b55d9dc489980`、一致 |
| B3意味入力 | 354文字・3まとまり・205候補、一致 |
| 実行前の上流読取投影 | `70d52830196ba5697b5a1d140423db7e9fb8fe78810bde0d7f3a7429595d8cb8`、一致 |
| 停止code | `GEMINI_API_KEY_UNAVAILABLE` |
| `countTokens`通信 | 0回 |
| Gemini生成 | 0回 |
| 正式成果物 | 0件 |
| 正式出力directory | 存在しない |
| B6 | 未着手 |

失敗した正式成果物は存在しないため、同じ正式出力pathは未使用のままである。

## 推測

API keyが実行環境へ渡れば、同じ入力・モデル・Standard tier・単価を使って二つのtoken計測へ進める見込みである。ただし、実通信が成功することはまだ確認していない。

## 未確認

- 正式入力token数。
- 最大有効回答構造のtoken数。
- 入力費用の実測見積り。
- `countTokens` 2回の実際の課金扱い。
- API応答の実体。

これらは値を推測せず、正式`countTokens`応答を受け取った後だけ記録する。

## 保証範囲

- 実行日の公式照合はrunner外で行い、runnerは照合済み値が承認値と一致することを検査する。runner自身が公式ページへ通信したとは扱わない。
- 完成時のmanifestは他の正式5 fileをSHA-256で束縛する。manifest自身のSHA-256は自己参照を避け、完了報告へ記録する。
- 書込み先は新しいB5出力directory内の6 fileだけである。途中停止時は既存fileを上書きせず、manifestがないdirectoryを完成扱いしない。
- 今回は正式出力directoryを作る前に停止したため、B1〜B4正式成果物への書込みは0件である。

## 次に必要な人間作業

必須1件。現在の実行環境から環境変数`GEMINI_API_KEY`として読める状態にし、再開を伝える。keyの値を会話・file・報告へ貼らないこと。

所要時間は未確認である。通常のTerminalで設定した値が、すでに動いているCodex実行環境へ引き継がれるかも未確認である。再開後もB5の`countTokens` 2回までで停止し、B6へは進まない。
