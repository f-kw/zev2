# 境界モーション確認パッケージ

- 目的: 静止画では判別しにくい境界を、動画の動きと音声で確認する。
- 左画面/左音声: clip
- 右画面/右音声: source
- 判定は人間が行う。confirmedペア、fixture、expected、照合ロジックは変更していない。
- HTML index: `../outputs/boundary-check/r_ztjHaHmcg/20260706-final-block-boundary-motion-v001/index.html`

## 見方

1. 開始は `開始 新仮説` と `開始 旧ペア` を見比べる。
2. 同じ言葉が同じタイミングで始まり、口の動きと音が自然に重なる方を開始候補として見る。
3. 終端は `終端 旧ペア` と `終端 新仮説` を見比べる。
4. clip終端直前の言葉がsource側のどちらの終端直前と一致しているかを見る。
5. `終端 新補助` は、source最終語が長いため、開始位置確認用の補助として見る。

## 動画一覧

| 比較 | clip窓 | source窓 | 動画 |
| --- | ---: | ---: | --- |
| 開始 新仮説: clip 1:27.475 / source 39:59.621 | 1:25.475-1:29.475 | 39:57.621-40:01.621 | `../outputs/boundary-check/r_ztjHaHmcg/20260706-final-block-boundary-motion-v001/videos/start_new_pair_pm2s.mp4` |
| 開始 旧ペア: clip 1:32.555 / source 40:04.730 | 1:30.555-1:34.555 | 40:02.730-40:06.730 | `../outputs/boundary-check/r_ztjHaHmcg/20260706-final-block-boundary-motion-v001/videos/start_old_pair_pm2s.mp4` |
| 終端 旧ペア: clip 2:01.147 / source 40:33.322 | 1:57.147-2:01.147 | 40:29.322-40:33.322 | `../outputs/boundary-check/r_ztjHaHmcg/20260706-final-block-boundary-motion-v001/videos/end_old_pair_end_aligned_4s.mp4` |
| 終端 新補助: clip 2:01.147周辺 / source 40:36.085周辺 | 1:59.147-2:03.147 | 40:34.085-40:38.085 | `../outputs/boundary-check/r_ztjHaHmcg/20260706-final-block-boundary-motion-v001/videos/end_new_last_word_start_pair_pm2s.mp4` |
| 終端 新仮説: clip 2:01.147 / source 40:40.868 | 1:57.147-2:01.147 | 40:36.868-40:40.868 | `../outputs/boundary-check/r_ztjHaHmcg/20260706-final-block-boundary-motion-v001/videos/end_new_pair_end_aligned_4s.mp4` |

## 確認ポイント

- 開始が新なら、clip 1:27.475 / source 39:59.621 の動画の方が自然に同期する。
- 開始が旧なら、clip 1:32.555 / source 40:04.730 の動画の方が自然に同期する。
- 終端が旧なら、clip 2:01.147直前の発話がsource 40:33.322直前と合う。
- 終端が新なら、clip 2:01.147直前の発話がsource 40:40.868直前と合う。
