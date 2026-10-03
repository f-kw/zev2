# 横余白だけを変えた2枚の確認画像

本人2026-10-03 09:00:50 UTC「いいよ」は、mona 08:02:00 UTCの「文字サイズと改行はそのままで、左右の余白を狭めた確認用画像を2枚だけ作る。動画への適用は画像を見た後」という提案への承認。動画への変更や正式trustの有効化は含めない。

09:14:10〜09:14:16 UTCに、既存overlay adapter/Remotion/Chromiumと宣言済み実フォントで2枚だけ描画した。144px、縁8px、光彩4px、本文、改行、行間150％、位置、padding、canvas1920×1080、safeArea左右4px/上下40pxを維持。formal baselineからの差はhorizontalSafeMarginRatioの0.04→0だけで、値を戻したpropsとbaselineはdeepEqual。一般trust/コード/設定は変更していない。

| 見本 | 保存済み時刻 | 実alpha端（右・下は次の座標） | 画面端までの左右距離 |
|---|---:|---|---|
| [2行例](01_two_lines_003.900s.neutral-preview.png) | 完成動画3.900秒、frame117〜244未満 | left19/top596/right1881/bottom975 | 左19px/右39px |
| [1行例](02_one_line_243.533s.neutral-preview.png) | 完成動画243.533秒、frame7306〜7423未満 | left21/top815/right1885/bottom975 | 左21px/右35px |

2行例は「ホラーゲームとかやろうかな」「と思ったんですけど」。1行例は「あなたみたいな新入りがねぇ」。元フレームは4910〜5037未満と61357〜61474未満で、保存correspondence/meaning/個別traceと一致した。manifest SHA04ad8b3f019d6afed4038f376e101d15e155cc7822a2527b46fcfbd5b5041e41を維持。実フォントSHA4f20353d5ba41012fb8eaaa653d2ac46f80d63880301a6590765897bbdfedbfbを描画前に照合した。

実測は透明overlay PNGを既存alpha検査で再読し、同じPNGのalphaを行ごとのY帯でも読み取った。追加line-mask/繰返し描画は0。2行例はY596〜758未満と812〜975未満で、54pxの透明な間隔がある。1行例はY815〜975未満。全体端と行unionが一致、canvas外周のalphaは0、2枚のsafeArea条件は合格した。Nodeの推定wrapper左6px/幅1908pxと実際の文字端を混同しない。

09:14 UTC後の原寸表示では本文・改行が見え、明らかな文字欠けや画面端での切れは見当たらなかった。これは実装者による静止画像確認であり、本人の好みの採用ではない。今回の2枚が成立しても243字幕全件の実描画合格にはしない。

背景は無地の#404040。指定した2時刻に一致する既存背景PNGは既知参照から確認できず、別場面の背景を流用していない。実映像の背景上での可読性、音声との時刻対応、全尺の構成/テンポ、人間品質は未評価。

## 受け渡しの制約

Library保存は未完了、Library IDは未発行。最初は接続の証明書確認が失敗し、Mac既存証明書を一回のプロセスへ指定して解消した後、このMac向け接続では必要なprepare_uploads機能が利用不能だった。いずれも画像の保存開始前に失敗し、Libraryへ作成できたとは報告しない。別経路への無断切替・架空IDは0。画像と証拠は上のリンクとMac作業領域に保持している。GitHub内の画像保存だけをChatGPT会話での画像配信成功と扱わない。

親monaが利用可能な画像配信環境で2枚を提示した後、「文字サイズと改行はそのままで、この左右の配置で今回一本を進めてよいか」を一問だけ確認する。実装者は動画/候補trustを有効化せず停止する。

## 処理と保全

描画/PNG検査/中立背景合成は合計約6.6秒、実描画呼出しは2回。約15分の準備/原本照合/受け渡し調査を分けて記録する。人間の追加字幕採点や操作要求は0。映像媒体の製造処理は0。

この小さな画像作業は内蔵の今回専用workspaceへ保存し、開始空き約12.7GBを確認。APFS imageは再mountしていない。全尺途中物のSSD経路を証明する試験ではない。webpack cacheを今回の実行指定で無効にし、tempを専用directoryに固定。描画は正常終了し、残存自renderer0/動画process0を読み取り確認。自temporary directoryは空になっていたため削除、回収logical bytes0。2枚のreview PNG/透明原本/props/検査証拠を保持し、旧成果/他者process/SSD内容を変更していない。

実装使用HEAD:d91f9c0f94c17bed297dac0214d2d92f05e03615、main。checkpointは今回の画像/証拠/報告/log/現在地だけ。実装、技術PNG検査、静止画像確認、人間採用、動画品質の境界を維持する。詳細は[evidence.json](evidence.json)・[cleanup](cleanup.json)・[session log](../../work-logs/2026-10/2026-10-03T0902_Codex_ID9-two-margin-preview_d91f9c0f.md)。
