# ZEVO字幕品質v002 fixture工程 attempt-0002 停止報告 v001

日付: 2026-08-15

## 結論

ZCQF001は18/18 proofを伴って合格し、ZCQF002だけが開始時admissionで不合格となった。正式結果は1/2。同attempt内の修正は0件。

## 原因と帰属

- receipt、package、manifest、44 artifactは全て読取可能で、file SHA・formal canonical SHA・schemaVersionは一致した。
- admission結果をfreezeする共通処理が、payload中の生byte（malformed envelope、provider raw、module audit）のBuffer本体までfreezeしようとし、Nodeがbyte viewのfreezeを拒否した。
- これは成果物、binding、環境の不一致ではない。返却envelopeをfreezeする際の新設path #18内の実装欠陥である。
- 修正はBufferを不変化処理の再帰対象から外し、外側の返却objectと配列は従来どおりfreezeする一件に閉じる。schema、44 payload、48 file、600行、26 labelを変更しない。

## 限定修正権

使用2/2。これを最後の限定修正とする。新attemptは新fixtureSetIdを使い、attempt-0001/0002のjob、root、全証拠を保持する。

## 証拠

- TAP: `evals/clip_composition/reports/presentation/test-runs/20260815-zevo-caption-quality-v002-fixture-gate-formal-attempt-0002/tap.log`
- stderr: 同rootの`stderr.log`（0 byte）
- 終了code: 1
- signal: null
- API通信: 0回
- 費用: US$0
