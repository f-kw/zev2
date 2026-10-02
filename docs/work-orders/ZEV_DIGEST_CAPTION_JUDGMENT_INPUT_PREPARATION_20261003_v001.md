# 9の後続 — 字幕判断入力の準備接続 v001

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：前件4556e389は decision: accept。本書の限定準備接続は decision: continue。
根拠：kawafmm承認済みID9主線、「終わったら次に進んで」、通常技術判断の相談役委任。本書で以下の準備用実装・検証だけを明示する。一般の字幕判断委任・製造・本適用を追加承認しない。
基準main／監査対象：4556e389fc6cb2a9933f98bd5d83716324ef8b01
前件正本：[入力対応](ZEV_DIGEST_PRESENTATION_INPUT_MAPPING_20261002_v001.md)
担当：Codex2単独。同じ専用Edgeで本返信を全文受領して続行する。本人への再手貼り・技術事項の転記・Codex1再起動は不要。

## 1. 前件の受理

report、mapping.json、map-inputs.mts、現行の本文準備関数・表示入力validator、9acea7e2からの5file差分を照合した。9区間・keep3,613/drop3,460・18入力項目、供給元/不足/旧成果再利用条件、最小案を示す入力対応作業は技術完了としてacceptする。必須の追加修正はない。

これはGitHubに保存された実装・実測記録の監査。相談役がMacの約1.01MiB診断や全媒体を直接再実行・再hashしたものではない。静的対応が完成したことをpresentation consumer受理へ昇格しない。

候補0006の3非連続保持、元断片・本文・時計、9区間27,691frame/40,705,770sampleは維持。旧7Bにない1,178断片、旧末尾48断片の除外、旧7A共通2,330断片と共通発話artifact bytesの差を残す。旧字幕・回答・307状態・18色・82frameアップを一括流用しない。v005と7bb5de02のacceptは不変。

## 2. 次の一件と提案からの変更

**既存の保持本文から、意味atomと区間別の表示判断要求9件を準備・保存し、別processで同じ入力を復元する。回答はしない。**

提案のうち、既存adopted_media_manufacturing_v001.mtsを直接編集する部分は採用しない。同fileをlive束縛する旧証拠への影響を避けるため、本文準備の必要な純粋計算だけを新規fileへ限定派生する。既存builderから新関数へ差し替える変更も今回は行わない。

新しい初回実装は次の2pathに限定する。
1. evals/clip_composition/adopted_caption_judgment_inputs_v001.mts
   buildAdoptedCaptionJudgmentInputsV001：元断片→意味atom→区間group→境界候補→表示要求という既存の純粋計算だけ。
2. runner/src/digest-caption-input-preparation-v001.ts
   prepareDigestCaptionJudgmentInputsV001 / readPreparedDigestCaptionJudgmentInputsV001：今回用の保存入力確認、上記呼出し、別領域保存、保存後再構築。

通常factory/index、backend、shared、既存製造file、Skill/validator、source package/renderer/native/registryは変更しない。既存readerの複製、新queue/API、汎用adapterは作らない。今回追加するものを製品変更0とは報告しない。一方、過去の製品修正累積5を新規実装と混同・リセットしない。

## 3. 許可・目的・styleを固定する

保存済み制作purposeの「今回は字幕・演出・動画を作らず」は不変。旧承認snapshotを編集せず、入力の由来として全文とSHAを保持する。

本書が許可するのは判断に渡すデータの準備のみ。本書のpath/SHAを新準備のscope記録に束縛し、元依頼の承認や旧製造authorization.recordIdの代用にしない。新準備の目的は「確定済み保持本文を、既存表示Skillへ渡す要求として組み立てて保存する。表示境界の選択・回答・描画はまだ行わない」。

要求のinput.taskDescriptionとstyleLimitsはmapping.styleCandidate.sourceTemplateにある既存promptInputの値を明示的な技術入力として使用する。元templateの本文captions・base・旧承認を持ち込まない。

template：evals/clip_composition/outputs/presentation/distant-connection-existing-caption-selection/candidate-doctor-disappearance-to-ogre-mother-v001/source-package-v001.json
実SHA：b291ac0fa3802ec030cae376c2cee3e68929b12552141ccdd5538bab022a1e69
styleLimits：maxLogicalWidthPerLine=36、maxLinesPerCue=2、characterWidthRule=U+0000..U+00FF=1; other Unicode code point=2

これらは今回の準備用参照であって、144pxの正式style・縁選択・人間品質の採用ではない。旧renderer template/trust/font ledger全体を採用したとしない。将来styleが変わる場合は新入力版を作り、今回の要求SHAや旧回答を付け替えない。新しい係数・色数・読みやすさルールを作らない。

## 4. 元入力と読取境界

既存runtime：runtime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001/
draft：draft_eCg3g-IMIzEWMtJuMyJWB
prepare：agent_xKOu8eZKSNa5viNENtJ4L
validate：agent_wGiuVx5QiJvjGUxEW8Qxa
state SHA：c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c
plan SHA：cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3
execution input SHA：735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37

reportの数字だけで入力を作らず、通常保存stateの正規request/Output/FileRef/ownerと依存鎖、共有resolverから小JSONを読む。元stateはread-only。readPrepared/ConsumedDigestPlanの全媒体hash経路は起動しない。

上記の固定SHAは今回一件の実行入力・試験側に置く。新関数の汎用ロジックへ今回ID・9・3,613・特定本文を固定して成功させない。新関数は明示された入力参照と期待SHAを検査し、今回の厳密な入力集合以外へ無断で範囲を広げない。

plan/execution、採否・保持・編集案、STT/共通発話、時計、準備/消費の小bindingについて、正規参照・実bytes SHA・版・完了状態・相互対応を確認する。元本文はSTTから取り、keep/dropと編集案を突き合わせる。bindingに元動画SHAがあっても「今回媒体bytesを再検証済み」としない。

使用する既存resolver/owner/入力validatorは再実装・緩和しない。source bindingの媒体実体を開かないJSON限定の新準備境界として記録し、製造資格には使わない。媒体検査をskipして既存readerがpassedしたと装わない。

## 5. 純粋builderと新保存物

元実装の本文準備部分は4556e389上のbuildAdoptedCaptionInputsV001を基準とする。元file実SHAはd51415f7d223ce885bf2f208f66d06d295ffd3c2fc708ef26955ed14929a4f2f。必要部分の出所と範囲を記録する。既存のassertCaptionDisplayInputV001、正式JSON/SHA処理は再利用する。validatorや製造コードは複製しない。

新builderはbaseMedia、timeline、manifest、receipt、人間承認record、renderer jobを引数として要求しない。これらをdummy/nullで既存の完成source packageへ通す処理も作らない。通常入力向けの明示parameterで、採用元参照・出力識別・保持区間・STT/共通発話・taskDescription/styleLimitsを受ける。旧固定contextのload/CLIを使わない。

candidateIdだけで結合せず、segmentId、順序、元断片列で9groupを組む。candidate-0006の3groupを保持する。sourceStartMs/EndMs→sourceInterval、segmentId→timelineSegmentIdの形の対応は可。本文・保持範囲・採否・時計を新判断で変更しない。

atomOccurrence/boundary/caption/request IDは今回の準備identityと区間順から決定的に作る。全保持断片を一度ずつ含み、dropや区間間の欠落時間を復活させない。境界候補の列挙とcue/改行の選択は別。各atomの新出力時計や接続後時計は算出しない。

成果は新しい専用領域：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-001/
旧attemptには書き込まない。新しい準備bundleの版と、元state/plan/execution/本文/style/本書/実装SHAを結ぶmanifestを持つ。論理参照と物理保存先の明示対応を保存し、旧requestの出力や通常queueのcomplete登録に偽装しない。

保存するものは意味入力、9表示要求と各実SHA、参照/許可範囲を持つ準備manifest。既存入力schemaに従い全9件へassertCaptionDisplayInputV001を実行する。schemaVersionのない旧STT/時計へ架空版を追加しない。意味入力等は新準備用の版を明示し、完成source packageやrenderer artifactを名乗らない。

statusは準備成立だけを示す。presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=nullを保持。source package、表示回答、cue/行末、画像、演出回答、native decision、背景4出力は作らない。

## 6. 確認量と完了条件

今回の小試験/読取補助をdocs/reports/digest-caption-input-preparation-20261003/のprepare-test.mts一件、README.md、evidence.jsonへまとめる。必要な別process readerは同testの明示modeで呼ぶ。補助を作成・適用した場合だけ設営19として個別計上する。製品5／設営18の過去履歴・一般上限・強制停止は維持する。今回許可した二pathの初回接続と、発生した不具合修正は区別する。

最初にsyntax/type-check、対象export、既存正常HTTPを使わないこと、親directoryと出力不存在を小さく確認する。旧成功試験を大量に再実行しない。

確認は次の四群で十分とする。
1. **今回入力の実接続**：新runner関数→新純粋builder→既存入力validator→保存を一系列で実行。3,613保持atom・9要求・区間順と本文/元msの一致、drop0混入、candidate-0006の3groupを確認。数字は今回の照合値であって製品定数にしない。
2. **限定派生の同等性**：実在する旧正常な小context/保存参照一例で、旧builderの純粋呼出しと新builderの対応するmeaning/要求の計算部分が一致することを確認する。旧baseの実在する4参照を旧試験側に使う場合もJSONだけとし、今回計画のbaseへ移植しない。新来歴の意図的差は比較対象から明示分離し、本文/順序/境界候補/styleを比較から除外しない。旧全体CLI・媒体readerは起動しない。
3. **今回境界の最小拒否**：別draft/owner又は参照差替え、欠落/重複/drop混入、本文又はstyle改変、未知版/未完了を小cloneで直接拒否する。適当に失敗すればよいのではなく対象条件を確認し、新保存物を増やさない。旧19件等を再走させない。
4. **保存後再構築**：別processの新reader一回で元小JSONと保存束縛から同じ意味入力・9要求を再構築しbytes/SHA一致、元state/旧成果不変、判断・登録・媒体作用0を確認。prepared印だけで合格にしない。新出力改変はreaderで拒否する。

旧adopted_media_manufacturing、v005準備/消費、既存Skill/validatorのbytes不変を記録する。新二pathと試験を対象に必要な型検査を行うが、無関係な全repo suiteや既存動画QC・人間レビューは繰り返さない。

## 7. 禁止・不足・次段との分離

元MP4/PNGのread/hash/copy/PUT、通常backend/index runner起動、source/STT/inspection/ffprobe、provider/外部推論/費用、実字幕分割回答、演出選択、背景/音声/画像/動画製造、新queue/API/UI、本番切替、SSD、削除、旧保存SHA付替えは0。

完成背景4参照、今回の表示回答、最終style/renderer束縛、ROOT基準の後段readBound接続、動画許可が残ることを明記する。今回は要求の準備までで、これらの不足を合格印で消さない。ID9-PD-01/02と既存人間Pendingは不変。144px・条件付き分割・水色肯定を問い直さない。

既存code変更が不可避、必要な純粋処理が存在しない、新たな製品契約/許可が必要と現物で判明した場合は、その一点だけGPT_DECISIONへ返す。同等性確保のために旧証拠や検査を弱めない。旧file編集を避けるための限定派生を、汎用reader大量複製へ広げない。

## 8. 保存・受渡し

担当pathは新実装2件、上記report3件、CURRENT_GOAL/HANDOVERの自分の状態のみ。旧reportは変更しない。大量本文/ID/要求はignored runtimeへ一度保存し、Gitのevidenceはpath/SHAと検証結果を中心にする。

新しい実質問題がなければ、実装→今回限定検証→保存再読→担当のみ通常commit/push→Git状態/自分のprocess終了確認→同じZEV Build Loopへ直接報告まで進む。受理記録だけの独立commit・終了通知・本人中継は不要。

報告名：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・字幕判断入力の準備接続

専用Edgeで返信生成完了・全文を受領する。本書の受領だけで実施済みとせず、次の字幕回答・製造工事へ自動着工しない。

発行時点：前件入力対応はaccept。本書の受領、新2path実装、設営19適用、9要求準備の完成は未確認。Macの実processや現在空きを相談役が観測したとはしない。
