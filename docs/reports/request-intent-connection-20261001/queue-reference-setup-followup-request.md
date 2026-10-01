# GPT_DECISION：局所参照試験の書き起こしbinding設営修正1件

参照対応の製品修正は本人承認どおり累積4回目として適用済み。stdout誤検出除去は設営5回目。局所試験attempt-003で、試験用saveが書き起こしを版付きJSON参照にし、存在しない版情報を新しい探索計画へ未定義値として入れた。既存の正式JSON直列化が正しく拒否した。通常runnerの制作意図経路・製品serializer・内容validatorの欠陥ではなく、試験の参照型の組立てだけに不足がある。追加作用は停止、修正は未適用。

推奨する一差分はqueue-integration-test.mtsの局所references枝だけ。書き起こしは旧bytesをそのまま保存し、版情報を持たないbytes参照でregistryに入れる。通常run／caller／provider／旧回答・旧attemptを変えない。以下の具体案を監査し、この設営修正1件（適用時累積6回目）と検証続行を許可できるか返してほしい。一般5回枠・履歴のリセットやAGENTS変更は求めない。

```ts
const transcriptBinding = {path: `artifacts/${draft}/${stt}/transcript.json`, fileSha256: sha(transcriptBytes)};
await writeFile(dataPath(transcriptBinding.path), transcriptBytes, {flag: 'wx'});
values.set(transcriptBinding.path, transcript);
bindings.set(transcriptBinding.path, transcriptBinding);
```

現物はqueue-reference-setup-failure-attempt-003.jsonと対象試験49〜59行。失敗attempt-003を保持し、再許可時は新しい局所attemptから開始する。参照対応・内部閉包検査の製品差分は型検査済みだが、局所試験および通常登録／後段complete・upload／別root・MP4／未提供枝・否定回帰は未完了。その他の製品修正は要求しない。
