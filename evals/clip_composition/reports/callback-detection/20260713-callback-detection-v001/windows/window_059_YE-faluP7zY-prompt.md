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
    "windowId": "window_059_YE-faluP7zY",
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
      "speechId": 1353,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9000054,
      "sourceEndMs": 9029018,
      "text": "再起動したで、えっと今何してたかというとあ、そうだこれ中身に移動してたんだほらよよしよしよしよしよしあー、イカダがある安心感もう大丈夫だよこうね怖くないよもう何も怖くないマジ葉っぱの量半端ないやばいよなこれなーこんなにあるでいらねーえーどこを何したんだっけ"
    },
    {
      "speechId": 1354,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9030754,
      "sourceEndMs": 9035896,
      "text": "なんだっけ?"
    },
    {
      "speechId": 1355,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9035896,
      "sourceEndMs": 9059764,
      "text": "ここがこれとここがたねえここはなこれたねえピー拾ってこれよこれよーよいしょえーあと何がいるかなー葉っぱをロープにして半分"
    },
    {
      "speechId": 1356,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9069510,
      "sourceEndMs": 9070932,
      "text": "え、わかんない!"
    },
    {
      "speechId": 1357,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9070932,
      "sourceEndMs": 9089612,
      "text": "でももう行くなよこうではいはいもう行きませんそっか葉っぱに変えちゃ…そっかロープに変えちゃえばいいのかでもあれだよね言うて葉っぱも使いはするから多少はとっておいたほうがいいねえーロープロープロープロープロープロープあ、ここで作ればいい"
    },
    {
      "speechId": 1358,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9094796,
      "sourceEndMs": 9117453,
      "text": "てんやそんにゃんそいにゃんそいにゃんてんやそんにゃんそいにゃんてんやそんにゃんそいにゃんそいにゃん歌ってる、ごきげんですごきげん中身、あ、これOKクラゲ食べられるのかな?"
    },
    {
      "speechId": 1359,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9117453,
      "sourceEndMs": 9118033,
      "text": "クラゲってあのなんかないっけ?"
    },
    {
      "speechId": 1360,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9118033,
      "sourceEndMs": 9118834,
      "text": "食べ物のクラゲ"
    },
    {
      "speechId": 1361,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9120194,
      "sourceEndMs": 9121875,
      "text": "クラゲは食べれるよね?"
    },
    {
      "speechId": 1362,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9121875,
      "sourceEndMs": 9124816,
      "text": "なんか、なんかあった気がするクラゲのなんか、おすい…おすい…すのものみたいなえ?"
    },
    {
      "speechId": 1363,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9124816,
      "sourceEndMs": 9124896,
      "text": "え?"
    },
    {
      "speechId": 1364,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9124896,
      "sourceEndMs": 9125156,
      "text": "あ?"
    },
    {
      "speechId": 1365,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9125156,
      "sourceEndMs": 9125816,
      "text": "なになになに?"
    },
    {
      "speechId": 1366,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9125816,
      "sourceEndMs": 9126997,
      "text": "イルカだー!"
    },
    {
      "speechId": 1367,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9126997,
      "sourceEndMs": 9130618,
      "text": "またイルカだー!"
    },
    {
      "speechId": 1368,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9130618,
      "sourceEndMs": 9130798,
      "text": "わー!"
    },
    {
      "speechId": 1369,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9130798,
      "sourceEndMs": 9133740,
      "text": "わー!"
    },
    {
      "speechId": 1370,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9133740,
      "sourceEndMs": 9141803,
      "text": "かわいい群れをなしているーほんとにすごいねーかわいいねー、イルカはーイルカの鳴き声できる?"
    },
    {
      "speechId": 1371,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9141803,
      "sourceEndMs": 9143043,
      "text": "え、イルカの鳴き声?"
    },
    {
      "speechId": 1372,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9143043,
      "sourceEndMs": 9147325,
      "text": "あ、でも、あのー、聞いたことあるよえ、やめる?"
    },
    {
      "speechId": 1373,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9147325,
      "sourceEndMs": 9148326,
      "text": "えいー!"
    },
    {
      "speechId": 1374,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9148326,
      "sourceEndMs": 9148606,
      "text": "みたいな"
    },
    {
      "speechId": 1375,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9150958,
      "sourceEndMs": 9151678,
      "text": "エゲツナイ!"
    },
    {
      "speechId": 1376,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9151678,
      "sourceEndMs": 9153239,
      "text": "エゲツナイな!"
    },
    {
      "speechId": 1377,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9153239,
      "sourceEndMs": 9155980,
      "text": "エゲツナイ?"
    },
    {
      "speechId": 1378,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9155980,
      "sourceEndMs": 9156421,
      "text": "クラゲ!"
    },
    {
      "speechId": 1379,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9156421,
      "sourceEndMs": 9159182,
      "text": "あ、クラゲじゃないかクラゲ?"
    },
    {
      "speechId": 1380,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9159182,
      "sourceEndMs": 9160082,
      "text": "クラゲ?"
    },
    {
      "speechId": 1381,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9160082,
      "sourceEndMs": 9161443,
      "text": "イルカ?"
    },
    {
      "speechId": 1382,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9161443,
      "sourceEndMs": 9161943,
      "text": "エゲツナイ?"
    },
    {
      "speechId": 1383,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9161943,
      "sourceEndMs": 9167006,
      "text": "イルカエゲツナイな聞こえなんだなえ、どんな感じ?"
    },
    {
      "speechId": 1384,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9167006,
      "sourceEndMs": 9178691,
      "text": "やってイルカでしょ?"
    },
    {
      "speechId": 1385,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9178691,
      "sourceEndMs": 9179052,
      "text": "えぇ!"
    },
    {
      "speechId": 1386,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9179052,
      "sourceEndMs": 9179512,
      "text": "そんなんかなぁ!"
    },
    {
      "speechId": 1387,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9179512,
      "sourceEndMs": 9179872,
      "text": "せいちゃん違うと思う"
    },
    {
      "speechId": 1388,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9180854,
      "sourceEndMs": 9209924,
      "text": "あら違ったわ違ったわじゃなくてさ違ったわよえ似てる嘘でしょえ嘘今のはこんなやつ役ないよ邪魔だよこっちはこれ持ってんだぞ邪魔だったんだもんしょうがないじゃん邪魔な魚よ視界に入ってきたぬるっと視界に入ってきた"
    },
    {
      "speechId": 1389,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 9210100,
      "sourceEndMs": 9232688,
      "text": "いいよ全然焼けないじゃんめっちゃ綺麗になってきたよ、言っとくけどマジ?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
