# 9の後続 — 144px適合診断の受理と不適合98表示単位だけの再調整

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：前件 decision: accept。次の限定候補作成 decision: continue。
基準main・監査対象：ebc2269f382718e8c04a8ce2bd9176298592806b
担当：Codex2。同じ専用Edgeで本返信全文を受領し、同じセッションで続行する。
承認根拠：kawafmm承認済みID9主線と「終わったら次に進んで」に基づき、本書の既存一計画・既存144px/A技術候補に限る新要求作成・98件の表示再判断・保存検証を明示的に許可する。旧診断scopeを遡及変更しない。一般本適用、最終style/縁の人間採用、背景製造、動画実行、費用、公開の権限は付与しない。

## 1. 前件の監査・accept

**144px技術候補と保存表示回答の適合診断を技術完了としてacceptする。必須の追加修正はない。**

同SHAのcheck-style.mts全文、README、evidenceのscope/失敗/受領/起動/検査/出力と区間別結果、commit差分を照合した。現行表示Skill/回答validatorの入力・来歴検査も確認した。相談役がMacのignored runtimeを直接実行・全bytes再hash・描画観測したものではない。

- 218表示単位/289行/3,613atom、9保持区間、本文・cue末・行末・所属・順序・計画frameは不変。
- 144px、A=border8/glow4、1920×1080、safe左右4/上下40等を一つの保存Normal候補のpropsから使用。適合120/不適合98/評価不能0。全98件はLAYOUT_SAFE_AREA_VIOLATION、右端超過116行、他方向超過・行数超過・行間正面積重なり0。
- 要求別適合/不適合は9/5、19/17、0/5、41/26、21/20、8/7、6/5、7/6、9/7。全量をそのまま流用できる旧responseファイルは0だが、120cueの判断は保持できる。
- 設営28のchild限定NODE_PATH、実import/export、strict型/run exit0、新小JSONの保存再読一致、読んだ48件/旧失敗5fileのsize/SHA不変を確認。媒体/フォントbinary・内容再判断・描画・新API/費用0。
- 診断：runtime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-003/compatibility.json、SHA eb7a7a69c97722fc8433f73d4dbfd7733125d652903498cc1642f036c5336525、2,377,757bytes。
- manifest SHA 948c1e11d2e6c6745c280f3c1797af956bd47a6b160810018525ba4b9516c02d。3file/2,391,237bytes。
- 製品修正6/設営28、設営26のMarkdown失敗、27のReact解決失敗、28の正常診断を区別して保持する。

これはdocumentなしNode推定幅による技術診断の完成。実glyph/raster/alpha、144px/縁Aの最終採用、表示時間・見心地・動画品質の合格ではない。v005、7bb5de02、4556e389、a98f569a、fda455c4、903d79b4のacceptは元範囲で維持し、再検証を要求しない。

## 2. 今回一件の終点

**新技術条件の9要求を準備するだけで止まらず、98不適合cueに限った実再回答、120cueの固定再利用、新候補全体の既存表示/領域検査、変更分の計画frame対応、保存後の一回の独立再読までを一系列で完了する。**

現物診断に由来する候補制約はmaxLogicalWidthPerLine=26、maxLinesPerCue=2、文字幅規則は旧入力どおり。26文字ではなく既存規則の論理重み26である。候補の使える幅1912px、stroke/glow分24px、padding計12px、1重み72pxから、26ではwrapper1908px、27では1980pxとなる。この同一候補の既存計算に整合する制約として用いる。係数/丸め/余白を独自に変更しない。

26は今回の入力候補条件であり、旧36要求、製品default、style registry/trust、rendererのmaxCharsPerLineを変更する許可ではない。正式assemblyのstyle一致要件を今回通過したと報告しない。実フォントでは推定より大きくなる可能性があり、実glyph適合は引き続き未確認。

## 3. 固定入力と新要求

入力はすべてread-only。
- 診断attempt-003のcompatibility.json/manifestは§1の実SHAで確認。
- 表示回答：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-004/manifest.json、SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88。
- 元準備：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/manifest.json、SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75。
- 計画時計：runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/cue-time-map.json、SHA 72eab2201c0bb3e918aabf314ec3c0613f61ef4641a20402db5e7316282a2761。manifest SHA 36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179。
- A候補：runtime/artifacts/caption-outline-comparison-20260929-v001/attempt-003/verification.json、SHA 2eb9421958f975f9fd0f5200626711c8b61d53fcbf6970b034d5c5ef9c456f0d、raster[tag=0-A,label=0].props。font台帳は診断の実参照鎖から小JSONだけ照合。font binaryは開かない。

新要求は、旧9要求の実bytes/SHAと意味入力・診断対象対応を確認した上で、メモリ上のcloneから別fileへ作る。既存digest-caption-judgment-display-request-v001の形状を維持し、変更するのは新しい一意のrequestId、input.styleLimits.maxLogicalWidthPerLine=26、実inputから再計算するinputCanonicalSha256だけ。taskDescription、2行制限、文字幅規則、candidateId/timelineSegmentId、plan/machineAdoption/meaningInputBinding、caption/atom/boundary IDと本文列は同一参照として維持する。意味入力を再製造しない。

新requestIdは今回の準備identityと要求順から決定的に作る。保存は既存formal serializerで行い、新しい実bytesからrequestFileSha256を計算する。旧要求を上書きせず、旧要求SHA/旧回答SHAを新要求へ付け替えない。既存assertCaptionDisplayInputV001とcanonical SHA検査を通す。

新manifestに、旧要求→新要求、新技術条件、A候補/font宣言/renderer/layout/text-metricsの実参照・SHA、今回scope、固定120/可変98の対応を束縛する。新manifestの準備用schemaは完成sourcePackage/renderer/通常queueを名乗らない。旧scope/承認snapshot/purposeは変更せず、本書のpath/実SHAを今回の候補再回答許可として別に保存する。

## 4. 再判断の範囲 — 120固定、98だけ可変

cueをordinalだけで識別せず、旧request binding、保持区間ID、旧cueのatom列/先頭・終端境界で対応する。診断結果から120固定/98可変を導出し、件数は照合値として確認する。コードへ対象本文・cue件数・総尺を固定しない。

### 固定120

本文、含有atom列、順序、cue終端、全行末、元ms/計画frameを維持する。隣の不適合cueと合体させず、別の内容判断をやり直さない。新要求提示後、元回答の該当cue部分と実来歴を確認し、新回答の一部分として再利用する。

新条件でのresponse全体は新規であり、旧responseファイルをbyte同一で流用できるとは報告しない。新responseのjudgmentNoteと別の対応表に、再利用部分と今回判断部分を区別する。旧result/token/traceはコピーせず、今回の新要求・全回答を実Skill/validatorへ通す。

### 可変98

各新要求が提示された後にCodex2が該当本文・前後文脈・候補境界を読み、意味を保って行末を再選択する。まず旧cueのまま最大2行・各26以内へ収まる区切りを検討する。収まらない、または意味の区切りとして不適切な場合だけ、その旧cueのatom範囲内へ追加cue境界を置く。単に文字数で機械折返ししない。

元218cueそれぞれの外側境界は維持し、98の内部にだけ必要な分割を加える。隣の旧cueへのatom移動・旧cue間の結合、固定120への侵入はしない。cue数・行数の新目標を作らず、218/289を完成後の固定値にしない。

本文訂正、言換え、省略、新句読点、boundary IDの創作は禁止。「読む必要がある文章でなかったら」という本人の条件を保持し、説明・因果・否定・言い直しを不用意に細切れにしない。原文STTの疑いを勝手に修正しない。26条件を満たすことを人間品質採用にしない。

許可された境界候補だけでは一つの原子断片が収まらない等の具体的不可能があれば、当該旧cue/atom・不足だけを相談役へ返す。validator緩和、font縮小、safe area変更で隠さない。

## 5. 実Skill・幾何・時計への接続

runCaptionDisplayBoundariesV001、assertCaptionDisplayResultV001、validateDisplayForAdoptionV001、readValidatedDisplayTracesV001をそのまま使う。judgeは新要求を提示してstdinを待ち、Codex2が回答した一件だけを返す。固定回答generator、新API/provider、未来回答の先送りはしない。ID整形・論理幅計算・固定部分の組立はコード補助可。

responseは既存のschemaVersion=digest-caption-judgment-display-response-v001、requestFileSha256、answer、judgmentNoteの4field。resultはcaption-display-skill-result-v001。WeakMap tokenをJSONへ偽装せず、保存時/再読時に既存validatorから作る。

全回答の本文/所属/順序/3,613atom被覆と26/2を既存validatorで確認。別の限定assertionで、固定120は旧cueと同一、全新cueは一つの旧cue範囲内、98の外側終端保持、候補6の三非連続区間/drop非混入を確認する。新しい汎用validatorを作らない。

表示結果の行はindexExplicitLinesV001で索引化し、同じA propsへ渡してbuildExactTextModel/inspectPresentationRenderLayoutV001で新候補全体を検査する。style・canvas・余白・stroke・lineSpacing・font宣言は変更しない。Node/documentなし推定幅でありfont binary/DOM/canvas stub/ブラウザ/raster観測は行わない。

新分割があれば、その子cueだけ元atomの最初/最後の元msから既存frameBoundaryWithVideoOffsetV001/sourceEndFrameBoundaryWithVideoOffsetV001と保存9mappingの同じ平行移動で計画frameを算出する。source clockは保存inspectionと元診断の照合済み参照を使用。無変更cueのframeは維持し、各旧cueの外側frameも保持する。新source/sample計算、表示延長、minimum-duration/読速閾値、separatorは作らない。zero-frame/区間外/順序不整合は隠さず具体的対象を返す。音声sampleと全体27,691frame/40,705,770sampleは不変。新時計も計画値で、完成timelineではない。

## 6. 補助・起動・記録 — 設営29

製品codeは変更しない。新しい薄い補助を作成・適用した場合だけ、個別承認の設営29として計上する。製品6/設営28、新二path初実装、全過去失敗とaccept、一般上限・強制停止・Codex自己承認権は保持する。本書は無制限の追加修正権を作らない。

許可するGit保存先：
- docs/reports/digest-caption-144px-reflow-20261003/run-reflow.mts（新一file。準備・対話回答・保存・readbackを明示modeで分けてよい）
- 同README.md、evidence.json
- CURRENT_GOAL/HANDOVERの自分の実行状態

新runtime：runtime/artifacts/digest-caption-144px-reflow-20261003-v001/attempt-001/

旧helperのrun/readbackは起動せず、既存の公開関数をimportする。既存reader/Skill/validator/renderer/新準備二path/通常factory/index/backend/shared、package/lockfileは編集・複製しない。必要な小さい対応・検査・保存の接着だけを補助に置く。

起動は確認済みworkspaceをcwdに、対象processだけNODE_PATH=既存runner/node_modules、node --import ./runner/node_modules/tsx/dist/loader.mjsを使用する。恒久export、install/update、新symlink、新resolver/loader/stubは作らない。既存moduleのimportを描画許可へ読み替えない。

実回答前に、対象補助の必要型検査、既存の実import/export、入力SHA・既存関数の返却shape、親directoryの実在/新先不存在、Markdownのbyte読取とJSON readerの分離を確認する。JSONは標準serializerで保存し、手書きescaped末尾を付けない。記録更新は単一writerとし、stdin返却後に同reportを並行更新しない。入力待ち中に別コマンドで記録する場合はclose後のJSON再読一致を先に終える。出力は排他新規保存、旧成果の削除/上書きはしない。

## 7. 保存・必要確認・完了

新束へ9新要求/対応新回答/result/trace、120固定/98変更の対応表、A技術条件参照、変更後の計画frame、全候補領域検査、manifestを保存する。詳細本文はignored runtime、Git report/evidenceは実path/SHAと要約中心。sourcePackage・正式instruction・renderer job・通常queue completeは作らない。

今回必要な確認は次だけ。
1. 新要求の26条件・実bytes/canonical SHAと元意味/旧要求/今回scope/style参照の対応。
2. 全9新回答の既存検査、120固定/98内だけの差分、全文一度被覆、領域検査と新分割の計画frame。
3. 最後に新しい別process一回。元小JSON・新保存要求/回答/resultを読み、内容判断なしに既存validatorからtoken/traceを再構築。固定範囲/出力SHA/本文/変更分時計/同じNode領域結果の一致と、読んだ旧小入力不変を確認する。準備の正常4工程や旧suiteではなく、新候補の保存再読だけ。

別の否定suite、全過去資産/旧失敗全件の再走査、旧52/9/15/19/4/111、旧7A/7B/QC、15分レビューの再実行を追加しない。来歴・固定範囲・geometryのassertionは新候補の通常受入検査として行い、同じことのための追加clone群を作らない。

新候補が検査を満たすまでの今回内容判断は許可範囲だが、製品/helperの別欠陥・追加権限が必要なら既存のGPT_DECISIONへ戻す。判断不能や不適合を隠して完了扱いにしない。固定120を再判断して解消することも禁止。

完成条件：9新要求に対応する全回答、120同一/98限定調整、全3,613atom/9区間保持、全候補26/2と同じNode領域検査、変更分の正しい計画frame、保存/独立再読/元小入力不変が成立し、本文修正/媒体/費用/製品変更0を記録すること。新cue/行数と最短最長/空白は観測値として報告し、品質閾値は作らない。残る物理glyph・読速・見心地・正式style/背景/後段/動画許可は別とする。

## 8. 境界・受渡し

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持する。既回答144px/条件付き分割/水色、縁未選択、B21論理不合格等の記録は変更しない。一般本適用や最終styleへの権限拡張として扱わない。

媒体/フォントbinary read/hash/copy/PUT、通常HTTP/backend/index runner、新API/provider/費用、STT/inspection/ffprobe、色・motion・アップの判断、画像/背景/音声/動画生成、SSD、削除、新queue/UI、本番/公開は禁止。小JSON/code/moduleの読取と指定新候補の作成だけ。

新しい実質問題がなければ、新要求作成→限定実回答→既存検査/時計/保存→一回の独立再読→担当のみ通常commit/push→Git状態/自分のprocess終了確認→専用Edge直接報告まで進める。要求準備だけの途中で新たな承認待ちを作らない。計算/再利用/判断整形/検査/相談役待機の時間を区別し、未計測は埋めない。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・144px候補への限定表示再調整

返信生成完了・全文読了まで同じ専用Edgeで受領して具体指示へ従う。本人への手貼り/転記/視聴/採点、Codex1起動、受領記録だけの独立commitは不要。完成後も背景/演出/動画へ自動着工しない。

発行時点：ebc2269fの診断完成とGit clean/process0はCodex報告・保存証拠。今回指示の受領、設営29の適用、新要求/再回答の開始・完成は未確認。相談役がMacのprocessを直接観測したものではない。
