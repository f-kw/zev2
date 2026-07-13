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
    "windowId": "window_063_YE-faluP7zY",
    "windowKind": "primary",
    "sourceVideoId": "YE-faluP7zY"
  },
  "targets": [
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
      "speechId": 1492,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9932704,
      "sourceEndMs": 9936626,
      "text": "なんかね、なんか誘われるのかなって感じだね誘え?"
    },
    {
      "speechId": 1493,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9936626,
      "sourceEndMs": 9950556,
      "text": "あちら側にやめていや、もはやもうあちら側なのかもしれない怖い怖い怖いここ何も入ってないじゃん何入れにしようかなこれ何入れにしたいの?"
    },
    {
      "speechId": 1494,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9950556,
      "sourceEndMs": 9958502,
      "text": "なんだろうマジで分からん何入れたらいいんだろう船長迷ってます"
    },
    {
      "speechId": 1495,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9960098,
      "sourceEndMs": 9966181,
      "text": "ここね何入れたらいいと思う?"
    },
    {
      "speechId": 1496,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9966181,
      "sourceEndMs": 9967061,
      "text": "どこ?"
    },
    {
      "speechId": 1497,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9967061,
      "sourceEndMs": 9968122,
      "text": "この真ん中真ん中?"
    },
    {
      "speechId": 1498,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9968122,
      "sourceEndMs": 9973724,
      "text": "でも上がベトベトでしょ?"
    },
    {
      "speechId": 1499,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9973724,
      "sourceEndMs": 9980728,
      "text": "一番下が一番下なんか統一感なくてもやるなご飯入れちゃう?"
    },
    {
      "speechId": 1500,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9980728,
      "sourceEndMs": 9988912,
      "text": "いっそのことここにご飯を一番上にしたい気持ちもあるけどなでも真ん中で一貫何も入ってないしな"
    },
    {
      "speechId": 1501,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9990194,
      "sourceEndMs": 9993135,
      "text": "あ、じゃあ移動しちゃおうもうこんだけならさっさとできる?"
    },
    {
      "speechId": 1502,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9993135,
      "sourceEndMs": 10013422,
      "text": "できるできるじゃあ上に入れちゃうよOK結構入れちゃうよいいよじゃがいも今焼いてるあ、焼いてないわ焼いてよし、もうちょっと釣ろうかやべ、水飲まなきゃ仮面仮面つついてみていい?"
    },
    {
      "speechId": 1503,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10013422,
      "sourceEndMs": 10016603,
      "text": "ちょっといいよいいよ気になる?"
    },
    {
      "speechId": 1504,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10016603,
      "sourceEndMs": 10019724,
      "text": "仮面どうなるのか"
    },
    {
      "speechId": 1505,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10020094,
      "sourceEndMs": 10020314,
      "text": "どうだったっけ?"
    },
    {
      "speechId": 1506,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10020314,
      "sourceEndMs": 10050000,
      "text": "やばい、待って海のヌシが来てる、やばいおらよーOKあ、ここ綺麗ナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナ"
    },
    {
      "speechId": 1507,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10050034,
      "sourceEndMs": 10054676,
      "text": "いいね食べ物入れハマグリって食べ物判定か?"
    },
    {
      "speechId": 1508,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10054676,
      "sourceEndMs": 10055376,
      "text": "何判定?"
    },
    {
      "speechId": 1509,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10055376,
      "sourceEndMs": 10064040,
      "text": "ハマグリって何なんだろうねいやでも美味しいよなハマグリってせいちゃんハマグリ食べたことない?"
    },
    {
      "speechId": 1510,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10064040,
      "sourceEndMs": 10078886,
      "text": "ないかもしんないもしかしたらハマグリホタテじゃないのアサリとかシジミなのかなそんなわけではないなにどういうこと?"
    },
    {
      "speechId": 1511,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10078886,
      "sourceEndMs": 10079446,
      "text": "全然わかんない"
    },
    {
      "speechId": 1512,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10080546,
      "sourceEndMs": 10082947,
      "text": "ハマグリの種類よ、ハマグリの種類種類?"
    },
    {
      "speechId": 1513,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10082947,
      "sourceEndMs": 10083748,
      "text": "貝じゃないの?"
    },
    {
      "speechId": 1514,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10083748,
      "sourceEndMs": 10083968,
      "text": "え?"
    },
    {
      "speechId": 1515,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10083968,
      "sourceEndMs": 10084168,
      "text": "え?"
    },
    {
      "speechId": 1516,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10084168,
      "sourceEndMs": 10086029,
      "text": "え?"
    },
    {
      "speechId": 1517,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10086029,
      "sourceEndMs": 10086129,
      "text": "え?"
    },
    {
      "speechId": 1518,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10086129,
      "sourceEndMs": 10088611,
      "text": "そのさ、シジミとかさ、アサリとかあるやんか?"
    },
    {
      "speechId": 1519,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10088611,
      "sourceEndMs": 10091333,
      "text": "あるあるあるあれと同じ漢字なのかな?"
    },
    {
      "speechId": 1520,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10091333,
      "sourceEndMs": 10098317,
      "text": "あ、分類的にね貝、貝、貝、貝じゃない、貝どうでもいいかねえ?"
    },
    {
      "speechId": 1521,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10098317,
      "sourceEndMs": 10109584,
      "text": "何急にどうしてどうでもいいかと思って作業しまーす働くねえ働きますよえっと、でも配置をちょっとね、いじりたいやっぱ真ん中に"
    },
    {
      "speechId": 1522,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10111819,
      "sourceEndMs": 10134315,
      "text": "ちょっとテーブルを置いて一瞬グリル外しちゃうねはーいそんそんそんそんそんあ、でも小規模グリル置いとくわ端っこにはーい家の外に小規模グリルとかあるんだあのサイズつくってたやつ?"
    },
    {
      "speechId": 1523,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10134315,
      "sourceEndMs": 10137998,
      "text": "はいはいはいはいはいあぶな一旦外に置いとくからこれをOK"
    },
    {
      "speechId": 1524,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10140822,
      "sourceEndMs": 10148466,
      "text": "了解ウォッチ了解ウォッチとか夏もうそれ誰も言わないよもうは?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
