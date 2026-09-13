# ダイジェストv1 Phase 1 — 保持結果の読取adapter限定修正

## 受領した監査結果

2026-09-13、Microsoft Edgeの[ZEV進行管理３](https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4/c/6aa2c259-596c-83ee-8764-f7467a54c1f4)へ、checkpoint `cac1ec693ea6e4a08453c27fb82d93ffd0e8d791`をAUDIT_ONLYで提出し、応答の完了を確認した。モデル条件の指定はなく、現在の選択を維持した。更新・再送は行っていない。

判定は **Phase 0：PASS、Phase 1：CONDITIONAL PASS（限定修正1件）**。旧作業の復旧branchとbaselineの関係、全採用と後段の分離、時刻順整列・重複統合、保存済み字幕判断の再利用、renderer参照の訂正、検査結果と動画のbyte一致は適合とされた。

唯一の修正要求は、保持結果を読む旧経路が、候補間の重複を共通の整列・統合へ渡す前に拒否している点。保存済み完成字幕manifestへの依存は今回のPhase 1修正対象としない。

受領した限定修正指示：

1. ダイジェストv1専用の薄い読取adapterを追加する。
2. 候補ごとの保持判断の根拠、所属、本文全量対応、block順序、切断位置の検証は維持する。
3. 候補間の時間順・非重複を読取時の合否条件から外し、共通の整列・重複統合へ渡す。
4. 既存の保持resolver・Skill契約は変更しない。
5. 部分重複する候補を逆の入力順でadapterから通し、統合後も双方のIDと保持根拠を残す検査を追加する。候補内部の不正や不明ID、未解決切断位置は引き続き拒否する。
6. 追加検査、既存回帰、既存成功素材のC全採用、renderer・technical QC、既存完成版とのbyte比較を再実行する。完成MP4は引き続き `044bc61a6cd0034cc01d277f31e57c6a831e508ac179966cae29b3f3bb763a8c` と一致すること。
7. 限定修正をcommit／pushし、ZEV進行管理３へAUDIT_ONLYで再提出する。

Phase 2、新素材、新しい意味判断・推論、A/B、Goal、tag、main merge、v1完成へは進まない。

## 修正と検証

`evals/clip_composition/digest_v1_retention.mts`に専用adapterを追加し、実行設定の準備と実行時の入力読取の両方をこの入口へ接続した。旧候補採否経路の読取処理が行うファイル参照、正式IDとの対応、元動画・本文・音響根拠の照合を維持し、末尾の保持再構築を候補単位へ変更した。

元の保持requestとresponseのhash・回答内容を全体で照合してから、既存の保持検証と切断位置の解決へ候補単位で渡す。元の回答を書き換えたり、requestのhashを作り直して原本の代わりにしたりしない。解決後の保持区間と保存結果の完全一致も維持する。候補単位の正式な範囲をすべて得た後、共通の整列・重複統合へ渡す。

候補内部では、本文単位の欠落・重複・順序不正、未知ID、未解決の切断位置を拒否する。候補間の共有する本文単位・保持時間・入力順は、読取の合否条件にしない。既存resolver、Skill、Core、renderer、technical QCは変更していない。

追加検査1件では、検査専用の保存ファイル一式を作り、実際の読取入口から、B=[発話2,3]、A=[発話1,2]をB→Aの順で通した。保持区間は拒否されず、共通の統合後に発話1〜3の1区間となり、双方の候補ID・保持根拠が残った。同じ検査で、候補内部の欠落・重複、未知ID、未解決切断位置、request参照の不一致の拒否を確認した。検査専用ファイルだけを終了時に削除し、既存判断・成果物には触れていない。

検査は追加分を含む7/7、既存回帰32/32が合格。型検査出力は修正前と完全一致し、ダイジェストv1の4ファイルの診断0件、既存コードの21件を維持する。新版の実行設定 `evals/clip_composition/jobs/digest-v1/20260913-v003/job.json`、未使用出力先 `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v003/` でC全採用から再製造し、終了code 0で完了した。実行中に実装は変更していない。

検査出力：[追加7件](digest-v1-phase1-evidence-20260913/integration-v003.tap)、[既存回帰32件](digest-v1-phase1-evidence-20260913/regression-v003.tap)、[型検査](digest-v1-phase1-evidence-20260913/typecheck-v003.log)。

stage後の空白検査は、新adapter末尾の空行1件を指摘した。挙動に影響する差分ではなく、検査・再製造で参照した実装byteをそのままcheckpointへ保存するため、今回はこの空行を保持した。

## 再製造と比較結果

| 項目 | 結果 |
| --- | --- |
| 全採用した既存候補 | 3/3 |
| 最終保持区間 | 7 |
| 字幕 | 32件、415単位。既存の明示除外9単位を維持 |
| 映像 | 1920×1080、H.264、30fps、4,831フレーム、161.033秒 |
| 音声 | AAC、既存完成版とpacket内容一致 |
| technical QC | 指示反映・配置と可視性・メディア検査がすべて合格、違反0件 |
| 完成MP4 | 75,458,918 bytes、既存完成版と完全一致 |
| 基礎映像 | 78,398,378 bytes、既存完成版の基礎映像と完全一致 |
| 新しい意味判断・有料API・素材取得 | すべて0件 |

完成MP4のSHA-256は `044bc61a6cd0034cc01d277f31e57c6a831e508ac179966cae29b3f3bb763a8c`、基礎映像は `8c36b25a30e8acf5ac97475646092adeca5336d1c9a447dc9f2ffd0f7fd5ce2d`。実行終了後に新旧双方のファイルを読み直して照合した。修正前checkpointの再製造結果とも同じであり、今回の非重複素材の完成映像は変わっていない。

保持区間とフレーム、字幕の本文・時刻・改行・正式単位ID、32件の字幕描画画像とstyle、基礎映像byte、完成MP4 byte、音声packet、メディア仕様の8項目がすべて一致した。

結果：[実行log](digest-v1-phase1-evidence-20260913/execution-v003.log)、[実行結果](../../evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v003/verification.json)、[rendererとtechnical QC](../../evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v003/renderer-result.json)、[新旧比較](../../evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v003/existing-output-comparison.json)。

生成動画は `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v003/render/presentation-rendered-v002.mp4`。MP4と描画・検査用画像はローカルに保持し、remoteには実装、実行設定、検査結果、動画への参照とhashを保存する。

## 再監査へ提出する範囲

branchは `codex/digest-v1`。前回checkpoint `cac1ec693ea6e4a08453c27fb82d93ffd0e8d791`からの差分として、薄い読取adapterの追加、実行入口の接続変更、追加検査1件、実行説明と本報告、今回の実行設定・検査出力・最終結果を監査checkpointへ固定してpushする。対象は33ファイル（実装2、検査1、説明・報告2、実行設定2、検査出力4、最終結果22）。旧validator・Skill・Core・renderer・QC、開始時のbaseline所属ファイルは変更していない。

Phase 0のbaselineは `0a4c28419ec952453f3eadc7cdc1d4c642abf012`、復旧branchは `recovery/pre-digest-v1-reset-20260913`、復旧commitは `ed83e848eab5e81c1541515a459f5fa4de99641d`のまま。旧作業の保全範囲とPhase 0の検証は[初回報告](digest-v1-phase1-checkpoint-20260913.md)に記載した。

相談役の指摘であった候補間重複の読取制約は、実際の保存ファイル入口から共通の統合まで通る検査で解消を確認した。保存済み完成字幕manifestに依存する入口、新素材の候補・保持・字幕判断の準備、A/B接続、尺制御は今回の修正対象外。新素材まで実証したとは扱わず、Phase 2の着工は別の指示を待つ。

ZEV進行管理３へAUDIT_ONLYで再提出し、今回の限定修正とPhase 1 checkpointの適合性を確認する。人間の新しい目視判定、v1完成承認、main merge、tag、stable、releaseは行っていない。
