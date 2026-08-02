実行した:
いいえ

実行できなかった場合:
ZEVのUIと完成動画の人間確認画面は起動していない。正式縦型レンダラーが固定fatalで停止し、今回確認すべきmp4自体が生成されなかったためである。

代替で確認した内容:
B4表示計画7成果物、正式検査報告、正式描画job、保存済みfatal、描画出力directoryの不在、関連SHA、横型不変記録、API使用量記録を読み取り確認した。正式描画やAPI通信は再実行していない。

---

# 完成物検証レポート

## 1. 結論

**大きくズレあり**

案Aの限定修正、関連検査、横型不変確認、正式B4表示計画の生成までは成立した。表示計画は30字幕・51行、幅上限14、時間重なり0件で、機械検査9/9に合格している。

しかし、最終目的であるcandidate 59の縦型mp4は生成されていない。正式描画は2回とも同じ外側fatalで停止し、QC 6項目と人間目視へ到達しなかった。したがって「縦型一本が完成した」とは判定しない。停止条件2/2で第三の局所修正を行わなかった判断は承認済み規律どおりである。

## 2. ユーザーから見た変化

- candidate 59の281文字は、正式な縦型表示計画として30字幕・51行へ変換できる状態になった。
- 画面型は話者1人用、正式プリセット、1行の論理幅上限14、最大2行で固定されている。
- 表示計画の来歴欄は、承認済み契約どおり3項目へ復元された。
- 実際に再生して確認できる新しい縦型動画は増えていない。
- candidate 13とcandidate 59の横型正式成果物は変化していない。

## 3. 実行した操作

1. B4の決定性確認でbyte列を保持し、意味入力SHAの誤参照を正す限定修正を実施した。
2. 保存済み実データ相当を正式処理へ二回通す正常経路検査を追加した。
3. B4検査13/13、横型統合回帰H01〜H06 6/6を確認した。
4. 正式B4を実行し、9/9合格の表示計画を新しい版付きdirectoryへ保存した。
5. 実装前契約照合で、B4表示計画の来歴は4項目ではなくexact 3項目が正本と確認した。レンダラーを緩和せず、B4生成側の2ファイルを正本へ戻した。
6. B4検査13/13、縦型レンダラー検査21/21、横型回帰6/6を確認し、正式B4 v002を9/9で生成した。
7. 正式描画入力15/15、実装束縛29/29、実行tool 7/7を照合後、正式描画を1回実行した。
8. 正式描画が終了2となったため、生fatalを版付き保存し、再試行せず停止した。
9. 主線停止後、未発火違反codeの整理案とfatal観測性の実害例更新を、コード変更なしで起草した。

## 4. 保存データの確認

確認した元区間:

- 元配信: `youtube:qdczJpv8RCc`
- candidate: 59
- 元配信範囲: `sourceStartMs=5941162`、`sourceEndMs=5992736`
- 尺: 51,574 ms
- 人間承認済み組立決定:
  `evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json`
- 組立決定SHA-256: `72a1d9c95839a62a3f4dae395ffa9e67877910d75040c65796ca994ad3dd51a4`

今回生成・確認したB4正式成果物:

- 保存先:
  `evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/`
- 表示計画SHA-256: `05feabbbbc75407239b96f9f341ca9b5130a7f8ac30d6e944d68352a462fe678`
- 検査報告SHA-256: `554addac430921e3dcea318d584f520831f2a17c1bd14c445ba7cf8f8d60c0db`
- 生成manifest SHA-256: `9fe6ca703551f0f8131d2724f657b8c0f78e99125373cec14c2b64f3c62ce3e6`
- 描画依頼SHA-256: `5eb6830dd3ff3bda70daecd8d0d691fa0e59b726cc13254eab06f9d0bc3d0985`
- 検査状態: `passed_pending_human_review`
- 検査: 9/9合格、違反0件
- 2発話まとまり、30字幕、51行、1行字幕9件、2行字幕21件、最大論理幅14

正式描画の停止証拠:

- job:
  `evals/clip_composition/outputs/presentation/vertical-review-render-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002.json`
- job SHA-256: `055a14e3fe0daa4b9aef6e5d3ce43ba77c1542e50bd660a134468c5105e0c90e`
- 生fatal:
  `evals/clip_composition/outputs/presentation/diagnostics/qdczJpv8RCc-candidate-59-vertical-render-fatal-20260802-v002/renderer-output.raw.json`
- 生fatal SHA-256: `f23ce48d77560e9bb3fd9b468fd0423478d8ba30029f313710bde5d2c94cf231`
- 出力directory: 存在しない

今回のpresentation経路は、候補プール、候補選抜ログ、完成ショートの`CandidateSelectionBinding`を検証するタスクではない。候補選定正本とのID接続、採用理由表示、人間レビュー差分は確認していない。

## 5. UI確認

UI確認は実施していない。正式描画が完了しておらず、今回の完成mp4を表示する最終確認画面がない。

既存の縦型preset previewは存在するが、今回の正式B4 v002から生成された完成動画ではないため、完成確認の代替には使っていない。

## 6. 出力動画の確認

今回の完成縦型動画は**生成されていない**。

- 完成mp4: 0本
- 出力path: なし
- 出力SHA-256: なし
- 再生時間: 未確認
- 音声維持: 未確認
- 字幕焼き込み: 未確認
- previewと正式描画の一致: 未確認
- 描画後QC 6項目: 未実行

基礎映像の正式区間は51,574 msだが、この値を完成動画の尺として報告しない。

## 7. 正本の分離確認

今回確認したpresentation経路では、組立決定、基礎映像、残存発話、Gemini意味回答、B4表示計画、描画jobが別成果物として保存されている。B4表示計画はB1合格物をSHA参照し、元本文を再推測していない。

`ShortDraftPlan`、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`ReviewPacket`、`comparisonItems`の分離は今回の検証対象外であり、合格とは主張しない。`comparisonItems`から採用理由を復元する処理も今回確認していない。

## 8. 合格判定チェック

この12項目は候補選抜正本化の検査であり、今回の縦型presentation経路とは対象が異なる。

1. 出力本数入力が廃止されている: 要確認（今回対象外）
2. 抽出時に完成ショートが自動生成されない: 要確認（今回対象外）
3. 候補プールが保存される: 要確認（今回対象外）
4. 候補選抜ログが保存される: 要確認（今回対象外）
5. 上位漏れ候補が not_selected として残る: 要確認（今回対象外）
6. 人間が候補を選んでショート化できる: 要確認（今回対象外）
7. 完成ショートに CandidateSelectionBinding が保存される: 要確認（完成ショート未生成）
8. 採用理由は厳密接続できる場合だけ表示される: 要確認（今回対象外）
9. comparisonItems を正本にしていない: 要確認（今回対象外）
10. 旧データは再生成案内になる: 要確認（今回対象外）
11. sourceStartMs / sourceEndMs を使っている: OK（presentation組立決定で確認）
12. startMs / endMs を新しい正本にしていない: 要確認（候補選抜正本は今回未確認）

## 9. 問題点

問題:
正式縦型レンダラーが、入力照合後に固定fatal・終了2で停止する。

該当箇所:
`evals/clip_composition/render_presentation_vertical_review_v001.ts`の正式描画経路。保存された外側codeは`VERTICAL_RENDER_V001_RUNNER_FATAL`。

なぜ問題か:
B4表示計画は合格しているのに、ユーザーが確認できるmp4とQCが作られない。外側fatalからは、crop、描画計画、Remotion、QC準備、公開のどこで止まったか判別できない。

再現手順:
保存済みv002描画jobを正式入口へ1回渡した実行で、入力15/15・実装29/29・tool 7/7の事前照合後に終了2を観測した。同じattemptで再実行していない。

修正案:
第三の局所patchを行う前に、保存済みjobと入力だけで内側停止段階を特定する読み取り診断へ計画を戻す。診断結果に基づき、描画修正とfatal観測性v002を別工程として判断する。

優先度:
最優先。縦型一本の完成を直接止めている。

## 10. まだ未実装のこと

- candidate 59縦型の完成mp4。
- 描画後QC 6項目の正式結果。
- 完成動画の人間目視合格。
- 今回の変更のcommit、安定点tag、JOURNAL、HANDOVER同期。
- 外側fatalから固定stageと閉語彙原因を判別できる観測性v002。
- 未発火違反code整理案の契約・実装への反映。

## 11. 参考: 不足している可能性のある機能

### 1. fatalの内側段階を安全に示す機能

- 証拠: 第1・第2正式描画がbyte同一の外側fatalを返し、内部状態を区別できなかった。
- ユーザー影響: 原因特定のたびに追加承認と診断が必要になり、完成までの往復が増える。
- 扱い: 実行で確認済みの問題。秘密非開示を維持した版付き観測性改訂候補。

### 2. 正式縦型描画の正常完走

- 証拠: 正式出力directory、mp4、QCが存在しない。
- ユーザー影響: 縦型ショートを再生・公開できない。
- 扱い: 実行で確認済みの問題。内側原因は未確認。

### 3. 完成動画の最終確認導線

- 証拠: 今回の完成mp4がないため、最終確認画面を実行していない。
- ユーザー影響: 見た目・聴こえ方の人間最終判定ができない。
- 扱い: 確認不足。描画完走後に検証する。

## 12. 次に直すべきこと

1. 正式描画を再実行せず、保存済み入力から停止stageを特定する。
2. 診断結果を基に、描画修正と観測性改訂を分けた一つの再計画を提示する。
3. 描画完走後にQC 6項目と人間目視を行い、その後だけcommit・tag・安定点化する。

## 13. 実行コマンドとテスト結果

作業時に実行した主要コマンド:

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test evals/clip_composition/test_presentation_caption_display_pair_v004.mjs
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node runner/node_modules/tsx/dist/cli.mjs --test evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node runner/node_modules/tsx/dist/cli.mjs evals/clip_composition/render_presentation_vertical_review_v001.ts evals/clip_composition/outputs/presentation/vertical-review-render-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002.json
```

今回のレポート検証で実行した主要コマンド:

```text
jq '{schemaVersion,displayPlanId,artifactId,formatSelection,displayConstraints,sourceProvenance,containerCount:(.containers|length),cueCount:(.captionCues|length)}' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/display-plan.json
jq '{containers:(.containers|length), cues:([.containers[].cues[]]|length), lines:([.containers[].cues[].lines[]]|length), oneLineGroups:([.containers[].cues[]|select((.lines|length)==1)]|length), twoLineGroups:([.containers[].cues[]|select((.lines|length)==2)]|length), maxLogicalWidth:([.containers[].cues[].lines[].logicalWidth]|max), positiveOverlapCount:0, sourceStartMs:([.containers[].cues[].sourceStartMs]|min), sourceEndMs:([.containers[].cues[].sourceEndMs]|max)}' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/display-plan.json
jq '{schemaVersion,status,checks,violations}' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/pair-validation-report.json
jq '.' evals/clip_composition/outputs/presentation/diagnostics/qdczJpv8RCc-candidate-59-vertical-render-fatal-20260802-v002/renderer-output.raw.json
test ! -e evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002-result && echo 'render-output: absent'
shasum -a 256 evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/display-plan.json evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/pair-validation-report.json evals/clip_composition/outputs/presentation/diagnostics/qdczJpv8RCc-candidate-59-vertical-render-fatal-20260802-v002/renderer-output.raw.json
```

成功:

- B4検査13/13。
- 縦型レンダラー検査21/21。
- 横型統合回帰H01〜H06 6/6。
- 正式B4 v002検査9/9、違反0。
- 横型tree SHAはcandidate 13・candidate 59とも前後一致。

失敗:

- 正式縦型描画: 終了2、`VERTICAL_RENDER_V001_RUNNER_FATAL`。
- 最初の表示計画要約コマンドは、字幕が最上位`captionCues`でなく`containers[].cues[]`に入る実schemaを反映せず0件と表示した。保存物は変更せず、次の読み取りコマンドで30字幕・51行を確認した。これは製品検査の不合格ではなく、レポート用投影の誤りである。

未実行:

- 正式描画の再試行。
- 描画後QC。
- UI確認。
- ChatGPT投稿。投稿先セッション名と投稿コマンドは指定されていない。
- 正式B4実行時のexact shell command文字列は成果物へ保存されていないため、推測で再掲していない。正式job、生成manifest、検査報告を実行証拠とした。

## 14. 証拠

- 案A限定実装完了報告:
  `evals/clip_composition/reports/presentation/presentation-candidate59-vertical-b4-rebuild-option-a-implementation-completion-20260802-v001.md`
- 第1正式描画停止報告:
  `evals/clip_composition/reports/presentation/presentation-candidate59-vertical-b4-rebuild-render-fatal-stop-report-20260802-v001.md`
- 契約復元後の第2正式描画停止報告:
  `evals/clip_composition/reports/presentation/presentation-candidate59-vertical-b4-contract-restoration-second-render-fatal-stop-report-20260802-v001.md`
- B4表示計画:
  `evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/display-plan.json`
- B4検査報告:
  `evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/pair-validation-report.json`
- 第2描画fatal:
  `evals/clip_composition/outputs/presentation/diagnostics/qdczJpv8RCc-candidate-59-vertical-render-fatal-20260802-v002/renderer-output.raw.json`
- 未発火違反code整理案:
  `evals/clip_composition/reports/presentation/presentation-vertical-unused-violation-codes-and-legacy-names-inventory-20260802-v001.md`
- fatal観測性実害例更新:
  `evals/clip_composition/reports/presentation/presentation-fatal-observability-impact-examples-update-20260802-v001.md`

保存済み証拠の主要SHA-256:

- B4表示計画: `05feabbbbc75407239b96f9f341ca9b5130a7f8ac30d6e944d68352a462fe678`
- B4検査報告: `554addac430921e3dcea318d584f520831f2a17c1bd14c445ba7cf8f8d60c0db`
- render job: `055a14e3fe0daa4b9aef6e5d3ce43ba77c1542e50bd660a134468c5105e0c90e`
- fatal raw: `f23ce48d77560e9bb3fd9b468fd0423478d8ba30029f313710bde5d2c94cf231`

費用記録:

- 今回の追加API通信: 0回。
- 今回の追加費用: US$0。
- 過去2回のB6 usageに公式単価を適用した累計見積り: US$0.1235145。
- 実請求額: 未確認。
