# 意味／表現境界 初回実データrun QC作業領域削除記録 v001

- 日付: 2026-08-06
- 安定点tag: `stable/meaning-output-first-real-run-20260806`
- 対象commit: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 結論: 許可された最終描画のwork／lockだけを削除し、正式成果物のSHA-256は削除前後で一致した

## 1. 前提確認

削除前に、安定点tagが対象commitを指すことと、実行入力記録、意味情報パッケージ、基礎映像、横型完成MP4、縦型完成MP4の現物SHA-256を確認した。tag発行前後で正式成果物の内容は変わっていない。

## 2. 削除したもの

次の4 directoryだけを削除した。正式成果物、report、正式TAP、途中の失敗attemptは削除していない。

| 種別 | path | regular file数 | 論理byte数 |
| --- | --- | ---: | ---: |
| 横型QC work | `evals/clip_composition/outputs/presentation/meaning-output-renders/.qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003-output.presentation-renderer-v002-work-pE6EBB/` | 156 | 1,022,754,900 |
| 横型lock | `evals/clip_composition/outputs/presentation/meaning-output-renders/.qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003-output.presentation-renderer-v002.lock/` | 1 | 333 |
| 縦型QC work | `evals/clip_composition/outputs/presentation/meaning-output-renders/.qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002-output.presentation-renderer-v002-work-tP3F3j/` | 214 | 1,269,949,348 |
| 縦型lock | `evals/clip_composition/outputs/presentation/meaning-output-renders/.qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002-output.presentation-renderer-v002.lock/` | 1 | 332 |

合計は372 file、2,292,704,913 byteである。削除後、4 pathがすべて存在しないことを確認した。

## 3. 正式成果物の削除前後照合

| 正式成果物 | 削除前SHA-256 | 削除後SHA-256 | 判定 |
| --- | --- | --- | --- |
| 実行入力記録 | `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680` | `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680` | 一致 |
| 意味情報パッケージ | `27769faadce76c5becec8ad03549300b8a037f728410ca058cc5e376cd3e9613` | `27769faadce76c5becec8ad03549300b8a037f728410ca058cc5e376cd3e9613` | 一致 |
| 基礎映像 | `faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967` | `faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967` | 一致 |
| 横型完成MP4 | `175dc67489e86b2fc364894a737693a14a9c7c27fab492c0cb1873aedd6a77bc` | `175dc67489e86b2fc364894a737693a14a9c7c27fab492c0cb1873aedd6a77bc` | 一致 |
| 縦型完成MP4 | `eeb72350373be88022966059f09cd9b3f474a005ffa3cc18db8417eafdaa9618` | `eeb72350373be88022966059f09cd9b3f474a005ffa3cc18db8417eafdaa9618` | 一致 |

## 4. 事実・推測・未確認

### 事実

- 安定点tagの発行後にだけ削除した。
- 削除対象は最終横型・縦型のwork／lock 4 directoryに限定した。
- 正式成果物5件のSHA-256は削除前後で完全一致した。

### 推測

- なし。

### 未確認

- なし。
