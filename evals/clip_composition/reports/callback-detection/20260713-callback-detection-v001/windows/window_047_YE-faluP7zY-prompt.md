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
    "windowId": "window_047_YE-faluP7zY",
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
      "speechId": 945,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6415321,
      "sourceEndMs": 6419384,
      "text": "船長あ、そうだ、えーと、であ、いたいたいたいや、こんなに離れちゃうもんなんだな"
    },
    {
      "speechId": 946,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6421242,
      "sourceEndMs": 6421542,
      "text": "ね!"
    },
    {
      "speechId": 947,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6421542,
      "sourceEndMs": 6422683,
      "text": "意外と移動してたね!"
    },
    {
      "speechId": 948,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6422683,
      "sourceEndMs": 6423464,
      "text": "ね!"
    },
    {
      "speechId": 949,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6423464,
      "sourceEndMs": 6436173,
      "text": "こんなに離れちゃうのかOKOK良いね良いね、挟まってたのいっぱいじゃあこれを板12枚入れたよーありがとう!"
    },
    {
      "speechId": 950,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6436173,
      "sourceEndMs": 6437494,
      "text": "ナイス!"
    },
    {
      "speechId": 951,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6437494,
      "sourceEndMs": 6438115,
      "text": "ナイス!"
    },
    {
      "speechId": 952,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6438115,
      "sourceEndMs": 6448103,
      "text": "水物見て水物見て釣り竿古い方使っちゃおうえ、まだお腹空いてないの?"
    },
    {
      "speechId": 953,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6448103,
      "sourceEndMs": 6449243,
      "text": "マリリンまだ行けるかな?"
    },
    {
      "speechId": 954,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6449243,
      "sourceEndMs": 6449964,
      "text": "マジ?"
    },
    {
      "speechId": 955,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6451610,
      "sourceEndMs": 6479458,
      "text": "そろそろ減ってくるかなってところまず食べちゃおうからねいいよお腹減ってんな食べなそれはマリンにくださいよっていうのかと思ったそれは船長のですよそっかマリン船長っていうか解像度低いのやめてよ学習学習つらいコーネに分かってもらえてなかったのつらい"
    },
    {
      "speechId": 956,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6480406,
      "sourceEndMs": 6484328,
      "text": "え、分かってるよ分かってくれてる?"
    },
    {
      "speechId": 957,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6484328,
      "sourceEndMs": 6510760,
      "text": "マリンは船長って言うよねでも知らなかったじゃん今完全にさ知らなかったわけじゃないとっさに出ちゃうよやっぱりマリンって呼んでるからさあー特別なね呼び方だからねそうだよそうだよじゃあしょうがない最近最近さなんか呼び捨てで呼ぶ時もあるからさそうですねマリンのこと最近そうなってきたよねなんかさ匂わしちゃってわかりみわかりみ"
    },
    {
      "speechId": 958,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6531258,
      "sourceEndMs": 6538283,
      "text": "正常期って確かに2階に置いたら水汲んで入れるのが大変かどう考えても確かにそうだなでも1階と2階と3階に作れば?"
    },
    {
      "speechId": 959,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6538283,
      "sourceEndMs": 6539604,
      "text": "3階作る予定でいる"
    },
    {
      "speechId": 960,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6540500,
      "sourceEndMs": 6551645,
      "text": "いやでもさ、あれなんだよね普通に水を汲むのがさ、汲んでさ、入れるじゃん清浄機にさ、水をさうんうんそう、大変じゃね?"
    },
    {
      "speechId": 961,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6551645,
      "sourceEndMs": 6558467,
      "text": "ちょっと普通にさ水を下で汲んで上にさ、入れに行くっていうあーそういうこと?"
    },
    {
      "speechId": 962,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6558467,
      "sourceEndMs": 6569832,
      "text": "確かに、こうやって見ると間違いなくそうだな下でペットボトルで持って行くあ、なるほどね、じゃあこれを確かにペットボトルでいいか、こうしてあ、こうやってね"
    },
    {
      "speechId": 963,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6570682,
      "sourceEndMs": 6576625,
      "text": "確かにこれでいいなあもうできてんじゃん早もうできてるえマジ?"
    },
    {
      "speechId": 964,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6576625,
      "sourceEndMs": 6592494,
      "text": "やしの木ありがたいねありがてえここにじゃあ種も入れて冷静にじゃあ青少期はやっぱ下に置くとしてあ種次郎種次郎種次郎?"
    },
    {
      "speechId": 965,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6600000,
      "sourceEndMs": 6600340,
      "text": "何?"
    },
    {
      "speechId": 966,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6600340,
      "sourceEndMs": 6605802,
      "text": "じわじわ笑うのやめてごめん何ウケ?"
    },
    {
      "speechId": 967,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6605802,
      "sourceEndMs": 6613465,
      "text": "ちょっと待ってジローって何だろうと思ってねぇハマグリいらんくない?"
    },
    {
      "speechId": 968,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6613465,
      "sourceEndMs": 6614245,
      "text": "ハマグリ?"
    },
    {
      "speechId": 969,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6614245,
      "sourceEndMs": 6617346,
      "text": "あぁでもどうだろういらんかなぁ?"
    },
    {
      "speechId": 970,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6617346,
      "sourceEndMs": 6627110,
      "text": "捨てるってことはないよストレージ増やすからちょっと待ってなあ終わったとりあえずここ入れちゃうわそしたらハマグリいけ?"
    },
    {
      "speechId": 971,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6627110,
      "sourceEndMs": 6627490,
      "text": "いけよ"
    },
    {
      "speechId": 972,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6628962,
      "sourceEndMs": 6629636,
      "text": "そしてストレージ"
    },
    {
      "speechId": 973,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6630162,
      "sourceEndMs": 6644967,
      "text": "これをね増やせばいいだけのことストレージだらけになっちゃうなでも壁にかけれるというね説がね今あるからねあーなるほどねテーブルきたなテーブルテーブル何置くん?"
    },
    {
      "speechId": 974,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6644967,
      "sourceEndMs": 6659272,
      "text": "テーブルいいね何置こうねテーブルこっちやちょっと待ってじゃあストレージまず一回ストレージ一個作ってでかいの方がいいよね"
    },
    {
      "speechId": 975,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6660086,
      "sourceEndMs": 6680100,
      "text": "でもちょっと蝶使い使うのが嫌だけどそうなんかもったいないよなまあいいかちょっと作っちゃう壁に掛けれるかチェックするわOKあ、ほんとだ3つはいける計算かしらこれすごいいけるのかな?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
