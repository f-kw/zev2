# candidate 13 正式基礎映像 attempt v002 実行前固定記録

- 日付: 2026-07-22
- 状態: 実行承認済み・正式再試行前
- 対象: `DmWu0jVQfTE` candidate 13「実家の母ちゃんから届いた謎の仕送り『月刊ムー』」
- 人間作業: 0件・0分

## 1. 目的

初回実生成で欠落した48 sampleを、承認済みの絶対時刻配置修正が実データでも保持できるか確認する。正式組立決定、元媒体、人間採用Dの区間列は変えない。残存発話の解決、演出指示、描画、他候補への展開はこの実行に含めない。

## 2. 実行前に固定した入力と出力

| 項目 | 固定値 |
|---|---|
| job | `20260722-first-real-data-base-media-build-v002/build-job.json` |
| job ID | `DmWu0jVQfTE-candidate-13-base-media-build-v002` |
| 正式組立決定 | `assembly-decision.json` / SHA-256 `b2360d5e2aa56075728d692a7d456455d2cac168d47325631cfea4d919e3aa32` |
| 人間採用D照合票 | `formalization-receipt.json` / SHA-256 `a0979241643d77494443ab80880cd3c4dd75be5c0241424a7634082f65275fca` |
| 元媒体 | `DmWu0jVQfTE.native-1080p-h264-opus.mp4` / SHA-256 `a2c4548d07eb387f095a198b8f6892121134c46e8c0d5315e4debf3e083234ee` |
| 新規出力先 | `base-media/DmWu0jVQfTE-candidate-13-v002` |

新規job ID・出力先は旧v001と分離する。失敗時も同じ出力先で再実行せず、結果を報告して停止する。

## 3. 生成manifest v002の診断追補

正式再試行の生成記録には、実際に使ったNode・FFmpeg・FFprobeの解決後実体pathと実行ファイルSHA-256を必須の診断情報として保存する。この追加により生成manifestを`presentation-base-media-generation-manifest-v002`へ改訂し、v001や診断欄欠落を受理する後方互換分岐は設けない。

今回の合否は従来どおり固定された版文字列で判定する。binary hashは追跡用の診断情報であり、期待hashとの一致を合否条件へ昇格させない。完全なtool identity束縛は別の契約改訂候補として残し、この残件だけを理由に正式再試行を止めない。

実装前検査は、生成20件、時間対応15件、描画入口19件、生成から描画入口までの通し2件、合計56/56に合格した。旧生成manifest v001の明示拒否も確認した。

## 4. 旧失敗証拠の実行前状態

| 証拠 | 実行前値 |
|---|---|
| 旧job | SHA-256 `b3933d4b3d0d98df4cfe00f0bdb45cb185c877f9d4f9964fbd416880834634a2` |
| 旧failure | SHA-256 `ca6da7096538a7078b6ce1a5a3542bb93505ba355fad0eba6809ec1e9fade861` |
| 旧lock | inode `81189313` / size `0` / mtime `1784678006` |
| 旧work directory | inode `81189315` / size `160` / mtime `1784678763` |
| 旧publish-tmp | inode `81189314` / size `64` / mtime `1784678006` |
| 旧source-grid | inode `81204471` / size `3384583680` / mtime `1784678777` |
| 旧source snapshot | inode `81189316` / size `1122123146` / mtime `1784678006` |
| 旧video-only | inode `81204444` / size `19445732` / mtime `1784678762` |

実行後に同じ値を照合し、旧失敗物を削除・解除・再利用していないことを確認する。

## 5. 合格条件

1. 元媒体の絶対音声格子が423,073,008 sampleである。
2. 走査済み空白`[0,312)`と`[960,1008)`が全byte `0x00`で、未知空白を黙って丸めない。
3. 人間採用Dと完全に同じ2,535 frame・4,056,000 sampleを生成する。
4. timeline、generation manifest、validation report、基礎映像QCがすべて合格する。
5. 生成manifestが実行した3つのtool binary hashを診断情報として保存する。
6. 旧v001失敗証拠が不変である。

## 6. 成功後の停止点

成功しても、次はcandidate 13の`残存発話の解決パッケージ → テロップ・演出指示書 → 描画`を個別承認で順に進める。今回の実行から自動では進まない。

candidate 11・12・36は、既存の機械提示と外側境界を保全したまま凍結する。candidate 13を描画まで完了した後も、この3件の反復処理より、新しい素材で配管全体の一般性を確認することを優先する。新素材候補は、承認済み配信者プール、チャットリプレイ取得可能を条件とし、`DmWu0jVQfTE`と配信者・話者構成・尺・ジャンルが異なる候補を、既存資産の有無付きでcandidate 13全完了報告時に提示する。

## 7. 承認記録

kawafmmは、音声時刻格子修正の正式attempt v002実行、上記診断記録、成功後の個別承認順、残り3候補の凍結、新素材優先を承認した。完全なtool identity契約の強化は非阻害の残件として維持する。
