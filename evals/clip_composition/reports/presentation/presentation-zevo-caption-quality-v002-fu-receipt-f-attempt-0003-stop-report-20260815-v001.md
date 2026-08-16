# ZEVO字幕品質v002 F/U fixture receipt F正式attempt-0003 停止報告 v001

日付: 2026-08-15

## 1. 結論

override対象選択の訂正、静的分類、新fixture package製造、F/U admissionまでは合格した。F局所3件は全て、fixture package内のproof job file basenameとjob IDの不一致を既存runnerが正式入口で拒否したため0/3で停止した。

本修正後は不合格の帰属を問わず追加修正禁止であるため、同attempt修正0件のままU以降を未実施とした。

## 2. 今回成立した事項

1. path #12の閉包assertは`selectionReportOverrideBinding !== null`だけを対象とする。
2. 保存済み旧packageと新正式packageの双方で、binding object 2件、`null` 24件へexact分類できた。
3. 新fixtureSetId `zevo-caption-quality-v002-fu-formal-20260815-attempt-0003`を使用し、既使用set/rootの削除・上書き・再利用は0件。
4. fixture jobはstrict decoder、value validator、implementation binding 52/52、approved contract binding 17/17に合格した。
5. 48 file package/receiptの正式製造は終了0、stderr 0 byte、signalなし。
6. F admissionはartifact 44/44、environment 600/600、retention 26/26に合格した。
7. U admissionはvideo 3、QC 3、旧render plan 6に合格した。

## 3. F正式attemptの実測

| 項目 | 実測 |
|---|---:|
| Node test | 0/3 |
| ZCQ042 | rejected / job-read / CUE_PROOF_JOB_INVALID |
| ZCQ043 | rejected / job-read / CUE_PROOF_JOB_INVALID |
| ZCQ044 | rejected / job-read / CUE_PROOF_JOB_INVALID |
| stderr | 0 byte |
| process exit | 1 |
| signal | null |
| proof output parent内の子root | 0件 |

3件ともproductionの描画・QC・負例処理へ進む前にjob path照合で停止した。

## 4. 内側原因

既存proof runnerは、strict decode・schema検査の後に「job fileの拡張子を除いたbasenameとjob IDがexact一致すること」を要求する。承認済み完全実装設計の追補も同じ規則を明記している。

新fixture製造工程は次のpathでjobを公開した。

- 正常job: basename `proof-normal`
- 負例job: basenameは各負例label

一方、job本文のIDは全てfixtureSetIdを含む`zcq-...`形式である。正常例では、basename `proof-normal`に対しjob IDは`zcq-zevo-caption-quality-v002-fu-formal-20260815-attempt-0003-normal`だった。

現物27行を全量照合した結果:

- strict JSONとして復号できるjob: 26件
- basenameとjob IDが一致するjob: 0/26
- 意図的malformed job: 1件（job IDなし）

したがって、正常jobを含む全formal jobが既存runnerの正式path規則を満たしていない。

## 5. 三分法

| 帰属 | 判定 | 根拠 |
|---|---|---|
| F production | 欠陥なし | 承認済みのbasename/job ID exact規則どおり、入力を`CUE_PROOF_JOB_INVALID`で拒否した |
| fixture・検査設営 | **該当** | path #18の製造がjob IDと異なるbasenameを採用し、admissionもconsumerのpath規則を検査しなかった |
| 契約解釈 | 不要 | basename/job ID exact一致は既存承認済み文書とrunner実体の双方で固定済み |

これはoverride分類訂正の再発ではない。2件／24件分類とreceipt一本化は合格したままである。

## 6. 事前検出可能性

検出できた。fixture packageの正式成果物一件表へ、consumerが入口で検査する`job path basename ↔ job ID`を逆引き列として含めれば、F正式attempt前に26/26不一致を検出できた。fixture admissionがbyte・schema・SHA・環境だけでなくconsumerの正式path規則まで閉じているかの照合が不足していた。

## 7. 停止後の未実施

- 追加修正: 0件
- U局所: 未実施
- 正式48件: 未実施
- 直接影響回帰: 未実施
- green全件再計測: 未実施
- baseline 86/203: 未実施
- 既存5 tree・A-v002記録対象tree照合: 未実施
- commit・stable tag: 0件

## 8. 証拠

- override静的分類: `presentation-zevo-caption-quality-v002-f-override-selection-preflight-20260815-v002.md`
- fixture製造: `test-runs/20260815-zevo-caption-quality-v002-fixture-manufacture-formal-attempt-0003/`
- F正式attempt: `test-runs/20260815-zevo-caption-quality-v002-fu-receipt-f-formal-attempt-0003/`
- F TAP SHA-256: `64ec5a9efe5b526b8f442fb3266ad93b7a78ecc44bd46804060b8bfb343567b1`

## 9. 外部作用

- API通信: 0回
- countTokens: 0回
- generateContent: 0回
- 費用: US$0
- 正式描画: 0回
- commit: 0件
- stable tag: 0件

## 10. 再開に必要な裁定

path #18のfixture製造が、正常・負例のformal proof jobを`<jobId>.json`で保存し、admissionがbasename/job ID一致を全formal jobで検査する修正の可否。意図的malformed jobのpath規則と検査所有も同時に固定する必要がある。

