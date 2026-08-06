# 字幕改行基準 改訂・再描画完了報告 v001

日付: 2026-08-06  
対象: `qdczJpv8RCc` candidate 59、意味／表現分離の初回実データ横型・縦型

## 人間確認から確定した基準

- crop・音声・終端は合格として維持する。
- 1行で収まる本文は、横に長く見えても改行しない。
- 1行では物理的に収まらない本文だけを改行する。
- 必要な改行の中では、既存の幅の釣り合い・意味atom境界・決定性を維持する。
- 読みやすさの最終判定は人間目視とする。

## 実装した変更

表示候補の選択順を、`page数最少 → 総行数最少 → 最大行幅 → 幅の釣り合い → 決定的境界順`へ変更した。従来の「同じpage数なら2行を優先する」選択は廃止した。schema、意味情報、時刻、幅計算、preset、crop、音声処理は変更していない。

planner実体SHA-256: `febb8c489db4585369d1d77f9cdcca02fe591cc83ceeae309896ad3e37f95262`

## 検査結果

- planner検査: 27/27合格。
- 正式出力・描画回帰: ネイティブ環境で33/33合格。
- 1行候補と2行候補が両方存在するとき、1行を選ぶことを検査した。
- 縦型で論理幅14以下に見えても2行となる5ページは、同じ本文の1行候補が実フォント・縁・光彩・安全領域の物理検査を通らないことを確認した。
- 制限環境での描画回帰5件はChromium起動制約で不合格、同じ検査のネイティブ実行は33/33合格。production不合格としては扱わない。
- 検査期待の組み替え中に生じたtest-only不合格attemptは版付きで保持し、最終attemptだけを合格根拠にした。

## 新しい横型確認動画

- path: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003-output/presentation-output-rendered-v001.mp4`
- SHA-256: `175dc67489e86b2fc364894a737693a14a9c7c27fab492c0cb1873aedd6a77bc`
- 1920×1080、30fps、1,547 frame、51.566667秒。
- 31 caption、31 page、31 line。1行31 page、2行0 page。最大論理幅32／上限36。
- QC: 合格。音声2ch・48kHz、2,475,200 sample。

## 新しい縦型確認動画

- path: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002-output/presentation-output-rendered-v001.mp4`
- SHA-256: `eeb72350373be88022966059f09cd9b3f474a005ffa3cc18db8417eafdaa9618`
- 1080×1920、30fps、1,547 frame、51.566016秒。
- 31 caption、38 page、61 line。1行15 page、2行23 page。最大論理幅12／上限14。
- QC: 合格。音声2ch・48kHz、2,475,200 sample。

## 不変確認

- 意味情報package、基礎映像、横型style、縦型style、crop applicationは旧版と同一binding。
- 音声packet payload SHA-256は両形式とも `d18469bd3132356b03870ee8bc3d63e95947bd254961157e09d59cf9a53459ec`で一致。
- 旧横型mp4 SHA-256 `c324de226a63397fb83eba13b341b96aa17963bc9c1d49bd5a66987dc8338aa1`、旧縦型mp4 SHA-256 `e1e3c14e73b511b7cadf24ca2cc71592eff60216168b91d25c7bbb31f0c3c58d`は不変。
- API通信0回、追加費用US$0。
- 正式runnerが安全保持対象として返した横型約988MB・縦型約1.2GBのQC workとlockは削除していない。

## 未確認

新しい2本の読みやすさは、まだkawafmmの目視認定前である。機械合格を人間の読みやすさ合格とは扱わない。
