# 承認済み文書の単一文字置換 事故記録 v001

- 記録日: 2026-07-26
- 対象: B4の実装正本・後続判断正本となる承認済み文書
- 結論: **作業ツリー上だけで文書全体が単一文字へ置換された事象を2例確認**
- 原因: 未特定。推測しない
- Git正本: 2例とも無傷
- 復元: 2例とも承認時commitからbyte同一復元済み

## 1. 共通して確認できたこと

2例に共通するのは、複数千byteのMarkdown文書全体が、作業ツリー上だけで単一文字へ置き換わったことである。

- indexとGit commit内の正本は変更されていない。
- 未stageの作業ツリー変更として発生した。
- Git logとreflogから、書き込んだprocess、session、人は特定できない。
- 変更後文字は異なるが、「文書全体の単一文字置換」という形は同じである。
- 原因や主体を推測で補わない。

この共通形を、**承認済み文書の単一文字置換**として既知事象へ登録する。

## 2. 事例1: `s`

| 項目 | 事実 |
|---|---|
| 対象 | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-v003-contract-core-implementation-addendum-20260725-v001.md` |
| 承認時commit | `07c60b0364b7b6661e47e25c245dcc12a85f0644` |
| 承認時Git blob | `c22eb4a2237b3c01158be77b2cbacbae1245b02a` |
| 承認時byte数 | `23,327` |
| 承認時SHA-256 | `abeb8e098d830af1af5c540759b3971a508faa53bb75e8380e6f8352a0ccee16` |
| 変化後 | 一文字`"s"`、1 byte |
| 作業ツリー更新時刻 | 2026-07-25 13:35:16 JST |
| 判明時刻 | 2026-07-25 13:40:27 JSTまでに判明。停止報告commit `3dbf2ef2f006525c63b98474b79187f92a890e79`で記録 |
| Git正本 | 無傷。HEADとindexは承認時blobを保持 |
| 復元 | 人間承認後、commit `07c60b03`からbyte同一復元 |
| 復元後 | 23,327 byte、SHA-256 `abeb8e...`、承認時commitとの差分0 |

詳細な初回監査は
`presentation-candidate13-caption-gate-b4-contract-closure-and-approved-document-recovery-addendum-20260725-v001.md`
§3に保持する。

## 3. 事例2: `å`

| 項目 | 事実 |
|---|---|
| 対象 | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-number-token-invariance-comparison-stop-report-20260725-v001.md` |
| 正本commit | `171751885fc75943b392c566309062916118ba98` |
| 正本Git blob | `3f1341fe2065db878855042ec10b85ae94e2fbc5` |
| 正本byte数 | `6,521` |
| 正本SHA-256 | `d49f6ce300fa7a6ab6b606e2551c217c53e9a9fee739e0bdeddb99e34eef6486` |
| 変化後 | 一文字`"å"`、UTF-8で2 byte |
| 変化後SHA-256 | `e83979df9d36090142f23051f8e8d7ad48e5c20dff5c9e7b92ca3454f67469f9` |
| 作業ツリー更新時刻 | 2026-07-25 21:52:26 JST |
| 判明時刻 | 2026-07-25 21:57:39 JSTまでに判明。来歴分離追補commit `ed8d1f64ade33f58c18d94ed910ef5903afb6efb`で記録 |
| Git正本 | 無傷。HEADとindexは正本blobを保持 |
| 復元 | 2026-07-26、人間の直接承認によりcommit `17175188`からbyte同一復元 |
| 復元後 | 6,521 byte、SHA-256 `d49f6ce3...`、正本commitとの差分0 |

復元では内容の編集、merge、期待値の更新を行っていない。承認済みcommitのbyteをそのまま現行pathへ戻した。

## 4. 照合対象の拡張

既存の承認済み文書照合は、B4設計書と契約追補4件だけを対象にし、停止報告を含んでいなかった。

今回から、次の両方を照合対象とする。

1. 実装契約の正本となる承認済み設計書・追補。
2. 人間が後続の再開判断に使い、次工程の契約入力となった停止報告。

現時点のB4照合対象へ次の2件を追加した。

- 数値token不変比較の停止報告。正本commit `17175188`。
- 承認済みの結果・来歴分離追補。正本commit `ed8d1f64`。

照合は従来と同じく、path、承認時commit、Git mode、blob object ID、byte数、SHA-256、安定読取を検査する。不一致時に自動復元、最新作業ツリーからの期待値更新、黙ったmergeを行わない。

## 5. 今回の復元照合

| 対象 | 正本byte | 復元後byte | 正本SHA-256 | 復元後SHA-256 | commitとの差分 |
|---|---:|---:|---|---|---|
| `...v003-contract-core-implementation-addendum...md` | 23,327 | 23,327 | `abeb8e...` | `abeb8e...` | 0 |
| `...number-token-invariance-comparison-stop-report...md` | 6,521 | 6,521 | `d49f6ce3...` | `d49f6ce3...` | 0 |

2例目の復元後に、拡張後の承認済み文書照合を実装開始phaseで実行し、対象全件の合格を確認してから来歴比較へ進む。1件でも不一致なら、その場で停止する。

## 6. 拡張後の初回照合結果

実装開始phaseの初回照合は`failed`となった。対象6件中、今回追加した停止報告と来歴分離追補を含む4件は合格し、従来から対象だった2件が不合格だった。

不合格2件は単一文字置換ではない。いずれも作業ツリーがHEADと一致しており、commit `a651e73b043bd8cb97bfffe2f284a35ede90abd7`で、承認済みの後続追補に基づく改訂履歴と新正本案内が8行ずつ追加されていた。一方、照合台帳はそれ以前の初回承認commitを指したままだった。

したがって、初回照合の不合格は次の二つを分離して示した。

1. 単一文字置換2例の復元は成立し、今回追加した2 bindingも合格した。
2. 承認後に本文追記された既存2文書について、照合台帳のapproval binding更新が未実施だった。

台帳値を実測後に自動更新せず、来歴比較・検査327件・preflight v002へ進まず停止した。詳細は
`presentation-candidate13-caption-gate-b4-approved-document-binding-preflight-stop-20260726-v001.md`
へ記録する。
