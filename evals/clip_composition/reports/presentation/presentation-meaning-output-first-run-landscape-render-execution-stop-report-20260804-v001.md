# 意味/表現分離 初回実データrun 横型描画execution停止報告 v001

- 日付: 2026-08-04
- 対象: `qdczJpv8RCc` candidate 59
- 実行入力記録 SHA-256: `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680`
- 到達地点: 横型の意味・物理受入16項目合格後、共通描画coreの実行段階

## 結論

横型工程入場の古いbyte SHA束縛は、現在の正式byteへ再束縛した版付きjobと実行直前再照合で解消した。工程入場は5項目すべて合格した。

続く横型正式工程では、意味情報、基礎映像、style、crop、字幕配置、時間対応、意味保存を含む受入16項目がすべて合格し、横型表示計画まで正式生成した。しかし共通描画coreが`execution`段階でfatal・終了2となり、完成mp4とQCは生成されなかった。

不合格1件で停止する規律に従い、再実行、修正、crop適用、縦型構築・描画は行っていない。外部API通信は0回、追加費用はUS$0。

## 1. 恒久checklistの更新

`DECISIONS.md`へ、以後の全正式工程について次を起動直前に確認する規律を追加した。

- 工程入場job自身の正式byte・schema・SHA
- target jobと全上流成果物の現在file SHA
- canonical SHAを持つJSONの現在canonical SHA
- 出力root未使用
- 参照先byteをjob作成後に変更した場合は、古いjobを使わず版付きjobを新規作成
- 既存の固定Node、固定TSX loader、`NODE_OPTIONS`不存在、正式decoder受理、値validator合格も維持

更新後の`DECISIONS.md` SHA-256は`fdbc10bf0a98e407f8480813c7d759d03a9d3a2f2a81cbbe410f0847dea7dddb`。

## 2. 横型工程入場の再開結果

### 2.1 新しい版付きjob

- job: `evals/clip_composition/outputs/presentation/meaning-output-stage-admission-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/v002/08-output-landscape-attempt-0001-current-byte-rebind-v001.json`
- job SHA-256: `608be04ff134c4376feb66f48222050e0310e8ff1b46c8277f205f5d86f8b6b0`
- 旧不合格jobとfailure reportは変更せず保持した。
- 横型正式jobは現在file SHA `e710535d830829bf905550d89c62e87d6e083cbb233f3db72b23dfc45f6fe358`へ再束縛した。
- 横型表示要求は現在file SHA `be1ab2d03ac6d5fd72bd17d728cd31f8c610c9da7ee9720c67c25e51db96b464`へ再束縛した。
- 両canonical SHA、意味情報パッケージ、基礎映像は前回の値から変更していない。

### 2.2 実行前再照合

- 工程入場preflight: 合格
- 記録: `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-landscape-stage-admission-rebind-v001/preflight.json`
- 記録 SHA-256: `557e939fa1db0401653db0069d23a0b9e45ef9fd3f9da878b12e242fd89f5e1d`
- job自身、実行入力記録、target、上流3件、実装2件、未使用receipt rootを実体から再照合した。

### 2.3 正式工程入場

- 結果: 終了0、5/5合格
- receipt: `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/admissions-v002/08-output-landscape/attempt-0001/stage-admission-receipt.json`
- receipt SHA-256: `08a0aecb2f6a1de1a742e0ccf070adbc69cfd299ebf842c98d7f590a8e211c99`
- 合格項目: 実行入力束縛、target job束縛、上流束縛、横型style投影、公開直前再読

## 3. 横型正式工程の実行前確認

- 横型正式job、表示要求とも正式byte・値検査に合格した。
- job、要求、runtime 7件、実装11件、承認済み契約2件、意味情報、基礎映像4件、横型preset 5件から成る参照31束縛を現在実体から再照合した。
- control rootとrender rootが未使用であることを確認した。
- 固定Node v20.19.6、固定TSX loader、`NODE_OPTIONS`不存在を確認した。
- preflight記録: `evals/clip_composition/reports/presentation/test-runs/20260804-meaning-output-landscape-stage-admission-rebind-v001/horizontal-formal-preflight.json`
- preflight記録 SHA-256: `66cb165e11b7ac1aba0f3fb8d8a643df529304a71cb92795a82ea08a484e5248`
- 31束縛観測列 SHA-256: `2ec30c86652f02d21da79fd6ca18cc57d41fdfec27f92397a6ba830ee684827f`

## 4. 横型受入結果

横型正式runnerは受入16項目をすべて合格とし、statusを`accepted-for-render`とした。

- output frame数: 1,547
- 意味字幕: 31まとまり
- 表示page: 31
- 表示line: 62
- 最大実測論理幅: 16（入力上限36以内）
- title: 空
- 意味観測: 0件
- format: `normal-landscape`
- preset: `normal-landscape-readable-pop-v001`
- crop: identity
- scene transition: straight cutのみ
- audio: 元音声維持
- 違反: 0件

成果物:

- 表示要求 SHA-256: `be1ab2d03ac6d5fd72bd17d728cd31f8c610c9da7ee9720c67c25e51db96b464`
- 受入報告 SHA-256: `5ab940797f70b948d1ddab5a7a3e21761cb544ec140c0a66240f94598721f730`
- 表示計画 SHA-256: `4e7700974b0e7a0b7ad4ecaef73ddb577e30b8ad684a29fdeee3ad418ed05937`

## 5. 描画停止の事実

- 正式runner終了code: 2
- status: `fatal`
- 外側stage: `execution`
- 発生元: `common-draw-core`
- diagnostic code: `OUTPUT_RENDER_CORE_PROCESS_FAILED`
- 検査済み違反code: 0件
- failure report: `evals/clip_composition/outputs/presentation/meaning-output-render-failures/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v001-output/e710535d830829bf905550d89c62e87d6e083cbb233f3db72b23dfc45f6fe358/failure-report.json`
- failure report SHA-256: `e680a6585d7d7a754cb796e910ce03def5f6c8092534431e3b06699c33bf9c4c`

安全保持物:

- lock: `evals/clip_composition/outputs/presentation/meaning-output-renders/.qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v001-output.presentation-renderer-v002.lock`
- lock owner SHA-256: `15c71e1698afdb45af815eb06487b79cd7a9d067cf2cddfd0bda17cc32c669b4`
- work directory: `evals/clip_composition/outputs/presentation/meaning-output-renders/.qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v001-output.presentation-renderer-v002-work-wJrLJJ`
- work directory内の保存file: 0件

正式な横型render rootは未生成で、完成mp4、overlay、描画後QC、render manifestは存在しない。

## 6. 帰属

- 横型工程入場の再束縛: 正常。5/5合格。
- 意味情報・基礎映像・横型style・字幕配置・時間写像: 正常。受入16/16合格。
- 表示計画: 正式生成済み。物理検査を含む受入に合格。
- 共通描画core: 実行段階でfatal。内側原因は未確定。
- 契約矛盾: 現時点で観測していない。
- crop・縦型: 横型描画不合格のため未実行であり、合否未確認。

## 7. 推測

なし。現行failure reportは共通描画coreの`execution`までしか示さず、内側の値・path・tool・例外messageを保存していない。保持されたwork directoryも空であるため、原因を推測で補わない。

## 8. 未確認

- 共通描画core内部の停止位置が、overlay生成、layout inspector、Remotion起動、FFmpeg処理、QC準備のどこか。
- 失敗した具体的な値、path、tool挙動、OS error。
- 原因がproduction実装、入力・検査設営、実行環境、契約のどれに属するか。
- 原因解消後に横型描画・QC、crop、縦型描画・QCが合格するか。
- 新経路の横型・縦型動画の人間目視品質。

## 9. 実施していないこと

- 横型描画の再実行・修正: 0件
- crop適用: 未実施
- 縦型工程入場・構築・描画・QC: 未実施
- API通信: 0回
- 追加費用: US$0
- 既存3本の正式成果物への書き込み: 0件
- commit、tag、安定点化: 未実施

## 10. 次の承認依頼

保存済みの横型正式job、表示要求、受入報告、表示計画、failure report、lock、空のwork directoryと既存実装だけを使い、共通描画coreの内側原因を読み取り診断する承認を求める。

診断では、次を確定して提示し、変更・再実行は行わない。

1. 内側停止位置を、overlay生成、layout inspector、Remotion起動、FFmpeg処理、QC準備のいずれかへ絞る。
2. 具体的な値・path・tool挙動・例外条件を示す。
3. production実装、入力・検査設営、実行環境、契約の三分法で帰属する。
4. 保存済み情報だけでは内側原因を確定できない場合は、その観測不能を事実として報告し、診断用再実行や観測性改訂を自動で行わない。
5. 原因確定後に、修正箇所・契約影響・汎用／素材固有・追加費用を比較表で提示して停止する。

本件は、外側fatalが内側理由を残さない既知のfatal観測性残件と同じ形だが、観測性契約の改訂は本診断へ混ぜない。
