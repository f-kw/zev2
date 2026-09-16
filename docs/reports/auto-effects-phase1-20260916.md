# 自動演出＋後修正 Phase 1 — 実装・短尺検証報告

2026-09-16。固定通常計画からの解決、一件修正、保存前検証、通常描画入口への接続を実装した。接続後の契約・保存・接続テストは **93/93合格**。短尺映像の6状態は既存の物理QCを含めて全件合格し、通常復元・自動復元を161フレームすべての一致で確認した。通常ファイル入口からの25.3秒・2字幕の追加実走も、実描画・物理QC・ローカル公開まで合格した。ZEV進行管理4の最終監査で第一完成として受理され、**Phase 1は完了**。Phase 2は未着工である（第13節）。

## 1. 目的・着工根拠

最新の直接指示「ZEV『自動演出＋後修正』のPhase 1へ着工してください」に従う。目的は見た目の完成ではなく、固定通常計画、保存された自動演出、人間による一件修正、毎回作り直す実効描画計画の関係を実コードで成立させること。

正本は次のGoogle Drive文書を取得して全文確認した。文書自体の移動・改訂は行っていない。文書内のレビュー案という履歴より、今回の正本指定・着工指示を現行認可として扱う。

| 文書 | 参照 | 取得テキストのSHA-256 |
| --- | --- | --- |
| 設計方針・開発計画 レビュー反映 v002 | [Drive](https://drive.google.com/file/d/1AlYyD8M2PFRb6gw0TjhQ_E_FHuaQnXOf/view) | `f79e6477bcdb905580d6cc95f8a87b4c9805f7cb3eb7b3680e89c110d550f531` |
| Phase 1実装work-order v001 | [Drive](https://drive.google.com/file/d/1Xmp1RT4_Yv0skPVL-sOJ_7rl0qnkIZPZ/view) | `18f91d8a3fb477dd2f5098f33979efcedd0db3b546c2792823285c04a3154825` |

OpenChatCut研究branchを実装baseにせず、演出試作の実HEADから専用worktreeを作った。新規依存、OpenChatCut実行・移植、字幕の再分割・時刻再推定、本番Agent、部分範囲描画、動的Vocal accent、音声候補発見器、UIは追加していない。

## 2. Git開始状態と保全

| 項目 | 開始時の記録 |
| --- | --- |
| 元作業tree | `/Users/kawafmm/workspace/zev2` |
| 元branch | `codex/digest-effects-step2` |
| 固定base | `43380006bc4f8e1c902c067dcb53669790b6ce2c` |
| 元branchの未push | ローカル追跡ref比較で1 commit。既存の演出architectureレビュー文書追加 |
| 対象外tracked差分 | `docs/policies/PRODUCTION_QC_LAYER_POLICY_v001.md` 1件 |
| 対象外untracked | 59,153件 |
| 元tree staged | 0件 |
| Phase 1 branch | `codex/digest-effects-phase1` |
| Phase 1 worktree | `/private/tmp/zev-auto-effects-phase1-puocgzuv/worktree` |

元treeの全未追跡ファイルを列挙したstatusとtracked差分を開始時に保存した。確認時にもstatusは同じ59,154エントリでbyte一致、tracked差分もbyte一致。statusのSHA-256は `3d2edf1b0683e8c76d59baf100b59fcf6658e2d3d799a0b3ceebc1dfa3441b3b`。未追跡物すべての内容hashを測定したという意味ではない。

stash、reset、clean、既存物の削除・移動、元treeへの実装書込はしていない。今回の新規commitの変更はbaseとの差分で示す。指定baseに含まれる既存未push文書commitは、新branchをpushする際に祖先として共有される。元branchのrefを書き換えたり、その既存文書を今回の新規実装として計上したりしない。

## 3. 通常の製造・描画経路への接続

- 既存の通常共通計画は、確定本文、表示順、改行、時刻、通常の外観、素材・元記録への対応を既に持つ。この計画のpath、実byte hash、内容hashを参照し、演出専用の字幕本文正本を作らない。
- 旧演出試作のNormalは渡された計画を返すだけなので、演出適用後の計画からの復元には使えない。新しい一件修正では旧試作を呼ばず、固定通常計画から毎回解決する。
- 許可された静的表現は検証用の全文Focus一種類。既存試作の黄色 `#FFD65A` を配管確認用にだけ使う。正式な製品デザインへの採用ではなく、入力側から色・サイズ・位置等を渡すことは拒否する。
- 通常製造入口で生成した共通計画を固定通常計画として保持し、新しい解決処理が返す実効計画だけを既存の配置検査、描画、物理QCへ渡す。結果には通常計画と実効計画を別々に残す。
- 新経路の入力と旧演出試作が同時に指定された場合、共通描画入口は出力予約や描画より前に拒否する。新経路では旧試作の解決処理を呼ばない。
- 通常のファイル入力関数からも、通常計画・判断入力・固定自動案・人修正のファイル参照を渡せる。実byteの読込と版検証を通し、自動案・人修正の保存元pathと実byte hash、入力控え、解決結果を返す。通常計画と一致しない別の描画計画への流用も拒否する。
- 描画前に作成済みの配置検査を渡す呼出しでは、外観が変わる演出の追加を拒否する。実効計画に対する配置検査を省略できない。

## 4. 実装した契約

### 保存可能な自動案

提案を直接保存せず、対象字幕が存在すること、通常計画・判断入力・描画規則の版が一致すること、許可した役割・表現・全文対象だけであること、重複・矛盾・未知項目がないことを確認してから固定する。対象集合・効果指定・例外は表示順へ正規化し、内容hashを持つ固定案として保存する。

判断完了は指定された処理対象集合に対してだけ成立する。部分集合を処理した場合、対象外は未処理として残し、全件Normal成功へ変換しない。空集合、判断未完了、未対応の部分範囲は拒否する。

### 人間による一件修正

| 操作・状態 | 意味 |
| --- | --- |
| 修正なし | 保存された自動案を継承する |
| Normal固定 | 対象一件の自動演出を外し、固定通常計画の外観を使う |
| 有限なFocus指定 | 対象一件の演出を置き換える。自動で未選択だった箇所にも追加できる |
| Reset | 対象一件の修正を消し、保存済み自動案へ戻す |

人間修正は通常計画・判断入力・描画規則・固定自動案の版へ束縛する。どれかが変わった場合に古い修正を黙って移す処理はない。編集操作は自動案と通常計画を書き換えない。

### 実効計画と状態

検証した入力から、固定通常計画を起点に一回だけ外観を派生する。本文・順序・時刻・元対応・通常配置を複製編集する別正本は持たない。無指定、完了済み全Normal、全自動演出をNormal固定で外した状態では、元計画全体と深く一致する。

解決結果には、どの通常計画・判断入力・描画規則・固定自動案・人間修正を使ったかを追跡できる参照を返す。字幕ごとに自動案由来・人修正・未処理・Normal判断・選択・表現不能・根拠不足を区別する。人間が直しても、元の自動判断の例外を自動成功へ書き換えない。

### ファイル保存境界

保存時・読み直し時に通常計画と判断入力の実byteから参照を作り、提案・修正の参照と照合する。保存後にファイルを編集した場合も再検証する。保存は新しい出力pathだけに行い、既存ファイルを上書きしない。不正な入力では出力ファイルを作らない。

中間監査後、同じbyteの正本を別配置へ移しただけで失効する制約を修正した。pathは読込場所・来歴として保持し、版の同一性と固定案・人修正の内容hashは、実byte hash、通常計画の内容hash、描画規則の版から判定する。内容や規則が変わった場合の拒否は維持する。移設先への現在参照と、固定案が保存された時点の参照位置は混同しない。

## 5. 契約・接続・既存回帰検査

依存の新規installは行わず、既存のroot・runner・sharedの依存を専用worktreeの領域へローカル複製した。元treeの依存は変更していない。コピー済み実行ラッパーの元tree絶対参照を避け、既存Node `v20.19.6` と新worktree内の直接CLIを使った。

| 検査 | 最終結果・範囲 |
| --- | --- |
| 状態と一件修正 | 63/63合格。局所性、冪等性、順序独立、NormalとReset、通常案・固定自動案の不変、例外と未処理の分離、有限指定、版検証 |
| 保存・再読込 | 25/25合格。実byte参照、検証前未保存、不正・改変・上書き拒否、同内容の移設、修正内容を渡さない保存の拒否 |
| 通常描画接続 | 5/5合格。混在・未知版の描画前拒否、無演出3形の描画入力一致、対象一件だけ変更、通常計画と実効計画の分離、通常ファイル入口の実byte改変拒否 |
| 統合最終再実行 | **93/93合格、失敗0、skip 0**。既存85件＋接続5件＋保存境界の回帰3件 |
| 共有型 | 既存TypeScript 5.9.3の `--noEmit` 成功 |
| 既存の通常製造入口 | 11/11合格 |
| 既存rendererの軽量回帰 | 選定12件中9合格・3不合格。未選択7件はskip。以下に理由を明記 |

既存rendererの3不合格は、既存の信頼台帳が要求する4個の描画ソースhashと現物との不一致である。該当ソース4件と台帳1件は、全件が今回のbase `43380006` とbyte一致した。今回の変更で発生した差分ではない。台帳を更新して通す処置は行っていない。このため「全リポジトリの検査が合格」とは報告しない。通常製造入口の回帰11件と、今回の物理描画は別に検証した。

不一致の対象は `runner/src/remotion/Root.tsx`、`runner/src/remotion/renderer/TelopRenderer.tsx`、`evals/clip_composition/presentation_renderer_entry_v001.tsx`、`evals/clip_composition/presentation_renderer_text_layout_v001.mjs`。比較対象台帳は `evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json`。

最終統合検査は固定Nodeへ既存TSX loaderを指定し、状態・保存・描画接続の3 test fileを一度に実行した。通常製造入口の既存回帰も同じNodeを使った。

| 証拠（共通prefix: `/private/tmp/zev-auto-effects-phase1-puocgzuv/`） | SHA-256 |
| --- | --- |
| `phase1-tests-v0005.tap` | `22e88ebd486ac6046fd3afe35176a8907a0f2de289b84114bdc2ebcdfcef55cb` |
| `shared-typecheck-v0005.log`（成功・出力なし） | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `instruction-runner-regression-v0001.tap` | `a9be5fcb4df6fe3e39d40b9359bbb854505928170ec9bdc577f3352d0191e3fb` |
| `renderer-regression-v0001.tap` | `8899b07001a78dafc3274ef1108ea5e1e8bb064367485a68d7d9f9dd0a54a077` |
| `renderer-regression-baseline-evidence-v0001.json` | `e9ae0556b17a504477cf212e97160d25f03600c0b31747a8626026cc2c66a405` |

独立レビューと中間監査を受けた実装の限定修正は計3回。空き要素を含む対象配列の拒否、pathと内容の同一性の分離、修正内容を渡さない保存の拒否である。最後の修正では、描画時の「修正なし」は有効のまま、保存時には版へ束縛された有効な修正文書を必須にした。省略・明示undefinedの2条件（test集計では親を含む3件）を追加し、修正後の統合検査は合格した。

## 6. 少数の実字幕による早期成立性確認

325字幕の通常計画は既存の `work-digest-v1-phase2-20260913-v001/style-94-v001/common-plan.json` を読取参照した。実byte hashは `420bac69fb75c878a770406155171d5f09167ac22e41c1cd0c707f580229a778`。字幕対応記録、保持判断、Prospect記録、時間対応記録もpath/hashで固定し、判断入力の参照一覧へ束縛した。映像・音声を再解析せず、外部AIを呼ばず、保存された確定本文と説明だけを用いた。

実IDはいずれも `digest-v1-phase2-20260913-v001-bridge-caption-` に表中の6桁を付ける。次は確認用の意味提案であり、自動選択器の正解ラベルや演出採用判断ではない。

| ID末尾 | 確定本文・狙い | 診断と実契約への投入結果 |
| --- | --- | --- |
| 000172 | 勝つなら許す — 条件を含む結論全体 | 全文Focusを受理 |
| 000211 | 期待してません決して! — 否定を含む全文 | 全文Focusを受理 |
| 000152 | うおースーパーノヴァ覚えた — 名称と達成部分だけ | 部分範囲が必要。全文へ広げずPhase 1での表現不能を保存 |
| 000141 | 1時間1時間経っちゃった — 二度目の語だけ | 部分範囲と出現位置が必要。Phase 1での表現不能を保存 |
| 000081 | 逆にわけわからんくなっちゃった — 前の字幕との転換の着地点 | 主対象の全文Focusを受理。二字幕の文脈を読むことと二字幕を統合描画することを分離 |
| 000099 | 重さ重さ重いやつと変化1増えるやつ — 二つの非連続範囲だけ | 厳密な案の表現不能を保存。一連続範囲へ提案し直す代案と区別 |
| 000009 | やったー! — 声の勢いが妥当か | 音声未観測による未解決を保存。感嘆符からVocal成功を作らない |

7件を実際の保存前検証、固定保存、読み直し、解決処理へ通した。**全文Focus 3件、例外4件、対象外318件は未処理、Normal判断0件**。処理対象が部分集合であることを結果に残した。未対応の部分範囲を直接指定した案は保存前に拒否され、出力ファイルがないことを確認した。元記録5件のhashは不変だった。

詳細な成立性記録は一時証拠 `/private/tmp/zev-auto-effects-phase1-puocgzuv/early-proposal-cases.md`（SHA-256 `f4433b03d1b9198a76699e056f3911e27b1ad4b4fa18eb294bfd6df6c4c42694`）。実入口の初回確認記録は同directoryの `early-contract-check-v001.json`（SHA-256 `6b14d2f7c0a214bc619f7f8775ddf1c522bee8de29e99b19aaa5e57c385e71d7`）。中間監査後の内容identity修正を使った再実行も同じ結果で合格し、`early-contract-check-v002.json`（SHA-256 `b659d907fb3d938a495007a58858bf37bccb23f911a2790f9ecd9a7e43f5691a`）へ保存した。大きな生成物・素材・既存の未追跡物はcommitへ含めない。

この確認から、全体の表現不能率、見落とし率、自然さ、可読性、演出価値は算出していない。少数確認だけで未読字幕までNormal判断したことにもしていない。

## 7. 接続再開と残課題

初回は通常描画入口2ファイルへの変更が環境の自動承認レビューで拒否された。自動承認レビューが以前の静的調査限定を現在の許可範囲と判断したためで、拒否時は適用を止め、具体的な変更案を提示した。

2026-09-16の最新ユーザー指示「ZEV Phase 1の未適用renderer接続を明示承認します」を受領後、指定2ファイルへ接続を適用した。今回の指示は以前の静的調査限定をPhase 1へ適用しないこと、通常計画の保持、二重適用禁止、検証・配置・物理QC・来歴・本文等の保持、短尺一往復までを明示している。承認待ちは解消済みである。

Phase 2の部分範囲描画・範囲修正・最小状態表示は未着工。反復語の出現位置、原文から描画文字への対応、書記素境界、改行越し、否定・条件を保つ意図判断が次の論点として残る。今回の一件の非連続範囲案を理由に、複数範囲へ製品範囲を広げていない。

通常ファイル入口の受付から最終公開までの未実測範囲は、第11節の追加実走で解消した。共通描画の6状態検査に加え、既存の短尺jobへ固定自動案と有効な空の人修正を渡し、実体の描画・物理QC・公開と来歴保持を確認した。

既存の信頼台帳と描画ソースhashの不整合は第5節の通り残る。全編再生成、演出選択の精度・自然さ・製品デザインの目視判断は今回の検査結果から主張しない。Phase 1の成立は、部分範囲描画と最小状態表示を含むPhase 2までの機能完成を意味しない。

## 8. ZEV進行管理4の中間監査

2026-09-16 08:18頃JST、Microsoft Edge上の指定会話へ監査checkpoint `c3191005d366ad60496a702c480d9dd32439b87e` とbaseとの差分・報告URLを送信した。GitHubからの報告読戻しblob `3271263118f961b2b6a3315b88f96e790efdafea` はlocalと一致。branch先頭も同commitで、push後の専用worktreeはclean・ahead/behind 0だった。

`chatgpt-workflow`を用いた中間監査であり、新しい指示書の依頼ではない。モデルの固定指定はなく、現在の選択と「極高」を維持した。送信後に日本語本文の表示、生成終了、応答アクションの表示を確認した。送信は一回、再送・再生成なし。状態は「レスポンス確認済み」。

相談役はコード・テスト・base差分を確認し、「基盤実装成立、production接続待ち」でありPhase 1完成扱いは不可と回答した。保存前・再読込時の検証、固定通常計画起点の解決、Normal/Reset分離、未処理を全Normalへ混ぜない構造を、v002/work-orderの意図と整合すると評価した。

監査からの限定修正・接続条件は次の3点。

1. 絶対pathを内容identityにしない。位置の来歴は保持し、同じbyte・同じ版なら移設だけで自動案・人修正を失効させない。
2. 通常製造結果の共通計画は固定通常計画のまま保持し、実効描画計画は派生物として別に返す。
3. 新しい自動演出と旧演出試作の二重適用を拒否する。

1は拒否されていない独立coreの限定修正として進めた。保存前検証の配列欠陥に続く実装の限定修正2回目。移設検査では現在参照位置も元と同じであることを求めた検査側の期待を修正した（検査設営修正1回）。2・3は明示承認後の接続で実装し、描画前拒否と結果保持の試験を追加した。

中間監査の修正後検査は固定Node `v20.19.6` で **85/85合格、失敗0、skip 0**。共有型検査も再度成功した。TAP全文は `/private/tmp/zev-auto-effects-phase1-puocgzuv/phase1-contract-tests-attempt-0003.tap`、SHA-256は `cf8707e4938eb7a57d45bca7c06d09b717c08b706e1dc52369bf45a780caa5ca`。移設前後で描画計画・判断状態・固定案および人修正の内容hashは同一となり、移設先の内容変更は拒否された。早期7ケースも修正後の処理で再実行済み。

相談役は対象2ファイルを明示した再開指示文も提示した。その時点では環境側の拒否を応答だけで迂回せず、ユーザーの明示承認後に再開した。現在は第7節の通り接続済みである。

## 9. baseからの全変更一覧（10ファイル）

| ファイル | 作業内容 |
| --- | --- |
| `packages/shared/src/auto-presentation.ts` | 固定参照、有限提案、一件修正、解決来歴の最小型 |
| `packages/shared/src/index.ts` | 共有型の公開 |
| `evals/clip_composition/presentation_auto_effects_v001.mjs` | 保存前検証、固定化、一件修正、通常計画からの解決 |
| `evals/clip_composition/presentation_auto_effects_io_v001.mjs` | 実byte参照の読取、検証後保存、再読込時の再検証 |
| `evals/clip_composition/presentation_auto_effects_v001.test.mjs` | 局所性・冪等性・順序独立・復元・版束縛・不正案拒否 |
| `evals/clip_composition/presentation_auto_effects_io_v001.test.mjs` | 保存・再読込・改変検知・移設・既存ファイル保全 |
| `evals/clip_composition/render_presentation_v002.mjs` | 旧試作との混在拒否、実効計画を既存配置・描画・物理QCへ接続、解決結果と入力控えを返却 |
| `evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts` | 通常製造・ファイル入口への接続、固定通常計画を保持、保存元ファイルの来歴を返却 |
| `evals/clip_composition/presentation_auto_effects_renderer_v001.test.mjs` | 通常入口への接続、無演出一致、一件だけ変更、実byte改変拒否の回帰 |
| `docs/reports/auto-effects-phase1-20260916.md` | 着工根拠、元tree保全、実装・検査・短尺証拠、早期ケース、監査、残課題 |

## 10. 保存済み短尺素材での一往復と物理QC

### 入力と実行経路

既存比較の約5.37秒・1920×1080・30fps・161フレームの基礎映像と、字幕3件の通常計画をそのまま使用した。追加の素材取得、切出し、字幕再分割、時刻変更は行っていない。既存の短尺結果ラッパーから計画部分だけを検査用ファイルへ保存して、実ファイル入力の検証に使った。検査用のコピーを新しい字幕正本とは扱わない。

| 既存入力 | 実byte SHA-256 |
| --- | --- |
| 通常計画を含む `digest-effects-step2-comparisons-v003/scratch/reaction-A-resolved.json` | `b5c53ad8d91fc78d8182f1d6c81706da28b13b218ee1a021f085ec4f33b970f6` |
| 同 `scratch/reaction-base.mp4` | `d20dc44ab0dc1b17ff80e6cc7b8ac76aa1974f8a8c153468b3c77e8c23d8b511` |
| `work-digest-v1-phase2-20260913-v001/style-94-v001/preset-registry.json` | `9ae9208bccc8b75d798ab1ae2f2f21ea275d96121a844c04b4dae1889bcd4c7d` |

表のpath prefixは元作業treeの `evals/clip_composition/outputs/presentation/`。実行後も3入力のhashは不変だった。選択対象は字幕000009「やったー!」一件で、字幕000008・000010は通常表示のまま。これは状態往復を調べる検査用の指定であり、第6節に記録した音声根拠不足を解消したり、Vocal accentの採用を判断したりしたものではない。

自動案と各段階の人修正を、実際の保存前検証を通して新規ファイルへ保存し、描画のたびに実byte検証付きで読み直した。6状態をすべて、通常の製造入口が呼ぶ同一の共通描画処理へ渡した。配置検査、Remotionの字幕PNG、再描画の決定性検査、行ごとの実画素検査、FFmpeg合成、音声検査、字幕を省いた比較映像による最終可視性検査を実行した。検査基準や閾値は変更していない。

### 6状態の結果

| 状態 | 描画・物理QC | 全161フレームの一致関係 |
| --- | --- | --- |
| 自動案なし・人修正なし | 合格 | 既存の保存済みNormal映像と一致 |
| 全件Normalの完了済み自動案 | 合格 | 上の無演出と一致 |
| 一件に自動Focus | 合格 | 自動Focusの基準出力 |
| その一件を人間がNormal固定 | 合格 | 無演出・従来Normalへ一致 |
| その一件へ人間がFocus再指定 | 合格 | 保存済み自動Focusと一致 |
| その一件をReset | 合格 | 保存済み自動Focusへ一致 |

比較は復号した映像の全フレームhash列で行い、6出力のMP4ファイル自体も上記の二群でbyte一致した。

| 一致する群 | MP4実byte SHA-256 | 全フレームhash列のSHA-256 |
| --- | --- | --- |
| 従来Normal・無演出・全Normal・人Normal | `44196ed3a72e65c28160da98a4edbf07df4dc0be31c8d3d55c1b111e7356246a` | `c5b8156eb4bda8f6c3950464c4a804553ae6e298e1c4fa8f3ec208e27e658481` |
| 自動Focus・人Focus・Reset | `4f82d6dbb049d9326dbf3064259ecfbd0278978cbe4c048a5242d82416d92bb9` | `3e8e4389d60c3abfa1f4693905f4d546388ba72a8aedc7e2a05607973eb12f9f` |

### 不変と実画素の確認

- 元の通常計画は深い比較で不変。選択対象の文字色以外は、実効計画の全フィールドが一致した。本文、字幕順序、時刻、表示長、元動画対応、来歴も含む。
- 全6状態の配置検査結果は完全一致。対象外の2字幕はPNGの実byte hashも一致した。選択対象のPNGだけが通常とFocusで変化した。
- 全18個の字幕描画は、空画像、表示領域からの逸脱、行の重なり、時間と空間が重なる字幕衝突、代表フレームでの非表示の検査に合格した。同一入力から2回描いたPNGも一致した。可視性の比較フレームは字幕順に19・47・109であり、可視性検査そのものを全161フレームへ実施したという意味ではない。
- 選択対象の通常表示とFocusは、1920×1080の透明度2,073,600画素が完全一致した。色変更によって基準の字形輪郭が欠けたり配置が変わったりしていない。透明度のSHA-256は両方 `7a2023e6ea01051d905962872fec78a685dda140a42c2c38615acc8194e56684`。対象外2字幕は画像全体が一致し、残る各状態もそれぞれ同じPNGへ一致する。
- 音声は全出力で元のAAC packet payloadと一致。hashは `aee02bc7b56dac072c8900d6df9ea811487bef024e8deda505e7933d0c6b5441`。映像は全件161フレーム、音声を含む観測長は5366ms。
- 旧試作との同時指定は第5節の接続試験で描画開始前に拒否し、6状態では新経路または無指定の通常経路を一度だけ通した。

| 字幕ID末尾 | 実画素の外接範囲（左・上・右・下） | 安全領域・配置 |
| --- | --- | --- |
| 000008 | 495・845・1397・974 | 全状態で同一、合格 |
| 000009 | 732・847・1171・974 | 全状態で同一、合格 |
| 000010 | 402・844・1483・974 | 全状態で同一、合格 |

既存の安全領域は左80、上40、右端1840、下端1040。既存QCは空描画、領域逸脱、行・字幕の交差、代表フレームの可視性を確認する。追加の透明度比較は、基準表示から字形輪郭の欠けが増えないことを確認する。これらを文字ごとの完全認識や、演出意図・自然さ・製品デザインの人間による目視承認とは扱わない。

### 証拠

集計は `/private/tmp/zev-auto-effects-phase1-puocgzuv/short-e2e-v002/summary.json`、SHA-256 `1a8c64e7259b6d82bf1934d8646ac03b41b3e72aa8e24518b5bbfbbd0800a640`。同directoryへ6状態の入力、描画返却結果、配置・画素・音声・可視性検査、全フレームhash列を保存した。透明度比較は `selected-caption-alpha-comparison.json`（SHA-256 `0cef2ced21e45fdab3e3f928fc2d2ad0f24c03fc1b25a2127f7dae8e1bdd0917`）。従来Normalとの比較は `previous-normal-comparison.json`（SHA-256 `0f80ffb05567d9a2ef52ad7b704801ccad6a04ff584a19402e781864ea32c47d`）。

短尺実行の初回は、sandboxが既存TSXのローカルIPCを拒否し、配置検査の結果が生成されなかった。失敗出力とstderrを `short-e2e-v001`、`short-e2e-attempt-0001.log` に保存し、実行権限の承認後に別の出力版で同じ検査を再実行した。検査基準や実装を緩める修正はない。成功ログは `short-e2e-attempt-0002.log`。

ローカルの検証映像:

- [従来Normalと一致する無演出](/private/tmp/zev-auto-effects-phase1-puocgzuv/worktree/evals/clip_composition/outputs/presentation/.auto-effects-phase1-short-v002-none.presentation-renderer-v002-work-qje9ET/publish/presentation-rendered-v002.mp4)
- [自動Focus](/private/tmp/zev-auto-effects-phase1-puocgzuv/worktree/evals/clip_composition/outputs/presentation/.auto-effects-phase1-short-v002-auto-focus.presentation-renderer-v002-work-AGdCJQ/publish/presentation-rendered-v002.mp4)
- [人間によるNormal固定](/private/tmp/zev-auto-effects-phase1-puocgzuv/worktree/evals/clip_composition/outputs/presentation/.auto-effects-phase1-short-v002-normal.presentation-renderer-v002-work-xHXX2p/publish/presentation-rendered-v002.mp4)
- [人間によるFocus再指定](/private/tmp/zev-auto-effects-phase1-puocgzuv/worktree/evals/clip_composition/outputs/presentation/.auto-effects-phase1-short-v002-human-focus.presentation-renderer-v002-work-qy6oHo/publish/presentation-rendered-v002.mp4)
- [Reset後](/private/tmp/zev-auto-effects-phase1-puocgzuv/worktree/evals/clip_composition/outputs/presentation/.auto-effects-phase1-short-v002-reset.presentation-renderer-v002-work-ZOLH2f/publish/presentation-rendered-v002.mp4)

## 11. 通常ファイル入口から公開までの追加E2E

保存済みの `distant-connection-formal-render/candidate-horror-claim-to-speed-up-v003/renderer-job-v002.json` を元に、25.3秒・759フレーム・発話字幕2件の専用検査jobを作った。本文、字幕時刻、元動画対応、保持区間、意味入力、契約、台帳を変えず、出力先3箇所と実行環境・実装の実byte参照だけを更新した。基礎映像は専用worktreeへ既に存在する保存済みファイルを使用し、切出し・再取得は行っていない。

実行前に、許可した箇所以外のjob全体が元と一致すること、正式な形式の読込、入力参照27件、元source29件のhashを照合した。固定通常計画を既存の生成処理で作り、固定Focus一件と版に束縛された空の人修正文書を、新しい保存前検証を通して保存した。

その4つの入力ファイル参照を通常ファイル入口へ渡した。描画・検査・公開の差替えやmockは使わず、既存の本物の処理を一回実行した。

| 確認項目 | 実測結果 |
| --- | --- |
| 通常の受付・製造・公開 | 終了コード0、製造完了、ローカル検査出力へ公開済み |
| 動画 | 1920×1080、30fps、759フレーム、25,300ms |
| 物理QC | 字幕2件とも配置、実画素、最終映像の比較、音声を含め合格・違反0 |
| 通常計画 | 保存した固定通常計画と完全一致 |
| 実効計画 | 一件の全文Focusだけが変更され、他の字幕と全ての本文・時刻・来歴は保持 |
| 人修正 | 有効な空文書の保存・再読込を確認 |
| 出力からの追跡 | 通常計画、実効計画、自動案・人修正の入力控え、解決結果、4入力の参照を保持。自動案と人修正の保存元path・実byte hashも一致 |
| 保全 | 元source29件、専用入力5件が実行前後で不変 |

音声のpacket payloadは元と一致し、SHA-256は `116c340067dd2ed0c2125878bd9c0de3c85bd48dc27c77214b81a0a174486e20`。字幕を一件ずつ省いた比較映像との差分はそれぞれ204,850画素と274,506画素で、最終出力上の可視性を確認した。これは既存の可視性検査の観測値であり、新しい合格閾値ではない。

証拠は `/private/tmp/zev-auto-effects-phase1-puocgzuv/file-entry-e2e-v002/` に保存した。

| 証拠 | SHA-256 |
| --- | --- |
| `summary.json` | `6b0f21320afead511760605c406c3162a471b469e0990286cb32524ed392c3c4` |
| `result.json`（通常入口の全返却結果） | `24225339d7adfeba1e80b2928daf8f54781767ed603515e3dfd3af24d872650b` |
| 公開された検査用MP4 | `2dfaf1cc6854653310ca447280253133a1f2bfaf0db840fbadb70ecab05d598b` |

[通常ファイル入口を通った検査映像](/private/tmp/zev-auto-effects-phase1-puocgzuv/worktree/evals/clip_composition/outputs/presentation/auto-effects-phase1-file-entry-v001/render/presentation-rendered-v002.mp4)

最初の実行前検査では、検査スクリプトが独自のcompact JSONをjobの正式形式とみなしていたため読込検査に失敗した。実描画前で止め、v001の証拠を保存し、既存の正式serializerでjobを書くよう設営だけを修正した。v002の実行前検査は合格し、正式描画は一回で成功。これは先の移設検査の期待値修正に続く検査設営修正2回目で、実装・契約・台帳・本文等を変更していない。

## 12. 第一完成の範囲と保存方針

固定通常計画の保持、保存前検証、修正なし・Normal固定・有限置換・Reset、固定通常計画からの再解決、局所性・冪等性・順序独立、版不一致拒否、Normal・未解決・技術失敗の分離、通常製造への接続、通常表示の不変、実字幕7件の早期成立性を確認した。

Phase 1の基盤実装と必要な検証は第一完成。監査checkpointのcommit/pushとZEV進行管理4の最終監査も完了した（第13節）。Phase 2の着工や正式デザイン採用、main merge、tag、stable昇格、releaseをこの完成から自動的に開始しない。

正本へ残すのは第9節の10ファイルのみ。動画・画像・入力fixture・プロセス記録などの検査証拠は専用の一時作業領域に保存し、commitへ混ぜない。元作業treeの既存tracked差分1件・未追跡59,153件・staged0は保全している。専用worktreeには今回作成した検査中間物が未追跡で残るため、tree全体がcleanだとは報告しない。新規API費用・契約追補は0。

## 13. 最終監査と完了記録

2026-09-16 09時台JST、Microsoft Edgeの「ZEV進行管理4」へ `AUDIT_ONLY` として第一完成の監査を依頼した。対象はbranch `codex/digest-effects-phase1`、base `43380006bc4f8e1c902c067dcb53669790b6ce2c`、監査commit **`8a8d4da86ac2224ef4ed589ce90dbc64f25feba4`**。push後のremote branch先頭と、報告書blob `40197dca6c84603f4152b840f7d64423d2d33f7c` のlocal/remote一致を確認してから送信した。

[監査対象commit](https://github.com/f-kw/zev2/commit/8a8d4da86ac2224ef4ed589ce90dbc64f25feba4) / [監査対象のbase差分](https://github.com/f-kw/zev2/compare/43380006bc4f8e1c902c067dcb53669790b6ce2c...8a8d4da86ac2224ef4ed589ce90dbc64f25feba4)

相談役の最終回答は「Phase 1の第一完成として受理します。完了を妨げる修正はありません」。実差分、主要実装、保存境界、描画接続、テスト定義、報告を照合し、次を確認した。

- 固定通常計画からの派生、NormalとResetの分離、版束縛、同内容の移設時の扱いが意図どおりである。
- 通常計画を保持し実効計画を別に返すこと、旧試作の同時指定を拒否すること、外観変更後に古い配置検査を使えないことが実装されている。
- 通常ファイル入口の再読込検証・保存元参照の保持と、修正内容を省略した不正保存の拒否が成立している。
- 93件の契約・接続検査、通常入口11件、短尺6状態、追加の通常ファイル入口E2EはPhase 1の検証範囲として十分である。
- 旧信頼台帳に起因する3件の既存回帰不合格は、今回の差分によるものとは扱わず、Phase 1完了を妨げる問題にはしない。

監査上の留保として、GitHub上のcommit・コード・テスト定義・報告は相談役が直接確認したが、ローカルの一時領域にある動画・TAPそのものを相談役の環境で開いたり再実行したりしたわけではない。これらは本書のhashと実行結果を監査証拠として扱った。この区別を残す。

`chatgpt-workflow`で同じ指定会話へ送信し、日本語本文の表示と、生成終了・回答操作の表示を確認した。状態は **レスポンス確認済み**。モデル固定条件は指定されておらず、現在の選択とUIの「極高」を維持した。最終監査依頼は一回、再送・更新・再生成なし、新しい指示書の依頼なし。

現在地は **Phase 1完了・第一完成受理、Phase 2未着工**。正式演出デザイン、本番Agent、部分範囲、Vocal motion、UIの完成承認へ広げない。本節の保存は監査応答の記録であり、DECISIONS.mdや契約への承認行追加は行っていない。
