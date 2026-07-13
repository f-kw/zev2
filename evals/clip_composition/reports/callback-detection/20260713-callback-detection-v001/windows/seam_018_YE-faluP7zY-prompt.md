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
    "windowId": "seam_018_YE-faluP7zY",
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
      "speechId": 287,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2040950,
      "sourceEndMs": 2042391,
      "text": "なんか変装してる。"
    },
    {
      "speechId": 288,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2042391,
      "sourceEndMs": 2044813,
      "text": "なりこの変装ってこういうこと?"
    },
    {
      "speechId": 289,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2044813,
      "sourceEndMs": 2046774,
      "text": "嘘やな!"
    },
    {
      "speechId": 290,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2046774,
      "sourceEndMs": 2048896,
      "text": "行くぞ!"
    },
    {
      "speechId": 291,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2048896,
      "sourceEndMs": 2049416,
      "text": "イノシシ!"
    },
    {
      "speechId": 292,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2049416,
      "sourceEndMs": 2050617,
      "text": "やろうよ!"
    },
    {
      "speechId": 293,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2050617,
      "sourceEndMs": 2052759,
      "text": "え、これだってでも害なさそうだぜ。"
    },
    {
      "speechId": 294,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2052759,
      "sourceEndMs": 2055081,
      "text": "とか言ってたらやられるよな。"
    },
    {
      "speechId": 295,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2055081,
      "sourceEndMs": 2059864,
      "text": "害ないからこそ逆に、これ長押しか?"
    },
    {
      "speechId": 296,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2059864,
      "sourceEndMs": 2061506,
      "text": "待って、めっちゃ速い。"
    },
    {
      "speechId": 297,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2061506,
      "sourceEndMs": 2062366,
      "text": "クソ難しい。"
    },
    {
      "speechId": 298,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2062366,
      "sourceEndMs": 2062666,
      "text": "こいつ速いな!"
    },
    {
      "speechId": 299,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2062666,
      "sourceEndMs": 2065709,
      "text": "こっちの方がいいのでは?"
    },
    {
      "speechId": 300,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2065709,
      "sourceEndMs": 2067810,
      "text": "ちょっとガバガバのエイムが。"
    },
    {
      "speechId": 301,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2070322,
      "sourceEndMs": 2071923,
      "text": "これ当たってるでもこれ当たってるとか?"
    },
    {
      "speechId": 302,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2071923,
      "sourceEndMs": 2076186,
      "text": "ほんとあれ回収できるよなんかうそ!"
    },
    {
      "speechId": 303,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2076186,
      "sourceEndMs": 2076987,
      "text": "これ当たってる?"
    },
    {
      "speechId": 304,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2076987,
      "sourceEndMs": 2080750,
      "text": "これなんか刺さってるよこっちで行く?"
    },
    {
      "speechId": 305,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2080750,
      "sourceEndMs": 2083372,
      "text": "鉛筆で行くわちょっと鉛筆?"
    },
    {
      "speechId": 306,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2083372,
      "sourceEndMs": 2091418,
      "text": "こっちの弓矢の方であ、普通にね確かにこいつだったらば普通にこれ!"
    },
    {
      "speechId": 307,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2091418,
      "sourceEndMs": 2097362,
      "text": "なんかやらされてる当たらないこれさ、これさ、小ヤギじゃないのこれ小ヤギ?"
    },
    {
      "speechId": 308,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2097362,
      "sourceEndMs": 2099744,
      "text": "ヤギいいねヤギ食べたいこれさ、倒したらさ"
    },
    {
      "speechId": 309,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2100342,
      "sourceEndMs": 2129864,
      "text": "やめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめて"
    },
    {
      "speechId": 310,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2138355,
      "sourceEndMs": 2140677,
      "text": "今晩はジンギスカンだな"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
