# OpenAI J16 — 条件付き承認を受領、料金確認で送信前停止

## 結果と時刻

本人2026-10-08 19:48 JST「いいよ」を親mona経由で受領した。承認内容は保存した53字幕と場面説明・制作目的・観測情報をOpenAIへ送り、6字幕を一回だけ判定、再送なし、予算1.50USD以内、**送信前に予算内と確認できなければ停止**。承認不足ではなく、この条件の料金確認が未成立で止めた。

開始10:50:05 UTC（19:50:05 JST）、停止記録2026-10-08T10:55:16.873964+00:00。送信前確認311.874秒。状態は相談役待ち、次担当mona。API送信処理は起動せず、HTTP request0、再試行0。推測で予算確認済みのreceiptを作っていない。

## 送信候補の再読

原requestは83,132byte、SHA `05b669302d660337f52f7b650cf773e0010f3df22e99e5781d880adcd9ad6345`、gpt-6-luna、6質問、53字幕の場面文脈で一致。原9/30 input SHAはad8bfc4b55b19f4c2f34d74906f3609197651bdd53cbf45643ff0211d7f81dc5で一致。本文・質問・元ID・境界文脈を縮小/差替えせず、動画/音声媒体/画像/参照判定ラベルを追加しない。過去の未送信packetと準備記録を変更せずKEEP。

## 現行資料で確認できたことと不足

[Decisionsガイド](https://developers.openai.com/api/docs/guides/decisions)では入力100万tokenあたり0.10USD、出力/cache課金なし、長文/地域加算の適用を再確認した。[モデル](https://developers.openai.com/api/docs/models/gpt-6-luna)では1,050,000 context、272K超の入力2倍、地域10%加算を確認した。

ただし、[reference](https://developers.openai.com/api/reference/resources/decisions/methods/create)と[公式SDK](https://raw.githubusercontent.com/openai/openai-node/master/src/resources/decisions.ts)も含め、**6質問の共通入力・質問文・選択肢・内部の反復を最終的な課金input_tokensへどう合算するか、その上限**を確定できなかった。usageは応答後の情報であり、送信前の確定測定へ流用できない。モデルcontext上限はDecisions batch全体の課金token上限の根拠にはならない。公開request shapeに今回の金額を強制する一件用cost capも確認していない。一般の支出設定を変更しない。

前回の1.386USDは、最大contextを各質問につき一回、計六回と仮定した条件付きの見積。この仮定を裏付ける合算式が今回も得られず、「1.50USD以内を事前確認した」とは扱えない。実際に1.50USDを超えると判明したわけでもない。

必要な具体点は、OpenAIの正式説明等で今回の6質問を含む**課金入力の合算式または送信前の上側値**を確認できること。承認を取り直すことや鍵を新しく作ることでは、この根拠不足を解決しない。現条件を勝手に変えず、質問削減/別モデル/料金probe/Responsesの外部token計測/再送へ進まない。

## 応答・品質・費用の記録

| 項目 | 今回の実結果 |
|---|---|
| API送信/再送 | 0/0 |
| 応答・usage・API処理時間 | 未実施（null） |
| 参照判断6件との一致/不一致 | 未実施。0件一致として採点しない |
| usageからの実費計算/請求照合 | 未実施 |
| 今回のAPI起動による新課金 | 0（送信していない） |
| 新認証/鍵読込み/永続権限拡大/新動画 | 0 |

既存mock10件・型検査の前工程合格を実API成功や作品品質へ移植していない。今回は製品code変更0、媒体0、不要一時物0、cleanup回収0。短い確認scriptは終了し、既存process・入力・回答・動画を保持。

## 状態・保存

同じボード#44を費用根拠の確認中からCheck/相談役待ちへ戻す。本人の条件付き承認受領済みを残し、未承認の状態へ戻さない。Done45/59、文脈TODO54、他者項目と削除履歴を保持。

証拠root `/Users/kawafmm/Documents/Codex/2026-10-03/task-3`：`decisions-approved-trial-start-20261008-v001.json`、正式MCPの開始/終了再読、`decisions-approved-trial-budget-stop-20261008-v001.json`。製品code/原packet/DECISIONSは保持。今回のreport/session log/現在地4pathを監査用checkpointへ通常commit/pushし、最終branch/HEAD/remote/cleanは報告で確定する。API結果を捏造せず、請求全体を閲覧したことにもしていない。
