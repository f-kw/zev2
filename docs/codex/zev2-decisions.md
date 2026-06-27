# ZEV2 Codex意思決定ログ

作成日: 2026-06-13
管理主体: Codex

## 記録方針

この文書は、ZEV2の承認ゲートと型付き実行命令の骨格について、Codexがリポジトリ内で管理する意思決定ログである。

決定は、ユーザーが確認できる形で残す。ChatGPTとの会話や外部メモは、それだけでは正典にしない。関連ファイルに基づき、採用、修正採用、却下、保留を明示する。

2026-06-27に、旧草案、初期ブリーフ、テキスト品質評価に寄った適用計画は削除した。現行の正本は、工程仕様、API仕様、runner仕様、成果物参照、レビュー用要点に絞る。

## Decision ZC-D-001

- Decision ID: ZC-D-001
- Date: 2026-06-13
- Status: superseded
- Decision: 旧草案は正典にしない。テキスト品質評価に寄った内容は現行docsから削除する。
- Reason: 現在の目的は完成UIや文章品質評価ではなく、人間が実行前下書きを確認して承認し、AIエージェントが型付き命令とファイル参照で処理する骨格を作ることである。旧草案を正本に残すと、切り捨てたテキスト評価や品質比較が作業対象に戻る。
- Alternatives considered: 旧草案を正典として採用する。旧草案を参考資料として保持する。
- Related files: `docs/current-implementation.md`, `docs/order.md`, `docs/zev2-flow-contract.md`
- Review condition: 現行工程に必要な設計が不足し、削除した草案から再採用する項目をユーザーが明示したとき。

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
- Reason: 現行の完了報告は処理完了の意味と成果物参照を保存できるが、候補を選んだ判断、判断理由、参照データ、人間確認要求を正本として保存しない。AI判断を後から確認するには別の判断ログが必要である。
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
- Related files: `docs/ai-agent-api.md`, `docs/task-008-Gemini-APIで演出作成.md`
- Review condition: エージェント出力スキーマで、外部AI確認を行った理由、入力、結果、人間確認要求の記録方法が定義されたとき。

## Decision ZC-D-006

- Decision ID: ZC-D-006
- Date: 2026-06-13
- Status: accepted
- Decision: エージェントAIは秒数、座標、演出頻度、投稿可否を自由決定しない。
- Reason: 独自判断の係数や重み付けは禁止されており、ユーザーが確認した明示ルールなしに数値、配置、演出頻度、投稿可否を決めてはいけない。
- Alternatives considered: LLMに秒単位の境界や座標を直接決めさせる。AIが総合判断で投稿可否を決める。演出頻度をAIの自由記述に任せる。
- Related files: `AGENTS.md`, `docs/zev2-flow-contract.md`
- Review condition: 境界ルール設計で、AIが自由決定してはいけない項目と、それを決める処理が定義されたとき。

## Decision ZC-D-007

- Decision ID: ZC-D-007
- Date: 2026-06-13
- Status: superseded
- Decision: 人間中央値品質や文章品質評価は、現行の骨格作成では扱わない。
- Reason: 現在の目的は、承認ゲート、成果物参照、型付き実行命令を固定することである。品質比較を先に入れると、ユーザー確認済みの評価観点や検証方法がないまま作業対象が広がる。
- Alternatives considered: 人間中央値品質を最終目標にする。人間中央値品質を初期control planeの合格条件にする。品質比較を完全に扱わない。
- Related files: `docs/zev2-flow-contract.md`, `docs/current-implementation.md`
- Review condition: 品質ゲート設計で、最低合格ライン、ユーザー確認済み評価観点、人間確認方法が定義されたとき。

## Decision ZC-D-008

- Decision ID: ZC-D-008
- Date: 2026-06-13
- Status: accepted
- Decision: D4チャットは初期検証の必須要素にしない。
- Reason: 現行ZEV2にはD4チャット取得、保存、表示、品質確認への接続がない。control planeが未整備の状態でD4チャットを入れると、入力データだけが増えて判断制御が追いつかない。
- Alternatives considered: D4チャットを候補生成の初期必須要素にする。D4チャットなしでは候補確認を進めない。
- Related files: `docs/task-008-Gemini-APIで演出作成.md`
- Review condition: control plane と候補生成の見える化が完了し、D4チャットの取得条件がユーザー確認済みになったとき。

## Decision ZC-D-009

- Decision ID: ZC-D-009
- Date: 2026-06-13
- Status: accepted
- Decision: 正式なD4チャットは、配信中に公式APIで取得できる場合のみ使う。
- Reason: チャット流速は有用な可能性があるが、非公式取得や不安定な取得を正本にすると、再現性、権限、保存範囲、秘密情報管理の問題が発生する。
- Alternatives considered: 非公式な手段でチャットを取得する。配信後の表示から正本として復元する。チャット情報を品質ゲートに直接使う。
- Related files: `docs/task-009-セキュリティ境界と実処理接続方針.md`
- Review condition: 公式APIで取得できる範囲、権限、保存形式、使用目的が文書化されたとき。

## Decision ZC-D-010

- Decision ID: ZC-D-010
- Date: 2026-06-13
- Status: accepted
- Decision: 過去配信に対しては、D4-liteとして画面OCRによる部分観測を補助ログ扱いで検討する。ただし品質ゲートや足切りには使わない。
- Reason: 過去配信では正式チャット取得ができない場合がある。画面OCRは補助情報になり得るが、観測漏れや誤認識があるため、品質判断の正本や自動足切りに使うべきではない。
- Alternatives considered: D4-liteを正式D4の代替にする。画面OCRを品質ゲートに使う。過去配信ではチャット相当情報を一切検討しない。
- Related files: `docs/task-009-セキュリティ境界と実処理接続方針.md`
- Review condition: D4-liteを検討する場合、補助ログの不確実性、保存範囲、UI表示、使用禁止範囲が文書化されたとき。

## Decision ZC-D-011

- Decision ID: ZC-D-011
- Date: 2026-06-13
- Status: superseded
- Decision: 旧草案と初期ブリーフは保持せず削除し、Codex管理文書は現行処理に関係するものへ絞る。
- Reason: 旧草案を参考資料として残すと、切り捨てたテキスト品質評価、長文プロンプト、品質比較が作業対象として復活しやすい。現在必要なのは、工程、承認、人間判断、成果物参照、実処理接続条件を説明する文書である。
- Alternatives considered: 旧草案を参考資料として残す。旧草案を直接編集して現行仕様に合わせる。Codex管理文書を作らずに会話で管理する。
- Related files: `docs/codex/zev2-progress.md`, `docs/current-implementation.md`, `docs/zev2-flow-contract.md`
- Review condition: Codex管理文書の置き場所や管理主体を変更する必要が出たとき。

## Decision ZC-D-012

- Decision ID: ZC-D-012
- Date: 2026-06-13
- Status: accepted
- Decision: ChatGPTとの会話内容は正典にしない。
- Reason: 会話内容は設計検討の参考にはなるが、ユーザーが確認できるリポジトリ内の記録と同じ扱いにはできない。今後の作業基準は、Codexが文書化し、ユーザーが確認した内容に限定する。
- Alternatives considered: ChatGPTとの会話をそのまま実装指示として扱う。会話要約を正典にする。外部会話を参照しない。
- Related files: `docs/codex/zev2-progress.md`
- Review condition: 外部会話から採用する内容がある場合、Codex管理文書に調査結果として書き直し、ユーザー確認を受けたとき。

## Decision ZC-D-013

- Decision ID: ZC-D-013
- Date: 2026-06-13
- Status: accepted
- Decision: control plane spec を作成してから実装に進む。
- Reason: 現行実装ではAI処理完了、判断ログ、人間承認ゲート、投稿可能状態、最終完了状態が分離されていない。仕様書なしで実装に進むと、状態と承認の意味が混ざる。
- Alternatives considered: 既存APIに直接判断ログを追加する。先にUIだけ追加する。既存dry-runをそのまま拡張する。
- Related files: `docs/codex/control-plane-spec.md`, `docs/codex/zev2-progress.md`
- Review condition: control plane spec の前提に問題が見つかり、実装設計前に見直す必要が出たとき。

## Decision ZC-D-014

- Decision ID: ZC-D-014
- Date: 2026-06-13
- Status: accepted
- Decision: agent completed と human approved を状態として分離する。
- Reason: 現行のAI作業完了は、AIエージェントが処理を終えたことだけを意味する。人間が候補、編集案、生成結果、投稿可否を承認したこととは別である。
- Alternatives considered: 現行 `succeeded` を人間承認済みとして扱う。UI表示だけで区別する。状態名を全面的に置き換える。
- Related files: `docs/codex/control-plane-spec.md`, `packages/shared/src/index.ts`, `backend/src/routes/control.ts`
- Review condition: AI処理完了と人間承認済みを分離すると既存の作業管理が過度に複雑になることが確認されたとき。

## Decision ZC-D-015

- Decision ID: ZC-D-015
- Date: 2026-06-13
- Status: accepted
- Decision: `review_required` を導入する。
- Reason: 人間確認が必要な対象を明示しないと、AI処理完了後に重要状態へ自動で進む危険がある。現行の `waiting` は前工程待ちであり、人間確認待ちとは意味が違う。
- Alternatives considered: `waiting` で代用する。UIだけで確認待ちを表示する。判断ログだけで確認待ちを表現する。
- Related files: `docs/codex/control-plane-spec.md`, `client/src/App.vue`, `client/src/stores/controlQueue.ts`
- Review condition: 人間確認待ちを独立状態にしない方が明確な保存設計が見つかったとき。

## Decision ZC-D-016

- Decision ID: ZC-D-016
- Date: 2026-06-13
- Status: accepted
- Decision: `decision_log` を重要なAI判断で必須化する。
- Reason: 候補選択、映像確認、編集案、投稿可能化などの判断が自由文や成果物参照だけに残ると、後から理由と根拠を追えない。
- Alternatives considered: 完了理由の自由文だけを残す。成果物JSONの中にだけ判断を残す。監査ログだけで代用する。
- Related files: `docs/codex/control-plane-spec.md`, `docs/task-006-AI操作ログと監査履歴.md`
- Review condition: 最小実装設計で、必須化する工程や保存項目をさらに絞る必要が出たとき。

## Decision ZC-D-017

- Decision ID: ZC-D-017
- Date: 2026-06-13
- Status: accepted
- Decision: `human_review_action` を保存する。
- Reason: 承認、却下、修正要求の理由を保存しないと、人間がどの判断を変えたのか、後続工程が何を反映すべきか追跡できない。
- Alternatives considered: 人間判断を状態遷移だけにする。理由入力をUIだけに残す。監査ログだけに保存する。
- Related files: `docs/codex/control-plane-spec.md`, `docs/task-007-人間制御APIとUI整理.md`
- Review condition: 承認、却下、修正要求以外の人間操作が初期実装に必要になったとき。

## Decision ZC-D-018

- Decision ID: ZC-D-018
- Date: 2026-06-13
- Status: accepted
- Decision: 初期control planeの停止ポイントは、候補生成後と動画生成前を優先する。
- Reason: 候補選びを誤ると後工程がすべて無駄になる。動画生成はコストと成果物の意味が重いため、初回依頼承認とは別に人間が止められる必要がある。すべての工程に承認ゲートを入れるより、最初は判断の影響が大きい箇所に絞る。
- Alternatives considered: すべての工程で承認を要求する。動画生成後だけ確認する。初回依頼承認だけで動画生成まで進める。
- Related files: `docs/codex/control-plane-spec.md`, `docs/codex/zev2-progress.md`
- Review condition: 候補生成後または動画生成前より先に止めるべき工程が、実装設計またはユーザーレビューで明確になったとき。

## Decision ZC-D-019

- Decision ID: ZC-D-019
- Date: 2026-06-13
- Status: accepted
- Decision: 初期UIはJSONログ閲覧ではなく、判断要約、理由、根拠参照、次に起きる処理、承認、却下、修正依頼に絞る。
- Reason: control plane の目的は、AIの判断を人間が運用上確認できるようにすることである。巨大なJSON、STT全文、LLM全文、詳細ダッシュボードを主導線にすると、人間が止める、通す、戻す判断がしづらくなる。
- Alternatives considered: JSONログビューを主導線にする。詳細ダッシュボードから作る。UIは作らずAPIだけで確認する。
- Related files: `docs/codex/control-plane-spec.md`, `client/src/App.vue`, `client/src/stores/controlQueue.ts`
- Review condition: 初期UIの最小表示だけでは、人間が承認、却下、修正依頼を判断できないことが確認されたとき。

## Decision ZC-D-020

- Decision ID: ZC-D-020
- Date: 2026-06-13
- Status: accepted
- Decision: ZEVの既存実装は、zev2の実処理接続の参考として自由に使う。ただし後方互換や実装移植を目的にしない。
- Reason: ZEVにはSTT、Gemini、候補生成、Remotion、ffmpeg、投稿候補パッケージなど、zev2の実処理接続で参考になる実装がある。一方でzev2は新規プロジェクトであり、backendに実STT、実LLM、実Gemini、実動画生成を直接抱え込まない責務分離を守る必要がある。
- Alternatives considered: ZEVを参照しない。ZEVの実装構造へ寄せる。ZEV互換の分岐をzev2へ入れる。
- Related files: `/Users/kawafmm/workspace/zev`, `/Users/kawafmm/workspace/zev_backend`, `/Users/kawafmm/workspace/zev_client`, `docs/codex/zev2-progress.md`
- Review condition: ZEV参照によりzev2の責務分離、pnpm固定、Electron非採用、後方互換禁止に反する設計が入りそうになったとき。

## Decision ZC-D-021

- Decision ID: ZC-D-021
- Date: 2026-06-14
- Status: accepted
- Decision: ユーザーが画面レビューしている間、Codexは実装修正を始めず、見つかった問題点を先に `docs/codex/` へ記録する。
- Reason: レビュー中に実装を変えると、ユーザーが見ている対象とCodexが直している対象がずれる。問題点を文書化せずに修正へ進むと、何を直すための変更だったか後で追えない。
- Alternatives considered: レビュー中にCodexが即時修正する。問題点を会話だけで扱う。修正後にまとめて理由を書く。
- Related files: `docs/codex/zev2-progress.md`, `client/src/App.vue`
- Review condition: ユーザーが明示的にライブ修正を求めた場合、またはレビューと実装修正を同時に行う運用へ変更する場合。

## Decision ZC-D-022

- Decision ID: ZC-D-022
- Date: 2026-06-14
- Status: accepted
- Decision: 承認ゲートのUIは、判断ログを表示するだけでなく、人間が何を見て承認、修正依頼、却下を選ぶかを表示する。
- Reason: 現在のUIはAIの判断、理由、根拠、次に起きる処理を表示しているが、ユーザーが「何を見てどう考えて承認したらいいか」を判断できなかった。control plane はログ保存だけでは足りず、人間が止める、通す、戻す判断をできる必要がある。
- Alternatives considered: 判断ログと成果物リンクだけを表示する。JSONプレビューを主導線にする。承認、修正依頼、却下の使い分けを会話や外部ドキュメントだけで説明する。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`, `docs/codex/control-plane-spec.md`
- Review condition: 承認画面を見たユーザーが、候補生成後と動画生成前のそれぞれで、確認対象、承認条件、修正依頼条件、却下条件、承認後に起きる処理を説明できるようになったとき。

## Decision ZC-D-023

- Decision ID: ZC-D-023
- Date: 2026-06-14
- Status: accepted
- Decision: 承認ゲートの画面は、主な問いを最上位に置き、AIの判断、理由、根拠、成果物、処理状態はその問いを判断するためのサブ情報として表示する。
- Reason: 現在の表示では、ユーザーが答えるべき問いと、その判断材料が同じレベルに並んでいる。主な問いが先に伝わらないと、承認、修正依頼、却下の判断ができない。
- Alternatives considered: 現在の表示順のまま情報量を増やす。AIの判断ログを先頭に置く。内部状態名を次の処理としてそのまま表示する。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 承認画面の先頭で、候補生成後は「この候補を映像確認へ進めてよいか」、動画生成前は「この編集案で動画生成へ進めてよいか」が主な問いとして読め、理由、根拠、成果物、状態が補助情報として見えるようになったとき。

## Decision ZC-D-024

- Decision ID: ZC-D-024
- Date: 2026-06-14
- Status: accepted
- Decision: 実行結果を確認している間、依頼入力欄を常時表示しない。新規依頼作成は必要時に開く操作として扱う。
- Reason: 現在の画面では、実行済みの結果や承認判断を見ている場面でも新しい依頼フォームが同じ強さで表示されている。これにより、画面の主導線が「現在の結果を確認する」ではなく「次の依頼を入力する」に見えやすい。
- Alternatives considered: 依頼入力欄を常時右側に固定する。実行結果確認と新規依頼作成を同じ重みで並べ続ける。依頼入力欄を完全に別画面へ分離する。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 実行中、確認待ち、完了後レビューで、現在の結果、主な問い、成果物が主導線になり、新規依頼作成は必要時に開ける状態になったとき。

## Decision ZC-D-025

- Decision ID: ZC-D-025
- Date: 2026-06-14
- Status: accepted
- Decision: UIテキストは、開発者向けの役割名や内部状態ではなく、利用者の行動、判断、結果の意味で書く。
- Reason: 現在の画面は、AIエージェント、API、工程、成果物、人間確認、内部状態など、実装側の構造をそのまま利用者に見せている。利用者が必要としているのは、今何を確認するのか、何を承認するのか、押すと何が起きるのかである。
- Alternatives considered: 実装構造をそのままUI文言に出す。開発者向け文言に短い説明を足す。詳細なヘルプ文で補う。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 主要UI文言が、利用者の行動、判断、確認対象、承認後に起きることとして読め、内部状態名やAPI名が主導線から外れたとき。

## Decision ZC-D-026

- Decision ID: ZC-D-026
- Date: 2026-06-14
- Status: accepted
- Decision: JSON表示は補助情報として扱い、展開後に閉じられるようにし、主要項目の意味を同時に参照できるようにする。
- Reason: 現在はJSONを展開すると閉じる操作がなく、項目名の意味も分からない。JSONを見せるだけでは利用者の判断材料にならないため、成果物の種類ごとに項目の意味を併記する必要がある。
- Alternatives considered: JSON本文だけを表示する。JSON表示を廃止する。項目説明を別ドキュメントに置く。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: JSONを開いた状態で閉じられ、候補JSON、編集案JSON、微調整JSON、動画生成計画JSONの主要項目の意味がUI上で同時に読めるようになったとき。

## Decision ZC-D-027

- Decision ID: ZC-D-027
- Date: 2026-06-14
- Status: accepted
- Decision: UIは、上部に処理の流れ図を置き、その下でプロセスごとのタブまたは同等の切り替えにより、各段階で必要な情報だけを表示する方向で見直す。
- Reason: 現在の画面は1画面に情報を出しすぎており、ユーザーが全体の流れと現在評価すべき対象を把握しづらい。処理の流れ図は有用だが、現在は画面の主導線になっていない。流れ図を上部に置き、下部をプロセス別に切り替えることで、全体像と各段階の評価対象を分けて扱える。
- Alternatives considered: 1画面に全情報を並べ続ける。承認欄だけを強調する。流れ図を削除する。依頼、承認、成果物を別ページへ完全分離する。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: ユーザーが画面上部で全体の現在位置を把握し、下部で依頼、候補確認、動画生成前確認、生成動画確認、修正点整理などの段階を切り替えて確認できるようになったとき。

## Decision ZC-D-028

- Decision ID: ZC-D-028
- Date: 2026-06-14
- Status: accepted
- Decision: ChatGPTはUI設計文書作成までを推奨したが、ユーザーが実装完了を明示したため、`docs/codex/ui-restructure-spec.md` を追加した上で `client/src/App.vue` の初期UI再構成まで実装する。
- Reason: ChatGPTの応答は正典ではなく、今回のユーザー指示は「作業を終わるまで実行」である。設計なしに実装すると表示構成が崩れやすいという指摘は有用なため、仕様書を作成してから、範囲をUI再構成に限定して実装する。
- Alternatives considered: ChatGPTの推奨通り設計文書だけで止める。UI仕様を残さずにApp.vueだけを直接修正する。実STTや動画品質改善まで同時に進める。
- Related files: `docs/codex/ui-restructure-spec.md`, `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: ユーザーがUI再構成を見て、タブ案ではなく別の画面構成へ戻す判断をしたとき。

## Decision ZC-D-029

- Decision ID: ZC-D-029
- Date: 2026-06-14
- Status: accepted
- Decision: 画面上の段階名では、動画生成前の承認を「動画生成前確認」、生成された動画の確認を「生成動画確認」と分ける。
- Reason: 「動画確認」だけでは、動画を作る前に編集案を承認する場面と、作られた確認用動画を見る場面が混ざって見える。今回のUI再構成の目的は、ユーザーが今どの段階で何を評価するか分かる状態にすることなので、段階名で判断対象を分ける必要がある。
- Alternatives considered: 「編集案確認」と「動画確認」のままにする。動画生成前承認を承認欄の説明だけで補う。生成済み動画の確認を修正点整理に吸収する。
- Related files: `client/src/App.vue`, `docs/codex/ui-restructure-spec.md`, `docs/codex/zev2-progress.md`
- Review condition: ユーザーが画面を見て、動画生成前に承認する内容と、生成後に見る内容を混同する場合。

## Decision ZC-D-030

- Decision ID: ZC-D-030
- Date: 2026-06-14
- Status: accepted
- Decision: 新しい依頼作成は、全体の流れより上に置き、現在の実行レビューとは別の開始操作として扱う。
- Reason: 新しい依頼作成は現在の工程の一部ではなく、別の実行を始める操作である。依頼プロセス内に置くと、現在の依頼内容確認と新規作成が混ざる。
- Alternatives considered: 依頼タブ内に新規作成フォームを置く。全体の流れの下に新規作成フォームを置く。実行履歴画面にだけ新規作成を置く。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 新しい依頼作成と現在の実行レビューが画面上で混ざって見える場合。

## Decision ZC-D-031

- Decision ID: ZC-D-031
- Date: 2026-06-14
- Status: accepted
- Decision: 段階切り替えは上部の全体の流れへ一本化し、重複するタブ列は表示しない。
- Reason: 全体の流れボタンとタブ列が同じ操作を持つと、どちらが主導線か分からない。全体の流れが現在位置と移動を担うなら、下には選択中段階の内容だけを表示する。
- Alternatives considered: 全体の流れを表示専用にしてタブを残す。全体の流れとタブの両方を残す。段階切り替えを別ページ化する。
- Related files: `client/src/App.vue`, `docs/codex/ui-restructure-spec.md`, `docs/codex/zev2-progress.md`
- Review condition: ユーザーが段階切り替え操作を二重に感じる場合。

## Decision ZC-D-032

- Decision ID: ZC-D-032
- Date: 2026-06-14
- Status: accepted
- Decision: 確認画面では、AIの提案、人間の判断、判断材料、操作ボタンを分離して表示する。
- Reason: 「保存済みの判断」「提案」「進める」「修正する」「止める」を同じ粒度で並べると、誰の判断か、何に対する操作か、何を見て判断するかが分からない。AIの提案を人間向けに要約し、その上で人間が判断する構造にする必要がある。
- Alternatives considered: 判断ログとJSONをそのまま表示する。項目説明だけを足す。操作ボタンの文言だけを変える。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 候補確認、動画生成前確認、修正点整理で、人間が何を見て判断するか分からない場合。

## Decision ZC-D-033

- Decision ID: ZC-D-033
- Date: 2026-06-14
- Status: accepted
- Decision: アクティブな依頼を確認している間、新しい依頼作成は主導線ではなく、全体の流れより上の副操作として扱う。
- Reason: 新しい依頼作成は別実行の開始操作であり、候補確認中の主な判断ではない。大きいカードで「最初に選ぶ操作」と表示すると、現在の候補確認より新規依頼が主操作に見える。
- Alternatives considered: 新しい依頼作成を大きいカードとして常時表示する。依頼工程内へ戻す。実行履歴画面だけに置く。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: ユーザーが画面上部を見て、新規依頼作成と現在の候補確認のどちらを行う画面か迷う場合。

## Decision ZC-D-034

- Decision ID: ZC-D-034
- Date: 2026-06-14
- Status: accepted
- Decision: 完了済み工程を見返している画面では、ワークフロー上の現在工程と、表示中の工程を分けて表示する。
- Reason: 「今の位置」と「確認済み」が同じ工程に出ると、処理がそこで止まっているのか、完了済み工程を見返しているのか分からない。現在工程と表示中工程を分けることで、流れ図を戻って見る意味が明確になる。
- Alternatives considered: 選択中の工程だけを現在位置として表示する。完了済み工程へ戻れないようにする。状態ラベルだけで補足する。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 完了済み工程を見返している時に、ユーザーが現在の処理段階を誤認する場合。

## Decision ZC-D-035

- Decision ID: ZC-D-035
- Date: 2026-06-14
- Status: accepted
- Decision: 承認済みの確認画面では、未判断時の承認・修正・却下ボタンを出さず、次工程を見る操作を主に表示する。
- Reason: すでに承認済みなのに「この候補で進める」が残ると、再度承認が必要に見える。保存済み判断の画面では、何を承認したかと、次に見る工程を示す方が人間の行動に合う。
- Alternatives considered: 承認済み後も同じ3ボタンを表示する。判断変更ボタンだけを表示する。承認済み画面では操作を一切出さない。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 承認済み状態で、ユーザーが再承認、修正依頼、却下を今すぐ選ぶべき画面だと誤解する場合。

## Decision ZC-D-036

- Decision ID: ZC-D-036
- Date: 2026-06-14
- Status: accepted
- Decision: 確認待ちまたは入力待ちがある場合、生成動画が存在していても、UIは先の工程へ自動表示しない。
- Reason: 生成動画が存在することと、利用者が次に判断すべき工程は別である。候補確認や動画生成前確認で入力または判断が必要な場合に生成動画確認へ進むと、実際には確認待ちなのに処理が先へ進んだように見える。
- Alternatives considered: 生成動画があれば常に生成動画確認を開く。最後に作られた成果物を優先表示する。全工程を同時に表示して利用者に探させる。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 依頼実行後、確認入力が必要な工程より先の工程が自動表示される場合。

## Decision ZC-D-037

- Decision ID: ZC-D-037
- Date: 2026-06-14
- Status: accepted
- Decision: UIの主表示には「人間」という文字を出さず、利用者本人の操作とAI側の処理状態として表現する。
- Reason: 判断するのは利用者だけなので、「人間確認」「人間判断」は開発者目線の対比に見える。AIは自動処理側なので、UIでは「処理中」「提案」「確認待ち」「保存済み」のように、利用者が次に何をするか分かる言葉で表す。
- Alternatives considered: AIと人間を対比する文言をそのまま出す。説明文で補足する。内部型名に合わせた状態名をUIへ出す。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: UIの主導線に「人間」という文字が表示される場合。

## Decision ZC-D-038

- Decision ID: ZC-D-038
- Date: 2026-06-14
- Status: revised
- Decision: 当初はUIで「あなたの指示」「AIの作業」「動画と成果物」を別レベルの情報として表示する方針にしたが、ZC-D-042で、AIの処理状態と成果物状態は現在状況1箇所へ統合し、「あなたの指示」は下位情報へ下げる方針に修正した。
- Reason: 利用者の入力、AIの処理状況、動画そのものの情報が同じ重さで並ぶと、今どこで止まっていて何を操作すべきか分からない。状況把握、判断材料、詳細情報を分ける必要がある。
- Alternatives considered: 工程カードだけで状況を示す。色付きカードを増やす。補助情報の説明文だけを増やす。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 画面を見ても、現在状況と依頼内容の上下関係が分からない場合。

## Decision ZC-D-039

- Decision ID: ZC-D-039
- Date: 2026-06-14
- Status: accepted
- Decision: 候補確認と動画生成前確認の選択肢は、説明テキストと実行ボタンを同じ判断カードにまとめる。
- Reason: 「この候補で進める」「候補を直したい」「この候補は使わない」や「この編集案で作る」「編集案を直したい」「動画作成は止める」で、説明とボタンが分離すると、どの説明を読んでどの操作を押すのか分からない。各選択肢には、選ぶ場面、選んだ後にAIが行うこと、実行ボタンを一体で表示する。
- Alternatives considered: 説明を上にまとめ、ボタンだけ下に並べる。ボタン文言を長くする。操作説明を補助情報に置く。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 判断の説明と操作ボタンの対応が画面から分からない場合。

## Decision ZC-D-040

- Decision ID: ZC-D-040
- Date: 2026-06-14
- Status: accepted
- Decision: 生成動画確認と修正点整理は、初期UIでは「生成後レビュー」として同じ工程にまとめる。
- Reason: 生成された動画を見ることと、見た結果として次に直す点を整理することは同じレビュー作業の前半と後半である。別工程に分けると、動画を見た後に何を判断するのかが分断される。
- Alternatives considered: 生成動画確認と修正点整理を別タブのまま残す。生成動画だけを表示し、修正点は別ドキュメントに記録する。修正点整理を詳細情報に下げる。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 生成後レビューで、動画確認と次に直す点の関係が分からない場合。

## Decision ZC-D-041

- Decision ID: ZC-D-041
- Date: 2026-06-14
- Status: accepted
- Decision: 仮STT、仮Gemini、仮動画生成など、実装が仮である部分はUI上に明示する。
- Reason: 仮実装の制限を隠すと、利用者は候補や動画の品質が低いのか、まだ実処理が未接続なのかを判断できない。特にSTTが仮の場合、候補内容の評価は保留であることを画面上で伝える必要がある。
- Alternatives considered: 仮実装の説明をdocsだけに置く。成果物JSONを開けば分かる状態にする。仮実装の品質を本物の候補として見せる。
- Related files: `client/src/App.vue`, `runner/src/index.ts`, `docs/codex/zev2-progress.md`
- Review condition: UI上で、成果物の品質問題と仮実装の制限が区別できない場合。

## Decision ZC-D-042

- Decision ID: ZC-D-042
- Date: 2026-06-14
- Status: accepted
- Decision: システムからユーザーへの目立つ状態メッセージは、画面上部の現在状況1箇所にまとめる。AIの処理状態と成果物状態は表示上1つに統合し、「あなたの指示」はその下の低いレベルで表示する。
- Reason: 「あなたの指示」「AIの作業」「動画と成果物」を全体の流れ直下に同じ強さで置くと、工程ナビゲーションの説明なのか、依頼全体の状態なのか、現在の判断対象なのかが混ざる。目立つメッセージが複数あると見落としの原因になるため、処理状態と成果物状態は現在状況として1箇所に集約し、依頼内容は補助的に確認できる位置へ下げる。
- Alternatives considered: 3つの状態カードを全体の流れ直下に残す。状態ごとに別の通知カードを出す。依頼内容を最上位に固定表示する。完了通知を別アラートで出す。
- Related files: `client/src/App.vue`, `client/src/stores/controlQueue.ts`, `docs/codex/zev2-progress.md`
- Review condition: 画面上部に複数の目立つシステムメッセージが表示される場合、または全体の流れに工程ではない情報が混ざる場合。

## Decision ZC-D-043

- Decision ID: ZC-D-043
- Date: 2026-06-14
- Status: accepted
- Decision: 判断理由、修正理由、停止理由などの入力欄は、対応する選択肢カードの中に置く。選択肢は横並びではなく縦に並べる。
- Reason: 入力欄が選択肢の外にあると、どの操作に対する理由を書く欄なのか分かりにくい。説明文と実行ボタンも分離すると、どの説明を根拠にどのボタンを押すのかが追いづらい。各選択肢の中に理由入力と実行ボタンを入れることで、利用者の判断が1つのまとまりとして読める。
- Alternatives considered: 共通の理由入力欄を選択肢の上に置く。理由入力を選択後のダイアログに出す。理由入力を任意の補助情報として下部に置く。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 利用者が、どの判断に対して理由を書くのか迷う場合。

## Decision ZC-D-044

- Decision ID: ZC-D-044
- Date: 2026-06-14
- Status: accepted
- Decision: 情報階層は全画面で、インデント、余白、見出しサイズ、境界線により表現する。仮実装の範囲は工程の先頭ではなく、下部の補足情報として表示する。工程切り替え時は画面上部へ戻す。
- Reason: 色付きカードを増やすだけでは、主情報、補足情報、根拠、詳細、入力欄の強さが同じに見える。利用者はまず現在状況と今決めることを見て、その下に判断材料、補助情報、仮実装の制限を読む必要がある。タブ移動後に前のスクロール位置が残ると、現在工程の先頭を見失う。
- Alternatives considered: 色だけで重要度を分ける。仮実装の説明を工程上部に大きく出す。スクロール位置を維持する。候補確認だけインデントを入れる。
- Related files: `client/src/App.vue`, `docs/codex/zev2-progress.md`
- Review condition: 画面全体で、最初に見るべき情報と補足情報が同じ強さに見える場合。

## Decision ZC-D-045

- Decision ID: ZC-D-045
- Date: 2026-06-20
- Status: accepted
- Decision: 設計書は人間向けの説明として保つ。内部型、API名、JSON項目、AIエージェント都合の工程名を主語にせず、人間が何を選び、何を確認し、どこで止められるかを先に書く。
- Reason: 設計書が実装者向けの状態名や成果物名中心になると、ユーザーが「どの内容で切り抜くか」「見つかった素材で動画にできそうか」「何を削るべきか」を判断できない。現在の目的は、細かい補助計測を増やすことではなく、文字起こしから内容候補を整理し、人間が面白そうな内容を選び、AIが使用素材を探し、人間が素材で進めるか確認する流れを固定することである。
- Alternatives considered: API仕様を設計書の主文にする。JSONスキーマを先に並べる。AIエージェントの工程名だけで流れを説明する。
- Related files: `docs/codex/control-plane-spec.md`, `docs/current-implementation.md`, `docs/ai-agent-api.md`, `client/src/App.vue`
- Review condition: 設計書を読んでも、人間が何を選ぶのか、何を確認するのか、どこで止めるのかが分からない場合。
