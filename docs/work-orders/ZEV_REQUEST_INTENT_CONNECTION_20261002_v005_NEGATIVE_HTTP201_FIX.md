# ID9 v005追補 — 現行否定資格のdraft作成HTTP201修正

発行日：2026-10-02（JST）
decision: continue

kawafmm承認済みID9と、軽微技術判断の相談役委任に基づく個別承認。本人への追加確認は不要。

基準checkpoint：fa9f56a3ec34ac1a7558b2262f96bd40b22db472
親：docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261002_v005_CURRENT_NEGATIVE_QUALIFICATION.md

## 判断

現行control routerの POST /request-drafts は正常作成時に HTTP 201 を返す。
attempt-001の否定試験は、この正常応答を HTTP 200 と期待したため最初のdraft作成直後にexit1した。

実router：
response.status(201).json({ draft, state });

失敗試験：
assert.equal(made.httpStatus,200);

したがって製品欠陥ではなく、試験設営の期待値誤りと判定する。
approve、claim、complete、否定資格、artifact validator等には到達していないため、旧attempt-001の結果を残り検証へ合算しない。

## 設営14

今回の修正を設営累積14回目として個別承認する。製品5／設営13を維持し、一般上限・履歴はリセットしない。

許可差分は一箇所だけ。

現状：
assert.equal(made.httpStatus,200);

修正：
assert.equal(made.httpStatus,201);

approve成功200、claim成功200、拒否409/400、current validator、state不変、FileRef/Output不増加、媒体作用0など、その他の期待値・意味は変更しない。

旧attempt-001、v001失敗証拠、失敗時test SHAを不変で保持する。
新attemptは attempt-002、新証拠は queue-current-negative-qualification-evidence-v002.json とする。
test内のruntime/evidence名/received metadataだけを新attemptへ追従してよい。

## 続行範囲

新attempt-002では、親current negative qualificationの残件をそのまま全て続行する。

- wrong claim ownerのnormal complete拒否
- expired claim recoveryと旧owner complete拒否
- approved purpose/source/settings/productionType/steps不一致・旧state拒否
- Output/FileRef owner不一致拒否
- 旧／未知artifact schema拒否
- 旧preparation binding版拒否
- missing dataBinding／不完全転送validator拒否
- negative-only通常completeがHTTP 400でstate/FileRef/Output/resultを増やさないこと
- 完成時の別process readback
- 旧証拠／006／007／製品code保全
- 媒体copy／PUT／hash 0

新しい実質的問題がなければ、途中で止まらず検証→保存→commit/push→Git clean→直接報告まで進める。

別の独立した設営不具合・製品修正が必要になった場合は、現行ルールに従って証拠と最小差分をGPT_DECISIONへ返す。今回の設営14へまとめない。

## 終点

全否定資格が現行版で直接成立した場合、既存の正実走と合わせて親v005 §8を一件ずつ再対照する。

全条件に現行版根拠が揃った場合だけ、
「v005隔離実装試験 技術完了候補」
として相談役へ最終監査提出する。

ID9-PD-01/02、本番有効化、実AI品質、字幕演出、動画許可、人間品質は別のまま。

報告：
Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 現行版資格・版・不完全転送拒否
