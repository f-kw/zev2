# OpenAI J16 — 一回の実API試験結果

本人2026-10-08 23:34 JST「おk」を親mona経由で受領し、保存済み53字幕の場面・境界説明、制作目的、観測情報を共有する6質問を、OpenAI Decisionsのgpt-6-lunaへ一回だけ送信した。HTTP200で6回答を受信し、元IDと回答形式の検査に合格した。参照判断と5件一致・1件不一致。今回の実試験は終了し、製造への組込みや新動画は行っていない。

## 承認条件の変更と実行

19:48 JSTの承認では、送信前に1.50USD以内と説明できなければ止める条件があった。その条件で未送信停止した過去の記録は保存する。今回23:34 JSTの本人回答は「1質問でも送信前の上限を保証できる仕様が見つからない。同じデータ・6質問を一回だけ、仮定付き1.386USD見積もりで試し、実際の利用量を確認する。1.50USD以内は保証できない。この不確実性を認めて試すか」という説明への承認である。今回はこの一回について不確実性を受容したもので、1.50USD保証済みや恒久的な費用・権限変更にはしない。

| 段階 | Macの実記録（UTC / JST） |
|---|---|
| 原入力・参照SHA・重複なしのオフライン照合 | 2026-10-08 14:44:08.584 / 23:44:08.584 |
| 排他的な送信記録作成・試験開始 | 14:44:48.065 / 23:44:48.065 |
| HTTPS POST開始 | 14:44:48.067 / 23:44:48.067 |
| TLS接続・request書込み完了 | 14:44:48.134 / 23:44:48.134 |
| HTTP応答開始 | 14:44:51.563 / 23:44:51.563 |
| 応答保存対象の受信終了 | 14:44:51.571 / 23:44:51.571 |
| 回答のオフライン検査 | 14:45:52.466 / 23:45:52.466 |
| 所有送信processの残存なし再読 | 14:47:51.283 / 23:47:51.283 |
| Check44の正式MCP保存・再読 | 14:47:54.388 / 23:47:54.388 |

送信開始から応答終了まで約3.504秒、排他記録等を含むdriver実測3.505秒。一件だけの実測であり、通常latency・全工程短縮・製造時間の保証ではない。HTTP dateの原値は別にraw transport証拠へ保存し、上表はMac側の観測時計による。

実HTTP呼出し1、再試行0。排他的なattempt記録をネットワーク前に作成し、同じdriverの再実行は拒否する。既存repoの.envをNode標準env-fileで読み、鍵の値・hash・認証headerは表示・Git保存しない。追加models/token-count/請求API呼出し0、新認証・依存導入・永続設定/権限変更0。新しいSDKや本番dispatcherは作っていない。

## 原本と応答の束縛

- Request: 83,132byte、SHA 05b669302d660337f52f7b650cf773e0010f3df22e99e5781d880adcd9ad6345。共有contextは元53字幕、対象は元index0〜5の6質問、model gpt-6-luna。元ID・本文・時計・文脈・質問・選択肢を差し替えない。
- 9/30 source: 109,376byte、SHA ad8bfc4b55b19f4c2f34d74906f3609197651bdd53cbf45643ff0211d7f81dc5。保存manifestから既存builderで作り直したbodyと元送信byteが完全一致。
- 送信しない参照判断: SHA 378fb6290fe7aee159f029de639c096d2ae2e2f2e0b6e34382c2ec0eb8834e0c。種別saved-judgment-not-ground-truth。応答後だけローカル比較に使用。
- Raw response: 1800byte、SHA 915d34f7da4ca5299e68f1dbaecfe80a13a7992663ec25ff5acca8d4ade859cb。非公開workspaceへ0600で排他的保存。原応答と正規化結果を別に保持し、順番でなくechoされたnameから照合。
- Request ID: req_c861f49f21544d2ea4611cd8d62940d6。HTTP200、完全受信、response model gpt-6-luna。

原packet、参照判断、動画/音声媒体/画像はGitへ追加せず、参照判断や媒体をOpenAIへ送っていない。送った音声関連情報は既存の文字・観測値だけで、実音声を聞いた判定ではない。

## 六件の判断と比較

name被覆6/6、重複/未知IDなし、各3択とconfidence/probabilityの範囲を既存validatorで確認。通信失敗や拒否を通常表示へ置き換えていない。今回は全6件normal（通常表示）、effect0、unresolved0、refusal0。

| 元ID末尾 | 字幕本文 | API | 保存参照 | 比較 | confidence |
|---|---|---|---|---|---|
| 000001 | あのー、マリン昨日ね、 | normal | normal | 一致 | 0.83 |
| 000002 | ノエちゃん家でドッグセラピー受けたんで。 | normal | effect | 不一致 | 0.77 |
| 000003 | ドッグセラピー、 | normal | normal | 一致 | 0.53 |
| 000004 | ノエちゃん家に | normal | normal | 一致 | 0.51 |
| 000005 | すっげー可愛い犬いて、 | normal | normal | 一致 | 0.31 |
| 000006 | マリンアレルギー出るから | normal | normal | 一致 | 0.46 |

元IDprefixはnew-material-digest-20260926-v001-instruction-instruction-。各choice確率分布は非公開validation証拠に保存。confidenceとchoice確率は別の返却項目で、今回新しい採用しきい値は設定しない。参照のnormal5件とは一致し、参照effect1件とは不一致。参照は過去の判断であり正解保証ではない。最初の6件はtuning側で、全326字幕や未見データの精度、演出の良さ、本番採用を証明しない。この試験には理由や演出種類・強調範囲の返却もなく、既存の複合回答へ組み込んでいない。

## 利用量、計算額、実請求

原usage: input_tokens 22,894 / cached_tokens 0 / cache_write_tokens 0 / output_tokens 0 / reasoning_tokens 0 / total_tokens 22,894。

2026-10-08に再確認した[公式Decisions料金](https://developers.openai.com/api/docs/guides/decisions)は入力100万tokenあたり0.10USD、出力・cacheの別料金なし。[モデル資料](https://developers.openai.com/api/docs/models/gpt-6-luna)の長文/地域加算も区別する。返却usageを入力課金量として適用した基本計算は22,894 × 0.10 / 1,000,000 = **0.0022894USD**（約0.23米セント）。地域10%加算を仮定すると0.00251834USD。今回報告inputは272K未満だが、さらに長文2倍と地域1.10倍も仮に重ねた計算は0.00503668USD。

これらは返却利用量と公開単価による計算・条件別シナリオであり、請求済み金額やAPI強制上限ではない。口座の処理地域、課金合算の解釈、請求書/管理画面との照合はしていない。実請求額はnull。送信前の1.386USDは最大context等に依存する仮定付き見積で、今回の実usageとは別に保存する。この一件のusageを根拠に、将来の質問数・別入力の費用上限を保証しない。[返却usageの公式形式](https://developers.openai.com/api/reference/resources/decisions/methods/create)も確認した。

## 検査、後始末、次担当

今回の専用driver syntax、原sourceからの送信body完全再構成、参照SHAと6件存在、重複attemptなし、raw response SHA再読、実6回答の既存validatorがpassed。製品code変更0のため過去mock10/10・runner型検査を繰り返して実API品質合格にはしない。原adapterは`e6757fb95cc70801ca03d29d71d412d50e29e8ee`で実装されたまま。

API driverはexit0。最初のsandbox内ps読取は実行不可でcheckerが失敗したが、14:47:51の自分のPIDだけの限定再読でprocess残存0を確認。再送や他者process操作は行っていない。元request、排他attempt、raw response、transport、validation、board保存/再読を監査証拠としてKEEP。今回不要な大容量一時物0、削除0・回収0。旧媒体・既存server・他session成果は保持。

公式MCPで同じ自担当#44をDoingからCheck/request waitingへ戻し、board revision115→116、item revision7→8で保存・再読した。Done45/59、文脈TODO54、他者項目と削除履歴は不変。状態は**試験終了・相談役待ち**、次担当monaがこの実結果と未評価を扱う。追加試験・本番統合・新動画は自動開始しない。正本へ残すのは今回report/session log/CURRENT_GOAL/HANDOVERの4記録pathだけで、DECISIONSや本番codeは変更しない。
