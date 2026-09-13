# ZEV ダイジェストv1 — C全採用の実行入口

既存のcandidate一覧を制作上のProspect一覧として受け取り、保存済みの候補内部保持と字幕判断から動画を製造する。candidate正本、candidate ID、意味判断Skillは変更しない。現行の相談・監査先は **ZEV進行管理３**。

## 処理

1. 保存済みcandidate一覧・探索判断・正式IDの対応・保持判断・切断位置の根拠を、候補ごとに既存の検証入口へ渡して照合する。候補間の重複と入力順はこの段階で拒否せず、後段の整列・統合に渡す。
2. Cは一覧のcandidate IDを全件採用する。採用IDから先は共通処理とし、A/Bの採否判断は今回接続しない。
3. 各候補の保持後の元動画区間へ展開し、実際の開始・終了時刻で並べる。
4. 同一・包含・連鎖する重複を区間の和集合にする。元のcandidate IDと保持根拠はすべて残す。半開区間の接点と離れた隙間は統合しない。
5. 保存済みcaption-display-boundariesの判断、確定済みの字幕同期位置、明示された字幕除外を再利用する。元の字幕単位ID・本文・改行を保ち、統合後の時間軸へ投影する。
6. 既存の基礎映像製造、固定style、字幕投影、ZEV Core、renderer、technical QCを通す。

字幕の途中を切る新しい保持範囲、未判断の字幕、時刻が保持範囲から外れる字幕は、既存判断だけで補わず具体的な不足として拒否する。一般的な文脈探索や新しい意味判断は実装していない。

## 実行

repository rootで実行する。下記は今回使用した保存済み成功素材の例。新しい実行では未使用のjob保存先・出力先・実行IDを指定する。

```sh
pnpm exec node --import ./runner/node_modules/tsx/dist/loader.mjs \
  evals/clip_composition/run_digest_v1.mts prepare \
  evals/clip_composition/outputs/presentation/work-candidate-selection-20260908-v002/fixed-plan.json \
  evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/caption-human-repair-render-v002/manifest.json \
  evals/clip_composition/jobs/digest-v1/20260913-v003/job.json \
  evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v003 \
  digest-v1-20260913-v003

pnpm exec node --import ./runner/node_modules/tsx/dist/loader.mjs \
  evals/clip_composition/run_digest_v1.mts run \
  evals/clip_composition/jobs/digest-v1/20260913-v003/job.json
```

実行設定は入力ファイルと実装のhashを結び付けた製造用設定であり、新しいProspect正本ではない。受領指示の記録だけで、新しい承認を作るものではない。実行は承認済み範囲に限る。

入口のadapterは、既存candidate-selectionの保存済みcontextと、完成字幕manifestから必要な入力参照を取り出す。候補ごとの保持検証は既存の処理をそのまま使い、候補間の時間順・重複は共通の整列・統合だけで処理する。旧工事のplanや実行証拠を上書きしない。共通処理自体は素材名・候補数・区間数・字幕数を固定していない。

`verification.json`には、入力参照、保持区間、基礎映像、Core出力、rendererの結果、technical QC、完成MP4の参照が残る。人間の採否や完成承認は自動付与しない。

## 検査

```sh
ZEV_DIGEST_V1_TEST_JOB=evals/clip_composition/jobs/digest-v1/20260913-v003/job.json \
  pnpm exec node --import ./runner/node_modules/tsx/dist/loader.mjs --test \
  evals/clip_composition/digest_v1.test.mts

pnpm exec node --import ./runner/node_modules/tsx/dist/loader.mjs --test \
  evals/clip_composition/candidate_internal_retention_v001.test.mts \
  evals/clip_composition/candidate_selection_e2e_v001.test.mts \
  runner/test/caption-display-boundaries-v001.test.mts
```

追加検査は整列・重複統合・採用IDからの共通処理・既存実データとの接続・字幕不足の拒否に限定する。映像品質の自動評価や大規模な証明suiteは追加しない。
