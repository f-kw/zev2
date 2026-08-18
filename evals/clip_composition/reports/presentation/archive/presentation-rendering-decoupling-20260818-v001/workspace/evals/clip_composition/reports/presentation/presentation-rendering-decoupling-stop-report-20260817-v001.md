# ④.5 レンダリング疎結合化 停止報告 v001

- 工事ID: `PRESENTATION-RENDERING-DECOUPLING-V001`
- 日付: 2026-08-17
- 状態: **契約解釈が必要なため停止**
- 停止回数: 1/8
- 追補件数: 0/5
- API通信: 0回
- 費用: US$0

## 1. 現在地

着手前照合は全て合格した。

- `docs/CURRENT_GOAL.md`の4項とwork-order指示に齟齬0件。
- 起点HEADは`b5f8fabeefd3358184f45f1c1d036ec70df534a2`。
- 契約設計正本のSHA-256は承認値`aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94`と一致。
- Phase 0のcaption voice-013、title v009、既存treeのoracle pathを現物から特定済み。
- 正本17 pathのうち、新規production 4件（cue終端projection、注文書、行分割、admission/receipt）の初版を作成し、Node構文検査へ合格した。
- test、既存runner接続、正式attempt、動画描画は未着手。

## 2. 停止原因

renderer jobのexact schemaと、実描画に必要な外部実行体の受け渡し規則が同時に成立しない。

契約設計§6.1のrenderer job exact schemaには、Node、TSX、FFmpeg、FFprobe、ImageMagick等の実行体path・SHAを入れるfieldがない。一方、同節末尾は次を同時に要求している。

1. `rendererImplementationBindings`へ実行toolを含む全live dependencyを列挙する。
2. job/env/defaultから暗黙選択しない。
3. 全値をformal job byteに置く。

しかし`rendererImplementationBindings`の各pathはworkspace相対pathを要求する。現行caption/title正式runnerが実際に描画へ渡している実行体は、`/opt/homebrew/bin/ffmpeg`等のworkspace外の絶対pathである。このため、承認済みexact schemaのままでは外部実行体のpathとSHAをrenderer job/receiptへ完全に束縛できない。

## 3. 現物証拠

- title runnerは`runtimeProfile`の`node / tsx / remotion / browser / ffmpeg / ffprobe / imageMagick`を照合し、FFmpeg等を描画coreへ渡している。
- caption proof runnerも同じ7 roleの`runtimeProfile`を正式jobに持ち、描画coreへ渡している。
- 新契約のjob root keyには`runtimeProfile`または同等の外部tool bindingがない。
- 新契約のimplementation binding pathはworkspace相対に限定される。
- renderer trust台帳はtool version文字列を持つが、実行体path・file SHAを持たないため、正式実体の選択とlive bindingを代替できない。

## 4. 三分法

- 実装欠陥: **未確定**。承認済みschemaから一意な実装を導けない。
- job・検査設営: **該当しない**。jobを作る前の契約閉包で検出した。
- 契約解釈: **必要**。外部実行体bindingをどのformal artifactが所有するかの決定が不足している。

## 5. 選択肢

### 案A（推奨）: renderer jobへruntime bindingを明示追加

renderer job exact schemaへ、現行と同じ7 roleのpath/SHAを持つ`runtimeProfile`を追加し、receiptへ全件転記する。実行体をrenderer jobが所有し、独立runnerだけでstable再読できるため、疎結合化の目的と一致する。正本path数は増えないが、契約追補とPRAの期待更新が必要。

### 案B: 親runnerのruntime capabilityを引数で借りる

schema変更は少ないが、renderer job/receiptだけでは実行体を再現できず、親runnerへ隠れた依存が残る。「全値はformal job byte」「独立して検査・交換できる境界」と両立しないため非推奨。

### 案C: workspace内wrapperまたは固定pathをrunnerへ埋め込む

新pathまたは暗黙defaultが必要で、17 path上限または§6.1の禁止条件へ抵触するため不採用。

## 6. 現在の作業ツリー

既存tracked fileの変更0件。未commitの新規fileは次の7件。

1. 承認済み契約設計正本
2. 着手前preflight実験記録
3. cue終端projection production初版
4. 注文書 production初版
5. 行分割 production初版
6. admission/receipt production初版
7. 本停止報告

作成済みproduction 4件は承認済み17 path内であり、削除・追記せず現状保持する。契約追補、test、runner、既存6 path、正式成果物は変更していない。

## 7. 再開に必要な一問

外部実行体の所有を、案Aのとおりrenderer jobの版付き`runtimeProfile`とreceipt転記へ追加してよいか。承認される場合、schema・PRA期待・PRMの実行体live bindingを同じ追補でexactに閉じる必要がある。

## 8. 外部作用

- API通信: 0回
- 費用: US$0
- 動画描画: 0本
- commit: 0件
- tag: 0件
- 公開: 0件
- DECISIONS書込み: 0件
