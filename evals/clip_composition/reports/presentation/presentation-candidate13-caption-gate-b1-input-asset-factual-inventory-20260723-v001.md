# candidate 13 基本テロップ ゲートB1入力資産 事実棚卸し v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`の方向判断待ち
- 状態: **既存資産の実在項目・来歴・保存状態だけを照合した。B1設計・実装・正式生成・Gemini実走なし**
- 書き込み範囲: 本レポート1件だけ。共有文書、承認済み設計、コード、正式成果物は変更していない
- 人間作業: 0件。新しい確認・承認依頼を追加しない

## 1. 目的と結論

本調査の目的は、ゲートB1を設計する段階で「既にあると思っていた項目」を推測で使わないよう、candidate 13の現在の実物を棚卸しすることである。方向設計そのものは未承認なので、field名、成果物構成、変換規則を本レポートで決めない。

結論は次の四点である。

1. **元の354文字は正式成果物として保存済み**で、本文、順序、文字時刻、発話まとまり、raw話者値、正式2区間への所属を追跡できる。
2. **205境界候補は決定的に再生成できるが、正式成果物としては未保存**である。ゲートAの正式出力先は現在も不存在で、完了報告には候補本体ではなく、入力・環境の束縛、実測投影、検査結果と三つのhashが残る。
3. **候補ごとの論理表示幅は既存ゲートA証拠に存在しない。** 認定済みpresetとrenderer trustには論理文字幅規則・一行上限・最大行数があるが、B1がどの版付き処理で候補幅へ変換し束縛するかは未固定である。これはfontで測るpixel幅とは別の値である。
4. raw話者値は元文字にあるが、**未承認のゲートB方向案ではモデル可視項目に列挙されていない。** `SPEAKER_00`は人物保証のない不透明ラベル、`unknown`は版付き台帳で非人物値として扱われる。

したがって、「B1を作る材料はある」と「B1入力packageが既にある」は別である。後者はまだ存在しない。

## 2. 保存済み資産の状態

### 2.1 正式な残存文字成果物

正式directory:

`evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/`

| ファイル | 処理上の意味 | SHA-256 | 状態 |
|---|---|---|---|
| `source-atoms.json` | 人間採用済み2区間内に残る文字正本 | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` | 正式保存済み |
| `generation-manifest.json` | 元STT・正式決定・基礎映像・実装の来歴 | `18094dd3729eead88c498f997e883253a1481ee8a33279882350aacfcf869cf1` | 正式保存済み |
| `validation-report.json` | 13分類の検査記録 | `be32244280a2564eda9a716a83d04da38f241120a6d2ba40e72e867072fc2ae6` | `passed`、違反0件 |

正式文字成果物の意味上のhash:

- 成果物全体のcanonical SHA-256: `0bf1e10ab94388ec9521cb2270e6c339e7c7b6d8317443b469606b6b353df43c`
- 生の354文字配列のcanonical SHA-256: `cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3`

### 2.2 ゲートA jobと境界証拠

正式な読み取り専用job:

`evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/DmWu0jVQfTE-candidate-13-v001.json`

- job実byte SHA-256: `e72d2f3ae91ca337cceca0c2d4ba3e5954f02372eeca0a0d02f8eb324de54ee0`
- 実行mode: `read-only-preflight`
- 正式実行結果: 10検査すべて合格、違反0件
- 予約済み正式出力先: `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`
- 現在の正式出力先: **不存在**

境界証拠本体とpreflight JSON reportは正式ファイルとして保存されていない。ゲートA完了報告には、実測投影、三つのevidence hash、読み取り専用検査の結果が人間可読な記録として保存されている。

### 2.3 読み取り専用の再照合

本副線の独立監査では、固定済み3入力、固定Node実体、既存のexport済み純粋生成処理を使い、境界証拠をメモリ内だけで再構成した。正式runner、正式job実行、公開、ファイル書込は行っていない。

再構成した三つのhashは、ゲートA完了報告と一致した。

| 対象 | SHA-256 |
|---|---|
| 205境界候補配列 | `0f8e7b07c32befc4e4703e1945b61e7656a2e978a8ba959fd169a753efe454b6` |
| 候補から元文字への所属対応 | `b2da8ee1b3fef9c23b5598d73713d77831f392471cf98a9723392ef115ea50fd` |
| 境界証拠全体 | `be4344dd5d97596a815a92ae283d0da3c7353600b2983e93cf53b1947c5338eb` |

この再照合は正式成果物の生成ではない。下流が参照できる正式な境界証拠pathは、引き続き存在しない。

## 3. 正式354文字の実在項目

各文字は全件同じ七項目を持つ。

| 項目 | 型・実測 | 処理上の意味 |
|---|---|---|
| `atomId` | string、`word-6932`〜`word-7285`、全件一意 | 元文字の参照ID |
| `speechId` | integer、1・2・3 | 元の発話まとまり |
| `speaker` | string、`SPEAKER_00` 325件、`unknown` 29件 | STT由来のraw話者値。人物保証ではない |
| `text` | string、全354件がUnicode 1文字 | 元本文。整文・正規化なし |
| `startMs` | integer、1,920,260〜2,008,486 | 元配信上の文字開始時刻 |
| `endMs` | integer、1,920,480〜2,008,506 | 元配信上の文字終了時刻 |
| `sourceRef` | string、全件`youtube:DmWu0jVQfTE` | 元配信参照 |

実測構造:

| 単位 | 文字数 | ID範囲・所属 |
|---|---:|---|
| 全体 | 354 | `word-6932`〜`word-7285` |
| 正式区間1 | 248 | `segment-0001` |
| 正式区間2 | 106 | `segment-0002` |
| 発話1 | 126 | 正式区間1 |
| 発話2 | 122 | 正式区間1 |
| 発話3 | 106 | 正式区間2 |

- 正時間重なり: 0件
- 非正時間文字: 0件
- 文字長: 全354件が1 code point
- 文字時刻長: 最小20ms、最大4,921ms
- `speaker`欄なし: 0件
- `speaker:null`: 0件

文字時刻があることは、音響上の自然な切断位置であることを保証しない。candidate 13で既に記録された「STT構造終端≠音響終端」の制約は、この正本にも適用される。

## 4. 境界候補の実在schemaと実測

### 4.1 候補を作る単位

機械は元文字配列を順番に読み、同じ正式区間かつ同じ`発話まとまり`が連続する最大範囲を一つのcontainerにする。containerは生成途中の構造で、境界証拠top-levelにcontainer配列としては保存されない。各候補がcontainer IDを参照する。

実測container:

| container | 正式区間 | 発話 | 元文字 | 境界候補 |
|---|---|---:|---:|---:|
| `segmenter-container-000001` | 1 | 1 | 126 | 60 |
| `segmenter-container-000002` | 1 | 2 | 122 | 78 |
| `segmenter-container-000003` | 2 | 3 | 106 | 67 |

### 4.2 各境界候補の十二項目

| 項目 | 実際の由来 |
|---|---|
| `boundaryCandidateId` | 全containerを通した元順の決定的通番 |
| `containerId` | 生成途中のcontainer |
| `timelineSegmentId` | 正式文字成果物に保存された区間所属 |
| `speechId` | 正式文字成果物に保存された発話まとまり |
| `sourceAtomIds` | Segmenter範囲と完全一致する元文字の連続列 |
| `text` | 対応文字を元順に無正規化で連結した本文 |
| `startAnchor` | 先頭文字IDと`start`端 |
| `endAnchor` | 末尾文字IDと`end`端 |
| `segmenterIndexUtf16` | container本文内の開始位置 |
| `segmenterLengthUtf16` | Segmenterが返したUTF-16 code unit長 |
| `isWordLike` | `Intl.Segmenter`が返した真偽値 |
| `sourceAtomCount` | 対応元文字数 |

候補には、次の項目は存在しない。

- millisecond単位の開始・終了・時間長。
- frame・sample。
- 論理表示幅、pixel表示幅、行数。
- raw話者値や人物名。

時刻と話者証拠は、候補の`sourceAtomIds`から正式354文字へ戻って解決できるが、候補自体には複製されない。

### 4.3 実測投影

- 境界候補: 205件
- word-like / non-word-like: 205 / 0
- 元文字の欠落・重複・逆順: 0件
- 正式区間越え・発話越え: 0件
- 複数raw話者値を含む候補: 12件
- raw話者集合が`unknown`だけの候補: 11件
- 一候補の元文字数: 最小1、最大4

元文字数別の候補分布:

| 元文字数 | 候補数 |
|---:|---:|
| 1 | 103 |
| 2 | 67 |
| 3 | 23 |
| 4 | 12 |

205件は自然な日本語の語数でも、完成テロップ数でもない。これは、機械候補が354文字を欠落・重複なく覆うことを示す実測である。

## 5. 認定済み表示契約に実在する情報

### 5.1 固定preset

正式preset台帳:

`evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json`

- 実byte SHA-256: `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8`
- canonical SHA-256: `5915d6aae47681c43ea202a20eee16cbf669abfe24fdc832f75fb127ad46dca4`
- 初描画で使うpreset: `normal-landscape-readable-pop-v001`
- 基本テロップ状態: `caption-core-v001`
- 一行の論理幅上限: `maxCharsPerLine: 36`
- 最大行数: `maxLines: 2`
- 一行固定: `false`
- font asset: `line-seed-jp-extra-bold-v001`

preset台帳と空素材台帳の検査indexを束縛する正式registry binding:

`evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/trusted-registry-bindings.json`

- 実byte SHA-256: `b26db5c57aac5dd290e084d953350778b527c6eb21f66f62dc7431bf24482fff`
- canonical SHA-256: `bfbbcb5c611313d368305e6e8d552ddcdaf41949ed8d8f074485c8ed0aa2d43e`
- schema: `presentation-registry-trust-v001`

これとは別に、preset本体、上記registry binding、承認済みpreview、font、描画部品、layout規則とtool版を束縛する正式renderer trustがある。

`evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json`

- 実byte SHA-256: `04ec4971d078413b68c19869b0285130ec553f14601f45d27125738a7498eddc`
- canonical SHA-256: `9d5ffe631033dc594c917649e2529899e303f3cb8a7d7b1b65ea0d26b7c645f2`
- layout rule版: `normal-landscape-render-layout-v001`
- 文字幅規則: `U+0000..U+00FF=1; other Unicode code point=2`
- layoutの数値・式を変える場合: 新previewと人間再認定が必要

このrenderer trustは現行renderer v002の信頼根である。B1がどのtrustと実装hashを入力契約へ採用するかは、未承認方向案の後に固定する事項であり、現時点では決まっていない。

### 5.2 現在の論理幅処理

既存の版付き文字配置処理:

`evals/clip_composition/presentation_renderer_text_layout_v001.mjs`

- 実byte SHA-256: `066a62adaa7fa3f8b8eda92c82e9a85940e43f372af976edc4b327ef4cf9ce5e`
- `U+0000..U+00FF`のcode pointを重み1、それ以外を重み2として数える。
- 行の合計がpresetの上限を越える手前で折り返す。
- 最大行数を越えれば検査不合格にする。

この既存処理は、物理的なfont pixel幅を測る処理ではない。`maxCharsPerLine`というfield名でも、実際の比較値は上記のcode point重みである。

また、現行rendererの**非caption自動折返し**はこの重みと上限を使うが、**基本captionの明示行経路**は本文不変と最大行数を検査するだけで、一行36論理幅単位を直接検査していない。したがって、既存rendererがB1の候補幅検査まで既に保証しているとは言えない。

重要な現在地:

- ゲートA証拠には候補ごとの論理表示幅fieldがない。
- 候補の`segmenterLengthUtf16`はSegmenterのUTF-16長であり、表示幅ではない。
- preset、trust、文字幅処理は実在する。
- B1でどの入力byteと実装byteを束縛し、どのfield名・論理幅単位で保存するかは未固定である。

したがって、論理幅の**根拠資産はあるが、候補幅成果物はまだない**。また、この論理幅だけでfontのpixel幅や最終配置の合格を保証するものではない。

## 6. 話者情報の実在範囲

### 6.1 raw値

正式354文字では、raw話者値は次の二種類だけである。

| raw値 | 文字数 | 意味上の限界 |
|---|---:|---|
| `SPEAKER_00` | 325 | STTの不透明ラベル。人物名・同一人物の正しさを保証しない |
| `unknown` | 29 | 人物を特定できない値 |

### 6.2 非人物値台帳

版付き台帳:

`evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json`

- 実byte SHA-256: `9e6f6c5e57c0b0823840c70fe0e3de05592cbc88819def6020a7c1cfaf211f3a`
- canonical SHA-256: `093fa63d1314fdd9d432c348d470522e81eda6fd1cd97973a3b36a510dc1ff02`
- 完全一致対象: `unknown`、`youtube-auto-caption`
- package生成時の正規化先: `null`
- `SPEAKER_00`は台帳対象外で、人物保証のない不透明ラベルとして残る。

この台帳は、raw値から人物名を推定する台帳ではない。非人物値を`null`へ写すだけである。`unknown`から`null`への写像が実装済みなのは既存v002解決パッケージ生成器であり、candidate 13用v003成果物はまだ存在しない。

### 6.3 B1方向案での可視性

未承認のゲートB方向案がモデル可視として列挙しているのは、container ID、境界候補IDと本文、container全文、候補の論理表示幅、表示制約、仕事の説明だけである。話者証拠は列挙されていない。

現時点で確定しているのは「モデル可視項目に話者が列挙されていない」ことまでである。次の線引きはB1契約で明示的に固定する必要がある。

- 決定的処理・検査・来歴で保持する範囲。
- モデル可視allowlistから話者値を除外するか。
- 話者名の推定は方向案では今回の範囲外。

## 7. モデル可視案と実在資産の対応

方向案は未承認であるため、次表は「承認済みschema」ではなく、提案された可視項目に対応する実物の有無を示す。

| 提案されたモデル可視情報 | 元になる実在資産 | 現在の保存状態 |
|---|---|---|
| container ID | ゲートAの決定的生成処理 | 正式package未生成。メモリ再生成可能 |
| 境界候補ID | ゲートAの決定的生成処理 | 同上 |
| 各候補の本文 | 境界候補の`text` | 同上 |
| container全文 | 正式354文字を区間・発話まとまり別に無正規化連結 | container自体は正式artifactに未保存 |
| 各候補の論理表示幅 | 認定済みpreset、trust、版付き文字幅処理 | 候補ごとの値は未生成・未保存 |
| 一行上限と最大2行 | `caption-core-v001` | 正式preset台帳に保存済み |
| 分割作業の説明 | 将来のprompt台帳 | 未作成・未承認 |

元文字正本にはあるが、モデル可視案へ出さない情報:

- 元文字IDと候補から元文字への対応列。
- 文字時刻、frame、sample。
- 正式区間ID、timeline ID、発話ID。ただし、モデルへ見せる案のcontainer区切り自体は正式区間と発話まとまりから決定的に派生する。
- raw話者値。
- sourceRefと取得来歴。
- assembly decision、人間回答、既存表示計画。
- path、hash、manifest、validation report。
- 教師切り抜き、expected、fixture、DP照合、人間ラベル、描画比較結果。

未承認方向案を採用する場合、`source-atoms.json`は内部ID、生時刻、話者、正式選択の来歴を含むため、そのままモデルへ渡さず、可視項目だけの別投影を作る必要がある。

同様に、未承認方向案ではゲートA境界証拠全体もそのままモデルへ渡さない提案である。候補本文以外に、`speechId`、元文字ID列、anchor、正式区間ID、source binding、runtime bindingを含むためである。方向案を採用するなら、境界証拠からallowlist項目だけを取り出した別の投影が必要になるが、その投影成果物はまだ存在しない。

## 8. B1設計前に残っている事実上の空所

次は、現行資産に存在しないか、正式成果物として未生成である。ここでは解決方法を決めず、不在だけを記録する。

1. 正式な205境界候補ファイル。
2. モデル可視項目だけを持つsource-only JSON。
3. 候補ごとの論理表示幅値と、基本captionの一行上限を直接検査する入口。
4. モデル出力を元354文字へ戻す正式な対応表。
5. source-only完全allowlistと漏洩検査結果。
6. ゲートA形の内包検査記録と、B1 package全体の検査記録を分けたschema。
7. B1 package manifest、原子的公開、公開後検品の正式契約。
8. 意味分割結果の厳密shape、意味分割グループとB4正式cueの関係。
9. prompt台帳、execution payload、Gemini raw出力。

1〜8は、方向承認後のB1完全契約で固定する候補であり、本副線で固定しない。9はB1より後の別停止点である。

## 9. 現在の信頼境界

現在、次の実装byteはゲートA jobの固定値と一致している。

| 役割 | SHA-256 |
|---|---|
| 境界証拠生成・検査core | `dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a` |
| 正式354文字の検査core | `11036f09ceac1d1f5e19f5487eeae8d39c84ec7675cc8f9d693a203182d27f28` |
| 読み取り専用preflight runner | `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352` |

ゲートAの合否に使う実行環境:

- Node binary SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- Node: `v20.19.6`
- ICU: `77.1`
- locale: `ja`
- granularity: `word`

`Intl.Segmenter`の出力に依存するため、これらを外した再生成は「同じゲートA証拠」とは呼べない。

## 10. この副線が変更していないもの

- ゲートB方向設計の承認状態。
- 承認済み元設計とゲートA契約。
- ゲートAの正式1回実行記録。
- 正式354文字と既存hash。
- 予約済み正式出力先の不存在。
- prompt、Gemini、v003、指示書、描画。
- candidate 11・12・36と凍結済みfixture・expected・confirmedペア。

本副線が追加する人間作業は、**0件・0分**である。主線で既に提示済みの方向判断1件を増やさない。
