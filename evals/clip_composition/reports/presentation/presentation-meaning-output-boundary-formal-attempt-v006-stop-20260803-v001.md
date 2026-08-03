# 意味／表現境界 正式205件 attempt v006 停止報告 v001

- 実行日: 2026-08-03
- 修正周回: 1 / 2
- 外部API通信: 0回
- 費用: US$0
- 結果: 204 passed / 1 failed

## 結論

正式205件を固定Node・固定TSX・直列実行・native描画環境で頭から1回実行し、204/205で停止した。不合格はOEE001の検査assert 1件だけである。同attemptで修正・再実行せず、既存合格gate 287件、既知baseline 181件、既存3本tree最終照合、commit Aへ進んでいない。

今回直した5件のうち、OEE002・OEE005・OEE007・OEE008は合格した。OEE001もproduction経路は終了0となり、受入、描画、QC、正式成果物生成を通過した。その後、検査だけが「QC成果物内に整数でない有限小数が最低1個存在する」と要求して不合格になった。

## 実行証拠

| 成果物 | path | SHA-256 | byte |
|---|---|---|---:|
| TAP全文 | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v006.tap` | `6239d78ba360209791f6158dcdaa01221b45f36055eef9e22df1fb87657ddeb1` | 44,436 |
| stderr | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v006.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |

TAPは205件を記録し、`pass 204 / fail 1 / cancelled 0 / skipped 0 / todo 0`だった。実行前に同じ監視領域へ書き込む並行process 0件、`NODE_OPTIONS`未設定、固定実体3件のSHA一致を確認した。

## 5件の到達結果

| ID | v006 | 処理上の意味 |
|---|---:|---|
| OEE001 | 不合格 | productionは終了0・正式成果物生成まで成立。後置された小数存在assertだけ不成立 |
| OEE002 | 合格 | 縦cropの論理path／実体path差を解消し、正式縦経路が成立 |
| OEE005 | 合格 | 固定NodeのPATHを子processにも継承したnative描画で、空字幕を既存QCが期待どおり拒否 |
| OEE007 | 合格 | 描画成立後の故障注入により、余分なstaging fileを正式staging検査が所有 |
| OEE008 | 合格 | 描画成立後の公開競合注入により、atomic publicationが期待どおり所有 |

## OEE001の事実・判断・未確認

### 事実

- 正式CLI終了codeは0だった。
- 受入状態、横型style、identity crop、QC状態はいずれも合格だった。
- 不合格行は、QC成果物を再帰走査して「整数でない有限小数が1個以上あること」を要求するassertだった。
- 正式QC契約は、数値が有限・`-0`でない・整数ならsafe integerであることを要求するが、「有限小数が最低1個存在すること」は要求していない。
- v006の同assertより前でproduction成果物の組立・直列化は完了している。

### 判断

現時点の第一帰属は検査期待の過剰指定である。内部画面幾何が有限小数を**受理できること**と、任意の正常動画のQCに有限小数が**必ず現れること**は別であり、後者は承認済み契約から導けない。

### 未確認

v006の一時fixtureは検査終了時に既定どおり削除されたため、QC内の全数値一覧は保存されていない。次周回で修正する前に、既存の数値区分契約とOEE001の本来の検査目的を照合し、このassertを除くのか、有限小数受理を別の決定的合成値で検査するのかを確定する必要がある。

## 変更した実装のSHA

| path | 修正後SHA-256 | 意味 |
|---|---|---|
| `evals/clip_composition/presentation_output_render_plan_v001.mjs` | `e2e5fb23562a50bc0560dad1f9d210ba8009548bdba05b7394ae4ed458783391` | 3つの外部参照を正式成果物境界で通常JSON objectへ複製 |
| `evals/clip_composition/run_presentation_output_job_v001.ts` | `f4e8994e4dc08879cdbce55fa38e28bf126bdae1fac7b9cc8ac8cc9341db8e5e` | crop済み内部媒体を実体pathへ正規化 |
| `evals/clip_composition/presentation_output_render_plan_v001.test.mjs` | `2fb618afd5e3ca136656abca40abcc02e4be9f0195412e468c9e21db1745b5cc` | staging／公開の故障注入を描画済みvideo成立後へ限定 |

## 通信に関する補足

正式v006実行の通信は0回だった。先行する読み取り診断では、診断補助が1回だけ`npm exec`を使い、`tsx@4.23.5`を導入するとする警告を出した。repoのpackage/lock変更、Gemini / Google API通信、秘密送信、課金は0件だが、npm registry通信はcache解決との判別ができず「可能性あり・未確認」である。詳細は診断v001へ保存した。

## 停止点

- 周回1 / 2を消費した。
- 周回2は未着手で、残り1回である。
- 不合格1件で停止する規律に従い、OEE001検査の変更、正式205件の再実行、既存回帰、commit Aは行っていない。
- 次に進む場合は、OEE001の小数存在assertを契約へ照合した限定修正だけを行い、正式205件を新attemptとして1回実行する。周回2でも205/205にならなければ、3周目を行わず実装計画を差し戻す。
