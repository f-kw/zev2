# candidate 13 caption gate B2 R1・R3契約確定追補 v001

- 日付: 2026-07-24
- 状態: **2026-07-24 hashbang限定受理を実装後、package全件118/132・14不合格で停止**
- 追補対象（いずれも承認済みであり、両方が改訂対象）1:
  `presentation-candidate13-caption-gate-b2-full-test-repair-design-20260724-v001.md`
- 追補対象（いずれも承認済みであり、両方が改訂対象）2:
  `presentation-candidate13-caption-gate-b1-implementation-contract-design-20260723-v001.md`
- 起草根拠:
  `presentation-candidate13-caption-gate-b2-implementation-stop-contract-conflict-20260724-v001.md`
- 今回の人間作業: 0件・時間計測なし
- 次に必要な人間判断: 裸CR検査データとGate A検証呼出の版付き修正設計を起草するかの判断1件

## 1. 本来の目的

本追補の目的は、B2の20不合格を合格に見せることではない。

実装前監査で見つかった二つの契約矛盾を、検査意図と既存の失敗帰属を変えずに
解消することである。

1. R1では、現行sourceが実際に使う`.`、`?.`、`...`だけを限定字句器で扱えるようにし、
   正規表現内の`import(`を実行コードと誤認する自己衝突を直せる状態にする。
2. R3では、chunk読取という**読み方**の変更によって、formal publicationで既に固定した
   `PUBLICATION_FAILED`という**失敗の名前**を変えない。

汎用JavaScript parserへの拡張、字句のワイルドカード許可、監視対象の除外、
publication違反codeの追加・改名は行わない。

## 2. 追補の効力

本追補が承認された場合、B2修正設計v001、B1実装契約設計v001、本追補v001を
一組の実装正本とする。二つの承認済み設計を黙って書き換えず、承認後に両設計へ
「本追補による改訂」の案内と改訂履歴行だけを同一コミットで追記する。
B2修正設計だけへの追補とは解釈しない。承認の効力、改訂案内、改訂履歴の対象は
B2修正設計v001とB1実装契約設計v001の両方である。

2026-07-24以降、hashbang処理は
`presentation-candidate13-caption-gate-b2-r1-hashbang-limited-acceptance-addendum-20260724-v001.md`
の承認内容で本追補§3・§5〜§7を上書きする。3token規則は維持し、その前に
production runner先頭1行目の`#!`だけを非実行領域として処理する。

本追補は次を上書きする。

| 承認済み設計 | 対象節 | 上書き内容 |
|---|---|---|
| B2修正設計v001 | §4.2・§4.4 | `.`、`?.`、`...`の認識条件、状態遷移、固定検査を追加する |
| B2修正設計v001 | §4.5 | 上記3tokenだけを今回の対応済み字句へ加える。その他の未対応構文は従来どおり停止する |
| B2修正設計v001 | §6.3 | 読取失敗を一律にuntrusted終了2へ送るように読める文を、既存工程別の帰属へ置き換える |
| B2修正設計v001 | §7 | 20不合格と、R1追補・R2・R3の最新版対応へ置き換える |
| B1実装契約設計v001 | §4.3 | 読取handleを版付きchunk入口へ改訂する |
| B1実装契約設計v001 | §4.4・§12.1・§16.2・§17.3・§18.3 | formal publicationの既存生観測、code 55、report写像、終了コードをchunk輸送後も維持する旨を追記する |

元設計のR1遅延領域判定、R2、R3の同一file descriptor・逐次SHA-256・三時点照合、
違反code集合、CLI 0/1/2、成果物schema、正式入力・Gemini・描画の停止状態は変更しない。

## 3. R1追補: 3tokenだけの限定許可

### 3.1 静的棚卸し

正式検査対象を、package側2 roleと意味回答側7 roleの和集合として照合した。
`packageCore`が両側で重複するため、実物は次の8 sourceである。

| source | package側 | 意味回答側 | path |
|---|---:|---:|---|
| package core | 対象 | direct | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |
| package runner | 対象 | — | `evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs` |
| 意味回答core | — | direct | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` |
| 意味回答runner | — | direct | `evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs` |
| 文字配置実装 | — | dependency | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` |
| Gate A core | — | dependency | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` |
| Gate A残存source atom core | — | dependency | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` |
| Gate A runner | — | dependency | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` |

現行sourceで必要なのは、通常のproperty参照`.`、名前またはbracketへ続くoptional chain
`?.`、引数・配列・object・仮引数で使うspread / rest `...`である。

現行8 sourceにはoptional call `?.(`はない。spread / restの直前に現れる実行字句は
`(`、`[`、`{`、`,`の4種類だけである。したがって、観測していない構文まで今回の
許可へ含めない。

### 3.2 認識順

comment、文字列、template literalの生文字、regular expression literalの本体とflagsを
除外した実行可能部分だけで、次の最長一致順を使う。

1. `...`
2. `?.`
3. `.`

`?.`は`?`と`.`の間に空白・commentがない完全一致だけを一tokenとする。

`.`との境界を実装者判断へ残さないため、元設計が「数値」とだけ記したtoken grammarも、
現行8 sourceで実在する次の5形に限って固定する。上から最長一致で認識し、
どの形も読了後は「式を終了した」状態へ移る。

| 数値token | exact grammar | 現行例 |
|---|---|---|
| 16進整数 | `0[xX][0-9A-Fa-f]+` | `0xff`, `0xd800` |
| 8進整数 | `0[oO][0-7]+` | `0o600` |
| 10進小数 | `(?:0|[1-9][0-9]*)\.[0-9]+` | `0.04`, `0.98` |
| 10進BigInt | `(?:0|[1-9][0-9]*)n` | `1n` |
| 10進整数 | `(?:0|[1-9][0-9]*)` | `0`, `57` |

数値tokenに含まれる小数点は上表が先に消費し、本節のproperty参照`.`として扱わない。
直後にASCII identifier文字、数字、`_`、`$`、または追加の`.`が続き、上表の一tokenに
完全一致しない場合は字句不成立とする。

先頭dot数値`.5`、末尾dot数値`1.`、`1..name`、指数、二進、numeric separator、
16進・8進BigInt等は現行8 sourceで未観測なので、新たに許可しない。

### 3.3 固定状態と遷移

元設計の「式の開始を待つ」「式を終了した」「`}`直後のslashだけ判定不能」に、
次の二つの一時状態だけを加える。

- `member-name-required`
- `optional-chain-target-required`

許可条件を次へ固定する。

| token | 許可する直前 | 許可する直後 | 状態遷移 |
|---|---|---|---|
| `.` | 「式を終了した」または「`}`直後のslashだけ判定不能」 | 既存のASCII identifier grammar `[A-Za-z_$][A-Za-z0-9_$]*`一個 | `member-name-required`へ入り、名前を読み終えた後だけ「式を終了した」へ移る |
| `?.` | 「式を終了した」または「`}`直後のslashだけ判定不能」 | 上記ASCII identifier一個、または`[` | 名前なら読了後に「式を終了した」。`[`なら既存bracket処理へ入り、対応する`]`の後に「式を終了した」 |
| `...` | 「式の開始を待つ」かつ直前の実行字句が`(`、`[`、`{`、`,`のいずれか | 元設計で許可済みの式開始字句 | 「式の開始を待つ」を維持する |

`.`・`?.`と後続tokenの間では空白とcommentだけを読み飛ばせる。待機中にslash、
別の演算子、終端へ到達した場合はregular expressionへ倒さず字句不成立とする。

`?.(`、private field `?.#name`、optional tagged templateは今回許可しない。
必要なsourceが実在した時点で、別の契約改訂へ戻す。

### 3.4 slash判定

- `.name`、`?.name`、`?.[expression]`の完了後は「式を終了した」状態である。
  直後の`/`はdivisionとして扱う。
- `.`または`?.`の後続待機中の`/`は、regular expressionにもdivisionにもせず
  字句不成立とする。
- `...`の後は「式の開始を待つ」状態を維持する。直後の`/`はregular expressionである。
- `}`直後のslash判定不能状態では、`.`と`?.`だけを明示済みの非slash後続として受理し、
  propertyまたはbracket完了後に「式を終了した」へ確定する。

### 3.5 module-load I/O検査を弱めない

3tokenは実行可能字句列から削除しない。property名も既存のfile I/O名検査へ渡し、
次は従来どおり拒否する。

- `source.readFileSync(...)`
- `source?.readFileSync(...)`
- `[...readFileSync(...)]`
- 関数内を含む`import(...)`・`require(...)`
- `...import(...)`・`...require(...)`

R1の既存契約は、実行字句列で`import`または`require`の直後が`(`なら拒否する。
今回member用の例外を追加しないため、`object.import(...)`、
`object?.require(...)`も保守的に拒否する。

関数宣言・arrow・methodの遅延領域判定、IIFE判定、module-load時file I/Oの名前集合は
変更しない。

### 3.6 字句不成立

次はすべて`IMPLEMENTATION_MISMATCH`へ送る。

- `..`、`....`
- 後続を欠く`.`、`?.`、`...`
- 式開始位置の`.`・`?.`
- 式終了位置の`...`
- 固定4前置字句以外から始まる`...`
- `?.(`、`?.#name`、optional tagged template
- member後続待機中のslash
- 元設計で既に不成立とした未閉鎖regex・character class・括弧不整合
- §3.2の固定5形に合わない数値literal

未知tokenを「とりあえず式開始」「とりあえず式終了」へ送るfallbackは置かない。

### 3.7 固定検査

package側と意味回答側へ同じsource変種表を与え、受理・拒否を完全一致させる。

受理:

1. package側2 roleと意味回答側7 roleの全実物。重複を除く8 sourceを一つも
   省略せず受理する。
2. `value.property / divisor`
3. `value?.property / divisor`
4. `value?.[field] / divisor`
5. `resolve(root, ...parts)`
6. `({...entry})`、`[...entries]`
7. spread後のslashがregexになる`consume(.../import\\(/g)`
8. regex本体に`import(`、`require(`、`readFileSync(`を持つ自己言及例。
9. comment、文字列、template生文字内の同じ字面。
10. `0`, `57`, `0.04`, `1n`, `0xff`, `0o600`の固定数値形。

拒否:

1. module-load時の通常property・optional property経由file I/O。
2. spread内のfile I/O。
3. 実行コードのdynamic import・`require`。
4. member後続待機中のslash。
5. `..`、`....`、不完全な3token。
6. `.5`, `1.`, `1..name`, `1e2`, `0b10`, `1_000`等の固定5形外数値。
7. `?.(`、private field、optional tagged template。
8. `return ...value`、`left + ...right`等の固定4前置字句外spread。

今回の自己言及回帰
`const pattern = /\\bimport\\s*\\(/u`
および`require`・file I/O名の同型を、固定検査として残す。

## 4. R3追補: chunk輸送と失敗帰属を分離する

### 4.1 変えるのは読み方だけ

package runnerと意味回答runnerで、`openReadOnly`による全読取を
`readChunksV001()`へ置き換える。

次も例外にしない。

- formal publicationのwork内staging artifact。
- rename後のpublished artifact。
- formal publication中の非job入力再読取。

formal publicationだけ旧全量読取へ戻す分岐、pathの再open、
全量Buffer読取へのfallbackは置かない。元設計§6.1・§6.2の
同一file descriptor、逐次SHA-256、byte数完全一致、三時点状態照合を全て維持する。

### 4.2 formal publicationでの既存帰属

B1 §18.3の手順9・10・13で完全な読取観測を作れない場合は、
untrusted終了2へ直接送らず、既存のpublication生観測へ保存する。

| 読取工程 | 保存先とfailurePoint | 既存帰属 |
|---|---|---|
| staging / published artifactのopen前失敗 | `artifactReads[i]`の`artifact-NN-open` | code 55 `PUBLICATION_FAILED` |
| 同artifactのchunk型不正、空chunk、短読、過読、読取例外、読取後fstat取得例外、close失敗 | `artifactReads[i]`の`artifact-NN-read` | code 55 `PUBLICATION_FAILED` |
| formal中の非job入力再読取を完了できない | `inputRecheck.failurePoint`の`input-recheck` | code 55 `PUBLICATION_FAILED` |

上記は、B1 §4.4の既存unionへ
`{status:"io-error", snapshot:null, observedKind:null, failurePoint}`
または既存`inputRecheck` unionとして保存する。新しいfailurePoint、違反code、
report fieldを追加しない。

pure checkerは各生事実を既存の固定path・固定順でcode 55へ一対一に帰属し、
`publicationFailures`へ保存する。trustedなfinal reportを構築できる限り、
CLIはfailed reportの終了コード1とする。複数failurePointを一件へまとめない。

ここでいう読取失敗は、chunk列または読取後fstatという**観測自体を取得できない**
場合である。読取後fstatまで取得でき、三時点statを持つsnapshotを構成できたうえで
値が食い違う場合は、I/O失敗へ読み替えない。

### 4.3 `PUBLICATION_FAILED`へ吸収しないもの

chunk読取を最後まで完了し、既存snapshotと三時点状態を作れた場合の、
内容・hash・identity・link数等の不一致は、従来どおり
`PUBLICATION_STAGING_INVALID`、`PUBLICATION_INPUT_CHANGED`、
`PUBLISHED_PACKAGE_INVALID`等の既存担当codeへ帰属する。

したがって、読取後fstatの**取得不能**は§4.2のcode 55、取得済み三時点statの
kind / dev / ino / size / mtimeNs / nlinkの**値不一致**は本節の既存codeであり、
同じ状態差を二系統へ重複帰属させない。

「formal modeで起きた」という理由だけで、表現可能な不一致までcode 55へ移さない。

### 4.4 untrusted終了2の範囲

formal publicationの既存生観測へ収められず、trusted checker contextを作れない読取は、
従来どおり終了コード2で停止する。

- package・意味回答の開始入力。
- preflightと意味回答側の監視tree。
- Node実体。
- packageの`jobPrePublication`・`jobPreReport`。
- 意味回答の`jobPreReport`。
- 意味回答が読むsource package・raw意味出力の分類不能I/O。

formal publicationでcode 55の事実を保存済みでも、最後のjob再読取や
report自己検証を完了できずtrusted final reportを作れない場合は終了コード2である。
途中まで作ったreportを正式結果にしない。

帰属はmode名でなく、読取を要求した既存工程と、その工程が持つ生観測schemaで決める。

### 4.5 B1契約への改訂案内

本追補の承認は、B1実装契約v001の次の追記承認も兼ねる。

1. §4.3の`openReadOnly` handleを、own key順
   `statBigInt`, `readChunksV001`, `close`
   のfrozen plain exact objectへ改訂する。
2. 一般入力の分類不能I/Oを終了コード2とする規則に、
   「ただしpackage formalのstaging / published artifactとinputRecheckは、
   §4.4のpublication生観測へ保存し、既存code 55へ帰属する」を追記する。
3. §4.4、§12.1、§16.2 code 55、§17.3、§18.3手順9・10・13・15は、
   field・固定順・終了コードを変更せず、chunk輸送でも同じ帰属を維持すると追記する。

承認済み文書は、承認後に本文への案内と改訂履歴行を記録するまで直接編集しない。

### 4.6 固定検査

1. package・意味回答両adapterの全読取handleが、
   `statBigInt`, `readChunksV001`, `close`のexact key順である。
2. formalも通常入力・監視treeと同じchunk入口を使い、旧全量読取分岐がない。
3. staging artifactのchunk読取例外・読取後fstat取得例外・close失敗が
   `artifact-NN-read`、code 55、終了コード1となる。
4. published artifactでも同じ帰属を維持する。
5. formal inputRecheckのchunk失敗が`input-recheck`、code 55、終了コード1となる。
6. artifact open失敗は既存`artifact-NN-open`のままである。
7. 完全な三時点snapshotを作れる内容・kind / dev / ino / size / mtimeNs / nlink不一致は、
   既存53・54・56等の担当codeのままである。
8. preflight・通常入力・意味回答側の分類不能chunk失敗は終了コード2で、
   部分reportを出さない。
9. publication失敗保存後にjobPreReportが分類不能なら終了コード2で、
   部分reportを出さない。
10. 57違反code集合、固定順、`publicationFailures`の一対一写像を変更しない。

## 5. 20不合格との最新版対応

公式実行は74件中54合格・20不合格を記録したが、20個の`not ok`名をTAP成果物として
保存していない。F01〜F18は公式test IDではなく、件数を欠落させないための
**未同定観測枠**である。名前を推測で作らない。

R2はAで確定する。子のshapeまたは件数が不正なら、その子全体を該当する親集計から
除外し、除外を集計上で隠さず子自身の違反として記録する。壊れた入力の一部を
親事実へ流用せず、`containerCount`の独立検査は維持する。

原因根は引き続きR1・R2・R3の三つである。今回のR1字句追補は第四原因ではなく、
R1 scanner限定修正を正常sourceへ安全に適用するための実装前提である。

| 観測枠 | 保存済みの個別名 | 直接原因の第一予測 | 必要な修正系統 | R1 3token追補の位置づけ | 未解消時 |
|---|---|---|---|---|---|
| F01 | 未保存 | R1 | scanner限定修正 | R1実装の必須前提。直接解消件数には数えない | その他・第四原因として停止 |
| F02 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F03 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F04 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F05 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F06 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F07 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F08 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F09 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F10 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F11 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F12 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F13 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F14 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F15 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F16 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F17 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F18 | 未保存 | R1 | scanner限定修正 | 同上 | 同上 |
| F19 | `job validatorは正本field順の正常jobを受理し最小leaf pathで不成立を返す` | R2 | 最小件数集計 | 対象外 | その他・第四原因として停止 |
| F20 | `production CLI実processは合成preflightのexit 0/1をstdout/stderr排他で返し書込を残さない` | R3 | chunk読取 | 直接解消件数0 | その他・第四原因として停止 |

計数は18+1+1=20のままである。

実装修正を数える場合は、

1. R1 scanner修正（本追補の3token規則を含む一組）
2. R2 最小件数集計
3. R3 chunk読取

の三系統である。「scanner修正」と「R1追補」を別原因として数え、R2を表から消しては
いけない。

R3追補は旧不合格を追加で割り当てるものではなく、chunk化したformal publicationが
既存の失敗名からuntrustedへ変質する新規回帰を防ぐ。

R1で現行runner実物を受理できることは全件実行の共通前提だが、F19・F20の直接原因を
R1へ重複帰属させない。

次回の全件実行ではTAP全文を保存する。ただしF01〜F18の旧個別名は失われているため、
新TAPのtest名を、根拠なく過去の各枠へ一対一対応させない。20観測枠について
新結果と修正帰属を一行ずつ確定し、R1・R2・R3で説明できない不合格が一件でも残れば
第四原因として停止し、修正・再実行へ進まない。

## 6. 実装契約完全性チェック

| 項目 | 本追補での固定 |
|---|---|
| 成果物schema | 変更なし |
| 字句入力 | package側2 role・意味回答側7 role（重複除外8 source）と合成source。許可は`.`、`?.`、`...`の固定条件だけ |
| 字句状態 | 既存3状態と追加2待機状態、数値5形、slash遷移、拒否条件を§3で固定 |
| 違反code | R1は既存`IMPLEMENTATION_MISMATCH`、R3は既存code 55等。追加・削除なし |
| CLI | 既存0/1/2。publicationでtrusted reportを作れる失敗は1、作れない読取は2 |
| 環境 | Node・ICU・localeの既存固定を変更しない |
| 入出力範囲 | R1はpackage・意味回答の既存検査sourceだけ。R3は全`openReadOnly`読取 |
| 工程間受け渡し | 同じfile descriptorのchunk列を既存snapshot / publication生観測へ渡す |
| hash照合 | byte数とSHA-256を維持。小file・3.38GB実fileとも独立経路と完全一致 |
| 検査可能性 | §3.7・§4.6の正常・違反fixtureをproductionと同じ検査実装へ通す |
| candidate固有値 | 354件、205候補、3.38GB fileの既知値はpreflight照合値だけ。coreへ焼き込まない |
| 停止点 | 実装前は本追補承認待ち。承認後も固定条件不成立・第四原因・新しい矛盾で再試行せず停止 |

## 7. 承認後の範囲

本追補の承認だけでは、正式package生成、prompt登録、Gemini実走、
正式cue・target・指示書、描画を許可しない。

実装再開を同時に明示承認された場合だけ、既に承認済みの順序へ戻る。

1. 元設計とB1契約へ改訂案内・履歴行を追記する。
2. R1・R2・R3を実装し、自己言及回帰を追加する。
3. package側B2全検査をTAP全文保存付きで頭から一度実行する。
4. 意味回答側B2全検査、既存回帰、candidate 13読み取り専用preflightを順に実行する。
5. 20件全件の帰属表と完了報告、次ゲート承認依頼を起草して停止する。

## 8. 承認・改訂履歴

- 2026-07-24 / kawafmm承認: 本追補を承認し、B2修正設計v001とB1実装契約設計v001の
  改訂承認を兼ねる。R2はA（壊れた子を部分利用せず、子の違反として可視化）で確定し、
  R1・R2・R3の実装から次ゲート承認依頼の起草までを夜間停止規律のまま再開した。
- 2026-07-24 / 実行記録: R1・R2・R3を実装後、package全件検査は
  105/132・27不合格で停止した。R2関連13/13（案A固有12/12を含む）と
  R3基礎分割読取4/4は合格。
  R1 scannerはproduction runner先頭のhashbangを受理できず、hashbangの扱いは
  本追補に未定義だった。独自修正・再実行と後続工程は行っていない。
- 2026-07-24 / hashbang追補承認: `presentation-candidate13-caption-gate-b2-r1-hashbang-limited-acceptance-addendum-20260724-v001.md`を承認し、本追補§3・§5〜§7をhashbang限定契約の範囲で改訂した。3token規則とR2・R3契約は変更せず、runner不変のまま全件再検査を再開した。
- 2026-07-24 / hashbang実装後の全件検査停止: package全132件は118合格・14不合格。直接7件の残り1件は裸CR検査データ欠陥、下流13件はGate Aレポート検証呼出の既存契約不一致という第四原因だった。修正・再実行、意味回答側・回帰・preflightは行っていない。正本は`presentation-candidate13-caption-gate-b2-hashbang-full-test-stop-report-20260724-v001.md`。
