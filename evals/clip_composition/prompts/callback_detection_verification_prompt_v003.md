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
