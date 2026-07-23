# candidate 13 基本テロップ 単一payload規模 事実棚卸し v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`の方向判断待ち
- 対象: 方向設計§8の「3 containerを一つのpayloadで渡し、窓分割・統合をしない」という案
- 状態: **規模だけを理由に方向を変える必要があるかを保存済み事実で確認した。schema、prompt、コード、正式入力、Gemini実走は作っていない**
- 書き込み範囲: 本レポート1件だけ。方向設計、共有文書、コード、正式成果物は変更していない
- 人間作業: 0件。主線の方向判断以外に新しい確認を追加しない

## 1. 結論

**3 containerを一つのpayloadへまとめ、窓分割しない方向を、規模だけを理由に変更する根拠は現存しない。**

candidate 13でモデルへ見せる予定の既知データ値を一度ずつ並べた合計は、7,527 UTF-8 bytes、6,119 Unicode code pointsだった。これはfield名、JSON記号、仕事の説明、prompt指示を含まないため、最終payloadの総量ではない。

これに対し、保存済みのWeb Gemini実走には、次の先例がある。

- candidate 13の案と同じく、閉じたID集合から境界IDを選ぶ構造で、173,968-byteの単一prompt、3,044境界点を使い、返却IDの実在・順序等の契約検査まで合格した例。
- candidate 13と同じ元配信で、20,702-byteの単一prompt fileに対応するrun 1応答が保存され、52候補から5件の順位が記録された例。
- 入力経路の規模だけを見れば、341,766-byteの窓分割なしprompt fileに対応する要求8件の完結応答が保存された例。

ただし、どの先例もcaption用の最終schema、205候補の意味分割品質、run 1の安定性、実画面モデル、途中切れ耐性を証明しない。したがって結論は、**規模上の反証はないが、caption実走の成立は未証明**である。

方向承認後は、B1で構造化入力のbyte・hash記録要件を契約化し、B2の読み取り専用preflightで実測する。B3で正式入力packageの実byteとhashを束縛し、B5で送信するprompt全体の実byteとhashを固定する。B6のrun 1で初めて実経路の成否を確認する。結果を見る前に窓分割、分割閾値、token換算係数、自動再実行を追加しない。

## 2. 本来の目的との照合

本来の目的は、candidate 13の基本テロップを作る配管を、元発話から追跡できる形で一本通すことである。初回は基本テロップだけで、G4〜G7、外部素材、SEを含めない。

この目的に対して、入力を先回りして複数窓へ分けると、次の新しい問題が増える。

- containerや表示単位を窓の間で統合する契約。
- 全354文字・205候補の欠落、重複、順序を窓横断で再検査する工程。
- 複数回答の一回性、途中失敗、再開、部分採用の扱い。
- 「どの窓分割がよいか」という未実測の新変数。

現時点では単一入力を規模上不可能とする事実がないため、これらを先に増やすことは本来の目的を遠ざける。単一payload案を維持し、実byteを固定してから一回だけ試す順序が妥当である。

## 3. candidate 13の既知データ値

固定Node v20.19.6 / ICU 77.1で、正式354文字からゲートAと同じ純粋処理を使って205境界候補をメモリ再生成し、方向設計§6でモデル可視とする概念値を一度ずつ数えた。正式runner、正式job、公開、ファイル生成は行っていない。

追試に使う入力と処理実体:

| 処理上の意味 | path / 固定値 |
|---|---|
| 正式354文字 | `evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/source-atoms.json` |
| 正式354文字の実byte SHA-256 | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |
| 生の354文字配列のcanonical SHA-256 | `cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3` |
| 境界候補の純粋生成処理 | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs`の`buildPresentationSegmenterBoundaryEvidenceV001` |
| 境界候補coreモジュールの実byte SHA-256 | `dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a` |
| 実装commit | `051613f25d3259417e5a3522f98bc8946db22deb` |
| 実行環境 | Node v20.19.6 / ICU 77.1 / locale `ja` / granularity `word` |

純粋生成結果から、container ID、各containerの全文、境界候補ID、各候補本文を元順に一度ずつ取り出した。候補本文へ認定済み論理幅規則（U+0000〜U+00FFは1、それ以外は2）を一度適用し、十進表記のbyteを数えた。最後に固定表示制約`36`と`2`を加算した。field名、JSON記号、task説明は加算していない。

| モデルへ見せる予定の概念値 | 件数 | UTF-8 bytes | Unicode code points |
|---|---:|---:|---:|
| container ID | 3 | 78 | 78 |
| container全文 | 3 | 1,058 | 354 |
| 境界候補ID | 205 | 5,125 | 5,125 |
| 境界候補本文 | 205 | 1,058 | 354 |
| 候補ごとの論理表示幅の十進表記 | 205 | 205 | 205 |
| 固定表示制約の値`36`と`2` | 2 | 3 | 3 |
| **既知データ値subtotal** | **623** | **7,527** | **6,119** |

補足:

- 3 containerの本文合計と205候補の本文合計は、どちらも同じ354文字を一度ずつ覆うため、それぞれ1,058 bytesである。モデルには全文脈と境界候補の両方を見せる方向なので、本文は意図的に二つの形で現れる。
- 論理表示幅は205件すべて1桁で、分布は幅1が2件、幅2が101件、幅4が67件、幅6が23件、幅8が12件だった。
- 上表の623件は、task説明を除いた値の出現数である。概念上のモデル可視末端値は、task説明1件を加えて624件になる。

### 3.1 この7,527 bytesに含まれないもの

- 最終schemaのfield名と階層。
- 引用符、角括弧、波括弧、comma、colon。
- JSON escapingと整形用空白・改行。
- 仕事の説明。
- 出力契約と禁止事項。
- promptの前置きと実行指示。

最終schemaもpromptも未承認・未生成なので、7,527 bytesを「最終payload」「最小payload」「入力上限」とは呼ばない。これは、既に実在する候補値を最終表現へ加工せず数えた**既知データ値subtotal**である。

token数も算出しない。使用するtokenizer、最終schema、prompt本文が未固定であり、独自係数によるbyte/token換算は根拠にならない。

## 4. 構造が近い保存済み先例

### 4.1 boundary-v001: 173,968 bytes / 3,044境界点

保存先:

- prompt: `evals/clip_composition/outputs/theme-composition-boundary/20260713-boundary-v001-main-v001/nOEWCNc77MI_multiblock_material_v001/candidate-003/run-03/prompt.md`
- 入力記録: 同directoryの`prompt-input.json`
- 出力: 同directoryの`gemini-output.json`

実測:

| 項目 | 保存値・実測 |
|---|---|
| prompt | 173,968 UTF-8 bytes / 166,694 Unicode code points |
| prompt SHA-256 | `43cb579f1804bf0cf4158b8db738549f7e1ed38ac3cde837ace5270ec3b075b2` |
| 選択可能な境界点 | 3,044件 |
| 単語 | 1,522件 |
| 仮区間 | 1件 |
| 生成系統 | `boundary-v001@gemini-web-flash` |
| 入力hash照合 | 出力記録の`inputPromptSha256`と実prompt SHA-256が一致 |
| 契約検査 | 合格、issue 0件 |

検査済み内容は、選択IDの実在、正しい前後90秒窓への所属、開始が終了より前、仮区間と同じcut数、cut indexの欠落・重複なし、根拠文の存在である。実際に境界IDを二点返し、選択ID周辺の文字証拠も保存されている。

これは、閉じたID集合から境界を選び、ID実在・順序を検査するという点で、B1案に最も近い先例である。

ただし、3,044件は1,522語のstart/endを別々に数えた境界点であり、candidate 13の205件は複数文字をまとめた境界候補である。単位も仕事も異なる。3,044点から二点を選ぶ境界精緻化と、205候補を欠落なく行・表示単位へ編成するcaption分割は意味上同じではないため、件数を直接比較せず、caption用の完全出力を保証する先例にも使わない。

### 4.2 同じ元配信のcandidate-ranking: 20,702 bytes / 52候補

保存先:

`evals/clip_composition/outputs/candidate-ranking/20260716-first-gate-unseen-run1-v002/DmWu0jVQfTE/`

実測:

| 項目 | 保存値・実測 |
|---|---|
| prompt | 20,702 bytes / 9,748 code points |
| prompt SHA-256 | `3461d028034c99e26cc24e4686da798095ba7f2b0ba706c4df332f4348eb4257` |
| 構造化入力 | 18,956 bytes / 9,002 code points |
| 入力候補 | 52件 |
| run | 1 |
| 出力 | 4,208 bytes、順位1〜5の5件、候補ID重複なし |
| 生成系統 | `candidate-ranking-v002@gemini-web-flash` |

同じ元配信の単一prompt fileに対応するrun 1出力の保存事実として有用だが、候補順位付けは全入力を一度ずつ被覆する仕事ではない。保存記録のモデル名は実行時申告であり、現在B6が求める画面上のモデル確認、送信直前hash、タブ所有・終了後消滅までを証明しない。

## 5. 入力経路の規模だけを見る副次先例

保存先:

- prompt: `evals/clip_composition/reports/theme-generation/UpRyakf5j80_clip_audio_v001/theme-llm-v001/20260709-v001/prompt.md`
- 入力記録: `evals/clip_composition/outputs/theme-generation/UpRyakf5j80_clip_audio_v001/theme-llm-v001/20260709-v001/prompt-input.json`
- 完結出力例: 同directoryの`run-02-gemini-output.json`

実測:

| 項目 | 保存値・実測 |
|---|---|
| prompt | 341,766 bytes / 249,252 code points |
| prompt SHA-256 | `769e2e415c26be0bd525accd0c60432089e392bd61e1c23ae1bf6286c0912486` |
| 窓分割 | なし |
| prompt segments | 1,104件 |
| run 2出力 | 19,137 bytes、要求8件に対して8件 |

保存記録上、この341,766-byteの単一prompt fileに対応する完結応答がある。実行記録はprompt fileの実行時hashを束縛していないため、実際に送った全文が現在保存されているprompt byteと同一だったことまでは証明しない。したがって、これは規模上の参考記録であり、runtime byte同一性の先例ではない。

一方で、同じpromptのrun 1は未完JSONから3件を救出し、run 3は既存tabから1件を回収した記録である。run 2の一項目には全角colonを含むfield名誤記もある。したがって、341,766 bytesでの厳密形式や一回成功の安定性は主張しない。入力経路の規模だけを見る副次資料に限定する。

## 6. 現行Web実行処理で確認できたこと

`evals/clip_composition/run_web_gemini_prompt.ts`の現行処理は、次の順で動く。

1. prompt file全体をUTF-8文字列として読む。
2. 対象の入力欄を一つ取得する。
3. prompt全文を一回の`Input.insertText`へ渡す。
4. 送信ボタンを押す。

runner内にpromptを複数窓へ分割する処理はない。CDP WebSocketのtext frame生成も、65,536 bytes以上を64-bit長のframeとして扱う分岐を持つ。

これは「現在の実装に明示的な65,536-byte打ち切りや自動窓分割がない」という事実である。Gemini画面、モデル、ブラウザ、通信経路が任意サイズを受理する保証ではない。

## 7. まだ証明されていないこと

現時点では次を未証明として残す。

- caption用最終schemaを含む構造化入力の実byte。
- task説明と出力契約を含む最終promptの実byte。
- B5で固定するexecution payloadの実byteと送信直前hash。
- 実画面で使われるモデル名とEdge実体。
- 205候補すべてを欠落なく行・表示単位へ編成する意味品質。
- caption専用parserが部分救出せず、全体を厳密に受理・拒否できること。
- 出力途中切れへの耐性。
- run 1の一回性と安定性。
- 使用モデルのcontext上限への適合。

保存済み先例を根拠に、これらを「使える」「安全」「余裕がある」とは報告しない。

## 8. 方向設計への影響

| 方向設計の事項 | 本調査の判定 |
|---|---|
| 3 containerを一つのpayloadで渡す | 規模上の反証なし |
| 窓分割・統合なし | 維持。新しい統合契約を足す根拠なし |
| run 1 | 維持。先例は安定性の証明ではないため、失敗時は停止 |
| source-only入力 | 変更なし。本調査は内容の許可範囲を広げない |
| B1でschemaを固定 | 必須。構造化入力のbyte・hashを記録する要件を契約化する |
| B2で読み取り専用preflight | candidate 13の構造化入力を正式公開せず実測し、byte・hashと検査結果を報告する |
| B3で正式packageを固定 | 正式入力packageの実byteとhashを束縛する |
| B5でpromptを固定 | 必須。送信全文の実byteとhashを実走前に記録する |
| B6で実走 | ここで初めてcaption実経路の成否を確認する |

実入力が不成立、モデル名未確認、通信失敗、形式不成立、途中切れになった場合は、既存方向設計どおり停止する。結果を見て同じ版の入力を分割したり、promptを短くしたり、自動再実行したりしない。必要なら失敗記録を材料に、新しい設計・版・承認へ戻る。

## 9. 最終判定

- 規模だけを理由に、単一payload案を棄却する根拠: **なし**。
- 単一payloadでcaption実走が成立する証明: **まだない**。
- 方向設計へ追加する新しい人間判断: **なし**。
- 次に行うこと: 主線の方向承認後、B1完全実装契約で最終schema、byte・hash記録要件、違反時停止を一意に固定する。実値はB2でpreflight実測し、B3で正式packageへ束縛する。
- 現在行わないこと: schema起草、prompt起草、コード、正式package、Gemini実走、窓分割設計、token推定、v003、描画。

本調査は方向設計を置き換えず、単一payload案について規模上の不安だけを保存済み事実で切り分けた副線記録である。
