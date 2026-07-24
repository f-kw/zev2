# candidate 13 基本テロップ B2 二欠陥修正後 全件検査停止報告 v001

- 作成日: 2026-07-24
- 状態: **正式package検査で不合格。停止契約に従い後続工程は未実行**
- 起点:
  `presentation-candidate13-caption-gate-b2-post-hashbang-two-defect-repair-design-20260724-v001.md`
- 実行前の基準commit:
  `21e1086a7ad947e9b2fc7f03b57da9c85f3a2761`
- 今回の人間作業:
  0件。媒体視聴、時刻入力、正解生成、時間計測は行っていない

## 1. 結論

承認された3ファイル限定修正を実装し、固定Nodeで構文確認後、
package側132件を先頭から一度だけ実行した。

結果は**125合格・7不合格**だった。
132/132ではないため、同じattempt内での修正・再実行を行わず停止した。

今回の二つの修正は、次の範囲では効果を確認できた。

1. package側の裸CRを含むhashbang表は合格した。
2. Gate Aの正常なpassedレポートは、平坦な8項目と真偽値返却の経路で有効と判定された。
3. 旧14不合格のうち7件が合格へ変わり、新たに不合格へ転じたtop-level testは0件だった。

一方、Gate A三状態のうちinvalidとvalid-failedは、同じtest内の既存前段が先に
不合格になったため未到達である。意味回答側の裸CR検査も停止条件により未実行である。
したがって、**承認修正3点をすべて検証済みとは扱わない**。

## 2. 実装した範囲

変更した既存コード・既存検査は承認済みの3ファイルだけである。

| ファイル | 処理の意味 | SHA-256 |
|---|---|---|
| `presentation_caption_semantic_source_package_v001.mjs` | Gate Aレポート検証を、承認済みの平坦な8項目と真偽値返却で呼ぶ | `bccc651485156a02971c8f34fe00d8bea331af313b66ee90f0693bb83e1e48f4` |
| `test_presentation_caption_semantic_source_package_v001.mjs` | 真の裸CR byte、全hashbangケース一括観測、Gate A三状態の検査を追加 | `059b89c670b41fe14a6fa4d44561f951ba6ee43c43de4f4272f66080b78cf158` |
| `test_presentation_caption_semantic_output_v001.mjs` | 意味回答側にも同じ裸CR byte固定と全ケース一括観測を追加 | `75824679e34f737937985eb04dc8e0b01754844c2d81e3a360ab93b2a7f6cbcc` |

裸CRの検査では、CR直後へ無害なコメント行を置き、その後ろへ完全な正常実装本文を置いた。
これにより、scannerがCRを誤って受理した場合でも、別のimport欠落を理由に
拒否扱いとなる偽陽性を防いだ。LF・CRLFも同じ正常本文を使う受理対照にした。

### 2.1 変更禁止対象の不変確認

| 対象 | SHA-256 | 判定 |
|---|---|---|
| package実行処理 | `1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff` | 承認値と一致 |
| Gate A実行・検証処理 | `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352` | 承認値と一致 |
| Gate A証拠生成処理 | `dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a` | 不変 |
| 意味回答の検査本体 | `1e37b697f4c7b288f667f6c2e44ab8517921c34be4cc3f8a02db5de6cdc939de` | 不変 |
| 意味回答の実行処理 | `28a33998ff73b0ea63a395f57717bdb0726ca0f5d9ac3eca6ef6a73d5b6a83f1` | 不変 |

## 3. 実行前の静的確認

- `git diff --check`: 合格
- 固定Node v20.19.6で変更3ファイルの構文確認: 3/3合格
- raw文字列としての`test(`出現数: package 75、意味回答58で不変
- 構文上のtop-level/dynamic登録呼出箇所: package 71、意味回答53
- packageの実登録数は、結果を見て期待値を変えず、旧TAPと契約の132件を使用

設計書で「静的`test()`記述75/58件」と呼んでいた値は、検査用文字列内の`.test(`も含む。
実登録箇所の意味では71/53である。今回の検査数を変える差分ではないが、
以後はraw出現数と登録箇所数を区別して報告する。

## 4. 正式package検査

### 4.1 実行

- Node:
  `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- 対象:
  `test_presentation_caption_semantic_source_package_v001.mjs`
- 実行回数:
  1回
- TAP:
  `evals/clip_composition/reports/presentation/test-runs/20260724-caption-b2-post-hashbang-two-defect-v001/package.tap`
- TAP SHA-256:
  `39cca61b2ffdea9ecc6f7b2ff63f27cc8b2b7078f9dc79d13b98402a1c838002`
- 実測:
  132件、125合格、7不合格、cancel 0、skip 0、todo 0
- 実行時間:
  155044.083667ms

旧TAPは変更していない。

- 旧TAP:
  `evals/clip_composition/reports/presentation/test-runs/20260724-caption-b2-hashbang-limited-v001/package.tap`
- 旧TAP SHA-256:
  `9f431bd525e6ce7e74bee012a76597bb74cbb9187f6255792b22e6b7951dcafe`
- 旧実測:
  132件、118合格、14不合格

### 4.2 旧14件との対応

| test ID | 新結果 | 読み方 |
|---:|---|---|
| 44 | 合格 | 正常な監視投影hashまで到達 |
| 68 | 合格 | 正常なpackage検査報告まで到達 |
| 115 | 合格 | 裸CRを含む全hashbang表と実runner baselineを観測 |
| 116 | 不合格 | 既存のbuild失敗subcaseで、test側の担当表解釈が不一致 |
| 117 | 不合格 | 116と同じ担当表解釈 |
| 118 | 不合格 | 旧停止点より後ろへ進み、hash leafの期待分類で停止 |
| 119 | 不合格 | job差分の担当表解釈が不一致 |
| 121 | 合格 | 公開runnerが既存derive入口を使うことを確認 |
| 122 | 合格 | build失敗時の後段不実行を確認 |
| 123 | 不合格 | 旧Gate A停止を越え、正常stagingの順序判定で停止 |
| 124 | 不合格 | 最初のstaging-open失敗の帰属で停止 |
| 125 | 合格 | publication失敗後の終了2経路を確認 |
| 130 | 合格 | production CLIの終了0/1経路を確認 |
| 132 | 不合格 | 116・117・119等の途中停止で動的観測集合が欠けた派生 |

解消したIDは`44, 68, 115, 121, 122, 125, 130`。
残ったIDは`116, 117, 118, 119, 123, 124, 132`。
今回、新規に不合格へ転じたtop-level testはない。

旧TAPの再監査により、修正設計§5で旧13件を一括して
「Gate A先行停止」とした説明は正確でなかったことも確認した。

- 116、117、119、124、132は旧TAPでも今回と同型の停止だった。
- 118と123は今回、旧停止点より後ろまで進んだ。

この訂正は、今回の7不合格を新しい回帰と誤認しないために残す。

## 5. 不合格7件の読み取り診断

検査後はコードを直さず、TAP、承認済み契約、既存実装を読み取って帰属を分離した。

### 5.1 検査側: 担当候補表を全担当への重複付与義務と誤解

対象: test 116、117、119。test 132はこの途中停止による派生。

検査補助処理は、一つの違反コードに複数の担当候補がある表を見て、
rootにそのコードが一件あれば、候補になっている全checkへ同じコードが載ると期待している。

しかし承認済み契約と検査本体は次のように一意に帰属する。

- `BUILD_FAILED`は、実際に失敗したbuild段だけへ付く。
- `JOB_FILE_MISMATCH`は、変化したjob読取時点だけへ付く。
- 上流で止まった後段checkは未実行で、違反コード列は空になる。

したがって、検査本体を複数checkへの重複付与へ変える根拠はない。
次の修正設計では、担当表を「付与してよい候補集合」として検査し、
個々の正確な担当は既存の対象check指定と動的観測集合で確認する必要がある。
同じ複数担当型の`NONDETERMINISTIC`も水平確認対象になる。

### 5.2 検査側: hash leafをbinding違反と期待

対象: test 118。

検査データは、manifestに記録された`fileSha256`を変更している。
承認済み契約では、記録hashの不一致は`PACKAGE_HASH_MISMATCH`であり、
path・role・artifact ID・相互参照等の不一致が`PACKAGE_BINDING_MISMATCH`である。

検査本体の分類は契約どおりで、test側の期待がbindingになっている。
本物のbinding違反を確認する別ケースは既に存在するため、
次の設計ではこのhash leafケースの期待分類を契約へ合わせる必要がある。

### 5.3 実装側: stagingの二つの順序を混同

対象: test 123。

承認済み契約とrunnerは、公開前観測を次の二軸で持つ。

- directory entry: ファイル名のUTF-16順
- artifact read: 正式7ファイルの固定製造順

検査本体はdirectory entryまで固定製造順で比較している。
そのため正常なstagingを不正と判定し、input再読取の違反判定へ進めない。

次の修正設計では、二つの順序を別々に検査する必要がある。

### 5.4 実装側: 個別artifactのI/O失敗をstaging全体不正へ潰す

対象: test 124。

runnerは個別artifactのopen/read/fstat/close失敗を、
各artifactの`io-error`とfailure pointとして観測に残している。
契約上は、これは`PUBLICATION_FAILED`へ一対一で帰属する。

検査本体はstaging全体の上位statusが`io-error`のときだけ
`PUBLICATION_FAILED`にし、`observed`配下の個別artifact I/O失敗を
一般のstaging不正へ潰している。published側にも同型の処理がある。

test 124は最初の`staging-open`で停止したため、
同test内のstaging-read、published系等の後続8行は今回未観測である。

## 6. 承認修正の検証状態

| 修正対象 | 状態 | 根拠 |
|---|---|---|
| package側の真の裸CRと全表収集 | 確認済み | test 115合格 |
| Gate Aの正常passed | 確認済み | test 44・68合格、test 116冒頭のpassed確認通過 |
| Gate Aのinvalid report | 未確認 | test 116の既存前段で停止し、追加subcaseへ未到達 |
| Gate Aのvalid-failed report | 未確認 | 同上 |
| 意味回答側の裸CRと全表収集 | 未実行 | package 132/132不成立による停止 |

## 7. 実行していない工程

packageが132/132でなかったため、次はすべて**0回**である。

- 意味回答側の全件検査
- Gate A 21/21回帰
- 残存source atom 50/50回帰
- candidate 13読み取り専用preflight jobの作成
- candidate 13読み取り専用preflightの実行
- 正式package生成
- prompt登録
- Gemini実走
- 指示書生成
- 描画

preflight jobは存在しないままで、正式成果物・fixture・expectedも変更していない。

## 8. 次に必要な判断

次は、今回の4診断を一つの版付き修正設計へ落とす段階である。
この報告の時点では設計起草・修正実装・再検査へ進んでいない。

設計へ含める必要がある範囲:

1. 複数担当コードのtest oracleを、許可集合と実担当の区別が付く形へ直す。
2. hash leaf変更ケースの期待を、承認済みhash分類へ合わせる。
3. directory entryのUTF-16順とartifact readの固定製造順を別々に検査する。
4. staging・publishedの個別artifact I/O失敗を、個別failure point付き
   `PUBLICATION_FAILED`へ帰属する。
5. 今回未到達だったGate A二状態、test 124の後続行、意味回答側を含め、
   新しい承認の下でpackage 132件を再び先頭から一度だけ実行する。

人間へ次に求める作業は、**この修正設計の起草を許可する1判断**である。
媒体視聴・時刻入力・正解生成は不要である。
