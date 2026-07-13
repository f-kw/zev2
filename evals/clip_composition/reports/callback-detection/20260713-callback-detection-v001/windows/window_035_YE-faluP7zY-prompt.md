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
    "windowId": "window_035_YE-faluP7zY",
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
      "speechId": 677,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4548779,
      "sourceEndMs": 4551780,
      "text": "ナイスー!"
    },
    {
      "speechId": 678,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4551780,
      "sourceEndMs": 4559584,
      "text": "集めるの達人じゃん、こうね私なすばらしい全然サメがここないんだけどいいねいいよね、これね"
    },
    {
      "speechId": 679,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4561908,
      "sourceEndMs": 4589210,
      "text": "もはや船いらねえんじゃねえかぐらいのいかだいらねえんじゃねえかちょっと言い過ぎたきていりますいかだいりますすみませんでした情けないな情けないですねこれは申し訳ない生酢やっとこうかないいね食料もしっかりね生酢食べるか食べて何の音だこれハマった音か板集めてとか"
    },
    {
      "speechId": 680,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4590034,
      "sourceEndMs": 4590114,
      "text": "ぽろり?"
    },
    {
      "speechId": 681,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4590114,
      "sourceEndMs": 4590154,
      "text": "ん?"
    },
    {
      "speechId": 682,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4590154,
      "sourceEndMs": 4590314,
      "text": "どこだ?"
    },
    {
      "speechId": 683,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4590314,
      "sourceEndMs": 4591955,
      "text": "あっ大丈夫?"
    },
    {
      "speechId": 684,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4591955,
      "sourceEndMs": 4592115,
      "text": "させっか!"
    },
    {
      "speechId": 685,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4592115,
      "sourceEndMs": 4596457,
      "text": "これでちょっと荷物整理したいなぁこれでよし、一旦OKだよいしょん?"
    },
    {
      "speechId": 686,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4596457,
      "sourceEndMs": 4596578,
      "text": "ん?"
    },
    {
      "speechId": 687,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4596578,
      "sourceEndMs": 4596618,
      "text": "ん?"
    },
    {
      "speechId": 688,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4596618,
      "sourceEndMs": 4619170,
      "text": "ランララランランランランラララララランランランラララララランランラララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララ"
    },
    {
      "speechId": 689,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4620226,
      "sourceEndMs": 4624969,
      "text": "コーネがご機嫌だとマリリンも嬉しくなっちゃうんだよほんと?"
    },
    {
      "speechId": 690,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4624969,
      "sourceEndMs": 4626690,
      "text": "どれぐらい嬉しい?"
    },
    {
      "speechId": 691,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4626690,
      "sourceEndMs": 4631633,
      "text": "普通ぐらい普通だったよそれは果たして嬉しいのかな?"
    },
    {
      "speechId": 692,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4631633,
      "sourceEndMs": 4642419,
      "text": "人並みの嬉しさがあるあ、あれ撮ろうかなあ、でも資材がいっぱいかちょっと一回しまうかねえ生ガツオがさ焼けるの早いよあ、ほんと?"
    },
    {
      "speechId": 693,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4642419,
      "sourceEndMs": 4648763,
      "text": "うん速さの差とかあるんかな?"
    },
    {
      "speechId": 694,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4648763,
      "sourceEndMs": 4649504,
      "text": "ちょっとねうまいうまーい"
    },
    {
      "speechId": 695,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4651874,
      "sourceEndMs": 4653995,
      "text": "おまーい?"
    },
    {
      "speechId": 696,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4653995,
      "sourceEndMs": 4654115,
      "text": "おまーい?"
    },
    {
      "speechId": 697,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4654115,
      "sourceEndMs": 4658518,
      "text": "葉っぱありすぎだろ葉っぱいらんまであるレベルまで来てる?"
    },
    {
      "speechId": 698,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4658518,
      "sourceEndMs": 4679452,
      "text": "うん、葉っぱいらんまであるそんなに集まったかーこんなんいらんだろレベルね、あるよこれ鉱石やるかなんで必要な時になかったんかお前たちみたいな感じになってる確かに序盤でめっちゃ足りなかったよねそうだよ、ないやねんマジでぶどうのベッドベッド"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
