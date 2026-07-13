# callback detection search prompt v001

あなたは、ライブ配信の後の反応を理解するために必要な「以前の別場面」を、元配信の文字起こし窓から探します。

## 仕事

- `targets` の各反応候補について、`sourceSegments` 内に原因場面があれば抽出する。
- 原因場面とは、後の反応を成立させた宣言、約束、選択、以前の失敗、フラグ、人物間のやり取りなど、出来事そのものが起きた場面である。
- 原因場面を先に見ることで、「なぜ後でその反応をしたか」が具体的に分かる必要がある。
- 1つの窓に複数の原因場面があれば、すべて返す。該当がなければ空配列を返す。

## 採用しないもの

- `reactionEvidence` 内や、それと重なる場面
- 反応の後に行われた振り返り
- 起きたことを反応場面内で言い直しただけの説明
- 同じ単語、ゲーム要素、人物が出るだけで因果関係がない場面
- 配信全体に共通する一般背景
- `title` や `reason` から推測しただけで、`sourceSegments` に根拠がない出来事

`title` と `reason` は探索仮説であり、事実とは限りません。必ずこの窓の発話本文だけで裏付けてください。別の原因場面が存在しない候補もあるので、無理に作らないでください。

## 発話ID

- `causeSpeechIds` はこの窓の `sourceSegments[].speechId` だけを使う。
- 連続IDは `"12-17"`、不連続IDは数値として同じ配列へ入れられる。
- 時刻は返さない。

## 出力

説明やMarkdownを付けず、次のJSONだけを返してください。

```json
{
  "callbackFindings": [
    {
      "targetId": "入力にあるtargetId",
      "causeSpeechIds": [12, "14-17"],
      "sceneDescription": "この別場面で実際に起きたことを1文",
      "causalLink": "後の反応との因果関係を1文",
      "missingContextSupplied": "先に見ると何が理解できるようになるかを1文"
    }
  ]
}
```

## 入力JSON

```json
{
  "task": "source_only_callback_detection_search",
  "generationSystem": "callback-detection-v001@gemini-web-flash",
  "promptVersion": "callback_detection_search_prompt_v001",
  "inputPolicy": {
    "sourceOnly": true,
    "noClipInfo": true,
    "noExpected": true,
    "noAlignment": true,
    "noHumanLabels": true,
    "causeMustBeEarlierSeparateScene": true
  },
  "window": {
    "windowId": "window_015_o8rZAhARXAc",
    "windowKind": "primary",
    "sourceVideoId": "o8rZAhARXAc"
  },
  "targets": [
    {
      "targetId": "o8rZAhARXAc-candidate-25",
      "title": "チャットの指示で対戦相手を選んだ結果、Bランクの高校を引いて焦るシーン",
      "reason": "リスナー（キャージー）に選択を委ねた結果、手強いBランクの「ざまみ商業高校」を引き当ててしまい動揺するリアクションが面白いため。",
      "reactionEvidence": {
        "sourceVideoId": "o8rZAhARXAc",
        "speechIds": [
          565,
          566,
          567,
          568,
          569,
          570,
          571,
          572
        ],
        "segments": [
          {
            "speechId": 565,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5701367,
            "sourceEndMs": 5702247,
            "text": "どこにする?"
          },
          {
            "speechId": 566,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5702247,
            "sourceEndMs": 5714533,
            "text": "キャージーどれがいい?"
          },
          {
            "speechId": 567,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5714533,
            "sourceEndMs": 5719475,
            "text": "どれがいい?"
          },
          {
            "speechId": 568,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5719475,
            "sourceEndMs": 5721796,
            "text": "魔物でギリかキャージーに決めてもらうわはいはいはいえっと一番右オッケーじゃあ一番右で行きますけ!"
          },
          {
            "speechId": 569,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5721796,
            "sourceEndMs": 5728519,
            "text": "1?"
          },
          {
            "speechId": 570,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5728519,
            "sourceEndMs": 5729340,
            "text": "1Bかー"
          },
          {
            "speechId": 571,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5733894,
            "sourceEndMs": 5751200,
            "text": "ざま…ざまみ…ざまみ商業高校ざまみ…大丈夫かなぁ…Bって…Bやばいか?"
          },
          {
            "speechId": 572,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5751200,
            "sourceEndMs": 5755602,
            "text": "まぁ占い師踏んで…占い師踏んで…"
          }
        ]
      }
    }
  ],
  "sourceSegments": [
    {
      "speechId": 429,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4662938,
      "sourceEndMs": 4664620,
      "text": "マジそれじゃん失礼しました"
    },
    {
      "speechId": 430,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4665958,
      "sourceEndMs": 4677797,
      "text": "邪魔でしたどこにいたらいいかわかんねぇここにいよここにいとこ何がいいかなぁ"
    },
    {
      "speechId": 431,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4680822,
      "sourceEndMs": 4687906,
      "text": "スワにキャッチャーついたってな意味ないから走り込み消そう?"
    },
    {
      "speechId": 432,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4687906,
      "sourceEndMs": 4709200,
      "text": "確かにこれいらないかこのどうせついたってしょうがないだろみたいな時にまだこれからこいつらと甲子園行くから甲子園まだ行くからミート?"
    },
    {
      "speechId": 433,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4709200,
      "sourceEndMs": 4709900,
      "text": "ミートもいらないじゃん"
    },
    {
      "speechId": 434,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4710002,
      "sourceEndMs": 4710742,
      "text": "ミートにするか!"
    },
    {
      "speechId": 435,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4710742,
      "sourceEndMs": 4711703,
      "text": "ミートに!"
    },
    {
      "speechId": 436,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4711703,
      "sourceEndMs": 4713523,
      "text": "左のミートでこっちか!"
    },
    {
      "speechId": 437,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4713523,
      "sourceEndMs": 4715744,
      "text": "これかん!"
    },
    {
      "speechId": 438,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4715744,
      "sourceEndMs": 4719666,
      "text": "こっちかん!"
    },
    {
      "speechId": 439,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4719666,
      "sourceEndMs": 4723728,
      "text": "左のミートこれな!"
    },
    {
      "speechId": 440,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4723728,
      "sourceEndMs": 4725088,
      "text": "しおりんがつくかもしんないもんね!"
    },
    {
      "speechId": 441,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4725088,
      "sourceEndMs": 4726249,
      "text": "わかった!"
    },
    {
      "speechId": 442,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4726249,
      "sourceEndMs": 4727229,
      "text": "じゃこれで行くわ!"
    },
    {
      "speechId": 443,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4727229,
      "sourceEndMs": 4730931,
      "text": "こっち!"
    },
    {
      "speechId": 444,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4730931,
      "sourceEndMs": 4731671,
      "text": "お前かん!"
    },
    {
      "speechId": 445,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4731671,
      "sourceEndMs": 4732992,
      "text": "古川!"
    },
    {
      "speechId": 446,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4732992,
      "sourceEndMs": 4733332,
      "text": "すまー!"
    },
    {
      "speechId": 447,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4733332,
      "sourceEndMs": 4734412,
      "text": "あ!"
    },
    {
      "speechId": 448,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4734412,
      "sourceEndMs": 4735393,
      "text": "しおりん!"
    },
    {
      "speechId": 449,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4735393,
      "sourceEndMs": 4735933,
      "text": "ついた!"
    },
    {
      "speechId": 450,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4735933,
      "sourceEndMs": 4736373,
      "text": "カット打ち!"
    },
    {
      "speechId": 451,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4736373,
      "sourceEndMs": 4738494,
      "text": "ええやん!"
    },
    {
      "speechId": 452,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4741026,
      "sourceEndMs": 4764298,
      "text": "またつくやんいいやんスワはねまだねマリンのチームのね一軍ですからちょっと待ってもうホンダスワやる気出すなやばい3年生が強化されて意味ないどうしようしかもラオーラどうしようなうわどうしよう"
    },
    {
      "speechId": 453,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4770854,
      "sourceEndMs": 4779937,
      "text": "今のうちどうしよう3年生ばっか来る助けてこれどうしようこれダンベル?"
    },
    {
      "speechId": 454,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4779937,
      "sourceEndMs": 4780177,
      "text": "これ?"
    },
    {
      "speechId": 455,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4780177,
      "sourceEndMs": 4785018,
      "text": "走り込むの?"
    },
    {
      "speechId": 456,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4785018,
      "sourceEndMs": 4786338,
      "text": "これ?"
    },
    {
      "speechId": 457,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4786338,
      "sourceEndMs": 4798762,
      "text": "これやだしょぼいからダンベルにするかあ、あったダンベルななんかつけなんもつかんなかー"
    },
    {
      "speechId": 458,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4801534,
      "sourceEndMs": 4803915,
      "text": "なんつかんだかーい!"
    },
    {
      "speechId": 459,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4803915,
      "sourceEndMs": 4828442,
      "text": "お、カエラいるカエラアイリスもいるしえ、どうしようえ、どうしようこれキャッチャーチャレンジしたいからこれとっておきたいよなこれはキャッチャーチャレンジがしたいよねナイアンアンダーインターバルスをじゃあ"
    },
    {
      "speechId": 460,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4830406,
      "sourceEndMs": 4846482,
      "text": "こっちか盗塁あるしこっちの方がいいかな左のインターバル層かなうんじゃ左左インターバル行きますね"
    },
    {
      "speechId": 461,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4891090,
      "sourceEndMs": 4895571,
      "text": "なに?"
    },
    {
      "speechId": 462,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4895571,
      "sourceEndMs": 4899312,
      "text": "何しよう?"
    },
    {
      "speechId": 463,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4899312,
      "sourceEndMs": 4910255,
      "text": "えーえーえーえーどうする?"
    },
    {
      "speechId": 464,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4910255,
      "sourceEndMs": 4911456,
      "text": "何がいいかな?"
    },
    {
      "speechId": 465,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4911456,
      "sourceEndMs": 4911936,
      "text": "ミート?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
