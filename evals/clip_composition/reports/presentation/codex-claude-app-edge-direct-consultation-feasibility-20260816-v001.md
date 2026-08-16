# Codex→Claude UI直接相談 実現性調査 v001

作成日: 2026-08-16  
対象: 質問(h) Claude Desktop / Claude Webを直接操作する相談経路  
性質: 読み取り調査とZEV01での試験往復1件。運用体制設計・Goal・automation・字幕工事の変更は含まない。

## 1. 結論

Claude WebをMicrosoft EdgeのCDPで操作する経路は、現物上で実現可能である。ログイン後、会話名が完全一致する`ZEV01`を一件だけ解決し、Codex名義の相談packetを送信し、固定マーカー内のstrict JSON回答を相談ID一致で受け取る一往復に成功した。

Claude DesktopをComputer Useで操作する経路は、現時点では正式経路にできない。アプリは起動中だが、画面状態の取得が60秒で二度タイムアウトし、入力欄・送信先を一意確認できなかった。画面を読めない状態での盲目的入力は行っていない。

従って第一候補は`Claude Web + Edge CDP`、Desktopは読み取り安定化後の再評価とする。ただし今回は1件の正常往復だけであり、3〜5件試験の完了やGoal接続の成立は主張しない。

## 2. 現物確認

| 対象 | 現物結果 |
|---|---|
| Claude Desktop | `/Applications/Claude.app`、bundle ID `com.anthropic.claudefordesktop`、version `1.30096.5`、起動中 |
| Desktop画面読取 | full path指定・bundle ID指定とも安定せず、full path再試行は60秒timeout |
| Microsoft Edge | `/Applications/Microsoft Edge.app`、bundle ID `com.microsoft.edgemac`、CDP port `9222`付きで起動中 |
| Edgeのinstalled version | `151.0.4129.86` |
| CDPが返したrunning version | `Edg/149.0.4022.98`。installed値と異なるため正式経路ではrunning実体を毎回記録する必要がある |
| Claude Web初期状態 | 未ログイン。kawafmmがログイン後、`https://claude.ai/new`に入力欄一件を確認 |
| ZEV01解決 | 会話名完全一致一件、固定chat IDへ遷移後も入力欄一件を確認 |
| 入力欄 | `data-testid=chat-input`、編集可能、一件 |
| 送信ボタン | `aria-label=メッセージを送信`、有効、一件 |
| 応答 | consultationId一致、strict JSON、decision `continue` |

既存のEdge CDP実装は、CDP targetの列挙、origin固定、画面内要素の実測、文字入力、送信、応答安定待ちを既に備える。ただしGemini専用のselectorや本文抽出規則はClaudeへ流用せず、Claude専用adapterとして分離すべきである。

## 3. ZEV01試験結果

### 正式に数える往復

- consultationId: `zev-consult-ui-trial-20260816-002`
- 送信元: Codexであることを冒頭に明記
- 送信先: 会話名完全一致`ZEV01`
- request: `codex-claude-direct-consultation-zev01-trial-20260816-v001-request.md`
- request SHA-256: `0ff25d8bd6ba8384d0a294cb8c1cdba07f793f339a89975f00cc48e836196d36`
- 応答抽出: BEGIN/ENDマーカーの最終一組のみ
- schema: exact 6 key
- consultationId: exact一致
- decision: `continue`
- 所要時間: 自動抽出器は送信後30秒では未完、60秒以内に安定8秒を満たして完了
- 回答: `codex-claude-direct-consultation-zev01-trial-20260816-v001-response.md`

### ZEV01指定前の試験誤送信

ユーザーのセッション名指定前に、新規Claude会話へconsultationId `zev-consult-ui-trial-20260816-001`を一件送信した。240秒時点でClaudeは応答中であり、抽出器はtimeoutとしてfail-closedした。その後、ZEV01指定を受けて監視を中止し、再送・回答採用・会話削除を行っていない。この一件はZEV01の3〜5件試験に数えない。

この観測から、timeoutを短く固定して再送する方式は危険である。timeout後もClaude側生成が継続するため、再送せず同一conversation/consultationIdを再読する状態機械が必要である。

## 4. 安定した送信packet

送信前に次を全て満たす。

1. Edgeの実行path、running version、CDP portを記録する。
2. originが`https://claude.ai`で、ログイン画面・再認証・captchaでないことを確認する。
3. 会話名からchat IDを一件だけ解決し、以後はchat IDと期待会話名の組を束縛する。
4. 入力欄一件、送信ボタン一件、入力欄が空であることを確認する。
5. packetは一問だけとし、相談ID、work-order SHA、許可範囲、停止条件、証拠、確認済み事実、推測、未確認を分離する。
6. packetにsecret、認証情報、不要な本文、無関係なfileを含めない。
7. 入力後・送信前に、入力欄から得た全文とrequest byteの一致を確認し、SHAを記録する。

今回の試験は、入力元fileを`Input.insertText`へ一度だけ渡し、相談IDと表示文字数を確認したが、送信前の全文byte再読SHAまでは取っていない。従って「送信byte SHA一致」は未証明であり、残る試験の必須追加項目である。

## 5. 安定した回答抽出

回答は次の順で受け入れる。

1. `BEGIN_ZEV_CONSULT_RESPONSE`と`END_ZEV_CONSULT_RESPONSE`の一組を、同一相談の最新assistant応答から得る。
2. 内容が8秒以上変わらないことを確認する。
3. JSONを修復せずparseする。
4. key集合、型、consultationId、decision閉語彙をexact検査する。
5. raw表示回答を先に保存し、その後にdecoded receiptを保存する。
6. 欠落、重複、ID不一致、schema不一致、timeout、UI要素不一致は`continue`に変換しない。

全文bodyからの単純な末尾検索は、過去の会話や入力例に同じmarkerがあると混同し得る。正式実装ではassistant message containerを一意に束縛し、その内側だけを読む必要がある。今回の試験は最新marker一組+consultationIdで成功したが、message ownerの厳密なDOM束縛は未実装である。

## 6. UI変更・ログインへの耐性

- selectorはClaude専用として版付き管理する。
- selector候補を順に試して「どれか一つ通れば続行」とするsilent fallbackは禁止する。
- 入力欄・送信ボタン・対象assistant messageがexact一件でなければ停止する。
- UI signatureにはrunning Edge version、origin、chat ID、入力欄属性、送信ボタン属性を含める。
- Claude UI更新やEdge更新でdescriptorが変わった場合は、期待を黙って更新せず停止する。
- ログイン、再認証、captchaはkawafmmの操作待ちとし、Codexが認証情報を入力・保存しない。
- Desktopを再評価する場合も、Computer Useの画面読取が成立してから送信を許可する。アプリ再起動やremote-debugging flag追加は今回承認されておらず実施していない。

## 7. needs-kawafmmとGoalの接続

Claude UI自体はGoalをpauseできない。Codex側がstrict receiptを読み、`needs-kawafmm`なら次を行う。

1. request、raw response、decoded receipt、現在のmilestone、費用、counterを版付き保存する。
2. production・契約・正式attempt・外部通信を追加で行わない。
3. kawafmm向け質問を表示し、そのturnを終了して入力を待つ。

現在このsessionから呼べるGoal toolには、agentが直接呼ぶ`pause`操作がない。従って「Goal pause」は、現時点では明示的なtool callでなく「Goalを完了/blockedへ誤分類せず、turn終了+通知+人間入力待ち」で実装する。製品または人間が行うpause/resumeと、agentが実装できる待機を混同しない。

強制上限の正本はGoalの自然言語状態でなく、work-orderとrunnerの永続counter ledgerに置く。相談役が`continue`を返しても、上限到達時はrunnerが外部作用前に拒否する。scheduled check-inは同じcheckoutを書き換えないread-only reporterに限定する。[OpenAIのCodex Automations説明](https://openai.com/academy/codex-automations/)でも、automationは予定時刻に同じ会話へ戻って結果を提示する用途として説明されているが、hard limitの耐改竄counterとしての保証は示されていない。

## 8. 3〜5件試験案

体制設計前の最小試験はZEV01の同一会話で行う。

| 試験 | 目的 | 期待 |
|---|---|---|
| 1 | 正常な`continue` | 今回合格 |
| 2 | 意図的な`needs-kawafmm` | receipt保存、追加作用0、turn終了、通知 |
| 3 | schema不正またはmarker欠落 | 自動修復0、fail-closed |
| 4 | timeout/長考 | 重複送信0、同一ID再読、timeoutをcontinueへ変換しない |
| 5 | hard limit到達 | Claude回答に関係なくrunner拒否 |

各回で、request SHA、UI再読SHA、chat ID、送信日時、回答開始/完了日時、raw response SHA、decoded receipt、decision、追加作用0/有を記録する。

今回成立したのは試験1だけである。残りを実行するには、字幕工事の描画・目視完了後、三者合意した試験work-orderが必要である。今回の`continue`を残り4件や体制実装の承認には使わない。

## 9. 相談役回答の扱い

相談役は第一候補を妥当と評価し、hard limit優先、証拠不足時continue禁止、fact/inference/unverified分離、並行checkout変更禁止を提案した。これらは三者設計の材料として有用である。

一方、回答に含まれる具体的な日数、停止回数、packet上限、各工事開始時のstable tag等は未裁定の提案である。現在の字幕工事には人間目視前tag禁止など別の明示規律があるため、自動採用しない。Claudeの`continue`は権限を追加せず、現在の字幕停止を解除しない。

## 10. 字幕工事との分離

字幕側は既知6境界の独立照合6/6まで成立した。その後、P/R/Fへ入る前のstaging取得で、新出力系列の親directoryが存在せず`ENOENT`停止した。原因はjob・実行設営であり、production・契約・selection・API回答の欠陥ではない。再開には別途、親directory設営と親path preflightを閉じる限定承認が必要である。

本調査は字幕production、契約、selection、成果物へ変更0件である。

## 11. 外部作用

- Claude Desktop送信: 0件
- Claude Web送信: 2件（ZEV01指定前の新規会話1件、ZEV01への正式試験1件）
- Claude API / MCP通信: 0回
- OpenAI API通信: 0回
- UI利用による追加課金: 未計測。API従量課金は0回
- Goal / automation作成: 0件
- 字幕描画: 0本
- commit / stable tag: 0件
