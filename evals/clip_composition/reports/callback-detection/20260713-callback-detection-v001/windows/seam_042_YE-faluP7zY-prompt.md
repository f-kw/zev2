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
    "windowId": "seam_042_YE-faluP7zY",
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
    },
    {
      "speechId": 857,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5772220,
      "sourceEndMs": 5775261,
      "text": "逆でしたでもこれってさ船長が悪いと思う?"
    },
    {
      "speechId": 858,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5775261,
      "sourceEndMs": 5783643,
      "text": "ううんこのほうが悪いと思うねえ難しいあ、ここにあったげるちゃんいくよ?"
    },
    {
      "speechId": 859,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5783643,
      "sourceEndMs": 5787383,
      "text": "あら?"
    },
    {
      "speechId": 860,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5787383,
      "sourceEndMs": 5788664,
      "text": "見上げてるもう任せろよ"
    },
    {
      "speechId": 861,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5790578,
      "sourceEndMs": 5796179,
      "text": "コーネにはさぁ…こうかな?"
    },
    {
      "speechId": 862,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5796179,
      "sourceEndMs": 5796999,
      "text": "何笑ってんだよ!"
    },
    {
      "speechId": 863,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5796999,
      "sourceEndMs": 5797319,
      "text": "コーネ!"
    },
    {
      "speechId": 864,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5797319,
      "sourceEndMs": 5797899,
      "text": "コーネ!"
    },
    {
      "speechId": 865,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5797899,
      "sourceEndMs": 5798500,
      "text": "ほんとに!"
    },
    {
      "speechId": 866,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5798500,
      "sourceEndMs": 5798980,
      "text": "ほんとに!"
    },
    {
      "speechId": 867,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5798980,
      "sourceEndMs": 5800020,
      "text": "足しか引っ張れずに魚釣ります!"
    },
    {
      "speechId": 868,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5800020,
      "sourceEndMs": 5813083,
      "text": "マジで…あーごめんなさい頼むよ、犬神様…いや、頼まれよう頼まれよう…何笑ってんだよ!"
    },
    {
      "speechId": 869,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5813083,
      "sourceEndMs": 5820000,
      "text": "ごめんなさい…ごめんなさい…ごめんなさい…お魚…お魚釣って…お魚…よいしょ…お魚…お魚…お水入れて"
    },
    {
      "speechId": 870,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5821110,
      "sourceEndMs": 5824633,
      "text": "水遠いのだる水遠いのだるいな2個作る?"
    },
    {
      "speechId": 871,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5824633,
      "sourceEndMs": 5831798,
      "text": "2個いらないか水はでも割ってもいいかもね作るコスト的にそんな重くなければ2回にも作れば?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
