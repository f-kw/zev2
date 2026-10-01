# ID9 v005追補 — 保存後receiver再読のguard-probe修正

発行日：2026-10-01（JST）
decision: continue

kawafmm承認済みID9と、軽微技術判断の相談役委任に基づく個別承認。本人への追加確認は不要。

基準checkpoint：a8dffc7f53b97d6c3230264bd02041107b58a1bf

## 判断

設営10のawait修正後、別process readerは実loadState / readStateSnapshotから保存stateを取得し、validate_digest_plan=succeeded、対象FileRefとreceiver保存済みexecution artifactのSHA一致まで成立した。

次のguard probeだけが、guard wrapperの同期throwを assert.rejects へPromise値として直接渡したため、assert.rejectsが受け取る前に TEST_FORBIDDEN_SOURCE_READ が外へ出て停止した。失敗証拠に保存された実code・error・未適用案は整合する。実consumerの再構築前の試験設営停止であり、guardの禁止条件・upload製品・consumer製品の欠陥とは扱わない。

## 設営11

今回の修正を設営累積11回目として個別承認する。製品5／設営10を維持し、一般上限・過去履歴はリセットしない。

許可差分はguard拒否probeの一行だけ。

現状：
await assert.rejects(fs.promises.readFile(p), /TEST_FORBIDDEN_SOURCE_READ/);

修正：
await assert.rejects(async () => fs.promises.readFile(p), /TEST_FORBIDDEN_SOURCE_READ/);

同期throwを検査可能なPromise拒否へ包むだけで、禁止root、guard本文、期待error、実consumer、入力、SHA比較、deepEqual、最終成功条件は変更しない。

## 再実行範囲

attempt-006の保存済み成果だけを使う。backend、通常runner、factory、upload、download、大容量copy、再判断、再登録、complete、state更新は再実行しない。

別process readerで以下を確認する。
1. 実loadState/readStateSnapshotで保存stateを取得。
2. validate_digest_planがsucceeded。
3. FileRefと保存済みexecution artifactのSHA一致。
4. worker・元素材・保存STT・inspection・backend artifact rootへのreadをguardで禁止し、各禁止path probeが期待どおり拒否される。
5. receiver artifactRootだけをsourceDataRootとして実readConsumedDigestPlanV001を呼ぶ。
6. 保存済みexecution artifactとdeepEqual一致。
7. forbiddenReadsDuringReconstruction=0。
8. 再判断・再登録・complete・state更新なし。
9. 新しい小proofを別filenameで保存し、設営10失敗証拠と旧upload証拠を不変に保つ。

成立すれば、upload-json転送＋保存後receiver-only再構築を限定完了として監査へ提出する。

MP4直接登録、inspection未提供の通常complete、目的2件の全3判断はnot-runのまま。v005全体完成・実AI品質・動画許可・人間品質採用にはしない。

追加削除、SSD操作、外部転送、新素材、外部推論、費用、動画製造、本番・公開は対象外。新3copyは保持。

報告：
Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. upload-json保存後receiver-only再読
