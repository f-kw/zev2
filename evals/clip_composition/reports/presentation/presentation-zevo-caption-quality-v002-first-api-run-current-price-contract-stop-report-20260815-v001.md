# ZEVO字幕品質v002 初回API実走・現行価格契約不一致停止報告 v001

## 1. 結論

認証情報をVS Codeの実行環境へ設定した後、Gemini API通信より前の正式source package再束縛を一回実行し、3 caption・253 boundaryを正式来歴へ閉じた。続くB5 job作成前に2026-08-15現在のGoogle公式文書を取得したところ、Gemini 3.6 Flashの現行Standard価格とproductionが受理する固定価格が一致しなかったため、B5 `countTokens`を送信せず停止した。

- 正式source package再束縛: 合格
- B5 `countTokens`: 0回
- B6 `generateContent`: 0回
- Gemini API呼出し: 0回
- 公式文書取得: HTTP GET 6回
- API費用: US$0
- B5/B6正式job: 未発行
- 描画: 0件

## 2. 正式source package再束縛

| 項目 | 実測 |
|---|---|
| source job | `a-v002-caption-quality-first-api-source-20260815-v001` |
| source job SHA-256 | `9d3030574e91f234aa53178b15cb6e5512018240accf3291a74b4c8879038f56` |
| runner結果 | `passed / completed / primaryCode=null` |
| caption | 3件 |
| boundary | 253件 |
| 正式source package SHA-256 | `1dcc8189ea34bb0a001a6ec6d07066f583133d8fda7f71bf9263cc189e555536` |
| 実装来歴 | 36件 |
| 承認契約来歴 | 14件 |
| stderr | 0 byte |

外側記録scriptはrunner完了後、zshの予約済み読み取り専用名`status`へ終了codeを代入しようとして停止した。正式runnerのstdoutは`passed`、正式source packageは公開済み、stderrは0 byteである。wrapper欠陥は予約語でない名前へ訂正したが、正式runnerは再実行していない。終了codeを捕捉できなかった事実は版付き観測recordへ残した。

## 3. 公式文書の実測

Google公式文書6件を新しいjob ID用の版付きsnapshot pathへ取得した。API認証情報は送信していない。

| source | byte | SHA-256 |
|---|---:|---|
| pricing | 248452 | `c7afcf71eb007fd065209897ca31478e3f785313fcbd0712bbe58031531b28bd` |
| tokens guide | 144627 | `b8b61594b8d287b068b588ba78202c8eaf6b0981c7d095d5416043c4a9c528c2` |
| countTokens API | 283766 | `8674e80185268d959e78c5545d1ed4d475c641eba087ca2283aab286217eacfe` |
| billing | 136690 | `df5733538bdaceb47b11d063d4fcd2601caea677db5fae7baeaa47296500894f` |
| thinking | 223993 | `bf6c5bece2612422d3c131f1677fd33107ac480f579f0ee874e7978c968b069c` |
| latest model | 119282 | `34d3bd8843886365b3dbfa95f7f0ff669daeb7f1ae7044fb6ba162ec16f1f5f0` |

公式pricingはGemini 3.6 FlashのStandard価格を、2026-12-31まで入力US$0.75/1M token・出力US$3.75/1M token、2027-01-01以降を入力US$1.50/1M token・出力US$7.50/1M tokenとしている。latest model文書も、同じ導入価格をGemini 3.6 Flashへ適用すると明記している。

## 4. 契約不一致

現行B5/B6 productionは公式価格の受入値を、入力`1500 nanoUSD/token`・出力`7500 nanoUSD/token`だけに固定している。2026-08-15の現行値は入力`750 nanoUSD/token`・出力`3750 nanoUSD/token`であり、正式jobへ現行値を載せるとjob validatorが拒否する。

旧値を現行値として偽装する、将来価格で費用を計算する、検査fixtureの値を流用する、価格検査を飛ばす、のいずれも行っていない。

## 5. 帰属

| 区分 | 判定 | 根拠 |
|---|---|---|
| 入力 | 合格 | 3 caption・253 boundaryを正式来歴へ再束縛済み |
| 実行環境 | 合格 | 認証情報はVS Code側へ設定済み。値は未読・未保存 |
| production／契約 | 改訂が必要 | 実行日で変わる価格を将来通常価格一組へ固定しており、現行の公式導入価格を表現・受理できない |

## 6. 再開に必要な裁定

B5/B6の公式価格検証を、実行日の適用期間を持つ版付き価格snapshotから入力`750`・出力`3750 nanoUSD/token`として受理できる最小改訂が必要である。支出上限US$1.00、B5最大2回、B6一回、再試行0、raw先行保存等は変更不要である。

改訂承認まではB5 commandを提示・実行しない。VS Code側の認証情報はrepository、report、stdout、stderrへ保存していない。
