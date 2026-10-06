# 字幕だけの修正で検査済み動画を再利用する改修 — 4製品ファイルの実装と限定確認を完了

本人の2026-10-07 00:26 JST「字幕修正の時間短縮は実行して。俺は寝るからよろしく」を親mona経由で受領し、保存済み最小差分案に沿う実装と限定試験を実施した。動画再製造の許可ではない。正式起動側の監視Pythonを含む4製品ファイルを実装し、関係する限定試験を完了した。親は監視側の提示4点を同じ目的の本人承認範囲と確認した。**実装の第一完成であり、実製造・短縮実測・作品品質採用は未実施**。既存fixture不整合による未合格は下記のとおり残る。

## 実装した範囲

- `runner/src/digest-approved-job-v001.ts`：明示された再利用manifestを今回のinput prefixへ固定し、正のサイズ・schema・bindingを検査。今回のauthorizationにも同じ参照が必要。専用helperの実装bindingを要求し、失敗作業回復との併用を拒否する。
- `runner/src/digest-approved-job-runner-v001.ts`：再利用指定時だけhelperを読み込み、既存のprivate storage/source qualificationを接続する。指定がなければ従来のbase製造。指定後に不一致があれば停止し、base再製造へ自動fallbackしない。予算は再利用copyの実サイズを下限にするが、既存監視・容量条件は変えない。
- `runner/src/digest-approved-base-reuse-v001.ts`：元job/auth/completed→invocation/manufacturing、completed→admission→renderer job/元4束、validation→invocation/adoption/editの13参照を閉じる。実原本と今回入力コピーのSHA/size/device/realpath/identity、全採用/ID/順序/区間/frame/sample/素材clock/geometry/audio/crop/接続、生成依存とNode/FFmpeg/FFprobe実体を照合する。元素材は本物のprivate resolverで実SHA資格化し、その観測identityを作用間に保持する。

- `tools/digest-quality/original-resolution-full-supervisor-v002.py`：再利用を明示したjobだけのinput/auth厳密集合、schema/正のsize/prefix、両記録の同参照とサイズ型、helper binding、回復併用拒否、既存稼働再読へ接続。通常経路と監視guardは保持。

元4ファイルは新outputへ排他的にコピーし、実byteを読み直す。元generation/timeline/validationの記録を変更せず、今回の再利用照合用receiptだけを別に発行する。原検査の継承と今回照合を分け、`videoQc/audioQc`再実行・新base生成・人間品質採用・実短縮を主張しない。Core/renderer/input資格基盤の製品変更はない。今回の製造job/auth、素材、保存計画、製造permitは新設していない。

今回入力準備では、明示manifestの`origin`と`copies`に13参照（approvedJob/authorization/completedReceipt/coreInvocation/manufacturingJob/machineAdoption/editPlan/admission/rendererJob/baseMedia/timeline/generationManifest/validationReceipt）を保存する。コピー先は今回input prefix内、原参照のSHA/schema/canonicalは維持し、実サイズを追加する。原本controlはrepo内absolute、原成果は元output prefix内で同じbound guest volume。今回ではこの正式入力束を作っていない。正常jobでは再利用fieldを追加する必要はない。

## 監視1ファイルへの整合と親の範囲判断

`tools/digest-quality/original-resolution-full-supervisor-v002.py`はTSとは独立した厳密job/auth検査を持つ。改修前360行のinput exact keysと416行のauth exact keysが新fieldを拒否していた。

[提示時の最小差分](/Users/kawafmm/Documents/Codex/2026-10-03/task-3/supervisor-base-reuse-minimum-v001.patch)は、再利用指定時だけinput/auth fieldを認識し、schema/size/prefix/同一binding、専用helper binding、回復併用拒否を加える。既存5入力の再読集合へ明示再利用manifestだけを加えるため、既存のvolume/ancestor/actualSHA/size/device/identity再確認が適用される。新command/監視モード、旧入力互換、承認省略、一般trust、50GB開始・12GBreserve・RSS16GiB・pressure1・1秒観測・next-unit+reserve・ownPGID停止には変更がない。

親が具体差分を確認し、提示4点を本人承認済みの改修と同じ目的に不可欠な検証整合として許可した。[親の範囲判断記録](/Users/kawafmm/Documents/Codex/2026-10-03/task-3/base-reuse-supervisor-scope-approval-v001.json)。その範囲だけ適用し、許可書側のサイズも型を含めて検査した（bool/floatの数値等価で通さない）。本人を起こす必要はないという親指示も維持。汎用ROOT/default/QC免除/実製造は含めない。

## 実施結果

- 最終限定試験：job/reuse/failed-work **55/55 passed**。このうち新reuse suiteは7testで、排他的copy/再読・未資格source・素材/input置換・reserve/出力拒否の7内部caseを含む。コピー試験の上流job/input/storage資格だけは専用childでモデル化した。本物のprivate proof/pins/copy/readbackを実行したが、正式grant/監視結合の合格ではない。
- 既存inputs：runnerのインストール済み依存を`NODE_PATH`で指定し **15/15 passed**。指定前8件の`react`参照エラーを記録し、依存追加・永続設定変更は行わなかった。
- runner main/RemotionのTypeScript型検査と`git diff --check`：passed。新コードimportも限定testで成立。
- 既存job fixtureは改修前4/14失敗（v001のまま）。関係するfixtureだけを現行v002の明示root/prefix/migration/code参照へ直し、製品で旧形式を救済していない。
- 既存record-finalize試験は **1/8 passed、7 failed**。改修前HEADのjob validatorを同じURLで読み込む限定baselineでも1/8/同じ7失敗（v001 fixture対v002）を再現。未合格として維持し、別fixture改修へ広げなかった。
- 既存storage-revalidation試験は **0/33 passed**、v001 fixtureが現行v002に拒否される。旧schemaを受け入れて通す変更は行わず、旧fixtureの整備へ広げていない。
- 未適用Python案の切り離した純粋設定試験：正常3、拒否10 passed、guard定数完全同一。提示時点の記録であり、適用後は下記の限定試験を実施。
- 追加Python suite **7/7 passed**：SSD上の小さい専用input/outputと実SHA/size/device/ancestor/identityを使い、実permit検証・稼働revalidateの追加fieldへ接続。上流Git/volume/image資格だけはモデル化し、controller/workerや製造grantを本番で起動・発行していない。通常/再利用、許可不一致/サイズ型/helper欠落/回復併用、実helper SHA変更、許可同byte置換、reuse byte変更、device/symlink拒否を検査。
- 既存owned process-group停止 suite **8/8 passed**：pressure/cancel/切断/観測失敗/残存子の停止と他群の保護。通常sandboxのps制限で8件未確認だったため必要権限で再実施し、own残存0を確認。新監視guard値へ変更0。
- 既存Python approved-job suiteは **5/49 passed、44未合格（33 failures/11 errors）**。同じ旧HEAD module baselineでも同じ結果を再現。v001/root/prefix等の既存fixture不整合を救済していない。失敗44件のtest名もmodule名を正規化したbaselineと完全一致。
- **2026-10-06 16:17:59.531 UTC / 2026-10-07 01:17:59.531 JST**に実原本13ファイル（base600MBを含む）と生成依存6ファイルをstream SHA/size/identityで再読、元31区間・manifest/timeline/hash graph・実ツール/生成依存の一致を確認。元media inspectionと同じeditを使った読取probeであり、現在の製造grant/source再資格化ではない。
- 独立read-onlyレビュー：第4path必要を発見。元素材identity持続の穴を3path内で修正し、再レビューで解消を確認。原本probeで見つけた生成wrapper参照のsizeも実size照合へ修正した。

動画製造/STT/API費用/全尺処理/PCM/PNG生成は0。実映像品質と実際の時間短縮は未評価。42分46秒は前回base工程の実測から見た削減対象上限であり、再利用の照合/copy時間を引くので短縮量を保証しない。

## 証拠

作業領域 `/Users/kawafmm/Documents/Codex/2026-10-03/task-3` に、承認原文・提示時patch・`base-reuse-final-focused-v002.tap`、`base-reuse-inputs-nodepath-v001.tap`、`base-reuse-record-baseline-v001.tap`、`base-reuse-storage-revalidation-v001.tap`、`base-reuse-typecheck-final-v002.txt`、`base-reuse-remotion-typecheck-v001.txt`、`base-reuse-real-origin-readback-v002.json`、`base-reuse-supervisor-ssd-v001.txt`、`base-reuse-supervisor-general-v002.txt`、`base-reuse-supervisor-approved-baseline-v001.txt`、`supervisor-base-reuse-proposal-check-v001.json`を保持。架空製造receipt/hashで未実施を補っていない。

## 次の担当と再開条件

次担当はmona。実装の第一完成を監査し、次に実製造を行う場合は今回source/全区間/時計が同じ新job・実authorization・入力束・実装SHA・output rootを具体化する。今回の改修承認で動画を製造しない。ボードDoneは実装/限定確認の終了を意味し、全既存テスト合格・動画製造・実短縮・人間品質採用は意味しない。旧fixtureの整備は必要なら別の具体範囲で扱う。

文脈改善は別TODO。元13:37.174〜16:34.402と25:53.819〜30:26.021を連続場面として再選定する案を保存したが、新計画への適用・正式cut・動画製造は未実施。選択区間が変わるため、その新計画へ旧baseは流用できない。既存の本人確認済みクリップや字幕採点を再要求しない。ボード番号/Chromeリンクは別repoの未着手TODOのまま。
