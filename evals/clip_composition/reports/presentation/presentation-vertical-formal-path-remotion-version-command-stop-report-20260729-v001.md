# 縦型正式経路 Remotion版確認コマンド 契約不一致停止報告 v001

状態: **実装前の前提不一致で安全停止**

日付: 2026-07-29

対象正本:

- 親設計: `presentation-vertical-formal-path-contract-design-20260729-v001.md`
  - SHA-256: `db62f752ce19c5a727de9890898885a4e1a68b65ed500da5842de34b12cd6e69`
- 領域5追補: `presentation-vertical-formal-path-cost-spending-cap-amendment-20260729-v001.md`
  - SHA-256: `d761d1ab40b2de97df01b3d92110773a19aefa643a44aa6b3b4f46a3dc79fefa`
- 領域4追補: `presentation-vertical-formal-path-renderer-binding-failure-ownership-supplement-20260729-v001.md`
  - SHA-256: `2b62a1f7bc2ae81fade7b761de0f51c0647cff4f4fecbf356818780ade7f4038`

## 1. 結論

領域4追補は許可範囲内で確定した。

一方、正式preset登録の前提であるRemotion版確認コマンドが、現物のCLIでは契約どおり正常終了しない。親設計§5.3は次を必須にしている。

```text
<node.path> <remotion.path> --version
終了0
規定stdout
stderr 0 byte
```

現物では同じコマンドが終了1になる。終了0へ偽装する、版文字列を手入力する、別コマンドへ無断変更する、のいずれも承認済み契約に反するため、40ファイル実装へ進まず停止した。

## 2. 事実

使用実体:

```text
Node:
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node

Remotion CLI:
runner/node_modules/@remotion/cli/remotion-cli.js
```

承認済みコマンドの実測:

| 項目 | 実測 |
|---|---|
| 引数 | `--version` |
| 終了code | `1` |
| stdout | 1,579 byte |
| stdout SHA-256 | `d3526f0303dbfac5716a0bb342864cca66342a6cdc26c7ab68e5fe6019cf434c` |
| stdout先頭行 | `@remotion/cli 4.0.481` |
| stderr | 0 byte |
| stderr SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

同じ実体へ`--help`を渡した読み取り専用確認:

| 項目 | 実測 |
|---|---|
| 引数 | `--help` |
| 終了code | `0` |
| stdout | 1,579 byte |
| stdout先頭行 | `@remotion/cli 4.0.481` |
| stderr | 0 byte |

つまり、版文字列自体は現物から取得できるが、親設計が固定した引数だけが現行CLIの仕様と一致しない。

## 3. 今回確定した領域4追補

領域4の入力15件・実装束縛29件について、既存crop用codeで所有できない不一致を次の2 codeへ限定した。

- `VERTICAL_RENDER_INPUT_BINDING_MISMATCH`
- `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH`

これにより新規違反集合は34件から36件、検査はV20/V21を加えて90件から92件となる。

crop decision、crop decisionの実体SHA、共通crop計算実体は従来の専用codeを維持する。jobとrenderer trustで二重所有する5 pathはjob側照合を先に行い、そこを通過した後のtrust不一致だけをruntime不一致へ帰属する。

## 4. 停止時の作業ツリー

- 親設計: 不変
- 領域5追補: 不変
- 領域4追補: 新規文書として完成
- `DECISIONS.md`: 今回のkawafmm裁定1行だけ追記
- 40ファイルの実装対象: 変更0件
- 正式縦型preset: 未登録
- 新規検査: 未実装・未実行
- API通信: 0回
- 正式job: 0件
- 描画: 0件
- 費用: US$0

途中で作り始めたコード変更は、前提不一致の確定後に全て取り消した。既存横型経路と正式成果物は変更していない。

## 5. 推測

現行Remotion CLIでは、版表示専用の`--version`を受理せず、help表示の先頭へ版を出す設計になっている可能性が高い。

この推測は合格根拠に使わない。実測事実は、`--version`が終了1、`--help`が終了0で、両方のstdout先頭行が同じだったことだけである。

## 6. 未確認

- `--help`を正式な版確認入口へ変更する契約が、人間に承認されるか。
- 将来のRemotion版でもhelp先頭行の外形が維持されるか。
- 親設計の他の6 toolの版確認コマンドが正式実行時にも全て成立するか。

## 7. 推奨する最小追補

親設計§5.3のRemotion 1項目だけを、次へ置き換える。

```text
旧:
<node.path> <remotion.path> --version

新:
<node.path> <remotion.path> --help
```

合格条件:

1. 終了0。
2. stderr 0 byte。
3. stdout先頭行がexact `@remotion/cli <semver>`。
4. `<semver>`をruntime profileのversionへ記録する。
5. CLI実体pathとfile SHA-256の束縛は従来どおり維持する。
6. stdoutの残りはhelp本文として版文字列に使わない。

変更対象は版確認の引数とstdout解釈だけであり、Remotion実体、描画処理、trustのSHA束縛、他6 toolの契約は変えない。

この追補は領域4追補の許可範囲外なので、独自判断では採用しない。

## 8. 人間作業

必要なのは、§7の最小追補を承認するかの1判断だけである。目安は30秒以内。

承認された場合、40ファイル・92検査・横型回帰・縦型preset正式登録まで、今回の承認済み範囲を再開できる。
