# 自動演出＋後修正 Phase 2：実装・比較見本の検証記録

2026-09-16。**Phase 2の技術実装と比較見本が完成。実画像14 fixture、Phase 1の93件を含む225件、見出し48件、型検査3系統、実素材6状態が合格した。最終監査も必須修正なしで完了した。** 人間による動画の表現評価は未実施。技術検証と「見やすくなったか」の判断を区別する。

## 1. 目的・適用する指示

- 着工根拠は2026-09-16の個別指示「ZEV『自動演出＋後修正』のPhase 2へ着工してください」。[work-order](https://drive.google.com/file/d/1uxZYZJ6bmF6yxSOXrMj71dcS_KIVWkTy/view)を参照した。
- baseは `75b4fd38d5fea51b43a8c1bc23944be63d3e821a`、branchは `codex/digest-effects-phase2`。
- 専用worktreeは `/private/tmp/zev-auto-effects-phase2-9n461w4w/worktree`。以下の証拠名は、特記がなければその親directoryからの相対名。
- 固定通常計画＋固定自動演出案＋一件ごとの人間修正という三層を維持し、一字幕内の一つの連続範囲を指定・変更・復元する。
- 通常の実装、検査、限定修正、監査checkpoint commit/pushは今回の個別指示により許可されている。DECISIONS、Goal、work-orderは変更していない。

### 最新HUMAN_DECISIONによるカラー字形の仕様

同日の最新指示は、完成条件の「カラー絵文字もFocus色へ変える」だけを撤回・置換した。**native color glyphは元RGBAを保持し、通常の塗色に従う字形はFocus色へ変更する。** カラー絵文字だけのFocusが見た目上変わらなくても正常であり、範囲指定とFocus状態は保持する。monochromeの記号・絵文字を文字種で一律に除外する処理は作らない。

新しい複数pass描画工程は不承認。既存の一字幕overlay・一回の静止画像描画内のnative Selection方式で、既存13 fixture＋混在範囲、Phase 1回帰、実素材6状態、通常／部分Focusの比較動画まで進む指示に従う。通常描画、字形・alpha・本文・改行・位置・時刻・来歴を維持し、新renderer、新stage、新依存、字形処理基盤、pixel許容誤差は追加しない。

描画規則は `auto-presentation-rules-v003`、内容SHA-256は `2d0a8741ffb1f2a5f12fcd00fad16a347b99e1400c15b9558b865df74a44cec4`。通常の塗色とnative color glyphの扱いを規則に含め、旧版の保存入力を受け入れる互換分岐は設けない。

## 2. 範囲指定・保存・描画

保存する指定は字幕ID、原文どおりの対象文字列、必要時の1始まり出現番号、有限のFocus指定。生の文字offsetや任意色を保存契約へ加えない。

原文の完全一致から一意に解決する。Unicode正規化、近似適用、省略補完は行わず、重なる一致も出現順で扱う。複数一致で番号がない、番号が存在しない、書記素クラスタの途中、改行だけで可視文字がない指定は保存前に拒否する。原文改行をまたぎ可視文字を含む範囲は受理する。

描画前に原文内のcode point半開区間へ確定し、既存の表示行対応からブラウザ文字ノード内の位置へ変換する。全文Focusも字幕全文の同じ範囲指定へ変換し、部分Focusと共通の描画処理を使う。常に固定通常計画から実効計画を派生するため、修正を既に着色済みの計画へ重ねない。

各行の塗り文字はPhase 1と同じ一つの全文文字ノードで描き、途中で分割しない。フォント読込と既存位置補正が確定してから、指定範囲をnative Selectionで選択する。選択の前景だけをFocus色、背景を透明にし、Focus時のみ描画反映を待って既存の静止画像を撮影する。縁取りとglowは選択描画から除く。

通常版の描画準備は追加フレーム待機なし。位置計測用の隠しコピーには選択を渡さない。終了時はこの字幕部品が所有する選択だけ解除する。既存productionは一字幕ごとに描画プロセスを分けており、複数字幕で選択状態を共有しない。途中mask画像の生成・再入力はない。

## 3. 人間が一件を修正する導線

`evals/clip_composition/edit_auto_presentation_v001.mjs` による最小CLIを追加した。

| 操作 | 処理 |
| --- | --- |
| `show` | ID、動画時刻、原文の完全一致部分から候補を表示。検索なしなら全字幕 |
| `normal` | 対象を通常表示へ固定 |
| `focus` | 対象を全文Focusへ置換 |
| `partial` | 対象文字列と必要時の出現番号で部分Focusへ置換 |
| `reset` | 対象の人間修正だけを削除して固定自動案へ戻す |

表示には本文・時刻、固定自動案、実効状態、由来、自動／人間修正／Normal固定／未解決／未処理、全文／部分、対象文字列と番号、人間修正の有無、Reset可否を含める。候補が複数なら一覧を示して保存を拒否する。

編集前後の状態を表示し、検証済みの新しい修正ファイルを排他的に作る。既存ファイルの上書きや内部JSONの手編集は不要。実素材から保存した入力でも、ID・時刻・本文の3検索と部分変更→Normal固定→全文Focus→Resetの4操作が成功した。Reset後は元の「やったー!」の部分Focusへ戻り、通常計画・判断入力・固定自動案のbyteは不変だった（`cli-demonstration-v002/summary.json`）。

## 4. 最終コードに対する検査

| 検査 | 結果 |
| --- | --- |
| Phase 1の契約・保存・描画接続 | 93/93合格、skip 0 |
| Phase 2の範囲・Unicode・保存・四操作 | 123/123合格 |
| CLI | 9/9合格 |
| 上記統合実行 | **225/225合格、skip 0** |
| 範囲の表示行割当と不正範囲拒否＋実画像 | **16/16合格、skip 0**。実画像は14 fixture |
| 既存見出し・共通モデル | **48/48合格、skip 0** |
| 共有型・共通描画型・描画入口型 | 3系統すべて合格 |
| 二行見出しの通常描画と準備完了の接続 | Phase 1との全RGBA・alpha差0、字形と位置一致 |
| 旧renderer選定12件 | 9合格・3不合格、未選択7。下記のとおり別途調査 |

Phase 1の93件は開始時と最終コードで再実行した。全文Focusの接続検査は、通常styleを直接置換する期待値から全文の範囲指定へ更新し、通常計画と他字幕の不変検査を保持した。検査件数を減らしていない。カラー絵文字のみの自動Focusを保存・再読込し、混在範囲へ変更、Normal固定、Resetで元の絵文字範囲へ戻る検査も追加した。

### 実画像14 fixture

本番の描画入口をclient mountし、フォントと位置の確定、描画待機の解除後に撮影した。Phase 1 commitの描画sourceも独立してbundleし、現在の通常版の比較基準とした。既存フォント・Chromiumを使い、新規取得や依存追加はない。検査用の字形maskは独立した観測用であり、本番PNGの製造には使わない。

**全14例で、Phase 1通常版との全RGBA・文字位置・geometry差0。通常／Focus間の全文alpha・塗りalpha・指定外RGBA・縁取りRGBA・背景変色も差0。** 範囲文字列の一致、実際の選択、描画待機完了、隠しコピー撤去、終了時の選択解除も確認した。

| # | fixture | 対象文字列 | 不透明な通常字のFocus色画素 | カラー字形 |
| --- | --- | --- | ---: | --- |
| 1 | start | 最初 | 11382 | — |
| 2 | middle | 大事な | 13022 | — |
| 3 | end | 強調する | 19282 | — |
| 4 | repeated-second | はい | 6826 | — |
| 5 | display-line-crossing | 大事な | 13022 | — |
| 6 | source-newline-crossing | 半\n後 | 10312 | — |
| 7 | japanese-punctuation | 「大事」。 | 13050 | — |
| 8 | emoji | 😀 | 0 | 元RGBA保持 |
| 9 | combining | é | 2614 | — |
| 10 | variation-selector | ✈︎ | 672 | — |
| 11 | whole | 全文を強調する | 32759 | — |
| 12 | one-grapheme | 猫 | 6163 | — |
| 13 | kerning-boundary | VATAR of | 19017 | — |
| 14 | mixed-native-color | A😀猫 | 9170 | 元RGBA保持 |

カラー絵文字だけの例では6,525画素の字形が存在し、選択範囲を保持したまま画像全体が通常版と同一。混在例も絵文字6,525画素のRGBAは同一で、通常文字に9,170画素の不透明なFocus色を確認した。monochromeのvariation selector例は672画素がFocus色になり、一律の絵文字除外がないことを確認した。

追加の二行見出し通常版は既存title検査の縦型fixtureをそのまま使用した。描画待機を解除する瞬間に、本文2行、隠し計測コピー0、選択0、待機中handle0を観測した。titleへの新しいFocus機能は追加していない。

### 旧台帳3不合格の変化を調査

開始時の不合格は02／03／04、component hash診断4箇所。現在も同じ3テストだが、診断は8箇所となったため「開始時と同一の3件」として免除していない。

追加4診断は今回変更した文字描画部品と文字モデルが旧preview・依存台帳の両方に登録されているため。既存の描画入口・行対応処理も変更後の実hashに変わった。全8箇所の実hashをファイル現物・baseと照合し、意図した4 sourceの変更に対応することを確認した。最新のnative Selection組込み後も失敗テスト・診断数・診断種別・期待hashは前回調査と同じで、描画入口と文字描画部品の実hashだけが更新された。

旧台帳とfixtureを合格させるための変更はしていない。これら3件は合格数へ加えず、動作は上記の実画像・回帰と実素材検査で別に検証する（`renderer-regression-native-investigation-v001.json`）。

## 5. 実素材6状態と比較見本

既存Digestの同一区間、161フレーム・約5.37秒・3字幕を使う。対象本文は「わかんないけどやったー!」、対象の表示区間は57フレーム以上161フレーム未満。元動画、音声、本文、改行、表示順、時刻、位置と通常計画を維持する。

| 状態 | 処理 |
| --- | --- |
| A | 固定通常版 |
| B | 「やったー!」を手配置した固定部分Focus案 |
| C | 一件修正で「わかんないけど」へ範囲変更 |
| D | Normal固定 |
| E | 全文Focus |
| F | ResetでBの保存済み部分指定へ復元 |

Bは比較検証用にCodexが明示配置したもの。本番Agentの候補発見や意味判断ができたとは扱わない。保存・再読込・範囲解決から、本番描画と完成動画の物理QCまで合格した。

### 完成動画で確認した結果

- **全6状態・各161フレームでproduction QCが合格**。配置検査、字幕PNG、動画合成、媒体・音声検査を含む観測156プロセスが成功した。
- A通常版とD Normal固定は動画file byte・全161フレーム・代表PNGが同一。B部分FocusとF Resetも同一。
- A通常版の全161フレームはPhase 1通常版と一致（映像フレーム列SHA-256 `c5b8156eb4bda8f6c3950464c4a804553ae6e298e1c4fa8f3ec208e27e658481`）。
- 全6状態で配置、全字幕PNGのalpha、他2字幕のPNG、元動画と保存入力のhashが不変。
- 音声packetの内容SHA-256は全6状態と元素材で `aee02bc7b56dac072c8900d6df9ea811487bef024e8deda505e7933d0c6b5441`。AAC、48 kHz、stereo、5,366 ms。
- 完成動画の109番フレームで、PNG上の通常色からFocus色へ変わる不透明な文字内部に限って比較した。部分Focus11,305画素、範囲変更23,155画素、全文Focus34,460画素すべてに完成映像の変化があり、通常映像は通常色、Focus映像はFocus色への距離が厳密に小さかった。

色の距離は確認済み文字内部全画素のRGB二乗距離の単純合計を比較し、独自重み・許容閾値はない。PNGのalpha差と配置外色差は0。圧縮動画では予測圧縮による周辺の画素差も観測されるため、完成MP4の全差分が字幕内だけに収まるとは主張しない。完成映像の色の実在は代表1フレームと不透明文字内部の確認であり、文字範囲の厳密さは前節の実画像検査で別に確認した。字幕一件を外した反実仮想動画の再encodeは実施していない。

### 通常版／部分Focus版の比較

共通directory：`/private/tmp/zev-auto-effects-phase2-9n461w4w/short-e2e-v004/comparison/`

| 見本 | ファイル | SHA-256 |
| --- | --- | --- |
| 二本を並べた再生ページ | `local-comparison.html` | `7b4aadb1f48fc1a4d61b393d0c051119ffbce550985016369c560ab8a3e0a325` |
| 固定通常版 | `normal.mp4` | `44196ed3a72e65c28160da98a4edbf07df4dc0be31c8d3d55c1b111e7356246a` |
| 手配置部分Focus版 | `partial-focus.mp4` | `389c408fb4fd32898e3219888a280f0337a6f25bc17f72249e588ca12f7a1d6b` |

1920×1080、30 fps、約5.37秒。両動画と代表画像はproduction出力からbyteを変えずに複写し、ページの相対参照6件の実在を確認した。比較のための再encode・外部素材送信はない。同時再生・一時停止の操作を持ち、同時再生時は通常版のみ音声を流す。


比較は、見やすくなった箇所、邪魔になった箇所、変化が足りない箇所を人間が区間単位で判断するためのもの。技術検査の合格を動画表現の改善・正式採用へ読み替えない。

## 6. 作業保護と検証範囲

元treeは `43380006bc4f8e1c902c067dcb53669790b6ce2c`、tracked差分2,604 bytes・staged 0・未追跡59,153件。Phase 1 treeはbase `75b4fd38...`、tracked差分0・未追跡254件。両treeのstatus全文・tracked差分・staged差分・HEAD・branchの計10項目は開始時とbyte一致した。掃除・移動・削除は行っていない（`final-git-preservation-v001.json`）。

旧い不合格証拠と入力は保持し、新仕様の入力・描画・検査を新しい証拠directoryへ保存した。検査で遭遇したローカルIPC・Chromium起動のsandbox制約は、同じローカル操作の通常の環境承認で解消した。Nodeは既存20.19.6、React等は既存runner依存を検索先へ指定した。診断用に別の選択へ置換した後に本番部品の解除を検査していた設営は、置換前の本番撮影直後に測るよう修正し、初回失敗証拠を残した。本番出力やfixture期待値を不合格に合わせて緩和していない。

追加の外部AI・有料API・素材外部送信・費用支出は0。新依存、別renderer、追加描画stage、字形処理基盤、独自係数、pixel許容誤差は追加していない。main merge、tag、stable、releaseも行わない。

## 7. 変更ファイル

実装・検査15ファイル＋本報告1ファイル、計16ファイル。生成した動画・画像・素材・一時証拠はcommitへ含めない。

- `docs/reports/auto-effects-phase2-20260916.md`
- `evals/clip_composition/edit_auto_presentation_v001.mjs`
- `evals/clip_composition/edit_auto_presentation_v001.test.mjs`
- `evals/clip_composition/presentation_auto_effects_io_v001.mjs`
- `evals/clip_composition/presentation_auto_effects_partial_v001.test.mjs`
- `evals/clip_composition/presentation_auto_effects_renderer_v001.test.mjs`
- `evals/clip_composition/presentation_auto_effects_span_v001.test.mjs`
- `evals/clip_composition/presentation_auto_effects_v001.mjs`
- `evals/clip_composition/presentation_auto_effects_v001.test.mjs`
- `evals/clip_composition/presentation_renderer_entry_v001.tsx`
- `evals/clip_composition/presentation_renderer_text_layout_v001.mjs`
- `evals/clip_composition/render_presentation_v002.mjs`
- `packages/shared/src/auto-presentation.ts`
- `packages/shared/src/index.ts`
- `runner/src/remotion/components/TelopText.tsx`
- `runner/src/telop/telop-render-model.ts`

## 8. 主要証拠

共通prefix：`/private/tmp/zev-auto-effects-phase2-9n461w4w/`

| 証拠 | SHA-256 |
| --- | --- |
| `final-unit-tests-v001.tap` | `ae954683507d530917707d5a246a13ddede4f1b39b3e16b14544ce37bbab7ede` |
| `span-native-tests-v004.tap` | `a4a97a2333f2a7a104c15735eb919858f810bf13ab6b54709648d555b8a29278` |
| `span-native-raster-v004/summary.json` | `b419561a9633cc6541a9db79fdfd22292730610d82d49e63d99bbed5e04d737c` |
| `top-band-readiness-v001/summary.json` | `5c18b703dd56890276cb8a0c7f4025e6fe763e898bcd242131d85283864f9989` |
| `title-renderer-regression-v003.tap` | `b01c8e05acbfad33801018881129190f670af18546f8895e47a805476caf4aff` |
| `renderer-regression-native-v001.tap` | `4bbe2a60c41733b48358ea39e5d1f654968c0546c41f466d49b611fc419a7650` |
| `renderer-regression-native-investigation-v001.json` | `85f471351de1dbe5fe2b6567c59437c1cc324f2e5e05467cd1f259abc95a7f4d` |
| `cli-demonstration-v002/summary.json` | `bc0a8f62b9f037fa3d3fbde00aa5282ae127d7c1dc1c76f5c62edb255e787484` |
| `final-git-preservation-v001.json` | `9d9e72ce80ff3c49222f4dbc7baf37bea0d61de754c0daba80474746d26e1404` |
| `short-e2e-v004/summary.json` | `bc00d2434032f977b782ec98eeea719aa928d222f22584e19bbf18d3e78681c9` |
| `phase2-e2e-v004-final-integrity.json` | `8ceadfd2414622c1211cb7dc68bfd3c108b3f45b1d67f7628a0b0802cc1b03ec` |
| `short-e2e-v004/comparison/local-comparison-record.json` | `7e8178cd70f6c5d0d904689fda319af1e5a04780c4041d776d1c8e734c278f78` |

型検査3系統の記録は `final-shared-typecheck-v001.log`、`final-remotion-typecheck-v001.log`、`final-entry-typecheck-v001.log`（いずれも終了0・出力空）。実行には既存のTypeScript compilerを使った。

### 主な再現コマンド

専用worktreeを作業directoryとし、Node20.19.6をPATH先頭、既存runner依存をNODE_PATH、TSX_DISABLE_CACHE=1に指定する。

```sh
node --import ./runner/node_modules/tsx/dist/loader.mjs --test evals/clip_composition/presentation_auto_effects_v001.test.mjs evals/clip_composition/presentation_auto_effects_io_v001.test.mjs evals/clip_composition/presentation_auto_effects_renderer_v001.test.mjs evals/clip_composition/presentation_auto_effects_partial_v001.test.mjs evals/clip_composition/edit_auto_presentation_v001.test.mjs
node --test evals/clip_composition/presentation_auto_effects_span_v001.test.mjs
node --import ./runner/node_modules/tsx/dist/loader.mjs --test evals/clip_composition/presentation_output_title_compositor_v001.test.mjs
node --test --test-name-pattern='^(0[1-9]|1[013]) ' evals/clip_composition/presentation_renderer_v002.test.mjs
```

## 9. 監査履歴と今回の提出

初期の分割span方式は字形・alphaを変え、局所mask/filter候補は英字の範囲外漏れ等が残ったため不採用。native Selection直接着色も当時の「カラー絵文字を再着色」条件では不合格で停止した。その証拠は[停止checkpointの報告](https://github.com/f-kw/zev2/blob/5f240ce737821b5930170ce287100aa34fb76120/docs/reports/auto-effects-phase2-20260916.md)に保持している。今回の最新HUMAN_DECISIONだけがカラー字形の条件を置換し、再開根拠となった。

技術実装と比較見本を監査checkpointとしてcommit/pushし、同じ[ZEV進行管理4の会話](https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4/c/6aa7f7e5-03d8-83ee-aae1-6c4b66fb8303)へ最終監査を依頼した。モデルの新条件は指定されていないため現在のUI選択（極高）を維持した。素材の外部送信を行わず、技術証拠、比較見本のローカルpath/hashを提示した。受領した監査応答は次節に記録する。人間の表現評価と正式採用は未確定。

## 10. 最終監査の回答

2026-09-16、同じZEV進行管理4の会話へcheckpoint `537567d57744e1115a3938e651ad8f86c1c12161`、baseからのdiff、最新HUMAN_DECISION、検証結果、比較動画path/hashを送信した。回答の生成完了を確認し、**「Phase 2の技術実装＋比較見本の第一完成として受理してよい。範囲内で必須の修正は見つからない」**との最終監査結果を受領した。

監査は、最新のカラー字形仕様、選択を適用する順序と所有・解除、範囲・保存・Reset、厳密な14 fixture、6状態の本番検証、旧台帳の診断増加の調査を確認した。旧台帳3件は今回の技術完成を止める理由にはしない一方、正式なrenderer版の昇格時には台帳・版の更新とその承認を別途要する、との指摘を受領した。今回その作業は開始していない。

監査側からローカルMP4は直接再生できないため、動画の良し悪しは判定せず、実装・検査コード・報告されたE2E記録・成果物hashまでの監査である。技術実装、比較見本、部分Focus後修正導線、最新仕様への適合は完了。人間の表現評価、正式デザイン採用、台帳更新・stable/releaseは未実施・未決定のままとする。

使用した会話URLは変更していない（現在の画面表示名は「ZEV夜間報告」）。新しいモデル条件はなく、UIの極高を維持。最終監査依頼1回、再送・更新・再生成0回、次の指示書の依頼0回。状態は**レスポンス確認済み**。この監査結果の追記後に実装・検査・動画は変更していない。
