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
    "windowId": "window_010_YE-faluP7zY",
    "windowKind": "primary",
    "sourceVideoId": "YE-faluP7zY"
  },
  "targets": [
    {
      "targetId": "YE-faluP7zY-candidate-58",
      "title": "置き去りにされそうになって焦る戌神ころね",
      "reason": "マリン船長が移動する中で、置き去りにされそうになったころねが「犬かきで行く」と可愛く宣言した直後、どんどん距離が離れていって絶叫する見どころのある展開になっているため。",
      "reactionEvidence": {
        "sourceVideoId": "YE-faluP7zY",
        "speechIds": [
          927,
          928,
          929,
          930,
          931
        ],
        "segments": [
          {
            "speechId": 927,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6300522,
            "sourceEndMs": 6328283,
            "text": "で、大区画のあ、蝶津貝もいるのかちょっと下に潜って探すねありがとうどうしよう、どんどんこの隙に移動しててさコーネが置き去りにされていてしまったらば置き去りにされたらコーネはでも犬かけにそっちまで行くねなかわいいかわいい!"
          },
          {
            "speechId": 928,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6328283,
            "sourceEndMs": 6328883,
            "text": "届きましたよ!"
          },
          {
            "speechId": 929,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6332538,
            "sourceEndMs": 6335759,
            "text": "そういうとこがね、好きなんだねえ、やだぁ?"
          },
          {
            "speechId": 930,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6335759,
            "sourceEndMs": 6336419,
            "text": "んん?"
          },
          {
            "speechId": 931,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6336419,
            "sourceEndMs": 6361383,
            "text": "待て待て、めっちゃwwwこ、こね、どんどん離れていってるwwwまねぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇでも、ほんと?"
          }
        ]
      }
    },
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
      "speechId": 106,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 925239,
      "sourceEndMs": 926740,
      "text": "ちょっと待っている?"
    },
    {
      "speechId": 107,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 926740,
      "sourceEndMs": 928241,
      "text": "いやああああああああああああああ"
    },
    {
      "speechId": 108,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 932566,
      "sourceEndMs": 934587,
      "text": "気をつけてこれイノシシいるの?"
    },
    {
      "speechId": 109,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 934587,
      "sourceEndMs": 953740,
      "text": "イノシシもいるわこれわかった助太刀に行こうちょっと矢でさ撃ち殺すかイノシシパーティーしよう今日はここにイノシシいるわしし鍋しし丼しししちゅうみたいなしししちゅうしたいしししちゅうそっかこいつはもう食べれるんだよな多分なそうだよ弓矢あれ弓矢ってどかなかったっけ持ってる?"
    },
    {
      "speechId": 110,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 953740,
      "sourceEndMs": 959944,
      "text": "弓矢どっかにあったはずコーネ持ってないんだなコーネ持ってないあったあったちょっとさ弓矢でさ"
    },
    {
      "speechId": 111,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 960122,
      "sourceEndMs": 989832,
      "text": "殺すわ食べようよ食べたいこれで撃てるのかな行くわそっち待ってあれマリゾネスどこマリゾネスまだイカダイカダにいる鳥もいるしねなんかねイノシシ2匹ぐらいいたから気をつけてなOKもうみんな撃ち殺すから任してセイチョ結構エイムにはね自信あるからそうでしょ自信はねあったところってなんだよどういう意味だよちょっと待って自信だけ"
    },
    {
      "speechId": 112,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 990278,
      "sourceEndMs": 993519,
      "text": "もうダメなんだよこれコロゾネス待った方がいいやつ?"
    },
    {
      "speechId": 113,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 993519,
      "sourceEndMs": 1001441,
      "text": "コロゾネス待たなくていいよずっとベリーだって食べちゃうどこだ?"
    },
    {
      "speechId": 114,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1001441,
      "sourceEndMs": 1006182,
      "text": "どこだちょっと待って一緒にゴーデスとか行かなこれじゃあイカダでちょっと待っとくか?"
    },
    {
      "speechId": 115,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1006182,
      "sourceEndMs": 1009243,
      "text": "オッケーちょっと待ってなイカダどこだ?"
    },
    {
      "speechId": 116,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1009243,
      "sourceEndMs": 1011184,
      "text": "じゃあヤ、ヤちょっと弓?"
    },
    {
      "speechId": 117,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1011184,
      "sourceEndMs": 1011864,
      "text": "ヤ、ヤ弓?"
    },
    {
      "speechId": 118,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1011864,
      "sourceEndMs": 1014365,
      "text": "死ぬかもしれんこれ嘘でしょ?"
    },
    {
      "speechId": 119,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1014365,
      "sourceEndMs": 1019166,
      "text": "ちょっとヤと作っとこうコーネも一緒に一緒にさ弓やする?"
    },
    {
      "speechId": 120,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1021002,
      "sourceEndMs": 1022723,
      "text": "殺した方が早く殺せるか!"
    },
    {
      "speechId": 121,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1022723,
      "sourceEndMs": 1034412,
      "text": "そうそうそう、ちょっとロープちょっと作ってブドウのネバネバはちょっと海藻で作るかなんかそう、1個だ1個もないっけなこれえ、見失っちゃった?"
    },
    {
      "speechId": 122,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1034412,
      "sourceEndMs": 1039036,
      "text": "待てねーちょっと待てーどっかにないか?"
    },
    {
      "speechId": 123,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1039036,
      "sourceEndMs": 1046161,
      "text": "ネバネバあ、ここね鉱石あるなさてさてさてちょっとまとめてやの数が少ないって!"
    },
    {
      "speechId": 124,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1046161,
      "sourceEndMs": 1049624,
      "text": "アドバイスパソーカーなんとない時にね"
    },
    {
      "speechId": 125,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1050106,
      "sourceEndMs": 1058648,
      "text": "違う、違う違うね、ごめんねやめてね、そんなつもりじゃないからねや、や、やーだけにやめてもう何も言えねえ!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
