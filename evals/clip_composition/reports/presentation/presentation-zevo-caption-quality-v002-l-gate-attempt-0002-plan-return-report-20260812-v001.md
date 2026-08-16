# ZEVO字幕品質v002 L局所ゲート attempt-0002 計画差し戻し報告 v001

## 1. 結論

L局所ゲートの新attemptは10件中6件合格・4件不合格で停止した。同attempt内の修正は0件である。

前回の二原因は解消した。

1. 意味字幕と基礎映像timelineは、同じ元配信・同じ約68分地点の正式成果物へ揃えた。
2. source closure合格値は契約どおりcase ID、入力caption ID、cue範囲列を検査し、records全量は共用再読結果側で照合した。ZCQ024は今回合格した。

新たに露出した不合格も検査設営に属する。正常fixtureが101文字atomを一文字ずつ101 cueへ分けたため、20msしかない3 cueが30fps上の正のframe範囲を持てず、productionの共用時間写像が正しく拒否した。

L工程で検査設営起因の不合格が再発したため、承認済みの歯止めを適用する。個別修正は提示せず、L工程計画ごとkawafmmへ戻す。P、R、F、U以降へは進んでいない。

## 2. 正式attemptの事実

| 項目 | 観測 |
|---|---|
| 起動前checklist | 合格。固定Node、固定TSX絶対path、NODE_OPTIONS不存在、native、Chromium、FFmpeg/FFprobe、atomic runtime、並行書込み0件を確認 |
| 時刻整合preflight | 19/19。101 atomの全保持片は同じ基礎映像timeline 2区間へ包含された |
| 期待shape preflight | ZCQ018〜027の10/10。契約外field参照0件 |
| 正式検査 | 10件 |
| 合格 | 6件（ZCQ019〜ZCQ024） |
| 不合格 | 4件（ZCQ018、ZCQ025〜ZCQ027） |
| stderr | 0 byte |
| API通信 | 0回 |
| 費用 | US$0 |

TAP、stderr、起動前checklist、時刻・期待shape preflight、読み取り診断は監視root外の版付きattempt記録へ保存した。

## 3. 前回原因の解消確認

### 3.1 元時刻帯の混在

新fixtureの意味字幕と基礎映像timelineは同一の正式runに由来する。意味字幕の保持区間と基礎映像timelineは、4,080,650〜4,084,435msおよび4,086,915〜4,108,290msで一致する。101 atomの全保持片はこの二区間のいずれかへ包含された。

### 3.2 source closureの期待形

承認済み契約byteから、合格caseのexact keysが`caseId,inputCaptionId,cueRanges`であることを再導出した。検査はこの3項目を照合し、atom recordsは共用再読結果側で全量照合した。ZCQ024は正式TAPで合格し、atom欠損、本文不一致、再構築不成立の拒否枝も通過した。

## 4. 新たに確定した原因

### 4.1 観測

正常fixtureの回答は、一つの文字atomを一つのcueにする形だった。101 atomを共用時間写像へ個別に渡すと、次の3 atomだけが`OUTPUT_V002_ZERO_FRAME`となった。

| atom | 本文 | 元時刻 | 長さ |
|---|---|---:|---:|
| 000070 | ぁ | 4,096,762〜4,096,782ms | 20ms |
| 000087 | ん | 4,102,286〜4,102,306ms | 20ms |
| 000089 | け | 4,102,426〜4,102,446ms | 20ms |

30fpsの一frameより短い一文字cueなので、個別cueとして正のframe範囲を持てない。productionはこれを`CUE_TIMELINE_MAPPING_INVALID`として検査済み拒否へ写した。

事前確認は「保持片がtimeline区間へ包含されること」までは確認したが、「fixtureが作る各cueを共用mapperへ渡した結果が正のframe範囲を持つこと」までは確認していなかった。したがってpreflight自体も正常fixtureの成立条件を閉じ切れていなかった。

### 4.2 影響した検査

| ID | 観測 | 帰属 |
|---|---|---|
| ZCQ018 | 正常実行が時間写像不成立で検査済み拒否 | fixture・検査設営 |
| ZCQ025 | 正常入力確認が同じ拒否 | 原因の派生 |
| ZCQ026 | 正常入力確認が同じ拒否 | 原因の派生 |
| ZCQ027 | 合格reportを前提にしたfinalizer検査が非合格tupleを受けて停止 | 原因の派生 |

### 4.3 三分法

- production欠陥: 観測なし。共用mapperは20msの一文字cueが0frameになることを正しく拒否した。
- fixture・検査設営欠陥: 確定。正常fixtureのcue分割が、各cueの正のframe範囲を成立させていなかった。
- 契約矛盾: 観測0件。

## 5. 合格して確認できたこと

- ZCQ019〜023: provider意味回答の外形、暗黙正規化拒否、棄権、caption集合、境界ID、cue順、行末順。
- ZCQ024: atom、本文、保持片、source closureの全量閉包と、不成立時の拒否。

ZCQ025〜027は今回も全証明できていない。合格済みとは扱わない。

## 6. 歯止めの適用

L工程で検査設営起因の不合格が二度続いた。今回は前回と別原因で層は進んだが、kawafmmが定めた「再発時は個別修正を提示せずL工程計画ごと停止」の条件に該当する。

そのため、cueをまとめる等の個別修正案、preflight追加案、Lの再attempt案は本報告では提示しない。L工程の正常fixtureと証明構造をどの単位で組み直すかを、人間判断へ戻す。

## 7. 停止位置

| ゲート | 状態 |
|---|---|
| S | 6/6、proof 50/50 |
| A | 11/11、proof 116/116 |
| L attempt-0002 | 6/10で停止 |
| P / R / F / U | 未実施 |
| 正式46件・直接影響回帰・green・baseline・tree照合 | 未実施 |
| API通信・正式描画・stable tag | 未実施 |

## 8. 本来目的との接続

字幕の意味小単位選択をZEVOへ接続する経路では、入力再読とsource closureまでの実枝が進んだ。一方、実データ相当の正常cue列を映像frameへ成立させるfixture設計が閉じていないため、ZEVO字幕品質v002の実装完了には未到達である。できていない部分を合格扱いせず、L計画を戻す。
