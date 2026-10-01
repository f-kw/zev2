# Codex2 手動初回キック指示 — 9. 現行版資格・版・不完全転送拒否

発行日：2026-10-02（JST）
発行者：ZEV Build Loop相談役
貼付者：kawafmm

## 0. この指示の使い方

これは **Codex2を最初に動かすためにkawafmmが手で貼る初回キック文**。
この初回貼付後、Codex2が作業中に `GPT_DECISION` / `HUMAN_DECISION` / `NEXT_REQUEST` を出す場合は、Codex2自身が専用EdgeからZEV Build Loopへ直接問い合わせる。

その問い合わせは、送信表示確認だけでは完了しない。
**相談役の返信生成完了を確認し、返信本文をCodex2自身が読了して受領するまで待つ。**
返信が同じ承認済みwork-order内の `continue` / `revise` なら、そのまま同じCodex2セッションで続行する。
「送信済み・返信生成中・未確認」でkawafmmへ戻らない。

## 1. 最新main

`495e537624fac6060dc13257781200c35c4955ae`

まずmainへ同期し、次を全文確認する。

- `docs/ZEV_START_HERE.md`
- `docs/HANDOVER_INDEX.md`
- `docs/CURRENT_GOAL.md`
- `AGENTS.md`
- `docs/CODEX_CHATGPT_AUDIT_PROTOCOL.md`
- `docs/COMMUNICATION.md`
- `docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261002_v005_NEGATIVE_HTTP201_FIX.md`
- 親 `docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261002_v005_CURRENT_NEGATIVE_QUALIFICATION.md`

## 2. 現在地

現行否定資格attempt-001は、通常draft作成の正しいHTTP 201を試験が200と期待した設営ミスで停止した。
製品欠陥ではない。

相談役は設営14として次の一箇所だけを承認済み。

`assert.equal(made.httpStatus,200);`
→
`assert.equal(made.httpStatus,201);`

旧attempt-001、v001失敗証拠、失敗時test SHAは不変保持。
新attempt-002へ進む。

## 3. 実行すること

新attempt-002で、次を現行版の直接実証として完了させる。

- wrong claim owner complete拒否
- expired claim recovery＋旧owner complete拒否
- approved purpose/source/settings/productionType/steps不一致拒否
- 旧state拒否
- Output/FileRef owner不一致拒否
- 旧／未知artifact schema拒否
- 旧preparation binding版拒否
- missing dataBinding／不完全転送validator拒否
- negative-only通常completeをHTTP400で拒否
- complete前後state不変
- FileRef／Output／result不増加
- 完成時別process readback
- 旧証拠／attempt-006／attempt-007／製品code保全
- 媒体copy／PUT／hash 0

元MP4、attempt-006／007の大容量成果物へは触れない。
製品code変更、外部推論、STT／inspection処理、動画製造、SSD、削除は行わない。

## 4. 問い合わせルール

新しい独立した不具合・製品修正・権限判断が必要なら、証拠を保存して相談役へ直接問い合わせる。

ただし、
**問い合わせを送って終わらない。**

1. 専用EdgeのZEV Build Loopへ送信
2. 自分の送信本文が表示されたことを確認
3. 相談役の返信生成が完了するまで同じ専用タブで確認
4. 返信本文を全文読む
5. `continue` / `revise` の具体指示を受領
6. 同じCodex2セッションで作業続行

実際のUI／通信障害で返信取得不能の場合だけ、その事実を証拠化して未受領停止とする。
「返信生成中」は未受領停止理由にしない。

## 5. 終点

全否定資格が現行版で直接成立したら、親v005 §8を一件ずつ再対照する。

全条件に現行版根拠が揃った場合だけ、
**「v005隔離実装試験 技術完了候補」**
として相談役へ最終監査提出する。

ID9-PD-01/02、本番有効化、実AI品質、字幕演出、動画許可、人間品質は別のまま。

報告：
`Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 現行版資格・版・不完全転送拒否`

新しい実質問題がなければ、
検証→保存→commit/push→Git clean→相談役へ直接報告まで進む。
