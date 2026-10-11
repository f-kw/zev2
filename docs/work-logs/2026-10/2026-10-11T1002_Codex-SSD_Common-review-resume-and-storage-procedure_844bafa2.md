# Codex-SSD｜共通配信再開の実装検査と容量・失敗復旧手順

- session: Codex-SSD
- epic: 容量#67の前準備（J16全工程は別に未完成）
- startedAt: 2026-10-11T01:02:11.585Z
- closedAt: 2026-10-11T01:16:17.002Z（2026-10-11T10:16:17 JST）
- baseHead: 844bafa226c422a096a485433a2f53e83cdf19d7
- finalHead: このlogを含む監査checkpoint、full SHA/remote/cleanはworkspace common-review-resume-implementation-git-v001.jsonと親finalへ固定
- status: handoff（2file実装検証complete、実停止・容量操作は親確認待ち）

## 受領指示と判断

親が本人の容量拡張と費用のかからない技術判断委任を根拠に、共通2file実装・模擬検査・保存を明示承認。古い証拠を現codeへ通す互換処理禁止、現在の実volume/同filesを指定する正規経路。No.67現在作業へ更新、同記録に具体実施順と失敗時基準を補完。実配信/appは継続、実停止/quit/detach/resizeは親手順確認後に同担当、今回媒体/APIなし。

## 実装・検証の結果

親が承認した実装2pathだけ：既存 evals/clip_composition/serve_digest_review_v001.py と新 evals/clip_composition/serve_digest_review_v001.test.py。--resume-config <absolute file> --config-sha256 <independent SHA> が正規の明示起動。current configは schemaVersion=digest-review-resume-config-v001、port、servedRoot、routes、files、storageObservation、originRecordBinding、recordOutput、contentSecurityPolicy の9項目を必須とし、未知field/duplicate keyを拒否。filesはflat basenameごとのfileSha256/sizeBytes、storageObservationはvolumeRoot/volumeUuid/device/観測時刻（timezone必須）、originRecordBindingは旧fileのpath/SHA/size。CSPはnullまたは既存2reviewの固定値だけ。指定portは正整数で0・競合・fallbackなし。

旧server.jsonはSHA/sizeを照合した履歴根拠として読むだけ。共通して存在するbindAddress/port/urlが明示起動と合うことを確認するが、旧schema/古いtargetIdentityを現在の資格へ変換する分岐はない。現在のroot/routes/filesは独立config SHA、現在のvolumeは実diskutil＋mount tableへ束縛する。旧記録のallowedFilesから権限を自動拡張せず、明示files/routesしか公開しない。4旧helper・build recordは不変。

root/config/old record/targets/出力parentの絶対realpathとancestor symlinkを確認。起動時は全許可fileの実SHA/size・path/open handleのdev/inode/mtime/ctimeを前後照合。diskutil MountPointと実mount tableのDeviceNode/path一致、現在UUID/deviceを独立観測と照合し、bind後も現在観測/元記録/config/targetsを再確認。127.0.0.1固定、Host完全一致（重複も拒否）、query/fragment/encoded・traversal/未指定path/directory listingを拒否。毎requestはroot/volume/targetのcurrent identityを確認し、O_NOFOLLOWで開いた同じhandleを既存Range/HEAD/GET処理へ渡す。既存mainとcopyfileはAST一致、Range/headerのbodyは同一のまま共通methodへ抽出、関係ない既存6file起動・旧import APIは維持。

新recordは同じstorage deviceの既存parentを保持したdir_fdからO_EXCL/O_NOFOLLOWで0600作成し、旧record/入力/許可fileと同pathを拒否、flush/fsync。現在の観測とidentity、旧record/config bindings、URL、PID/PGID/start timeを記録。新recordが存在する場合に上書きしない。起動・publication失敗時はsocket close。途中書込み/fsync失敗では新fileが残る可能性をテストで確認し、失敗fileを自動上書きせず保全・次のfresh明示pathを親が選ぶ。recordがあることだけを現在の正常稼働の証明にしない。SIGTERMは自分のserverをfinallyで正常close。

Python3.12 10/10、既存配信用/usr/bin/python3（3.9）10/10、各exit0/skipped0。模擬bytes・別のtest port・TemporaryDirectoryのみ。実Macの内蔵Data volume観測、CLI起動→HEAD/GET/Range→SIGTERM→同じport/URLで別new recordへ再開を確認。単体部分のvolumeは明示mockであり実SSD remount検証ではない。起動競合、source差替え/同size変化、symlink、root変化、UUID/device違い、old record byte/port/url/bind違い、config SHA/duplicate field、出力上書き、publication失敗のsocket解放を確認。初回v001とv002は各9pass/1error：diskutilにMounted keyがなく、代わりのos.path.ismountもAPFS Dataの同device parentによりfalse。現在は実mount table＋diskutil MountPoint/device/pathを直接照合。旧失敗logを残し、2回の限定修正を記録、既存J16設営例外11の回数・一般上限をリセットしない。型のTS変更はないため前回tscやNormal検査を追加再実行しない。diff--check合格。

2026-10-11T01:13:19.417Z（10:13:19 JST）の最終保全確認：元31＋採否4の35file、製造code23file、旧helper/record/配信対象18bindings、app6fileは不変。4serverは各元port127.0.0.1でLISTEN、PID54217/68661/90370/5165維持、app75046継続。PDF登録簿は他作業により前観測から更新されているのでimmutableと書かない。現在registry SHA7acce1554e9e296e57c8126e8c42f67e2e49da42e5e66420c492bf1991c44844 /1582B、Bはversion1/105260B/SHA763225ae91db31dc8a4b49f3b8d2d87617ef9db6653e60eaf1c37bf5f0069b17で登録・実file一致、他3PDFは従前と同じ。旧Bへ戻さず、実施直前に担当間で最新版を再固定する。DB/WAL静的不変の主張はしない。

証拠を固定しown候補3file/49914Bのみ整理、test temp/process残存0。旧成果・全source・ログ・最終patch・before/after pinsはKEEP。今回既存サービス停止/board quit/detach/resize/backup/内蔵大容量copy/製造/API/不可逆削除0。実装前提の検査完了と、実サービス4件/ボード/SSDの停止・復旧未実施を区別する。

## 容量変更・正常復旧の具体手順（親の確認後に同じ担当で実施、今は未実施）

対象imageは /Volumes/KIOXIA/zev2-digest-formal-handoff-20261003-v001/digest-100GB.sparsebundle の一件だけ。host /Volumes/KIOXIA の旧UUID0E5DC84B-1E22-3C9B-9E3B-220EBA8607C1、guest /Volumes/ZEV-Digest-20261003-01 の旧UUID7212F3BB-32FB-4F02-A71C-E570421FF2E0と、disk5→disk6/disk6s1という過去mappingは照合用履歴。実行するdevice/PIDへ無条件に流用しない。512,000,000,000Bは提案target、本人の容量拡張了承と親の手順確認が前提。100GB/12GBreserveなど旧job/auth/permitは書換えず履歴KEEP、新保存観測は新配信入力だけに使い、製造許可へ転用しない。

1. 親がPDF/ボード担当との更新終了・未保存入力・停止時機を調整する。直前のGit実装SHA、4serverのPID/argv/PGID/port、app/child/bridge、対象imageの唯一のattach mapping、host/guestのUUID/device/size/free/permissionsとmount pathを読み取りで確認。対象image以外を走査せず、現在のmedia/html/old server records/helper/app pins、内蔵DB所在/PDFregistry/4PDF/task IDs/task-pdf linksを記録。今観測したB version1を旧版へ戻さず、以後も変更があれば新しく確認する。hostとguest freeは合算しない。

2. 親の確認後だけ、直前に照合した4既存serverの正確なPIDへSIGTERM（現履歴54217/68661/90370/5165）を一度送り、終了・各port LISTENなしを確認。他者process/競合portの所有者を勝手に止めない。local.mcpsticky.notesへ通常quitを依頼し、main・helper・bridgeが全て終了したことを確認。own MCP clientも閉じる。Chromeの内蔵PDF tabsは操作しない。lsofで対象guest volumeの全holderを再確認し、残るprocessがあれば停止対象を推測せず親へ返す。

3. hdiutil infoの直前結果で一件のimageへ対応するdeviceを特定し、hdiutil detach <そのdevice> を通常実行。forceは使わず、KIOXIA host全体をunmountしない。guest mount消失・対象image attachmentなしを確認。不成立なら容量変更もbackup整合の主張もせず停止。まだimage bytesを変えていない場合は、同imageを通常attachして現在値を再観測し、下記共通経路で元URL/boardへ戻す。

4. source imageが未attach・全holderなしの状態で、host SSD上の今回専用fresh directory（例：storage-expansion-backup-20261011-v001）へ対象sparsebundle一件だけコピーする。destination既存を上書き/mergeせず、内蔵へ大容量copyしない。コピー前にhostの現在freeとsource実file総bytes・必要作業余地を確認。不明/不足なら止める。source/backupの全metadata/bandsの相対file集合・各size/SHAを照合し、前後source identity不変・mismatch0を確認したmanifestをSSD上へ保存。backupをattachせず、同UUIDのコピーを同時mountしない。未完backupや不一致があればresizeへ進まない。原image/backupの削除はせず保持する。

5. SHA一致backupが固定済み、source未attach、host/device/対象path対応が直前値と一致する条件だけで、APFS対応の diskutil image resize --size 512000000000B <exact source image path> を一度実行。format・symlink・一般ROOT変更・容量を埋める試験は行わない。exit非0は途中変更の可能性として扱い、自動再送/縮小/別command fallbackをしない。元imageは変わっていないと推測せず、失敗状態を保存する。

6. 成功時はimage metadata sizeを確認し、hdiutil attachで元guest pathへ通常再接続。別mount名への自動切替はせず、同UUIDコピーが既にattachされていないことを確認する。guest/host UUID、fresh device/attach mapping、APFS permissions/writable、総容量/空き、元media/html/oldrecord/App pinsを再読。予定容量に達し、元content pinsが一致し、単独mappingが説明できることを必要条件とする。guard/reserveを緩めず、拡張成功でも動画製造は始めない。device番号が変わった場合も新観測へそのまま束縛し旧recordは不変。

7. 各serviceの同じservedRoot/同じfiles SHA+size/旧origin record SHA+sizeと、現在storage observationから独立SHAを持つfresh設定を用意。4file専用helperは作らず、同じ共通プログラムを各設定で起動する。各新record/logの場所は別で排他作成。fullはport63610 /digest.mp4のみ、original shortは49504、visibility shortは60161、scene shortは61560で既存review.htmlと2clip（/ aliasも従前通り）だけ。新recordのPID/PGID/URL/current identityと実LISTENを照合し、各元URLへHEAD、許可clipへ小Range GETで200/206・長さ・対応bytes/headersを確認。未指定file/Host/query拒否も確認。記録があるだけで復旧済みと扱わない。

8. 元の /Volumes/ZEV-Digest-20261003-01/mcp-sticky-notes/mcp-task-board.app を通常open。同project-root.txt、内蔵 /Users/kawafmm/workspace/mcp-task-board のDB/userData/最新版PDFregistry/4PDFを使うこと、app/bridge起動、既存task IDs・task-pdf links・ボード表示とPDFリンクの正常復旧を確認。DB移動・新PDF取得・ボード改修・Chrome既存tabs操作はしない。担当の直前更新を上書きしない。4URLとボードの確認がそろって初めて容量作業を完了記録する。

## 失敗時の判断基準と戻し方（今は未実施）

|失敗点|止める条件と戻し方|
|---|---|
|使用終了・通常detach|holder残存/未保存入力/対応device不明/通常detach失敗なら先へ進まない。force/他者killは禁止。原image未変更なら通常attachとfresh観測から元URL/boardへ戻す。|
|backup|file集合/size/SHA/source安定性に1件でも不一致、host free不足ならresizeしない。不完全backupは不完全と記録し保持。原image未変更から通常復旧する。|
|resize/再attach/内容照合|exit非0、metadata/予定容量不一致、attach失敗、UUID/mapping説明不能、元content/App pins不一致ならmedia/API・追resizeをせず証拠保存。壊れた/変化した可能性のあるimageは書換えや削除をしない。|
|容量は健全だが配信が失敗|port競合、config/file/storage不一致、新record存在/書込み失敗ならその起動は止まる。socket解放・自分のPID終了を確認、旧recordと失敗newrecordを保全。競合所有者をkillせず、別portへ逃げず、imageを不要に戻さない。親が原因とfresh明示record pathを確認してから同URLを再開。|
|ボードだけ失敗|容量/内容が合格ならimageを戻す理由にしない。新規DB/PDF再取得を行わず、同app/実projectRoot/内蔵DB/最新版登録の状態を読み取りで親へ返す。|

容量操作が失敗し、確認済みbackupへ戻す必要がある場合の具体的な候補は次の順。親が保存した失敗証拠とbackup manifestを確認し、この戻し方を実施範囲として受領した後だけ行う。正常mountや既存processをforceで解除しない。

- 新しく起動した自分のreview process/boardがあれば通常終了し、対象image/同UUIDが全て未attach・holderなしと確認する。解除できない場合は止める。
- 失敗したsource sparsebundleは、同hostのfresh storage-expansion-failed-20261011-v001等の今回専用領域へrenameして丸ごと保全する。既存pathへの上書き・削除はしない。rename可能性/free/既存destinationなしが確認できない場合は止める。
- 照合済みbackupから、空いた元source pathへ新たにコピーする。backup自体は未attachのままKEEPし、戻したsource全file集合/size/SHAをbackup manifestへ再照合する。内蔵へコピーせず、元pathを別imageへのsymlinkにも変えない。
- 一致したsource一件だけを元guest pathへ通常attach。旧容量に戻ったこと、UUID/device/mapping/元content/App pinsを現在値で確認し、新設定/新記録で同4URL・同boardを通常復旧する。旧容量では製造の容量条件が足りないことを明記する。縮小resizeによる戻し方は使わない。
- 上記どこかが説明できない/照合不成立なら、動いていると推測せず状態不明/復旧待ちを具体的に報告し親判断へ返す。失敗image・backup・旧記録・成果の永久削除はこの作業の完了条件にしない。

このcycleは手順の具体化と2file実装検証まで。実停止・quit・detach・backup・resize・再attach・本番復旧は未実施、親の手順確認待ち。実SSDの拡張/耐障害性/4既存URLとボードの復旧を今回mock検査の合格に含めない。

## 証拠・Git・次状態

workspace common-review-resume-implementation-start-v001.json、result-v001.json、cleanup-v001.json、final-v001.patch、tests-v001–v003.log、tests-python39-v001.log。Gitの2実装＋CURRENT/HANDOVER/既存report/専用logの6pathだけを監査checkpointへ直列commit/push、他者変更混入なし。mainへの保存は製造・品質採用・本番配信切替・tag/release/公開の許可ではない。No.67は全容量作業未完成のままmona/Doing維持、次monaが手順を確認後に同Codex-SSDへ実施指示。No.61やPDF本人判断項目など他taskは変更しない。
