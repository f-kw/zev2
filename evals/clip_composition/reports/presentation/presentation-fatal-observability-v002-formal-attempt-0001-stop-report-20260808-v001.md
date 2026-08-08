# fatal観測性v002 正式81件 attempt-0001 停止報告 v001

- 日付: 2026-08-08
- 状態: **STOP（74/81、7件不合格）**
- 開始commit: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 承認元停止報告SHA-256: `d6940e6e054179f5e367c6e51123b2215dac0726a05639535a77248dede68e15`
- 正式attempt: `evals/clip_composition/reports/presentation/test-runs/20260807-fatal-observability-v002/attempt-0001/`
- 外部通信: 0回
- 費用: US$0

## 1. 結論

承認された旧B1の1経路限定修正を行い、全5境界を対象とする追加監査は6/6に合格した。その後、正式81件を頭から一度だけ実行したところ、74件合格・7件不合格となった。

規律どおり、同じattemptでは修正も再実行も行っていない。直接影響130件、green 287件、baseline 181件、既存5 tree照合、commit Aは開始していない。

保存済みTAPと既存実装を読み取って7件を診断した結果、原因は次の4群に分かれた。

1. 旧B1 fixtureが追加する実装束縛のkey順誤り: 2件
2. 正式byte一致後にprototypeまで比較する冗長な検査: 2件
3. 未検証または不完全なjobから非nullの対象fileを期待したfixture: 2件
4. 公開失敗を作るfixtureが公開前の保存先不正を先に発火: 1件

7件とも、production欠陥または契約矛盾を示すものではない。検査期待を緩和して通す話でもなく、契約が要求する実枝へfixtureを正しく到達させること、または既に成立した正式byte一致を正しい粒度で検査することが必要である。

## 2. 今回の限定修正

### 2.1 旧B1の対象file導出

- path: `evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs`
- SHA-256: `660d01933b114aab6568489dd7477d89351030ceba124ff4a60edb791532409c`

呼出側のfield名・path・SHAから一件の検証済み集合を自作する処理を廃した。strict JSON復号と既存job validatorの合格後だけ、job自身とjob内の正式bindingから検証済み集合を作る。読取失敗時は、実際に読もうとしたbindingのpath・SHAがその集合へexact一件一致した場合だけ、集合側の正式field名を対象fileへ使う。不一致・複数・未検証・固定許可表外はnullにする。

固定許可field表、共通selector、新しい対象file計算、decoder、validator、schema、status、既存違反code、終了code、正式成果物は変更していない。

### 2.2 証明追加

- path: `evals/clip_composition/presentation_fatal_observability_v002.integration.test.mjs`
- SHA-256: `a518ce8ac4c018739bb9580a49fdc575bd52da79ff97b27dbdba6297fac1b7e2`

旧B1について、context前の未検証状態では対象fileがnullであること、検証済みjobの実装file読取失敗では対象fileのpath・SHAが実bindingと一致することを既存IDへ追加した。fixture・binding・他IDの期待値は今回の限定修正では変更していない。

## 3. 正式attempt前の追加監査

- 報告: `evals/clip_composition/reports/presentation/presentation-fatal-observability-v002-preformal-additional-audit-20260808-v001.md`
- SHA-256: `fe59bf71bdbc7132c0f48241d3be18d704b2caab6bc3f8ffe1599e1115ebb631`

| 項目 | 判定 |
| --- | --- |
| 定義・import・export実在 | PASS |
| rejectedとfatalのcatch分離 | PASS |
| child process工程値と生出力非漏洩 | PASS |
| 全境界・全経路の検証済みrecord接続 | PASS |
| 保存先不正と実公開失敗のowner分離 | PASS |
| 正常・rejected実経路と証明割当て | PASS |

横断確認では、timeline、旧B1、意味終端、意味情報package、outputの全境界について、呼出側の値から対象fileを自己認定する経路は0件だった。

この6/6は正式test開始前の現物・構造監査である。各fixtureが正式validatorへ通るexact byte・key順を持つか、狙った下流枝へ実際に到達するか、prototype差を含む比較粒度までを全81 IDについて実行した結果ではない。正式81件が、その未検証部分の欠陥を正しく検出した。

## 4. 正式81件の実行記録

### 4.1 固定実行環境

- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- Node SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- TSX loader: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- TSX loader SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`
- `NODE_OPTIONS`: 不存在
- test concurrency: 1
- `npm exec` / `npx`: 使用0回
- 同一監視領域への並行書込み: 0件

### 4.2 保存物

| 保存物 | byte | SHA-256 |
| --- | ---: | --- |
| `formal-81.tap` | 37,796 | `addb5203b5f2b3a4eb8390e289f52b79ef6399b4dacc1b4b90eee5c123c249bc` |
| `formal-81.stderr` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

### 4.3 集計

| 項目 | 件数 |
| --- | ---: |
| tests | 81 |
| pass | 74 |
| fail | 7 |
| cancelled | 0 |
| skipped | 0 |
| todo | 0 |

終了codeは1だった。TAP全文と空stderrを版付きattempt rootへ保存した。不合格7件だけの部分再実行は行っていない。

## 5. 7不合格のID別帰属

| ID | 観測事実 | 原因 | 三分法の帰属 |
| --- | --- | --- | --- |
| FOVB005 | fatal・終了2を期待したが、job拒否・終了1 | fixtureが追加するfatal観測実装束縛のkey順が`path,fileSha256,role`。正式validatorが要求する`role,path,fileSha256`と一致せず、読取fatalより前に拒否された | fixture・検査設営 |
| FOVB006 | 正常statusを期待したが`rejected` | FOVB005と同じkey順誤りにより、正常経路へ入る前にjob validatorが拒否した | fixture・検査設営 |
| FOVB009 | 正式stdout byte一致後のobject比較で不一致 | 実際値はJSON復号した通常object、期待側にはstrict decoder由来のnull-prototype objectが残る。内容と正式byteは一致し、prototype差だけを検出した | 検査 |
| FOVF006 | FOVB009と同じobject比較で不一致 | 同じhelperが正式byte一致後にprototypeまで比較した再露出 | 検査 |
| FOVO002 | `input-read / FILE_CHANGED_DURING_READ`は一致、対象fileだけ期待objectに対しactual null | fixtureが使う保存済み旧B1 jobは実装束縛3件。現行validatorはfatal観測処理を含む4件exactを要求するため未検証となり、対象fileをnullにするproduction動作が正しい | fixture・検査設営 |
| FOVO006 | `runner-bootstrap / REQUIRED_EXPORT_MISSING`と終了2は一致、対象fileだけ期待objectに対しactual null | fixtureは実装束縛1件だけの部分objectで、正式output job全体のvalidatorを通らない。未検証job由来の対象fileをnullにするproduction動作が正しい | fixture・検査設営 |
| FOVO013 | `REPORT_PUBLICATION_FAILED`を期待したが`REPORT_TARGET_INVALID` | fixtureが出力先の親を通常fileとして作るため、staging取得後の公開失敗ではなく、公開開始前の固定sentinel`unsafe-publication-parent`が正しく先行した | fixture・検査設営 |

### 5.1 同根性

- FOVB005・FOVB006: 旧B1 fixtureの正式binding key順誤り。
- FOVB009・FOVF006: 正式byte一致後のprototype-sensitiveな冗長比較。
- FOVO002・FOVO006: 検証済みrecordを成立させないfixtureから、非null対象fileを期待。
- FOVO013: 公開後失敗を狙うfixtureが、公開前不正を先に発火。

### 5.2 productionと契約の状態

- 7件に契約矛盾は確認していない。
- 7件にproduction欠陥を示す観測はない。
- FOVB009・FOVF006では正式出力byteの完全一致が先に成立している。
- FOVO002・FOVO006ではinner stageとinner codeが期待どおりで、対象fileを未検証時にnullへ抑制する安全側の動作が成立している。
- FOVO013では保存先不正と実公開失敗のowner分離が成立している。

したがって、productionや契約を検査へ合わせる変更、期待の緩和、固定許可field表の拡張は修正方向にならない。

## 6. 実現性調査で事前検出できたか

**より深い値レベルのfixture監査を行えば、7件とも正式attempt前に検出できた。**

- binding objectのexact key順を正式serializer／validatorと照合する。
- 全IDでfixtureが現行validatorに合格することを確認する。
- 狙ったfailure stageより前に別の固定sentinelが発火しないことを確認する。
- 正式byte一致後の追加object比較が、値ではなくprototypeを検査していないか確認する。

今回の追加監査は、targetFile所有の全境界閉包、catchの分離、生文字列非漏洩、owner分離、証明割当てを対象にしており、81 fixtureの値・直列化・枝到達性まで一件ずつ実行前照合していなかった。監査6/6の記述範囲は正しかったが、正式attemptを一度で閉じるための深度としては不足していた。

## 7. 未実行の後続

| 工程 | 状態 |
| --- | --- |
| 正式81件 | **74/81で停止** |
| 直接影響130件 | 0回 |
| green 287件 | 0回 |
| baseline 181件 | 0回 |
| 既存5 tree最終照合 | 0回 |
| commit A | 未作成 |
| 18 path SHA表 | 未確定 |

正式成果物・既存5 tree・stable tagは変更していない。API通信は0回、費用はUS$0である。

## 8. 次の最小修正設計案（未実装）

修正対象は承認済み18 path内の検査2 fileで閉じる見込みである。production file、契約、固定許可field表、status、既存違反code、終了code、正式成果物は変更しない。

1. FOVB005・FOVB006のfixtureを正式serializer／validatorのexact binding順へ合わせ、正常経路と読取fatal経路へ実際に到達させる。
2. FOVB009・FOVF006は正式byte一致を正本にし、比較を続ける場合は期待byteも同じJSON復号経路へ通してprototype差を値差と誤認しない形へ固定する。単純な検査削除や期待緩和にはしない。
3. FOVO002は現行4件exactを満たす検証済み旧B1 job fixtureを使い、読取中変更時にjob自身の対象fileが記録される実枝へ到達させる。
4. FOVO006は正式output job全体をvalidatorへ通し、検証済みrenderer bindingから必須export欠落を起こす。
5. FOVO013は公開前sentinelを全て通過させた後のwrite・rename・no-replace・公開後照合のいずれかで、実際の公開失敗を決定的に起こすfixtureへ直す。
6. 修正前に81 ID全部について「fixtureの正式validator合格」「期待stageまでの先行枝なし」「比較粒度」を一件表で照合する。
7. 修正後は別attempt rootで正式81件を頭から一度だけ実行し、TAP全文を保存する。81/81の場合だけ後続130件以降へ進む。

本節は診断から導いた未承認案であり、修正・新attemptは行っていない。

## 9. 再開に必要な判断

承認依頼文案:

> fatal観測性v002正式81件attempt-0001停止報告v001の停止を受理し、§8の4原因群を一組にした版付き検査修正設計の起草を承認する。修正は承認済み18 path内のF02・F03検査2 fileに限定し、production、契約、固定許可field表、status、既存違反code、終了code、正式成果物は変更しない。正式binding key順、現行validatorに合格する完全job fixture、公開後失敗へ到達するfixture、正式byteとprototypeを混同しない比較を値レベルで固定する。81 ID全件のfixture成立・先行枝・比較粒度の一件表を正式attempt前に完成させる。設計提示後に停止し、実装と新attemptは別承認とする。新たな現物差、19 path目、契約解釈が必要な場合は提示停止する。

## 10. 停止時点

- 旧B1限定修正: 実装済み、正式完了は未認定
- 追加監査: 6/6 PASS
- 正式81件: 1回、74/81 FAIL
- 同attempt修正: 0件
- 同attempt再実行: 0回
- 後続工程: 0回
- commit: 未作成
- 正式成果物変更: 0件
- API通信: 0回
- 費用: US$0

不合格記録、TAP、stderr、今回の実装差分は保持して停止する。
