# renderer trust v003 再発行前監査 — 旧承認Normalとの18px配置差を検出

## 結論と判断依頼

**事前監査の実施を完了した。正式再発行の条件は未達であり、v003を正式pathへ発行していない。** 候補は版名2項目と実行依存4件のSHAだけを変え、現行通常jobの保存・復読・純粋受入検査11項目を通った。一方、指定された旧承認Normalとの物理比較は2例とも不一致だった。文字部分のRGBAは完全一致するが、現行productionでは字幕全体が18px上に配置される。

この18px差を生む配置計算は、Color Accent追加前の正式v002が束縛していた描画入口にもすでにある。今回の候補作成で数値や式を変更した結果ではない。ただし、それを理由に旧承認画像との同一性を合格へ読み替えない。

**GPT_DECISION:** 旧previewの生成時来歴を保持する解釈と、この既存の配置差に対して正式発行前に必要な是正・追加証明・人間再認定の範囲を判断してほしい。推奨は、現行配置・承認履歴・期待画像を変更せず、差を明記したまま正式発行を保留すること。旧previewに合わせる18px補正や新しい係数、比較対象の自主的な置換は行わない。正式v003の発行・契約改訂・人間目視の承認が必要なら、その第1層事項を明確にした次指示を求める。

## 1. 対象と作業範囲

- 起点commit: `43a9382bdac0dd2881777f2cd442c21158173da9`。branch: `codex/renderer-trust-v003-preflight`。
- 相談役の次指示は「正式renderer trust v003の再発行preflight」。信頼文書の正本を固定したうえで、現依存・書体・preset・配置規則・tool・承認previewを再読し、候補差分・来歴・通常表現・受入検査を監査する工程である。正式発行直前にGPT_DECISIONへ戻る。
- 本checkpointで正本へ残す変更は本報告書だけ。描画実装、正式trust、契約、Goal、work-order、DECISIONSは変更していない。新依存の取得、API通信、素材送信、費用支出、main merge、tag、stable、releaseは0件。
- 一時領域: `/private/tmp/zev-trust-v003-preflight-gdvc9vm6`。既存依存と既存Digest媒体をAPFS cloneして隔離し、インストール・新素材取得は行っていない。
- 前工程の一件後修正E2Eは今回限定developer fixtureとして相談役の技術第一完成を受理済み。本工程がその限定許可を通常productionの正式許可へ拡張することはない。

## 2. 正式v002の固定と候補全差分

正式v002は5,397 bytes、SHA-256 `6e21352ff105e3b77acc351625fed22ff97486fb21d0ce9ee5b1821750a9047a`。候補v003は同じ5,397 bytes、SHA-256 `7d152daf7cbd4183f25fad94ed825e4e5d69cfe1a757b20e4d5931036635f578`。候補は隔離worktree内の一時outputにのみ保存し、正式registry pathには作っていない。sidecarに事前監査専用・正式昇格ではない・人間承認ではない・一般production許可ではないことを記録した。

JSON全体のexact diffは次の6値だけ。追加・削除field、依存path・順序、preview・書体・preset・配置規則・tool値の変更はない。

| 変更位置（exact JSON pointer） | 正式v002 | 一時候補v003 |
| --- | --- | --- |
| `/schemaVersion` | `presentation-renderer-trust-v002` | `presentation-renderer-trust-v003` |
| `/trustVersion` | `presentation-renderer-trust-v002` | `presentation-renderer-trust-v003` |
| `/rendererDependencies/0/fileSha256` | `5047dc3bcd51e8623cd090a443955828d38986db8338f53f2c9030e07cc952b7` | `ae053ad3ae1b602669a0bc22b6c0ecd05c720d1e83f70441d528bfc0fb2bd1f0` |
| `/rendererDependencies/1/fileSha256` | `8c62f3bbc63a3f5292b4a079f9bfda21128514b19305976bcb29de5d1051aea0` | `ad5a822a71c1a967951952bb0dc7ceae4374682ae049768d66beb779dfb91385` |
| `/rendererDependencies/2/fileSha256` | `9e941db470dd2586485134f093679bda947e722c4d000d25b0e7fb6ec5daf001` | `05dba9a74152232702f22514660d17e79e20f6767cf791390bd91dcc78f66ad7` |
| `/rendererDependencies/4/fileSha256` | `5c32103a6f8faaa3ea1d30bb4624f0ca092385c8b77446aa5f51e3e3a0583412` | `d4b2604699de7df6675be8da46531cf0e417ae21b5d76f1f994cad252f59212a` |

候補は [正式v002](../../evals/clip_composition/registries/presentation/presentation-renderer-trust-v002/trust.json) に上記6値を適用したものに限る。正式版の発行を意味しない。正本を6値だけ変えれば今回の全受入条件が満たされる、という結論でもない。

## 3. 現物照合と実装の由来

8依存すべてについて現在の全bytesを読み、監査済みPhase 2 checkpoint `537567d57744e1115a3938e651ad8f86c1c12161` のGit保存bytesと直接一致した。同checkpointは現在HEADの祖先であり、その後HEADまでの8pathの変更履歴は空だった。各pathの履歴18記録とSHAを保存した。

| 実行依存path | 現在のSHA-256 | 正式v002との関係 |
| --- | --- | --- |
| `evals/clip_composition/presentation_renderer_entry_v001.tsx` | `ae053ad3ae1b602669a0bc22b6c0ecd05c720d1e83f70441d528bfc0fb2bd1f0` | Phase 2由来の更新候補 |
| `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` | `ad5a822a71c1a967951952bb0dc7ceae4374682ae049768d66beb779dfb91385` | Phase 2由来の更新候補 |
| `runner/src/remotion/components/TelopText.tsx` | `05dba9a74152232702f22514660d17e79e20f6767cf791390bd91dcc78f66ad7` | Phase 2由来の更新候補 |
| `runner/src/remotion/utils/telop-font.ts` | `fa2cb9c4c767e43006d77fa1aa8a0b6f1757b4059551ffc413d5c7fdf5cd441c` | 一致 |
| `runner/src/telop/telop-render-model.ts` | `d4b2604699de7df6675be8da46531cf0e417ae21b5d76f1f994cad252f59212a` | Phase 2由来の更新候補 |
| `runner/src/telop/telop-line-break.ts` | `3f136f17e6a1bf860aec4aa82b59de1c6f078499f860bf2d65fef82eaf66ff2d` | 一致 |
| `runner/src/telop/text-metrics.ts` | `6fe78a6b478d61a169ec724e6c9336fdfcbf00cfa7ddee7cbbb5fbc19d87478a` | 一致 |
| `runner/src/shared/telop-glow.ts` | `bfad6788f7ccfdc721839a53b4552f18bb713ac1a26c3d2469096697d33b79f8` | 一致 |

変更4件の由来は次のとおり。

- 描画入口: `05785a4ef1e1ec8392064e04537a0f3da588eb83` で一字幕内の選択範囲を受ける処理を追加し、`537567d…` で単一の文字形を保ったブラウザnative選択と描画完了待ちへ変更。
- 文字配置処理: `05785a4…` で元の文字順・改行を保持しつつ色を当てる範囲と書記素境界を検査する処理を追加。
- 文字描画部品: 上記2checkpointで一字幕内のforeground選択へ接続。通常文字の形を分割せず、native color glyphは元のRGBAを保つ。
- 文字描画モデル: `05785a4…` で行ごとの色範囲情報の型を追加。

Phase 2の最終監査は [既存報告](auto-effects-phase2-20260916.md) に記録される。初期checkpoint `05785a4…` 単体の不合格を完成扱いせず、修正後の `537567d…` と現在の一致を確認した。実装差分を全読し、Normalの配置・文字サイズ・安全余白の計算をPhase 2で変えた差分はない。

書体2件は実全bytesのSHAが正式台帳と一致。preset registryは実SHA `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8`、registry bindingは `b26db5c57aac5dd290e084d953350778b527c6eb21f66f62dc7431bf24482fff` で正式参照と一致。候補の配置規則の全数値・式、通常presetを含むregistry全体、書体一覧、tool一覧は正式v002と完全一致した。終了時に38の保全対象を再hashし、サイズ・SHAの変化0件を確認した。元checkoutの正式trustも同SHAで保存されている。

実環境の取得結果: Node `v20.19.6`、Remotion `4.0.481`、Chromium `149.0.7790.0`、FFmpeg/FFprobe `8.0.1`。宣言値との5項目照合は全一致。実version commandのstdout/stderrを保存した。

## 4. 承認previewの来歴を保持する根拠と限界

[初期設計108–109行](../../evals/clip_composition/reports/presentation/presentation-renderer-implementation-design-20260720-v001.md#L108)は、承認previewが記録した描画部品hashと、正式描画処理が実際に読む部品hashを別々の記録として定義する。[8月17日追補](../../evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260817-v001.md)も、preview・layout・tool・font・presetを継承し、実行依存SHAを現物へ更新する方針だった。

実際のv001→v002は版名2値と実行依存2 SHAだけが変わり、preview部分は全体一致。ただし更新された2pathはpreviewの部品一覧と重ならないため、今回の「同じpathに生成時と現在実行時の異なるSHAが並ぶ」直接の先例ではない。今回、文字描画部品と文字モデルの2pathがこの状態になる。

承認manifestは実35,348 bytes、SHA `75d4cb0cc95d7780b27b6007933845bb1daffccf28cb254f762bd4fa55825d7f` で、人間承認時の固定値と一致。生成時部品6件の記録はtrustとmanifestで全件一致する。現在checkoutではその6path中4件の実SHAが異なるが、生成時来歴を現在のSHAへ更新すると、承認済みmanifestとの整合を壊す。そのため候補では旧来歴を全保持する案を推奨する。

validatorの経路は区別する。現行通常job入口はjobが固定した信頼文書の実bytesを読み、実行依存8件と書体2件を照合する。承認previewの生成時部品を現checkoutへ直接照合する経路ではない。一方、旧固定trust v001のloaderはpreview由来6部品を現checkoutへ照合し、旧B1契約も固定v001の変更に新preview・人間再認定・契約改訂を求めている。現行通常入口の候補合格を旧checkerや旧B1の合格へ広げていない。

旧previewに記録された透明PNG11件、代表frame10件、MP4 1件の計22媒体は全実bytesを再hashしmanifestと一致した。大元の長時間素材全体の再解析・新しい意味判断は行っていない。

## 5. 旧承認Normalの再描画 — 物理同一性は不合格

[承認済みmanifest](../../evals/clip_composition/outputs/presentation/initial-preset-registry-candidate-20260720-v002/preview-manifest.json) の通常発話sceneから次の2入力を使用した。

1. 「やばい、マリリン！」（1行）。
2. 「マジでさ、食材なくなったけど」改行「全ての食材を船長が握ってるからね」（2行）。

既存registryの1920×1080 canvas、通常96px、同書体・文字色・縁・glow・150%行間・下中央・縦−6%をそのまま渡した。元本文・改行と旧の行数記録を照合し、現行の本番overlay adapterから本番描画入口へ渡した。独自係数・位置補正・値調整は0件。候補の配置規則と通常presetから得た描画属性も保存している。通常job全工程を起動した結果とは区別する。

PNGファイル全bytesは2件とも不一致。さらにFFmpegで1920×1080のRGBAへ復号し、全画素を許容差なしで比較した。縮小・色変換の閾値・類似度は使用していない。

| 例 | 旧alpha bounds（左,上,右,下） | 現行alpha bounds | 異なる画素数 | 観測差 | alpha bounds内のRGBA |
| --- | --- | --- | ---: | --- | --- |
| caption-short | (511, 860, 1376, 993) | (511, 842, 1376, 975) | 76,969 | 上へ18px | 全bytes一致 |
| caption-two-lines | (172, 716, 1733, 993) | (172, 698, 1733, 975) | 299,599 | 上へ18px | 全bytes一致 |

文字部分の形・色・サイズが完全一致しても、frame内の位置が異なるため、要求された旧承認Normalとの物理同一性は未達である。

原因の読取結果: 旧preview生成は安全域40pxを描画後の合否検査に使い、描画propsへ渡していなかった。旧描画モデルは画面高さに対する2%から下余白22pxを作る。現行通常productionはその22pxとregistryの安全域40pxの大きい方を位置計算に使用する。下中央のこの2例では文字外枠と−6%のoffsetが同じなので、配置基準の差40−22=18pxがそのまま表れる。

正式v002の描画入口の実bytesをGit `4e5be43c1e150425443d079a40bc151abdb4670a` から読取り専用で保存した。24,817 bytes、SHA `5047dc3bcd51e8623cd090a443955828d38986db8338f53f2c9030e07cc952b7` は正式v002の固定SHAと一致する。旧349行からの余白・位置・offset・clampの計算1,848 bytesは、現行357行からの同blockと完全一致（SHA `f75e25403caf948f59de557cf493857b08f26cce916770d44cbe5984958df5bc`）。したがって40pxを使う式はPhase 2前から存在する。

留保: この工程で旧entryそのものの再実行はしていない。旧式と現式の一致を、当時のproduction完成画像全体の物理一致を実測した証拠とは扱わない。また、2例の検証から全通常字幕・全presetの同一性へ一般化しない。

## 6. 候補の受入検査と回帰テスト

現行の保存形式・decoder・純粋受入処理を、実Digest jobと実参照ファイルで検証した。正式v002と候補v003の2ケースを同じjobで比較し、信頼文書と書体台帳の参照だけを切り替えた。

- jobを実serializerで保存し、実decoderで復読。書体2、実行依存8、実装12、tool6、契約5を実bytesに束縛し、合計52入力参照を前後で再確認した。
- 既存base MP4は実78,398,378 bytes、SHA `8c36b25a30e8acf5ac97475646092adeca5336d1c9a447dc9f2ffd0f7fd5ce2d`。実FFprobeのraw stdoutから1920×1080、30fps、4,831frame、音声stream1を導出した。job記述値や手入力値で観測を代用していない。
- 正式v002の対照: 既知4依存SHA不一致により受入拒否。版名v002であることだけが拒否理由ではない。
- 候補v003: 指示・cue終端・行終端・base・canvas・preset・素材台帳・書体・trust・実装・実行入力の11検査すべて合格。入力変更なし。
- この結果は保存／復読／純粋受入の成立に限定する。通常file入口からの動画生成、生成後QC、人間承認、正式発行の合格を意味しない。旧Normal物理比較の不合格があるため、候補での全Digest製造は開始していない。

既存テスト3ファイルを実行し、**143件合格・不合格0・skip0**。行配置4件、部分選択と状態復元、文字範囲の割当、現行productionの実画素検査を含む。現行Normal／Color Accent／Scale AccentとNormal固定・Resetの回帰を確認する範囲であり、旧7月20日previewとの同一性をこのテスト結果で置き換えない。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test \
  evals/clip_composition/presentation_renderer_line_layout_rule_v002.test.mjs \
  evals/clip_composition/presentation_auto_effects_partial_v001.test.mjs \
  evals/clip_composition/presentation_auto_effects_span_v001.test.mjs
```

環境記録: 最初のNormal描画はサンドボックスがChromiumのMach portを拒否しexit1、最初のテストはローカルportのbind拒否で142合格・1失敗になった。それぞれ元ログを保持し、同じ入力・同じ実装を許可された環境で再実行した。Normal描画子process2件と最終テストはexit0。元失敗を製品の不具合や検査合格として扱わない。Python標準環境に画像ライブラリがなかったため、追加インストールせず既存FFmpegのRGBA復号で比較した。production修正0件、信頼値や期待画像の修正0件。

## 7. 演出の採用区分と残る承認

- Color Accent: 既存の人間採用を維持。部分色範囲は技術検証済みの実装由来であり、今回のtrust候補だけで新しい意味・表現の人間承認を追加しない。
- Scale Accent: 既存の人間採用を維持。
- Panel Accent / Pulse Accent: 技術成立・試作の区分を維持し、人間採用済みとは扱わない。
- 旧Normal previewが後から追加された全演出を承認したことにはならない。
- 残る判断: 旧承認と現在の18px配置差の扱い、必要なら新previewと人間再認定、正式v003の発行と関連契約の改訂範囲。今回のpreflightはそれらの着工・正式発行・人間承認を与えない。transition等の次機能も未着手。

## 8. 要件ごとの結果

| 相談役の要求 | 結果 |
| --- | --- |
| 正式v002固定・全参照再読 | 完了。元treeを含め固定bytes不変。8依存、2書体、registry、規則、tool、preview実体を確認 |
| 候補最小差分の全列挙 | 完了。6値だけ。その他値不変 |
| 旧preview来歴の契約・validator・過去運用調査 | 完了。来歴保持案と旧経路への適用限界を提示。正式解釈判断待ち |
| 規則・数値・式・書体・通常preset不変 | 候補文書と実物の比較は合格。これだけで旧描画位置の一致を意味しない |
| 現行Normalと旧承認Normalの物理同一性 | **不合格。2例とも18px上移動。文字部分のみ完全一致** |
| Phase 2以降の実装由来 | 完了。8依存全bytesが監査済みcheckpointと一致、以降変更0 |
| 候補を一時領域だけへ保存 | 完了。正式registryへ未発行 |
| 通常job候補検査 | 実保存・復読・純粋受入11項目合格。全job製造は未実行 |
| 全差分・採用区分・検査・残る承認の報告 | 本報告。checkpoint push後、同じ相談役へ送信する |
| 正式発行直前でGPT_DECISIONへ戻る | 正式発行を保留し、本報告で判断依頼 |

## 9. 証拠参照

以下は一時領域の現物を再hashした参照。生成画像・媒体・候補JSON・副線証拠はGitへ追加しない。GitHub上の本報告はローカル証拠を直接読み直せたことまで保証しない。

| 内容 | ローカル現物 | bytes | SHA-256 |
| --- | --- | ---: | --- |
| 次指示 | [consultant-direction-v001.md](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/consultant-direction-v001.md) | 2,141 | `66147b4c6afd068cd798ab72d7b6558f50a0571f70ec97826e49f11958ec6dbb` |
| 初期全現物棚卸し | [trust-current-input-inventory-v001.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/trust-current-input-inventory-v001.json) | 47,552 | `3015628c94e3dee0f9b4e146ebf56a0856a1ddc8ac6219c66fb274183d0c149a` |
| 全差分 | [candidate-exact-json-diff-v001.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/candidate-exact-json-diff-v001.json) | 1,178 | `c783b890bdda48b3c4b3d30bc85ce97ccdded39941d0c574fae17090103b0fe8` |
| 一時候補 | [worktree/evals/clip_composition/outputs/presentation/renderer-trust-v003-preflight-20260917/inputs/renderer-trust-v003-candidate.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/worktree/evals/clip_composition/outputs/presentation/renderer-trust-v003-preflight-20260917/inputs/renderer-trust-v003-candidate.json) | 5,397 | `7d152daf7cbd4183f25fad94ed825e4e5d69cfe1a757b20e4d5931036635f578` |
| 候補sidecar | [worktree/evals/clip_composition/outputs/presentation/renderer-trust-v003-preflight-20260917/inputs/renderer-trust-v003-candidate.sidecar.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/worktree/evals/clip_composition/outputs/presentation/renderer-trust-v003-preflight-20260917/inputs/renderer-trust-v003-candidate.sidecar.json) | 2,849 | `51df20474139381af03c068b3197d7c1208e457e6271c9eb519c5f5715e6c0b7` |
| 8依存の履歴 | [renderer-dependency-history-v001.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/renderer-dependency-history-v001.json) | 9,763 | `48d2882db8e1b23c2de7f2f20f5177642491b9c909e96971ada5cddbb5fa9702` |
| Phase 2実装差分 | [four-dependencies-phase2-implementation-diff-v001.patch](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/four-dependencies-phase2-implementation-diff-v001.patch) | 18,721 | `650acb1045433fb7c261d8efe0d9e271d63454a75cb459d44425a184d45a8ed1` |
| preview来歴監査 | [preview-provenance-audit-v001.md](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/preview-provenance-audit-v001.md) | 17,599 | `d4bbfb38d2ef3ea59cabee4ce9db99f460014a4a5c18bad4546ed4170c684e8c` |
| 旧正式v002実装 | [formal-v002-bound-entry-v001.tsx](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/formal-v002-bound-entry-v001.tsx) | 24,817 | `5047dc3bcd51e8623cd090a443955828d38986db8338f53f2c9030e07cc952b7` |
| tool実測 | [tool-version-comparison-v001.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/tool-version-comparison-v001.json) | 3,876 | `5abb57b959dbb5e1078f30438a40a1fd936ee3ad7ad6c4563528b9caf5a28fad` |
| Normal再描画 | [approved-normal-current-v002/result.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/approved-normal-current-v002/result.json) | 15,781 | `3ff1b6a9bbf1376d0ada1e999394d443c8059d4f565f7b00409b2069664399e1` |
| Normal全RGBA比較 | [approved-normal-current-v002/rgba-comparison-v001.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/approved-normal-current-v002/rgba-comparison-v001.json) | 4,434 | `6938eeb75ecbc7c312d26825dba092a1e04165edc8048cf485bcfd300bf3ff79` |
| 純粋受入 | [pure-admission-v001/summary.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/pure-admission-v001/summary.json) | 68,333 | `bda26a70bb0bb37b2fbd66d1c793970ab7573b84f7c07b517893f94f961c5c1f` |
| base実probe記録 | [base-media-admission-observation-v001.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/base-media-admission-observation-v001.json) | 1,713 | `35c75d5b12849318ac82c7328b6d911c8d47a5124124aa2798db540b2e107fcf` |
| 最終143件テスト | [targeted-tests-stdout-v002.txt](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/targeted-tests-stdout-v002.txt) | 20,796 | `f7790f37e901b4763875af3d11413c13960e2347594ce208f4c0484f9c963334` |
| 最終テスト実行記録 | [targeted-tests-result-v002.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/targeted-tests-result-v002.json) | 695 | `0c9198643c208f725080a01801e61c80dfa1195d1c9904537ab0f840300830c3` |
| 38保全対象の再検査 | [protected-files-final-v001.json](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/protected-files-final-v001.json) | 40,946 | `8548d50bbcb9cb92c52657bec8430159a74e2002ac6e076669b2f416b4dc88ab` |
| 現在Normal PNG caption-short | [approved-normal-current-v002/caption-short.png](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/approved-normal-current-v002/caption-short.png) | 103,522 | `b2464221168589bce0330685567e6dd402c5f4ba198fcfbf4dadbeb2e7cf66c6` |
| 現在Normal PNG caption-two-lines | [approved-normal-current-v002/caption-two-lines.png](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/approved-normal-current-v002/caption-two-lines.png) | 252,932 | `3be0606e57de145a871d967bed372193cd298056e83759b774d8f6ca91e014bd` |
| 配置差の独立診断 | [normal-placement-diagnosis-v001.md](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/normal-placement-diagnosis-v001.md) | 9,645 | `1fb842949ac39fca0d5f95cfac1829798124770385d0fbbbdea46d749d691629` |
| Normal再描画の実行script | [render-approved-normal-current-v002.mjs](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/render-approved-normal-current-v002.mjs) | 5,843 | `dc0cfd6d793f146eed73b3bd209e4f9c0392c44b4f8de421008a2e0384f3c2d5` |
| RGBA比較の実行script | [compare-normal-rgba-v001.py](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/compare-normal-rgba-v001.py) | 1,931 | `64e6240b7a3874eb919fc73d09fc31835380f6b834b38bc7d491843902232576` |
| 純粋受入の実行script | [trust-v003-pure-admission-v001.mjs](/private/tmp/zev-trust-v003-preflight-gdvc9vm6/trust-v003-pure-admission-v001.mjs) | 24,637 | `2fce7feb0e263262f3569b84acc8fae66735cd93078499b1685838bbcca3a8e5` |
