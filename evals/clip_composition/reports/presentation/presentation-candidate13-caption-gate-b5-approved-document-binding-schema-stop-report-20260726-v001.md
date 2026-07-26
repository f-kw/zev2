# candidate 13 B5 承認文書binding schema 事前停止報告 v001

- 日付: 2026-07-26
- 状態: **B5設計起草前に契約矛盾を検出して停止**
- 対象: B5 prompt・API payload・token／費用固定 実装契約設計v001
- B5設計本文: 未作成
- B5実装、正式prompt・payload、token計測、API通信、Gemini実走: 0件
- 人間作業: 次の判断1件。動画視聴、時刻入力、時間計測なし

## 1. 結論

今回の承認条件には、次の二文書を承認済み文書照合台帳へ**同一commitで登録する**ことが含まれる。

1. B5設計着手承認依頼書。
2. 今回の人間承認文を保存した新規の承認記録。

承認依頼書は既存commitに実体があるため、現行台帳へ固定できる。一方、新規の承認記録はまだGit commitに存在しない。現行schemaは各文書について承認時commitを必須とするため、新規記録とbindingを同じcommitへ入れるには、作成前には分からないそのcommit自身のhashを同じcommitの検査器へ書く必要がある。commit hashはtree、親、author／committer情報、message等を含むcommit objectから決まり、検査器へhashを書けばtree自体が変わるため、自己参照になり成立しない。

仮hash、`HEAD`、`latest`、承認記録だけの先行commit、bindingだけの後続commitは採用しない。いずれも、今回の同一commit条件または既定の差し替え防止手順を破る。

`DECISIONS.md`の2026-07-26記録は、現行schemaで同一commit更新を表現できない場合、文書を改訂せず、binding schemaの版付き改訂を先に人間へ戻すと定めている。この条件に該当したため、B5設計本文を仮置きせず停止した。

## 2. 読み取り監査で確定した事実

### 2.1 現行台帳

- 検査器:
  `evals/clip_composition/check_approved_document_bindings_v001.mjs`
- schema:
  `approved-document-binding-v001`
- 現在の対象:
  B4系6文書
- 現在の照合:
  `implementation-start`で6/6合格

各bindingは、文書path、承認時commit、Git mode、Git blob、byte数、SHA-256を必須にする。検査器は承認時commitのtreeから文書を読み、登録値と現在の作業ツリーを照合する。

### 2.2 B5承認依頼書

| 項目 | 固定値 |
|---|---|
| path | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b5-prompt-cost-freeze-design-approval-request-20260726-v001.md` |
| 承認対象byteを持つcommit | `90ae604d6b0d07a30368614787acabfb31acce89` |
| Git mode | `100644` |
| Git blob | `4dbea4279b918b9f15995c07a124155d47e18132` |
| byte数 | 11,145 |
| SHA-256 | `cdb5b0f8d8b743ad2fcf9851c34d5edb1c0db6a78a75ce95fac462a2a9948356` |

この一件は現行schemaでも登録可能である。しかし、人間承認文の一件と同時登録する条件があるため、片方だけを先に登録していない。

### 2.3 人間承認文

今回の人間承認文は会話上には存在するが、リポジトリ内の版付き文書、Git blob、承認時commitはまだ存在しない。内容を保存した新規文書のblob、byte数、SHA-256はcommit前に計算できるが、同じcommit自身のhashは計算前に本文へ固定できない。

## 3. 既存手順との衝突

| 案 | 結果 |
|---|---|
| 新commitのhashを予想して現行欄へ入れる | treeが変わるためhashも変わり、自己参照で成立しない |
| `HEAD`や空値を入れる | 承認時byteを一意に束縛できず、現行schema違反 |
| 承認記録を先にcommitし、次commitで二bindingを登録する | 文書とbindingの同一commit化を破り、未束縛の差し替え窓を作る |
| 承認依頼書だけを先に登録する | 今回の二件同時登録条件を破る |
| 現行検査器が新規承認記録だけを例外扱いする | schema外の後方互換分岐・特例になる |

したがって、B5設計の内容ではなく、承認済み文書を保存する土台の契約改訂が先に必要である。

## 4. 推奨する版付き追補の方向

`approved-document-admission-ledger-v002`を新設し、**文書内容の固定**と**承認・登録の来歴**を分離する。一つの登録単位に、承認依頼書と承認記録を対で持たせ、片方だけの登録を許さない。

### 4.1 文書内容の固定

対に含まれる各文書について次を固定する。

- path
- Git mode
- Git blob
- byte数
- SHA-256

これらは文書内容だけからcommit前に計算でき、同一commit内の新規文書も自己参照なしで束縛できる。

### 4.2 承認来歴

承認来歴は、v002固有の判別可能な二種類として明示的に区別する。v001 objectをv002 parserへ渡しても受理しない。

1. commit固定型:
   既存B4の6文書とB5承認依頼書について、内容の由来となる既存commitを参照する。B5承認依頼書は`90ae604d6b0d07a30368614787acabfb31acce89`を使う。
2. 同時登録型:
   今回の直接承認記録について、同じ登録commitで承認依頼書との対として新規追加することを宣言し、人間原文を保存した版付きpathと、そのblob・byte数・SHA-256を参照する。

対の関係には、承認元がkawafmmの直接メッセージであること、受領日、承認対象となる依頼書のSHA-256、承認記録pathを固定する。新規承認記録自身も内容hashで台帳へ固定する。登録commitのhashは文書や台帳へ自己記入せず、Git履歴から後で一意に再導出する。

### 4.3 同一commit成立の検査

登録commitには、少なくとも次を同時に含める。

1. 人間承認記録。
2. 既存6文書をcommit固定型へbyte同一移行したv002台帳。
3. B5承認依頼書と承認記録を束ねる一つの同時登録object。
4. v002 schemaと検査器。
5. v001からv002への6件の移行照合記録。

commit前検査は、v001既存6件が6/6合格し、6件のcommit・mode・blob・byte数・SHA-256がv002 commit固定型へ一対一・byte単位で写されていることを確認する。加えて、親commitに新しい登録IDも承認記録も存在せず、indexに対・承認記録・既存依頼書の正確なbyteが揃うことを確認する。commit後検査は、`HEAD`が単一親を持ち、親には対がなく、`HEAD`で対と承認記録が同時に導入され、依頼書が`90ae604d`のbyteと同一であることを確認する。

v002の追補と実装に至る間には、この停止報告、追補の設計書、それぞれに対する後続の人間承認記録も承認済み契約入力になり得る。したがって「旧6件＋今回の二件=8件」を最終固定数にしない。追補設計時にbootstrap対象を全件列挙し、件数、path、関係を閉じた一件表を作り、その全件がv002で合格することを移行完了条件にする。

後日の実装開始・正式検査・安定点検査では、同時登録IDが最初に現れたcommitを履歴から一意に再導出し、同じ条件と現在の作業ツリーを再照合する。履歴探索は追補でfirst-parent等の経路を一意に固定し、同じ登録IDが複数commitに初出候補を持つ場合は選ばず停止する。

### 4.4 後方互換を作らない

既存v001検査器と登録値は履歴資産として内容変更せず保持する。ただし移行commit後の正式入口には使わない。v002検査器はv001 shapeを拒否し、shim、fallback、自動変換を置かない。移行前に一度だけv001 6/6とv001→v002六件の完全一致を検査し、移行後の正式入口をv002一つへ切り替える。

## 5. 推奨案を採る理由

- 今回の同一commit条件を文字どおり満たせる。
- 文書内容の改ざん検知に必要なblob・byte数・SHA-256を維持できる。
- 過去承認と、会話から新規保存する直接承認を来歴上で混同しない。
- 二段commitによる未束縛期間を作らない。
- 特定のB5文書だけを例外扱いせず、今後も同じ型で使える。
- 既存6件の承認来歴と内容をbyte同一で移しつつ、正式検査入口をv002一つに保てる。
- v002はv001を暗黙受理しないため、後方互換分岐を増やさない。

## 6. B5内容側で確認済みの非阻害事項

停止原因はモデル・単価・token計測方式ではない。読み取り確認では、次の公式情報が2026-07-26時点で確認できた。

| 項目 | 公式確認 |
|---|---|
| モデル | `gemini-3.6-flash`が公式モデルページに存在。更新日2026-07-21 |
| token上限 | 入力1,048,576、出力65,536 |
| 標準単価 | 入力US$1.50、出力US$7.50／100万token |
| 事前token計測 | `models.countTokens`が入力へmodel tokenizerを適用し`totalTokens`を返す |

参照:

- `https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash`
- `https://ai.google.dev/gemini-api/docs/pricing`
- `https://ai.google.dev/api/tokens`
- `https://ai.google.dev/gemini-api/docs/tokens`

これらは設計時の参照確認であり、正式モデルID、単価、適用日、入力token、payload byteを正本化したものではない。B5実装時の再照合・実測という承認条件を維持する。

## 7. B5再開後に閉じる残件

binding schemaの解消後、B5設計では少なくとも次を一意に固定する必要がある。

1. B3正式7ファイルを検品し、唯一のモデル可視入力を返す版付き入口。
2. B3内の仕事本文を唯一の正本とし、promptへ複製しない参照方法。
3. APIの生応答を無改変保存し、B1用の一つのJSON byte列を取り出すfield path。fence除去、trim、JSON探索は行わない。
4. 205候補を全て一行・一まとまりとして選ぶ最大有効構造から、最大出力tokenを実測で導く方法。
5. JSON空白を無制限に許すB1 raw契約と、有限のAPI出力上限をつなぐ正式応答表現。
6. 設計固定と実装固定の二層一件表、および完全性チェックの値・参照・件数・byte閉包。
7. 実行構成へ、モデルIDだけでなく料金tierとendpoint種別を必須値として持たせる。2026-07-26に公式価格表で確認した`gemini-3.6-flash`の単価は、Standardが入力US$1.50・出力US$7.50、BatchとFlexが入力US$0.75・出力US$3.75、Priorityが入力US$2.70・出力US$13.50（いずれも100万token単位）である。初回B6はStandard固定を推奨し、B5実装時に公式値・適用日・endpointとの対応を再照合する。名称または単価が異なる場合は、別tierへ黙って置換せず停止する。

これらを今回の停止理由へ混ぜず、binding追補承認後のB5設計正本で扱う。

## 8. 今回行っていないこと

- B5設計v001の起草・提示。
- B5 prompt、payload、job、schema、検査器の実装。
- token計測、価格の正式固定、費用計算。
- API keyへのアクセス、API通信、Gemini実走。
- 正式表示計画、指示書、描画。
- 現行bindingの一部登録、仮値更新、schema例外追加。
- `DECISIONS.md`、`docs/HANDOVER.md`のB5設計完了への前進。

## 9. 人間判断1件

推奨承認文:

> B5設計着手前に、現行approved-document-binding-v001では新規の人間承認記録とそのbindingを同一commitへ置けず、approvalCommitが自己参照になる契約矛盾を検出して停止した判断を確認する。推奨どおり、承認依頼書と承認記録をblob・byte数・SHA-256で一つの対に束ね、直接承認記録を同一commitで登録できるapproved-document-admission-ledger-v002の実装契約追補を起草してよい。既存6件はv002のcommit固定型へbyte同一移行し、移行後の正式入口はv002だけとする。v002がv001を受理するshim・fallback・自動変換は作らない。追補提示で停止し、台帳実装、B5設計、B5実装、API通信、Gemini実走は別承認とする。
