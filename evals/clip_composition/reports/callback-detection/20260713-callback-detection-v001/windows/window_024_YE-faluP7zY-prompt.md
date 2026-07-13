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
    "windowId": "window_024_YE-faluP7zY",
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
    },
    {
      "speechId": 432,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2907082,
      "sourceEndMs": 2908743,
      "text": "皮?"
    },
    {
      "speechId": 433,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2908743,
      "sourceEndMs": 2910000,
      "text": "皮とれたよ皮研究し"
    },
    {
      "speechId": 434,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2910166,
      "sourceEndMs": 2916151,
      "text": "あ、そうねそうね、何か作れるかもしれない新しいのねぇやっぱ鳥気になる、殺すえ、殺す?"
    },
    {
      "speechId": 435,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2916151,
      "sourceEndMs": 2929702,
      "text": "え、死んじゃおうよマリーン任せろあ、待って行っちゃったかも行っちゃったか、いや来たか、いや行っちゃったか、いや来たか入れちゃったかちょっと待ってこれ構えたさ矢をそっと下ろしたい時はどうすればいいと思う?"
    },
    {
      "speechId": 436,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2929702,
      "sourceEndMs": 2932605,
      "text": "スクロールはどう?"
    },
    {
      "speechId": 437,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2932605,
      "sourceEndMs": 2934566,
      "text": "あ、一回でもさ地面に寄ったら?"
    },
    {
      "speechId": 438,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2934566,
      "sourceEndMs": 2938310,
      "text": "回収できるし痛っ"
    },
    {
      "speechId": 439,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2941666,
      "sourceEndMs": 2942086,
      "text": "いいでしょ?"
    },
    {
      "speechId": 440,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2942086,
      "sourceEndMs": 2942486,
      "text": "すごいでしょ?"
    },
    {
      "speechId": 441,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2942486,
      "sourceEndMs": 2945307,
      "text": "ナイス?"
    },
    {
      "speechId": 442,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2945307,
      "sourceEndMs": 2945887,
      "text": "ナイス?"
    },
    {
      "speechId": 443,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2945887,
      "sourceEndMs": 2957851,
      "text": "見てトッポこの中がスカスカなのはトッポって言わないからね中吸ったんよ多分先にトッポの中身だけ吸う?"
    },
    {
      "speechId": 444,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2957851,
      "sourceEndMs": 2964493,
      "text": "でもさ、もしかしたらレンジでチーしたらさトッポで中身が全部なくなってさ空洞を食べれるんじゃない?"
    },
    {
      "speechId": 445,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2964493,
      "sourceEndMs": 2967093,
      "text": "もしかしてマジ?"
    },
    {
      "speechId": 446,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2967093,
      "sourceEndMs": 2969014,
      "text": "やってみるかじゃあやってみよう"
    },
    {
      "speechId": 447,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2970690,
      "sourceEndMs": 2999444,
      "text": "ちょっと我々を代表してリスナーの皆さんぜひ挑戦してみてくださいよろしくお願いしますえっと待って弓矢がねちょっと誤報になっちゃってあ、皮研究しようかじゃあしてしてしてしてー研究しまーすどうやって研究するんだっけなあ、これだなまた食われたーあれ、どこだっけなあ、こうだなちょっと待ってくださいねー"
    },
    {
      "speechId": 448,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3000738,
      "sourceEndMs": 3004881,
      "text": "めっちゃさ、食われるダメに?"
    },
    {
      "speechId": 449,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3004881,
      "sourceEndMs": 3009904,
      "text": "あのね、船が食われてます大丈夫?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
