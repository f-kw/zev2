# Gemini候補動画理解v1 — 5本calibration結果の正本

文書版: v001  
記録日: 2026-09-05  
作業: task-026（結果の正本化と、数値時刻の回答責務だけを外す次版契約の設計）  
状態: 較正結果を文書として固定。コード・保存済み結果・既存契約は変更していない。commit・tagによる固定は未実施。

## 1. 位置づけと結論

本書を、task-024の答え合わせとtask-025で固定された5本の較正結果の文書正本とする。新しい人間目視判定を作ったものではなく、保存済みGemini回答、既存の人間評価・区間化証拠、正式な元動画対応を照合した結果を保存する。

「v1」は今回完了した時刻付き候補動画理解方式の呼称であり、ファイル内のschema版を改名するものではない。実走入力は `candidate-video-understanding-job-v002`、provider回答は `candidate-video-understanding-provider-output-v002`。実装ファイル名のv001とも区別する。

| 評価対象 | 固定結果 | 意味 |
| --- | ---: | --- |
| technical validity | 2/5 | 0001・0003が既存の厳格検査を通過。内容の正しさや必要場面保持の合格ではない |
| 必要場面を保持するtemporal grounding | 0/5 | 必要場面を保持して使える時刻付き提示が確認できた件数は0 |
| 内容説明に部分的な有用性 | 3/5 | 0001・0004・0005の主題に関する説明に部分的な有用性。全役割の正解率ではない |
| 内容理解と時刻の両方成立 | 0/5 | 部分的な説明の有用性と、使える時刻付き提示の両立は未成立 |

この四つを合成点、モデル精度、validation性能に変換しない。0003にも文字中心という有用な注意はあるが、それを理由に固定済みの3/5を増やさない。

0/5は5本全体の運用上の成立件数である。人間承認済み必要区間を用いる包含評価の対象は0001～0004の4本・8地点であり、0005へ正解区間を捏造しない。

現行方式の正式採用・共通skill採用を支持する結果ではない。「時刻だけの問題で、内容理解は安定した」とも結論しない。次に検討するのは[数値時刻の回答責務だけを外す内容観測契約](ZEV_候補動画理解_内容観測契約_v001.md)であり、実装・実走は別承認を必要とする。

## 2. 実験条件と結果の保全

元配信は `ymUsGrT6EaA`。対象は保存済み5本の探索動画で、前後2場面の連結を含む。modelは保存済み依頼にある `gemini-3.8-flash`、static動画理解、1 FPS、高media resolution、medium thinking、JSON Schema形式、可視回答上限4,096 tokensであった。

無料比較方式は候補地点の前後16,000msを正式発話境界へ外向きに広げる。Gemini探索領域は前34,880ms・後15,378msを別々に外向きに広げる。いずれも人間正解を参照して選んだ較正条件であり、独立した性能証拠ではない。

- 保存済み5回答の内容、推論依頼、動画、元動画対応、失敗履歴を変更しない。
- 0002・0004・0005は時刻範囲検査の正式な失敗のまま保持する。
- 再送、再推論、時刻補正、clamp、tolerance追加、回答から時刻を削って成功に変える処理を行わない。
- 0001はtask-014時点で材料不足説明の空文字による停止があり、別途承認されたtask-015の局所検査規則で、同じ未変更回答のローカル再検査が合格した履歴を持つ。元の停止記録を消さず、2/5にはその再検査結果を用いる。本書作成で再修正したものではない。
- 保存済み準備manifestや設計v0.2の「実走前」という当時の状態は、そのまま履歴として保持する。完了した実走の証拠は以下の実通信記録とローカル再検査記録であり、準備時の許可値を現行の通信許可とみなさない。

## 3. item別の責務評価

| item / 候補 | 技術判定 | 内容・文脈の問題 | 時刻・初回提示の問題 | 部分的に残す価値 |
| --- | --- | --- | --- | --- |
| 0001 / カメラへの恐怖から恐怖の増大 | 合格（保存済みローカル再検査） | 原因の説明が連結境界をまたぐ。直接反応と終わりの細部は人間評価に結び付く既存証拠で十分確認できない。必要な前半を除外候補に含めた | 7.5秒の提示では前半と、恐怖映像後の正式発話・自然な終わりを保持しない | 人影の急接近・恐怖イベントの粗い説明 |
| 0002 / 薬の効き目の回収 | 時刻範囲違反 | 薬と後半文書の候補ではなく、周辺のクリーチャー対処を主題とした。部分的に対応する発話はあるため「全内容が架空」とはしないが、時刻だけを直せば主題が正しい状態でもない | 約106.533秒の動画に対し主題112.5～118.5秒、文書読み注意120～146秒などを回答。正式投影・提示は未成立 | 操作説明や読書についての部分的記述。ただし固定した主題内容の有用3件には含めない |
| 0003 / 医師の失踪から鬼母 | 合格 | 引き出し・暗転を主題として連続因果を説明。必要な新聞記事と鬼母の結末を除外候補に含めた | 9.8秒の提示は既知の前後の必要区間といずれも重ならない | 前後が文字読み中心という注意だけは部分的に対応 |
| 0004 / 「今年一怖い」から急加速 | 時刻範囲違反 | 追跡・急接近は粗く対応。ベッド下への退避などの細部は既存人間記録だけでは確定しない。必要な前振りを除外候補に含めた | 約120.500秒に対し反応・終端120.600秒。加えて反応111～120.6秒は、既知の反応発話約90.023～100.241秒と重ならない | 追跡・急接近という粗い出来事の説明 |
| 0005 / ゲーム紹介から終了時の振り返り | 時刻範囲違反 | 出来事本体の材料不足を説明した点は有用。ただし終了後の感想を当事者の直接反応として扱った | 約104.967秒に対し反応終端141秒、注意終端145秒。正式提示は未成立。人間承認済み必要区間はない | 導入と終了後の感想だけで対象の出来事本体を確認できないという説明 |

範囲内の時刻でも必要場面を外しているため、動画尺maximum追加だけを主要改善策にしない。0004も100msの超過だけが問題ではない。

ここでの内容照合は既存人間評価・区間化記録・正式発話との比較であり、新たな映像・音声の人間最終判定ではない。映像根拠を示す回答上の自己申告だけで、細部を正しいと認定しない。

### 3.1 候補自体に対する人間評価は別に保持する

| item | 既存の人間評価 |
| --- | --- |
| 0001 | 恐怖映像を含む区間化改善後は遠方接続として合格 |
| 0002 | 区間化改善は合格だが、必要文脈が多すぎて短尺候補として不採用。追加拡張しない |
| 0003 | 物語上の接続・回収は成立するが、文字中心で映像の変化・反応・魅力が弱く不採用 |
| 0004 | 接続は成立するが、前振りに対する恐怖場面・反応の回収強度が不足して不採用 |
| 0005 | 一般的な紹介と終了時の感想を結んでも理解・回収感・意外性・面白さが増えず不採用 |

これらをGeminiの技術検査の合否へ置き換えない。特に「反応が弱い」という人間判断は、悲鳴が存在しないという意味ではない。

## 4. 連結境界を連続因果として扱った証拠

| item | 正式な連結位置 | Geminiの説明との関係 |
| --- | --- | --- |
| 0001 | 探索動画約55.166667秒。元動画約683.249333秒の後に約1,377.899333秒が来る | 原因54～56.5秒を「トイレの扉を開けて廊下へ出ると怪異が出現」と説明。元動画で一続きに確認された因果として採用できない |
| 0003 | 探索動画の前半終端約55.033333秒、後半開始55.050秒。元動画約1,750.332667秒から約5,662.949333秒へ移る | 原因53～54.7秒の引き出し操作に続き、出来事54.7～55.8秒の暗転、反応55～57秒が起こると説明し、連結をまたぐ |

0003の間にある約16.666667msは正式な対応のない映像時刻区間として保持する。それだけで「9.5秒間の黒画面」を説明・実在証明したことにはならない。

連結が誤認を誘発した可能性はあるが、唯一の原因とは確定していない。また、現行の問いは限定動画全体の主題を尋ね、候補に必要な前後場面を選ぶ目的を十分に結び付けていない。モデル能力、問いの設計、初回提示方針を単一原因へまとめない。

## 5. 必要区間と無料比較方式

以下の元動画時刻はms、終端非含有。必要区間は既存人間評価に結び付いた前後の区間化証拠であり、「出来事開始」「反応終了」を細かく人間認定した役割別正解ではない。

| item | 人間参照・前半 | 人間参照・後半 | 無料方式の元動画区間合計 | Gemini初回提示候補の尺 |
| --- | --- | --- | ---: | ---: |
| 0001 | [664354, 671316) | [1377918, 1426649) | 87.887秒 | 7.500秒 |
| 0002 | [1680130, 1686233) | [4389098, 4412003) | 74.362秒 | 未成立 |
| 0003 | [1724755, 1739800) | [5693397, 5714097) | 67.074秒 | 9.800秒 |
| 0004 | [246000, 255324) | [1980000, 1996000) | 96.479秒 | 未成立 |
| 0005 | 正解区間なし | 正解区間なし | 88.035秒 | 未成立 |

無料方式の5本合計は413.837秒。人間参照のある4本・8地点はこの無料方式に包含されるが、較正値を選んだ素材上での結果に限る。

0001の7.5秒は後半の一部だけであり、前半を丸ごと欠く。0003の9.8秒は前後の必要区間との重なりがともに0。0003の候補動画上の9.8秒には約16.666667msの対応のない空隙が含まれ、元動画への投影部分は約9.783333秒である。空隙を元動画へ割り当てない。

0001・0003の無料方式合計154.961秒とGemini提示候補合計17.300秒の差を、人間負担削減の成功と呼ばない。必要な場面が失われている。また、失敗3本を0秒として無料方式5本と比較しない。今回、実際の人間視聴時間・再視聴時間・修正量は測定しておらず、負担削減は未確認である。

## 6. 次版へ渡す判断と渡さない判断

残す価値がある観測候補は、粗い出来事種別、文字・静止画中心などの注意、出来事本体を提示材料から確認できないという説明である。

直接反応の識別、原因、自然な終わり、最低限の前提、外せる部分、正確な位置の安定性は成立していない。ただし次の一変数比較では、これらの意味上の質問を同時に削らない。数値時刻の回答責務だけを外し、各意味観測のどこに改善・不変・悪化・未確認があるか分ける。

新しい契約の形式検査が通ったことを、旧版の時刻範囲違反の解消や5/5への回復と呼ばない。5本は今後もcalibrationであり、prompt・schema・責務の調整後の結果をvalidation性能へ昇格させない。正式採用には手順凍結後の未使用validation setが必要である。

## 7. 証拠の参照とSHA-256

### 7.1 保存記録

SHAは本書作成時に読み取ったファイル実体の値。元の失敗行を含む記録全体を参照する。準備manifest内の当時の実装SHAは履歴であり、後続承認作業後の実装SHAとの違いを自動修復しない。

| 保存記録 | ファイルSHA-256 |
| --- | --- |
| [item-0001-inference-record-v001.jsonl](../evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0001-inference-record-v001.jsonl) | `a71cb4e52c20f0b1157f13d84c548856f29e9ddd6500e9b67ec4b6b95adbeed9` |
| [item-0001-local-revalidation-v001.json](../evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0001-local-revalidation-v001.json) | `5eeddf0a3cf5384f673e60a6a0a29a69146bd657cedf3c84c24b04eaccf16e51` |
| [remaining-four-inference-record-v001.jsonl](../evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-four-inference-record-v001.jsonl) | `efa00a9a655017871c06091ff8a54415066953a891ef497f8fa1fb4fd5f6a476` |
| [remaining-three-inference-record-v001.jsonl](../evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-three-inference-record-v001.jsonl) | `e89329987673c40d84cf1ce54e0236d25c7bf9cbbfa6df3d52446468b7ee787e` |
| [item-0005-inference-record-v001.jsonl](../evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0005-inference-record-v001.jsonl) | `c071e1686df77f2c973493e4187ba6bdfe704533a3f9f63f3c3c18296b21da9b` |
| [job-manifest-v001.json](../evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/job-manifest-v001.json) | `c008579876c1912348bfece9510aefa2fae70babee94e5079724a3d8c86577c3` |

### 7.2 未変更provider回答の識別

回答本体は上の記録内の保存済みBase64から参照する。本書へ回答全文や別の成功resultを複製しない。行番号は外側JSONLの1始まり。

| item | 回答保存位置 | raw response SHA-256 |
| --- | --- | --- |
| item-0001 | item-0001-inference-record-v001.jsonl・3行目 | `6ffe6662103275d0fb24b13fa8f3e49630fa26cd03a394dee420c7cfb76df426` |
| item-0002 | remaining-four-inference-record-v001.jsonl・4行目 | `e5c35e065532c7d11fd5b2c8b86c368d0b489cd412347b0cc71f652da0cc08e7` |
| item-0003 | remaining-three-inference-record-v001.jsonl・4行目 | `b234d4495f780c777338a3a0066d985511b2151e6b00904f40dbec6ea67bdd15` |
| item-0004 | remaining-three-inference-record-v001.jsonl・11行目 | `527f21048b69b644ca4e28e27e0267f3de9e3759f46e3ab2a1d212e5672a103b` |
| item-0005 | item-0005-inference-record-v001.jsonl・4行目 | `2ce5e4ceaa0d2098472b4250f644b85c81d7b3de9222e9e3e31faba8ff13081e` |

### 7.3 探索動画と正式対応

各動画・対応記録の実体SHAを照合した。動画を新たに解析・編集・再生成したものではない。

| item | 参照 | 動画SHA-256 | 対応記録SHA-256 |
| --- | --- | --- | --- |
| item-0001 | [探索動画](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0001/exploration-video-v001.mp4) / [対応記録](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0001/exploration-video-source-pts-mapping-v001.json) | `d863d7c2c6983e2b9122b22cc961b1717f7b0a85c4e3cde38bb1b5c5333d6d83` | `529a167addd6f5b5eb5fe61e882d3195605f9809cd7aaeaa97d6680c5c65f1a8` |
| item-0002 | [探索動画](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0002/exploration-video-v001.mp4) / [対応記録](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0002/exploration-video-source-pts-mapping-v001.json) | `39b90cab250782907653fc09501fb3a5b329b345f2957fa0e38d34e07b02fb63` | `14dcb2bf73c7ac1d13b7d03ac1862ee3363d1ed94eb2bf601e9bf4b567a5ec43` |
| item-0003 | [探索動画](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0003/exploration-video-v001.mp4) / [対応記録](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0003/exploration-video-source-pts-mapping-v001.json) | `9a10f19a55824177c85b94477ab6c3d01f2af7a3ab498834c22c5b607e915e56` | `54f57cba6c43cd64c591e66f5c33e1cf33d62b557c56503790da917399b78044` |
| item-0004 | [探索動画](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0004/exploration-video-v001.mp4) / [対応記録](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0004/exploration-video-source-pts-mapping-v001.json) | `a42fef7ecfe12bba207f47aed83582c459ebb70084830a070450fed2db31480d` | `adad741947841f43397987368389c81c7f86a1e9c1709a2b6fc00b30cbfdb809` |
| item-0005 | [探索動画](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0005/exploration-video-v001.mp4) / [対応記録](../evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0005/exploration-video-source-pts-mapping-v001.json) | `0b6b4134fb242fd70eb682f0c6bc9b6fe1af01851053818c79838d543904e5e0` | `1e132d4127f6ec496ae47d8e4f8e01e50cc5f74f0ec5a1848c0522a1767673d5` |

### 7.4 人間評価と必要区間の由来

| 対象 | 参照 | ファイルSHA-256 |
| --- | --- | --- |
| 0001・0002 | [人間評価](../evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v002/human-review-result-v002.json) | `fac03dc688f28e64831a7b8241cec560313cf7da3aacc585b30bf8efab270a92` |
| 0003・0004 | [人間評価](../evals/clip_composition/outputs/work-distant-connection-human-quality-review-result-ymUsGrT6EaA-v001/human-quality-review-result-v001.json) | `1087dcab775f89d6d344cf061063a33f614c94af6fb7305f4f39a48e7402dffd` |
| 0005 | [人間評価](../evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-human-review-result-v001.json) | `24ec180fcba4d88cc17afd20a2fcb189da104c99e80e1388595e2a5ae0d4780e` |

必要区間の由来は、人間評価に束縛された次の2記録である。

- [0001・0002の改善区間](../evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json): `b1a6c1e4233aaabf447ec5ab3ca7d14657bd5a1dfb09a18557c11752fdd85dfe`。
- [0003・0004の区間](../evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json): `8137a990774f78974008e8bbe8555f8618ce4933a968dd3295c22b017db2b527`。
- [正式発話](../evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json): `e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2`。

## 8. task-026の境界

本書と次版契約の2ファイルのみを新規作成する。既存の目的・判断記録・設計正本・コード・素材・成果物は上書きしない。API通信、再推論、コード実装、正式skill登録・採用、main workflow接続、CURRENT_GOAL変更、commit、tag、remote操作は行わない。追加pathが必要になった場合は作らず停止して報告する。

