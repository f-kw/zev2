# 境界入力シグナル方針

- 結果JSON: outputs/boundary-signal-policy-20260705-v001.json
- fixture数: 2

## 目的

composition評価で、発話途中の境界を扱うために入力へ足してよい情報と、正解漏えいになる情報を分ける。
このレポートはSTTもLLMも実行しない。

## IMQYaT_RWRA_context_v001

- 文字起こし: fixtures/IMQYaT_RWRA_context_v001/transcript.json
- 期待値: expected/IMQYaT_RWRA_context_v001.json
- 現在入力だけでexpected境界を表現できるか: yes

### 境界

- start: 1997050ms / segment_start / 現在入力で表現可能 / 発話1 1997050-1997322ms「い」 / 現在のprompt入力に発話開始時刻として入っている
- end: 2015672ms / segment_end / 現在入力で表現可能 / 発話32 2012431-2015672ms「笑」 / 現在のprompt入力に発話終了時刻として入っている

### 入力シグナル方針

- allowed: 固定テーマと文字起こしの発話開始・終了時刻 / theme失敗とcomposition失敗を分けるための固定入力で、現在の評価promptが読む主入力
- eval_only_forbidden: expectedCutsの開始・終了時刻 / 採点基準そのものであり、composition入力へ入れると正解漏えいになる
- eval_only_forbidden: Web版Geminiの左右映像確認結果 / 正解fixtureの品質保証で使う情報であり、promptの候補選択入力ではない

### 次の作業

- 現在の発話境界入力だけでexpected境界を表現できるため、compositionプロンプト比較を続けられる。

## UpRyakf5j80_clip_audio_v001

- 文字起こし: fixtures/UpRyakf5j80_clip_audio_v001/transcript.json
- 期待値: expected/UpRyakf5j80_clip_audio_v001.json
- 現在入力だけでexpected境界を表現できるか: no

### 境界

- start: 11364500ms / inside_segment / 追加入力が必要 / 発話1 11362439-11366760ms「香りどうもありがとうございます」 / 期待境界は発話途中にあり、現在のprompt入力にはその途中時刻を支える単語境界や音声境界がない
- end: 11407178ms / inside_segment / 追加入力が必要 / 発話20 11405460-11409170ms「うん」 / 期待境界は発話途中にあり、現在のprompt入力にはその途中時刻を支える単語境界や音声境界がない

### 入力シグナル方針

- allowed: 固定テーマと文字起こしの発話開始・終了時刻 / theme失敗とcomposition失敗を分けるための固定入力で、現在の評価promptが読む主入力
- required_next: ローカルSTTの単語時刻または独立に生成した音声境界候補 / 期待境界が発話途中にあり、発話単位だけでは境界を支える情報が足りない
- eval_only_forbidden: expectedCutsの開始・終了時刻 / 採点基準そのものであり、composition入力へ入れると正解漏えいになる
- eval_only_forbidden: 音声比較で確定したbestAlignedSourceStartMs / bestAlignedSourceEndMs / 既存切り抜きとの照合で得た正解区間なので、通常のcomposition評価入力には入れない
- eval_only_forbidden: Web版Geminiの左右映像確認結果 / 正解fixtureの品質保証で使う情報であり、promptの候補選択入力ではない

### 次の作業

- v009でpromptだけを調整する前に、ローカルSTTの単語時刻または独立した音声境界候補をfixture入力として追加できる形にする。expectedの時刻や音声比較で確定した正解区間は入力へ入れない。
