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
    "windowId": "seam_023_YE-faluP7zY",
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
      "speechId": 403,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2803679,
      "sourceEndMs": 2805559,
      "text": "待て!"
    },
    {
      "speechId": 404,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2805559,
      "sourceEndMs": 2815803,
      "text": "気持ち悪いからついてこないで血を見ずにでも使ってなさい急に冷たくなっちゃって来ないね気持ち悪いわ照れているのかな?"
    },
    {
      "speechId": 405,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2815803,
      "sourceEndMs": 2819724,
      "text": "待てっておい待てちょ待てって"
    },
    {
      "speechId": 406,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2821638,
      "sourceEndMs": 2823639,
      "text": "キモい!"
    },
    {
      "speechId": 407,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2823639,
      "sourceEndMs": 2824019,
      "text": "キモい!"
    },
    {
      "speechId": 408,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2824019,
      "sourceEndMs": 2825059,
      "text": "キモい!"
    },
    {
      "speechId": 409,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2825059,
      "sourceEndMs": 2825559,
      "text": "キモい!"
    },
    {
      "speechId": 410,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2825559,
      "sourceEndMs": 2828840,
      "text": "キモい!"
    },
    {
      "speechId": 411,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2828840,
      "sourceEndMs": 2831401,
      "text": "キモい!"
    },
    {
      "speechId": 412,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2831401,
      "sourceEndMs": 2832181,
      "text": "キモい!"
    },
    {
      "speechId": 413,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2832181,
      "sourceEndMs": 2832741,
      "text": "キモい!"
    },
    {
      "speechId": 414,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2832741,
      "sourceEndMs": 2833261,
      "text": "キモい!"
    },
    {
      "speechId": 415,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2833261,
      "sourceEndMs": 2834442,
      "text": "キモい!"
    },
    {
      "speechId": 416,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2834442,
      "sourceEndMs": 2838323,
      "text": "キモい!"
    },
    {
      "speechId": 417,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2838323,
      "sourceEndMs": 2839283,
      "text": "キモい!"
    },
    {
      "speechId": 418,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2839283,
      "sourceEndMs": 2840364,
      "text": "キモい!"
    },
    {
      "speechId": 419,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2840364,
      "sourceEndMs": 2840524,
      "text": "キモい!"
    },
    {
      "speechId": 420,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2840524,
      "sourceEndMs": 2840764,
      "text": "キモい!"
    },
    {
      "speechId": 421,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2840764,
      "sourceEndMs": 2841604,
      "text": "キモい!"
    },
    {
      "speechId": 422,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2841604,
      "sourceEndMs": 2843765,
      "text": "キモい!"
    },
    {
      "speechId": 423,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2843765,
      "sourceEndMs": 2846385,
      "text": "キモい!"
    },
    {
      "speechId": 424,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2846385,
      "sourceEndMs": 2846926,
      "text": "キモい!"
    },
    {
      "speechId": 425,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2846926,
      "sourceEndMs": 2848146,
      "text": "キモい!"
    },
    {
      "speechId": 426,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2851182,
      "sourceEndMs": 2853043,
      "text": "お尻ぷりぷりしちゃおう!"
    },
    {
      "speechId": 427,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2853043,
      "sourceEndMs": 2853843,
      "text": "悔しいか?"
    },
    {
      "speechId": 428,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2853843,
      "sourceEndMs": 2878230,
      "text": "ぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷり�"
    },
    {
      "speechId": 429,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2890914,
      "sourceEndMs": 2893495,
      "text": "アリー当てた?"
    },
    {
      "speechId": 430,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2893495,
      "sourceEndMs": 2902720,
      "text": "戻ろうか分かったあきらめをあきらめの逃げあきらめも大事だよこれまぁやったしねシシは肉とれた?"
    },
    {
      "speechId": 431,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2902720,
      "sourceEndMs": 2907082,
      "text": "肉肉とれたよナイス皮もとれたじゃん皮皮もとれた?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
