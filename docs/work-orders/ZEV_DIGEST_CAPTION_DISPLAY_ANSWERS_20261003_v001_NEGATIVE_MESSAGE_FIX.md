# 9の後続 — 否定確認の比較値修正・第一回答保全再利用

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：decision: continue
承認根拠：kawafmm承認済みの保存9表示要求への実回答作業と、AGENTSの軽微技術判断の相談役委任に基づく個別承認。本人への再確認・転記は不要。
監査対象：d231a911c05f2eacbb6e7f70d8a0ac9e65a3aacf
親正本：[保存表示要求への実回答v001](ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)

## 1. 現物監査と成立範囲

同SHAのrun-display.mts全文、evidence.json、既存fail実装、親正本とc18ac0d6からの差分を照合した。

既存run_candidate_discovery_digest_skill_e2e_v001.mtsのfailは `DIGEST_SKILL_E2E: ${code}` をError.messageへ設定する。run-displayはraw error.messageを取り、接頭辞のないDISPLAY_PROVENANCE_MISMATCHとequalしている。保存された実拒否本文と補助の期待値の不一致はこのコードと整合する。

第一要求217atom・14表示単位の実回答は既存Skillとvalidatorの検査を通過し、SHA差替えcloneも正しく拒否されたと保存されている。停止はその拒否結果を補助が比較する箇所であり、正常回答の来歴不一致や製品validatorの欠陥とは扱わない。

第一responseとresultの保存までを部分成立として保持する。trace/receipt、残8回答、最終manifest、別process再読は未実施で、全体完了・人間品質合格にはしない。相談役はGitHub上のコード・保存証拠を監査したもので、Macのruntimeを直接実行・再hashしていない。

## 2. 設営22として承認する一件

原因は補助のraw error比較値だけ。比較修正と、その再実行で初回証拠を上書きしないための保存先追従を同じ設営欠陥への一件として承認する。製品修正ではない。

対象：docs/reports/digest-caption-display-answers-20261003/run-display.mts

```diff
-assert.equal(code, 'DISPLAY_PROVENANCE_MISMATCH');
+assert.equal(code, 'DIGEST_SKILL_E2E: DISPLAY_PROVENANCE_MISMATCH');
```

完全一致比較を維持する。接頭辞を落とす汎用normalizer、部分一致、例外無視、製品fail/validator変更は追加しない。直後の出力不増加検査も維持する。

同じ補助のOUTだけを `${PARENT}/attempt-002` へ変更する。PARENT、入力bundle/manifest/要求SHA、SCOPE_PATH、回答schema、judge/validator/readbackの処理は維持する。新attemptは不存在を確認して新規作成し、既存拒否・排他作成を維持する。EEXIST無視・旧attempt削除・上書きはしない。

negative記録のexpectedも同じrawメッセージへ追従し、observedは実例外本文を保存する。historyは製品6／設営22、設営21適用履歴と22の個別承認、受領HEAD、再開先・再開時刻を正確に記録する。manifest.receivedHead等の実行metadata、report/evidenceの初回失敗保持・再利用記録の追従を許可する。別の不具合や製品変更を混ぜない。一般上限・過去累積・強制停止・自己承認権は変更しない。

## 3. 第一回答は同じ要求に限りbyte同一再利用

初回保存物：
- request：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/display-request-0001.json
- request SHA：fee145844ff2409c4a8ead59558a4d0a5879bf177387e593b2075f1944e6c567
- response：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-001/response-0001.json
- response：5,405bytes、SHA 5228394586b8aab05fe8943d3b944a368327627955421494c0083af7e4036034
- result：同attempt-001/result-0001.json、4,725bytes、SHA a4943d074bf4be10a8fd670eadca252d2b82ef17c080c5ea86143caea3dd82a3

新実行で第一のdisplay-judgment-requiredが提示された後、提示要求の実bytes/SHAと既存第一要求の一致を確認する。旧responseの実size/SHAとrequestFileSha256も照合した上で、新attempt-002/response-0001.jsonへ一度だけbyte同一・排他作成でコピーし、既存のstdin手順でファイル名を返す。旧responseを整形し直したり、SHAだけ付け替えたりしない。

第一回答の内容を再判断する必要はない。既存Skillは同じ実inputと保存回答を受け、resultを新たに返し、既存validatorで再検査する。旧resultや合格印をコピーしてSkill実行・token生成の代用にしない。第一trace/receiptは新実行で初めて作る。

今回の小JSONコピー5,405bytesは限定許可する。媒体copyや他の旧成果復元へ拡張しない。元request/response/result/失敗log/失敗record/入力SHA一覧は不変保持する。新evidenceには再利用元・新先・同一request/response SHA・新検査結果を記録し、第一回答の再開時待機やコピー時間を新内容判断時間としない。旧の実判断は初回実績として区別する。

同一性が成立しなければ流用せず、その不一致だけ相談役へ返す。残る要求2〜9はそれぞれの実要求を読んで新回答を作り、未来回答を先送りしない。

## 4. scope・失敗証拠

親正本は編集しない。親scopeの実SHA 3f2982a5b55f27c29b62f83cbf2871b3339c3a8b62716fab637f533f9074767a と元準備scope・元purpose・承認snapshot・準備bundleは維持する。本追補は修正と再開の個別承認として別path/SHAで記録し、旧scopeBindingへ付け替えない。

d231a911の初回コード・evidenceを固定Git履歴に保持し、現在report/evidenceを進捗更新する際も初回exit1、到達範囲、raw拒否本文、旧response/resultのSHA、not-runを失敗履歴へ残す。初回の失敗runtimeを変更せず、後のexit0へ付け替えない。

## 5. 再開の終点と必要な確認

対象補助の必要型検査・既存preflightを確認して、新attempt-002の一系列へ戻る。

1. 第一要求・第一回答の同一性確認とbyte再利用、既存Skill/validatorで再受理。
2. 同じ小SHA差替えclone一件で、rawメッセージの完全一致と出力不増加を確認。
3. 残り8要求の実回答、全9件の原文字列/所属/順序/全被覆/行数/論理幅を既存検査で確認。
4. trace/receiptと最終manifestを新先へ保存。
5. 最後に別process一回。元入力と保存response/resultから内容判断なしでtoken/traceを再構築し、全SHAと保存trace一致、元bundle/state不変を確認。
6. 担当のみ通常commit/push、Git状態・対象process終了を確認し直接報告。

準備接続・v005・通常4工程・旧suite・動画QC・人間レビューを再実行しない。新しい一律分割ルールやcue数目標を追加しない。親の4field回答形式、条件付き分割、本文・style不変を維持する。

## 6. 変更しない権限と報告

製品code、新準備二path、既存Skill/validator、通常factory/index/backend/sharedは無変更。媒体read/hash/copy/PUT、通常HTTP、新API/provider/費用、STT/inspection/ffprobe、描画・演出・動画、SSD、削除、本番・公開は0。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認を維持する。既存acceptも不変。

この返信をCodex2専用Edgeで全文受領し、同じセッションで続行する。本人への再手貼り・通常技術確認・転記・採点、Codex1起動、受領だけの独立commitは不要。新しい実質問題がなければ、上記修正から全9件の保存再検査・commit/push・直接報告まで進める。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・保存表示要求への実回答

発行時点：製品6／設営21適用済み、設営22は個別承認済みで適用未確認。attempt-002実行・全9回答完成・Macの現processは未確認。
