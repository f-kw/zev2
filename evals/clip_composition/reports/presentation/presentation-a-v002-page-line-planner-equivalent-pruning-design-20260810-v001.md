# A-v002 page/line planner 等価状態圧縮・資源観測 修正設計 v001

日付: 2026-08-10  
対象: 正式attempt-0009で実用時間内に完了しなかったpage/line planner  
通信: 0回  
再実行: 0回（本書の診断時点）  
費用: US$0

## 1. 目的

本修正の目的は、字幕の選び方を変えることではない。現行の選択tupleと公開出力を完全に維持したまま、同じ結論にしか到達しないedge・状態・反復写像を内部で圧縮し、正式proofを実用時間内に完了できるようにする。

任意のbeam幅、状態数上限、timeout、独自係数は導入しない。時間切れで近似解を返す処理も作らない。

## 2. 実現性調査

### 2.1 現物照合

| 現物 | SHA-256 | 調査結果 |
|---|---|---|
| `presentation_output_page_line_planner_v001.mjs` | `c1204f0ef6321510263358414f29f17be85050670e9d96e9c30f6387f3b8913f` | 物理候補生成と共通path選択の正本が実在 |
| `presentation_output_page_line_planner_v002.mjs` | `7c7d4db95dd3ae8a264b0bcf8d7b3d27e1b57034a233e95e99613bf213bec502` | A-v002の採用元時刻片写像とv001共通選択入口が実在 |
| v001 planner検査 | `4bfb9f5a4cb99417431b272845dc6f7a30721b8785d9276b9ba553d0d48094d2` | 現行tuple、任意cutoff禁止、保存fixture検査が実在 |
| v002 planner検査 | `07daa56bc6bed1cd44ab973a6c6ef769dcb176fad5c6c999cf611556851b75e5` | 採用元時刻片・決定性・意味全量閉包の検査が実在 |
| A-v002 proof runner | `bc45b11a94432254ab8bb9e37da99f78922ad030481162b4f1151cb44945a398` | planner呼出と版付きpartial rootが実在 |
| proof runner検査 | `100d8e3a6f1feb42bca92463204244b2b7a086a5eb08f8389df7b7944c73bbe3` | live SHA、no-replace、公開前再読の検査が実在 |

調査範囲は、所有入口、逆影響、値レベルの選択tuple、正式保存入力、正式保存出力までである。設計が依存する6入口は全て現物に実在する。

### 2.2 保存入力の規模

attempt-0009の最初の候補は、1 caption・101 atomである。横型の幅上限36・最大2行に対する保存入力の静的走査結果は次のとおりである。

| 観測 | 件数 |
|---|---:|
| 幅内の1行候補 | 1,722 |
| 1行page候補 | 1,722 |
| 2行page候補 | 28,668 |
| 物理検査前page候補合計 | 30,390 |
| 既存診断で物理成立したedge | 28,807 |
| 候補内のatom参照延べ保持 | 560,221 |
| 一つの境界からの最大候補数 | 405 |

縦型幅14では物理検査前候補5,541件、atom参照延べ42,088、最大fan-out 72件である。

### 2.3 増加箇所と重複保持

事実:

1. 物理graphは1行・2行候補を全列挙し、各候補でatom参照・本文を実体化して物理検査する。
2. v002は同じ開始・終了境界でも、行の切り位置ごとに同じ採用元時刻片を再構築・再写像する。
3. path選択は各境界の全保持状態と全出edgeの直積を走査する。
4. 現行の状態削減は、境界・page数・総行数・最小幅・最大幅・直前終了frameが全て同じ状態の辞書順比較だけである。異なるtuple間の支配除去はない。
5. 境界は外側bucketと状態keyの双方に保持される。各比較では前駆鎖からpage終端列・line終端列を再構築する。終端は最良1件しか要らないが、現行は全件を配列化してsortする。

未確認:

- attempt-0009にはplanner内部checkpointが無いため、約90分の主成分が物理検査、時刻写像、path状態探索のどれであったかは保存物だけでは確定できない。本修正は三段を別々に観測し、この非証明範囲を残さない。

## 3. 変更しない選択規則

現行の選択tupleを次の順で維持する。

1. page数が少ない
2. 総行数が少ない
3. 最大行幅が小さい
4. 最大行幅と最小行幅の差が小さい
5. page終端境界列が辞書順で早い
6. line終端境界列が辞書順で早い

2026-08-06裁定後のこのtupleだけを正本とし、旧2行優先や`oneLinePageCount`を再導入しない。

## 4. 等価枝刈りの証明

同じatom境界に到達した状態を、`p`=page数、`l`=総行数、`m`=最小幅、`M`=最大幅、`e`=直前終了frame、`P/L`=page/line終端列とする。

状態xとyについて`e_x <= e_y`なら、yへ接続可能な任意の後続edgeはxにも接続できる。その上で次を適用する。

1. `p_x < p_y`ならxがyを支配する。後続に同じpage数が加わるので差は消えない。
2. `p_x = p_y`かつ`l_x < l_y`ならxがyを支配する。後続に同じ行数が加わるので差は消えない。
3. `p/l`が等しく、`M_x <= M_y`、`m_x >= m_y`、かつ`(P_x,L_x)`が辞書順でy以前ならxがyを支配する。任意の後続幅区間を合成してもxの幅区間はyより悪化せず、将来の幅で数値差が消える場合もxの境界順が先行する。

削除するのは上記で支配された状態だけである。支配を証明できない状態は残す。

### 4.1 選択用edgeの等価圧縮

公開する`physicalEdges`と`timelineEdges`は全件を従来順で保持する。path選択へ渡す内部graphだけを次で圧縮する。

- 開始境界・終了境界・frame範囲が同じedge群では、1行edgeが存在すれば、多行edgeは総行数で必ず負けるため選択graphから除く。
- 行数が同じedge同士では、最大幅が小さく、最小幅が大きく、line終端列も早いedgeだけが他方を支配する場合に限り除く。
- frame範囲が異なるedgeは同じ群に入れない。公開pure入口が任意の`frameRangeOf`を受ける性質を維持する。

長すぎて1行edgeが存在しない区間の2行edgeは残る。したがって「1行に収まる限り改行しない、長すぎる場合だけ改行する」という現行結果は変わらない。

### 4.2 重複写像の圧縮

同じ開始・終了境界の採用元時刻片とframe写像は、行の切り位置に依存しない。同じ範囲を一度だけ既存正本で写像し、公開edgeでは従来どおり各行分割へ同じ値を展開する。新しい時刻計算は作らない。

### 4.3 終端と保持の圧縮

- 終端全件sortを、同じ比較器による線形最小選択へ置き換える。
- 処理済み境界のMap参照は、後続状態の前駆参照を壊さないことを確認して解放する。
- 境界は外側bucketの値を正本とし、exact keyから重複分を外す。

前駆鎖と公開選択edgeは維持し、`selectedPredecessors`のbyteを変えない。

## 5. 禁止する枝刈り

- 直前終了frameを無視しない。早いframeだけが後続へ接続できる場合がある。
- 最大幅だけで状態を捨てない。後続幅により最大幅が同値化した後、幅rangeが逆転し得る。
- 幅区間だけで状態を捨てない。後続で数値が同値化した場合、境界辞書順が勝敗を決める。
- 2行edgeを一律に捨てない。
- beam、状態上限、timeout、独自係数を使わない。

## 6. 資源観測

plannerは任意の読み取り専用observerを受け取る。observerを省略した既存呼出の返値schemaとbyteは変えない。observer eventは本文・path・edge内容・生messageを持たず、次の閉語彙整数だけを持つ。

| 段 | 記録 |
|---|---|
| `physical-graph` | 処理済みatom数、生成候補累計、物理成立累計 |
| `timeline-mapping` | 処理済みatom数、写像対象累計、写像成立累計、拒否累計 |
| `path-selection` | 処理済みatom数、生成状態累計、新規保持累計、同値置換累計、支配除去累計、現在保持状態数、最大保持状態数 |
| `planner-completed` | 処理済みatom総数、生成状態総数、最大保持状態数、単調時計による完了時間ms |

正式proof runnerは、候補ordinalと形式の閉語彙だけを識別子として、各自然境界のeventを未使用root内の版付き`planner-resource-observations-v001/`へno-replace保存する。各eventは独立fileとし、partial rootで停止しても最後に完了した境界を読める。全fileをproof全体の公開前再読集合へ登録する。

各planner invocationの完了eventを、その実行の資源記録とする。完了eventには完了時間と最大保持状態数が必ず存在する。既存`proof-run-v001.json`のschemaは変更しない。

## 7. 実装path

| path | 変更 |
|---|---|
| `presentation_output_page_line_planner_v001.mjs` | 選択edge圧縮、状態支配、終端線形選択、物理/path観測 |
| `presentation_output_page_line_planner_v001.test.mjs` | 支配反例、任意cutoff不在、保存済み横型・縦型byte oracle |
| `presentation_output_page_line_planner_v002.mjs` | 範囲写像cache、timeline観測、observer接続 |
| `presentation_output_page_line_planner_v002.test.mjs` | 採用元時刻片・観測・返値byte不変 |
| `run_presentation_a_v002_layer1_v3_proof_job_v001.ts` | no-replace資源event保存と公開前再読登録 |
| `run_presentation_a_v002_layer1_v3_proof_job_v001.test.mjs` | 閉語彙、不保存、途中checkpoint、完了記録の検査 |

新版jobはlive SHAだけを更新し、保存済み入力値を変えず、未使用rootへ発行する。旧job・attempt root・失敗証拠は不変保持する。

## 8. 機械的等価性の合格条件

実装後、proof再実行へ進む前に次の両方を満たす。

1. 正式92件が92/92。
2. 保存済み正式入力を既存pure入口で再読して修正後plannerへ渡し、結果の`captionDisplays`を正式serializerでbyte化して、次の保存済みrender plan内`captionDisplays`の正式serializer byteと完全一致させる。

| 形式 | oracle | SHA-256 |
|---|---|---|
| 横型、幅36 | `.../qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/render-plan.json` | `17a2c8a499bc8a7c49a8bdcf4993fa6e0e7618c6d64a6650c6ffda3755f44988` |
| 縦型、幅14 | `.../qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002/render-plan.json` | `282389a256088fd374bd49453ee0c7c75f7e0a1828a157c99e99818a1a4778ad` |

両oracleは`stable/meaning-output-first-real-run-20260806`と`stable/zevo-title-c-human-passed-20260809`でも現物とbyte同一である。

等価性検査が1 byteでも不一致なら、proofへ進まず停止する。

## 9. 実行順

1. 6 path限定実装
2. 実装後監査（支配条件、frame範囲分離、公開edge全量、observer不保存）
3. 正式92件の新attempt、TAP全文保存
4. 保存済み横型・縦型のbyte同一検査
5. 全合格時だけ、新版job・未使用rootでproofを1回実行
6. 6本描画、QC、確認ページ、完成報告

不合格1件、新しい契約解釈、選択tuple変更、公開結果差、任意cutoffの必要、観測fileへの生文字列混入があれば同attemptで直さず停止する。

## 10. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 本来目的 | 合格 | A-v002の6本実証を、近似せず実用時間で完走させる |
| 現物入口 | 合格 | 6 pathの入口・SHA・呼出位置を照合済み |
| 選択tuple | 合格 | 現行6要素を実装・検査・DECISIONSで照合済み |
| 支配証明 | 合格 | 任意後続に対するpage・行・幅区間・辞書順の保存を明記 |
| 工程間受け渡し | 合格 | 公開edgeは全量、内部選択graphだけを圧縮 |
| 観測取得可能性 | 合格 | proofの未使用partial rootへ自然境界ごとに保存可能 |
| 数値区分 | 合格 | atom・edge・state件数と単調時計msだけ。字幕本文を保存しない |
| byte閉包 | 合格条件化 | 正式92件と横型・縦型保存oracleのbyte同一をproof前提とする |
| 既存成果物 | 不変 | 読み取り再適用のみ。上書き・変換・fallbackなし |
| 人間作業 | 0件 | proof完走後の既承認目視まで追加判断なし |

## 11. 設計結論

条件(a)は満たす。変更は現行tupleで将来も勝てない状態・edgeだけを除く内部圧縮であり、選択tupleと公開結果を変えないことを支配関係で証明した。

条件(b)は実装後の機械検査を合格条件とする。正式92/92と保存済み横型・縦型byte一致の両方が成立した場合だけ、新版job・未使用rootのproofへ進む。
