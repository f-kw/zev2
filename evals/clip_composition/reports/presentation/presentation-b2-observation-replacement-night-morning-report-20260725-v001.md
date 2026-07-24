# B2観測記録置換 夜間作業 朝報告 v001

- 作成日: 2026-07-25
- 主線状態: **正式132件検査の不合格で停止**
- 自動修正・再実行: なし
- 人間作業: 朝の再開判断1件。媒体確認・手作業なし

## 1. 到達地点と各段の検査結果

### 到達したこと

正式packageの公開時に、

- 固定7ファイルの実体・内容・hashを実行前後で束縛する
- 許可されたroot内で実際に起きたファイル操作を記録する
- 読取故障後も、起きた操作と失敗位置を隠さず残す

処理を実装した。production内部へ新しい観測入口は増やしていない。

主な記録:

- 契約追補と文書同期: commit `39125f62`
- 実装: commit `9ff44d02`
- 正式検査の不合格証拠: commit `feb97613`
- [正式132件検査の停止報告](./presentation-candidate13-caption-gate-b2-observation-replacement-full-test-stop-report-20260725-v001.md)

### 正式に実行した検査

package側132件を、固定版から先頭より**1回だけ**実行した。

| 項目 | 結果 |
|---|---:|
| 全件 | 132 |
| 合格 | 128 |
| 不合格 | 4 |
| 再実行 | 0 |
| 終了コード | 1 |

保存証拠:

- TAP: `test-runs/20260725-caption-b2-observation-record-replacement-v001/package.tap`
- TAP SHA-256: `f21c2e88800dc9580bc288aaa2da01f8a39a3f6a2bc11499489f3169eea02ab7`
- stderr: 0 byte
- stderr SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

128件を部分合格や品質率として扱わない。

### 不合格後に実行していない段

停止条件が成立したため、次は全て0回である。

- Gemini意味回答を受け入れる側の検査
- Gate A回帰
- 切除後に残った発話の回帰
- candidate 13読み取り専用preflight
- 前提Pの再照合
- 正式package生成
- Gemini実走
- 指示書生成
- 描画

`stable/b2-complete-*`タグとB2完了のJOURNAL entryは作っていない。現在の撤退可能点は引き続き`stable/gate-a-complete-20260723`である。

## 2. 停止条件と現在の状態

事前固定した合格条件を4件満たさなかったため、そのattempt内で直さず停止した。

静的な切り分け結果:

1. 内容hashの帰属検査は、一原因だけを作るはずの検査データが、壊したmanifestへ検査報告まで追随させていた。
2. staging後のjob再読取は、禁止した入力再確認ではなく、最終報告前の正当なjob安定性確認だった。
3. 公開済みファイルのopen故障は、粗い判定が先に止まり、既に用意した詳細証拠がTAPへ出ていないため、現証拠だけでは一次原因を確定できない。
4. 決定性負例の未観測は、1の検査が途中で止まった派生である。

production本体・公開失敗の意味・契約を変える根拠はない。

詳細:

- [不合格原因分析](./presentation-candidate13-caption-gate-b2-observation-replacement-failure-analysis-20260725-v001.md)
- commit `fe4db91f`

## 3. 主線停止中に完了した副線

### 副線①: 停止原因分析

- 状態: 完了
- 人間作業: 0件
- 成果: 契約から確定できる検査欠陥2件と、次回TAPへ詳細証拠を出す診断1件を分離
- 文書: [不合格原因分析](./presentation-candidate13-caption-gate-b2-observation-replacement-failure-analysis-20260725-v001.md)
- commit: `fe4db91f`

### 副線②: Gate C接続準備の差分

- 状態: 完了
- 人間作業: 0件
- 成果: 成立済みの配管と、未成立の正式package・意味判断・描画を分離。B3〜B6の停止点を再確認
- 文書: [Gate C接続準備 差分監査](./presentation-candidate13-caption-gate-c-connection-readiness-delta-audit-20260725-v001.md)
- commit: `50f9f3bb`
- 現時点の独立した人間判断: なし

### 副線③: 次素材候補の差分

- 状態: 完了
- 人間作業: 0件
- 成果: 既存3候補と予備4候補を再確認。candidate 13の初描画・QC完了前には選定しない方針を維持
- 文書: [新素材候補 差分更新監査](./presentation-new-material-candidate-preselection-delta-audit-20260725-v002.md)
- commit: `7089e47b`
- 現時点の独立した人間判断: なし

## 4. 朝に必要な人間判断

必要なのは次の**1判断だけ**である。

> 内容hashの一原因検査データと、最終job安定性再読取の期待を、契約どおり検査側だけ修正する。公開open故障の検査は、既存の詳細集約比較を粗い判定より前へ移す診断変更だけを加える。その固定版でpackage 132件を先頭から1回実行し、不合格なら再修正せず停止する案を承認するか。production本体・契約・期待する`PUBLICATION_FAILED`は変更しない。

推奨: **承認**。

理由:

- 2件は契約から一意に直せる検査側の欠陥である。
- 残る1件は、productionを変えず、既存の証拠をTAPへ先に出すだけで原因を判定できる。
- 未確定原因に合わせて契約や期待を緩めない。

承認後の作業量:

- 人間: 追加作業0件
- エージェント: 検査ファイル1件の限定修正、静的・独立監査、正式132件の1回実行
- 1件でも不合格なら同attemptで直さず停止

Gate Cと次素材について、朝に追加判断は要らない。
