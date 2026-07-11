# theme-llm-v002@gemini-web-flash 正式範囲hit採点

- fixture: nOEWCNc77MI_multiblock_material_v001
- 入力: nOEWCNc77MI_rough_top50_speech_chars_source_only_v001
- 結果の扱い: 正式な主結果
- 候補: 25件 / 根拠範囲: 27件
- 採点対象外: 人間が除外した4区間

## 結果

| 見方 | hit | 正解数 | 意味 |
| --- | ---: | ---: | --- |
| 入力内expected | 0 | 1 | モデルが入力文字として見られた正解だけの正式判定 |
| 入力外expected | 0 | 12 | 原理的に入力から見えなかった正解。モデル失敗には数えない |
| 全expected | 0 | 13 | 13件全体を見た参考値 |

## 候補の失敗タイプ

| 分類 | 件数 | この採点での意味 |
| --- | ---: | --- |
| 過広範囲 | 0 | accepted expectedを丸ごと内包する、または複数expectedにまたがる根拠範囲。範囲hitには含むが品質上の失敗として分ける |
| 別話題 | 25 | 有効な根拠範囲はあるがaccepted expectedと時間上まったく重ならない。意味内容の人間判定ではなく、機械上の範囲外という意味 |
| 根拠なし | 0 | 有効な根拠範囲を1件も記録していない |

## expected別

| expected | 元block | 入力 | hit | 入力で重なった発話 |
| ---: | ---: | --- | --- | --- |
| 1 | 1 | input-not-visible | miss | - |
| 2 | 3 | input-visible | miss | 2 |
| 3 | 4 | input-not-visible | miss | - |
| 4 | 6 | input-not-visible | miss | - |
| 5 | 7 | input-not-visible | miss | - |
| 6 | 8 | input-not-visible | miss | - |
| 7 | 9 | input-not-visible | miss | - |
| 8 | 10 | input-not-visible | miss | - |
| 9 | 11 | input-not-visible | miss | - |
| 10 | 13 | input-not-visible | miss | - |
| 11 | 14 | input-not-visible | miss | - |
| 12 | 15 | input-not-visible | miss | - |
| 13 | 17 | input-not-visible | miss | - |

## 候補別

| candidate | title | 分類 | 根拠範囲数 | hit expected | 除外区間との重なり |
| ---: | --- | --- | ---: | --- | --- |
| 1 | 船のリフォームお披露目とまさかの愚痴 | off-topic | 2 | - | - |
| 2 | ピンク色の空に見立てた二人の関係性 | off-topic | 1 | - | - |
| 3 | お腹がすいたマリンに芋を配るころね | off-topic | 1 | - | - |
| 4 | マリンの雑な反応と予想外のフォロー | off-topic | 1 | - | - |
| 5 | エイムに自信があるマリンとイノシシ退治へ | off-topic | 1 | - | - |
| 6 | サメに襲われころねを身代わりにしようとするマリン | off-topic | 1 | - | rejected_material_block_5 |
| 7 | 島で倒れてしまったころねを助けに向かうマリン | off-topic | 1 | - | - |
| 8 | 島の上陸直後に突如現れたイノシシに驚く二人 | off-topic | 1 | - | - |
| 9 | 「クジラ肉」と言い間違えてツッコまれる宝鐘マリン | off-topic | 1 | - | - |
| 10 | 向かってくるイノシシの対策とエイムを考察する二人 | off-topic | 1 | - | - |
| 11 | トッポをレンジでチンする検証をリスナーに丸投げする二人 | off-topic | 1 | - | - |
| 12 | バックパックなど革を使った新アイテムの研究に大興奮 | off-topic | 1 | - | - |
| 13 | 謎の足場を登ろうと苦戦するも「ネイチャーアート」と言い張る展開 | off-topic | 1 | - | - |
| 14 | 直前の「イノスキ」のせいで笑いすぎて腹筋がよじれる船長 | off-topic | 1 | - | rejected_material_block_12 |
| 15 | 島の到着と建築計画 | off-topic | 1 | - | - |
| 16 | 突如襲いかかるサメへの憤怒 | off-topic | 1 | - | - |
| 17 | 階段裏のデッドスペース活用 | off-topic | 1 | - | - |
| 18 | 2階のレイアウトと素材集め | off-topic | 1 | - | - |
| 19 | 水遠い問題と清浄機の設置議論 | off-topic | 2 | - | - |
| 20 | 呼び捨てのてぇてぇ匂わせ | off-topic | 1 | - | - |
| 21 | 資材の収納順を相談するころねとマリン | off-topic | 1 | - | - |
| 22 | 未来の心配をするころねとマリンの軽快な掛け合い | off-topic | 1 | - | - |
| 23 | ベッドの上位互換からイカダの装飾へ夢を膨らませる二人 | off-topic | 1 | - | - |
| 24 | 女子らしくオシャレにテーブルを作りたい二人 | off-topic | 1 | - | - |
| 25 | 地面に正座で食卓を囲む「わびさび」の提案 | off-topic | 1 | - | - |

## 判定規則

- 入力内expected: 保存済みprompt-inputの発話区間がexpectedと1ms以上重なるもの。
- 範囲hit: 候補の有効な根拠範囲がaccepted expectedと1ms以上重なるもの。
- 過広範囲: 根拠範囲がexpectedの開始より前から終了より後まで厳密に内包する、または1根拠範囲が複数expectedに重なるもの。秒数や比率の独自係数は使わない。
- 除外4区間との重なりは監査欄にだけ残し、hitにも分母にも含めない。
