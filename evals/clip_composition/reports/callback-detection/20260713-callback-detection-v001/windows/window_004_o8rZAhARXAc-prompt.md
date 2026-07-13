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
    "windowId": "window_004_o8rZAhARXAc",
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
      "speechId": 102,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 691430,
      "sourceEndMs": 716450,
      "text": "ふぶちゃんはふぶちゃんは変化球が微妙だって噂だったのうんふぶちゃんは変化球が微妙だって噂になってたうんそう彼らはフォークがいいからフォークでいいじゃんっていう感じだよねふぶキング一択かね"
    },
    {
      "speechId": 103,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 720598,
      "sourceEndMs": 749700,
      "text": "だから星が増えて世界大会も有利にかといってそんな強い弾ねえ強い子につけた方がいいに決まってるかさすがに強い人につけた方がいいに決まってるかラオーラはねラオーラそうラオーラ微妙なんだよねラオーラは変化球が微妙だと話題なんだけど"
    },
    {
      "speechId": 104,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 750698,
      "sourceEndMs": 779920,
      "text": "それにしてもラオーラはもうコントロールもスタミナもないからちょっと変化球覚えさせたとてコントロールもスタミナも磨かないと一瞬投げてすぐ終わりになっちゃうかもって感じラオーラはコントロールも上げなきゃいけないしスタミナもないからあのーいざ実戦で使おうって時にスタミナが全然なくてせっかく強いオリジナル球種を覚えさせたにも関わらずなんか全然投げる"
    },
    {
      "speechId": 105,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 780334,
      "sourceEndMs": 809900,
      "text": "速攻沈んでいくみたいな感じになんのかなぁいやどうなんだろわからんわマジでどっちなんだフブちゃん以外の方が絶対にいい2年目のフブちゃんはもう間に合わんやばいどっちちょマジわからんのだがちょマジでわからんえマジでわからんえ待ってアンケートかこれさすがにオリジオリジオリジナル変化球誰がやるもうフブちゃんとフブちゃん以外にしろ"
    },
    {
      "speechId": 106,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 810822,
      "sourceEndMs": 829013,
      "text": "この世の中はフブちゃんとフブちゃん以外うんで、じゃあその待ち時間にこの結果の待ち時間に弾作るか弾作りに行くかえ、自分で作んの?"
    },
    {
      "speechId": 107,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 829013,
      "sourceEndMs": 832255,
      "text": "え、作ったことないんだけどわかんないよどうやって作ればいいの?"
    },
    {
      "speechId": 108,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 832255,
      "sourceEndMs": 834817,
      "text": "一旦セーブして終了ってこと?"
    },
    {
      "speechId": 109,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 834817,
      "sourceEndMs": 836658,
      "text": "弾ってどうやって作るの?"
    },
    {
      "speechId": 110,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 836658,
      "sourceEndMs": 839900,
      "text": "こんなこと生まれて初めてこんなのって生まれて"
    },
    {
      "speechId": 111,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 840358,
      "sourceEndMs": 864566,
      "text": "初めてだわどうしたらいいのわかんないわ一旦セーブな絶対セーブして終了してタイトルに戻ればあるどれかしら英館9の中かしらあっこれじゃない新旧種開発これか"
    },
    {
      "speechId": 112,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 872562,
      "sourceEndMs": 876084,
      "text": "え、じゃあ粉落としってさリリカが考えたの?"
    },
    {
      "speechId": 113,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 876084,
      "sourceEndMs": 878566,
      "text": "あれリリカが考えた弾だったの?"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
