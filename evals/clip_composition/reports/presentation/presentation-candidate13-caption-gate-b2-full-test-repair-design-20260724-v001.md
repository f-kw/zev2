# candidate 13 基本テロップ B2全件検査 修正設計 v001

- 日付: 2026-07-24
- 状態: **2026-07-24 hashbang限定受理を実装後、package全件118/132・14不合格で停止**
- 設計起点となった停止: package側全件検査 74件中54合格・20不合格
- 今回の人間作業: 0件・時間計測なし
- 次に必要な人間判断: 裸CR検査データとGate A検証呼出の版付き修正設計を起草するかの判断1件

## 1. 本来の目的

目的は、20件を合格に見せることではない。

candidate 13の正式な入力を作る前に、次の三つを同時に満たす検査経路へ戻すことである。

1. 実装が読取契約を破った場合は確実に止める。
2. 正常な実装や、直接不成立でない箇所を誤って違反にしない。
3. 実データの容量でも、監視対象の全byteと同じSHA-256を検査する。

検査対象の除外、期待値の後追い変更、許容差、違反コードの削減によって合格させる案は採らない。

## 2. 承認済み方針と、設計前照合で判明した訂正

> 改訂案内（2026-07-24）:
> §4.2・§4.4・§4.5、§6.3、§7は
> `presentation-candidate13-caption-gate-b2-r1-r3-contract-clarification-addendum-20260724-v001.md`
> の承認内容で上書きする。R2は同追補§5のA裁定に従い、shape不成立の子を二種類の
> 親集計へ部分利用せず、子自身の違反として可視化する。

> 改訂案内（2026-07-24）:
> R1 scannerのhashbang処理、27不合格の直接7件・下流未検証20件への分離、
> 承認後の検査順は
> `presentation-candidate13-caption-gate-b2-r1-hashbang-limited-acceptance-addendum-20260724-v001.md`
> の承認内容で上書きする。

kawafmmは、次の方向を承認した。

1. 新しいJavaScript parserを追加せず、現行scannerを限定修正する。
2. package側・意味回答側の双方を、版付きchunk読取へ変更する。
3. 監視範囲、SHA-256、file状態照合を変えない。

設計前の静的照合で、scannerについて診断の前提を一つ訂正した。

正常データへ余分な実装不一致を付けた直接原因は、関数内I/Oの遅延領域判定ではなかった。package側・意味回答側の検査器が、自分自身のソースに書かれた正規表現内の字面 `import(` を、実行されるdynamic importだと誤認していた。

したがって、関数内I/Oの検査が落ちたのは巻き添えである。関数宣言・arrow・methodの遅延領域判定を、今回の原因だとみなして変更してはいけない。

承認済みの「parserを追加せず限定修正する」という方針は維持できる。具体的な修正対象だけを、次のように正す。

> 生のsource文字列を正規表現で探す方式をやめ、実行可能な字句だけからdynamic import / requireを判定する。関数の遅延領域判定は変更しない。

この訂正を含む本設計を、実装前の再承認対象とする。

## 3. 修正を三つへ分離する

| 修正 | 対象 | 他の修正との関係 |
|---|---|---|
| R1: import graphの限定字句修正 | 正規表現内の字面を実行コードと誤認する検査 | kawafmmが承認したscanner限定修正の、訂正後の具体化 |
| R2: 投影件数の最小箇所判定 | 不正な子の値から、部分和による親の不一致を追加する集計 | R1・R3のどちらにも含めない独立した限定修正。既存契約から導出済み |
| R3: 同一file descriptorの版付きchunk読取 | 3.38GBファイルを一つのBufferへ入れて停止する読取 | kawafmmが承認したpackage・意味回答共通の変更 |

三修正は同じ再実行の前に固定するが、原因と検査結果は分けて報告する。

## 4. R1: import graphの限定字句修正

### 4.1 変えないもの

- 静的importの許可一覧、件数、順序。
- 許可外builtin・local import、dynamic import、CommonJS `require`の拒否。
- module-load直下のfile I/Oの拒否。
- object初期化、template式、concise arrow IIFE、block arrow IIFE、function IIFEの拒否。
- 関数宣言、block arrow、concise arrow、object methodの本体を遅延領域とする既存判定。
- `IMPLEMENTATION_MISMATCH`への帰属、違反コード集合と固定順、CLI 0/1/2。
- productionの単一job入口と、外部から検査結果を差し替えられない構造。

### 4.2 変更する判定

package側と意味回答側の両検査器で、dynamic importと`require`の判定を、生sourceへ直接かける正規表現から、実行可能字句列の判定へ置き換える。

実行可能字句列では、次を実行コードとして扱わない。

- 一行・複数行comment。
- single quote・double quoteの文字列。
- template literalの生文字部分。ただし`${...}`内部は実行コードとして検査する。
- regular expression literalの本体とflags。

regular expression literalはescapeとcharacter classを区別する。`/`の解釈を実装者へ残さないため、字句器は次の固定状態で判定する。

1. 初期状態は「式の開始を待つ」。
2. 一行・複数行commentの開始は、regular expressionより先に判定する。
3. 「式の開始を待つ」状態の`/`だけをregular expressionの開始とする。escapeされていない`/`で本体を閉じ、続くASCII英字flagsまでを非実行部分とする。改行、閉じていないcharacter class、閉じていない本体は字句不成立で停止する。
4. identifier、数値、文字列、regular expression、template literal、`)`、`]`、後置`++`・`--`の直後は「式を終了した」状態にする。ただし次項の制御構文`)`は例外とする。
5. `(`、`[`、`{`、`,`、`;`、`:`、`?`、`=>`の直後は「式の開始を待つ」状態にする。演算子の固定集合は
   `!`, `~`, `+`, `-`, `*`, `/`, `%`, `**`, `&`, `|`, `^`, `&&`, `||`, `??`,
   `<`, `<=`, `>`, `>=`, `==`, `===`, `!=`, `!==`, `<<`, `>>`, `>>>`, `=`
   と、それぞれ存在する代入形
   `+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `&=`, `|=`, `^=`, `&&=`, `||=`, `??=`,
   `<<=`, `>>=`, `>>>=`
   である。keywordの固定集合は
   `await`, `case`, `delete`, `do`, `else`, `in`, `instanceof`, `new`, `of`,
   `return`, `throw`, `typeof`, `void`, `yield`
   とする。
6. `if`、`for`、`while`、`with`、`switch`、`catch`直後の条件括弧は対応を記録し、その`)`の直後だけはstatement開始として「式の開始を待つ」状態にする。
7. `}`の直後はblockとobject literalをこの限定字句器で推測せず、「slashだけ判定不能」の状態にする。次の有意文字が`/`なら常に字句不成立、別のtokenならそのtokenの規則で状態を更新する。未対応token、括弧不整合、上記固定表で決まらないslash前状態も、許可側へ倒さず字句不成立として`IMPLEMENTATION_MISMATCH`へ送る。

上記keywordと演算子集合は実装内のfreeze済み定数として同じ値を列挙し、package側・意味回答側の検査で完全一致をassertする。現在の実装source全て、divisionを含む受理fixture、statement先頭・条件式・template式内のregular expressionを合成検査へ入れ、規則の実装者解釈を残さない。

判定対象は、非実行部分を除いた字句列で隣り合う次の二形だけである。

- `import`の直後が`(`。
- `require`の直後が`(`。

dynamic importと`require`は、関数内でも許可しない。この二判定には、module-load I/O用の遅延領域印を適用しない。

### 4.3 二系統の同期

package側と意味回答側には同型の検査器がある。今回、共有moduleを新設すると許可import graphと信頼bindingを広げるため、新設しない。

両実装へ同じ修正を行い、同じsource変種を両検査器へ与える対称検査で、受理・拒否の一致を確認する。

### 4.4 検査

受理する回帰:

- 現在のpackage coreとpackage runner。
- 現在の意味回答側7 role。
- comment、文字列、templateの生文字、regular expression literal内にある`import(`と`require(`。
- 関数、block arrow、concise arrow、object method内のfile I/O。

拒否を維持する回帰:

- module-load直下と関数・arrow内のdynamic import、`require`。
- template `${...}`内のdynamic import、`require`、file I/O。
- module-load直下のfile I/O。
- object初期化と三種類のIIFEによるfile I/O。
- 許可外・重複・欠落した静的import。

意味回答側検査にある、生sourceへ直接`import(`を探す検査は、実物と同じ検査器を通す検査へ置き換える。検査を削るのではなく、今回誤判定した重複ロジックを廃止して、productionと同じ経路へ一本化する。

### 4.5 既知の範囲

今回、観測されていないJavaScript構文まで推測で拡張しない。対応範囲外または字句判定不能な構文が実装へ入った場合は、許可せず停止して別の契約改訂へ戻す。

## 5. R2: 不正な子から親の不一致を作らない

これは、R1またはR3の一部ではない。承認済み契約の「直接不成立な最小箇所を返す」原則から導出した、独立した限定修正である。

現行処理は、一つのcontainerの対応元文字数が不正でも、正常なcontainerだけを合計し、その部分和を全体文字数と比較している。このため、直接不正な子と、導出不能な親の二箇所を返す。

修正後は、件数の種類ごとに判定を分ける。

1. 一つでも子の対応元文字数が不正なら、親の対応元文字数合計を比較しない。
2. 一つでも子の境界候補数が不正なら、親の境界候補数合計を比較しない。
3. 全ての子が有効で、親の合計だけが違う場合は、従来どおり親を違反にする。
4. container数と配列長の照合は、上記二種類の合計から独立して維持する。

追加検査:

- 子の対応元文字数だけが不正なら、その子一箇所だけ。
- 子の境界候補数だけが不正なら、その子一箇所だけ。
- 両方が不正なら、該当する子の二箇所だけ。
- 全子が有効で親合計だけが違えば、親一箇所。
- container数だけが違えば、container数一箇所。

schema、違反コード、CLI、成果物は変更しない。

## 6. R3: package・意味回答の版付きchunk読取

### 6.1 読取handleの正本改訂

package側・意味回答側の`openReadOnly(path)`が返すhandleを、own key順
`statBigInt`, `readChunksV001`, `close`
の三機能だけを持つfrozen plain exact objectへ改訂する。

1. file状態をbigintで取得する処理。
2. **`readChunksV001()`**: 呼出時に`AsyncIterable<Buffer>`を返し、同じ開いたfile descriptorの先頭から末尾までを遅延列挙する処理。
3. close処理。

現行の全量Buffer読取は削除する。旧機能と新機能を選べる後方互換分岐は置かない。

productionのchunk列は、既に開いた同一FileHandleから`start: 0`, `autoClose: false`で読む。pathを再openしない。chunk幅はhash結果や品質を決める値ではなく、呼出側から指定させず、成果物にも保存しない。

各yieldは非空の`Buffer`一個であり、配列や全量Bufferを返してはいけない。空fileだけは0 chunkで正常終了し、空byte列のSHA-256を作る。`readChunksV001()`は同期関数とし、一handleで二度目に呼ぶとその場で例外にする。最初の呼出で返した`AsyncIterable`も、`[Symbol.asyncIterator]()`を二度目に呼ぶとその場で例外にする。読取途中で全量読取へ切り替える、別pathを開く、のいずれも許さない。handleのown key順と、返却値が`AsyncIterable`であり`Array`でも`Buffer`でもないことを合成検査で固定する。

### 6.2 読む側の責務

package runnerと意味回答runnerは、同じ規則で次を所有する。

- SHA-256の逐次更新。
- 読取byte数のbigint累計。
- chunkが非空Bufferであることの検査。
- 読取byte数と、open直後・読取後のfile sizeの完全一致。

JSON、実装source、Node実体など、後続処理がbyte本体を必要とする入力は、chunk列を読んだ後にrunner側で一つのBufferへ組み立て、現行snapshotの形を維持する。

監視treeのregular fileはbyte本体を保存せず、SHA-256とbyte数だけを作る。これにより、3.38GBファイルも一つのBufferへ入れない。

この改訂は、任意の巨大JSONを復号可能にする保証ではない。byte本体を必要とする入力がNodeのBuffer上限を超えた場合は、信頼できるsnapshotを構成不能として既存のuntrusted終了コード2で停止する。

### 6.3 file同一性と失敗帰属

現在の三時点照合を変えない。

1. open前のpath状態。
2. open直後のfile descriptor状態。
3. 全chunk読取後のfile descriptor状態。

種類、device、inode、size、mtime、link数を完全一致させる。chunk累計byte数も二つのfile descriptor sizeと完全一致させる。

chunk型、短読、過読、読取例外、状態差、close失敗などで完全な観測を作れなければ、trustedな違反へ推測変換せず、既存のuntrusted終了コード2へ送る。

完全な前後監視投影を作れ、内容だけが変わった場合は、従来どおり読取専用契約違反・終了コード1とする。

読取後のpath再照合は現契約にないため、今回黙って追加しない。非協調processが走査の間に変更して元へ戻す攻撃まで証明しない既知限界も維持する。

### 6.4 SHA-256同一性検査

chunk化は輸送方法だけを変える。次を実装完了条件にする。

1. 同じ小ファイルについて、旧全量読取で得たSHA-256と、新chunk読取のSHA-256が完全一致する。
2. 同じ合成byte列を、一chunk、細分したchunk、不均等chunkで与えても、SHA-256と累計byte数が完全一致する。
3. 空fileは0 chunk・0 byte・空byte列SHA-256として受理する。非Buffer、空chunk、短読、過読、読取例外、読取中状態変更は、それぞれ予定した経路で拒否する。
4. package側・意味回答側の両方で同じ契約を検査する。
5. **3.38GBの実ファイルを含む同一性検査を行う。**

大容量実検査の代表は次とする。

```text
evals/clip_composition/outputs/presentation/base-media/.DmWu0jVQfTE-candidate-13-v002.work-ovnjGJ/source-grid.f32le
```

事前固定する既知値:

- byte数: `3,384,584,064`
- 正式生成manifest
  `evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/generation-manifest.json`
  に保存済みのsource grid payload SHA-256:
  `219cd4af6e6560a0819bbca67fe36433cdb5e3f4b3260b42a5285093e9030209`

比較元は、新chunk実装とは独立した既存公開入口
`presentation_first_real_data_gate_v001.mjs`の
`verifyPresentationFirstRealDataFileReferenceV001()`へ固定する。比較元実装はcommit
`da0f71c000329731f8964e3a8329b6816b166075`、
file SHA-256
`9d0a6d07491f4d6be7bdddbb406b03a790c623c36cd93b5b75a02f72b82449aa`
時点を基準にし、実装作業で同fileを変更しない。

実装前に、この入口へ上記pathと既知SHA-256を渡し、同じ実fileのpath・file状態・全byte hashが成立することを読み取り専用で固定する。実装後は、新しいchunk経路のbyte数・SHA-256をその基準と完全一致させる。正式生成manifestの既知値とも一致させる。対象work fileの欠落、symlink化、identity不一致、既存入口でのhash不一致があれば代替fileを探さず停止する。

ここでは、まだ再hashしたとは報告しない。これは実装承認後に行う検査の事前登録である。不一致なら値を直さず、その時点で停止する。

### 6.5 実process検査

現在の実process検査は、期待する監視tree hashを独自の全量同期読取で作っている。この検査専用経路を残さない。

修正後は次の実物経路へ一本化する。

1. jobがまだ存在しない状態で、承認済みの読み取り専用監視投影入口を呼ぶ。
2. そのhashをjobへ固定する。
3. jobを排他的に作る。
4. production runnerが同じprivate監視処理で開始・終了投影を作る。

検査用とproduction用で別のchunk実装を作らない。

## 7. 20不合格との対応

公式実行は全件数と三種類の直接観測を保存したが、20個の`not ok`名をTAP成果物として保存していない。検査再実行は禁止されているため、残る18件の個別名を推測で作らない。下表のF01〜F18は公式test IDではなく、件数を欠落させず扱うための**本報告内の未同定観測枠**である。

現時点で固定できる対応は次である。

| 公式不合格 | 解消を見込む修正 | 根拠と限界 |
|---|---|---|
| F01〜F18: 個別同定不能な18観測枠 | R1を第一予測とするが未確定 | 正常fixtureへの実装不一致混入が、別違反の二重化、関数内I/O回帰、runnerのbuild・publication・正常preflightの前段停止、違反網羅不足を説明する。ただし個別TAP名は未保存で、各枠を特定testへ結び付けられない |
| F19: `job validatorは正本field順の正常jobを受理し最小leaf pathで不成立を返す` | R2 | 子の対応元文字数を負数にした際、子と親の二pathを返した直接不一致 |
| F20: `production CLI実processは合成preflightのexit 0/1をstdout/stderr排他で返し書込を残さない` | R3 | 期待監視treeを作る全量同期読取が3.38GBファイルで停止 |

計数上は18+1+1=20である。ただし、F01〜F18の全てがR1だけで合格することは、まだ実測していない。「三修正で20件解消」は予測であり、完了事実ではない。

正確に個別対応を確定できたのはF19・F20の2件だけである。F01〜F18は群単位の予測であり、個別対応未確定の18件でもある。次回の全件実行ではTAP全文を成果物として保存し、20件それぞれについて旧不合格名・新結果・修正帰属を一行ずつ確定する。新しい不合格またはR1で説明できない旧不合格が一件でも残れば、第四原因として分離し、修正・再実行せず停止する。

## 8. 承認済みだった検査順と実行停止

2026-07-24のkawafmm承認により、次を頭から一度実行する計画だった。

1. package側の全検査。
2. 意味回答側の全検査。
3. ゲートAの既存回帰。
4. 残存source atomの既存回帰。
5. candidate 13の読み取り専用preflight。

package側全件検査は132件中105合格・27不合格だったため、停止規律に従い
2〜5を実行していない。修正・再実行、次ゲート承認依頼の起草も行っていない。
正本停止報告は
`presentation-candidate13-caption-gate-b2-r1-r2-r3-full-test-stop-report-20260724-v001.md`
である。

部分再実行で合格扱いにしない。1段でも不合格なら、その結果を記録して停止する。

報告は次を分ける。

- R1の実物・合成字句検査。
- R2の最小箇所・親合計検査。
- R3のpackage・意味回答別検査。
- 小ファイル・3.38GB実ファイル別のbyte数とSHA-256同一性。
- open回数、close回数、path再open 0件。
- 既存違反コード、CLI 0/1/2。
- 公式20件の解消状況と、新しい不成立の有無。

## 9. 実装契約完全性チェック

| 項目 | 本設計での固定 |
|---|---|
| 成果物schema | 変更なし |
| 違反コード・固定順 | 変更なし |
| CLI終了コード | 0/1/2の意味を変更しない |
| 環境 | Node・ICU等の既存束縛を変更しない。新依存なし |
| 入力範囲 | 監視root全子孫、既存除外だけ。大容量除外なし |
| 工程間受け渡し | package・意味回答とも、同一FDの`readChunksV001()`からrunnerがSHAと必要byteを作る |
| 検査可能性 | productionと同じ字句検査・同じ監視投影入口を合成・実process検査に使う |
| 汎用性 | candidate 13固有の件数・hashは大容量preflight照合値だけに置き、処理へ焼き込まない |
| 停止点 | package全件105/132・27不合格で停止。意味回答側・回帰・preflightは未実行 |

## 10. 変更予定範囲

実装承認により変更を許された範囲:

- package側の意味入力生成・検査共通処理。
- 意味回答側の検査共通処理。
- package側runner。
- 意味回答側runner。
- package側・意味回答側の合成検査。
- 承認済みB1契約§4.3と該当検査節への、承認記録付き改訂案内。

変更しないもの:

- 正式package、prompt、Gemini実走結果。
- candidate 13の正式基礎映像・正式決定。
- 凍結fixture・expected。
- renderer台帳、表示係数、指示書、描画。
- backend、client、runner本体、runtime。

## 11. 人間作業と停止点

今回の設計作成に必要な人間作業は0件だった。

本設計と追補の承認は完了している。実装は行ったがpackage全件検査で停止した。
現在必要な人間作業は、裸CR検査データとGate A検証呼出の
版付き修正設計を起草するかの1判断だけである。
媒体視聴、時刻入力、時間計測はない。

## 12. 承認・改訂履歴

- 2026-07-24 / kawafmm承認: R1・R3契約確定追補v001とR2のA裁定を承認し、
  本設計の§4.2・§4.4・§4.5、§6.3、§7を追補の範囲で改訂した。実装・全件再実行・
  回帰・candidate 13読み取り専用preflight・完了報告・次ゲート承認依頼起草までを
  再開し、正式package、Gemini、指示書、描画は引き続き許可しない。
- 2026-07-24 / 実行記録: R1・R2・R3を実装しpackage全件を一度実行したが、
  105/132・27不合格で停止した。R2関連は13/13（案A固有12/12を含む）、
  R3基礎分割読取は4/4合格。
  R1 scannerがproduction runner先頭のhashbangを受理できず、受理側7検査と
  下流20検査が不成立。修正・再実行と後続工程は実施していない。
- 2026-07-24 / hashbang追補承認: `presentation-candidate13-caption-gate-b2-r1-hashbang-limited-acceptance-addendum-20260724-v001.md`を承認し、本設計の§4.2・§4.4・§4.5、§7、§9を追補の範囲で改訂した。runner不変、先頭1行目限定、直接7件・下流未検証20件という契約で実装と全132件からの再検査を再開した。
- 2026-07-24 / hashbang実装後の全件検査停止: package全132件は118合格・14不合格。直接7件の残り1件は裸CR検査データ欠陥、下流13件はGate Aレポート検証呼出の既存契約不一致という第四原因だった。修正・再実行、意味回答側・回帰・preflightは行っていない。正本は`presentation-candidate13-caption-gate-b2-hashbang-full-test-stop-report-20260724-v001.md`。
