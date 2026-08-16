# 2026-08-15 夜間自走 朝報告 v001

## 1. 結論

主線は、F/U fixture製造独立工程の現物調査と契約設計v001を完了し、設計提示で停止した。実装・検査・API・描画・commit・tagは行っていない。

提示停止後の副線では、描画疎結合化の実現性/契約素材、分離rendererの表現力調査計画、字幕品質v002完了草稿更新、provider再評価在庫更新を、reports配下の新規文書だけで作成した。

## 2. 主線

### 設計文書

`presentation-zevo-caption-quality-v002-fu-fixture-manufacturing-contract-design-20260815-v001.md`

### 設計の意味

F/U test内でfixtureと環境を都度製造する構造を廃止し、正式fixture packageとreceiptを先に作る独立工程へ移す。productionが後段で導出するrenderer rootまで、共通path計算正本から600行へ閉じる。

### 固定した主要数値

- path: 17→19
- 新規path: 2
- 既存変更: 3
- payload: 44
- 公開file: 48
- environment: 600行
- retention: 26行
- code: 既存49不変+fixture固有4
- test ID: 46→48
- proof: 489→523
- API通信/費用/描画: 0

### 主線の要裁定

`要裁定`: 設計§18の承認または差し戻し。承認された場合のみ、19 path工事、fixture製造、F/U、正式48件、回帰へ進む。

## 3. 副線文書

### 3.1 描画疎結合化

`presentation-rendering-decoupling-feasibility-and-contract-materials-20260815-v001.md`

現caption/title/G4〜G7/preset/QCを現物照合し、renderer非依存instruction artifact、renderer admission、schema骨格、出口/入口検査、最低12 pathの工事下限、移行順、並列laneと競合pathを整理した。契約は確定していない。

### 3.2 分離rendererの表現力調査

`presentation-separated-renderer-expressiveness-research-plan-draft-20260815-v001.md`

配置、font、色、サイズ、fade/animation、opening hook、G4〜G7、QC/proof、人間A/Bを分解し、調査順と成果物候補を整理した。技術・styleは選定していない。

### 3.3 字幕品質v002完了草稿

`presentation-zevo-caption-quality-v002-night-run-completion-draft-20260815-v009.md`

F attempt-0011完全停止、独立fixture設計提示、未実施工程、副線を現在地へ同期した。

### 3.4 provider再評価在庫

`presentation-caption-boundary-llm-provider-reevaluation-feasibility-draft-20260815-v003.md`

合成fixtureと正式Gemini教師pairを分離し、F/U新経路→Gemini一回実走→人間採否→第二provider公式調査→匿名比較の順へ更新した。

## 4. 全要裁定

### 4.1 主線

1. F/U fixture製造契約設計v001の承認/差し戻し。

### 4.2 描画疎結合化

1. instruction artifactがstyle intentだけを持つか、style profile IDまで持つか。
2. cue終端は指示側に残し、行末だけrendererへ移すか。
3. 時刻をframeで持つかmsで持つか。
4. renderer admission receiptを独立成果物にするか。
5. 最初の実証をcaption横型、title C、両方同時のどれにするか。
6. 旧直接経路の物理削除を本工事かスケルトン清書か。
7. exact path上限を完全設計前か現物閉包後に固定するか。
8. 実装着手をF/U fixture工事直後かA-v002安定点化後か。

### 4.3 renderer表現力

1. speaker_only限定開始か三画面型同時か。
2. 基準書体一つか役割別font familyか。
3. 作品色と意味種別色の優先順位。
4. 行分割を決定的単独選択か候補列挙+AI/人間選択か。
5. motion初版をfade改良だけか代替一種込みか。
6. opening hookをtitle拡張か独立instruction kindか。
7. G4のみから始めるかG5 commentも含めるか。
8. 外部rendererを比較対象に含めるか。
9. 既存教師素材だけか新教師素材追加か。
10. 人間確認を三段か二段か。
11. typography〜hookをどこまで同一工事に含めるか。

### 4.4 provider再評価

1. 第二provider公式調査をGemini pair成立後かF/U完了後の並行開始か。
2. 第二provider候補集合。
3. provider別B5/B6 jobを第一候補にするか。

副線の要裁定は主線の承認を妨げない。今すぐ必要なのは4.1の一件だけである。

## 5. 在庫更新

- S〜U全gateへのfixture製造統合をスケルトン清書時の検討在庫として維持。
- 描画疎結合化の正式契約設計。
- 分離renderer表現力調査。
- provider再評価。
- fixture製造独立工程の清書時共通化。
- 契約件数pin proof置換連鎖の除去。

## 6. 外部作用

- API通信: **0回**
- countTokens: **0回**
- generateContent: **0回**
- 費用: **US$0**
- 正式描画: **0回**
- production/test変更: **0件**
- 既存正式成果物変更: **0件**
- commit: **0件**
- stable tag: **0件**

## 7. 次の一手

主線設計§18を承認または差し戻す。承認前は、F/U実装、正式attempt、API、描画へ進まない。

