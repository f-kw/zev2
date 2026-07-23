# candidate 13 基本テロップ ゲートB1契約 既存実装慣行の事実棚卸し v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`の方向判断待ち
- 状態: **既存実装の再利用可能範囲を調べただけ。B1契約未確定・未実装・未実走**
- 書き込み範囲: 本レポート1件だけ。共有文書、承認済み設計、コード、正式成果物は変更していない
- 人間作業: 0件。副線から新しい確認依頼は出さない

## 1. 目的

ゲートB1の実装契約を起草する段階で、次の三つを白紙から作り直したり、逆に用途の違う既存処理をそのまま流用したりしないため、実在する先例を処理の意味ごとに分類する。

1. 検査済み成果物一式を、途中状態を見せずに一括公開する処理。
2. モデルへ見せる情報を元配信由来だけへ制限し、正解由来情報の混入を止める処理。
3. モデル出力の形・参照・順序を厳密に検査し、本番と試験で同じ検査処理を使う構造。

本レポートは、既存処理を次の三分類で記録する。

- **限定直接再利用**: 現在exportされ、処理の責務が一致する範囲では同じ関数を呼べる。ただしB1で採用するかは未決定。
- **実装慣行のみ再利用**: 安全策や検査順は先例になるが、対象schemaや公開先が違うためコードを直接使わない。
- **不足**: B1用にはまだ存在せず、方向承認後の実装契約で固定が必要。

## 2. 結論

| 対象 | 限定直接再利用 | 実装慣行のみ再利用 | B1で不足しているもの |
|---|---|---|---|
| 原子的な一括公開 | renderer v002の出力先予約と、検査済みdirectoryの一括renameは技術的に呼出可能 | 残存文字生成のlock・作業場所・公開直前再検査・入力再hash・失敗残留 | B1成果物の許可file集合、相互hash検査、公開後の再読込検品 |
| source-only入力 | 完成済みのB1用検査器は0件 | モデル可視領域と評価情報の分離、許可fieldへの投影、上流正本との値一致、禁止情報の補助走査 | B1入力の完全一致schema、来歴検査、prompt全体の漏洩検査、固定違反体系 |
| 意味出力の厳密検査 | ゲートA証拠の生成・純粋検査はゲートA証拠に限り再利用可能。報告検証は元job・snapshot・環境等の完全な外部文脈を再構成できる場合だけ呼べる | 固定違反順、未知field拒否、参照整合、決定的整列、同じ検査器を本番と試験で使用、CLI 0/1/2 | B1意味出力専用schema、違反種類、復元検査、検査報告validator、runner/CLI |

重要な境界は次のとおりである。

- ゲートAの境界証拠をもう一度同じ規則で作って検査する処理は存在する。
- B1用の正式package、モデル可視入力、漏洩検査、意味出力検査は存在しない。
- したがって、既存runner全体をB1へ接続しただけで契約が完成したとは扱えない。
- 本棚卸しは、未承認の方向設計やB1のfield・違反種類・成果物構成を確定しない。

## 3. 原子的な一括公開の先例

### 3.1 renderer v002の公開用低層処理

対象:

- `evals/clip_composition/render_presentation_v002.mjs`
- `acquirePresentationOutputReservationV002`
- `commitValidatedPresentationArtifactsV002`

処理の意味:

- 許可された出力root内だけで、既存最終出力がないことを確認する。
- 所有者情報を持つlockを原子的に確保する。
- 出力親の実体を予約時に束縛する。
- commit時点で、作業directoryと公開待ちdirectoryがsymlinkではなく、予約済み親の直下関係にあることを検査する。
- 最終出力不存在とlock所有権を公開直前に再確認する。
- 検査済みの公開待ちdirectoryを、同一親内のdirectory rename 1回で最終位置へ移す。

この二つは、公開内容のschemaを決めずに「場所の予約」と「検査済みdirectoryのcommit」を担当するため、**技術的には限定直接再利用可能**である。ただし関数名、違反種類、許可rootはrenderer由来である。B1がこれを正式採用するか、新しいB1版を持つかは設計判断であり、本棚卸しでは決めない。

直接使えないもの:

- `publishPresentationArtifactsV002`は、描画動画、overlay、描画計画、適用結果、manifest、QCというrenderer固有成果物を要求する。
- B1のpackageを検品する上位入口ではない。
- 本番経路はrename後の最終directoryを再読込して検品し直さない。

### 3.2 残存source atom生成の公開手順

対象:

- `evals/clip_composition/run_presentation_retained_source_atoms_job_v001.mjs`
- `evals/clip_composition/presentation_retained_source_atoms_v001.mjs`

処理の意味:

1. `.lock`を排他的に作り、所有情報を同期保存する。
2. 同一親に作業場所と公開待ち場所を作る。
3. 許可された3成果物だけを新規fileとして書く。
4. 公開待ち成果物のschema、直列化byte、相互hash、許可file集合を検査する。
5. job、実装、直接入力、展開入力、媒体を公開直前に再hashする。
6. final不存在、lock所有、親・作業・公開待ち場所の実体を再確認する。
7. 外部hookの前後でも検査を繰り返し、その後に一括renameする。
8. 失敗時は調査用のlock・作業場所・公開待ち場所を自動削除しない。

実装慣行として強い点:

- 「書けた」ではなく、「許可された一式が対応した状態でだけ見える」を公開条件にしている。
- 入力差し替え、異物file追加、成果物byte改変、親symlink差し替え、途中final出現を公開前に止める。
- 成果物の意味上のhashと、保存した実byteのhashを混同しない。

直接再利用の限界:

- 出力予約、公開直前検査、公開待ち検査はrunner内のprivate処理である。
- runner全体は残存文字専用のjob、3成果物、出力先、違反種類へ固定されている。
- `validatePresentationRetainedSourceAtomsPublishedArtifactsV001`はexport済みだが、残存文字3成果物だけを再検品する関数であり、B1 package一般の検査器ではない。
- canonical JSON化、canonical SHA-256、実byte SHA-256、正式JSON直列化のexport済み補助処理は汎用的に呼べる。ただしB1の正式直列化として採用するかは、schemaとfield構築順を含めて別途固定が必要である。

### 3.3 基礎映像とtimelineの公開手順

対象:

- `evals/clip_composition/presentation_base_media_build_v001.mjs`

確認できた慣行:

- 排他的lock、同一親の公開待ちdirectory、事前検品、一括rename、失敗残留を用いる。
- 媒体、timeline、manifest、検査報告の相互hashを公開前に確認する。

B1へ直接使えない理由:

- 出力先と成果物が基礎映像専用である。
- export済みcommit関数だけでは、B1成果物の内容検査もlock所有確認も完結しない。
- `presentation_base_media_timeline_v002.mjs`の時刻写像は後段の正式表示時刻に使う処理で、B1の意味入力packageを公開する処理ではない。

### 3.4 原子的公開について残る空白

B1用にまだ存在しないものは次である。

- B1成果物の許可file集合と各fileの完全一致schema。
- 公開待ち一式のbyte、canonical hash、実byte hash、相互参照を検査する入口。
- その検査を通った公開待ちdirectoryだけをcommit処理へ渡す接続。
- 公開後の最終directoryをbyteから再読込し、許可file、直列化、hash、相互参照を再検品する入口。
- これらの違反種類、固定順、CLI終了規約。

## 4. source-only入力と漏洩検査の先例

### 4.1 正本原則

`DECISIONS.md`では、モデル入力は元配信単体から計算可能な情報だけとし、切り抜き、expected、照合結果、固定逆算テーマ、人間確認メモを採点専用へ分離する原則が固定されている。

既存実装には、この原則を部分的に守る複数の方法がある。しかし、B1へそのまま接続できる完成済みの許可field検査・漏洩検査は**0件**である。

### 4.2 composition入力

対象:

- `evals/clip_composition/build_prompt_payload.ts`
- `evals/clip_composition/inspect_prompt_payload_leakage.ts`

確認できた慣行:

- モデル可視領域と採点専用領域を別のtop-levelへ分ける。
- prompt本文はモデル可視領域だけから組み立てる。
- モデル可視領域を再帰走査し、正解・切り抜き・照合・確認に関する禁止keyを探す。
- 正解理由等の本文一致と、expected境界値の数値一致も補助的に調べる。
- transcriptに自然に存在する境界数値と、他の場所に混入した数値を区別して記録する。

直接使えない理由:

- expectedそのものを読み込んで比較するcomposition専用検査である。
- 検査関数がexportされていない。
- 未知fieldを全拒否する検査ではない。
- 実行時刻付き成果物を書き、漏洩不合格をCLI終了1へ固定していない。
- compositionの固定テーマを含み、B1のsource-only入力schemaとは異なる。

### 4.3 theme生成とcallback入力

確認できた慣行:

- 元配信メタ情報、選定planで絞られたSTT発話、各windowの範囲、出力契約をモデル可視領域へ置き、expected等を分離する。選定planのpathと選定range自体は外側metadataに置く。
- STT完了状態、選定planの種類・元動画・範囲を入力生成前に確認する。
- 禁止key、既知正解文言、人間三択文言を再帰走査する。
- 自然発話本文に同じ語が現れた場合と、metadataへ混入した場合を分ける。
- 入力生成時の検査に加え、実走側でも漏洩合格状態を要求する系統がある。

直接使えない理由:

- 各検査はthemeまたはcallback固有のfieldと禁止語へ固定されている。
- 初期theme入力生成器はモデル可視部分を分離していても、どの元配信・STTを読むかの発見にexpectedを使うため、生成器全体の来歴をB1のsource-only処理として流用できない。
- 多くは関数非公開で、未知fieldを全拒否しない。
- source動画IDとtarget動画IDが同じ場合の文字列衝突など、task固有の例外処理を持つ。
- 一部の入力生成器は漏洩不合格を記録しても、その場では終了1にしない。下流wrapperで初めて止める系統もある。

### 4.4 candidate-rankingの許可field投影

対象:

- `evals/clip_composition/prepare_candidate_ranking_title_reason_run1.mjs`
- `evals/clip_composition/prepare_first_gate_unseen_candidate_ranking_v002.mjs`

既存で最もB1に近い慣行:

1. 入力rootを候補配列だけへ制限する。
2. 各候補をID、title、reasonの三項目だけへ制限する。
3. 各値と順序が、元のtheme成果物と一致することを確認する。
4. 時刻、本文、source ID、根拠範囲、expected、hit、機械信号、人間ラベル等の禁止情報を補助走査する。
5. 合格後にだけpromptを作る。

これは、**元成果物を丸ごと渡さず、新しい許可fieldだけの投影を作り、その値を上流正本へ戻して照合する**先例である。

直接使えない理由:

- 検査はscript内のprivate処理である。
- candidate-ranking固有の三項目へ固定されている。
- 出力の正式な原子的公開や、固定違反体系は持たない。
- prompt template自身の漏洩は検査しない。

### 4.5 presentation契約の未知field拒否

対象:

- `evals/clip_composition/presentation_instruction_contract_v002.mjs`
- `evals/clip_composition/presentation_base_media_build_v001.mjs`

確認できた慣行:

- top-levelだけでなく、内側の配列要素や参照objectでも許可field集合を固定する。
- 必須fieldの欠落と未知fieldの追加を別々に拒否する。
- 上流成果物と下流成果物の値・参照関係を検査する。
- 上流成果物へ下流成果物の参照が混入する逆向き依存を、再帰的に拒否する系統がある。下流から上流への正規の一方向参照は許可した上で検査する。

これらはB1モデル入力の漏洩を直接検査するものではないが、denylistだけに頼らず、**許可した形以外を全部拒否する**実装慣行として参照できる。

### 4.6 source-only検査について残る空白

B1用の完全一致allowlist、来歴検査、最終prompt検査、停止契約はまだ存在しない。未承認のゲートB方向設計を採用する場合、具体的には次が不足する。

- モデル可視root、container、境界候補の許可fieldを全階層で固定するschema検査。
- 投影された本文・ID・所属・表示幅等を、元の正式成果物と照合する来歴検査。
- fixture、expected、切り抜き、照合結果、人間ラベル、過去表示計画、時刻等の禁止情報検査。
- denylistだけでなく未知fieldを拒否し、値の由来まで確認する検査。
- JSONのモデル可視領域だけでなく、templateと結合した最終prompt全体の検査。
- 入力生成と実走の双方で同じ合格記録を要求する停止契約。
- 固定された検査名、違反種類、順序、決定的レポート、CLI終了規約。

## 5. 意味出力の厳密検査の先例

### 5.1 ゲートAの境界証拠検査

対象:

- `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs`
- `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs`

限定直接再利用できる処理:

- `buildPresentationSegmenterBoundaryEvidenceV001`: 固定入力から同じ機械境界証拠を作る。
- `checkPresentationSegmenterBoundaryPreflightV001`: 同じ10検査・35違反種類で境界証拠を検査する。

条件付きで呼べる処理:

- `validatePresentationSegmenterBoundaryPreflightReportV001`は、検査報告単体のvalidatorではない。元のjob、各snapshot、実行環境、二重生成結果、読み取り専用監視、期待終了コードまで含む外部文脈を再構成できる場合に限り、元のゲートA形レポートを自己検証できる。
- ゲートA形の検査報告を組み立てる処理自体はexportされていない。したがって、B1がこのvalidatorを呼べる状態は既存資産だけでは完成していない。

強い実装慣行:

- 検査名と違反種類を閉じた集合・固定順でexportする。
- 未登録の違反種類と重複を拒否する。
- 違反を固定された種類順、その後にpath順で並べる。
- 必須field欠落と未知field追加の両方を拒否する。
- 同じ入力から二度作り、意味上のhashだけでなくbyte列一致まで確認する。
- 本番runnerが、合成試験と同じexport済み純粋検査関数を呼ぶ。
- 検査報告自身もfield、検査順、違反順、状態整合を検証する。
- CLIは、合格0、契約不成立1、使い方・内部異常2を分離する。

B1へ直接使えない範囲:

- これらが検査できるのは、ゲートAの境界証拠と元のゲートA形レポートである。
- B1の意味分割出力の形、選択した行末、棄権状態、決定的復元は検査しない。
- 既存ゲートA正式runner全体は読み取り専用preflight専用で、正式package公開を合格条件に含められない。

### 5.2 指示書契約v002

対象:

- `evals/clip_composition/presentation_instruction_contract_v002.mjs`
- `evals/clip_composition/validate_presentation_instruction_contract_v002.mjs`

参照できる慣行:

- 閉じた違反種類一覧を固定順でexportする。
- nested objectごとに必須fieldと未知fieldを検査する。
- 参照IDの実在、一意性、順序、対象との対応、hash graphを検査する。
- 全違反種類を検査区分へ一意に対応付け、未対応を拒否する。
- 下位契約の規則を複製せず、既存checkerへ委譲する。
- CLIが同じ公開checkerを使い、終了0/1/2を分ける。

直接使えない理由:

- v002の指示書、解決package、renderer境界へ固定されたschemaである。
- B1意味出力を受け取る入口ではない。
- v002へ互換分岐を足してB1を通すことは、後方互換禁止と版付き契約の原則に反する。

### 5.3 caption契約v002

対象:

- `evals/clip_composition/presentation_caption_contract_v002.mjs`
- `evals/clip_composition/validate_presentation_caption_contract_v002.mjs`

参照できる慣行:

- 元文字の欠落、重複、逆順、範囲外参照を検査する。
- cue本文が元文字の厳密な連結であることを確認する。
- anchor、時刻、cue順、正時間重なりを検査する。境界接触は正時間重なりに含めない。
- 検査していない文字粒度の自然さは、`passed_with_declared_limit`として明示する。
- CLIは同じ公開checkerを呼ぶ。

限界:

- B1意味出力の未知fieldを全拒否する検査ではない。
- 公開している違反種類はcaption v002の話者関連へ限定され、B1の完全な違反体系にはならない。
- 日本語として自然な行末や、モデル選択の意味品質を検査しない。

### 5.4 ranking出力の形検査

既存ranking採点器には、次の局所的な厳密検査がある。

- 出力項目の許可key集合。
- 入力に実在する候補IDだけの使用。
- 順位の連続性。
- 候補ID重複の拒否。

これは、モデルが返した参照IDを元入力へ戻して検査する先例になる。ただしtask固有のprivate処理で、固定違反体系、決定的レポート、本番と試験の共通入口を備えたB1検査器ではない。

### 5.5 意味出力検査について残る空白

B1用の意味出力schema、違反体系、検査報告validator、runner/CLIはまだ存在しない。未承認のゲートB方向設計にある意味出力の形を採用する場合、具体的には次が不足する。

- B1意味出力の完全一致schema。
- 正常完了と棄権の形、container、意味グループ、行末参照の契約。
- 未知field、時刻、自由本文、理由、score、自由ID等を拒否する規則。
- 行末参照の実在・順序・一意性と、container末尾到達の検査。
- 選択された行末から元文字を決定的に復元し、欠落・重複・逆順・container越えがないことを確認する処理。
- B1専用の固定違反種類、固定順、検査名、対応表。
- B1検査報告自身を再検証する公開関数。
- 本番と合成試験が同じ公開checkerを使うことを確認する検査。
- 同一入力の二重生成・byte一致による決定性証明。
- B1 runnerとCLIの成功0、契約不成立1、使い方・内部異常2。

## 6. 今回行っていないこと

- ゲートB方向設計の承認・変更。
- B1のschema、field、違反種類、成果物構成、公開先の決定。
- rendererの公開低層処理をB1で採用する決定。
- コード、testdata、runner、prompt、漏洩検査、意味出力検査の作成。
- 正式package、Gemini入力、Gemini出力、v003対、動画の生成。
- Geminiまたは他LLMの実走。
- `DECISIONS.md`、`docs/HANDOVER.md`、承認済み設計文書、既存正式成果物の変更。
- 人間への追加確認依頼。

## 7. 人間作業

- 本棚卸し: **0件。媒体視聴なし、時刻入力なし、時間計測なし。**
- 主線で既に必要な判断: ゲートB方向設計の承認1件。
- 本副線から追加する判断: **0件。**
