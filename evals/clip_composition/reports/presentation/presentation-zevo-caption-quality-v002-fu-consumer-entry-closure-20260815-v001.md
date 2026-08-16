# ZEVO字幕品質v002 F/U consumer入口閉包記録 v001

日付: 2026-08-15

## 1. 目的

F/U fixture packageとreceiptが、byte・schema・SHA・環境の検査だけでなく、実際のconsumer正式入口が受理するpath・basename・起動入力まで保証していることを現物から逆引きした。今回の修正対象はproof jobのbasename規則であり、既存consumerの拒否規則は変更しない。

## 2. 現物照合

| 現物 | 照合位置 | consumerが要求すること | fixture製造・admission側の保証 |
|---|---:|---|---|
| F proof runner | 842〜853行 | 実行入口はjob path、atomic publisher loader、19 capabilityのexact入力。job pathはworkspace相対path | F testがreceipt admission済みのjob bindingを実行入口へ渡す。capabilityとpublisherはF test／formal CLIの既存正本が所有し、fixture packageは上書きしない |
| F proof runner | 881〜915行 | job byteをstrict decodeし、保存basename（拡張子除外）とjob IDがexact一致 | 製造時とadmission時の双方で、strict decode可能な正常1件・負例25件を実byteから復号し、26件全てをbasename／job ID一致検査する |
| F proof runner | 916行以降 | implementation、approved contract、runtime data、runtime実体をlive再読 | fixture製造jobが現物SHAをproof jobへ転記し、proof runner自身が正式実行時に再照合する。admissionがlive検査を代行したとは主張しない |
| F proof runner CLI | 1491〜1509行 | 固定TSX経由の直接起動、job path一引数 | 正式attemptの起動command byte照合recordが保証する。fixture packageはcommandを製造しない |
| F test | 66〜68、709〜744行 | receipt環境変数は指定名一件、値はworkspace相対receipt path。F admissionに合格したpayloadだけをtestへ渡す | admission入力はexact 2 key、receipt pathはworkspace相対・fixture root配下・固定basename。artifact 44件、environment 600件、retention 26件をstable再読する |
| F test | 725〜731行 | selection report overrideはbinding objectの2件だけ、null 24件は上書きなし | packageの既存schemaを維持し、fixture側で値を変更しない。F testの対象選択preflightで2件／24件を実byte照合する |
| U test | 16〜18、96〜111行 | 同じreceipt環境変数からU admissionし、review input、video 3件、QC 3件、旧plan 6件を受け取る | receiptのartifact bindingをstable再読し、Uへreview fixtureだけを返す。U testは既存validatorとbinding照合を引き続き実施する |
| F/U環境 | fixture runnerの環境manifest製造とadmission | proof output、staging、renderer workを含むproduction導出pathが宣言状態に一致 | 共用path projectionから600行を製造し、F admission時に全行を実測する。Uは媒体fixtureのstable再読を受ける |
| malformed job-read負例 | proof job decoderとpackage負例行 | strict decode不能なのでjob IDを持たず、formal basename規則を適用できない | labelを`malformed-byte-envelope`、bindingをbyte binding 2 key、basenameを`malformed-byte-envelope.json`に固定し、decoder rejectedを製造時・admission時に確認して26 formal jobから明示除外する |

## 3. 閉包結果

- formal proof job: 正常1件＋負例25件＝26件。全件を`<jobId>.json`で製造し、admissionは保存済みbyteを同じproduction decoderで復号してbasenameとjob IDを照合する。
- malformed byte fixture: 1件。job IDを持たない専用負例としてformal 26件から除外し、専用basename・byte binding・decode rejectedの三条件を照合する。
- F/U receipt環境変数: exact 1件。root escapeと固定receipt basename違反はadmission前に拒否する。
- consumerが正式実行時に所有するlive SHA、runtime、capability、描画環境の検査は弱めず、fixture admissionが保証したと過大主張しない。

結論: fixture admissionの閉包基準を「保存物が正しい」から「consumer正式入口が受理できる入力形である」まで拡張した。今回観測したbasename不一致は製造時とadmission時の双方で正式attempt前に拒否できる。

