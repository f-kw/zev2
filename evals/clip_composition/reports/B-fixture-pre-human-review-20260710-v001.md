# B素材 fixture化 人間確認前レポート

作成日: 2026-07-10

対象切り抜き: `nOEWCNc77MI`

対象元配信: `YE-faluP7zY`

## 結論と停止位置

B素材は、凍結用全域STT、DP照合、素材ブロック再構成、確認パッケージ生成、媒体の機械検証まで完了した。現在は人間による素材対応の確認と固定テーマ入力を待つ段階であり、`fixtures/` と `expected/` にはまだ書き込んでいない。

## 製造結果

### 全域STT

- 395/395チャンク完了、`partial=false`
- 53,180発話・53,180単語時刻
- チャンク境界外の16発話・16語を除外、境界をまたぐ32発話・32語を実境界で補正
- 発話IDの欠落、単語参照の欠落、時刻逆転はいずれも0件
- 生のSTT応答は変更せず保存

### DP照合と候補統合

- 全域DP結果: `evals/clip_composition/outputs/global-dp-word-alignment-nOEWCNc77MI_YE-faluP7zY_20260710-full-local30-freeze-v001_dp.json`
- 選択窓DP結果: `evals/clip_composition/outputs/global-dp-word-alignment-nOEWCNc77MI_YE-faluP7zY_selected_windows_20260709_redo_v001_dp.json`
- 候補統合結果: `evals/clip_composition/outputs/dp-candidate-run-union-nOEWCNc77MI-YE-faluP7zY-20260710-full-plus-selected-v001.json`
- 全域DP: 対応1,432組、全直線分545件、既存手順の10語以上候補29件
- 先行した選択窓DP: 候補13件
- 両者の完全一致: 8件
- 選択窓DPだけが持つ非競合候補: 5件
- 切り抜きと元配信の開始・終了4時刻が完全一致する候補だけを重複除去し、重なりを矛盾として失敗させる統合を実施
- 統合後: 非競合候補34件、17素材ブロック、16境界

全域DPと選択窓DPは対応番号の軸が異なるため、統合時に対応番号間の飛び量は作っていない。各候補の入力元は統合結果へ残した。

全域DPの自動生成レポートにある「確認済みペア再現」は、照合スクリプトが持つ過去用の固定比較診断であり、B素材の人間確認結果ではない。B素材の採否には使わない。

## 人間確認パッケージ

- `evals/clip_composition/outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/index.html`
- 素材ブロック結果: `evals/clip_composition/outputs/material-blocks-nOEWCNc77MI-20260710-full-plus-selected-union-v001.json`
- 素材ブロック説明: `evals/clip_composition/reports/material-blocks-nOEWCNc77MI-20260710-full-plus-selected-union-v001.md`

機械検証結果:

- HTML内の媒体参照448件、重複0件
- 欠落または空の参照ファイル0件
- 境界見出し16件
- 動画・音声160ファイル
- 再生時間が取得不能または0の媒体0件
- 過去fixtureの判定文言混入0件
- パッケージ容量222MB

アプリ内ブラウザーは安全規則によりローカル `file://` を開けなかったため、画面表示の目視確認は行っていない。HTML参照と全媒体の存在・再生時間は機械検証済み。

## 人間に確認してほしいこと

各境界で、次の3点だけを確認する。

1. 境界直前の切り抜きと元配信が同じ素材か。
2. 境界直後の切り抜きと元配信が同じ素材か。
3. その境界で元配信上の素材位置が実際に切り替わるか。

判断できない場合は無理に採用せず、`判定不能` としてunresolved候補にする。

回答形式:

```text
境界1: 前一致 / 後一致 / 切替あり・なし・判定不能 - 理由
```

16境界の確認後、正解区間から逆算した固定テーマを1行で指定してほしい。人間確認と固定テーマが揃った後に初めてfixture/expectedを凍結し、theme-llm-v002の範囲hit正式採点へ進む。
