# presentation-base-media-build-v001 synthetic testdata

このディレクトリは、基礎映像生成器の合成検査専用である。

- 教師動画、fixture、expected、人間確認済み媒体は使わない。
- `basis-edit-plan.json`は来歴hash照合用の人工編集案である。生成器は実JSONの`kind`が宣言どおりかを検査するが、区間をここから読み直さない。
- 人工映像、人工音声、承認済み組立決定、jobはtest実行時にこの配下へ作り、終了時に削除する。
- 人工mediaは1920x1080の短い色面と人工周波数だけを持つ。
