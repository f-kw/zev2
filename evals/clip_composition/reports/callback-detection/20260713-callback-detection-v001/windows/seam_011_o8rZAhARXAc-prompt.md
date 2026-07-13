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
    "windowId": "seam_011_o8rZAhARXAc",
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
      "speechId": 333,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3438265,
      "sourceEndMs": 3439666,
      "text": "漢字じゃない!"
    },
    {
      "speechId": 334,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3439666,
      "sourceEndMs": 3440206,
      "text": "英語で行くか!"
    },
    {
      "speechId": 335,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3440206,
      "sourceEndMs": 3440407,
      "text": "英語で!"
    },
    {
      "speechId": 336,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3440407,
      "sourceEndMs": 3448674,
      "text": "1,2,3,4,5,6,7,8,9待って、9文字1,2,3これ、これいらない?"
    },
    {
      "speechId": 337,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3456229,
      "sourceEndMs": 3472798,
      "text": "英語英語英語入るかこうちゃんとググってちゃんとググって見てるから大丈夫間に腰入れる?"
    },
    {
      "speechId": 338,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3480150,
      "sourceEndMs": 3509840,
      "text": "ギリギリで草ギリギリすぎるだろこれぴったりだよこれぴったりどうかっこいいしどうですかぴったりふぶちゃんみこちが読めない読めるやろふぶちゃんの曲"
    },
    {
      "speechId": 339,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3511986,
      "sourceEndMs": 3520409,
      "text": "OKじゃあスーパーノヴァでもう一回投げてみよう"
    },
    {
      "speechId": 340,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3542099,
      "sourceEndMs": 3549262,
      "text": "いいかわいいいいのでは?"
    },
    {
      "speechId": 341,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3549262,
      "sourceEndMs": 3551303,
      "text": "これでいいのかな?"
    },
    {
      "speechId": 342,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3551303,
      "sourceEndMs": 3554885,
      "text": "キョウジいいと思う?"
    },
    {
      "speechId": 343,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3554885,
      "sourceEndMs": 3561748,
      "text": "意見大募集重さいらんえ、じゃあ重さなくして何あげんの?"
    },
    {
      "speechId": 344,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3561748,
      "sourceEndMs": 3566910,
      "text": "重さいるって言ってる人もいるんだけどマジわからんのだけど何を取ればいいんだこれ"
    },
    {
      "speechId": 345,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3570914,
      "sourceEndMs": 3599054,
      "text": "重さ削って重さ削って変化上げてほしい重さ削って変化上げピッタリになんないんだよな98になっちゃう98になっちゃうんだよな急速上げれば100になる"
    },
    {
      "speechId": 346,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3603458,
      "sourceEndMs": 3627422,
      "text": "下げる上げるどっちか上げるか下げるブレーキってなんだブレーキ上げこう"
    },
    {
      "speechId": 347,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3633294,
      "sourceEndMs": 3637975,
      "text": "お重さが一番いる?"
    },
    {
      "speechId": 348,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3637975,
      "sourceEndMs": 3645837,
      "text": "重さが一番いるの?"
    },
    {
      "speechId": 349,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3645837,
      "sourceEndMs": 3659620,
      "text": "えー待って待ってえーフォークだと重さが大切って感じでカーブだとそもそも調度が出にくい球種なので重さがあんまりいらないって感じですだって多分フォークの変化球種しかやったことないからみんな重さ重さって言ってんのかなじゃあ"
    },
    {
      "speechId": 350,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3663138,
      "sourceEndMs": 3685038,
      "text": "こうなるんだって間違えた、これストレートこうなるらしいカーブでも重さはいるってもう分からんなマジ分からんなもうこれ"
    },
    {
      "speechId": 351,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3690566,
      "sourceEndMs": 3719880,
      "text": "諸説ありすぎて喧嘩になってるから助けてマジでマジわからんこよりー助けてよーわかんないよーこよりこよりー助けてーこよりー迷う迷うなこれー教科書持ちのこよりー教科書"
    },
    {
      "speechId": 352,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3720278,
      "sourceEndMs": 3723159,
      "text": "こっちのコヨリー!"
    },
    {
      "speechId": 353,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3723159,
      "sourceEndMs": 3723879,
      "text": "助けてくれー!"
    },
    {
      "speechId": 354,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3723879,
      "sourceEndMs": 3737903,
      "text": "んーさっき配信終わった?"
    },
    {
      "speechId": 355,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3737903,
      "sourceEndMs": 3742444,
      "text": "ヤワンちゃん来てくれるかもしれんうんあもう当初強いから適当でいいよコヨリは教えてくれない!"
    },
    {
      "speechId": 356,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3742444,
      "sourceEndMs": 3743864,
      "text": "コヨリは教えてくれないんだ!"
    },
    {
      "speechId": 357,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3743864,
      "sourceEndMs": 3749206,
      "text": "でも確かにコヨリの言う通りコヨリがこう言ったからこうしたでマリンがそうしてさそれでなんか"
    },
    {
      "speechId": 358,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3750062,
      "sourceEndMs": 3779014,
      "text": "なんかそれで何かうまくいかないことがあった時にコメントがこよりがわざと弱いの教えたとか言ってそれでわやわや言われたらうざいからやめとこう確かに聞かんとこうんやめとこうんこよりがわざとなんか弱いの教えたとか言われたら鬱陶しいからやめよううんどうしようじゃあきまちと決めるわそうしよううんそれがいいきまちと一緒に決めるうん"
    },
    {
      "speechId": 359,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3781954,
      "sourceEndMs": 3794866,
      "text": "それがいいよし、じゃあ重さいる説、いらない説重さいる説、いらない説キャッチドーンキャッチ"
    },
    {
      "speechId": 360,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3813170,
      "sourceEndMs": 3816493,
      "text": "さっきのがベストだった?"
    },
    {
      "speechId": 361,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3816493,
      "sourceEndMs": 3822197,
      "text": "いらない派もいれば、いる派もいて、ちょっと欲しいと思っちゃう?"
    },
    {
      "speechId": 362,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 3822197,
      "sourceEndMs": 3837229,
      "text": "さっきのまんでいいのかもね最初にやろうとしてた100ピッタだったし100ピッタだったしね"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
