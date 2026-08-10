# A-v002 runtime tool profile 正式attempt-0004 停止報告 v001

## 1. 結論

承認された正式attemptを1回だけ実行し、終了code 1の検査済み拒否で停止した。同attemptでの修正・再実行はしていない。

今回承認されたruntime toolのsymlink読取修正は通過した。その次の基礎映像用tool診断で、正式実行の`PATH`が登録済みのApple Silicon版FFmpeg・FFprobeではなく、`/usr/local`側の別実体を選んだ。内容SHAが登録値と一致しないため、runnerは`OUTPUT_V002_BASE_MEDIA_INVALID`として正しく拒否した。

帰属は**実行設営の欠陥**であり、契約矛盾ではない。runtime toolの内容SHA要求、production処理、既存成果物は無傷である。

## 2. 事実

### 2.1 実装・job・旧証拠

| 対象 | SHA-256 | 観測 |
|---|---|---|
| proof runner | `684c9937db26ad32fc086bd3733e8b3de2aed425dd9d8a298e26123845aaa417` | 論理pathを前後2回実体解決し、既存streaming hashで読む限定修正 |
| 同test | `b3665dcc62d9ee0818dbde2f54e7f08e7151e5b9e318c8b133e8ec825c26eea2` | 10/10合格 |
| test TAP | `0efb1125b606a3c40b9ecb728e1ba32beb8e854424890c726817212bc7a762df` | symlink正常受理と読取中の実体差し替え拒否を確認 |
| 新job v003 | `dd6d727bdc909b7f5139b6cb8b9b353ce0f60fc9d5f63f37314c3b2a830a0da1` | v002からproof runner SHA 1欄だけを更新 |
| 旧job v001 | `a07944411b08b72702c1d60b3792ceed7387f61f40d099f7eb7909b812a00e86` | 不変保持 |
| 失敗job v002 | `b5c6b148431724a898d06e09aebdd2dc985aced8fcdc9a838c5dfa15d6633eee` | 不変保持 |
| attempt-0003 fatal stdout | `019d518d68e1cbdfc695deed237a04890c35f9697da4c15f5b007609bce785d2` | 不変保持 |

### 2.2 正式attempt-0004

| 項目 | 観測 |
|---|---|
| 実行回数 | 1回 |
| 終了code / status | `1 / rejected` |
| 違反 | `OUTPUT_V002_BASE_MEDIA_INVALID` |
| 対象path | `/runtimeProfile` |
| stdout | 183 byte / SHA-256 `ea5c07fc3b336500e475bd614f9e1a59a70bd2b338a6aa6d0d0af4f5a7dd4d51` |
| stderr | 0 byte / SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 正式proof出力root | 不存在 |
| 描画・QC・確認ページ | 未実施 |
| API通信・費用 | 0回 / US$0 |

この違反は、runtime 7実体の前後実体解決・内容SHA照合を終えた後にしか発火しない。したがって、今回のsymlink修正が対象としていた読取経路は通過している。新規fatalではなく、既存codeによる検査済み拒否である。

## 3. 拒否値の具体像

正式runtime profileは次の実体を束縛している。

| tool | 登録論理path | 登録先実体 | 登録SHA-256 |
|---|---|---|---|
| FFmpeg | `/opt/homebrew/bin/ffmpeg` | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg` | `d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798` |
| FFprobe | `/opt/homebrew/bin/ffprobe` | `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffprobe` | `dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9` |

一方、attempt-0004の正式`PATH`は`/usr/local/bin`を含むが`/opt/homebrew/bin`を含まない。基礎映像用tool診断はcommand名から次の実体を選んだ。

| tool | `PATH`が選んだ論理path | 実体 | 実測SHA-256 |
|---|---|---|---|
| FFmpeg | `/usr/local/bin/ffmpeg` | `/usr/local/Cellar/ffmpeg/8.0.1/bin/ffmpeg` | `f33afb2c1e6510138dd0dd22c25b09908c2ac55780ddd7c8e35c588f076b9493` |
| FFprobe | `/usr/local/bin/ffprobe` | `/usr/local/Cellar/ffmpeg/8.0.1/bin/ffprobe` | `29db34ccf1e5b433c14c2e856db31dbf1449ffc784a0f5c2e7ec3df040e5e83e` |

Nodeは固定実体を使っている。差はFFmpeg・FFprobeの2件である。

## 4. 事実・推測・未確認

### 事実

- symlinkを含むruntime論理pathの内容SHA照合は通過した。
- その後のtool診断が、FFmpeg・FFprobeについて登録実体と異なる`/usr/local`側の実体を選んだ。
- runnerはSHA不一致を検査済み拒否として止めた。
- 六本の動画、QC、確認ページは作っていない。

### 推測

- なし。拒否位置、`PATH`の探索結果、実体path、内容SHAを実測で確定した。

### 未確認

- 登録済みtool群と同一になるよう正式`PATH`を構成した場合のproof全体結果。再実行は未承認なので確認していない。
- proofの後段に別の不合格が潜んでいるか。今回の停止位置より先へ進めていない。

## 5. 完全性チェックで事前検出できたか

できた。起動前checklistは固定Node先頭、固定TSX、`NODE_OPTIONS`不存在、Chromium起動可能を確認したが、**登録済みFFmpeg・FFprobeが`PATH`から同じ実体へ解決されること**を確認していなかった。実行環境表には`PATH`自体を記録していたため、値レベル照合を行えば通信・正式実行前に検出可能だった。

## 6. 記録済みの教訓

`DECISIONS.md`へ、成果物用の`論理path=実体path`条件をruntime toolへ直接適用せず、前後実体解決と既存streaming hashで照合する裁定を記録した。成果物側の厳格規則は弱めていない。

今回さらに観測されたのは、runtime toolを内容SHAで束縛していても、command名で起動・診断する工程では`PATH`の探索結果まで同じ実体へ揃える必要があるという点である。これは次の再開設計で起動前checklistへ具体化すべき事項であり、本attempt中には変更していない。

## 7. 停止

承認条件どおり、新たな不合格を保存して停止する。同attemptでの`PATH`変更、再実行、job改訂、描画は行わない。人間目視前tag禁止とO1自動接続予約は維持する。
