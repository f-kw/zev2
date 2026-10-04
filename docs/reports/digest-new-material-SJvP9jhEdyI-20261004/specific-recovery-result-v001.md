# 新動画の保存済み一本：正式保存へ復帰、字幕問題は未解決

記録時刻：2026-10-04T14:17:41.465761+00:00。時刻はUTC。今回の同じSJvP9jhEdyI一本について、保存済み動画を正式な出力場所へ復帰できた。画像・媒体の技術検査と確認待ち結果の保存・別processでの取得は成立した。一方、短い字幕2件の問題を正直に登録したため、完了確定は拒否されている。動画の正式完成や品質本採用とはしない。

## 使える成果と保存先

正式MP4は20分53.966667秒、1920×1080、30fps、37,619frame、617,257,203B、SHA256 `6434a56b40e66212c5dd910638c33b73b53029d733592b0b77ca6aa03d4f18b8`。旧失敗workの合成動画と実SHA/sizeが一致し、今回描き直し・再合成は0。本文、ID、時計、元音声、216px、左右108px、最大2行、Normal、順接続を保った。

`/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-recovery-v001/render/presentation-rendered-v002.mp4`

今回専用のAPFS領域 `/Volumes/ZEV-Digest-20261003-01` は、外付けExFAT `/Volumes/KIOXIA` 内の既存100GB上限imageを使う。一般ROOT/trust/default、Core、共有契約、既存QC/finalizer、SSD既存内容を広げたり変更したりしていない。途中物のSSD保存が成立した前工程の記録は[元の製造報告](manufacture-result-v001.md)を参照する。

## 実装と正式経路の実結果

親monaが68df5d7aの停止報告を受け、同一module修正・今回保存済み失敗の限定復帰・無料LAN局所再照合・最小fade/次回代表検査案の準備を明示した。この継続範囲で製品6pathと回帰4pathを変更し、実装 `8c3a20b5c895215359e0b0fb8d734cf37bddd45d` をmainへpushして凍結した。[実装・検証](specific-recovery-implementation-checkpoint-v001.md)。関連53件、job14件、Python49件、runner/Remotion型、renderer構文は成功。旧input fixtureの準備SHA不一致1拒否は旧証拠を保持したままで、合格や免除にしない。

旧job74a234da/authorization8458ac86/実装2399aa61/実停止/閉じた旧owner、651primary・651repeat・1042mask、元plan/ID/本文/時計/props、原MP4を実再読して束縛した。新job7dc17b7c/authorization1fdf08f5には実descriptor SHA84370d96・1,010,509Bを同じ独立参照として入れ、新しい未使用兄弟rootとownerだけで実行した。旧workとlockを保持し、現在コードSHAと通常の許可・hash・保存先・容量・排他を免除しない。

prepareは13:37:46.789〜13:37:47.475、exit0。限定復帰は **13:38:08.084〜13:57:16.948、1148.869秒（19分08.869秒）**、exit0/残存0。全651primaryをEXCLコピーし、保存maskとprimaryの実alpha/boundsを既存工具で再取得した。画像子処理3,386と媒体子処理5、計3,391は全exit0。各cueの数値を随時保存し、既存private finish→atomic publication→technical/pending/resultへ通した。採用済みの上流判断の再実行0、Remotion描画0、新合成0。失敗前の未保存数値を推測で補っていない。

技術証拠は8,838,883B、SHA84c573cb、結果は19,340B、SHAe3ef085b。既存の全字幕規則・配置規則・媒体・原AAC packet保持がpassed。実AACは44.1kHz stereo、packet SHA `7cd5355fcd5dfd8eb8c64cef41eb3a20e78b0223ba62a2c40aad6c99c5941117` でbaseと同じ。期待sample55,299,930は元計画の値で、別の未実施PCM再countをした扱いにしない。全件の最終画面比較はnot-executed、全編/音声/品質採用はnot-evaluated。[実数値と全binding](specific-recovery-actual-result-evidence-v001.json)。

## 代表問題の登録と未成立の完了

同一MP4から以前一回decodeで抽出し、rootが12:21:46 UTCに実見した8画像を、新job/実pending/technical/raw plan/本文/clockと再照合して登録した。新decode0。6件のacceptedは静止画の字形と画面内表示だけであり、台詞枠/顔/身体/menuの重なり・配置再検討・通常速度/音声未評価の原所見をnoteに保った。人間品質採用ではない。465と571はissue-found。[正式登録と同byteのrecord](specific-recovery-representative-confirmation-v001.json)。

| 出力動画の位置 | 残っている問題 |
| --- | --- |
| 13:52.933〜13:53.033、465「世界が終わる」 | 3frame・0.1秒、中央50％の薄さ。重要な危機の前振りを追加字幕だけで読み取る時間が不足。元ゲームにも同文があり、意味を完全に失ったとは断定しない。 |
| 18:05.867〜18:05.900、571「お!」 | 1frame・約0.033秒、25％の薄さ。次の字幕に具体内容があり意味損失は小さいが、この表示を読み取れる扱いにはしない。 |

正式finalizeは14:04:51.083〜14:05:32.541、41.458秒。8PNGとrecordを排他保存して再資格した後、`RECORD_CONFIRMATION_NOT_PASSED`でexit1、残存0。既存評価の実数値再評価でもwhole rules passed、代表failed、違反はこの2件の `REPRESENTATIVE_CONFIRMED_ISSUE` のみである。[拒否log](specific-recovery-finalize-issue-record-v001.stdout.json)、[保存数値とrecordの評価](specific-recovery-recorded-issue-evaluation-v001.json)。

正式getは登録前6.697秒、登録後6.834秒、cleanup後6.718秒で全exit0/残存0。元pendingは変更されていない。現getは登録issueをfailed結果へ反映する仕様ではなく、completed receiptが無ければ元 `confirmation-pending` を返す。**get pending、登録recordに2問題、正式完成は未成立**を併記する。completed-receiptと保存済みregistration receiptは作られていない。これは新しい実装障害や権限拒否ではなく、問題記録に対する既存の品質停止である。

## 時計・短cue・次の描画前の残件

元38:35〜38:55の20秒だけを既存無料LAN GPUへ一度投入した。client25.927秒、本文19文字は一致。「世界が終わる」は旧120msに対して新1242msという機械根拠が出たが、隣接字幕と重なり、末尾4文字も新結果でscore0/20ms。実聴取もできていない。隣接を含む正しい派生時計を決めるには根拠が不足しており、元本文/時計を変更しない。[照合と限界](short-clock-lan-gpu-comparison-v002.md)。新paid API0、既存設備/電力の総費用は未計測。571について新音声根拠は得ていない。

短cueが最低一度100％へ届く `D=min(4,ceil(F/2))` のfade案は準備済み・未適用。100msそのものの可読性は解決しない。PNGは再利用可能だが、現正式合成で新fadeを適用するなら全MP4の新合成になる。次の新描画前には全651primaryと実layout/font/本文/clock/媒体/安全を保ち、repeat8・mask14だけを実施したcoverageへrenderer/QC/completionの3pathを正直に接続する必要がある。他643repeat/1028maskをpassedにしない。提案は今回復帰へ注入せず、651新描画やfade再合成は起動していない。[最小案](new-material-fade-and-native-sampling-proposal-v002.md)。

## 制作負担・cleanup・次担当

初回製造は3時間17分42秒、今回の保存済み成果復帰は19分08.869秒。工程が違うため全製造の速度改善率にはしない。実装/原本照合/回帰/初回素材準備の手間と、媒体処理時間は別に記録した。今回追加の本人回答待ちや手動視聴依頼は0、人間労働時間は未計測。

復帰監視は735sample、親子RSS peak1,985,871,872B、pressure1。3diskを別々に測り、guest最小92,709,425,152B、host1,989,477,400,576B、内蔵12,477,423,616B。50GB開始/12GB reserve/RSS16GiB/1秒目標/next-unit+reserve/own PGID停止を維持した。実sample gap中央値1.558625秒、最大1.730923秒で、厳密な1秒間隔の実測保証ではない。

成功した今回workのscratch JSON652個を、実数値が正式technical・originが保持descriptorと全数同一で、後続scratch参照が無いと確認して整理。回収1,793,523B。cleanup後の正式getも成功。旧失敗work/旧owner/lock/MP4/PNG/mask/base、元素材/STT、入力、正式動画/651PNG、8代表画像、拒否log、必要時計音声clipは監査・復帰来歴・品質訂正のためKEEP。旧削除/一般掃除/SSD compaction/detach0。[cleanup](specific-recovery-cleanup-summary-v001.json)。

2026-10-04T14:10:46.538906+00:00の実psでown製造/record PGID残存0、finalization lease無し。空きはguest92,701,454,336B、host1,989,498,372,096B、内蔵12,533,846,016B。[終了観測](specific-recovery-final-close-observation-v001.json)。

状態：**相談役待ち**。次担当：親monaが、該当発話と隣接字幕を整合できる追加根拠または限定訂正の基準を決め、同じMac実装者へ渡す。音声input非対応を聴取済みにせず、機械時刻の重なりを推測で解消しない。完成を阻む字幕を最小修正するためのこの根拠が不足している。過去レビューや全字幕採点を本人へ再要求せず、新しい診断仕事・素材・paid API・演出・上流再構成・公開は始めない。

実装main8c3a20b5はpush済み。今回終了文書だけを追加のmain checkpointへ固定し、remote一致・clean/untracked0の実結果は最終報告で確定する。記録後にHEADが進んだことを旧jobの実装資格へ無言で免除しない。今回の成功getは実装HEAD8c3a20b5に固定して実行したもの。この監視・実行をメイン相談役モデルの正常稼働証明にしない。
