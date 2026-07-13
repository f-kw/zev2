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
    "windowId": "window_054_YE-faluP7zY",
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
      "speechId": 1201,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7676862,
      "sourceEndMs": 7677082,
      "text": "よし!"
    },
    {
      "speechId": 1202,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7677082,
      "sourceEndMs": 7677543,
      "text": "よし!"
    },
    {
      "speechId": 1203,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7677543,
      "sourceEndMs": 7678743,
      "text": "よし!"
    },
    {
      "speechId": 1204,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7678743,
      "sourceEndMs": 7679003,
      "text": "よし!"
    },
    {
      "speechId": 1205,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679003,
      "sourceEndMs": 7679063,
      "text": "よし!"
    },
    {
      "speechId": 1206,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679063,
      "sourceEndMs": 7679124,
      "text": "よし!"
    },
    {
      "speechId": 1207,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679124,
      "sourceEndMs": 7679184,
      "text": "よし!"
    },
    {
      "speechId": 1208,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679184,
      "sourceEndMs": 7679264,
      "text": "よし!"
    },
    {
      "speechId": 1209,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679264,
      "sourceEndMs": 7679324,
      "text": "よし!"
    },
    {
      "speechId": 1210,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679324,
      "sourceEndMs": 7679524,
      "text": "よし!"
    },
    {
      "speechId": 1211,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679524,
      "sourceEndMs": 7679704,
      "text": "よし!"
    },
    {
      "speechId": 1212,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679704,
      "sourceEndMs": 7679804,
      "text": "よし!"
    },
    {
      "speechId": 1213,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679804,
      "sourceEndMs": 7679964,
      "text": "よし!"
    },
    {
      "speechId": 1214,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7679964,
      "sourceEndMs": 7680000,
      "text": "よし"
    },
    {
      "speechId": 1215,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7681101,
      "sourceEndMs": 7686024,
      "text": "いいよ下は探索しないけど大丈夫?"
    },
    {
      "speechId": 1216,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7686024,
      "sourceEndMs": 7687365,
      "text": "一旦いいんじゃない?"
    },
    {
      "speechId": 1217,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7687365,
      "sourceEndMs": 7696430,
      "text": "一旦了解とりあえずねなんでこっち見てくんの?"
    },
    {
      "speechId": 1218,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7696430,
      "sourceEndMs": 7700873,
      "text": "なんか別に見ただけじゃんそんな見られたら何?"
    },
    {
      "speechId": 1219,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7700873,
      "sourceEndMs": 7708118,
      "text": "ってなるじゃんごめんね生の肉焼いてますストレージねこうして"
    },
    {
      "speechId": 1220,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7709515,
      "sourceEndMs": 7709983,
      "text": "ろっこつ"
    },
    {
      "speechId": 1221,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7710506,
      "sourceEndMs": 7739692,
      "text": "作って6個あれば大体まかないそうだよねあとはもう細かいストレージでそうね小さい人たちにここに2つ付けたりとかっていうのも可能なんだろうかちょっとやってみるかここの種系もしまうところそうね、種なぶどうのベトベトを入れてここが鉱石か"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
