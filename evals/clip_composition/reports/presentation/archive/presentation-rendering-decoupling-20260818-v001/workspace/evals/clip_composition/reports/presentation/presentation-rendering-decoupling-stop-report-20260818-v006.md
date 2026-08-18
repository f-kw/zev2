# ④.5 レンダリング疎結合化 統合停止報告 v006

今どこ: 追補v003の実装と外部process観測を完了し、title横型はoverlay起動まで到達した。

次に何が起きるか: 設営修正枠を補充できれば、旧title起動検査用browserと新renderer実描画用browserを役割どおり分けて新attemptを発行する。

kawafmmの判断が要るか: 要る。検査設営修正枠が8/8へ到達したため、1件以上の補充なしには続行できない。

## CURRENT_GOAL 4項

1. 今の目的: 動画出力を別プログラムへ分けて疎結合にする。これにより同時に開発を進められ、中間生成物をレビューでき、修正の影響が小さくなって検証しやすくなり、クオリティを上げやすくなる。
2. 主計画上の現在位置: ④字幕品質v002は完了（`stable/caption-quality-v002-20260816`）。④.5 レンダリング疎結合化（演出指示書境界の実装）の着手前。これが済むと⑤美しいレンダリング・⑥遠方接続・⑦骨格清書が並列化できる。
3. 今の作業とそれが目的へどう繋がるか: 契約設計v001に基づく実装工事。注文書・受領書・出力側行分割・新renderer runnerを作り、字幕横型1本とタイトル2本で「注文書を人間がレビューできる状態」を実証する。これが目的の中間生成物レビューをそのまま実現する。正本path上限25件（2026-08-18 kawafmm確定）。
4. 今回やらないこと: 字幕縦型 / G4〜G7 / renderer表現力の拡張 / 旧プログラムの物理削除（骨格清書で行う） / A-v002の目視合格・tag（注文書レビュー可能化の後に別途） / commit・tag・公開 / API通信・費用支出。

## 1. 停止結論

追補v003で、renderer jobと受領書が一致させたRemotion・Chromiumを共通描画処理へ明示入力し、全外部processの終了code・stderr全文・signalを出力読取前に独立保存する経路を実装した。

title横型の正式attemptを4回発行し、最後のattempt-0009で原因を次へ一意に確定した。

- 旧title runnerの起動検査は、従来のheadless-shell pathだけを正式値として要求する。
- 新rendererの実描画は、frameworkを同梱したsystem Chromeを必要とする。
- job製造処理が両者を同じbrowser値として更新したため、実描画へ入る前の旧起動検査が拒否した。

修正は、旧title jobの起動検査用browserを従来値へ戻し、新renderer jobのChromiumだけをsystem Chromeのまま維持する一件で閉じる。契約・描画処理・正式成果物の変更は不要である。

ただし、直前までに検査設営修正を5/8から8/8まで使用した。この修正を行うと9件目になるため、裁定済み停止条件「枠を使い切る」に該当する。修正・新attempt・別工程の先行実行を行わず停止した。

## 2. 正式会計

停止報告v004を正本とする前回会計を上書きせず、今回分を加えた。

| 会計 | 前回確定 | 今回使用 | 現在 |
|---|---:|---:|---:|
| 追補 | 3/5 | 0 | 3/5 |
| 停止 | 5/12 | 1 | 6/12 |
| 検査設営修正 | 5/8 | 3 | 8/8 |
| 限定実装修正 | 3/6 | 0 | 3/6 |
| API probe | 0 | 0 | 0 |
| 費用 | US$0 | US$0 | US$0 |

attempt-0006〜0008の原因確定可能な失敗は、裁定どおり個別停止にせず枠内で修正・続行した。attempt-0009で次の修正に必要な枠がなくなった時点だけを今回の停止1件として数える。

## 3. 追補v003の実装到達点

### 3.1 契約追補

- 追補v003 SHA-256: `cd4bfb75f8dfe0aec325ee8ae79cb136908ea7fa7e5fd2e610a430bfb4d1b16d`
- 共通描画処理は、Remotion・Chromium・process観測入口を明示入力として受ける。
- 新rendererはjobと受領書の一致値だけから描画入口を作る。
- 旧経路の既存定数と既存入口は削除していない。
- 外部processごとに終了code・stderr全文・signalを別fileへ保存し終えた後だけ、生成物を読む。

### 3.2 正本path会計

現在は22/25件である。

| 番号 | path | 増加理由 |
|---:|---|---|
| 19 | `evals/clip_composition/render_presentation_v002.mjs` | 既存のoverlay製造・描画を複製せず、明示実行体と観測入口を追加するため |
| 20 | `evals/clip_composition/presentation_renderer_qc_v002.mjs` | QC内部のImageMagick・FFprobe・FFmpegも同じ観測経路へ接続するため |
| 21 | `evals/clip_composition/presentation_renderer_process_observation_v001.mjs` | 終了証拠の保存処理を描画とQCで複製しないため |
| 22 | `evals/clip_composition/presentation_output_title_compositor_v001.mjs` | title runnerが新しい共用観測実装を読む事実をstrict implementation bindingへ追加するため |

23件目以降は使用していない。25件には到達していない。

### 3.3 実装fileの現SHA

| 処理 | SHA-256 |
|---|---|
| 共通描画core | `666907c3ff9f045b2141d62a41eb9b746cdad1f5102fe4500e5cb8036c77ce59` |
| renderer QC | `b20992c6756f4c5e460af79a7b7d5872f7b6f4a23b41700023c7bd51b14c4837` |
| process観測 | `957952952fc736f21d7de59aedd8add53d9f12e211ed3db9f3d65e38f24bf030` |
| 新renderer runner | `6e1884a118d113b5b50792355dff3b327e491ed99279a6ee1aa6205bba80e61b` |
| title runner | `ca709c687026fb0d3adfe748c6cc657ea1d8b0c73a4815597ce26b76d51d64e0` |
| title compositor binding | `0277248a8a0e56fffd237e902713d8a811be98cbb4abfb35d9bdc8b97da1d713` |

### 3.4 検査

- PRP・PRI・PRL・PRAのローカル事前検査: 36/36。
- process観測と明示overlay adapterのローカル事前検査: 5/5。

いずれも今回の正式TAPとして版付き保存していないため、44 IDの正式合格へは計上しない。PRM 8件も未実行であり、44/44とは主張しない。

## 4. title横型attempt履歴

### 4.1 attempt-0006

- job SHA-256: `25ab4cfc8b2c84e84a791b21d3ed9e7c9977b1cacde716c3401f2912595a1e4c`
- 結果: 起動前に`NODE_OPTIONS`存在拒否。
- 原因: 空文字を設定した状態を「不存在」と誤認した起動commandの設営欠陥。
- 修正: 環境変数を明示的に除去して起動する形へ変更。
- 会計: 検査設営修正6/8。
- stdout SHA-256: `1d3d3107e211c7f3c0d9898b1ab634ae0d7e0f4a0c90db2782fef2b4253371c9`

### 4.2 attempt-0007

- job SHA-256: `bbcb5edac8ec8b5d27277686b781a03e2111d1a8a05dce50cb07dcdfded145db`
- 結果: source media再読後、注文書保存前にfatal。
- 原因: 新しいcontrol成果物の親directoryを設営していなかった。
- 修正: 未使用control rootの親directoryを正式attempt前に明示作成。
- 会計: 検査設営修正7/8。
- stdout SHA-256: `51bd02975a93e73b9ea6993c11cd20e2a63305ce93be15d7ee4afb6cd3a6c3c9`

### 4.3 attempt-0008

- job SHA-256: `e2695a2f237c9eec873aacd28e4197b5c69201c729e8f215b80686cfdc0e943e`
- 結果: 注文書・renderer job・受領書・line layoutを正式保存後、最初のoverlay生成で外部processが非0終了。
- 原因: jobが選んだheadless-shell実体の隣に必要なChrome Frameworkが存在せず、browserがSIGABRTで終了した。
- 修正: 実体SHAが登録値と一致し、frameworkを同梱するsystem Chromeを新renderer jobのChromiumへ使用。
- 会計: 検査設営修正8/8。
- stdout SHA-256: `f2f04743115e5180ae90c1d7d8a91680aad9f049cb5e11de8ed8cd0611d080ee`

正式保存済みcontrol成果物:

| 成果物 | SHA-256 |
|---|---|
| 注文書 | `a2ccab802870ddb15ba86f3c28c7948b75304ed43020427eb75f7fed8211138d` |
| renderer job | `77ae5206e03f8b8e227871279eebf37f1775f396b2116ecf07507d3fd3989a7e` |
| 受領書 | `d76bb74decb03cdf697bf8076c318c6c6913c78aabfe8fd6b4b5f0dbc97ff31e` |
| line layout | `13505b3833b8fcefba61e256750732ecd207835e6ae8fa1edf8b1d1ddbe8ecd0` |

overlay観測:

| 観測 | SHA-256 |
|---|---|
| exit-code | `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865` |
| stderr | `17f19aade677b16356a58fe875f44c62e8e26bc67fc81b43541d68154b7be947` |
| signal | `fcf33dfbe13c2354bf0e1b063f9fb422747a46cee00b7420bceff2b81457b345` |

stderrには、欠落したFrameworkの絶対pathとbrowserのSIGABRTが保存されている。attempt-0005で不足していた原因観測は、本追補で成立した。

### 4.4 attempt-0009

- job SHA-256: `071d12b41843bc358e69c15e57937ee46231747c9d15f28edca79028d71d10c0`
- 結果: source media観測より前の旧title runner起動検査でfatal。
- 原因: job製造処理が、新renderer job用Chromiumだけでなく、旧title runner自身の起動検査用browserまでsystem Chromeへ置換した。旧title runnerは従来のheadless-shell pathとのexact一致を要求するため拒否した。
- stdout SHA-256: `51bd02975a93e73b9ea6993c11cd20e2a63305ce93be15d7ee4afb6cd3a6c3c9`
- 同attempt修正: 0件。

## 5. 三分法

- 契約: 欠陥なし。旧title起動検査と新renderer実描画は異なる役割であり、新rendererがjob/receipt一致済みChromiumだけを使う契約は変更不要。
- production描画処理: 今回の停止原因ではない。attempt-0008で共通描画coreまで到達し、観測も設計どおり成立した。attempt-0009は描画処理へ未到達。
- 検査設営・job製造配線: 欠陥あり。異なる役割のbrowser pathを一つの変更として扱った。

したがって帰属は検査設営・job製造配線で確定する。修正内容も一意で、契約判断は不要である。

## 6. なぜ他工程を先へ進めないか

今回止めた理由は「2回エラーが出たから」ではない。前回正本会計の検査設営修正5/8から、原因を確定した3件を自走修正して8/8へ到達したためである。

title縦型・caption横型・QC・review pageには、将来必ず使う共通処理を先に閉じられる部分がある。しかし最新裁定は「枠を使い切る」を工程横断の停止条件にしている。ここで別工程へ進むと、上限到達後も作用を続けることになるため行っていない。

再開後は、まず一件の役割分離を直してtitle横型を通す。その後は、共通描画core・process観測・QCをtitle縦型とcaption横型でそのまま再利用する。後で必ず使う共通物を先に完成させる順序は維持する。

## 7. 未完了工程

- title landscape動画生成・QC: 未完了。
- title vertical動画生成・QC: 未着手。
- caption formal proof経路の新renderer切替: 未完了。
- caption landscape動画生成・QC: 未着手。
- 分離前後の行折り・表示内容一致: 未実施。
- PRM 8件と44 ID四者一致: 未実施。
- 注文書review page: 未作成。
- 作業path枠の掃除・一時file退避: 未実施。

## 8. 再開に必要な一問

検査設営修正枠を1件以上補充し、旧title jobの起動検査用browserは従来値、新renderer jobの実描画用Chromiumはsystem Chromeという役割分離をjob製造処理へ反映して続行してよいか。

## 9. 外部作用と作業領域

- API通信: 0回。
- 費用: US$0。
- commit / tag / 公開: 0件。
- 既存正式成果物・stable tag・退避folderへの変更: 0件。
- 旧経路の物理削除: 0件。
- attempt-0006〜0009とattempt-0008のprocess観測は不変保持。
- 一時render work・lockを含む作業pathは、完了報告工程へ未到達のため未整理。削除・再利用していない。
- 本報告作成後の実装修正・検査・描画: 0件。
