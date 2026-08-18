# ④.5 レンダリング疎結合化 baseline差分1件 読み取り調査報告 v001

- 日付: 2026-08-18
- 調査範囲: baseline 203 ID中、差分となった1件のみ
- 実施した作用: 現物・履歴・退避原本の読み取り、退避原本1 fileのsize・SHA-256照合、本報告と裁定台帳への記録
- 実施していない作用: 追補v004、再描画、再検査、復元、複製、移動、削除、commit、tag、API通信、費用支出

## 0. CURRENT_GOAL 4項

1. 今の目的: 動画出力を別プログラムへ分けて疎結合にする。これにより同時に開発を進められ、中間生成物をレビューでき、修正の影響が小さくなって検証しやすくなり、クオリティを上げやすくなる。
2. 主計画上の現在位置: ④字幕品質v002は完了。④.5 レンダリング疎結合化（演出指示書境界の実装）の着手前として記録されている。
3. 今の作業と目的への接続: 契約設計v001に基づき、注文書・受領書・出力側行分割・新renderer runnerで「注文書を人間がレビューできる状態」を実証する工事。今回の調査は、その統合検証で出たbaseline 1差分が本工事の破壊か、既存検査の実行前提欠落かを判別するためのもの。
4. 今回やらないこと: 字幕縦型、G4〜G7、renderer表現力拡張、旧プログラム物理削除、A-v002目視合格・tag、commit・tag・公開、API通信・費用支出。加えて本指示により、追補v004・再描画・再検査・復元も行わない。

## 1. 結論

baseline差分は、caption semantic source package工程が所有するR3大容量読取回帰検査1件である。baseline上の正式な独立英数字IDはなく、識別子はordinal 74とexact test nameである。

- ordinal: `74`（comparison JSONのindexは0始まりで`73`）
- exact test name: `R3:3.38GB実fileのchunk hash/countは独立helperと完全一致し全byteを保持しない`
- oracle: passed
- 今回: failed
- 直接原因: clean checkoutに固定参照先の隠し作業directoryがなく、独立helperの最初の`lstat`が`ENOENT`になった。SHA不一致ではなく、hash開始前のpath欠落である。

この検査は、2026-07-24に「監視treeの3.38GB実fileを一つのBufferへ入れてNodeの上限で停止した」不具合を直したR3の回帰検査である。分割読取後も全byte数とSHA-256が以前の独立経路および正式生成manifestと同一であることを実データで証明する。

退避原本には対象fileが実在し、size・SHA-256とも期待値に完全一致した。したがって、今回の1差分は対象byteの破損ではなく、clean checkoutへ一時作業成果物を持ち込まなかったことにより、baselineが暗黙に依存していた実行前提が失われた事象である。

## 2. 検査の現物

### 2.1 所有工程

- 所有工程: candidate 13 caption gate B2、caption semantic source package runner
- 修正分類: R3（package・意味回答共通の、同一file descriptorからの版付きchunk読取）
- 検査source: `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs` 214〜247行
- production対象: `evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs`の読取handle
- 比較元: `evals/clip_composition/presentation_first_real_data_gate_v001.mjs`の既存公開入口

### 2.2 検査本文が行うこと

1. 固定されたworkspace相対pathとSHA-256を、chunk実装とは独立した既存公開入口へ渡す。
2. 独立入口が同じpath、file状態、全byte SHA-256を確認し、同じ参照を返すことを要求する。
3. production filesystem adapterで対象fileをread-only openする。
4. 同じfile descriptorから一回だけ使えるchunk列を読み、各chunkが非空Bufferであることを確認しながらSHA-256とbyte数を逐次計算する。全byteを一つのBufferへ保持しない。
5. 読取前後でsize・device・inode・mtimeが同一であることを確認する。

### 2.3 exact期待値

| 項目 | 期待値 |
|---|---|
| path | `evals/clip_composition/outputs/presentation/base-media/.DmWu0jVQfTE-candidate-13-v002.work-ovnjGJ/source-grid.f32le` |
| byte数 | `3,384,584,064` |
| SHA-256 | `219cd4af6e6560a0819bbca67fe36433cdb5e3f4b3260b42a5285093e9030209` |
| chunk | 全て非空Buffer |
| 読取方式 | 同一file descriptor、one-use AsyncIterable、逐次hash |
| 読取前後 | size・device・inode・mtimeがexact一致 |

正式生成manifestも、source gridのbyte数とpayload SHA-256を上表と同値で保存している。

### 2.4 なぜ3.38GB実fileのSHA一致を要求するか

R3が変えるのは「一括読取から分割読取へ」という輸送方法だけであり、監視対象と内容同一性の強度を変えない契約だったためである。

- 発端の不具合は、監視treeの3.38GB fileを一つのBufferへ読み込んだことによる資源停止だった。
- 大容量fileを監視対象から除外する案は禁止された。
- 分割読取がbyteを欠落・重複・入替していないことを、小さい合成値だけでなく障害を起こした実fileでも確認する必要があった。
- 同じ新実装同士の自己一致では証明にならないため、既存の独立公開入口と正式生成manifestをoracleにした。
- したがって、検査の意味は「この特定動画をもう一度検査すること」ではなく、「大容量でも監視対象の全byteを保持せず、byte数と内容SHAを弱めずに読み切れること」である。

## 3. 一時作業directoryへの依存が生まれた理由と経緯

### 3.1 fileの生成上の位置づけ

基礎映像builderは、正式出力directoryとは別に、同じ親の下へ次の二種類を作る。

- `.<output>.publish-tmp-*`: 正式成果物を組み立て、最後に正式出力へrenameする公開用一時directory
- `.<output>.work-*`: `source-grid.f32le`、encode用PCM、video-only等を置く作業directory

`source-grid.f32le`はFFmpegが元音声をfloat PCMへ展開した作業fileであり、正式出力へpublishされるfileではない。正式出力には動画・timeline・generation manifest・validation reportが入り、source grid本体は入らない。

builderの`finally`は自動削除を行わず、file handleだけを閉じる。source commentは、path指定削除ではancestor交換とのraceを完全に閉じられないため、temporary/work/lock pathを診断用に残すと明記する。返却値にも`retain-without-automatic-delete-v001`としてworking directoryを記録する。よって、このwork directoryが残ったこと自体は偶発的な掃除漏れではなく、当時の安全・診断方針による意図的保持である。

### 3.2 検査導入の経緯

1. 2026-07-24のB2全件検査で、監視tree内の3.38GB実fileを一つのBufferへ入れる読取が原因根R3として確定した（DECISIONS 512行）。
2. kawafmm裁定は、package・意味回答の両方を同一file descriptorのchunk読取へ変え、監視範囲・SHA-256・三時点状態照合を維持し、大容量fileを除外しないとした（DECISIONS 513行）。
3. R3修正設計は、障害を実際に起こした上記work fileを代表実fileとしてexact path・size・SHAで登録した。欠落時に代替fileを探さず停止することまで明記した。
4. commit `42e26ea058f896ef32102d18b37320cb4f71ed95`（2026-07-24 08:47 JST）でproductionのchunk読取と本検査を導入した。R3基礎検査4/4は合格した（DECISIONS 515行）。
5. その後も2026-07-25、07-26、08-03、08-08、08-09、08-15、08-16の保存TAPで本検査は合格し、2026-08-09のbaseline oracleではordinal 74のpassedとして固定された。
6. 2026-08-17のclean checkoutでは、正式成果物だけが正本にあり、git管理外のwork directoryは体制変更前workspaceの退避原本に残った。そのため2026-08-18のbaseline実行で初めてpath欠落が表面化した。

### 3.3 「設計上意図されたか、経緯的にそうなっただけか」の判定

事実は二層に分かれる。

- **意図されたこと**: 3.38GB実fileで逐次hashを検査すること、このexact work pathを代表値として固定すること、欠落時に代替を探さず停止すること。これは契約設計・DECISIONS・test sourceに明記されている。
- **恒久fixtureとしては設計されなかったこと**: work fileを正式成果物または版付きfixtureとしてpublishする処理、clean checkoutへ供給する製造job、receipt/admission、保存場所の所有者は定義されていない。正式manifestが保存するのはsize・SHAであり、3.38GB本体ではない。

したがって、**大容量実データ回帰を持つ意図は明確だが、baselineがランダムsuffixを含む診断用作業directoryの実在へ恒久依存した状態は、当時そこに残っていた障害実物を直接oracle化した経緯的結合である**。検査の意味は意図されたが、そのfixture lifecycleは閉じられていなかった。

## 4. 退避原本の読み取り照合

### 4.1 体制変更前workspace退避原本

- 退避root: `/Users/kawafmm/workspace/zev2-archive-before-three-party-operations-foundation-20260817-v001`
- 対象: 上記root配下の同一workspace相対path
- 実在: **あり**
- file種別: regular file
- size: `3,384,584,064` byte — 期待値と一致
- mtime: `2026-07-22 15:05:23 +0900`
- SHA-256: `219cd4af6e6560a0819bbca67fe36433cdb5e3f4b3260b42a5285093e9030209` — 期待値と一致

SHA-256は退避原本を全byte読み取って実測した。複製・移動・変更・復元は0件。

### 4.2 未承認基盤工事の退避folder

- 退避root: `/Users/kawafmm/workspace/zev2-archive-three-party-operations-foundation-unapproved-20260817-v001`
- 同一workspace相対path: **なし**

この退避folderは基盤工事の112 fileだけを保持するものであり、対象3.38GB fileは含まれない。

## 5. 今後の扱いの選択肢

決定はkawafmmが行う。ここでは実施しない。

### 選択肢A: exact pathへ復元し、現baselineをそのまま維持する

退避原本のbyteをclean checkoutの固定pathへ戻す。

- 良い点: 203件の名称・順序・合否を一切改訂せず、過去の回帰検査を即座に再現できる。
- 影響: clean checkoutが3.38GBのgit管理外fileを暗黙に必要とし続ける。次のcheckout・退避・掃除で同じ問題が再発する。固定fixtureの所有・供給・admissionが未定義のままなので、恒久解決ではない。
- 必要な判断: 復元の承認と、復元fileを誰がいつまで所有するか。

### 選択肢B: この1件をbaselineの合格基準から外す

203 exact比較から本検査を除外する、または既知の環境依存不合格として扱う。

- 良い点: clean checkoutで3.38GBの作業fileを要求しない。
- 影響: 大容量fileで「全byteを保持せず、全byte数とSHAを弱めずに読み切る」回帰が通常baselineから失われる。検査source自体を残すだけでは、毎回失敗する検査を見ない扱いになる。baseline契約・oracleの改訂が必要。
- 注意: ただ外すだけでは検証強度が落ちるため、単独採用は最も弱い選択肢である。

### 選択肢C: 検査を別工事の大容量回帰gateへ移す

一般baselineから分離し、3.38GB fixtureを用意できる環境だけで実行する版付きgateとして所有する。

- 良い点: 通常baselineの可搬性と、大容量実データ回帰の意味を分離できる。
- 影響: baseline 203の改訂、別gateの実行条件・保管場所・実行頻度・未実行時の扱いを契約化する工事が必要。別gateを常時回さなければ検出時期は遅くなる。
- 必要な判断: baseline改訂と別工事への移管を認めるか。

### 選択肢D: 大容量fileを正式な版付きfixtureへ昇格し、検査を安定pathへ付け替える

退避原本または再現可能な正式製造工程から、専用fixture root、manifest、receipt/admissionを持つ大容量回帰fixtureを定義し、ランダムなwork pathではなく安定したbindingを検査する。

- 良い点: R3の検証強度を維持しながら、clean checkoutで必要なfixtureの所在と来歴を明示できる。今回見つかったfixture lifecycle欠落を直接閉じる。
- 影響: 3.38GB本体の保管・配布・作業領域負荷、fixture製造または取得、path/binding、baseline oracleの版付き改訂が必要。raw fileをgitへ直接入れるかどうかも別途決める必要がある。
- 位置づけ: 検証強度を維持する恒久案としては最も整合的だが、独立した契約設計を要する。

## 6. 選択に必要な一問

このR3大容量回帰を、今後も通常baselineの必須検査として常時所有するか。それとも、通常baselineから分離した大容量回帰gateとして所有するか。

この判断が、A/D系（通常baselineで維持）とC系（別gateへ移管）の分岐である。B（単純除外）は検証強度を失うため、採る場合はその弱化を明示的に受け入れる必要がある。

## 7. 外部作用と停止

- API通信: 0回
- 費用: US$0
- commit / tag / 公開: 0件
- 退避原本への書込み: 0件
- 復元 / 複製 / 移動 / 削除: 0件
- 追補v004 / 再描画 / 再検査: 0件

本報告と裁定台帳への記録後、追加作用を停止する。
