# candidate 59 縦型接続 B5自己監視停止報告 v001

- 日付: 2026-07-30
- 対象: `qdczJpv8RCc` candidate 59 / `speaker_only`縦型
- 到達点: 縦型B3正式package完成、B5通信前
- 結論: B5自身の作業directoryを上流改変と誤認するため安全停止
- 同一実行点の人間判断停止: 1 / 2
- Gemini Developer API通信: 0回
- API費用: US$0
- 人間作業: 次の修正方針を承認する1判断、1分未満

## 1. 完了したこと

横型2本の正式成果物を変更していないことを、既存のH01検査で再確認した。

- candidate 13 tree SHA-256:
  `2c68a23d126586b5e071848858edba637e79839bcb5d0906613d4398e9c62464`
- candidate 59 横型 tree SHA-256:
  `983763b52a60e10fd99126265e7178e4a600fd3024e00614f8abfcc90a724397`

続いて、縦型B3 packageを正式生成した。

- package:
  `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-vertical-v001/`
- package検査: 15 / 15合格、違反0件
- 入力: 281文字、2まとまり、行末候補164件
- 表示入力: 1行の論理幅14、最大2行
- format: `vertical-short-1080x1920`
- 画面型: `speaker_only`
- preset: `vertical-short-speaker-only-readable-pop-v001`
- package manifest SHA-256:
  `2ece4fe5335fa7a64f6fe56d801fe571f3feaaef137661cc26134b5815ed6d78`
- 意味入力 SHA-256:
  `28c6f6bf75e4798ed1582f64fde2d893eafa420cc6417fb293916deb5cbf988b`
- package検査報告 SHA-256:
  `581568832eb280a48f1b1d2fe42a33aa65ee1449ae22a2b512c21d846f20d8e6`

## 2. 通信前に見つかった問題

B5は、上流成果物が実行中に変わっていないことを確認するため、
`evals/clip_composition/outputs/presentation`全体の投影SHAを
開始時と正式公開直前に照合する。
除外されるのは、まだ存在しないB4静的検査jobのpath 1件だけである。

一方、B5の正式出力先は同じ監視rootの内側である。

```text
evals/clip_composition/outputs/presentation/caption-gate-b5/<jobId>/
```

現行B5 runnerは、投影を初めて照合する**前**に次を行う。

1. 正式出力先の隣に`<jobId>.work` directoryを作る。
2. その中へGoogle公式資料6件を複製する。
3. その後で、事前固定した上流投影SHAと現在値を照合する。

したがって、B5自身が追加した`.work`と6ファイルが監視値へ入り、
正常な実データでも事前固定値と必ず一致しない。
これは入力内容やGemini回答の問題ではなく、
作業場所と不変監視範囲が重なった工程間契約の不整合である。

既存の合成検査は上流投影処理を固定値を返すfakeへ差し替えているため、
実物の監視rootと`.work`を組み合わせたこの経路を検査していなかった。

## 3. 停止位置

不一致は最初の`countTokens`より前に起きる。
そのため、次は未実施である。

- Google公式資料snapshotの新規取得
- B5正式job作成
- `countTokens` 2回
- B6生成1回
- B1受入
- B4表示計画
- 縦型描画とQC

API keyは読み込んでいない。
秘密を成果物、log、stdout、報告へ保存していない。

## 4. 事実・推測・未確認

### 事実

- B5の監視rootは`evals/clip_composition/outputs/presentation`である。
- 監視から除外するのはB4静的検査job path 1件だけである。
- B5の`.work`は監視rootの内側に作られる。
- `.work`と公式資料6件の作成が、最初の監視値照合より先である。
- B3正式packageは合格済みである。
- 外部通信と費用は0である。

### 推測

- `.work`を監視rootの外へ移し、正式出力先だけを現在の場所へ
  directory renameすれば、上流監視を弱めず今回の自己干渉を解消できる見込みである。

### 未確認

- 修正後の実物上流投影を使うB5正常経路が全検査に合格するか。
- `countTokens`実測値、B6回答、B1/B4結果、縦型描画結果。

## 5. 推奨する最小修正

推奨は、B5の一時作業場所だけを監視root外の固定rootへ移す案である。

```text
evals/clip_composition/outputs/presentation-caption-gate-b5-work/<jobId>/
```

- 正式出力先は現在のままにする。
- 開始時・正式公開直前の上流投影照合は削除も緩和もしない。
- 完成した一時directoryだけを、現在の正式出力先へ一度renameする。
- B5 job、上流成果物、公式資料入力、費用計算、API要求byteは変えない。
- 実物の上流投影処理を使う正常系検査を追加し、
  B5自身の作業が監視値を変えないことを回帰にする。

想定する変更は次の2ファイルと、版付き追補1文書である。

1. `evals/clip_composition/run_presentation_caption_gate_b5_initial_v002.mjs`
2. `evals/clip_composition/test_presentation_caption_gate_b5_initial_v002.mjs`
3. 本件の作業場所と監視境界を固定する新規追補

監視側へ例外pathを増やす案は、除外の漏れ・拡大を生みやすいため推奨しない。
監視照合を削る案、作業後の値へ期待値を合わせる案は採用しない。

## 6. 承認依頼

> B5の一時作業directoryだけを上記の監視root外へ移す版付き追補と、
> runner 1件・検査1件の最小修正を承認してください。
> 実物投影を使う検査に合格した場合だけ、
> 中断中のB5 `countTokens` 2回から同じ承認済み連続工程を再開します。

