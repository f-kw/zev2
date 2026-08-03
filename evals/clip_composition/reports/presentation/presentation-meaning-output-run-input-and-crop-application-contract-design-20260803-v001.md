# 意味／表現分離 初回実データrun 実行入力・crop適用契約 設計v001

- 日付: 2026-08-03
- 状態: **設計提示。実装・通信・正式生成は未実施**
- 対象: 初回実データrunの5入力を一つに固定し、既存の分割job群へ来歴として結ぶこと／人間認定済みcropを新経路の基礎映像へ正直に適用すること
- 非対象: 統合runner、入力値の再解釈、cropの再選択、API通信、動画生成、既存3本・stable tag・既存v006原本の変更

## 1. 結論

固定済み5項目を保持する`run-input-record.json`と、各分割jobをその記録へ結ぶ版付きの工程入場記録を新設する。既存jobを一つへまとめるrunnerは作らない。

cropについては、既存v006の媒体pathやSHAを書き換えない。v006は「実際に見て型・候補・viewportを決めた旧基礎映像」の記録として保存し、新しい`crop-application.json`が「同じ元媒体・同じ区間・同じframe写像を持つ新基礎映像へ、その認定値を再計算せず適用した」と記録する。

ただし、実装を5 file以内で済ませる連続許可は使わない。理由は二つある。

1. 各既存jobのexact schemaへ記録bindingを直接追加する場合、最低25 fileのforward-only版が必要になる。
2. 外部の工程入場記録を使う最小案でも、cropの観察来歴を偽らず出力側が受理するには、出力契約のcrop入力を非互換に置き換える必要があり、計12 fileとなる。

本設計は、後者の**12 file最小案**を推奨する。これは各job自身のJSONへ記録bindingを重複格納せず、工程入場記録が`実行入力記録SHA + job SHA`を共束縛する方式である。この保証境界をkawafmmが承認してから実装する。

## 2. 実行入力記録

### 2.1 正式成果物

- schema: `presentation-meaning-output-run-input-record-v001`
- 固定名: `run-input-record.json`
- path: `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/<recordId>/run-input-record.json`
- UTF-8、BOMなし、2 space indentation、末尾LF 1 byte。
- duplicate key、未知key、欠落key、疎なarray、暗黙defaultを拒否する。
- 正式公開後はbyte不変。後段の値を追記しない。

rootは管理欄2件と業務入力5件のexact 7 keyをこの順で持つ。

```json
{
  "schemaVersion": "presentation-meaning-output-run-input-record-v001",
  "recordId": "qdczJpv8RCc-candidate-59-meaning-output-first-run-v001",
  "sourceAndInterval": {},
  "horizontalStyle": {},
  "verticalStyle": {},
  "spendingLimit": {},
  "title": {}
}
```

`sourceAndInterval`はexact 5 key。

```json
{
  "sourceRef": "youtube:qdczJpv8RCc",
  "candidateId": 59,
  "assemblyDecision": {
    "schemaVersion": "presentation-base-media-assembly-decision-v001",
    "path": "evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json",
    "fileSha256": "72a1d9c95839a62a3f4dae395ffa9e67877910d75040c65796ca994ad3dd51a4",
    "canonicalSha256": "b20032877091927b0f0f240c8d960a0b478b12035d40935337f893c1e9ab3a98"
  },
  "sourceStartMs": 5941162,
  "sourceEndMs": 5992736
}
```

`horizontalStyle`はexact 4 key。

```json
{
  "format": "normal-landscape",
  "presetId": "normal-landscape-readable-pop-v001",
  "maxLogicalWidthPerLine": 36,
  "crop": {"mode":"identity"}
}
```

`verticalStyle`はexact 6 key。

```json
{
  "format": "vertical-short-1080x1920",
  "screenLayoutId": "speaker_only",
  "presetId": "vertical-short-speaker-only-readable-pop-v001",
  "maxLogicalWidthPerLine": 14,
  "cropDecision": {
    "schemaVersion": "vertical-preset-type-crop-decision-v006",
    "path": "evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006/crop-decision-v006.json",
    "fileSha256": "4fba3f371412310fc5122ccfb58634e390a5725aec185172bcf041dd0152a4ed",
    "canonicalSha256": "518ea4e8cc07b863e7368fadeb56d39457ca78ba7c6c3b52140ff443f28b3769"
  },
  "selectionPackageManifest": {
    "schemaVersion": "vertical-preset-type-crop-selection-package-v006",
    "path": "evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006/selection-package-manifest-v006.json",
    "fileSha256": "34bf1c56e3635f7b20c414307182c4f8c92e5d18d7a599616be5a9d7b0be3176",
    "canonicalSha256": "3298b3fb69b324373e36203c8d94bc72b9b69486d3bad8dde7066ecf76bee0e7"
  }
}
```

`spendingLimit`と`title`は次で固定する。

```json
{"currency":"USD","maximumNanoUsd":500000000}
```

```json
{"text":"","inputMode":"none"}
```

preset台帳の全binding、最大2行、文字幅規則、素繋ぎ、音声保持、素材なしは出力契約から導出する。これらを別の人間入力として増やさない。record固定時に正式台帳を読んで解決し、工程入場検査で正式jobの実値と照合する。

## 3. 既存の分割job群への束縛

### 3.1 採用方式

既存jobのexact schemaは変更しない。各工程の実行前に、共通の読み取り専用入口が実行入力記録と正式jobを読み、当該工程が所有する値を照合して`stage-admission-receipt.json`を新規公開する。

receiptはexact 8 key。

```json
{
  "schemaVersion": "presentation-meaning-output-stage-admission-receipt-v001",
  "receiptId": "formal-id",
  "status": "passed",
  "stage": "timeline-decision",
  "runInputRecordBinding": {},
  "jobBinding": {},
  "upstreamBindings": [],
  "checks": []
}
```

- `runInputRecordBinding`と`jobBinding`は`schemaVersion / path / fileSha256 / canonicalSha256`のexact 4 key。
- `stage`は固定10語彙: `timeline-decision / b3-source-package / b5-token-measurement / b6-generation / b1-validation / meaning-package / base-media / output-landscape / crop-application / output-vertical`。
- `upstreamBindings`は、そのjobが既に持つ入力bindingを記載順に再掲する。値を推測しない。
- `checks`は`name / status / comparedPaths`のexact objectを固定順に持つ。statusは`passed`だけ。自由文を入れない。
- record、job、上流成果物は開始時とreceipt公開直前に再読し、SHA差を拒否する。
- receipt pathは`<record root>/admissions/<2桁ordinal>-<stage>/stage-admission-receipt.json`へ固定し、既存先・上書きを拒否する。

工程別の照合対象は次のとおり。

| 工程 | 実行入力記録から照合する値 | 既存来歴で次へ繋ぐ値 |
|---|---|---|
| 区間決定 | sourceRef、組立決定、開始・終了ms | 区間決定jobとdecisionのSHA |
| B3 | sourceRef、区間 | 区間decisionとsource packageのSHA |
| B5 | source package、支出上限の実行構成 | B5 job/request/計測manifestのSHA |
| B6 | B5固定request、支出上限 | 生応答、manifest、意味回答のSHA |
| B1 | B6成果物と区間 | 受入reportと意味group列のSHA |
| 意味package | 区間、空title | packageとjobのSHA |
| 基礎映像 | package内のsource・区間 | base media 4成果物のSHA |
| 横型出力 | 横preset、幅36、identity crop | output request/job/planのSHA |
| crop適用 | v006原本、新基礎映像、縦型ID | crop applicationのSHA |
| 縦型出力 | 縦preset、幅14、crop application | output request/job/planのSHA |

各既存成果物は既に自分を生成したjob SHAを保持する。receiptが同じjob SHAとrecord SHAを共束縛することで、`record → admission receipt → job → existing output binding`という来歴グラフを閉じる。

### 3.2 保証すること／しないこと

保証すること:

- 5入力の正式byte。
- 各job byteが、実行前に5入力のうち担当範囲と一致したこと。
- jobが生成した成果物の既存job bindingと、receiptが束縛したjobが同じであること。
- 全工程が同じrecord SHAへ接続していること。

保証しないこと:

- 既存job JSON自身が`runInputRecordBinding` fieldを持つこと。
- recordを引数として既存runnerが内部で直接消費したこと。
- APIサーバ側実体や生成の決定性。
- 動画の見た目・聴こえ方の人間合格。

この保証境界を狭すぎると判断する場合は、全jobをforward-only v002へ上げて直接fieldを持たせる。見積りは25 fileであり、本設計の推奨にはしない。

## 4. crop来歴の再束縛ではなく「適用」を記録する

### 4.1 採用しない方式

既存v006の`sourceMedia.path / fileSha256`を新基礎映像へ書き換えたコピーは作らない。そのfieldはcrop候補を実際に見た媒体を表すため、書き換えると観察来歴が偽になる。

### 4.2 正式artifact

新成果物は`crop-application.json`一つ。v006原本と新基礎映像を別bindingで保持する。

rootはexact 10 key。

```json
{
  "schemaVersion": "presentation-output-crop-application-v001",
  "applicationId": "formal-id",
  "status": "passed",
  "jobBinding": {},
  "runInputRecordBinding": {},
  "reviewedCrop": {},
  "targetBaseMedia": {},
  "sourceEquivalence": {},
  "selectionProjection": {},
  "checks": {}
}
```

`reviewedCrop`はv006 decision、selection package manifest、認定時の旧base media 4成果物をexact bindingで持つ。`targetBaseMedia`は新経路のbase media、timeline、generation manifest、validation receiptをexact bindingで持つ。

`selectionProjection`はv006原本からだけ導出した次のexact 4 keyを持つ。

1. `screenLayoutId`
2. `selectedCandidateId`
3. `viewports`
4. `canonicalSha256`

今回の値は`speaker_only / speaker_only_body / speaker=[0.601796875,0,0.918203125,1]`。コードへcandidate固有値を焼き込まず、実行入力記録とv006原本から読む。

`sourceEquivalence`は次を記録する。

- 保証語彙: `same-source-and-timeline-only`
- 同じ元配信file path・SHA。
- 同じ`sourceRef`。
- 同じsource frame clock。
- 全segmentのsource ms、source frame、output frame写像の完全一致。
- 同じ出力幅・高さ、frame rate、frame数。
- 新旧base mediaのfile SHA関係を`same / different`で事実記録。

新旧mp4のbyte同一や、新媒体を人間が再視聴したことは主張しない。source、区間、frame写像、画面寸法のどれかが違えば再束縛せず停止する。係数・画像類似度・許容差を使わない。

### 4.3 出力側の非互換置換

新しいforward-only出力では、縦型`cropPolicy`を次のexact 3 keyへ置き換える。

```json
{
  "mode": "bound-decision",
  "scope": "all-segments",
  "application": {
    "schemaVersion": "presentation-output-crop-application-v001",
    "path": "workspace-relative-path",
    "fileSha256": "sha256",
    "canonicalSha256": "sha256"
  }
}
```

旧4 key形とunionにせず、新経路でのfallback・暗黙変換を作らない。既存3本は既存経路とstable tagで凍結されており、変更しない。

出力側はapplicationのtarget base mediaがoutput requestのbase mediaと一致することを検査し、v006原本の`selectedPlan.viewports`を既存`buildLayoutVideoFilter`へ渡す。型判定、候補選択、viewport計算、crop計算を複製しない。

## 5. 実装見込み

推奨案は計12 file（新規5、既存変更7）。統合runnerは0 file。

### 実行入力記録と工程入場記録: 新規3 file

1. `evals/clip_composition/presentation_meaning_output_run_input_record_v001.mjs`
2. `evals/clip_composition/run_presentation_meaning_output_run_input_record_v001.mjs`
3. `evals/clip_composition/presentation_meaning_output_run_input_record_v001.test.mjs`

### crop applicationと出力側接続: 新規2、既存変更7 file

4. `evals/clip_composition/presentation_output_crop_application_v001.mjs`（新規）
5. `evals/clip_composition/run_presentation_output_crop_application_job_v001.mjs`（新規）
6. `evals/clip_composition/presentation_output_contract_v001.mjs`
7. `evals/clip_composition/presentation_output_style_resolver_v001.ts`
8. `evals/clip_composition/run_presentation_output_job_v001.ts`
9. `evals/clip_composition/presentation_output_contract_v001.test.mjs`
10. `evals/clip_composition/presentation_output_style_resolver_v001.test.mjs`
11. `evals/clip_composition/presentation_output_page_line_planner_v001.test.mjs`
12. `evals/clip_composition/presentation_output_render_plan_v001.test.mjs`

既存production 3 fileの変更はcrop入力の非互換置換とapplication検査だけ。page/line planner、render plan本体、字幕、crop filter、QCは変更しない。

## 6. 実装時の必須検査

1. run input exact schema、決定性、未知field拒否、5項目1差ごとの拒否。
2. 各stageのjob値とrecord投影の一致、別record／別job／別上流SHAの拒否。
3. 全receiptが一つのrecord SHAへ接続すること。
4. v006原本と認定時base mediaの既存対応。
5. 新旧base mediaのsource、全区間、frame写像、寸法、frame数の完全一致。
6. v006の型・候補・viewportの1値差拒否。
7. crop applicationとoutput requestのtarget base media一致。
8. 新しいcrop入力だけを新forward-only出力が受理し、旧shapeを受理しないこと。
9. 既存crop filterだけが呼ばれ、新計算がないこと。
10. v006原本、既存3本、stable tag、正式台帳の作業前後tree SHA不変。
11. 既存205/205・287/287と対象output検査の回帰。
12. 実行入力記録を固定した後の実行前下書きに、5項目以外の人間判断が増えていないこと。

検査不合格1件、12 file超過、契約の追加解釈、既存3本のbyte差、crop計算の複製が必要になった時点で停止する。同attemptで期待値を動かさない。

## 7. 人間作業量・費用

- 本設計の判断: 1件、約1〜2分。
- 実装・合成検査・既存回帰・record固定・crop application: 人間作業0件。
- 実行前下書き: 固定済み5項目を一枚で確認するだけ、約30〜60秒。想定外入力が無ければ2026-08-03の条件付き実行承認をそのまま適用する。
- 実走後: 横型・縦型の完成動画2本を各約51.6秒目視。判断を含め合計約3分弱。
- 本設計・実装準備中のAPI通信0回、費用US$0。
- 実走時だけ、既承認どおり`countTokens`最大2回、生成1回、支出上限US$0.50。

## 8. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 値レベル閉包 | closed | §2で5入力のexact値を固定 |
| schema閉包 | closed | record、receipt、application、cropPolicyをexact化 |
| 参照実体 | closed | 既存job validator、v006 validator、base media validator、crop filterを再利用 |
| 工程間受け渡し | closed | §3の固定10工程とSHA来歴graph |
| 観測取得可能性 | closed | 旧／新timeline、generation manifest、media inspectionから取得可能 |
| 数値区分 | closed | ms/frame/件数は整数、viewportは人間認定済み有限小数を不変利用 |
| 検査可能性 | closed | §6で正負例・不変回帰を列挙 |
| 既存成果物保護 | closed | 既存3本、v006原本、台帳、tagは読取照合だけ |
| API・費用 | closed | 本段階0回・US$0 |
| 保証境界 | **人間判断待ち** | job内直接fieldではなく外部receiptによる共束縛を採るため |

## 9. 承認依頼

次の一判断を依頼する。

**推奨案を承認する**: 既存job JSONへ同じrecord bindingを重複追加せず、工程入場receiptがrecord SHAとjob SHAを共束縛する保証境界を採用する。併せて、v006原本を変更せず`crop application`で同一source・区間・frame写像の新基礎映像へ認定値を適用する非互換crop入力を採用し、上記12 fileの完全実装設計・実装を次段とする。

承認されるまで、実装、実行入力記録の正式固定、API通信、正式生成、描画は開始しない。
