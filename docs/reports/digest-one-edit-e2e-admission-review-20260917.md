# Digest一件後修正：通常ジョブ受入の判断依頼

2026-09-17。質問種別は **GPT_DECISION**。実装・信頼台帳・契約の変更は行っていない。今回の実161秒動画の全編製造、A+B、Resetは未実行である。

## 1. 求める判断

今回の技術検証だけに用いる**実行入力の観測スナップショット**を新規パスへ作り、通常ジョブへ渡してよいか判断を求める。

推奨する限定案は、既存の正式な信頼台帳を一切変更せず、同じスキーマの複製で描画依存8件のうち不一致4件のSHAだけを、既に技術監査を受けた実装の実測値へ置き換えるもの。書体、配置規則、ツールの記録、プレビュー、スタイル台帳の参照、残り4依存、版名を含むその他の値を変えない。旧版と複製の全差分、新旧ジョブの全差分を検証し、通常入口の受入・媒体検査・全編製造・A+B・最終判定を一つも省略しない。

これは正式な描画版の昇格、台帳の正本改訂、製品の表現採用、stable/tag/releaseの許可を求めるものではない。この区別が既存契約上成立せず、第1層の信頼台帳改訂に当たる場合はkawafmm判断へ上げる。Codexだけで許可済みと解釈して進めない。

複製中の既存版名や合格済みプレビューの参照を、現行の全演出が人間承認済みである証拠へ読み替えない。別パス・生成記録・旧新差分で開発用の観測入力として識別する。版名の扱い自体に別の規定が必要な場合も、相談役の判断を受ける。

旧台帳の版名や承認済みプレビューの参照を保持する場合も、それらは元台帳の来歴だけを示し、現在の演出全体への人間承認を示さない。別パスと実行入力のsidecar証拠で、今回の開発用観測値であることを区別する。この識別方法で十分か、版名・識別子の変更が契約上必要かも今回の判断対象とし、Codexだけで新しい正式版を発行しない。

**観測スナップショットは未作成。** 具体的な新規パスの固定とジョブ製造は、回答で許可範囲が閉じてから行う。依存検査の無効化、旧SHAの受入、直接描画呼出しへの切替は提案しない。

## 2. 目的と完了条件

保存済み自動案のColor字幕一件を実CLIでNormalに固定し、保存した修正を再読して、通常の製造ジョブ入口から161秒全編を製造・検査する。その後、実CLIのResetへ実際に保存したNormal修正を渡し、再読後に同じ通常入口で全編を製造する。最後に、Reset後の完成MP4と元の自動演出MP4の全バイト一致を確認する。

- 対象：32字幕、1,920×1,080、30fps、4,831フレーム。
- 対象字幕：`digest-human-caption-repair-20260907-v001-instruction-instruction-000007`、「この覗き方やめろ!」、開始282・終了端340フレーム。
- 選定理由：保存済みColorの最初の一件を後修正経路の開発用検体として使用。人間による編集品質判断は含まない。
- 元MP4：75,278,536バイト、SHA-256 `bfaf7083d229c8649bac9eba1734074a4ef24e5881c50bf514d5d2527161419c`。
- 新しい演出、AI判断、素材取得、契約・Goal変更を追加しない。

調査時の作業枝は `codex/digest-one-edit-e2e`、基点は `9d9e48b75a8c683d4103e0ed9edfb3744f89c708`。これは直前のQC最終HEADであり、この文書を含む監査checkpointのSHAは親担当の固定後に別途報告する。

## 3. 現在までに実施したこと

[実CLIのNormal保存・再読記録](/private/tmp/zev-one-edit-e2e-cqdrbc6a/real-cli-normal-v001/summary.json) は合格した。記録SHA-256は `afcfc081b647023c4d542bf5259384d3b85ad33dff8caab6da9a83bc074a411a`。

実プロセスで「変更前表示」「Normal保存」「保存済み修正の再読表示」の3回を起動し、すべて終了0・signalなし・stderr空を記録した。対象の一件だけがNormal固定になり、他31件の実効計画は変わらない。通常計画・判断入力・固定自動案の実バイトも再照合した。AI判断の呼出しは0回である。

保存された一件修正のSHA-256は `23d083628caff57d7ced8aa1b0a4ea50e45964be7690c5af1854432d2f6c1b2b`。既存ファイルを上書きしていない。

**今回のNormal全編製造、A+B、Resetの実CLI、Reset後の全編製造、元MP4との一致確認は未実行。** 保存・再読の成功を、完成動画までの成功として扱わない。

## 4. 通常ジョブへ接続できる元入力

元ジョブは次の既存ファイルである。

[元の製造ジョブ](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/caption-human-repair-render-v002/renderer-job.json)

その隣の [元の実行結果](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/caption-human-repair-render-v002/renderer-result.json) に保存された共通描画計画は、[Pulse検証で使用した固定通常計画](/private/tmp/zev-pulse-accent-fswa9cuw/inputs/horror/normal-plan.json) と、32要素を含むJSON全体が一致した。旧Pulse検証の直接描画用の計画とは別物を用意する必要はない。

必要な字幕・意味・時間の入力は、元Digestの次の既存ファイルに揃っている。表の基準ディレクトリは `evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001`。

| 用途 | 基準ディレクトリからの相対パス |
|---|---|
| 字幕注文書 | `caption-human-repair-v001/instruction.json` |
| 意味情報 | `caption-human-repair-v001/meaning-input.json` |
| cue終端 | `caption-human-repair-v001/cue-end-projection.json` |
| 意味上の行末 | `caption-human-repair-v001/line-end-projection.json` |
| 行末の元情報 | `caption-human-repair-v001/source-package.json` |
| 基礎動画と時間対応 | `internal-edit-v001/base-media/base-media.mp4`、`timeline.json` |
| 基礎動画の生成・検証来歴 | `internal-edit-v001/base-media/generation-manifest.json`、`validation-receipt.json` |

横型スタイル台帳・素材台帳・書体・5件の契約も既存ファイルを使う。新しい作業ツリーで調査時に未配置だった入力は基礎MP4一件だけで、元workspaceには実在する。必要になれば同じバイトを作業ツリーへ配置し、参照の内容を変えずに照合する。

通常入口は [製造ジョブのファイル読込処理](/private/tmp/zev-one-edit-e2e-cqdrbc6a/worktree/evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts:489) を使用する。実CLIが保存した修正ファイルを自動演出の読込引数へ明示し、実効計画の解決と全編製造を通常処理へ任せる。元Pulseの検査ハーネスが共通描画処理を直接呼んだ事実を、この通常入口の実証と数えない。

## 5. 実測した停止要因

通常入口は、ジョブが参照する実装・書体・信頼台帳の描画依存をファイルから安定再読し、記載SHAと照合する。描画依存に一件でも差があれば、媒体検査より前に `byte-binding-mismatch` で停止する。今回はソースと実ファイルの読取で到達条件を確認したもので、失敗する通常ジョブを実行した記録ではない。

旧信頼台帳は [既存v002](/private/tmp/zev-one-edit-e2e-cqdrbc6a/worktree/evals/clip_composition/registries/presentation/presentation-renderer-trust-v002/trust.json)、SHA-256 `6e21352ff105e3b77acc351625fed22ff97486fb21d0ce9ee5b1821750a9047a`。依存8件中、次の4件だけが現在の実装と異なる。

| 依存ファイル | 台帳が記録するSHA-256 | 現在の実SHA-256 |
|---|---|---|
| `evals/clip_composition/presentation_renderer_entry_v001.tsx` | `5047dc3bcd51e8623cd090a443955828d38986db8338f53f2c9030e07cc952b7` | `ae053ad3ae1b602669a0bc22b6c0ecd05c720d1e83f70441d528bfc0fb2bd1f0` |
| `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` | `8c62f3bbc63a3f5292b4a079f9bfda21128514b19305976bcb29de5d1051aea0` | `ad5a822a71c1a967951952bb0dc7ceae4374682ae049768d66beb779dfb91385` |
| `runner/src/remotion/components/TelopText.tsx` | `9e941db470dd2586485134f093679bda947e722c4d000d25b0e7fb6ec5daf001` | `05dba9a74152232702f22514660d17e79e20f6767cf791390bd91dcc78f66ad7` |
| `runner/src/telop/telop-render-model.ts` | `5c32103a6f8faaa3ea1d30bb4624f0ca092385c8b77446aa5f51e3e3a0583412` | `d4b2604699de7df6675be8da46531cf0e417ae21b5d76f1f994cad252f59212a` |

4件すべての現在バイトは、Phase 2の技術最終監査が受理したcheckpoint `537567d57744e1115a3938e651ad8f86c1c12161` の格納バイトと完全一致した。元の台帳SHAも、Phase 2変更前のソースと一致する。

変更の意味は、文字列を一つの文字ノードに保ったまま選択範囲の前景色を描く処理、原文の位置と表示行の対応検査、その指定を渡す描画モデルである。新たな配置係数、書体、字形処理基盤、複数pass描画の追加はない。これら4件を今回の受入のために変更する提案ではない。

元ジョブの実装参照12件にも、現在と異なるSHAが5件ある。実行する現在の12実体へジョブを束縛し直す通常設営は必要だが、それだけでは信頼台帳側の4件の差は消えない。双方の差を別に記録した。

## 6. 不変条件の実バイト確認

[読み取り診断の全記録](/private/tmp/zev-one-edit-e2e-cqdrbc6a/one-edit-job-admission-audit-v001.json) に各パス・サイズ・SHAと旧新の対応を保存する。

| 対象 | 確認結果 |
|---|---|
| 描画依存8件 | 4件は旧台帳と一致。変更4件は上記技術checkpointの実バイトと一致 |
| 書体2件 | 新作業ツリーの実体が旧信頼台帳のSHAと一致 |
| FFmpeg・FFprobe・ImageMagick・Remotion・tsx・Chromium | 実際に使用する6ファイルが元の通常ジョブのSHAと一致 |
| Node | 既存20.19.6実行体を記録。旧QCの固定実行体と同じパス・SHA |
| 旧信頼台帳全文 | 元Pulseの作業ツリーと新作業ツリーで全バイト一致 |
| 横型スタイル台帳全文 | 同じく全バイト一致 |
| 依存定義と固定ファイル | root/runnerのpackage定義、pnpm lock、workspace定義が元Pulseと全バイト一致 |
| 承認済み契約5件 | 元の通常ジョブのSHAと新作業ツリーの実体が一致 |
| 通常計画・判断入力・固定自動案 | 実CLI記録のSHAと現在実体が一致 |

信頼台帳の配置規則、ツール記録、書体、プレビュー、スタイル台帳参照は、台帳全文のバイト一致として保持を確認した。スナップショットを許可された場合も、これらと版名を含むその他の値を全量一致で要求する。規則や数値を再設計しない。

## 7. 契約と過去実績から区別したこと

[描画疎結合化の承認済み追補v001](/private/tmp/zev-one-edit-e2e-cqdrbc6a/worktree/evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260817-v001.md:48) §4は、配置規則・ツール・書体・プレビュー・スタイル台帳参照を維持し、依存8件のSHAだけを現物へ更新した過去の対応も、版付きの信頼台帳再発行として定める。§8にはその再発行への明示承認がある。したがって、SHAだけの変更なら常に設営として自走可能、とは判断できない。

[Phase 2最終監査の記録](/private/tmp/zev-one-edit-e2e-cqdrbc6a/worktree/docs/reports/auto-effects-phase2-20260916.md:208) は上記checkpointの技術完成を受理した一方、正式な描画版の昇格時は台帳・版の更新と承認を別途必要とした。技術監査の受理を、正式な信頼台帳更新の承認へ読み替えない。

過去の未見素材検証には一時的な信頼台帳複製がある。しかし [v004の製造処理](/private/tmp/zev-one-edit-e2e-cqdrbc6a/worktree/evals/clip_composition/run_unseen_material_render_v004.mts:70) と [v006](/private/tmp/zev-one-edit-e2e-cqdrbc6a/worktree/evals/clip_composition/run_unseen_material_render_v006.mts:98) は、対象を限定した相談役判断を先に確認し、専用の文字サイズ台帳への参照3値だけを変更している。その他の全文不変を要求しており、描画依存のSHAを現在値へ置換する前例ではない。

今回の案は正本を昇格させない技術検証用の実行入力に限定しているため、この範囲を相談役が許可できるかをまずGPT_DECISIONで問う。正式信頼の変更に当たると判定された場合に、第1層へ上げる。

## 8. 許可された場合だけ進める検証

1. 新規の実行入力スナップショットを排他的に保存し、旧台帳からの全差分が上記4SHAだけであることを確認する。元台帳のバイトを保存前後に照合する。
2. 新規ジョブのID・試行ID・未使用出力先、現在の実装参照、実行入力スナップショットへの参照、必要な実行体パスを明示する。元ジョブとの差分を一件表にし、本文・時刻・媒体・規則・音声条件等の内容が不変であることを確認する。
3. 実CLIで保存済みのNormal修正を別読込で読み直し、通常ジョブのファイル入口を実行する。32字幕全編の製造、A+B、現在の完成MP4との証拠結合、最終QC、作業内の成果物ディレクトリへの確定がすべて成功した場合だけ次へ進む。外部公開は行わない。
4. 実CLI Resetへ、そのNormal修正ファイルを明示して渡し、別の新規ファイルへ保存する。再読後、上書き件数0・元の固定自動案不変・32字幕の実効計画完全復元を確認する。
5. Reset後も通常ジョブの同じ入口で全編製造とA+Bを実行する。公開後のMP4を元の自動演出MP4と全バイト比較する。
6. 実行記録・原文・対象入力の前後照合を保存し、人間品質判定を行っていないことを報告する。

Reset後も空の修正文書は残るため、修正なしだった元の履歴メタデータと全文一致するとは要求しない。要求するのは上書き0件、実効計画の復元、完成MP4の全バイト一致である。Normal出力についても、動画圧縮のために色指定箇所以外の完成画素がすべて同じになるとは先取りしない。

## 9. 回答してほしい範囲

- 上記4SHAだけを実測値へ更新する同スキーマ・新規パスの実行入力スナップショットを、今回の開発用検体の通常入口検証に限って作成・使用してよいか。
- 許可する場合、旧正式台帳不変・全差分照合・通常受入省略0・正式昇格なしという範囲で、Normal全編→実Reset→Reset全編→元MP4全バイト一致の確認まで進めてよいか。
- 元台帳の版名・プレビュー参照を歴史的な来歴として保持し、別パス・sidecarで実行用観測値と区別してよいか。識別子や版名の変更が必要なら、具体的な扱いと承認所有を示してほしい。
- 相談役の範囲で許可できず正式な信頼変更に当たる場合は、必要な第1層判断を明示してほしい。

この文書は判断依頼の草稿であり、承認や実行成功を記録するものではない。
