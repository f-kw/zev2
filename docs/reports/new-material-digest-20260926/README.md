# 5. 新素材Digest生成 — Codex2 / 2026-09-26

## 現在状態

続行中・未完了。今回の字幕対象は1人とする最新指示により、話者分離だけを省いた新job用の接続を準備した。
任意の話者分離指定、設定を含めたjob対応照合、41件のGPU連携テスト、runner型検査は合格。
2026-09-26 18:19 JST時点のGPU公開APIにはまだ任意指定がなく、新jobは未送信。反映確認後に全編文字認識・時刻合わせを実行する。
旧jobはユーザーが手動終了したとの申告があり、新しい最終STT結果には使用しない。文字起こし結果・初稿動画はまだ未取得・未生成。
人間品質調整・人間による採用判定は行っていない。

## 今回の範囲と制作要求

指示元はZEV相談役の「ZEV Build Loop」会話
`6ab30b1e-1f6c-83e8-9c83-56f3030d5ad7`。2026-09-26に添付された
「Codex2｜5. 新素材Digest生成」第0節のkawafmm承認済み範囲で実行する。

> この動画から、単独で見ても内容と面白さが分かる複数の見どころを選び、前後の文脈を保ったDigest初稿を作る

候補数・完成尺を先に固定しない。人間に途中の候補・保持・字幕・演出の選択を求めず、
既存Skillと現行Codex判断形式を使う。最初の機械的成立動画を保存し、品質改善で上書きしない。
13の比較用水色 `#87CEFA` は使わず、6・13や別素材へ続行しない。

開始時mainは `2b69c6453587a60a814adf60ac965a72f8cf2283`、clean / untracked 0。
originをfetchし、計画・現在地の更新だけをfast-forwardして
`0bb91e31167220dbc483a141e231147ed7a9971b` から開始した。
新しいbranch / worktreeは作っていない。

## 素材

- URL: https://www.youtube.com/watch?v=-2UUTkv9qvk
- ID: `-2UUTkv9qvk`
- 題名: 【JSP3】真夏の恐怖のホラーバイト…事故物件の監視をします【ホロライブ/宝鐘マリン】
- 長さ: コンテナ12036.086712秒、映像12036.033333秒
- MP4 / AV1、1920×1080、60fps、音声AAC / 44100Hz / stereo
- 4,803,412,827 bytes
- SHA-256: `504650457fc6650bf27d6a6094402add0b684c5f32977cde27e201fe4c40a6c4`
- 取得: 2026-09-26 05:51:26〜06:09:04 UTC、1058.795秒
- 取得経路: 現行ZEVのYouTube取得処理と同一のyt-dlp引数。
- 詳細・完全command: [source.json](source.json)

元媒体・生結果・大きな中間物は、既存ignore対象の
`runtime/artifacts/digest-new-material-20260926-v001/` に保存する。
元素材は `source/source-video.mp4`。過去の成果物は変更しない。

## 実行設定と接続

[plan.json](plan.json) を今回素材専用の実行planとする。
旧素材のplan / authorization / 選択結果は上書きしない。

- 主文字起こし: `stt.mode=local` を実際の設定読込後にも確認する。今回の新attemptで `enableDiarization=false` を明示して動画全体を一度だけ投入する。large-v3 / CUDA / float16、全編文字認識と時刻合わせを維持。生結果と入力SHAを検証して既存ZEV変換へ渡し、1断片=1まとまりを維持する。旧jobの結果は使用しない。
- 候補探索・採用・保持・字幕境界: 既存Skill、ID・範囲・証拠・順序・来歴の既存検証を使用する。回答は今回素材に対する現在のCodex判断を保存する。
- 本文・時計: 保存済みの今回採用範囲と実際のGPU断片を、既存の共通描画入力へ接続する。
- 演出: 現行の統合演出選択と有限presetを使用する。音声観測・実フォントの適用可能性を入力にし、現行Panel背景・paletteを扱う。旧単一preset選択実行器の古いPanel出力は経由しない。
- 音声観測: 現行の全音声観測処理を使用する。Digestの独立音声観測用に既存ローカルlarge-v2を使う場合も、素材の主文字起こしはGPU-STTのlarge-v3である。
- Gemini: 指示で許可されたモデルは `gemini-3.8-flash`。この実行planは現行Codex判断形式を使うため、設定値とAPIを実際に呼んだことは区別する。実際の呼出し有無は終了時に記録する。

今回追加する接続処理は素材固有であり、正式な字幕schema、演出規則、palette、providerを追加・変更しない。
実走で発見した全動画送信サイズの不具合だけを、下記のとおり最小修正した。
主接続と描画接続はそれぞれ
`evals/clip_composition/run_new_material_digest_20260926.mts`、
`evals/clip_composition/run_new_material_digest_20260926_presentation.mts`。

## 検証記録（途中）

- GPU統合・候補探索・選択・保持の既存テスト: **56 / 56合格**。
- 字幕境界・音声強調・統合演出・Panel palette・rendererの既存テスト: **146件中140合格、6失敗**。
  - 3件: 旧単一preset選択実行器が出すPanel指定を現行palette必須規則が拒否する。
  - 1件: Motionの旧版を期待するテストと現行版の相違。
  - 2件: 過去HRB / C-allの未追跡保存ファイル欠損。
  - 今回の新素材初稿が合格した証拠ではなく、失敗を合格へ読み替えない。無関係な旧成果物復旧・旧試験修正はしない。
- 接続ファイルの読込み確認: 合格。既存renderer依存を解決するため、既存手順どおり `NODE_PATH=./runner/node_modules` を指定する。
- 素材時計・接続背景・音声処理の既存テスト: **44 / 44合格**。
- 合計: **246件中240合格、6失敗**。今回の新素材による全経路実走はまだ完了していない。
- 送信修正後: 大容量回帰2件を含むGPU統合テスト **18 / 18合格**。runnerの型検査も合格。
- ログ: 上記成果物rootの `tests/skills-and-gpu.tap`、`tests/presentation.tap`、`tests/clocks-and-background.tap`。

### GPU送信中の観測

2026-09-26 06:09:08 UTCに既存GPU経路を開始した。
healthは正常で、動画SHAを計算した後に全動画をPOSTしている。
06:21頃の対象プロセスの通信観測では送信508,429,075 bytes・受信1,616 bytesであり、
5秒間隔の2観測で値が変わらなかった。ジョブ受付票は未保存。
この観測だけでGPU側の受付・実処理・停止原因は確定せず、重複投入は行っていない。
観測原本は成果物rootの `upload-observation.json`。

### 初稿を成立させるための最小修正: 4GB超ファイルの送信サイズ

現行Node v20.19.6で `openAsBlob` に実素材を渡すと、実際の4,803,412,827 bytesに対して
508,445,531 bytesを返した。差は正確に4,294,967,296 bytes（2の32乗）。
この値がmultipartの送信長へ入り、GPU受付前に送信が停滞した。

同じ処理をローカルの一時受信口でも再現し、宣言508,445,814 bytes・受信508,428,440 bytesで
120秒の診断待機を超過した。これは文字起こし実行やGPU性能の結果ではない。
受付票がない不正な送信プロセスを終了し、その観測・停止記録を保持した。

`runner/src/gpu-stt.ts` の送信だけを、実ファイルサイズに基づくmultipartストリームへ置き換えた。
全サイズで同一経路を使い、動画を切り詰めたり別encodingへ変換したりしない。
health、入力SHA、非同期job、結果のSHA照合、生結果保存、ZEV変換は維持する。
モデル・字幕・演出・人間品質判断の変更ではない。

修正後は同じ実素材をローカルで3.069秒で完送し、送信宣言・受信とも4,803,413,170 bytesで一致した。
4GB超の疎ファイルによるサイズ回帰、二進データ保持、既存GPU経路の18件が合格した。
この3.069秒はローカル受信口の診断値であり、GPU通信時間やSTT速度と混同しない。

証拠は成果物root内の `tests/upload-client-probe.json`、`tests/upload-client-probe-after.json`、
`tests/gpu-upload-fix.tap`、`tests/runner-type-check.log`、`stt-send-interruption.json`。
修正後GPU実走は `stt-attempt-002/` へ別保存し、最初の記録を上書きしない。

修正後の送信は2026-09-26 06:32:55 UTCに開始し、06:36:05 UTCに受付票を受信した。
ジョブIDは `b50a498c86264de58a7c8c69b7be6ab3`。
GPU側の入力サイズ・SHAは取得済み元素材と完全一致し、新規jobとして受付された。
GPU処理中にクライアントの既存30分待機が終了したため、
07:02:57 UTC以降は同じ保存済みjobの状態・結果を読んで追跡する。
GPU側の処理は継続中であり、再投入・モデル変更・待機上限設定の書換えは行っていない。
終了済みクライアントの記録と、追跡開始・状態・最終結果は別に保存する。

## 未実施・未確認

GPU-STT完了結果の取得と文字起こし検査、候補・採用・保持・構成・字幕・演出の実走、初稿生成、
decode / QC、各工程の最終時間は未実施。送信修正と診断checkpointは `1897565e1b992da5b8c95e829a47a824c1de649c`、
timeout/resume修正と検証は `ac500db6d59bd45b437a5c22d20849225cbe9b92` としてmainへcommit/push済み。
人間による動画品質判断は今回の対象外で、6へ残す。

## 長時間処理の診断依頼（2026-09-26 07:45 UTC）

ユーザーから「1時間もかかる想定ではない」と指摘を受け、待機だけを続ける扱いを停止した。
これまでのhealth成功とrunning状態は、処理進行の証拠にはならない。

- 同じjobの最終観測: `b50a498c86264de58a7c8c69b7be6ab3`、GPU側開始06:36:08 UTC、07:45 UTC観測でもrunning、error null。
- 受領済み入力は全4,803,412,827 byte、入力SHA一致。送信不具合の修正後に受領したjobであり、送信待ちと区別する。
- 実効設定: 文字認識CUDA、文字時刻合わせCPU、話者分離CPU、有効。OMP/MKLの設定は各1。遅延要因の候補だが、現在どの工程が遅いかは未特定。
- 既存APIにはhealth・job状態・完成結果取得があり、工程別進捗・ログ取得はない。結果と本文の取得は共にHTTP 409、running。
- GPU機へのSSHは接続timeout。開発機に既存SSH設定もなく、現在の接続だけではGPU機の実行ログ・CPU/GPU使用状況を取得できない。別サービスや認証設定は追加していない。
- 過去の統合検証は51.584秒音声に対してpipeline 76.311秒、runner 77.419秒。今回の12036秒素材の処理時間は未検証であり、単純な倍率推定や速度改善の断定はしない。
- ローカルの追跡プロセスだけを終了し、状態・診断応答を保存。GPU側のjobは取消・再投入していない。

推奨は、既存jobを保持したままGPU側の実行ログ・対象プロセスの資源使用状況から、
音声復号・文字認識・時刻合わせ・話者分離のどこで進んでいるか／停止しているかを確認すること。
モデル・話者分離・演算スレッド・素材・保持範囲を推測で変更しない。

監査checkpointには送信修正、今回run専用plan・接続adapter、検証記録と本reportを保存する。
adapterのimport確認は済んでいるが、候補探索以降の新素材実走は未実行で、成立済みとは扱わない。
今回の未完了はSTT完了確認から初稿生成・QCまで。人間品質調整・水色採用・別エピック着手はない。
詳細は [transport-verification.json](transport-verification.json) の長時間処理診断、
生状態・API応答は `runtime/artifacts/digest-new-material-20260926-v001/stt-attempt-002/`。

## 続行指示による非同期job timeout修正

今回の実走を妨げた、health・SHA計算・upload・polling・結果取得へ一つの期限を共有する欠陥を、
続行指示「Codex2 続行指示｜5. 新素材Digest生成」の範囲で修正した。
長尺のGPU処理そのものの高速化は行っていない。

- health、upload、状態GET、結果GETはそれぞれ新しい通信timeoutを持ち、応答本文の読込みも同じ個別通信の期限に含む。ローカルSHA計算にはHTTP期限を適用しない。
- 受付情報は上書きせず保存する。クライアント待機の期限は受付保存後に開始し、uploadまでの時間から独立する。期限到達は `GPU_STT_CLIENT_INTERRUPTED` / `polling-timeout` として記録し、GPU側のqueued/running状態を失敗へ書き換えない。
- 通常の文字起こし入口は、同じ成果物ディレクトリに受付情報があれば保存jobを再開する。healthとPOSTを繰り返さない。
- `runner/src/gpu-stt.ts` の正式な `resumeGpuSttJob` は、保存受付のjob ID・入力SHA・接続先・sourceを読み、現在の元動画SHAとsourceを照合して状態を一回取得する。queued/runningならその状態と観測時刻を返し、completedなら同じjobの生結果を保存・返却する。この経路にPOSTはない。
- 保存ID不正、source/元動画SHA/受付SHA/サーバーのID・SHA不一致を拒否する。failed/interrupted等のサーバー側終端状態を、クライアント側のtimeoutと区別し、自動再投入しない。
- 個別GETのtimeoutでも受付を保持し、同じ保存jobからresume可能と通知する。4GB超のstream送信を維持した。
- 今回run adapter内の一時的な追跡実装は削除し、正式resume入口を呼ぶ `resume-stt` へ置換した。

今回のjobを読むcommand（新規POSTなし）:

```sh
node --import ./runner/node_modules/tsx/dist/loader.mjs \
  evals/clip_composition/run_new_material_digest_20260926.mts resume-stt
```

汎用の正式resume関数へ渡すのは、受付ファイルを含む成果物ディレクトリ、照合するローカル動画path、
現在のsource参照、個別通信timeout。接続先とjob IDは保存受付から読む。
通常の文字起こし関数は個別通信timeoutとは独立したクライアント待機時間も指定でき、
未指定時は既存設定値をそれぞれの責務へ別々に使う。GPU jobの生存期限は設定しない。

### 検証

- GPU連携テスト **32/32合格**。受付後のclient timeoutと受付保存、GETだけでのrunning確認、別Nodeプロセスからcompleted結果取得、通常入口の再実行でもPOST一回、SHA/source/ID不一致拒否、failed再投入なし、通信ごとの期限、既存短尺・1断片1まとまり・4GB送信を確認。
- runner型検査合格。今回adapterのimport確認合格。
- 初回のsandbox実行はlocalhost listen拒否。実行権限を整えて再実行した。期限直前の合法な状態GETによってqueuedからrunningへ進む場合を、最初のテストが過剰に限定していたため、実際の待機中状態と再投入禁止を検証する形へ訂正した。最終32件に失敗なし。
- 実GPUで2026-09-26 08:08:42〜08:08:44 UTCに正式resumeを実行。通信は既存jobへのGET **1件、POST 0件**、HTTP 200、running。元動画SHA・保存受付SHA・GPU側SHA一致、保存受付byte不変。
- completed結果取得は模擬サーバーで検証済み。今回の実素材でのcompleted確認・結果取得は、上記観測時点ではまだ未実施。処理時間だけを根拠にGPU異常とは判定しない。

軽量証拠は [transport-verification.json](transport-verification.json) の非同期job再開検証。
GPU処理のどこが主要ボトルネックかは、完成後の実測とGPU側記録から別途判断する。

## GPU側の手動終了（2026-09-26 17:38〜17:39 JST）

ユーザーの「終了した」の対象を確認し、「GPU側の処理を手動で終了した」と回答を得た。
この申告を受け、Codexが開始したローカルの正式クライアントによる追跡だけを終了した（終了code 143）。
CodexからGPUへの取消・再投入は行っていない。元動画、保存受付、元の設定を保持している。

- 正式クライアントによる連続追跡: 08:13:10〜08:39:02 UTC、同じjobへのGET 741件、すべてHTTP 200、POST 0件。
- 最後のAPI応答はrunning・error null・終了時刻null。GPU側プロセスの実終了はユーザー申告であり、API応答から独立確認できていない。残存したrunning表示を処理継続の証拠にしない。
- GPU側開始06:36:08から最終観測08:39:02まで約2時間2分54秒。これは観測間隔であり、処理完了時間や工程別所要時間ではない。
- 生結果・ZEV transcript・初稿動画は未取得／未生成。実jobのcompleted結果取得は未確認であり、模擬サーバーでの合格と区別する。
- ユーザーは今回の字幕対象が1人なので話者分離は不要と指摘した。今回に限り話者分離を省き、文字起こしと時刻合わせを維持する方針が適切と考える。ただし、話者分離が遅延の主因かは未確定。今回の追補にある再投入禁止を受け、新jobの送信やGPU側設定変更は行っていない。

GPU側の終了状態・保存結果の有無と、話者分離を省いた再実行の扱いを相談役へ報告する。
新素材生成を完了とは扱わず、別エピックへ進まない。
軽量証拠は [transport-verification.json](transport-verification.json) の手動終了観測、原本は成果物rootの
`stt-attempt-002/manual-stop-observation.json`。

## 続行指示: 今回だけ話者分離なしで新規登録

最新指示「Codex2 続行指示｜5. 新素材Digest生成」により、字幕対象が1人の今回runだけ
`enableDiarization=false` とする。一般UIとサーバー既定値は変更しない。
旧job `b50a498c86264de58a7c8c69b7be6ab3` は話者分離ありのため、今回の最終結果へ引き継がない。

- 送信: 既存stream multipartへ、指定された場合だけ `enableDiarization=true/false` を追加する。省略時はGPU側既定値を使う。
- 受付: 要求した設定と入力SHA・byte数を保存し、GPUが返す実効設定と照合する。今回adapterは旧jobと異なるIDであることも、登録応答を保存した直後・polling開始前に確認する。
- 再開: 元動画SHA・source・保存受付の設定・GPU側の設定を照合する。旧true jobをfalse要求へresumeせず、登録後やresultの設定相違も拒否する。受付不明時に同じrunを起動し直してPOSTしないための送信開始記録も残す。
- 結果: 話者情報の `unknown` をそのまま維持し、`Speaker 1` などへ補完しない。本文・文字時計・1断片1まとまりの既存変換を維持する。
- 新attempt: `runtime/artifacts/digest-new-material-20260926-v001/stt-attempt-003-no-diarization/`。旧attemptの受付・生証拠は上書きしない。
- 実行command: `STT_BASE_URL=<既存GPU接続先> node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/run_new_material_digest_20260926.mts stt-no-diarization`。再開入口 `resume-stt` も新attemptだけを読む。
- 検証: GPU連携 **41/41合格**、runner型検査合格、adapter importと差分書式検査合格。旧32件に、設定あり/なしの送信・保存・再開、設定不一致拒否、入力byte数拒否、unknown保持等を追加した。
- GPU反映確認: 18:13頃と18:19 JSTに既存APIの公開仕様をGET。POSTの項目はfile/languageのみで、話者分離指定はまだ確認できない。新job送信は0件。

旧jobの工程時間は最新指示で提示されたGPU側実測として、Whisper約2分30秒、alignment約64分55秒、
diarizationは長時間継続と記録する。これらの内訳はCodex側で独立取得したログではなく、ユーザー指示の実測報告である。
新jobについてはupload・Whisper・alignment・diarizationのskipped状態・全体を取得できた範囲で別記する。
未取得の内訳を0秒や推定値で埋めず、旧jobの時間を新jobの測定値へ混ぜない。
