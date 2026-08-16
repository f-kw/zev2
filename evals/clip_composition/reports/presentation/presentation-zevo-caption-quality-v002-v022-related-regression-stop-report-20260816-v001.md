# ZEVO字幕品質v002 v022関連検査 停止報告v001

## 1. 結論

v022の承認記録と6 path限定実装を行い、固定環境の起動前確認に合格した。関連検査はsource工程の6件を頭から実行し、5件合格・1件不合格で停止した。同attempt内の修正は0件である。

不合格はproduction・契約・正式fixture値ではなく、今回追加した検査assertがproductionの正常返却envelopeを一階層浅く読んだ検査実装欠陥である。productionによる幅35のsource package構築自体は`passed`まで到達している。

B5/B6、selection、plannerの関連検査、新版source package製造、残余リスク受入、API通信、描画は未実施である。

## 2. 起動前確認

- native architecture: arm64
- 固定Node: 合格
- 固定TSX CLI絶対path: 合格
- `NODE_OPTIONS`: 不存在
- 固定Node先頭PATH: 合格
- Chromium起動: 合格
- stderr: 0 byte

起動前recordと正式commandは版付きattempt rootへ保存した。

## 3. 検査結果

| 工程 | 結果 | 状態 |
|---|---:|---|
| source | 5/6 | ZCQ004で停止 |
| B5/B6 | 0/11 | 未実施 |
| selection | 0/10 | 未実施 |
| planner | 0/10 | 未実施 |

sourceではZCQ001、ZCQ002、ZCQ003、ZCQ005、ZCQ006が合格した。契約16件の正式job検証、幅35/36混在の拒否を含むproductionの既存拒否枝は合格している。

## 4. 不合格の内側原因

追加subcaseは、幅35をjob一件、横型style三件へ揃えてproductionのsource package構築入口へ渡した。productionは`passed`を返した。

その直後、検査が正常返却値を直接source packageとして読み、実際の正常返却shapeである「正常値の中のsource package」を一階層たどらなかった。このため、幅上限を読む前に`undefined`参照のTypeErrorとなった。

観測された失敗:

- 対象: ZCQ004の今回追加subcase
- production到達: あり
- production結果: `passed`
- test失敗: 正常返却envelopeの読取階層誤り
- 例外型: TypeError
- stderr: 0 byte
- process終了code: 1
- signal: 0

## 5. 三分法

| 帰属 | 判定 | 根拠 |
|---|---|---|
| production | 該当しない | 幅35を揃えた入力に対しsource package構築は`passed`した |
| 検査・fixture | 該当 | 今回追加したassertだけが正式返却shapeと不一致 |
| 契約 | 該当しない | v022が固定した値35・6 path・契約件数と衝突していない |

帰属は検査実装欠陥で確定し、契約解釈は不要である。

## 6. 実現性調査の自己評価

事前検出できた。productionの同じ正常返却shapeは実装本文と既存の呼出側に実在していた。追加subcaseのactual返却shape逆引きを静的監査へ含めなかったことが見逃しの理由である。

## 7. 限定修正候補（未実施）

source test 1 path内の今回追加assertだけを、productionの正式返却shapeどおり正常値内のsource packageから読む形へ訂正する。production、契約、fixture値、値35、契約件数、検査ID、proof総数には触れない。

承認後は新attempt rootでsource 6件を頭から実行し、6/6の場合だけB5/B6 11件、selection 10件、planner 10件へ進む。今回のattempt rootと全証拠は不変保持する。

## 8. 外部作用

- API通信: 0回
- 費用: US$0
- countTokens: 0回
- generateContent: 0回
- 正式source package製造: 0件
- selection公開: 0件
- 描画: 0本
- commit: 0件
- stable tag: 0件

