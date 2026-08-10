# A-v002 基礎映像一時path 読み取り診断 v001

## 1. 結論

attempt-0005の基礎映像は正常に生成され、既存の正式QCにも合格する。停止原因は、proof runnerがmacOSの一時領域に置いた`base-media.mp4`へ、workspace成果物用の「論理pathと実体pathが同一であること」を要求する厳格hash入口を直接適用した実装欠陥である。

一時領域の論理pathは`/var/...`、実体pathは`/private/var/...`である。内容は同一でも厳格入口が`unsafe-file`として拒否した。productionの映像・音声組立、FFmpeg、FFprobe、入力、契約の欠陥ではない。

## 2. 保存済み実体の観測

診断には保存済みattempt-0005と一時作業物だけを使用した。正式jobの再実行、API通信、成果物変更は0件、費用はUS$0である。

| 実体 | 観測 |
|---|---|
| `video-only.mp4` | 12,995,758 byte、H.264、1920x1080、30fps、755 frame、25.166667秒 |
| `encode-input.f32le` | 9,664,000 byte、48kHz stereo換算1,208,000 sample frame |
| `base-media.mp4` | 13,624,452 byte、映像755 frame、AAC 48kHz stereo、音声1,208,000 sample、25.166667秒 |
| `base-media.mp4` SHA-256 | `6fe8c8ac4b41379073b5f194c1a3e5977a64ed39434c8842fe7db03b40247f7e` |

既存productionの正式QCを保存済み`base-media.mp4`へ読み取り専用で適用した結果は`passed`だった。映像復号payload SHAは`8317d858774c7ed87924f7cb71cc38c121992170e1b923efea38805546d22b95`、有効音声payload SHAは`deb690db70255a2066cedd106d904b0729226d0c42abdaf79da40a75a1c77142`、音声packet SHAは`9a5906f21a8a2d8e90094a8350a1c40abbeb473df0aac1dcb60569f8b0dbb67c`である。

FFprobe、全映像・音声decode、正式QCはいずれも終了code 0だった。今回の停止に対応する外部toolの非0終了codeはない。

## 3. 失敗工程の確定

proof runnerの実行順は次である。

1. 映像だけの媒体を生成する。
2. 採用区間の音声を組み立てる。
3. 映像と音声をmuxする。
4. 完成した基礎映像を正式QCする。
5. 基礎映像のSHA-256を計算する。
6. timeline、manifest、検査receiptを公開する。

保存物では1〜4が成立し、6の成果物は0件である。5で使われた厳格hash入口を同じ保存物へ適用すると、論理path`/var/folders/.../base-media.mp4`は`unsafe-file`で拒否される。一方、`realpath`で得た`/private/var/folders/.../base-media.mp4`へ同じhash正本を適用すると、上記SHA-256を返して合格する。

したがって具体的な失敗工程は「基礎映像QC後、timeline公開前の基礎映像SHA計算」、失敗値は論理pathと実体pathの差、内側結果はprocess内の`unsafe-file`である。外部tool終了codeは該当せず、診断に用いた全ての正式tool処理は0だった。

## 4. 三分法の帰属

| 分類 | 判定 | 根拠 |
|---|---|---|
| 実装修正が必要 | 該当 | proof runnerが一時媒体へworkspace成果物用の厳格path規則を直接適用した |
| job・実行設営 | 非該当 | 固定Node・TSX・FFmpeg・FFprobeの実体/SHAは一致し、媒体処理も全て終了0 |
| 契約解釈 | 非該当 | 内容SHA一致の要求は維持したまま、読取前後に実体pathが差し替わらないことも検査できる |

## 5. 限定修正と水平確認

既にruntime toolで使っている「論理pathを前後2回実体解決し、同じ実体であることを確認してから既存stable streaming hash正本で読む」入口を、用途中立の名前へ整理して共用する。

適用箇所は2件だけである。

- 横型候補の一時`base-media.mp4`
- 縦型字幕診断の一時`base-media.mp4`

workspace内の正式成果物とレンダラー作業成果物は従来の厳格入口を維持する。SHA計算、媒体処理、契約、schema、正式成果物、live束縛を変更・複製しない。

使用済み出力root、attempt-0005、一時作業物、本停止報告は失敗証拠として不変保持する。修正後の正式実行は、新しいrunner SHAだけを束縛した版付きjobと、新しい版付き出力rootで行う。

## 6. 事実・推測・未確認

### 事実

- 基礎映像実体は正式QCに合格した。
- 論理pathでは厳格hashが`unsafe-file`、実体pathでは同じ正本が内容SHAを返した。
- runnerのコード順と未生成成果物から、停止位置は基礎映像SHA計算に一致する。

### 推測

- なし。

### 未確認

- 限定修正後の正式proof attemptが6本の描画・QC・確認ページまで完走するか。これは新しい正式attemptでだけ確認する。
