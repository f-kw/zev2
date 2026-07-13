# candidate-ranking-v001 title/reason run 1 事前登録

登録日: 2026-07-13

## 実走

- 対象: B素材89候補、第二素材60候補
- run: 各1回
- 生成系統: `candidate-ranking-v001@gemini-web-flash`
- 単変数: 候補順位をtitle/reasonの意味判断で決めること
- 人間作業: 0件・0分

## 入力契約

モデルへ渡す候補データは次の3項目だけ。

- candidateId
- title
- reason

時刻、根拠範囲、transcript本文、発話ID、チャット流速、笑い密度、配信内位置、expected、照合結果は渡さない。candidateIdは出力を元候補へ対応させる参照で、意味判断用の特徴ではない。

## 出力契約と形式検査

- 上位5件ちょうど
- rank 1〜5に重複・欠落なし
- candidateIdに重複なし
- 入力に存在するcandidateIdだけ
- 各候補に1文の選定理由

違反出力は内容を補正せず形式不成立とする。

## 採点

- 主指標: 既知hit候補が上位5へ入った数
- 補助: 上位5が被覆したexpected数
- 比較: 生成順、チャット流速、根拠範囲長、笑い密度、配信内位置の単独信号

非hit候補は誤りに数えない。上位5へ入った非hit候補をtitle、元のreason、Geminiの選定理由付きで「未ラベルの発見」として一覧化する。意味的な良否の人間監査は今回行わない。

## 実行制約

- Web GeminiはEdge CDPを使う。
- 出力保存後、その実行で開いたGeminiタブを閉じる。
- fixture、expected、confirmedペアは変更しない。
- 本体側は変更しない。
