# fatal観測性v002 範囲改訂attempt-0002 baseline停止報告 v001

- 日付: 2026-08-08
- 判定: **停止**
- 通信: 0回
- 費用: US$0
- 正式成果物変更: 0件
- commit A: 未作成

## 1. 今回行った変更

OPF002の検査側承認済み変更表へ、縦型renderer pathと承認済み現在SHA `6fb4edfd9c9a9161f474921368b05bd32c0aaef2b1fd5155e148d291134c8c75`を1件追加し、表を2件へ更新した。

production、契約、正式成果物、正式81件の合格実装には触れていない。

## 2. 起動前checklist

次をnative環境で実測し、`attempt-0002/preflight.md`へ保存した。

- 固定Node先頭PATH
- 固定TSX loader絶対path
- `NODE_OPTIONS`不存在
- 固定Chromiumの実体SHA一致と起動成功
- 正式検査と競合するprocess 0件
- attempt root未使用
- OPF002検査fileの構文合格

## 3. 完了した工程

| 工程 | 結果 | 主証拠 | SHA-256 |
| --- | ---: | --- | --- |
| 直接影響 | `130/130` | `attempt-0002/direct-impact-130.tap` | `4af8ba575d67e421f79b9c226e532daf54fd8d54a37393136e8b922f3ee875bb` |
| 既存green | `287/287` | `attempt-0002/green-aggregate-287.tap` | `509a20e574bb8f1de2d73e57786995d3ae1b40afe72a3d9ffea4a2ee73dfb977` |

greenは8検査fileを個別に固定順で実行した後、同じ順序で一括実行した。直接影響・greenともstderrは0 byteである。

## 4. baseline停止

baselineは6検査fileを個別に実行した後、同じ順序で一括実行した。規定値と実測は次のとおり。

| 集計 | tests | pass | fail | cancelled | skipped | todo |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 規定 | 181 | 64 | 117 | 0 | 0 | 0 |
| 実測 | 203 | 86 | 117 | 0 | 0 | 0 |
| 差 | +22 | +22 | 0 | 0 | 0 | 0 |

- 一括TAP: `attempt-0002/baseline-aggregate-181.tap`
- SHA-256: `e071fc9a56ef69ecf05b252d832ed9d03a91451de43b11619b9b7767f5abde52`
- baselineの単独6件・一括1件のstderr: 全て0 byte

不合格数は増減していないが、exact集計は不一致である。規律どおり、既存5 tree照合とcommit Aへ進んでいない。同attemptで期待値も実装も変更していない。

## 5. 差の具体的な所在

5検査fileは設計表の内訳と完全一致した。相違は縦型renderer検査だけである。

| 対象 | 規定 | 実測 |
| --- | ---: | ---: |
| `presentation_vertical_review_renderer_v001.test.mjs` | `0/1` | `22/23` |

このtest fileは現在HEAD、`stable/vertical-first-clip-20260802`、`stable/meaning-output-first-real-run-20260806`の3地点でbyte同一である。

- SHA-256: `10c2da982b2d41004655ce6ea9099a9429ea8cb7b319ed1f25b5b8d30e5b0973`
- 実在するtest: 23件
- 現在の実測: 22合格・1不合格

旧baseline TAPでは、このfileは`.ts`を読めず`ERR_UNKNOWN_FILE_EXTENSION`でmodule起動前に落ち、23件を実行せず「file全体の1不合格」として数えられていた。今回の正式規律は固定TSX loaderを必須にしたため、23件が実行され、22合格・1不合格として正しく展開された。

したがって、今回の差はproduction退行や検査追加ではない。**旧baseline集計が、現在の正式起動条件と異なるloaderなし実行の粒度を固定値に残していた**ことが原因である。

## 6. 三分法

- production欠陥: なし
- 検査内容・fixture欠陥: なし
- 契約／実行計画の不整合: **あり**。固定TSX loader必須と、loaderなしで作られた`64/181` exact値が同居している。

## 7. 実現性調査で事前検出できたか

**できた。** 旧baseline TAPには`.ts`の未知拡張子によるfile-level失敗が明記され、現物test fileには23件が実在する。完全実装設計時に、保存済みaggregateだけでなく、現在の固定loader条件で各fileの実行粒度を照合すれば検出できた。

事前検出できなかった理由は、旧TAPの総数をそのまま設計へ転記し、`.ts` fileの内側23件がloaderなしで未実行だったことを値レベルで照合しなかったためである。

## 8. 推奨する範囲改訂

1. 旧`64/181`は2026-08-03時点の歴史的観測として不変保持する。
2. fatal観測性v002の正式baselineは、固定Node・固定TSX絶対path・native環境という現行規律の下で、縦型renderer行を`22/23`、総計を`86/203`へ改訂する。
3. fail 117件と他5行の内訳は変更しない。production、fixture、検査内容、正式成果物は変更しない。
4. 既に保存済みのattempt-0002 TAPを改訂後baselineの証拠として採用し、同じ検査を再実行しない。
5. 人間承認後、既存5 tree最終照合→commit A→18 path SHA表付き完了報告だけを再開する。

これは不合格を消すための期待緩和ではなく、必須loaderによって実際に走るようになった既存22合格を、同じ実行粒度で数えるための固定値訂正である。

## 9. 事実・推測・未確認

### 事実

- OPF002を含む直接影響130件は全合格した。
- green 287件は全合格した。
- baselineは`86/203`で、規定`64/181`と一致しなかった。
- 差は縦型rendererの既存22合格だけで、不合格117件は不変である。
- 5 tree照合とcommit Aは未実施である。

### 推測

- なし。

### 未確認

- §8のbaseline固定値改訂がkawafmmに承認されるか。
- 改訂承認後の既存5 tree最終照合とcommit A。

## 10. 承認依頼文案

> baseline exact停止を受理し、§8の範囲改訂を承認する。旧`64/181`は歴史的TAPとして保持し、固定Node・固定TSX絶対path・native環境で走るfatal観測性v002の正式baselineを`86/203`へ改訂する。内訳変更は縦型renderer検査の`0/1`から`22/23`だけとし、fail 117件、他5行、production、fixture、検査内容、正式成果物は不変とする。保存済みattempt-0002のbaseline TAPを改訂後の正式証拠として採用し再実行は行わない。承認後は既存5 tree最終照合、commit A、18 path SHA表付き完了報告まで進め、不一致1件で停止する。通信0・費用US$0を維持する。

目標接続判定: fatal観測性v002を、現行の正式起動条件と矛盾しないbaselineで完了させる。
