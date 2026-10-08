# Codex-SSD — OpenAI J16の有料試験条件を送信なしで確認

- session: Codex-SSD / existing Mac maker
- instruction: mona thread 01a0ff1f-1ad3-70b5-bb7f-d0f3988a10e6
- closedAt: 2026-10-08T07:21:52.330006+00:00
- base/implementation HEAD: 574fc49bf658ad43aaf5bae35227dd1ffa44950c
- scope: 費用・token算定・入力制限の確認と本人確認文の具体化。実API/新認証なし。
- status: preparation complete; conditional budget proposal awaiting mona

親がローカル実装結果を受領し、53字幕文脈/6質問/83,132byte/一回/再試行なしの費用・制限を詰めるよう個別指示した。公式Decisionsガイド/reference、token counting、Lunaモデルと料金、公式SDK/tokenizerを確認。新API送信・認証・依存導入0。

16:17:18 JSTの原request再読でSHA05b66930.../83,132byte一致。共通文脈65,899文字/71,677byte、質問文字列6,354byte、最大質問231/名前64/説明50文字、各3択。公開の質問フィールド制限内。裸文字列入力/質問配列の専用上限、質問/choice単位の課金式は資料で未確認。token count公式endpointはResponses用、手元の対応tokenizerなし、公式mappingにもgpt-6なし。正確なmodel tokenは未測定、byte由来の参考上側値を実測/完全上限にしない。

専用入力0.10USD/Mと、モデル最大context1,050,000を6質問それぞれに充て、長文2倍・地域1.10倍も取り込んだ条件付き見積1.386USD。本人へ示す予算案1.50USDは未承認でprovider側の強制limitではない。上限内と説明できる条件が揃わなければ送信しない。既存の一般/旧Jev費用上限は変更0。

文脈を縮める必要が確認できず原候補KEEP。新質問/新計画/本番接続/動画/STT/精度採用0。本人へ一件で示せる送信データ・OpenAI宛・6質問・一回/再試行0・予算と未確認・終了条件の下書きを[報告](../../reports/openai-decisions-j16-integration-20261008/paid-trial-preparation-v001.md)へ保存した。本人へ送った確認文ではない。

workspaceの測定JSON/script/reportと83KBの私有packetをKEEP。新大容量一時物/不要媒体0、回収0。測定process exit0、他者process/変更/鍵/設定へ作用0。製品2pathと前工程Done59は保持。コードを変更しておらずAPI mock/型検査を再実行する必要はなく、前工程10件/typecheck合格と実API未評価を区別する。

記録は今回の4pathだけをmainへ通常checkpoint commit/pushし、最終Git値は報告時に確定する。DECISIONS.md・Goalの目的・work-order・契約・正式採用を変更しない。後続Check44へ費用案を保存し、Done45/59、文脈TODO54、他者項目と削除履歴を保持。次担当monaが予算案と資料の未確認部分を扱う。
