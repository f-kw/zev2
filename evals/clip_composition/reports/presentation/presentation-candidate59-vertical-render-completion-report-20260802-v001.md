実行した:
いいえ（ZEV本体のUIは起動していない）

実行できなかった場合:
今回の承認範囲は、保存済み表示計画から正式レンダラーを動かし、確認用MP4と描画後QCを作るところまでだった。ZEV本体UIの起動・公開・安定点化は含まれていない。

代替で確認した内容:
正式runnerを1回実行し、完成MP4、manifest、QC、媒体情報、冒頭・中盤・終盤の静止画、横型2本の不変を確認した。

---

# 完成物検証レポート

## 1. 結論

**意図どおり動いている。**

candidate 59から、1080×1920・51.566秒の縦型字幕付き確認動画を1本生成できた。字幕30件の適用、重なり、安全領域、欠落、1,547 frame、音声の6項目は全て合格した。横型candidate 13・59の保存済み正式成果物も不変だった。公開可否と見た目・聴こえ方の最終判定だけは、人間の目視待ちである。

## 2. ユーザーから見た変化

これまで描画開始時に止まっていたcandidate 59の縦型経路が、最後まで通るようになった。

- 1人話者向けの縦型cropを使い、画面を1080×1920へ構成した。
- 認定済み縦型プリセットで、30個の字幕を51行として焼き込んだ。
- 元の音声内容と1,547 frameを維持した確認用MP4を出力した。
- 現段階は「人間が見て確認する動画」であり、公開済み動画ではない。

## 3. 実行した操作

1. 承認内容を`DECISIONS.md`へ一行記録した。
2. フレーム数を読む処理の参照先を、QC側ではなく既存の共通描画処理へ移した。
3. レンダラー信頼情報に残る生成時SHAと、実行時に29件を現物照合する仕組みを分離した。
4. 生成時来歴の分離と実crop入口を検査する2件を追加した。
5. B4関連13件、縦型レンダラー23件、横型回帰H01〜H06を実行した。
6. 保存済みB4 v002表示計画から、版付き新規jobで正式描画を1回だけ実行した。
7. 完成MP4のSHA、尺、映像・音声、描画後QCを再照合した。
8. 冒頭・中盤・終盤の静止画を抽出し、縦横の取り違え、字幕欠落、明らかな画面外描画がないことを補助確認した。

外部API通信は0回、追加費用はUS$0。累計費用は既記録どおりUS$0.1235である。

## 4. 保存データの確認

確認した主な正本・成果物:

- 元動画ID: `qdczJpv8RCc`
- candidate: `59`
- 元動画範囲: `5,941,162ms`〜`5,992,736ms`
- 組立確認: `evals/clip_composition/outputs/presentation/source-review-preparations/qdczJpv8RCc-candidate-59-v001/assembly-review-manifest.json`
- 基礎映像timeline: `evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/timeline.json`
- B4表示計画: `evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/display-plan.json`
- crop決定: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006/crop-decision-v006.json`
- 正式描画job: `evals/clip_composition/outputs/presentation/vertical-review-render-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003.json`
- 完成manifest: `evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-render-manifest-v001.json`
- 描画後QC: `evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-render-qc-v001.json`

`sourceVideoId`相当の動画ID、`sourceStartMs`、`sourceEndMs`は、組立確認と基礎映像timelineで`qdczJpv8RCc / 5,941,162 / 5,992,736`として一致した。今回の評価用presentation経路はアプリ本体の`CandidateSelectionBinding`を作る工程ではないため、その保存は確認対象外である。

## 5. UI確認

ZEV本体UIは起動していない。したがってUI上の完成ショート表示、採用理由表示、作り直し導線は未確認である。

代わりに完成動画の5秒、25.8秒、45秒付近を静止画で確認した。3箇所とも縦型cropと字幕が描画され、明らかな欠落や画面外表示は見られなかった。ただし見た目・聴こえ方の最終合格はkawafmmの約52秒の目視確認に残す。

## 6. 出力動画の確認

- 出力動画: `evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-rendered-v001.mp4`
- SHA-256: `2cc9a3407148e5005616474f37cb76bb57111dd2aedc318307ea6a7190a8d7a2`
- 尺: `51.566016秒`（manifest上は51,567ms）
- 映像: H.264、1080×1920、30fps、1,547 frame
- 音声: AAC。packet内容SHAは入力と完全一致
- 元動画範囲: `5,941,162ms`〜`5,992,736ms`
- 人間カット: 保存済みの外側境界1区間を使用。今回の作業で新しいカット判断は追加していない。
- AI削除意図: なし。今回の工程は保存済み字幕計画の描画だけで、発話や映像を新たに削除していない。

過去のpreviewとのbyte一致は合格条件ではなく未確認。正式crop決定、正式preset、正式B4表示計画を束縛したrenderer出力であることはmanifestで確認した。

## 7. 正本の分離確認

今回触れたのは、組立決定後の基礎映像、字幕意味回答、表示計画、縦型renderer、QCのpresentation経路だけである。`ShortDraftPlan`、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`ReviewPacket`、`comparisonItems`は変更していない。

このため、今回の範囲でそれらが混ざった事実はない。一方、アプリ本体上での厳密接続や採用理由表示はUI未実行のため確認していない。

## 8. 合格判定チェック

1. 出力本数入力が廃止されている: 要確認（今回対象外）
2. 抽出時に完成ショートが自動生成されない: 要確認（今回対象外）
3. 候補プールが保存される: 要確認（今回対象外）
4. 候補選抜ログが保存される: 要確認（今回対象外）
5. 上位漏れ候補が not_selected として残る: 要確認（今回対象外）
6. 人間が候補を選んでショート化できる: 要確認（今回対象外）
7. 完成ショートに CandidateSelectionBinding が保存される: 要確認（今回対象外）
8. 採用理由は厳密接続できる場合だけ表示される: 要確認（UI未実行）
9. comparisonItems を正本にしていない: 要確認（今回対象外）
10. 旧データは再生成案内になる: 要確認（今回対象外）
11. sourceStartMs / sourceEndMs を使っている: OK
12. startMs / endMs を新しい正本にしていない: OK（基礎映像timelineはsourceStartMs/sourceEndMsを保持）

## 9. 問題点

確認範囲では重大な問題なし。

既知事項として、正式rendererはpath差し替え事故を避ける安全仕様により、終了後も所有lockとQC用一時作業を自動削除しない。今回は約959MB・172ファイルが診断用に保持されている。rendererの成功契約と回帰検査が要求する挙動であり、完成判定を妨げる欠陥ではない。別承認なしに削除していない。

## 10. まだ未実装のこと

- この完成動画に対する人間の最終目視合格。
- 人間合格後のcommit・安定点tag・JOURNAL/HANDOVER同期。
- fatalの内側理由を上位報告へ残す観測性v002。今回の修正には混ぜず別工程のまま。
- 公開処理。manifestは`reviewOnly: true`、`publicReleaseAllowed: false`である。

## 11. 参考: 不足している可能性のある機能

1. **完成動画の人間目視確定**
   - 根拠: manifestが確認用状態で、今回の指示も安定点化を目視合格後に限定している。
   - ユーザー影響: 見た目・聴こえ方の違和感はまだ最終確定していない。
   - 扱い: 今後の未実装ではなく、現在の必須確認待ち。
2. **fatalの内側原因を上位報告へ残す機能**
   - 根拠: 直前の停止では、import先誤りが外側のfatal名だけに潰れ、読み取り診断が必要だった。
   - ユーザー影響: 次の異常時に原因説明までの往復が増える。
   - 扱い: コード・記録で確認済みの将来改訂候補。今回の完成物の欠陥ではない。
3. **安全保持された一時作業の正式な整理運用**
   - 根拠: 成功後も約959MBを意図的に保持する既存契約。
   - ユーザー影響: 複数本を生成するとディスク使用量が増える可能性がある。
   - 扱い: コード確認済みの運用課題。無断自動削除は既存の安全契約に反するため、別設計が必要。

## 12. 次に直すべきこと

1. kawafmmが完成動画を約52秒再生し、見た目・聴こえ方を「問題なし／修正あり」で判断する。
2. 合格なら別指示で成果物をcommitし、安定点tagとJOURNAL/HANDOVERを同期する。
3. fatal観測性v002は縦型一本を閉じた後の独立工程として再評価する。

## 13. 実行コマンドとテスト結果

主要な実装・完成検証コマンド:

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test --test-reporter=tap evals/clip_composition/test_presentation_caption_display_pair_v004.mjs
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node runner/node_modules/tsx/dist/cli.mjs --test --test-reporter=tap evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node runner/node_modules/tsx/dist/cli.mjs --test --test-reporter=tap evals/clip_composition/presentation_vertical_formal_path_integration_v001.test.mjs
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node runner/node_modules/tsx/dist/cli.mjs evals/clip_composition/render_presentation_vertical_review_v001.ts evals/clip_composition/outputs/presentation/vertical-review-render-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003.json
shasum -a 256 evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-rendered-v001.mp4 evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-render-manifest-v001.json evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-render-qc-v001.json
/usr/local/bin/ffprobe -v error -show_entries format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_frames -of json evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-rendered-v001.mp4
/opt/homebrew/bin/ffmpeg -v error -i evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-rendered-v001.mp4 -vf "select='eq(n,150)+eq(n,774)+eq(n,1350)'" -fps_mode vfr /private/tmp/candidate59-vertical-v003-check-%02d.png
```

仕様・保存物を読むために実行した主な読み取りコマンド:

```text
cat docs/order.md
cat docs/GOAL_DEFINITION.md
cat docs/task-008-Gemini-APIで演出作成.md
cat docs/zev2-flow-contract.md
cat evals/clip_composition/reports/presentation/presentation-candidate59-vertical-render-stage-diagnosis-and-replan-20260802-v001.md
jq '.' evals/clip_composition/outputs/presentation/vertical-review-render-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003.json
jq '.inputBindings, .jobBinding, .git' evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-render-manifest-v001.json
jq '.' evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/timeline.json
jq '.' evals/clip_composition/outputs/presentation/source-review-preparations/qdczJpv8RCc-candidate-59-v001/assembly-review-manifest.json
```

成功:

- B4関連: 13/13
- 縦型renderer: 23/23
- 横型回帰: H01〜H06、6/6
- v002字幕回帰（H05内）: 24/24
- 正式renderer: 終了0、manifest passed
- QC: 6/6

失敗:

- なし。

未実行:

- API通信
- ZEV本体UIの起動確認
- 公開
- commit、安定点tag
- ChatGPT投稿（依頼・投稿コマンドなし）

## 14. 証拠

- 完成MP4 SHA-256: `2cc9a3407148e5005616474f37cb76bb57111dd2aedc318307ea6a7190a8d7a2`
- manifest SHA-256: `954bf34dd996fd5a540ac0e660347e99a54652206946249a7cdf35e24fb7c055`
- QC SHA-256: `893124dc5b2cf124997dd3960017d14271c9ff94796222de85d6814be16b4b0b`
- 正式job SHA-256: `f4a04c39443fb6a4e3ad5cc407cf8d7c4e0d0b0b673137f198811ba2da2976cf`
- 字幕適用: 30/30、指定preset一致
- 行交差: 正の交差0件
- 安全領域: 全字幕が許可領域内
- 字幕欠落: 281参照/281固有、重複0。30字幕・51行、本文byte一致
- frame維持: 期待1,547 / 実測1,547
- 音声維持: 期待・実測packet SHA `d18469bd3132356b03870ee8bc3d63e95947bd254961157e09d59cf9a53459ec`
- candidate 13横型tree: 95 path、`2c68a23d126586b5e071848858edba637e79839bcb5d0906613d4398e9c62464`
- candidate 59横型tree: 91 path、`983763b52a60e10fd99126265e7178e4a600fd3024e00614f8abfcc90a724397`
- 正式動画は`reviewOnly: true`、`publicReleaseAllowed: false`

人間の次の作業は、完成MP4を約52秒再生して、見た目・聴こえ方に問題がないか1判断することだけである。
