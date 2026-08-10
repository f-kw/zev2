# A-v002 文字atom・字幕をまたぐ切断契約設計 v001

日付: 2026-08-09

種別: 人間裁定待ちのforward-only契約設計。正本化・実装・描画は未実施

調査基準commit: `a64caf20f4e1e1acf6e5640ecca053f770d3f424`

通信: 0回

費用: US$0

## 1. 結論と今回の停止点

旧層1 v3で人間合格済みの三つの切断時刻を1msも動かさず、文字を欠落・重複させずに表すには、**一つの意味atomを一度だけ保持し、そのatomが実際に残る元時刻片を一つ以上の配列として持たせる方式**が最小である。

たとえば`ぁ [4083972, 4087055)`の途中`[4084435, 4086915)`を除く場合、文字`ぁ`は一つのまま、時間の支えだけを次の二片にする。

```text
ぁ
  [4083972, 4084435)
  [4086915, 4087055)
```

ZEVOは二片を既存の時刻写像で別々に出力frameへ写し、切断後のタイムライン上で接していることを検査する。その上で`ぁ`を一度、連続して表示する。切り落とした時間には文字を割り当てない。

この方式を本書では**案B: 1 atom + 複数の採用時刻片**と呼び、推奨する。

今回kawafmmに求める判断は、この字幕扱い1件だけである。承認後は、本書の固定事項に基づいて実装前のpath・検査ID閉包を行い、別の人間判断を挟まず実装へ進む。実装・検査・動画生成は本書提示時点では行わない。

## 2. 実現性調査

### 2.1 現物の入口と拒否点

| 現物 | SHA-256 | 行位置 | 調査結果 |
|---|---|---:|---|
| `evals/clip_composition/presentation_meaning_information_package_v001.mjs` | `46562003fabb1032b1422c2fe266e79f8a6f30f8c27214302f8436c670276567` | 184-189 | 現行AtomRefは一つのtimeline segmentに属する形だけ |
| 同上 | 同上 | 365-443 | 採用区間と正に交差しながら全体が入らないatomを`SOURCE_ATOM_PARTIAL_INTERSECTION`で拒否 |
| 同上 | 同上 | 760-800、968-1026、1084-1113 | captionは一つのsegment、連続した一つの元時刻区間、全文字atomの一回利用を要求 |
| `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` | `f28178327ddc0cc64f11527d850c71bfb5043b4e13f59f6da7997fd8f6d6cad0` | 1016-1068 | atom途中を切ると保持atomを作らず、境界部分交差として拒否 |
| `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` | `6bd3adba0b12d118df93ffd978c29a727db49003c8391d47f82f23a14ea796ba` | 224-317 | 任意の整数ms端を持つ複数segment自体は既に表現可能 |
| `evals/clip_composition/presentation_base_media_build_v001.mjs` | `5e76f31c71f6a3d95fc9d0a3980174b326a2d1e630c8800fdfaee57efa7d5287` | 1091-1225、1545-1611 | 同一媒体の昇順・非重複区間を映像trim/concatし、音声sampleを連結する正本は実在 |
| `evals/clip_composition/presentation_base_media_timeline_v002.mjs` | `a1f72079f0e970cb5c6a67817427aa5909f2453ad0d04e81150cfd29c5b41ab2` | 1252-1348 | 一つの元時刻区間を一つのsegmentへ写す正本。複数segment跨ぎは明示拒否 |
| `evals/clip_composition/presentation_output_page_line_planner_v001.mjs` | `febb8c489db4585369d1d77f9cdcca02fe591cc83ceeae309896ad3e37f95262` | 107-165、306-320、431-474 | caption/pageを一つのsegmentとして扱い、上記単一区間写像を一回だけ呼ぶ |
| `evals/clip_composition/presentation_renderer_entry_v001.tsx` | `5047dc3bcd51e8623cd090a443955828d38986db8338f53f2c9030e07cc952b7` | 88-104、193-230、250-308 | 実描画は文字・行・出力frame・座標を使い、元segmentを直接知らない |

現物から確定したことは二つである。

1. 動画と音声の切断・連結計算は既にある。新しいtrim/concat実装は要らない。
2. 不足は、ZEVGの文字閉包と、ZEVOが複数の元時刻片を一つの表示へ写す入口である。

したがって、v001の部分交差拒否だけを外す修正は不可である。拒否を外すだけでは、文字をどの時間へ置くかが未定義のままになる。

### 2.2 正本契約と凍結範囲

| 正本 | SHA-256 |
|---|---|
| 意味情報パッケージ契約v001 | `a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de` |
| 出力側受け入れ契約v001 | `c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de` |
| 9切断の一次資料 | `ca9c037d133e6b2f1fee92ee15edc904310222211d83839930299af1b627c664` |
| 旧v3人間確認結果 | `cb08a7607b6d99f3f7fd5ef27582a90b096ac07356d9fd7fc59fef740b44a3bc` |

既存v001、既存3本、既存検査、stable tagは一切変更しない。新規生成だけがv002を使う。v001をv002として読む変換、v002失敗時のv001 fallback、旧新併産は作らない。

### 2.3 実現性調査で見つけた二つの縫い目

#### 旧v3の正式意味入力

旧v3三候補には現行の正式意味情報パッケージがない。一方、保存済み`package-input.json`には各候補の外側区間と発話本文がある。現行transcriptとの読み取り照合結果は次のとおりである。

| 候補 | 現行atom数 | 保存済み発話本文とのbyte一致 |
|---|---:|---|
| `...:2:voice-013` | 101 | 一致 |
| `...:5:voice-067` | 72 | 一致 |
| `...:5:voice-190` | 80 | 一致 |

実データ実証では三候補を別々のfixtureとし、保存済み発話一つを意味caption一つとして正式入力化する。本文は現行atomの連結から機械復元し、保存済み本文とのbyte一致を必須にする。新しい文言・境界・意味判断は加えない。三候補を一つの物語へ連結もしない。

#### 縦型の画面型

旧v3三候補の実映像はゲーム画面と話者を含むため`screen_speaker`型である。現行正式台帳に登録済みの縦型は`speaker_only`だけで、`screen_speaker`を正式成果物に使うことはできない。

A-v002の実証で誤った`speaker_only` cropを適用しない。横型3本は正式styleで作る。縦型3本は字幕の跨ぎ方だけを確認する版付き診断出力とし、全画面を縦canvas内へ欠落なく収める決定的fitを使う。これはpreset台帳へ登録せず、crop品質や公開品質の合格を主張しない。確認対象は字幕本文・表示継続・音声・切断時刻だけである。`screen_speaker`正式presetの作成はAへ混ぜない。

## 3. 責務境界

| 所有者 | 所有するもの | 所有しないもの |
|---|---|---|
| ZEVG | 除去を意味判断で採用した事実、採用された元区間列、元atom、各atomが残る元時刻片、caption本文とatom順 | frame丸め、行分割、文字サイズ、配置、crop、繋ぎの見せ方 |
| ZEVO | 各元時刻片のframe/sample写像、page/line、style、crop、hard cut、描画 | 除去採否、文字の削除・複製、元切断時刻の変更 |

時刻は整数msの半開区間とする。frame/sampleは既存正本だけが導出する。文字を時間比で分配する係数、切断端の丸め、短い側・長い側への文字付替えは置かない。

## 4. A-v002の正式記録

### 4.1 採用元区間列

schema名は`presentation-adopted-source-sequence-v002`とする。rootのexact fieldは次の6件である。

```text
schemaVersion
sequenceId
parentSemanticInputBinding
segments
removalDecisionBindings
provenance
```

各segmentのexact fieldは次の6件である。

```text
segmentId
storyOrdinal
sourceTimeOrdinal
sourceMediaId
sourceStartMs
sourceEndMs
```

- `storyOrdinal`と`sourceTimeOrdinal`は、それぞれ1から始まる欠番なしの正整数列。
- 配列順は`storyOrdinal`と一致する。
- A-v002初版の実行能力は、一つの媒体、物語順=元時刻順、元時刻昇順、非重複、正長だけ。
- 採用区間列は、承認済み外側区間から`remove`認定区間をexactに引いた補集合である。
- `keep`と`defer`は除去しない。VAD観測だけで`remove`へ昇格しない。
- transitionはZEVG記録へ入れない。A初版のZEVO styleが既存方針どおり素繋ぎを選ぶ。

schemaが将来の物語順と元時刻順を別々に表せても、逆順・区間再利用・複数媒体の実行はO1まで拒否する。A内でO1本体を先取りしない。

### 4.2 ZEVG最終出力v002

schema名は`zev-meaning-information-package-v002`とする。rootのexact fieldは次の9件である。

```text
schemaVersion
packageId
sourceMedia
timelineComposition
atomOccurrences
captions
title
semanticObservations
provenance
```

`sourceMedia`、`title`、`semanticObservations`の意味はv001正本と同じである。v002 decoderはv001を受理しない。

#### timelineComposition

`timelineComposition`は`timelineId / segments`のexact 2 field。segmentは§4.1の6 fieldと同一値である。

#### atomOccurrences

各atom occurrenceは次の7 fieldだけを持つ。

```text
atomOccurrenceId
ordinal
sourceMediaId
sourceAtomId
text
sourceAtomInterval
retainedSpans
```

`sourceAtomInterval`は`sourceStartMs / sourceEndMs`のexact 2 field。元transcriptの値と完全一致し、書き換えない。

各`retainedSpans`要素は次の3 fieldだけを持つ。

```text
timelineSegmentId
sourceStartMs
sourceEndMs
```

成立条件は次のとおりである。

1. occurrenceは親の全文字atomと同じ順で、一つの元atomにつきexact 1件。
2. `text`は元atom本文とbyte一致。
3. 各spanは`sourceAtomInterval`と一つの採用segmentの正の交差そのもの。係数・丸め・拡張・短縮をしない。
4. span列は物語順で、正長、重複0。
5. 同じ元atomが切断前後に残る場合、複数spanを一つのoccurrenceへ束ねる。文字を複製しない。
6. A-v002初版では全occurrenceにspanを1件以上要求する。atom全体が消える除去案は、音がないことだけで本文削除を決めないため拒否する。
7. 全spanの和集合は、元atomと採用区間列の交差集合にexact一致する。

#### captions

各captionのexact fieldは次の4件である。

```text
captionId
ordinal
text
atomOccurrenceIds
```

- 全captionの`atomOccurrenceIds`を平坦化した列は、全occurrence列と欠落・重複・順序差0で一致する。
- caption本文は参照occurrenceの`text`を順に連結したbyteと一致する。
- 単一の`timelineSegmentId / sourceStartMs / sourceEndMs`は持たない。複数segmentをまたぐcaptionに、存在しない連続元区間を記録しないためである。
- captionの表示時刻は、参照occurrenceのspan列を平坦化したものからZEVOが一意に導く。

#### provenance

exact fieldは次の3件である。

```text
formalJobBinding
parentSemanticInputBinding
adoptedSourceSequenceBinding
```

各bindingはschema版・path・file SHA・canonical SHAを保持し、開始時と公開直前に再読する。旧v3実証の`parentSemanticInputBinding`は、§2.3の保存済み発話と現行atomの一致を記録した版付き入力を指す。

## 5. ZEVO v002の受け入れ

1. page/line候補は従来どおり、意味atom occurrenceの境界だけで切る。ZEVGへ行分割を戻さない。
2. page対象occurrenceのspanを物語順で平坦化する。同じsegment内では最初のspan開始から最後のspan終了までをpageの表示包絡区間とし、segmentをまたぐ所だけ区間を分ける。atom間の通常の時間差を誤って削除しない。
3. segmentごとの表示包絡区間を既存`mapPresentationSourceIntervalV002`へ個別に渡す。新しいframe計算は作らない。各mappingはexact一つのsegmentに入らなければ拒否する。
4. A初版では、切断をまたぐ隣接segmentについて、前mappingの終了frameと次mappingの開始frameがexactに接することを要求する。隙間・重複・逆順は拒否する。
5. pageの来歴はatomの`retainedSpans[]`、segmentごとの`sourceSpanEnvelopes[]`、`frameMappings[]`を分けて保持する。描画用には最初の出力frameから最後の出力frameまでの一つの連続表示へ投影する。
6. 同じ文字をspanごとの描画要素へ複製しない。実描画器へ渡す本文は一回だけ。
7. 行折り・style・crop・安全領域・タイトル・演出は現行ZEVO責務のまま。

これはAに必要な**同一媒体・時刻昇順のpiecewise写像**だけであり、O1の逆順・複数媒体・場面役割・物語順実行ではない。A完了後にO1へ接続する予約は維持する。

## 6. 字幕の扱いの比較

| 案 | 動作 | 意味の安全性 | 決定性 | 判定 |
|---|---|---|---|---|
| A: atomを断片化 | 切断位置でatomを左右へ割り、文字を片側へ置く | 一文字をどちら側へ置くか新しい意味判断が要る。両側へ置けば重複する | 先側・長い側等を決めれば機械化できるが、根拠のない独自規則になる | 不採用 |
| **B: 1 atom + 複数の採用時刻片** | 文字は一回だけ。切断前後の残った時間を配列で持ち、出力上で連続表示 | 本文・atom順・切断時刻を全て維持できる | 整数区間の交差だけで一意 | **推奨** |
| C: atomを保持して片側へ時刻を寄せる | 文字は一回だが、表示を切断前か後のどちらかへ寄せる | 元時刻を黙って変更する。側の選択に新判断が要る | 規則化はできるが無承認の時刻改変 | 不採用 |
| D: atom全体を落とす／atom端へ丸める | 文字削除、または切断時刻変更 | 全量閉包か人間認定時刻を壊す | 決定的でも要件不成立 | 禁止 |

案Bでは「保持したまま表示時間だけ圧縮する」が正確である。ただし元atomの時刻を書き換えるのではない。元時刻は不変で、採用された時間の支えを複数spanとして別に記録する。

## 7. 9切断の机上照合

### 7.1 人間合格済み旧v3三件

| 候補 | 切断 | 切断atom | v002のretained spans | 完全消失atom |
|---|---:|---|---|---:|
| `...:2:voice-013` | `[4084435,4086915)` | `ぁ [4083972,4087055)` | `[4083972,4084435)`, `[4086915,4087055)` | 0 |
| `...:5:voice-067` | `[4455270,4457090)` | `が [4453870,4457212)` | `[4453870,4455270)`, `[4457090,4457212)` | 0 |
| `...:5:voice-190` | `[4611230,4613470)` | `ク [4610824,4616745)` | `[4610824,4611230)`, `[4613470,4616745)` | 0 |

三つとも、人間合格済みの切断時刻を変えず、文字を一回だけ残せる。

### 7.2 candidate 59のVAD観測6件

6件を同時に除去した場合の採用区間列は次の7件になる。

```text
[5941162,5964902)
[5965502,5967602)
[5968362,5977982)
[5978502,5980022)
[5980462,5982562)
[5983082,5983902)
[5984702,5992736)
```

外側51,574msのうち、採用47,934ms、観測上の除去3,640msである。この数値は表現可能性の照合であり、6件を意味上`remove`と認定した記録ではない。

| atom | 元時刻 | v002のretained spans |
|---|---:|---|
| `word-17833`「の」 | `[5964437,5968359)` | `[5964437,5964902)`, `[5965502,5967602)` |
| `word-17834`「う」 | `[5968359,5968439)` | `[5968362,5968439)` |
| `word-17904`「の」 | `[5977687,5978867)` | `[5977687,5977982)`, `[5978502,5978867)` |
| `word-17914`「ど」 | `[5979568,5980869)` | `[5979568,5980022)`, `[5980462,5980869)` |
| `word-17932`「う」 | `[5982369,5984951)` | `[5982369,5982562)`, `[5983082,5983902)`, `[5984702,5984951)` |

全281 atomに正のspanが1件以上あり、完全消失atomは0件である。同じatom内に2切断があるため、span数は2固定では足りず、1件以上の配列が必要である。6件全てを同一契約で表現できる。

## 8. forward-onlyと保証境界

### 保証すること

- 人間認定済み切断時刻を整数msでexact保持する。
- 元atom本文・順序・元時刻を保持する。
- 全文字をexact 1回だけcaptionへ載せる。
- 採用区間との交差だけをretained spanとして持つ。
- 切断時間を出力frame/sampleへ写さない。
- 横型と縦型でZEVG package byteを共用し、style差をZEVOだけに置く。

### 保証しないこと

- VAD観測だけからremoveを決めること。
- 完全に消える文字atomの自動処理。
- 逆順・同一区間再利用・複数媒体の実行。
- `screen_speaker`の正式縦型preset品質。
- 旧v3三候補を一つの物語へ編集すること。
- candidate 59の6件が見聞きして自然であること。6件は表現可能性だけを確認する。

## 9. 実装・検査計画

### 9.1 path見込み

現物の所有単位から、実装は**26 path以内**を見込む。内訳は次のとおりである。

| 群 | path数 | 役割 |
|---|---:|---|
| A観測・意味採否・採用区間列 | 6 | core、runner、検査、正式job接続 |
| atom時刻再構築・意味package v002 | 6 | core、runner、検査、旧v3 proof入力 |
| ZEVO piecewise写像・planner・render plan v002 | 8 | 複数span写像、page/line、native plan、検査 |
| base media・正式出力runner v002 | 4 | 既存trim/concat正本adapter、正式実行、検査 |
| 実データpreflight・横断回帰 | 2 | 旧v3三fixture、凍結tree、環境・TAP |
| **合計** | **26** | production計算の複製0 |

案B承認後、編集前に26 pathをexact path一件表へ閉じ、検査IDと違反所有者を固定する。この閉包は実装準備であり追加の人間判断にしない。27 path目、既存契約の意味変更、既存正本計算の複製が必要なら実装前に停止する。

### 9.2 最低限の検査群

| 群 | 必須証明 |
|---|---|
| 採用区間列 | remove集合のexact補集合、整数半開区間、順序、非重複、no-op、逆順能力拒否 |
| atom再構築 | 1 span、2 spans、3 spans、隣接2 atom、完全消失拒否、intersection exact、本文一回 |
| caption閉包 | occurrence全量・順序・本文byte一致、複数segment caption、欠落・重複拒否 |
| ZEVO | segment別表示包絡ごとの既存mapper利用、切断境界のoutput frame接触、切断時間未写像、page本文一回、横縦で意味byte同一 |
| 実データ | 旧v3 3/3の時刻不変、candidate 59 6/6机上fixture、映像frame・音声sample総数 |
| 正式経路 | strict byte、no-replace、開始・公開前再読、TAP全ID、失敗帰属、通信0 |
| 回帰 | green 287/287、baseline 86/203 exact、既存5 tree、既存v001拒否・v002拒否の相互非互換 |

正式件数は、案B承認後の実装前閉包で、実在する全拒否枝の発火を割り当てて固定する。件数だけを先に置かず、ID・枝・期待codeの一件表を正本とする。

### 9.3 実データ実証

- 旧v3三候補を独立した3 fixtureとして扱う。
- 各候補について横型1本、縦型の字幕診断1本を生成し、合計6本。
- 横型は正式登録済みstyle。縦型は§2.3の全画面fit診断で、正式preset昇格なし。
- API通信0回、費用US$0。
- cutは人間合格済み時刻を再利用し、新しい採否判断0件。
- QC後、6本を一つの確認ページへ載せる。人間作業は1回のまとめ確認で、素材総尺は横型約80秒＋縦型約80秒、再生約2分40秒、操作込み目安4分。
- 人間目視前にstable tagを切らない。

## 10. 停止条件

- 案B以外の字幕規則を実装者判断で混ぜる。
- 切断時刻の丸め、atom本文の分割・複製・欠落。
- atom全体が消えるのに自動継続する。
- VAD観測だけでremoveを確定する。
- v001成果物・検査・stable tagに差が出る。
- 27 path目、frame/sample計算や文字幅計算の複製が必要になる。
- 逆順・複数媒体・正式`screen_speaker` presetへ範囲が広がる。
- 正式検査1件不合格。同attemptで直さない。
- 同一計画の軽微修正周回3回目。
- API通信または費用が必要になる。

## 11. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 現物の入口・分岐・schema・path | 照合済み | §2.1のSHA・行位置 |
| 発火を約束する現行拒否枝 | 照合済み | ZEVG部分交差、ZEVO複数segment拒否 |
| 観測データ取得可能性 | 照合済み | 旧v3の正式保存物、candidate 59の版付き6観測。candidate 59生VADなしは限界明記 |
| 値レベル閉包 | 済 | §4、§5、§7 |
| 数値区分 | 済 | 整数ms、frame/sampleは既存正本。係数0 |
| 工程間受け渡し | 済 | 採用区間列→atom occurrence→caption→piecewise写像 |
| 意味/表現境界 | 済 | §3 |
| 既存文書hash照合 | 済 | §2.2 |
| 旧v3の意味入力 | 解決案固定 | 保存済み発話と101/72/80 atomのbyte一致を正式fixture化 |
| 縦型画面型 | 限界を偽らず固定 | 正式`screen_speaker`は作らず字幕診断だけ |
| 実装path・検査ID | 人間裁定後に機械閉包 | 26 path上限と必須群は§9。案B以外ならpathが変わるため未固定 |

## 12. 事実・推測・未確認

### 事実

- 現行v001は9切断を全て文字atom部分交差として拒否する。
- 旧v3三切断は3/3人間合格済みで、時刻は固定済み。
- 9切断全てに、切断後も正の長さで残るatom部分がある。完全消失atomは0件。
- candidate 59の6件は同時適用しても全281 atomに正のspanが残る。
- 既存映像・音声coreは複数の昇順区間を連結できる。

### 推測

なし。案Bの表現可能性は整数区間の読み取り計算で確認した。

### 未確認

- 案Bで実描画した字幕が切断前後に違和感なく見えるか。実装後の6本目視で確認する。
- candidate 59の6観測を実際にremoveして自然か。意味採否記録がないため、今回の実証では切らない。
- 正式`screen_speaker` presetの見た目。A工程の範囲外。

## 13. 承認依頼

**案B「一つの意味atomを一度だけ保持し、採用された元時刻片を1件以上の配列として持たせ、ZEVOが出力上の連続表示へ写す」をA-v002の字幕規則として承認してください。**

承認後は、26 path以内のexact実装表と検査一件表を実装前に機械閉包し、追加の人間待ちなしで、実装→検査前監査→正式検査・既存回帰→旧v3三候補の横型3本・縦型字幕診断3本→完成報告まで進む。実装前閉包が本書の範囲を超える場合だけ停止する。

本書の提示で停止する。実装、API通信、描画、正式成果物生成、commit、tagは行わない。
