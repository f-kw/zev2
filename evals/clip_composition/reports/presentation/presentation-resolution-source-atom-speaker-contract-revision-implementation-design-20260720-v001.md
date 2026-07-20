# 解決パッケージ source atom 話者欄 契約改訂・実装前設計 v001

- 作成日: 2026-07-20
- 状態: **2026-07-20に人間が修正版を一括承認。§12の範囲を実装完了**
- 承認済み方針の正本: `presentation-resolution-source-atom-speaker-contract-revision-proposal-20260720-v001.md`
- 人間作業: **承認1件を完了。時間計測なし**
- 実装停止点: 契約v002、生成器、検査器、testdata、版付き文書同期まで。レンダラー本体・LLM・実データ実走へ進まない。

## 1. 本来の目的

目的は、STTが付けた`SPEAKER_00`等の声クラスタを、人物名・人物ID・アイコン選択へ誤用しないことである。GT-05で起きた人物取り違えを、個別データの修正ではなく責務境界で再発防止する。

話者ラベルの種類を増やすことや、機械だけで人物同定することは目的にしない。元発話側は同一入力内の声クラスタ、人物情報は人間または別工程が明示したspeaker target、という分離を守る。

## 2. 承認済み方針

次の3点は2026-07-20にkawafmmが一括承認した。

1. source atomの話者欄を`欄なし | null | 空でない正規文字列`とする。
2. 実測済みの非人物値`unknown`と`youtube-auto-caption`は、解決パッケージ生成時に`null`へ写す。
3. 人物ID・表示名・アイコン適合はspeaker targetだけを正本とし、source atomの話者ラベルから暗黙生成しない。

本設計には相談役レビューで追加承認された次の条件も含める。

- 非人物値一覧は2026-07-20時点の有限な実測一覧であり、網羅保証ではない。
- `null`写像の実装場所、使った版、元入力の来歴保存方法を固定し、検査器内で黙って補正しない。
- 既存73テストの改修対象と不変範囲を実装前に固定する。

## 3. 観測事実と既知限界

11 fixture・35,618発話の再集計では、話者欄は全件文字列だった。観測値は次の5種類である。

| 値 | 件数 | 契約上の扱い |
|---|---:|---|
| `SPEAKER_00` | 4,168 | 同一source内だけの不透明ラベル |
| `SPEAKER_01` | 358 | 同上 |
| `SPEAKER_02` | 29,347 | 同上 |
| `unknown` | 1,725 | 非人物値。生成時に`null`へ写す |
| `youtube-auto-caption` | 20 | 非人物値。生成時に`null`へ写す |

実fixtureに`null`、欄なし、人物表示名は無かった。したがって、それらは「観測済み形式」ではなく、将来入力を曖昧なく受けるための契約上の状態である。

非人物値一覧は網羅的ではない。別STTや別取得経路が`UNKNOWN_SPEAKER`等の新しい記号を出した場合、現行一覧に無ければ不透明な文字列として通過し、同時表示で別クラスタと誤認されうる。v002が保証するのは、登録済み2値を人物として扱わないことと、文字列を人物情報へ昇格させないことまでである。

## 4. 版境界

話者欄の受理条件と同時表示判定の意味が変わるため、既存v001へ追記しない。実装承認後は次を新設する。

| 対象 | v002で固定する版 | 理由 |
|---|---|---|
| caption入力 | `presentation-caption-check-v002` | source atom話者欄の型と4専用違反を追加 |
| caption検査器 | `presentation-caption-checker-v002` | v002入力だけを受理 |
| 解決パッケージ | `presentation-resolution-package-v002` | 正規化版・入力hashを必須化 |
| 演出指示書 | `zev-presentation-instruction-v002` | v002 packageと境界版を参照 |
| 外枠入力 | `presentation-instruction-check-v002` | package v002とcaption v002を固定委譲 |
| 外枠検査器 | `presentation-instruction-checker-v002` | v002だけを受理 |
| レンダラー境界 | `zev-renderer-boundary-v002` | 受領するpackageの意味が変わる |
| 非人物値台帳 | `presentation-source-speaker-non-identity-registry-v001` | 実測済み2値と根拠を不変化 |
| 話者正規化 | `presentation-source-speaker-normalizer-v001` | 完全一致写像の処理版 |
| 生成manifest | `presentation-resolution-package-generation-manifest-v001` | raw入力からpackageまでの来歴 |

プリセット台帳`normal-landscape-preset-registry-v001`、空素材台帳`presentation-material-registry-empty-v001`、両者の信頼bindingは意味が変わらないため改訂しない。

### 4.1 後方互換を作らない

- v002検査器はv001入力を拒否する。
- schemaVersionを見てv001/v002へ振り分ける共通入口を作らない。
- v001をv002へ推測変換しない。
- 既存v001コード、73テスト、承認済みpreview・manifestは当時の結果を再現する履歴資産として保持するが、新レンダラーは参照しない。
- v002は版を名前に含む別入口からだけ呼ぶ。履歴v001の保存は後方互換経路ではない。
- v001実装を共通core化のために書き換えない。v002は独立ファイルへ機械的に複製した既存意味規則を基礎とし、版・話者規則・package来歴だけを変更する。

## 5. 非人物値台帳

新設する台帳は、少なくとも次を持つ。

```json
{
  "schemaVersion": "presentation-source-speaker-non-identity-registry-v001",
  "registryVersion": "presentation-source-speaker-non-identity-registry-v001",
  "matchMode": "exact",
  "evidenceDate": "2026-07-20",
  "evidenceReport": "presentation-resolution-source-atom-speaker-contract-revision-proposal-20260720-v001.md",
  "entries": [
    { "rawValue": "unknown", "normalizedValue": null, "observedCount": 1725 },
    { "rawValue": "youtube-auto-caption", "normalizedValue": null, "observedCount": 20 }
  ]
}
```

規則:

1. 完全一致だけを写す。trim、小文字化、別名推測を行わない。
2. ` unknown `はtrimせず非正規文字列として失敗させる。`UNKNOWN`は未登録の不透明ラベルとして通るため、人物性は保証しない。
3. 台帳v001は書き換えない。新しい非人物値は、値・件数・取得経路の実測根拠を添えた新しい台帳版へ追加する。
4. 台帳版を変えるときは、正規化処理と検査器も対応版へ改訂する。実行時の設定差し替えだけで受理集合を変えない。
5. 台帳のcanonical SHA-256をpackageと生成manifestへ記録する。

## 6. `null`写像の唯一の実装位置

設計時点では、実データから非空の解決パッケージを作る正式生成器は存在せず、preset認定用の空package生成と合成testdataだけだった。このため、`build_presentation_resolution_package_v002.mjs`を新設し、raw source rowをsource atomへ投影する段を写像の唯一の所有者とした。

処理順は次で固定する。

1. raw speaker欄の有無とJSON型を読む。
2. 欄なしは欄なし、raw `null`は`null`のまま保持する。
3. 文字列を台帳へ完全一致照合し、登録済み2値だけを`null`へ写す。
4. その他の空でない正規文字列は1文字も変えず保持する。
5. 空文字、空白だけ、前後空白付き、非文字列はpackageを出さず生成失敗にする。trim、文字列化、`unknown`補填をしない。
6. atom単位の決定ログを作る。
7. 変換後source atomsのcanonical hashを計算し、package全体を固定する。

caption検査器、外枠検査器、レンダラーは写像しない。登録済み非人物値がpackageへ残った場合は不適合として返すだけである。

既存`build_presentation_minimum_sufficiency_review.mjs`には欠落値を`unknown`へ補い文字列をtrimする診断専用処理があるが、承認済み方針と逆なので流用しない。既存preview用の空package生成器も履歴媒体の再現用として残し、新v002生成器の代用にしない。

## 7. package v002と来歴保存

package v002は、従来項目に次の必須objectを加える。

```json
{
  "sourceSpeakerNormalization": {
    "schemaVersion": "presentation-source-speaker-normalization-v001",
    "normalizerVersion": "presentation-source-speaker-normalizer-v001",
    "registryVersion": "presentation-source-speaker-non-identity-registry-v001",
    "registryCanonicalSha256": "64桁の小文字16進SHA-256",
    "rawSourceAtomsCanonicalSha256": "64桁の小文字16進SHA-256"
  }
}
```

- `sourceProvenance`は元STT・元入力選択の識別子として従来どおり保持し、生成器版や正規化版を連結しない。
- `rawSourceAtomsCanonicalSha256`は写像前のsource atoms、既存`sourceAtomsSha256`は写像後のsource atomsを固定する。
- package全体hashが、使用した正規化版・台帳版・台帳hashも固定する。
- 検査器はpackageの自己申告を信じず、対応する台帳版とcanonical hashに一致するか検査する。
- 対応台帳はリポジトリ内の固定版をmoduleから直接読み、実行時引数や環境変数で差し替えない。検査器はpackageの版・hashをこの固定版と照合する。別台帳を受け付ける汎用入口は作らない。
- package単体には写像前atom列が無いため、`rawSourceAtomsCanonicalSha256`は形式だけを検査する。値の一致は、生成器が同時に出すmanifestと生成器テストでraw入力から再計算して保証する。

生成器はpackageと同時に公開manifestを作る。

```json
{
  "schemaVersion": "presentation-resolution-package-generation-manifest-v001",
  "generatorVersion": "presentation-resolution-package-builder-v001",
  "sourceArtifacts": [
    { "sourceRef": "版付きID", "path": "元artifactへの相対参照", "fileSha256": "..." }
  ],
  "sourceProvenance": "元入力由来",
  "speakerNormalization": {
    "normalizerVersion": "presentation-source-speaker-normalizer-v001",
    "registryVersion": "presentation-source-speaker-non-identity-registry-v001",
    "registryCanonicalSha256": "...",
    "mappedRecords": [
      {
        "atomId": "atom ID",
        "sourceRef": "元artifact ID",
        "rawSpeaker": "unknown",
        "normalizedSpeaker": null,
        "ruleId": "exact-non-identity-token-to-null"
      }
    ],
    "passThroughValueCounts": [
      { "value": "SPEAKER_00", "count": 1 }
    ]
  },
  "output": {
    "resolutionPackageId": "package ID",
    "resolutionPackageCanonicalSha256": "...",
    "rawSourceAtomsCanonicalSha256": "...",
    "sourceAtomsCanonicalSha256": "..."
  }
}
```

`mappedRecords`はsource atom順、値別集計は文字列順で決定的に並べ、実行時刻を入れない。raw fixtureは変更しない。manifestはpackage hashを参照する一方向とし、循環hashを作らない。

## 8. caption source grammar v002

話者欄の許容形は次のとおり。

| 入力 | 結果 |
|---|---|
| 欄なし | 適合。話者情報の供給なし |
| `null` | 適合。当該atomの話者未判定 |
| 空でない前後空白なし文字列 | 適合。同一source内だけの不透明ラベル |
| number / boolean / object / array | 不適合 |
| 空文字 / 空白だけ | 不適合 |
| 前後空白付き文字列 | 不適合。暗黙trim禁止 |
| 台帳登録済み非人物値 | 不適合。生成側の`null`写像漏れ |

専用違反はcaption source grammarの所属とし、外枠109コードへ複製しない。

| code | 意味 |
|---|---|
| `SOURCE_ATOM_SPEAKER_TYPE_INVALID` | `null`でも文字列でもない |
| `SOURCE_ATOM_SPEAKER_EMPTY` | 空または空白だけ |
| `SOURCE_ATOM_SPEAKER_NOT_CANONICAL` | 前後空白がある |
| `SOURCE_ATOM_SPEAKER_NON_IDENTITY_TOKEN` | 台帳登録値が写像されず残存 |

同時表示では、欄なし・`null`は既存`SOURCE_SIMULTANEOUS_GROUP_SPEAKER_UNKNOWN`、同じ非nullラベルは既存`SOURCE_SIMULTANEOUS_GROUP_SPEAKERS_NOT_DISTINCT`、異なる非nullラベルは「異なるsource内クラスタ」としてだけ適合させる。

検査報告のscopeへ`SOURCE_ATOM_SPEAKER_IDENTITY_CLASSIFICATION_OUTSIDE_REGISTRY_NOT_VERIFIED`を固定表示する。これは、台帳未登録文字列が人物または本当に別話者かを検査していないことを示し、違反数や合成点には加えない。

## 9. 人物targetとの責務分離

- source atomの話者ラベルとspeaker targetの`speakerId`・`speakerDisplayName`は一致を要求しない。
- 人物の正本は、`sourceAtomIds`を含む明示speaker targetである。
- `information-item.speakerId`は人物情報の別正本ではなく、同じpackage内に明示されたspeaker targetの`speakerId`を参照する外部キーとしてだけ許可する。対応するspeaker targetが無ければ不適合とする。
- source atomラベルだけからspeaker target、人物ID、表示名、speaker icon対応を生成しない。
- 明示targetが無い場合は人物表示を作らず、推測補完もしない。
- この分離は、`SPEAKER_00`を人物名へ誤変換する事故と、GT-05型の人物取り違えを別々に防ぐ。

## 10. 外枠v002の委譲

外枠v002は、source-only検査とcaption契約検査の双方で`presentation-caption-check-v002`を1回ずつ固定委譲する。4専用違反のcode・path・detailsを変えず、nested reportとして伝播する。外枠の既存109違反コード集合へ同名コードを追加しない。

外枠v002は次を明示的に拒否する。

- `presentation-resolution-package-v001`
- package v002内の`presentation-caption-check-v001`
- `zev-renderer-boundary-v001`
- `zev-presentation-instruction-v001`

## 11. 既存73テストへの影響

### 11.1 採る方式

承認済みpreviewとv001検査結果の再現性を守るため、既存v001検査器・testdata・73テストは書き換えない。v002は版名を持つ別入口・別testdata・別テストとして追加する。

| 既存系列 | 件数 | 改修対象 | 不変 |
|---|---:|---:|---:|
| caption v001 | 24 | 0 | 24 |
| instruction外枠 v001 | 27 | 0 | 27 |
| 初期preset候補 | 11 | 0 | 11 |
| preset正式化 | 7 | 0 | 7 |
| GT-03同期 | 4 | 0 | 4 |
| **合計** | **73** | **0** | **73** |

v001を同じ入口で受け続ける互換分岐は作らない。v001は履歴検証、v002は新レンダラー用と、呼び出し口自体を分ける。

### 11.2 v002で追加する10テスト

1. 欄なし・`null`・不透明ラベル・表示名風文字列の構造適合。
2. number・boolean・object・arrayの型違反。
3. 空・空白だけ・前後空白付きの区別と暗黙trim禁止。
4. 登録済み2値の拒否、台帳版/hash照合、未登録値のscope限界。
5. 同時表示における未判定・同一ラベル・異なるラベルと、caption v001拒否。
6. 正式生成器だけが登録済み2値を`null`へ写し、atom単位の来歴を残すこと。
7. 欄なし・通常ラベル・未登録ラベルを変更せず、検査器内で補正しないこと。
8. 外枠のsource-only/full-caption両委譲が4専用違反を無改変伝播すること。
9. source labelと明示speaker targetの独立、および人物情報の暗黙生成禁止。
10. resolution/caption/instruction/boundary各v001をv002入口が拒否すること。

実装完了条件は、既存73/73を維持し、新規10/10を加えた**83/83**合格とする。既存テストの削除、期待値緩和、v001成果物の再生成は行わない。

新規10件だけで話者差分しか検査しない状態にはしない。10件の内部に、caption v001の24意味ケースと外枠v001の27ケース・全109違反コードに相当するv002回帰matrixを含める。v002がG1〜G3、指示接続、preset、素材検査を落としていないことを、v001検査器の呼び出しやschema書換え変換ではなくv002入口そのものへ入力して確認する。

## 12. 実装対象と非対象

設計承認後に実装するもの:

- 版付き非人物値台帳。
- v002専用解決パッケージ生成器と決定的生成manifest。
- caption v002検査器・CLI・testdata。
- 外枠v002検査器・CLI・testdata。
- 境界契約v002とレンダラー要求仕様v002への版付き同期。
- 上記10テスト。

新設する入口名は次で固定する。

- `presentation_caption_contract_v002.mjs`
- `validate_presentation_caption_contract_v002.mjs`
- `presentation_instruction_contract_v002.mjs`
- `validate_presentation_instruction_contract_v002.mjs`
- `presentation_source_speaker_policy_v001.mjs`
- `build_presentation_resolution_package_v002.mjs`
- `testdata/presentation-caption-contract-v002/`
- `testdata/presentation-instruction-contract-v002/`

実装しないもの:

- レンダラー本体。
- G4〜G7生成モデル。
- LLM実走、実データ描画、比較媒体。
- 人物同定、source labelからの人物推測。
- fixture・expected・既存preview・既存resultの変更。

## 13. 実装完了条件と停止点

1. 11 fixture・35,618発話の棚卸し結果が設計値と一致する。
2. 台帳v001の2値とcanonical hashが固定される。
3. 生成器が完全一致写像、非補正、決定的manifestを満たす。
4. v002 checkerが4専用違反とscope限界を出す。
5. 人物targetの独立と暗黙生成禁止を検査する。
6. v002入口が全v001入力を拒否する。
7. 既存73/73、新規10/10、合計83/83が合格する。
8. 凍結済みfixture・expected・承認済みpreview・正式preset/material台帳が無変更である。

実装完了後はコード変更を停止し、完了結果と、正式preset台帳・boundary v002を前提にしたレンダラー実装設計を別成果物として提示する。レンダラー本体の実装は別承認まで開始しない。

## 14. 今回の承認範囲

2026-07-20に一括承認された範囲は、§12の契約v002・生成器・検査器・testdata・版付き文書同期までである。レンダラー、LLM、実データ実走は含まない。

## 15. 実装完了記録

- 完了報告: `presentation-resolution-source-atom-speaker-contract-revision-implementation-completion-20260720-v001.md`
- fixture棚卸しは11件・35,618発話で設計値と一致した。
- 固定台帳、解決パッケージ生成器、caption v002、外枠v002、各CLI、独立testdata、境界契約v002、レンダラー要求仕様v002を追加した。
- 既存73/73、新規10/10、合計83/83に合格した。新規10件の内部でcaption 24/24、外枠27/27、外枠違反114/114のv002回帰を確認した。
- 本設計の停止点どおり、レンダラー本体、G4〜G7生成、LLM、実データ描画には着手していない。
