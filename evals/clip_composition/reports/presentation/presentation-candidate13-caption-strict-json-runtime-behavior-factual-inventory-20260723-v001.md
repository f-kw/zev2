# candidate 13 基本テロップ strict JSON実行時挙動の事実棚卸し v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: ゲートB方向設計と承認補足の一括判断待ち
- 状態: **実行時挙動の事実確認のみ。正式工程未実走・メモリ内runtime probeのみ。契約未確定・未実装**
- 書き込み範囲: 本レポート1件だけ。共有文書、承認済み設計、コード、正式成果物は変更していない
- 人間作業: 0件。副線から新しい確認依頼は出さない

## 1. 調べた問い

B1契約準備監査では、`undefined`、非有限数、`-0`、`BigInt`、孤立surrogateを正式JSONやcanonical hashへ渡す前の扱いが未固定と判定されている。

ここでは、次の既存処理がこれらを実際にどう扱うかを確認した。

1. key順を固定してcanonical JSON文字列を作る処理。
2. 整形付き正式JSON byteを作る処理。
3. canonical SHA-256を作る処理。
4. ゲートAの検査報告を検証するstrict JSON前処理。
5. Nodeの標準`JSON.parse`と`JSON.stringify`。

使用環境は、固定済みゲートA jobと同じNode `v20.19.6`、ICU `77.1`である。正式ゲートA runnerは再実行していない。

## 2. 既存棚卸しとの境界

既存の`presentation-candidate13-caption-json-serialization-edge-factual-inventory-20260723-v001.md`は、candidate 13の354文字、205境界候補、3 containerについて、通常のJSON往復で本文不一致が0件だったことを確認している。

ただし、その実データには引用符、バックスラッシュ、改行、制御文字、supplementary character、孤立surrogate等が無かった。同レポートは、JavaScript objectへ`undefined`、非有限数、`-0`、`BigInt`を入れた場合の変換・例外・hash衝突を確認していない。

本レポートは実データ本文を再走査しない。既存JSON helperとreport validatorへ異常値を与えたときの実行時挙動だけを追加確認する。

## 3. 結論

**既存のcanonical JSON処理と正式JSON直列化処理は、strict JSON検査器としては使えない。**

両処理は、object keyを並べ替えた後またはそのまま、標準`JSON.stringify`へ渡すだけである。したがって次が起きる。

- `undefined`は、object fieldでは無言で消え、array内では`null`へ変わる。rootの正式JSON直列化は、JSONではない`undefined`＋LFを作る。
- `NaN`、`Infinity`、`-Infinity`は`null`へ変わる。
- `-0`は`0`へ変わり、符号を失う。
- `BigInt`は例外になる。
- 孤立したhigh/low surrogateは拒否されず、`\ud800`または`\udc00`としてescapeされ、再読込後も同じUTF-16 code unitとして残る。

このため、「直列化できた」「parseできた」「canonical hashを得られた」は、入力がstrict JSON契約に適合したことを意味しない。直列化による無言の省略・`null`化・符号消失・例外を、不成立値の拒否や救済の代わりにしてはならない。

ゲートA report validatorには、report本体を再帰的に確認し、`undefined`、`BigInt`、非有限数を拒否するprivate処理がある。しかし、次の限界がある。

- strict走査の対象はreport本体であり、job本体等の外側裏付け7項目全体を一般的に走査しない。
- `-0`は有限数としてstrict走査を通る。
- 孤立surrogateは通常の非空文字列として通る。
- B1 job、モデル可視入力、対応表、manifest、意味出力、package全体の正本検査ではない。
- これらのedgeを意図的に発火させる既存合成検査は無い。

したがって、方向設計を採用する場合、B1ではhash計算・正式直列化より前に、受理する値を版付きで検査する契約が別途必要である。許可・拒否の正確な範囲、違反種類、検査入口はB1設計事項であり、本レポートでは決めない。

## 4. 確認した既存処理

| 処理の意味 | 現在の実装 | strict検査の有無 |
|---|---|---|
| canonical JSON文字列 | `canonicalJsonV001` | 無し。object keyを再帰的に並べ替え、`JSON.stringify`する |
| canonical SHA-256 | `sha256CanonicalV001` | 無し。上記の戻り値をhash入力へ渡す |
| 整形付き正式JSON byte | `serializeJsonFileV001` | 無し。`JSON.stringify(value, null, 2)`＋LFをUTF-8化する |
| ゲートA report全体のstrict値確認 | runner privateの`validStrictJsonValue` | reportに対して有り。`null`、boolean、string、有限number、再帰的array/objectだけを通す |
| ゲートA report相互一致 | `validatePresentationSegmenterBoundaryPreflightReportV001` | 上記strict確認に加え、exact schemaと裏付けを照合。B1全体用ではない |

実測に使った実装byteは、固定済みゲートA jobと一致している。

| 実装 | SHA-256 |
|---|---|
| 残存文字core・JSON helper | `11036f09ceac1d1f5e19f5487eeae8d39c84ec7675cc8f9d693a203182d27f28` |
| ゲートA正式runner・report validator | `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352` |

## 5. JavaScript値からの直列化実測

### 5.1 root値

| 入力値 | `JSON.stringify` / canonical JSON | 整形付き正式JSON byte | canonical hash |
|---|---|---|---|
| `undefined` | JavaScriptの`undefined`を返す。文字列ではない | `undefined\n`。JSONとしてparse不能 | hash入力が`undefined`となり`TypeError` |
| `NaN` | `null` | `null\n` | `null`のhash |
| `Infinity` | `null` | `null\n` | `null`のhash |
| `-Infinity` | `null` | `null\n` | `null`のhash |
| `-0` | `0` | `0\n` | `0`のhash |
| `1n` | `TypeError` | `TypeError` | `TypeError` |
| lone high surrogate | `"\ud800"` | `"\ud800"\n` | escape後文字列のhash |
| lone low surrogate | `"\udc00"` | `"\udc00"\n` | escape後文字列のhash |

`serializeJsonFileV001(undefined)`の実byteは`756e646566696e65640a`であり、文字列`undefined`とLFである。`JSON.parse`はこれを構文不成立として拒否した。

### 5.2 object fieldとarray要素

| 入力値 | object `{x: value}` | array `[value]` |
|---|---|---|
| `undefined` | field自体を省略し`{}` | `[null]` |
| `NaN` | `{"x":null}` | `[null]` |
| `Infinity` | `{"x":null}` | `[null]` |
| `-Infinity` | `{"x":null}` | `[null]` |
| `-0` | `{"x":0}` | `[0]` |
| `1n` | `TypeError` | `TypeError` |
| lone high surrogate | `{"x":"\ud800"}` | `["\ud800"]` |
| lone low surrogate | `{"x":"\udc00"}` | `["\udc00"]` |

canonical JSON処理はkey順を変えるだけなので、値の省略・変換・例外は標準`JSON.stringify`と同じだった。整形付き正式JSON処理も空白とLF以外は同じ意味へ変換した。

## 6. canonical値とhashの衝突

次の異なるJavaScript値は、既存処理では同じcanonical JSON、同じcanonical SHA-256、同じ整形付き正式JSON byteになった。

| 左の入力 | 右の入力 | 共通のcanonical JSON |
|---|---|---|
| `{x: undefined}` | `{}` | `{}` |
| `[undefined]` | `[null]` | `[null]` |
| `{x: NaN}` | `{x: null}` | `{"x":null}` |
| `{x: Infinity}` | `{x: null}` | `{"x":null}` |
| `{x: -Infinity}` | `{x: null}` | `{"x":null}` |
| `{x: -0}` | `{x: 0}` | `{"x":0}` |

これはSHA-256の衝突ではない。hashへ渡す前の直列化で、異なる入力が同じbyteへ変換された結果である。したがって、canonical hashはstrict検査後の値を束縛する用途には使えるが、strict検査の代用にはならない。

孤立high surrogateとU+FFFD置換文字は、別のcanonical JSON、別hash、別正式byteだった。孤立surrogateは置換されず、escapeされたcode unitとして保持された。

## 7. raw JSONをparseした場合

| raw JSON | `JSON.parse`結果 | 再直列化 |
|---|---|---|
| `undefined` | 構文不成立 | 対象外 |
| `NaN` | 構文不成立 | 対象外 |
| `Infinity` | 構文不成立 | 対象外 |
| `-Infinity` | 構文不成立 | 対象外 |
| `1n` | 構文不成立 | 対象外 |
| `1e400` | `Infinity` | `null` |
| `-1e400` | `-Infinity` | `null` |
| `-0` | `Object.is(value, -0) === true` | `0` |
| `"\ud800"` | 1 code unitのlone high surrogate | `"\ud800"` |
| `"\udc00"` | 1 code unitのlone low surrogate | `"\udc00"` |

`undefined`や`Infinity`というtoken自体がJSON構文でないことだけでは、非有限数を防げない。巨大な指数は構文として読めても、Nodeのnumberへ変換した後は非有限になる。また、`-0`はparse直後には符号を持つが、再直列化で消える。

productionの既存ファイル入口は、UTF-8 byteを厳密decoderで検証せず、`Buffer.toString('utf8')`してから`JSON.parse`する。不正UTF-8 byte列はU+FFFDへ置換され得る。JSON escapeの`"\ud800"`を読んでlone surrogateを保持する経路と、不正UTF-8が置換文字へ変わる経路は別である。

## 8. ゲートA report validatorの範囲

### 8.1 コード上のstrict判定

runner privateの`validStrictJsonValue`は、report本体を次のように走査する。

- `null`、string、booleanを通す。
- numberは`Number.isFinite`の場合だけ通す。
- arrayは`Array.every`が訪れる実在要素を再帰確認する。
- arrayでないobjectは、own enumerableな文字列keyの値を再帰確認する。
- 上記以外の`undefined`、function、symbol、`BigInt`は通さない。

したがって、report本体の**実在するarray要素またはown enumerableな文字列keyの値**として置いた`undefined`、`NaN`、`Infinity`、`-Infinity`、`BigInt`は、正式直列化へ進む前にvalidatorが`false`へ畳む。validator外へ例外は出さない。

一方、この前処理はdense array、plain data object、property descriptorを保証しない。sparse arrayのholeは`Array.every`が飛ばし、arrayへ追加した文字列propertyも走査しない。Date、Map、Set、class instance、accessor、`toJSON`、symbol-key、非列挙propertyも一般的に拒否する処理ではない。これらは直列化時に消失または別値へ変わり得るため、現行helperをそのままB1全体のstrict JSON正本と見なせない。

ただし、`Number.isFinite(-0)`は`true`であるため、strict値確認だけでは`-0`を拒否しない。実測では、0を許す`nonWordLikeCandidateCount`をreport側・check report側とも`-0`へ変えた状態で、report validatorは引き続き`true`を返した。`Number.isInteger(-0)`と`-0 >= 0`も`true`であり、canonical JSONでは0との差が消えるためである。

stringのUnicode scalar妥当性も確認しない。実測では、受理済みfailed-reportの`$.report.checkReport.violations[0].path`へlone high surrogateまたはlone low surrogateを置いた場合も、report validatorは`true`を返した。

外側の期待終了状態も`[0, 1].includes(-0)`が`true`になるため、`-0`を0と区別して拒否しない。

### 8.2 report以外の裏付け

report validatorの外側は、report、期待終了状態、job本体、job読取記録、入力読取記録、実行環境束縛、二度生成した境界証拠、読み取り専用監視結果の8項目である。

`validStrictJsonValue`を直接かけるのはreport本体だけである。メモリ内probeは、`$.jobValue.unknown = true`により`jobBinding`を失敗させ、後続検査が`not_run_with_upstream_failure`となる受理済みfailed-reportをbaselineにした。そこで次を確認した。

- `$.jobValue.probe`へ各異常値を置いても、検証結果は変わらなかった。
- `$.inputSnapshots[0].document.probe`へ各異常値を置いても、`BigInt`を含め検証結果は変わらなかった。
- 同じ`jobBinding`失敗baselineでは、segmentationとdeterminismが上流不成立のため、`$.evidencePasses[0].probe`と`$.evidencePasses[1].probe`の内容自体が検査されない。このbaselineでは`BigInt`を含む各異常値を置いても検証結果は変わらなかった。
- 別のsegmentation・determinism合格baselineで両evidence passへ同じ追加fieldを置いた場合も、全体strict走査は行われない。`undefined`は消え、非有限数は`null`、`-0`は0として二度の直列化とhashが一致し、lone surrogateも通る。`BigInt`だけはhashまたは直列化で例外となり、validator外側のcatchによって`false`になる。

これはjobや入力schemaが異常値を許可するという意味ではなく、**report validatorを外側8項目全体の一般strict JSON検査器として使えない**ことだけを示す。job、input、および最初のevidence probeは後続検査を抑制したfailed-report上の観測である。二つ目のevidence probeはsegmentation・determinism合格のメモリ内validator baseline上の観測である。いずれも同じpathが正式runnerのproduction成功経路で許可されることを証明しない。正式runnerはその前にJSON読込、checker、境界生成を通すため、validator単体のこの限界だけでproduction経路全体が合格するわけではない。

### 8.3 既存合成検査

既存検査は、次を確認している。

- 構文不成立JSONの読込拒否。
- 正常なplain JSONのexact schema、byte決定性、canonical key順。
- 正常なゲートA reportと裏付けの相互一致。
- status、hash、snapshot、投影等を個別に壊した場合の拒否。
- candidate 13実データのJSON往復不一致0件。

一方、`undefined`、非有限数、`-0`、`BigInt`、孤立surrogateを、B1のjob、モデル可視入力、対応表、manifest、report、意味出力へ意図的に置いて拒否・許可を確認する検査は無い。

## 9. B1実装契約へ渡す未固定事項

方向設計が承認された場合、B1実装契約では少なくとも次を一意にする必要がある。

1. job、内包ゲートA記録、モデル可視入力、対応表、manifest、report、意味出力のどこへ、同じ版付きstrict JSON検査を適用するか。
2. strict検査をcanonical hash計算と正式JSON直列化の**前**に行う順序。
3. `undefined`、非有限数、`BigInt`を無言の省略・`null`化・例外で救済せず、不成立として扱う入口。
4. `-0`を0と同じ値として許すか、別表現として拒否するか。
5. lone surrogateをescape保持して許すか、Unicode scalar不成立として拒否するか。
6. raw JSONの巨大指数が非有限数になった場合の拒否。
7. 許可した引用符、バックスラッシュ、改行、supplementary character等を、本文変更なしでescape・往復できることの検査。
8. productionと合成検査が同じstrict判定入口を使い、直列化処理を検査・sanitize・normalizeとして扱わないこと。
9. raw byteをstrict UTF-8として拒否検査するか、U+FFFD置換を許すか。
10. raw JSONの重複key、安全整数外の丸め、trailing text、code fence、複数JSON valueをどの段階で拒否するか。
11. sparse array、array追加property、`toJSON`、accessor、非plain object、symbol-key、非列挙propertyを受理領域外として検査するか。

ここでは、許可・拒否の答え、schema、違反種類、件数、CLI終了状態、検査実装を固定しない。これらはB1の実装契約完全性チェックで人間承認へ出す事項である。

## 10. 今回行っていないこと

- ゲートB方向設計・承認補足の承認、改訂、追記。
- B1 strict JSONの許可値、拒否値、違反種類、schema、入口の決定。
- コード、testdata、runner、prompt、正式packageの作成。
- 正式ゲートA runner、Web runner、Gemini・他LLMの実走。
- `DECISIONS.md`、`docs/HANDOVER.md`、承認済み設計文書の変更。
- 人間への新しい確認依頼。

## 11. 人間作業

- 本調査: **0件。**
- 主線で既に必要な判断: ゲートB方向設計と承認補足の一括承認1件。
- 本副線から追加する判断: **0件。**
