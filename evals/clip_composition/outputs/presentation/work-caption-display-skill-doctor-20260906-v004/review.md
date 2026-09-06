# 字幕表示の比較 — 人間レビュー待ち

[補助のHTML比較画面](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-caption-display-skill-doctor-20260906-v004/review.html)

同じ本文・映像・音声・場面順・表示規約で比較します。この資料内で2本を再生できます。補助のHTMLには並列再生と元動画の区間再生を用意しています。

## A: Skillなしの既存完成版

![Skillなしの既存完成版](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/distant-connection-presentation-execution/candidate-doctor-disappearance-to-ogre-mother-v001/render-output-v001/presentation-rendered-v002.mp4)

## B: Skill使用版

![Skill使用版](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-caption-display-skill-doctor-20260906-v004/render/presentation-rendered-v002.mp4)

## HUMAN_DECISION

- Skill使用版の方が見やすいか。（良い・同等・以前の方が良い・保留）
- 意味上、不自然に切れた字幕はあるか。（なし・あり・保留）
- 字幕の出方が、動画の気持ちよさを損なっていないか。（保てている・損なっている・保留）

人間の評価は未判定です。気になった場合は再生時刻を添えてお知らせください。technical QCの合格とは別に判断します。

[実装と検証の詳細報告](/Users/kawafmm/workspace/zev2/docs/reports/caption-display-skill-minimal-e2e-20260906-v001.md)

## 既存入力と元動画

- [字幕を重ねる前の2場面の映像](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/base-media/distant-connection-candidate-doctor-disappearance-to-ogre-mother-audio-grid-v003/base-media.mp4)
- [元動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4)
- 対象区間: 前半28:44.755–28:59.800、後半1:34:53.397–1:35:14.097。
