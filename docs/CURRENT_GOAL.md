# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 最新の製造前checkpoint — 2026-10-03 11:19 UTC

本人10:30:45 UTC「これでいこう」で見本2枚の216px・左右半文字余白を今回一本に採用し、10:31:17 UTC「システムとしては固定じゃなくて可変にして」を受領した。既存入力の文字サイズ/余白設定から導出し、今回値216px/左右108px/幅15/最大2行を保存する。一般default/trustの変更や全字幕・動画の品質採用ではない。[本人記録と今回報告](reports/digest-caption-216px-reflow-20261003/README.md)を参照。

新attempt-002の実判断9件、正式reader/trace/correspondence再読、372件の推定配置とsource能力検査が成立。旧243cue/390行を372cue/668行へ再配置し、3,613atom/9区間/本文/元ID/順序/原時計/元音声/27,691frame/40,705,770sampleを維持した。manifest SHA `784775c621913ba263057671b580b34082a349e007b8c155ed4bb0bafe351444`。8frame以下の孤立表示の観測0、最短12frame。12frame/15frame等の実可読性は未評価。

旧固定TASKが新要求を拒否したため、親相談役の10:54 UTC限定承認（[記録](reports/digest-caption-216px-reflow-20261003/source-connection-decision-record.json)は10:56:15 UTC）でsource package接続1pathを追加し、実装範囲は既存6＋1の7path、test別。旧TASK/旧readerと既存検査を保持し、旧TASKへの書換えを含む10改ざん、偽資格、clone、別計画、実bytes/hash不整合を拒否した。11:14:34 UTCの正式repo事前検査・11:14 UTCの型検査はpassed。既存source package suiteは7/7 passed・exit0。

APFSは10:25 UTCの4KB限定probeで保存/再読/保護を確認し、11:15:40 UTCにUUID/device/imageとguest空き99,665,981,440bytes、host空き2,000,257,286,144bytes、内蔵空き13,602,562,048bytes、pressure1を再確認して開始条件passed。小probeは速度/全工程保証ではない。製造用許可転記record v002を作成済み。動画製造/全字幕の実glyph/動画QC/全実視聴は未実施、production prefix未作成。

状態は作業中、最終確認11:19 UTC、次担当はこのMacの実装者。checkpoint実装SHA/permit/出力rootの一致後、今回のNormal一本と既存QCへ進む。同じ216px条件の本人再承認は不要。humanQuality=pending、outlineChoice=null、一般本適用/新素材/API費用/公開/旧成果削除の境界を維持する。以下の10:16以前の未再mount・人間待ち・未承認記載は当時の履歴。


## 最新本人指示と216px再配置 — 2026-10-03 10:16 UTC

本人09:52 UTC「フォントは１.５倍くらい」「左右には半文字分くらい」「それで進めて」に基づき、今回candidateだけ216px/実ink左右各108px以上・最大2行への再配置を実行中。必要なcue/行境界・候補表示規則/追跡/検査変更と、成立後の同じ15:23.033 Normal一本/既存QCが承認済み。本文/元ID/3613atom/9区間/元音声/27691frame/40705770sampleを保持、意味編集/一般style/trust/default/新素材/費用/公開/旧成果削除なし。

10:08 UTCに[216px早期見本2枚](reports/digest-caption-216px-reflow-20261003/README.md)を既存rendererで描画。実inkの左右余白220px/218pxと207px/207px、行順/欠けを原寸確認、実alpha領域外0。1枚目は長い発話の前半のみで省略採用ではない。2枚を全字幕や実映像品質の合格にしない。

旧243の外側cue固定は実装者の保守的な仮制約で本人条件ではない。最初の候補で短い新cueや長い文節の衝突を確認したため、同9区間内の必要な区切り見直しと長文節の自然な同cue内改行を候補専用規則として明示し、新要求/新hash/実判断で再配置する。旧要求/回答/証拠は保持し、検査免除や本文/時計の変更にしない。動画未開始、APFS未再mount。次担当Mac実装者、作業中。親monaが早期画像を届ける。同じ216px条件の本人再承認は不要。

以下09:17の人間待ちは最新指示前の履歴。

## 最新個別指示と2枚preview — 2026-10-03 09:17 UTC

本人09:00:50 UTC「いいよ」はmona08:02提案の「文字サイズと改行を維持し、左右余白だけ狭めた確認画像2枚」への承認。09:14 UTCに既存rendererで指定2cueを描画し、PNGの実alpha/safeArea/行位置と原寸表示を確認した。144px/縁8/光彩4/本文/改行/位置を維持、変更は未採用preview propsの横余白.04→0だけ。動画/候補trust/一般設定の適用は0。

2行例は完成3.900秒、実文字端の左右距離19px/39px。1行例は243.533秒、21px/35px。2行間に54px透明帯、外周のalpha0、明らかな欠けは見当たらなかった。背景は無地なので実映像での読みやすさ・全尺品質・本人採用は未評価。2枚を全243字幕の合格にはしない。

[2枚と今回報告](reports/digest-horizontal-margin-preview-20261003/README.md)・[証拠](reports/digest-horizontal-margin-preview-20261003/evidence.json)・[session log](work-logs/2026-10/2026-10-03T0902_Codex_ID9-two-margin-preview_d91f9c0f.md)。Library保存はMac向け接続に必要機能がなく保存前に失敗、ID未発行。親monaが画像を届けた後、この配置で今回一本を進めてよいか一問確認する。実装者は人間待ち、動画への変更は本人回答後。自renderer残存0、APFS再mountなし。

以下07:44停止はpreview承認前の履歴。正式一本は現在も未生成。

## 前工程の停止 — 2026-10-03 07:44 UTC

本人07:06:03 UTC「いいよ」で、SSD上に新100GB以下APFS image、指定6pathの保存先対応、保存済み一計画のNormal一本/既存QCを承認。07:18:46 UTCの小probeでは保存/再読/排他/hard link/chmod write拒否/通常再mount後の保護が成立した。旧ExFAT保護不足はこの方式で解消する必要条件を満たした。一般ROOT/trust/defaultは不変。

6pathの実装候補と元owner/9traces/243cue/390行/3613atom/27691frame/40705770sampleを確認したが、正式margin0.04では32/243字幕が推定画面幅を超える。保存候補はmargin0でNode領域検査済みだった。first完成3.900秒、正式rendererから全32件を再構成しても結果一致。glyph/媒体生成/技術動画QC/実視聴は未実施、production prefix/候補trust未生成。動画生成前に停止。

[今回報告](reports/digest-formal-apfs-preflight-20261003/README.md)、[許可転記](reports/digest-formal-apfs-preflight-20261003/authorization-record.json)、[session log](work-logs/2026-10/2026-10-03T0707_Codex_APFS_ID9-formal-preflight_f2ef2214.md)を最新現在地とする。次はmona/相談役が今回candidate-only horizontalSafeMarginRatio=0の具体差分とpreview/必要な本人承認を判断。無断の数値変更、一般trust変更、検査免除、旧成果再判断はしない。

自probe整理済み、guest refs0を確認して07:47:03 UTC通常detach、image保持。SSD全体はejectしていない。製造process0/自test残存0。他者変更/停止0。製品6/設営29、旧accept、人間品質pending/outlineChoice=nullを維持。以下の本人回答未受領/SSD未確認は指示前の保存履歴。

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

## 3. 現在の一件 — 正式描画条件の判断待ち

一件の実装/製造scopeは承認済み。保存方式の小試験と6path候補を保存した。正式な一本は未生成。最新の2枚previewは完成したが、画像配信と配置の本人回答が残る。次に動く担当はmona/相談役、実装者は停止。

144px/A8/4/26/2・元9区間/243cueを正式trustの横余白4％へ接続すると32件が推定配置不合格になる。元候補の横余白0へ合わせる場合も「元trust layoutRules不変」を超える具体的変更として扱い、小previewと必要な本人承認を受けてから有効化する。次工程で許可されたら同imageを現実のmount/device/UUID/空きへ読み直し、コードSHA・許可・出力prefix・製造recordを再束縛する。再接続で自動再開しない。

許可implementationは新adapter、Core adopted_media_manufacturing_v001.mts、renderer caller/render、低メモリcomposite、監視v002の六path。一般style resolver/ROOT/trust/default/publisher/unused overlay sessionは変更しない。font/runtime/code/admission/QC免除なし。50GB開始/12GBreserve/16GiB RSS/pressure1/1秒/next-unit+reserve/own PGID停止、hostとguestと内蔵の別監視を今回scopeだけに実装した。guest小IO成功を全工程成功へ扱わない。

## 4. 人間回答・未承認事項

presentation=not-connected／executionPermission=one-saved-plan-scope-approved-but-stopped-before-media／humanQuality=pending／outlineChoice=null。ID9-PD-01一般本適用は未承認、今回一計画のscopeだけ承認済み。144px方向・条件付き分割・水色/カラフル方向肯定を保持。A8/4は技術入力で縁選択ではない。26条件を実glyph・見心地・正式styleの採用にしない。

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
