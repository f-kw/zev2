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
    "windowId": "seam_049_YE-faluP7zY",
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
      "speechId": 1016,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6971648,
      "sourceEndMs": 6972829,
      "text": "どっちがいい?"
    },
    {
      "speechId": 1017,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6972829,
      "sourceEndMs": 6975330,
      "text": "お好みで君たちに聞いてるの?"
    },
    {
      "speechId": 1018,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6975330,
      "sourceEndMs": 6989518,
      "text": "君たちに聞いてるこうねには聞かないちょっと拗ねちゃった新しいあれを作ろう焼けたの?"
    },
    {
      "speechId": 1019,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6991386,
      "sourceEndMs": 6993226,
      "text": "一番下がなんだっけ?"
    },
    {
      "speechId": 1020,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6993226,
      "sourceEndMs": 7005529,
      "text": "一番下が鉱石系ほしいっけネオガニタンなにサメ復活してんじゃんあいつ生き返ってるわサメえ、粘土はどうする?"
    },
    {
      "speechId": 1021,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7005529,
      "sourceEndMs": 7015031,
      "text": "んー、粘土粘土か、じゃあ新しい作るわ粘土砂系のストレージを今から作りますマジ?"
    },
    {
      "speechId": 1022,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7015031,
      "sourceEndMs": 7019772,
      "text": "そのためにはね板が必要なんだ板ね、板ね今一番上に入れとるんでな"
    },
    {
      "speechId": 1023,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7020182,
      "sourceEndMs": 7036194,
      "text": "あ、そうだったさあもうどこにあるか聞くこともなく20枚しかないあ、でも全然助かるちょっとこれでじゃああ、この箱拾おうかあ、待って待って待って行かないで大丈夫?"
    },
    {
      "speechId": 1024,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7036194,
      "sourceEndMs": 7036354,
      "text": "大丈夫か?"
    },
    {
      "speechId": 1025,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7036354,
      "sourceEndMs": 7041157,
      "text": "な、荷物落としたサメ来てる荷物落とした荷物落とした大丈夫?"
    },
    {
      "speechId": 1026,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7041157,
      "sourceEndMs": 7043459,
      "text": "え、待って拾えた?"
    },
    {
      "speechId": 1027,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7043459,
      "sourceEndMs": 7049243,
      "text": "わかんないどっか行った何を落としたんだ私"
    },
    {
      "speechId": 1028,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7052286,
      "sourceEndMs": 7052626,
      "text": "くそー!"
    },
    {
      "speechId": 1029,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7052626,
      "sourceEndMs": 7053107,
      "text": "くそだー!"
    },
    {
      "speechId": 1030,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7053107,
      "sourceEndMs": 7055248,
      "text": "か、かつおー!"
    },
    {
      "speechId": 1031,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7055248,
      "sourceEndMs": 7058290,
      "text": "くそよー!"
    },
    {
      "speechId": 1032,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7058290,
      "sourceEndMs": 7058730,
      "text": "ちょっとあれだねあー!"
    },
    {
      "speechId": 1033,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7058730,
      "sourceEndMs": 7060331,
      "text": "食べられんのよ!"
    },
    {
      "speechId": 1034,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7060331,
      "sourceEndMs": 7061572,
      "text": "は?"
    },
    {
      "speechId": 1035,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7061572,
      "sourceEndMs": 7061872,
      "text": "は?"
    },
    {
      "speechId": 1036,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7061872,
      "sourceEndMs": 7061972,
      "text": "は?"
    },
    {
      "speechId": 1037,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7061972,
      "sourceEndMs": 7062092,
      "text": "は?"
    },
    {
      "speechId": 1038,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7062092,
      "sourceEndMs": 7065555,
      "text": "食べられちゃったえ、ど、どこ?"
    },
    {
      "speechId": 1039,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7065555,
      "sourceEndMs": 7066655,
      "text": "あ、か、ん?"
    },
    {
      "speechId": 1040,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7066655,
      "sourceEndMs": 7066996,
      "text": "床?"
    },
    {
      "speechId": 1041,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7066996,
      "sourceEndMs": 7078903,
      "text": "あ、でもね、今ね、追い払った、素手であ、回収ネット減ったってことかうん、なんか、か、噛みちぎられた、か、噛みちぎられたかと思いきやー思いきやーいや、噛みちぎられてるね"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
