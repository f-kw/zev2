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
    "windowId": "window_033_YE-faluP7zY",
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
      "speechId": 629,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4264307,
      "sourceEndMs": 4289544,
      "text": "お味はですね、これ食べてアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアム"
    },
    {
      "speechId": 630,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4290094,
      "sourceEndMs": 4308985,
      "text": "なめんなよサメだからって撮影が高いえっとネット壊されちゃったなこれは痛えネットでもどうしようかなとりあえず気にしちゃいけない気にしちゃ負けだわあそういうこと?"
    },
    {
      "speechId": 631,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4308985,
      "sourceEndMs": 4319892,
      "text": "うんとりあえずちょっとお魚釣って食材多めに確保しといてOKあナマズ釣ったナマズあナマズいいよナマズいい食料"
    },
    {
      "speechId": 632,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4320114,
      "sourceEndMs": 4348870,
      "text": "いいよー盛りだくさんだからナマズはプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリ"
    },
    {
      "speechId": 633,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4350866,
      "sourceEndMs": 4354127,
      "text": "ここなんでできない?"
    },
    {
      "speechId": 634,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4354127,
      "sourceEndMs": 4359148,
      "text": "ここなんでできない?"
    },
    {
      "speechId": 635,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4359148,
      "sourceEndMs": 4362929,
      "text": "ティラピアかーここなんでできない?"
    },
    {
      "speechId": 636,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4362929,
      "sourceEndMs": 4367131,
      "text": "ここなんでできない?"
    },
    {
      "speechId": 637,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4367131,
      "sourceEndMs": 4367271,
      "text": "キメチ?"
    },
    {
      "speechId": 638,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4367271,
      "sourceEndMs": 4368391,
      "text": "ここなんでできない?"
    },
    {
      "speechId": 639,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4368391,
      "sourceEndMs": 4368991,
      "text": "あ、柱が足りない?"
    },
    {
      "speechId": 640,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4368991,
      "sourceEndMs": 4369611,
      "text": "こんなにあるのに?"
    },
    {
      "speechId": 641,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4369611,
      "sourceEndMs": 4370812,
      "text": "柱足りない?"
    },
    {
      "speechId": 642,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4370812,
      "sourceEndMs": 4379194,
      "text": "うん、足りなかったしっかりした木の柱ダメじゃん何柱が足りない?"
    },
    {
      "speechId": 643,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4379194,
      "sourceEndMs": 4379694,
      "text": "何柱が?"
    },
    {
      "speechId": 644,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4382826,
      "sourceEndMs": 4385147,
      "text": "イノスケってさ柱ですか?"
    },
    {
      "speechId": 645,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4385147,
      "sourceEndMs": 4387227,
      "text": "イノスケは柱じゃないんじゃない?"
    },
    {
      "speechId": 646,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4387227,
      "sourceEndMs": 4394109,
      "text": "柱じゃないかここに1個いてこれでいけるかな?"
    },
    {
      "speechId": 647,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4394109,
      "sourceEndMs": 4401190,
      "text": "もう1個くらいいるか?"
    },
    {
      "speechId": 648,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4401190,
      "sourceEndMs": 4409592,
      "text": "水も作っといてこれ焼かなきゃなそういえば意外と板"
    },
    {
      "speechId": 649,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4411581,
      "sourceEndMs": 4412382,
      "text": "あ、ない?"
    },
    {
      "speechId": 650,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4412382,
      "sourceEndMs": 4426994,
      "text": "すぐ無くなってしまうよね分かる板拾いに海に落ちるわなんかワイルドないよ集め方今来ないっしょ多分今?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
