# 9の後続 — 計画時計の受理と144px技術候補への表示適合確認

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：前件 decision: accept。今回の限定診断 decision: continue。
基準main／監査対象：903d79b43e0fa99d3a9f2e78881434afa8714dcc
担当：Codex2。同じ専用Edgeで返信全文を受領し、同じセッションで続行する。
承認根拠：kawafmm承認済みID9主線と「終わったら次に進んで」に基づき、本書が明示する既存一計画・既存144px技術候補の媒体なし適合診断だけを許可する。最終styleの人間採用、縁Aの選択、一般本適用、背景・動画実行を承認しない。旧scopeを遡及拡張しない。

## 1. 前件の最終監査・accept

**表示回答の接続前計画時計診断を技術完了としてacceptする。必須の追加修正はない。**

903d79b4のmap-timing.mts全文、README、evidenceの入出力束縛・終点・検査・観測、親ZEV_DIGEST_CAPTION_PLAN_TIMING_20261003_v001.mdと482245d3からの担当5file差分を照合した。監査は保存コードと実測証拠によるもので、相談役がMacのignored runtimeを直接再実行・全bytes再hashしたものではない。

- 9区間・218表示単位・289行・3,613atomを、本文・行末・所属・順序不変で対応した。候補6の三非連続区間を保持し、dropや区間外の空白を復活させていない。
- 保存inspectionの60/1・722,162 decoded frame・video offset 0msを確認し、既存の開始/終端関数による9mappingの境界一致を先に検査。既存mapperの区間内平行移動だけを使い、独自丸め・延長・新sample計算・仮timelineはない。
- unmapped、区間外、zero-frame、順序不整合は0。元27,691frame/40,705,770sampleは不変。
- 対象型検査/run exit0。新小JSONの保存再読一回でobject/bytes/SHA一致、読んだ95入力/実装のsize/SHA不変。媒体作用・内容再判断・旧suite再実行は0。
- 対応JSON：runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/cue-time-map.json、SHA 72eab2201c0bb3e918aabf314ec3c0613f61ef4641a20402db5e7316282a2761。
- manifest SHA：36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179。新3file/1,199,438bytes。製品6/設営25を履歴保持。

8〜526frame、区間内空白15件/1,220frame、重なり0は観測として残し、最低表示時間・読速・見心地の合否にしない。今回acceptは正式timeline/renderer入力/完成媒体の時計検証ではない。v005、7bb5de02、4556e389、a98f569a、fda455c4のacceptも維持する。受理のためだけの再試験・再commitは不要。

## 2. 次の一件と根拠

**保存した218表示単位・289行を、既存144px・縁A=8/4のNormal技術候補に機械的に当て、既存の論理領域検査でどこが適合し、どこだけ再準備が必要かを特定する。本文・行末はまだ変更しない。**

今回の表示要求は旧templateの36論理幅/2行で受理されている。一方、9/29の既回答は通常144pxを肯定しており、最終styleや縁の採用とは別である。

現行runner/src/telop/text-metrics.tsは、論理幅と同じ文字重みから estimatedWidth = weight * fontSize * 0.5 を計算し、ブラウザ実測がある場合もこれを下限にする。36重み・144pxでは文字だけで2,592pxとなり、1920px canvasに収まらない。36論理幅の受理だけで144px適合とはできない。これは既存コードからの算術上の判定であり、今回の各cueの実glyph測定ではない。具体的な不適合cue数は今回診断で初めて求める。

先に背景を製造したり、全字幕を白紙から再回答したりせず、既存の人間回答を問い直さずに、必要な変更対象だけを絞る。7Aや旧9:47案の検証をやり直す仕事ではない。既存18項目の対応表も作り直さない。

## 3. 実入力・技術候補の確認

固定の現在入力：
- 計画時計診断：上記cue-time-map.jsonとmanifest。実SHAを照合する。
- 表示回答：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-004/manifest.json、SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88。
- 元準備：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/manifest.json、SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75。

既存候補の一次根拠：
- docs/reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md：144px・条件付き分割の肯定と縁A/B未選択。
- 同verification.json：7Aの実style/geometry入力と検査範囲。ここにある4/4と、後のA=8/4は別版として扱う。
- 同current-inspection.jsonとcandidate-connection.json、既存入力対応mapping.jsonから、実際にA=8/4の技術候補に使用した保存style/canvas/layoutRules/renderer/font ledgerの小JSONを辿る。原則として一つの正常なNormal候補の束を使い、異なる版のfieldを無言で混ぜない。
- 比較の既知入口はruntime/artifacts/caption-outline-comparison-20260929-v001/attempt-003/verification.json。これや正規保存manifestの参照から必要な小JSONのみ確認してよい。旧動画・PNGは開かない。

既存A候補の完全な保存参照が欠ける場合は、正確な欠落field/pathを記録する。推測して値・許可・font ledgerを埋めない。欠落確認も今回診断の結果としてまとめ、媒体生成や本適用へ進まない。

今回使う144px/Aは比較用技術入力であり、正式default・style registry・trust・縁選択を変更する許可ではない。outlineChoice=nullを維持し、Bの既知21論理不合格は今回再試験しない。色やmotionの採否は今回の対象外。

## 4. 実施内容と既存関数

対象はNormal静止状態だけ。背景板、Color/Scale/Pulse/Bounce/Shake、アップ、separatorは適用しない。

- cue-time-mapの行本文・元断片/atom列・境界ID・group/要求/回答参照を、保存済み回答の対応先と照合する。計画frameは参照として保持し再計算しない。内容判断・再分割は行わない。
- 既存indexExplicitLinesV001（presentation_renderer_text_layout_v001.mjs）等で、保存された改行だけをindexedLinesへ機械的に対応させる。自動折返し・縮小・省略・句読点追加はしない。元本文と結合文字列の一致を確認する。
- 既存buildExactTextModel（presentation_renderer_entry_v001.tsx）とinspectPresentationRenderLayoutV001（inspect_presentation_render_layout_v001.ts）へ、同一の既存144px/A Normal候補と現在の各cue本文を渡す。overlay propsはこの小診断の実引数であり、正式instruction/sourcePackage/renderer jobを捏造しない。
- 既存位置・safe area・margin・stroke/glow・lineSpacing等をそのまま適用する。検査を通すためにcanvas/safe areaを広げたり、fontを縮めたり、Aを人間採用済みにしない。
- このNode実行はdocumentなしの既存推定文字幅経路。実フォントraster/alpha/実glyphの観測と区別し、フォント自体は開かずledgerの宣言/参照だけを小JSONで照合する。DOM/canvasのstub、新font測定基盤、ブラウザ・Remotion描画は起動しない。
- 各cueを列挙して既存検査のcode、lineRects/wrapper、入力style参照、どの行がどの条件に合わないかを保存する。通常の領域不適合をhelper実行不具合として初件で中断せず、全件の適合/不適合/入力不足を分けて収集する。予期しない例外は隠さない。

## 5. 終点と次差分の限定

新診断は全218cueについて、少なくとも次を返す。
- 既存144px/A候補のどの保存JSON/版/fieldを使用したか。font ledgerは宣言照合でありfont bytes未検証。
- 本文・行末・計画時計を変えない場合の、論理領域上の適合/不適合/評価不能と具体的根拠。
- 不適合cueを元の9要求へ対応付けた最小対象集合。再利用可能な回答と、新しい技術style条件で再準備が必要となる回答を分ける。
- もし新要求を必要とするなら、必要なstyleLimits/元style/実装/元本文の束縛と変更対象だけを一案として記す。新要求・新回答は今回は作らない。既存の36を24等へ単に書換えたり、旧request SHAを付替えたりしない。

**不適合が見つかることは想定された診断結果であり、今回作業の失敗ではない。** 全体を無理にpassedにしない。全cueの診断を保存して具体的な次差分が説明できれば今回の提出条件を満たす。既acceptの表示候補/計画時計は、その元条件での成立として維持する。今回のstyle差分を理由に旧回答を無効化・全再判断しない。

背景4参照・正式ROOT基準後段接続・ID9-PD-02動画許可は別不足として短く保持。背景製造や最終style選択を今回の軽微診断へ織り込まない。

## 6. 書込み・設営26・必要確認

許可path：
- docs/reports/digest-caption-style-compatibility-20261003/check-style.mts
- 同README.md
- 同evidence.json
- runtime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-001/
- CURRENT_GOAL/HANDOVERの自分の実行状態

小補助を作成・適用した場合だけ設営26を個別計上。製品6/設営25、新二path初実装、各失敗・受理履歴を保持。一般上限・強制停止・自己承認権は変更しない。製品codeと旧helper/Skill/validatorを編集・複製しない。

必要確認は、補助の必要型検査/既存export/入力SHA/新先不存在、既存関数での全cue診断、保存小JSONの再読一回（object/bytes/SHA）、読んだ旧小入力の不変だけ。背景・正式timelineを要求する旧consumer、旧run-display/map-timing、通常4工程を再起動しない。新否定suite・別process・全過去資産の保全走査を追加必須にしない。

診断中は出力先を排他新規作成し、旧成果を上書きしない。対象不適合とhelperエラーを分け、読取可能な一部だけを全件合格にしない。

## 7. 権限・終了

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持。144pxの既回答を再質問しない。縁、物理glyph、表示時間、映像音声、見心地、本適用の採用判定は行わない。

媒体/フォントbinaryのread/hash/copy/PUT、通常HTTP/backend/index runner、新API/provider/費用、取得/STT/inspection/ffprobe、字幕の内容再判断・cue/時計変更、描画・画像・背景・演出・動画、新queue/UI、SSD、削除、本番/公開は行わない。

新しい実質問題がなければ、入力確認→全cue診断→小保存再読→担当のみ通常commit/push→Git状態/対象process終了確認→専用Edgeで直接報告まで進める。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・144px技術候補と表示回答の適合

返信生成完了・全文読了まで受領し、同じ具体的許可範囲のcontinue/reviseを同じセッションで扱う。本人への再手貼り/転記/視聴/採点、Codex1起動、受理だけの独立commitは不要。

発行時点：903d79b4の計画時計はaccept。今回の指示受領・設営26適用・144px診断実行は未確認。Macの現processを相談役が直接観測したものではない。
