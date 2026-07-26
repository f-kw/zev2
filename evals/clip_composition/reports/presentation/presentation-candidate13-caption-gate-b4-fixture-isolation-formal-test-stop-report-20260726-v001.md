# candidate 13 B4 fixture隔離修正後 133件停止報告 v001

- 日付: 2026-07-26
- 状態: 正式133件が132/133で不合格。承認済み停止条件に従い停止
- 人間作業: 0件
- 自動再試行: 0回
- 同attemptでの修正: なし

## 1. 到達地点

合成検査が再利用する上流jobの正式出力先を、そのjobの宣言値から導出し、
合成ファイルシステム内では常に不存在として隔離する修正を
commit `265cc3e6f8c99d147f7097affbb7648078de6ca8`へ固定した。

正式成果物の削除・移動・改名、production、契約、数値token方針、
正式job、期待する違反は変更していない。

その後、固定済みNode・TSX・esbuild実体を使うネイティブ環境で、
意味回答側133件を先頭から一回だけ実行した。

結果は132件合格、1件不合格だった。
133/133ではないため、回帰95件とcandidate 13 preflight v002へは進んでいない。

## 2. fixture修正の意味

旧fixtureは、合成package自身の出力先だけを仮想化し、
再利用するGate A jobが指す正式出力先は実ディスクへ通していた。

修正後は次のように扱う。

1. 合成runnerを作るたび、再利用する入力jobから正式出力先を読む。
2. そのpathを合成ファイルシステムの管理領域へ加える。
3. file・directory・symlinkを読む全入口で、管理領域の不存在を返す。
4. pathは入力jobから導出し、素材IDやcandidate 13のpathをコードへ焼き込まない。
5. 実ディスク上の正式成果物には触れない。

合成検査のうち、同じprocess内でこのファイルシステムを注入する経路は
実在成果物の増加から隔離された。

## 3. 正式133件

| 項目 | 結果 |
|---|---:|
| 検査総数 | 133 |
| 合格 | 132 |
| 不合格 | 1 |
| skipped | 0 |
| todo | 0 |
| cancelled | 0 |
| process終了 | 1 |

TAP:

`evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-semantic-source-fixture-isolation-v001/semantic-source-package-133.tap`

TAP SHA-256:

`3940484451bcf69dc2b4922b12c436cd47f87d553b5046dfb42f7ed8ad6674a7`

実行環境:

`evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-semantic-source-fixture-isolation-v001/execution-environment.json`

## 4. 旧7件との対応

| 旧不合格 | 今回 | 観測 |
|---:|---|---|
| 44 | 合格 | 非空監視投影のproduction経路が隔離環境で成立 |
| 122 | 合格 | 読み取り専用の正常組み立て経路へ到達 |
| 123 | 合格 | 各組み立て失敗の所定段階へ到達 |
| 124 | 合格 | 公開前の各安全停止へ到達 |
| 125 | 合格 | 正式成果物読取故障の検査へ到達 |
| 126 | 合格 | 公開失敗後のfatal経路へ到達 |
| 131 | 不合格 | 実processの正常経路が終了1。期待は終了0 |

旧7件のうち6件が解消し、新規転落は0件だった。
修正の主因理解は、注入可能な合成runner経路について実証された。

## 5. 残る1件の観測範囲

検査131だけは、合成ファイルシステムを注入せず、
production CLIを別processとして起動する。

今回追加した隔離情報はtest内の合成runnerだけが持ち、
正式jobのbyteへは入らない。
したがって別processはその隔離を使わず、実workspaceを読む構造のままである。

TAPで確定している事実:

- 別processの終了は1。
- 期待した正常終了0ではない。
- TAPは子processのstdout内容を保存していないため、内側違反の原値は未確定。

静的構造上、残る一件は「別process経路だけが隔離外」の範囲と一致する。
ただし同attemptで子processを再実行して内訳を採取していないため、
内側違反を推測で確定しない。

## 6. 水平確認

### 6.1 回帰95件

固定5検査を静的に確認した。

| 検査群 | 実在正式出力への暗黙依存 |
|---|---|
| v002字幕契約 | 0件。合成値・固定testdataで完結 |
| v002指示書契約 | 0件。一時directoryを都度生成 |
| 話者契約 | 0件。一時directoryを都度生成 |
| timeline v002 | 0件。合成値で完結 |
| renderer v002 | 0件。専用合成root内へ一意な一時directoryを都度生成 |

renderer検査の一時directoryはworkspace内だが、
正式packageや正式pairのpathを借りず、一意な新規directoryを使う。
今回と同じ「正式物が増えると不存在前提が崩れる」参照は見つからなかった。

### 6.2 candidate 13 preflight v002

preflight v002 jobはまだ生成されていない。
既存設計ではB3正式入力を明示bindingとして読むため、これは暗黙依存ではなく検査対象そのものである。
preflightは正式出力を作らない読み取り専用工程であり、今回と同じ出力先不存在の借用は
現在の実装・設計参照から0件だった。

ただしjob未生成・未実行なので、合格を先取りしない。

## 7. 確定済み原則との整合

- R2案A: 132/133を部分合格にせず、後続全体を停止した。
- hash意味: file hash・canonical hash・binding値を変更していない。
- 数値区分: 整数、認定済み表示係数、内部画面幾何の契約を変更していない。
- 帰属の可視化: 別processの内側理由がTAPへ残らず、登録済み観測性課題と同型の実害が継続した。
- 正式成果物不可侵: B3正式7ファイルに作業ツリー変更はない。

## 8. 停止点

未実施:

- 不合格131の再実行・修正。
- 回帰95件。
- candidate 13 preflight v002のjob生成・実行。
- B4完了報告。
- `stable/b4-complete-20260726`相当のtag。
- JOURNAL entry。
- B5承認依頼の正式起草。

最新安定点は`stable/b3-complete-20260725`のままである。

## 9. 次の判断

次へ進むには、別process検査131を実在成果物から隔離する方法を、
production公開面を増やさず、candidate 13固有pathを使わずに設計する必要がある。

推奨する次の承認単位は、**実process検査用の上流job・出力namespaceを
一時領域へ複製する検査設計の起草**である。
production runner、正式成果物、正式jobを変えず、
別processが読む入力一式と出力先だけを検査所有の一時workspaceへ閉じる。

本報告では設計・実装・再実行へ進まない。
