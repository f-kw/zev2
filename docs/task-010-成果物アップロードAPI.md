# task-010 成果物アップロードAPI

作成日: 2026-06-29
更新日: 2026-06-29

## 目的

- AIエージェントが外部処理で作った成果物本体を、backendの成果物置き場へ保存できるようにする。
- 完了報告では成果物本文を受け取らず、保存済み成果物参照だけを検証して状態へ残す。
- 大きなJSONや動画本体を状態ファイル、AI操作ログ、作業履歴APIへ混ぜない境界を保つ。

## 作業スコープ

今回やること:

- `PUT /api/artifacts/:draftId/:fileName` を追加する。
- 対象下書きが存在する場合だけ保存する。
- ファイル名は単一ファイル名だけを受け付け、別下書きや別ディレクトリへ保存できないようにする。
- `ZEV2_AGENT_API_TOKEN` 設定時は、成果物アップロードもAIエージェント認証の対象にする。
- 保存した成果物のURI、保存ファイル名、バイト数、SHA-256、MIME typeを返す。
- runner側で、直接保存する方式とアップロードする方式を設定で切り替えられるようにする。
- 同じファイル名の再アップロードは拒否する。
- 状態ファイルには成果物本文を保存しないことをシナリオテストで確認する。

今回やらないこと:

- backendでSTT、LLM、Gemini API、動画生成を実行しない。
- アップロードだけでAI工程を完了扱いにしない。
- 成果物本文をUI主導線へ表示しない。

## 実装結果

- アップロードAPIは、JSON body parserより前に配置し、リクエスト本文をファイルへ保存する。
- 保存後に返されたURIを `POST /api/agent-requests/:id/complete` の `fileRef.uri` に渡す。
- 完了APIは、対象下書き配下の実ファイル、工程に合う成果物種別、MP4実体、バイト数、SHA-256を確認してから状態へ `FileRef` を保存する。
- アップロードAPI自体は状態を更新しない。状態更新は完了APIだけが行う。
- `artifactDelivery.mode` が `local` の場合、runnerは従来通り `runtime/artifacts` へ直接保存する。
- `artifactDelivery.mode` が `upload` の場合、runnerは `runtime/runner-artifacts` で成果物を作り、backendへアップロードしてから完了APIへ進む。
- `artifactDelivery.mode` が `upload` の場合、runnerは後続工程の開始前に、対象下書きの保存済み成果物をbackendから `runtime/runner-artifacts` へ取得する。これにより、別runnerや再起動後のrunnerでも前工程成果物を読める。

## 確認方法

- `pnpm run type-check`
- `pnpm run scenario:agent`
- `pnpm test`

シナリオテストでは、認証なしアップロード、誤ったトークンのアップロード、同名再アップロードが拒否されること、正しいトークンで保存した成果物本体がファイルとして残ること、runnerのアップロード配送で工程完了できること、一時置き場を消した後でもbackendから前工程成果物を読み戻して次工程へ進めること、状態APIへ成果物本文とトークンが混ざらないことを確認する。
