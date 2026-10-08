# OpenAI Decisions J16 — 接続用コード・回答チェック・模擬テスト

2026-10-08 / 担当 Codex-SSD（既存Mac制作担当）

本人15:32 JST「優劣はいい。OpenAIですすめて」で判断APIの候補選択を終了し、15:46 JST「いいよ。有料じゃないの？」で提示済みの接続コード・回答検証・外部送信なしの模擬テストを承認した。API自体は有料で、今回の模擬テストはAPIを使わない。**このローカル実装工程は完了。実APIの利用成功、素材送信・課金、本番への組込みは未実施。**

## 実装と接続境界

新規の製品コードは `runner/src/openai-decisions-j16-v001.ts` 一件、対応試験は `runner/src/openai-decisions-j16-v001.test.ts` 一件。

保存済みJ16入力のbyte数・SHA・字幕ID・配列位置を照合し、場面全体と前後の文脈を共通入力にする。質問文とnormal/effect/unresolvedの意味は既存保存入力からそのまま読む。明示した質問部分集合でも文脈を切らず、字幕ごとの個別API呼出しへ分解しない。保存ラベルは読み込まない。

[公式ガイド](https://developers.openai.com/api/docs/guides/decisions)を2026-10-08に確認し、`POST https://api.openai.com/v1/decisions`、`gpt-6-luna`、`model/input/questions`、`choice`の`name/instructions/choices`へ写像した。対応JavaScript SDKの最低版は7.30.0と掲載されているが、今回SDK・依存物の追加はない。ローカルコードはrequest作成、回答検証、注入されたmock portとの交換まで。HTTP live dispatcher、鍵の読込み、通常キューからの起動、結果の本番反映は実装していない。

回答は返却されたnameで元字幕IDへ対応させ、件数・欠落・重複・別ID・型・選択肢・確率の値域と全選択肢被覆を確認する。並び順をIDと取り違えない。拒否はchoice=nullの別状態にし、意味上のunresolvedと分ける。通信失敗、HTTP不成立、schema不成立には意味回答を作らず、retry/fallbackなし。confidenceは保持するだけで採用閾値には使わない。成功時の返却原文とSHAも返し、正規化で未使用のmetadataを失わない。実provider応答ではないため、usageや校正を確認済みとはしない。

`runDecisionsJ16MockV001`はmock専用で、live指定をdispatch前に拒否する。モジュール読込み・構築・検証にファイル/環境/ネットワークへの作用はない。これを正式製造のpermitや本番HTTPの認可機構とは扱わない。

## 現行の複合回答は保持

現行 `evals/clip_composition/presentation_orchestration_v001.mjs` は演出役割、許可preset、強調範囲、理由、証拠ID、接続表現を含む完全な回答を検証する。`run_new_material_digest_20260926_presentation.mts` の回答受理もそのまま。今回の3択結果をここへ差し込んでいない。

J16は演出の要否一種類であり、演出の種類・原文内の強調範囲・理由を生成できたことにはならない。新adapterへ現行複合回答を置き換える処理、保存済み理由の使い回し、回答不足をNormalで埋める処理はない。hash/時計/算術/機械QC/人間品質判断も現行責務に残る。

## 確認した接続・入力・検証

- mainの開始HEADは `b3c7c84777eda4c805507fdbfc2fda1542ab2aed`、開始時Git clean。GitHub接続から同SHAを06:36:09 UTCに再照合した。新branch/worktreeなし。
- Mac実行接続は途中で切れ、読み取り再試行も失敗。親が15:39 JSTに復帰を確認し、この同じsessionで続行した。06:40:49 UTCにMacの読み取りとGit状態を再確認した。重複作業・旧相談役の往復試験なし。
- 06:41:33.331 UTCに既存repo `.env` の `OPENAI_API_KEY` が空でないことを確認。process環境には未設定。値・hash・headerは表示/保存せず、新key・設定変更・認証付きGET/POSTも0。有効性とDecisions権限は未検証。
- 06:44:13.050 UTCに既存5入力の実byte/SHA、53+84+61+101+27=326字幕を原manifestと照合した。保存Normal274/effect52は参照判断であり正解ではない。今回のmock回答はID対応試験用の任意値で、品質判定や本番演出に採用しない。
- 最終mock試験 **10/10合格、skip0**。失敗検出、拒否/保留、原返却保持、live拒否、元326 ID・5場面の被覆を含む。私有保存入力の試験は `ZEV_J16_FROZEN_INPUT_ROOT` を明示指定する。通常unit実行は私有入力部分だけskipし、未実施と表示する。
- runner `tsc -p tsconfig.json --noEmit` exit0、`git diff --check` 合格。新依存の導入0。既存製造/renderer/素材/字幕/QCを変更していないため、終了済み動画や旧fixture suiteの再実行は行わない。全既存suite合格とはしない。
- 実API試験・費用・素材送信・STT・動画製造は0。実latency、token数、実判断、日本語品質、実製造の時間短縮は未評価。

## 具体化した次の実試験候補と不足条件

送信しないローカル準備として、9/30固定入力candidate-0001の全53字幕と場面端の文脈・制作要求・保存音響測定/ASR本文・物理観測を共通入力にし、先頭6字幕の既存質問だけを指定した。一回POST、retry0の候補。動画・音声媒体・画像・保存ラベル・keyは含めない。

- request実byte：83,132、共通文脈：71,677 byte。
- 原input SHA：`ad8bfc4b55b19f4c2f34d74906f3609197651bdd53cbf45643ff0211d7f81dc5`。
- 具体request SHA：`05b669302d660337f52f7b650cf773e0010f3df22e99e5781d880adcd9ad6345`。
- 保存先：`/Users/kawafmm/Documents/Codex/2026-10-03/task-3/openai-decisions-j16-first-request-v001.json`（0600、Git対象外の作業領域）。
- 送信先候補：`https://api.openai.com/v1/decisions`、model `gpt-6-luna`。dispatch0。

公式ガイドの専用単価は入力100万tokenあたり0.10 USD、出力token課金なし。地域処理の加算と長文倍率が適用される。83,132 byteをtoken数へ換算してはいない。token数・当該条件の保守的な費用上限・入力/質問上限・当アカウント権限は未確認で、今回の採用/実装承認を送信・課金許可へ広げない。次のmona判断では、この候補データ・一回/6質問・費用の確認を先に具体化する。9/28のJev向け1 USD/12回をOpenAIへ移植しない。

## ボード・正本・後始末

正式MCPで自分所有の候補選択#45をDoneへ閉じ、導入#59へ接続した。自分所有#44はOpenAIの実素材試験・本番接続条件へ更新する。#54の文脈改善、#15→#58の字幕再利用監査、既存人間回答、他者項目と削除履歴を保持する。mona所有の#3 `ai-comparison-20261006` と#4 `ai-material-request-20261006` は旧資料待ちが残るため、mona側で方針により終了として閉じる必要がある。比較合格を意味しない。

`DECISIONS.md`は照合し、現SHAに今回のOpenAI/Jev選定記録がないことを確認した。AGENTSのDECISIONS節に従い、Codexが承認行を追加していない。本人の原文と受領範囲はこのreport・session logに保存し、相談役が正本の承認記録を扱う。9/30の未確認資料は当時の履歴のまま保持する。

今回大容量生成・不要媒体は0。mock/型検査processは終了。初回具体requestと入力SHA・テスト・認証存在の秘密なし記録は後続確認用に保持する。API key、元字幕全文、私有requestはGitへ含めない。commit/push/最終Git・ボードの実値は終了記録で確定する。

証拠root：`/Users/kawafmm/Documents/Codex/2026-10-03/task-3`。`decisions-credential-preflight-20261008-v001.json`、`decisions-frozen-input-readback-20261008-v001.json`、`decisions-local-implementation-start-20261008-v001.json`、`decisions-local-refinement-20261008-v001.json`、`decisions-mock-tests-20261008-v002.tap`、`decisions-runner-typecheck-20261008-v002.txt`、`decisions-first-request-preparation-20261008-v001.json`、正式MCPの開始/終了再読を保持。
