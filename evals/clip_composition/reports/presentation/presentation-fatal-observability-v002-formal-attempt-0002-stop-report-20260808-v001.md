# fatal観測性v002 正式81件 attempt-0002 停止報告 v001

- 日付: 2026-08-08
- 状態: **STOP（75/81、6件不合格）**
- 開始commit: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 前attempt停止報告SHA-256: `38722bf454d3cb26af3c429f843be96a71ed032eb99295cf26da23b03891fea5`
- 正式attempt: `evals/clip_composition/reports/presentation/test-runs/20260807-fatal-observability-v002/attempt-0002/`
- 周回: **1/2**
- 外部通信: 0回
- 費用: US$0

## 1. 結論

承認された4原因群を検査・fixture側だけで修正し、正式81件を新attemptで頭から一度実行した。結果は75件合格・6件不合格だった。

規律どおり、同じattemptで修正・再実行を行わず、直接影響130件以降を起動せず停止した。

6件は全て一つの新たなfixture原因へ収斂した。旧B1の束縛はkey順`role / path / fileSha256`を要求する一方、timeline・意味終端・意味情報package・outputの束縛は`path / fileSha256 / role`を要求する。旧B1の2件を直すため共有fixture定数を前者へ一括変更した結果、後者4境界の正式validatorへ渡すfixtureまで前者の順になった。

これは検査fixtureのshape使い分け不足であり、production欠陥または契約矛盾ではない。ただし正式81件は不合格なので、今回の4群修正を完了とは認定しない。

## 2. 実施した4群修正と証明の維持

| 群 | 修正 | 期待緩和ではない根拠 | attempt-0002 |
| --- | --- | --- | --- |
| 1. 旧B1 binding key順 | fatal観測bindingを旧B1が要求する`role / path / fileSha256`へ直した | job不正で早期拒否させず、正常経路と読取fatalの実枝へ到達させる修正。FOVB005・FOVB006の全assertを維持 | **2/2合格** |
| 2. prototype過剰比較 | 正式stdout byte完全一致後の、prototypeまで比較する冗長assert 2件だけを除いた | schema、status、違反内容、終了code、正式byte完全一致のassertを維持。byteが全内容を既に証明する箇所だけを対象にした | 対象のFOVB009・FOVF006は別原因でvalidator前停止し、最終証明未到達 |
| 3. 未検証jobの対象file | FOVO002・FOVO006の期待を`targetFile: null`へ直した | stage・inner code・終了codeのexact検査を維持し、未検証jobから対象fileを記録しない安全側保証を明示する反転 | **2/2合格** |
| 4. 公開前不正と公開失敗 | FOVO013の第2枝を`REPORT_TARGET_INVALID`の完全観測へ直した | 第1枝の`REPORT_PUBLICATION_FAILED`実発火証明を維持し、第2枝で固定sentinelによる公開前拒否をexact観測する | **1/1合格** |

production、契約、固定許可field表、status、既存違反code、終了code、正式成果物は変更していない。

## 3. 変更した検査file

| path | SHA-256 | 意味 |
| --- | --- | --- |
| `evals/clip_composition/presentation_fatal_observation_v002.test.mjs` | `d9dca43db6cd8decb11aae97923a3ca2f3d645336500116ac8ce057edf533279` | 未検証jobのnull保証と、公開前不正／公開失敗のowner分離を現行productionへ合わせた |
| `evals/clip_composition/presentation_fatal_observability_v002.integration.test.mjs` | `b01314bd9380139a560b0bca9d7d708efad300b1688825b6e65adf2690c20377` | 旧B1 binding順の修正と、byte一致後のprototype過剰比較除去 |

承認済み18 path内の検査2 fileだけを変更した。production fileの追加変更は0件、19 path目は0件である。

## 4. 正式attempt実行記録

### 4.1 固定実行環境

- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- Node SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- TSX loader: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- TSX loader SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`
- `NODE_OPTIONS`: 不存在
- test concurrency: 1
- `npm exec` / `npx`: 使用0回
- 同一監視領域への並行書込み: 0件

### 4.2 保存物

| 保存物 | byte | SHA-256 |
| --- | ---: | --- |
| `formal-81.tap` | 20,520 | `ed988a00126e87b863e2eba3f3840246fecbbaeca41c06ba97fd4612eab2209a` |
| `formal-81.stderr` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

### 4.3 集計

| 項目 | 件数 |
| --- | ---: |
| tests | 81 |
| pass | 75 |
| fail | 6 |
| cancelled | 0 |
| skipped | 0 |
| todo | 0 |

終了codeは1だった。TAP全文と空stderrを版付きattempt rootへ保存した。

## 5. 6不合格のID別帰属

| ID | 停止位置 | 観測 | 帰属 |
| --- | --- | --- | --- |
| FOVB003 | timeline job validator | F01束縛追加後のjobを不受理 | fixture shape |
| FOVB008 | 意味終端 job validator | F01束縛追加後のjobを不受理 | fixture shape |
| FOVB009 | 意味終端 job validator | F01束縛追加後のjobを不受理し、prototype比較の置換確認まで未到達 | fixture shape |
| FOVB011 | 意味情報package job validator | F01束縛追加後のjobを不受理 | fixture shape |
| FOVB015 | output job validator | F01束縛追加後のjobを不受理 | fixture shape |
| FOVF006 | 意味終端 rejected実経路のjob validator | F01束縛追加後のjobを不受理し、status・終了code確認まで未到達 | fixture shape |

6件はいずれも、共有helperが同じbinding objectを異なる契約shapeへ流用したことが根本原因である。

### 5.1 現物で確認した二つのshape

- 旧B1の`implementationBinding.files`／`dependencyFiles`: `role / path / fileSha256`
- timeline・意味終端・意味情報package・outputの`implementationBindings`: `path / fileSha256 / role`

どちらも既存のexact schemaであり、どちらかへ契約を統一する指示ではない。fixtureが接続先ごとの既存shapeを使い分ける必要がある。

### 5.2 productionと契約の状態

- 6件は全てproduction処理へ入る前のfixture validator不合格である。
- productionのstatus、違反code、終了code、正式byteを否定する観測はない。
- 契約同士の矛盾ではなく、用途の異なる二つの既存schemaを検査helperが一種類として扱った欠陥である。

## 6. 実現性調査で事前検出できたか

**検出できた。**

attempt-0001の原因群1を「binding key順誤り」と確定した時点で、共有fixture定数の全callsiteを接続先validator別に列挙し、各schemaのexact key順を照合すべきだった。旧B1の正しい順だけを確認し、同じhelperが他4境界にも使われていることを値レベル閉包へ反映しなかった。

正式81件が、旧B1の2件を直した一方で他境界6件を新規転落として検出した。これは正式検査が正しく働いた結果である。

## 7. 未実行の後続

| 工程 | 状態 |
| --- | --- |
| 正式81件 attempt-0002 | **75/81で停止** |
| 直接影響130件 | 0回 |
| green 287件 | 0回 |
| baseline 181件 | 0回 |
| 既存5 tree最終照合 | 0回 |
| commit A | 未作成 |
| 18 path SHA表 | 未確定 |

正式成果物・既存5 tree・stable tagは変更していない。API通信は0回、費用はUS$0である。

## 8. 最終周回2/2の最小修正案（未実装）

共有fixtureのbinding製造を、接続先の既存schemaに合わせた二つの明示経路へ分ける。

1. 旧B1の`files`／`dependencyFiles`へ追加する場合だけ、`role / path / fileSha256`で製造する。
2. timeline・意味終端・意味情報package・outputの`implementationBindings`へ追加する場合は、従来どおり`path / fileSha256 / role`で製造する。
3. role、path、SHAの値、SHA再計算、末尾追加、既存role除外の意味は共通のまま維持する。
4. 二つの契約shapeをunion受理するproduction変更、key順を無視するvalidator変更、fallback、後方互換処理は作らない。
5. 共有helperの全callsiteをshape別に一件表へ固定し、誤ったshapeを渡す負例を各1件の既存検査内で確認する。
6. 修正後は未使用attempt rootで正式81件を頭から一度だけ実行する。81/81の場合だけ後続へ進む。

これは承認済み18 path内のF03検査1 fileだけで閉じる見込みで、production・契約・正式成果物の変更は不要である。ただし未承認・未実装・未検査である。

## 9. 再開に必要な判断

承認依頼文案:

> fatal観測性v002正式81件attempt-0002停止報告v001を受理し、§8の最終周回2/2限定修正を承認する。旧B1用の`role / path / fileSha256`と、他4境界用の`path / fileSha256 / role`を検査fixtureの明示的な別製造経路へ分け、接続先の既存exact schemaをそのまま使う。production、契約、validator、status、既存違反code、終了code、正式成果物は変更しない。共有helper全callsiteのshape一件表を正式attempt前に完成させ、修正後は正式81件の新attemptを頭から一度だけ実行する。81/81の場合だけ直接影響130、green 287、baseline exact、既存5 tree、commit A・18 path SHA表へ進む。不合格1件または新たな現物差では停止し、3周目を行わず範囲改訂案を提示する。

## 10. 停止時点

- 4原因群修正: 実装済み、正式完了は未認定
- 正式81件: 1回、75/81 FAIL
- 同attempt修正: 0件
- 同attempt再実行: 0回
- 周回: 1/2消費
- 後続工程: 0回
- commit: 未作成
- 正式成果物変更: 0件
- API通信: 0回
- 費用: US$0

不合格記録、TAP、stderr、今回の検査差分を保持して停止する。
