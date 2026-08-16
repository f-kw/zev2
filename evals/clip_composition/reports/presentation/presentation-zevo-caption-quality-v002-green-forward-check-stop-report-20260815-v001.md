# ZEVO字幕品質v002 green前方確認 停止報告v001

日付: 2026-08-15

## 1. 結論

reverse consumer graphの確定後、現行green前方確認を実行した。保存済みfixture gate 2件を除く536件は**524合格・12不合格**、終了code 1、signalなし、stderr 0 byteだった。保存済みZCQF001/ZCQF002=2/2を加えた現行green会計は**526/538、12不合格**である。

前回と同じ12 IDが再現したため、指示どおり同attempt修正0件で停止した。baseline 86/203、既存5 tree、A-v002記録対象treeの照合は未実施である。

本停止はF/U fixture製造、F、U、正式48件の成立を取り消さない。一方で、旧greenを含む全体の合格は成立していない。

## 2. 完了済み機械検証

| 工程 | 結果 |
|---|---:|
| fixture製造・admission | 2/2、fixture proof 34/34 |
| F局所 | 3/3 |
| U局所 | 2/2 |
| ZEVO字幕品質v002正式検査 | 48/48、proof 523/523 |
| reverse consumer graph | 19対象path、67 test source、正式48件の8 consumer、既存consumer 0 |
| green前方確認 | 524/536、新規fixture gate保存済み2/2との合成で526/538 |

## 3. 証拠

| 証拠 | 結果 | SHA-256 |
|---|---|---|
| reverse consumer graph v001 | 既存consumer 0 | `1b611c2a348cfd9fe9372b05fc2c9a09f72e8fe00427ec35eec60f357184621a` |
| 保存済み正式48件TAP | 48/48 | `d38d27e9d0d896c963114703bf3f7b3c8b7f98f7b8790cf20abab28af3598341` |
| green TAP | 524/536、12不合格 | `fe0910b792546bee0a8c218b946cca2b0c48d0b22315420765bd4c2e03aea189` |
| green stderr | 0 byte | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| green exit code | 1 | `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865` |
| green signal | none | `fcf33dfbe13c2354bf0e1b063f9fb422747a46cee00b7420bceff2b81457b345` |

実行条件はDarwin arm64 native、固定Node、固定TSX CLI絶対path、`NODE_OPTIONS`不存在、固定Node先頭PATH、登録済みChromium native起動合格、登録済みFFmpeg/FFprobe実体一致である。

## 4. 直接影響の確定

今回19 pathに対する全67 test sourceの静的逆参照を一件ずつ保存した。

- 正式48件の8 test source: consumer。
- その他の既存59 test source: consumer 0件。
- よって既存直接影響testは0件。
- 誤集合15 pathは再実行していない。
- 正式48件の保存済みTAPを直接影響検証の証拠として再利用した。

12不合格は「今回の直接影響不合格」ではない。しかし、以下のとおり旧greenの現在状態に問題があるため「問題なし」とも扱わない。

## 5. 12不合格の三分法

### 5.1 fixture・検査設営へ確定

| ID | 観測 | 帰属 |
|---|---|---|
| OBM001 | base media runner起動前の正常fixture製造中、意味情報package構築が`rejected`。production runner未到達 | 現行意味package契約に正常fixtureが閉じていない。今回F/U production欠陥ではない |
| OPF002 | テキスト配置実装の旧期待SHAと現在SHAが不一致。現在fileはclean trackedで、人間合格済みタイトル工程commitの実体 | 旧固定期待と後続承認済み実装の不整合 |
| OPF012 | loader引数の期待がpath文字列、正式TSX CLIの実観測が同pathのfile URL | 旧起動形の期待と現行正式起動形の不整合 |

### 5.2 filesystem列挙による広義の影響へ確定

| ID | 観測 | 帰属 |
|---|---|---|
| OPF004 / OPF016 | `git`の全差分・全未追跡path列挙を同期bufferへ取り込み`ENOBUFS`。`evals/clip_composition`未追跡名の出力量は1,945,028 byte | 作業ツリー全体の列挙規律と成果物配置の衝突。今回成果物も広義の影響を持つが単独原因ではない |
| OPF015 | presentation registry全tree列挙が、承認済みタイトル工程の4 registryを追加として拒否 | 旧tree固定期待と後続承認済みタイトル成果物の衝突。今回F/U成果物とは無関係 |

全未追跡名1,945,028 byteのうち、今回のcaption-quality fixture/attempt名に該当する出力量は655,800 byteである。これを除いても1,289,228 byteで既定1 MiBを超えるため、今回成果物はENOBUFSへ寄与するが唯一の原因ではない。

### 5.3 旧E2E経路内での帰属は未確定、今回F/Uへの帰属は否定

| ID | 観測 |
|---|---|
| OEE001 | 合成横型が`fatal` |
| OEE002 | 合成縦型が`rejected` |
| OEE005 | 期待した拒否枝の観測数1に対して2 |
| OEE006 / OEE007 / OEE008 | 期待した枝の観測数1に対して0 |

この6件のtest sourceは今回19 pathへの参照0件で、今回のfixture package・test-run pathを読む語彙も0件である。従って今回F/U productionの直接欠陥には帰属しない。ただしTAPは外側status・件数assertまでで、helperがfinallyで一時成果物を除去するため、旧E2E経路内のproduction欠陥、fixture不成立、後続承認による契約陳腐化のどれかまでは本attemptの保存証拠だけで一意確定できない。推測で埋めず、旧レンダラー信頼台帳・旧greenの現行再確定という別工事の契約判断へ戻す。

### 5.4 三分法集計

- 今回F/U production欠陥: **0件確認**。
- fixture・検査設営／旧期待の不整合: **3件確定**。
- filesystem列挙による広義の作業ツリー影響: **3件確定**。
- 旧E2E内側の帰属未確定: **6件**。今回F/U直接影響ではないが、green合格とも扱わない。

## 6. 処理上の意味

F/U fixtureを検査内部の一時合成から独立させ、同じ48 file packageとreceiptをF/Uへ再現可能に渡す工事は成立した。F/U本体とZEVO字幕品質v002の正式契約検査も全件合格した。

止まったのはその後の全体保証である。現在の旧greenには、後続の承認済みタイトル成果物、現行TSX起動形、大量の版付き検査成果物を前提に更新されていない検査が含まれる。この状態でgreen合格を宣言すると、旧固定期待の不整合と広義のfilesystem影響を隠すため、完了とはしない。

## 7. 未実施と禁止事項

- baseline 86/203 exact: 未実施。
- 既存5 tree、A-v002記録対象tree: 未実施。
- 修正: 0件。
- API通信: 0回。
- countTokens / generateContent: 0回。
- 費用: US$0。
- 正式描画: 0件。
- commit / stable tag: 0件。

## 8. 次の人間判断

旧green・旧レンダラー信頼台帳の現行再確定を別工事として扱い、少なくとも次の二点を裁定する必要がある。

1. 後続の承認済みタイトル実装・registry・現行TSX CLIを、旧固定期待へどう版付きで反映するか。
2. 全未追跡pathを同期bufferへ読み込む監視方式を、版付き成果物が大量に存在する現在の作業ツリーで維持するか。維持する場合、成果物配置との境界をどこに置くか。

OEE 6件は、その再確定工事で内側観測を保存して三分法を閉じる。今回のF/U工事へ混ぜて修正しない。
