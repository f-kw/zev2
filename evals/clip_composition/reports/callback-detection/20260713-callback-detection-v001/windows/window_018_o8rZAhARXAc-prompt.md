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
    "windowId": "window_018_o8rZAhARXAc",
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
      "speechId": 535,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5406072,
      "sourceEndMs": 5407133,
      "text": "あ、そっか外野か!"
    },
    {
      "speechId": 536,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5407133,
      "sourceEndMs": 5408914,
      "text": "外野か!"
    },
    {
      "speechId": 537,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5408914,
      "sourceEndMs": 5411776,
      "text": "ゆくゆくは外野か!"
    },
    {
      "speechId": 538,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5411776,
      "sourceEndMs": 5428006,
      "text": "確かにゆくゆく外野の可能性あるから総力上げとくべきか外野に、そう外野がいないもんね他にね秋の、秋も見据えて秋も見据えていくか"
    },
    {
      "speechId": 539,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5431558,
      "sourceEndMs": 5436902,
      "text": "で、ビブ…が…あ、ビブどこに?"
    },
    {
      "speechId": 540,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5436902,
      "sourceEndMs": 5439124,
      "text": "あれ、ビブどこやらせば?"
    },
    {
      "speechId": 541,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5439124,
      "sourceEndMs": 5444508,
      "text": "あれ、ビブどっか取ったんだ、そうだどっか取った、3…あ、そうだ、違う、あれだファーストか?"
    },
    {
      "speechId": 542,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5444508,
      "sourceEndMs": 5459920,
      "text": "ファーストやらせるんだ、ビブにはビブファーストやる予定ビブはファーストやる予定で、で、ファーストが…一旦、ミート…D…総力Eで…"
    },
    {
      "speechId": 543,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5460382,
      "sourceEndMs": 5489380,
      "text": "ファーストだからミート総力もDに乗せミート一旦ミートCにしてから総力Cでも目指すの予定で本田くんは"
    },
    {
      "speechId": 544,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5491367,
      "sourceEndMs": 5519920,
      "text": "はもうBでいいからパワーでもやっとくかでシオリンがシオリンがサードでえーと守備力これ守備力Gだったのかなそれとも守備Eを"
    },
    {
      "speechId": 545,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5520002,
      "sourceEndMs": 5547270,
      "text": "目指したいのかこれ一旦守備E目指してうーんそうだねそれからミート塗装力に振っていくか一旦E目指してそれからミート塗装力にするかでプレアちゃんがミートででアマノくんはこれミートBまで上げた方がいいかしら"
    },
    {
      "speechId": 546,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5561304,
      "sourceEndMs": 5577514,
      "text": "うんうんうんうんうんミートデイかコロネがちょっと弾をねもう3回くらいポロってるの見ちゃってもしかして補給上げた方がいいのか?"
    },
    {
      "speechId": 547,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5577514,
      "sourceEndMs": 5577874,
      "text": "になってきた"
    },
    {
      "speechId": 548,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5587898,
      "sourceEndMs": 5609094,
      "text": "あれはもう運だと思って運だと思っとくかほなまあそしたら一旦ミートでいいかBまで来たしうん"
    },
    {
      "speechId": 549,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5611014,
      "sourceEndMs": 5612535,
      "text": "呼吸はSでも落とす?"
    },
    {
      "speechId": 550,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5612535,
      "sourceEndMs": 5613196,
      "text": "演出?"
    },
    {
      "speechId": 551,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5613196,
      "sourceEndMs": 5620322,
      "text": "うんまあうんと思って一旦MeetBとかでもめがけるかじゃあ…にしとくか!"
    },
    {
      "speechId": 552,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5620322,
      "sourceEndMs": 5622784,
      "text": "とりあえずね?"
    },
    {
      "speechId": 553,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5622784,
      "sourceEndMs": 5624605,
      "text": "ですかね?"
    },
    {
      "speechId": 554,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5624605,
      "sourceEndMs": 5637456,
      "text": "はいって感じで体力…体力はカスなんだけどまあいいかお食事会来いこれでいきますかとりあえずね?"
    },
    {
      "speechId": 555,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5637456,
      "sourceEndMs": 5639278,
      "text": "はいいきまーす"
    },
    {
      "speechId": 556,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5647638,
      "sourceEndMs": 5657966,
      "text": "さてうわー組み合わせ抽選会やだ怖いわーやだー監督組み合わせ抽選会に参加しませんか?"
    },
    {
      "speechId": 557,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5657966,
      "sourceEndMs": 5668494,
      "text": "どの学校も強豪校ばかりですが甲子園優勝を目指して対戦相手を確認しましょう行ってきます了解しましたでは会場に向かいましょう"
    },
    {
      "speechId": 558,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5671994,
      "sourceEndMs": 5672915,
      "text": "やばい!"
    },
    {
      "speechId": 559,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5672915,
      "sourceEndMs": 5682022,
      "text": "Aとかいるんだけどマリンが邪魔ですよねすいませんどきまーすやばくない?"
    },
    {
      "speechId": 560,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5682022,
      "sourceEndMs": 5688206,
      "text": "AってコヨリAに当たって勝てた?"
    },
    {
      "speechId": 561,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5688206,
      "sourceEndMs": 5688987,
      "text": "え?"
    },
    {
      "speechId": 562,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5688987,
      "sourceEndMs": 5690088,
      "text": "すごくない?"
    },
    {
      "speechId": 563,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5690088,
      "sourceEndMs": 5691308,
      "text": "Aに勝ったん?"
    },
    {
      "speechId": 564,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5691308,
      "sourceEndMs": 5698514,
      "text": "もう進みますかAに勝つってもうコヨリSってことじゃん"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
