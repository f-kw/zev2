# ZEVO字幕品質v002 Gemini 3.7 B6静的request差分診断v001

## 1. 結論

保存済み正式request、2026-07にHTTP 200で成功した正式request、Google公式reference・移行注記を全fieldで照合した。静的証拠から単一の禁止fieldには確定できない。

送信requestには`candidateCount`、prefilled model turn、`temperature`、`topP`、`topK`のいずれも存在しない。`thinkingLevel=medium`と`responseJsonSchema`のfield名・位置は公式に許可される。

旧成功requestとの主要な差は、今回のresponse schemaが境界ID 253件を2つの`enum`へ全量列挙していることである。Google公式は`enum`を許可する一方、大きい・深いschemaはAPIが拒否し得ると明記するが、拒否されるexact上限や単一fieldは示していない。したがって「response schemaの規模または複雑性」が第一候補だが、通信0では帰属確定に至らない。

## 2. 三者照合

| request要素 | 今回送信 | 2026-07成功request | Gemini 3.7公式 | 判定 |
|---|---:|---:|---|---|
| `systemInstruction` | あり | あり | 許可 | 原因候補外 |
| `contents` | user 1 turn | user 1 turn | 許可 | prefilled model turn 0件 |
| `maxOutputTokens` | 65,536 | 65,536 | model上限65,536 | 原因候補外 |
| `thinkingLevel` | `medium` | `medium` | `medium`許可 | 原因候補外 |
| `responseMimeType` | `application/json` | 同一 | 許可 | 原因候補外 |
| `responseJsonSchema` | あり | あり | 正式field | field名・位置は原因候補外 |
| `candidateCount` | なし | なし | Gemini 3.xでは不許可 | 送信されていない |
| sampler系 | なし | なし | Gemini 3.xでは除去対象 | 送信されていない |
| 最終model turn | なし | なし | 不許可 | 送信されていない |
| schema root `oneOf` | 1件 | 1件 | structured outputで条件schemaをサポート | 単独差ではない |
| 境界IDの列挙 | 253件×2か所 | 0件 | `enum`は許可。ただし巨大schemaは拒否され得る | 第一候補、exact上限不明 |
| schema byte規模 | request全体65,998 byte | request全体37,170 byte | exact上限の記載なし | 規模差あり、単一field未確定 |

`B6 manifest`のcandidate count検査は、responseのcandidateがexact 1件かを検査するものであり、requestへ`candidateCount`を送る処理ではない。

## 3. 使用した現物

- 今回の正式request: `output-caption-cue-b5-attempts/.../generate-content-request.json`
- 2026-07成功request: `caption-gate-b5/DmWu0jVQfTE-candidate-13-v004/generate-content-request.json`
- 成功raw response: `caption-gate-b6/DmWu0jVQfTE-candidate-13-v004/generate-content-response.raw.json`
- Google公式GenerateContent reference: https://ai.google.dev/api/generate-content
- Google公式Gemini 3.x移行注記: https://ai.google.dev/gemini-api/docs/latest-model
- Google公式Structured outputs: https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- Google公式Billing: https://ai.google.dev/gemini-api/docs/billing

## 4. 次の処理

承認済み分岐に従い、意味入力を含まない最小probeで次を順に実測する。

1. Gemini 3.7の最小request。
2. `thinkingLevel=medium`追加。
3. 小さいstructured output追加。
4. 今回の正式response schemaだけを追加。
5. 必要な場合だけschema内の疑わしい一要素を除去した対照。
6. 必要な場合だけ残った候補の対照。

各probeは最大出力を最小化し、rawを解析前に保存する。累計上限US$0.10を超えない。

## 5. probe後追記

承認済み上限6回を全て実行した。

| probe | 差分 | HTTP |
|---|---|---:|
| 01 | 最小request | 200 |
| 02 | `thinkingLevel=medium`追加 | 200 |
| 03 | 小さい`responseJsonSchema`追加 | 200 |
| 04 | 正式response schemaへ置換 | 400 |
| 05 | 正式schemaから`propertyOrdering`だけ除去 | 400 |
| 06 | 正式schemaから253件の境界`enum`二か所だけ除去 | 400 |

probe 06はrequest全体3,092 byteまで縮小しても400だった。このため、`propertyOrdering`も253件`enum`も単独原因ではない。残る差には、`oneOf`で分かれた二状態、最大3 caption、captionごとに最大101 cue、cueごとに最大2行末という入れ子制約がある。これらのfieldは公式の対応語彙に含まれるが、組合せ全体のcomplexity上限は公式にexact値がなく、providerも拒否箇所を返さない。

単一fieldへは確定できず、追加probe上限も消化した。v017、正式B6再送、selection、描画には進まない。
