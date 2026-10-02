# Codex Session Work Log Policy v001

作成日：2026-10-03（JST）
状態：正本運用ポリシー
適用範囲：ZEVで並行稼働するCodex各セッションの作業ログ

## 1. 目的

複数のCodexセッションが同時に走る前提で、指示・判断・作業・検証・cleanup・Git・次状態を後から追えるようにする。

ただし中央の1ファイルへ逐次追記すると、並行session同士の競合とログ肥大化を招く。そのため、**作業中の逐次共有ログは作らず、各sessionが終了・停止・引継ぎ直前に自分の1サイクルをまとめて確定ログとして保存する**。

作業中の詳細証拠は既存のwork-order、report、evidence、runtime artifact、checkpoint commitを使う。session work logはそれらの索引兼サマリであり、stdout全文や全command履歴の複製ではない。

## 2. ログを書き出すタイミング

各Codex sessionは次のいずれかの直前に、当該サイクルのwork logを一度まとめる。

- 第一完成として相談役へ完了報告する直前。
- GPT_DECISION / HUMAN_DECISIONで停止する直前。
- 別sessionへ引き継ぐ直前。
- sessionを終了・再起動する直前。
- 長時間作業で明示的なhandoff checkpointを作るとき。

通常の小さな進捗ごとにGit上のwork logへ追記しない。

実行途中のクラッシュ対策が必要な場合は、既存runtime evidence/checkpointを使う。共有Git work logをリアルタイムjournalとして使わない。

## 3. 保存単位とローテーション

保存先：

`docs/work-logs/YYYY-MM/`

1サイクルにつき1ファイルを原則とする。

命名：

`YYYY-MM-DDTHHMM_<session>_<epic-or-work-order>_<final-head8>.md`

例：

`docs/work-logs/2026-10/2026-10-03T0825_Codex2_ID9-caption-reflow_263dca50.md`

ルール：

- session名を必ず含める。Codex / Codex2 / Codex3等を混同しない。
- 同時終了でも衝突しないよう、時刻・session・対象・HEADを含める。
- 月が変わったら新しい `YYYY-MM` directoryへ移る。これを通常のrotationとする。
- 1サイクルのsummaryが64 KiBを超える場合は `..._part-001.md`, `part-002.md` のように分割する。
- 過去月のGit work logは自動削除しない。cleanup対象の巨大runtimeとは別物として扱う。
- 複数sessionが共有する中央追記型 `current.log` や日次1ファイルは作らない。
- 月次INDEXの逐次更新も必須にしない。検索とpathで辿れるため、競合する共有indexを増やさない。

## 4. 記録する内容

work logは次の順を基本とする。

### header

- session
- epic / work-order
- startedAt / closedAt
- baseHead / finalHead
- status: complete / stopped-gpt / stopped-human / handoff / aborted

### received instruction

- 受領した指示の要点
- 指示元の正本path / decision
- 許可範囲と禁止事項
- 人間判断または相談役判断があればその要点

### decisions

- HUMAN_DECISIONで確定したこと
- GPT_DECISIONで確定したこと
- Codexが既存scope内で行った実装上の判断
- 採らなかった案が重要なら、その理由を一行で記録

判断の根拠はwork-order/report/commitへリンクし、長い会話本文を複製しない。

### work performed

- 実装・調査・生成・修正した主要項目
- 主要な変更path
- 生成した成果物・runtime root

### validation

- test / typecheck / QC / readback / inspection等の結果
- 重要な失敗と復旧
- 未確認事項

### cleanup

- DELETE_WHEN_DONEで削除した主な種類・bytes
- KEEPした大容量物と理由
- ASK_BEFORE_DELETEが残る場合の対象
- own process残存、temp/untracked

### git

- commit SHA / push
- branch / HEAD
- git status / untracked

### next state

- 次に進める作業
- GPT_DECISION / HUMAN_DECISION待ち
- 次sessionへ渡す必須事項
- 再実行してはいけない完了済み作業

## 5. 記録しないもの

- chain-of-thought、内部推論の逐語記録。
- 全stdout/stderrの複製。必要なものはevidence/log fileへ参照を張る。
- 全tool call、全shell commandの羅列。
- password、API key、credential本文、cookie等の秘密情報。
- 元動画・巨大JSONの本文。
- 既に正本にある長文の丸ごとコピー。

work logは「何が起き、何を決め、何が残ったか」を短く復元できる密度にする。

## 6. 並行sessionの競合回避

- 各sessionは自分専用のwork log fileだけを新規作成し、他sessionのlogを編集しない。
- 他sessionのlogをまとめ直す作業を通常の終了処理へ混ぜない。
- 同じwork-orderを複数sessionが扱った場合も、sessionごとに別fileへ残す。
- 正本CURRENT_GOAL/HANDOVER等の共有file更新は既存Git直列化ルールに従う。work logを共有正本の代替にはしない。
- session終了時にmainが進んでいた場合は最新HEADを取り込み、他者変更を保持して自分のlog・担当差分だけをcommitする。

## 7. cleanupとの順序

標準の終了順序：

1. 作業・検証
2. 証拠固定
3. cleanup
4. own process終了確認
5. **session work logをまとめる**
6. CURRENT_GOAL / HANDOVER / report等の正本更新
7. 自分の担当pathだけcommit/push
8. 相談役へ報告
9. NEXT_REQUESTなら相談役返信全文を受領

work logにはcleanup後の最終状態を記録する。

停止時にcleanupが危険な場合は、証拠を優先して保持し、work logへ「cleanup pending」と理由を残す。

## 8. 正本との関係

work logは履歴・索引であり、CURRENT_GOAL、HANDOVER_INDEX、work-order、HUMAN_REVIEW_PENDING、各reportを置き換えない。

現在地や許可は必ず正本から判断する。古いwork logだけを見て作業を再開しない。
