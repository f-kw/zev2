# ZEVO字幕品質v002 Gemini 3.7 構造語彙加算probe停止報告v001

## 1. 結果

承認済みの加算probeを実送信8回・再試行0回で完了した。

単独で加えた候補語彙はすべてHTTP 200だった。一方、正式schema全体の等価な`anyOf`化、complete状態のbranch単独、さらにそこから253件境界ID列挙を除いた2,357 byteのbranchもHTTP 400 `INVALID_ARGUMENT`だった。

したがって、単独の禁止語彙および検証済みの等価再符号化には確定できない。承認済み停止条件に従い、追補v017、正式B6再送、selection、page/line plan、render plan、横型3本の描画・QC・確認ページは実施していない。

## 2. 実測一覧

全probeは実字幕本文・意味packageを送らない合成最小入力、最大出力16 token、raw response先行保存で実行した。

| 実送信順 | 加えた構造 | request byte | HTTP | 課金換算 |
|---:|---|---:|---:|---:|
| 1 | 小schema + root `oneOf`二branch | 788 | 200 | US$0.00005325 |
| 2 | 小schema + `const`判別field | 686 | 200 | US$0.00005325 |
| 3 | 小schema + array `minItems=1` / `maxItems=101` | 776 | 200 | US$0.00004950 |
| 4 | 小schema + 深い`additionalProperties:false` | 1,106 | 200 | US$0.00005325 |
| 5 | 小schema + `propertyOrdering` | 640 | 200 | US$0.00005325 |
| 6 | 正式schema全体を`anyOf`+status `const`へ等価再符号化 | 35,036 | 400 | US$0 |
| 7 | 正式schemaのcomplete branchだけ | 32,327 | 400 | US$0 |
| 8 | complete branchから二つの253件境界ID `enum`を除去 | 2,357 | 400 | US$0 |

P2として予約されていた小schemaの`anyOf`対照は、P1のroot `oneOf`が200だったため裁定どおりskipした。残り枠は、単独語彙が全て通った後の組合せ照合に使用した。

## 3. 確定したこと

1. root `oneOf`は単独で受理される。
2. `const`は今回の実endpointで単独受理された。ただしGoogle公式の列挙済み対応語彙には`const`が含まれないため、正式再符号化の根拠にはしない。
3. `minItems` / `maxItems`を持つarrayは単独で受理される。
4. 深い閉objectは単独で受理される。
5. `propertyOrdering`は単独で受理される。
6. root unionを除去してもcomplete branchは拒否される。
7. 253件境界ID列挙を除去して2,357 byteへ縮小してもcomplete branchは拒否される。
8. `oneOf→anyOf+status const`という提示済みの等価再符号化は正式schema全体では拒否される。

Google公式referenceでは`oneOf`は`anyOf`と同様に解釈され、今回使う`type`、`enum`、`items`、`minItems`、`maxItems`、`anyOf`、`oneOf`、`properties`、`additionalProperties`、`required`、`propertyOrdering`はいずれも対応語彙として列挙されている。よって、公式語彙一覧とGemini 3.7実endpointの組合せ受理には、公開されていない境界がある。

公式reference: https://ai.google.dev/api/generate-content

## 4. 確定していないこと

complete branchは、caption配列、その各要素のcue配列、その各cueの行末境界配列という入れ子を持つ。単独構造は通るが、これらを組み合わせたときだけ400になる。8回の上限内では、次のどれか一つへ一意化できない。

- 配列の多段入れ子
- 複数階層の個数制約の組合せ
- array / 閉object / property orderの複合
- 公開されていないGemini 3.7 structured-output内部制限

このどれかを外すと、providerへ見せる出力構造または契約値の表現力を変える可能性がある。意味上の最大件数・二状態・境界ID全量列挙を不変にした等価変換は実測で成立していない。

## 5. 三分法

- 入力本文・fixture: 原因候補外。意味入力を送らないprobeで再現した。
- model・endpoint・thinking・小schema: 原因候補外。単独語彙5件はHTTP 200だった。
- provider向け正式schemaとGemini 3.7実受理の整合: 不成立。
- exact原因語彙: 診断可能性不足。単一語彙ではなく組合せであることまで確定。
- 修正帰属: 契約判断が必要。表現力を落とさない等価再符号化を実測できていないため、実装修正へ進めない。

## 6. 証拠

版付き診断root:

`evals/clip_composition/reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-gemini-3-7-b6-additive-probes-20260815-v001`

最終summary SHA-256:

`49bb915df31e075dcbd0a9300945fdc24b2daccd9d9339c0ea489d8c83872114`

各probeにはrequest、raw response、結果を分離保存した。選定理由もP7/P8前と最終probe前に保存した。secret保存は0件である。

## 7. 費用と外部作用

- 本加算probe: 200応答5回、400応答3回。
- 本加算probe費用: US$0.00026250。
- 前回6 probeを含む診断probe累計: US$0.00042225。
- B5 `countTokens`: 無償。
- 初回正式B6 HTTP 400: 課金0。
- 正式B6再送: 0回。
- v017実装: 0件。
- selection・描画・QC: 0件。
- commit・stable tag: 0件。

400応答の課金0はGoogle公式Billingの、成功したrequestだけが課金対象という記載に基づく。

公式Billing: https://ai.google.dev/gemini-api/docs/billing

## 8. 停止位置

加算probeの実送信上限8回を使い切り、原因語彙と等価表現を確定できなかった。承認条件どおり、追補v017を起草せず停止する。

次に進むには、provider向けschemaの表現力を維持した別符号化を新たに設計・検証するか、ローカルstrict受入を正本に保ったままprovider schemaの保証範囲をどこまで縮めるかについて、人間の契約裁定が必要である。
