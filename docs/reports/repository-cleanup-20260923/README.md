# ZEV 作業ツリー整理調査（2026-09-23）

## 結論

未追跡47件・1,421,702 bytesの全件を内容・生成元・保存履歴・既存運用記録で分類した。41件は別branchに完全同一byteで保存済みの記録、6件は由来は判明しているが保存採否が未決のAPI準備記録である。削除できる根拠がある一時ファイルは見つからなかった。

今回の目的は次の開発前の安全な整理である。既存41件を保存漏れと誤認して重複追加せず、別工事の採否未決6件やQC方針差分を今回のcommitへ混ぜない。既存fileは削除・移動・上書き・stage・追加ignoreせず保全した。今回のcommit対象は本報告と[全47件の台帳](inventory.json)だけである。

**分類と保全確認は完了したが、採否未決6件と追跡済み方針差分が残るため、作業ツリーがcleanになった、または完全整理が完了したとは扱わない。** 次の工事で一括stageすると別作業が混入する状態は残る。次の開発を開始する承認やbranch統合の判断も行っていない。

## 1. branch / HEAD と整理前の状態

- branch: `codex/digest-effects-step2`
- HEAD: `43380006bc4f8e1c902c067dcb53669790b6ce2c`
- trackedで未stageの変更: `docs/policies/PRODUCTION_QC_LAYER_POLICY_v001.md` 1件（15行追加・1行削除）。人間レビューと診断資料を分ける別作業の方針変更。
- staged: 0件。
- untracked: 47件、1,421,702 bytes。`git ls-files --others --exclude-standard -z` でfile単位に計数。
- ignored: `git status --ignored=matching` の8,046項目。fileとdirectoryの混合集計で、ignored file総数とは呼ばない。

元branchは照会時のremote `9f8fb04a` に対して既存commit `43380006` が1件先行していた。この既存commitはレビュー文書1件で、stage3/stage4等のremote履歴にも含まれる。今回のcommitとは区別する。pushは通常のfast-forwardのみを対象にする。

## 2. A〜E分類

| 分類 | 件数 | bytes | 判断・処置 |
| --- | ---: | ---: | --- |
| A 現在の実装成果 | 0 | 0 | 未追跡の実装追加はない |
| B 保存すべき記録 | 41 | 1,239,701 | 別branchで同一byte保存済み。元pathの参照・履歴コピーを保持 |
| C Git対象外の媒体・生成物 | 0 | 0 | 今回の未追跡47件にはない。既存ignored媒体は別途保全 |
| D cache・log・中間生成物 | 0 | 0 | 今回の未追跡47件には安全に削除・ignoreすべきものはない |
| E 採否が未決 | 6 | 182,001 | 由来は確認済み。別API較正の正式保存・削除の採否が未決のため可視保持 |

JSONやcacheという名前だけでは一時データと判断していない。Bには自動生成の製造・検査記録も含むが、原path・原byteで過去の証拠として保存する扱いが履歴で確認できる。

### B 全41件の保存先と内容

40件は `880c063d987ee3d0c037ae1a2b3166cb335ac397` の救済記録に同じpath・同じbyteで存在した。同commitの `docs/reports/repository-hygiene-rescue-20260918/README.md` は元40件を元branchで未追跡として可視保持した経緯を明記。残り1件の研究報告は `5139bd3cf5e2f12ad0c471167625641ffd28a1ae` と同一byteであり、研究branch側の追記と元コピー保持を区別している。

9月23日に `git ls-remote` でstage3/stage4と研究branchのremote HEADを確認し、手元の同じcommit graphで保存commitの包含を確認した。個々のSHA-256、size、mtimeと保存commitは台帳に記載。

| path | bytes | 保存commit | 内容・保持理由 |
| --- | ---: | --- | --- |
| `docs/reports/openchatcut-checkpoint1-20260915.md` | 15,586 | `5139bd3c` | OpenChatCutの研究報告。既存監査commitと完全同一byte。研究branchでの追記と元コピー保持を区別。 |
| `evals/clip_composition/outputs/presentation/digest-effects-step2-comparisons-v003/advisor-final-audit.json` | 1,045 | `880c063d` | 演出Step 2の相談役による最終監査記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/base-media-bindings.json` | 1,461 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/base-media/generation-manifest.json` | 13,325 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/base-media/timeline.json` | 2,483 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/base-media/validation-receipt.json` | 2,771 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/caption-adoption.json` | 2,745 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/core-invocation.json` | 2,501 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/cue-end-projection.json` | 8,813 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/edit-plan.json` | 24,772 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/instruction.json` | 55,527 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/line-end-projection.json` | 13,881 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/machine-adoption.json` | 28,181 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/manufacturing-values.json` | 953 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/meaning-input.json` | 289,875 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/renderer-job.json` | 10,481 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/selection.json` | 9,528 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/source-media-inspection.json` | 2,800 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v001/source-package.json` | 193,328 | `880c063d` | Digestの候補採用、編集、字幕組立、描画命令、基礎映像製造・検査の再現記録。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/human-review-candidate-v001/human-review-guide.md` | 52,457 | `880c063d` | 旧人間レビュー画面・ガイドと診断資料。旧版を含めて履歴保持。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/human-review-candidate-v001/review.html` | 74,523 | `880c063d` | 旧人間レビュー画面・ガイドと診断資料。旧版を含めて履歴保持。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/human-review-candidate-v002/diagnostic-reference.json` | 69,128 | `880c063d` | 旧人間レビュー画面・ガイドと診断資料。旧版を含めて履歴保持。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/human-review-candidate-v002/diagnostic-reference.md` | 1,295 | `880c063d` | 旧人間レビュー画面・ガイドと診断資料。旧版を含めて履歴保持。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/human-review-candidate-v002/human-review-guide.md` | 1,889 | `880c063d` | 旧人間レビュー画面・ガイドと診断資料。旧版を含めて履歴保持。 |
| `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/human-review-candidate-v002/review.html` | 13,014 | `880c063d` | 旧人間レビュー画面・ガイドと診断資料。旧版を含めて履歴保持。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/advisor-qc-color-metadata-decision-v001.json` | 3,670 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/editorial-review-v001/advisor-procedure-decision-v001.json` | 1,221 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/formal-v004/qc-only-v002/cache-verification.json` | 5,016 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/formal-v004/qc-only-v002/cache/baseline-verification.json` | 1,201 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/formal-v004/qc-only-v002/cache/transparent-verification.json` | 1,224 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/formal-v004/qc-only-v002/comparison-implementation.json` | 1,301 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/formal-v004/qc-only-v002/inherited-baseline-source.json` | 192,932 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/formal-v004/qc-only-v002/observed-cache-interpretation.json` | 12,783 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/full-pre-encode-timing-preflight-v001.json` | 801 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/qc-cache-capture-fixture-v001-kpdUji/result.json` | 4,745 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/qc-color-equivalence-v001/result.json` | 21,508 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/qc-color-verification-v001.json` | 98,058 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/qc-only-v001-host-exit-observation.json` | 495 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/qc-only-v001-parent-closure-before-signal.json` | 1,079 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/qc-only-v001-parent-closure-result.json` | 358 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/typecheck-comparison-v008.json` | 947 | `880c063d` | 指示024の判断・色条件比較・キャッシュ検証・旧検査終了・型検査の軽量証拠。キャッシュ本体ではない。 |

### E 採否未決の全6件

- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0001-inference-record-v001.jsonl`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0001-local-revalidation-v001.json`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0005-inference-record-v001.jsonl`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-four-inference-record-v001.jsonl`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-three-inference-record-v001.jsonl`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/stage1-measurement-v001.json`

9月5日のAPI較正における送信条件・生応答・使用量・失敗・ローカル再検証・測定の記録である。[9月6日の統合記録](../main-integration-canonical-alignment-20260906-v001.md) §4が6件を列挙し、採否・削除を決めず現物保持としている。9月18日の整理記録 `65276fef:docs/reports/repository-hygiene-stage3-20260918/README.md` も別API準備6件はignore/pushしないと記録する。

今回の整理では、既存終了記録に加えて正式保存する必要があるのか、過去に保持とされた証拠を不要と確定できるのか判断できない。推論を再実行・再評価せず、原pathで可視保持した。これらの本文は今回の報告へ転記していない。

## 3. ignoredの確認と処置

既存のroot・eval配下・個別レビュー配下の `.gitignore` と、既存 `.git/info/exclude` を `git check-ignore -v -z --stdin` で照合した。8,046項目中7,935項目は既存のlocal除外規則、残り111項目は共有ignore規則に該当。これは容量測定やdirectory配下の全file列挙ではない。

- 原動画、完成候補MP4、音声chunk、字幕画像、描画作業領域は既存規則でGit対象外。生成物の全体除外は追加しない。
- 検査の処理log、画素比較の中間証拠、framehash等は過去検証・失敗診断のため現位置で保持する。再生成可能性や削除可能性を今回断定しない。
- `.env`、依存package、pnpm store、Python cache、`.DS_Store` も既存ignoreが効いている。認証内容は読まず、今回の整理による削除は行わない。
- `.gitignore` と `.git/info/exclude` の追加・変更は不要であり0件。開始時SHAを台帳に記録し、不変を照合する。

9月18日の既存整理で未追跡59,153件から47件へ減らした履歴と、今回の47件が一致する。今回47件を新しい取りこぼしと判断する根拠はない。既存の共有ignoreが別branchにあり、元branchでは同じ生成物にlocal除外が効く点も区別した。

## 4. 実施・非混入の確認

| 対象 | 今回の処置 |
| --- | --- |
| 元から存在する47件 | 全件のSHA-256を開始時と再照合し保全。新規Git追加0・削除0・移動0 |
| 既存QC方針の変更1件 | 開始時のSHA・差分を保全し、stage/commit対象外 |
| 新規記録 | 本READMEとinventory.jsonの2件だけを明示pathでstage対象とする |
| ignore | 既存設定を維持。追加0件 |
| stale worktree登録 | 不在を理由にpruneしない。元の退避folderにも触れない |
| 機能開発・費用・媒体 | 実装・生成・API再実行・取得・Git追加を行わない |

検証はfile一覧、Git objectとの全byte比較、SHA-256、ignore適用、stage差分の対象照合に限定する。機能・検査codeを変えていないため、ZEVの描画や機能testは実行しない。

## 5. commit前後に確認する状態

開始時の未追跡47件と追跡済み変更1件は同じ内容のまま残る。今回の2件の記録をcommitした後、stagedは0件、既存未追跡47件、既存の方針変更1件になることを検証する。新規追加は今回の記録2件だけ、削除とignore差分は0件である。

今回のcommit SHA・push結果・commit後の実測値は最終報告で示す。本記録を保存するcommit自体のSHAを本文へ埋め込まない。
