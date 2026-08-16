# 字幕境界選択LLM provider再評価 実現性調査下書き v002

日付: 2026-08-14

## 1. 目的と範囲

ZEV本運用の拡大前に、同じ字幕境界選択仕事を複数providerへ与え、単価だけでなく、正式schema適合、既知の不自然境界の非再発、完成字幕の読みやすさを実測比較する。

現行Geminiと、在庫に登録されたGPT-5.6 Luna候補を比較対象とする。ただし本書は読み取り専用の設計素材であり、公式情報の再取得、API接続、通信、価格確定、実装、provider採用を含まない。

## 2. 実現性調査

### 2.1 現物照合した入口

| 役割 | 現物 | SHA-256 | 確認した事実 |
| --- | --- | --- | --- |
| provider可視入力の製造 | `presentation_output_caption_cue_source_package_v001.mjs` | `4fad07904c31a48d0aa4eecaac771f6b7b1304275356edc9a13e6173f3b269ff` | caption本文を境界片として一度だけ保持し、境界IDとstyle上限へ閉じる |
| Gemini B5/B6 | `run_presentation_output_caption_cue_b5_b6_v001.mjs` | `633e486b824f4e8b588bf2c0b41988b15b7eed55e66c302eedda9c44805b3a55` | countTokens最大2回、generateContent 1回、raw先行保存、usage・費用投影、再試行0を所有 |
| provider回答の意味受入 | `presentation_output_caption_cue_selection_v001.mjs` | `fbe7152f1a26837af51f26a4c673b2cddbc889370988b6e3c85dedb50d741cd6` | provider envelopeから選択を読み、境界・順序・文字全量・幅・物理配置・時間写像を検査 |

これら3入口は実在する。第二providerのtransport・認証・usage・response envelopeを所有する実装は存在しない。

### 2.2 現物のprovider可視入力

F局所attempt-0009で製造されたsource packageを読み取りfixtureとして照合した。

- schema: `presentation-output-caption-cue-source-package-v001`
- source package formal byte: 110,316 byte
- providerへ見せる`promptInput` formal byte: 27,057 byte
- caption: 3件
- boundary candidate: 253件
- caption別boundary数: 101 / 72 / 80
- 本文UTF-8 byte合計: 735 byte
- style上限: logical width 36、最大2行
- 文字幅規則: `U+0000..U+00FF=1; other Unicode code point=2`

fixture:

- `test-runs/20260814-zevo-caption-quality-v002-f-gate-attempt-0009/fixtures/source-package-v001.json`
- SHA-256: `06525d18519ca367b85447552647227df60fcbe729c631811413ee54a5be4d20`

provider可視byteは`promptInput`だけである。媒体、path、SHA、時刻、元atom ID、preset、crop、format、旧plan、既知の不自然境界、期待回答は送らない設計になっている。

### 2.3 現行回答schema

回答は次の二択である。

1. `status=abstained`
2. `status=complete`とcaption列

complete時は各captionについて、次だけを返す。

- 入力に実在するcaption ID
- cue終端のboundary ID
- 1〜2件の行末boundary ID

本文、時刻、理由、点数はproviderに生成させない。本文と時刻はsource packageの再構築mapから機械復元する。

### 2.4 Gemini固有部分

現行B5/B6はprovider中立ではない。現物上、次がGeminiへ固定されている。

- `GEMINI_API_KEY`
- Gemini Developer API / v1beta / synchronous endpoint
- `countTokens`
- `generateContent`
- `systemInstruction`と`contents`
- `generationConfig.responseJsonSchema`
- `thinkingLevel=medium`
- service tier省略をStandardとして扱う費用契約
- Gemini usage metadata、model version、HTTP envelopeの検査

したがって、第二providerを現在のrunnerへ条件分岐で足すだけでは済まない。後方互換分岐を作らず、provider固有transportとprovider共通の意味選択受入をどこで分けるかを版付き契約で決める必要がある。

### 2.5 保存済み実走pairの有無

#### 字幕境界選択v002

正式B5/B6入力・回答pairはまだ存在しない。F局所が2/3で停止しており、API通信は別承認のままである。

#### 旧・意味境界選択

candidate 59の旧意味境界選択には正式実走pairが存在する。

- raw response
- provider envelope
- B6 manifest
- usage metadata
- list price換算費用
- raw先行保存と再試行0の検査記録

実測値:

- prompt token: 92,769
- candidate token: 989
- thinking token: 3,912
- total token: 97,670
- list price estimate: US$0.175911
- generateContent: 1回
- retry: 0回

これは字幕cue終端・行末選択とは仕事が異なる。字幕品質の正解教師、入力規模、provider優劣の測定値へ流用しない。provider envelope、usage観測、費用投影、raw先行保存の実績資料としてだけ利用可能である。

実体:

- `meaning-boundary-b6-attempts/qdczJpv8RCc-candidate-59-meaning-output-first-run-b6-v001/attempt-v001/b6-manifest.json`
- `meaning-boundary-b6-attempts/qdczJpv8RCc-candidate-59-meaning-output-first-run-b6-v001/attempt-v001/provider-response-envelope.json`

### 2.6 第二providerの未成立事項

GPT-5.6 Lunaについて次は未確認である。

- 正式モデルID
- 正式endpointと認証方式
- JSON Schemaによる構造化出力のexact機能
- reasoning/thinking tokenのusage表現
- 入出力上限
- Standard相当単価
- raw HTTP responseの保存境界
- 利用可能性と廃止予定

これらは時間変動する公式事実であり、通信0の本書では確定しない。名称だけを根拠に実走可能とは扱わない。

## 3. 比較に使えるfixture

### 3.1 第一候補

ZEVO字幕品質v002の旧v3三候補を一つの比較packageとして使う。

| case | boundary数 | 本文UTF-8 byte |
| --- | ---: | ---: |
| voice-013 | 101 | 285 |
| voice-067 | 72 | 210 |
| voice-190 | 80 | 240 |

この三候補には、完成6 planで観測された既知5類型、6つの一意なatom境界、7つのplan出現が対応している。

既知5類型:

- `ス/イちゃん`
- `じ/ゃ報告`
- `言ってほし/いみたいな`
- `マリ/ン`
- `サク/サク`

これらをprovider入力へ禁止例として送らない。回答後にだけ、実回答が対応する6境界をcue終端・行末へ再選択していないかを機械検査する。

### 3.2 教師として成立する時点

正式教師pairは次が一組で揃った時点で成立する。

1. source package
2. provider可視request byte
3. raw response
4. provider envelope
5. selection report
6. 再構築された横型3 plan
7. 人間の匿名採否・部分修正記録

現在は1と、合成回答から作った検査fixtureがある。2〜7の正式実データpairは未成立である。

## 4. 比較実験の最小構造

### 4.1 providerへ同一にするもの

- source package byte
- provider可視`promptInput` byte
- task description
- response schemaの意味
- 最大出力tokenの導出根拠
- 一回制・再試行0
- raw先行保存
- 支出上限の人間承認

provider固有APIが同一request envelopeを受けないため、HTTP byteそのものの一致は要求しない。providerへ見える意味入力が同一であることを束縛する。

### 4.2 providerごとに分離するもの

- 認証情報
- endpoint
- transport request/response envelope
- structured-output指定方法
- model/version/tier検査
- usage metadata
- 単価snapshot
- provider固有の不透明メタデータ

provider固有メタデータはraw/envelopeへ保存できるが、意味選択入力には使わない。

### 4.3 実走回数

第一比較は各providerへ同じpackageを1回、再試行0で送る。複数サンプルによる確率評価は別段階とする。1回比較から分散や安定性を主張しない。

## 5. 評価表

### 5.1 採用候補になるための必要条件

次は重み付けせず、全て必須とする。

1. rawが解析前に保存されている。
2. transport/envelopeがprovider別契約に合格する。
3. strict JSON schemaへ合格する。
4. caption集合・境界ID・順序・atom全量閉包へ合格する。
5. width・物理配置・timeline mappingへ合格する。
6. 既知6境界をcue終端・行末へ再選択しない。
7. abstainedでない。

一つでも不成立なら、その回答は完成字幕比較へ進めない。provider全体の永久不採用を1回で決めることはしない。

### 5.2 必須条件合格後に並記する実測値

- input token
- output token
- reasoning/thinking token（providerが公式usageとして返す場合）
- total token
- list price換算費用
- 応答時間
- cue数
- 行末数
- 一行に収まるcueへ置いた改行数
- 人間のcase別選択
- 人間の部分修正件数と対象境界

異なる単位を独自係数で合成した総合点は作らない。機械必要条件、費用・時間の実測表、人間の匿名選択を別々に提示し、採用判断はkawafmmへ戻す。

### 5.3 人間確認

provider名とモデル名を隠し、同じcaseの二つのplanを並べる。人間が見るのは次だけとする。

- 意味小単位として自然か
- 前方文字が長く残らないか
- 日本語の語中・不自然な文節位置で改行していないか
- 一行に収まる短い文を不要に改行していないか
- 短いcueの4frame fadeが読みにくくないか

回答はcaseごとのA/B/どちらも不可と、必要な場合の境界部分修正で保存する。モデル名当て、一般的なブランド評価、速度・価格への印象は字幕品質票へ混ぜない。

## 6. transport設計の比較

| 案 | 構造 | 長所 | リスク |
| --- | --- | --- | --- |
| provider別B5/B6 job | Geminiと第二providerが別job/schema/runnerを持ち、selectionだけ共通化 | provider固有差をexactに閉じやすい | job・検査・bindingが増える |
| provider中立B5/B6 v002 + adapter | 共通jobがprovider IDを持ち、adapterがtransportを担当 | 比較runnerを組みやすい | provider差をunion/fallbackへ流す危険、後方互換分岐禁止との緊張 |
| 外部エージェント実行 + 共通raw取込 | サブスク内エージェント等が選び、rawを共通受入へ渡す | 従量API以外の代替を試せる | API envelope・usage・再現可能な実行条件を同じ強さで証明しにくい |

現物上の第一候補はprovider別B5/B6 jobである。現行selectionは意味回答の厳格検査を既に独立所有しており、provider固有transportを無理にunion化せず接続できる可能性がある。ただし、実装案ではなく次の完全設計でbinding・成果物・failure ownerを全件閉じる必要がある。

## 7. 次の正式設計前に必要な調査

### 7.1 公式情報調査

通信を別承認した上で、各providerの公式一次資料だけから次を版付きsnapshotへ固定する。

- model存在
- endpoint
- structured output/schema制約
- token上限
- usage項目
- 単価
- rate limit
- retention/data-use条件
- 廃止予定

### 7.2 実装現物調査

- selection jobがprovider名へ依存せずに受け取れる最小provider envelope
- raw responseからsemantic textを取り出す責務の所在
- provider別usageを共通費用表へ投影できる範囲
- credential unavailable、transport failure、usage invalid、raw publication failureのowner
- providerごとのcountTokens相当機能の有無
- 同一意味入力byteを各transportへ渡したことの証明方法
- formal job bindingと工程入場receiptの増分

### 7.3 代替可否

新規API導入前に次も比較する。

- サブスク内エージェントで同じ境界ID選択を行い、rawを版付き保存できるか
- 決定的日本語分節器だけで既知5類型と人間品質を満たせるか
- Gemini一社のまま、prompt/schema変更で品質問題を解けるか

効果が確認できない場合にprovider追加そのものを中止できる分岐を設計へ残す。

## 8. 停止条件案

- 第二providerの正式モデル・endpointが公式確認できない。
- strict JSONまたは同等の構造化出力をraw改変なしで受理できない。
- providerへ見える意味入力の同一性を機械証明できない。
- raw先行保存またはusage観測を同じ保証強度で実現できない。
- provider差を扱うためにselection側の意味検査を緩める必要がある。
- provider固有メタデータを意味入力へ混ぜる必要がある。
- 費用上限を通信前に固定できない。

## 9. 人間作業

正式比較の人間作業は、三候補それぞれの匿名A/B/どちらも不可と、必要時の部分修正である。所要時間は実物確認ページが未成立なので見積もらない。独自係数による時間換算は行わない。

## 10. 結論

同一の意味入力と共通selection検査を使ったprovider比較は構造上可能である。比較fixtureとなる3 caption・253 boundaryのsource packageと、既知5類型の評価材料は現物に存在する。

一方、第二providerの正式実在性・単価・structured output・transportは未確認であり、字幕境界選択v002の正式API入力・回答pairも未成立である。旧意味境界選択pairはtransport/usageの参考に限定し、字幕品質教師へ流用しない。

したがって次の正規順序は、ZEVO字幕品質v002のF/U検査設営問題を別裁定で閉じる→字幕境界選択の正式Gemini pairと人間採否を成立させる→第二provider公式調査と別契約→匿名比較、である。

