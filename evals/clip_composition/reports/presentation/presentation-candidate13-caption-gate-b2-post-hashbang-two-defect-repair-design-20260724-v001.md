# candidate 13 基本テロップ B2 hashbang後二欠陥 修正設計 v001

- 作成日: 2026-07-24
- 状態: **設計提示・人間承認待ち。実装、検査再実行、正式package生成は未着手**
- 起点:
  `presentation-candidate13-caption-gate-b2-hashbang-full-test-stop-report-20260724-v001.md`
- 対象:
  裸CR検査データの製造誤り1系統と、package側のGate Aレポート検証呼び出し不一致1系統
- 今回の人間作業:
  本設計の承認または差し戻し1判断。媒体視聴、時刻入力、正解生成、時間計測は不要

## 1. 本来の目的

目的は、現在の14不合格を期待値変更で合格に見せることではない。

1. 裸CRを拒否する検査へ、本当に裸CRのbyte列を渡す。
2. Gate Aの承認済み検証関数を、承認済みの入力形式と戻り値どおりに呼ぶ。
3. そのうえでpackage全件を最初から実行し、現在の先行停止より後ろに別の欠陥がないかを初めて観測する。

検査期待の緩和、Gate A側の契約変更、失敗結果の補正、部分合格、後段だけの部分再実行は行わない。

## 2. 現在地と14不合格の分離

hashbang限定受理後のpackage側全件検査は132件中118合格・14不合格だった。

| 群 | 前回の位置づけ | 今回の実測 | 本設計で扱うもの |
|---|---:|---:|---|
| hashbang直接7件 | 先頭hashbang受理の直接確認 | 6合格・1不合格 | 裸CR検査データ1件 |
| 下流未検証20件 | hashbang解消後に初めて到達 | 7合格・13不合格 | Gate A検証呼び出し1系統 |

14件をhashbang実装の失敗へ戻さない。118合格もB2の部分合格とは扱わない。

## 3. 欠陥1: 裸CR検査データ

### 3.1 読み取り監査の結果

package側・意味回答側のhashbang表を、各25ケース
（受理8、拒否17）と各側の実source baseline 1件まで読み取り監査した。

package runnerでは、1行目のhashbangとLFを外した残り本文が、空行由来のLFから始まる。
検査helperがprefixと本文をそのまま連結するため、package側だけに二つの製造不一致があった。

| 製造不一致 | 実際のbyte | 影響 |
|---|---|---|
| 裸CR終端 | `CR + 本文先頭LF`、すなわちCRLF | 拒否例が受理可能な改行へ変質。今回の不合格1件 |
| hashbang後の空行 | prefix側の空行1行に本文先頭の空行が加わり、空行2行 | 合否は変わらないが、検査名と実体が不一致 |

LF、CRLF、U+2028、U+2029、EOF、その他の拒否例、および意味回答側の全ケースは、受理・拒否の意味を変える製造ミスが無かった。

水平確認の申告値は、**契約へ影響する不一致1件、合否を変えない表記不一致1件、計2件**である。

### 3.2 修正する検査データ

production scanner、production runner、受理・拒否の期待は変更しない。

1. package側と意味回答側の「裸CR終端」は、
   `hashbang + CR + 先頭がLFでない既知の正常実装本文`
   として作る。CRの直後にLFを置かない。
2. package側の合成prefix用本文は、実runner本文の先頭がLFであることをbyteで確認してから、
   その既知のLF一byteだけを外した本文を使う。
   実package runnerそのものを通すbaselineは、元byteのまま維持する。
3. これにより「hashbang後の空行」も、検査名どおり空行ちょうど1行になる。
4. 意味回答側は、既知の正常実装本文の先頭がLFでないことを確認し、
   裸CRの直後へその本文を接続する。

これは検査データの製造修正であり、裸CRやCRLFの契約変更ではない。

`hashbang + CR + EOF`だけにはしない。
その形では、scannerが裸CRを誤って受理しても、その後に必須importが無いことを理由に
同じ`IMPLEMENTATION_MISMATCH`が出て、裸CR拒否が壊れた事実を隠せるためである。
正常本文を後ろへ置けば、裸CRを誤受理した場合はimport graphが正常に通り、
拒否期待が必ず不成立になる。

### 3.3 byte形状の固定検査

既存のtop-level testを増やさず、その内部で少なくとも次をbyteで確認する。

- LF終端は`0A`。
- CRLF終端は`0D 0A`。
- 裸CR終端は`0D`の直後が`0A`ではなく、既知の正常本文の先頭byteである。
- U+2028、U+2029はそれぞれのUTF-8 byteを保持する。
- 行終端なしEOFはhashbang末尾で終わる。
- hashbang後の空行はちょうど1行である。
- package側・意味回答側とも、裸CRの後ろへ置く本文をLF/CRLF終端なら受理する対照を持つ。

受理・拒否表は、途中のassertで残りを未実行にせず、全ケースの結果を一度収集してから不一致をまとめてassertする。
これにより、一つの拒否例が落ちても、その後ろのU+2028、U+2029、EOF等を実行した事実をTAPへ残せる。

## 4. 欠陥2: Gate Aレポート検証の呼び出し不一致

### 4.1 正本判定

正本は次の三文書・実装で一致しており、契約追補が必要な曖昧さはない。

1. Gate A検証入口追補v001:
   平坦な8項目を受け、primitive booleanを返す。
2. B1完全実装契約v001 §7.2:
   Gate Aの同じ8項目をexact inputで渡し、拒否と有効なfailed reportを別codeにする。
3. B1受け渡し入口追補v001:
   package側は生観測からGate A旧形式の値を再構成し、同じ検証経路へ渡す。

B1完全実装契約§4.5の
`{report, reportBytes, expectedExitCode, checkerContext}`と`{valid}`は、
B1自身のpackage/semantic最終report validatorの契約である。
Gate Aの既存validatorとは別の関数・別の段であり、Gate A呼び出しへ転用しない。

したがって帰属は次で確定する。

| 対象 | 判定 |
|---|---|
| Gate A検証関数 | 承認済み契約どおり。変更しない |
| Gate A runner | 承認済み実装・完了時SHAを維持。変更しない |
| package側呼び出し | 入力形式と戻り値解釈が契約から外れている。ここだけが修正対象 |

両側がずれている状態でも、契約が曖昧な状態でもないため、契約追補へ切り替えない。

読み取り時点のGate A runner SHA-256は
`3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352`で、
承認済み完了報告の値と一致する。
package runnerもhashbang実装時に固定した
`1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff`
のままである。
Gate A 21/21を将来再実行するのはGate Aを修正するためではなく、
package側修正が既存完了ゲートへ影響していないことを確認する全回帰である。

### 4.2 現在の不一致

現在のpackage側は、Gate A検証関数へ次の誤った扱いをしている。

- 契約に無いreport byteを直接渡す。
- 必要な値を一つのwrapperへ入れる。
- primitive booleanへ、さらに`valid`というfieldがあると仮定する。

このため正常なGate Aレポートでも常に無効扱いになり、
`gateAReport / GATE_A_REPORT_INVALID`で後段を止める。

### 4.3 修正後の唯一の呼び出し

package側は、既存の受け渡し入口が返した値から、Gate A検証関数へ次の8項目をこの順で直接渡す。

1. 組み立てたGate Aレポート
2. レポートstatusから決まる期待終了コード
3. Gate A jobの値
4. Gate A jobの二時点snapshot
5. Gate A入力の二時点snapshot列
6. 実行環境binding
7. 境界証拠の二pass
8. 読み取り専用guard

返値はprimitive booleanとしてそのまま判定する。
report byte、wrapper、`valid` field、追加の変換関数を持ち込まない。

report byteの一致検査を削除するわけではない。
それはB1自身の最終report validator、正式serializer、actual/canonical hash、
二回生成の決定性検査が引き続き担当する。
Gate A validatorへ同じ事実を別形式で重複入力しない。

### 4.4 失敗帰属を変えない

| 状態 | 既存の帰属 |
|---|---|
| 8項目とレポート内部整合が不成立 | `GATE_A_REPORT_INVALID` |
| Gate Aレポートは有効だがstatusがfailed | `GATE_A_NOT_PASSED` |
| 受け渡し入口が旧形式値を構築できない | 既存internal不整合、終了コード2 |
| 有効かつpassed | 後続package build・publication検査へ進む |

違反code、固定順、CLI終了コード0/1/2、診断文字列を変更しない。

## 5. 14不合格との事前対応表

| 旧TAP番号 | 旧停止 | 修正後に初めて確認できること |
|---:|---|---|
| 115 | 裸CRのつもりのCRLFを受理 | 裸CRを拒否し、同じ表の全ケースを実行できるか |
| 44 | Gate Aレポート無効で先行停止 | 監視投影hashの本来の照合 |
| 68 | 同上 | 正常なpure checker・最終validatorの本来の照合 |
| 116 | 同上 | Gate A build・決定性・reportの担当違反 |
| 117 | 同上 | package build各段の失敗帰属 |
| 118 | 同上 | package成果物・source-onlyの非修復契約 |
| 119 | 同上 | job二時点差・publication違反 |
| 121 | 同上 | production runnerの受け渡し入口利用 |
| 122 | 同上 | build失敗時の後段不実行 |
| 123 | 同上 | staging・再読取・rename前の停止 |
| 124 | 同上 | 正式artifact読取失敗とsnapshot不一致の分離 |
| 125 | 同上 | report直前job読取不能時の終了2 |
| 130 | 同上 | production CLIの終了0/1と出力分離 |
| 132 | 同上 | 動的観測codeと承認済み割当の一致 |

右列は**到達可能になる本来の検査**であって、合格予告ではない。
修正後に初めて見える別原因が一件でもあれば、新しい原因として停止する。

## 6. 実装承認後に変更できる範囲

実装コード・既存検査コードとして変更してよいのは次の3ファイルだけである。

1. `presentation_caption_semantic_source_package_v001.mjs`
   - Gate A validatorの呼び出し形式とboolean判定だけ。
2. `test_presentation_caption_semantic_source_package_v001.mjs`
   - package側hashbang検査データ、全ケース収集、Gate A三状態の直接確認。
3. `test_presentation_caption_semantic_output_v001.mjs`
   - 意味回答側の裸CR byte固定とpackage側との同期確認。

変更しないもの:

- Gate A checker、validator、runner、job、schema。
- package runner、意味回答runner、production scanner。
- B1の57違反code、固定順、CLI、正式7ファイルschema。
- 信頼binding、環境固定、正式成果物、fixture、expected。
- 正式package、prompt、Gemini出力、表示計画、指示書、描画。
- 外部依存。

対象外ファイルを変更する必要が出た場合は、実装を止めて新しい設計判断として報告する。
ただし、検査TAP・完了または停止報告の新規保存と、完了した事実の
`DECISIONS.md`・`docs/HANDOVER.md`同期は、実装変更ではなく記録成果物として許可する。
承認済みB1契約§19・§22に従うcandidate 13の読み取り専用preflight job一件も、
検査入力として新規保存を許可する。
承認済み契約・設計文書の本文は変更しない。

## 7. 実装後の固定検査

別承認で実装が許可された場合、次の順を変えず、一段でも不合格なら修正・再試行せず停止する。

1. 変更可能3ファイルと、変更禁止ファイルのSHA-256を記録する。
2. package側の実登録数132件、package側の静的`test()`記述75件、
   意味回答側の静的`test()`記述58件が不変であることを確認する。
3. package側132件を最初から一度実行し、TAP全文とSHA-256を保存する。
4. 132/132の場合だけ、意味回答側を全件一度実行し、test runnerが報告した実登録数を保存する。
5. 両系統が全件合格した場合だけ、Gate A 21/21を再実行する。
6. Gate Aが合格した場合だけ、残存source atom回帰50/50を再実行する。
7. 全回帰が合格した場合だけ、§7.1の順でcandidate 13読み取り専用preflight jobを作り、
   そのjobでpreflightを一度実行する。
8. 完了報告または停止報告を作り、次ゲート承認依頼の起草までで停止する。

実装報告では次を必須とする。

- 裸CRを含む両表全ケースの実行結果。
- 水平確認2件の修正後byte。
- 正常passed、有効failed、無効reportの三状態と、二つのGate A違反codeの分離結果。
- 旧不合格14件それぞれの新結果と修正帰属。
- package/意味回答のtop-level登録数。
- 新しいTAPの保存path・SHA-256。旧TAPは変更しない。
- package runnerとGate A runnerの全byte不変確認。
- Gate A 21/21、残存source atom 50/50、preflightの各結果を別々に報告。

### 7.1 candidate 13読み取り専用preflight job

現時点で次のjobは存在しない。修正後のpackage core hashと実装commitを、
結果に合わせた後追い値ではなく実行前の入力として固定する必要がある。

- path:
  `evals/clip_composition/outputs/presentation/caption-semantic-source-package-preflight-jobs/DmWu0jVQfTE-candidate-13-caption-b1-v001.json`
- job ID:
  `DmWu0jVQfTE-candidate-13-caption-semantic-source-package-preflight-v001`
- 成果物ID:
  `DmWu0jVQfTE-candidate-13-v001`
- package ID:
  `DmWu0jVQfTE-candidate-13-caption-semantic-source-package-v001`
- mode:
  `read-only-preflight`
- 固有件数:
  source atom 354、container 3、boundary candidate 205、
  container別source atom 126/122/106、候補60/78/67

作成と実行の順を次へ固定する。

1. 固定job親directoryを、symlinkでない安全な実directoryとして作成または確認する。
2. target job pathが存在しないことを確認する。既存なら削除・上書きせず停止する。
3. 承認済みの読み取り専用監視投影入口から、job一件だけを除外した監視hashを一度計算する。
4. Gate A、source、表示台帳、runtimeの承認済み固定値と、
   修正後のpackage core/runner実byte hash、修正を固定した実装commit、
   3の監視hashをjobへ入れる。実行結果から値を逆算しない。
5. jobを排他的に一度だけ作成する。
6. 同じ固定Node実体でpreflightを一度実行する。
7. 終了0、trusted passed、書き込み0件、stdout正式byteのSHA-256、
   全check結果、開始・終了監視投影の一致を保存する。

親directory作成を監視hash計算後へ移さない。
preflight不合格時にjobを書き換えて再実行しない。

## 8. 完全性チェック

| 確認項目 | 本設計の固定 |
|---|---|
| 成果物schema | 変更なし |
| 違反code・順序 | 変更なし |
| 終了コード | 0/1/2を変更しない |
| 環境固定 | 変更なし。実行後の環境へ期待値を合わせない |
| 入出力範囲 | package側Gate A呼び出しだけを承認済み8項目へ戻す |
| 検査可能性 | productionと検査が同じGate A validatorを呼ぶことを直接検査 |
| 工程間受け渡し | 承認済みB1受け渡し入口の出力を再構成せず使う |
| 汎用性 | candidate 13固有件数・hashは実装へ入れずpreflightだけに保持 |
| 後方互換 | 旧wrapper形を併存させない |
| 正式成果物 | 変更・再生成しない |

## 9. 停止条件

次の一つでも成立したら、そのattemptでは修正せず停止する。

- 3ファイル以外の実装・既存検査コード変更が必要になった。
- Gate A正本と異なる解釈が必要になった。
- 検査期待を緩めないと通らない。
- package 132件、意味回答側、回帰、preflightのいずれかが不合格。
- 旧14件を二修正で説明できない新しい不一致が出た。
- production runnerまたはGate A runnerのbyteが変わった。
- 正式成果物、凍結fixture、expectedへの書き込みが必要になった。

## 10. 承認依頼

次の承認を求める。

> 本設計v001を承認し、§6の3ファイルだけを修正してよい。
> 実装後は§7の順で全件検査・回帰・candidate 13読み取り専用preflightを行い、
> 一件でも不合格または新しい設計判断があれば修正再試行せず停止する。
> 正式package、prompt、Gemini、表示計画、指示書、描画は含めない。
