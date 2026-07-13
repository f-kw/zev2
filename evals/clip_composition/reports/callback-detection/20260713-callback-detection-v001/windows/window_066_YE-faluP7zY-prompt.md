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
    "windowId": "window_066_YE-faluP7zY",
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
    },
    {
      "speechId": 1601,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10772002,
      "sourceEndMs": 10784567,
      "text": "まさしく気持ちいいカウボーイだってマリリンはカウガールかなおや?"
    },
    {
      "speechId": 1602,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10784567,
      "sourceEndMs": 10795851,
      "text": "おやじゃないよ間違えたかなコメントここ入り口だからね壊れてる"
    },
    {
      "speechId": 1603,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10800520,
      "sourceEndMs": 10815067,
      "text": "せいちゃんあれだ作んなきゃ新しい武器おしおしおしおしうわ壊れた壊れちゃいましたか大丈夫直すわあっ間違えた矢作っちゃった矢作ったん?"
    },
    {
      "speechId": 1604,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10815067,
      "sourceEndMs": 10818309,
      "text": "ちゃうねんちゃうねんこれは矢ねんあれ?"
    },
    {
      "speechId": 1605,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10818309,
      "sourceEndMs": 10819109,
      "text": "ヨリヨリ?"
    },
    {
      "speechId": 1606,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10819109,
      "sourceEndMs": 10829114,
      "text": "あっ待ってあーなんかあれこれどうやって直すんだっけあっこれだあっなんか作っちゃったなにこれーねぇなにこれごめん"
    },
    {
      "speechId": 1607,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10830726,
      "sourceEndMs": 10842453,
      "text": "待ってわかった壊しとくからちょっと待ってよ申し訳ないあれだけは取るこれは行きましたねこれは魚も釣りてえなあれ?"
    },
    {
      "speechId": 1608,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10842453,
      "sourceEndMs": 10860000,
      "text": "マジかよいしょさて壊すねうん突如の三角形のごめんねこれはじゃあオンなんでなんか授業で使うでかい三角形みたいなやつハンマーでね一番下のやつを選ぶんよあ、ありがとう次やるわあ、また取り"
    },
    {
      "speechId": 1609,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10860182,
      "sourceEndMs": 10889872,
      "text": "ひろたけどひよこみたいなやつあね棚作って飾るという手もあるかなと今考え中あいいねでも腹の足しにもなんねワイルドなあでもガチ目にそう今お腹減ってんだよねいっぱい焼いていっぱいではないけど入れてあるから取ってねありがとうねもらうねうんもらってもらってどんどんさどんどんどんどん作ってさ文明発達させていきたいっていうのにさもうお腹が減ったりさ邪魔が"
    },
    {
      "speechId": 1610,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10890274,
      "sourceEndMs": 10918263,
      "text": "ガール全然ダメなんだよなあよしこれ欲しい真ん中にまず明るさの確保が先かなそうねなんか電飾系のものがあったんだよいいね焚火台へえランタンスクラップでできるのか暖炉ほうほうほう暖炉いいねいいよね暖かいかもうん待ってでも粘土8個も使うわマジ?"
    },
    {
      "speechId": 1611,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10918263,
      "sourceEndMs": 10919524,
      "text": "ちょっとやめてほしい"
    },
    {
      "speechId": 1612,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10920994,
      "sourceEndMs": 10921815,
      "text": "本当?"
    },
    {
      "speechId": 1613,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10921815,
      "sourceEndMs": 10927917,
      "text": "粘土使う?"
    },
    {
      "speechId": 1614,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 10927917,
      "sourceEndMs": 10929598,
      "text": "使う派?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
