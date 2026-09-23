# 現行Normal再認定候補 — 技術完成報告

2026-09-17。branch `codex/current-normal-preview`、基点 `fda355f91149c286a1d11cfbea82d2afb42c3fa4`。

## 結論

**現在のproduction描画によるNormal確認候補を、動画1本（10.13秒）と明るい背景の静止画1枚にまとめた。技術検査は合格し、人間による採用判断待ちである。**

目的は現在のNormal字幕の位置・大きさ・見た目の再認定である。旧承認previewの完全再製造や新しい演出の採用ではない。現在の配置は旧承認previewより18px上という前工程の観測を保持し、旧画像へ合わせる補正を入れていない。

- [確認ページ](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/review.html)
- [現在の確認動画](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/media/current-normal-preview.mp4)
- [明るい背景での配置・視認性確認用](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/frames/bright-background-placement.png)
- [新しい候補の媒体・描画来歴](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/preview-manifest.json)。54,311 bytes、SHA-256 `3ff85ea8fb637f727dbf0fb7399744dac0891e080898fafa6bec4958fc7c0d08`。

人間への確認事項は「現在のNormal字幕の位置・大きさ・見た目を、今後の正式Normal基準として採用するか」の1点。旧候補とのA/B選択にしない。Color Accent / Scale Accentの既存採用は維持し、Panel / Pulseを今回の採用対象に含めない。

## 1. 今回の範囲と指示

ユーザーの継続指示により、通常の調査・実装・検査と監査checkpoint commit/push、同じ相談役への報告・次タスク要求が許可されている。前工程のpreflight受理後、相談役は現行Normal候補の生成から人間承認直前までを次タスクとして指示した。

旧素材の一部が許可された既知保存先に存在しなかったため、相談役の再開指示で、旧10場面11表示の再現から、既に利用済みのローカル素材で短い1行・横に長い1行・2行・明るい背景・暗い複雑な背景を含む新候補へ変更した。さらに明るい背景は配置確認用の静止画1枚でよいと回答を得た。各回答は同じMicrosoft Edgeの会話本文で完了を確認済み。

正式trustの発行、rendererの正式版変更、契約の18→19 pathへの改訂、人間承認の登録は今回の範囲外で、実施していない。候補folderの末尾v003は失敗出力を上書きしないための候補生成版であり、正式trust v003を意味しない。

## 2. 作った候補

### 動画

既存Digestの字幕なし基礎映像から3区間を抽出し、短文→横長→2行の順につないだ。字幕は既存Normal計画の本文、各文字と表示行の対応、表示時間長、正式表示状態を保持した。元の開始・終了frameは来歴として保存し、確認動画側の時刻だけを新しい区間の位置へ移した。Digest正本、Prospect、保持区間、元動画対応を更新していない。

| 見本 | 元字幕番号 | 元Digestのframe区間 | 確認動画のframe区間 | 表示frame数 |
| --- | ---: | ---: | ---: | ---: |
| 短い1行 | 20 | 3286–3346 | 0–60 | 60 |
| 横に長い1行 | 9 | 373–462 | 60–149 | 89 |
| 2行 | 19 | 3131–3286 | 149–304 | 155 |

frame区間は開始を含み、終了を含まない。全体は304frame / 30fps = 10.1333…秒。元の各表示期間にある出入り4frameの既存fadeを、現行productionの合成処理でそのまま用いた。

動画は4,807,825 bytes、SHA-256 `1f3533477fe56ab0bfc4ff1aa3f725a6e095d0eba7760492692907afaf37473c`。実復号の観測は1920×1080、30fps、304frame、H.264、音声AAC・44,100Hz・stereo。区間抽出・連結時のみ音声を再符号化し、その後の字幕合成は音声copy。合成前後の音声packet payloadは `57ef31d8acef20340217a56a489e3a858465d14c836e8727a40d6d9e19e3f22a` で完全一致した。元Digest全体との音声packet一致や新しい聴覚品質判断は主張しない。

### 明るい背景の静止画

利用許可済みの既存ローカル素材から得た1920×1080の代表画像へ、動画で使った横長1行の字幕画像をそのまま重ねた。新しい文面は作っていない。

**明るい背景での配置・視認性確認用**であり、その背景で実際に発話された字幕、音声同期、動画としての成立を証明する画像ではない。代表背景の輝度観測は平均150.951、暗い確認区間の代表画像は42.149〜48.5562。これは取得画像の観測値で、採否閾値や新しい係数ではない。実画像でも白い領域を多く含む明るい背景を確認した。

静止画は1,730,334 bytes、SHA-256 `9b1c5d7e06f44b14536924133fcb90529693a10196f7440a2f053175123a7531`。

## 3. 技術検査結果

| 検査した処理 | 結果と範囲 |
| --- | --- |
| 本文・行分割・表示時間長の保持 | 3字幕すべて一致。全文字の欠落・重複・変更なし。本文への新しい改行挿入なし。 |
| 現行の描画実装・正式設定の束縛 | 描画依存8件、補助実装4件、正式preset・配置規則、管理書体2件の現物SHAを照合。今回描画した書体はLINE Seed JP Extra Boldのみ。 |
| 実行環境 | 既存productionで使用した6 runtimeの実体SHAと一致。親Node v20.19.6、Remotion package 4.0.481。旧版CLIの終了形を新条件にしていない。 |
| 描画前の配置 | 3件合格・違反0。96px、上下40px・左右80pxの安全域、現在の位置を保持。 |
| 描画後の実画素 | 3字幕PNGと2行の各行PNGを検査。全て安全域内、2行は非重複。独立担当もPNG bytesからalphaを再計算し、保存境界と完全一致。 |
| 同一入力の再描画 | 短い1行を2回描画して全bytes一致。他2例の二重描画は未実施。 |
| 完成動画内の字幕存在 | 同じ合成条件から対象字幕だけを除いた映像と比較。全3字幕の代表frame 30 / 104 / 226で差を確認し、現媒体SHA・計画・全字幕・比較命令・証拠画像を同一実行へ束縛。 |
| 完成動画の最終QC | 既存の総合判定に全体証拠と各字幕の証拠を渡して合格・違反0。代表画像の字幕省略時との差は順に61830, 193578, 278397 pixel。 |
| 音声・frame数 | 304frame、30fps、1920×1080を実測。抽出基礎映像→字幕合成済み動画の音声payload完全一致。 |
| 既存物の保持 | 正式trust、描画8依存、書体、preset、旧承認preview等38ファイルを開始前後で再hashし、全件不変。追跡済みproductionコードの変更なし。 |
| 確認ページ | Edgeでローカル表示し、動画controls、直接リンク、明るい画像と用途説明を確認。ミュートで再生し10.1333秒の終端到達を観測。聴こえ方や人間採否の検査ではない。 |

完成QCは全3字幕の代表frameでの存在確認であり、全304frameのexact replay検査は実施していない。子RemotionごとのNode実体と起動時NODE_OPTIONSは独立観測していない。親Nodeの実体、明示したPATH先頭、指定runtimeの実体までを記録している。

通常jobの正式trust受入は今回実行していない。現行productionの描画・合成・QCの処理を使って人間再認定前の候補を作り、古い承認previewを現在の承認へ読み替えていない。

## 4. 失敗履歴と是正

素材確認の途中で、除外指定が効かない広い検索により、禁止退避folder内の4ファイル名が結果へ現れた。探索境界違反として停止し、証拠を保存して相談役へ報告した。禁止folderの媒体内容・hash・manifestを読み取ったり素材へ採用したりしていない。別の探索呼出しは中断前に開始されており、出力・終了を受領していないため「未実行」や「正常終了」とは記録しない。

相談役の再開条件に従い、該当する残存探索processがないことを確認した。素材参照は既知の許可対象だけとし、禁止pathを入出力前と解決後に拒否する処理を11ケースで検査した。検査中に実際の禁止folderへ行った入出力は0件。以後、新しい素材探索はしていない。元の停止記録を上書きせず保持している。

設営修正は2回。初回はRemotionの版確認CLIがhelpと終了1を返して描画前に停止したため、既存productionの実体path・hash照合へ変更した。2回目は配置検査に既存Reactの所在を渡す配線が欠けていたため、現行productionと同じ設定を渡した。失敗出力は各版で保持し、新しい出力先へ進めた。production修正、新依存導入、正式trust変更で解決したものではない。

明るい背景の相談で内部情報を含む最初の質問は自動承認審査に拒否された。ユーザーが既に許可した相談経路を再確認し、判断に不要な内部パス・素材識別子等を除いた技術質問を同じ会話へ一度送信して回答を得た。素材アップロードはない。

## 5. 保存と残課題

候補の動画・静止画・中間媒体・JSON・検査ログはローカルの隔離作業treeに保持する。今回Gitへ固定するのはこの報告書1ファイルのみ。媒体や元素材はremoteへ送らない。checkpointは監査用であり、正式採用・完成承認・stable昇格ではない。

追加API通信0、追加費用US$0、新素材取得0。main merge、tag、stable、release、DECISIONS、契約、Goal、work-orderの変更はない。

残るのは、現在のNormal候補の人間による採用判断。承認後に必要となる正式trustの新規参照、renderer版更新、契約の正本path上限18→19は、今回の技術完成で自動承認しない。相談役へ最終監査と次タスクを依頼し、第1層の判断前に正式発行へ進まない。

## 6. 根拠ファイル

下表はこの報告作成時に現物を読み戻して保存した参照。元の停止記録、再開指示、生成・検査の実入力と実結果を分けて保持する。

| 根拠 | bytes | SHA-256 |
| --- | ---: | --- |
| [consultant-direction-v001.md](/private/tmp/zev-current-normal-preview-r_87cdss/consultant-direction-v001.md) | 2,684 | `fed3ed49d7b0a657362ce8b68cc012cfe2b22f57acba2496ed57cfc894e34bb9` |
| [consultant-resumption-direction-v001.md](/private/tmp/zev-current-normal-preview-r_87cdss/consultant-resumption-direction-v001.md) | 2,628 | `0fb6e8a89dd2d546db57a9285d91bd75ed7c0b3df23f6e8c339c89c71a049165` |
| [consultant-bright-still-direction-v001.md](/private/tmp/zev-current-normal-preview-r_87cdss/consultant-bright-still-direction-v001.md) | 1,637 | `a440a8a21c5cfd0555cb5dd5e183dd85b1ba251e3f98a8adbf8b63db93def233` |
| [STOP-REPORT-v001.md](/private/tmp/zev-current-normal-preview-r_87cdss/STOP-REPORT-v001.md) | 4,013 | `fdd505ce9d51472855727856ec01192e95d815a03699362c48e012cde2ac8ae6` |
| [preview-source-search-incident-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/preview-source-search-incident-v001.json) | 3,185 | `e0534107efebb79bae24104ef2e966f54be0cf0fd5a4ed60edadf130d6c21a07` |
| [preview-source-search-incident-supplement-v002.json](/private/tmp/zev-current-normal-preview-r_87cdss/preview-source-search-incident-supplement-v002.json) | 5,476 | `0fff3bad37740b2057507d38b6682ea1627dfe32af9690cdcb61093263838013` |
| [stop-submission-record-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/stop-submission-record-v001.json) | 2,433 | `77d1b754c6a61ef7da3cfb2cd5dd02021b79349ebde603a7f4137a4fd3463380` |
| [interrupted-process-clearance-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/interrupted-process-clearance-v001.json) | 590 | `6ec6840aef6ce8ed276691df22125f0567ca631b7d9b531a0b950f4ce042004c` |
| [material-access-guard-v001.mjs](/private/tmp/zev-current-normal-preview-r_87cdss/material-access-guard-v001.mjs) | 8,968 | `27834e0453796270b378a161814351099dbc503309af555c4eb86d28a18b6a42` |
| [material-access-guard-v001.test.mjs](/private/tmp/zev-current-normal-preview-r_87cdss/material-access-guard-v001.test.mjs) | 6,968 | `b47ce5a3d22f8672e077982839d3a402e355494f689ab3fde50c7db2f6287549` |
| [material-access-guard-validation-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/material-access-guard-validation-v001.json) | 12,382 | `dfafe6cb4085c6f574729bd0df58fc6dc770c9848c202c0c1df92896bfca1b96` |
| [resumption-prerequisites-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/resumption-prerequisites-v001.json) | 1,580 | `de6748535b14dfa39fd26dda2f1d9bde5108f3bec02cdb75f5ab03b06db3015f` |
| [setup-correction-v002.json](/private/tmp/zev-current-normal-preview-r_87cdss/setup-correction-v002.json) | 641 | `85b27a503d11a6c45314ff6a7d4d1f5a6c402e0c23a01548b68cba8a72f9bea5` |
| [task-preview-caption-selection-audit-v001.md](/private/tmp/zev-current-normal-preview-r_87cdss/task-preview-caption-selection-audit-v001.md) | 7,251 | `b4b22de03f11a370009386f59febfc00aa3b24e17c310abf1c63f6922110d643` |
| [render-normal-overlays-v003.mjs](/private/tmp/zev-current-normal-preview-r_87cdss/render-normal-overlays-v003.mjs) | 10,301 | `ca037f9e6412c7abac4e18e2e3d4918fb03332457e5a6fe8e87374eccccfab9e` |
| [overlay-launch-observation-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/overlay-launch-observation-v001.json) | 1,156 | `ae636066d4f94ac2b01720f317579fe55e5501e60aa4eb1fa24316c763ab5b7a` |
| [overlay-independent-audit-v001.md](/private/tmp/zev-current-normal-preview-r_87cdss/overlay-independent-audit-v001.md) | 11,080 | `84bb233a0125b3181ee7a67f377f7d3221b780ee95d78fed1e89e92192b56773` |
| [overlay-independent-observations-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/overlay-independent-observations-v001.json) | 46,261 | `512bc6038745f96aac8864f51b952d68ca0c955047629c2b3b5dd640cfc5d6b0` |
| [compose-preview-media-v001.mjs](/private/tmp/zev-current-normal-preview-r_87cdss/compose-preview-media-v001.mjs) | 9,506 | `9f2129f3efd795c33e454e2b465fff332d4976d5066d13774714ca552e1db457` |
| [inspect-completed-preview-v001.mjs](/private/tmp/zev-current-normal-preview-r_87cdss/inspect-completed-preview-v001.mjs) | 22,094 | `6ff46ffe5e5cd0dd498f4424831909affe5141c35826a8be517943702445532e` |
| [protected-files-before-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/protected-files-before-v001.json) | 10,890 | `c14f5708103e5cdeedf3a78473598c70855012ce5237521b2fa80e495f3ac454` |
| [protected-files-final-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/protected-files-final-v001.json) | 25,478 | `9377fd401c7abaf3ec9c778b067f4ce00b67f39421c8f3a786956a7a8865a0c4` |
| [review-page-ui-observation-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/review-page-ui-observation-v001.json) | 1,013 | `d5e5bd122c039ac7ab5896984be615f1cc17ef285586dafc3830f207ce02b4c1` |
| [observe-existing-backgrounds-v001.mjs](/private/tmp/zev-current-normal-preview-r_87cdss/observe-existing-backgrounds-v001.mjs) | 3,806 | `30b7467c4971c63ec58bc75c7fc0d109b2be4ad0bc657f08ee896aaea5671fd3` |
| [background-observations-v001/observations.json](/private/tmp/zev-current-normal-preview-r_87cdss/background-observations-v001/observations.json) | 7,653 | `0fc7c8138654be82bc00a91e018fbfdde31fd70f3c3a5907c0743a0dcea16fd2` |
| [observe-bright-existing-source-v001.mjs](/private/tmp/zev-current-normal-preview-r_87cdss/observe-bright-existing-source-v001.mjs) | 3,325 | `37513edab4c234951078bdb55f076ae5e0011a7a86140093983838aa88055325` |
| [bright-background-observation-v001/observations.json](/private/tmp/zev-current-normal-preview-r_87cdss/bright-background-observation-v001/observations.json) | 3,077 | `6239e602c56b69187ee7d63666482b073313df3e3240c5b7bce904ddd186f634` |
| [finalize-preview-package-v001.py](/private/tmp/zev-current-normal-preview-r_87cdss/finalize-preview-package-v001.py) | 18,102 | `5a0ccbcb883eceb2c18c3205e2bb772a6669adde7508722d35d1bec929746bf5` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/overlay-package.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/overlay-package.json) | 86,709 | `5b0c9a2e82eb4b0c10c33705d6c8da4549ee4e633aee0fbed699a197cdb118ab` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/preview-plan.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/preview-plan.json) | 22,676 | `f035a029bf24519443acce22cfe217b864790cbb7be64f7543624230ff21311a` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/media-composition.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/media-composition.json) | 26,954 | `3968250d2688dec7eb19816e78670d42adc2880502c74c7e28b811931a06ae00` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/media-composition-invocation-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/media-composition-invocation-v001.json) | 519 | `ba91b9cc2eb283721cb5dc27a195a41f9672083446e6f238dc48e608f026addf` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-preview-qc-v001.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-preview-qc-v001.json) | 11,146 | `da8a95e039563783f900c7806bfaed133b51cc6bca686f0f23e4d351ad931b80` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/presentation-render-qc-v002.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/presentation-render-qc-v002.json) | 158,200 | `515abdd73291934c8b6cf8257e399bdd736feef5b1c5fdfafe165ba8e2652254` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/presentation-render-plan-v002.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/presentation-render-plan-v002.json) | 22,937 | `035a43a8115a2e9195779b3aa58e10abf034e5e20b64c10b1ca94a94d74d7161` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/presentation-render-application-results-v002.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/presentation-render-application-results-v002.json) | 3,016 | `b1f5b0c6a7d9bda1c7cdc8198bada562e2130f87fe07ed7c8f2d8919c803df30` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/review.html](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/review.html) | 3,216 | `4a4ff780bb74c55888e3e72aaf6e3d808e654608788715e73c856d435f67162a` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-qc-v001-BI9AKj/completed-frame-qc.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-qc-v001-BI9AKj/completed-frame-qc.json) | 469,991 | `a75dd17a3f7d28d1f73113ec6d7e6df4f93e9f2a3d33a36818b4b653c5f19238` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-qc-v001-BI9AKj/qc-records.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-qc-v001-BI9AKj/qc-records.json) | 71,521 | `580271e19b7040ef676d09046e9936c811a20a49eedc56659acff106367ee769` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-qc-v001-BI9AKj/input-file-refs.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-qc-v001-BI9AKj/input-file-refs.json) | 19,444 | `ca46cd0636f4f423a5bffda56a540e782b99d74e489278b577981e9a1749998c` |
| [worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-qc-v001-BI9AKj/process-ledger.json](/private/tmp/zev-current-normal-preview-r_87cdss/worktree/evals/clip_composition/outputs/presentation/current-normal-preview-20260917-v003/completed-qc-v001-BI9AKj/process-ledger.json) | 20,089 | `0a6459c3d1943b31d11ad4f9722e208abcd5ec95a4e76e2e5b3e0969b4d954e8` |
