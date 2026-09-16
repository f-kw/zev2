# 実Digestの見た目の変化を追加した完成候補

作成日: 2026-09-17。branch: `codex/digest-visual-variation`。base: `c16a64cf82477fd980d9fa5f9f99bddc0a71ee34`。

## 1. 到達点と今回の目的

採用済みの **Color Accent** と **Scale Accent** に、字幕全文を明るい板でまとめる **Panel Accent（仮称）** を追加した。件数を増やすことではなく、内容に応じて色・大きさとは異なる見た目を使えるようにする工程である。名称とデザインの正式採用、人間による見心地の合格はまだ主張しない。

全161.033秒の実Digestで、全32字幕・全27音声候補を新たにAIが判断し、その回答を手配置・人間修正なしで固定自動案へ保存、全編の描画と技術検証を完了した。人間へ提出する動画は最も機能が入った完成候補 **1本**。通常版や少機能版の人間比較用再作成はしていない。既存の通常動画だけを技術検証の参照に利用した。

- 完成候補: `/private/tmp/zev-visual-variation-v9c1j07h/completed/digest-color-scale-panel-provisional.mp4`
- SHA-256: `bd34d5e4a7dab226ed2042703fe1996494466107692c955dc104826d8d72845e`
- 1920×1080、30fps、4,831フレーム。元の音声packetは同一。
- 人間の見心地・不要な演出・見落とし・重要な映像情報の覆い隠しは未評価。

## 2. 候補を独立に選んだ理由

| 候補 | 今回の判断 |
| --- | --- |
| 字幕全文の背景板 | 色・文字サイズから独立した持続する面を作る。説明の結論・要点を一まとまりとして受け取らせる役割があり、暗い場面でも明色板の変化が明確。今回採用する試作候補。 |
| 全幅帯 | 既往の承認はタイトル用途。字幕へ移すと映像占有や別の情報枠への誤読が増えるため、そのまま流用しない。 |
| pop/punch | 拡大を中心とする表現はScale Accentに近い。動く途中の領域や短い字幕の検証が必要になり、今回一つ増やす見た目として背景板を優先。 |
| 入退場の変化 | 既存の4フレームfadeより明瞭に変えると、表示有効時間・短い字幕・連続切替の課題が増える。今回の静止板へ混ぜない。 |
| 場面transition | 字幕演出と時間・映像接続の問題が異なるため、同時拡張しない。 |

既存の背景描画と安全域検査は利用するが、旧カードの字体・サイズ・中央配置・用途を丸ごと採用していない。旧名称に『pop』があっても、実装は静止画像とfadeであり、動的popの実装実績とは数えなかった。

## 3. 有限の描画と三層の接続

新表現は通常サイズの字幕全文を、明色 `#FFFDF8` の不透明な矩形でまとめ、文字を濃色 `#111827` にする。通常字幕の既存paletteを利用し、板でコントラストを確保するので縁と光彩を0にする。余白は横24px・縦16px、角丸0pxの試作デザイン。色・px・形は有限presetが所有し、AIは指定できない。元の表示期間と共通fadeを維持する。

本文、明示改行、文字サイズ、位置の設定、表示開始・終了、Prospect、保持区間、元動画対応は変更しない。板の外枠は既存の配置処理と安全域検査に含む。縁・光彩から板への変更で測定箱が変わるため、実画素上の文字座標まで完全不変とは主張しない。

固定通常計画 → 固定自動案 → 一件ごとの人間修正、の三層を維持した。Color / Scale / Panel / Normalは一つを選び、重ねない。Resetは人間修正だけを外して保存済み自動案へ戻す。再判断や新しい字幕生成はしない。表示不能と未解決も保持する。

AIの公開名はColor Accent / Scale Accent / Panel Accentのみ。公開名から既存保存用の有限識別子への対応を明示し、旧公開名のaliasは受け付けない。人修正CLIも `color` / `scale` / `panel` へ置換し、部分変更はColorだけ。表示名のPanelには仮称を付す。判断入出力はv003、描画規則はv005へ進め、旧版を暗黙に読み替えない。

## 4. 実Digestの自動判断

| 字幕判断 | 件数 |
| --- | ---: |
| Color Accent | 7 |
| Scale Accent | 1 |
| Panel Accent（仮称） | 2 |
| 通常 | 14 |
| 表現不能 | 0 |
| 未解決 | 8 |

全32字幕、全27音声候補を元の順序で回答した。音声候補は選択10、不要3、表現不能0、未解決14。候補の存在だけで拡大へ格上げせず、Scaleには字幕へ局所対応する音響頂点と認識語の根拠を要求した。色と板は意味から選択できる。一字幕一表現で、件数quota・等間隔・ランダム配置はない。

### 新しい板の使用箇所

| 完成動画の時刻 | 確定字幕 | AIの選択理由 |
| --- | --- | --- |
| 01:58.767–02:02.300 | カメラワークと今回時間差怖かった | カメラワークと時間差という二つの怖さの仕組みを一文で提示し、後続の予想とずらしの説明を読む見出しになる。片方の語だけへの注目では要点の対が弱まるため、「怖かった」という評価まで含めた全文を一つの板でまとめる。元動画の省略を挟んだ同じ振り返りの要点として判断し、音量由来の拡大は選ばない。 |
| 02:21.033–02:26.067 | 油断させてビビらせてくるのがマジでここの会社多いなって思う | 予測しなかった場所で油断させて驚かすという仕組みを、会社の傾向についての本人の評価として結ぶ一文である。全文をまとめることで「多いなって思う」という主観の留保まで保持でき、前字幕の否定条件を受けた説明の着地になる。単語の派手さや音量ではなく、仕組みと評価のまとまりを読ませるために板を選ぶ。拡大は入力観測で表現不能だが、それを理由に板へ代替した判断ではない。 |

事前レイアウト検査は通常32/32、Panel32/32が表示可能。Scaleは23/32が表示可能で、収まらない9字幕を判断入力へ明示した。縮小・改行変更で成立させていない。新しい判断は今回の入力だけから行い、過去の採否や人間ラベルを新しいAI判断の代用にしていない。

## 5. 検証と独立レビュー

- 最終機能検査: 300/300合格（固定案・人間修正・保存入出力・AI境界の5検査ファイル）。先の広い統合検査は別に299件中292件合格・既存7件不合格であり、検査集合は同一ではない。
- Color / Scaleの既存native描画検査: 16/16合格。文字形・alpha・範囲外色・カラー字形・Normal/Resetを確認。
- Panelの追加native検査: 7/7合格。短文と2行の実PNGで、文字を避けた領域まで明色板が不透明に描かれ、濃色文字が残ることを確認。通常なら収まる18全角字でも板が安全域を6px超えるfixtureは、配置検査と実画素QCの両方が拒否した。長文・3行・行間衝突も拒否。
- 共有型全体と判断Skill単独の厳密型検査: 合格。独立レビューで見つかった新しい共有型の公開漏れは修正後、package正面からの利用を再検証した。
- 通常1通り＋Color全文32＋Color部分32＋Scale全文32、計97の実字幕表示計画を変更前と直接比較し、完全一致。旧描画規則の固定案96件は新版で拒否。
- 全32字幕の本文・改行・時刻・元動画対応・位置設定を、許可した描画変更を戻して原計画と完全一致確認。通常表示22字幕のPNGは既存通常版とbyte一致。
- 全自動選択10字幕について完成MP4の中点フレームを抽出し、Color / Scale / Panelの変化を実画素で確認。Panelは『新PNGが明色板そのもの、かつ旧字幕のalphaが0』の全画素を測定するため、文字の黒化だけでは合格しない。無重みのRGB距離和を厳密比較し、任意の許容係数や点数を追加していない。
- 両動画の実フレーム数・画面サイズ・fps・音声packet payloadを照合。新動画は人間修正0、通常動画の新規生成0。
- 開始前からある5作業treeのHEAD・branch・差分・staged・全未追跡一覧、計25項目は開始時と一致。

独立したAIが全32字幕・7文脈・27候補判断を再読した。Color7件の否定・推測・引用、Panel2件の全文のまとまり、Scale1件の字幕内110.14秒・110.94秒と認識語の対応に、明確な矛盾は見つからなかった。回答・固定案を変更せず、人間の見心地評価とは分離した。

### 継続して残る旧検査の不合格

広い旧renderer検査19件は12合格・7不合格。7件は古いtrustの部品hash照合で停止し、変更前c16と今回で検査名・期待値/実値・診断全文が一致した。関係する検査・renderer・部品・台帳13ファイルもbyte同一で、今回の追加回帰ではない。台帳を都合よく更新せず残す。全project検査が合格したとは主張しない。正式昇格やreleaseへ進む前には、この既存照合の取り扱いを別に解決する必要がある。

## 6. 限界と権限の範囲

混合音の頂点とASRの対応は音源分離・発声認定・再現率保証ではない。板の意味的な選択や映像の覆い隠し、動画全体の自然さは人間未確認。技術検査は各選択の中点と静止overlayを観測し、全時刻の主観品質を判定していない。新しい動的効果は追加していない。

新しい有料API・依存・素材取得・外部素材送信は0。既存のローカル全音声測定・ASRの保存済み証拠を実byte検証して再利用した。今回、別素材の24分動画の再判断・再描画は行っていない。Digest正本、DECISIONS、Goal文書、契約、main、tag、stable、releaseは変更していない。

今回の個別指示に従い、通常の調査・有限preset実装・接続・検査・checkpoint commit/pushまで実行する。完了報告は指定のZEV進行管理4と同じ会話（現在表示名はZEV Build Loop）へ送り、その末尾で次のタスクを明示的に求める。Panelの正式名称・デザイン採用はこの技術完成だけでは決めない。

## 7. ローカル証拠

映像・生判断・音声証拠は外部へuploadせず、以下をローカルへ保存した。remote監査ではこの報告と実装・検査コードを読めるが、MP4の実再生や生判断全件の独立再読を行ったとは主張できない。

- `/private/tmp/zev-visual-variation-v9c1j07h/judgments/horror-attempt-1/request.json` — `b3632e734194e43df8b5feb7b06435b07d46656f8c7c19e2e18a284898e218ee`
- `/private/tmp/zev-visual-variation-v9c1j07h/judgments/horror-attempt-1/response.json` — `bc0702107d7d39f78dd242c49e5b40d92aef1a30768a1e343453606456d66bc6`
- `/private/tmp/zev-visual-variation-v9c1j07h/judgments/horror-attempt-1/fixed-auto.json` — `8e1290396713ea91045d90bc346556fcdcf4b4440044734f281bf087359b202e`
- `/private/tmp/zev-visual-variation-v9c1j07h/judgments/horror-attempt-1/validation.json` — `a6a0e0fd2013791e1b36d7afb3217d5218ab6396e4a7ddf5ef2dd17c3a6e566f`
- `/private/tmp/zev-visual-variation-v9c1j07h/renders/horror-automatic-v001/summary.json` — `f97ddd375423f8fcd1c7984a32a686152bc6798a442c62a6db5e252e38d0f0c7`
- `/private/tmp/zev-visual-variation-v9c1j07h/completed-video-qc-v001/summary.json` — `49e5b239b59a1d6444cf9980ee2799bbf6d5acfd9de1230c685e8f094ca2b995`
- `/private/tmp/zev-visual-variation-v9c1j07h/completed-video-qc-v001/completed-video-pixels.json` — `95d16090c1f258d1020c3f21b23022d35a1f80bf4d8ff5cf3ac1190ec477961f`
- `/private/tmp/zev-visual-variation-v9c1j07h/feasibility/panel-feasibility.json` — `8b3fc6cc377c6ea9328763af12c5862f4b2face1cfb0aa1b737199c7bc78c92c`
- `/private/tmp/zev-visual-variation-v9c1j07h/test-execution-summary-v001.json` — `2d1f7d1375baa96013fad50c9e5595c167dfe7bb3f42d17082a84cbff193e2f6`
- `/private/tmp/zev-visual-variation-v9c1j07h/final-validation-v001.json` — `dae955c0667615a1dbcf938c7d07120ebaef4611ba034fd2e0d1a04deae9b726`
- `/private/tmp/zev-visual-variation-v9c1j07h/reviews/final-source-review-v001.json` — `87bac26adc8cf8bce76ae71169852514db2ea61cb99b84e49fee09acfc61c782`
- `/private/tmp/zev-visual-variation-v9c1j07h/reviews/report-draft-independent-review-v001.json` — `06ab0164d247f0f9aec9d1cc9d3116dcfc7df5018ebd34547a2ee1eba8916a51`
- `/private/tmp/zev-visual-variation-v9c1j07h/panel-native-attempt-v002/measurement.json` — `261fed5e63c5ffb5acc4ae40fdb7b1ab1628b31c8b1f890dd3a596929b5b455f`
- `/private/tmp/zev-visual-variation-v9c1j07h/reviews/core-independent-review-v001.json` — `c98dce71ce5ac9a921369a530f7813e5dce66bb19527534c705d027a6afe87d9`
- `/private/tmp/zev-visual-variation-v9c1j07h/reviews/ai-boundary-root-review-v001.json` — `2a47cfb583917a5412b6eff130fdaa7827964745251c8a8fa652440ae30f7d4f`
- `/private/tmp/zev-visual-variation-v9c1j07h/reviews/legacy-renderer-comparison-v001.json` — `dc9574fe0c7d98d464a29a4e80420340eda3d02cede845502dad2823308f11a4`
- `/private/tmp/zev-visual-variation-v9c1j07h/reviews/actual-judgment-independent-review-v001.json` — `9291cfc770cda949858150ff73a21cf969f10188c1106da4f2c931ba4634c2a9`
- `/private/tmp/zev-visual-variation-v9c1j07h/reviews/completed-video-verifier-code-review-v001.json` — `6dcf4b5069c2568b1f4279c128c7d36c04c382b2e944ff58ce225e9b10b5dc46`
- `/private/tmp/zev-visual-variation-v9c1j07h/judgment-verification-v001/summary.json` — `a818958d94d2574a317ec64bb42984baa1c7c66f87a8ee03f2e4353d8daa83d8`
- `/private/tmp/zev-visual-variation-v9c1j07h/preservation-after-v002.json` — `da5c78a73cf488ddccc040603998ec67a2996f99138062fe464b052d143b73dc`
