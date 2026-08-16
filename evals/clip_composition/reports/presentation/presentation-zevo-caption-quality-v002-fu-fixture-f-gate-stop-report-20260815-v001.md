# ZEVO字幕品質v002 F/U fixture製造後 F局所停止報告 v001

## 1. 結論

F/U fixture製造工程は成立した。新規検査は最終attemptで2/2、内訳34/34に合格し、正式fixture package 48 fileとadmission receiptを原子的に公開した。

続くF局所正式attemptは0/3で停止した。原因はproduction、fixture package、receiptの内容ではない。receipt admissionへ移行する前の旧test環境検査が残り、正式package rootを「空でなければならない旧fixture directory」として検査したためである。3検査はいずれも開始前hookで止まり、productionへ到達していない。

承認済み限定修正権はfixture工程の先行2不合格で2/2を使用済みである。そのため同attempt修正、追加修正、U以降への進行は行わず停止した。

## 2. ゲート結果

| ゲート | 結果 | 意味 |
|---|---:|---|
| fixture新規検査 attempt-0001 | 0/2 | package親準備とreceipt型検査順の実装欠陥。限定修正1/2を使用 |
| fixture新規検査 attempt-0002 | 1/2 | Bufferを凍結しようとしたadmission実装欠陥。限定修正2/2を使用 |
| fixture新規検査 attempt-0003 | 2/2、34/34 | 製造・再読・拒否枝を含め合格 |
| 正式fixture製造 | 合格 | 48 file、44 payload、600環境行、26保持行をpackage/receiptとして公開 |
| F receipt admission preflight | 合格 | 44成果物と600環境行をreceiptから再読可能 |
| U入力preflight | 合格 | receipt内のU確認入力がproduction validatorに合格 |
| F局所正式attempt | 0/3 | 旧環境検査の開始前hookで停止。production未到達 |
| U局所・正式48件・回帰 | 未実施 | F停止に従い開始していない |
| green・baseline・tree照合 | 未実施 | 同上 |

## 3. 三分法

| 分類 | 判定 | 根拠 |
|---|---|---|
| production欠陥 | 該当しない | 3件全てが共通開始前hookで停止し、F productionは未実行 |
| fixture／検査設営欠陥 | 該当 | `run-root:entries`と`fixture-root:entries`の旧期待が、新しい48-file packageの実在と衝突 |
| 契約解釈 | 不要 | 承認済み設計は旧5行環境検査をreceipt admissionへ置換することを既に固定している |

## 4. 直接原因

F testの開始前処理に、旧方式の作業場所5行検査が残った。新方式では正式package rootに48 fileが存在し、F用payload directoryにも製造済み成果物が存在する。旧検査はこれらを空であるべき場所として扱うため、`run-root:entries`と`fixture-root:entries`を不合格にした。

これはreceiptを必須化する配線を追加した一方で、置換対象だった旧入口を除去しなかった実装漏れである。新fixtureの内容不正ではない。

## 5. 限定修正権

使用回数は2/2。

1. 固定package親を明示作成し、receipt pathの型をprefix検査前に拒否する修正。
2. admission返却の深い凍結でBufferだけを凍結対象外にする修正。

F停止後の追加修正は0件。同attempt修正も0件。

## 6. fixtureSetId履歴

| fixtureSetId | 結果 | 保持状態 |
|---|---|---|
| `zevo-caption-quality-v002-fu-selftest-20260815-attempt-0001` | 公開前停止 | jobと証拠を保持 |
| `zevo-caption-quality-v002-fu-selftest-20260815-attempt-0002` | 公開後admission不合格 | 使用済みrootを不変保持 |
| `zevo-caption-quality-v002-fu-selftest-20260815-attempt-0003` | 新規検査2/2合格 | rootを保持 |
| `zevo-caption-quality-v002-fu-formal-20260815-attempt-0001` | 正式製造合格、F開始前停止 | 48 fileとreceiptを不変保持 |

削除、上書き、root再利用は0件。

## 7. 証拠

- [fixture attempt-0001 TAP](./test-runs/20260815-zevo-caption-quality-v002-fixture-gate-formal-attempt-0001/tap.log) — SHA-256 `e59caff053960ea1ce13b2617cf62d4556ebe13fc07a9e220745c3d7a88349f4`
- [fixture attempt-0002 TAP](./test-runs/20260815-zevo-caption-quality-v002-fixture-gate-formal-attempt-0002/tap.log) — SHA-256 `a0a6ccc9d59f023227a61446f57ceded05e712fc4ad754482dc578fedbffff62`
- [fixture attempt-0003 TAP](./test-runs/20260815-zevo-caption-quality-v002-fixture-gate-formal-attempt-0003/tap.log) — SHA-256 `42a01ca16412eeae005203b6ae66ea5d0dc8e7b3d65b33bd74f6e9e52a27acdf`
- [正式fixture製造結果](./test-runs/20260815-zevo-caption-quality-v002-fixture-manufacture-formal-attempt-0001/stdout.json) — SHA-256 `a73ce00ea290c95da5eb764842dc5669f38bad95af62457826f6a8fcea9b07ce`
- [正式admission receipt](./test-fixtures/zevo-caption-quality-v002/zevo-caption-quality-v002-fu-formal-20260815-attempt-0001/fixture-admission-receipt-v001.json) — SHA-256 `b282894515515d4b42ee40f47c7f685bcfcf629c6a66a29ebc88186430990ac0`
- [正式fixture package](./test-fixtures/zevo-caption-quality-v002/zevo-caption-quality-v002-fu-formal-20260815-attempt-0001/fixture-package-v001.json) — SHA-256 `7cb6be1ec76db86254ae6e216820ae8281e2f5bb987754c3aa97f2fce2bc7a7f`
- [F停止TAP](./test-runs/20260815-zevo-caption-quality-v002-fu-receipt-f-formal-attempt-0001/tap.log) — SHA-256 `60124e15ab2e663bcd4f08fe0a07d51ca3a74849b697606b2942cefce81540f8`

全attemptでTAPまたはstdout、stderr、終了code、signalを独立保存した。

## 8. 要裁定

再開に必要な判断は1件。

承認済み設計どおり、F testに残った旧5行環境検査を除去し、receipt admissionだけを正式なfixture受入入口にする追加修正を許可するか。

許可される場合も、既使用rootを再利用せず、新しいfixtureSetIdでpackage/receiptを製造してFを頭から実行する。

## 9. 未実施と不変確認

U局所、正式48件、直接影響回帰、green再集計、baseline 86/203、既存tree照合は未実施。API通信0回、費用US$0、countTokens 0回、generateContent 0回、正式描画0回、commit 0件、tag 0件。

