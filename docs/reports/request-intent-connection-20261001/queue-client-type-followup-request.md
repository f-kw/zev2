# v005のclient型追従一件 — GPT_DECISION

App.vueの既存成果物表示名一覧は全FileRef kindを必須とする。Digest二kindの追加でclient型検査だけが不一致になる。画面・入力の追加は不要。v005§5はApp.vueを明示clip送信だけへ限定するため、下記二つの表示名を既存一覧へ足す一差分を相談役へ返す。現在は未変更。既存7種の表示・挙動は維持する。

```diff
-    output_video: '完成動画'
+    output_video: '完成動画',
+    digest_plan_json: 'Digest計画',
+    digest_execution_input_json: 'Digest入力検証'
```

shared/backend/runner/Remotionの型検査は合格。clientはこの二kindの未定義で失敗。隔離接続試験はまだ正式実行前、旧証拠の履歴確認は96file・21固定Git blob一致。製品本適用・動画許可・新UIは依頼しない。
