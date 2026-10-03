# SSD保存先対応と、正式描画前の停止

2026-10-03 07:44 UTCの確認で、保存済み144px/26論理幅の243字幕のうち32字幕が、正式な描画条件では画面幅を超える推定になったため、動画生成前に停止した。一本の製造・映像QC・実視聴は未実施。

## 保存先の成立範囲

本人07:06:03 UTC「いいよ」で承認された、既存SSDを変更せず新規100GB以下のAPFS sparsebundleを一つ作る方式を実施した。実サイズは99,999,547,392bytes。hostはKIOXIA/ExFAT、guestはAPFS/owners有効。新guestのUUIDは7212F3BB-32FB-4F02-A71C-E570421FF2E0。

07:18:46 UTC、小さな自作ファイルでwrite/fsync/read/hash、排他作成、hard linkによる上書き拒否、chmod0444の実write拒否、通常detach/attach後の同UUID・内容・mode・write拒否まで合格した。ExFAT直置きで失敗した保護条件を、この領域では満たした。持続速度・全工程の容量や成功を保証する試験ではない。

承認された6implementation pathだけに保存/再読context配線の候補を実装。一般ROOT/trust/default/publisher/unused overlay sessionは変更していない。snapshot/grid/PCM/背景/PNG/QC/JSONをguestへ置く配線とTMPDIRを含む子処理の一時保存先を実装したが、有効contextによる全工程実走はまだ行っていない。したがって「途中物すべての保存/再読が実製造で成功した」とは認定しない。

## 新しい停止理由

元保存候補はhorizontalSafeMarginRatio=0で配置を検査していた。正式trustは0.04を持つ。元trustのlayoutRulesを維持する承認範囲に従って0.04を使うと、32/243がLAYOUT_SAFE_AREA_VIOLATIONになった。元propsでの対照確認は0/243失敗。元の受理成果は取り消しておらず、異なる正式条件へそのまま接続できるかを確認した結果。

最初は完成動画3.900〜8.133秒（frame117〜244）、1群2字幕。「ホラーゲームとかやろうかな」の行を含む領域幅が1908pxあり、4％余白が左端を77pxまで押すため右端が1985pxとなり、1920pxの画面を超える。全32件を正式rendererのbuildPropsから再構成した結果も検査結果と完全一致した。文字幅は実測で推定より小さく扱わない実装なので、後のglyph描画で自然に救済される条件ではない。実glyphは未実行で、映像の視認性を確認した主張ではない。

最小案は、今回の候補専用trustだけhorizontalSafeMarginRatioを0にする具体的な差分と、小さな実描画preview/必要な本人承認を相談役が判断すること。一般trustを変えず、元9回答/243cue/390行/時計を維持できる案。ただし現指示の「元trust layoutRules不変」を超えるため、今回実装者は適用していない。もう一案は144pxまたは行幅を変えることだが、保存候補の変更や再判断を伴うため勝手に実施しない。ユーザーに過去レビューや全字幕採点を再要求しない。

正式trustの根拠は[trust.json](../../../evals/clip_composition/registries/presentation/presentation-renderer-trust-v002/trust.json)のlayoutRules/humanReapprovalRule。「Any numeric or formula change requires a new rendered preview and human approval before a new trust and renderer version may be activated.」この数値の変更を既存許可へ無言で混ぜない。

## 確認と未確認

- 既存公開readerで正常owner/approval/dependency/reference closureを確認。元9request/response/resultから実tokenを復元し、全traces/correspondenceを照合。判断呼出し0。
- 243cue/390行/3613atom、27691frame/40705770sampleと元clock mappingが完全一致。
- 正式Node20.19.6と既存tool/runtimeの実binding、実font binary SHA、Core固定source SHAを確認。通常shellのNode23を正式製造には用いない。
- 既存renderer/caller等22検査、誤context拒否、Core6拒否、新合成coverage/9拒否、監視8既存＋容量境界7＋小試験3、strict runner typecheck、構文/diff検査は通過。
- 旧合成testは1pass/2件が旧renderer SHA固定で拒否。過去証拠の付替えはせず、旧合成/再開本文は不変を確認。この2件を合格に数えない。
- 古いテンプレートのrenderer依存4声明は現main bytesと不一致。候補adapter内では、6path外の依存は受理済みf2ef2214のbytesから変わっていないことを照合して候補専用声明を作る設計。一般trust変更・検査免除なし。候補trust JSON自体は未生成、接続成立は未認定。
- 有効contextの統合実走、媒体content hash/copy、背景、glyph、動画、技術動画QC、実視聴品質は未実施。人間品質pending、outlineChoice=null。

## 成果・負担・片付け

実装候補、保存試験、元入力資格、32件の具体的な停止証拠を保存した。今回の準備は07:07〜07:47 UTCの約40分、動画処理時間0。既存入力再読は約955ms、全字幕の今回配置確認は約671ms。初回保存領域準備、実装/検査、動画処理、人間判断を区別する。07:06の承認後、新たな本人操作/再採点は要求していない。

自作probeは削除済み。正式production prefixは未作成。07:46:44 UTC、guestを開く参照0を確認し、07:47:03 UTCに新guestだけ通常detachした。SSD全体は取り出しておらず、sparsebundleは保持。製造processの起動0、試験用own group残存0。他者processは停止していない。次回は同じimageでも現mount/device/UUIDを読み直し、新しい実装SHA・許可・出力prefixへ束縛する。自動再開しない。

根拠：[実行許可の転記記録](authorization-record.json)、[APFS試験](apfs-storage-probe-result.json)、[全32件の配置証拠](formal-layout-preflight.json)、[通常detach](normal-detach-result.json)、[検証/作用/負担の記録](evidence.json)。実装・技術確認・実視聴品質・未評価を混ぜない。次担当はmona/相談役、実装者はこの停止で待機。
