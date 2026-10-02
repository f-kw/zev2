# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元と履歴

プロジェクトZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAのHANDOVER_INDEX、現行正本を読む。発行・受領・適用・実行・技術受理・人間採用を分ける。

更新前全文と後段案の受領・完成記録は[86875908固定版](https://github.com/f-kw/zev2/blob/86875908579d4edf96efdc2117d382b8191c3169/docs/CURRENT_GOAL.md)へ保持。263dca50限定再調整、ebc2269f適合診断、0f103935/9dc72330設営停止、903d79b4時計、fda455c4表示回答、a98f569a準備、4556e389入力対応、7bb5de02実判断、v005の履歴を辿る。古い停止を現在の未完了へ戻さない。

## 2. 完了・相談役受理

- v005通常キュー：7c8f34ce、親v005 §13 accept。追加拒否/転送へ戻さない。
- 通常依頼の実判断付き計画：7bb5de02 accept。12候補/7採用/9保持、keep3,613/drop3,460、通常4工程succeeded、27,691frame/40,705,770sample、別process再読0。
- 字幕演出入口対応：4556e389 accept。18項目の静的対応。作り直さない。
- 字幕判断入力準備：a98f569a accept。新二path、3,613atom/9要求、旧正常比較、11拒否/再構築。
- 保存9表示回答候補：fda455c4 accept。旧36論理幅/2行、218cue/289行、行末訂正後検査/再読。元条件で維持。
- 接続前計画時計：903d79b4 accept。218cue全件対応、unmapped0。
- 144px/A適合診断：ebc2269f accept。120適合/98不適合。診断完成と全字幕適合は別。
- 144px限定再調整：263dca50 accept。120固定、73行末変更/25内部二分割、243cue/390行/3,613atom/9区間。26/2・Node領域243passed、旧外周/全体時計不変、独立再読0。追加字幕再判断・全検査へ戻さない。
- **正式後段接続・限定製造の実行案：86875908579d4edf96efdc2117d382b8191c3169を今回accept。** 小JSON/code参照、既知path metadata、二文書案の作成は完了。必須追加文書修正・診断なし。製品実装/候補trust/製造の成立は認定しない。

今回受理・次判断の正本：[ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md)、初回保存1ee54141a02451e2d8a03b5e9b14e2d6cf589fbf。

固定字幕候補root：runtime/artifacts/digest-caption-144px-reflow-20261003-v001/attempt-001/
- manifest SHA 04ad8b3f019d6afed4038f376e101d15e155cc7822a2527b46fcfbd5b5041e41
- correspondence SHA 950f1edf9ea2a6f4ae8b1b2991d78b1c706bbaf2bf8877d04dcf66df15ed98f5
- traces SHA 479107679f236221b198c59a0fef95495dbb5ecb1a75df922a700f6fb8b482b6
- readback SHA e23018520f8bebe0d0827cdf1482c81e731c1b7e156e3fcd2a6fc1c4908ff158

旧15分レビュー、構成改善v001、一件後修正/Reset、旧9:47案1080p低メモリ製造は完了範囲を保持。相談役はGitHub保存コード・証拠を監査し、Mac全runtime再実行・glyph/映像確認を行っていない。最短8/最長526frame・空白15件1,220frameは観測で見心地合格ではない。

## 3. 現在の一件 — 製造の本人判断待ち

**decision: human_decision。文書作業は完了。追加helper・診断・実装は指示しない。**

現在の許可依頼は、保存済み一素材・15分23秒案・243字幕を144px/A8/4・Normal確認用動画一本へ接続するための限定実装、候補専用の信頼設定、保存先/安全容量確定後の実製造をまとめた一件。本人回答は未受領。質問と作用範囲は[判断正本§4](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md)へ蓄積した。ID9-PD-02関連の一計画製造であり、ID9-PD-01一般本適用とは分ける。

### 技術方針

元owner/依存/resolver/SHA、保存意味/ID・9traceを維持する一計画adapterと既存Coreを使う。新9要求を作り直さない。低メモリは既存有限分割・renderer graph・逐次producer/連続encoderを利用し、compose段とcaller伝達だけを限定接続する方向。

提案4technical pathは新runner/src/digest-formal-handoff-v001.ts、既存original-resolution-low-memory-composite.mjs、render_presentation_v002.mjs、run_presentation_instruction_renderer_job_v002.ts。監視案はoriginal-resolution-full-supervisor-v002.py。今回これらの変更や凍結解除は許可しない。承認後の正本で箇所と検証を確定する。

一般style resolverは固定trust canonical SHA/pathを検査する。候補contextも実行可能な候補を決める権限を持つため、単なる設営修正として有効化しない。推奨は本人承認の一計画に限定した入口で、baseline実SHA・許可差分・plan・code・root・製造recordを一致させる方式。一般root変更、自動fallback、STYLE_LIMIT_MISMATCH・font/runtime/code/admission/QCの免除はしない。未実装のため候補入口の成功は未認定。

### 実作用と容量

提案にはsource snapshot copy/chmod/hash、source再inspection、映像/音声grid/PCM/AAC、字幕PNG/glyph/既存QC、今回作成workだけの成功後整理が含まれる。旧inspection/削除0の許可では開始しない。旧成果削除、新API/費用・新素材/STT・演出追加・本番/公開は含めない。

metadata観測2026-10-02T20:03:59.334588+00:00、device16777234、空き13,411,098,624bytes。snapshot4,803,412,827＋source-grid4,246,331,392＋encodePCM325,646,160＝既知9,375,390,379bytesに未知圧縮物が加わる。12GBreserve込みの既知部分だけでも21,375,390,379bytesで観測空きを超える。**現deviceで製造開始不可。**

旧50GB開始/12GBreserve/16GiB親子RSS/pressure1/1秒観測/next-unit+reserve/PGID停止は今回への再承認案で、まだ有効化しない。50GBで成功を保証せず実行時監視が必要。保存先は未確定、SSDは未確認。外部root・symlink・削除で勝手に容量を作らない。本人許可後も実path/device/空き・一時物の保存先・ROOT参照の整合が揃うまで媒体は動かさない。

## 4. 人間回答・未承認事項

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。144px方向・条件付き分割・水色/カラフル方向肯定を保持。A8/4は技術入力で縁選択ではない。26条件を実glyph・見心地・正式styleの採用にしない。

B8/12の21論理不合格、強調変更B未肯定、LightCoralの技術不合格と好みの区別、アップのHUD/自動選択/品質、R1〜R3修正版7点・鬼武者Q3-2未回答を既存台帳へ維持。旧10回答・15分レビューは済み。旧307状態/18色/82frameアップを一括移植しない。完成背景四参照・正式後段・演出・動画・人間品質・本番/公開は別の未完了/未承認。

## 5. 保全・受渡し

製品修正6/設営29、新二path初実装と旧失敗/accept、一般上限・強制停止は不変。設営30は承認・適用していない。

旧8コピー35.79GiB削除・33参照再作成要、元媒体/STT/inspection/完成媒体/判断/旧state保持は維持。今回旧成果削除・コピー復元・SSD探索を行わない。

Codex2は専用Edgeで本返信を全文受領後、人間判断と新着工正本待ちとして区切る。未承認実装/候補trust/媒体、容量ポーリング、待機を理由にした別エピック・新診断・Codex1起動はしない。受理だけの再commit/終了通知commit・本人への転記/手貼り/視聴/採点要求は不要。必要な一問は相談役から提示する。

86875908のpush/4文書差分はGitHubで確認。Git clean/untracked0・対象process0はCodex報告。今回acceptとhuman_decisionは正本保存・発行、本人回答・Codexの返信受領/待機移行・Mac現在processは未確認。保存を稼働と混同しない。

## 6. Codex作業サイクル運用更新（2026-10-03）

kawafmm指示により、Codexの標準完了フローを見直した。正本は `docs/policies/CODEX_WORK_CYCLE_CLEANUP_POLICY_v001.md`。

今後は、指示受領→作業→検証→**不要物cleanup**→process終了→正本/Git→相談役報告→次指示受領、までを一サイクルとする。現在work-orderが自分で作った一時copy・PCM/grid・途中transcode・scratch・不要work等は、成果/証拠固定後かつ後続参照なしを確認して自動削除する。元素材、受理済みcandidate、人間review媒体、他task成果、正本参照物、容量確保目的の既存成果は自動削除しない。

媒体作業では、開始前に一時物/完成物/削除予定と容量条件を確認し、完了報告にcleanup結果・回収bytes・残した大容量物と理由・own process/Git状態を含める。失敗attemptは最小監査証拠を残すが、監査不要の巨大partial媒体を永久保持することを標準にしない。

この運用更新は現在の一計画製造許可待ちを承認へ変えない。現時点の未承認adapter/trust/媒体製造、SSD/旧成果削除、ID9-PD-01/02等の境界は不変。

## 7. Codex session work log運用更新（2026-10-03）

kawafmm指示により、複数Codex sessionの並行稼働を前提に作業ログを追加した。正本は `docs/policies/CODEX_SESSION_WORK_LOG_POLICY_v001.md`。

中央の一つのlogへ逐次追記せず、各sessionが第一完成・停止・handoff・終了直前に、そのサイクルの指示/判断/主要作業/検証/cleanup/Git/次状態を `docs/work-logs/YYYY-MM/` の自分専用fileへまとめる。通常rotationは月directory、1 summaryが64 KiBを超える場合だけpart分割する。

標準終了順は、証拠固定→cleanup→own process終了→session work log→正本更新→commit/push→相談役報告→次指示受領。work logは正本の代替ではなく、現在の一計画製造human_decision待ち等の承認境界も変更しない。
