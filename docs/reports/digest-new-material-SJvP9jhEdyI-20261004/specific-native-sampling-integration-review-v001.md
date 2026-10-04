# Fadeと代表native samplingの独立読取レビュー

2026-10-04T14:48:12.761293+00:00。HEAD `3940cb6e015248fce8ae22bfbf5149f623e11510`。製品3pathの現在snapshotです。

読取範囲で重大な未解消問題は見つかりませんでした。今回の配線はrenderer・QC・shared completionの3path内で、技術証拠の保存からpending/get/record-only finalizeまでつながります。Core・caller・runner・finalizerの追加製品変更は必要ありません。実動作成功の判定ではありません。

## 保護と範囲

全primary画像と実alpha/bounds検査は維持します。省くのは非代表repeatと、代表・必須配置のunion外の行マスクです。今回の8代表/14maskは選択と行数から導出する値で、一般既定ではありません。top-band/panelは非代表でも全calibration→props補正→primary→補正後line masksを維持します。全primaryを使う時間・空間衝突検査は従来どおりです。

coverageは全plan順のprimary SHA、repeatのperformed/not-executed、各maskの実SHA/6field bounds、calibrationとplan/policy/job/auth/codeを束縛します。専用QCは`passed-representative-rules`、visibilityは`passed-representative`とし、通常のfull passedと区別します。generic full入口のmask必須条件はprivate scopeなしのままです。

sharedは実finish→verification/technical→pending再構築→get→record-only再資格化に同じcoverageを伝えます。samplingの状態・証拠が残るのにcoverageが欠けるものは拒否します。旧coverageなしはstrict fullとして残します。公開MP4/全primary PNGの実SHA検査、private資格、元音声と未実施fullVisibilityの区別も維持します。

## 指摘と解消

1. 代表かつspecial placementのmask scopeが代表優先だった箇所は、required-placement優先へ修正を読取確認しました。
2. 初期completed readerが通常callerに存在しない`execution.result.applicationResults`を参照していた箇所は、actual finishで保存する`existingRuleEvidence.applicationResults`を読む修正で解消しました。これによりcallerの追加変更は不要です。

## Fadeと旧経路

短いcaptionのfade幅は`min(4,ceil(displayFrames/2))`。1〜6frameでも最大不透明度へ到達し、7frame以上は元の4frame式を保つ算術です。positive integer clockとの一致を要求します。既存MP4やreceiptの書換えはありません。旧saved-work resumeは新coverageを生成しないためfull mask再検査を維持しており、新8/14へ自動切替する変更ではありません。

## 未評価

こちらのtests、媒体処理、651描画、合成、音声診断、旧動画評価は0。実private sampling finish/pending/get/finalizeの跨process成功と速度・resource samplegapは未評価です。担当の小回帰報告は親が統合し、この読取をテスト合格の代用にしないでください。

- `/Users/kawafmm/workspace/zev2/evals/clip_composition/render_presentation_v002.mjs` — SHA `7e5689338e711e99e9119f7f516891326b4b032aad1d136541fbb99bca627830`, 167214B。
- `/Users/kawafmm/workspace/zev2/evals/clip_composition/presentation_renderer_qc_v002.mjs` — SHA `39b2dcb042a705cf8adee457c509b6aef5f31b96ccdfc74f3d18132ce214a161`, 59624B。
- `/Users/kawafmm/workspace/zev2/evals/clip_composition/digest_representative_completion_v001.mjs` — SHA `babcda0b0d129bacc049d2e0e756bcd2eb9afdf0e34713db4540f79e4e80a831`, 46709B。

正確なmarker別行番号は同名JSONのcodeBindingsへ記録しました。
