# candidate 13 基本テロップ source-only漏洩面 事実棚卸し v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`の方向判断待ち
- 状態: **既存JSONの全階層と既存漏洩検査を棚卸しした。B1 schema・prompt・正式package・コード・Gemini実走なし**
- 書き込み範囲: 本レポート1件だけ。共有文書、承認済み設計、コード、正式成果物は変更していない
- 人間作業: 0件。新しい確認・承認依頼を追加しない

## 1. 目的と結論

未承認のゲートB方向案は、Geminiへ見せる情報を、元発話から作った境界候補と認定済み表示制約だけに閉じる。本調査では、その入力を作るときに既存成果物を丸ごと渡してよいかを、全fieldの出現件数と既存検査の能力から確認した。

結論は次の五点である。

1. **`source-only`は「元配信由来なら何でも見せてよい」という意味ではない。** 正式な元文字成果物には、生時刻、話者、内部ID、人間採用済み区間の来歴、path、hashが入る。分割判断に必要な本文の投影元ではあるが、ファイル全体はモデル入力にならない。
2. **ゲートA境界証拠も全体では渡せない。** 境界候補IDと本文に加えて、元文字ID列、anchor、発話・区間ID、実行環境、来歴を持つ。一方で、モデルに必要なcontainer全文、候補の論理表示幅、表示制約、仕事の説明は入っていない。
3. **既存6 JSONは合計121,895 bytes・3,517末端field occurrenceだが、そのまま使えるモデル入力ではない。** 方向案の概念上必要なのは、3 containerへ整理した候補ID・候補本文・候補幅、container全文、表示制約2値、仕事説明だけである。
4. **既存の漏洩検査をB1へ直接再利用できる入口は0件である。** 既存検査の多くは、列挙した禁止語だけを探すdenylist方式であり、未知field、必須field、型、順序、元データとの一致を保証しない。
5. **必要なのは、元成果物をspreadせずに作る新しい許可field投影と、全階層の完全一致検査である。** ただし、field名、schema、違反code、成果物構成は方向承認後のB1契約で決める事項であり、本棚卸しでは固定しない。

要するに、既存成果物を丸ごと渡す方式は、**不要な内部情報を大量に見せるのに、必要な入力情報は不足する**。

## 2. 調査対象と数え方

### 2.1 保存済み6 JSON

| 対象 | 実byte | 末端field occurrence | モデルへ丸ごと渡せるか |
|---|---:|---:|---|
| 正式な残存元文字 | 83,895 | 2,871 | 不可 |
| ゲートA読み取り専用job | 4,062 | 67 | 不可 |
| 元文字の生成来歴 | 8,476 | 120 | 不可 |
| 元文字の検査報告 | 5,774 | 81 | 不可 |
| 認定済みpreset台帳 | 14,291 | 308 | 不可 |
| renderer trust | 5,397 | 70 | 不可 |
| **合計** | **121,895** | **3,517** | **不可** |

対象path:

- `evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/source-atoms.json`
- 同directoryの`generation-manifest.json`
- 同directoryの`validation-report.json`
- `evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/DmWu0jVQfTE-candidate-13-v001.json`
- `evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json`
- `evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json`

### 2.2 メモリ再生成したゲートA境界証拠

正式な境界証拠directoryは未生成なので、固定済み354文字と既存の純粋生成処理から、読み取り専用でメモリ再生成した。正式job、正式runner、正式出力先への書込みは行っていない。

- compact JSON相当: 80,735 bytes
- field path型: 46
- 末端field occurrence: 3,051
- 境界候補: 205件
- 元文字への所属: 354件
- 既知の三つのhash: ゲートA完了記録と一致

### 2.3 集計単位

配列indexは`[]`へ正規化し、末端のstring、number、boolean、nullに加え、空配列・空objectも一つのfield occurrenceとして数えた。同じ値の重複出現も別に数える。保存済み6 JSONでは、この定義に空配列34件が含まれる。したがって、以下の件数はuniqueな事実数ではなく、**モデルへそのJSONを渡した場合に露出する末端項目の出現数**である。

## 3. 方向案が許可している情報

方向案§6がモデル可視として列挙している概念は次だけである。

1. container ID。
2. container内で元順に並ぶ境界候補IDと本文。
3. container全文。
4. 各候補の認定済み規則による論理表示幅。
5. 一行36論理幅・一cue最大2行という固定表示制約。
6. 「本文を変えず、読める意味の切れ目で1〜2行へ分ける」という仕事の説明。

方向案が明示的に「モデルへ見せない」と列挙している情報:

- 教師テロップ、expected、fixture、DP照合、過去の正解・表示計画。
- 人間採否、candidate-ranking、G4〜G7のラベル。
- 生のmillisecond、frame、sample値。
- 描画済み動画、比較結果、score。

次は明示的な禁止一覧ではなく、方向案の「モデルへ見せる内容は次だけ」という閉じた概念一覧に含まれない情報である。

- raw話者、発話ID、元文字ID、正式区間ID、anchor。
- path、hash、実行環境、git、validationの内部情報。

ここで重要なのは、**元配信に由来する話者・内部IDも、今回の閉じた可視概念一覧には含まれていない**ことである。これは正式なfield-level allowlistの確定ではなく、未承認方向案との照合結果である。

## 4. 正式な元文字成果物の漏洩面

### 4.1 全体

- field path型: 40
- 末端field occurrence: 2,871
- 方向案の可視fieldとそのまま一致する値: 0
- 本文の投影元である`text`: 354
- 本文以外の値: 2,517

`text`も、文字atom配列のままモデルへ渡す契約ではない。境界候補本文とcontainer全文へ、決定的処理で再構成してから見せる。

### 4.2 各文字に付随する情報

| 情報 | 件数 | 今回の扱い |
|---|---:|---|
| 1文字本文 | 354 | 候補本文とcontainer全文の投影元 |
| 元文字ID | 354 | 決定的な復元・検査専用 |
| 発話ID | 354 | 非可視 |
| raw話者 | 354 | 非可視 |
| 開始時刻 | 354 | 非可視 |
| 終了時刻 | 354 | 非可視 |
| 元配信参照 | 354 | 非可視 |

raw話者は`SPEAKER_00` 325件、`unknown` 29件である。人物名の保証ではなく、未承認方向案のモデル可視概念には含まれていない。本調査は、話者情報が意味判断に有用かどうかを評価していない。

### 4.3 選択と来歴

正式成果物には、人間が採用したcandidate 13、正式組立決定、基礎映像、timeline、2区間、各区間の出力frame範囲、元文字ID 354件の再掲、各種path・hashが入っている。

入力範囲自体が「人間が採用したcandidate 13の残存2区間」であることは、今回の正当な作業対象なので消えない。しかし、**その採用のID・媒体hash・区間時刻・frame写像までモデルへ見せる必要はない**。

### 4.4 path・hash・検査情報

top-level、4組の来歴参照、生成方針、canonical hash等は、正しい元データを使ったことを機械側で証明するために必要である。モデルが行末を選ぶ材料ではない。

したがって、このファイルは内部正本として必要だが、モデル入力ではない。

## 5. ゲートA境界証拠の漏洩面

### 5.1 全体

- field path型: 46
- 末端field occurrence: 3,051
- 方向案の概念へ直接対応する現在のfield occurrence: 615
  - 境界候補ID: 205
  - container ID: 205
  - 候補本文: 205
- 決定的処理・検査だけに保持すべき値: 2,436

container IDは実物では候補ごとに205回繰り返される。将来の概念投影では、3つのcontainerの親情報として整理できる。現在の615件を、そのまま最終入力の必要値件数とは扱わない。

### 5.2 各候補に付随する非可視情報

| 情報 | 値の出現数 | 処理上の意味 |
|---|---:|---|
| 正式区間ID | 205 | 元文字への復元 |
| 発話ID | 205 | container構築の検査 |
| 元文字ID列 | 354 | 本文完全対応の証拠 |
| 開始anchorの文字IDと端 | 410 | 復元・後段接続 |
| 終了anchorの文字IDと端 | 410 | 復元・後段接続 |
| Segmenter内のUTF-16開始位置 | 205 | Segmenter出力検査 |
| Segmenter内のUTF-16長 | 205 | Segmenter出力検査 |
| word-like判定 | 205 | Segmenter実測 |
| 元文字数 | 205 | 所属検査 |

候補のUTF-16長は、論理表示幅ではない。205件中203件で両者が異なるため、幅として流用できない。

### 5.3 top-levelの非可視情報

元成果物のpath・hash、source reference、元文字正本hash、Node実体・版、ICU、locale、platform、arch、Unicode/CLDR版、Segmenter方針、候補列hash、所属hashが32値ある。

これらは同じ境界候補を再生成した証明に必要だが、意味分割の判断材料ではない。

### 5.4 必要なのに存在しない情報

境界証拠全体を渡しても、次は得られない。

- 3件のcontainer全文。
- 205候補の論理表示幅。
- 一行36・最大2行の固定制約。
- 意味分割の仕事説明。

したがって、境界証拠全体の直渡しは、過剰露出を増やすだけで入力を完成させない。

## 6. 両方を丸ごと渡した場合

正式な元文字成果物とメモリ再生成した境界証拠を単純にJSON化すると、次の状態になる。

| 分類 | 末端field occurrence |
|---|---:|
| 全体 | 5,922 |
| 現在の境界証拠で可視概念へ直接対応する値 | 615 |
| 未承認方向案の可視概念へ現在の形のまま直接対応しない値 | 5,307 |

5,307件の内訳には、元本文354文字の未投影形も含む。そこを除くと、内部ID、時刻、話者、対応関係、実行環境、来歴、検査情報等の余計な露出は4,953件である。

これは「正解ラベルが5,307件ある」という意味ではない。境界証拠自体にexpectedや人間ラベルはない。問題は、**モデルの仕事に不要な内部状態を見せ、閉じた入力契約を失うこと**である。

なお、正式なfield-level allowlistはまだ存在しない。この5,307件はallowlist違反の検査結果ではなく、未承認方向案の可視概念一覧との事実照合である。

## 7. 関連する他の正式JSON

| 対象 | 全末端field occurrence | 今回モデルへ使える値 | 残りの意味 |
|---|---:|---:|---|
| ゲートA job | 67 | 0 | 実装、入力、runtime、期待投影、出力禁止の固定 |
| 元文字生成manifest | 120 | 0 | 直接・展開入力、正式決定、媒体、実装、出力hash |
| 元文字validation report | 81 | 0 | 検査結果と来歴 |
| preset台帳 | 308 | 2 | 一行36、最大2行。他はfont、位置、色、終了方針、G4〜G7方針等 |
| renderer trust | 70 | 0 | preset、preview、font、依存処理、tool、layout規則の信頼束縛 |

論理表示幅はrenderer trustに記載された規則から決定的に計算し、モデルには計算済みの幅だけを見せる。trust全体やfont pathを見せない。

presetの`singleLine: false`は機械側の制約であり、モデルに渡す仕事説明の「一cue 1〜2行」と重ねて別の自由入力にする必要はない。

## 8. 概念投影の読み取り専用試算

正式schemaではない診断用の概念形として、次だけをメモリで組み立てた。

- 3 container ID。
- 3 container全文。
- 205境界候補ID。
- 205境界候補本文。
- 205候補の論理表示幅。
- 一行上限と最大行数の2値。
- 仕事説明1件。

末端field occurrenceは624件だった。

完全性確認:

- 205候補本文の連結は正式354文字と完全一致。
- 3 container全文の連結も正式354文字と完全一致。
- 候補本文とcontainer全文では、同じ354文字を意図的に二つの見方で提示する。
- 候補本文1,058 UTF-8 bytes、container全文1,058 UTF-8 bytes。
- 候補IDは合計5,125 bytes。

診断時には仮のfield名とnestingでJSON byte数も測ったが、その値は未承認の形状へ依存し、再現可能な正式schemaではないため本レポートの結論に使わない。この試算は、正式field名、schema、prompt、違反規則、成果物を定義しない。使用モデル用tokenizerもprompt全体も未固定なので、**token数やモデル容量への適合は主張しない**。

## 9. 既存漏洩検査を直接使えない理由

### 9.1 既存の関連入口

次の8実装本文を、既存のsource-only漏洩検査・限定投影の母集団として調べた。

| 区分 | 対象 |
|---|---|
| standalone漏洩検査 | `inspect_prompt_payload_leakage.ts` |
| standalone漏洩検査 | `inspect_theme_generation_payload_leakage.ts` |
| 入力生成器内の再帰denylist | `build_theme_redo_source_only_payload.mjs` |
| 入力生成器内の再帰denylist | `build_callback_detection_v001_inputs.mjs` |
| ranking限定投影・keyword走査 | `prepare_candidate_ranking_title_reason_run1.mjs` |
| ranking限定投影・keyword走査 | `prepare_candidate_ranking_v002_run1.mjs` |
| ranking限定投影・keyword走査 | `prepare_third_material_candidate_ranking_v002.mjs` |
| ranking限定投影・keyword走査 | `prepare_first_gate_unseen_candidate_ranking_v002.mjs` |

この8実装に限った集計:

- standalone漏洩検査: 2系統。
- 入力生成器内の再帰denylist: 2系統。
- ranking用の限定投影とkeyword走査: 4系統。
- B1のsource-only投影を完全一致shape・全階層allowlist・来歴一致まで検査する入口: **0件**。
- 上記8実装にある関連検査関数のexport: **0件**。

`sourceOnly: true`や`passed: true`という記録だけを出す処理は、検査入口として数えていない。

### 9.2 blacklist/denylistの限界

`inspect_prompt_payload_leakage.ts`は、composition専用の約30個の禁止key、expected文言、expected境界値を調べる。次の今回の内部fieldは、その禁止key集合に入っていない。

- `startMs`、`endMs`
- `speaker`
- `speechId`
- `atomId`、`sourceAtomIds`
- `sourceRef`
- `startAnchor`、`endAnchor`
- Segmenterのindex・length

このため、元文字成果物や境界証拠の過剰露出を、禁止key走査だけで完全には止められない。また、同検査はexpected pathを要求するcomposition固有CLIである。

candidate-rankingの入力検査は、元成果物をspreadせず、ID・title・reasonだけを新しく投影し、元値と順番を照合する良い先例である。しかし、privateなranking専用処理で、最終prompt、B1のcontainer、幅、境界候補は検査しない。

### 9.3 共通Web Gemini parserの限界

既存の共通parserは、旧6用途のいずれかの配列があれば解析を始める。

- 不正な配列要素をfilterで落とし、他の要素が有効なら全体を受理し得る。
- themeの根拠範囲は、有効要素の存在確認だけ一時的に絞り込む一方、返却時には不正要素を含む元theme objectを保持し得る。
- 未知top-level fieldと有効項目内の未知fieldを保持する。
- 応答安定判定は旧用途の既知fieldだけを投影するため、比較対象外の未知情報が変化しても応答確定と扱い得る。
- caption用の未知field集合を完全一致検査しない。

したがって、B1では共通parserをそのまま使わず、**一つでも不正な項目があれば元index付きで全体を不成立にし、全階層の未知fieldを拒否する専用検査**が必要である。

## 10. 再利用できる実装慣行

直接使えるB1完成品はないが、次の慣行は既存実装にある。

1. 元成果物をspreadせず、許可fieldだけの新しいobjectを作る。
2. 全階層でfield集合を完全一致させ、未知fieldを拒否する。
3. 配列の全itemを検査し、不正itemをfilterで消して合格させない。
4. 投影したID・本文・順序を上流正本へ戻して一致確認する。
5. 形の検査と、値の来歴・参照関係の検査を分ける。
6. 同じcheckerを合成検査と正式runnerで呼ぶ。
7. 固定違反code、固定順、決定的report、CLI 0/1/2を持つ。

最も近い先例:

- rankingの限定投影: 許可fieldだけを新規構築し、元値と順序を照合。
- ゲートAの`exactFields`: root、各候補、anchorまで全itemを完全一致検査。
- 指示書契約v002の未知field拒否: nested pathごとに未知fieldを個別違反化。

これらは実装の型であり、B1 schemaそのものではない。

## 11. B1契約で埋める必要がある空所

方向案が承認された場合、B1契約には少なくとも次が必要になる。

1. モデル可視root、container、境界候補、表示制約、仕事説明の完全一致field集合と型。
2. 正式354文字、固定ゲートA、認定済み幅規則へ戻す、ID・本文・順序・幅・container全文の一致検査。
3. 時刻、話者、内部ID、anchor、path、hash、runtime、人間・expected系情報の混入拒否。
4. 元成果物をspreadしないfresh projection。
5. 全itemの先行shape検査と、元index付き違反path。filterによる不正itemの黙殺禁止。
6. JSONだけでなく、templateと結合した最終prompt全体の漏洩検査。
7. 同じcheckerを、生成直後、保存byteの再読込、実走直前に使う入口。
8. 入力・実装・runtime・検査結果を束縛するmanifest。
9. 固定違反codeと順序、検査report schema、CLI 0/1/2。

allowlistだけでも、許可された本文fieldへ別由来の文章を入れる漏洩は止められない。したがって、**完全一致shape、正式元データとの値一致、最終prompt走査の三つを分離して持つ**必要がある。

## 12. 再現方法

本棚卸しは次の読み取り専用処理で行った。

- JSONの全末端field pathを再帰走査し、配列indexを`[]`へ正規化して件数集計。
- 固定354文字とexport済み`buildPresentationSegmenterBoundaryEvidenceV001`による、メモリ内だけの境界証拠再生成。
- 認定済み`codePointWeightV001`による候補幅の読み取り専用計算。
- 既存漏洩検査、入力生成器、共通Web出力parser、完全一致shape検査の静的監査。
- 正式出力directory不存在の維持確認。

正式job、formal runner、Gemini、STT、媒体処理は実行していない。

## 13. 停止点

本副線で完了したのは、B1のモデル可視投影を作る前の**漏洩面の事実確認**だけである。

実施していないもの:

- B1のfield名・schema・違反codeの固定。
- source-only入力ファイルの生成。
- promptの作成・登録。
- 正式packageの公開。
- Gemini実走。
- 意味出力の検査・compiler・v003対生成・描画。

主線に追加する新しい判断はない。既存のゲートB方向設計が承認された場合、この棚卸しをB1完全実装契約の根拠として使う。
