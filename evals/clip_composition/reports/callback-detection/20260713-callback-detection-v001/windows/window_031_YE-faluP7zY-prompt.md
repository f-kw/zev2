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
    "windowId": "window_031_YE-faluP7zY",
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
      "speechId": 583,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4044951,
      "sourceEndMs": 4049492,
      "text": "板欲しいなー板かーえ、でも板さーここに"
    },
    {
      "speechId": 584,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4050822,
      "sourceEndMs": 4055446,
      "text": "たぶんさ13枚しかないわ13枚あるの?"
    },
    {
      "speechId": 585,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4055446,
      "sourceEndMs": 4074140,
      "text": "あるあるいただきいただきインカいただきストリートあれも作る、回収ネットも作りたいな作ろう2階を完成させるという当初の目的を急に思い出してきたえっとじゃあ何あ、とりあえず行きゃー!"
    },
    {
      "speechId": 586,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4074140,
      "sourceEndMs": 4079944,
      "text": "よしよしよしちょっとさ、さっきさお魚釣りするわOK"
    },
    {
      "speechId": 587,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4080646,
      "sourceEndMs": 4094315,
      "text": "じゃあ船長は次第を集めたいけど今何も流れてないからこれ引っかかってないよね大丈夫だよね動いてる動いてるめっちゃ釣れるじゃんこれ楽しいいいねロープどっかにあったのロープ?"
    },
    {
      "speechId": 588,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4094315,
      "sourceEndMs": 4095935,
      "text": "ロープ?"
    },
    {
      "speechId": 589,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4095935,
      "sourceEndMs": 4109864,
      "text": "まじイノスキにやられるかとお腹がまじめちゃめちゃになったわ今のイノスキでそんな笑うとは思わなかったよ腹よじれたガチでよじれた死ぬかと思ったまあ嬉しいよねまあ"
    },
    {
      "speechId": 590,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4110474,
      "sourceEndMs": 4122562,
      "text": "嬉しいよねクールな嬉しい嬉しいクールな犬がめちゃめちゃ嬉しいよなかなか進まないなせんちゃんも釣りしてダブルスタイルで行くかあれ?"
    },
    {
      "speechId": 591,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4122562,
      "sourceEndMs": 4125663,
      "text": "ほがほの向きがあれ?"
    },
    {
      "speechId": 592,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4125663,
      "sourceEndMs": 4139192,
      "text": "いやそうだね向きがあれかもちょっと待って開くかOKOK開きましての向かいも広いねあいいよいいよいいよ生きてる生きてる?"
    },
    {
      "speechId": 593,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4139192,
      "sourceEndMs": 4139852,
      "text": "うんうまく"
    },
    {
      "speechId": 594,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4140240,
      "sourceEndMs": 4154686,
      "text": "離れたから綺麗に離れたらもうたたむか閉じてりょりょりょのりょいや死ぬかと思ったな見て釣ったこれはもういいよなに釣った?"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
