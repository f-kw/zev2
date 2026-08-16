# Codex Goal・Claude相談経路 運用体制調査 v001

作成日: 2026-08-16  
性質: 読み取り専用の事実調査。字幕工事の契約・実装には触れない。

## 1. 要約

工事単位のGoalへ移し、Codexが必要時だけ相談役へ問い合わせ、相談役が人間判断を要求した場合だけkawafmmへ戻す体制は実現可能である。ただし、現在のCodex環境にはClaude/Anthropicへ直接問い合わせるtoolまたはMCP接続がない。従って完全な直結には、Claude APIを包むMCP server等を別途設定する必要がある。

現在すぐに導入できる軽量形は、Codexが証拠・質問・選択肢・推奨・必要判断者を固定schemaの「相談packet」として出し、kawafmmは内容を判断せずClaudeへ貼り、Claudeの回答packetだけを戻す方式である。これなら橋渡し操作は残るが、kawafmmの中間判断は不要になる。

## 2. (a) Goalモード

### 確認済み事実

- ChatGPT desktop、Codex CLI、IDE extensionでは`/goal`で開始する。
- goal本文が最初の指示と完了条件を兼ねる。成果、制約、検証条件を含めるのが公式推奨である。
- desktopの進捗行から一時停止、再開、編集、clearができる。実行中も同じタスクへ追記・方向修正・状態確認を送れる。
- Goal開始は権限拡大ではない。既存sandboxとapproval policyを維持し、判断または承認が必要な時は停止する。
- Goalはタスク単位で保持される。独立作業は別タスクで並行できる。複数タスクが同じfileを書かないようにし、並行コード作業にはworktreeが推奨される。
- 現在の内部tool契約では、一つのタスクに未完了Goalを一つだけ持てる。未完了Goalがある状態で別Goalを開始できない。状態取得は進捗・経過時間・使用tokenを返す。完了は実際に目的達成した時だけ、blockedは同じ阻害条件が複数turn継続して本当に進めなくなった時だけ付ける。
- 現在のこのタスクにはGoalは設定されていないことを実測した。

### 未確認

- Mac再起動、アプリ強制終了、別hostへの移動をまたいだ未完了Goalの内部状態が、全surface・全versionでどこまで同一に復元されるかは今回のローカル実測をしていない。公式資料は「同じタスクでpause/resumeし、hours or days続ける」ことを保証範囲として説明している。
- Goalの内部checkpoint fileや保存形式は公式資料に公開されておらず、今回も直接検査していない。

### 実務上の単位

Goalは「字幕品質v002を人間確認ページまで閉じる」のような工事単位にし、各停止をGoal終了にしない。固定停止条件に該当しない検査設営・fixture・path配線の限定修正はGoal内で扱い、契約意味・費用枠・外部公開・破壊操作だけを判断点として外へ出す形が合う。

## 3. (b) 相談役Claudeへの質問経路

### 現在の環境で確認済みの事実

- このセッションの利用可能toolを現物照合した結果、`claude`または`anthropic`を名前・説明に持つtoolは0件である。
- 現行の個人設定にあるローカルMCPは`node_repl`と`computer-use`だけで、Claude接続はない。
- project固有の`.codex/config.toml`は存在しない。
- CodexはSTDIOまたはStreamable HTTPのMCP serverを設定できる。MCPごと・toolごとにapproval mode、timeout、allow/denyを設定できる。設定後はdesktop/CLI/IDEで共有される。

### 直結案

Claude APIを呼ぶ小さなMCP serverを用意し、相談専用toolを一つだけ公開する方式が最も閉じやすい。必要なのはAnthropic側のAPI credential、利用model、費用上限、送信可能な情報範囲、保存規律、timeout、回答schema、再試行規律である。API料金はAnthropic側の従量課金となる。具体的な現行価格・model可用性は今回調査していないため未確認である。

Web版ClaudeをEdgeで自動操作する方式も技術的候補だが、現在は専用skill・専用tool・ログイン状態の実測がなく、UI変更とsession状態へ依存する。恒久相談経路の第一候補にはしない。

### 手動転送を軽くする案

Claude直結前は、Codexが次の固定packetだけを出す。

1. 工事IDと現在のGoal。
2. 読み取り済み正本と証拠path。
3. 確認済み事実、未確認、推測の分離。
4. 一つの質問。
5. 選択肢、各影響、Codex推奨。
6. `needsKawafmm`の判定をClaudeへ要求。
7. Claudeが許可できる次の行動と、kawafmmにしか決められない項目。

kawafmmはpacketをClaudeへ貼り、回答をそのままCodexへ戻すだけにできる。回答には相談packet IDと証拠SHAを返させ、別案件の回答混入を拒否する。

## 4. (c) kawafmm回答待ちで止まる仕組み

### 確認済み事実

- Goalは判断が必要な時にpauseできる。desktopのsystem notificationで「入力が必要」「review可能」を通知できる。
- Codexは同じタスクの最終応答で、必要判断と選択肢を提示して停止できる。
- 予定時刻または間隔で同じタスクへ戻るheartbeat/scheduled taskの仕組みもある。ただし、人間判断を待つだけならpollingは不要で、Goalのpauseと通知の方が単純である。

### 推奨する機械条件

Claudeの回答schemaに次を固定する。

```json
{
  "consultationId": "...",
  "decision": "continue|stop|needs-kawafmm",
  "reasonCodes": ["..."],
  "allowedActions": ["..."],
  "kawafmmQuestion": null
}
```

`decision=needs-kawafmm`、回答schema不正、証拠SHA不一致、許可行動が現在Goalの範囲外、のいずれかでCodexは何も変更せずpauseし、kawafmmへ通知する。Claudeの沈黙やtimeoutを承認とみなさない。

### 未確認

- Claude MCPが長時間応答待ちを保持できるか、timeout後にCodex Goalをどの状態へ戻すかは、MCP実装前なので未確認である。設計時に「一回のtool callで待つ」より「request IDを保存し、後続pollまたはcallbackで取得する」方式を比較する必要がある。

## 5. (d) 永続規律の置き場

### 確認済み事実

- `AGENTS.md`はCodexが作業開始前に自動で読む公式の永続instructionsである。global、repository root、現在directoryまでを順に読み、近い場所の指示が後勝ちになる。探索はrun開始時に一回行われる。
- このrepositoryにはrootの`AGENTS.md`が実在し、このタスクでも読み込まれている。
- globalにも`~/.codex/AGENTS.md`が実在する。
- `docs/HANDOVER.md`は実在するが、`HANDOVER.md`という名前自体には自動読取保証がない。現在はroot `AGENTS.md`がHANDOVERを必読にしていないため、毎回必読を保証したいならAGENTSから明示参照する必要がある。
- `DECISIONS.md`はroot `AGENTS.md`の上位指示によって作業前必読になっている。このタスクでも適用されている。
- Goalも同じタスク・workspace・sandboxで動くため、run開始時のAGENTS chainの適用対象になる。

### 推奨配置

- `AGENTS.md`: 例外なく守る短い規律、consultationの発火条件、費用・破壊操作・公開の人間専有判断。
- `docs/HANDOVER.md`: 現在地、理論、長い背景、復旧読順。
- `DECISIONS.md`: 版付き裁定と実測事実。
- 新規の版付きwork-order: 一つのGoalの範囲、許可修正類型、attempt上限、停止条件、外部作用上限。

HANDOVERやDECISIONSを自動探索対象の代用にせず、AGENTSから読み順を明示するのが安全である。

## 6. (e) 費用・API通信・sandbox・native

### 確認済み事実

- Codexのsandboxとapprovalは別の制御である。sandboxは技術的に触れられる範囲、approvalは境界を越える時に誰が許可するかを決める。
- 現在の個人設定は`approval_policy = on-request`、`sandbox_mode = workspace-write`である。通常はworkspace内だけ書込可能、networkは既定で無効である。
- Goalを開始してもsandboxもapprovalも広がらない。自動approval reviewもsandbox境界を広げない。
- native実行やnetworkが必要なcommandは、現在のworkspace境界外の権限または個別承認を要する。
- Goalのtoken budgetはモデル作業量の制約であり、外部APIのUS dollar上限ではない。外部費用はjob/runner側で、回数、model、token事前計測、価格snapshot、有効期限、最大nanoUSD、再試行0を機械検査する必要がある。

### 推奨安全弁

- Claude相談MCPはread-only一toolに限定し、filesystem書込・shell・汎用HTTPを渡さない。
- networkはClaude MCPの接続先だけを許す。可能ならdomain allowlistを使う。
- API credentialは環境変数から渡し、packet・TAP・stderr・Goal本文へ値を保存しない。
- 一工事の相談回数、各request最大token、累計US$、timeout、再試行回数をwork-orderで固定する。
- Codexは費用投影を送信前に記録し、上限超過または価格snapshot期限外ならClaudeへ送らずkawafmmへ戻す。
- productionの正式描画などnative条件が必要な工程だけを固定実行環境へ出し、設計・schema・SHA・fixtureの読み取りやpure検査はworkspace sandbox内に留める。

### 未確認

- Anthropic API側でrequest単位のhard spend capを設定できるか、利用組織のbudget機能をどこまで強制できるかは未調査である。Codex側runnerの送信前上限だけでなく、provider側budgetも別途照合すべきである。

## 7. (f) Codex側から見た懸念と削減可能な往復

### 懸念

1. 相談役を自動化しても、相談役が実現物を読まず過去文面だけで判断すると、現在と同じ閉包不足が速く回るだけになる。相談packetには現物SHA・実在入口・actual引数・失敗証拠を必須にする。
2. Claudeの裁定を「追加権限」と解釈してはならない。元のwork-orderを広げる判断、費用増、契約意味変更、破壊操作、公開・tagはkawafmm専有のままにする。
3. 二つのLLMが互いの推測を事実として引用する循環を防ぐ。事実はfile/tool観測、推測は推測、未確認は未確認として固定fieldで分ける。
4. 同じcheckoutを別Goalが並行変更しない。独立Goalはworktreeを分ける。
5. 「相談役が回答しない」をcontinueへ変換しない。timeoutは停止である。

### 工事単位へまとめられる承認

次は、契約意味と外部作用を変えないこと、変更path、attempt上限、停止条件がwork-orderに固定されていれば、停止一件ごとの承認を減らせる。

- test/fixtureの返却shape、path連結、proof会計、TAP外側保存の訂正。
- 既存strict decoder・validatorへ正しく接続する配線修正。
- job版を進めた際の従属binding・専用directoryの再束縛。
- 既存pure入口を使うpreflightの追加・訂正。
- 同一契約内での未使用attempt/rootの再発行。

一方、次は引き続きkawafmmまたは明示的な契約裁定へ戻すべきである。

- 意味/表現の責務境界、schema意味、status/code集合、受入基準の変更。
- provider、model、prompt本文、素材、safety設定、費用上限の変更。
- 新path上限超過、新外部tool、新依存、後方互換、fallback。
- 正式成果物の削除・上書き、commit、stable tag、公開。
- 人間目視品質に直結する表示・タイミング・文言。

## 8. 推奨する三者体制の最小形

1. kawafmmが工事単位のwork-orderを一度承認する。
2. CodexがGoalを開始し、現物調査・実装・検査を進める。
3. 既定の相談条件に当たった時だけ、Codexが固定packetをClaudeへ送る。
4. Claudeが`continue`なら、許可行動がwork-order内であることをCodexが再検査して続行する。
5. Claudeが`needs-kawafmm`、schema不正、timeout、scope外ならGoalをpauseし、kawafmmへ一問だけ通知する。
6. 各attempt後に証拠を版付き保存し、Goal完了時に全停止・修正履歴を一括報告する。

最初はClaude直結を作らず、相談packetの手動往復を3〜5件試すのが安全である。packetの質と判断削減効果が確認できた後、同じschemaをMCP toolへ置き換えれば、運用意味を変えずに橋渡しだけを消せる。

## 9. 根拠

### 公式資料

- [Long-running work / Goal mode](https://learn.chatgpt.com/docs/long-running-work)
- [Prompting](https://learn.chatgpt.com/docs/prompting)
- [Projects and chats](https://learn.chatgpt.com/docs/projects)
- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Model Context Protocol](https://learn.chatgpt.com/docs/extend/mcp)
- [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)
- [Permissions](https://learn.chatgpt.com/docs/permissions)
- [Scheduled tasks](https://learn.chatgpt.com/docs/automations)

### ローカル現物

- `/Users/kawafmm/workspace/zev2/AGENTS.md`
- `/Users/kawafmm/workspace/zev2/docs/HANDOVER.md`
- `/Users/kawafmm/workspace/zev2/DECISIONS.md`
- `/Users/kawafmm/.codex/AGENTS.md`
- `/Users/kawafmm/.codex/config.toml`

設定fileのcredential値は本調査へ出力していない。
