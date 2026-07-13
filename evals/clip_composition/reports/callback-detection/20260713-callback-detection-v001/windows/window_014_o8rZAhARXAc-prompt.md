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
    "windowId": "window_014_o8rZAhARXAc",
    "windowKind": "primary",
    "sourceVideoId": "o8rZAhARXAc"
  },
  "targets": [
    {
      "targetId": "o8rZAhARXAc-candidate-25",
      "title": "チャットの指示で対戦相手を選んだ結果、Bランクの高校を引いて焦るシーン",
      "reason": "リスナー（キャージー）に選択を委ねた結果、手強いBランクの「ざまみ商業高校」を引き当ててしまい動揺するリアクションが面白いため。",
      "reactionEvidence": {
        "sourceVideoId": "o8rZAhARXAc",
        "speechIds": [
          565,
          566,
          567,
          568,
          569,
          570,
          571,
          572
        ],
        "segments": [
          {
            "speechId": 565,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5701367,
            "sourceEndMs": 5702247,
            "text": "どこにする?"
          },
          {
            "speechId": 566,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5702247,
            "sourceEndMs": 5714533,
            "text": "キャージーどれがいい?"
          },
          {
            "speechId": 567,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5714533,
            "sourceEndMs": 5719475,
            "text": "どれがいい?"
          },
          {
            "speechId": 568,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5719475,
            "sourceEndMs": 5721796,
            "text": "魔物でギリかキャージーに決めてもらうわはいはいはいえっと一番右オッケーじゃあ一番右で行きますけ!"
          },
          {
            "speechId": 569,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5721796,
            "sourceEndMs": 5728519,
            "text": "1?"
          },
          {
            "speechId": 570,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5728519,
            "sourceEndMs": 5729340,
            "text": "1Bかー"
          },
          {
            "speechId": 571,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5733894,
            "sourceEndMs": 5751200,
            "text": "ざま…ざまみ…ざまみ商業高校ざまみ…大丈夫かなぁ…Bって…Bやばいか?"
          },
          {
            "speechId": 572,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5751200,
            "sourceEndMs": 5755602,
            "text": "まぁ占い師踏んで…占い師踏んで…"
          }
        ]
      }
    }
  ],
  "sourceSegments": [
    {
      "speechId": 393,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4445458,
      "sourceEndMs": 4466549,
      "text": "わーお、脅威の切れ味でキレキレのスーパーノヴァをフブちゃん投げていく楽しいですねえ、これ、待って、これさ、あのさこれさ、きまし、あのさこれさ、1で、1でこの社員やって、もっかいスケジュール見直して1を狙う?"
    },
    {
      "speechId": 394,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4466549,
      "sourceEndMs": 4467570,
      "text": "星500乗った?"
    },
    {
      "speechId": 395,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4467570,
      "sourceEndMs": 4467950,
      "text": "ま?"
    },
    {
      "speechId": 396,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4471494,
      "sourceEndMs": 4472255,
      "text": "これMVPやっぞ!"
    },
    {
      "speechId": 397,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4472255,
      "sourceEndMs": 4474217,
      "text": "MVPやっぞ!"
    },
    {
      "speechId": 398,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4474217,
      "sourceEndMs": 4483247,
      "text": "1やってつけへんオッケオッケオッケオッケ行きましょう!"
    },
    {
      "speechId": 399,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4483247,
      "sourceEndMs": 4486111,
      "text": "お、ミゾット社員フジキ!"
    },
    {
      "speechId": 400,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4486111,
      "sourceEndMs": 4487272,
      "text": "お、機材交換!"
    },
    {
      "speechId": 401,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4487272,
      "sourceEndMs": 4488574,
      "text": "ティ待って?"
    },
    {
      "speechId": 402,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4488574,
      "sourceEndMs": 4488894,
      "text": "ティ?"
    },
    {
      "speechId": 403,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4505322,
      "sourceEndMs": 4509563,
      "text": "タブってるがなタブってますがな!"
    },
    {
      "speechId": 404,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4509563,
      "sourceEndMs": 4510564,
      "text": "ティーは壊れるからアリ?"
    },
    {
      "speechId": 405,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4510564,
      "sourceEndMs": 4520507,
      "text": "そっかアリかほなええかスケジュール見直しでもう一回行きますか予備ってことだよね?"
    },
    {
      "speechId": 406,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4520507,
      "sourceEndMs": 4528950,
      "text": "おっけおっけおっけあ、いいじゃんどっちにしよう?"
    },
    {
      "speechId": 407,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4528950,
      "sourceEndMs": 4529390,
      "text": "励ますか"
    },
    {
      "speechId": 408,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4530694,
      "sourceEndMs": 4559780,
      "text": "紅白線か走り込みか何で行こうこれいっぱい来た紅白線OKミムラ頼むぜマジでもうミムラは2回連続で美中を変えようとしてきたから次美中って言ったらお前のその色違いの眉毛むしりとるぞ何がかゆんや"
    },
    {
      "speechId": 409,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4560918,
      "sourceEndMs": 4565341,
      "text": "しばき倒されたくなかったらいい加減にしろお前ラオラ?"
    },
    {
      "speechId": 410,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4565341,
      "sourceEndMs": 4565902,
      "text": "ごく普通?"
    },
    {
      "speechId": 411,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4565902,
      "sourceEndMs": 4566782,
      "text": "え?"
    },
    {
      "speechId": 412,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4566782,
      "sourceEndMs": 4570005,
      "text": "どうしよう?"
    },
    {
      "speechId": 413,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4570005,
      "sourceEndMs": 4572187,
      "text": "え、君たちラオラって変えるべき?"
    },
    {
      "speechId": 414,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4572187,
      "sourceEndMs": 4574869,
      "text": "変えないべき?"
    },
    {
      "speechId": 415,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4574869,
      "sourceEndMs": 4578431,
      "text": "気持ちいいどう思う?"
    },
    {
      "speechId": 416,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4578431,
      "sourceEndMs": 4582574,
      "text": "ねぇ気持ちいいあかん?"
    },
    {
      "speechId": 417,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4582574,
      "sourceEndMs": 4582915,
      "text": "ダメ?"
    },
    {
      "speechId": 418,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4582915,
      "sourceEndMs": 4584276,
      "text": "もったいない?"
    },
    {
      "speechId": 419,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4584276,
      "sourceEndMs": 4585877,
      "text": "ごく普通は残す?"
    },
    {
      "speechId": 420,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4585877,
      "sourceEndMs": 4589420,
      "text": "わ、わかったそうするか変えないでいいか"
    },
    {
      "speechId": 421,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4590066,
      "sourceEndMs": 4592167,
      "text": "気になっても仕方ないあるか?"
    },
    {
      "speechId": 422,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4592167,
      "sourceEndMs": 4597071,
      "text": "それは確かにあ、だ!"
    },
    {
      "speechId": 423,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4597071,
      "sourceEndMs": 4602755,
      "text": "いけいけないバイバイねえ、これ何がいらない?"
    },
    {
      "speechId": 424,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4602755,
      "sourceEndMs": 4603855,
      "text": "気持ち!"
    },
    {
      "speechId": 425,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4603855,
      "sourceEndMs": 4606677,
      "text": "これ何がいらなーい?"
    },
    {
      "speechId": 426,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4606677,
      "sourceEndMs": 4619066,
      "text": "占い師も使えねえな、いつみむらしばき倒すぞ、ほんまにえんとう、わかったえんとう、遠藤くんでいくわ遠藤くんで遠藤くんでいくうん"
    },
    {
      "speechId": 427,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4622026,
      "sourceEndMs": 4649940,
      "text": "おー1、待って26、27、28、29あ、もう無理だ青マスなかったインタビューはもうないんだエントー君で行ってさあ合宿だ監督、今日から合宿です頑張りましょうかーこーお、やめろスワとフル"
    },
    {
      "speechId": 428,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 4651086,
      "sourceEndMs": 4662938,
      "text": "シャシャるなぁお前シャシャってくんななんでシャシャってきちゃったのどうしよう何がいいかなシオレンマリンが邪魔で見えない?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
