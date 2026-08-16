# ZEVO字幕品質v002 Gemini 3.7 B6 request probe停止報告v001

## 1. 結果

静的差分診断では単一の禁止fieldへ確定しなかったため、承認済みの診断probeを6回実行した。Gemini 3.7のmodel・endpoint、`thinkingLevel=medium`、小さいstructured outputは全てHTTP 200で成立した。一方、正式response schemaを載せた3系統は全てHTTP 400 `INVALID_ARGUMENT`だった。

単一fieldへは確定できず、probe上限6回を消化した。条件に従い、v017・正式B6再送・selection・page/line plan・render plan・横型3本の描画・QC・確認ページは実施していない。

## 2. 静的診断

今回の正式requestと2026-07の成功requestを比較した。

- `candidateCount`: 送信0件。B6 manifestのcandidate countは応答候補数の検査でありrequest fieldではない。
- prefilled model turn: 0件。`contents`はuser一件だけ。
- `temperature`、`topP`、`topK`: 0件。
- `thinkingLevel=medium`: 旧成功requestにも存在し、Gemini 3.7公式でも許可。
- `responseJsonSchema`: field名と配置は公式どおり。
- `maxOutputTokens=65536`: Gemini 3.7公式上限と一致し、旧成功requestと同じ。
- 主要差: 正式response schemaは境界ID 253件を二つの`enum`へ列挙し、caption最大3件・各cue最大101件・各行末最大2件の入れ子制約を持つ。

Google公式は各schema語彙を許可する一方、大きい・深いschemaをAPIが拒否し得ると明記する。ただしcomplexityのexact上限は公開されていない。

## 3. probe実測

全probeは、実字幕本文や意味packageを送らない合成最小入力、最大出力16 token、一回送信、再試行0、raw先行保存で実行した。

| ID | request差分 | HTTP | model | 課金換算 |
|---|---|---:|---|---:|
| 01 | 最小request | 200 | `gemini-3.7-flash` | US$0.00005325 |
| 02 | `thinkingLevel=medium`追加 | 200 | `gemini-3.7-flash` | US$0.00005325 |
| 03 | 小さいstructured output追加 | 200 | `gemini-3.7-flash` | US$0.00005325 |
| 04 | 正式response schemaへ置換 | 400 | 応答なし | US$0 |
| 05 | 正式schemaから`propertyOrdering`だけ除去 | 400 | 応答なし | US$0 |
| 06 | 正式schemaから253件`enum`二か所だけ除去 | 400 | 応答なし | US$0 |

probe 01〜03は各々入力6 token・候補出力0 token・thinking 13 tokenだった。合計費用は159,750 nanoUSD、すなわち**US$0.00015975**であり、承認上限US$0.10内である。probe 04〜06はHTTP 400なのでGoogle公式Billingにより課金0。

probe証拠root:

`evals/clip_composition/reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-gemini-3-7-b6-request-probes-20260815-v001`

summary SHA-256:

`4e221426b06dec85e634d2d9739e3b550f21f3f31c8553dfebebaccceaf1048b`

## 4. 帰属

### 確定したこと

1. Gemini 3.7 modelとv1beta同期generateContent endpointは動作する。
2. `thinkingLevel=medium`は実endpointで受理される。
3. `responseMimeType=application/json`と小さい`responseJsonSchema`の組合せは受理される。
4. 正式response schemaは、意味入力が無い最小requestでも拒否される。
5. `propertyOrdering`は単独原因ではない。
6. 253件境界`enum`二か所は単独原因ではない。

### 確定していないこと

正式schemaに残る`oneOf`、caption最大3件、cue最大101件、行末最大2件という入れ子制約のうち、どの一項または組合せがproviderのcomplexity上限を越えたかは確定していない。400 rawは全回とも一般理由だけである。

### 三分法

- 入力本文・fixture: 原因候補外。意味入力を送らないprobeでも再現した。
- provider環境・基本機能: 原因候補外。最小3 requestは200だった。
- 正式response schemaとGemini 3.7実受理の整合: 不成立。
- exact修正点: 診断可能性不足。単一field除去のv017では閉じない。

正式schemaを簡略化する場合、最大件数や状態表現を変えるため、provider互換性だけでなく字幕選択契約の表現力へ触れる。追加probeまたはschema再設計の人間裁定が必要である。

## 5. 費用と外部作用

- 初回B5 `countTokens`: 無償。
- 初回B6 HTTP 400: 課金0。
- 本probe: US$0.00015975。
- 本診断までの確定実課金合計: **US$0.00015975**。
- probe通信: 6回。
- 正式B6再送: 0回。
- secretのrequest・raw・reportへの保存: 0件。
- commit・stable tag: 0件。

## 6. 停止位置

承認済みprobe上限を使い切り、単一fieldへ確定できなかったため停止する。次は、正式schemaの表現を保った別符号化を設計するか、追加のschema縮約probeを別承認するかの裁定が必要である。

## 7. kawafmm帰属訂正

probe 06はrequest全体3,092 byteまで縮小しても400だった。この規模を公式警告の「大きい・深いschema」へ直結させた本報告の第一候補は撤回し、残存する構造語彙の3.7実endpoint不受理を第一候補とする。元報告は観測時点の判断として保持し、後続の加算probeで語彙を一件ずつ実測する。
