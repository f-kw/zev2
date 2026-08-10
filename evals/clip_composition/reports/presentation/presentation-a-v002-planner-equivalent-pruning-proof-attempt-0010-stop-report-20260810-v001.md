# A-v002 planner等価枝刈り 正式attempt-0010 停止報告 v001

日付: 2026-08-10  
対象: A-v002旧層1 v3三候補 proof  
通信: 0回  
費用: US$0

## 1. 結論

page/line plannerの状態増加箇所・支配関係・重複保持情報を、保存済み実装とattempt-0009の入力だけで確定した。選択tupleと公開出力を変えない等価枝刈り・状態圧縮を設計し、正式92件と保存済みC工程の横型・縦型byte oracleに合格したため、新版jobと未使用rootでproofを1回実行した。

最初の候補では、前回約90分で完了しなかった横型plannerが1,604ms、縦型plannerが1,648msで完了した。横型動画は描画・QCまで合格した。

その後、縦型表示計画の照合で`OUTPUT_V002_RENDER_PROJECTION_MISMATCH`（`/renderPlan`）となり、正式proofは`1 / rejected`で停止した。内側の不一致内容は保存済み正式stdoutからは確定していない。同attemptでの修正・再実行・追加診断は行っていない。

したがって、**planner資源爆発の等価解消は最初の実データ2形式で成立したが、A-v002の6本実証全体は未完了**である。

## 2. 読み取り診断

### 2.1 状態増加箇所

| 箇所 | 保存実装で確認した増加 |
|---|---|
| 物理候補生成 | 1行・2行候補を全列挙し、候補ごとにatom参照と本文を実体化して物理検査する |
| 時刻写像 | 同じ開始・終了境界でも行の切り位置ごとに同じ採用元時刻片とframe写像を再構築する |
| path選択 | 同じ境界の保持状態と全出edgeの直積を走査する |
| 状態保持 | 同一tupleだけを置換し、将来も勝てない異なるtuple間の支配除去が無い |
| 比較 | 各比較で前駆鎖からpage終端列・line終端列を再構築する |
| 終端 | 最良1件だけが必要だが、全終端を配列化してsortする |

attempt-0009の最初の横型入力は101 atom、物理検査前30,390候補、物理成立28,807 edge、候補内atom参照延べ560,221件だった。

### 2.2 支配関係と等価圧縮

修正設計は、同じatom境界に到達した状態について、次の後続不変の関係だけを枝刈り対象とした。

1. 直前終了frameが早いか同じで、page数が少ない状態。
2. page数が同じで、総行数が少ない状態。
3. page数・総行数が同じで、最大幅が広がらず、最小幅が狭まらず、境界辞書順も先行する状態。
4. 開始・終了境界とframe範囲が同じedge群のうち、現行選択tupleで必ず後順位になるedge。

frame範囲が異なるedge、支配を証明できない状態、1行に収まらない区間の2行edgeは保持した。beam、任意状態上限、timeout、独自係数は追加していない。

設計正本:

- `presentation-a-v002-page-line-planner-equivalent-pruning-design-20260810-v001.md`
- SHA-256 `6612b996f2eddcc6f1b1040eecb4e3129dcf66e66e5dd87ac23344bd0a0c3793`

## 3. 限定実装

| 対象 | SHA-256 | 変更の意味 |
|---|---|---|
| planner v001 | `ebafe022060aaf9b98d9f7f27ae60af5e139295e0390ccca4db5caa99f590879` | 選択用edgeの等価圧縮、状態支配、終端線形選択、処理済みbucket解放、資源観測 |
| planner v002 | `8c943d68e1d08aadd48ab80e100006e091d2163e8c3fcb88a005e9f07f050b7f83` | 同一範囲の既存時刻写像共用、資源観測の接続 |
| planner v001検査 | `52f2737c92967f2f8918bfeae28f187d0b390f59f5d40119cabdc2837bf846a7` | 支配の正例・反例、閉語彙観測、保存済みC工程oracle |
| planner v002検査 | `e65b7cdcbae746d25c2c837c886031629d39e6e17aee8c87c8457f88f37db0c3` | observer有無の出力不変、採用元時刻片・観測検査 |
| proof runner | `2a1cae13a53c73334d7078e426049dbc35cc39b8cadcabc2ead4a57bdc4889c2` | 資源checkpointのno-replace保存と公開前再読登録 |
| proof runner検査 | `32ef971cd952c76572439b2db6c56ec3ed498f6f93ad5b7f8249e7a74b23ffda` | 閉語彙、不保存、途中・完了checkpoint、再読の検査 |

公開edge全量、返値schema、選択tuple、正式成果物、既存job・attempt rootは変更していない。

## 4. 等価性の機械検証

| 検証 | 実測 |
|---|---|
| 正式検査 | 92/92合格、fail 0、skip 60 |
| 横型C工程oracle | 保存済み正式render planの`captionDisplays`とbyte同一 |
| 縦型C工程oracle | 保存済み正式render planの`captionDisplays`とbyte同一 |
| TAP | `formal-92-preflight.tap` |
| TAP SHA-256 | `b8cdd1aea21570626cb2cdaca0a63975fda2e728c0d9911b61e275a992864b54` |

横型oracleのrender plan SHA-256は`17a2c8a499bc8a7c49a8bdcf4993fa6e0e7618c6d64a6650c6ffda3755f44988`、縦型は`282389a256088fd374bd49453ee0c7c75f7e0a1828a157c99e99818a1a4778ad`である。

これにより、承認条件(a)の支配関係による証明と、条件(b)の正式92件・保存済み2形式byte同一の双方を満たした上でproofへ進んだ。

## 5. 新版jobと実行環境

| 項目 | 実測 |
|---|---|
| job | `a-v002-layer1-v3-option-b-proof-20260810-v008.json` |
| job SHA-256 | `0c5fcf0320bfa72d60350182a40462ae700e4515e172ba7f6c4e3e608b183fcf` |
| job byte | 7,260 byte |
| 旧v007との差 | job ID、出力root、proof runner SHA、planner v001/v002 SHAの5値だけ |
| 新出力root | `a-v002-layer1-v3-option-b-proof-20260810-v006` |
| decoder / validator / serializer | 合格 / 合格 / byte一致 |
| 開始時root | 未使用 |

起動前には、native macOS arm64、固定Node先頭PATH、固定TSX絶対path、`NODE_OPTIONS`不存在、Chromium起動可能、FFmpeg・FFprobeの登録実体path/SHA一致、競合process 0件を確認した。

## 6. 正式proof attempt-0010

| 項目 | 実測 |
|---|---|
| 開始 | `2026-08-10T00:26:55.294Z` |
| 終了 | `2026-08-10T00:46:40.444Z` |
| 経過 | 1,185.150秒（19分45.150秒） |
| 実行回数 | 1回 |
| 終了code / status | `1 / rejected` |
| 違反 | `OUTPUT_V002_RENDER_PROJECTION_MISMATCH` |
| path | `/renderPlan` |
| stdout | 187 byte / SHA-256 `58d255cf9c1b19d2f4626bbb893cd77023bc8f4780f54ebfacc294bce6d5430c` |
| stderr | 0 byte / SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| wrapper outcome | SHA-256 `1d034865ccef94a99711bfd226d3dace928e2fd1ecc5912b1269f24e472845ce` |
| API通信・費用 | 0回 / US$0 |

証拠root:

- `evals/clip_composition/reports/presentation/test-runs/20260810-presentation-a-v002-option-b/attempt-0010/`
- `evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v006/`

## 7. 資源観測と到達済み成果物

### 7.1 planner完了値

| 最初の候補 | 物理候補→成立 | 時刻写像→成立／拒否 | 生成状態 | 新規保持／支配除去 | 最終／最大保持 | 完了時間 |
|---|---:|---:|---:|---:|---:|---:|
| 横型正式 | 30,390→28,807 | 28,807→28,804／3 | 113,200 | 1,557／111,643 | 14／813 | 1,604ms |
| 縦型字幕診断 | 5,541→4,670 | 4,670→4,667／3 | 9,898 | 518／9,380 | 2／95 | 1,648ms |

両形式とも処理済みatom数は101、同値置換は0件だった。各形式304件、合計608件の資源checkpointをno-replaceで保存した。本文・path・生messageは資源checkpointへ保存していない。

### 7.2 部分成果物

| 成果物 | 結果 |
|---|---|
| 最初の候補の基礎映像 | SHA-256 `6fe8c8ac4b41379073b5f194c1a3e5977a64ed39434c8842fe7db03b40247f7e` |
| 基礎映像timeline | SHA-256 `c72550e162531a04c791248638b7d52d3a33ce1ea931bc8a5347e4f0b01f09bf` |
| 横型render plan | SHA-256 `e05b8c65a2b0ff59e7d0a0b1e691096c0d38cccad82a41f3a4d02f7f483a27aa` |
| 最初の候補の横型動画 | SHA-256 `b12ec0af708af0a5afa69488b72bf55a6300bbed162877c59cc9154f79f14fcf` |
| 横型尺 | 25,166ms / 755 frame / 1920x1080 / 30fps |
| 横型QC | SHA-256 `03e536e6db7e2ba6e255d7d1f62fb997421e627cf315921b6e5298396d2ffeee` / passed / 違反0件 / 音声payload一致 |
| 縦型planner | 完了 |
| 縦型render plan | 正式公開前に拒否 |

新rootは621 file、約28MB。使用済みrootとして保持し、上書き・再利用しない。

## 8. 事実・推測・未確認

### 8.1 事実

- 正式92件と保存済み横型・縦型byte oracleは全て合格した。
- 最初の候補の横型・縦型plannerは、ともに2秒未満で完了した。
- 最初の候補の横型は描画・QCまで合格した。
- 縦型表示計画の照合は`OUTPUT_V002_RENDER_PROJECTION_MISMATCH`、`/renderPlan`で拒否された。
- 新root、旧job、旧root、今回の失敗証拠は保持している。
- 同attemptの修正・再実行、追加診断、API通信、費用発生は0件である。

### 8.2 推測

- なし。`/renderPlan`というpathだけから、planner、投影処理、期待値、fixture、契約のどれが原因かを決めない。

### 8.3 未確認

- 縦型render planのどのfield・値・byteが期待と一致しなかったか。
- 不一致がproduction欠陥、job・fixture・設営欠陥、契約解釈のいずれか。
- 残る2候補のplanner・描画・QC。
- 横型3本、縦型字幕診断3本、確認ページ、A-v002完成報告。
- O1工程。A完了前のため着手していない。

## 9. 規律適用と停止

正式proofの不合格1件を観測した時点で停止した。同attemptで直さず、同じjob・rootを再利用していない。attempt-0009はplanner資源観測以前の実用時間停止であり、今回のattempt-0010は等価圧縮後に初めて到達した下流の検査済み拒否である。

人間目視前のtag発行禁止、O1自動接続予約、通信0、費用US$0を維持する。A-v002は未完了であり、O1へは進まない。

次に必要なのは、保存済みv006入力・部分成果物と既存pure入口だけを使い、`/renderPlan`不一致の具体的field・値・byteを確定する**読み取り診断の別承認**である。診断前に修正案を仮置きしない。
