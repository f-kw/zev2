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
