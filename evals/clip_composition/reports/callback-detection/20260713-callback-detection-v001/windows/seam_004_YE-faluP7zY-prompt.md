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
    "windowId": "seam_004_YE-faluP7zY",
    "windowKind": "seam_bridge",
    "sourceVideoId": "YE-faluP7zY"
  },
  "targets": [
    {
      "targetId": "YE-faluP7zY-candidate-12",
      "title": "食料不足の中で鳥を仕留めるころね",
      "reason": "ココナッツしか取れず食料がしけてきた状況で、ころねが見事に鳥を殺して肉を確保し、マリンが驚き喜ぶ展開が綺麗にまとまっているため。",
      "reactionEvidence": {
        "sourceVideoId": "YE-faluP7zY",
        "speechIds": [
          77,
          78,
          79,
          80,
          81,
          82,
          83
        ],
        "segments": [
          {
            "speechId": 77,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 810330,
            "sourceEndMs": 817353,
            "text": "えっとちょっと待ってココナッツしか取れねぇよ食料確かにちょっとしけてきたなあでも足りない?"
          },
          {
            "speechId": 78,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 817353,
            "sourceEndMs": 818634,
            "text": "しけしけになってきた?"
          },
          {
            "speechId": 79,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 818634,
            "sourceEndMs": 822236,
            "text": "ちょっと若干了解あ!"
          },
          {
            "speechId": 80,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 822236,
            "sourceEndMs": 823876,
            "text": "鳥殺した!"
          },
          {
            "speechId": 81,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 823876,
            "sourceEndMs": 824557,
            "text": "鳥殺したの?"
          },
          {
            "speechId": 82,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 824557,
            "sourceEndMs": 825157,
            "text": "食べれる?"
          },
          {
            "speechId": 83,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 825157,
            "sourceEndMs": 839584,
            "text": "食べれる食べれるちょっと待って鳥肉が絶対取れる食べてみて食べてみてOKOKOKOKちゃんと火通すんよOKあ、こんなとこでサメ肉3つあんじゃんラッキーラッキーラッキーじゃなくてラッキーとかじゃないねあ、サメ倒してたねそういえばね"
          }
        ]
      }
    },
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
      "speechId": 36,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 410102,
      "sourceEndMs": 414484,
      "text": "わからない誰の心みたい?"
    },
    {
      "speechId": 37,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 414484,
      "sourceEndMs": 415805,
      "text": "あったかいってこと?"
    },
    {
      "speechId": 38,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 415805,
      "sourceEndMs": 417406,
      "text": "なんかさ、こういう色じゃない?"
    },
    {
      "speechId": 39,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 417406,
      "sourceEndMs": 417946,
      "text": "私たちってさ"
    },
    {
      "speechId": 40,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 420358,
      "sourceEndMs": 438186,
      "text": "そうかもしれない悩んだそうなのそうだったかもしれねえナルト風のそうだったかもしれねえ朝になったんで皆さんに紹介していきたいと思いますこうねうろうろしてないであれをあげてくれよなどれ?"
    },
    {
      "speechId": 41,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 438186,
      "sourceEndMs": 449852,
      "text": "アンカー落としてるんだよね当然これ落としてる落としてる落としてるいきますよ飛び込んでったはいいきますよ"
    },
    {
      "speechId": 42,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 450034,
      "sourceEndMs": 461818,
      "text": "オラァイヨォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォ"
    },
    {
      "speechId": 43,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 482374,
      "sourceEndMs": 507883,
      "text": "まず紹介やってよ紹介誰がやるのこうなったらこちらの階段はテンテンテンテンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテー"
    },
    {
      "speechId": 44,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 511410,
      "sourceEndMs": 539932,
      "text": "床を強化素材に変えてみましたこうなったらば簡単にはサメに食われないだろうと思って付けたんですけれどもめちゃめちゃ資材を食う割にはガンガン壊れてしまい意外とそんなに良くなかったなっていう感じだよね遠い目をしてるそして2階を作ったんですけど一旦これ入り口のグッドティンなんていうか"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
