# 9の後続 — 実判断計画の受理・字幕演出入口の対応確認 v001

発行日：2026-10-02（JST）
発行者：ZEV Build Loop相談役
判定：前件は decision: accept。本書の限定読取準備は decision: continue。
根拠：kawafmm承認済みID9の主線と「終わったら次に進んで」、相談役による技術監査・次指示の担当範囲。本書は保存計画と既存入口の対応を確認する個別指示であり、字幕・演出の新規判断や製造工事、本番適用、動画実行の承認ではない。
基準main／前件監査対象：7bb5de02a59ab78cd7aae6757dff33b6b20f0b88
担当：Codex2単独。同じZEV Build Loopの本返信を全文受領して、この限定準備を続行する。本人への再手貼り・通常技術事項の転記を要求しない。

## 1. 前件の最終監査・受理

親指示 ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md の§6について、今回のreport、evidence、run-local差分、readback.mts、commit差分を照合した。相談役がMac上で再実行したものではなく、GitHubに保存された実装・実測記録に基づく監査である。ignored runtimeの全本文・媒体bytesをGitHubから直接取得したとは主張しない。

**通常依頼から実判断付きDigest計画を一件保存する限定作業は、技術完了としてacceptする。追加の必須修正はない。**

成立した範囲：
- 固定purposeが承認snapshot、通常4命令、探索・採否・保持の3要求へ全文到達。
- 発行された3要求のSHAと今回の段階別回答が対応。手渡し記録と通常registryの回答SHAも対応し、固定回答generatorや旧回答SHAの付替えを使っていないという実行記録を保持。
- 通常source/STT登録、prepare_digest_plan、validate_digest_planの4命令succeeded。Output/FileRefの正規所有者と保存bytesの参照が対応。
- 12候補を比較して7採用・9保持。親7,073断片をkeep3,613/drop3,460で欠損・重複なく被覆。追加挑戦の非連続保持を維持。
- 時計passed、30fpsで27,691frame、44,100Hzで40,705,770sample。15:23.033は接続前の計画時計であり、完成動画の長さを実測したものではない。
- 別processのreadConsumedDigestPlanV001でreused=true、保存artifactと一致、API/store一致・state bytes不変、exit0。再判断・再登録・renderなし。
- 設営17の実処理差分は親directory作成一行と記録追従。比較したcommit差分は5担当fileのみで製品code変更なし。初回f1d71624失敗を保持。
- 通常prepareの素材copyは一つ。作用直前17,754,804,224 bytes、終了時12,933,283,840 bytesは実行時の空き観測で、現在値を保証しない。

内容上の整理：既存15:23案の境界・順序・時計は維持された。これは再実判断で維持した範囲として受理し、内容品質が改善したとの数値評価にはしない。心霊回帰1364–1370は12番目の比較対象となり、不採用理由を保存した。映像音声・STT誤り・未見素材汎化・人間品質は未確認のまま。

時間はrunner430.243秒、要求読了・判断・整形・受渡し404.711秒、その他25.532秒。純推論・copy単独・全製品一発処理の速度としない。

前件成果：docs/reports/request-intent-real-judgment-20261002/{README.md,evidence.json,readback.mts,run-local.mts}。累積製品5／設営17。v005最終acceptも不変。受理のためだけの再実行・再commitは不要。

## 2. 次の一件と終点

**この保存済み9区間・3,613保持断片を、既存の字幕・演出入口のどの入力へ渡せるかを対応付け、不足と最小の接続差分を一案にする。**

今回作るものは、小さい入力対応記録と接続案だけ。字幕本文の新しい分割、強調・色・motionの新判断、字幕画像・背景・音声・MP4の製造は行わない。汎用adapterや新しいqueue工程も実装しない。

単なるファイル一覧ではなく、「現在の保存物のfield → 既存の消費関数の引数／field → そのまま使えるか／何が足りないか」を全経路で示すことが終点。

## 3. 固定する入力

- runtime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001/
- draft_eCg3g-IMIzEWMtJuMyJWB
- prepare：agent_xKOu8eZKSNa5viNENtJ4L
- validate：agent_wGiuVx5QiJvjGUxEW8Qxa
- digest-plan.json SHA：cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3
- digest-execution-input.json SHA：735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37
- state SHA：c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c

上記の現物はCodexのMacで小JSONとして照合する。実dataBindingsと既存の論理path resolverから辿り、pathを推測しない。採否・保持・時計・目的・承認snapshotは変更しない。旧回答SHA付替え、新依頼作成、通常completeの再実行はしない。

今回の媒体read/hash/copy/PUTは不要。既存consumer再読の完了を巻き戻さず、readConsumedDigestPlanV001が再び媒体hashを行う経路なら今回は再起動しない。保存計画・保存時計・保存inspection・STT・共通発話・小さいstyle/判断記録の読取とSHA照合だけを使い、今回の対応確認を製造資格の再検証とは呼ばない。

## 4. 調べる既存入口

起点として次の現行ソースを読む。CLIは実行せず、読取調査から呼出関係を追う。

1. runner/src/digest-plan-consumption-v001.ts
   現行計画から得たnew-material-digest-execution-adoption-v001、edit plan、manufacturing input、clockの意味と論理参照。
2. evals/clip_composition/run_new_material_digest_20260926.mts
   buildBaseAndDisplayRequests / acceptDisplayの既存経路。全体CLIを起動しない。
3. evals/clip_composition/adopted_media_manufacturing_v001.mts
   buildAdoptedCaptionInputsV001、validateDisplayForAdoptionV001、assembleAdoptedCaptionCoreV001。buildAdoptedBaseMediaV001、render、inspectionは呼ばない。
4. runner/src/skills/caption-display-boundaries-v001.ts と、上記が実参照する入力検査。
5. docs/reports/caption-readability-splitting-20260928/、caption-palette-20260929/、digest-structure-20260929/、integrated-preview-20260930/ の既存reportから、7A/7B/色・motionの正当な保存readerと採用可能入力を必要範囲だけ辿る。全過去工事を走査・再実行しない。

相談役の静的確認では、旧buildBaseAndDisplayRequestsは背景製造を先行し、buildAdoptedCaptionInputsV001はcaptionStyleTemplate、baseMediaInput、plan authorization等をsource packageへ束縛する。単なるclock表だけを完成baseMedia/timeline/receiptに偽装して通してはならない。candidate_digest_core_adapter_v001の旧固定plan専用入口へ現行通常依頼を装って渡すこともしない。

## 5. 対応記録に必要な内容

### 5.1 採用区間・文字の対応

9区間のcandidateId、segmentId、元断片列、元ms、出力frame/sampleを保存時計から対応付ける。3,613保持断片が対象で、3,460のdrop断片や区間間の空白を復活させない。採用候補と保持区間は一対一ではないのでcandidateIdだけを結合キーにしない。

文字・表示候補の入口までの対応を示すが、新しいcue/改行/強調判断はしない。時計が同じだから旧字幕のIDや回答をそのまま流用できるとは扱わない。

### 5.2 必須入力の不足

各fieldを次に分類する。
- 現保存物から供給可能（実path/SHA/fieldを示す）
- 既存成果からの再利用候補（同一性を判断する条件を示す。今回採用しない）
- 現在未製造／未接続
- 人間選択または動画実行許可に依存

少なくとも採用根拠、元STT/共通発話、保持区間時計、背景media/timeline/receipt、字幕style/renderer template、表示分割回答、演出回答、保存reader/実装版、許可とadmissionを含める。

### 5.3 旧成果の扱い

旧9:47・265字幕/307状態の素材、初稿15:31・326字幕、7Aの表示分割、構成改善局所5本・147字幕は別の版。数字や区間一致だけで全流用しない。照合可能な旧小JSONのみ読み、本文・元断片・表示境界・時計・style/renderer版・承認範囲の一致条件を明示する。媒体PNG/MP4の検証やcopyは今回不要。

144px・条件付き分割の既回答を保持。縁A=8/4は技術入力、outlineChoice=null、Bの21論理不合格は別件。水色肯定と色/強調の未回答も分ける。旧の18 Color範囲、固定アップ82frameを新計画へ自動移植しない。

### 5.4 次の実装案一つ

上の対応から、通常保存計画→字幕入力へ渡す最初の最小差分をfile/function単位で一案にする。製品codeを変更するならその対象と、旧live実装SHAの影響を明記する。今回は案を保存するだけで実装しない。

背景製造receiptや新しい許可契約が必須なら不足として確定する。仮の合格印・dummy base・旧sourceContext偽装・弱い検査へ置き換える解決をしない。「未製造が残る」は今回の対応調査が失敗した意味ではない。

## 6. 許可する書込みと確認量

docs/reports/digest-presentation-input-mapping-20261002/ 配下の README.md、mapping.json、必要な場合だけmap-inputs.mtsを許可する。大量の発話本文をGitへ重複保存しない。詳細なID列が必要なら専用の新しいignored runtime配下へ小JSONで保存し、reportからSHA参照する。既存attemptには書かない。

map-inputs.mtsを必要として作成・実行する場合だけ設営18の個別準備として許可し、製品5／設営17の履歴を保持する。文書だけで足りるなら設営18を実施済みにしない。一般上限・強制停止・自己承認権は変更しない。

補助は小JSONの読取・既存path解決・ID/時計対応と新しい診断記録保存だけ。製品関数の複製、新provider、汎用adapter、成功するためのfixtureを作らない。新記録の参照・一意性・保持被覆と保存後の小JSON再読を一度確認し、完成済みの各suite・通常4工程・元動画QCを再実行しない。

## 7. 完了条件と禁止事項

完成条件：9区間の入力対応、必須fieldの供給元と不足、旧成果再利用条件、最小接続案が実path/現行function/SHAへ辿れ、未知を未知として保存できていること。consumerを実際に受理させていない項目は静的対応と明記する。mappingだけでpresentation=connectedへ更新しない。

禁止：内容再選定、字幕分割や演出の新回答、媒体read/hash/copy/PUT、通常backend/runner起動、取得/STT/inspection/ffprobe、render/native QC、容量整理、SSD、追加削除、新API/費用、本番、公開、権限・検査緩和。現在空き12,933,283,840 bytesは前実走終了時の観測であり、新しい大容量工程の開始許可ではない。

技術上独立な読取準備に人間レビューは不要。ID9-PD-01/02、一般本適用、人間品質、動画許可は未承認を維持する。

## 8. 保存・問い合わせ

担当fileのみ通常mainへcommit/pushし、差分・Git状態・自分のprocess終了を確認する。CURRENT_GOAL/HANDOVERの自分の状態は実質checkpointで同期してよい。他担当のfileをstage/reset/stashしない。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・字幕演出入口の入力対応

専用Edgeで直接送信し、返信生成完了・全文読了まで受領する。本人中継・Codex1起動・受領だけの再commitは不要。新しい実質問題がなければ今回の対応記録と接続案の完成まで続行する。新しい字幕/演出実装・動画製造は次の明示判断まで起動しない。

発行時点：前件は相談役accept。本書の受領・設営18適用・実行は未確認。Macの現在process・空き・SSDを相談役が直接観測したとはしない。
