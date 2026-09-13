# 候補動画理解 — 発話ID参照と実映像・音声追加のA/B再較正計画

文書版: v001  
記録日: 2026-09-05  
状態: 差替後task-026の設計資料。コード未変更、通信未承認・未実施。次回の実装・運用契約を確定したものではない。

## 1. 普通の言葉での要約

Geminiには「この元候補の発話・出来事を確認する」という対象、連結した二場面の区別、正式ID付き文字起こし、ZEVが計算済みの映像との対応を渡す。Aはその文字情報だけ、Bは同じ情報に同じ候補の実動画・音声を加える。

返させるのは、何を観測したか、それはどのsegmentに属するか、どの既存発話IDが根拠になるか、文字・映像・音声のどれを根拠にしたか、確認できない点である。秒・ミリ秒・frame番号・時間offsetは生成させない。最終採否、面白さ点数、正式カット境界も返させない。

ZEVはIDの存在・所属・順序を検査し、根拠発話の正式時刻と探索動画上の対応を決定的に引き直す。しかし、その発話の境界が映像イベントの境界だとは確定しない。無言の出来事はsegment内で確認できても、発話で位置を限定できなければ位置未確定のまま残す。近い発話への自動割当はしない。

測る目的は、実映像・音声を加えることで元候補の理解に役立つ観測が増えるか、また誤認が増えるかである。IDが実在することと、意味に合うIDを選べることは別に評価する。

## 2. 目的・現在地・承認範囲

現在の目的正本は[CURRENT_GOAL](/Users/kawafmm/workspace/zev2/docs/CURRENT_GOAL.md)、製品目標は[GOAL_DEFINITION](/Users/kawafmm/workspace/zev2/docs/GOAL_DEFINITION.md)。候補発見後の実映像・音声理解を検証し、区間化と映像適性確認を簡略化できるか確かめる流れの、再実験設計に位置する。本計画は目的正本を更新しない。

今回の着手根拠は、相談役経由の「kawafmm承認」を含む差替後task-026の個別指示。アプリ上のGoal設定はなし。今回用の別work-orderを作成・承認しておらず、本計画から着工・通信・費用の権限を発生させない。差替前に既に作成された旧結果資料は上書きせず、その事実と旧結果は[数値時刻方式の結果資料](/Users/kawafmm/workspace/zev2/docs/reports/candidate-video-understanding-numeric-time-calibration-summary-v001.md)に記録した。

現行AGENTSの停止・費用・試行錯誤・path規律を維持する。今回は指定2資料の新規作成と読み取り調査のみ。実装・test変更・API・probe・有料推論・再推論・動画生成・再encode・新sensor・visual anchor・人間への新たな視聴依頼・正式selection・skill採用・CURRENT_GOAL変更・commit・tag・remote操作はしない。

## 3. 比較の設計

| 条件 | 共通して渡す情報 | 条件差 |
| --- | --- | --- |
| A：文字起こし | item、元候補の対象ID、対象本文、segment境界と非連続の説明、正式発話ID付き全文、計算済み対応時刻、共通質問・出力契約 | mediaを渡さない |
| B：動画追加 | Aとbyte一致する共通本文・質問・出力契約 | 対応する既存実動画・音声のmedia partを追加 |

計画件数は5 item × 2条件 × 各1推論 = **10推論**。今回の通信承認ではない。対象順の案は0001 A→B、0002 A→B、0003 A→B、0004 A→B、0005 A→B。実行計画の承認で対象・条件・順序・各1回を固定する。自動反復、回答修復、再送、別モデルへのfallbackを計画に含めない。

同じitemのA/Bも独立した単発要求とする。会話履歴、他条件・他itemの回答、旧Gemini回答は渡さない。Aの完了内容をBへ追記せず、Bの完了内容を次のAへ追記しない。各条件の結果が悪くても、途中で質問・対象説明・設定を調整しない。

保存済みと同じ `gemini-3.8-flash`、MEDIUM、JSON形式、同じ出力設定4,096を共通設定案とする。Bのみ既存どおりSTATIC・1 FPS・HIGHのmedia設定を持つ（Aにはmediaがなく適用対象外）。4,096は旧設定の再利用案であり、可視回答保証や固定thinking量を意味しない。文字単位IDを扱う新出力がその設定に収まることも未確認。実装時に代表的な正常・未確認回答をローカルで構築して返却shapeを点検し、上限変更が必要なら実走前の一括裁定事項として提示する。勝手に出力上限・timeout・費用上限を仮置きしない。

主要比較は同じitemの新版A/B差である。Bは映像**と音声**の追加であり、映像だけの効果とは呼ばない。旧版からは文字起こし、ID参照、対象指定、segment明示、提示を作らない責務等が変わるため、旧版との差をID化だけの効果としない。各条件1回の5対による較正で、安定率・母集団精度・統計的な優越を主張しない。

素材は人間正解を既に読んだ同じ5本で、広域窓自体も過去の較正結果を反映している。新要求へ人間評価を入れなくても独立validation・完全盲検にはならない。

## 4. 観測対象を人間正解から分離する

### 4.1 入力として使う出典

正式候補の根拠ID配列をそのまま対象にする。対象説明は「以下の元候補の前半・後半の発話群と、その発話が述べる出来事を確認する」とし、本文を正式発話から機械的に連結して引用する。STT誤記の訂正、句読点補完、欠けた文字の追加、後付けの正解説明はしない。

候補内の「こう見せると理解・面白さが増える」という既存説明は、未検証の候補仮説を含む。今回はそれを確認済み事実の説明へ転用しない。ローカル側では候補のidentity・元配列・出典を保持し、providerへは以下の原ID群・未補正本文を対象として渡す。候補の成立・面白さ・直接因果を入力で先に断定しない。

| item / segment | 対象となる正式ID（両端含む、飛びは分離） | 元IDの本文を順番に連結した引用 |
| --- | --- | --- |
| item-0001 / segment-0001 | semantic-utterance-001182〜semantic-utterance-001205 | え、このカメラもさね、ビビらせる感じやめてほしい |
| item-0001 / segment-0002 | semantic-utterance-002766〜semantic-utterance-002806 | マジ今んところ今年一怖すぎて笑ったビデオ見る気?もう勘弁してよ夜中になんか映るよう |
| item-0002 / segment-0001 | semantic-utterance-003403〜semantic-utterance-003445 | え、なに?あーやばいかもーやばいとこ見ちゃった?ここは薬品室のようだ痛みの実を見つける |
| item-0002 / segment-0002 | semantic-utterance-007381〜semantic-utterance-007393 | 薬の効き目も切れかけている |
| item-0003 / segment-0001 | semantic-utterance-003611〜semantic-utterance-003646 | 相次いでいた失踪事件の直後には深夜に赤い服え?これ前も見たなこれ前も見た |
| item-0003 / segment-0002 | semantic-utterance-009178〜semantic-utterance-009238 | 女は悲しみに打ちひしがれあの無情な者どもを決して許さないと心の中で誓ったやがて女は死に若い子を捕らえて喰らう何て読むのこれ |
| item-0004 / segment-0001 | semantic-utterance-000067〜semantic-utterance-000082 | 今年一怖いと言われるホラーゲーム |
| item-0004 / segment-0002 | semantic-utterance-003931〜semantic-utterance-003952 | おい、急に速くなった!おい、急に速くなった! |
| item-0005 / segment-0001 | semantic-utterance-000067〜semantic-utterance-000082 | 今年一怖いと言われるホラーゲーム |
| item-0005 / segment-0002 | semantic-utterance-010644〜semantic-utterance-010650 / semantic-utterance-010658〜semantic-utterance-010664 | 首痛え叫んだねはよく叫んだわ |

対象IDは合計286出現・10 segment（連続範囲は11群）。全て各segmentの一覧にあり、指定された切出し範囲と実frame対応範囲の双方で全量包含される。これは対象IDの機械的な閉包であり、候補解釈の正しさの証明ではない。

0005後半は010644〜010650と010658〜010664の2群。010651〜010657を「範囲の途中だから」と対象へ追加しない。全文側に存在しても元候補が指定した根拠集合は別に保持する。

| item | 人間評価前の候補出典 / 配列の場所 | 候補ファイルSHA-256 |
| --- | --- | --- |
| item-0001 | [camera-fear-escalation](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json)、`/candidates/0/firstPartSemanticUtteranceIds` / `/candidates/0/secondPartSemanticUtteranceIds` | `8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d` |
| item-0002 | [medicine-effect-payoff](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json)、`/candidates/1/firstPartSemanticUtteranceIds` / `/candidates/1/secondPartSemanticUtteranceIds` | `8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d` |
| item-0003 | [candidate-doctor-disappearance-to-ogre-mother](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json)、`/candidates/1/firstPartSemanticUtteranceIds` / `/candidates/1/secondPartSemanticUtteranceIds` | `4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8` |
| item-0004 | [candidate-horror-claim-to-speed-up](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json)、`/candidates/0/firstPartSemanticUtteranceIds` / `/candidates/0/secondPartSemanticUtteranceIds` | `4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8` |
| item-0005 | [candidate-horror-game-to-screams-001](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-luna-b6-new-candidates-ymUsGrT6EaA-v001/candidate-response-v001.json)、`/candidates/0/firstPartSemanticUtteranceIds` / `/candidates/0/secondPartSemanticUtteranceIds` | `cd21549ffa65b749e76c44710ccc6a92bdcf3ca99d07df4e281f5becf3277216` |

候補出典が束縛している元source packageも保持する。

| 対象 | source package | SHA-256 |
| --- | --- | --- |
| item-0001、item-0002 | [source-package-v001.json](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-luna-source-package-quality-increment-ymUsGrT6EaA-v001/source-package-v001.json) | `49d5686cce07177433ce707e84bad8f47c16aab059428026b7e83344cbd9e532` |
| item-0003、item-0004、item-0005 | [source-package-v001.json](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-luna-source-package-concrete-payoff-ymUsGrT6EaA-v001/source-package-v001.json) | `23d555928762e5a98ccf13c291e0a80ae1935a5cd49010f36512498f5033f6df` |

### 4.2 入力から除く出典

入力生成は前項の候補出典、正式発話、既存動画・mapping・構築記録のみを読むallowlist方式とする。人間合否、採用・不採用理由、人間正解境界、旧Gemini要求・回答・失敗内容、本計画の結果評価の文章、結果資料はprovider payloadへ入れない。候補artifact全体や人間評価を含む下流artifactを一括添付しない。

評価側は別読取として、結果資料§7.3に示す人間評価3ファイル・区間証拠2ファイルと、旧raw・再検査を参照する。入力表にはそれらの評価本文を混ぜず、比較記録にだけ評価出典とSHAを置く。全要求を確定してから実走し、取得した回答を固定した後に意味評価へ進む。設計者が既に結果を知っている限界は残る。

## 5. 映像と正式発話の対応

### 5.1 共通source

正式発話は[semantic-utterance-artifact-v001.json](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json)、SHA-256 `e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2`。正式IDは10,723件で、実体はほぼ文字粒度の索引である。「1 ID = 1自然文」と扱わない。ゼロ長の正式発話は0件。ID体系、本文、正式時刻、正式順序は変更しない。

元動画は `ymUsGrT6EaA`、[元動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4)、SHA-256 `79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537`。全itemがこのsourceを参照する。

| item | 既存探索動画 / mapping | 探索動画SHA-256 | mapping SHA-256 |
| --- | --- | --- | --- |
| item-0001 | [動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0001/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0001/exploration-video-source-pts-mapping-v001.json) | `d863d7c2c6983e2b9122b22cc961b1717f7b0a85c4e3cde38bb1b5c5333d6d83` | `529a167addd6f5b5eb5fe61e882d3195605f9809cd7aaeaa97d6680c5c65f1a8` |
| item-0002 | [動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0002/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0002/exploration-video-source-pts-mapping-v001.json) | `39b90cab250782907653fc09501fb3a5b329b345f2957fa0e38d34e07b02fb63` | `14dcb2bf73c7ac1d13b7d03ac1862ee3363d1ed94eb2bf601e9bf4b567a5ec43` |
| item-0003 | [動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0003/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0003/exploration-video-source-pts-mapping-v001.json) | `9a10f19a55824177c85b94477ab6c3d01f2af7a3ab498834c22c5b607e915e56` | `54f57cba6c43cd64c591e66f5c33e1cf33d62b557c56503790da917399b78044` |
| item-0004 | [動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0004/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0004/exploration-video-source-pts-mapping-v001.json) | `a42fef7ecfe12bba207f47aed83582c459ebb70084830a070450fed2db31480d` | `adad741947841f43397987368389c81c7f86a1e9c1709a2b6fc00b30cbfdb809` |
| item-0005 | [動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0005/exploration-video-v001.mp4) / [mapping](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0005/exploration-video-source-pts-mapping-v001.json) | `0b6b4134fb242fd70eb682f0c6bc9b6fe1af01851053818c79838d543904e5e0` | `1e132d4127f6ec496ae47d8e4f8e01e50cc5f74f0ec5a1848c0522a1767673d5` |

### 5.2 決定的な列挙と逆対応

各正式発話の元時刻区間と、そのsegmentの実frame対応元区間との共通部分を取り、正の長さを持つIDを全て列挙する。発話端を変更する操作ではなく、「その発話のどの部分がこの映像に対応するか」を別に記録する。重ならないIDを追加しない。

計算はmappingが宣言する元時刻・探索時刻のtimebaseと両端PTSによる有理数の逆写像を使う。すなわち、対応する元区間内での位置を、当該segmentの正式な元PTS幅と探索PTS幅で同じ割合の探索位置へ戻す。比は保存mappingから決まり、AIが係数・重み・許容幅を選ばない。丸めた表示秒を正式計算へ戻さない。全区間は終端非含有。

この5本のtimebaseは元1/90000秒、探索1/15360秒。以下と附録は比較しやすいようにmsへ正確に換算した有理数表記であり、`165500/3`は循環小数へ丸めない。

「依頼された切出しms区間」と「実際の先頭frameから末尾frame終端までの対応」は一致しない箇所がある。両方を保持し、どちらかへ黙って寄せない。frame由来の時刻対応は、音声sample単位の完全な包含・同期を新たに保証する証拠ではない。

| item / segment | 切出し指定の元区間 ms | 実frame対応の元区間 ms | 探索動画上の対応区間 ms | ID行数 | 正式発話注釈のない対応時間 ms |
| --- | --- | --- | --- | ---: | ---: |
| item-0001 / segment-0001 | [628078,683238) | [1884248/3,2049748/3) | [0,165500/3) | 141 | 20618 |
| item-0001 / segment-0002 | [1377898,1428251) | [4133698/3,1428266) | [165500/3,316600/3) | 73 | 34880 |
| item-0002 / segment-0001 | [1644392,1700141) | [4933198/3,5100448/3) | [0,55750) | 174 | 7920 |
| item-0002 / segment-0002 | [4363406,4414164) | [4363416,13242548/3) | [167300/3,319600/3) | 232 | 10510 |
| item-0003 / segment-0001 | [1695299,1750321) | [5085898/3,5250998/3) | [0,165100/3) | 187 | 7338 |
| item-0003 / segment-0002 | [5662938,5714097) | [16988848/3,5714116) | [55050,318650/3) | 178 | 8864 |
| item-0004 / segment-0001 | [214410,264995) | [214416,265016) | [0,50600) | 44 | 32820 |
| item-0004 / segment-0002 | [1945338,2015211) | [5836048/3,6045698/3) | [151850/3,120500) | 79 | 44003 |
| item-0005 / segment-0001 | [214410,264995) | [214416,265016) | [0,50600) | 44 | 32820 |
| item-0005 / segment-0002 | [6099087,6153435) | [18297298/3,18460348/3) | [151850/3,314900/3) | 135 | 4000 |

全10segmentのID行数は1,287出現（異なるIDは1,241）。実frame対応で端が切れるものは20出現。切出し指定との共通部分があるのは1,275出現で、双方に全量入るものは1,265出現。指定区間の外だが末尾frameの対応時間に入るものも12出現あり、完全な発話音声があると主張しない。特に0004・0005前半の000093はframe対応では全量、指定区間では外側で、000094はframe対応が1msだけである。

segment内の全ID・本文・正式時刻・順序・探索位置・部分包含の実表を附録Aに列挙する。SHAは本節とitem表に束縛し、将来の入力ID表へ同じ参照を各segmentから結ぶ。単なる件数または最初と最後のIDだけで全量列挙を代替していない。

### 5.3 発話注釈のない場所とmappingの空隙

正式発話注釈がない時間を無音または出来事なしと断定しない。例えば0001後半の元[1377918,1412798)msは34,880msにわたり発話注釈がないが、映像の対応は存在する。0004・0005前半の[216558,249378)msにも32,820msの発話注釈のない対応時間がある。架空の発話IDを作らず、「発話注釈なし・映像対応あり」と入力で明示する。

別に、探索動画のframe時刻で元への対応がない空隙を列挙する。

| item | mapping未対応の探索動画区間 ms |
| --- | --- |
| 0001 | なし |
| 0002 | [55750,167300/3) |
| 0003 | [165100/3,55050) |
| 0004 | [50600,151850/3) |
| 0005 | [50600,151850/3) |

各空隙は256探索PTS = 1/60秒。どちらのsegmentや元発話にも割り当てない。映像未対応と、対応はあるが文字起こしがない状態を混同しない。

## 6. Geminiに渡す共通質問と具体例

両条件の共通本文に、次の規則と対象を同じ順序で入れる。

> この仕事は、指定した元候補の前半・後半の発話群と、それが述べる出来事を確認することです。動画全体から別の主題を探し直さないでください。  
> 二つのsegmentは元動画の離れた場面を連結したものです。編集上隣接していても、実時間の連続や直接因果を意味しません。  
> segmentごとに、指定対象に関係する中心出来事、直接確認できる原因、必要な導入、反応、自然な終わり、対象理解には不要と思われる前後、映像上の注意を観測してください。不要という観測は削除命令ではありません。該当なし・確認不能を認めます。  
> 観測を既存segment IDと根拠発話IDへ結び付け、根拠が文字起こし・映像・音声のどれかを区別してください。文字の引用、画面で直接見えたこと、音声で直接聞けたこと、後日の感想を混ぜないでください。  
> 発話IDで裏付けられない無言イベントは、segmentだけを示し位置未確定としてください。近い発話IDを代用しないでください。  
> 入力の時刻はZEVが計算済みです。計算・修正・出力しないでください。秒、ミリ秒、frame、offset、最終カット境界、採否、面白さ点数は返さないでください。

Aの根拠種別は文字起こしのみ。Bは実際に確認した文字・映像・音声の組合せを許す。共通本文自体には「mediaが添付されていない場合、映像と音声は未確認であり、出来事が存在しないという意味ではない」を入れる。共通本文を条件ごとに書き換える必要はない。

具体例として0004では、前半に「今年一怖いと言われるホラーゲーム」（000067〜000082）、後半に「おい、急に速くなった!おい、急に速くなった!」（003931〜003952）を対象として示す。そのほかの文脈も、前半44 ID・後半79 IDの正式一覧として全量渡す。

- A：この対象指定、二つのsegmentの元・探索時刻対応、123 IDの未補正文字起こし、共通質問と契約だけ。
- B：Aと同じ共通本文に、0004の既存120.500秒の実動画・音声を追加。
- 比較すること：文字だけで発話の内容を捉えたかに加え、Bで画面の動きや声の反応について新しく有用な観測が得られたか。実際のB回答は未取得であり、急加速や反応が正しく確認できるとの予告ではない。
- 誤認の確認：前半紹介が後半の敵を直接加速させたという因果を作っていないか。声の反応と終了後の感想を区別しているか。

映像との照合に使う入力補助時刻は、附録の探索位置・部分包含を機械的に供給する。大きなSHAやローカルpathそのものをモデルに推理させず、対応を分かる形のsegment別表にする。正式IDは省略・別名化せず、連続範囲の表記は正式索引へ可逆に展開できるものだけとする。

## 7. 最小出力契約案

これは実装前の案で、旧契約を上書きしない。rootは新schema版、item ID、条件、観測配列だけを基本とする。itemと条件は実行計画の値へ一致させる。各観測に以下を持たせる（英語表記は実装候補名で、報告は処理の意味で説明する）。

| 意味 | 表現案 | 検査・意味 |
| --- | --- | --- |
| 役割 | `role` | 中心出来事／原因／導入／反応／自然な終わり／不要と思われる前後／映像注意 |
| 所属場面 | `segmentId` | 入力のsegmentを一つだけ参照 |
| 観測状態 | `status` | observed／notObserved／notApplicable |
| 内容 | `description` | 直接観測、文字からの内容、未確認理由を区別した説明 |
| 根拠の既存発話 | `evidenceUtteranceRanges` | `fromUtteranceId`・`throughUtteranceId`による両端含む範囲の配列。単独IDは同じ両端。複数の離れた群は別範囲 |
| 根拠の種類 | `evidenceKinds` | transcript／video／audioの集合。Aではtranscript以外を拒否 |
| 反応の性質 | `reactionKind` | direct／silent／retrospective／unknown／notApplicable |
| IDで限定できる範囲 | `idLocation` | evidenceUtterancesOnly／segmentOnlyEventUnresolved |
| 確認できない点 | `unconfirmedPoints` | 材料不足・因果・反応の種類・映像位置等の未確認事項 |

各segmentの各役割について観測または未確認・該当なしを返す。観測が複数なら同じ役割の記録を分けてよいが、同じ役割を「該当なし」と「観測あり」に矛盾させない。全てをobservedで埋める要求にはしない。全て未確認でも形式成立はあり得るが、有用性合格とはしない。

- notObservedは「この入力から確認できない」。不存在の判定ではない。notApplicableは当該役割を当てはめる理由がないという判断で、理由を持つ。
- observedで文字を根拠にするときは既存根拠IDを要する。Bの無言の映像観測・非言語音声観測は根拠発話なしを許し、segmentOnlyEventUnresolvedとする。
- evidenceUtterancesOnlyは根拠発話の位置だけが限定できる状態であり、イベント開始・終了が確定した意味ではない。
- direct、silent、retrospectiveを区別できなければunknownとする。無言の反応に近隣の発話IDを代理で付けない。
- 原因として記述できるのは当該segment内の根拠で確認できたものに限る。連結順から別segmentへの直接因果を作らない。
- 遠方の意味関係はこの観測配列で直接事実として一体化しない。指定候補の前後を捉えたか・同じ話題を指すか等を、取得後の比較記録でsegment別根拠に基づいて別評価する。Geminiへ遠方関係の最終成立を決定させない。
- 確認できない点がなければその配列は空でよい。必要な説明まで空文字で埋めることは許さない。
- providerへ数値位置欄を用意せず、余分な欄は拒否する。自由記述に時刻・frame等の位置指定が出ても抽出・採用せず、数値位置を答えた契約違反として記録する。本文に出る「今年一」等の内容上の数詞まで禁止するものではない。

今回、切り出し候補ID範囲は出力契約に置かない。根拠ID範囲はあくまで根拠であり、後から同じ配列を切り出し候補として読み替えない。将来それが必要なら別の責務・別の承認を要する。

## 8. ZEVの検査と時刻解決

機械的な検査と意味の照合を別記録にする。

1. 正式source・候補・発話・動画・mapping・構築記録のidentityとSHAが計画に一致すること。
2. rootのitem・条件、各segment、根拠IDが当該入力allowlistに存在すること。ID文字列だけで所属を推測しない。
3. 同じIDが別itemにも存在し得るため、item＋segment＋正式artifactの束縛を合わせて検査する。別item・別segmentの引用を拒否する。
4. 範囲を正式索引の順序で展開し、始終の逆転、不存在、中間の未許可ID、segmentをまたぐ範囲、重複を拒否する。文字列の辞書順や数字部分だけの推測順序を使わない。
5. 複数根拠範囲は別々に保持し、間の発話や発話注釈のない時間を一つの連続イベントへ埋めない。0005の対象の飛びも保つ。
6. 種類・観測状態・反応・位置限定状態の整合、Aが未提供mediaを根拠にしていないこと、余分な時刻・採否・cut欄がないことを検査する。
7. 合格したIDについて、正式発話artifactから元の開始・終了を取得する。探索動画上の対応はmappingとの交差部分のみを有理数で再導出し、端切れと未対応部分を別に保持する。
8. 発話時刻の解決結果をイベント境界・正式selection・カット境界へ昇格させない。不明位置を0秒、空の成功区間、動画全体、最近傍IDに変換しない。
9. 存在するが観測と無関係なIDは機械検査を通る場合がある。取得後に本文・既存証拠と意味照合し、構文合格と意味不正を別に数える。

無言イベントを発話IDだけで厳密に位置確定することは未解決。新しいvisual-event ID、frame-anchor生成器、音量sensor、画面変化sensor、STT補正は設けない。frame samplingが細かなイベントを捉える十分性、発話時刻の精度、音声sample対応も既存証拠以上には保証しない。

## 9. 評価計画

| 軸 | 確認すること | 記録方法 |
| --- | --- | --- |
| A：ID参照契約 | 出力形式・所属・存在・順序・状態整合が成立したか | A/B各5件、成立・不正・未実施を分ける |
| B：指定対象 | 全体の目立つ別主題へ逸れず、元の前後対象を捉えたか | 各item×条件、前後それぞれの根拠と判断 |
| C：根拠の意味 | 選んだ正式IDの本文が観測を裏付けるか | 構文成立とは別。誤引用・過大な範囲・弱い根拠を記録 |
| D：実映像・音声の増分 | Bにだけあり、対象理解に役立ち、既存証拠で支持できる観測があるか | 5対で具体的観測とvideo／audioの自己申告・検証可否を記録 |
| E：追加による誤認 | Bで増えた架空・主題逸脱・誤引用があるか | 改善と相殺せず別記録 |
| F：反応と因果 | 直接反応・無言反応・回顧・segment間因果の混同がないか | 各segment・観測単位に判定。未確認も残す |
| G：位置未確定 | IDで限れない出来事を適切に未確定としたか | 正直な未確定と、架空ID・近隣IDの代用を区別 |

既存人間評価で確認できない新しい視覚・音声の主張は「追加観測候補・真偽未確認」とし、モデルの自己申告だけでDの有用性確定へ数えない。人間の目視・聴取判断をCodexが代替しない。確認不能を消すために新たな視聴を依頼するのではなく、今回の較正の限界として残す。

比較記録は5対を必ず残す。片側不正・未実施なら比較不成立と記す。機械成立数の分母は計画10件と実施件数を併記し、未実施を不正回答と同一視しない。D/Eの対比較は両側取得・比較可能な対だけについて述べ、全5対の状態を隠さない。

必要内容保持の照合は0001〜0004の4本・前後8地点を参照し、0005は対象外。今回はcut範囲も提示動画も作らないため、根拠発話時刻の和集合を「必要映像の包含率」としない。発話・内容として捉えたか、無言部分が位置未確定かを分ける。人間参照を唯一の最短解とせず、別の短編の良さとも分ける。短縮率、合成点、独自の係数や重みで成功判定しない。

全結果の固定後に対比較する。較正途中の回答を見たprompt改訂や再推論はしない。正式採用・共通skill化・未使用validationはこの計画の後に自動接続せず、別裁定とする。

## 10. 次回変更する実装・testの全path案

次の既存4 pathに閉じる変更案。今回の変更許可ではなく、次工事の正本path上限も未承認である。

| path | 次回の変更内容 |
| --- | --- |
| [runner/src/candidate-video-understanding-v001.ts](/Users/kawafmm/workspace/zev2/runner/src/candidate-video-understanding-v001.ts) | 正式発話・候補参照、segment別ID表と逆対応、A/B共通本文と新出力契約、所属・順序検査、根拠時刻だけの解決、対比較の型。旧時刻回答とのunion・fallbackを作らない |
| [runner/src/candidate-video-understanding-v001.test.ts](/Users/kawafmm/workspace/zev2/runner/src/candidate-video-understanding-v001.test.ts) | 全10segmentの境界・端切れ・空隙、対象286 ID、0005の非連続対象、A/B共通本文一致、人間評価混入なし、ID不正と意味不正の分離、無言・未確認の正常受理、cutへの誤昇格禁止を検査 |
| [runner/src/candidate-video-understanding-transport-v001.ts](/Users/kawafmm/workspace/zev2/runner/src/candidate-video-understanding-transport-v001.ts) | 既存の単件・複数件共通限定実行器へ承認計画を渡す。条件別1回送信、Files再利用確認、新要求測定、raw先行保存・使用量保存・停止分類・未実施の記録を接続 |
| [runner/src/candidate-video-understanding-transport-v001.test.ts](/Users/kawafmm/workspace/zev2/runner/src/candidate-video-understanding-transport-v001.test.ts) | 対象条件重複、未承認件数、旧countTokens流用、期限切れ、SHA不一致、送信不明、保存失敗、停止後送信、承認された較正不正継続方針の境界を検査 |

現行には共通単件実行処理（transport約1270行）と共通複数件限定実行処理（約1514行）がある。ただし旧manifest・旧準備履歴・旧要求・旧測定への固定照合があり、単に10件を足すだけでは使えない。承認された対象・条件・参照SHA・要求・回数を明示した次版の実行計画を渡すよう、同じ共通処理を改修する。1本用・3本用・4本用の新エンジンは増やさない。

新入力を旧時刻出力契約へ変換する互換分岐を入れない。旧記録の保持は旧形式を新実走へ推測受理する理由ではない。main workflow、renderer、字幕、composition、候補発見実装、STT体系は変更対象外。

## 11. 次回作成する記録の全path案

以下の4 pathは未作成。別承認後の入力・計画・通信・比較を一組として保存する案で、今回の2 path枠へ追加しない。

| 全path | 内容 |
| --- | --- |
| `/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/input-id-table-v001.json` | 候補出典、10segment、全ID・本文・順序・正式時刻・探索位置・端切れ・未対応とSHA。評価情報なし |
| `/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/execution-plan-v001.json` | 対象5×条件2×各1回、共通本文・出力契約・10要求テンプレート・素材binding・順序・準備／実走境界・未承認事項を固定 |
| `/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/execution-record-v001.jsonl` | 準備と推論の別承認境界、通信意図・応答・使用量・raw、確定Files参照、最終要求本文とSHA、新countTokens、各件終状態・全体停止 |
| `/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/paired-comparison-v001.json` | 全5対のA〜G、回答取得状態、根拠時刻は根拠のみ、旧人間出典、誤認・限界・未実施理由。採用やcutへ昇格しない |

10個の要求ファイル・10個のrawファイルを別々に増やす案ではない。各完全要求と生回答を上記計画／記録内に束縛する。計画は固定し、Files解決・新測定・推論の実測を追記型の別記録に残す。Bのmedia参照だけを承認された素材bindingへ解決した最終要求を保存し、その本文SHAをcountTokensと有料送信で一致させる。

準備終了後の記録prefixと10最終要求SHAを推論承認の対象とする。新uploadや要求変更が起きた場合は、古い測定・承認を使わない。失敗した旧実験の記録を継ぎ足して再開しない。新系列でも失敗・送信不明後の再開は自動ではなく、証拠を保持した別指示を必要とする。

## 12. Files再利用・要求測定・通信計画

### 12.1 既存参照を使える条件

ローカル動画5本とmappingはSHA一致で再利用する。新しい動画・切出し・再encodeは不要。

Filesは旧成功記録にある同一動画の参照が、次回の準備時点で未失効、ACTIVE、同じMIME・byte数・base64 SHA-256を持ち、予定したname・URIと一致する場合だけ使う。保存時点のACTIVEを現在の状態へ読み替えない。送信直前にも期限とローカルbindingを再照合する。認証の準備状況や実在は今回通信しておらず未確認。

保存期限は2026-09-07の03:50:52〜04:14:06 UTC（12:50:52〜13:14:06 JST）。これは保存記録の値であり、現在利用できるとの保証ではない。期限切れが分かっている場合はGETを無駄に先行せず、必要な再uploadをまとめて別承認対象にする。再uploadは動画生成ではないが、API通信なので今回も次回無承認でも行えない。

### 12.2 旧countTokensは新要求へ使えない

旧成功測定は[stage1通信記録](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/stage1-communication-record-v001.jsonl)の41行目（0001、attempt-0005）と80行目（0002〜0005、attempt-0006）にある。旧入力token数は順に32,350、32,651、32,350、36,865、32,049。

[stage1-measurement-v001.json](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/stage1-measurement-v001.json)は初回HTTP 0回の停止記録であり、5件の成功測定台帳ではない。そのまま保持する。

新版は文字起こし・ID・対象・segment・schemaを追加・変更し、Aにはmediaがない。A/B両方とも新しい完全要求ごとに測定する。旧動画tokenだけ、旧測定への文字数加算、係数での推定を正式測定に代用しない。Files URIを変更したBは、変更後の最終要求で測定し直す必要がある。今回は新要求の測定0件。

### 12.3 通信内訳（全て次回承認用の計画値）

| 分岐 | 必要な通信 | 合計 |
| --- | --- | ---: |
| 既存Files5件を再利用できる | metadata GET 5 + countTokens 10 + 推論10 | 25 |
| GET前にr件の失効が判明し、そのr件の再uploadを別承認 | upload開始・転送確定2r + metadata GET 5 + countTokens 10 + 推論10 | 25 + 2r（5件なら35） |
| 承認済みGET後にr件の再uploadが必要と判明 | その時点で全体停止。再開が別承認された場合、上の再利用計画にupload2rと再確認GET rが追加 | 通しで25 + 3r（5件なら40） |

rは実際に再uploadが必要と確定した動画数で、恣意的な係数ではない。upload2回は保存済みの直接REST経路の「開始」と「転送・確定」に対応する。再利用できることを前提にuploadを0と確約しない。

metadataがACTIVEになるまでの追加poll、countTokens再送、推論再送、provider切替、回答修復は計画外。上表は認証・upload・GET・測定が各予定回数で成功する場合の件数で、成功保証や全ての分岐の一括通信承認ではない。旧600秒timeoutも新実走の承認値として引き継がない。

準備通信の承認と有料推論の承認を分ける。再利用時はまずGET5・新countTokens10の準備15通信について承認が必要。必要なuploadが既知なら最初からその内訳を同じ準備案に加える。準備完了後、実測・最終要求SHA・費用見込みをまとめて提示し、有料10推論の承認前に必ず停止する。

## 13. 保存料金による費用と未確定部分

参照は[保存済みprovider仕様・料金](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/provider-spec-and-price-snapshot-v001.json)。2026-09-05確認として保存され、2026-12-31までのStandard introductory priceは入力100万tokenあたりUS$0.75、出力＋thinkingは100万tokenあたりUS$3.75と記録されている。今回は現行料金の再照会をせず、保存情報による参考見込みに限定する。

推論見込みの計算は、新10要求の入力token合計×US$0.75/100万 ＋ 実際の回答・thinking token合計×US$3.75/100万。新しい入力測定前であり、回答・thinkingも未取得なので、今回時点で新10件の総額は確定できない。

旧5推論の保存使用量は入力159,690、回答5,444、thinking8,485 token、同単価の換算US$0.17200125。これは履歴の規模感であって、新10件の予測・上限・請求額ではない。旧設定4,096×新10件を出力単価だけで換算するとUS$0.1536だが、入力・thinking・実際の出力量を閉じた総額ではなく、支出上限にしない。

保存仕様ではFiles保存は無料。upload/metadataの個別課金とcountTokensの実請求、thinking量、providerの現在仕様・認証・期限、税・為替は今回未確認。countTokensを確認なしに無料と断定しない。費用上限・通信上限・timeoutはkawafmmが次回実走前に決める。今回のAPI通信・推論・API費用は0。

## 14. 人間作業の見込み

今回、人間への新規視聴依頼は0件・追加視聴0分。ID全量表の照合、SHA、順序、件数の確認を人間へ移さない。

次回の結果提示は**5組の対比較（10回答）をまとめた1件の平易な報告**とし、確認は5対を一度に行える形にする。加えて、実装着手・準備通信・推論の各停止地点で、束ねた承認判断が必要である。各段階で一件ずつ不足を小出しにするのではなく、§16の全条件を先にまとめる。

5対の要約を読む時間は未測定であり、根拠のない「数分」を確約しない。参考として既存広域動画の合計媒体尺は約543.750秒（9分3.750秒）だが、全動画を再視聴する依頼でも、人間の所要時間予測でもない。読取・判断時間と媒体尺を混ぜない。

既存証拠だけで真偽を確定できない新観測は未確認として提示する。今回は新たな視聴を依頼せず、次回もそれを合格へ変えるための追加視聴を自動で要求しない。採用判断に不可欠となった場合の視聴範囲・時間は別裁定の対象で、今回の5対比較の完了条件へ隠れて増やさない。

## 15. 結果不正と全体停止を分ける運用案

現行の共通実行処理は不合格一件で残りを送らず停止し、記録検査も失敗後の次件開始を拒否する。この規則を今回は変更しない。以下は次回に明示承認を求める分類案である。

| 状況 | 記録 | 次件の扱い案 |
| --- | --- | --- |
| 契約どおりの部分観測・確認不能・該当なし | 推論完了、機械成立。意味有用性は別評価 | 正常応答なので、承認された残り対象へ進める |
| 構文不正・不明ID・別segment・数値位置出力等の較正上の回答不正 | raw・使用量を先に保存し、不正回答として保持。成功へ補正しない | raw・使用量・送信状態の保存が閉じた場合に限り、別件を続ける方針を次回明示承認で選べる。承認なしでは現行どおり停止 |
| 存在するが意味の違うIDを選んだ | 機械成立と意味不正を分離。全取得後の比較に記録 | 取得後の意味評価で判定し、途中の入力修正や再送をしない |
| 認証、HTTP、timeout、metadata、SHA、送信意図保存、raw保存、使用量取得・保存、秘密混入等の問題 | 確認できた証拠、送信済みか不明か、未実施対象、費用確定／未確定を保存 | 全体停止。再送・再upload・別providerを自動実行しない |

新契約はcutを返さないため、旧版の「中心・反応・終端の時刻から初回提示を作る処理」を新回答の受入条件に使わない。役割未確認を旧提示不成立へ流して不正にすることも、空区間を成功にすることもしない。新しい受入契約の採用自体が次回承認事項である。

実走記録は、計画10件の全てに、送信・受領状態（未送信確認／送信成否または応答が未確定／応答受領）、回答受入（未評価／形式成立／回答不正）、全体停止の段階・理由、費用の確定／未確定を分けて残す。応答受領後のHTTPエラー・使用量欠落・保存失敗等は「応答受領後の全体停止」であり、較正上の回答不正や送信結果不明へ付け替えない。未実施を回答失敗・費用0へ自動変換せず、送信後不明は請求も未確定とする。生回答を先に保存し、その後の検査で失敗しても取れた使用量を失わない。比較記録の5行も欠落させない。

全体停止時は証拠保存→追加作用停止→報告→turn終了。残りを自走で再開しない。失敗種別を理由に現行の強制停止上限・試行錯誤枠を免除しない。

## 16. 実装から実走までの停止地点と一括裁定事項

1. **今回の終点**：2資料を確認・提示して停止。現在はここまでの承認のみ。
2. **次回の実装着手前**：既存4実装・test pathと新4記録path、新契約、対象と条件、正本・作業path枠をまとめて承認。実装・ローカル検査・入力表と要求テンプレートの作成に限り進む。
3. **実装完了・通信前**：参照閉包、10条件、返却shape、正常／未確認／不正検査、A/B共通本文、評価非混入、保存経路、停止分類を一括提示して停止。認証は秘密を読出・記録せず正規経路で用意する。
4. **準備通信前**：Files再利用可否の既知情報、必要uploadの有無、GET・countTokensの全内訳、価格確認の要否、通信回数・費用・timeoutを一件の準備案にする。kawafmmが決めた値・範囲が揃うまで通信しない。
5. **準備完了・有料推論前**：10最終要求SHA、新入力token数、Files状態・期限、全費用見込みと未確定部分、10推論、回答不正時の続行可否を一括提示して停止。入力・条件・素材が変われば旧承認を流用しない。
6. **承認された実走後**：全10件の終状態と5対の評価を保存・提示して停止。正式selection、共通skill採用、提示動画、別素材validationへ自動で進まない。

今判明している一括裁定事項は、次工事の着工と全8 pathの扱い、新出力・検査契約、A/B設定と順序、出力量への対応、Files再利用または再upload、準備通信と有料推論の分離、通信・費用・timeoutの承認値、回答不正だけで残りを続けるか、既存証拠で未確認の観測の扱い、人間へは5対の要約を一度に出す運用である。

未確定情報は、新10要求の入力token数、実回答・thinking量、次回時点のFiles・認証・価格、4,096設定での新回答の成立性、意味観測の真偽、対比較の実読取時間である。これらと独立な入力出典、1,287行のID対応、対象286 ID、全実装path・記録path、通信分岐と停止地点は本書でまとめた。承認前に試験・probeの名目で先行しない。

## 附録A：segment別の正式発話全量表

この附録は機械照合のための設計材料であり、人間へ1,287行の逐一確認を求めるものではない。将来の要求は人間評価を含む本書全体から作らず、§4〜5の原出典をallowlistで読み直して同じ表を決定的に製造する。

列の意味：

- 順序：正式発話索引の順序。IDは省略しない。
- 本文：原文のJSON文字列表記。引用符は表記であり本文へ追加しない。空白・句読点・誤記を保持する。
- 正式元ms：元artifactの発話区間をそのまま保持。
- 対応元ms：その発話と実frame対応範囲との交差部分。
- 探索ms：上の交差部分の探索動画上の正確な対応。
- frame内：fullはframe対応範囲内で全量、partialは端が切れる。
- 指定内：full／partial／outsideは当初切出し指定ms区間との関係。fullでも音声sampleの完全性を追加認定しない。

各表のitemとsegment、§5.1の元・探索動画・mapping・発話SHAを組み合わせて所属を固定する。部分包含やoutsideの行は「全文が完全に聞ける発話」として渡さず、原本文と部分対応の注意をセットで示す。

<details>
<summary>item-0001 / segment-0001 — 141 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1106 | semantic-utterance-001106 | "だ" | [628078,628098) | [1884248/3,628098) | [0,46/3) | partial | full |
| 1107 | semantic-utterance-001107 | "開" | [635752,635992) | [635752,635992) | [23008/3,23728/3) | full | full |
| 1108 | semantic-utterance-001108 | "か" | [635992,636012) | [635992,636012) | [23728/3,23788/3) | full | full |
| 1109 | semantic-utterance-001109 | "な" | [636012,636233) | [636012,636233) | [23788/3,24451/3) | full | full |
| 1110 | semantic-utterance-001110 | "い" | [636233,636253) | [636233,636253) | [24451/3,24511/3) | full | full |
| 1111 | semantic-utterance-001111 | "ど" | [636253,636273) | [636253,636273) | [24511/3,24571/3) | full | full |
| 1112 | semantic-utterance-001112 | "こ" | [636273,636333) | [636273,636333) | [24571/3,24751/3) | full | full |
| 1113 | semantic-utterance-001113 | "に" | [636333,636373) | [636333,636373) | [24751/3,24871/3) | full | full |
| 1114 | semantic-utterance-001114 | "い" | [636373,636673) | [636373,636673) | [24871/3,25771/3) | full | full |
| 1115 | semantic-utterance-001115 | "る" | [636673,636693) | [636673,636693) | [25771/3,25831/3) | full | full |
| 1116 | semantic-utterance-001116 | "の" | [636693,637814) | [636693,637814) | [25831/3,29194/3) | full | full |
| 1117 | semantic-utterance-001117 | "?" | [637814,637835) | [637814,637835) | [29194/3,29257/3) | full | full |
| 1118 | semantic-utterance-001118 | "お" | [637835,638876) | [637835,638876) | [29257/3,32380/3) | full | full |
| 1119 | semantic-utterance-001119 | "母" | [638876,638896) | [638876,638896) | [32380/3,32440/3) | full | full |
| 1120 | semantic-utterance-001120 | "さ" | [638896,639016) | [638896,639016) | [32440/3,32800/3) | full | full |
| 1121 | semantic-utterance-001121 | "ん" | [639016,639136) | [639016,639136) | [32800/3,33160/3) | full | full |
| 1122 | semantic-utterance-001122 | "を" | [639136,639296) | [639136,639296) | [33160/3,33640/3) | full | full |
| 1123 | semantic-utterance-001123 | "困" | [639296,639316) | [639296,639316) | [33640/3,33700/3) | full | full |
| 1124 | semantic-utterance-001124 | "ら" | [639316,639336) | [639316,639336) | [33700/3,33760/3) | full | full |
| 1125 | semantic-utterance-001125 | "せ" | [639336,639516) | [639336,639516) | [33760/3,34300/3) | full | full |
| 1126 | semantic-utterance-001126 | "ん" | [639516,639536) | [639516,639536) | [34300/3,34360/3) | full | full |
| 1127 | semantic-utterance-001127 | "じ" | [639536,639556) | [639536,639556) | [34360/3,34420/3) | full | full |
| 1128 | semantic-utterance-001128 | "ゃ" | [639556,639677) | [639556,639677) | [34420/3,34783/3) | full | full |
| 1129 | semantic-utterance-001129 | "な" | [639677,639957) | [639677,639957) | [34783/3,35623/3) | full | full |
| 1130 | semantic-utterance-001130 | "い" | [639957,640057) | [639957,640057) | [35623/3,35923/3) | full | full |
| 1131 | semantic-utterance-001131 | "よ" | [640057,640077) | [640057,640077) | [35923/3,35983/3) | full | full |
| 1132 | semantic-utterance-001132 | "!" | [640077,640097) | [640077,640097) | [35983/3,36043/3) | full | full |
| 1133 | semantic-utterance-001133 | "汚" | [640097,642259) | [640097,642259) | [36043/3,42529/3) | full | full |
| 1134 | semantic-utterance-001134 | "ね" | [642259,642620) | [642259,642620) | [42529/3,43612/3) | full | full |
| 1135 | semantic-utterance-001135 | "ぇ" | [642620,642640) | [642620,642640) | [43612/3,43672/3) | full | full |
| 1136 | semantic-utterance-001136 | "ト" | [642640,642820) | [642640,642820) | [43672/3,44212/3) | full | full |
| 1137 | semantic-utterance-001137 | "イ" | [642820,642840) | [642820,642840) | [44212/3,44272/3) | full | full |
| 1138 | semantic-utterance-001138 | "レ" | [642840,642960) | [642840,642960) | [44272/3,44632/3) | full | full |
| 1139 | semantic-utterance-001139 | "え" | [642960,644282) | [642960,644282) | [44632/3,48598/3) | full | full |
| 1140 | semantic-utterance-001140 | "ぇ" | [644282,644302) | [644282,644302) | [48598/3,48658/3) | full | full |
| 1141 | semantic-utterance-001141 | "!" | [644302,644862) | [644302,644862) | [48658/3,50338/3) | full | full |
| 1142 | semantic-utterance-001142 | "こ" | [644862,645163) | [644862,645163) | [50338/3,51241/3) | full | full |
| 1143 | semantic-utterance-001143 | "う" | [645163,645283) | [645163,645283) | [51241/3,51601/3) | full | full |
| 1144 | semantic-utterance-001144 | "い" | [645283,645703) | [645283,645703) | [51601/3,52861/3) | full | full |
| 1145 | semantic-utterance-001145 | "う" | [645703,645944) | [645703,645944) | [52861/3,53584/3) | full | full |
| 1146 | semantic-utterance-001146 | "の" | [645944,646224) | [645944,646224) | [53584/3,54424/3) | full | full |
| 1147 | semantic-utterance-001147 | "も" | [646224,646244) | [646224,646244) | [54424/3,54484/3) | full | full |
| 1148 | semantic-utterance-001148 | "開" | [646244,646264) | [646244,646264) | [54484/3,54544/3) | full | full |
| 1149 | semantic-utterance-001149 | "く" | [646264,649167) | [646264,649167) | [54544/3,63253/3) | full | full |
| 1150 | semantic-utterance-001150 | "の" | [649167,649187) | [649167,649187) | [63253/3,63313/3) | full | full |
| 1151 | semantic-utterance-001151 | "か" | [649187,649207) | [649187,649207) | [63313/3,63373/3) | full | full |
| 1152 | semantic-utterance-001152 | "よ" | [649207,649287) | [649207,649287) | [63373/3,63613/3) | full | full |
| 1153 | semantic-utterance-001153 | "!" | [649287,649307) | [649287,649307) | [63613/3,63673/3) | full | full |
| 1154 | semantic-utterance-001154 | "え" | [649307,649327) | [649307,649327) | [63673/3,63733/3) | full | full |
| 1155 | semantic-utterance-001155 | "、" | [649327,649347) | [649327,649347) | [63733/3,63793/3) | full | full |
| 1156 | semantic-utterance-001156 | "こ" | [649347,649367) | [649347,649367) | [63793/3,63853/3) | full | full |
| 1157 | semantic-utterance-001157 | "う" | [649367,649387) | [649367,649387) | [63853/3,63913/3) | full | full |
| 1158 | semantic-utterance-001158 | "…" | [649387,649468) | [649387,649468) | [63913/3,64156/3) | full | full |
| 1159 | semantic-utterance-001159 | "え" | [649468,649488) | [649468,649488) | [64156/3,64216/3) | full | full |
| 1160 | semantic-utterance-001160 | "?" | [649488,649508) | [649488,649508) | [64216/3,64276/3) | full | full |
| 1161 | semantic-utterance-001161 | "ね" | [649508,649708) | [649508,649708) | [64276/3,64876/3) | full | full |
| 1162 | semantic-utterance-001162 | "ぇ" | [649708,649728) | [649708,649728) | [64876/3,64936/3) | full | full |
| 1163 | semantic-utterance-001163 | "、" | [649728,649868) | [649728,649868) | [64936/3,65356/3) | full | full |
| 1164 | semantic-utterance-001164 | "ち" | [649868,649888) | [649868,649888) | [65356/3,65416/3) | full | full |
| 1165 | semantic-utterance-001165 | "ょ" | [649888,649908) | [649888,649908) | [65416/3,65476/3) | full | full |
| 1166 | semantic-utterance-001166 | "っ" | [649908,650068) | [649908,650068) | [65476/3,65956/3) | full | full |
| 1167 | semantic-utterance-001167 | "と" | [650068,650248) | [650068,650248) | [65956/3,66496/3) | full | full |
| 1168 | semantic-utterance-001168 | "待" | [650248,650409) | [650248,650409) | [66496/3,66979/3) | full | full |
| 1169 | semantic-utterance-001169 | "て" | [650409,650429) | [650409,650429) | [66979/3,67039/3) | full | full |
| 1170 | semantic-utterance-001170 | "見" | [650429,650489) | [650429,650489) | [67039/3,67219/3) | full | full |
| 1171 | semantic-utterance-001171 | "せ" | [650489,650509) | [650489,650509) | [67219/3,67279/3) | full | full |
| 1172 | semantic-utterance-001172 | "方" | [650509,650529) | [650509,650529) | [67279/3,67339/3) | full | full |
| 1173 | semantic-utterance-001173 | "怖" | [650529,650629) | [650529,650629) | [67339/3,67639/3) | full | full |
| 1174 | semantic-utterance-001174 | "い" | [650629,650649) | [650629,650649) | [67639/3,67699/3) | full | full |
| 1175 | semantic-utterance-001175 | "ん" | [650649,650669) | [650649,650669) | [67699/3,67759/3) | full | full |
| 1176 | semantic-utterance-001176 | "だ" | [650669,650729) | [650669,650729) | [67759/3,67939/3) | full | full |
| 1177 | semantic-utterance-001177 | "け" | [650729,650929) | [650729,650929) | [67939/3,68539/3) | full | full |
| 1178 | semantic-utterance-001178 | "ど" | [650929,650949) | [650929,650949) | [68539/3,68599/3) | full | full |
| 1179 | semantic-utterance-001179 | "普" | [650949,651029) | [650949,651029) | [68599/3,68839/3) | full | full |
| 1180 | semantic-utterance-001180 | "通" | [651029,651370) | [651029,651370) | [68839/3,69862/3) | full | full |
| 1181 | semantic-utterance-001181 | "に" | [651370,651390) | [651370,651390) | [69862/3,69922/3) | full | full |
| 1182 | semantic-utterance-001182 | "え" | [664354,664574) | [664354,664574) | [108814/3,109474/3) | full | full |
| 1183 | semantic-utterance-001183 | "、" | [664574,664794) | [664574,664794) | [109474/3,110134/3) | full | full |
| 1184 | semantic-utterance-001184 | "こ" | [664794,664834) | [664794,664834) | [110134/3,110254/3) | full | full |
| 1185 | semantic-utterance-001185 | "の" | [664834,665034) | [664834,665034) | [110254/3,110854/3) | full | full |
| 1186 | semantic-utterance-001186 | "カ" | [665034,665254) | [665034,665254) | [110854/3,111514/3) | full | full |
| 1187 | semantic-utterance-001187 | "メ" | [665254,665434) | [665254,665434) | [111514/3,112054/3) | full | full |
| 1188 | semantic-utterance-001188 | "ラ" | [665434,665654) | [665434,665654) | [112054/3,112714/3) | full | full |
| 1189 | semantic-utterance-001189 | "も" | [665654,665674) | [665654,665674) | [112714/3,112774/3) | full | full |
| 1190 | semantic-utterance-001190 | "さ" | [665674,665854) | [665674,665854) | [112774/3,113314/3) | full | full |
| 1191 | semantic-utterance-001191 | "ね" | [665854,665874) | [665854,665874) | [113314/3,113374/3) | full | full |
| 1192 | semantic-utterance-001192 | "、" | [665874,666234) | [665874,666234) | [113374/3,114454/3) | full | full |
| 1193 | semantic-utterance-001193 | "ビ" | [666234,666414) | [666234,666414) | [114454/3,114994/3) | full | full |
| 1194 | semantic-utterance-001194 | "ビ" | [666414,666535) | [666414,666535) | [114994/3,115357/3) | full | full |
| 1195 | semantic-utterance-001195 | "ら" | [666535,666555) | [666535,666555) | [115357/3,115417/3) | full | full |
| 1196 | semantic-utterance-001196 | "せ" | [666555,666755) | [666555,666755) | [115417/3,116017/3) | full | full |
| 1197 | semantic-utterance-001197 | "る" | [666755,666995) | [666755,666995) | [116017/3,116737/3) | full | full |
| 1198 | semantic-utterance-001198 | "感" | [666995,667275) | [666995,667275) | [116737/3,117577/3) | full | full |
| 1199 | semantic-utterance-001199 | "じ" | [667275,667375) | [667275,667375) | [117577/3,117877/3) | full | full |
| 1200 | semantic-utterance-001200 | "や" | [667375,667535) | [667375,667535) | [117877/3,118357/3) | full | full |
| 1201 | semantic-utterance-001201 | "め" | [667535,667675) | [667535,667675) | [118357/3,118777/3) | full | full |
| 1202 | semantic-utterance-001202 | "て" | [667675,667815) | [667675,667815) | [118777/3,119197/3) | full | full |
| 1203 | semantic-utterance-001203 | "ほ" | [667815,668015) | [667815,668015) | [119197/3,119797/3) | full | full |
| 1204 | semantic-utterance-001204 | "し" | [668015,668035) | [668015,668035) | [119797/3,119857/3) | full | full |
| 1205 | semantic-utterance-001205 | "い" | [668035,671316) | [668035,671316) | [119857/3,129700/3) | full | full |
| 1206 | semantic-utterance-001206 | "お" | [671316,671976) | [671316,671976) | [129700/3,131680/3) | full | full |
| 1207 | semantic-utterance-001207 | "い" | [671976,672316) | [671976,672316) | [131680/3,132700/3) | full | full |
| 1208 | semantic-utterance-001208 | "、" | [672316,672536) | [672316,672536) | [132700/3,133360/3) | full | full |
| 1209 | semantic-utterance-001209 | "カ" | [672536,672816) | [672536,672816) | [133360/3,134200/3) | full | full |
| 1210 | semantic-utterance-001210 | "ー" | [672816,672836) | [672816,672836) | [134200/3,134260/3) | full | full |
| 1211 | semantic-utterance-001211 | "ペ" | [672836,673176) | [672836,673176) | [134260/3,135280/3) | full | full |
| 1212 | semantic-utterance-001212 | "ン" | [673176,673196) | [673176,673196) | [135280/3,135340/3) | full | full |
| 1213 | semantic-utterance-001213 | "し" | [673196,673416) | [673196,673416) | [135340/3,136000/3) | full | full |
| 1214 | semantic-utterance-001214 | "て" | [673416,673536) | [673416,673536) | [136000/3,136360/3) | full | full |
| 1215 | semantic-utterance-001215 | "く" | [673536,673696) | [673536,673696) | [136360/3,136840/3) | full | full |
| 1216 | semantic-utterance-001216 | "ん" | [673696,673856) | [673696,673856) | [136840/3,137320/3) | full | full |
| 1217 | semantic-utterance-001217 | "な" | [673856,673876) | [673856,673876) | [137320/3,137380/3) | full | full |
| 1218 | semantic-utterance-001218 | "い" | [673876,673996) | [673876,673996) | [137380/3,137740/3) | full | full |
| 1219 | semantic-utterance-001219 | "?" | [673996,674196) | [673996,674196) | [137740/3,138340/3) | full | full |
| 1220 | semantic-utterance-001220 | "な" | [674196,674216) | [674196,674216) | [138340/3,138400/3) | full | full |
| 1221 | semantic-utterance-001221 | "ん" | [674216,674376) | [674216,674376) | [138400/3,138880/3) | full | full |
| 1222 | semantic-utterance-001222 | "か" | [674376,674396) | [674376,674396) | [138880/3,138940/3) | full | full |
| 1223 | semantic-utterance-001223 | "そ" | [674396,674536) | [674396,674536) | [138940/3,139360/3) | full | full |
| 1224 | semantic-utterance-001224 | "の" | [674536,674556) | [674536,674556) | [139360/3,139420/3) | full | full |
| 1225 | semantic-utterance-001225 | "見" | [674556,674576) | [674556,674576) | [139420/3,139480/3) | full | full |
| 1226 | semantic-utterance-001226 | "せ" | [674576,674736) | [674576,674736) | [139480/3,139960/3) | full | full |
| 1227 | semantic-utterance-001227 | "方" | [674736,674756) | [674736,674756) | [139960/3,140020/3) | full | full |
| 1228 | semantic-utterance-001228 | "が" | [674756,674776) | [674756,674776) | [140020/3,140080/3) | full | full |
| 1229 | semantic-utterance-001229 | "怖" | [674776,675197) | [674776,675197) | [140080/3,141343/3) | full | full |
| 1230 | semantic-utterance-001230 | "い" | [675197,675657) | [675197,675657) | [141343/3,142723/3) | full | full |
| 1231 | semantic-utterance-001231 | "や" | [675657,675677) | [675657,675677) | [142723/3,142783/3) | full | full |
| 1232 | semantic-utterance-001232 | "つ" | [675677,675697) | [675677,675697) | [142783/3,142843/3) | full | full |
| 1233 | semantic-utterance-001233 | "じ" | [675697,675717) | [675697,675717) | [142843/3,142903/3) | full | full |
| 1234 | semantic-utterance-001234 | "ゃ" | [675717,675737) | [675717,675737) | [142903/3,142963/3) | full | full |
| 1235 | semantic-utterance-001235 | "ん" | [675737,675757) | [675737,675757) | [142963/3,143023/3) | full | full |
| 1236 | semantic-utterance-001236 | "ち" | [675757,675777) | [675757,675777) | [143023/3,143083/3) | full | full |
| 1237 | semantic-utterance-001237 | "ゃ" | [675777,675797) | [675777,675797) | [143083/3,143143/3) | full | full |
| 1238 | semantic-utterance-001238 | "ん" | [675797,675977) | [675797,675977) | [143143/3,143683/3) | full | full |
| 1239 | semantic-utterance-001239 | "と" | [675977,675997) | [675977,675997) | [143683/3,143743/3) | full | full |
| 1240 | semantic-utterance-001240 | "ー" | [675997,676157) | [675997,676157) | [143743/3,144223/3) | full | full |
| 1241 | semantic-utterance-001241 | "く" | [676157,676177) | [676157,676177) | [144223/3,144283/3) | full | full |
| 1242 | semantic-utterance-001242 | "っ" | [676177,676537) | [676177,676537) | [144283/3,145363/3) | full | full |
| 1243 | semantic-utterance-001243 | "そ" | [676537,676557) | [676537,676557) | [145363/3,145423/3) | full | full |
| 1244 | semantic-utterance-001244 | "…" | [676557,677017) | [676557,677017) | [145423/3,146803/3) | full | full |
| 1245 | semantic-utterance-001245 | "も" | [677017,683238) | [677017,683238) | [146803/3,165466/3) | full | full |
| 1246 | semantic-utterance-001246 | "う" | [683238,683498) | [683238,2049748/3) | [165466/3,165500/3) | partial | outside |

</details>

<details>
<summary>item-0001 / segment-0002 — 73 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 2765 | semantic-utterance-002765 | "?" | [1377898,1377918) | [4133698/3,1377918) | [165500/3,165556/3) | partial | full |
| 2766 | semantic-utterance-002766 | "マ" | [1412798,1413599) | [1412798,1413599) | [270196/3,272599/3) | full | full |
| 2767 | semantic-utterance-002767 | "ジ" | [1413599,1413899) | [1413599,1413899) | [272599/3,273499/3) | full | full |
| 2768 | semantic-utterance-002768 | "今" | [1413899,1414120) | [1413899,1414120) | [273499/3,274162/3) | full | full |
| 2769 | semantic-utterance-002769 | "ん" | [1414120,1414140) | [1414120,1414140) | [274162/3,274222/3) | full | full |
| 2770 | semantic-utterance-002770 | "と" | [1414140,1421585) | [1414140,1421585) | [274222/3,296557/3) | full | full |
| 2771 | semantic-utterance-002771 | "こ" | [1421585,1421746) | [1421585,1421746) | [296557/3,297040/3) | full | full |
| 2772 | semantic-utterance-002772 | "ろ" | [1421746,1421766) | [1421746,1421766) | [297040/3,297100/3) | full | full |
| 2773 | semantic-utterance-002773 | "今" | [1421766,1421926) | [1421766,1421926) | [297100/3,297580/3) | full | full |
| 2774 | semantic-utterance-002774 | "年" | [1421926,1421946) | [1421926,1421946) | [297580/3,297640/3) | full | full |
| 2775 | semantic-utterance-002775 | "一" | [1421946,1422526) | [1421946,1422526) | [297640/3,299380/3) | full | full |
| 2776 | semantic-utterance-002776 | "怖" | [1422526,1423507) | [1422526,1423507) | [299380/3,302323/3) | full | full |
| 2777 | semantic-utterance-002777 | "す" | [1423507,1423527) | [1423507,1423527) | [302323/3,302383/3) | full | full |
| 2778 | semantic-utterance-002778 | "ぎ" | [1423527,1423547) | [1423527,1423547) | [302383/3,302443/3) | full | full |
| 2779 | semantic-utterance-002779 | "て" | [1423547,1423767) | [1423547,1423767) | [302443/3,303103/3) | full | full |
| 2780 | semantic-utterance-002780 | "笑" | [1423767,1423787) | [1423767,1423787) | [303103/3,303163/3) | full | full |
| 2781 | semantic-utterance-002781 | "っ" | [1423787,1424208) | [1423787,1424208) | [303163/3,304426/3) | full | full |
| 2782 | semantic-utterance-002782 | "た" | [1424208,1424228) | [1424208,1424228) | [304426/3,304486/3) | full | full |
| 2783 | semantic-utterance-002783 | "ビ" | [1424228,1424308) | [1424228,1424308) | [304486/3,304726/3) | full | full |
| 2784 | semantic-utterance-002784 | "デ" | [1424308,1424468) | [1424308,1424468) | [304726/3,305206/3) | full | full |
| 2785 | semantic-utterance-002785 | "オ" | [1424468,1424848) | [1424468,1424848) | [305206/3,306346/3) | full | full |
| 2786 | semantic-utterance-002786 | "見" | [1424848,1425028) | [1424848,1425028) | [306346/3,306886/3) | full | full |
| 2787 | semantic-utterance-002787 | "る" | [1425028,1425088) | [1425028,1425088) | [306886/3,307066/3) | full | full |
| 2788 | semantic-utterance-002788 | "気" | [1425088,1425108) | [1425088,1425108) | [307066/3,307126/3) | full | full |
| 2789 | semantic-utterance-002789 | "?" | [1425108,1425208) | [1425108,1425208) | [307126/3,307426/3) | full | full |
| 2790 | semantic-utterance-002790 | "も" | [1425208,1425228) | [1425208,1425228) | [307426/3,307486/3) | full | full |
| 2791 | semantic-utterance-002791 | "う" | [1425228,1425388) | [1425228,1425388) | [307486/3,307966/3) | full | full |
| 2792 | semantic-utterance-002792 | "勘" | [1425388,1425529) | [1425388,1425529) | [307966/3,308389/3) | full | full |
| 2793 | semantic-utterance-002793 | "弁" | [1425529,1425549) | [1425529,1425549) | [308389/3,308449/3) | full | full |
| 2794 | semantic-utterance-002794 | "し" | [1425549,1425569) | [1425549,1425569) | [308449/3,308509/3) | full | full |
| 2795 | semantic-utterance-002795 | "て" | [1425569,1425669) | [1425569,1425669) | [308509/3,308809/3) | full | full |
| 2796 | semantic-utterance-002796 | "よ" | [1425669,1425689) | [1425669,1425689) | [308809/3,308869/3) | full | full |
| 2797 | semantic-utterance-002797 | "夜" | [1425689,1425729) | [1425689,1425729) | [308869/3,308989/3) | full | full |
| 2798 | semantic-utterance-002798 | "中" | [1425729,1425749) | [1425729,1425749) | [308989/3,309049/3) | full | full |
| 2799 | semantic-utterance-002799 | "に" | [1425749,1425769) | [1425749,1425769) | [309049/3,309109/3) | full | full |
| 2800 | semantic-utterance-002800 | "な" | [1425769,1425789) | [1425769,1425789) | [309109/3,309169/3) | full | full |
| 2801 | semantic-utterance-002801 | "ん" | [1425789,1425909) | [1425789,1425909) | [309169/3,309529/3) | full | full |
| 2802 | semantic-utterance-002802 | "か" | [1425909,1426129) | [1425909,1426129) | [309529/3,310189/3) | full | full |
| 2803 | semantic-utterance-002803 | "映" | [1426129,1426229) | [1426129,1426229) | [310189/3,310489/3) | full | full |
| 2804 | semantic-utterance-002804 | "る" | [1426229,1426289) | [1426229,1426289) | [310489/3,310669/3) | full | full |
| 2805 | semantic-utterance-002805 | "よ" | [1426289,1426309) | [1426289,1426309) | [310669/3,310729/3) | full | full |
| 2806 | semantic-utterance-002806 | "う" | [1426309,1426409) | [1426309,1426409) | [310729/3,311029/3) | full | full |
| 2807 | semantic-utterance-002807 | "な" | [1426409,1426509) | [1426409,1426509) | [311029/3,311329/3) | full | full |
| 2808 | semantic-utterance-002808 | "や" | [1426509,1426629) | [1426509,1426629) | [311329/3,311689/3) | full | full |
| 2809 | semantic-utterance-002809 | "つ" | [1426629,1426649) | [1426629,1426649) | [311689/3,311749/3) | full | full |
| 2810 | semantic-utterance-002810 | "あ" | [1426649,1426790) | [1426649,1426790) | [311749/3,312172/3) | full | full |
| 2811 | semantic-utterance-002811 | "、" | [1426790,1426930) | [1426790,1426930) | [312172/3,312592/3) | full | full |
| 2812 | semantic-utterance-002812 | "ち" | [1426930,1426950) | [1426930,1426950) | [312592/3,312652/3) | full | full |
| 2813 | semantic-utterance-002813 | "げ" | [1426950,1427050) | [1426950,1427050) | [312652/3,312952/3) | full | full |
| 2814 | semantic-utterance-002814 | "ー" | [1427050,1427070) | [1427050,1427070) | [312952/3,313012/3) | full | full |
| 2815 | semantic-utterance-002815 | "や" | [1427070,1427110) | [1427070,1427110) | [313012/3,313132/3) | full | full |
| 2816 | semantic-utterance-002816 | "そ" | [1427110,1427130) | [1427110,1427130) | [313132/3,313192/3) | full | full |
| 2817 | semantic-utterance-002817 | "れ" | [1427130,1427150) | [1427130,1427150) | [313192/3,313252/3) | full | full |
| 2818 | semantic-utterance-002818 | "よ" | [1427150,1427170) | [1427150,1427170) | [313252/3,313312/3) | full | full |
| 2819 | semantic-utterance-002819 | "り" | [1427170,1427190) | [1427170,1427190) | [313312/3,313372/3) | full | full |
| 2820 | semantic-utterance-002820 | "も" | [1427190,1427210) | [1427190,1427210) | [313372/3,313432/3) | full | full |
| 2821 | semantic-utterance-002821 | "動" | [1427210,1427230) | [1427210,1427230) | [313432/3,313492/3) | full | full |
| 2822 | semantic-utterance-002822 | "画" | [1427230,1427250) | [1427230,1427250) | [313492/3,313552/3) | full | full |
| 2823 | semantic-utterance-002823 | "の" | [1427250,1427330) | [1427250,1427330) | [313552/3,313792/3) | full | full |
| 2824 | semantic-utterance-002824 | "プ" | [1427330,1427430) | [1427330,1427430) | [313792/3,314092/3) | full | full |
| 2825 | semantic-utterance-002825 | "レ" | [1427430,1427450) | [1427430,1427450) | [314092/3,314152/3) | full | full |
| 2826 | semantic-utterance-002826 | "ミ" | [1427450,1427590) | [1427450,1427590) | [314152/3,314572/3) | full | full |
| 2827 | semantic-utterance-002827 | "ア" | [1427590,1427710) | [1427590,1427710) | [314572/3,314932/3) | full | full |
| 2828 | semantic-utterance-002828 | "ム" | [1427710,1427730) | [1427710,1427730) | [314932/3,314992/3) | full | full |
| 2829 | semantic-utterance-002829 | "公" | [1427730,1427790) | [1427730,1427790) | [314992/3,315172/3) | full | full |
| 2830 | semantic-utterance-002830 | "開" | [1427790,1427910) | [1427790,1427910) | [315172/3,315532/3) | full | full |
| 2831 | semantic-utterance-002831 | "の" | [1427910,1427930) | [1427910,1427930) | [315532/3,315592/3) | full | full |
| 2832 | semantic-utterance-002832 | "時" | [1427930,1428051) | [1427930,1428051) | [315592/3,315955/3) | full | full |
| 2833 | semantic-utterance-002833 | "の" | [1428051,1428071) | [1428051,1428071) | [315955/3,316015/3) | full | full |
| 2834 | semantic-utterance-002834 | "画" | [1428071,1428091) | [1428071,1428091) | [316015/3,316075/3) | full | full |
| 2835 | semantic-utterance-002835 | "面" | [1428091,1428111) | [1428091,1428111) | [316075/3,316135/3) | full | full |
| 2836 | semantic-utterance-002836 | "だ" | [1428111,1428251) | [1428111,1428251) | [316135/3,316555/3) | full | full |
| 2837 | semantic-utterance-002837 | "こ" | [1428251,1428311) | [1428251,1428266) | [316555/3,316600/3) | partial | outside |

</details>

<details>
<summary>item-0002 / segment-0001 — 174 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 3314 | semantic-utterance-003314 | "の" | [1644392,1645432) | [4933198/3,1645432) | [0,3098/3) | partial | full |
| 3315 | semantic-utterance-003315 | "強" | [1645432,1645753) | [1645432,1645753) | [3098/3,4061/3) | full | full |
| 3316 | semantic-utterance-003316 | "行" | [1645753,1645993) | [1645753,1645993) | [4061/3,4781/3) | full | full |
| 3317 | semantic-utterance-003317 | "モ" | [1645993,1646013) | [1645993,1646013) | [4781/3,4841/3) | full | full |
| 3318 | semantic-utterance-003318 | "ー" | [1646013,1646233) | [1646013,1646233) | [4841/3,5501/3) | full | full |
| 3319 | semantic-utterance-003319 | "ド" | [1646233,1646513) | [1646233,1646513) | [5501/3,6341/3) | full | full |
| 3320 | semantic-utterance-003320 | "で" | [1646513,1646633) | [1646513,1646633) | [6341/3,6701/3) | full | full |
| 3321 | semantic-utterance-003321 | "当" | [1646633,1646653) | [1646633,1646653) | [6701/3,6761/3) | full | full |
| 3322 | semantic-utterance-003322 | "て" | [1646653,1646693) | [1646653,1646693) | [6761/3,6881/3) | full | full |
| 3323 | semantic-utterance-003323 | "続" | [1646693,1646813) | [1646693,1646813) | [6881/3,7241/3) | full | full |
| 3324 | semantic-utterance-003324 | "け" | [1646813,1646913) | [1646813,1646913) | [7241/3,7541/3) | full | full |
| 3325 | semantic-utterance-003325 | "る" | [1646913,1646953) | [1646913,1646953) | [7541/3,7661/3) | full | full |
| 3326 | semantic-utterance-003326 | "と" | [1646953,1647033) | [1646953,1647033) | [7661/3,7901/3) | full | full |
| 3327 | semantic-utterance-003327 | "追" | [1647033,1647053) | [1647033,1647053) | [7901/3,7961/3) | full | full |
| 3328 | semantic-utterance-003328 | "い" | [1647053,1647193) | [1647053,1647193) | [7961/3,8381/3) | full | full |
| 3329 | semantic-utterance-003329 | "払" | [1647193,1647213) | [1647193,1647213) | [8381/3,8441/3) | full | full |
| 3330 | semantic-utterance-003330 | "う" | [1647213,1647374) | [1647213,1647374) | [8441/3,8924/3) | full | full |
| 3331 | semantic-utterance-003331 | "こ" | [1647374,1647394) | [1647374,1647394) | [8924/3,8984/3) | full | full |
| 3332 | semantic-utterance-003332 | "と" | [1647394,1647474) | [1647394,1647474) | [8984/3,9224/3) | full | full |
| 3333 | semantic-utterance-003333 | "が" | [1647474,1647574) | [1647474,1647574) | [9224/3,9524/3) | full | full |
| 3334 | semantic-utterance-003334 | "で" | [1647574,1647674) | [1647574,1647674) | [9524/3,9824/3) | full | full |
| 3335 | semantic-utterance-003335 | "き" | [1647674,1647734) | [1647674,1647734) | [9824/3,10004/3) | full | full |
| 3336 | semantic-utterance-003336 | "る" | [1647734,1647834) | [1647734,1647834) | [10004/3,10304/3) | full | full |
| 3337 | semantic-utterance-003337 | "え" | [1647834,1647994) | [1647834,1647994) | [10304/3,10784/3) | full | full |
| 3338 | semantic-utterance-003338 | "?" | [1647994,1648014) | [1647994,1648014) | [10784/3,10844/3) | full | full |
| 3339 | semantic-utterance-003339 | "そ" | [1655570,1655770) | [1655570,1655770) | [33512/3,34112/3) | full | full |
| 3340 | semantic-utterance-003340 | "う" | [1655770,1655970) | [1655770,1655970) | [34112/3,34712/3) | full | full |
| 3341 | semantic-utterance-003341 | "や" | [1655970,1655990) | [1655970,1655990) | [34712/3,34772/3) | full | full |
| 3342 | semantic-utterance-003342 | "っ" | [1655990,1656351) | [1655990,1656351) | [34772/3,35855/3) | full | full |
| 3343 | semantic-utterance-003343 | "て" | [1656351,1658012) | [1656351,1658012) | [35855/3,40838/3) | full | full |
| 3344 | semantic-utterance-003344 | "?" | [1658012,1658252) | [1658012,1658252) | [40838/3,41558/3) | full | full |
| 3345 | semantic-utterance-003345 | "L" | [1658252,1658272) | [1658252,1658272) | [41558/3,41618/3) | full | full |
| 3346 | semantic-utterance-003346 | "T" | [1658272,1658492) | [1658272,1658492) | [41618/3,42278/3) | full | full |
| 3347 | semantic-utterance-003347 | "!" | [1658492,1658512) | [1658492,1658512) | [42278/3,42338/3) | full | full |
| 3348 | semantic-utterance-003348 | "L" | [1658512,1659212) | [1658512,1659212) | [42338/3,44438/3) | full | full |
| 3349 | semantic-utterance-003349 | "T" | [1659212,1659352) | [1659212,1659352) | [44438/3,44858/3) | full | full |
| 3350 | semantic-utterance-003350 | "っ" | [1659352,1659373) | [1659352,1659373) | [44858/3,44921/3) | full | full |
| 3351 | semantic-utterance-003351 | "て" | [1659373,1659573) | [1659373,1659573) | [44921/3,45521/3) | full | full |
| 3352 | semantic-utterance-003352 | "何" | [1659573,1659593) | [1659573,1659593) | [45521/3,45581/3) | full | full |
| 3353 | semantic-utterance-003353 | "?" | [1659593,1659773) | [1659593,1659773) | [45581/3,46121/3) | full | full |
| 3354 | semantic-utterance-003354 | "み" | [1659773,1659893) | [1659773,1659893) | [46121/3,46481/3) | full | full |
| 3355 | semantic-utterance-003355 | "ん" | [1659893,1659913) | [1659893,1659913) | [46481/3,46541/3) | full | full |
| 3356 | semantic-utterance-003356 | "な" | [1659913,1660113) | [1659913,1660113) | [46541/3,47141/3) | full | full |
| 3357 | semantic-utterance-003357 | "L" | [1660113,1660133) | [1660113,1660133) | [47141/3,47201/3) | full | full |
| 3358 | semantic-utterance-003358 | "T" | [1660133,1660273) | [1660133,1660273) | [47201/3,47621/3) | full | full |
| 3359 | semantic-utterance-003359 | "っ" | [1660273,1660293) | [1660273,1660293) | [47621/3,47681/3) | full | full |
| 3360 | semantic-utterance-003360 | "て" | [1660293,1660473) | [1660293,1660473) | [47681/3,48221/3) | full | full |
| 3361 | semantic-utterance-003361 | "こ" | [1660473,1660613) | [1660473,1660613) | [48221/3,48641/3) | full | full |
| 3362 | semantic-utterance-003362 | "れ" | [1660613,1660733) | [1660613,1660733) | [48641/3,49001/3) | full | full |
| 3363 | semantic-utterance-003363 | "溶" | [1660733,1660914) | [1660733,1660914) | [49001/3,49544/3) | full | full |
| 3364 | semantic-utterance-003364 | "け" | [1660914,1660934) | [1660914,1660934) | [49544/3,49604/3) | full | full |
| 3365 | semantic-utterance-003365 | "て" | [1660934,1660954) | [1660934,1660954) | [49604/3,49664/3) | full | full |
| 3366 | semantic-utterance-003366 | "る" | [1660954,1660974) | [1660954,1660974) | [49664/3,49724/3) | full | full |
| 3367 | semantic-utterance-003367 | "?" | [1660974,1661034) | [1660974,1661034) | [49724/3,49904/3) | full | full |
| 3368 | semantic-utterance-003368 | "L" | [1661034,1661054) | [1661034,1661054) | [49904/3,49964/3) | full | full |
| 3369 | semantic-utterance-003369 | "T" | [1661054,1661194) | [1661054,1661194) | [49964/3,50384/3) | full | full |
| 3370 | semantic-utterance-003370 | "っ" | [1661194,1661234) | [1661194,1661234) | [50384/3,50504/3) | full | full |
| 3371 | semantic-utterance-003371 | "て" | [1661234,1661254) | [1661234,1661254) | [50504/3,50564/3) | full | full |
| 3372 | semantic-utterance-003372 | "何" | [1661254,1661334) | [1661254,1661334) | [50564/3,50804/3) | full | full |
| 3373 | semantic-utterance-003373 | "?" | [1661334,1661414) | [1661334,1661414) | [50804/3,51044/3) | full | full |
| 3374 | semantic-utterance-003374 | "エ" | [1661414,1661434) | [1661414,1661434) | [51044/3,51104/3) | full | full |
| 3375 | semantic-utterance-003375 | "ン" | [1661434,1661454) | [1661434,1661454) | [51104/3,51164/3) | full | full |
| 3376 | semantic-utterance-003376 | "タ" | [1661454,1661474) | [1661454,1661474) | [51164/3,51224/3) | full | full |
| 3377 | semantic-utterance-003377 | "ー" | [1661474,1664536) | [1661474,1664536) | [51224/3,60410/3) | full | full |
| 3378 | semantic-utterance-003378 | "?" | [1664536,1665116) | [1664536,1665116) | [60410/3,62150/3) | full | full |
| 3379 | semantic-utterance-003379 | "な" | [1665116,1668739) | [1665116,1668739) | [62150/3,73019/3) | full | full |
| 3380 | semantic-utterance-003380 | "ん" | [1668739,1668759) | [1668739,1668759) | [73019/3,73079/3) | full | full |
| 3381 | semantic-utterance-003381 | "か" | [1668759,1669079) | [1668759,1669079) | [73079/3,74039/3) | full | full |
| 3382 | semantic-utterance-003382 | "溶" | [1669079,1669099) | [1669079,1669099) | [74039/3,74099/3) | full | full |
| 3383 | semantic-utterance-003383 | "け" | [1669099,1669719) | [1669099,1669719) | [74099/3,75959/3) | full | full |
| 3384 | semantic-utterance-003384 | "さ" | [1669719,1672661) | [1669719,1672661) | [75959/3,84785/3) | full | full |
| 3385 | semantic-utterance-003385 | "す" | [1672661,1673102) | [1672661,1673102) | [84785/3,86108/3) | full | full |
| 3386 | semantic-utterance-003386 | "こ" | [1673102,1673122) | [1673102,1673122) | [86108/3,86168/3) | full | full |
| 3387 | semantic-utterance-003387 | "と" | [1673122,1673262) | [1673122,1673262) | [86168/3,86588/3) | full | full |
| 3388 | semantic-utterance-003388 | "が" | [1673262,1673902) | [1673262,1673902) | [86588/3,88508/3) | full | full |
| 3389 | semantic-utterance-003389 | "で" | [1673902,1674102) | [1673902,1674102) | [88508/3,89108/3) | full | full |
| 3390 | semantic-utterance-003390 | "き" | [1674102,1674262) | [1674102,1674262) | [89108/3,89588/3) | full | full |
| 3391 | semantic-utterance-003391 | "る" | [1674262,1674282) | [1674262,1674282) | [89588/3,89648/3) | full | full |
| 3392 | semantic-utterance-003392 | "ん" | [1674282,1674522) | [1674282,1674522) | [89648/3,90368/3) | full | full |
| 3393 | semantic-utterance-003393 | "だ" | [1674522,1678945) | [1674522,1678945) | [90368/3,103637/3) | full | full |
| 3394 | semantic-utterance-003394 | "キ" | [1678945,1679085) | [1678945,1679085) | [103637/3,104057/3) | full | full |
| 3395 | semantic-utterance-003395 | "ー" | [1679085,1679206) | [1679085,1679206) | [104057/3,104420/3) | full | full |
| 3396 | semantic-utterance-003396 | "モ" | [1679206,1679226) | [1679206,1679226) | [104420/3,104480/3) | full | full |
| 3397 | semantic-utterance-003397 | "ー" | [1679226,1679486) | [1679226,1679486) | [104480/3,105260/3) | full | full |
| 3398 | semantic-utterance-003398 | "ド" | [1679486,1679626) | [1679486,1679626) | [105260/3,105680/3) | full | full |
| 3399 | semantic-utterance-003399 | "で" | [1679626,1679646) | [1679626,1679646) | [105680/3,105740/3) | full | full |
| 3400 | semantic-utterance-003400 | "や" | [1679646,1679666) | [1679646,1679666) | [105740/3,105800/3) | full | full |
| 3401 | semantic-utterance-003401 | "っ" | [1679666,1679746) | [1679666,1679746) | [105800/3,106040/3) | full | full |
| 3402 | semantic-utterance-003402 | "た" | [1679746,1679766) | [1679746,1679766) | [106040/3,106100/3) | full | full |
| 3403 | semantic-utterance-003403 | "え" | [1680130,1680150) | [1680130,1680150) | [107192/3,107252/3) | full | full |
| 3404 | semantic-utterance-003404 | "、" | [1680150,1680170) | [1680150,1680170) | [107252/3,107312/3) | full | full |
| 3405 | semantic-utterance-003405 | "な" | [1680170,1680290) | [1680170,1680290) | [107312/3,107672/3) | full | full |
| 3406 | semantic-utterance-003406 | "に" | [1680290,1680430) | [1680290,1680430) | [107672/3,108092/3) | full | full |
| 3407 | semantic-utterance-003407 | "?" | [1680430,1680550) | [1680430,1680550) | [108092/3,108452/3) | full | full |
| 3408 | semantic-utterance-003408 | "あ" | [1680550,1682051) | [1680550,1682051) | [108452/3,112955/3) | full | full |
| 3409 | semantic-utterance-003409 | "ー" | [1682051,1682071) | [1682051,1682071) | [112955/3,113015/3) | full | full |
| 3410 | semantic-utterance-003410 | "や" | [1682071,1682451) | [1682071,1682451) | [113015/3,114155/3) | full | full |
| 3411 | semantic-utterance-003411 | "ば" | [1682451,1682611) | [1682451,1682611) | [114155/3,114635/3) | full | full |
| 3412 | semantic-utterance-003412 | "い" | [1682611,1682631) | [1682611,1682631) | [114635/3,114695/3) | full | full |
| 3413 | semantic-utterance-003413 | "か" | [1682631,1682651) | [1682631,1682651) | [114695/3,114755/3) | full | full |
| 3414 | semantic-utterance-003414 | "も" | [1682651,1682671) | [1682651,1682671) | [114755/3,114815/3) | full | full |
| 3415 | semantic-utterance-003415 | "ー" | [1682671,1682691) | [1682671,1682691) | [114815/3,114875/3) | full | full |
| 3416 | semantic-utterance-003416 | "や" | [1682691,1682852) | [1682691,1682852) | [114875/3,115358/3) | full | full |
| 3417 | semantic-utterance-003417 | "ば" | [1682852,1682972) | [1682852,1682972) | [115358/3,115718/3) | full | full |
| 3418 | semantic-utterance-003418 | "い" | [1682972,1683272) | [1682972,1683272) | [115718/3,116618/3) | full | full |
| 3419 | semantic-utterance-003419 | "と" | [1683272,1683292) | [1683272,1683292) | [116618/3,116678/3) | full | full |
| 3420 | semantic-utterance-003420 | "こ" | [1683292,1683492) | [1683292,1683492) | [116678/3,117278/3) | full | full |
| 3421 | semantic-utterance-003421 | "見" | [1683492,1683512) | [1683492,1683512) | [117278/3,117338/3) | full | full |
| 3422 | semantic-utterance-003422 | "ち" | [1683512,1683532) | [1683512,1683532) | [117338/3,117398/3) | full | full |
| 3423 | semantic-utterance-003423 | "ゃ" | [1683532,1683552) | [1683532,1683552) | [117398/3,117458/3) | full | full |
| 3424 | semantic-utterance-003424 | "っ" | [1683552,1683672) | [1683552,1683672) | [117458/3,117818/3) | full | full |
| 3425 | semantic-utterance-003425 | "た" | [1683672,1683692) | [1683672,1683692) | [117818/3,117878/3) | full | full |
| 3426 | semantic-utterance-003426 | "?" | [1683692,1684012) | [1683692,1684012) | [117878/3,118838/3) | full | full |
| 3427 | semantic-utterance-003427 | "こ" | [1684012,1684032) | [1684012,1684032) | [118838/3,118898/3) | full | full |
| 3428 | semantic-utterance-003428 | "こ" | [1684032,1684172) | [1684032,1684172) | [118898/3,119318/3) | full | full |
| 3429 | semantic-utterance-003429 | "は" | [1684172,1684192) | [1684172,1684192) | [119318/3,119378/3) | full | full |
| 3430 | semantic-utterance-003430 | "薬" | [1684192,1684212) | [1684192,1684212) | [119378/3,119438/3) | full | full |
| 3431 | semantic-utterance-003431 | "品" | [1684212,1684332) | [1684212,1684332) | [119438/3,119798/3) | full | full |
| 3432 | semantic-utterance-003432 | "室" | [1684332,1684352) | [1684332,1684352) | [119798/3,119858/3) | full | full |
| 3433 | semantic-utterance-003433 | "の" | [1684352,1684372) | [1684352,1684372) | [119858/3,119918/3) | full | full |
| 3434 | semantic-utterance-003434 | "よ" | [1684372,1684392) | [1684372,1684392) | [119918/3,119978/3) | full | full |
| 3435 | semantic-utterance-003435 | "う" | [1684392,1684412) | [1684392,1684412) | [119978/3,120038/3) | full | full |
| 3436 | semantic-utterance-003436 | "だ" | [1684412,1684653) | [1684412,1684653) | [120038/3,120761/3) | full | full |
| 3437 | semantic-utterance-003437 | "痛" | [1684653,1685473) | [1684653,1685473) | [120761/3,123221/3) | full | full |
| 3438 | semantic-utterance-003438 | "み" | [1685473,1685493) | [1685473,1685493) | [123221/3,123281/3) | full | full |
| 3439 | semantic-utterance-003439 | "の" | [1685493,1685753) | [1685493,1685753) | [123281/3,124061/3) | full | full |
| 3440 | semantic-utterance-003440 | "実" | [1685753,1685773) | [1685753,1685773) | [124061/3,124121/3) | full | full |
| 3441 | semantic-utterance-003441 | "を" | [1685773,1685793) | [1685773,1685793) | [124121/3,124181/3) | full | full |
| 3442 | semantic-utterance-003442 | "見" | [1685793,1685813) | [1685793,1685813) | [124181/3,124241/3) | full | full |
| 3443 | semantic-utterance-003443 | "つ" | [1685813,1685833) | [1685813,1685833) | [124241/3,124301/3) | full | full |
| 3444 | semantic-utterance-003444 | "け" | [1685833,1686213) | [1685833,1686213) | [124301/3,125441/3) | full | full |
| 3445 | semantic-utterance-003445 | "る" | [1686213,1686233) | [1686213,1686233) | [125441/3,125501/3) | full | full |
| 3446 | semantic-utterance-003446 | "ー" | [1686233,1686253) | [1686233,1686253) | [125501/3,125561/3) | full | full |
| 3447 | semantic-utterance-003447 | "あ" | [1686253,1686274) | [1686253,1686274) | [125561/3,125624/3) | full | full |
| 3448 | semantic-utterance-003448 | "、" | [1686274,1686294) | [1686274,1686294) | [125624/3,125684/3) | full | full |
| 3449 | semantic-utterance-003449 | "オ" | [1686294,1687834) | [1686294,1687834) | [125684/3,130304/3) | full | full |
| 3450 | semantic-utterance-003450 | "ッ" | [1687834,1687854) | [1687834,1687854) | [130304/3,130364/3) | full | full |
| 3451 | semantic-utterance-003451 | "ケ" | [1687854,1687914) | [1687854,1687914) | [130364/3,130544/3) | full | full |
| 3452 | semantic-utterance-003452 | "ー" | [1687914,1687934) | [1687914,1687934) | [130544/3,130604/3) | full | full |
| 3453 | semantic-utterance-003453 | "オ" | [1687934,1688015) | [1687934,1688015) | [130604/3,130847/3) | full | full |
| 3454 | semantic-utterance-003454 | "ッ" | [1688015,1688035) | [1688015,1688035) | [130847/3,130907/3) | full | full |
| 3455 | semantic-utterance-003455 | "ケ" | [1688035,1688055) | [1688035,1688055) | [130907/3,130967/3) | full | full |
| 3456 | semantic-utterance-003456 | "ー" | [1688055,1688135) | [1688055,1688135) | [130967/3,131207/3) | full | full |
| 3457 | semantic-utterance-003457 | "こ" | [1688135,1688155) | [1688135,1688155) | [131207/3,131267/3) | full | full |
| 3458 | semantic-utterance-003458 | "こ" | [1688155,1688175) | [1688155,1688175) | [131267/3,131327/3) | full | full |
| 3459 | semantic-utterance-003459 | "で" | [1688175,1688235) | [1688175,1688235) | [131327/3,131507/3) | full | full |
| 3460 | semantic-utterance-003460 | "ね" | [1688235,1688355) | [1688235,1688355) | [131507/3,131867/3) | full | full |
| 3461 | semantic-utterance-003461 | "!" | [1688355,1688375) | [1688355,1688375) | [131867/3,131927/3) | full | full |
| 3462 | semantic-utterance-003462 | "だ" | [1688375,1688475) | [1688375,1688475) | [131927/3,132227/3) | full | full |
| 3463 | semantic-utterance-003463 | "か" | [1688475,1689776) | [1688475,1689776) | [132227/3,136130/3) | full | full |
| 3464 | semantic-utterance-003464 | "ら" | [1689776,1689796) | [1689776,1689796) | [136130/3,136190/3) | full | full |
| 3465 | semantic-utterance-003465 | "こ" | [1689796,1689956) | [1689796,1689956) | [136190/3,136670/3) | full | full |
| 3466 | semantic-utterance-003466 | "い" | [1689956,1689976) | [1689956,1689976) | [136670/3,136730/3) | full | full |
| 3467 | semantic-utterance-003467 | "つ" | [1689976,1690156) | [1689976,1690156) | [136730/3,137270/3) | full | full |
| 3468 | semantic-utterance-003468 | "に" | [1690156,1690176) | [1690156,1690176) | [137270/3,137330/3) | full | full |
| 3469 | semantic-utterance-003469 | "ー" | [1690176,1690276) | [1690176,1690276) | [137330/3,137630/3) | full | full |
| 3470 | semantic-utterance-003470 | "あ" | [1690276,1690416) | [1690276,1690416) | [137630/3,138050/3) | full | full |
| 3471 | semantic-utterance-003471 | "、" | [1690416,1690436) | [1690416,1690436) | [138050/3,138110/3) | full | full |
| 3472 | semantic-utterance-003472 | "こ" | [1690436,1690456) | [1690436,1690456) | [138110/3,138170/3) | full | full |
| 3473 | semantic-utterance-003473 | "れ" | [1690456,1690476) | [1690456,1690476) | [138170/3,138230/3) | full | full |
| 3474 | semantic-utterance-003474 | "じ" | [1690476,1690496) | [1690476,1690496) | [138230/3,138290/3) | full | full |
| 3475 | semantic-utterance-003475 | "ゃ" | [1690496,1690656) | [1690496,1690656) | [138290/3,138770/3) | full | full |
| 3476 | semantic-utterance-003476 | "ね" | [1690656,1694358) | [1690656,1694358) | [138770/3,149876/3) | full | full |
| 3477 | semantic-utterance-003477 | "?" | [1694358,1694378) | [1694358,1694378) | [149876/3,149936/3) | full | full |
| 3478 | semantic-utterance-003478 | "お" | [1694378,1694398) | [1694378,1694398) | [149936/3,149996/3) | full | full |
| 3479 | semantic-utterance-003479 | "ら" | [1694398,1694638) | [1694398,1694638) | [149996/3,150716/3) | full | full |
| 3480 | semantic-utterance-003480 | "ぁ" | [1694638,1694658) | [1694638,1694658) | [150716/3,150776/3) | full | full |
| 3481 | semantic-utterance-003481 | "!" | [1694658,1694678) | [1694658,1694678) | [150776/3,150836/3) | full | full |
| 3482 | semantic-utterance-003482 | "お" | [1694678,1695059) | [1694678,1695059) | [150836/3,151979/3) | full | full |
| 3483 | semantic-utterance-003483 | "ら" | [1695059,1695079) | [1695059,1695079) | [151979/3,152039/3) | full | full |
| 3484 | semantic-utterance-003484 | "ら" | [1695079,1695279) | [1695079,1695279) | [152039/3,152639/3) | full | full |
| 3485 | semantic-utterance-003485 | "ら" | [1695279,1695299) | [1695279,1695299) | [152639/3,152699/3) | full | full |
| 3486 | semantic-utterance-003486 | "ら" | [1695299,1700141) | [1695299,1700141) | [152699/3,167225/3) | full | full |
| 3487 | semantic-utterance-003487 | "ら" | [1700141,1700161) | [1700141,5100448/3) | [167225/3,55750) | partial | outside |

</details>

<details>
<summary>item-0002 / segment-0002 — 232 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 7254 | semantic-utterance-007254 | "い" | [4363406,4364146) | [4363416,4364146) | [167300/3,169490/3) | partial | full |
| 7255 | semantic-utterance-007255 | "る" | [4364146,4364166) | [4364146,4364166) | [169490/3,169550/3) | full | full |
| 7256 | semantic-utterance-007256 | "ド" | [4364166,4364466) | [4364166,4364466) | [169550/3,170450/3) | full | full |
| 7257 | semantic-utterance-007257 | "ア" | [4364466,4364786) | [4364466,4364786) | [170450/3,171410/3) | full | full |
| 7258 | semantic-utterance-007258 | "に" | [4364786,4364806) | [4364786,4364806) | [171410/3,171470/3) | full | full |
| 7259 | semantic-utterance-007259 | "電" | [4364806,4364826) | [4364806,4364826) | [171470/3,171530/3) | full | full |
| 7260 | semantic-utterance-007260 | "気" | [4364826,4364846) | [4364826,4364846) | [171530/3,171590/3) | full | full |
| 7261 | semantic-utterance-007261 | "が" | [4364846,4364926) | [4364846,4364926) | [171590/3,171830/3) | full | full |
| 7262 | semantic-utterance-007262 | "通" | [4364926,4365386) | [4364926,4365386) | [171830/3,173210/3) | full | full |
| 7263 | semantic-utterance-007263 | "っ" | [4365386,4365406) | [4365386,4365406) | [173210/3,173270/3) | full | full |
| 7264 | semantic-utterance-007264 | "て" | [4365406,4365426) | [4365406,4365426) | [173270/3,173330/3) | full | full |
| 7265 | semantic-utterance-007265 | "な" | [4365426,4365546) | [4365426,4365546) | [173330/3,173690/3) | full | full |
| 7266 | semantic-utterance-007266 | "い" | [4365546,4365646) | [4365546,4365646) | [173690/3,173990/3) | full | full |
| 7267 | semantic-utterance-007267 | "金" | [4365646,4365666) | [4365646,4365666) | [173990/3,174050/3) | full | full |
| 7268 | semantic-utterance-007268 | "庫" | [4365666,4365806) | [4365666,4365806) | [174050/3,174470/3) | full | full |
| 7269 | semantic-utterance-007269 | "は" | [4365806,4365826) | [4365806,4365826) | [174470/3,174530/3) | full | full |
| 7270 | semantic-utterance-007270 | "危" | [4365826,4365846) | [4365826,4365846) | [174530/3,174590/3) | full | full |
| 7271 | semantic-utterance-007271 | "険" | [4365846,4365866) | [4365846,4365866) | [174590/3,174650/3) | full | full |
| 7272 | semantic-utterance-007272 | "だ" | [4365866,4365986) | [4365866,4365986) | [174650/3,175010/3) | full | full |
| 7273 | semantic-utterance-007273 | "な" | [4365986,4366006) | [4365986,4366006) | [175010/3,175070/3) | full | full |
| 7274 | semantic-utterance-007274 | "ん" | [4366006,4366026) | [4366006,4366026) | [175070/3,175130/3) | full | full |
| 7275 | semantic-utterance-007275 | "と" | [4366026,4366046) | [4366026,4366046) | [175130/3,175190/3) | full | full |
| 7276 | semantic-utterance-007276 | "か" | [4366046,4366146) | [4366046,4366146) | [175190/3,175490/3) | full | full |
| 7277 | semantic-utterance-007277 | "し" | [4366146,4366166) | [4366146,4366166) | [175490/3,175550/3) | full | full |
| 7278 | semantic-utterance-007278 | "て" | [4366166,4366246) | [4366166,4366246) | [175550/3,175790/3) | full | full |
| 7279 | semantic-utterance-007279 | "中" | [4366246,4366666) | [4366246,4366666) | [175790/3,177050/3) | full | full |
| 7280 | semantic-utterance-007280 | "に" | [4366666,4366686) | [4366666,4366686) | [177050/3,177110/3) | full | full |
| 7281 | semantic-utterance-007281 | "入" | [4366686,4366706) | [4366686,4366706) | [177110/3,177170/3) | full | full |
| 7282 | semantic-utterance-007282 | "ら" | [4366706,4366726) | [4366706,4366726) | [177170/3,177230/3) | full | full |
| 7283 | semantic-utterance-007283 | "な" | [4366726,4366746) | [4366726,4366746) | [177230/3,177290/3) | full | full |
| 7284 | semantic-utterance-007284 | "い" | [4366746,4366827) | [4366746,4366827) | [177290/3,177533/3) | full | full |
| 7285 | semantic-utterance-007285 | "と" | [4366827,4366847) | [4366827,4366847) | [177533/3,177593/3) | full | full |
| 7286 | semantic-utterance-007286 | "で" | [4366847,4366867) | [4366847,4366867) | [177593/3,177653/3) | full | full |
| 7287 | semantic-utterance-007287 | "も" | [4366867,4366887) | [4366867,4366887) | [177653/3,177713/3) | full | full |
| 7288 | semantic-utterance-007288 | "赤" | [4366887,4367127) | [4366887,4367127) | [177713/3,178433/3) | full | full |
| 7289 | semantic-utterance-007289 | "ち" | [4367127,4367147) | [4367127,4367147) | [178433/3,178493/3) | full | full |
| 7290 | semantic-utterance-007290 | "ゃ" | [4367147,4367267) | [4367147,4367267) | [178493/3,178853/3) | full | full |
| 7291 | semantic-utterance-007291 | "ん" | [4367267,4367287) | [4367267,4367287) | [178853/3,178913/3) | full | full |
| 7292 | semantic-utterance-007292 | "ど" | [4367287,4367507) | [4367287,4367507) | [178913/3,179573/3) | full | full |
| 7293 | semantic-utterance-007293 | "こ" | [4367507,4369287) | [4367507,4369287) | [179573/3,184913/3) | full | full |
| 7294 | semantic-utterance-007294 | "し" | [4369287,4370388) | [4369287,4370388) | [184913/3,188216/3) | full | full |
| 7295 | semantic-utterance-007295 | "ま" | [4370388,4370728) | [4370388,4370728) | [188216/3,189236/3) | full | full |
| 7296 | semantic-utterance-007296 | "っ" | [4370728,4370988) | [4370728,4370988) | [189236/3,190016/3) | full | full |
| 7297 | semantic-utterance-007297 | "た" | [4370988,4371008) | [4370988,4371008) | [190016/3,190076/3) | full | full |
| 7298 | semantic-utterance-007298 | "ん" | [4371008,4371268) | [4371008,4371268) | [190076/3,190856/3) | full | full |
| 7299 | semantic-utterance-007299 | "こ" | [4371268,4371568) | [4371268,4371568) | [190856/3,191756/3) | full | full |
| 7300 | semantic-utterance-007300 | "の" | [4371568,4371888) | [4371568,4371888) | [191756/3,192716/3) | full | full |
| 7301 | semantic-utterance-007301 | "子" | [4371888,4371908) | [4371888,4371908) | [192716/3,192776/3) | full | full |
| 7302 | semantic-utterance-007302 | "ペ" | [4371908,4371928) | [4371908,4371928) | [192776/3,192836/3) | full | full |
| 7303 | semantic-utterance-007303 | "コ" | [4371928,4372108) | [4371928,4372108) | [192836/3,193376/3) | full | full |
| 7304 | semantic-utterance-007304 | "ー" | [4372108,4372128) | [4372108,4372128) | [193376/3,193436/3) | full | full |
| 7305 | semantic-utterance-007305 | "ラ" | [4372128,4372248) | [4372128,4372248) | [193436/3,193796/3) | full | full |
| 7306 | semantic-utterance-007306 | "は" | [4372248,4372808) | [4372248,4372808) | [193796/3,195476/3) | full | full |
| 7307 | semantic-utterance-007307 | "一" | [4372808,4373048) | [4372808,4373048) | [195476/3,196196/3) | full | full |
| 7308 | semantic-utterance-007308 | "番" | [4373048,4376309) | [4373048,4376309) | [196196/3,205979/3) | full | full |
| 7309 | semantic-utterance-007309 | "大" | [4376309,4376329) | [4376309,4376329) | [205979/3,206039/3) | full | full |
| 7310 | semantic-utterance-007310 | "事" | [4376329,4376349) | [4376329,4376349) | [206039/3,206099/3) | full | full |
| 7311 | semantic-utterance-007311 | "や" | [4376349,4376629) | [4376349,4376629) | [206099/3,206939/3) | full | full |
| 7312 | semantic-utterance-007312 | "ぞ" | [4376629,4376649) | [4376629,4376649) | [206939/3,206999/3) | full | full |
| 7313 | semantic-utterance-007313 | "う" | [4376649,4379050) | [4376649,4379050) | [206999/3,214202/3) | full | full |
| 7314 | semantic-utterance-007314 | "わ" | [4379050,4379070) | [4379050,4379070) | [214202/3,214262/3) | full | full |
| 7315 | semantic-utterance-007315 | "っ" | [4379070,4379090) | [4379070,4379090) | [214262/3,214322/3) | full | full |
| 7316 | semantic-utterance-007316 | "こ" | [4389098,4389118) | [4389098,4389118) | [244346/3,244406/3) | full | full |
| 7317 | semantic-utterance-007317 | "こ" | [4389118,4389238) | [4389118,4389238) | [244406/3,244766/3) | full | full |
| 7318 | semantic-utterance-007318 | "か" | [4389238,4389338) | [4389238,4389338) | [244766/3,245066/3) | full | full |
| 7319 | semantic-utterance-007319 | "ら" | [4389338,4389498) | [4389338,4389498) | [245066/3,245546/3) | full | full |
| 7320 | semantic-utterance-007320 | "出" | [4389498,4389599) | [4389498,4389599) | [245546/3,245849/3) | full | full |
| 7321 | semantic-utterance-007321 | "ら" | [4389599,4389699) | [4389599,4389699) | [245849/3,246149/3) | full | full |
| 7322 | semantic-utterance-007322 | "れ" | [4389699,4389839) | [4389699,4389839) | [246149/3,246569/3) | full | full |
| 7323 | semantic-utterance-007323 | "な" | [4389839,4389939) | [4389839,4389939) | [246569/3,246869/3) | full | full |
| 7324 | semantic-utterance-007324 | "い" | [4389939,4390179) | [4389939,4390179) | [246869/3,247589/3) | full | full |
| 7325 | semantic-utterance-007325 | "お" | [4390179,4390279) | [4390179,4390279) | [247589/3,247889/3) | full | full |
| 7326 | semantic-utterance-007326 | "そ" | [4390279,4390359) | [4390279,4390359) | [247889/3,248129/3) | full | full |
| 7327 | semantic-utterance-007327 | "ら" | [4390359,4390560) | [4390359,4390560) | [248129/3,248732/3) | full | full |
| 7328 | semantic-utterance-007328 | "く" | [4390560,4390580) | [4390560,4390580) | [248732/3,248792/3) | full | full |
| 7329 | semantic-utterance-007329 | "こ" | [4390580,4390600) | [4390580,4390600) | [248792/3,248852/3) | full | full |
| 7330 | semantic-utterance-007330 | "こ" | [4390600,4390920) | [4390600,4390920) | [248852/3,249812/3) | full | full |
| 7331 | semantic-utterance-007331 | "が" | [4390920,4390940) | [4390920,4390940) | [249812/3,249872/3) | full | full |
| 7332 | semantic-utterance-007332 | "終" | [4390940,4391160) | [4390940,4391160) | [249872/3,250532/3) | full | full |
| 7333 | semantic-utterance-007333 | "着" | [4391160,4391380) | [4391160,4391380) | [250532/3,251192/3) | full | full |
| 7334 | semantic-utterance-007334 | "点" | [4391380,4391521) | [4391380,4391521) | [251192/3,251615/3) | full | full |
| 7335 | semantic-utterance-007335 | "な" | [4391521,4391541) | [4391521,4391541) | [251615/3,251675/3) | full | full |
| 7336 | semantic-utterance-007336 | "の" | [4391541,4391701) | [4391541,4391701) | [251675/3,252155/3) | full | full |
| 7337 | semantic-utterance-007337 | "だ" | [4391701,4391801) | [4391701,4391801) | [252155/3,252455/3) | full | full |
| 7338 | semantic-utterance-007338 | "ろ" | [4391801,4391881) | [4391801,4391881) | [252455/3,252695/3) | full | full |
| 7339 | semantic-utterance-007339 | "う" | [4391881,4392442) | [4391881,4392442) | [252695/3,254378/3) | full | full |
| 7340 | semantic-utterance-007340 | "す" | [4392442,4392542) | [4392442,4392542) | [254378/3,254678/3) | full | full |
| 7341 | semantic-utterance-007341 | "べ" | [4392542,4392682) | [4392542,4392682) | [254678/3,255098/3) | full | full |
| 7342 | semantic-utterance-007342 | "て" | [4392682,4392742) | [4392682,4392742) | [255098/3,255278/3) | full | full |
| 7343 | semantic-utterance-007343 | "を" | [4392742,4392982) | [4392742,4392982) | [255278/3,255998/3) | full | full |
| 7344 | semantic-utterance-007344 | "受" | [4392982,4393202) | [4392982,4393202) | [255998/3,256658/3) | full | full |
| 7345 | semantic-utterance-007345 | "け" | [4393202,4393242) | [4393202,4393242) | [256658/3,256778/3) | full | full |
| 7346 | semantic-utterance-007346 | "入" | [4393242,4393262) | [4393242,4393262) | [256778/3,256838/3) | full | full |
| 7347 | semantic-utterance-007347 | "れ" | [4393262,4393383) | [4393262,4393383) | [256838/3,257201/3) | full | full |
| 7348 | semantic-utterance-007348 | "よ" | [4393383,4393403) | [4393383,4393403) | [257201/3,257261/3) | full | full |
| 7349 | semantic-utterance-007349 | "う" | [4393403,4393583) | [4393403,4393583) | [257261/3,257801/3) | full | full |
| 7350 | semantic-utterance-007350 | "と" | [4393583,4393783) | [4393583,4393783) | [257801/3,258401/3) | full | full |
| 7351 | semantic-utterance-007351 | "思" | [4393783,4393903) | [4393783,4393903) | [258401/3,258761/3) | full | full |
| 7352 | semantic-utterance-007352 | "っ" | [4393903,4394123) | [4393903,4394123) | [258761/3,259421/3) | full | full |
| 7353 | semantic-utterance-007353 | "た" | [4394123,4394143) | [4394123,4394143) | [259421/3,259481/3) | full | full |
| 7354 | semantic-utterance-007354 | "時" | [4394143,4394584) | [4394143,4394584) | [259481/3,260804/3) | full | full |
| 7355 | semantic-utterance-007355 | "不" | [4394584,4394684) | [4394584,4394684) | [260804/3,261104/3) | full | full |
| 7356 | semantic-utterance-007356 | "思" | [4394684,4394804) | [4394684,4394804) | [261104/3,261464/3) | full | full |
| 7357 | semantic-utterance-007357 | "議" | [4394804,4394924) | [4394804,4394924) | [261464/3,261824/3) | full | full |
| 7358 | semantic-utterance-007358 | "と" | [4394924,4395305) | [4394924,4395305) | [261824/3,262967/3) | full | full |
| 7359 | semantic-utterance-007359 | "気" | [4395305,4395425) | [4395305,4395425) | [262967/3,263327/3) | full | full |
| 7360 | semantic-utterance-007360 | "持" | [4395425,4395565) | [4395425,4395565) | [263327/3,263747/3) | full | full |
| 7361 | semantic-utterance-007361 | "ち" | [4395565,4395645) | [4395565,4395645) | [263747/3,263987/3) | full | full |
| 7362 | semantic-utterance-007362 | "が" | [4395645,4396045) | [4395645,4396045) | [263987/3,265187/3) | full | full |
| 7363 | semantic-utterance-007363 | "軽" | [4396045,4396065) | [4396045,4396065) | [265187/3,265247/3) | full | full |
| 7364 | semantic-utterance-007364 | "く" | [4396065,4396125) | [4396065,4396125) | [265247/3,265427/3) | full | full |
| 7365 | semantic-utterance-007365 | "な" | [4396125,4396185) | [4396125,4396185) | [265427/3,265607/3) | full | full |
| 7366 | semantic-utterance-007366 | "っ" | [4396185,4396346) | [4396185,4396346) | [265607/3,266090/3) | full | full |
| 7367 | semantic-utterance-007367 | "た" | [4396346,4396926) | [4396346,4396926) | [266090/3,267830/3) | full | full |
| 7368 | semantic-utterance-007368 | "も" | [4396926,4397046) | [4396926,4397046) | [267830/3,268190/3) | full | full |
| 7369 | semantic-utterance-007369 | "う" | [4397046,4397167) | [4397046,4397167) | [268190/3,268553/3) | full | full |
| 7370 | semantic-utterance-007370 | "ひ" | [4397167,4397567) | [4397167,4397567) | [268553/3,269753/3) | full | full |
| 7371 | semantic-utterance-007371 | "ど" | [4397567,4397587) | [4397567,4397587) | [269753/3,269813/3) | full | full |
| 7372 | semantic-utterance-007372 | "く" | [4397587,4397707) | [4397587,4397707) | [269813/3,270173/3) | full | full |
| 7373 | semantic-utterance-007373 | "疲" | [4397707,4397727) | [4397707,4397727) | [270173/3,270233/3) | full | full |
| 7374 | semantic-utterance-007374 | "れ" | [4397727,4397747) | [4397727,4397747) | [270233/3,270293/3) | full | full |
| 7375 | semantic-utterance-007375 | "て" | [4397747,4397807) | [4397747,4397807) | [270293/3,270473/3) | full | full |
| 7376 | semantic-utterance-007376 | "し" | [4397807,4397887) | [4397807,4397887) | [270473/3,270713/3) | full | full |
| 7377 | semantic-utterance-007377 | "ま" | [4397887,4398067) | [4397887,4398067) | [270713/3,271253/3) | full | full |
| 7378 | semantic-utterance-007378 | "っ" | [4398067,4398087) | [4398067,4398087) | [271253/3,271313/3) | full | full |
| 7379 | semantic-utterance-007379 | "た" | [4398087,4398188) | [4398087,4398188) | [271313/3,271616/3) | full | full |
| 7380 | semantic-utterance-007380 | "し" | [4398188,4398688) | [4398188,4398688) | [271616/3,273116/3) | full | full |
| 7381 | semantic-utterance-007381 | "薬" | [4398688,4398868) | [4398688,4398868) | [273116/3,273656/3) | full | full |
| 7382 | semantic-utterance-007382 | "の" | [4398868,4398968) | [4398868,4398968) | [273656/3,273956/3) | full | full |
| 7383 | semantic-utterance-007383 | "効" | [4398968,4399069) | [4398968,4399069) | [273956/3,274259/3) | full | full |
| 7384 | semantic-utterance-007384 | "き" | [4399069,4399189) | [4399069,4399189) | [274259/3,274619/3) | full | full |
| 7385 | semantic-utterance-007385 | "目" | [4399189,4399209) | [4399189,4399209) | [274619/3,274679/3) | full | full |
| 7386 | semantic-utterance-007386 | "も" | [4399209,4399369) | [4399209,4399369) | [274679/3,275159/3) | full | full |
| 7387 | semantic-utterance-007387 | "切" | [4399369,4399469) | [4399369,4399469) | [275159/3,275459/3) | full | full |
| 7388 | semantic-utterance-007388 | "れ" | [4399469,4399569) | [4399469,4399569) | [275459/3,275759/3) | full | full |
| 7389 | semantic-utterance-007389 | "か" | [4399569,4399649) | [4399569,4399649) | [275759/3,275999/3) | full | full |
| 7390 | semantic-utterance-007390 | "け" | [4399649,4399749) | [4399649,4399749) | [275999/3,276299/3) | full | full |
| 7391 | semantic-utterance-007391 | "て" | [4399749,4399769) | [4399749,4399769) | [276299/3,276359/3) | full | full |
| 7392 | semantic-utterance-007392 | "い" | [4399769,4399909) | [4399769,4399909) | [276359/3,276779/3) | full | full |
| 7393 | semantic-utterance-007393 | "る" | [4399909,4400430) | [4399909,4400430) | [276779/3,278342/3) | full | full |
| 7394 | semantic-utterance-007394 | "元" | [4400430,4400570) | [4400430,4400570) | [278342/3,278762/3) | full | full |
| 7395 | semantic-utterance-007395 | "の" | [4400570,4400750) | [4400570,4400750) | [278762/3,279302/3) | full | full |
| 7396 | semantic-utterance-007396 | "世" | [4400750,4400910) | [4400750,4400910) | [279302/3,279782/3) | full | full |
| 7397 | semantic-utterance-007397 | "界" | [4400910,4401071) | [4400910,4401071) | [279782/3,280265/3) | full | full |
| 7398 | semantic-utterance-007398 | "に" | [4401071,4401151) | [4401071,4401151) | [280265/3,280505/3) | full | full |
| 7399 | semantic-utterance-007399 | "は" | [4401151,4401271) | [4401151,4401271) | [280505/3,280865/3) | full | full |
| 7400 | semantic-utterance-007400 | "未" | [4401271,4401291) | [4401271,4401291) | [280865/3,280925/3) | full | full |
| 7401 | semantic-utterance-007401 | "練" | [4401291,4401531) | [4401291,4401531) | [280925/3,281645/3) | full | full |
| 7402 | semantic-utterance-007402 | "な" | [4401531,4401631) | [4401531,4401631) | [281645/3,281945/3) | full | full |
| 7403 | semantic-utterance-007403 | "ど" | [4401631,4401851) | [4401631,4401851) | [281945/3,282605/3) | full | full |
| 7404 | semantic-utterance-007404 | "何" | [4401851,4401952) | [4401851,4401952) | [282605/3,282908/3) | full | full |
| 7405 | semantic-utterance-007405 | "も" | [4401952,4402072) | [4401952,4402072) | [282908/3,283268/3) | full | full |
| 7406 | semantic-utterance-007406 | "な" | [4402072,4402092) | [4402072,4402092) | [283268/3,283328/3) | full | full |
| 7407 | semantic-utterance-007407 | "い" | [4402092,4402672) | [4402092,4402672) | [283328/3,285068/3) | full | full |
| 7408 | semantic-utterance-007408 | "私" | [4402672,4402832) | [4402672,4402832) | [285068/3,285548/3) | full | full |
| 7409 | semantic-utterance-007409 | "は" | [4402832,4402993) | [4402832,4402993) | [285548/3,286031/3) | full | full |
| 7410 | semantic-utterance-007410 | "最" | [4402993,4403153) | [4402993,4403153) | [286031/3,286511/3) | full | full |
| 7411 | semantic-utterance-007411 | "初" | [4403153,4403313) | [4403153,4403313) | [286511/3,286991/3) | full | full |
| 7412 | semantic-utterance-007412 | "か" | [4403313,4403333) | [4403313,4403333) | [286991/3,287051/3) | full | full |
| 7413 | semantic-utterance-007413 | "ら" | [4403333,4403453) | [4403333,4403453) | [287051/3,287411/3) | full | full |
| 7414 | semantic-utterance-007414 | "一" | [4403453,4403553) | [4403453,4403553) | [287411/3,287711/3) | full | full |
| 7415 | semantic-utterance-007415 | "人" | [4403553,4403653) | [4403553,4403653) | [287711/3,288011/3) | full | full |
| 7416 | semantic-utterance-007416 | "っ" | [4403653,4403773) | [4403653,4403773) | [288011/3,288371/3) | full | full |
| 7417 | semantic-utterance-007417 | "き" | [4403773,4403894) | [4403773,4403894) | [288371/3,288734/3) | full | full |
| 7418 | semantic-utterance-007418 | "り" | [4403894,4403914) | [4403894,4403914) | [288734/3,288794/3) | full | full |
| 7419 | semantic-utterance-007419 | "だ" | [4403914,4403934) | [4403914,4403934) | [288794/3,288854/3) | full | full |
| 7420 | semantic-utterance-007420 | "っ" | [4403934,4403954) | [4403934,4403954) | [288854/3,288914/3) | full | full |
| 7421 | semantic-utterance-007421 | "た" | [4403954,4404054) | [4403954,4404054) | [288914/3,289214/3) | full | full |
| 7422 | semantic-utterance-007422 | "の" | [4404054,4404074) | [4404054,4404074) | [289214/3,289274/3) | full | full |
| 7423 | semantic-utterance-007423 | "だ" | [4404074,4404314) | [4404074,4404314) | [289274/3,289994/3) | full | full |
| 7424 | semantic-utterance-007424 | "か" | [4404314,4404394) | [4404314,4404394) | [289994/3,290234/3) | full | full |
| 7425 | semantic-utterance-007425 | "ら" | [4404394,4404895) | [4404394,4404895) | [290234/3,291737/3) | full | full |
| 7426 | semantic-utterance-007426 | "け" | [4404895,4405035) | [4404895,4405035) | [291737/3,292157/3) | full | full |
| 7427 | semantic-utterance-007427 | "れ" | [4405035,4405075) | [4405035,4405075) | [292157/3,292277/3) | full | full |
| 7428 | semantic-utterance-007428 | "ど" | [4405075,4405155) | [4405075,4405155) | [292277/3,292517/3) | full | full |
| 7429 | semantic-utterance-007429 | "こ" | [4405155,4405295) | [4405155,4405295) | [292517/3,292937/3) | full | full |
| 7430 | semantic-utterance-007430 | "こ" | [4405295,4405375) | [4405295,4405375) | [292937/3,293177/3) | full | full |
| 7431 | semantic-utterance-007431 | "で" | [4405375,4405495) | [4405375,4405495) | [293177/3,293537/3) | full | full |
| 7432 | semantic-utterance-007432 | "は" | [4405495,4405575) | [4405495,4405575) | [293537/3,293777/3) | full | full |
| 7433 | semantic-utterance-007433 | "あ" | [4405575,4405635) | [4405575,4405635) | [293777/3,293957/3) | full | full |
| 7434 | semantic-utterance-007434 | "る" | [4405635,4405756) | [4405635,4405756) | [293957/3,294320/3) | full | full |
| 7435 | semantic-utterance-007435 | "種" | [4405756,4405896) | [4405756,4405896) | [294320/3,294740/3) | full | full |
| 7436 | semantic-utterance-007436 | "の" | [4405896,4406096) | [4405896,4406096) | [294740/3,295340/3) | full | full |
| 7437 | semantic-utterance-007437 | "安" | [4406096,4406316) | [4406096,4406316) | [295340/3,296000/3) | full | full |
| 7438 | semantic-utterance-007438 | "ら" | [4406316,4406456) | [4406316,4406456) | [296000/3,296420/3) | full | full |
| 7439 | semantic-utterance-007439 | "ぎ" | [4406456,4406536) | [4406456,4406536) | [296420/3,296660/3) | full | full |
| 7440 | semantic-utterance-007440 | "を" | [4406536,4406616) | [4406536,4406616) | [296660/3,296900/3) | full | full |
| 7441 | semantic-utterance-007441 | "見" | [4406616,4406697) | [4406616,4406697) | [296900/3,297143/3) | full | full |
| 7442 | semantic-utterance-007442 | "つ" | [4406697,4406797) | [4406697,4406797) | [297143/3,297443/3) | full | full |
| 7443 | semantic-utterance-007443 | "け" | [4406797,4406857) | [4406797,4406857) | [297443/3,297623/3) | full | full |
| 7444 | semantic-utterance-007444 | "る" | [4406857,4406957) | [4406857,4406957) | [297623/3,297923/3) | full | full |
| 7445 | semantic-utterance-007445 | "こ" | [4406957,4407037) | [4406957,4407037) | [297923/3,298163/3) | full | full |
| 7446 | semantic-utterance-007446 | "と" | [4407037,4407057) | [4407037,4407057) | [298163/3,298223/3) | full | full |
| 7447 | semantic-utterance-007447 | "が" | [4407057,4407217) | [4407057,4407217) | [298223/3,298703/3) | full | full |
| 7448 | semantic-utterance-007448 | "で" | [4407217,4407297) | [4407217,4407297) | [298703/3,298943/3) | full | full |
| 7449 | semantic-utterance-007449 | "き" | [4407297,4407397) | [4407297,4407397) | [298943/3,299243/3) | full | full |
| 7450 | semantic-utterance-007450 | "た" | [4407397,4408038) | [4407397,4408038) | [299243/3,301166/3) | full | full |
| 7451 | semantic-utterance-007451 | "彼" | [4408038,4408258) | [4408038,4408258) | [301166/3,301826/3) | full | full |
| 7452 | semantic-utterance-007452 | "女" | [4408258,4408438) | [4408258,4408438) | [301826/3,302366/3) | full | full |
| 7453 | semantic-utterance-007453 | "は" | [4408438,4408538) | [4408438,4408538) | [302366/3,302666/3) | full | full |
| 7454 | semantic-utterance-007454 | "私" | [4408538,4408599) | [4408538,4408599) | [302666/3,302849/3) | full | full |
| 7455 | semantic-utterance-007455 | "の" | [4408599,4408619) | [4408599,4408619) | [302849/3,302909/3) | full | full |
| 7456 | semantic-utterance-007456 | "過" | [4408619,4408939) | [4408619,4408939) | [302909/3,303869/3) | full | full |
| 7457 | semantic-utterance-007457 | "ち" | [4408939,4408999) | [4408939,4408999) | [303869/3,304049/3) | full | full |
| 7458 | semantic-utterance-007458 | "を" | [4408999,4409079) | [4408999,4409079) | [304049/3,304289/3) | full | full |
| 7459 | semantic-utterance-007459 | "責" | [4409079,4409159) | [4409079,4409159) | [304289/3,304529/3) | full | full |
| 7460 | semantic-utterance-007460 | "め" | [4409159,4409259) | [4409159,4409259) | [304529/3,304829/3) | full | full |
| 7461 | semantic-utterance-007461 | "る" | [4409259,4409359) | [4409259,4409359) | [304829/3,305129/3) | full | full |
| 7462 | semantic-utterance-007462 | "こ" | [4409359,4409459) | [4409359,4409459) | [305129/3,305429/3) | full | full |
| 7463 | semantic-utterance-007463 | "と" | [4409459,4409540) | [4409459,4409540) | [305429/3,305672/3) | full | full |
| 7464 | semantic-utterance-007464 | "も" | [4409540,4409640) | [4409540,4409640) | [305672/3,305972/3) | full | full |
| 7465 | semantic-utterance-007465 | "な" | [4409640,4409800) | [4409640,4409800) | [305972/3,306452/3) | full | full |
| 7466 | semantic-utterance-007466 | "く" | [4409800,4409820) | [4409800,4409820) | [306452/3,306512/3) | full | full |
| 7467 | semantic-utterance-007467 | "何" | [4410322,4410362) | [4410322,4410362) | [308018/3,308138/3) | full | full |
| 7468 | semantic-utterance-007468 | "?" | [4410362,4410422) | [4410362,4410422) | [308138/3,308318/3) | full | full |
| 7469 | semantic-utterance-007469 | "バ" | [4410422,4410442) | [4410422,4410442) | [308318/3,308378/3) | full | full |
| 7470 | semantic-utterance-007470 | "ケ" | [4410442,4410542) | [4410442,4410542) | [308378/3,308678/3) | full | full |
| 7471 | semantic-utterance-007471 | "モ" | [4410542,4410642) | [4410542,4410642) | [308678/3,308978/3) | full | full |
| 7472 | semantic-utterance-007472 | "ノ" | [4410642,4410822) | [4410642,4410822) | [308978/3,309518/3) | full | full |
| 7473 | semantic-utterance-007473 | "肯" | [4410822,4411082) | [4410822,4411082) | [309518/3,310298/3) | full | full |
| 7474 | semantic-utterance-007474 | "定" | [4411082,4411102) | [4411082,4411102) | [310298/3,310358/3) | full | full |
| 7475 | semantic-utterance-007475 | "派" | [4411102,4411423) | [4411102,4411423) | [310358/3,311321/3) | full | full |
| 7476 | semantic-utterance-007476 | "が" | [4411423,4411583) | [4411423,4411583) | [311321/3,311801/3) | full | full |
| 7477 | semantic-utterance-007477 | "い" | [4411583,4411603) | [4411583,4411603) | [311801/3,311861/3) | full | full |
| 7478 | semantic-utterance-007478 | "る" | [4411603,4411783) | [4411603,4411783) | [311861/3,312401/3) | full | full |
| 7479 | semantic-utterance-007479 | "ん" | [4411783,4411803) | [4411783,4411803) | [312401/3,312461/3) | full | full |
| 7480 | semantic-utterance-007480 | "?" | [4411803,4412003) | [4411803,4412003) | [312461/3,313061/3) | full | full |
| 7481 | semantic-utterance-007481 | "え" | [4412003,4412363) | [4412003,4412363) | [313061/3,314141/3) | full | full |
| 7482 | semantic-utterance-007482 | "、" | [4412363,4412804) | [4412363,4412804) | [314141/3,315464/3) | full | full |
| 7483 | semantic-utterance-007483 | "こ" | [4412804,4413844) | [4412804,4413844) | [315464/3,318584/3) | full | full |
| 7484 | semantic-utterance-007484 | "こ" | [4413844,4414164) | [4413844,4414164) | [318584/3,319544/3) | full | full |
| 7485 | semantic-utterance-007485 | "が" | [4414164,4414184) | [4414164,13242548/3) | [319544/3,319600/3) | partial | outside |

</details>

<details>
<summary>item-0003 / segment-0001 — 187 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 3486 | semantic-utterance-003486 | "ら" | [1695299,1700141) | [5085898/3,1700141) | [0,14525/3) | partial | full |
| 3487 | semantic-utterance-003487 | "ら" | [1700141,1700161) | [1700141,1700161) | [14525/3,14585/3) | full | full |
| 3488 | semantic-utterance-003488 | "!" | [1700161,1700181) | [1700161,1700181) | [14585/3,14645/3) | full | full |
| 3489 | semantic-utterance-003489 | "え" | [1700181,1701842) | [1700181,1701842) | [14645/3,19628/3) | full | full |
| 3490 | semantic-utterance-003490 | "、" | [1701842,1702003) | [1701842,1702003) | [19628/3,20111/3) | full | full |
| 3491 | semantic-utterance-003491 | "一" | [1702003,1702023) | [1702003,1702023) | [20111/3,20171/3) | full | full |
| 3492 | semantic-utterance-003492 | "体" | [1702023,1706785) | [1702023,1706785) | [20171/3,34457/3) | full | full |
| 3493 | semantic-utterance-003493 | "だ" | [1706785,1707306) | [1706785,1707306) | [34457/3,36020/3) | full | full |
| 3494 | semantic-utterance-003494 | "け" | [1707306,1708026) | [1707306,1708026) | [36020/3,38180/3) | full | full |
| 3495 | semantic-utterance-003495 | "?" | [1708026,1708046) | [1708026,1708046) | [38180/3,38240/3) | full | full |
| 3496 | semantic-utterance-003496 | "な" | [1711210,1711470) | [1711210,1711470) | [47732/3,48512/3) | full | full |
| 3497 | semantic-utterance-003497 | "ん" | [1711470,1714772) | [1711470,1714772) | [48512/3,58418/3) | full | full |
| 3498 | semantic-utterance-003498 | "か" | [1714772,1715072) | [1714772,1715072) | [58418/3,59318/3) | full | full |
| 3499 | semantic-utterance-003499 | "こ" | [1715072,1715272) | [1715072,1715272) | [59318/3,59918/3) | full | full |
| 3500 | semantic-utterance-003500 | "れ" | [1715272,1715392) | [1715272,1715392) | [59918/3,60278/3) | full | full |
| 3501 | semantic-utterance-003501 | "子" | [1715392,1715412) | [1715392,1715412) | [60278/3,60338/3) | full | full |
| 3502 | semantic-utterance-003502 | "供" | [1715412,1715452) | [1715412,1715452) | [60338/3,60458/3) | full | full |
| 3503 | semantic-utterance-003503 | "だ" | [1715452,1715472) | [1715452,1715472) | [60458/3,60518/3) | full | full |
| 3504 | semantic-utterance-003504 | "と" | [1715472,1715492) | [1715472,1715492) | [60518/3,60578/3) | full | full |
| 3505 | semantic-utterance-003505 | "思" | [1715492,1715512) | [1715492,1715512) | [60578/3,60638/3) | full | full |
| 3506 | semantic-utterance-003506 | "う" | [1715512,1715612) | [1715512,1715612) | [60638/3,60938/3) | full | full |
| 3507 | semantic-utterance-003507 | "と" | [1715612,1715632) | [1715612,1715632) | [60938/3,60998/3) | full | full |
| 3508 | semantic-utterance-003508 | "な" | [1715632,1715792) | [1715632,1715792) | [60998/3,61478/3) | full | full |
| 3509 | semantic-utterance-003509 | "ん" | [1715792,1715912) | [1715792,1715912) | [61478/3,61838/3) | full | full |
| 3510 | semantic-utterance-003510 | "か" | [1715912,1715932) | [1715912,1715932) | [61838/3,61898/3) | full | full |
| 3511 | semantic-utterance-003511 | "あ" | [1715932,1715952) | [1715932,1715952) | [61898/3,61958/3) | full | full |
| 3512 | semantic-utterance-003512 | "ん" | [1715952,1715972) | [1715952,1715972) | [61958/3,62018/3) | full | full |
| 3513 | semantic-utterance-003513 | "な" | [1715972,1716132) | [1715972,1716132) | [62018/3,62498/3) | full | full |
| 3514 | semantic-utterance-003514 | "良" | [1716132,1716452) | [1716132,1716452) | [62498/3,63458/3) | full | full |
| 3515 | semantic-utterance-003515 | "く" | [1716452,1717673) | [1716452,1717673) | [63458/3,67121/3) | full | full |
| 3516 | semantic-utterance-003516 | "な" | [1717673,1720794) | [1717673,1720794) | [67121/3,76484/3) | full | full |
| 3517 | semantic-utterance-003517 | "い" | [1720794,1721054) | [1720794,1721054) | [76484/3,77264/3) | full | full |
| 3518 | semantic-utterance-003518 | "こ" | [1721054,1721074) | [1721054,1721074) | [77264/3,77324/3) | full | full |
| 3519 | semantic-utterance-003519 | "と" | [1721074,1721214) | [1721074,1721214) | [77324/3,77744/3) | full | full |
| 3520 | semantic-utterance-003520 | "し" | [1721214,1721234) | [1721214,1721234) | [77744/3,77804/3) | full | full |
| 3521 | semantic-utterance-003521 | "ち" | [1721234,1721374) | [1721234,1721374) | [77804/3,78224/3) | full | full |
| 3522 | semantic-utterance-003522 | "ゃ" | [1721374,1721474) | [1721374,1721474) | [78224/3,78524/3) | full | full |
| 3523 | semantic-utterance-003523 | "っ" | [1721474,1721774) | [1721474,1721774) | [78524/3,79424/3) | full | full |
| 3524 | semantic-utterance-003524 | "た" | [1721774,1721934) | [1721774,1721934) | [79424/3,79904/3) | full | full |
| 3525 | semantic-utterance-003525 | "か" | [1721934,1721954) | [1721934,1721954) | [79904/3,79964/3) | full | full |
| 3526 | semantic-utterance-003526 | "な" | [1721954,1722154) | [1721954,1722154) | [79964/3,80564/3) | full | full |
| 3527 | semantic-utterance-003527 | "っ" | [1722154,1722174) | [1722154,1722174) | [80564/3,80624/3) | full | full |
| 3528 | semantic-utterance-003528 | "て" | [1722174,1722574) | [1722174,1722574) | [80624/3,81824/3) | full | full |
| 3529 | semantic-utterance-003529 | "思" | [1722574,1722734) | [1722574,1722734) | [81824/3,82304/3) | full | full |
| 3530 | semantic-utterance-003530 | "っ" | [1722734,1723154) | [1722734,1723154) | [82304/3,83564/3) | full | full |
| 3531 | semantic-utterance-003531 | "ち" | [1723154,1723234) | [1723154,1723234) | [83564/3,83804/3) | full | full |
| 3532 | semantic-utterance-003532 | "ゃ" | [1723234,1723294) | [1723234,1723294) | [83804/3,83984/3) | full | full |
| 3533 | semantic-utterance-003533 | "う" | [1723294,1723334) | [1723294,1723334) | [83984/3,84104/3) | full | full |
| 3534 | semantic-utterance-003534 | "ん" | [1723334,1723414) | [1723334,1723414) | [84104/3,84344/3) | full | full |
| 3535 | semantic-utterance-003535 | "だ" | [1723414,1723575) | [1723414,1723575) | [84344/3,84827/3) | full | full |
| 3536 | semantic-utterance-003536 | "け" | [1723575,1723655) | [1723575,1723655) | [84827/3,85067/3) | full | full |
| 3537 | semantic-utterance-003537 | "ど" | [1723655,1723675) | [1723655,1723675) | [85067/3,85127/3) | full | full |
| 3538 | semantic-utterance-003538 | "仕" | [1723675,1723875) | [1723675,1723875) | [85127/3,85727/3) | full | full |
| 3539 | semantic-utterance-003539 | "方" | [1723875,1723895) | [1723875,1723895) | [85727/3,85787/3) | full | full |
| 3540 | semantic-utterance-003540 | "な" | [1723895,1723975) | [1723895,1723975) | [85787/3,86027/3) | full | full |
| 3541 | semantic-utterance-003541 | "い" | [1723975,1724495) | [1723975,1724495) | [86027/3,87587/3) | full | full |
| 3542 | semantic-utterance-003542 | "よ" | [1724495,1724735) | [1724495,1724735) | [87587/3,88307/3) | full | full |
| 3543 | semantic-utterance-003543 | "ね" | [1724735,1724755) | [1724735,1724755) | [88307/3,88367/3) | full | full |
| 3544 | semantic-utterance-003544 | "医" | [1724755,1724875) | [1724755,1724875) | [88367/3,88727/3) | full | full |
| 3545 | semantic-utterance-003545 | "師" | [1724875,1724895) | [1724875,1724895) | [88727/3,88787/3) | full | full |
| 3546 | semantic-utterance-003546 | "の" | [1724895,1724915) | [1724895,1724915) | [88787/3,88847/3) | full | full |
| 3547 | semantic-utterance-003547 | "失" | [1724915,1724935) | [1724915,1724935) | [88847/3,88907/3) | full | full |
| 3548 | semantic-utterance-003548 | "踪" | [1724935,1724955) | [1724935,1724955) | [88907/3,88967/3) | full | full |
| 3549 | semantic-utterance-003549 | "異" | [1724955,1724975) | [1724955,1724975) | [88967/3,89027/3) | full | full |
| 3550 | semantic-utterance-003550 | "様" | [1724975,1724995) | [1724975,1724995) | [89027/3,89087/3) | full | full |
| 3551 | semantic-utterance-003551 | "な" | [1724995,1725015) | [1724995,1725015) | [89087/3,89147/3) | full | full |
| 3552 | semantic-utterance-003552 | "技" | [1725015,1725055) | [1725015,1725055) | [89147/3,89267/3) | full | full |
| 3553 | semantic-utterance-003553 | "に" | [1725055,1725075) | [1725055,1725075) | [89267/3,89327/3) | full | full |
| 3554 | semantic-utterance-003554 | "発" | [1725075,1725095) | [1725075,1725095) | [89327/3,89387/3) | full | full |
| 3555 | semantic-utterance-003555 | "展" | [1725095,1725115) | [1725095,1725115) | [89387/3,89447/3) | full | full |
| 3556 | semantic-utterance-003556 | "先" | [1725115,1725135) | [1725115,1725135) | [89447/3,89507/3) | full | full |
| 3557 | semantic-utterance-003557 | "日" | [1725135,1725175) | [1725135,1725175) | [89507/3,89627/3) | full | full |
| 3558 | semantic-utterance-003558 | "市" | [1725175,1725195) | [1725175,1725195) | [89627/3,89687/3) | full | full |
| 3559 | semantic-utterance-003559 | "内" | [1725195,1725295) | [1725195,1725295) | [89687/3,89987/3) | full | full |
| 3560 | semantic-utterance-003560 | "の" | [1725295,1725375) | [1725295,1725375) | [89987/3,90227/3) | full | full |
| 3561 | semantic-utterance-003561 | "病" | [1725375,1725395) | [1725375,1725395) | [90227/3,90287/3) | full | full |
| 3562 | semantic-utterance-003562 | "院" | [1725395,1725495) | [1725395,1725495) | [90287/3,90587/3) | full | full |
| 3563 | semantic-utterance-003563 | "で" | [1725495,1725515) | [1725495,1725515) | [90587/3,90647/3) | full | full |
| 3564 | semantic-utterance-003564 | "医" | [1725515,1725535) | [1725515,1725535) | [90647/3,90707/3) | full | full |
| 3565 | semantic-utterance-003565 | "師" | [1725535,1725555) | [1725535,1725555) | [90707/3,90767/3) | full | full |
| 3566 | semantic-utterance-003566 | "が" | [1725555,1725615) | [1725555,1725615) | [90767/3,90947/3) | full | full |
| 3567 | semantic-utterance-003567 | "行" | [1725615,1725775) | [1725615,1725775) | [90947/3,91427/3) | full | full |
| 3568 | semantic-utterance-003568 | "方" | [1725775,1725795) | [1725775,1725795) | [91427/3,91487/3) | full | full |
| 3569 | semantic-utterance-003569 | "不" | [1725795,1725875) | [1725795,1725875) | [91487/3,91727/3) | full | full |
| 3570 | semantic-utterance-003570 | "明" | [1725875,1725955) | [1725875,1725955) | [91727/3,91967/3) | full | full |
| 3571 | semantic-utterance-003571 | "と" | [1725955,1725975) | [1725955,1725975) | [91967/3,92027/3) | full | full |
| 3572 | semantic-utterance-003572 | "な" | [1725975,1725995) | [1725975,1725995) | [92027/3,92087/3) | full | full |
| 3573 | semantic-utterance-003573 | "る" | [1725995,1726075) | [1725995,1726075) | [92087/3,92327/3) | full | full |
| 3574 | semantic-utterance-003574 | "事" | [1726075,1726195) | [1726075,1726195) | [92327/3,92687/3) | full | full |
| 3575 | semantic-utterance-003575 | "件" | [1726195,1726355) | [1726195,1726355) | [92687/3,93167/3) | full | full |
| 3576 | semantic-utterance-003576 | "が" | [1726355,1726455) | [1726355,1726455) | [93167/3,93467/3) | full | full |
| 3577 | semantic-utterance-003577 | "発" | [1726455,1726696) | [1726455,1726696) | [93467/3,94190/3) | full | full |
| 3578 | semantic-utterance-003578 | "生" | [1726696,1726936) | [1726696,1726936) | [94190/3,94910/3) | full | full |
| 3579 | semantic-utterance-003579 | "こ" | [1726936,1727036) | [1726936,1727036) | [94910/3,95210/3) | full | full |
| 3580 | semantic-utterance-003580 | "れ" | [1727036,1727056) | [1727036,1727056) | [95210/3,95270/3) | full | full |
| 3581 | semantic-utterance-003581 | "以" | [1727056,1727216) | [1727056,1727216) | [95270/3,95750/3) | full | full |
| 3582 | semantic-utterance-003582 | "前" | [1727216,1727396) | [1727216,1727396) | [95750/3,96290/3) | full | full |
| 3583 | semantic-utterance-003583 | "に" | [1727396,1727516) | [1727396,1727516) | [96290/3,96650/3) | full | full |
| 3584 | semantic-utterance-003584 | "も" | [1727516,1727996) | [1727516,1727996) | [96650/3,98090/3) | full | full |
| 3585 | semantic-utterance-003585 | "地" | [1727996,1728116) | [1727996,1728116) | [98090/3,98450/3) | full | full |
| 3586 | semantic-utterance-003586 | "下" | [1728116,1728316) | [1728116,1728316) | [98450/3,99050/3) | full | full |
| 3587 | semantic-utterance-003587 | "室" | [1728316,1728416) | [1728316,1728416) | [99050/3,99350/3) | full | full |
| 3588 | semantic-utterance-003588 | "か" | [1728416,1728496) | [1728416,1728496) | [99350/3,99590/3) | full | full |
| 3589 | semantic-utterance-003589 | "ら" | [1728496,1728516) | [1728496,1728516) | [99590/3,99650/3) | full | full |
| 3590 | semantic-utterance-003590 | "赤" | [1728516,1728536) | [1728516,1728536) | [99650/3,99710/3) | full | full |
| 3591 | semantic-utterance-003591 | "ん" | [1728536,1728716) | [1728536,1728716) | [99710/3,100250/3) | full | full |
| 3592 | semantic-utterance-003592 | "坊" | [1728716,1728736) | [1728716,1728736) | [100250/3,100310/3) | full | full |
| 3593 | semantic-utterance-003593 | "の" | [1728736,1728756) | [1728736,1728756) | [100310/3,100370/3) | full | full |
| 3594 | semantic-utterance-003594 | "泣" | [1728756,1728796) | [1728756,1728796) | [100370/3,100490/3) | full | full |
| 3595 | semantic-utterance-003595 | "き" | [1728796,1728936) | [1728796,1728936) | [100490/3,100910/3) | full | full |
| 3596 | semantic-utterance-003596 | "声" | [1728936,1728956) | [1728936,1728956) | [100910/3,100970/3) | full | full |
| 3597 | semantic-utterance-003597 | "を" | [1728956,1730197) | [1728956,1730197) | [100970/3,104693/3) | full | full |
| 3598 | semantic-utterance-003598 | "聞" | [1730197,1730357) | [1730197,1730357) | [104693/3,105173/3) | full | full |
| 3599 | semantic-utterance-003599 | "こ" | [1730357,1730577) | [1730357,1730577) | [105173/3,105833/3) | full | full |
| 3600 | semantic-utterance-003600 | "え" | [1730577,1730877) | [1730577,1730877) | [105833/3,106733/3) | full | full |
| 3601 | semantic-utterance-003601 | "る" | [1730877,1730957) | [1730877,1730957) | [106733/3,106973/3) | full | full |
| 3602 | semantic-utterance-003602 | "と" | [1730957,1731037) | [1730957,1731037) | [106973/3,107213/3) | full | full |
| 3603 | semantic-utterance-003603 | "の" | [1731037,1731137) | [1731037,1731137) | [107213/3,107513/3) | full | full |
| 3604 | semantic-utterance-003604 | "報" | [1731137,1731377) | [1731137,1731377) | [107513/3,108233/3) | full | full |
| 3605 | semantic-utterance-003605 | "告" | [1731377,1731497) | [1731377,1731497) | [108233/3,108593/3) | full | full |
| 3606 | semantic-utterance-003606 | "医" | [1731497,1731597) | [1731497,1731597) | [108593/3,108893/3) | full | full |
| 3607 | semantic-utterance-003607 | "療" | [1731597,1731737) | [1731597,1731737) | [108893/3,109313/3) | full | full |
| 3608 | semantic-utterance-003608 | "策" | [1731737,1731897) | [1731737,1731897) | [109313/3,109793/3) | full | full |
| 3609 | semantic-utterance-003609 | "か" | [1731897,1731977) | [1731897,1731977) | [109793/3,110033/3) | full | full |
| 3610 | semantic-utterance-003610 | "ら" | [1731977,1731997) | [1731977,1731997) | [110033/3,110093/3) | full | full |
| 3611 | semantic-utterance-003611 | "相" | [1731997,1732157) | [1731997,1732157) | [110093/3,110573/3) | full | full |
| 3612 | semantic-utterance-003612 | "次" | [1732157,1733198) | [1732157,1733198) | [110573/3,113696/3) | full | full |
| 3613 | semantic-utterance-003613 | "い" | [1733198,1733218) | [1733198,1733218) | [113696/3,113756/3) | full | full |
| 3614 | semantic-utterance-003614 | "で" | [1733218,1733278) | [1733218,1733278) | [113756/3,113936/3) | full | full |
| 3615 | semantic-utterance-003615 | "い" | [1733278,1733398) | [1733278,1733398) | [113936/3,114296/3) | full | full |
| 3616 | semantic-utterance-003616 | "た" | [1733398,1733518) | [1733398,1733518) | [114296/3,114656/3) | full | full |
| 3617 | semantic-utterance-003617 | "失" | [1733518,1733538) | [1733518,1733538) | [114656/3,114716/3) | full | full |
| 3618 | semantic-utterance-003618 | "踪" | [1733538,1733638) | [1733538,1733638) | [114716/3,115016/3) | full | full |
| 3619 | semantic-utterance-003619 | "事" | [1733638,1733718) | [1733638,1733718) | [115016/3,115256/3) | full | full |
| 3620 | semantic-utterance-003620 | "件" | [1733718,1733838) | [1733718,1733838) | [115256/3,115616/3) | full | full |
| 3621 | semantic-utterance-003621 | "の" | [1733838,1733858) | [1733838,1733858) | [115616/3,115676/3) | full | full |
| 3622 | semantic-utterance-003622 | "直" | [1733858,1733878) | [1733858,1733878) | [115676/3,115736/3) | full | full |
| 3623 | semantic-utterance-003623 | "後" | [1733878,1734058) | [1733878,1734058) | [115736/3,116276/3) | full | full |
| 3624 | semantic-utterance-003624 | "に" | [1734058,1734098) | [1734058,1734098) | [116276/3,116396/3) | full | full |
| 3625 | semantic-utterance-003625 | "は" | [1734098,1734118) | [1734098,1734118) | [116396/3,116456/3) | full | full |
| 3626 | semantic-utterance-003626 | "深" | [1734118,1734838) | [1734118,1734838) | [116456/3,118616/3) | full | full |
| 3627 | semantic-utterance-003627 | "夜" | [1734838,1735038) | [1734838,1735038) | [118616/3,119216/3) | full | full |
| 3628 | semantic-utterance-003628 | "に" | [1735038,1735338) | [1735038,1735338) | [119216/3,120116/3) | full | full |
| 3629 | semantic-utterance-003629 | "赤" | [1735338,1735498) | [1735338,1735498) | [120116/3,120596/3) | full | full |
| 3630 | semantic-utterance-003630 | "い" | [1735498,1735579) | [1735498,1735579) | [120596/3,120839/3) | full | full |
| 3631 | semantic-utterance-003631 | "服" | [1735579,1735599) | [1735579,1735599) | [120839/3,120899/3) | full | full |
| 3632 | semantic-utterance-003632 | "え" | [1735599,1735639) | [1735599,1735639) | [120899/3,121019/3) | full | full |
| 3633 | semantic-utterance-003633 | "?" | [1735639,1735699) | [1735639,1735699) | [121019/3,121199/3) | full | full |
| 3634 | semantic-utterance-003634 | "こ" | [1735699,1735779) | [1735699,1735779) | [121199/3,121439/3) | full | full |
| 3635 | semantic-utterance-003635 | "れ" | [1735779,1735879) | [1735779,1735879) | [121439/3,121739/3) | full | full |
| 3636 | semantic-utterance-003636 | "前" | [1735879,1736039) | [1735879,1736039) | [121739/3,122219/3) | full | full |
| 3637 | semantic-utterance-003637 | "も" | [1736039,1736159) | [1736039,1736159) | [122219/3,122579/3) | full | full |
| 3638 | semantic-utterance-003638 | "見" | [1736159,1736279) | [1736159,1736279) | [122579/3,122939/3) | full | full |
| 3639 | semantic-utterance-003639 | "た" | [1736279,1736459) | [1736279,1736459) | [122939/3,123479/3) | full | full |
| 3640 | semantic-utterance-003640 | "な" | [1736459,1738900) | [1736459,1738900) | [123479/3,130802/3) | full | full |
| 3641 | semantic-utterance-003641 | "こ" | [1738900,1738920) | [1738900,1738920) | [130802/3,130862/3) | full | full |
| 3642 | semantic-utterance-003642 | "れ" | [1738920,1739040) | [1738920,1739040) | [130862/3,131222/3) | full | full |
| 3643 | semantic-utterance-003643 | "前" | [1739040,1739280) | [1739040,1739280) | [131222/3,131942/3) | full | full |
| 3644 | semantic-utterance-003644 | "も" | [1739280,1739420) | [1739280,1739420) | [131942/3,132362/3) | full | full |
| 3645 | semantic-utterance-003645 | "見" | [1739420,1739560) | [1739420,1739560) | [132362/3,132782/3) | full | full |
| 3646 | semantic-utterance-003646 | "た" | [1739560,1739620) | [1739560,1739620) | [132782/3,132962/3) | full | full |
| 3647 | semantic-utterance-003647 | "や" | [1739620,1739760) | [1739620,1739760) | [132962/3,133382/3) | full | full |
| 3648 | semantic-utterance-003648 | "つ" | [1739760,1739780) | [1739760,1739780) | [133382/3,133442/3) | full | full |
| 3649 | semantic-utterance-003649 | "だ" | [1739780,1739800) | [1739780,1739800) | [133442/3,133502/3) | full | full |
| 3650 | semantic-utterance-003650 | "な" | [1743974,1744194) | [1743974,1744194) | [146024/3,146684/3) | full | full |
| 3651 | semantic-utterance-003651 | "ん" | [1744194,1744214) | [1744194,1744214) | [146684/3,146744/3) | full | full |
| 3652 | semantic-utterance-003652 | "か" | [1744214,1744234) | [1744214,1744234) | [146744/3,146804/3) | full | full |
| 3653 | semantic-utterance-003653 | "お" | [1744234,1744354) | [1744234,1744354) | [146804/3,147164/3) | full | full |
| 3654 | semantic-utterance-003654 | "み" | [1744354,1744435) | [1744354,1744435) | [147164/3,147407/3) | full | full |
| 3655 | semantic-utterance-003655 | "く" | [1744435,1744455) | [1744435,1744455) | [147407/3,147467/3) | full | full |
| 3656 | semantic-utterance-003656 | "じ" | [1744455,1744595) | [1744455,1744595) | [147467/3,147887/3) | full | full |
| 3657 | semantic-utterance-003657 | "入" | [1744595,1744615) | [1744595,1744615) | [147887/3,147947/3) | full | full |
| 3658 | semantic-utterance-003658 | "れ" | [1744615,1744635) | [1744615,1744635) | [147947/3,148007/3) | full | full |
| 3659 | semantic-utterance-003659 | "て" | [1744635,1744655) | [1744635,1744655) | [148007/3,148067/3) | full | full |
| 3660 | semantic-utterance-003660 | "る" | [1744655,1744675) | [1744655,1744675) | [148067/3,148127/3) | full | full |
| 3661 | semantic-utterance-003661 | "箱" | [1744675,1744695) | [1744675,1744695) | [148127/3,148187/3) | full | full |
| 3662 | semantic-utterance-003662 | "み" | [1744695,1744715) | [1744695,1744715) | [148187/3,148247/3) | full | full |
| 3663 | semantic-utterance-003663 | "た" | [1744715,1744755) | [1744715,1744755) | [148247/3,148367/3) | full | full |
| 3664 | semantic-utterance-003664 | "い" | [1744755,1744815) | [1744755,1744815) | [148367/3,148547/3) | full | full |
| 3665 | semantic-utterance-003665 | "で" | [1744815,1744835) | [1744815,1744835) | [148547/3,148607/3) | full | full |
| 3666 | semantic-utterance-003666 | "い" | [1744835,1744855) | [1744835,1744855) | [148607/3,148667/3) | full | full |
| 3667 | semantic-utterance-003667 | "い" | [1744855,1744955) | [1744855,1744955) | [148667/3,148967/3) | full | full |
| 3668 | semantic-utterance-003668 | "ね" | [1744955,1744975) | [1744955,1744975) | [148967/3,149027/3) | full | full |
| 3669 | semantic-utterance-003669 | "お" | [1744975,1745255) | [1744975,1745255) | [149027/3,149867/3) | full | full |
| 3670 | semantic-utterance-003670 | "、" | [1745255,1745275) | [1745255,1745275) | [149867/3,149927/3) | full | full |
| 3671 | semantic-utterance-003671 | "鍵" | [1745275,1750321) | [1745275,1750321) | [149927/3,165065/3) | full | full |
| 3672 | semantic-utterance-003672 | "あ" | [1750321,1750501) | [1750321,5250998/3) | [165065/3,165100/3) | partial | outside |

</details>

<details>
<summary>item-0003 / segment-0002 — 178 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 9068 | semantic-utterance-009068 | "度" | [5662938,5667759) | [16988848/3,5667759) | [55050,179579/3) | partial | full |
| 9069 | semantic-utterance-009069 | "と" | [5667759,5667939) | [5667759,5667939) | [179579/3,180119/3) | full | full |
| 9070 | semantic-utterance-009070 | "こ" | [5667939,5667959) | [5667939,5667959) | [180119/3,180179/3) | full | full |
| 9071 | semantic-utterance-009071 | "ん" | [5667959,5668099) | [5667959,5668099) | [180179/3,180599/3) | full | full |
| 9072 | semantic-utterance-009072 | "な" | [5668099,5668119) | [5668099,5668119) | [180599/3,180659/3) | full | full |
| 9073 | semantic-utterance-009073 | "こ" | [5668119,5668199) | [5668119,5668199) | [180659/3,180899/3) | full | full |
| 9074 | semantic-utterance-009074 | "と" | [5668199,5668219) | [5668199,5668219) | [180899/3,180959/3) | full | full |
| 9075 | semantic-utterance-009075 | "す" | [5668219,5668239) | [5668219,5668239) | [180959/3,181019/3) | full | full |
| 9076 | semantic-utterance-009076 | "な" | [5668239,5668339) | [5668239,5668339) | [181019/3,181319/3) | full | full |
| 9077 | semantic-utterance-009077 | "よ" | [5668339,5668359) | [5668339,5668359) | [181319/3,181379/3) | full | full |
| 9078 | semantic-utterance-009078 | "!" | [5668359,5668379) | [5668359,5668379) | [181379/3,181439/3) | full | full |
| 9079 | semantic-utterance-009079 | "お" | [5668379,5668540) | [5668379,5668540) | [181439/3,181922/3) | full | full |
| 9080 | semantic-utterance-009080 | "前" | [5668540,5668560) | [5668540,5668560) | [181922/3,181982/3) | full | full |
| 9081 | semantic-utterance-009081 | "!" | [5668560,5668580) | [5668560,5668580) | [181982/3,182042/3) | full | full |
| 9082 | semantic-utterance-009082 | "や" | [5668580,5668600) | [5668580,5668600) | [182042/3,182102/3) | full | full |
| 9083 | semantic-utterance-009083 | "っ" | [5668600,5668960) | [5668600,5668960) | [182102/3,183182/3) | full | full |
| 9084 | semantic-utterance-009084 | "ぱ" | [5668960,5669000) | [5668960,5669000) | [183182/3,183302/3) | full | full |
| 9085 | semantic-utterance-009085 | "母" | [5669000,5669040) | [5669000,5669040) | [183302/3,183422/3) | full | full |
| 9086 | semantic-utterance-009086 | "同" | [5669040,5669140) | [5669040,5669140) | [183422/3,183722/3) | full | full |
| 9087 | semantic-utterance-009087 | "士" | [5669140,5669180) | [5669140,5669180) | [183722/3,183842/3) | full | full |
| 9088 | semantic-utterance-009088 | "通" | [5669180,5669200) | [5669180,5669200) | [183842/3,183902/3) | full | full |
| 9089 | semantic-utterance-009089 | "じ" | [5669200,5669300) | [5669200,5669300) | [183902/3,184202/3) | full | full |
| 9090 | semantic-utterance-009090 | "る" | [5669300,5669380) | [5669300,5669380) | [184202/3,184442/3) | full | full |
| 9091 | semantic-utterance-009091 | "も" | [5669380,5669400) | [5669380,5669400) | [184442/3,184502/3) | full | full |
| 9092 | semantic-utterance-009092 | "の" | [5669400,5669420) | [5669400,5669420) | [184502/3,184562/3) | full | full |
| 9093 | semantic-utterance-009093 | "が" | [5669420,5669440) | [5669420,5669440) | [184562/3,184622/3) | full | full |
| 9094 | semantic-utterance-009094 | "あ" | [5669440,5669520) | [5669440,5669520) | [184622/3,184862/3) | full | full |
| 9095 | semantic-utterance-009095 | "る" | [5669520,5669540) | [5669520,5669540) | [184862/3,184922/3) | full | full |
| 9096 | semantic-utterance-009096 | "み" | [5669540,5669820) | [5669540,5669820) | [184922/3,185762/3) | full | full |
| 9097 | semantic-utterance-009097 | "た" | [5669820,5669840) | [5669820,5669840) | [185762/3,185822/3) | full | full |
| 9098 | semantic-utterance-009098 | "い" | [5669840,5669860) | [5669840,5669860) | [185822/3,185882/3) | full | full |
| 9099 | semantic-utterance-009099 | "な" | [5678270,5678430) | [5678270,5678430) | [211112/3,211592/3) | full | full |
| 9100 | semantic-utterance-009100 | "に" | [5678430,5679410) | [5678430,5679410) | [211592/3,214532/3) | full | full |
| 9101 | semantic-utterance-009101 | "な" | [5679410,5679610) | [5679410,5679610) | [214532/3,215132/3) | full | full |
| 9102 | semantic-utterance-009102 | "に" | [5679610,5680071) | [5679610,5680071) | [215132/3,216515/3) | full | full |
| 9103 | semantic-utterance-009103 | "な" | [5680071,5680231) | [5680071,5680231) | [216515/3,216995/3) | full | full |
| 9104 | semantic-utterance-009104 | "に" | [5680231,5680511) | [5680231,5680511) | [216995/3,217835/3) | full | full |
| 9105 | semantic-utterance-009105 | "急" | [5680511,5681271) | [5680511,5681271) | [217835/3,220115/3) | full | full |
| 9106 | semantic-utterance-009106 | "に" | [5681271,5681291) | [5681271,5681291) | [220115/3,220175/3) | full | full |
| 9107 | semantic-utterance-009107 | "な" | [5681291,5681311) | [5681291,5681311) | [220175/3,220235/3) | full | full |
| 9108 | semantic-utterance-009108 | "に" | [5681311,5681391) | [5681311,5681391) | [220235/3,220475/3) | full | full |
| 9109 | semantic-utterance-009109 | "昔" | [5681391,5681411) | [5681391,5681411) | [220475/3,220535/3) | full | full |
| 9110 | semantic-utterance-009110 | "あ" | [5681411,5681531) | [5681411,5681531) | [220535/3,220895/3) | full | full |
| 9111 | semantic-utterance-009111 | "る" | [5681531,5681551) | [5681531,5681551) | [220895/3,220955/3) | full | full |
| 9112 | semantic-utterance-009112 | "女" | [5681551,5681571) | [5681551,5681571) | [220955/3,221015/3) | full | full |
| 9113 | semantic-utterance-009113 | "が" | [5681571,5681611) | [5681571,5681611) | [221015/3,221135/3) | full | full |
| 9114 | semantic-utterance-009114 | "い" | [5681611,5681671) | [5681611,5681671) | [221135/3,221315/3) | full | full |
| 9115 | semantic-utterance-009115 | "た" | [5681671,5681691) | [5681671,5681691) | [221315/3,221375/3) | full | full |
| 9116 | semantic-utterance-009116 | "彼" | [5681691,5681771) | [5681691,5681771) | [221375/3,221615/3) | full | full |
| 9117 | semantic-utterance-009117 | "女" | [5681771,5681791) | [5681771,5681791) | [221615/3,221675/3) | full | full |
| 9118 | semantic-utterance-009118 | "の" | [5681791,5681912) | [5681791,5681912) | [221675/3,222038/3) | full | full |
| 9119 | semantic-utterance-009119 | "子" | [5681912,5682152) | [5681912,5682152) | [222038/3,222758/3) | full | full |
| 9120 | semantic-utterance-009120 | "供" | [5682152,5682312) | [5682152,5682312) | [222758/3,223238/3) | full | full |
| 9121 | semantic-utterance-009121 | "は" | [5682312,5682752) | [5682312,5682752) | [223238/3,224558/3) | full | full |
| 9122 | semantic-utterance-009122 | "祭" | [5682752,5683032) | [5682752,5683032) | [224558/3,225398/3) | full | full |
| 9123 | semantic-utterance-009123 | "り" | [5683032,5683152) | [5683032,5683152) | [225398/3,225758/3) | full | full |
| 9124 | semantic-utterance-009124 | "に" | [5683152,5683272) | [5683152,5683272) | [225758/3,226118/3) | full | full |
| 9125 | semantic-utterance-009125 | "向" | [5683272,5683432) | [5683272,5683432) | [226118/3,226598/3) | full | full |
| 9126 | semantic-utterance-009126 | "か" | [5683432,5683532) | [5683432,5683532) | [226598/3,226898/3) | full | full |
| 9127 | semantic-utterance-009127 | "う" | [5683532,5683612) | [5683532,5683612) | [226898/3,227138/3) | full | full |
| 9128 | semantic-utterance-009128 | "途" | [5683612,5683772) | [5683612,5683772) | [227138/3,227618/3) | full | full |
| 9129 | semantic-utterance-009129 | "中" | [5683772,5683973) | [5683772,5683973) | [227618/3,228221/3) | full | full |
| 9130 | semantic-utterance-009130 | "で" | [5683973,5684133) | [5683973,5684133) | [228221/3,228701/3) | full | full |
| 9131 | semantic-utterance-009131 | "事" | [5684133,5684273) | [5684133,5684273) | [228701/3,229121/3) | full | full |
| 9132 | semantic-utterance-009132 | "故" | [5684273,5684413) | [5684273,5684413) | [229121/3,229541/3) | full | full |
| 9133 | semantic-utterance-009133 | "に" | [5684413,5685453) | [5684413,5685453) | [229541/3,232661/3) | full | full |
| 9134 | semantic-utterance-009134 | "遭" | [5685453,5685553) | [5685453,5685553) | [232661/3,232961/3) | full | full |
| 9135 | semantic-utterance-009135 | "っ" | [5685553,5685573) | [5685553,5685573) | [232961/3,233021/3) | full | full |
| 9136 | semantic-utterance-009136 | "た" | [5685573,5685673) | [5685573,5685673) | [233021/3,233321/3) | full | full |
| 9137 | semantic-utterance-009137 | "人" | [5685673,5685793) | [5685673,5685793) | [233321/3,233681/3) | full | full |
| 9138 | semantic-utterance-009138 | "々" | [5685793,5686013) | [5685793,5686013) | [233681/3,234341/3) | full | full |
| 9139 | semantic-utterance-009139 | "は" | [5686013,5686274) | [5686013,5686274) | [234341/3,235124/3) | full | full |
| 9140 | semantic-utterance-009140 | "祭" | [5686274,5686354) | [5686274,5686354) | [235124/3,235364/3) | full | full |
| 9141 | semantic-utterance-009141 | "り" | [5686354,5686374) | [5686354,5686374) | [235364/3,235424/3) | full | full |
| 9142 | semantic-utterance-009142 | "に" | [5686374,5686474) | [5686374,5686474) | [235424/3,235724/3) | full | full |
| 9143 | semantic-utterance-009143 | "夢" | [5686474,5686654) | [5686474,5686654) | [235724/3,236264/3) | full | full |
| 9144 | semantic-utterance-009144 | "中" | [5686654,5686834) | [5686654,5686834) | [236264/3,236804/3) | full | full |
| 9145 | semantic-utterance-009145 | "で" | [5686834,5687294) | [5686834,5687294) | [236804/3,238184/3) | full | full |
| 9146 | semantic-utterance-009146 | "彼" | [5687294,5687554) | [5687294,5687554) | [238184/3,238964/3) | full | full |
| 9147 | semantic-utterance-009147 | "女" | [5687554,5687634) | [5687554,5687634) | [238964/3,239204/3) | full | full |
| 9148 | semantic-utterance-009148 | "の" | [5687634,5687914) | [5687634,5687914) | [239204/3,240044/3) | full | full |
| 9149 | semantic-utterance-009149 | "助" | [5687914,5688034) | [5687914,5688034) | [240044/3,240404/3) | full | full |
| 9150 | semantic-utterance-009150 | "け" | [5688034,5688134) | [5688034,5688134) | [240404/3,240704/3) | full | full |
| 9151 | semantic-utterance-009151 | "を" | [5688134,5688255) | [5688134,5688255) | [240704/3,241067/3) | full | full |
| 9152 | semantic-utterance-009152 | "求" | [5688255,5688535) | [5688255,5688535) | [241067/3,241907/3) | full | full |
| 9153 | semantic-utterance-009153 | "め" | [5688535,5688635) | [5688535,5688635) | [241907/3,242207/3) | full | full |
| 9154 | semantic-utterance-009154 | "る" | [5688635,5688795) | [5688635,5688795) | [242207/3,242687/3) | full | full |
| 9155 | semantic-utterance-009155 | "声" | [5688795,5689035) | [5688795,5689035) | [242687/3,243407/3) | full | full |
| 9156 | semantic-utterance-009156 | "を" | [5689035,5689235) | [5689035,5689235) | [243407/3,244007/3) | full | full |
| 9157 | semantic-utterance-009157 | "無" | [5689235,5689395) | [5689235,5689395) | [244007/3,244487/3) | full | full |
| 9158 | semantic-utterance-009158 | "視" | [5689395,5689415) | [5689395,5689415) | [244487/3,244547/3) | full | full |
| 9159 | semantic-utterance-009159 | "し" | [5689415,5689555) | [5689415,5689555) | [244547/3,244967/3) | full | full |
| 9160 | semantic-utterance-009160 | "た" | [5689555,5693397) | [5689555,5693397) | [244967/3,256493/3) | full | full |
| 9161 | semantic-utterance-009161 | "可" | [5693397,5693657) | [5693397,5693657) | [256493/3,257273/3) | full | full |
| 9162 | semantic-utterance-009162 | "哀" | [5693657,5693817) | [5693657,5693817) | [257273/3,257753/3) | full | full |
| 9163 | semantic-utterance-009163 | "想" | [5693817,5693997) | [5693817,5693997) | [257753/3,258293/3) | full | full |
| 9164 | semantic-utterance-009164 | "な" | [5693997,5694137) | [5693997,5694137) | [258293/3,258713/3) | full | full |
| 9165 | semantic-utterance-009165 | "子" | [5694137,5694257) | [5694137,5694257) | [258713/3,259073/3) | full | full |
| 9166 | semantic-utterance-009166 | "供" | [5694257,5694838) | [5694257,5694838) | [259073/3,260816/3) | full | full |
| 9167 | semantic-utterance-009167 | "は" | [5694838,5694998) | [5694838,5694998) | [260816/3,261296/3) | full | full |
| 9168 | semantic-utterance-009168 | "若" | [5694998,5695138) | [5694998,5695138) | [261296/3,261716/3) | full | full |
| 9169 | semantic-utterance-009169 | "く" | [5695138,5695258) | [5695138,5695258) | [261716/3,262076/3) | full | full |
| 9170 | semantic-utterance-009170 | "し" | [5695258,5695378) | [5695258,5695378) | [262076/3,262436/3) | full | full |
| 9171 | semantic-utterance-009171 | "て" | [5695378,5698379) | [5695378,5698379) | [262436/3,271439/3) | full | full |
| 9172 | semantic-utterance-009172 | "命" | [5698379,5698479) | [5698379,5698479) | [271439/3,271739/3) | full | full |
| 9173 | semantic-utterance-009173 | "を" | [5698479,5698499) | [5698479,5698499) | [271739/3,271799/3) | full | full |
| 9174 | semantic-utterance-009174 | "落" | [5698499,5698519) | [5698499,5698519) | [271799/3,271859/3) | full | full |
| 9175 | semantic-utterance-009175 | "と" | [5698519,5698539) | [5698519,5698539) | [271859/3,271919/3) | full | full |
| 9176 | semantic-utterance-009176 | "し" | [5698539,5698619) | [5698539,5698619) | [271919/3,272159/3) | full | full |
| 9177 | semantic-utterance-009177 | "た" | [5698619,5698719) | [5698619,5698719) | [272159/3,272459/3) | full | full |
| 9178 | semantic-utterance-009178 | "女" | [5698719,5698739) | [5698719,5698739) | [272459/3,272519/3) | full | full |
| 9179 | semantic-utterance-009179 | "は" | [5698739,5698859) | [5698739,5698859) | [272519/3,272879/3) | full | full |
| 9180 | semantic-utterance-009180 | "悲" | [5698859,5698940) | [5698859,5698940) | [272879/3,273122/3) | full | full |
| 9181 | semantic-utterance-009181 | "し" | [5698940,5698960) | [5698940,5698960) | [273122/3,273182/3) | full | full |
| 9182 | semantic-utterance-009182 | "み" | [5698960,5699060) | [5698960,5699060) | [273182/3,273482/3) | full | full |
| 9183 | semantic-utterance-009183 | "に" | [5699060,5699140) | [5699060,5699140) | [273482/3,273722/3) | full | full |
| 9184 | semantic-utterance-009184 | "打" | [5699140,5699260) | [5699140,5699260) | [273722/3,274082/3) | full | full |
| 9185 | semantic-utterance-009185 | "ち" | [5699260,5699380) | [5699260,5699380) | [274082/3,274442/3) | full | full |
| 9186 | semantic-utterance-009186 | "ひ" | [5699380,5699460) | [5699380,5699460) | [274442/3,274682/3) | full | full |
| 9187 | semantic-utterance-009187 | "し" | [5699460,5699620) | [5699460,5699620) | [274682/3,275162/3) | full | full |
| 9188 | semantic-utterance-009188 | "が" | [5699620,5699740) | [5699620,5699740) | [275162/3,275522/3) | full | full |
| 9189 | semantic-utterance-009189 | "れ" | [5699740,5699760) | [5699740,5699760) | [275522/3,275582/3) | full | full |
| 9190 | semantic-utterance-009190 | "あ" | [5700214,5700374) | [5700214,5700374) | [276944/3,277424/3) | full | full |
| 9191 | semantic-utterance-009191 | "の" | [5700374,5700534) | [5700374,5700534) | [277424/3,277904/3) | full | full |
| 9192 | semantic-utterance-009192 | "無" | [5700534,5700714) | [5700534,5700714) | [277904/3,278444/3) | full | full |
| 9193 | semantic-utterance-009193 | "情" | [5700714,5700934) | [5700714,5700934) | [278444/3,279104/3) | full | full |
| 9194 | semantic-utterance-009194 | "な" | [5700934,5701074) | [5700934,5701074) | [279104/3,279524/3) | full | full |
| 9195 | semantic-utterance-009195 | "者" | [5701074,5701314) | [5701074,5701314) | [279524/3,280244/3) | full | full |
| 9196 | semantic-utterance-009196 | "ど" | [5701314,5701454) | [5701314,5701454) | [280244/3,280664/3) | full | full |
| 9197 | semantic-utterance-009197 | "も" | [5701454,5701534) | [5701454,5701534) | [280664/3,280904/3) | full | full |
| 9198 | semantic-utterance-009198 | "を" | [5701534,5701674) | [5701534,5701674) | [280904/3,281324/3) | full | full |
| 9199 | semantic-utterance-009199 | "決" | [5701674,5701814) | [5701674,5701814) | [281324/3,281744/3) | full | full |
| 9200 | semantic-utterance-009200 | "し" | [5701814,5701934) | [5701814,5701934) | [281744/3,282104/3) | full | full |
| 9201 | semantic-utterance-009201 | "て" | [5701934,5702114) | [5701934,5702114) | [282104/3,282644/3) | full | full |
| 9202 | semantic-utterance-009202 | "許" | [5702114,5702234) | [5702114,5702234) | [282644/3,283004/3) | full | full |
| 9203 | semantic-utterance-009203 | "さ" | [5702234,5702354) | [5702234,5702354) | [283004/3,283364/3) | full | full |
| 9204 | semantic-utterance-009204 | "な" | [5702354,5702474) | [5702354,5702474) | [283364/3,283724/3) | full | full |
| 9205 | semantic-utterance-009205 | "い" | [5702474,5702554) | [5702474,5702554) | [283724/3,283964/3) | full | full |
| 9206 | semantic-utterance-009206 | "と" | [5702554,5703115) | [5702554,5703115) | [283964/3,285647/3) | full | full |
| 9207 | semantic-utterance-009207 | "心" | [5703115,5703235) | [5703115,5703235) | [285647/3,286007/3) | full | full |
| 9208 | semantic-utterance-009208 | "の" | [5703235,5703255) | [5703235,5703255) | [286007/3,286067/3) | full | full |
| 9209 | semantic-utterance-009209 | "中" | [5703255,5703375) | [5703255,5703375) | [286067/3,286427/3) | full | full |
| 9210 | semantic-utterance-009210 | "で" | [5703375,5706035) | [5703375,5706035) | [286427/3,294407/3) | full | full |
| 9211 | semantic-utterance-009211 | "誓" | [5706035,5706195) | [5706035,5706195) | [294407/3,294887/3) | full | full |
| 9212 | semantic-utterance-009212 | "っ" | [5706195,5706295) | [5706195,5706295) | [294887/3,295187/3) | full | full |
| 9213 | semantic-utterance-009213 | "た" | [5706295,5706315) | [5706295,5706315) | [295187/3,295247/3) | full | full |
| 9214 | semantic-utterance-009214 | "や" | [5706315,5706435) | [5706315,5706435) | [295247/3,295607/3) | full | full |
| 9215 | semantic-utterance-009215 | "が" | [5706435,5706575) | [5706435,5706575) | [295607/3,296027/3) | full | full |
| 9216 | semantic-utterance-009216 | "て" | [5706575,5706695) | [5706575,5706695) | [296027/3,296387/3) | full | full |
| 9217 | semantic-utterance-009217 | "女" | [5706695,5706715) | [5706695,5706715) | [296387/3,296447/3) | full | full |
| 9218 | semantic-utterance-009218 | "は" | [5706715,5706815) | [5706715,5706815) | [296447/3,296747/3) | full | full |
| 9219 | semantic-utterance-009219 | "死" | [5706815,5707035) | [5706815,5707035) | [296747/3,297407/3) | full | full |
| 9220 | semantic-utterance-009220 | "に" | [5707035,5707615) | [5707035,5707615) | [297407/3,299147/3) | full | full |
| 9221 | semantic-utterance-009221 | "若" | [5707615,5707976) | [5707615,5707976) | [299147/3,300230/3) | full | full |
| 9222 | semantic-utterance-009222 | "い" | [5707976,5708096) | [5707976,5708096) | [300230/3,300590/3) | full | full |
| 9223 | semantic-utterance-009223 | "子" | [5708096,5708116) | [5708096,5708116) | [300590/3,300650/3) | full | full |
| 9224 | semantic-utterance-009224 | "を" | [5708116,5708316) | [5708116,5708316) | [300650/3,301250/3) | full | full |
| 9225 | semantic-utterance-009225 | "捕" | [5708316,5708456) | [5708316,5708456) | [301250/3,301670/3) | full | full |
| 9226 | semantic-utterance-009226 | "ら" | [5708456,5708596) | [5708456,5708596) | [301670/3,302090/3) | full | full |
| 9227 | semantic-utterance-009227 | "え" | [5708596,5708736) | [5708596,5708736) | [302090/3,302510/3) | full | full |
| 9228 | semantic-utterance-009228 | "て" | [5708736,5708916) | [5708736,5708916) | [302510/3,303050/3) | full | full |
| 9229 | semantic-utterance-009229 | "喰" | [5708916,5709036) | [5708916,5709036) | [303050/3,303410/3) | full | full |
| 9230 | semantic-utterance-009230 | "ら" | [5709036,5709776) | [5709036,5709776) | [303410/3,305630/3) | full | full |
| 9231 | semantic-utterance-009231 | "う" | [5709776,5709796) | [5709776,5709796) | [305630/3,305690/3) | full | full |
| 9232 | semantic-utterance-009232 | "何" | [5709796,5709936) | [5709796,5709936) | [305690/3,306110/3) | full | full |
| 9233 | semantic-utterance-009233 | "て" | [5709936,5709956) | [5709936,5709956) | [306110/3,306170/3) | full | full |
| 9234 | semantic-utterance-009234 | "読" | [5709956,5709976) | [5709956,5709976) | [306170/3,306230/3) | full | full |
| 9235 | semantic-utterance-009235 | "む" | [5709976,5710076) | [5709976,5710076) | [306230/3,306530/3) | full | full |
| 9236 | semantic-utterance-009236 | "の" | [5710076,5710256) | [5710076,5710256) | [306530/3,307070/3) | full | full |
| 9237 | semantic-utterance-009237 | "こ" | [5710256,5710276) | [5710256,5710276) | [307070/3,307130/3) | full | full |
| 9238 | semantic-utterance-009238 | "れ" | [5710276,5710496) | [5710276,5710496) | [307130/3,307790/3) | full | full |
| 9239 | semantic-utterance-009239 | "鬼" | [5710496,5711036) | [5710496,5711036) | [307790/3,309410/3) | full | full |
| 9240 | semantic-utterance-009240 | "母" | [5711036,5711396) | [5711036,5711396) | [309410/3,310490/3) | full | full |
| 9241 | semantic-utterance-009241 | "と" | [5711396,5711416) | [5711396,5711416) | [310490/3,310550/3) | full | full |
| 9242 | semantic-utterance-009242 | "な" | [5711416,5711576) | [5711416,5711576) | [310550/3,311030/3) | full | full |
| 9243 | semantic-utterance-009243 | "っ" | [5711576,5713937) | [5711576,5713937) | [311030/3,318113/3) | full | full |
| 9244 | semantic-utterance-009244 | "た" | [5713937,5714097) | [5713937,5714097) | [318113/3,318593/3) | full | full |
| 9245 | semantic-utterance-009245 | "人" | [5714097,5714217) | [5714097,5714116) | [318593/3,318650/3) | partial | outside |

</details>

<details>
<summary>item-0004 / segment-0001 — 44 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 51 | semantic-utterance-000051 | "ゃ" | [214410,214590) | [214416,214590) | [0,174) | partial | full |
| 52 | semantic-utterance-000052 | "ん" | [214590,214872) | [214590,214872) | [174,456) | full | full |
| 53 | semantic-utterance-000053 | "ぶ" | [214872,215133) | [214872,215133) | [456,717) | full | full |
| 54 | semantic-utterance-000054 | "ん" | [215133,215153) | [215133,215153) | [717,737) | full | full |
| 55 | semantic-utterance-000055 | "ぶ" | [215153,215173) | [215153,215173) | [737,757) | full | full |
| 56 | semantic-utterance-000056 | "ん" | [215173,215193) | [215173,215193) | [757,777) | full | full |
| 57 | semantic-utterance-000057 | "ち" | [215193,215213) | [215193,215213) | [777,797) | full | full |
| 58 | semantic-utterance-000058 | "ゃ" | [215213,215695) | [215213,215695) | [797,1279) | full | full |
| 59 | semantic-utterance-000059 | "ん" | [215695,215936) | [215695,215936) | [1279,1520) | full | full |
| 60 | semantic-utterance-000060 | "ぶ" | [215936,215956) | [215936,215956) | [1520,1540) | full | full |
| 61 | semantic-utterance-000061 | "ん" | [215956,215976) | [215956,215976) | [1540,1560) | full | full |
| 62 | semantic-utterance-000062 | "ぶ" | [215976,215996) | [215976,215996) | [1560,1580) | full | full |
| 63 | semantic-utterance-000063 | "ん" | [215996,216096) | [215996,216096) | [1580,1680) | full | full |
| 64 | semantic-utterance-000064 | "ち" | [216096,216116) | [216096,216116) | [1680,1700) | full | full |
| 65 | semantic-utterance-000065 | "ゃ" | [216116,216538) | [216116,216538) | [1700,2122) | full | full |
| 66 | semantic-utterance-000066 | "ん" | [216538,216558) | [216538,216558) | [2122,2142) | full | full |
| 67 | semantic-utterance-000067 | "今" | [249378,249758) | [249378,249758) | [34962,35342) | full | full |
| 68 | semantic-utterance-000068 | "年" | [249758,250219) | [249758,250219) | [35342,35803) | full | full |
| 69 | semantic-utterance-000069 | "一" | [250219,251500) | [250219,251500) | [35803,37084) | full | full |
| 70 | semantic-utterance-000070 | "怖" | [251500,251720) | [251500,251720) | [37084,37304) | full | full |
| 71 | semantic-utterance-000071 | "い" | [251720,251901) | [251720,251901) | [37304,37485) | full | full |
| 72 | semantic-utterance-000072 | "と" | [251901,252081) | [251901,252081) | [37485,37665) | full | full |
| 73 | semantic-utterance-000073 | "言" | [252081,252181) | [252081,252181) | [37665,37765) | full | full |
| 74 | semantic-utterance-000074 | "わ" | [252181,252341) | [252181,252341) | [37765,37925) | full | full |
| 75 | semantic-utterance-000075 | "れ" | [252341,252501) | [252341,252501) | [37925,38085) | full | full |
| 76 | semantic-utterance-000076 | "る" | [252501,253222) | [252501,253222) | [38085,38806) | full | full |
| 77 | semantic-utterance-000077 | "ホ" | [253222,253522) | [253222,253522) | [38806,39106) | full | full |
| 78 | semantic-utterance-000078 | "ラ" | [253522,253803) | [253522,253803) | [39106,39387) | full | full |
| 79 | semantic-utterance-000079 | "ー" | [253803,254043) | [253803,254043) | [39387,39627) | full | full |
| 80 | semantic-utterance-000080 | "ゲ" | [254043,254223) | [254043,254223) | [39627,39807) | full | full |
| 81 | semantic-utterance-000081 | "ー" | [254223,254483) | [254223,254483) | [39807,40067) | full | full |
| 82 | semantic-utterance-000082 | "ム" | [254483,255324) | [254483,255324) | [40067,40908) | full | full |
| 83 | semantic-utterance-000083 | "ハ" | [255324,255545) | [255324,255545) | [40908,41129) | full | full |
| 84 | semantic-utterance-000084 | "リ" | [255545,255785) | [255545,255785) | [41129,41369) | full | full |
| 85 | semantic-utterance-000085 | "チ" | [255785,255805) | [255785,255805) | [41369,41389) | full | full |
| 86 | semantic-utterance-000086 | "鬼" | [255805,257086) | [255805,257086) | [41389,42670) | full | full |
| 87 | semantic-utterance-000087 | "の" | [257086,260230) | [257086,260230) | [42670,45814) | full | full |
| 88 | semantic-utterance-000088 | "子" | [260230,264574) | [260230,264574) | [45814,50158) | full | full |
| 89 | semantic-utterance-000089 | "供" | [264574,264594) | [264574,264594) | [50158,50178) | full | full |
| 90 | semantic-utterance-000090 | "の" | [264594,264734) | [264594,264734) | [50178,50318) | full | full |
| 91 | semantic-utterance-000091 | "母" | [264734,264754) | [264734,264754) | [50318,50338) | full | full |
| 92 | semantic-utterance-000092 | "ハ" | [264754,264995) | [264754,264995) | [50338,50579) | full | full |
| 93 | semantic-utterance-000093 | "リ" | [264995,265015) | [264995,265015) | [50579,50599) | full | outside |
| 94 | semantic-utterance-000094 | "チ" | [265015,265115) | [265015,265016) | [50599,50600) | partial | outside |

</details>

<details>
<summary>item-0004 / segment-0002 — 79 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 3876 | semantic-utterance-003876 | "?" | [1945338,1945358) | [5836048/3,1945358) | [151850/3,151876/3) | partial | full |
| 3877 | semantic-utterance-003877 | "逃" | [1958422,1958442) | [1958422,1958442) | [191068/3,191128/3) | full | full |
| 3878 | semantic-utterance-003878 | "げ" | [1958442,1958562) | [1958442,1958562) | [191128/3,191488/3) | full | full |
| 3879 | semantic-utterance-003879 | "る" | [1958562,1958582) | [1958562,1958582) | [191488/3,191548/3) | full | full |
| 3880 | semantic-utterance-003880 | "や" | [1958582,1958842) | [1958582,1958842) | [191548/3,192328/3) | full | full |
| 3881 | semantic-utterance-003881 | "つ" | [1958842,1958862) | [1958842,1958862) | [192328/3,192388/3) | full | full |
| 3882 | semantic-utterance-003882 | "?" | [1958862,1966508) | [1958862,1966508) | [192388/3,215326/3) | full | full |
| 3883 | semantic-utterance-003883 | "逃" | [1966508,1966528) | [1966508,1966528) | [215326/3,215386/3) | full | full |
| 3884 | semantic-utterance-003884 | "げ" | [1966528,1966548) | [1966528,1966548) | [215386/3,215446/3) | full | full |
| 3885 | semantic-utterance-003885 | "る" | [1966548,1966568) | [1966548,1966568) | [215446/3,215506/3) | full | full |
| 3886 | semantic-utterance-003886 | "ん" | [1966568,1966588) | [1966568,1966588) | [215506/3,215566/3) | full | full |
| 3887 | semantic-utterance-003887 | "だ" | [1966588,1966608) | [1966588,1966608) | [215566/3,215626/3) | full | full |
| 3888 | semantic-utterance-003888 | "で" | [1966608,1966628) | [1966608,1966628) | [215626/3,215686/3) | full | full |
| 3889 | semantic-utterance-003889 | "も" | [1966628,1966788) | [1966628,1966788) | [215686/3,216166/3) | full | full |
| 3890 | semantic-utterance-003890 | "こ" | [1966788,1966949) | [1966788,1966949) | [216166/3,216649/3) | full | full |
| 3891 | semantic-utterance-003891 | "い" | [1966949,1966969) | [1966949,1966969) | [216649/3,216709/3) | full | full |
| 3892 | semantic-utterance-003892 | "つ" | [1966969,1966989) | [1966969,1966989) | [216709/3,216769/3) | full | full |
| 3893 | semantic-utterance-003893 | "走" | [1966989,1967129) | [1966989,1967129) | [216769/3,217189/3) | full | full |
| 3894 | semantic-utterance-003894 | "り" | [1967129,1967149) | [1967129,1967149) | [217189/3,217249/3) | full | full |
| 3895 | semantic-utterance-003895 | "で" | [1967149,1967309) | [1967149,1967309) | [217249/3,217729/3) | full | full |
| 3896 | semantic-utterance-003896 | "こ" | [1967309,1967409) | [1967309,1967409) | [217729/3,218029/3) | full | full |
| 3897 | semantic-utterance-003897 | "れ" | [1967409,1967529) | [1967409,1967529) | [218029/3,218389/3) | full | full |
| 3898 | semantic-utterance-003898 | "だ" | [1967529,1967669) | [1967529,1967669) | [218389/3,218809/3) | full | full |
| 3899 | semantic-utterance-003899 | "よ" | [1967669,1967689) | [1967669,1967689) | [218809/3,218869/3) | full | full |
| 3900 | semantic-utterance-003900 | "こ" | [1967689,1969330) | [1967689,1969330) | [218869/3,223792/3) | full | full |
| 3901 | semantic-utterance-003901 | "い" | [1969330,1969350) | [1969330,1969350) | [223792/3,223852/3) | full | full |
| 3902 | semantic-utterance-003902 | "つ" | [1969350,1969571) | [1969350,1969571) | [223852/3,224515/3) | full | full |
| 3903 | semantic-utterance-003903 | "走" | [1969571,1969591) | [1969571,1969591) | [224515/3,224575/3) | full | full |
| 3904 | semantic-utterance-003904 | "り" | [1969591,1969611) | [1969591,1969611) | [224575/3,224635/3) | full | full |
| 3905 | semantic-utterance-003905 | "で" | [1969611,1969651) | [1969611,1969651) | [224635/3,224755/3) | full | full |
| 3906 | semantic-utterance-003906 | "こ" | [1969651,1969671) | [1969651,1969671) | [224755/3,224815/3) | full | full |
| 3907 | semantic-utterance-003907 | "れ" | [1969671,1969691) | [1969671,1969691) | [224815/3,224875/3) | full | full |
| 3908 | semantic-utterance-003908 | "な" | [1969691,1969711) | [1969691,1969711) | [224875/3,224935/3) | full | full |
| 3909 | semantic-utterance-003909 | "ん" | [1969711,1969751) | [1969711,1969751) | [224935/3,225055/3) | full | full |
| 3910 | semantic-utterance-003910 | "だ" | [1969751,1969771) | [1969751,1969771) | [225055/3,225115/3) | full | full |
| 3911 | semantic-utterance-003911 | "け" | [1969771,1969791) | [1969771,1969791) | [225115/3,225175/3) | full | full |
| 3912 | semantic-utterance-003912 | "ど" | [1969791,1969811) | [1969791,1969811) | [225175/3,225235/3) | full | full |
| 3913 | semantic-utterance-003913 | "だ" | [1969811,1969831) | [1969811,1969831) | [225235/3,225295/3) | full | full |
| 3914 | semantic-utterance-003914 | "か" | [1969831,1969951) | [1969831,1969951) | [225295/3,225655/3) | full | full |
| 3915 | semantic-utterance-003915 | "ら" | [1969951,1969971) | [1969951,1969971) | [225655/3,225715/3) | full | full |
| 3916 | semantic-utterance-003916 | "こ" | [1969971,1970031) | [1969971,1970031) | [225715/3,225895/3) | full | full |
| 3917 | semantic-utterance-003917 | "っ" | [1970031,1970051) | [1970031,1970051) | [225895/3,225955/3) | full | full |
| 3918 | semantic-utterance-003918 | "ち" | [1970051,1970071) | [1970051,1970071) | [225955/3,226015/3) | full | full |
| 3919 | semantic-utterance-003919 | "に" | [1970071,1970091) | [1970071,1970091) | [226015/3,226075/3) | full | full |
| 3920 | semantic-utterance-003920 | "行" | [1970091,1970111) | [1970091,1970111) | [226075/3,226135/3) | full | full |
| 3921 | semantic-utterance-003921 | "け" | [1970111,1970171) | [1970111,1970171) | [226135/3,226315/3) | full | full |
| 3922 | semantic-utterance-003922 | "な" | [1970171,1970191) | [1970171,1970191) | [226315/3,226375/3) | full | full |
| 3923 | semantic-utterance-003923 | "っ" | [1970191,1970211) | [1970191,1970211) | [226375/3,226435/3) | full | full |
| 3924 | semantic-utterance-003924 | "て" | [1970211,1970231) | [1970211,1970231) | [226435/3,226495/3) | full | full |
| 3925 | semantic-utterance-003925 | "こ" | [1970231,1970251) | [1970231,1970251) | [226495/3,226555/3) | full | full |
| 3926 | semantic-utterance-003926 | "と" | [1970251,1970351) | [1970251,1970351) | [226555/3,226855/3) | full | full |
| 3927 | semantic-utterance-003927 | "だ" | [1970351,1970371) | [1970351,1970371) | [226855/3,226915/3) | full | full |
| 3928 | semantic-utterance-003928 | "な" | [1970371,1970511) | [1970371,1970511) | [226915/3,227335/3) | full | full |
| 3929 | semantic-utterance-003929 | "う" | [1970511,1974014) | [1970511,1974014) | [227335/3,237844/3) | full | full |
| 3930 | semantic-utterance-003930 | "ん" | [1974014,1974034) | [1974014,1974034) | [237844/3,237904/3) | full | full |
| 3931 | semantic-utterance-003931 | "お" | [1984756,1984876) | [1984756,1984876) | [270070/3,270430/3) | full | full |
| 3932 | semantic-utterance-003932 | "い" | [1984876,1984896) | [1984876,1984896) | [270430/3,270490/3) | full | full |
| 3933 | semantic-utterance-003933 | "、" | [1984896,1984916) | [1984896,1984916) | [270490/3,270550/3) | full | full |
| 3934 | semantic-utterance-003934 | "急" | [1984916,1984936) | [1984916,1984936) | [270550/3,270610/3) | full | full |
| 3935 | semantic-utterance-003935 | "に" | [1984936,1985036) | [1984936,1985036) | [270610/3,270910/3) | full | full |
| 3936 | semantic-utterance-003936 | "速" | [1985036,1988743) | [1985036,1988743) | [270910/3,282031/3) | full | full |
| 3937 | semantic-utterance-003937 | "く" | [1988743,1988763) | [1988743,1988763) | [282031/3,282091/3) | full | full |
| 3938 | semantic-utterance-003938 | "な" | [1988763,1988883) | [1988763,1988883) | [282091/3,282451/3) | full | full |
| 3939 | semantic-utterance-003939 | "っ" | [1988883,1989003) | [1988883,1989003) | [282451/3,282811/3) | full | full |
| 3940 | semantic-utterance-003940 | "た" | [1989003,1989023) | [1989003,1989023) | [282811/3,282871/3) | full | full |
| 3941 | semantic-utterance-003941 | "!" | [1989023,1989043) | [1989023,1989043) | [282871/3,282931/3) | full | full |
| 3942 | semantic-utterance-003942 | "お" | [1989043,1989144) | [1989043,1989144) | [282931/3,283234/3) | full | full |
| 3943 | semantic-utterance-003943 | "い" | [1989144,1989164) | [1989144,1989164) | [283234/3,283294/3) | full | full |
| 3944 | semantic-utterance-003944 | "、" | [1989164,1989184) | [1989164,1989184) | [283294/3,283354/3) | full | full |
| 3945 | semantic-utterance-003945 | "急" | [1989184,1989404) | [1989184,1989404) | [283354/3,284014/3) | full | full |
| 3946 | semantic-utterance-003946 | "に" | [1989404,1989484) | [1989404,1989484) | [284014/3,284254/3) | full | full |
| 3947 | semantic-utterance-003947 | "速" | [1989484,1989504) | [1989484,1989504) | [284254/3,284314/3) | full | full |
| 3948 | semantic-utterance-003948 | "く" | [1989504,1991608) | [1989504,1991608) | [284314/3,290626/3) | full | full |
| 3949 | semantic-utterance-003949 | "な" | [1991608,1994754) | [1991608,1994754) | [290626/3,300064/3) | full | full |
| 3950 | semantic-utterance-003950 | "っ" | [1994754,1994794) | [1994754,1994794) | [300064/3,300184/3) | full | full |
| 3951 | semantic-utterance-003951 | "た" | [1994794,1994954) | [1994794,1994954) | [300184/3,300664/3) | full | full |
| 3952 | semantic-utterance-003952 | "!" | [1994954,1994974) | [1994954,1994974) | [300664/3,300724/3) | full | full |
| 3953 | semantic-utterance-003953 | "な" | [2015191,2015211) | [2015191,2015211) | [361375/3,361435/3) | full | full |
| 3954 | semantic-utterance-003954 | "ん" | [2015211,2015492) | [2015211,6045698/3) | [361435/3,120500) | partial | outside |

</details>

<details>
<summary>item-0005 / segment-0001 — 44 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 51 | semantic-utterance-000051 | "ゃ" | [214410,214590) | [214416,214590) | [0,174) | partial | full |
| 52 | semantic-utterance-000052 | "ん" | [214590,214872) | [214590,214872) | [174,456) | full | full |
| 53 | semantic-utterance-000053 | "ぶ" | [214872,215133) | [214872,215133) | [456,717) | full | full |
| 54 | semantic-utterance-000054 | "ん" | [215133,215153) | [215133,215153) | [717,737) | full | full |
| 55 | semantic-utterance-000055 | "ぶ" | [215153,215173) | [215153,215173) | [737,757) | full | full |
| 56 | semantic-utterance-000056 | "ん" | [215173,215193) | [215173,215193) | [757,777) | full | full |
| 57 | semantic-utterance-000057 | "ち" | [215193,215213) | [215193,215213) | [777,797) | full | full |
| 58 | semantic-utterance-000058 | "ゃ" | [215213,215695) | [215213,215695) | [797,1279) | full | full |
| 59 | semantic-utterance-000059 | "ん" | [215695,215936) | [215695,215936) | [1279,1520) | full | full |
| 60 | semantic-utterance-000060 | "ぶ" | [215936,215956) | [215936,215956) | [1520,1540) | full | full |
| 61 | semantic-utterance-000061 | "ん" | [215956,215976) | [215956,215976) | [1540,1560) | full | full |
| 62 | semantic-utterance-000062 | "ぶ" | [215976,215996) | [215976,215996) | [1560,1580) | full | full |
| 63 | semantic-utterance-000063 | "ん" | [215996,216096) | [215996,216096) | [1580,1680) | full | full |
| 64 | semantic-utterance-000064 | "ち" | [216096,216116) | [216096,216116) | [1680,1700) | full | full |
| 65 | semantic-utterance-000065 | "ゃ" | [216116,216538) | [216116,216538) | [1700,2122) | full | full |
| 66 | semantic-utterance-000066 | "ん" | [216538,216558) | [216538,216558) | [2122,2142) | full | full |
| 67 | semantic-utterance-000067 | "今" | [249378,249758) | [249378,249758) | [34962,35342) | full | full |
| 68 | semantic-utterance-000068 | "年" | [249758,250219) | [249758,250219) | [35342,35803) | full | full |
| 69 | semantic-utterance-000069 | "一" | [250219,251500) | [250219,251500) | [35803,37084) | full | full |
| 70 | semantic-utterance-000070 | "怖" | [251500,251720) | [251500,251720) | [37084,37304) | full | full |
| 71 | semantic-utterance-000071 | "い" | [251720,251901) | [251720,251901) | [37304,37485) | full | full |
| 72 | semantic-utterance-000072 | "と" | [251901,252081) | [251901,252081) | [37485,37665) | full | full |
| 73 | semantic-utterance-000073 | "言" | [252081,252181) | [252081,252181) | [37665,37765) | full | full |
| 74 | semantic-utterance-000074 | "わ" | [252181,252341) | [252181,252341) | [37765,37925) | full | full |
| 75 | semantic-utterance-000075 | "れ" | [252341,252501) | [252341,252501) | [37925,38085) | full | full |
| 76 | semantic-utterance-000076 | "る" | [252501,253222) | [252501,253222) | [38085,38806) | full | full |
| 77 | semantic-utterance-000077 | "ホ" | [253222,253522) | [253222,253522) | [38806,39106) | full | full |
| 78 | semantic-utterance-000078 | "ラ" | [253522,253803) | [253522,253803) | [39106,39387) | full | full |
| 79 | semantic-utterance-000079 | "ー" | [253803,254043) | [253803,254043) | [39387,39627) | full | full |
| 80 | semantic-utterance-000080 | "ゲ" | [254043,254223) | [254043,254223) | [39627,39807) | full | full |
| 81 | semantic-utterance-000081 | "ー" | [254223,254483) | [254223,254483) | [39807,40067) | full | full |
| 82 | semantic-utterance-000082 | "ム" | [254483,255324) | [254483,255324) | [40067,40908) | full | full |
| 83 | semantic-utterance-000083 | "ハ" | [255324,255545) | [255324,255545) | [40908,41129) | full | full |
| 84 | semantic-utterance-000084 | "リ" | [255545,255785) | [255545,255785) | [41129,41369) | full | full |
| 85 | semantic-utterance-000085 | "チ" | [255785,255805) | [255785,255805) | [41369,41389) | full | full |
| 86 | semantic-utterance-000086 | "鬼" | [255805,257086) | [255805,257086) | [41389,42670) | full | full |
| 87 | semantic-utterance-000087 | "の" | [257086,260230) | [257086,260230) | [42670,45814) | full | full |
| 88 | semantic-utterance-000088 | "子" | [260230,264574) | [260230,264574) | [45814,50158) | full | full |
| 89 | semantic-utterance-000089 | "供" | [264574,264594) | [264574,264594) | [50158,50178) | full | full |
| 90 | semantic-utterance-000090 | "の" | [264594,264734) | [264594,264734) | [50178,50318) | full | full |
| 91 | semantic-utterance-000091 | "母" | [264734,264754) | [264734,264754) | [50318,50338) | full | full |
| 92 | semantic-utterance-000092 | "ハ" | [264754,264995) | [264754,264995) | [50338,50579) | full | full |
| 93 | semantic-utterance-000093 | "リ" | [264995,265015) | [264995,265015) | [50579,50599) | full | outside |
| 94 | semantic-utterance-000094 | "チ" | [265015,265115) | [265015,265016) | [50599,50600) | partial | outside |

</details>

<details>
<summary>item-0005 / segment-0002 — 135 ID</summary>

| 順序 | 正式発話ID | 本文 | 正式元ms | 対応元ms | 探索ms | frame内 | 指定内 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10564 | semantic-utterance-010564 | "た" | [6099087,6100808) | [18297298/3,6100808) | [151850/3,156976/3) | partial | full |
| 10565 | semantic-utterance-010565 | "し" | [6100808,6104451) | [6100808,6104451) | [156976/3,167905/3) | full | full |
| 10566 | semantic-utterance-010566 | "あ" | [6104451,6104591) | [6104451,6104591) | [167905/3,168325/3) | full | full |
| 10567 | semantic-utterance-010567 | "ー" | [6104591,6104771) | [6104591,6104771) | [168325/3,168865/3) | full | full |
| 10568 | semantic-utterance-010568 | "お" | [6104771,6104791) | [6104771,6104791) | [168865/3,168925/3) | full | full |
| 10569 | semantic-utterance-010569 | "も" | [6104791,6104871) | [6104791,6104871) | [168925/3,169165/3) | full | full |
| 10570 | semantic-utterance-010570 | "ろ" | [6104871,6107292) | [6104871,6107292) | [169165/3,176428/3) | full | full |
| 10571 | semantic-utterance-010571 | "か" | [6107292,6107312) | [6107292,6107312) | [176428/3,176488/3) | full | full |
| 10572 | semantic-utterance-010572 | "っ" | [6107312,6107332) | [6107312,6107332) | [176488/3,176548/3) | full | full |
| 10573 | semantic-utterance-010573 | "た" | [6107332,6107512) | [6107332,6107512) | [176548/3,177088/3) | full | full |
| 10574 | semantic-utterance-010574 | "怖" | [6107512,6107532) | [6107512,6107532) | [177088/3,177148/3) | full | full |
| 10575 | semantic-utterance-010575 | "い" | [6107532,6107612) | [6107532,6107612) | [177148/3,177388/3) | full | full |
| 10576 | semantic-utterance-010576 | "や" | [6107612,6107833) | [6107612,6107833) | [177388/3,178051/3) | full | full |
| 10577 | semantic-utterance-010577 | "っ" | [6107833,6107853) | [6107833,6107853) | [178051/3,178111/3) | full | full |
| 10578 | semantic-utterance-010578 | "ぱ" | [6107853,6107993) | [6107853,6107993) | [178111/3,178531/3) | full | full |
| 10579 | semantic-utterance-010579 | "り" | [6107993,6109153) | [6107993,6109153) | [178531/3,182011/3) | full | full |
| 10580 | semantic-utterance-010580 | "ホ" | [6109153,6109333) | [6109153,6109333) | [182011/3,182551/3) | full | full |
| 10581 | semantic-utterance-010581 | "ラ" | [6109333,6109514) | [6109333,6109514) | [182551/3,183094/3) | full | full |
| 10582 | semantic-utterance-010582 | "ー" | [6109514,6109734) | [6109514,6109734) | [183094/3,183754/3) | full | full |
| 10583 | semantic-utterance-010583 | "ゲ" | [6109734,6109914) | [6109734,6109914) | [183754/3,184294/3) | full | full |
| 10584 | semantic-utterance-010584 | "ー" | [6109914,6110294) | [6109914,6110294) | [184294/3,185434/3) | full | full |
| 10585 | semantic-utterance-010585 | "い" | [6110294,6110454) | [6110294,6110454) | [185434/3,185914/3) | full | full |
| 10586 | semantic-utterance-010586 | "ろ" | [6110454,6110714) | [6110454,6110714) | [185914/3,186694/3) | full | full |
| 10587 | semantic-utterance-010587 | "ん" | [6110714,6110734) | [6110714,6110734) | [186694/3,186754/3) | full | full |
| 10588 | semantic-utterance-010588 | "な" | [6110734,6110934) | [6110734,6110934) | [186754/3,187354/3) | full | full |
| 10589 | semantic-utterance-010589 | "の" | [6110934,6110954) | [6110934,6110954) | [187354/3,187414/3) | full | full |
| 10590 | semantic-utterance-010590 | "を" | [6110954,6111195) | [6110954,6111195) | [187414/3,188137/3) | full | full |
| 10591 | semantic-utterance-010591 | "や" | [6111195,6111375) | [6111195,6111375) | [188137/3,188677/3) | full | full |
| 10592 | semantic-utterance-010592 | "っ" | [6111375,6111395) | [6111375,6111395) | [188677/3,188737/3) | full | full |
| 10593 | semantic-utterance-010593 | "て" | [6111395,6111555) | [6111395,6111555) | [188737/3,189217/3) | full | full |
| 10594 | semantic-utterance-010594 | "き" | [6111555,6111635) | [6111555,6111635) | [189217/3,189457/3) | full | full |
| 10595 | semantic-utterance-010595 | "た" | [6111635,6111835) | [6111635,6111835) | [189457/3,190057/3) | full | full |
| 10596 | semantic-utterance-010596 | "け" | [6111835,6111975) | [6111835,6111975) | [190057/3,190477/3) | full | full |
| 10597 | semantic-utterance-010597 | "ど" | [6111975,6112856) | [6111975,6112856) | [190477/3,193120/3) | full | full |
| 10598 | semantic-utterance-010598 | "怖" | [6112856,6113116) | [6112856,6113116) | [193120/3,193900/3) | full | full |
| 10599 | semantic-utterance-010599 | "い" | [6113116,6113396) | [6113116,6113396) | [193900/3,194740/3) | full | full |
| 10600 | semantic-utterance-010600 | "も" | [6113396,6113636) | [6113396,6113636) | [194740/3,195460/3) | full | full |
| 10601 | semantic-utterance-010601 | "ん" | [6113636,6113656) | [6113636,6113656) | [195460/3,195520/3) | full | full |
| 10602 | semantic-utterance-010602 | "は" | [6113656,6113856) | [6113656,6113856) | [195520/3,196120/3) | full | full |
| 10603 | semantic-utterance-010603 | "怖" | [6113856,6114236) | [6113856,6114236) | [196120/3,197260/3) | full | full |
| 10604 | semantic-utterance-010604 | "い" | [6114236,6114357) | [6114236,6114357) | [197260/3,197623/3) | full | full |
| 10605 | semantic-utterance-010605 | "ね" | [6114357,6118639) | [6114357,6118639) | [197623/3,210469/3) | full | full |
| 10606 | semantic-utterance-010606 | "あ" | [6118639,6118859) | [6118639,6118859) | [210469/3,211129/3) | full | full |
| 10607 | semantic-utterance-010607 | "イ" | [6118859,6118979) | [6118859,6118979) | [211129/3,211489/3) | full | full |
| 10608 | semantic-utterance-010608 | "ン" | [6118979,6119240) | [6118979,6119240) | [211489/3,212272/3) | full | full |
| 10609 | semantic-utterance-010609 | "ド" | [6119240,6119440) | [6119240,6119440) | [212272/3,212872/3) | full | full |
| 10610 | semantic-utterance-010610 | "経" | [6119440,6119760) | [6119440,6119760) | [212872/3,213832/3) | full | full |
| 10611 | semantic-utterance-010611 | "由" | [6119760,6119780) | [6119760,6119780) | [213832/3,213892/3) | full | full |
| 10612 | semantic-utterance-010612 | "の" | [6119780,6119800) | [6119780,6119800) | [213892/3,213952/3) | full | full |
| 10613 | semantic-utterance-010613 | "あ" | [6120446,6120826) | [6120446,6120826) | [215890/3,217030/3) | full | full |
| 10614 | semantic-utterance-010614 | "そ" | [6120826,6120846) | [6120826,6120846) | [217030/3,217090/3) | full | full |
| 10615 | semantic-utterance-010615 | "う" | [6120846,6121126) | [6120846,6121126) | [217090/3,217930/3) | full | full |
| 10616 | semantic-utterance-010616 | "な" | [6121126,6121147) | [6121126,6121147) | [217930/3,217993/3) | full | full |
| 10617 | semantic-utterance-010617 | "ん" | [6121147,6121447) | [6121147,6121447) | [217993/3,218893/3) | full | full |
| 10618 | semantic-utterance-010618 | "だ" | [6121447,6126289) | [6121447,6126289) | [218893/3,233419/3) | full | full |
| 10619 | semantic-utterance-010619 | "い" | [6126289,6126309) | [6126289,6126309) | [233419/3,233479/3) | full | full |
| 10620 | semantic-utterance-010620 | "や" | [6126309,6126329) | [6126309,6126329) | [233479/3,233539/3) | full | full |
| 10621 | semantic-utterance-010621 | "お" | [6126329,6126349) | [6126329,6126349) | [233539/3,233599/3) | full | full |
| 10622 | semantic-utterance-010622 | "も" | [6126349,6126789) | [6126349,6126789) | [233599/3,234919/3) | full | full |
| 10623 | semantic-utterance-010623 | "ろ" | [6126789,6126809) | [6126789,6126809) | [234919/3,234979/3) | full | full |
| 10624 | semantic-utterance-010624 | "い" | [6126809,6127109) | [6126809,6127109) | [234979/3,235879/3) | full | full |
| 10625 | semantic-utterance-010625 | "や" | [6127109,6127349) | [6127109,6127349) | [235879/3,236599/3) | full | full |
| 10626 | semantic-utterance-010626 | "っ" | [6127349,6127369) | [6127349,6127369) | [236599/3,236659/3) | full | full |
| 10627 | semantic-utterance-010627 | "ぱ" | [6127369,6127469) | [6127369,6127469) | [236659/3,236959/3) | full | full |
| 10628 | semantic-utterance-010628 | "夏" | [6127469,6127489) | [6127469,6127489) | [236959/3,237019/3) | full | full |
| 10629 | semantic-utterance-010629 | "は" | [6127489,6127690) | [6127489,6127690) | [237019/3,237622/3) | full | full |
| 10630 | semantic-utterance-010630 | "ホ" | [6127690,6127830) | [6127690,6127830) | [237622/3,238042/3) | full | full |
| 10631 | semantic-utterance-010631 | "ラ" | [6127830,6128050) | [6127830,6128050) | [238042/3,238702/3) | full | full |
| 10632 | semantic-utterance-010632 | "ゲ" | [6128050,6128190) | [6128050,6128190) | [238702/3,239122/3) | full | full |
| 10633 | semantic-utterance-010633 | "ー" | [6128190,6128310) | [6128190,6128310) | [239122/3,239482/3) | full | full |
| 10634 | semantic-utterance-010634 | "に" | [6128310,6128330) | [6128310,6128330) | [239482/3,239542/3) | full | full |
| 10635 | semantic-utterance-010635 | "限" | [6128330,6128350) | [6128330,6128350) | [239542/3,239602/3) | full | full |
| 10636 | semantic-utterance-010636 | "り" | [6128350,6128510) | [6128350,6128510) | [239602/3,240082/3) | full | full |
| 10637 | semantic-utterance-010637 | "ま" | [6128510,6128530) | [6128510,6128530) | [240082/3,240142/3) | full | full |
| 10638 | semantic-utterance-010638 | "す" | [6128530,6128710) | [6128530,6128710) | [240142/3,240682/3) | full | full |
| 10639 | semantic-utterance-010639 | "楽" | [6128710,6128730) | [6128710,6128730) | [240682/3,240742/3) | full | full |
| 10640 | semantic-utterance-010640 | "し" | [6128730,6128990) | [6128730,6128990) | [240742/3,241522/3) | full | full |
| 10641 | semantic-utterance-010641 | "か" | [6128990,6129010) | [6128990,6129010) | [241522/3,241582/3) | full | full |
| 10642 | semantic-utterance-010642 | "っ" | [6129010,6130211) | [6129010,6130211) | [241582/3,245185/3) | full | full |
| 10643 | semantic-utterance-010643 | "た" | [6130211,6134433) | [6130211,6134433) | [245185/3,257851/3) | full | full |
| 10644 | semantic-utterance-010644 | "首" | [6134433,6134453) | [6134433,6134453) | [257851/3,257911/3) | full | full |
| 10645 | semantic-utterance-010645 | "痛" | [6134453,6134473) | [6134453,6134473) | [257911/3,257971/3) | full | full |
| 10646 | semantic-utterance-010646 | "え" | [6134473,6137594) | [6134473,6137594) | [257971/3,267334/3) | full | full |
| 10647 | semantic-utterance-010647 | "叫" | [6137594,6137614) | [6137594,6137614) | [267334/3,267394/3) | full | full |
| 10648 | semantic-utterance-010648 | "ん" | [6137614,6137754) | [6137614,6137754) | [267394/3,267814/3) | full | full |
| 10649 | semantic-utterance-010649 | "だ" | [6137754,6137774) | [6137754,6137774) | [267814/3,267874/3) | full | full |
| 10650 | semantic-utterance-010650 | "ね" | [6137774,6138074) | [6137774,6138074) | [267874/3,268774/3) | full | full |
| 10651 | semantic-utterance-010651 | "今" | [6138074,6138094) | [6138074,6138094) | [268774/3,268834/3) | full | full |
| 10652 | semantic-utterance-010652 | "日" | [6138094,6138875) | [6138094,6138875) | [268834/3,271177/3) | full | full |
| 10653 | semantic-utterance-010653 | "こ" | [6138875,6138895) | [6138875,6138895) | [271177/3,271237/3) | full | full |
| 10654 | semantic-utterance-010654 | "の" | [6138895,6138915) | [6138895,6138915) | [271237/3,271297/3) | full | full |
| 10655 | semantic-utterance-010655 | "ハ" | [6138915,6139015) | [6138915,6139015) | [271297/3,271597/3) | full | full |
| 10656 | semantic-utterance-010656 | "リ" | [6139015,6139155) | [6139015,6139155) | [271597/3,272017/3) | full | full |
| 10657 | semantic-utterance-010657 | "チ" | [6139155,6139175) | [6139155,6139175) | [272017/3,272077/3) | full | full |
| 10658 | semantic-utterance-010658 | "は" | [6139175,6139195) | [6139175,6139195) | [272077/3,272137/3) | full | full |
| 10659 | semantic-utterance-010659 | "よ" | [6139195,6139395) | [6139195,6139395) | [272137/3,272737/3) | full | full |
| 10660 | semantic-utterance-010660 | "く" | [6139395,6139855) | [6139395,6139855) | [272737/3,274117/3) | full | full |
| 10661 | semantic-utterance-010661 | "叫" | [6139855,6140075) | [6139855,6140075) | [274117/3,274777/3) | full | full |
| 10662 | semantic-utterance-010662 | "ん" | [6140075,6140095) | [6140075,6140095) | [274777/3,274837/3) | full | full |
| 10663 | semantic-utterance-010663 | "だ" | [6140095,6141616) | [6140095,6141616) | [274837/3,279400/3) | full | full |
| 10664 | semantic-utterance-010664 | "わ" | [6141616,6141636) | [6141616,6141636) | [279400/3,279460/3) | full | full |
| 10665 | semantic-utterance-010665 | "ギ" | [6141636,6141656) | [6141636,6141656) | [279460/3,279520/3) | full | full |
| 10666 | semantic-utterance-010666 | "ャ" | [6141656,6141776) | [6141656,6141776) | [279520/3,279880/3) | full | full |
| 10667 | semantic-utterance-010667 | "ー" | [6141776,6141876) | [6141776,6141876) | [279880/3,280180/3) | full | full |
| 10668 | semantic-utterance-010668 | "ギ" | [6141876,6141936) | [6141876,6141936) | [280180/3,280360/3) | full | full |
| 10669 | semantic-utterance-010669 | "ャ" | [6141936,6141976) | [6141936,6141976) | [280360/3,280480/3) | full | full |
| 10670 | semantic-utterance-010670 | "ー" | [6141976,6142096) | [6141976,6142096) | [280480/3,280840/3) | full | full |
| 10671 | semantic-utterance-010671 | "ギ" | [6142096,6142156) | [6142096,6142156) | [280840/3,281020/3) | full | full |
| 10672 | semantic-utterance-010672 | "ャ" | [6142156,6142216) | [6142156,6142216) | [281020/3,281200/3) | full | full |
| 10673 | semantic-utterance-010673 | "ー" | [6142216,6142296) | [6142216,6142296) | [281200/3,281440/3) | full | full |
| 10674 | semantic-utterance-010674 | "ギ" | [6142296,6142336) | [6142296,6142336) | [281440/3,281560/3) | full | full |
| 10675 | semantic-utterance-010675 | "ャ" | [6142336,6142476) | [6142336,6142476) | [281560/3,281980/3) | full | full |
| 10676 | semantic-utterance-010676 | "ー" | [6142476,6142496) | [6142476,6142496) | [281980/3,282040/3) | full | full |
| 10677 | semantic-utterance-010677 | "言" | [6142496,6142517) | [6142496,6142517) | [282040/3,282103/3) | full | full |
| 10678 | semantic-utterance-010678 | "い" | [6142517,6142617) | [6142517,6142617) | [282103/3,282403/3) | full | full |
| 10679 | semantic-utterance-010679 | "な" | [6142617,6142637) | [6142617,6142637) | [282403/3,282463/3) | full | full |
| 10680 | semantic-utterance-010680 | "が" | [6142637,6142757) | [6142637,6142757) | [282463/3,282823/3) | full | full |
| 10681 | semantic-utterance-010681 | "ら" | [6142757,6142937) | [6142757,6142937) | [282823/3,283363/3) | full | full |
| 10682 | semantic-utterance-010682 | "で" | [6142937,6142957) | [6142937,6142957) | [283363/3,283423/3) | full | full |
| 10683 | semantic-utterance-010683 | "き" | [6142957,6143197) | [6142957,6143197) | [283423/3,284143/3) | full | full |
| 10684 | semantic-utterance-010684 | "た" | [6143197,6146618) | [6143197,6146618) | [284143/3,294406/3) | full | full |
| 10685 | semantic-utterance-010685 | "お" | [6146618,6146638) | [6146618,6146638) | [294406/3,294466/3) | full | full |
| 10686 | semantic-utterance-010686 | "も" | [6146638,6146919) | [6146638,6146919) | [294466/3,295309/3) | full | full |
| 10687 | semantic-utterance-010687 | "ろ" | [6146919,6147139) | [6146919,6147139) | [295309/3,295969/3) | full | full |
| 10688 | semantic-utterance-010688 | "ピ" | [6147139,6147339) | [6147139,6147339) | [295969/3,296569/3) | full | full |
| 10689 | semantic-utterance-010689 | "カ" | [6147339,6147659) | [6147339,6147659) | [296569/3,297529/3) | full | full |
| 10690 | semantic-utterance-010690 | "タ" | [6147659,6147679) | [6147659,6147679) | [297529/3,297589/3) | full | full |
| 10691 | semantic-utterance-010691 | "で" | [6147679,6147979) | [6147679,6147979) | [297589/3,298489/3) | full | full |
| 10692 | semantic-utterance-010692 | "す" | [6147979,6147999) | [6147979,6147999) | [298489/3,298549/3) | full | full |
| 10693 | semantic-utterance-010693 | "オ" | [6147999,6149500) | [6147999,6149500) | [298549/3,303052/3) | full | full |
| 10694 | semantic-utterance-010694 | "ッ" | [6149500,6149720) | [6149500,6149720) | [303052/3,303712/3) | full | full |
| 10695 | semantic-utterance-010695 | "ケ" | [6149720,6149740) | [6149720,6149740) | [303712/3,303772/3) | full | full |
| 10696 | semantic-utterance-010696 | "ー" | [6149740,6149760) | [6149740,6149760) | [303772/3,303832/3) | full | full |
| 10697 | semantic-utterance-010697 | "ま" | [6153114,6153435) | [6153114,6153435) | [313894/3,314857/3) | full | full |
| 10698 | semantic-utterance-010698 | "た" | [6153435,6153455) | [6153435,18460348/3) | [314857/3,314900/3) | partial | outside |

</details>
