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
    "windowId": "window_061_YE-faluP7zY",
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
    },
    {
      "speechId": 1445,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9575479,
      "sourceEndMs": 9577739,
      "text": "え、めっちゃいいなこれ!"
    },
    {
      "speechId": 1446,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9577739,
      "sourceEndMs": 9579600,
      "text": "めっちゃいい!"
    },
    {
      "speechId": 1447,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9579600,
      "sourceEndMs": 9580620,
      "text": "え、ホント?"
    },
    {
      "speechId": 1448,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9580620,
      "sourceEndMs": 9583301,
      "text": "え、フェンスの塊なんだが!"
    },
    {
      "speechId": 1449,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9583301,
      "sourceEndMs": 9584001,
      "text": "マジで?"
    },
    {
      "speechId": 1450,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9584001,
      "sourceEndMs": 9585121,
      "text": "そうかな?"
    },
    {
      "speechId": 1451,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9585121,
      "sourceEndMs": 9599564,
      "text": "え、このさ、降りたところ、階段が終わる瞬間のとこにラグ…間に合わなかったね間に合わなかった毎回さ、このさ"
    },
    {
      "speechId": 1452,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9600182,
      "sourceEndMs": 9619695,
      "text": "あの、槍に切り替えるのにめっちゃ時間かかるんだよねわかる槍さえ持ってないやん、ちょ待ってな槍くらいは持っててほしいよわかるわかるわかりみが深い待ってよえっとちょ待ってよ、何すればいいの?"
    },
    {
      "speechId": 1453,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9619695,
      "sourceEndMs": 9627280,
      "text": "えっと水飲んでファイアポー!"
    },
    {
      "speechId": 1454,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9627280,
      "sourceEndMs": 9628061,
      "text": "なに?"
    },
    {
      "speechId": 1455,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9628061,
      "sourceEndMs": 9628942,
      "text": "ファイアポー!"
    },
    {
      "speechId": 1456,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9628942,
      "sourceEndMs": 9629402,
      "text": "この曲ね"
    },
    {
      "speechId": 1457,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9631062,
      "sourceEndMs": 9654935,
      "text": "横路ファイアボーイ一旦閉まって配置を決めようよしこれで槍を作るか、槍食料ボックスも必要かあ、食料ボックスね回収ネットもちょっと欲しいんけどな回収ネット増やしたいね増やしたいよなあ、ヤシの種いっぱいあった武器"
    },
    {
      "speechId": 1458,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9661998,
      "sourceEndMs": 9665779,
      "text": "上をロープと厚板何?"
    },
    {
      "speechId": 1459,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9665779,
      "sourceEndMs": 9676921,
      "text": "ごめんなよそういうことすんな間違えた間違えたロープと厚板2人で寝たら朝になるんかな?"
    },
    {
      "speechId": 1460,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9676921,
      "sourceEndMs": 9683323,
      "text": "あ、確かにねその説あったなそういえばねもう一個作る?"
    },
    {
      "speechId": 1461,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9683323,
      "sourceEndMs": 9689844,
      "text": "ベッドそうだね作ってもいいよねそろそろねめっちゃだってなんかベッドの上位互換"
    },
    {
      "speechId": 1462,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9690066,
      "sourceEndMs": 9695807,
      "text": "ないかななんかいいやつベッドの上位互換は旅館?"
    },
    {
      "speechId": 1463,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9695807,
      "sourceEndMs": 9697147,
      "text": "旅館?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
