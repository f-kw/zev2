# 9の後続 — 保存表示要求への実回答・検査・保存 v001

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：前件は decision: accept。本書の一件限定実回答は decision: continue。
承認根拠：kawafmm承認済みID9主線と「終わったら次に進んで」に基づく、相談役からの具体的続行指示。本書が許可するのは、以下の保存済み一計画・9要求への候補回答、既存検査、保存と再読だけ。準備作業の旧許可を遡及拡張せず、新しい今回scopeとして分離する。ID9-PD-01の一般委任、ID9-PD-02の動画許可、本番適用、人間品質採用は承認しない。
基準main／前件監査対象：a98f569aae8a12fe99a2c17314a802c1e1b6e275
担当：Codex2単独。同じ専用Edgeの返信全文を受領し、同じセッションで続行する。本人への再手貼り・通常技術事項の転記・Codex1起動は不要。

## 1. 前件の最終監査と受理

準備接続親指示と目的参照修正追補、a98f569aのreport/evidence、新純粋builder、準備reader、f5ca9bcbからの差分を照合した。監査はGitHub上の保存コードと実測証拠に基づき、相談役がMacのignored runtimeを直接再実行・全bytes再hashしたものではない。

**字幕判断入力の準備接続を技術完了としてacceptする。必須の追加修正はない。**

- 通常保存stateの承認snapshot、4成功命令、正規owner/依存鎖/共有resolver/小JSONの実SHAを確認する新準備境界が成立。
- 3,613意味atom、9group、9表示入力を保存し、既存assertCaptionDisplayInputV001を通過。candidate-0006の非連続3group、本文/元ms/共通発話/順序、drop3,460非混入を保持。
- 元時計27,691frame/40,705,770sampleは元byte参照のまま。新しいcue時計は未作成。
- 実在する旧正常658断片の純粋同等性、今回境界11拒否、別process再構築exit0、元JSON/既存実装54件不変を記録。初回の部分成立・exit1とattempt-002の成立は区別されている。
- manifest SHAは83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75。11file/2,591,297bytes。意味入力と9要求、元参照/style/親scope/修正後実装が対応。
- 対象型検査・preflight・準備/否定・別process再読はexit0。差分は担当6file、runner修正は承認済みの二行。既存製造/v005/Skill/validatorの変更なし。
- 新二path初回実装と製品修正累積6、設営19/20を区別。一般上限・履歴をリセットしない。f577bfbaと初回失敗runtimeは保持。

v005、7bb5de02、4556e389のacceptも不変。準備の受理を表示回答、完成字幕、動画、人間品質の完成へ読み替えない。前件受理のためだけの再試験・再commitは不要。

## 2. 今回の一件と完成物

**保存済み9要求の本文をCodex2が読み、意味の通る表示単位と行末を選ぶ実回答を作る。既存Skill/validatorで受理し、回答と結果を別領域に保存・再検査する。**

今回の完成物は「9要求に対応する検査済み表示回答の候補一式」。表示境界IDと行末IDまでで、出力frame/sample時計、字幕画像、完成source package、背景、演出、動画は作らない。

新しい選定、保持変更、STT訂正、字幕本文の言換えはしない。既存準備の再製造・v005追加試験も行わない。

## 3. 固定入力と読取

入力bundle：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/
manifest：同directory/manifest.json
manifest実SHA：83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75
意味入力実SHA：6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3
parameters：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/parameters.json
元state実SHA：c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c

新しいrunner準備moduleのreadPreparedDigestCaptionJudgmentInputsV001を、保存parametersと上記manifestBindingで呼び、意味入力と9要求をJSON-onlyで復元して使う。prepare関数を再実行せず、新依頼/通常queueを作らない。最初に一度復元した入力を9回答へ使い、各回答のために同じ準備試験を繰り返さない。

元bundle・parameters・state・親scope・追補・旧evidenceはread-only。要求のschema、ID、本文、taskDescription、styleLimits、inputCanonicalSha256と要求実SHAは変えない。元purposeの「今回は字幕・演出・動画を作らず」も不変に保持。本書のpath/実SHAを新回答manifestの独立した今回scopeとして記録し、旧承認や架空authorization.recordIdで代替しない。

## 4. 実回答と既存入口

使用する既存関数：
- runner/src/skills/caption-display-boundaries-v001.ts：assertCaptionDisplayInputV001、runCaptionDisplayBoundariesV001、assertCaptionDisplayResultV001。
- evals/clip_composition/adopted_media_manufacturing_v001.mts：validateDisplayForAdoptionV001、readValidatedDisplayTracesV001。
- 既存の正式JSON、file SHA/canonical SHA、安定したworkspace読取処理。

これらは変更・複製しない。既存の表示validatorは完成背景を引数に要求せず、今回の実request.inputとinputCanonicalSha256へ適用できる。assembleAdoptedCaptionCoreV001、buildAdoptedBaseMediaV001、render等は呼ばない。

各要求について次を行う。
1. Codex2がその実要求の全文・境界候補を読み、必要なら意味入力の元発話/保持理由を照合する。
2. 新しい一回答を作り、実request bytesのSHAと対応付ける。固定回答generator、文字数だけで一律分割する判断代替、旧回答SHAの付替えは使わない。ID列挙・JSON整形・幅の機械計算補助は可。
3. runCaptionDisplayBoundariesV001へ実inputを渡す。judge callbackは、そのinputを読んだ今回のCodex回答だけを返す薄い受渡しとする。callbackに渡ったinputが対応要求と一致することを確認する。新API/providerを作らない。
4. 結果を既存assertCaptionDisplayResultV001とvalidateDisplayForAdoptionV001へ通す。後者のresponseSchema引数は下記の新内部回答名を明示する。requestFileSha256は既存sha(formal(request))と保存実bytesに一致させる。
5. 全9要求の検査tokenからreadValidatedDisplayTracesV001でtraceを取り、回答/結果/traceを保存する。WeakMap tokenはJSONへ偽装保存せず、別processで再検査して作り直す。

今回の内部response envelopeは既存validatorの4fieldを厳守：
- schemaVersion: digest-caption-judgment-display-response-v001
- requestFileSha256: 対応する保存requestの実SHA
- answer: CaptionDisplayAnswerV001
- judgmentNote: 当該本文に対する区切り方と判断理由

これは公開API/schema改訂ではなく、既存validatorが受ける今回候補回答の識別名。resultは既存caption-display-skill-result-v001のまま。補足scope/style/元資料参照は別manifestへ置き、入力やresponseの厳密fieldへ勝手に追加しない。

## 5. 表示判断の条件

保存taskDescriptionとstyleLimitsをそのまま使用する。maxLogicalWidthPerLine=36、maxLinesPerCue=2、既存文字幅規則は今回の候補条件。144pxの正式styleや最終物理幅・表示時間・見心地が成立したとはしない。将来styleが変わった場合は、その時に今回候補の適用可能性を判断し、旧要求SHAを付け替えない。

既回答の「読む必要がある文章でなかったら」という条件を保つ。説明・因果・否定・言い直しなど、まとめて読んで意味を取る必要がある本文は、幅制限内で文意を保つ単位を優先する。短い反応も、すべて一文字単位へ機械分割しない。新しい一律文字数上限や時間閾値は作らない。

本文は原順・原文字列を完全保持し、表示境界候補からcueEndBoundaryId/lineEndBoundaryIdsを選ぶだけ。不要と思った語の削除、句読点の創作、STT修正、区間をまたぐ結合はしない。candidate-0006の3要求を一つに潰さない。全3,613atomを各所属要求内で一度ずつ覆い、dropや空白を復活させない。

旧7A/7B/147字幕は全文を再評価する別工事へ戻さない。過去回答を参考にする場合も今回の本文/ID/条件を実際に確認し、過去の人間肯定を新回答の品質採用に移さない。映像音声を見ていない場合のSTT・自然さの疑いはreportへ残すだけで、本人へ今すぐ視聴/採点を要求しない。

## 6. 実行補助と保存

製品code、新二path、既存Skill/validator、通常factory/index/backend/shared、rendererは変更しない。

薄い実行補助を作成・適用する場合だけ、今回の個別承認として設営21を計上する。現累積製品6/設営20、初回実装と失敗履歴は保持し、一般上限・強制停止・自己承認権を変更しない。別の独立した不具合をこの初回補助へ混ぜない。

書込み可能path：
- docs/reports/digest-caption-display-answers-20261003/run-display.mts：小JSON読取、実回答の提示/取込、既存Skill/検査、保存、readback modeのみ。
- 同directory/README.md
- 同directory/evidence.json
- 自分のCURRENT_GOAL/HANDOVER実行状態は実質checkpointで同期可。

要求・回答本文、結果、trace、manifest、実行記録の新保存先：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-001/
固定workspace内の親を先に確認・作成し、attempt自体は新規作成・既存拒否。旧attemptの上書き、EEXIST無視、削除・コピー復元をしない。原要求は入力bundleを実SHA参照し、複製しないでよい。

run-displayの明示modeで入力確認、回答の取込/検査、最後のreadbackを実行する。実回答は要求を読んだ後で新しいresponse fileへ保存でき、既存Skillに返すためのfile/stdio受渡しだけを補助する。通常runnerの起動、新transport/provider、汎用実行基盤を増やさない。

新manifestに、入力bundle/各request、意味入力、元scope、今回scope、style条件、新response/result/trace、実行したSkill/validator/補助の実SHAと受領HEADを結ぶ。機械検査受理はvalidated-display-for-review相当であり、正式caption-adoption/sourcePackage/renderer job/通常queue completeを名乗らない。

## 7. 必要な確認と終点

確認を今回の9実回答一系列へ限定する。
- 新補助のsyntax/必要型検査、実export、入力SHAと新出力不存在を小さくpreflightする。
- 全9回答を対応実要求へ既存Skill/validatorで通す。本文不変、所属/順序/全被覆、行数/論理幅、不要改行の拒否規則を維持する。
- 新しいfile受渡しが旧回答を付け替えない確認として、正常回答の小clone一件のrequest SHA差替えを既存validatorへ渡し、DISPLAY_PROVENANCE_MISMATCHを確認する。正式出力へは登録しない。旧11拒否や旧suite全体は再実行しない。
- 最後に別process一回。既存JSON-only準備readerで元入力を復元し、保存回答/result/traceの実SHAを確認する。新しい内容判断を呼ばず、保存resultを既存validatorで再検査してtoken/traceを再構築する。保存traceと完全一致、元bundle/state不変を確認する。合格印だけを読んで再検査済みにしない。
- 小reportへ9区間別cue数/行数、主要な区切りの理由、全本文被覆、未確認品質、実回答読了/判断/整形時間と検査時間を分けて保存する。固定の目標cue数は設けない。

全9件の回答と検査・再読が成立すれば「保存9表示要求への実回答・検査・保存完了候補」として監査へ提出する。準備接続のacceptを取り消したり、新素材/全編レビューを完了条件へ加えたりしない。

## 8. 保持する未承認と受渡し

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=nullを保持。ID9-PD-01/02、144px最終style/縁、既存色/強調/アップ/人間Pending、本番有効化、公開は別。

元MP4/PNG read/hash/copy/PUT、媒体解析/STT/inspection/ffprobe、通常HTTP、外部推論/API費用、新素材、cue出力時計、演出判断、画像/背景/音声/MP4生成、native QC、新queue/UI、SSD操作、削除は0。完成背景4参照、最終style/renderer束縛、後段読取接続、演出、動画許可は未解決のまま残す。

担当fileのみ通常commit/push、Git差分と自分のprocess終了を確認し、同じ専用Edgeから直接報告する。受領だけの独立commit、終了通知commit、本人への再手貼り/転記、Codex1起動は不要。新しい実質問題がなければ実回答→検査→保存→別process再読→commit/push→報告まで進める。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・保存表示要求への実回答

この報告後も返信生成完了・全文読了まで自分で受領する。今回の回答完了から字幕画像/演出/動画製造へ自動着工しない。

発行時点：a98f569aの準備接続は相談役accept。本書の受領、設営21適用、9実回答・検査・保存の実行は未確認。Macの実processを相談役が直接観測したとはしない。
