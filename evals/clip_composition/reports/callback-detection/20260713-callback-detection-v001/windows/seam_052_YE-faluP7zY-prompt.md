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
    "windowId": "seam_052_YE-faluP7zY",
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
      "speechId": 1113,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7654991,
      "sourceEndMs": 7655111,
      "text": "よし!"
    },
    {
      "speechId": 1114,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7655111,
      "sourceEndMs": 7655211,
      "text": "よし!"
    },
    {
      "speechId": 1115,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7655211,
      "sourceEndMs": 7655271,
      "text": "よし!"
    },
    {
      "speechId": 1116,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7655271,
      "sourceEndMs": 7655331,
      "text": "よし!"
    },
    {
      "speechId": 1117,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7655331,
      "sourceEndMs": 7655471,
      "text": "よし!"
    },
    {
      "speechId": 1118,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7655471,
      "sourceEndMs": 7655731,
      "text": "よし!"
    },
    {
      "speechId": 1119,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7655731,
      "sourceEndMs": 7655931,
      "text": "よし!"
    },
    {
      "speechId": 1120,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7655931,
      "sourceEndMs": 7656011,
      "text": "よし!"
    },
    {
      "speechId": 1121,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656011,
      "sourceEndMs": 7656151,
      "text": "よし!"
    },
    {
      "speechId": 1122,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656151,
      "sourceEndMs": 7656231,
      "text": "よし!"
    },
    {
      "speechId": 1123,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656231,
      "sourceEndMs": 7656291,
      "text": "よし!"
    },
    {
      "speechId": 1124,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656291,
      "sourceEndMs": 7656391,
      "text": "よし!"
    },
    {
      "speechId": 1125,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656391,
      "sourceEndMs": 7656451,
      "text": "よし!"
    },
    {
      "speechId": 1126,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656451,
      "sourceEndMs": 7656512,
      "text": "よし!"
    },
    {
      "speechId": 1127,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656512,
      "sourceEndMs": 7656572,
      "text": "よし!"
    },
    {
      "speechId": 1128,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656572,
      "sourceEndMs": 7656632,
      "text": "よし!"
    },
    {
      "speechId": 1129,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656632,
      "sourceEndMs": 7656912,
      "text": "よし!"
    },
    {
      "speechId": 1130,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656912,
      "sourceEndMs": 7656972,
      "text": "よし!"
    },
    {
      "speechId": 1131,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7656972,
      "sourceEndMs": 7657032,
      "text": "よし!"
    },
    {
      "speechId": 1132,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657032,
      "sourceEndMs": 7657092,
      "text": "よし!"
    },
    {
      "speechId": 1133,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657092,
      "sourceEndMs": 7657292,
      "text": "よし!"
    },
    {
      "speechId": 1134,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657292,
      "sourceEndMs": 7657372,
      "text": "よし!"
    },
    {
      "speechId": 1135,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657372,
      "sourceEndMs": 7657432,
      "text": "よし!"
    },
    {
      "speechId": 1136,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657432,
      "sourceEndMs": 7657492,
      "text": "よし!"
    },
    {
      "speechId": 1137,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657492,
      "sourceEndMs": 7657552,
      "text": "よし!"
    },
    {
      "speechId": 1138,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657552,
      "sourceEndMs": 7657712,
      "text": "よし!"
    },
    {
      "speechId": 1139,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657712,
      "sourceEndMs": 7657772,
      "text": "よし!"
    },
    {
      "speechId": 1140,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657772,
      "sourceEndMs": 7657892,
      "text": "よし!"
    },
    {
      "speechId": 1141,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657892,
      "sourceEndMs": 7657972,
      "text": "よし!"
    },
    {
      "speechId": 1142,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7657972,
      "sourceEndMs": 7658032,
      "text": "よし!"
    },
    {
      "speechId": 1143,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658032,
      "sourceEndMs": 7658092,
      "text": "よし!"
    },
    {
      "speechId": 1144,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658092,
      "sourceEndMs": 7658152,
      "text": "よし!"
    },
    {
      "speechId": 1145,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658152,
      "sourceEndMs": 7658212,
      "text": "よし!"
    },
    {
      "speechId": 1146,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658212,
      "sourceEndMs": 7658292,
      "text": "よし!"
    },
    {
      "speechId": 1147,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658292,
      "sourceEndMs": 7658352,
      "text": "よし!"
    },
    {
      "speechId": 1148,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658352,
      "sourceEndMs": 7658413,
      "text": "よし!"
    },
    {
      "speechId": 1149,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658413,
      "sourceEndMs": 7658473,
      "text": "よし!"
    },
    {
      "speechId": 1150,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658473,
      "sourceEndMs": 7658613,
      "text": "よし!"
    },
    {
      "speechId": 1151,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658613,
      "sourceEndMs": 7658713,
      "text": "よし!"
    },
    {
      "speechId": 1152,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658713,
      "sourceEndMs": 7658773,
      "text": "よし!"
    },
    {
      "speechId": 1153,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658773,
      "sourceEndMs": 7658833,
      "text": "よし!"
    },
    {
      "speechId": 1154,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7658833,
      "sourceEndMs": 7660254,
      "text": "よし!"
    },
    {
      "speechId": 1155,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7660254,
      "sourceEndMs": 7660454,
      "text": "よし!"
    },
    {
      "speechId": 1156,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7660454,
      "sourceEndMs": 7660694,
      "text": "よし!"
    },
    {
      "speechId": 1157,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7660694,
      "sourceEndMs": 7660814,
      "text": "よし!"
    },
    {
      "speechId": 1158,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7660814,
      "sourceEndMs": 7661074,
      "text": "よし!"
    },
    {
      "speechId": 1159,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7661074,
      "sourceEndMs": 7661294,
      "text": "よし!"
    },
    {
      "speechId": 1160,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7661294,
      "sourceEndMs": 7661474,
      "text": "よし!"
    },
    {
      "speechId": 1161,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7661474,
      "sourceEndMs": 7661814,
      "text": "よし!"
    },
    {
      "speechId": 1162,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7661814,
      "sourceEndMs": 7661934,
      "text": "よし!"
    },
    {
      "speechId": 1163,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7661934,
      "sourceEndMs": 7661994,
      "text": "よし!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
