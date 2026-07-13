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
    "windowId": "seam_015_o8rZAhARXAc",
    "windowKind": "seam_bridge",
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
    },
    {
      "speechId": 466,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4911936,
      "sourceEndMs": 4918818,
      "text": "粘り打ち固め打ちさよなら男ラインドライブカット打ちさよなら男"
    },
    {
      "speechId": 467,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4921566,
      "sourceEndMs": 4923748,
      "text": "ミートかティー?"
    },
    {
      "speechId": 468,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4923748,
      "sourceEndMs": 4947210,
      "text": "ラインドライブ、インコースヒッター、ローボルヒッターうんバレてる、バレてるねティーのがいいティーにするかあ、左のミート推しもいるか左のミートはこれかニャーニャーニャーティーでいっか"
    },
    {
      "speechId": 469,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4950642,
      "sourceEndMs": 4951783,
      "text": "え、もう次で最後?"
    },
    {
      "speechId": 470,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4951783,
      "sourceEndMs": 4953404,
      "text": "やばくない?"
    },
    {
      "speechId": 471,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4953404,
      "sourceEndMs": 4979920,
      "text": "あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ�"
    },
    {
      "speechId": 472,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4983207,
      "sourceEndMs": 4988429,
      "text": "どうする?"
    },
    {
      "speechId": 473,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4988429,
      "sourceEndMs": 4990070,
      "text": "インターバル走?"
    },
    {
      "speechId": 474,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4990070,
      "sourceEndMs": 4998554,
      "text": "これ?"
    },
    {
      "speechId": 475,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4998554,
      "sourceEndMs": 5000855,
      "text": "インターバル?"
    },
    {
      "speechId": 476,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5000855,
      "sourceEndMs": 5009920,
      "text": "総合で対エースかインターバルこれな対エースかインターバルか"
    },
    {
      "speechId": 477,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5015026,
      "sourceEndMs": 5030300,
      "text": "インターバルでもいいかうん、タイエースのがいいかあー別にでもナイアアンダーが良い?"
    },
    {
      "speechId": 478,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5030300,
      "sourceEndMs": 5032322,
      "text": "じゃあインターバル搭載するか"
    },
    {
      "speechId": 479,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5049464,
      "sourceEndMs": 5058931,
      "text": "やばい、ホロメン…3年生ばっかりじゃんホロメン…もうやばい3年生…分かった!"
    },
    {
      "speechId": 480,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5058931,
      "sourceEndMs": 5060332,
      "text": "甲子園勝とうってんだな!"
    },
    {
      "speechId": 481,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5060332,
      "sourceEndMs": 5060712,
      "text": "分かった!"
    },
    {
      "speechId": 482,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5060712,
      "sourceEndMs": 5061293,
      "text": "3年生!"
    },
    {
      "speechId": 483,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5061293,
      "sourceEndMs": 5061993,
      "text": "みんな!"
    },
    {
      "speechId": 484,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5061993,
      "sourceEndMs": 5064295,
      "text": "この甲子園絶対勝とうってんだな!"
    },
    {
      "speechId": 485,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5064295,
      "sourceEndMs": 5065576,
      "text": "やる気があるんだな!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
