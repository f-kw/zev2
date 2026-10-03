# 正式callerの読込修正とcode binding更新条件

読取：2026-10-03T13:49:59.859769+00:00、HEAD `e8e80af06efe1332a152eda68003558948517bdf`。repo編集・新監視・描画・テスト・製造は行っていない。

## 結論

**callerの2行読込修正は、candidateStyleのaccepted f2ef依存検査には引っかからない。** 旧rootと失敗body-continuation-v001の `trust.rendererDependencies` は同じ8件で、caller `evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts` は含まれない。この8件は字幕描画entry/text layout/TelopText/font/render model/linebreak/metrics/glowであり、f2ef実bytes検査をそのまま維持すればよい。一般trust・依存list・fontの書換えは不要。

callerは別の `rendererImplementationBindings` の `instruction-renderer-runner-v002` roleに含まれる。candidateStyle末尾はこの全code listを現行repo実file hashで新しく束縛する。正式file callerも全implementationの実bytesを観測し、job bindingへ照合する。新sourcePackageの7実装binding、新core-plan、新permit/currentSHAも修正後の実bytesに揃える。古いv001 job/source/planのhashを現行codeへ付け替えない。

## 直接拒否する現在の条件

1. `inspectDigestFormalBodyContinuationV001` のindex2以降不変検査はcallerをindex2として検査するため、2行修正後は `BODY_UNCHANGED_IMPLEMENTATION_CHANGED` で拒否する。callerだけexact reverse資格へ替える必要がある。node:urlのpathToFileURL追加とqualifier importの固定absolute fileURL化を元へ戻すと旧callerの実bytesへ完全一致、という検査を追加し、旧code SHAと新code SHAの両方を検査する。index3〜6の4ファイル不変は維持する。
2. v001の子領域はmetadata20filesが保存済み。`BODY_NEW_ROOT_ALREADY_USED` /write `wx` を緩めず全保持する。今回の18.1秒・exit1・media0・二つの資源reply成功・実エラー・shutdown/残存0を束縛し、再実行は固定別child（例v002）にfresh plan/style/source/job/結果を作る。単にownerを差し替えてv001へ追記しない。
3. 固定別childを使う場合、Core exact root gate・adapter BODY_OUT/publish/readback/source資格・owner/monitor/tempとそのexact-diff資格も同じ固定literalへ揃える。任意suffix/prefix受付やgeneral resumeは追加しない。

## 読込方法の範囲

提案の `pathToFileURL(path.resolve(MODULE_DIRECTORY, '../../runner/src/digest-formal-handoff-v001.ts')).href` は、実repo内の同adapterを固定file URLで指す。tsx CJSのdata URLを相対importの基点にしない修正で、opacity/WeakSet/current検査は維持する。moduleの同一性は修正後の正式entryまたは親の小さい検査で確かめ、WeakSet資格を省いて読込成功扱いにはしない。新loader/一般import解決設定は不要。

## 確認済みと未確認

v001のsummary実読取：13:44:08〜13:44:26 UTC、18.1009249687秒、exit1、remainingRunning空。worker.logは `ERR_UNSUPPORTED_RESOLVE_REQUEST` と非hierarchical baseから相対URLを解決できない実エラーを含む。動画/glyph/QCが実行されたことにはしない。

読み取りで確定したのは依存list、callerのcode role、current資格の拒否条件。提案修正の適用、module identity、正規新entry資格、fresh device/pressure/RSS、正式描画/QCは未確認。
