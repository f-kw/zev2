# Liar's Bar candidate 59 最小一般化・案B差し替え設計 v001

- 日付: 2026-07-27
- 差し替え対象: 承認済み設計v001の§3「ファイル構成」と§4.6「残存発話への接続」
- 変更理由: candidate 13正式経路の「残存発話処理からproject fileを読み込まない」契約を維持したまま、candidate 59の間0件入力を同じ計算へ接続するため

## 1. 8コードfile

| # | path | 変更 | 役割 |
| ---: | --- | --- | --- |
| 1 | `evals/clip_composition/run_presentation_source_assembly_job_v001.mjs` | 新規 | `prepare-review`、`formalize`、`finalize-source`の3 actionだけを持つ入口1。新source系schemaを検査し、確認媒体、正式化、残存発話接続を担当する |
| 2 | `evals/clip_composition/test_presentation_source_assembly_job_v001.mjs` | 新規 | 間0件、文字の全件性、音響終端振り分け、確認媒体と正式区間の一致、新schema拒否条件を合成検査する |
| 3 | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` | 既存・限定修正 | 現在の残存発話計算を唯一の正本として維持し、adapter検査後の純粋計算を1関数だけ公開する。既存v001入口もその関数を呼ぶ |
| 4 | `evals/clip_composition/run_presentation_caption_gate_b5_initial_v001.mjs` | 新規 | 既存B5 v004のrequest構築を呼び、初回の`countTokens` 2回と版付きmanifest作成だけを行う入口2 |
| 5 | `evals/clip_composition/test_presentation_caption_gate_b5_initial_v001.mjs` | 新規 | request byte、通信各1回、再試行0、secret 0、候補固着なしを合成通信で検査する |
| 6 | `evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs` | 既存・限定修正 | candidate 13固定入口を薄いadapterとして残し、送信・B1受入・B4変換の既存正本処理を検査済みconfigからも呼べるようにする |
| 7 | `evals/clip_composition/run_presentation_caption_gate_b6_job_v001.mjs` | 新規 | B5/B3/B4の素材対応を通信前に検査し、既存B6本体を1回だけ呼ぶ入口3 |
| 8 | `evals/clip_composition/test_presentation_caption_gate_b6_job_v001.mjs` | 新規 | request byte同一、生応答先行保存、再試行0、不受理停止、合格時だけB4を合成通信で検査する |

独立した`presentation_retained_source_atom_pipeline_core_v001.mjs`は作らない。

## 2. 公開する純粋関数

既存`presentation_retained_source_atoms_v001.mjs`から、次の1関数だけを公開する。

`buildPresentationRetainedSourceAtomsBundleFromNormalizedV001(input)`

### 入力

両adapterが先に検査・正規化したplain objectだけを受ける。

- 成果物識別: artifact ID、candidate ID、文字粒度、source ref、source provenance、STT・candidate来歴参照
- 選択材料: candidate外側境界、正式segments、元STT順の文字列、発話まとまり、期待projection、組立・timeline・基礎映像の識別とSHA
- 生成来歴: job参照、実装来歴、既存role順の直接入力7件・展開入力7件、STT文字数

file I/O、入力schemaの分岐、媒体処理、VAD、時刻の丸めは行わない。入力objectも変更しない。

### 担当する計算

- 正式segmentsへ完全に含まれる文字の選択
- 部分交差、複数区間所属、空集合、順序・重複、期待projectionの検査
- 現行`source-atoms.json`、`generation-manifest.json`、`validation-report.json`の組み立て
- 現行の公開成果物検査と3 byte列の直列化

成功・失敗の形、違反code・path・順序、hash、直列化は現行処理から変えない。

### adapterの分担

- 既存v001入口: 従来job・従来gap manifest・従来roleを今までどおり検査し、従来の発話まとまりを正規化して純粋関数を呼ぶ。新schemaを受理しない。
- 新入口: 新source系5 schemaと`candidate-speech-manifest`を厳密検査し、間0件でも外側境界内の全STT文字を発話まとまりへ一度ずつ対応させて純粋関数を呼ぶ。旧gap manifestへの変換を作らない。

## 3. 維持する条件

- candidate 13既存処理のproject import 0件、実装束縛2件、処理結果projection、既存回帰を維持する
- 既存検査の期待値を変更しない
- 正本計算を複製しない
- candidate固有値をrunnerへ焼き込まない
- candidate 13の保存済み正式成果物treeを変更しない
- 行幅36と`normal-landscape-readable-pop-v001`を今回固定し、自由化を実証済みと扱わない

## 4. 停止条件

8コードfileを超える変更、4つ目の入口、契約改訂、既存検査期待値の変更、計算複製、candidate 13処理結果の変化、新音響閾値、または実装前提の不一致が必要になった時点で停止する。
