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
    "windowId": "window_055_YE-faluP7zY",
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
      "speechId": 1235,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7891182,
      "sourceEndMs": 7892883,
      "text": "いらないものボックス作る前にOK?"
    },
    {
      "speechId": 1236,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7892883,
      "sourceEndMs": 7893523,
      "text": "いいよ?"
    },
    {
      "speechId": 1237,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7893523,
      "sourceEndMs": 7894063,
      "text": "いい?"
    },
    {
      "speechId": 1238,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7894063,
      "sourceEndMs": 7914530,
      "text": "今食ったよなよ1個あげる食べちまったよもうないの?"
    },
    {
      "speechId": 1239,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7914530,
      "sourceEndMs": 7919412,
      "text": "もうない乾杯"
    },
    {
      "speechId": 1240,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7920182,
      "sourceEndMs": 7948778,
      "text": "一人で食べまーすだってさ、い、い、い、いちいのししからさ、に、に、に、ににくしかとれないんだもんだっていちいのししからににく、なるほどそう、ににくしかとれないからーあれとろいけーいまね、サーモン焼いてっからうんサーモンいいねーでかいしなー3回くらい食べれるしえっと、じゃあここにー食べはね食われてるーえっと、で、どうしたいんだっけ"
    },
    {
      "speechId": 1241,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7953528,
      "sourceEndMs": 7979063,
      "text": "じゃあ船長の物もちょっと整理しないとか一回じゃあ鉱石君たちがなんて言ってたか忘れちゃったなあここがスクラップかここにじゃあスクラップちょっと入れてOK海の産物とかねあーいいねでも粘土と砂って海で取れるからさ海藻もここでいいか確かにあれは?"
    },
    {
      "speechId": 1242,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7979063,
      "sourceEndMs": 7979404,
      "text": "ん?"
    },
    {
      "speechId": 1243,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7979404,
      "sourceEndMs": 7979684,
      "text": "川は"
    },
    {
      "speechId": 1244,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7980118,
      "sourceEndMs": 7983079,
      "text": "皮皮?"
    },
    {
      "speechId": 1245,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7983079,
      "sourceEndMs": 8009832,
      "text": "あの、イノシシ倒したらもらえるやつさんああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ"
    },
    {
      "speechId": 1246,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8012414,
      "sourceEndMs": 8039724,
      "text": "ぬるっと流れてったからちょっとサクッと拾えちゃうってあーごめんそうなのねすぐそこだいいと思うよでもいいと思うそうねバックパック作ろうバックパックあればさもっと拾えて楽になるからじゃあ作るかと思ってよバックパックね今探してるバックパックがいいバックパックなんてなくねさっきでもさ"
    },
    {
      "speechId": 1247,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8045716,
      "sourceEndMs": 8060321,
      "text": "アルパカとかいるの?"
    },
    {
      "speechId": 1248,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8060321,
      "sourceEndMs": 8060781,
      "text": "アルパカ!"
    },
    {
      "speechId": 1249,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8070022,
      "sourceEndMs": 8075186,
      "text": "すごいね詳しいねみんな詳しいよねどうしてそんな詳しい?"
    },
    {
      "speechId": 1250,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8075186,
      "sourceEndMs": 8099026,
      "text": "あれ片付けてネバネバあっサーモン焼けた焼けたからこれこいつとこいつを焼くんだよあれ外したこれでこうだねな美味しく焼けますようにこれ外した箱って"
    },
    {
      "speechId": 1251,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8100258,
      "sourceEndMs": 8103439,
      "text": "回収できてるか?"
    },
    {
      "speechId": 1252,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8103439,
      "sourceEndMs": 8105039,
      "text": "できてない感じ?"
    },
    {
      "speechId": 1253,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8105039,
      "sourceEndMs": 8105219,
      "text": "あれ?"
    },
    {
      "speechId": 1254,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8105219,
      "sourceEndMs": 8107339,
      "text": "さっき一個外した気がするんだけどあれ?"
    },
    {
      "speechId": 1255,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8107339,
      "sourceEndMs": 8111900,
      "text": "葉っぱはどこだっけ?"
    },
    {
      "speechId": 1256,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8111900,
      "sourceEndMs": 8122202,
      "text": "葉っぱここかほらよアイコーンにさっきさ、勉強したけどな材料が足りん?"
    },
    {
      "speechId": 1257,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8122202,
      "sourceEndMs": 8125263,
      "text": "でもあ、あれじゃない?"
    },
    {
      "speechId": 1258,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8125263,
      "sourceEndMs": 8125803,
      "text": "こっちまでな?"
    },
    {
      "speechId": 1259,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8125803,
      "sourceEndMs": 8126023,
      "text": "うんあ、ほんとだ!"
    },
    {
      "speechId": 1260,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8126023,
      "sourceEndMs": 8127423,
      "text": "羊の毛がいるんだ!"
    },
    {
      "speechId": 1261,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8127423,
      "sourceEndMs": 8128084,
      "text": "おー!"
    },
    {
      "speechId": 1262,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8128084,
      "sourceEndMs": 8129744,
      "text": "羊の毛!"
    },
    {
      "speechId": 1263,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8129744,
      "sourceEndMs": 8129964,
      "text": "あ!"
    },
    {
      "speechId": 1264,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8131090,
      "sourceEndMs": 8134372,
      "text": "そのさ、刈り切り鋏みたいなのあったよね、そういえばあったね!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
