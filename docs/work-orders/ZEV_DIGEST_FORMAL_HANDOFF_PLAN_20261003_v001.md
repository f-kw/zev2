# 9の後続 — 144px候補完成の受理と正式後段接続の実行案

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
監査対象：263dca50299650bca2393a2db24cd10d0050d09a
判定：前件 decision: accept。次の限定読取・実行案作成 decision: continue。
担当：同じCodex2。専用Edgeで確定返信を全文受領し、同じセッションで続行する。
承認根拠：kawafmm承認済みID9主線、「終わったら次に進んで」と今回の後段権限・元参照対応の具体化依頼に基づく。本書が許可するのは保存済み一計画の正式後段接続案をまとめる読取・記録だけ。製品実装、背景/字幕画像/動画製造、最終styleの人間採用、ID9-PD-01/02の一般承認を含めない。

## 1. 前件accept — 144px候補への限定表示再調整

**263dca50の候補一式を、親144PX_REFLOWの限定技術完了としてacceptする。必須追加修正なし。**

監査対象は同SHAのrun-reflow.mts全文、README、evidenceのscope/入出力/完了/再読記録、親正本全文、b44bbc56からの担当5file差分。相談役はMacのignored runtimeを再実行・全bytes再hash・映像視聴したものではない。

- 同じ9保持区間・3,613atomに対する新9要求は、新requestId・26論理幅・input canonical SHAだけを更新。旧本文/ID/参照/task/2行規則を維持。
- 固定120cueは本文・全行末・cue末・atom/元断片/発話・元ms/frameが同一。可変98cueのうち73件は行末だけ、25件は旧cue内二分割。新243cue/390行で旧218cueの外側境界を維持し、旧cue間移動・drop混入なし。
- 実stdinの今回回答を既存Skill/validatorへ通し、来歴・26/2・本文一度被覆を検査。同じA8/4・144px・1920x1080のNode推定領域検査で243passed/違反0。
- 子50cueだけ既存境界関数/保存mappingで計画frameを計算。他193cueの時計と元27,691frame/40,705,770sampleは不変。最短8/最長526frame・空白15件1,220frameは観測で、見心地合格ではない。
- strict型/preflight/run/独立再読は各exit0。再読一回で内容判断0、既存validatorからtoken/traceと対応を再構築。旧小JSON/code50件size/SHA不変。製品変更・媒体/font binary作用・描画・API/費用0。
- 製品修正6/設営29、新二path初実装と過去失敗を区別して保持。一般上限は変更しない。

固定成果：runtime/artifacts/digest-caption-144px-reflow-20261003-v001/attempt-001/
- manifest.json：04ad8b3f019d6afed4038f376e101d15e155cc7822a2527b46fcfbd5b5041e41、45,985bytes
- correspondence.json：950f1edf9ea2a6f4ae8b1b2991d78b1c706bbaf2bf8877d04dcf66df15ed98f5、2,045,952bytes
- traces.json：479107679f236221b198c59a0fef95495dbb5ecb1a75df922a700f6fb8b482b6、957,794bytes
- readback.json：e23018520f8bebe0d0827cdf1482c81e731c1b7e156e3fcd2a6fc1c4908ff158、618bytes

元scope a5833ba7c2ddb3890ebe7085ad6730bd16106939512fdd433a1ed2aec0358ea3を編集しない。前件の候補を再判断/再検査する指示は出さない。243は今回の結果で、製品既定や人間採用ではない。既存v005・7bb5de02・4556e389・a98f569a・fda455c4・903d79b4・ebc2269fのacceptを維持する。

## 2. 次の一件 — 実製造へ渡すための一案を完成する

**字幕の候補作成は閉じ、現在の保存束を既存の正式製造経路へ渡す接続差分・対象参照・必要な許可・容量条件を、一つの実行指示案にまとめる。**

今回の終点は、相談役が次の実装範囲を判断でき、本当に本人判断が要る製造許可だけを一度で提示できる具体案。『背景/style/ROOTが不足』という一覧の再掲で終わらない。4556e389の18項目対応表や今回の243件の診断を作り直さない。新helper/新検査suite/新候補は増やさない。

現物から確認済みの接続制約：
- adopted_media_manufacturing_v001.mtsのbuildAdoptedBaseMediaV001はsource snapshot copy/再inspection、背景・音声製造、manifest/receipt保存と一時work削除を含む。関数名だけで『保存物再利用の無作用処理』と扱わない。
- 同buildAdoptedCaptionInputsV001は完成baseの四参照をsourcePackageへ入れ、planIdからatom/boundaryを再構成する。保存意味入力・回答のIDを無言で再生成しない。
- 同assembleAdoptedCaptionCoreV001はbase.timelineをreadBoundで読み、resolved styleの幅/行数とsourcePackage.promptInput.styleLimitsの一致を要求する。現在候補26と旧profile36の違いをSHA付替えや検査迂回で通さない。
- buildAdoptedBaseMediaV001のapprovalRecordIdにはc.authorization.recordIdが必要。現承認snapshot・今回の計画/回答許可は動画製造許可ではない。

これらを根拠に、以下を一つの案として具体化する。

### A. 元参照と実呼出しの接続

今回manifestから意味入力・新9要求/回答/result・採否保持・edit plan・clock/保存inspection・正規依頼と所有者の小JSONを辿り、実path/SHAと呼出し側のfieldへ対応付ける。全旧資産の再走査は不要。

保存243cueを再判断せず、意味ID/断片ID/境界ID・9保持区間を保持してsourcePackage/selection/line/cue projectionへ渡す最小adapterを、file/function/入出力/保存先単位で提案する。既存正常処理を複製せず、変更が必要な接続箇所だけ示す。新たな製品codeは今回書かない。

ROOT基準readBoundと通常storeの論理参照/実保存先の橋を明記する。既存resolverとpath/owner/SHA検査を使う前提とし、旧context/planへ偽装したり、モジュール定数を書換えたりしない。新しいrequest/responseをもう一式作ることを当然の前提にしない。

### B. 26/2と144px/Aの候補style整合

推奨する一案は、この一計画の技術候補専用のstyle参照に26/2と144px/A8/4・既存font宣言を明示し、元のregistry/trust/defaultを不変にする接続。既存validatorがその候補束をどの正式fieldから読めるか、許されない変更がどこにあるかを実装から特定する。

これは提案であり、profile登録・trust変更・縁A選択・font binary検査・glyph描画の着工許可ではない。既存styleとの等値検査を削除せず、必要なら新しい限定scopeでの改訂事項として返す。36のままなのに26と一致したと扱わない。

### C. 完成背景四参照を作る最小の実行経路

9区間の既存製造jobと元素材/inspection、27,691frame/40,705,770sampleを基準に、背景media/timeline/generation-manifest/validation-receiptをどの既存関数が作るかを特定する。今回の基準は接続前計画どおりの順接続であり、separator/アップ/色/motionを新たに選ばない。

後で明示許可する初回統合候補は、まず同一Normal技術候補を接続する一案を推奨する。これは演出機能の廃止・完了扱いではなく、未接続の演出は別に保持する。

実装案は保存物の利用と必要な新製造を分ける。旧9:47背景/旧307PNG等が今回と同じものだとは扱わない。低メモリ既存実装を再利用できる部分と、元の固定plan/旧入力に結び付くため修正が必要な部分を限定する。架空base、仮SHA、passed receipt、実行可能jobを作らない。未製造のSHAは非実行の案の中で『未生成・実行後束縛』と明記する。

### D. 容量・停止・作業許可を具体化

対象は既知のworkspace/runtimeと、参照で特定した元素材・既存出力のみ。必要な既存pathのlstat/stat/realpathと同volumeのstatfs/df相当の読取だけを許可する。媒体内容のopen/read/hash/copy/PUT、フォントbinary読取、外部volume/SSD探索、削除はしない。

保存job/code/既測定から、source snapshot、作業video、PCM/audio grid、完成背景、字幕PNG、初回候補/必要再現確認の各保存物の生成者・寿命・同時保持を表にする。確定値/推定/未確認を分け、既存2x素材の試験条件を全編製造の必要容量と決めつけない。新容量閾値を制定・緩和せず、既存監視/停止条件と根拠を示す。旧12,933,283,840bytesは過去観測で、現在値として使わない。

既存buildAdoptedBaseMediaV001には再inspectionや一時workのrmがあるため、旧指示の『STT/inspection/削除0』のまま実行できるとしない。今回の将来実行案で必要な作用をすべて明示し、今回作成する一時物だけの整理と、旧成果削除を分離する。自分で作用許可を補わない。

### E. 許可判断を一度で返せる形

次の実装については、対象file/function・実装数・通常codeと既存凍結codeの扱い・必要最小検証・旧SHAへの影響を一案にする。字幕全再判断・v005再試験・新UI/API・他エピックを含めない。

次の製造については、この一計画のmanifest/素材/区間・採用する技術candidate・具体的作用・保存先・容量条件・停止/再開点を一つの許可候補へ束縛する。

相談役が既承認範囲で決められる技術差分と、本人専決の動画/媒体製造・新作用・任せる範囲を分ける。ID9-PD-01の一般本適用と、今回一計画の限定候補製造は別。『動画許可未承認』を架空recordIdで埋めず、相談役から本人へ上げる必要がある場合は、何を許可すれば何が出来上がるかを短い一問の案にする。Codexから本人へ確認・転記を求めない。

## 3. 今回の保存・検査

許可する成果は次の二つまでと自分の現在地更新：
- docs/reports/digest-formal-handoff-plan-20261003/README.md
- 同handoff-plan.json

新たなhelper・製品コード・fixture・test suiteは作らない。新しい設営30をこの文書作業へ自動計上しない。現履歴は製品6/設営29のまま。補助実装が本当に不可避なら、その不足と最小差分だけを相談役へ返す。

JSONは標準serializerで保存し、保存後の構文/参照確認だけを行う。今回必要な小JSON/codeの読取・実SHA照合・許可したmetadata観測・文書作成に限定する。旧helper run/readback、現243cueの検査・再計算、renderer/媒体製造関数は実行しない。全過去資産の再hash・新しい独立再読工事は不要。

成果の未解決欄は正確に残す。本文を読めない/参照不足なら、そのpath/fieldと、案のどこへ影響するかを示し、実行可能と偽らない。技術方式の選択を人間へ丸投げせず、推奨一案と選定理由を返す。

## 4. 変更しない境界・終了

presentation=not-connected / executionPermission=not-approved / humanQuality=pending / outlineChoice=null / ID9-PD-01/02未承認は不変。144px/条件付き分割/水色の既回答、縁B21論理不合格・未回答の他項目は保持。新たな視聴・採点を今回の前提にしない。

製品/既存Skill/validator/renderer/registry/trust/旧scope/元purpose・承認を編集しない。通常HTTP/backend/index runner、新API/provider/費用、取得/STT/inspection/ffprobe、媒体/font binary内容操作、描画/背景/音声/動画、SSD/削除、本番/公開は禁止。新作用は上記の既存path metadata読取のみであり、製造許可ではない。

読取確認→接続/作用/容量/許可の一案→二文書保存/構文と参照確認→担当のみ通常commit/push→Git状態・自分のprocess終了確認→専用Edge直接報告まで進む。今回の案完成から実装・製造を自動開始しない。

報告名：Codex2 GPT_DECISION＋NEXT_REQUEST｜9の後続・正式後段接続と限定製造の実行案

返信生成完了・全文読了まで受領する。本人への再手貼り/転記/視聴/採点、Codex1起動、受理だけの独立commitは不要。相談役は案から本当に追加承認が要る部分だけを判断し、無関係な診断を増やさない。

発行時点：263dca50のpushと差分はGitHubで確認。Git clean/自分のprocess0はCodex報告と保存記録で、相談役のMac直接観測ではない。今回指示の受領・読取開始・案完成は未確認。
