# GPT-5.6 Luna 字幕境界選択 B5/B6 接続設計素材 v001

取得・照合日: 2026-08-16  
外部API通信: 0回  
位置づけ: provider再評価工事の設計素材。契約・実装・採用判断ではない。

## 1. 結論

Luna比較では、現行Gemini用B5/B6 jobへprovider分岐を足さない。字幕本文・253境界・支出承認・raw先行保存・ローカル厳格受入は共通の意味として保ち、token計測と生成通信だけをOpenAI Responses API専用jobとして分離するのが第一候補である。

理由は、現在のGemini jobがGemini固有のmodel resource、thinking level、service tier、countTokens、generateContent、responseJsonSchemaの配置をexactに検査しているためである。これらをnullable fieldやfallbackで共用化すると、正式入口の証明が弱くなる。

## 2. 現行Gemini配線の現物照合

### B5（送信前token計測）

現行正式jobは次を一組として固定している。

- Gemini Developer API、v1beta、同期入口。
- model IDとmodel resource。
- thinking level、JSON MIME、最大出力token、service tier扱い。
- countTokens最大2回。
- source package binding、公式機能snapshot、価格snapshot、残存risk受理、支出上限。
- 実装11件・承認契約16件のbinding。

runnerは正式promptを組み立て、GeminiのcountTokens入口へprobeと最終形を送る。計測結果と価格snapshotから送信前費用上限を判定する。

### B6（生成1回）

現行正式jobは次を一組として固定している。

- B5 manifestと正式request byteのbinding。
- 一回送信、再試行0、raw先行保存、修復0。
- count済み入力token、最大出力token、価格、支出上限。
- 実装19件・runtime data 1件・承認契約19件のbinding。

runnerはGemini generateContent入口へ一度だけ送信し、raw byteを解析より先に保存する。その後にprovider envelope、usage、費用、selectionのstrict受入を処理する。

## 3. Luna B5候補（provider専用token計測job）

公式のResponses input token count入口を使う。SDK表現では `client.responses.inputTokens.count({ model, input, ... })` で、生成に渡すResponses payloadと同じ入力を数えられる。

### 共通化してよい意味

| 共通項目 | 接続方法 |
| --- | --- |
| source package | 既存の正式字幕本文・253境界をbyte同一で束縛する |
| 実行前下書き・支出承認 | provider、model、価格、上限、計測回数を版付きで明記する |
| output root | 未使用の版付きrootへno-replaceで公開する |
| raw/usage/cost証拠 | provider別schemaで保存し、共通の費用集計へ投影する |
| ローカル受入契約 | B5では変更せず、B6後も同じselection validatorを正本とする |

### Luna専用に固定すべき値

| 項目 | 設計素材として確認済みの値 |
| --- | --- |
| provider | OpenAI API |
| model | `gpt-5.6-luna` |
| token計測 | Responses input token count |
| 認証 | backend環境のBearer API key。値は成果物へ保存しない |
| structured output | B6と同一の`text.format` strict JSON Schemaを含むResponses payloadを計測対象にする |
| reasoning | B6採用値と同じeffortを計測payloadへ含める。exact値は比較工事の裁定事項 |
| 保存 | `store:false`を第一候補とする |

### B5で未裁定の項目

1. token計測を1回で閉じるか、現行と同じ最大2回（組立前後）にするか。
2. 272K超の長文価格規則を費用guardへどう表現するか。
3. cached inputとcache writeを送信前に0として見積もるか、上限側へ丸めるか。独自係数は禁止し、公式価格規則から式を固定する必要がある。
4. OpenAI projectの利用tierとrate limitをどの正式snapshotへ束縛するか。

## 4. Luna B6候補（provider専用生成job）

公式入口は `POST https://api.openai.com/v1/responses`。Geminiのrequest byteを包み直すのではなく、同じ意味入力からOpenAI正式shapeを製造する。

### requestの最小構成候補

- `model: "gpt-5.6-luna"`
- 同一字幕本文・同一253境界を保持する`input`
- 現行taskの意味を保持する`instructions`またはinput内のsystem/developer相当
- `text.format = { type: "json_schema", name, strict: true, schema }`
- 明示的reasoning effort
- 明示的最大出力token
- `store: false`
- tool 0件、並列tool呼出し不要

この欄はshapeの候補であり、formal jobのexact key集合ではない。Responses APIでのrole配置、reasoning effort、最大出力、metadata 0件を実現性調査で現物byteへ閉じる必要がある。

### raw後に保存・検査するprovider固有情報

| 情報 | 公式field | 用途 |
| --- | --- | --- |
| 入力token | `usage.input_tokens` | 通常入力課金 |
| cache hit | `usage.input_tokens_details.cached_tokens` | cached入力課金 |
| cache write | `usage.input_tokens_details.cache_write_tokens` | cache書込課金 |
| 出力token | `usage.output_tokens` | 出力課金 |
| reasoning token | `usage.output_tokens_details.reasoning_tokens` | 出力token内訳・reasoning実測 |
| 全token | `usage.total_tokens` | 会計整合 |
| model/version | response envelopeのmodel | 設定値との一致確認。exact実返却は初回rawから確定する |
| response state | completed/incomplete/error/refusal等 | Geminiのblocked/abstainedへ黙って読み替えない |

アプリケーションschema内の`status: complete | abstained`は意味契約として維持できる。一方、OpenAI transport自身のrefusal・incomplete・errorはprovider envelopeの状態であり、アプリケーションのabstainedと同一視しない。所有関係は初回実走前の契約設計で閉じる。

## 5. 価格・費用guard素材

2026-08-16取得の標準価格は次のとおり。

- 通常入力: US$0.20 / 1M token。
- cached入力: US$0.02 / 1M token。
- 出力（reasoningを含む）: US$1.20 / 1M token。
- cache write: 通常入力単価の1.25倍。
- 272K入力token超: request全体に入力2倍・出力1.5倍。

費用guardは、通常入力・cached入力・cache write・出力を別項として整数単位で計算し、長文閾値は実測tokenに対して分岐させる必要がある。Geminiの入力単価×入力token+出力単価×最大出力tokenという固定式は流用しない。

## 6. データ・秘密情報の境界

- API keyはbackend環境からだけ読み、存在判定と閉語彙のcredential failureだけを記録する。
- request/response rawにkeyやAuthorization headerを含めない。
- `store:false`を明示する。
- API dataは既定で学習不使用だが、abuse monitoringは原則最大30日。ZDRは対象organizationが承認・設定済みと実測できるまで主張しない。
- 字幕本文をOpenAIへ送る行為自体は、Geminiとは別providerへの外部送信なので別承認とする。

## 7. provider比較工事へ渡すexact論点

1. provider別B5 job schemaとB6 job schemaのpath・owner・failure code。
2. GeminiとLunaでbyte同一に保つ意味入力の範囲、およびprovider用再符号化後byteの別管理。
3. Responses input token countとResponses生成requestのpayload同一性検査。
4. OpenAI response envelopeのcomplete/incomplete/refusal/errorとZEVのaccepted/rejected/abstained/fatalの写像。
5. usage全fieldと価格snapshotからの整数費用計算。
6. local strict selection validatorと既知6境界非再選択検査を、provider差なしの最終受入正本として再利用できるかの現物照合。
7. 同一fixtureでGemini/Lunaを匿名比較する順序、支出上限、人間目視項目。

## 8. 保証しないこと

- Lunaがこの字幕素材を受理・完答すること。
- Geminiより品質・費用が優れること。
- 現行Tier 1 schemaがOpenAI strict schemaでそのまま受理されること。
- 当該OpenAI projectが特定tierまたはZDRを持つこと。
- Gemini B5/B6 runnerへ分岐を足せば安全に共用できること。

## 9. 公式資料

- https://developers.openai.com/api/docs/models/gpt-5.6-luna
- https://developers.openai.com/api/docs/guides/token-counting
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/migrate-to-responses
- https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint
- https://help.openai.com/en/articles/5112595-best-practices-for-api-key

