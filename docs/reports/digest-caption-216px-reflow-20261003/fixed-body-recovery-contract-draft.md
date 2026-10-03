# 保存V2現物を使う限定復帰案（読み取り調査）

確認時刻: 2026-10-03T16:27:35.760569+00:00 UTC。repo/SSD/Git/プロセスを変更せず、描画・合成・QCの実行もしていない。差分はworkspaceの非適用・非実行の検討用ファイルである。

**結論:** 保存済みの372字幕PNG、372再描画照合PNG、668行マスク、全尺MP4から、必要な検査入力を復元できる。再描画・再合成が不可避とはいえない。一方、現行の正式Normal入口には、この失敗地点から必要な検査だけを再開する機能がない。実行するには今回一計画の新しい復帰接続を認める技術判断が必要。現在のDECISION 26行は「合成直前の接続とcaller伝達に限定」「executeDraw全体の差替えやrenderer/QCの作り直しは採らない」としており、この追加入口を既に承認された既存機能と呼ぶことはできない。本人の同じ素材・216px/108px・一本の判断を再要求する話とは区別する。

## 現物から確認できたこと

- 保存V2動画は598,323,447 bytes、SHA256 `9eea47be93c94cbe7c8b307642d0eb943fc2985445e607af65ff9133ab12ac56`。親の新しい読み取り証拠 `216-reuse-prerequisites-read.json` は既存404参照、372repeat一致、旧7コード/現在7コード、同じ許可・manifest・storage、372 layout props、旧owner終了を記録（SHA256 `dc88eb34300513001f36c1d4ce77e844f543cd2dfd37c33374f01f19db38e15c`）。この親証拠の検査結果は親から受領したものとして区別する。
- 私の新しい読み取りでは、元の描画request/timingを全1,412件照合した。primary372 / repeat372 / line-mask668、props・元出力pathの不一致0、欠落0、重複0、exit失敗0。line-maskは元propsの `inspectionLineIndex` だけ各行indexへ変更したもの。668保存マスクの現物SHA・size・deviceも記録した。証拠は `216-v2-saved-draw-provenance-read.json`（2,226,404 bytes / SHA256 `b6c60798d0d16bb4c56bccc1be66301671570fe30411f44ed18080b5b07515fd`）。これは今回新たに記録した由来の証拠であり、既存の復帰receiptやQC合格証拠ではない。
- `logical-inputs.json` の元element/props/canvas/layoutRulesとjob formatから復元したcommon planのcanonical SHA256は `42d3054bcd91fe290491661122f750d385dea84b9f837e1f3b8cd180ea6edea3` で、保存planCanonicalSha256と一致した。正式caller builderでも新しいjobから同じplan/props/全時計になることを実行前に要求する。
- reduced保存recordにはalphaBounds/propsSHA/overlaySHAはあるが、alphaMax・lineAlphaBounds・media数値・音声payload hashの完全な結果はない。実在するPNG/mask/MP4を既存inspect関数で再読して補う必要がある。数値や合格を定数で埋めない。

## 既存関数と使える境界

|場所|既存の境界|今回の用途|
|---|---|---|
|caller:246|export buildPresentationInstructionCommonCorePlanV001|既存admission/新lineLayoutから正式plan再構成。出力root・job ID・実装SHAはplan本文に入らない|
|renderer:841|export buildPresentationRendererOverlayAdapterV001|buildPropsだけ使用。画像生成は呼ばない。underlying overlayPropsFor(:790)はprivate|
|renderer:917 / :1303|export validateOverlayDeterminismV002 / buildPresentationRenderApplicationResultsV002|保存repeatと元PNGの実hash照合、適用結果の再構成|
|QC:841 / :933 / :940|export inspectOverlayPngWithToolV001 / inspectRenderedMediaWithToolsV001 / fileSha256V002|全372overlay/668line maskの実alpha、媒体・音声の既存検査|
|renderer:566 / :1864|export inspectFrameCountWithToolV001 / inspectPresentationCompletedFrameQcV001|全時計frameCountと既存encoded-omission-v2全372代表frame検査|
|renderer:2739|private finishPresentationDrawAndQcV001|既存completedQC・全372一意/順序の網羅要求・finalQcをそのまま使う。一般export化しない|
|renderer:1371 / :1646|export acquirePresentationOutputReservationV002 / commitValidatedPresentationArtifactsV002|新出力の所有lock・no replace・直前topology/ownership再検査・atomic directory rename|

`before-native-checkpoint` の既存read/resume（renderer:2667/:2719）はorchestration drawing view、passed exact replay、旧reservation所有を必須とする。今回はNormal/encoded-v2でcheckpoint自体がないため流用できない。Normal callerの公開は `commitValidatedPresentationArtifactsV002` であり、別入口の6-file manifest publisherを使う案ではない。

## 提案する最小の機能変更（4実装path）

1. **専用adapter `runner/src/digest-formal-handoff-v001.ts`:** 固定V2の失敗束、旧job/style/trust/base4、372manifest/9判断、旧7b6e実装・drawing8依存/font/runtime、全現物と由来、旧owner終了を再確認してのみ、新しいopaque storageContextへ固定recovery viewを登録する。一般のdescriptor入力を許さずWeakSet資格を維持。新proofは実読取SHAで保存し、旧lock/work/metadataはKEEP。新しいleaseとpermitが指すfresh固定v004だけに出力する。source/baseの旧参照は不変。
2. **Core `adopted_media_manufacturing_v001.mts`:** root allowlistへ固定 `/body-continuation-v004` 1 literalだけを追加。opaque資格・plan.outputRoot一致・generated path制限・serialize trueは維持。使用済みv003のmetadata no-replaceを破らない。
3. **caller `run_presentation_instruction_renderer_job_v002.ts`:** normal admission / runtime / font / code / source / clock / receipt / fresh lineLayoutを現行どおり再検査。その後、qualified recovery viewがある場合だけ限定renderer関数へ渡す。arbitrary capabilities/overlayAdapter/autopresentationの禁止は維持。成功は既存finishと既存commitに依存。結果にoldQC-source→新公開byteの対応receiptを添える。contextなしは既存executeDrawのまま。
4. **renderer `render_presentation_v002.mjs`:** 既存executeDraw/compose/QC/finish/publisherを差し替えず、専用の小さいwrapperを追加。adapter資格付き固定viewの実参照からstateを復元し、fresh reservation/stagingへ373現物をbit-exact copy、既存alpha/media/preflight検査、既存private finish→既存caller commitへ渡す。renderStill/renderLineMask/composeMediaは呼ばない。QCはserialize true / encoded-omission-v2 / 全372 / 全27691frame時計を維持。毎回371survivorsを使う既存手法と閾値を変えない。

差分案は `216-v2-fixed-body-recovery-contract-draft.diff`。資格部分の実SHAと許可を未確定のまま実行可能にしないため、新入口の冒頭とadapter未資格関数を明示的にthrowにしてある。非適用のレビュー用であり、実装済み・試験済みとはしない。draftは接続とstate復元を具体化したもので、厳密なadapter証拠検査の全実装を代用しない。

親統合時の修正：新renderer wrapperの資格reader importも、既に直したcallerと同じabsolute file URLの.ts参照にする。旧相対.js importを新入口へ再導入しない。node:urlのpathToFileURL importを差分案へ追加した。これは非実行draftの修正で、製品コード・動作確認ではない。

## 公開後も検査参照を実在させる

既存finishのQCはabsolute入力pathを保存し、commitのrenameはそれを書き換えない。新stagingをQC入力にして公開後にpathだけ書き換えると、保存証拠のhash/argumentsとの対応を失う。

今回の案は旧V2の保持済み実MP4/PNGをQC入力に使い続ける。freshv004へは同byteの新コピーを作り、373件の `旧QC入力path/hash → 新published相対path/hash` を新receiptへ固定する。finishのcurrentCompletedMediaRefも旧実入力path/hashを使い、既存検査はその現物を検査する。コピー後・QC後・commit直前に全コピーの実hash/sizeと元現物を再検査し、reservationの新owner/topology/no-replaceを要求する。commit後は新公開pathの実hashを再読してreceiptとの一致を確認する。旧QC sourceと旧workは削除しない。このbyte対応を新しい復帰契約の一部として正直に扱い、既存checkpointが存在したとはしない。

## 拒否条件と残る判断

- 元/新common plan・372props・element/ID/文字/改行/atom/clock/line mask対応の不一致、欠け、変化、font/runtime/drawing依存の不一致、旧ownerの生存、root/volume/device/permit/leaseの不一致、使用済み新出力、hash/size/path/symlink変化で停止する。
- 保存layoutの再利用は実sha/props/source/rules等値を新資格で要求する。もし既存layout CLIの再読を選ぶなら、それだけは親が実証した同SSD相対TMPDIRの短いIPC接続をcallerへ加える。QC-onlyのffmpeg/alpha再検査ではtsxを使わないので、このIPC修正を自動的な前提にはしない。
- 7実装hashは旧7b6eとfresh現在を別に束縛する。adapterの「i>=3は全unchanged」判定はrenderer新wrapperを狭いexactreverseで認める必要がある。callerも従来2行import逆変換に加え、新import/type/dispatch/reuse receipt/before-commitチェックだけをexactreverseする。Coreはv004 literalだけ追加したcurrent状態へ戻るexactreverseを検査。低メモリcompositor/supervisor/source-packageの3pathは不変、drawing8依存/fontも不変。hash検査を免除しない。
- 現在は最終QC失敗のまま。成功0sampleであり、全372QC所要時間/serialized first sampleの実性能は未確認。新入口の技術判断と実装・拒否試験・型検査・freshcurrentSHA固定を終えてから、既存QCだけを正式に実行する。初回1sampleも通常QCの最初として計時し、重い処理を止まっていると推測しない。
- 完成動画全体の実視聴品質、12f/15f/19fの可読性は未評価。今回の提案だけで品質合格・正式完成・再実行開始を報告しない。

親への判断依頼: この一計画・固定V2失敗現物・freshv004だけの新Normal復帰入口と公開byte対応を認めるかを、DECISIONのcompose段限定との機能差分として技術判断してください。本人の同じ素材・216px/108pxの承認を繰り返し求める一般質問は不要です。
