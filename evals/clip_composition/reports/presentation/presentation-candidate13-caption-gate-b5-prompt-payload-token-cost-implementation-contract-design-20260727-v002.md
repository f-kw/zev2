# candidate 13 基本テロップ B5 最小設計 v002

- 日付: 2026-07-27
- 状態: kawafmm直接裁定による承認済み改訂版
- 旧正本: `presentation-candidate13-caption-gate-b5-prompt-payload-token-cost-implementation-contract-design-20260726-v001.md`
- 旧正本SHA-256: `80bf9b1598744c97a205a96d7ddcde0bf930dccf81991a18c7885e553b856279`
- 改訂理由: v001の最初の`countTokens`が、生成request内の明示`serviceTier`をHTTP 400で拒否した
- 目的: Gemini初実走の直前に、送信内容・token数・費用見積りを確定する

## 1. 裁定

B5 v002は、生成用requestと、その生成requestを内包する入力token計測requestの双方で、`serviceTier` fieldを送らない。

同期生成でfieldを省略した場合はStandardが既定であるという公式仕様に依拠し、費用計算にはPaid Standardの公式単価を使う。実APIが内部でどのtierを適用したかを応答から観測できない場合は、適用実体を確認済みとは書かない。

v001の設計、停止報告、使用済み出力directoryは変更しない。v002は別の正式attemptであり、v001を暗黙受理する後方互換処理を作らない。

## 2. v001から変更するもの

| 対象 | v001 | v002 |
|---|---|---|
| B6用生成request | rootに`serviceTier: "SERVICE_TIER_STANDARD"` | `serviceTier` fieldなし |
| 入力token計測request | `generateContentRequest.serviceTier`あり | 同fieldなし |
| 最大回答token計測request | `serviceTier` fieldなし | byte不変 |
| 料金根拠 | Paid Standard | Paid Standard。公式既定へ依拠 |
| 正式出力先 | `DmWu0jVQfTE-candidate-13-v001/` | `DmWu0jVQfTE-candidate-13-v002/` |

変更は上表だけとする。次は変えない。

- system instruction。
- B3意味入力本文。
- response JSON Schema。
- `generationConfig`の全member。
- model ID `gemini-3.6-flash`。
- 入力上限1,048,576 token。
- 出力上限65,536 token。
- Paid Standard単価（入力US$1.50、出力US$7.50／100万token）。
- timeout。
- `countTokens`のendpoint・header・各1回・自動再試行0回。
- 最大有効回答の構造。
- 正式6 file。
- 直接検査10要件群。
- secret非保存。
- B6へ自動進行しない停止点。

これ以外の変更が必要になった場合は、実装や通信を続けず報告して停止する。

## 3. 公式仕様の実行日照合

実行日の通信前に、次を公式文書で再確認する。

1. `gemini-3.6-flash`が存在する。
2. 入力上限が1,048,576 token、出力上限が65,536 tokenである。
3. 同期生成のStandardが、`serviceTier`省略時の既定である。
4. Paid Standard単価が入力US$1.50、出力US$7.50／100万tokenである。

参照:

- <https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash>
- <https://ai.google.dev/gemini-api/docs/optimization>
- <https://ai.google.dev/gemini-api/docs/pricing>
- <https://ai.google.dev/api/tokens>
- <https://ai.google.dev/api/generate-content>

値が違う、または省略時Standardを確認できない場合は、外部通信前に停止する。別model、別tier、別単価へ置き換えない。

## 4. request差分の合格条件

v001の停止証拠に保存された正式requestを比較元にする。

1. v001 `generate-content-request.json`からrootの`serviceTier`だけを除いたobjectが、v002生成requestと完全一致する。
2. v001 `input-token-count-request.json`から`generateContentRequest.serviceTier`だけを除いたobjectが、v002入力token計測requestと完全一致する。
3. v001 `maximum-response-token-count-request.json`とv002同fileがbyte単位で一致する。
4. v002の3 requestに、key名`serviceTier`が0件である。
5. response JSON Schemaを含む他のmemberに追加・削除・値変更・順序変更が0件である。

比較は通信前に行う。不一致を見つけた場合は、期待値を動かさず停止する。

## 5. 実行と検査

実行順はv001と同じである。

1. B3意味入力のSHA、354文字、3まとまり、205候補を確認する。
2. 上流の読み取り専用投影が一致することを確認する。
3. §3と§4を確認する。
4. `.env`を実行processの環境変数設定にだけ使い、request 3 fileを保存前に生key byteで検査する。
5. 入力tokenの`countTokens`を1回実行する。
6. 最大有効回答tokenの`countTokens`を1回実行する。
7. 生応答を保存前に生key byteで検査する。
8. v001から継承した10要件群を検査する。
9. 5つの要求・応答fileをSHA-256で束縛したmanifestを最後に保存する。
10. 完了または停止報告を作り、B6へ進まず停止する。

通信失敗、timeout、無効応答時の再試行は0回とする。1回目で失敗した場合は2回目を行わない。Gemini生成は0回である。

10要件群のうち、API設定と料金を扱う第6・第9確認は、次の意味で読む。

- 第6確認: response schemaと生成設定が不変で、`serviceTier` fieldが存在しない。
- 第9確認: model、公式既定のStandard、Paid Standard単価、適用日、費用式が一致する。

要件数は10のまま増減させない。

## 6. 正式出力

保存先:

`evals/clip_composition/outputs/presentation/caption-gate-b5/DmWu0jVQfTE-candidate-13-v002/`

正式fileはv001と同じ6件である。

1. `generate-content-request.json`
2. `input-token-count-request.json`
3. `input-token-count-response.raw.json`
4. `maximum-response-token-count-request.json`
5. `maximum-response-token-count-response.raw.json`
6. `b5-manifest.json`

保存先が既に存在する場合は停止する。上書き、削除、改名、v001 directoryの再利用は行わない。manifestがないdirectoryは未完了である。

## 7. 完了報告

事実として次を報告する。

- 公式既定のStandardとPaid Standard単価の実行日照合。
- v001からv002へのrequest差分。
- `countTokens`各1回、自動再試行0回、Gemini生成0回、B6未着手。
- HTTP結果。
- 実測入力token数。
- 実測最大有効回答構造token数。
- 両計測に対応するPaid Standard入力費用見積り。
- `countTokens`応答から観測できた課金情報。観測できなければ未確認と書く。
- 10要件群の結果。
- 正式6 fileのbyte数とSHA-256、manifest自身のSHA-256。
- 生key出現0件。
- v001停止証拠とB1〜B4正式成果物が不変であること。

公式既定へ依拠したことと、Google側で実際に適用されたtierの実体は分けて記録する。

## 8. 実装の版

現行の実行入口と検査はv002へ置き換える。v001実装を呼ぶshim、v001 requestの暗黙変換、旧CLI引数の黙示受理は作らない。

v001実装の実体はcommit `be61aab5`、v001停止証拠はcommit `bac69297`に残る。作業ツリーではv002だけを正式入口にし、二重実装を置かない。

このv002は、同じB5実行点で2回停止した後に計画単位でkawafmmへ戻し、案Bとして直接再承認された1回限りのattemptである。このattemptが停止した場合、同じ設定で再送しない。
