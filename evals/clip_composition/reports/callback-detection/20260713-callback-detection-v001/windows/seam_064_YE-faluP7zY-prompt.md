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
    "windowId": "seam_064_YE-faluP7zY",
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
      "speechId": 1541,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10273031,
      "sourceEndMs": 10290000,
      "text": "うそっぷ、そういうことではないだろあ、そういうことではなかったないだろなほねええーと、これでこれさ、食材のとこさ、焼いてから入れて"
    },
    {
      "speechId": 1542,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10291094,
      "sourceEndMs": 10291995,
      "text": "どっちがいい?"
    },
    {
      "speechId": 1543,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10291995,
      "sourceEndMs": 10320000,
      "text": "どっちでもいいよ焼けるならここで焼いここにさ、グリル簡素なやつ置いてあるからあ、分かった焼けるなら焼いちゃってちょっと焼けないけど邪魔で入れときたいなら一旦入れてもらってもそうな、あんま考えなくていいかいいよとりあえず焼こうかなあ、落ちてしもたけど上がる上がる上がるファイアーフラッシュこれを生のビール"
    },
    {
      "speechId": 1544,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10320020,
      "sourceEndMs": 10343898,
      "text": "釘とかいらないけどなーでもなー釘は備品じゃないね釘は備品じゃない組み分けを変えようスリザーリン弓も入れたいなこれもこういうこういうあ、それ君たちEに売ってんの?"
    },
    {
      "speechId": 1545,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10343898,
      "sourceEndMs": 10349282,
      "text": "それコーネにも売ってるあのーあ、コーネに売ってるなんだろうこれ水筒とかこれ作ったものみたいなやつ?"
    },
    {
      "speechId": 1546,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10355002,
      "sourceEndMs": 10365672,
      "text": "あの釘とか、釘とかさあるじゃん、釘とか蝶津貝とかは工具系として新たな木装作らせてもらうあ、工具系いいねわかる?"
    },
    {
      "speechId": 1547,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10365672,
      "sourceEndMs": 10367053,
      "text": "いい意味わかる?"
    },
    {
      "speechId": 1548,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10367053,
      "sourceEndMs": 10368974,
      "text": "伝わってきたわわかるわかるオッケー?"
    },
    {
      "speechId": 1549,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10368974,
      "sourceEndMs": 10374699,
      "text": "じゃあこれ工具系入れにしようオッケーオッケーいいじゃんいいじゃんあ、そう!"
    },
    {
      "speechId": 1550,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10374699,
      "sourceEndMs": 10374840,
      "text": "消耗品!"
    },
    {
      "speechId": 1551,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10374840,
      "sourceEndMs": 10376541,
      "text": "君たちそれだよ!"
    },
    {
      "speechId": 1552,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10376541,
      "sourceEndMs": 10379904,
      "text": "消耗品ですこうね、消耗品、ふーん"
    },
    {
      "speechId": 1553,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10380074,
      "sourceEndMs": 10409824,
      "text": "消耗品で終わったこれで消耗品入れねでここに釘とか入れますはーいここでは中身を見て判断してくださいはい中身見ればねこっちのもんよ見れば分かるもんねだよこれね結構釣竿って早く壊れちゃうんだね結構早いよねこうなってくるとここのストレージめちゃめちゃ余ってるからまぁなんかノリで適当にしまいたい時用に終わったよし完璧だな"
    },
    {
      "speechId": 1554,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10411142,
      "sourceEndMs": 10422286,
      "text": "え、なんか超スッキリするわマジでスッキリしてる、言っとくけどめっちゃ綺麗になってるからね、今いいやん、できる女やんわかる?"
    },
    {
      "speechId": 1555,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10422286,
      "sourceEndMs": 10436991,
      "text": "2階も作ってくれたし整理整頓もできてラジオ外しちゃったから静かになるけど寂しがらないよねえ、待ってよ、二人のこのトーク力でカバーよえ、マジ?"
    },
    {
      "speechId": 1556,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10436991,
      "sourceEndMs": 10439932,
      "text": "今船長さマジ船長抱えてるわ、ラジオ"
    },
    {
      "speechId": 1557,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10440054,
      "sourceEndMs": 10442255,
      "text": "完全にこれ嘘?"
    },
    {
      "speechId": 1558,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10442255,
      "sourceEndMs": 10462969,
      "text": "ヒップホップになっちゃったよリリーコングやクリアする時のリリーコングやそれBGMが流れてるからねこれね今消えてる船長のところだとBGMがあえて"
    },
    {
      "speechId": 1559,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10470482,
      "sourceEndMs": 10475085,
      "text": "これドア式にしてこうね、どうかなこういうさチラ見せスタイル後ろ見てーあ、いいじゃん!"
    },
    {
      "speechId": 1560,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10475085,
      "sourceEndMs": 10476927,
      "text": "上めっちゃいいじゃん!"
    },
    {
      "speechId": 1561,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10476927,
      "sourceEndMs": 10480870,
      "text": "こんにちはあ、壊れちゃった!"
    },
    {
      "speechId": 1562,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10480870,
      "sourceEndMs": 10480910,
      "text": "斧!"
    },
    {
      "speechId": 1563,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10480910,
      "sourceEndMs": 10499844,
      "text": "待って待って、斧壊れたああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ"
    },
    {
      "speechId": 1564,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10500130,
      "sourceEndMs": 10529171,
      "text": "こっちこっち作っとくわありがとうじゃげんなよマジでクソがよやられたねまんまと木の門やられたわここ出入りできた方が便利だないやいいななんかいいなどうしよううちら一生やってるのかなもしかしてでもさ"
    },
    {
      "speechId": 1565,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10539459,
      "sourceEndMs": 10557783,
      "text": "回収ネットあれつけれないじゃん釘いただいちゃって回収ネット作ってなんでここにカーテンつけちゃったんだろうちょっとカーテン作ったの?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
