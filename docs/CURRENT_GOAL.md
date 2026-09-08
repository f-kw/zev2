# CURRENT_GOAL — 目的ファイル

現在地更新：2026-09-09。「ZEV進行管理２」のkawafmmによる判断記録の保存・repository／Drive連携の実行指示に基づく文書更新。

目的の記載や本ファイルの更新だけで、新しい工事の着工・再開を許可しない。権限と監査は `AGENTS.md`、`docs/CODEX_CHATGPT_AUDIT_PROTOCOL.md`、最新の明示的な個別指示に従う。

## 1. 今の目的

**見たものが気持ちいい動画を作る。**

ZEVはショート専用ではなく、汎用動画生成基盤として進める。上位製品方針は `相談役/方針/2026-09-06_ZEV_方針整理.md`、詳細architectureは `docs/architecture/ZEV_AGENT_SKILL_ARCHITECTURE_v001.md` を参照する。

`docs/GOAL_DEFINITION.md` v3.6は既存目標・評価関門の履歴として保持する。9月6日上位方針への適用範囲と改訂が未確定という扱いを維持し、今回その数値・意味を変更しない。

## 2. 現在位置と次に読む文書

**復元の入口：[制作意図・薄いplan・Plannerの判断記録 v002](../相談役/方針/2026-09-09_ZEV_plan判断記録_v002.md)。**

ダイジェストと遠方接続の2系統は、今回の既存素材で技術・人間品質の第一完成まで到達した。全素材への品質一般化、完全自動運転、旧Goalの全関門合格を意味しない。

共通字幕局所補修は完成済み。review selectorと局所音響観測は、観測供給・要確認箇所から補修への接続まで成立したが、安全な人間確認省略や確認負担削減は未実証。この系列を目的なく深追いしない。

指示-019の候補採否は技術成立。A/Bを残しCの振り返り・総評を除いた99.9秒版に対して、人間は「尻切れではない」と回答した。一方、Cの必要性は制作意図・構成上の役割によるため、採否品質を一律合格にはしていない。A/B単体や総合優越の未回答も補完しない。

現在は、この結果を受けた打ち合わせの判断を保存し、次の実装指示を改訂する前の地点である。

## 3. 採用された制作意図と進行方針

今回の既存ホラーゲーム素材に対し、ユーザーが採用した制作意図：

> ぺこらが本気で怖がって絶叫しているところと、怖がっている姿が可愛く見えるところを中心に見せる。

これはZEV全体の固定目的ではない。A/B/Cの採否、感想の必須化、採用件数・秒数は事前に埋めない。

Plannerは統合役、candidate-selectionは個別の採否判断役として分ける。Planner本体の先行実装ではなく、人手の薄いplan（小さな制作方針）を固定し、現行Skillへ渡して効果を切り分ける。不足が確認された部分だけ改善し、必要な部分採用は既存の候補内部保持へ分担する。

制作意図への適合と実際の見心地を別々に評価する。役割欄の充足、C採用、短尺化だけで品質完成とはしない。具体的なschema・役割語彙・実験条件は判断記録の未決事項を参照する。

## 4. 許可範囲・保留状態

今回許可されているのは、打ち合わせの判断記録、CURRENT_GOALの参照と現在地、GitHub上の文書保存、Driveの同一内容ミラーと照合情報の保存である。

**元の指示-021は送付前に保留。改訂版の実装指示は未発行。** 記録保存を実装開始に読み替えない。次に作成する実装指示は、今回の制作意図を含む改訂版「ZEV進行管理２ 指示-021」とし、未送付の旧案と区別する。

今回は新しい採否判断、候補探索、内部編集、音響実験、動画再生成、自由Planner、巨大registry、新素材、有料推論、renderer/style変更、Goal定義・architecture契約改訂、tag・stable・release・公開を行わない。

Gemini候補動画理解A/B較正の共通後段不採用・系列終了も維持する。限定映像観測の将来候補という扱いを変更しない。

## 5. 正本と参照ミラー

repositoryを正本、Google DriveをChatGPT用の選択的な参照ミラーとする。今回の同期対象は本ファイルと判断記録を中心とする少数文書。Driveの保存記録にrepository path、commit SHA、file SHA-256、Drive file ID、読戻し結果を残す。旧snapshotは履歴として保持する。

常時自動同期を実装したものではない。新セッションはミラーの基準commitを確認し、CURRENT_GOAL → 判断記録 → 必要なAGENTS・監査protocol・architectureの順で読む。古い会話記憶で正本の現在状態を確定しない。

今回の保存はGitHub側への文書更新であり、CodexのPC側mainの更新まで実行したとは扱わない。Codexは次の書込み前にremote差分を確認し、既存ローカル変更を保持して取り込む。force pushやresetで分岐を潰さない。

## 6. 履歴・根拠

- 2026-09-06の履歴統合と正本整合：`docs/reports/main-integration-canonical-alignment-20260906-v001.md`。以前のCURRENT_GOAL本文はGit履歴に保持する。
- 2系統第一完成：`docs/reports/two-e2e-first-completion-next-step-20260908-v001.md`。
- 候補採否の技術実証：`docs/reports/candidate-selection-output-judgment-v001.md`。
- Cの人間評価：`evals/clip_composition/outputs/presentation/work-candidate-selection-human-review-20260908-v001/human-review.json` と `human-review-supplement-v001.json`。
- 今回の判断理由・外部レビューの区別・未決事項・保存承認の出所：上記判断記録v002。
