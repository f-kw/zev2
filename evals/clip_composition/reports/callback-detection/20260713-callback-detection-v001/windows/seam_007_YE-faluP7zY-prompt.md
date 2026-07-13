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
    "windowId": "seam_007_YE-faluP7zY",
    "windowKind": "seam_bridge",
    "sourceVideoId": "YE-faluP7zY"
  },
  "targets": [
    {
      "targetId": "YE-faluP7zY-candidate-12",
      "title": "食料不足の中で鳥を仕留めるころね",
      "reason": "ココナッツしか取れず食料がしけてきた状況で、ころねが見事に鳥を殺して肉を確保し、マリンが驚き喜ぶ展開が綺麗にまとまっているため。",
      "reactionEvidence": {
        "sourceVideoId": "YE-faluP7zY",
        "speechIds": [
          77,
          78,
          79,
          80,
          81,
          82,
          83
        ],
        "segments": [
          {
            "speechId": 77,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 810330,
            "sourceEndMs": 817353,
            "text": "えっとちょっと待ってココナッツしか取れねぇよ食料確かにちょっとしけてきたなあでも足りない?"
          },
          {
            "speechId": 78,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 817353,
            "sourceEndMs": 818634,
            "text": "しけしけになってきた?"
          },
          {
            "speechId": 79,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 818634,
            "sourceEndMs": 822236,
            "text": "ちょっと若干了解あ!"
          },
          {
            "speechId": 80,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 822236,
            "sourceEndMs": 823876,
            "text": "鳥殺した!"
          },
          {
            "speechId": 81,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 823876,
            "sourceEndMs": 824557,
            "text": "鳥殺したの?"
          },
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
          }
        ]
      }
    },
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
      "speechId": 61,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 693822,
      "sourceEndMs": 695422,
      "text": "ちまにぶつかってみる?"
    },
    {
      "speechId": 62,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 695422,
      "sourceEndMs": 698183,
      "text": "ぶつかってしまったらば止まってしまうよね、ねえ?"
    },
    {
      "speechId": 63,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 698183,
      "sourceEndMs": 700804,
      "text": "でもなんか木材なかったかな?"
    },
    {
      "speechId": 64,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 700804,
      "sourceEndMs": 706967,
      "text": "島にあ、でも確かに木を凝るという発想はあるよねちょっと乗ってもいいかも乗ってもいいよね待って!"
    },
    {
      "speechId": 65,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 706967,
      "sourceEndMs": 707387,
      "text": "サメが!"
    },
    {
      "speechId": 66,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 707387,
      "sourceEndMs": 708367,
      "text": "あー!"
    },
    {
      "speechId": 67,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 708367,
      "sourceEndMs": 709128,
      "text": "あー!"
    },
    {
      "speechId": 68,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 709128,
      "sourceEndMs": 709448,
      "text": "いる?"
    },
    {
      "speechId": 69,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 709448,
      "sourceEndMs": 709768,
      "text": "食べてる?"
    },
    {
      "speechId": 70,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 709768,
      "sourceEndMs": 710288,
      "text": "食べてる?"
    },
    {
      "speechId": 71,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 710288,
      "sourceEndMs": 712989,
      "text": "うん、余裕で食べられたわマジ?"
    },
    {
      "speechId": 72,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 712989,
      "sourceEndMs": 719632,
      "text": "でもちょっとどうなんだろうこうやって氷河素材使って作ってもさ結局さ、食われるんだよなしっかりした土台"
    },
    {
      "speechId": 73,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 720866,
      "sourceEndMs": 748894,
      "text": "もしかしてなんか土台アーマーっていうので作るべきかもしかして土台アーマーとかあるんだえ、待ってこれ金属だわ金属重てえあ、でもやっぱ金属大事よこれ島ついたらうん下潜るかサメの餌作ってあ、待ってあれ作るわアンカー作りますお願いします一旦あれだね釣りもしなきゃだねあ、そう釣りもしたいねでも食料ねあれ食料庫にまだあったよありましたありましたとアンカー"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
