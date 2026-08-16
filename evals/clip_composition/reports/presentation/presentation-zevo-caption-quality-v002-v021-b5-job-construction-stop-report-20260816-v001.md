# ZEVO字幕品質v002 v021 B5正式job製造 停止報告 v001

## 1. 結論

v021の判断基準はsource packageへ正しく反映され、API通信前の関連検査も全合格した。しかし、新しいB5正式jobを公開した直後の正式decoder検査で拒否されたため、`countTokens`を送信せず停止した。

- API通信: 0回
- `countTokens`: 0回
- `generateContent`: 0回
- 費用: US$0
- B5正式出力root: 未作成
- B6・selection・描画・QC: 未実施

## 2. 完了した前提整備

### 2.1 v021正本化

C1・C2・C4を字幕境界選択の仕事本文へ、C6を棄権条件へ反映した。C3、20ms級の局所規則、ページ数最少、決定的境界順はprovider入力へ加えていない。

### 2.2 入力不変

新しいsource packageは、旧版と次が一致した。

- caption本文と境界列: 一致
- caption数: 3
- 境界数: 253
- 表示幅制約: 一致
- 本文と元時刻の再構築表: 一致

変更は判断基準の文章とv021承認来歴だけである。

### 2.3 API通信前検査

| 検査 | 結果 |
|---|---:|
| source package | 6/6 |
| B5/B6正式入口 | 11/11 |
| selection受入 | 10/10 |
| page/line計画 | 10/10 |

固定Node、固定TSXの絶対path、`NODE_OPTIONS`不存在、native arm64を各正式記録へ保存した。標準エラーは全て0 byteだった。

## 3. 停止位置

新しいB5 job byteは正式serializerで保存できたが、正式decoderが`schema-invalid`として拒否した。B5本体は起動していない。

拒否されたjobと支出承認行は上書きせず、失敗証拠として保持する。

## 4. 内側原因

B5 jobは、価格・token・課金・thinking・modelの公式根拠6件を、それぞれ**現在のB5 job ID専用directory**から参照する必要がある。

今回のjob製造処理はjob IDと出力rootを新版へ進めた一方、6件の根拠snapshot pathを旧B5 job用directoryのまま引き継いだ。正式decoderは6件全てで「現在のjob IDから導出される保存先」と一致しないことを検出し、通信前に拒否した。

## 5. 三分法

- production／実装: **job製造処理の実装欠陥**
- fixture・実行設営: 該当なし
- 契約解釈: 不要

価格値、モデル、source package、v021本文、API requestの意味に矛盾はない。

## 6. 推奨するforward-only修正

同attempt内では修正しない。次の限定修正を推奨する。

1. 拒否済みv005 jobと支出承認行を不変保持する。
2. 検証済みの公式snapshot 6件をbyte同一のまま、新しいjob ID専用directoryへ配置する。再取得・内容変更は不要。
3. 新しい版付きB5 jobと未使用出力rootを発行し、6件の参照先をそのjob IDへ一致させる。
4. 正式decoder・値validator合格後だけ`countTokens`へ進む。

この修正は契約・task本文・字幕本文・253境界・価格・支出上限を変えず、API通信0回で閉じる。

## 7. 証拠

- 診断record: `presentation-zevo-caption-quality-v002-v021-b5-job-construction-diagnosis-20260816-v001.json`
- 拒否済みB5 job: `a-v002-caption-quality-first-api-b5-20260816-v005.json`
- source package正式実行記録: `20260816-zevo-caption-quality-v002-v021-source-formal-attempt-0001`
- B5/B6回帰: `20260816-zevo-caption-quality-v002-v021-b5-b6-regression-attempt-0001`
- selection回帰: `20260816-zevo-caption-quality-v002-v021-selection-regression-attempt-0001`
- planner回帰: `20260816-zevo-caption-quality-v002-v021-planner-regression-attempt-0001`
