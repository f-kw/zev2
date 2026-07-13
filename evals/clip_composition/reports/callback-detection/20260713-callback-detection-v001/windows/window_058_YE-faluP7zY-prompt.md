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
    "windowId": "window_058_YE-faluP7zY",
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
      "speechId": 1332,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8700386,
      "sourceEndMs": 8700506,
      "text": "あ、ほんと?"
    },
    {
      "speechId": 1333,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8700506,
      "sourceEndMs": 8702366,
      "text": "え、ないっすそれはちょっと待って、一回荷物しまわないとおらよおらよ何が足りない?"
    },
    {
      "speechId": 1334,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8702366,
      "sourceEndMs": 8729872,
      "text": "石、石、石おらよ石持ってあ、月が見える方向に行った方がいいかなあ、月の方向…あ、待って待ってあ、待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って"
    },
    {
      "speechId": 1335,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8730218,
      "sourceEndMs": 8732779,
      "text": "場所決めて言うわあっすいませんほんとにえーとアンカーアンカーあれ?"
    },
    {
      "speechId": 1336,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8732779,
      "sourceEndMs": 8733919,
      "text": "アン…あれ?"
    },
    {
      "speechId": 1337,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8733919,
      "sourceEndMs": 8759306,
      "text": "あ拾えなかったのかちょちょちょちょっと待てよ待てよいいねごめんねおらよおらよおらよおらよいやドキドキするなこれ"
    },
    {
      "speechId": 1338,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8760034,
      "sourceEndMs": 8783482,
      "text": "待ってよ、アンカーできたあ、違うわこれディスクトップのゴミだったわで、これで落としてとなんか島が見えるけど島ないよね近くにねないね、今アンカー落としてアンカー落としましてはいあ、島見えるわ、島見えるあ、見える?"
    },
    {
      "speechId": 1339,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8783482,
      "sourceEndMs": 8790000,
      "text": "見える島、ちっちゃい島で、今ね夕日が、どっち方向ってなんて言えばいいの"
    },
    {
      "speechId": 1340,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8790060,
      "sourceEndMs": 8798884,
      "text": "これ、コンパスもないからさ島が見えるでしょあ、こっち?"
    },
    {
      "speechId": 1341,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8798884,
      "sourceEndMs": 8800185,
      "text": "島で合流する?"
    },
    {
      "speechId": 1342,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8800185,
      "sourceEndMs": 8805267,
      "text": "島にさ、漂着して待ってよそうね、島これ、同じ島なんかな?"
    },
    {
      "speechId": 1343,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8805267,
      "sourceEndMs": 8818834,
      "text": "これ確かにえ、じゃ、あのさ船長のさ配信でちょっと見てよ、島のオッケーオッケー様子あ、木が生えている島かこれじゃなさそう"
    },
    {
      "speechId": 1344,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8820374,
      "sourceEndMs": 8850000,
      "text": "ダメじゃないねじゃないかあっちからアソキその島も探すわそしたらコーネと合流できない後ろにいるのかなこれうわサメなんかに死んでさぁもういっそ合流するって手もある確かにそれなぁうんそんなにサメの肉がもったいねえと思ったがまぁ別にしないよねそんなこと言ってる場合ではないぬるっと頑張って集め直せばいい"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
