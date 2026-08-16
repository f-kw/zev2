# ZEVO字幕品質v002 v006適用 S局所ゲート attempt-0003 停止・S test設営全体見直し報告 v001

- 日付: 2026-08-11
- 結果: stopped
- 外部通信: 0回
- 費用: US$0
- 正式成果物・stable tagの変更: 0件

## 1. attempt前の自己検査

直接起動guardのscope限定修正後、次の両側を実行時TAPで確認した。

1. S直接起動: 6検査を登録し、fixture helperを通るZCQ002が合格、残る5件は指定patternでskip。名前解決失敗0件。
2. B5/B6 import: B5/B6所有11検査だけを登録し、S所有6検査の追加登録0件。共用owner解決入口を使うbefore hookが合格。

前attemptのscope誤りは解消した。

## 2. 正式attempt実測

- S局所: 4/6 passed
- 合格: ZCQ001、ZCQ002、ZCQ003、ZCQ006
- 不合格: ZCQ004、ZCQ005
- Node test runner: 終了1
- TAP: `/private/tmp/zevo-caption-quality-v002-s-gate-attempt-0003/s-gate.tap`
- TAP SHA-256: `ffe86e30f4e0dea9f10f76c03004458abcb4cad51613387aa73907c7069e8f39`
- TAP: 169行 / 6,212 byte

proof閉包、version付き14件、旧ID訂正、guard両側、S job schema、固定loader、runtime V6、atom全量閉包、決定的source package byteは合格した。

## 3. 不合格1: ZCQ004

### 観測

検査期待は`rejected / CUE_SOURCE_PROMPT_PROJECTION_INVALID`だったが、実測は`rejected / CUE_SOURCE_ATOM_CLOSURE_INVALID`だった。

### 確定原因

検査fixtureは、atom本文をgetterの読取回数に応じて途中から空文字へ変えることで、前段を通過した後の可視projection検査だけを壊そうとしていた。しかしproductionは前段の意味package envelope検査でも同じ本文を読む。fixtureが想定した回数より前に空文字へ変わり、atom全量閉包が先に正しく拒否した。

これは時間依存ではないが、production内部の読取回数へ依存した検査設営であり、対象枝の「最初に失敗するpredicate」を固定できていない。productionが誤ったcodeを返した観測ではない。

### 帰属

fixture・検査設営欠陥。

## 4. 不合格2: ZCQ005

### 観測

atomic公開準備でstaging directoryを欠落させた枝について、契約期待は`failed / source-invalid / toolExitCode null`、実測は`failed / helper-execution-failed / toolExitCode null`だった。他のbinding shape不正とbinding byte差は期待どおりだった。

### 確定原因

承認済み追補v004は、staging欠落・非directory・identity/type差を`source-invalid`へ写す。一方、現productionはstaging初回`lstat`のENOENTを閉語彙へ個別写像せず、外側catchの既定`helper-execution-failed`へ落としている。

fixtureは実directoryを作成後に削除し、欠落状態を決定的に作っている。期待をproductionへ合わせる余地はなく、productionが承認契約の所有分類に届いていない。

### 帰属

production実装欠陥。

## 5. 三分法

| 検査 | production | fixture・検査設営 | 契約 |
|---|---|---|---|
| ZCQ004 | 不合格根拠なし | 読取回数依存の故障注入が前段を先に壊した | 矛盾なし |
| ZCQ005 | staging欠落の閉語彙写像が契約に未到達 | 欠落状態の製造は決定的で正しい | v004に期待分類が明記され曖昧さなし |

## 6. 周回判定

S局所の検査設営起因停止は、proof抽出・ID転記、guard scope、本attemptのZCQ004故障注入で3回目となった。kawafmm裁定に従い、ZCQ004だけの個別patchは提示しない。S test設営全体を見直す新計画へ戻す。

ZCQ005は検査設営ではなく、同じattemptで初めて実枝へ到達して露出した独立production欠陥として分離する。

## 7. S test設営全体の見直し案（未実装）

### 7.1 対象

S所有6検査、50 proof item、7 violation codeを一括対象とする。合格済み検査も除外せず、各負例が狙った枝へ最初に到達することを再監査する。

### 7.2 入口別一件表

各負例について、次を一行に固定する。

- 対象検査とproof ID
- 狙うstatus / stage / primary code
- 故障させる入力または状態
- その前にある全predicateの合格証拠
- 最初に不成立となるpredicate
- 実観測方法
- production / fixtureの所有

正常系についても、入力fixtureの正式schema、呼出入口、公開byte、binding再読を同じ表へ置く。

### 7.3 故障注入規律

- getter読取回数、Proxyの副作用、watcher、polling、timer、実行順の偶然へ依存しない。
- 既存pure入口へ決定的な状態を渡して対象枝を実発火する。
- 承認済みcode枝を決定的入力から到達不能と判定した場合は、検査を細工して通さず「code実枝不成立」として契約判断へ戻す。
- 検査期待を現productionへ合わせるだけの緩和をしない。

### 7.4 今回2件の扱い

1. ZCQ004は上記一件表で前段合格を証明できる決定的観測方式を設計する。既存入口で不可能ならcode実枝不成立として停止条件にする。
2. ZCQ005はv004の`staging欠落 → source-invalid`を満たすproduction限定修正設計として、S test設営の見直しとは別行で管理する。検査期待は変更しない。

### 7.5 再開条件

S全体一件表、ZCQ004の決定的観測方式、ZCQ005の契約準拠修正が版付き設計で承認されるまで、新しいS attemptを開始しない。

## 8. 停止処理

- 不合格後の同attempt修正: 0件
- 再実行: 0回
- A/L/P/R/F/U: 未着手
- 正式46件・回帰・green・baseline・tree照合: 未実施
- API通信・countTokens・generateContent・費用支出・正式描画・tag: 0件
- attempt-0001〜0003のTAP・停止報告・部分実装は上書きせず保持した。
