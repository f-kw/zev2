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
    "windowId": "window_053_YE-faluP7zY",
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
    },
    {
      "speechId": 1164,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7661994,
      "sourceEndMs": 7662114,
      "text": "よし!"
    },
    {
      "speechId": 1165,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7662114,
      "sourceEndMs": 7662335,
      "text": "よし!"
    },
    {
      "speechId": 1166,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7662335,
      "sourceEndMs": 7662535,
      "text": "よし!"
    },
    {
      "speechId": 1167,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7662535,
      "sourceEndMs": 7663975,
      "text": "よし!"
    },
    {
      "speechId": 1168,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7663975,
      "sourceEndMs": 7664176,
      "text": "よし!"
    },
    {
      "speechId": 1169,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7664176,
      "sourceEndMs": 7664476,
      "text": "よし!"
    },
    {
      "speechId": 1170,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7664476,
      "sourceEndMs": 7664536,
      "text": "よし!"
    },
    {
      "speechId": 1171,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7664536,
      "sourceEndMs": 7664836,
      "text": "よし!"
    },
    {
      "speechId": 1172,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7664836,
      "sourceEndMs": 7664916,
      "text": "よし!"
    },
    {
      "speechId": 1173,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7664916,
      "sourceEndMs": 7665156,
      "text": "よし!"
    },
    {
      "speechId": 1174,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7665156,
      "sourceEndMs": 7665496,
      "text": "よし!"
    },
    {
      "speechId": 1175,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7665496,
      "sourceEndMs": 7665596,
      "text": "よし!"
    },
    {
      "speechId": 1176,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7665596,
      "sourceEndMs": 7666617,
      "text": "よし!"
    },
    {
      "speechId": 1177,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7666617,
      "sourceEndMs": 7666677,
      "text": "よし!"
    },
    {
      "speechId": 1178,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7666677,
      "sourceEndMs": 7667777,
      "text": "よし!"
    },
    {
      "speechId": 1179,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7667777,
      "sourceEndMs": 7667838,
      "text": "よし!"
    },
    {
      "speechId": 1180,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7667838,
      "sourceEndMs": 7667898,
      "text": "よし!"
    },
    {
      "speechId": 1181,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7667898,
      "sourceEndMs": 7667958,
      "text": "よし!"
    },
    {
      "speechId": 1182,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7667958,
      "sourceEndMs": 7668038,
      "text": "よし!"
    },
    {
      "speechId": 1183,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7668038,
      "sourceEndMs": 7668438,
      "text": "よし!"
    },
    {
      "speechId": 1184,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7668438,
      "sourceEndMs": 7668818,
      "text": "よし!"
    },
    {
      "speechId": 1185,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7668818,
      "sourceEndMs": 7669058,
      "text": "よし!"
    },
    {
      "speechId": 1186,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7669058,
      "sourceEndMs": 7669899,
      "text": "よし!"
    },
    {
      "speechId": 1187,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7669899,
      "sourceEndMs": 7672500,
      "text": "よし!"
    },
    {
      "speechId": 1188,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7672500,
      "sourceEndMs": 7673861,
      "text": "よし!"
    },
    {
      "speechId": 1189,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7673861,
      "sourceEndMs": 7673921,
      "text": "よし!"
    },
    {
      "speechId": 1190,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7673921,
      "sourceEndMs": 7673981,
      "text": "よし!"
    },
    {
      "speechId": 1191,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7673981,
      "sourceEndMs": 7674121,
      "text": "よし!"
    },
    {
      "speechId": 1192,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7674121,
      "sourceEndMs": 7674301,
      "text": "よし!"
    },
    {
      "speechId": 1193,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7674301,
      "sourceEndMs": 7674361,
      "text": "よし!"
    },
    {
      "speechId": 1194,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7674361,
      "sourceEndMs": 7674421,
      "text": "よし!"
    },
    {
      "speechId": 1195,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7674421,
      "sourceEndMs": 7676382,
      "text": "よし!"
    },
    {
      "speechId": 1196,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7676382,
      "sourceEndMs": 7676462,
      "text": "よし!"
    },
    {
      "speechId": 1197,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7676462,
      "sourceEndMs": 7676662,
      "text": "よし!"
    },
    {
      "speechId": 1198,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7676662,
      "sourceEndMs": 7676742,
      "text": "よし!"
    },
    {
      "speechId": 1199,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7676742,
      "sourceEndMs": 7676802,
      "text": "よし!"
    },
    {
      "speechId": 1200,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7676802,
      "sourceEndMs": 7676862,
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
