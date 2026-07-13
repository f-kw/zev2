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
    "windowId": "window_025_YE-faluP7zY",
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
      "speechId": 450,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3009904,
      "sourceEndMs": 3020432,
      "text": "大丈夫じゃないもう木がないから今探しに行くところ木が木じゃないね、そしたらねコーネがつまんないこと言うたびにさなんでそういうこと言うの?"
    },
    {
      "speechId": 451,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3020432,
      "sourceEndMs": 3025455,
      "text": "罰を与えたいよねねぇ、増えたよ?"
    },
    {
      "speechId": 452,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3025455,
      "sourceEndMs": 3026556,
      "text": "マリゾネス?"
    },
    {
      "speechId": 453,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3026556,
      "sourceEndMs": 3027416,
      "text": "なになになに?"
    },
    {
      "speechId": 454,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3027416,
      "sourceEndMs": 3029698,
      "text": "作れるのがね、蜂の巣蜂の巣?"
    },
    {
      "speechId": 455,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3030498,
      "sourceEndMs": 3033119,
      "text": "ハンモックバックパックえ?"
    },
    {
      "speechId": 456,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3033119,
      "sourceEndMs": 3034400,
      "text": "バックパック?"
    },
    {
      "speechId": 457,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3034400,
      "sourceEndMs": 3043724,
      "text": "それバックパックも作れるバックパックそれ需要しかないってあれバックパックあれどういうこと?"
    },
    {
      "speechId": 458,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3043724,
      "sourceEndMs": 3043964,
      "text": "ん?"
    },
    {
      "speechId": 459,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3043964,
      "sourceEndMs": 3059832,
      "text": "わからんこれあうんうんうん革のヘルメットとかボディアーマーとかも作れるえそれは熱いあと軟膏軟膏とかペイントブラシだってえめっちゃいいじゃんでも革2枚しかないからいっぱい取らなきゃねこれねやっぱりさ"
    },
    {
      "speechId": 460,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3060374,
      "sourceEndMs": 3063596,
      "text": "殺すしかないって殺す?"
    },
    {
      "speechId": 461,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3063596,
      "sourceEndMs": 3069038,
      "text": "あいつらをあの鳥もさ多分川を落とすんじゃない?"
    },
    {
      "speechId": 462,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3069038,
      "sourceEndMs": 3072540,
      "text": "鳥か鳥捕まえられるネットとかなかったっけ?"
    },
    {
      "speechId": 463,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3072540,
      "sourceEndMs": 3080503,
      "text": "あれか次はネットランチャーねごめん船長さ配信前にさどう考えてもトイレに行ったけどさどうしても我慢できずもう一回行っていい?"
    },
    {
      "speechId": 464,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3080503,
      "sourceEndMs": 3085986,
      "text": "いいよちょっと行ってくるね待っててねうんいちみさんの喋ってていい?"
    },
    {
      "speechId": 465,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3085986,
      "sourceEndMs": 3086726,
      "text": "ちょっとよろしく"
    },
    {
      "speechId": 466,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3097202,
      "sourceEndMs": 3119058,
      "text": "いってらっしゃいみちみさんこんにちは緊張しちゃうね2人だと2人じゃないけどいっぱいいっぱいいるけど2人きりだと緊張しちゃうねこれ待ってた方がいいのかなぁ食材がないなでも"
    },
    {
      "speechId": 467,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3120354,
      "sourceEndMs": 3149486,
      "text": "なんか落ちてるんだよここら辺に今日もかわいいねって言われちゃったマリゾネスかわいいって言われちゃったよ一味のみなさんにみんなではないけど一部に一味の一部にこれ全然面白くない全然面白くないんだけどあー待ってこれじゃあ食材が足りなくなっちゃうそうだなこれ釣りもしたいな一味の一部"
    },
    {
      "speechId": 468,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3150170,
      "sourceEndMs": 3173801,
      "text": "一味の一部一味しちみー一味の一部おけりよいしょはいあーこうねのソロ配信助かったな何もしないけどねこれさマリゾネスさこれさ止まってるときにさ魚で釣れないんだっけいや止まってても魚は釣れるあ釣れる?"
    },
    {
      "speechId": 469,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3173801,
      "sourceEndMs": 3179964,
      "text": "釣れるよ食材がさ多分どんどんなくなっちゃいそうでさこれさあー確かにそれあるな確かに?"
    },
    {
      "speechId": 470,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3180190,
      "sourceEndMs": 3181130,
      "text": "しし肉焼いてる?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
