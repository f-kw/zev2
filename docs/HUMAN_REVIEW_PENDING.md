# ZEV HUMAN_REVIEW_PENDING

更新日: 2026-09-20
状態: 生きた人間レビュー台帳
運用規則: `docs/policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md`

## 0. この台帳の意味

ここには、技術的には成立しているが、人間の見心地・自然さ・使いやすさ・正式採用判断が残っている事項だけを置く。

技術失敗・未実装・監査不合格とは区別する。

レビューは即時実施を要求しない。
適切な完成動画へまとめ、Batch単位で人間へ返す。

---

## 1. 現在のHuman Review Batch

### HRB-001 — 自動演出入りDigestを一本で見る

目的:
字幕演出・接続演出・自動配置を、個別A/Bではなく一つの完成Digestとしてまとめて確認する。

第一対象:
- 工程III 自動オーケストレーション候補
- SHA-256: `49ea952aea47e38095c9a8e336a1722fd3278230dda4203e10ab76f0129ba225`
- 1920x1080 / 30fps / 4,867frame / 162.233333秒
- 対象規則: 工程IIIの固定自動案、共通表示時計、字幕・接続統合

この一本で主に確認するreview_id:
- HR-001 Panel
- HR-002 Pulse
- HR-003 Bounce
- HR-004 Shake
- HR-005 Soft Separator
- HR-006 自動使い分け全体
- HR-009 現行Normal基準の見え方

見る観点:
- 普通の会話が普通に見えるか
- 山・反応・説明で変化が自然に入るか
- 演出が多すぎない / 少なすぎないか
- 同じ見せ方の連続による単調さが減っているか
- Panel / Pulse / Bounce / Shake / Soft に明確な違和感があるか
- 個々のpresetの好みではなく、一本として気持ちよく見られるか

人間へ要求しないこと:
- 全字幕の採点
- 演出ごとの細かい点数
- Normal / Blackの再比較
- 技術QCの再確認

---

### HRB-002 — 後修正版Digestを見る

目的:
人間overrideを入れた完成Digestが、実際の動画として自然に成立しているか確認する。

第一対象:
- 工程IV 修正後全編
- SHA-256: `1454ca54018edcfc16b7139336e60ae28e9f32bc617cb476d87b689cf5afcbb6`
- 1920x1080 / 30fps / 4,879frame / 162.633333秒
- 変更例: 字幕一件のPanel変更 + 接続一件のBlack Separator変更
- 技術QC: 合格済み
- 人間の見心地・音の自然さ: 未評価

含むreview_id:
- HR-007 後修正版の見心地・音・接続
- HR-010 override後の全体整合感

見る観点:
- 一件修正が周囲から浮いていないか
- 接続変更後のテンポ・音・黒挿入に違和感がないか
- 修正箇所以外の動画が壊れて見えないか
- 「直したらそのまま使える」という後修正の目的に近づいているか

---

### HRB-003 — 後修正UIを実際に触る

状態: 環境待ち

目的:
完成動画を見ながら「探す → 直す → 周辺確認 → Reset → 全編反映」が、人間にとって実際に使いやすいか確認する。

含むreview_id:
- HR-008 後修正UIの実操作
- HR-011 待ち時間の体感

前提:
Edge操作環境の `ERR_BLOCKED_BY_CLIENT` が正式な手順で解消し、実ブラウザー受入を再開できること。

技術成立済み:
- 動画位置 / 字幕文 / 一覧から対象探索
- 表現変更
- Color範囲
- Pulse
- Normal固定
- Reset
- 保存競合拒否
- 保存版 / 再生版 / 処理中版の区別
- 周辺確認
- 全編反映

人間が見ること:
- 対象を探しやすいか
- 変更操作が直感的か
- 状態表示が理解できるか
- 周辺確認待ちが実用上どう感じるか
- Resetや旧版表示で迷わないか

---

## 2. 個別Pending

### HR-001 — Panel Accent 正式採用

status: HUMAN_REVIEW_PENDING
技術状態: 技術成立済み
対象Batch: HRB-001

問い:
説明・要点の字幕にPanelを使ったとき、自然な変化として許容できるか。

反映先:
- Panelの正式採用状態
- 自動selectorでPanelを許可する意味役割

反映してはいけない範囲:
- Color / Scale / Pulse等の採用状態
- Panelを全字幕へ増やす判断

---

### HR-002 — Pulse Accent 正式採用

status: HUMAN_REVIEW_PENDING
技術状態: 技術成立済み
対象Batch: HRB-001

問い:
実測音声ピークに同期した短いPulseが、内容の勢いとして自然に見えるか。

反映先:
- Pulse正式採用
- Pulseを許可する反応・勢いの条件

禁止:
一例の違和感からPulse全体を廃止しない。対象文脈を記録する。

---

### HR-003 — Bounce Accent 正式採用

status: HUMAN_REVIEW_PENDING
技術状態: 工程Iで技術成立
対象Batch: HRB-001
参考技術候補SHA:
`36f3863fdd3c3c601459d5b5547e1a7c3df014dd8b026c3570c31d176a3e405b`

問い:
反応・短い発話の入口表現として自然か。強すぎないか。

---

### HR-004 — Shake Accent 正式採用

status: HUMAN_REVIEW_PENDING
技術状態: 工程Iで技術成立
対象Batch: HRB-001
参考技術候補SHA:
`36f3863fdd3c3c601459d5b5547e1a7c3df014dd8b026c3570c31d176a3e405b`

問い:
強い反応を表す揺れが、動画全体の中で自然か。

注意:
適用検査の初回待ち時間は別の性能課題。人間品質判断と混同しない。

---

### HR-005 — Soft Separator 正式採用

status: HUMAN_REVIEW_PENDING
技術状態: 工程IIで技術成立
対象Batch: HRB-001
参考技術候補SHA:
`38fe5cb7e5a4bd546a667926f71d98815af1dc848242d947d620f205ceb3d662`

問い:
通常Cut / Black Separatorとは別の接続表現として、Softが自然に使えるか。

既存の人間判断:
- Normal Cut: 使用可
- Black Separator: 使用可
- 両者を微差でも使い分けてよい

上記を再レビュー項目へ戻さない。

---

### HR-006 — 自動演出の使い分け全体

status: HUMAN_REVIEW_PENDING
技術状態: 工程III技術完成
対象Batch: HRB-001
対象SHA:
`49ea952aea47e38095c9a8e336a1722fd3278230dda4203e10ab76f0129ba225`

問い:
個々のpresetよりも、一本のDigestとして
- 変化が自然か
- 単調さが減ったか
- 演出過多になっていないか
- 山・反応・説明と見せ方が噛み合っているか

反映先:
- AIが返す意味役割 / allowed presets
- 必要なら自動選択条件

禁止:
レビュー結果をquota / every-N / 強制交互配置へ変換しない。

---

### HR-007 — 修正後Digestの見心地・音・接続

status: HUMAN_REVIEW_PENDING
技術状態: 工程IV媒体・QC成立
対象Batch: HRB-002
対象SHA:
`1454ca54018edcfc16b7139336e60ae28e9f32bc617cb476d87b689cf5afcbb6`

問い:
人間overrideを反映した全編が、そのまま使える動画として自然か。

---

### HR-008 — 後修正UIの実操作

status: BLOCKED_BY_ENVIRONMENT
技術状態: HTTP / Vue / 保存 / 描画経路は成立
対象Batch: HRB-003

blocking:
Microsoft Edge Browser Use で `ERR_BLOCKED_BY_CLIENT`。

再開条件:
- 正式に許可された操作手順
- 対象サービス・保存版の固定
- 保護設定を迂回しない正式な復旧根拠

---

### HR-009 — 現行Normal基準の人間確認

status: HUMAN_REVIEW_PENDING
技術状態: 現行Normal previewの技術package成立
対象Batch: HRB-001

問い:
現在の通常字幕を、人間が見る基準表示としてそのまま使ってよいか。

注意:
過去の旧Normal previewとの差だけを単独評価しない。
HRB-001の完成Digestの通常会話部分で確認することを優先する。

---

### HR-010 — override後の全体整合感

status: HUMAN_REVIEW_PENDING
技術状態: 工程IV全編生成成立
対象Batch: HRB-002

問い:
局所変更を入れても、前後の演出・接続・字幕との統一感が崩れないか。

反映先:
必要なら後修正UIの候補提示や局所確認の見せ方。
自動selector全体へ無条件に一般化しない。

---

### HR-011 — 待ち時間の人間体感

status: WAITING_FOR_UI_ACCEPTANCE
技術状態:
- 対象基本情報取得: 約62ms
- 選択Panel検査: 約2.5秒
- Shake適用検査: 約24秒
- 初回周辺確認: 字幕約114秒 / 接続約184秒
- 完成媒体再利用: 約0.45秒

対象Batch: HRB-003

問い:
実UI上で、どの待ち時間が実際に作業を阻害するか。

禁止:
機械時間だけから人間の許容秒数を勝手に決めない。

---

## 3. 既に人間判断済みでPendingへ戻さない事項

- Normal Cut と Black Separatorは双方使用可。
- 両者に微差しかなくても、役割が違うため両方使ってよい。
- ランダムなprocess乱数ではなく、再現可能な変化を用いて複数表現を使う方向。
- Color Accentは採用済み。
- Scale Accentは採用済み。

新しい具体的な成果物で別の問題が出た場合だけ、新しいreview_idとして登録する。

---

## 4. 運用ルール

Codex/Agentは技術作業の完了時に、この台帳を確認する。

新たな人間判断が必要になった場合:
1. review_idを追加する。
2. 成果物とversionへ束縛する。
3. 既存Batchへまとめられるか判断する。
4. 技術作業は独立範囲で続ける。
5. 人間レビューがまとまったらBatchとして提示する。

人間の回答を受けた場合:
1. 原意を保ったdecisionをreview_idへ記録する。
2. 適用範囲 / 非適用範囲を記録する。
3. 必要な実装修正だけへ反映する。
4. 必要なら再レビュー用の新しいartifactを束縛する。
5. 完了したreview_idをCLOSEDへ移す。

この台帳から項目を無言で削除しない。
