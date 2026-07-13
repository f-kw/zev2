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
    "windowId": "window_009_YE-faluP7zY",
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
      "speechId": 82,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 824557,
      "sourceEndMs": 825157,
      "text": "食べれる?"
    },
    {
      "speechId": 83,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 825157,
      "sourceEndMs": 839584,
      "text": "食べれる食べれるちょっと待って鳥肉が絶対取れる食べてみて食べてみてOKOKOKOKちゃんと火通すんよOKあ、こんなとこでサメ肉3つあんじゃんラッキーラッキーラッキーじゃなくてラッキーとかじゃないねあ、サメ倒してたねそういえばね"
    },
    {
      "speechId": 84,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 840194,
      "sourceEndMs": 840494,
      "text": "完全忘れてたよね?"
    },
    {
      "speechId": 85,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 840494,
      "sourceEndMs": 859444,
      "text": "ちょっと待って、これ焼いてとこれちょっと拾ってともうちょっと一個食べてとなるほどねで、閉まってちょっとサメ肉閉まってで、このチキンを焼いてとやばっ!"
    },
    {
      "speechId": 86,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 859444,
      "sourceEndMs": 859605,
      "text": "くっそー!"
    },
    {
      "speechId": 87,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 859605,
      "sourceEndMs": 860065,
      "text": "どうした?"
    },
    {
      "speechId": 88,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 860065,
      "sourceEndMs": 860165,
      "text": "どうした?"
    },
    {
      "speechId": 89,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 860165,
      "sourceEndMs": 860485,
      "text": "何が来た?"
    },
    {
      "speechId": 90,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 860485,
      "sourceEndMs": 861386,
      "text": "鳥が!"
    },
    {
      "speechId": 91,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 861386,
      "sourceEndMs": 861626,
      "text": "鳥が来てる!"
    },
    {
      "speechId": 92,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 861626,
      "sourceEndMs": 863347,
      "text": "大丈夫か?"
    },
    {
      "speechId": 93,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 863347,
      "sourceEndMs": 864327,
      "text": "ダメージ?"
    },
    {
      "speechId": 94,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 864327,
      "sourceEndMs": 864687,
      "text": "平気?"
    },
    {
      "speechId": 95,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 864687,
      "sourceEndMs": 864927,
      "text": "ダメージ?"
    },
    {
      "speechId": 96,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 864927,
      "sourceEndMs": 867669,
      "text": "大丈夫、ダメージ大丈夫まだ平気ほんと?"
    },
    {
      "speechId": 97,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 867669,
      "sourceEndMs": 868349,
      "text": "心配かけたな"
    },
    {
      "speechId": 98,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 870042,
      "sourceEndMs": 874784,
      "text": "言うほど心配してないよ心配してーよー!"
    },
    {
      "speechId": 99,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 874784,
      "sourceEndMs": 875844,
      "text": "はいはい、あれ?"
    },
    {
      "speechId": 100,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 875844,
      "sourceEndMs": 877525,
      "text": "あれ?"
    },
    {
      "speechId": 101,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 877525,
      "sourceEndMs": 878365,
      "text": "心配して?"
    },
    {
      "speechId": 102,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 878365,
      "sourceEndMs": 884347,
      "text": "心配ねしてるしてるちょっと待って、一旦荷物預けて雑すぎ気づいた?"
    },
    {
      "speechId": 103,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 884347,
      "sourceEndMs": 899732,
      "text": "雑すぎんやんいやでもマリリンは反応が雑でもこういうゲームのね作業ちゃんとするから偉いと思うわ謎のフォローが入りましたそうなんよ船長ってちょっとね反応たまに雑になるけどでもちゃんとするからねそう言うてね"
    },
    {
      "speechId": 104,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 900098,
      "sourceEndMs": 904802,
      "text": "営業をしっかりしてるところがコーポイントだよね、マジでうん、わかるわかる?"
    },
    {
      "speechId": 105,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 904802,
      "sourceEndMs": 925239,
      "text": "わかりみが深いえ、ちょ、せんちゃんあれするわあのさぁ海藻とか探すわあのね、結構ねあ、あ、ありがてありがて柔道のネマネマとかがね、今後必要になってくることはサメ、気をつけてね間違いない、オッケーでもさぁ、冷静に考えてさぁうんこうやって、目標がさぁ、どんどん変わってくからさぁ今、するべきことって痛っ、ヤバい!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
