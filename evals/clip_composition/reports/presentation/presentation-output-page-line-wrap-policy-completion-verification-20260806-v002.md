実行した:
はい

実行できなかった場合:
該当なし

代替で確認した内容
該当なし

---

# 完成物検証レポート

## 1. 結論

意図どおり動いている

短い字幕まで必ず2行になる旧挙動を廃止し、1行で物理的に収まる本文は1行、収まらない本文だけを改行する挙動へ変わった。planner検査27/27、正式出力・描画回帰33/33、横型・縦型の描画後QCはいずれも合格した。最後にkawafmmが新しい2本を目視し、「改行は良さそう」と合格認定した。crop・音声・終端の先行合格も維持している。

## 2. ユーザーから見た変化

- 横型では31個の字幕がすべて1行になり、短い文に不要な改行が入らなくなった。
- 縦型では1行で実際の字幕枠へ収まる文は1行になり、文字・縁・光彩・安全領域を含めて収まらない文だけが2行になった。
- 字幕本文、発話時刻、意味のまとまり、crop、音声、動画の開始・終了は変えていない。
- 改行はAIへ再問い合わせせず、出力側が入力された幅と実描画の成立条件から決定した。API通信は0回、追加費用はUS$0だった。

## 3. 実行した操作

1. 人間観測「短い文でも必ず改行される」を、旧規則の「同じページ数なら2行を優先する」選択まで追跡した。
2. 表示候補の選択順を「ページ数最少 → 総行数最少 → 最大行幅 → 必要な改行内の幅の釣り合い → 決定的な境界順」へ変更した。
3. 1行候補と2行候補が同時に成立するとき1行を選ぶ検査、横型・縦型の実データfixture検査、既存の描画経路回帰を実行した。
4. 保存済みの意味情報、基礎映像、横型・縦型style、cropを再利用し、新しい版付き出力先へ横型1本・縦型1本を正式描画した。
5. 動画、描画計画、manifest、QC、音声payload、旧動画のSHAを再照合した。
6. kawafmmが新しい2本を目視し、改行を合格認定した。
7. 本レポート作成時は再描画やAPI通信を行わず、保存済み成果物と検査ログを読み取り専用で再照合した。

## 4. 保存データの確認

確認した主な保存データ:

- 実行入力記録: `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/run-input-record.json`
- 人間承認済み組立決定: `evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json`
- 組立確認の人間回答: `evals/clip_composition/outputs/presentation/source-assembly-human-results/qdczJpv8RCc-candidate-59-v001.json`
- 意味情報パッケージ: `evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-meaning-output-first-run-meaning-package-v002-meaning-information/meaning-information-package.json`
- 横型表示計画: `evals/clip_composition/outputs/presentation/meaning-output-control/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/render-plan.json`
- 縦型表示計画: `evals/clip_composition/outputs/presentation/meaning-output-control/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002/render-plan.json`

接続値は、元配信`youtube:qdczJpv8RCc`、candidate 59、`sourceStartMs=5941162`、`sourceEndMs=5992736`で、組立決定・実行入力記録・意味情報パッケージの単一区間が一致した。元媒体SHA-256は`8359f59d8c205fb815c9165f5a464ec4bb9f109f9d91384b80e571410dc2fa25`である。

候補プール、候補選抜ログ、`CandidateSelectionBinding`は今回のforward-only表示経路が使う成果物体系ではなく、今回の改行変更では新規生成・変更・再照合していない。人間判断はcandidate 59の組立承認記録と今回の完成動画目視結果で確認した。

## 5. UI確認

ZEV本体UIは今回起動していない。UI文言や候補選択画面の確認も今回の対象外である。

一方、完成動画そのものはkawafmmが横型・縦型とも目視し、「改行は良さそう」と合格認定した。これは機械検査ではなく、人間による見た目の最終確認として`DECISIONS.md`へ記録した。UIスクリーンショットは取得していない。

## 6. 出力動画の確認

横型:

- path: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003-output/presentation-output-rendered-v001.mp4`
- SHA-256: `175dc67489e86b2fc364894a737693a14a9c7c27fab492c0cb1873aedd6a77bc`
- 1920×1080、30fps、1,547 frame、51.566667秒
- 31字幕、31ページ、31行。31ページすべて1行。最大論理幅32／入力上限36
- 描画後QC: 合格

縦型:

- path: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002-output/presentation-output-rendered-v001.mp4`
- SHA-256: `eeb72350373be88022966059f09cd9b3f474a005ffa3cc18db8417eafdaa9618`
- 1080×1920、30fps、1,547 frame、51.566016秒
- 31字幕、38ページ、61行。1行15ページ、2行23ページ。最大論理幅12／入力上限14
- 描画後QC: 合格

共通確認:

- 元動画範囲は`[5941162, 5992736)`msで、人間承認済み組立決定と一致した。
- 音声はAAC、48kHz、2ch。QC上のsample数は両方2,475,200で、音声packet payload SHA-256は両方`d18469bd3132356b03870ee8bc3d63e95947bd254961157e09d59cf9a53459ec`だった。
- crop・音声・終端は先行する人間確認で問題なし。今回の目視でも改行が合格した。
- 今回の2本は正式描画経路から出した確認動画であり、別の簡易previewとの一致比較はない。人間が確認したのは上記の正式出力実体である。
- 人間カットは承認済み単一区間をそのまま使用した。AIによる映像削除・字幕本文削除はなく、変更したのは表示時の行分割だけである。

## 7. 正本の分離確認

- 字幕本文・発話時刻・AtomRef列の正本は意味情報パッケージのままで、改行処理は表示計画だけを作る出力側に限定されている。
- `ShortDraftPlan`、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`ReviewPacket`、`comparisonItems`は今回変更したplannerの入力・出力に使っていない。
- `comparisonItems`から採用理由を復元する処理、近い時刻から候補接続を推測する処理、旧成果物を新schemaへ変換する処理は追加していない。
- 今回確認できたのはこのforward-only表示経路の分離であり、ZEV本体全体の候補選抜画面・旧データ経路を再検証したものではない。

## 8. 合格判定チェック

1. 出力本数入力が廃止されている: 要確認（今回対象外）
2. 抽出時に完成ショートが自動生成されない: 要確認（今回対象外）
3. 候補プールが保存される: 要確認（今回対象外）
4. 候補選抜ログが保存される: 要確認（今回対象外）
5. 上位漏れ候補が not_selected として残る: 要確認（今回対象外）
6. 人間が候補を選んでショート化できる: OK（candidate 59の人間承認済み組立決定と完成動画を確認）
7. 完成ショートに CandidateSelectionBinding が保存される: 要確認（今回経路は異なる成果物体系）
8. 採用理由は厳密接続できる場合だけ表示される: 要確認（UI未確認）
9. comparisonItems を正本にしていない: OK（今回変更経路では未参照）
10. 旧データは再生成案内になる: 要確認（今回対象外）
11. sourceStartMs / sourceEndMs を使っている: OK
12. startMs / endMs を新しい正本にしていない: OK

## 9. 問題点

確認範囲では重大な問題なし。

検査期待を整える途中のtest-only不合格attemptと、制限環境でChromiumを起動できなかった検査attemptは版付きで保持されている。最終合格根拠はplanner 27/27とネイティブ環境の正式出力・描画回帰33/33だけであり、失敗を成功へ読み替えていない。

## 10. まだ未実装のこと

- 今回の人間目視合格を含むコミットと安定点tagは未作成。
- ZEV本体UIで横型・縦型を並べて確認する導線は今回未確認。
- 非空タイトル表示、G4〜G7演出、無音・間の調整、遠距離の意味サポート場面、公開工程は今回の完成物に含まれない。
- 正式runnerが安全保持した横型約988MB、縦型約1.2GBのQC作業領域とlockは未削除。

## 11. 参考: 不足している可能性のある機能

1. **完成動画2形式のUI比較導線**
   - 根拠: 完成動画の人間目視は確認できたが、ZEV本体UIは今回起動していない。
   - 影響: 毎配信運用で2形式を確認する操作が別途必要になる可能性がある。
   - 扱い: 確認不足。今回の改行不具合ではない。
2. **QC作業領域の承認付き後片付け**
   - 根拠: 約2.2GBの作業領域とlockを安全規律に従って保持している。
   - 影響: 試行を重ねるとディスク使用量が増える。
   - 扱い: 今後の運用機能。削除は別判断が必要。
3. **人間合格後の安定点化**
   - 根拠: コミット・tag未作成をgit状態と記録で確認した。
   - 影響: 現時点の撤退先が版付きで確定していない。
   - 扱い: 今後の記録作業。動画品質の欠陥ではない。

## 12. 次に直すべきこと

1. 改行ロジック自体に追加修正は不要。
2. この結果を撤退点にする場合だけ、関連ファイルの範囲を確認してコミット・安定点tagを作る。
3. QC作業領域を消す場合は、保持不要の判断を別途受けてから削除する。

## 13. 実行コマンドとテスト結果

成功:

```sh
for f in evals/clip_composition/reports/presentation/test-runs/20260806-page-line-wrap-policy-v005/planner.tap evals/clip_composition/reports/presentation/test-runs/20260806-page-line-wrap-policy-render-plan-native-v002/render-plan.tap; do echo "$f"; tail -n 20 "$f"; done; wc -c evals/clip_composition/reports/presentation/test-runs/20260806-page-line-wrap-policy-v005/planner.stderr evals/clip_composition/reports/presentation/test-runs/20260806-page-line-wrap-policy-render-plan-native-v002/render-plan.stderr; shasum -a 256 evals/clip_composition/presentation_output_page_line_planner_v001.mjs evals/clip_composition/presentation_output_page_line_planner_v001.test.mjs evals/clip_composition/presentation_output_render_plan_v001.test.mjs evals/clip_composition/reports/presentation/presentation-output-page-line-wrap-policy-completion-20260806-v001.md
```

- planner 27/27、正式出力・描画回帰33/33。両stderrは0 byte。

```sh
for d in qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003-output qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002-output; do root="evals/clip_composition/outputs/presentation/meaning-output-renders/$d"; shasum -a 256 "$root/presentation-output-rendered-v001.mp4" "$root/presentation-output-render-manifest-v001.json" "$root/presentation-output-render-qc-v001.json" "$root/presentation-output-render-application-results-v001.json"; ffprobe -v error -show_entries format=duration -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels,duration_ts -of json "$root/presentation-output-rendered-v001.mp4"; jq '{schemaVersion,status,checks,metrics,output}' "$root/presentation-output-render-qc-v001.json"; jq '{schemaVersion,status,output,metrics,planBinding,meaningInformationPackageBinding,baseMediaBinding}' "$root/presentation-output-render-manifest-v001.json"; done
```

- 2本の動画SHA、解像度、frame数、尺、音声条件、基礎映像bindingを再確認した。

```sh
for p in evals/clip_composition/outputs/presentation/meaning-output-control/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/render-plan.json evals/clip_composition/outputs/presentation/meaning-output-control/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002/render-plan.json; do jq '{captionCount:(.captionDisplays|length),pageCount:([.captionDisplays[].pages[]]|length),lineCount:([.captionDisplays[].pages[].lines[]]|length),oneLinePages:([.captionDisplays[].pages[]|select((.lines|length)==1)]|length),twoLinePages:([.captionDisplays[].pages[]|select((.lines|length)==2)]|length),maxLogicalWidth:([.captionDisplays[].pages[].lines[].logicalWidth]|max),minLogicalWidth:([.captionDisplays[].pages[].lines[].logicalWidth]|min)}' "$p"; done
```

- 横型31字幕・31ページ・31行、縦型31字幕・38ページ・61行を確認した。

失敗:

- 今回の報告作成中の完成物再照合は失敗0件。
- 実装途中のtest-only不合格と制限環境のChromium起動不成立は、最終合格根拠から分離して保存済み。

未実行:

- 本レポート作成時の動画再描画、API通信、ZEV本体UI起動、ChatGPT投稿、コミット、tag作成、作業領域削除。
- ChatGPT投稿は、投稿先セッション名と投稿コマンドが指定されていないため実行していない。

## 14. 証拠

- 人間確認: kawafmm発言「改行は良さそうだったよ」。`DECISIONS.md`へ2026-08-06の人間目視合格として記録。
- planner検査: `evals/clip_composition/reports/presentation/test-runs/20260806-page-line-wrap-policy-v005/planner.tap`（27/27）
- 正式出力・描画回帰: `evals/clip_composition/reports/presentation/test-runs/20260806-page-line-wrap-policy-render-plan-native-v002/render-plan.tap`（33/33）
- 横型QC: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003-output/presentation-output-render-qc-v001.json`（passed）
- 縦型QC: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002-output/presentation-output-render-qc-v001.json`（passed）
- 変更後planner SHA-256: `febb8c489db4585369d1d77f9cdcca02fe591cc83ceeae309896ad3e37f95262`
- 旧横型mp4 SHA-256: `c324de226a63397fb83eba13b341b96aa17963bc9c1d49bd5a66987dc8338aa1`（不変）
- 旧縦型mp4 SHA-256: `e1e3c14e73b511b7cadf24ca2cc71592eff60216168b91d25c7bbb31f0c3c58d`（不変）
- 実装前の完了報告: `evals/clip_composition/reports/presentation/presentation-output-page-line-wrap-policy-completion-20260806-v001.md`。同報告の「目視未確認」は今回の人間回答前の履歴として保持し、本v002が目視後の結論を記録する。
- UIスクリーンショット: なし。
- ChatGPT投稿: 未実行。
