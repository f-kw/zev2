# fatal観測性v002 最終周回・直接影響検査停止報告 v001

- 日付: 2026-08-08
- 対象: fatal観測性v002 実装ゲート
- 判定: **停止**
- 通信: 0回
- 費用: US$0
- commit A: 未作成

## 1. 到達点

最終周回2/2で、検査fixtureのbinding製造を境界ごとの正式key順へ分離した。

- 旧B1: `role → path → SHA`
- timeline、意味境界、意味情報package、出力: `path → SHA → role`

各境界が使う製造経路を固定表にし、反対方言を混ぜた入力は各境界の既存validatorが拒否する検査へ接続した。production、契約、正式成果物のkey順は変更していない。

この修正後の正式81件は **81/81合格**した。続く直接影響130件は **115/130** で不合格となったため、規律どおりその場で停止した。同attempt内の修正、green 287件、baseline照合、既存5 tree照合、commit Aは実施していない。

## 2. 保存済み実測

| 段 | 結果 | TAP | SHA-256 |
|---|---:|---|---|
| 正式81件 | 81/81 | `reports/presentation/test-runs/20260807-fatal-observability-v002/attempt-0003/formal-81.tap` | `7033607988acb6404367a4aec7c0f910e231119fb74d3d8cdfb612d6e0ff55e7` |
| 直接影響130件 | 115/130 | `reports/presentation/test-runs/20260807-fatal-observability-v002/attempt-0003/direct-impact-130.tap` | `e4b38aeb75d35269974ad8e34a3ec7ae804d46cdaa0a2993a65ff4c31b728688` |
| 正式81件 stderr | 0 byte | `attempt-0003/formal-81.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 直接影響 stderr | 0 byte | `attempt-0003/direct-impact-130.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

実行環境は固定Node、固定TSX、`NODE_OPTIONS`不存在、test concurrency 1。`npm exec`、`npx`、外部通信は使用していない。

## 3. 事実

### 3.1 正式81件

正式81件では、13 stage、14 inner code、5境界、対象fileの安全側選択を含む全IDが合格した。今回の二方言分離は、formal fixture内で意図どおり機能した。

### 3.2 直接影響130件の15不合格

| ID | 観測 | 原因群 | 解消に必要な範囲 |
|---|---|---|---|
| MSL001 | 正常CLIの期待0に対し終了2 | A1 | 意味境界CLI fixtureの現行実装束縛へfatal観測実装を追加 |
| MSL021 | 検証不能jobなのに対象file非nullを期待 | A2 | 安全側の正しい期待`null`へ置換 |
| OEE001 | 意味情報package構築がrejected | B1 | 合成の意味境界検査報告を現行4実装束縛へ更新 |
| OEE002 | 同上 | B1 | 同上 |
| OEE004 | 同上 | B1 | 同上 |
| OEE005 | 同上 | B1 | 同上 |
| OEE006 | 同上 | B1 | 同上 |
| OEE007 | 同上 | B1 | 同上 |
| OEE008 | 同上 | B1 | 同上 |
| OPF012 | 同じ一気通貫fixtureがpackage構築前にrejected | B1 | 同上 |
| OPF002 | 承認済み描画core変更後の現SHAを旧SHAと比較 | C1 | 開始時来歴と承認済み現在実体を二層で照合 |
| OPF016 | 承認済み表示計画実装1件を変更許可集合に未登録 | C2 | 承認済み変更pathを差分集合へ追加 |
| W01 | 正常回答が終了2 | D1 | 生成時packageの4依存と現在B1 jobの5依存を別fixture列へ分離 |
| W07 | 同上 | D1 | 同上 |
| W08 | 同上 | D1 | 同上 |

## 4. 原因確定

### 群A: 意味境界検査fixtureの現行化漏れ（2件）

`MSL001`の実process用jobだけが、現行validatorの4実装束縛に対して旧3件のままだった。通常のインメモリfixtureは既に4件であり、CLI専用fixtureの局所的な更新漏れである。

`MSL021`は、内容が`{"fixture":true}`だけの未検証jobへ対象fileを付ける旧期待を残していた。現行productionは、検証済みjobへexact一件一致できないため`null`を返している。これは今回塞いだ自己認定経路の安全側動作であり、productionが正しい。

### 群B: 一気通貫fixtureの意味境界検査報告が旧3束縛（8件）

一気通貫fixtureが製造する意味境界検査報告は、現行schemaが要求する4実装束縛のうちfatal観測実装を欠いている。このため意味情報packageの入力検証で全8件が同じ地点から`rejected`になった。出力処理へ到達する前のfixture製造欠陥であり、8件は同根である。

### 群C: 承認済み変更を回帰の来歴表へ反映していない（2件）

`OPF002`は、fatal観測性工事で承認済み変更対象となった共通描画coreを、開始時SHAのまま「現在も不変」として照合している。開始時byteの証明は維持しつつ、現在実体は承認済み変更後のSHAへ別層で束縛する必要がある。

`OPF016`は、承認済み18 pathに含まれる表示計画実装が実際に変わった一方、過去工程の許可集合が15 pathのままである。実測差は当該1 pathだけだった。

### 群D: 生成来歴とlive束縛に同じfixture列を流用（3件）

旧B1の合成fixtureは、source package manifestの生成時依存列と、現在のB1検査jobのlive依存列を同じ配列から作っている。fatal観測実装をlive側へ追加した結果、生成時packageまで5依存となり、package契約が固定する4依存に反してcompiler再構築がfatalになった。

これはproduction欠陥でも契約矛盾でもない。生成時来歴4件とlive束縛5件を別列にすれば、両契約を一切緩めずに解消できる。

## 5. 帰属の三分法

| 原因群 | production欠陥 | 検査・fixture欠陥 | 契約矛盾 |
|---|---:|---:|---:|
| A1 CLI用実装束縛の更新漏れ | 0 | 1 | 0 |
| A2 未検証jobの対象file旧期待 | 0 | 1 | 0 |
| B1 一気通貫fixtureの旧3束縛 | 0 | 8 | 0 |
| C1/C2 来歴・許可表の更新漏れ | 0 | 2 | 0 |
| D1 生成来歴/live束縛のfixture共用 | 0 | 3 | 0 |
| **計** | **0** | **15** | **0** |

## 6. 推測と未確認

### 推測

- なし。上記4群は、TAPの停止行と現行validator／fixture製造コードの値レベル照合で原因を確定した。

### 未確認

- 修正後に15件が全て合格することは未確認である。最終周回の停止条件に従い、修正・再実行を行っていない。
- green 287件、baseline 64/181 exact、既存5 treeは未実行である。
- fatal観測性v002実装ゲートは未完了であり、commit Aは存在しない。

## 7. 最終周回の扱い

attempt-0003で正式81件は完了したが、完了条件である直接影響130/130へ届かなかった。これは最終周回2/2であるため、同じ計画内の3周目は行わない。

今回の不合格は二方言分離そのものの失敗ではなく、その先で初めて全実行された統合fixtureと来歴表の現行化漏れである。それでも完了条件未達は変わらないため、個別patchではなく次の範囲改訂として人間判断へ戻す。

## 8. 範囲改訂案 v001

### 8.1 変更対象

検査file 3件だけを対象とする。production、契約、schema、status、違反code、終了code、正式成果物は変更しない。

1. `evals/clip_composition/presentation_meaning_boundary_selection_v001.test.mjs`
   - 実process用意味境界jobを現行4実装束縛へ合わせる。
   - 未検証jobの対象file期待を`null`へ置換する。
2. `evals/clip_composition/presentation_output_render_plan_v001.test.mjs`
   - 一気通貫の意味境界検査報告を現行4実装束縛へ合わせる。
   - 開始時SHAと承認済み現在SHAを結果／来歴の二層で照合する。
   - 承認済み表示計画実装を変更許可集合へ追加し、集合のexact一致は維持する。
3. `evals/clip_composition/test_presentation_caption_semantic_output_v002.mjs`
   - source package生成時の4依存と、B1 live jobの5依存を別fixture列へ分離する。
   - 両列の混用を正負検査で拒否する。

3件はいずれも既に承認済み18 path内であり、19 path目は不要である。ただし最終周回を使い切ったため、従来計画の続行ではなく、この3検査file限定の統合再束縛計画として新たに承認を得る。

### 8.2 新計画の検査順

1. 上記3 fileだけを限定修正する。
2. 15不合格の対応表と混用拒否検査を静的に閉じる。
3. 直接影響130件を新attemptとして頭から1回実行し、TAP全IDを版付き保存する。
4. 130/130の場合だけ、既に保存済みの正式81/81を変更非影響としてSHA照合する。
5. green 287/287、baseline 64/181 exact不変、既存5 tree最終照合へ進む。
6. 全合格時だけcommit Aを作り、18 path SHA表付き完了報告を作る。

不合格1件、新たな現物差、4 file目、production／契約変更の必要が出た場合は同attemptで直さず停止する。

## 9. 承認依頼文案

相談役レビュー済み。kawafmm裁定: **最終周回停止を受理し、§8の3検査file限定・統合再束縛計画を承認する**。production・契約・schema・既存status・違反code・終了code・正式成果物は不変とする。意味境界CLI fixtureの現行4束縛化、未検証jobの対象file期待`null`化、一気通貫fixtureの意味境界検査報告4束縛化、承認済み変更の二層来歴照合、旧B1 fixtureの生成時4依存／live 5依存分離だけを行う。修正後は直接影響130件を新attemptとして頭から1回実行しTAP全IDを保存する。130/130の場合だけ保存済み正式81/81のSHA照合、green 287/287、baseline exact、既存5 tree、commit A、18 path SHA表付き完了報告へ進む。不合格1件・新たな現物差・4 file目・productionまたは契約変更が必要なら同attemptで直さず停止する。通信0・費用US$0。

目標接続判定: fatal観測性の構造改善を、検査fixtureと承認済み来歴の統合再束縛まで含めて閉じる。
