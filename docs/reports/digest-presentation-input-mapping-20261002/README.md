# 9の後続 — 字幕演出入口の入力対応

2026-10-02、Codex2。専用Edgeから前件7bb5de02の技術acceptと限定読取準備の続行指示を全文受領。main 9acea7e2b04752af7e04f02e55b3ab359e6b0f97へ他者変更を保持して同期し、正本全文・CURRENT_GOAL/HANDOVERを確認した。

正本：[ZEV_DIGEST_PRESENTATION_INPUT_MAPPING_20261002_v001.md](../../work-orders/ZEV_DIGEST_PRESENTATION_INPUT_MAPPING_20261002_v001.md)。目的は保存済み9区間・3,613保持断片を既存字幕/演出の必須入力へ対応付け、供給元・不足・再利用条件・最小接続案を保存すること。新しい字幕/演出の判断や製造は行わない。

受領時点のGit差分・untrackedは0。前件の4工程とreaderは再実行していない。媒体read/hash/copy/PUT、動画・画像、API、SSD・削除は0。個別承認の小対応補助を作成・実行し、累積は製品5／設営18。設営17までの履歴と一般上限は不変。

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null。既存の人間回答とID9-PD-01/02を維持する。

## 結果と確認範囲

**9区間・3,613保持断片の本文、元断片、共通発話、元ms、保存frame/sample時計を対応付けた。既存字幕・演出入口への18項目の入力対応と、最初の接続差分一案を保存した。製品接続・字幕や演出の実回答・製造は未実施。**

[mapping.json](mapping.json)に、正常保存の論理参照、実保存path、実bytesのSHA、現行関数と入力field、不足、旧成果再利用条件、接続案を保存した。大量本文をGitへ重複保存せず、詳細は新しいignored runtimeの `runtime/artifacts/digest-presentation-input-mapping-20261002-v001/attempt-001/input-correspondence.json` に保存した。

詳細診断は1,053,795 bytes、SHA `e6b4b7e4662600b219742b5f5adb067d692f4da9d2262de57e75201cf967b64f`。9区間ごとに全元断片ID列・本文・元ms・共通発話ID・採用理由・保存時計を持つ。新しいcue、行末、強調、配色、演出、各atomの出力時計は作っていない。各atomの元msを所属区間の保存時計に対応付けた記録である。

小JSONは既存の論理参照resolverと依存鎖から実保存先へ辿った。媒体bindingは開かず、論理 `artifacts/<draft>/<producer>/<file>` と実file名 `<producer>--<file>` の対応を用いた。前件の通常4工程やconsumer再読は既受理のまま維持し、今回は再起動していない。

## 保存計画の文字と時計

sourceは同じ保存素材 `-2UUTkv9qvk`、draft `draft_eCg3g-IMIzEWMtJuMyJWB`。計画は `agent_xKOu8eZKSNa5viNENtJ4L`、検証は `agent_wGiuVx5QiJvjGUxEW8Qxa` の正規所有物。保存計画SHA `cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3`、検証成果SHA `735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37` を小JSONの実bytesで照合した。

出力frame/sampleは既存時計の境界をそのまま記す。frameは30fps、sampleは44,100Hz、終端はexclusive。これは接続前の計画時計であり、完成動画の実測ではない。

| 順序／区間 | 候補 | 元断片・件数 | 元ms | 出力frame | 出力sample |
|---|---|---|---|---|---|
| 1 / segment-0001 導入 | candidate-0001 | 68–284 / 217 | 159770–213077 | 0–1599 | 0–2350530 |
| 2 / segment-0002 犬の会話と結論 | candidate-0002 | 285–942 / 658 | 213077–327084 | 1599–5020 | 2350530–7379400 |
| 3 / segment-0003 ゲーム説明 | candidate-0003 | 1129–1248 / 120 | 355551–379620 | 5020–5742 | 7379400–8440740 |
| 4 / segment-0004 ベテランからクリア確認 | candidate-0004 | 7689–8721 / 1033 | 1993090–2256057 | 5742–13631 | 8440740–20037570 |
| 5 / segment-0005 貞子の会話と結論 | candidate-0005 | 18662–19439 / 778 | 5468987–5675926 | 13631–19839 | 20037570–29163330 |
| 6 / segment-0006 追加挑戦の前提 | candidate-0006 | 21936–22193 / 258 | 6394302–6449886 | 19839–21507 | 29163330–31615290 |
| 7 / segment-0007 異変の増加 | candidate-0006 | 25129–25286 / 158 | 7566646–7620361 | 21507–23119 | 31615290–33984930 |
| 8 / segment-0008 終盤の焦りと反応 | candidate-0006 | 25364–25530 / 167 | 7662774–7751288 | 23119–25775 | 33984930–37889250 |
| 9 / segment-0009 断念・労い・ゲーム終了 | candidate-0007 | 25531–25754 / 224 | 7759082–7822947 | 25775–27691 | 37889250–40705770 |

採用候補7件と保持区間9件は別の単位。追加挑戦の3区間を候補名だけで結合せず、それぞれの区間ID・元断片列・出力順序で対応した。区間間の空白やdrop3,460断片を復活させていない。元frameと元sample、本文SHAと理由はmappingの各区間、全文・ID列は詳細診断へ保存した。

## 現保存物から既存入口への対応

以下は現物と実装に基づく静的対応。今回これらのconsumerを呼び、受理させたものではない。各元保存path/SHAとfieldはmappingの `inputMapping` と `sourceReferences` に記録している。

| 処理の意味 | 現保存物 → 既存の入力 | 成立する範囲／不足 |
|---|---|---|
| 制作目的と採用理由 | 制作意図・承認snapshotの全文、採用と保持の理由 → 表示要求の目的、演出判断の制作目的・文脈 | 原文を供給可能。現在の依頼は字幕演出を作らないと明記しており、新判断の許可にはしない |
| 字幕本文の元断片 | STT本文・元ms、共通発話の所属 → [buildAdoptedCaptionInputsV001](../../../evals/clip_composition/adopted_media_manufacturing_v001.mts#L175) の本文・意味atom | 全3,613断片を供給可能。新要求のatom/caption/boundary IDはまだ作っていない |
| 保持範囲と順序 | 採用/編集案の区間ID・元断片列・元ms → 同関数の `timelineSegmentId` と `sourceInterval` | 平坦な通常保存fieldからの機械的対応が必要。candidateだけでまとめない |
| 時計 | 保存時計の元ms・元frame/sample・出力frame/sample → 既存timeline処理の入力 | 9区間の時計はある。完成timeline、cue時計、接続後時計は未生成 |
| 背景の4参照 | 背景media、timeline、生成manifest、検証receipt → 字幕source packageの背景入力 | **今回9区間の4出力は未製造。** 元source-media、時計結果、元inspectionを代入しない |
| styleとrenderer | 保存templateのstyle入力/制限/registry、renderer実行入力/font ledger → source package、[assembleAdoptedCaptionCoreV001](../../../evals/clip_composition/adopted_media_manufacturing_v001.mts#L286) | 旧templateは再利用候補。今回style/rendererに採用したわけではない |
| 表示判断 | 保持本文から作る表示境界候補 → [既存表示Skill](../../../runner/src/skills/caption-display-boundaries-v001.ts#L8) → [表示回答検査](../../../evals/clip_composition/adopted_media_manufacturing_v001.mts#L238) | 今回の表示要求・SHA・cue/行末回答・検査結果は未生成。旧回答を新SHAへ付け替えない |
| 字幕coreの組立 | 同一要求の検査結果、意味入力、timeline、style → 同上assemble | 保存からは真正な要求/回答/結果を再検査する。WeakMap tokenをJSONで捏造しない。現在未接続 |
| 演出判断 | 新字幕のID/本文/出力時計、文脈、観測、native入力 → [createOrchestrationContextV001](../../../evals/clip_composition/presentation_orchestration_v001.mjs#L68)、[演出判断入力](../../../evals/clip_composition/presentation_orchestration_v001.mjs#L159) | normal字幕planとnative decision binding、今回演出回答がない。採用理由と素材時計だけでは満たせない |
| 色を含む回答と復元 | 実演出入力・original/normalized回答 → [既存palette判断保存/復元](../../../evals/clip_composition/presentation_auto_effects_palette_v001.mjs#L23) | 旧18色・307状態・固定アップ82frameを新IDや時計へ移植しない |
| 通常storeの参照と保存 | 正規owner/依存鎖、論理参照 → 既存resolver/registry | 小JSONは実bytesへ解決できる。旧固定CLIとROOT基準の `readBound` は通常storeの入口になっていない |
| 許可と品質 | 承認snapshot・現在admission → source package/rendererの許可束縛 | 正常4工程の承認は動画実行許可ではない。旧製造が参照する承認recordIdもなく、偽値で埋めない |

[旧CLIのbuildBaseAndDisplayRequests](../../../evals/clip_composition/run_new_material_digest_20260926.mts#L345) は背景製造を先行する。[context](../../../evals/clip_composition/run_new_material_digest_20260926.mts#L225) は旧固定plan・成果root・承認を読み、[acceptDisplay](../../../evals/clip_composition/run_new_material_digest_20260926.mts#L371) もその前提を継承する。これらへ今回の通常計画を旧contextとして装って渡す案は採らない。

style候補は `evals/clip_composition/outputs/presentation/distant-connection-existing-caption-selection/candidate-doctor-disappearance-to-ogre-mother-v001/` のsource package SHA `b291ac0f…`、renderer template SHA `cfdb4c6e…`。元styleの36論理幅/2行と既存文字幅規則は旧template値であり、144pxの新正式styleではない。source側trust v001とrenderer側trust v002/font ledgerは別参照で、両方の小JSON bytesを照合した。144px肯定から全styleや正式既定を自動確定しない。

## 旧成果の再利用条件

旧初稿15:31.633、7Aの326元字幕→431表示、7Bの9:47.1・265字幕/307状態、局所5本147字幕は別の版として保持する。旧7Aの保存意味atom4,124件のうち今回と重なる2,330件は、元断片ID・本文・元ms・共通発話IDが一致した。STT bytes SHAは同じだが、共通発話artifactのbytes SHAは異なる。一部の一致から旧回答全体の互換を認定しない。

旧7Bの選択済み元断片は2,483件。今回との共通は2,435件、旧末尾48件は今回含まず、今回の1,178件は旧7Bにない。導入延長、必要な説明、クリア確認延長、追加挑戦、ゲーム終了の扱いが異なり、旧307状態を一括再使用できない。

構成改善局所の保存入力には導入、説明、クリア確認、追加挑戦、終盤の表示分割判断がある。断片範囲は診断に保存したが、147字幕の全体を今回の新要求回答として採用していない。本文・元断片列・表示境界・出力時計・style/renderer/trust/実装版・承認範囲の一致を個別に確認できるものだけ、将来の再利用候補となる。元msや尺だけの一致、旧回答の要求SHA付替えでは足りない。

正当な保存入口は7Aの `restoreOrchestrationDrawingViewEvidenceV001`、7Bの `readDigestStructureDrawingEvidenceV001`、色の `readCaptionPaletteDrawingEvidenceV001`、統合の `readIntegrationPreparationV001`。実装と保存小JSON参照を読んだ。媒体hash・PNG等へ進むreaderは今回起動しておらず、旧runtime一式の即時再読や旧動画の新計画適合を主張しない。

既回答の144px肯定、「読む必要がある文章でなかったら」という分割条件、水色肯定を維持。他の色/強調や全体の見心地は未回答のまま。縁A=8/4は技術入力、選択null、Bの21論理不合格は別件。18色範囲・固定アップ82frameを今回へ自動移植していない。[人間台帳](../../HUMAN_REVIEW_PENDING.md#L262)の状態は変更していない。

## 最初の最小接続案一つ（未実装）

**通常保存計画から、保持本文の意味入力と9区間の表示判断要求を準備する部分だけを先に接続する。** 今回の既存関数ではその準備と完成背景の束縛が同居しているため、仮の背景で通す代わりに既存の純粋な本文準備部分を分離する案とする。

1. `evals/clip_composition/adopted_media_manufacturing_v001.mts` に提案関数 `buildAdoptedCaptionJudgmentInputsV001`。既存本文/保持atom/9group/表示要求の生成部分を抽出し、元のbuilderからも使用する。背景4参照を必要とするsource package構築とそのvalidatorは元の入口に残す。
2. 提案file `runner/src/digest-caption-input-preparation-v001.ts` の `prepareDigestCaptionJudgmentInputsV001` が、通常owner/依存鎖と保存JSONを既存resolverで確認し、区間IDと元msの形だけを対応させて上記を呼び、通常論理参照で保存する。固定旧contextや旧承認は使わない。

この次差分は明示指示後の実装案であり、今回作成していない。表示判断準備の目的・style参照・許可を明示する必要がある。現purposeの「今回は字幕を作らない」を都合よく変更しない。新しい表示回答、演出、背景4出力、source package、renderer job、新queue/API接続はこの二pathの準備完成から自動成立しない。

背景4参照と正当な製造receipt・動画許可は、後でsource package/assembleへ進むための必須依存として残る。assembleのtimeline/style読取が旧ROOT基準である点も、通常storeへ進む際の別の接続箇所であり、今回の準備案だけで全接続が完了したとはしない。

既存変更候補fileの現SHAは `d51415f7d223ce885bf2f208f66d06d295ffd3c2fc708ef26955ed14929a4f2f`。今回計画の消費5実装・準備19実装にはこのfileは含まれず、現5消費SHAは全て一致した。変更後に作る新準備artifactはその実装版/SHAを新規に束縛する。旧成果が変更fileをlive束縛していれば旧readerのSHA検査は拒否し得るため、旧保存SHA付替え・fallback・再生成で隠さない。

## 検証・checkpoint・終了

設営18の[map-inputs.mts](map-inputs.mts)は小JSON、現行ソースSHA、既存resolver、ID/時計対応記録だけを扱う。構文検査exit0、補助実行exit0。9区間の一意性・保持3613件/親7073件の被覆・drop除外・本文/STT範囲・出力順序/時計を確認し、新診断JSONを一度保存再読してbytes一致、元state SHA `c62e3b38…` 不変を確認した。

今回新設の診断量は約1.01MiB。媒体コピー量0、字幕/演出回答0、API0、通常process再起動0、製品変更0。旧suite、全動画QC、旧人間レビューは再実行していない。対応確認補助は終了済み、自分の対象process残存0を確認した。実質checkpoint保存・検証は2026-10-03 JSTまで同じセッションで続行した。静的接続案の保存は技術入力の整理であり、presentation、人間品質、動画許可の昇格を意味しない。

commit/pushと専用Edgeの直接監査報告はこの実質checkpointの後に実施する。完了SHA・Git状態・送信/全文受領は報告本文と新runtimeの配送記録に保存し、受領記録だけの再commitは作らない。
