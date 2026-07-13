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
    "windowId": "seam_034_YE-faluP7zY",
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
      "speechId": 662,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4485567,
      "sourceEndMs": 4491629,
      "text": "大丈夫全然大したことじゃないよかったでも気になるなに?"
    },
    {
      "speechId": 663,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4491629,
      "sourceEndMs": 4499672,
      "text": "そこにパッケージ落としちゃったからあ、なるほどね拾ったわフフフナイスナイスフフフナイスフフフ"
    },
    {
      "speechId": 664,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4500000,
      "sourceEndMs": 4501901,
      "text": "ここすごいたるい!"
    },
    {
      "speechId": 665,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4501901,
      "sourceEndMs": 4503002,
      "text": "あ、来た!"
    },
    {
      "speechId": 666,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4503002,
      "sourceEndMs": 4505604,
      "text": "ライオン!"
    },
    {
      "speechId": 667,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4505604,
      "sourceEndMs": 4516312,
      "text": "あれも拾おうか自分で拾いに行ってる助かるわこれ回収ネットで拾えるからねダイオン今日という虚構図つけるあれ?"
    },
    {
      "speechId": 668,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4516312,
      "sourceEndMs": 4516973,
      "text": "何が?"
    },
    {
      "speechId": 669,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4516973,
      "sourceEndMs": 4519194,
      "text": "もしかして下にコンロあるから?"
    },
    {
      "speechId": 670,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4519194,
      "sourceEndMs": 4521716,
      "text": "なんでダメなのこれ?"
    },
    {
      "speechId": 671,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4521716,
      "sourceEndMs": 4526640,
      "text": "説明よろしく頼むで作れない?"
    },
    {
      "speechId": 672,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4526640,
      "sourceEndMs": 4529642,
      "text": "そりゃ参ったな君たち説明して"
    },
    {
      "speechId": 673,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4530130,
      "sourceEndMs": 4531331,
      "text": "あ、そうだ!"
    },
    {
      "speechId": 674,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4531331,
      "sourceEndMs": 4531951,
      "text": "そうだそうだ!"
    },
    {
      "speechId": 675,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4531951,
      "sourceEndMs": 4535332,
      "text": "土台じゃないんだった、そういえばそうなの?"
    },
    {
      "speechId": 676,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4535332,
      "sourceEndMs": 4548779,
      "text": "これだ、木製フロアだライオンあ、こうだこうだ思い出しましたあ、もう板なくなっちゃったまじ、板全然ないあ、板ね、ここにね、今ね、20枚入ってるナイスー!"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
