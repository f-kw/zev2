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
    "windowId": "window_25_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 5101318,
    "sourceEndMs": 5459820
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
      "promptSegmentCount": 19,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 729,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5101318,
          "sourceEndMs": 5129980,
          "text": "リリカにソファーあげるんだけどソファー以外にもあのマリンがゴロゴロ寝るように使ってたなんかでっかい丸いクッションみたいな寝れるクッションみたいなでっかいのがあんだけどそれも置き場がなくなっちゃって置ける部屋がなくなってそしたらちょうどねあのカナデが欲しいって言ってたからカナデにあげることにしたヨギボじゃない名前忘れちゃった"
        },
        {
          "speechId": 730,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5130034,
          "sourceEndMs": 5159366,
          "text": "あんのよなんかでっかくて眠れるやつよぎぼうではないんだけどよぎぼう的なやつ直筆もう終わりましたか直筆終わりました君たちいっぱいいっぱいいっぱい書いたんでいっぱい届くといいなとマリンも楽しみにしとりますリグロスが開始してる確かにねでもリグロスちゃんもね"
        },
        {
          "speechId": 731,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5160418,
          "sourceEndMs": 5188959,
          "text": "もう1年経ったとはいえ新人ちゃんだからねデビューしてきて引っ越しとかもしたりしてきっとねまだ落ち着いてないだろうからあげられるものはあげたいなと思いますよえっとね決まってるんだけどなんかもしちょっと先だまだちょっと先なの"
        },
        {
          "speechId": 732,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5190162,
          "sourceEndMs": 5219920,
          "text": "3くらい先だからもしなんか流れちゃったりなんかなったらなんかあれやらないんですかみたいになっちゃったら悪いから一旦言わんとくわうんでもねあのあーそのメンバーねみたいなメンバーですうんそのメンバーねって感じのおなじみだけど久々って感じの"
        },
        {
          "speechId": 733,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5220446,
          "sourceEndMs": 5226148,
          "text": "メンバーでやりますお楽しみにライブ前にやって大丈夫?"
        },
        {
          "speechId": 734,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5226148,
          "sourceEndMs": 5246654,
          "text": "あ、でもちゃんとライブのことは気遣って今日も結構叫んだから本当はまだやりたかったけどちょっと早めに終わりにしてみたのどやらないようにさあスパチャ読みをしていきますかえっと"
        },
        {
          "speechId": 735,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5250330,
          "sourceEndMs": 5279980,
          "text": "待ってねまさかのドンキホーテンドンキホーテン夏3人しかいないじゃんドンキホーテンはえーっと待ってねスパチャ画面に行きたいと思いますいやでも快適になったわ引っ越ししてなんか音とかも入らないしすごいやりやすい前はねもう外の音めっちゃ"
        },
        {
          "speechId": 736,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5289468,
          "sourceEndMs": 5290569,
          "text": "海鮮はどう?"
        },
        {
          "speechId": 737,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5290569,
          "sourceEndMs": 5308882,
          "text": "あー海鮮ね色々トラブって大変だったんですが無事解決しました業者さんにも来てもらって無事に治りました甘辛っぺお願いします甘辛っぺ5人だからねピンパータイムなくなったんでしょう?"
        },
        {
          "speechId": 738,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5310034,
          "sourceEndMs": 5329039,
          "text": "だからなんかあれよSMRとかもできるかなと部屋今ごちゃごちゃしてますからだいぶ片付いたこれ終わった後もこの後も片付けまた続きやろうって感じ結局団長からSMRのマイク買い取ったの?"
        },
        {
          "speechId": 739,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5329039,
          "sourceEndMs": 5339442,
          "text": "いや買い取ってない仮パクしてるお金払った方がいいかもしんないワイルズやろうぜモンハン?"
        },
        {
          "speechId": 740,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5340000,
          "sourceEndMs": 5349026,
          "text": "気になるねやってみたい"
        },
        {
          "speechId": 741,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5371907,
          "sourceEndMs": 5379650,
          "text": "ベノム同時賞も面白かったベノム面白かったねちょっと近日中に11月のあの3日?"
        },
        {
          "speechId": 742,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5379650,
          "sourceEndMs": 5399980,
          "text": "あれ2日だっけ映画が始まる前に見たいね同時賞やりたいな11月1日あ1日か1日かえじゃあめっちゃ"
        },
        {
          "speechId": 743,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5402754,
          "sourceEndMs": 5404695,
          "text": "あさってじゃん?"
        },
        {
          "speechId": 744,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5404695,
          "sourceEndMs": 5408138,
          "text": "あさってじゃん?"
        },
        {
          "speechId": 745,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5408138,
          "sourceEndMs": 5411220,
          "text": "ウェルズ配信見たい?"
        },
        {
          "speechId": 746,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5411220,
          "sourceEndMs": 5428613,
          "text": "やるかモンハンやってみるか一味にゃん君たちと共に明日は新人さんと配信そうなんですよ君たちちょっと早くその話もねしたい早くその話もしたいな"
        },
        {
          "speechId": 747,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5434707,
          "sourceEndMs": 5459820,
          "text": "船長武器何にするえー何がいいんだろうわかんないなワルズキャラクリめっちゃよくなってるそうなんだ気になりますね武器2本持ってるえーそうなんだ弓が使いやすいそうなの遠距離いいななんか"
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
