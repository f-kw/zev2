# ZEVO字幕品質v002 v010 TSX wrapper descriptor事前照合 停止報告 v001

- 日付: 2026-08-12 JST
- 対象: F局所正式attempt前のmodule surface実体照合
- 通信: 0回
- 費用: US$0
- 正式F/U attempt: 0回

## 1. 結論

固定TSX実体が生成する`default` wrapperのproperty descriptorが、承認済み追補v009/v010の固定条件と一致しない。正式attemptを始める前に検出したため、検査を通すための除外や黙認を入れず停止した。

Fのsource authored named export 6件、runtime namespaceのnamed 6件+`default` 1件、wrapperからnamed exportへの参照同一性、formal capability objectと19関数のfreezeは成立している。不一致はwrapperのdescriptor二点に限定される。

## 2. 実行条件

- Node: 固定実体
- TSX: runner配下の固定CLI実体
- `NODE_OPTIONS`: 不存在
- `PATH`: 固定Nodeを先頭、Homebrew tool群を後続
- import方式: 物理`.mjs` importerからFの`.ts`をimport
- production/test/fixtureの正式実行: なし

最初の`--eval`確認はTSXのCJS出力形のためnamed exportを直接得られず、正式な照合には使用していない。物理`.mjs` importerへ戻した後の観測だけを以下の判定根拠とした。

## 3. 現物観測

| 項目 | 承認済み条件 | 実測 | 判定 |
|---|---|---|---|
| source authored named export | 6件exact | 6件exact | 合格 |
| runtime namespace enumerable key | named 6件+`default` | named 6件+`default` | 合格 |
| wrapper enumerable key | named 6件exact | named 6件exact | 合格 |
| wrapper→named参照 | 6件全て同一参照 | 6件全て`===` | 合格 |
| wrapper symbol | 0件 | 0件 | 合格 |
| wrapper accessor | 0件 | getter 6件 | 不一致 |
| wrapper追加data | 0件 | 非列挙`__esModule=true` 1件 | 不一致 |
| getter setter | — | 6件全てsetterなし | 観測済み |
| getter descriptor | — | enumerable=true / configurable=false | 観測済み |
| `__esModule` descriptor | — | enumerable=false / configurable=false / writable=false | 観測済み |
| formal capability object | freeze済み19 key | object freeze、19関数freeze | 合格 |

6 getterは全て、呼び出すと対応するnamed exportと同じ関数参照を返した。したがって別実装や参照ずれはないが、「accessor 0」「追加data 0」という承認済みbyte条件には一致しない。

## 4. 影響範囲

### 完了した事前作業

- v010の版付き文書作成とDECISIONS承認記録
- v010契約bindingの各工程への配線
- formal capability読み取り入口、object/function freeze、F source 6 export
- F 35失敗証明とU負例の検査実装（正式attempt前の未実行状態）
- S/A/L/P/R module surfaceの遡及照合 5/5

### 未実施

- F局所正式attempt
- U局所正式attempt
- 正式46件
- 直接影響回帰、green 287、baseline 86/203、tree照合
- API通信、countTokens、generateContent、描画、stable tag

正式attempt rootとF正式出力rootは未使用である。現在の部分実装は追記・削除・commitせず停止時状態で保持する。

## 5. 三分法

| 帰属 | 判定 | 根拠 |
|---|---|---|
| production欠陥 | 非該当 | source authored export 6件、同一参照、formal capability freezeは契約どおり |
| 検査・実現性調査欠陥 | 該当 | v009/v010起草時のTSX観測が`Object.keys`と参照同一性に偏り、own property descriptorのgetterと非列挙`__esModule`を現物から閉じていなかった |
| 契約解釈 | 要裁定 | 承認済み条件が固定TSXの現物と非両立であり、正式検査の期待値を黙って変えられない |

実現性調査で事前検出できた。物理`.mjs` importerから`Object.getOwnPropertyDescriptors`と`Object.getOwnPropertyNames`を正式attempt前に実測したため検出した。v009起草時にも同じ深度で確認できる事項だった。

## 6. 修正候補

| 案 | 内容 | 影響 | 判定 |
|---|---|---|---|
| A（推奨） | 最小追補v011で固定TSXの実体をexact化する。source authored 6件と参照同一性は維持し、wrapperは「列挙named 6件、getter-only 6件、各getterがnamedと同一参照、setter 0、configurable=false」に固定する。own propertyはその6件+非列挙・readonly・`true`の`__esModule`一件だけを許可する。 | production path増減0。F testのmodule surface期待と全formal jobの契約bindingだけを版付き改訂。新契約を一件追加する場合は件数をsource/B5/B6/selection/proof=10/10/11/12/12へ改訂する必要がある。 | 現物に一致し、sourceの余分export拒否と参照同一性を維持できる。 |
| B | Fをnative ESMのdata property namespaceへ移すため、path/type/package境界またはbuild方式を変更する。 | path上限、implementation binding、起動方式、既存jobへ波及する。 | 工事量が大きい。 |
| C | accessorと`__esModule`を検査から除外する。 | 承認済みexact条件を黙って弱める。 | 不採用。 |

案Aでも、固定TSX実体が変わりdescriptorが変化した場合は不一致として停止する。単にgetterを無条件許可するのではなく、今回の実測形をtoolchain束縛下でexactに検査する。

## 7. 再開条件

wrapper descriptorの扱いを版付き契約で裁定し、全formal jobの契約binding件数とmodule surface proofの置換をexactに固定した後、停止中のF検査前監査から再開する。正式attemptはその照合が合格するまで開始しない。
