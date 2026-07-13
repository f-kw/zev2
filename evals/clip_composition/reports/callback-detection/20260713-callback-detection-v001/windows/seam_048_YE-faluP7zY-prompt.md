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
    "windowId": "seam_048_YE-faluP7zY",
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
    },
    {
      "speechId": 997,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6792473,
      "sourceEndMs": 6800778,
      "text": "はーいはーいはーいあ、待って何かあ、なんかあ、ヒロちゃんヒロちゃんナイスナイスナイスヒロちゃんナイス?"
    },
    {
      "speechId": 998,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6800778,
      "sourceEndMs": 6810000,
      "text": "じゃあちょっとここにでかいストレージ置いたことによってここから整理整頓を今からここから始めましょうOK言われたら今度やっとく"
    },
    {
      "speechId": 999,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6810022,
      "sourceEndMs": 6814025,
      "text": "え、じゃあねーどうしたらいいと思う?"
    },
    {
      "speechId": 1000,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6814025,
      "sourceEndMs": 6838782,
      "text": "え、待ってあれなんかあるよ、こうね、あそこほらほらほんとや飛び込んで、待ってわかった、向かうわそっちにこらよえっとこらねこらよえ、もうちょっとこっちかこらよでもさっきサメ殺したからワンチャン安定しかいね、まだあれかもね、来ないかもねワンチャン安定してる、安牌"
    },
    {
      "speechId": 1001,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6840222,
      "sourceEndMs": 6841343,
      "text": "チャンスタイムまであれ?"
    },
    {
      "speechId": 1002,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6841343,
      "sourceEndMs": 6870000,
      "text": "ちょっと見るわうーんとねあ、カゴ拾ったえぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇ"
    },
    {
      "speechId": 1003,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6870114,
      "sourceEndMs": 6881063,
      "text": "じわじわ送るよなオッケー何を拾ったかと言いますとあ、レシピとネジとあ、いいじゃんネジあ、でもしょうもないなそれぐらいか?"
    },
    {
      "speechId": 1004,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6881063,
      "sourceEndMs": 6883925,
      "text": "あ、それぐらいかまあまあまあ板20枚入ってたの?"
    },
    {
      "speechId": 1005,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6883925,
      "sourceEndMs": 6890751,
      "text": "あ、いいじゃんおいしいね助かるねおいしいおいしいあ、じゃあさどうしようか板さここに全部しまう?"
    },
    {
      "speechId": 1006,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6890751,
      "sourceEndMs": 6896756,
      "text": "あ、そうだなんか上からさなんか使う資材順みたいなあ、じゃあ一番上板にする?"
    },
    {
      "speechId": 1007,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6896756,
      "sourceEndMs": 6898637,
      "text": "そうやねん使う資材順にちょっと入れていくかオッケー"
    },
    {
      "speechId": 1008,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6900970,
      "sourceEndMs": 6919398,
      "text": "楽しくなってきたぞなってきたね整理整頓始まったなねーどうやって分けるのがいいかなちょっと君たちおすすめの分け方をねコメントで教えてください木材&ロープ次がプラ&スクラップだって木材&ロープはいで?"
    },
    {
      "speechId": 1009,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6919398,
      "sourceEndMs": 6921339,
      "text": "プラ&スクラップ?"
    },
    {
      "speechId": 1010,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6921339,
      "sourceEndMs": 6928882,
      "text": "そうでその下が鉱石鉱石系もろもろ終わったこれ分からすぎな"
    },
    {
      "speechId": 1011,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6930382,
      "sourceEndMs": 6946514,
      "text": "また箱増やすわじゃあもっとわかりやすくするためにありがとね寄れるのりょうじゃあやっぱこの階段際のデッドスペースをやっぱり活かすのがやはりこれ大人の女のやることだから大人の女だなそうでしょ?"
    },
    {
      "speechId": 1012,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6946514,
      "sourceEndMs": 6959784,
      "text": "さすがやわここはあえて斜めにするかそれとも素直にこうドドンといくか悩むないいじゃんおしゃれやなどっちがいいかな"
    },
    {
      "speechId": 1013,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6962083,
      "sourceEndMs": 6965825,
      "text": "楽しいこうかな?"
    },
    {
      "speechId": 1014,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6965825,
      "sourceEndMs": 6969707,
      "text": "こうな気がする何?"
    },
    {
      "speechId": 1015,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6969707,
      "sourceEndMs": 6971648,
      "text": "斜めのがいい?"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
