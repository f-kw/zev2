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
    "windowId": "window_048_YE-faluP7zY",
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
