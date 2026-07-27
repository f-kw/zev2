# Liar's Bar candidate 59 B5外部送信前停止報告 v001

- 日付: 2026-07-28
- 対象: `qdczJpv8RCc` candidate 59
- 到達点: B3正式字幕入力完成後、B5 `countTokens` 通信の直前
- 人間作業: 1判断

## 1. 事実

- B3の正式意味入力は281文字、2まとまり、行末候補164件である。
- B5 v004のローカルrequest構築は成功した。
  - 生成用request: 30,517 byte / SHA-256 `20a74de1f36802e4b6d414b718e0034731305b7111f621b5a4599bccd460284c`
  - 入力計測request: 30,813 byte / SHA-256 `8f00ae239786f5959ff6d7dc12ff6f875e52b51edddb178768daaf5aa57c1c00`
  - 最大有効回答構造の計測request: 11,128 byte / SHA-256 `54ddd323c74b14d4637966e64be85af136313ec6e8b3a68cf4e3a1bec8220ed3`
- 2026-07-28時点のGoogle公式値を再確認した。
  - model: `gemini-3.6-flash`
  - 入力上限: 1,048,576 token
  - 出力上限: 65,536 token
  - Paid Standard: 入力US$1.50 / 出力US$7.50 per 1M token
  - 参照:
    - <https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash>
    - <https://ai.google.dev/gemini-api/docs/pricing>
- 承認済み設計に書かれたB5 jobの保存先は、監視対象である
  `evals/clip_composition/outputs/presentation/` の内側だった。
  そのまま置くと、job自身が期待する監視SHAの計算へjob自身が入り、
  期待SHAを書き込むたびに監視SHAが変わる自己参照になる。
- production codeを変更せず、正式B5 jobを実行入力用の次のpathへ置いた。
  `evals/clip_composition/jobs/presentation/caption-gate-b5-initial/qdczJpv8RCc-candidate-59-v001.json`
- job SHA-256は
  `d282e3885e8c26098539096e2e3816e088f6779afd7b62f14159ee617950a152`
  である。
- job作成前後で、上流監視SHA
  `fdc4f650f17c9cef094f078708c52235a18c243cca4005694286eb07a90deef8`
  が一致した。
- jobは開始時SHA取得・終了前の再読・manifestへのpath/SHA記録で改変検知される。
  監視root外へ置いてもjob自身の保護は残る。
- Gemini Developer APIへの通信は0回、追加費用はUS$0のままである。
- B5正式出力directoryはまだ作られていない。
- API keyは読んでおらず、成果物・log・stdout・本報告への生key出現は0件である。

## 2. 外部へ送る内容

承認後にGoogle Gemini Developer APIの`countTokens`へ、各1回、合計2回送る。

1. B3意味入力全文を含む字幕分割用request
   - 元発話281文字
   - 2まとまり
   - 行末候補164件
   - 行幅上限36
   - system instructionと回答schema
2. 最大有効回答構造
   - 行末候補164件を1件ずつ使うJSON構造
   - 動画・音声は含まない

自動再試行は0回であり、Geminiによる文章生成は行わない。

## 3. 費用

- `countTokens`応答から実課金の有無は観測できない。
- 公式価格表には`countTokens`固有の価格は掲載されていない。
- 独自token係数は使わない。
- 仮に2requestがそれぞれ公式入力上限まで課金された場合の理論上限は、
  `2 × 1,048,576 × US$1.50 / 1,000,000 = US$3.145728`。
- 実測tokenとPaid Standard入力単価による費用見積りは、通信後の完了報告で確定する。

## 4. 推測

- なし。実測token数と課金扱いは通信前には確定しない。

## 5. 未確認

- 二つのrequestの実測token数
- `countTokens`の実際の課金有無
- B5の10要件群合格

## 6. 停止理由と承認依頼

ローカル準備は完了したが、candidate 59の発話本文をGoogleへ送る明示承認が
確認できない扱いとなったため、通信前に停止した。

次の1判断だけを依頼する。

> candidate 59のB3意味入力を上記の内容でGoogle Gemini Developer APIへ送り、
> `countTokens`を各1回・計2回実行してよいか。

承認後は、通信2回、10要件群、manifest、完了または停止報告まで進み、
Gemini生成とB6へは自動進行しない。
