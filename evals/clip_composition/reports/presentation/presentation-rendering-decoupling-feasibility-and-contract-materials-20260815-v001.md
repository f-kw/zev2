# ZEVO描画疎結合化 実現性調査・契約設計素材 v001

日付: 2026-08-15

状態: **読み取り専用の設計素材**。契約、実装方式、移行方式を確定しない。決定が必要な箇所は全て`要裁定`と記す。

## 0. 結論

ZEVO内部を「表示内容と発火時刻を受け、レンダラー非依存の演出指示成果物を作る側」と「その成果物を具体的な文字・配置・動き・合成へ変える自作レンダラー」に分ける現物上の土台は存在する。

ただし、現在の字幕品質v002経路とタイトルC経路は、次の表現値をレンダラーへ渡す直前の計画へ既に埋め込んでいる。

- 行分割済み文字列
- 文字幅上限と行数
- preset / visual state
- font、色、縁、光彩、背景
- 位置
- fade
- canvas / safe area

したがって、既存描画計画を名前だけ「演出指示書」に変える方法では疎結合にならない。新しい版付き指示成果物を、表示内容・意味種別・時間・対象・素材参照までに閉じ、行分割以降を自作レンダラー入口の後ろへ移す必要がある。

本書はその契約の起草ではなく、現物証拠、schema骨格、工事下限、移行順、競合点を整理した材料である。

## 1. 実現性調査

### 1.1 調査正本

| 現物 | SHA-256 | 現物位置 | 実在確認した責務 |
|---|---|---|---|
| 演出指示―レンダラー境界契約v002 | `578dc405ed70a87c63ded9b1b7fb4205653c3c7c92974a7d127b20bb96648001` | §2〜§9 | 発火点、意味種別、対象、preset ID、素材参照と、文字形・配置・動き・合成の分離 |
| G1〜G3機械検査設計v001 | `cb2c72ed04f1224681d691c63171fe94eb32e7eab2cb192cfed54f2a8c07c0ec` | 7〜15、42〜230行 | G1追跡可能性、G2表示切替・改行・文字全量、G3時刻anchor・順序・重なりを意味/構造側で検査する既存定義 |
| 命令契約v004 | `caab417919e03e2ff9b169aaeba731104f8ed01d9a2963f81f801bea79e1d21c` | 56〜86、101〜215行 | 縦型speaker_onlyのbundle、display plan、preset、幅制約を一組で検査する入口 |
| renderer plan v002 | `3a77c7feb7005fa06d7e45a6364f76ab4bc40a8622370568cf557d5090f08b79` | 406〜427、455〜627行 | instructionの意味対象からvisual state、transition、行、frameを解決する実入口 |
| 字幕render plan v003 | `5c16cf593aeb070a32e9bdb4936647a2a1a1becc6a17e276be33214dd69a03d6` | 84〜147、158〜233、240〜319行 | 意味package、表示cue、styleからrenderer共通計画を作る入口 |
| renderer overlay入口 | `5047dc3bcd51e8623cd090a443955828d38986db8338f53f2c9030e07cc952b7` | 36〜104、150〜237、239〜410、412〜625行 | font、色、縁、光彩、背景、位置、safe areaを具体描画へ変換 |
| 共通描画core | `c90dc00456ade415e46cf8c692c49f3d08ae0ab21186b10227cdb5676f445292` | 704〜735、1327〜1662行 | overlay製造、layout inspection、合成、媒体検査、QC |
| 字幕品質v002 proof runner | `04ace7753c77e716dd20d9ccfec8e4359db489558f12a930d18efe4e7387891b` | 1035〜1275行 | page/line plan→render plan→common plan→共通描画coreを同runner内で直結 |
| タイトルC runner | `b95779bc360e6a701ddb072132b5f1e596b19302bc60d08c43b6652c715b7f54` | 553〜832行 | title meaning、style registry、既存動画を読み、title計画と描画を同工程で実行 |
| title compositor | `26c2f3a5591b7f2ba465ff86d9e2875851ec25b97b38dca0ee0ee99d85731984` | 現物全909行 | title文言から行分割・profile適用・renderer証拠を構築 |
| 正式タイトルC横型計画 | `1954fcd6bf65d6db5b9d9c452a8d97ad177c319f992d832ea1115c0210843838` | 46〜77行 | 横型profile、180frame、1行、タイトル文字列を保持 |
| 正式タイトルC縦型計画 | `00a1dcc42f5571b59332e10c1ebfb2664f6c6407b439369bc1447288978f141d` | 46〜77行 | 縦型profile、180frame、2行、同じタイトル文字列を保持 |
| 字幕page/line plan v003実例 | `cae0a08cb2420940a63048a7e0f259c4f75ec873fcae033b0abe56ecd5360846` | 28〜40行以降 | 横型style、3 cue、行末境界、frame写像を保持 |
| 字幕render plan v003実例 | `c7eb5d279ea118f77c50b4b4d41e925dbab298f8302eb524b555c64ad9f0f773` | 58〜70、969〜980行 | page/line planを複製し、base mediaとmeaning projectionを追加 |
| 横型preset台帳 | `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8` | 現物全体 | caption、G4〜G7相当のvisual state、4frame fadeを保持 |
| 縦型preset台帳 | `3a3e0b7b9ce4e349f778b8035c60085a101f7631373404bdc8252a9cc7532133` | 現物全体 | speaker_only caption用134px、幅14、2行、4frame fadeを保持 |
| タイトルstyle台帳v004 | `27e58b9405d599a85c58c957725a992fc38db47b2a19170d724b4849fbe66634` | 現物全体 | 横・縦の上段帯、80px、冒頭180frameを保持 |

全て作業ツリーの現物を読み取った。API通信、描画、検査再実行は行っていない。

### 1.2 現在の実データ経路

#### 字幕品質v002

```text
ZEVG意味package
  ↓
境界選択結果
  ↓
page/line plan v003
  - cue終端
  - 行末
  - 行分割済み文字
  - frame写像
  - resolved style
  ↓
render plan v003
  - base media binding
  - meaning projection
  - 上記表示計画を全量複製
  ↓
common core plan v003
  - canvas / layout rules
  - visual state / transition
  - preset / material refs
  ↓
共通描画core
  - overlay props
  - Remotion静止画
  - FFmpeg合成
  - QC
```

`page/line plan`まではZEVOが所有する表現判断であり、ZEVGとの境界は守られている。一方、`common core plan`は既にfont、色、位置、背景、fadeを含み、自作レンダラー固有の入力である。renderer非依存の中間成果物は保存されていない。

#### タイトルC

```text
タイトル付き意味package
  + 既存字幕完成動画
  + title style台帳
  ↓
title display plan
  - profile
  - format / canvas / safe area
  - 180frame
  - 行分割済み文字
  ↓
title compositor + 共通描画core
  ↓
完成動画 + QC
```

タイトル文言は意味packageから供給され、表示はZEVOが所有している。しかし、title display planは行分割とprofileを既に確定し、renderer非依存の指示成果物としては表現値を持ちすぎる。

### 1.3 既存指示契約で再利用できる骨格

旧境界契約と命令契約v003/v004には次が実在する。

- instruction ID
- 発火点
- 意味種別
- 対象参照
- preset ID
- material refs
- resolution package
- source atom / caption targetの来歴

横型preset台帳には、`speech-caption`だけでなく、G4強調4種、G5情報3種、G6話者、G7参照補足に対応するkind policyとvisual stateが実在する。

ただし、2026-08-02以降の裁定ではG4〜G7出力は演出の決定でなく意味観測情報であり、演出種類の選択はスタイルに照らしたZEVO側責務である。したがって、旧契約の「ZEVがpreset IDまで決める」部分をそのまま新境界の正本にしてはならない。

### 1.4 現在の密結合

| 密結合 | 現物 | 分離時に必要なこと |
|---|---|---|
| 行分割とrenderer入力 | v003 planが`indexedLines`をそのままcommon coreへ渡す | 指示成果物は全文・意味単位・時間だけを持ち、行分割をrenderer側へ移すかを固定する |
| styleと意味対象 | render planが`resolvedStyle`を保持し、common coreがvisual stateへ解決 | style選択の所有者と、指示成果物に持つのがstyle intentかprofile IDかを固定する |
| titleと専用compositor | title計画がprofile・行・frameを一つに保持 | caption/title共通の指示種別と、title固有の開始終了責任を固定する |
| base mediaと描画計画 | render planがbase media bindingを直接保持 | 指示成果物と媒体入力を別bindingでrenderer admissionへ渡す |
| crop | 現経路はcrop適用済みbase mediaをrendererへ渡す | 指示成果物へcrop値を入れず、crop済み媒体bindingだけを入口で照合する |
| QC | 共通coreがlayout、描画、媒体、音声、公開を一工程で検査 | 指示検査と描画QCの所有を分け、traceをreceiptで繋ぐ |

## 2. 境界候補

### 2.1 候補となる二つの正式成果物

#### A. presentation instruction artifact

ZEVOの表示判断側が出す、renderer非依存の版付き成果物候補。

保持候補:

- 意味package / timeline /選択結果のbinding
- output formatの参照
- instruction ID
- 意味種別
- 表示本文または本文参照
- 開始・終了の出力時刻またはframe範囲
- 意味対象と来歴
- material refs
- style intentまたはstyle profile参照

含めない候補:

- 行分割
- font asset / font size
- 色、縁、光彩、背景
- pixel座標、safe area実値
- crop決定値
- animation curve
- renderer tool path

`要裁定`: styleを「意味種別だけ」に閉じるか、「選択済みstyle profile ID」まで指示成果物へ入れるか。

`要裁定`: captionの意味小単位cue終端を指示成果物へ保持し、行末だけをrendererへ移すか。cue終端までrendererへ移す案は、意味境界をZEVO表示実装へ再移動するため現裁定と衝突する可能性がある。

#### B. renderer admission receipt

自作レンダラー入口が次を一組として受け入れた証拠候補。

- instruction artifact binding
- crop適用済みbase media binding
- style / material / font台帳binding
- canvas / format binding
- renderer実装binding
- admission statusと閉語彙違反

receipt後にだけ、行分割、座標、font、色、fade、animation、overlay propsを解決する。

`要裁定`: receiptを独立成果物にするか、renderer job受入報告に含めるか。

### 2.2 schema骨格（契約ではない）

```text
presentation-instruction-artifact-v001
  schemaVersion
  artifactId
  sourceBindings
    meaningInformationPackage
    timeline
    selectionOrHumanDecision
  outputIntent
    format
    screenLayoutId?        # 要裁定
    styleProfileId?        # 要裁定
  instructions[]
    instructionId
    semanticKind
    content
      text | meaningReference
    outputTime
      startFrame
      endFrameExclusive
    targetProvenance
    materialRefs[]
    styleIntent?           # 要裁定
  provenance
```

禁止fieldの検査候補:

```text
indexedLines
fontSizePx / fontColor / fontAssetId
border* / glow* / background*
position / offset* / safeAreaPx
crop viewport / crop filter
transition frames / easing / animation curve
```

`要裁定`: 出力frameへ写した時刻を指示側が持つか、ms時刻を持ってrenderer admissionがframeへ写すか。現字幕v003はframe写像済み、タイトルCもframe範囲を持つため、最小移行はframe保持であるが未承認である。

### 2.3 pipeline出口検査候補

表示判断側の出口で検査する候補:

1. formal byteとexact schema。
2. bindingのstable再読とSHA一致。
3. instruction ID一意性。
4. 開始・終了が正の範囲で、timeline内に閉じる。
5. 本文または意味参照の全量閉包。
6. semantic kindが閉語彙内。
7. target / material参照が実在。
8. 表現field混入0件。
9. ZEVG意味packageの本文・順序・時刻を変えていない。
10. title、caption、将来G4〜G7を同じ外枠で運べる。

### 2.4 renderer入口検査候補

1. instruction artifactの正式受入receipt。
2. crop適用済み媒体のpath・SHA・frame/audio実体照合。
3. format / canvas / style台帳の組合せ成立。
4. semantic kindごとのstyle解決が一意。
5. 使用素材・fontの正式binding成立。
6. 行分割・配置・animationをrenderer内だけで製造。
7. instruction→applied visualの一件対応をapplication resultへ残す。
8. silent fallback、旧plan fallback、union schemaを禁止。

## 3. 現物一件表

| 表示要素 | ZEVGから来る意味 | 現在ZEVOが作る中間値 | 現在rendererへ渡る値 | 疎結合後の候補 |
|---|---|---|---|---|
| G1 | 表示対象と元発話・atomの追跡関係 | source/target/cueの対応検査 | 視覚値ではなく検査結果 | 指示成果物の各表示命令が意味対象へ追跡可能であることをpipeline出口で保証し、rendererは表示内容を再選択しない |
| G2 | cue切替、行末候補、対象文字の全量・順序 | 欠落・重複・逆順とcue/line分離の検査 | 現行では行をrendererへ直渡し | cue切替と文字全量を指示側の保証に残し、視覚的な行分割をrendererへ移す境界候補。境界の最終位置は要裁定 |
| G3 | atomにanchorされた表示時刻、論理順、重なり許可 | frame写像、順序・重なり検査 | start/end frame | 意味時刻と順序制約を指示成果物へ保持し、frame写像の所有位置は要裁定 |
| caption | 本文、atom時刻、timeline | cue終端、行末、行、frame、style | 行、visual state、position、fade | cue本文・時間・意味対象までを指示成果物、行と見た目をrenderer |
| title | title文字列 | profile、行、冒頭180frame | 行、top-band visual state | title本文・表示期間・意味種別を指示成果物、帯・font・行をrenderer |
| G4 | 強調候補/抑制の意味観測 | 現正式v002経路では未接続 | 横型台帳には4 visual state実在 | semantic observationからstyle選択するZEVO工程が必要 |
| G5 | 情報種別 | 現正式v002経路では未接続 | 横型台帳にはcomment/narration/lyrics実在 | 情報種別と本文を指示成果物、card表現をrenderer |
| G6 | 発話と話者対応 | 現正式v002経路では未接続 | 横型台帳にnameplate実在 | speaker targetを指示成果物、名札表現をrenderer |
| G7 | 参照対象と素材候補 | 現正式v002経路では未接続 | 横型台帳にreference card実在 | material refを指示成果物、画面構成をrenderer |

## 4. 工事下限

現物上、新成果物のschema/codec、共通builder、renderer admissionを所有する入口は存在しない。既存render plan v003やtitle compositorへ埋めると再び形式別の密結合になる。

### 4.1 path下限（固定値ではない）

少なくとも次の**新規6 path**が必要になる。

1. instruction artifact schema/codec/builder
2. 1のtest
3. renderer admission/receipt
4. 3のtest
5. caption/title共通のinstruction publication runner
6. 5のtest

少なくとも次の**既存6 path**へ影響する。

1. caption proof runner
2. caption proof test
3. title runner
4. title runner test
5. common render coreまたはその正式adapter
6. renderer integration test

したがって読み取り時点の工事下限は**12 path（新規6、既存変更6）**である。正式契約ではpublication、failure schema、receipt owner、G4〜G7入口の扱いにより増える可能性がある。減らすために責務を一fileへ詰め込む判断はしていない。

`要裁定`: 完全設計前に上限を固定するか、現物閉包後にexact path表を提示するか。恒久規律との整合上、後者が必要と見込むが未承認である。

### 4.2 binding下限

formal jobごとに最低でも次の2 bindingが増える。

1. approved instruction contract/design binding
2. instruction artifact binding

receiptを独立成果物にする場合はrenderer jobとcompletionへreceipt bindingがさらに1件ずつ必要になる。titleとcaptionで別artifactを作らず同一schemaを使うことは可能だが、正式件数はjob一件表なしには確定できない。

## 5. 移行順候補

後方互換fallbackを作らないforward-only移行候補:

1. 現在のタイトルC二本、A-v002六plan、既存五treeをbyte oracleとして凍結確認する。
2. instruction artifactとrenderer admissionを新規生成専用で追加する。
3. caption v002の横型一caseだけを新経路へ接続し、instruction→visual applicationのtraceを閉じる。
4. 同じcaption caseで現在のplan・動画・QCとの意味等価と目視品質を確認する。
5. title Cを同じinstruction外枠へ接続する。
6. 横型/縦型のformat差をstyle入力だけで処理できることを確認する。
7. 新規生成を新経路へ切り替え、旧直接経路を新規生成から外す。
8. G4〜G7は意味観測が正式成立した後に、instruction kindからstyleを選ぶ別工事として追加する。

`要裁定`: 最初の実証をcaption横型、title C、または両方同時のどれにするか。

`要裁定`: 旧直接経路の物理削除を本工事で行うか、スケルトン清書で行うか。後方互換分岐は禁止のため、新規生成の二重経路は残さない必要がある。

## 6. 並列化できる作業と競合

### 6.1 並列化候補

| lane | 作業 | 他laneから独立できる条件 |
|---|---|---|
| A | instruction schema、禁止field、formal codec | semantic kindとtime表現が裁定済み |
| B | renderer admission、receipt、application result | Aのartifact binding shapeだけ固定済み |
| C | title/captionのproducer一件表 | Aのexact入力shape固定済み |
| D | byte oracle、QC、目視比較、trace proof | A/Bの成果物名とbindingだけ固定済み |
| E | 表現力調査 | 契約を変更せず、現在rendererを観察対象にする限り独立 |

### 6.2 競合するpath

- `presentation_output_render_plan_v003.mjs`
- `run_presentation_zevo_caption_quality_v002_proof_job_v001.ts`
- `run_presentation_output_title_job_v001.ts`
- `presentation_output_title_compositor_v001.mjs`
- `render_presentation_v002.mjs`
- 各対応test

F/U fixture製造工事はcaption proof runner/testへ触れるため、同時実装は競合する。設計素材の作成は並行可能だが、production実装はF/U fixture工事の安定点後に始めるのが安全である。

`要裁定`: 描画疎結合化をF/U fixture工事完了直後に行うか、A-v002安定点化後に行うか。

## 7. 品質と証明の接続

疎結合化で検査を弱めないため、証明を二層に分ける。

### 指示成果物層

- 意味本文・時刻・対象の全量閉包
- 表現field混入0件
- material参照実在
- deterministic formal byte
- ZEVG入力とのtrace

### 自作renderer層

- style解決一意性
- 行分割・配置・font・色・動きの決定性
- safe area、重なり、欠落、終端
- overlay差分による実表示証明
- video/audio/frame/QC
- 人間A/Bと採否履歴

この分離により、意味指示が正しいのに見た目が悪い場合をrenderer側へ、意味対象や発火が誤っている場合を指示側へ帰属できる。

## 8. 要裁定一覧

1. 指示成果物がstyle intentだけを持つか、style profile IDまで持つか。
2. cue終端は指示側、行末だけrenderer側という分離でよいか。
3. 時刻をframeで持つかmsで持つか。
4. renderer admission receiptを独立成果物にするか。
5. 最初の実証をcaption横型、title C、両形式同時のどれにするか。
6. 旧直接経路の削除時期を本工事かスケルトン清書か。
7. exact path上限をいつ固定するか。
8. 実装着手をF/U fixture工事完了直後かA-v002安定点化後か。

## 9. 本来の目的との照合

本作業の目的はrendererを別packageへ移すことではない。表示内容・発火・対象という意味判断を、font・行・色・位置・動きという表現実装から、正式成果物と受入検査で分離することである。

現物上、分離可能性はある。しかし、既存render planを流用して名前だけ変える方法は目的を満たさない。次段では本書の要裁定を先に確定し、その後に全fieldの供給者→検証時点→exact引数→consumer→転記先を閉じた契約設計が必要である。
