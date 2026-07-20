# 解決パッケージ source atom 話者欄の契約改訂候補 v001

- 作成日: 2026-07-20
- 状態: **調査・改訂案のみ。未承認、未実装**
- 対象: `presentation-resolution-package-v001` の `sourceAtoms[].speaker`
- 人間作業: **0件・0分**
- 書き込み範囲: 本文書1本のみ。契約、検査器、テスト、fixture、DECISIONS、HANDOVERは変更していない。

## 1. 目的と停止点

現行の解決パッケージでは、元発話の `speaker` は任意欄として許可されている一方、値型を検査する専用コードがない。そのため、同時表示の話者区別や将来のG6生成へ入る前に、実データに基づいて次の3点を分離する。

1. 元STTが付けた、配信内だけで有効な話者ラベル。
2. 人へ表示する名前と、人物を一意に示すID。
3. 話者を判定できなかった状態。

本文書は改訂候補の提示で停止する。契約版の改訂、コード変更、テスト追加、fixture変換は、kawafmmの個別承認後に別工程で行う。

## 2. 調査対象

### 2.1 実データ

`evals/clip_composition/fixtures/*/transcript.json` の全11ディレクトリ、35,618発話を読み取り、各発話の `speaker` の有無、JSON型、値を集計した。`draft_` で始まる1件は凍結済みfixtureと混ぜず、参考データとして分離した。

### 2.2 現行契約

次を照合した。

- `presentation_caption_contract.mjs`: source atomのID、本文、時刻は検査するが、`speaker` 自体の値型は検査していない。
- 同検査器の同時表示group検査: `speaker` が空でない文字列なら「既知話者」として比較する。
- `presentation_instruction_contract.mjs`: 解決パッケージのsource atomに `speaker` を許可し、caption検査器へ同じsource atomsを委譲する。
- 合成testdata: `SPEAKER_MARINE` / `SPEAKER_KORONE` をsource atomへ置き、人物表示名はspeaker targetの `speakerDisplayName` に別記している。

## 3. fixture実データの棚卸し

| fixture | 発話数 | `SPEAKER_00` | `SPEAKER_01` | `SPEAKER_02` | `unknown` | `youtube-auto-caption` | null | 欄なし |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `9dtwF5Exu5w_multiblock_material_v001` | 807 | 625 | 58 | 0 | 124 | 0 | 0 | 0 |
| `IMQYaT_RWRA_audio_v001` | 23 | 0 | 0 | 0 | 23 | 0 | 0 | 0 |
| `IMQYaT_RWRA_clip_audio_v001` | 32 | 0 | 0 | 0 | 32 | 0 | 0 | 0 |
| `IMQYaT_RWRA_context_v001` | 32 | 0 | 0 | 0 | 32 | 0 | 0 | 0 |
| `UpRyakf5j80_clip_audio_v001` | 20 | 0 | 0 | 0 | 0 | 20 | 0 | 0 |
| `XauLZgnWHtA_part01_partial_material_v001` | 367 | 300 | 3 | 0 | 64 | 0 | 0 | 0 |
| `aX-axQMWR3c_single_material_v001` | 631 | 533 | 22 | 0 | 76 | 0 | 0 | 0 |
| `nE_bNeBNp4E_multiblock_material_v001` | 1,890 | 1,523 | 181 | 33 | 153 | 0 | 0 | 0 |
| `nOEWCNc77MI_multiblock_material_v001` | 739 | 637 | 13 | 0 | 89 | 0 | 0 | 0 |
| `r_ztjHaHmcg_partial_material_v001` | 520 | 501 | 0 | 0 | 19 | 0 | 0 | 0 |
| **上記10件合計** | **5,061** | **4,119** | **277** | **33** | **612** | **20** | **0** | **0** |
| `draft_w4Lp9IJC6pQl3FsRfFL9t`（参考） | 30,557 | 49 | 81 | 29,314 | 1,113 | 0 | 0 | 0 |
| **全11件合計** | **35,618** | **4,168** | **358** | **29,347** | **1,725** | **20** | **0** | **0** |

### 3.1 棚卸しで確定したこと

- 実fixtureの話者欄は全件文字列だった。
- `SPEAKER_00` 等は人物名ではなく、STT処理内の相対ラベルである。同じラベルを別配信間で同一人物とみなせない。
- `unknown` は人物を示さない未判定値である。
- `youtube-auto-caption` は字幕取得方法を示す値で、人物ではない。
- source atomの `speaker` に人物表示名を保存したfixtureは **0件**、`null` は **0件**、欄なしは **0件**だった。
- 人物表示名の実例はsource atomではなく、合成testdataのspeaker targetにある `speakerDisplayName: "戌神ころね"` である。

したがって「SPEAKER_00型・表示名型・nullが既存fixtureに混在する」という前提は、現在の正本fixtureからは確認できなかった。表示名とnullを将来入力として受けられる構造は検討できるが、「実fixtureで観測済み」とは記録しない。

## 4. 現行契約の問題

### 4.1 JSON型が未検査

現在は `speaker: 1`、`speaker: {}`、`speaker: []` もsource atomの専用違反として検出されない。source atom全体をrejectする根拠が曖昧になる。

### 4.2 人物でない値を既知話者として扱う

同時表示groupは空でない文字列を既知話者とみなすため、`unknown` 同士を同一話者、`unknown` と `youtube-auto-caption` を別話者として扱いうる。これは人物区別ではなく、入力由来の記号差である。

### 4.3 配信内ラベルと表示名の責務が曖昧

`SPEAKER_00` は配信内の声クラスタ、`speakerDisplayName` は人に見せる名前で、役割が異なる。source atomの文字列をそのまま表示名や素材人物IDへ使うと、GT-05で観測した人物割当誤りと同型の事故を機械的に固定してしまう。

## 5. 推奨する値型

`speaker` はsource atomごとの**配信内話者ラベル**としてだけ扱い、次の型へ固定する。

```text
speaker?: null | non-empty-string
```

意味は次のとおり。

| 形 | 意味 |
|---|---|
| 欄なし | 入力形式が話者情報を供給していない。 |
| `null` | 入力形式は話者欄を持つが、このatomの話者を決められない。 |
| 空でない文字列 | 同一`sourceProvenance`内だけで比較できる不透明な話者ラベル。`SPEAKER_00`も表示名文字列も構造上はここへ入る。 |

追加規則:

1. 文字列は前後空白なし・1文字以上とする。検査器はtrimして別値へ直さず、不適合として停止する。
2. `unknown` と `youtube-auto-caption` は人物でないことが実データで確定しているため、解決パッケージ生成時に `null` へ写す。生fixtureは変更せず、`sourceProvenance`で元データの由来を保持する。
3. 文字列一致は、同一解決パッケージ内の「同じ声クラスタらしい」という比較だけに使う。配信をまたぐ人物同一性、表示名、アイコン適合性を証明しない。
4. 表示名は既存どおりspeaker targetの `speakerDisplayName`、人物同一性はtargetの `speakerId`を正本とする。source atomの `speaker` から暗黙生成しない。
5. source atomに表示名文字列が供給された場合も、解決パッケージ内では不透明な配信内ラベルとして扱う。人へ表示するには、別途speaker targetの明示対応が必要。

### 5.1 構造化objectへ広げない理由

source atomごとに `speakerId`、`displayName`、信頼度を持つobjectへ拡張する案は採らない。現在のfixtureが持つのは主にSTTの相対ラベルであり、人物IDや表示名の正解は無い。値を増やすと、機械話者クラスタを人物認定済み情報のように見せるだけになる。人物対応は既存speaker target側へ一度だけ記録する方が、責務と誤りの位置が明確になる。

## 6. 専用違反コード案

新しい値型は、source grammarの既存違反へ混ぜず、次の専用コードで検出する。

| code | 発火条件 | path | 処理の意味 |
|---|---|---|---|
| `SOURCE_ATOM_SPEAKER_TYPE_INVALID` | 欄が存在し、値が`null`でも文字列でもない | `$.source.atoms[N].speaker` | 話者欄を解釈せず契約不成立にする。 |
| `SOURCE_ATOM_SPEAKER_EMPTY` | 文字列が空、または前後空白を除くと空 | 同上 | 空文字を未知話者の別表現として通さない。 |
| `SOURCE_ATOM_SPEAKER_NOT_CANONICAL` | 文字列の前後に空白がある | 同上 | 検査器内で暗黙trimせず、生成側へ修正を返す。 |
| `SOURCE_ATOM_SPEAKER_NON_IDENTITY_TOKEN` | 値が実測済みの非人物値 `unknown` または `youtube-auto-caption` | 同上 | 人物でない値を既知話者として使わず、生成側に`null`化を要求する。 |

同時表示groupで、参照atomの `speaker` が欄なしまたは`null`なら、既存の `SOURCE_SIMULTANEOUS_GROUP_SPEAKER_UNKNOWN` を維持する。型不正と、話者未判定で同時表示を許可できない状態を別コードにする。

`SPEAKER_00`形式だけを正規表現で強制するコードは作らない。既存fixtureには`SPEAKER_02`まである一方、将来の表示名型も非空文字列として構造上受ける必要があり、命名規則を人物意味の証拠にできないためである。

## 7. 版改訂の範囲案

この変更はsource atomの受理条件と同時表示判定の意味を変えるため、既存v001へ無断追記しない。実装承認後は少なくとも次を版付きで改訂する。

1. source grammarを持つcaption契約をv002にする。
2. 解決パッケージを`presentation-resolution-package-v002`にする。
3. 外枠検査器はv002 source grammarを1回だけ委譲し、新専用コードを改変せず伝播する。
4. source atomを受ける境界契約の版と影響範囲を、実装前に確定する。
5. v002実装でv001を推測変換・自動受理する後方互換分岐は入れない。

凍結済みfixtureは変更しない。fixture transcriptから解決パッケージを作る工程で、由来を保持したまま `unknown` / `youtube-auto-caption` を `null` へ明示変換する。

## 8. 実装承認後に必要なテスト案

### 8.1 適合

- `speaker`欄なし。
- `speaker: null`。
- `speaker: "SPEAKER_00"`。
- `speaker: "宝鐘マリン"`。構造上は適合するが、表示名としての使用許可を意味しないこともassertする。
- 同一解決パッケージ内で同じ非nullラベルを同一話者、異なる非nullラベルを異なる話者として比較する。

### 8.2 不適合

- number、boolean、object、array。
- 空文字、空白だけ、前後空白付き文字列。
- `unknown`、`youtube-auto-caption`。
- 欄なし／null話者のtargetを同時表示groupへ入れ、既存unknownコードが発火すること。

### 8.3 帰属確認

- source atomの話者ラベルとspeaker targetの `speakerId` / `speakerDisplayName` が異なる文字列でも、明示targetにより解決できること。
- source atomのラベルだけからspeaker target、表示名、speaker icon compatible subjectを生成しないこと。
- 全専用コードが意図した入力で1回以上発火し、export集合とテスト観測集合が一致すること。

## 9. DECISIONS追記案（未反映）

> 解決パッケージのsource atom話者欄は、同一source内だけで比較する任意の配信内ラベルとし、欄なし=話者情報の供給なし、null=当該atom未判定、非空文字列=不透明ラベルと定義する。`unknown`と`youtube-auto-caption`は人物でない実測値なのでpackage生成時にnullへ写し、既知話者として扱わない。人物ID・表示名・素材適合はspeaker target側の明示対応を正本とし、source labelから暗黙生成しない。改訂はcaption source grammar・resolution package・境界契約の版を揃え、v001への無断緩和や後方互換分岐を行わない（改訂候補、2026-07-20）。

## 10. 判断が必要になる地点

本文書の提示までは人間作業0件で完了した。次に必要なのは、次の3点を一括した**契約改訂方針の1判断**である。

1. `speaker?: null | non-empty-string`を採る。
2. `unknown` / `youtube-auto-caption`を解決パッケージでは`null`へ写す。
3. 人物表示名と人物IDはspeaker targetにだけ置き、source atomから暗黙生成しない。

承認後に初めて、契約版の確定、コード、検査器、testdataの変更計画を提示する。本副線では実装しない。
