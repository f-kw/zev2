# Codex Goal 強制上限・定期チェックイン 運用体制調査 v001

作成日: 2026-08-16  
性質: 運用体制質問(g)への事実回答。体制設計の確定・automation作成・字幕工事変更は含まない。

## Errata 2026-08-16

本文中の「Goalはpause/resumeできる」「Goalがpauseする」は、製品または人間によるGoal状態操作と、agentから呼べる操作を区別できていなかった。現在このsessionでagentが呼べるGoal toolには明示的な`pause`操作がなく、`complete`または所定条件後の`blocked`だけである。`needs-kawafmm`の実装は、版付き状態保存→追加作用0→kawafmm通知→turn終了とし、Goalを完了/blockedへ誤分類しない。runner hard limitの設計結論は不変である。

## 1. 結論

判断に依存しない強制停止は、Goalの文章上の約束やscheduled taskではなく、版付きwork-orderとrunnerの永続counter ledgerで実装するのが安全である。Goalはrunnerが返した上限到達を受けてpauseし、kawafmmへ通知する制御面を担当する。scheduled taskまたはheartbeatは、ledgerを定期的に読み現在地を届ける報告面に限定する。

この三層にすると、相談役が`continue`と返してもrunnerが上限到達後の操作を拒否する。Goalや通知が故障しても、費用・正式attempt・追補発行をrunner側で止められる。

## 2. 確認済み事実

### Goal

- Goalは同じtask内でpause/resumeでき、入力が必要な状態を人間へ通知できる。
- Goalはsandbox・approval・外部費用権限を拡大しない。
- 現行toolでは、一つのtaskに未完了Goalは一つである。
- Goalのtoken budgetはモデルの作業量であり、追補件数、停止回数、経過日数、外部API費用のhard capではない。

### scheduled task / heartbeat

- Codex desktopには、予定時刻・反復間隔でtaskを再開するscheduled task/heartbeatがある。
- scheduled taskも既存sandbox・approvalの内側で動く。人間承認が必要な操作を勝手に承認する仕組みではない。
- 現在のこのtaskにはautomationを作成していない。

### 現在の実行基盤

- work-orderに固定された件数・価格・attempt ID・出力rootをrunnerが検査し、上限超過前に停止する既存実例がある。
- no-replace公開、版付きattempt、費用のnanoUSD記録、価格snapshot、有効期限、再試行0の機械検査を既に使っている。
- 従って、外部判断に左右されない上限の正本をrunnerへ置くための基礎部品は既存方式の延長で実装可能である。

## 3. 推奨する実現案

### 層1: work-order

一工事の開始時に、少なくとも次を固定値として持つ。

- work IDと承認済み目的。
- 許可pathと禁止操作。
- 追補発行上限。
- 正式停止回数上限。
- 開始日時と最大経過日数。
- 外部API累計費用上限。
- 正式attempt上限と、再発行を数える条件。
- 到達時の唯一の次状態`needs-kawafmm`。
- 完了までの版付きmilestone一覧。

各counterの数え方は設計時に曖昧さを残さず定義する必要がある。たとえば「追補」は起草数・承認数・formal jobへ束縛した数のどれを数えるか、「停止」は正式attemptだけか実装前監査も含むかを固定する。これは未確定の設計事項であり、今回の回答では値を決めない。

### 層2: runnerのcounter ledger

runnerを強制停止の正本にする。

1. work-orderのfile SHAを束縛する。
2. 追補発行、正式attempt開始、正式停止、API送信、費用確定ごとに版付きeventをno-replaceで記録する。
3. 各外部作用・正式attemptの直前にledger全件を再読し、counterと日時を再計算する。
4. 上限へ到達したら、操作前に`hard-limit-reached`の構造化recordを保存し、`needs-kawafmm`で拒否する。
5. 相談役の回答によりcounterを減らしたり上限を越えたりしない。上限変更にはkawafmmが承認した新版work-orderを要求する。

費用は浮動小数でなく既存どおり整数nanoUSDを使う。経過日数はwork-orderの固定開始時刻と現在UTCから計算し、pause期間を除外するか否かもwork-orderで固定する。独自係数による進捗率は使わない。

### 層3: Goalのpause・通知

Goalはrunnerの拒否結果を受け取ったら、変更・再実行・相談役への追加質問を行わずpauseする。kawafmmへは次だけを通知する。

- 到達した上限の種類。
- 現在値 / 上限値。
- 最後に合格したmilestoneと証拠。
- 未実施milestone。
- 外部費用とAPI回数。
- 再開に新版work-orderが必要であること。

Goal内の自然言語判断だけでcounterを持たない。Goalの会話状態が失われてもrunnerが止める構造にする。

### 層4: 定期チェックイン

scheduled task/heartbeatはrunner ledgerとmilestone一覧を読み、判断の有無に関係なく定期報告する。報告内容は次で固定できる。

- 現在のgate/milestone。
- 合格済みと未実施の名前付き工程。
- 追補・停止・正式attempt・API回数・費用の現在値 / 上限。
- 前回報告以後の新証拠。
- `continue / needs-consultation / needs-kawafmm / completed`の機械状態。

「目的までの距離」は主観的な百分率でなく、固定milestoneの残り一覧で表す。例: `selection合格済み / P・R・F・QC・目視が未実施`。判断不要の定期報告と、event発生時の即時報告を併用するのがよい。

## 4. Goal・scheduled taskだけでは不足する理由

- Goalは自然言語の実行主体であり、外部API費用や追補数の耐改竄ledgerではない。
- Goalのpauseは制御には使えるが、pause命令へ到達する前の外部作用を単独では防げない。
- scheduled taskはhost/appの可用性や実行時刻の遅延を受け得るため、hard realtimeの安全弁ではない。
- scheduled taskが報告に失敗してもrunnerの上限は効く必要がある。
- scheduled taskへ書込・正式attempt権限を持たせると、main Goalとの同時実行競合が生じる。読み取り専用reporterに限定する方が安全である。

## 5. 制約と未確認

### 確認済み制約

- Goalのpause/notifyは、runner側counterを自動生成しない。
- scheduled taskは元のwork-orderの権限を広げない。
- 並行taskが同じcheckoutへ書くと競合する。定期check-inはread-onlyにすべきである。

### 未確認

- Goalを人間がpauseした状態でも、同じtaskに付けたscheduled taskが確実に発火し通知だけを行うかは、この環境でまだ実測していない。
- Macの電源断・sleep・Codex app終了中に予定時刻を越えた場合の遅延・catch-up挙動は未実測である。
- system notificationがOS設定で抑止された場合の二次通知先は未設計である。
- Goal内部状態の永続形式は公開されていないため、runner ledgerの代用にはできない。

これらは、最小形の手動相談packet 3〜5件を試す段階で、read-only heartbeatを一つだけ試験し、通知遅延とpause中挙動を実測してから確定するのがよい。

## 6. 空中分解を防ぐ安全装置

1. 相談役の`continue`よりrunner hard limitを常に優先する。
2. 同じ原因類型の停止回数上限と、工事全体の停止回数上限を別counterにする。
3. 追補は目的・完了条件を変えないものだけGoal内で数え、目的変更は即`needs-kawafmm`にする。
4. 相談packetは一問だけとし、証拠SHA、確認済み事実、未確認、推測を分離する。
5. 一定間隔ごとに、元の目的と現状のmilestoneを並べて報告する。
6. 上限到達後は相談役へ追加質問を送らない。kawafmmの新版work-orderだけが再開条件である。
7. 定期reporterはコード・契約・成果物を変更しない。

## 7. 最小導入順

1. まず相談packetの手動往復を3〜5件試す。
2. 同時にwork-orderへ仮のcounter定義を記載するが、MCPやautomationはまだ作らない。
3. packetの質・判断削減効果・誤判断率を人間が確認する。
4. 次にrunner counter ledgerを小工事として設計・検査する。
5. hard limit成立後に、read-only scheduled check-inを追加する。
6. 最後に同じpacket schemaをClaude相談専用MCPへ置換する。

この順なら、Claude直結やautomationを先に作って閉包不足を高速化することを避けられる。

## 8. 根拠

- [Long-running work / Goal mode](https://learn.chatgpt.com/docs/long-running-work)
- [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)
- [Permissions](https://learn.chatgpt.com/docs/permissions)
- [Scheduled tasks](https://learn.chatgpt.com/docs/automations)
- 先行調査: `codex-goal-claude-consultation-operating-model-facts-20260816-v001.md`

## 9. この回答で行っていないこと

- Goal作成: 0件
- automation作成: 0件
- Claude接続: 0件
- API通信: 0回
- 体制設計の確定: 0件
- 字幕工事のproduction/契約変更: 0件
