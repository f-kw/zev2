# ZEVO字幕品質v002 Fゲート正式attempt前監査 停止報告 v001

- 日付: 2026-08-12
- 外部通信: 0回
- API費用: US$0
- 正式描画: 0件
- F/U正式attempt: 0回

## 1. 結論

P/Rのmodule表面修正と再検査は合格した。S/A/Lへの横展開でも余分なsource exportは0件だった。

Fのproductionと検査を作成後、正式attempt前監査で、承認済みF契約が要求する失敗枝の全実発火を、現行の正式入口だけでは決定的に設営できないことを確認した。未観測枝を観測済みとしてproof 489件へ計上せず、F正式attemptを開始せず停止した。

## 2. 事実

### 2.1 完了済み

| 工程 | 結果 | 証拠 |
|---|---:|---|
| P module exact表面・import副作用・既存検査 | 10/10 | TAP全文を監視root外へ保存済み、stderr 0 byte |
| R module exact表面・import副作用・既存検査 | 4/4 | TAP全文を監視root外へ保存済み、stderr 0 byte |
| S/A/L 横展開 | 余分export 0件 | 実module namespaceと承認文書byte由来の集合を照合済み |

P/Rでは契約済み関数だけをexportし、schema名とcode定数をmodule-privateへ戻した。検査は不足と余分を双方向で拒否し、direct import時のfile I/O、process起動、stdout、stderrが0件であることを実測した。

### 2.2 Fで実装済みだが未認定の範囲

F productionには、正常な3候補をplanner、render plan、共通描画、QC、review、completionへ通す処理を接続した。検査済みrejectedとfatalを別成果物へ保存し、正式rootを排他的に公開する処理も実装途中まで進めた。

ただしF正式attemptは0回である。この部分実装とF testは、合格済み成果物として扱わない。U production/testも作成済みだが正式attemptは0回である。

## 3. 停止原因

### 3.1 契約が要求する観測

ZCQ044は、output request、page/line plan、render plan、renderer、QC、rejection report、fatal observation、review、completion、root公開の各段について、内容拒否、読取失敗、書込失敗、公開前差替え、late collision等を実枝で観測することを要求する。

### 3.2 現入口から決定的に作れる状態

現行のexport済み実行入口が受け取るのは、正式job pathとatomic publisher loaderだけである。この入口からは、次の状態を決定的に作れる。

- job/schema/case/binding不正
- 上流fileの欠落またはbyte不一致
- 開始時のroot/staging競合
- atomic publisherのlate collisionまたはhelper失敗
- 正常な3候補描画

一方、staging作成後の特定時点だけでreview fileを衝突させる、completion書込だけを失敗させる、renderer/QCへ特定の検査済み結果だけを返させる、といった状態は現入口から決定的に作れない。

これらを無理に作る方法は、未契約の依存注入、productionのtest専用分岐、watcher/polling/timer、並行書込みのいずれかになる。後三者は既裁定で禁止されている。最初の依存注入は、実行入口のexact引数を変えるため契約判断を要する。

### 3.3 module表面の追加未固定

path #11は`.ts`で、固定TSX実体から物理`.mjs` importerを通して読むと、sourceが明示した5 named exportに加え、TSXのCommonJS相互運用による`default` wrapperがmodule namespaceへ現れる。wrapper内部は同じ5関数だけで、source上の余分exportは0件である。

承認文書は「exact named export集合」を記す一方、2026-08-12の恒久規律は「実module namespace exact照合」と記す。この二つにおいてTSXが付加する`default`を数えるかが未固定である。検査側で黙って除外せず、判断へ戻す。

## 4. 三分法

| 対象 | 帰属 | 根拠 |
|---|---|---|
| P/R | 解消済みproduction+test欠陥 | 契約外exportをprivate化し、14/14を新attemptで実測 |
| F失敗枝の設営 | 契約・実装設計の検査可能性未閉包 | 要求枝に対する決定的な状態供給経路がexact実行引数へ存在しない |
| F/U部分実装 | 未完了実装 | 正式attempt前であり合否未確定 |
| TSX `default` wrapper | 契約語義の未固定 | source authored exportとruntime namespaceの数え方が一致していない |

## 5. 修正候補

| 案 | 内容 | 契約影響 | 判定 |
|---|---|---|---|
| A | proof実行入口へexact capability objectを一件追加する。formal CLIは既存正本関数だけを固定して渡し、job・環境から選ばせない。検査は同じ入口へ決定的なread/write/renderer/QC/publisher capabilityを渡して全枝を実発火する | 実行入口のexact引数だけ版付き追補が必要。formal job schema・code・検査ID・path数は不変にできる | 推奨 |
| B | ZCQ044の一部をpure分類器の直接検査へ読み替え、runner外側の実発火要求を減らす | 証明を弱める契約改訂 | 不採用 |
| C | filesystem権限、並行差替え、watcher、timerで段階別失敗を作る | 既存の決定性・単一監視領域規律に反する | 不採用 |

module表面は、次のどちらかを同じ追補で固定する必要がある。

1. source authored named export 5件を正本とし、TSX相互運用`default`が現れる環境では、そのwrapperが同じ5関数だけを持つことを併せてexact検査する。
2. runtime namespaceから`default`をなくすpath/type構成へ変える。path #11変更またはpackage境界変更を伴うため、17 pathと既存bindingへの波及が大きい。

推奨は1である。余分なproduction機能を許さず、TSX runtimeの既知相互運用だけを明示できる。

## 6. 再発防止

今回の未閉包は、実現性調査で事前検出できた。proof itemを「期待する結果」から読むだけでなく、各枝について「正式入口のどのexact引数から、決定的な初期状態をどう供給するか」を逆引きしていれば、F実装前に判明した。

以後の完全実装設計では、正常経路だけでなく全負例について、`proof item → 最初に不成立にするpredicate → 状態供給者 → exact実行引数 → production実枝 → 保存成果物`を一件表で閉じる必要がある。

## 7. 現在地

- P/R: 合格済み。
- S/A/L: 合格済み。横展開module表面差0件。
- F: 部分実装、正式attempt 0回、未認定。
- U: 実装済み、正式attempt 0回、未認定。
- 正式46件、直接影響回帰、green 287、baseline 86/203、tree照合: 未実施。
- API通信、費用支出、正式描画、stable tag: 0件。

本報告提示で停止する。
