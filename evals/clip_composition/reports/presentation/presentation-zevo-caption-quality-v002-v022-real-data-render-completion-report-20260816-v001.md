# ZEVO字幕品質v002 v022 実データ描画完了報告 v001

## 1. 結論

v022の正式selectionを変更せず、旧v3人間合格素材3件をP/R/Fへ通し、横型3本を正式描画した。3本とも描画後QCへ合格し、確認ページとcompletion reportを同じ正式rootへ原子的に公開した。

正式runnerは終了code 0、signal 0、stderr 0 byte、`passed / completed`である。API再送、回答修復、字幕本文・253境界・契約・production・fixture値の変更は0件である。

機械検証は完了した。A-v002＋ZEVO字幕品質v002の人間合格は、kawafmmが確認ページの3本を目視して5項目を判定するまで未成立とする。

## 2. 描画前閉包

| 項目 | 結果 |
|---|---:|
| APFS判定の組込み前実測 | `apfs` |
| job版更新の従属field一件表 | 12/12 |
| 更新field | job ID・正式出力rootの2件だけ |
| 共通不変field | 10/10 |
| 正式出力・staging親 | 実directory、非symlink、書込・探索可 |
| 必須directory | 3/3 |
| 未使用path | 20/20 |
| renderer一時work prefix | 3/3 |
| file/canonical束縛 | 156/156 |
| 固定runtime・native arm64・NODE_OPTIONS不存在・固定PATH | 合格 |
| Chromium起動 | 合格 |
| 正式command形 | 合格 |

APFS判定は、対象pathから`df`でdeviceを解決し、`diskutil`のplistを`plutil`で読み、構造化値`FilesystemType=apfs`を得る方式へ置換した。旧`stat`測定のfailed recordは上書きしていない。

## 3. 正式実行

| 項目 | 値 |
|---|---|
| job ID | `a-v002-caption-quality-v022-proof-20260816-v003` |
| job内attempt ID | `attempt-0001` |
| 外側正式attempt | `formal-attempt-0003` |
| 開始前preflight時刻 | 2026-08-16T13:20:15+0900 |
| 完了時刻 | 2026-08-16T13:32:28+0900 |
| 終了code / signal / stderr | 0 / 0 / 0 byte |
| CLI結果 | `passed / completed` |
| 正式completion report | `passed` |

completion reportの9 checksは、case集合、selection、page/line plan、render plan、描画、QC、renderer作業来歴、4frame fade証拠、確認ページ公開、旧tree不変を全て`passed`とした。

## 4. 完成動画とQC

| case | 尺 | frame | video SHA-256 | QC |
|---|---:|---:|---|---:|
| voice-013 | 25,167ms | 755 | `c7fc6c07fbd1ad94851e02774d735f4ef8da82052b67dc9afd8cd6100ef21811` | passed |
| voice-067 | 21,367ms | 641 | `85dac1f3bdb22083c1d3cf67e23a2ac82f39a4cf1b207cfd95fd718b14dc2ad3` | passed |
| voice-190 | 26,900ms | 807 | `dd27a406c5339952b8f94e6e186b09975a6d4c5918836f8be51725c99e324cbe` | passed |

各QCは、命令適用、layout・可視性、動画・音声媒体の三群へ合格し、違反0件である。browser描画ではcanvas実測と推定値の大きい側を使う既存処理を維持し、最終的な描画後QCを省略していない。

## 5. 目視対象

確認ページは横型3本、全cueのframe範囲・表示frame数・表示行、既存4frame fadeの注意を一画面へ収めた。目視する5点は次である。

1. 前の発話の文字が次の発話まで残っていない。
2. 一行に収まる短い発話が改行されていない。
3. 長い発話だけが必要な位置で自然に二行へ分かれている。
4. 全文に文字の欠落・重複・逆順がない。
5. 最短cue（voice-067、9 frames）が4frame fadeで読めない・不自然に瞬く見え方になっていない。

v021で不合格だった「てめぇはしゃぎやがってじゃ報告しない」は、v022では「てめぇはしゃぎやがって / じゃ報告しない」の二行となり、正式物理配置と描画後QCへ合格した。

## 6. 自走修正一件表

| 原因 | 不合格証拠 | 修正 | 事前実測 | 修正後証拠 |
|---|---|---|---|---|
| macOS `stat`の書式がfilesystem種別ではなくmount先`/`を返した | failed preflight SHA `b53a9a09de9d5425a69a30dbcf05095020f66ba02d6ec95c8ef36fc7e0419a59` | preflight測定だけを`df`→`diskutil -plist`→`plutil`へ置換 | `FilesystemType=apfs`、記録SHA `bd99a11c506bd68eda183f8d799717f13c4ef02e326688c2f12734f9c1cae531` | passed preflight SHA `fa74ca794ca9b3b7bb1075c905fffab25c358b58294d559cefefc3ef3dcac334` |

修正はpreflight測定commandだけに閉じ、production・契約・正式selection・fixture・API・費用へ触れていない。新版jobの従属閉包記録SHAは`c6795627827fac4f5696125380da7039d260519de62b47f063cd1b0c5fe76823`である。

## 7. 主要証拠

| 証拠 | SHA-256 |
|---|---|
| 正式selection | `d6a3b27ef8d334e2c043310786149852d958b4567f9dbd6c5e4cc762d4cbb625` |
| 既知6境界6/6 record | `0d890fc37133c901699710178eb4578b01fab87bdc12eb91e0e3255df0413d0d` |
| 新版proof job | `c2c26968989cf838cf3c6b24e952afddeadb08e6703cf424918351dc659f3dbc` |
| 正式CLI結果 | `9eb69f2ec9fdcb22e9b9bc1164eb8f9a36ae2a5a1dfbc157222f5d380241fddd` |
| completion report | `4b1f04ecf75fbabd9322f28c4960e825b7a59e712aa1428c10f7b92e173d57b4` |
| review input | `d8f391e99088fed10106703525cd73698b26469dfffd02f8600f46aebc3187ab` |
| review HTML | `88db5c70b3d0dd5f17be07bd15dc3811b1894c7499f835d2c585e8e2212488ae` |

## 8. 外部作用と停止点

- 本再開区間のAPI通信: 0回
- 本再開区間の費用: US$0
- secret保存: 0件
- API回答の修復・再利用変更: 0件
- commit: 0件
- stable tag: 0件
- 縦型描画: 0件（承認範囲外）

確認ページ準備まで到達したため、ここで停止する。
