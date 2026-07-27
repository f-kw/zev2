# Liar's Bar candidate 59 正式化完了・基礎映像生成停止報告 v001

日付: 2026-07-28  
対象: `qdczJpv8RCc` candidate 59  
外部通信: 0回  
費用: US$0

## 結論

人間が確認した約51.567秒の切り分けを、同じ1,547フレーム・2,475,200音声サンプルの正式組立決定へ変換した。

次の基礎映像生成は、生成前の信頼対象SHA検査で不合格となったため停止した。映像生成、字幕処理、Gemini通信は行っていない。

## 人間確認の保存

会話上の回答を次の二つへ対応させた。

- 全体の切り分け: 採用
- 語尾: 欠けなし

正規化した人間結果:

- path: `evals/clip_composition/outputs/presentation/source-assembly-human-results/qdczJpv8RCc-candidate-59-v001.json`
- SHA-256: `16c038de7d978272e261093a07e09561547c1cb13978c98db74f9597536a0064`
- 記録時刻は会話時刻の推測ではなく、成果物の作成時刻をUTCで保存した

## 正式組立決定

既存source入口の検査13/13合格後、正式化を1回実行した。

出力先:

`evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001`

| 成果物 | SHA-256 |
| --- | --- |
| `assembly-decision.json` | `72a1d9c95839a62a3f4dae395ffa9e67877910d75040c65796ca994ad3dd51a4` |
| `formalization-receipt.json` | `d8047cea238695518f9073b90ff4c618017e3cd8daf84a83d5a3ea0cbe073168` |
| `viewed-media-mapping-receipt.json` | `13d5cc1b4a07a539baabdadfe7d3f25478dd275eda63787d22d66ad34a8e8f33` |

成立した内容:

- 元配信区間: 5,941,162ms〜5,992,736ms
- 組立区間: 1区間
- 出力: 1,547フレーム
- 音声: 2,475,200サンプル
- 人間が見た媒体との写像: 完全一致
- 未解決編集: 0件

## 基礎映像生成の停止

正式job:

`evals/clip_composition/outputs/presentation/base-media-build-jobs/qdczJpv8RCc-candidate-59-v001.json`

job形式、正式組立決定、元動画SHA、未使用の出力先は事前検査に合格した。生成器を1回起動したところ、動画を作る前の信頼対象SHA検査で停止した。

失敗記録:

`evals/clip_composition/outputs/presentation/base-media-failures/failure-3d4c5adb7e75d33b6f9da0bf.json`

不一致:

| 対象 | 生成器の登録値 | 現在の実体 |
| --- | --- | --- |
| 字幕契約の共通処理 | `0fcb9f9c6b0ae2f50b4ca68ba1190c75dc0acfe9e7d27a3d504bd46a5d4ce789` | `a81d583d877e7e8a5410831f4a18bca18be08c92d28d6349d9a089fb9368086c` |

## 事実

- 登録値は2026-07-21の実体と一致する。
- 現在値は2026-07-25の承認済みB4変更後のGit実体と一致する。
- 現在ファイルに未保存の作業ツリー変更はない。
- B4変更ではG1〜G3計算をv003共通処理へ一本化し、v002入口を薄い呼び出し側へ変更した。
- 基礎映像生成器と時間対応表の信頼情報は、変更前のSHAを保持したままである。
- 基礎映像出力directoryは作られていない。

## 原因の確定

今回の不合格はcandidate 59の映像・音声・境界ではない。
2026-07-25の字幕契約変更後も、基礎映像v002の実行入口が
2026-07-21時点の検証済み実装SHAを要求する版のまま残っていたため、
現在の作業ツリーから旧版入口を起動できなかった。

## 未確認

- 検証済みの基礎映像v002実行版でcandidate 59の生成が合格するか。
- 後続の残存発話、Gate A、B3がcandidate 59で合格するか。

## 影響の読み取り検査

関連する既存回帰3ファイルを変更なしで実行した。

- 総数: 37件
- 合格: 21件
- 不合格: 16件

16件はすべて、正常な生成経路へ到達する前に同じ信頼SHA不一致で止まった。時間対応表だけを検査する契約・違反検査は合格している。この結果から、不一致がcandidate 59だけでなく、現在の基礎映像生成経路全体を止めていることを確認した。

生産コードで旧SHAを保持する箇所は、次節に挙げる2ファイルだけだった。

## 追加監査と再開方法

当初は次の2ファイルの信頼SHAだけを現在値へ同期する案を検討した。

1. `evals/clip_composition/presentation_base_media_build_v001.mjs`
2. `evals/clip_composition/presentation_base_media_timeline_v002.mjs`

しかし、この案は採用しない。時間対応表側を現在SHAへ変えると、
旧SHAを正式manifestへ記録しているcandidate 13の承認済み成果物を、
現行のB4・描画入口が拒否することを追加監査で確認したためである。
新素材を通すために既存の合格成果物を壊す同期にはしない。

再開には、candidate 13の基礎映像生成時に実際に使われ、
実装SHAが正式manifestへ記録されているcommit
`3c2e03772b7db2be718ccf2a30796dbdcc1d8b39`の
基礎映像v002実行版を、隔離した作業directoryでそのまま使う。
現在のproduction codeは変更せず、candidate 59の正式job・正式入力byteだけを渡す。
この実行版の基礎映像生成・時間対応の直接検査は35/35合格した。
生成結果は、正式jobの固定値および人間が採用した1,547フレーム・
2,475,200音声サンプルとの完全一致を確認した場合だけ現行workspaceへ移す。

## 人間作業

この再開方法に追加の人間作業はない。現在のコードを改訂せず、
すでに検証済みの版で同じ正式jobを処理するため、
生成結果の機械照合まで続行する。
