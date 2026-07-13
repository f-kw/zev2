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
    "windowId": "window_013_o8rZAhARXAc",
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
      "speechId": 373,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4052862,
      "sourceEndMs": 4071314,
      "text": "カーブはそもそも飛びづらいからそんなに重さに振らなくていいってみんな言ってんだだから重さは減らしてよくて変化を上げて重さを下げて"
    },
    {
      "speechId": 374,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4081634,
      "sourceEndMs": 4094980,
      "text": "と、飛ぶ、飛ぶ、飛ば、なくて、あーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあー"
    },
    {
      "speechId": 375,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4096310,
      "sourceEndMs": 4105949,
      "text": "ちょっとな、なや、なや、悩んでてえっとーえっとーえっとーえっとーうーんとー"
    },
    {
      "speechId": 376,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4110482,
      "sourceEndMs": 4139500,
      "text": "分かんない分かんない分かんないなちょっと全然分かんないな重さ変化ブレーキ変化"
    },
    {
      "speechId": 377,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4142230,
      "sourceEndMs": 4160724,
      "text": "これがさっきやろうとしたやつがこれかさっきやろうとしたのがこれかじゃこれ、これがじゃこれが重く重さ削ったバージョンねどっちがいいと思う?"
    },
    {
      "speechId": 378,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4160724,
      "sourceEndMs": 4168490,
      "text": "重さ重さ重いやつと変化"
    },
    {
      "speechId": 379,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4170238,
      "sourceEndMs": 4185730,
      "text": "1増えるやつはい変化1増えるやつがこれブレーキは逆?"
    },
    {
      "speechId": 380,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4185730,
      "sourceEndMs": 4194998,
      "text": "そうかブレーキは逆かブレーキは逆効果投げてみて分かった投げるわ"
    },
    {
      "speechId": 381,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4200714,
      "sourceEndMs": 4207479,
      "text": "1でどれくらいかマジ分からんマリン的に見た目じゃちょっとよく分かんないこれだ!"
    },
    {
      "speechId": 382,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4207479,
      "sourceEndMs": 4212203,
      "text": "えいっおーなんかいいねーなんか知らんけど良さげー!"
    },
    {
      "speechId": 383,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4212203,
      "sourceEndMs": 4215045,
      "text": "強そう!"
    },
    {
      "speechId": 384,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4215045,
      "sourceEndMs": 4226753,
      "text": "強そうですこれうんこれ強そうなんか強そうです!"
    },
    {
      "speechId": 385,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4226753,
      "sourceEndMs": 4227534,
      "text": "うん!"
    },
    {
      "speechId": 386,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4232807,
      "sourceEndMs": 4259478,
      "text": "さらに下行ってる重いやつを見せるOKじゃあ重いバージョンがこれですいくよ重い方はこうだドスンと落ちていく感じがありますねはいどうでしょうかさっきとはまた違う"
    },
    {
      "speechId": 387,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4260438,
      "sourceEndMs": 4289960,
      "text": "同じにしか見えないけどまた違うこのドスンと落ちていくんですこれということで重いわーこれよりも重いは言うとりますということでさあ皆さんこんなに違うこの2球種果たしてどっちがいいかさあ決めてまいりましょうそれでは皆さん投票で"
    },
    {
      "speechId": 388,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4290554,
      "sourceEndMs": 4319580,
      "text": "いきますよ10987654321では締め切りますはい皆さんたくさんの投票どうもありがとうございましたということでこの変化球はこれでいきますこちらの"
    },
    {
      "speechId": 389,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4321194,
      "sourceEndMs": 4348170,
      "text": "重さを削った方でいこうと思いますはいちょっとマジでわかんないけどうーんまあこれでいいということでうーん意見もよう割れたはいじゃあこれでOKで作りたいと思います"
    },
    {
      "speechId": 390,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4350706,
      "sourceEndMs": 4379860,
      "text": "えー新旧宿発ボールをはいそしてスロットに登録はいします1時間1時間経っちゃったやばいこれで1時間経っちゃったこれ迷いすぎてすいませんどうも迷いましためっちゃはい迷いましためっちゃありがとうございましたでは行きたいと思いますこれをふぶちゃんに応募させます迷いに迷った末にもう誰に応募させるかどんな弾を作るかで非常に"
    },
    {
      "speechId": 391,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4381338,
      "sourceEndMs": 4408126,
      "text": "ましたがこれで行きたいと思います甲子園はお待たせしましたこれから甲子園です大変お待たせしました初めての出来事だったいやでもありがたいことやでこんな良さげなアイテムが出たってきたっていうのはじゃあオリジナル球種習得ボールってこれをフブちゃんに覚えさせてそしてフブちゃんに今からこれを一生懸命練習指示来てくれないとまずいでこれ"
    },
    {
      "speechId": 392,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4411310,
      "sourceEndMs": 4439900,
      "text": "練習指示来ないと厳しいねかなりうんあでも今コントロールアップしてんのがうん行きましょうふぶちゃんについに行っちゃいましょうはいスーパーノヴァ行きましょううおースーパーノヴァ覚えたスーパーノヴァ"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
