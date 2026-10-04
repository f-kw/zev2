保存済みの数値は、「同じフォントと設定の通常字幕は安全側の文字数・論理幅で判断し、上限付近や比例幅の文字、記号などの例外と代表だけ実描画を確認する」案を支持します。ただし、これは今回の有限な字幕群の根拠です。全ての文字列に通用する安全保証や、全主画像検査を省いてよいという採用判断にはしません。今回の651主画像を保持する実装は変更していません。

確認時刻：2026-10-04T15:12:23.005427+00:00。入力は保存済み technical JSON 8,838,883B、SHA `84c573cb3feadaf88cf2c5581aece7c5e34860d6bed49f73a88d45e53d126de5` です。実bytesのSHAとsizeを照合しました。651字幕・1,042行の数値を集計し、PNGやMP4は開いていません。元監査は `docs/reports/digest-new-material-SJvP9jhEdyI-20261004/specific-recovery-actual-result-evidence-v001.json`（14:01:55 UTC）です。

設定は全651字幕で同じです。1920×1080・30fps、LINESeedJP_A_OTF_Eb／fontAssetId `line-seed-jp-extra-bold-v001`、fontWeight800、216px、縁8px、glow4px、左右108px、最大2行、行送り150%、bottom-center・offsetY -6%、背景なしです。既存trustにはfont SHA `4f20353d5ba41012fb8eaaa653d2ac46f80d63880301a6590765897bbdfedbfb` が宣言されていますが、今回font本体を再hash・再測定していません。他fontの実幅について根拠はありません。

**計算で分かること。** 幅の重みは「U+0000〜U+00FFを1、それ以外のUnicode code pointを2」です。一般にいう半角・全角の判定とは範囲が違います。216pxでは1単位108px、縁とglowの片側分12px、内側padding9pxです。利用可能な文字幅は `1920−2×108−2×12−2×9=1662px`、論理幅の上限は `floor(1662/108)=15` です。幅15では文字推定1620px、stroke込み箱1644px、wrapper1662px。中央配置したstroke箱の左右余白は138pxで、指定108pxに対する片側余裕は30pxです。通常の日本語7文字相当の論理幅14なら、stroke箱1536px、片側余白192px、余裕84pxになります。この14を新しい正式上限に採用したわけではありません。

`resolveDigestTypographySettingsV001` のコメントも「capacity estimateでありactual glyph inkではない」と明記します（[source](/Users/kawafmm/workspace/zev2/runner/src/digest-formal-handoff-v001.ts:518)）。[text-metrics.ts](/Users/kawafmm/workspace/zev2/runner/src/telop/text-metrics.ts:8) はNodeのようにdocumentがない場所ではこの重みの推定を返し、ブラウザでは推定・advance width・glyph bounding metricsの最大を使います。保存された全1,042行のlineRect横幅は `logicalWidth×108+24` と一致しました。したがって、Node側のlineRectsは実glyph幅の測定値ではありません。

**計算と実測の差。** 次の誤差は「保存済みlineAlphaBoundsの実ink幅−lineRectsのstroke込み推定幅」です。新たな画像測定ではありません。

| 既存行の分類 | 行数 | 観測した最大幅誤差 | 観測した横への最大はみ出し |
|---|---:|---:|---|
| U+0000〜U+00FFを含まない | 901 | −1px | 左0px、右−1px |
| ASCII英字を含む | 8 | +237px | 左124px、右113px |
| ASCII数字、英字なし | 8 | +79px | 左40px、右39px |
| ASCII記号、英数字なし | 125 | +28px | 左14px、右17px |
| 論理幅15の行 | 17 | +15px | 左13px、右4px |
| 論理幅14の行 | 165 | +96px | 左59px、右37px |

分類は条件によって重なります。901行は「ASCII域なし」の群であり、全ての日本語やUnicodeの網羅試験ではありません。

最も差が大きいcue486・2行目「の好きなBGM」は論理幅11、文字推定1188px、stroke込み予測1212px、実ink1449pxで、+237pxでした。実左右余白は230/241pxなので、この実字幕自体は指定余白内です。cue303「OK、あー」は+139px、cue189「FイコールPV1と」は+96px、cue127「平成28年」は+79px。比例幅の英字・数字を常に1単位108pxだけで扱うことは安全側とは言えません。幅15の片側余裕30pxは、今回観測された最大124pxの横誤差を一般に吸収できません。ただし、異なる行の最大値を合成して新しい危険字幕が実在すると断定もしません。

実inkの最小余白は左125px・右134pxで、指定108pxを17/26px上回りました。最長の実行幅はcue533「毛黒かったっけ?」の1659px、予測との差+15pxでした。これは今回の実数値です。最大誤差237pxを新しい文字列・フォントへの保証値として固定する根拠はありません。

**論理layoutと全主画像の検査は、一部が重なります。** 行数、矩形の安全領域、既知の固定設定での行送りと配置は計算で先に判定できます。全651の実alphaMaxは1、主画像のboundsは全て各行maskのunionと一致しました。予測2行間隔は84px、実2行間隔は最小90pxで、実行高は198〜234pxでした。一方、実ink下端はlineRect下端より最大54.8px下にあります。lineRectの縦箱と実輪郭は同じものではなく、wrapperや安全領域からの脱出とも別です。実外側の下余白は最小104pxで、指定40px内に収まっています。

元の回復記録の画像検査3,386回は、主画像651×alpha/bounds2回=1,302回、行mask1,042×2回=2,084回と算術が一致します。ここには普通の文字でも繰り返している幅・安全領域の確認があります。ただし、計算では空の描画、font/glyphの欠落・置換、描画実装の失敗、実輪郭のはみ出し、背景との対比、完成動画での見え方は直接確認できません。全主画像のalpha/boundsも全文glyphの同定ではなく、1字だけ欠けても非空の輪郭が残るため、全字の正しさを保証する検査ではありません。実字幕を作るための描画そのものも必要です。省ける可能性があるのは追加の検査処理であり、字幕生成そのものではありません。時間短縮の実測やbenchmarkはしていません。

**案の適用範囲。** 同じ実font・サイズ・縁・glow・余白・行送り・位置を保つ普通の日本語は、保守的な文字数と論理幅に余裕を持たせ、本文・ID・原子被覆・時計・設定由来を計算で確認する方針に根拠があります。上限付近、とくに論理幅15、ASCII英字・数字や比例幅の文字列、未確認の記号・emoji・結合文字・variation selector・混在script・font coverage不足は例外候補です。font/サイズ/weight/縁/glow/余白/位置/行送りの変更、top-bandやpanelの可視中央補正、Pulse/Motionや変形・演出は今回の数値から一般化できません。代表実映像も、glyphが成立したことと通常速の可読性・人間の品質採用を分けて記録する必要があります。どこを正式に検査対象外へするか、新閾値を置くかは今回決めていません。

**短い字幕は横幅と別の問題です。** 横に収まるかは論理幅・最大2行、どれだけ読める時間があるかは文字数と表示秒数、作品上の意味は前後cueと元発話で扱います。保存時計から `秒数=frame数/30`、`文字毎秒=可視code point数/秒数` は算出できます。cue571「お!」は1frame=0.0333秒・2文字、cue465「世界が終わる」は3frame=0.1秒・6文字で、どちらも60文字/秒です。文字数が少ないから読めるとは言えず、幅に収まることも可読時間の証明になりません。既存frame検査は正の整数frameを要求しますが、通常速読了の数値閾値ではありません。

説明用に集計すると、4frame未満19cue、8frame未満62cue、15frame未満188cue、30frame未満350cueです。これらを今回の新しい停止基準にしていません。短い相槌・反復か、新情報を担う句か、前後で意味が保たれるかは意味判断が必要です。原時計のずれが原因なら幅規則や字数規則では解決しません。今回、本文や時計、cue境界の修正、最小表示時間・CPS gateの新設は行っていません。

根拠の実装入口は [buildExactTextModel](/Users/kawafmm/workspace/zev2/evals/clip_composition/presentation_renderer_entry_v001.tsx:245)、[論理layout](/Users/kawafmm/workspace/zev2/evals/clip_composition/inspect_presentation_render_layout_v001.ts:33)、[実alpha/bounds QC](/Users/kawafmm/workspace/zev2/evals/clip_composition/presentation_renderer_qc_v002.mjs:470)、[frame丸め](/Users/kawafmm/workspace/zev2/evals/clip_composition/presentation_renderer_text_layout_v001.mjs:345)です。fontの読込処理は [renderer](/Users/kawafmm/workspace/zev2/evals/clip_composition/presentation_renderer_entry_v001.tsx:486) にあります。この分析は保存済み数値と静的算術だけで、実装変更・新試験・描画・画像検査・動画/音声視聴・API・Git操作はありません。
