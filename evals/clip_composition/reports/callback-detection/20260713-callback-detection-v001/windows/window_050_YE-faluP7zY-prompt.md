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
    "windowId": "window_050_YE-faluP7zY",
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
      "speechId": 1042,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7081634,
      "sourceEndMs": 7108474,
      "text": "え、なんかついたけど島にそう、島ついちゃったからちょっとあれ回す方つけてあれするわ終わったえっと石はでもそんなあれかこっちに石石は何に何に該当するんだろうそれで言うとえ、鉱石じゃないのやっぱりあ、確かに鉱石か確かになえっと"
    },
    {
      "speechId": 1043,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7110258,
      "sourceEndMs": 7139944,
      "text": "楽しい分けるの鳥の声する鳥来てるねでもさ天井があるからさやられなくて済むねいや、愉快だな愉快だね愉快だよスクラッツ、ロープ、蝶津貝待って、持ち物パンパンだったドンベリーアンカー降ろさなくていいわちょっと今一周してきちゃう一周しようと思ったけど島広広い一周できるほどじゃないいや、広すぎだわ"
    },
    {
      "speechId": 1044,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7140062,
      "sourceEndMs": 7160328,
      "text": "ちょっとびっくりしちゃったサーバー置いていつの間にかこんなに拾ってるじゃん板も32枚あるでなOK32枚めっちゃ絨毯だって絨毯?"
    },
    {
      "speechId": 1045,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7160328,
      "sourceEndMs": 7169130,
      "text": "絨毯すごいじゃん絨毯文明が来てるな文明がやばいなこれをこうして"
    },
    {
      "speechId": 1046,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7169698,
      "sourceEndMs": 7170000,
      "text": "ありがとうございました"
    },
    {
      "speechId": 1047,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7171942,
      "sourceEndMs": 7177404,
      "text": "イノシシやりに行こうかやるんですかこれかどう?"
    },
    {
      "speechId": 1048,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7177404,
      "sourceEndMs": 7180545,
      "text": "どうする?"
    },
    {
      "speechId": 1049,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7180545,
      "sourceEndMs": 7199652,
      "text": "まあでもイノシシやるなら昼になってからかな一旦ここセーブしておくわじゃあちょっと下ワカメとか取ってこようかなOKOK行ってきまーすスクラップどっかで見たよなあ綺麗スクラップあそうだコーネがもうやってくれたのかでもそんなにスクラップなかった気がする"
    },
    {
      "speechId": 1050,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7200418,
      "sourceEndMs": 7222096,
      "text": "あ、少ないねスクラップスクラップ少ないよな海の中にあるか見てみるわこうなってくるとストレージがね作れないからねあ、やべ、水筒忘れた水筒だってあ、かわいい満足げななんだっけ?"
    },
    {
      "speechId": 1051,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7222096,
      "sourceEndMs": 7227080,
      "text": "何を入れたいから作ってるんだっけ今これ何を入れたいって言ってたっけ?"
    },
    {
      "speechId": 1052,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7227080,
      "sourceEndMs": 7228541,
      "text": "マリリー?"
    },
    {
      "speechId": 1053,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7228541,
      "sourceEndMs": 7229502,
      "text": "鉱石じゃないかったっけ?"
    },
    {
      "speechId": 1054,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7231334,
      "sourceEndMs": 7235317,
      "text": "鉱石?"
    },
    {
      "speechId": 1055,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7235317,
      "sourceEndMs": 7235397,
      "text": "違った?"
    },
    {
      "speechId": 1056,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7235397,
      "sourceEndMs": 7259298,
      "text": "君たちに聞いた方が早いかもしれないね待って、どんどん流されてるあ、砂とか粘土だった、砂とか粘土あ、砂とか粘土あ、そっか、鳥がいるんだほらよほらよほらよ砂とか粘土しまっとくかうん、こうしてで、ここに砂とか粘土ねオッケー"
    },
    {
      "speechId": 1057,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7265323,
      "sourceEndMs": 7288098,
      "text": "ブドウのベトベトとかそういうさりげないやつはさどうしようかなブドウのベトベトは逆に小さいそのさ、タンスに入れといてさあーそういう、あーなるほどねあぶねー確かにの方がいいかなーそんなんでもいらんもんねそうだね確かにツール系"
    },
    {
      "speechId": 1058,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7292063,
      "sourceEndMs": 7296965,
      "text": "あ、なんかあれか、釣竿とかやべ、めっちゃ流されてるやばい!"
    },
    {
      "speechId": 1059,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7296965,
      "sourceEndMs": 7297826,
      "text": "行くぞ!"
    },
    {
      "speechId": 1060,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7297826,
      "sourceEndMs": 7298886,
      "text": "戻るぞ!"
    },
    {
      "speechId": 1061,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7298886,
      "sourceEndMs": 7301788,
      "text": "待って、そっちに戻るからねマイ、大丈夫?"
    },
    {
      "speechId": 1062,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7301788,
      "sourceEndMs": 7303049,
      "text": "いける?"
    },
    {
      "speechId": 1063,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7303049,
      "sourceEndMs": 7306070,
      "text": "ほうね、あれするわ、回すほんと?"
    },
    {
      "speechId": 1064,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7306070,
      "sourceEndMs": 7308292,
      "text": "ほーんと?"
    },
    {
      "speechId": 1065,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7308292,
      "sourceEndMs": 7312934,
      "text": "ほーんとだよこっちに、これでいいかな?"
    },
    {
      "speechId": 1066,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7312934,
      "sourceEndMs": 7319298,
      "text": "これたぶんじわじわ行くはずいやマジ、申し訳ねえないや、これは"
    },
    {
      "speechId": 1067,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7320202,
      "sourceEndMs": 7349370,
      "text": "マリンにお土産に持って帰ろうお土産なんだろ楽しみ楽しみにしといて板、1、2、3、4、あ、でも5枚くらい取れてるのか、結構いいなよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよし"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
