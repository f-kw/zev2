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
    "windowId": "seam_058_YE-faluP7zY",
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
      "speechId": 1345,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8850220,
      "sourceEndMs": 8875610,
      "text": "そうね、死のうかワンチャンありやでじゃあ進んでいいよ一旦コーネが帰ってきたからするわ一旦ね、一応ねさよなら、サメの肉サメならさ、この広い海にいくらでもごまんと嫌がるからな終わった、じゃあまた倒すわ何回でも殺せるさ"
    },
    {
      "speechId": 1346,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8877478,
      "sourceEndMs": 8909872,
      "text": "じゃあさせっかくだからさ深海の方に行ってみるわ何かあるかもしれないからあー確かに何かあるかもねずっと下に潜ってる超怖いこれ怖いよ息がまだねまだ深海に潜れる怖っなんかね実績ロック解除した何メートル以上潜るとみたいなのあるんだねあるのかもしれないこれいい"
    },
    {
      "speechId": 1347,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8912655,
      "sourceEndMs": 8929445,
      "text": "なかなか死なんなえ、なんかめっちゃ頑張ってる酸素、意外と切れないんだなこれね、再開すればいいんかそうだね、死んだ、あ、死んだ?"
    },
    {
      "speechId": 1348,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8929445,
      "sourceEndMs": 8930766,
      "text": "死んだどうだった?"
    },
    {
      "speechId": 1349,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8930766,
      "sourceEndMs": 8938130,
      "text": "深海なんもなかったなんもないんかい起きたかなこうね、いるか?"
    },
    {
      "speechId": 1350,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8950618,
      "sourceEndMs": 8969884,
      "text": "寂しいよゴーヌこれちょっとアンカーで外しちゃうねごめんねでぼっちにさしちゃってはい急にスンって資材使ってほらもう葉っぱのストレージになってるじゃん上のやつはそうね木ここに入れたここにあここにねそう一旦ここにした終わったじゃあちょっとこうねフック作りたいから"
    },
    {
      "speechId": 1351,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8971195,
      "sourceEndMs": 8999272,
      "text": "使ってもらってどんどん使ってくださいレディーザーを作らせてもらってこれだなこれだな確かに葉っぱって序盤めっちゃ足りなく感じたけどもうもはやもういないよなゴミかのように大量にでも今ね壁に使ってるから結構これで消化するかもしれないじゃあもっと拾おうわGoogleChromeがクラッシュしたマジ?"
    },
    {
      "speechId": 1352,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8999272,
      "sourceEndMs": 8999552,
      "text": "OK今"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
