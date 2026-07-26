# candidate 13 基本テロップ B5 Standard tier token計測停止報告 v001

- 日付: 2026-07-27
- 状態: 正式token計測の1回目で停止
- 停止理由: `countTokens`が明示Standard tierをHTTP 400で拒否
- 自動再試行: 0回
- B6: 未着手
- 実装commit: `be61aab5`
- 正本設計SHA-256: `80bf9b1598744c97a205a96d7ddcde0bf930dccf81991a18c7885e553b856279`

## 結論

承認された正式B5を、`/Users/kawafmm/workspace/env/.env`から実行processの環境変数だけへAPI keyを読み込んで開始した。

1回目の非生成token計測は、正式生成requestのmemberを共用し、`countTokens`で必須のmodel指定だけを加えた入力を受け取った後、明示したStandard tier値をHTTP 400 `INVALID_ARGUMENT`で拒否した。契約どおり再試行せず、その時点で停止した。

2回目のtoken計測、10要件群の完了判定、manifest、Gemini生成、B6は実行していない。B5は未完了である。

## 事実

### 実行前の照合

2026-07-27に公式文書を再確認した。

| 項目 | 承認値 | 結果 |
|---|---:|---|
| モデルID | `gemini-3.6-flash` | 一致 |
| 入力上限 | 1,048,576 token | 一致 |
| 出力上限 | 65,536 token | 一致 |
| Paid Standard入力単価 | US$1.50 / 100万token | 一致 |
| Paid Standard出力単価 | US$7.50 / 100万token | 一致 |

公式の生成API文書には、生成requestの任意fieldとしてservice tierがあり、`SERVICE_TIER_STANDARD`はenumとして掲載されている。一方、今回の`countTokens`実応答はこの値を拒否した。

参照:

- <https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash>
- <https://ai.google.dev/gemini-api/docs/pricing>
- <https://ai.google.dev/api/tokens>
- <https://ai.google.dev/api/generate-content>

### `.env`とsecret

| 項目 | 結果 |
|---|---|
| `.env`の用途 | 実行processの環境変数設定だけ |
| `.env`の複製・移動・書出し | 0件 |
| keyのstdout・stderr・報告出力 | 実行者観測で0件。保存logはなし |
| API応答の保存前検査 | 生key出現0件を確認してから保存 |
| 停止後に保存した4 fileの再検査 | 生key出現0件 |

`.env`の内容とkeyの値は読み上げ・記録していない。

### API観測

| 項目 | 観測 |
|---|---|
| endpoint | Gemini Developer API `v1beta`の`countTokens` |
| 1回目の通信 | 1回 |
| HTTP status | 400 |
| API status | `INVALID_ARGUMENT` |
| API message | `generate_content_request.service_tier`の`SERVICE_TIER_STANDARD`がinvalid |
| 1回目の再試行 | 0回 |
| 2回目の通信 | 0回 |
| Gemini生成 | 0回 |
| B6 | 未着手 |

APIが返した公開可能なmessageだけを上表へ転記した。生応答は改変せず保存している。

### 保存された途中成果物

保存先:

`evals/clip_composition/outputs/presentation/caption-gate-b5/DmWu0jVQfTE-candidate-13-v001/`

| file | byte | SHA-256 |
|---|---:|---|
| `generate-content-request.json` | 36,955 | `af56faadcb3b9927283fc800cff927833a54c0683c056b54474f8460bd4248a3` |
| `input-token-count-request.json` | 37,253 | `b8b2672842bd282cc9539f5bf1b7aeb8fab2e1ece218f4e24c8aaa583dcb6c4b` |
| `input-token-count-response.raw.json` | 653 | `543058b59d7b1cc02ad03d648d956473239bf88526b46ce57ae0d2d42bd8c6bb` |
| `maximum-response-token-count-request.json` | 13,903 | `0de805415b0fb62206d2a436b1bea1c85f4e73e6d518252fd9528eb1f25bb158` |

`maximum-response-token-count-response.raw.json`と`b5-manifest.json`は存在しない。manifestが無いため、このdirectoryは完成成果物ではなく停止証拠である。

## 推測

拒否原因は、少なくとも今回の`countTokens`経路が明示Standard tier値を受理しなかったことにある。

次のどれに由来するかは未確認である。

- `countTokens`だけが明示Standard指定を受理しない。
- 対象モデルで明示Standard指定を受理しない。
- API keyに結び付く契約状態では明示Standard指定を受理しない。
- 公式文書と実backendの提供時点に差がある。

## 未確認

- 正式入力token数。
- 最大有効回答構造のtoken数。
- 入力費用見積り。
- `countTokens`の課金扱い。
- 明示Standard指定を省略した場合のtoken計測結果。
- `SERVICE_TIER_UNSPECIFIED`を使った場合のtoken計測結果。
- 同じ明示Standard指定を生成APIが受理するか。

未確認値を0や推定値で埋めない。

## 契約上の意味

承認済み設計は、正式生成requestのmemberを1回目のtoken計測へ共用し、`countTokens`必須のmodel指定だけを追加し、両方へ明示Standard tierを含める。したがって、次のattemptでfieldを削除する、値を変える、生成用と計測用を分ける、のいずれも契約変更である。

同じ出力pathは今回の停止証拠で使用済みである。次のattemptを行う場合は、人間承認後に別の版付きpathを使う。

これはB5実行点で人間判断を要した2回目の停止である。

1. 1回目: 実行環境にAPI keyが無く通信前停止。
2. 2回目: key設定後、明示Standard tierを`countTokens`が拒否。

ZEV憲法の2回停止規則により、3回目を小修正で試さず、B5の計測契約を計画単位でkawafmmへ戻す。

## 次に必要な人間判断

1件。次から選ぶ。

| 案 | 内容 | 判定 |
|---|---|---|
| A | `countTokens`側だけservice tier指定を省略し、正式生成requestの明示Standardは維持する | 推奨。生成契約を動かさず、公式文書上は省略時もStandardで、今回拒否されたfieldだけをtoken計測から外す |
| B | 正式生成requestと`countTokens`の両方で明示Standardをやめ、省略時Standardへ統一する | 影響がB6まで広がるため非推奨 |
| C | 現行B5を凍結し、token計測とB6へ進まない | API契約を動かさない選択 |

Aでも承認済み設計の改訂と、使用済みv001とは別の版付き出力pathが必要である。

判断前に、API通信・request変更・再試行・B6進行は行わない。
