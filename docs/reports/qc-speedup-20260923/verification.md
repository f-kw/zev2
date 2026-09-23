# 3. QC高速化 — main上の完了検証

担当: Codex1。2026-09-23の「Codex1｜3. QC高速化」に基づく検証。

## 結論と今回の変更

同じPNGの展開結果を一つのQC内で共有する高速化は、既に `ea725d465e2f445620b798b658b4fc01bd382380` で実装され、着工時main `df5d8eca4754fe34f1b57766f876a9f98079ccfa` に統合済みだった。既存P2報告の変更ソース8件もmainの実byteと一致した。今回、同じ改善を再実装せず、現mainでの再測定と、P2時点で未実施だった部分出力の失敗・取消検証を完了した。

- 本番QC・合格条件・rendererは変更していない。
- 既存のQC測定器へ `recheck` を追加。Git中の高速化前QCを一時的なモジュールとして読み、現行QCと同じ保存済み入力で測る。checkout、branch、worktree、本番ファイルの上書きは行わない。
- 保存処理の試験へ、部分媒体と未完了結果を残して終了17／SIGTERMになる2ケースを追加。登録・取得拒否、原版保持、再起動時の拒否を確認した。
- 古い保存試験入力は現行実装が受け付けないv007だった。過去資料を保持し、試験内の一時コピーだけを対応済みv008の入力・判断形式で再構築した。旧Panelの無地背景を明示し、元の字幕・意味選択を保った。試験失敗時も一時領域を片付けるよう後処理を設営の先頭へ移した。

## 特定した重複と削減内容

既存のフレーム一括抽出、透明度別PNGの共有、途中合成・参照RGB・距離の再利用に加え、P2では各検査点の合成処理が同じPNGを再展開していた重複を削減している。各固有PNGを一度だけ色・透明度の4面へ展開し、元PNGのhash、寸法、形式を確認したjob専用の実byteを参照合成で使う。別jobの結果を流用せず、入力・出力を最後まで再照合する。

参照合成のPNG入力出現数はPanel 9→6、Shake 950→76。これは保存した引数上の出現数であり、物理ディスクI/O量ではない。全検査点・全候補・距離計算は残る。展開用processとraw画像の書込・再読は増えるため、すべてのケースが速くなる方式ではない。

## 今回の同条件Before / After

固定Node 20.19.6、Apple M3 Max、macOS Darwin 25.6.0。同一PATH、同一ffmpeg / ImageMagick、保存済みP1の完成動画・基礎動画・native PNG、Reset選択、同一検査条件。API費用・新素材取得なし。

測定は旧版→現行版の1組。各実行で未使用scratchを作り、QCの入力hash照合、tool版確認、抽出、準備、候補合成、RGB比較、最終検証を含む関数呼出し全体を計る。入力読込み、測定器の束縛、結果保存、後段の全RGB照合は時計の外。重い試験と計測を並行させていない。OSキャッシュの消去や統計的な反復測定はしていない。

| ケース | Before | After | 短縮時間 | 短縮率 |
|---|---:|---:|---:|---:|
| Panel QC | 2.410673秒 | 2.531625秒 | −0.120951秒 | −5.02% |
| Shake QC | 48.404066秒 | 42.804876秒 | 5.599190秒 | 11.57% |

Panelは今回0.121秒増加した。候補合成自体は0.394→0.289秒になったが、共有用の展開準備等が加わるため、Panel全体の高速化は実証していない。Shakeは候補合成31.479→23.034秒となり、展開準備2.294秒等を含めてもQC全体が短縮した。これ以上の方式追加は今回行わない。

### 過去の数値との関係

指示書のBeforeは[9月22日P2記録](../digest-presentation-editing-p2-20260922-v001/verification-v001.md)と一致する。

| 過去の測定境界 | Panel Before→After | Shake Before→After |
|---|---:|---:|
| QC単独 | 2.402731→2.382498秒 | 48.578285→40.826224秒 |
| 適用確認HTTP開始→完成媒体の全body取得 | 55.802103→53.288643秒 | 144.086157→134.672313秒 |

今回の測定と過去の総時間を直接比較しない。今回は動画再描画・厳密再合成・HTTP入口全体を再実行していない。現行本番実装は既存P2実走時と同一だが、過去の全体短縮を今回再測定したとは扱わない。

### 入力と旧版の再現

- Before: `73d1536b1a2febad04111609bb82f97e44df36ae` のQCソース。SHA-256 `6820d0e85dba7ac76b36f0c8b4499ddc7018d600097fc4ecd1043ad1d5c730a6`。
- After: 現mainのQCソース。SHA-256 `e339173000b7406bfd03c85b40c4769f69534cd5fc5b4c6bf3b475ac5fe2b0a9`。
- 旧版は相対importのアドレスだけを現mainへ対応付けて実行。依存ソース19件が旧commitとbyte同一であることを確認した。変換前・実行モジュール双方のhashを記録した。
- 旧worktreeで欠けていたnativeソース・fontの9参照は、記録済みhash・byte数と一致するmain側のファイルだけへ対応付けた。動画、PNG、過去の保存JSONは変更していない。Before/Afterの入力・対応付け・recipe・状態・測定器が同一であることを検査した。

## 品質・証拠の同一性

| 確認対象 | Panel 旧→新 | Shake 旧→新 |
|---|---:|---:|
| 検査点 | 3→3 | 50→50 |
| 論理候補 | 12→12 | 1715→1715 |
| 実参照RGB | 12→12 | 1665→1665 |
| 厳密な距離計算 | 12→12 | 1665→1665 |
| QC判定 | pass→pass | pass→pass |
| 違反 | 0→0 | 0→0 |
| 子process数 | 13→16 | 123→142 |

全53点・1727論理候補の完成側／参照側RGBを実ファイルから再読し、byte、距離、同値分類、可視性、期待状態・欠落状態の判定を照合した。入力・生成物のhash、全候補との対応も再確認した。QCのスキップや結果削減による短縮ではない。raw画像はPanel 6件49,766,400 byte、Shake 76件630,374,400 byteで、保存・再検算に必要な証拠として残る。

## 試験結果

固定Node 20.19.6で**69件合格、未解決の失敗0、skip 0**。合格した別実行を合算し、失敗した試行を重複計上していない。

- QC実行7件、候補・状態12件、結合証拠42件: [最初のTAP](tests.tap)のQC関連61件が合格。
- 保存・再試行・失敗・取消・子process停止・改変検出8件: [最終TAP](jobs-tests-v004.tap)で8件合格。うち2件が今回の部分媒体負例。
- 最初の保存系8件はv007試験入力で入口停止。[次の試行](jobs-tests-v002.tap)ではPanel背景の明示不足を検出し、形式を補完した。[その次](jobs-tests-v003.tap)は7件合格、実書体検査1件がsandbox内のブラウザ起動で未確認。承認されたsandbox外で同じ8件を実行し全合格した。production側の拒否条件は緩めていない。
- 負例は合成バイトを使った実workerのprocess／保存境界の試験であり、映像品質の証拠ではない。映像QCの同一性は上記実媒体・PNGの比較で確認した。

実行command:

```sh
env -u NODE_OPTIONS PATH=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  node --test --test-concurrency=1 \
  evals/clip_composition/presentation_editing_jobs_v001.test.mjs \
  evals/clip_composition/presentation_native_frame_execution_v001.test.mjs \
  evals/clip_composition/presentation_native_frame_qc_v001.test.mjs \
  evals/clip_composition/presentation_exact_replay_qc_v001.test.mjs
# 保存系の設営修正後は、同じ環境でその8件だけを再実行。
node --test evals/clip_composition/presentation_editing_jobs_v001.test.mjs
# 同じ固定環境で実施。SOURCE / OUTPUTの実値とhashはverification.jsonに保存。
node tools/digest-quality/p2-qc-performance.mjs recheck SOURCE_RESULT OUTPUT_DIRECTORY
```

## 保存・Git・残件

[軽量記録](verification.json)に測定器、入力、旧新ソース、全比較結果のpath・byte数・hash、未丸めの数値、対応付け、試験と一時物整理の根拠を保存した。生RGB・raw画像・process証拠は既存の `stage4-editing-*` ignore対象内に保持し、Gitへ媒体を追加しない。`.gitignore`の変更はない。

初回の設営失敗で残った一時領域は、TAP実行時間内の作成時刻、固有接頭辞、試験専用の固定内容を確認した8ディレクトリと空の生成先8ディレクトリだけを削除した。その後の試験一時物は後処理で削除済み。他作業・過去成果は削除していない。

Codex2の調査report commit `718f51fcbfaea048794b585e4c29ccd3ef3f0a3c` のGit確定時は受渡しを行った。Codex1のcommitには本報告・検証記録、測定器、保存試験だけを含める。

今回必要なQC改善・実走・比較・試験に未完了／未確認事項はない。単一測定での性能一般化、Panel固有の追加高速化、別工程の最適化は確認済みとはしない。追加のPanel準備最適化、他のrenderer/QC高速化候補は **Not now**。別エピックへ自動着手しない。

完了条件1〜9（現物確認・既存最小実装・内容不変・試験・実走・比較・Panel・Shake・記録）は上記で確認した。10〜15（今回だけのcommit・main push・clean・untracked 0・全項目再確認・相談役への直接報告）は、この報告を含むcommitの確定後、実Git状態と送信済み表示を確認して完了報告に記す。
