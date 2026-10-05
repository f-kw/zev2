# ZEV ID9 — 同じPNGの透明度・輪郭検査を一回の読み込みへ

確認時刻：2026-10-05T00:30:44.706670+00:00。入力main：`6af091a33694681269f2e759be7e639d51c89c82`。本人の「はい」と、キャンセルしていない旨を受けた親monaの明示指示で実施。実装・最小検証・main commit/pushまで承認されている。

同じPNGを二回読み込んでいた処理を、一回のImageMagick処理にまとめた。最初に透明度の最大値を出力し、そのまま二値化と輪郭測定を行う。製品変更は `presentation_renderer_qc_v002.mjs` 一個、回帰試験は専用file一個。`threshold 0`、黒い1px外周、座標から1pxを引く処理、空alpha、返却項目、QC項目・閾値・拒否条件と子process監視の許容終了値 `[0]` を維持した。汎用cacheやstorage資格確認の変更は含めていない。

実PNG四種で修正前の二回方式とalpha最大値・輪郭の6項目が一致した。透明画像、角を含む半透明帯、位置をずらした矩形、離れた薄い画素を検査。半透明最大値を二値化前に読み、薄い画素も輪郭に含める。監視ありで一回のchildとPNG入力一個を確認し、監視なしの座標も保持。欠損・破損PNGは拒否し、正のalphaで不正な座標も拒否した。完全透明のtrimは実ImageMagick 7.1.2-12では警告を出すがexit0。従来のalpha0/bounds nullを返し、空画像の仮のtrim座標を採用しない。

専用8件と既存sampling41件は **49/49成功**。runner/Remotionの型検査、変更二fileの構文確認、差分の空白確認は成功。独立読取reviewで止める欠陥なし。root/runner package scriptsには専用lint入口がないため、新しいlint設定は追加していない。

追加で既存統合試験 `presentation_renderer_v002.test.mjs` の「12 行数…」だけを実行すると、1462行の古い完成映像差分fixtureで失敗した。期待 `OUTPUT_ELEMENT_NOT_VISIBLE` に対し `COMPLETED_FRAME_QC_INVALID`（混在した比較方式・全体証拠不足）を返す。修正前mainのQC原文だけをNode loaderで差し替えて再実行し、同じ行・同じ理由の失敗を再現した。各回1失敗/19skipであり合格には数えない。旧fixtureや拒否基準の書換えは行っていない。実PNGのtop-band座標確認と空alpha拒否はこの失敗行に達する前に実行されている。

651枚の非empty主字幕画像なら、画像検査用呼び出しは **1,302→651回（651回減）** になる。これは処理構造から分かる削減数。検査項目を減らした数ではない。全尺製造を再実行していないため、全体時間の短縮は未測定。小試験447.648msを本番時間や持続速度の証拠にはしない。

新動画・STT・追加課金・字幕時計変更は0。既存MP4/PNG/問題recordと正式資格は保持。この修正を旧jobへ免除して注入せず、次の製造が承認された場合に新code/依存/入力/出力/ownerを正式jobへ束縛する。実映像・音声・人間品質は今回未評価。現動画の短い字幕問題やSTT実行mainの一致確認は別の未解決事項のままで、この修正の完成と混同しない。

小PNG fixtureは試験のfinallyで整理され、今回prefixの残存directoryは0。変更前比較に使った自作loader三file 60,141Bは証拠固定後に整理。2026-10-05 00:27:23 UTC、自分の検証・製造processの実読取残存0。旧媒体・他session成果の削除0。

[実SHA・検証と失敗の要約JSON](alpha-bounds-single-decode-result-v001.json)。mainはown pathだけでcommit/pushし、最終SHA・remote一致・Git clean/untracked0を最終報告で確認する。このfileを含むcommitが実装・記録の固定点となる。
