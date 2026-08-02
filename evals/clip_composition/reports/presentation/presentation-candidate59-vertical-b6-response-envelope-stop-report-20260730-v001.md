# candidate 59 縦型 B6 応答外形停止報告 v001

- 日付: 2026-07-30
- 対象: `qdczJpv8RCc` candidate 59 縦型 `speaker_only`
- 状態: **停止**
- 停止回数: **2/2**

## 1. 結論

Gemini Developer APIへの生成は、承認どおり1回だけ実行した。
生応答の保存には成功したが、応答中の本文partが、契約済みの`text`だけでなく
`thoughtSignature`も持っていたため、応答外形検査で拒否した。

回答本文の修復、field除去、再送、B1受入、B4表示計画、縦型描画は行っていない。
同じ実行点の人間判断停止が2/2に達したため、追加patchを行わず計画ごと人間へ戻す。

## 2. 事実

### 2.1 B5

- 実物監視を使う一時作業場所検査: 5/5合格
- B5状態: `passed / ready-for-b6`
- `countTokens`: 2回
- 入力: 7,474 token
- 最大回答構造: 65,171 token
- 送信前上限: 499,993,500 nanoUSD（US$0.4999935）
- Gemini生成: B5では0回
- B5 manifest SHA-256:
  `79fe3f4cd0183fed4f9563b47f00fcc25c9b016bf3ae35e4ba0e16b2d13a1b9d`
- 固定request SHA-256:
  `6113191c82f2065d4b0c71f8530dea925c36e31d92fcb0642a0faf58a86d7e83`

### 2.2 B6事前固定

- 縦型B4静的束縛 SHA-256:
  `5bdd50fca0975ffb6000fb4bf5be362daf7d59cc83e4b8420608b615f3cddcff`
- B6 job SHA-256:
  `e63bb76d50f15e027d27f0fc116ac343877b9cfc6e14bfb7100786b043bd6818`
- 送信前に、B5・B3・B4束縛、実装2+21件・15件、固定request、
  未使用出力先を再照合し、問題0件だった。
- 正式実行中に同じ監視領域へ書き込む並行processは0件だった。

### 2.3 Gemini一回実走

- Gemini生成: 1回
- 自動再試行: 0回
- model表記: `gemini-3.6-flash`
- finish reason: `STOP`
- service tier観測: `standard`
- candidate数: 1
- prompt: 7,474 token
- candidate: 1,508 token
- thinking: 5,225 token
- total: 14,207 token
- 公式Standard単価とusageによる費用見積り:
  61,708,500 nanoUSD（US$0.0617085）
- 実際の請求額: 請求書未観測のため未確認
- 生応答:
  `evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-vertical-v001/generate-content-response.raw.json`
- 生応答 SHA-256:
  `73e394a056ff2f8b985d9813d6e61cb074f748544ce510d2d4d52ba5f24422d0`
- 停止記録:
  `evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-vertical-v001/b6-stop-report-v001.json`
- 停止記録 SHA-256:
  `5045aabcca25d8562dde80540391a0c318938aa24fa56176aa385327c56cc102`
- API keyの完全一致漏洩検査: 0件

### 2.4 拒否理由

保存済み応答の本文partのkeyは次の2件だった。

```text
text
thoughtSignature
```

現行B6契約は本文partのkeyをexact `text` 1件に固定している。
このため、`text`が文字列として存在していても、
追加の`thoughtSignature`を未契約fieldとして拒否した。

正式記録上の停止位置は`response-envelope`、
違反は`API_TRANSPORT_CONTRACT_VIOLATION`である。

### 2.5 下流

- B1受入: 0回
- B4表示計画: 0回
- 縦型描画: 0回
- QC: 0回
- 完成mp4: 未生成

### 2.6 既存成果物

横型2本の保存済み正式成果物はH01で不変を確認した。

- candidate 13: 95 path、
  tree SHA-256 `2c68a23d126586b5e071848858edba637e79839bcb5d0906613d4398e9c62464`
- candidate 59: 91 path、
  tree SHA-256 `983763b52a60e10fd99126265e7178e4a600fd3024e00614f8abfcc90a724397`

## 3. 推測

`thinkingLevel: medium`の現行API応答では、本文と一緒に
provider由来の`thoughtSignature`が返る場合があると考えられる。
今回の停止は字幕分割本文の良否ではなく、
providerメタデータを許す契約が未定義だったことによる可能性が高い。

## 4. 未確認

- 保存済み本文がB1を通るか
- 行幅14・2行制約を全箇所で満たすか
- B4の物理配置が合格するか
- 縦型描画とQCが合格するか
- 実際の請求額

本文は正式B1へ渡していないため、上記を合格扱いしない。

## 5. 次に必要な人間判断

判断は1件でよい。

`thoughtSignature`をprovider由来の不透明なメタデータとして版付き契約で受理し、
意味入力は引き続き`text`だけに限定した新attemptを作るか。

承認される場合も、今回の生応答をfield除去して救済せず、
契約改訂後の新しいB6 attemptとして1回だけ実行する案を候補とする。
