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
    "windowId": "window_017_o8rZAhARXAc",
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
      "speechId": 502,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5133036,
      "sourceEndMs": 5134336,
      "text": "ふぶさん来なかった?"
    },
    {
      "speechId": 503,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5134336,
      "sourceEndMs": 5148224,
      "text": "もう来なかったあ、止まる必要ないんだあ、オッケオッケ占い止まればいいあ、オッケオッケオッケ通過でいいあ、オッケオッケオッケえ、じゃあ普通にこれ3でさ普通に抽選会入ればいいの?"
    },
    {
      "speechId": 504,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5148224,
      "sourceEndMs": 5152426,
      "text": "普通に3で入ればいいの?"
    },
    {
      "speechId": 505,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5152426,
      "sourceEndMs": 5156388,
      "text": "これですか?"
    },
    {
      "speechId": 506,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5156388,
      "sourceEndMs": 5159130,
      "text": "5使った方がいいの?"
    },
    {
      "speechId": 507,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5159130,
      "sourceEndMs": 5159490,
      "text": "5でいい"
    },
    {
      "speechId": 508,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5160426,
      "sourceEndMs": 5165207,
      "text": "おう5のがいいのか?"
    },
    {
      "speechId": 509,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5165207,
      "sourceEndMs": 5170249,
      "text": "うん、5してよ、わかった5してるミートバッティングでいいの?"
    },
    {
      "speechId": 510,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5170249,
      "sourceEndMs": 5172549,
      "text": "あ、メントレでいいの?"
    },
    {
      "speechId": 511,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5172549,
      "sourceEndMs": 5180532,
      "text": "じゃあ、メン…あっメン…メンタル…メントレね、わかったいこう、あう!"
    },
    {
      "speechId": 512,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5180532,
      "sourceEndMs": 5181472,
      "text": "おうおうおうおう!"
    },
    {
      "speechId": 513,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5181472,
      "sourceEndMs": 5182552,
      "text": "メムラ!"
    },
    {
      "speechId": 514,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5182552,
      "sourceEndMs": 5184053,
      "text": "メムラお前、シャシャリ出てきてる!"
    },
    {
      "speechId": 515,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5184053,
      "sourceEndMs": 5188754,
      "text": "じゃ、ふぶちゃんを"
    },
    {
      "speechId": 516,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5190462,
      "sourceEndMs": 5219582,
      "text": "磨くにしてこのオリジナルを今から必死こいて磨いていく必死こいて磨いていく古川は持っといてラオーラは5、6、7、8スラーブ磨いとけばいいのかそのミムラ消えるよあ、このミムラ消えるミムラかそうか"
    },
    {
      "speechId": 517,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5220662,
      "sourceEndMs": 5230689,
      "text": "消えみむらか抽選会したら消えるかふふふふははははいうんふぶちゃん間違ってるまじかん?"
    },
    {
      "speechId": 518,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5230689,
      "sourceEndMs": 5230889,
      "text": "え?"
    },
    {
      "speechId": 519,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5230889,
      "sourceEndMs": 5231910,
      "text": "間違ってる?"
    },
    {
      "speechId": 520,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5231910,
      "sourceEndMs": 5249122,
      "text": "ちょっと待ってマリンが邪魔で見えないのかもこうですここにいるか"
    },
    {
      "speechId": 521,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5252294,
      "sourceEndMs": 5275972,
      "text": "はいえーと、ラオーラまでお乗せしていいよ、フィー7まで上げとくか雰囲気でうんうんうんえ、カエラはフォーク磨いてスババは総力Cあるからえ、肩とか上げとく?"
    },
    {
      "speechId": 522,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5275972,
      "sourceEndMs": 5278394,
      "text": "3年生だけどさ保守やってくから"
    },
    {
      "speechId": 523,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5282444,
      "sourceEndMs": 5288789,
      "text": "装備もあるし装備じゃない総力もCまでいったし肩でも上げとく?"
    },
    {
      "speechId": 524,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5288789,
      "sourceEndMs": 5293213,
      "text": "体力やばいほんまにそれないらない?"
    },
    {
      "speechId": 525,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5293213,
      "sourceEndMs": 5298977,
      "text": "そうかじゃあミートでいいか今更いらないかパワー?"
    },
    {
      "speechId": 526,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5298977,
      "sourceEndMs": 5304782,
      "text": "OKパワーにしよう総力さらに上乗せ?"
    },
    {
      "speechId": 527,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5304782,
      "sourceEndMs": 5308926,
      "text": "総力そうするかやるならパワー?"
    },
    {
      "speechId": 528,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5308926,
      "sourceEndMs": 5309106,
      "text": "そうか"
    },
    {
      "speechId": 529,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5311302,
      "sourceEndMs": 5321325,
      "text": "えーっと、アオくんが総力Cまで来てまあ、アオくん結局どこになるの?"
    },
    {
      "speechId": 530,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5321325,
      "sourceEndMs": 5339110,
      "text": "一旦外野の想定で育てていくかちょっと待って、マリンの育て、育てのやつ見るえっと、ホッシュがえっと、ホッシュがミートC総力C適当に目指すかまあ、ホッシュじゃないかも、外野かも外野だとしてもミートC総力C目指すでもミートにするわ一旦ミート"
    },
    {
      "speechId": 531,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5341318,
      "sourceEndMs": 5368630,
      "text": "C目指してどっちもC乗ったら次総力B目指すかうんチョコ先生がまぁショートはやらんやろなチョコ先生が保守の可能性高まってきたなアオくん総力Cまで来てるしまぁ見た見と"
    },
    {
      "speechId": 532,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5372844,
      "sourceEndMs": 5376766,
      "text": "おやまくんはミートでいいか"
    },
    {
      "speechId": 533,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5402050,
      "sourceEndMs": 5402830,
      "text": "あなたは?"
    },
    {
      "speechId": 534,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 5402830,
      "sourceEndMs": 5406072,
      "text": "総力?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
