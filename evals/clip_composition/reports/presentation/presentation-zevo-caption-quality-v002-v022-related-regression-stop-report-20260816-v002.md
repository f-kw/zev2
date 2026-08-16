# ZEVO字幕品質v002 v022関連検査 停止報告v002

## 1. 結論

前回承認されたsource testの限定修正と、4 test pathの正常返却shape静的照合4/4を完了した。新attemptではsource 6/6へ到達し、前回の返却shape欠陥が解消した。

続くB5/B6検査は10/11となり、ZCQ008一件で停止した。同attempt内の修正は0件である。selection、planner、新版source package、API通信、描画は未実施である。

## 2. 到達結果

| 工程 | 結果 | 状態 |
|---|---:|---|
| 返却shape静的照合 | 4/4 | 合格 |
| source | 6/6 | 合格 |
| B5/B6 | 10/11 | ZCQ008で停止 |
| selection | 0/10 | 未実施 |
| planner | 0/10 | 未実施 |

ZCQ007は合格し、source/B5/B6の契約集合、v022欠落の通信前拒否、B5/B6分離実行を実枝で観測した。ZCQ009〜ZCQ017も合格した。

## 3. 不合格の内側原因

ZCQ008の既存ownerにはproof itemが一件だけ割り当てられている。今回の検査変更は、既存の「providerへ渡すprompt byteがsource packageと一致する」観測に加え、「同prompt内の最大論理幅が35である」観測を、二件目の独立観測としてproof helperへ渡した。

proof helperは観測件数とowner割当件数のexact一致を最初に検査するため、内容比較前に「観測2件、proof item 1件」で拒否した。

- 対象: ZCQ008
- 失敗位置: test内のproof会計
- production実行: B5 request成果物製造まで到達
- provider通信: test transportのみ。外部通信0回
- 不一致: 観測2件 / proof item 1件
- stderr: 0 byte
- process終了code: 1
- signal: 0

## 4. 三分法

| 帰属 | 判定 | 根拠 |
|---|---|---|
| production | 該当しない | ZCQ007と他9検査が合格し、停止はtestのproof件数検査内 |
| 検査・fixture | 該当 | 一件の既存proofへ二件の観測を渡した検査実装欠陥 |
| 契約 | 該当しない | v022はproof総数・owner件数の増減0を固定している |

契約解釈は不要である。

## 5. 実現性調査の自己評価

事前検出できた。v022設計はproof総数・owner件数の増減0を明記しており、既存のproof helperも観測件数のexact一致を実装していた。返却shape照合だけでなく、追加subcaseごとのowner割当数と観測数の静的照合を正式attempt前に行うべきだった。

## 6. 限定修正候補（未実施）

B5/B6 test 1 path内のZCQ008だけを修正する。既存prompt byte一致と新しい幅35一致を一つの構造化観測へまとめ、既存proof item一件で両方を同時に比較する。proof item、owner件数、proof総数、production、契約、fixture値は変更しない。

承認後は、4 test path全体についてowner割当数と観測数の静的照合を記録した上で、新attemptをsource 6件から頭から実行する。今回のattemptとTAPは不変保持する。

## 7. 外部作用

- 外部API通信: 0回
- 費用: US$0
- countTokens正式実走: 0回
- generateContent正式実走: 0回
- 正式source package製造: 0件
- selection公開: 0件
- 描画: 0本
- commit: 0件
- stable tag: 0件

