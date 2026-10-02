# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-03（JST） / revision：handover-index-20261003-v053
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトにはその写しを置く。

**最新更新：ebc2269f382718e8c04a8ce2bd9176298592806bの144px/A8/4適合診断を相談役accept。218cue/289行/3,613atomの内容と計画時計不変、適合120/不適合98/評価不能0、型/run0・保存再読一致。必須追加修正なし。次は新26論理幅/2行の9要求に対し120cueを固定再利用、98cue内だけ行末/必要分割を実判断して候補一式を完成させる。正本は[144PX_REFLOW](work-orders/ZEV_DIGEST_CAPTION_144PX_REFLOW_20261003_v001.md)、保存1bdb9b12f84d872fe1f38547093d39d6151fbb49。製品6/設営28は実績、29は小補助作成・適用時に個別計上。新指示受領/適用/実行は未確認。縁・最終style・背景・動画・一般本適用・人間品質は未承認のまま。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、その同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行指示と必要な一次根拠を読む。
4. 役割・現在地・完了・残件・人間回答、指示発行/受領/実行を区別する。取得/保存不能、Macでの未観測を明示する。

優先順：最新本人指示と範囲→現行個別指示→対象実績と一次回答→本書→旧計画。旧会話・メモリだけで復元済みにしない。

更新前v052全文と144px診断完成は[ebc2269f固定版](https://github.com/f-kw/zev2/blob/ebc2269f382718e8c04a8ce2bd9176298592806b/docs/HANDOVER_INDEX.md)へ保持。0f103935のReact停止、9dc72330の正本Markdown停止、903d79b4時計、fda455c4表示回答、01b25053/d93e6418/d231a911表示過程、a98f569a/f577bfba準備、4556e389入力対応、7bb5de02実判断、ccd907a5までのv005履歴を辿る。古い停止・未完了を後のacceptへ逆流させない。

## 1. 役割・方針・運用

ZEVは素材・制作意図から内容/構成/字幕/必要演出を備え、見て気持ちいい動画を作る基盤。Digestが主線、Shortは別。一本の生成や試験成功だけを製品完成としない。

kawafmmは製品方針・任せる範囲・目視/好み・費用/契約/公開等の専決判断。相談役は残課題/優先順位/範囲/現物監査/具体指示/正本保存。Codexは承認範囲の実装/検証/保存/commit/push/直接報告。人間品質を代理採用しない。

「終わったら次に進んで」に従い同じ主線の具体的範囲を監査と同じ返答へつなぐ。今回は候補作成を明示許可したが、一般本適用/動画/費用/権限拡張へ広げない。旧診断のscopeは変更せず新正本を別束縛する。

軽微修正の個別委任はAGENTSどおり。一般上限・強制停止・Codex自己承認権は不変。現在製品修正6/設営28。v005製品5/設営15、実判断16/17、対応18、準備19/20・製品6、表示21/22/23/24、時計25、適合26/27/28と新二path初実装を区別する。今回補助を作成・適用した場合だけ設営29。

人間確認は[台帳](HUMAN_REVIEW_PENDING.md)へ蓄積し、未回答を採用にせず、依存しない承認済み作業は進める。15分初見レビュー・旧10回答・全字幕採点を再要求しない。

## 2. 完了済み・受理範囲

| 項目 | 根拠・成立範囲 | 保持する区別 |
|---|---|---|
| 初稿・15分レビュー | 9/26初稿15:31.633、9/28レビュー、9/29局所回答 | 初見レビューや新素材初一本へ戻さない |
| 9.構成改善v001 | b69e168c受理、7採用/9保持、15:23.033、局所5本147字幕/111試験、終了68a32038 | 新案全編1080p/人間品質/汎化は別 |
| Codex1点検 | 9b72bc0f、対象bd0113c8、送信b93870fc | 補足後版/局所媒体は独立点検未認定。再起動しない |
| v002/v003/v004 | 11809f6f、7b600a64、d77f2a5d限定受理 | 旧fixtureを現行実走へ合算しない |
| v005通常キュー | 7c8f34ce、親v005 §13 accept、a64465cb | 技術完了。追加拒否/転送へ戻さない |
| 実判断付き計画 | 7bb5de02 accept、12候補/7採用/9保持、4工程complete、27,691frame/40,705,770sample、再読0 | 既見素材一件、人間品質は別 |
| 字幕演出入口対応 | 4556e389 accept、18項目の静的対応 | consumer受理と別 |
| 字幕判断入力準備 | a98f569a accept、3,613atom/9要求、658断片比較/11拒否/再構築0 | 元scope・旧失敗保持 |
| 保存9表示回答 | fda455c4 accept、attempt-004、218cue/289行、訂正後検査/再読0 | 元36論理幅条件。144px適合と別 |
| 接続前計画時計 | 903d79b4 accept、全218cue対応、unmapped0、95件不変/再読一致 | 計画値で正式timeline/完成媒体ではない |
| **144px/A適合診断** | **ebc2269fを今回accept、120適合/98不適合、型/run0、48入力/実装・5失敗file不変** | Node推定幅。実glyph・縁選択・最終styleではない |
| 旧9:47案1080p/低メモリ | d7e46592、265字幕/307状態、345点QC、本体/replay/再読 | 新15:23案全編と別 |
| 字幕/演出/一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期 | 実装済みを再作成しない |
| Decisions/Jev | 830ea968、9/30調査/36判断点/J16準備、実推論0 | 当時の未確認と現在を区別。主線停止理由にしない |

各suite・正実走は独立の実績。件数をE2Eへ合算せず、upload006の親exit未返却を別process exit0へ付け替えない。相談役受理はGitHub保存コード/証拠の監査で、Mac全runtime再実行や媒体視聴ではない。

## 3. 現在の具体指示 — 98cue限定再調整

**[ZEV_DIGEST_CAPTION_144PX_REFLOW_20261003_v001.md](work-orders/ZEV_DIGEST_CAPTION_144PX_REFLOW_20261003_v001.md)、保存1bdb9b12f84d872fe1f38547093d39d6151fbb49。**

### 3.1 受理と次条件

ebc2269fのhelper全文・report/evidence・commit差分、実表示Skill/validatorの入出力契約を監査。不適合98件は全9要求へ分布し、右端116行だけが領域超過。元218cueの内容は不変。診断自体は完成で追加修正不要。

同一A技術候補の幅1912px、stroke/glow24px、padding12px、1論理重み72pxから26重みなら1908px、27なら1980px。新入力候補を26論理幅/2行とする。26文字ではない。renderer/registry/default/旧36は変えない。推定下限に基づく候補で実glyph適合保証ではなく、正式assemblyのstyle整合は別。

### 3.2 新要求と回答範囲

旧9要求の実bytes/SHA・意味/診断対応を確認し、別fileの9新要求を作る。同じschemaを用い、変更は新requestId、input.styleLimits.maxLogicalWidthPerLine、再計算するinputCanonicalSha256のみ。元意味/plan/machineAdoption参照、本文/境界/atom/caption ID、taskDescription、2行/文字幅規則を維持する。新fileの実bytesからSHAを作り、旧要求/旧回答SHAを付け替えない。新条件/A候補/実装/旧要求/今回scopeと固定範囲は新manifestへ束縛する。

120適合cueは本文・atom列・cue末・行末・元ms/計画frameを固定。不適合98cueだけ本文/前後文脈を読み直して行末を調整し、必要な場合だけその旧cueの内部へ追加cue境界を置く。旧218cueの外側境界は維持し、隣の旧cueとの結合や120への侵入をしない。全9保持区間・候補6の三非連続・全3,613atom/drop非混入を保持する。

新要求提示後に、固定部分の判断は参照付き再利用し、可変部分だけCodexが実回答する。新response全fileは新規であり旧responseの丸ごと再利用とはしない。新result/token/traceを実Skill/validatorから得る。本文訂正・省略・句読点創作・一律機械折返しはしない。既回答「読む必要がある文章でなかったら」の分割条件を維持する。

### 3.3 完了まで一系列

要求準備だけで止まらない。新要求→限定実回答→既存26/2/被覆検査→120固定/98内差分→同じA/Node領域検査→変更子cueの既存frame算術→保存束→別process一回の判断なし再構築までを許可する。

新分割は元atomのmsと既存frameBoundaryWithVideoOffsetV001/sourceEndFrameBoundaryWithVideoOffsetV001、保存9mappingの平行移動だけ。旧cue外側frame、未変更cue、元27,691frame/40,705,770sampleを維持。zero-frame/範囲外等は隠さず返す。表示延長/読速閾値/仮timeline/新sample計算は作らない。新cue/行数を218/289に固定しない。

許可Git pathはdocs/reports/digest-caption-144px-reflow-20261003/run-reflow.mts、README.md、evidence.jsonと自分の現在地。新runtimeはruntime/artifacts/digest-caption-144px-reflow-20261003-v001/attempt-001/。製品変更なし、小補助適用時だけ設営29。

既存公開関数を使い、reader/Skill/validator/製品を複製・改変しない。対象childだけ既存NODE_PATH/tsx loader、既存moduleの実import、必要型/返却shape/入力SHA/親実在/新先不存在、byteとJSONの読取区別を先に確認。標準JSON・単一writer・排他新規保存。旧scope/成果はread-only。

今回の新候補を閉じる受入検査と保存再読だけを行う。新否定suite・旧4工程/旧suite/QC/人間レビュー・全過去資産走査を追加しない。必要境界がなく収まらない等は最小対象だけGPT_DECISIONへ返し、120の再判断・validator緩和・font縮小で隠さない。

### 3.4 固定入力SHA

- 適合診断attempt-003：compatibility SHA eb7a7a69c97722fc8433f73d4dbfd7733125d652903498cc1642f036c5336525、manifest SHA 948c1e11d2e6c6745c280f3c1797af956bd47a6b160810018525ba4b9516c02d。
- 表示回答attempt-004：manifest SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88。
- 準備attempt-002/bundle：manifest SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75、meaning SHA 6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3。
- 計画時計attempt-001：cue-time-map SHA 72eab2201c0bb3e918aabf314ec3c0613f61ef4641a20402db5e7316282a2761、manifest SHA 36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179。
- A比較verification SHA 2eb9421958f975f9fd0f5200626711c8b61d53fcbf6970b034d5c5ef9c456f0d、raster[tag=0-A,label=0].props。
- 元draft draft_eCg3g-IMIzEWMtJuMyJWB、prepare agent_xKOu8eZKSNa5viNENtJ4L、validate agent_wGiuVx5QiJvjGUxEW8Qxa、state SHA c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c。

## 4. 必読根拠

| 資料 | 用途 |
|---|---|
| [現正本144PX_REFLOW](work-orders/ZEV_DIGEST_CAPTION_144PX_REFLOW_20261003_v001.md) | accept・新要求/限定再回答/保存までの唯一の新scope |
| [診断report](reports/digest-caption-style-compatibility-20261003/README.md)、[evidence](reports/digest-caption-style-compatibility-20261003/evidence.json)、[helper](reports/digest-caption-style-compatibility-20261003/check-style.mts) | 全120/98の根拠、cue対応、A束と48参照、失敗/完了履歴 |
| [親診断](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)、[NODE_PATH_FIX](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_NODE_PATH_FIX.md) | 完了済み・SHA束縛済みscope。編集しない |
| [計画時計report](reports/digest-caption-plan-timing-20261003/README.md)、[表示report](reports/digest-caption-display-answers-20261003/README.md)、[準備report](reports/digest-caption-input-preparation-20261003/README.md) | 元本文/行末/時計・保存束と来歴 |
| [表示Skill](../runner/src/skills/caption-display-boundaries-v001.ts)、[表示検査](../evals/clip_composition/adopted_media_manufacturing_v001.mts) | 入力/回答の既存型、canonical/bytes/全被覆/幅/trace検査 |
| [rendererモデル](../evals/clip_composition/presentation_renderer_entry_v001.tsx)、[領域検査](../evals/clip_composition/inspect_presentation_render_layout_v001.ts)、[text metrics](../runner/src/telop/text-metrics.ts) | 同一Nodeの論理領域検査、実glyphとは区別 |
| [9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md)、[人間台帳](HUMAN_REVIEW_PENDING.md)、[開発計画](../相談役/方針/ZEV_開発計画.md) | 既回答と未回答、残エピック |

## 5. 人間回答・残件

144px方向と条件付き分割、水色/カラフル方向の肯定を保持。A8/4は技術入力でoutlineChoice=null、B8/12は21論理不合格。強調変更B未肯定、LightCoral技術不合格と好みの区別、固定アップ1.2倍82frameのHUD/自動選択/人間品質は未解決。

旧10回答・15分レビューは済み、R1〜R3修正版7点・鬼武者Q3-2未回答。一件後修正/Resetは既存能力、一般本人反映入口/操作負担は別。別素材汎化は後続、Shortは未着工、性能第一期は完了。

旧7Bの2483断片中共通2435/旧末尾48除外/今回1178新規、旧7A共通2330の本文/元ms/発話ID一致とartifact差を維持。旧307状態/18色/82frameを一括移植しない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。背景media/timeline/manifest/receiptの4参照、最終style/renderer/font ledgerの採用・正式assembly整合、ROOT基準後段、演出/動画、人間品質、旧state移行・本番/公開は別。今回候補の26条件を最終style採用へ昇格しない。

## 6. 保全・容量・禁止

本人承認整理04c21bfd/78805d86：旧8コピー35.79GiB削除、33参照は再作成まで旧runtime即時再読不可。元素材/STT/inspection/完成媒体/判断/旧state保持。upload006の3実体、MP4007の1実体、実判断の1実体4803412827bytesを保持。実判断終了時空き12933283840bytesは過去観測、現在空き/SSD未確認。

媒体/フォントbinary read/hash/copy/PUT、通常HTTP/backend/index runner、新API/provider/費用、STT/inspection/ffprobe、色/motion/アップ判断、描画/画像/背景/音声/動画、新queue/UI、SSD、削除、本番/公開は禁止。元purpose/承認/旧scope/成果を変更しない。今回許可は指定新候補の小JSONと既存module利用のみ。

## 7. 受渡し・実稼働・Git

初回は本人手貼り。現在は同じCodex2が専用Edgeから同じZEV Build Loopへ直接送り、返信生成完了・全文読了まで受領して指定範囲を続行する。本人の再手貼り/転記/視聴/採点は不要。実UI/通信障害以外で生成中を終了理由にしない。専用tab IDは恒久固定しない。

既存報告先：https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047
新セッションでは実報告先を照合する。

main・担当のみ明示stage・Git直列化・他者変更保全。reset/stash/削除/他者stage、branch/worktree/force pushを自己判断で行わない。Codex1起動・受領だけの独立commitは不要。

今回acceptと次指示は保存/発行。ebc2269fのpush/Git clean/process0はCodex報告と保存証拠。相談役はMacの現在processを直接観測していない。新指示受領、設営29適用、限定再回答の開始/完成は未確認。方針/指示/中断/完了は同じターンで正本へ保存し、自動監視/非同期作業を装わない。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・144px候補への限定表示再調整。完成後も背景/正式style採用/演出/動画へ自動着工しない。
