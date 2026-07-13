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
    "windowId": "seam_031_YE-faluP7zY",
    "windowKind": "seam_bridge",
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
      "speechId": 595,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4154686,
      "sourceEndMs": 4165790,
      "text": "見て釣ったよちっちぇなねえ頑張ったんだけどなんかその顔のデカさに対してのスケール感がさああそんなんじゃなかったごめんね焼きまーす"
    },
    {
      "speechId": 596,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4166934,
      "sourceEndMs": 4169542,
      "text": "とみちゃんも釣り竿作るかネジスクラップ"
    },
    {
      "speechId": 597,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4172355,
      "sourceEndMs": 4175696,
      "text": "釣竿壊れたんですけど絵も壊れたの?"
    },
    {
      "speechId": 598,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4175696,
      "sourceEndMs": 4190561,
      "text": "自分で作りまーす偉いね自分で作って偉い偉いあでも板いるんか素材集めまーす金属で作る?"
    },
    {
      "speechId": 599,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4190561,
      "sourceEndMs": 4192702,
      "text": "金属だと作れるもったいなくない?"
    },
    {
      "speechId": 600,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4192702,
      "sourceEndMs": 4199724,
      "text": "いやそんなことないでしょむしろ板使わないし金属の釣竿で長く使えるしありやね"
    },
    {
      "speechId": 601,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4200866,
      "sourceEndMs": 4202386,
      "text": "スクールアップでじゃあ、よろしくお願いしまーす!"
    },
    {
      "speechId": 602,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4202386,
      "sourceEndMs": 4202646,
      "text": "オッケーでーす!"
    },
    {
      "speechId": 603,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4202646,
      "sourceEndMs": 4229712,
      "text": "あ、待って、お腹すいてベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベ"
    },
    {
      "speechId": 604,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4230258,
      "sourceEndMs": 4233359,
      "text": "ここにいっぱい…他人事?"
    },
    {
      "speechId": 605,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4233359,
      "sourceEndMs": 4233799,
      "text": "OK!"
    },
    {
      "speechId": 606,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4233799,
      "sourceEndMs": 4236259,
      "text": "釣竿できました!"
    },
    {
      "speechId": 607,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4236259,
      "sourceEndMs": 4236799,
      "text": "助かる!"
    },
    {
      "speechId": 608,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4236799,
      "sourceEndMs": 4237699,
      "text": "助かる!"
    },
    {
      "speechId": 609,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4237699,
      "sourceEndMs": 4238900,
      "text": "渡しまーす!"
    },
    {
      "speechId": 610,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4238900,
      "sourceEndMs": 4240980,
      "text": "ありがとうございます!"
    },
    {
      "speechId": 611,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4240980,
      "sourceEndMs": 4242040,
      "text": "Thankyouverymuch!"
    },
    {
      "speechId": 612,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4242040,
      "sourceEndMs": 4242280,
      "text": "すごい!"
    },
    {
      "speechId": 613,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4242280,
      "sourceEndMs": 4243321,
      "text": "資材もいっぱい来てる!"
    },
    {
      "speechId": 614,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4243321,
      "sourceEndMs": 4245021,
      "text": "どんどん拾うわよ!"
    },
    {
      "speechId": 615,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4245021,
      "sourceEndMs": 4246521,
      "text": "取る取る取る!"
    },
    {
      "speechId": 616,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4246521,
      "sourceEndMs": 4246901,
      "text": "いいよ!"
    },
    {
      "speechId": 617,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4246901,
      "sourceEndMs": 4248482,
      "text": "ここに取るから!"
    },
    {
      "speechId": 618,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4248482,
      "sourceEndMs": 4249482,
      "text": "ここ取れるのか?"
    },
    {
      "speechId": 619,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4249482,
      "sourceEndMs": 4254543,
      "text": "空腹の雨より視界がぼやけてる今お魚焼いてるからね!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
