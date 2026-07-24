# candidate 13 caption Gate B2 観測記録置換 不合格原因分析 v001

- 作成日: 2026-07-25
- 区分: 主線停止後の副線①・静的分析
- 対象attempt: `20260725-caption-b2-observation-record-replacement-v001`
- 対象実装commit: `9ff44d02d3e7d263c3e37700bf7de0943060c0cc`
- 対象TAP: `test-runs/20260725-caption-b2-observation-record-replacement-v001/package.tap`
- 状態: **原因2件を契約から確定、1件は次回TAPへ証拠を残す必要あり**
- 人間作業: 再開方針の判断1件。媒体確認・手作業なし

## 1. 結論

132件中4件の不合格は、次のように分かれる。

| test | 分類 | 結論 |
|---:|---|---|
| 118 | 契約から一意に導出可能 | 一原因を作るfixtureが、壊したmanifestへ検査報告まで追随させ、三つのhash不一致を作っている |
| 123 | 契約から一意に導出可能 | staging後のjob再読取は、禁止したinput再確認ではなく、最終reportを作るための正当なjob安定性確認 |
| 124 | 現TAPだけでは一意化不能 | production契約は`PUBLICATION_FAILED`を要求するが、粗いboolean検査が先に止まり、既に用意した詳細証拠がTAPへ出ていない |
| 132 | 派生 | test 118の途中停止により、後ろにある決定性負例まで到達しなかった |

したがって、production本体、違反の意味、公開契約を変える根拠はない。

推奨する再開は、**test側の既知2欠陥を契約どおり直し、test 124は既存の詳細比較を粗い判定より前へ移して、132件を先頭から1回だけ実行する**ことである。

## 2. test 118: 一原因fixtureが三原因を作っている

### 2.1 実測

期待は次の1件だった。

- manifest内部の`contentArtifacts[0].fileSha256`

実際には次の3件が出た。

1. manifest内部の`contentArtifacts[0].fileSha256`
2. 検査報告が参照するmanifestの`canonicalSha256`
3. 検査報告が参照するmanifestの`fileSha256`

### 2.2 静的原因

fixtureはmanifest内部のcontent hashを壊した後、その壊れたmanifestを自己整合するように再hashしている。ここまでは「内側hashだけが誤り」という一原因を作るために必要である。

しかし続けて、package validation reportの`manifestBinding`も、壊れたmanifestの新しいfile hash・canonical hashへ更新している。

検査器は、改変されていないcontent成果物0〜4から正しいmanifestを再構築する。そのため、壊れたmanifest内部の1件に加え、壊れたmanifestへ追随した検査報告の参照2件も正しく不一致になる。

### 2.3 契約から導ける修正

test fixtureだけを次の形にする。

1. manifest内部の対象hashを壊す。
2. manifest自身のbyte・file hash・canonical hashは再計算する。
3. validation reportの`manifestBinding`は、改変前の正しいmanifestへの束縛を維持する。

これにより、原因はmanifest内部の対象hash1件だけになる。

期待を3件へ緩める案は採らない。目的は「内側hashだけが誤った場合の帰属」を独立に検査することだからである。

## 3. test 123: job再読取はinput再確認ではない

### 3.1 実測

stagingを観測した後、作業用出力先以外への`openReadOnly`を0件と期待したが、job JSONの再読取が1件あった。

### 3.2 runnerの実行順

staging gateが不合格の場合、正式公開処理は次の順で動く。

1. lockを安全に解放する。
2. 正式公開処理から戻る。
3. 非job入力を再読取するinput recheck、pre-rename、renameへは進まない。
4. それでもtrusted reportを作るため、外側の終了処理がjob JSONを一度再読取する。
5. 初回jobと最終jobを比べ、実行中にjobが変わっていないことを検査する。

TAPが捉えたjob再読取は4の処理である。これは`jobPreReport`／`jobStability`の証拠であり、禁止したinput recheckではない。

### 3.3 契約から導ける修正

test側の期待を次の完全一致へ置き換える。

- staging root直下の固定7成果物は、既定順で全て読む。
- staging観測後にwork root外で許す`openReadOnly`は、正確なjob pathへの最終再読取1回だけ。
- 非job入力のinput recheckを示す読取は0件。
- `inputRecheckMutation`、`preRenameRootReveal`、`rename`は0件。

work root外の読取を全て禁止する案は、job安定性確認まで誤って禁止するため採らない。

## 4. test 124: 詳細証拠より前に粗い判定が止まった

### 4.1 契約と静的経路

published側の先頭成果物でopen故障が起きた場合、承認済み経路は次を要求する。

1. 対象成果物を`io-error`として記録する。
2. 失敗位置を`artifact-01-open`として保持する。
3. 公開工程の`PUBLICATION_FAILED`へ帰属する。
4. 同じpath・failure pointを公開失敗要約へ残す。

runnerとcheckerの静的コードは、この経路を持っている。期待を`PUBLISHED_PACKAGE_INVALID`等へ変更する根拠は見つからない。

### 4.2 現TAPで分からないこと

現testは、次の粗い判定で先に停止した。

- reportの違反列に`PUBLICATION_FAILED`が一つでもあるか

その後にある詳細集約は実行されなかった。

- fault trace
- 対象rootで実際に起きたファイル操作列
- 違反列全体
- 公開失敗要約全体

したがって、次のどこで食い違ったかは現TAPだけでは決められない。

- 故障が意図したopenへ入っていない。
- 別の失敗位置へ分類された。
- 先行違反により、期待した違反が最終reportへ出なかった。

### 4.3 推奨する診断変更

新しいdebug入口やproduction観測面は作らない。test 124に既にある次の処理順だけを入れ替える。

1. 事前固定した期待集約を作る。
2. 実際のfault trace、操作列、違反列、公開失敗要約を集約する。
3. 両者を完全一致で比較する。
4. 粗い個別boolean検査は、必要なら完全一致の後に置く。

これにより、次の1回の正式TAPには最初の差分がそのまま残る。期待値変更、例外追加、検査弱化、production変更は不要である。

## 5. test 132

`NONDETERMINISTIC / determinism`を発生させる負例は、test 118内の停止位置より後ろにある。

test 118が途中で止まったため、動的なcode×check集合へ登録されなかった。手動で集合へ追加したり、必須集合を減らしたりしない。

test 118を最後まで自然に実行させ、その実観測でtest 132を満たす。

## 6. 再開案

変更対象は引き続き次のtestファイル1件だけで足りる見込みである。

- `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs`

production本体を変更しない。

再開時の順序:

1. test 118の一原因fixtureを修正する。
2. test 123の許可読取列を、固定7成果物＋最終job再読取1件へ固定する。
3. test 124の既存詳細集約を、粗い判定より前へ移す。
4. 静的監査と独立監査を行う。
5. package 132件を先頭から1回だけ実行する。
6. 1件でも不合格なら、同じattemptで直さず、TAPへ残った詳細差分をもって停止する。
7. 132/132の場合だけ、既定の意味回答側、回帰、candidate 13 preflight、前提P再照合へ進む。

## 7. 朝の人間判断1件

推奨する質問:

> test 118のfixture束縛、test 123の最終job再読取許容を、契約どおりtest側だけ修正する。test 124は既存の詳細集約比較を先頭へ移す診断変更だけを加える。その固定版でpackage 132件を先頭から1回実行し、不合格なら再修正せず停止する案を承認するか。production本体・契約・期待する`PUBLICATION_FAILED`は変更しない。

推奨: **承認**。

理由: 2件は契約から一意に直せるtest欠陥であり、残る1件は既存証拠をTAPへ先に出すだけで次の判断材料が揃う。未確定原因へproduction変更や期待緩和を行わない。

## 8. この副線で行っていないこと

- コード、契約、正式成果物、共有文書の変更。
- package、意味回答側、回帰、preflightの再実行。
- formal package、prompt、Gemini、指示書、描画。
- 人間確認依頼の個別発行。

本副線は、朝の判断を1件へまとめるための静的分析だけである。
