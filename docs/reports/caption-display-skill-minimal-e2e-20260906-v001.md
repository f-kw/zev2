# 字幕表示区切りSkill 最小実動画E2E — 実装・境界監査報告

## 1. 現在地と今回の承認

2026-09-06「ZEV進行管理２」経由のkawafmm承認済み実装指示に基づく。開始HEADはmain `95f8852982a179c3915f2ec03e3dfd6c8ff8d735`。直接設計根拠は `docs/reports/first-skill-selection-and-minimal-e2e-design-20260906-v001.md`。

現在は**新規判断・描画前の監査checkpoint**。Skill入口、固定plan、検査・決定的昇格・既存Core接続、テストを実装した。保存済み回答は配線テストだけに使用し、新しいSkill判断の実績や品質合格には数えていない。実動画はまだ生成していない。第一完成とは報告しない。

## 2. GPT_DECISION — 新規判断の実行手段

今回の指示は新しいSkill判断と実動画を必須とする一方、API通信・Gemini追加実験を禁止している。推奨案は、**この作業を実行している現Codexセッションが、固定した本文・境界IDを読み、その場で新しく区切りを判断し、ローカル標準入力へ回答を渡す**方法である。追加のモデル・provider選択やAPI client呼出を実装せず、現セッションと既存ツールを使う。独立した自動推論サービスを実装したとの主張はしない。

この手段を同一work-order内の実装方法として使用してよいか、architecture §4の利用許可との境界を相談役に確認する。許可されるまで新規判断と動画生成は未実行。過去回答の再生へ置き換えて完成とはしない。人間の見やすさ判定は別のHUMAN_DECISIONとして残す。

## 3. 所有権と実装現物

| 処理の責務 | 実装 |
| --- | --- |
| 「確定済み字幕本文をどの表示単位・行末で見せるか」という一つの問いを呼び出し、権限のない回答を返す | `runner/src/skills/caption-display-boundaries-v001.ts` |
| 遠方接続の医者失踪→鬼の母の既存完成例、元本文・音声・表示規約・出力先・review用採用方針を固定する | `evals/clip_composition/jobs/presentation/caption-display-skill-e2e/fixed-plan-v001.json` |
| 入力照合、回答検査、review用採用、既存projection・正式注文書の製造、既存renderer呼出、由来照合 | `evals/clip_composition/run_caption_display_skill_e2e_v001.mts` |
| Skill入口の検査 | `runner/test/caption-display-boundaries-v001.test.mts` |
| 不正回答拒否、採用境界、決定的昇格と既存Coreへの接続検査 | `evals/clip_composition/run_caption_display_skill_e2e_v001.test.mts` |

実装・固定入力・テストの新規5pathと本報告だけを今回のcommit対象にする。数値上限を新設した意味ではない。既存production・契約・Goal・DECISIONSは変更していない。開始時に存在した別作業13pathの内容SHAを保存し、commit対象から除外する。

Skillの入力は既存形式の確定本文断片・境界ID・行幅規約だけ。回答は完了または辞退、完了時は表示末尾と行末の境界IDだけであり、時刻・frame・字幕本文・採用宣言・素材pathを許さない。入力・出力の検査関数は製造側から呼ぶ。Skill自体は描画・正式化・QCを実行しない。

採用前に元データの本文・境界・所属・順序・全文被覆・行幅・SHAを照合する。内部の検査済みsnapshotを持つトークンからだけ昇格し、生回答やトークンをコピーしたJSONでは昇格できない。同じ入力と同じ採用回答から同じ正式byteを製造する。新しいLLM回答の再生成一致を保証するという意味ではない。

既存のsource検査、表示末尾projection、意味に基づく行末projection、正式注文書v002、行組みv002、renderer admission・renderer・technical QCを再利用する。過去B6回答を新しい判断の由来へ偽装しない。新しい由来は固定plan、入力、現Codex回答、Skill結果、検査・採用記録、昇格成果物の連鎖で記録する。Coreには昇格後の正式入力だけを渡す。

## 4. 初期検証

- 新規テスト12件: 合格。不存在ID、所属・順序違反、全文欠落、不正改行、余分な時刻・本文・採用field、回答由来不一致、生回答の直接昇格を拒否。正常系の既存projection・正式注文書・renderer job検査が合格。
- Skill単体のstrict TypeScript検査: 合格。
- 既存字幕経路の回帰検査7ファイル: 初回53件中52件合格。source検査の1件でmacOS `otool` の標準エラー長が保存値0に対し216byte。対象test・source実装・native helperは開始HEADと完全一致し、今回のコードをimportしない。空の環境でmacOS一時ディレクトリ取得に失敗するsandbox警告が原因と再現できた。同じ既存テストを制限外で再実行した結果は末尾へ記録する。
- 元動画は既存3.51GBファイルを照合。小容量向け一括読込みの2GB制限を発見したため、既存の大容量ファイル照合処理へ接続した。素材の書換えなし。
- 初期テストで回答のschema欠落とTypeScriptの型絞込み不備を修正。型・回答検査を緩めず再検証した。実動画attemptは未開始。
- 既存描画ツール6種は記録されたSHAと現物が一致。追加のAPI通信・追加有料推論・新素材取得は0。

再現コマンド（workspace root、Node 20.19.6、インストール済み依存を使用）:

```sh
node --import ./runner/node_modules/tsx/dist/loader.mjs --test runner/test/caption-display-boundaries-v001.test.mts evals/clip_composition/run_caption_display_skill_e2e_v001.test.mts
node runner/node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module NodeNext --skipLibCheck runner/src/skills/caption-display-boundaries-v001.ts
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/run_caption_display_skill_e2e_v001.mts preflight evals/clip_composition/jobs/presentation/caption-display-skill-e2e/fixed-plan-v001.json
```

## 5. 監査後の残工程

新規判断の方式を相談役がcontinueとした場合、同一work-orderで入力固定→新規回答→検査・昇格→既存Core→別出力動画→QC・由来再検証まで進める。既存版と新規版、可能なら元動画の対象区間を一つのreview導線へまとめ、人間に見やすさ・不自然な分割・気持ちよさを直接判断してもらう。目視結果をCodexが記入しない。

第一完成時に本報告を実績へ更新し、commit/push、local/remote mainの同一HEAD、Drive MANIFEST同期を確認してAUDIT_ONLYを同じ相談役へ提出する。自己commitのSHAは本書へ自己参照させず、Drive MANIFESTと提出本文へ記録する。

回帰の追加切り分け: `/private/tmp/zev2-caption-skill-bgild7ec/core-source-native.tap` の結果は6件中6件合格。制限外では既存コード・保存値を変更せず合格したため、今回の必要な既存回帰53件はすべて合格を確認した。初回失敗ログと再実行ログを両方保持する。
