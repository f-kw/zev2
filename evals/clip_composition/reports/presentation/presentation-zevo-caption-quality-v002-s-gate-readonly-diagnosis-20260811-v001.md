# ZEVO字幕品質v002 S局所ゲート 読み取り専用原因診断 v001

- 日付: 2026-08-11
- 状態: 診断完了・修正前停止
- 対象production SHA-256: `bcdd3b69bba6573ea65b5a75b931c7de4e88e33aa4e1467a0d69ee11af542cc8`
- 対象test SHA-256: `882e56c921583773eb1e79dbe48b03367de2c607e7e036d3c3d5eb3201c74b57`
- API通信: 0回
- 費用: US$0

## 1. 結論

6件の不合格は、2原因群へ証拠付きで分かれた。

1. ZCQ001・ZCQ005: productionが、固定TSX loader下でnamed exportとして現れるstyle resolverを`default` exportとして読んでいる。必須export検査で例外となり、入力成果物の再読前にfatalへ落ちる。
2. ZCQ002・ZCQ003・ZCQ004・ZCQ006: 合成fixtureがpure builderへ渡す3項目の順序を正式入口と違えている。builderは契約どおりexact inputを拒否している。

三分法の最終集計は、production欠陥2件、fixture・検査設営欠陥4件、契約矛盾0件である。期待条件を緩める必要はない。

## 2. 保存した観測

### 2.1 同一commandの正式再実行

固定Node・固定TSX loader・`NODE_OPTIONS`不存在で、停止時と同じ6件を頭から一度実行した。結果は0/6、test runner終了code 1で再現した。

| 証拠 | SHA-256 | 内容 |
|---|---|---|
| `diagnostics/presentation-zevo-caption-quality-v002-s-gate-diagnosis-20260811-v001/attempt-0002.tap` | `abcb005b213f37d5fcfb87e5b7cd0c46d09e0f5b6b11f9939bf655a4d5f3a0bd` | 正式TAP全文 |
| `diagnostics/presentation-zevo-caption-quality-v002-s-gate-diagnosis-20260811-v001/attempt-0002.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | stderr 0 byte |

### 2.2 内側結果の読み取り観測

元の2 pathは変更せず、同じsource/test byteからメモリ上で観測行だけを足した派生実行を行った。分岐、返値、期待値は変更していない。

- ZCQ001 child CLI: 終了code `2`、`status=fatal`、`stage=input-reread`、`primaryCode=CUE_SOURCE_EXECUTION_FAILED`、stderr 0 byte。
- pure builder 4回: `status=rejected`、`primaryCode=CUE_SOURCE_INPUT_BINDING_INVALID`、violation path `/input`。
- ZCQ005 canonical SHA負例: `status=fatal`、`stage=input-reread`、`primaryCode=CUE_SOURCE_EXECUTION_FAILED`。
- import区間checkpoint: `style-export-check`。

観測ログ:

| 証拠 | SHA-256 |
|---|---|
| `diagnostics/presentation-zevo-caption-quality-v002-s-gate-diagnosis-20260811-v001/attempt-0002-observer.stderr` | `2d1ff3c4500df966487c68c35d289c9cd05db562146142251ead9c77b40a58a3` |
| `diagnostics/presentation-zevo-caption-quality-v002-s-gate-diagnosis-20260811-v001/attempt-0002-inner-observer.stderr` | `115423458169c938fdf0d2132e57c5d9b48bb4b316ba3cc6127b0458f99acc49` |
| `diagnostics/presentation-zevo-caption-quality-v002-s-gate-diagnosis-20260811-v001/style-import-shape-observation.json` | `2e8bba3006e5a77102cb6d50f83f79047a3b2125a55d4143de2018c5e098e7db` |

診断後も対象2 pathのSHA-256は冒頭の値と一致する。production・test・fixture・期待値・既存成果物は変更していない。

## 3. 原因群A: CLI系のproduction欠陥

productionはstyle resolverをimportした後、module namespaceの`default`を取り出し、その中にresolver関数があることを要求する（production 712〜716行）。同じdirectoryの正式`.mjs`から固定TSX loaderで実測したnamespaceは、resolver関数をnamed exportとして持ち、`default`を持たなかった。実exportはstyle resolver 224行にある。

このため、次の順で停止する。

1. job、実装binding、runtime data、承認契約の読取を開始する。
2. style resolverをimportする。
3. `default`内の必須export検査で例外となる。
4. production 728〜729行のcatchが、`fatal / input-reread / CUE_SOURCE_EXECUTION_FAILED`へ写す。
5. CLIは終了code 2を返す。

ZCQ005のcanonical SHA負例も、意味packageのcanonical SHAを比較する前に同じ場所で止まる。したがって今回の不合格はcanonical SHA fixtureの誤りではなく、比較地点へ到達させないproduction欠陥である。

## 4. 原因群B: pure builder用fixtureの入力順欠陥

pure builderの正式入口は、`job`、job byte binding、case inputsの順のexact 3項目である（production 364〜367行）。一方、合成fixtureはtest 249行で、`job`、case inputs、job byte bindingの順にobjectを作り、test 267〜270行でそのままbuilderへ渡す。

このproductionのexact判定はkey集合だけでなく順序も検査する。そのため、意味atom、style、出力projectionの検査へ入る前に、4件とも同じ`CUE_SOURCE_INPUT_BINDING_INVALID /input`で拒否された。

productionは正式入口どおりに拒否している。帰属はfixture・検査設営であり、productionのexact判定を緩める理由にはならない。

## 5. 6件の個別帰属

| ID | 最初に不合格となった観測 | 三分法 | 解消方向 |
|---|---|---|---|
| ZCQ001 | 正常CLIが終了2。内側は`style-export-check`から`fatal / input-reread / CUE_SOURCE_EXECUTION_FAILED` | production欠陥 | 実在するnamed exportへproductionを接続する |
| ZCQ002 | 共通fixtureのpure構築が`CUE_SOURCE_INPUT_BINDING_INVALID /input` | fixture・検査設営欠陥 | exact 3項目の正式順でfixture入力を製造する |
| ZCQ003 | ZCQ002と同じ共通fixture・同じ実測拒否 | fixture・検査設営欠陥 | 同上 |
| ZCQ004 | ZCQ002と同じ共通fixture・同じ実測拒否 | fixture・検査設営欠陥 | 同上 |
| ZCQ005 | canonical SHA比較前の`style-export-check`がfatal化 | production欠陥 | named export接続後、canonical SHA負例を本来の比較地点まで到達させる |
| ZCQ006 | ZCQ002と同じ共通fixture・同じ実測拒否 | fixture・検査設営欠陥 | 同上 |

「同一原因」への統合根拠は、ZCQ002・003・004・006では同じ`buildSynthetic`入口と同じprimary code/pathの実測、ZCQ001・005では同じimport区間・同じcheckpoint・同じfatal写像の実測である。

## 6. 修正前に閉じるべき追加観測

今回の最初の6不合格とは別に、上記2原因を直した直後に表面化する欠陥と、検査証明不足を読み取りで確認した。修正設計では同じSゲートの閉包項目として扱う必要がある。

### 6.1 正式台帳の識別field読取

共通JSON再読処理は、全formal JSONで成果物本体の`schemaVersion`とbindingのschema値を一律比較する（production 586〜603行）。しかしpreset検査台帳と素材検査台帳の正式識別fieldは`registryVersion`である。file SHAとcanonical SHAが一致していても、このfield名の読み違いにより次段でbinding mismatchとなる。

方向は成果物roleごとの既存validator・識別規則へ接続することである。台帳側へ架空の`schemaVersion`を足すこと、field不一致を無条件に無視すること、fallbackを設けることは採らない。

### 6.2 V2 proofの実枝証明不足

現testは、V2で追加された一部proof IDを、export集合、契約SHA配列、usage CLIへ割り当てており、次を実枝で証明していない。

- 実job byte bindingがbuilderへ渡ること。
- 承認契約3件のexact role/path/SHAと公開前再読。
- 公開直前の契約SHA差し替えが所定の公開失敗へ帰属すること。
- 同じ実job bindingからsource package byteが決定的に再構築されること。

この不足は今回の0/6を直接起こした原因ではない。しかし6/6になっただけでSゲート閉包を宣言する誤判定を防ぐため、次の修正設計でproof割当を置換し、証明消失0を示す必要がある。

## 7. 修正方向の比較

| 対象 | 契約へ届く方向 | 採らない方向 | 契約影響 |
|---|---|---|---|
| style resolver接続 | productionが実在named exportを使う | fatalを正常期待にする、loader依存のdefault wrapperをfixtureで捏造する | なし |
| pure builder fixture | fixtureがexact 3項目を正式順で明示製造する | productionのexact key/order検査を緩める | なし |
| 正式台帳の再読 | role別の既存識別規則・validatorを使い、SHA照合を維持する | 台帳へ架空fieldを加える、識別検査を省略する | なし |
| V2 proof | 正式な実job・実binding・公開前再読を実発火させる | 静的文字列やdummy bindingを実枝証明として数える | なし |

推奨はproductionとfixture/testをそれぞれ承認済み契約へ合わせる限定修正である。契約追補へ切り替える矛盾は見つからなかった。

## 8. 事実・推測・未確認

### 事実

- 正式再実行は0/6。
- ZCQ001 child CLIは終了2、`input-reread / CUE_SOURCE_EXECUTION_FAILED`。
- ZCQ005もcanonical SHA比較前に同じfatalへ落ちた。
- pure構築4件は同じ`CUE_SOURCE_INPUT_BINDING_INVALID /input`。
- style resolverの実module namespaceはnamed exportを持ち、`default`を持たない。
- 対象production/testのSHAは診断前後で不変。

### 推測

- なし。原因統合は共通入口と同一の構造化観測があるものだけに限定した。

### 未確認

- 修正後の6/6、正式46件、回帰は未実施。
- 修正後にcanonical SHA負例が最終的に期待codeへ届くことは未実行。
- A工程の続行は未実施。

## 9. 恒久規律と停止

DECISIONSへ、「局所ゲートも正式全件検査と同じくTAP全文を版付き保存し、コンソール転記だけを証拠にしない」を記録した。本診断では同一commandの正式TAP全文を版付き保存した。

本書の提示で停止する。修正設計、実装、再検査、A工程進行は別承認とする。
