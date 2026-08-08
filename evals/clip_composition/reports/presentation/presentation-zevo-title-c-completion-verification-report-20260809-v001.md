実行した:
いいえ（ZEV本体UIからの操作）

実行できなかった場合:
ZEV本体のUIは今回のC工程に接続しておらず、UIからの操作確認は実施していない。完成動画2本の全編人間目視も、kawafmmの次の判断として残している。

代替で確認した内容:
固定Node・固定TSX loader・ネイティブ環境の正式runnerから横型・縦型を描画し、保存済み成果物、SHA-256、媒体情報、描画後QC、TAP全文、冒頭2秒の静止画を確認した。

---

# 完成物検証レポート

## 1. 結論

**意図どおり動いている（機械検証完了・全編の人間目視は未実施）**

ZEVGが運ぶ実証用仮タイトル「全部やりかけ」を、ZEVOが横型・縦型それぞれのstyle入力に従って冒頭6秒へ表示できた。二形式とも51.566016秒・1,547 frameを維持し、タイトル本文、配置、frame、音声を含むQC 6/6に合格した。

正式検査60/60、既存green 287/287、既知baseline 86/203（不合格117件不変）、既存正式tree 5/5も最終コードで再取得した。機械的な完成条件は満たすが、タイトル文言・位置・可読性・表示時間の最良性は機械合格にせず、完成2本の全編目視を人間判断として残す。

## 2. ユーザーから見た変化

- candidate 59の完成済み動画に、内容を表すタイトル「全部やりかけ」を載せた横型と縦型を確認できるようになった。
- タイトルは両形式とも冒頭6秒だけ表示される。
- タイトル文字列はZEVGの意味情報に一度だけ保存され、横型・縦型の文字サイズ、折り、位置、安全領域はZEVOの形式別styleが決める。
- 元の字幕31件、字幕時刻、動画frame、音声packetはタイトル追加前後で維持されている。
- 既存の正式動画5 treeは変更していない。新しい動画は別の版付き出力先へ保存した。

## 3. 実行した操作

1. 縦型v002正式jobの出力先とlockが未使用であることを確認した。
2. 固定Node、固定TSX loaderの絶対path、`NODE_OPTIONS`不存在、ネイティブ実行、Chromium起動可能の5点を検査し、版付き記録へ保存した。
3. 縦型v002正式jobを一度だけ実行し、1080×1920のmp4と5つの正式成果物を新規出力した。
4. 横型・縦型それぞれについて、元動画束縛、タイトル本文、タイトル適用、配置と可視性、frame維持、音声維持の6項目を検査した。
5. 最終コードでC工程の正式検査60件を頭から実行した。
6. 既存green 287件、正式baseline 203件、既存正式成果物5 treeの照合を頭から再取得した。
7. 横型・縦型の冒頭2秒を静止画化し、タイトルが上部へ表示されることを目視した。
8. API通信を行わず、保存済みcandidate 59成果物だけで完了した。

## 4. 保存データの確認

確認した意味情報:

- 元配信: `youtube:qdczJpv8RCc`
- candidate: 59
- 元配信範囲: `sourceStartMs=5941162`、`sourceEndMs=5992736`
- 意味情報パッケージ:
  `evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v001-meaning-information/meaning-information-package.json`
- パッケージSHA-256: `61a756e3b217b49e185ac988771cc0812ea0f35ea7d0f84c520f80395b197e2a`
- タイトル: `全部やりかけ`
- 契約上の入力方式: `human`
- 文言の作成者: 承認済み設計に従ってエージェントが仮置き。kawafmmによる採否・差し替えは未実施
- 字幕: 31件
- 意味観測: 0件（v001契約どおり）

横型の保存先:

- job:
  `evals/clip_composition/outputs/presentation/title-output-jobs/qdczJpv8RCc-candidate-59-c-title-landscape-v002/formal-title-output-job.json`
- 出力root:
  `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v002-output/`
- 表示計画SHA-256: `86332b39f3f371e78a50c17d43808b653fa823220abbd87973850bc81ac241d5`
- manifest SHA-256: `29bbee81d1b63cf980b632dcee36dbbff21075c675d1af3403a09218379858ca`
- QC SHA-256: `13e52fa270b45ef7a3f52417b02cc11416b5de8c438648c2da6a4c9b00169d3c`

縦型の保存先:

- job:
  `evals/clip_composition/outputs/presentation/title-output-jobs/qdczJpv8RCc-candidate-59-c-title-vertical-v002/formal-title-output-job.json`
- 出力root:
  `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v002-output/`
- 表示計画SHA-256: `ebcfe6b2b4126533a8728639df96f36e4c7c7ce8ddee0529b929f7a8a2620628`
- manifest SHA-256: `0de6ca7b13e6fd1e375e5bd8728cfe0cc0c806bd79de9869aae8dc940957ae85`
- QC SHA-256: `2b043ee548f1f81d28f6ef22050155b5275f9b485efceb95183faa57b03c8714`

両表示計画で、タイトル追加前後の字幕本文列SHAは`464dca25fe345f4f697fc729a4f8dc52000539a343ddef62780542ecaa36038d`、字幕時刻列SHAは`21d35262b46c9226c77a6efc9e4359a14d1fc7add583d83b12f6b25f01219dc6`で一致した。

今回のC工程は候補プール・候補選抜ログ・完成ショート接続情報を検証する経路ではない。これら別系統の項目を今回の合否へ混載していない。

## 5. UI確認

ZEV本体UIは起動していない。今回の正式入口は評価環境の版付きjobとrunnerである。

代替として横型・縦型の冒頭2秒を静止画で確認し、両方に「全部やりかけ」が上部表示されることを確認した。全編の文言・位置・可読性・表示時間は、完成mp4 2本をkawafmmが目視して最終判断する。

## 6. 出力動画の確認

横型:

- path:
  `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v002-output/title-rendered-v001.mp4`
- SHA-256: `d58fd412fa71208f67e01ef230ebf349233e3997618d68dd1839e586f3540234`
- 尺: 51.566016秒
- 画面: 1920×1080、30fps、1,547 frame
- タイトル: 0〜179 frame、計180 frame（6秒）、1行
- 音声: 元動画と同じpacket payload SHA `d18469bd3132356b03870ee8bc3d63e95947bd254961157e09d59cf9a53459ec`
- QC: 6/6合格

縦型:

- path:
  `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v002-output/title-rendered-v001.mp4`
- SHA-256: `f14624f4edd0ff1bcc24885b7ea593b52487e8e52f8ac183454f015c67060053`
- 尺: 51.566016秒
- 画面: 1080×1920、30fps、1,547 frame
- タイトル: 0〜179 frame、計180 frame（6秒）、1行
- 音声: 元動画と同じpacket payload SHA `d18469bd3132356b03870ee8bc3d63e95947bd254961157e09d59cf9a53459ec`
- QC: 6/6合格

今回の処理は、既に人間合格済みの動画へタイトルだけを追加する。人間カット、AIによる区間削除、字幕本文・時刻の再生成は行っていない。

## 7. 正本の分離確認

- タイトル文字列の正本: ZEVG意味情報パッケージの`title`。
- タイトルの折り、文字サイズ、配置、安全領域、表示時間の正本: ZEVOの形式別style registryと表示計画。
- 元の字幕本文・時刻・区間: title追加前の意味情報と同じprojectionを維持。
- 描画済み動画とQC: 横型・縦型それぞれの新しい版付き出力root。

タイトル文言をstyleへ複製せず、表示方法をZEVGへ戻さず、旧成果物を新形式へ変換するfallbackも作っていない。

`ShortDraftPlan`、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`ReviewPacket`、`comparisonItems`は今回の経路へ接続していないため、混在も合格も主張しない。

## 8. 合格判定チェック

候補選抜用テンプレート12項目は本経路の合否対象外であり、2026-08-06裁定どおり混載しない。C工程について次を確認した。

1. ZEVGが運ぶタイトル本文が横型・縦型でbyte同一: OK
2. ZEVOが形式別styleから表示方法を決定する: OK
3. タイトル本文をstyle・production codeへ焼き込まない: OK
4. 横型と縦型が同一compositor・同一runnerを使う: OK
5. crop・viewport値をタイトル計画へ持ち込まない: OK
6. タイトル追加前後で字幕本文31件が不変: OK
7. タイトル追加前後で字幕時刻が不変: OK
8. frame数1,547を両形式で維持: OK
9. 音声packet payloadを両形式で維持: OK
10. QC 6項目が両形式で全合格: OK
11. 既存正式成果物5 treeが不変: OK
12. API通信0回・費用US$0: OK

## 9. 問題点

確認範囲では重大な問題なし。

未確認事項:

- 横型・縦型の全編を通したタイトルの見た目は、人間がまだ最終認定していない。
- タイトル文言「全部やりかけ」は実証用の仮置きであり、kawafmmが差し替え可能である。

これは機械実装の不合格ではなく、見た目・読みやすさを人間へ残した承認済み境界である。

## 10. まだ未実装のこと

- タイトル候補をLLMが複数提示し、人間が選択または部分修正する運用。
- タイトル候補の選択・修正履歴を作風preset蒸留へ使う版付き保存経路。
- ZEV本体UIからタイトル候補を確認・選択する導線。
- G4〜G7の意味観測を使う演出。
- タイトル・サムネイルを含む公開工程。

## 11. 参考: 不足している可能性のある機能

### 1. 完成2本の人間最終認定

- 根拠: QCは合格したが、全編の目視は未実施。
- ユーザー影響: タイトル文言、位置、可読性、表示時間の最良性をまだ確定できない。
- 扱い: 確認不足。機械不具合ではない。

### 2. タイトル候補選択の実運用

- 根拠: 現在のtitleは`inputMode: human`の一文を直接指定する契約であり、複数候補生成は実装していない。
- ユーザー影響: 現状はタイトルを白紙から人間が与える必要がある。
- 扱い: 今後の未実装。将来のZEVO側タイトル工事で別承認とする。

### 3. 保安保持した一時work/lockの整理

- 根拠: 過去attemptの診断証拠として非公開のwork/lockを保持している。
- ユーザー影響: 正式動画の利用には影響しないが、作業領域を消費する。
- 扱い: 未確認の整理候補。正式成果物・TAPと分離して判断する。

## 12. 次に直すべきこと

1. kawafmmが横型・縦型の完成動画を全編見て、タイトル文言・位置・可読性・表示時間を一度に合否判断する。
2. 目視合格後だけ、C工程を安定点化するか判断する。
3. タイトル候補選択式のLLM工事は、今回の実証と混ぜず別承認で設計する。

## 13. 実行コマンドとテスト結果

主要な正式実行コマンド:

```text
env -u NODE_OPTIONS PATH=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin /Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --import /Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs evals/clip_composition/run_presentation_output_title_job_v001.ts evals/clip_composition/outputs/presentation/title-output-jobs/qdczJpv8RCc-candidate-59-c-title-vertical-v002/formal-title-output-job.json
```

最終回帰は同じ固定Node・固定TSX loader・`NODE_OPTIONS`不存在・並列なしで実行し、TAP全文を版付き保存した。

成功:

- C工程正式検査: 60/60
- 既存green: 287/287
- 既存正式成果物tree: 5/5
- 横型QC: 6/6
- 縦型QC: 6/6
- Chromium headless起動確認: 成功

既知baseline:

- 86/203、既知不合格117件でexact一致
- process終了1は既知baselineの期待結果であり、新規退行ではない

失敗:

- 最終attemptの新規不合格: 0件

未実行:

- ZEV本体UIの起動
- 完成動画2本の全編人間目視
- ChatGPT投稿（投稿先・投稿commandの指定なし）
- API通信

## 14. 証拠

- 完全実装設計:
  `evals/clip_composition/reports/presentation/presentation-zevo-title-c-complete-implementation-design-20260808-v001.md`
- 縦型起動前checklist:
  `evals/clip_composition/reports/presentation/test-runs/20260808-zevo-title-c-v001/formal-render/vertical-v002-attempt-0001/prelaunch-checklist.json`
- 縦型実行記録:
  `evals/clip_composition/reports/presentation/test-runs/20260808-zevo-title-c-v001/formal-render/vertical-v002-attempt-0001/execution-record.json`
- 横型実行記録:
  `evals/clip_composition/reports/presentation/test-runs/20260808-zevo-title-c-v001/formal-render/landscape-v002-attempt-0001/execution-record.json`
- 正式60件TAP:
  `evals/clip_composition/reports/presentation/test-runs/20260808-zevo-title-c-v001/attempt-0007/formal-60.tap`
- green 287件TAP:
  `evals/clip_composition/reports/presentation/test-runs/20260808-zevo-title-c-v001/green-287-attempt-0003/green-287.tap`
- baseline 203件TAP:
  `evals/clip_composition/reports/presentation/test-runs/20260808-zevo-title-c-v001/baseline-203-attempt-0003/baseline-203.tap`
- 5 tree TAP:
  `evals/clip_composition/reports/presentation/test-runs/20260808-zevo-title-c-v001/five-tree-attempt-0002/five-tree.tap`

事実:

- 起動前checklist 5項目合格。
- 二形式ともQC 6/6、1,547 frame、音声packet payload SHA一致。
- 正式検査と既存回帰は期待どおり。
- API通信0回、費用US$0。

推測:

- なし。

未確認:

- 完成2本の全編を通した人間目視。
- タイトル候補選択式の使い勝手と品質。
