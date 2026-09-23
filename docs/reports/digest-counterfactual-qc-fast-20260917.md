# Digest完成動画のQC高速化：最終検証報告

## 1. 結論と作業範囲

**技術検証は成立し、対応済みの自動演出を処理する通常QCを、動画全体の完全一致と字幕状態識別の組合せへ明示的に切り替えた。** 同じ約161秒の完成動画に対する検査計算は、修正版の字幕除去検査の140.600分から15.037分へ短縮した。QC開始から最終判定終了までは15.738分で、途中の証拠保存・検証を含む。最終結果の保存と終了後の保全照合は計測外である。32字幕・34時点、故障検出、独立検算、切替後の回帰、保全確認は以下の範囲で合格した。

| 確認事項 | 結果 |
| --- | --- |
| 正しく字幕1件を除いた全32件とPulse3時点 | 完走・合格。別Python実装による保存画素と実行記録の検算も合格［E31・E32］ |
| 全編完全一致と字幕状態識別の組合せ | 一回の新規測定で32字幕・34観測が合格。完成MP4と再合成MP4の全バイトが一致［E33・E34］ |
| 指定9故障と追加黒画面 | 組合せが10件すべて拒否。正常対照7件は通過［E06–E09・E30］ |
| 同じ完成MP4の最終QC | 指示適用・配置と可視性・動画と音声の3群が合格、違反0件。切替後も両方式で全32件合格［E35・E40］ |
| 保存画素・全編一致・最終証拠の独立検算 | 全34観測のRGB再計算と、実行入力から最終QCまでの別実装による照合が合格［E37・E38］ |
| 採用差分に関係する回帰 | 実行した68件が合格。名前指定で除外した72件は未実行として別計数［E41–E43］ |
| 保全 | 既存7作業treeの35項目、合成・描画等5関数本文、有限演出等8ファイルが一致［E44］ |

対象は人間修正0の完成候補である。本文・改行・表示時刻・字幕位置・保持区間・音声・AI判断・自動選択・人間修正を変更する工事ではない。利用者の完成MP4を保持し、QC用の参照動画と診断画像だけを一時領域に作った。

作業branchは `codex/digest-qc-fast`、比較の固定baseは `2899f8875857f4e0656ad434c79c85be4f387721`。接続修正の明示許可と採用条件に従って実施した［E01・E02］。Color・Scaleの既存採用状態、Panel・Pulseの技術成立・人間未採用状態は維持する。正式採用、見心地の目視判定、main統合、tag、stable、release、全既存callerの移行は未実施である。

この本文は実測と検証の到達点を報告する。最終監査の受理を先取りしない。本文自身を含む確定checkpointのSHAとremote一致は、同じ相談役へ提出する送信要約で別に報告する。

## 2. 各検査が調べること

| 本文の呼称 | 処理の意味 | 今回の位置づけ |
| --- | --- | --- |
| 旧透明PNG方式 | 字幕を透明画像へ置き換えて比較する。実FFmpegではその画像が不透明黒へ復号された | 誤りを含む失敗・性能履歴。品質基準や最終速度比較の分母にはしない |
| 修正版の字幕除去検査 | 対象の論理字幕1件を合成対象から除き、残りの字幕・順序・時計・フェード・Pulse・符号化条件を保持して比較する | 正しい除去による品質・性能基準。監査用として明示選択できる |
| A：動画全体の完全一致検査 | 固定した元動画、実字幕PNG、合成条件で全編を一度再合成し、現在の完成動画との完全一致を調べる | 固定入力から再現した全体との差を拒否する |
| B：字幕の有限状態識別 | 正常入力から作った表示候補を同じ代表時点・領域で比較し、期待表示が一意に最も近い場合だけ通す | 通常・Color・Scale・Panel・Pulse等の既知の状態を識別する |
| A+B：組合せ検査 | AとBの双方が合格し、現在の動画、全字幕の観測、実行記録、保存画素が一つの証拠として結び付く場合だけ通す | 対応済み自動演出の通常QCへ明示接続した方式 |

実装上の識別名は、旧透明PNG方式が `legacy encoded-v1`、修正版が `encoded-omission-v2`、組合せが `exact-replay-native-v1`。旧方式とB単独は最終完成動画を合格させる方式として認めない。対象外入力を別方式へ黙って切り替える処理はない。

AはまずMP4の全バイトを照合する。一致しない場合には、全編の復号画素、音声パケットの内容、順序、整数時刻、表示情報を厳密に照合する。今回の正常161秒入力は全バイト一致で通過したため、測定内では全編復号比較を実行していない。

Bは、対象字幕の除去、通常状態、部分Colorの全文化、Panel背景塗りの欠落、Pulseの別状態、別字幕の置換・追加、同時字幕の順序交換を正常側の入力から決定的に作る。同じRGB画像を一つの比較対象にまとめ、期待画像が字幕なし画像と異なり、期待画像への整数RGB絶対差が他の異なる画像より厳密に小さい場合だけ合格する。同率は拒否する。比較領域も正常側の候補全体から先に決める。閾値、重み、係数、画素許容率、黒画面専用候補は加えていない。

母数は次のとおりである［E29・E33・E38］。

- 論理字幕は32件。通常20、Color 9、Panel 2、Pulse 1、Scale 0。
- 代表観測は34時点。31字幕の各1時点と、Pulseの直前・最大・復帰の3時点である。Pulseは0始まりの3,299・3,304・3,310フレームを観測した。
- 本番PNGも34枚だが、画像枚数と観測時点数は別の数である。
- 全編は4,831フレーム。Bの34観測だけで全編の画素を照合したとは扱わない。
- 故障実証は17検体＝正常対照7件＋指定故障9件＋追加黒画面1件。実DigestにないScaleと、画素が重なる配置の順序は専用検体で確認した。

## 3. 品質と独立検算

### 全32字幕と同じ完成動画

修正版の字幕除去検査は32字幕とPulse3時点を完走して合格した。別Python実装は保存PNGから異なる画素を整数で数え、対象・除去対象・残存字幕順・抽出時点・実行命令・保存SHA・Pulseの3状態との厳密な距離を照合した。155件の直接子処理、32回の符号化進捗合計80,651フレーム、111成果物を確認し、合格を再導出した［E31・E32］。比較ツールの表示値と整数画素数の違い、および初版検証器の訂正は第8章に記す。

一回の新規A+B測定でも全32字幕・34観測が合格した。Aは同じ実PNG34枚を使い、元の完成MP4と再合成MP4の各75,278,536バイトが一致した。SHA-256はいずれも `bfaf7083d229c8649bac9eba1734074a4ef24e5881c50bf514d5d2527161419c`。Aで字幕PNGを再描画した件数は0である［E33・E34］。

最終QCは、その同じMP4と全体証拠を受け取り、32指示の適用、配置と可視性、動画と音声の3群すべてに合格した。動画は1,920×1,080・30fps・4,831フレーム、音声はAAC・44,100Hz・stereo。元動画と完成動画の音声パケット内容SHA-256は `475233b0648161e3014ef52ffa1d7f4400b8dca1b0dc66214a2d66af9cd1b56e` で一致した［E35・E53］。

### 正常7件・故障10件

同じ故障MP4を各方式へ渡し、故障前に固定した期待入力・参照候補・領域を使った。正常対照7件は4列すべて通過した［E06］。

| 故障内容 | 修正版の字幕除去 | A | B | A+B |
| --- | --- | --- | --- | --- |
| 対象字幕だけの欠落 | 拒否 | 拒否 | 拒否 | 拒否 |
| 部分Colorを字幕全体へ適用 | 通過 | 拒否 | 拒否 | 拒否 |
| Panel背景塗りの欠落 | 通過 | 拒否 | 拒否 | 拒否 |
| Scaleの拡大不適用 | 通過 | 拒否 | 拒否 | 拒否 |
| 別字幕の混入 | 通過 | 拒否 | 拒否 | 拒否 |
| 字幕の重なり順を逆転 | 通過 | 拒否 | 拒否 | 拒否 |
| Pulse最大状態を通常へ置換 | 拒否 | 拒否 | 拒否 | 拒否 |
| Pulseの時刻をずらす | 拒否 | 拒否 | 拒否 | 拒否 |
| Pulseの通常復帰を欠落 | 拒否 | 拒否 | 拒否 | 拒否 |
| 追加：背景ごと黒画面化 | 通過 | 拒否 | 通過 | 拒否 |

修正版が調べるのは字幕を除いた参照との差の有無であり、色・背景塗り・拡大や任意の破損の正しさを単独で保証しない。B単独が黒画面を通す限界も残している。組合せではAがそれを拒否し、修正版が拒否した故障の見逃しは0件だった。

純粋欠落の検体は、符号化前の背景について輝度と2つの色差成分の差が0で、字幕領域にだけ変化があった。欠落後の完成画像と修正版の除去画像はPNGバイトが一致し、全黒化はない。90フレームと音声142パケット等を保持した［E10］。重なる2字幕から片方を除いた2例では、残ったColorまたはPanel字幕が同じ入力による1字幕の正常画像と一致した［E11］。圧縮後の全背景画素や、残存2字幕以上の相対順序まで証明したとはしない。

### 独立検算が確認した範囲

| 検算 | 独立して再計算・照合した内容 | 実行していないこと |
| --- | --- | --- |
| 修正版32字幕［E32］ | 保存PNGの差分整数、32件の除去・実行・符号化進捗、Pulse3点、111成果物 | 動画の再生成・新たな復号 |
| 最終34観測のRGB［E37］ | 完成RGB34＋参照RGB2,348＝2,382ファイルの全バイト、同一画像の分類、符号付き整数差の合計、厳密最短、保存判定。2,450成果物、2,532入力・4,022,469,726バイトの前後不変 | 本番分類器の読込、候補集合・時刻・領域の独立再設計、新たな媒体処理、目視 |
| 最終実行全体の証拠［E38］ | 測定時の34ソース参照、固定入力、合成命令の独立再構築、実行原文、219＋5子処理、同じ完成動画と最終QCの完全な接続。192入力・714,403,030バイトの前後不変 | BのRGB算術、見心地、新たな復号 |
| 17検体の保存生出力［E07］ | 両側それぞれ20,494フレーム・29,594音声パケットの内容・整数時刻・順序、正常7／故障10の判定、230記録の前後SHA | 新たな動画復号 |
| 17検体の実MP4［E08］ | 計34ファイル・679,146,938バイトを2回読み、保存SHAとの一致 | 復号・画素距離の再計算 |
| 17検体の保存RGB［E30］ | 本番分類器を使わないPython実装で29観測・164実RGB・218生成物を再計算。正常7、指定9故障、黒画面のB単独通過を再現 | 候補生成・復号・AやA+Bの再実行 |

全編一致の独立検算では、現在の完成MP4、初回の再合成MP4、新規測定の再合成MP4の3本を実バイトで比較し、各75,278,536バイトの一致を確認した。その上で、初回に別途復号した保存原文を読み直し、両側各4,831フレームの画素SHA・整数時刻・順序、各6,937音声パケットの内容SHA・整数時刻・順序の完全一致を再確認した［E05・E38］。古い実装の参照を新規実行の証明へ流用せず、再利用する範囲を同じバイトのMP4と独立した保存原文に限定した。

最終RGB検算47.887秒、最終全編証拠照合3.133秒、修正版の独立検証5.996秒は、QC速度の測定区間外である［E50–E52］。初回の全編独立復号の件数や時間を、新規測定に加算していない。旧34点のRGB再計算［E13］は本番分類器を共用していたため、独立実装の証明には数えない。

## 4. 通常経路への接続と回帰

最終QCは、現在の完成MP4の実pathとSHA、全編の再合成結果、全字幕の観測、抽出・切出し・参照合成の実行記録、生成物のSHAまで照合する。保存された成功フラグや字幕1件の観測だけでは代替できない。別動画の全体証拠と字幕証拠の混成、字幕IDや出力SHAの改変、余分な実行等9パターンは拒否した［E09］。

採用条件の実証後、通常経路3ファイルと必要な回帰7ファイルの保存済み差分を適用した［E21–E23］。完成動画を判定する入口は、方式未指定、旧透明PNG方式、B単独を媒体処理の前に拒否する。対応済み自動演出を処理するジョブはA+Bを明示し、自動演出を伴わないジョブは修正版の字幕除去検査を明示する。対応外入力を自動的に別方式へ切り替えて成功にしない。方式を指定しない旧CLI等は停止する。今回の切替は対応済みジョブでの明示選択であり、全旧callerの移行ではない。

保存済みの全32件の実証を使い、差分適用前と適用後の本番判定器をそれぞれ確認した。どちらでも修正版とA+Bの両方式が32字幕・Pulse1件を通過し、現在の同じ完成MP4との結び付け、全体証拠の保存内容、最終判定に矛盾はなかった。これらの再判定は媒体処理0回であり、動画を作り直した結果ではない［E39・E40］。

| 採用差分に関係する検査 | 実行・合格 | 未実行 |
| --- | --- | --- |
| 修正版の字幕除去、全編一致と最終接続、有限状態の中核検査 | 50 | 0 |
| 自動演出の保存・再読と方式の明示選択 | 6 | 0 |
| Pulseの時計・適用・物理配置・証拠拒否 | 7 | 1 |
| 従来証拠の最終拒否と配置の限定検査 | 2 | 18 |
| 計画参照の限定検査 | 1 | 10 |
| 音声のみの限定検査 | 1 | 4 |
| 指示欠落の分類に関する限定検査 | 1 | 39 |
| **合計** | **68** | **72** |

未実行72件は名前指定で対象から外した検査であり、合格数に含めない。50件は最初の実行で合格し、続くTypeScript実行器が環境のIPC制限で起動に失敗した。stderrと失敗結果を保存し、正式な権限付き再実行で残り18件が合格した。初回の全体結果を合格へ書き換えていない［E41–E43］。

配置・音声・計画参照・障害分類だけを扱う検査は、その限定範囲を明示した。従来証拠は局所条件に問題がなくても、完成動画全体の最終証拠がなければ拒否する。Pulseの故障は、全体証拠欠落だけでなく、故障固有の時刻・状態の不一致も引き続き検出する。局所検査の成功を完成動画の成功へ読み替えていない。

## 5. 性能比較

同じ固定入力・同じ完成MP4に対し、修正版の全32件測定と、一回の新規A+B測定を専用の単調増加時計で比較した。Bの準備時間はB合計に含まれる。全体との差を各段階へ配分していない［E31・E33・E36］。

| 測定区間 | 秒 | 直接子処理 | 動画の符号化フレーム | 復号・比較・出力の意味 |
| --- | ---: | ---: | --- | --- |
| 修正版：32字幕＋Pulse3時点 | 8,435.992256 | 155 | 32回の実進捗合計80,651 | PNG79枚、実行入力JSON32件。内部復号仕事量は未観測 |
| A：全編完全一致 | 556.852060 | 5 | 全編4,831 | MP4全バイト一致。測定内の全編復号・画素列・音声パケット比較は未実行 |
| B：準備込み | 342.508552 | 214 | 完成動画の再符号化なし | 下記の診断PNG準備と状態識別を含む |
| 内訳：診断PNG準備 | 49.153560 | 76 | 対象外 | 19状態を2回ずつ描画した38PNG、既存21状態を再利用 |
| 内訳：状態識別 | 293.135485 | 138 | 完成動画の再符号化なし | 元PNG34、完成PNG34、完成RGB34、参照RGB2,348 |
| **A+Bの検査計算全体** | **902.229009** | **219** | **全編4,831** | 32字幕・34観測、準備・外側処理を含む |
| 最終QCの追加区間 | 39.325242 | 5 | なし | 同じ完成MP4の動画情報・音声・最終判定 |
| 検査開始から最終判定終了 | 944.252917 | 224 | 全編4,831 | 途中の証拠保存・検証を含む。最終結果保存・終了後保全照合は計測外 |

同じ検査計算範囲で、8,435.992256秒から902.229009秒へ短縮した。差は7,533.763247秒（125.562721分）、時間比は9.350167、減少率は89.305004%。新規測定は修正版の所要時間の10.694996%だった。これは実測値の比較であり、判定係数や新しい採用閾値ではない。QC開始から最終判定終了までの944.252917秒は、同じ計算範囲の時間比と分けて示す。時計は最終判定の直後に止めており、最終QC結果・媒体観測・全処理一覧の保存と終了後保全照合を含まない。

同じ計算範囲の直接子処理は155件から219件へ64件増えた一方、動画の符号化フレームは80,651から4,831へ75,820減った。短縮は子処理数を減らした結果ではなく、字幕ごとに長く再符号化する反復を全編一回へ減らした結果である。

実子処理の内訳も記録から照合した。修正版はFFmpeg111・画像比較44。A+B計算はFFmpeg105・ffprobe3・画像処理73・既存描画入口38の計219で、最終QCは別に5。準備の画像処理38起動は、19原PNGについて透明度最大と画素領域を各1回測ったものであり、38描画PNGを各1回検査した数ではない。反復描画した19組のPNGバイト一致は別に確認している。

Aと準備込みBの和から全体計算までの2.868398秒、準備とB本体の和からB合計までの0.219507秒、全体計算と最終QCの和から最終判定終了までの2.698666秒は、外側処理・途中の証拠保存と検証等の未配賦分として残す。内部復号仕事量、観測していない孫処理、全バイト一致で省略した全編復号を推算して加算しない。

| 別時点の参考履歴 | 計算秒数 | 直接子処理 | 動画の符号化フレーム | 限定する意味 |
| --- | ---: | ---: | ---: | --- |
| 旧透明PNG方式 | 8,837.354 | 155 | 79,653 | 誤った除去参照を含む147.289分の履歴［E14］ |
| Aの初回 | 558.859 | 5 | 4,831 | 初回の全バイト一致。独立復号は別実行［E04・E05］ |
| B単独の先行測定 | 346.766 | 214 | 0 | 準備53.098秒を含む。黒画面を見逃す単独方式の履歴［E15］ |

初回Aと先行Bを足して最終A+B時間を作っていない。旧方式との約25.49倍という過去の比率は、最終高速化の結論に用いない。

## 6. 保全と採用条件

最終計測前の点検は実装等34参照、Pulse時刻の根拠3参照、保全対象86参照を固定した［E03］。修正版とA+Bの固定入力JSONはともにSHA-256 `2da91094be1151c299fa07ea7c5fe153e5bac18c60a27139dd912ca09463d5b4`。最終独立照合でも同じ通常計画・解決済み計画・自動選択・実PNG・設定が結び付くことを確認した［E29・E38］。

採用差分と回帰の後、2026-09-17 02:52 UTCの照合で、既存7作業treeのHEAD・branch・状態・未stage差分・stage差分の計35項目が開始前と一致した。本番の合成引数・合成実行・旧比較器・字幕描画条件・PNG描画命令の5関数本文と、有限演出・自動選択・Pulse・描画部品等8ファイルも固定baseと一致した［E44］。専用QC branchと共有remote参照、全未追跡／ignoredファイルのバイトは、この35項目による保全証明の対象外である。QC入口を含むファイル全体が不変という主張もしない。

故障測定時の実装等21参照、修正版32件測定の実行コード等20参照、最終計測の34参照は別々に保存した［E19・E20・E49］。後続の接続修正を過去の測定コードへ遡って適用したことにしていない。

| 指定された採用条件 | 結果と根拠 |
| --- | --- |
| 修正版で32字幕・Pulse3時点が正常 | 成立。完走と別Python検算［E31・E32］ |
| 純粋な字幕欠落が成立し、修正版が拒否 | 成立。背景・音声・欠落・残存字幕・画素再計算［E06・E10–E12］ |
| 指定9故障の修正版結果が確定 | 成立。17検体の比較表［E06］ |
| 同じ161秒動画を全編再生成して完全一致 | 成立。新規測定と実3ファイルの全バイト独立照合［E34・E38］ |
| Aが黒画面を含む全故障を拒否 | 成立。故障10件と保存原文・MP4の独立照合［E06–E08］ |
| Bが必要な有限状態を識別 | 成立。正常34観測、Scale・重なり順等の専用検体、保存RGBの別実装再計算［E06・E30・E37］ |
| A+Bが修正版の拒否を見逃さない | 成立。正常7件／故障10件の結果と結合証拠再評価［E06・E09］ |
| 修正版より明瞭な時間短縮 | 成立。同じ計算範囲で140.600分から15.037分［E31・E33］ |
| 同じ完成MP4の最終QCが合格 | 成立。測定後・切替前・切替後の32字幕合格［E35・E39・E40］ |

これらの条件の成立を受けて対応済み経路の切替を実施した。追加の採用閾値や判定係数は設けていない。切替後の68検査と保全結果は第4章と本章のとおりである。最終監査の受理と正式な製品採用は、この技術検証とは区別する。

## 7. 制限と未実施の範囲

- 速度は現在の約161秒・32字幕の1入力に対する各1回の実測であり、長時間・大量字幕・別環境の保証ではない。修正版測定は02:25:13.192 UTCに終了し、新規測定は02:30:46.030 UTCに開始しているため、この2測定は重ならない。他の背景処理が一切ない専有環境だったとは主張しない。
- Aが証明するのは固定入力からの再現結果との一致である。期待計画の意味的な正しさ、字幕内容、見心地、人間の採否を保証しない。
- Bは有限候補と34代表時点の比較で、候補外の破損を単独で拒否できない。黒画面を通す反例を残す。全編一致と組み合わせる責務を省略しない。
- 初期対象は対応済みの自動演出・30fps・下中央の発話字幕等の既存profileで、挿入タイムラインを含まない。対象外は修正版を明示選択するか、未対応として停止する。全旧callerを移行した状態ではない。
- 実DigestにScaleはない。Scaleの検出は専用の実PNG検体の結果である。重なり順の検体は意図的な配置衝突を持つ画素識別試験で、本番配置を許可するものではない。
- 純粋欠落の背景完全一致は符号化前の比較である。圧縮後の全背景画素や残存2字幕以上の順序へ証明を広げない。
- 全体の独立照合とRGB検算の責務を分けた。RGB検算は保存された候補の全画素を再計算するが、候補集合や観測時刻を別設計で生成し直したものではない。既存34点の本番分類器共用再計算も、独立実装の実証として数えない。
- 今回は既存161秒MP4の実pathを不変のまま検証した。新しいジョブを公開まで一通り実走したとの主張はしない。既存の公開処理は成功後にディレクトリを原子的に移動し、再符号化やファイル内容の書換えは行わない。検査証拠は検査時の所在、公開記録は移動後の所在を持つ。移設後のpathを新しい現在参照として渡し、検査時の保存証拠をそのまま再評価する用途は、厳密なpath一致によって拒否する。移動後の新しい証拠再読consumerや、移動来歴の新基盤は今回追加していない。
- 診断画像・RGB・代替PNG・参照MP4は一時証拠領域に残る。新規測定の全体証拠［E34］と入力・出力の一覧［E37・E38・E49］が実pathとSHAを保持する。この報告は恒久保存先への移動を実施した記録ではない。
- 今回は名前指定で除外した72検査、未追跡入力を欠く過去fixture、旧trustに束縛された過去の一括描画検査を合格に含めない。正式成果物やtrust記録を書き換えて解消していない。局所診断の成功を完成動画の合格へ読み替えず、旧証拠しか渡さないcallerは最終判定で停止する。
- main統合、tag、stable、release、Panel・Pulseの人間による採用、見心地の目視判定、最終監査の受理はこの報告時点では未実施である。

## 8. 失敗履歴と証拠

### 残した失敗と修正理由

1. **旧透明PNGと黒画面の見逃し。** 573バイトのPNGは画像処理ツールでは透明だったが、実FFmpegでは不透明黒へ復号された。純粋欠落のつもりの検体は全黒化を含み、不成立だった。B単独も、その黒画面で期待字幕の候補が相対的に最短になり通過した。旧147分測定、元PNG、故障MP4、誤合格の実距離を保存し、論理字幕を合成対象から除く訂正版と全編一致の組合せへ再設計した［E02・E14・E54・E55］。この失敗を固定したcheckpointは `8e2ea502bfaba0938e000327903b74e008ae6cd1` であり、現在の合格結果へ書き換えていない。
2. **保存証拠の混成。** 全編側が正常でも、字幕観測だけを別動画へ差し替えられる不足を修正した。抽出元・時点・PNG・RGB・参照合成・実行原文・出力SHAまで結び付け、17検体と9改変を再確認した［E09］。本番分類器自体を共有した再計算は独立検算と誤記せず、後から別Python実装で17検体と最終34観測を確認した［E30・E37］。
3. **検査設営。** 依存読取、検査器の構文、ツール参照、一時領域の作成順、Pulse区間数の期待、固定Node、読込時JSON台帳を修正し、記録を保持した［E24–E28］。最終計測器の引数・集計・ソース保存・Pulse根拠3入力の終了後照合は実測前に確認した［E03］。採用回帰のTypeScript実行器はIPC制限で一度起動に失敗し、原文を保存して正式再実行した［E42・E43］。
4. **宣言時間の誤った仮定。** Pulse検体の両側の実宣言durationは、公称フレーム数÷fpsより1/3072秒短かった。公称値との同一を仮定せず、両側の実宣言値と全フレームの整数時刻を厳密比較した。許容差は加えていない［E07］。
5. **整数画素数と比較ツール表示の取り違え。** 修正版32件の初版独立検証は、整数で数えた異なる画素数と比較ツールの表示整数が必ず同じと仮定し、22番で停止した。独立した実RGB計数は254,715画素、領域は254,720画素、保存表示は254,716だった［E45・E46］。実使用版7.1.2-12の公式ソースと実ライブラリを照合したところ、画素数へ領域面積の逆数を掛けて正規化し、面積を掛け戻して切り上げる表示処理だった。倍精度の掛け戻し値254,715.00000000003を切り上げると保存表示に一致する［E47・E48］。訂正版の独立検証は、真の整数画素数をそのまま保存し、表示計算だけを公式順序で再現して全32件の保存表示と厳密一致を要求した。可視性は独立整数が0か正かと保存値の0か正かを一致させる。±1許容、22番だけの特例、画素数の変更はない。元の失敗結果と全32件の測定証拠を保持したまま、別版の検証器が合格した［E32・E45–E48］。
6. **接続の書込承認。** 自動承認審査で接続修正が停止した際は未適用案として保存し、明示許可の受領後に実施した［E01］。現在は承認待ちではない。中間checkpoint `71959289dc194d46441abe91222163c6d7ee92fd` と上記の失敗checkpointの監査履歴を、最終成立の証明へ読み替えていない。

### 証拠一覧

証拠の保存先は `/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r`。下表のSHA-256はこの報告の作成時に各ファイルの実バイトから再取得した。E01–E30の既存根拠を保持し、完走・独立検算・採用後確認の根拠を追加した。採用差分の説明JSONは提案作成時の記録のため未適用という状態表記を保持しているが、E21–E23の差分本文はその後適用され、E40–E44が適用後を検証している。

| 証拠 | 内容・ファイル | SHA-256 |
| --- | --- | --- |
| E01 | [接続修正の明示許可](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/authority/qc-integration-explicit-permission-20260917-v001.txt) | 6e8175ede811c870941969da8e8a944abaae5713dcc1595b85beddfe74c8ae4b |
| E02 | [訂正・再設計と採用条件](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/authority/qc-redesign-consultant-response-v001.txt) | 63dd84eb968da4e0316494fcd45f2012c240b5aa8ed49fe49f3fc819ae0b19fb |
| E03 | [最終計測前点検](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/combined-preflight-v003/preflight.json) | 1991cd669156722c9c8da7bb561a16bab2ae4bf40318d0af2b5c42d974fcf305 |
| E04 | [Aの初回実測](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/replay-benchmark-v001/result.json) | eded84900eda0a1acd712894bd34bac842bb9aaaf2fe35e7e208e7588ad39c2e |
| E05 | [Aの別実行による独立復号](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/replay-independent-v001/result.json) | d1954ddda40118f2956480252557e546b83e189cd0d6b466ea12f3b97d80ef35 |
| E06 | [訂正後17検体](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-fault-proof-v001/result.json) | 365c678b6246ca261fa96f6c10a9a85ab00a41ac7fd39147400a2a2d24c26151 |
| E07 | [17検体の保存生出力再解析](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-fault-replay-raw-independent-v001/result.json) | 6450e000b1ad258ce0499b2fbbdafa9032fc0f2e617870e84cb0012de55591d4 |
| E08 | [17検体の実MP4再ハッシュ](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-fault-replay-filehash-independent-v001/result.json) | 002f17a617cdafd4c04e51bc1bd5f38fb306f7b841e7fefba43883d265d72c3a |
| E09 | [結合証拠と9改変の再評価](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/combined-evidence-recheck-v001/result.json) | 5f38b35e9e4edd1fc411a6e2da63a9ab6dab52934b938bfc8207379f4bdc579a |
| E10 | [純粋欠落の背景・音声保全](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/pure-omission-background-v001/result.json) | 6c10de0a3bec9299a9708704e215e34a4bdbdf623799e6c58c6af30c828dbe7c |
| E11 | [除去後に残る字幕の確認](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/pure-omission-survivors-v001/result.json) | f09ba8191907df73e8b507c6b9e0a52c8857dfb026b93c72e29938f0ccfc831b |
| E12 | [純粋欠落の保存RGB再計算](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/pure-omission-rgb-independent-v001/result.json) | dfeff7f13ea8eb4f79209c6ee5443c48a2928e1842afcd2c243c7f13ce8ca857 |
| E13 | [Bの正常34時点の保存RGB再計算（本番分類器共用）](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/rgb-recheck-v001/result.json) | 3bba380de944cf28cf79af3e6776984e1527a4461b5bd5e405bbf0c13bdab9df |
| E14 | [旧透明PNG方式の性能履歴](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/slow-benchmark-v001/result.json) | 3e9bd50562abd5cb3f6145f8bf7a1afa2c7c1b6296c5bf46406cb96b4e180aae |
| E15 | [B単独の性能履歴](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/fast-benchmark-v001/result.json) | 3139d5d4fb59567e45f11c21e24dae6db3d51698121434ebebabc5e6e9a4ef50 |
| E16 | [接続後の軽量47検査](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/redesigned-oracles-unit-v006.tap) | e36aa29159b1c721ed3087117fff30a041e309fdc622a6e5aa728e31dfa1a3cc |
| E17 | [既存7作業treeの先行保全照合](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/final-preservation-v001/result.json) | fa0b3d5da26c1522bef043e0a7f44b35045c7965c75b5b88b1c08f442d1d35cb |
| E18 | [既存合成・描画本文の先行照合](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/source-preservation-proof-v001.json) | 3ccfd3b72972ece64f068d1b1aadc372101df74221f68521a033b4a1055698e4 |
| E19 | [故障測定コードの保存21参照](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/fault-execution-source-v001/source-manifest.json) | 3817e24ceb9912f3bf7f56fa19ca7f2e56dd92444041cd36feaf13bfb3800ccc |
| E20 | [修正版32件計測コードの保存20参照](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-execution-source-v002/source-manifest.json) | 5634c116d247f80ea4a67dab507647fcbf2f9c6ce14e424a509b31a1fea81484 |
| E21 | [通常経路3ファイルへ適用した採用差分](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/adoption-after-proof-v001.patch) | 4ef81c220b4a660428fb054f7bcc6cec9e34738ea19385486a11ffeb6847bc16 |
| E22 | [優先2テストファイルへ適用した差分](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/adoption-tests-proposed-v001.patch) | 8385944ed0780344b74e59f44ca3022ccde102b91475bc2b7f3e02cd060a3535 |
| E23 | [限定5テストファイルへ適用した差分](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/adoption-focused-regressions-proposed-v001.patch) | 80a8690c8ef3c96a681d322e22afb14717ad745745838b1910d9383d58b85be8 |
| E24 | [固定Node・JSON台帳の設営修正](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/redesign-setup-corrections-v002.json) | 7e379ef18ee9e24221135965ca3e91aeca0614ca6f6f6bdd2721200076a771d1 |
| E25 | [故障・再生成検査設営の修正](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/redesign-setup-corrections-v001.json) | baa3732c17558cc662e1f9b0a9522f9bb758424a1b7219fbe3bdb4a7de4525f8 |
| E26 | [依存読取の設営修正](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/benchmark-preflight-correction-v001.json) | 8d269955c2e615c5cd706008214dc48d519ab54c99e7728b03d47e19da8b56e2 |
| E27 | [故障検査器の構文修正1](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/fault-proof-syntax-correction-v001.json) | 1b48a760441d475a27f16405c85ea3ff4fd3e62731dd53ebb3ebace581fa403a |
| E28 | [故障検査器の構文修正2](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/fault-proof-syntax-correction-v002.json) | 673bf55922d845c6ab4ff3e478fec5fbad4e7ab1e26a08afccd2d47e3ce9a6f8 |
| E29 | [最終計測に固定した計画・自動選択・実PNG参照](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/combined-preflight-v003/fixed-inputs.json) | 2da91094be1151c299fa07ea7c5fe153e5bac18c60a27139dd912ca09463d5b4 |
| E30 | [17検体の全保存RGBを別Python実装で検算](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-fault-rgb-independent-v001/result.json) | aba78b6ff6443c2961e39fb1c3fed2f513d393a227446d55d5ae5b63b550607b |
| E31 | [修正版32字幕の完走・性能](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-benchmark-v001/result.json) | 055b23db5b9c086e97e374fe67fb72a91059e17bb89282cfc62189a71510b203 |
| E32 | [修正版32字幕の独立検証・訂正後](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-baseline-independent-v002/result.json) | eeb327039c0342c4c9e674d70591e7d322cc98325e8bf0615c9e8face515c9e8 |
| E33 | [同一測定の全編一致・状態識別・最終QCの時間と件数](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/combined-benchmark-v001/result.json) | 197f0630adf4a9f59f729967720c018396ca131bd2a08b82dc2092186e19ec27 |
| E34 | [新規測定の全編一致・全32字幕の結合証拠](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/combined-benchmark-v001/combined-result.json) | bf15a2d8d86ed1b65a544dcfa8186d61e8c599ef8db01e538c43b6557708d9dd |
| E35 | [新規測定後の同じ完成MP4の最終QC](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/combined-benchmark-v001/final-production-qc.json) | 0c05f0cfd1ad84488ae9916b934d1a35a5da54f5b10c7b761425c8344accb786 |
| E36 | [新規測定で観測した全224直接子処理](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/combined-benchmark-v001/processes.json) | fa1635f8cda1d6fd036dea8536c9db11dc5f5697de204dfefc1232286251a22b |
| E37 | [最終34観測・全保存RGBの独立再計算](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/final-combined-rgb-independent-v001/result.json) | 32a352f8cfe3024fee89c8f1e80c7d2df075e1c62ab2164ea78b5ef785fce13c |
| E38 | [最終実行の入力・合成・実行原文・全編一致・最終QCの独立照合](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/final-replay-closure-independent-v001/result.json) | c897cfd52ff892ea55a02bab9a62a92e13861f7bba988dac2c20a62099389c66 |
| E39 | [採用差分適用前の両方式・全32字幕の最終判定](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/final-production-routes-v001/result.json) | 47bf89acd17f6903a684a54ea2cb9f5fe58aeff4b6533ba0626499902f549f7b |
| E40 | [採用差分適用後の両方式・全32字幕の最終判定](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/final-production-routes-v002/result.json) | 6def4d962132f894a4656eb3605bc21ec86edcd9c8fc4185a16cdb5a45fb137e |
| E41 | [採用後の中核50検査TAP](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/adoption-validation-v001/oracles.tap) | 8972cdc5a1137295ae5e4c77c9c2b7da7ed6757a008b5d208fb71a9baa977c1b |
| E42 | [初回回帰：50合格後のIPC制限による起動失敗記録](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/adoption-validation-v001/result.json) | 01903f108b46c1637430132aa16bd83976039d29845841b497da4c14c064d27b |
| E43 | [正式再実行：自動経路6・限定回帰12の結果と全TAP参照](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/adoption-validation-v002/result.json) | 1ec4fdddb4712e9dbbcc28256e3b44b8a66c506af35f596f167bcdfb71ba8e6a |
| E44 | [採用後の既存7作業tree・5関数本文・8ファイルの保全](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/final-preservation-v002/result.json) | d51f4da9f732cc5e61d78bc49afbee24fe2cd7790044d35b559242a618b6e061 |
| E45 | [差分画素数と表示整数を同一視した初版独立検証の失敗](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-baseline-independent-v001/result.json) | 195d2aa4c2ec9979c2f94b7dc4f05e2395a46cc8e38c31848754014a6d369bb5 |
| E46 | [画素実数と比較ツール出力の実診断](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-ae-pixel-diagnostic-v001/result.json) | 129fcf95264d04c8ed5acf906f816a8ade261220fcd36b88f647d7850f3991c9 |
| E47 | [実使用版7.1.2-12の公式ソース保存記録](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/imagemagick-ae-source-7.1.2-12-v002/result.json) | 20af143b975eed89cf8589158885f48eb646331d5023d5a0ef437a36b0aa2997 |
| E48 | [実バイナリの切り上げ命令と32件の表示値再計算](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/imagemagick-ae-binary-diagnostic-v001.json) | bf2bc5d22fe8a714e63dbe5b6df6efe362a962bd393ac688582cad8663f93ce6 |
| E49 | [最終計測時の実装等34参照の保存コピー](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/combined-benchmark-v001/source-snapshot/manifest.json) | 25ee67f48ba9f109d2eda45cba72bdbf3577fc7cd013b41328453c0dd65a0bc0 |
| E50 | [最終RGB独立検算の実行時間・終了状態](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/final-combined-rgb-independent-v001/execution.json) | 5755d934c9c54b51d58dbc2e6096f7d8ea812b984d267e3b6c0d43bc7c18617d |
| E51 | [最終全編証拠独立照合の実行時間・終了状態](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/final-replay-closure-independent-v001/execution.json) | 700f9fd4adccc91ac05aa87957729563a3f156309d150a0fe0c92d3f37caf40d |
| E52 | [修正版独立検証・訂正後の実行記録](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-baseline-independent-v002/execution.json) | 0e92f22bd3f65503c4c0b80d60a9e32640ba355726408274627d522f69d03606 |
| E53 | [同じ元動画・完成動画の動画と音声の観測](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/combined-benchmark-v001/media-inspections.json) | 16c63127a87bda5706f5ca2717a588e73a4796085e144d03e010f09b9f8c3476 |
| E54 | [旧透明PNGが不透明黒へ復号された診断](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/fault-missing-alpha-diagnosis-v001.json) | ce5fd9885db39b79c6a595a7d7ecafe0880858888f6f7c9c744c40430ad0111d |
| E55 | [旧黒画面反例での両方式比較](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/fault-proof-v001/normal/comparison-01.json) | cc3b636e313289095ea53310398ee043da69870a3edcceda9142bf952eea0ff5 |

17検体の独立RGB検算の実行記録：[実行時間・終了状態・検証器SHA](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-qc-fast-73wz922r/corrected-fault-rgb-independent-v001/execution.json)、SHA-256 `5fd103293f0fd6bd4812f9beacd0a39a1b5e052adfdc910358a0caf7efb1235d`。
