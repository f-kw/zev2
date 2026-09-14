# ダイジェストv1 Phase 2 — オーナー判断による全件最終可視性検査の中止

2026-09-14 JST。**必要な技術確認が合格し、Phase 2 human-review candidateとして完成動画を視聴できる状態になった。** 正式字幕325件、既存raster325/325、字幕282の完成MP4反映1/1、通常MP4検査がPASS。字幕ごとの全timeline再符号化はproduction QCとして不要と判断して設計から外した（removed from production acceptance; not required）。[視聴候補と検査結果](digest-v1-phase2-human-review-candidate-20260914.md)を現在地とし、次工程はkawafmmの実動画視聴とする。人間品質は未評価、完成承認は未申告。以下は過去の製造・停止判断の履歴として保持する。

2026-09-14 JST。kawafmmの **STOP CURRENT FINAL VISIBILITY QC** に従い、325字幕を1件ずつ除外して再符号化する検査を中止した。対象processはすべて終了している。主合成済みMP4と配置・画像検査の全件合格は有効な成果として保持した。動画や画像、work、lock、過去の証拠を削除・上書きせず、自動cleanupも行っていない。

状態は **render-completed / raster-qc-passed / exhaustive-final-visibility-qc-stopped-by-owner**。最終可視性検査の全件完了とは扱わない。人間品質は未評価、完成承認は未申告。

## 中止判断と対象

kawafmmは「現行方式では完了まで100時間以上かかる見込みであり、Digest v1の完成工程として実用的でない」として中止を指示した。この所要時間見込みはオーナーの判断として記録し、今回Codexが独自に算出した見積りとは扱わない。

中止対象は、字幕ごとの比較用符号化、代表フレームの復号、最終画素差比較。既に正常終了した主合成を無効化する指示ではない。94px style、全325件の配置・実画像QC、独立再描画の一致、保存後byte照合、主MP4とSHA、完了済みの比較とprocess log、work directoryとlock、静的同値性診断、過去の停止・診断証拠を保持する。

## 停止時の件数

| 区分 | 件数 |
| --- | ---: |
| 対象字幕 | 325 |
| 最終画素差比較まで完了 | 6 |
| 完了6件で正の画素差を確認 | 6 |
| 実行中に中止 | 1 |
| 未着手 | 318 |
| 未完了の合計 | 319 |

実行中だったのは字幕7、正式ID `digest-v1-phase2-20260913-v001-bridge-caption-000007`、対象は547フレーム目。比較用の部分画像が保存されていても、最終画素差比較が完了していないため合格には含めない。完了6件の比較用符号化とフレーム抽出は終了0・signalなし。画像比較の終了1は、既存処理が許可する「画素差あり」の正常値であり、検査異常ではない。

## 安全な終了と保存範囲

次の字幕検査が始まらないよう、対象の親processを一時停止した。続いて、親子関係とprocess groupを照合した中止対象だけを一時停止し、終了signalを保留してから配送した。終了signalを配送するための再開通知は、325件検査の再開には用いていない。新しい比較用の符号化・復号は起動していない。

実行sessionの終了値は143。対象へ送った終了signalはSIGTERMで、2026-09-14 **15:16:21 JST** の読取りで、親と全対象子processの不在を確認した。各子processの個別終了値は直接取得できなかったため、送信したsignalと不在確認を記録し、未観測の終了値を補完していない。開始阻止・終了signal送信の各時刻、対象processの実コマンド、親子関係は停止記録に保存している。

中止時点でprocessのメモリ内にしか存在しなかった未保存ログは回収を保証できない。既存の全保存ログと部分成果物は不変保持した。証拠一覧の初回保存ではlockを通常fileとして読もうとして停止したが、実体がdirectoryであることを確認し、内部fileの照合へ訂正した。検査processや成果物には作用せず、訂正記録も保持した。

## 保持した主合成と画像検査

主合成は終了0・signalなしで正常完了済み。停止後に616,632,321byteとSHA-256を再照合した。

`665c31638dcf55af4bf1e6327f915839bbed31d905c007a6a9281e29776b8c34`

MP4は `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-94-v001/.render-v003.presentation-renderer-v002-work-OF3SgY/publish/presentation-rendered-v002.mp4` に保持している。既存の最終QCが未完了のため、別の正式出力先への確定処理や完成verificationは実施していない。

94px styleのbyte不変、配置325/325 PASS、実画像325/325 PASS、既に実行済みの保存後byte照合を保持した。停止後の再読取りで、通常325枚・独立比較325枚・行画像372枚の合計1,022枚が、保存済みの画像SHAと全件一致した。3回分のworkとlockも残っている。検査条件の省略やsamplingを、全件合格へ読み替えていない。

## 証拠と次の相談

証拠は `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-94-v001/continuation-v003/owner-stop-v001/` に保存した。中心の `owner-stop.json` はSHA-256 `9c5b131194a6e553a2934b5d815c82af20836cb315e4a7b5a0f3d16aa79bad67`。オーナー指示、各停止時刻、process状態、終了値、主MP4の照合、画像・比較・保持物の一覧へ接続する。

今回の次工程は、停止証拠をcommit / pushし、ZEV進行管理３へ **「Digest v1で現行325回counterfactual検査を必須条件から外し、実用的な最終QCへ置き換える設計」** をGPT_DECISIONとして提出すること。判断前の再開・方式変更・sampling・検査省略の合格扱い・renderer変更・再描画は行わない。新しい方式が保証することと保証しないことを明示し、今回の未完了を過去の全件合格へ書き換えない。

`humanQuality = not-evaluated`、`completionApproval = not-claimed` を維持する。停止処理の追加API・素材取得・費用は0。
