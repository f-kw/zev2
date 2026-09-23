# 数値時刻方式による候補動画理解 — 5本の較正結果と設計上の限界

文書版: v001  
記録日: 2026-09-05  
対象: 差替後task-026。過去の結果を保持し、ID参照A/B再較正の前提を整理する設計資料。実装・実走・正式採用の承認書ではない。

## 1. 結論

技術的な受理と元動画への時刻投影まで成立したのは2/5（item-0001・0003）。既知候補の必要場面を保持した提示は確認できなかった。一方、内容説明には部分的に有用な観測があった。数値時刻生成、主題選択、連結境界の因果誤認、短い初回提示の方針が混在した結果であり、Geminiの動画理解全般を不採用とする根拠にはしない。

次版は「意味を判断して既存IDを選ぶLLM」と「IDを検査し正式時刻へ解決するZEV」の分業に戻す。ただし、IDが存在することは、選んだ場面の意味が正しいことを保証しない。比較の主眼は、新版の文字起こし条件に実映像・音声を追加する価値である。

## 2. 変更しない結果と履歴

| 当時の評価 | 当時の結果 | 今回の扱い |
| --- | ---: | --- |
| 技術的な受理・投影の成立 | 2/5 | 0001・0003。内容理解の合格とは別 |
| 必要場面を保持して使える時刻付き提示の成立 | 0/5 | 当時の課題・入力・評価基準に対する運用上の成立数を保持 |
| 内容説明の部分的な有用性 | 3/5 | 0001・0004・0005。全観点の正解率へ読み替えない |
| 内容説明と使える時刻付き提示の両立 | 0/5 | 新版の形式変更で成功へ付け替えない |

必要区間の包含を評価できる既存人間参照は0001〜0004の4本・前後8地点である。0005には人間承認済み必要区間がない。0/5という旧集計を「5本全てに人間正解境界があった」と解釈せず、新版でも0005を必要区間包含の分母へ入れない。

0001は初回、判断材料不足の説明が空文字だったことで停止した。その後、別途承認されたtask-015の限定検査修正により、同じ未変更raw応答のローカル再検査が合格した。元の停止と再検査の双方を残す。0002・0004・0005の時刻範囲違反は失敗のまま残し、再推論、clamp、許容誤差追加、時刻削除による成功化を行わない。

差替前のtask-026では、[旧較正結果資料](/Users/kawafmm/workspace/zev2/docs/ZEV_候補動画理解_v1_較正結果_v001.md)が既に新規作成されていた（SHA-256 `26886bf33e05c77ed9399196bee7e8e67bc9dda3194165981c7ab5340ba6a7b1`）。数値時刻の回答責務だけを外す契約・コードは未適用。本指示到着前の文書作成の事実を隠さず、旧資料を上書き・削除しない。その資料中の旧次案と未作成資料への参照は現行計画として使わず、差替後の計画は[ID参照再較正計画](/Users/kawafmm/workspace/zev2/docs/ZEV_候補動画理解_ID参照再較正計画_v001.md)を参照する。

## 3. 当時の入力と測定対象のずれ

保存された要求は、同じ元配信から作った広域探索動画5本を使い、動画全体の中心出来事・原因・導入・反応・終端・不要部分・映像注意・材料不足を尋ねるものだった。モデルは保存要求上の `gemini-3.8-flash`、STATIC、1 FPS、HIGH、MEDIUM、JSON Schema、出力設定4,096である。4,096を「必ず使える可視回答量＋別の固定thinking量」とは主張しない。

実験設計上の問題は、**問いが「限定動画全体から目立つ出来事を選ぶ仕事」であるのに、評価は「元の遠方候補に必要な前後の場面を保持したか」であったこと**である。候補の対象発話・確認対象と連結segmentを、意味判断用の入力へ十分に結び付けていなかった。元の問いで目立つ別場面を答えても、既存候補の保持という評価では失敗し得る。

また、探索動画は元動画の離れた二場面を連結していた。画面上の隣接は、元配信での実時間連続や直接因果ではない。その違いをモデルへ明示する設計、意味を尋ねる対象指定、ZEV側の提示方針にも責任がある。全てをモデルの時計能力または動画理解能力の一因へ帰属させない。

## 4. item別の観測

| item | 技術結果 | 主題・文脈の照合 | 時刻・提示の問題 | 残す部分的価値 |
| --- | --- | --- | --- | --- |
| 0001 | 保存済み再検査で合格 | 人影の急接近・恐怖は粗く対応。連結境界を原因区間がまたぎ、必要な前半を除外候補にした | 提示7.5秒は後半の一部のみ。前半と恐怖映像後の必要な発話・自然な終わりを保持しない | 粗い恐怖イベントの説明 |
| 0002 | 範囲違反で停止 | 薬と後半文書の対象ではなく、周辺のクリーチャー対処を主題にした | 約106.533秒の動画に対し中心112.5〜118.5秒、注意120〜146秒等。正式投影・提示なし | 一部の操作・読書の記述は対応するが、固定済み有用3件には加えない |
| 0003 | 合格 | 引き出しと暗転を主題にして連続因果を説明。必要な新聞記事と鬼母の結末を除外候補にした | 提示9.8秒は前後の既存必要区間の双方と非重複 | 文字読み中心という注意は部分的に対応するが、有用3/5の再集計はしない |
| 0004 | 範囲違反で停止 | 追跡・急接近は粗く対応。前振りを除外候補にした。ベッド下退避等の細部は保存人間記録だけでは未確定 | 動画120.500秒に対し反応・終端120.600秒。反応111〜120.6秒も既知発話約90.023〜100.241秒から外れる | 粗い追跡・急接近の説明 |
| 0005 | 範囲違反で停止 | 出来事本体の材料不足は指摘したが、終了後の振り返りを直接反応として扱った | 動画約104.967秒に対し反応終端141秒、注意終端145秒。正式提示なし | 紹介と終了後の感想だけでは出来事本体を確認できないという説明 |

0004は100msの超過だけ、0002は動画尺の上限だけを直せば内容も正しくなる状態ではない。範囲内の0001・0003にも必要場面の欠落がある。

0001では原因54〜56.5秒が約55.166667秒の連結位置をまたぐ。0003では前半終端約55.033333秒、後半開始55.050秒の周囲を、引き出し→暗転→反応という連続した出来事として説明した。連結の誤認誘発は可能性として残すが、唯一の原因とは確定しない。約16.666667msのmapping空隙は、長い黒画面の実在証明にはならない。

これらは保存済み応答、正式発話、既存人間評価・区間化記録の読取照合であり、新たな動画解析または人間の目視判定ではない。モデルの「映像で見た」という自己申告を、そのまま視覚事実の証明にしない。

## 5. 人間評価と必要内容は別の軸

| item | 保存済みの人間判断 | 必要内容照合用の元動画区間（ms、終端非含有） |
| --- | --- | --- |
| 0001 | 恐怖映像を含む区間化改善後、遠方接続として合格 | 前半 [664354,671316)、後半 [1377918,1426649) |
| 0002 | 区間化改善は合格。必要文脈が多すぎて短尺候補として不採用 | 前半 [1680130,1686233)、後半 [4389098,4412003) |
| 0003 | 物語上の接続・回収は成立するが、文字中心で映像の魅力・反応が弱く不採用 | 前半 [1724755,1739800)、後半 [5693397,5714097) |
| 0004 | 接続成立。ただし恐怖場面・反応の回収強度不足で不採用 | 前半 [246000,255324)、後半 [1980000,1996000) |
| 0005 | 一般的紹介と終了時の感想の接続では理解・回収感・意外性・面白さが増えず不採用 | 承認済み必要区間なし |

これらは唯一の最短解ではなく、既知候補に必要だった内容を照合する参照である。「別の短い動画として良いか」は別に評価する。不採用を出来事不存在へ、反応の弱さを悲鳴不存在へ置き換えない。

無料比較方式は前後16,000ms、広域探索は前34,880ms・後15,378msを正式発話境界へ外向きに広げた較正条件だった。これらの値は人間正解を参照して選んだ履歴であり、未使用素材への一般化の証拠ではない。今後のA/Bでも既存5動画をそのまま使い、窓を再調整しない。

無料方式5本合計413.837秒。技術成立2本の無料方式合計154.961秒に対し、Gemini提示は17.300秒だった。しかし必要場面が失われており、人間負担削減の成功とは呼ばない。失敗3本を0秒の成功にせず、実際の視聴時間・再視聴・修正量は未測定とする。

## 6. 再利用できるもの／できない解釈

再利用できるのは、未変更の5動画、正式PTS mapping、構築検証記録、正式発話artifact、評価前に存在した候補の発話ID、独立保管された人間評価、raw・要求・使用量・停止・再検査の履歴、共通限定実行処理の保存・送信前照合機構である。Files参照は保存時点の状態・期限記録であり、現在も使用可能とは未確認。

再利用してはいけないのは、旧数値時刻を新ID出力の正解として与えること、旧countTokensを新要求の実測とみなすこと、旧0/5を動画理解全般の不採用判定とみなすこと、ID方式だけで意味理解も正しくなるとみなすことである。

新版では文字起こし、対象指定、segment明示、ID参照、提示を作らない責務へ変更する。旧版との差を「ID化だけの効果」と断定しない。新版A/B間の差を主要比較とし、実映像と音声を追加した増分として測る。既に人間正解を読んだ同じ5素材による再較正であり、独立validation・完全盲検ではない。

## 7. 証拠所在と保持確認

### 7.1 生回答・停止・再検査

ファイル全体のSHAと、記録内の生回答SHAを区別する。旧要求本文・停止理由・使用量も同じ記録に保存されている。

| 記録 | ファイルSHA-256 |
| --- | --- |
| [item-0001-inference-record-v001.jsonl](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0001-inference-record-v001.jsonl) | `a71cb4e52c20f0b1157f13d84c548856f29e9ddd6500e9b67ec4b6b95adbeed9` |
| [remaining-four-inference-record-v001.jsonl](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-four-inference-record-v001.jsonl) | `efa00a9a655017871c06091ff8a54415066953a891ef497f8fa1fb4fd5f6a476` |
| [remaining-three-inference-record-v001.jsonl](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-three-inference-record-v001.jsonl) | `e89329987673c40d84cf1ce54e0236d25c7bf9cbbfa6df3d52446468b7ee787e` |
| [item-0005-inference-record-v001.jsonl](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0005-inference-record-v001.jsonl) | `c071e1686df77f2c973493e4187ba6bdfe704533a3f9f63f3c3c18296b21da9b` |
| [item-0001-local-revalidation-v001.json](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0001-local-revalidation-v001.json) | `5eeddf0a3cf5384f673e60a6a0a29a69146bd657cedf3c84c24b04eaccf16e51` |

| item | 生回答の保存位置（外側JSONLの1始まり行） | raw SHA-256 |
| --- | --- | --- |
| item-0001 | [item-0001-inference-record-v001.jsonl](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0001-inference-record-v001.jsonl):3 | `6ffe6662103275d0fb24b13fa8f3e49630fa26cd03a394dee420c7cfb76df426` |
| item-0002 | [remaining-four-inference-record-v001.jsonl](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-four-inference-record-v001.jsonl):4 | `e5c35e065532c7d11fd5b2c8b86c368d0b489cd412347b0cc71f652da0cc08e7` |
| item-0003 | [remaining-three-inference-record-v001.jsonl](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-three-inference-record-v001.jsonl):4 | `b234d4495f780c777338a3a0066d985511b2151e6b00904f40dbec6ea67bdd15` |
| item-0004 | [remaining-three-inference-record-v001.jsonl](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-three-inference-record-v001.jsonl):11 | `527f21048b69b644ca4e28e27e0267f3de9e3759f46e3ab2a1d212e5672a103b` |
| item-0005 | [item-0005-inference-record-v001.jsonl](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0005-inference-record-v001.jsonl):4 | `2ce5e4ceaa0d2098472b4250f644b85c81d7b3de9222e9e3e31faba8ff13081e` |

### 7.2 元動画と探索動画

元動画は `ymUsGrT6EaA`、SHA-256 `79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537`。各mappingの正式source bindingを保持する。

| item | 動画・対応記録 | 動画SHA-256 | mapping SHA-256 |
| --- | --- | --- | --- |
| item-0001 | [探索動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0001/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0001/exploration-video-source-pts-mapping-v001.json) | `d863d7c2c6983e2b9122b22cc961b1717f7b0a85c4e3cde38bb1b5c5333d6d83` | `529a167addd6f5b5eb5fe61e882d3195605f9809cd7aaeaa97d6680c5c65f1a8` |
| item-0002 | [探索動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0002/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0002/exploration-video-source-pts-mapping-v001.json) | `39b90cab250782907653fc09501fb3a5b329b345f2957fa0e38d34e07b02fb63` | `14dcb2bf73c7ac1d13b7d03ac1862ee3363d1ed94eb2bf601e9bf4b567a5ec43` |
| item-0003 | [探索動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0003/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0003/exploration-video-source-pts-mapping-v001.json) | `9a10f19a55824177c85b94477ab6c3d01f2af7a3ab498834c22c5b607e915e56` | `54f57cba6c43cd64c591e66f5c33e1cf33d62b557c56503790da917399b78044` |
| item-0004 | [探索動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0004/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0004/exploration-video-source-pts-mapping-v001.json) | `a42fef7ecfe12bba207f47aed83582c459ebb70084830a070450fed2db31480d` | `adad741947841f43397987368389c81c7f86a1e9c1709a2b6fc00b30cbfdb809` |
| item-0005 | [探索動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0005/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0005/exploration-video-source-pts-mapping-v001.json) | `0b6b4134fb242fd70eb682f0c6bc9b6fe1af01851053818c79838d543904e5e0` | `1e132d4127f6ec496ae47d8e4f8e01e50cc5f74f0ec5a1848c0522a1767673d5` |

### 7.3 評価側の出典（新版provider入力から除外）

| 記録 | SHA-256 |
| --- | --- |
| [human-review-result-v002.json](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v002/human-review-result-v002.json) | `fac03dc688f28e64831a7b8241cec560313cf7da3aacc585b30bf8efab270a92` |
| [human-quality-review-result-v001.json](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-human-quality-review-result-ymUsGrT6EaA-v001/human-quality-review-result-v001.json) | `1087dcab775f89d6d344cf061063a33f614c94af6fb7305f4f39a48e7402dffd` |
| [candidate-human-review-result-v001.json](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-human-review-result-v001.json) | `24ec180fcba4d88cc17afd20a2fcb189da104c99e80e1388595e2a5ae0d4780e` |
| [0001・0002の改善区間](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json) | `b1a6c1e4233aaabf447ec5ab3ca7d14657bd5a1dfb09a18557c11752fdd85dfe` |
| [0003・0004の区間](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json) | `8137a990774f78974008e8bbe8555f8618ce4933a968dd3295c22b017db2b527` |

入力側の出典・全発話一覧は再較正計画に分離する。本書の評価や旧回答を丸ごと新要求へ添付しない。

## 8. 今回の承認境界

現行AGENTS、DECISIONS、CURRENT_GOAL、GOAL_DEFINITION、上位architectureを参照した。今回の着手根拠は相談役経由のkawafmm承認を含む差替後task-026の個別指示であり、別の着工承認済みwork-orderやGoal設定へ拡張していない。アプリ上のGoal設定はなし。CURRENT_GOAL等の目的記載を実走許可として扱わない。

今回新規作成するのは本書とID参照再較正計画の2 pathのみ。既存未commit差分、先に作成済みの旧資料、保存記録、コード、test、契約、動画・mapping、目的・判断記録は変更しない。API通信・有料推論・API probe・新動画・再encode・人間への新規視聴依頼・正式selection・skill採用・commit・tag・remote操作は行わず、2資料の提示で停止する。

