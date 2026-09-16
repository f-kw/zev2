# 完成Digestの音声由来Vocal accent — 技術完成報告

日付: 2026-09-16

branch: `codex/digest-vocal-accent`

開始commit: `76a24c106a7397620731c06ab6501ef0e0a7bffc`

対象: 2026-09-16の個別指示「Phase 3の人間評価は今は行わず、音声候補発見からFocus＋Vocalの161秒比較動画まで連続する」

## 1. 到達点

完成Digestの全音声から、字幕を渡さず音量変化の候補を発見し、全字幕・前後文脈・音響観測・独立した全文音声認識をAIへ渡して、FocusまたはVocalを選ぶ経路を接続した。全161.033秒・4,831フレームの無修正自動版が既存rendererとQCを通過し、保存済みの通常版・Phase 3版と比較できる。

技術検査は完了した。声の判別精度、演出選択の自然さ、単調さやうるささ、見落としについての人間評価と正式採用は未実施である。

## 2. 比較する実動画

| 版 | ローカル保存先 | SHA-256 |
| --- | --- | --- |
| 通常版 | `/private/tmp/zev-vocal-accent-6mnpszdq/comparison/normal.mp4` | `044bc61a6cd0034cc01d277f31e57c6a831e508ac179966cae29b3f3bb763a8c` |
| 保存済みPhase 3 Focus版 | `/private/tmp/zev-vocal-accent-6mnpszdq/comparison/phase3-focus.mp4` | `88dc6a0685898d3c9f9eebb84f12238fcadceaec365352a06dd35f8dd0ce540e` |
| 新しいFocus＋Vocal版 | `/private/tmp/zev-vocal-accent-6mnpszdq/comparison/focus-vocal.mp4` | `5855878b6d32f261822d9d7423454dddc0a60fb5dc933ddf10fe55757879f74d` |

比較ページ: `/private/tmp/zev-vocal-accent-6mnpszdq/comparison/comparison.html`。一つのplayerで同じ再生位置を保つ3版の切替と、演出箇所への移動を用意した。前段作業でローカル配信が自動承認審査に拒否され、ブラウザのfile URL操作も拒否されているため、その制約を迂回していない。今回のページのブラウザ再生は未検証。MP4は直接開ける成果物として保存している。

通常版・Phase 3版は、前回の全編動画からbyte一致で保存した。新しい版は全音声を加えて新規にAI判断したもので、Phase 3の選択結果に手でVocalを足したものではない。役割やFocus範囲の差は `/private/tmp/zev-vocal-accent-6mnpszdq/phase3-to-vocal-judgment-differences-v001.json` に記録した。

## 3. 音声から候補を作る処理

既存ffmpegで完成Digestの音声全体を16 kHz単声道PCMへ復号し、全sampleを隙間・重複なく観測した。字幕、Focus案、人間ラベル、認識用の本文hintは候補発見へ渡さない。20 msの実測音量を100 msの平均電力（端部は実sample数で正規化）にまとめ、約2秒の近傍の両側から9 dB以上突出する局所頂点を候補にする。これらは今回ユーザーが調整を許可した明示的な開発用閾値であり、品質保証値ではない。編集上の重み付きscoreは作らない。

重なる局所区間だけを結合し、全構成頂点を残す。件数quota、一定間隔、上位件数、ランダム配置、発話確率や認識有無による候補削除はない。字幕に対応しない候補、認識が空の候補も後段へ残す。

音声認識は既存のローカルWhisper large-v2をCPUで使用。音声の全区間を入力し、短い反応を先に除去しないよう事前の発話区間除外を無効にした。generatorを最後まで読み、全segment・全単語・認識確率・各区間の最終返却時の復号温度を保存した。既存cacheのみを読み、新規モデル取得・外部API・素材送信は行っていない。

| 素材 | 観測sample / rate | 該当局所頂点 → 結合候補 | ASR segment / 単語 | Vocal表示が収まる字幕 / 全字幕 |
| --- | --- | --- | --- | --- |
| 161秒Digest | 2,576,858 / 16,000 Hz | 134 → 27 | 70 / 392 | 23 / 32 |
| C-all | 23,684,437 / 16,000 Hz | 1068 → 306 | 462 / 3159 | 218 / 325 |

解析した完成Digest音声の入力SHA-256は、161秒素材が比較表の通常版と同じ `044bc61a6cd0034cc01d277f31e57c6a831e508ac179966cae29b3f3bb763a8c`、C-allが `665c31638dcf55af4bf1e6327f915839bbed31d905c007a6a9281e29776b8c34`。

音響検出は内部の局所頂点を必要とする。持続した単調上昇や音声端点の最大値を十分に拾う方式ではない。全sample観測は、すべての声の反応を発見できた証明ではない。また、混合音の音量変化にはゲーム音・BGMも含まれ、発話確率や単語との同時発生だけで声由来を確証できない。

## 4. AIの意味判断と保存結果

全確定字幕と全音声候補について、採用・不要・表現不能・未解決を一件ずつ返す。音響候補自身はroleを決めない。Vocalを選ぶ字幕には、その候補内で対象字幕と時間が重なる局所頂点を明示させ、候補全体の最大値を別の字幕へ借用できないよう検査した。候補側と字幕側のrole・参照を往復で一致させる。

| 素材 | 全字幕 | Focus | Vocal | Normal | 表現不能 | 未解決 |
| --- | --- | --- | --- | --- | --- | --- |
| 161秒Digest | 32 | 9 | 1 | 14 | 0 | 8 |
| C-all | 325 | 39 | 7 | 217 | 7 | 55 |

| 素材 | 全音声候補 | 採用 | 不要 | 表現不能 | 未解決 |
| --- | --- | --- | --- | --- | --- |
| 161秒Digest | 27 | 9 | 5 | 0 | 13 |
| C-all | 306 | 41 | 55 | 7 | 203 |

字幕と音声候補は一対一ではないため、二つの表の採用件数は一致する必要がない。件数は実判断の結果であり、目標件数ではない。未解決や表現不能は通常表示を保つが、不要と判断した記録に置き換えない。

161秒版のVocalは「もうリカちゃんやめてー!」。3.94秒・4.16秒の二つの局所頂点と「カ」「ちゃん」の認識時刻の対応、呼び止める前後文脈からAIが選んだ。局所の声確率は約0.248・0.036、認識の最終返却時の復号温度は1であり、根拠には弱さがある。これは声を分離して聴取確認した結論ではない。独立レビューでも時刻・参照の明確な矛盾はなかったが、声由来や演出の自然さを保証しない。比較時に人間が見る対象として残した。

C-allの回答保存前の独立点検では、字幕20の理由文で37.18秒の音量頂点が認識単語と重なると記述した誤りを見つけた。実際には前の語の終了37.14秒と次の語の開始37.22秒の間である。元の下書きと照合記録を保存し、判断担当AIが再確認して、36.36秒と認識語の一致を主根拠、37.18秒は同じ発話区間内の語間の補助観測と訂正した。採否はAIが維持し、Codexの保存処理側や人間がroleを手変更してはいない。これは保存前の根拠点検であり、無検討の初稿をそのまま完成扱いしたという意味ではない。

C-allの最終Vocal 7件について独立に確認した主根拠の10頂点は、すべて対象字幕内かつ実際の認識語区間内だった。37.18秒は理由に残る補助観測であり、単語と重なる主根拠のIDからは除かれている。局所頂点の時刻と語の時刻が合うことは、音源分離や人間による聴取確認を意味しない。

## 5. 表現と一件単位の修正

Focusは従来どおり意味上の対象を黄色で示す。Vocalは既存の有限reaction表示を再利用し、元の字幕表示期間だけ全文の文字を大きくする。161秒版の元の96 px（C-allは94 px）から既存presetの128 pxへの変更だけで、本文・改行・時刻・位置・保持区間・Prospectを変えない。新stage、任意animation、一般動画編集機構は追加していない。

一字幕の役割は一つとし、Focusの色とVocalの拡大を重ねない。大きくすると収まらない字幕は既存layout検査の結果をAIへ渡し、Vocal採用を拒否する。縮小や改行変更で帳尻を合わせない。人間が同じ対象へVocalを指定した場合も既存rendererの配置QCを通る必要がある。

固定通常計画 → 固定自動案 → 人間の一件修正 → 描画に使う計画、という三層構造を維持した。既存CLIでNormal固定・Focus・Vocal・Resetが使える。実際の保存済み161秒自動案でも4操作を通し、他字幕を変えず、Resetで元の自動案へ完全に戻ることを確認した。比較動画にはその人間修正を適用していない。

描画規則をv004へ進めた。旧v003の自動案を互換変換して新処理に流す分岐は追加せず、旧版の動画と記録を保持した。

## 6. 検証

- JavaScript/TypeScriptの統合検査: 289 / 289合格、skip 0。
- 全音声probeと既存音響観測のPython検査: 18 / 18合格。
- 文字範囲とnative描画の検査: 16 / 16合格。実Vocal画像の変化と、Normal・Resetの画素復元を確認。
- 共有型全体およびSkill単独の型検査: 合格。
- adapterの依存を含む直接tsc検査: 変更前のcommitでも同じ19行の診断・同じ終了codeであり、今回差分による診断増加なし。プロジェクト全体の型検査が合格したとは報告しない。
- 全161秒描画: 32字幕・4,831フレーム、既存本番QC合格、原本文・改行・表示時刻・保持区間を保持。
- 全32字幕の画像・配置を比較。通常表示の22字幕はPNG byte一致。Focus 9字幕はalpha・配置を保持し、Vocal 1字幕は文字の実領域が拡大。全選択字幕の完成動画の画素も測定し、変更が動画まで届いたことを確認。
- 3版の音声packet payloadはSHA-256一致。音声の差し替え・再加工なし。
- C-allは全音声候補と全325字幕を実AI判断へ通し、根拠参照・全件網羅・一役割・表示可否・保存自動案・固定計画保持を検査。能力確認に不要な24分動画の再encodeは実施していない。

保存した失敗もある。音響単体検査の初回1件は、小数の秒差を厳密比較した検査側の誤りであり、整数sample差を基準に直した。音響処理や推論設定は変えていない。最初のnative画像検査はsandbox内のChromium起動制限で失敗し、承認経路で起動した新版が合格した。161秒判断の最初のnamed pipe接続は回答受理前に待機したため、証拠を保存して検査用processだけを停止し、同じ固定回答を通常の標準入力で再接続した。二つのrequestはbyte一致、AI回答は無修正であり、意味判断をやり直した回数へ数えていない。C-allの読み取り用viewも、入力準備完了前の初回起動はファイル未生成で終了したため、準備処理の終了を待って作成し、元requestへの完全復元を確認した。

主な実行形（実際の引数・環境・終了code・ログSHAは `/private/tmp/zev-vocal-accent-6mnpszdq/tests/execution-summary-v001.json` に保存）:

```text
Node 20.19.6 --import ./runner/node_modules/tsx/dist/loader.mjs --test [列挙した7検査ファイル]
/Users/kawafmm/venvs/whisperx/bin/python -m unittest discover -s evals/clip_composition -p test_presentation_vocal*.py -v
/usr/local/bin/node --test evals/clip_composition/presentation_auto_effects_span_v001.test.mjs
Node 20.19.6 --import ./runner/node_modules/tsx/dist/loader.mjs /private/tmp/zev-vocal-accent-6mnpszdq/render-digest-v001.mjs horror automatic 2
Node 20.19.6 /private/tmp/zev-vocal-accent-6mnpszdq/verify-vocal-video-v001.mjs 2
```

C-allでは直接認識が重ならない31候補も保持した。そのうち前後1秒の文脈にも認識がない候補は12件。低確度として記録された認識区間は161秒素材14件、C-all9件で、削除していない。全再試行の中間結果や温度履歴を保存したとは主張しない。モデル・元動画・PCM・計測・認識結果の実ファイルを再照合し、両素材の事前20項目・完成30項目が合格した。

## 7. 実装・証拠

主な実装は、独立音声probeとその検査、意味判断Skill・prompt・adapter、有限表示と一件修正CLI、共有型である。既存renderer本体を再設計していない。

ローカルの主要証拠:

- `/private/tmp/zev-vocal-accent-6mnpszdq/audio-probe/run-v001/` — 全音声実測、全ASR、実装・モデル・実行系参照。
- `/private/tmp/zev-vocal-accent-6mnpszdq/judgments/horror-attempt-2/` と `/private/tmp/zev-vocal-accent-6mnpszdq/judgments/c-all-attempt-1/` — 実request、回答、固定案、全件検証。
- `/private/tmp/zev-vocal-accent-6mnpszdq/judgment-verification-horror-v001/` と `/private/tmp/zev-vocal-accent-6mnpszdq/judgment-verification-c-all-v001/` — 実ファイルからの入力再構築と三層検証。
- `/private/tmp/zev-vocal-accent-6mnpszdq/renders/horror-automatic-v002/` — 全編render、起動command、QC、入出力参照。
- `/private/tmp/zev-vocal-accent-6mnpszdq/comparison-qc-v002/` — 全字幕画像・配置、完成動画画素、3版音声の比較。
- `/private/tmp/zev-vocal-accent-6mnpszdq/reviews/` — 独立技術・意味根拠レビューと変更前後の型検査比較。
- `/private/tmp/zev-vocal-accent-6mnpszdq/completed-evidence-index-v001.json` — 完了時に照合した証拠のSHA-256一覧。
- `/private/tmp/zev-vocal-accent-6mnpszdq/final-git-preservation-v001.json` — 元workspaceとPhase 1〜3のHEAD・branch・tracked差分・未追跡一覧の保存前後照合。

今回の外部API通信・追加費用・素材外部送信は0。DECISIONS、Goal、work-order、契約、Digest正本は変更していない。main merge・tag・stable・releaseは行っていない。checkpointは技術監査用であり、正式採用ではない。

## 8. まとめ監査

ローカル技術検査後、監査用checkpointをcommit/pushし、同じZEV進行管理4へ短い要約とGitHub上の差分・本報告を送る。監査応答と最終commitは、確認後にこの節へ記録する。
