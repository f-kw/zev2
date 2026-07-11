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
    "windowId": "window_32_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 5310822,
    "sourceEndMs": 5501533
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 11824.121,
      "rawSegmentCount": 53180,
      "promptSegmentCount": 23,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 795,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5310822,
          "sourceEndMs": 5320109,
          "text": "だから、材料が足りないからあ、あ、あ、そうだ、同じこと、何回も強制で、強制!"
        },
        {
          "speechId": 796,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5320109,
          "sourceEndMs": 5337362,
          "text": "次言わせたらマジで、ガタガタ言わせるからなやばいやばいやばいよこれ、どうしようご機嫌そこにいちゃったわで、ここにもあれつけたいなOKここ無理なのかな?"
        },
        {
          "speechId": 797,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5337362,
          "sourceEndMs": 5338002,
          "text": "ちょっと、素材が足りないのかな?"
        },
        {
          "speechId": 798,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5338002,
          "sourceEndMs": 5339944,
          "text": "あれ、ここ無理なのかな?"
        },
        {
          "speechId": 799,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5341314,
          "sourceEndMs": 5341775,
          "text": "あれかな?"
        },
        {
          "speechId": 800,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5341775,
          "sourceEndMs": 5343575,
          "text": "柱がないからか?"
        },
        {
          "speechId": 801,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5343575,
          "sourceEndMs": 5350698,
          "text": "ちょっと階層集めてきまーすあ、ナイスーこれでどうだ?"
        },
        {
          "speechId": 802,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5350698,
          "sourceEndMs": 5350938,
          "text": "サラサラ?"
        },
        {
          "speechId": 803,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5350938,
          "sourceEndMs": 5369824,
          "text": "サラサラサラサラ行ける行ける行けるあ、できたできたいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよ"
        },
        {
          "speechId": 804,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5370342,
          "sourceEndMs": 5372123,
          "text": "角刈り用?"
        },
        {
          "speechId": 805,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5372123,
          "sourceEndMs": 5384947,
          "text": "角刈り用角刈り用ねうんこれつけるかでもやっぱ開放感も欲しいからさまあ確かに壁いらなくね?"
        },
        {
          "speechId": 806,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5384947,
          "sourceEndMs": 5388388,
          "text": "そういうわけじゃない?"
        },
        {
          "speechId": 807,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5388388,
          "sourceEndMs": 5399952,
          "text": "1階は開放するかいいな2階は2階は壁ありOKOK"
        },
        {
          "speechId": 808,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5402383,
          "sourceEndMs": 5404665,
          "text": "周りに何もないかもここない?"
        },
        {
          "speechId": 809,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5404665,
          "sourceEndMs": 5415130,
          "text": "OK早々に移動した方がいいかもしれない壁にストレージできる?"
        },
        {
          "speechId": 810,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5415130,
          "sourceEndMs": 5416951,
          "text": "クローゼットみたいな感じ?"
        },
        {
          "speechId": 811,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5416951,
          "sourceEndMs": 5428318,
          "text": "ちょっと待ってやってみていいよ階段の裏側とかデッドスペースを活かしてさ収納をここにさ"
        },
        {
          "speechId": 812,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5429346,
          "sourceEndMs": 5430000,
          "text": "え、ちょっと待って"
        },
        {
          "speechId": 813,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5431915,
          "sourceEndMs": 5459098,
          "text": "ちょっと待って忙しくなって気上がりましたわすごいじゃんなんかしたいなちょっとじゃあもうここ離して移動しました移動してまた板とか集めて欲しいかなじゃあアンカー外します壁の収納所気になりますちょっともう一回魚釣ろうこれちょっとぶち壊して待って待ってまず2階の"
        },
        {
          "speechId": 814,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5460342,
          "sourceEndMs": 5489452,
          "text": "ここの完成させようここをこのエリアを2階で何をしたいかって言ったらやっぱり作物とかヤシの木を2階で育てたいよねそれなそれなじゃあとりあえず魚釣りながらあれだ材料集めるわんでもやっぱさ1回さジャンプでさ移動できないのちょっとだるいよね引っかかってあジャンプあー別にいいようーんあー"
        },
        {
          "speechId": 815,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5490987,
          "sourceEndMs": 5499272,
          "text": "わかるわかるジャンプに移動できた方がいいわな何してる?"
        },
        {
          "speechId": 816,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5499272,
          "sourceEndMs": 5499512,
          "text": "大丈夫?"
        },
        {
          "speechId": 817,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5499512,
          "sourceEndMs": 5501533,
          "text": "大丈夫サメ?"
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
