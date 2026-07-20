# 演出指示書スキーマ・検査器 実装設計 v001

日付: 2026-07-20

状態: **実装前設計。人間承認待ち。コード、合成testdata、プリセット台帳、レンダラー、実走は未着手。**

参照する承認済み正本:

- `presentation-instruction-renderer-boundary-contract-20260720-v001.md`
- `presentation-renderer-initial-requirements-20260720-v001.md`
- `evals/clip_composition/presentation_caption_contract.mjs`の既存G1〜G3契約

## 0. 目的と本来の目的への照合

本設計の目的は、ZEVが決めた「いつ・何を・何に・どの型で・どの素材を使うか」を、レンダラーが推測せず実行できる版付き指示へ固定し、境界違反を描画前に止めることである。

新しい演出能力、見た目、点数、補正係数を作る仕事ではない。人間の修正量を減らしつつ、意味判断と描画不具合の帰属を分けるための検品契約を作る。旧形式を救済する後方互換分岐も作らない。

## 1. 今回の実装範囲と停止点

### 実装承認後に作るもの

- 5項目の演出指示書を厳密に読むスキーマ検査器。
- 指示ID、発火atom、対象、プリセット、素材の参照整合検査。
- 既存G1〜G3検査器への委譲接続。
- 決定的なJSON reportとCLI。
- 全違反コードを発火させる合成テスト。

### 今回も作らないもの

- 演出指示の生成器、G4〜G7意味検出器、LLM実走。
- プリセットの具体的な見た目、有効な本番プリセットID。
- 素材台帳の実媒体、レンダラー、比較動画、公開動画。
- 描画後QC、縦型ショート契約、映像だけを根拠にした発火点。
- 旧`telopPlan`等からの変換器。

設計承認だけではコード実装以外の下流工程を承認したことにならない。

本設計で初めて、参照IDの実体をレンダラーへ渡す解決パッケージが必要だと確定した。承認済み境界契約§3の「対象参照から本文・anchorまで解決し、レンダラーに推測させない」を実行可能にする搬送形式だが、承認済みレンダラー要求仕様§2の入力一覧にはまだ明記されていない。**本設計が承認された場合、コード着手前に、境界契約とレンダラー要求仕様へ解決パッケージの入力、ID/hash照合、生成manifestへのpackage ID/hash記録を同一コミットで追記する。** この追記も人間承認前には行わない。

## 2. 既存G1〜G3検査器との責務分離

既存の`presentation-caption-checker-v001`は次を既に決定的に検査し、24件の合成テストが通っている。

- 元発話atomのID、文字、時刻、順序。
- G1の文字の厳密一致と削除許可。
- G2の意味単位、改行、atom順序。
- G3の開始・終了anchor、cue時刻、表示順、宣言済み同時表示、正の時間交差。
- source atom同士の正の時間重なりは拒否せず観測として記録する。境界接触は重なりにしない。

新検査器はこの意味検査を複製しない。`speech-caption`で必要な完全入力を解決パッケージから組み立て、caption契約参照IDごとに**1回だけ**`validatePresentationCaptionContract`へ渡す。返されたreportは既存コード・状態・未検査項目を変更せず内包する。

新検査器だけが担当するのは次である。

- 5項目指示書の外枠、閉語彙、未知項目拒否。
- 指示書と解決パッケージのID・ハッシュ一致。
- 種類と対象種別、発火点と対象、表示終了責任の接続。
- 承認済み台帳に結び付いたプリセット・素材検査indexとの照合。
- caption cueと`speech-caption`指示の1対1接続。

caption内部の未知項目だけは、既存検査器が許容している現状を外枠から悪用できないよう、**許可項目の形だけ**を新検査器で検査する。文字一致、時刻、順序、重なり等の意味判定は引き続き既存検査器だけが行う。既存検査器本体と既存24テストは変更しない。

## 3. 版名と渡す成果物

### 3.1 レンダラーへ渡す2成果物

レンダラーには次を同時に渡す。

1. 演出指示書`zev-presentation-instruction-v001`
2. 参照IDを時刻・本文・話者・表示anchorへ解決する`presentation-resolution-package-v001`

指示書は解決パッケージのIDとcanonical SHA-256を持つ。レンダラーは別パッケージ、別版、ハッシュ不一致の内容でIDを解決しない。これにより、`startAtomId`や`targetRefId`を生時刻・本文へ直す責任をレンダラーの推測にしない。

レンダラーはさらに、承認済みの正式プリセット台帳、素材台帳、素材実媒体、元映像・音声を受け取る。検査用indexだけから見た目や媒体pathを推測しない。

### 3.2 検査器へ渡すbundle

```json
{
  "schemaVersion": "presentation-instruction-check-v001",
  "instructionSet": {},
  "resolutionPackage": {},
  "presetValidationIndex": {},
  "materialValidationIndex": {}
}
```

検査器には別引数で、承認済み台帳から人間承認時に固定した信頼bindingを渡す。

```json
{
  "schemaVersion": "presentation-registry-trust-v001",
  "presetRegistryVersion": "approved-preset-registry-version",
  "presetValidationIndexSha256": "64桁の小文字16進SHA-256",
  "materialRegistryVersion": "approved-material-registry-version",
  "materialValidationIndexSha256": "64桁の小文字16進SHA-256"
}
```

bundleは例示した`schemaVersion`、`instructionSet`、`resolutionPackage`、`presetValidationIndex`、`materialValidationIndex`だけを許可し、全項目必須とする。信頼bindingも例示した5項目だけを許可し、全項目必須とする。どちらも未知項目を拒否する。

bundle内の自己申告版だけでは「承認済み」を証明できないため、信頼bindingはbundle生成側から分離する。実運用CLIの呼出元がリポジトリ管理された承認済みbindingを明示選択する。検査器は与えられたbindingの人間承認そのものを暗号学的に証明できない。この運用上の信頼境界を既知限界として残す。

## 4. 演出指示書の厳密スキーマ

### 4.1 指示書全体

許可項目は次だけで、すべて必須とする。

```json
{
  "schemaVersion": "zev-presentation-instruction-v001",
  "instructionSetId": "presentation-set-001",
  "format": "normal-landscape",
  "rendererContractVersion": "zev-renderer-boundary-v001",
  "sourceProvenance": "source-atoms-and-targets-version",
  "resolutionPackageId": "resolution-package-001",
  "resolutionPackageSha256": "64桁の小文字16進SHA-256",
  "presetRegistryVersion": "approved-preset-registry-version",
  "materialRegistryVersion": "approved-material-registry-version",
  "instructions": []
}
```

- 版、ID、由来、台帳版は空でない文字列。
- 形式は`normal-landscape`だけ。
- 解決パッケージID・hashは実際の入力と完全一致する。
- 指示列は空でもよい。確信の低い演出を出さない契約を保つ。
- 指示列の配列順はartifactのhashとerror pathにだけ使う。描画優先順位や合成順には使わず、レンダラーはプリセット台帳の宣言から決める。
- 未知項目を拒否する。座標、色、font size、生ms、旧形式を追加できない。

### 4.2 指示1件

```json
{
  "instructionId": "instruction-001",
  "trigger": {
    "startAtomId": "atom-120"
  },
  "kind": "information-comment",
  "target": {
    "targetType": "information-item",
    "targetRefIds": ["target-comment-004"]
  },
  "presetId": "approved-preset-id",
  "materialRefs": ["speaker-icon-001"]
}
```

- 5意味項目は`trigger`、`kind`、`target`、`presetId`、`materialRefs`。追跡用の`instructionId`も必須。
- `instructionId`は指示書内で一意な空でない文字列。
- `trigger`は`startAtomId`だけを持つ。atomは解決パッケージに実在する。
- `targetRefIds`は形式上配列だがv001は**ちょうど1件**。複数要素は1つの版付き複合対象として解決パッケージへ登録する。
- `presetId`は初期アートが固定1種でも必須。暗黙default禁止。
- `materialRefs`は素材不要時も空配列で必須。意味上は集合で、空でない一意なIDだけを持つ。順序に意味はなく、reportではID順に整列する。
- 異なる種類が同じ対象を使うことは許す。意味が近いという理由で自動重複排除しない。
- 指示、発火点、対象の未知項目を拒否する。

### 4.3 v001の発火点限界

発火点は保存済みatomの開始だけを表現する。映像だけで起きる出来事、発話atomの途中、無音中の発火は表現できない。生msやframe番号で穴埋めせず、実測で必要性が確定した後に境界契約を版付き改訂する。

## 5. 解決パッケージ

### 5.1 全体

```json
{
  "schemaVersion": "presentation-resolution-package-v001",
  "resolutionPackageId": "resolution-package-001",
  "sourceProvenance": "source-atoms-and-targets-version",
  "atomGranularity": "word-timestamp",
  "sourceAtomsSha256": "64桁の小文字16進SHA-256",
  "sourceAtoms": [],
  "targets": [],
  "captionContracts": []
}
```

- 許可項目は上記だけで全て必須。
- `resolutionPackageId`と`sourceProvenance`は空でない文字列。
- `atomGranularity`は既存caption契約と同じ`word-timestamp`または`character-timestamp`。
- `sourceAtomsSha256`は`sourceAtoms`配列のcanonical JSON hash。
- 指示書の`sourceProvenance`、`resolutionPackageId`、パッケージ全体hashと完全一致する。
- パッケージ全体hashと`targetRefId`の組を、レンダラーが扱う版付き対象の実体とする。
- `sourceAtoms`と`targets`は空配列を許す。`captionContracts`は0件または1件だけとする。空の指示書を正しく表せるようにし、要素がある場合の参照整合は後段で検査する。
- v001でcaption契約を最大1件に固定する理由は、複数契約へ分割すると契約間のsource atom再利用・cue時間交差が既存G1/G3検査の外へ漏れるためである。同時表示を含む1つの論理caption計画は、既存検査器へ渡す1契約内へ全て収める。複数契約対応が必要になった場合は、意味検査を再実装せず、既存検査器へ統合入力を渡す版付き改訂を先に設計する。

### 5.2 元発話atom

source atomの許可項目は次だけである。

| 項目 | 必須 | 意味 |
|---|---:|---|
| `atomId` | はい | 一意な既存ID。 |
| `speechId` | はい | 元発話の有限整数ID。 |
| `speaker` | いいえ | 元入力に存在する場合だけ保持する話者表示値。 |
| `text` | はい | 空でない文字列。 |
| `startMs` | はい | 有限整数。 |
| `endMs` | はい | 有限整数で`startMs < endMs`。 |

source atomの構造・時刻・順序・重複は、新実装で再現せず既存caption検査器へ次のsource-only入力を1回委譲して検査する。

```json
{
  "schemaVersion": "presentation-caption-check-v001",
  "format": "normal-landscape",
  "source": {
    "atomGranularity": "解決パッケージ値",
    "atomProvenance": "解決パッケージ値",
    "atoms": ["解決パッケージのsourceAtoms"],
    "captionTargets": [],
    "allowedSimultaneousGroups": []
  },
  "captionPlan": { "cues": [] }
}
```

この委譲では`report.contract`の状態・違反・source観測だけをsource検査結果として使う。空captionに対するG1〜G3と、character timestamp由来のG2部分検査はsource検査へ伝播させない。実際のcaption契約委譲ではG1〜G3を全て伝播する。

### 5.3 対象entry

共通項目は`targetRefId`と`targetType`。対象種別ごとの許可項目は次のとおりで、記載外を拒否する。

| 対象種別 | 必須固有項目 | 任意項目 |
|---|---|---|
| `caption-target` | `captionContractRefId`, `cueId` | なし |
| `source-atom-range` | `sourceAtomIds` | なし |
| `information-item` | `informationItemId`, `sourceAtomIds` | `speakerId` |
| `speaker` | `speakerId`, `speakerDisplayName`, `sourceAtomIds` | なし |
| `reference-subject` | `referenceSubjectId`, `sourceAtomIds` | なし |

- `targetRefId`はパッケージ内で一意な空でない文字列。
- `sourceAtomIds`は空でない一意なID列で、source配列の順序を逆転せず、全IDが実在する。
- caption以外の指示の発火atomは、その対象の`sourceAtomIds`内に必要。
- `captionContractRefId`と`cueId`はcaption契約内で一意に解決できる必要がある。
- `informationItemId`、`speakerId`、`referenceSubjectId`は由来追跡と素材対応に使う意味IDである。別台帳の本文を推測するIDではなく、表示本文・時刻は同じ対象のsource atomから解決する。
- `speakerDisplayName`は空でない表示用文字列として解決パッケージへ固定する。`speaker-identification`は素材なしでもこの文字列を表示でき、レンダラーが`speakerId`や任意のsource `speaker`から名前を推測しない。誰を指すかの意味正しさはG6側の評価対象で、本構造検査は対象内に表示名が固定されていることだけを見る。
- 使われない対象entryは拒否する。caption以外の同じ対象を複数指示が参照することは許す。

### 5.4 埋め込みcaption契約

caption契約entryの許可項目は次だけである。

```json
{
  "captionContractRefId": "caption-contract-001",
  "captionSchemaVersion": "presentation-caption-check-v001",
  "captionTargets": [],
  "allowedSimultaneousGroups": [],
  "captionPlan": { "cues": [] }
}
```

同じsource atomを契約ごとに複製しない。検査器は解決パッケージの単一sourceとentryを組み合わせ、既存検査器の完全入力を構築する。これにより、captionの文字・時刻・順序が別sourceへすり替わる余地をなくす。

構造allowlistは次のとおり。必須・型の意味検査は既存検査器へ委譲するが、記載外の項目は外枠で拒否する。

- caption target: `targetId`, `requiredAtomIds`, `allowedOmissionAtomIds`
- simultaneous group: `simultaneousGroupId`, `targetIds`
- caption plan: `cues`
- cue: `cueId`, `targetId`, `lines`, `startAnchor`, `endAnchor`, `startMs`, `endMs`, 任意の`simultaneousGroupId`
- line: `atomIds`, `renderedText`
- anchor: `atomId`, `edge`

接続規則:

- `caption-target`は1つの契約・cueを指す。
- cue IDが契約内で重複した場合、先勝ち・後勝ちで解決しない。既存検査器の重複違反を保持し、当該cueへの外枠接続は曖昧として失敗させる。
- 同じ契約・cueを複数の対象entryまたは複数指示へ登録しない。
- `speech-caption`の発火atomはcueの`startAnchor.atomId`と一致する。
- bundleに含めた全cueは各1件の`speech-caption`指示へ結び付く。未参照caption契約、未参照cue、caption対象だけの残骸を許さない。
- 表示終了はcueの`endAnchor`が正本。プリセットは上書きできない。

## 6. プリセット・素材検査indexと信頼binding

### 6.1 プリセット検査用index

```json
{
  "registryVersion": "synthetic-preset-registry-v001",
  "presets": [
    {
      "presetId": "synthetic-style-v001",
      "format": "normal-landscape",
      "kindPolicies": [
        {
          "kind": "speech-caption",
          "endResponsibility": "target-anchor",
          "allowedMaterialRoles": [],
          "requiredMaterialRoles": []
        },
        {
          "kind": "emphasis-strong-emotion",
          "endResponsibility": "preset-policy",
          "endPolicyId": "synthetic-emphasis-end-v001",
          "allowedMaterialRoles": [],
          "requiredMaterialRoles": []
        }
      ]
    }
  ]
}
```

- index全体は`registryVersion`, `presets`だけ。
- preset entryは`presetId`, `format`, `kindPolicies`だけ。
- kind policyは`kind`, `endResponsibility`, 任意の`endPolicyId`, `allowedMaterialRoles`, `requiredMaterialRoles`だけ。
- IDと版は空でない文字列。配列内は重複不可。
- `presets`は空配列を許す。各presetの`kindPolicies`は1件以上必要。許可・必須素材役割の配列は空を許す。
- `speech-caption`は`target-anchor`だけで`endPolicyId`禁止。
- 他9種類は`preset-policy`だけで、空でない`endPolicyId`必須。
- 必須素材役割は許可素材役割の部分集合。必須役割は全て揃えるAND条件として扱う。
- 参照されないentryを含めindex全体を検査する。未知種類・未知役割・未知項目を残さない。
- 可読性、美しさ、最低限の変化は本検査の点数にせず、別承認のプリセット台帳で確認する。

### 6.2 素材検査用index

```json
{
  "registryVersion": "synthetic-material-registry-v001",
  "materials": [
    {
      "materialId": "synthetic-speaker-icon-001",
      "role": "speaker-icon",
      "compatibleSubjects": [
        { "subjectType": "speaker", "subjectId": "speaker-korone" }
      ]
    }
  ]
}
```

- index全体は`registryVersion`, `materials`だけ。
- material entryは`materialId`, `role`, `compatibleSubjects`だけ。
- `materials`は空配列を許す。各`compatibleSubjects`は1件以上必要で、各要素は必須の`subjectType`と`subjectId`だけを許可する。
- 対応対象は候補固有`targetRefId`でなく再利用可能な意味IDで持つ。
- `speaker-icon`は`subjectType=speaker`だけ、`reference-image`と`reference-video`は`subjectType=reference-subject`だけ。
- ID、版、role、subjectは空でない正しい閉語彙。配列内は重複不可。
- 参照されないentryを含めindex全体を検査する。
- 実媒体path、hash、可読性は正式素材台帳とレンダラーpreflightの責任。

### 6.3 信頼binding

- bindingの2つの版は空でなく、指示書と各indexの版に完全一致する。
- bindingの2つのhashは各index全体のcanonical SHA-256に完全一致する。
- binding、index、指示書のいずれかだけを書き換えても検査を通らない。
- 合成テストはsynthetic bindingを使う。本番プリセット・素材の承認や台帳作成を本設計で先取りしない。

## 7. 閉語彙、対象、素材、表示終了

| 演出種類 | 対象種別 | 表示終了の正本 | 素材外枠 |
|---|---|---|---|
| `speech-caption` | `caption-target` | cueのG3 end anchor | 外部素材なし |
| `emphasis-important-statement` | `source-atom-range` | プリセット方針 | 外部素材なし |
| `emphasis-mistake-realization` | `source-atom-range` | プリセット方針 | 外部素材なし |
| `emphasis-discovery` | `source-atom-range` | プリセット方針 | 外部素材なし |
| `emphasis-strong-emotion` | `source-atom-range` | プリセット方針 | 外部素材なし |
| `information-comment` | `information-item` | プリセット方針 | `speaker-icon`を任意使用可。対象に`speakerId`が必要 |
| `information-narration` | `information-item` | プリセット方針 | 外部素材なし |
| `information-lyrics` | `information-item` | プリセット方針 | 外部素材なし |
| `speaker-identification` | `speaker` | プリセット方針 | 表示名は対象から必ず解決。`speaker-icon`だけ任意使用可、必須化はpreset宣言 |
| `reference-supplement` | `reference-subject` | プリセット方針 | `reference-image`または`reference-video`を1件以上 |

G7の「画像または動画」は契約上のOR条件で、presetの必須素材役割AND条件とは別に検査する。画像のみ、動画のみ、両方は適合可能、両方なしは不適合。素材は対象の`speakerId`または`referenceSubjectId`とcompatible subjectが一致する必要がある。

プリセットの許可役割はこの表を緩和できない。別役割が必要になった場合は契約語彙を版付き改訂する。

## 8. 検査順と停止規則

検査順は固定し、前段の欠落を推測で補わない。

1. bundleと信頼bindingの型、版、未知項目を検査。
2. 2つのindexを未使用entryまで検査し、bindingの版・hashと照合。
3. 指示書全体と解決パッケージ全体を検査し、ID、由来、package hashを照合。
4. source atom構造を既存caption検査器へsource-onlyで委譲。
5. 対象entry、caption構造allowlist、参照ID台帳を構築。
6. 指示1件ごとの6必須欄、閉語彙、発火点、対象包含を検査。
7. presetの種類対応・終了責任、素材の役割・意味対象対応・必須条件を検査。
8. 解決可能なcaption契約を参照IDごとに1回だけ既存検査器へ委譲。
9. cue・caption対象・指示の1対1を検査。
10. 各欄を決定順で出力し、既存captionの失敗・部分検査状態を上位へ伝播。

独立に検査できる違反は全件列挙する。ただし、重複IDのどれかを勝手に正本とせず、そのIDを使う後段接続は曖昧として停止する。未知プリセットをdefaultへ、未知素材を近い素材へ、旧形式を新形式へ置き換えない。

## 9. 違反コード v001

実装は以下の固定集合を`PRESENTATION_INSTRUCTION_VIOLATION_CODES`としてexportする。各コードを少なくとも1つの合成入力で実際に発火させ、テスト側は「export集合=観測済み集合」をassertする。

### 9.1 最上位・信頼binding

| コード | 条件 |
|---|---|
| `BUNDLE_INPUT_NOT_OBJECT` | bundleがobjectでない |
| `BUNDLE_SCHEMA_VERSION_UNSUPPORTED` | bundle版が完全一致しない |
| `BUNDLE_UNKNOWN_FIELD` | bundleに未承認項目がある |
| `TRUST_BINDING_NOT_OBJECT` | 信頼bindingがobjectでない |
| `TRUST_BINDING_SCHEMA_VERSION_UNSUPPORTED` | binding版が完全一致しない |
| `TRUST_BINDING_UNKNOWN_FIELD` | bindingに未承認項目がある |
| `TRUST_BINDING_VERSION_INVALID` | 台帳版が空または文字列でない |
| `TRUST_BINDING_HASH_INVALID` | index hashが64桁小文字16進でない |
| `TRUST_PRESET_VERSION_MISMATCH` | bindingとpreset indexの版が違う |
| `TRUST_PRESET_HASH_MISMATCH` | bindingとpreset indexのhashが違う |
| `TRUST_MATERIAL_VERSION_MISMATCH` | bindingとmaterial indexの版が違う |
| `TRUST_MATERIAL_HASH_MISMATCH` | bindingとmaterial indexのhashが違う |

### 9.2 指示書・解決パッケージ

| コード | 条件 |
|---|---|
| `INSTRUCTION_SET_NOT_OBJECT` | 指示書がobjectでない |
| `INSTRUCTION_SET_SCHEMA_VERSION_UNSUPPORTED` | 指示書版が不一致 |
| `INSTRUCTION_SET_UNKNOWN_FIELD` | 指示書に未承認項目がある |
| `INSTRUCTION_SET_ID_INVALID` | 指示書IDが不成立 |
| `INSTRUCTION_SET_FORMAT_UNSUPPORTED` | 通常横長以外 |
| `INSTRUCTION_SET_RENDERER_CONTRACT_VERSION_UNSUPPORTED` | 境界契約版が不一致 |
| `INSTRUCTION_SET_SOURCE_PROVENANCE_INVALID` | 元入力由来が不成立 |
| `INSTRUCTION_SET_RESOLUTION_PACKAGE_ID_INVALID` | package IDが不成立 |
| `INSTRUCTION_SET_RESOLUTION_PACKAGE_HASH_INVALID` | package hash形式が不成立 |
| `INSTRUCTION_SET_REGISTRY_VERSION_INVALID` | 指示書の台帳版が不成立 |
| `INSTRUCTION_SET_REGISTRY_VERSION_MISMATCH` | 指示書・binding・indexの版が不一致 |
| `INSTRUCTION_SET_INSTRUCTIONS_NOT_ARRAY` | 指示列が配列でない |
| `RESOLUTION_PACKAGE_NOT_OBJECT` | 解決packageがobjectでない |
| `RESOLUTION_PACKAGE_SCHEMA_VERSION_UNSUPPORTED` | package版が不一致 |
| `RESOLUTION_PACKAGE_UNKNOWN_FIELD` | packageに未承認項目がある |
| `RESOLUTION_PACKAGE_ID_INVALID` | package IDが不成立 |
| `RESOLUTION_PACKAGE_ID_MISMATCH` | 指示書とpackage IDが違う |
| `RESOLUTION_PACKAGE_HASH_MISMATCH` | 指示書hashとpackage実体hashが違う |
| `RESOLUTION_PACKAGE_SOURCE_PROVENANCE_INVALID` | package由来が不成立 |
| `RESOLUTION_PACKAGE_SOURCE_PROVENANCE_MISMATCH` | 指示書とpackageの由来が違う |
| `RESOLUTION_PACKAGE_ATOM_GRANULARITY_UNSUPPORTED` | atom粒度が閉語彙外 |
| `RESOLUTION_PACKAGE_SOURCE_ATOMS_NOT_ARRAY` | source atom列が配列でない |
| `RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_INVALID` | source atom hash形式が不成立 |
| `RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_MISMATCH` | 宣言hashとatom列実体hashが違う |
| `RESOLUTION_PACKAGE_TARGETS_NOT_ARRAY` | 対象列が配列でない |
| `RESOLUTION_PACKAGE_CAPTION_CONTRACTS_NOT_ARRAY` | caption契約列が配列でない |
| `RESOLUTION_PACKAGE_CAPTION_CONTRACT_COUNT_UNSUPPORTED` | caption契約が2件以上ある |
| `RESOLUTION_STRUCTURE_UNKNOWN_FIELD` | atom・対象・caption内部に未承認項目がある |

source atomの意味違反はここへ複製せず、`delegatedChecks.sourceContract`へ既存コードのまま残す。

### 9.3 対象・caption接続・指示

| コード | 条件 |
|---|---|
| `TARGET_ENTRY_INVALID` | 対象entryがobjectでない |
| `TARGET_ENTRY_ID_INVALID` | 対象IDが不成立 |
| `TARGET_ENTRY_DUPLICATE_ID` | 対象IDが重複 |
| `TARGET_ENTRY_TYPE_UNSUPPORTED` | 対象種別が閉語彙外 |
| `TARGET_ENTRY_TYPE_PAYLOAD_INVALID` | 種別固有の必須項目が不足・不正 |
| `TARGET_ENTRY_SOURCE_ATOMS_INVALID` | 元発話列が空、非配列、重複 |
| `TARGET_ENTRY_SOURCE_ATOM_UNKNOWN` | 元発話IDがsourceに無い |
| `TARGET_ENTRY_SOURCE_ORDER_REVERSED` | 対象の元発話順が逆転 |
| `TARGET_WITHOUT_INSTRUCTION` | package内対象が指示から未参照 |
| `CAPTION_CONTRACT_ENTRY_INVALID` | caption契約entryがobjectでない |
| `CAPTION_CONTRACT_ID_INVALID` | caption契約IDが不成立 |
| `CAPTION_CONTRACT_DUPLICATE_ID` | caption契約IDが重複 |
| `CAPTION_CONTRACT_SCHEMA_VERSION_UNSUPPORTED` | 埋め込みcaption版が不一致 |
| `CAPTION_CONTRACT_WITHOUT_TARGET` | caption契約がcaption対象から未参照 |
| `CAPTION_TARGET_CUE_UNKNOWN` | 対象が未知の契約・cueを参照 |
| `CAPTION_TARGET_CUE_AMBIGUOUS` | cue ID重複で対象を一意解決できない |
| `CAPTION_CUE_IN_MULTIPLE_TARGETS` | 同じ契約・cueを複数対象へ登録 |
| `CAPTION_CUE_WITHOUT_INSTRUCTION` | cueに対応する指示が無い |
| `INSTRUCTION_NOT_OBJECT` | 指示がobjectでない |
| `INSTRUCTION_UNKNOWN_FIELD` | 指示・発火点・対象に未承認項目がある |
| `INSTRUCTION_ID_INVALID` | 指示IDが不成立 |
| `INSTRUCTION_DUPLICATE_ID` | 指示IDが重複 |
| `INSTRUCTION_TRIGGER_INVALID` | 発火点が`startAtomId`1項目でない |
| `INSTRUCTION_TRIGGER_UNKNOWN_ATOM` | 発火atomがsourceに無い |
| `INSTRUCTION_KIND_UNSUPPORTED` | 演出種類が閉語彙外 |
| `INSTRUCTION_TARGET_INVALID` | 対象参照objectが不成立 |
| `INSTRUCTION_TARGET_CARDINALITY_INVALID` | 対象参照が1件でない |
| `INSTRUCTION_KIND_TARGET_MISMATCH` | 種類と対象種別が不一致 |
| `INSTRUCTION_TARGET_REFERENCE_UNKNOWN` | 対象参照を解決できない |
| `INSTRUCTION_TRIGGER_OUTSIDE_TARGET` | 発火atomが対象内に無い |
| `INSTRUCTION_PRESET_ID_INVALID` | preset IDが不成立 |
| `INSTRUCTION_MATERIAL_REFS_INVALID` | 素材参照が配列でない |
| `INSTRUCTION_MATERIAL_REF_INVALID` | 素材IDが不成立 |
| `INSTRUCTION_DUPLICATE_MATERIAL_REF` | 同じ指示内で素材ID重複 |
| `INSTRUCTION_CAPTION_TRIGGER_MISMATCH` | caption発火点とcue開始anchorが違う |
| `INSTRUCTION_CAPTION_CUE_REUSED` | 同じcueを複数指示が参照 |

### 9.4 プリセット・素材

| コード | 条件 |
|---|---|
| `PRESET_INDEX_INVALID` | index必須構造が無い |
| `PRESET_INDEX_UNKNOWN_FIELD` | index・entry・policyに未承認項目がある |
| `PRESET_INDEX_VERSION_INVALID` | registry版が不成立 |
| `PRESET_ENTRY_INVALID` | entryがobjectでない |
| `PRESET_ENTRY_ID_INVALID` | preset IDが不成立 |
| `PRESET_ENTRY_DUPLICATE_ID` | preset IDが重複 |
| `PRESET_ENTRY_FORMAT_UNSUPPORTED` | 通常横長以外を宣言 |
| `PRESET_KIND_POLICIES_INVALID` | kind policy列が配列でない |
| `PRESET_KIND_POLICY_INVALID` | policy必須構造・配列型が不成立 |
| `PRESET_KIND_POLICY_DUPLICATE` | 同じkind policyが重複 |
| `PRESET_KIND_UNSUPPORTED` | kindが閉語彙外 |
| `PRESET_END_RESPONSIBILITY_INVALID` | 種類別終了責任が不一致 |
| `PRESET_END_POLICY_FORBIDDEN` | captionに終了方針IDがある |
| `PRESET_END_POLICY_MISSING` | 非captionに終了方針IDが無い |
| `PRESET_MATERIAL_ROLES_INVALID` | 許可・必須役割列が非配列または重複 |
| `PRESET_MATERIAL_ROLE_UNSUPPORTED` | roleが閉語彙外、または未使用policyを含め§7の種類別素材外枠を緩和している |
| `PRESET_REQUIRED_ROLE_NOT_ALLOWED` | 必須roleが許可集合外 |
| `INSTRUCTION_PRESET_UNKNOWN` | 指定presetがindexに無い |
| `INSTRUCTION_PRESET_KIND_UNSUPPORTED` | presetが指示kind非対応 |
| `MATERIAL_INDEX_INVALID` | index必須構造が無い |
| `MATERIAL_INDEX_UNKNOWN_FIELD` | index・entry・subjectに未承認項目がある |
| `MATERIAL_INDEX_VERSION_INVALID` | registry版が不成立 |
| `MATERIAL_ENTRY_INVALID` | entryがobjectでない |
| `MATERIAL_ENTRY_ID_INVALID` | material IDが不成立 |
| `MATERIAL_ENTRY_DUPLICATE_ID` | material IDが重複 |
| `MATERIAL_ROLE_UNSUPPORTED` | roleが閉語彙外 |
| `MATERIAL_COMPATIBLE_SUBJECTS_INVALID` | 対応subject列が非配列・空・重複 |
| `MATERIAL_SUBJECT_TYPE_UNSUPPORTED` | roleとsubject typeが不一致 |
| `INSTRUCTION_MATERIAL_UNKNOWN` | 素材IDがindexに無い |
| `INSTRUCTION_MATERIAL_ROLE_UNSUPPORTED` | kind表またはpreset許可roleに不適合 |
| `INSTRUCTION_MATERIAL_TARGET_MISMATCH` | 素材の意味対象が指示対象と違う |
| `INSTRUCTION_REQUIRED_MATERIAL_MISSING` | presetのAND必須素材が不足 |
| `INSTRUCTION_REFERENCE_MATERIAL_MISSING` | G7の画像OR動画がどちらも無い |

## 10. 決定的な出力契約

外枠issueの形を固定する。

```json
{
  "grammar": "RESOLUTION",
  "code": "INSTRUCTION_TARGET_REFERENCE_UNKNOWN",
  "path": "$.instructionSet.instructions[0].target.targetRefIds[0]",
  "message": "対象参照を解決できません。",
  "relatedIds": ["instruction-001", "target-missing"],
  "details": { "targetType": "speaker" }
}
```

`details`だけ任意。`relatedIds`は重複除去して文字列順、`details`はcanonical化する。messageは固定文言で、入力値を自由文として混ぜない。

外枠issueの`grammar`は次の5値だけを使う。

| `grammar` | 対応するコード |
|---|---|
| `CONTRACT` | §9.1の全コード |
| `INSTRUCTION` | §9.2の`INSTRUCTION_SET_*`と、§9.3の`INSTRUCTION_*`（preset/material接続コードは除く） |
| `RESOLUTION` | §9.2の`RESOLUTION_*`と、§9.3の`TARGET_*`・`CAPTION_*` |
| `PRESET` | §9.4のpreset indexコードと`INSTRUCTION_PRESET_*` |
| `MATERIAL` | §9.4のmaterial indexコードと`INSTRUCTION_MATERIAL_*`・`INSTRUCTION_REQUIRED_MATERIAL_MISSING`・`INSTRUCTION_REFERENCE_MATERIAL_MISSING` |

既存委譲report内の`grammar`（`CONTRACT`、`SOURCE`、`G1`、`G2`、`G3`）は変換しない。

report全体:

```json
{
  "checkerVersion": "presentation-instruction-checker-v001",
  "inputSha256": "bundleと信頼bindingのcanonical hash",
  "overallStatus": "passed_with_declared_limit",
  "contract": { "status": "passed", "violations": [] },
  "checks": {
    "instructionEnvelope": { "status": "passed", "violations": [] },
    "resolutionIntegrity": { "status": "passed", "violations": [] },
    "presetCompatibility": { "status": "passed", "violations": [] },
    "materialCompatibility": { "status": "passed", "violations": [] }
  },
  "delegatedChecks": {
    "sourceContract": {
      "checkerVersion": "presentation-caption-checker-v001",
      "inputSha256": "source-only入力hash",
      "status": "passed",
      "violations": [],
      "observations": []
    },
    "captionContracts": [
      {
        "captionContractRefId": "caption-contract-001",
        "instructionIds": ["instruction-001"],
        "cueIds": ["cue-001"],
        "report": {}
      }
    ]
  },
  "scopeExclusions": [
    "G4_TO_G7_SEMANTIC_CORRECTNESS_NOT_VERIFIED",
    "PRESET_VISUAL_QUALITY_NOT_VERIFIED",
    "POST_RENDER_QC_NOT_VERIFIED",
    "VISUAL_ONLY_TRIGGER_NOT_SUPPORTED"
  ]
}
```

issueの所属は重複させない。

- `contract`: bundleと信頼bindingの最上位契約。
- `instructionEnvelope`: 指示書、指示、閉語彙。
- `resolutionIntegrity`: 解決package、対象、caption接続。
- `presetCompatibility`: preset indexと指示のpreset接続。
- `materialCompatibility`: material indexと指示の素材接続。
- `delegatedChecks.sourceContract`: source-only委譲の`contract`結果だけ。既存の違反・観測配列を変更しない。
- `delegatedChecks.captionContracts[].report`: 既存caption report全体を変更せず保存。

決定性の規律:

- 状態は`passed`、`passed_with_declared_limit`、`failed`だけ。
- いずれかの外枠欄、source契約、caption委譲が`failed`なら全体`failed`。
- 失敗がなく、実caption委譲に`passed_with_declared_limit`があれば全体も同状態。それ以外は`passed`。
- source-only委譲の空caption G1〜G3状態は全体判定に使わない。
- 合成点、重み、係数、百分率を作らない。
- 実行日時、ランダム値、環境依存pathを出さない。
- 入力hashは`canonicalJson({ bundle, trustedRegistryBindings })`のSHA-256。
- object keyは再帰整列。artifact配列順はhashに保持する。ただし指示列を描画優先順位にせず、集合欄は比較時にID順へ正規化する。
- issueは`grammar`, `code`, `path`, `relatedIds`, `details`の順で決定的に整列。
- caption委譲は契約ID順、instruction IDとcue IDは整列。同じ契約は1回だけ。
- JSONは2-space、末尾LF。同じ入力からバイト単位で同じ結果。
- `scopeExclusions`は上記4件を上記順で固定する。これは失点項目でなく、合格が証明しない範囲の明示。

## 11. 実装ファイル案

実装承認後、評価環境内だけに追加する。

- `evals/clip_composition/presentation_instruction_contract.mjs`
  - 版定数と違反コード集合。
  - `validatePresentationInstructionContract(bundle, trustedRegistryBindings)`。
  - `serializePresentationInstructionReport(report)`。
  - 既存`canonicalJson`と`validatePresentationCaptionContract`をimport。
- `evals/clip_composition/validate_presentation_instruction_contract.mjs`
  - `<bundle.json> <trusted-registry-bindings.json> [output.json]`。
- `evals/clip_composition/presentation_instruction_contract.test.mjs`
- `evals/clip_composition/testdata/presentation-instruction-contract-v001/`

既存checkerをutility抽出のために変更しない。caption内部の意味検査と既存違反コードを新ファイルへ複写しない。source-only入力と実caption入力を構成して既存exportへ委譲する。

CLI終了コード:

- 0: `passed`または`passed_with_declared_limit`
- 1: 契約違反で`failed`
- 2: 引数、読取、JSON parse、書込等で検査処理自体を開始・完了できない

## 12. 合成テスト設計

1. 10種類を含む正常bundle。
2. 空の指示列が正常。
3. 指示・material配列順の意味とhash規則。
4. 指示書と解決packageのID・hash・由来・source hash照合。caption契約0件・1件は通し、2件以上を拒否。
5. 信頼bindingと2つのindexの版・hash照合。
6. 未使用preset/material entryを含むindex全体の不正検出。
7. source側のatom ID重複、時刻逆転を既存コードで検出し、正の重なりは既存観測として保持。
8. caption構造未知項目の外枠拒否。
9. caption契約を参照IDごとに1回だけ委譲し、既存reportを変更しない。
10. 既存`passed_with_declared_limit`の伝播。
11. 代表G1違反を既存コードのまま内包して全体失敗。
12. 対象ID重複、未知atom、atom逆順、未参照対象。
13. 同一cueの複数target登録、複数instruction登録、target横断参照、未参照cue・契約。
14. cue ID重複時に先勝ち・後勝ちせず曖昧失敗。
15. 10種類×対象種別の正負組合せ。
16. 発火atom不存在、対象外、caption開始anchor不一致。
17. presetの未使用entryを含む型、重複、終了責任、役割集合、必須部分集合。
18. materialの未使用entryを含む型、重複、roleとsubject type、対象一致。
19. `information-comment`のspeaker iconなし／正しい人物／違う人物。
20. G7の画像のみ、動画のみ、両方、どちらも無しの4ケース。
21. 固定1 presetでも`presetId`省略を拒否。
22. 生ms、座標、色、font size、旧`telopPlan`等の未知項目・旧形式を拒否。
23. 同一入力のreportがバイト一致。
24. object key順だけが違う入力は同hash・同結果。artifact配列順変更は別hash。
25. bundle、binding、指示書、指示、発火点、対象、解決package、atom、caption各階層、preset各階層、material各階層について、全必須欄を1つずつ削除、全任意欄の有無、未知欄1つ追加を表駆動で検査。
26. 未使用preset policyが§7で禁止された素材役割を宣言した場合も拒否。
27. 全外枠違反コードが対応表どおり1つの`grammar`へ属し、5値外が0件。
28. 外枠違反コードexport集合とテストで観測した集合が完全一致。
29. 既存`presentation_caption_contract.test.mjs`を変更せず24/24維持。

新テストは外枠と接続だけを検証する。既存G1〜G3の全意味ケースを新テストへ再掲しない。

## 13. 実装完了条件

- §11の4資産だけを評価環境内に追加し、backend、client、runner、runtimeへ触れない。
- §12の外枠合成テストが全件pass。
- 既存G1〜G3テストが変更なしで24/24 pass。
- 正常、部分検査、契約失敗、CLI処理失敗の終了コードを確認。
- 全外枠違反コードを意図した入力で検出。
- 同一入力のreportがバイト一致。
- 旧形式、未知種類、未知preset、未知素材の推測フォールバックが無い。
- caption違反が既存reportと既存コードのまま残る。
- 実データ、正式台帳、レンダラー、LLMを実走しない。

## 14. 既知の限界と次の承認対象

- v001は発話atom開始に結び付く発火点だけ。映像だけの発火は未対応。
- G4〜G7の意味が正しいかは検査しない。
- presetの可読性、美しさ、単調さは検査しない。
- 重なり、画面外、欠落、音声欠落はレンダラー受入検査。
- 素材実媒体の可読性は素材台帳とレンダラーpreflight。
- 信頼bindingは選択されたindexの同一性を保証するが、そのファイルを人間が承認した事実は呼出元の運用記録を信頼する。
- 既存caption検査器単体は未知項目を拒否しない。新外枠へ埋め込むcaptionだけは構造allowlistで防ぐ。既存単体契約を無断改訂しない。
- v001の解決パッケージはcaption契約を最大1件に制限する。複数計画は既存G1/G3を迂回しない統合委譲方式を設計してから契約改訂する。
- 生成系統は公開manifestで記録し、指示書の`sourceProvenance`へ混ぜない。

本設計が承認された場合は、まず境界契約とレンダラー要求仕様へ解決パッケージの入力・ID/hash照合・生成manifest記録を同一コミットで同期する。その完了後に進める実装は、**スキーマ・検査器コードと合成テストだけ**である。プリセット台帳の具体定義、レンダラー実装、比較媒体、LLM実走、実データ実走は別承認とする。

## 15. 人間作業量

- 本設計作成まで: 必須人間作業0件。
- 次工程へ進むため: 本設計の承認／修正／却下1判断、1セッション、目安3〜5分。媒体視聴、時刻指定、正解生成、時間計測は不要。

## 16. 改訂履歴

- v001 / 2026-07-20: 承認済み境界契約とレンダラー要求仕様から、5項目指示書、指示書がIDとcanonical hashで固定してレンダラーへ渡す解決パッケージ、承認済み台帳binding、既存caption検査への委譲、違反コード、決定的出力、合成テストを実装前に固定した。解決パッケージの搬送は、設計承認後・コード着手前に承認済み2文書へ同期する。コード実装は含まない。
