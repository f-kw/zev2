# ZEVO字幕品質v002 F局所正式attempt-0002 停止報告 v001

- 日付: 2026-08-12
- 判定: 停止
- 外部通信: 0回
- API費用: US$0
- production・契約・proof 489件・正式成果物・stable tagの変更: 0件
- U局所attempt以降: 未実施

## 1. 実行前閉包

F/U fixture供給経路を、保存済み成果物→実在schema→供給field→consumer引数まで現物byteから逆引きした。旧output requestの意味package fieldは `meaningInformationPackage`、新F formal output requestのfieldは `meaningPackageBinding` と別schemaで固定し、黙った読み替え0件を確認した。

3 caseはproduction自身の入口で次を通過した。

- 意味package・style・基礎映像のstable再読: 3/3
- 意味caption・atom全量閉包: 3/3
- selection投影: 3/3
- page/line planner v003: 3/3、各3 cue
- 旧render plan 6件のexact schema・file SHA・canonical SHA: 6/6

証拠: `presentation-zevo-caption-quality-v002-v011-f-u-fixture-closure-preflight-20260812-v002.md`

## 2. 正式attempt結果

| 検査 | 結果 | 到達点 |
|---|---:|---|
| ZCQ042 | 合格 | proof job・束縛・pure入口・module表面 |
| ZCQ043 | 不合格 | productionの字幕処理前。共通初期化中に `input-reread / CUE_PROOF_EXECUTION_FAILED` |
| ZCQ044 | 不合格 | 最初のroot reservation負例が期待枝へ到達する前に同じ外側fatal |
| 合計 | 1/3 | F局所未完了 |

TAP全文は保存済み。stderrは0 byte。TAPには3 ID全件と最終集計がある。

## 3. 原因と帰属

### 3.1 ZCQ043

帰属は検査設営。

正式fixtureが指定した出力先の親directoryが現物に存在しない一方、productionの正式directory取得入口は対象staging directoryだけを非recursiveで作る。したがって対象directory作成が `ENOENT` となり、source package・selectionの正式再読より前に停止した。

具体的証拠:

- 親directoryの現物: 不存在
- 正式出力root・staging root: いずれも未作成
- productionのdirectory取得処理: 親を補わず対象directory一件だけを作る
- TAP: `input-reread / CUE_PROOF_EXECUTION_FAILED`
- 事前の3 case production pure入口preflight: 全件合格

よってproduction字幕処理・fixtureの本文値・契約の品質不合格ではない。

### 3.2 ZCQ044

正式TAPで観測された外側結果は `input-reread / CUE_PROOF_EXECUTION_FAILED`。ただし当該失敗はstaging取得前であるためfatal成果物がなく、TAPにも内側checkpoint・capability呼出回数がない。保存済み正式証拠だけでは内側原因を一意に確定できない。

読み取り専用の対照では、保存済みの同じroot-reservation jobを使い、出力先不存在を返す既存capabilityを明示したところ、期待どおり `rejected / root-publication / CUE_PROOF_PUBLICATION_FAILED` へ到達した。これはjob byte・production拒否枝が成立する対照証拠だが、正式process内での不一致原因を推測で確定する根拠には使わない。

帰属: 診断可能性不足。production欠陥・契約欠陥とは未確定であり、推測0件を維持する。

### 3.3 TAP保存commandの外側設営

Node test runner終了後、shellの終了code保存に予約済み変数名を使ったため、外側commandがそこで終了した。検査本体は完了してTAP footerまで保存済みであり、stderrも保存済みだが、独立した終了code fileは製造されていない。この訂正のための再実行は行っていない。

## 4. 停止規律の適用

本再閉包後のF正式attemptで検査設営起因の不合格が再発したため、承認済みの最終歯止めを適用する。

- 同attempt修正: 0件
- 修正案: 提示しない
- 再計画案: 提示しない
- 新attempt: 実施しない
- U・正式46件・回帰・tree照合: 未実施
- API通信・countTokens・generateContent・費用支出・正式描画・stable tag: 0件

F/U工程を停止し、kawafmmの裁定へ戻す。

## 5. 証拠

- TAP全文: `evals/clip_composition/reports/presentation/test-runs/20260812-zevo-caption-quality-v002-v011-f-formal-attempt-0002/tap.log`
  - SHA-256: `42cca8e6809f26870efa0a1ab83acfabac19f8adeb4113dbcd0258f48788bdbe`
- stderr: `evals/clip_composition/reports/presentation/test-runs/20260812-zevo-caption-quality-v002-v011-f-formal-attempt-0002/stderr.log`
  - 0 byte
  - SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- fixture閉包preflight: `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-v011-f-u-fixture-closure-preflight-20260812-v002.md`
  - SHA-256: `d6f7c6f59107bedd34cfe91f6cba487bb62831294e7a039b3683780d0fe7c923`
