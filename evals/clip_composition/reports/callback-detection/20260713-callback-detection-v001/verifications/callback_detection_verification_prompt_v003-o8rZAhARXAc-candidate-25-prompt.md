# callback detection verification prompt v003

あなたは、全文探索で見つかった別場面候補が、後の候補の**中心となる反応**の本当の原因場面かを確認します。

## v002からの修正

全文探索の通常窓と境界補完窓が同じ場面を見つけた場合、入力では同じ場面として1件にまとめます。`sameSceneFindingIds` はまとめる前の探索結果IDで、`findingId` はその場面を代表して選択するIDです。まとめた場面の発話証拠と因果説明は削除せず、重複だけを取り除いてあります。

## 中心反応の規則

`reactionEvidence` に複数の小話題が混ざる場合でも、末尾の脇話や偶然の一言だけを説明する場面は主原因にしません。`title` と `reason` が示す中心イベント・中心反応を成立させた別場面だけを `actual_separate_cause` とします。

## 判定

- `actual_separate_cause`: `title` と `reason` が示す中心反応を成立させた出来事そのものが別場面にあり、先に見ると中心反応の理由が具体的に分かる。
- `supporting_context_only`: 関連情報ではあるが、中心反応を起こした原因そのものではない。根拠末尾の脇話だけを説明する場面もここに含む。
- `same_scene_recap`: 反応場面の内容を説明・言い換えしただけで、別の原因場面ではない。
- `unrelated`: 同じ話題や人物が出るだけで因果関係がない。
- `insufficient`: STTだけでは判断できない。

各対象について、`findings` にある発見だけを判定してください。新しい発話IDや時刻を作ってはいけません。`actual_separate_cause` が複数ある場合は、中心反応を理解するため最も直接必要な1件の`findingId`を `primaryFindingId` にし、残りを `alternativeFindingIds` に入れてください。該当がなければ `primaryFindingId` は `null` にします。

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
  "promptVersion": "callback_detection_verification_prompt_v003",
  "inputPolicy": {
    "sourceOnly": true,
    "noClipInfo": true,
    "noExpected": true,
    "noAlignment": true,
    "noHumanLabels": true,
    "selectExistingFindingIdsOnly": true,
    "overlappingSearchFindingsAreGroupedWithoutDiscardingEvidence": true
  },
  "target": {
    "targetId": "o8rZAhARXAc-candidate-25",
    "title": "チャットの指示で対戦相手を選んだ結果、Bランクの高校を引いて焦るシーン",
    "reason": "リスナー（キャージー）に選択を委ねた結果、手強いBランクの「ざまみ商業高校」を引き当ててしまい動揺するリアクションが面白いため。",
    "reactionEvidence": {
      "sourceVideoId": "o8rZAhARXAc",
      "speechIds": [
        565,
        566,
        567,
        568,
        569,
        570,
        571,
        572
      ],
      "segments": [
        {
          "speechId": 565,
          "text": "どこにする?"
        },
        {
          "speechId": 566,
          "text": "キャージーどれがいい?"
        },
        {
          "speechId": 567,
          "text": "どれがいい?"
        },
        {
          "speechId": 568,
          "text": "魔物でギリかキャージーに決めてもらうわはいはいはいえっと一番右オッケーじゃあ一番右で行きますけ!"
        },
        {
          "speechId": 569,
          "text": "1?"
        },
        {
          "speechId": 570,
          "text": "1Bかー"
        },
        {
          "speechId": 571,
          "text": "ざま…ざまみ…ざまみ商業高校ざまみ…大丈夫かなぁ…Bって…Bやばいか?"
        },
        {
          "speechId": 572,
          "text": "まぁ占い師踏んで…占い師踏んで…"
        }
      ]
    }
  },
  "findings": [
    {
      "findingId": "window_018_o8rZAhARXAc-finding-01",
      "sameSceneFindingIds": [
        "window_018_o8rZAhARXAc-finding-01"
      ],
      "overlapGroupId": "o8rZAhARXAc-candidate-25-group-01",
      "causeSegments": [
        {
          "speechId": 556,
          "text": "さてうわー組み合わせ抽選会やだ怖いわーやだー監督組み合わせ抽選会に参加しませんか?"
        },
        {
          "speechId": 557,
          "text": "どの学校も強豪校ばかりですが甲子園優勝を目指して対戦相手を確認しましょう行ってきます了解しましたでは会場に向かいましょう"
        },
        {
          "speechId": 558,
          "text": "やばい!"
        },
        {
          "speechId": 559,
          "text": "Aとかいるんだけどマリンが邪魔ですよねすいませんどきまーすやばくない?"
        },
        {
          "speechId": 560,
          "text": "AってコヨリAに当たって勝てた?"
        },
        {
          "speechId": 561,
          "text": "え?"
        },
        {
          "speechId": 562,
          "text": "すごくない?"
        },
        {
          "speechId": 563,
          "text": "Aに勝ったん?"
        },
        {
          "speechId": 564,
          "text": "もう進みますかAに勝つってもうコヨリSってことじゃん"
        }
      ],
      "causalClaims": [
        "抽選の画面で強豪校の存在に怯えていた直後の場面であるため、キャージー（リスナー）の指示で選んだ結果Bランクの高校を引き当てて動揺する反応に直接繋がっている。"
      ]
    }
  ]
}
```
