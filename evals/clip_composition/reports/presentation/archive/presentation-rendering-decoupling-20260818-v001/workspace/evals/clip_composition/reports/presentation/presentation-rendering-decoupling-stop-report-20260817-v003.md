# ④.5 レンダリング疎結合化 停止報告 v003

- 工事ID: `PRESENTATION-RENDERING-DECOUPLING-V001`
- 日付: 2026-08-17
- 状態: **renderer runner実装前で停止（表示状態IDの所有を契約へ固定する必要がある）**
- 停止回数: 3/8
- 追補件数: 1/5
- 検査設営修正: 2/5
- 限定実装修正: 0/3
- API通信: 0回
- 費用: US$0

## 1. CURRENT_GOAL

1. 今の目的: 動画出力を別プログラムへ分けて疎結合にする。これにより同時に開発を進められ、中間生成物をレビューでき、修正の影響が小さくなって検証しやすくなり、クオリティを上げやすくなる。
2. 主計画上の現在位置: ④字幕品質v002は完了（`stable/caption-quality-v002-20260816`）。④.5 レンダリング疎結合化（演出指示書境界の実装）の着手前。これが済むと⑤美しいレンダリング・⑥遠方接続・⑦骨格清書が並列化できる。
3. 今の作業: 契約設計v001に基づく実装工事。注文書・受領書・出力側行分割・新renderer runnerを作り、字幕横型1本とタイトル2本で「注文書を人間がレビューできる状態」を実証する。正本path上限18件（2026-08-17 kawafmm確定）。
4. 今回やらないこと: 字幕縦型 / G4〜G7 / renderer表現力の拡張 / 旧プログラムの物理削除 / A-v002の目視合格・tag / commit・tag・公開 / API通信・費用支出。

4項と承認済みwork-orderに齟齬はない。

## 2. 今回の到達点

1. 追補v001を起草し、renderer jobとreceiptへ外部実行体6件のpath/SHAを明示する実装を行った。
2. renderer trust v002を新規発行し、renderer dependency 8件を現行live SHAへ揃えた。旧v001は不変保持している。
3. CURRENT_GOALの正本path上限を18件へ同期し、許可されたDECISIONS記録行一件だけを追加した。
4. PRA001〜PRA012を正式attemptとして12/12合格した。TAPは次である。
   - path: `evals/clip_composition/reports/presentation/test-runs/20260817-rendering-decoupling-pra-attempt-0001/tap.txt`
   - SHA-256: `ad25cd5837ea0ab6410eff87a1c5fbbb657990f8ef9a83fd5d40b8ede8e8cba0`
5. 検査設営修正2件は、renderer本体と同じ既存canonical JSON計算への接続と、macOS一時directoryの論理pathを実体pathへ解決する訂正である。production契約値の変更は0件。
6. renderer runner、caption/title runner接続、PRM、動画描画、QC、注文書review pageは未着手である。

## 3. 実装前逆引きで検出した契約の穴

voice-013の正式入力は、表示presetと表示状態を別々に持つ。

| 値 | 現物 |
|---|---|
| preset ID | `normal-landscape-readable-pop-v001` |
| visual state ID | `caption-core-v001` |

注文書の現行schemaは`styleProfileId`一件だけを持ち、現行builderはpreset IDを転記する。renderer jobの`executionInputs`にもvisual state IDは存在しない。

一方、同presetには次の10 visual stateが実在する。

`caption-core-v001`, `emphasis-important-warm-v001`, `emphasis-mistake-alert-v001`, `emphasis-discovery-clear-v001`, `emphasis-emotion-impact-v001`, `information-comment-card-v001`, `information-narration-card-v001`, `information-lyrics-card-v001`, `speaker-nameplate-v001`, `reference-card-v001`

共通描画coreへ渡す計画は、文字色・書体・縁・光彩・位置・背景・fadeを含むvisual stateを一件へ確定する必要がある。preset IDだけからは10候補のどれかを一意に選べない。

先頭要素、`caption-core-v001`という固定文字列、semantic kindに応じた対応表のいずれかをrenderer内で暗黙選択すると、親契約§6.2と§11.2が禁止するjob/env/default補完になる。注文書側へvisual stateを足すと、注文書へ描画値を入れない不変境界に触れる。

## 4. 三分法

- 実装欠陥: **該当しない**。実装前のactual引数逆引きで、必要値の供給経路が存在しないことを検出した。
- 検査設営: **該当しない**。正式入力・注文書schema・renderer job schema・preset registryの現物を直接比較した結果である。
- 契約解釈: **必要**。visual state IDをどのformal artifactが所有するかを新たに固定しない限り、暗黙選択なしでrendererを起動できない。

親契約の「意味/表現境界」を維持するには、表示状態は注文書ではなくrenderer jobが所有するのが最も整合する。

## 5. 推奨する追補v002

推奨案Aは次である。

1. renderer jobの`executionInputs`へ`visualStateId`を明示追加する。
2. caption jobは正式source contextの`resolvedStyle.visualStateId`をstable再読して転記する。
3. title jobは選択済みtitle profile内の`visualState.stateId`を転記する。
4. admissionは`styleProfileId`に該当するpreset/profileが一件、さらに`visualStateId`に該当する状態がその配下に一件だけあることを検査する。
5. receiptのexecution input bindingへ同値を転記し、rendererはjobとreceiptの一致した値だけを使用する。
6. 注文書schema・本文・cue終端・frame・styleProfileIdは変更しない。
7. PRA005/010とPRM001/005/007の既存ID内で実発火を追加し、44 ID総数は不変とする。

この案はappearance値をrenderer側へ置くため、目的の疎結合境界を維持する。新しい正本pathは不要で、18 path上限内に閉じる。ただしrenderer job exact schemaとreceipt bindingの意味を改訂するため、kawafmmの第1層裁定が必要である。

不採用案は次である。

- `styleProfileId`をcaptionではvisual state ID、titleではprofile IDとして二重解釈する案: fieldの意味がartifact kindで変わり、exact契約にならない。
- presetの先頭visual stateを選ぶ案: 配列順defaultになり、暗黙補完禁止に違反する。
- 注文書へvisual state IDを追加する案: 注文書に描画判断を入れない責務境界を変える。

## 6. 判断依頼（一問）

追補v002として、renderer jobの`executionInputs`に明示`visualStateId`を追加し、receiptへ転記して、caption/titleともjob byteだけから表示状態を一意に決める案Aを承認するか。

## 7. 外部作用と保全

- API通信: 0回
- 費用: US$0
- 動画描画: 0本
- commit: 0件
- tag: 0件
- 公開: 0件
- 既存正式成果物・stable tagの変更: 0件
- 起点HEAD: `b5f8fabeefd3358184f45f1c1d036ec70df534a2`

本停止後は追加実装・検査・描画を行わず、相談役経由のkawafmm裁定を待つ。
