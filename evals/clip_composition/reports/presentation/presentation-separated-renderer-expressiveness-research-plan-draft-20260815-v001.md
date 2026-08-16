# 分離後ZEVOレンダラー 表現力調査計画 草稿 v001

日付: 2026-08-15

状態: **調査計画草稿**。技術選定、style採用、実装、契約改訂、描画を含まない。判断が必要な箇所は全て`要裁定`と記す。

## 0. 目的

分離後の自作ZEVOレンダラーが、意味指示を保ったまま「読みやすい」だけでなく「作品として面白く、美しい」完成画面へ変換できるかを、要素別に調べる。

現在の最大の未登録ギャップは、基本字幕とタイトルの成立ではなく、次である。

- 作風として統一された文字設計
- 状況に応じた配置と強弱
- 色・背景・装飾の関係
- fade以外の動き
- 冒頭で見る理由を作るhook
- G4〜G7意味観測を、やりすぎず画面へ変える表現語彙

本調査はrenderer非依存の指示成果物を前提とし、ZEVGの意味packageや字幕境界を変更しない。

## 1. 現在の実装基準

### 1.1 caption

横型captionの正式基準:

- 1920×1080 / 30fps
- 96px
- 2行まで
- bottom-center
- 8px縁、12px光彩
- entry/exitとも4frame alpha fade

縦型speaker_only captionの正式基準:

- 1080×1920 / 30fps
- 134px
- 論理幅14、2行まで
- bottom-center
- 11px縁、17px光彩
- entry/exitとも4frame alpha fade

これらは人間目視で読みやすさを確認した基準であり、作品ごとの表現幅を証明するものではない。

### 1.2 title C

人間合格済みtitle C:

- 文言: `片付けの「やりかけ癖」を語るマリン船長`
- 冒頭180frame
- 上端・左右端まで届く濃紺帯
- Shippori Mincho Bold、80px
- 横型1行、縦型2行
- 可視文字中央を実輪郭で補正

表示位置とタイミングは合格した。一方、タイトル文言候補の面白さとstyle候補の豊かさは将来課題である。

### 1.3 dormantな表現語彙

横型preset台帳にはcaption coreのほか、次のvisual stateが実在する。

- 重要発話
- 間違いへの気づき
- 発見
- 強い感情
- コメントcard
- ナレーションcard
- 歌詞card
- 話者nameplate
- 参照card

ただし、ZEVO字幕品質v002の現正式経路が使うのはspeech captionであり、G4〜G7意味観測からこれらを選んだ完成物の品質は未証明である。台帳に値があることと、美しい作品として成立することを同一視しない。

## 2. 調査対象の分解

### 2.1 配置

調査する関係:

- captionと顔・ゲームUI・重要対象の干渉
- 横型/縦型の視線移動
- 上段title、下段caption、補足cardの優先順位
- 一人、画面+話者、二人の三画面型
- safe area内に置くだけでなく、内容上の空き領域を使う配置
- 複数要素の同時発火時の抑制・退避

技術調査項目:

- canvas座標と内容領域の分離
- 画面型ごとのslot語彙
- 顔・主要物体・既存UIの保護領域をrendererへどう渡すか
- deterministic layoutとAI配置候補選択の境界

`要裁定`: 初期調査をspeaker_onlyに限定するか、三画面型を同時に扱うか。

### 2.2 font

調査する関係:

- caption、title、comment、narration、speaker名札の書体役割
- 日本語glyphの可視重心
- 太さ、縁、光彩を含む実alpha領域
- 横型と縦型で同じfont familyを使う必要があるか
- 長文・短文・数字・英字・記号での崩れ
- license、file SHA、fallback検出

技術調査項目:

- browser font metricsと実alpha計測の差
- SVG text、HTML/CSS、事前glyph rasterの比較
- 文字組み、禁則、句読点ぶら下げ、約物幅
- 可変fontを採る場合のaxis固定と再現性

`要裁定`: 作風の基準書体を一つに固定するか、役割別familyを許可するか。

### 2.3 色・縁・光彩・背景

調査する関係:

- 背景映像の明暗に依存しない可読性
- 配信者・作品の色と、意味種別の色
- 強調と警告の誤読防止
- 縁・光彩・背景板を同時に盛りすぎない抑制
- titleとcaptionの視覚的区別
- commentやreferenceの「別情報」らしさ

技術調査項目:

- 実映像上の局所contrast計測
- alpha込みの輪郭bounds
- 色覚差を含む対比確認
- preset値と人間採否ログの対応

`要裁定`: 色を作品style中心で選ぶか、意味種別中心で選ぶか。両方を使う場合の優先順位も要裁定。

### 2.4 文字サイズ・行分割

調査する関係:

- 短い文は一行、長すぎる場合だけ改行する人間裁定
- 横型は横に長くても一行に収まる限り改行しない
- 縦型は大きさを優先しつつ2行まで
- 意味小単位replaceと、行末の自然さ
- 短いcueで4frame fadeが占める割合

技術調査項目:

- 実font計測による収まり判定
- 日本語分節と機械折りの責務分離
- 同じ意味単位に対する複数layout候補の決定的列挙
- AI候補選択を使う場合のraw保存・費用・人間刈り込み

`要裁定`: rendererが決定的な最良候補を一つ選ぶか、複数候補を作りAI/人間選択へ渡すか。

### 2.5 fade・animation

現在のformal transitionはentry/exit 4frame alpha fade一種である。

調査候補:

- alpha fadeの長さと短いcueの関係
- scale、slide、mask reveal、文字単位出現
- 重要発話と通常captionの動きの差
- exitを省く/短くする条件
- 連続cue切替時の残像・ちらつき
- 動きが音声理解を遅らせる場面の抑制
- 30fps以外への依存を作らない時間表現

技術調査項目:

- frame曲線の決定性
- Remotion/CSS/SVG/画像sequenceでの再現性比較
- motion blur、subpixel、codec差
- animationをapplication resultへどう記録するか

`要裁定`: 初回語彙をfadeの改良だけに限定するか、異なる一種類の動きを同時比較するか。

### 2.6 opening hook

title Cは冒頭title表示を成立させたが、hook全体は未設計である。

調査候補:

- title文言
- 最初の映像shot
- 最初の字幕
- 見せ場の短い先出し
- 音声の開始
- title帯/カード/素表示
- 何秒で本編へ戻るか

意味/表現分離:

- ZEVGまたは上流意味判断は、hookへ使える意味素材とタイトル文字列を供給する。
- ZEVOは順序、表示、動き、文字組み、視覚的強弱を決める。

`要裁定`: hookをtitleの拡張として扱うか、timeline上の独立instruction kindとするか。

### 2.7 G4〜G7の画面化

G4〜G7は意味観測であり、visual stateの直接指定ではない。調査は次の順にする。

1. 意味観測だけを表示せずにrenderer候補へ渡す。
2. style presetが利用可能な表現候補を列挙する。
3. 抑制規則で不要候補を落とす。
4. AIまたは決定規則が候補を選ぶ。
5. 人間が完成物を採否する。
6. 採否履歴をstyle preset蒸留へ戻す。

`要裁定`: 初回はG4一種だけを実証するか、G5 commentを含めるか。

## 3. 技術調査の比較軸

技術はこの草稿で選ばない。各候補を次で比較する。

| 比較軸 | 観測すること |
|---|---|
| 再現性 | 同じ入力、toolchain、fontでbyteまたはpixelが一致するか |
| 日本語品質 | glyph、分節、禁則、可視重心が成立するか |
| 表現幅 | 静止文字、背景、mask、変形、複数要素を扱えるか |
| 証明可能性 | 使用style、座標、曲線、素材、出力を構造化記録できるか |
| QC接続 | alpha bounds、safe area、重なり、表示差を機械観測できるか |
| 人間確認 | A/Bを同条件で短時間に比較できるか |
| 運用 | preset化、版管理、font/license固定が可能か |
| 費用 | 外部API・有料asset・製造時間を実測できるか |

調査対象となり得る実装層は、現在のRemotion/HTML/SVG、Canvas/WebGL、事前製造asset、外部renderer等である。採用候補の列挙であり、選定ではない。

`要裁定`: 調査対象の外部rendererに、ZEV内製の正式候補として比較価値があるか。

## 4. QC・proof設計素材

### 4.1 機械QC

最低限、次を要素別と完成動画の両方で観測する。

- instruction全件がapplication resultへ一回だけ対応
- text全量の重複・欠損0件
- title/caption/G4〜G7の時間範囲
- safe areaとalpha bounds
- 要素間重なり
- 顔・重要UI保護領域との衝突
- font実体とfallback 0件
- 背景上の可読性
- line数・実幅・overflow
- entry/exitの実表示frame
- 同一入力の決定性
- overlay有/無のcounterfactual pixel差
- video frame、duration、audio、終端
- 使用preset/material/font/toolchainのtrace

現在の共通描画coreには、layout inspection、overlay二回描画のbyte一致、行alpha bounds、instruction省略対照、媒体/QCがある。これを再利用候補とするが、表現力評価そのものを既存QCだけで代替しない。

### 4.2 proof fixture

最低限のfixture群候補:

1. 短い一行caption。
2. 長く2行が必要なcaption。
3. 日本語の不自然改行を起こしやすいcaption。
4. 20ms級atomを含む意味cue。
5. 明るい背景。
6. 暗い背景。
7. 顔とゲームUIの両方がある画面。
8. speaker_only縦型。
9. title一行/二行。
10. G4強調候補と抑制候補。
11. G5 comment。
12. 複数要素同時発火。

既存candidate 59、A-v002三候補、title Cを第一fixture候補にする。素材固有の正解をproductionへ焼き込まない。

`要裁定`: 新しい教師素材を追加するか、既存人間合格素材だけで初回比較するか。

## 5. 人間確認

機械QC合格後に、style名を隠したA/BまたはA/B/C比較を行う。

人間が見る軸:

- 読みやすいか
- 内容の温度と画面の温度が合うか
- どこを見ればよいか一目で分かるか
- やりすぎていないか
- 配信の人格・作風に合うか
- hookが見る理由を作るか
- 作品としてまた見たいか

選択・部分修正・却下を版付き保存し、preset蒸留の教師にする。白紙で「どう直すか」を毎回考えさせず、方向性の異なる候補から選べる形を標準とする。

`要裁定`: 初回確認を要素別静止preview→短い動画→一本の三段にするか、短い動画と一本の二段にするか。

## 6. 調査順

### 段0: 現在地の固定

- 現caption、title C、A-v002を参照基準にする。
- 人間合格と未合格を混ぜない。
- renderer tool/font/preset/QCの現SHAを記録する。

### 段1: 指示境界の成立

- renderer非依存instructionを受ける入口を設計する。
- 既存見た目を変えずにcaption/titleを通す。

### 段2: typography

- font、サイズ、行、縁、光彩、背景の候補を要素別previewで比較する。
- 実font boundsと日本語例を使う。

### 段3: placement

- 横型/縦型、画面型別slotと保護領域を比較する。

### 段4: motion

- fadeと少数の代替motionを短いcue/長いcueで比較する。

### 段5: opening hook

- title、最初のshot、最初の字幕を一組で比較する。

### 段6: G4〜G7

- 意味観測→候補列挙→style選択→完成物採否を一種ずつ成立させる。

### 段7: 一本

- 横型一本、縦型一本でQCと人間採否を行う。
- 採否後だけpresetを正式昇格する。

`要裁定`: 段2〜5をどこまで同一工事に含めるか。

## 7. 成果物候補

調査工程の版付き成果物候補:

- research input manifest
- style candidate registry
- instruction fixture package
- element preview manifest
- short motion preview manifest
- full-clip comparison manifest
- machine QC
- human review input
- human selection/edit history
- preset distillation record

正式台帳への昇格は人間合格後とし、未認定候補を正式成果物へ混ぜない。

## 8. 停止条件案

- renderer非依存instructionへ表現値を戻さないと実装できない。
- 意味packageまたはA-v002文字保持契約の改訂が必要になる。
- 既存正式成果物・stable tagへ影響する。
- font/license/toolchainを固定できない。
- QCで観測できない表現を正式化する必要が出る。
- API/外部有料処理が必要になるが、費用・効果測定・代替分岐が未設計。
- G4〜G7意味観測の実在前に見た目だけをproductionへ焼き込む必要が出る。

## 9. 要裁定一覧

1. speaker_onlyから始めるか、三画面型を同時調査するか。
2. 基準書体一つか、役割別font familyか。
3. 作品色と意味種別色の優先順位。
4. 行分割を決定的単独選択か、候補列挙+AI/人間選択か。
5. motion初版をfade改良だけにするか、代替一種を含めるか。
6. opening hookをtitle拡張か独立instruction kindか。
7. G4のみから始めるか、G5 commentも含めるか。
8. 外部rendererを比較対象に含めるか。
9. 既存素材だけで始めるか、新教師素材を追加するか。
10. 人間確認を三段にするか二段にするか。
11. 段2〜5をどこまで同一工事に含めるか。

## 10. 本来の目的との照合

目的は装飾機能を増やすことではない。ZEVGが圧縮した意味を、視聴者が短時間で理解し、続きを見たくなる作品へ変える表現体系を作ることである。

そのため、数値presetを先に増やさず、意味指示との対応、機械QC、人間採否、蒸留可能な履歴を一組で調べる。美しさを検査件数で代用せず、再現性を人間の好みだけで代用しない。

