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
    "windowId": "seam_060_YE-faluP7zY",
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
      "speechId": 1406,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9322600,
      "sourceEndMs": 9327081,
      "text": "なんかあるのかな?"
    },
    {
      "speechId": 1407,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9327081,
      "sourceEndMs": 9328502,
      "text": "なんか釘みたいなやつ"
    },
    {
      "speechId": 1408,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9331650,
      "sourceEndMs": 9338155,
      "text": "あ、ボードが必要なんだって、なるほどトロフィーボードってやつ?"
    },
    {
      "speechId": 1409,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9338155,
      "sourceEndMs": 9340337,
      "text": "トロフィーボードはまだ作れないよね?"
    },
    {
      "speechId": 1410,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9340337,
      "sourceEndMs": 9356069,
      "text": "よく作れるちょっと置いてみるわ"
    },
    {
      "speechId": 1411,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9360342,
      "sourceEndMs": 9387882,
      "text": "ここに置きたいのにえ、なんでこの嵐のせいでだいぶ材料も集まっとるんでなナイスサメも来てるんでなナイスできるか?"
    },
    {
      "speechId": 1412,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9387882,
      "sourceEndMs": 9389624,
      "text": "床、そうね床も作りたいな床床広げたくない?"
    },
    {
      "speechId": 1413,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9390002,
      "sourceEndMs": 9392124,
      "text": "ちょっと後にしてそれはあれ?"
    },
    {
      "speechId": 1414,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9392124,
      "sourceEndMs": 9393585,
      "text": "置けないなダメか?"
    },
    {
      "speechId": 1415,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9393585,
      "sourceEndMs": 9395687,
      "text": "置けない?"
    },
    {
      "speechId": 1416,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9395687,
      "sourceEndMs": 9397748,
      "text": "なんでじゃろか?"
    },
    {
      "speechId": 1417,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9397748,
      "sourceEndMs": 9400591,
      "text": "ちっちゃいのかな?"
    },
    {
      "speechId": 1418,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9400591,
      "sourceEndMs": 9418786,
      "text": "まあいいやちょっとそれは一旦置いといておうえーっとほねこれとこれを片付けろか先こうやってやりたいことがさ2点3点と変わっていってしまうからちゃんとね一つずつ着実に"
    },
    {
      "speechId": 1419,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9419355,
      "sourceEndMs": 9419821,
      "text": "片付けていく"
    },
    {
      "speechId": 1420,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9421622,
      "sourceEndMs": 9423243,
      "text": "とりあえず食材集めながら材料も拾うね?"
    },
    {
      "speechId": 1421,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9423243,
      "sourceEndMs": 9423583,
      "text": "オッケー?"
    },
    {
      "speechId": 1422,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9423583,
      "sourceEndMs": 9423824,
      "text": "オッケー?"
    },
    {
      "speechId": 1423,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9423824,
      "sourceEndMs": 9424504,
      "text": "ナイス?"
    },
    {
      "speechId": 1424,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9424504,
      "sourceEndMs": 9437694,
      "text": "えーこういったりして…オッケー?"
    },
    {
      "speechId": 1425,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9437694,
      "sourceEndMs": 9447221,
      "text": "んーバランス見てもう一個置きたいなこれ…あこれから生カチオばっかりなら生カチオって何やねん?"
    },
    {
      "speechId": 1426,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9447221,
      "sourceEndMs": 9449122,
      "text": "生のカチオか…なんか当たり前の…当たり前ことを言っているような…"
    },
    {
      "speechId": 1427,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9451814,
      "sourceEndMs": 9479504,
      "text": "まあ、できたらばなんとなく完成させたいよね、この辺はねそうな、そうなでもなんか収納大きすぎてさお片付け上手みたいになってきちゃった倉庫みたいになってるなそうなのよ"
    },
    {
      "speechId": 1428,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9480646,
      "sourceEndMs": 9509704,
      "text": "片付け長寿ここ落ちるからうざいから床付ける床増やすわ広げたいな木材いっぱい集めるわボトボト落下して気分悪いから広げますとそうなナイスありがとうございます"
    },
    {
      "speechId": 1429,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9511343,
      "sourceEndMs": 9517106,
      "text": "この広さあれば…あ、そうだ!"
    },
    {
      "speechId": 1430,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9517106,
      "sourceEndMs": 9518907,
      "text": "ここに絨毯をさ階段登るところに…大丈夫?"
    },
    {
      "speechId": 1431,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9518907,
      "sourceEndMs": 9528293,
      "text": "サメかと思ったらイルカかと思ってイルカかと思ったらサメだったわ危なしーいや、こっちかな?"
    },
    {
      "speechId": 1432,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9528293,
      "sourceEndMs": 9528413,
      "text": "こっちかな?"
    },
    {
      "speechId": 1433,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9528413,
      "sourceEndMs": 9528953,
      "text": "ナイスショー!"
    },
    {
      "speechId": 1434,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9528953,
      "sourceEndMs": 9532315,
      "text": "お!"
    },
    {
      "speechId": 1435,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9532315,
      "sourceEndMs": 9536037,
      "text": "こんなとこに置かないか?"
    },
    {
      "speechId": 1436,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9536037,
      "sourceEndMs": 9536418,
      "text": "おらよー"
    },
    {
      "speechId": 1437,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9544166,
      "sourceEndMs": 9549190,
      "text": "あ、ねえ、こうねえはい!"
    },
    {
      "speechId": 1438,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9549190,
      "sourceEndMs": 9553113,
      "text": "ねえ、上がって、ここにはいなんか思うことない?"
    },
    {
      "speechId": 1439,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9553113,
      "sourceEndMs": 9555055,
      "text": "思うこと?"
    },
    {
      "speechId": 1440,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9555055,
      "sourceEndMs": 9563321,
      "text": "このエリアに関して思うこと?"
    },
    {
      "speechId": 1441,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9563321,
      "sourceEndMs": 9563482,
      "text": "そう"
    },
    {
      "speechId": 1442,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9571678,
      "sourceEndMs": 9572999,
      "text": "じゅうたん!"
    },
    {
      "speechId": 1443,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9572999,
      "sourceEndMs": 9574159,
      "text": "じゅうたんを置いてみたんだけど!"
    },
    {
      "speechId": 1444,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9574159,
      "sourceEndMs": 9575479,
      "text": "ど、どうかな?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
