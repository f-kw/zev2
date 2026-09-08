# ChatGPT相談役 — 記憶・文脈を失った場合の復旧手順

目的：新しいChatGPTセッション、モデル変更、長期会話の圧縮等でZEVの文脈が失われても、会話記憶を推測で補わず、現行正本から「ZEV進行管理２」の判断地点を復元する。

## 最重要原則

- 古い会話記憶やMemoryだけでrepositoryの現在状態を確定しない。
- repositoryを正本とする。
- Google DriveはChatGPTが直接参照するための選択的ミラー／復元入口として使う。
- Driveとrepositoryが食い違う場合は、基準commitとSHAを確認し、repository側の現行正本を優先する。食い違いを推測で統合しない。
- CURRENT_GOALや判断記録を読んだだけで、新工事の着工承認があるとは扱わない。
- Codex–ChatGPT監査プロトコルとAGENTS.mdの権限境界を維持する。

## 復旧手順（短縮版）

1. Google Driveの `ZEV進行管理２` 復元ミラーで `00_ここから読む.md` を開く。
2. `docs/CURRENT_GOAL.md` のミラーを読む。
3. CURRENT_GOALが指定する最新の判断記録を読む。
4. 必要に応じて `AGENTS.md`、`docs/CODEX_CHATGPT_AUDIT_PROTOCOL.md`、`docs/architecture/ZEV_AGENT_SKILL_ARCHITECTURE_v001.md` を読む。
5. Drive側の基準commitと、GitHub `main` の現HEADを比較する。
6. GitHub側が先なら、CURRENT_GOALと最新判断記録をGitHubから再取得する。Drive側だけが先に見える場合は、正本化済みか確認し、推測で採用しない。
7. 「現在地」「確定判断」「未決事項」「最新の明示的な着工指示」を4項目に分けて復元する。
8. 直前の工事が進行中なら、最新のCodex報告・checkpoint commitを確認する。
9. HUMAN_DECISION待ちがある場合は、ユーザーが「確認した」と返したかを確認する。未確認なら流さず再提示する。
10. 復元完了後、次の作業を勝手に開始せず、最新の承認済みwork-order／指示番号のscopeに従う。

## 新セッションで最初に確認する内容

### A. 現在地

- 最終目的は何か。
- ダイジェスト／遠方接続等、何が第一完成済みか。
- 現在の主線は何か。
- 何を意図的に止めているか。

### B. 判断記録

CURRENT_GOALから参照される最新decision recordを読む。

2026-09-09時点の重要記録：

`相談役/方針/2026-09-09_ZEV_plan判断記録_v002.md`

この記録では、Plannerは統合役、candidate-selectionは個別採否判断役と分離し、Planner本体より先に人手の「薄いplan」を実動画で検証する方針を保存している。

当該ホラー素材で採用された制作意図：

> ぺこらが本気で怖がって絶叫しているところと、怖がっている姿が可愛く見えるところを中心に見せる。

ただし、これはZEV全体の固定目的でも、A/B/Cの採否結果でもない。

### C. 権限・監査

必ず以下を区別する。

- `GPT_DECISION`：既存承認範囲内で相談役が判断可能。
- `HUMAN_DECISION`：kawafmm専決。
- `AUDIT_ONLY`：判断不要の監査。

新工事の着工、Goal／契約変更、費用、新素材、公開等はAGENTS.mdの現行規則を確認する。

### D. 実装状態

設計文書だけで実装済みと推測しない。

Codexの最新報告には最低限、branch、commit SHA、対象diff、test結果、現在のdecision requestがある。必要ならGitHub現物を確認する。

## Drive復元ミラー

2026-09-09に作成した復元folder：

`ZEV復元用_20260909_plan判断記録_v002`

最初に読むファイル：

`00_ここから読む.md`

同folderには少なくとも、

- `CURRENT_GOAL.md`
- `2026-09-09_ZEV_plan判断記録_v002.md`
- `MANIFEST.json`

を置く。

Driveは常時自動同期ではない。MANIFESTの基準commitを必ず確認する。

## repository側の読む順番

原則：

1. `docs/CURRENT_GOAL.md`
2. CURRENT_GOALが指定する最新判断記録
3. `AGENTS.md`
4. `docs/CODEX_CHATGPT_AUDIT_PROTOCOL.md`
5. 必要な場合のみ `docs/architecture/ZEV_AGENT_SKILL_ARCHITECTURE_v001.md`
6. 進行中工事のreport／checkpoint

GOAL_DEFINITIONは履歴上重要だが、CURRENT_GOALに記された適用関係を確認せず最新上位目標として扱わない。

## 復旧時にやってはいけないこと

- 過去会話だけから最新HEAD、保有する正式成果物、承認状態を断定する。
- 古いPhase番号を機械的に再開する。
- Driveの古いsnapshotを現行repositoryより優先する。
- 設計判断を着工承認と読み替える。
- 「たぶん前回こうだった」で欠落を埋める。
- Codexの未commitローカル作業を無視してforce push/resetする。
- HUMAN_DECISIONの回答を推測する。
- 復旧のためにrepository全体を無差別に読み、相談役セッションを重くする。

## 復旧完了時の短い自己確認

次の5問に根拠付きで答えられれば復旧完了とする。

1. ZEVの最終目的は何か。
2. 現在の主線と直前の確定判断は何か。
3. 次に実行中／実行予定の指示番号とscopeは何か。
4. 何が未決で、誰が判断するのか。
5. 参照したrepository commit／Drive基準commitは何か。

答えられない項目があれば、ユーザーへ推測で説明する前に正本を追加確認する。

## 運用上の位置付け

この文書は「復旧方法」の正本であり、製品architectureや新工事の承認を変更しない。

CURRENT_GOALと最新判断記録が内容の正本。この文書は、それらへ安全に到達するための手順書である。
