# Codex-SSD｜ID9 指定2字幕の非表示動画・確認・閉じ記録

- session: Codex-SSD / 親mona `01a0ff1f-1ad3-70b5-bb7f-d0f3988a10e6`
- epic: ID9 / 同一承認済みDigest製造の完了サイクル
- startedAt: 2026-10-05T23:46:06.838091+00:00（今回の本人製造承認）
- closedAt: 2026-10-06T03:34:02.265661+00:00（媒体・正式再読・cleanup・process確認後、閉じ記録の作成時刻）
- baseHead / formalExecutionHead: `6a8554156c99f91bcf7e2318589ff551e12b9862`
- status: complete（今回製造・技術検査・局所確認・記録。全体人間品質の合格ではない）
- closing record commit: このログとCURRENT_GOAL/HANDOVERだけを含む通常main commit。自己参照SHAを本文へ作らず、実SHA/remote一致/Git cleanを最終報告で確定する。

## 受領指示と判断

本人の製造承認（2026-10-05 23:46:06.838 UTC、Sentinel_233ea65d48bc81918d7cf448aa3cd29f「いいよ」）と親monaの指示に従い、main `6a8554156c99f91bcf7e2318589ff551e12b9862` を固定して正式経路で一本製造した。全651件の元本文・ID・行・時計・5450atom・31区間を維持し、表示649、非表示は465「世界が終わる」と571「お!」の2件だけ。570「何人いるの?」は独立の字幕として表示する。今回の製造中に製品code・入力・承認・実装bindingを変更していない。

前段の実装は`bed2eeeb672c0f84e95cfa8f970b2f26bfe9f992`、時刻補正撤去は`3b5592535b51a081adf51d01b79b5a082d3abc0f`。今回の本人承認は未反映差分の通常GitHub反映・同じ動画一本・短い確認画面・付随記録/後始末を含む。製造前にremote main `6a855415`一致とcleanを確認し、実装57path/Node/input/出力root/guardを新job/authへ固定した。[前段ログ](2026-10-05T1620_Codex-SSD_ID9-explicit-caption-visibility_bed2eeeb.md)は過去時点の製造未開始/反映待ち履歴であり、今回状態の代用にしない。

本人の同一作業2時間超続行承認は2026-10-06 03:08:40.379 UTC、Sentinel_cd6ca859bde48191842504720e377472「良い」。この投稿前の02:09 UTCに既存CLI製造は終了しており、親の続行呼出が制限で止まったことをworker停止や再製造と解釈しなかった。承認は残る正式再読・局所確認・HTML・記録/後始末の継続根拠として別[証拠](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/visibility-two-cues-post-manufacture-v001/duration-continuation-approval-evidence.json)へ保存し、23:46の元job/authへ遡って差し替えていない。本人へ全尺再視聴・全字幕再採点を求めていない。

## 実作業と成果

正式root：`/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-visibility-two-cues-v001`。製造は2026-10-05 23:57:47.491 UTCに開始し、supervisorは2026-10-06 02:09:13.399 UTC（11:09 JST）にexit0・remainingRunning0で終了。

- [完成MP4](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-visibility-two-cues-v001/render/presentation-rendered-v002.mp4): 1920×1080、30fps、37619frame、20:53.967、H264/AAC 44100Hz stereo、617,007,892B、SHA `3d884569f3c2e28526f9f57da00015cdd564de821247d1a333ecb850e0eb7eec`。
- [新job](/Users/kawafmm/workspace/zev2/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/inputs-v001/approved-visibility-two-cues-job-v001/job.json): 17,736B、SHA `db3dda0e45205d1181d4511dc8bd546250482b226697c8c95a3301b142ed539f`。auth: 15,750B、SHA `c22323a5508fbc175a9adb5f76d02302603b48652833353d54b77ef2e71a45f4`。
- 入力manifest: 86,098B、SHA `fcfafc28c85c3e18c05b3179d1670165b46a54f54fdcc43c3b02f4c75978867e`。採否: 1,950,260B、SHA `077f96b34d6d6c1479e01b5f89119a8baf428c961b1ccd1683c64783bdb01dae`。原登録/meaning/原STT/原時計と旧成果保持。新STT/API/モデル変更/時計補正/自動閾値/上流再構成0。

内部物もSSD guest device16777243の承認済み専用rootに保存。base-media（4file/600,522,014B）、全651 primary PNG（133,355,452B）、QC/JSON/ログ/代表画像と完成MP4を保持し、正式readerで保存再読を確認。内蔵とguest/hostは合算しない。今回の成果は指定した保存経路の実走結果であり、一般ROOTの変更や他のSSD内容整理は行っていない。

## 技術QC・実画像・未評価

既存全primary規則、選択9代表のnative sampling、採否/合成証拠、媒体、元AAC保持、代表確認がpassed。全651の論理記録・原時計を維持し、合成はshow649だけ。全フレームのcounterfactual visibility検査はnot-executed。本文時計だけの確認や旧650の8代表recordを流用していない。前段118対象test/2型検査等の事実は維持し、今回ソース変更がないため反復しない。既存の変更前からのrenderer SHA不一致2履歴testは全suite合格に読み替えない。

完成MP4から実PTSで9枚を一度抽出し、464〜469/570〜572の静止画をrootが実表示。非表示465 frame24989と571 frame32576に追加字幕がなく、570 frame32560に「何人いるの?」が独立で表示。前後の字幕も表示し、選択画像に明らかな文字欠け/画面外は見当たらない。ゲーム内の元台詞「世界が終わる」は元映像として保持されており、追加字幕が残ったと扱わない。短い表示の読了可能性・発話同期・全体のテンポを静止画から合格にしていない。

v002 [代表記録](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-visibility-two-cues-v001/representative-confirmation.json): 9,360B、SHA `f22d1d4c3b6fb09babc47ea0112700fc9cfbef783db97c34246422a6966cfdcf`。[正式finalize](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/visibility-two-cues-post-manufacture-v001/formal-finalize.operation.json)は03:23:15〜03:26:28 UTC、exit0。完了receipt作成は03:25:17.960 UTC、[completed-receipt](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-visibility-two-cues-v001/record-finalization-v001/completed-receipt.json): 6,062,582B、SHA `c64ccb0676ec65d156c4afe983ab4135875666bf85928603e51ea62cf33dbfc1`。別[正式get](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/visibility-two-cues-post-manufacture-v001/formal-completed-get.operation.json)は03:27:26〜03:28:12 UTC、completed/complete=true、remainingRunning0。元[result.json](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-visibility-two-cues-v001/result.json)は初期confirmation-pending/SHA `7ee8a809b22ee71fe8bc00e0d37f0b79bbabbf1d116406f63cc630bd807788d3`/5,769,835Bのまま不変。現在の確定状態は別のcompleted receiptと正式getに基づく。

[短い確認ページ](http://127.0.0.1:60161/review.html)は5秒と6秒の映像/音声、各再生/停止、通常シークのみ。追加採点UIなし、自動再生なし。03:20:15.701 UTCに専用headless Edgeで2本の実再生/停止/シーク/音声decode、390px表示、外部request0/エラー0を確認し、rootが画面画像も実表示。[browser-check](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/visibility-two-cues-short-review-v001/browser-check.json)。HTML/2clip byteとHTTP200/Range206/記録file非公開を確認。これは人間の音声聴取や同期判定ではない。12:21 JSTに親monaが本人へURL提供済みと受領。

実視聴品質: 全尺再生・人間音声聴取・精密同期・全体可読性/構成・品質本採用は未評価。既知の同期不具合と前回2clip本人不採用は未解消として保持する。今回の2非表示がそれらを解消したとは扱わない。

## 制作負担・安全監視

worker実測: 初期準備24.307秒、base42分46.431秒、描画/合成/QC1時間27分40.802秒、その他未分離31.746秒、総計2時間11分23.286秒。前回1時間42分23.820秒より28分59.466秒長い。native/合成は後半の内数であり重ねて加算しない。初期準備値はCLI内部時間で、機能実装や人間の確認時間を含む初回準備全体の値ではない。人間active時間は計測していない。2件だけ非表示でもbaseと全primaryを作る通常経路のため、大幅な短縮を見込む根拠にはしない。

supervisor 2時間11分26.635秒、4434観測、観測tree peak2,970,468,352B。監視設定は50GB開始/12GBreserve/親子RSS16GiB/pressure1/1秒観測/next-unit+reserve/own PGID停止。最小guest82,402,054,144B・host1,982,807,932,928B・内蔵14,710,124,544Bを別deviceで記録。観測値は連続した最大使用量の保証ではない。[監視summary](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-visibility-two-cues-v001/monitor/summary.json)。同一CLIの自動再起動0。

## 証拠固定・cleanup・process・Git

03:30:01 UTC、正式get成功後に自分のscratch重複repeat9枚/単行mask5枚とtsx cache10件だけ削除。計24file/2,410,844 logical bytes。PNGは保存primaryと実byte同一、cacheの正式receipt参照0、削除前lsof対象open0。[事前分類](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/visibility-two-cues-post-manufacture-v001/scratch-cleanup-classification.json)と[事前ledger](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/visibility-two-cues-post-manufacture-v001/scratch-cleanup-before.json)を固定。

同03:30:01の整理後確認loopがcacheにもPNG専用fieldを要求するKeyErrorで止まった。削除24件は予定どおり終了し、そこで範囲を広げず、03:30:44に14保存primary・KEEP10file・6正式JSON・MP4 identity・HTML/2clip byteを読み返す限定確認でpassed。[初回結果](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/visibility-two-cues-post-manufacture-v001/scratch-cleanup-result.json)を上書きせず、[修正再読](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/visibility-two-cues-post-manufacture-v001/scratch-cleanup-readback.json)を別保存。製品code変更/追加削除/媒体生成/QC反復0。固有複数行mask8枚とlayout JSON2件（計4,656,298B）、正式primary/base/元媒体/STT/旧動画/代表画像/監査証拠はKEEP。空き変動は他の割当もあるため2.4MBを物理空き増加と同一視しない。

03:30:44の空き: guest84,727,623,680B・host1,982,829,428,736B・内蔵15,431,106,560B。03:31:22の[process再読](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/visibility-two-cues-post-manufacture-v001/closing-process-readback.json)で製造/正式utility残存0、今回ページserver PID90370/127.0.0.1:60161と旧PID54217:63610/68661:49504をKEEP、今回URL HTTP200確認。専用検証browserは終了。

閉じ記録直前main `6a855415`/Git clean/untracked0、remote main一致。今回のGit差分はこの新session logとCURRENT_GOAL/HANDOVERの現在地だけ。製品/契約/Goal方針/work-order/他session変更は混入させない。明示3pathだけstageして通常commit/push、最終remote一致とcleanを報告で確定する。

## 次状態

今回依頼は完了。次担当は親mona（本人へ結果と未評価を伝え、必要な次指示を扱う）。現在のMac実装者は今回URLを保持し終了する。既知同期問題の追加調査・補正・新製造・新検査・新UI・全字幕採点へ自動着手しない。
