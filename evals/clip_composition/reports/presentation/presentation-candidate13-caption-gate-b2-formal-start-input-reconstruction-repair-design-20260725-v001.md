# candidate 13 基本テロップ Gate B2 正式開始入力再構成 修正設計 v001

- 作成日: 2026-07-25
- 状態: **2026-07-25 kawafmm承認済み。§5.1の対応関係を内容変更なしの明確化として追記。実装前**
- 起点:
  - `presentation-candidate13-caption-gate-b2-test-repair-full-test-stop-report-20260725-v001.md`
  - package側正式検査 130/132、不合格2件、同attemptでの修正・再実行なし
- 初回提示時の範囲: 設計のみ。2026-07-25の明示承認により、§11記載の限定実装・全件1回実行・合格時の既定後続まで進行可能
- 人間作業: 本設計の承認1判断。媒体視聴、時刻入力、正解生成、時間計測は0件
- 改訂履歴:
  - 2026-07-25: kawafmmが§11の依頼文どおり実装を承認。
  - 2026-07-25: 承認時条件に従い、§5.1へ最小exact objectの7 fieldと§4の18行との対応表を明確化追記。再構成元、行順、受理件数、公開面不変の契約は変更していない。

## 1. 本来の目的

目的は、残る2検査を合格に見せることではない。

正式生成の開始時に読んだ入力と、公開直前に読んだ同じ入力を比較し、
途中で変わっていなければ公開処理を先へ進め、変わっていれば従来どおり
`PUBLICATION_INPUT_CHANGED`で止めることである。

現行処理には、次の二つの事実がすでに存在する。

1. 正式実行の開始時に、job以外の全入力を読み、個別の開始観測として保持している。
2. staging検査後に、同じ入力を固定順で読み直し、公開前観測として保持している。

欠けているのは、1の個別観測を、2と同じ固定順の比較列へ組み立てる処理だけである。

本設計は、保存済みの開始観測だけから比較列を決定的に再構成する。
新しい読取り、観測点、公開欄、debug入口、schema fieldは追加しない。

## 2. 停止時点で確定した原因

正式実行の公開前検査は、比較元として読み取り専用preflightの開始入力列を参照している。

読み取り専用preflightでは、その列が存在する。一方、正式生成ではpreflight自体が
`not-requested`であるため、比較元は常に存在しない。

その結果、入力を一件も変えていない正式実行でも、次の順で止まる。

1. staging成果物の検査は通る。
2. 正式入力の再読取も完了する。
3. 比較元だけが存在しない。
4. 入力変更として扱われる。
5. 公開直前確認、rename、公開後読取へ到達しない。

この一原因が、残る2不合格を説明する。

| 2026-07-25実測 | 本来到達する段階 | 現在の停止 |
|---|---|---|
| 旧test 123のpre-rename行 | 公開直前に現れた出力先を検出する | その前の入力再照合で停止 |
| 旧test 124のpublished-open行 | 公開済み先頭成果物のopen故障を記録する | 公開後読取へ到達せず、故障記録0件 |

## 3. 修正の境界

### 3.1 変更予定

実装承認後に変更する候補は次の2ファイルだけとする。

1. `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs`
   - 保存済み開始観測から比較列を作る、非公開の純粋処理を追加する。
   - 正式公開前の入力照合だけが、その列を比較元として使う。
2. `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs`
   - 再構成列と開始入力の同一性検査を1件追加する。
   - 残る2不合格が本来の段階へ到達することを既存検査で確認する。

正式runnerは変更しない。runnerは開始時の個別観測と公開前の再読値を、
すでに必要な順序で作っているためである。

### 3.2 変更禁止

次は変更しない。

- 正式runnerの入力読取順、公開順、lock、staging、rename、公開後読取。
- 読み取り専用preflightの開始入力保存と比較の意味。
- 公開前の再読取処理。
- 入力同一性の既存比較規則。
- `PUBLICATION_INPUT_CHANGED`を含む違反コード、担当check、path、固定順。
- checkerへ渡す外側contextの12 field。
- job、run report、package、正式成果物のschemaと版。
- productionのexport、debug入口、検査専用入口。
- candidate 13固有の件数、hash、pathをproductionへ焼き込むこと。
- test期待を現行の誤停止へ合わせて緩めること。
- 読み取り専用preflightの観測を正式実行でも偽装生成すること。

実装中に新field、新export、runner変更、schema改訂が必要と判明した場合は、
本設計の範囲外として停止する。

## 4. 再構成に使う開始観測

比較元は、checkerへすでに渡っている**開始時の個別観測**だけから作る。
公開前再読値、読み取り専用preflight観測、filesystem、現在時刻、環境変数を参照しない。

固定列は18行である。これはcandidate 13の固有値ではなく、承認済みB1契約の入力構造である。

| 順序 | 処理上の役割 | 行のrole |
|---:|---|---|
| 1 | Gate A jobの開始観測 | `gateAJob` |
| 2 | Gate A完了報告の開始観測 | `gateACompletionReport` |
| 3 | Gate A検査本体 | `core` |
| 4 | 残存発話抽出処理 | `retainedSourceAtomsCore` |
| 5 | Gate A実行処理 | `runner` |
| 6 | 残存発話データ | `sourceAtoms` |
| 7 | 残存発話生成記録 | `sourceGenerationManifest` |
| 8 | 残存発話検査報告 | `sourceValidationReport` |
| 9 | B1 package検査本体 | `packageCore` |
| 10 | B1正式実行処理 | `packageRunner` |
| 11 | 描画信頼検査処理 | `rendererTrustImplementation` |
| 12 | プリセット台帳 | `presetRegistry` |
| 13 | プリセット検査索引 | `presetValidationIndex` |
| 14 | 素材検査索引 | `materialValidationIndex` |
| 15 | 台帳間の信頼束縛 | `registryBinding` |
| 16 | レンダラー信頼情報 | `rendererTrust` |
| 17 | 文字配置処理 | `textLayoutImplementation` |
| 18 | Node実体 | `nodeBinary` |

開始観測は次の既存領域に分かれている。

- Gate Aのjob・完了報告・実装3件・入力3件。
- B1の実装3件。
- 描画幅方針と信頼情報6件。
- 実行環境に保持されたNode実体1件。

再構成では、新しいファイルを読まない。上記観測objectを再利用し、
`role`と観測objectを持つ新しい外側行だけを固定順で作る。
観測のbyte列を複製、再復号、再hashしない。

## 5. 非公開の再構成処理

### 5.1 入力を最小化する

再構成処理へchecker context全体を渡さない。
次の単体観測3つと配列4本だけを、表のown key順で持つexact objectを渡す。

| own key順 | field | 形 | 件数 | 取得元となる既存開始観測 | §4の行 |
|---:|---|---|---:|---|---:|
| 1 | `gateAJobInput` | 単体観測 | 1 | Gate A jobの開始観測 | 1 |
| 2 | `gateACompletionReportInput` | 単体観測 | 1 | Gate A完了報告の開始観測 | 2 |
| 3 | `gateAImplementationInputs` | dense配列 | 3 | Gate A実装の開始観測列 | 3〜5 |
| 4 | `gateASourceInputs` | dense配列 | 3 | Gate A入力の開始観測列 | 6〜8 |
| 5 | `implementationInputs` | dense配列 | 3 | B1実装の開始観測列 | 9〜11 |
| 6 | `widthPolicyInputs` | dense配列 | 6 | 描画幅方針と信頼情報の開始観測列 | 12〜17 |
| 7 | `nodeBinaryInput` | 単体観測 | 1 | 実行環境に保持されたNode実体の開始観測 | 18 |

checkerからこの最小objectを作る写像も固定する。

| exact objectのfield | checkerに既存の取得元 |
|---|---|
| `gateAJobInput` | Gate A領域のjob開始観測 |
| `gateACompletionReportInput` | Gate A領域の完了報告開始観測 |
| `gateAImplementationInputs` | Gate A領域の実装開始観測列 |
| `gateASourceInputs` | Gate A領域の入力開始観測列 |
| `implementationInputs` | B1実装開始観測列 |
| `widthPolicyInputs` | 描画幅方針と信頼情報の開始観測列 |
| `nodeBinaryInput` | 実行環境観測内のNode実体開始観測 |

この7 field以外を持つobject、field欠落、own key順違いは受理しない。
§5.2の件数`3、3、3、6`は、上表の配列4本を同じ順に指す。
単体観測3つをこの件数列へ含めない。

これにより、処理から公開前再読値や読み取り専用preflight観測へ到達する経路を構造上なくす。

処理はpackage検査本体内の非公開関数とし、exportしない。
runner、test、外部利用者が呼べる新しいproduction公開面にはしない。

### 5.2 受理条件

再構成は次を全て満たす場合だけ成立する。

1. 各配列が疎でなく、件数が3、3、3、6である。
2. 各観測が開始時に成立済みの読取観測の形を持つ。
3. 行のroleが§4の固定順と完全一致する。
4. Node実体の観測が`nodeBinary`であり、開始時の実行環境観測に含まれる。
5. 欠落、余分、重複、順序変更がない。

成立時は、18行の新しいdense配列を返す。
外側の配列と各`{role, observation}`行は新規に作り、固定する。
内側の開始観測は変更も再生成もしない。

一つでも成立しない場合は`null`を返す。行の除外、並べ替え、role補正、部分利用はしない。

### 5.3 正式公開前検査への接続

正式生成で公開前再読取が`observed`になった場合だけ、次を行う。

1. §5.1の開始観測から18行を再構成する。
2. 公開前に再読した18行を取得する。
3. 既存の入力同一性比較へ、再構成列と再読列をそのまま渡す。

再構成不能、再読列不成立、既存比較の不一致のいずれも、
従来どおり`PUBLICATION_INPUT_CHANGED`一件へ帰属する。
新しい違反コードは作らない。

読み取り専用preflightは、現在の保存済み開始列と終了時再読列をそのまま比較し続ける。
正式生成だけが読み取り専用preflightの列を借りる誤接続をやめる。

### 5.4 「同一」の意味

新しい同一性規則は作らない。既存の比較規則を正本とする。

- 配列の件数、行順、外側roleが完全一致する。
- Node以外は、既存の安定読取観測比較が完全一致する。
- Node実体は、既存どおり読取成功と実体SHA-256が一致する。

同じJavaScript object参照であることは要求しない。
要求するのは、開始入力と再構成列が、正式な既存比較規則の下で同一であることである。

## 6. 開始入力との同一性を証明する検査

### 6.1 独立oracle

test側に、production再構成処理を呼ばない独立oracleを一つ作る。

oracleは、合成fixtureの開始時個別観測だけを§4の18 role順へ明示的に並べる。
公開前再読値から作らず、productionの非公開処理も複製しない。
行の期待順はtest内の固定表へ明記する。

このoracleを正式公開前の再読列として与えたとき、
`PUBLICATION_INPUT_CHANGED`が発生しないことを確認する。
これは、productionが再構成した比較元と、独立に作った開始入力列が、
既存比較規則の下で同一であることの外部観測になる。

非公開の再構成列自体をtestへexportしない。
直接取得するためのdebug fieldやproduction観測点も追加しない。

### 6.2 18行の一件差

§6.1と同じfixtureで、公開前再読列の18行を一行ずつ別々に変更する。

- Node以外は、読取内容または安定snapshotのhashを一件だけ変える。
- Nodeは、実体SHA-256を一件だけ変える。

各行で、次を完全一致させる。

```text
違反コード: PUBLICATION_INPUT_CHANGED
担当check: publication
path: $.publication.inputRecheck.observations
```

一件差を自動修復、無視、別行へ取り違えないことを18例で確認する。

### 6.3 列構造の負例

次をそれぞれ拒否する。

1. 先頭、中央、末尾の欠落。
2. 余分な行。
3. 隣接2行の入れ替え。
4. 同一行の重複。
5. 外側roleだけの変更。
6. 内側観測roleだけの変更。

全て既存の`PUBLICATION_INPUT_CHANGED`へ帰属させる。

### 6.4 production経路の検査

独立oracleの検査に加え、正式runnerを通る既存検査を維持する。

1. 入力変更なしの正式生成はinput gateを通過する。
2. 意図的な入力変更は従来どおりinput gateで停止する。
3. pre-rename故障はinput gateを通過後、公開直前の違反へ到達する。
4. published-open故障はinput gate、renameを通過後、公開後openの失敗へ到達する。

この4点により、

- 開始観測から作った列
- runnerが公開前に固定順で再読した列
- checkerの既存比較

の工程間接続を、productionと同じ経路で確認する。

### 6.5 観測点を増やしていないことの検査

次を静的に確認する。

- checker contextのown key集合が現行12 fieldのままである。
- package検査本体のexport集合が不変である。
- runnerの正式job入口、入力再読取、正式report schemaが不変である。
- 再構成処理の引数に公開前再読値、読み取り専用preflight観測、filesystem adapterがない。
- package検査本体へfile I/O、時刻取得、環境読取を追加していない。

## 7. 残る2不合格との対応表

| 不合格 | 修正前の直接原因 | 本修正で変わる処理 | 解消される根拠 | 合格時に観測すること |
|---|---|---|---|---|
| 旧test 123: formal runnerのpre-rename行 | 比較元が`null`のため、入力不変でも先に`PUBLICATION_INPUT_CHANGED` | 保存済み開始観測18行を固定順へ再構成して比較元にする | test fixtureは入力を変更せず、公開先をpre-rename直前に出すだけ。開始列と再読列が一致すればinput gateを通る | `preRenameRootReveal`へ到達し、`PUBLICATION_PRE_RENAME_INVALID`だけを予定pathへ記録。renameは0回 |
| 旧test 124: published-open行 | 同じ入力誤判定でrename・公開後読取へ到達しないため、故障記録0件 | 同上 | 入力不変のためinput gateを通り、既存のrenameと公開後固定7読取へ進める | 先頭成果物のopen故障が1件発火し、`PUBLICATION_FAILED`と公開失敗要約が予定path・failure pointへ一致 |

両件は同じ比較元欠落から派生しているため、一つの修正で解消する見込みである。

ただし、修正後に初めて到達する下流から別の不合格が出る可能性は残る。
その場合は本修正の期待を動かさず、新原因として停止する。

## 8. 実装後に予定する検査順

本設計が別途実装承認された場合、次の順で一度だけ進める。

1. package検査本体とpackage検査の2ファイルだけを変更する。
2. 差分、構文、変更禁止範囲を静的監査する。
3. §6の新規同一性検査を含むpackage側全件を、先頭から一度実行する。
   - 現行132件へ新規1件を加えるため、事前期待は133/133。
   - loop内の18行差・列構造負例を、合格件数の水増しには使わない。
4. 1件でも不合格なら、そのattemptで修正・再実行せず停止する。
5. 133/133の場合だけ、確定済みの順で意味回答側、Gate A回帰、残存発話回帰、
   candidate 13読み取り専用preflight、前提P再照合へ進む。
6. 全完了条件が成立した場合だけ、既定の安定点tagとJOURNAL手続きを行う。

本設計時点では、上記を一度も実行していない。

## 9. 実装契約完全性チェック

| 確認項目 | 本設計での固定 |
|---|---|
| 成果物schema | 変更なし。新成果物なし |
| 違反コード | 変更なし。既存`PUBLICATION_INPUT_CHANGED`を使用 |
| 終了コード | 変更なし |
| 環境固定 | 新しい環境依存なし。Node実体比較も既存SHA-256規則 |
| 入力範囲 | §4の開始時18観測だけ |
| 出力範囲 | checker内部の非公開比較列だけ |
| 工程間の受け渡し | 開始観測→非公開再構成→既存比較、を§4〜§6で固定 |
| 検査可能性 | 独立oracle、18行差、列構造負例、正式runner到達検査で確認 |
| 観測データの取得可能性 | checker contextに既存の開始観測だけで全18行が存在することを静的確認済み |
| production公開面 | 追加なし。context 12 field、export、report schemaを不変検査 |

未固定の係数、許容差、閾値はない。

## 10. 完了条件と停止条件

実装完了と呼べる条件:

1. §3.1の2ファイル以外に変更がない。
2. §4の18 role順が開始観測と既存runnerの再読順へ一致する。
3. §6の同一性、全一件差、列構造負例が全て合格する。
4. 旧test 123・124が、§7の本来の段階と帰属で合格する。
5. package側全133件が合格する。
6. 既定の後続回帰、preflight、前提Pが全て合格する。
7. 新しいfield、export、schema、違反コード、許容差がない。

次のいずれかで停止する。

- 18行を既存開始観測だけから再構成できない。
- runnerまたはchecker context schemaの変更が必要になる。
- 新しい公開面・観測点が必要になる。
- 開始列と独立oracleが既存比較規則で一致しない。
- package側全件で1件でも不合格になる。
- 旧test 123・124に別原因が現れる。
- 既存検査の期待、違反、公開順を緩める必要が生じる。
- 実装者判断が必要な未定義事項を発見する。

## 11. 承認依頼

承認を求める次工程は、次の一件である。

> 本設計v001を正本として、保存済み開始観測18行の非公開・決定的な再構成、
> 既存入力同一性比較への接続、独立oracleと正式runner検査を実装してよいか。
> productionの観測点・公開面・schema・違反コード・runnerは変更しない。
> package側全件を先頭から一度実行し、不合格なら同attemptで直さず停止する。

推奨: **承認**。

理由:

- 欠陥は比較規則ではなく、正式実行の比較元を組み立てていない工程間接続にある。
- 必要な開始観測は全て既存contextにあり、新しい観測点を作る必要がない。
- 残る2不合格を一原因で説明し、本来の公開段階へ到達させる修正である。
- 期待の緩和、入力の再推測、production公開面の増築を行わない。
