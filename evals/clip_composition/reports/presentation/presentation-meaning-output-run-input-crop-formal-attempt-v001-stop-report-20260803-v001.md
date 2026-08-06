# 実行入力記録・crop適用 正式検査 attempt v001 停止報告

- 実行日: 2026-08-03
- 開始時commit: `cf7b2af9c77d71ad78644e7ec8f754804036fcf8`
- 外部API通信: 0回
- 費用: US$0
- 結果: 136 passed / 5 failed / 141 observed
- 停止点: 正式検査。既存回帰、実行入力記録の正式固定、実データ接続には未到達

## 結論

承認済み12ファイルの実装範囲を静的に確認した後、正式検査を頭から1回実行した。1件でも不合格なら同attemptで直さない条件に従い、5件の不合格を観測した時点で停止した。

不合格は二群である。1件は正式実行入力記録の合成fixture準備中の正規化失敗、4件は出力側検査fileの読み込み時に発生したモジュール変換失敗である。後者により4検査fileが本体の個別検査へ入る前に終了したため、予定228件のうち観測できたのは141件だった。

同attemptで修正・部分再実行・期待値変更は行っていない。実行入力記録の正式固定、countTokens、Gemini生成、意味情報パッケージ生成、基礎映像、crop適用、横型・縦型描画、QCには進んでいない。

## 実行前確認

| 項目 | 結果 |
|---|---|
| 承認済み実装範囲 | 12ファイル以内で一致 |
| JavaScript構文検査 | 合格 |
| 対象差分の空白・競合記号検査 | 合格 |
| 固定Node実体 | SHA-256一致 |
| 固定TSX loader実体 | SHA-256一致 |
| TSX package実体 | SHA-256一致 |
| `NODE_OPTIONS` | 未設定 |
| 正式検査と競合する書き込みprocess | 0件 |

正式検査は固定Node・固定TSX loader・直列実行で開始した。

## 実行証拠

| 成果物 | path | SHA-256 | byte |
|---|---|---|---:|
| TAP全文 | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-run-input-crop-v001/formal-228-attempt-v001.tap` | `84cc3009a0e9e42e2aec3b711e9f522c073d1d4bab287cb471bd8791f8e0bfc5` | 38,245 |
| stderr | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-run-input-crop-v001/formal-228-attempt-v001.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |

TAP集計は `tests 141 / pass 136 / fail 5 / cancelled 0 / skipped 0 / todo 0` だった。

## 不合格群A: 正式実行入力記録の合成fixture

### 事実

- 不合格はtest 110「正式publication runnerは参照3件を照合してrecord byteを一回だけ公開する」だった。
- 正式runnerを起動する前のfixture複製処理で `canonical JSON failed` になった。
- fixtureは、人間認定済みcrop v006の決定・選択成果物を複製する際、実行入力記録側の正規化入口でSHAを計算していた。
- crop成果物には契約上正当な有限小数が含まれる一方、この正規化入口は意味・時刻系の整数限定JSON用である。
- productionの実行入力記録runnerが失敗した観測ではない。

### 現時点の帰属

第一帰属は検査fixtureの入口選択誤りである。認定済みcrop成果物のbyteや値を変えず、出力側で既に使われている有限数値対応の正規化を使うべき可能性が高い。

### 未確認

どの既存正本入口をfixtureから呼ぶか、またその変更が承認済み12ファイル内に収まるかは未確定である。今回のattemptでは修正していない。

## 不合格群B: 出力側4検査fileの読み込み失敗

### 事実

次の4検査fileが個別検査を始める前に同じエラーで終了した。

1. `presentation_output_contract_v001.test.mjs`
2. `presentation_output_page_line_planner_v001.test.mjs`
3. `presentation_output_render_plan_v001.test.mjs`
4. `presentation_output_style_resolver_v001.test.mjs`

共通エラーは、基礎映像処理fileの最上位awaitをTSX/esbuildがCommonJS出力として変換できない、というものだった。新しいcrop適用処理は基礎映像の検証処理と縦型crop正本を読み込み、出力側のTypeScript経路からも参照される。この混在した読み込み経路でエラーが再現した。

### 現時点の帰属

新しい工程間接続の読み込み構造が、固定TSX実行環境のモジュール形式と両立していない可能性が高い。検査fileだけの問題とはまだ確定できず、実際の出力runnerにも同じ読み込み経路が到達する可能性があるため、production影響あり得る未確定障害として扱う。

### 未確認

- 正本計算を複製せずに読み込み境界だけを分離できるか。
- 承認済み12ファイル内の修正で閉じるか、基礎映像処理fileの整理を含む13ファイル目が必要か。
- 本番runner起動時にも同じ変換エラーが起きるか。

これらは読み取り診断と版付き修正設計を先に行わなければ確定できない。

## 到達していない検査・工程

- 予定228件の完全実行
- 既存合格gate 287/287
- 既知baseline 64/181不変確認
- 既存3本のtree SHA最終照合
- 実行入力記録の正式固定
- 人間向け実行前下書き
- API通信、課金、生成、描画、QC

したがって、この停止時点を「実装合格」「実データ接続準備完了」とは呼ばない。

## 保存状態

- 不合格TAPと空stderrは版付きpathへ保持した。
- 既存正式成果物、stable tag、crop v006原本は変更していない。
- Gemini / Google API通信と課金は0件。
- commit・tagは作成していない。

## 次の承認依頼案

二群を混ぜず、読み取り診断と版付き修正設計だけを次工程とすることを推奨する。

1. 群Aは、crop成果物の有限小数を保ったままSHAを算出する既存正本入口を特定し、fixture限定修正で閉じるか確認する。
2. 群Bは、固定TSX環境での実際のimport graphと本番runner到達性を確定し、正本計算の複製なしで閉じる案を比較する。
3. 12ファイルを超える案しか成立しない場合は、実装せず範囲改訂としてkawafmmへ戻す。
4. 修正設計承認後のみ、新attemptとして正式検査を頭から1回実行する。

人間作業は、この診断・設計着手を承認するかの1判断だけである。

### 承認文案

正式検査の不合格停止を確認した。群Aのfixture正規化入口と、群BのTSX混在import graphについて、読み取り診断と版付き修正設計の起草を承認する。実装・再検査・実行入力記録の固定・API通信は別承認とする。群Bが承認済み12ファイル内で正本計算の複製なく閉じない場合は、13ファイル目を追加せず範囲改訂案を提示して停止すること。
