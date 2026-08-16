# 字幕境界選択LLM provider再評価 実現性調査下書き v003

日付: 2026-08-15

状態: **在庫更新**。通信、公式情報取得、API接続、比較実走、provider選定を含まない。

## 1. v002からの更新

v002で確定した次の現物事実は不変である。

- provider可視入力はcaption本文の境界片、境界ID、style上限、task descriptionだけ。
- 3 caption、253 boundary（101 / 72 / 80）。
- 回答はcaption ID、cue終端boundary ID、行末boundary IDだけを返し、本文と時刻は機械復元する。
- 現行B5/B6 transportはGemini固有であり、第二provider transportは未実装。
- 旧意味境界選択pairはtransport/usage参考に限定し、字幕品質教師へ流用しない。
- 既知5類型・一意6境界は回答後検査に使い、provider入力へ禁止例として送らない。

今回の更新は、F/U fixture製造独立工程の採用と設計提示を、比較実験の前提順序へ反映することである。

## 2. 現在地

ZEVO字幕品質v002は、S/A/L/P/Rまで局所合格し、Fは直近attempt-0011で1/3停止、Uは未実施である。停止原因はprovider処理ではなくF検査設営であり、productionが後段導出するrenderer作業rootをfixture環境が閉包しなかったことである。

F/U fixture製造を独立正式工程にする契約設計v001が提示済みで、未承認である。設計はF/U用の44 payload、600環境行、26保持行を正式package/receiptへ閉じ、F/U testから製造責務を外す。

字幕境界選択の正式Gemini request/raw/selection pairはまだ成立していない。合成fixtureをprovider品質教師とは扱わない。

## 3. provider比較への影響

### 3.1 fixture工程が所有するもの

F/U独立fixture工程は、検査を決定的に実行するための合成provider raw、provider envelope、selection、passed reportを製造する。これは検査用成果物であり、Geminiの正式実回答ではない。

したがって、fixture receipt成立を「Gemini pair成立」や「provider品質を測定済み」と記録してはならない。

### 3.2 API実走が所有するもの

正式比較教師には引き続き次が必要である。

1. 正式source package
2. provider可視request byte
3. raw response
4. provider envelope
5. selection report
6. 再構築された横型3 plan
7. 人間の匿名採否・部分修正記録

F/U fixture工程は、1のschemaと3〜5の検査経路を機械fixtureで先に証明するが、2〜7の実データ実績を代替しない。

## 4. 正規順序

1. F/U fixture製造契約設計を人間承認する。
2. fixture runner/testを実装し、receipt経由でF/Uを閉じる。
3. 正式48件、回帰、green、baseline、tree照合を閉じる。
4. API支出を別承認し、Gemini B5/B6を一回、再試行0で実走する。
5. 横型3 planを再構築し、人間採否を保存してGemini教師pairを成立させる。
6. 第二providerの公式一次資料を調査し、model、endpoint、structured output、usage、単価、上限、retentionを版付きsnapshotへ固定する。
7. provider別transport契約を設計する。
8. 同一意味入力で各provider一回、再試行0の匿名比較を行う。

第二provider公式調査を4より先に行うことは技術的には可能だが、Gemini側の正式教師が無い状態では比較軸が閉じない。

`要裁定`: 第二provider公式調査をGemini pair成立後に始めるか、F/U完了後に並行して始めるか。

## 5. 比較設計で維持する条件

- providerへ見える意味入力を同一にする。
- provider固有HTTP byteの一致は要求しない。
- provider別rawを解析前に保存する。
- 一回制、再試行0。
- strict schema、caption集合、境界ID、順序、文字全量、幅、frame写像を全て必須にする。
- 独自係数の総合点を作らない。
- 費用、時間、token、機械合否、人間匿名選択を別表にする。
- provider metadataを意味入力へ使わない。
- 効果が無い場合はprovider追加を中止し、機械処理またはサブスク内エージェントへ戻れる分岐を残す。

## 6. 現物の再利用可否

| 現物 | 用途 | 禁止する流用 |
|---|---|---|
| 3 caption・253 boundary source package | provider共通意味入力 | providerごとに本文・境界を変えること |
| 既知5類型・6境界 | 回答後の非再発検査 | prompt内の禁止例 |
| 合成provider raw/selection | schema・検査・再構築の機械proof | provider品質教師、token/費用測定 |
| 旧意味境界選択pair | raw保存、usage、費用投影の参考 | 字幕cue/行末品質教師 |
| 将来のGemini正式pair | 第一provider教師 | 第二providerのexpected answerとしてpromptへ送ること |

## 7. 未確認事項

第二provider候補について次は未確認のままである。

- 正式モデルIDと提供状態
- endpoint / 認証
- strict structured output
- reasoning tokenのusage表現
- 入出力上限
- 単価とtier
- raw response保存境界
- retention / data use
- 廃止予定

これらは時間変動するため、実調査時に公式一次資料だけで確認する。本在庫更新ではweb検索を行っていない。

## 8. 停止条件

- F/U検査を通すためにselection意味検査を緩める必要が出る。
- provider比較のために本文・時刻をLLM生成へ戻す必要が出る。
- raw先行保存またはusage観測を同じ保証強度で実現できない。
- provider可視意味入力の同一性を証明できない。
- API費用上限を通信前に固定できない。
- 第二providerの公式実在性またはschema能力を確認できない。

## 9. 要裁定

1. 第二provider公式調査をGemini pair成立後に始めるか、F/U完了後に並行開始するか。
2. 第二providerの候補集合。GPT-5.6 Lunaという在庫名は公式実在確認前の候補であり、確定モデル名として扱わない。
3. provider別B5/B6 jobを第一候補にするか。現物上は意味選択検査を共用しやすいが、正式契約は未起草である。

## 10. 外部作用

- API通信: 0回
- 公式web調査: 0回
- countTokens: 0回
- generateContent: 0回
- 費用: US$0
- provider採用: 0件

