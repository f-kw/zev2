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
    "windowId": "seam_004_o8rZAhARXAc",
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
      "speechId": 114,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 878566,
      "sourceEndMs": 882228,
      "text": "すごくない?"
    },
    {
      "speechId": 115,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 882228,
      "sourceEndMs": 892815,
      "text": "え、待ってリリカみたいに考えらんなよなんて考えられないのあかんなよ助けて"
    },
    {
      "speechId": 116,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 903170,
      "sourceEndMs": 929860,
      "text": "旧種にはランクがありパラメータに応じて変動していきます旧種ランクが100を超えると開発が完了できませんまた新旧種の開発を始めるには新旧種開発ボールが必要になりますなにそれこのアイテムはパワプロショップで購入できますえ、なんしら持ってないけど開発した新旧種は最大6種まで保存できますサクセスなどのモードで開発した旧種を習得する"
    },
    {
      "speechId": 117,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 931954,
      "sourceEndMs": 949338,
      "text": "この教書は消費されて無くなります何だろう分かんないよ開発すればいいの?"
    },
    {
      "speechId": 118,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 949338,
      "sourceEndMs": 959160,
      "text": "リリカ今コロナだからどうしたらいいの分かんない分かんないよさっきもらったでしょ分かんないよこより配信中だ泣こう分かんなくて泣こう分かんないよ何作ったらいいんだろう"
    },
    {
      "speechId": 119,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 961718,
      "sourceEndMs": 964320,
      "text": "どうやって作ったらいいんだろう?"
    },
    {
      "speechId": 120,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 964320,
      "sourceEndMs": 976009,
      "text": "分かんないよ開発する?"
    },
    {
      "speechId": 121,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 976009,
      "sourceEndMs": 989800,
      "text": "ほなみこちに聞くかみこちに聞いたって分かるわけないじゃん分かるわけない開発する新旧種が開発"
    },
    {
      "speechId": 122,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 990246,
      "sourceEndMs": 1001811,
      "text": "いきますフォーカが強いんじゃないのやっぱみんなフォーカが強いって言ってるよねみおしゃに聞く?"
    },
    {
      "speechId": 123,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1001811,
      "sourceEndMs": 1002672,
      "text": "誰か?"
    },
    {
      "speechId": 124,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1002672,
      "sourceEndMs": 1003332,
      "text": "みお先輩誰か?"
    },
    {
      "speechId": 125,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1003332,
      "sourceEndMs": 1003512,
      "text": "誰か?"
    },
    {
      "speechId": 126,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1003512,
      "sourceEndMs": 1005033,
      "text": "誰か?"
    },
    {
      "speechId": 127,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1005033,
      "sourceEndMs": 1013337,
      "text": "待ってディスコードでちょっと飛ばしてみよう誰かわかる人いませんか?"
    },
    {
      "speechId": 128,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1013337,
      "sourceEndMs": 1019860,
      "text": "ちょっと待ってえっとタレントアット"
    },
    {
      "speechId": 129,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1021154,
      "sourceEndMs": 1048380,
      "text": "タレントえっとすみません今パワープロやってるんですけどオリジナル九州っていうのを作ったことがあってわかる人っていらっしゃいますか全くわからず"
    },
    {
      "speechId": 130,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1057442,
      "sourceEndMs": 1059143,
      "text": "フォークかな?"
    },
    {
      "speechId": 131,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1059143,
      "sourceEndMs": 1060783,
      "text": "フォークかな?"
    },
    {
      "speechId": 132,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1060783,
      "sourceEndMs": 1063304,
      "text": "フォークなのかな?"
    },
    {
      "speechId": 133,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1063304,
      "sourceEndMs": 1066625,
      "text": "とりあえず誰かのリリカしか作ってなくね?"
    },
    {
      "speechId": 134,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1066625,
      "sourceEndMs": 1074728,
      "text": "フォーク系を選択してフォーク系?"
    },
    {
      "speechId": 135,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1074728,
      "sourceEndMs": 1076449,
      "text": "やばい!"
    },
    {
      "speechId": 136,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1076449,
      "sourceEndMs": 1078770,
      "text": "なにこれ!"
    },
    {
      "speechId": 137,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1078770,
      "sourceEndMs": 1079410,
      "text": "フォークか?"
    },
    {
      "speechId": 138,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1081082,
      "sourceEndMs": 1083804,
      "text": "フォークか?"
    },
    {
      "speechId": 139,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1083804,
      "sourceEndMs": 1087006,
      "text": "フォークからのフォーク?"
    },
    {
      "speechId": 140,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1087006,
      "sourceEndMs": 1092229,
      "text": "これフォークからのフォーク?"
    },
    {
      "speechId": 141,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1092229,
      "sourceEndMs": 1095091,
      "text": "粉落としの粉落としのパクる?"
    },
    {
      "speechId": 142,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1095091,
      "sourceEndMs": 1098593,
      "text": "粉落としでリリカがやってたのと全く同じの作ればいいんじゃない?"
    },
    {
      "speechId": 143,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1098593,
      "sourceEndMs": 1104637,
      "text": "パクんな全く同じの作ればいいんじゃないの?"
    },
    {
      "speechId": 144,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1104637,
      "sourceEndMs": 1109720,
      "text": "リリカの真似して作ろうフォークからのフォークで"
    },
    {
      "speechId": 145,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1113054,
      "sourceEndMs": 1134218,
      "text": "フブちゃんっぽいテイスト入れて名前だけフブちゃんっぽくすればええやろそんな中身は粉落としだけど名前だけ白髪っぽくすればええやん"
    },
    {
      "speechId": 146,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1140130,
      "sourceEndMs": 1159536,
      "text": "ふわふわしっぽのごぼう星やごぼう星しっごぼう星ふわふわしっぽごぼう星シューティングスターエフェクトから考えようえ、え、え、え、これ?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
