# ID9 v005追補 — upload保存後receiver再読のawait修正

発行日：2026-10-01（JST）
decision: continue

kawafmm承認済みID9と、軽微技術判断の相談役委任に基づく個別承認。本人への追加確認は不要。

基準checkpoint：88d5e5a0b04b611f2453acf623625ff37c2360c2

## 判断

upload-json attempt-006では、preflight通過後に通常source/STT登録、実index/factory、計画upload/complete、別root receiverへのdownload、転送先だけの実消費、validate_digest_plan completeまで成立した。4命令はsucceeded、receiver guardはworker・元素材・保存STT・inspectionの直接readを禁止したままexit0。

追加の保存後readerだけが、非同期の readStateSnapshot() をawaitせずPromiseをstateとして扱い、consumer呼出前に TypeError で停止した。失敗証拠のcodeと未適用案は一致しており、製品のupload／consumer／store欠陥とは扱わない。

## 設営10

今回の修正を設営累積10回目として個別承認する。製品5／設営9を維持し、一般上限・履歴はリセットしない。

許可差分は保存後readerの一語だけ。

const state=readStateSnapshot();
→
const state=await readStateSnapshot();

試験の対象state、request/FileRef、artifactRoot、forbidden path、実consumer、SHA比較、deepEqual、guard条件は変えない。製品code・通常API・PUT/GET・runner・consumer・store実装は変更しない。旧失敗code／SHA／証拠は保持する。

## 再実行

attempt-006の保存済み成果だけを読む。backend、通常runner、factory、外部判断、大容量copy/PUT/downloadは再実行しない。新しい大容量fileも作らない。

別process readerで次を確認する。
1. 実 loadState / readStateSnapshot で保存stateを取得し、validate_digest_planがsucceeded。
2. FileRefと保存済みdigest_execution_inputのSHA一致。
3. receiver artifactRootだけをsourceDataRootにし、worker・元素材・保存STT・inspection・backend artifact rootへのreadをguardで禁止。
4. 実 readConsumedDigestPlanV001 で保存済み計画/dataBindingsを再構築し、保存execution artifactとdeepEqual一致。
5. 再判断・再登録・complete・state更新なし、forbiddenReadsDuringReconstruction=0。
6. 新しい小proofを別filenameで保存し、旧失敗証拠は不変。

成立すれば、upload-json一件の転送経路と保存後receiver-only再構築を限定完了として監査へ提出する。

MP4直接登録、inspection未提供の通常complete、目的2件の全3判断はnot-runのまま。v005全体完成、実AI品質、動画許可、人間品質採用にはしない。

追加削除、SSD操作、外部転送、新素材、外部推論、費用、動画製造、本番・公開は対象外。新3copyは保持。

報告：
Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. upload-json保存後receiver-only再読
