実行した:
いいえ

実行できなかった場合:
今回の依頼は現在地の検証報告であり、ZEVの画面を新しく起動する操作、Google Gemini Developer APIへの送信、字幕付き完成動画の生成は行っていない。候補59は、外部送信を伴う字幕分割のtoken計測直前で停止している。

代替で確認した内容:
保存済みの人間回答、正式な組立決定、基礎映像、残存発話、Geminiへ渡す直前の字幕入力package、B5実行job、完了・停止報告、媒体の実測情報とSHA-256を読み取りで照合した。

---

# 完成物検証レポート

## 1. 結論

実行確認できていない

候補59では、人間が確認した切り出しを正式化し、51.566667秒の基礎映像と、字幕を考えるための281文字・2まとまり・164個の行末候補まで作成できている。  
一方、Geminiへのtoken計測、字幕分割の生成、表示計画、字幕描画、字幕付き完成動画は未実行である。  
したがって「別素材でも字幕付き一本が完成した」とはまだ判定できない。確認できたのは、初回の外部通信直前までのローカル経路である。

## 2. ユーザーから見た変化

- 宝鐘マリンのLiar's Bar配信から、候補59の約51.6秒を切り出す位置が人間承認済みになった。
- 人間が見た確認用動画と同じ範囲が、正式な基礎映像として保存された。
- その範囲に残る発話281文字が、字幕分割AIへ安全に渡せる入力packageになった。
- 確認用動画は切り出し確認用なので字幕を含まない。字幕がないこと自体は不具合ではない。
- まだユーザーが確認できる字幕付き完成動画は増えていない。

## 3. 実行した操作

1. 人間回答、正式組立決定、基礎映像検査、字幕入力package検査を読み取った。
2. 人間回答・組立決定・基礎映像・字幕意味入力・B5 jobのSHA-256を再計算した。
3. 基礎映像を媒体情報として検査し、映像・音声・尺を確認した。
4. 候補59のB5・B6正式出力directoryが未作成であることを確認した。
5. 保存済みの完了報告と外部送信前停止報告を照合した。

この検証では、UI操作、API通信、動画生成、コード変更、テスト再実行をしていない。

## 4. 保存データの確認

確認した主な保存データ:

- 人間回答  
  `evals/clip_composition/outputs/presentation/source-assembly-human-results/qdczJpv8RCc-candidate-59-v001.json`
  - candidateId: `59`
  - 切り分け: `accept`
  - 語尾: `no_clipped_tail`
  - 確認媒体SHA-256: `b3c48912d1acd51b5a4313e61c14fdd6d8cbd72cb270ceb74d0fa01e62cfb115`
- 正式組立決定  
  `evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json`
  - sourceVideoId相当: `youtube:qdczJpv8RCc`
  - sourceStartMs: `5941162`
  - sourceEndMs: `5992736`
  - 未解決編集: 0件
- 基礎映像  
  `evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/base-media.mp4`
  - SHA-256: `faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967`
  - 1920×1080、30fps、51.566667秒
  - AAC、48kHz、stereo
  - 1,547 frame、2,475,200 sample
- 残存発話  
  `evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/`
  - 281文字
  - 欠落・余分・切除範囲との交差: 0件
- 字幕入力package  
  `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/`
  - 発話まとまり: 2件
  - 行末候補: 164件
  - package検査: `passed`、違反0件
  - 意味入力SHA-256: `ead2a47ef57480c3da9e598a650059a92c1f1519b25b94d2617b86485f79433a`
- B5正式job  
  `evals/clip_composition/jobs/presentation/caption-gate-b5-initial/qdczJpv8RCc-candidate-59-v001.json`
  - SHA-256: `d282e3885e8c26098539096e2e3816e088f6779afd7b62f14159ee617950a152`

候補プール、候補選抜ログ、完成ショート情報、完成ショートから候補への接続情報は、今回の演出・字幕経路の検証対象ではないため確認していない。

## 5. UI確認

この検証セッションではUIを起動・操作していない。

保存済みの人間回答から確認できるのは、切り出し確認用動画について「この切り分けでよい」「語尾の欠けはない」と判定されたことまでである。確認用動画は字幕確認画面ではなく、字幕が出ない状態が正しい。

字幕の見た目、表示タイミング、読みやすさはまだ画面確認されていない。

## 6. 出力動画の確認

存在する動画:

- 切り出し確認用動画  
  `evals/clip_composition/outputs/presentation/source-review-preparations/qdczJpv8RCc-candidate-59-v001/assembly-review.mp4`
- 正式な基礎映像  
  `evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/base-media.mp4`

基礎映像は、元配信の `5941162ms` から `5992736ms` を30fpsの格子へ写した51.566667秒の動画である。映像と音声の検査は保存済み検査報告で合格している。

字幕付き完成動画は生成していない。したがって、字幕の表示、音声との同期、描画後の重なり、画面外、欠落、完成字幕の人間目視は未確認である。

## 7. 正本の分離確認

今回確認した経路では、次が別成果物として分かれている。

- 人間が採用した切り出し: 正式組立決定
- 切り出した映像: 基礎映像
- 切り出し後に残る発話: 残存発話
- Geminiへ渡す字幕判断材料: 字幕入力package
- 外部通信の実行条件: B5 job

候補選抜側の `ShortDraftPlan`、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`ReviewPacket`、`comparisonItems` は今回確認していないため、相互分離は要確認である。今回確認したpresentation成果物内で、`comparisonItems`から採用理由を復元する処理は観測していない。

## 8. 合格判定チェック

1. 出力本数入力が廃止されている: 要確認（今回対象外）
2. 抽出時に完成ショートが自動生成されない: 要確認（候補59の今回経路がB3で停止し、完成動画を生成しなかった事実だけを確認）
3. 候補プールが保存される: 要確認（今回対象外）
4. 候補選抜ログが保存される: 要確認（今回対象外）
5. 上位漏れ候補が not_selected として残る: 要確認（今回対象外）
6. 人間が候補を選んでショート化できる: 要確認（候補59の切り出し承認までは確認、完成ショート化は未実行）
7. 完成ショートに CandidateSelectionBinding が保存される: 要確認（完成ショート未生成）
8. 採用理由は厳密接続できる場合だけ表示される: 要確認（今回対象外）
9. comparisonItems を正本にしていない: 要確認（候補選抜側は未確認）
10. 旧データは再生成案内になる: 要確認（今回対象外）
11. sourceStartMs / sourceEndMs を使っている: OK（今回の正式組立決定で確認）
12. startMs / endMs を新しい正本にしていない: OK（今回の正式組立決定に限り確認）

## 9. 問題点

問題:
字幕付き完成物まで到達していない。

該当箇所:
B5のGoogle Gemini Developer API `countTokens`実行前。

なぜ問題か:
入力token数が未測定なので、B5の完了記録とB6の字幕分割生成へ進めない。B4静的templateをB5より後に作る直接の理由は、先に作るとB5 jobで固定済みの上流監視SHAが変わるためである。

再現手順:
候補59のB5出力directoryとB6出力directoryを確認すると、どちらも未作成である。外部送信前停止報告にも通信0回と記録されている。

修正案:
発話281文字を含む固定requestをGoogleへ送ることを人間が明示承認した後、`countTokens`を2回だけ実行し、B5検査を完了する。

優先度:
高。一般性実証の字幕付き一本へ進む直近の停止点である。

## 10. まだ未実装のこと

候補59で未実行・未生成のもの:

- B5 token計測の正式実行
- 候補59用B4静的templateの生成と事前検査
- Gemini字幕分割の一回実走
- 実装済みの受入検査によるGemini回答の検査と、実装済みの表示計画変換の実行
- 実装済みレンダラーによる字幕描画と、実装済み描画後QCの実行
- 字幕付き完成動画の人間目視

未実装または未実証の一般化:

- 行幅36と横型プリセットを素材・画面形式ごとに自由化した経路

## 11. 参考: 不足している可能性のある機能

1. 候補59用の表示計画事前検査template
   - 根拠: コード・保存データ確認。候補59用ファイルは未作成。
   - ユーザー影響: Gemini回答を表示計画へ安全につなげられない。
   - 扱い: 候補別成果物の未生成。機能自体は実装済みで、B5完了後に作るのが正しい順序。

2. B6の正式job接続記録の格納場所
   - 根拠: コード・監査報告確認。job接続は実行出力には出るが、B6 manifest自体には専用欄がない。
   - ユーザー影響: 初回実走の来歴確認ではmanifestだけでなく、保存した実行出力も合わせて見る必要がある。
   - 扱い: 既知事項。現行設計では実行出力の版付き保存で来歴を保持でき、欠陥または契約改訂候補とはまだ断定しない。

3. 行幅・プリセット・画面形式の入力自由化
   - 根拠: 完了報告とB6監査。現経路は行幅36、横型、`normal-landscape-readable-pop-v001`固定。
   - ユーザー影響: 別レイアウトや縦型へそのまま適用できる保証がない。
   - 扱い: 今後の未実装。候補59の完成後に一般化を判断する。

4. 候補選抜ログと完成動画の厳密接続確認
   - 根拠: 今回はpresentation経路だけを確認し、候補選抜側の保存データを検証していない。
   - ユーザー影響: 候補59の完成動画ができた後、候補選抜記録までIDで戻れるかは本報告だけでは保証できない。
   - 扱い: 検証ギャップ。完成動画生成後の報告対象。

## 12. 次に直すべきこと

1. 外部送信を明示承認した上で、B5の`countTokens`を2回だけ実行する。
2. B5完了後の状態で候補59用B4静的templateを作り、事前検査する。
3. B6を一回だけ実走し、受理された表示計画を描画して字幕付き動画を人間が確認する。

人間作業は、直近では外部送信の可否1判断だけである。字幕付き動画ができた後に、完成字幕の目視1回が必要になる。

## 13. 実行コマンドとテスト結果

成功:

```sh
git status --short && git log -5 --oneline && rg --files evals/clip_composition/outputs/presentation | rg 'qdczJpv8RCc-candidate-59|caption-gate-b5|caption-gate-b6' | sort
```

```sh
jq '{schemaVersion,reviewId,candidate,primaryChoice,secondaryChoice,resolution,finalAssessment,timeMeasurement}' evals/clip_composition/outputs/presentation/source-assembly-human-results/qdczJpv8RCc-candidate-59-v001.json
jq '{schemaVersion,assemblyId,sourceIdentity,segments,unresolvedEdits}' evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json
jq '{schemaVersion,status,summary,outputMedia,frameCount,sampleCount}' evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/validation-report.json
jq '{schemaVersion,status,summary,outputMedia,frameCount,sampleCount}' evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/generation-manifest.json
jq '{schemaVersion,status,summary,counts,hashes}' evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/package-validation-report.json
shasum -a 256 evals/clip_composition/outputs/presentation/source-assembly-human-results/qdczJpv8RCc-candidate-59-v001.json evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/base-media.mp4 evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/semantic-source-input.json evals/clip_composition/jobs/presentation/caption-gate-b5-initial/qdczJpv8RCc-candidate-59-v001.json
```

```sh
sed -n '1,220p' evals/clip_composition/outputs/presentation/source-assembly-human-results/qdczJpv8RCc-candidate-59-v001.json
sed -n '1,240p' evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json
sed -n '1,220p' evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/validation-report.json
sed -n '1,220p' evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/generation-manifest.json
```

```sh
jq 'keys' evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/package-validation-report.json
jq 'keys' evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/package-manifest.json
jq '{status, violationCount:(.violations|length), checks, observed}' evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/package-validation-report.json
jq '{packageId, sourceAtoms, semanticSourceInput, segmenterBoundaryEvidence, counts, outputFiles}' evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/package-manifest.json
jq '{schemaVersion, atomCount:(.atoms|length), first:(.atoms[0] // null), last:(.atoms[-1] // null)}' evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/source-atoms.json
find evals/clip_composition/outputs/presentation/caption-gate-b5 -maxdepth 1 -type d -name 'qdczJpv8RCc-candidate-59*' -print
find evals/clip_composition/outputs/presentation/caption-gate-b6 -maxdepth 1 -type d -name 'qdczJpv8RCc-candidate-59*' -print
/usr/local/bin/ffprobe -v error -show_entries format=duration -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels -of json evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/base-media.mp4
```

```sh
jq 'keys' evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/source-atoms.json
jq 'keys' evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/semantic-source-input.json
jq '.. | objects | select(has("characterCount") or has("candidateCount") or has("containerCount") or has("atomCount"))' evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/package-manifest.json | head -100
rg -n '281|164|character|container|candidate' evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/package-manifest.json evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001/package-validation-report.json evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/generation-manifest.json
```

```sh
sed -n '1,260p' evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-caption-gate-b5-external-send-approval-stop-20260728-v001.md
sed -n '1,260p' evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-b6-local-readiness-audit-20260728-v001.md
sed -n '1,220p' evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-local-caption-input-package-completion-20260728-v001.md
```

上記は全て読み取りで終了した。媒体検査は、1920×1080・30fps・51.566667秒・AAC 48kHz stereoを返した。SHA再計算は保存済み記録と一致した。

失敗:

- この検証セッションで製品処理・テストの失敗はない。
- 最初の一部`jq`投影は成果物の入れ子より浅いfieldを指定したため`null`を返した。元JSONを直接読み、正しい入れ子を確認した。ファイル変更はない。

未実行:

- ZEV UIの新規起動と操作
- Google Gemini Developer API `countTokens` 2回
- Gemini字幕分割生成
- B1受入、B4表示計画、字幕描画
- 字幕付き完成動画の生成・再生・人間目視
- 既存テストの再実行
- ChatGPTへの投稿

保存済み報告に記録された過去の検査結果は、B3正式検査19/19、一般化実装と回帰258/258、候補13のB6単独回帰9/9である。これらは本検証セッションでは再実行せず、報告書とcommitを証拠として確認した。

## 14. 証拠

- 人間回答SHA-256:  
  `16c038de7d978272e261093a07e09561547c1cb13978c98db74f9597536a0064`
- 正式組立決定SHA-256:  
  `72a1d9c95839a62a3f4dae395ffa9e67877910d75040c65796ca994ad3dd51a4`
- 基礎映像SHA-256:  
  `faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967`
- 字幕意味入力SHA-256:  
  `ead2a47ef57480c3da9e598a650059a92c1f1519b25b94d2617b86485f79433a`
- B5 job SHA-256:  
  `d282e3885e8c26098539096e2e3816e088f6779afd7b62f14159ee617950a152`
- B3 package manifest SHA-256:  
  `c26aa7065a73cd6be391cc6eb7de3477480f84407e173b5882a99d08a8ae3cd0`
- B3 package validation report SHA-256:  
  `0cef4e5ee6dea5218ad38b9d868f07a73b2252c7d6519496212b64217dcf1700`
- B5停止報告:  
  `evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-caption-gate-b5-external-send-approval-stop-20260728-v001.md`
- B6準備監査:  
  `evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-b6-local-readiness-audit-20260728-v001.md`
- 関連commit:
  - `9e07469c` 候補59を正式B3字幕入力まで接続
  - `270b48d1` 候補59のB5入力を固定し外部送信前で停止
  - `654ff933` 候補59のB5・B6共通入口を正式に取り込む
  - `27c62d06` 候補59のB6実走前ローカル経路を監査

ChatGPT投稿は依頼されていないため実行していない。
