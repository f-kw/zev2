# candidate 13 基本テロップ B2意味回答側 2系統修正 全件検査停止報告 v001

- 日付: 2026-07-25
- 実装コミット: `9e22e3f7afc11ed73f102136c5a43a9d95413e0b`
- 状態: **package側133/133合格後、意味回答側154/155で不合格となったため停止**
- 人間作業: 0件

## 1. 実装したこと

承認済みの
`presentation-candidate13-caption-gate-b2-semantic-output-two-system-repair-design-20260725-v001.md`
を正本として、次の2点だけを実装した。

1. 合成検査専用のファイル読取器が、作業領域内の論理絶対パスを実環境の`realpath`と
   同じ正規化済み絶対パスとして返すようにした。
2. 合成fixtureの開始時jobと報告直前jobを、同じ正式byteから別々のスナップショットとして
   作るようにした。

変更したコードは
`evals/clip_composition/test_presentation_caption_semantic_output_v001.mjs`
の1件だけである。

変更していないもの:

- productionの意味回答中核・runner。
- package側の中核・runner。
- 7実装ファイルの束縛対象と束縛hash。
- パス比較規則、job schema、成果物schema、違反コード、終了コード、公開面。
- 凍結済みfixture、expected、candidate 13正式成果物。

## 2. 帰属の確定

### 2.1 re-bindingは不要だったか

**不要だった。**

旧実装hashへの束縛更新漏れはなく、合成jobは検査開始時の現行7ファイルから束縛hashを
作っていた。実装束縛段で停止していた検査は、合成読取器だけが作業領域の基準パス末尾の
`/`を残し、安全照合で`.../zev2//evals/...`を作ったため不一致になっていた。

したがって、番犬に相当する束縛検査の意味は無傷であり、検査側の読取器が正しい実装を
誤ったパス表現で渡していた。修正は**検査側の解釈の是正**であって、束縛の更新・緩和ではない。

実装後、以前`implementationBinding`で先に止まっていた次の9検査は全て本来の段階へ到達し、
合格した。

- 正常complete。
- 判断辞退。
- compilerのpass 1・pass 2に対する、例外・不正返値・入力変更の6形。
- chunk分割方法を変えても同じ結果になる検査。

### 2.2 前設計の対応表にあった訂正

前設計は、production CLI実processの1件も同じ実装束縛系へ含め、計10件が同じ修正で
解消すると見込んでいた。この1件だけは見込みが外れ、意味回答側の唯一の不合格として残った。

したがって、正しい内訳は次のとおり。

| 前回12不合格 | 今回の結果 |
|---|---:|
| 合成読取器の正規化で解消 | 9 |
| jobスナップショット独立化で直接解消 | 1 |
| job違反の動的観測回復により派生解消 | 1 |
| production CLI実processとして残存 | **1** |

前回12件中11件は解消した。CLI 1件を同じ原因へ含めたことは過大な帰属だった。

### 2.3 jobスナップショット共有

開始時と報告直前は、同じ内容でも別object・別Bufferになった。
報告直前側だけを変更しても開始時側は不変で、job差し替え違反が単独発火した。
その結果、全違反コードと担当検査の完全一致も合格した。

水平確認で追加の同型欠陥0件という事前申告は維持する。

## 3. package側全件検査

実装固定後、次を先頭から一度だけ実行した。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs
```

| 項目 | 結果 |
|---|---:|
| 全検査 | 133 |
| 合格 | **133** |
| 不合格・skipped・todo・cancelled | **0** |
| 終了コード | 0 |
| stderr | 0 byte |

保存記録:

| 記録 | SHA-256 |
|---|---|
| `test-runs/20260725-caption-b2-semantic-two-system-repair-v001/package.tap` | `bcb40dbfc66059b95f5d310b1c1bc905016fb5e2300177b752288035d99dee57` |
| `test-runs/20260725-caption-b2-semantic-two-system-repair-v001/package.stderr.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## 4. 意味回答側全件検査

package側133/133の後に限り、次を先頭から一度だけ実行した。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test evals/clip_composition/test_presentation_caption_semantic_output_v001.mjs
```

今回追加した絶対パス正規化の回帰検査1件を含むため、総数は従来154件から155件になった。

| 項目 | 結果 |
|---|---:|
| 全検査 | 155 |
| 合格 | **154** |
| 不合格 | **1** |
| skipped・todo・cancelled | 0 |
| 終了コード | 1 |
| stderr | 0 byte |

保存記録:

| 記録 | SHA-256 |
|---|---|
| `test-runs/20260725-caption-b2-semantic-two-system-repair-v001/semantic-output.tap` | `bf63bda4acce7e7f888de73b740c7b48ba4b3e90103bf7270ea1a1c278da1f23` |
| `test-runs/20260725-caption-b2-semantic-two-system-repair-v001/semantic-output.stderr.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## 5. 残った1不合格

不合格はTAP 149
「production CLI実processはtrusted 0/1とusage 2をstdout/stderrへ排他的に出す」だけである。

最初のcomplete形で、子processの終了コード0は期待どおりだったが、stdoutが0 byteだった。
stderr側の検査へ進む前に停止している。

### 5.1 静的に確定できる原因

production CLIは、実行されたファイルパスと自身のmodule URLが同じ時だけ入口処理を開始する。
合成fixtureはmacOSの一時領域を、次の別名関係の左側で作る。

| 表記 | 実体 |
|---|---|
| `/var/folders/.../T` | `/private/var/folders/.../T` |

子processへ渡すrunner pathは`/var/...`のままだが、Nodeがmoduleを読むとmodule URLは
実体側の`/private/var/...`になる。入口判定が文字列完全一致のため成立せず、CLI処理を
一度も起動しないままNodeが終了コード0・stdout/stderr 0 byteで終了する。

これは、保存TAPの「終了コード0のassertは通り、その直後の選択出力`length > 0`だけが失敗」
という観測と一致する。production runnerのCLI契約違反ではなく、合成検査が別名パスのまま
実processを起動した検査データ／起動経路の欠陥である。

### 5.2 修正していない

今回の承認は2系統の固定修正だけであり、この別名パスは前設計で独立原因として固定していない。
よって、次のいずれも行わず停止した。

- 子processへ渡すrunner pathの変更。
- 一時作業領域全体のpath変更。
- CLI入口判定の変更・緩和。
- 不合格検査の期待値変更・削除。
- 部分再実行・全件再実行。

推奨する次の方向は、**合成fixture内のrunnerを実体の正規化済み絶対パスで起動する**
検査側限定修正である。productionのCLI入口判定を緩めない。実装前に版付き修正設計として
変更箇所・回帰・今回1件との対応を固定する必要がある。

## 6. 停止後に行っていないこと

- 意味回答側の修正・再実行。
- Gate A回帰。
- 残存source atom回帰。
- candidate 13読み取り専用preflight。
- 前提Pの再照合。
- B2完了報告・`DECISIONS.md`／`docs/HANDOVER.md`のB2完了同期。
- `stable/b2-complete`タグ。
- `JOURNAL.md`のB2完了entry。
- 次ゲート（正式package生成・Gemini実走）の承認依頼。
- 正式package、Gemini実走、指示書、描画。

既存の安定点は`stable/gate-a-complete-20260723`のままである。

## 7. 現在地と次の判断

- package側: 133/133。
- 意味回答側: 154/155。
- 前回12不合格: 11件解消、1件残存。
- B2: 未完了。
- 人間作業: 0件。

次に必要なのは、production CLI実process負例の別名パスを、productionを変えず検査側だけで
正規化する**版付き修正設計の起草承認**である。承認されるまでコード変更・再検査へ進まない。
