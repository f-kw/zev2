# 残タスク一覧

レビュー時は、まず [review-brief.md](./review-brief.md) だけを確認する。
7工程、作り直し、UI導線、runner実行条件を判断する場合は [zev2-flow-contract.md](./zev2-flow-contract.md) を正本として確認する。
詳細が必要になった場合だけ、現在の実装範囲は [current-implementation.md](./current-implementation.md)、AIエージェント向けAPIは [ai-agent-api.md](./ai-agent-api.md) を確認する。

## task-001 最小E2E dry-run実行 実装済み

- 対象: [task-001-最小E2E-dry-run実行.md](./task-001-最小E2E-dry-run実行.md)
- UIで依頼を作り、AIエージェントrunnerがAPIだけで全工程を最後まで完了できる状態を作る。
- 初期実装では各工程がdry-run成果物参照を返して完了する。
- 確認済み: 承認APIが正常応答し、runnerがバックグラウンドで全作業を完了し、`GET /api/agent-requests/next` が `null` を返した。

## task-002 AIエージェントAPI契約テストと仕様固定

- 対象: [task-002-AIエージェントAPI契約テストと仕様固定.md](./task-002-AIエージェントAPI契約テストと仕様固定.md)
- task-001で作ったE2E dry-run経路をテストで固定する。
- `next -> claim -> complete/fail`、全工程完了、成果物参照、失敗報告を対象にする。

## task-003 成果物確認UIとFileRef最小表示

- 対象: [task-003-成果物確認UIとFileRef最小表示.md](./task-003-成果物確認UIとFileRef最小表示.md)
- dry-runで作られた成果物参照をUIで確認できるようにする。
- まずは要約、成果物種別、参照URI、状態だけに絞る。

## task-004 claim排他制御と復旧

- 対象: [task-004-claim排他制御と復旧.md](./task-004-claim排他制御と復旧.md)
- 複数AIエージェントが同じ作業を同時取得しないようにし、途中停止した作業を復旧できるようにする。
- claim所有者、取得時刻、期限切れ、再取得条件をAPI状態に追加する。

## task-005 成果物保存とFileRef実体管理

- 対象: [task-005-成果物保存とFileRef実体管理.md](./task-005-成果物保存とFileRef実体管理.md)
- `FileRef` が単なる参照文字列で終わらないように、成果物本体の保存先、取得方法、保存失敗時の扱いを決める。
- 大きなJSONや動画本体を状態ファイルへ埋め込まない境界を固定する。

## task-006 AI操作ログと監査履歴

- 対象: [task-006-AI操作ログと監査履歴.md](./task-006-AI操作ログと監査履歴.md)
- AIエージェントが何を取得し、いつ開始し、どう完了または失敗したかを追えるログを追加する。
- 秘密情報や巨大な成果物本文をログへ残さない。

## task-007 人間制御APIとUI整理

- 対象: [task-007-人間制御APIとUI整理.md](./task-007-人間制御APIとUI整理.md)
- 人間が停止、再実行、差し戻し、却下をAPI経由で指示できるようにし、UIはその状態確認と操作だけに絞る。
- AIエージェントの実行ボタンをUI主導に戻さない。

## task-008 Gemini APIで演出作成 実装済み

- 対象: [task-008-Gemini-APIで演出作成.md](./task-008-Gemini-APIで演出作成.md)
- 確認済みの使用素材構成案に含まれる複数の動画箇所をGemini APIへ渡し、つなぎ、テロップ、演出案を作る。
- 候補決定は文字起こしからの内容候補整理、人間の内容選択、AIの使用素材構成、人間の使用素材確認で行い、映像や音声の高コスト計測を前段に戻さない。
- 確認済み: ZEVローカルSTT、固定データによる内容候補、使用素材構成、Gemini APIによる演出案、音声つきMP4生成まで隔離runtimeで成功した。
- 確認済み: Gemini接続は `@google/genai` へ移行済み。APIキー指定とVertex AI指定の両方を同じSDK経路で扱う。

## task-009 セキュリティ境界と実処理接続方針

- 対象: [task-009-セキュリティ境界と実処理接続方針.md](./task-009-セキュリティ境界と実処理接続方針.md)
- 認証、権限、秘密情報の扱いを決め、STT、LLM、動画生成へ接続するときの境界を整理する。
- 実処理はrunner側で接続済み。次はAPI契約、排他制御、成果物保存、ログ、認証を固定する。
