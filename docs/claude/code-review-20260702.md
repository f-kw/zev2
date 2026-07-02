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

### R-2. control.ts(約3,500行)の分割 【次の最優先】

責務ごとのファイル分割。ルートは「入力検証 → domain関数 → レスポンス」だけにする。

| 切り出し先 | 中身 |
|---|---|
| `domain/agent-lifecycle.ts` | claim / complete / fail / claim復旧 |
| `domain/restart.ts` | 編集コピー一式(copyDraft / copyRequests / copyReviews) |
| `domain/control-review.ts` | 確認発行と人間操作(applyHumanReviewAction) |
| `web-gemini/routes.ts` | Web Gemini系5ルート(artifacts/run-status/state モジュールは分離済み) |
| `activity/build.ts` | イベント・サマリ組み立て |

### R-3. App.vue(3,734行)の分割

- composable 3つ(`useHumanAuth` / `useWebGeminiReview` / `useRequestActivity`)+
  コンポーネント4つ(`ReviewPanel` / `WebGeminiPanel` / `ActivityDialog` / `RequestForm`)へ。
  refreshタイマー2本も composable に閉じ込める。
- watcher のタイミングなど反応性の挙動が変わりうるため R-2 より一段リスクが高い。R-2 の後に。

### R-4. UI状態文言の backend 一本化

- App.vue の `statusText` / `statusDetailText` / `defaultReviewReason` は backend の
  `buildRequestDraftActivitySummary` / `defaultHumanReviewReason` とほぼ同じ判定・文言の再実装。
  文言の正本を backend に寄せ、UIはフォールバックのみ持つ。R-3 と同時に実施すると効率的。

### R-5. /state 応答のスリム化と監査ログ成長の抑制

- UIは `/state` 全量を2秒毎にポーリングし、`/agent-requests/next` はポーリングのたびに監査ログを追記する。
  state.json は単調に肥大化し、全API(全量read/write)を遅くする。
- **注意(当初評価から更新)**: 対応には連動修正が必要で、単独では低リスクでない。
  - next返却ログの廃止 → `agent-scenario-test.mjs` が3箇所でこのイベントを検証している(要テスト修正)
  - `/state` から操作ログ・決定ログを外す → App.vue の `requestActivityRefreshKey` が
    `store.state.decisionLogs` 等を直接参照している(要クライアント修正)
- 実施するなら R-3(App.vue分割)と同時が安全。

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

---

## 推奨着手順(2026-07-02 R-1完了後の更新版)

1. **R-2** control.ts 分割(機械的な移動。web-gemini モジュール分離で型が既に整っている)
2. **R-3 + R-4 + R-5** App.vue分割と文言一本化・ポーリングスリム化(連動するのでまとめて)
3. R-9 は R-2 のついでに解消、R-7 は外部公開の前提条件
