# fatal観測性v002 早期fatal対象file閉包 修正設計 v001

- 日付: 2026-08-08
- 状態: 実装正本
- 親停止報告SHA-256: `1af2da62282f6eccd934262d4a0718984b0cfe4d88d0fe9aab28fcf6a78bff77`
- 承認: 2026-08-08 kawafmm裁定
- 外部通信: 0回
- 費用: US$0

## 1. 実現性調査

本文より先に、F01・F03・F04・F08・F11の全target選択wrapperとcallsiteを読み取り専用で照合した。

| 対象 | 現物 | 結果 |
| --- | --- | --- |
| F01固定許可表・共通selector | `presentation_fatal_observation_v002.mjs:119-190,283-309`、SHA `cf95c2ba8785be681dcecc03dc4ec009d6f02b4161e3c39f7edbf431b92b6115` | 検証済みrecord、許可field、path・SHA exact一件一致を要求する正本が実在。変更不要 |
| F04公開前再読 | `presentation_timeline_composition_decision_v001.mjs:855-910` | 検証済みjob由来の集合へ接続済み |
| F04通常早期fatal | 同file `101-113,925-992,1111` | private helperがcaller値から検証済み集合を自作。修正対象 |
| F11公開前再読 | `run_presentation_meaning_information_package_job_v001.mjs:681-743` | 検証済みjob・timeline由来の集合へ接続済み |
| F11通常早期fatal | 同file `153-165,769-858,960-1126` | private helperがcaller値から検証済み集合を自作。修正対象 |
| F03実枝証明 | `presentation_fatal_observability_v002.integration.test.mjs`、SHA `b9d1c12aea0ee69040d32050335433eb59443d68edfe536992858b4e13f9dea5` | FOVI008がF04・F11の通常媒体早期fatalを実runnerで通す。FOVB002／003は公開前再読の未検証・正常・変更経路、F01検査は一意一致・未検証・許可外を担う。40 IDの追加変更は不要 |

全callsiteのbindingは、F04では検証済みjob、F11では検証済みjobまたは検証済みtimeline decisionから導出できる。新しいschema、decoder、validator、対象file計算、固定許可fieldは不要である。

## 2. 目的

公開前再読だけでなく、通常早期fatalを含む全経路で、対象fileを検証済みrecordと実読取証拠からだけ導出する。呼出側がfield名を知っているだけでは対象fileを作れない状態へ一本化する。

## 3. F04 timeline

1. 既存job decoder・validator合格直後に、既存`buildTimelineVerifiedTargetSources`を一度だけ呼ぶ。
2. private target helperから`sourceField`引数と一件集合の自作を除く。
3. helperは`binding`と検証済み集合を受け、path・SHA exact一件一致から正式field名を得る。
4. exact一件の場合だけF01共通selectorへ渡し、0件・複数件ではnullを返す。
5. 実装・契約binding読取、source identity、媒体、残存発話の全早期fatalへ同じ集合を明示的に渡す。
6. 公開前再読入口も同じ集合構築処理を使い続ける。

既存のrejected優先、fatal stage、status、違反code、終了code、成功成果物byteは変えない。

## 4. F11 意味情報package

1. 既存job decoder・validator合格直後にjob由来の検証済み集合を一度だけ作る。
2. 実装・契約bindingとtimeline decision自身の読取失敗は、このjob集合だけを使う。
3. timeline decisionのfile SHA・schema・canonical SHA・既存validator合格後に、既存`buildMeaningVerifiedTargetSources`でjob＋timeline集合を一度だけ作る。
4. source identity、媒体、残存発話、意味検証、意味選択の早期fatalへ同じ集合を明示的に渡す。
5. private target helperから`sourceField`引数、`sourceRecordVerified=true`既定値、一件集合の自作を除く。
6. helperはpath・SHA exact一件一致から正式field名を得る。0件・複数件・許可外はnullにする。

`semanticValidation.sourcePackageBinding`はF01固定許可表外なので、従来どおり対象fileはnullである。許可表を広げない。

## 5. 変更path

| ID | path | 変更 |
| --- | --- | --- |
| F04 | `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` | 通常早期fatalへ検証済みjob集合を接続 |
| F11 | `evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs` | 通常早期fatalへ検証済みjob／timeline集合を接続 |

F03・F01を含む他16 implementation/test pathは変更しない。既存18 path上限内で閉じる。

## 6. 追加監査6項目

実装後、正式testの前に次を最初から確認する。

1. 全定義・import・exportの実在。
2. rejectedとfatalのcatch分離。
3. child processの固定stageと生出力非漏洩。
4. 全5境界・全targetFile経路が、固定許可field、検証済みrecord、実読取path・SHA exact一件一致へ接続し、呼出側自己認定が0件。
5. 保存先不正と公開開始後のI/O・競合失敗の別owner。
6. 正常経路と既存rejected経路がproduction入口・正式byte・exact codeまで接続する。

6/6でなければ正式81件を起動しない。

## 7. 正式実行

追加監査6/6の場合だけ、承認済み固定Node・固定TSX loader・`NODE_OPTIONS`不存在・concurrency 1で次を直列実行する。

1. F02 41件＋F03 40件を一commandで実行し、TAP全文とstderrを未使用attempt rootへno-replace保存する。
2. 81/81の場合だけ直接影響130/130。
3. 合格時だけgreen 287/287。
4. 合格時だけbaseline `tests 181 / pass 64 / fail 117 / cancelled 0 / skipped 0 / todo 0` exact不変。
5. 合格時だけF03全40件を再実行し、内包するFOVT001〜005を最終再照合する。
6. 合格byteをcommit Aへ固定し、commit treeから18 path SHA表を作る。

## 8. 停止条件

- 新たな現物差。
- 追加監査または正式検査の不合格1件。
- 19 path目。
- 固定許可表、schema、status、既存違反code、終了codeの改訂が必要。
- 新しい対象file計算、decoder、validator、serializerが必要。
- 正式成果物または既存5 treeに差が出る。
- 契約解釈が必要。

いずれか一つで同attempt内に直さず停止する。

## 9. 完全性チェック

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| 本来の目的 | 合格 | fatal診断の対象fileを安全に残す構造改善だけに限定 |
| 現物照合 | 合格 | F01/F03/F04/F08/F11の全wrapper・callsiteを行位置で確認 |
| 値レベル閉包 | 合格 | path・SHA exact一件、0／複数／未検証／許可外はnull |
| 参照実体 | 合格 | 使用するdecoder・validator・集合構築・共通selectorが全て実在 |
| 検査可能性 | 合格 | 既存F02/F03内で一意性、通常早期fatal、公開前再読、正式byteを観測可能 |
| 工程間受け渡し | 合格 | job検証後とtimeline検証後の2地点で集合の生成時点を固定 |
| 観測データ取得可能性 | 合格 | 生message等を保存せず閉語彙とpath・SHAだけで観測可能 |
| path閉包 | 合格 | 実装変更2 path、承認済み18 path以内 |
| byte閉包 | 合格 | 成功成果物と既存正式serializerは変更しない |
