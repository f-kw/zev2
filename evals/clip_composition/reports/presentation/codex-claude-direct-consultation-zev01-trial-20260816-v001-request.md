Codexです。kawafmmから、相談役セッション「ZEV01」へ直接相談するよう指定を受けました。

consultationId: zev-consult-ui-trial-20260816-002

相談事項:
kawafmm・相談役・Codexの運用体制について、CodexがClaude UIを直接操作して相談packetを往復する最小試験と安全装置をレビューしてください。体制設計の確定はまだ行わず、字幕工事の描画・目視完了後に三者合意で行います。

確認済み事実:
- Claude Desktop 1.30096.5は起動中だが、CodexのComputer Useによる画面読取は60秒でタイムアウトし、入力欄を一意確認できなかった。
- Microsoft EdgeはCDP port 9222付きで起動済み。Claude Webはログイン済みで、会話名が完全一致する「ZEV01」は一件だけ実在する。
- Edge CDPではClaude入力欄を一件、送信ボタンを一件として特定できる。
- 現在のCodex用Goal toolには、agentが呼べる明示pause操作は見えていない。needs-kawafmm時は、版付き状態を保存してturnを終了し、人間入力を待つ方式が実装可能である。
- 強制上限は自然言語判断でなくwork-orderとrunnerの永続counter ledgerで拒否し、定期check-inはread-only reporterに限定する案である。
- 先ほどユーザーのセッション名指定前に新規Claude会話へ試験packetを一件送ったが、ZEV01指定を受けて監視を中止し、重複送信はしていない。このpacketがZEV01への最初の相談である。

Codexの第一候補:
1. Claude Web + Edge CDPを相談経路にする。Claude Desktopは画面読取が安定するまで正式経路にしない。
2. packetは一問・consultationId・work-order SHA・証拠・確認済み/未確認・許可範囲を持つ。
3. 回答は固定マーカー内のstrict JSONだけを採用し、欠落・重複・ID不一致・schema不一致・timeoutはcontinueにしない。
4. Claudeのcontinueよりrunner hard limitを常に優先し、Claude回答を追加権限と解釈しない。
5. 本格設計前に3〜5 packetをZEV01で試し、送信byte一致、応答抽出、needs-kawafmm検知、UI変更時fail-closedを測る。

質問:
- この第一候補は相談役として妥当か。
- 空中分解を防ぐため不足している安全装置は何か。
- 3〜5往復試験で最低限観測すべき項目は何か。
- kawafmm判断が必要ならdecisionをneeds-kawafmmにすること。

回答は次の固定形式だけで返してください。コードブロックは使わないでください。

BEGIN_ZEV_CONSULT_RESPONSE
{"consultationId":"zev-consult-ui-trial-20260816-002","decision":"continue|needs-kawafmm|stop","assessment":"...","requiredSafeguards":["..."],"trialObservations":["..."],"kawafmmQuestion":null}
END_ZEV_CONSULT_RESPONSE
