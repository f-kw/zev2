# 9の後続 — 144px適合診断の正本byte読取修正

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：decision: continue
監査対象：9dc723304cf3387ae1b45e3ba8f654c61d7ea3a0
親正本：[144px技術候補への表示適合確認](ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)
承認根拠：kawafmm承認済み親作業とAGENTSの軽微技術判断の相談役委任。既存scope内の設営欠陥一件を個別承認し、本人への再確認・視聴・採点・転記は不要とする。

## 1. 現物監査・現在地

同SHAのcheck-style.mts全文、evidence.json、CURRENT_GOAL/HANDOVERの停止記録、2626106bからの担当5file差分、親正本を照合した。

check-styleのrefはbytesでSHAを照合した後、jsonでJSON.parseする。main内の `await ref(evidence.workOrder);` はMarkdownの親正本にこのJSON処理を適用しており、保存されたUnexpected token #／SyntaxError・run exit1と整合する。正本の内容やSHAが不正だったという判定ではない。既存bytesは.mdを許可し、期待SHAの照合とobservedへの登録を行うので、そこまでを使う修正で足りる。

設営26適用と対象型検査exit0を保持。診断到達0・完成JSON0であり、144px/A候補の全cue適合・不適合結果はまだない。製品/Skill/rendererの欠陥や字幕の不適合として扱わない。v005、実判断計画7bb5de02、入力対応4556e389、準備a98f569a、表示回答fda455c4、計画時計903d79b4のacceptは不変。

失敗時helper SHA：5048864bbf9a3c0073b5f99c971dec0a1641fb1fa0a72e7a615fc49e7a4205c8。
旧失敗はruntime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-001/のfailure.jsonとevidence-snapshot.json、および9dc72330固定Git版へ保持する。

監査はGitHubの保存コード・記録による。相談役はMacの失敗processやignored runtimeを直接再実行・再hashしていない。process残存0はCodex報告として保持する。

## 2. 個別承認する設営27

同一原因の読取修正と、失敗保全に直接必要な新試行先の追従を設営27の一件として承認する。製品6は維持し、適用時に設営26→27と記録する。一般上限・強制停止・過去履歴・Codex自己承認権は変更しない。

対象はdocs/reports/digest-caption-style-compatibility-20261003/check-style.mts。

旧：
```ts
await ref(evidence.workOrder);
```
新：
```ts
const scope = obj(evidence.workOrder); await bytes(str(scope.path), str(scope.fileSha256));
```

MarkdownをJSON解析せず、既存byte readerで実bytes/SHAを照合する。.json入力に対する既存ref/json、SHA一致、path制限、observed照合、例外処理は維持する。汎用の型推測、fallback、JSON自動修復、reader/validator改変は行わない。

OUTだけを次へ変更する：
`runtime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-002`

親directoryと新先不存在を確認し、新規作成・wxの排他保存を維持する。旧attempt-001の削除・上書きやEEXIST無視はしない。新先が既に存在するなら由来を確認し、勝手に消さない。

同helperのmanifest.history、evidence/README/現在地の累積・実受領HEAD・新先・時刻・失敗履歴の記録追従は許可する。その他の診断ロジック・入力・期待値・style・配置規則は変更しない。新しい補助ファイルや試験基盤は追加しない。

## 3. scope・失敗証拠の保全

親正本は編集しない。evidence.workOrderと出力scopeBindingは親正本を指したまま、その実SHA `4e244e34f9b3f04ed338574801a38eccc76e7b1be4fafb5b6a6fed6827b363b5` を維持する。この追補は別の修正/再開承認としてpath・実SHA・受領HEADを記録し、元scopeへ付け替えない。

旧failure.json/evidence-snapshot.json/失敗時コードと型0/run1/診断0は不変に保存する。後の成功で初回失敗を上書きしない。新manifestの実装参照は修正後helperの実SHAへ束縛し、旧SHAを改変しない。

## 4. 再開範囲と完了条件

対象補助の必要型検査と既存の実export/入力SHA/出力不存在確認後、親正本の残りを同じセッションで続行する。

1. 既存A=8/4・144px Normal候補の保存小JSON・元参照鎖を確認する。比較verificationのraster[tag=0-A,label=0].props、candidate-plan/raster-records、同参照鎖のfont宣言の整合は実行時に確認し、まだ合格済みとはしない。7A初期4/4やB8/12のfieldを混ぜず、不足は具体的な欠落として扱う。
2. 既存indexExplicitLinesV001/buildExactTextModel/inspectPresentationRenderLayoutV001で全218cueの適合・不適合・評価不能を記録する。Nodeのdocumentなし推定幅だけを使い、実glyph/raster/alpha検査と区別する。本文・行末・時計・所属・順序は変えない。
3. 正常な領域不適合は想定診断結果として全件収集する。不適合をhelper故障とみなして初件で止めず、予期しない例外も隠さない。縮小/折返し/safe area緩和で無理に合格させない。不適合cueと元要求の最小再準備対象を示し、新要求や新回答は作らない。
4. 新小JSONの保存直後再読一回でobject/bytes/SHAを照合し、読んだ旧小入力/回答/実装の不変を確認する。担当成果のみ通常commit/push、Git状態/自分の対象process終了確認、専用Edge直接報告まで進める。

新しい否定suite・別process試験・旧資産全走査、旧run-display/map-timing/通常4工程/QC/人間レビューは追加・再実行しない。今回の一行修正のために完了済み作業を開き直さない。

## 5. 変更しない境界・受渡し

製品code、旧helper/Skill/validator/renderer、元purpose・承認・準備/回答/計画時計は不変。
媒体/フォントbinaryのread/hash/copy/PUT、通常HTTP/backend/index runner、新API/provider/費用、STT/inspection/ffprobe、内容再判断・新要求/回答、描画/背景/演出/動画、新queue/UI、SSD、削除、本番/公開は行わない。

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持。Aは技術候補であり人間の縁選択ではない。144px/条件付き分割の既回答を再質問しない。

同じCodex2専用Edgeで返信生成完了・全文読了まで受領し、上記を同セッションで続行する。本人への再手貼り・転記・視聴・採点、Codex1起動、受理だけの独立commitは不要。
報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・144px技術候補と表示回答の適合

発行時点：設営26適用と型0/run1・診断到達0を監査済み。設営27の受領・適用・attempt-002実行・診断完成は未確認。