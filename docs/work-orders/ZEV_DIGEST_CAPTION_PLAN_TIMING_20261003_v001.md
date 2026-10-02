# 9の後続 — 表示回答候補の受理と計画frame時計への対応

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：前件 decision: accept。今回の限定診断 decision: continue。
基準main／監査対象：fda455c46a89318e063af79fdfb33753fd50de8d
担当：Codex2。同じ専用Edgeの返信全文を受領し、同じセッションで続行する。
承認根拠：kawafmm承認済みID9主線と「終わったら次に進んで」に基づく、本書に明示する保存済み一計画の媒体なし接続診断だけ。旧回答作業のscopeを遡及変更しない。一般本適用、動画実行、最終styleの人間採用は含めない。

## 1. 前件の最終監査・accept

保存9表示要求への実回答・検査・保存候補一式を技術完了としてacceptする。必須の追加修正はない。

監査対象のREADME、evidenceのattempt004Reuses/LineEndCorrection/BundleFiles/最終対照、実補助の保存・再読経路、61dd76d9からの5file差分を照合した。相談役がMacのignored runtimeを直接再実行・全bytes再hash・映像視聴したものではない。

成立範囲：
- 9要求・3,613atom・218表示単位/289行。既存Skill/validatorによる所属・順序・全文被覆・最大36論理幅/2行の受理。
- 1〜8の回答を同一要求にbyte同一再利用し、結果/token/traceは実処理で再生成。9は許可した一行末fieldのみ訂正。新response9 SHA 3b8157fe42cfe597d920479c9bec89539079bb0c07adc0a98da191fd53f23b7f。
- strict型検査/preflight/run/readback exit0。SHA差替えcloneの完全raw拒否と出力不増加。別processの内容判断なし再検査で保存SHA/trace bytes一致。
- 元21小入力/実装不変。旧attempt-001/002/003の5/43/8fileを保全。初回失敗、技術成功＋内容一点未達、記録整形失敗、今回完成を区別。
- 最終manifest実SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88。新束42file/2,923,632bytes、製品修正6/設営24を履歴保持。

完成は表示境界・行末の候補まで。物理style、表示時間の見心地、映像音声との一致、背景製造、renderer接続、動画許可、人間品質のacceptではない。v005、7bb5de02、4556e389、a98f569aのacceptも維持する。今回受理だけの再試験・再commitは不要。

## 2. 次の一件と選定理由

**既に決まった218表示単位について、保持区間の計画時計上の開始frame・終了frame・長さを対応付け、小JSONとして保存する。字幕内容は再判断しない。**

現行assembleAdoptedCaptionCoreV001は完成sourcePackage、base.timeline、style/renderer registryを要求する。mapPresentationSourceIntervalV002もbaseMediaを含む正式timelineを検査する。今回の完成背景4参照は未製造なので、この入口へdummy baseや仮SHAを渡して通さない。

一方、既存presentation_base_media_timeline_v004.mjsには純粋なframeBoundaryWithVideoOffsetV001とsourceEndFrameBoundaryWithVideoOffsetV001がある。既存mapPresentationSourceIntervalV002のoffset算術と、保存済み9区間のsource/output frame対応を用い、完成媒体とは別の**接続前の計画時計診断**を作れる。新しい時計規則・丸め規則・速度変更は設けない。

今回の成果は後段接続へ持ち越す入力対応であり、正式timeline、caption instruction、sourcePackage、renderer job、queue成果物ではない。最終styleの選択や背景製造を前倒し承認しない。

## 3. 読む実入力

- 表示回答：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-004/manifest.json
  - SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88
- 意味入力と9要求：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/
  - manifest SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75
  - meaning-input SHA 6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3
  - parametersは同attempt-002/parameters.json
- 元通常計画：draft_eCg3g-IMIzEWMtJuMyJWB。元state/採否保持/編集/clock-resolution/保存inspectionは上記準備manifestの正規参照と共有resolverから辿る。
  - 元state SHA c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c
  - 元計画27,691frame/40,705,770sampleを変更しない。

小JSONと実装だけを読む。媒体参照はmetadataとして扱い、bytesVerified=trueへ昇格させない。準備readerはJSON-onlyで一度使用してよい。保存response/resultのSHAと既存validateDisplayForAdoptionV001/readValidatedDisplayTracesV001で入力を確認することは今回消費の一部であり、内容判断や旧suiteの再実行ではない。

旧run-displayのrun/readbackモードは起動しない。旧readerが旧束へreadback.json等を書こうとする経路も使わない。新補助から既存の純粋検査・JSON-only readerだけを呼ぶ。

## 4. 計算と保存する対応

1. 各要求の境界候補と、対応groupのatomOccurrenceIdsを本文と順序で照合する。ID接尾辞の算術だけに頼らない。回答のcue終端/行末から各cueが覆うatom列と行本文を機械的に復元する。
2. candidateIdだけで結合しない。9つのtimelineSegmentIdと元断片列を維持し、candidate-0006の三非連続範囲を独立させる。3,613atomを一度ずつ扱い、dropや区間間空白を復活させない。
3. 各cueに含まれるretainedSpansの所属区間と元msの順序を確認する。同一の保持区間内の最初のsourceStartMs〜最後のsourceEndMsを使う。異なる区間をmin/maxで囲わない。
4. 必要な元動画clock fieldは、保存inspectionと既存projectAdoptedMediaRangesV001/既存境界関数の実定義に照合して取得する。sourceのfpsやpresentation offsetを出力30fpsから推測しない。
5. 既存frameBoundaryWithVideoOffsetV001、sourceEndFrameBoundaryWithVideoOffsetV001をimportして元frame境界を求める。終端特例も既存関数のまま。所属区間の保存mappingをMとすると、計画上の出力境界は既存mapperと同じ次の平行移動だけとする。
   - startFrame = M.outputStartFrame + sourceStartFrame30 - M.sourceStartFrame30
   - endFrameExclusive = M.outputStartFrame + sourceEndFrame30 - M.sourceStartFrame30
   - displayFrameCount = endFrameExclusive - startFrame
6. 正式timelineオブジェクトを偽造してmapperへ渡さない。元保存mappingの各source境界が既存関数による計算と一致することを確認してから上記を使う。zero-frame、所属区間外、順序不整合等があれば、丸め変更・字幕統合・時間延長で隠さず対象をunmappedとして記録し相談役へ返す。
7. 出力にはrequest/response/group/cueの参照、境界ID、atom/元断片列、変更しない行本文、元ms、元frame、計画start/endExclusive/durationを持たせる。frame時計だけが今回の新計算対象。元音声sample時計は参照のまま保持し、新しいsample計算法は追加しない。

これは元区間をその順に接続した計画時計。今後のseparator/transitionやcropを新しく選ばず、接続後の完成動画時計と呼ばない。隣のcue開始まで表示を勝手に伸ばさず、新しい最低表示時間・読速閾値・字幕数目標を設けない。

短い/長い表示やcue間空白・重なりは観測値として要約できるが、映像音声を見ていないまま見心地の合否を決めない。本文/行末/218単位を修正する権限は今回含めない。

## 5. 実装範囲・設営25・必要確認

製品code変更は許可しない。小補助と記録の許可path：
- docs/reports/digest-caption-plan-timing-20261003/map-timing.mts
- 同README.md
- 同evidence.json
- 新runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/
- CURRENT_GOAL/HANDOVERの自分の実行状態

小補助を作成・適用した場合だけ個別承認の設営25を計上。製品6/設営24、新二path初実装と各失敗履歴を維持し、一般上限・強制停止・自己承認権は変えない。通常caller、Skill、validator、準備二path、renderer、既存helper/readerを改変しない。必要計算の小さな接続以外に汎用readerや時計validatorを複製しない。

必要確認は今回の入力消費と時計対応だけ：
- export/親directory/入力の実SHA/新出力不存在のpreflightと補助の必要型検査。
- 全218cueの本文・行末不変/3,613atom被覆、元9mappingとの一致、区間内frame範囲と終端exclusiveを確認。218/289は今回照合値でロジックへ固定しない。
- 新しい小JSONの保存後再読一回で、計算したobject・保存bytes/SHAの一致を確認する。今回は正式製品readerではない診断なので、別processや新しい否定suiteを追加必須にはしない。
- 読んだ旧小入力/回答/実装の不変と媒体作用0を確認する。旧56fileや全過去資産の再走査を仕事へ追加しない。

新記録はcue-time-map.jsonと必要な小manifest/proofだけ。schema名に完成timeline/sourcePackage/renderer artifactを流用しない。原入力と本書のscope/実装SHAを別に記録する。既存の親scope/purpose/承認/要求/回答は変更しない。

## 6. 完了・不足の扱い

終点は、保存表示回答から各cueの計画frame対応を導出して保存でき、未接続の正式後段と区別した記録があること。既存18項目の対応表を一から作り直さない。

正式assemblyに残る完成背景media/timeline/生成manifest/検証receipt、最終style/renderer/font ledger、ROOT基準読取、動画許可の不足を短く引き継ぐ。今回計算値で背景receiptや許可を代用しない。値を供給できない場合は具体的な欠落field/実関数と最小の次差分だけを返し、無関係な工事へ広げない。

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持。物理styleや144pxの最終採用、縁選択、人間品質、本番・公開の承認ではない。

媒体read/hash/copy/PUT、通常HTTP/backend/runner、判断API/新費用、取得/STT/inspection/ffprobe、表示再判断、cue画像/背景/音声/動画生成、native QC、SSD、削除、旧suite/人間レビュー再実行は禁止。

新しい実質問題がなければ、計画時計対応→小保存確認→担当のみ通常commit/push→Git状態/対象process終了確認→直接報告まで進む。報告名：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・表示回答の計画時計対応。専用Edgeで返信生成完了・全文読了まで受領し、本人中継・Codex1起動・受理だけの独立commitは不要。今回の完成から背景製造・最終style確定・演出/動画へ自動着工しない。

発行時点：fda455c4の表示回答候補はaccept。本書の受領・設営25適用・時計診断実行は未確認。相談役はMacの現在processや空きを直接観測していない。
