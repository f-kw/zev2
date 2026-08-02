実行した:
いいえ

実行できなかった場合:
ZEV本体は起動していない。ローカルの確認ページをアプリ内ブラウザで開こうとしたが、`file://` URLがブラウザの許可範囲外として拒否された。
代替で確認した内容

- 保存済み確認ページ、事前検査、manifest、表示計画、元発話、完成MP4を読み取り確認した。
- manifest記載の成果物10件を再計算し、SHA-256が全件一致することを確認した。
- 完成MP4の映像・音声・尺を調べ、QA画像を目視した。
- kawafmmが同じMP4を見て「これでOK」と判定した記録を `DECISIONS.md` で確認した。

---

# 完成物検証レポート

## 1. 結論

意図どおり動いている（縦型字幕previewの確認範囲）。

話者1人の動画に対するcropと、1行最大7文字・最大2行・134pxの字幕は、保存物の検査に合格し、kawafmmの目視でも合格している。  
ただし、確認対象は既存字幕3場面をつないだ5.33秒の見た目候補である。正式な縦型プリセット登録、本体の通常経路への接続、51.6秒全編の縦型完成動画はまだ成立していない。

## 2. ユーザーから見た変化

- 話者1人だけの動画では、意味のない上下分割を使わず、人物全体を中心に切り出した縦画面を確認できる。
- 字幕は1行最大7文字、最大2行へ短く刻まれ、左右の余白を使って134pxまで大きく表示される。
- 文字は全場面で同じ大きさ、縁11px、光彩17pxで表示される。
- 134pxでは実描画が安全領域内に収まり、135pxでは安全領域の右端に最も近い検査字幕が4px越えるため、134pxが採用された。
- この見た目は「話者1人」型の候補として合格した。別の動画型へ同じ構成を固定する判断ではない。

## 3. 実行した操作

1. `DECISIONS.md` と関連する工程・演出・動画生成の文書を読み、今回の確認範囲を特定した。
2. previewの入力5件、事前検査、manifest、成果物10件を読み取り、保存SHAと現物を照合した。
3. 表示計画から、使用した字幕3件の本文、元配信時刻、発話文字IDを確認した。
4. MP4のSHA-256、解像度、フレーム数、尺、音声形式を確認した。
5. 以前の目視合格版とv008の音声を復号して比較し、音声内容のSHA-256が一致することを確認した。
6. QA画像を目視し、字幕の欠け、画面外、行の重なりが見えないことを確認した。
7. runner本体と描画部分の型検査を実行した。
8. v008生成スクリプト単体の型検査を実行し、不合格を確認した。
9. ローカル確認ページをアプリ内ブラウザで開こうとしたが、URL制限により実行できなかった。

新しい動画生成、外部通信、コード修正、正式プリセット登録は行っていない。

## 4. 保存データの確認

確認した主な保存物:

- 基礎映像: `evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/base-media.mp4`
- 残存発話: `evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/source-atoms.json`
- 表示計画: `evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json`
- crop判断: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006/crop-decision-v006.json`
- 事前検査: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/preflight.json`
- 成果物一覧: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/preview-manifest.json`
- 人間判断: `DECISIONS.md`

元配信は `youtube:qdczJpv8RCc`。使用した3字幕は次の元配信範囲へ厳密に接続されている。

- `caption-cue-000003`: 5,948,907–5,949,827ms、「これやばいよね」
- `caption-cue-000006`: 5,955,951–5,958,653ms、「やり始めるから / あっちこっちで」
- `caption-cue-000014`: 5,984,951–5,986,672ms、「困ったもんです」

今回の成果物は候補選抜機能の検証ではないため、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、完成ショート情報は対象外であり、再検証していない。candidate 59との対応は版付き保存パス、元配信ID、表示計画、発話ID、時刻から確認したが、候補選抜ログへの厳密ID接続を検証したという意味ではない。

## 5. UI確認

ZEV本体のUIは起動確認していない。確認ページをアプリ内ブラウザで再実行することも、`file://` URL制限によりできなかった。

保存済みHTMLでは、確認文言が「字幕が横幅いっぱいの大きさになり、読みやすく見えるか。」であり、1行最大7文字、134px、縁11px、光彩17pxが表示されることを確認した。kawafmmはこのページの対象MP4を目視し、「これでOK」と回答している。

manifestの状態名はまだ `ready_for_one_human_visual_check` のままで、人間合格は `DECISIONS.md` に別記されている。

## 6. 出力動画の確認

確認用MP4:

`evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/vertical-fullwidth-caption-review-v008.mp4`

- SHA-256: `24a632ff99acadf97c2a18762420a7db4ecbc4b4b374b9bcae3d0d41bd3fe650`
- 映像: H.264、1080×1920、30fps、160フレーム
- 音声: AAC、48kHz、2ch
- 尺: 5.333008秒
- 内容: 既存表示計画の3字幕場面だけを連結した確認用preview
- 人間カット: 今回は新規判断なし。既に承認された発話境界だけを使用
- AI削除意図: 今回は削除判断なし
- 音声維持: 以前の目視合格版と復号音声SHA-256が一致
- プレビューと本番レンダリングの一致: 未確認。正式な縦型完成動画は生成していない

## 7. 正本の分離確認

今回のpreview経路が読む正本は、基礎映像、残存発話、表示計画、crop判断、既存プリセットである。

- `ShortDraftPlan`: 読み書きしていない。
- `CandidatePool`: 読み書きしていない。
- `CandidateSelectionLedger`: 読み書きしていない。
- `CandidateSelectionBinding`: 読み書きしていない。
- `ReviewPacket`: 読み書きしていない。
- `comparisonItems`: 正本にも接続推測にも使っていない。

人間の見た目判断は `DECISIONS.md` に保存され、表示計画や元発話を書き換えていない。今回確認した範囲では、正本の混在は見つからなかった。

## 8. 合格判定チェック

以下は候補選抜機能向けの確認項目である。今回の対象は縦型描画previewのため、対象外の項目を合格扱いにはしていない。

1. 出力本数入力が廃止されている: 要確認（今回の対象外）
2. 抽出時に完成ショートが自動生成されない: 要確認（今回の対象外）
3. 候補プールが保存される: 要確認（今回の対象外）
4. 候補選抜ログが保存される: 要確認（今回の対象外）
5. 上位漏れ候補が not_selected として残る: 要確認（今回の対象外）
6. 人間が候補を選んでショート化できる: 要確認（今回の対象外）
7. 完成ショートに CandidateSelectionBinding が保存される: 要確認（今回の対象外）
8. 採用理由は厳密接続できる場合だけ表示される: 要確認（今回の対象外）
9. comparisonItems を正本にしていない: OK（今回確認したpreview経路では未参照）
10. 旧データは再生成案内になる: 要確認（今回の対象外）
11. sourceStartMs / sourceEndMs を使っている: OK（表示計画の3字幕で確認）
12. startMs / endMs を新しい正本にしていない: OK（元発話ID、sourceStartMs、sourceEndMsで接続）

## 9. 問題点

見た目と保存成果物については、確認範囲で重大な問題なし。

問題:
v008生成スクリプトが通常の型検査対象に含まれず、単体型検査では不合格になる。

該当箇所:
`runner/scripts/build-vertical-fullwidth-caption-preview-v001.ts`

なぜ問題か:
成果物の実描画と事前検査は成立しているが、正式経路へ移す際に型の不一致を残したまま再利用できるとは言えない。runner本体の型検査合格だけでは、このスクリプトの型安全を証明しない。

再現手順:
`corepack pnpm --filter @zev2/agent-runner exec tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --types node --allowImportingTsExtensions --skipLibCheck scripts/build-vertical-fullwidth-caption-preview-v001.ts`

修正案:
正式化時に、共通描画処理を型検査対象の正式経路から呼び、候補専用previewスクリプトを正式実装として流用しない。必要ならスクリプト自身の型不一致も別工程で解消する。

優先度:
中。今回の目視結果は無効にならないが、正式プリセット接続より前に扱う。

問題:
合格したv008成果物、完了報告、生成スクリプト、`DECISIONS.md` の追記がGitの安定点へ固定されていない。

該当箇所:
作業ツリー上のv008一式と関連記録。

なぜ問題か:
現在の実体はSHAで照合できるが、撤退可能なコミット・タグとしては保存されていない。

再現手順:
対象pathに対して `git status --short` を実行する。

修正案:
正式化の節目で、関係する成果物と正本記録を読み直し、意図した範囲だけをコミットして安定点化する。

優先度:
中。

## 10. まだ未実装のこと

- 合格値を縦型プリセット台帳へ正式登録し、信頼情報を固定する処理。
- 動画型判定から `speaker_only` 用縦型プリセットを選び、正式な演出指示書を通してrendererへ渡す接続。
- candidate 59の全281文字を、意味の切れ目を保った約7文字・最大2行へ分割する処理。
- 約51.6秒のcandidate 59全編を縦型で描画し、描画後QCを通す処理。
- `screen_speaker`、`speaker_pair` など別画面型の縦型見た目認定。
- G4〜G7、素材、SEを含む演出。今回の合格は基本字幕の見た目だけである。

## 11. 参考: 不足している可能性のある機能

1. 縦型プリセットの正式登録と選択
   - 根拠: コード・保存物確認。v008は独立したpreviewで、通常runnerから参照されていない。
   - ユーザー影響: 新しい動画を通常経路へ入れても、今回の134px表示が自動選択されない。
   - 扱い: 今後の未実装。

2. candidate 59全編の短い字幕分割
   - 根拠: 保存物確認。v008は既存3字幕だけで、281文字全体ではない。
   - ユーザー影響: 51.6秒の縦型一本としてはまだ見られない。
   - 扱い: 今後の未実装。

3. 別画面型に対応する縦型プリセット
   - 根拠: 今回実行したのは `speaker_only_body` だけ。
   - ユーザー影響: ゲーム画面付き・2人画面で適切な構成になるかは分からない。
   - 扱い: 確認不足。未確認のまま不具合とは断定しない。

4. 人間合格状態のmanifest反映
   - 根拠: manifestは確認待ちのまま、人間合格は `DECISIONS.md` に別記。
   - ユーザー影響: manifest単体では最終状態が分からない。
   - 扱い: 確認不足。現行の承認正本が `DECISIONS.md` であるため、直ちに欠陥とは断定しない。

5. 正式な再現可能性
   - 根拠: v008一式が未追跡で、生成スクリプト単体型検査も不合格。
   - ユーザー影響: 現在の成果物は見られるが、別環境・将来commitで同じ結果を再生成できる保証が弱い。
   - 扱い: 正式化前の問題。

## 12. 次に直すべきこと

1. 人間合格した134px・7文字・最大2行の値を、`speaker_only` 用の正式な縦型プリセットとして登録する。
2. 281文字全体の字幕分割とプリセットIDを正式指示書からrendererへ渡し、candidate 59全編を1本描画する。
3. 全編MP4の描画後QCを通した後、人間は完成字幕を1回だけ目視する。別画面型はその後に別プリセットとして扱う。

## 13. 実行コマンドとテスト結果

成功:

```sh
shasum -a 256 evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/vertical-fullwidth-caption-review-v008.mp4
```

結果: MP4 SHA-256はmanifestおよび人間判断記録と一致。

```sh
ffprobe -v error -show_entries format=duration,size -show_entries stream=index,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels -of json evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/vertical-fullwidth-caption-review-v008.mp4
```

結果: 1080×1920、30fps、160フレーム、5.333008秒、AAC 48kHz・2ch。

```sh
jq -e '.status == "passed" and ([.checks[]] | all)' evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/preflight.json
```

結果: `true`。事前検査16項目が全て合格。

```sh
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node -e 'const fs=require("fs"),c=require("crypto"),p="evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/preview-manifest.json",m=JSON.parse(fs.readFileSync(p)),bad=m.artifacts.filter(a=>c.createHash("sha256").update(fs.readFileSync(a.path)).digest("hex")!==a.fileSha256); console.log(JSON.stringify({checked:m.artifacts.length,mismatches:bad.length}))'
```

結果: `{"checked":10,"mismatches":0}`。

```sh
ffmpeg -v error -i evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v003/vertical-fullwidth-caption-review-v003.mp4 -map 0:a:0 -f hash -hash sha256 -
ffmpeg -v error -i evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/vertical-fullwidth-caption-review-v008.mp4 -map 0:a:0 -f hash -hash sha256 -
```

結果: 両方とも復号音声SHA-256は `276a6a044b37be5ccaff2e278f2206fcb224b374ed459e5e47f57a0e6162446e`。

```sh
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node runner/node_modules/typescript/bin/tsc -p runner/tsconfig.json --noEmit
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node runner/node_modules/typescript/bin/tsc -p runner/tsconfig.remotion.json
```

結果: どちらも合格。ただし、両設定の対象は `runner/src/` であり、v008生成スクリプトは含まない。

失敗:

```sh
corepack pnpm --filter @zev2/agent-runner exec tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --types node --allowImportingTsExtensions --skipLibCheck scripts/build-vertical-fullwidth-caption-preview-v001.ts
```

結果: 終了code 2。`TS2775` 42件、`TS2741` 2件。実行時変換で成果物は生成済みだが、単体の型検査には合格していない。

アプリ内ブラウザ操作:

```text
file:///Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/review.html を開く
```

結果: Browser URL policyにより拒否。

未実行:

- ZEV本体の起動と通常UIからの再生。
- v008の再生成。
- 正式プリセット登録、本体接続、全編動画生成。
- 外部API通信。
- Git commit、stable tag。
- ChatGPTへの投稿。投稿先セッション名・投稿コマンドの指定なし。

## 14. 証拠

- 人間合格記録: `DECISIONS.md` 19行目
- 確認ページ: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/review.html`
- 完成MP4: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/vertical-fullwidth-caption-review-v008.mp4`
- QA画像: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/qa-frame-middle.png`
- 事前検査: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/preflight.json`
- 成果物一覧: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/preview-manifest.json`
- crop判断: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006/crop-decision-v006.json`
- 表示計画: `evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json`
- MP4 SHA-256: `24a632ff99acadf97c2a18762420a7db4ecbc4b4b374b9bcae3d0d41bd3fe650`
- 事前検査: 16/16合格
- manifest成果物照合: 10/10一致
- 人間作業: 目視判断1件を受領済み。追加の必須作業0件。
