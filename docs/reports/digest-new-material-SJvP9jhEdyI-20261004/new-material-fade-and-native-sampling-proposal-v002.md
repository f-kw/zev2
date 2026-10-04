# 次回用：短い字幕のfadeとnative代表検査の最小案 v002

確認：2026-10-04T12:57:42.133513+00:00。未適用・未実行の読取提案です。今回の保存済み合成一本の正式復帰へ、この変更は入れません。

## 1. 短い字幕でも最低一枚を完全な濃さにする

Fを字幕の表示frame数として、fade幅を **D=min(4,ceil(F/2))** に制限します。各frameの倍率は **min(1,(n+1)/D,(F-n)/D)**。geqのenableも `lt(phase,D-1)+gt(phase,F-D)` にそろえ、range内のphaseOffsetを保ちます。

- 1/2frameはD=1で完全な濃さ。
- 3frameは50％→100％→50％。4frameは50％→100％→100％→50％。
- 5/6frameはD=3。中央が100％。
- 7frame以上は旧D=4の式と変わりません。

直接の対象は `render_presentation_v002.mjs` の `buildPresentationCompositeArgumentsV001`、約8〜15行です。低メモリ合成は同じbuilderを呼ぶので、そこで別のalpha式を作る必要はありません。既存builderを無条件に変える案は、その実装を使う将来の他callerにも及ぶversion変更です。一候補だけへ限定するなら固定variant builderとqualified compose側の選択が別途必要で、旧defaultや旧コードSHAのまま暗黙変更してはいけません。

50cueのgraphが変わり、保存180rangeのうち**35range（7350frame）**に含まれます。216px・左右108px・最大2行・位置・色・縁・glow・本文・ID・時計は変更しません。時間opacityはFFmpeg段のため、実props/font/glyph/配置/bytesが資格確認できた**651primary PNGは再利用可能**です。

ただし、現正式合成は180producerを一つのcontinuous encoderへ流し、rawYUVもrange動画も保存しません。最小の既存正式経路で改めるなら、PNGを再描画せず**全37619frameの新MP4を一本再合成**します。35rangeだけ差し替える案は現在の正式経路ではなく、新しい編集/保存契約が必要なのでここでは提案しません。新graph/receipt/MP4SHAと新媒体に対応する代表証拠が必要です。旧MP4・旧代表画像を新MP4の合格証拠にはしません。

1frameは約33ms、3frameは0.1秒のままです。100％へ届くことは、読める表示時間になったという保証ではありません。上流時計や派生時計補正は変更しません。

## 2. 次回のrepeatと診断line-maskを既存8代表だけへ

選択はopaque approved contextの実job/authorizationに一致した `verificationPolicy.representativeInstructionIds` から取ります。任意の公開flagで検査を減らしません。今回の8代表は6件が2行・2件が1行なので、repeat8枚、診断line-mask14枚になります。全primary651枚とそのfont/glyph依存、実SHA、実alpha/bounds/108px安全域、全logical layout/本文ID時計、必要placement calibration、media/frame/audio、安全監視・atomic公開を保ちます。

**rendererのif追加だけでは成立しません。** `presentation_renderer_qc_v002.mjs` 485行は、`requireFinalVisibility:false`でも全cueのlineAlphaBoundsを必須にしています。残り643cueでmaskを描かなければ `OVERLAY_ALPHA_EMPTY` になります。推定layout rectを実測line boundsに偽装する方法は使えません。

最小の責務は次の3pathです（実装行数は概算で、変更0）。

| path | 変更責務 | 概算行数 |
| --- | --- | ---: |
| render_presentation_v002.mjs | primary/calibration常時、repeat/maskのみ代表選択、実coverage保存、限定QC呼出し | 60〜100 |
| presentation_renderer_qc_v002.mjs | 従来full evaluator保持。全primary/logical規則と代表だけの実測line規則を明示して評価 | 60〜100 |
| digest_representative_completion_v001.mjs | qualified policyのcoverage校正、完了/technical保存/get/finalizeで同じscopeを再検査 | 50〜100 |

新出力にはnative inspection coverageを、plan canonicalSHA・実policySHA・approved job/codeSHAと束縛します。`repeatDeterminism`、`lineMaskPixelGeometry`は代表だけ実施、他643repeat/1028line-maskは `not-executed`。非代表にはrepeat hashや実測line boundsを作りません。全規則のpassは実施した全primary/logical検査だけを指すよう表記し、全nativeの実測合格へ読み替えません。既存fullVisibility未実施/全実視聴・実聴取・人間品質採用未評価も維持します。

今回のtop-band/panel calibrationは0件。将来必要なcalibrationはsampling分岐より前の既存処理と実props補正を保持します。未補正calibration boundsを補正後の実測line-maskとして扱いません。特殊配置が追加の実line証明を必要とし、その証明をこの限定scopeで満たせない場合は、具体条件を校正するか未対応として拒否します。無言fallback/検査免除は入れません。

この代表限定は、検査coverageを変える**正式な出力証拠contract差分**です。既存policyに選択IDはありますが、現在は全line-maskを実施した意味なので、単なる高速化ifとして黙って合格表記を維持しません。job/Python共有schemaへ新flagは足さず、変更code/renderer依存の実SHAを次の承認済みjobへ束縛します。読取readerがcoverageを落とす場合の追加pathは、その実箇所を確認して報告する条件です。

今回条件での生成件数の予算はRemotion673回（651primary+8repeat+14mask）、ImageMagick1330回（全primary1302+mask28）、計2003childです。旧5730から3727childの削減候補ですが、これは実行回数の静的計数であり処理時間やspeedupの実測ではありません。

## 必要な小さい回帰確認（今は未実施）

fadeはF=1〜8/長尺、range跨ぎのphase同一、F>=7旧graph不変、alpha変更だけでPNG/本文/時計不変を確認。代表scopeはpolicy無しで全件旧動作、対象8件だけrepeat/mask、代表の不一致/line欠けは拒否、非代表のprimary欠け/安全域違反/本文ID差替えも拒否、calibration保持、coverage欠落や全件passed偽装拒否、pending→finalize/getで同じscope/媒体SHA/音声が維持されることを確認します。

実source・保存layout・180range・前回静的結果のSHA、対象range一覧、提案coverage、件数根拠は同名JSONへ保存しました。repo/Git/SSD/プロセス・媒体生成・QCは変更/起動していません。
