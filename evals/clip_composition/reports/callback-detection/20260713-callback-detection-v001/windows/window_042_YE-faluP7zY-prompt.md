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
    "windowId": "window_042_YE-faluP7zY",
    "windowKind": "primary",
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
      "speechId": 834,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5593073,
      "sourceEndMs": 5605881,
      "text": "なんでなんちゅうこと今、頬開いてやったからよ感謝しろよなぁよし、進み始めた?"
    },
    {
      "speechId": 835,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5605881,
      "sourceEndMs": 5607402,
      "text": "ん?"
    },
    {
      "speechId": 836,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5607402,
      "sourceEndMs": 5608963,
      "text": "進んでるこれ?"
    },
    {
      "speechId": 837,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5608963,
      "sourceEndMs": 5609183,
      "text": "あれ?"
    },
    {
      "speechId": 838,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5609183,
      "sourceEndMs": 5609944,
      "text": "すでに進んでるよ"
    },
    {
      "speechId": 839,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5610114,
      "sourceEndMs": 5639964,
      "text": "逆でしたと向きが逆でしたおいおい何やってんだおんじゃんお前がやれよ泣くぞ泣くぞぐずってるぐずってる早く泣けよ泣くまでが長いでまだぐすぐすしてるあれ?"
    },
    {
      "speechId": 840,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5641350,
      "sourceEndMs": 5648235,
      "text": "もう遅いよもういつまでグズってんだよあれ進まないんだけどおかしくない?"
    },
    {
      "speechId": 841,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5648235,
      "sourceEndMs": 5669490,
      "text": "なんかやっぱパドルの出番ってわけよこれがおかしいなぁ向きは合ってると思うんだけどねちょっと待ってなぁパドルでこくから今行けパドルでやった方がいいと思うんだよね待っちょ待っちょ"
    },
    {
      "speechId": 842,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5671582,
      "sourceEndMs": 5672062,
      "text": "進んでる?"
    },
    {
      "speechId": 843,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5672062,
      "sourceEndMs": 5676266,
      "text": "これであ、進んだ進んだ進んだ!"
    },
    {
      "speechId": 844,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5676266,
      "sourceEndMs": 5686333,
      "text": "ほらよ、感謝しな壊れたわぬるっと壊れたね、今壊れたわパドルいいじゃん、これあ、でも移動してる?"
    },
    {
      "speechId": 845,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5686333,
      "sourceEndMs": 5688435,
      "text": "これもういいかな?"
    },
    {
      "speechId": 846,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5688435,
      "sourceEndMs": 5689396,
      "text": "逆、方が逆向きなのかな?"
    },
    {
      "speechId": 847,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5689396,
      "sourceEndMs": 5690517,
      "text": "あー!"
    },
    {
      "speechId": 848,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5690517,
      "sourceEndMs": 5699584,
      "text": "方外したらまた戻っちゃった待って、パドル作るわ、ちょっともう方いいかなと思ってさごめんね、ソーリーいいよ"
    },
    {
      "speechId": 849,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5700502,
      "sourceEndMs": 5727982,
      "text": "もっかいつけまーすはーいあーどっこいしょとそっかこんな止まっちゃうんだねすぐねこうよいやーほんとありがてありがてありがとねてっきりもういいのかと思ってさちょっと木終わる木の対策にねここでねヤシの木の栽培をね始めていきたいと思いまーすありがとございまーすえっとじゃあヤシの種種種種種種ある?"
    },
    {
      "speechId": 850,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5727982,
      "sourceEndMs": 5729864,
      "text": "ありますよー種どっかで"
    },
    {
      "speechId": 851,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5732991,
      "sourceEndMs": 5735231,
      "text": "マリリン、さっきジャガイモ焼いてた?"
    },
    {
      "speechId": 852,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5735231,
      "sourceEndMs": 5739913,
      "text": "あ、焼いたー焼けたからさ、これいる?"
    },
    {
      "speechId": 853,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5739913,
      "sourceEndMs": 5744414,
      "text": "あ、コーネ食べたければ食べてもいいよあ、いいよ、コーネにお魚あるからねあんた?"
    },
    {
      "speechId": 854,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5744414,
      "sourceEndMs": 5756917,
      "text": "じゃあ貰うわほらあ、そっかはい見せびらかしてたわ、今うんごめんね気づきちゃう進んでる?"
    },
    {
      "speechId": 855,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5756917,
      "sourceEndMs": 5758878,
      "text": "これあ、進んでないな、これ進んない?"
    },
    {
      "speechId": 856,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5767379,
      "sourceEndMs": 5772220,
      "text": "逆だったん?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
