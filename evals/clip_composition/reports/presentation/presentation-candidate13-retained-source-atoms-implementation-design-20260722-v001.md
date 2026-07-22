# candidate 13 残存source atom抽出工程 実装設計 v001

- 作成日: 2026-07-22
- 区分: 人間待ち中に準備した実装前設計
- 対象: DmWu0jVQfTE candidate 13
- 状態: **設計のみ。コード、正式job、正式出力は未作成**
- 人間作業: 本設計の作成は0件。次は実装承認1件、媒体視聴なし

## 1. 結論

次に実装するのは、正式組立決定で残った発話要素を、元STT・人間承認済み区間・合格済み基礎映像へ追跡可能な形で固定する工程である。

この工程は最終的な解決パッケージを作らない。出力は次の3件だけとする。

1. 文字粒度の残存source atom成果物
2. 抽出来歴を持つ生成記録
3. 入出力と検査結果を持つ合格記録

最終解決パッケージは、G1〜G3の表示対象・表示単位・改行・切替と演出指示書が決まった後、指示書と一対で生成する。空の対象を持つ使い捨てパッケージは作らない。

今回の実装承認範囲は、汎用抽出器、正式job実行器、合成検査、candidate 13の読み取り専用preflight、正式job JSONの固定までとする。**正式jobの1回実行は別承認**とし、実装完了時に停止する。

## 2. 本来の目的

目的はSTTを別のJSONへコピーすることではない。

人間が採用した2区間だけを後続のテロップ・演出指示が参照できるようにし、切除済み区間を誤参照できない状態を作る。そのうえで、各発話要素が次のどこから来たかを、実byte hashで後から辿れる必要がある。

- 元配信とSTTの同一性記録
- 完了済みSTT
- candidate 13の発話まとまり
- 人間承認済み組立決定
- 人間が見た比較媒体との正式化記録
- 合格済み基礎映像とframe正本の時間対応表

素材固有の件数やIDを抽出アルゴリズムへ埋め込まない。candidate 13の354件は正式実行前の期待値として検査するが、抽出規則そのものは「1素材・1候補・1正式組立決定・任意個の非重複採用区間」に対して動く。

## 3. 契約上の位置づけ

### 3.1 最終解決パッケージではない

承認済みの演出指示／レンダラー境界契約v002では、未参照対象と未参照cueを拒否する。そのため解決パッケージは、1つの演出指示書と対で作る専用品である。

本成果物には次を入れない。

- resolutionPackageId
- targets
- captionContracts
- 演出指示
- プリセット
- 素材参照

後段は本成果物のrawSourceAtomsを入力として、演出指示書と最終解決パッケージを同じ工程で対生成する。

### 3.2 文字粒度を偽らない

保存ファイル名はword-timestamps.jsonだが、candidate 13で使う実体は文字単位である。atomGranularityは必ずcharacter-timestampとする。

文字粒度のまま現行G1〜G3契約へ渡すと、意味が読める短い表示単位かを機械検査できず、passed_with_declared_limitになる。正式レンダラーv002はINSTRUCTION_CONTRACT_PARTIALで描画前に停止する。

本工程はこの停止を回避しない。word-timestampへの読み替え、独自の文字数閾値、検査の緩和は行わない。真の語単位成果物を作るか、追加認定を含む契約改訂を行うかは次ゲートで決める。

### 3.3 話者値を先に加工しない

抽出時はSTTのraw話者値をそのまま保存する。

- SPEAKER_00は不透明な話者クラスタとして保持する。
- unknownはunknownのまま保持する。
- 人物名を推定しない。
- 空白除去、大小文字変換、trimをしない。

unknownからnullへの写像は、既存の正式解決パッケージ生成器だけが行う。抽出器で同じ処理を二重実装しない。

## 4. 実装単位

### 4.1 新規コード

次の2ファイルに分ける。

1. evals/clip_composition/presentation_retained_source_atoms_v001.mjs
   - 厳密schema検査
   - 入力間の意味照合
   - 発話まとまりの復元
   - 採用区間への包含判定
   - 成果物・生成記録・合格記録の組立
   - ファイル操作を持たない決定的な中核

2. evals/clip_composition/run_presentation_retained_source_atoms_job_v001.mjs
   - job実byteの読込とhash
   - 入力ファイルの実byte hash検査
   - lock、作業directory、原子的公開
   - failure記録
   - CLI終了コード

検査は次の1ファイルへまとめる。

- evals/clip_composition/presentation_retained_source_atoms_v001.test.mjs

新しいライブラリは追加しない。正式実行時のproject内runtime依存は、上記coreとrunnerの2ファイルだけに閉じる。runnerはcoreとNode標準機能だけを読み、coreはNode標準機能だけを使う。canonical JSON処理はcore内に固定し、既存契約の既知vectorと同じbyte・SHAになることを検査する。既存project helperを暗黙importすると、implementationBindingの外に差し替え可能な実装が残るため禁止する。追加のproject runtime fileが必要だと判明した場合は、実装へ進まず本設計とjob schemaを改訂する。

実装検査では、coreのproject内importが0件、runnerのproject内importが上記core 1件だけであることをsource bytesから確認する。dynamic importと`createRequire`は両方禁止する。runner自身の`import.meta.url`と、coreがexportする実module URLをそれぞれ実pathへ解決し、jobのrole別pathと完全一致させる。同じbytesを別pathへ複製してcoreまたはrunner役へ差し替えても、path一致を満たさないため正式実行扱いにしない。

### 4.2 schemaと版

固定する版名は次のとおり。

| 意味 | schema / version |
|---|---|
| 実行job | presentation-retained-source-atoms-job-v001 |
| 抽出成果物 | presentation-retained-source-atoms-v001 |
| 抽出規則 | presentation-retained-source-atom-selection-v001 |
| 生成記録 | presentation-retained-source-atoms-generation-manifest-v001 |
| 合格記録 | presentation-retained-source-atoms-validation-report-v001 |
| 実装 | presentation-retained-source-atoms-extractor-v001 |

版名を維持したままfieldの意味を変えない。改訂が必要なら新しい版を作り、旧版を読み替える後方互換分岐は作らない。

## 5. 正式job

### 5.1 job schema

jobは必ず実ファイルとして渡す。JavaScript objectを直接渡して正式実行扱いにする入口は作らない。

~~~json
{
  "schemaVersion": "presentation-retained-source-atoms-job-v001",
  "jobId": "DmWu0jVQfTE-candidate-13-retained-source-atoms-job-v001",
  "artifactId": "DmWu0jVQfTE-candidate-13-retained-source-atoms-v001",
  "candidateId": 13,
  "declaredAtomGranularity": "character-timestamp",
  "implementationBinding": {
    "gitCommit": "40桁の小文字16進Git commit",
    "files": [
      {
        "role": "core",
        "path": "evals/clip_composition/presentation_retained_source_atoms_v001.mjs",
        "fileSha256": "64桁の小文字16進SHA-256"
      },
      {
        "role": "runner",
        "path": "evals/clip_composition/run_presentation_retained_source_atoms_job_v001.mjs",
        "fileSha256": "64桁の小文字16進SHA-256"
      }
    ]
  },
  "inputs": {
    "sourceIdentity": {
      "path": ".../source-identity.json",
      "fileSha256": "64桁の小文字16進SHA-256"
    },
    "candidateManifest": {
      "path": ".../candidate-manifest.json",
      "fileSha256": "64桁の小文字16進SHA-256"
    },
    "assemblyDecision": {
      "path": ".../assembly-decision.json",
      "fileSha256": "64桁の小文字16進SHA-256",
      "payloadCanonicalSha256": "64桁の小文字16進SHA-256"
    },
    "formalizationReceipt": {
      "path": ".../formalization-receipt.json",
      "fileSha256": "64桁の小文字16進SHA-256"
    },
    "timeline": {
      "path": ".../timeline.json",
      "fileSha256": "64桁の小文字16進SHA-256"
    },
    "baseMediaGenerationManifest": {
      "path": ".../generation-manifest.json",
      "fileSha256": "64桁の小文字16進SHA-256"
    },
    "baseMediaValidationReport": {
      "path": ".../validation-report.json",
      "fileSha256": "64桁の小文字16進SHA-256"
    }
  },
  "expectedProjection": {
    "sourceAtomCount": 354,
    "rawSourceAtomsCanonicalSha256": "cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3",
    "segments": [
      {"timelineSegmentId": "segment-0001", "atomCount": 248, "atomIdsCanonicalSha256": "preflightで固定する値"},
      {"timelineSegmentId": "segment-0002", "atomCount": 106, "atomIdsCanonicalSha256": "preflightで固定する値"}
    ],
    "speechGroups": [
      {"speechId": 1, "atomCount": 126},
      {"speechId": 2, "atomCount": 122},
      {"speechId": 3, "atomCount": 106}
    ]
  },
  "outputDirectory": "evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001"
}
~~~

上のJSONはfield構造を示す模式例であり、`preflightで固定する値`は正式jobで許される値ではない。正式jobでは読み取り専用preflightで得た64桁小文字16進SHAへ必ず置換し、placeholderを含むjobはschema不合格とする。

全objectはexact-field契約とする。未知field、空文字、非整数candidateId、不正hash、許可root外path、symlinkを拒否する。

job top-levelはschemaVersion、jobId、artifactId、candidateId、declaredAtomGranularity、implementationBinding、inputs、expectedProjection、outputDirectoryの9fieldだけとする。implementationBinding.filesはcore、runnerの固定順2件だけを許し、各要素はrole、path、fileSha256の3fieldとする。expectedProjection.segmentsとspeechGroupsは、timeline segment順とspeechId昇順で全件を持ち、余分な候補だけを省略できる可変の参考欄にはしない。

implementationBindingとexpectedProjectionは、実装・合成検査・読み取り専用preflightの完了後に正式jobへ固定する。正式実行器は中核とrunnerの実byte SHAをjobへ照合し、差し替わっていれば実行しない。gitCommitは承認時の来歴として保存するが、無関係な別fileがdirtyであること、またはHEADが後続commitへ進んだことだけでは停止しない。合否は承認対象2ファイルの実byte一致で決め、無関係なworktree状態を成功成果物へ混ぜない。

自己参照するcommitを作らないため、承認後の記録順を2 commitに固定する。

1. **実装commit A**: core、runner、合成検査とtestdataだけを記録する。
2. `git show <commit A>:<path>`で得たcore/runner bytesのSHAが、作業treeで実際にloadする同2ファイルのSHAと一致することを確認する。そのbytesを使って全検査と読み取り専用preflightを行い、implementationBinding.gitCommitへcommit Aを、filesへcommit Aのcore/runner SHAを固定する。
3. **job固定commit B**: 正式job JSONと実装完了報告だけを記録する。commit Bではcoreとrunnerを変更しない。

正式jobが後続commit Bに置かれるため、正式実行時のHEADがcommit Aそのものではないことは不合格理由にしない。ただしcore/runnerの実byteはcommit Aと完全一致しなければならない。commit B作成直前と作成後に2ファイルを再hashし、jobのimplementationBindingと一致することを確認する。

expectedProjectionはpreflightの結果を正式実行へ束縛する。件数またはcanonical hashが1つでも違えば、成果物を公開せず停止する。正式実行時に期待値を計算結果へ合わせて書き換えない。

production実行入口はjobPathだけを受け、内部でjob bytesを読み、実SHAを計算し、そのbytesからparseする。parse済みobjectだけを正式入口へ渡せない。テスト用の依存注入でもjobPath、jobBytes、jobFileSha256の3点を必須にし、bytes欠落、申告SHA不一致、bytesからparseした値と注入objectの相違をそれぞれRETAINED_ATOMS_JOB_FILE_MISMATCHで拒否する。

STT manifest、transcript、word timestamps、media equivalence、trusted artifact summary、basis edit plan、実基礎映像は、source identity、formalization receipt、基礎映像生成記録が宣言する版付きpath/hashを辿って読む。jobへ同じ参照を重複記載せず、二重の正本を作らない。

### 5.2 candidate 13で束縛する入力

| 意味 | path | SHA-256 |
|---|---|---|
| 元媒体・STT同一性 | evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/source-identity.json | a7c9e9a8c3917662bcf3b66fad46cedc56f5ca558467226453339ea370108993 |
| candidateと発話まとまり | evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/candidate-manifest.json | 3937747e947ef0dd27a67e289d06cece8c17a55b655c85fa7d6aaf21f696ec12 |
| 人間承認済み組立決定 | evals/clip_composition/outputs/presentation/20260722-first-real-data-assembly-decision-v001/assembly-decision.json | b2360d5e2aa56075728d692a7d456455d2cac168d47325631cfea4d919e3aa32 |
| 決定payload | 上記JSONのpayload | 7fbdc54c548be6e7a475cb54f221644c3d7ff5ce89442cd6a38fbccc7bd13755 |
| 人間が見たDとの照合 | evals/clip_composition/outputs/presentation/20260722-first-real-data-assembly-decision-v001/formalization-receipt.json | a0979241643d77494443ab80880cd3c4dd75be5c0241424a7634082f65275fca |
| frame正本の時間対応表 | evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/timeline.json | 802f570dd4f8ea90ef63b0b9afb9a026abf0b18e43e51f2aab51bd62c2180fec |
| 基礎映像生成記録 | evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/generation-manifest.json | e06a606e7348a8c30a743edd9acd5da96e035125b2b69a33257d0c31cf9b81db |
| 基礎映像合格記録 | evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/validation-report.json | e906b4424609176d019ddc4c8d314df056feb87de1e993bf84f247eff5c21079 |

source identityから展開して照合する入力は次のとおり。

| 意味 | path | SHA-256 |
|---|---|---|
| STT実行来歴 | evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/manifest.json | f7d2c04f8f9e67e27ff5b461236f01d3b68bb4f53ba448c0c4b5387c95a6d03b |
| transcript | evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/transcript.json | c0e006b381d60c2160a4ef59787bd32e47257baf9acc77b8706d74b5c8d3556d |
| 文字時刻列 | evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/word-timestamps.json | ebf0190c9ce0fd96b4e1faa18717f41d73126fc914172474ac791df7f17ad065 |
| media equivalence | evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/media-equivalence.json | 98c0f2018553f39a855610c569f2908efecccc0dadb696fc2b156d19010c15ea |
| 人間提示時のartifact束縛 | evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/artifact-build-summary.json | 20f8d63fc421d7ab439e5c633b862a3d52f52c0305994b979080d2fb837f8199 |
| candidateの編集方針 | evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/basis-edit-plan.json | 31f93434d8a0ba2f1b8cb2e6d845fd48f0064bcf2fcfb5aaee967653e90f2e64 |
| 実基礎映像 | evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/base-media.mp4 | c0677893902b5a1eaf79b2a3937d67a477f270810200f7c6c01457b42b803c48 |

jobと展開入力は、正式実行前に新規pathへ固定する。既存の成果物へ追記しない。

## 6. 入力照合

### 6.1 実byte

全JSONはbyteで読み、jobが宣言したSHAまたは親artifactが宣言したSHAと照合した同じbufferだけを解析する。検査前にparseした別objectを処理へ渡さない。

実基礎映像は、生成記録が宣言するpathのregular fileをstream hashし、生成記録と合格記録のSHAへ一致させる。映像内容の再解析は本工程の責務ではない。

公開直前に全入力pathの実byte SHAを再照合し、処理中の差し替えを拒否する。

### 6.2 source identity

次を完全一致させる。

- sourceRef: youtube:DmWu0jVQfTE
- sourceProvenance: youtube-format299-video+frozen-format251-audio-v001
- source identityが宣言するSTT 3件のpath/hash
- candidate manifestが宣言するsource identity、STT manifest、word timestampsのpath/hash
- source identityとcandidate manifestが宣言するmedia equivalenceのpath/hash
- media equivalenceの対応検査がpassedであること
- formalization receiptが宣言するtrustedArtifactSummaryのpath/hashを実byteで照合すること
- trusted artifact summary.statusがpassedであること
- trusted artifact summary内のcandidate manifest、source identity、media equivalence、basis edit planのpath/hashが、jobの直接入力または展開入力と完全一致すること
- candidate manifestが宣言するbasis edit planのpath/hashが、trusted artifact summaryと完全一致すること
- basis edit planとcandidate manifestのcandidate ID、title、outer rangeが完全一致すること

STTのsourceUriまたは旧入力pathをnative 1080p媒体pathと文字列比較しない。1080pへの時刻軸移送はsource identityとmedia equivalenceの合格記録を正本とする。

### 6.3 人間承認と正式区間

組立決定について次を要求する。

- schemaVersionが固定版
- approval.statusがapproved
- approval.approverTypeがhuman
- unresolvedEditsが空
- payload canonical SHAがjob、approval、formalization receipt、基礎映像生成記録、合格記録で完全一致
- sourceRef、sourceProvenance、元媒体SHAがsource identityと完全一致

区間列は半開区間として扱い、次の4箇所を完全一致させる。

1. 組立決定payload
2. formalization receiptの正式区間
3. timeline v002
4. 基礎映像生成記録

timelineとformalization receiptについては、source区間だけでなくframe写像とoutput frame列も一致させる。合格済みcandidate 13の正式値は次である。

- [1,920,260, 1,977,670) ms
- [1,981,394, 2,008,506) ms
- 2,535 frame
- 4,056,000 audio sample

### 6.4 基礎映像の合格状態

次を満たさない入力からsource atom成果物を作らない。

- generation manifestがv002
- validation report.statusがpassed
- violationsが空
- 全checkがpassed
- timelineの実byte SHAがgeneration manifestとvalidation reportに一致
- base-media.mp4の実byte SHAがgeneration manifestとvalidation reportに一致
- build ID、timeline ID、base media artifact IDは同じ文字列を要求せず、それぞれを参照するartifact内の対応fieldが正しいIDへ一致

### 6.5 STTの完全性

STT manifestについて次を要求する。

- partialがfalse
- processedChunkCountとfullChunkCountが一致
- discarded / clamped件数が0
- segmentCountとtranscript配列長が一致
- wordTimestampCountとword timestamps配列長が一致
- hasWordTimestampsがtrue

transcriptとword timestampsは全件について次を照合する。

- transcript.id = word timestamps.segmentId
- 本文
- startMs
- endMs
- raw話者

candidate 13の現入力では25,899 / 25,899件が一致する。transcriptのspeechUnitGroupsは発話まとまりの正本にしない。対象部分では各文字が別groupになっており、candidate 13の3発話を表さないためである。

### 6.6 candidate manifestの発話まとまり

発話まとまりの正本はcandidate manifestとする。

各review itemのbeforeUtteranceとafterUtteranceから、speechIdごとに発話を集める。speechId=2のように複数箇所へ同じ発話が載る場合は、speechId、範囲、本文、characters全件がcanonical完全一致することを先に検査する。一致した場合だけ1発話へ統合する。先勝ちや単純連結を禁止する。

各characterについて次を照合する。

- characterId = word-<STTの元segmentId>
- 本文
- startMs
- endMs

raw話者はSTTを正本とし、candidate manifestから推測しない。candidate manifestとSTTの不足・余剰は別々に検出する。

## 7. 抽出規則

### 7.1 atom IDと順序

- atomIdは元IDからword-<正の10進整数>とし、切除後に再番号を振らない。
- speechIdはcandidate manifestからコピーし、本文や時間差から再推測しない。
- 出力順は正式timeline segment順、同一segment内は元transcript配列順。
- 本文、時刻、raw話者、sourceRefを変更しない。

### 7.2 包含判定

source atomの半開区間全体が、正式timeline segmentのちょうど1件へ包含される場合だけ採用する。

- 正式区間内へ完全包含: 採用
- candidate外枠内だが採用区間外へ完全包含: 人間の正式編集による除外として記録
- 正式境界へ部分的に交差: 分割・丸めをせず停止
- 複数segmentへ所属: segment契約不正として停止
- 正式区間内だがcandidate manifestにspeech対応がない: 停止
- candidate manifestのatomがSTTにない、または本文・時刻が違う: 停止

開始と終了がsegment境界へ接触するだけなら交差ではない。半開区間に従い、atom.endMs = segment.startMsは前側、atom.startMs = segment.endMsは後側であり、そのsegmentには含めない。

### 7.3 source atom同士の時間重なり

元配信側のatomには、同時発話やSTT揺れによる正の時間重なりがあり得る。既存G1〜G3契約と同様に、それだけでは拒否しない。

- 非正長、元配列の開始時刻逆転、同一atom ID重複は停止
- 正の時間重なりは件数と該当ID対を生成記録へ保存
- 同時表示の是非は後段のcaption契約で決める

candidate 13の現入力では正の時間重なりは0件である。

## 8. 出力

### 8.1 残存source atom成果物

final directoryのsource-atoms.jsonは次の形とする。以下はfield形状を示すためatomIdsとrawSourceAtomsを1件へ短縮したschema例であり、candidate 13の実件数は§12を正本とする。

~~~json
{
  "schemaVersion": "presentation-retained-source-atoms-v001",
  "artifactId": "...",
  "extractorVersion": "presentation-retained-source-atoms-extractor-v001",
  "sourceRef": "youtube:DmWu0jVQfTE",
  "sourceProvenance": "youtube-format299-video+frozen-format251-audio-v001",
  "atomGranularity": "character-timestamp",
  "atomProvenance": {
    "sttManifest": {"path": "...", "fileSha256": "..."},
    "transcript": {"path": "...", "fileSha256": "..."},
    "wordTimestamps": {"path": "...", "fileSha256": "..."},
    "candidateManifest": {"path": "...", "fileSha256": "..."}
  },
  "selection": {
    "policyVersion": "presentation-retained-source-atom-selection-v001",
    "candidateId": 13,
    "assemblyDecisionId": "...",
    "assemblyDecisionPayloadSha256": "...",
    "formalizationId": "...",
    "timelineId": "...",
    "timelineFileSha256": "...",
    "baseMediaArtifactId": "...",
    "baseMediaFileSha256": "...",
    "intervalSemantics": "half-open",
    "segments": [
      {
        "timelineSegmentId": "segment-0001",
        "sourceStartMs": 1920260,
        "sourceEndMs": 1977670,
        "outputStartFrame": 0,
        "outputEndFrame": 1722,
        "atomIds": ["word-6932"],
        "atomIdsCanonicalSha256": "...",
        "atomCount": 1
      }
    ]
  },
  "rawSourceAtomsCanonicalSha256": "...",
  "rawSourceAtoms": [
    {
      "atomId": "word-6932",
      "speechId": 1,
      "speaker": "SPEAKER_00",
      "text": "母",
      "startMs": 1920260,
      "endMs": 1920480,
      "sourceRef": "youtube:DmWu0jVQfTE"
    }
  ]
}
~~~

top-levelは、schemaVersion、artifactId、extractorVersion、sourceRef、sourceProvenance、atomGranularity、atomProvenance、selection、rawSourceAtomsCanonicalSha256、rawSourceAtomsの10fieldだけとする。atomProvenanceはsttManifest、transcript、wordTimestamps、candidateManifestの4fieldだけを持ち、各値はpath、fileSha256の2fieldだけを持つ。

selectionはpolicyVersion、candidateId、assemblyDecisionId、assemblyDecisionPayloadSha256、formalizationId、timelineId、timelineFileSha256、baseMediaArtifactId、baseMediaFileSha256、intervalSemantics、segmentsの11fieldだけを持つ。segmentsの各要素はtimelineSegmentId、sourceStartMs、sourceEndMs、outputStartFrame、outputEndFrame、atomIds、atomIdsCanonicalSha256、atomCountの8fieldだけを持つ。

rawSourceAtomsの各要素は、既存build_presentation_resolution_package_v002.mjsが受け取るfieldへ厳密に合わせる。timeline segment所属はselection.segmentsのatomIdsで保持し、rawSourceAtomsへ独自fieldを足さない。

rawSourceAtomsの必須fieldはatomId、speechId、text、startMs、endMs、sourceRef。speakerは元STTにfieldがある場合だけ同じ値で付ける任意fieldとし、それ以外のfieldを拒否する。

sourceProvenanceは媒体由来を表す既存値のままにする。抽出器版を連結して別値へ変えない。atom変換の由来はatomProvenanceとextractorVersionへ分離する。

### 8.2 生成記録

generation-manifest.jsonのtop-level fieldは、次の10件だけとする。

- schemaVersion
- generatorVersion
- job
- implementation
- directInputs
- expandedInputs
- source
- selection
- observations
- output

exact schemaは次である。directInputsとexpandedInputsの各要素はrole、path、fileSha256、schemaVersionの4fieldだけを持ち、roleの固定順で並べる。実基礎映像だけschemaVersionをnullとする。

directInputsの固定順はsourceIdentity、candidateManifest、assemblyDecision、formalizationReceipt、timeline、baseMediaGenerationManifest、baseMediaValidationReport。expandedInputsの固定順はsttManifest、transcript、wordTimestamps、mediaEquivalence、trustedArtifactSummary、basisEditPlan、baseMediaとする。

~~~json
{
  "schemaVersion": "presentation-retained-source-atoms-generation-manifest-v001",
  "generatorVersion": "presentation-retained-source-atoms-extractor-v001",
  "job": {
    "jobId": "...",
    "path": "...",
    "fileSha256": "..."
  },
  "implementation": {
    "approvedGitCommit": "...",
    "files": [
      {
        "role": "core",
        "path": "...",
        "expectedFileSha256": "...",
        "actualFileSha256": "..."
      },
      {
        "role": "runner",
        "path": "...",
        "expectedFileSha256": "...",
        "actualFileSha256": "..."
      }
    ],
    "runtime": {
      "resolvedNodePath": "...",
      "nodeFileSha256": "...",
      "nodeVersion": "...",
      "bindingRole": "diagnostic-not-pass-fail"
    }
  },
  "directInputs": [
    {"role": "sourceIdentity", "path": "...", "fileSha256": "...", "schemaVersion": "..."}
  ],
  "expandedInputs": [
    {"role": "sttManifest", "path": "...", "fileSha256": "...", "schemaVersion": "..."}
  ],
  "source": {
    "sourceRef": "...",
    "sourceProvenance": "...",
    "atomGranularity": "character-timestamp"
  },
  "selection": {
    "policyVersion": "presentation-retained-source-atom-selection-v001",
    "candidateId": 13,
    "assemblyDecisionId": "...",
    "assemblyDecisionPayloadSha256": "...",
    "timelineId": "...",
    "intervalSemantics": "half-open",
    "segments": [
      {
        "timelineSegmentId": "...",
        "sourceStartMs": 0,
        "sourceEndMs": 1,
        "atomCount": 1,
        "firstAtomId": "...",
        "lastAtomId": "...",
        "atomIdsCanonicalSha256": "..."
      }
    ]
  },
  "observations": {
    "counts": {
      "sttAtomCount": 1,
      "candidateOuterRangeAtomCount": 1,
      "retainedAtomCount": 1,
      "excludedByAssemblyCount": 0,
      "boundaryPartialOverlapCount": 0
    },
    "speechGroups": [
      {"speechId": 1, "atomCount": 1, "firstAtomId": "...", "lastAtomId": "..."}
    ],
    "sourceAtomPositiveOverlaps": []
  },
  "output": {
    "artifactId": "...",
    "path": "source-atoms.json",
    "fileSha256": "...",
    "canonicalSha256": "...",
    "rawSourceAtomsCanonicalSha256": "..."
  }
}
~~~

sourceAtomPositiveOverlapsの各要素は、leftAtomId、rightAtomId、overlapStartMs、overlapEndMsの4fieldだけを持つ。実行時刻は決定性を壊すため入れない。

implementationはapprovedGitCommit、files、runtimeの3fieldだけを持つ。runtimeは実行時の`process.execPath`をrealpath化したpath、その実行file SHA、`process.version`を保存する。Node実体はjobの合否束縛には含めず、現版の既知制約として診断記録だけにする。Node差による結果差が出た場合は「同じ実装の決定性」と報告せず、runtime束縛を追加する契約改訂候補として停止する。

### 8.3 合格記録

validation-report.jsonのtop-level fieldは、schemaVersion、artifactId、status、violations、job、inputs、outputs、checksの8件だけとする。

~~~json
{
  "schemaVersion": "presentation-retained-source-atoms-validation-report-v001",
  "artifactId": "...",
  "status": "passed",
  "violations": [],
  "job": {"path": "...", "fileSha256": "..."},
  "inputs": [
    {"role": "...", "path": "...", "fileSha256": "..."}
  ],
  "outputs": {
    "sourceAtoms": {
      "artifactId": "...",
      "path": "source-atoms.json",
      "fileSha256": "...",
      "canonicalSha256": "..."
    },
    "generationManifest": {
      "path": "generation-manifest.json",
      "fileSha256": "...",
      "canonicalSha256": "..."
    }
  },
  "checks": {
    "jobBinding": {"status": "passed", "violationCodes": []},
    "implementationBinding": {"status": "passed", "violationCodes": []},
    "expectedProjection": {"status": "passed", "violationCodes": []},
    "approvalBinding": {"status": "passed", "violationCodes": []},
    "baseMediaBinding": {"status": "passed", "violationCodes": []},
    "sourceIdentityBinding": {"status": "passed", "violationCodes": []},
    "sttCompleteness": {"status": "passed", "violationCodes": []},
    "sttCrossCheck": {"status": "passed", "violationCodes": []},
    "candidateGrouping": {"status": "passed", "violationCodes": []},
    "segmentContainment": {"status": "passed", "violationCodes": []},
    "rawAtomContract": {"status": "passed", "violationCodes": []},
    "hashGraph": {"status": "passed", "violationCodes": []},
    "publishPreconditions": {"status": "passed", "violationCodes": []}
  }
}
~~~

inputsはdirectInputsとexpandedInputsをrole固定順で連結し、要素のfieldはrole、path、fileSha256の3件だけとする。violationsの各要素はcode、path、detailsの3fieldだけを持つ。detailsは常にobjectとし、詳細が無い場合も空objectを置く。

各checkのstatusはpassed、failed、not_run_with_upstream_failureの3値だけを許す。次の固定検査群を増減する場合はschema版を改訂する。

| 検査 | 意味 |
|---|---|
| jobBinding | 実job byteとjob宣言 |
| implementationBinding | 承認済み中核・runnerの実byte |
| expectedProjection | preflightで固定した件数・hash |
| approvalBinding | 人間承認payloadと正式化記録 |
| baseMediaBinding | decision・timeline・実基礎映像・合格記録 |
| sourceIdentityBinding | 元媒体・STT・media equivalence |
| sttCompleteness | STT完了状態と件数 |
| sttCrossCheck | transcriptとword timestamps全件一致 |
| candidateGrouping | candidate manifestの発話まとまり |
| segmentContainment | 完全包含・除外・境界交差 |
| rawAtomContract | ID、本文、時刻、raw話者、順序 |
| hashGraph | 全入力・全出力の一方向hash |
| publishPreconditions | path、lock、既存出力、symlink |

source-atoms.jsonとgeneration-manifest.jsonはvalidation-report.jsonのhashを持たない。validation reportだけが前2件のhashを持つ一方向グラフとし、循環を作らない。

rawAtomContractとhashGraphは、selection.segments内の全atomIdsが次を満たすことを公開前の再読込後に独立再計算する。

- 各IDはrawSourceAtomsへちょうど1回存在
- rawSourceAtomsの全IDもsegment側へちょうど1回存在
- segment間重複なし
- timeline segment順・元transcript順
- atomCount、firstAtomId、lastAtomId、atomIdsCanonicalSha256が実配列と一致
- 各atomの時刻が所属segmentへ完全包含

生成時に同じ配列から作れたことだけを合格根拠にせず、publish-tmp上のJSONを再読込して検査する。

### 8.4 最終解決パッケージへの接続

次ゲートで文字atomを直接使うと承認した場合は、source-atoms.jsonをrenderer v002が要求する唯一のsourceArtifactとする。

複数のSTT・candidate manifest・decisionをsourceArtifactsへ直接並べない。source-atoms.json内部のatomProvenanceと生成記録から上流へ辿る。

文字atomを直接使う場合、既存解決パッケージ生成器へ渡すrawSourceAtomsのcanonical SHAは、本成果物のrawSourceAtomsCanonicalSha256と完全一致させる。unknownのnull写像後のsourceAtoms SHAは別値として既存生成器が記録する。

次ゲートで真の語単位成果物を作ると承認した場合は、派生した語atom成果物を唯一のsourceArtifactとし、そのrawSourceAtoms canonical SHAを最終パッケージへ一致させる。本文字atom成果物は、語atom成果物の入力来歴としてpath/hashで束縛する。この2経路を同じ版で暗黙に切り替えず、次ゲートの設計で一方を固定する。

## 9. 公開と失敗時の扱い

### 9.1 出力先

正式出力は次のroot配下だけを許可する。

- evals/clip_composition/outputs/presentation/retained-source-atoms/

final directoryには次の3件だけを公開する。

- source-atoms.json
- generation-manifest.json
- validation-report.json

解決パッケージ、演出指示書、動画、確認HTMLを混ぜない。

### 9.2 原子的公開

既存の基礎映像生成器と同じ安全規律を使う。

1. final非存在を確認
2. <output>.lockを排他的に作成
3. 同じ親directoryへworkとpublish-tmpを新規作成
4. 全入力を実byteで照合
5. 3出力をpublish-tmpへ書く
6. 再読込してschema・hash graph・件数を再検査
7. job、実際にloadしたcore/runner、direct input、expanded input、実基礎映像の全てを再hashし、regular file、no-symlink、許可root内realpathを各file自身と全祖先について再検査
8. 出力側もworkspaceから全親階層を再走査し、symlink差し替えとfinal出現を拒否
9. directory renameを1回だけ行って公開

production codeでrm、unlink、既存出力の上書き、外国lockの解除を行わない。成功時も所有lockとworkを診断用に保持する。失敗時はfinalを作らず、work、publish-tmp、所有lockを保持する。

初回読込後に同じbyteを持つsymlinkへ入力pathを置換しても、公開前のpath契約検査で停止する。hash一致だけをpath安全性の代用にしない。

### 9.3 failure記録とCLI

failure記録は次へtemp fileからrenameして1件作る。

- evals/clip_composition/outputs/presentation/retained-source-atom-failures/

failure fileはUUIDを含む新規名で毎回作り、既存failureを上書きしない。report本体へ実job file SHAと固定順violationsのcanonical SHAを必須記録し、同じpathへ別内容のjobが置かれても履歴上区別できるようにする。失敗file名の決定性を成功成果物の決定性と混同しない。

failure reportのexact schemaは次とする。

~~~json
{
  "schemaVersion": "presentation-retained-source-atoms-failure-report-v001",
  "failureId": "UUID",
  "status": "failed",
  "job": {"path": "...", "fileSha256": "..."},
  "violationsCanonicalSha256": "...",
  "violations": [
    {"code": "...", "path": "...", "details": {}}
  ],
  "checks": {
    "jobBinding": {"status": "passed", "violationCodes": []},
    "implementationBinding": {"status": "failed", "violationCodes": ["..."]},
    "expectedProjection": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "approvalBinding": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "baseMediaBinding": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "sourceIdentityBinding": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "sttCompleteness": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "sttCrossCheck": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "candidateGrouping": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "segmentContainment": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "rawAtomContract": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "hashGraph": {"status": "not_run_with_upstream_failure", "violationCodes": []},
    "publishPreconditions": {"status": "not_run_with_upstream_failure", "violationCodes": []}
  },
  "retainedPaths": {
    "workingDirectory": "...またはnull",
    "publishTemporaryDirectory": "...またはnull",
    "lockFile": "...またはnull"
  }
}
~~~

failure reportは、jobを実byteとして読みparseできた後のexit 1だけで作る。usage、job欠落、読込不能、不正JSONのexit 2では、信用できるjob文脈がないため作らない。failure report用UUIDのpathが既に存在した場合は上書きも再利用もせず、failure report作成失敗としてstderrと返り値のfailureReportPath=nullへ明示し、元のexit 1を維持する。別fileへ黙ってfallbackしない。

CLI終了コードは次で固定する。

- 0: 合格してfinalを公開
- 1: 読めたjobに対する契約・入力・処理・公開前検査の不合格
- 2: usage、job path不正、job読込不能、JSON parse不能

## 10. 固定違反コード

実装前に次の固定集合を宣言し、テストで全コードを意図的に発火させる。

- RETAINED_ATOMS_JOB_INVALID
- RETAINED_ATOMS_JOB_FILE_MISMATCH
- RETAINED_ATOMS_IMPLEMENTATION_MISMATCH
- RETAINED_ATOMS_EXPECTED_PROJECTION_MISMATCH
- RETAINED_ATOMS_INPUT_PATH_UNSAFE
- RETAINED_ATOMS_INPUT_HASH_MISMATCH
- RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED
- RETAINED_ATOMS_ASSEMBLY_INVALID
- RETAINED_ATOMS_APPROVAL_INVALID
- RETAINED_ATOMS_UNRESOLVED_EDITS
- RETAINED_ATOMS_BASE_MEDIA_NOT_PASSED
- RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH
- RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH
- RETAINED_ATOMS_MEDIA_EQUIVALENCE_INVALID
- RETAINED_ATOMS_STT_INCOMPLETE
- RETAINED_ATOMS_STT_COUNT_MISMATCH
- RETAINED_ATOMS_STT_CROSSCHECK_MISMATCH
- RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH
- RETAINED_ATOMS_GROUPING_INVALID
- RETAINED_ATOMS_SEGMENT_INVALID
- RETAINED_ATOMS_BOUNDARY_PARTIAL_OVERLAP
- RETAINED_ATOMS_MULTIPLE_SEGMENT_MATCH
- RETAINED_ATOMS_EMPTY
- RETAINED_ATOMS_RAW_CONTRACT_INVALID
- RETAINED_ATOMS_HASH_GRAPH_INVALID
- RETAINED_ATOMS_OUTPUT_PATH_UNSAFE
- RETAINED_ATOMS_OUTPUT_EXISTS
- RETAINED_ATOMS_OUTPUT_LOCK_CONFLICT
- RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED
- RETAINED_ATOMS_ATOMIC_COMMIT_FAILED
- RETAINED_ATOMS_BUILD_FAILED

配列順を診断順として固定する。1件目だけで後続検査を黙って省略せず、実行可能な検査の全違反を固定順で記録する。入力が読めないため従属検査が不能な場合は、検査状態をnot_run_with_upstream_failureとして明示する。

## 11. 検査計画

### 11.1 正常系

1. 2 segment、内部gapにatomなし
2. cut gap内にatomあり。正常な除外として成功
3. atomの終端または開始がsegment境界へ接触
4. source atom同士が正に重なる。成功し観測記録を残す
5. candidate manifestに同じspeechIdが重複掲載され、内容完全一致なら1発話へ統合
6. speaker欄なし、null、不透明ラベル、unknownをrawのまま保持
7. segment内に発話0件を含むが全体では1件以上ある

### 11.2 jobとファイル安全性

8. missing field、unknown field、不正SHA、非整数candidate ID
9. usage不足、job欠落、不正JSON、root外path、symlink
10. production execute入口でjob bytes欠落、申告job SHA不一致、注入objectとjob bytesのparse結果不一致
11. 承認済みcoreまたはrunnerの実byte差し替え、同byteの別path差し替え、許可されていないproject内import、dynamic import、expected projectionの総件数・segment件数・speech件数・raw canonical hash差
12. 全直接・展開入力のhash mismatch
13. 既存final保持、外国lock保持
14. 親symlink差し替え、処理中のfinal出現
15. 初回read後・publish前のjob、core、runner、direct input、expanded input、実基礎映像の各差し替え
16. 同じbyteを持つ入力symlinkへの差し替え
17. rename注入失敗
18. failure記録の原子的作成、job byte差の記録、UUID path既存時の非上書き

### 11.3 由来と正式決定

19. 未承認decision、payload SHA不一致、unresolved edits
20. formalization receiptのcandidate、variant、区間、frame、sample不一致
21. formalization receipt→trusted artifact summary→candidate manifest/source identity/media equivalence/basis edit planの鎖不一致
22. timeline、generation manifest、validation reportのdecision/build/timeline/hash不一致
23. validation status failed、violationsあり、固定checkの1つが不合格
24. sourceRef、sourceProvenance、元媒体SHA不一致
25. source identityの展開参照不一致、media equivalence不合格
26. candidate ID、outer range、参照artifact不一致

### 11.4 STTと発話まとまり

27. partial、chunk完了数不一致、discard/clampあり、件数不一致
28. transcriptとword timestampsのID差
29. 本文差
30. start / end時刻差
31. raw話者差
32. candidate manifestの同一speechIdコピーが不一致
33. character ID、本文、時刻の不一致
34. retained atomのspeech対応不足
35. atom ID重複、元配列開始時刻逆転、非正長
36. source atom正重なりは拒否せず記録

### 11.5 区間と出力

37. 空・逆転・正に重なる正式segment
38. atomが複数segmentへ所属
39. atomが開始または終了境界を部分的にまたぐ
40. 採用atom 0件
41. cut内atomを出力しないこと
42. publish-tmp上のsegment atomIdsからID欠落、重複、順序替え、別segment混入、count/hash改変をそれぞれ拒否
43. 同じ意味入力からsource-atoms.jsonがbyte単位で同一
44. job IDやoutput pathだけを変えてもsource-atoms.jsonが不変。job固有の生成記録・合格記録だけが変わる
45. source-atoms、generation manifestの各hash辺を個別に改変してhash graphを失敗させる
46. 固定違反コード集合とテストで観測したコード集合の完全一致
47. CLI 0 / 1 / 2
48. 実行前後の全入力file SHA不変
49. final directoryに3成果物以外がない

### 11.6 既存系の回帰

新実装の検査に加え、次を全件再実行する。

- presentation_source_speaker_contract_v002.test.mjs
- presentation_instruction_contract.test.mjs
- presentation_instruction_contract_v002.regression.mjs
- presentation_renderer_v001.test.mjs
- presentation_renderer_v002.test.mjs
- presentation_base_media_renderer_v002.integration.test.mjs

既存解決パッケージ生成器へ合成raw atomsを渡し、次も確認する。

- rawSourceAtomsCanonicalSha256が抽出成果物と一致
- unknownのnull写像が最終パッケージ生成時だけ起きる
- atomGranularityがcharacter-timestampのとき限界付き合格となる
- 正式renderer v002がINSTRUCTION_CONTRACT_PARTIALで描画前停止する

## 12. candidate 13の読み取り専用preflight

実装・合成検査後、正式出力を作らず、正式入力をmemory上で1回投影する。

期待値はアルゴリズムへ埋め込まず、preflightの照合値としてだけ使う。

| 区分 | 件数 | ID | SPEAKER_00 | unknown |
|---|---:|---|---:|---:|
| speech 1 | 126 | word-6932〜word-7057 | 119 | 7 |
| speech 2 | 122 | word-7058〜word-7179 | 106 | 16 |
| speech 3 | 106 | word-7180〜word-7285 | 100 | 6 |
| 合計 | 354 |  | 325 | 29 |

追加期待値:

- segment-0001: 248件
- segment-0002: 106件
- 正式区間内STT 354件 = candidate unique 354件
- missing 0、extra 0
- cut内atom 0件
- 境界交差0件
- source atom正重なり0件
- raw canonical SHA-256: cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3
- 現行正式話者写像を後段で行った場合の参考SHA-256: c0e627ec7c0096910991d965b04e5bd3b4e101bec0bdd4e54f0754cfd21fcac0

speechId=2はcandidate manifest内に2回あり、単純連結では476件になる。両コピー完全一致を検査してから1発話へ統合し、354件になることを明示的な回帰条件にする。

preflight後に、正式job JSON、jobの実byte SHA、実装commit、予定output pathを報告して停止する。source-atoms正式出力は作らない。

## 13. 実装完了条件と停止点

次をすべて満たした時だけ実装完了と報告する。

1. 新schema、抽出器、正式job実行器、合成testdataを実装
2. 固定違反コードを全て意図した検査で発火
3. §11の新規検査と既存回帰が全件合格
4. 同じ意味入力からsource-atoms.jsonのbyteが一致
5. 入力差し替え、既存出力、lock、symlink、rename競合を安全停止
6. candidate 13の読み取り専用preflightが§12へ完全一致
7. core、runner、合成検査とtestdataを実装commit Aとして記録
8. `git show`した実装commit A内のcore/runner bytes、実際にloadしたmodule URLと作業tree bytesを一致させてから、正式job JSONへ実装commit A、core/runnerのpath・実byte SHA、preflightの期待projectionを固定
9. 正式job JSONと実装完了報告だけをjob固定commit Bとして記録し、commit Bの前後でcore/runnerが変わっていないことを再照合
10. 完了報告にテスト件数、全違反コード発火、決定性、全入力不変、preflight値、実装binding、正式job SHA、実装commit Aを明記

この時点で停止し、次を実行しない。

- candidate 13正式jobの1回実行
- source-atoms正式出力の公開
- 最終解決パッケージ
- G1〜G3表示計画
- テロップ・演出指示書
- G4〜G7、LLM
- renderer、動画描画、確認UI
- candidate 11・12・36
- 新素材

正式job実行が承認された場合も1回だけ実行し、失敗時は設定変更・再実行をせず報告する。成功しても最終解決パッケージへ自動進行しない。

## 14. 共有文書へ回収する追記案

本設計は人間待ち中の副線なので、DECISIONS.mdとdocs/HANDOVER.mdは変更しない。主線で実装が承認された節目に次を回収する。

- 現在地を「残存source atomと抽出来歴の固定 → 指示書と最終解決パッケージの対生成」へ訂正
- 解決パッケージは指示書と対で作る専用品であり、空パッケージを先行させない
- candidate 13のSTTは文字粒度で、現行renderer v002は限界付きG2を正式描画へ通さない
- raw話者の正規化は最終解決パッケージ生成器だけの責務

## 15. 人間作業

- 本設計作成: **0件。媒体視聴なし。時間計測なし。**
- 次の判断: **実装承認1件。媒体視聴なし。目安1分未満。**
- 承認後の実装・合成検査・読み取り専用preflight: **0件。**
- 正式job実行: 実装完了報告後の別承認1件。
- 指示書、描画、人間確認: 本設計の範囲外。各段で改めて申告する。

## 16. 承認文

承認を求める範囲は、§4〜§13に記載した残存source atom抽出器、正式job実行器、合成検査、candidate 13読み取り専用preflight、正式job JSON固定までである。

正式jobの実行、解決パッケージ、演出指示書、描画は含まない。承認された場合、実装・検証・正式job固定まで進め、完了報告で停止する。
