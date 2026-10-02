# 9の後続 — 字幕判断入力の準備接続

2026-10-03、Codex2。保存済み計画の3,613保持断片から、意味入力と区間別の表示判断要求9件を準備・保存した。別processで元JSONから再構築し、保存済み全bytes/SHA一致を確認。表示回答・字幕分割・演出・製造は未実施。技術完了として相談役監査へ報告する。

正本：[準備接続v001](../../work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md)。初回受領HEAD8c96aa62、初回実装・設営19・失敗固定版[f577bfba](https://github.com/f-kw/zev2/commit/f577bfbaedd1488b0e64c1f702002eb89a0fea68)。[目的参照修正追補](../../work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001_PURPOSE_REFERENCE_FIX.md)の最終返信を専用Edgeで全文受領し、f5ca9bcbへ他者変更を保持して同期した。

## 接続と保存

通常保存stateの承認下書き・4命令の成功・成果物の所有者と依存鎖を既存検査で確認。共有resolverと登録一覧を使って小JSONを読み、実SHA・版・内部参照を検査した。承認snapshot全体・3段階の要求への目的全文到達を照合。元目的の「今回は字幕・演出・動画を作らず」と親正本SHAを保持し、追補の許可は別に記録している。旧依頼の出力やqueue completeとして新準備を登録していない。

新runnerのJSON限定境界→新純粋builder→既存表示入力validator→新領域保存。元本文は保存STT、共通発話は既存の本文検査で確認。保持回答の全文被覆を既存検査で再構築し、採否・保持・編集案・時計の区間対応を照合した。元媒体の参照はmetadataのみで、現在の媒体bytesを再検査したとは扱わない。

| 元候補 | 区間 | 保持断片数 |
|---|---|---:|
| 1 | 1 | 217 |
| 2 | 2 | 658 |
| 3 | 3 | 120 |
| 4 | 4 | 1,033 |
| 5 | 5 | 778 |
| 6 | 6 / 7 / 8 | 258 / 158 / 167 |
| 7 | 9 | 224 |

9groupは区間順・元断片列で分離し、候補6の三つの非連続範囲を維持。保持3,613を一度ずつ含み、drop3,460混入0・区間間の空白復活0。各atomの元本文/元msと意味発話ID、決定的な境界候補・要求IDを保存した。元時計27,691frame/40,705,770sampleは元参照へ束縛し、各atomの新出力時計は算出していない。

技術入力のtaskDescription・36論理幅/2行/既存文字幅規則は指定source templateの実SHAから復元。旧captions・base・renderer・製造承認はコピーしていない。144px正式styleや人間の縁選択へ拡張していない。

保存：`runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/manifest.json`
manifest実SHA：`83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75`
bundle11file、2,591,297bytes。意味入力・9要求の実SHA、親scope/本文/元state/採否保持/時計/実装の束縛と論理参照→物理位置を保存。完成source packageやrenderer artifactを名乗らない準備版。詳細本文/IDはignored runtime、Gitの[evidence.json](evidence.json)は参照と結果中心。

## 四群の確認

1. 今回の実接続：新runner→新純粋builder→既存validator→保存、元本文/元ms/順序/被覆一致。9inputすべて既存検査を通過。
2. 純粋計算同等性：実在する旧正常最初の一区間658断片と旧baseの四参照を使い、旧builderの純粋呼出しと比較。三つのbase JSONだけを実SHA確認、媒体はmetadataのみ。本文・元断片/元ms・共通発話・atom/group順・境界/要求ID・task/style・要求入力SHAが一致。意図的差は準備版のschema、そこから派生する意味束縛SHA、完成source package/旧許可/baseを作らない来歴。初回の比較通過は初回部分成立として保持し、attempt-002一系列内の再評価通過は新観測として別記。
3. 最小拒否11条件：別draft、owner、別draft参照、未完了、保持欠落、重複、drop混入、本文改変、未知版、style改変、保存出力改変。対象エラーと一致し、拒否先出力不存在/成立済みbundleの不増加を確認。未知版はFileRefの実size/SHAを揃えたcloneで版検査そのものを確認。保存出力改変は別の小cloneを既存元参照から再構築して拒否。
4. 別process再構築：新readerを一回、再判断/再登録/旧state更新なしで実行、exit0。元小JSONから意味入力と全9要求を再構築し、manifest実SHAと全bytesが一致。既存JSON/既存実装54件の前後SHA一致。

厳密な対象二path＋補助の型検査exit0、export・元期待SHA・親directory・新attempt/bundle不存在preflight exit0。無関係な旧suite・通常4工程・媒体QC・人間レビューは0。

実測処理時間：純粋比較108.4ms、準備/保存346.0ms、主試験合計2009.3ms、別process再構築347.8ms。新内容判断時間0、修正相談のPro表示8m9sは外部待機で、処理時間に加えていない。新媒体コピー0bytes。否定fixture用の小JSON複製32file/9,894,560bytesは媒体コピーと区別。

## 初回停止・修正履歴

初回は承認保存参照を制作要求本文として直下参照したためundefined、exit1。意味入力/要求/manifest保存0、別process再構築未実施。初回parameters・保全一覧・failure・logは不変、Git初回版f577bfbaも保持。初回失敗を今回成功へ付け替えていない。

相談役が個別承認した二件だけを適用：承認snapshot全体と別保存の目的全文を区別して照合する二行を製品累積6、保存先と四つの対応箇所をattempt-002/bundleへ揃える変更を設営累積20。新二path初回接続実装、設営19と区別する。一般上限・過去累積・強制停止・旧保存SHAは不変。旧製造・v005準備消費・Skill/validator/shared等のbytesは不変。

## 残るものと境界

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null。表示の実回答、cue/行末選択、完成背景4参照、最終style/renderer束縛、後段のROOT基準読取接続、演出、動画許可は未成立。ID9-PD-01/02未承認、縁・人間品質Pendingを維持する。技術準備成立を人間品質・未見素材汎化・本適用へ広げない。

媒体read/hash/copy/PUT・通常HTTP・外部推論/API費用・素材取得・STT/inspection/ffprobe・字幕回答・演出選択・画像/背景/音声/動画・SSD・削除・本番/公開は0。Codex1は起動していない。次に必要な一件は、保存された表示要求へ回答を戻す範囲の明示判断。今回の完成だけで着工しない。
