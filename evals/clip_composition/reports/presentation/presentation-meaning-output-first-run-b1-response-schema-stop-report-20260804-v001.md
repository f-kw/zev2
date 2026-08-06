# 意味/表現分離 初回実データrun B1受入停止報告 v001

- 日付: 2026-08-04
- 対象: `qdczJpv8RCc` candidate 59
- 実行入力記録 SHA-256: `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680`
- 到達地点: B6生成完了後のB1受入
- 結論: B1が回答byteを不受理としたため、意味package以降を実行せず停止した

## 1. 事実

### 1.1 工程入場validator adapter

- 修正対象は工程入場側のB5/B6 target validator返値adapterだけである。
- B5/B6 validator本体、契約、job値、固定5項目、B3、API requestの意味、支出上限は変更していない。
- adapter回帰は49/49合格した。
- 10工程投影testのうち、B5、B6、横型出力、縦型出力は身代わり関数から実validatorへ置換した。
- timeline、B3、B1、意味package、基礎映像、crop適用の6工程は、fixtureが工程投影に必要な一部fieldだけを持ち、正式job全体ではないため身代わり関数を維持した。
  - timeline: source mediaとsegmentだけの投影fixture
  - B3: timeline bindingだけの投影fixture
  - B1: source package、B6 manifest、provider envelopeの3 bindingだけの投影fixture
  - 意味package: binding群とtitleだけの投影fixture
  - 基礎映像: meaning package bindingだけの投影fixture
  - crop適用: run/crop/media投影だけで、正式runtime・schema・binding一式を持たないfixture
- これら6件を正式job化する変更は今回の限定修正を超えるため行っていない。

### 1.2 B5

- stage 03工程入場: 合格
- countTokens: 2回
- generateContent: 0回
- probe入力token: 92,769
- final入力token: 92,769
- 導出した最大出力token: 48,112
- 送信前上限見積り: 499,993,500 nanoUSD = US$0.4999935
- 承認済み上限: 500,000,000 nanoUSD = US$0.50
- secret検査: 合格
- B5 manifest SHA-256: `7a0d4a653c0d5f6d89ab79a2e5a2ece4e998f676ef4ae5e3f5d7a4dc9c4b5346`
- 固定generate request SHA-256: `ac93e47717ffcedde2e863f9acba928ef8e6f2951e1573282146b6233f4b87ca`

### 1.3 B6

- stage 04工程入場: 合格
- generateContent: 1回
- 自動再試行: 0回
- 生応答は解析前に版付き新directoryへ保存した。
- 応答モデル表記: `gemini-3.6-flash`
- 観測tier: `standard`
- usage:
  - prompt: 92,769 token
  - candidate: 989 token
  - thinking: 3,912 token
  - total: 97,670 token
- 実測usageによるStandard単価見積り: 175,911,000 nanoUSD = US$0.175911
- 承認上限内: 合格
- secret検査: 合格
- 生応答 SHA-256: `a9223966adc13ae2a3820bfaf4636a50857a586691ce9af6d4077027d1eab651`
- provider envelope SHA-256: `408616d5ffdca7d305e925a9d5b3632e77fb27f8b2d47f31ef0f89213a7790ce`
- B6 manifest SHA-256: `8d51f0a0c85f7b73ef41fd2eac93c4f3bfcd6b716a890a574a0faa385b6b2f4a`

### 1.4 B1停止

- stage 05工程入場: 合格
- B1正式受入: 不受理
- 違反: `MEANING_BOUNDARY_RESPONSE_SCHEMA_INVALID`
- 違反位置: `/response`
- B1が保存した検査報告 SHA-256: `65381d9932cf3ff73ce821e4f1b80591fe294b0f7d4bcff06b748eb9afb66b67`
- 保存済み意味本文を既存decoderへ読み取り専用で再入力した結果:
  - JSONとしての復号: 合格
  - top-level: `status`, `containers`
  - status: `complete`
  - container数: 2
  - meaning group数: 31
  - Markdown fence: なし
  - 先頭: `{`
  - 末尾: `}`
  - 末尾改行: なし
  - 既存decoderの理由: `byte-envelope-invalid`
- 現行B1契約は回答byteの末尾を `}\n` として要求する。保存済みprovider本文は `}` で終わるため、内容を修復・trim・改行追加せず不受理とした。
- 不受理記録は上書きせず保持した。

## 2. 実行しなかったこと

- 回答への改行追加、trim、fence除去、修復: 0件
- B6再実走: 0回
- 意味情報package生成: 未実施
- 基礎映像生成: 未実施
- crop適用: 未実施
- 横型・縦型の表示計画、描画、QC: 未実施
- 完成動画2本: 未生成
- commit、tag、安定点化: 未実施
- 既存3本の正式成果物pathへの書き込み: 0件

## 3. 推測

- 意味内容の外形はJSONとして成立しているため、今回観測したB1不受理の直接要因は、provider本文に末尾改行がないことと現行byte envelope条件の不一致である可能性が高い。
- ただし、末尾改行条件をどう扱うべきかは契約判断であり、本attempt内では変更していない。
- 末尾改行条件を解決した後のcontainer/candidate/coverage各検査の合否は、まだ分からない。

## 4. 未確認

- 回答内容がB1の後段9検査をすべて通るか。
- 意味packageから横型・縦型QCまで一気通貫で通るか。
- 既存3本の最終tree SHA照合。既存pathへは書いていないが、停止後の正式な全tree再照合は行っていない。
- APIの請求書上の実額。US$0.175911はusage metadataと公式Standard単価による見積りである。

## 5. 停止理由と次の人間判断

承認済み停止条件「回答不受理なら保存して停止」に該当したため停止した。

次に必要な判断は1件だけである。providerが返したJSON本文そのものを保持したまま、B1の回答byte envelopeで末尾改行を必須にする契約を維持するか、provider本文の現実に合わせて契約を最小改訂するかを決める必要がある。後続工程はその判断まで開始しない。
