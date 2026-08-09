実行した:
はい。横型・縦型の描画とQCは直前工程で実行済みで、本レポート工程では保存成果物を再照合し、kawafmmの確認ページ目視結果「OK」を正式な人間合格として記録した。

実行できなかった場合:
該当なし。

代替で確認した内容:
該当なし。

---

# 完成物検証レポート

## 1. 結論

**意図どおり動いている。**

濃紺の全幅帯を残したまま、見えているタイトル文字の輪郭を帯の上下左右中央へ置けた。横型は中心差0px、縦型は整数画素で可能な最小差0.5px以内で、両動画ともQC 6/6に合格した。kawafmmが確認ページで二形式を目視し「OK」と回答したため、タイトルの座布団内中央揃えを人間合格とする。

## 2. ユーザーから見た変化

- タイトルは`片付けの「やりかけ癖」を語るマリン船長`。
- 横型では全文を1行、縦型では2行で表示する。
- 文字は、配置用の箱ではなく、実際に見える字形を基準に座布団の中央へ揃う。
- 座布団は画面上端・左右端へ隙間なく接する。
- 文字との内側余白、80px、冒頭6秒の表示は従来どおり。

## 3. 実行した操作

1. C工程の設計、出力側受け入れ契約、保存済みタイトル入力、横型・縦型表示計画を再読した。
2. 横型・縦型動画のSHA-256、解像度、尺、映像・音声streamを再照合した。
3. 描画後QC、画素上の文字中心、タイトル契約・runner検査の保存結果を再照合した。
4. kawafmmが確認ページv005を開き、二形式を目視して`OK`と回答した事実を版付き人間確認記録へ保存した。
5. DECISIONSとHANDOVERへ人間合格後の現在地を同期した。

本レポート作成中に動画の再描画、API通信、追加費用、候補選抜処理、コミット、安定tag発行は行っていない。

## 4. 保存データの確認

確認した主要な保存データは次のとおり。

- タイトル付き意味情報パッケージ: `evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v002-meaning-information/meaning-information-package.json`
  - SHA-256: `8838733cdcf20c44e5e64191331ed09f64198b9e5c4d0b418f283fb5670cfe0e`
  - 元配信: `youtube:qdczJpv8RCc`
  - 元区間: `5941162ms`以上`5992736ms`未満
  - title: `片付けの「やりかけ癖」を語るマリン船長`
  - 入力方式: 人間指定
- 横型表示計画: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v009-output/title-display-plan-v001.json`
- 縦型表示計画: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v009-output/title-display-plan-v001.json`
- 機械検証記録: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/render-verification-v001.json`
- 人間確認記録: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/human-review-v001.json`

両表示計画は同じタイトル付き意味情報パッケージのfile SHAとcanonical SHAを束縛している。元区間・字幕31件・タイトル本文を形式ごとに再解釈せず、横型と縦型の表示方法だけを分けている。

候補プール、候補選抜ログ、完成ショートの`CandidateSelectionBinding`は、本C工程のタイトル表示経路では作成・変更・参照していないため、今回の検証対象外である。

## 5. UI確認

確認した。使用した画面は次のローカル確認ページ。

`evals/clip_composition/reports/presentation/title-review-20260809-v005/review.html`

画面には横型1本・縦型1本と、正式タイトル`片付けの「やりかけ癖」を語るマリン船長`が表示される。kawafmmは二形式の座布団内中央揃えを目視し、`OK`と回答した。

これはZEV本体UIの確認ではなく、C工程専用の完成動画確認ページである。本体UIへの接続は今回の合否へ含めていない。

## 6. 出力動画の確認

### 横型

- path: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v009-output/title-rendered-v001.mp4`
- SHA-256: `9ea78fa0a8105af78e755b429b1ae27d69537670d48953fbc5d0034b33764afe`
- 1920×1080、30fps、51.566016秒、1,547 frame
- 音声streamあり
- タイトル表示: frame 0以上180未満
- 可視文字中心: 左右0px、上下0px
- QC: 6/6

### 縦型

- path: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v009-output/title-rendered-v001.mp4`
- SHA-256: `fcc9f91e879377baedfb2a4fa30036fac272ac15b6223d9006584309e166a396`
- 1080×1920、30fps、51.566016秒、1,547 frame
- 音声streamあり
- タイトル表示: frame 0以上180未満
- 1行目の左右中心差0px、2行目と2行全体は0.5px
- QC: 6/6

両動画とも、出力前後で音声packet SHAが一致している。元動画範囲は`5941162ms`以上`5992736ms`未満。今回の修正はタイトル位置だけで、人間カットやAIによる削除意図は変更していない。

## 7. 正本の分離確認

- タイトル本文の正本はZEVGの意味情報パッケージにある。
- 行分割、文字サイズ、座布団、配置、表示時間はZEVOの表示計画とstyle入力が所有する。
- 横型・縦型は同じ意味情報を使い、表現だけを分けている。
- `ShortDraftPlan`、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`ReviewPacket`、`comparisonItems`は本経路で読み書きしていない。
- `comparisonItems`からタイトル理由や採用理由を復元していない。
- 近い元区間から候補接続を推定していない。
- 旧タイトル成果物を新形式へ変換せず、新しい版付き出力へだけ公開した。

## 8. 合格判定チェック

以下は候補選抜機能の検証項目であり、C工程のタイトル表示では変更・実行していない。別系統の合否を混載しないため、全項目を対象外とする。

1. 出力本数入力が廃止されている: 対象外
2. 抽出時に完成ショートが自動生成されない: 対象外
3. 候補プールが保存される: 対象外
4. 候補選抜ログが保存される: 対象外
5. 上位漏れ候補が not_selected として残る: 対象外
6. 人間が候補を選んでショート化できる: 対象外
7. 完成ショートに CandidateSelectionBinding が保存される: 対象外
8. 採用理由は厳密接続できる場合だけ表示される: 対象外
9. comparisonItems を正本にしていない: 対象外
10. 旧データは再生成案内になる: 対象外
11. sourceStartMs / sourceEndMs を使っている: 本経路ではOK（`5941162` / `5992736`）
12. startMs / endMs を新しい正本にしていない: 本経路ではOK

## 9. 問題点

確認範囲では、完成動画の重大な問題なし。

問題: 旧レンダラー全体検査は12/19のまま。

該当箇所: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/targeted/presentation-renderer-v002.tap`

なぜ問題か: 7不合格はいずれも固定信頼SHA不一致を先に観測し、本来の後段条件へ到達していない。固定値には今回変更前のタイトル描画SHAと、本件に含まれない未確定のRemotion preview部品SHAが含まれる。現行タイトル正式経路64/64と二形式QC 6/6は合格しているため、完成動画の退行とは確認されていないが、旧全体検査の緑は未回復である。

再現手順: 上記TAPの検査4以降を確認する。

修正案: 別承認の範囲で、無関係な作業ツリー変更を混ぜず、旧信頼台帳が保護すべき正式経路を再確定する。

優先度: 中。今回の人間合格を妨げないが、安定点化前の検査範囲判断に必要。

## 10. まだ未実装のこと

- タイトル候補をLLMが複数提示し、人間が選択・部分修正する運用。
- タイトル選択履歴から作風presetを蒸留する処理。
- C工程の本体UI接続。
- G4〜G7を使う凝ったタイトル演出。
- 人間合格後のcommit・安定tag発行。

## 11. 参考: 不足している可能性のある機能

1. **旧全体検査の現行信頼束縛**
   - 根拠: 保存TAPで12/19。コード・検査実行で確認済み。
   - ユーザー影響: タイトル単独経路は合格しても、旧レンダラー全体の一括緑を示せない。
   - 扱い: 検証不足。完成動画の確認済み欠陥ではない。
2. **タイトル候補選択式の運用**
   - 根拠: DECISIONSで将来のZEVO工事として予約済み。今回の文言は人間が直接確定した。
   - ユーザー影響: 現状は白紙からではない候補提示・選択履歴保存が使えない。
   - 扱い: 今後の未実装。
3. **本体UIへのタイトル確認導線**
   - 根拠: 今回はローカル専用確認ページを使用した。
   - ユーザー影響: 通常運用画面から同じ確認を開始できない。
   - 扱い: 今後の未実装。

## 12. 次に直すべきこと

1. 別承認を受けて、人間合格済みC工程をcommitと安定tagへ固定する。
2. 安定点化の検査範囲を決める際に、旧レンダラー全体検査の信頼束縛を別作業として整理する。
3. その後、既定の優先順位に従い、タイトル候補選択式または次工程へ進む。

## 13. 実行コマンドとテスト結果

### 本レポート工程で実行した読み取りコマンド

```text
sed -n '1,260p' /Users/kawafmm/.codex/skills/report/SKILL.md
sed -n '1,130p' DECISIONS.md
sed -n '1,38p' docs/HANDOVER.md
sed -n '1,180p' evals/clip_composition/reports/presentation/presentation-zevo-title-c-completion-verification-report-20260809-v005.md
sed -n '261,620p' /Users/kawafmm/.codex/skills/report/SKILL.md
test -f docs/order.md && sed -n '1,220p' docs/order.md || echo 'docs/order.md: not found'
rg --files docs | rg '(^|/)(task-|spec-)|title|presentation' | head -200
rg -l "C工程|タイトル|ZEVO" docs/task-*.md docs/finished/task-*.md docs/spec-*.md 2>/dev/null | head -100
rg --files evals/clip_composition | rg 'title.*(design|contract|report|job)|meaning.*output|output.*acceptance' | sort | tail -160
rg -l "title-display|title欄|上部|top-band|visible.*center" evals/clip_composition/reports evals/clip_composition/contracts evals/clip_composition 2>/dev/null | sort | head -120
sed -n '1,240p' evals/clip_composition/reports/presentation/presentation-zevo-title-c-complete-implementation-design-20260808-v001.md
sed -n '1,200p' evals/clip_composition/reports/presentation/presentation-output-side-acceptance-contract-design-20260803-v001.md
sed -n '1,240p' evals/clip_composition/outputs/presentation/title-output-jobs/qdczJpv8RCc-candidate-59-c-title-landscape-v009/formal-title-output-job.json
sed -n '1,220p' evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v009-output/title-display-plan-v001.json
sed -n '1,220p' evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v009-output/title-display-plan-v001.json
rg -n 'sourceVideoId|sourceStartMs|sourceEndMs|"title"|inputMode|timelineComposition|sourceMedia' evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v002-meaning-information/meaning-information-package.json | head -80
/usr/local/bin/ffprobe -v error -show_entries format=duration:stream=index,codec_type,width,height,r_frame_rate -of json evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v009-output/title-rendered-v001.mp4
/usr/local/bin/ffprobe -v error -show_entries format=duration:stream=index,codec_type,width,height,r_frame_rate -of json evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v009-output/title-rendered-v001.mp4
sed -n '1,70p' evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v002-meaning-information/meaning-information-package.json
rg -n '"title"|"text": "片付け|"inputMode"' evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v002-meaning-information/meaning-information-package.json | tail -20
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node -e "const fs=require('fs'); const crypto=require('crypto'); const review=JSON.parse(fs.readFileSync('evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/human-review-v001.json','utf8')); const machine=JSON.parse(fs.readFileSync('evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/render-verification-v001.json','utf8')); if(review.decision!=='passed') throw new Error('review'); for(const item of review.reviewedArtifacts){const actual=crypto.createHash('sha256').update(fs.readFileSync(item.path)).digest('hex'); if(actual!==item.fileSha256) throw new Error(item.path);} if(machine.finalRenders.landscape.qc!=='6/6 passed'||machine.finalRenders.vertical.qc!=='6/6 passed') throw new Error('qc'); console.log('human-review-and-artifact-bindings: passed');"
shasum -a 256 evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v002-meaning-information/meaning-information-package.json evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v009-output/title-rendered-v001.mp4 evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v009-output/title-rendered-v001.mp4 evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/human-review-v001.json
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node -e "JSON.parse(require('fs').readFileSync('evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/human-review-v001.json','utf8')); console.log('human-review-json: passed')"
git diff --check -- DECISIONS.md docs/HANDOVER.md evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/human-review-v001.json evals/clip_composition/reports/presentation/presentation-zevo-title-c-completion-verification-report-20260809-v006.md
```

### 保存済み検査結果

成功:

- タイトル契約・正式runner: 64/64
- 可視文字中央の限定物理検査: 1/1
- 横型QC: 6/6
- 縦型QC: 6/6
- 人間目視: 合格

失敗:

- 旧レンダラー全体検査: 12/19。旧信頼束縛と本件外の作業ツリーSHAにより後段停止。
- v007: 制限環境のTSX内部socket作成不可。未公開。
- v008: 可視文字が4px下で物理検査が公開前拒否。

未実行:

- API通信
- 動画再描画
- ChatGPT投稿（投稿先・投稿コマンドの指定なし）
- commit・安定tag発行

## 14. 証拠

- 人間確認記録: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/human-review-v001.json`
- 機械描画検証: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/render-verification-v001.json`
- 確認ページ: `evals/clip_composition/reports/presentation/title-review-20260809-v005/review.html`
- タイトル契約・runner TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/targeted/title-contract-and-runner-attempt-0002.tap`
- 可視文字中央QC TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/targeted/presentation-renderer-qc-focused.tap`
- 旧全体検査TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/targeted/presentation-renderer-v002.tap`
- 横型1秒地点画像: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/visual-check/landscape-1s.png`
- 縦型1秒地点画像: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v005/visual-check/vertical-1s.png`
- ChatGPT投稿: 未実行。投稿先セッション名・投稿コマンドとも未指定。
