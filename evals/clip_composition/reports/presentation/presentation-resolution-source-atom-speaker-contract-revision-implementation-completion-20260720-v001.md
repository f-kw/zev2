# 解決パッケージ source atom 話者欄 v002 実装完了報告

- 完了日: 2026-07-20
- 状態: **承認済み実装範囲を完了。レンダラー本体・LLM・実データ実走は未着手**
- 人間作業: **0件。時間計測なし**
- 承認根拠: `presentation-resolution-source-atom-speaker-contract-revision-implementation-design-20260720-v001.md`

## 1. 達成したこと

STTの`SPEAKER_00`等を人物名・人物ID・アイコン選択へ誤用しないため、元発話の声クラスタと明示人物targetを契約上分離した。

- source atomの話者欄を、欄なし、`null`、空でない前後空白なし文字列へ固定した。
- 実測済み非人物値`unknown`と`youtube-auto-caption`だけを、正式解決パッケージ生成器が完全一致で`null`へ写す。
- caption検査器、外枠検査器、レンダラーは写像しない。変換漏れは4種類の専用違反として拒否する。
- 台帳外文字列は同一source内だけの不透明ラベルとして保持し、人物性を保証しないことを未検査範囲へ固定表示する。
- 人物ID・表示名・アイコン対象は明示speaker targetを正本とした。`information-item.speakerId`は同じpackage内の明示speaker targetを参照する場合だけ有効である。

## 2. 実装した資産

### 固定台帳と正規化

- `presentation-source-speaker-non-identity-registry-v001/registry.json`
- `presentation_source_speaker_policy_v001.mjs`
- 台帳canonical SHA-256: `093fa63d1314fdd9d432c348d470522e81eda6fd1cd97973a3b36a510dc1ff02`

台帳は完全一致の2値だけを持ち、実行時差し替えを受け付けない。新しい非人物値は現版へ追記せず、実測根拠付きの新しい台帳版を必要とする。

### package生成

- `build_presentation_resolution_package_v002.mjs`
- 入力: ID・本文・時刻・source由来を明示済みのraw source atom列、明示targets、明示caption contracts、source artifact参照。
- 出力: `presentation-resolution-package-v002`と`presentation-resolution-package-generation-manifest-v001`。

生成manifestは、元artifactの参照・hash、atom単位の写像前値、写像結果、規則ID、台帳版・hash、写像前後atom列hash、package hashを決定的順序で保存する。fixture形式からatom IDや人物targetを推測するadapterは作っていない。

### 検査入口

- `presentation_caption_contract_v002.mjs`
- `validate_presentation_caption_contract_v002.mjs`
- `presentation_instruction_contract_v002.mjs`
- `validate_presentation_instruction_contract_v002.mjs`

v002はv001を受理・変換するdispatcherを持たない。v001の契約、検査器、testdata、承認済み成果物は履歴資産として無変更で残した。

### 版付き文書

- `presentation-instruction-renderer-boundary-contract-20260720-v002.md`
- `presentation-renderer-initial-requirements-20260720-v002.md`

正式プリセット`normal-landscape-preset-registry-v001`と正式空素材台帳を維持し、指示書・解決パッケージ・外枠・レンダラー境界だけをv002へ同期した。

## 3. 実測確認

### fixture棚卸し

11 fixture・35,618発話を再集計し、設計値と一致した。

| 値 | 件数 |
|---|---:|
| `SPEAKER_00` | 4,168 |
| `SPEAKER_01` | 358 |
| `SPEAKER_02` | 29,347 |
| `unknown` | 1,725 |
| `youtube-auto-caption` | 20 |

### 検査結果

- 既存presentation系列: **73/73合格**。
- 新規v002系列: **10/10合格**。
- 合計: **83/83合格**。
- v002内のcaption既存意味回帰: **24/24合格**。
- v002内の外枠既存意味回帰: **27/27合格**。
- v002外枠の全違反コード: **114/114を意図入力で発火確認**。
- caption/外枠CLI: 合格0、契約失敗1、処理失敗2、出力report一致を確認。
- 同一入力の検査・package・manifestは決定的に一致。

## 4. 変更していないもの

- 凍結済みfixture、expected、confirmedペア。
- 既存v001 caption/外枠コードとtestdata。
- 承認済みpreview、正式preset/material台帳、信頼binding。
- backend、client、scripts、runtime、runner。

## 5. 既知限界

1. 非人物値台帳は2026-07-20時点の実測2値だけで、網羅保証はない。未登録文字列の人物性・別話者性は検査しない。
2. package単体には写像前atom列が無いため、写像前hashの値一致は生成器と生成manifestのテストで保証する。外枠検査器は形式と固定版・台帳hashを照合する。
3. raw hashが証明する境界は正式生成器が受け取ったraw atom列から後であり、STT以前の処理まで無加工とは主張しない。元artifact参照・file hashを併記する。
4. 実fixtureからbuild requestを作るadapter、人物同定、レンダラー本体、G4〜G7生成、実データ描画は今回の範囲外である。

## 6. 次工程

次は、正式preset/material台帳とv002境界契約を入力として、レンダラー実装設計を提示する。設計提示までは進めるが、レンダラーコード、LLM、実データ実走は別承認まで開始しない。
