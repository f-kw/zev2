# callback detection verification prompt v001

あなたは、全文探索で見つかった別場面候補が、後の反応の本当の原因場面かを確認します。

## 判定

- `actual_separate_cause`: 後の反応を成立させた出来事そのものが別場面にあり、先に見ると反応の理由が具体的に分かる。
- `supporting_context_only`: 関連情報ではあるが、その反応を起こした原因そのものではない。
- `same_scene_recap`: 反応場面の内容を説明・言い換えしただけで、別の原因場面ではない。
- `unrelated`: 同じ話題や人物が出るだけで因果関係がない。
- `insufficient`: STTだけでは判断できない。

各対象について、`findings` にある発見だけを判定してください。新しい発話IDや時刻を作ってはいけません。`actual_separate_cause` が複数ある場合は、反応を理解するため最も直接必要な1件を `primaryFindingId` にし、残りを `alternativeFindingIds` に入れてください。該当がなければ `primaryFindingId` は `null` にします。

## 出力

説明やMarkdownを付けず、次のJSONだけを返してください。

```json
{
  "callbackDecisions": [
    {
      "targetId": "入力にあるtargetId",
      "decision": "actual_separate_cause",
      "primaryFindingId": "入力にあるfindingIdまたはnull",
      "alternativeFindingIds": [],
      "reason": "判定理由を1文"
    }
  ]
}
```

## 入力JSON

```json
{
  "task": "source_only_callback_detection_verification",
  "generationSystem": "callback-detection-v001@gemini-web-flash",
  "promptVersion": "callback_detection_verification_prompt_v001",
  "inputPolicy": {
    "sourceOnly": true,
    "noClipInfo": true,
    "noExpected": true,
    "noAlignment": true,
    "noHumanLabels": true,
    "selectExistingFindingIdsOnly": true
  },
  "target": {
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
  "findings": [
    {
      "findingId": "window_007_YE-faluP7zY-finding-01",
      "overlapGroupId": "YE-faluP7zY-candidate-12-group-01",
      "sourceVideoId": "YE-faluP7zY",
      "causeSpeechIds": [
        "65-71"
      ],
      "causeSegments": [
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
        }
      ],
      "sceneDescription": "サメに土台を食べられてしまう被害が発生し、サメを倒したかもしれないことに言及している場面。",
      "causalLink": "後の反応でサメ肉が3つあるのを見つけて「あ、サメ倒してたねそういえばね」と納得する原因となっている。",
      "missingContextSupplied": "事前にサメとの交戦や被害があったことを知ることで、後から見つかったサメ肉の由来が理解できるようになる。"
    },
    {
      "findingId": "seam_007_YE-faluP7zY-finding-01",
      "overlapGroupId": "YE-faluP7zY-candidate-12-group-01",
      "sourceVideoId": "YE-faluP7zY",
      "causeSpeechIds": [
        65,
        "66-71"
      ],
      "causeSegments": [
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
        }
      ],
      "sceneDescription": "イカダの土台がサメに食べられてしまい、ころねがサメに立ち向かっていた場面である。",
      "causalLink": "後の反応でマリンが「あ、サメ倒してたねそういえばね」と思い出すきっかけとなる直接の戦闘出来事である。",
      "missingContextSupplied": "後の反応で突然言及されるサメ肉の入手先や、サメを討伐したという事実が事前に起きていたことが理解できるようになる。"
    }
  ]
}
```
