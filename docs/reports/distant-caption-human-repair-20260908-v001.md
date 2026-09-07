# 遠方接続・人間指定による終盤3字幕の局所修正

## 現在の結論

「ZEV進行管理２ 指示-014」と、その後の「3字幕を指定した」を受け、実際に保存された人間frame観測3件だけを正式入力へ昇格した。修正版の生成、renderer admission、technical QC、来歴・SHA照合まで合格した。**HUMAN_DECISION：終盤25秒の4点確認待ち**。人間の知覚評価はCodexが代行していない。

最終確認画面：<http://127.0.0.1:49763/>（当該PCのEdge）。修正版そのものの最後25秒を配信し、別の確認動画への再符号化は行わない。既に合格した遠方接続の意味・文脈・構成・見心地は再評価しない。

## 受領した指定と反映結果

|正式な字幕本文|従来の開始→終了frame|人間指定後の開始→終了frame|反映|
|---|---:|---:|---|
|マジ今んところ今年一怖すぎて笑った|1255→1598|1255→1338|開始を維持し、消える位置だけ変更|
|ビデオ見る気?|1598→1628|1505→1565|開始・終了を変更|
|もう勘弁してよ夜中になんか映るようなやつ|1628→1671|1576→1671|開始を変更。人間が指定した終了は既存値と同じ|

frameは完成動画の先頭を0とする。終了はそのframeから表示しない排他的境界。最終字幕の終了1671は、人間が最終コマ1670を確認し、その直後を選んだ観測である。指定された境界は5か所、従来から変わった値は4か所。機械で表示秒数や新しい発話境界を推定していない。

人間指定原本3件と「3字幕を指定した」という確定を `human-caption-boundary-v001/confirmed-observations.json` に束縛した。この確定記録のSHA256は `6425cc8791070b9fd9411201f910c662a4bd96d2eb117895dffc6683ccbef38b`。対象字幕ID・本文ID・選択した映像frame・出力と元音声sample・厳密な時刻分数・確認画面と旧完成動画と基礎映像と音声packetのSHAを照合した。別領域に保存したUI検査用の合成値は採用していない。

## 修正処理

人間のframeを、既に確定している採用区間の映像時計と音声sample配置で解決した。既存Coreが受け取る時刻表現へ変換し、その時刻をCoreで再解決すると人間のframeへ完全に戻ることを全5境界で検査した。採用区間の端では既存の正式端点を参照した。独自のoffsetや係数、STTへの近傍丸めは導入していない。

対象3字幕の表示範囲だけを差し替え、本文IDの列と表示区切りを保って正式字幕入力とSHA参照を再構築した。元のSTT観測と意味入力は親成果の参照として保存され、新しい発話の音響推定として上書きされない。映像・字幕の共通製造処理、Core、renderer、style、QC規則は既存実装のまま使用した。

修正版は `evals/clip_composition/outputs/presentation/work-distant-connection-skill-e2e-20260907-v001/caption-human-repair-v001/render/presentation-rendered-v002.mp4`。

- 修正版SHA256：`87ad00ae273471487cc6b90ef936dac0fa0f82072d5a74da8d03b328b03faabb`
- 基礎映像SHA256：`2ce0e6649bd76deefc015aaf735c5a758229118a605ff25ddcf6ea2c37711195`
- 音声packet payload SHA256：`fbe7dbfd23e208ca77248b67a96a17f86c83748be7bf6543f3a33f337637a08f`

## 検査結果と不変範囲

- Nodeテスト12件合格。人間値による正式入力の決定的な再構築、合成値・別動画・別本文・未観測frame・不正sample・欠落した人間開始指定・非整数frameの拒否、対象外字幕・本文・表示区切り・style変更の検出を確認した。
- rendererの受入検査とtechnical QC合格。全1,671frame、55.7秒、音声packet SHA一致。全4字幕の実際の改行・配置が旧結果と一致し、各字幕を実描画したoverlayとQCで使ったoverlayの実byte SHAも一致した。
- 前半・後半の選択、前後2区間の4境界、無言の恐怖映像を含む基礎映像は同じファイルSHA。音声packetも同じ。字幕を焼き込んだ修正版MP4は新しいファイルになるため、旧完成MP4とのbyte一致を主張するものではない。
- 他の1字幕は本文・開始終了・表示区切りを維持。全68本文IDと本文を維持し、対象3字幕に属する表示範囲だけを変更した。前半・後半selection、表示区切りの判断結果、rendererのstyle・QC設定は同一。
- 旧完成MANIFESTの64参照（ファイルと媒体）、旧人間指定画面MANIFESTの11参照、別作業13変更の実SHAは全て不変。
- 最終確認画面はEdgeで再生、25秒末尾での停止、先頭への復帰を実操作し、4点の確認文が読める配置も確認した。JavaScript構文検査合格。知覚上の字幕同期の合否は未判定。

実行したコマンド：

```text
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/repair_distant_caption_human_v001.mts build
node --import ./runner/node_modules/tsx/dist/loader.mjs --test evals/clip_composition/test_repair_distant_caption_human_v001.mts
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/repair_distant_caption_human_v001.mts render
node --check evals/clip_composition/outputs/presentation/work-distant-connection-skill-e2e-20260907-v001/caption-human-repair-v001/final-review/app.js
```

詳細証拠は修正版ディレクトリの `pre-render-verification.json`、`final-verification.json`、`renderer-result.json`、`process-observation-evidence.json`、`scope-and-test-verification.json`。実行ログ原本はbyte列とSHAを集約資料に保存し、今回の描画一時物を整理する。動画本体はローカルに保持し、報告・検証資料・MANIFESTを既存Driveフォルダへ同期する。

## 最終確認と相談役への報告

最後25秒について、①「今年一怖すぎて笑った」の消え方、②次の字幕の開始・終了、③最後の字幕の開始・終了、④終盤全体の流れ、の4点だけを人間に確認してもらう。4点全て問題なしというkawafmmの回答を相談役経由で受領してから字幕同期を合格として閉じる。

この段階では字幕同期全体の完成承認を宣言しない。今回の変更だけをtest後のcheckpointとしてcommit・通常pushし、local main・origin/main・GitHubの実main参照を一致確認する。同じcommitの報告・検証資料・MANIFESTをDriveに同期してから、「ZEV進行管理２」へ技術完了の監査と人間最終確認待ちを報告する。
