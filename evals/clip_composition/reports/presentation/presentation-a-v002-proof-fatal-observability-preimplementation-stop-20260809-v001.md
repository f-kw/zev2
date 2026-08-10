# A-v002 proof専用fatal観測性 実装前停止報告 v001

日付: 2026-08-09  
通信: 0回  
費用: US$0  
実装: 0 path  
再実行: 0回

## 1. 結論

proof runner専用の最小fatal観測性は、runnerと同testの2 pathだけで実装できる。

ただし、承認された「観測装備を実装した後も、同一job SHA `a0794441...`を値変更なしで再実行する」という条件は、現行jobのlive実装束縛と両立しない。観測装備の実装前に確定できたため、コードを変更せず停止した。

## 2. 実現性調査

### 2.1 5要件の実装可否

共有fatal schema・分類入口・既存5境界を変えず、proof runnerの正式stdoutへローカルな閉構造を併記すれば、次を2 path内で実現できる。

1. 共通fatalが`unknown / UNCLASSIFIED`でも、proof runnerが確定した段階名を保持する。
2. `dependency-initialization`と`start-input-reread`の入場・完了を固定順checkpointで残す。
3. 開始時再読を`job / upstream-json / source-media / implementation-file / runtime-binary / tool-inspection`へ閉じる。
4. 対象fileは検証済みbindingまたは実読取証拠からだけ採用し、確定不能は`null`にする。
5. 例外を`module-load / json-decode / file-read / tool-inspection / unknown`等の閉語彙へ即時変換し、生message・stack・stderr・本文・secretを保存しない。

既存の合格・検査済み拒否、違反code、終了code、共通fatal observationは変更しない。

### 2.2 同一jobとの衝突

保存済みjobは、先頭の実装束縛としてproof runner自身を固定している。

| 項目 | 固定値 |
|---|---|
| job SHA-256 | `a07944411b08b72702c1d60b3792ceed7387f61f40d099f7eb7909b812a00e86` |
| 束縛path | `evals/clip_composition/run_presentation_a_v002_layer1_v3_proof_job_v001.ts` |
| 束縛SHA-256 | `4c4bba6516f9bee6dbb329e7552c78e2ddd0e2ddcb5fd109eb36128f8572d49f` |
| 現在のrunner SHA-256 | `4c4bba6516f9bee6dbb329e7552c78e2ddd0e2ddcb5fd109eb36128f8572d49f` |

runnerは開始時再読で、job内の全実装束縛を先頭から現物のstreaming SHAと照合する。観測装備を追加すればrunnerの現物SHAは必ず変わるため、同一jobは最初の`proof-runner`行で`OUTPUT_V002_PLANNER_INPUT_INVALID /implementationBindings`として正しく拒否される。

この拒否は、元の未分類fatalが依存初期化で再現すればその後にしか到達しない。一方、依存初期化が通過した場合は、元の原因が開始時再読の実装file工程以降にあっても、改訂で生じた自己SHA差が先に停止させる。したがって同一jobの再実行では、元原因の再現性を一般には判定できない。

これは環境揺れではなく、実装前に決定的に分かる実験設計上の交絡である。

## 3. 本来の目的との照合

本作業の目的は「同じ未分類fatalの内側原因を、追加観測で確定すること」である。

既知の自己SHA差で別の拒否を発火させる実行は、通信・費用こそ0だが、原因確定へ届かない可能性が事前に分かっている。実現性調査の恒久ルールに従い、形だけ同一jobを実行してattemptを消費しない。

## 4. 選択肢

| 案 | 内容 | live束縛 | 原因診断 | 判定 |
|---|---|---:|---:|---|
| A | 観測装備実装後、旧jobを不変証拠として保持し、**proof-runner SHAだけを新実体へ更新した版付き再束縛job**を1件作る。他の値・出力rootは不変 | 維持 | 可能 | **推奨** |
| B | 改訂runnerへ同一旧jobを渡し、既知の自己SHA拒否も「fatal非再現」として記録する | 維持 | 原因が早期再現した場合だけ可能 | 非推奨 |
| C | proof-runnerのlive SHA照合を外す、または旧SHAを特例受理する | 低下 | 可能 | 契約改訂・特例なので不可 |
| D | 第3のwrapper/helperへ観測を逃がしrunner byteを保つ | jobがhelperを束縛しない | 不完全 | 2 path制約・実装束縛原則に反するため不可 |
| E | 改訂前runnerの既存exportを同じ固定環境で`依存初期化→開始時再読`の二段に分けて一度診断する | 維持 | 現在再現する境界だけ判定可能 | durable観測装備と正式proofの代替にはならない補助案 |

案Aで変えるjob値は、`implementationBindings`の`proof-runner.fileSha256` 1件だけである。保存済みjob、失敗証拠、正式入力、三候補、style、出力rootは不変保持する。新jobのbyteとSHAは実装後に正式serializerで固定する。

案Eはコード変更前の現物で依存初期化と開始時再読を分けられるが、過去attemptの一過性原因を証明せず、開始時再読内の6工程も区別できない。原因境界の先行確認には使えるが、承認済み5要件の恒久装備を置き換えない。

## 5. 恒久監査6項目の事前判定

| 項目 | 事前判定 |
|---|---|
| 定義・import実在 | ローカル観測schema・閉語彙・全catch接続を同runnerに置ける |
| catch混同 | passed/rejectedは従来形のまま、fatalだけへローカル観測を付けられる |
| 子process値・漏洩 | 親が閉語彙へ即時変換し、生出力を保存しない構造にできる |
| targetFile接続 | 検証済みjob bindingまたは実読取証拠だけへ限定できる |
| 公開失敗owner | no-replace競合と既存公開違反を変更せず維持できる |
| 正常・rejected実経路 | APJ既存10件を維持し、依存初期化と開始時再読のcodeなしErrorを別local段階として実測できる |

実装そのものは成立する。停止理由は観測装備の方式ではなく、再実行jobの自己SHA束縛だけである。

## 6. 実施・未実施

### 事実

- DECISIONS、保存済みjob、runner、同testを読み取り照合した。
- 独立監査を並行し、2 path内のローカル観測方式が成立することを確認した。
- runner・test・job・正式成果物は変更していない。
- API通信0回、費用US$0、正式attempt 0回。

### 未実施

- fatal観測性の実装
- 検査・TAP
- job再束縛
- 正式proof jobの新attempt
- 横型3本、縦型字幕診断3本、QC、確認ページ
- stable tag、O1接続

人間目視前のtag禁止と、A完了後だけO1へ接続する予約を維持する。

## 7. 判断依頼

案A、すなわち「観測装備実装後に、旧jobを不変保持し、proof-runnerの実装SHA 1件だけを新実体へ再束縛した版付きjobで正式attemptを行う」ことの承認が必要である。
