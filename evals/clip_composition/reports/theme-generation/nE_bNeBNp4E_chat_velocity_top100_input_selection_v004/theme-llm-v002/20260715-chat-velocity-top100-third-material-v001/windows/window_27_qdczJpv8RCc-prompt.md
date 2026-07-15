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
    "windowId": "window_27_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 6143698,
    "sourceEndMs": 7446729
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
      "promptSegmentCount": 20,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 786,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6143698,
          "sourceEndMs": 6149100,
          "text": "久々にマリンタンだよ"
        },
        {
          "speechId": 787,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6153714,
          "sourceEndMs": 6179780,
          "text": "ハッピーバースデートゥーユーだよーえー村くんもありがとうございますこういうゲームなので船長苦手かなと思いましたが自分で撃ってないから平気でしたねあーもう船長が人を撃つのが苦手なんだと思ってる人がいるかもしれませんがなんか船長が嫌なのは"
        },
        {
          "speechId": 788,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6181301,
          "sourceEndMs": 6209302,
          "text": "善良な人間を殺すことねうんあのさっきは嘘つきなリスナーを称してただけだからうん何も悪いことしてない善良な市民を殺すのが無理なのかわいそうじゃんえっと"
        },
        {
          "speechId": 789,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6210714,
          "sourceEndMs": 6239074,
          "text": "26日に誕生日でしたお、お誕生日おめでとうございました良い一年になりますようにお、そしてソロライブ現状1日だけの1日目だけの片パイ状態ということで26日にも大募集1人を頼みましたが当たる気が全くしません当たるよー当たるよ絶対当たると思う当たってほしい"
        },
        {
          "speechId": 790,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6241826,
          "sourceEndMs": 6269980,
          "text": "当たりますように君が来ますようにありがとうえっとくるみーさんありがとうございますえっと今日36の誕生日に迎えましたおめでとうございます去年はバイオハザードのアンジーのモノマネでバースデーソングを歌っていただきました今年は何か新作のモノマネでお祝いの言葉をいただけない"
        },
        {
          "speechId": 791,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6270002,
          "sourceEndMs": 6275625,
          "text": "なんだろ、なんのモノマネする?"
        },
        {
          "speechId": 792,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6275625,
          "sourceEndMs": 6276946,
          "text": "じゃあみさとさんね"
        },
        {
          "speechId": 793,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6300002,
          "sourceEndMs": 6317632,
          "text": "ありがとうございます公開紙のものなのですが前回の乗船で新たに機関長一味に新たに機関長一味に引き入れることができた機関長一味に引き入れたってこと?"
        },
        {
          "speechId": 794,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6317632,
          "sourceEndMs": 6326557,
          "text": "これで地球上にある船と呼ばれるものは全て運航可能ですすごーかっこよー"
        },
        {
          "speechId": 795,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6330890,
          "sourceEndMs": 6359920,
          "text": "嬉しいはいえっと栄えある宝鐘海賊団機関乗組員に加えてもらえないでしょうかいやむしろ君君以外の一味は何もできないから君だけが頼りですもはやありがとうございます現地チケット1時は全落ちましたので2時にかけますもし嬉しければ当たるように祈っていただけますでしょうか当たりますように"
        },
        {
          "speechId": 803,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6540022,
          "sourceEndMs": 6567790,
          "text": "勝者が一味から出るかも前に船長の可愛さと曜日の関係性を調査しましたが今回は船長の可愛さと時間の関連性を調査しました調査の結果0から6時可愛い6時から12時可愛い12時から18時えマジか可愛い18時から23時え待って可愛い24時ほわー待って可愛いの申し子なんと24時間可愛いという結果に"
        },
        {
          "speechId": 804,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6572355,
          "sourceEndMs": 6599202,
          "text": "意味不明ですたぶんね働きすぎでおかしくなってるねこれありがとうございますいつもえー道具係のガルードありがとうございますライブチケット当たれー当たるー絶対当たるー早く君たちに会いたいなライブまで頑張っていこうな君たち"
        },
        {
          "speechId": 836,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7382519,
          "sourceEndMs": 7406422,
          "text": "君のお料理食べてみたいなそしてお誕生日おめでとうございました良い一年になりますようにこもれびなつトマトさんありがとうございます美魔女モデルの圧の表情がすごく好きなのでドアップで圧かけてくださいませんかいいですよこんくらいかなちょっと待ってこれ消そう"
        },
        {
          "speechId": 837,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7410514,
          "sourceEndMs": 7410634,
          "text": "しか!"
        },
        {
          "speechId": 838,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7410634,
          "sourceEndMs": 7422063,
          "text": "こんなもんくらえ!"
        },
        {
          "speechId": 839,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7422063,
          "sourceEndMs": 7428528,
          "text": "マリンの圧をくらえ!"
        },
        {
          "speechId": 840,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7428528,
          "sourceEndMs": 7435834,
          "text": "くらってる?"
        },
        {
          "speechId": 841,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7435834,
          "sourceEndMs": 7436334,
          "text": "おい!"
        },
        {
          "speechId": 842,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7441326,
          "sourceEndMs": 7444588,
          "text": "食べてやろうか!"
        },
        {
          "speechId": 843,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7444588,
          "sourceEndMs": 7446729,
          "text": "ハオッ!"
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
