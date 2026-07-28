実行した:
いいえ

実行できなかった場合:
この検証ではZEV本体のUIを新規起動して操作していないため、「ZEVを画面で実行した」とは扱わない。

代替で確認した内容:
candidate 59の正式な組立決定から、Gemini回答、局所的な字幕再分割、表示計画、確認用MP4、描画後QCまでを版付き成果物とSHA-256で照合した。完成MP4の代表フレーム2枚をこちらでも目視し、全編についてはkawafmmの実視聴結果「何も問題ない」が`DECISIONS.md`へ保存されていることを確認した。

---

# 完成物検証レポート

## 1. 結論

意図どおり動いている

ただし、合格範囲は「別の元配信でも、基本字幕1プリセットの既存経路で確認用MP4を一本完成できること」である。  
字幕16件、29行を描画し、物理検査と描画後QC 6項目は全て合格した。  
kawafmmが完成MP4を全編視聴し、「何も問題ない」と確認している。  
公開用成果物化、G4〜G7、SE、素材、タイトル、サムネイル、縦型対応まで完成したという意味ではない。

## 2. ユーザーから見た変化

- 宝鐘マリンのLiar's Bar元配信から選んだcandidate 59を、字幕付きの約51.6秒動画として実際に見られるようになった。
- candidate 13とは異なる元配信でも、切り出し、発話保持、Geminiによる字幕分割、表示計画、描画、品質検査まで同じ経路を通せた。
- 画面幅を超えた字幕1件だけを、人間が選んだ自然な区切りへ局所修正できた。
- 修正対象以外の15字幕、元発話281文字、プリセット、行幅上限は変えていない。
- 完成動画は基本字幕だけで、派手な演出や効果音を含まない。今回の目的である配管の一般性実証としては正しい。

## 3. 実行した操作

1. 関連タスク、目標定義、7工程契約、現在実装、引き継ぎ文書を読み、今回の完成範囲を照合した。
2. 人間の組立判断、正式な組立決定、残存発話、Gemini送信・応答、局所再選択、B1受入検査、B4表示計画、描画manifest、描画後QCを読み取った。
3. 主要JSONと完成MP4のSHA-256を再計算した。
4. 完成MP4を`ffprobe`で検査し、映像、音声、フレーム数、再生時間、容量を確認した。
5. 完成MP4の30秒地点と、局所再選択した字幕付近の39秒地点を静止画化し、字幕の描画状態を目視した。
6. `DECISIONS.md`の人間目視合格記録を確認した。

この検証でコード変更、外部通信、Gemini再実走、正式成果物の再生成、ZEV本体UIの操作は行っていない。

## 4. 保存データの確認

確認した主な保存データ:

- 人間の組立判断  
  `evals/clip_composition/outputs/presentation/source-assembly-human-results/qdczJpv8RCc-candidate-59-v001.json`
  - 候補: candidate 59
  - 判断: 切り分けを採用
  - 語尾: 欠けなし
  - 確認者: kawafmm
  - 確認媒体SHA-256: `b3c48912d1acd51b5a4313e61c14fdd6d8cbd72cb270ceb74d0fa01e62cfb115`

- 正式な組立決定  
  `evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json`
  - `sourceVideoId`相当: `youtube:qdczJpv8RCc`
  - `sourceStartMs`: `5941162`
  - `sourceEndMs`: `5992736`
  - 元媒体SHA-256: `8359f59d8c205fb815c9165f5a464ec4bb9f109f9d91384b80e571410dc2fa25`
  - 未解決編集: 0件

- 基礎映像  
  `evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/base-media.mp4`
  - SHA-256: `faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967`
  - 1,547 frame

- 残存発話  
  `evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/source-atoms.json`
  - 281文字
  - 発話まとまり2件
  - 欠落、余分、切除範囲との交差: 0件

- Geminiへ渡した字幕判断入力  
  `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/semantic-source-input.json`
  - SHA-256: `ead2a47ef57480c3da9e598a650059a92c1f1519b25b94d2617b86485f79433a`
  - 行末候補164件

- B5固定request  
  `evals/clip_composition/outputs/presentation/caption-gate-b5/qdczJpv8RCc-candidate-59-v001/generate-content-request.json`
  - SHA-256: `20a74de1f36802e4b6d414b718e0034731305b7111f621b5a4599bccd460284c`
  - 入力7,474 token

- Gemini生応答  
  `evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/generate-content-response.raw.json`
  - SHA-256: `fba0a2574d728bc36a65ae79e635fc8ae979fd5e378cda8662f2510be56ce761`
  - モデル: `gemini-3.6-flash`
  - 生成1回、再試行0回
  - 使用量: 入力7,474、回答829、思考3,203、合計11,506 token
  - 使用量ベース費用見積り: US$0.041451
  - 実請求額: API応答からは未確認

- 人間認定した局所再選択  
  `evals/clip_composition/outputs/presentation/caption-local-reselections/qdczJpv8RCc-candidate-59-caption-cue-000013-v001/reselection-record.json`
  - SHA-256: `d2beaecbbb99c8c08253a4188d981e92107a5e4794ff7104ce43d0cd76c0d568`
  - 対象: `caption-cue-000013`
  - 1行目: 「綺麗にはなるんだけどやりかけで」、論理幅30
  - 2行目: 「いろんなことやり始めちゃう」、論理幅26
  - 他15まとまり、281文字、幅上限36、プリセットは不変
  - この局所修正のAPI通信: 0回

- 局所再選択後の意味回答と受入検査  
  `evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/qdczJpv8RCc-candidate-59-caption-b6-v001-local-reselection-v001.json`  
  `evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/semantic-output-validation-report-local-reselection-v001.json`
  - 意味回答SHA-256: `b3b3cb76d8cf70cc33bb0adff5cc233c3269139e48d18419bb7484b2b77d165c`
  - 受入検査: 12/12合格

- 表示計画  
  `evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json`
  - SHA-256: `48f9a7324b6207f87b35d52b9d09f722f1e382f90ff0b0604a75666861608921`
  - 字幕16件、29行
  - 最大実幅34
  - 正の時間重なり0件

候補プール、候補選抜ログ、完成ショート情報、`CandidateSelectionBinding`は、このpresentation評価経路の成果物としては作られていない。candidate 59と元配信区間の接続は、正式な組立決定のIDと時刻で確認した。

## 5. UI確認

この検証セッションではZEV本体UIを起動していない。

保存済み事実として、kawafmmは以下を確認している。

- 組立確認: 「この切り分けでよい」「語尾の欠けはない」
- 完成字幕動画: 「何も問題ない」

完成動画の代表フレーム2枚はこちらでも確認した。基本字幕は大きな白文字、黒い縁取り、2行以内で表示され、確認したフレームでは画面外や行同士の重なりは見られなかった。全編の人間判断の正本は`DECISIONS.md`の2026-07-28記録である。

## 6. 出力動画の確認

完成確認用MP4:

`evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-rendered-v003.mp4`

- SHA-256: `730410a9598ac9fda6d84b61b80686a0706ce8cebe4d83cca923422398e3b88b`
- 再生時間: 51.566016秒
- 元動画範囲: `[5941162, 5992736)ms`
- 映像: H.264、1920×1080、30fps、1,547 frame
- 音声: AAC、48kHz、stereo
- 音声packet内容: 基礎映像とSHA-256完全一致
- 字幕: 16件、29行
- プリセット: `normal-landscape-readable-pop-v001`
- 人間カット: 外側境界1区間を人間が承認
- AI削除意図: なし。内部発話の削除はしていない

描画後QC 6項目:

1. 指定プリセット適用: 16/16合格
2. 文字の正の重なり: 0件
3. 安全領域違反: 0件
4. 字幕欠落: 0件、16/16描画
5. フレーム数維持: 1,547 / 1,547
6. 音声維持: codecとpacket内容が完全一致

このMP4はmanifest上`reviewOnly: true`、`publicReleaseAllowed: false`の確認媒体である。公開用レンダリングとの一致は未確認で、公開成果物そのものとは扱わない。

## 7. 正本の分離確認

今回確認したpresentation経路では、次が別成果物に分かれている。

- 人間の切り出し判断: 人間回答
- 採用した元配信区間: 正式組立決定
- 切り出した映像: 基礎映像
- 切り出し後に残る発話: 残存発話
- Geminiへ渡す判断材料: 字幕判断入力
- Geminiの意味判断: 生応答と意味回答
- 人間が覆した1箇所: 局所再選択記録
- 描画する内容と時刻: 表示計画・指示書
- 視覚的実現とQC: レンダラー成果物

`ShortDraftPlan`、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`ReviewPacket`、`comparisonItems`は、このcandidate 59 presentation成果物内では使用されていない。したがって混在は観測されないが、ZEV本体の候補選抜正本と完成動画をつなぐアプリ全体の接続は未確認である。

## 8. 合格判定チェック

1. 出力本数入力が廃止されている: 要確認（今回のpresentation経路外）
2. 抽出時に完成ショートが自動生成されない: OK（組立、Gemini送信、局所修正、描画を人間承認で分離）
3. 候補プールが保存される: 要確認（今回のpresentation経路外）
4. 候補選抜ログが保存される: 要確認（今回のpresentation経路外）
5. 上位漏れ候補が not_selected として残る: 要確認（今回のpresentation経路外）
6. 人間が候補を選んでショート化できる: OK（candidate 59の人間採用から字幕付きMP4まで確認）
7. 完成ショートに CandidateSelectionBinding が保存される: 要確認（今回の確認用MP4は本体のCompletedShortではない）
8. 採用理由は厳密接続できる場合だけ表示される: 要確認（ZEV本体UIを未確認）
9. comparisonItems を正本にしていない: OK（candidate 59 presentation成果物で不使用）
10. 旧データは再生成案内になる: 要確認（今回対象外）
11. sourceStartMs / sourceEndMs を使っている: OK（正式組立決定で確認）
12. startMs / endMs を新しい正本にしていない: OK（正式組立決定はsourceStartMs / sourceEndMsを使用）

## 9. 問題点

確認範囲では重大な問題なし。

既知の運用上の注意:

- 完成物は確認用MP4であり、公開許可された成果物ではない。
- 初回B6 manifestは、並行fixtureが監視領域へ書き込んだため`rejected`の履歴を保持している。保存したGemini回答は、その後の競合のない再検査と局所再選択後の再検査で合格している。
- 現在地は`DECISIONS.md`へ記録済みだが、`HANDOVER.md`はcandidate 13までで止まっている。
- 完成成果物、最終記録、レポートは現時点で未コミットであり、candidate 59用の安定点tagは未確認である。

## 10. まだ未実装のこと

- B4物理違反を構造化し、違反した字幕だけをAIが局所再分割する汎用経路。今回は人間が候補4を認定してデータ差し替えした。
- 行幅36と横型プリセット1種を、素材・横型・縦型・作風ごとの入力として使い分ける経路。
- G4〜G7の意味演出、素材、SE、タイトル、サムネイル。
- 確認用MP4から公開用成果物へ進める正式な公開工程。
- ZEV本体UI、候補選抜正本、完成ショート正本へ今回のpresentation経路を接続したE2E確認。

## 11. 参考: 不足している可能性のある機能

1. B4違反からの局所再分割
   - 根拠: 保存データと`DECISIONS.md`。今回はcue 13だけを人間認定データで差し替えた。
   - ユーザー影響: 次回同型違反でも、人間へ候補選択を求める可能性がある。
   - 扱い: 今後の未実装。今回の完成物の欠陥ではない。

2. 形式別の行幅・プリセット選択
   - 根拠: 完成manifestと局所再選択記録。幅36、横型プリセット1種で固定。
   - ユーザー影響: 縦型ショートや別の画面構成では同じ品質を保証できない。
   - 扱い: 今後の未実装。

3. 公開用成果物化
   - 根拠: render manifestが`reviewOnly: true`、`publicReleaseAllowed: false`。
   - ユーザー影響: このMP4を正式公開物として自動登録・公開することはできない。
   - 扱い: コード・保存データで確認した未接続工程。

4. ZEV本体の候補選抜記録との厳密接続
   - 根拠: presentation成果物に`CandidateSelectionBinding`はなく、本体UIを実行していない。
   - ユーザー影響: 本体画面から完成動画の採用理由までIDで戻れるかは、本報告だけでは保証できない。
   - 扱い: 検証ギャップ。欠陥とは未確定。

5. 内側の失敗理由を上位報告へ透過する観測性
   - 根拠: 過去のT082/T083と検査131で、上位報告だけでは内側理由が分からない実例が記録済み。
   - ユーザー影響: 同型停止時の原因確認が遅くなる可能性がある。
   - 扱い: 既知の契約改訂候補。今回の完成経路では停止していない。

## 12. 次に直すべきこと

1. candidate 59の完成事実を`HANDOVER.md`へ同期し、検証済み安定点としてコミット・tag化する。
2. B4物理違反から対象字幕だけを局所再分割する汎用経路を設計する。
3. 行幅とプリセットをフォーマット別入力として扱う最小一般化を、次の実素材で検証する。

今回、kawafmmに追加で必要な作業は0件。次の判断は、安定点化を先に行うか、局所再分割の汎用化へ進むかの優先選択である。

## 13. 実行コマンドとテスト結果

成功:

```sh
sed -n '1,260p' /Users/kawafmm/.codex/skills/report/SKILL.md
sed -n '261,420p' /Users/kawafmm/.codex/skills/report/SKILL.md
```

```sh
git status --short && git rev-parse --short=12 HEAD && rg -n "candidate 59|caption-cue-000013|730410a9598ac9fd|B4物理検査" DECISIONS.md docs/HANDOVER.md | tail -n 30
```

```sh
sed -n '1,280p' evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-current-completion-verification-report-20260728-v001.md
```

```sh
rg --files evals/clip_composition/outputs/presentation | rg 'qdczJpv8RCc-candidate-59.*(reselection-record|semantic-output-validation-report-local|display-pair|presentation-review-render|assembly-decision|source-atoms|generation-manifest|validation-report)|caption-local-reselections/qdczJpv8RCc|review-renders/qdczJpv8RCc' | sort
```

```sh
jq '{schemaVersion,status,reviewer,reviewDate,targetCueId,selectedCandidate,unchangedInvariants}' evals/clip_composition/outputs/presentation/caption-local-reselections/qdczJpv8RCc-candidate-59-caption-cue-000013-v001/reselection-record.json
jq '{schemaVersion,status,summary,counts,checks,violations}' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/pair-validation-report.json
jq '{schemaVersion,status,summary,instructionCount,checks,violations}' evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-render-qc-v003.json
jq '{schemaVersion,status,outputVideo,outputVideoSha256,frameCount,audio}' evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-render-manifest-v003.json
jq '{schemaVersion,assemblyId,sourceIdentity,segments,unresolvedEdits}' evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json
```

上の浅い投影では一部が`null`になったため、正本JSONの実際の構造を次で確認した。

```sh
jq 'keys' evals/clip_composition/outputs/presentation/caption-local-reselections/qdczJpv8RCc-candidate-59-caption-cue-000013-v001/reselection-record.json
jq 'keys' evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-render-manifest-v003.json
jq 'keys' evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json
shasum -a 256 evals/clip_composition/outputs/presentation/caption-local-reselections/qdczJpv8RCc-candidate-59-caption-cue-000013-v001/reselection-record.json evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-rendered-v003.mp4 evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-render-qc-v003.json evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/pair-validation-report.json
```

```sh
jq '{schemaVersion,recordId,status,reviewedOn,reviewer,target,approvedSelection,invariants}' evals/clip_composition/outputs/presentation/caption-local-reselections/qdczJpv8RCc-candidate-59-caption-cue-000013-v001/reselection-record.json
jq '{schemaVersion,state,reviewOnly,publicReleaseAllowed,output,requiredReviewQc,instructionContract}' evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-render-manifest-v003.json
jq '{schemaVersion,decisionId,approval,payload}' evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json
jq '{schemaVersion,status,instructionCount,checks,violations}' evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-render-qc-v003.json
```

```sh
jq '{schemaVersion,status,checks,observed,violations}' evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/semantic-output-validation-report-local-reselection-v001.json
jq '{schemaVersion,state,counts,physicalChecks,outputFiles}' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/pair-generation-manifest.json
/usr/local/bin/ffprobe -v error -show_entries format=duration,size -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels -of json evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-rendered-v003.mp4
```

```sh
jq 'keys' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/pair-generation-manifest.json
jq 'keys' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/pair-validation-report.json
jq '. | {instructionSetId, generation, outputs, summary, reviewState, layoutPreflight}' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/pair-generation-manifest.json
jq '. | {observations, reviewState, publication, checks}' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/pair-validation-report.json
jq '.observedProjection' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/pair-validation-report.json
jq '.contentArtifacts' evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/pair-generation-manifest.json
```

```sh
rg --files evals/clip_composition/outputs/presentation/caption-gate-b5 evals/clip_composition/outputs/presentation/caption-gate-b6 | rg 'qdczJpv8RCc-candidate-59' | sort
jq '{schemaVersion,status,model,pricing,tokenCounts,request,secretScan,apiCalls}' evals/clip_composition/outputs/presentation/caption-gate-b5/qdczJpv8RCc-candidate-59-v001/b5-initial-manifest.json
jq '{schemaVersion,status,model,usage,costEstimate,request,response,apiCalls,retryCount,acceptance}' evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/b6-manifest.json
shasum -a 256 evals/clip_composition/outputs/presentation/caption-gate-b5/qdczJpv8RCc-candidate-59-v001/generate-content-request.json evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/generate-content-response.raw.json
```

```sh
jq 'keys' evals/clip_composition/outputs/presentation/caption-gate-b5/qdczJpv8RCc-candidate-59-v001/b5-initial-manifest.json
jq 'keys' evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/b6-manifest.json
jq '.' evals/clip_composition/outputs/presentation/caption-gate-b5/qdczJpv8RCc-candidate-59-v001/b5-initial-manifest.json | sed -n '1,240p'
jq '.' evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/b6-manifest.json | sed -n '1,280p'
```

```sh
shasum -a 256 evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/qdczJpv8RCc-candidate-59-caption-b6-v001-local-reselection-v001.json evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/semantic-output-validation-report-local-reselection-v001.json evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/instruction-bundle.json evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/layout-preflight.json
```

```sh
if rg -n 'comparisonItems|CandidateSelectionBinding|CandidateSelectionLedger|CandidatePool|ReviewPacket|ShortDraftPlan' evals/clip_composition/outputs/presentation/source-assembly-human-results/qdczJpv8RCc-candidate-59-v001.json evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json evals/clip_composition/outputs/presentation/caption-local-reselections/qdczJpv8RCc-candidate-59-caption-cue-000013-v001/reselection-record.json evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001 evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001; then true; else echo 'no canonical-selection terms in candidate59 presentation artifacts'; fi
```

```sh
test ! -e evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-completion-verification-report-20260728-v002.md && echo available
```

```sh
jq '{schemaVersion,reviewId,candidate,primaryChoice,secondaryChoice,resolution,finalAssessment,timeMeasurement}' evals/clip_composition/outputs/presentation/source-assembly-human-results/qdczJpv8RCc-candidate-59-v001.json
jq '{schemaVersion,status,sourceAtomCount,characterCount,speechGroupCount,checks,violations}' evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/validation-report.json
jq '{schemaVersion,status,sourceAtomCount,characterCount,speechGroupCount,atomRanges}' evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/generation-manifest.json
```

```sh
sed -n '1,220p' docs/order.md
sed -n '1,220p' docs/task-008-Gemini-APIで演出作成.md
sed -n '1,220p' docs/GOAL_DEFINITION.md
sed -n '1,380p' docs/zev2-flow-contract.md
sed -n '1,260p' docs/current-implementation.md
sed -n '1,260p' docs/HANDOVER.md
```

```sh
/usr/local/bin/ffmpeg -hide_banner -loglevel error -ss 30 -i evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-rendered-v003.mp4 -frames:v 1 -y /private/tmp/qdczJpv8RCc-candidate-59-report-frame.png && shasum -a 256 /private/tmp/qdczJpv8RCc-candidate-59-report-frame.png
/usr/local/bin/ffmpeg -hide_banner -loglevel error -ss 39 -i evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-rendered-v003.mp4 -frames:v 1 -y /private/tmp/qdczJpv8RCc-candidate-59-cue13-report-frame.png && shasum -a 256 /private/tmp/qdczJpv8RCc-candidate-59-cue13-report-frame.png
```

```sh
jq '{schemaVersion,status,checks,violations}' evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/semantic-output-validation-report-recheck-v001.json
jq '{schemaVersion,status,checks,violations}' evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001/semantic-output-validation-report.json
rg -n 'fixture|parallel|READ_ONLY_CONTRACT_VIOLATED|監視領域|汚染' evals/clip_composition/reports/presentation | rg 'candidate59|candidate-59|qdczJpv8RCc' | tail -n 40
rg -n '並行(process|fixture)|同一監視領域|READ_ONLY_CONTRACT_VIOLATED|再検査' evals/clip_composition/reports/presentation | rg 'candidate59|candidate-59|qdczJpv8RCc' | tail -n 80
rg -n '同一監視領域|並行.*fixture|READ_ONLY_CONTRACT_VIOLATED' evals/clip_composition/reports/presentation | tail -n 120
```

```sh
rg -n '^実行した:|^実行できなかった場合:|^代替で確認した内容:|^# 完成物検証レポート|^## ([1-9]|1[0-4])\\.' evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-completion-verification-report-20260728-v002.md
wc -l -w -c evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-completion-verification-report-20260728-v002.md
sed -n '1,80p' evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-completion-verification-report-20260728-v002.md
sed -n '520,700p' evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-completion-verification-report-20260728-v002.md
```

テスト結果:

- 局所再選択後B1受入検査: 12/12合格
- B4表示計画検査: 17/17合格
- B4物理観測: 字幕16件、29行、最大実幅34、正の時間重なり0件
- 描画後QC: 6/6合格
- 完成MP4: 1920×1080、30fps、1,547 frame、51.566016秒、30,005,849 byte
- 音声: AAC 48kHz stereo、基礎映像とpacket SHA-256一致
- 人間全編目視: 合格、「何も問題ない」

失敗:

- 読み取り用`jq`の一部で、成果物の実際の入れ子より浅いfieldを指定したため`null`が返った。正本JSONを変更せず、`keys`と正しい入れ子の投影で確認し直した。
- 製品処理、検査、動画生成の新しい失敗はない。

未実行:

- ZEV本体UIの起動・操作
- 外部API通信
- Gemini再実走
- 正式成果物の再生成
- 公開用レンダリング
- ChatGPTへの投稿

## 14. 証拠

- 完成確認用MP4:  
  `evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-rendered-v003.mp4`
- 完成MP4 SHA-256:  
  `730410a9598ac9fda6d84b61b80686a0706ce8cebe4d83cca923422398e3b88b`
- 描画manifest:  
  `evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-render-manifest-v003.json`
- 描画後QC:  
  `evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-render-qc-v003.json`
- 表示計画:  
  `evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json`
- 局所再選択記録:  
  `evals/clip_composition/outputs/presentation/caption-local-reselections/qdczJpv8RCc-candidate-59-caption-cue-000013-v001/reselection-record.json`
- 人間全編目視記録:  
  `DECISIONS.md:420` — candidate 59完成確認MP4を「何も問題ない」と確認、2026-07-28
- 代表フレーム目視用一時ファイル:  
  `/private/tmp/qdczJpv8RCc-candidate-59-report-frame.png`  
  `/private/tmp/qdczJpv8RCc-candidate-59-cue13-report-frame.png`

旧レポート`presentation-liars-bar-candidate59-current-completion-verification-report-20260728-v001.md`はB5送信前の状態を記録した過去資料であり、現在地としては本v002を使用する。

ChatGPT投稿は依頼されていないため実行していない。
