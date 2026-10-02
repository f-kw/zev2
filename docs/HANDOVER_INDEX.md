# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-03（JST） / revision：handover-index-20261003-v055
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトにはその写しを置く。

**最新更新：86875908579d4edf96efdc2117d382b8191c3169の正式後段接続・限定製造の二文書案を相談役accept。文書作業は完了、必須の追加診断なし。次は一素材・15分23秒案・243字幕のNormal候補一本について、限定接続実装・候補専用trust・安全容量確定後の実製造をまとめた本人判断一件。decision: human_decision。正本は[FORMAL_HANDOFF_DECISION](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md)、初回保存1ee54141a02451e2d8a03b5e9b14e2d6cf589fbf。現在空き13,411,098,624bytesは製造条件を満たさず、保存先/容量authorityは未確定。製品6/設営29を維持。新実装・候補trust有効化・媒体生成・設営30は未許可。本人回答、Codexの本返信受領/待機移行、Mac現在processは未確認。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行判断と必要な一次資料を読む。
4. 役割、現在地、完了、残件、人間回答、発行/受領/実行を分ける。取得/保存不能、Mac未観測を明示する。

優先順：最新本人指示と範囲→現行個別判断→対象実績と一次回答→本書→旧計画。会話要約や古い添付だけで復元しない。

更新前v054全文・後段案の受領/完成は[86875908固定版](https://github.com/f-kw/zev2/blob/86875908579d4edf96efdc2117d382b8191c3169/docs/HANDOVER_INDEX.md)に保持。263dca50限定再調整、ebc2269f適合診断、0f103935 React停止、9dc72330 Markdown停止、903d79b4時計、fda455c4表示回答、01b25053/d93e6418/d231a911表示過程、a98f569a/f577bfba準備、4556e389入力対応、7bb5de02実判断、ccd907a5までのv005履歴を辿る。古い停止を後のacceptへ逆流させない。

## 1. 役割・方針・運用

ZEVは素材・制作意図から内容/構成/字幕/必要演出を備え、見て気持ちいい動画を作る基盤。Digestが主線、Shortは別。一本生成や試験成功だけで製品完成にしない。

kawafmmは製品方針、任せる範囲、目視/好み、費用/契約/公開などの専決判断。相談役は残課題/優先順位/範囲/現物監査/具体指示/正本保存。Codexは指定内の実装/検証/保存/commit/push/直接報告。人間品質を代理採用しない。

「終わったら次に進んで」に従い同じ主線の次を具体化するが、新しい動画製造・候補trustの許可を軽微設営委任に混ぜない。今回の承認済み読取作業は終了。独立した承認済み作業の残りはなく、待機のためだけの診断/helper/別エピックは追加しない。

履歴は製品修正6/設営29。v005製品5/設営15、実判断16/17、対応18、準備19/20・製品修正6、表示21/22/23/24、時計25、適合26/27/28、再調整29と新二path初実装を区別。今回文書作業で設営30を計上しない。一般上限・強制停止・Codex自己承認権は不変。

人間確認は[既存台帳](HUMAN_REVIEW_PENDING.md)と今回の[一件製造許可待ち](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md)へ蓄積。未回答を採用にせず、15分初見レビュー・旧10回答・全字幕採点を再要求しない。今回本人へ求めるのは技術方式の選択や品質採点ではなく、一件の実装/製造への着工許可だけ。

## 2. 完了済み・受理範囲

| 項目 | 根拠・成立範囲 | 保持する区別 |
|---|---|---|
| 初稿・15分レビュー | 9/26初稿15:31.633、9/28レビュー、9/29局所回答 | 初見再レビューへ戻さない |
| 9.構成改善v001 | b69e168c受理、7採用/9保持、局所5本147字幕/111試験、終了68a32038 | 新案全編1080p/品質/汎化は別 |
| Codex1点検 | 9b72bc0f、対象bd0113c8、送信b93870fc | 補足後版/局所媒体の独立点検は未認定、再起動不要 |
| v002/v003/v004 | 11809f6f、7b600a64、d77f2a5d限定受理 | 旧fixtureを現行実走へ合算しない |
| v005通常キュー | 7c8f34ce、親v005 §13 accept、a64465cb | 技術完了。追加拒否/転送へ戻さない |
| 実判断付き計画 | 7bb5de02 accept、12候補/7採用/9保持、4工程complete、再読0 | 既見素材一件、人間品質と別 |
| 字幕演出入口対応 | 4556e389 accept、18項目の静的対応 | consumer受理と別。再作成不要 |
| 字幕判断入力準備 | a98f569a accept、3,613atom/9要求、658比較/11拒否/再構築0 | 元scope/旧失敗保持 |
| 保存9表示回答 | fda455c4 accept、旧36論理幅、218cue/289行、訂正後再読0 | 144pxの採用とは別 |
| 接続前計画時計 | 903d79b4 accept、218cue対応/未対応0、95件不変 | 正式timeline/媒体時計ではない |
| 144px/A適合診断 | ebc2269f accept、120適合/98不適合、型/run0、48入力/5失敗file保持 | Node推定幅、実glyphとは別 |
| 144px限定再調整 | 263dca50 accept、120固定・73行末/25内部二分割、243cue/390行/3,613atom、領域243passed/再読0 | 正式style/背景/後段/動画は未接続・未承認 |
| **正式後段接続・製造案** | **86875908を今回accept。二文書、元参照・候補境界・4technical+監視1path案・容量と作用を具体化** | **文書完成。新adapter/候補trust/低メモリ配線/実製造の技術合格ではない** |
| 旧9:47案1080p/低メモリ | d7e46592、265字幕/307状態、345点QC、本体/replay/再読 | 新15:23案全編と別 |
| 字幕/演出/一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期 | 既存能力を再実装しない |
| Decisions/Jev | 830ea968、9/30調査/36判断点/J16準備、実推論0 | 当時の結果と現在公開状況を分ける |

各suite/正実走は独立の実績でE2E件数へ合算しない。upload006親exit未返却を別process exit0へ付け替えない。相談役受理はGitHub保存コード/証拠/差分の監査であり、Mac全runtime再実行や映像視聴ではない。

## 3. 現在の判断 — 一計画製造の許可待ち

**[ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md)、初回保存1ee54141a02451e2d8a03b5e9b14e2d6cf589fbf。**

### 3.1 技術方針

保存IDと9traceを保つ一計画adapter→既存projection/assembler、低メモリ既存方式の明示frame/records化、compose段hookとcaller伝達に限定する方向を推奨する。executeDraw全体置換やrenderer/QCの再設計は採らない。

提案対象：runner/src/digest-formal-handoff-v001.ts（新規）、tools/digest-quality/original-resolution-low-memory-composite.mjs、evals/clip_composition/render_presentation_v002.mjs、evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts、および監視tools/digest-quality/original-resolution-full-supervisor-v002.py。今回の書換え許可ではない。凍結2pathの箇所、既存コードSHAの影響、必要検証は承認後の着工正本へ明示する。

一般style resolverのvalidateLandscapeTrustArtifactsは固定trust root/pathを検査し、候補trustだけでは通らない。一般root不変でもcandidate contextは実行資格の境界を持つため軽微修正扱いで有効化しない。本人許可の一計画だけ、固定baseline/許可差分/plan manifest/実装/出力root/製造recordを一致させ、別plan/root/任意deltaを拒否する入口を提案する。一般resolver拒否からの自動fallback、style等値・font/code/runtime/admission/QCの免除は不可。

元正常owner/state/採否保持・ID、243cue/390行、9区間/27,691frame/40,705,770sampleを維持する。集約viewは新しい判断要求ではない。A8/4・26/2は技術候補であり人間採用ではない。

### 3.2 容量と新作用

metadata観測2026-10-02T20:03:59.334588+00:00、device16777234、空き13,411,098,624bytes。元媒体/正常copyは各4,803,412,827bytes。保存inspection由来source-grid4,246,331,392、保持PCM325,646,160を含む既知同時保持は9,375,390,379bytes。可変video-only/base/PNG/QC等は未生成。

12GBreserveを足した既知分だけで21,375,390,379bytesとなり、観測空きより7,964,291,755bytes大きい。旧50GB開始条件も未達。**現deviceでの製造開始不可。** 50GB開始/12GBreserve/16GiB親子RSS/pressure1/1秒観測/next-unit+reserve/PGID停止は今回への再承認案で、独断の継承・緩和をしない。50GB確保だけを全工程成功保証にもしない。

新作用候補は素材snapshot copy/chmod/hash、再inspection、映像/音声grid/PCM/AAC、字幕PNG/glyph/技術QC、成功後の今回workだけの整理。旧成果削除・新素材/STT・新API/費用・演出追加・本番/公開は含めない。旧動画/307PNGの一括流用をしない。

保存先/容量authorityは未確定、SSD未確認。本人許可後も実path/device/空き・一時物・ROOT読取の整合を確定した指示が必要。SSDの推測探索・format・移行・新symlink・旧成果削除で容量を作らない。

### 3.3 本人への一問とCodex状態

[判断正本§4](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md)に、一素材・15分23秒・243字幕のNormal確認用動画一本について、限定接続/候補trustと安全容量確定後の実製造を許可するかという一問を保存。ID9-PD-02関連の一計画製造で、PD01の一般本適用とは別。質問を出しただけで許可済みにしない。

Codex2への現在指示はhuman_decision。本返信を専用Edgeで全文受領したら本人判断と新着工正本待ちとして区切る。これは字幕候補やv005が未完了という意味ではない。追加診断/helper/容量ポーリング・未承認実装/候補trust/媒体・別エピックは開始しない。受理だけの再commit・終了通知commit・Codex1起動は不要。

## 4. 固定成果・必読根拠

候補root：runtime/artifacts/digest-caption-144px-reflow-20261003-v001/attempt-001/
- manifest 04ad8b3f019d6afed4038f376e101d15e155cc7822a2527b46fcfbd5b5041e41
- correspondence 950f1edf9ea2a6f4ae8b1b2991d78b1c706bbaf2bf8877d04dcf66df15ed98f5
- traces 479107679f236221b198c59a0fef95495dbb5ecb1a75df922a700f6fb8b482b6
- readback e23018520f8bebe0d0827cdf1482c81e731c1b7e156e3fcd2a6fc1c4908ff158

元draft draft_eCg3g-IMIzEWMtJuMyJWB、prepare agent_xKOu8eZKSNa5viNENtJ4L、validate agent_wGiuVx5QiJvjGUxEW8Qxa。state SHA c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c。

| 根拠 | 用途 |
|---|---|
| [判断正本](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_DECISION_20261003_v001.md) | 今回accept・human_decision・許可待ち・実行不可条件 |
| [案作成親](work-orders/ZEV_DIGEST_FORMAL_HANDOFF_PLAN_20261003_v001.md) | 完了した読取範囲。SHAを編集しない |
| [案README](reports/digest-formal-handoff-plan-20261003/README.md)、[handoff-plan](reports/digest-formal-handoff-plan-20261003/handoff-plan.json) | 86875908の二文書、74小参照・実path/作用/容量/提案diff |
| [再調整正本](work-orders/ZEV_DIGEST_CAPTION_144PX_REFLOW_20261003_v001.md)、[report/evidence](reports/digest-caption-144px-reflow-20261003/README.md) | 243候補の完成。再実行不要 |
| [既存Core](../evals/clip_composition/adopted_media_manufacturing_v001.mts)、[style resolver](../evals/clip_composition/presentation_output_style_resolver_v001.ts) | base四参照・承認record・ROOT・style等値と固定trust境界 |
| [実判断](reports/request-intent-real-judgment-20261002/README.md)、[準備](reports/digest-caption-input-preparation-20261003/README.md)、[入力対応](reports/digest-presentation-input-mapping-20261002/mapping.json) | 正規元入力・不足・供給元 |
| [計画時計](reports/digest-caption-plan-timing-20261003/README.md)、[旧表示](reports/digest-caption-display-answers-20261003/README.md)、[適合](reports/digest-caption-style-compatibility-20261003/README.md) | 元条件の受理履歴 |
| [9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md)、[人間台帳](HUMAN_REVIEW_PENDING.md)、[開発計画](../相談役/方針/ZEV_開発計画.md) | 既回答・未回答・残エピック |

旧固定参照と詳細SHAは86875908固定版、本案のinputBindings/normalReferenceMap/displayAnswerReferencesに保持。元scope/purpose/承認・旧回答SHAを新許可へ付け替えない。

## 5. 人間回答・残件

144px方向、「読む必要がある文章でなかったら」の分割、水色/カラフル方向は肯定済み。A8/4は技術入力でoutlineChoice=null。B8/12は21論理不合格、強調変更B未肯定、LightCoral技術不合格と好みの区別、固定アップ1.2倍82frameのHUD/自動選択/品質未解決を維持。

旧10回答・15分レビューは済み、R1〜R3修正版7点・鬼武者Q3-2未回答。一件後修正/Resetは既存能力、一般本人反映入口/操作負担は別。別素材汎化は後続、Short未着工、性能第一期完了。

旧7B2483断片中共通2435/末尾48除外/今回1178新規、旧7A共通2330本文/元ms/発話一致とartifact差を保持。旧307状態/18色/82frameを一括移植しない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。完成背景四参照、正式style/renderer/font ledgerの採用、ROOT後段、演出/動画、人間品質、旧state移行・本番/公開は別。製造許可と品質採用も分ける。

## 6. 保全・受渡し・実稼働

本人承認整理04c21bfd/78805d86：旧8コピー35.79GiB削除、33参照は再作成まで旧runtime即時再読不可。元媒体/STT/inspection/完成媒体/判断/旧stateを保持。upload006の3実体、MP4007の1実体、実判断の1実体を保持。現在の追加削除・復元・SSD操作は未許可。

初回は本人手貼り。現在はCodex2が専用Edgeから同じZEV Build Loopへ直接問い合わせ、返信生成完了・全文読了まで受領する。今回human_decisionを受領後は新許可/着工指示待ち。本人への通常技術事項の転記・視聴・採点は不要。専用tab IDは恒久固定しない。

既存報告先：https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047
新セッションでは実際の報告先を照合する。

main・担当のみ明示stage・Git直列化・他者変更保全。reset/stash/旧成果削除/他者stage・branch/worktree/force pushを自己判断しない。

86875908のremoteと4文書差分はGitHubで確認。Git clean/untracked0・自分のprocess0はCodex報告で、相談役のMac直接観測ではない。今回accept/human_decisionは保存・発行済み、本人回答・Codex返信受領/待機移行・Mac現在processは未確認。方針/指示/完了/中断は同じターンで記録し、非同期監視を装わない。

## 7. 2026-10-03 Codex作業サイクルcleanup運用更新

kawafmmの明示指示で、Codexの一件完了にcleanupを追加した。正本は [CODEX_WORK_CYCLE_CLEANUP_POLICY_v001](policies/CODEX_WORK_CYCLE_CLEANUP_POLICY_v001.md)。

標準順序は **指示受領→preflight→作業→検証→証拠固定→cleanup→own process終了→正本/Git→相談役報告→次指示受領**。現work-order/sessionが生成した一時copy/PCM/grid/途中transcode/scratch/不要work/監査不要の失敗partial媒体は、成果固定・参照切れ確認後に整理する。元素材・受理済みcandidate/人間review媒体・他task成果・正本参照物・容量確保目的の既存成果は自動削除しない。

完了報告へcleanup結果、主な削除/保持理由、媒体作業では可能な範囲の回収容量・空き、own process、Git/untrackedを追加する。これは正式成果や旧成果の一般削除権限を与えない。

現在の製造判断待ち、製品6/設営29、未承認adapter/candidate trust/媒体、保存先・容量、ID9-PD-01/02、人間品質等の現在地は変更しない。
