# zev2 UI設計書 — サイバーパンク2077・1画面HUD

作成者: Claude (Opus 4.8) / 2026-06-28
対象: `client/src/App.vue`（人間制御UI）
正本プレビュー: 同フォルダ `ui-redesign-preview.html`（ブラウザで開いて見た目を確認）
方向: サイバーパンク2077（イエロー×シアン×レッド、警告ストライプ、斜めカット、グリッチ、スキャンライン）。**最重要要件 = 1画面完結・スクロールさせない。**

この文書は「指示だけで素材まで分かる」ことを目的に、配色・タイポ・素材・レイアウト・状態別仕様を実装可能な粒度で固定する。

---

## 0. 大原則（ここを外すと全部ダサくなる）

1. **1画面完結・スクロール禁止**。画面は `100dvh` に必ず収める（`overflow:hidden`）。情報を縦に積んでスクロールさせるのが従来のダサさの正体。HUDとして全体を一望させる。
2. **枠は固定、中身だけ差し替え**。上部のシステムバー＋工程ステッパー＋サイドHUDは常時固定。状態（テーマ選択／新規作成／完成／待機／作り直し）はメインステージの中身だけが変わる。
3. **役割を持たない装飾は1つも置かない**が、HUDの「枠・刻み・ログ・座標」は“制御している感”を生むので意図的に使う（AGENTS.md: UIは人間の選択/確認/承認のため）。
4. **イエローは主役、シアン/レッドは脇役**。黄色を面で乱用せず、アクセントと発光に集中させる。
5. zev2の7工程（取り込み→STT→候補探索→Gemini確認→演出付与→微調整→動画生成）を常時ステッパーで可視化。

---

## 1. カラートークン（:root にそのまま定義）

| トークン | 値 | 用途 |
|---|---|---|
| `--bg` | `#0a0a0c` | 画面ベース（ほぼ黒） |
| `--yellow` | `#fcee0a` | **2077シグネチャー**。主アクセント・発光・進捗・選択 |
| `--cyan` | `#00f0ff` | 副アクセント（ログのタイムスタンプ、グリッチ） |
| `--red` | `#ff003c` | 警告・失敗・中止・グリッチ |
| `--text` | `#f2f3e8` | 本文・見出し（やや暖色の白） |
| `--text-dim` | `#8a8d7a` | 補足 |
| `--text-faint` | `#55584a` | ラベル・無効・罫 |
| `--panel` | `#101013` | パネル面 |
| `--panel-2` | `#15151a` | 入れ子カード（選択肢など） |
| `--line` | `rgba(252,238,10,.22)` | イエロー由来の境界線（HUD罫の基本） |

状態色: 完了/実行中=`--yellow`、待機=`--text-faint`、失敗/中止=`--red`。
発光は `box-shadow: 0 0 Npx rgba(252,238,10,.4〜.7)` と `text-shadow` で付与（やりすぎ注意、要素単位で）。

---

## 2. タイポgrafhy

| 役割 | 書体 | 用途 |
|---|---|---|
| 見出し・ラベル・ボタン | **Rajdhani**（500/600/700） | テクニカルで縦長、SF・HUDの定番。`AI AGENT` 等 |
| 数値・コード・ログ・座標 | **JetBrains Mono**（400/500/700） | `62%` `SES 0x7F·A4` `12:62:08`、`tabular-nums`必須 |
| 日本語本文 | **Noto Sans JP**（400/500/700/900） | 「演出付与中」「緊張感ある会話劇」など |

- 英ラベルは原則 **大文字＋`letter-spacing:.12〜.22em`**。これがHUD感の核。
- 見出しに**グリッチ**を任意付与（`data-t`属性で多重化し、シアン/レッドを稀にズラす。常時ではなく数秒に一瞬）。
- サイズ: h1=26 / h2=19〜21 / 本文=12〜14 / ラベル=9〜11（px）。

---

## 3. 必要素材リスト

### フォント（@fontsource推奨。zev2既存のroboto-fontfaceと同方式）
```bash
pnpm --filter client add @fontsource/rajdhani @fontsource/jetbrains-mono @fontsource/noto-sans-jp
```
```ts
// main.ts もしくは main.css
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
```
> CDNで済ます場合は Google Fonts の Rajdhani / JetBrains Mono / Noto Sans JP（プレビューHTMLはこの方式）。

### アイコン・画像
- **ラスター画像は一切不要**。以下は全てCSS/文字で生成:
  - 警告ストライプ = `repeating-linear-gradient(45deg, --yellow 0 12px, #0a0a0c 12px 24px)`
  - パネル斜めカット・ボタン・選択肢の角 = `clip-path: polygon(...)`
  - 四隅HUDブラケット = 1.5〜2px borderのL字 `<span>`
  - コーナー三角 = `clip-path:polygon(100% 0,0 0,100% 100%)` の小片
  - スキャンライン = `repeating-linear-gradient(0deg, ...)` を `body::after` に `mix-blend-mode:multiply`
  - 工程ノードのチェック/再生/番号 = テキスト記号（✓ ▶ 6 7）
  - 待機スピナー = 六角 `clip-path` ＋回転border
- 既存の `@mdi/font` を残すなら使ってよいが、必須ではない。
- 任意: favicon/ロゴにイエローの斜めグリフ1個（SVG）。

### ライブラリ
- 追加UIフレームワーク不要。Vuetifyは現状ほぼ未使用なので、このリデザインで外してネイティブCSSへ寄せても良い（変更時はAGENTS.mDに従い要相談）。

---

## 4. 画面レイアウト（1画面シェル）

```
┌ shell (100dvh, border, 斜めカット, 四隅ブラケット) ───────────────┐
│ [sys]   AI AGENT — ONLINE   ┆  [REVIEW][NEW][OUTPUT][WAIT] ┆ 12:62:08 │  ← 細い固定バー
│ [statline]  ▌Process  演出付与中     ◇─◇─◇─◇─◈─◌─◌      62% │  ← 工程ステッパー固定
│ ┌ main (grid: 1fr / 232px) ───────────────────────┬─ side ──────┐ │
│ │ [stage] 主コンテンツ（状態で中身差し替え）        │ Session 情報 │ │
│ │   ・テーマ選択 / 新規作成 / 完成動画 / 待機       │ System Log   │ │
│ │                                                  │ Hint         │ │
│ └──────────────────────────────────────────────┴──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

CSS骨子（プレビュー準拠）:
- `body{height:100dvh; overflow:hidden; padding:12px}`
- `.shell{height:100%; display:grid; grid-template-rows:auto auto 1fr; gap:10px; border:1px solid --line; clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))}`
- 四隅ブラケット = `.shell > .bk.tl/.tr/.bl/.br`（絶対配置、L字border、--yellow）
- `.main{display:grid; grid-template-columns:1fr 232px; gap:10px; min-height:0}`
- `.stage{min-height:0; overflow:auto}` ← **唯一スクロールを許す局所領域**（選択肢が画面より多い時のみ。細いスクロールバー）。stage以外は絶対にスクロールさせない。

### 狭幅対応（任意）
- 1000px未満ではサイドHUDを畳む（`grid-template-columns:1fr`、`.side{display:none}`）か、Session情報だけ1行化。HUDは横長前提なので、まずデスクトップ最適でよい。

---

## 5. 形状・エフェクトのトークン

| 要素 | 指定 |
|---|---|
| パネル角カット（大） | `clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))` |
| ボタン角カット | `clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px)` |
| 選択肢角カット | 左下のみ落とす `polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)` |
| 警告ストライプ | 高さ8px、`repeating-linear-gradient(45deg, --yellow 0 12px, #0a0a0c 12px 24px)` |
| スキャンライン | `body::after` 全面 `repeating-linear-gradient(0deg,transparent 0 2px,rgba(0,0,0,.28) 2px 3px)` / `mix-blend-mode:multiply; opacity:.45` |
| グリッチ見出し | `data-t`をbefore/afterで多重化、`clip-path:inset()` でシアン上半・レッド下半をずらし、3秒周期で一瞬だけ表示 |
| LEDインジケータ | 8px角、`--yellow`＋`box-shadow:0 0 10px`、`blink 1.3s steps(1)` |
| 工程バス線 | `repeating-linear-gradient(90deg,--text-faint 0 3px,transparent 3px 7px)`、完了区間は `--yellow`＋発光 |

`@media (prefers-reduced-motion: reduce){ *{animation:none!important} }` を必ず入れる。

---

## 6. 固定HUD部品

### 6-1. システムバー `.sys`
- 左: LED ＋ `zev2 // AI AGENT — ONLINE` ＋ セッションID（mono, faint）。
- 中央: **状態切替タブ**（実アプリでは現在状態の表示＋人間が許可された遷移のみ。装飾ではなく実機能に結線）。選択中はイエロー塗り＋黒文字。
- 右: 時刻（mono）。
- 高さは最小限（〜28px相当）。

### 6-2. 工程ステッパー `.statline`
- 左に `▌Process` ＋ 状態見出し（h2, 例「演出付与中」）。
- 中央に7ノード横一列＋ダッシュのデータバス。ノード = 角カットのセル(28×22)。完了=✓(イエロー枠)、実行中=▶(イエロー塗り＋発光)、待機=番号(faint枠)。各ノード下に英ラベル(INGEST/STT/SCAN/GEMINI/FX/TUNE/RENDER, mono 8px)。
- 右に進捗 `62%`（mono, 22px, イエロー発光）。
- 直下に進捗バー（黒地＋イエロー塗り）。

### 6-3. サイドHUD `.side`（縦3box）
- **Session**: SOURCE / LENGTH / MODEL / STAGE(05/07) のkey-value（mono）。実データに結線。
- **System Log**: タイムスタンプ(シアン)＋工程＋`OK`(イエロー)の追記ログ。実行履歴を流す。
- **Hint**: 「完了したら微調整の確認を依頼します」など、人間が次に何を待たれているかの一文（AGENTS.md「次にユーザーへ何をしてほしいか明示」に合致）。
- 装飾と実用の両立。実装簡略化のためSessionとHintだけにしてLogを省いても可。

---

## 7. メインステージ 状態別仕様（中身差し替え）

すべて `.stage` 内で `v-if` 切替。**stageの外枠・サイズは不変**。

### 7-1. テーマ選択 / 候補確認 `review`（主役）
- `▌Theme Candidates · Input Required` ＋ h1「どの切り口で作りますか？」＋ sub。
- 選択肢 `.opt`: 角カットカード。左に**五角形マーカー**（選択時イエロー塗り＋発光）、中央にタイトル(Rajdhani)＋説明(Noto)、右に連番`01/02/03`(mono)。選択中は枠イエロー＋淡イエロー面＋内側発光。hoverで枠が光る。
- ラジオ選択の実体は `<input type=radio>` を視覚的に隠して `v-model` 維持（ロジック不変）。
- アクション: 主=`▶ 承認`（イエロー塗り）、副=`⟲ テーマを作り直す`等（イエロー枠ゴースト）。既存の全分岐（material_reselect / theme_reselect / theme_options_regenerate / edit_plan / render_readiness）はゴーストボタンとして横並び・wrap。

### 7-2. 新規作成 `new`
- `▌zev2 // create` ＋ h1「ショート動画を作成」。
- runtime-summary = 角枠の `.scard` 2枚（Source / Transcript、値はmonoイエロー）。
- textarea（黒地・イエロー細枠・focusでイエロー）＋ `▶ 動画を作成`（主ボタン）。
- **新規作成も1画面に収める**（現状は単独ページだが、stage内に収めればスクロール不要）。

### 7-3. 完成動画 `output`
- stage中央寄せ。`▌Render Complete · 00:14 · 1080p` ＋ h1「完成動画」。
- `<video>` は最大520px・16:9・イエロー細枠。プレースホルダは斜めハッチ＋イエロー再生三角(CSS)。
- 下に作り直し2種（ゴースト）。

### 7-4. 作業中待機 `wait`
- stage中央に六角スキャナ（回転border）＋ `▌Processing` ＋ h1（現在工程）＋ 詳細文(mono)。
- 「待てばよい」と一目で分かる静かな画面。

### 7-5. 作り直しモーダル `dialog`（プレビュー未収録・実装で追加）
- 画面中央オーバーレイ（`rgba(0,0,0,.7)`）＋角カットパネル（`--panel`, イエロー枠）。
- `▌作り直し` ＋ 対象タイトル ＋ 理由textarea ＋ 右下に `キャンセル`(ゴースト)/`▶ 作り直す`(主)。
- 出現は `scale(.97)→1` ＋ fade 160ms。**オーバーレイ表示中も背後はスクロールさせない。**

### 7-6. 通知（status-message / error / lock）
- 左3px帯＋淡面のHUDノート（mono）。info=イエロー、error=レッド、lock=`--amber`相当（`#ffb454`）。stage上部か該当部位にインライン表示。

---

## 8. ボタン仕様

| 種類 | 見た目 | 用途 |
|---|---|---|
| Primary `.btn.p` | イエロー塗り・黒文字・角カット・`0 0 18px` 発光、hoverで `#fff84a` | 承認・動画を作成・作り直す(実行) |
| Ghost `.btn.g` | 透明・イエロー枠・イエロー文字、hoverで淡イエロー面 | 作り直す/選び直す/戻る/キャンセル |
| Danger `.btn.d` | 透明・レッド枠・レッド文字、hoverで淡レッド面 | 作業を中止 |

共通: Rajdhani 700・大文字・`letter-spacing:.06em`・`padding:10〜11px 20〜22px`・角カット・`transition:.14s`・`:disabled{opacity:.5}`。

---

## 9. アニメーション一覧（最小限）

| 対象 | 動き | 時間 |
|---|---|---|
| LED | blink（steps） | 1.3s loop |
| 実行中ノード/進捗 | 発光（静的）／待機スピナー回転 | 1s loop |
| グリッチ見出し | 数秒に一瞬ズレて表示 | 2.4〜3s loop |
| ボタン/選択肢 hover | 枠発光・面色 | 140ms |
| モーダル出現 | scale＋fade | 160ms |
| 状態切替 | fade（任意） | 150ms |

すべて `prefers-reduced-motion` で停止。

---

## 10. アクセシビリティ・実装上の注意

- ステッパー領域は `aria-live="polite"`（現行維持）。
- 黒地に黄文字は高コントラストで可読だが、**本文は黄ではなく `--text`(#f2f3e8)** を使う（黄は見出し・数値・強調のみ）。長文を黄にしない。
- `clip-path` 非対応は稀だが、フォールバックで角丸0の矩形になるだけで破綻しない。
- カスタムマーカー/ラジオでも実DOMの input と `v-model` は維持。視覚だけ差し替える。
- **DOM構造・クラス名・v-if分岐・APIは変えない。** 作業は (a) ルートを1画面gridシェルに組み替え、(b) スタイル全差し替え、(c) サイドHUD要素の追加、の3点に限定。挙動・ロジックは壊さない。

---

## 11. 実装ステップ（推奨順）

1. `main.css` に §1 のCSS変数、フォントimport、`body{100dvh;overflow:hidden}`、スキャンライン `body::after` を追加。
2. App.vueのルートを `.shell`（grid 3行＋四隅ブラケット）に組み替え。
3. システムバー＋工程ステッパー＋進捗を `.statline` に固定実装（ステッパーを角カットセル＋データバスへ）。
4. `.main` を stage＋side の2カラムに。stageに既存の各状態（review/new/output/wait/dialog）を `v-if` で配置。
5. 選択肢・ボタン・textarea・通知を §5/§7/§8 のトークンで全置換。
6. サイドHUD（Session/Log/Hint）を実データに結線（Logは省略可）。
7. グリッチ・LED・スピナー等のアニメ＋ `prefers-reduced-motion`。
8. 各状態が**必ず1画面に収まる**ことを実画面で確認（stage以外スクロール無し）。

---

## 12. 確認方法

- 見た目: `ui-redesign-preview.html` をローカル配信で開く（ビルド不要）。状態は上部タブで切替。**キャッシュが残る場合は `?v=2` 等のクエリを足す。**
- 実装後: `pnpm run dev:client` で 新規作成→候補確認→テーマ選択→完成 を一巡し、どの状態でもスクロールが出ないこと・黄文字過多になっていないことを確認。

---

## 付録: プレビューと実装の差分メモ

- プレビューのサイドHUD（Session/Log）の値はダミー。実装では state API に結線するか、未使用なら削る。
- プレビューに作り直しモーダル(§7-5)・通知(§7-6)は未収録。実装時に同トークンで追加。
- 状態切替タブはプレビューでは全状態を自由に行き来できるが、実アプリでは「現在の工程が許す遷移」だけ出す（人間の制御権・AGENTS.md準拠）。
