# 216px字幕・可変設定・正式製造の進行記録

## 製造前の監査用checkpoint — 2026-10-03 11:19 UTC

今回の字幕再配置は、元の243cue/390行から372cue/668行へ進んだ。9区間・3,613atom・本文・元ID・発話順・元音声・27,691frame・40,705,770sampleを保った。保存済みの新要求に対する実判断9件と正式readerによる再読が成立し、11:14:34 UTCの正式入口の軽い事前検査では372件の推定配置、font bytes、runtime、source packageが合格した。動画はまだ製造していない。全字幕の実描画、実際の文字端と余白の検査、動画の技術QC、全体を続けて見た品質は未確認。

本人は10:30:45 UTC「これでいこう」で、見本2枚の216pxと左右半文字の余白を今回一本に採用した。10:31:17 UTC「システムとしては固定じゃなくて可変にして」に基づき、文字サイズと余白を設定から計算し、今回の設定値と導出値を保存する。今回値は216px、左右各108px、最大2行、縁8px/光彩4px。見本の採用を全字幕や完成動画の品質採用へ広げず、humanQuality=pending、outlineChoice=nullを維持する。

### 必要だった接続修正

文字を大きくすると一行に入る量が減るため、本文を省かず、同じ9区間内で必要な字幕の区切りと改行を選び直した。旧cueの外側を固定する条件は実装者の仮制約だったため外し、長い文節は同じcue内で構成語・助詞・助動詞の境目に限って改行できることを新要求へ明記した。旧要求・回答・証拠を保持し、新要求と新しい実回答を保存している。

この新要求は旧source packageの固定TASK文字列と異なるため、10:53:41 UTCの事前検査で拒否された。親相談役は10:54 UTCに今回の必要な接続修正を許可し、10:56:15 UTCに判断recordを保存した。既存の6実装pathへ `evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` を加え、今回の実装範囲は7pathとした。testは別に数える。旧TASK文字列と旧reader本体を維持し、本文・ID・境界・順序・幅・行数・依存とhashの既存検査を残す。資格を持つ同じ候補objectと実bytes/hashを一致させる限定接続であり、任意のTASKを通す入口にはしていない。

| 確認 | 現物で確認できた範囲 |
|---|---|
| 実判断と再読 | 実回答9件、旧owner/意味/時計、trace/correspondence一致。再読時の判断再呼出0 |
| 正式入口の事前検査 | 11:14:34 UTC、372件の推定配置・font bytes・runtime・source packageがpassed |
| 拒否確認 | 本文、ID、順序、幅、行数、別計画、旧TASKへの書換え、意味hash、provenance、実装hashの10改ざんを拒否。clone/偽資格/任意TASK/旧bundle/実bytes改変も拒否 |
| 可変設定 | 144/180/216/288pxの小さい非媒体検査。半文字余白72/90/108/144pxと論理幅24/18/15/11を導出。実映像での汎用品質は未確認 |
| 型検査 | 親実装者の11:14 UTC報告でpassed。既存source package suiteはtestのimport期待1行を統合後、7/7 passed・exit0 |

新manifestは `784775c621913ba263057671b580b34082a349e007b8c155ed4bb0bafe351444`。対象は `runtime/artifacts/digest-caption-216px-reflow-20261003-v001/attempt-002/`。最短12frame、最長513frame。`shortDisplayObservations` の空配列は「8frame以下の孤立表示の観測0」を示す診断メモであり、短表示が全部なくなった意味でも品質基準でもない。12frameや15frameなどの実際の読みやすさは未評価。各実判断noteとcorrespondenceに本文・時刻を保持する。

### 保存先と製造前条件

10:25:22 UTCの再mount後の4KB限定probeでは、APFS上の保存/再読、排他作成、hardlink、保護した出力の上書き拒否、0444へのwrite拒否、今回物のrenameが成立した。持続速度や全工程の成功を保証する試験ではない。

11:15:40 UTCの新しい観測では、guest `/Volumes/ZEV-Digest-20261003-01` は99,665,981,440bytes、host `/Volumes/KIOXIA` は2,000,257,286,144bytes、内蔵は13,602,562,048bytesの空き、pressure=1。guest/host UUIDとdevice/imageの対応を再確認し、開始条件を満たした。容量は各deviceを別に扱い、合算しない。production prefixは未作成。許可転記record v002を作成済みだが、製造結果やQC receiptではない。

snapshot/grid/PCM/背景/PNG/QC/JSONを含む途中物も今回専用APFSへ保存・再読する接続と、50GB開始/12GBreserve/親子RSS16GiB/pressure1/1秒観測/next-unit+reserve/own PGID停止を保持する。一般ROOT/trust/default/publisher、未使用overlay session、元媒体、既受理成果には触れない。

### 初回準備と制作負担

| 時刻（UTC、すべて2026-10-03） | 判断・準備 | 動画の処理時間との区別 |
|---|---|---|
| 06:33:44 | 本人が必要な作業を承認。途中物もSSDへ置けるか調査 | 保存方式を決める初回準備 |
| 07:06:03 | 本人が最大100GBのAPFS imageと6pathの接続を承認 | 07:07〜07:47は約40分の領域準備・実装・検査・整理。動画処理0 |
| 07:44:01 | 元候補と正式marginの差で32/243件の推定配置が不合格 | 大容量の描画・合成を始める前に停止 |
| 09:52 | 本人が1.5倍の文字と半文字余白を指示 | 新しい表示条件に必要な再配置と見本準備 |
| 10:08 | 216pxの2枚を実描画 | 同呼出内の描画・検査は約5.66秒。意味判断・原寸確認・待ち時間とは別 |
| 10:30:45 / 10:31:17 | 見本の採用 / システム設定の可変化 | 本人の新しい設定判断。動画処理待ちに合算しない |
| 10:54〜11:19 | source接続の限定承認・統合・拒否検査・製造前確認 | このcheckpointでも動画製造0。全尺の処理時間・負荷は未測定 |

初回の接続準備、設定変更に伴う再配置、実際の媒体処理、人間による採用判断を分けて記録する。これまでの経過時間全体を一本の製造時間にしない。過去レビューや全字幕の再採点を本人へ要求しない。

次担当はこのMacの実装者。checkpointの実装SHAと実行permit/出力root/deviceの束縛を確認し、承認済みの今回Normal一本と既存QCへ進む。最初の正式描画段階で実glyphを検査し、全域の欠陥があれば重い後続を止める。製造後に動画QC、実視聴品質、時間・負荷・人間介入、今回不要一時物の整理とown process/Git結果を別に追記する。

既存source package suiteは7/7・型検査exit0。監視は実製造に使うHomebrew Pythonで8/8合格。別Apple Pythonでは旧resume用の観測回数mockが1件失敗し、その結果も証拠に保持した（Apple Pythonのmonotonic起点で初回周期観測の順序が変わり、旧resume用mockの3回目期待だけが外れる。bodyの再観測は実装に存在）。実製造には同じ合格環境を使う。

[統合証拠](repo-preflight-evidence.json)・[正式事前検査](formal-preflight-passed.json)・[製造許可転記](manufacturing-authorization-record.json)・[証拠索引](preflight-evidence-index.json)。saved-*は元runtime JSONとbyte一致する監査用写し。元の実回答・trace・correspondenceはruntime/workspaceに保持し再判断しない。

---

以下は10:16 UTCの早期見本checkpoint履歴。

# 216px字幕と左右半文字余白の作業中見本

2026-10-03 10:08 UTC描画、10:15 UTC原寸確認。本人09:52 UTC「フォントは１.５倍くらい」「左右には半文字分くらい」「それで進めて」を受け、今回一計画だけ216px・実文字端の左右余白各108px以上で再配置中。本文/素材/9区間/原音声/3613atom/27691frame/40705770sampleは保持する。一般style/trust/defaultや品質採用の変更ではない。

- [最初の2行例](01_two_lines_003.900s.neutral-preview.png)：完成3.900秒の「ホラーゲーム／とかやろうかな」。元の長い発話の前半だけを描いた早期見本で、後半「と思ったんですけど」は省略採用していない。左右の実文字端まで220px/218px。
- [別の2行例](02_two_lines_243.533s.neutral-preview.png)：完成243.533秒の「あなたみたいな／新入りがねぇ」。左右207px/207px。

216px、縁8px/光彩4px、無地背景、候補横safeMarginRatio0.05625。既存rendererで2画像を実描画し、正式font bytesとruntime依存を検査、実alphaが安全領域外/画面外にないこと、行順と欠けを原寸で確認した。行間は101px/97px。2枚の成功を全字幕/動画の読みやすさや本人採用にしない。[証拠](evidence.json)は実呼出2件と画像SHA/寸法/alphaを記録する。

全体の再配置は作業中。旧243cueの区切りを固定した最初の候補では、長い一続き文節と短い新cueが衝突した。最新指示に含まれる必要なcue/行境界の再配置として、同じ9区間内の区切りを見直し、本文を変更せず長い文節を同一cue内で自然な構成語の境目に折る候補専用規則を明示する。旧規則でcompleteを偽らず、別attemptで新要求SHAと実判断を作る。原atom時計を延長・変更しない。

動画製造は未開始、APFS imageは未再mount。今回の保存候補/実glyph全件/技術動画QC/実視聴品質は未完了。次担当はこのMac実装者。親monaはこの2枚を本人へ届ける。同じ216px条件の再承認を求めない。
