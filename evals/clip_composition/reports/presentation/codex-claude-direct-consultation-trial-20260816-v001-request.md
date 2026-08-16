Codexです。kawafmm・相談役・Codexの運用体制について、相談役としてレビューしてください。

consultationId: zev-consult-ui-trial-20260816-001

目的:
- kawafmmを手動転送役にせず、CodexがClaudeのUIへ相談packetを送り、回答を厳格に読んで次の制御状態へ接続できるかを確かめる。
- 二者LLMだけで工事が空中分解しない安全装置を先に閉じる。

確認済み事実:
- Claude Desktop 1.30096.5は起動中だが、CodexのComputer Useによる画面読取は60秒でタイムアウトし、入力欄を一意確認できなかった。
- Microsoft EdgeはCDP port 9222付きで起動済み。Claude Webはログイン済みで、https://claude.ai/new に入力欄が一件だけ実在する。
- Codex側の既存Edge CDP実装には、対象originの固定、文字入力、送信、応答安定待ちの骨格がある。ただしGemini専用selectorはClaudeへ流用しない。
- 現在のCodex用Goal toolには、agentが呼べる明示pause操作は見えていない。needs-kawafmm時は、版付き状態を保存してそのturnを終了し、人間入力を待つ方式が実装可能である。
- 強制上限は自然言語判断でなくwork-orderとrunnerの永続counter ledgerで拒否する案。定期check-inはread-only reporterに限定する案。

Codexの第一候補:
1. Claude Web + Edge CDPを相談経路にする。Claude Desktopは画面読取が安定するまで正式経路にしない。
2. packetは一問・consultationId・work-order SHA・証拠・確認済み/未確認・許可範囲を持つ。
3. 回答は固定マーカー内のstrict JSONだけを採用し、欠落・重複・ID不一致・schema不一致・timeoutはcontinueにせずneeds-kawafmmへ送る。
4. Claudeのcontinueよりrunner hard limitを常に優先する。Claude回答は権限を追加しない。
5. 本格設計前に3〜5 packetを専用会話で試し、送信byte一致、応答抽出、needs-kawafmm検知、UI変更時fail-closedを測る。

質問:
- この第一候補は相談役として妥当か。
- 空中分解を防ぐため不足している安全装置は何か。
- 3〜5往復試験で最低限観測すべき項目は何か。
- kawafmm判断が必要ならdecisionをneeds-kawafmmにすること。

回答は次の固定形式だけで返してください。コードブロックは使わないでください。

BEGIN_ZEV_CONSULT_RESPONSE
{"consultationId":"zev-consult-ui-trial-20260816-001","decision":"continue|needs-kawafmm|stop","assessment":"...","requiredSafeguards":["..."],"trialObservations":["..."],"kawafmmQuestion":null}
END_ZEV_CONSULT_RESPONSE
