# candidate 13 基本テロップ ゲートB1 JSON・表示信頼境界 契約確定追補 v001

- 日付: 2026-07-23
- 状態: **2026-07-24 kawafmm承認済み。第三原因のhash意味改訂を含む。実装・全件再実行・candidate 13読み取り専用preflightまで承認、正式入力生成は未承認**
- 対象:
  - `presentation-candidate13-caption-gate-b1-implementation-contract-design-20260723-v001.md`
  - `presentation-candidate13-caption-gate-b2-completion-rerun-stop-report-20260723-v001.md`
- 人間作業: 本追補の承認判断1件。媒体視聴なし、時間計測なし

## 1. 目的と停止点

目的は、B2完成版検査で露出した契約境界を一意にし、次の再実行で実装者が独自に値・例外・比較方式を選べない状態にすることである。

今回確定する中心事項は次の二つである。

1. strict JSON decoderが返すobjectの正本形式
2. B1が生成・Geminiと往復する整数限定データと、人間認定済み表示台帳にある小数値との境界

静的監査では、上記二点を直して表示信頼鎖照合まで到達した正常経路を必ず不成立にする第三の契約矛盾も見つかった。検査を一度ずつ失敗させて直す消耗を避けるため、本追補では第三原因を独立項目として開示し、同時改訂案を提示する。

本追補の提示で停止する。承認前には次を行わない。

- 実装または検査の変更
- 55件の再実行
- 意味回答側検査、既存回帰、candidate 13 preflight
- 正式7ファイルpackage生成
- prompt登録、Gemini実走、指示書、描画
- 人間認定済み台帳・信頼情報・見た目係数の変更

## 2. 改訂権限と適用方法

本追補が承認された場合、その承認を次の条項の改訂承認とする。

| 元設計の条項 | 本追補で確定する内容 |
|---|---|
| §4.1 | strict decoderの返却object形 |
| §5.1〜§5.4 | strict JSONの適用範囲、数値、object、canonical化 |
| §6.1 | 表示幅用6入力のうち、外部JSON 5件を読む固定profile |
| §8.3(2) | renderer trustの小数を含む読取・canonical hash照合 |
| §8.3(4) | 二つの検査indexを信頼bindingへ照合するhashの意味 |
| §16 | 既存違反コードへの帰属 |
| §20 | 合成検査と回帰条件 |
| §21 | 工程間の受け渡し・検査可能性の完全性確認 |

承認後は、元設計本文へ「本追補が上記条項を改訂する」という案内と改訂履歴だけを追記する。元の記述を経緯不明のまま消さない。

## 3. strict JSON decoderの正本object形式

### 3.1 decoderが生成する値

`decodePresentationCaptionB1StrictJsonV001`が正常に復号したJSON objectは、root・入れ子を問わず次の一形式だけとする。

- prototypeは常に`null`
- objectは復号時に新規生成する
- JSON memberは入力JSONに現れた順に、own data propertyとして一度だけ作る
- propertyはenumerable・writable・configurable
- accessor、継承property、symbol propertyを作らない
- `__proto__`、`constructor`、`prototype`も特別扱いせず、安全なown string keyとして保持する
- 重複keyはproperty作成前の検出で拒否し、後勝ちにしない
- decoderはobjectをfreezeせず、class instanceへ変換しない

配列は通常のdense Arrayとして入力順を維持する。string、boolean、null、許可されたnumberは値を変更しない。

decoderはkeyをsortしない。canonical化だけがobject keyをUTF-16 code unit順へ再帰sortする。

JavaScriptのown-key観測順はECMAScriptの`OwnPropertyKeys`規則に従う。B1の正式schema keyはarray-index keyを使わないため、正式schemaのobjectでは生成順と`Object.keys`順が一致する。未知keyや数字だけのkeyはschema検査で別途拒否し、decoderの一般契約を利用して正式schemaへ持ち込まない。

### 3.2 メモリ内値の受理との分離

元設計§5.2の「prototypeが`Object.prototype`または`null`のplain objectを受理する」は、builder等から渡される**メモリ内入力の受理契約**として維持する。

これはdecoderが二種類のprototypeを任意に返してよいという意味ではない。decoder出力は前節のnull prototype一択であり、往復検査もその形を期待する。値だけを比較してprototype差を無視する方式にはしない。

## 4. 数値契約を二つのprofileへ分離する

### 4.1 B1所有・Gemini往復profile

次は従来どおりB1 strict JSONを使い、numberはschemaで明記されたsafe integerだけとする。小数を許可しない。

- B1 job
- Gate AからB1へ渡すB1所有の構造化値
- 正式7ファイルpackage
- Geminiへ渡す入力
- Gemini raw出力
- 意味回答の展開入力・出力
- package/semanticのreport・manifest
- B1 builderが生成する全成果物

B1 strict decoder・メモリ内検査・正式直列化・canonical化の公開入口は、今後も小数を`number-invalid`として拒否する。この入口へ汎用的な`allowDecimals`引数、job field、CLI option、環境変数を追加しない。

B1 strict decoderが受理するJSON number tokenは、`-?(?:0|[1-9][0-9]*)`に一致する10進整数表記だけとする。小数点または指数記号`e`/`E`を含むtokenは、復号後の意味値が`1`や`100`のようなsafe integerになる場合でも`number-invalid`とする。その後にsafe integer範囲と`-0`でないことを検査する。現行decoderの字句規則を緩和しない。

### 4.2 人間認定済み表示台帳の読取profile

`widthPolicyBindings`の固定6 roleのうち、次の外部JSON 5件だけに、package内部の「承認済み表示台帳読取profile」を使う。

1. `presetRegistry`
2. `presetValidationIndex`
3. `materialValidationIndex`
4. `registryBinding`
5. `rendererTrust`

6件目の`textLayoutImplementation`はJavaScript実装byteであり、JSON profileの対象ではない。

package coreは、元設計§6.1の「配列位置から期待role・期待pathへの対応」を定数として内蔵する。最初に、観測したslot、job bindingのrole/path、snapshotのpathをその内蔵定数へ照合する。三者が一致した後にだけ、**内蔵slot**からprofileを選ぶ。jobが申告したrole/pathそのものをprofile選択入力にしない。入力JSONの自己申告、job、model、builder、CLI、環境変数、呼出側の引数でprofileを変更できない。

外部表示台帳用のprivate decoderは、標準JSON number grammarを復号し、有限な意味numberを得る。非有限、`-0`、safe範囲外整数は復号段階で拒否する。復号後、role別の再帰validatorが、整数ならsafe integer、非整数なら§4.3の正確な4 JSONPath・4値だけを許可する。検証に成功した値だけをcanonical化へ渡す。B1 strict decoderへ分岐や小数許可を追加せず、test専用の別parserも作らない。

このprofileでも、次はB1 strict JSONと同じである。

- fatal UTF-8
- BOM拒否
- 単一JSON value
- trailing text・code fence拒否
- 重複key拒否
- Unicode scalar string
- null prototypeの復号object
- dense Array
- 非有限数、`-0`、safe範囲外整数の拒否
- 未知field、型不一致、未承認値の拒否

専用profileは数値境界だけを担当する。renderer trust全体の新しいshadow schemaを作らず、元設計§8.3のversion・全field・型・固定値検査とcanonical hash完全一致を維持する。他の4 JSONも既存schema検査を維持する。

外部JSONはB1が再直列化して正式成果物として保存しない。安定読取した実byteをhashし、復号後のschemaとcanonical hash鎖を検査するためだけに使う。

### 4.3 小数を許す場所と値

現行v001で小数を許すのは、`rendererTrust`の次の4箇所だけである。

| JSONPath | 人間認定済み値 | 意味 |
|---|---:|---|
| `$.layoutRules.textSafePaddingRatio` | `0.04` | 文字周囲の安全余白比率 |
| `$.layoutRules.horizontalSafeMarginRatio` | `0.04` | 横方向の安全余白比率 |
| `$.layoutRules.verticalSafeMarginRatio` | `0.02` | 縦方向の安全余白比率 |
| `$.layoutRules.fallbackTextAreaRatio` | `0.98` | 代替文字領域比率 |

同じ`rendererTrust`内でも、上記以外の小数は拒否する。他の4つの外部JSONでは小数を許可しない。値の丸め、整数化、別係数への置換、許容差比較を行わない。

上記4値を変える場合は、既存の信頼契約どおり、新preview、人間再認定、新しい台帳・信頼版、B1契約改訂を要する。

### 4.4 時刻の整数契約

小数許可は、上記4つの無次元な見た目係数だけに限る。

- `startMs`、`endMs`等の時刻は整数ミリ秒
- 実行段階のframe位置・frame件数は整数
- sample位置・sample件数は整数
- B1所有データ、外部表示台帳、将来契約を問わず、小数の時刻表現を導入しない

見た目係数の許可を、時刻の補間・許容差・丸めへ転用しない。

## 5. 外部台帳のbyte・canonical hash契約

### 5.1 二種類のhashを維持する

外部JSONごとに次を別々に検査する。

- file SHA-256: 安定読取した元byteそのもの
- canonical SHA-256: 復号値のobject keyをUTF-16 code unit順へ再帰sortし、array順を維持し、空白と末尾LFなしのcompact JSONへしたbyte

小数は復号後の意味numberをECMAScriptの`JSON.stringify`へ渡したJSON number表現を使い、元の数値字句は保持しない。したがって`0.040`や`4e-2`はcanonical上では`0.04`と同じになるが、元byteの差はfile SHA-256が別に検出する。値を丸めたり、独自の桁数へ整形したりしない。

jobの各`widthPolicyBindings`が持つfile hashとcanonical hashは、対応snapshotからpackage checker自身が再計算した値へそれぞれ完全一致させる。片方をもう片方の代用にしない。

### 5.2 人間認定済み資産の不変値

本追補によって次のファイル内容、見た目、hashを変更しない。

| role | file SHA-256 | canonical SHA-256 |
|---|---|---|
| preset registry | `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8` | `5915d6aae47681c43ea202a20eee16cbf669abfe24fdc832f75fb127ad46dca4` |
| preset validation index | `d2665c7947564a56955bbc47de7d95d038c64487ea71b6cbc1a2cc61667c05a1` | `40609dbc63b7c2d1f4c2cd92ee22c493c08382c0d63c27ea06087535f5882067` |
| material validation index | `98213035bc6e395b090d7cff2639d4bf707fb838b7df50cb51bc60ab95d4758e` | `3958ad2d21233342e49aedd29cbd337785a228e1063d1802b64e92dc1793d1fc` |
| registry binding | `b26db5c57aac5dd290e084d953350778b527c6eb21f66f62dc7431bf24482fff` | `bfbbcb5c611313d368305e6e8d552ddcdaf41949ed8d8f074485c8ed0aa2d43e` |
| renderer trust | `04ec4971d078413b68c19869b0285130ec553f14601f45d27125738a7498eddc` | `9d5ffe631033dc594c917649e2529899e303f3cb8a7d7b1b65ea0d26b7c645f2` |

正式化記録と`DECISIONS.md`が正本とする二つの検査index canonical hashも変更しない。

## 6. 第三原因: 検査index hashの意味の衝突

### 6.1 観測事実

`trusted-registry-bindings.json`は正式化時から次を保持している。

- `presetValidationIndexSha256`: preset validation indexのcanonical SHA-256
- `materialValidationIndexSha256`: material validation indexのcanonical SHA-256

これは正式化完了報告と`DECISIONS.md`に「正規化JSON hash」として明記され、正式化処理もcanonical hashを格納している。

一方、B1元設計§8.3(4)は、両値を検査indexの**実byte SHA-256**へ照合すると記載している。現実装もfile SHA-256へ比較している。

値は実際に異なる。

| index | bindingの値・canonical SHA-256 | file SHA-256 |
|---|---|---|
| preset validation index | `40609dbc63b7c2d1f4c2cd92ee22c493c08382c0d63c27ea06087535f5882067` | `d2665c7947564a56955bbc47de7d95d038c64487ea71b6cbc1a2cc61667c05a1` |
| material validation index | `3958ad2d21233342e49aedd29cbd337785a228e1063d1802b64e92dc1793d1fc` | `98213035bc6e395b090d7cff2639d4bf707fb838b7df50cb51bc60ab95d4758e` |

現在の55件では、小数拒否により正常fixtureがこの照合まで到達しなかったため、まだ表面化していない。二点だけを修正した後、表示信頼鎖照合まで到達した正常経路は、この不一致で必ず不成立になる。未到達だった検査に、これより前に止まる別欠陥が無いとはまだ言えない。

### 6.2 改訂案

人間認定済み台帳と正式化記録を正とし、B1元設計§8.3(4)を次へ改訂する。

1. 各検査indexの実byte SHA-256は、jobの対応`widthPolicyBindings.fileSha256`と安定読取snapshotのfile SHA-256へ完全一致させる。
2. 各検査indexのcanonical SHA-256は、jobの対応`widthPolicyBindings.canonicalSha256`、checkerの再計算値、`trusted-registry-bindings.json`の対応値へ完全一致させる。
3. `trusted-registry-bindings.json`の二つの`*ValidationIndexSha256`はcanonical SHA-256であり、file SHA-256として解釈しない。
4. どちらか一方だけの一致で信頼鎖を通さない。

台帳値をfile hashへ書き換えず、B1側の誤った意味付けを正す。

これは中心二点とは独立した第三原因である。本追補を承認する場合は、第三原因の改訂案も同時に承認対象へ含める。第三原因を承認しない場合、実装変更・55件再実行へ進まず、別裁定で停止する。

## 7. 検査上の帰属

新しい違反コードは追加しない。

| 事象 | 帰属 |
|---|---|
| B1所有・Gemini往復データの小数点・指数token | strict JSONの`number-invalid` |
| file hashが一致した外部表示台帳の未承認小数、4箇所の値違い、schema不成立 | `INPUT_SCHEMA_UNSUPPORTED` |
| 外部台帳のfile hash不一致 | `INPUT_HASH_MISMATCH` |
| 外部台帳のcanonical hash不一致 | `INPUT_HASH_MISMATCH` |
| 検査indexと信頼bindingのcanonical hash鎖不一致 | `INPUT_HASH_MISMATCH` |
| 時刻fieldの小数 | 対応schema不成立。外部入力なら`INPUT_SCHEMA_UNSUPPORTED`、B1 strict入口なら`number-invalid` |

fail-fastと帰属の順序は、次へ一意に固定する。

1. 契約内蔵slotに対するrole/path不一致または安定読取の安全性不成立を先に帰属する。この段階では表示台帳profileを選ばない。
2. file hash不一致があれば`INPUT_HASH_MISMATCH`を先に返し、同じ入力の復号・schema・canonical原因を重複計上しない。
3. file hashが一致した入力だけを復号し、復号またはschemaが不成立なら`INPUT_SCHEMA_UNSUPPORTED`とする。canonical不一致を重複計上しない。
4. 復号・schema成立後にcanonical hashを照合し、不一致なら`INPUT_HASH_MISMATCH`とする。
5. 全単体入力の成立後に相互の信頼鎖を照合する。

この順序により、改変byteが未承認小数も含む場合はfile hash不一致が正本の帰属となる。`INPUT_SCHEMA_UNSUPPORTED`は、file hashが一致する正本または合成検査文脈で数値・schema契約だけが不成立の場合に到達する。

## 8. 承認後の実装境界

承認後の変更対象は、原則としてpackage側の共通処理とpackage側検査だけである。

- strict decoderがnull prototype objectを返す現実装は維持し、検査期待を正本へ合わせる
- package内部に、固定role/pathからだけ選ばれる表示台帳読取profileを置く
- package checker・builder・manifest・漏洩検査・hash記録が外部5 JSONを読む全経路で同じprofileを使う
- preset/material検査indexのbinding照合をcanonical hashへ直す
- B1 strict JSONの既存公開入口、公開export集合、CLI/job schemaを広げない
- test専用の別checkerや同等ロジックを複製しない
- 意味回答側は正式package内のhashと整数の表示制約だけを読み、外部台帳本文や小数profileを持ち込まない

正式packageへは、外部台帳のpath・file hash・canonical hashと、信頼鎖から導いた整数の表示制約だけを記録する。4つの小数値をGemini入力または意味回答へ転記しない。

実装の途中で、公開export追加、job/schema変更、汎用小数許可、台帳変更、時刻小数が必要になった場合は、本追補の範囲外として停止する。

## 9. 55件への解消見込み

静的に追跡できた現在の不合格は次のとおりである。

| 原因 | 現在観測した不合格への影響 | 本追補後の見込み |
|---|---:|---|
| decoder出力prototypeと検査期待の不一致 | 直接1件 | object正本の確定で当該1件を解消見込み |
| renderer trustの小数をB1整数限定canonical化へ渡した | 直接20件が正常fixture構築前に停止 | 表示台帳profileで20件を本来の検査本体まで進める見込み |
| 上記20件が動かず違反コード観測集合が不足 | 波及1件 | 20件が本体へ到達すれば波及原因を解消見込み |
| 検査index canonical/file hashの意味衝突 | 現行runでは小数停止に隠れて未到達 | 第三原因の改訂なしでは、表示信頼鎖照合まで到達した正常経路が不成立 |

中心二点は、現在観測した22不合格の発生点を、1件と21件に分けて全て説明する。ただし、小数由来の21件は本来の検査本文へ未到達だったため、**21件の合格見込みとは表現しない**。言えるのは、共通の準備段階停止を解き、本来の検査へ進める見込みまでである。

第三原因も同時に改訂すれば、現在静的に確認できる既知の契約矛盾は三つとも除去される。ほかに独立した第四原因は静的監査では見つかっていない。ただし、未到達だった検査の潜在欠陥は再実行まで不明であり、55/55を事前に保証しない。

第三原因が次回何件の不合格へ波及するかは、正常fixtureが進んだ後のcheck集約経路に依存するため、実走前に独自の件数を作らない。少なくとも正常な信頼鎖を不成立にする一つの独立原因であることは確定している。

## 10. 承認後に必要な検査

承認後の実装では、少なくとも次を同じproduction経路で検査する。

### 10.1 decoder object

- rootと入れ子objectがnull prototype
- 非array-index keyで、source member順のown data property作成と外部観測順が一致
- array-index keyを含む一般JSONでは、全key/valueをown data propertyとして保持し、観測順がECMAScript `OwnPropertyKeys`規則と一致。正式B1 schemaではarray-index keyを拒否
- `__proto__`等がprototypeを変更せずown keyになる
- duplicate key拒否
- 通常objectとnull prototype objectをメモリ内入力として受理する既存契約の維持
- decoder出力とcanonical key sortを混同しない

### 10.2 数値profile

- B1 raw・メモリ内・正式package・Gemini往復の小数を従来どおり拒否
- renderer trustの正本4箇所・正本4値だけを受理
- renderer trustの別pathにある小数を拒否
- 他の外部4 JSONにある小数を拒否
- 4値の変更、`-0`、非有限、巨大指数を拒否
- B1 profileでは`1.0`や`1e2`も拒否
- 外部profileでは`0.040`や`4e-2`の意味値とcanonical値が`0.04`へ一致しても、正本byteとの差をfile hashで拒否
- 小数の`startMs`・`endMs`、frame、sampleを拒否
- profileをjob・CLI・env・modelから選べない
- 外部小数値が正式package・Gemini入力へ流入しない

### 10.3 hashと信頼鎖

- §5.2の5組のfile/canonical hashが全て不変
- renderer trust canonical hash `9d5ffe631033dc594c917649e2529899e303f3cb8a7d7b1b65ea0d26b7c645f2`を維持
- 二つの検査indexについて、file hashとcanonical hashを別々に照合
- `trusted-registry-bindings.json`の二値をcanonical hashとして照合
- file hashとcanonical hashが異なる正本indexを使い、取り違えを検出
- 台帳byte差し替え、canonical内容差し替えをそれぞれ拒否

### 10.4 再実行順

本追補の実装・再実行範囲が承認された後、次を頭から一度だけ行う。

1. package側の既存55件全件と、本追補で追加する検査全件。既存検査を削除・置換せず、内訳を分けて報告する
2. 意味回答側B2全件
3. ゲートA既存回帰
4. 残存source atom既存回帰
5. candidate 13読み取り専用preflight

不合格時の停止、修正再試行禁止、部分合格を完成扱いしない規律は維持する。

## 11. 実装契約完全性チェック

| 確認項目 | 本追補での固定 |
|---|---|
| 成果物schema | 変更なし |
| decoder返却形 | 全階層null prototypeへ固定 |
| 数値範囲・字句 | B1は整数tokenだけ、表示台帳は意味number復号後に4係数だけを許可 |
| 違反コード | 既存codeへ固定帰属、新設なし |
| 終了コード | 変更なし |
| 環境固定 | 既存B1契約を維持 |
| 入出力範囲 | 契約内蔵slot→role/pathの照合後、外部JSON 5件だけを専用profileへ固定 |
| 検査可能性 | 既存production checker/builderと同じ経路で検査 |
| 工程間受け渡し | 外部本文をpackageへ運ばずhashと整数制約だけを渡す |
| 信頼hashの意味 | file/canonicalを分離し、binding二値をcanonicalへ固定 |
| 失敗優先順位 | path・安全性→file hash→復号/schema→canonical→相互信頼鎖 |

本追補の範囲では、実装者が判断しなければならない未固定項目は残していない。

## 12. 承認依頼

次の三点を一括して承認するか判断を求める。

1. strict decoderの全objectをnull prototype正本とする
2. B1/Gemini往復は整数限定のまま、固定外部表示台帳の4係数だけを専用読取profileで許可する
3. `trusted-registry-bindings.json`の二つの検査index hashをcanonical SHA-256として照合し、file SHA-256はjob/snapshot間で別に維持する

承認文案:

> ゲートB1 JSON・表示信頼境界 契約確定追補v001を、第三原因のhash意味改訂を含めて承認する。人間認定済み台帳・4係数・hashは変更せず、時刻は整数契約を維持する。次工程は追補の案内追記、実装、既存55件と追補追加検査の全件、既存回帰、candidate 13読み取り専用preflightまでとし、正式入力生成・Gemini実走・指示書・描画は含まない。不合格時は修正再試行せず停止する。

## 13. 承認・改訂履歴

- 2026-07-24 / kawafmm承認: §12の三点を一括承認。第三原因である検査index hashの意味を、信頼bindingではcanonical SHA-256、job・snapshot間ではfile SHA-256として別々に照合する改訂も承認対象に含む。人間認定済み台帳、4係数、時刻整数契約は変更しない。
- 2026-07-24 / 実行範囲: 本追補の案内追記、三点の実装修正、Q1:Aの読み取り専用監視投影入口、B2全検査、既存回帰、Q2:Aの識別子を使うcandidate 13読み取り専用preflight、完了報告、次ゲート承認依頼の起草まで。正式package、Gemini、指示書、描画は含めない。
