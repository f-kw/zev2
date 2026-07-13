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
    "windowId": "seam_045_YE-faluP7zY",
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
      "speechId": 911,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6180274,
      "sourceEndMs": 6203868,
      "text": "で、えーと、んーとじゃあここにヤシの木の大物、大規格の作物を何個、3個くらいあってもいいと思う人はーいカイコーネさんとはい、一味の皆さんはどう思われますか?"
    },
    {
      "speechId": 912,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6203868,
      "sourceEndMs": 6204789,
      "text": "君たちー?"
    },
    {
      "speechId": 913,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6204789,
      "sourceEndMs": 6205149,
      "text": "君たちー?"
    },
    {
      "speechId": 914,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6205149,
      "sourceEndMs": 6209932,
      "text": "はーい、だってあ、じゃあ3つくらい作り"
    },
    {
      "speechId": 915,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6210474,
      "sourceEndMs": 6213315,
      "text": "君たち意見を採用して差し上げましょう"
    },
    {
      "speechId": 916,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6241023,
      "sourceEndMs": 6249827,
      "text": "取ると言ってもありけりよ6個も使うのか釘ちょっと重てえな6個か釘?"
    },
    {
      "speechId": 917,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6249827,
      "sourceEndMs": 6252549,
      "text": "釘いっぱいなかったっけ?"
    },
    {
      "speechId": 918,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6252549,
      "sourceEndMs": 6268278,
      "text": "そっかここに待って釘いっぱいあるわ思い返してみると釘いっぱいあるどうしたどうしたハマったハマったごめんなさいハマってました今感じてた今ハマり散らかしてあついたねこれアンカーいらなくないこれほんと?"
    },
    {
      "speechId": 919,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6268278,
      "sourceEndMs": 6268698,
      "text": "もしにや"
    },
    {
      "speechId": 920,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6269270,
      "sourceEndMs": 6269657,
      "text": "とか言って"
    },
    {
      "speechId": 921,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6270000,
      "sourceEndMs": 6271020,
      "text": "どうする?"
    },
    {
      "speechId": 922,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6271020,
      "sourceEndMs": 6276563,
      "text": "あれ鉱石あんだってちょっと集めてくるわちょっとあれ船長?"
    },
    {
      "speechId": 923,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6276563,
      "sourceEndMs": 6276623,
      "text": "ん?"
    },
    {
      "speechId": 924,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6276623,
      "sourceEndMs": 6277023,
      "text": "待ってどうした?"
    },
    {
      "speechId": 925,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6277023,
      "sourceEndMs": 6287447,
      "text": "気のせいかサメに食われてるような気がしたんだすごいなサメに食われて自覚ないってやばいないやイカダの方だからさ自覚じゃあないじゃん?"
    },
    {
      "speechId": 926,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6287447,
      "sourceEndMs": 6299272,
      "text": "なるほどね次パートは失礼よかったよかった板もちょっと回収してここガラスも引っ張るじゃあこれで清浄機をちょっと一個作って"
    },
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
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
