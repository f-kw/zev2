# candidate 13 基本テロップ B4 v003契約core不足による実装前停止報告v001

- 作成日: 2026-07-25
- 状態: **実装前停止**
- 基準commit: `cfa558ab`
- 承認済み正本:
  - `presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md`
  - `presentation-candidate13-caption-gate-b4-implementation-contract-addendum-20260725-v001.md`
- B4コード変更: 0件
- testdata変更: 0件
- job生成: 0件
- 合成検査: 0 / 85件
- 既存回帰: 0 / 95件
- candidate 13 preflight: 0件
- B5/B6、Gemini、正式変換、描画: 0件
- 安定点tag、JOURNAL: 追加なし
- 人間作業: 次の契約整備方針の判断1件。動画視聴、時刻入力、時間計測はなし

## 1. 結論

B4実装を始める直前の正本・実体照合で、承認済み実装束縛が必須とする次の二つの実体が存在せず、pathも固定されていないことを確認した。

1. `captionCoreV003`
2. `instructionCoreV003`

元設計は`dependencyFiles`の3・4番目として両roleを必須化し、B4成果物には次の新しい契約版を要求している。

- `presentation-caption-check-v003`
- `zev-presentation-instruction-v003`
- `presentation-resolution-package-v003`

しかし、リポジトリに存在する実装はcaption v001/v002、instruction v001/v002だけであり、v003の実装fileは存在しない。

この状態で進むには、実装者が次のいずれかを新たに選ぶ必要がある。

- v003用の別coreを二つ新設する。
- B4 display pair coreの内部へv003検査を実装し、同じfileを複数roleへ束縛する。
- v002検査へ一時的に写して結果をv003として扱う。

どれも承認済み追補から一意に導けない。特にv002流用は、後方互換・暗黙変換・fallback禁止に反する。夜間停止条件の「設計にない契約解釈が必要」に該当するため、コード、testdata、jobを作る前に停止した。

## 2. 実体照合

### 2.1 存在を確認できた依存処理

| role | 実在する既存file |
|---|---|
| `semanticCore` | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` |
| `semanticRunner` | `evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs` |
| `sourceSpeakerPolicy` | `evals/clip_composition/presentation_source_speaker_policy_v001.mjs` |
| `timelineV002` | `evals/clip_composition/presentation_base_media_timeline_v002.mjs` |
| `layoutPreflightCore` | `evals/clip_composition/inspect_presentation_preset_layout.ts` |
| `rendererLayoutCore` | `runner/src/telop/telop-render-model.ts` |

registry 4件は、正式な信頼bindingが指す既存成果物をjobへ固定する契約であり、既存正式成果物から導出できる。

### 2.2 存在しない依存処理

| 必須role | 期待される契約版 | 実体 |
|---|---|---|
| `captionCoreV003` | `presentation-caption-check-v003` | fileなし、path未固定 |
| `instructionCoreV003` | `zev-presentation-instruction-v003` / `presentation-resolution-package-v003` | fileなし、path未固定 |

`git ls-tree -r HEAD`とworkspace filesystemの双方で該当実装が無いことを確認した。

### 2.3 既存v002を代用できない理由

既存caption v002は`presentation-caption-check-v002`だけを受け付ける。既存instruction v002は次だけを受け付ける。

- `presentation-instruction-check-v002`
- `zev-presentation-instruction-v002`
- `presentation-resolution-package-v002`
- caption contract `presentation-caption-check-v002`

B4が作るv003 bundleをv002へ通すには、schema名と構造をv002へ写し、結果をv003へ戻す変換が必要になる。これは承認済み正本が明示的に禁止した「v002からv003への暗黙変換」と「v003不成立時のv002 fallback」に当たる。

## 3. 追補の完全性チェックで残った経路

B4実装契約追補は、正式なB4 core、runner、preflight runner、test、testdataのpathを固定した。一方、元設計§12.2の`dependencyFiles` 12roleについては、role名と順序を継承しただけで、全roleを具体的な実在file pathへ解決していなかった。

追補§14で追加した「参照解決」は、

> 再利用するroleは具体file pathとexport名まで解決される

と定義していたが、追補自身の自己適用で`captionCoreV003`と`instructionCoreV003`を実体へ解決できていない。したがって、追補§14.3の「参照解決済み」という自己申告と実体が食い違っていた。

今回の停止は、追補で追加した完全性チェックが実装前の現物照合まで実行されていれば承認前に検出できた型である。

## 4. 独自判断で採らなかった案

### 4.1 v002代用

不採用。後方互換禁止、暗黙変換禁止、v003の別正式入口という契約に反する。

### 4.2 B4 coreへの内包

未採用。技術的には実装可能だが、`dependencyFiles`で別roleとして束縛する意味、productionと検査が共有するv003検査入口、将来の契約改訂単位が変わる。承認済み設計から自動的には選べない。

### 4.3 v003 core二件の新設

推奨候補。ただし、次を先に設計で固定する必要がある。

1. 正式file pathと公開export。
2. v003で検査するexact shapeと違反集合。
3. caption・instruction・resolutionの担当境界。
4. B4 core、合成検査、将来rendererが同じ入口を使うこと。
5. v002との非互換と、変換・fallbackを作らないこと。
6. B4の69違反へ、v003内部違反をどう畳み込むか。
7. 既存24/27/10件の回帰と新v003検査の関係。

これはB4本体の正式byteと合否を決める新しい契約実装であり、実装者判断で追加しない。

## 5. 停止時の状態

- 承認済み追補commit `cfa558ab`からB4実装fileは作っていない。
- 合成85件を一度も実行していないため、不合格を修正して再試行した事実もない。
- 既存回帰95件、candidate 13 preflightも未実行。
- B4正式pair、lock、work、preflight reportを生成していない。
- B3正式7ファイルを変更していない。
- B5 prompt、費用、B6 Gemini、B7正式変換、描画へ進んでいない。
- B4完了の3条件を満たさないため、安定点tagとJOURNAL entryを追加しない。

## 6. 再開に必要な判断

推奨は、`captionCoreV003`と`instructionCoreV003`を別fileとして新設する版付き実装契約追補を先に起草すること。

承認依頼文案:

> B4実装前照合で、必須依存role `captionCoreV003` と `instructionCoreV003` の実体・path・公開入口が未定義であることを確認した停止を承認する。v002の代用・暗黙変換・fallbackは行わない。v003 caption契約coreとv003 instruction/resolution契約coreを別fileとして新設する実装契約追補の起草を承認する。追補は正式path、export、exact schema、内部違反、B4の69違反への帰属、同一入口検査、既存回帰との関係、非互換を固定し、提示後停止する。承認前にコード、testdata、job、検査を作らない。
