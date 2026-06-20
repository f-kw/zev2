# ZEV2 Control Plane 設計仕様

作成日: 2026-06-13
管理主体: Codex
状態: draft

## 0. Keep: 人間向けに保つこと

設計書は、人間が判断する流れを説明するための文書として保つ。
内部型名、API名、JSON項目、AIエージェント都合の工程名を主語にしない。

最初に書くべきことは次の通り。

- 人間が何を依頼するか。
- AIが文字起こしからどんなテーマ候補を出すか。
- 人間がどのテーマで切り抜きたいかを選ぶこと。
- 選ばれたテーマに関係する複数の発話箇所を集め、それらをつなげて構成案にすること。
- 演出作成では、構成案に含まれる複数の動画箇所をGemini APIへ渡すこと。
- 完成品レビューでは、Web版Geminiを補助的に使うこと。
- 人間がどこで進める、直す、止めるを選べるか。

この設計では、音声、テンション、間、笑い、画面変化、映像の見栄えの計測を候補決定の本筋にしない。
高コストな補助計測は、効果が確認されるまで前段へ足さない。

## 1. 目的

control plane は、AIエージェントの処理を単に最後まで進めるための仕組みではない。AIエージェントが何を判断し、どの根拠を参照し、次にどの状態へ進めたいのかを人間が確認できるようにする制御層である。

この設計で解決することは次の通り。

- AIエージェントの判断をブラックボックスにしない。
- 人間承認なしに重要状態へ進ませない。
- エージェント出力を自由文だけにしない。
- 状態遷移、判断ログ、成果物参照、人間判断を追跡可能にする。
- AI処理完了と人間最終承認を同じ状態として扱わない。

この文書は設計仕様であり、実装、型定義追加、API実装、UI実装、テスト追加は行わない。

## 2. 現行実装の整理

### 現在のタスク状態

現行実装で確認できる状態は次の通り。

| 対象 | 状態 | 処理の意味 | 確認元 |
| --- | --- | --- | --- |
| 実行前下書き | `draft` | 人間が作った依頼がまだAIエージェントへ渡されていない。 | `packages/shared/src/index.ts` |
| 実行前下書き | `approved` | 人間が依頼を承認し、AIエージェント用作業を作れる状態になった。 | `packages/shared/src/index.ts`, `backend/src/routes/control.ts` |
| 実行前下書き | `rejected` | 下書きが却下された状態として型にある。現行APIで却下処理は未確認。 | `packages/shared/src/index.ts` |
| AI作業 | `queued` | AIエージェントが取得できる可能性がある。 | `packages/shared/src/index.ts` |
| AI作業 | `waiting` | 前工程の完了待ち。 | `packages/shared/src/index.ts`, `backend/src/routes/control.ts` |
| AI作業 | `running` | AIエージェントが取得済み。 | `backend/src/routes/control.ts` |
| AI作業 | `succeeded` | AIエージェントが完了を報告した。 | `backend/src/routes/control.ts` |
| AI作業 | `failed` | AIエージェントが失敗を報告した。 | `backend/src/routes/control.ts` |
| UI表示 | `completed` | UI内の表示段階として、処理中のAI作業がなくなったことを示す。正本の永続状態ではない。 | `client/src/stores/controlQueue.ts` |

現行実装には、テーマ選択待ち、ユーザー承認済み、修正要求、投稿可能、公開済み、最終完了、キャンセルの正本状態は確認できない。

### 現在の状態遷移

現行の処理は次の順序で進む。

1. UIまたはAPIで実行前下書きを作る。
2. 人間が下書きを承認する。
3. バックエンドが承認済み下書きからAIエージェント用作業を作る。
4. AIエージェントが次の作業を取得する。
5. AIエージェントが作業を取得済みにする。
6. AIエージェントが完了または失敗を報告する。
7. 前工程が完了すると次工程が取得可能になる。
8. 次の作業がなくなるとdry-run runnerは終了する。

この遷移は工程順を守るための処理遷移であり、AI判断のレビュー、人間承認、却下、差し戻しを制御する遷移ではない。

### 実行前下書き承認の位置づけ

現行の実行前下書き承認は、「人間が依頼をAIエージェントへ渡してよいと判断した」ことを示す。テーマ選択、構成案確定、動画生成、投稿可能化、公開、最終完了の承認ではない。

初回下書き承認で作るAI作業キューは、動画生成前確認までで止める。`render_video` は、複数箇所の構成と演出案を人間が確認し、「確認用動画を作る」と承認した後に追加する。

### AIエージェントの7工程dry-runの流れ

現行の7工程は次の通り。

| 順序 | 工程 | 成果物参照の種類 | 現行dry-runの意味 |
| --- | --- | --- | --- |
| 1 | 動画取り込み | `source_video` | 対象動画をAI処理用入力として登録した参照を返す。 |
| 2 | 文字起こし | `transcript_json` | テーマ候補作成の材料になる発話参照を返す。 |
| 3 | テーマ候補作成 | `theme_json` | 文字起こしから、人間が選ぶ切り抜きテーマ候補を返す。 |
| 4 | 複数箇所構成 | `composition_json` | 選ばれたテーマに関係する複数の発話箇所を集め、つなぎ方を返す。 |
| 5 | 演出作成 | `edit_plan_json` | 複数箇所の動画参照をGemini APIへ渡す前提で、テロップ、つなぎ、演出方針を返す。 |
| 6 | 微調整 | `patch_json` | 修正内容を編集案へ反映する工程の参照を返す。 |
| 7 | 動画生成 | `output_video` | 承認済み編集案から動画を生成する工程の参照を返す。 |

現行dry-runは実STT、実LLM、実Gemini API、実動画生成を行わない。
Web版Geminiは完成品レビュー用であり、演出作成には使わない。

### 現在の完了状態が意味していること

AI作業の `succeeded` は、AIエージェントが該当作業の完了を報告したことを意味する。人間がテーマ、構成案、動画生成結果、投稿可否を承認したことは意味しない。

UI表示の `completed` は、処理中のAI作業がなくなったことを示す一時的な画面状態である。永続的な最終完了状態ではない。

### 成果物参照が保存されている場所

成果物参照は `Zev2State.fileRefs` に保存される。工程結果は `Zev2State.outputs` に保存され、AI作業には `fileRefIds` と `result` が保存される。開発用の実行状態は `runtime/state.json` に保存される。

成果物本体の保存先、参照検証、欠落時の扱いは既存タスクに残っており、現行実装では未確認である。

### 現在UIで見えている情報

UIで確認できる情報は次の通り。

- 実行前下書きの状態。
- AI作業の処理中工程。
- 工程ごとの作業状態。
- 成功済み工程と失敗工程。
- dry-runであること。
- 実行履歴。
- 成果物件数。
- 工程結果の短い意味。

UIでは、判断理由、根拠参照、選ばれたテーマ、複数箇所構成、人間確認要求、承認、却下、修正要求の正本は確認できない。

### 現在ブラックボックスになっている箇所

| 箇所 | 現在見えていること | 不足していること |
| --- | --- | --- |
| テーマ候補作成 | テーマ候補作成工程が完了したこと。 | 人間がどのテーマを選ぶべきか。代表発話。選ぶ理由。 |
| 複数箇所構成 | 構成案作成工程が完了したこと。 | 選ばれたテーマに関係する複数箇所と、どうつなぐか。 |
| 演出作成 | 演出案作成工程が完了したこと。 | 複数の動画箇所をGemini APIへ渡して何を検討したか。 |
| 動画生成 | 動画生成工程が完了したこと。 | 人間が生成を承認したか、投稿可能と判断したか。 |
| 失敗 | 失敗理由の文字列。 | 復旧判断、差し戻し先、再実行可否の構造化情報。 |
| UI履歴 | 完了工程数と成果物件数。 | 判断ログ、人間判断、却下理由、修正要求。 |

## 3. Proposed State Model

control plane 導入後は、処理状態と人間制御状態を分離する。

### 現行状態を残す対象

現行の `AgentRequestStatus` は、AI作業処理状態として残す候補である。

| 現行状態 | control plane 上の扱い |
| --- | --- |
| `queued` | AI作業が取得待ちである処理状態。 |
| `waiting` | 前工程待ちである処理状態。 |
| `running` | AI作業が実行中である処理状態。 |
| `succeeded` | AI作業が完了報告済みである処理状態。人間承認ではない。 |
| `failed` | AI作業が失敗した処理状態。 |

### 追加候補の制御状態

次の状態は追加候補であり、現行実装にはまだ存在しない。

| 状態候補 | 処理の意味 | 現行との関係 |
| --- | --- | --- |
| `draft_created` | 実行前下書きが作られた。 | 現行 `RequestDraft.status = draft` に対応。 |
| `draft_approved` | 人間が下書きをAIエージェントへ渡すことを承認した。 | 現行 `RequestDraft.status = approved` に対応。 |
| `agent_run_started` | AIエージェントの処理が開始した。 | 現行では個別作業の `running` で近いが、run全体の正本状態は未確認。 |
| `agent_processing_completed` | AIエージェントの対象処理が完了した。 | 現行の全作業 `succeeded` に近いが、人間承認ではない。 |
| `review_required` | 人間がテーマ、構成案、出力結果を確認すべき状態。 | 新規追加候補。 |
| `human_approved` | 人間が対象判断を承認した状態。 | 新規追加候補。 |
| `human_rejected` | 人間が対象判断を却下した状態。 | 新規追加候補。 |
| `changes_requested` | 人間が修正を要求した状態。 | 新規追加候補。 |
| `render_requested` | 動画生成を要求できる状態。 | 新規追加候補。初回下書き承認とは分離する。 |
| `render_completed` | 動画生成処理が完了した状態。 | 現行 `render_video` の `succeeded` に近いが、投稿可能ではない。 |
| `post_ready` | 投稿可能と人間が承認した状態。 | 新規追加候補。自動遷移禁止。 |
| `published` | 公開済み状態。 | 新規追加候補。初期実装対象外。 |
| `final_completed` | 人間承認済みの最終完了状態。 | 新規追加候補。AI処理完了と分離する。 |
| `failed` | 処理が失敗した状態。 | 現行 `AgentRequest.status = failed` と接続。 |
| `cancelled` | 人間またはシステムが中止した状態。 | 新規追加候補。 |

重要な分離:

- `agent_processing_completed` は、AIエージェントが処理を終えた状態である。
- `human_approved` は、人間が対象判断を承認した状態である。
- `final_completed` は、人間承認済みの最終完了状態である。
- これらを同じ `completed` や `succeeded` として扱わない。

## 4. 状態遷移表

この表はcontrol plane導入後の提案である。現行実装に存在する遷移は `current`、追加候補は `proposed` と書く。

| from | event | actor | guard condition | required log | side effects | to | human review required | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| none | draft created | user | 目的、動画ソース、尺、テーマ数、方針が入力されている。 | state_transition_log | 実行前下書きを保存する。 | `draft_created` | no | current。現行は `POST /api/request-drafts`。 |
| `draft_created` | draft approved by user | user | 下書きが未処理である。 | state_transition_log, human_review_action | 承認済み下書きにし、AI作業キューを作る。 | `draft_approved` | yes | current。現行は初回承認だけ。 |
| `draft_approved` | agent run started | runner | 実行可能なAI作業がある。 | state_transition_log | 次作業を取得し、作業を実行中にする。 | `agent_run_started` | no | current/proposed。現行は個別作業の `claim`。 |
| `agent_run_started` | agent step completed | agent | 対象作業が実行中である。 | state_transition_log, decision_log if step made judgment | 成果物参照を保存し、作業を完了にする。 | `agent_run_started` | no | current。判断を伴う工程ではdecision_logを必須化する提案。 |
| `agent_run_started` | agent run completed | runner | 予定されたAI作業が完了している。 | state_transition_log, agent_run_result | AI処理完了結果を保存する。 | `agent_processing_completed` | no | proposed。現行ではrun全体の正本状態は未確認。 |
| `agent_run_started` | theme options generated | agent | テーマ候補作成工程が完了し、テーマ候補参照がある。 | decision_log, agent_run_result | テーマ候補、代表発話、選べる理由を保存する。 | `review_required` | yes | current/proposed。人間が切り抜きたいテーマを選ぶ。 |
| `agent_processing_completed` | review required | backend | 人間確認が必要な判断または成果物がある。 | state_transition_log, decision_log | 人間確認待ちとして表示対象にする。 | `review_required` | yes | proposed。 |
| `review_required` | user approved | user | 確認対象と判断ログが表示されている。 | human_review_action, state_transition_log | 承認者、理由、対象状態を保存する。 | `human_approved` | yes | proposed。 |
| `review_required` | user rejected | user | 却下理由が入力または選択されている。 | human_review_action, state_transition_log | 却下理由を保存し、後続重要状態への遷移を止める。 | `human_rejected` | yes | proposed。 |
| `review_required` | user requested changes | user | 修正要求理由が入力または選択されている。 | human_review_action, state_transition_log | 修正要求を保存し、人間が最後に承認したところ以降のAI作成部分を作り直す。 | `changes_requested` | yes | current/proposed。 |
| `human_approved` | render requested | user | 編集案または生成前判断が承認済みである。 | human_review_action, state_transition_log | 動画生成工程を実行可能にする。 | `render_requested` | yes | proposed。初回下書き承認とは分離する。 |
| `render_requested` | render completed | agent | 動画生成工程が実行中である。 | state_transition_log, agent_run_result | 出力動画参照を保存する。 | `render_completed` | no | current/proposed。現行は `render_video` の完了。 |
| `render_completed` | post ready | user | 生成結果を人間が確認している。 | human_review_action, state_transition_log | 投稿可能状態として保存する。 | `post_ready` | yes | proposed。初期実装では投稿処理はしない。 |
| `post_ready` | published | user/system | 投稿操作が人間承認済みで、投稿処理の権限がある。 | human_review_action, state_transition_log | 公開結果を保存する。 | `published` | yes | proposed。初期実装対象外。 |
| `published` | final completed | user | 公開結果または最終成果を人間が確認している。 | human_review_action, state_transition_log | 最終完了として保存する。 | `final_completed` | yes | proposed。 |
| any active state | failed | agent/runner/backend/system | 処理失敗、API失敗、成果物欠落などが発生した。 | state_transition_log, error log | 失敗理由を保存する。 | `failed` | conditional | current/proposed。現行はAI作業の `fail`。 |
| any non-final state | cancelled | user/system | 中止可能な状態である。 | human_review_action or state_transition_log | 後続作業を止める。 | `cancelled` | yes if user action | proposed。現行APIは未確認。 |

## 5. 不変条件

control plane は次の条件を守る。

- 人間承認なしに `post_ready`、`published`、`final_completed` 相当へ進めない。
- agent は user approval を偽装できない。
- 重要な状態遷移には `decision_log` または `state_transition_log` が必ず残る。
- agent run の完了は、人間承認を意味しない。
- `reject` と `request_changes` の理由は保存する。
- 成果物の実体をタスク正本に埋め込まず、`FileRef` または `ArtifactRef` で参照する。
- backend は実STT、実LLM、Gemini API、実動画生成、完成品レビューを直接実行しない。
- エージェントAIは秒数、座標、演出頻度、投稿可否を自由決定しない。
- 自由文の完了報告だけで、テーマ選択、投稿可能化、公開、最終完了へ進めない。
- 初回の実行前下書き承認を、後続すべての重要判断の承認として扱わない。
- UI表示用の一時状態を、永続的な最終完了状態として扱わない。

## 6. 判断ログスキーマ

実装はしない。次は設計案である。

```ts
type DecisionLog = {
  decisionId: string;
  taskId: string;
  agentRunId: string;
  stepId: string | null;
  actor: 'agent' | 'runner' | 'backend' | 'system' | 'user';
  decisionType:
    | 'theme_selection'
    | 'render_readiness';
  decision: string;
  reason: string;
  evidenceRefs: Array<{
    refId: string;
    kind: 'file_ref' | 'artifact_ref' | 'time_range' | 'rule' | 'state';
    meaning: string;
  }>;
  inputRefs: Array<{
    refId: string;
    kind: 'request_draft' | 'agent_request' | 'file_ref' | 'artifact_ref';
    meaning: string;
  }>;
  artifactRefs: Array<{
    refId: string;
    kind: string;
    meaning: string;
  }>;
  proposedNextState: string;
  requiresHumanReview: boolean;
  humanQuestion: string | null;
  ruleIds: string[];
  modelInfo?: {
    provider: string;
    model: string;
    mode?: string;
    usedFor: string;
  } | null;
  promptVersion?: string | null;
  createdAt: string;
};
```

`modelInfo` と `promptVersion` は、LLMやGemini APIを使わなかった場合は `null` または省略可能にする。判断ログは、外部AIを呼んだ結果だけでなく、外部AIを呼ぶ必要がないと判断した場合にも残す候補とする。

## 7. エージェント出力スキーマ

実装はしない。次は設計案である。

```ts
type AgentRunResult = {
  agentRunId: string;
  taskId: string;
  status: 'succeeded' | 'failed' | 'cancelled';
  currentState: string;
  proposedNextState: string;
  summary: string;
  decisions: DecisionLog[];
  evidenceRefs: DecisionLog['evidenceRefs'];
  artifactRefs: DecisionLog['artifactRefs'];
  warnings: Array<{
    code: string;
    meaning: string;
    evidenceRefs: string[];
  }>;
  errors: Array<{
    code: string;
    meaning: string;
    recoverable: boolean;
  }>;
  requiresHumanReview: boolean;
  humanQuestion: string | null;
  nextAllowedActions: Array<
    | 'approve'
    | 'reject'
    | 'request_changes'
    | 'request_render'
    | 'cancel'
  >;
  createdAt: string;
};
```

エージェント出力は `summary` だけで終わらせない。判断、根拠、参照データ、提案する次状態、人間に求める判断を構造化する。

現行の `AgentCompletionInput.meaning` は、処理完了の短い意味を渡す用途として残せる可能性がある。ただし、判断を扱う工程では `AgentRunResult` 相当の構造化結果を別に保存する必要がある。

## 8. 人間判断スキーマ

実装はしない。次は設計案である。

```ts
type HumanReviewAction = {
  actionId: string;
  taskId: string;
  agentRunId: string;
  selectedThemeId?: string | null;
  action:
    | 'approve'
    | 'reject'
    | 'request_changes';
  reasonCode:
    | 'approved_as_is'
    | 'not_interesting'
    | 'context_missing'
    | 'wrong_theme'
    | 'composition_missing'
    | 'other';
  reasonText: string | null;
  targetState: string;
  createdBy: 'user';
  createdAt: string;
};
```

### 最小実装で必要なもの

- `approve`
- `reject`
- `request_changes`
- `selectedThemeId`
- `reasonCode`
- `reasonText`
- `targetState`

### 将来必要なもの

- 境界修正。
- 山場変更。
- 演出の濃さ変更。

境界修正、山場変更、演出の濃さ変更は、初期control planeでは必須にしない。
まずテーマ選択、承認、却下、修正要求を保存できることを優先する。

## 9. 最小UI表示

control plane 最小実装でUIに表示すべき項目は次の通り。

| 表示項目 | 処理の意味 |
| --- | --- |
| 現在状態 | AI処理中なのか、人間確認待ちなのか、失敗なのかを示す。 |
| エージェントが提案する次状態 | AIが次に進めたい状態を示す。 |
| 判断理由 | AIがテーマ候補、構成案、演出案をどう判断したかを示す。 |
| 根拠 | 参照したファイル、成果物、時間範囲、ルールを示す。 |
| 成果物参照 | 本体ではなく参照ID、種類、短い意味を示す。 |
| warn / error | 人間確認が必要な懸念または失敗理由を示す。 |
| 人間に求める判断 | 承認、却下、修正要求など、次に必要な判断を示す。 |
| approve / reject / request_changes | 人間の判断を保存する操作。 |
| reject / request_changes の理由 | 却下または修正要求の理由を保存する入力または選択。 |

UIで避けること:

- ダッシュボード化。
- タイムライン自由編集UI。
- 個別演出承認UI。
- 処理ログの大量表示。
- AI向けJSON閲覧を主導線にすること。
- STT全文、LLM全文、動画本体を主導線にすること。

## 10. 最小APIまたは内部操作案

実装はしない。最小実装時に必要になりそうなAPIまたは内部操作の案を示す。

| 操作案 | 既存APIとの関係 | 処理の意味 |
| --- | --- | --- |
| get task with control state | `GET /api/state` の拡張候補、または新規API候補 | 作業処理状態と人間制御状態を同時に確認する。 |
| get agent run result | 新規API候補 | AI処理結果、判断、根拠、次状態、人間確認要求を取得する。 |
| get decision logs | 新規API候補 | 判断ログを確認する。 |
| submit human review action | 新規API候補 | 承認、却下、修正要求を保存する。 |
| transition task state with guard | backend内部操作候補 | guard conditionを満たす場合だけ状態を遷移させる。 |
| get pending reviews | 新規API候補 | 人間確認待ちの対象だけを取得する。 |

既存の `POST /api/request-drafts/:id/approve` は、実行前下書きをAIエージェントへ渡す承認として残す。テーマ選択や投稿可能化の承認と兼用しない。

既存の `POST /api/agent-requests/:id/complete` は、AI作業の完了報告として残す候補である。ただし、判断を伴う工程では自由文と成果物参照だけでは不足するため、構造化結果を保存する操作が必要になる。

## 11. 実装フェーズ案

### Phase 1: control plane 最小実装

- 状態モデル整理。
- `decision_log` の最小保存。
- `agent_run_result` の構造化。
- `review_required` 状態。
- `approve`、`reject`、`request_changes` の保存。
- 最小UI表示。
- AI処理完了と人間承認済みの分離。

### Phase 2: 参照とガードの強化

- `evidenceRefs` と `artifactRefs` の表示強化。
- 状態遷移ガード強化。
- `human_override` の拡張。
- 成果物参照の検証と欠落時の扱い。
- 操作ログと判断ログの関係整理。

### Phase 3: Fable案との接続

- テーマ選択と複数箇所構成の見える化。
- 境界ルール。
- 品質ゲート。
- Gemini APIによる演出作成。
- Web版Geminiによる完成品レビュー。

### 初期実装に含めないもの

- 演出4点セット。
- D4チャット。
- D4-lite。
- 自動投稿。
- 評価スコアリング。
- ダッシュボード。
- タイムライン自由編集UI。
- 動画生成品質改善。
- 実STT。
- 実LLM。
- 実動画生成。

## 12. 確認手順

control plane 最小実装後に確認すべき手順案は次の通り。

| 確認ケース | 確認する処理の意味 |
| --- | --- |
| task 作成 | 実行前下書きが作られ、状態遷移ログが残る。 |
| draft 承認 | 人間がAIエージェントへ渡す承認を保存し、AI作業キューが作られる。 |
| agent run 開始 | AIエージェントが処理を開始し、開始状態が確認できる。 |
| agent run 完了 | AI処理完了が保存されるが、人間承認済みにはならない。 |
| review_required で止まる | 人間確認が必要な対象が後続重要状態へ自動で進まない。 |
| decision_log が残る | AIの判断、理由、根拠参照、提案する次状態が保存される。 |
| UIまたはAPIで decision_log を確認できる | 人間が判断ログを読める。 |
| user approve で次状態へ進む | 人間承認が保存され、許可された次状態へ進む。 |
| user reject で却下理由が残る | 却下理由が保存され、後続重要状態へ進まない。 |
| user request_changes で修正要求が残る | 修正要求理由が保存され、直前のAI自動生成部分が作り直し対象になる。 |
| 人間承認なしでは `post_ready` / `published` / `final_completed` 相当へ進めない | 状態遷移ガードが未承認遷移を拒否する。 |

## 13. 未決事項

| issue | why it matters | options | recommendation | needs user decision |
| --- | --- | --- | --- | --- |
| 現行 `succeeded` の意味をどう分離するか | AI処理完了を人間承認済みと誤解すると、重要状態へ自動で進む危険がある。 | `succeeded` を処理状態として残す / 新しいcontrol stateを追加する / 状態名を全面変更する | `succeeded` は処理状態として残し、control stateに `agent_processing_completed` と `human_approved` を追加する。 | yes |
| `review_required` を新規状態として足すか | 人間確認待ちで処理を止める明示状態が必要。 | 新規状態として追加 / `waiting` で代用 / UI表示だけで表現 | 新規control stateとして追加する。`waiting` は前工程待ちなので代用しない。 | yes |
| `decision_log` をどこに保存するか | 状態ファイル、監査ログ、成果物参照との責務が変わる。 | `Zev2State` に追加 / 別ログファイル / 成果物として保存 | 最小実装では `Zev2State` に参照可能な形で追加し、巨大本文はArtifactRefへ逃がす案を検討する。 | yes |
| `human_review_action` をどこに保存するか | 承認、却下、修正要求は後から追跡できる必要がある。 | `Zev2State` に追加 / 監査ログに統合 / agent request result に埋め込む | `Zev2State` に正本として追加し、監査ログにも遷移イベントを残す案を検討する。 | yes |
| UIの最小表示範囲 | UIを進捗表示から判断待ち表示へ変える範囲を決める必要がある。 | 現行UIに最小追加 / 別画面 / ダッシュボード化 | 現行UIに判断要約、根拠参照、人間判断ボタンを最小追加する案を優先する。 | yes |
| 既存dry-runとの互換性 | 現行dry-runが最後まで進む設計と、人間確認待ちで止める設計が衝突する。 | dry-runでもreview_requiredで止める / dry-run専用に自動承認する / renderなしで止める | control plane検証ではreview_requiredで止める。自動承認は使わない。 | yes |
| 既存の実行前下書き承認との関係 | 初回承認と後続承認を混同すると、人間承認ゲートが無効化される。 | 初回承認を後続承認にも使う / 後続承認を別スキーマにする | 初回承認は実行開始許可、後続承認は人間判断として別スキーマにする。 | yes |
| 投稿可能、公開、最終完了の初期扱い | 初期実装で投稿や公開まで作るとcontrol planeの検証範囲が膨らむ。 | 状態だけ予約 / 実装する / 文書から外す | 状態と不変条件だけ予約し、初期実装には含めない。 | yes |
| `agentRunId` の発行単位 | 判断ログや人間判断をrun単位で追うために必要。 | 下書き単位 / AI作業単位 / 一連の処理単位 | 一連の承認済み処理単位をagent runとし、各工程はstepとして紐付ける案を検討する。 | yes |

## 14. 進捗記録への反映方針

`docs/codex/zev2-progress.md` には、この仕様書作成を記録する。次のタスクは「control plane 最小実装設計レビュー」とし、ユーザー確認が終わるまで実装に進まない。

## 15. 意思決定ログへの反映方針

この文書で提案した次の決定は、ユーザー未確認のため `pending` として記録する。

- control plane spec を作成してから実装に進む。
- agent completed と human approved を状態として分離する。
- `review_required` を導入する。
- `decision_log` を必須化する。
- `human_review_action` を保存する。

これらは提案であり、ユーザー確認後に `accepted` へ変更する。
