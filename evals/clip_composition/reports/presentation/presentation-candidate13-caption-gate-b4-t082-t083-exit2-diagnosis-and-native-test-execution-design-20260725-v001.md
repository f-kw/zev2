# candidate 13 字幕表示計画 B4 T082・T083 終了code 2診断／実行環境修正設計 v001

- 日付: 2026-07-25
- 対象: fixture修正後のT082・T083
- 状態: **読み取り専用診断完了。実行環境修正設計の提示で停止**
- 実装変更: なし
- 人間作業: 0件

## 1. 結論

T082・T083は同一原因で終了code 2になっていた。

正式CLIは、fixture修正によって意味入力の再構築段階を通過し、次の実配置検査へ到達した。実配置検査が固定済みのTSX実体を子processとして起動すると、TSXが内部通信用のUnix socketを`/tmp`へ作ろうとし、現在の制限実行環境から`EPERM`で拒否された。

```text
Error: listen EPERM: operation not permitted /tmp/tsx-501/<process-id>.pipe
```

そのため配置検査の出力が作られず、正式CLIは信頼済みの合格・不合格報告を作れない状態として、契約どおり固定fatal JSON一件と終了code 2を返した。

三分法の帰属は次のとおりである。

| 区分 | 判定 | 根拠 |
|---|---|---|
| 実装が契約に届いていない | 該当しない | 正式runnerは承認済みのTSX実体と配置検査実体を起動し、信頼済み報告を作れない実行環境失敗を終了code 2へ閉じた |
| 検査fixture・環境準備が契約とずれている | **環境準備が該当する** | 現在の制限実行環境が、固定済みTSXのUnix socket作成を許可しない |
| 契約自体の矛盾 | 該当しない | 契約は実配置検査の実process実行と、I/O・runtime失敗時の終了code 2をともに明記している |

production、runner、fixture、契約を直す問題ではない。必要なのは、同じ正式検査をTSXの内部通信が許可された実行環境で行うことである。

## 2. 終了code 2の契約上の意味

B4契約ではCLI終了codeを次のように固定している。

| 終了code | 契約上の状態 |
|---:|---|
| 0 | 正式生成・全検査・公開後再読まで合格し、信頼済み成功報告を作れた |
| 1 | 契約違反を持つ信頼済み不合格報告を作れた |
| 2 | 使い方、I/O、実行環境、または報告自体を信頼して作れない |

終了code 2では、stdoutへ次の固定shape一件、stderrへ0 byteを返す。

```json
{
  "schemaVersion": "presentation-caption-display-pair-cli-fatal-v001",
  "diagnostic": "CAPTION_B4_FORMAL_CLI_JOB_CONTEXT_UNAVAILABLE"
}
```

参照正本:

- `presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md` §14
- `presentation-candidate13-caption-gate-b4-implementation-contract-addendum-20260725-v001.md` §9.6

したがって、code 2は「位置引数の使い方誤り」だけを意味しない。今回の実配置検査processの起動環境不成立も、事前固定されたcode 2の範囲内である。

## 3. stdout観測

### 3.1 観測方法

正式85件の再実行は行っていない。T082・T083だけを対象にし、リポジトリ外の一時観測器から、検査が起動する正式CLIの返値を段階的に観測した。

1. 正式CLIのstdout・stderr・終了codeを記録
2. 固定fatalの内側で失われる例外名・位置を、一時loaderで記録
3. 実配置検査の子processの終了code・stderr・引数列・出力有無を記録

一時観測器は`/private/tmp`だけに置き、production source、検査source、fixture、正式成果物を変更していない。対象検査が作る一時job・一時入力・一時出力は既存cleanupで除去され、診断後に対象領域へ残存変更がないことを確認した。

### 3.2 T082

| 項目 | 観測 |
|---|---|
| 正式CLI終了code | 2 |
| stdout | 固定fatal JSON一件 |
| stderr | 0 byte |
| 内部停止位置 | 実配置検査processの実行 |
| 子process終了code | 1 |
| 子process出力 | なし |
| 子processエラー | Unix socket作成が`EPERM` |

### 3.3 T083

T083もT082と同じ固定fatal、同じ内部停止位置、同じ`EPERM`だった。socketの末尾process IDだけが異なり、エラーの型・呼出し経路・子process引数の構造は一致した。

| 項目 | 観測 |
|---|---|
| 正式CLI終了code | 2 |
| stdout | 固定fatal JSON一件 |
| stderr | 0 byte |
| 内部停止位置 | 実配置検査processの実行 |
| 子process終了code | 1 |
| 子process出力 | なし |
| 子processエラー | Unix socket作成が`EPERM` |

T083は、出力先既存の契約違反を検査する前段の配置検査で停止している。

## 4. 根本原因

正式runnerは次の固定引数で実配置検査を起動している。

1. jobへ束縛されたTSXの実体
2. workspace内の固定済み配置検査source
3. 一時入力JSON
4. 一時出力JSON

今回、TSXの実体は次のpathだった。

```text
/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/cli.mjs
```

TSXは配置検査sourceを実行する前に、内部通信用のUnix socketを作ろうとした。

```text
/tmp/tsx-501/<process-id>.pipe
```

現在の制限実行環境は、この`listen`操作を`EPERM`で拒否した。配置検査sourceは起動せず、一時出力JSONも存在しなかった。正式runnerはこの状態から信頼済み報告を推測せず、固定fatalへ閉じた。

## 5. fixture修正の副作用仮説

前回のfixture修正が、生成順序、path、または引数を変えて使い方誤りを起こした可能性を確認した。

### 5.1 前回修正が変えたもの

- 検査固有pathへ保存済みの意味判断結果を読み直す
- その実pathから意味入力を再構築する
- 実pathに対応した検査報告と期待hashを作る
- 来歴pathと2種類のhashをfixture生成中に照合する

### 5.2 前回修正が変えていないもの

- 正式CLIへ渡す位置引数は、従来どおりjob path一件
- T082・T083のjob path命名
- TSX実体path
- 配置検査source path
- 実配置検査の入力・出力引数の構造
- 子processの起動方法
- production runner

観測した正式CLIのjob pathは、T082・T083とも設計どおりだった。観測した配置検査の引数列も、固定済みの4引数だった。

### 5.3 判定

前回修正の追加処理が、CLIを使い方誤りへ落としたのではない。

修正前は意味入力の再構築で終了code 1になり、実配置検査へ到達していなかった。修正後にその不整合を解消したことで、次段に以前から存在した実行環境制約が初めて表面化した。

これはfixture修正の直接的な副作用ではなく、処理が本来の次段へ進んだ結果である。

## 6. 水平確認

- T082・T083は同じ実配置検査処理を通るため、同じ環境原因で説明できる。
- T080・T081は配置検査結果を合成入力としてpure処理へ渡す検査であり、TSX実processを起動しない。そのため合格と矛盾しない。
- T084は位置引数不成立を配置検査より前に拒否するため、固定fatalと終了code 2で合格する。
- 85件中、正式CLIからTSX実processを起動する正常・契約不成立経路はT082・T083の2件であり、観測された不合格2件と一致する。

## 7. 実行環境修正設計

### 7.1 目的

検査内容、正式runner、固定TSX実体、配置検査source、fixture、期待値を変えず、固定TSXが必要とするUnix socketを作れる実行環境で正式85件を実行する。

### 7.2 修正対象

リポジトリ内のコード・fixture・契約は変更しない。

変更するのは、正式検査processを制限sandbox内で起動するか、ネイティブ権限の実行として起動するかという実行環境だけである。

### 7.3 承認後の実行手順

1. T082・T083の一時job・testdata・出力が残っていないことを読み取り確認する。
2. commit `6776530d`のfixture修正と、production・runner・契約の不変を確認する。
3. 一時観測loaderやpreloadを付けず、次の正式commandをネイティブ権限で1回だけ実行する。

```text
node --test evals/clip_composition/test_presentation_caption_display_pair_v003.mjs
```

4. 1件でも不合格なら、同attemptで修正・再実行せず停止する。
5. 85/85の場合だけ、既定の回帰95件を実行する。
6. 回帰合格後だけ、candidate 13読み取り専用preflightを実行する。
7. 全条件成立後にB4完了報告、3条件の安定点判定、tagと`JOURNAL.md`、B5承認依頼起草へ進む。

正式報告には、正式85件をネイティブ権限で実行した事実と理由を記録する。実行環境の変更を、コード修正や検査合格と混同しない。

### 7.4 禁止事項

- TSXを別の実行器へ置き換える
- 実配置検査をskipまたはmockにする
- Unix socket作成を避ける未承認flag・環境変数を追加する
- production runnerへ検査専用入口を追加する
- 配置検査失敗を契約違反の終了code 1へ読み替える
- T082・T083の期待終了codeを変更する
- sandbox内の不合格を無視してB4完了とする
- fixtureの意味入力hashを再び動かす

## 8. 不合格との対応表

| 不合格 | 直接原因 | 修正 | 解消見込み |
|---|---|---|---|
| T082 | 制限環境がTSXのUnix socket作成を拒否し、配置検査出力を作れない | 同じ正式検査をUnix socket作成可能なネイティブ実行環境で1回実行 | 配置検査が起動し、正式CLI正常経路の検査へ進む |
| T083 | T082と同じ環境拒否が、出力先既存検査より先に発生 | 同上 | 配置検査を通過し、出力先既存の契約違反検査へ進む |

ネイティブ実行で85/85になることは、まだ実測していない。別の不合格が表面化した場合は新原因として停止する。

## 9. 今回の停止点と承認依頼

今回は読み取り専用診断と実行環境修正設計だけで停止した。

- production・runner・検査・fixture・契約の変更: 0件
- 正式85件の再実行: 0回
- 回帰95件: 未実施
- candidate 13 preflight: 未実施
- B4安定点tag: 未発行

次に必要な承認は次の1件である。

> 本設計を正本として、コード・fixture・契約・期待値を変更せず、正式合成検査85件をUnix socket作成可能なネイティブ実行環境で先頭から1回実行することを承認する。85/85の場合のみ既定の回帰95件、candidate 13読み取り専用preflight、B4完了報告、安定点判定、B5承認依頼起草へ進んでよい。不合格1件でも同attemptで直さず停止する。
