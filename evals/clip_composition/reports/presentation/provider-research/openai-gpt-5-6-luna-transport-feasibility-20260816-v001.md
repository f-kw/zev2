# GPT-5.6 Luna 字幕境界選択 transport 実現性調査 v001

## 結論

公式一次資料だけで、将来比較用の通信経路を設計するための最低限の現物は確認できた。モデルIDは `gpt-5.6-luna`、推奨入口は Responses API、厳格JSON Schema出力、使用token内訳、標準価格、tier別rate limit、既定のデータ保持条件が公開されている。

ただし本書はtransport設計素材であり、字幕境界選択の正式契約ではない。API接続・品質比較・prompt移植・採否判断は行っていない。

## 現物照合結果

| 項目 | 公式に確認した内容 | ZEV側で必要な扱い |
| --- | --- | --- |
| model ID | `gpt-5.6-luna` | aliasへ読み替えず固定値として送る |
| endpoint | `POST /v1/responses` | Chat Completionsへ分岐しない |
| authentication | Bearer API key | backend環境変数からのみ読み、成果物へ値を保存しない |
| structured output | `text.format`のJSON Schema、`strict: true` | Gemini用schemaをそのまま流用せず、OpenAI正式shapeへ再符号化する |
| usage | input/output/reasoning/total tokenの構造化内訳 | raw先行保存後、費用換算の正本にする |
| standard price | 入力 $0.20、cached入力 $0.02、出力 $1.20 / 1M token | reasoning tokenを出力課金へ含める |
| rate limit | 利用tier別にRPM/TPM/batch queueが公開 | 実行前に当該projectのtierを別途確認する |
| data handling | API dataは既定で学習不使用、abuse monitoringは原則最大30日、Responsesは既定でapplication stateを保持 | `store:false`を第一候補とする。ZDRは組織が承認・設定済みと確認できる場合だけ主張する |

## 比較実走前に未確定の事項

1. このZEV projectで使用するOpenAI organization/projectと利用tier。
2. API keyの正式な保持場所と、漏洩0を保証する起動入口。
3. GeminiのTier 1 schemaとローカルstrict受入を維持したままOpenAI schemaへ写すexact変換。
4. GeminiとLunaで同じ意味入力を比較する際の匿名化・順序・支出上限。
5. `store:false`だけで足りるか、当該projectにZDRが実際に有効か。

## B5/B6接続資料

現行Gemini jobの実体を読み、Luna比較ではprovider固有のtoken計測jobと生成jobへ分離する第一候補を、次の設計素材へ閉じた。

- `openai-gpt-5-6-luna-b5-b6-connection-material-20260816-v001.md`

Responses input token count、Responses生成request、usage/費用、ローカルstrict受入との接続は整理済み。exact job schema・failure ownership・API送信は未承認である。

## 公式資料

- https://developers.openai.com/api/docs/models/gpt-5.6-luna
- https://developers.openai.com/api/docs/guides/migrate-to-responses
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint
- https://openai.com/index/building-abundant-intelligence/
- https://help.openai.com/en/articles/5112595-best-practices-for-api-key

取得日時: 2026-08-16T01:40:11+09:00。OpenAI API通信は0回。
