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
    "windowId": "window_06_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 3037740,
    "sourceEndMs": 3554885
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
      "promptSegmentCount": 28,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 310,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3037740,
          "sourceEndMs": 3040601,
          "text": "オッケオッケオッケこの方がいい?"
        },
        {
          "speechId": 311,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3040601,
          "sourceEndMs": 3046384,
          "text": "オッケオッケオッケオッケオッケもっとキレ欲しい?"
        },
        {
          "speechId": 312,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3046384,
          "sourceEndMs": 3049046,
          "text": "え、じゃああ、もう無理だわこれMAXうん"
        },
        {
          "speechId": 318,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3189493,
          "sourceEndMs": 3197240,
          "text": "エフェクトはこれが一番エフェクト低コストのエフェクトもコスト違うの?"
        },
        {
          "speechId": 319,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3197240,
          "sourceEndMs": 3208750,
          "text": "何も変わんないけど何も変わんないけど全力ストレートタイプだとちょっと軽いわ"
        },
        {
          "speechId": 320,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3214194,
          "sourceEndMs": 3227306,
          "text": "え、でもなんかでもなんか、それはどうなん?"
        },
        {
          "speechId": 321,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3227306,
          "sourceEndMs": 3238957,
          "text": "これにしようよしちゃー!"
        },
        {
          "speechId": 322,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3238957,
          "sourceEndMs": 3239698,
          "text": "いいかな?"
        },
        {
          "speechId": 323,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3240258,
          "sourceEndMs": 3261814,
          "text": "これで名前はちょっと待ってフブちゃんの必殺技の名前フブちゃんの技の名前えっとちょっと待ってねホロウィッチのフブちゃんのホロウィッチ"
        },
        {
          "speechId": 324,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3285237,
          "sourceEndMs": 3285817,
          "text": "フブちゃんの技なんかやってなかった?"
        },
        {
          "speechId": 325,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3285817,
          "sourceEndMs": 3295742,
          "text": "ちょっと待ってね忘れるビーム忘れるビームはフブちゃんの技じゃなくて石丸くんの技やんけトリックスター?"
        },
        {
          "speechId": 326,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3308622,
          "sourceEndMs": 3328810,
          "text": "マリンの回の時のチャンフブチャンフブの技トリッキービクセン"
        },
        {
          "speechId": 327,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3345969,
          "sourceEndMs": 3352672,
          "text": "もうちょっと星っぽい名前がいいよトリックスターはあれだ心躍らすトリックスターって自分のスーパーノヴァいいね!"
        },
        {
          "speechId": 328,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3352672,
          "sourceEndMs": 3355694,
          "text": "スーパーノヴァいい!"
        },
        {
          "speechId": 329,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3355694,
          "sourceEndMs": 3356514,
          "text": "スーパーノヴァにしよう"
        },
        {
          "speechId": 330,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3362262,
          "sourceEndMs": 3389062,
          "text": "星で加工をうか星で貼ってスーパー感じのがいいかな感じのがいいかなだから長いか"
        },
        {
          "speechId": 331,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3392459,
          "sourceEndMs": 3418214,
          "text": "あ、落ちるまた落ちた"
        },
        {
          "speechId": 332,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3422110,
          "sourceEndMs": 3438265,
          "text": "FPSが落ちるなぁ漢字で行くか!"
        },
        {
          "speechId": 333,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3438265,
          "sourceEndMs": 3439666,
          "text": "漢字じゃない!"
        },
        {
          "speechId": 334,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3439666,
          "sourceEndMs": 3440206,
          "text": "英語で行くか!"
        },
        {
          "speechId": 335,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3440206,
          "sourceEndMs": 3440407,
          "text": "英語で!"
        },
        {
          "speechId": 336,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3440407,
          "sourceEndMs": 3448674,
          "text": "1,2,3,4,5,6,7,8,9待って、9文字1,2,3これ、これいらない?"
        },
        {
          "speechId": 337,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3456229,
          "sourceEndMs": 3472798,
          "text": "英語英語英語入るかこうちゃんとググってちゃんとググって見てるから大丈夫間に腰入れる?"
        },
        {
          "speechId": 338,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3480150,
          "sourceEndMs": 3509840,
          "text": "ギリギリで草ギリギリすぎるだろこれぴったりだよこれぴったりどうかっこいいしどうですかぴったりふぶちゃんみこちが読めない読めるやろふぶちゃんの曲"
        },
        {
          "speechId": 339,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3511986,
          "sourceEndMs": 3520409,
          "text": "OKじゃあスーパーノヴァでもう一回投げてみよう"
        },
        {
          "speechId": 340,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3542099,
          "sourceEndMs": 3549262,
          "text": "いいかわいいいいのでは?"
        },
        {
          "speechId": 341,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3549262,
          "sourceEndMs": 3551303,
          "text": "これでいいのかな?"
        },
        {
          "speechId": 342,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3551303,
          "sourceEndMs": 3554885,
          "text": "キョウジいいと思う?"
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
