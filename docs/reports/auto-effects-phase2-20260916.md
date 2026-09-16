# 自動演出＋後修正 Phase 2：実装・比較見本の検証記録

2026-09-16。Phase 2の範囲契約・保存・一件修正CLIを実装したが、実画像検査で文字位置の変化とカラー絵文字の塗色不適用を検出した。**Phase 2は未完成。実素材E2Eと比較動画の製造は開始せず、描画方式の判断をZEV進行管理4へ戻す中間checkpointである。** 人間による表現評価は未実施であり、改善・完成承認は主張しない。

## 1. 目的・根拠・範囲

- 最新個別指示「ZEV『自動演出＋後修正』のPhase 2へ着工してください」（2026-09-16）を着工根拠とする。
- 正本は [ZEV_Phase2_実装work-order_v001.md](https://drive.google.com/file/d/1uxZYZJ6bmF6yxSOXrMj71dcS_KIVWkTy/view)。読取複写を作業証拠directoryに保存した。
- baseは `75b4fd38d5fea51b43a8c1bc23944be63d3e821a`。branchは `codex/digest-effects-phase2`。
- 専用worktreeは `/private/tmp/zev-auto-effects-phase2-9n461w4w/worktree`、証拠directoryはその親。
- 固定通常計画、固定自動案、人間の一件overrideの三層を継続する。毎回通常計画から実効状態を派生し、既に変更した計画へ強調を重ねない。
- 対象はNormal固定、全文Focus、部分Focus、Reset。新規依存、本番選択Agent、音声候補発見、動的演出、高機能UI、Digest正本変更、素材外部送信は範囲外。

## 2. 開始状態と作業保護

| tree | 開始HEAD・branch | tracked差分 | 未追跡件数 |
| --- | --- | --- | ---: |
| 元作業tree | `43380006bc4f8e1c902c067dcb53669790b6ce2c` / `codex/digest-effects-step2` | 2,604 bytes、staged 0 | 59,153 |
| Phase 1専用tree | `75b4fd38d5fea51b43a8c1bc23944be63d3e821a` / `codex/digest-effects-phase1` | 0、staged 0 | 254 |
| Phase 2専用tree | 同base / `codex/digest-effects-phase2` | 開始時0、staged 0 | 開始時0 |

元treeとPhase 1 treeの状態全文・差分・hashは `starting-git-inventory.json` と対応する記録に保存した。掃除・移動・削除を行わず、既存依存を専用treeへ複写した。新規依存の取得・追加はない。

監査前にも両treeのstatus全文・tracked差分・staged差分・HEAD・branchを再取得し、今回の開始記録とbyte一致を確認した（`pre-audit-git-preservation-v001.json`）。

未変更のPhase 2 treeで、Phase 1の契約・保存・描画接続 **93/93合格、skip 0**。旧renderer選定12件は9合格・既知3不合格（未選択7件）。不合格02/03/04の4箇所の診断、対象source、期待hash・実hashはPhase 1保存証拠と一致した。開始証拠は `phase2-start-test-evidence-v001.json`。

## 3. 範囲契約と描画方法

保存する部分Focusは、表示字幕ID、原文どおりの対象文字列、必要時の1始まり出現番号、有限のFocus指定を持つ。一字幕に一つの連続範囲だけを許可する。

一致は大文字小文字・Unicode正規化・文字の省略を行わない完全一致。重なる一致も出現順に数え、複数一致で出現番号がない場合や番号が存在しない場合は拒否する。開始・終了はNode標準の書記素分割で検査し、絵文字や結合文字の途中を切らない。

保存案には生のoffsetや描画色を持たせない。固定本文から描画直前にcode pointの半開区間へ確定し、既存の原文と表示行の対応へ割り当てる。通常・全文Focus・部分Focusは同じ文字runからSVG spanを描く処理を使う。文字幅は行全文で測り、span側で位置や字間を設定しない。計画上は塗色だけを変更し、縁取り・glow・書体・大きさ・改行・位置・時刻の指定値を維持する。実描画の文字位置不変は第7節のとおり未達である。

描画規則を `auto-presentation-rules-v002` として内容hashへ束縛する。旧版の規則を受け入れるaliasや分岐は設けない。通常計画・判断入力・固定案の変更を検出した場合も保存・描画を拒否する。

## 4. 一件修正の導線

`evals/clip_composition/edit_auto_presentation_v001.mjs` は次の操作を提供する。

| 操作 | 処理 |
| --- | --- |
| `show` | ID、動画時刻、原文の完全一致部分から候補を表示する。検索なしなら全字幕 |
| `normal` | 対象一件をNormal固定する |
| `focus` | 対象一件を全文Focusへ置換する |
| `partial` | 原文どおりの文字列と必要時の出現番号で部分Focusへ置換する |
| `reset` | 対象一件のoverrideを削除し、保存済み自動案へ戻す |

表示内容はID、表示時刻、本文、固定自動案、実効状態、由来、全文／部分、部分文字列と出現番号、override有無、Reset可否。未解決・未処理も区別する。

修正候補が複数なら一覧を示して保存を拒否する。操作前と保存後の状態を表示し、検証済みの新しいoverrideファイルを排他的に作る。既存ファイルの上書きや内部JSONの手編集は不要。

## 5. 検証経過

| 検証 | 現在の結果 |
| --- | --- |
| 開始時Phase 1の93件 | 93/93合格 |
| 範囲契約拡張後のPhase 1の93件 | 93/93合格。既存assert・意味・件数を維持、規則定数参照だけ更新 |
| CLIの対象検索・状態表示・4操作・保存拒否 | 9/9合格 |
| 実字幕ファイルによるCLI実行 | 3検索＋4操作の7コマンド成功。Resetで元の保存済み部分指定へ復元 |
| 共有型 | 合格 |
| 共通描画用の型検査 | 合格 |
| 既存の見出し・配置・共通文字モデル検査 | 48/48合格 |
| Phase 2範囲・保存の追加検査 | **121/121合格**。親11＋正例20＋拒否core45＋拒否保存45 |
| spanへの範囲割当・不正範囲の追加検査 | 14/14合格 |
| 実画像検査 | 13 fixtureを実測し、不変条件違反を検出。テスト15件全体では14合格・実画像1不合格 |
| 実素材6状態E2E・比較見本 | 入力保存・再読込・状態解決まで合格。描画は0件 |

監査前の統合実行は、Phase 1の93件＋Phase 2 core/IOの121件＋CLIの9件＝**223/223合格、skip 0**。spanの実画像不合格をこの合計へ混ぜて合格扱いにはしていない。

独立レビューで、改行だけの強調を保存できる一方、描画が「可視文字なし」で拒否する不一致を検出した。保存前にもLF/CRだけの指定を拒否する限定修正1件を実施し、121件と93件を再検査した。通常の空白を勝手に禁止せず、可視文字を含む原文改行またぎは受理する。

原文改行の役割を揃えた描画処理については、baseの描画入口も以前からLF/CRを改行役割として要求していたことを確認した。旧行対応helperが可視文字扱いした入力は従来も描画前拒否であり、既に成功していた通常描画を変更する修正ではない。

見出し検査の初回は試験環境から既存React依存を解決できず開始前に失敗した。初回TAPを保存し、専用treeの既存runner依存を検索先に設定して再実行した結果48件合格。依存追加や本体変更はない（検査設営修正1件）。

実画像検査の初回はmacOS sandbox内でChromiumの起動が拒否された。証拠を保持し、同一のローカル描画を正規の環境承認後に実行した。新規依存・外部通信・API費用はない。

| 証拠（共通prefix：`/private/tmp/zev-auto-effects-phase2-9n461w4w/`） | SHA-256 |
| --- | --- |
| `checkpoint-unit-tests-v001.tap`（223合格） | `f0256457bafc3759af2bd8d197e35a270e6cd3c703ad0e4524a2397da2d06829` |
| `phase2-partial-core-io-v002.tap`（121合格） | `ae2225371c45c907d4b0ce22a30d0c56ae2e1f3c40e80030b5c0be93238eb4de` |
| `span-unit-v003.tap`（14合格・実画像1件を未選択） | `42707114a8892564f07c528d94b2e52accf185c6efe495f871a08201f9f8e138` |
| `span-tests-v002.tap`（14合格・実画像1不合格） | `9ce5f36d6b1573b93971b71b63a7eec8fd7b4ea2b585e7e91e56a460b0bc86be` |
| `title-renderer-regression-v002.tap`（48合格） | `d82bf04819a2af9d206c473ef225f6b5c1a50b745c28e294969b79f293d0715d` |
| `cli-demonstration-v001/summary.json`（実字幕・7コマンド） | `a2974782ab4474d99a2c04a9074c0943891fadcf5d42eb11ee8b1aa4d8343d72` |
| `short-e2e-v001/bound-inputs.json`（入力準備・描画未開始） | `6f37d34769dc0ba4d0c200fe3b6f152201a37f55043185fce60b436b6c1cb8a6` |

### 旧台帳3件の変化を調査した結果

共通span実装後も不合格は同じ02/03/04の3テストだが、hash診断は4箇所から8箇所へ増えた。開始時と完全同一の例外としては扱わない。

追加4診断は、今回変更した文字描画部品と文字モデルの2ファイルが、旧previewと旧依存台帳の両方に登録されているためである。もともと不一致だった描画入口と行対応処理の2ファイルも、今回の変更で実hashが変わった。全8診断は同じcomponent hash不一致であり、新しい不合格テストや別の拒否理由はない。

期待値は旧台帳のまま維持し、現在の実ファイルhash、baseのhash、変更file一覧を照合した。意図した4ファイル変更だけが診断差分に対応する。台帳や既存fixtureを書き換えて合格にする処理は行わない。記録は `renderer-regression-change-investigation-v001.json`（SHA-256 `d4ec3a8f538509cf5e76a22cafd2623e1230d6494f571a5135b6a72f68874e42`）。描画動作そのものは追加検査・実画像・実素材E2Eで別に確認する。

## 6. 実素材E2Eと比較設計

保存済みDigestの既存比較区間、161フレーム・約5.37秒・3字幕を使う。対象は「わかんないけどやったー!」。字幕本文、時刻、順序、保持区間、元動画対応、通常計画、base mediaは変更しない。

| 状態 | 処理・対象範囲 |
| --- | --- |
| A | 固定通常版 |
| B | 手配置した固定案で「やったー!」を部分Focus |
| C | 一件の人修正で「わかんないけど」へ範囲を変更 |
| D | 同じ一件をNormal固定 |
| E | 同じ一件を全文Focus |
| F | Eのoverrideを削除し、Bの保存済み部分範囲へReset |

Bは依頼された比較用にCodexが明示配置した案であり、本番Agentの自動判断や人間の品質承認ではない。AとD、BとFの全フレーム一致、対象外字幕画像、全画像alpha、配置、音声、原本不変を照合する予定だったが、下記の描画問題のため実走前で停止した。

[Production QCの責務とコスト](../policies/PRODUCTION_QC_LAYER_POLICY_v001.md)に従い、実フォント画像の配置・再現性・安全領域を検査し、完成MP4は通常のメディア検査と代表字幕中央の109フレーム目を用いる。字幕省略による全timeline再符号化は実施しない。

## 7. 実画像で確認した停止理由

既存の実フォントと既存Chromiumを使い、本物の共通文字モデルと文字描画部品を静的描画した。65枚のPNG、文字位置、透明度、塗色、縁取り、指定外画素を保存した。文字数・表示行・boxと縁取りは全13ケースで同一だが、範囲によって塗り文字の位置や画素が変わった。

| ケース | 観測した不一致 |
| --- | --- |
| 「はい、はい、進めます」の2回目の「はい」 | 字形位置が変化、全体alpha 9画素、塗りalpha 2,141画素、指定外2,141画素が変化 |
| `AVATAR office` の `VATAR of` | 字形位置が変化、塗りalpha 312画素、指定外16画素が変化 |
| 結合文字・variation selector | PNGは同一輪郭だが、SVGの文字位置で1/64 pixelの差を観測 |
| `😀` | 選択字形6,525画素は存在するが、変更画素0・Focus色画素0。カラーフォントがSVGの塗色指定に従わない |

先頭・中央・末尾、日本語句読点、表示行またぎ、原文改行またぎ、全文、単一書記素のケースは、測定した文字位置・alpha・指定外画素の一致と選択色を確認した。ただし成功したケースだけで一般の部分Focusを合格にしない。

範囲境界でSVG spanを分ける前後で、1/64 pixel単位などの字形位置差を測定した。ブラウザ内部の丸めの影響が疑われるが、内部機構そのものを直接確認したわけではない。許容誤差の導入、通常版も一字ずつ分けて基準を変更する対応、絵文字の除外は行っていない。

証拠は `span-raster-v002/summary.json`（SHA-256 `02ad63f873a7595b417efd449dd714cb3371ade56e1af74f0e11be6ef5d9e97b`）。同directoryの `compact-results.json` は結果表、各ケースの記録はPNGのpath/hashと全測定値を持つ。

### 既存ブラウザ機能で閉じられるかの限定診断

本体を変更せず、全文を分割しない状態でCSS Custom HighlightとSVG文字選択を各3ケースへ試した。Custom Highlightは対象範囲を登録できても目的の塗色を得られない。SVG文字選択は日本語と英字の2ケースでalphaと対象領域外を維持して塗色を変えられたが、絵文字の変更画素は依然0である。どちらも2種類の欠陥を同時に閉じる経路として成立していない。

6 probeの結果と12枚のPNGは `highlight-feasibility-v001/summary.json`（SHA-256 `1d7c5d839ae084b8b1cf896fdd23bfa7cd166cc92867c4b91de68947a19a57ce`）。この診断によるproduction変更は0件。

## 8. 判断依頼・残工程

決めることは、既存の文字描画部品内で「全文の字形を一度だけ確定し、その輪郭を保持して指定範囲の色だけを重ねる」方法を検証する範囲を許可できるかである。現行span分割での不変条件違反とカラーフォントの制約があるため、色を重ねる描画方法へ進む場合はrenderer architecture変更の停止条件との整理が必要になる。

推奨は、本文・配置・時刻・三層保存・通常描画結果を維持することを前提に、同じ描画部品の塗色処理に限定した実現可能性を判断すること。別renderer、汎用字形処理基盤、フォント置換、字幕変更、新規依存や許容誤差の追加は推奨しない。新しいmaskや字形処理の実装は未着手。

相談役が既存work-order内の限定修正と判定できる場合は、その範囲を具体的に示してほしい。renderer architecture変更または完成条件の変更になる場合は、work-order第17節に従いkawafmmへHUMAN_DECISIONとして上げる。判断を待つ間、依存するrenderer変更・実素材E2E・比較動画製造は行わない。

残工程は描画問題の解決、全追加検査の合格、6状態E2E、通常版と部分Focus版の比較見本、最終監査である。

技術合格から「表現が改善した」とは推定しない。通常版と部分Focus版を同一区間で人間が確認した後に、成立見本の完了を判定する。Phase 3、本番Agent、main merge、tag、stable昇格、releaseは今回進めない。

## 9. このcheckpointの変更ファイル

| ファイル | 処理の変更 |
| --- | --- |
| `packages/shared/src/auto-presentation.ts` | 部分文字列指定・出現番号・解決範囲・表示状態の共有型 |
| `packages/shared/src/index.ts` | 新しい部分指定の型を公開 |
| `evals/clip_composition/presentation_auto_effects_v001.mjs` | 完全一致・書記素境界・一件修正の範囲解決、規則v002 |
| `evals/clip_composition/presentation_auto_effects_io_v001.mjs` | 規則v002で保存入力を束縛 |
| `evals/clip_composition/presentation_auto_effects_v001.test.mjs` | 既存93件のうち規則定数の参照名のみ更新 |
| `evals/clip_composition/presentation_auto_effects_partial_v001.test.mjs` | 部分範囲・Unicode・四操作・保存拒否の追加検査 |
| `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` | 原文範囲を表示行の塗色runへ割当、原文改行の役割検証 |
| `evals/clip_composition/presentation_renderer_entry_v001.tsx` | 行全文の計測を維持して塗色runを描画部品へ渡す |
| `evals/clip_composition/render_presentation_v002.mjs` | 派生範囲の描画受渡し・古い配置検査の使回しを拒否 |
| `runner/src/telop/telop-render-model.ts` | 共通文字モデルへ塗色runを持たせる |
| `runner/src/remotion/components/TelopText.tsx` | 通常・全文・部分を同じspan描画へ通す（実画像問題は第7節） |
| `evals/clip_composition/presentation_auto_effects_span_v001.test.mjs` | 範囲割当と実フォント画像の厳密比較。不合格もそのまま保持 |
| `evals/clip_composition/edit_auto_presentation_v001.mjs` | 対象特定・状態表示・四操作のCLI |
| `evals/clip_composition/edit_auto_presentation_v001.test.mjs` | 検索・操作・再読込・拒否・既存ファイル不変を検査 |
| `docs/reports/auto-effects-phase2-20260916.md` | 着工根拠、実装、検証、未完了と判断事項を記録 |

生成画像・動画素材・テスト入力・一時証拠はcommitへ含めない。現状固定は完成承認や正式採用を意味しない。
