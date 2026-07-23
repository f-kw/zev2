# candidate 13 基本テロップ ゲートB2追補後・全件再実行 停止報告 v001

- 日付: 2026-07-24
- 実装固定コミット: `d8c209c0`
- 結論: **package側の全件検査が74件中54合格・20不合格となったため、夜間停止規律に従って停止した**
- 人間作業: 0件

## 1. 今回の承認範囲

承認済みのJSON・表示信頼境界追補と、読み取り専用監視投影入口を実装し、次を順番に一度だけ実行する範囲だった。

1. package側の全検査
2. 意味回答側の全検査
3. ゲートAの既存回帰
4. 残存source atomの既存回帰
5. candidate 13の読み取り専用preflight
6. 全て合格した場合だけ、完了報告と次ゲート承認依頼を起草

最初のpackage側検査が不合格だったため、2〜6へ進んでいない。不合格後の修正、部分再実行、全件再実行も行っていない。

## 2. 検査前に固定した実装

コミット`d8c209c0`で、次を一組として固定した。

1. strict JSONで復号する全objectを、入れ子を含めnull prototypeへ統一。
2. canonical JSONを、UTF-16順のkey列から直接生成。特殊keyと整数風keyを通常objectの列挙順へ任せない。
3. B1所有値・Gemini往復値・時刻は整数限定のまま維持。
4. 人間認定済み表示台帳5 JSONだけを専用経路で読み、renderer trustの承認済み4箇所・4値だけ小数を許可。
5. 検査indexの実byte hashとcanonical hashを別々に照合。
6. job準備とproduction runnerが同じ監視tree投影処理を使う、読み取り専用入口を追加。
7. 監視中のregular fileが、open前・open直後・読取後で種類、device、inode、size、mtime、link数のいずれかを変えた場合に拒否。

固定ファイル:

| 処理 | SHA-256 |
|---|---|
| package生成・検査の共通処理 | `5e4a8332e5a8b232c8770e494d3793a247bec84bf0afef372008dbc3fb51b0e9` |
| package実行処理 | `dfc64f153e9410e9f7ff09494b7f33f0c6354b6b3e592e1662ccad44110df42d` |
| package側全検査 | `5dfe0455f8dcc84c8c469fafb0a2e550691c062ae1a684df74fe7c9beeabac37` |

実装前の独立静的監査では、JSON・表示信頼側と監視投影側の双方でP0/P1/P2なしだった。監視投影の必須検査に当初あった不足は、公式全件検査を始める前に補い、例外ではなく実際の読取前後状態差で拒否する検査へ直した。

## 3. 公式全件検査の実測

実行したのは次の1回だけ。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs
```

| 項目 | 結果 |
|---|---:|
| 全検査 | 74 |
| 合格 | 54 |
| 不合格 | 20 |
| skipped | 0 |
| cancelled | 0 |
| todo | 0 |
| 終了コード | 1 |
| 実行時間 | 約6.84秒 |

54件を部分合格とは扱わない。

## 4. 合格を確認できた範囲

今回の実測で、少なくとも次は単独検査として合格した。

- strict JSONのnull prototype復号、特殊key保持、整数風keyのcanonical順。
- B1所有値と時刻・frame・sampleの小数拒否。
- 承認済み外部表示5 JSONの実byte/canonical hash対と、renderer trust内の4小数値の現物確認。
- 正式7成果物とGemini可視入力へ、4小数係数を流さない検査。
- 読み取り専用監視投影入口の、許可外path、既存target、追加option、未対応entry、regular file読取中変化の拒否。
- 同じprivate監視投影処理を、job準備・production開始・production終了の三箇所が呼ぶ静的確認。

ただし、production runner全体を通す非空tree一致検査は終了コード1だったため、入口単体の合格をB2全体の合格へ拡張しない。

## 5. 不合格20件の観測

### 5.1 上流の実装来歴検査で止まる群

直接観測できた事実:

- 別の違反を一件だけ作った検査で、`IMPLEMENTATION_MISMATCH`が二重に現れた。正常fixture側に既に一件あることを示す。
- 「関数内のfile I/Oをmodule load時実行と誤認しない」検査が不合格だった。
- runnerのbuild失敗検査と正式公開段階検査は、意図した段階より前の`implementationBinding`で停止した。
- 正常preflightを期待したrunner検査も終了コード1だった。

この上流不成立により、入力台帳の不正、Gate A build失敗、package file集合不正、job二時点差など、後続の固有違反を期待した多数の検査が、その違反へ到達しなかった。最後の違反コード網羅検査も観測集合を完成できなかった。

現時点で言えるのは、**現行実装を検査するimport graph／実装来歴経路が正常fixtureを合格にしていない**ことまでである。原因が、検査器による関数本体の誤認、実装側の新しい書き方、またはfixtureのbinding不足のどれかは、停止後に追加実行していないため確定しない。

### 5.2 jobの投影件数不整合で返すpath数

container一件のsource atom数だけを変更した検査では、検査期待はcontainer固有path一件だったが、実装は次の二件を返した。

1. container固有のsource atom数
2. 全container合計のsource atom数

子の件数変更により合計も不整合になるため、二件返す実装が契約どおりか、最小leaf一件だけにする検査期待が契約どおりかを、実装者判断で変更していない。

### 5.3 監視treeに2GiB超の実ファイルが存在する

実process検査が、監視treeの実ファイルを一括読込しようとしてNodeのBuffer上限で停止した。

```text
ERR_FS_FILE_TOO_LARGE: File size (3384583680) is greater than 2 GiB
```

同じ監視rootには、実測で次の2ファイルが存在する。

| ファイル | byte |
|---|---:|
| `base-media/.DmWu0jVQfTE-candidate-13-v002.work-ovnjGJ/source-grid.f32le` | 3,384,584,064 |
| `base-media/.DmWu0jVQfTE-candidate-13-v001.work-kc4Zt6/source-grid.f32le` | 3,384,583,680 |

これは検査fixtureだけの問題とは断定できない。productionの監視投影もregular fileを全byte一括読込してhashする同じ経路を使うため、現状のcandidate 13正式preflightもこの二ファイルで成立しない可能性が高い。除外pathを増やす、ファイルを削除する、期待値を変える、許容差を置く、のいずれも承認範囲外なので行っていない。

## 6. 以前の22不合格との関係

前回33/55停止の22不合格は、事前に次の三原因へ分解していた。

| 以前の原因 | 件数 | 今回確認できたこと |
|---|---:|---|
| decoder objectのprototype期待不一致 | 1 | null prototype正本の単独検査は合格 |
| renderer trust小数で正常fixture構築前に停止 | 20 | 固定5 JSONと4小数の現物確認、成果物への非流出は合格 |
| 上記停止により違反コード観測集合が不足 | 1 | 今回は別の上流実装来歴不成立があり、網羅検査はなお不合格 |

したがって、既知三原因へ実装した処置の一部は単独検査で働いたが、**以前の22件が全て解消した、B2が完成した、とは認定できない**。未到達だった経路が動いたことで、新しい停止要因が表面化した。

## 7. 夜間停止条件との対応

次の停止条件が成立した。

- 事前固定した全件合格条件を満たさなかった。
- 以前の三原因とは別の不成立が出た。
- 2GiB超の監視対象という、実測前提の不一致が出た。
- job validatorの返すpath範囲について、契約解釈が必要になった。

このため、次を行っていない。

- package側の修正または再実行
- 意味回答側検査
- ゲートA回帰
- 残存source atom回帰
- candidate 13 preflight jobの作成
- candidate 13 preflight
- 正式7-file package
- prompt登録
- Gemini実走
- 表示計画、指示書、描画

既存の正式成果物、凍結fixture、expected、candidate 13基礎映像は変更していない。

## 8. 次に必要な判断

主線を再開するには、今回の20不合格を直ちに個別修正するのではなく、まず次の三点を一つの修正設計で分離する必要がある。

1. 正常fixtureを止める実装来歴／import graph不成立の正確な原因。
2. 投影件数不整合で一件と二件のどちらを正本にするか。既存契約から導出できる場合は人間判断へ上げない。
3. 2GiB超のregular fileを含む監視treeを、全byte一括保持せず同じSHA-256へ写すproduction・検査共通経路。

人間へ媒体確認や時刻入力は要求しない。次に必要なのは、上記の診断・修正設計・新しい全件1回実行を許可するかの判断一件である。

