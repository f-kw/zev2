# presentation リポジトリ実体棚卸し（コード地図）v001

## 0. 基準点と目的

- 基準コミット: `9894eb9d25b33d65341eec11cc95764fc2a8941d`
- 棚卸し日: 2026-07-26
- 調査方法: 上記コミットのGit追跡一覧、各ソースの内容、最終変更コミット、import・固定値参照を読み取り専用で照合した。
- 目的: 将来のスケルトン設計で、人間が先に固定すべき全体骨格、既に検査済みの部品、休眠資産、集中・重複箇所を同じ地図から読めるようにする。
- 次版: B4完了の安定点で、本書を起点に差分だけを再走査したv002を作る。
- 人間作業: 0件。

### 「全実体」の範囲

Git追跡ファイルは4,495件ある。そのうち2,846件が生成出力、1,043件が報告書、35件がfixture、26件が調査媒体、68件がSTT資産である。本書でファイル単位に全件掲載する「実体」は、スケルトンを再実行・検査・支援するソース309件（JavaScript/TypeScript/Python/Shell/HTML/CSS/Vue）とした。生成出力・報告・fixture・媒体・STTは、コードから参照される系統と保存場所を本文で示し、4,018件を個別列挙してコード地図を埋没させない。

行数は基準コミットの内容に対する概算で、空行・コメントを含む。最終変更欄は「短縮commit＋commit件名」であり、ゲート名が件名にない古い資産は件名をそのまま記録した。分類は現行のpresentation主線を基準にしており、「休眠」は削除候補という意味ではなく、現在の正式入口から実行されない実験・凍結資産を指す。

## 1. 規模サマリ

| 分類 | ファイル数 | 概算行数 | 意味 |
|---|---:|---:|---|
| production本体 | 96 | 52,725 | アプリ制御、runner、現行presentationの生成・変換・検査入口 |
| 検査・評価系 | 97 | 49,735 | 合成検査、回帰、preflight、旧評価の読み取り分析 |
| 支援系 | 75 | 28,110 | 人間確認ページ、入力準備、凍結、記録、運用スクリプト |
| 休眠・実験記録系 | 41 | 18,839 | 現行主線から呼ばれない旧版・凍結実験・探索処理 |
| **合計** | **309** | **149,409** | 本書のファイル単位棚卸し対象 |

観測として、検査・評価がproduction本体とほぼ同規模である。これは検査文化が厚い一方、スケルトン設計では「本体の骨格」と「証明の骨格」を別レイヤーに分けないと全体像が読みにくくなる規模である。

## 2. 現在の本体パイプライン

```text
人間が認定した組立決定
  │
  ├─ 外側区間と内部カットをframe/sampleへ固定
  ▼
基礎映像 + timeline v002
  │
  ├─ 採用区間に残った発話だけを抽出
  ▼
残存source atom 354件
  │
  ├─ 本文を変えず機械的な行末候補を列挙
  ▼
境界候補 205件（Gate A）
  │
  ├─ Geminiへ渡す選択肢・来歴・検査情報を梱包
  ▼
正式package 7ファイル（B1〜B3）
  │
  ├─ Geminiは行末と1〜2行のまとまりだけを選ぶ
  ▼
意味回答の受入・機械復元
  │
  ├─ caption/instruction契約へ写し、時間対応を検査
  ▼
表示計画（B4）
  │
  ├─ presetと素材参照を解決
  ▼
描画 → 描画後QC
```

### 工程と担当実体

| 工程 | 主な本体 | 主な検査・入口 | 現在地 |
|---|---|---|---|
| 組立決定 | `formalize_presentation_first_real_data_assembly_decision_v001.mjs` | 同名test、初回実データ確認UI群 | candidate 13の正式決定済み。素材固有の認定変換 |
| 基礎映像 | `presentation_base_media_build_v001.mjs`、`presentation_base_media_timeline_v002.mjs`、`render_presentation_v002.mjs` | build/timeline/renderer各test、音声時計走査 | 実基礎映像まで成立。v002が正式入口、v001は実験記録 |
| 354件 | `presentation_retained_source_atoms_v001.mjs` | 同名test、正式job runner | 正式成果物成立済み |
| 205候補 | `presentation_segmenter_boundary_evidence_v001.mjs` | 同名test、preflight runner | Gate A完了済み |
| package | `presentation_caption_semantic_source_package_v001.mjs` | 6,257行のtest、正式job runner | B3完了・正式7ファイル封印済み |
| 意味回答 | `presentation_caption_semantic_output_v001.mjs` | 3,390行のtest、受入runner | 実走前。B1契約の受入器と検査は成立 |
| 表示計画 | `presentation_caption_display_pair_v003.mjs`、caption/instruction v003 | 88件の表示計画検査、意味回答133件、静的preflight | B4途中。基準点ではpreflight v002が11/12で停止中 |
| 描画 | `presentation_renderer_plan_v002.mjs`、`presentation_renderer_entry_v001.tsx`、`render_presentation_v002.mjs` | renderer v002 test、QC v002 | 合成データで成立。実データ表示計画の到着待ち |

重要な構造上の観測は二つある。

1. 現行主線の正式処理は主に`evals/clip_composition`にあり、`backend`→`runner`の通常アプリ工程へ一本のproductionパイプラインとしてまだ接続されていない。今の成果は「検査済みの製造部品と正式job」であり、スケルトン設計ではこの部品列をどの制御面から呼ぶかを明示する必要がある。
2. candidate 13固有値は、初回素材の認定変換・媒体同一性・確認UI・正式job/preflightには存在する。一方、基礎映像、354件抽出、205候補生成、package、意味回答、表示計画の変換器本体は固有件数をpreflight期待値として分離する設計である。

## 3. 休眠資産の状態判定

| 資産 | 現在の位置づけ | 現行契約との整合 | 読み取り判定 |
|---|---|---|---|
| テーマ生成v002＋`clip_composition_prompt_v012`系統 | 第一関門までの候補探索とG4由来の上流。保存済み成果物は来歴として残る | 現行presentationは保存済み候補・決定を入力にし、テーマ生成コードを直接呼ばない。artifact境界では衝突しない | **隔離して保存可能**。Web Gemini直列実行・旧prompt入出力はB1〜B4の版付きpackage契約に接続されておらず、再稼働時は入力schemaの再確認が必要という腐敗の疑い |
| connection-v001 / llm-v012 | テーマ根拠範囲を最終候補区間へ写す標準として実測保存。v013は棄却記録 | G4設計の来歴では参照されるが、candidate 13の正式組立決定以降の主線には入らない | **保存済み結果は整合**。実行コードはWeb Geminiと旧候補schemaに依存し、現行のframe/sample正本へ直接渡せないため休眠。再実走を現行接続と呼ぶのは危険 |
| callback-detection-v001 | 旧問題「面白い原因」を探す実験。意味評価0/2 | DECISIONSで旧問題設定を廃止。次版は「理解に必要な情報を先に言う発話」の探索へ転換し凍結中 | **将来契約とは不整合**。コードとpromptは失敗実験の再現資産としてのみ有効。流用ではなく次版の別設計が必要 |
| 層1v001/v002/v003・声VAD | 無音・長い間の診断、WebRTC VAD、33区間証拠。自動カットは凍結 | 「自動で切らず、人間へ確認位置を示す」用途だけ現行方針と整合 | **診断基盤は保全価値あり**。Python依存と素材別入力を持つため、そのままproduction化は不可。境界候補の音響確認へ使う場合は閾値を流用せず別契約が必要 |
| renderer v001 / timeline v001 / caption・instruction旧版 | 合成実証と契約発展の履歴 | 実データ正式入口はv002/v003。後方互換は禁止 | **実験記録として保持**。旧入口を自動選択する経路は作らない。共有計算を参照する箇所は「互換」ではなく検査済み単一実装の再利用として区別する |
| 旧境界・fixture・STT比較群 | 第一関門までの上界診断と教師対応 | 現行主線の正式成果物を作らない | **評価資産として隔離可能**。新素材へ適用するproduction入口だと見なすと腐敗の疑いがある |

## 4. 重複・特異点

### 4.1 二重実装の疑い

- canonical JSON相当の正規化が少なくとも`presentation_caption_contract`の3世代、残存atom、話者policy、Gate A runner、旧比較媒体に個別実装されている。版ごとのbyte契約を守る意図的分離も含むため直ちに統合対象とは断定しないが、スケルトン設計時には「正本が一つであるべき計算」と「版ごとに独立すべき直列化」を先に分類する必要がある。
- caption/instruction契約はv001・v002・v003が並存する。v002 captionがv003の共有検査処理を参照する箇所は二重実装の回避であり、後方互換shimではない。一方、旧previewやpreset確認はv001契約を参照し続けるため、正式入口一覧がないと誤用しやすい。
- `runner/src/remotion/utils/telop-line-break.ts`と`runner/src/telop/telop-line-break.ts`、同じく`text-metrics.ts`が二つのpathに見える。前者は1行の再exportで実計算は後者に集約されており、観測上は二重実装ではない。
- presentation側の文字配置とrunner側のテロップ配置は責務境界が異なるが、文字幅・改行・安全領域という似た概念を扱う。現時点では別契約であり、共通化可能と断定しない。将来のスケルトンでは「意味計画」と「描画実現」の境界を越えて計算を複製しない監視点になる。

### 4.2 candidate 13固有値

- 固有値を含む本体側実体: `formalize_presentation_first_real_data_assembly_decision_v001.mjs`、`presentation_source_media_equivalence_v001.mjs`、初回確認・比較・信頼binding群。これらは初回正式素材の認定・同一性証明を担うため、素材専用であることが役割上明示されている。
- 固有件数354・205は正式jobとpreflight・検査へ固定されるが、汎用変換器の分岐条件にはしていない。
- **漏れの疑いとして注意**: `check_approved_document_bindings_v001.mjs`はcandidate 13名を含む承認済み文書を静的列挙する。これは現時点の文書正本を守るものだが、素材追加時に単一の汎用binding台帳へ発展させないと、初回素材固有の集中点になる。
- 旧`presentation_first_real_data_gate_v001.mjs`と確認UIはcandidate 13をコードで拒否条件にしている。これらを次素材のproduction UIとして再利用してはいけない。現行では支援・実験資産として隔離されている。

### 4.3 1ファイルへの集中

| ファイル | 行数 | 観測 |
|---|---:|---|
| `test_presentation_caption_semantic_source_package_v001.mjs` | 6,257 | package、公開、改ざん、別process、環境差の検査が一つに集中 |
| `presentation_caption_semantic_source_package_v001.mjs` | 4,835 | B1〜B3のschema・読取・hash・公開を一つが担う |
| `client/src/App.vue` | 3,742 | 人間UIの複数画面・状態が一コンポーネントに集中 |
| `presentation_caption_semantic_output_v001.mjs` | 3,671 | 意味回答の受入、再構築、違反帰属が集中 |
| `test_presentation_caption_semantic_output_v001.mjs` | 3,390 | B2検査が集中 |
| `run_presentation_caption_semantic_source_package_job_v001.mjs` | 3,132 | job固定、環境・公開・failure処理が集中 |
| `presentation_base_media_build_v001.mjs` | 2,492 | 動画・音声格子・公開を一つが担う |

集中は即時の分割指示ではない。分割でhash正本や検査入口を増やす副作用があるため、スケルトン設計では先に「工程境界」「信頼根」「純粋計算」「I/O公開」の四つへ責務を描き、分割の単位を契約から決めるべきである。

## 5. スケルトン設計への入力候補

本棚卸しから、次の骨格をコードで先に固定する候補が得られる。

1. **制御骨格**: 一つの正式入口が、版付き工程を順番に呼び、各工程の入力hash・出力hash・停止理由を同じ実行記録へ残す。
2. **データ骨格**: 組立決定、基礎映像、残存発話、境界候補、意味package、表示計画、描画成果物を別型・別directoryにし、前工程の正式成果物だけを次工程が読む。
3. **検査骨格**: productionと同じ純粋処理を合成検査が呼び、素材固有期待値はpreflightへ隔離する。
4. **人間骨格**: 人間は候補生成ではなく認定だけを行い、1回5件前後、時間計測なし、結果コピーという既存UX契約を共通UI部品にする。
5. **休眠骨格**: callback・層1・旧connectionを主線importから外したまま、再開条件・入力版・成果物版を台帳で示す。
6. **版骨格**: v001/v002/v003を自動変換しない。正式入口と実験記録をmanifestで区別し、共有できる純粋計算だけを一つにする。

v001は設計案そのものではなく、その入力候補である。B4完了時のv002では、基準commit以後に追加・変更されたファイル、正式入口の移動、行数集中の変化、休眠資産から主線へ戻ったものだけを差分更新する。

## 6. ファイル単位の全実体一覧

表の「対応契約・検査群」は厳密な一対一の所有関係ではなく、コード名・import・最終変更履歴から読める主な所属である。複数工程にまたがるものは主用途を記した。

### 6.1 production本体

| path | 行 | 役割 | 対応契約・検査群 | 最終変更（commit / ゲート） |
|---|---:|---|---|---|
| `backend/src/activity/build.ts` | 730 | 承認済み処理のbuildを担当 | 実行前下書き・承認・キュー制御 | 90f528a3 Geminiレビュー依頼のUI文言を人間向けに整理 |
| `backend/src/artifacts/artifact-path.ts` | 36 | 承認済み処理のartifact pathを担当 | 実行前下書き・承認・キュー制御 | f7f012b1 backendの状態更新を直列化し、安全性と重複を改善 |
| `backend/src/artifacts/validation.ts` | 178 | 承認済み処理のvalidationを担当 | 実行前下書き・承認・キュー制御 | 8807ff47 R-2ステップ2: 成果物検証と作り直し一式をモジュールへ切り出し |
| `backend/src/config/runtime-config.ts` | 306 | 承認済み処理のruntime configを担当 | 実行前下書き・承認・キュー制御 | f7f012b1 backendの状態更新を直列化し、安全性と重複を改善 |
| `backend/src/config/runtime-dir.ts` | 7 | 承認済み処理のruntime dirを担当 | 実行前下書き・承認・キュー制御 | f7f012b1 backendの状態更新を直列化し、安全性と重複を改善 |
| `backend/src/domain/agent-lifecycle.ts` | 100 | 承認済み処理のagent lifecycleを担当 | 実行前下書き・承認・キュー制御 | 913e1915 R-2ステップ5: claim/fail/claim復旧をdomain/agent-lifecycle.tsへ切り出し |
| `backend/src/domain/control-review.ts` | 462 | 承認済み処理のcontrol reviewを担当 | 実行前下書き・承認・キュー制御 | d56fa0d6 R-2ステップ3: 人間確認の発行と操作をdomain/control-review.tsへ切り出し |
| `backend/src/domain/operation-log.ts` | 43 | 承認済み処理のoperation logを担当 | 実行前下書き・承認・キュー制御 | 01075f47 R-2ステップ0: 共通ヘルパー・操作ログ・stateセレクタをdomain/へ切り出し |
| `backend/src/domain/restart.ts` | 603 | 承認済み処理のrestartを担当 | 実行前下書き・承認・キュー制御 | 8807ff47 R-2ステップ2: 成果物検証と作り直し一式をモジュールへ切り出し |
| `backend/src/domain/state-selectors.ts` | 118 | 承認済み処理のstate selectorsを担当 | 実行前下書き・承認・キュー制御 | 01075f47 R-2ステップ0: 共通ヘルパー・操作ログ・stateセレクタをdomain/へ切り出し |
| `backend/src/domain/support.ts` | 29 | 承認済み処理のsupportを担当 | 実行前下書き・承認・キュー制御 | 01075f47 R-2ステップ0: 共通ヘルパー・操作ログ・stateセレクタをdomain/へ切り出し |
| `backend/src/index.ts` | 32 | 承認済み処理のindexを担当 | 実行前下書き・承認・キュー制御 | f7f012b1 backendの状態更新を直列化し、安全性と重複を改善 |
| `backend/src/routes/artifact-upload.ts` | 161 | 承認済み処理のartifact uploadを担当 | 実行前下書き・承認・キュー制御 | f7f012b1 backendの状態更新を直列化し、安全性と重複を改善 |
| `backend/src/routes/control.ts` | 984 | 承認済み処理のcontrolを担当 | 実行前下書き・承認・キュー制御 | 913e1915 R-2ステップ5: claim/fail/claim復旧をdomain/agent-lifecycle.tsへ切り出し |
| `backend/src/runner/auto-runner.ts` | 108 | 承認済み処理のauto runnerを担当 | 実行前下書き・承認・キュー制御 | f7f012b1 backendの状態更新を直列化し、安全性と重複を改善 |
| `backend/src/security/agent-auth.ts` | 26 | 承認済み処理のagent authを担当 | 実行前下書き・承認・キュー制御 | a3489f15 人間UIの任意認証を追加する |
| `backend/src/security/api-token.ts` | 25 | 承認済み処理のapi tokenを担当 | 実行前下書き・承認・キュー制御 | a3489f15 人間UIの任意認証を追加する |
| `backend/src/security/human-auth.ts` | 75 | 承認済み処理のhuman authを担当 | 実行前下書き・承認・キュー制御 | a3489f15 人間UIの任意認証を追加する |
| `backend/src/store/json-store.ts` | 237 | 承認済み処理のjson storeを担当 | 実行前下書き・承認・キュー制御 | 1894b8b0 Web Geminiレビュー状態をstate.jsonへ二重書きする |
| `backend/src/web-gemini/artifacts.ts` | 129 | 承認済み処理のartifactsを担当 | 実行前下書き・承認・キュー制御 | 2b34fa96 Web Geminiレビューの読み出しをstateへ切り替え、ファイル読み込みを削除 |
| `backend/src/web-gemini/routes.ts` | 515 | 承認済み処理のroutesを担当 | 実行前下書き・承認・キュー制御 | f8f6cb25 R-2ステップ4: Web Gemini系5ルートをweb-gemini/routes.tsへ切り出し |
| `backend/src/web-gemini/run-status.ts` | 84 | 承認済み処理のrun statusを担当 | 実行前下書き・承認・キュー制御 | aae9da15 Web GeminiレビューedgeスクリプトをすべてAPI経由へ切り替え |
| `backend/src/web-gemini/state.ts` | 34 | 承認済み処理のstateを担当 | 実行前下書き・承認・キュー制御 | 1894b8b0 Web Geminiレビュー状態をstate.jsonへ二重書きする |
| `client/env.d.ts` | 1 | env.d処理 | 実行前下書き・承認・キュー制御 | b002273e zev2 初期実装を追加 |
| `client/index.html` | 12 | index処理 | 実行前下書き・承認・キュー制御 | b002273e zev2 初期実装を追加 |
| `client/src/activity-log.ts` | 127 | 人間向け画面のactivity logを担当 | 実行前下書き・承認・キュー制御 | 12081707 公開作業まわりのスコープ逸脱を戻す |
| `client/src/api.ts` | 272 | 人間向け画面のapiを担当 | 実行前下書き・承認・キュー制御 | 0fbd8364 Web Geminiレビューとactivityの型定義を@zev2/sharedへ集約 |
| `client/src/App.vue` | 3,742 | 人間向け画面のAppを担当 | 実行前下書き・承認・キュー制御 | 90f528a3 Geminiレビュー依頼のUI文言を人間向けに整理 |
| `client/src/assets/main.css` | 16 | 人間向け画面のmainを担当 | 実行前下書き・承認・キュー制御 | b002273e zev2 初期実装を追加 |
| `client/src/main.ts` | 13 | 人間向け画面のmainを担当 | 実行前下書き・承認・キュー制御 | b002273e zev2 初期実装を追加 |
| `client/src/plugins/vuetify.ts` | 10 | 人間向け画面のvuetifyを担当 | 実行前下書き・承認・キュー制御 | b002273e zev2 初期実装を追加 |
| `client/src/stores/controlQueue.ts` | 489 | 人間向け画面のcontrolQueueを担当 | 実行前下書き・承認・キュー制御 | e7b4f1a0 Web Geminiレビュー後の再生成方針ループを実装 |
| `client/vite.config.ts` | 22 | vite.config処理 | 実行前下書き・承認・キュー制御 | 9ac5e8e1 Fix regeneration flow and scenario isolation |
| `evals/clip_composition/check_approved_document_bindings_v001.mjs` | 201 | 固定契約を検査（approved document bindings v001） | 横断支援・旧評価 | 01adea08 B4承認済み改訂へ文書bindingを同期 |
| `evals/clip_composition/formalize_presentation_first_real_data_assembly_decision_v001.mjs` | 402 | 人間認定を正式決定へ変換（presentation first real data assembly decision v001） | 初回実データ組立決定 | 5ed5d03d feat(evals): candidate 13の正式組立決定を固定 |
| `evals/clip_composition/presentation_audio_grid_regression_projection_v001.mjs` | 269 | presentation audio grid regression projection v001処理 | 基礎映像・frame/sample対応 | 74c2a04d 音声格子の修正前後10件を同一ツールチェーンで再比較可能にする |
| `evals/clip_composition/presentation_base_media_build_v001.mjs` | 2,492 | presentation base media build v001処理 | 基礎映像・frame/sample対応 | 3c2e0377 正式再生成の実行バイナリ診断と新規jobを固定 |
| `evals/clip_composition/presentation_base_media_timeline_v002.mjs` | 1,350 | presentation base media timeline v002処理 | 基礎映像・frame/sample対応 | 3c2e0377 正式再生成の実行バイナリ診断と新規jobを固定 |
| `evals/clip_composition/presentation_caption_contract_v002.mjs` | 143 | presentation caption contract v002処理 | G1〜G3・話者契約 | 7035e951 B4表示計画のv003契約と正式検査経路を実装 |
| `evals/clip_composition/presentation_caption_contract_v003.mjs` | 718 | presentation caption contract v003処理 | B4・表示計画 | 7035e951 B4表示計画のv003契約と正式検査経路を実装 |
| `evals/clip_composition/presentation_caption_display_pair_v003.mjs` | 1,860 | presentation caption display pair v003処理 | B4・表示計画 | 17175188 B4数値token不変比較の来歴hash変化を記録して停止 |
| `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` | 3,671 | presentation caption semantic output v001処理 | 意味回答受入 | 2173b555 B2のhashbang限定受理を実装し第四原因で停止 |
| `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` | 4,835 | presentation caption semantic source package v001処理 | B1〜B3・正式package | 17175188 B4数値token不変比較の来歴hash変化を記録して停止 |
| `evals/clip_composition/presentation_instruction_contract_v002.mjs` | 1,484 | presentation instruction contract v002処理 | G1〜G3・話者契約 | e80740ca feat(evals): 話者クラスタと人物情報を分離する契約v002を実装 |
| `evals/clip_composition/presentation_instruction_contract_v003.mjs` | 387 | presentation instruction contract v003処理 | B4・表示計画 | 7035e951 B4表示計画のv003契約と正式検査経路を実装 |
| `evals/clip_composition/presentation_renderer_entry_v001.tsx` | 501 | presentation renderer entry v001処理 | レンダラー・描画後QC | 512a4964 演出レンダラーの合成実装と100件検査を追加 |
| `evals/clip_composition/presentation_renderer_plan_v002.mjs` | 605 | presentation renderer plan v002処理 | レンダラー・描画後QC | 1b79d269 feat(evals): 基礎映像生成とframe正本レンダラーv2を実装 |
| `evals/clip_composition/presentation_renderer_qc_v002.mjs` | 483 | presentation renderer qc v002処理 | レンダラー・描画後QC | 1b79d269 feat(evals): 基礎映像生成とframe正本レンダラーv2を実装 |
| `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` | 265 | presentation renderer text layout v001処理 | レンダラー・描画後QC | 512a4964 演出レンダラーの合成実装と100件検査を追加 |
| `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` | 1,750 | presentation retained source atoms v001処理 | 残存354文字 | 55df477f candidate 13の残存発話を安全に抽出する正式実装を追加 |
| `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` | 1,618 | presentation segmenter boundary evidence v001処理 | Gate A・205境界候補 | 051613f2 ゲートAの境界証拠生成と読み取り専用検査を実装 |
| `evals/clip_composition/presentation_source_media_equivalence_v001.mjs` | 1,238 | presentation source media equivalence v001処理 | 基礎映像・frame/sample対応 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/presentation_source_speaker_policy_v001.mjs` | 124 | presentation source speaker policy v001処理 | G1〜G3・話者契約 | e80740ca feat(evals): 話者クラスタと人物情報を分離する契約v002を実装 |
| `evals/clip_composition/render_presentation_v002.mjs` | 1,721 | 動画・確認媒体を描画（presentation v002） | レンダラー・描画後QC | 3c2e0377 正式再生成の実行バイナリ診断と新規jobを固定 |
| `evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs` | 821 | 固定jobを実行（presentation caption display pair job v001） | B4・表示計画 | 19da1f6b B4時間対応の拒否理由を透過し後続不合格で停止 |
| `evals/clip_composition/run_presentation_caption_display_pair_static_preflight_v001.mjs` | 364 | 固定jobを実行（presentation caption display pair static preflight v001） | B4・表示計画 | 7035e951 B4表示計画のv003契約と正式検査経路を実装 |
| `evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs` | 1,079 | 固定jobを実行（presentation caption semantic output check v001） | 意味回答受入 | 42e26ea0 eval: R1 R2 R3を実装しB2全件不合格を記録 |
| `evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs` | 3,132 | 固定jobを実行（presentation caption semantic source package job v001） | B1〜B3・正式package | 42e26ea0 eval: R1 R2 R3を実装しB2全件不合格を記録 |
| `evals/clip_composition/run_presentation_retained_source_atoms_job_v001.mjs` | 1,455 | 固定jobを実行（presentation retained source atoms job v001） | 残存354文字 | 55df477f candidate 13の残存発話を安全に抽出する正式実装を追加 |
| `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` | 1,296 | 固定jobを実行（presentation segmenter boundary preflight v001） | Gate A・205境界候補 | 051613f2 ゲートAの境界証拠生成と読み取り専用検査を実装 |
| `evals/clip_composition/scan_presentation_source_audio_clock_v001.mjs` | 669 | 媒体・候補を走査（presentation source audio clock v001） | 基礎映像・frame/sample対応 | e779fec6 音声の内部空白を絶対時刻へ配置し163件で回帰検証 |
| `evals/clip_composition/verify_presentation_caption_number_token_result_provenance_v001.mjs` | 451 | 来歴・完全性を照合（presentation caption number token result provenance v001） | 横断支援・旧評価 | 75b7ab96 B4不変比較で処理結果と承認済み来歴差を分離検証 |
| `packages/shared/src/activity.ts` | 57 | client/backend共有のactivity型・規則 | 実行前下書き・承認・キュー制御 | 0fbd8364 Web Geminiレビューとactivityの型定義を@zev2/sharedへ集約 |
| `packages/shared/src/common.ts` | 97 | client/backend共有のcommon型・規則 | 実行前下書き・承認・キュー制御 | ff93dce3 Web GeminiのファイルI/Oを独立モジュールへ分離し、実行状態更新APIを追加 |
| `packages/shared/src/index.ts` | 693 | client/backend共有のindex型・規則 | 実行前下書き・承認・キュー制御 | 1894b8b0 Web Geminiレビュー状態をstate.jsonへ二重書きする |
| `packages/shared/src/web-gemini-review.ts` | 81 | client/backend共有のweb gemini review型・規則 | 実行前下書き・承認・キュー制御 | 1894b8b0 Web Geminiレビュー状態をstate.jsonへ二重書きする |
| `runner/src/gemini-speech-ids.ts` | 38 | 実行・描画側のgemini speech ids処理 | 描画・工程実行ランタイム | cbecd466 テーマ候補作成工程をrunner本体から分離 |
| `runner/src/index.ts` | 850 | 実行・描画側のindex処理 | 描画・工程実行ランタイム | ff13854c runnerの子プロセス実行3関数を単一実装へ統合 |
| `runner/src/remotion/components/TelopText.tsx` | 154 | 実行・描画側のTelopText処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |
| `runner/src/remotion/index.ts` | 4 | 実行・描画側のindex処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/remotion/renderer/TelopRenderer.tsx` | 147 | 実行・描画側のTelopRenderer処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/remotion/Root.tsx` | 102 | 実行・描画側のRoot処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/remotion/styles.d.ts` | 1 | 実行・描画側のstyles.d処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/remotion/styles/telop.css` | 16 | 実行・描画側のtelop処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/remotion/utils/telop-font.ts` | 59 | 実行・描画側のtelop font処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/remotion/utils/telop-line-break.ts` | 1 | 実行・描画側のtelop line break処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/remotion/utils/text-metrics.ts` | 1 | 実行・描画側のtext metrics処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/screen-layout.ts` | 727 | 実行・描画側のscreen layout処理 | 描画・工程実行ランタイム | 07b95c2c 共通処理を共有パッケージへ集約 |
| `runner/src/shared/telop-glow.ts` | 108 | 実行・描画側のtelop glow処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/steps/composition.ts` | 114 | 実行・描画側のcomposition処理 | 描画・工程実行ランタイム | 3f17c027 切り抜き区間選択の評価環境と候補調査を追加 |
| `runner/src/steps/edit-plan.ts` | 826 | 実行・描画側のedit plan処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |
| `runner/src/steps/patch.ts` | 23 | 実行・描画側のpatch処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |
| `runner/src/steps/render-video.ts` | 602 | 実行・描画側のrender video処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |
| `runner/src/steps/source-video.ts` | 171 | 実行・描画側のsource video処理 | 描画・工程実行ランタイム | 54700ec5 動画取り込み工程をrunner本体から分離 |
| `runner/src/steps/theme-options.ts` | 207 | 実行・描画側のtheme options処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |
| `runner/src/steps/transcript.ts` | 377 | 実行・描画側のtranscript処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |
| `runner/src/telop-placement.ts` | 188 | 実行・描画側のtelop placement処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/telop-remotion.ts` | 114 | 実行・描画側のtelop remotion処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/telop-style.ts` | 145 | 実行・描画側のtelop style処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |
| `runner/src/telop/telop-line-break.ts` | 317 | 実行・描画側のtelop line break処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |
| `runner/src/telop/telop-render-model.ts` | 356 | 実行・描画側のtelop render model処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/telop/text-metrics.ts` | 63 | 実行・描画側のtext metrics処理 | 描画・工程実行ランタイム | 715ceaf0 Remotionでショート用テロップ生成を実装 |
| `runner/src/transcript-utils.ts` | 66 | 実行・描画側のtranscript utils処理 | 描画・工程実行ランタイム | cbecd466 テーマ候補作成工程をrunner本体から分離 |
| `runner/src/workflow-artifact-validation.ts` | 388 | 実行・描画側のworkflow artifact validation処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |
| `runner/src/workflow-artifacts.ts` | 180 | 実行・描画側のworkflow artifacts処理 | 描画・工程実行ランタイム | ea5eeb52 内容選択と使用素材確認の人間確認工程を実装 |
| `runner/src/workflow-step-builders.ts` | 342 | 実行・描画側のworkflow step builders処理 | 描画・工程実行ランタイム | 59fbd4af 固定モードの全経路実行を安定化 |

### 6.2 検査・評価系

| path | 行 | 役割 | 対応契約・検査群 | 最終変更（commit / ゲート） |
|---|---:|---|---|---|
| `evals/clip_composition/analyze_boundary_granularity_two_fixture.mjs` | 268 | 保存済みデータを分析（boundary granularity two fixture） | 境界診断・boundary-v001 | b7f9f599 eval: 境界粒度を診断しboundary-v001を設計 |
| `evals/clip_composition/analyze_boundary_granularity.ts` | 255 | 保存済みデータを分析（boundary granularity） | 境界診断・boundary-v001 | a6bb60b0 Add clip boundary granularity analysis |
| `evals/clip_composition/analyze_boundary_text_judgability.mjs` | 388 | 保存済みデータを分析（boundary text judgability） | 境界診断・boundary-v001 | 17a43dec Diagnose boundary-v001 text cues and record human-trim recommendation |
| `evals/clip_composition/analyze_candidate_ranking_causal_context.mjs` | 158 | 保存済みデータを分析（candidate ranking causal context） | candidate-ranking-v001/v002 | 2bcde798 候補の因果文脈監査と手直し試験v002案を追加 |
| `evals/clip_composition/analyze_candidate_ranking_signals.mjs` | 176 | 保存済みデータを分析（candidate ranking signals） | candidate-ranking-v001/v002 | 9b0c2f56 Institutionalize human workload limits and finish ranking desk check |
| `evals/clip_composition/analyze_chat_replay_velocity_source_only.mjs` | 321 | 保存済みデータを分析（chat replay velocity source only） | 横断支援・旧評価 | 583d3295 Fix first-gate chat input for the selected Hololive source |
| `evals/clip_composition/analyze_chat_replay_velocity.mjs` | 428 | 保存済みデータを分析（chat replay velocity） | 横断支援・旧評価 | 65a6b680 Freeze third material and run fixed evaluation pipeline |
| `evals/clip_composition/analyze_connection_boundary_distribution.mjs` | 352 | 保存済みデータを分析（connection boundary distribution） | connection-v001/v002・llm-v012/v013 | 40e6918b eval: 境界150runの実数値と四段階尺度を補完 |
| `evals/clip_composition/analyze_human_boundary_trim_trial.mjs` | 138 | 保存済みデータを分析（human boundary trim trial） | 境界診断・boundary-v001 | d2c04997 Fix the gate time unit and pre-register candidate ranking |
| `evals/clip_composition/analyze_layer1_acoustic_upper_bound.py` | 304 | 保存済みデータを分析（layer1 acoustic upper bound） | 層1・声VAD | 3e066114 層1v002の音響上界を測定し実装前設計を固定 |
| `evals/clip_composition/analyze_layer1_v003_long_gap_preflight.mjs` | 366 | 保存済みデータを分析（layer1 v003 long gap preflight） | 層1・声VAD | 1e3553ba 層1v003の保守的な長間抜きを全fixtureで机上診断 |
| `evals/clip_composition/analyze_theme_generation_failures.mjs` | 538 | 保存済みデータを分析（theme generation failures） | テーマ生成v002系 | 9cd737ed evals: record theme generation v001 failure analysis |
| `evals/clip_composition/analyze_theme_input_selection.mjs` | 384 | 保存済みデータを分析（theme input selection） | 横断支援・旧評価 | 0430cd78 evals: B素材の発話量順位と入力欠落原因を実測 |
| `evals/clip_composition/audit_theme_generation_candidates.mjs` | 339 | 成果物・候補を監査（theme generation candidates） | テーマ生成v002系 | 24144fff evals: audit theme candidates before review |
| `evals/clip_composition/check_stt_timestamp_boundaries.mjs` | 471 | 固定契約を検査（stt timestamp boundaries） | STT・発話対応 | 05aa7580 Record clip composition eval baselines and decisions |
| `evals/clip_composition/compare_aligned_audio_chunks.ts` | 501 | 版・候補間の差を比較（aligned audio chunks） | 横断支援・旧評価 | 69bb4035 Add YouTube subtitle alignment for second clip candidate |
| `evals/clip_composition/compare_audio_candidates.ts` | 578 | 版・候補間の差を比較（audio candidates） | 横断支援・旧評価 | d3292e8c 音声比較で切り抜き評価fixtureを追加 |
| `evals/clip_composition/compare_cutpoint_realignments.ts` | 489 | 版・候補間の差を比較（cutpoint realignments） | 横断支援・旧評価 | 05aa7580 Record clip composition eval baselines and decisions |
| `evals/clip_composition/compare_presentation_audio_grid_regression_projection_v001.mjs` | 263 | 版・候補間の差を比較（presentation audio grid regression projection v001） | 基礎映像・frame/sample対応 | 74c2a04d 音声格子の修正前後10件を同一ツールチェーンで再比較可能にする |
| `evals/clip_composition/compare_presentation_audio_grid_regression_projection_v002.mjs` | 142 | 版・候補間の差を比較（presentation audio grid regression projection v002） | 基礎映像・frame/sample対応 | f165571c 比較ハーネスの一時パス揺れと任意上書きを封じる |
| `evals/clip_composition/compare_presentation_audio_grid_regression_projection_v003.mjs` | 248 | 版・候補間の差を比較（presentation audio grid regression projection v003） | 基礎映像・frame/sample対応 | 74c2a04d 音声格子の修正前後10件を同一ツールチェーンで再比較可能にする |
| `evals/clip_composition/compare_prompt_results.ts` | 569 | 版・候補間の差を比較（prompt results） | 横断支援・旧評価 | 4b705b76 Add clip composition v010 Gemini evaluation |
| `evals/clip_composition/compare_theme_input_selection_efficiency.mjs` | 221 | 版・候補間の差を比較（theme input selection efficiency） | 横断支援・旧評価 | 84fc6e17 eval: 全文入力のテーマ生成上限測定を記録 |
| `evals/clip_composition/compare_theme_input_selection_experiments.mjs` | 244 | 版・候補間の差を比較（theme input selection experiments） | 横断支援・旧評価 | b4b162ee B素材のチャット流速v004を完走して正式採点 |
| `evals/clip_composition/diagnose_confirmed_inheritance.ts` | 397 | 失敗原因・上界を診断（confirmed inheritance） | 横断支援・旧評価 | 5107022a Diagnose confirmed segment inheritance miss |
| `evals/clip_composition/diagnose_cutpoint_rank_limits.ts` | 673 | 失敗原因・上界を診断（cutpoint rank limits） | 横断支援・旧評価 | def5e11d Diagnose cutpoint rank limits for multicut alignment |
| `evals/clip_composition/diagnose_physical_alignment.ts` | 862 | 失敗原因・上界を診断（physical alignment） | 横断支援・旧評価 | ee870f12 Diagnose physical alignment around seg14 |
| `evals/clip_composition/formalize_presentation_first_real_data_assembly_decision_v001.test.mjs` | 170 | 人間認定を正式決定へ変換（presentation first real data assembly decision v001.test） | 初回実データ組立決定 | 5ed5d03d feat(evals): candidate 13の正式組立決定を固定 |
| `evals/clip_composition/inspect_boundary_signal_policy.ts` | 389 | 入力・出力の適合性を点検（boundary signal policy） | 境界診断・boundary-v001 | 0e6a406d Add boundary signal policy inspection |
| `evals/clip_composition/inspect_boundary_signal_result_fit.ts` | 401 | 入力・出力の適合性を点検（boundary signal result fit） | 境界診断・boundary-v001 | ab8f8072 Add boundary signal fit inspection |
| `evals/clip_composition/inspect_boundary_stt_readiness.ts` | 335 | 入力・出力の適合性を点検（boundary stt readiness） | 境界診断・boundary-v001 | 34f901d7 Add boundary STT readiness check |
| `evals/clip_composition/inspect_chat_replay_integrity.mjs` | 168 | 入力・出力の適合性を点検（chat replay integrity） | 横断支援・旧評価 | 17500297 v004汎化素材の取得を検証しSTT待ちを記録 |
| `evals/clip_composition/inspect_fixture_expansion_readiness.ts` | 629 | 入力・出力の適合性を点検（fixture expansion readiness） | 横断支援・旧評価 | 98e5ad97 Add fixture expansion readiness report |
| `evals/clip_composition/inspect_generation_systems.mjs` | 204 | 入力・出力の適合性を点検（generation systems） | 横断支援・旧評価 | 05aa7580 Record clip composition eval baselines and decisions |
| `evals/clip_composition/inspect_multicut_freeze_preview.ts` | 482 | 入力・出力の適合性を点検（multicut freeze preview） | 素材block・fixture | cd90370a Record multicut freeze write guard |
| `evals/clip_composition/inspect_multicut_human_decision.ts` | 384 | 入力・出力の適合性を点検（multicut human decision） | 素材block・fixture | 4dd9d3cb Add multicut human decision inspection |
| `evals/clip_composition/inspect_presentation_preset_layout.ts` | 133 | 入力・出力の適合性を点検（presentation preset layout） | 横断支援・旧評価 | 9290a1d7 feat(evals): 初期プリセット候補と実描画認定previewを実装 |
| `evals/clip_composition/inspect_presentation_render_layout_v001.ts` | 122 | 入力・出力の適合性を点検（presentation render layout v001） | 横断支援・旧評価 | 512a4964 演出レンダラーの合成実装と100件検査を追加 |
| `evals/clip_composition/inspect_prompt_audio_boundary.ts` | 548 | 入力・出力の適合性を点検（prompt audio boundary） | 境界診断・boundary-v001 | 866a69e9 Add Web Gemini v009 prompt comparison |
| `evals/clip_composition/inspect_prompt_payload_leakage.ts` | 511 | 入力・出力の適合性を点検（prompt payload leakage） | 横断支援・旧評価 | 9023ebd7 Add prompt input leakage inspection |
| `evals/clip_composition/inspect_theme_generation_payload_leakage.ts` | 203 | 入力・出力の適合性を点検（theme generation payload leakage） | テーマ生成v002系 | 9cd737ed evals: record theme generation v001 failure analysis |
| `evals/clip_composition/layer1_internal_trim_v002.test.mjs` | 86 | layer1 internal trim v002.testの固定検査 | 層1・声VAD | aae507e6 層1v002の音響併用カット評価を実装 |
| `evals/clip_composition/layer1_internal_trim.test.mjs` | 90 | layer1 internal trim.testの固定検査 | 層1・声VAD | 97c75434 層1の比較結果を記録して正式凍結する |
| `evals/clip_composition/observe_presentation_first_real_data_edge_playback_v001.test.mjs` | 60 | observe presentation first real data edge playback v001.testの固定検査 | 横断支援・旧評価 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/package_presentation_first_real_data_rendered_comparison_v002.test.mjs` | 55 | 確認媒体・成果物を梱包（presentation first real data rendered comparison v002.test） | 横断支援・旧評価 | 45ea9246 feat(evals): 比較箇所を2秒前から直接再生 |
| `evals/clip_composition/prepare_presentation_first_real_data_gate_v001.test.mjs` | 162 | 実走・人間確認の入力を準備（presentation first real data gate v001.test） | 初回実データ組立決定 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/presentation_audio_grid_reconstruction_v001.test.mjs` | 291 | presentation audio grid reconstruction v001.testの固定検査 | 基礎映像・frame/sample対応 | e779fec6 音声の内部空白を絶対時刻へ配置し163件で回帰検証 |
| `evals/clip_composition/presentation_base_media_build_v001.test.mjs` | 1,079 | presentation base media build v001.testの固定検査 | 基礎映像・frame/sample対応 | 3c2e0377 正式再生成の実行バイナリ診断と新規jobを固定 |
| `evals/clip_composition/presentation_base_media_renderer_v002.integration.test.mjs` | 488 | presentation base media renderer v002.integration.testの固定検査 | 基礎映像・frame/sample対応 | 74c2a04d 音声格子の修正前後10件を同一ツールチェーンで再比較可能にする |
| `evals/clip_composition/presentation_base_media_timeline_v002.test.mjs` | 809 | presentation base media timeline v002.testの固定検査 | 基礎映像・frame/sample対応 | 3c2e0377 正式再生成の実行バイナリ診断と新規jobを固定 |
| `evals/clip_composition/presentation_caption_contract_v002.regression.mjs` | 224 | presentation caption contract v002.regressionの固定検査 | G1〜G3・話者契約 | e80740ca feat(evals): 話者クラスタと人物情報を分離する契約v002を実装 |
| `evals/clip_composition/presentation_caption_contract.test.mjs` | 224 | presentation caption contract.testの固定検査 | G1〜G3・話者契約 | 9265afe3 feat(evals): G1〜G3テロップ契約検査を実装 |
| `evals/clip_composition/presentation_first_real_data_gate_v001.test.mjs` | 875 | presentation first real data gate v001.testの固定検査 | 初回実データ組立決定 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/presentation_first_real_data_rendered_comparison_human_response_v001.test.mjs` | 107 | presentation first real data rendered comparison human response v001.testの固定検査 | 横断支援・旧評価 | fb56967b docs(evals): candidate 13の比較回答と語尾欠け診断を保存 |
| `evals/clip_composition/presentation_first_real_data_rendered_comparison_trust_v002.test.mjs` | 244 | presentation first real data rendered comparison trust v002.testの固定検査 | 横断支援・旧評価 | 45ea9246 feat(evals): 比較箇所を2秒前から直接再生 |
| `evals/clip_composition/presentation_first_real_data_rendered_comparison_ui_v001.test.mjs` | 102 | presentation first real data rendered comparison ui v001.testの固定検査 | 横断支援・旧評価 | d45512fc feat(evals): candidate 13を実カット動画で低負荷比較 |
| `evals/clip_composition/presentation_first_real_data_rendered_comparison_ui_v002.test.mjs` | 128 | presentation first real data rendered comparison ui v002.testの固定検査 | 横断支援・旧評価 | 45ea9246 feat(evals): 比較箇所を2秒前から直接再生 |
| `evals/clip_composition/presentation_first_real_data_rendered_comparison_v001.test.mjs` | 65 | presentation first real data rendered comparison v001.testの固定検査 | 横断支援・旧評価 | d45512fc feat(evals): candidate 13を実カット動画で低負荷比較 |
| `evals/clip_composition/presentation_first_real_data_review_ui_v001.test.mjs` | 804 | presentation first real data review ui v001.testの固定検査 | 横断支援・旧評価 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/presentation_gt03_classification_sync.test.mjs` | 68 | presentation gt03 classification sync.testの固定検査 | 横断支援・旧評価 | e3ccdef7 docs(evals): GT-03を現行G7対象外へ同期 |
| `evals/clip_composition/presentation_initial_preset_finalization.test.mjs` | 114 | presentation initial preset finalization.testの固定検査 | 横断支援・旧評価 | 18fed834 feat(evals): 初期プリセット台帳と信頼bindingを正式化 |
| `evals/clip_composition/presentation_initial_preset_review.test.mjs` | 254 | presentation initial preset review.testの固定検査 | 横断支援・旧評価 | a1090a80 fix(evals): 歌唱音声でプリセット認定previewを再作成 |
| `evals/clip_composition/presentation_instruction_contract_v002.regression.mjs` | 1,184 | presentation instruction contract v002.regressionの固定検査 | G1〜G3・話者契約 | e80740ca feat(evals): 話者クラスタと人物情報を分離する契約v002を実装 |
| `evals/clip_composition/presentation_instruction_contract.test.mjs` | 1,165 | presentation instruction contract.testの固定検査 | G1〜G3・話者契約 | 81c211ee 演出指示書の外枠検査を実装し109違反を固定 |
| `evals/clip_composition/presentation_renderer_v001.test.mjs` | 1,180 | presentation renderer v001.testの固定検査 | レンダラー・描画後QC | 512a4964 演出レンダラーの合成実装と100件検査を追加 |
| `evals/clip_composition/presentation_renderer_v002.test.mjs` | 1,729 | presentation renderer v002.testの固定検査 | レンダラー・描画後QC | 3c2e0377 正式再生成の実行バイナリ診断と新規jobを固定 |
| `evals/clip_composition/presentation_retained_source_atoms_v001.test.mjs` | 2,125 | presentation retained source atoms v001.testの固定検査 | 残存354文字 | 55df477f candidate 13の残存発話を安全に抽出する正式実装を追加 |
| `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.test.mjs` | 2,315 | presentation segmenter boundary evidence v001.testの固定検査 | Gate A・205境界候補 | 051613f2 ゲートAの境界証拠生成と読み取り専用検査を実装 |
| `evals/clip_composition/presentation_source_media_equivalence_v001.test.mjs` | 319 | presentation source media equivalence v001.testの固定検査 | 基礎映像・frame/sample対応 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/presentation_source_speaker_contract_v002.test.mjs` | 329 | presentation source speaker contract v002.testの固定検査 | G1〜G3・話者契約 | e80740ca feat(evals): 話者クラスタと人物情報を分離する契約v002を実装 |
| `evals/clip_composition/rescore_confirmed_pair.mjs` | 317 | rescore confirmed pair処理 | 横断支援・旧評価 | 05aa7580 Record clip composition eval baselines and decisions |
| `evals/clip_composition/run_eval.ts` | 854 | 固定jobを実行（eval） | 横断支援・旧評価 | 0aa07c26 Add clip composition prompt v012 evaluation |
| `evals/clip_composition/scan_audio_candidates.ts` | 496 | 媒体・候補を走査（audio candidates） | 横断支援・旧評価 | 313e134d Add rough audio scan for second clip candidate |
| `evals/clip_composition/score_boundary_v001.mjs` | 351 | 保存済み結果を採点（boundary v001） | 境界診断・boundary-v001 | e7e5a70f Complete boundary-v001 word-level refinement evaluation |
| `evals/clip_composition/score_candidate_ranking_title_reason_run1.mjs` | 173 | 保存済み結果を採点（candidate ranking title reason run1） | candidate-ranking-v001/v002 | e20cb867 Run title-and-reason candidate ranking baseline |
| `evals/clip_composition/score_candidate_ranking_v002_run1.mjs` | 168 | 保存済み結果を採点（candidate ranking v002 run1） | candidate-ranking-v001/v002 | 5a5b9055 Run candidate ranking v002 and prepare one-item review |
| `evals/clip_composition/score_prompt_output.ts` | 1,061 | 保存済み結果を採点（prompt output） | 横断支援・旧評価 | 453a51a2 evals: 引き継ぎ文書とB素材テーマ評価を確定 |
| `evals/clip_composition/score_theme_composition_connection_main.mjs` | 86 | 保存済み結果を採点（theme composition connection main） | connection-v001/v002・llm-v012/v013 | 16e2815a eval: themeから区間選択への接続本走75runを完了 |
| `evals/clip_composition/score_theme_composition_connection_v002.mjs` | 97 | 保存済み結果を採点（theme composition connection v002） | connection-v001/v002・llm-v012/v013 | 23e99e99 eval: connection-v002中心照準契約を75runで検証 |
| `evals/clip_composition/score_theme_composition_connection.ts` | 477 | 保存済み結果を採点（theme composition connection） | connection-v001/v002・llm-v012/v013 | 9c47b7e6 eval: 接続本走の前兆と75run条件を事前登録 |
| `evals/clip_composition/score_theme_generation_formal.ts` | 416 | 保存済み結果を採点（theme generation formal） | テーマ生成v002系 | 5bde1d1b eval: v004別素材の汎化検証を完了 |
| `evals/clip_composition/score_theme_generation_output.ts` | 751 | 保存済み結果を採点（theme generation output） | テーマ生成v002系 | 453a51a2 evals: 引き継ぎ文書とB素材テーマ評価を確定 |
| `evals/clip_composition/score_third_material_candidate_ranking_v002.mjs` | 168 | 保存済み結果を採点（third material candidate ranking v002） | candidate-ranking-v001/v002 | 65a6b680 Freeze third material and run fixed evaluation pipeline |
| `evals/clip_composition/serve_presentation_first_real_data_gate_v001.test.mjs` | 158 | 人間確認ページを配信（presentation first real data gate v001.test） | 初回実データ組立決定 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/serve_presentation_first_real_data_rendered_comparison_v001.test.mjs` | 349 | 人間確認ページを配信（presentation first real data rendered comparison v001.test） | 横断支援・旧評価 | d45512fc feat(evals): candidate 13を実カット動画で低負荷比較 |
| `evals/clip_composition/serve_presentation_first_real_data_rendered_comparison_v002.test.mjs` | 117 | 人間確認ページを配信（presentation first real data rendered comparison v002.test） | 横断支援・旧評価 | 45ea9246 feat(evals): 比較箇所を2秒前から直接再生 |
| `evals/clip_composition/summarize_audio_evidence.ts` | 572 | 証拠を集約（audio evidence） | 横断支援・旧評価 | ece04a48 Add reusable audio evidence summaries |
| `evals/clip_composition/test_layer1_acoustic_upper_bound.py` | 47 | test layer1 acoustic upper bound処理 | 層1・声VAD | 3e066114 層1v002の音響上界を測定し実装前設計を固定 |
| `evals/clip_composition/test_presentation_caption_display_pair_v003.mjs` | 1,499 | test presentation caption display pair v003処理 | B4・表示計画 | 19da1f6b B4時間対応の拒否理由を透過し後続不合格で停止 |
| `evals/clip_composition/test_presentation_caption_layout_inspection_json_v001.mjs` | 235 | test presentation caption layout inspection json v001処理 | 横断支援・旧評価 | 9f95e3fa B4数値token比較baselineの型不一致を記録して停止 |
| `evals/clip_composition/test_presentation_caption_semantic_output_v001.mjs` | 3,390 | test presentation caption semantic output v001処理 | 意味回答受入 | 88506d69 B2実process検査を実体パスで起動 |
| `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs` | 6,257 | test presentation caption semantic source package v001処理 | B1〜B3・正式package | ca74da85 別process意味回答検査を一時workspaceへ隔離する |
| `evals/clip_composition/validate_first_gate_unseen_candidate_ranking_v002.mjs` | 131 | 契約適合を検証（first gate unseen candidate ranking v002） | candidate-ranking-v001/v002 | 2fd8e529 Add fixed unseen-source ranking path for first-gate trial |
| `evals/clip_composition/validate_presentation_caption_contract_v002.mjs` | 31 | 契約適合を検証（presentation caption contract v002） | G1〜G3・話者契約 | e80740ca feat(evals): 話者クラスタと人物情報を分離する契約v002を実装 |
| `evals/clip_composition/validate_presentation_caption_contract.mjs` | 31 | 契約適合を検証（presentation caption contract） | G1〜G3・話者契約 | 9265afe3 feat(evals): G1〜G3テロップ契約検査を実装 |
| `evals/clip_composition/validate_presentation_instruction_contract_v002.mjs` | 38 | 契約適合を検証（presentation instruction contract v002） | G1〜G3・話者契約 | e80740ca feat(evals): 話者クラスタと人物情報を分離する契約v002を実装 |
| `evals/clip_composition/validate_presentation_instruction_contract.mjs` | 38 | 契約適合を検証（presentation instruction contract） | G1〜G3・話者契約 | 81c211ee 演出指示書の外枠検査を実装し109違反を固定 |

### 6.3 支援系（確認ページ・記録）

| path | 行 | 役割 | 対応契約・検査群 | 最終変更（commit / ゲート） |
|---|---:|---|---|---|
| `docs/claude/ui-redesign-preview.html` | 214 | ui-redesign-preview処理 | 横断支援・旧評価 | 39c0bd8b サイバーパンクHUDの画面設計を反映 |
| `evals/clip_composition/build_boundary_motion_package.mjs` | 283 | 確認・入力パッケージを構築（boundary motion package） | 境界診断・boundary-v001 | 05aa7580 Record clip composition eval baselines and decisions |
| `evals/clip_composition/build_boundary_signal_payload.ts` | 478 | 確認・入力パッケージを構築（boundary signal payload） | 境界診断・boundary-v001 | 1eaa26b1 Add boundary signal payload generation |
| `evals/clip_composition/build_boundary_v001_inputs.mjs` | 255 | 確認・入力パッケージを構築（boundary v001 inputs） | 境界診断・boundary-v001 | b23d40ad Pre-register boundary-v001 word-level refinement run |
| `evals/clip_composition/build_boundary_verification_package.mjs` | 327 | 確認・入力パッケージを構築（boundary verification package） | 境界診断・boundary-v001 | 05aa7580 Record clip composition eval baselines and decisions |
| `evals/clip_composition/build_callback_detection_v001_inputs.mjs` | 575 | 確認・入力パッケージを構築（callback detection v001 inputs） | callback-detection-v001 | 6d47d0e4 Implement callback cause detection and prepare review |
| `evals/clip_composition/build_callback_detection_v001_review.mjs` | 248 | 確認・入力パッケージを構築（callback detection v001 review） | callback-detection-v001 | 6d47d0e4 Implement callback cause detection and prepare review |
| `evals/clip_composition/build_candidate_ranking_causal_context_review.mjs` | 182 | 確認・入力パッケージを構築（candidate ranking causal context review） | candidate-ranking-v001/v002 | 2bcde798 候補の因果文脈監査と手直し試験v002案を追加 |
| `evals/clip_composition/build_candidate_ranking_generation_order_review.mjs` | 180 | 確認・入力パッケージを構築（candidate ranking generation order review） | candidate-ranking-v001/v002 | 2ce04453 Prepare generation-order review and candidate ranking v002 |
| `evals/clip_composition/build_candidate_ranking_unlabeled_review.mjs` | 377 | 確認・入力パッケージを構築（candidate ranking unlabeled review） | candidate-ranking-v001/v002 | 8298e97d Prepare the eight-candidate human value review |
| `evals/clip_composition/build_candidate_ranking_v002_review.mjs` | 247 | 確認・入力パッケージを構築（candidate ranking v002 review） | candidate-ranking-v001/v002 | 5a5b9055 Run candidate ranking v002 and prepare one-item review |
| `evals/clip_composition/build_chat_velocity_input_selection.mjs` | 144 | 確認・入力パッケージを構築（chat velocity input selection） | 横断支援・旧評価 | 771c1b08 eval: チャット流速上位100のv004実走状態を記録 |
| `evals/clip_composition/build_layer1_pair_review.mjs` | 122 | 確認・入力パッケージを構築（layer1 pair review） | 層1・声VAD | 97c75434 層1の比較結果を記録して正式凍結する |
| `evals/clip_composition/build_layer1_v003_pair_review.mjs` | 160 | 確認・入力パッケージを構築（layer1 v003 pair review） | 層1・声VAD | 97c75434 層1の比較結果を記録して正式凍結する |
| `evals/clip_composition/build_material_block_audio_review_package.mjs` | 435 | 確認・入力パッケージを構築（material block audio review package） | 素材block・fixture | 55195495 Record audio-separated confirmation for third fixture candidate |
| `evals/clip_composition/build_material_block_review_package.mjs` | 310 | 確認・入力パッケージを構築（material block review package） | 素材block・fixture | 6267530a Add third clip fixture manufacturing package |
| `evals/clip_composition/build_multiblock_decision_review_html.mjs` | 663 | 確認・入力パッケージを構築（multiblock decision review html） | 素材block・fixture | 4078c183 ui: 人間確認の回答操作を短縮 |
| `evals/clip_composition/build_multiblock_human_decision.mjs` | 159 | 確認・入力パッケージを構築（multiblock human decision） | 素材block・fixture | 9bb66fba evals: B素材の人間確認結果を凍結前検証 |
| `evals/clip_composition/build_presentation_g4_g7_input_readiness_review.mjs` | 348 | 確認・入力パッケージを構築（presentation g4 g7 input readiness review） | 横断支援・旧評価 | bf317427 evals: prepare dual-unit G4-G7 source review package |
| `evals/clip_composition/build_presentation_g4_ground_truth_v002_fire_point_session01.mjs` | 161 | 確認・入力パッケージを構築（presentation g4 ground truth v002 fire point session01） | 横断支援・旧評価 | 17522157 G4第1段結果を記録し4件の発火点対応確認を追加 |
| `evals/clip_composition/build_presentation_g4_ground_truth_v002_session01.mjs` | 286 | 確認・入力パッケージを構築（presentation g4 ground truth v002 session01） | 横断支援・旧評価 | 6691b1de 演出G4正解候補の可用性確認と5件レビュー画面を追加 |
| `evals/clip_composition/build_presentation_initial_preset_review.mjs` | 1,026 | 確認・入力パッケージを構築（presentation initial preset review） | 横断支援・旧評価 | a1090a80 fix(evals): 歌唱音声でプリセット認定previewを再作成 |
| `evals/clip_composition/build_presentation_minimum_sufficiency_review.mjs` | 572 | 確認・入力パッケージを構築（presentation minimum sufficiency review） | 横断支援・旧評価 | aeecc82a 最小演出比較のN2裁定契約と選定由来を固定 |
| `evals/clip_composition/build_presentation_resolution_package_v002.mjs` | 196 | 確認・入力パッケージを構築（presentation resolution package v002） | 横断支援・旧評価 | e80740ca feat(evals): 話者クラスタと人物情報を分離する契約v002を実装 |
| `evals/clip_composition/build_prompt_payload_with_boundary_signals.ts` | 424 | 確認・入力パッケージを構築（prompt payload with boundary signals） | 境界診断・boundary-v001 | 227778fd Add v009 boundary signal prompt input |
| `evals/clip_composition/build_prompt_payload.ts` | 405 | 確認・入力パッケージを構築（prompt payload） | 横断支援・旧評価 | 0aa07c26 Add clip composition prompt v012 evaluation |
| `evals/clip_composition/build_sessionized_material_boundary_review.mjs` | 337 | 確認・入力パッケージを構築（sessionized material boundary review） | 境界診断・boundary-v001 | 3012f5b1 Unify remaining material review and fit videos to viewport |
| `evals/clip_composition/build_theme_composition_connection_inputs.ts` | 414 | 確認・入力パッケージを構築（theme composition connection inputs） | connection-v001/v002・llm-v012/v013 | 74d0a18c eval: 接続評価の成功基準と文脈パイロットを事前登録 |
| `evals/clip_composition/build_theme_composition_connection_main_inputs.mjs` | 178 | 確認・入力パッケージを構築（theme composition connection main inputs） | connection-v001/v002・llm-v012/v013 | 9c47b7e6 eval: 接続本走の前兆と75run条件を事前登録 |
| `evals/clip_composition/build_theme_composition_connection_v002_inputs.mjs` | 74 | 確認・入力パッケージを構築（theme composition connection v002 inputs） | connection-v001/v002・llm-v012/v013 | bcfeec05 eval: connection-v002の中心照準契約を事前登録 |
| `evals/clip_composition/build_theme_generation_payload.ts` | 432 | 確認・入力パッケージを構築（theme generation payload） | テーマ生成v002系 | 9cd737ed evals: record theme generation v001 failure analysis |
| `evals/clip_composition/build_theme_generation_windows.ts` | 353 | 確認・入力パッケージを構築（theme generation windows） | テーマ生成v002系 | 9cd737ed evals: record theme generation v001 failure analysis |
| `evals/clip_composition/build_theme_redo_source_only_payload.mjs` | 884 | 確認・入力パッケージを構築（theme redo source only payload） | 横断支援・旧評価 | 09a16df9 正式初見素材の上位5候補を固定し第一関門15分試験UIを追加 |
| `evals/clip_composition/cleanup_web_gemini_tabs.mjs` | 480 | cleanup web gemini tabs処理 | Web Gemini支援 | 5bde1d1b eval: v004別素材の汎化検証を完了 |
| `evals/clip_composition/continue_theme_redo_after_stt.mjs` | 306 | continue theme redo after stt処理 | STT・発話対応 | 25667159 evals: prepare resumable theme redo STT |
| `evals/clip_composition/finalize_candidate_ranking_v002.mjs` | 120 | 人間回答を正式記録へ確定（candidate ranking v002） | candidate-ranking-v001/v002 | b30be4a7 Finalize candidate ranking v002 human review |
| `evals/clip_composition/finalize_presentation_initial_preset_review.mjs` | 309 | 人間回答を正式記録へ確定（presentation initial preset review） | 横断支援・旧評価 | 18fed834 feat(evals): 初期プリセット台帳と信頼bindingを正式化 |
| `evals/clip_composition/freeze_clip_audio_fixture.ts` | 394 | 評価fixtureを凍結（clip audio fixture） | 横断支援・旧評価 | c0311fbd 音声アンカーfixture生成を再実行可能にする |
| `evals/clip_composition/freeze_context_fixture.ts` | 374 | 評価fixtureを凍結（context fixture） | 横断支援・旧評価 | b61cd8bf Reset clip composition expected interval to full clip |
| `evals/clip_composition/freeze_material_block_fixture.mjs` | 299 | 評価fixtureを凍結（material block fixture） | 素材block・fixture | f260ba2b Freeze third clip fixture and rescore prompt systems |
| `evals/clip_composition/freeze_multiblock_material_fixture.mjs` | 793 | 評価fixtureを凍結（multiblock material fixture） | 素材block・fixture | 65a6b680 Freeze third material and run fixed evaluation pipeline |
| `evals/clip_composition/freeze_multicut_review_fixture.ts` | 777 | 評価fixtureを凍結（multicut review fixture） | 素材block・fixture | eb20d019 Tighten multicut decision validation |
| `evals/clip_composition/freeze_partial_fixture_review.mjs` | 454 | 評価fixtureを凍結（partial fixture review） | 横断支援・旧評価 | 05aa7580 Record clip composition eval baselines and decisions |
| `evals/clip_composition/freeze_verified_fixture.ts` | 370 | 評価fixtureを凍結（verified fixture） | 横断支援・旧評価 | 5ba39bc0 音声確認済みfixtureとして評価状態を明確化 |
| `evals/clip_composition/observe_presentation_first_real_data_edge_playback_v001.mjs` | 247 | observe presentation first real data edge playback v001処理 | 横断支援・旧評価 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/package_presentation_first_real_data_rendered_comparison_v002.mjs` | 182 | 確認媒体・成果物を梱包（presentation first real data rendered comparison v002） | 横断支援・旧評価 | 45ea9246 feat(evals): 比較箇所を2秒前から直接再生 |
| `evals/clip_composition/plan_boundary_stt_jobs.ts` | 448 | 実行単位を事前計画（boundary stt jobs） | 境界診断・boundary-v001 | 34f901d7 Add boundary STT readiness check |
| `evals/clip_composition/plan_local_stt_resume.mjs` | 218 | 実行単位を事前計画（local stt resume） | STT・発話対応 | 25667159 evals: prepare resumable theme redo STT |
| `evals/clip_composition/plan_multicut_expected_candidate.ts` | 451 | 実行単位を事前計画（multicut expected candidate） | 素材block・fixture | 177a6598 Prepare multicut expected candidate checks |
| `evals/clip_composition/prepare_candidate_ranking_title_reason_run1.mjs` | 138 | 実走・人間確認の入力を準備（candidate ranking title reason run1） | candidate-ranking-v001/v002 | e20cb867 Run title-and-reason candidate ranking baseline |
| `evals/clip_composition/prepare_candidate_ranking_v002_run1.mjs` | 117 | 実走・人間確認の入力を準備（candidate ranking v002 run1） | candidate-ranking-v001/v002 | 5a5b9055 Run candidate ranking v002 and prepare one-item review |
| `evals/clip_composition/prepare_first_gate_unseen_candidate_ranking_v002.mjs` | 153 | 実走・人間確認の入力を準備（first gate unseen candidate ranking v002） | candidate-ranking-v001/v002 | 2fd8e529 Add fixed unseen-source ranking path for first-gate trial |
| `evals/clip_composition/prepare_first_gate_unseen_hand_trim_trial.mjs` | 130 | 実走・人間確認の入力を準備（first gate unseen hand trim trial） | 横断支援・旧評価 | abcb1da6 第一関門の15分を人間計時から作業量目安へ訂正 |
| `evals/clip_composition/prepare_first_gate_unseen_theme_inputs.mjs` | 143 | 実走・人間確認の入力を準備（first gate unseen theme inputs） | 横断支援・旧評価 | 09a16df9 正式初見素材の上位5候補を固定し第一関門15分試験UIを追加 |
| `evals/clip_composition/prepare_human_boundary_trim_trial_v002.mjs` | 252 | 実走・人間確認の入力を準備（human boundary trim trial v002） | 境界診断・boundary-v001 | 5b864b63 Redesign boundary review around utterance selection |
| `evals/clip_composition/prepare_human_boundary_trim_trial.mjs` | 517 | 実走・人間確認の入力を準備（human boundary trim trial） | 境界診断・boundary-v001 | d2c04997 Fix the gate time unit and pre-register candidate ranking |
| `evals/clip_composition/prepare_multicut_expected_review.ts` | 509 | 実走・人間確認の入力を準備（multicut expected review） | 素材block・fixture | 9ac59d8c Prepare multicut expected review packet |
| `evals/clip_composition/prepare_multicut_human_decision_template.ts` | 293 | 実走・人間確認の入力を準備（multicut human decision template） | 素材block・fixture | d4579193 Add multicut human decision template |
| `evals/clip_composition/prepare_partial_fixture_review.mjs` | 496 | 実走・人間確認の入力を準備（partial fixture review） | 横断支援・旧評価 | 05aa7580 Record clip composition eval baselines and decisions |
| `evals/clip_composition/prepare_presentation_first_real_data_gate_v001.mjs` | 601 | 実走・人間確認の入力を準備（presentation first real data gate v001） | 初回実データ組立決定 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/prepare_third_material_candidate_ranking_v002.mjs` | 174 | 実走・人間確認の入力を準備（third material candidate ranking v002） | candidate-ranking-v001/v002 | 65a6b680 Freeze third material and run fixed evaluation pipeline |
| `evals/clip_composition/prepare_third_material_hand_trim_trial.mjs` | 361 | 実走・人間確認の入力を準備（third material hand trim trial） | 横断支援・旧評価 | 65a6b680 Freeze third material and run fixed evaluation pipeline |
| `evals/clip_composition/presentation_first_real_data_review_ui_v001.mjs` | 459 | presentation first real data review ui v001処理 | 横断支援・旧評価 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/repair_gemini_output_from_raw.mjs` | 183 | 保存済み応答の形式を診断的に修復（gemini output from raw） | Web Gemini支援 | f260ba2b Freeze third clip fixture and rescore prompt systems |
| `evals/clip_composition/serve_first_gate_unseen_hand_trim_trial.mjs` | 22 | 人間確認ページを配信（first gate unseen hand trim trial） | 横断支援・旧評価 | abcb1da6 第一関門の15分を人間計時から作業量目安へ訂正 |
| `evals/clip_composition/serve_human_boundary_trim_trial_v002.mjs` | 145 | 人間確認ページを配信（human boundary trim trial v002） | 境界診断・boundary-v001 | 5b864b63 Redesign boundary review around utterance selection |
| `evals/clip_composition/serve_human_boundary_trim_trial.mjs` | 174 | 人間確認ページを配信（human boundary trim trial） | 境界診断・boundary-v001 | d2c04997 Fix the gate time unit and pre-register candidate ranking |
| `evals/clip_composition/serve_presentation_first_real_data_gate_v001.mjs` | 214 | 人間確認ページを配信（presentation first real data gate v001） | 初回実データ組立決定 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/serve_presentation_first_real_data_rendered_comparison_v001.mjs` | 398 | 人間確認ページを配信（presentation first real data rendered comparison v001） | 横断支援・旧評価 | d45512fc feat(evals): candidate 13を実カット動画で低負荷比較 |
| `evals/clip_composition/serve_presentation_first_real_data_rendered_comparison_v002.mjs` | 176 | 人間確認ページを配信（presentation first real data rendered comparison v002） | 横断支援・旧評価 | 45ea9246 feat(evals): 比較箇所を2秒前から直接再生 |
| `evals/clip_composition/serve_third_material_hand_trim_trial.mjs` | 179 | 人間確認ページを配信（third material hand trim trial） | 横断支援・旧評価 | 65a6b680 Freeze third material and run fixed evaluation pipeline |
| `scripts/agent-scenario-test.mjs` | 3,230 | agent-scenario-test処理 | 横断支援・旧評価 | 90f528a3 Geminiレビュー依頼のUI文言を人間向けに整理 |
| `scripts/ui-contract-test.mjs` | 106 | ui-contract-test処理 | 横断支援・旧評価 | 90f528a3 Geminiレビュー依頼のUI文言を人間向けに整理 |
| `scripts/web-gemini-review-edge.mjs` | 947 | web-gemini-review-edge処理 | Web Gemini支援 | aae9da15 Web GeminiレビューedgeスクリプトをすべてAPI経由へ切り替え |
| `scripts/web-gemini-review-script-test.mjs` | 322 | web-gemini-review-script-test処理 | Web Gemini支援 | 1894b8b0 Web Geminiレビュー状態をstate.jsonへ二重書きする |

### 6.4 休眠・実験記録系

| path | 行 | 役割 | 対応契約・検査群 | 最終変更（commit / ゲート） |
|---|---:|---|---|---|
| `evals/clip_composition/align_stt_chunks.ts` | 548 | align stt chunks処理 | STT・発話対応 | 308397b7 Share time-axis integrity across clip eval alignments |
| `evals/clip_composition/apply_visual_verification.ts` | 215 | apply visual verification処理 | 横断支援・旧評価 | d401b196 目視確認結果の反映手順を安全化 |
| `evals/clip_composition/convert_youtube_json3_to_stt.ts` | 186 | convert youtube json3 to stt処理 | STT・発話対応 | 69bb4035 Add YouTube subtitle alignment for second clip candidate |
| `evals/clip_composition/detect_layer1_voice_absence.py` | 57 | detect layer1 voice absence処理 | 層1・声VAD | aae507e6 層1v002の音響併用カット評価を実装 |
| `evals/clip_composition/global_dp_word_alignment.ts` | 1,385 | global dp word alignment処理 | STT・発話対応 | 6267530a Add third clip fixture manufacturing package |
| `evals/clip_composition/layer1_internal_trim_v002.mjs` | 176 | layer1 internal trim v002処理 | 層1・声VAD | aae507e6 層1v002の音響併用カット評価を実装 |
| `evals/clip_composition/layer1_internal_trim.mjs` | 294 | layer1 internal trim処理 | 層1・声VAD | 41435cf0 層1詰めv001を実装し入力上界の失敗を記録 |
| `evals/clip_composition/merge_dp_candidate_runs.mjs` | 147 | merge dp candidate runs処理 | 横断支援・旧評価 | 3680a7ed evals: B素材の凍結前確認パッケージを完成 |
| `evals/clip_composition/merge_split_stt_chunk_response.mjs` | 129 | merge split stt chunk response処理 | STT・発話対応 | b18bc571 再起動後も失敗するSTTチャンクを短分割で救済 |
| `evals/clip_composition/presentation_base_media_timeline_v001.mjs` | 282 | presentation base media timeline v001処理 | 基礎映像・frame/sample対応 | 512a4964 演出レンダラーの合成実装と100件検査を追加 |
| `evals/clip_composition/presentation_caption_contract.mjs` | 533 | presentation caption contract処理 | G1〜G3・話者契約 | 9265afe3 feat(evals): G1〜G3テロップ契約検査を実装 |
| `evals/clip_composition/presentation_first_real_data_gate_v001.mjs` | 1,382 | presentation first real data gate v001処理 | 初回実データ組立決定 | da0f71c0 feat(evals): 初回実データ接続の確認前ゲートを実証 |
| `evals/clip_composition/presentation_first_real_data_rendered_comparison_trust_v002.mjs` | 545 | presentation first real data rendered comparison trust v002処理 | 横断支援・旧評価 | 45ea9246 feat(evals): 比較箇所を2秒前から直接再生 |
| `evals/clip_composition/presentation_first_real_data_rendered_comparison_ui_v001.mjs` | 320 | presentation first real data rendered comparison ui v001処理 | 横断支援・旧評価 | d45512fc feat(evals): candidate 13を実カット動画で低負荷比較 |
| `evals/clip_composition/presentation_first_real_data_rendered_comparison_ui_v002.mjs` | 413 | presentation first real data rendered comparison ui v002処理 | 横断支援・旧評価 | 45ea9246 feat(evals): 比較箇所を2秒前から直接再生 |
| `evals/clip_composition/presentation_first_real_data_rendered_comparison_v001.mjs` | 447 | presentation first real data rendered comparison v001処理 | 横断支援・旧評価 | d45512fc feat(evals): candidate 13を実カット動画で低負荷比較 |
| `evals/clip_composition/presentation_instruction_contract.mjs` | 1,396 | presentation instruction contract処理 | G1〜G3・話者契約 | 81c211ee 演出指示書の外枠検査を実装し109違反を固定 |
| `evals/clip_composition/presentation_renderer_plan_v001.mjs` | 610 | presentation renderer plan v001処理 | レンダラー・描画後QC | 512a4964 演出レンダラーの合成実装と100件検査を追加 |
| `evals/clip_composition/presentation_renderer_qc_v001.mjs` | 483 | presentation renderer qc v001処理 | レンダラー・描画後QC | 512a4964 演出レンダラーの合成実装と100件検査を追加 |
| `evals/clip_composition/realign_multicut_cutpoints.ts` | 1,086 | realign multicut cutpoints処理 | 素材block・fixture | 05aa7580 Record clip composition eval baselines and decisions |
| `evals/clip_composition/reconstruct_material_blocks.mjs` | 910 | reconstruct material blocks処理 | 素材block・fixture | 6267530a Add third clip fixture manufacturing package |
| `evals/clip_composition/render_multicut_visual_checks.ts` | 371 | 動画・確認媒体を描画（multicut visual checks） | 素材block・fixture | 177a6598 Prepare multicut expected candidate checks |
| `evals/clip_composition/render_presentation_v001.mjs` | 1,172 | 動画・確認媒体を描画（presentation v001） | レンダラー・描画後QC | 512a4964 演出レンダラーの合成実装と100件検査を追加 |
| `evals/clip_composition/resume_local_stt_with_split_fallback.mjs` | 184 | resume local stt with split fallback処理 | STT・発話対応 | e44ef2c7 Automate repeated source STT chunk fallback |
| `evals/clip_composition/run_boundary_v001.mjs` | 143 | 固定jobを実行（boundary v001） | 境界診断・boundary-v001 | 9c219bd3 Record incomplete boundary runs and continue |
| `evals/clip_composition/run_callback_detection_v001_web_gemini.mjs` | 725 | 固定jobを実行（callback detection v001 web gemini） | callback-detection-v001 | 6d47d0e4 Implement callback cause detection and prepare review |
| `evals/clip_composition/run_candidate_ranking_title_reason_run1.mjs` | 61 | 固定jobを実行（candidate ranking title reason run1） | candidate-ranking-v001/v002 | e20cb867 Run title-and-reason candidate ranking baseline |
| `evals/clip_composition/run_candidate_ranking_v002_run1.mjs` | 56 | 固定jobを実行（candidate ranking v002 run1） | candidate-ranking-v001/v002 | 5a5b9055 Run candidate ranking v002 and prepare one-item review |
| `evals/clip_composition/run_first_gate_unseen_candidate_ranking_v002.mjs` | 62 | 固定jobを実行（first gate unseen candidate ranking v002） | candidate-ranking-v001/v002 | 2fd8e529 Add fixed unseen-source ranking path for first-gate trial |
| `evals/clip_composition/run_layer1_internal_trim_eval.mjs` | 327 | 固定jobを実行（layer1 internal trim eval） | 層1・声VAD | 41435cf0 層1詰めv001を実装し入力上界の失敗を記録 |
| `evals/clip_composition/run_layer1_internal_trim_v002_eval.mjs` | 310 | 固定jobを実行（layer1 internal trim v002 eval） | 層1・声VAD | aae507e6 層1v002の音響併用カット評価を実装 |
| `evals/clip_composition/run_local_stt_chunked.ts` | 621 | 固定jobを実行（local stt chunked） | STT・発話対応 | b18bc571 再起動後も失敗するSTTチャンクを短分割で救済 |
| `evals/clip_composition/run_local_stt_selected_chunks.mjs` | 358 | 固定jobを実行（local stt selected chunks） | STT・発話対応 | 25667159 evals: prepare resumable theme redo STT |
| `evals/clip_composition/run_local_stt.ts` | 480 | 固定jobを実行（local stt） | STT・発話対応 | d3292e8c 音声比較で切り抜き評価fixtureを追加 |
| `evals/clip_composition/run_theme_composition_connection_main.mjs` | 47 | 固定jobを実行（theme composition connection main） | connection-v001/v002・llm-v012/v013 | 9c47b7e6 eval: 接続本走の前兆と75run条件を事前登録 |
| `evals/clip_composition/run_theme_composition_connection_pilot.mjs` | 138 | 固定jobを実行（theme composition connection pilot） | connection-v001/v002・llm-v012/v013 | 4e076896 fix: 接続パイロットをrunnerのtsxで実行 |
| `evals/clip_composition/run_theme_composition_connection_v002.mjs` | 32 | 固定jobを実行（theme composition connection v002） | connection-v001/v002・llm-v012/v013 | bcfeec05 eval: connection-v002の中心照準契約を事前登録 |
| `evals/clip_composition/run_theme_generation_web_gemini.mjs` | 118 | 固定jobを実行（theme generation web gemini） | テーマ生成v002系 | 9cd737ed evals: record theme generation v001 failure analysis |
| `evals/clip_composition/run_theme_generation_windowed_web_gemini.mjs` | 504 | 固定jobを実行（theme generation windowed web gemini） | テーマ生成v002系 | 09a16df9 正式初見素材の上位5候補を固定し第一関門15分試験UIを追加 |
| `evals/clip_composition/run_web_gemini_prompt.ts` | 1,398 | 固定jobを実行（web gemini prompt） | Web Gemini支援 | 6d47d0e4 Implement callback cause detection and prepare review |
| `evals/clip_composition/time_axis_integrity.ts` | 188 | time axis integrity処理 | 横断支援・旧評価 | 308397b7 Share time-axis integrity across clip eval alignments |

