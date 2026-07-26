# candidate 13 B4 別process隔離完了・preflight v002停止報告 v001

- 日付: 2026-07-26
- 状態: 意味回答133件と回帰95件は全合格。candidate 13 preflight v002が11/12で不合格となり停止
- 人間作業: 0件
- 自動再試行: 0回
- 同attemptでの修正: なし
- 最新安定点: `stable/b3-complete-20260725`

## 1. 到達地点

検査131の子processが返した実際の報告を先に観測し、
失敗が`GATE_A_CONTEXT_INVALID`一件だけであることを確定した。

その上で、検査が束縛済み入力だけを一意な一時workspaceへbyte同一コピーし、
コピーしたproduction CLIを通常の`node <runner> <job>`入口から起動するよう修正した。
production CLI、契約、正式job、正式成果物へ検査専用分岐は追加していない。

修正をcommit `ca74da85`へ固定した後、承認済み順序で次を実行した。

1. 意味回答側133件。
2. 133/133を確認して回帰95件。
3. 95/95を確認してcandidate 13読み取り専用preflight v002を一回。

preflight v002が終了1だったため、B4完了、安定点tag、JOURNAL、B5起草へは進んでいない。

## 2. 検査131の観測確定

読み取り専用の単独観測:

| 項目 | 観測 |
|---|---|
| 子process終了 | 1 |
| 標準出力 | 0 byte |
| 標準エラー | 信頼済み失敗報告 |
| 失敗段階 | Gate A入力文脈 |
| 違反 | `GATE_A_CONTEXT_INVALID` 1件 |
| job・実装・入力・実行環境 | 全て合格 |

同process内の合成ファイルシステムだけが隠していた既存Gate A正式出力を、
別processが実workspaceから見たことが単独原因だった。
重なった第二原因は観測されなかった。

この内側理由は正式133件の旧TAPには残らず、追加観測が必要だった。
登録済みfatal観測性課題へ、検査131を新しい実害例として加える。

## 3. 別process隔離の実装

実装の意味:

1. 合成package jobとGate A jobの束縛から、必要な実装・入力・台帳fileの閉集合を作る。
2. OS一時領域へ原子的に一意なworkspaceを作る。
3. 閉集合だけをrepository-relative pathを保って通常fileとしてbyte同一コピーする。
4. Gate A正式出力をコピーせず、不存在前提を一時workspace内で自然に再現する。
5. コピーしたproduction runnerの既存preflight入口で開始状態を計算する。
6. 同じrunnerを別processの通常CLIとして起動する。
7. 正常経路は終了0、Gate A期待hashを壊した経路は終了1と所定違反になることを確認する。
8. `finally`で一時workspaceだけを削除する。
9. 本番workspaceの正式入力rootを前後で全file hash照合し、変更0件を確認する。

並行実行時は一時directory名が衝突せず、正式成果物が今後増えても
jobの束縛外成果物を一時workspaceへ取り込まない。

設計:

`evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-process-workspace-isolation-design-20260726-v001.md`

## 4. 意味回答側133件

| 項目 | 結果 |
|---|---:|
| 検査 | 133 |
| 合格 | 133 |
| 不合格 | 0 |
| skipped / todo / cancelled | 0 / 0 / 0 |
| process終了 | 0 |

TAP:

`evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-semantic-source-process-workspace-isolation-v001/semantic-source-package-133.tap`

SHA-256:

`6bf8310186e81045f226ccea2daa8e9b5ca27428636ba869cda7b20cf2aaaaff`

旧7不合格は全て解消し、新規転落は0件。
検査131の正常・違反の双方がproduction CLIの別process入口で成立した。

## 5. 回帰95件

| 系統 | 合格 |
|---|---:|
| v002字幕契約 | 24/24 |
| v002指示書契約 | 27/27 |
| 話者契約 | 10/10 |
| timeline v002 | 15/15 |
| renderer v002 | 19/19 |
| 合計 | **95/95** |

TAP:

`evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-semantic-source-process-workspace-isolation-v001/regression-95.tap`

SHA-256:

`0d17d6d7f62ed2a9987fa42ae926eb44c5d2db7115a77a26b43bf0e6d9b2d077`

## 6. candidate 13 preflight v002

旧v001 jobは変更せず、承認済み設計の新pathへv002 jobを作成した。

job:

`evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/DmWu0jVQfTE-candidate-13-caption-display-pair-b4-v002.json`

job SHA-256:

`b2db7a7e5040d703dd279493d98a1471572e74d2e62134c0ce4029c18b9db660`

実行結果:

| 項目 | 結果 |
|---|---:|
| 固定check | 12 |
| 合格 | 11 |
| 不合格 | 1 |
| process終了 | 1 |
| stderr | 0 byte |
| 自動再試行 | 0 |

合格したもの:

- job binding
- implementation binding
- source package binding
- retained source binding
- base media binding
- registry binding
- runtime binding
- source atom投影
- container投影
- boundary candidate投影
- timeline投影

不合格:

- 読み取り専用check
- 違反`READ_ONLY_CONTRACT_VIOLATED`

観測値:

| 値 | SHA-256 |
|---|---|
| jobへ固定した開始投影 | `4ce8fe4f28ceefb3036c5d5fd521d939d1d11d96e93a05357c127684bc2c52ff` |
| runnerが実測した開始投影 | `632386d80a190cc3a289e1653c1a18ffb2b2f2dd7371d2e3e9d8955348e4eee0` |
| runnerが実測した終了投影 | `632386d80a190cc3a289e1653c1a18ffb2b2f2dd7371d2e3e9d8955348e4eee0` |

開始と終了は完全一致している。つまりpreflight中の変更は観測されていない。
不合格は、job生成時に固定した期待開始投影だけが実runnerの計算と違うためである。

stdout:

`evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-semantic-source-process-workspace-isolation-v001/candidate13-preflight-v002.stdout.json`

stdout SHA-256:

`214a7c49e7407336f62129161b9089f5451fd1e58b982424b6505f3849dd6baa`

## 7. 不一致の読み取り専用診断

job生成時の投影処理と、production preflight runnerの投影処理を静的に照合し、
同じ現行treeをそれぞれの規則で再計算した。

違いは二つある。

1. job生成処理は監視root自身を投影行へ含めたが、production runnerはrootの子から始める。
2. job生成処理はUTF-16比較で名前を並べたが、production runnerは英語locale比較で並べる。

production runnerと同じ規則へ揃えた読み取り専用再計算は
`632386d80a...`となり、実行報告の開始・終了値と一致した。

帰属:

**正式成果物やproduction runnerの変更ではなく、v002 job生成処理が
productionの開始投影規則と同じ入口を使わず、二つの計算差を持ち込んだ生成側欠陥。**

これは期待値を実測後に動かして同attemptで再実行してよい理由にはしない。
不合格job・stdout・空stderrを証拠として保持し、修正・再生成・再実行を行わず停止する。

## 8. 正式成果物と停止点

- preflightは読み取り専用で、開始・終了投影は同一。
- B3正式source-only package、正式基礎映像、残存発話、台帳は各binding検査に合格。
- 正式表示計画は生成していない。
- Gemini、指示書、描画は未実施。
- B4完了とは認定しない。
- 安定点tagとJOURNAL entryは追加しない。
- B5承認依頼は起草しない。

最新撤退点は`stable/b3-complete-20260725`のままである。

## 9. 次の人間判断

次の作業には、preflight期待開始投影をproduction runnerと同一の版付き入口から作る
修正設計の承認が必要である。

推奨方向は、job生成側で投影処理を再実装せず、production runnerが実際に使う
読み取り専用投影処理をjob作成にも共用すること。
production公開面を増やす必要がある場合は、版付き契約改訂として先に提示する。

本報告ではその設計・修正・job v003生成・preflight再実行へ進まない。
