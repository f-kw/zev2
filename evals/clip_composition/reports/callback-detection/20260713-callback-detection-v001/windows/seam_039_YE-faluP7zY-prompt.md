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
    "windowId": "seam_039_YE-faluP7zY",
    "windowKind": "seam_bridge",
    "sourceVideoId": "YE-faluP7zY"
  },
  "targets": [
    {
      "targetId": "YE-faluP7zY-candidate-58",
      "title": "置き去りにされそうになって焦る戌神ころね",
      "reason": "マリン船長が移動する中で、置き去りにされそうになったころねが「犬かきで行く」と可愛く宣言した直後、どんどん距離が離れていって絶叫する見どころのある展開になっているため。",
      "reactionEvidence": {
        "sourceVideoId": "YE-faluP7zY",
        "speechIds": [
          927,
          928,
          929,
          930,
          931
        ],
        "segments": [
          {
            "speechId": 927,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6300522,
            "sourceEndMs": 6328283,
            "text": "で、大区画のあ、蝶津貝もいるのかちょっと下に潜って探すねありがとうどうしよう、どんどんこの隙に移動しててさコーネが置き去りにされていてしまったらば置き去りにされたらコーネはでも犬かけにそっちまで行くねなかわいいかわいい!"
          },
          {
            "speechId": 928,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6328283,
            "sourceEndMs": 6328883,
            "text": "届きましたよ!"
          },
          {
            "speechId": 929,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6332538,
            "sourceEndMs": 6335759,
            "text": "そういうとこがね、好きなんだねえ、やだぁ?"
          },
          {
            "speechId": 930,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6335759,
            "sourceEndMs": 6336419,
            "text": "んん?"
          },
          {
            "speechId": 931,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6336419,
            "sourceEndMs": 6361383,
            "text": "待て待て、めっちゃwwwこ、こね、どんどん離れていってるwwwまねぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇでも、ほんと?"
          }
        ]
      }
    },
    {
      "targetId": "YE-faluP7zY-candidate-84",
      "title": "間違えてテーブルを量産してしまう宝鐘マリン",
      "reason": "別の高いテーブルを作ろうとするも再びローテーブルを作ってしまい、最終的に正解のテーブルを見つけるが大量に余ったテーブルの処理に困るオチがついているため。",
      "reactionEvidence": {
        "sourceVideoId": "YE-faluP7zY",
        "speechIds": [
          1647,
          1648,
          1649,
          1650,
          1651
        ],
        "segments": [
          {
            "speechId": 1647,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11062309,
            "sourceEndMs": 11068992,
            "text": "粘土返せになるよいや粘土粘土は大ヒロ低いか"
          },
          {
            "speechId": 1648,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11070330,
            "sourceEndMs": 11074092,
            "text": "でかいやつこれなら絶対これは大丈夫でしょ?"
          },
          {
            "speechId": 1649,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11074092,
            "sourceEndMs": 11078154,
            "text": "これもローテーブルだったらもうさあねえ小せえ!"
          },
          {
            "speechId": 1650,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11078154,
            "sourceEndMs": 11082476,
            "text": "もううぜえマジで待ってこれじゃない?"
          },
          {
            "speechId": 1651,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11082476,
            "sourceEndMs": 11098463,
            "text": "上に物を置くテーブルうわこっちだわ完全こっちねえいっぱいテーブル作っちゃったそれさなんかウェディングケーキみたいに重ねられないの?"
          }
        ]
      }
    }
  ],
  "sourceSegments": [
    {
      "speechId": 778,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5225398,
      "sourceEndMs": 5231500,
      "text": "ごめんねごめんね縁目だからちゃんと読んできた縁目今日の縁目縁目?"
    },
    {
      "speechId": 779,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5231500,
      "sourceEndMs": 5234981,
      "text": "縁目なんてあった?"
    },
    {
      "speechId": 780,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5234981,
      "sourceEndMs": 5236381,
      "text": "あ、待ってそれも演技か?"
    },
    {
      "speechId": 781,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5236381,
      "sourceEndMs": 5244903,
      "text": "マリンやったなぁねぇもう伝わってよマジついでなぁ今日絡みづらい?"
    },
    {
      "speechId": 782,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5244903,
      "sourceEndMs": 5249964,
      "text": "ちょっとやばいかもでもちょっとねあの絡みづらいのは伊之助の時は本当にねあのマジ"
    },
    {
      "speechId": 783,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5250620,
      "sourceEndMs": 5259163,
      "text": "いのすけ限定やんそれその時はね本当に死ぬと思ったね命も覚悟した船長本当に?"
    },
    {
      "speechId": 784,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5259163,
      "sourceEndMs": 5279310,
      "text": "まあでも死ななくてよかったねこっちが死にそうですなんなんなんどうした急にサメが来たから地道に泳いでるよしよしよし逃げれた逃げれたサメの餌作ってちょっとあれやりたいけどなもったいないんだよなそんなやつのためにクソがよどういう感情それ"
    },
    {
      "speechId": 785,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5280554,
      "sourceEndMs": 5283936,
      "text": "で、これ作ったやつ…あ、これもしかして斧で?"
    },
    {
      "speechId": 786,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5283936,
      "sourceEndMs": 5284357,
      "text": "どれ?"
    },
    {
      "speechId": 787,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5284357,
      "sourceEndMs": 5284977,
      "text": "斧?"
    },
    {
      "speechId": 788,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5284977,
      "sourceEndMs": 5287619,
      "text": "あ、斧で壊せるじゃん!"
    },
    {
      "speechId": 789,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5287619,
      "sourceEndMs": 5288399,
      "text": "何を?"
    },
    {
      "speechId": 790,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5288399,
      "sourceEndMs": 5289900,
      "text": "あ、あ、作ったやつ?"
    },
    {
      "speechId": 791,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5289900,
      "sourceEndMs": 5299307,
      "text": "うん、これは気づきでしたはい、すごーいおめでとうあ、へぇーえ、天井高くする?"
    },
    {
      "speechId": 792,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5299307,
      "sourceEndMs": 5302869,
      "text": "そうなったら…あ、でも、なんか大変じゃない?"
    },
    {
      "speechId": 793,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5302869,
      "sourceEndMs": 5305131,
      "text": "そう、なんか壊して作るの大変じゃない?"
    },
    {
      "speechId": 794,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5305131,
      "sourceEndMs": 5309614,
      "text": "材料がちょっと減ってる感じする、元よりね、なんかここだけ粗いけど何?"
    },
    {
      "speechId": 795,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5310822,
      "sourceEndMs": 5320109,
      "text": "だから、材料が足りないからあ、あ、あ、そうだ、同じこと、何回も強制で、強制!"
    },
    {
      "speechId": 796,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5320109,
      "sourceEndMs": 5337362,
      "text": "次言わせたらマジで、ガタガタ言わせるからなやばいやばいやばいよこれ、どうしようご機嫌そこにいちゃったわで、ここにもあれつけたいなOKここ無理なのかな?"
    },
    {
      "speechId": 797,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5337362,
      "sourceEndMs": 5338002,
      "text": "ちょっと、素材が足りないのかな?"
    },
    {
      "speechId": 798,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5338002,
      "sourceEndMs": 5339944,
      "text": "あれ、ここ無理なのかな?"
    },
    {
      "speechId": 799,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5341314,
      "sourceEndMs": 5341775,
      "text": "あれかな?"
    },
    {
      "speechId": 800,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5341775,
      "sourceEndMs": 5343575,
      "text": "柱がないからか?"
    },
    {
      "speechId": 801,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5343575,
      "sourceEndMs": 5350698,
      "text": "ちょっと階層集めてきまーすあ、ナイスーこれでどうだ?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
