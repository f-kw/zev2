# ZEVO字幕品質v002 B6 credential不存在code所有 最小追補 v005

- 日付: 2026-08-11 JST
- 状態: 起草提示。未承認、未実装
- 対象: 有効なB6 jobで`GEMINI_API_KEY`が不存在または空文字列である通信前fatalの所有
- 起点HEAD: `542b35684a3ad67dbab042ca2bb3bff022e42023`
- 外部通信: 0回
- 費用: US$0
- 実装・検査・描画: 0件

## 0. 結論

有効なB6 jobがB5成果物と固定generate requestの再読を完了した後、実行processの`GEMINI_API_KEY`が不存在または空文字列である場合を、新code `CUE_PROVIDER_CREDENTIAL_UNAVAILABLE`が所有する。

この枝はHTTP呼出し0回の独立fatalである。CLI stageとfailure report stageは既存閉語彙の`provider-transport`を使うが、`CUE_PROVIDER_TRANSPORT_FAILED`へは写さない。failure reportのinner codeは新しい`credential-unavailable`とする。`CUE_PROVIDER_TRANSPORT_FAILED`は追補v004どおり、HTTP request開始後のnetwork・timeout・non-responseだけを所有する。

code集合を48から49へ変更する。検査IDは46件のまま、ZCQ015を新codeの唯一のownerとする。既存proof item 7件をexact失効し、V5 proof item 8件へ置換するため、proof item総数を488から489へ変更する。

本書は追補の起草だけを行う。atomic部分実装3 pathは停止報告のSHA証拠を保持したまま変更せず、機能検査、S→A→L→P→R→F→U、正式46件、API通信、描画へ進まない。

## 1. 正本と適用順

| 種別 | path | SHA-256 | 扱い |
|---|---|---|---|
| 親契約 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md` | `33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba` | 不変 |
| 完全実装設計 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md` | `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4` | 本書がB6 credential枝だけを上書き |
| 累積追補v002 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md` | `a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d` | 不変 |
| 実値配線追補v003 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md` | `632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e` | 不変 |
| atomic公開・B6所有追補v004 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md` | `39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade` | 本書がcode・contract・proof数量の該当箇所だけを上書き |
| 契約閉包停止報告 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-v004-implementation-contract-closure-stop-report-20260811-v001.md` | `c7f3ce7d52c23d37ca34c2a5f9f6c6cb584153b4b066fed8abc56ca6cc6a6d45` | 発見事実と部分実装SHAの証拠として不変保持 |

本書が承認された場合の適用順は、親契約→完全実装設計→累積追補v002→実値配線追補v003→atomic公開・B6所有追補v004→本書である。本書が明示するB6 credential枝、contract binding件数、code件数、proof集合だけを差し替え、他の意味を変更しない。

## 2. 実現性調査

### 2.1 現物の分岐

| 項目 | 現物観測 | 判定 |
|---|---|---|
| credential供給元 | `run_presentation_output_caption_cue_b5_b6_v001.mjs:2226`が`process.env.GEMINI_API_KEY`だけを読む | 既存正本を維持できる |
| 不存在判定 | 同file 2228で既存`nonempty`を使う。process環境値が`undefined`または長さ0の文字列なら不成立 | 新しいtrim・形式検査は不要 |
| 発生時点 | B5 13成果物と固定requestの再読・byte一致後、endpoint製造とgenerate transport呼出しより前 | HTTP 0回を実測できる |
| 現行写像 | `provider-transport/network-transport/CUE_PROVIDER_TRANSPORT_FAILED` | v004 §6.3と不一致。置換が必要 |
| failure report stage | `provider-transport`が既存許可語彙に実在 | stage追加なしで表現できる |
| failure report inner code | 現行13値にcredential専用値なし | 一値追加が必要 |
| failure report `executedAt` | context初期値`null`で、HTTP開始直前の時刻設定より前 | 通信前を既存fieldで証明できる |
| transport呼出し回数 | test capabilityを渡す正式入口が実在し、呼出しcounterを観測できる | HTTP 0回を推測せず証明できる |

### 2.2 既存codeへ寄せない理由

| 候補 | 不採用理由 |
|---|---|
| `CUE_PROVIDER_TRANSPORT_FAILED` | v004がHTTP request開始後のnetwork・timeout・non-responseだけへ純化済み |
| `CUE_B6_JOB_INVALID` | job、B5 manifest、固定requestは全て有効であり、job不正ではない |
| `CUE_B6_INPUT_REREAD_FAILED` | B5成果物・固定requestのstable再読失敗だけを所有し、process credentialはfile再読ではない |
| `CUE_API_PUBLICATION_FAILED` | credential確認時点ではraw・report・rootの公開失敗が起きていない |

### 2.3 実現性判定

新しい外側code一件とfailure report inner code一値の追加だけで、status、終了code、成果物key、通信回数、secret規則を変えずに閉じられる。既存production/test path内の限定修正であり、18 path目、新しいprovider transport、credential file、fallbackは不要である。

実現性調査は、actual入力`process.env.GEMINI_API_KEY`→既存`nonempty`判定→停止object→failure report→CLI結果→ZCQ015/ZCQ016の観測まで現物で逆引きした。使用を約束する新export、新しいI/O、新しい成果物pathは0件である。

## 3. code名・順序・所有

### 3.1 外側code

固定code列で、`CUE_B6_INPUT_REREAD_FAILED`の直後、`CUE_PROVIDER_TRANSPORT_FAILED`の直前へ次を一件追加する。

| code | 意味 | 唯一のowner検査 |
|---|---|---|
| `CUE_PROVIDER_CREDENTIAL_UNAVAILABLE` | 有効なB6 jobが通信前入力再読を完了した後、実行processの`GEMINI_API_KEY`を文字列として取得できない、または値が空文字列である | ZCQ015 |

該当する値は`undefined`または長さ0の文字列だけである。空白除去、形式検査、credentialの有効性確認をローカルで追加しない。非空文字列は保存・出力せず既存transportへだけ渡し、providerによる認証拒否はHTTP応答側の既存検査へ委ねる。

code集合は49件となる。既存48 codeの順序と意味は、新code挿入位置より後のordinal以外は不変である。49 codeのowner集合、production実枝集合、実発火集合を49/49でexact一致させる。

### 3.2 実行結果のexact写像

| 項目 | 固定値 |
|---|---|
| HTTP request回数 | 0 |
| generate transport capability呼出し回数 | 0 |
| automatic retry | 0 |
| CLI status / exit | `fatal` / `2` |
| CLI stage | `provider-transport` |
| CLI primaryCode | `CUE_PROVIDER_CREDENTIAL_UNAVAILABLE` |
| failure report schemaVersion | `presentation-output-caption-cue-b6-failure-report-v001`（不変） |
| failure report stage | `provider-transport` |
| failure report innerCode | `credential-unavailable` |
| failure report executedAt | `null` |
| failure report targetFile | `null` |
| failure report evidenceBindings | `[]` |
| 正式成果物集合 | `b6-failure-report.json`一件だけ。report製造・再読・atomic root公開が成立しない場合は正式root 0件、検査済みstaging保持、CLI-only |

CLI/failure reportの`stage=provider-transport`は「provider呼出し工程への入場」を表す既存の広い段階名であり、HTTP開始済みを主張しない。HTTP開始の有無は`executedAt=null`、transport呼出し0回、新しいprimary/inner codeの組で一意に示す。`CUE_PROVIDER_TRANSPORT_FAILED`の意味は広げない。

failure reportのinner code固定順は、`file-read,file-changed,request-byte-mismatch,credential-unavailable,network-transport,timeout,secret-leak,raw-write,envelope-invalid,envelope-write,manifest-write,no-replace,report-write,unclassified`の14値へ置換する。schemaVersionとexact key集合は変更しない。

### 3.3 checksのexact状態

credential不存在枝でfailure reportへ入るとき、checksは次へ固定する。

| check | 値 |
|---|---|
| `jobBinding` | `passed` |
| `b5Binding` | `passed` |
| `requestBinding` | `passed` |
| `transport` | `failed` |
| `rawPublication` | `blocked` |
| `envelopeValidation` | `blocked` |
| `envelopePublication` | `blocked` |
| `manifestPublication` | `blocked` |
| `rootPublication` | `passed`（failure reportのatomic公開成立時） |
| `failurePublication` | `passed`（failure reportの製造・再読・atomic公開成立時） |

failure report自身の書込み・再読・atomic公開が失敗した場合は、既存`CUE_API_PUBLICATION_FAILED`が所有する。credential不存在をpublication failureへ置き換えない。

### 3.4 secret保証

credentialの値は、存在判定と既存transportへの引渡し以外に使わない。不存在枝では値を成果物、TAP、stdout、stderr、error、manifest、report、binding、対象fileへ投影しない。`targetFile=null`とし、credential fileやplaceholder fileを作らない。既存のrequest/raw/正式候補byteに対するsecret検査は不変である。

## 4. approved contract binding

本書が承認されたときの実測SHAを、role `caption-quality-b6-credential-unavailable-owner-addendum`、path `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-b6-credential-unavailable-owner-addendum-20260811-v005.md`として該当formal jobへ追加する。

| job | v004後 | v005後 | 理由 |
|---|---:|---:|---|
| source | 4 | 4 | B6 runnerを使用しない |
| B5 | 4 | 4 | credential確認・generate transportを実行しない |
| B6 | 4 | 5 | 本codeの実行owner |
| selection | 5 | 6 | B6成果物を正式入力として受け、B6 runner実装を束縛する |
| proof | 5 | 6 | selectionを経由してB6来歴を閉じ、同じ現行実装集合を束縛する |

B5/B6が同じproduction fileに同居していても、approved contract集合はjobごとの実行意味で分ける。implementation binding件数はsource/B5/B6/selection/proofの順に36/11/19/41/51で不変であり、同一fileの変更は既存live SHA束縛が検知する。source/B5へ不要な契約来歴を追加しない。

## 5. 検査のexact所有

### 5.1 ZCQ015

ZCQ015へ次の独立subcaseを追加する。

1. 有効なB6 job、B5 13成果物、固定request、atomic publisherを用意する。
2. `GEMINI_API_KEY`がprocess環境に存在しない状態と、空文字列である状態を別々に作る。生keyは用意しない。
3. generate transportには、呼ばれた回数だけを増やすinstrumented capabilityを渡す。
4. 両状態でtransport呼出し0回、retry 0回、`fatal/2/provider-transport/CUE_PROVIDER_CREDENTIAL_UNAVAILABLE`、failure reportの`provider-transport/credential-unavailable`、`executedAt=null`、`targetFile=null`を実観測する。
5. `CUE_PROVIDER_TRANSPORT_FAILED`は、別subcaseでHTTP呼出しが一回開始されたnetwork・timeout・non-responseの三枝だけから観測する。

ZCQ015を新codeの唯一のownerとする。環境変数の存在確認だけを静的assertへ置換せず、runner実経路とfailure report byteを使う。

### 5.2 ZCQ016

ZCQ016はcredential不存在枝の成果物集合とchecksを実再読する。failure report一件以外のraw、envelope、manifestが0件であること、failure report公開不能枝では正式root 0件・staging保持になることを検査する。ZCQ016は新codeの所有者にはならず、保存境界の検査だけを担う。

### 5.3 起動・環境

正式検査は固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、native環境、Chromium起動可能、FFmpeg/FFprobe実体・SHA照合の既存checklistを使う。credential不存在subcaseは検査process内の限定区間または専用childの環境を明示的に作り、他subcaseへ環境状態を漏らさない。watcher、polling、timer、外部通信を使わない。

## 6. proof itemのexact置換

### 6.1 失効7件

次のV4 proof item 7件だけを新attemptの期待集合から除外する。承認済みv004本文と過去TAPは変更しない。

| 失効ID | 失効理由 | 置換先 |
|---|---|---|
| `V4-ZCQ007-02` | B5/B6 contract各4件という要求がB5=4、B6=5へ変わる | V5-ZCQ007-01 |
| `V4-ZCQ015-03` | B6全failure owner集合にcredential不存在枝がない | V5-ZCQ015-01、V5-ZCQ015-02 |
| `V4-ZCQ016-09` | code集合48件の要求 | V5-ZCQ016-01 |
| `V4-ZCQ018-01` | selection contract 5件の要求 | V5-ZCQ018-01 |
| `V4-ZCQ018-03` | selection contract 5件の不正拒否要求 | V5-ZCQ018-02 |
| `V4-ZCQ027-04` | selection contract 5件の公開直前照合要求 | V5-ZCQ027-01 |
| `V4-ZCQ042-01` | proof contract 5件の要求 | V5-ZCQ042-01 |

0件、8件以上、表外proofの除外、ID不一致なら正式attemptを開始しない。

### 6.2 V5件数表

| ID | V5追加 | V4失効 | 改訂後ID合計 |
|---|---:|---:|---:|
| ZCQ007 | 1 | 1 | 17 |
| ZCQ015 | 2 | 1 | 15 |
| ZCQ016 | 1 | 1 | 31 |
| ZCQ018 | 2 | 2 | 30 |
| ZCQ027 | 1 | 1 | 34 |
| ZCQ042 | 1 | 1 | 36 |

記載のない40 IDはV5追加0・V4失効0で既存件数不変である。

### 6.3 V5-PROOF-ITEMS-BEGIN

- V5-ZCQ007-01 | B5のapproved contract bindingが4件、B6が本書を含む5件で、正式ID literalと各role/path/SHA集合へexact一致する
- V5-ZCQ015-01 | 有効B6 jobのB5 13成果物・固定request再読完了後にGEMINI_API_KEY不存在または空文字列を別々に実発火し、generate transport 0回・retry 0回・fatal終了2・CLI provider-transport/CUE_PROVIDER_CREDENTIAL_UNAVAILABLE・failure report provider-transport/credential-unavailable・executedAt null・targetFile null・secret保存0件を実観測する
- V5-ZCQ015-02 | B6全failure枝のowner集合を照合し、CUE_PROVIDER_TRANSPORT_FAILEDはHTTP request開始後のnetwork・timeout・non-response三枝だけ、credential不存在はCUE_PROVIDER_CREDENTIAL_UNAVAILABLEだけが所有する
- V5-ZCQ016-01 | 各owner IDが保存した実観測を再発火せず集計し、49 codeのowner集合・production実枝集合・実発火集合を49件exactで照合し、credential不存在枝ではfailure report一件以外のraw/envelope/manifest 0件とchecksの固定状態を実再読する
- V5-ZCQ018-01 | selection implementation 41件とapproved contract 6件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V5-ZCQ018-02 | selection approved contract 6件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否し、meaning/style/base/media実値binding不一致だけをCUE_SELECTION_INPUT_BINDING_MISMATCHの単一owner枝で実発火する
- V5-ZCQ027-01 | selectionのapproved contract 6件とatomic helper 3 bindingを公開直前まで照合する
- V5-ZCQ042-01 | proof implementation 51件とapproved contract 6件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する

### 6.4 V5-PROOF-ITEMS-END

V5は上記marker間で行頭がexact `- V5-ZCQ`の8行を取り、` | `より前をproof item ID、後を要求本文として読む。ID重複、ordinal欠落、記載件数と抽出件数の差を不成立とする。

新しい期待集合はexact `((V4適用後の488件) − SUPERSEDED_V5) ∪ V5`である。`SUPERSEDED_V5`は§6.1の7 ID、V5は§6.3の8 IDだけとする。したがってproof item総数は489件となる。期待489件、test source宣言489件、TAP observed 489件、TAP passed 489件をexact一致させる。検査IDは46件のまま、静的文字列存在、定数同士の比較、代表枝の転記を実発火に数えない。

## 7. atomic部分実装3 pathの扱い

停止報告§4の次のSHAを部分実装証拠として保持する。

| path | 停止時SHA-256 | 扱い |
|---|---|---|
| `evals/clip_composition/presentation_atomic_directory_publish_v001.mjs` | `7dac5ada527c2f73b08c385a119e921c1e3777054b99c5679175a1b8b00e41c6` | 現状pathを保持。削除・再作成・別pathへのcopy禁止 |
| `evals/clip_composition/presentation_atomic_directory_publish_v001.c` | `6c237ceac499a83db74324165d630e14857a86165267cdbbc88c46b92c01150c` | 同上 |
| `evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64` | `15f73dcf286ebed88300bb7ad8366f2b31631288816ceb4c9edd3f509d71e02c` | 同上。Mach-O arm64、mode 0555 |

本書起草では3 pathを変更しない。後続実装承認時は、開始時に上表SHAを照合し、同じpathを継続実装する。履歴を消すための削除・再作成はしない。v004 §10が要求する隔離再buildは正式path #17を作り直す行為ではなく、別の一時領域でsource/binary対応を比較する検査なので維持する。開始SHAが一件でも異なれば修正せず停止する。

## 8. 実装差分と再開順

本書が別途実装承認された場合だけ、次の限定差分を適用する。

1. A productionのcode列へ§3.1の一件を追加する。
2. B6 credential不存在枝を§3.2へ置換し、failure report inner codeを14値へする。
3. B5/B6のapproved contract集合を分離し、B5=4、B6=5へする。
4. L/Fのapproved contract集合をselection/proof各6件へする。
5. A/L/F testの旧7 proofをexact失効し、V5 8件を専用assertへ割り当てる。
6. #15〜#17の開始SHAを再照合し、v004 §10第3手の隔離再build、helper protocol、APFS成功・late collision実発火から再開する。
7. 成立後だけ、v004 §10どおりS→A→L→P→R→F→U、正式46件、49/49 code、489/489 proof、既存回帰・tree照合へ進む。

本書はAPI通信、countTokens、generateContent、費用支出、正式描画を承認しない。

## 9. 停止条件

v004 §11を維持し、数量を17 path、49 code、46検査ID、489 proof、approved contract 4/4/5/6/6へ読み替える。加えて、次の一件でも成立したら同attemptで直さず停止する。

- credential不存在をHTTP transport失敗、job不正、入力file再読失敗、publication失敗へ寄せる必要が出る。
- 新しいCLI/failure report stage、credential file、secret投影、credential形式検査が必要になる。
- `GEMINI_API_KEY`の生値をTAP・report・error・stdout・stderrへ保存する必要が出る。
- 49 codeのowner・production実枝・実発火、または489 proofが一件でも閉じない。
- §6.1の7 ID以外のproofを失効する必要が出る。
- atomic部分実装3 pathの開始SHAが停止時証拠と異なる。

API通信0、費用US$0、既存正式成果物・stable tag不変を維持する。

## 10. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 現物照合 | closed | credential供給、判定、停止、failure report、検査ownerを行位置まで確認 |
| actual引数逆引き | closed | process環境→nonempty→停止object→report→CLI→ZCQ015/016を連続確認 |
| code閉包 | closed at design | 新code名・順序・owner・49件を固定 |
| stage/inner code | closed | CLI/report stage、inner code順、status/exitを固定 |
| 成果物集合 | closed | report一件または正式root 0件へ固定 |
| contract binding | closed | 4/4/5/6/6とrole/pathを固定 |
| proof閉包 | closed | 7失効、8追加、総489件を固定 |
| path閉包 | unchanged | 17 path、18 path目0件 |
| secret | unchanged | credential値を保存・報告・対象file化しない |
| API・費用 | outside scope | 通信0、費用US$0 |
| atomic部分実装 | frozen | 3 SHAを証拠保持し、本書起草では変更0 |

## 11. 人間作業量

本書の承認判断一件、目安5分である。判断対象は、新code `CUE_PROVIDER_CREDENTIAL_UNAVAILABLE`、CLI/report stage `provider-transport`、inner code `credential-unavailable`、contract binding 4/4/5/6/6、49 code、489 proofの六点である。

## 12. 承認依頼文案

> 相談役レビュー済み。kawafmm裁定: ZEVO字幕品質v002 B6 credential不存在code所有 最小追補v005を承認する。有効なB6 jobがB5成果物と固定requestの再読を終えた後、実行processの`GEMINI_API_KEY`が不存在または空文字列であるHTTP 0回のfatalを、新code `CUE_PROVIDER_CREDENTIAL_UNAVAILABLE`が唯一所有する。codeは`CUE_B6_INPUT_REREAD_FAILED`の直後・`CUE_PROVIDER_TRANSPORT_FAILED`の直前、CLI/failure report stageは`provider-transport`、failure report inner codeは`credential-unavailable`、status/exitはfatal/2、executedAt・targetFileはnull、正式成果物は安全に公開できたfailure report一件だけとする。provider transport codeはHTTP開始後のnetwork・timeout・non-responseだけのまま維持する。approved contract bindingはsource/B5/B6/selection/proofの順に4/4/5/6/6、codeは49件、検査ID46件、旧V4 proof 7件をexact失効してV5 8件へ置換しproof item489件とする。停止報告§4のatomic部分実装3 pathはSHA証拠を保持して同じpathで続行し、削除・再作成しない。本承認でv004 §10第3手のatomic機能検査から実装再開してよい。API通信、countTokens、generateContent、費用支出、正式描画は別承認、改訂後の停止条件を維持する。

本書はここで停止する。
