# ZEVO字幕品質v002 v009 capability参照入口・実装前停止報告 v001

- 日付: 2026-08-12
- 対象: F局所ゲート再計画、追補v009適用
- 外部通信: 0回
- API費用: US$0
- 正式attempt: 0回
- 正式描画: 0回
- commit / tag: 0件

## 1. 結論

F testが非故障capabilityをformal正本関数へ委譲するための参照入口が、承認済み追補v009に存在しない。v009が同時に要求する次の三条件は、現在の二module構成では両立しない。

1. 19件のformal正本関数と固定capability objectをF production module内のprivate値とする。
2. F production moduleのsource authored named export集合を既存5件exactのままにする。
3. 別fileのF testが、非故障capabilityについて同じformal正本関数参照へ委譲する。

private値は別moduleから参照できない。test側で19件を再実装すれば条件3と計算複製禁止に反し、test専用production分岐や隠しpropertyを作れば未承認入口になる。このため、正式attempt前に停止した。

## 2. 事実

### 2.1 現物照合

- F productionのnamed exportは5件である。
- formal capability objectはmodule-privateであり、formal CLIだけが直接参照している。
- F testは別moduleであり、named export以外の値へ到達できない。
- 追補v009 §3は、testの非故障keyがformal正本関数へ委譲することを要求する。
- capabilityのローカル複製、test判定branch、fallbackは承認されていない。

### 2.2 到達済み

- 追補v009を版付き文書として起草し、6領域の一致監査後にDECISIONSへ記録した。
- proof集合は489件、ZCQ044は35件、v009による置換は42件で値レベル閉包した。
- 全formal jobの承認契約bindingへv009を加える配線を途中まで実装した。
- F productionへexact三引数と19 capabilityの検査、formal正本19関数、formal CLIからの固定object受け渡し、既存処理のcapability経由化を途中まで実装した。

### 2.3 未実施

- F testのcapability配線とZCQ044 35枝の実発火検査
- TSX wrapperの最終exact検査
- S/A/L/P/Rの遡及namespace照合記録
- U負例の全実発火補強
- F/U局所正式attempt
- 正式46件、直接影響回帰、green、baseline、tree照合

## 3. 三分法

| 分類 | 判定 | 根拠 |
|---|---|---|
| production欠陥 | 該当しない | 現時点では正式attemptを開始しておらず、既存production挙動の不合格を観測していない。 |
| test・fixture設営欠陥 | 該当しない | ローカル複製で設営すれば通せるが、それ自体が承認契約違反になるため採用できない。 |
| 契約解釈・閉包不足 | 該当 | private正本を別test moduleが参照する供給経路が未定義である。 |

## 4. 修正候補

| 案 | 内容 | path影響 | 契約影響 | 評価 |
|---|---|---:|---|---|
| A | F moduleへ、freeze済みformal capability objectを返す版付き読み取り専用入口をnamed exportとして1件追加する。testは取得した同一参照を基礎に、故障対象1件だけを置換する。 | 17 pathのまま | F export exact集合を5件から6件へ改訂する追補が必要 | 最小差分。正本関数の複製0で、formal CLIとtestが同じ参照を共有できる。推奨。 |
| B | 19件の正本関数と固定objectを新しいproduction capability moduleへ分離し、F runnerとtestが同じmoduleをimportする。 | 18 path目が必要 | path上限、implementation binding、module surfaceの改訂が必要 | 分離は明快だが工事範囲が大きい。 |
| C | test内に19件を再実装する。 | 17 pathのまま | v009 §3と計算複製禁止に反する | 不採用。 |
| D | execute関数の非公開propertyやsource変形でprivate値をtestへ漏らす。 | 17 pathのまま | 未契約の隠し入口になる | 不採用。 |

## 5. 推奨する最小追補の固定事項

案Aを採用する場合、次を版付き追補で固定する必要がある。

1. 追加exportのexact名、引数0件、返却値が同一のfreeze済みformal capability objectであること。
2. 返却objectの19 key、順序、各値がformal CLIで使う関数参照と同一であること。
3. testは返却objectを直接変更せず、新しいplain objectへ19件を同順で転記し、故障対象だけを一件置換すること。
4. formal CLIは引き続きmodule-private定数を直接渡し、job・環境・test条件による選択を持たないこと。
5. F source authored named export exact集合を6件へ改訂し、TSX default wrapperも同じ6件の同一参照だけを持つこと。
6. path数17、implementation binding 36/11/19/41/51、code 49、検査ID46、proof総数489、owner件数は不変とすること。
7. 契約件数pin proofとmodule surface proofだけをexact置換し、ZCQ044 35件の証明内容は変えないこと。

## 6. 実現性調査の自己評価

事前検出できた。v009起草時の実現性調査で、正本値の所有だけでなく、別moduleのtestがその値を取得するexact入口まで逆引きすべきだった。`actual引数→値の供給者→検証時点→consumer`の表に、JavaScript module境界を越えるexport経路の有無を含めれば、実装前に検出できた。

## 7. 停止時状態

- v009文書とDECISIONS記録は保持する。
- v009 binding配線とF productionの部分実装は、裁定まで追記・削除・commitせず凍結する。
- 検査は実行していないため、合格・不合格の主張は0件である。
- 既存正式成果物、stable tag、API入力、描画成果物は変更していない。

## 8. 承認依頼文案

相談役レビュー済み。kawafmm裁定: 停止を受理し、§4案Aの版付き最小追補起草を承認する。F moduleへ、同一のfreeze済みformal capability objectを返す引数0件の版付きnamed exportを1件追加する。F source authored named exportは6件exactへ改訂し、固定TSX環境のdefault wrapperも同じ6件の同一参照だけを持つ。formal CLIは従来どおりmodule-private定数を直接渡し、testは返却objectを変更せず、非故障keyを同一関数参照のまま転記して故障対象1件だけを置換する。test専用production分岐、job/envによる選択、fallback、計算複製は作らない。path数17、implementation binding、code 49、検査ID46、proof総数489、owner件数は不変。契約件数pin proofとmodule surface proofだけをexact置換し、ZCQ044 35件の証明内容は変えない。追補起草・提示で停止し、実装再開は別承認とする。API通信、countTokens、generateContent、費用支出、正式描画、stable tagは引き続き別承認。
