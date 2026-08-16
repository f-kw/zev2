# ZEVO字幕品質v002 v022 描画filesystem preflight停止報告 v001

## 1. 結論

正式描画attemptの開始前に停止した。新版proof jobと未使用出力rootを発行し、承認済みの正式出力親directory chainをsymlinkなしで作成した後、P/R/F描画・QC・確認ページまでのfilesystem前提をproductionの共用path投影から全件逆引きした。

実体前提は、必須directory 3/3、未使用path 20/20、renderer一時work prefix 3/3、file/canonical束縛156/156、固定runtime、native Chromium、正式command形の全てが合格した。一方、preflight自身のfilesystem種別測定がmacOS `stat`の書式を誤用し、APFS種別ではなくmount先 `/` を返したため、正式preflightは `failed` となった。

不合格一件停止と同attempt修正0件を適用し、測定処理を修正せず停止する。proof runner、P/R/F、renderer、QC、確認ページは一度も起動していない。

## 2. 到達点

| 工程 | 結果 |
|---|---:|
| 新版proof job発行 | 合格 |
| 変更値 | job ID・正式出力rootのみ |
| implementation／契約／runtime／入力binding | 旧合格jobからbyte不変 |
| 正式出力親directory chain | 欠落から実directoryへ明示作成 |
| 必須directory | 3/3 |
| 出力・staging・review・renderer導出pathの不存在 | 20/20 |
| renderer一時work prefixの未使用 | 3/3 |
| file/canonical束縛 | 156/156 |
| 固定runtime・native architecture・NODE_OPTIONS不存在・固定PATH | 合格 |
| Chromium起動 | 合格 |
| 正式起動command形 | 合格 |
| filesystem種別測定 | 不合格 |
| 正式proof runner起動 | 0回 |
| 横型描画 | 0/3 |
| QC | 0/3 |
| 確認ページ | 0件 |

## 3. 具体的な不合格

正式preflightは、正式出力親に対して `/usr/bin/stat -f %T` を実行し、返却値が `apfs` であることを期待した。実測は終了code 0・stderr 0 byte・stdout `/` だった。

停止後の読み取り専用対照では次を確認した。

- `df`のAPFS種別指定は対象pathを `/System/Volumes/Data` 上のfilesystemとして列挙した。
- mount表は `/System/Volumes/Data` を `apfs` と記録している。
- `stat`のfile種別表示は対象を `Directory` と記録した。

したがって、APFSでないことは観測されていない。観測されたのは、正式preflightがfilesystem種別を読めない書式を使ったことだけである。ただし、正式recordの不合格を読み取り対照で合格へ上書きせず、そのまま保持する。

## 4. 三分法

| 帰属 | 判定 | 根拠 |
|---|---|---|
| production | 欠陥0件 | proof runner・rendererは未起動。production共用path投影は20 pathと3 prefixを決定的に導出した |
| job／入力 | 欠陥0件 | decoder合格、変更はjob ID・出力rootだけ、156束縛全一致 |
| 実行前preflight設営 | 欠陥1件 | filesystem種別の測定commandと期待値がmacOS実挙動に一致しない |
| 契約解釈 | 不要 | productionやschemaの意味変更を要しないが、連鎖停止のため自動修正しない |

帰属は「実行前preflightの測定器欠陥」である。

## 5. 事前検出可能性

事前検出できた。過去に同じくfilesystem種別の測定手段誤りを訂正した記録があり、今回のpreflight実装前に、採用commandがこのmacOSで返す値を読み取り実測すべきだった。全filesystem前提の閉包を優先しながら、その閉包を判定する測定器自体の現物確認を落とした。

## 6. 連鎖停止の適用

相談役の事前申告では、v022以降に検査設営・preflight起因の停止が5件連続しており、次の設営起因停止では連鎖状況をkawafmmへ戻す条件だった。本停止はその次のpreflight起因停止に該当する。

このため、次の明白な限定訂正（APFS種別をこの環境で実測できる既存手段へ置換し、新版preflightを発行する）を同turnで実施しない。字幕AI経路を現到達点で凍結するか、閉包済みpath一件表を使った描画を一回だけ再承認するかは、人間裁定へ戻す。

## 7. 不変保持

- v022正式selectionと既知6境界6/6は不変。
- 旧失敗job・attempt-0001・fatal証拠は不変。
- 新版jobとfailed preflight recordは不変。
- 作成した正式出力親directoryは空の実directoryとして保持し、削除・再利用判断を行わない。
- API通信0回、追加費用US$0、回答修復0件、commit 0件、stable tag 0件。

## 8. 裁定依頼

本停止と連鎖条件の発効を受理するか裁定を求める。再開する場合は、測定器の現物実測を先に閉じた新版preflightを未使用job／rootへ適用し、合格時だけP/R/F→横型3本→QC→確認ページへ進む限定案となる。字幕AI経路の凍結・別経路での確認用描画を選ぶ場合は、その範囲を新たに固定する必要がある。
