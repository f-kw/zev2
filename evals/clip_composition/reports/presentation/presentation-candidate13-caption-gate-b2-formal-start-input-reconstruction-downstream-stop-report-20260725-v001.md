# candidate 13 基本テロップ B2正式開始入力再構成 後続検査停止報告 v001

- 日付: 2026-07-25
- 実装基準コミット: `d9599a0c82f178e86531c3c8ebbf0d4a70da826a`
- 状態: **package側133/133合格後、意味回答側142/154で不合格となったため停止**
- 人間作業: 0件

## 1. 今回実施したこと

承認済み設計に従い、正式生成の開始時に保持済みの18入力を、非公開・決定的な処理で固定順へ再構成し、既存の公開前完全一致検査へ接続した。

実装前に、7つの入力項目と18行の対応を設計書へ明確化した。

| 入力項目 | 行 |
|---|---:|
| Gate A job | 1 |
| Gate A完了報告 | 2 |
| Gate A実装 | 3〜5 |
| Gate A入力 | 6〜8 |
| B1実装 | 9〜11 |
| 承認済み信頼情報 | 12〜17 |
| Node実体 | 18 |

実装ではproductionの観測点、公開面、成果物schema、違反コード、runnerを変更していない。比較元は開始時にすでに保持した観測だけから再構成し、公開前の再読値との比較には既存処理をそのまま使った。

## 2. package側の正式全件検査

次を一度だけ先頭から実行した。

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

新設した独立oracleでは、18行の完全一致、一件だけを変える18例、欠落・追加・隣接順序交換・重複・外側と内側のrole差を検査した。既存の公開前検査、runner経路、違反コード対応を含む全件が合格した。

保存記録:

| 記録 | SHA-256 |
|---|---|
| `test-runs/20260725-caption-b2-formal-start-input-reconstruction-v001/package.tap` | `0bb11bfdc7dd2e835112bc418f5f632b632af679da41a399944cfb97da8d3f4c` |
| `test-runs/20260725-caption-b2-formal-start-input-reconstruction-v001/package.stderr.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## 3. 意味回答側の後続検査

package側の全合格後に限り、次を一度だけ先頭から実行した。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test evals/clip_composition/test_presentation_caption_semantic_output_v001.mjs
```

| 項目 | 結果 |
|---|---:|
| 全検査 | 154 |
| 合格 | 142 |
| 不合格 | **12** |
| skipped・todo・cancelled | 0 |
| 終了コード | 1 |
| stderr | 0 byte |

保存記録:

| 記録 | SHA-256 |
|---|---|
| `test-runs/20260725-caption-b2-formal-start-input-reconstruction-v001/semantic-output.tap` | `2feb9ed552bec93d0cd676440b5987d1cc9985d20958fe03e33dec805262d597` |
| `test-runs/20260725-caption-b2-formal-start-input-reconstruction-v001/semantic-output.stderr.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## 4. 不合格の二系統

### 4.1 production経路が実装束縛で先に停止する

次の10検査が不合格になった。

- 正常なcomplete回答
- abstained回答
- compilerのpass 1・pass 2での例外、戻り値不正、入力変更
- chunk分割方法の同一性
- production CLIの終了コードと出力先

compiler失敗を意図した6検査では、期待した`compilerBuild`へ到達せず、実測の停止段は`implementationBinding`だった。正常completeも終了コード1、abstainedも`abstained`ではなく`failed`になった。

同じproduction workspace経路を使う検査群が、各検査固有の分岐より前で止まっている。意味回答の内容やcompilerの成否を検査する前段に、実装観測と固定bindingの不一致がある。ただし、今回の保存済みreportは違反の集約結果だけで、7実装入力のどの観測が不一致かまでは記録していない。原因箇所を推測で決めず、次の設計・診断で固定する必要がある。

なお、同じ7実装のsourceを合成観測へ入れる静的検査は合格している。このため、現時点で「import規則そのものが不正」とは認定しない。

### 4.2 job差し替え負例が比較対象を共有している

`JOB_FILE_MISMATCH`を単独発火させる検査が不合格になり、その結果、違反コードと担当検査の完全一致検査も不合格になった。

静的確認では、合成fixtureの開始時job snapshotと公開直前job snapshotが同一objectを参照している。公開直前側のhashを書き換えると開始時側も同時に変わるため、差し替えを作ったつもりでも二者が一致したままになる。

これはproduction契約の緩和を要する観測ではなく、負例用検査データが独立していない問題である。ただし、このattempt内では修正も再実行も行っていない。

## 5. 帰属

- 今回追加した正式開始入力再構成は、専用検査を含むpackage側133/133を通過した。
- 意味回答側の不合格は、package側合格後に初めて到達した後続検査の新しい原因である。
- したがって、事前登録どおり、この12件を正式開始入力再構成の失敗とは扱わない。
- 一方、B2全体は未完了であり、142/154を部分合格として扱わない。

## 6. 停止後に行っていないこと

- 意味回答側の修正、部分再実行、全件再実行
- Gate A回帰
- 残存source atom回帰
- candidate 13読み取り専用preflight
- 前提Pの再照合
- 正式package生成、Gemini実走、指示書、描画
- `stable/b2-complete`タグの作成
- `JOURNAL.md`のB2完了エントリ追記
- DECISIONS・HANDOVERのB2完了同期

既存の正式成果物、fixture、expected、candidate 13正式基礎映像は変更していない。

## 7. 次に必要な判断

次のattemptでは、修正前に二系統を分けた版付き設計が必要になる。

1. production経路の7実装入力について、どの観測と固定bindingが不一致かを、公開面を増やさず特定できる検査設計。
2. job差し替え負例について、開始時と公開直前のsnapshotを独立させ、既存の`JOB_FILE_MISMATCH`契約を変更せず発火させる検査データ修正。

本停止報告は原因を推測値で埋めず、観測できた範囲と未確定範囲を分離した状態で人間判断へ戻す。
