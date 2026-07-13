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
    "windowId": "seam_054_YE-faluP7zY",
    "windowKind": "seam_bridge",
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
      "speechId": 1222,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7740970,
      "sourceEndMs": 7769844,
      "text": "犬獅子の頭入ってるよねごめんごめんごめんごめんごめんなさい回収しに行きます装備入れる棚とかもあったら便利だよね確かに言われてみると言われてねーけどさ言われてみると確かにそうなに笑ってんの面白いなと思ってごめんねスクラップスクラップないかな"
    },
    {
      "speechId": 1223,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7770146,
      "sourceEndMs": 7775129,
      "text": "もうなくなっちったかななくなっちったかもスクラップ?"
    },
    {
      "speechId": 1224,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7775129,
      "sourceEndMs": 7783874,
      "text": "そうあ、ガラス拾ったよ見てあ、これ持てないかこれんー持ててない持てない?"
    },
    {
      "speechId": 1225,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7783874,
      "sourceEndMs": 7784215,
      "text": "これは?"
    },
    {
      "speechId": 1226,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7784215,
      "sourceEndMs": 7798903,
      "text": "あ、あったあったスクラップあったわなにこれ待ってあ、待たなくていいわ待てないよ別にひどーい"
    },
    {
      "speechId": 1227,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7800514,
      "sourceEndMs": 7829952,
      "text": "別に待ってないよーひどくなーいとりあえず作ってここ置いてこれね、あ、板めっちゃ引っかかってるわ、すごいわよし、もう降りよ今考えてる、うーん、そうだなー今考えて、考えて、考えて、うぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅ"
    },
    {
      "speechId": 1228,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7831238,
      "sourceEndMs": 7833238,
      "text": "花とかいる?"
    },
    {
      "speechId": 1229,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7833238,
      "sourceEndMs": 7855683,
      "text": "一応でもストレージが増えてるからワンチャンしまえなくもないからあれだな壁作って今あるちっちゃいストレージをいくつか壊してここに引っ掛けてねえねえ今コメントで見たんだけどさいらないものボックスねえ!"
    },
    {
      "speechId": 1230,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7855683,
      "sourceEndMs": 7856703,
      "text": "死ね!"
    },
    {
      "speechId": 1231,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7856703,
      "sourceEndMs": 7859744,
      "text": "いらないものいらないものボックス作って"
    },
    {
      "speechId": 1232,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7860254,
      "sourceEndMs": 7872042,
      "text": "なんかとりあえずいまいらないものボックスみたいなあーオッケーオッケーオッケーオッケー端っこにさ、なんかゴミ箱作ろうぜ、じゃあいいよーゴミ箱という名のストレージを端っこ…あ、じゃあここにしよ、階段横にしない?"
    },
    {
      "speechId": 1233,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7872042,
      "sourceEndMs": 7874984,
      "text": "あ、ブブブ…階段横にしよ、階段横いいね、いいねわかりやすくない?"
    },
    {
      "speechId": 1234,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7874984,
      "sourceEndMs": 7889634,
      "text": "覚えやすい溶けよ、お前マジでね、また乾杯しようあ、そんな…ごめんね、そんな時間ないよなに、乾杯ってね、この…さんこれ"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
