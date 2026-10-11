# Codex-SSD｜Normal完成記録の検査完了と容量復旧案

- session: Codex-SSD
- epic: J16正式接続・個別設営11継続（容量#67はread-only提案のみ）
- startedAt: 2026-10-11T00:17:37.420Z（2026-10-11 09:17:37 JST）
- closedAt: 2026-10-11T00:52:20.928Z（2026-10-11T09:52:20 JST）
- baseHead: ee6f46bde60788200ddd7d75d468629822539d56
- finalHead: このlogを含む監査checkpoint。full SHA/remote/cleanは workspace normal-finalizer-closure-git-v001.json と最終報告で固定
- status: handoff（今回検査complete、J16全工程は未完）

## 受領指示と判断

親は完全Normal入力fixtureの追加を個別11の継続として承認。既存正規readerを使い拒否点を維持し、元入力read-only・所有test出力だけ。一般枠のリセットや製品緩和は不可。容量#67は一時停止/取り外し/resize/配信実装禁止、汎用共通再開の最小案を返す。PDF-link作業は親確認で完了済み、再取得/ボード実装を混ぜない。

## 結果と範囲

完成記録の媒体なし検査8件をすべて通過した。別processでの登録・再読、失敗後の同じ登録による再試行、mkdir lockによる同時登録拒否、別登録による完成receipt上書き拒否、full/representative記録のread-only再読と媒体差替え拒否を確認。テスト自体の実行 670142.535166ms（約11分10秒）でexit0、skipped0。保存監視34件・Python監視50件は前checkpointで合格済みで今回変更していない。現在runner型検査exit0、diff--check合格。

個別設営承認11の継続で、変更実装は runner/src/digest-approved-record-finalize-v001.test.ts 1fileのみ。既存 digest-approved-inputs test の保存済みNormal組立を再利用し、正規readApprovedDigestInputsV001/readApprovedDigestCaptionVisibilitySelectionV001を使用した。元Normal候補を31group/651cue/1042line/5450atom/37619frame/55299930sampleのまま読む。保存controlの撤回済みadjusted候補参照だけを検査内で元Normalのcaption-registration/manifestへ戻し、実bytesのSHA/sizeへ束縛。原本自体・J16固定326字幕/5場面・採否・時計・ownerを変えず、null modelや製品gate緩和を追加していない。

元Normal入力とその必要な祖先directoryをread-only passthroughし、生成・変更・削除操作は所有fixture内へ限定。651行に対応したmetadataと小PNGを作るが、媒体はopaque test bytes、alpha/媒体観測は既存synthetic技術fixture、hardware観測は既存model。実glyph/ffprobe/音声/native/背景/合成を実行しておらず、この合格を実SSD全工程・J16製造・人間の視聴品質へ転用しない。旧8callbackとその拒否assertは完全保持、正試験の4assertを追加した。

## 失敗履歴と復旧

|今回run|結果|原因と同じ設営内の対応|
|---|---|---|
|v001|1pass/7fail|生成seed objectのclosing brace1個を修正|
|v002|1pass/7fail|元Normal入力の祖先pathがfixtureへ誤写像され、read-only passthroughを補完|
|v003|7pass/1fail|完全Normal再資格化に対しfixtureのcommit-ready待機5秒が先に切れた。目的のlock検査は未到達|
|v004|8pass/0fail/0skip|fixture-only event waitを5秒→180秒にし、元の実lock/RECORD_FINALIZATION_BUSY拒否まで実行|

旧失敗ログをKEEPし合格へ書き換えない。製品待機時間・判定条件は変更しない。累積初期5/5＋個別6–10＋今回11を維持し一般上限を増やさない。

## 容量と配信・ボードの復旧提案（未実装）

本人は容量拡張を了承済み。512GBは今回の具体提案で、親は停止/unmount/resize/配信code変更を認めず、具体案だけを求めた。現在guest free約84.0GB、既存開始要求background/PCM174.373GB＋固定reserve12GB＝186.373GBのため実媒体工程は開始できない。512GB案の454.127GB試算は32GB描画準備/200GBencoded/20GBQC等の計画余地を含み実測保証ではなく、各deviceのfreeは合算しない。

現在のKEEP配信は full PID54217 port63610 /digest.mp4、original2short PID68661 port49504 /review.html、visibility2short PID90370 port60161 /review.html、scene-connection2short PID5165 port61560 /review.html。all127.0.0.1、操作者kawafmm/既存Codex-SSDで、引渡し用継続指定の記録を保持。既存logは過去アクセスを示すだけで現在human視聴とは扱わない。4helperともport0の再起動でURLが変わり、旧server.jsonのexclusive作成も衝突する。3helperのdevice固定、2helperの自己/buildSHA固定もある。従ってdeviceが同じでも無変更restartで同じURLの復旧を保証できない。

親の最新方針は4専用固定port helperを作らず、既存共通 evals/clip_composition/serve_digest_review_v001.py の明示resumeモード＋同directoryのserve_digest_review_v001.test.py（新設）の2file案。port/servedRoot/routes/許可file SHA+size/再mount後実測storage UUID+device/旧originRecordBinding/別newRecordOutputを独立configSHAへ束縛し、既存HEAD/GET/Range/import経路を再利用。loopback/厳密Host/query拒否/allowlist/symlink/current identity/旧record非改変/新recordx、port競合時fallbackなしを保持。最小差分と小test/記録で2–3時間の見積り、まだcode0。詳細 proposal md/jsonと次節に保持し、前4helper draftは非適用履歴で後から適用しない。

Macボードapp main PID75046/helper4はguest /dev/disk6s1、projectRoot/DB/userData/PDFregistry/4PDFは内蔵 /dev/disk3s5。アプリを通常終了し全child/bridge終了を確認、同じ.appを通常再開して同projectRoot/DB/taskID/PDFlinkを維持する段取りを配信4件の一時停止・復旧へ合わせる。PDF再取得・ボード実装/DB移動/Chrome既存PDFタブ変更は不要。これらも今回は操作していない。parentのUI正常確認はparent観測、こちらはpath/device/byte/hash/processだけを確認しUI視認したとはしない。

## 保全・整理・次状態

元31＋採否4の35file、製品23file、共通配信source、既存helper/record/配信対象18bindings、app6file、registry+4PDFは実SHA/size不変。live DB/WALについて静的copy整合を主張しない。証拠固定後、自分の構文確認7file計29019Bだけ削除、testroot/process残存0。原本、過去成果、failed/pass logs、最終patch、before pins、capacity/inventory/proposal、4KEEP server・appを保存。今回API/動画製造/native/容量/backup/detach/server停止/旧成果削除/製品変更0。

#61は今回の検査工程が完了したが、正式J16全工程と視聴品質は未完了のためDoneにしない。#67はmona/Doingのまま、共通再開案の実装範囲とボード/PDF担当も含む一時停止・復旧の調整へ。次担当mona、こちらは追加指示まで媒体製造を開始しない。

証拠：workspace normal-finalizer-closure-start-v001.json / assertion-preservation-v001.json / result-v001.json / cleanup-v001.json / final-v001.patch / test-v001–v004.log / typecheck-v004.log、zev-review-services-readonly-inventory-v001.json、zev-board-storage-restore-readonly-v002.json、zev-common-review-resume-proposal-v001.md/json。月別log docs/work-logs/2026-10/2026-10-11T0917_Codex-SSD_Normal-finalizer-closure_ee6f46bd.md。

## Gitと受渡し

main / base ee6f46bde60788200ddd7d75d468629822539d56。検査1file＋CURRENT_GOAL/HANDOVER/既存report/専用logの5pathだけを監査checkpointへ固定・pushする既存承認範囲。stage/commit/pushは直列、他者変更混入なし。確定結果はdeliveryJSON/親finalへ記録。正式採用・本番切替・完成品質承認・tag/release/公開は含まない。
