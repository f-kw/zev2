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
    "windowId": "window_24_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 4650218,
    "sourceEndMs": 5038319
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
      "promptSegmentCount": 17,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 708,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4650218,
          "sourceEndMs": 4678522,
          "text": "今コロネの命かけてあんた戦ってんだから初手から寄ってくるかもなコロさんの命のためにねえこれさ初手なら通るっしょと思ってさやってるでしょ今これ最初なら通るっしょって思ってるでしょ"
        },
        {
          "speechId": 709,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4680854,
          "sourceEndMs": 4702166,
          "text": "通りませんよそんなのはていっほーらわかるんだからわかっちゃうんだからあーあーもう会えないねコロネにお別れいいなお別れなーに生き残ってんだよ生き残んな"
        },
        {
          "speechId": 710,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4710170,
          "sourceEndMs": 4725042,
          "text": "けどね君一人の命じゃないんだからねなるほどなコロネの命を握っているわかるかい?"
        },
        {
          "speechId": 711,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4725042,
          "sourceEndMs": 4734670,
          "text": "君が死ねば2枚ふーんコロさんの命がかかってんのに何目そらしてんの?"
        },
        {
          "speechId": 712,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4734670,
          "sourceEndMs": 4738393,
          "text": "ああ他の女を見ちゃいけないから?"
        },
        {
          "speechId": 713,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4741922,
          "sourceEndMs": 4766221,
          "text": "まあコロさんの命がかかってんのに初手から2枚も嘘をつくとは思わないかなさすがに君がさいきなり2枚も嘘をつくとは思わないそれも本当だと思うここからが本番ってことよ君のコロネの命"
        },
        {
          "speechId": 714,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4770382,
          "sourceEndMs": 4794577,
          "text": "うさんくさいうなずきだねバカだねそのうなずきライアー何嘘てめえコロネと生き残る気か殺さんと生きるな殺さんと生き残りやがったこいつ真のコロネ"
        },
        {
          "speechId": 715,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4800002,
          "sourceEndMs": 4827754,
          "text": "このデスキーですこれこのデスキーめいやーというわけでね結構叫んだんでこのくらいにしとこうかなちょっと叫んだからこのくらいにしとこうかな今日はありがとうあちょっと入ってきちゃったけど吉川さんもてるさんもちょっと今日はこれでこのくらいにしちゃいますが"
        },
        {
          "speechId": 716,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4833059,
          "sourceEndMs": 4859580,
          "text": "キチミさんもパンスト太郎もまた遊びましょう今度ねホロメント4人でやる予定があるのでぜひそちらもよろしくお願いしますお楽しみにちょっと待って画面を移動したいんだけどさ今グだってて移動できないちょっと待ってねこうして"
        },
        {
          "speechId": 717,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4860894,
          "sourceEndMs": 4884714,
          "text": "やばい、ぐちゃぐちゃ、ぐちゃぐちゃになってる画面が、画面が、画面が、画面が、画面が、画面がぐちゃぐちゃちょっと待っててねーちょっと待っててねーこれじゃなくてーこうでーえーっとこれをこうして"
        },
        {
          "speechId": 718,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4894921,
          "sourceEndMs": 4919940,
          "text": "そしてよいしょさあということでねありがとうございましたちょっと抜けてと抜けてといやー叫んじゃった結構はしゃいじゃいました楽しかったですねお疲れ様でした"
        },
        {
          "speechId": 719,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4921122,
          "sourceEndMs": 4946633,
          "text": "ようやくね引っ越しも落ち着いてきてちょっと待ってねマリンの位置が悪いこんな感じで喉がはい引っ越しもねようやく落ち着きました君たちお待たせしました本当にこれでようやく落ち着いてきたのでもうちょっとで二歩時も完全に終わりそうあとちょいで"
        },
        {
          "speechId": 720,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4950398,
          "sourceEndMs": 4977474,
          "text": "なんでねこれでいろいろできるようになると思うんでこれとチャットチャットチャットチャットチャットどこいっちゃったーこうしてこうあできましたスパチャスパチャ"
        },
        {
          "speechId": 721,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4981334,
          "sourceEndMs": 4983375,
          "text": "はいキャプボくんどうなりました?"
        },
        {
          "speechId": 722,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4983375,
          "sourceEndMs": 5009114,
          "text": "キャプボがねちょっと映らず結局映らないままでまあだから買い替えますええホロメンは家に呼べそうまだ呼べないかなBGMないはいまだ呼べないかなもうちょっと綺麗にしないとこのレベルじゃちょっと人呼びたくないな"
        },
        {
          "speechId": 723,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5012366,
          "sourceEndMs": 5021691,
          "text": "もうちょい綺麗になったら呼びたいオープニング変わった?"
        },
        {
          "speechId": 724,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5021691,
          "sourceEndMs": 5038319,
          "text": "そう、なんかクロス制度を流すように天狗ノーズさんに作っていただきましたランボールいっぱいなのねそう、不要品が結構出て"
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
