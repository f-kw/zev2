# candidate 13 基本テロップ JSON直列化edgeの事実棚卸し v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`の方向判断待ち
- 状態: **実データの文字内容と往復保存の確認のみ。正式入力・prompt・実装・実走なし**
- 人間作業: 0件

## 1. 目的と結論

未承認のゲートB方向案では、正式な元発話本文をsource-only入力へ写し、Web版Geminiへ渡す。その際に、本文中の引用符、バックスラッシュ、改行、制御文字等を手作業の文字列連結で壊すと、元文字不変の契約がモデル実走前に失われる。

本棚卸しでは、candidate 13の正式354文字、そこから固定処理で作る205境界候補、3 container全文を読み取り専用で全数走査し、JSONの標準的な文字列直列化と再読込で同じ本文・順序に戻るかを確認した。

結論:

1. candidate 13の実データには、引用符、バックスラッシュ、JSONの括弧、backtick、改行、tab、NUL、制御文字、Unicode行区切り等が**一件も無かった**。
2. 正式354文字、205候補本文、3 container全文を、個別および配列全体で`JSON.stringify`してから`JSON.parse`した結果、本文不一致は**0件**だった。
3. 正式な元文字JSONファイルは、既存の公開検査ですでに整形付き再直列化と保存byteの一致を確認済みである。今回も現在のfield順のまま再確認し、元の83,895 byteと完全一致した。
4. したがってcandidate 13では、標準JSON直列化による本文損失は観測されなかった。
5. 反対に、今回の本文はエスケープを要するedgeを一つも含まない。**candidate 13が通ることだけでは、B1直列化処理が一般入力でも安全だとは証明できない。**

本棚卸しは正式なモデル可視schema、promptの囲み方、許可文字、拒否文字、Unicode方針を決めない。

## 2. 既存棚卸しとの境界

既存の論理幅資産棚卸しでは、candidate 13に次のUnicode edgeが無いことを既に記録している。

- supplementary character
- 孤立surrogate
- 結合文字
- variation selector
- zero-width format
- control、改行、Unicode whitespace
- emoji
- Halfwidth and Fullwidth Forms

既存のsource-only棚卸しでは、正式354文字、205候補、3 containerの全文連結と文字量も確認済みである。今回、これらの既存確認を「新しく発見した観測」として二重計上しない。本棚卸しが追加した確認は次である。

- JSON文字列でescape対象になる引用符とバックスラッシュ。
- JSON構造と見分けにくい波括弧・角括弧・カンマ・コロン。
- Markdown等の囲みへ影響し得るbacktickと三連backtick。
- 正式未保存の205候補本文と3 container本文のJSON往復。
- 今回edgeが無かったことによる、B1合成検査の実データ上の検査空白。

正式354文字の個別・配列JSON往復と配列順、正式元文字JSONファイル全体の再直列化byte一致は既存公開検査に包含される。今回は読み取り元が変わっていないことの再確認として扱う。

## 3. 固定した読み取り元

| 処理上の意味 | 固定値 |
|---|---|
| 正式な元文字 | `evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/source-atoms.json` |
| 元文字ファイルの実byte SHA-256 | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |
| 元文字ファイルの実byte | 83,895 |
| 境界候補を作る固定実装 | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` |
| 固定実装の実byte SHA-256 | `dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a` |
| 境界候補列のcanonical SHA-256 | `0f8e7b07c32befc4e4703e1945b61e7656a2e978a8ba959fd169a753efe454b6` |
| 文字所属対応のcanonical SHA-256 | `b2da8ee1b3fef9c23b5598d73713d77831f392471cf98a9723392ef115ea50fd` |

二つの境界証拠hashはゲートA完了記録と一致した。正式runnerは再実行していない。

## 4. 本文量

この節の文字量と全文連結一致は既存棚卸しで確認済みであり、今回のJSON往復診断に使った読み取り対象が同じであることの再確認として載せる。

| 粒度 | 文字列数 | UTF-8 byte合計 | Unicode code point合計 | UTF-16 code unit合計 |
|---|---:|---:|---:|---:|
| 正式元文字 | 354 | 1,058 | 354 | 354 |
| 境界候補本文 | 205 | 1,058 | 354 | 354 |
| container全文 | 3 | 1,058 | 354 | 354 |

3粒度の全文連結は完全一致した。

container別:

| container | UTF-8 byte | code point | UTF-16 code unit |
|---|---:|---:|---:|
| 1 | 378 | 126 | 126 |
| 2 | 364 | 122 | 122 |
| 3 | 316 | 106 | 106 |

UTF-16 code unit数とcode point数が同じなのは、今回の本文にsupplementary characterが無いためである。一般入力で常に同じとは限らない。

## 5. 空文字・空白・制御文字

次の結果は、正式元文字354件、境界候補205件、container全文3件の全粒度で共通だった。

| 確認項目 | 該当文字列 |
|---|---:|
| 空文字列 | 0 |
| 空白だけの文字列 | 0 |
| 先頭にUnicode空白 | 0 |
| 末尾にUnicode空白 | 0 |
| Unicode空白code pointを含む | 0 |
| NUL | 0 |
| tab | 0 |
| LF | 0 |
| CR | 0 |
| C0 controlまたはDEL | 0 |
| C1 control | 0 |
| U+2028 LINE SEPARATOR | 0 |
| U+2029 PARAGRAPH SEPARATOR | 0 |

正式元文字JSONファイル先頭にUTF-8 BOMは無かった。本文中のU+FEFF BOM、U+FFFD置換文字、Unicode非文字、孤立surrogateも0件だった。

## 6. JSON・prompt囲みで注意が必要な文字

次の結果も3粒度で共通だった。

| 文字または並び | 該当文字列 |
|---|---:|
| `"` | 0 |
| `\` | 0 |
| `{`または`}` | 0 |
| `[`または`]` | 0 |
| `,` | 0 |
| `:` | 0 |
| backtick | 0 |
| 三連backtick | 0 |

これは「これらの文字をB1で拒否してよい」という意味ではない。今回の実データに無かったため、candidate 13実走だけではescape処理やprompt囲みとの衝突を検査できない、という意味である。

prompt本文、JSON code fence、区切り文、送信形式はまだ未承認であり、本棚卸しでは作っていない。

## 7. JSON往復の結果

標準JSON直列化と再読込について、次を確認した。

| 対象 | 確認件数 | 本文不一致 | 順序不一致 |
|---|---:|---:|---:|
| 元文字を個別往復 | 354 | 0 | 対象外 |
| 候補本文を個別往復 | 205 | 0 | 対象外 |
| container全文を個別往復 | 3 | 0 | 対象外 |
| 元文字配列を一括往復 | 354 | 0 | 0 |
| 候補ID・container・本文配列を一括往復 | 205 | 0 | 0 |
| container全文配列を一括往復 | 3 | 0 | 0 |

元文字の個別・配列往復と順序保持は既存公開検査に包含される再確認である。今回の追加診断は、正式未保存の205候補本文と3 container本文でも同じ結果になることを確かめた部分である。

正式元文字成果物全体についても、既存公開検査と同じく、parse後のobjectへ現在と同じ`JSON.stringify(value, null, 2) + LF`を適用した結果は83,895 byteで、元ファイルとbyte単位で一致した。これは既確認事項の再確認である。また、現在のobject field順が再読込後も保たれた結果であり、別のfield構築順でも同じbyteになるという意味ではない。

本文の正規化、trim、改行変換は行っていない。無正規化のまま往復した結果である。

## 8. 次のB1契約へ渡せる事実

主線の方向案が承認された場合、B1実装契約では次を事実として利用できる。

1. candidate 13の正式未保存な205候補本文と3 container本文も、標準JSON往復で本文・順序を保持できる。
2. 今回はescape対象文字が0件なので、candidate 13 preflightだけではJSON文字列escapeの実装漏れを検出できない。
3. source-only入力は、本文を手作業でquoteやcode fenceへ連結するのでなく、版付きの構造化objectを標準直列化する必要があるかをB1契約で明示する必要がある。
4. 合成検査には、実データに無い引用符、バックスラッシュ、改行、tab、JSON括弧、supplementary character、結合文字を持つsource本文を含めるかを、実装前に固定する必要がある。
5. 孤立surrogateはJavaScriptのJSON文字列としてescape保存できる場合があるため、「JSON往復できた」をUnicode scalar妥当性の代用にできない。許可・拒否と違反帰属はB1契約の未決事項である。
6. 配列順は本文の正本性に関わる。object key順と混同せず、候補・containerの元順を別途検査する必要がある。
7. 正規化、trim、改行統一を直列化処理へ暗黙に混ぜると、今回確認した無損失往復とは別の処理になる。

ここでは、正式serializer、schema、field順、許可文字、拒否文字、違反コード、prompt囲みを固定しない。

## 9. 証明していないこと

- 将来の別素材でも同じ文字内容になること。
- JSON以外のprompt templateへ埋め込んだときの完全性。
- Web画面へのpaste、送信、回答保存を通したend-to-endの本文不変。
- Geminiが本文を指示として誤解しないこと。
- caption意味出力の形式、意味品質、途中切れ耐性。
- 正式package、execution payload、raw出力、検査報告のbyte決定性。
- Unicode edgeを許可または拒否したときの一般動作。

## 10. 再現方法と停止点

読み取り専用で次を行った。

- 正式元文字JSONを一度読み、実byte hashとBOMを確認。
- 固定ゲートA純粋処理で、205境界候補をメモリ内だけで再生成。
- atom、候補、containerの三粒度で全文字を走査。
- 各文字列と配列全体を標準JSONで直列化し、再読込後の本文・順序を比較。
- 正式元文字成果物を現在と同じ整形規則で再直列化し、元byteと比較。
- 二つの独立した読み取り専用監査で、文字量、異常文字0件、往復不一致0件を照合。

実施していないもの:

- 正式ゲートA runner、正式package生成器、Web runnerの実行。
- モデル可視入力、prompt、execution payloadの生成。
- schema、field順、許可・拒否文字、違反コード、CLIの固定。
- Gemini・他LLMの実走。
- 正式成果物、v003成果物、描画の生成。

主線へ新しい人間判断は追加しない。既存のゲートB方向設計が承認された場合、本棚卸しをB1実装契約の合成検査要件へ利用する。
