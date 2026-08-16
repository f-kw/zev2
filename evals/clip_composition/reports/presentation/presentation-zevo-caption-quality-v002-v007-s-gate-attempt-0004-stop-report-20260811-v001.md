# ZEVO字幕品質v002 v007適用 S局所gate attempt-0004 停止報告 v001

- 日付: 2026-08-11 JST
- 対象: 追補v007、S production、S test、atomic公開prepare限定修正
- formal test: 6件
- 結果: 5合格 / 1不合格
- 外部通信: 0回
- 費用: US$0
- 同attempt修正: 0件

## 0. 結論

S局所gate attempt-0004はZCQ001の1件不合格で停止した。ZCQ002〜ZCQ006は5/5合格した。追補v007で新設したZCQ004の三点証明4/4と、ZCQ005のstaging兄弟分類を含む13 proofは全て合格した。

不合格はproduction runner、契約、fixture値の拒否ではない。ZCQ001内の検査補助処理が、固定commandによる隔離runtime二回buildのうち二つ目の出力fileを読もうとした時点で`ENOENT`になった。補助処理はcompilerの終了code・stderrを戻り値へ組み立てる前に例外終了したため、二つ目のbuildが出力を作らなかった内側理由は保存TAPから確定できない。

本attemptは、S設営全体見直し後に再び検査設営・実行環境側で停止した。既承認の歯止めに従い、個別修正もS設営再見直しも提示せず、S工程計画全体をkawafmmへ戻す。A→L→P→R→F→U、正式46件、回帰、commitは未実施である。

## 1. 起動前確認

| 項目 | 観測 |
|---|---|
| 固定Node | v20.19.6、実体SHAは登録値と一致 |
| 固定TSX | 絶対path、実体SHAは登録値と一致 |
| `NODE_OPTIONS` | 環境変数不存在 |
| native | Darwin arm64、atomic runtime SHAは登録値と一致 |
| PATH | 固定Node→`/opt/homebrew/bin`→`/usr/local/bin`→OS標準path |
| FFmpeg / FFprobe | `/opt/homebrew/bin`の実体を解決、版確認成功 |
| 同系統の並行正式検査 | 0件 |
| guard直接側 | S 6件登録、選択1件合格、残り5件skip |
| guard import側 | S検査追加登録0件、共用owner入口使用可 |
| v007 proof閉包 | 総数489、S所有50、重点owner件数の再導出合格 |

## 2. 正式attemptの実測

| ID | 結果 | 意味 |
|---|---|---|
| ZCQ001 | 不合格 | v006 runtime再現性の検査補助処理で、隔離B出力の読取が`ENOENT` |
| ZCQ002 | 合格 | 複数meaning packageの入力順と決定的ID |
| ZCQ003 | 合格 | atom全量非重複・非欠損とcase一対一 |
| ZCQ004 | 合格 | pure builderでcode実発火、formal runnerの上流支配、projection各predicate、固定順・freeze |
| ZCQ005 | 合格 | binding/style/実行/publicationの所有、atomic成功・late collision、staging7分類 |
| ZCQ006 | 合格 | source package byteと来歴の決定性 |

TAP上の集計は`tests=6 / pass=5 / fail=1 / skipped=0`。stderr保存fileは0 byteである。

ZCQ001はV7契約件数proofまで通過し、v006 runtime互換性proofの観測関数内で停止した。productionの正常CLI、契約再読、atomic入口、ZCQ004/ZCQ005の実枝はそれ以前または別IDで合格している。

## 3. 内側停止点

保存TAPが示す停止点は次である。

```text
observeV6RuntimeCompatibility
→ 隔離A・隔離Bを固定clangで順にbuild
→ formal / A / BをPromise.allでread
→ B runtimeのreadFileがENOENT
```

確認できた値:

- 欠落対象: 隔離Bの`presentation_atomic_directory_publish_v001-darwin-arm64`
- OS error: `ENOENT`
- 例外発生: build結果の`exitCode`・`stderr`をproof observationへ返す前
- TAP外stderr: 0 byte
- 一時build root: helperのfinallyで削除済み

未確認:

- 隔離Bのclang終了code。
- 隔離Bのclang stderr byteと内容。
- 出力未作成がcompiler、filesystem、資源のどれに由来したか。

未確認事項を推測で埋めない。

## 4. 三分法

| 区分 | 判定 | 根拠 |
|---|---|---|
| production欠陥 | 該当観測なし | production codeを通るZCQ002〜ZCQ006は全合格。ZCQ001もruntime再build補助処理より前のproduction観測は通過 |
| fixture・検査設営 / 実行環境 | **帰属** | 不合格はtest内の隔離compile観測で発生し、正式成果物入力やproduction runnerの拒否ではない。補助処理がtool結果を保存前に出力fileを読んだため原因観測が欠けた |
| 契約矛盾 | 該当観測なし | v007のcontract構成、proof再導出、ZCQ004の訂正後証明は全て合格 |

原因の所在は検査設営・実行環境側へ確定できるが、その内側でcompiler失敗かfilesystem失敗かは診断可能性不足である。

## 5. 歯止めの適用

本attemptは、S test設営全体見直し後の新attemptである。既承認条件は「再び検査設営起因の不合格が出た場合、個別修正も設営再見直しも提示せず、S工程計画自体をkawafmmへ戻す」である。

したがって次を行わない。

- 隔離Bだけの再build。
- 出力file読取前に終了codeを確認する個別patch。
- compiler retry。
- S attempt-0005。
- A以降の局所gate。
- 正式46件、回帰、commit。

## 6. 現在の不変状態

- 追補v007はDECISIONSへ承認記録済み。
- S production、S test、atomic公開prepareの承認済み変更は作業ツリーで凍結する。
- attempt-0004のTAP、stderr、preflight、guard selfcheckは監視root外へ保持する。
- 既存正式成果物、stable tag、API入力、描画成果物への変更は0件。
- API通信、countTokens、generateContent、費用支出、正式描画は0件。

## 7. S工程計画の差し戻し論点

次の裁定では、v006 runtime再現性証明をS局所gateの毎attemptで再buildする現在計画自体を見直す必要がある。少なくとも次を計画単位で決める必要がある。

1. v006五条件5/5の既存正式証拠と、現在runtimeのbyte照合をS gateでどう分担するか。
2. 再buildを維持する場合、compiler終了code・stderr・出力存在をどの順で版付き保存し、出力読取前の失敗を診断可能にするか。
3. toolchain再現性検査をSのcode owner検査と同じ6件へ毎回含めるか、独立preflightへ分離するか。
4. 再設計後のS gateが、v007のZCQ004三点証明とZCQ005の7分類を失わないこと。

本書は選択肢を採用せず、S工程計画をkawafmmへ戻して停止する。
