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
    "windowId": "seam_065_YE-faluP7zY",
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
      "speechId": 1566,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10557783,
      "sourceEndMs": 10559944,
      "text": "何も考えずに変なとこにカーテンつけちゃったまぁいっか見たい見たいどこ?"
    },
    {
      "speechId": 1567,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10561041,
      "sourceEndMs": 10563042,
      "text": "え、これ閉まるの?"
    },
    {
      "speechId": 1568,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10563042,
      "sourceEndMs": 10564203,
      "text": "プレイ閉まるのかな?"
    },
    {
      "speechId": 1569,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10564203,
      "sourceEndMs": 10564823,
      "text": "え、やってみ?"
    },
    {
      "speechId": 1570,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10564823,
      "sourceEndMs": 10568045,
      "text": "やってみ?"
    },
    {
      "speechId": 1571,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10568045,
      "sourceEndMs": 10589758,
      "text": "え、全然いじれないんだけどえ、マリ、マリミツちゃんそこにいてそこにいていくよでも、でもね、もしかしたらいないでしょ?"
    },
    {
      "speechId": 1572,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10590322,
      "sourceEndMs": 10591943,
      "text": "こういうことなんじゃない?"
    },
    {
      "speechId": 1573,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10591943,
      "sourceEndMs": 10592823,
      "text": "あ、そういうこと?"
    },
    {
      "speechId": 1574,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10592823,
      "sourceEndMs": 10595264,
      "text": "この笑いっていないないバーの笑いなんじゃない?"
    },
    {
      "speechId": 1575,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10595264,
      "sourceEndMs": 10617471,
      "text": "わかるマリンごめんちょっともう5秒ちょうだいいくよいないなーいあ、隠れたわはい、終了見えてないよくそー難しいないないねバーって釘がなくなったもしかしていっぱい使ってたごめんこれ全部取ってたえ?"
    },
    {
      "speechId": 1576,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10617471,
      "sourceEndMs": 10618431,
      "text": "なんで?"
    },
    {
      "speechId": 1577,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10618431,
      "sourceEndMs": 10619692,
      "text": "釘取ってたごめん会社ネットで"
    },
    {
      "speechId": 1578,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10620122,
      "sourceEndMs": 10632427,
      "text": "ああそういうことねでも見てほしいここ見てほら見てほらあ、ほんとだすっきりさっきりできてるできてるいいねえ待ってここどうするここどこ?"
    },
    {
      "speechId": 1579,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10632427,
      "sourceEndMs": 10634168,
      "text": "ここ回収ネットにする?"
    },
    {
      "speechId": 1580,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10634168,
      "sourceEndMs": 10638150,
      "text": "ああしたいしたいでも可能できるかなできそう?"
    },
    {
      "speechId": 1581,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10638150,
      "sourceEndMs": 10647054,
      "text": "やってみるかうんOK一回もう一回釘釘をもらって"
    },
    {
      "speechId": 1582,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10657996,
      "sourceEndMs": 10664879,
      "text": "いいねええーとあ、やべ、またお腹減ってる、ちょっともう、集中して作りたいのにさあお腹?"
    },
    {
      "speechId": 1583,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10664879,
      "sourceEndMs": 10666579,
      "text": "あ、なに、ゲームの方?"
    },
    {
      "speechId": 1584,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10666579,
      "sourceEndMs": 10679664,
      "text": "あ、そうそうそうなんかでかい魚があれば、あ、ないわどんどん作りたいのになかなか落ち着けないあ、作れる、作れる、ネット作れたあ、ナイスナイスナイスよいいよ"
    },
    {
      "speechId": 1585,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10680862,
      "sourceEndMs": 10691847,
      "text": "いやいいな、なんか死ぬほど作業、もう裏の作業みたいなのを垂れ流してる状態ですけどいやでもいいんじゃないの?"
    },
    {
      "speechId": 1586,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10691847,
      "sourceEndMs": 10693788,
      "text": "みんなどうですか?"
    },
    {
      "speechId": 1587,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10693788,
      "sourceEndMs": 10695208,
      "text": "君たち?"
    },
    {
      "speechId": 1588,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10695208,
      "sourceEndMs": 10696028,
      "text": "君たち?"
    },
    {
      "speechId": 1589,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10696028,
      "sourceEndMs": 10696829,
      "text": "大丈夫?"
    },
    {
      "speechId": 1590,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10696829,
      "sourceEndMs": 10709374,
      "text": "こういう感じであ、これ魚取っていいよこれ後ろの魚あ、魚ありがとうどこにドアをつけるか考えてんのあ、OKOK"
    },
    {
      "speechId": 1591,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10710962,
      "sourceEndMs": 10717867,
      "text": "焼いてあえてここは取っていいよじゃない生魚食べちゃったじゃんバカじゃねーの?"
    },
    {
      "speechId": 1592,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10717867,
      "sourceEndMs": 10720129,
      "text": "マジでそんなに?"
    },
    {
      "speechId": 1593,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10720129,
      "sourceEndMs": 10738182,
      "text": "取っていいよじゃないんだなこれ中に入れとけばいいんだなこれなほらよあえてのこのさこういううんここをさ一個もらおうか"
    },
    {
      "speechId": 1594,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10740498,
      "sourceEndMs": 10745259,
      "text": "どう?"
    },
    {
      "speechId": 1595,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10745259,
      "sourceEndMs": 10757762,
      "text": "このデザイニズムいや、マリーンさん才能あるよなえ、ほんと?"
    },
    {
      "speechId": 1596,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10757762,
      "sourceEndMs": 10759042,
      "text": "うんデザイナーの才能あると思うこれいい?"
    },
    {
      "speechId": 1597,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10759042,
      "sourceEndMs": 10760042,
      "text": "え、めっちゃいいじゃん!"
    },
    {
      "speechId": 1598,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10760042,
      "sourceEndMs": 10760622,
      "text": "え、ほんとに似てる?"
    },
    {
      "speechId": 1599,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10760622,
      "sourceEndMs": 10760802,
      "text": "はぁ?"
    },
    {
      "speechId": 1600,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10760802,
      "sourceEndMs": 10769944,
      "text": "これカウボーイの村にあるとはやんこれねえ、これさめっちゃいいやんこれこれカウボーイかな?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
