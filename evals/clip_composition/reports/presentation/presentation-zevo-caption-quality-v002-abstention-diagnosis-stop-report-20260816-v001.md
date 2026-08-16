# ZEVO字幕品質v002 棄権原因診断 停止報告 v001

日付: 2026-08-16  
停止分岐: D1棄権継続 → D2/D3理由観測 → 人間判断へ戻す

## 1. 結論

Gemini 3.6の棄権は、thinking levelをmediumからhighへ一件だけ変えても解消しなかった。D1はHTTP 200・provider envelope合格・安全性遮断なしで、回答は再び`abstained`だった。

D2では、棄権時に理由を返せるschemaへ一件だけ拡張したところ、モデルは3字幕分の選択内容を生成した。しかしstatusを契約外の`success`としたため、ローカル厳格受入の最初の応答schemaで不合格となる。回答は診断専用のまま保持し、selection・描画へ流用していない。

D3の自由記述では、モデルは「出力schemaの詳細と、意味の小単位を分ける客観基準が不足している」と説明した。これはproviderが返した説明の記録であり、内部機構や真因を断定するものではない。D3は意図的にstructured outputを外した診断なので、「schemaがない」という説明を正式requestへそのまま帰属させない。

既承認分岐(c)に従い、D4〜D6、v020、正式B6、selection、横型描画、QC、確認ページは実施せず停止した。次の判断対象はprompt/task本文の改訂要否である。

## 2. 診断結果

| ID | 差分 | HTTP | provider | 回答 | token（入力/候補/thinking） | 費用 |
| --- | --- | ---: | --- | --- | --- | ---: |
| D1 | thinking medium→highのみ | 200 | passed | `abstained` | 10,282 / 6 / 2,004 | US$0.01524900 |
| D2 | abstained branchへ`reason:string`一件 | 200 | passed | `status=success`、caption 3件、cue 13/8/6 | 10,282 / 1,797 / 4,427 | US$0.03105150 |
| D3 | structured outputなし、障害説明指示を追加 | 200 | passed | 理由説明 | 10,299 / 49 / 1,897 | US$0.01502175 |

診断3回の累計はUS$0.06132225で、承認上限US$0.25以内。D1〜D3はいずれも一回、再試行0、raw先行保存である。

本日全API実測の累計は、診断前US$0.08396625を加えて**US$0.14528850**。本日上限US$1.00以内である。

## 3. ローカル厳格受入の扱い

### D1

`abstained`はschema上の有効な棄権回答だが、selection成立ではない。従ってselection validatorのcomplete経路と既知6境界非再選択検査には入っていない。

### D2

最上位statusが`success`である。正式応答で許される値は`complete`または`abstained`だけなので、応答schemaで確定不合格となる。後段のcaption集合、境界順、幅、物理配置、時間写像、既知6境界は評価対象に進めない。

D2が生成した選択内容は、診断回答の正式流用禁止により正式成果物へ転記しない。

### D3

structured outputを外した理由観測専用であり、selection validatorの入力ではない。

## 4. 観測された理由

> 出力フォーマットとなるJSON Schemaの詳細な定義および「意味の小単位」の客観的な分割基準が提示されていないため、要求された仕様を正確に満たす結果を生成できません。

意味として読める範囲は次までである。

- thinking量を増やすだけでは棄権は解消しない。
- 理由を要求すると、モデルは分割判断の基準不足を申告する。
- D2では実際に選択内容まで生成しているため、「内容生成が物理的に不可能」とは確定しない。
- 正式taskをどこまで具体化するか、例示を加えるかは出力品質と契約意味に触れるため、人間裁定へ戻す。

## 5. 証拠

- D1: `reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-abstention-diagnosis-20260816-v001/d1-thinking-high/`
- D2: 同rootの`d2-abstained-reason/`
- D3: 同rootの`d3-free-text-obstacle/`
- 集計: 同rootの`d1-d3-summary.json`
- 判定: 同rootの`d1-d3-analysis.json`

各directoryにrequest、preflight、raw response、resultを保存した。診断rootは正式成果物rootと分離されている。

## 6. 未実施

- D4〜D6: 0回。D1棄権分岐はD2/D3後停止と固定されているため、追加対照を選定しなかった。
- v020: 起草0件。
- 正式B6: 0回。
- selection受入・page/line plan・render plan: 0件。
- 横型3本・QC・確認ページ: 0件。
- API key、secretの保存: 0件。
- commit、stable tag: 0件。

## 7. 次の人間判断

正式prompt/task本文の改訂を行うか。検討時は、D3の理由だけでなく、D2が3字幕分の選択を生成しながらstatus literalを外した事実を併せて扱う必要がある。単にthinking highへ変えるv020は根拠を失ったため、現時点では採用しない。
