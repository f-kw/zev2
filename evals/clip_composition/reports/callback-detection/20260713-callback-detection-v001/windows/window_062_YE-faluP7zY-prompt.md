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
    "windowId": "window_062_YE-faluP7zY",
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
      "speechId": 1464,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9697147,
      "sourceEndMs": 9703529,
      "text": "結構上がってるよねスケールがベッドの上位互換はないんじゃん?"
    },
    {
      "speechId": 1465,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9703529,
      "sourceEndMs": 9706129,
      "text": "まだできないだけであるかな?"
    },
    {
      "speechId": 1466,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9706129,
      "sourceEndMs": 9712390,
      "text": "旗も立てたいねハンモックとかもいいねこれさマリリンこれ絵描けるようになるんじゃないの?"
    },
    {
      "speechId": 1467,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9712390,
      "sourceEndMs": 9717291,
      "text": "これペイントもささっきさ出たしさどうなんだ確かにえ?"
    },
    {
      "speechId": 1468,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9717291,
      "sourceEndMs": 9719232,
      "text": "旗にさ絵描けちゃうんじゃねーのこれ?"
    },
    {
      "speechId": 1469,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9721394,
      "sourceEndMs": 9747763,
      "text": "書いて欲しいわ棚とかもあるのか棚いいね今床に時間を置きしてるひよこたちをそうね椅子も作りたいしかもめっちゃコスト軽いいいやんクソ助かるさすがやんかめっちゃいいあ明かりいいちょっと作りたいものがまみれてきたよ今どうするよ"
    },
    {
      "speechId": 1470,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9750066,
      "sourceEndMs": 9777863,
      "text": "作るしかないよな作るしかないカーテンもいいねカーテンかカーテンもいいやいいよねあれだなまずドアをこういうドア作ってそこにカーテンをつけてサメさん待っていいないいねいいじゃん夢膨らむねでもやっぱある程度のさ壁をガーって囲ってある程度の吹き抜け感はやっぱ欲しいよね吹き抜け?"
    },
    {
      "speechId": 1471,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9777863,
      "sourceEndMs": 9778763,
      "text": "えでもいいんじゃない?"
    },
    {
      "speechId": 1472,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9778763,
      "sourceEndMs": 9779864,
      "text": "吹き抜けいらないんじゃないの"
    },
    {
      "speechId": 1473,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9780290,
      "sourceEndMs": 9782592,
      "text": "いらん?"
    },
    {
      "speechId": 1474,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9782592,
      "sourceEndMs": 9785194,
      "text": "あーそうか、壁を全面に作るかってこと?"
    },
    {
      "speechId": 1475,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9785194,
      "sourceEndMs": 9792039,
      "text": "そうそうそうそううーん、そうなーえ、君たちー?"
    },
    {
      "speechId": 1476,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9792039,
      "sourceEndMs": 9793360,
      "text": "君たちー?"
    },
    {
      "speechId": 1477,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9793360,
      "sourceEndMs": 9795441,
      "text": "どう思いますかー?"
    },
    {
      "speechId": 1478,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9795441,
      "sourceEndMs": 9796682,
      "text": "いや、どう思います?"
    },
    {
      "speechId": 1479,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9796682,
      "sourceEndMs": 9797142,
      "text": "君たちー?"
    },
    {
      "speechId": 1480,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9797142,
      "sourceEndMs": 9799304,
      "text": "どうすべきですかー?"
    },
    {
      "speechId": 1481,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9799304,
      "sourceEndMs": 9799684,
      "text": "え、どうすればいいのー?"
    },
    {
      "speechId": 1482,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9799684,
      "sourceEndMs": 9808391,
      "text": "回収して暗いよー暗いねー外したら一気に暗なるな"
    },
    {
      "speechId": 1483,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9812578,
      "sourceEndMs": 9828332,
      "text": "2階の入り口にランタン置こうマジで暗いな暗いんよどっちに置こうかな?"
    },
    {
      "speechId": 1484,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9828332,
      "sourceEndMs": 9828632,
      "text": "こっちかな?"
    },
    {
      "speechId": 1485,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9828632,
      "sourceEndMs": 9839222,
      "text": "当たる星大丈夫だよめっちゃ板拾ったんだがいいね"
    },
    {
      "speechId": 1486,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9842646,
      "sourceEndMs": 9860491,
      "text": "置き場も欲しいよなぁこれがこれ、あっちがこうなって美品置き場がなんかもう便利、便利置き場になってきた何でもここに入れとけみたいな感じになり始めてる危険な兆候ですいいのでは?"
    },
    {
      "speechId": 1487,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9860491,
      "sourceEndMs": 9862352,
      "text": "でもいいですか?"
    },
    {
      "speechId": 1488,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9862352,
      "sourceEndMs": 9869454,
      "text": "後でまた整理できるしな確かにねえ、電球、電球?"
    },
    {
      "speechId": 1489,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9872154,
      "sourceEndMs": 9899474,
      "text": "虫捕り網、虫捕り網だって虫捕り網ね、思った虫捕ることあるのかなっていういらねーよなーいらねーよなーはわろだあーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー"
    },
    {
      "speechId": 1490,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9900130,
      "sourceEndMs": 9929824,
      "text": "チョベリバー出ちゃったな出るわこれチョベリバーがストレージ1個は待ってるまであるな絶妙になーなんか一旦壊してしまっとくという手もあるかなるほどねだんだん独り言が激しくなってきたいいじゃんいいじゃんここに反応するで独り言に優しいあれ独り言に返事しちゃいけないんだっけなんかあったよね寝言だ寝言寝言感言うよね"
    },
    {
      "speechId": 1491,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9930322,
      "sourceEndMs": 9932704,
      "text": "聞くと怖くなっちゃわない?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
