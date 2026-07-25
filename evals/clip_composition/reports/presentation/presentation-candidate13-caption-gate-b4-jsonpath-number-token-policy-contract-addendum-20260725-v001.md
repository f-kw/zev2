# candidate 13 字幕表示計画 B4 JSONPath別数値token方針 契約追補 v001

- 日付: 2026-07-25
- 対象:
  - `presentation-candidate13-caption-gate-b4-layout-inspection-finite-number-decoder-implementation-repair-design-20260725-v001.md`
  - `presentation-candidate13-caption-gate-b4-native-fatal-layout-number-boundary-diagnosis-and-contract-addendum-20260725-v001.md`
- 種別: 実装前停止で判明した数値表記層の未固定を閉じる版付き契約追補
- 状態: **草案。kawafmm承認待ち**
- コード変更: なし
- 検査実行: なし
- Gemini、正式表示計画、描画: なし
- 人間作業: 本追補の承認または却下1件

## 1. 結論

案Aを採る。

既存の一つの厳密JSON解析処理へ、現在位置を表すpathと、版付きで固定した数値token方針を追加する。第二のJSON parser、raw JSONへの正規表現検査、復号後の値から元表記を推測する処理は作らない。

数値tokenは次の三通りに分ける。

1. **整数field**: JSONの整数tokenだけを受理する。小数点と指数表記は、値が整数になる場合も拒否する。
2. **内部画面幾何field**: JSON number grammarに適合する有限値を受理する。通常小数と指数表記を受理する。
3. **未列挙の数値field**: 拒否する。

したがって、内部画面幾何fieldの`8.332e2`は数値`833.2`として受理する。一方、整数fieldの`1e0`と`1.0`は、どちらも数値`1`になるが`number-invalid`で拒否する。

この追補は、小数を一般開放するものではない。B1、Gemini往復、正式package、正式B4成果物、時刻、件数、indexの整数契約と、人間認定済み表示台帳の固定4係数を変更しない。

## 2. 案Aを採る理由

停止原因は、表記層の規則を値層だけを見る処理の後段へ置いていたことである。

現行parserは`1e0`を正しくJSON numberとして読み、数値`1`へ変換する。しかし変換後には、元tokenが`1`か`1e0`かという情報が残らない。よって、整数fieldの指数表記拒否は復号後schemaだけでは実現できない。

第二parserを新設すると、文字列escape、重複key、配列、object、number grammar、Unicode、trailing contentの解釈が二系統になる。これは正規化の二重実装であり、将来の不一致を作る。

既存parser自身が、すでに正しく切り出しているnumber tokenと、そのtokenが現れたpathを同時に見る形だけが、次をすべて満たす。

- JSON解釈を一つに保つ。
- 整数契約を弱めない。
- 内部幾何の正当な有限小数・指数表記を拒否しない。
- 未知fieldへ数値を増やさない。
- 承認済み検査12を実装可能にする。

## 3. 承認済み文書への改訂範囲

本追補が承認された場合だけ、次を改訂したものとして扱う。

| 元文書 | 改訂する箇所 | 本追補の正本 |
|---|---|---|
| 内部配置有限数値読取 実装修正設計v001 | §4.1の既存parser再利用方法 | §4〜§6 |
| 同上 | §8.1の12件一件表 | §9.1 |
| 同上 | §13の「数値field区分」「検査可能性」「未確定0件」 | §10 |
| 配置数値境界 契約追補 | 第3数値区分の表記規則 | §5 |

元文書を黙って書き換えない。承認後に元文書へ追補pathと承認日を案内追記し、改訂履歴を残す。承認前の現在は、元文書の実装承認を再開しない。

## 4. 単一parserへ追加するpath追跡契約

### 4.1 変更対象

対象は、既存の厳密JSON解析処理を所有する次の一fileだけである。

`evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs`

既存の`StrictJsonParser`を拡張する。別fileに字句解析を複製しない。

### 4.2 pathの内部表現

pathは連結済み文字列ではなく、decoded keyとarray indexを区別できるtag付きsegment列で持つ。

| JSON位置 | segment列 |
|---|---|
| root | `[]` |
| root直下の`items` | `[{kind:"key", value:"items"}]` |
| `items`の先頭要素 | `[{kind:"key", value:"items"}, {kind:"index", value:0}]` |
| その`lineCount` | `[{kind:"key", value:"items"}, {kind:"index", value:0}, {kind:"key", value:"lineCount"}]` |

規則:

1. object childは、JSON stringとして復号・surrogate検査済みのkeyを`{kind:"key", value:<decoded key>}`として末尾へ一つ追加する。
2. array childは、欠けのない配列へ追加する直前のsafe non-negative integer indexを`{kind:"index", value:<index>}`として末尾へ追加する。
3. rootの`parseValue`は空segment列で開始する。
4. numberを読む時点で、元token文字列、変換後の数値、segment列の三つを同じparser内で数値方針へ渡す。
5. keyに`.`、`[`、`]`等が含まれてもsegmentの境界は失わない。表示用JSONPath文字列を照合正本にしない。
6. 固定patternはkey literalとarray-index wildcardだけを持つ。segment数の完全一致、kindの一致、key literalの完全一致を要求し、prefix、glob、正規表現、大小文字の正規化は使わない。
7. 数値pathは整数または幾何のどちらか一方だけに一致しなければならない。両方への一致は方針定義の矛盾として`number-invalid`へ閉じ、実装検査も不合格にする。

このsegment列から、固定patternだけを照合する。job、CLI、環境変数、入力JSONからpatternを追加・差し替えできない。

### 4.3 既存二profileの維持

| 既存profile | 変更後の扱い |
|---|---|
| B1整数限定 | 現行どおり全number tokenで`.`と`e/E`を拒否する。pathによる例外を作らない |
| 外部表示情報 | 現行どおりJSON number grammarを読み、その後の固定slot・固定4係数・exact schema検査で制限する。字句受理を狭めも広げもしない |

既存二profileでは、path追跡が存在しても合否結果へ使わない。既存入口、reason、canonical化、hash計算の意味を変えない。

### 4.4 B4内部配置専用profile

非公開の版付きprofileを一つ追加する。

```text
b4-layout-number-token-policy-v001
```

このprofileを使える公開入口は、承認済み設計の
`decodePresentationCaptionB4LayoutInspectionJsonV001(bytes)`
だけである。

汎用の`allowDecimals`、外部から渡すcallback、job field、CLI option、環境変数を作らない。未知profileは従来どおり`number-invalid`へ閉じる。

## 5. JSONPath別token方針

以下のJSONPath表記は人間が読むための表記であり、実装の照合正本は§4.2のsegment patternである。

### 5.1 整数tokenだけを受理するpath

受理token grammar:

```text
-?(0|[1-9][0-9]*)
```

受理後も既存どおり、finite、negative zero拒否、safe integerを検査する。各fieldの非負・範囲・配列対応等は、承認済みexact schemaの意味検査をそのまま使う。

| JSONPath | 数値の意味 | `1` | `1.0` | `1e0` |
|---|---|---:|---:|---:|
| `$.items[*].lineCount` | 行数 | 受理 | 拒否 | 拒否 |
| `$.items[*].fontSizePx` | font size | 受理 | 拒否 | 拒否 |
| `$.violations[*].details.actual` | 実行数 | 受理 | 拒否 | 拒否 |
| `$.violations[*].details.allowed` | 許可数 | 受理 | 拒否 | 拒否 |
| `$.violations[*].details.lineIndex` | 行index | 受理 | 拒否 | 拒否 |
| `$.violations[*].details.safeAreaPx.top` | 安全領域上端 | 受理 | 拒否 | 拒否 |
| `$.violations[*].details.safeAreaPx.right` | 安全領域右端 | 受理 | 拒否 | 拒否 |
| `$.violations[*].details.safeAreaPx.bottom` | 安全領域下端 | 受理 | 拒否 | 拒否 |
| `$.violations[*].details.safeAreaPx.left` | 安全領域左端 | 受理 | 拒否 | 拒否 |
| `$.violations[*].details.leftIndex` | 左行index | 受理 | 拒否 | 拒否 |
| `$.violations[*].details.rightIndex` | 右行index | 受理 | 拒否 | 拒否 |

`details`に許されるfieldの組合せはviolation codeごとのexact schemaが別途固定している。たとえば`actual`は`LINE_COUNT_EXCEEDS_CANDIDATE_LIMIT`でだけ成立する。token方針は未知の組合せを正当化しない。

### 5.2 有限なJSON number tokenを受理する内部画面幾何path

受理token grammarは、現行parserがすでに使うJSON number grammarそのものとする。

```text
-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?
```

tokenを数値化した後、次をすべて満たす場合だけ受理する。

1. `Number.isFinite`が真。
2. negative zeroでない。
3. 数値化後の値が整数ならsafe integer範囲内。

指数表記は受理する。たとえば`8.332e2`は`833.2`、`1e0`は`1`として受理する。これは内部画面幾何だけの表記規則であり、時刻や意味データへ波及しない。

| JSONPath | 数値の意味 |
|---|---|
| `$.items[*].lineRects[*].left` | 行矩形左端 |
| `$.items[*].lineRects[*].top` | 行矩形上端 |
| `$.items[*].lineRects[*].right` | 行矩形右端 |
| `$.items[*].lineRects[*].bottom` | 行矩形下端 |
| `$.items[*].wrapper.top` | 表示領域上端 |
| `$.items[*].wrapper.left` | 表示領域左端 |
| `$.items[*].wrapper.width` | 表示領域幅 |
| `$.items[*].wrapper.height` | 表示領域高 |
| `$.items[*].wrapper.renderScale` | 内部配置結果の描画scale |
| `$.items[*].wrapper.displayWidth` | 内部表示幅 |
| `$.items[*].wrapper.displayHeight` | 内部表示高 |
| `$.items[*].lineHeightPx` | 行高 |
| `$.violations[*].details.rect.left` | 安全領域外の行矩形左端 |
| `$.violations[*].details.rect.top` | 安全領域外の行矩形上端 |
| `$.violations[*].details.rect.right` | 安全領域外の行矩形右端 |
| `$.violations[*].details.rect.bottom` | 安全領域外の行矩形下端 |
| `$.violations[*].details.overlapWidth` | 正交差幅 |
| `$.violations[*].details.overlapHeight` | 正交差高 |

### 5.3 未知の数値path

§5.1と§5.2のどちらにも一致しないnumber tokenは`number-invalid`で拒否する。

これには、未知field、時刻風field、将来fieldを承認なしで足した場合を含む。数値以外の未知fieldは、従来どおり後段のexact schemaで`schema-invalid`になる。両者のreason差は、数値token段で拒否したかschema段で拒否したかという処理位置の差であり、正式B4違反コード69件は変更しない。

## 6. parser内の判定順

B4内部配置専用profileでは、number token一件ごとに次の順で処理する。

1. 現行のJSON number grammarでtoken末尾まで切り出す。
2. segment列を、§5の固定patternへ照合する。
3. 未知pathなら`number-invalid`。
4. 整数pathなら、`.`または`e/E`を含むtokenを`number-invalid`。
5. 内部画面幾何pathなら、通常小数・指数表記を含むJSON number tokenを許可。
6. `Number(token)`へ変換する。
7. finite、negative zero、safe integer範囲を既存規則で検査する。
8. 数値をobjectへ格納する。
9. 全体復号後、承認済みexact schemaと構造間関係を検査する。

token文字列を正式成果物へ保存しない。tokenを保持した第二成果物を作らず、判定時だけ使う。

## 7. 既存受理挙動の結果不変比較

### 7.1 目的

path追跡の追加はparserの中核変更である。B4専用profileだけを増やしたつもりでも、既存B1整数限定と外部表示情報の挙動が変わっていないことを、検査件数だけでなく同じ入力に対する同じ結果・同じhashで確認する。

### 7.2 baselineをparser変更前に固定する

実装時は、parser本体へ触る前に検査用projection生成処理と新規12件を完成させる。projection生成処理はtest-onlyとし、production exportを増やさない。

projection生成と比較は、既存
`evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs`
の直接実行時だけ使える次の二modeとして固定する。通常の`node:test`実行では従来どおり133件だけを登録する。

```text
--emit-number-token-invariance-projection-v001 <output-path>
--compare-number-token-invariance-projections-v001 <before-path> <after-path> <output-path>
```

test fixture内の既存正常系builder/checkerを使い、production coreへprojection専用exportを追加しない。二modeを含む検査fileはbaseline生成前に完成させ、そのbyte SHA-256を固定した後はbefore/after間で変更しない。

保存先は次の一directoryだけとする。

```text
evals/clip_composition/outputs/presentation/caption-b4-number-token-invariance-v001/
```

固定file名:

1. `before.json`
2. `after.json`
3. `comparison.json`

`before.json`と`after.json`は次のexact objectとする。key順もこの順で固定する。

```json
{
  "schemaVersion": "presentation-caption-b4-number-token-invariance-projection-v001",
  "phase": "before",
  "harnessFileSha256": "<64 hex>",
  "parserFileSha256": "<64 hex>",
  "projection": {
    "b3StrictJson": [],
    "externalDisplaySlots": [],
    "builtArtifacts": [],
    "fixedHashProbe": {}
  },
  "projectionCanonicalSha256": "<64 hex>"
}
```

- `phase`だけが`before / after`の二値。
- `harnessFileSha256`は二modeを所有する検査fileの実byte SHA-256。
- `parserFileSha256`はそのphaseで使ったparser所有fileの実byte SHA-256。
- `projectionCanonicalSha256`は`projection`だけを既存canonical化処理へ通したSHA-256。
- 診断時刻、duration、temporary path、commitは入れない。

`comparison.json`は次のexact objectとする。

```json
{
  "schemaVersion": "presentation-caption-b4-number-token-invariance-comparison-v001",
  "beforeFileSha256": "<64 hex>",
  "afterFileSha256": "<64 hex>",
  "harnessUnchanged": true,
  "inputsUnchanged": true,
  "projectionUnchanged": true,
  "beforeProjectionCanonicalSha256": "<64 hex>",
  "afterProjectionCanonicalSha256": "<64 hex>",
  "status": "passed"
}
```

三booleanが全て真で、二projection SHA-256が同じ時だけ`status: "passed"`。それ以外は`status: "failed"`として差分を実行記録へ残し、そのattemptを停止する。比較器は入力を直さず、差分を無視するoptionを持たない。

基準:

| 項目 | 固定値 |
|---|---|
| baseline source commit | `bc70266a8c17d10550c7c56526982548e930d06b` |
| parser所有file SHA-256 | `db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224` |
| 既存source package検査file SHA-256 | `82bcd219a9b2fb9981cc975812b823de5309071b8f35bc51fa9a6ac837409b2d` |

現在HEADは停止記録commitを含むが、上記二コードfileはbaseline source commitとの差分0であることを確認済みである。

実装順:

1. `test_presentation_caption_layout_inspection_json_v001.mjs`と、既存source package検査fileのtest-only projection modeを先に完成させる。
2. projection modeと12件一件表のfile SHA-256を実行記録へ固定する。
3. parser未変更の状態で`before.json`を一回生成する。
4. `before.json`のfile SHA-256とprojection部分のcanonical SHA-256を実行記録へ固定する。
5. ここまで成立した場合だけparser本体を変更する。
6. parser変更後に、同じprojection mode、同じ入力hashで`after.json`を一回生成する。
7. 比較器は`before.json`と`after.json`のprojection部分をbyte一致で比較する。

baseline生成に失敗した場合、baselineを実装後の値から作り直さず停止する。

### 7.3 projectionへ含めるもの

projectionは時刻、temporary path、duration、commit等の実行ごとに変わる診断値を含めない。次の処理結果だけを固定順で含める。

1. B3正式7 JSONそれぞれについて:
   - path
   - 入力file SHA-256
   - B1整数限定入口の受理状態
   - 復号値のcanonical SHA-256
2. 既存source package検査fileの`makeValidFixture()`が作る正常fixtureについて:
   - 外部表示情報6 slotのroleと入力file SHA-256
   - JSON 5 slotの解決状態とcanonical SHA-256
   - text layout byte 1 slotの解決状態とfile SHA-256
   - builderが作る正式7 artifactのfile SHA-256とcanonical SHA-256
3. 既存hash入口へUTF-8 byte
   `presentation-caption-b4-number-token-invariance-v001`
   を渡した時の、入力file SHA-256と返値。

各配列要素のexact shapeと順序:

| 配列 | 要素 | 順序 |
|---|---|---|
| `b3StrictJson` | `{path, fileSha256, decodeStatus, canonicalSha256}` | 正式packageの既存7 file固定順 |
| `externalDisplaySlots` | `{role, path, fileSha256, resolutionStatus, canonicalSha256}` | 既存6 slot固定順。byte slotのcanonicalは`null` |
| `builtArtifacts` | `{fileName, fileSha256, canonicalSha256}` | builderの既存7 artifact固定順 |

`fixedHashProbe`は
`{utf8, inputBytesSha256, returnedStatus, returnedSha256}`
のexact objectとする。`utf8`には上記固定文字列をそのまま入れる。

外部表示情報は、private decoderをtest用にexportして直接呼ばない。既存のpackage builder/checkerが使う正式経路で解決し、結果をprojectionへ写す。これにより「検査用の別入口は同じ結果だがproduction経路は違う」という穴を作らない。

### 7.4 比較の合格条件

次をすべて満たした場合だけ結果不変とする。

1. projection生成処理のbyte SHA-256がbefore/afterで同一。
2. 全入力file SHA-256がbefore/afterで同一。
3. B1整数限定入口の受理状態が全件同一。
4. 外部表示情報6 slotの解決状態が全件同一。
5. 全canonical SHA-256が同一。
6. 全formal artifact file SHA-256が同一。
7. projection部分のcanonical byteが完全一致。

parser所有fileのSHA-256は意図して変わるため、不変条件にしない。変化前後のSHA-256を両方記録し、変更対象がそのfileであることを示す。

このprojection比較は新しい品質点数ではない。既存挙動が変わっていないことだけを検査する。

### 7.5 検査件数との関係

projection生成・byte比較は検査前後の証拠工程であり、`node:test`の件数へ加算しない。

正式な検査件数は従来どおり次の327件である。

| 系統 | 件数 |
|---|---:|
| 新規・内部配置JSON読取 | 12 |
| 既存B1 source package | 133 |
| B4正式合成 | 87 |
| 既存回帰 | 95 |
| 合計 | 327 |

既存133件は全件を再実行し、B1整数限定、外部表示情報の固定4係数、canonical化、hash計算を含む既存test名・合否を維持する。

## 8. 実装範囲

本追補承認後も、前回承認済み実装修正設計§9のfile範囲を広げない。

数値token方針の実装は次に限定する。

1. 既存parser所有file内のpath追跡とB4専用固定方針。
2. 同file内のB4内部配置専用公開入口。
3. 既存runnerの配置結果読取一箇所。
4. 既存bindingの13件目。
5. 新規12件と既存検査の必要な期待更新。
6. test-only結果不変projectionとその実行記録。

parserの別file化、第三者parser導入、正規表現によるraw JSON再解釈、jobからのprofile注入、正式成果物へのtoken保存は含まない。

## 9. 更新後の12件一件表

### 9.1 正本表

本追補の承認後、旧設計§8.1の表を次で上書きする。件数は12件のまま変えない。

| 番号 | 検査 | 期待 |
|---:|---|---|
| 1 | 全許可幾何pathに通常小数を含む`passed` | `decoded` |
| 2 | 三違反種類と通常小数幾何を含む`failed` | `decoded` |
| 3 | `lineCount: 1.5` | `number-invalid` |
| 4 | `fontSizePx: 12.5` | `number-invalid` |
| 5 | 整数pathと幾何pathのnegative zero | いずれも`number-invalid` |
| 6 | NaN・Infinity・非数 | いずれも拒否。JSON grammar外は`syntax-invalid`、JSON string等の型違いは`schema-invalid` |
| 7 | 整数path、幾何pathのsafe範囲外整数token | いずれも`number-invalid` |
| 8 | `safeAreaPx`の通常小数 | `number-invalid` |
| 9 | 未知数値field・時刻風数値field | `number-invalid`。数値でない未知fieldは`schema-invalid` |
| 10 | 未知違反code・既知codeのdetails形不一致 | `schema-invalid` |
| 11 | BOM・重複key・trailing content・code fence・不正Unicode | 既存reasonで拒否 |
| 12 | 表記層の区分: 幾何pathの`8.332e2`と`1e0`、整数pathの`1e0`と`1.0`、整数pathの通常`1` | 幾何2件は受理して`833.2`・`1`、整数の指数・小数点2件は`number-invalid`、通常整数は受理 |

### 9.2 検査12の意味

検査12は、「指数表記を一般に許すか」という検査ではない。同じtoken表記が置かれたJSONPathによって、承認済みの数値区分どおりに扱われることを一件のtable-driven testで確認する。

この検査は次を同時に固定する。

- 幾何fieldでは有限な指数表記を拒否しない。
- 整数fieldでは、値がsafe integerへ変換できても指数・小数点表記を拒否する。
- 通常の整数tokenは従来どおり受理する。
- token方針追加後も復号値そのものは通常の数値であり、正式成果物へ元tokenを保存しない。

## 10. 実装契約完全性チェック

| 項目 | 状態 | 根拠 |
|---|---|---|
| 数値tokenの表記区分 | 固定 | §5 |
| JSONPathの内部表現 | 固定 | §4.2 |
| object／arrayのpath更新 | 固定 | §4.2 |
| 既存二profileの挙動 | 不変 | §4.3、§7 |
| B4専用profileの入口 | 固定 | §4.4 |
| 未知数値path | 拒否 | §5.3 |
| 指数表記の扱い | 整数は拒否、幾何は受理 | §5、§9 |
| finite／negative zero／safe integer | 固定 | §5.2、§6 |
| exact schemaとの責務分離 | 固定 | §5.1、§5.3、§6 |
| 結果不変比較 | before/after byte比較まで固定 | §7 |
| 12件一件表 | 固定 | §9 |
| 検査総数 | 327件 | §7.5 |
| candidate固有値 | preflightだけ | 元設計§7 |
| 実装範囲 | 前回承認範囲内 | §8 |
| 実装後停止点 | 元設計どおり | §11 |

本追補が承認された場合、数値token表記に関して実装者判断を要する未確定は0件となる。

## 11. 承認後の実行順と停止点

本追補の承認後だけ、前回承認範囲を次の順で再開する。

1. 承認済み文書の作業ツリーbyteと承認時commitを照合。
2. parser変更前の結果不変baselineを§7の手順で固定。
3. §8の限定実装。
4. parser変更後projectionを作り、before/after完全一致を確認。
5. 新規12件。
6. 既存B1 source package 133件。
7. B4正式合成87件を頭から一回。
8. 87/87の場合だけ既存回帰95件。
9. 327/327の場合だけcandidate 13読み取り専用preflight v002を一回。
10. B4完了報告。安定点3条件成立時だけtagとJOURNALを同一commitで記録。
11. B5のprompt・費用固定承認依頼を起草して停止。

次のいずれかで停止し、同attemptで修正・再実行しない。

- baselineをparser変更前に固定できない。
- projection生成処理または入力hashがbefore/afterで異なる。
- projection byteが一件でも異なる。
- 327件の一件でも不合格。
- preflight v002が一件でも不合格。
- 未列挙の数値pathまたは新しい数値区分が必要になる。
- 既存整数契約、固定4係数、B4正式schema、69違反codeを変える必要が出る。
- 許可外file変更または別parserが必要になる。

Gemini実走、正式表示計画生成、正式pair、描画、B5実装、B6は本追補の実装範囲に含めない。

## 12. fatal観測性

fatal観測性の改訂候補は別残件のまま維持する。今回の数値token表記の追補へ混ぜない。

## 13. 承認依頼

次の1件を承認してほしい。

> 本追補v001を、内部配置有限数値読取 実装修正設計v001への版付き改訂として承認する。承認後は§11の順序と停止条件で、前回承認済みの限定実装・327件・candidate 13読み取り専用preflight v002・B4完了報告・B5承認依頼起草までを再開してよい。Gemini、正式表示計画、正式pair、描画、B5実装、B6は含めない。
