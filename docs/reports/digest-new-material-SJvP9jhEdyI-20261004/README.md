# 新しい動画の準備とSSD保存先の接続

最新：親monaの技術判断で限定接続を承認済み。2026-10-04T07:02:57.513986+00:00に実装と対象検査を完了し、新しい動画の通常計画へ続行する。[実装・検査・保存先説明の訂正](guest-source-implementation.md)。以下は06:24の素材準備時点の記録で、相談役待ちは解消した。

最終素材・容量・process確認：2026-10-04T06:24:36.004588+00:00（UTC）。状態：**相談役待ち**。次担当：親monaが、以下の一媒体限定接続を技術判断し、同じMac実装者へ指示する。新しいDigest動画はまだ製造していない。

## 指示と今回の成果

本人2026-10-04 05:29 UTC「新しい動画でやって」への親の指示で、[新しい元動画](https://www.youtube.com/watch?v=SJvP9jhEdyI)を通常の取得手段で保存し、既存関数による映像・音声の時間情報検査と、既存LAN GPUでの文字起こしを完了した。親の補足から実messageId `Sentinel_24d44e15c2e48191a4d4aefe81a99466` を同じ素材へ結び付けた。時刻は親が提供した分精度として記録し、架空の秒・receipt・hash・旧承認を代用しない。追加の本人回答待ちはない。

素材は「【！？】『デス桃太郎』やる！！！！！！！！！！！！！！！！！！ぺこ！【ホロライブ/兎田ぺこら】」、Pekora Ch. 兎田ぺこら。公開metadataのupload日は2026-10-02。1920×1080・60fps、AAC 44.1kHz stereo、実container長3290.174694秒（約54分50秒）。元動画に合わせて新planを作る方針で、旧15:23・9区間・代表6件は新素材の条件にしていない。採用済み216px/左右108px/最大2行/縁8/glow4/Normalは後段への設定入力であり、今回の新素材品質採用ではない。

元動画は次に保存した。

`/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/source-acquisition-v002/source-video.mp4`

サイズ1,016,332,396B、SHA256 `907de6d045d4c94cec8798bd1a1d9411a90675c08a1c1f809db72e3b9fd5b4d1`。取得後、GPU投入前、処理後の再読で同じ実体を確認。素材・文字起こし・検査JSON・失敗と復旧の証拠は今回SSD領域へKEEPした。[実bindings・監視・容量の証拠](preparation-evidence.json)。

## 技術検査と未評価

既存 `inspectPresentationBaseMediaSourceV002` が 2026-10-04T06:07:31.897Z に成功。元映像197,406 decoded frame、30fps基準98,703 logical frame、元音声145,096,704 sample。これは元素材全体の時計であり、まだ選んでいないDigestのframe/sample数ではない。[保存した元素材検査](source-media-inspection.json) は2,789B、SHA `97ecbff86185ead665323fd9dc6a83ebd6ae4383933d9e5fc584a083e24168ea`。

既存GPU job `46b021574c1e455cbde89e2e81824d6a` は 2026-10-04T06:01:58.602937+00:00 に開始し、2026-10-04T06:17:47.022136+00:00 に完了。入力SHA・bytesは保存元動画と一致した。生応答と受付を残し、既存 `normalizeGpuSttResponse` / `assertTranscriptArtifact` により正規化・保存・byte再読・再構造検査が成功した。9,789件の時間付き断片・9,789グループ、ID重複0、時刻逆転0、元尺外0。話者分離は今回入力でfalse、server既定は変更していない。

正規化文字起こし：`/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/stt-attempt-v001/normalized-source-transcript.json`。1,489,253B、SHA `c082654ab253534b457d0ccf4a0256f71eb22cd35b4572144a5e174fc4ffe407`。元URL参照の独立した素材準備結果であり、normal workflow request/state/採択結果を作ったとは記録していない。後で実guest sourceURIを新normal draftへ固定する際も、生結果の出所を保持する。

正式Node v20.19.6・FFmpeg/FFprobe8.0.1・既存2fontの実byteと固定profileの一致も事前確認した。caption/planが未生成なので、今回の実glyph検査は未実施。**実音声との本文照合、場面の選定・つながり、通常速再生、全編視聴、音声聴取、人間の品質採用は未評価**。新動画の代表確認、技術QC、finalize/getは未着手。素材検査や小file試験を完成動画の成功と扱わない。

## 取得失敗と復旧

既存yt-dlp 2026.06.09の通常取得は 2026-10-04T05:42:23.981438+00:00 にHTTP403で停止（5.707秒、exit1、媒体未取得、own残存0）。ログをKEEPした。公式[2026.08.19 release](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.08.19)のUnix zipappを今回SSDの専用tool領域へ保存し、公式SHA2-256SUMSと実SHAを照合した。3,072,469B/SHA `1fa6733c37ea6fb51c99ad8fe785e7b7e5f3246c9b980230329d4fb72ed8d4d6`。

新zipappをsystem Python3.12で読んだ際のTLS issuer失敗は、既存yt-dlpが実際に使う同じPython環境で実行する補正で解消した。TLS検証、通常download flagsは維持。ログイン、cookie、制限回避、token手配、server/default/globalconfig変更は0。既存インストールは上書きしない。別の専用v002 attemptが 2026-10-04T05:56:28.848676+00:00 にexit0で取得・merge完了した。元signed URL等を含むraw downloader metadataはローカル証拠として保持し、このGit記録へ複製しない。

## 無変更で次へ進めない理由

通常経路は、元動画をrepoのsource-mediaへcopyし、さらにCoreのsource-snapshotへcopyする。JSON readBound/入力mappingとCoreの元source読取がrepo固定であるため、`ZEV2_RUNTIME_DIR`をSSDへ向けるだけでは通らない。repoに存在しない媒体pathを、実在するように宣言しない。

06:04:02 UTCの自分の1MiB実file試験では、通常 `COPYFILE_EXCL|COPYFILE_FICLONE`（flags3）はSHA一致で成功したが、copy分1,048,576Bの空きを消費した。複製必須のflags5は `ENOSYS` で失敗、destination未作成。このNode経路で容量不要のcloneができるとは扱えない。試験1MiBの結果を大MP4全体・持続速度・工程保証へ一般化しない。

|保存装置|実device / UUID|確認時の空き|
|---|---|---:|
|Mac本体|16777234 / `CBD5A285-2C2B-4C29-AC22-B1203674F3A4`|13,028,868,096B|
|今回SSD内APFS|16777243 / `7212F3BB-32FB-4F02-A71C-E570421FF2E0`|96,375,971,840B|
|KIOXIA ExFAT|16777238 / `0E5DC84B-1E22-3C9B-9E3B-220EBA8607C1`|1,989,503,090,688B|

Mac本体では２copy＋12GB reserveだけで 14,032,664,792B必要で、現在 1,003,796,696B足りない。別deviceの空きを足して判定しない。内蔵の一copy可否は時々刻々変わるが、必須の２copy分は足りない。大copyや通常Planner/製造を始めてから停止させる方法を取らず、まだ新draft・normal state・plan・job・grantを作っていない。

## 親へ返す具体差分

推奨は**正常な新Planner/consumptionは今回SSDで実行し、正常JSONの閉包だけをbyte同一でrepoへ保存、元素材１個だけは実SSD場所へ明示して正式に読む接続**。既存準備manifest SHAで場所まで束縛し、新しいjob input項目は増やさない。repoに媒体があるという偽記録は作らない。

必要差分は6path、概算140〜250行。prepareで一素材の実producer companionだけを許し、consumptionでSSD由来を正直に保存、caption manifestでその一個の実場所を宣言、approved-inputsでURI/SHA/size/owner/clock/storageを校正、private qualified storage contextでその一個だけを解決、Coreの既存source snapshotへ渡す。JSONのrepo読取、一般ROOT/default/trust、通常Python監視、renderer/caller、QC方法・閾値、代表pending/finalize/getは変更不要の見込み。

これは正式な保存配置・元媒体読取の契約へ接続する差分なので、通常copyバグとして自己実装せず、親へGPT_DECISIONを返す。[対象functions・実code SHA・拒否条件・検証案](guest-source-connection-draft.md)、[機械可読DRAFT](guest-source-connection-draft.json)。この案は未適用で、小fixture2系統・8caseと既存の代表pending/finalize/get回帰を推奨するが、未実行を合格と書かない。判断後の新jobは実指示ID、実plan/manifest、今回媒体/文字設定/root/device、変更後の実code/HEADを束縛する。旧job/grant、旧固有値の流用や検査免除はしない。

## 制作負担

|工程|今回の実処理時間と状態|
|---|---|
|初回準備・復旧|元tool取得403→公式専用toolと同Pythonへ補正。正式Node PATHもprocessだけ補正。調査/準備全体のactive時間は未計測|
|素材取得成功attempt|537.580秒（8分57.580秒）|
|元素材の全時計検査|565.448秒（9分25.448秒）|
|GPU文字起こしclient処理|993.201秒（16分33.201秒、input upload/待機/取得を含む）|
|場面判断・構成・新plan|未着手|
|Digest描画・合成|未着手|
|代表確認・finalize/get|未着手|
|人間の操作|今回の新素材指示1件。追加の回答・全字幕採点・過去レビュー要求0。active時間は未計測|

時計検査とSTTは並行だったため、処理時間を合算して経過時間としない。LANの既存RTX4090/Whisper large-v3を使い、新有料API/STT/subscription支出0。GPU電気代・既存Codex利用料金を含む全費用は未計測。今回の素材固有の製品code修正0、保存先への接続はDRAFTのまま。補助証拠収集の初回diskutil repo-directory照会は失敗し、実mount `/`へ一箇所補正して成功した。素材取得・STTの再送はしていない。

## 安全、整理、Git、次担当

取得と素材検査/STTでは、今回3device/UUIDの確認、SSD50GB開始、12GB reserve、next-unit見積、memory pressure1、RSS16GiB、1秒設定の観測、自分のPGID停止と残存確認を既存監視関数で使用。実観測間隔はdiskutil等の所要時間を含むため厳密な実時間保証ではない。各own groupの最大観測RSSは取得293,335,040B、時計224,477,184B、STT1,155,448,832B。各監視は自分のgroupが対象で、他groupも含む全processの連続ピークを証明していない。製造permitは発行していない。

clone probeの自作1MiB file2個と空dir2個を整理した（削除した論理サイズ2,097,152B。FS空きの厳密回収量は別観測）。取得mergeの自作断片は成功時にyt-dlpが整理。旧素材・旧成果・他session・既存lock・imageは削除0、mount/format/resize/symlink0。新元動画約1.016GB、STT/inspection/receipt/監視・失敗証拠、専用toolは後続/再現のためKEEP。owner PID/PGID8個と各監視shutdownで残存0を確認した。新たな整理対象は0。

このサイクルは新素材準備と停止根拠の記録であり、Digest製造の完了ではない。mainの入力実装SHAは `7193c53372efc1106dc89f77cbf1c5d1d3f8ff85`。製品実装変更0、今回product tests/typechecksは未実施（変更なし）、素材の実検査は上記結果。対象記録だけをstage/commit/pushし、remote一致・clean・untracked0は最終報告で実SHAを確認する。旧04:53の通常経路完成・旧15:23の受理成果は維持し、再開しない。

次は親monaの限定保存接続の技術判断。今回の実指示番号は解消済みで本人待ちにしない。判断後、同じMac実装者が限定実装・検査を経て新素材の正常Planner/Skills、正式一本、代表記録、再描画しないfinalize/getへ進む。必要な差分が案より広がるときだけ、具体箇所を返す。
