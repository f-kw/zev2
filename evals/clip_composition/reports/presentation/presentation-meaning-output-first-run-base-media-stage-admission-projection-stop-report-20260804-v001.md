# 意味/表現分離 初回実データrun 基礎映像工程入場停止報告 v001

日付: 2026-08-04

## 結論

大容量媒体の読取欠陥は、既存の共通ストリーミング照合へ寄せる限定修正で解消した。意味情報パッケージは正式生成まで成功した。

次の基礎映像工程への入場検査は、意味情報パッケージを検査する際に必要な全量文字参照を渡さず、既定の空参照として検査したため不合格になった。正式job・意味情報パッケージの値は互いに一致している。検査不合格1件で停止する規律に従い、jobの修正・再試行・基礎映像生成は行っていない。

外部API通信は0回、追加費用はUS$0。

## 事実

### 1. 大容量媒体読取の診断と限定修正

- 元媒体は3,288,164,785 byteで、保存済みSHA-256 `8359f59d8c205fb815c9165f5a464ec4bb9f109f9d91384b80e571410dc2fa25`と一致した。
- 旧処理の全量読取では固定Node v20.19.6が`ERR_FS_FILE_TOO_LARGE`を返すことを読み取り診断で再現した。
- 既存timeline/基礎映像経路が使う共通ストリーミング照合を、意味情報パッケージの初回照合と公開直前再照合の両方から呼ぶようにした。新しいhash計算は作っていない。
- 関連検査は33/33合格。
- TAP: `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-information-large-media-streaming-v001/meaning-information-package.tap`
- TAP SHA-256: `a26c1f4214205ffa40d910072156694ccf5d0fef896f90e745f130fda8a80aa1`
- fatal観測性の実害8例目は`DECISIONS.md`へ記録済み。

### 2. 意味情報パッケージの工程入場と生成

- 工程入場attempt-0002は5項目すべて合格した。
- receipt: `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/admissions-v002/06-meaning-package/attempt-0002/stage-admission-receipt.json`
- receipt SHA-256: `b771b67fa267f54e99bdbb366cea1b50904a4c62ba82999a47e782688d775c77`
- 正式パッケージは31個の意味まとまり、281文字、空title、意味観測0件として生成された。
- package: `evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-meaning-output-first-run-meaning-package-v002-meaning-information/meaning-information-package.json`
- file SHA-256: `27769faadce76c5becec8ad03549300b8a037f728410ca058cc5e376cd3e9613`
- canonical SHA-256: `918fc26e871533b4ae6bafcd9c1e405e739e085a8fe5a24ed4df8dc00d4d7ceb`

### 3. 基礎映像工程入場の不合格

- 基礎映像jobは正式decoder・値検査・正式byte検査に合格した。
- job: `evals/clip_composition/outputs/presentation/meaning-output-base-media-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-meaning-package-v002-meaning-information-output-base-media.json`
- job SHA-256: `1aa7b1d78dd1a43b81e62886a8a97b6b5000697ad8c89941de263503162cb5db`
- 工程入場job: `evals/clip_composition/outputs/presentation/meaning-output-stage-admission-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/v002/07-base-media-attempt-0001.json`
- 工程入場job SHA-256: `6967e5f6f9cd635bf8848a4319e4d1f064f7621370a712f035948296a24231be`
- 実行結果は終了1、`STAGE_ADMISSION_PROJECTION_MISMATCH`だった。
- failure report: `evals/clip_composition/outputs/presentation/meaning-output-run-input-failures/meaning-output-run-input-failure-6967e5f6f9cd635bf8848a4319e4d1f0/failure-report.json`
- failure report SHA-256: `894fe7818345e8097cec3f271d98b3af15094fe6095ae45effe632e301de938b`
- 基礎映像の出力rootは未生成である。

## 読み取り診断

### 一致していたもの

- jobが束縛する意味情報パッケージのpath・file SHA・canonical SHAは、工程入場jobの上流束縛と完全一致した。
- 元媒体は1件、timeline区間は1件。
- sourceRefは`youtube:qdczJpv8RCc`で一致した。
- 区間は`5941162`〜`5992736` msで一致した。

### 不一致を生んだ処理

工程入場の共通上流検査は、意味情報パッケージを検査するときに全量文字参照を渡していない。その検査器は参照が無い場合に期待文字を0件と扱うため、31個の字幕を持つ正常なパッケージを`CAPTION_COUNT_INVALID`として拒否する。

意味情報パッケージ生成器は、281文字の全量参照と文字実体を渡して同じパッケージを検査しており、正式生成に合格している。したがって、今回の不合格は入力値や基礎映像jobの不整合ではなく、工程入場側が文脈依存の検査器を文脈なしで呼ぶ実装欠陥である。

## 帰属

- 入力実体: 正常。正式packageのSHAと内容は一致。
- 基礎映像job: 正常。正式byte・値・出力先の検査に合格。
- 工程入場処理: 実装欠陥。意味情報パッケージの検査に必要な文脈を渡していない。
- 契約矛盾: 現時点では観測していない。ただし、工程入場でどこまで全量検査を再構築するかの修正方式は未承認。

## 未実施

- 工程入場処理の修正
- 基礎映像工程入場の再実行
- 基礎映像生成
- crop適用
- 横型・縦型の構築、描画、QC

## 次の承認依頼

工程入場の意味情報パッケージ検査を、文脈依存の検査器へ空の期待値を渡す現状から改めるため、読み取り専用の方式比較と限定修正設計の起草承認を求める。

比較対象は次の2案とする。

1. 工程入場では正式byte・schema・SHA・区間投影を検査し、全量文字閉包は直後の基礎映像runnerが既存正本で再構築して検査する。
2. 工程入場でも既存成果物から全量文字参照を再構築し、文脈付きで同じ検査器を呼ぶ。

どちらも新しい文字計算を複製せず、既存の正本だけを使うことを前提とする。設計承認前の修正・再試行は行わない。
