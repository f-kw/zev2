# candidate 13 テロップ表示単位 接続準備監査 v001

- 作成日: 2026-07-22
- 区分: 人間待ち充填方式による副線・読み取り専用監査
- 主線: 残存source atom抽出工程の実装承認待ち
- 書き込み範囲: 本レポート1件だけ
- 人間作業: 0件、媒体視聴なし、時間計測なし

## 1. 結論

candidate 13の正式STTに、既存の真の語単位・文単位・テロップ表示単位はない。

現存する354件は全て1文字単位である。文字以外のまとまりは、人間確認用candidate manifestへ固定された3発話だけだが、各発話は106〜126文字・約27秒あり、そのまま1枚のテロップにはできない。

過去の診断資産には、`Intl.Segmenter('ja', { granularity: 'word' })`で文字列を語候補へ分け、元文字との完全対応を検査する処理がある。candidate 13へ読み取り専用で当てると、3発話から205語候補を欠落なく作れる。ただし、これだけを`word-timestamp`と宣言して現行検査へ渡してはいけない。現行G2検査は、粒度名が`word-timestamp`であるだけで「意味が読める短いまとまり」と「画面上の読みやすさ」も検査済みとして扱うためである。

推奨する次ゲートは、次の二段を分離した版付き設計である。

1. **文字→語境界の派生**: 元354文字を正本のまま保ち、各語候補と構成文字IDの完全対応を別成果物へ固定する。
2. **語→表示単位の編成**: 意味の読める短いcue、改行、切替を別工程で決める。固定文字数だけで意味分割を代用しない。

同時にG2の合否も、「語境界」「意味単位」「実プリセットでの描画可能性」へ分ける必要がある。語というラベルだけで3項目を一括合格にする現行の穴を、正式描画で利用しない。

本レポートは設計準備であり、語成果物、契約改訂、LLM実走、指示書、描画を承認・実装しない。

## 2. 本来の目的

目的はrendererを形式的に通すことではない。

人間が求めたテロップは、発話を意味の読める短さで、語の途中を切らず、実際の発話に合うタイミングで切り替え、承認済みの見た目で画面内へ安全に描くものである。

そのため、次の3つを混同しない。

| 問い | 必要な証拠 |
|---|---|
| どこが語の途中でないか | 元文字IDと語境界の完全対応 |
| どこで表示を切り替えると意味が読めるか | 意味判断を含むcue・line計画 |
| その文字列が画面で読めるか | 承認済みプリセットと実layout/QC |

ファイル名、固定文字数、粒度ラベルのどれか1つで3問を同時に解いたことにしない。

## 3. 正式入力の棚卸し

### 3.1 束縛済み入力

| 意味 | path | SHA-256 |
|---|---|---|
| candidate manifest | `evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/candidate-manifest.json` | `3937747e947ef0dd27a67e289d06cece8c17a55b655c85fa7d6aaf21f696ec12` |
| transcript | `evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/transcript.json` | `c0e006b381d60c2160a4ef59787bd32e47257baf9acc77b8706d74b5c8d3556d` |
| word-timestampsという名前の文字時刻列 | `evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/word-timestamps.json` | `ebf0190c9ce0fd96b4e1faa18717f41d73126fc914172474ac791df7f17ad065` |
| STT manifest | `evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/manifest.json` | `f7d2c04f8f9e67e27ff5b461236f01d3b68bb4f53ba448c0c4b5387c95a6d03b` |

### 3.2 candidate 13内の実体

| 観測 | 実測 |
|---|---:|
| 正式区間に残る時刻要素 | 354件 |
| Unicode 1文字だけを持つ要素 | 354 / 354件 |
| 真の語境界field | 0件 |
| token / phrase / sentence境界field | 0件 |
| candidate内の句読点 | 0件 |
| candidate manifestの発話まとまり | 3件 |

発話まとまりは次のとおり。

| speech ID | 元ID | 文字数 | 継続時間 |
|---:|---|---:|---:|
| 1 | `word-6932`〜`word-7057` | 126 | 27,798ms |
| 2 | `word-7058`〜`word-7179` | 122 | 27,688ms |
| 3 | `word-7180`〜`word-7285` | 106 | 27,112ms |

3発話は、表示単位を作る際の親コンテナには使える。だが、約27秒の発話全文を1枚へ載せる用途には粗すぎる。

### 3.3 空白・話者を境界にできない理由

- 353個の文字間境界のうち、正の空白は2件だけである。
- 2件は既知の3発話の間、1,924msと3,724msに一致する。
- 発話内部351境界は0msで、空白から細かい語・句境界を作れない。
- raw話者は`SPEAKER_00` 325文字、`unknown` 29文字。
- 1人の話中でも値が36回切り替わるため、話者値の変化を単語境界にできない。
- 文字の記録時間には20ms級から数秒級まであり、前後の無音を文字へ吸収した箇所がある。文字の長さを語境界へ読み替えない。

## 4. 現行契約が停止する場所

### 4.1 解決パッケージ生成器は文字粒度を受理する

`build_presentation_resolution_package_v002.mjs`は、`character-timestamp`と`word-timestamp`の両方を受け付ける。本文・時刻・IDを文字から語へ変換する処理はない。したがって、解決パッケージ生成器は停止点ではなく、入力側の粒度申告を信頼して包装するだけである。

証拠:

- `evals/clip_composition/build_presentation_resolution_package_v002.mjs:69-107`
- 同`:113-150`

### 4.2 G2だけが限界付きになる

現行caption契約は、文字粒度のときだけ次の3件を未検査として宣言する。

- `linguistic_word_boundary`
- `semantic_chunk_readability`
- `on_screen_readability`

その結果、G1とG3に違反がなくても全体は`passed_with_declared_limit`になる。

証拠:

- `evals/clip_composition/presentation_caption_contract_v002.mjs:558-582`
- 同じ実装内容を持つ`presentation_caption_contract.mjs:505-529`

### 4.3 renderer v002が描画前に止める

正式renderer v002は、指示書契約が`passed_with_declared_limit`なら`INSTRUCTION_CONTRACT_PARTIAL`を返し、描画計画へ進まない。

証拠:

- `evals/clip_composition/render_presentation_v002.mjs:1226-1240`
- 回帰固定: `evals/clip_composition/presentation_renderer_v002.test.mjs:1040-1102`

この停止は、未検査を正式合格へ偽装しないための正しい安全停止である。renderer側だけを緩めない。

## 5. 過去資産で再利用できる部分

### 5.1 再利用候補

履歴診断用の`build_presentation_minimum_sufficiency_review.mjs`には、次の純粋処理がある。

1. 文字列を`Intl.Segmenter('ja', { granularity: 'word' })`へ渡す。
2. 各語候補を元character atomの連続範囲へ戻す。
3. 構成文字の連結が語候補の本文と1字でも違えば停止する。

証拠:

- `evals/clip_composition/build_presentation_minimum_sufficiency_review.mjs:98-129`

再利用できるのは、この「語候補境界」「元文字への完全対応」「不一致時停止」の考え方だけである。履歴スクリプトを正式入口として使わず、新しい版付き成果物と検査へ移す。

### 5.2 再利用しない部分

同じ履歴スクリプトの次は正式設計へ持ち込まない。

- ASCIIを1、その他を2とする独自表示幅。
- 固定容量へ順番に詰めるだけのcue分割。
- 人間A/Bで敗北済みの`default-conservative-v001`。
- 既存出力を削除して作り直す診断用file運用。

また、次も表示単位の正本にしない。

- 句点を削る旧`runner/src/telop/telop-line-break.ts`。
- 人間確認UI用の句読点終端・孤立文字結合。
- 正式transcript側で1文字ずつになった`speechUnitGroups`。
- 文字数だけを意味上の切れ目として扱う規則。

## 6. Intl.Segmenterの読み取り専用診断

正式入力を変更せず、3発話ごとにNodeの日本語word segmenterを当て、各結果を元character IDへ戻した。

診断環境:

- Node `v20.19.6`
- ICU `77.1`
- locale `ja`
- granularity `word`

結果:

| speech ID | 文字数 | 語候補数 | 複数raw話者値を含む語候補 | `unknown`だけの語候補 | 最大構成文字数 |
|---:|---:|---:|---:|---:|---:|
| 1 | 126 | 60 | 5 | 2 | 4 |
| 2 | 122 | 78 | 3 | 8 | 3 |
| 3 | 106 | 67 | 4 | 1 | 4 |
| 合計 | 354 | 205 | 12 | 11 | 4 |

candidate 13では205件すべてが`isWordLike=true`で、構成文字の厳密連結は元本文と一致した。これは**派生可能性の診断**であり、正式な語成果物ではない。出力も固定していない。

### 6.1 話者fieldの問題

12語候補は、構成文字の中に`SPEAKER_00`と`unknown`の両方を含む。現在のraw source atomは話者を任意の単一値でしか持てない。

したがって、派生語へ次のいずれかを無断適用してはいけない。

- 多数決で話者を決める。
- `unknown`を既知話者へ寄せる。
- 語の途中を話者値で分割する。
- 元文字の話者証拠を捨てる。

語成果物では構成文字IDと各文字の元話者を辿れるようにする。最終raw word atomのscalar speakerをどう扱うかは、語成果物設計で明示的に決める。candidate 13が実質1人トークであることを、一般契約の暗黙推定に使わない。

### 6.2 実行環境の問題

`Intl.Segmenter`の結果はNodeが持つICUへ依存する。正式派生に採用する場合は、少なくとも次を生成記録へ固定する。

- Node実行fileのpathとSHA。
- Node version。
- ICU version。
- localeとgranularity。
- segmenter出力全件と構成文字IDのcanonical hash。

版文字列だけ同じ別binaryを同一処理と見なさないという、音声時刻格子修正で得た教訓をここにも適用する。

## 7. 現行G2契約の穴

現行caption契約は、`atomGranularity === 'character-timestamp'`のときだけ3項目を未検査にする。逆に、`word-timestamp`と宣言すると、次を実際には検査しないままG2が完全合格になる。

- 語atomが本当に言語学的な語境界から作られたか。
- cueが意味の読める短いまとまりか。
- 実プリセットで画面上読みやすいか。

証拠:

- `evals/clip_composition/presentation_caption_contract_v002.mjs:558-574`
- 文字入力が限界付きになる回帰検査: `evals/clip_composition/presentation_caption_contract.test.mjs:17-30`

`word-timestamp`側に意味上の読みやすさや実画面の可読性を検査する別分岐はなく、上記実装の粒度条件を外れるだけで3項目が未検査一覧へ載らなくなる。

したがって、205語候補を作って粒度名だけ変えれば、renderer v002を形式上通せる。しかし、それは人間が求めた「読みやすい短さ」と「適切な改行」を証明しない。正式経路では採用しない。

## 8. 選択肢

### A. 派生語を唯一のsource artifactにして現行v002を通す

機械的には最小の変更である。

- 文字atomから版付きの語atom成果物を作る。
- 各語へ構成文字ID、本文、先頭・末尾時刻、元文字成果物hashを保存する。
- 派生語成果物を最終解決パッケージの唯一のsource artifactにする。
- `word-timestamp`として現行G1〜G3とrenderer v002へ渡す。

ただし現行G2の穴により、意味単位と画面可読性まで合格したように見える。scalar speaker問題も未解決である。**そのままの採用は非推奨**。

### B. 文字正本＋語境界証拠＋表示計画を分離する

文字atomを唯一の損失なし正本として維持し、次を別成果物にする。

1. 語境界証拠: 1語候補を構成する文字ID列。
2. 表示計画: 語候補をどのcue・lineへ編成したか。
3. 描画可能性証拠: 使用プリセットとlayout/QC結果。

G2の状態を少なくとも次へ分ける。

- 語途中で切っていない。
- 意味の読める表示単位である。
- 実layoutで画面内に収まり、重なっていない。

この経路はcaption契約・instruction契約・renderer正式入口の版付き改訂が必要だが、何を検査したかを正確に表現できる。**推奨はこちら**。

### C. 文字粒度の限界付き状態をそのまま正式描画へ通す

rendererの`INSTRUCTION_CONTRACT_PARTIAL`を緩める案である。未検査を残したまま正式描画を許すため不採用とする。

## 9. 推奨する次ゲートの順序

主線の残存source atom抽出が正式に完了した後、次の順で設計を提示する。

1. **語境界成果物v001の設計**
   - 入力は正式な残存文字atom成果物1件。
   - 発話とtimeline segmentをまたがない。
   - 各文字はちょうど1語候補へ所属。
   - 本文は構成文字の厳密連結。
   - 先頭文字start・末尾文字endを使い、時刻を生成しない。
   - 構成文字ID、元成果物path/hash、segmenter実体を保存。
   - 混在話者の扱いを事前固定。

2. **G2状態分離の契約設計**
   - 語境界、意味単位、描画可能性を別checkにする。
   - 粒度名だけで意味・可読性を合格にしない。
   - 旧契約を読み替える後方互換分岐を作らない。

3. **表示計画・指示書・最終解決パッケージの対生成設計**
   - G1の本文厳密一致を維持。
   - 意味判断と数値配置を分ける。
   - timelineの2区間をまたぐcueを作らない。
   - 表示対象・cue・演出指示を同じ固定入力から対生成する。
   - 生成後の契約検査で停止し、描画は別承認にする。

語境界だけを先に正式化しても、意味の読めるcueはまだ完成しない。この順序を「テロップ完成」と誤報しない。

## 10. 既存資産への影響

本監査では次を変更していない。

- candidate 13の正式組立決定。
- candidate 13の基礎映像、timeline、manifest、QC。
- STT、candidate manifest、source identity。
- G1〜G3、instruction、rendererの契約と実装。
- プリセット台帳と信頼binding。
- candidate 11・12・36。
- `DECISIONS.md`、`docs/HANDOVER.md`。

主線の実装承認が届くまで、本レポートを根拠に契約・コード・正式成果物を先行変更しない。

## 11. 人間作業

- 本監査: **0件。媒体視聴なし。時間計測なし。**
- この副線から独立した確認依頼: **0件。**
- 主線で既に依頼中の判断: 残存source atom抽出工程の実装承認1件。
- 語境界・G2改訂の承認: 主線の抽出完了後にまとめて提示し、今は依頼しない。
