# candidate 13 字幕表示計画 B4 ネイティブfatal・配置数値境界 診断／契約確定追補 v001

- 日付: 2026-07-25
- 対象: B4正式合成検査 T082・T083
- 作業種別: 読み取り専用原因診断、契約矛盾の確定、追補案の提示
- 正式85件の再実行: **なし**
- production、fixture、期待値、承認済み契約の変更: **なし**
- 人間作業: 0件
- 状態: **契約矛盾を確定。追補の人間承認待ちで停止**

## 1. 結論

ネイティブ権限でなお終了code 2だった原因は、前回観測したUnix socketの`EPERM`ではない。

今回、T082・T083だけが使う正式CLI経路をリポジトリ外の一時観測器から起動し、次を確認した。

1. 固定済みNode、TSX、esbuildで実配置検査processは起動した。
2. 実配置検査processは終了code 0で完了した。
3. 実配置検査は110,996 byteのJSONを出力した。
4. 通常のJSON復号では`status: "passed"`の有効なobjectだった。
5. そのJSONには、承認済み配置式が作る`833.2`、`969.2`、`829.2`等の小数座標が含まれていた。
6. 正式runnerは、この内部配置結果をGemini往復・B1正式成果物用の**整数限定読取器**へ渡し、`number-invalid`で拒否した。
7. 正式runnerは信頼済みreportを作れないため、固定fatal JSONと終了code 2へ閉じた。

したがって、今回の停止は環境権限でもfixtureでもなく、**表示座標を、意味データ用の整数限定数値契約で読んでいる工程間境界の矛盾**である。

前回診断のうち「制限環境ではTSX内部socketが`EPERM`になった」という観測は正しい。一方、「socket作成可能なネイティブ環境へ移せばT082・T083が本来の経路へ進む」という単独原因の推定は不十分だった。ネイティブ環境でsocket問題を越えた後、別の契約矛盾が露出したため、本書を明示的な訂正記録とする。前回文書を上書きしない。

## 2. 診断範囲

正式85件は再実行していない。

Nodeの検査対象限定機能を使い、T082・T083だけを選択した。残り83件はskipされ、実行されていない。

診断は二段階で行った。

1. 外側の正式CLIが返すstdout、stderr、終了codeと、配置検査processの起動後停止位置を観測。
2. 一時出力JSONのbyte数、通常JSON復号結果、既存整数限定読取器の拒否理由、小数値の最初の出現箇所を観測。

観測器は`/private/tmp`に置き、実行時にだけprocess起動を包んだ。リポジトリ内のproduction、検査、fixture、期待値は変更していない。

使用した一時観測器:

| path | SHA-256 |
|---|---|
| `/private/tmp/zev-b4-diagnose-spawn.mjs` | `0dbb9ae62872fe3e1c5ee567479b166a9ad06466fae25ab49fb1df264f7e3ba4` |
| `/private/tmp/zev-b4-diagnostic-loader.mjs` | `5e4f293706043858724c6372dfcd6e788bcc97b1d6c80e5539e5bcd69d3b74e8` |
| `/private/tmp/zev-b4-layout-output-diagnose-spawn.mjs` | `f6a06f163212b509cc9477cff8696a63f948a072c2aed1575716722a890d3299` |
| `/private/tmp/zev-b4-layout-output-diagnostic-loader.mjs` | `17ee62dda679020e934e21a5c02b104666f3c110b5295750456e44e4fd41e5c2` |

配置出力観測器の初回試行は、観測sourceをメモリ上で組み立てる`String.replace`の置換文字列に含まれた`$'`が置換構文として解釈され、production起動前の構文エラーで無効になった。これはproductionの観測結果へ数えない。置換文字列を関数返値へ変更した後の観測だけを以下の正本とする。

## 3. T082・T083の完全観測

### 3.1 外側CLI

T082・T083の双方で同じだった。

| 項目 | 観測 |
|---|---|
| 終了code | 2 |
| stdout | `{"schemaVersion":"presentation-caption-display-pair-cli-fatal-v001","diagnostic":"CAPTION_B4_FORMAL_CLI_JOB_CONTEXT_UNAVAILABLE"}` |
| stderr | 0 byte |
| production runnerの最終停止 | 信頼済みreportを作れず固定fatalへ閉じた |

### 3.2 実配置検査

T082・T083の双方で同じだった。

| 項目 | 観測 |
|---|---|
| 固定TSXによる子process終了code | 0 |
| 一時出力file | 存在 |
| 一時出力byte数 | 110,996 |
| 通常JSON復号 | 成功 |
| 通常JSONのstatus | `passed` |
| 既存B1整数限定読取 | 拒否 |
| 拒否理由 | `number-invalid` |
| runner内部停止 | `TypeError: layout output invalid` |

最初に観測した小数は次である。

| JSONPath | 値 | 意味 |
|---|---:|---|
| `$.items[0].lineRects[0].top` | 833.2 | 行矩形の上端 |
| `$.items[0].lineRects[0].bottom` | 969.2 | 行矩形の下端 |
| `$.items[0].wrapper.top` | 829.2 | 表示領域の上端 |

同型の小数は後続itemにも続いていた。配置検査が返した値は、既存レンダラーの人間認定済み配置式から生じる画面上の幾何値であり、時刻ではない。

### 3.3 T083の停止位置

T083は、本来確認する`OUTPUT_ROOT_ALREADY_EXISTS`へ到達していない。

T082と共通の実配置検査結果を整数限定読取器が拒否した時点で先にfatalになっている。したがってT083の終了2は、出力先既存契約の判定結果ではない。

## 4. 環境仮説の生死

### 4.1 生きている部分

制限環境で行った前回の読み取り専用診断では、TSXが内部通信用Unix socketを作る段階で`EPERM`になり、配置検査sourceが起動せず、一時出力も作られなかった。この観測は撤回しない。

### 4.2 反証された部分

ネイティブ権限の今回観測では、次が成立した。

- `EPERM`なし。
- socketエラーなし。
- TSX child終了0。
- 配置検査outputあり。
- 配置検査自身のstatusは`passed`。

よって「ネイティブ環境でも同じsocket問題が続いた」は反証された。

また、「ネイティブ権限へ移れば環境原因だけが消えてT082・T083が合格する」という前回の単独原因推定も訂正する。環境原因は消えたが、その後段に独立した数値契約矛盾が存在した。

### 4.3 現在の環境記録

B4正式実行にUnix socket作成可能環境が必要という記録は、制限環境での実測に基づく既知条件として残す。ただし、現在のB4阻害要因は環境ではない。ネイティブ環境は配置検査実行条件を満たしている。

## 5. 終了code 2の内訳

固定fatalは、使い方誤り、I/O、実行環境、信頼済みreportを作れない内部状態を一つへ畳む。

今回の内訳は次である。

| 区分 | 該当 | 根拠 |
|---|---|---|
| 使い方誤り | いいえ | 正式job pathで起動し、配置検査まで到達 |
| I/O不能 | いいえ | 配置出力110,996 byteを作成・読取済み |
| 実行環境不能 | いいえ | 固定TSX childが終了0 |
| report-untrusted | **はい** | 内部配置結果を契約どおり解釈できず、正式reportを作れなかった |

ただし、外側stdoutの
`CAPTION_B4_FORMAL_CLI_JOB_CONTEXT_UNAVAILABLE`
だけからこの内訳は判別できない。今回もリポジトリ外の限定観測器が必要だった。

これは、固定fatalが安全に詳細を隠す一方で、同じcode 2の再診断に追加観測を要するという**fatal観測性の既知契約課題**である。

本書では観測性契約を勝手に変更しない。§9で人間判断へ戻す。

## 6. 帰属の三分法

| 帰属 | 判定 | 理由 |
|---|---|---|
| 実装が契約に届いていない | 一部だけでは説明不能 | runnerが整数限定読取器を選んだ実装は直接原因だが、承認済みB4契約自体が内部配置結果の数値profileを一意に固定していない |
| 検査の期待・設営が契約とずれている | いいえ | fixtureは実processを正しく起動し、配置検査はstatus `passed`を生成。T082の0、T083の1という期待も本来経路に対して正しい |
| 契約自体の矛盾 | **はい** | B4は人間認定済み配置式を実行する一方、工程出力をB1整数限定読取器で読む実装を許した。配置式は正当に小数座標を返すため両立しない |

契約矛盾と判定したため、単なる実装修正設計ではなく、以下を**契約確定追補案**として提示する。

## 7. 契約確定追補案: 配置数値境界

### 7.1 数値領域を三つに分ける

1. **B1所有・Gemini往復・B4正式7 JSON**
   - 従来どおりsafe integerだけ。
   - 小数、指数表記、negative zeroを拒否。
   - 時刻は整数ms、実行位置は整数frame/sample。
2. **人間認定済み表示台帳**
   - 既存追補どおり、固定4 JSONPath・4値だけ小数を許す。
   - 値の丸め、整数化、変更は禁止。
3. **固定配置検査が返す内部幾何観測**
   - B1正式成果物ではなく、表示台帳と固定レンダラーから導出した内部観測。
   - exact schemaで列挙した画面座標・寸法だけ有限小数を許す。
   - 時刻、ID、件数、indexへ小数を許さない。

第3領域を第1領域の整数限定読取器へ渡さない。

### 7.2 専用読取入口

配置検査結果専用の版付き入口
`decodePresentationCaptionB4LayoutInspectionJsonV001(bytes)`
を一つだけ設ける。

この入口は、既存B1 JSON読取器が内部で使う同じ字句解析処理の有限number profileを再利用する。次を禁止する。

- `JSON.parse`だけの別読取器。
- test専用読取器。
- B1整数限定読取器への`allowDecimals`引数追加。
- job、CLI、環境変数によるprofile切替。
- 汎用の「小数を許すJSON」公開入口。
- 配置値を丸めて整数限定読取器へ合わせる処理。

入口は配置検査結果のexact schemaを同時に検査し、schemaを通らない値を返さない。既存B1整数限定入口と、表示台帳の固定4値だけを許す入口は変更しない。

### 7.3 exact schemaと小数許可path

rootは次の三fieldだけ。

1. `status`
2. `items`
3. `violations`

`status`は`passed | failed`。

各itemは次だけ。

1. `layerId`: 文字列
2. `stateId`: 文字列
3. `resolvedText`: 文字列
4. `lineCount`: safe integer
5. `lineRects`: 配列
6. `wrapper`: object
7. `fontSizePx`: safe integer
8. `lineHeightPx`: 有限number

line rectangleは`left / top / right / bottom`の有限numberだけ。

wrapperは
`top / left / width / height / renderScale / displayWidth / displayHeight`
の有限numberだけ。

有限numberはnegative zero、非有限、safe範囲外整数を拒否する。小数を許すのは上記の幾何値と`lineHeightPx`だけで、時刻fieldはこのschemaに存在しない。

violationは、固定配置検査が持つ三codeだけを受理する。
各要素の共通fieldは`layerId / code / details`で、`layerId`は対応するitemの文字列IDである。

| code | details |
|---|---|
| `LINE_COUNT_EXCEEDS_CANDIDATE_LIMIT` | `actual / allowed`をsafe integer |
| `LINE_BOX_OUTSIDE_SAFE_AREA` | `lineIndex`をsafe integer、`rect`を上記幾何値、`safeAreaPx`を整数 |
| `LINE_BOX_POSITIVE_INTERSECTION` | `leftIndex / rightIndex`をsafe integer、`overlapWidth / overlapHeight`を有限number |

未知field、未知code、型不一致、BOM、重複key、trailing content、code fence、不正UTF-8、lone surrogateを拒否する。

### 7.4 B4正式成果物へ小数を流さない

B4 coreが内部配置観測から正式成果物へ移すのは、従来どおり次だけである。

- 配置検査の合否。
- 違反code。
- cue数、line数、最大論理文字幅、safe area失敗件数、正交差件数。

これらはboolean、文字列、safe integerである。

line rectangle、wrapper、`lineHeightPx`等の小数幾何値を、`layout-preflight.json`、pair manifest、validation reportその他のB4正式7 JSONへ複写しない。したがってB4正式7 JSONの整数限定契約は緩めない。

### 7.5 失敗時

配置検査出力が専用schemaを満たさない場合、trusted reportを推測して作らない。現行fatal v001を維持するか、観測性をv002へ改訂するかは§9の別判断とする。

### 7.6 禁止する解決

- `833.2`を`833`へ丸める。
- 承認済み配置係数、font、safe area、anchorを変更する。
- 配置検査をmockまたはskipする。
- T082・T083の期待終了codeを2へ変える。
- B1整数限定読取器を全体的に緩和する。
- 小数時刻を導入する。
- v001を暗黙変換する互換shimを作る。

## 8. 追補承認後の修正・検査範囲案

本書の承認は、次段の版付き実装修正設計を起草する承認までとする。コード変更と再実行は別承認にする。

実装修正設計には少なくとも次を含める。

1. 配置結果専用読取入口の実体path、export、入力、返値。
2. 既存字句解析処理を一つだけ使う構造。
3. exact schemaと許可数値pathの全検査。
4. 実際のrunnerが同じ入口を使うことの検査。
5. 小数幾何値を含む正常例。
6. 小数時刻、未知小数path、negative zero、重複key、BOM等の拒否例。
7. B1整数限定検査と表示台帳固定4値検査の回帰。
8. T082・T083を含む85件の頭から一回実行。
9. 85/85の場合だけ既存回帰95件、candidate 13読み取り専用preflight。

今回の観測から、T082・T083はこの追補で同じ根本原因を解消する見込みである。ただし、修正後に初めて到達する下流不合格の有無は未実測であり、合格を予告しない。

## 9. fatal観測性の判断

### 案A: 現行fatal v001を維持し、既知限界として保留

- 固定fatalが未信頼の内部情報、絶対path、stackを外へ漏らさない利点を維持。
- 今回の配置数値境界修正とは分離。
- 同種のcode 2が再発した場合は、別承認の限定診断を要する。

### 案B: fatal v002の設計を別ゲートで起草

- 外へ出して安全な閉語彙の`causeClass`または`failureStage`だけを追加。
- OS message、stack、絶対path、内部JSON本文は出さない。
- usage / I/O / runtime / report-untrustedを外側から区別可能にする。
- schema、検査、利用側を版付きで改訂し、v001の暗黙受理・変換は行わない。

**推奨は案A**。

理由は、現在のB4阻害要因は配置数値境界で一意に確定し、fatalの公開schemaを広げなくても修正設計へ進めるためである。観測性不足は実在するが、いま同時に直すと「処理を成立させる修正」と「診断表示の改訂」が混ざる。次にcode 2の再診断が必要になった時点、または外部自動運用へ接続する前に、案Bを独立した単変数として判断する。

## 10. 人間へ求める判断

1. §7の配置数値境界追補を承認するか。
2. fatal観測性は推奨案Aとして保留するか、案Bの別設計を先に求めるか。

必須の人間作業は上記2判断だけ。時間計測は行わない。

承認された場合も、次は版付き実装修正設計の提示で停止する。実装、85件再実行、回帰、preflight、B4完了、tag、JOURNAL、B5、Gemini、正式pair、描画へ自動では進まない。
