# 意味／表現境界 正式attempt v002 安全停止報告

- 日付: 2026-08-03
- 状態: **不合格で安全停止**
- 実装正本: `presentation-meaning-output-boundary-complete-implementation-design-20260803-v001.md`
- 正本SHA-256: `45ad938487e41a50b8c2ac3426c66d0348a26cfc330b0a6cc00b7ce8a103ae76`
- 外部通信: 0回
- 費用: US$0

## 1. 結論

承認済みの限定修正を入れ、正式205件を先頭から一度だけ実行した。実行は終了code 1で停止した。TAPが報告した結果は**184合格・6不合格・総数190**であり、設計固定値205に対して15件の結果行が無い。

したがって、意味／表現境界の実装完了とは報告しない。承認条件どおり、同attemptでの修正、再実行、既存回帰、commit、tagは行っていない。

## 2. 正式attempt前に行った限定修正

| 群 | 修正の意味 | 変更側 | 契約影響 |
|---|---|---|---|
| P1 | Gemini意味回答の先頭・末尾に余計なbyteがある場合と、正式末尾LFが無い場合を拒否 | production 1 file | 既存の「暗黙正規化なし」を実装へ一致。受理拡大なし |
| F1 | 1 sourceの検査timelineを1 segmentとして作る | test fixture | なし |
| F2 | 意味回答CLIの隔離workspaceへ、正本依存の話者台帳をbyte同一で同梱 | test fixture | なし |
| F3 | 例外検査が実Errorを正しく受け取り、実際の違反codeを観測する | test | なし |
| F4 | 22 codeを所有集合として照合し、非連続なowner列の連結順を全体順と誤認しない | test | なし |
| F5 | 描画E2Eの音声sample数を、既存base-media検査が確定した音声時計から取得 | test fixture | なし |
| F6 | 出力runnerの現行複数source表記を静的検査が読む | test | なし |
| F7 | planner合成timelineの媒体pathをv002正式schemaの`base-media.mp4`へ訂正 | test fixture | なし |

変更は承認済み27 file内に閉じた。新しい正本計算、契約改訂、preset変更、safe area変更は行っていない。

## 3. planner物理検査の読み取り診断

### 事実

- 初回に落ちたplanner 18件は全て、合成timelineの媒体pathが`fixtures/base-media.mp4`だったことによりtimeline全体が不正になっていた。
- 旧fixtureでは物理page候補は生成済みだったが、timeline edgeが0件になり、`DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE`へ落ちていた。
- pathを正式schemaの`base-media.mp4`へ直すと、同じ1000〜1100ms区間は30〜33 frameへ正しく写った。
- 保存済みfixtureの物理検査は、candidate 13横型20/20、candidate 59横型16/16、candidate 59縦型30/30が合格した。
- 横型の論理幅36の既知例は、stroke・glow込みの実文字枠1768pxがsafe領域1760pxを8px超えるため拒否された。内部clampとsafe areaの3px差を揃えても収まらない。
- candidate 59横型の既知20/36拒否・30/26受理と一致する。

### 判定

safe areaと内部余白のproduction統合欠陥ではなく、合成fixture欠陥だった。論理幅を通った候補も実矩形で物理拒否できるのが現契約であり、幅36を常に通すproduction変更は行っていない。

## 4. 正式attempt v002の保存記録

- TAP: `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v002.tap`
- TAP SHA-256: `2763ff7acd2ca35a6ef900a5691fefbab7be2493a9aa06899d175a11ad1a356e`
- TAP byte数: 48,865
- TAP行数: 1,133
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- Node SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- TSX loader: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- loader SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`
- 実行条件: 10 test file、`--test-concurrency=1`、追加`NODE_OPTIONS`なし
- 結果: 184 pass / 6 fail / TAP上190 tests / exit 1
- 所要: TAP計測24,760.636917ms

TAP全文は今回初めて版付きpathへ保存した。前attemptのように集計だけを残す扱いには戻していない。

## 5. 観測された6不合格

| ID | 観測事実 | 現時点の帰属 |
|---|---|---|
| MIP030 | symlink親を狙った負例が、期待`unsafe-publication-parent`より先に`unsafe-publication-path`で止まった | fixture／環境設営側の疑い。productionは危険pathを拒否している |
| MIP033 | `MEANING_PUBLICATION_TARGET_INVALID`だけが実発火集合から欠けた | MIP030の派生不合格 |
| OEE001 | 合成横型の正常経路が`passed`ではなく`fatal` | 内側fatalはTAPに無く未確認 |
| OEE002 | 合成縦型で、実行環境のfile SHA確認中に`unsafe-file` | 実行環境／検査設営またはlive束縛処理。三分法の確定前 |
| OEE004 | 本来の検査済み拒否code 1より先にfatal code 2 | OEE001/OEE002と同根の可能性があるが未確認 |
| OEE005 | 本来のcore契約拒否code 1より先にfatal code 2 | OEE001/OEE002と同根の可能性があるが未確認 |

### 推測

- MIP030はmacOSの`/var`から`/private/var`への実体path差により、symlink親検査へ届く前にworkspace外判定へ落ちた可能性が高い。修正はしていない。
- OEE群は、正式runtime profileに含まれる実体pathの扱いが一段前でfatalになった可能性がある。保存済みTAPだけではOEE001の内側codeを確定できない。

### 未確認

- OEE001、OEE004、OEE005の内側fatal codeと、OEE002との同根性。
- production欠陥、fixture欠陥、契約矛盾の三分法。

## 6. TAPで結果を観測できなかった15 ID

次の15件はtest sourceに存在するが、今回のTAPに`ok`／`not ok`行が無い。

- OEE006、OEE007、OEE008、OEE009
- OPF001、OPF002、OPF003、OPF004、OPF005、OPF006、OPF007、OPF008、OPF009、OPF010、OPF011

予定205件からこの15件を引くと、TAPの総数190件と一致する。したがって「TAP全文をfileへ保存」は達成したが、「205件全ての結果をTAPで観測」は未達である。

### 推測

OEEのCLI検査がprocess全体のstdoutを一時差し替えるため、並行して流れたtest runnerのTAP行まで取り込んだ可能性がある。ただし、今回の停止後に再実行していないため未確定である。

## 7. 初回37不合格のID別照合

初回停止時に分類した37 IDを、新attemptの保存TAPへ照合した。`合格`は今回のTAPに明示されたもの、`不合格`は`not ok`、`未観測`はTAP行自体が無いものを示す。

| ID | v002 | 帰属または現状 |
|---|---|---|
| MBA003 | 合格 | 例外返値の受け取りfixture修正で解消 |
| MBA026 | 合格 | MBA003と同じ受け取り欠陥の派生を解消 |
| MSL001 | 合格 | 隔離workspaceの話者台帳欠落を解消 |
| MSL014 | 合格 | 厳密byte外形をproductionへ実装 |
| MSL015 | 合格 | owner集合と全体固定順の誤同一視を解消 |
| MSL021 | 合格 | 厳密byte外形をproductionへ実装 |
| MIP001 | 合格 | 1 source timeline fixtureを訂正 |
| MIP003 | 合格 | 同fixture欠陥の派生を解消 |
| MIP030 | 不合格 | `unsafe-publication-path`が先行。fixture／環境設営の疑い |
| MIP033 | 不合格 | MIP030によりcode全発火集合が1件欠落 |
| OPL001 | 合格 | timeline媒体path fixtureを訂正 |
| OPL002 | 合格 | 同上 |
| OPL003 | 合格 | 同上 |
| OPL004 | 合格 | 同上 |
| OPL005 | 合格 | 同上 |
| OPL006 | 合格 | 同上 |
| OPL010 | 合格 | 同上 |
| OPL011 | 合格 | 同上 |
| OPL012 | 合格 | 同上 |
| OPL013 | 合格 | 同上 |
| OPL014 | 合格 | 同上 |
| OPL015 | 合格 | 同上 |
| OPL016 | 合格 | 同上 |
| OPL018 | 合格 | 同上 |
| OPL020 | 合格 | 同上 |
| OPL022 | 合格 | 同上 |
| OPL023 | 合格 | 同上 |
| OPL024 | 合格 | 同上 |
| OEE001 | 不合格 | 正常横型がfatal。内側原因未確認 |
| OEE002 | 不合格 | `unsafe-file` |
| OEE003 | 合格 | 意味package不変 |
| OEE004 | 不合格 | code 2が先行 |
| OEE005 | 不合格 | code 2が先行 |
| OEE006 | 未観測 | TAP結果行なし |
| OEE007 | 未観測 | TAP結果行なし |
| OEE008 | 未観測 | TAP結果行なし |
| OPF011 | 未観測 | TAP結果行なし |

集計は**27合格・6不合格・4未観測＝37件**である。初回37件を全て合格へ転じたとは扱わない。

## 8. 不変と未実施

### 事実

- 横型candidate 13、横型candidate 59、縦型candidate 59の3 rootは、各stable tagとの読み取り専用`git diff`が3/3で差分0だった。各rootの`git status`にも追加・変更は無かった。
- API通信0回、費用US$0。
- 既存3本の正式成果物、stable tag、preset、safe area、契約文書は変更していない。
- 既存回帰は正式attempt不合格のため0件。baselineを合格と報告しない。
- stage、commit、tagは行っていない。

## 9. 停止点

次に必要なのは、同じattemptを黙って直すことではない。

1. MIP030のlogical/real path fixtureを、productionの拒否順を変えずに狙ったsymlink親枝へ到達させる修正設計。
2. OEE001/002/004/005の内側fatalを保存済み情報または読み取り診断で三分法へ確定すること。
3. test runnerのTAP 15件欠落を、正式CLI捕捉とtest runner出力の分離として直す設計。205件全ての結果行を保存できなければ、次attemptを正式完了判定へ使えない。

人間の次判断は、上記3点を一つの版付き修正設計として起草してよいか、である。
