# callback detection verification prompt v002

あなたは、全文探索で見つかった別場面候補が、後の候補の**中心となる反応**の本当の原因場面かを確認します。

## v001からの修正

`reactionEvidence` に複数の小話題が混ざる場合でも、末尾の脇話や偶然の一言だけを説明する場面は主原因にしません。`title` と `reason` が示す中心イベント・中心反応を成立させた別場面だけを `actual_separate_cause` とします。

## 判定

- `actual_separate_cause`: `title` と `reason` が示す中心反応を成立させた出来事そのものが別場面にあり、先に見ると中心反応の理由が具体的に分かる。
- `supporting_context_only`: 関連情報ではあるが、中心反応を起こした原因そのものではない。根拠末尾の脇話だけを説明する場面もここに含む。
- `same_scene_recap`: 反応場面の内容を説明・言い換えしただけで、別の原因場面ではない。
- `unrelated`: 同じ話題や人物が出るだけで因果関係がない。
- `insufficient`: STTだけでは判断できない。

各対象について、`findings` にある発見だけを判定してください。新しい発話IDや時刻を作ってはいけません。`actual_separate_cause` が複数ある場合は、中心反応を理解するため最も直接必要な1件を `primaryFindingId` にし、残りを `alternativeFindingIds` に入れてください。該当がなければ `primaryFindingId` は `null` にします。

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
  "promptVersion": "callback_detection_verification_prompt_v002",
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
          "text": "えっとちょっと待ってココナッツしか取れねぇよ食料確かにちょっとしけてきたなあでも足りない?"
        },
        {
          "speechId": 78,
          "text": "しけしけになってきた?"
        },
        {
          "speechId": 79,
          "text": "ちょっと若干了解あ!"
        },
        {
          "speechId": 80,
          "text": "鳥殺した!"
        },
        {
          "speechId": 81,
          "text": "鳥殺したの?"
        },
        {
          "speechId": 82,
          "text": "食べれる?"
        },
        {
          "speechId": 83,
          "text": "食べれる食べれるちょっと待って鳥肉が絶対取れる食べてみて食べてみてOKOKOKOKちゃんと火通すんよOKあ、こんなとこでサメ肉3つあんじゃんラッキーラッキーラッキーじゃなくてラッキーとかじゃないねあ、サメ倒してたねそういえばね"
        }
      ]
    }
  },
  "findings": [
    {
      "findingId": "window_007_YE-faluP7zY-finding-01",
      "overlapGroupId": "YE-faluP7zY-candidate-12-group-01",
      "causeSpeechIds": [
        "65-71"
      ],
      "causeSegments": [
        {
          "speechId": 65,
          "text": "サメが!"
        },
        {
          "speechId": 66,
          "text": "あー!"
        },
        {
          "speechId": 67,
          "text": "あー!"
        },
        {
          "speechId": 68,
          "text": "いる?"
        },
        {
          "speechId": 69,
          "text": "食べてる?"
        },
        {
          "speechId": 70,
          "text": "食べてる?"
        },
        {
          "speechId": 71,
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
      "causeSpeechIds": [
        65,
        "66-71"
      ],
      "causeSegments": [
        {
          "speechId": 65,
          "text": "サメが!"
        },
        {
          "speechId": 66,
          "text": "あー!"
        },
        {
          "speechId": 67,
          "text": "あー!"
        },
        {
          "speechId": 68,
          "text": "いる?"
        },
        {
          "speechId": 69,
          "text": "食べてる?"
        },
        {
          "speechId": 70,
          "text": "食べてる?"
        },
        {
          "speechId": 71,
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
