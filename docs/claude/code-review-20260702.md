# zev2 ソースレビュー — 対応状況と残タスク

作成者: Claude (Fable 5) / 作成日: 2026-07-02(同日、低リスク分を反映して再整理)
対象: main ブランチ backend / client / runner / shared

評価軸はユーザー方針: **①疎結合で影響範囲を小さく ②共通関数・共通定義でソースを減らす**。
低リスクと合意した項目は 2026-07-02 に反映済み。残タスクは品質効果順に並べてある。

---

## 対応済み(2026-07-02 反映)

すべて `pnpm run type-check` と `pnpm test`(UI契約 + Web Geminiスクリプト + シナリオ)通過を確認済み。

### 品質リスクの解消

| 項目 | 内容 | コミット |
|---|---|---|
| 状態更新の直列化 | state.json の read-modify-write をリクエスト単位で直列化(`runExclusiveStateOperation` + control router のミドルウェア)。runnerと人間操作の並走による更新消失を防止 | f7f012b |
| 破損state退避の可視化 | スキーマ不一致/JSON破損で退避するとき `console.error` で退避先を通知(従来は無言で空になっていた) | f7f012b |
| JSONエラーハンドラ | 未処理例外を `{ error }` のJSONで返すミドルウェアを追加。UIに「Request failed with status code 500」ではなく原因文言が届く | f7f012b |
| 環境固有の既定値除去 | `runtime-config.ts` の既定値から接続先IP・入力動画パスを除去。stt.mode=local で URL 未指定なら明示エラー。値の正本は `config/runtime.jsonc` のみ | f7f012b |

### 共通化・重複排除

| 項目 | 内容 | コミット |
|---|---|---|
| 型定義の一本化 | Web Geminiレビュー3型 + activity 3型を `@zev2/shared`(`web-gemini-review.ts` / `activity.ts`)へ移動。backend/client の手書き二重定義を削除 | 0fbd836 |
| 成果物パス解決の統合 | `backend/src/artifacts/artifact-path.ts` に集約(URL⇔パス変換 + パストラバーサル検査)。control.ts と artifact-upload.ts の重複を削除 | f7f012b |
| runtimeDir / workspaceRoot | `resolveRuntimeDir()` を新設し3箇所の重複を統合。backend内の `workspaceRoot` 二重実装も統合 | f7f012b |
| ラベル文言のRecord化 | control.ts の if連鎖ラベル関数8個を `Record<Status, string>` に変換。網羅性がコンパイラで保証される | f7f012b |
| Web Geminiファイル二重読みの排除 | `/activity` ルートで同じ3ファイルを2回読んでいた問題を `readWebGeminiReviewFiles()` に一本化 | f7f012b |
| 子プロセス実行の統合 | runner の spawn ラッパー3変種を `runProcess` 1実装に集約 | ff13854 |

正味の削減: backend -91行、runner -9行(重複定義の削除分)。

---

## 残タスク(品質効果順)

### R-1. Web Geminiレビュー成果物の state.json 統合 【✅ 完了(2026-07-02)】

4段階すべて実施済み。正本は `state.json` の `webGeminiReviews`、`artifacts/<draftId>/` 配下の
JSONファイルは人間確認用の書き出し(読み出しには使わない)。

1. ✅ **実行ログ更新APIの新設**(ff93dce) — `POST /request-drafts/:id/web-gemini-review/run-status`
   (prepared/running/blocked/failed)。あわせて Web Gemini のファイルI/O・整合チェックを
   `backend/src/web-gemini/` モジュールへ分離した。`saved` はレビュー保存API、`applied` は反映APIだけが作る。
2. ✅ **edge スクリプトの API 経由化**(aae9da1) — 実行ログ・レビュー本文・依頼文・state取得のすべてを
   backend API 経由に切り替え、ファイル直書きを廃止。保存APIに `savedFrom`(ui/edge/imported-text)を追加し、
   保存元ごとの文言と externalUploadRequired を backend で一元管理。スクリプトの shared dist 直接importも解消。
   スクリプトテストは backend 起動型に書き換え(検証内容は維持)。
3. ✅ **state構造の新設と二重書き**(1894b8b) — `Zev2State.webGeminiReviews` を新設し、
   prepare/保存/実行状態更新/反映の全書き込みでファイルと state の両方を更新。
   スクリプトテストに state とファイルの一致検証を追加。
4. ✅ **読み出しの state 切替と削除**(2b34fa9) — 取得・反映・activity の読み出しを state に一本化し、
   ファイル読み込み・parse・破損検出コードを削除(正味 -372行)。

**設計上の帰結:**
- ファイル破損(「保存内容が壊れています」409)という故障クラスは消滅。対応するテスト3ブロックも削除した
- 完成動画とのずれ検出(ensure* 3関数)は、同一draft内の再生成(theme_reselect経由)で今も起こり得るため
  維持。ただし読み出しI/Oなしで実行される
- activity-search の全draft×ファイルI/O問題(旧R-6)はゼロI/Oになり解消
- シナリオテストの外部スクリプト模擬は run-status API / state編集ベースになり、テストもファイルに触らない

### R-2. control.ts の分割 【✅ 完了(2026-07-03、ステップ0〜5)】

control.ts は **3,501行 → 984行**(残りはルート定義+cancel系+complete)。
各ステップとも純粋移動のみ・1コミット・毎回全テスト通過で実施した。

| 順 | 切り出し先 | 行数 | コミット |
|---|---|---|---|
| 0 | `domain/support.ts` + `domain/operation-log.ts` + `domain/state-selectors.ts` | 190 | 01075f4 |
| 1 | `activity/build.ts`(イベント・サマリ組み立て+ラベルRecord群) | 730 | ed279cb |
| 2 | `artifacts/validation.ts` + `domain/restart.ts`(編集コピー一式) | 781 | 8807ff4 |
| 3 | `domain/control-review.ts`(確認発行と人間操作)— restart への一方向依存(P1) | 462 | d56fa0d |
| 4 | `web-gemini/routes.ts` — 認証→直列化ミドルウェアの後ろにマウント(P2の条件遵守) | 515 | f8f6cb2 |
| 5 | `domain/agent-lifecycle.ts`(claim / fail / claim復旧。completeは含めない) | 100 | 913e191 |

**残り(意図的に未実施)**: complete ルートの分離。成果物検証・FileRef保存・確認発行の
3責務が絡むため、Codexレビュー P2 の指摘どおり分離方針を再評価してから扱う。
completeAgentRequest / cancelActiveAgentRequests / rejectOpenControlReviewsForCancel は
現状 control.ts に残置している。

### R-3. App.vue(3,734行)の分割

- composable 3つ(`useHumanAuth` / `useWebGeminiReview` / `useRequestActivity`)+
  コンポーネント4つ(`ReviewPanel` / `WebGeminiPanel` / `ActivityDialog` / `RequestForm`)へ。
- watcher のタイミングなど反応性の挙動が変わりうるため R-2 より一段リスクが高い。
  R-2 と同じステップ式(1 composable ずつ純粋移動→コミット→全テスト)で行う。
  この段階では ref の構造や watcher の発火条件を一切変えない。
- 順序は依存が浅い順: `useHumanAuth` → `useRequestActivity` → `useWebGeminiReview` →
  コンポーネント4つ。refreshタイマー2本の閉じ込めは挙動が変わりやすいため独立ステップにする。
- **注意**: `ui-contract-test.mjs` は App.vue ソースの文字列マッチで検証しているため、
  切り出しのたびに対象ファイルの追随修正が必要(= 各ステップのコミットに含める)。
  フロントに挙動テストがないので、着手前に主要フローの手動スモークチェックリストを書き出す。

### R-4. UI状態文言の backend 一本化

- App.vue の `statusText` / `statusDetailText` / `defaultReviewReason` は backend の
  `buildRequestDraftActivitySummary` / `defaultHumanReviewReason` とほぼ同じ判定・文言の再実装。
- **現状の事実(2026-07-04確認)**: UIは既に backend サマリを優先しており
  (`requestActivitySummary?.title || statusText`)、ローカル実装が使われるのは
  サマリ未取得時のフォールバックのみ。つまり R-4 の実体は「フォールバックの最小化」。
- **先にゴールデンテストを作る**: `statusText` 等は computed としてリアクティブ状態に
  結線されているため、まず判定ロジックを純粋関数に切り出し(App.vueへの最小の変更)、
  代表的な state パターンで backend 実装と出力を突き合わせて「ほぼ同じ」の差分を全部洗い出す。
  このテストは R-3 期間中の安全網としても機能する。差分確認後にフォールバックを削る。

### R-5. /state 応答のスリム化と監査ログ成長の抑制

- UIは `/state` 全量を2秒毎にポーリングし、`/agent-requests/next` はポーリングのたびに監査ログを追記する。
  state.json は単調に肥大化し、全API(全量read/write)を遅くする。
- **独立した2段に分けて実施する**:
  1. next返却ログの廃止 → `agent-scenario-test.mjs` の検証3箇所を同時修正
  2. `/state` から操作ログ・決定ログを外す → App.vue の `requestActivityRefreshKey` が
     `store.state.decisionLogs` 等を直接参照しているため要クライアント修正
- **順序は R-3 の後**: R-3 で activity 参照が `useRequestActivity` に隔離されれば、
  2. のクライアント修正は「巨大App.vueの中を探して直す」から「composable 1個を直す」に変わる。
  「連動する」の正体はこの依存関係であり、同時実施ではなく直列実施が正しい。

### R-6. /activity-search の全draft×ファイルI/O 【✅ R-1完了で解消(2b34fa9)】

### R-7. 人間セッションCookieの強化(外部公開前に必須)

- Cookie値が `sha256(固定文字列+トークン)` で無期限・ローテーションなし。`Secure` 属性もない。
  ローカル利用の間は許容。外部公開する前に「サーバー生成のランダムセッションID+期限」へ差し替える。

### R-8. 破損stateの部分復旧はやらない(方針メモ)

- 「不正レコードだけ落とす」案は参照切れ(dangling reference)を作るため不採用。
  現在の「退避してログを出し、空から再開」を維持し、スキーマ変更時はマイグレーションを書く。

### R-9. runner側の共通化の残り

- runner の `artifactPathByUrl` は配送モード(local/upload)で root が変わるため backend 版と同一ではなく、
  今回の統合対象から除外した。パッケージ横断で共通化するには shared に node専用エントリポイント
  (`@zev2/shared/node` などの exports 追加)が必要。client バンドルに `node:path` を混ぜないための制約。
- `agent-scenario-test.mjs`(3,265行)の分割は R-2 のドメイン分割に合わせて実施。

### R-10. ログ系の別ファイル化とポーリング抑制(R-5の発展形、新規)

- 監査ログ・決定ログを state.json に持ち続ける限り「単調肥大→全量read/writeが遅くなる」構造は
  R-5 後も残る。ログ系だけ追記専用の JSONL 別ファイルへ逃がせば state は常に小さく保てて根本解決。
  R-8(破損時は退避して空から再開)とも相性がよい — ログが別ファイルなら退避で失うものが減る。
- 2秒ポーリングには、state にバージョン番号か updatedAt を持たせて変化がなければ
  304/no-op で返す仕組みを足すと、スリム化と独立にコストが落ちる。
- いずれも R-5 とは独立の変更として扱う(束ねない)。

---

## 推奨着手順(2026-07-04 Codexレビューを受けて更新)

前版の「R-3 + R-4 + R-5 をまとめて」は撤回。1つの変更に束ねると壊れたときに
原因を切り分けられず、R-2 で守った規律(1分割=純粋移動=1コミット)と矛盾する。
「連動する」の正しい解釈は「同じ期間に、依存順で直列に」。

1. **R-4準備**: 文言ロジックの純粋関数化+backend実装とのゴールデンテスト(差分の全量洗い出し)
2. **R-3**: composable を1つずつステップ式で切り出し(useHumanAuth → useRequestActivity →
   useWebGeminiReview)。タイマー閉じ込めは独立ステップ。着手前に手動スモークチェックリスト作成
3. **R-4本体**: フォールバック文言の最小化(1のテストが安全網)
4. **R-5**: ①next返却ログ廃止 ②/state からログ除外、の2段直列(R-3後なら②は composable 1個の修正)
5. complete ルートの分離方針を再評価(R-2 の残り)
6. R-9 / R-10 / R-7(R-7 は外部公開の前提条件)

**工数の区切り(方針メモ)**: リファクタは切り抜き品質それ自体には効かない「配管」の改善。
R-3 の composable 切り出しまでで一旦止めてプロンプト品質・評価基盤へ戻る区切りを推奨。
コンポーネント4つの切り出しと R-5 以降はプロンプト側が回り始めてからで遅くない。
