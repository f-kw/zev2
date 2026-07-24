# candidate 13 caption gate B2 R1 hashbang限定受理 契約追補設計 v001

- 起草日: 2026-07-24
- 状態: **kawafmmが「hashbangの限定受理」という方向を確定済み。本文の承認待ち**
- 対象: R1の実行可能JavaScript字句検査
- 起草根拠:
  - `presentation-candidate13-caption-gate-b2-r1-r2-r3-full-test-stop-report-20260724-v001.md`
  - package側正式全件検査の保存TAP
    `test-runs/20260724-caption-b2-r1-r2-r3-v001/package.tap`
- 今回の範囲: **設計提示だけ**
- 今回の人間作業: 本設計の承認または差し戻し1件。媒体視聴、時刻入力、時間計測なし

## 1. 本来の目的

目的は、正常なproduction runnerを検査都合で変更せず、R1 scannerがrunner先頭の
正当なhashbangだけを非実行領域として扱えるようにすることである。

今回直すのは、実在する次の先頭行を現行scannerが`#`で字句不成立にする一点である。

```text
#!/usr/bin/env node
```

次は目的ではない。

- JavaScript全構文を読める汎用parserへ拡張すること。
- 通常commentや未知tokenを広く許可すること。
- 検査を通すためproduction runnerからhashbangを削ること。
- hashbang後の下流20検査を未実測のまま合格扱いすること。
- 正式package、prompt、Gemini、表示計画、指示書、描画へ進むこと。

## 2. 追補の効力

本設計が承認された場合、承認済み文書の次の条項を、本文削除ではなく
**本追補による版付き改訂**として上書きする。

| 承認済み文書 | 対象節 | 本追補で固定すること |
|---|---|---|
| B1完全実装契約設計v001 | §4.1 | 許可import graphを調べる実物scannerが、先頭hashbangを限定条件で非実行領域として扱う |
| B1完全実装契約設計v001 | §16.2 | 限定条件外の`#!`は既存`IMPLEMENTATION_MISMATCH`へ帰属し、新違反codeを作らない |
| B1完全実装契約設計v001 | §20.2・§20.4 | package・semanticの実物と合成入力を、同じscanner経路で検査する |
| B1完全実装契約設計v001 | §21 | 実装契約完全性チェックへ、本追補の位置・行・状態・検査入口を加える |
| B2全件検査修正設計v001 | §4.2・§4.4・§4.5 | hashbangの認識順、受理・拒否表、既知の範囲を追加する |
| B2全件検査修正設計v001 | §7・§9 | 27不合格の最新版対応と完全性チェックへ置き換える |
| R1・R3契約確定追補v001 | §3.1〜§3.7 | 3token規則の前に一度だけ行うhashbang処理を追加する |
| R1・R3契約確定追補v001 | §5〜§7 | 27不合格の最新版対応と、承認後の検査順を追加する |

既存文書の承認履歴を黙って書き換えない。本追補の承認をもって上表の改訂承認とし、
元文書へは本追補への案内と改訂履歴行だけを追加できる。

停止報告§7に残した二択は、人間裁定により「scannerで限定受理」へ確定した。
runnerからhashbangを除く案は不採用である。停止報告そのものは当時の判断待ちを示す
履歴として変更しない。

## 3. 実測した事実

### 3.1 実在runner

対象runnerの先頭byteは次である。

| offset | byte | 表示 |
|---:|---:|---|
| 0 | `0x23` | `#` |
| 1 | `0x21` | `!` |
| 2以降 | ASCII | `/usr/bin/env node` |
| 行末 | `0x0A` | LF |

UTF-8 BOM、先行空白、先行改行はない。runner本文は変更しない。
この実体を、実装前の不変基準として次へ固定する。

| 項目 | 固定値 |
|---|---|
| 基準commit | `42e26ea058f896ef32102d18b37320cb4f71ed95` |
| repository path | `evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs` |
| file SHA-256 | `1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff` |

実装後も同pathの全byte SHA-256が上記と完全一致しなければ不合格とする。
「hashbang行が残っている」だけでは不変確認に足りない。

### 3.2 scannerの現状

package側と意味回答側には、次のmarkerで囲まれた同一byteの限定scannerがある。

```text
EXECUTABLE_JAVASCRIPT_SCANNER_GRAMMAR_V001_BEGIN
...
EXECUTABLE_JAVASCRIPT_SCANNER_GRAMMAR_V001_END
```

現行scannerはsource index 0の`#`を認識できず、runner本文の`.`、`?.`、`...`や
module-load I/O判定へ到達する前に字句不成立になる。

### 3.3 保存済み検査結果

- package全件: 105/132合格、27不合格。
- R2関連: 13/13合格。案A固有12/12を含む。
- R3基礎分割読取: 4/4合格。3.38GB実fileのchunk読取を含む。
- R1拒否側: 34/34合格。
- R1受理側: 7件不合格。
- 意味回答側、既存回帰、candidate 13読み取り専用preflight: 未実行。

## 4. hashbang限定受理契約

### 4.1 位置

hashbangとして特別扱いできるのは、安定読取した実装sourceの先頭2byteが
次と完全一致する場合だけである。

```text
offset 0 = 0x23  (#)
offset 1 = 0x21  (!)
```

次はhashbangとして受理しない。

- UTF-8 BOMの後の`#!`。
- 空白、tab、改行の後の`#!`。
- 2行目以降の`#!`。
- JavaScript実行字句の途中にある`#!`。
- `# !`、`!#`。

限定条件外で実行字句として現れた`#!`は、既存どおり字句不成立とし
`IMPLEMENTATION_MISMATCH`へ送る。新しい違反codeは追加しない。

### 4.2 先頭行の形式

本追補で受理する形式を、次の二つだけに固定する。

```text
#! + payload + LF
#! + payload + CRLF
```

`payload`は0文字以上で、各byteはtabの`0x09`またはASCII可視文字
`0x20`〜`0x7E`だけとする。

したがって次の扱いになる。

| 入力 | 結果 | 理由 |
|---|---|---|
| `#!/usr/bin/env node` + LF | 受理 | 現行runnerの実在形 |
| `#!/usr/bin/env node` + CRLF | 受理 | 同じ先頭行の一般的な改行差だけ |
| `#!` + LF | 受理 | 空payloadは形式上成立 |
| hashbang行内の`import(`・`require(`・file I/O名 | 受理 | 行全体が非実行領域 |
| 行終端なしでEOF | 拒否 | 実在しない形を追加しない |
| 裸CR、U+2028、U+2029で終端 | 拒否 | 未観測の改行形式を追加しない |
| payload内のNUL、非ASCII、その他の制御文字 | 拒否 | 未観測の文字を追加しない |

CRLFではpayload末尾のCRをpayloadに含めず、LFと一組の行終端としてだけ扱う。

### 4.3 認識順と状態

production import graph検査が受け取る正本は、従来どおり安定読取済みの`Buffer`である。
byteと文字列の境界を次へ固定する。

1. package側・意味回答側でbyte完全一致させるscanner block内に、
   `Buffer`を受け取る版付きprivate入口を置く。
2. private入口は、decodeや文字列正規化より前に、先頭byteだけを§4.1・§4.2で判定する。
3. hashbangがない場合は、従来と同じ全byteを従来と同じUTF-8 decodeへ渡し、
   scannerをsource index 0から開始する。
4. hashbangがある場合もbyte列の削除・置換・正規化はしない。§4.2で認めた
   hashbang部分がASCIIだけなので、LFまたはCRのbyte offsetはdecode後の文字indexと
   同値である。この一致を検査してから、同じ全source文字列をそのindexから既存scannerへ渡す。
5. package側・意味回答側の`importSpecifiers`は、必ずこのprivate入口を使う。
   文字列scannerを直接呼んでhashbang判定を迂回しない。

hashbangの確認は、このprivate入口から通常の字句loopへ入る直前に一度だけ行う。

1. source index 0で§4.1を確認する。
2. §4.2の行全体が成立する場合だけ、字句loopの開始位置をLFならLF、
   CRLFならCRへ移す。hashbang文字列そのものは字句loopへ渡さない。
3. LFまたはCRLFは既存の空白・改行処理へ渡す。行番号はLFで一度だけ増やす。
4. 以後はhashbang認識へ戻らず、既存scannerだけを使う。

hashbangはtokenを生成しない。次の状態を初期値のまま維持する。

- 「式の開始を待つ」。
- delimiter stackは空。
- template modeは通常code。
- member後続待機なし。
- spread対象待機なし。
- optional-chain継続なし。

hashbang直後の最初のJavaScript tokenは2行目として記録する。hashbang後に空行が
あれば、既存の改行処理で3行目以降へ進む。

### 4.4 二度目以降の`#!`

先頭hashbangを読み終えた後は、hashbang認識を二度と行わない。

- 2行目以降の実行位置にある`#!`は字句不成立。
- 先頭hashbang行のpayload内にもう一度現れる`#!`は、同じ一行の非実行文字である。
- 文字列、通常comment、template raw、regular expression内部の`#!`はhashbangではない。
  既存契約どおり非実行文字として扱い、raw byte検索で誤って拒否しない。

最後の項目は「別位置のhashbangを許可する」ことではない。hashbangとして解釈せず、
既存の文字列・comment・template・regex契約を維持するという意味である。

### 4.5 module-load I/O検査を弱めない

hashbang行だけを字句列へ出さない。hashbang後のJavaScript本文は、従来どおり
全て既存scannerへ渡す。

次は変更しない。

- 静的importの許可一覧、件数、順序。
- 許可外builtin・local import、dynamic import、CommonJS `require`の拒否。
- module-load直下のfile I/Oの拒否。
- 関数・arrow・methodの遅延領域判定とIIFE判定。
- `.`、`?.`、`...`、数値五形、slash状態の限定契約。
- package側と意味回答側のscanner byte完全一致。
- production CLIのjob path単一、注入口なし。

### 4.6 runnerを変更しない

次を禁止する。

- production runnerからhashbangを削除する。
- hashbangを通常commentへ書き換える。
- runnerの先頭に検査器専用の分岐を入れる。
- 合成検査だけhashbangを事前除去する。
- package側だけ受理し、意味回答側scannerを変更しない。

修正対象は、実物と合成検査が共用するscanner grammarと、その固定検査だけである。
実装の前後で§3.1のrunner SHA-256を再計算し、完全一致を機械検査する。

## 5. 固定検査

package側と意味回答側へ同じ入力表を与え、受理・拒否を完全一致させる。
検査用に同等scannerを複製せず、production import graph検査が実際に使う関数を通す。

§5.1・§5.2の各行は、**新しいtop-level testを増やさず**、既存の次の
top-level test内へ名前付きsub-assertionとして追加する。

- package側: TAP 115「package R1 scannerは実package 2 sourceを受理する」。
- 意味回答側: 「packageとsemanticのR1 scanner正本はbyte単位で同期する」。

これによりpackage側の登録件数は132件のまま、意味回答側も登録件数を変更しない。
両testの表示名は、実source確認とhashbang表の双方を含むと分かる名称へ変更してよいが、
`test()`の登録を分割・追加してはならない。
各sub-assertionは入力名を失敗messageへ含め、どの行が落ちたかをTAP本文で追跡できる
ようにする。表の件数をtop-level test件数へ足し込まない。

### 5.1 受理

1. 現行package runnerの実byte。
2. `#!/usr/bin/env node` + LF + 正常module。
3. `#!/usr/bin/env node` + CRLF + 正常module。
4. 空payloadの`#!` + LF + 正常module。
5. hashbang後に空行を一行持つ正常module。
6. hashbang payload内に`import(`、`require(`、file I/O名を持つ正常module。
7. 文字列、通常comment、template raw、regex内に`#!`を持つ正常module。
8. hashbangを持たない重複除外後7 source（package coreを含む意味回答側7 role）。
9. 既存のR1受理表すべて。

### 5.2 拒否

1. BOM + hashbang。
2. 先行spaceまたはtab + hashbang。
3. 先行改行 + hashbang。
4. `# !`、`!#`。
5. 正常JavaScript tokenの後の`#!`。
6. 先頭hashbang + 2行目のhashbang。
7. 裸CR、U+2028、U+2029で終端するhashbang。
8. 行終端なしでEOFになるhashbang。
9. payload内のNUL、非ASCII、未許可制御文字。
10. 既存のR1拒否表すべて。

### 5.3 同期と実物経路

次を別々に確認する。

- marker内scanner grammarがpackage coreと意味回答coreでbyte完全一致する。
- package runnerを含む実在8 sourceを、実物と同じimport graph検査へ通す。
- package runnerは§3.1の基準SHA-256と全byte完全一致する。
- `Buffer`からprivate入口、UTF-8 decode、既存scannerへ進む経路をpackage・意味回答で
  それぞれ通し、hashbang入力が文字列scannerへの直接注入で合格していないことを確認する。
- 合成検査用のhashbang除去関数、環境変数、job field、test-only public exportがない。
- 実物runnerが同じscannerを使うことを既存の静的・動的検査で確認する。

## 6. 27不合格との最新版対応

### 6.1 hashbangを直接調べる7件

| TAP | 検査 | 現在の停止 | 本追補による予測 |
|---:|---|---|---|
| 70 | 関数・block arrow・concise arrow内file I/Oをmodule-load扱いしない | 追記した検査sourceより前のrunner先頭で拒否 | hashbangを越えて本来のR1判定へ到達 |
| 76 | 通常member・optional member後の除算を受理 | 同上 | 同上 |
| 77 | spread三形とspread直後のregexを受理 | 同上 | 同上 |
| 78 | regex・comment・string・template raw内の禁止語を受理 | 同上 | 同上 |
| 79 | 固定済み数値五形を受理 | 同上 | 同上 |
| 80 | 制御条件内とstatement開始のregexを受理 | 同上 | 同上 |
| 115 | 実package 2 sourceを受理 | runnerを含む二sourceの合成判定で拒否 | 実runnerの既知blockerを解消 |

70と76〜80は、実runner sourceへ正常な検査sourceを追記する構造である。
追記部分ではなく、元runner先頭で先に落ちている。115は二sourceをまとめた検査なので、
二source双方が個別に失敗したとは主張しない。静的診断で特定したblockerはrunnerの
hashbangである。

この7件は本追補の直接解消対象である。ただし、実装後の合格は全件再実行まで
完了事実にしない。

### 6.2 hashbangの先行停止で未検証の20件

| TAP | 検査の意味 | 現在観測した状態 |
|---:|---|---|
| 44 | 監視投影hashとproduction runner開始投影の一致 | 正常終了0より前に終了1 |
| 47 | 未承認の表示用小数・別値・小数時刻の拒否 | 目的の入力違反へ未到達 |
| 48 | 表示台帳以外の外部JSON小数の拒否 | 目的の入力違反へ未到達 |
| 49 | 表示台帳の全layout rule exact一致 | 目的の入力違反へ未到達 |
| 50 | 別字句`0.040`のfile hash不一致優先 | 目的のhash違反へ未到達 |
| 51 | file hashとcanonical hashの区別 | 目的のbinding違反へ未到達 |
| 52 | preset validation indexの版一致 | 目的の版違反へ未到達 |
| 68 | 正常pure checkerと最終report validator | 正常fixtureに先行違反 |
| 69 | package前半違反の担当check | 意図した違反へhashbang由来の同codeが追加 |
| 116 | Gate A build・決定性・reportの担当check | 目的のbuild違反へ未到達 |
| 117 | package側三build stageの失敗型 | 目的のbuild違反へ未到達 |
| 118 | package成果物とsource-only検査の非修復 | 目的のpackage違反へ未到達 |
| 119 | job二時点差とpublication違反の帰属 | 目的のjob・publication違反へ未到達 |
| 121 | 公開runnerのpreflight二回derive | 正常終了0より前に終了1 |
| 122 | build失敗を`BUILD_FAILED`へ閉じる | `evidenceBuild`より前の`implementationBinding`で停止 |
| 123 | formal runnerの三publication gate | `publication`より前の`implementationBinding`で停止 |
| 124 | R3 formal artifactの失敗帰属 | R3 publication段へ未到達 |
| 125 | publication失敗後のjob再読取 | `implementationBinding`で終了1、再読取へ未到達 |
| 130 | production CLIのchunk投影とexit 0/1 | 正常側が終了1 |
| 132 | 動的code×check観測集合の完全一致 | 前段未到達により期待観測集合が欠落 |

20件の現在の不合格経路は、保存TAPと静的経路の照合上、
hashbangによる先行停止と整合的に説明できる。
しかし、本追補の直接の修正対象は、
**本来の下流検査へ到達できるようにすること**までである。

- 20件が全て合格するとは事前に主張しない。
- 20件に独立欠陥がないとも主張しない。
- 現在の正確な状態は、**第四原因は未確認、下流20件は未検証**である。
- test 132は、前段で期待code×checkを観測できなかった結果の二次不合格であり、
  現時点で独立した第四原因とはしない。

## 7. 承認後の実装・検査順

本設計が承認された後だけ、次を一つの実装単位として行える。

1. package・意味回答のscanner grammarへ、§4の同一hashbang処理を追加する。
2. §5の固定検査を既存2 top-level testのsub-assertionとして追加する。
3. 元設計へ本追補の案内と改訂履歴行を追加する。
4. package側の登録件数が132件から変わっていないことを確認した上で、
   B2全132件を部分再実行でなく頭から一度実行し、TAP全文を保存する。
5. package側が全件合格した場合だけ、意味回答側B2全件を実行する。
   意味回答側もtop-level登録件数が実装前から不変であることを先に記録する。
6. それも合格した場合だけ、ゲートA既存回帰、残存source atom回帰、
   candidate 13読み取り専用preflightを既定順で実行する。
7. 完了報告または停止報告を作り、次ゲート承認依頼の起草までで停止する。

次のいずれかが起きたら、修正・再試行せず停止する。

- 直接7件のいずれかが不合格。
- 下流20件のいずれかが残る、または新しい不合格が出る。
- hashbang以外の新たな字句許可が必要になる。
- package・意味回答のscannerを同一に保てない。
- runner変更、検査弱化、期待値変更が必要になる。
- 既存回帰またはpreflightが不合格。

正式package生成、prompt登録、Gemini実走、表示計画、演出指示書、描画は、
上記に含めない。

## 8. 実装契約完全性チェック

| 項目 | 本追補での固定 |
|---|---|
| 成果物schema | 変更なし |
| 違反code | 既存`IMPLEMENTATION_MISMATCH`。追加・削除・順序変更なし |
| CLI | 既存0/1/2。hashbang専用終了コードなし |
| 環境 | Node・ICU・localeの既存固定を変更しない。新依存なし |
| 入力 | 安定読取したJavaScript source `Buffer`。先頭位置をbyte offset 0で判定 |
| 受理形式 | LFまたはCRLFで終わる、tab・ASCII可視文字だけの先頭`#!`行 |
| byte→文字列境界 | 全byteを削除・置換せず従来どおりdecode。hashbang終端のASCII byte offsetと文字indexの一致後だけ、同じsourceの字句開始位置を移す |
| 状態 | tokenなし、式開始状態維持、LFで一度だけ行加算 |
| 入出力範囲 | package側2 role・意味回答側7 roleと合成source。重複除外8実source |
| 検査可能性 | production import graph検査と同じscannerへ§5の表を通す |
| 同期 | marker内grammarのpackage・意味回答byte完全一致 |
| 汎用性 | candidate 13固有件数・hashをscannerへ焼き込まない |
| test登録件数 | package 132件を維持。意味回答側も実装前から不変。追加表は既存test内のsub-assertion |
| runner | 基準commit `42e26ea0`のSHA-256 `1a1537...cbff`と全byte完全一致 |
| 停止点 | 本設計提示で停止。承認前はコード・検査・再実行なし |

## 9. 人間作業と承認依頼

この設計自体が要求する人間作業は、文書全体の承認または差し戻し1件だけである。
hashbangの細部を複数質問へ分解せず、§4・§5を一つの契約案として提示する。

承認された場合の実装・機械検査に、人間の媒体視聴、時刻入力、手作業での正解生成はない。

承認文案:

> `presentation-candidate13-caption-gate-b2-r1-hashbang-limited-acceptance-addendum-20260724-v001.md`
> を承認する。先頭byte `#!`、LF/CRLF、tab+ASCII可視payload、token非生成、
> package・意味回答の同一scanner、runner不変更という限定契約で実装してよい。
> package全132件を頭から実行し、合格時だけ意味回答側、既存回帰、
> candidate 13読み取り専用preflightへ進む。直接7件または下流20件を含む
> 不合格、新しい契約判断、矛盾があれば修正・再試行せず停止する。

## 10. 改訂履歴

- 2026-07-24 / v001起草:
  - kawafmm裁定「runnerを変えず、先頭1行目の`#!`だけを限定受理」を契約化した。
  - 保存済み27不合格を、直接7件と下流未検証20件へ分離した。
  - 実装、検査再実行、正式入力生成、Gemini、描画は行っていない。
