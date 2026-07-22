# candidate 13 正式基礎映像 attempt v002 完了報告

- 日付: 2026-07-22
- 実行時commit: `3c2e03772b7db2be718ccf2a30796dbdcc1d8b39`
- job ID: `DmWu0jVQfTE-candidate-13-base-media-build-v002`
- 結果: **合格**
- 人間作業: 0件・0分
- 停止点: 残存発話の解決パッケージは未生成。次の個別承認待ち

## 1. 何が成立したか

人間が実際に聴いて採用したD媒体`cut-gap2`と同じ2区間を、修正済みの絶対音声時刻格子から正式に生成した。初回実生成で失われた48 sampleは今回は保持され、基礎映像、frame正本の時間対応表、生成記録、検査報告の4成果物が新規v002出力先へ公開された。

これは**candidate 13の基礎映像と時間対応表が正式入口を通った**ことを意味する。テロップ・演出指示・描画まで完成したことは意味しない。

## 2. 合格条件の実測

| 条件 | 実測 | 判定 |
|---|---:|---|
| 元媒体の絶対音声格子 | 423,073,008 sample / 3,384,584,064 byte | 合格 |
| 先頭空白`[0,312)` | 2,496 byteすべて`0x00` | 合格 |
| 内部空白`[960,1008)` | 384 byteすべて`0x00` | 合格 |
| 人間採用Dの映像 | 2,535 frame | 完全一致 |
| 人間採用Dの音声 | 4,056,000 sample | 完全一致 |
| 正式区間1 | frame `57,608〜59,330` / sample `92,172,800〜94,928,000` | 完全一致 |
| 正式区間2 | frame `59,442〜60,255` / sample `95,107,200〜96,408,000` | 完全一致 |
| 生成器の検査 | 7項目すべてpassed / 違反0 | 合格 |
| 時間対応表・生成記録・hash graph | すべてpassed / 違反0 | 合格 |

独立監査では、元の3.38GB音声格子から正式2区間を直接連結した4,056,000 sampleと、実際に符号化へ渡したPCMをbyte単位で比較し、不一致0を確認した。空白直後の実音が非zeroであることも確認し、空白範囲を過大にzero化していない。

## 3. 正式成果物

出力先: `evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/`

| 成果物 | SHA-256 |
|---|---|
| `base-media.mp4` | `c0677893902b5a1eaf79b2a3937d67a477f270810200f7c6c01457b42b803c48` |
| `timeline.json` | `802f570dd4f8ea90ef63b0b9afb9a026abf0b18e43e51f2aab51bd62c2180fec` |
| `generation-manifest.json` | `e06a606e7348a8c30a743edd9acd5da96e035125b2b69a33257d0c31cf9b81db` |
| `validation-report.json` | `e906b4424609176d019ddc4c8d314df056feb87de1e993bf84f247eff5c21079` |

生成manifestのschemaは`presentation-base-media-generation-manifest-v002`。job SHAは実行前固定値`36c1c7e049ef3781fe2c38413427fdecf3eebd075ea52844164427d16513ffb0`と一致する。生成実装2ファイルの実byte hashもmanifestの記録と一致した。

## 4. 実行ツールの診断記録

| tool | 解決後path | 実行ファイルSHA-256 |
|---|---|---|
| Node | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` |
| FFmpeg | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg` | `d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798` |
| FFprobe | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffprobe` | `dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9` |

3件とも実ファイルからSHAを再計算し、manifestと一致した。現契約ではこの値を期待hashと照合して合否を決めず、診断追跡に使う。完全なtool identity束縛は別の契約改訂残件であり、今回の合格範囲を過大に広げない。

## 5. 回帰検査

生成manifest v002追加後に次を再実行した。

| 系統 | 結果 |
|---|---:|
| 基礎映像生成 | 20/20 |
| 時間対応表 | 15/15 |
| 描画正式入口 | 19/19 |
| 生成→描画入口の通し | 2/2 |
| 合計 | 56/56 |

旧生成manifest v001、binary診断欠落、不正hashは明示拒否する。後方互換のための受理分岐は追加していない。

## 6. 保存規律

- 旧v001 job、正式決定、D照合票、failureのSHAは実行前後で一致した。
- 旧lock、work directory、publish-tmp、旧work内3ファイルはinode・size・mtimeが全て一致した。
- attempt開始後に更新された`outputs/`内の通常ファイルは、v002専用のlock、work内4ファイル、正式4成果物の計9件だけだった。
- 残存発話の解決パッケージ、演出指示、描画、確認UIは自動生成していない。
- candidate 11・12・36の機械提示、確認記録、外側境界は実行前commitのblobと完全一致した。

新しいlockと約4.5GBのworking directoryは、成功時も自動削除しない既存契約に従い診断用に保持する。正式成果物4点とは分離して扱う。

## 7. 次のゲート

次はcandidate 13の**残存発話の解決パッケージ生成**である。これは切断後に残った発話だけを固定し、消えた区間の発話をテロップや演出が参照しないための入力を作る工程。今回の成功から自動では進めず、kawafmmの個別承認を要する。

その後も`演出指示書 → 描画`を別々に承認する。candidate 11・12・36は凍結を維持し、candidate 13の全工程完了後は同素材内の反復より、新しい素材で配管の一般性を確かめる。

次の人間作業は、残存発話の解決パッケージ生成へ進めてよいかの承認1件だけ。媒体視聴や境界判断は含まず、見積りは1件×1分未満である。
