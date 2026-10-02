# 9の後続 — 表示回答の一行末修正・同一回答再利用

発行日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
判定：decision: continue
承認根拠：kawafmm承認済みの保存9表示要求への実回答作業と、AGENTSの軽微技術判断の相談役委任に基づく個別承認。本人への視聴・採点・再確認・転記は不要。
監査対象：d93e641815f4f5f17eeb857754a986af5c0b53e0
親正本：[保存表示要求への実回答v001](ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)
前追補：[設営22](ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_NEGATIVE_MESSAGE_FIX.md)

## 1. 監査と判断

同SHAのREADME、evidenceのacceptedResponses/currentContentCheckpoint、run-displayと0c24061eからの差分を照合した。attempt-002の9回答・3,613atom・218表示単位/289行、run/readback exit0、既存validator受理、SHA差替え拒否、元21小入力/実装不変は保存された技術成立として保持する。

一方、要求9・第9表示単位の行末は「まあマリンはこんなもん／にしようかなと思います?」。Codexが保存した文節条件への不適合に対し、「に」を前行へ含める最小修正は妥当。連結本文・cue終端・所属/順序・行数を変えず、論理幅は22/23から24/21で既存36以内のままになる。

これは既に許可した表示境界の実回答を訂正するもので、人間品質採用や製品方針変更ではない。製品validatorは技術条件を正しく検査しており、製品修正累積7とはしない。現在の表示候補全体の最終acceptはこの一点の修正・保存後再検査まで保留する。v005、7bb5de02、4556e389、a98f569aのacceptは不変。

監査はGitHubの保存コード・証拠による。相談役がMacのignored runtimeを直接再実行・再hash・映像視聴したものではない。

## 2. 許可する回答修正は一箇所

対象：要求9のresponse-0009.json、answer.captions[0].cues[8].lineEndBoundaryIds[0]のみ。

- 旧行末：要求内local124、boundary IDの末尾boundary-003513。
- 新行末：要求内local125、末尾boundary-003514。
- cue終端：local136のまま。
- 修正前：まあマリンはこんなもん／にしようかなと思います?
- 修正後：まあマリンはこんなもんに／しようかなと思います?

実要求のboundaryCandidatesから完全なIDを取得して対応を確認し、IDの推測や新設はしない。要求9の実SHAは51931ef75ed33d81f7845924b4b9d07258849f1746146ee2b89b5897659b3943。旧response-0009の実SHAは7debdc87ea057f3ce36b4bcb4c81af9a7cbec0c271ec68809413dc1e1e0e7e7f。

新実行で要求9が提示された後、旧回答のsize/SHA・要求の実bytes/SHAを照合し、一行末だけ変更した新responseを新先へ排他作成する。元answerとの構造差分が上記一fieldだけであることを確認する。requestFileSha256、schemaVersion、judgmentNote、その他のcue/行末は維持し、修正理由・新回答SHAはreport/evidenceへ別記する。

本文、疑問符、保持範囲、順序、cue終端、要求9の16表示単位/17行は変えない。今回の全体218表示単位/289行は保存候補から変わらないことの照合値であり、製品の恒久目標値にしない。

## 3. 設営23として許可する保存先追従

対象：docs/reports/digest-caption-display-answers-20261003/run-display.mts。

OUTだけを `${PARENT}/attempt-003` へ変更する。新先は
runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-003/。

同じ補助のhistory、setup23Applied、実受領HEAD・再開時刻・再利用/訂正の記録を追従してよい。最終manifestの受領HEADと補助実SHAは今回の実行版へ正しく束縛する。判定機能、stdin手順、reader、既存validator、例外処理、期待拒否本文、原入力・schema・親SCOPE_PATHは変更しない。汎用resume機能や新しい試験基盤は作らない。

保存済み候補を上書きせずこの訂正を保存するための一件として、適用時に設営22→23を個別計上する。製品6は維持する。内容の一行末訂正、設営21/22/23、過去の新二path実装・製品修正は区別する。一般上限、強制停止、過去履歴、Codex自己承認権を変更しない。

新attemptの不存在と親directoryを確認し、新規作成/排他保存を維持する。既存attemptの削除・上書き・EEXIST無視はしない。

## 4. 回答1〜8を再判断しない

attempt-002のmanifest実SHAは996f506dedbd1c7fc512de9ff0f8ad5bd057d101410d842d54ac418f2c22816a。

新実行で各display-judgment-requiredが提示された後、その実要求bytes/SHAを旧manifestの対応requestと照合する。旧responseの実size/SHAとrequestFileSha256を旧manifest/evidenceの対応値に照合した上で、同じ番号の新responseへbyte同一・排他作成でコピーし、既存stdinへ返す。旧1〜8回答の内容再判断・再整形・要求SHA付替え・未来回答の先送りは不要/禁止。

同一性が成立しない場合は流用せず、その不一致を相談役へ返す。result/token/trace/receiptは実Skill/validatorから新たに生成する。旧resultや合格印をコピーして実検査の代用にしない。

この8回答の小JSONコピーと9の新回答保存だけを許可する。実コピー量を記録し、媒体や他の旧成果復元へ広げない。再利用待機/コピー/再検査を新内容判断時間に数えず、要求9の訂正判断/整形時間を分ける。初回第一回答の独立時間未測定を後付けで埋めない。

## 5. 保存と確認の終点

旧attempt-001のexit1と全失敗記録、attempt-002の全回答/result/trace/receipt/manifest/readback/log/content-checkpointとrun/readback exit0は不変保持する。d231a911・d93e6418の固定Git版も保持。今回訂正の必要性を理由に旧技術合格を失敗へ変えず、旧内容未達を隠して完成へ変えない。

対象補助の必要型検査と既存preflight後、attempt-003で同一1〜8再利用・要求9の一行末訂正→全9件の既存Skill/validator受理→新trace/receipt/manifest保存→変更後最終束の別process再読一回を行う。既存のSHA差替えclone一件はhelperのまま通し、追加の否定項目や旧suiteを増やさない。

全3,613atomの本文/所属/順序/被覆、cue終端と行数、論理幅、1〜8の回答bytes不変、9の一field差分を確認する。別processは内容判断なしに保存response/resultからtoken/traceを再構築し、新束のSHA/trace bytes一致、元21入力/製品実装/旧候補不変を確認する。旧attempt-002の再読を今回の再読へ付け替えない。

今回の小さな訂正差分の確認は行うが、既に通った9要求の内容判断や準備接続、通常4工程、旧suite、動画QC、人間レビューを白紙から繰り返さない。

完了時は親scopeの候補回答一式の完了条件を再対照し、「保存9表示要求への実回答・検査・保存完了候補」として監査提出する。技術成立、今回自己訂正の完了、人間品質未確認を分ける。

## 6. scope・禁止・受渡し

親回答正本の実SHA 3f2982a5b55f27c29b62f83cbf2871b3339c3a8b62716fab637f533f9074767a、準備bundleと元scope、purpose・承認snapshotは変更しない。本追補の実path/SHAは今回修正/再開承認として別記し、元scopeBindingへ付け替えない。旧回答manifestが束縛した旧helper SHAも書き換えない。旧版の履歴確認と、新実行版を束縛した再読を区別する。

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持する。36論理幅/2行の技術条件を144px最終style、表示時間、見心地の合格にしない。

製品code/Skill/validator/reader変更、媒体read/hash/copy/PUT、通常HTTP、新API/provider/費用、取得/STT/inspection/ffprobe、演出/描画/画像/背景/音声/動画、新queue/UI、SSD、削除、本番/公開は0。新しい実質問題がなければ上記範囲を最後まで進める。

担当fileのみ通常commit/pushし、Git状態と対象process終了を確認。同じCodex2専用Edgeから直接報告し、返信生成完了・全文読了まで受領する。本人への転記・視聴・採点・再手貼り、Codex1起動、受理だけの独立commitは不要。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・保存表示要求への実回答

発行時点：設営22適用とattempt-002技術成立・一箇所未修正を監査済み。本追補の受領・設営23適用・attempt-003実行・訂正完了は未確認。Mac上の現processを相談役が直接観測したものではない。
