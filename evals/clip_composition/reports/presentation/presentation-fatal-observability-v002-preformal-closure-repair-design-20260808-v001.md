# fatal観測性v002 正式attempt前・閉包監査 修正設計 v001

- 日付: 2026-08-08
- 状態: 実装正本
- 親設計SHA-256: `945b3337b90fde6969963a4dc051778b3aaf015be90e57193b97bd2d63dc7369`
- 停止報告SHA-256: `f65e364bee7a9acafd9b479e9a31e97dd0a2e6bb7ec411975191dda073760e15`
- 承認: 2026-08-08 kawafmm裁定
- 外部通信: 0回
- 費用: US$0

## 1. 実現性調査

本文より先に、変更対象の現物と既存入口を読み取り専用で照合した。

| 対象 | 開始SHA-256 | 実在する正本 | 調査結果 |
| --- | --- | --- | --- |
| F01 共通target selector | `cf95c2ba8785be681dcecc03dc4ec009d6f02b4161e3c39f7edbf431b92b6115` | `presentation_fatal_observation_v002.mjs:119-190,283-309` | 5境界の固定許可field、検証済みrecord、path・SHA exact一件一致、0／複数時nullが実在する。変更不要 |
| F04 timeline | `b6fd68e92c8de23a867b6645467f475a0742f23d8f32feac30e950408af2f371` | strict JSON decoder、`validatePresentationTimelineCompositionDecisionJobV001`、job内の全許可binding、安定再読 | 固定表のtimeline 8 fieldは、検証済みjobから全て再構成できる。新しいrecord・validatorは不要 |
| F08 意味終端 | `52ea9c4505c515ed998297136c242b2a19e1e02ff0f7ad80e9f0aa7a7db33771` | 検証済みjob・B5/B6 manifest・provider envelopeからの集合構築とexact一件一致 | 横展開する処方が実装済み。境界別の別方式を発明しない |
| F11 意味情報package | `e6b88e7d14d6e1e155f24f5480487913d1deed2cbfca8a9fc1f6f11545329a4a` | strict JSON decoder、`validatePresentationMeaningInformationPackageJobV001`、`validatePresentationTimelineCompositionDecisionV001`、jobとtimeline decisionの実読取byte | 固定表のjob系6 fieldは検証済みjob、sourceMedia系5 fieldはjobが束縛する検証済みtimeline decisionから再構成できる |
| F03 統合検査 | `bf97e971a370fa7343bef18ac08a5fa1dcdca41baef0cf7277586394f6f47719` | 40 ID、各境界のproduction runner／evaluator／writer | ID数を変えず、既存入口だけで不足証明を強化できる見込み。正式runnerへ届かない箇所はproduction coreの直接返値を証拠とし、手製resultは使わない |

現物調査で、固定許可field表の不足、追加schema、新しい対象file計算、新しいdecoder／validatorの必要は見つからなかった。修正は既存18 path中のF03・F04・F11に限定する。直接回帰で既存検査の修正が必要と判明した場合は、同attemptで直さず新たな現物差として停止する。

## 2. 修正目的

目的は、fatalの対象fileを詳しく見せることではない。対象fileを記録する場合に限り、そのpath・SHA・正式field名が、検証済みの入力recordと実読取証拠へ一意に結び付いていることを保証する。

同時に、正式81件が「検査名だけ存在する」状態を避け、正常経路・検査済み拒否・正式出力byte・所有codeまで実際に通った証明にする。

## 3. F04 timelineの限定修正

### 3.1 検証済み集合

既存strict decoderでjob byteを復号し、既存timeline job validatorが合格した場合だけ、次を固定許可field付き集合へ展開する。

- `job`
- `job.implementationBindings[*]`
- `job.approvedContractBindings[*]`
- `job.sourceMedia[*].sourceIdentityBinding`
- `job.sourceMedia[*].mediaBinding`
- `job.sourceMedia[*].retainedSourceAtomsBinding.sourceAtoms`
- `job.sourceMedia[*].retainedSourceAtomsBinding.generationManifest`
- `job.sourceMedia[*].retainedSourceAtomsBinding.validationReport`

公開前再読入口は、`tracked`内の`sourceField`をtarget選択に使わない。各tracked bindingのpath・SHAを検証済み集合へ照合し、exact一件一致した正式field名だけをF01へ渡す。0件、複数件、job未検証では`targetFile: null`とする。

formal runnerは既に読んだjob path・job byteを同入口へ渡す。再読やvalidatorを複製しない。変更検出時の既存rejected、読取不能時のfatal、終了codeは不変とする。

### 3.2 呼出側自己許可の禁止

- 任意の`sourceField`を受理して一件の検証済み集合を作らない。
- 許可field名を知っているだけでは対象fileを作れない。
- 既存jobから同じpath・SHAが複数の正式fieldに現れる場合は、推測で一つを選ばずnullにする。

## 4. F11 意味情報packageの限定修正

### 4.1 検証済み集合

既存strict decoderと既存job validatorでjob byteを検証し、job系の許可fieldを展開する。

- `job`
- `job.implementationBindings[*]`
- `job.approvedContractBindings[*]`
- `job.timelineCompositionDecisionBinding`
- `job.semanticSelectionValidationBinding`
- `job.semanticSelectionBinding`

さらに、jobの`timelineCompositionDecisionBinding`と実読取byteについて、file SHA、schema、canonical SHA、既存timeline decision validatorを照合する。全て成立した場合だけ、次を展開する。

- `timelineDecision.sourceMedia[*].sourceIdentityBinding`
- `timelineDecision.sourceMedia[*].mediaBinding`
- `timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.sourceAtoms`
- `timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.generationManifest`
- `timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.validationReport`

公開前再読入口はF04と同じく、呼出側のfield名を使わずpath・SHA exact一件一致から正式field名を得る。0件、複数件、job未検証、timeline decision未検証では、該当対象をnullにする。

formal runnerは既読のjob byteとtimeline decision byteを同入口へ渡す。既存の読取・復号・canonical計算・validatorだけを用いる。

### 4.2 保持する契約

- 成功package byteを変えない。
- 既存30違反code、rejected、fatal、終了0/1/2を変えない。
- 固定6 sentinelと公開失敗のowner分離を変えない。
- source identity内部の補助媒体は固定許可field表に無いため、従来どおり対象fileを記録しない。

## 5. F03 40 IDの証明修正

ID数40を維持し、次の既存IDの中身だけを強化する。

| ID・群 | 修正後の証明 |
| --- | --- |
| `FOVI003` | Gate Aの既存production core返値を直接確認し、手製のrejected objectを作らない。既存拒否codeがfatal語彙へ入らないことを同時確認 |
| `FOVI007` | renderer QC evaluatorの実返値・実違反を直接確認し、手製reportを作らない |
| `FOVB006` | 旧B1のpassed／rejected／abstainedを実runnerへ通し、writerの正式byte、status、終了code、rejected exact codeを確認 |
| `FOVB009` | 意味終端の実validation経路でpassed／rejectedを作り、正式report byte、status、終了code、rejected exact codeを確認。正式job runnerへ到達可能なfixtureならrunnerを使用し、不可能ならproduction evaluator・builder・writerの各正本を切れ目なく通す理由を証明表へ記載 |
| timeline拒否4枝 | 正式runnerが返した結果を正式writerへ渡し、byte内のstatus・exact code・pathを一件ごとに確認 |
| `FOVF006` | timeline、旧B1、意味終端、意味情報package、outputの実際のrejected結果と終了codeを横断確認し、source中の語だけを証拠にしない |

検査用のproduction分岐、身代わりresult、serializer複製、期待値緩和は作らない。

## 6. 変更pathと上限

| ID | path | 変更 |
| --- | --- | --- |
| F03 | `evals/clip_composition/presentation_fatal_observability_v002.integration.test.mjs` | 40 ID内の実経路・正式byte・exact code証明強化 |
| F04 | `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` | 検証済みjob由来の対象集合と公開前再読接続 |
| F11 | `evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs` | 検証済みjob／timeline decision由来の対象集合と公開前再読接続 |

F01、固定表、他15 implementation/test pathは不変を第一条件とする。18 path上限内の既存testを変更する必要が実測で出ても、正式attempt前の新たな現物差としてその場で停止し、同attemptでは直さない。

## 7. 追加監査6/6の合格条件

修正後、正式検査を起動する前に次を最初から独立再監査する。

1. 全定義・import・exportの実在。
2. 検査済みrejectedとfatalのcatch分離。
3. 全child processの固定stageと生出力非漏洩。
4. 5境界の全targetFileが、固定許可field、検証済みrecord、実読取path・SHA exact一件一致へ接続する。呼出側自己許可0件。
5. 保存先不正と公開開始後のI/O・競合失敗の別owner。
6. 正常経路と既存rejected経路がproduction入口・正式出力byte・exact codeまで実行される。

6/6でない場合は正式81件を起動しない。

## 8. 正式実行順

1. F03・F04・F11の構文、差分、path上限を静的確認する。
2. 追加監査6/6を版付き報告へ固定する。
3. F02 41件＋F03 40件を新attemptとして一度だけ実行し、TAP全IDとstderrを保存する。
4. 81/81の場合だけ直接影響130/130を実行する。
5. 合格時だけgreen 287/287を実行する。
6. 合格時だけbaseline 64/181 exact集計不変を確認する。
7. 合格時だけ正式5 treeを最終照合する。
8. 合格した変更をcommit Aへ固定し、commit treeから18 path SHA表を作る。
9. 完了報告を提示して停止する。

正式commandは固定Node・固定TSX loader・`NODE_OPTIONS`不存在で直列実行する。同一監視領域へ書く別作業を並行させない。

## 9. 停止条件

- 新たな現物差。
- 追加監査6項目の不合格。
- 正式検査または回帰の不合格1件。
- 19 path目。
- F01固定表、schema、status、既存違反code、終了codeの改訂が必要。
- 新しい対象file計算、decoder、validator、serializer、production分岐が必要。
- 正式成果物または既存5 treeの差。
- 契約解釈が必要。

いずれか一つで同attempt内に直さず停止する。

## 10. 完全性チェック

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| 本来の目的 | 合格 | fatal診断往復を減らす対象fileの安全な記録と、証明検査の閉包だけに限定 |
| 現物照合 | 合格 | F01/F03/F04/F08/F11の入口・validator・固定field・call siteをSHA・行位置で確認 |
| 値レベル閉包 | 合格 | path・SHA exact一件一致、0／複数／未検証時nullを固定 |
| 参照実体 | 合格 | 使用するdecoder、job validator、timeline validator、writerは全て現存 |
| 検査可能性 | 合格 | 40 ID内で正常・rejected・正式byte・exact codeを観測する入口が存在 |
| 工程間受け渡し | 合格 | jobとtimeline decisionの正式binding・実byteから検証済み集合を再構成 |
| 観測データ取得可能性 | 合格 | 生message等を保存せず、既存閉語彙・path・SHAだけで観測可能 |
| 数値区分 | 非該当 | 数値契約を変更しない |
| 件数閉包 | 合格 | F02 41＋F03 40＝81を維持 |
| byte閉包 | 合格 | 成功成果物byte不変、検査は既存正式writerを使用 |
| path上限 | 合格 | 既存18 path中3 pathだけを変更予定 |

