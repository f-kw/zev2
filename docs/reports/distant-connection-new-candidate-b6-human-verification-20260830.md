実行した:
はい

実行できなかった場合:
該当なし。ZEVの製品UIは起動しておらず、正式selection・正式renderは実行していない。代わりに、保存済み候補成果物、provenance、重複照合、元動画から作った直接再生用MP4、人間の目視評価を確認した。

---

# 完成物検証レポート

## 1. 結論

一部ズレあり

Lunaから候補を1件生成し、正式候補成果物として保存・検査する技術経路は意図どおり動いた。
一方、得られた候補は「配信冒頭のゲーム紹介」と「配信終了時の振り返り」を結んだだけで、普通の視聴者には開始と終了の対応自体が伝わらず、理解・回収感・意外性・面白さの増分もなかった。
したがって候補生成処理は成功、候補品質は不合格であり、正式selection以降へ進めないのが正しい状態である。

## 2. ユーザーから見た変化

- 実配信 `ymUsGrT6EaA` の全文を対象に、Lunaが新しい遠方接続候補を1件生成した。
- 候補は正式selectionへ自動昇格せず、人間未採否・区間未承認の候補成果物として保存された。
- 当初のローカルHTML確認ページは、元動画を実用的に確認できないため確認手段として失敗した。
- 代わりに、候補が指した前半と後半を直接つないだ13.166667秒の一時MP4を作り、実映像で評価した。
- 人間評価では「オープニングからエンディングへの対応だと推測しなければ分からず、分かっても面白くない」と判定され、候補選択不合格となった。

## 3. 実行した操作

1. 固定済みのLuna exact requestとsource packageのSHA bindingを確認した。
2. GPT-5.6 LunaへB6候補生成を1回だけ実行した。
3. raw応答を先に保存し、正式候補1件と実行manifestを生成した。
4. strict validator、provenance、SHA binding、同一入力からのbyte再構築を検査した。
5. 過去11候補と発話ID単位で重複照合した。
6. HTML確認ページを提示したが、人間が実用的に確認できないことが判明した。
7. 元動画から候補発話の前半・後半を直接つないだ一時MP4を生成し、人間が映像を確認した。
8. 人間評価に基づき、正式selection・字幕判断・renderer・QCへ進めないと判定した。

## 4. 保存データの確認

確認した保存データ:

- 候補成果物: `evals/clip_composition/outputs/work-distant-connection-luna-b6-new-candidates-ymUsGrT6EaA-v001/candidate-response-v001.json`
  - SHA-256: `cd21549ffa65b749e76c44710ccc6a92bdcf3ca99d07df4e281f5becf3277216`
  - `sourceVideoId`: `ymUsGrT6EaA`
  - candidate ID: `candidate-horror-game-to-screams-001`
- 実行記録: `evals/clip_composition/outputs/work-distant-connection-luna-b6-new-candidates-ymUsGrT6EaA-v001/b6-run-manifest-v001.json`
  - SHA-256: `4835f7e3ed77d760b227c4019755c6628f2244883159d6a23871df2c27356183`
- raw応答: `evals/clip_composition/outputs/work-distant-connection-luna-b6-new-candidates-ymUsGrT6EaA-v001/attempt-0001/raw-response-v001.json`
  - SHA-256: `ec1b1bd88060c546943c5dc9bf8cf55c956cfd0987c185ebb5c221f2aae1a94b`
- 重複照合: `evals/clip_composition/outputs/work-distant-connection-luna-b6-new-candidates-ymUsGrT6EaA-v001/human-review-v001/duplicate-audit-v001.json`
  - SHA-256: `42e725e97946dad6fac3a40f8d8e0c82a581cf9dc2be35c0869a5f6741d7c5a8`
- 正式意味発話: `evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json`
- 一時確認動画: `/private/tmp/zev-candidate-horror-game-to-screams-001-review.mp4`
  - SHA-256: `18f5193a2944b732450dacf70ca440ad73dcd6f0656dff40b53e41d0859fd684`

候補が指した意味発話範囲:

- 前半: `249378–255324 ms`、「今年一怖いと言われるホラーゲーム」
- 後半: `6134433–6141636 ms`、「首痛え叫んだねはよく叫んだわ」
- 前半終了から後半開始まで: `5,879,109 ms`（97分59.109秒）

候補プール、候補選抜ログ、完成ショート、`CandidateSelectionBinding`は作成されていない。候補は人間不採用のため、これは正常である。人間の今回の不採用評価は、現時点では新しい正式human review成果物としては未保存である。

## 5. UI確認

ZEVの製品UIは起動していないため、実行した: いいえ。

ローカルHTML確認ページは生成済みだが、元動画参照方式ではユーザーが実用的に確認できなかった。したがって、確認UIとして合格扱いにはしない。直接再生用MP4をCodex画面で提示し、人間評価を得た。

## 6. 出力動画の確認

正式ショート動画は生成していない。

人間確認専用の一時MP4のみ生成した。

- path: `/private/tmp/zev-candidate-horror-game-to-screams-001-review.mp4`
- 尺: `13.166667秒`
- 前半: `249378–255324 ms`
- 後半: `6134433–6141636 ms`
- 音声: 前半・後半とも元動画音声を含めて連結
- 字幕: なし
- 正式render/QC: 未実行

人間確認結果:

- オープニングとエンディングをつないだ候補に見える。
- その関係は動画だけでは普通の視聴者に伝わらない。
- 関係を理解しても面白さや回収感が増えない。
- 区間化ではなく候補選択の問題として不採用。

## 7. 正本の分離確認

- Lunaの候補成果物は意味候補の正本として保存され、正式selectionにはしていない: OK
- 人間未採否の候補から候補選抜ログや完成ショートを捏造していない: OK
- 一時確認動画を正式render結果として扱っていない: OK
- `ShortDraftPlan`を直接書き換えていない: OK
- `CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`ReviewPacket`を今回候補へ推測接続していない: OK
- `comparisonItems`から採用理由を復元していない: OK

## 8. 合格判定チェック

1. 出力本数入力が廃止されている: 要確認（今回の検証範囲外）
2. 抽出時に完成ショートが自動生成されない: OK
3. 候補プールが保存される: 要確認（今回はLuna候補成果物で停止）
4. 候補選抜ログが保存される: 要確認（人間不採用のため未生成）
5. 上位漏れ候補が not_selected として残る: 要確認（今回の検証範囲外）
6. 人間が候補を選んでショート化できる: 要確認（今回は不採用）
7. 完成ショートに CandidateSelectionBinding が保存される: 要確認（完成ショート未生成）
8. 採用理由は厳密接続できる場合だけ表示される: OK（採用理由を表示していない）
9. comparisonItems を正本にしていない: OK
10. 旧データは再生成案内になる: 要確認（今回の検証範囲外）
11. sourceStartMs / sourceEndMs を使っている: OK（正式意味発話の時刻を使用）
12. startMs / endMs を新しい正本にしていない: OK

## 9. 問題点

問題:
候補生成が、視聴者に伝わる具体的な回収ではなく、配信の冒頭と終了という時系列上の対応を遠方接続として選んだ。

該当箇所:
`candidate-horror-game-to-screams-001`

なぜ問題か:
前半と後半がオープニング／エンディングだという外部的な解釈を要求し、その解釈ができても後半の理解・回収感・意外性・面白さが増えない。遠方接続の目的を満たさない。

再現手順:
一時確認動画を前半から後半まで再生する。

修正案:
探索条件へ、単なる配信開始時の一般説明と終了時の総括、または時系列上の対称性だけでは不十分であり、前半の具体的内容が後半の具体的出来事・反応・結果を視聴者に分かる形で強く回収する必要があることを反映する。

優先度:
高

問題:
確認ページがローカル元動画参照に依存し、ユーザーがその場で候補を確認できなかった。

該当箇所:
`human-review-v001/review.html`

なぜ問題か:
候補確認のゲートで内容を再生できず、人間採否ができない。

再現手順:
確認ページだけを開いて候補前後を確認しようとする。

修正案:
今後の候補確認物は、候補の前半→後半を直接再生できる独立MP4として渡す。HTMLを使う場合も、再生可能な生成済み短尺動画を参照し、巨大な元動画のローカルseekへ依存しない。

優先度:
高

## 10. まだ未実装のこと

- 今回の人間不採用評価を正式なreview成果物へ保存する処理。
- 今回の失敗知見を次回Luna探索条件へ反映する処理。
- 人間が承認できる独立MP4を候補生成後に正式生成する共通確認経路。
- 正式selection、AI字幕区切り、execution、renderer、QC。今回は候補不採用のため意図的に未実行。

## 11. 参考: 不足している可能性のある機能

1. 候補生成直後の直接再生用確認MP4
   - 証拠: 確認ページでは確認できず、一時MP4へ切り替えて初めて人間評価できた。
   - ユーザー影響: 候補採否ゲートを通過できない。
   - 扱い: 実行で確認した不足機能。

2. 正式selection前の人間不採用評価の保存先
   - 証拠: 候補成果物と重複照合は保存済みだが、今回の人間評価は正式成果物に未保存。
   - ユーザー影響: 同型候補を避ける教師履歴として追跡しにくい。
   - 扱い: 保存データ確認で判明した未接続機能。

3. 一般的な冒頭説明の再利用抑制
   - 証拠: 過去11候補との照合で、前半発話が4候補と一致した。
   - ユーザー影響: 同じ弱い前振りが別の後半と繰り返し結ばれる。
   - 扱い: 探索品質上の未実装または検証不足。単純な一律除外ではなく、具体的な強い回収がある場合は残す必要がある。

## 12. 次に直すべきこと

1. 今回の評価を「候補選択fail。開始と終了の対応は視聴者に伝わらず、面白さの増分もない」と正式保存する。
2. Luna探索条件へ「OP→ED、一般説明→終了時総括など、時系列上の対応だけでは不可。短尺内で具体的な回収が伝わること」を追加する。
3. 次回以降の人間確認物を、直接再生できる独立MP4へ統一する。

## 13. 実行コマンドとテスト結果

実行した主なコマンド:

```text
runner/node_modules/.bin/tsx --test runner/test/distant-connection-luna-b6-result-v001.test.mts
corepack pnpm --filter @zev2/agent-runner type-check
ffprobe -v error -show_entries format=duration,size -of json /private/tmp/zev-candidate-horror-game-to-screams-001-review.mp4
shasum -a 256 /private/tmp/zev-candidate-horror-game-to-screams-001-review.mp4
```

成功:

- Luna B6成果物検査: 11/11合格
- runner型検査: 合格
- candidate/manifest byte再構築: 合格
- provenance・SHA binding: 合格
- 一時MP4生成・再生用container生成: 成功

失敗:

- `node --import tsx --test ...` はworkspace rootから`tsx`を解決できず失敗した。
- sandbox内の`tsx --test`は一時socketの権限制約で失敗した。sandbox外で同一検査を再実行し、11/11合格した。
- ローカルHTML確認ページは、人間確認手段として不合格だった。

未実行:

- ZEV製品UI起動
- 正式selection
- AI字幕区切り
- 正式renderer/QC
- 新しいGemini通信
- 2回目のLuna実行
- ChatGPT投稿（投稿先・投稿指示が指定されていないため）

## 14. 証拠

- Luna provider response ID: `resp_067536092ff023b2016a93e7fb1f6087d094ed2ebf2e104599`
- model / reasoning: `gpt-5.6-luna` / `medium`
- API通信: 1回
- input tokens: `893,214`
- output tokens: `1,818`
- reasoning tokens: `1,320`
- 実費: `US$0.4498791`
- 候補成果物SHA: `cd21549ffa65b749e76c44710ccc6a92bdcf3ca99d07df4e281f5becf3277216`
- 完全一致候補: 0件
- 同一前半発話を使う過去候補: 4件
- commit: `856fdd356a6ba8407c85c6cb02935b47f3d5adaa`
- tag: `stable/distant-connection-new-candidate-b6-v001-20260830`
- 人間評価: 「オープニングとエンディングをつないだものに見えるが、それ自体が普通の人に伝わらず、見ても面白くない」
- 最終状態: 候補不採用。正式selection・字幕判断・rendererへ未接続。
