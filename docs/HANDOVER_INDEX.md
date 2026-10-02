# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-03（JST） / revision：handover-index-20261003-v052
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトにはその写しを置く。

**最新更新：0f103935d50b6c6059f8bf0db723f8be80a6923dを監査。設営27の正本byte読取/新先は適用済み、型検査0。その後既存renderer importがMODULE_NOT_FOUND: reactでrun1、cue診断0・完成出力0。既存layout inspector起動例と同じく、対象診断processだけNODE_PATH=runner/node_modulesを指定し、失敗保全用attempt-003へ移す一件を設営28として個別承認。正本は[NODE_PATH_FIX](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_NODE_PATH_FIX.md)、保存16254bd47eaa8f449ec7a202c88765cb74894ea3。製品6/設営27は実績、28は発行済み・受領/適用/実import/診断完成は未確認。install/恒久環境/製品/renderer変更は許可しない。旧accept・人間回答・未承認境界は不変。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行正本と必要な一次根拠を読む。
4. 役割・現在地・完了・残件・人間回答、発行/受領/実行を区別する。取得/保存不能とMac上の未観測を明示する。

優先順：最新本人指示と適用範囲→現行個別指示→対象実績と一次回答→本書→旧計画。旧会話・添付・メモリだけで復元済みにしない。

更新前v051全文と設営27の適用/React停止は[0f103935固定版](https://github.com/f-kw/zev2/blob/0f103935d50b6c6059f8bf0db723f8be80a6923d/docs/HANDOVER_INDEX.md)へ保持。9dc72330正本読取停止、903d79b4計画時計完成、fda455c4表示回答完成、01b25053記録整形停止、d93e6418技術成功/行末未達、d231a911第一回答停止、a98f569a準備完成、f577bfba準備初回停止、4556e389入力対応、7bb5de02実判断、ccd907a5までのv005履歴を辿る。古い停止・次試験を後のacceptへ逆流させず、過去工事を再実行しない。

## 1. 役割・方針・運用

ZEVは素材と制作意図から内容・構成・字幕・必要な演出を備えた、見ていて気持ちいい動画を作る基盤。Digestが主線、Shortは別系統。一本の生成や試験合格だけで製品完成にしない。

kawafmmは製品方向・任せる範囲・目視/好み・費用/契約/公開等の専決判断。相談役は残課題/優先順位/範囲/現物監査/具体指示/正本保存。Codexは指定内の実装/検証/保存/commit/push/直接報告を担当し、人間品質を代理採用しない。

「終わったら次に進んで」に従い、監査と同じ主線の具体的許可範囲を同じ返答へつなぐ。任意の別エピック・本番・費用・公開・一般権限拡張へ広げない。

今回の起動設営は同一親scopeの完了に直接必要で、既存依存の利用だけ、製品方針/人間判断/費用/権限は変えない。AGENTSの軽微技術判断委任で本人再確認は不要。一般上限・強制停止・Codex自己承認権は変更しない。

履歴：v005製品5/設営15、実判断16/17、入力対応18、準備19/20・製品修正6、表示21/22/23/24、計画時計25、144px補助26、正本byte読取27を保持。現在製品6/設営27、起動設営28は適用時に計上する。新二path初実装は修正回数と別。

人間確認は[台帳](HUMAN_REVIEW_PENDING.md)へ蓄積。未回答を採用にせず、依存しない承認済み作業を進める。15分初見レビュー・既回答・全字幕採点を再要求しない。

## 2. 完了済み・受理範囲

| 項目 | 根拠と成立範囲 | 維持する区別 |
|---|---|---|
| 初稿・15分レビュー | 9/26初稿15:31.633、9/28レビュー、9/29局所回答 | 新素材で初めて一本・初見再レビューへ戻さない |
| 9.構成改善v001 | b69e168c受理、7採用/9保持、15:23.033、局所540p5本/147字幕/111試験、終了68a32038 | 人間品質・新案1080p・汎化は別 |
| Codex1独立点検 | 9b72bc0f、対象bd0113c8、送信b93870fc | 補足後版/局所媒体は独立点検未認定。再起動不要 |
| v002準備/v003消費/v004設計 | 11809f6f、7b600a64、d77f2a5d限定受理 | 旧fixtureを現行実走へ流用しない |
| **v005通常キュー** | **7c8f34ce、親v005 §13 accept、共通状態a64465cb** | 技術完了。追加拒否/転送へ戻さない |
| **実判断付き計画** | **7bb5de02 accept、12候補/7採用/9保持、4工程complete、27,691frame/40,705,770sample、再読0** | 既見素材一件。映像音声/STT/汎化/人間品質は別 |
| **字幕演出入口対応** | **4556e389 accept、18項目の静的対応・不足・再利用条件** | 正式presentation consumer受理とは別 |
| **字幕判断入力準備** | **a98f569a accept、3,613atom/9要求/manifest、658断片比較、11拒否、別process再構築0** | 元scopeと旧失敗保持 |
| **保存9表示要求の実回答候補** | **fda455c4 accept、attempt-004、一行末訂正後の9検査/保存/再読0、218単位/289行** | 36論理幅条件の候補完成。144px/描画/人間品質とは別 |
| **接続前計画時計診断** | **903d79b4 accept、218cue/9区間、unmapped0、型/run0、保存再読一致、95入力不変** | 計画対応。正式timeline/完成媒体/QCではない |
| 旧9:47案1080p/低メモリ | d7e46592、265字幕/307状態、345点QC、本体/replay/保存再読 | 新15:23案全編・通常アプリ生成とは別 |
| 字幕/演出/一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期 | 既存能力を再実装しない |
| Decisions/Jev | 830ea968、9/30調査/36判断点/J16準備、実推論0 | 当時と現在公開状況は別。主線停止理由にしない |

各suite/正実走は別実績。E2E件数に合算せず、upload006親exit未返却を別process exit0へ付け替えない。相談役の受理は保存コード・実測証拠の監査で、Macの全runtime再実行・映像視聴ではない。

## 3. 現在の具体指示 — 診断process限定のNODE_PATH

**再開：[NODE_PATH_FIX](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_NODE_PATH_FIX.md)、保存16254bd47eaa8f449ec7a202c88765cb74894ea3。**
親：[STYLE_COMPATIBILITY](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)。
前修正：[SCOPE_READ_FIX](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_SCOPE_READ_FIX.md)。

### 3.1 監査と限定変更

0f103935の差分・evidence・現在地、既存integrated-preview.mjs/original-resolution-local.mjsの同layout inspector起動を照合した。既存二例はchildのenvへNODE_PATH=runner/node_modulesを渡している。React/Remotionのrunner配下でのrequire.resolve、バージョン18.3.1/4.0.481、元NODE_PATH=nullはCodex実機報告で、相談役の実測ではない。

確認済みworkspaceをcwdに、この診断commandだけへ指定する。

```sh
cd /Users/kawafmm/workspace/zev2 && \
NODE_PATH=/Users/kawafmm/workspace/zev2/runner/node_modules \
node --import ./runner/node_modules/tsx/dist/loader.mjs \
docs/reports/digest-caption-style-compatibility-20261003/check-style.mts run
```

小補助のOUTだけを同parent/attempt-003へ、manifest.historyのsetupを28へ変更する。evidence/README/自分の現在地の実受領HEAD、command/cwd/NODE_PATH、既存解決先、新先・時刻・失敗履歴を追従する。一般上限を変えず設営28の一件として適用時に計上。製品6は維持。

恒久export、shell profile、他process、本番環境、package.json/lockfile/node_modules編集、install/update、新symlink、stub、独自resolver/loader、製品/renderer/Skill/validator変更・複製はしない。既存pnpm symlinkによるmodule読取は許可範囲。旧製造toolは起動しない。

require.resolveの成功や旧起動例だけでは今回の実import成功を認定しない。必要型/preflightと同じ新起動条件の実import/export確認を通して診断へ進む。解決しなければ実例外/解決先を保存して相談役へ返し、installやstubで迂回しない。

### 3.2 scopeと証拠

設営27のbyte/SHA読取、JSON ref/json、path/SHA検査、例外処理を維持する。親正本・evidence.workOrder/出力scopeBindingの実SHA 4e244e34f9b3f04ed338574801a38eccc76e7b1be4fafb5b6a6fed6827b363b5 は不変。今回追補は別path/実SHA/受領HEADへ記録し、設営27のrepairApprovalを消さない。旧helper SHAを付け替えず、新manifestへ今回実行版SHAを束縛する。

旧attempt-001のMarkdown停止、attempt-002のReact停止は別々に保持。failure.json/evidence-snapshot.json、attempt-002のprocess-output.txt、失敗helper SHA 1f346a9dcf1752e765c54938118330d6147defb02efa26c7cb9de2b8b13970a8、0f103935固定版を保全。型0/run1/診断0を後の成功へ書換えない。親と新先不存在、wx新規保存を維持し、旧attemptを消さない。

### 3.3 診断の終点

既存144px・A8/4 Normal技術候補に、218cue/289行を本文・行末・計画時計不変で当てる。比較attempt-003 verificationのraster[tag=0-A,label=0].propsと元candidate-plan/raster-records/font宣言の同参照鎖を使う。7A初期4/4・A8/4・B8/12を混ぜず、欠落は具体的不足として返す。

既存indexExplicitLinesV001/buildExactTextModel/inspectPresentationRenderLayoutV001のdocumentなし推定幅による診断。font binary/DOM stub/ブラウザ描画は使わず、実glyph/raster合格とはしない。Normalのみ、色/motion/背景板/アップは適用しない。

通常の領域不適合は全cueの診断結果として収集し、初件でhelper故障扱いしない。予期しない例外を隠さず、縮小/折返し/safe area緩和で通さない。不適合cue→元要求の最小再準備対象を返し、新要求/回答はまだ作らない。

新小JSON保存再読一回、読んだ旧小入力不変→担当のみcommit/push・Git状態/自分のprocess終了確認→専用Edge直接報告まで進む。新否定suite/別process試験・旧資産全走査、旧run-display/map-timing/通常4工程/QC/人間レビューは追加しない。

### 3.4 固定入力

- 計画時計root：runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/
  - cue-time-map SHA 72eab2201c0bb3e918aabf314ec3c0613f61ef4641a20402db5e7316282a2761
  - manifest SHA 36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179
- 表示回答root：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-004/
  - manifest SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88
- 準備root：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/
  - manifest SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75
  - meaning SHA 6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3
- 元state SHA c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c
- 元draft draft_eCg3g-IMIzEWMtJuMyJWB、prepare agent_xKOu8eZKSNa5viNENtJ4L、validate agent_wGiuVx5QiJvjGUxEW8Qxa
- 元plan SHA cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3、execution SHA 735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37

元60/1・722,162decoded frame・offset0ms、27,691frame/40,705,770sample、8〜526frame/空白15件1220frame/重なり0は保存診断の観測。今回再計算・品質合否化しない。

## 4. 必読根拠への入口

| 資料 | 用途 |
|---|---|
| [NODE_PATH_FIX](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_NODE_PATH_FIX.md) | 設営28、child限定環境、新先・旧失敗保全・終点 |
| [SCOPE_READ_FIX](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_SCOPE_READ_FIX.md)、[親STYLE_COMPATIBILITY](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md) | 適用済みbyte読取、SHA不変の診断scope |
| [現report](reports/digest-caption-style-compatibility-20261003/README.md)、[evidence](reports/digest-caption-style-compatibility-20261003/evidence.json)、[helper](reports/digest-caption-style-compatibility-20261003/check-style.mts) | 二回の停止、正本読取修正適用、React import未解決 |
| [integrated-preview](../tools/digest-quality/integrated-preview.mjs)、[original-resolution-local](../tools/digest-quality/original-resolution-local.mjs) | 同layout inspector childへの既存NODE_PATH指定。旧処理は起動しない |
| [計画時計report](reports/digest-caption-plan-timing-20261003/README.md)、[evidence](reports/digest-caption-plan-timing-20261003/evidence.json) | 903d79b4受理・現在の計画frame |
| [表示report](reports/digest-caption-display-answers-20261003/README.md)、[evidence](reports/digest-caption-display-answers-20261003/evidence.json) | fda455c4受理、最終004束と失敗履歴 |
| [準備report](reports/digest-caption-input-preparation-20261003/README.md)、[入力対応mapping](reports/digest-presentation-input-mapping-20261002/mapping.json) | 意味入力・参照・供給元と不足 |
| [9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md)、同[verification](reports/caption-readability-splitting-20260928/verification.json)/[current-inspection](reports/caption-readability-splitting-20260928/current-inspection.json)/[candidate-connection](reports/caption-readability-splitting-20260928/candidate-connection.json) | 144px/条件付き分割、縁未選択、対象版参照 |
| [rendererモデル](../evals/clip_composition/presentation_renderer_entry_v001.tsx)、[領域検査](../evals/clip_composition/inspect_presentation_render_layout_v001.ts)、[text metrics](../runner/src/telop/text-metrics.ts) | Node推定幅とrasterの区別 |
| [人間台帳](HUMAN_REVIEW_PENDING.md)、[開発計画](../相談役/方針/ZEV_開発計画.md) | 未回答・残エピック |

## 5. 人間回答・残課題

144pxと「読む必要がある文章でなかったら」の条件付き分割、水色/カラフル方向肯定を保持。最終style・物理幅・表示時間・見心地採用へ無条件拡張しない。

縁A8/4は技術入力、outlineChoice=null。B8/12は21論理不合格で実alphaによる保証免除なし。強調変更B未肯定、LightCoral技術不合格と好みの区別、固定1.2倍82frameアップのHUD/人間品質/自動選択未解決を維持。

旧10回答・15分レビューは済み。R1〜R3修正版7点、鬼武者Q3-2は未回答。一件後修正/Resetは既存能力、一般本人反映入口/操作負担は別。別素材汎化は後続、Shortは開始しない。性能第一期完了。

旧7Bの2483断片中共通2435/旧末尾48除外/今回1178新規、旧7A共通2330の本文/元ms/発話ID一致とartifact差を保持。旧307状態/18色/82frameを一括移植しない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。完成背景4参照、正式style/renderer/font ledgerの採用、ROOT基準後段接続、演出/動画許可/人間品質、旧state移行・本番・公開は別。新レビューを本作業の開始条件にしない。

## 6. 容量・禁止・保全

本人承認整理04c21bfd/78805d86：8コピー35.79GiB削除、33参照は再作成まで旧runtime即時再読不可。元素材/STT/inspection/完成媒体/判断/旧stateは保持。

upload006の3実体、MP4007の1実体、実判断の1実体4803412827bytesを保持。実判断終了時空き12933283840bytesは過去観測、現在空き/SSD未確認。容量整理・SSD・削除はしない。

製品/旧helper/Skill/validator/renderer、元purpose/承認/旧scope/要求/回答/時計は不変。媒体/フォントbinary read/hash/copy/PUT、通常HTTP/backend/index runner、新API/provider/費用、STT/inspection/ffprobe、内容再判断・cue/時計変更・新要求/回答、描画/画像/背景/演出/動画、新queue/UI、本番/公開は禁止。moduleのimportを描画実行許可にしない。

## 7. 受渡し・実稼働・Git

初回は本人手貼り。現在は同じCodex2が専用EdgeからZEV Build Loopへ直接送り、返信生成完了・全文読了まで受領して指定範囲を続行する。本人への再手貼り/転記/視聴/採点は不要。実UI/通信障害以外は返信生成中を終了理由にしない。自分専用タブだけを使い、tab IDは恒久固定しない。

既存報告先：https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047
新セッションでは実際の報告先を照合する。

main・担当のみ明示stage・Git操作直列化。他者変更をreset/stash/削除/stageせず、branch/worktree/force pushを自己判断で作らない。Codex1起動・受理だけの独立commitは不要。旧未調整案停止を承認へ遡及変換しない。

0f103935のpush/Git clean/untracked0・実run終了はCodex報告と保存証拠。相談役がMacの現processを直接観測したものではない。設営28の正本は保存・発行済み。受領・適用・実import・attempt-003診断完成は未確認。方針/指示/中断/完了は同じターンで保存し、自動監視・非同期作業を装わない。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・144px技術候補と表示回答の適合。
診断後も新要求/実回答・背景製造・正式style確定・動画へ自動着工しない。
