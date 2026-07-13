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
    "windowId": "window_026_YE-faluP7zY",
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
      "speechId": 471,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3181130,
      "sourceEndMs": 3197098,
      "text": "しし肉あ、ごめんなさい焼いてなかったわもうしっかりしてくれよごめんなさいあなたお前がちゃんとしないと子供に示しがつかないだろ見て!"
    },
    {
      "speechId": 472,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3197098,
      "sourceEndMs": 3198258,
      "text": "マリン見てこれ!"
    },
    {
      "speechId": 473,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3198258,
      "sourceEndMs": 3198959,
      "text": "すごいよ!"
    },
    {
      "speechId": 474,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3198959,
      "sourceEndMs": 3201080,
      "text": "バーベキューだ!"
    },
    {
      "speechId": 475,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3201080,
      "sourceEndMs": 3205402,
      "text": "奇跡じゃんガチの!"
    },
    {
      "speechId": 476,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3205402,
      "sourceEndMs": 3209684,
      "text": "これ回復量絶対えげつないからお腹がホキで空いてる時だけで食べてるの歩かないでちょっとそこ"
    },
    {
      "speechId": 477,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3211310,
      "sourceEndMs": 3238642,
      "text": "ごめんぬやりやがったやめて汚いね俺だって疲れてんだよ疲れてるなら寝なさいよじゃあなんでバーベキューの網の上歩くのよやめて汚いお前には分からないお前には分からないだろうな俺くらいやってないと分からないだろうな何をだよ働きを働いてるのね俺ほどの働きをしてないとお前には分からないだろうな一生分からないわごめんなさいね"
    },
    {
      "speechId": 478,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3240846,
      "sourceEndMs": 3241707,
      "text": "なんだっけ?"
    },
    {
      "speechId": 479,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3241707,
      "sourceEndMs": 3243147,
      "text": "何をしようとしたんだっけ?"
    },
    {
      "speechId": 480,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3243147,
      "sourceEndMs": 3252153,
      "text": "ごはん食べたいなぁ焼けないかなぁ裏返したくなるよねこれね確かにこんなことしてる場合じゃなかったわごはん確かになくなりそうだこれでしょ?"
    },
    {
      "speechId": 481,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3252153,
      "sourceEndMs": 3269924,
      "text": "とりあえず冷静にいやーちょっとあれかイノシシやるかそうだねやっぱイノシシねえマーリン何よ見てえーイノスケじゃんねずことイノスケちゃたせな"
    },
    {
      "speechId": 482,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3270262,
      "sourceEndMs": 3273863,
      "text": "行くぞ!"
    },
    {
      "speechId": 483,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3273863,
      "sourceEndMs": 3278425,
      "text": "炭治郎!"
    },
    {
      "speechId": 484,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3278425,
      "sourceEndMs": 3279045,
      "text": "マリン、いいの?"
    },
    {
      "speechId": 485,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3279045,
      "sourceEndMs": 3279325,
      "text": "これ?"
    },
    {
      "speechId": 486,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3279325,
      "sourceEndMs": 3279926,
      "text": "マリンかぶる?"
    },
    {
      "speechId": 487,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3279926,
      "sourceEndMs": 3282927,
      "text": "これ?"
    },
    {
      "speechId": 488,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3282927,
      "sourceEndMs": 3283867,
      "text": "せいちゃん、じゃあねずこよ。"
    },
    {
      "speechId": 489,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3283867,
      "sourceEndMs": 3287408,
      "text": "え、それさ、待ってねずことさ、それって共存してる?"
    },
    {
      "speechId": 490,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3287408,
      "sourceEndMs": 3290589,
      "text": "共存できない!"
    },
    {
      "speechId": 491,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3290589,
      "sourceEndMs": 3292350,
      "text": "お前はこっちを使うんだ!"
    },
    {
      "speechId": 492,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3306889,
      "sourceEndMs": 3307710,
      "text": "あははは!"
    },
    {
      "speechId": 493,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3338034,
      "sourceEndMs": 3338916,
      "text": "どっちがいい?"
    },
    {
      "speechId": 494,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3338916,
      "sourceEndMs": 3339658,
      "text": "伊之助がいい?"
    },
    {
      "speechId": 495,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3339658,
      "sourceEndMs": 3342545,
      "text": "これちょっと待って今泣いてるからちょっと待って"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
