# ZEVO字幕品質v002 v022 source preflight 停止報告v001

## 1. 結論

v022関連検査はsource 6/6、B5/B6 11/11、selection 10/10、planner 10/10の全合格へ到達した。幅35・契約16件の新版source jobを正式serializerで発行した。

正式source工程は、起動前の全参照再照合で停止した。source runner本体は未起動、正式output rootは未使用のままである。同attempt内の修正は0件である。

停止原因は、preflightの参照再照合処理が、job内に実在する絶対pathのruntime bindingをworkspace相対pathと同じ方法で連結した設営欠陥である。

## 2. 関連検査

| 工程 | 結果 |
|---|---:|
| source | 6/6 |
| B5/B6 | 11/11 |
| selection | 10/10 |
| planner | 10/10 |

全TAP、stderr、終了code、signalはattempt-0003へ独立保存した。

## 3. 新版source job

- job ID: `a-v002-caption-quality-first-api-source-20260816-v003`
- 最大論理幅: job一件と横型style三件が全て35
- approved contract: 16件
- decoder: preflight内で合格
- value validator: preflight内で合格
- output root: 未使用

字幕本文、3 caption、253 boundary、task本文、schema、preset registryは変更していない。

## 4. 停止の内側原因

preflightはjob内の全file bindingを列挙し、SHA・canonical SHAを再照合する設計である。meaning package、契約、実装file等のworkspace相対pathと、固定Node・固定TSXの絶対pathを同じ連結処理へ渡した。

最初の絶対pathである固定Nodeについて、workspace rootの後ろへ絶対path文字列を連結した存在しないpathを作り、file readがENOENTとなった。

観測:

- checkpoint: source正式command前のreference binding再照合
- operation: file read
- target: 固定Nodeのruntime binding
- OS error: ENOENT
- source runner起動: 0回
- source output/staging作成: 0件

## 5. 三分法

| 帰属 | 判定 | 根拠 |
|---|---|---|
| production | 該当しない | source runner本体へ未到達 |
| job・実行設営 | 該当 | preflightが絶対pathとworkspace相対pathを区別しなかった |
| 契約 | 該当しない | job schemaはruntime bindingの絶対pathを正式値として要求し、decoder・validatorは合格 |

契約解釈は不要である。

## 6. 実現性調査の自己評価

事前検出できた。job内bindingのpath種別を一件表にし、絶対pathとworkspace相対pathを値レベルで分類すれば、正式attempt開始前に検出できた。全binding列挙だけでなく、各fieldのpath基準点を逆引きする必要がある。

## 7. 限定修正候補（未実施）

preflight補助処理だけを、絶対pathはそのまま、workspace相対pathはworkspace rootから解決する既存schemaどおりの二分類へ訂正する。production、正式job byte、契約、値35、関連検査、出力先へ触れない。

承認後は使用済みattempt記録を不変保持し、新しい版付きattempt rootで同じsource jobを再照合・一回実行する。旧output rootは未使用だが、attempt分離のため新版の未使用output rootを持つbyte同一値の再束縛jobが必要かは承認時に固定する。

## 8. 外部作用

- API通信: 0回
- 費用: US$0
- source runner本体: 0回
- source package製造: 0件
- B5/B6正式実走: 0回
- 描画: 0本
- commit/tag: 0件

