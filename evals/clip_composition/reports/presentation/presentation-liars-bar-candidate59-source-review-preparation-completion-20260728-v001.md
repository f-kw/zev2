# Liar's Bar candidate 59 組立確認媒体 準備完了報告 v001

- 実施日: 2026-07-28
- 対象: `qdczJpv8RCc` candidate 59
- 対象タイトル: マリンのADHD的？な片付け事情と無意識の脱衣
- 外部通信: 0回
- 費用: US$0
- 正式組立決定: 未作成

## 結果

正式jobを固定し、読み取り専用preflightの全条件が一致した後に、組立確認用mp4 1本と回答画面を生成した。出力10ファイルの内容・SHA、動画frame数、音声sample数を検査し、すべて合格した。Microsoft Edgeで回答画面が読み込まれたことも確認した。

## 事実

- 正式job:
  - `evals/clip_composition/outputs/presentation/source-review-preparation-jobs/qdczJpv8RCc-candidate-59-v001.json`
  - SHA-256: `698d7f56f5f3970ccc8ee1d490fd024704f0c65194b0a71130f76e108a2c58a4`
- preflight:
  - sourceとSTT 3ファイルの実体SHAがjobの束縛値と一致
  - STTが宣言する入力媒体と実行媒体がbyte同一
  - 残存発話は281文字・2まとまり（speech 777 / 778）
  - 出力先は生成前に未使用
  - 保存境界は30fps格子でframe `[178235, 179782)`、48kHz格子でsample `[285176000, 287651200)`へ写像
- 確認用mp4:
  - path: `evals/clip_composition/outputs/presentation/source-review-preparations/qdczJpv8RCc-candidate-59-v001/assembly-review.mp4`
  - SHA-256: `b3c48912d1acd51b5a4313e61c14fdd6d8cbd72cb270ceb74d0fa01e62cfb115`
  - 1920×1080 / 30fps / 1,547 frame
  - AAC 48kHz stereo / 2,475,200 sample
  - 実再生時間: 51.566667秒
  - 保存上の時間: 51.574秒
  - 差: 約7.333ms
- 回答画面:
  - `evals/clip_composition/outputs/presentation/source-review-preparations/qdczJpv8RCc-candidate-59-v001/review.html`
  - SHA-256: `2210dc07faeded0a46027d5eeb61e48a82d42486f06c5cf0934565d767428a63`
  - 全体判断は「この切り分けでよい / 追加編集が必要」の2択
  - 時刻の手入力はない
- 検査記録:
  - `evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-source-review-preflight-20260727-v001.json`
  - `evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-source-review-output-audit-20260728-v001.json`

## 音響終端

WebRTC VAD mode 0 / mode 3の既存診断を実行しようとしたが、環境内のVAD依存が利用不能だった。このため、音響上安全だという機械判定は行っていない。

- mode 0: unavailable
- mode 3: unavailable
- 診断結果: `ambiguous`
- 対応: 回答画面へ語尾の局所確認を追加

これは語尾が悪いという判定ではなく、機械確認を完了できなかったため人間へ局所確認を戻した状態である。

## 未確認

- 全体の切り分けが視聴上よいか
- 最後の短い「と」が途中で切れて聞こえないか

上記は人間の目視・聴取前なので合格とは記録していない。

## 人間作業

目安は約1分。確認用mp4を1回見て全体を1判断し、VADが使えなかったため語尾だけを短く聴き比べて1判断する。回答受領後の正式組立決定は別actionであり、今回は作成していない。
