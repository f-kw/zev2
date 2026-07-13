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
    "windowId": "seam_047_YE-faluP7zY",
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
    },
    {
      "speechId": 976,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6680100,
      "sourceEndMs": 6680400,
      "text": "いいんじゃない?"
    },
    {
      "speechId": 977,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6680400,
      "sourceEndMs": 6688706,
      "text": "開けれる開けれる開けれる痛いじゃんいいじゃんここに大容量スクラップばっかり"
    },
    {
      "speechId": 978,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6693504,
      "sourceEndMs": 6719884,
      "text": "ストレージストレージは使うからいいよねストレージいくつあっても足りんなぁいいよね作っちゃってうん作っていい作っていいびっしり3つここにね見て見てこうね壁にかけてみたすげぇ見てないじゃん先生お前すげぇすげぇ1ミリも見ないでさぁこれ何入れるこれ決めとこうよこれ待ってサメやったサメやったサメやった"
    },
    {
      "speechId": 979,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6721494,
      "sourceEndMs": 6722755,
      "text": "なんで?"
    },
    {
      "speechId": 980,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6722755,
      "sourceEndMs": 6723455,
      "text": "どうして?"
    },
    {
      "speechId": 981,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6723455,
      "sourceEndMs": 6724796,
      "text": "どこで?"
    },
    {
      "speechId": 982,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6724796,
      "sourceEndMs": 6749852,
      "text": "今普通に殺してたらやったすごいじゃんやりました壁作ったらさ頭飾れるもんねそう飾ろう飾ろう適当にさ適当じゃないすげーだって周りに言ってたじゃん君たちラグを考慮してコメントしなさいよって言ったじゃんそれは王将海賊"
    },
    {
      "speechId": 983,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6750130,
      "sourceEndMs": 6751591,
      "text": "ご飯の話でコーネは別でしょ?"
    },
    {
      "speechId": 984,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6751591,
      "sourceEndMs": 6753492,
      "text": "あ、違うの?"
    },
    {
      "speechId": 985,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6753492,
      "sourceEndMs": 6760055,
      "text": "ご飯食べようご飯食べてあ、ご飯ね、ここあ、違うよ、それ、それを小せいやつだから生酢いらない?"
    },
    {
      "speechId": 986,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6760055,
      "sourceEndMs": 6771480,
      "text": "生酢え、でもこれ食べてさ、ここにさ入れるからあの、サメの肉をえ、でもさ、これ焼かなきゃいけないんだよあ?"
    },
    {
      "speechId": 987,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6771480,
      "sourceEndMs": 6772540,
      "text": "どれ?"
    },
    {
      "speechId": 988,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6772540,
      "sourceEndMs": 6775622,
      "text": "そんな小物あるサメの肉に決まってっしょ?"
    },
    {
      "speechId": 989,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6775622,
      "sourceEndMs": 6776903,
      "text": "あらよ!"
    },
    {
      "speechId": 990,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6776903,
      "sourceEndMs": 6778363,
      "text": "あらよ!"
    },
    {
      "speechId": 991,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6778363,
      "sourceEndMs": 6779244,
      "text": "ホルダーすごいな"
    },
    {
      "speechId": 992,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6780086,
      "sourceEndMs": 6781567,
      "text": "にっこり笑ってるよ?"
    },
    {
      "speechId": 993,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6781567,
      "sourceEndMs": 6781887,
      "text": "何?"
    },
    {
      "speechId": 994,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6781887,
      "sourceEndMs": 6782087,
      "text": "何?"
    },
    {
      "speechId": 995,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6782087,
      "sourceEndMs": 6782948,
      "text": "何が?"
    },
    {
      "speechId": 996,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6782948,
      "sourceEndMs": 6792473,
      "text": "うふふってサメが肉が笑ってる独特な感性で物を言わないでもらっていい?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
