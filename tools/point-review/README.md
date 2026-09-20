# ZEV ポイントレビュー v001

Codexです。task-011／Q2のローカル専用実装です。既存の `docs/reports/human-review-session-20260920-v001/comparison.html` の短区間提示を土台に、テンプレートとBatch別データを分離しました。過去のHTML・回答は変更しません。

## 作成と提示

```sh
node tools/point-review/build.mjs /absolute/path/review.json /absolute/path/new-review.html
node --test tools/point-review/point-review.test.mjs
```

`review.json` はCodexが作成する内部データです。人間にはJSON編集を求めず、生成されたHTMLを従来どおりローカルで直接開いてもらいます。サーバー、fetch、外部サービス、新依存はありません。生成器は既存ffprobeを使用し、対象MP4の実在・SHA-256・fps・総フレーム数を確認してから固定テンプレートへ内容を埋めます。メディアはコピーせず実在する絶対file URLを参照します。HTMLの移動後も元の動画pathが必要です。出力HTMLは既存ファイルを上書きしません。

ブラウザー操作に対する既存の拒否は維持します。本実装のコード試験はブラウザーの代用ではありません。自動でブラウザーを開く機能、localhost経由の回避、headless検査はありません。

## 固定形式

`core.mjs` の `validateReview` が必須項目・型・余分な項目の拒否・ID重複・参照・区間を定義します。全て必須で、Before／Afterは必要なポイントのviewsにだけ持たせます。

```json
{
  "schema_version": "zev-point-review-v001",
  "batch_id": "HRB-Q1-001",
  "revision": "v001",
  "title": "Panelの修正確認",
  "intro": "センタリングだけを確認します。",
  "media": [{
    "media_id": "panel-after",
    "label": "修正版",
    "path": "/absolute/path/panel-after.mp4",
    "sha256": "実動画の小文字64桁SHA-256へ置換",
    "fps_num": 30,
    "fps_den": 1,
    "total_frames": 180,
    "timeline_id": "digest-saved-v001",
    "timeline_start_frame": 450
  }],
  "points": [{
    "point_id": "Q1-PANEL-CENTER-1",
    "review_id": "HRC-001",
    "related_review_ids": ["HR-001"],
    "title": "背景に対する文字の位置",
    "question": "背景と文字のまとまりは整って見えますか。",
    "target_function": "Panel内部のセンタリング",
    "change_summary": "実際の文字の描画位置に背景を合わせました。",
    "why_human_review": "配置が自然に見えるかを確認します。",
    "scope": {
      "level": "point",
      "applies_to": ["この箇所のセンタリング修正"],
      "does_not_apply_to": ["背景意匠の好み", "フェード", "全編", "機能の使用許可"]
    },
    "views": [{
      "view_id": "corrected",
      "label": "修正版",
      "role": "candidate",
      "media_id": "panel-after",
      "start_frame": 30,
      "end_frame": 90,
      "context_start_frame": 0,
      "context_end_frame": 120
    }]
  }]
}
```

上の値は形式の説明であり、実動画を主張する入力fixtureではありません。

- `path` はJSONからの相対pathまたは絶対path。URL・外部配信は拒否します。
- フレームは媒体ごとのゼロ始まり、終端は排他。短尺の `timeline_start_frame` は元時計における短尺先頭です。各viewの秒数は自身の動画のfpsから算出します。
- `context_*` は人間が前後を広げたときだけ使う、準備済みの短い範囲です。UI側で任意の秒数を別動画へ使い回しません。
- 比較が必要なら `role: before` と `role: after` を一組にします。比較しない場合は `candidate` 一つと、必要な背景違いの `variant` を追加できます。初期表示はAfterまたはcandidateです。
- PointのID、媒体ID、同一ポイント内のview IDは一意。`review_id` は異なる例のポイントから同じ修正要求を参照できます。
- 関連review IDは説明用の参照です。回答を関連IDへ分配しません。まとまりへの問いは `scope.level: bundle` で保存します。
- センタリング・背景・滑らかさの問いは別ポイントにします。黒・Softの再採点は作成しません。

## 回答と対象の結び付け

回答は「良い／直したい／両方使える／判断しない」と任意コメントです。初期値は全て未回答です。「両方使える」は二つのviewを提示したポイントだけで有効で、その二つと記載された範囲に限定します。三つ以上の背景をまとめる場合は、コメントまたはポイント分割で意図を残します。

回答ファイルはレビュー用データ全体のSHA-256に加え、Batch、版、point ID、review ID、各動画SHA、フレーム範囲、元時計、反映範囲を保持します。全く同じ版だけで保存・再読・importできます。異なる版、重複、不足、別動画や別範囲は拒否し、読み込み失敗時は現在の回答を保持します。

「良い」をADOPTへ変換したり、機能使用許可・全編評価・課題CLOSEDへ昇格したりする処理はありません。表示した候補と実際に再生開始した候補は分けて保存します。再生開始は視聴完了・人間確認済みを意味しません。

localStorageはレビューのSHAごとに分離します。file URLの保存可否はブラウザー設定に依存し、拒否された場合はその場で表示して回答ファイルの取り出しを案内します。ブラウザー内のBlobダウンロードとローカルファイル選択でexport/importします。動画や回答の送信は行いません。

チャットで受け取った回答は、`blankAnswers` または保存済み回答へ `recordAnswer` を使い、該当する `point_id` と `source: "chat"`、回答原文を渡して同じ形式へ保存できます。原文の意味を自動で採用判断へ変換しません。修正対象が曖昧ならchoiceはnullのまま原文を保存できます。

## 検査範囲

Node試験は二組の異なるデータへの同一テンプレート投入、動画別時計、データと回答の不整合拒否、回答保存・再読・export/import、単一プレイヤーの終端停止、ポイント切替時の停止、遅れて返る再生開始の取消を検査します。UIの結線はDOMと動画イベントを模したコード試験です。

build結果の `browser_checked: false` と `human_quality_checked: false` は、生成やコード合格を実ブラウザー・人間品質の合格へ混ぜないための事実記録です。テスト内の短いbyte fixtureは媒体照合を試す合成入力で、レビュー用実動画ではありません。実Batchは実際のMP4を標準ffprobeで照合して別途生成します。
