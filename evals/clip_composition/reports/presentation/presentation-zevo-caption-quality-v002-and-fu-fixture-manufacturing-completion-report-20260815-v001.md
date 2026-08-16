# ZEVO字幕品質v002＋F/U fixture製造 機械検証完了報告 v001

日付: 2026-08-15

## 1. 結論

改訂済み完了条件を全て満たし、ZEVO字幕品質v002とF/U fixture製造工事の**機械検証を完了**した。

- F/Uを含む全局所gate: 合格
- 正式検査: 48/48
- 証明項目: 523/523
- 既存直接影響test: 0件
- baseline: 86/203、保存済み正本とのID別差分0件
- 既存5系統: 5/5 tree一致
- A-v002記録対象: commit所属2,887 fileの欠落0・byte差0

green全件合格は本工事の完了条件ではない。現行実測は526/538・12不合格であり、合格とは主張しない。12件は独立工事「旧green・旧レンダラー信頼台帳の現行再確定」へ送った。

API通信、費用支出、正式描画、commit、stable tagは行っていない。

## 2. 工事が成立させたもの

### 2.1 ZEVO字幕品質v002

意味情報側の文字・時刻・A-v002文字保持契約を変えず、出力側で次を成立させた。

- 意味小単位ごとに字幕を置き換える表示計画
- providerが選ぶcue終端・行末と、機械が復元する本文・時刻の分離
- 一行で収まる短い字幕を改行しない行計画
- 検証済みbinding、正式ID、時間写像、fade、描画計画までの全量閉包
- 正常・拒否・棄権・fatal・公開失敗を、49の閉じた分類と正式証拠で検査

API回答による境界選択と正式再描画は別承認であり、本報告は実装と機械検証の完了である。

### 2.2 F/U fixture製造

F/U検査が内部で一時入力を合成する方式を廃し、次へ置換した。

- 44入力payload、600環境行、26保持条件を一つの版付きpackageとして製造
- packageは48 fileを排他的に公開
- receiptがpackageのbyte、schema、SHA、環境、consumerのpath規則を受入検査
- F/Uは同じreceiptを受け入れた後だけ開始
- 既使用rootは削除・再利用せず、再attemptごとに新しいfixtureSetを製造

この結果、F/Uへ渡す正常入力・負例・filesystem状態を、検査本体から独立して再現できる。

## 3. gate別結果と証拠

### 3.1 正式48件

| gate | ID | 結果 | TAP SHA-256 |
|---|---|---:|---|
| Source | ZCQ001〜006 | 6/6 | `d38d27e9d0d896c963114703bf3f7b3c8b7f98f7b8790cf20abab28af3598341` |
| API準備 | ZCQ007〜017 | 11/11 | 同上 |
| Selection | ZCQ018〜027 | 10/10 | 同上 |
| Page/line planner | ZCQ028〜037 | 10/10 | 同上 |
| Render plan | ZCQ038〜041 | 4/4 | 同上 |
| Fixture製造・admission | ZCQF001〜002 | 2/2 | 同上 |
| Proof | ZCQ042〜044 | 3/3 | 同上 |
| Review/completion | ZCQ045〜046 | 2/2 | 同上 |
| 合計 | 48 ID | 48/48 | 同上 |

- 正式48件TAP: `test-runs/20260815-zevo-caption-quality-v002-formal-48-attempt-0001/tap.txt`
- 証明項目: 523行を観測し、523/523が`passed`。
- stderr: 0 byte、終了code: 0、signal: none。

### 3.2 独立した局所証拠

| gate | 結果 | TAP SHA-256 |
|---|---:|---|
| Fixture製造・admission | 2/2、fixture proof 34/34 | `1c78676adaac0e52567dce999a0956b052a002aa4329adfe3b7b9a530c822083` |
| F | 3/3 | `eef27bd3a55d63d9fb689f19df773a3dbed52bc5c4b0cfa034fdb2dbd6a15a64` |
| U | 2/2 | `34c71e06ef01ff253db4e7e913912c7e2ac0dfc7a0b548144c8d9d3d8f405566` |

局所TAPはそれぞれ版付きattempt rootへ保存し、TAP・stderr・終了code・signalを独立fileで保持した。

## 4. 既存への影響

### 4.1 reverse consumer graph

- 対象実装: 19 path
- 全test source: 67
- 正式48件を所有するconsumer: 8 test source
- その他の既存consumer: 0 test source

従って、既存直接影響testは0件である。今回の実装を使うconsumer検査は正式48件の内部へ全て閉じている。

- 一件表: `presentation-zevo-caption-quality-v002-reverse-consumer-graph-20260815-v001.json`
- SHA-256: `1b611c2a348cfd9fe9372b05fc2c9a09f72e8fe00427ec35eec60f357184621a`

### 4.2 baseline

| 項目 | 保存済み正本 | 今回 | 差 |
|---|---:|---:|---:|
| tests | 203 | 203 | 0 |
| pass | 86 | 86 | 0 |
| fail | 117 | 117 | 0 |
| cancelled / skipped / todo | 0 / 0 / 0 | 0 / 0 / 0 | 0 |
| ID別順序・名称・合否 | 203 | 203 | 0 |

- TAP SHA-256: `a774b31720e2202a9786048105a9ab6b80a337d044ab09de5aa8b0113a7acd61`
- ID別比較記録 SHA-256: `1f1b6dd7776bc42d75a819dec57c84c6e4562a8c798f2d7753f35fc76cb33e91`

### 4.3 既存5系統

| ID | tree | file数 | 結果 |
|---|---|---:|---|
| FOVT001 | `27affa2cff1e099d263f5a00ed9c4558be1300bd` | 25 | 一致 |
| FOVT002 | `454fcf002ac90b0d6ce72f63f55476ed9f8ffc72` | 21 | 一致 |
| FOVT003 | `53076722863d2c36d470cc4ce9503739406ec03a` | 35 | 一致 |
| FOVT004 | `ce2f5807db5ff63b83e1200bcec9f40796210327` | 35 | 一致 |
| FOVT005 | `5e65c51ad30a65f43b087a71b50f6172162b2c49` | 42 | 一致 |

- TAP SHA-256: `c3ecc8a213e1474982f76b61ed736b48e4ee2524c0e3b08a45cd5cfd00521927`

### 4.4 A-v002と照合境界

kawafmm裁定により、照合境界は記録commit `542b35684a3ad67dbab042ca2bb3bff022e42023`に所属する2,887 fileとする。

- 記録tree: `2b683b0d82672789bccd1508bc2c7c914c196750`
- 欠落: 0件
- byte差: 0件
- 結果: 合格

物理rootは2,941 fileで、commit外の描画作業fileが54件ある。この54件は全件のpath・size・SHA-256・mtimeを台帳化し、54/54が記録commit以前のmtimeであることを確認した。本工事が触れた可能性は観測されない。

- 台帳: `presentation-a-v002-untracked-renderer-work-ledger-20260815-v001.json`
- 台帳 SHA-256: `59499b05ce9f218d883d24c93d3c5f5ba40f1ed620c372ccb16a9b086dc9ee48`
- 54件合計: 95,039,010 byte
- 未追跡作業fileの削除・移動・commit: 0件

未追跡作業fileの正式な配置・列挙境界は、本工事で決めず「旧green・旧レンダラー信頼台帳の現行再確定」の要裁定資料へ接続した。

## 5. green実測と12不合格

保存済みfixture gate 2/2を含む現行green実測は**526/538、12不合格**である。これは本工事の完了条件から分離済みであり、全green合格とは主張しない。

- green TAP: 524/536、SHA-256 `fe0910b792546bee0a8c218b946cca2b0c48d0b22315420765bd4c2e03aea189`
- fixture gate: 2/2、SHA-256 `1c78676adaac0e52567dce999a0956b052a002aa4329adfe3b7b9a530c822083`
- 合成会計: 526/538

| 帰属 | ID | 件数 | 結論 |
|---|---|---:|---|
| 旧fixture・固定期待の不整合 | OBM001、OPF002、OPF012 | 3 | 後続契約・現行実装・現行TSX起動形へ旧期待が追随していない。今回F/U production欠陥ではない |
| filesystem列挙の広義影響 | OPF004、OPF015、OPF016 | 3 | 全未追跡path・registry全treeの旧監視と成果物蓄積が衝突。今回成果物も寄与するが単独原因ではない |
| 旧E2E内側の帰属未確定 | OEE001、OEE002、OEE005、OEE006、OEE007、OEE008 | 6 | 今回19 path参照0件。保存証拠だけで旧E2E内側の三分法は確定不能。推測せず独立工事へ送る |

全未追跡名の出力量1,945,028 byteのうち、本工事分は655,800 byteである。本工事分を除いても1,289,228 byteで1 MiBを超えるため、同期buffer失敗の単独原因ではない。

## 6. fixtureSetId全履歴

### 6.1 selftest

| fixtureSetId | 結果 | 保持状態 |
|---|---|---|
| `zevo-caption-quality-v002-fixture-selftest-20260815-attempt-0001` | package親準備・receipt検査順で停止 | job・TAP等を保持、package公開前 |
| `...attempt-0002` | package公開後、Buffer凍結でadmission停止 | root・証拠保持 |
| `...attempt-0003` | 2/2、34/34合格 | root・receipt保持 |
| `...attempt-0004` | consumer basename規則を含め2/2、34/34合格 | root・receipt保持 |
| `...attempt-0005` | 正式48件内で2/2合格 | root・receipt保持 |

### 6.2 F/U formal

| fixtureSetId | 結果 | 保持状態 |
|---|---|---|
| `zevo-caption-quality-v002-fu-formal-20260815-attempt-0001` | 48 file製造合格、旧環境検査残置でF開始前停止 | root・receipt・証拠保持 |
| `...attempt-0002` | 48 file製造合格、`null`をoverride対象にした閉包検査で停止 | root・receipt・証拠保持 |
| `...attempt-0003` | 製造・admission合格、proof job basenameとjob ID不一致でF拒否 | root・receipt・証拠保持 |
| `...attempt-0004` | 製造・admission、F 3/3、U 2/2合格 | root・receipt・証拠保持 |
| `...attempt-0005` | 正式48/48、proof 523/523合格 | root・receipt・証拠保持 |

全履歴で既使用rootの削除・上書き・再利用は0件である。

## 7. 修正履歴

### 7.1 契約内の限定修正権 2/2

| 回 | 修正 | 意味 |
|---:|---|---|
| 1/2 | package親の準備とreceipt入力型の検査順を訂正 | 正式packageを公開できる環境を先に成立させ、無効receiptをhash前に拒否 |
| 2/2 | admission返却の生byte Bufferを再帰freeze対象外に変更 | byteは不変保持したまま、NodeのBufferへ不可能なfreezeを要求しない |

### 7.2 個別承認された修正

| 順 | 修正 | 意味 |
|---:|---|---|
| 1 | F/Uの旧環境検査・検査内fixture製造を除去しreceipt admissionへ一本化 | 新旧二経路の併存を解消 |
| 2 | selection report上書き検査をbinding objectの2負例だけへ限定 | `null`を契約どおり「上書きなし」として扱う |
| 3 | 正式proof jobのbasenameをjob IDへ一致させ、admissionへconsumer規則を追加 | 製造物をconsumerの正式入口が受理できるところまで閉包 |

上記以外の追加修正は行っていない。各不合格attempt内の修正は0件である。

## 8. 要裁定一覧

### 8.1 描画疎結合化 8件

1. 指示成果物がstyle intentだけを持つか、style profile IDまで持つか。
2. cue終端は指示側、行末だけrenderer側という分離でよいか。
3. 時刻をframeで持つかmsで持つか。
4. renderer admission receiptを独立成果物にするか。
5. 最初の実証をcaption横型、title C、両形式同時のどれにするか。
6. 旧直接経路の削除時期を本工事かスケルトン清書か。
7. exact path上限をいつ固定するか。
8. 実装着手をF/U fixture工事完了直後かA-v002安定点化後か。

資料: `presentation-rendering-decoupling-feasibility-and-contract-materials-20260815-v001.md`

### 8.2 renderer表現力 11件

1. speaker_onlyから始めるか、三画面型を同時調査するか。
2. 基準書体一つか、役割別font familyか。
3. 作品色と意味種別色の優先順位。
4. 行分割を決定的単独選択か、候補列挙＋AI/人間選択か。
5. motion初版をfade改良だけにするか、代替一種を含めるか。
6. opening hookをtitle拡張か独立instruction kindか。
7. G4のみから始めるか、G5 commentも含めるか。
8. 外部rendererを比較対象に含めるか。
9. 既存素材だけで始めるか、新教師素材を追加するか。
10. 人間確認を三段にするか二段にするか。
11. 段2〜5をどこまで同一工事に含めるか。

資料: `presentation-separated-renderer-expressiveness-research-plan-draft-20260815-v001.md`

### 8.3 provider再評価 3件

1. 第二provider公式調査をGemini pair成立後に始めるか、F/U完了後に並行開始するか。
2. 第二providerの候補集合。GPT-5.6 Lunaは公式実在確認前の在庫名として扱う。
3. provider別B5/B6 jobを第一候補にするか。

資料: `presentation-caption-boundary-llm-provider-reevaluation-feasibility-draft-20260815-v003.md`

### 8.4 最上位: 旧green・旧レンダラー信頼台帳の現行再確定

1. 後続承認済みタイトル実装・registry・現行TSX CLIを旧固定期待へ反映する版付き方式。
2. 全未追跡pathを同期bufferへ読む監視を維持するか、および成果物・作業領域の配置境界。
3. OEE 6件の内側観測を保存し、三分法を確定する方式。

A-v002の未追跡54 file台帳を、論点2の一次資料として登録済みである。

## 9. 在庫一覧

- 最上位: 旧green・旧レンダラー信頼台帳の現行再確定。
- S〜U全gateへのfixture製造統合（スケルトン清書時）。
- 描画疎結合化の正式契約設計。
- 分離rendererの表現力調査。
- 字幕境界選択LLM provider再評価。
- 契約件数を整数で固定するproof群の置換連鎖解消。
- 新設runnerの観測性標準化。
- 観測契約・loader構造変更時のtoolchain変換範囲照合。
- 出力側gate fixtureの独立製造を、清書時の共通形へ昇格するか。
- A-v002未追跡作業fileの配置・列挙境界（最上位在庫へ統合）。

## 10. 外部作用と禁止事項

| 項目 | 実績 |
|---|---:|
| API通信 | 0回 |
| countTokens | 0回 |
| generateContent | 0回 |
| 費用 | US$0 |
| 正式描画 | 0回 |
| 既存正式成果物の変更 | 0 byte |
| 未追跡54 fileの削除・移動 | 0件 |
| commit | 0件 |
| stable tag | 0件 |

## 11. 次の人間判断

本報告で機械検証は閉じた。次は別承認として、次のどちらを先に進めるかをkawafmmが決める。

1. ZEVO字幕品質v002のAPI実走（countTokens、generateContent、正式横型再描画、人間目視）。
2. 最上位在庫「旧green・旧レンダラー信頼台帳の現行再確定」の契約設計。

本工程はここで停止し、どちらにも着手しない。
