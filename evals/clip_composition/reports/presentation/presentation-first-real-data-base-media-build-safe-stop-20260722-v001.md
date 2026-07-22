# 初回実データ基礎映像生成 安全停止報告 v001

- 日付: 2026-07-22
- 対象: `DmWu0jVQfTE` candidate 13「実家の母ちゃんから届いた謎の仕送り『月刊ムー』」
- 結果: **生成未完了。公開前の厳密検査で安全停止**
- 人間作業: 0件・0分

## 1. 今回行ったこと

人間が実動画Dを聴いて採用した2区間だけを持つ正式組立決定を、承認済みの実基礎映像生成器へ1回入力した。成功時にだけ基礎映像・時間対応表・生成記録・検査結果を正式出力先へ公開する手順で実行した。

再実行、許容差の追加、期待値の変更、途中生成物の削除、演出指示書生成、描画は行っていない。

## 2. 入力と失敗記録の束縛

失敗JSONは停止が早いため入力欄が`null`である。そこで、本報告で実行job・正式決定・人間採用写像・元媒体・失敗記録をSHA-256で結合して記録する。

| 対象 | path | SHA-256 |
|---|---|---|
| 実行job | `evals/clip_composition/outputs/presentation/20260722-first-real-data-base-media-build-v001/build-job.json` | `b3933d4b3d0d98df4cfe00f0bdb45cb185c877f9d4f9964fbd416880834634a2` |
| 正式組立決定 | `evals/clip_composition/outputs/presentation/20260722-first-real-data-assembly-decision-v001/assembly-decision.json` | `b2360d5e2aa56075728d692a7d456455d2cac168d47325631cfea4d919e3aa32` |
| 人間採用Dとの写像照合票 | `evals/clip_composition/outputs/presentation/20260722-first-real-data-assembly-decision-v001/formalization-receipt.json` | `a0979241643d77494443ab80880cd3c4dd75be5c0241424a7634082f65275fca` |
| 正式1080p元媒体 | `evals/clip_composition/research/downloads/first-gate-unseen/DmWu0jVQfTE/native-1080p/DmWu0jVQfTE.native-1080p-h264-opus.mp4` | `a2c4548d07eb387f095a198b8f6892121134c46e8c0d5315e4debf3e083234ee` |
| 失敗記録 | `evals/clip_composition/outputs/presentation/base-media-failures/failure-5a7d1d8f0cefaf4094d74d86.json` | `ca6da7096538a7078b6ce1a5a3542bb93505ba355fad0eba6809ec1e9fade861` |

正式組立決定のpayload hashは`7fbdc54c548be6e7a475cb54f221644c3d7ff5ce89442cd6a38fbccc7bd13755`。人間採用Dの写像は合計2,535 frame・4,056,000 sampleのままで、今回の停止による変更はない。

## 3. 検出した不一致

違反は`BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID`の1件。

| 音声の全体時刻格子 | sample数 |
|---|---:|
| 元媒体のpacket/stream時刻から必要な長さ | 423,073,008 |
| 現生成器が作った音声格子 | 423,072,960 |
| 不足 | 48（48kHzで1ms） |

これは1msなら許容できるという問題ではない。空白を詰めてしまうと、その位置より後の全音声が元動画の時刻に対して1ms早くなり、人間採用Dとの完全一致契約を破る。

## 4. 原因

元媒体の破損ではなく、**正式な音声時刻格子を作る実装の不適合**である。

音声冒頭付近には次の構造がある。

- 最初の復号音声: 開始312 sample、長さ648 sample、終了960 sample
- 次の復号音声: 開始1,008 sample、長さ960 sample
- 復号音声が無い区間: `0〜312`と`960〜1,008`

連続して復号した実音声は423,072,648 sample。2つの空白312+48 sampleを元の位置へ無音として置けば、正式長423,073,008 sampleになる。

現実装がFFmpegへ指定した音声変換は、先頭の312 sampleだけを無音で補い、内部の48 sampleを補わなかった。残存byteも、`0〜312`は無音だが、本来無音であるべき`960〜1,008`へ次の音声が前詰めされていることを確認した。

承認済み契約は「復号時刻の正の空白を同じ長さの無音として保持」と定めているため、契約や正式決定を緩める理由ではない。合成テストがAACの大きな空白だけを扱い、Opusの初期遅延直後にある48 sampleの短い空白を再現していなかった、実装とテスト網羅の問題である。

## 5. 安全停止の結果

- 正式出力先`evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v001`は存在しない。
- 正式な基礎映像、時間対応表、生成manifest、QC結果は作成・公開されていない。
- したがって、人間採用Dとの2,535 frame・4,056,000 sample照合は未実施であり、合格とは報告しない。
- 残存する`video-only.mp4`は2,535 frameだが、診断用の未検証途中物であり成功成果物ではない。
- 演出指示書、残存発話の解決パッケージ、描画は未着手。

失敗時保持契約どおり、次の途中物を自動削除せず残した。

- lock: `evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v001.lock`
- 作業先: `evals/clip_composition/outputs/presentation/base-media/.DmWu0jVQfTE-candidate-13-v001.work-kc4Zt6`
- 空の公開準備先: `evals/clip_composition/outputs/presentation/base-media/.DmWu0jVQfTE-candidate-13-v001.publish-tmp-NjkIlb`

途中物は診断用に保持するが、巨大な元媒体snapshot・音声格子・映像単体はGitへ登録しない。

## 6. 次のゲート

現在の主線は**実基礎映像生成の再実行ではなく、音声時刻格子の不適合修正設計の提示**で停止する。

設計候補は、FFmpegの暗黙補正へ依存せず、復号した音声を実際の時刻位置へ置き、記録済みの全空白へ明示的に無音を入れる方式である。少なくとも次を実装前に固定する必要がある。

1. 復号した実音声のsample総数を検査する。
2. 記録済み空白を絶対位置へ無音として挿入する。
3. 実音声総数+空白総数が正式時刻格子の長さと完全一致することを検査する。
4. 各空白の実byteがすべて無音であることを検査する。
5. 今回の312 sample初期空白+48 sample内部空白を再現する回帰テストを追加し、既存の大きな空白・末尾処理検査も維持する。

48 sampleを許容差にする、期待長を短くする、末尾へ48 sampleだけ足す対応は禁止する。修正設計と試験範囲を人間が承認するまでは、コード変更、失敗途中物の削除、再実行、次の「残存発話解決→演出指示→描画」へ進まない。
