# 工程III 未管理データの整理と再発防止

## 実施結果

元workspaceの未追跡表示を **59,153件から47件** へ減らした。元のbranch・HEAD・index・既存の追跡差分を保持し、実体の削除・移動・書換えは行っていない。専用treeだけのclean確認ではなく、元workspaceとGitに登録された14の現存作業treeを実測した。登録上残る不在tree1件は触っていない。

未保存の軽量記録は元workspace40件（commit `880c063d`）と関連tree31件（commit `679f2fb0`）を独立保存した。各元treeの同ファイルは意図して可視のまま残す。既存commitと同byteの2件は重複保存しない。個々の出所・SHAは別の救済manifestへ保存。

| 既存作業treeの親folder | 整理前 | 整理後 |
|---|---:|---:|
| workspace | 59153 | 47 |
| zev-auto-effects-phase1-puocgzuv | 254 | 3 |
| zev-auto-effects-phase2-9n461w4w | 80 | 0 |
| zev-auto-effects-phase3-pkq1_r50 | 216 | 0 |
| zev-connection-study-_ijhcn1e | 0 | 0 |
| zev-current-normal-preview-r_87cdss | 279 | 23 |
| zev-one-edit-e2e-cqdrbc6a | 8577 | 8 |
| zev-pulse-accent-fswa9cuw | 226 | 0 |
| zev-trust-v003-preflight-gdvc9vm6 | 2 | 2 |
| zev-visual-variation-v9c1j07h | 108 | 0 |
| zev-vocal-accent-6mnpszdq | 108 | 0 |
| zev-caption-stage1-en1loox_ | 7175 | 2 |
| zev-connection-stage2-r7ddhyxp | 0 | 0 |
| zev-qc-fast-73wz922r | 0 | 0 |

件数は各treeで `git ls-files --others --exclude-standard -z` が返したpath数。同じpathが別treeにあれば別件と数える。提示された抜粋を全repo数へ読み替えていない。詳しい集計・限定残件・保全結果はresult.json。

## 保存方針と処置

| 系統 | 所在と扱い | 保持理由・参照 |
|---|---|---|
| 原素材・STT | 既存research/downloadsとSsdxVhwxyYo_local30の既知媒体／6生成basenameだけ非Git管理 | 唯一性や再生成可能性を断定しない保管データ。追跡済み完了検証のSTT16参照とSHA一致 |
| 完成候補 | 既存presentationの各runに保持 | 既存報告・manifest・候補SHAから参照。工程I/II候補のSHAも完了記録と一致 |
| 画素・PCM・mask・process log | 確認済みrenderer固有作業leafと検査生成leafで保持 | 過去QC・失敗の監査証拠。削除可やbackup済みとは扱わない |
| 軽量計画・判断・レビュー・集約QC | 原path・原byteで71件を救済commit | 過去の主張は当時の記録。現在の承認・正式採用へ昇格しない |
| 新工程III出力 | outputs/presentation/stage3-orchestration-* の未使用run先 | 再現helper・test・軽量入力は生成root外へ分離 |

既存outputsにはsourceや文書が混在するため全面除外しない。共有.gitignoreへ86のroot相対規則を追加し、元workspaceと関連treeにも同じ規則を実info/excludeへ追記した。元の設定byteを保持し、両者の規則一致を照合した。sourceを隠さず、確認済みrun系列・生成leaf・basenameに限定した。

独立確認では延べ38,294の追跡済みsource/doc pathへの規則一致0、初回の未追跡手書きsource/doc隠蔽0。除外されたJS2件は保存済みsourceからのesbuild bundle。将来のsource等14sentinelも可視。後続の6規則はNormal previewの生成測定basenameに限定する。

## 再発防止の確認

小さな出力先検査を追加し、repository内・未使用・実directory・未追跡・有効ignore適用を入口で要求する。小型試験では新しい生成frameが未追跡一覧へ出ず、隣のsourceは可視。範囲外・未除外・既存先・symlink先は拒否。macOSのtmp別名をfixtureで実pathへ直し再検査PASS（検査設営の修正）。既存rendererの安全な確定手順を再利用し、新たな全repo hook等は作らない。

次の実工程III runでも、1GB級の背景・PCM・実測証拠・失敗記録を指定rootへ生成し、未追跡一覧への再流入0を確認した。QCや媒体の検査量は削っていない。

## 可視の限定残件

元workspace: 救済済み40件＋既保存1件＋別API準備6件。関連tree: 救済済み31件＋既保存1件＋別trust4件＋環境symlink2件。元のQC方針の追跡差分も変更せず保持する。別API準備・trust候補は権限や受入の継承を行わず、ignore/pushしない。これらに依存しない工程IIIは継続する。

整理は容量回収ではない。媒体や証拠の所在、参照、bytesを保持し、backup済み・削除可とは報告しない。
