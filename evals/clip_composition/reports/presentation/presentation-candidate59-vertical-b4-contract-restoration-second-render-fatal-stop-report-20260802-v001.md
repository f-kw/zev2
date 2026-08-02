# candidate 59 縦型 B4契約復元後・第2正式描画 fatal停止報告 v001

日付: 2026-08-02  
対象: `qdczJpv8RCc` candidate 59 縦型一本

## 結論

B4表示計画の来歴欄を、承認済み契約どおりの3項目へ戻す修正は成功した。検査、横型不変確認、正式B4生成、縦型描画入力15件の解決まではすべて合格している。

その後、正式縦型レンダラーを新しい版付きjobで1回だけ実行したところ、内側の段階を示さない固定`fatal`、終了コード2で再び停止した。完成mp4、描画後QC、目視確認媒体は生成されていない。同じ正式描画地点で2回目の人間判断停止となったため、追加修正・再試行・第三の局所patchは行わず、描画計画をkawafmmへ戻す。

## 事実

### 1. 実装前の契約照合

- 承認済みB4表示計画契約は、意味検査報告の来歴を`path / fileSha256 / canonicalSha256`のexact 3項目と定義している。
- 直前のB4 v001実装は、B6来歴の`byteLength`を含む4項目をそのまま表示計画へ複写していた。
- レンダラーを4項目対応へ広げると承認済み契約の緩和になるため実施しなかった。
- B4生成側で、正式な3項目だけを明示的に出力する修正へ訂正した。後方互換、変換fallback、4項目と3項目の両対応は作っていない。

### 2. 変更範囲

- B4表示計画生成処理1件を修正。
  - path: `evals/clip_composition/presentation_caption_display_pair_v004.mjs`
  - SHA-256: `9b93619c1285dca5bd66ff07bd762ea6235b66cec9c215260f95174689370e17`
- B4検査1件を修正。
  - path: `evals/clip_composition/test_presentation_caption_display_pair_v004.mjs`
  - SHA-256: `08946e314868f3ab29305bddf6314929fc15ec3ef7915a2b5fbd622db5550e7d`
- 縦型レンダラー本体、描画アルゴリズム、プリセット、crop、B1内容検査、横型成果物は変更していない。
- 縦型レンダラー本体SHA-256: `b9f35e6a17a060286139367e2ffedcd3378239f47e74e4c178fea00659d67f54`

### 3. 検査結果

- B4検査: 13/13合格。
- 縦型レンダラー検査: 21/21合格。
- 横型統合回帰: H01〜H06、6/6合格。
- candidate 13横型tree SHA-256: `2c68a23d126586b5e071848858edba637e79839bcb5d0906613d4398e9c62464`。
- candidate 59横型tree SHA-256: `983763b52a60e10fd99126265e7178e4a600fd3024e00614f8abfcc90a724397`。
- 上記2つの横型tree SHAは正式描画失敗後にも一致した。

### 4. 正式B4 v002

- job:
  `evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002.json`
- job SHA-256: `996be8fe37706fbe9da57bfa5ba4a8e209ab4bc29605f2a51954294109399561`。
- 読み取り専用preflight: 9/9合格。
- 正式実行: 1回、終了コード0。
- 状態: `passed_pending_human_review`、違反0件、9/9合格。
- 281文字、2発話まとまり、30意味まとまり、30字幕、51行。
- 最大論理幅14、上限14、最大2行、正の時間重なり0件。
- `speaker_only`、正式speaker-onlyプリセット、crop v006、基礎映像の対応は一致した。
- 表示計画の意味検査報告来歴は、正本どおり`path / fileSha256 / canonicalSha256`の3項目であり、`byteLength`は含まない。
- 旧B4 v001成果物と第1描画fatal証拠は上書きせず保持した。

正式B4成果物:

- `caption-check-report.json`: `08cd3a4106e4bfdcbf0f8943718a02ae067e00892160c2dc468cb1bbbc925436`
- `display-plan.json`: `05feabbbbc75407239b96f9f341ca9b5130a7f8ac30d6e944d68352a462fe678`
- `instruction-bundle.json`: `244d844ed8fee10a70b7aa664e87be1b6d1ceb3258584b3764d6b442ccdce318`
- `layout-preflight.json`: `cd1a551dd846a4fd08e85e1db1e14e2ea04730e32f0b8f8f81c571c4ffc98265`
- `pair-generation-manifest.json`: `9fe6ca703551f0f8131d2724f657b8c0f78e99125373cec14c2b64f3c62ce3e6`
- `pair-validation-report.json`: `554addac430921e3dcea318d584f520831f2a17c1bd14c445ba7cf8f8d60c0db`
- `review-render-request.json`: `5eb6830dd3ff3bda70daecd8d0d691fa0e59b726cc13254eab06f9d0bc3d0985`

### 5. 第2正式縦型描画

- render job:
  `evals/clip_composition/outputs/presentation/vertical-review-render-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002.json`
- render job SHA-256: `055a14e3fe0daa4b9aef6e5d3ce43ba77c1542e50bd660a134468c5105e0c90e`。
- 実行前確認: 競合する関連processなし、出力先未使用。
- 読み取り専用preflight:
  - job schema合格。
  - 実装束縛29/29一致。
  - 実行tool実体7/7一致。
  - 入力15/15解決。
  - 表示計画の来歴3項目を含む全入力、crop、基礎映像、プリセット、font・licenseの照合に合格。
- 正式実行: 1回。
- 終了コード: 2。
- 出力は固定された外側fatalだけだった。
  - schema: `presentation-formal-runner-fatal-v001`
  - code: `VERTICAL_RENDER_V001_RUNNER_FATAL`
- 生出力:
  `evals/clip_composition/outputs/presentation/diagnostics/qdczJpv8RCc-candidate-59-vertical-render-fatal-20260802-v002/renderer-output.raw.json`
- 生出力SHA-256: `f23ce48d77560e9bb3fd9b468fd0423478d8ba30029f313710bde5d2c94cf231`。
- 第1描画fatalの生出力と第2描画fatalの生出力はbyte同一であり、この固定外形から停止段階の違いは読めない。
- 正式render出力directory: 未生成。
- 完成mp4: 0本。
- 描画後QC: 未実行。
- 再試行: 0回。

### 6. 費用・公開・記録

- 今回の外部API通信: 0回。
- 今回の追加費用: US$0。
- 既存2 attemptの使用量ベース累計見積り: US$0.1235145（表示上US$0.1235）。
- 実請求額: 未確認。
- commit、tag、JOURNAL、HANDOVER更新、安定点化は行っていない。
- 正式job内のGit commit欄は実行時HEADを記録するが、今回の2ファイル修正自体は未commitである。正式jobは各実装fileの実byte SHAで今回の実体を別途束縛している。実装済みcommitがあるとは主張しない。

## 推測

なし。B4契約不一致は解消しており、正式レンダラーの全入力解決も合格した。しかし外側fatalは、その後のどの段階で停止したかを示さない。crop実行、描画計画の実行、Remotion、QC準備、公開処理のいずれかへ原因を推測で割り当てない。

## 未確認

- 第2正式描画の内側の停止段階と原因。
- 実crop、字幕焼き込み、Remotion描画が開始されたか。
- 完成mp4の見た目・聴こえ方。
- 描画後QC 6項目。
- 実請求額。

## 停止回数と次の判断

- 同じ正式縦型描画地点での人間判断停止: 2/2。
- ZEV憲法に従い、3回目の局所patchや正式描画再試行へ進まない。
- 次に必要な人間判断は1件だけ: **正式描画を再実行せず、保存済みjobと入力から内側の停止段階を読む診断・観測性の再設計へ計画を戻すか**。
- 人間作業見積り: この方針判断1件、1分未満。診断自体は人間作業0件、API通信0回、費用US$0で設計可能。
