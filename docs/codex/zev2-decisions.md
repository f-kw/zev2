# ZEV2 Codex意思決定ログ

作成日: 2026-06-13
管理主体: Codex

## 記録方針

この文書は、Fable案をZEV2へ適用する前に、Codexがリポジトリ内で管理する意思決定ログである。

決定は、ユーザーが確認できる形で残す。ChatGPTとの会話や外部メモは、それだけでは正典にしない。関連ファイルに基づき、採用、修正採用、却下、保留を明示する。

## Decision ZC-D-001

- Decision ID: ZC-D-001
- Date: 2026-06-13
- Status: accepted
- Decision: Fable案は有用な草案だが、そのまま正典にはしない。
- Reason: `docs/claude/development-policy.md` は多くの有用な方針を含むが、ZEV2の現行実装ではcontrol plane、判断ログ、人間承認ゲートがまだ未設計であり、そのまま実装順序にすると動画品質や演出へ先行しやすい。
- Alternatives considered: Fable案を正典として採用する。Fable案を破棄する。
- Related files: `docs/claude/development-policy.md`, `docs/current-implementation.md`, `docs/order.md`
- Review condition: Codex管理文書の内容をユーザーが確認し、Fable案から採用、修正採用、保留する範囲が更新されるとき。

## Decision ZC-D-002

- Decision ID: ZC-D-002
- Date: 2026-06-13
- Status: accepted
- Decision: ZEV2の次段階では、動画生成品質改善より先にcontrol planeを作る。
- Reason: 現行実装はAIエージェントがAPI経由で終了状態へ進めるが、判断理由、根拠参照、人間確認要求、重要状態への承認ゲートがない。先に品質改善へ進むと、何が改善または失敗したか追えない。
- Alternatives considered: 演出4点セットから始める。Gemini候補確認の実処理から始める。動画生成品質改善から始める。
- Related files: `packages/shared/src/index.ts`, `backend/src/routes/control.ts`, `runner/src/index.ts`, `docs/runner-dry-run.md`
- Review condition: control plane 設計が完了し、ユーザーが実処理接続または品質改善へ進むことを確認したとき。

## Decision ZC-D-003

- Decision ID: ZC-D-003
- Date: 2026-06-13
- Status: accepted
- Decision: AIエージェントは結果だけを返してはいけない。判断、根拠、参照データ、次状態、人間に求める判断を構造化して記録する。
- Reason: 現行の完了報告は処理完了の意味と成果物参照を保存できるが、候補を選んだ判断、判断理由、参照データ、人間確認要求を正本として保存しない。Fable案のブラックボックス回避には別の判断ログが必要である。
- Alternatives considered: 完了理由の自由文だけを残す。成果物JSONの中だけに判断を入れる。UIだけで判断を見せ、保存しない。
- Related files: `backend/src/routes/control.ts`, `packages/shared/src/index.ts`, `docs/task-006-AI操作ログと監査履歴.md`
- Review condition: 判断ログのスキーマが設計され、ユーザーが必須項目を確認したとき。

## Decision ZC-D-004

- Decision ID: ZC-D-004
- Date: 2026-06-13
- Status: accepted
- Decision: 人間承認なしに、投稿可能状態、公開状態、最終完了状態へ進めない。
- Reason: 現行実装の完了状態はAIエージェントの作業完了を示すだけで、人間が最終判断したことを示さない。投稿、公開、最終完了は外部への影響や品質責任を持つため、AI判断だけで進めてはいけない。
- Alternatives considered: AIエージェント完了を最終完了として扱う。品質ゲート通過後は自動で投稿可能にする。初回依頼承認をすべての後続承認として扱う。
- Related files: `packages/shared/src/index.ts`, `docs/task-007-人間制御APIとUI整理.md`, `docs/task-009-セキュリティ境界と実処理接続方針.md`
- Review condition: 状態遷移表で投稿可能、公開、最終完了の扱いを定義し、承認ゲートが明示されたとき。

## Decision ZC-D-005

- Decision ID: ZC-D-005
- Date: 2026-06-13
- Status: accepted
- Decision: LLMは固定フローで毎回呼ぶのではなく、エージェントAIが必要性を判断する。
- Reason: ZEV2はAIエージェントが型付き命令とファイル参照で処理する骨格を目指している。固定フローで毎回LLMを呼ぶと、不要な外部処理や説明不能な判断が増える。必要性を判断する場合も、その判断理由と参照データをログに残す必要がある。
- Alternatives considered: すべての工程でLLMを必ず呼ぶ。LLM呼び出しを完全に禁止する。工程ごとに固定プロンプトだけで判断する。
- Related files: `docs/ai-agent-api.md`, `docs/task-008-CodexからGeminiを使った候補確認機能.md`, `docs/claude/development-policy.md`
- Review condition: エージェント出力スキーマで、外部AI確認を行った理由、入力、結果、人間確認要求の記録方法が定義されたとき。

## Decision ZC-D-006

- Decision ID: ZC-D-006
- Date: 2026-06-13
- Status: accepted
- Decision: エージェントAIは秒数、座標、演出頻度、投稿可否を自由決定しない。
- Reason: Fable案の中核である「意味判断と数値・配置・頻度の分離」はZEV2でも採用する。独自判断の係数や重み付けは禁止されており、ユーザーが確認した明示ルールなしに数値や投稿可否を決めてはいけない。
- Alternatives considered: LLMに秒単位の境界や座標を直接決めさせる。AIが総合判断で投稿可否を決める。演出頻度をAIの自由記述に任せる。
- Related files: `docs/claude/development-policy.md`, `AGENTS.md`
- Review condition: 境界ルール設計で、AIが自由決定してはいけない項目と、それを決める処理が定義されたとき。

## Decision ZC-D-007

- Decision ID: ZC-D-007
- Date: 2026-06-13
- Status: accepted
- Decision: 人間中央値品質は最終目標ではなく最低合格ラインとして扱う。
- Reason: Fable案では人間の切り抜き師の中央値に並ぶ品質がフェーズ移行の目安として書かれている。ZEV2ではこれを最終目標にせず、最低限満たすべき品質ラインとして扱う。ただし、初期control planeでは品質評価を実装しない。
- Alternatives considered: 人間中央値品質を最終目標にする。人間中央値品質を初期control planeの合格条件にする。品質比較を完全に扱わない。
- Related files: `docs/claude/development-policy.md`
- Review condition: 品質ゲート設計で、最低合格ライン、ユーザー確認済み評価観点、人間確認方法が定義されたとき。

## Decision ZC-D-008

- Decision ID: ZC-D-008
- Date: 2026-06-13
- Status: accepted
- Decision: D4チャットは初期検証の必須要素にしない。
- Reason: 現行ZEV2にはD4チャット取得、保存、表示、品質確認への接続がない。control planeが未整備の状態でD4チャットを入れると、入力データだけが増えて判断制御が追いつかない。
- Alternatives considered: D4チャットを候補生成の初期必須要素にする。D4チャットなしでは候補確認を進めない。
- Related files: `docs/claude/development-policy.md`, `docs/task-008-CodexからGeminiを使った候補確認機能.md`
- Review condition: control plane と候補生成の見える化が完了し、D4チャットの取得条件がユーザー確認済みになったとき。

## Decision ZC-D-009

- Decision ID: ZC-D-009
- Date: 2026-06-13
- Status: accepted
- Decision: 正式なD4チャットは、配信中に公式APIで取得できる場合のみ使う。
- Reason: チャット流速は有用な可能性があるが、非公式取得や不安定な取得を正本にすると、再現性、権限、保存範囲、秘密情報管理の問題が発生する。
- Alternatives considered: 非公式な手段でチャットを取得する。配信後の表示から正本として復元する。チャット情報を品質ゲートに直接使う。
- Related files: `docs/claude/development-policy.md`, `docs/task-009-セキュリティ境界と実処理接続方針.md`
- Review condition: 公式APIで取得できる範囲、権限、保存形式、使用目的が文書化されたとき。

## Decision ZC-D-010

- Decision ID: ZC-D-010
- Date: 2026-06-13
- Status: accepted
- Decision: 過去配信に対しては、D4-liteとして画面OCRによる部分観測を補助ログ扱いで検討する。ただし品質ゲートや足切りには使わない。
- Reason: 過去配信では正式チャット取得ができない場合がある。画面OCRは補助情報になり得るが、観測漏れや誤認識があるため、品質判断の正本や自動足切りに使うべきではない。
- Alternatives considered: D4-liteを正式D4の代替にする。画面OCRを品質ゲートに使う。過去配信ではチャット相当情報を一切検討しない。
- Related files: `docs/claude/development-policy.md`
- Review condition: D4-liteを検討する場合、補助ログの不確実性、保存範囲、UI表示、使用禁止範囲が文書化されたとき。

## Decision ZC-D-011

- Decision ID: ZC-D-011
- Date: 2026-06-13
- Status: accepted
- Decision: `docs/claude/development-policy.md` はFable草案として保持し、Codex管理文書は `docs/codex/` に置く。
- Reason: Claude作成文書とCodex管理文書を混ぜると、どの内容をユーザー確認済みの作業基準とするかが曖昧になる。現行リポジトリにも `docs/claude/README.md` でClaude作成文書の区分が示されている。
- Alternatives considered: `docs/claude/development-policy.md` を直接編集する。`docs/` 直下の既存タスク文書に追記する。Codex管理文書を作らずに会話で管理する。
- Related files: `docs/claude/README.md`, `docs/claude/development-policy.md`, `docs/codex/zev2-adoption-plan.md`, `docs/codex/zev2-progress.md`
- Review condition: Codex管理文書の置き場所や管理主体を変更する必要が出たとき。

## Decision ZC-D-012

- Decision ID: ZC-D-012
- Date: 2026-06-13
- Status: accepted
- Decision: ChatGPTとの会話内容は正典にしない。
- Reason: 会話内容は設計検討の参考にはなるが、ユーザーが確認できるリポジトリ内の記録と同じ扱いにはできない。今後の作業基準は、Codexが文書化し、ユーザーが確認した内容に限定する。
- Alternatives considered: ChatGPTとの会話をそのまま実装指示として扱う。会話要約を正典にする。外部会話を参照しない。
- Related files: `docs/codex/zev2-adoption-plan.md`, `docs/codex/zev2-progress.md`
- Review condition: 外部会話から採用する内容がある場合、Codex管理文書に調査結果として書き直し、ユーザー確認を受けたとき。

## Decision ZC-D-013

- Decision ID: ZC-D-013
- Date: 2026-06-13
- Status: pending
- Decision: control plane spec を作成してから実装に進む。
- Reason: 現行実装ではAI処理完了、判断ログ、人間承認ゲート、投稿可能状態、最終完了状態が分離されていない。仕様書なしで実装に進むと、状態と承認の意味が混ざる。
- Alternatives considered: 既存APIに直接判断ログを追加する。先にUIだけ追加する。既存dry-runをそのまま拡張する。
- Related files: `docs/codex/control-plane-spec.md`, `docs/codex/zev2-progress.md`
- Review condition: ユーザーが `docs/codex/control-plane-spec.md` を確認し、実装に進む範囲を承認したとき。

## Decision ZC-D-014

- Decision ID: ZC-D-014
- Date: 2026-06-13
- Status: pending
- Decision: agent completed と human approved を状態として分離する。
- Reason: 現行のAI作業完了は、AIエージェントが処理を終えたことだけを意味する。人間が候補、編集案、生成結果、投稿可否を承認したこととは別である。
- Alternatives considered: 現行 `succeeded` を人間承認済みとして扱う。UI表示だけで区別する。状態名を全面的に置き換える。
- Related files: `docs/codex/control-plane-spec.md`, `packages/shared/src/index.ts`, `backend/src/routes/control.ts`
- Review condition: ユーザーがAI処理完了と人間承認済みを別状態として扱うことを承認したとき。

## Decision ZC-D-015

- Decision ID: ZC-D-015
- Date: 2026-06-13
- Status: pending
- Decision: `review_required` を導入する。
- Reason: 人間確認が必要な対象を明示しないと、AI処理完了後に重要状態へ自動で進む危険がある。現行の `waiting` は前工程待ちであり、人間確認待ちとは意味が違う。
- Alternatives considered: `waiting` で代用する。UIだけで確認待ちを表示する。判断ログだけで確認待ちを表現する。
- Related files: `docs/codex/control-plane-spec.md`, `client/src/App.vue`, `client/src/stores/controlQueue.ts`
- Review condition: ユーザーが人間確認待ちを独立したcontrol stateとして扱うことを承認したとき。

## Decision ZC-D-016

- Decision ID: ZC-D-016
- Date: 2026-06-13
- Status: pending
- Decision: `decision_log` を重要なAI判断で必須化する。
- Reason: 候補選択、映像確認、編集案、投稿可能化などの判断が自由文や成果物参照だけに残ると、後から理由と根拠を追えない。
- Alternatives considered: 完了理由の自由文だけを残す。成果物JSONの中にだけ判断を残す。監査ログだけで代用する。
- Related files: `docs/codex/control-plane-spec.md`, `docs/task-006-AI操作ログと監査履歴.md`
- Review condition: ユーザーが判断ログの必須項目と保存先を承認したとき。

## Decision ZC-D-017

- Decision ID: ZC-D-017
- Date: 2026-06-13
- Status: pending
- Decision: `human_review_action` を保存する。
- Reason: 承認、却下、修正要求の理由を保存しないと、人間がどの判断を変えたのか、後続工程が何を反映すべきか追跡できない。
- Alternatives considered: 人間判断を状態遷移だけにする。理由入力をUIだけに残す。監査ログだけに保存する。
- Related files: `docs/codex/control-plane-spec.md`, `docs/task-007-人間制御APIとUI整理.md`
- Review condition: ユーザーが人間判断の保存項目、最小アクション、理由コードの扱いを承認したとき。
