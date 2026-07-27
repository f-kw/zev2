# Liar's Bar 一般性実証 着手準備レポート v001

- 日付: 2026-07-27
- 対象元配信: 宝鐘マリン `qdczJpv8RCc`
- 対象fixture: `nE_bNeBNp4E_multiblock_material_v001`
- 調査基準: `cfa7811c917892fccd39edf9c85aa6e3af2dde97`
- 実施範囲: 読み取りとSHA-256再計算だけ
- 未実施: 外部通信、実装、正式成果物生成、動画生成
- 人間作業: 本調査そのものは0件

## 結論

Liar's Barの一般性実証に必要な元動画、全域STT、チャット、67候補、ランキング、人間確認済みの4候補と外側境界は揃っている。

candidate 13の経路を別素材へ通すうえで、実装が新たに必要なのは主に次の3箇所である。

1. 素材・候補を入力として受ける、source identity、内部詰め確認、正式組立決定の入口
2. 新素材の最大有効回答を初回だけtoken計測し、B5へ渡す入口
3. B5の固定requestからB1受入、B4表示計画までをjob入力で結ぶB6実行入口

基礎映像、残存発話、行末候補、B3 package、B5のrequest構築、B4変換、v003描画とQCの中核は、候補ごとの新しいjob・期待値・SHAを用意すれば再利用できる見込みである。ただし現行B5 v004は、同じ入力について過去に計測済みの「最大有効回答」を要求する再利用型であり、Liar's Barの初回計測そのものは行えない。

最初の一本は **candidate 59「マリンのADHD的？な片付け事情と無意識の脱衣」** を推奨する。別元配信への配管移行だけを最小負荷で確かめられるからである。複数人の掛け合いまで一度に試すならcandidate 47の方が強いが、最初から別の変数を同時に増やすため次点とする。

## 1. 確認できた既存資産

### 1.1 元媒体とSTT

| 資産 | path | SHA-256 / 実測 |
| --- | --- | --- |
| 元配信動画 | `evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4` | `8359f59d8c205fb815c9165f5a464ec4bb9f109f9d91384b80e571410dc2fa25` |
| 元配信情報 | `evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.info.json` | `68afa6e14fc21b3969a66b2825e19656a697ea36aeb4c4a5c64cdbfe7c22b042` |
| 全域STT manifest | `evals/clip_composition/stt/nE_bNeBNp4E_qdczJpv8RCc_local30_v001/source/manifest.json` | `b96810fc9b453d552b6628c36bbf11b483ad20d31412a6676fd3fbc87f5e1e98` |
| 全域STT文字時刻 | 同directoryの`word-timestamps.json` | `549d5621241ce0bcb25562265e7e481dffc79b613efa9468a167cf8161d66407` |
| 全域STT本文 | 同directoryの`transcript.json` | `5d7e2bf0f821eda23e0c93474e0c66281e3cc5328bf2c5e4bd4368402696799e` |

元動画の実測は1920×1080、60fps、H.264、Opus 48kHz stereo、7,760.401秒、3,288,164,785 byteだった。STT manifestの入力pathはこの同じ元動画を指しており、259/259 chunk、`partial=false`、文字時刻23,963件である。

candidate 13では「人間が確認した旧媒体の音声」と「実行する1080p映像」を対応づける工事が必要だった。Liar's BarではSTT入力と実行候補媒体が最初から同じ実体なので、その媒体移送は要らない。ただし同一性を正式成果物へ記録するsource identityは新たに必要である。

### 1.2 チャット、67候補、ランキング、人間結果

| 資産 | path | SHA-256 / 内容 |
| --- | --- | --- |
| 生チャット | `evals/clip_composition/research/chat-replay/nE_bNeBNp4E/qdczJpv8RCc.live_chat.json` | `cab62f967f87f6aad54b73a2715e4120f7f0b4175e8997f90036aa9d03b784a8` |
| 1分時系列 | `evals/clip_composition/outputs/chat-velocity-analysis/nE_bNeBNp4E-chat-velocity-generalization-20260715-v001-per-minute.csv` | `c9630655504f8cd675f06c3ff7a23f1bb5126e7220740d841b0061d1060b5cc5` |
| 上位100分の入力計画 | `evals/clip_composition/outputs/chat-velocity-analysis/nE_bNeBNp4E-input-selection-v004-chat-top100-plan.json` | `3a083ec36540ebe6a340ba993f53bcd636181e72fd0b18ae977b0f54302a07a5` |
| 67候補の正本 | `evals/clip_composition/outputs/theme-generation/nE_bNeBNp4E_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260715-chat-velocity-top100-third-material-v001/run-01-gemini-output.json` | `c25113e5d3d7b6aa21372718a4f3d857f511cfb632906c02cc444fd4c8d52782`、28窓・67候補 |
| rankingへ渡した67候補 | `evals/clip_composition/outputs/candidate-ranking/20260716-third-material-run1-v002/nE_bNeBNp4E_multiblock_material_v001/prompt-input.json` | `0ee7d84918970d593fcbfbb28693ed143a26f74942fe8148db6b29367ecaa4e6` |
| ranking結果 | `evals/clip_composition/outputs/candidate-ranking/20260716-third-material-run1-v002/result.json` | `6222b7c2827b0db897ffbf9cbb6c4b28f7efb5573fb460816f2adab75a131c54` |
| 人間確認・第1回 | `evals/clip_composition/outputs/human-boundary-trim/20260716-third-material-trial-v002/results/session-1-human-review-20260716-v001.json` | `f7c134bf01efb57302532d01dbab871c7038595cd548333636d424b8819f9052` |
| 人間確認・第2回 | 同directoryの`session-2-human-review-20260716-v001.json` | `b37b39b5bc77a52188a882f95c086bb5c8749467c5414cacbcbf2b6d4ba47fbd` |
| 人間確認・統合結果 | `evals/clip_composition/outputs/human-boundary-trim/20260716-third-material-trial-v002/result.json` | `051744ba7cca752020e41eafe6ceb4c38fdbbcef308ae1fac05f050377f4e243` |

チャットと候補探索は既に終わっているため、今回の組立決定から描画までの経路では再実行不要である。

## 2. candidate 13経路の固着値

分類は次の3つだけを使う。

- **入力で差し替え可能**: 本体処理は共用でき、別のjob・manifest・期待値へ差し替えられる
- **コード・契約に焼き込み**: 別値を渡すだけでは通らず、実装または契約の改訂が要る
- **不明**: 候補選定または正式処理後の実測でしか決まらない

| 値・設定 | candidate 13での状態 | 分類 | Liar's Barで必要なこと |
| --- | --- | --- | --- |
| 元配信ID、candidate ID、題名、外側境界 | `DmWu0jVQfTE`、13、00:32:00.260〜00:33:28.506 | コード・契約に焼き込み | 正式化処理がこの値とpathを検査している。`qdczJpv8RCc`と選定候補を入力にする新入口が要る |
| source identityと媒体対応証明 | DmWu専用の旧音声＋新映像対応、媒体SHA固定 | コード・契約に焼き込み | qdczの単一媒体SHA、STT manifest、文字時刻を束縛する新source identityが要る |
| 正式な採用区間列と正式化処理 | 2区間、間2だけを切る。区間列はデータだが、現行正式化処理はcandidate 13の承認ID、path、SHA、出力IDを固定 | コード・契約に焼き込み | Liar候補の内部詰めを確認し、素材と確認結果を入力にして`unresolvedEdits: []`の区間列を正式化する新入口が要る |
| 基礎映像の元媒体path・SHA・出力先 | build job内の入力 | 入力で差し替え可能 | qdcz元動画、新しい組立決定、新output directoryをjobへ入れる |
| 残存発話のcandidate manifest、組立決定、timeline | jobの参照値 | 入力で差し替え可能 | 新しいsource identityとcandidate manifestができれば同じ抽出器を使う |
| 残存発話354件、3まとまり | candidate 13の正式実測 | 入力で差し替え可能なpreflight値 | Liarで実測し直す。354と3を流用しない |
| Gate Aの行末候補205件と各SHA | candidate 13の正式実測 | 入力で差し替え可能なpreflight値 | Liarで実測し、新jobの期待値へ固定する |
| B3の素材ID、入力SHA、件数、出力先 | package job内の入力 | 入力で差し替え可能 | Liar用jobを作る。B3本体へ候補固有件数は焼き込まれていない |
| 行幅上限36、1まとまり最大2行 | packageと受入処理が36/2だけを受理 | コード・契約に焼き込み | Liarも横型1920×1080なので今回は変更不要。ただし値を差し替えられる一般化の実証にはならない |
| `normal-landscape-readable-pop-v001` | B3、B4、指示書、描画台帳で固定 | コード・契約に焼き込み | 今回は同じ横型プリセットを使える。別プリセット差し替えは今回の実証範囲外 |
| B5の意味入力、出力先、期待件数、request構築 | CLI引数で受け取る | 入力で差し替え可能 | LiarのB3 packageと新しい出力先を渡せる。ただし次行の初回計測が先に要る |
| B5の最大有効回答tokenの初回計測 | v004は過去の計測request・response・token数を必須入力とし、今回構築したrequestとのbyte同一を要求する。初回計測用runnerは現存しない | コード・契約に焼き込み | Liar入力から最大有効回答を構築し、初回だけ`countTokens`へ渡して保存する入口、または同等の版付き二段手順が要る。通信は別承認 |
| B5のモデル、thinking、回答schema | Gemini 3.6 Flash、medium、JSON、Standard省略時既定 | 契約固定だが候補非依存 | 今回は同じ設定を使う。実行日の公式値照合は別の実走ゲートで行う |
| B6のrequest path/SHA、attempt ID、B1/B4 job、package root、出力先 | `run_presentation_caption_gate_b6_v001.mjs`の定数 | コードに焼き込み | 既存正本計算を呼ぶ、job入力式のB6入口が新規に要る |
| B4のsource package、残存発話、基礎映像、timeline、期待件数 | B4 job内の参照 | 入力で差し替え可能 | Liar用jobを作る。プリセットだけは上記の固定値を使う |
| v003描画の表示計画、基礎映像、timeline、出力先 | render job内の参照 | 入力で差し替え可能 | Liar用render jobを作り、既存描画とQCをそのまま使う |
| directory名 | 中間工程の多くはjobの出力値。上流の初回準備・正式化処理とB6 runnerはcandidate 13名、候補ID、入出力directoryをコード固定 | 混在 | 中間jobはLiar名へ差し替える。初回準備・正式化とB6は新入口で入力化する |
| Liarの採用区間数、残存文字数、まとまり数、行末候補数、token数、各SHA | 未生成 | 不明 | 結果を見て後から合わせず、各正式実行前のpreflightで測って固定する |

重要なのは、幅36とプリセットを変えずにLiar's Barを通しても、「別素材を同じ横型で通せる」ことの実証であって、「幅・フォーマット・styleも自由に差し替えられる」ことの実証ではない点である。

## 3. 組立決定から描画までの不足工程

| 順序 | 工程 | 既存資産 | 不足 | 分類 | 人間作業 |
| ---: | --- | --- | --- | --- | --- |
| 1 | 最初の候補を選ぶ | 公開見込み4件と外側境界 | 4件から1件を決める | **人間判断が要る** | 1判断。このレポートだけで選べる |
| 2 | source identityと媒体/STT束縛 | 元動画、STT manifest、文字時刻 | qdczを正式入力として記録する入口 | **新規実装が要る** | 0件 |
| 3 | 内部詰め確認と正式組立決定 | 外側境界、400ms提示規則、candidate 13で確立した確認UX | 素材・候補を入力にするcandidate manifest、確認媒体、正式化 | **新規実装＋人間判断が要る** | 候補別。§4参照 |
| 4 | 基礎映像＋timeline v002 | 汎用builderと検査済みtimeline | 新しいbuild job、期待SHA、出力先 | **既存の版付きjobで済む** | 0件 |
| 5 | 残存source atom | 汎用抽出器 | 新しいjobと実測件数・SHA | **既存の版付きjobで済む** | 0件 |
| 6 | Gate A行末候補 | 汎用の機械区切りとpreflight | 新しいjobと実測期待値 | **既存の版付きjobで済む** | 0件 |
| 7 | B3正式7ファイル | 汎用package生成・検査 | 新しいjobと実測期待値 | **既存の版付きjobで済む** | 0件 |
| 8 | B5最大有効回答の初回token計測 | 最大回答の構築処理はv004内にあるが、v004は過去計測値の再利用型 | 新素材の初回計測入口または同等の版付き二段手順 | **新規実装が要る** | 0件。`countTokens`通信は別承認 |
| 9 | B5 request・入力token診断 | 引数式のrequest構築と検査 | Liarの意味入力、版付き出力、実測期待値 | **工程8成立後は既存中核＋版付きjobで済む** | 0件。`countTokens`通信は別承認 |
| 10 | B6送信→B1→B4連結 | 各正本計算とcandidate 13用runner | path・SHA・attemptをjobで受ける入口 | **新規実装が要る** | 0件 |
| 11 | B4表示計画 | job式変換器 | Liar用jobと期待値 | **既存の版付きjobで済む** | 0件 |
| 12 | v003描画＋QC | job式描画、6項目QC | Liar用render job | **既存の版付きjobで済む** | 0件 |
| 13 | 完成字幕の目視 | candidate 13で確立した「読める・ズレない・欠けない」確認 | Liar完成mp4の最終確認 | **人間判断が要る** | 1判断、完成尺を1回再生 |

### 新規実装を最小にする境界

新しい入口は、既存の正本計算を呼ぶだけにする。

- 工程2〜3では、candidate 13を名指しする旧正式化処理を複製せず、素材ID、候補、媒体、STT、外側境界、確認結果を入力にする。
- 工程8では、候補固有の最大有効回答を初回計測できるようにし、candidate 13の過去計測値を流用しない。
- 工程10では、candidate 13を名指しするB6 runnerを複製せず、B5 request、B3 root、B1/B4 job、出力先をjob入力にする。
- 基礎映像以後の計算、B1受入、B4変換、描画、QCは作り直さない。

## 4. 4候補の比較

400ms以上の間の件数は、現行STT文字時刻を外側境界内で読み取り専用走査した診断値である。candidate 13の2件と同じ数え方だが、自動カット数でも正式正解でもない。人間へ見せる位置数の目安にだけ使う。

| candidate / 題名 | 保存済み外側境界 | 尺 | 400ms以上の間 | 保存済み情報 | 組立時の最低判断数 | 評価 |
| ---: | --- | ---: | ---: | --- | ---: | --- |
| 35 / 友情崩壊？まさかの裏切りにブチギレるマリン | 00:49:35.023〜00:51:59.740 | 144.717秒 | 4 | 発砲・勝利までを外枠に含め、途中を意味的に切る必要あり。完成尺と内部カット位置は未確定 | 5以上 | 最も重い。最初の配管実証には向かない |
| 47 / 戌神ころねファンのリスナーに「浮気」と詰め寄るマリン | 01:08:37.044〜01:09:58.226 | 81.182秒 | 2 | 開始を6.702秒前へ修正。既存教師範囲hit。具体的内部カットは未確定。開始位置がSTT上で6.702秒続く`?`に対応するため、選ぶ場合は境界対応の確認が条件付きで増える | 3以上 | 複数人の掛け合いまで試せる。一般性の第2試験に向く |
| **59 / マリンのADHD的？な片付け事情と無意識の脱衣** | **01:39:01.162〜01:39:52.736** | **51.574秒** | **0** | AI案と人間境界が一致。具体的内部カット指示の保存なし | **1** | **推奨。配管移行を最小負荷で分離して検証できる** |
| 10 / 「なんで」連呼からのロシアンルーレット生存と狂気の勝利宣言 | 00:11:59.480〜00:12:58.214 | 58.734秒 | 2 | 「なんで」の原因となるLIAR発言まで30.766秒前へ拡張。現行STTの開始文字と保存された人間記録の開始文が一致しないため、選ぶ場合は境界対応の確認が条件付きで増える | 3以上 | ゲーム内因果を試せるが、最初の入力より複雑 |

「組立時の最低判断数」は、提示対象の間ごとの判断に最後の組立承認1件を足した数である。candidate 35は意味的な内部間引きが別に必要なため、5件で終わる保証がない。

間1件の人間作業は、場所を探させず見てほしい位置の2秒前へ移動したA/Bを各1回確認して1回答、とする。candidate 13で使った局所比較媒体は57.410秒と58.524秒だったため、目安は**1件あたり約1分の局所再生＋1回答**である。操作込みの壁時計は未計測であり、1分以内を保証する値ではない。最後の組立承認は候補全体を1回再生して1回答である。

| candidate | 間ごとの確認 | 最終組立確認 | 条件付き追加 |
| ---: | --- | --- | --- |
| 35 | 4件以上、各約1分の局所A/B＋1回答 | 144.717秒を1回 | 意味的内部間引きの件数・時間は未確認 |
| 47 | 2件、各約1分の局所A/B＋1回答 | 81.182秒を1回 | 開始位置の媒体/STT対応が機械確認で曖昧なら局所聴取1件 |
| 59 | 0件 | 51.574秒を1回 | 音響終端が機械確認で曖昧なら局所聴取1件 |
| 10 | 2件、各約1分の局所A/B＋1回答 | 58.734秒を1回 | 開始位置の媒体/STT対応が機械確認で曖昧なら局所聴取1件 |

## 5. 推奨と人間作業量

### 推奨

**candidate 59を最初の一本にする。**

理由:

1. 4件で最短の51.574秒
2. 人間の外側境界がAI案から無修正
3. 400ms以上の提示対象が0件
4. 具体的な内部カット指示が保存されていない
5. candidate 13とは別配信者・別元配信・別STT・別映像SHAなので、配管の素材固着は検出できる

限界:

- 単独トーク寄りなので、複数話者・ゲーム内の結果同期まで一度に実証する候補ではない
- その確認は、最初の配管実証後にcandidate 47を使う方が原因を分けやすい
- 末尾のSTT文字が20msと短い。正式組立前に、既知の「STT構造終端と音響終端は同じとは限らない」問題として音響終端を機械確認する。音響でも判断不能な場合だけ局所聴取を人間へ戻す

### candidate 59を選んだ場合

| 人間作業 | 件数 | 1件あたりの目安 |
| --- | ---: | --- |
| 候補選定 | 1 | このレポートを見て1回答。動画再生は不要 |
| 正式組立の最終確認 | 1 | 51.574秒を1回再生して1回答。操作込みで約1分 |
| 完成字幕の目視 | 1 | 完成尺を1回再生して1回答。未カットなら約1分 |
| 音響終端の局所確認 | 条件付き0〜1 | 機械確認が曖昧な場合だけ、終端の数秒を1回聴く |

通常経路は3判断で、候補選定後に必要な再生量は最低103.148秒である。壁時計は未計測なので、全体時間の実績値とは扱わない。

### candidate 47を選んだ場合

- 組立: 間2件＋最終承認1件
- 完成字幕: 1件
- 候補選定後の人間判断は合計4件
- 全編再生の最低量は組立と字幕で162.364秒。これに2箇所の局所確認が加わる

47は一般性の強さでは上だが、ZEV憲法の「人間作業を先に減らす」に従い、最初は59を推奨する。

## 6. 事実・判断・未確認

### 事実

- 元動画、STT、チャット、67候補、ランキング、人間結果は実体とSHAを確認済み
- candidate 13用の正式化処理とB6 runnerには素材名・候補名・path・SHAの固定がある
- B5 v004は新素材のrequestを構築できるが、同じ入力に対する過去の最大有効回答token計測を要求するため、新素材の初回計測入口にはならない
- 基礎映像以後の主要中核はjob入力式で、候補固有件数はpreflight期待値へ分離されている
- candidate 59の外側境界は51.574秒で、現在の400ms規則による提示対象は0件

### 設計判断

- candidate 13専用コードの名前替え複製は一般性実証と扱わず、入力式の入口を3箇所だけ作る
- 最初はcandidate 59で配管の素材固着を検査し、必要なら次にcandidate 47で複数人場面を試す

### 未確認

- candidate 59の正式な採用区間列
- 音響上の終了境界
- 残存文字数、まとまり数、行末候補数、token数、全成果物SHA
- 新素材で基礎映像の音声時計が一度で合格するか
- Liar用B5初回計測入口とB6 job入口の具体的schema

これらは実装前または正式実行前のpreflightで固定すべき値であり、本調査では推測値を置かない。

## 7. 次の人間判断

最初の一本を **candidate 59** で進めるかだけ決めればよい。

承認された場合の次工程は、実装へ直行せず、上記3つの新入口を何ファイルで作るかと、candidate 59の確認媒体で人間に何を1回だけ見てもらうかを明記した最小実装設計の提示である。
