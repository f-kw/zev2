# candidate 13 基本テロップ B2 hashbang限定受理 全件検査停止報告 v001

- 日付: 2026-07-24
- 結論: **package側の正式全件検査が132件中118合格・14不合格となったため、修正・再実行せず停止した**
- 主線: hashbang限定受理の実装とB2全件再検査
- 副線: なし
- 人間作業: 0件・時間計測なし

## 1. 本来の目的

目的は、production runnerを変更せず、先頭1行目の正当なhashbangだけを
package側・意味回答側の同じscannerで扱い、前回の先行停止を解消した後の下流検査まで
一度の全件検査で確かめることだった。

検査を合格に見せること、118件を部分合格として後段へ進むこと、
不合格を見て同じattempt内で検査や実装を直すことは目的ではない。

package側の全件検査が不合格だったため、承認済み停止条件に従い、
意味回答側、既存回帰、candidate 13読み取り専用preflightへ進んでいない。

## 2. 実装した範囲

### 2.1 hashbangの限定受理

- 安定読取済みJavaScript sourceの先頭2byteが`#!`の場合だけhashbangとして扱う。
- 行末はLFまたはCRLFだけを受理する。
- payloadはtabまたはASCII可視文字だけを受理する。
- hashbangはtokenを生成せず、行末から既存scannerへ戻す。
- 2行目以降の`#!`、BOM・空白・改行後の`#!`、未許可文字を汎用許可しない。
- hashbang後のJavaScript本文に対するdynamic import、require、
  module読込時file I/O等の既存検査を維持する。

package側と意味回答側のscanner blockはbyte完全一致している。
production runnerは変更せず、次のSHA-256を維持した。

```text
1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff
```

### 2.2 固定検査

新しいtop-level testは増やさず、既存のpackage側1件・意味回答側1件の中へ、
hashbangの受理・拒否例を名前付き小項目として追加した。

実装前の静的監査で、契約の許可境界にあたるtab・`0x7E`の受理と、
その直外の`0x1F`・`0x7F`の拒否が表から漏れていることを検出し、
承認済み文字範囲を変えず両側へ同じ4例を追加した。

- `test()`呼出しの記述数はpackage側75、意味回答側58で、変更前後に増減なし。
- package側の正式TAP登録数は132のまま。

## 3. package側の正式全件検査

実行したのは次の1回だけである。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node
  --test
  --test-reporter=tap
  --test-reporter-destination=evals/clip_composition/reports/presentation/test-runs/20260724-caption-b2-hashbang-limited-v001/package.tap
  evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs
```

| 項目 | 結果 |
|---|---:|
| 全検査 | 132 |
| 合格 | 118 |
| 不合格 | 14 |
| skipped | 0 |
| cancelled | 0 |
| todo | 0 |
| 終了コード | 1 |
| TAP記録の実行時間 | 71,886.189ms |

TAP全文:

- path:
  `evals/clip_composition/reports/presentation/test-runs/20260724-caption-b2-hashbang-limited-v001/package.tap`
- SHA-256:
  `9f431bd525e6ce7e74bee012a76597bb74cbb9187f6255792b22e6b7951dcafe`

## 4. 前回の直接7件

### 4.1 合格した6件

前回hashbangで先行停止した次の6件は合格した。

1. 関数・block arrow・concise arrow内file I/Oの遅延領域。
2. 通常member・optional member後の除算。
3. spread三形とspread直後の正規表現。
4. 正規表現・comment・string・template raw内の禁止語。
5. 固定済み数値五形。
6. 制御条件内とstatement開始の正規表現。

実runner、LF、CRLF、空payload、tab、`0x7E`、空行、
hashbang payload内の禁止語形、通常の非実行領域内`#!`も、
不合格小項目より前に受理を確認した。

### 4.2 残る1件は検査データの構成誤り

TAP 115は「裸CR終端を拒否する」小項目で不合格になった。
しかし実際の入力は裸CR終端ではなかった。

検査は、hashbangを除いたproduction runner本文を後ろへ連結する共通helperを使った。
runner本文の先頭byteは空行のLFである。そのため、

```text
#!/usr/bin/env node + CR + runner本文先頭のLF
```

となり、実入力は承認済みのCRLF終端だった。scannerがこれを受理したのは契約どおりで、
この不合格だけからhashbang実装の欠陥とは判定できない。

一方、この小項目でtest内の反復が停止したため、後ろに並んでいたU+2028、
U+2029、行終端なしEOF、NUL、非ASCII、その他制御文字、`0x1F`、`0x7F`の拒否は、
今回の正式TAPでは未実行である。検査データを直していないため、未確認のまま保持する。

## 5. 前回の下流20件

### 5.1 合格した7件

前回未検証だった下流20件のうち、TAP 47〜52と69の7件は合格した。

- 人間認定済み表示台帳だけにある小数の境界。
- 表示台帳以外の外部JSONにある小数の拒否。
- 表示規則の完全一致。
- 同じ意味値でも異なる字句のfile hash不一致。
- file hashとcanonical hashの区別。
- preset検査indexの版一致。
- package前半の違反を担当検査へ帰属させること。

### 5.2 残る13件は新たに露出した第四原因

残った下流13件は、TAP 44、68、116〜119、121〜125、130、132である。
共通する先行停止は`gateAReport / GATE_A_REPORT_INVALID`だった。

静的照合で、既存のGate Aレポート検証関数とpackage側の呼び出しが一致していないことを
確認した。

検証関数は、次の8項目だけを持つ入力を要求し、戻り値はbooleanである。

- report
- expectedExitCode
- jobValue
- jobSnapshot
- inputSnapshots
- runtimeBinding
- evidencePasses
- readOnlyGuard

package側は、`reportBytes`と`checkerContext`という別形で渡し、
booleanの戻り値へさらに`.valid === true`を要求している。
したがって、正常なGate Aレポートでも検証は常にfalseになり、
後続のpackage build、publication、CLI、違反観測へ到達できない。

この不一致は今回のhashbang差分で入ったものではなく、
既存commit `951c46f3b`から存在していた。hashbangの先行停止を解消したことで
初めて正式全件検査に露出したため、**新たな第四原因**として分離する。

TAP 125の実出力は次を明示している。

- `jobBinding`から`embeddedReportBuild`までは合格。
- `gateAReport`だけが`GATE_A_REPORT_INVALID`で不合格。
- 以後のpackage build・publicationは上流不合格により未実行。

残る12件も、正常終了1、期待した後段違反の欠落、または期待段階より前の
`gateAReport`停止として同じ原因で説明できる。

## 6. 14不合格の帰属

| 帰属 | 件数 | 状態 |
|---|---:|---|
| hashbang直接7件のうち実装経路 | 6合格 | hashbang先行停止を解消 |
| hashbang固定表の検査データ誤り | 1不合格 | 裸CRのつもりがCRLF。検査側の欠陥 |
| 下流20件のうち到達・合格 | 7合格 | hashbang解消後の実測 |
| Gate A検証の呼出契約不一致 | 13不合格 | 第四原因。後段を先行停止 |

14不合格をhashbang追補の失敗へ一括帰属しない。
同時に、118合格をB2の部分合格や完了とも扱わない。

## 7. 停止条件との対応

次の停止条件が成立した。

- 事前固定したpackage 132件全合格を満たさなかった。
- 直接7件の1件が不合格だった。
- 下流20件の13件に第四原因が露出した。
- 二つの修正を同じattempt内で行うと、承認済みの「修正・再試行せず停止」に反する。

そのため、次を行っていない。

- 裸CR検査データの修正。
- Gate Aレポート検証呼び出しの修正。
- package検査の部分再実行または全件再実行。
- 意味回答側B2全件検査。
- ゲートA回帰。
- 残存source atom回帰。
- candidate 13読み取り専用preflight。
- B2完了報告。
- 次ゲートの正式package生成・Gemini実走承認依頼。
- 正式package、prompt、Gemini、表示計画、指示書、描画。

既存の正式成果物、凍結fixture、expected、candidate 13基礎映像、
production runnerは変更していない。

## 8. 再開に必要な判断

再開には、少なくとも次の二点を版付き修正設計として固定し、
新しい全件実行を人間が承認する必要がある。

1. 裸CRの拒否例を、runner本文を連結しない`hashbang + CR + EOF`として作る。
   同じ固定表の未実行拒否例も、一度のtop-level test内で最後まで確認する。
2. Gate Aレポート検証の呼び出しを、既存検証関数の8項目とboolean戻り値へ揃える。
   検証関数側の契約を緩めず、余分なwrapper形や`.valid`期待を持ち込まない。

修正設計では、13不合格がこの第四原因で解消する見込みと、
修正後に初めて到達する後段で別原因が現れ得ることを分けて記録する。

本停止報告の確認に、人間の媒体視聴、時刻入力、時間計測は不要である。
