# HANDOVER_INDEX — ZEVの読む順序と一次資料

更新：2026-10-11 14:43:46 JST / revision：handover-index-20261011-v158。進捗の本文は [CURRENT_GOAL](CURRENT_GOAL.md) に置く。

## 復元する順序

1. [固定入口 ZEV_START_HERE](ZEV_START_HERE.md)に従い、f-kw/zev2 mainのSHAを確認し、同じSHAの資料を読む。
2. [AGENTS](../AGENTS.md)で役割・指示/承認経路・Git担当・報告・作業サイクルを確認する。
3. [CURRENT_GOAL](CURRENT_GOAL.md)で全体目的、三つのライン、現在の到達点・残件・次担当を確認する。
4. 下表から担当対象の契約と最新log/reportを読む。以前の「未承認」「待機」を現在の指示に戻さず、最新の相談役経由の本人指示と照合する。

## 方針・契約・全体計画

| 一次資料 | 読む目的 |
| --- | --- |
| [上位方針](../相談役/方針/2026-09-06_ZEV_方針整理.md)・[architecture](architecture/ZEV_AGENT_SKILL_ARCHITECTURE_v001.md) | 製品の目的と責務。参照だけで新工事を開始しない。 |
| [7工程フロー契約](zev2-flow-contract.md)・[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md) | 正式入出力、人間承認、作り直し、相談役監査の境界。 |
| [本人採用No.64の全体計画PDF](task-pdf:zev-completion-plan) | 初版の完成順序と受入欄。採用は製品完成ではない。同じPDFを進捗で更新する。 |
| [既存開発計画v018](../相談役/方針/ZEV_開発計画.md) | 旧実績・残件の背景。本文は10/1基準で、現在の順序/待機はNo.64とCURRENT_GOALを優先する。今回全面改訂していない。 |
| [Digest正式受渡し判断](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md)・[計画](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_PLAN_20261003_v001.md) | 製造・元参照・品質確認の既承認境界。旧一計画の許可を今回の素材へ付け替えない。 |

## 担当対象の現物・結果

| 対象 | report・作業ログ |
| --- | --- |
| 制作No.61 | [今回の新素材/修正後STT log](work-logs/2026-10/2026-10-11T1109_Codex-SSD_No61-current-input-preparation_cbee9353.md)、[J16段階接続と範囲](reports/openai-decisions-j16-integration-20261008/next-integration-scope-v001.md)、[制作時間台帳](reports/digest-new-material-SJvP9jhEdyI-20261004/production-time-and-test-ledger-v001.md)・[機械記録](reports/digest-new-material-SJvP9jhEdyI-20261004/production-time-and-test-ledger-v001.json)。台帳のnewMaterialRunsで今回入力を区別する。 |
| UI No.68 | [初期受渡し](reports/zev-ui-b-implementation-20261011/handoff.md)、[制作準備登録](reports/zev-ui-b-implementation-20261011/preparation-handoff.md)、[人間の場面追加要求](reports/zev-ui-b-implementation-20261011/scene-addition.md)、[拒否表示修正](reports/zev-ui-b-implementation-20261011/rejection-checks.md)、[新版の正式データ接続案](reports/zev-ui-b-implementation-20261011/formal-revision-connection-proposal.md)・[その調査log](work-logs/2026-10/2026-10-11T0533_Codex-UI_No68-formal-revision-proposal_46de9c4f.md)。提案・人工検証・実素材接続を分ける。 |
| 全体No.64→70 | 上記全体計画PDFの受入欄と、既存board No.64/69/70。No.69は準備結果、No.70は同素材/依頼/版を通す実確認。最新の開始条件はCURRENT_GOALで読む。 |
| 固定素材の二系統第一完成 | [技術・人間品質の確定記録](reports/two-e2e-first-completion-next-step-20260908-v001.md)。新素材や一般製品の完成証明へ流用しない。 |

## 人間回答と保存・終了の規則

- [人間レビュー台帳](HUMAN_REVIEW_PENDING.md)・[回答蓄積policy](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)：既回答、残る好み/品質判断、技術結果との区別。全件採点を再要求しない。
- [9/29字幕回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md)：分割・可読性についての原回答。旧素材の採用を新素材の品質承認へ流用しない。
- [cleanup policy](policies/CODEX_WORK_CYCLE_CLEANUP_POLICY_v001.md)・[session log policy](policies/CODEX_SESSION_WORK_LOG_POLICY_v001.md)：証拠固定、今回不要物だけの整理、自分のprocess終了、月別log、正本/Git、相談役報告。

## 以前の経緯を調べるとき

[圧縮前HANDOVER_INDEX固定版](https://github.com/f-kw/zev2/blob/fcc79b9cc5ca10aaae0ab2faf5981bd1f0c81706/docs/HANDOVER_INDEX.md)と[同CURRENT_GOAL固定版](https://github.com/f-kw/zev2/blob/fcc79b9cc5ca10aaae0ab2faf5981bd1f0c81706/docs/CURRENT_GOAL.md)から辿る。別archiveや追加正本は作らず、元report・work-log・AGENTS・DECISIONS・承認記録を保持する。今回の短文化と最新の未保存経過はNo.61作業ログにも残す。
