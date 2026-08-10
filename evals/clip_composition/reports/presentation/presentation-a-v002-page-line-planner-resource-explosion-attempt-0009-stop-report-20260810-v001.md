# A-v002 page/line planner資源膨張 正式attempt-0009停止報告 v001

- 記録日: 2026-08-10 JST
- 開始HEAD: `a64caf20f4e1e1acf6e5640ecca053f770d3f424`
- API通信: 0回
- 費用: US$0
- 結論: 基礎映像までは正常に生成したが、1候補目の横型page/line計画が約90分CPUを使っても完了しなかった。残る同型5回を含む完走可能性を示せないため、部分成果物と全証拠を保持してprocessを終了した。同attemptで修正・再実行していない。

## 1. 今回行ったこと

proof runnerの「基礎映像公開後からrenderer完了まで」へ、横型／縦型style解決、page/line plan、render plan、共通描画計画、媒体inspection、renderer work取得、描画、QCの入場・完了checkpointを追加した。対象fileは検証済みbindingまたは実読取証拠から一意に確定できる場合だけ保存し、確定不能は`null`とした。生message、stack、stderr、字幕本文、secretは保存しない。

attempt-0008の観測で、基礎映像inspection関数のimport所有を誤っていたことを確定した。既存の唯一の所有元へ接続し直し、計算の複製、違反code、終了規約、成果物byteを変更しなかった。

## 2. 起動前の成立

| 項目 | 実測 |
|---|---|
| proof runner SHA-256 | `bc45b11a94432254ab8bb9e37da99f78922ad030481162b4f1151cb44945a398` |
| proof runner test SHA-256 | `100d8e3a6f1feb42bca92463204244b2b7a086a5eb08f8389df7b7944c73bbe3` |
| v007 job SHA-256 | `a491a609bd7e359863c7004a350e514d4d631c0caed497cb2026cb9ff1246a21` |
| v006→v007差分 | job ID、出力root、proof runner SHAの3値だけ |
| live implementation binding | 20/20 現物SHA一致 |
| 正式92件preflight | 92/92、fail 0、skip 60、対象ID重複0 |
| TAP SHA-256 | `376f0ee31b057fece23e90f8e32ee5d5f84a16d7f92b815efe2806061c07ee5c` |
| 新proof／work／派生root | 起動前8/8未使用 |
| 旧証拠 | v001〜v006 job、旧proof root、attempt-0001〜0008に更新0件 |

固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、native実行、Chromium起動、FFmpeg／FFprobeの実体path・SHA、並行process 0件を起動前に確認した。詳細はattempt-0009の`execution-environment.md`に保存した。

## 3. 正式attemptの観測事実

| 項目 | 実測 |
|---|---|
| 開始 | `2026-08-09T15:59:07.776Z`（2026-08-10 00:59:07 JST） |
| 終了 | `2026-08-09T17:47:19.809Z`（2026-08-10 02:47:19 JST） |
| wall time | 1時間48分12.033秒 |
| 終了 | agentが`SIGTERM`で停止、wrapper exit 2 |
| stdout / stderr | 0 byte / 0 byte。両SHA-256=`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| API通信 / 費用 | 0回 / US$0 |

wrapperの生観測とagent停止の区別は、attempt-0009の`formal-attempt-outcome.md`へ固定した。productionが返したfatalではない。

1候補目の採用元区間列と意味情報パッケージを公開し、基礎映像4成果物を01:17:04 JSTに公開した。基礎映像は13,624,452 byte、SHA-256=`6fe8c8ac4b41379073b5f194c1a3e5977a64ed39434c8842fe7db03b40247f7e`である。これは過去の同候補基礎映像SHAと一致する。

停止時のproof rootは9ファイル。横型／縦型の出力要求、page/line plan、render plan、renderer work、動画、QC、確認ページは0件だった。renderer work rootも0ファイルである。

基礎映像公開後、固定Nodeは約90分CPU 98〜100%で動き続けた。直前観測のresident memoryは約1.37GB。OSのthrottleは0で、I/O待ちやchild process待ちではなかった。

## 4. 原因診断

### 4.1 事実

- 今回の意味情報パッケージはcaption 1件、文字atom occurrence 101件である。
- page/line plannerはcaption内の全物理edgeを作り、各edgeをtimelineへ写し、その後に境界ごとの状態表で経路を選ぶ。
- 既存の同入力pure診断では物理edge 28,807件を観測済みである。
- 経路状態はpage数、総行数、最小／最大論理幅、直前終了frame、predecessor鎖を持つ。edge集合と状態空間は有限だが、実用時間・資源内の完了を保証する明示的な計算量上限・実行上限はない。
- 基礎映像公開後にrenderer workへ到達していないため、描画・Chromium・FFmpeg・QCは今回の停止原因ではない。

### 4.2 推測

実装順とCPU／成果物観測を合わせると、停止位置は1候補目・横型のpage/line計画内であり、物理edgeのtimeline写像または直後の経路探索が状態を膨張させている可能性が高い。checkpointは終端時に一括保存する構造だったため、SIGTERM前の入場checkpointは正式成果物へ出ず、両者のどちらかまでは確定できない。

### 4.3 未確認

- 28,807 edgeのうちtimeline写像を完了した件数。
- 経路探索で生成された状態数。
- 自然完了までに必要だった時間と最大メモリ。
- 同じ選択結果を保つ等価な枝刈り・状態圧縮で解消できるか。

## 5. 三分法の帰属

| 帰属 | 判定 | 根拠 |
|---|---|---|
| 実装が契約に届いていない | **該当** | productionのpage/line plannerは小さなfixtureでは決定的に動くが、実データ101 atom・28,807 edgeの1回目が約90分で未完了となり、承認範囲の6回を実用資源内で完走できる可能性を示せない。 |
| job・fixture・実行設営 | 非該当 | jobの値・live束縛・固定tool・native環境は合格し、同じ基礎映像をbyte一致で生成した。 |
| 契約矛盾 | 未発見 | 既存の選択順を保つ計算改善なら契約を変えずに直せる可能性がある。ただし枝刈り条件や上限値を新設すると出力意味が変わるため、実装者判断では行わない。 |

前段のimport所有修正は有効だった。媒体inspectionを通過して基礎映像を正常公開し、その下のpage/line計画まで初めて到達したため、本停止は別原因である。

## 6. 修正方向の比較

| 案 | 内容 | 契約影響 | 判定 |
|---|---|---|---|
| A | 現在の選択tupleを不変に保つ等価計算へ設計し直す。支配される状態だけを数学的根拠付きで除外し、全edgeの重い複製とpredecessor鎖保持を減らす。 | 等価性を証明できればなし | **推奨**。まずread-onlyで状態膨張点と支配関係を確定し、版付き修正設計へ戻す。 |
| B | elapsed timeout、状態数上限、候補上限を置く。 | 新しい数値と拒否意味が必要 | 非推奨。独自係数禁止に反し、契約改訂なしでは行えない。 |
| C | candidate固有の行分割、edge削減、既存成果物の流用で迂回する。 | 汎用性・正本計算を破る | 不採用。候補固有patch、計算複製、期待緩和になる。 |

これは残周回で扱える軽微修正ではない。案Aの等価性と実現性を先に閉じる必要があるため、同attemptでの修正・新job・3回目の実走は行わない。

## 7. 未実施と停止点

- 6本描画: 0/6
- QC: 0/6
- 確認ページ: 未生成
- A-v002完成報告: 未到達
- O1: 未着手
- commit / stable tag: 未実施

再開には、page/line plannerの資源膨張について、既存選択結果を変えない最小修正が成立するかを読む診断と、path・検査・等価性証明を閉じた版付き修正設計の承認が必要である。
