# candidate 13 caption gate B2 実装前停止報告 v001

- 日付: 2026-07-24
- 基準commit: `1243ceb5a303c79d4615d7825530ca7c4e0fce43`
- 対象設計:
  `presentation-candidate13-caption-gate-b2-full-test-repair-design-20260724-v001.md`
- 結論: **実装前に停止**

## 1. 到達地点

承認範囲へ着手する前に、B2修正設計、既存B1契約、現行のpackage側・意味回答側の実装を静的に照合した。

その結果、実装者判断では解消できない契約矛盾を2件確認した。夜間規律の停止条件
「設計にない契約解釈が必要」「契約同士の矛盾を発見」に該当するため、コード変更・
合成検査・既存回帰・candidate 13 preflightへは進んでいない。

今回の目的は検査を合格させることではなく、次の2点を同時に守った修正を行うことである。

1. 検査器自身の字面を実行コードと誤認する偽陽性だけを取り除く。
2. 3.38GBの実データを監視対象から外さず、同一性検査を維持する。

未確定部分を独自補完すると、この目的より「検査を通すこと」を優先した実装になるため停止した。

## 2. 停止理由1: R1の固定字句集合が現行sourceを表現できない

### 2.1 契約上の衝突

承認済みR1設計の74〜93行は、regular expressionを区別する限定字句器について、
演算子・keywordの固定集合を列挙し、未対応tokenは字句不成立として
`IMPLEMENTATION_MISMATCH`へ送ると定めている。同時に、現在の実装sourceをすべて
受理することも完了条件にしている。

しかし固定集合には、現行sourceが使う次のtokenがない。

- 通常のproperty参照 `.`
- optional chain `?.`
- spread / rest `...`

### 2.2 現行sourceの実例

- package runner 164〜175行:
  `left?.[field]`、`observation?.status`
- package runner 317行:
  `resolve(workspaceRoot, ...repositoryPath.split('/'))`
- package runner 1187行:
  `{...entryByRole.get(role)}`
- 意味回答runner 74〜82行:
  `result?.status`、`result.bytes`
- 意味回答runner 193行:
  `resolve(root, ...parts)`

通常の`.`は、上記以外にも正式検査対象source全体で多数使われている。

### 2.3 帰結

固定集合をそのまま実装すると、正しい現行sourceが字句不成立になる。一方、
`.`、`?.`、`...`を実装者判断で許可すると、「固定集合以外を推測で拡張しない」
という同じ設計の129行に違反する。

したがって、少なくとも3tokenの許可条件と、slash判定へ渡す状態遷移を固定する
最小の契約追補が必要である。

## 3. 停止理由2: R3の読取失敗帰属がformal publication契約と衝突する

### 3.1 既存B1契約

承認済みB1契約は、正式成果物のstaging / published artifact読取について、
`artifact-NN-open` / `artifact-NN-read`等の生観測を保存する。読取やcloseの
純I/O失敗を、code 55 `PUBLICATION_FAILED`のtrusted failed reportへ帰属できる
と定めている。

主な根拠は、B1契約の652〜685行、2054行、2247行である。現行package runnerも
この契約に従い、formal publication中のartifact read失敗を記録して
`PUBLICATION_FAILED`へ送る。

### 3.2 R3契約

承認済みB2修正設計の197行は、chunk型不正、短読、過読、読取例外、状態差、
close失敗で完全な観測を作れない場合、trustedな違反へ変換せず既存の
untrusted終了コード2へ送ると定めている。

この文言にはformal publication artifactの読取を除外する範囲指定がない。

### 3.3 帰結

同じformal publicationの読取・close失敗を、

- 既存B1契約どおり`PUBLICATION_FAILED`として保存するか
- R3契約どおりuntrusted終了コード2へ送るか

が一意に決まらない。

推奨は、R3のuntrusted規則を通常入力・監視treeの読取に限定し、formal publication
artifactでは既存の`PUBLICATION_FAILED`帰属を維持する案である。これならR3の目的である
大容量監視読取を直しつつ、既存の公開契約・違反code・report schemaを変更しない。
chunk単位の読取方式自体はformal publication artifactにも適用し、失敗時の帰属だけを
既存B1契約どおりにする。
ただし、この範囲確定自体が契約改訂なので、承認なしには実装しない。

## 4. 実施しなかったこと

- R1・R2・R3のコード変更: **0件**
- 固定回帰の追加: **0件**
- B2全検査: **未実行**
- TAP全文: **未生成**
- 既存回帰: **未実行**
- candidate 13読み取り専用preflight: **未実行**
- 既存20不合格の帰属表: **未確定**
- 正式package生成・Gemini実走: **未着手**

対象となるpackage core、意味回答core、両runnerには基準commitからの差分がないことを
確認した。作業treeに元から存在する他作業の変更には触れていない。

## 5. 再開に必要な人間判断

人間作業は1セッション・2判断、媒体確認なし。見積りは合計2分未満、時間計測はしない。

1. R1について、`.`、`?.`、`...`の許可条件と状態遷移を固定する最小追補の起草を
   承認するか。
2. R3について、untrusted終了規則を通常入力・監視treeへ限定し、
   formal publicationでは既存の`PUBLICATION_FAILED`帰属を維持する方向で
   追補を起草するか。

両方の追補が承認された後、今回承認済みだった順序
「実装 → B2全検査を頭から実行 → 既存回帰 → candidate 13 preflight →
20件帰属表 → 次ゲート承認依頼起草」へ戻る。
