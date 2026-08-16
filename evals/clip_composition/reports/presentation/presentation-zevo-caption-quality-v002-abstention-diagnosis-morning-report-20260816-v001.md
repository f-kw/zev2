# ZEVO字幕品質v002 棄権原因診断・朝報告 v001

日付: 2026-08-16  
状態: D1送信前停止（明示承認待ち）

## 1. 結論

Gemini 3.6正式B6は、正式入力とTier 1 schemaをHTTP 200で受理し、安全性遮断なしでcandidateを返したが、アプリケーション回答は`abstained`だった。輸送失敗・schema不受理・安全性遮断とは別層である。

原因診断D1は、正式requestのthinking levelだけをmediumからhighへ変えたbyteを製造し、通信前照合まで完了した。診断回答はselection・描画へ流用しない。現時点では明示承認がないため送信していない。

## 2. D1〜D6一覧

| ID | 診断内容 | HTTP | 回答status | token | 費用 | 判定 |
| --- | --- | ---: | --- | ---: | ---: | --- |
| D1 | 同一正式入力・Tier 1・thinking high | 未送信 | 未観測 | 0 | US$0 | request/preflight完成、明示承認待ち |
| D2 | abstained branchへreason一件追加 | 未実施 | 未観測 | 0 | US$0 | D1が棄権した場合のみ |
| D3 | structured outputなし・障害理由の日本語説明 | 未実施 | 未観測 | 0 | US$0 | D1が棄権した場合のみ |
| D4 | 結果依存の追加対照 | 未選定 | 未観測 | 0 | US$0 | 選定理由未発生 |
| D5 | 結果依存の追加対照 | 未選定 | 未観測 | 0 | US$0 | 選定理由未発生 |
| D6 | 結果依存の追加対照 | 未選定 | 未観測 | 0 | US$0 | 選定理由未発生 |

## 3. D1通信前証拠

- source formal requestは保存済み正式byteを再読した。
- source SHA-256は`3953d03a8f34cb715295dc9e1cdc87ace1272cda1e07f95c174449cc36338fc7`。
- D1 request SHA-256は`ebb0755f06be4252052a934bd71cddab5907f38ac0ee01d42347578cb406d79d`。
- 差分はthinking levelのmedium→high一件だけ。
- prompt、system instruction、Tier 1 schema、最大出力token、response MIMEはbyte同一。
- raw先行保存、再試行0、診断回答の正式流用禁止をpreflightへ固定した。

## 4. 本日API実測の到達点

1. Gemini 3.7の複雑schemaはHTTP 400。個別語彙でなくcomplete branch内の制約密度と実測した。
2. provider schemaをTier 1へ薄化し、HTTP 400を解消。削除制約はローカルstrict validatorが引き続き所有する。
3. 3.7正式requestは安全性遮断。字幕単独とTier 3全量対照では遮断せず、字幕本文単体の原因ではなかった。
4. schema/出力予算の分離probeを保存した。
5. Gemini 3.6はTier 1を受理し、安全性遮断なし。正式B6は明示的棄権。

本日ここまでのAPI費用実測累計はUS$0.08396625。D1準備以後の追加通信0回、追加費用US$0。

## 5. 自走分岐の現在地

どの分岐にもまだ入っていない。

- D1 completeかつ診断strict受入・既知6境界非再選択が全合格: thinking highだけを正式化するv020候補へ進む。
- D1 completeだが受入不合格: predicateを保存して停止。
- D1 abstained: D2/D3を実行し、prompt/task改訂は人間判断へ戻す。
- 追加の契約判断が必要: 即停止。

正式B6は送っていない。横型3本、QC、確認ページも未実施。

## 6. 副線成果

### Gemini実測観察

schema 400、安全性遮断、3.6棄権を一つの版付き観察記録へ整理した。各層を同一原因へ統合していない。

### GPT-5.6 Luna公式調査

公式一次資料だけを調べ、次を保存した。

- model/endpoint/auth/structured output/usage/価格/rate limit/データ扱いのsnapshot。
- 現行Gemini B5/B6配線との接続材料。
- LunaではResponses input token countとResponses生成jobをprovider専用に分離する第一候補。
- OpenAI API通信0回。契約・品質・採用は未確定。

### 完了報告草稿

機械検証完了点、Gemini実走の経緯、未成立のselection/描画、凍結在庫を同期した。

## 7. 外部作用

- D1〜D6通信: 0回。
- OpenAI API通信: 0回。
- 本報告同期による追加費用: US$0。
- secret保存: 0件。
- commit: 0件。
- stable tag: 0件。

## 8. 次に必要な人間入力

D1診断送信の明示承認。承認文の要点は「同一正式入力・Tier 1・thinking high・1回・raw先行保存・再試行0・診断回答の正式流用禁止・診断累計上限US$0.25」である。
