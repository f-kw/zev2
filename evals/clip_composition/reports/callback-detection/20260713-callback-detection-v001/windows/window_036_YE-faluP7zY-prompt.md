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
    "windowId": "window_036_YE-faluP7zY",
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
      "speechId": 699,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4681742,
      "sourceEndMs": 4708723,
      "text": "今ねちょっとだけ整理したけどそんなの知らずに全然関係ないの入れちゃったよ今全然今そんな整理してる場合ではないその素材を集めなさいいいんだよすみませんこれ一回回収するかこれを一回外して生酢焼こう生酢掘ってさ"
    },
    {
      "speechId": 700,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4710220,
      "sourceEndMs": 4711940,
      "text": "上にあるものだよね?"
    },
    {
      "speechId": 701,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4711940,
      "sourceEndMs": 4716601,
      "text": "2階にあるあー確かになーえ、どうなんだろう?"
    },
    {
      "speechId": 702,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4716601,
      "sourceEndMs": 4718382,
      "text": "わかんなくなってきた2階にあるものなのかな?"
    },
    {
      "speechId": 703,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4718382,
      "sourceEndMs": 4719762,
      "text": "え、どうだろう?"
    },
    {
      "speechId": 704,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4719762,
      "sourceEndMs": 4720722,
      "text": "聞いてみる?"
    },
    {
      "speechId": 705,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4720722,
      "sourceEndMs": 4723203,
      "text": "君たちー?"
    },
    {
      "speechId": 706,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4723203,
      "sourceEndMs": 4725003,
      "text": "家具、君たちー?"
    },
    {
      "speechId": 707,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4725003,
      "sourceEndMs": 4738066,
      "text": "止まりさせてください家具作らないあ、でも家具あ、壁をささっきさ、壁をさあのほら、葉っぱにしたらオシャレだよねって話したよねあ、いてたねん?"
    },
    {
      "speechId": 708,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4738066,
      "sourceEndMs": 4739146,
      "text": "サメかと思ったら気のせいだったわ"
    },
    {
      "speechId": 709,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4740034,
      "sourceEndMs": 4750240,
      "text": "コーネだよコーネがザバッと上がってくる音でしたそうだよこうしてなんか一緒にオープニングの画面の家いいなーって言ってなんかさあ、そうそうそうそうそうなぜそう?"
    },
    {
      "speechId": 710,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4750240,
      "sourceEndMs": 4764669,
      "text": "ちょっといいなと思いましてあーどこに柱ここ行けっすかあ、魚いっぱいあるやんこれナマズ焼きたいなー何がダメなのかな?"
    },
    {
      "speechId": 711,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4764669,
      "sourceEndMs": 4767290,
      "text": "勝手に焼けーっつってねじゃあ行きまーす焼いてください何がダメなの?"
    },
    {
      "speechId": 712,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4767290,
      "sourceEndMs": 4769672,
      "text": "行きまーす柱の数足りないもしかして"
    },
    {
      "speechId": 713,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4771050,
      "sourceEndMs": 4771970,
      "text": "いけるだろ?"
    },
    {
      "speechId": 714,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4771970,
      "sourceEndMs": 4773051,
      "text": "ビビってんのか?"
    },
    {
      "speechId": 715,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4773051,
      "sourceEndMs": 4779554,
      "text": "足りないのあったら言ってね分かったこれいけると思うんだけどな全然木材がない?"
    },
    {
      "speechId": 716,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4779554,
      "sourceEndMs": 4798021,
      "text": "本当はないじゃん今ねストレージに22枚なら入ってるよいいじゃんさすがこうね葉っぱばっか眺めてくんじゃねーよいらねーつってんだろうがよ"
    },
    {
      "speechId": 717,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4802562,
      "sourceEndMs": 4807504,
      "text": "どうだと思うとカツオでしかない嫌だって言ってただろ!"
    },
    {
      "speechId": 718,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4807504,
      "sourceEndMs": 4826970,
      "text": "アッパばっかり舐めやがってカツオが怒ってるよカツオがカツオを釣るよ、そしたら磯野家だ海で全部揃うじゃんね、サザエさんねそういうテーマなんじゃないの?"
    },
    {
      "speechId": 719,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4826970,
      "sourceEndMs": 4827190,
      "text": "確かに"
    },
    {
      "speechId": 720,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4830974,
      "sourceEndMs": 4831414,
      "text": "なに?"
    },
    {
      "speechId": 721,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4831414,
      "sourceEndMs": 4838499,
      "text": "マジで待って、弾が、弾がそろわないよ、弾があ、マリン!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
