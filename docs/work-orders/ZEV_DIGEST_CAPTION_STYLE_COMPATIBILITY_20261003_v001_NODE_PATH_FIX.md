# 9の後続 — 144px診断の既存Node依存解決

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：decision: continue
監査対象：0f103935d50b6c6059f8bf0db723f8be80a6923d
親正本：[STYLE_COMPATIBILITY](ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)
前修正：[SCOPE_READ_FIX](ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_SCOPE_READ_FIX.md)
承認根拠：kawafmm承認済み親作業とAGENTSの軽微技術判断の相談役委任。同じ診断の起動設営一件のみを個別承認し、本人への再確認・視聴・採点・転記は不要。

## 1. 監査と未完了範囲

0f103935のcommit差分、report/evidence、CURRENT_GOAL/HANDOVERと前修正を照合した。設営27の正本byte/SHA読取、OUT attempt-002、manifest履歴27は適用済み。型検査exit0の後、既存presentation_renderer_entry_v001.tsxのimportでMODULE_NOT_FOUND: reactとなり実run exit1。cue診断0・完成出力0を保持する。正本読取修正の再要求はしない。字幕・配置条件や既存validatorの不適合として扱わない。

同一HEADのtools/digest-quality/integrated-preview.mjsとoriginal-resolution-local.mjsは、既存layout inspectorのchildにenv: {NODE_PATH: path.join(root, 'runner/node_modules')}を渡している。今回もインストールや製品変更ではなく、既存依存を対象processへ解決させる起動設定で扱う。

runner配下でReact 18.3.1/Remotion 4.0.481のrequire.resolveが成功し、元NODE_PATHがnullだったことはCodexの実機確認報告。相談役はMacで同コマンドを再実行していない。require.resolveの成功・既存起動例は修正根拠であり、今回loaderでの実importや全cue診断の成功を先に認定しない。

## 2. 設営28として許可する一件

対象childの起動環境だけにNODE_PATHを渡す。確認済みworkspaceをcwdにし、既存nodeと既存tsx loaderを使う。

```sh
cd /Users/kawafmm/workspace/zev2 && \
NODE_PATH=/Users/kawafmm/workspace/zev2/runner/node_modules \
node --import ./runner/node_modules/tsx/dist/loader.mjs \
docs/reports/digest-caption-style-compatibility-20261003/check-style.mts run
```

実workspaceと既存依存の位置を照合してから使う。環境値はこのコマンドのprocessとその子に限定する。shell profile・恒久export・本番設定へ保存しない。他processへ設定しない。

小補助check-style.mtsはOUTだけを次へ変更する。
`runtime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-003`

manifest.historyのsetupを28へ、evidence/README/自分の現在地に適用回数・実受領HEAD・起動command/cwd/NODE_PATH・既存依存の解決先・新先・失敗履歴を記録する。これらは同一の起動設営と失敗保全用追従の一件。適用時に製品6/設営27→製品6/設営28とする。一般上限・強制停止・過去履歴・自己承認権を変えない。

禁止：install/update、新dependency、package.json/lockfile/node_modulesの編集、新symlink、module stub、独自resolver/loader、製品/renderer/Skill/validator変更、検査関数の複製や差替え。既存pnpm symlinkの解決・module読取は今回の既存依存利用であり、新symlink作成ではない。旧integrated-preview/original-resolution処理を起動しない。

## 3. 入力・scope・証拠保全

SCOPE_READ_FIXのbyte読取は維持する。ref/json、path/SHA検査、例外処理、Node/documentなし推定幅、A8/4、本文・行末・時計・配置規則は変更しない。

親正本・evidence.workOrder・出力scopeBindingの実SHAは4e244e34f9b3f04ed338574801a38eccc76e7b1be4fafb5b6a6fed6827b363b5のまま。この追補は別path/実SHA/受領HEADで記録し、設営27のrepairApprovalを消さず履歴として保持する。新manifestには今回実行helperの実SHAを記録し、旧束のSHAを付け替えない。

旧attempt-001のMarkdown読取失敗、attempt-002のReact解決失敗は別々に不変保持する。後者のfailure.json/evidence-snapshot.json/process-output.txt、失敗helper SHA 1f346a9dcf1752e765c54938118330d6147defb02efa26c7cb9de2b8b13970a8、0f103935固定Git版を保持。型0/run1/診断0を後の成功へ書換えない。

新先不存在・親directoryとwx新規保存を確認し、旧attemptを削除・上書きしない。既存先があれば消さず由来を確認する。元要求/回答/時計/旧成功・失敗証拠の再製造はしない。

## 4. 再開と終点

必要な補助型検査・既存入力SHA/新先preflightを行い、上記起動条件で既存renderer/inspector/indexerの実import/export確認を通す。require.resolveだけで実importを合格扱いしない。新しい独立probe基盤・否定suiteは作らない。

通過後は追加承認待ちを挟まず、親scopeの全218cue診断→適合/不適合/評価不能と元要求への最小対象対応→新小JSONの保存再読一回→読んだ旧小入力不変確認→担当のみ通常commit/push・Git状態/自分のprocess終了確認→専用Edge直接報告まで進める。

通常の領域不適合は想定診断結果として全cueを収集する。最初の不適合でhelper故障扱いして停止しない。予期しないimport/参照/実行例外は隠さず、まだ解決しなければ実エラー・解決先・最小不足を相談役へ返す。自動install、別module/stubへの切替で通さない。

新要求/回答・再分割・font縮小・safe area緩和・独自時計は行わない。旧suite、通常4工程、旧map-timing/run-display、媒体QC、人間レビュー、全過去資産走査を追加・再実行しない。

## 5. 権限と受渡し

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持。144px・条件付き分割の既回答を問い直さず、Aを正式な縁採用へ変換しない。

媒体/フォントbinary read/hash/copy/PUT、通常HTTP/backend/index runner、新API/provider/費用、STT/inspection/ffprobe、内容再判断、描画・画像・背景・演出・動画、新queue/UI、SSD、削除、本番/公開は0。既存コードのimport許可をレンダリング実行許可にしない。

同じCodex2専用Edgeで返信生成完了・全文読了まで受領し、同じセッションで上記を続行する。本人への再手貼り・転記・視聴・採点、Codex1起動、受領だけの独立commitは不要。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・144px技術候補と表示回答の適合

発行時点：製品6/設営27適用、型0/run1/診断0を保存証拠で確認。設営28の受領・適用・実import・attempt-003診断完成は未確認。旧実run終了・Git clean/untracked0はCodex報告であり、相談役がMacの現processを直接観測したものではない。
