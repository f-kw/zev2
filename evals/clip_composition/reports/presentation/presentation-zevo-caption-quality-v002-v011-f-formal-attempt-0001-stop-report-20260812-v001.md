# ZEVO字幕品質v002 v011 F局所正式attempt-0001 停止報告 v001

- 日付: 2026-08-12
- 結論: F局所正式attemptは共通fixture製造hookで停止した。productionのF処理・renderer・QCには未到達。
- 通信: 0回
- 費用: US$0
- 正式描画: 0回

## 1. 事実

### 1.1 v011適用前監査

- 追補v011 SHA-256: `61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010`
- approved contract binding: source/B5/B6/selection/proof=10/10/11/12/12へ配線済み
- proof: 489/489一意、重点owner件数とZCQ044=35は不変
- 固定TSXの物理`.mjs` import: wrapper descriptorがv011のexact表へ一致
- 起動前checklist: 固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、Darwin arm64 native、Chromium起動、`/opt/homebrew` FFmpeg/FFprobe実体・SHAの全項目合格
- Fの正式test/output rootは開始前に未使用だった

### 1.2 正式attempt結果

- 対象: F局所3検査
- 実測: 0 pass / 3 fail
- 3件とも同じ`before` hook failureであり、個別検査本文は0件実行
- 失敗値: `Cannot read properties of undefined (reading 'path')`
- 失敗位置: F testのfixture製造処理が、保存済み旧横型output requestから意味情報packageのpathを読む箇所
- TAP SHA-256: `4ceb6420f9fe375fb7bfb3995c16971d8d1e109368168954aebc10a0fd6cfdaa`
- stderr: 0 byte、SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

### 1.3 内側原因

保存済み3件の旧横型output requestは、全てexact key `requestId,meaningInformationPackage,baseMediaInput`を持つ。意味情報packageのpathは`meaningInformationPackage.path`に存在する。

F testの共通hookは、その保存物に存在しない`meaningPackageBinding.path`を読んだため、値がundefinedとなり開始前に例外終了した。3素材行すべて同じ実在shapeであり、同じ原因である。

### 1.4 未生成・不変

- F test内部のattempt root: 未作成
- F proof output root/staging root: 未作成
- U局所attempt: 未実施
- 正式46件、直接影響回帰、green 287、baseline 86/203、tree照合: 未実施
- API通信、countTokens、generateContent、正式描画、stable tag: 0件

## 2. 三分法

| 分類 | 判定 | 根拠 |
|---|---|---|
| production欠陥 | 該当しない | production入口へ到達する前のtest `before` hookで停止した |
| fixture・検査設営欠陥 | 該当 | 保存済み旧output requestの実在keyと、fixture供給処理が読むkeyが不一致 |
| 契約解釈 | 不要 | 旧保存物のschemaと新F工程の入力schemaを変更する必要はなく、fixtureがどの保存fieldから値を供給するかの設営問題 |

## 3. 推測

なし。原因は保存済み3実体のkey集合、TAP stack、test sourceの読取式の三者で確定した。

## 4. 未確認

fixture製造hookを正した後のF 3検査の合否、ZCQ044 35枝、U局所、正式46件以降は未確認である。今回の0/3をproduction品質の不合格とは扱わない。

## 5. 規律適用

- 正式attempt開始後の修正: 0件
- TAP全文とstderrを版付き保存した
- 不合格1件停止を適用し、U・後続回帰へ進まなかった
- 本件はF工程の検査設営起因の再停止条件に該当するため、個別patchを実施せずF工程計画をkawafmmへ戻す

## 6. 差し戻し計画案

推奨は、F fixture製造だけを独立して再閉包してから新attemptを発行する案である。

1. F `before` hookが読む保存済み成果物を全件一件表にし、実在schema、供給field、consumer引数を現物byteから逆引きする。
2. 旧output requestの`meaningInformationPackage`と、新F工程内で製造するoutput requestの`meaningPackageBinding`を別schemaとして明示し、名前の類似による混用を検査で拒否する。
3. 3 caseすべてについてfixture製造だけを読み取りpreflightし、意味package path・SHA・caption全量が取得できることを版付きrecordへ保存する。
4. production・契約・proof489件・v011 descriptor検査を変えず、新しいF正式attempt rootで3検査を頭から実行する。

この計画の承認前にtestを修正しない。
