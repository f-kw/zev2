# 新素材SJvP9jhEdyI：一本の合成、代表確認、正式受け渡しの停止

状態：相談役待ち。動画の合成は済んだが、正式完了は未成立。本文に示す時刻はUTC。最終の実環境確認とGit状態は、同じdirectoryの実証拠JSONとsession work logを参照する。

途中物を含むSSD保存は、承認された6つの製品pathの限定接続で成立した。新しい原動画から通常計画を作り、20分53.966667秒の動画一本をSSDへ合成した。2026-10-04T11:54:57.305726+00:00、代表確認の資格情報を正式経路へ渡す部分で停止した。合成済みの動画、651枚の字幕画像、検査用画像、原本、ログを保持している。

## 成果と保存先

ユーザーが2026-10-04 05:29 UTCに指定した [原動画](https://www.youtube.com/watch?v=SJvP9jhEdyI) を対象とする。実指示IDは `Sentinel_24d44e15c2e48191a4d4aefe81a99466`。05:29は確認できた分精度であり、仮の秒を実受領秒として扱わない。旧動画の採用区間、字幕、許可、完了成果は流用・再製造していない。

原素材は54分50.174694秒、1920×1080・60fps、44.1kHz stereo。SHA256は `907de6d045d4c94cec8798bd1a1d9411a90675c08a1c1f809db72e3b9fd5b4d1`、1,016,332,396 bytes。通常経路で15候補を判断し、13採用・2棄却から31区間、5,450 atom、651字幕・1,042行、37,619frame・55,299,930sampleの計画を保存した。元本文・ID・順序・時計を保持し、順接続、identity crop、Normal、元音声で製造した。

実MP4は **617,257,203 bytes**、SHA256 **`6434a56b40e66212c5dd910638c33b73b53029d733592b0b77ca6aa03d4f18b8`**。正式公開前の作業領域にある。

`/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-v003/.render.presentation-renderer-v002-work-xnJorQ/publish/presentation-rendered-v002.mp4`

外付けの実体は `/Volumes/KIOXIA`（ExFAT）。今回専用の100GB上限APFSイメージを `/Volumes/ZEV-Digest-20261003-01` に接続している。既存SSD内容の移動・削除・全走査・format・symlink・一般ROOT変更はしていない。

製造中にSSDへ保存して再読した大きな途中物は、source snapshot 1,016,332,396B、video-only 569,161,074B、音声grid 1,160,773,632B、encode-input PCM 442,399,440B。合計3,188,666,542Bは基本媒体の検査後に既存Coreが自分の作業物として自動整理した。基本動画600,463,283Bは背景としてSSDから再読された。PNG、参照JSON、合成receipt、process/QC観測も今回領域に保存した。117,010,137,600B相当のraw YUVはpipeのみで、全frame dumpとしてディスクへ保存していない。保存の成功を、持続速度や全工程の成功保証にはしない。

## 実装と技術検査

今回のSSD接続は6製品pathに限定し、共有ROOT/trust/default/Python/renderer/QCを広げていない。対象44件、重複を除いた関連69件が成功し、正式Node20のshared build、runner/Remotionの型検査が成功した。旧保存計画の試験は6成功・1拒否で、旧凍結準備SHAと新実装SHAの不一致を正しく拒否した。旧証拠を書き換えて合格にしていない。[接続実装](guest-source-implementation.md)。

製造前の初回は起動scriptの相対path、2回目はassembly参照の4fieldと既存base-media契約の2fieldの不一致で停止した。経過は2.532秒と13.478秒、どちらも大きな媒体処理前。後者を承認済みrunner同pathで限定修正し、実保存されたmachine-adoption.jsonのpathとbyte SHAだけを渡す。回帰10件、shared build、runner/Remotionの型検査、diff checkは成功。実装SHAは `2399aa61e245da2506e2487943a24414097852cd`、mainへpush済み。[限定修正](approved-job-assembly-byte-binding-fix-v001.md)。

v003は651件の配置検査で違反0。字幕描画の5,730子処理は全てexit0、合成180区間も全てexit0で37,619frameを連続一回被覆した。その後のffprobe、音声payload、frame countの3子処理もexit0。ただし、その返却数値と正式な技術証拠は停止前に永続保存されていない。子処理の正常終了を、未保存の正式QC数値や全工程合格の代わりにはしない。

停止後の独立観察は実MP4のSHAと安定statを前後で再照合し、一回のdecodeで代表8枚だけを抽出した。MP4 headerは1920×1080、30fps、37,619frame、zero-origin。実PTSを予定frameへ照合、8PNGのSHAと寸法を固定した。この観察は正式QC・製造再開・資格mint・完了receiptではない。

## 正式受け渡しの停止と具体的な最小案

停止理由は `QUALIFIED_REPRESENTATIVE_COMPLETION_REQUIRED`。renderer側のnative ESM読込と、tsxがCJSへ変換したcallerのstatic importが、同じ代表確認moduleを別実体として読み込んだ。module内WeakMapの資格が相手へ伝わらなかった。実Node20＋既存tsx loaderで4関数のidentityがすべて異なることを一回の小さな読取probeで裏付けた。[原因と未保存範囲](new-material-representative-brand-failure-readonly-v001.md)、[実測JSON](new-material-representative-brand-failure-readonly-v001.json)。

通常接続の最小案は `evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts` の4操作を、rendererと同じ絶対fileURLのnative dynamic importへ統一すること。[未適用差分](new-material-representative-brand-failure-readonly-v001.diff)。WeakMap検査や承認・hash・保存先の検査を外さない。差分は未適用で、修正後の型検査・実行は未実施。

`renderer-result.json`、`result.json`、`representative-technical-evidence-v001.json`、正式 `render/` は無い。そのため既存の代表record登録・finalize/getは実行0。終了した処理の資格と未保存の状態は、callerの読み込み修正だけでは戻らない。

保存済み動画を正式経路へ戻すには、旧job/承認/実装/実停止/owner終了、MP4 receipt、元plan/本文/ID/時計、全PNGと必要な検査材料を束縛し、欠けた状態を既存検査で読み直す限定saved-failed-work入口が必要。rendererのprivate finish、callerの既存公開、approved runnerの旧失敗資格が責務候補で、新logical childを使う場合はCore bindingも具体化が必要になる。これは既存通常入口に無い追加契約なので、未実装・未起動のまま親へ返す。再描画・再合成が不可避とは断定せず、原本・receiptを偽造して再利用もしない。

## 代表8場面で実際に確認した内容

1/93/400/465/545/571/583/651の予定中央frameを、完成合成MP4から抽出して直接見た。全8枚で文字の欠けや画面外への切れは見つからなかった。6場面では白字と濃い縁が判別できた。ただしゲームの台詞欄、中央の敵の顔、人物の体、タイトル画面のメニューに大きな二行字幕が重なる場面がある。文字が読めることと、映像や元文章も見やすいことは別の評価。[8枚の実観察](new-material-eight-frame-actual-observation-v001.json)。

|出力位置|観察と作品への影響|
|---|---|
|13:52.933〜13:53.033、465「世界が終わる」|3frame・0.1秒で重要な危機の前振りを表示する。中央frameも薄い半透明。前の「ここで奴を」「食い止めなければ」と合わせても19文字が約0.367秒しかなく、単純結合だけでは読取時間を確保できない。直後の「いい雰囲気にしないで!」とのつながりを追加字幕で伝える上で対処が必要。元ゲームの台詞にも同文が見えるため、意味を完全に失うと断定せず、元台詞の継続表示と音声による補完は未確認とする。|
|18:05.867〜18:05.900、571「お!」|1frame・約0.033秒で薄い半透明。驚きの具体内容は次の「早速鬼がいるんじゃねえか!」で示され、読み逃した時の意味の損失は小さい。前の「何人いるの?」と結合して32frameにする局所案があるが、先行表示の自然さは未確認・未適用。|

薄さは、全体へ適用された既存4frame fadeの `min(1,(n+1)/4,(F-n)/4)` で説明できる。465は25→50→25％、571は25％だけ。651字幕中50字幕（7.68％）が100％へ一度も届かない。180合成区間の810個の字幕出現を静的照合し、元cueのphaseが保たれることを確認した。区間分割が時計をさらに短縮した現象ではない。数値は保存規則のalpha倍率で、完成画素を新測定した値ではない。[50件と規則](new-material-short-caption-opacity-readonly-v001.md)、[全体への照合JSON](new-material-short-caption-opacity-readonly-v001.json)。

## 元音声の確認方法と限界

raw alignmentには該当19文字が各20ms・score0となる保存時刻があり、normal化と30fps変換はそれを引き継ぐ。score0だけで本文誤認識や本当の発話時刻を確定しない。[前後・原時刻の調査](digest-new-material-short-cue-context-assessment-v002-20261004.md)。

親の後続指示に従い、元動画の実SHAを再照合し、source **38:42.8〜38:46.5** の3.7秒を16kHz mono PCMとして抽出した。59200sample・118478B、SHA `8133dae9d058607352b76d1ff76289ecc561f7302904e4819858a6cb69914196`。利用可能toolを音声/聴取/転写/再生で検索したが、聴取toolは無かった。実音声をfunctions.audioへ渡したところ **「audio content omitted because you do not support audio input」** と返った。ローカル再生だけで私が聞いた扱いにはしていない。[抽出の実証拠](new-material-short-clock-source-audio-v001.json)、[入力非対応の記録](new-material-short-clock-audio-access-result-v001.json)。

実発話の場所・内容は未確認。新STT/API、元時計・原本変更は0。「原時計保持」は資料保全と意味の捏造防止であり、誤時刻の派生補正を原理的に禁止する意図ではない、という親の訂正を受領した。実聴取を根拠に、必要な派生時計の最小訂正を具体化することが次の必要作業。現時計の単純結合やfade変更だけで重要一文の可読性が解決したとは認定しない。

全編の連続再生、通常速度での構成/テンポ・読了性、音声聴取、文字起こし発話照合、人間による品質本採用は未評価。8静止画を見たことは、これらの評価の代わりにならない。

## 制作負担と次の描画前に必要な対応

|工程|実経過|
|---|---:|
|新原動画取得|537.580秒（8分57.580秒）|
|原clock検査|565.448秒（9分25.448秒）|
|STT client/server|993.201秒 / 948.419秒。重なりと別時計を含み合算しない|
|通常計画|1375.450秒。3判断待ち1370.741秒を含む|
|字幕候補の準備〜採用固定|1603.606秒。並列判断と素材確認を含む経過で、人間労働時間ではない|
|正式製造v003の開始〜停止|08:37:15.299181〜11:54:57.305726、11862.006秒（3時間17分42.006秒）|
|字幕native工程|08:59:51.240〜11:29:25.819、8974.579秒（2時間29分34.579秒）|
|映像合成|1320.550秒（22分00.550秒）|
|停止後8枚の独立抽出|12:14:08.159551〜12:15:12.235964、64.076秒。実観察はその後別に実施|

651 primaryに加え、651 repeatと1042行maskを作り、Remotion描画2344回、alpha/boundsのMagick処理3386回、計5730childを直列に実行した。代表方式が省くのは後段の全件反実仮想比較であり、このnative重複検査は全件のまま残っていた。直近100cueは約13.915秒/cue、child部分約4.622秒、外側約9.293秒。旧372cueの約6.772秒/cueに対し、child平均はほぼ同じで外側が増えている。繰り返し資格確認、読取、起動の間隔が混在し、SSDの実IO速度やCPUの単独原因は計測していない。[時間の読取](new-material-render-speed-readonly-v001.md)。

次の描画前には、primary生成と代表だけのrepeat/mask検査を分け、実行済み・未実行の証拠を正しく表現すること、固定入力/実装と資源監視を保ったまま重複資格確認を減らすこと、browser共有を使うなら一時保存先を今回所有SSDへ正しく束縛することが必要。現jobの途中へ変更は注入していない。partial-primary再開案は親が今回採らないと決めたため未実装・未起動。広い保存/検査契約を無言で追加しない。

## cleanup、最終状態、次担当

基本媒体の不要な自己所有途中物3,188,666,542Bは既存Coreが自動整理済み。今回の手動削除は0。原動画、normal companion、STT、入力/承認、基本動画、合成MP4、651 native PNG、1693 repeat/mask、失敗owner/lock、receipt/log、8代表PNG、音声確認clipは監査・人間確認・限定復旧のためKEEP。失敗work/lockは復旧条件の証拠なのでcleanup pendingとして保持する。旧成果削除、SSD compaction、detachは0。自分の実行PID/PGIDは12:24:03.291622 UTCの実psで残存0。[終了観測](new-material-final-close-observation-v001.json)。

状態は**相談役待ち**。次担当は親mona。必要なのは、同一module読込の限定修正と保存済み失敗workの正式再資格入口の範囲判断、および実音声を聴取できる環境での発話位置確認。人間の過去レビューや全651字幕の採点は再要求していない。正式完成・品質本採用・公開は未成立。明示された次作業までは、新しい製造・全体再評価・派生時計変更を起動しない。

Gitの終了記録はsession work logと最終報告で確定する。この記録を、メイン相談役モデルが正常稼働している証明にはしない。
