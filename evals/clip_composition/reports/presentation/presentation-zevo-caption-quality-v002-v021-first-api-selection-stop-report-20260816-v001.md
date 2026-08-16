# ZEVO字幕品質v002 v021 初回API実走 停止報告 v001

日付: 2026-08-16  
停止位置: B6正常完了後の正式selection受入  
目標接続判定: 意味小単位の生成は成立、物理配置受入は未成立

## 1. 結論

v021で追加した意味小単位・行末・棄権条件を使い、Gemini 3.6 Flashは3字幕すべてについて`complete`回答を返した。B5計測、B6 transport、provider envelope、usage、費用は全て合格した。

続くローカルstrict受入は、応答schema、字幕集合、境界所属、順序、atom全量閉包、論理幅、決定的再構築まで合格したが、第3字幕の第2 cueに一致する物理page graphの辺がなく、`CUE_PHYSICAL_LAYOUT_INVALID`で拒否した。承認済み停止条件に従い、selection成果物、page/line plan、render plan、横型3本、QC、確認ページは製造していない。同attempt修正・追加API送信は0件である。

## 2. B5/B6実測

| 工程 | 結果 | 実測 |
|---|---|---|
| B5 countTokens | 合格 | 2回とも10,458 token |
| 送信前費用投影 | 合格 | 最大US$0.2536035、上限US$1.00内 |
| B6 generateContent | 合格 | 1回、再試行0、raw先行保存 |
| provider応答 | 合格 | HTTP 200、Gemini 3.6 Flash、candidate 1件、STOP、`complete` |
| usage | 合格 | prompt 10,458 / candidate 2,013 / thinking 5,700 / total 18,171 token |
| B6 list price換算 | 合格 | US$0.03676725 |
| safety | 合格 | blockなし |
| secret | 合格 | 保存0件 |

入力はv021正式source packageの3字幕・253境界であり、字幕本文、境界、Tier 1 schema、価格、US$1.00上限を変更していない。

## 3. 正式selection受入

| 検査 | 結果 |
|---|---|
| source binding | 合格 |
| provider envelope | 合格 |
| response schema | 合格 |
| caption集合 | 合格 |
| cue境界の所属・順序 | 合格 |
| 行末境界の所属・順序 | 合格 |
| atom全量閉包 | 合格 |
| 論理幅 | 合格 |
| 決定的再構築 | 合格 |
| 物理配置 | **不合格** |
| timeline写像 | 未実施（前段停止） |

違反は1件だけである。

- code: `CUE_PHYSICAL_LAYOUT_INVALID`
- 対象: 第3字幕、第2 cue、`voice-190`
- cue本文: `てめぇはしゃぎやがってじゃ報告しない`
- cue終端: 第38境界
- 選択行末: 第38境界だけ（1行）
- 論理幅: 36
- providerへ提示した1行上限: 36
- 正式な物理page graph: この1行選択に一致する辺0件

このcueはD2診断でも同じ本文・同じ論理幅36・同じ一行選択で物理配置不合格となった箇所である。v021のC4追加後も、この一点は解消しなかった。

## 4. 既知6境界

| 既知境界 | cue終端 | 行末 | 判定 |
|---|---:|---:|---|
| `マリ/ン` 第1箇所 | 未選択 | 未選択 | 合格 |
| `マリ/ン` 第2箇所 | 未選択 | 未選択 | 合格 |
| `ス/イちゃん` | 未選択 | 未選択 | 合格 |
| `じ/ゃ報告` | 未選択 | 未選択 | 合格 |
| `言ってほし/いみたいな` | 未選択 | 未選択 | 合格 |
| `サク/サク` | 未選択 | 未選択 | 合格 |

既知6境界の再選択は0/6、非再選択は6/6である。

## 5. 三分法

- production: 欠陥は確認されていない。正式な物理配置に一致しない選択をstrict受入が拒否した。
- fixture・実行設営: 欠陥は確認されていない。全binding、正式preflight、物理配置より前の全検査が合格した。
- 契約: **人間判断が必要**。providerへ提示した決定的な論理幅規則では幅36を一行として許す一方、ZEVOの実表示計算は同じ一行を配置不能として拒否する。AI回答の修復や再送で黙って吸収できる差ではなく、providerへ渡す配置判断材料とローカル物理判定の所有境界を決める必要がある。

## 6. 停止後に未実施の工程

- selection正式成果物の公開: 0件
- page/line plan: 0件
- render plan: 0件
- 横型描画: 0/3本
- QC: 0件
- 人間確認ページ: 0件
- 追加API通信: 0回
- commit / stable tag: 0件

## 7. 証拠

- B5 formal attempt: `test-runs/20260816-zevo-caption-quality-v002-v021-b5-formal-attempt-0002/`
- B6 formal attempt: `test-runs/20260816-zevo-caption-quality-v002-v021-b6-formal-attempt-0001/`
- selection formal attempt: `test-runs/20260816-zevo-caption-quality-v002-v021-selection-formal-attempt-0001/`
- B6 raw response SHA-256: `52614a34a6741e52df9c1a5b8e239b77dbe7562c65f7982b6297cb9b85c5f9d8`
- B6 manifest SHA-256: `b0b63c051af072ad857a961633710d3c4cd4d3e6dfbdab29d87b3420e79472c4`
- selection report SHA-256: `1bfbd457842e2451d5b5b1ef20a8c185d2f02d68dd4f09f87ca05638b0379b7e`
- selection stdout SHA-256: `62a4659c4e2a1a575810ece39b4180f21f84f9930e8497283fc7705354b227f2`
- 読み取り診断record SHA-256: `15fc4c3157760032c6b29423e32237d7c334399c11deb0206180ab980c0d389d`

## 8. 次の裁定点

AIへ見せる「一行に収まる」の判定を、現行の文字種別による論理幅だけで所有し続けるか、ZEVOの物理page graphと一致する決定的な候補情報を入力へ追加するかを決める必要がある。後者はprovider入力と意味／表現境界に触れるため、本attempt内では設計・修正しない。
