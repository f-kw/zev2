# theme_generation_prompt_v002

あなたは元配信から切り抜きテーマ候補を作る。

## 目的

元配信の文字起こしだけを見て、切り抜きとして成立しそうなテーマ候補を出す。最終的な切り抜き区間を確定する担当ではない。区間選択は後段のcompositionが行う。

## 入力の読み方

- 入力は元配信単体から得られる情報だけである。
- 切り抜き動画、expected、照合結果、人間確認メモ、既存切り抜きタイトルは入力に含まれない。
- `sourceTitle` は配信全体の文脈を読む補助情報として使う。
- `segments` は元配信内の発話で、`speechId`、時刻、本文を持つ。
- 入力が長尺配信の一部窓である場合は、その窓の範囲内で判断し、配信全体を見たように書かない。
- 笑い、沈黙、音量変化などの非発話シグナルが入力にある場合は補助情報として扱う。本文より強い根拠として扱わない。

## 禁止

- 切り抜き動画や正解区間を知っている前提で書かない。
- 元配信本文にない場面や反応を作らない。
- 秒数だけを根拠に候補を作らない。
- 「雑談」「面白い場面」のように広すぎて何を切るか決まらないテーマを出さない。
- 既存切り抜きのタイトル風に盛った表現を、本文根拠なしで作らない。

## 判断方針

- 候補は、元配信内の発話から見どころが説明できる具体的なテーマにする。
- 単独で視聴者に伝わるフリ、展開、反応、結論がある場面を優先する。
- 同じ話題が離れた場所で補足される場合は、同じテーマ候補の根拠として複数の発話範囲を持ってよい。
- 根拠範囲は、候補テーマを説明するために必要な発話だけにする。配信全体や長い雑談を大きく囲わない。
- 別話題をまたぐ場合は、1つの広い範囲にまとめず、該当する狭い範囲だけを返す。

## v002の出力方針

v002では、判断方針はv001から変えない。変えるのは出力形式だけである。

- 候補ごとの長文説明は返さない。
- 根拠は `evidenceRanges` の配列で返す。
- 同じ話題が複数シーンに分かれる場合は、1つの広い開始・終了で囲わず、狭い根拠範囲を複数入れる。
- `reason` は採用理由を1文だけで書く。
- 弱い候補を無理に埋めない。

## 出力

JSONだけを返す。説明文やMarkdownを付けない。

`requestedThemeCount` が指定されている場合は、その件数を上限にする。良い候補が足りない場合は、無理に埋めない。

```json
{
  "themes": [
    {
      "themeId": "theme_001",
      "title": "短いテーマ名",
      "reason": "切り抜きとして成立すると判断した理由を1文で書く。",
      "evidenceRanges": [
        {
          "sourceVideoId": "元動画ID",
          "sourceStartMs": 123000,
          "sourceEndMs": 153000,
          "supportingSpeechIds": ["12-47", 52, "55-60"]
        }
      ]
    }
  ]
}
```

## supportingSpeechIds

- 連続する発話IDは `"12-47"` のような範囲文字列で返す。
- 不連続な発話IDは、個別の数値として同じ配列に入れる。
- 連続範囲と個別IDを混ぜてよい。
- 根拠に使っていない発話IDを含めない。

## 時刻

- `sourceStartMs` は、その根拠範囲の最初の発話時刻にする。
- `sourceEndMs` は、その根拠範囲の最後の発話時刻にする。
- 同じテーマの根拠が複数箇所にある場合は、`evidenceRanges` を複数に分ける。間にある無関係な別話題を含めない。
- 正解境界を当てる評価ではないが、後段の機械判定でexpected区間との重なりを見るため、候補根拠の範囲を本文に基づいて正しく出す。

## 入力JSON

```json
{
  "task": "source_only_theme_generation",
  "generationSystem": "theme-llm-v002",
  "promptVersion": "theme_generation_prompt_v002",
  "requestedThemeCount": 8,
  "inputPolicy": {
    "sourceOnly": true,
    "noClipInfo": true,
    "noExpected": true,
    "noAlignment": true,
    "noHumanReverseTheme": true
  },
  "windowing": {
    "applied": true,
    "mode": "speech-time",
    "windowId": "window_07_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 3554885,
    "sourceEndMs": 4094980
  },
  "sources": [
    {
      "sourceVideoId": "o8rZAhARXAc",
      "sourceUrl": "https://www.youtube.com/watch?v=o8rZAhARXAc",
      "sourceTitle": "【 #ホロライブ甲子園2025】2年目夏！！夏合宿と甲子園初戦で狙え育成上振れ！！【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 11898.441,
      "rawSegmentCount": 34507,
      "promptSegmentCount": 19,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 343,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3554885,
          "sourceEndMs": 3561748,
          "text": "意見大募集重さいらんえ、じゃあ重さなくして何あげんの?"
        },
        {
          "speechId": 344,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3561748,
          "sourceEndMs": 3566910,
          "text": "重さいるって言ってる人もいるんだけどマジわからんのだけど何を取ればいいんだこれ"
        },
        {
          "speechId": 345,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3570914,
          "sourceEndMs": 3599054,
          "text": "重さ削って重さ削って変化上げてほしい重さ削って変化上げピッタリになんないんだよな98になっちゃう98になっちゃうんだよな急速上げれば100になる"
        },
        {
          "speechId": 350,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3663138,
          "sourceEndMs": 3685038,
          "text": "こうなるんだって間違えた、これストレートこうなるらしいカーブでも重さはいるってもう分からんなマジ分からんなもうこれ"
        },
        {
          "speechId": 351,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3690566,
          "sourceEndMs": 3719880,
          "text": "諸説ありすぎて喧嘩になってるから助けてマジでマジわからんこよりー助けてよーわかんないよーこよりこよりー助けてーこよりー迷う迷うなこれー教科書持ちのこよりー教科書"
        },
        {
          "speechId": 352,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3720278,
          "sourceEndMs": 3723159,
          "text": "こっちのコヨリー!"
        },
        {
          "speechId": 353,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3723159,
          "sourceEndMs": 3723879,
          "text": "助けてくれー!"
        },
        {
          "speechId": 354,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3723879,
          "sourceEndMs": 3737903,
          "text": "んーさっき配信終わった?"
        },
        {
          "speechId": 355,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3737903,
          "sourceEndMs": 3742444,
          "text": "ヤワンちゃん来てくれるかもしれんうんあもう当初強いから適当でいいよコヨリは教えてくれない!"
        },
        {
          "speechId": 356,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3742444,
          "sourceEndMs": 3743864,
          "text": "コヨリは教えてくれないんだ!"
        },
        {
          "speechId": 357,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3743864,
          "sourceEndMs": 3749206,
          "text": "でも確かにコヨリの言う通りコヨリがこう言ったからこうしたでマリンがそうしてさそれでなんか"
        },
        {
          "speechId": 358,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3750062,
          "sourceEndMs": 3779014,
          "text": "なんかそれで何かうまくいかないことがあった時にコメントがこよりがわざと弱いの教えたとか言ってそれでわやわや言われたらうざいからやめとこう確かに聞かんとこうんやめとこうんこよりがわざとなんか弱いの教えたとか言われたら鬱陶しいからやめよううんどうしようじゃあきまちと決めるわそうしよううんそれがいいきまちと一緒に決めるうん"
        },
        {
          "speechId": 359,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3781954,
          "sourceEndMs": 3794866,
          "text": "それがいいよし、じゃあ重さいる説、いらない説重さいる説、いらない説キャッチドーンキャッチ"
        },
        {
          "speechId": 360,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3813170,
          "sourceEndMs": 3816493,
          "text": "さっきのがベストだった?"
        },
        {
          "speechId": 361,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3816493,
          "sourceEndMs": 3822197,
          "text": "いらない派もいれば、いる派もいて、ちょっと欲しいと思っちゃう?"
        },
        {
          "speechId": 362,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3822197,
          "sourceEndMs": 3837229,
          "text": "さっきのまんでいいのかもね最初にやろうとしてた100ピッタだったし100ピッタだったしね"
        },
        {
          "speechId": 372,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4047799,
          "sourceEndMs": 4049960,
          "text": "めっちゃ飛ばないで欲しいなら重さに"
        },
        {
          "speechId": 373,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4052862,
          "sourceEndMs": 4071314,
          "text": "カーブはそもそも飛びづらいからそんなに重さに振らなくていいってみんな言ってんだだから重さは減らしてよくて変化を上げて重さを下げて"
        },
        {
          "speechId": 374,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4081634,
          "sourceEndMs": 4094980,
          "text": "と、飛ぶ、飛ぶ、飛ば、なくて、あーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあー"
        }
      ]
    }
  ],
  "outputContract": {
    "format": "json_only",
    "schema": {
      "themes": [
        {
          "themeId": "string",
          "title": "string",
          "reason": "string_one_sentence",
          "evidenceRanges": [
            {
              "sourceVideoId": "string",
              "sourceStartMs": "number",
              "sourceEndMs": "number",
              "supportingSpeechIds": [
                "number_or_range_string"
              ]
            }
          ]
        }
      ]
    }
  }
}
```
