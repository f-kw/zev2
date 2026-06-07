# zev2 レビュー用 要点

作成日: 2026-05-31

レビュー時はこの文書だけ見る。
詳細仕様やタスク全文は、判断後に必要な部分だけ見る。

## いま作っているもの

人間が依頼を入力し、AIエージェントがAPIで作業を進める基盤。

backendはSTT、LLM、動画生成、Gemini評価を直接実行しない。
実処理はAIエージェントrunnerやCodex側の処理が行い、backendには結果と成果物参照だけを返す。

## 現時点の形

- UI操作は「承認してAIに渡す」の1操作。
- 内部状態では、依頼作成と承認済み作業を分ける。
- AIエージェントは承認済み作業だけをAPIで取得する。
- UIは依頼、API実行状態、成果物確認だけに絞る。
- Gemini動画評価は作業種別の形だけ最初から入れる。
- dry-run runnerで、実処理なしに全工程を最後まで進められる。
- 「承認してAIに渡す」後、backendがdry-run runnerをバックグラウンド起動する。
- 実STT、実LLM、実動画生成、実Gemini評価はまだ動かさない。

## 依頼と承認を内部で分けるメリット

- AIエージェントが未確定の入力を取得しない。
- 人間が実行対象を確定した履歴を残せる。
- 外部API費用や副作用がある処理を、承認済み作業に限定できる。
- 失敗、再実行、差し戻し、監査ログを後から整理しやすい。

UI上は1ボタンでよい。
内部状態として分けることに意味がある。

## UIで確認できるべきもの

- 依頼内容。
- API実行状態。
- APIキュー件数と進捗。
- 最新の成果物参照。
- 後続では成果物の要約、確認待ち、失敗理由。

成果物確認は必要。
ただし、巨大なSTT全文、LLM全文、動画本体をUIや状態へ直接埋め込まない。

## AIエージェントAPIの考え方

```text
GET  /api/agent-requests/next
POST /api/agent-requests/:id/claim
POST /api/agent-requests/:id/complete
POST /api/agent-requests/:id/fail
```

意味:

- `next`: 実行可能な承認済み作業を1件返す。
- `claim`: AIエージェントがその作業を担当中にする。
- `complete`: 外部処理の結果と成果物参照を返す。
- `fail`: 失敗理由を返す。

`claim` が必要な理由:

- 複数runnerで同じ作業を二重実行しないため。
- 途中停止した作業を復旧対象として扱うため。
- 誰がいつ作業を引き受けたかをログに残すため。

## runnerの現在地

dry-run runnerは追加済み。
目的は、UI依頼からAPI実行完了までの経路を先に通すこと。
現時点では、承認APIがdry-run runnerをバックグラウンド起動し、runnerがAPIだけで全工程を完了する。
承認APIはrunner完了まで待たず、UIは状態APIで進捗を確認する。

runnerの最低限の内訳:

- API client。
- 実行ループ。
- 作業種別ディスパッチ。
- dry-run handler。
- 成果物参照の返却。
- 失敗報告。

実STT、実LLM、実動画生成、実Gemini評価はまだ動かさない。
ただし各工程はdry-run成果物参照を返し、全工程が `succeeded` になることを優先する。

## 最初から形を入れる作業種別

```text
prepare_video
gemini_video_review
run_stt
find_candidates
create_edit_plan
apply_adjustment
render_video
```

`gemini_video_review` は最初から作業種別に入れる。
ただし実Gemini操作は後続で、CodexがGeminiを使い、結果だけをAPIへ返す。

## まだ作っていないもの

- API契約テスト。
- claimの排他制御。
- claim失敗時の復旧。
- 成果物本体の保存。
- 操作ログ。
- 認証。
- 停止、再実行、差し戻し、却下API。
- 実Gemini動画評価。
- 実STT、実LLM、実動画生成。

## 現時点で確認してほしいこと

1. UIで依頼を作り、「承認してAIに渡す」後にrunner完了まで進む流れ。
2. UIに残す情報量。現状は依頼、状態、成果物参照に絞っている。
3. 成果物確認の粒度。現状は成果物種別、参照URI、要約を最小単位にしている。
4. AIエージェントAPI。現状は `next -> claim -> complete/fail` で作業取得、担当中化、完了、失敗を分けている。
5. Gemini動画評価工程。現状はdry-run対象に含め、実Gemini操作は後続で差し替える。

## レビュー後の着手候補

最優先候補は、dry-run経路をAPI契約テストで固定すること。
