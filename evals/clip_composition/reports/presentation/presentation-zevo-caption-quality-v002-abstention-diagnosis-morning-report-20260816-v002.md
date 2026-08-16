# ZEVO字幕品質v002 棄権原因診断・朝報告 v002

日付: 2026-08-16  
状態: 既承認分岐(c)で停止

## 結果

D1はthinking highでも`abstained`。D2は選択内容を生成したが、契約外status`success`のため厳格受入不合格。D3は「schema詳細と意味小単位の客観基準が不足」と説明した。

| ID | HTTP | status | 入力token | 候補token | thinking token | 費用 |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| D1 | 200 | abstained | 10,282 | 6 | 2,004 | US$0.01524900 |
| D2 | 200 | invalid `success` | 10,282 | 1,797 | 4,427 | US$0.03105150 |
| D3 | 200 | free-text reason | 10,299 | 49 | 1,897 | US$0.01502175 |
| D4〜D6 | 未送信 | D1棄権分岐のため選定なし | 0 | 0 | 0 | US$0 |

診断累計US$0.06132225。本日全API実測累計US$0.14528850。上限US$1.00以内。

自走分岐は(c)を通った。正式B6は送信せず、診断回答の正式流用0件、横型描画0本、QC・確認ページ0件である。

## 副線

- Luna公式snapshotとprovider専用B5/B6接続設計素材: 完了、OpenAI API通信0回。
- Gemini観察記録: schema 400→安全性遮断→3.6棄権→D1〜D3診断まで閉じた。
- 完了報告草稿: v006へ同期。

## 次の裁定点

prompt/task本文の改訂要否。thinking highだけの改訂v020へ進む条件は成立しなかった。

API通信3回、全てraw先行保存・再試行0。secret保存0、commit 0、stable tag 0。
