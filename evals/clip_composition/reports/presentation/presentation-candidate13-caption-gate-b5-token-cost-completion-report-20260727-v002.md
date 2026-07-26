# candidate 13 基本テロップ B5 v002 完了報告

- 日付: 2026-07-27
- 対象: `DmWu0jVQfTE` candidate 13
- 結果: 完了
- 実装commit: `0f1a70ca`
- 承認設計SHA-256: `93bdc9e40ddf95b5cec9baba73501d9a0507d50a05329244c8123eb098e161cd`
- 正式出力: `evals/clip_composition/outputs/presentation/caption-gate-b5/DmWu0jVQfTE-candidate-13-v002/`
- 人間作業: 0件

## 結論

Gemini初実走へ渡すrequestの入力token数と、契約上最大の有効回答構造のtoken数を確定した。

- 実際の生成request入力: 9,212 token。
- 最大有効回答構造: 3,758 token。
- 最大有効回答構造は公式出力上限65,536 token以内。
- 直接検査10要件群: 10/10合格。
- `countTokens`: 2回。各対象1回、自動再試行0回。
- Gemini生成: 0回。
- B6: 未着手。

B5は完了した。次は別承認のB6で、この固定済みrequestをGeminiへ1回だけ生成送信する段階である。

## 事実

### 1. 実行日の公式照合

2026-07-27に公式文書で次を確認した。

- model: `gemini-3.6-flash`。
- 入力上限: 1,048,576 token。
- 出力上限: 65,536 token。
- 同期生成は、明示指定を省略した場合Standardが既定。
- Paid Standard単価: 入力US$1.50、出力US$7.50／100万token。

参照:

- <https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash>
- <https://ai.google.dev/gemini-api/docs/optimization>
- <https://ai.google.dev/gemini-api/docs/pricing>
- <https://ai.google.dev/api/tokens>

### 2. v001からの変更

正式requestの差分は承認どおりだった。

| request | 実測結果 |
|---|---|
| B6用生成request | v001からrootの`serviceTier`だけを削除 |
| 入力token計測request | v001から`generateContentRequest.serviceTier`だけを削除 |
| 最大回答token計測request | v001とbyte単位で同一 |

v002の3 request内に`serviceTier`というkeyは0件だった。仕事本文、回答schema、生成設定、model、上限、単価は変更していない。v001の設計・停止報告・正式出力directoryは不変で保持した。

### 3. API実行

| 項目 | 結果 |
|---|---:|
| 入力token計測 | 9,212 token |
| 最大有効回答構造の計測 | 3,758 token |
| `countTokens`呼出し | 2回 |
| 自動再試行 | 0回 |
| `generateContent`呼出し | 0回 |

両HTTP requestは`response.ok`を満たし、正常な`countTokens`応答として受理された。したがってHTTP結果は2件とも2xx成功である。数値のHTTP status codeは正式成果物へ保存していないため未確認である。

### 4. 費用

Paid Standard入力単価で計算した見積り:

| 対象 | 式 | 見積り |
|---|---|---:|
| 将来B6の固定入力 | 9,212 × 1.50 / 1,000,000 | US$0.01381800 |
| 最大回答構造を測った診断入力 | 3,758 × 1.50 / 1,000,000 | US$0.00563700 |

設計済みのB6理論ガードは、公式上下限をそのまま使ったUS$2.06438400で不変である。これは実際の請求額ではない。

### 5. 課金とtierの観測

`countTokens`の生応答には、料金・請求額・適用tierを示すfieldがなかった。公式料金ページにも、今回確認した範囲では`countTokens`専用料金の記載はなかった。

従って、次は未確認である。

- 2回の`countTokens`が実際に課金されたか。
- Google側で実際に適用されたtierの実体。

「省略時Standard」は公式仕様への依拠であり、応答から適用実体を観測したという意味ではない。

### 6. 検査

- B3意味入力SHA一致。
- 354文字・3まとまり・205候補一致。
- モデル可視入力をsystem instruction、B3本文、回答schemaに限定。
- B3本文を改変せず使用。
- 仕事本文の正本をB3 `taskDescription`だけに限定。
- model・回答schema・生成設定・省略時Standard条件が設計と一致。
- 2つのtoken計測requestが正式内容を保持。
- 両応答が非負整数tokenを返し、最大構造が出力上限内。
- 単価・日付・費用式が一致。
- 正式5 payloadのSHA束縛、秘密情報0件、上流入力不変。

結果は10/10合格だった。

`.env`は実行processの環境変数設定だけに使用した。正式6 fileを実際のkey byteで再走査し、生key出現は0件だった。`.env`の複製・移動・別pathへの書き出しは行っていない。

## 正式成果物

| file | byte | SHA-256 |
|---|---:|---|
| `generate-content-request.json` | 36,913 | `7fa902580b78bb5da3d36025135e4655ab2528e401ba5a76537f2af3c1939ed2` |
| `input-token-count-request.json` | 37,209 | `83470ebfefe94ac07dda023fa7706aa0f63d007feb26dd59bdd21a7b70af07df` |
| `input-token-count-response.raw.json` | 121 | `195361097d700be9c13b246d35600211f17dcc554613604732b6f497a3b81fc2` |
| `maximum-response-token-count-request.json` | 13,903 | `0de805415b0fb62206d2a436b1bea1c85f4e73e6d518252fd9528eb1f25bb158` |
| `maximum-response-token-count-response.raw.json` | 121 | `0f4af6abb87c012f4560864b481e38f9cb7e957abd098d3c3e53bb39906d0cc2` |
| `b5-manifest.json` | 7,779 | `c5500468a747095188b63dfb9e43137b2562bb5794eb67cfcf6a00d65a998ebc` |

正式file集合はこの6件だけである。

## 推測

なし。費用は固定単価による算術見積りであり、実請求の推測には使っていない。

## 未確認

- exactなHTTP status code。実行中は2xx成功を確認したが、数値codeを正式成果物へ保存していない。
- `countTokens`の実課金。
- Google側で実際に適用されたtier。
- B6生成時の応答model表記、usage、生成費用、回答品質。

## 停止点

B6へは進んでいない。次に必要なのは、B6の1回実走を許可する別承認である。
