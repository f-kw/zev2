# OpenChatCut研究 — Checkpoint 3：演出対象の判断と描画の境界

確認日：2026-09-16（日本時間）。公開sourceとZEVの既存実装・保存資料の静的読取のみ。

- OpenChatCut対象：[8411023f8411f3c16538c3dab8fee4b7f9e97661](https://github.com/0xsline/OpenChatCut/tree/8411023f8411f3c16538c3dab8fee4b7f9e97661)。対象版を変更していない。
- ZEV作業ツリー：`codex/digest-effects-step2` / `43380006bc4f8e1c902c067dcb53669790b6ce2c`。既存差分を保持した読取。
- ZEV実装の引用は公開済みの`9f8fb04ac440c69466708e7ea529190b573f1089`へ固定する。この版から上記HEADまでの差は9月15日の演出レビュー文書1件だけで、引用する実装に差はない。9月15日レビューはローカルHEADの文書として参照し、その未push commitを今回の研究branchへ取り込まない。
- 本書の【事実】はsourceまたは保存資料の記述、【推論】はZEV向け設計候補、【未確認】は実行や品質評価を必要とする事項を意味する。

## 1. 結論

**ZEVで新しく必要なのは、確定済みの動画内容から「演出の意味があるか・どこを主対象にするか・どんな役割か」を選ぶ判断である。既存の字幕区切りSkillの改名では代用できない。** 本文・ID・時刻・前後文脈の受け渡し、回答を検査する枠、描画計画と物理検査は再利用候補になる。

OpenChatCutには、発話に根拠を持つ演出、全体の統一、局所的な配置、無用な装飾の抑制をAgentへ求める指示がある。一方、有限部品の選択に限定せず、Agentが色・書体・寸法・尺を指定し、自由な描画コードを作る経路もある。**ZEVが「意味判断」と「有限の描画規則」を分ける案は、OpenChatCutの構造をそのまま写すものではない。**

見落としについて、上流の切り抜きSkillには重要場面の発見率を候補の正しさと別に評価する方針がある。ただし、字幕演出の対象外も含む全件判定や、演出の付け漏れを測った実績は、今回読んだ範囲では確認できない。

Checkpoint 2の4状態案は、**4つの新しい保存物を作る必要はない**。確定字幕と描画規則には既存の計画・版への参照を使い、追加保存を固定自動案と小さな人修正へ絞れる可能性が高い。後続の静的接続調査で、この最小性と既存rendererの限界を詰める。

## 2. OpenChatCutは何を読ませ、何を判断させるか

### 2.1 全体と局所の読取

【事実】初期promptにはclipの名称・種類・開始・長さ等の概要を最大60件まで載せ、正確な本文や設定は別の読取操作へ案内する。初期概要だけで字幕全文を読んだことにはならない。[初期概要](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/systemPrompt.ts#L19)、[詳細読取への案内](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/systemPrompt.ts#L154)

時間軸全体の台本を読む入口と、発話をまとまりごとにページ分割して読む入口がある。後者は省略された語・切り落とされた語を除き、元時刻と編集後frameを保持する。既定80まとまり、最大200まとまりの返却と、続きの有無・次の位置を返す。対象が一回の返却量を超える場合、全量参照には続きの読取が必要である。特定発話の検索は時間座標を探す操作であり、全文を理解する読取とは区別する。[台本の入口](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/schemas/script-tools.ts#L3)、[発話の投影とページ返却](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/transcript-read.ts#L65)、[検索の責務](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/schemas/transcript-tools.ts#L44)

発話中心の動画を扱うSkillは、動画全体の話題・視聴者・調子・話者の位置を把握してから各演出箇所を選ばせる。配信切り抜きSkillは、全体概要から候補へ進み、その付近を詳細確認する。ただし後者の目的は切り抜き範囲の選択であり、確定字幕全体への演出判定ではない。[全体把握](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/talking-head-guide/SKILL.md#L352)、[段階読取](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/livestream-to-clips/references/multimodal-selection.md#L5)

### 2.2 演出する理由と無演出

【事実】選択指示の中心は、視聴者にとって理解・強調・案内・テンポが改善する瞬間を選び、何を伝える表示なのかを先に決めることである。

| 判断 | 上流で確認した指示 |
| --- | --- |
| 主対象と用途 | 意見・結論、数値、手順、比較、警告、質問、人物紹介等の情報構造と、表示の形を対応させる |
| 全体の統一 | 色、文字、動き等を一つの編集物として統一する |
| 局所的な判断 | その瞬間の内容、発話位置、読める期間、背景、話者や物との位置関係を決める |
| 無演出 | 映像や身振りで既に伝わるなら密度を減らす。合わなければ形・時間・大きさを変えるか、省く |
| 再利用と反復 | 同じ情報構造・視聴者の目的・形なら部品を再利用する。色の一致だけで同じ演出を使い回さない |
| 設置後 | 合成画面を見て、顔・物・手・字幕等との重なりを確認する |

根拠：[対象の選択](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/talking-head-guide/SKILL.md#L362)、[用途と形](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/talking-head-guide/SKILL.md#L399)、[配置と検証](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/motion-graphic-placement/SKILL.md#L19)、[再利用の条件](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/create-motion-graphics/SKILL.md#L78)

【限定した結論】これは演出箇所の判断を導く自然言語の指示である。読んだ演出Skillとtool定義では、演出しない全箇所の理由、未判定箇所、見落としを必須記録として閉じる仕組みは確認できない。文書に「省く」と書いてある事実を、無演出と判断未完了が保存状態で区別される証拠にしない。

### 2.3 否定・条件・比較・不確実性と前振り

【事実】意味保持の具体的な指示が厚いのは、発話を削る編集である。接続・対比・主語・動詞、原因・順序・参照・語調を持つ語を安易に削らず、不確かなときは残すか削除を小さくする。反復でも意図的な強調、構造の目印、新情報や語調の追加なら残す。結論だけでなく、必要な前振り・限定・比較対象も保持する。同等の前振りが自然につながって残る場合に限り、重複した前振りを削れる。[意味単位の保持](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/talking-head-guide/SKILL.md#L73)、[反復等の扱い](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/talking-head-guide/SKILL.md#L139)、[前振りと限定](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/talking-head-guide/SKILL.md#L198)

【限定した結論】今回読んだ演出選定・字幕操作・描画コード作成の処理には、否定や条件の作用範囲を構造として抽出し、強調対象との関係を検査する入口は見つからなかった。発話削除の指示を、字幕の誤強調を防ぐ実装済み能力へ読み替えない。

【推論】ZEVでは本文を保存しているだけでは不十分である。例えば「安全とは限らない」の「安全」だけを目立たせると、本文を一文字も変えなくても受け取り方を歪め得る。これは説明用の仮例で、今回の実素材を評価したものではない。部分範囲の選択では、否定・条件・比較対象・不確実性・引用の帰属・後続の訂正を含む意味が保たれるかを、演出意図の判断に加える必要がある。

部分範囲を広げれば必ずよいわけでもない。主対象が埋もれる場合は、別の表現または表現不能として残す。勝手な字幕再分割・時刻推定・無断のNormal化で解決したことにしない。

## 3. AIと決定的処理の境界

### 3.1 OpenChatCutの実態

【事実】上流は有限部品選択と自由な作成の両方を持つ。字幕には既成外観と有限のmotionがあるが、Agentは色・書体・大きさ・縁・背景・配置も直接指定できる。描画素材の作成SkillではAgent自身が描画コード、内容、寸法、尺、編集用の項目を設計する。[字幕操作](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/schemas/captions-tools.ts#L22)、[自由な描画作成](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/create-motion-graphics/SKILL.md#L8)、[編集項目の設計](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/create-motion-graphics/SKILL.md#L208)

作成処理はコード・名称・正の寸法を検査し、描画用の隔離環境で受理できるかを確かめて素材へ登録する。その入口で発話参照や演出の意味的な理由を必須にしてはいない。登録成功は、選んだ内容や範囲の妥当性を保証しない。[登録処理](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/mg-code-tools.ts#L15)

字幕motionについては、保存設定と現在frameから外観を計算し、毎frameのAI判断は不要である。ここは[Checkpoint 2](openchatcut-checkpoint2-20260916.md)の確認範囲を引き継ぐ。自由な描画コードすべての決定性を保証したわけではない。

### 3.2 geometry・collisionも意味判断とは別

【事実】映像の顔・人物領域は、サンプル画面へのMediaPipe処理で得る派生観測で、素材の版とアルゴリズム版へ結び付けたcacheに保存する。これは生成AIの意味判断とは異なる観測である。[観測とcache](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/geometry/visual-geometry.ts#L1)

字幕との衝突判定は、実際の字幕画像の全pixelではなく、想定した字幕帯へ位置・拡大・回転を適用した矩形で近似する。顔との交差を判定し、候補位置から重なりが少ない配置を選ぶ。共有配置を変更する経路であり、一件の人修正から他の字幕が動かないという保証とは別である。[近似字幕帯](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/geometry/caption-collision.ts#L41)、[候補位置の比較](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/geometry/caption-collision.ts#L146)、[配置の更新先](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/caption-avoidance-tools.ts#L85)

上流の寸法係数、重なりの閾値、候補位置の採点をZEVへ採用する提案はしない。決定的な計算であることと、実画面を正しく測れていることは別である。

### 3.3 ZEV向けの責務候補

**以下は推論。既存architectureの承認・改訂や新Skill実装ではない。**

| 担当 | 判断・処理 | 担当させないもの |
| --- | --- | --- |
| 演出意図の判断 | 演出する意味、主対象、Focus／Vocal accent等の役割、必要な本文内範囲、前後関係、反復の意味、何も付けない理由、情報不足 | 自由なRGB・書体・拡大率・時間・easingの発明、画面に収まるという自己申告 |
| 確定情報への解決 | 対象の表示字幕IDと本文・時刻の版、範囲所属、重複、許可された役割を照合 | 本文検索で別の同一語へ付け替える、字幕再分割、時刻の補作 |
| 描画規則 | 承認済みの有限表現から色・書体・拡大・時間・easing・配置を決め、現在frameから描く | 動画の意味を毎frame再判断する |
| 物理検査 | 実際に使う描画条件で安全領域・衝突・欠落を検査する | 技術的に描けることを、演出の意味や価値の合格へ変換する |
| 全体の選択整理 | 同じ出来事への重複、前振りと結論、近接した別反応を意味で区別する | 一律の間隔・件数・係数で重要な山を間引く |

「強さを人が修正する」は、許可された表現の範囲を選ぶ操作として接続できる。今回その選択肢や数値を決めていない。

## 4. 候補に上がらない問題

### 4.1 上流にある評価思想と、その限界

【事実】配信切り抜きの評価文書は、独立した人間の重要場面・不適切な箇所・理由・許容境界を参照にする。重要場面が候補へ上がった割合と、選ばれた上位候補が有用だった割合を別の指標にしている。ジャンル別結果や意見の不一致を一つの平均へ隠さない方針もある。[評価方針](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/skills/livestream-to-clips/references/qa-and-evaluation.md#L53)

ただしこれはSkillの評価手順である。読んだ対応検査は、切り抜き時間軸の製造・参照・長さ・Skill文面を調べるもので、実素材の重要場面の発見率を測るものではなかった。[対応検査の範囲](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/livestream-sequence-workflow.verify.ts#L35)

別の場面構成レビューは、同じ種類・説明の反復、目的欄の欠落、静的カードへの偏り、一般的な形容語を機械的に調べる助言処理である。入力された場面一覧の外側にある重要場面は見ない。上流独自の点数・重みも使うため、演出の意味や見落としを保証する検査へ流用しない。[助言処理](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/sceneQuality.ts#L108)

### 4.2 意味保持の指示と実際の受入検査は違う

【事実】切り抜き候補を探す別の処理は、一つのclipの全語列をモデルへ渡し、主語・前振り・質問・結論・前後文脈を保持するよう指示する。しかし受入検査は語番号・範囲・順序・重複・尺を調べ、上限尺を超える候補の末尾を機械的に短縮する。モデル失敗または有効候補なしの場合には、文字密度や記号・数字の加点で代替候補を選ぶ。[意味保持の指示](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/highlight-tool.ts#L44)、[受入検査](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/highlight-tool.ts#L96)、[代替選定](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/highlight-tool.ts#L156)、[実際の分岐](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/agent/tools/highlight-tool.ts#L347)

これは字幕演出選定ではない。意味を守るpromptがあっても、構造検査や代替計算によって意味の保証が得られるわけではない、という境界の実例である。ZEVへ末尾短縮や密度採点を持ち込まない。

### 4.3 ZEVで分けるべき四つ

**以下は評価設計の候補であり、今回評価を実施した結果ではない。**

| 分類 | 判別したいこと | 残すべき根拠 |
| --- | --- | --- |
| 正しく選択 | 演出価値のある場所を見つけ、役割・主対象・範囲も適切だったか | 対象と理由、前後文脈、実際に採用した表現 |
| 誤選択 | 不要な場所を選んだ、意味を歪めた、対象・役割・範囲を間違えたか | 誤った判断と、どの情報を見れば変わる判断だったか |
| 見落とし | 演出価値のある場所が候補にすら上がらなかったか | 候補から独立した参照対象、入力・観測の被覆範囲 |
| 現行表示単位では表現不能 | 場面は見つかったが、長い一字幕の一部だけ等、狙いどおり表現できなかったか | 発見済みの対象・狙いと、現在の表現制約 |

表示可能かと発見できたかは別軸である。表現不能だった対象を発見できなかったことにせず、Normalへ隠さない。候補には上がったが後段の重複整理・物理検査で消えたものも、その段階と理由を残して、候補生成の見落としと混同しない。適切に普通のまま残した箇所は、誤選択を調べる対照として保持する。

必要な区別は、**全入力を処理したか、重要な対象を発見できたか、発見した対象を表現できたか**の三つである。全字幕IDを回答へ含めるだけでは見落としゼロを証明できない。選んだ箇所だけの正しさでも同様である。

将来の品質確認では、候補一覧から独立して重要箇所と普通の箇所を参照にできる資料が必要になる。候補だけを見た評価を「取りこぼしも良い」と呼ばない。これは通常制作で人に毎回全字幕を審査させる提案ではない。人間の全件確認を増やすことや、新しい合格閾値・件数上限・点数の設置は行わない。

## 5. 判断を変え得る入力だけを追加する

**この節はZEV向けの推論。入力を実際に製造・送信したものではない。**

| 入力 | 何の判断を変え得るか | 最小の扱い |
| --- | --- | --- |
| 完成順の確定字幕全体 | 要点、前振りと結果、反復、後の訂正、全体の平坦さ、完成字幕内で演出候補から漏れた山 | 基本入力。元動画全文や候補一覧だけで代用しない。既存ID・順序と結び付ける |
| 前後会話 | 否定、条件、比較、引用の帰属、皮肉、質問と答え | 完成字幕内の前後を使う。切断で文脈が失われた場合だけ、保存済みの元会話を追加参照する。参照を編集へ変換しない |
| Prospect・保持来歴 | その箇所を採った理由、出来事のつながり、制作意図 | 利用可能な理由を手がかりにする。候補採用や導入・結論という役割だけで演出を決めない |
| 音声 | 文字だけでは分からない声の勢い、反応、間、感情の向き | 特にVocal accentで判断が変わる。文字で既に選んだ候補だけに限定すると、平凡な文字の声の山を見落とし得る。観測していない範囲を判断済みにしない |
| 映像 | 指示語の対象、画面上の結果、身振りが既に伝えている情報、視覚的な山 | これらが演出の要否・主対象を変える場合だけ追加する。読み取り可能だから全映像を必ず追加する方式にはしない |
| 語時刻・部分時刻 | 発話へ同期した動きの開始終了 | 意味の要否判断には一律必須ではない。同期が必要な表現で、確定情報が存在するときだけ使う。字幕両端から文字時刻を補作しない |
| 画面geometry | 描画可能な位置、安全領域、顔や重要表示との競合 | 通常は配置・物理検査側の入力。意味理解へ全座標を渡す必要はない。重要な映像内容を隠すかの判断とは分ける |

「追加情報なしでも無演出」と「必要な情報がないので判断未完了」を分ける。特に音声を参照していないVocal accentの結果を、声を含む自動選択が完成した証拠にはできない。入力追加の価値は、それにより対象・役割・範囲・不採用判断が変わるかで評価する。今回はモデル・音響センサー・観測量を新設していない。

## 6. ZEV既存能力との対応

### 6.1 再利用できるものと新しい判断

【事実】意味区切りSkillは、確定発話の本文とIDからまとまりの終端を返す。表示区切りSkillは本文片・境界ID・表示容量から字幕と行の終端を返す。役割・強調対象・部分外観・感情を返す処理ではない。[意味区切り](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/runner/src/skills/caption-meaning-grouping-v001.ts#L12)、[表示区切り](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/runner/src/skills/caption-display-boundaries-v001.ts#L12)

| 既存能力 | 現在確認できる責務 | 演出での扱い |
| --- | --- | --- |
| caption meaning grouping | 意味のまとまりを作る | 文脈の参照と呼出・検査の枠は候補。演出判断として改名利用しない |
| caption display boundaries | 確定本文から表示字幕と改行を決める | 完成した表示単位を入力として利用。演出のために再実行しない |
| Prospect | 見どころの理由、根拠発話、前後の連続文脈を保持する | 意図の手がかり。演出候補の完全な一覧にはしない |
| confirmed display caption IDs | 実際の表示字幕ごとの本文・改行・元時刻・出力frameへ対応する | 演出と一件修正の対象に使う。意味上の参照だけで代用しない |
| source time | 保存済みの元動画対応と出力時間軸を結ぶ | 同じ場所を参照するために利用。発声開始の真値とは扱わない |
| audio observation | 固定本文と音声の対応を局所的に観測する | 既存証拠として参照。声の強さ・抑揚・感情の評価済み情報へ変換しない |
| renderer・物理検査 | 共通計画、字幕画像化、映像合成、安全領域等を扱う | 接続の土台。演出後の新しい外観へ既存合格を無条件で引き継がない |
| presentation effect prototypes | 字幕IDと有限指定から、対象字幕の色・大きさを変更する試作 | 配管の先例。値や旧演出名をそのまま正式採用しない |

根拠：[全文を渡す候補探索](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts#L177)、[候補と保持入力](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/evals/clip_composition/digest_v1_phase2_semantics.mts#L97)、[完成順の保持本文](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/evals/clip_composition/digest_v1_phase2_captions.mts#L35)、[表示字幕への投影](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/evals/clip_composition/digest_v1_phase2_caption_bridge.mts#L132)、[演出試作の入力](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/packages/shared/src/presentation-effects.ts#L1)、[試作の対象解決](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/evals/clip_composition/presentation_effects_v001.mjs#L20)

### 6.2 既存音響資料の被覆を過大評価しない

【事実】Digestの音響準備は、保持判断の入力に入った候補の発話片と交差する既存STT区間を選ぶ。選んだ区間内の周辺本文も入るが、候補外全域を網羅する保証はない。処理は固定本文の音声整列であり、音勢や抑揚を判定するものではない。[区間の選択](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/evals/clip_composition/digest_v1_phase2_acoustics.py#L49)、[観測の処理](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/evals/clip_composition/digest_v1_phase2_acoustics.py#L100)

保存済みの説明も、固定本文との一意な対応が実際の発声開始や発話の存在を保証するものではないと区別している。演出で必要になる声の表現や、部分文字列の正しい開始時刻を観測済みと扱わない。[既存観測の限界](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/docs/reports/caption-local-acoustic-observation-v001.md#L19)

既存の字幕確認対象の選択は、時刻の矛盾や材料不足を扱う処理であり、本文・演出意図を入力に持たない。確認信号がないことを「演出不要と判断した」とは読めない。[確認対象選択](https://github.com/f-kw/zev2/blob/9f8fb04ac440c69466708e7ea529190b573f1089/packages/shared/src/caption-review-selector-v001.ts#L1)

## 7. 発見の三分類

| 発見 | 分類 | ZEVへの適用 |
| --- | --- | --- |
| 演出に視聴者への役割と発話根拠を持たせる | ①設計思想だけ借りる | 要否・主対象・意味保護を判断する |
| 全体の統一と局所的な用途を分ける | ①設計思想だけ借りる | 一件の都合だけで全体を過剰装飾しない |
| 重要場面の発見率と選択の正しさを分ける | ①設計思想だけ借りる | 候補外とNormal側も評価対象にする |
| 読取対象・版・観測範囲を明示する | ①設計思想だけ借りる | 全文入力、全量処理、意味品質の違いを保持する |
| 有限指定から時刻に応じて描く | ②挙動を参考に独自実装する | 既存ZEV計画・rendererへ限定接続する |
| 意味上の対象と物理配置を分ける | ②挙動を参考に独自実装する | 指定を検査してから実際の描画条件で配置を検査する |
| 本文を変えず必要な描画片を分ける | ②挙動を参考に独自実装する | 部分範囲の表現能力は独自検討。存在しない時刻を作らない |
| 自由な描画コード・RGB・寸法等をAgentが毎動画作る | ③今回のZEVには不要 | 有限表現と一件修正という目的に広すぎる |
| 候補失敗時の文字密度・記号加点への置換 | ③ZEVには不要 | 判断未完了を意味のない代理採点で隠さない |
| 上流の頻度、重み、近似字幕帯の係数を移植する | ③ZEVには不要 | 今回の品質根拠・承認値ではない |
| 切り抜き範囲の再選択や上限尺による短縮 | ③今回のZEVには不要 | 確定字幕・保持区間・元時刻を変更しない |
| 既存字幕Skillの改名で演出判断を済ませる | ③ZEVには不要 | 入力枠の再利用と、新しい判断の追加を分ける |

## 8. 未確認事項と次の静的調査

【未確認】OpenChatCutの指示遵守率、日本語の否定・条件等の誤強調率、演出の発見率、声だけが山になる箇所の見落とし、ZEVの新しい演出の価値と安全性、保存・再読込後の一件Resetは、今回実測していない。上流の検査sourceを読んだ箇所はあるが、検査を実行して合格したという報告ではない。

この時点でOpenChatCutを起動しなくても、既存ZEVへの接続と保存の最小性はさらに読取で詰められる。引き続き、通常の描画計画への束縛、疎な演出指定と完了状態、一件Reset、既存の字幕画像生成とmotionの相違を確認する。新たな実装・schema・Skill・環境・係数を作らない。

## 9. 作業範囲とGit

今回のユーザー指示により、checkpointは報告・保存の節目であり、承認済みの静的調査を止める地点ではなくなった。本書の保存後もその範囲で接続調査を継続する。DECISIONS.md、Goal、契約、work-orderは改訂しない。

| 項目 | 状態 |
| --- | --- |
| 研究branch | `codex/openchatcut-research-cp1`を継続 |
| CP3開始commit | `64c6f2d55c29d53f437816540bade1ab585c7514` |
| CP3で保存するfile | 本報告1件 |
| 作業場所 | CP1で用意済みのZEV研究用checkout。新規cloneなし |
| 元のtracked未commit差分 | `docs/policies/PRODUCTION_QC_LAYER_POLICY_v001.md`の既存1件。対象外 |
| 元の未追跡 | 59,153件。evals配下59,152件とCP1報告コピー1件。対象外 |
| 開始時照合 | CP2終了時の元Git状態と既存差分に一致。ステージ済み0件 |
| 元Git状態の識別 | SHA-256 `3d2edf1b0683e8c76d59baf100b59fcf6658e2d3d799a0b3ceebc1dfa3441b3b` |
| 既存差分の識別 | SHA-256 `3e7877a0bee01a6796a7444aa3570fb6d1d3b390b902c3a3112084f92ee2c2bb` |

OpenChatCutのclone・install・起動・build・test・コード実行、Node追加・切替、ZEVコード変更、上流コード・Skill本文の転載、認証・APIキー・環境変数の読取、外部AI調査、素材の外部送信は行っていない。既存のGitHub読取と報告push以外の新しい通信用途を設けていない。追加費用US$0。

commit/pushの確定値と保存後Git状態は、次の接続調査報告と最終回答へ記録する。既存未追跡全件のbyteを再hashすることはしていないため、その全件byte一致を実測したとは主張しない。書込みを研究用checkoutへ限定し、Git状態と既存tracked差分を開始時へ照合する。
