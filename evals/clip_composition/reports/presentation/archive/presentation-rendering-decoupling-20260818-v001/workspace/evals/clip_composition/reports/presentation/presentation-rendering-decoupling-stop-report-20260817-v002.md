# ④.5 レンダリング疎結合化 統合停止報告 v002

本書は先行停止報告v001の内容、後続のrenderer trust照合、workspace内実行体調査を一つに統合した判断用正本である。以後の判断は本書だけで行える。先行v001は発生時証拠として保持するが、別途読む必要はない。

- 工事ID: `PRESENTATION-RENDERING-DECOUPLING-V001`
- 日付: 2026-08-17
- 状態: **admission以降を停止（契約・許可pathの判断が必要）**
- 停止回数: 2/8
- 追補件数: 0/5
- API通信: 0回
- 費用: US$0

## 1. CURRENT_GOAL

1. 最終目的: 動画出力を別プログラムへ分けて疎結合にする。これにより同時に開発を進められ、中間生成物をレビューでき、修正の影響が小さくなって検証しやすくなり、クオリティを上げやすくなる。
2. 現在地: ④字幕品質v002は完了（`stable/caption-quality-v002-20260816`）。④.5 レンダリング疎結合化（演出指示書境界の実装）の着手前。これが済むと⑤美しいレンダリング・⑥遠方接続・⑦骨格清書が並列化できる。
3. 次工程: 契約設計v001（`presentation-rendering-decoupling-contract-design-20260817-v001.md`）に基づく実装工事。注文書・受領書・出力側行分割・新renderer runnerを作り、字幕横型1本とタイトル2本で「注文書を人間がレビューできる状態」を実証する。これが目的の中間生成物レビューをそのまま実現する。正本path上限17件（2026-08-17 kawafmm確定）。
4. 今回やらないこと: 字幕縦型 / G4〜G7 / renderer表現力の拡張 / 旧プログラムの物理削除（骨格清書で行う） / A-v002の目視合格・tag（注文書レビュー可能化の後に別途） / commit・tag・公開 / API通信・費用支出

4項とwork-order指示に齟齬はない。

## 2. 現在地

- 起点HEADは`b5f8fabeefd3358184f45f1c1d036ec70df534a2`のまま。
- 契約設計正本のSHA-256は承認値`aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94`と一致。
- 正本17 pathのうち、新規8 path（production 4、test 4）を作成した。既存6 pathの変更は0件。
- 開発実行ではPRP 6/6、PRI 10/10、PRL 8/8の計24/24が合格した。正式attemptではなく、四者exact一致の完了主張には用いない。
- PRA testは12 IDを実装したが、共通fixtureのadmission開始時にtrust台帳とlive dependencyのSHA不一致を検出した。PRAの正式attemptは開始していない。
- renderer runner、既存caption/title runner接続、PRM、動画描画、QCは未着手。

## 3. 今回確定した停止原因

renderer trust正本が列挙する依存8件のうち2件で、登録SHAと起点commitのlive file SHAが一致しない。

| 依存 | trust登録SHA | live SHA |
|---|---|---|
| `evals/clip_composition/presentation_renderer_entry_v001.tsx` | `884c2361feab659264ed0e00e65ae726e681b030c1a594c80985bd0225d7dce7` | `5047dc3bcd51e8623cd090a443955828d38986db8338f53f2c9030e07cc952b7` |
| `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` | `066a62adaa7fa3f8b8eda92c82e9a85940e43f372af976edc4b327ef4cf9ce5e` | `8c62f3bbc63a3f5292b4a079f9bfda21128514b19305976bcb29de5d1051aea0` |

trust正本自体のfile SHAは、source packageが束縛する値`04ec4971d078413b68c19869b0285130ec553f14601f45d27125738a7498eddc`と一致する。したがって読み間違いではなく、trust内の依存bindingと現在のlive fileの差である。

PRA008はrenderer trust・layout規則・tool bindingの成立を、PRA009はrenderer implementation全件のlive SHA一致を要求する。登録値へ寄せればlive一致を失い、live値へ寄せれば許可17 path外のtrust台帳改訂が必要になる。検査を弱めずに両方を成立させる方法は、承認済み範囲から一意に決まらない。

## 4. 先行停止v001との接続

停止報告v001で、renderer job exact schemaが外部実行体path/SHAを所有できない問題を記録済みである。

- jobは全実行値をformal byteへ置き、job/env/defaultから暗黙選択しない。
- implementation binding pathはworkspace相対に限定される。
- 現行描画coreが必要とするFFmpeg等はworkspace外の絶対pathである。
- renderer trustはtool version文字列を持つが、実行体path/file SHAを持たない。

停止後にworkspace内を追加調査したが、formal bindingへ代用できるFFmpeg、FFprobe、ImageMagickの実行体は存在しなかった。Remotion、TSX、Chromiumの想定workspace pathも現checkoutには実在しない。従って、既存17 path内のworkspace相対implementation bindingだけで外部実行体を閉じる代替経路はない。

今回のtrust依存差と合わせ、admission・runner・正式描画の全てに影響するため、未影響作業として先行できる範囲は尽きた。

## 5. 三分法

- 実装欠陥: **該当しない**。live SHA照合は契約どおりに差を検出した。
- 検査設営: **該当しない**。trust登録値とlive fileを直接SHA-256で照合した結果である。
- 契約・許可範囲: **判断が必要**。trust台帳を現行実体へ再発行するか、新renderer job固有のimplementation bindingだけを正本とみなすか、どちらも現在の17 pathと契約責務を変更する。

## 6. 再開に必要な判断

次の2点を同じ追補で閉じる必要がある。

1. 外部実行体のpath/SHAをrenderer job/receiptのどのfieldが所有するか。
2. renderer trust内の旧dependency SHA 2件を、現行live fileへ再発行するか、旧rendererだけの来歴へ限定して新renderer admissionのlive正本から外すか。

推奨は、外部実行体をrenderer jobの明示runtime bindingへ追加し、renderer trustは現行live dependencyへ版付き再発行する案である。ただしtrust台帳は§9外の18 path目になるため、path上限・exact path表を第1層で改訂する必要がある。

### 判断依頼（一問）

renderer jobへ版付きruntime bindingを追加し、renderer trustを現行live dependencyへ再発行する一組の追補として、正本path上限17件と§9 exact path表を改訂してよいか。

## 7. 作業ツリー

tracked変更0件。未commit新規fileは12件。

### 正本17 path内（8件）

1. cue終端projection production/test
2. 注文書 production/test
3. renderer行分割 production/test
4. renderer admission/receipt production/test

### 作業path（4件）

1. 承認済み契約設計正本
2. 着手前preflight実験記録
3. 停止報告v001
4. 本停止報告v002

既存正式成果物・stable tag・旧treeへの変更はない。

## 8. 外部作用

- API通信: 0回
- 費用: US$0
- 動画描画: 0本
- commit: 0件
- tag: 0件
- 公開: 0件
- DECISIONS書込み: 0件
