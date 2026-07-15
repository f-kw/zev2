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
    "windowId": "window_22_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 4080650,
    "sourceEndMs": 4311916
  },
  "sources": [
    {
      "sourceVideoId": "qdczJpv8RCc",
      "sourceUrl": "https://www.youtube.com/watch?v=qdczJpv8RCc",
      "sourceTitle": "【Liar's Bar】キミたちと初見であそぶ！視聴者参加型【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 7760.401,
      "rawSegmentCount": 23963,
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 653,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4080650,
          "sourceEndMs": 4081711,
          "text": "マジ殺してやる!"
        },
        {
          "speechId": 654,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4081711,
          "sourceEndMs": 4082331,
          "text": "見ろ!"
        },
        {
          "speechId": 655,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4082331,
          "sourceEndMs": 4083852,
          "text": "バカが!"
        },
        {
          "speechId": 656,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4083852,
          "sourceEndMs": 4087315,
          "text": "なぁ!"
        },
        {
          "speechId": 657,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4087315,
          "sourceEndMs": 4088696,
          "text": "マリン疑ってんじゃねぇ!"
        },
        {
          "speechId": 658,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4088696,
          "sourceEndMs": 4091498,
          "text": "マリンが好きなんじゃなかったんか!"
        },
        {
          "speechId": 659,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4091498,
          "sourceEndMs": 4092959,
          "text": "てで!"
        },
        {
          "speechId": 660,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4092959,
          "sourceEndMs": 4095621,
          "text": "何生き残ってんだよぉ!"
        },
        {
          "speechId": 661,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4095621,
          "sourceEndMs": 4100384,
          "text": "生き残んなお前はぁ!"
        },
        {
          "speechId": 662,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4100384,
          "sourceEndMs": 4108290,
          "text": "デスカード、デビルカード来ないんだけど来るのかないつか来ない"
        },
        {
          "speechId": 663,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4110042,
          "sourceEndMs": 4123746,
          "text": "ジョーカーか誰の番これ?"
        },
        {
          "speechId": 664,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4123746,
          "sourceEndMs": 4137150,
          "text": "ポムさんはさぁコロネのこっち見たコロネのさぁ好きなところはさぁどこなの?"
        },
        {
          "speechId": 665,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4137150,
          "sourceEndMs": 4137890,
          "text": "動きで表現して"
        },
        {
          "speechId": 666,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4141270,
          "sourceEndMs": 4170000,
          "text": "あーはいはいはいはい可愛いところでもさ他の女とゲーム遊んでるのはこれ浮気なんじゃないコロネスキーとしてさおいツッキさんダメだよそうやってさりげなくさおしゃべりしてるからいけると思っちゃったんだねはい通りませんそんなものはLiar"
        },
        {
          "speechId": 667,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4175846,
          "sourceEndMs": 4194062,
          "text": "アワンドンさん代わりにマリンの身代わりになってお願い代わりに死んでお願いお願いやだやだやだお願いお願いお願い大丈夫大丈夫大丈夫そう大丈夫なんだなこれが大丈夫なわけよ話は終わってないんだけどポムさんこれはさ浮気?"
        },
        {
          "speechId": 668,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4194062,
          "sourceEndMs": 4198226,
          "text": "これコロネが知ったら悲しむよ他の女と遊んでるんだって"
        },
        {
          "speechId": 669,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4208386,
          "sourceEndMs": 4209167,
          "text": "やりたい!"
        },
        {
          "speechId": 670,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4209167,
          "sourceEndMs": 4210087,
          "text": "やりたい!"
        },
        {
          "speechId": 671,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4210087,
          "sourceEndMs": 4215091,
          "text": "これやりたい!"
        },
        {
          "speechId": 672,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4215091,
          "sourceEndMs": 4229062,
          "text": "待って待って、こうしてあ、1枚でしか出さないんだうわ、出したいこれいったんこれで進んできてから進んできてから"
        },
        {
          "speechId": 673,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4230098,
          "sourceEndMs": 4237061,
          "text": "さすがにそれはないだろうというタイミングでえ?"
        },
        {
          "speechId": 674,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4237061,
          "sourceEndMs": 4239342,
          "text": "2枚?"
        },
        {
          "speechId": 675,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4239342,
          "sourceEndMs": 4251308,
          "text": "これでもう4枚出てるって計算になるよねみんなまあ一旦進めよ一旦進めよこの勝負マリンまで回して"
        },
        {
          "speechId": 676,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4264310,
          "sourceEndMs": 4270295,
          "text": "ツッキさんはさ2エース?"
        },
        {
          "speechId": 677,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4270295,
          "sourceEndMs": 4289230,
          "text": "今バニー2いっぱいエースが出てるって計算じゃんなのにエース出してるマリンのことどう思うこれ?"
        },
        {
          "speechId": 678,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4289230,
          "sourceEndMs": 4289710,
          "text": "怪しい?"
        },
        {
          "speechId": 679,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4292166,
          "sourceEndMs": 4298269,
          "text": "いや、一回さ、ライアーしてみて?"
        },
        {
          "speechId": 680,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4298269,
          "sourceEndMs": 4311096,
          "text": "いいからみんな!"
        },
        {
          "speechId": 681,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4311096,
          "sourceEndMs": 4311916,
          "text": "みんな頑張れ!"
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
